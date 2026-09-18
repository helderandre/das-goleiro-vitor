import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Recebe as notificações de entrega do Resend e atualiza o histórico dos
 * e-mails do pedido (email_events e email_outbox.delivery_status).
 *
 * O Resend assina via Svix: HMAC-SHA256 de `svix-id.svix-timestamp.corpo`,
 * com a chave em base64 depois do prefixo `whsec_`.
 * Change: openspec/changes/emails-transacionais-pedido
 */

const TOLERANCE_SECONDS = 5 * 60;

/** Tipos do Resend que viram situação de entrega; os demais são ignorados. */
const EVENT_TYPES: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(secret: string, id: string, timestamp: string, body: string, header: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret.startsWith("whsec_") ? secret.slice(6) : secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  const expected = bytesToBase64(mac);
  // O cabeçalho pode trazer várias assinaturas ("v1,abc v1,def") durante a
  // rotação do segredo; basta uma bater.
  return header.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    return version === "v1" && !!sig && safeEqual(sig, expected);
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "RESEND_WEBHOOK_SECRET não configurado" }, 500);

  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";
  if (!svixId || !svixTimestamp || !svixSignature) return json({ error: "Assinatura ausente" }, 401);

  // Corpo bruto, lido antes de qualquer parse: a assinatura cobre exatamente estes bytes.
  const raw = await req.text();

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_SECONDS) {
    return json({ error: "Carimbo de tempo fora da janela" }, 401);
  }
  if (!(await verifySignature(secret, svixId, svixTimestamp, raw, svixSignature))) {
    return json({ error: "Assinatura inválida" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const type = EVENT_TYPES[payload?.type];
  const emailId = payload?.data?.email_id;
  // Evento que não acompanhamos ou sem id: aceito para o Resend não reenviar.
  if (!type || !emailId) return json({ status: "ignored", reason: "tipo não acompanhado" });

  const data = payload.data ?? {};
  let detail: string | null = null;
  if (type === "bounced" && data.bounce) {
    detail = [data.bounce.type, data.bounce.subType].filter(Boolean).join(" / ")
      + (data.bounce.message ? `: ${data.bounce.message}` : "");
  } else if (type === "clicked" && data.click?.link) {
    detail = data.click.link;
  }

  const occurredAt = payload.created_at ?? data.created_at ?? new Date().toISOString();

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: result, error } = await sb.rpc("record_email_event", {
    p_provider_id: emailId,
    p_type: type,
    p_occurred_at: occurredAt,
    p_detail: detail,
    p_payload: payload,
    p_svix_id: svixId,
  });

  // Erro ao gravar: 500 faz o Resend tentar de novo mais tarde.
  if (error) {
    console.error("[resend-webhook] falha ao registrar evento", svixId, error.message);
    return json({ error: "Falha ao registrar evento" }, 500);
  }

  // 'unknown' = e-mail que não é de pedido (ex.: os do Auth); 'duplicate' = reenvio.
  return json({ status: result });
});
