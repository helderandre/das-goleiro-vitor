import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Melhor Envio - Webhook Receiver
 * Recebe notificações e atualiza automaticamente o pedido no banco.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "Melhor Envio - Webhook", version: "2.0.0" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Webhook:`, JSON.stringify(payload, null, 2));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Tentar encontrar o pedido pelo me_cart_id
    const meCartId = payload.id || payload.order_id || payload.data?.id;

    if (meCartId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id, shipping_status")
        .eq("me_cart_id", meCartId)
        .single();

      if (order) {
        const updateData: Record<string, unknown> = {};
        const event = payload.event || payload.type || "";
        const tracking = payload.tracking || payload.data?.tracking;

        if (tracking) updateData.tracking_code = tracking;

        if (event.includes("posted") || event.includes("transit")) {
          updateData.shipping_status = "in_transit";
          updateData.status = "shipped";
          if (!order.shipping_status || order.shipping_status === "printed" || order.shipping_status === "generated") {
            updateData.shipped_at = timestamp;
          }
        } else if (event.includes("delivered")) {
          updateData.shipping_status = "delivered";
          updateData.status = "delivered";
          updateData.delivered_at = timestamp;
        } else if (event.includes("cancelled")) {
          updateData.shipping_status = "cancelled";
        }

        if (Object.keys(updateData).length > 0) {
          await supabase.from("orders").update(updateData).eq("id", order.id);
          console.log(`[WEBHOOK] Pedido ${order.id} atualizado:`, updateData);
        }
      }
    }

    return new Response(
      JSON.stringify({ status: "received", processado_em: timestamp }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`[WEBHOOK ERRO]`, msg);
    return new Response(
      JSON.stringify({ error: "Erro ao processar webhook", detalhes: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
