import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Função de teste para gerar token + pagamento de cartão em um só passo
// Usa cartões de teste do MP para validar que o backend funciona
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      order_id,
      environment = "sandbox",
      // Cartão de teste - defaults para Mastercard aprovado
      card_number = "5031433215406351",
      expiration_month = 11,
      expiration_year = 2025,
      security_code = "123",
      cardholder_name = "APRO",      // APRO=aprovado, CONT=pendente, OTHE=rejeitado
      cardholder_doc_type = "CPF",
      cardholder_doc_number = "12345678909",
      payer_email = "test@testuser.com",
      installments = 1,
    } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar credenciais
    const { data: creds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token, public_key")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({ error: "Credenciais não encontradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PASSO 1: Gerar card token via API do MP
    const tokenResponse = await fetch("https://api.mercadopago.com/v1/card_tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
      },
      body: JSON.stringify({
        card_number: card_number.replace(/\s/g, ""),
        expiration_month: expiration_month,
        expiration_year: expiration_year,
        security_code: security_code,
        cardholder: {
          name: cardholder_name,
          identification: {
            type: cardholder_doc_type,
            number: cardholder_doc_number,
          },
        },
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return new Response(JSON.stringify({
        error: "Erro ao gerar token do cartão",
        step: "card_token",
        details: tokenData,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Token gerado:", tokenData.id);

    // PASSO 2: Buscar order
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(`
        id, short_id, total, shipping_price, user_id,
        order_items (id, product_title, quantity, unit_price, product_type)
      `)
      .eq("id", order_id)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalAmount = Number(order.total);
    const external_reference = order.short_id || order.id;

    // PASSO 3: Criar pagamento com o token
    const paymentBody = {
      transaction_amount: totalAmount,
      token: tokenData.id,
      description: `Pedido ${external_reference}`,
      installments: installments,
      payment_method_id: tokenData.first_six_digits?.startsWith("5") ? "master" : "visa",
      external_reference: String(external_reference),
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      statement_descriptor: "GOLEIROVITOR",
      payer: {
        email: payer_email,
        first_name: cardholder_name.split(" ")[0],
        last_name: cardholder_name.split(" ").slice(1).join(" ") || "Test",
        identification: {
          type: cardholder_doc_type,
          number: cardholder_doc_number,
        },
      },
    };

    const idempotencyKey = `test-${order.id}-${Date.now()}`;
    const paymentResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentBody),
    });

    const paymentData = await paymentResponse.json();

    if (!paymentResponse.ok) {
      return new Response(JSON.stringify({
        error: "Erro ao criar pagamento",
        step: "payment",
        details: paymentData,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PASSO 4: Atualizar order
    const statusMap: Record<string, string> = {
      approved: "paid",
      authorized: "paid",
      pending: "pending",
      in_process: "pending",
      rejected: "cancelled",
      cancelled: "cancelled",
    };

    const orderStatus = statusMap[paymentData.status] || "pending";
    const updateData: any = {
      mp_payment_id: String(paymentData.id),
      mp_payment_status: paymentData.status,
      mp_payment_method: paymentData.payment_method_id,
      mp_payment_type: paymentData.payment_type_id,
      mp_external_reference: String(external_reference),
      mp_payer_email: paymentData.payer?.email,
      status: orderStatus,
    };

    if (paymentData.status === "approved") {
      updateData.mp_paid_at = paymentData.date_approved || new Date().toISOString();
      updateData.mp_net_amount = paymentData.transaction_details?.net_received_amount;
      updateData.mp_fee_amount = paymentData.fee_details?.reduce((s: number, f: any) => s + (f.amount || 0), 0) || 0;
    }

    await supabaseAdmin.from("orders").update(updateData).eq("id", order.id);

    return new Response(JSON.stringify({
      success: true,
      token_id: tokenData.id,
      payment_id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      order_status: orderStatus,
      order_id: order.id,
      amount: totalAmount,
      card: {
        last_four: paymentData.card?.last_four_digits,
        brand: paymentData.payment_method_id,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
