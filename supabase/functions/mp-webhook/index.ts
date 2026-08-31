import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Valida a assinatura do webhook.
 *
 * O manifest usa o `data.id` da QUERY STRING (não do body), conforme a
 * documentação. Sem secret configurado a requisição é rejeitada — nunca aceita.
 */
async function validateSignature(req: Request, dataId: string | null): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.error("MP_WEBHOOK_SECRET não configurado — rejeitando");
    return false;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  if (!xSignature) return false;

  const parts = xSignature.split(",");
  const ts = parts.find((p) => p.trim().startsWith("ts="))?.split("=")[1]?.trim();
  const v1 = parts.find((p) => p.trim().startsWith("v1="))?.split("=")[1]?.trim();
  if (!ts || !v1) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // A doc manda usar data.id em minúsculas; o SDK oficial usa a caixa original.
  // Tentamos as duas — ambas exigem a chave secreta, então não há perda de segurança.
  for (const id of [dataId, dataId?.toLowerCase()]) {
    const manifest =
      [id ? `id:${id}` : null, xRequestId ? `request-id:${xRequestId}` : null, `ts:${ts}`]
        .filter(Boolean)
        .join(";") + ";";

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hex.length === v1.length && crypto.subtle.timingSafeEqual !== undefined) {
      if (timingSafeEqualHex(hex, v1)) return true;
    } else if (hex === v1) {
      return true;
    }
  }

  return false;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Estado do pedido derivado do pagamento. `null` = não mexe no status. */
function mapOrderStatus(paymentStatus: string): string | null {
  switch (paymentStatus) {
    case "approved":
      return "paid";
    case "cancelled":
      return "cancelled";
    // Recusado NÃO cancela: o cliente pode tentar de novo no mesmo link.
    case "rejected":
    case "pending":
    case "in_process":
    case "authorized":
    case "in_mediation":
    case "refunded":
    case "charged_back":
    default:
      return null;
  }
}

/** Situações que exigem decisão humana. */
function attentionReason(paymentStatus: string): string | null {
  switch (paymentStatus) {
    case "refunded":
      return "Pagamento reembolsado";
    case "charged_back":
      return "Contestação (chargeback) aberta — não enviar";
    case "in_mediation":
      return "Pagamento em disputa";
    case "rejected":
      return "Pagamento recusado — cliente pode tentar novamente";
    default:
      return null;
  }
}

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
};

/** Impede que um evento atrasado regrida o pedido (paid nunca volta a pending). */
function canTransition(current: string | null, next: string): boolean {
  if (!current || current === next) return false;
  if (next === "cancelled") return current === "pending";
  const from = STATUS_RANK[current];
  const to = STATUS_RANK[next];
  if (from === undefined || to === undefined) return false;
  return to > from;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const queryDataId = url.searchParams.get("data.id");

  const ok = (payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));

    // 1. Autenticidade
    const dataId = queryDataId ?? (body.data?.id ? String(body.data.id) : null);
    if (!(await validateSignature(req, dataId))) {
      console.error("Assinatura inválida — rejeitando");
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = body.type || url.searchParams.get("type") || "unknown";
    const paymentId = dataId;
    const eventId = body.id ? String(body.id) : null;

    // 2. Registro + deduplicação (o MP reenvia por dias)
    const { data: logRow, error: logError } = await supabaseAdmin
      .from("mp_webhook_logs")
      .insert({
        event_type: eventType,
        event_id: eventId,
        payment_id: paymentId,
        payload: body,
      })
      .select("id")
      .maybeSingle();

    if (logError?.code === "23505") {
      return ok({ status: "duplicate_ignored", payment_id: paymentId });
    }

    const logId = logRow?.id ?? null;
    const finish = async (result: Record<string, unknown>, error?: string) => {
      if (logId) {
        await supabaseAdmin
          .from("mp_webhook_logs")
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            order_id: (result.order_id as string) ?? null,
            error: error ?? null,
          })
          .eq("id", logId);
      }
      return ok(result);
    };

    if (eventType !== "payment" && !String(body.action ?? "").startsWith("payment.")) {
      return await finish({ status: "ignored", type: eventType });
    }
    if (!paymentId) {
      return await finish({ status: "no_payment_id" });
    }

    // 3. Estado real na API do Mercado Pago
    const { data: allCreds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token, environment")
      .eq("is_active", true)
      .order("environment", { ascending: false });

    let payment: Record<string, any> | null = null;
    let usedEnv = "";

    for (const cred of allCreds ?? []) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${cred.access_token}` },
      });
      if (response.ok) {
        payment = await response.json();
        usedEnv = cred.environment;
        break;
      }
    }

    if (!payment) {
      // Inclui o simulador do painel, que envia um Data ID fictício.
      return await finish({ status: "payment_not_found", payment_id: paymentId }, "Pagamento não encontrado na API do MP");
    }

    // Notificação de teste chegando em ambiente produtivo: registra e ignora.
    if (payment.live_mode === false && usedEnv === "production") {
      return await finish({ status: "test_notification_ignored" });
    }

    const extRef = payment.external_reference;
    if (!extRef) {
      return await finish({ status: "no_external_reference" }, "Pagamento sem external_reference");
    }

    // Pedidos antigos usam short_id como referência; os novos usam o uuid.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(extRef);
    const { data: order } = isUuid
      ? await supabaseAdmin
          .from("orders")
          .select("id, status, total, mp_payment_status")
          .eq("id", extRef)
          .maybeSingle()
      : await supabaseAdmin
          .from("orders")
          .select("id, status, total, mp_payment_status")
          .eq("short_id", extRef)
          .maybeSingle();

    if (!order) {
      return await finish({ status: "order_not_found", external_reference: extRef }, "Pedido não encontrado");
    }

    // 4. Atualização do pedido
    const update: Record<string, unknown> = {
      mp_payment_id: String(payment.id),
      mp_payment_status: payment.status,
      mp_payment_method: payment.payment_method_id,
      mp_payment_type: payment.payment_type_id,
      mp_merchant_order_id: payment.order?.id ? String(payment.order.id) : null,
      mp_payer_email: payment.payer?.email,
      mp_net_amount: payment.transaction_details?.net_received_amount,
      mp_fee_amount:
        payment.fee_details?.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0) ?? 0,
    };

    const reason = attentionReason(payment.status);
    if (reason) {
      update.needs_attention = true;
      update.attention_reason = reason;
    }

    let newStatus = mapOrderStatus(payment.status);

    // Só marca como pago se o valor cobrir o pedido.
    if (newStatus === "paid") {
      const paid = Number(payment.transaction_amount ?? 0);
      const expected = Number(order.total ?? 0);
      if (paid + 0.01 < expected) {
        newStatus = null;
        update.needs_attention = true;
        update.attention_reason = `Pago R$ ${paid.toFixed(2)}, pedido R$ ${expected.toFixed(2)}`;
      } else {
        update.mp_paid_at = payment.date_approved || new Date().toISOString();
      }
    }

    const willTransition = newStatus !== null && canTransition(order.status, newStatus);
    if (willTransition) update.status = newStatus;

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(update)
      .eq("id", order.id);

    if (updateError) {
      console.error("Erro ao atualizar pedido:", updateError);
      // Falha transitória: 5xx faz o MP reenviar.
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Estoque volta quando o pedido é cancelado.
    if (willTransition && newStatus === "cancelled") {
      await supabaseAdmin.rpc("release_order_stock", { p_order_id: order.id });
    }

    if (payment.status !== order.mp_payment_status || willTransition) {
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        type: "payment_updated",
        from_status: order.status,
        to_status: willTransition ? newStatus : order.status,
        actor: "webhook",
        payload: {
          mp_payment_id: String(payment.id),
          mp_payment_status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          environment: usedEnv,
        },
      });
    }

    return await finish({
      status: "processed",
      order_id: order.id,
      payment_status: payment.status,
      order_status: willTransition ? newStatus : order.status,
      environment: usedEnv,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    // Erro inesperado: 5xx para o MP reenviar.
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
