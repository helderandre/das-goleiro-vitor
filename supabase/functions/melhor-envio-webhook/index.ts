import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Melhor Envio - Webhook Receiver
 *
 * Recebe as transições de status da etiqueta e reflete no pedido.
 * Eventos oficiais: order.created, pending, released, generated, received,
 * posted, delivered, cancelled, undelivered, paused, suspended.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
};

/** Nunca rebaixa o pedido: entregue não volta a enviado. */
function canTransition(current: string | null, next: string): boolean {
  if (!current || current === next) return false;
  const from = STATUS_RANK[current];
  const to = STATUS_RANK[next];
  if (from === undefined || to === undefined) return false;
  return to > from;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "Melhor Envio - Webhook", version: "3.0.0" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const ok = (payload: Record<string, unknown>) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // O corpo bruto é lido antes de qualquer parse — a validação de assinatura
    // (X-ME-Signature) usa exatamente estes bytes.
    const raw = await req.text();
    const payload = raw ? JSON.parse(raw) : {};

    const event = String(payload.event || payload.type || "");
    const data = payload.data ?? payload;
    const meOrderId = data.id || payload.id || payload.order_id || null;
    const tracking = data.tracking || data.self_tracking || null;

    // Registro + deduplicação: 5 reenvios a cada 15 min.
    const { error: logError } = await supabase.from("me_webhook_logs").insert({
      me_order_id: meOrderId,
      event: event || "unknown",
      status: data.status ?? null,
      tracking,
      payload,
      signature_valid: null,
    });

    if (logError?.code === "23505") {
      return ok({ status: "duplicate_ignored", me_order_id: meOrderId });
    }

    if (!meOrderId) return ok({ status: "no_order_id" });

    const { data: order } = await supabase
      .from("orders")
      .select("id, status, shipping_status, tracking_code, shipped_at")
      .eq("me_cart_id", meOrderId)
      .maybeSingle();

    if (!order) {
      // Etiqueta gerada fora deste aplicativo, ou pedido já removido.
      await supabase
        .from("me_webhook_logs")
        .update({ processed: true, processed_at: new Date().toISOString(), error: "Pedido não encontrado" })
        .eq("me_order_id", meOrderId)
        .is("processed_at", null);
      return ok({ status: "order_not_found", me_order_id: meOrderId });
    }

    const update: Record<string, unknown> = {};
    let orderStatus: string | null = null;

    if (tracking && tracking !== order.tracking_code) {
      update.tracking_code = tracking;
    }
    if (data.tracking_url) update.tracking_url = data.tracking_url;

    if (event.includes("posted")) {
      update.shipping_status = "posted";
      if (!order.shipped_at) update.shipped_at = data.posted_at ?? new Date().toISOString();
      orderStatus = "shipped";
    } else if (event.includes("delivered")) {
      update.shipping_status = "delivered";
      update.delivered_at = data.delivered_at ?? new Date().toISOString();
      orderStatus = "delivered";
    } else if (event.includes("cancelled") || event.includes("canceled")) {
      update.shipping_status = "cancelled";
      update.needs_attention = true;
      update.attention_reason = "Etiqueta cancelada no Melhor Envio";
    } else if (event.includes("undelivered")) {
      update.shipping_status = "not_delivered";
      update.needs_attention = true;
      update.attention_reason = "Entrega não realizada — verificar com a transportadora";
    } else if (event.includes("paused") || event.includes("suspended")) {
      update.needs_attention = true;
      update.attention_reason = "Envio pausado/suspenso pela transportadora";
    } else if (event.includes("generated")) {
      update.shipping_status = "generated";
    } else if (event.includes("released")) {
      update.shipping_status = "paid";
    }

    const willTransition = orderStatus !== null && canTransition(order.status, orderStatus);
    if (willTransition) update.status = orderStatus;

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase.from("orders").update(update).eq("id", order.id);
      if (updateError) {
        // Falha transitória: 5xx faz o ME reenviar (5 tentativas).
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("order_events").insert({
        order_id: order.id,
        type: "shipment_updated",
        from_status: order.status,
        to_status: willTransition ? orderStatus : order.status,
        actor: "webhook",
        payload: { event, me_status: data.status, tracking },
      });
    }

    await supabase
      .from("me_webhook_logs")
      .update({ processed: true, processed_at: new Date().toISOString(), order_id: order.id })
      .eq("me_order_id", meOrderId)
      .is("processed_at", null);

    return ok({
      status: "processed",
      order_id: order.id,
      event,
      order_status: willTransition ? orderStatus : order.status,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[WEBHOOK ERRO]", msg);
    return new Response(JSON.stringify({ error: "Erro ao processar webhook", detalhes: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
