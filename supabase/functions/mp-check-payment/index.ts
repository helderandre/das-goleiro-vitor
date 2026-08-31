import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { payment_id, order_id, environment = "sandbox" } = body;

    if (!payment_id && !order_id) {
      return new Response(JSON.stringify({ error: "payment_id ou order_id obrigat\u00f3rio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Se veio order_id, busca o payment_id
    let mpPaymentId = payment_id;
    let orderId = order_id;

    if (!mpPaymentId && orderId) {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("mp_payment_id")
        .eq("id", orderId)
        .single();
      mpPaymentId = order?.mp_payment_id;
    }

    if (!mpPaymentId) {
      return new Response(JSON.stringify({ error: "Nenhum payment_id encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar credenciais
    const { data: creds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({ error: "Credenciais n\u00e3o encontradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Consultar status no Mercado Pago
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      { headers: { Authorization: `Bearer ${creds.access_token}` } }
    );

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return new Response(JSON.stringify({ error: "Erro ao consultar MP", details: mpData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se mudou de status, atualizar o pedido
    const statusMap: Record<string, string> = {
      approved: "paid",
      authorized: "paid",
      pending: "pending",
      in_process: "pending",
      rejected: "cancelled",
      cancelled: "cancelled",
      refunded: "cancelled",
    };

    const newOrderStatus = statusMap[mpData.status] || "pending";

    // Buscar order pelo external_reference se n\u00e3o temos order_id
    if (!orderId) {
      const extRef = mpData.external_reference;
      const { data: o } = await supabaseAdmin
        .from("orders")
        .select("id")
        .or(`short_id.eq.${extRef},id.eq.${extRef}`)
        .maybeSingle();
      orderId = o?.id;
    }

    if (orderId) {
      const updateData: any = {
        mp_payment_status: mpData.status,
        status: newOrderStatus,
      };
      if (mpData.status === "approved") {
        updateData.mp_paid_at = mpData.date_approved || new Date().toISOString();
        updateData.mp_net_amount = mpData.transaction_details?.net_received_amount;
        updateData.mp_fee_amount = mpData.fee_details?.reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0;
      }
      await supabaseAdmin.from("orders").update(updateData).eq("id", orderId);
    }

    return new Response(JSON.stringify({
      payment_id: mpData.id,
      mp_status: mpData.status,
      mp_status_detail: mpData.status_detail,
      order_status: newOrderStatus,
      order_id: orderId,
      date_approved: mpData.date_approved,
      payment_method: mpData.payment_method_id,
      pix_expiration: mpData.date_of_expiration,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
