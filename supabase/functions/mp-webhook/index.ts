import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Função para validar assinatura do webhook do Mercado Pago
async function validateWebhookSignature(
  req: Request,
  body: any
): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    // Se não tem secret configurado, pula validação (modo desenvolvimento)
    console.warn("MP_WEBHOOK_SECRET não configurado - pulando validação de assinatura");
    return true;
  }

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.warn("Headers x-signature ou x-request-id ausentes");
    return false;
  }

  try {
    const parts = xSignature.split(",");
    const ts = parts.find((p: string) => p.trim().startsWith("ts="))?.split("=")[1];
    const v1 = parts.find((p: string) => p.trim().startsWith("v1="))?.split("=")[1];

    if (!ts || !v1) return false;

    const dataId = body.data?.id;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
    const hex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hex === v1;
  } catch (err) {
    console.error("Erro ao validar assinatura:", err);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    console.log("MP Webhook received:", JSON.stringify(body));

    // Validar assinatura (se MP_WEBHOOK_SECRET estiver configurado)
    const isValid = await validateWebhookSignature(req, body);
    if (!isValid) {
      console.error("Webhook signature inválida - rejeitando");
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mercado Pago envia: { action, type, data: { id } }
    const url = new URL(req.url);
    const eventType = body.type || body.action || url.searchParams.get("type") || "unknown";
    const paymentId = body.data?.id || url.searchParams.get("data.id");

    // Logar webhook
    await supabaseAdmin.from("mp_webhook_logs").insert({
      event_type: eventType,
      event_id: body.id ? String(body.id) : null,
      payment_id: paymentId ? String(paymentId) : null,
      payload: body,
    });

    // Só processar notificações de pagamento
    if (
      eventType !== "payment" &&
      body.action !== "payment.created" &&
      body.action !== "payment.updated"
    ) {
      return new Response(JSON.stringify({ status: "ignored", type: eventType }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ status: "no payment id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tentar buscar pagamento com credenciais de sandbox e produção
    const { data: allCreds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token, environment")
      .eq("is_active", true)
      .order("environment", { ascending: false });

    let paymentData: any = null;
    let usedEnv = "";

    for (const cred of allCreds || []) {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${cred.access_token}` },
        }
      );

      if (paymentResponse.ok) {
        paymentData = await paymentResponse.json();
        usedEnv = cred.environment;
        break;
      }
    }

    if (!paymentData) {
      console.error("Payment not found in MP API:", paymentId);
      await supabaseAdmin
        .from("mp_webhook_logs")
        .update({ error: "Payment not found in MP API", processed: true })
        .eq("payment_id", String(paymentId))
        .order("created_at", { ascending: false })
        .limit(1);

      return new Response(JSON.stringify({ status: "payment_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Payment data from MP:", JSON.stringify({
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference,
      payment_method_id: paymentData.payment_method_id,
      payment_type_id: paymentData.payment_type_id,
    }));

    // Buscar o pedido pelo external_reference
    const extRef = paymentData.external_reference;
    if (!extRef) {
      console.error("No external_reference in payment");
      return new Response(JSON.stringify({ status: "no_external_reference" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tentar buscar por short_id primeiro, depois por id (uuid)
    let order: any = null;
    const { data: orderByShortId } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("short_id", extRef)
      .maybeSingle();

    if (orderByShortId) {
      order = orderByShortId;
    } else {
      const { data: orderById } = await supabaseAdmin
        .from("orders")
        .select("id, status")
        .eq("id", extRef)
        .maybeSingle();
      order = orderById;
    }

    if (!order) {
      console.error("Order not found for external_reference:", extRef);
      return new Response(JSON.stringify({ status: "order_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapear status do MP para status do pedido
    const statusMap: Record<string, string> = {
      approved: "paid",
      authorized: "paid",
      pending: "pending",
      in_process: "pending",
      in_mediation: "pending",
      rejected: "cancelled",
      cancelled: "cancelled",
      refunded: "cancelled",
      charged_back: "cancelled",
    };

    const newStatus = statusMap[paymentData.status] || "pending";

    // Atualizar o pedido
    const updateData: any = {
      mp_payment_id: String(paymentData.id),
      mp_payment_status: paymentData.status,
      mp_payment_method: paymentData.payment_method_id,
      mp_payment_type: paymentData.payment_type_id,
      mp_merchant_order_id: paymentData.order?.id ? String(paymentData.order.id) : null,
      mp_payer_email: paymentData.payer?.email,
      mp_net_amount: paymentData.transaction_details?.net_received_amount,
      mp_fee_amount:
        paymentData.fee_details?.reduce(
          (sum: number, f: any) => sum + (f.amount || 0),
          0
        ) || 0,
      status: newStatus,
    };

    if (paymentData.status === "approved") {
      updateData.mp_paid_at = paymentData.date_approved || new Date().toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
    }

    // Marcar webhook como processado
    await supabaseAdmin
      .from("mp_webhook_logs")
      .update({ order_id: order.id, processed: true })
      .eq("payment_id", String(paymentId))
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({
        status: "processed",
        order_id: order.id,
        payment_status: paymentData.status,
        order_status: newStatus,
        environment: usedEnv,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
