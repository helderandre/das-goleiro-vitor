import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { renderOrderEmail, type EmailKind, type OrderEmailData } from "../_shared/emails/templates.ts";
import { firstName } from "../_shared/emails/format.ts";
import { paymentLabel } from "../_shared/emails/payment.ts";
import { type EmailAddress, SITE_URL } from "../_shared/emails/layout.ts";

/**
 * Envia os e-mails do pedido que estão na fila (email_outbox).
 *
 * Chamada pelo banco: logo após cada enfileiramento (pg_net) e a cada minuto
 * pela varredura do pg_cron. Autenticada pelo cabeçalho x-dispatch-secret.
 * Change: openspec/changes/emails-transacionais-pedido
 */

const ORDER_TTL_MS = 12 * 60 * 60 * 1000;
const BATCH_SIZE = 20;
/** Rodadas de reivindicação por chamada: o 2º e-mail de um pedido só é liberado depois do 1º. */
const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 5;
/** Espera, em minutos, depois da tentativa 1, 2, 3 e 4. */
const BACKOFF_MINUTES = [1, 5, 15, 30];
/**
 * O Resend aceita 2 requisições por segundo. Só enviar em sequência não basta:
 * cada chamada leva ~300ms, o que daria ~3 por segundo num lote cheio.
 */
const MIN_INTERVAL_MS = 550;

const env = (name: string) => Deno.env.get(name) ?? "";

interface OutboxRow {
  id: string;
  order_id: string;
  kind: EmailKind;
  mp_payment_id: string | null;
  attempts: number;
}

type Outcome =
  | { status: "sent"; providerId: string; recipient: string; redirectedTo: string | null; subject: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string; permanent: boolean };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Comparação em tempo constante, para não vazar o segredo pelo tempo de resposta. */
function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (!safeEqual(req.headers.get("x-dispatch-secret") ?? "", env("EMAIL_DISPATCH_SECRET"))) {
    return json({ error: "Não autorizado" }, 401);
  }

  const enabled = env("EMAIL_ENABLED").toLowerCase() !== "false";
  // Sem chave ou remetente não há como enviar: as linhas ficam pendentes, sem
  // gastar tentativas, até a configuração ser concluída.
  if (enabled && (!env("RESEND_API_KEY") || !env("EMAIL_FROM"))) {
    return json({ error: "Configuração incompleta: RESEND_API_KEY e EMAIL_FROM são obrigatórios" }, 503);
  }

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  const results: { id: string; kind: string; status: string; detail?: string }[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const { data: batch, error } = await sb.rpc("claim_email_batch", { p_limit: BATCH_SIZE });
    if (error) return json({ error: "Falha ao reivindicar lote", details: error.message }, 500);
    if (!batch || batch.length === 0) break;

    // Em sequência, não em paralelo: o Resend limita requisições por segundo.
    for (const row of batch as OutboxRow[]) {
      const outcome = await processRow(sb, row, enabled);
      // Descartes não chamam o Resend e não precisam esperar.
      if (outcome.status !== "skipped") await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
      await persist(sb, row, outcome);
      results.push({
        id: row.id,
        kind: row.kind,
        status: outcome.status,
        detail: outcome.status === "sent" ? undefined : outcome.reason,
      });
    }
  }

  return json({ processed: results.length, results });
});

// ---------------------------------------------------------------------------

async function processRow(sb: SupabaseClient, row: OutboxRow, enabled: boolean): Promise<Outcome> {
  try {
    if (!enabled) return { status: "skipped", reason: "Envio desligado (EMAIL_ENABLED=false)" };

    const ctx = await loadOrder(sb, row.order_id);
    if (!ctx) return { status: "skipped", reason: "Pedido não encontrado" };

    const recipient = ctx.profile?.email || ctx.order.mp_payer_email;
    if (!recipient) return { status: "skipped", reason: "Cliente sem e-mail cadastrado" };

    const stale = staleReason(row, ctx.order);
    if (stale) return { status: "skipped", reason: stale };

    const data = await buildData(sb, row, ctx);
    const email = renderOrderEmail(row.kind, data);

    // Modo de teste: tudo vai para o endereço interno, sinalizado no assunto.
    const testRecipient = env("EMAIL_TEST_RECIPIENT");
    const to = testRecipient || recipient;
    const subject = testRecipient ? `[TESTE → ${recipient}] ${email.subject}` : email.subject;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
        // Se a function cair depois de enviar e antes de gravar, a nova
        // tentativa usa a mesma chave e o Resend não envia de novo.
        "Idempotency-Key": row.id,
      },
      body: JSON.stringify({
        from: env("EMAIL_FROM"),
        to: [to],
        reply_to: env("EMAIL_REPLY_TO") || undefined,
        subject,
        html: email.html,
        text: email.text,
        tags: [
          { name: "kind", value: row.kind },
          { name: "order_id", value: row.order_id },
        ],
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.id) {
      return { status: "sent", providerId: body.id, recipient, redirectedTo: testRecipient || null, subject };
    }

    const reason = `Resend ${res.status}: ${body?.message ?? body?.name ?? "erro desconhecido"}`;
    // 400/422 são erros de validação (endereço inválido, payload): repetir não resolve.
    // 401/403 costumam ser chave ou domínio ainda não configurados: vale repetir.
    const permanent = res.status === 400 || res.status === 422;
    return { status: "failed", reason, permanent };
  } catch (err) {
    return { status: "failed", reason: `Erro: ${err instanceof Error ? err.message : String(err)}`, permanent: false };
  }
}

async function persist(sb: SupabaseClient, row: OutboxRow, outcome: Outcome): Promise<void> {
  const now = new Date();
  let update: Record<string, unknown>;

  if (outcome.status === "sent") {
    update = {
      status: "sent",
      provider_id: outcome.providerId,
      recipient: outcome.recipient,
      test_redirect_to: outcome.redirectedTo,
      subject: outcome.subject,
      sent_at: now.toISOString(),
      delivery_status: "sent",
      last_error: null,
    };
  } else if (outcome.status === "skipped") {
    update = { status: "skipped", last_error: outcome.reason };
  } else if (outcome.permanent || row.attempts >= MAX_ATTEMPTS) {
    update = { status: "failed", last_error: outcome.reason };
  } else {
    const waitMin = BACKOFF_MINUTES[Math.min(row.attempts, BACKOFF_MINUTES.length) - 1] ?? 30;
    update = {
      status: "pending",
      last_error: outcome.reason,
      next_attempt_at: new Date(now.getTime() + waitMin * 60_000).toISOString(),
    };
  }

  const { error } = await sb
    .from("email_outbox")
    .update({ ...update, locked_at: null, updated_at: now.toISOString() })
    .eq("id", row.id);
  if (error) console.error("[send-order-emails] falha ao gravar resultado", row.id, error.message);
}

// ---------------------------------------------------------------------------

interface OrderContext {
  order: Record<string, any>;
  items: Record<string, any>[];
  covers: Map<string, string>;
  profile: { full_name: string | null; email: string | null } | null;
}

async function loadOrder(sb: SupabaseClient, orderId: string): Promise<OrderContext | null> {
  const { data: order } = await sb.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return null;

  const [{ data: items }, { data: profile }] = await Promise.all([
    sb.from("order_items").select("product_id, product_title, product_type, quantity, unit_price")
      .eq("order_id", orderId).order("created_at"),
    order.user_id
      ? sb.from("profiles").select("full_name, email").eq("id", order.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const productIds = (items ?? []).map((i) => i.product_id).filter(Boolean);
  const covers = new Map<string, string>();
  if (productIds.length > 0) {
    const { data: images } = await sb.from("product_images").select("product_id, image_url")
      .in("product_id", productIds).eq("is_cover", true);
    for (const img of images ?? []) covers.set(img.product_id, img.image_url);
  }

  return { order, items: items ?? [], covers, profile };
}

/** Motivo para descartar um e-mail que deixou de fazer sentido, ou null. */
function staleReason(row: OutboxRow, order: Record<string, any>): string | null {
  const status = order.status as string;
  switch (row.kind) {
    case "pedido_criado":
      return status === "cancelled" ? "Pedido já cancelado" : null;
    case "aguardando_pagamento":
      if (status === "paid" || status === "shipped" || status === "delivered") return "Pedido já pago";
      if (status === "cancelled") return "Pedido já cancelado";
      if (order.mp_payment_id !== row.mp_payment_id) return "Substituído por um Pix mais recente";
      if (new Date(order.created_at).getTime() + ORDER_TTL_MS <= Date.now()) return "Prazo de pagamento encerrado";
      return null;
    case "pagamento_recebido":
      return ["paid", "shipped", "delivered"].includes(status) ? null : `Pedido não está pago (${status})`;
    case "pagamento_cancelado":
      return status === "cancelled" ? null : `Pedido não está cancelado (${status})`;
    case "pedido_enviado":
      if (!order.tracking_code) return "Pedido sem código de rastreio";
      return ["shipped", "delivered"].includes(status) ? null : `Pedido não foi enviado (${status})`;
    case "pedido_concluido":
      return status === "delivered" ? null : `Pedido não foi entregue (${status})`;
  }
}

async function buildData(sb: SupabaseClient, row: OutboxRow, ctx: OrderContext): Promise<OrderEmailData> {
  const { order, items, covers, profile } = ctx;

  const emailItems = items.map((i) => ({
    title: i.product_title,
    quantity: Number(i.quantity),
    unitPrice: Number(i.unit_price),
    imageUrl: (i.product_id && covers.get(i.product_id)) || null,
  }));
  const itemsSum = emailItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const hasPhysical = items.some((i) => i.product_type !== "ebook");

  const rawAddress = (order.shipping_address ?? null) as (EmailAddress & { shipping?: { delivery_days?: number } }) | null;
  const address: EmailAddress | null = hasPhysical && rawAddress
    ? {
      street: rawAddress.street, number: rawAddress.number, complement: rawAddress.complement,
      neighborhood: rawAddress.neighborhood, city: rawAddress.city, state: rawAddress.state,
      zip_code: rawAddress.zip_code,
    }
    : null;

  const data: OrderEmailData = {
    shortId: order.short_id ?? `#${String(order.id).slice(0, 8)}`,
    orderUrl: `${SITE_URL}/pedido/${order.id}`,
    customerName: firstName(profile?.full_name),
    items: emailItems,
    subtotal: order.subtotal != null ? Number(order.subtotal) : itemsSum,
    shippingPrice: Number(order.shipping_price ?? 0),
    shippingName: order.me_service_name ?? null,
    total: Number(order.total),
    address,
    hasPhysical,
    isPaid: ["paid", "shipped", "delivered"].includes(order.status),
    expiresAt: new Date(new Date(order.created_at).getTime() + ORDER_TTL_MS),
    paymentLabel: paymentLabel(order.mp_payment_method, order.mp_payment_type),
  };

  if (row.kind === "aguardando_pagamento") data.pix = await fetchPix(sb, row.mp_payment_id);
  if (row.kind === "pagamento_cancelado") data.cancel = await cancelReason(sb, order.id);
  if (row.kind === "pedido_enviado") {
    const code = String(order.tracking_code);
    data.shipping = {
      trackingCode: code,
      trackingUrl: order.tracking_url || `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`,
      deliveryDays: rawAddress?.shipping?.delivery_days ?? null,
    };
  }
  return data;
}

/**
 * Copia e cola e link do QR Code, consultados no Mercado Pago. Se a consulta
 * falhar, o e-mail sai sem o código e aponta para a página do pedido.
 */
async function fetchPix(sb: SupabaseClient, paymentId: string | null): Promise<OrderEmailData["pix"]> {
  const empty = { qrCode: null, ticketUrl: null };
  if (!paymentId) return empty;
  try {
    const { data: cred } = await sb.from("mp_credentials").select("access_token, environment")
      .eq("is_active", true).order("environment", { ascending: true }).limit(2);
    // Produção tem precedência sobre sandbox quando as duas estão ativas.
    const token = (cred ?? []).find((c) => c.environment === "production")?.access_token ?? cred?.[0]?.access_token;
    if (!token) return empty;

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return empty;
    const payment = await res.json();
    const tx = payment?.point_of_interaction?.transaction_data ?? {};
    return { qrCode: tx.qr_code ?? null, ticketUrl: tx.ticket_url ?? null };
  } catch {
    return empty;
  }
}

async function cancelReason(sb: SupabaseClient, orderId: string): Promise<OrderEmailData["cancel"]> {
  const { data: refunds } = await sb.from("order_refunds").select("amount, status")
    .eq("order_id", orderId).neq("status", "rejected");
  if (refunds && refunds.length > 0) {
    return { reason: "refund", refundAmount: refunds.reduce((s, r) => s + Number(r.amount ?? 0), 0) };
  }

  const { data: last } = await sb.from("order_events").select("type")
    .eq("order_id", orderId).eq("to_status", "cancelled")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { reason: last?.type === "order_expired" ? "expired" : "store" };
}
