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
    // Auth
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "N\u00e3o autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      order_id,
      payment_method,      // "credit_card" | "debit_card" | "pix"
      token,               // token do cart\u00e3o (gerado pelo SDK MercadoPago.js no front)
      issuer_id,           // ID do emissor do cart\u00e3o
      installments = 1,    // n\u00famero de parcelas
      payment_method_id,   // ex: "visa", "master", "pix"
      payer_email,         // email do pagador
      payer_doc_type,      // tipo doc: "CPF"
      payer_doc_number,    // n\u00famero do CPF
      environment = "sandbox",
    } = body;

    if (!order_id || !payment_method) {
      return new Response(JSON.stringify({ error: "order_id e payment_method s\u00e3o obrigat\u00f3rios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar cart\u00e3o precisa de token
    if ((payment_method === "credit_card" || payment_method === "debit_card") && !token) {
      return new Response(JSON.stringify({ error: "token do cart\u00e3o \u00e9 obrigat\u00f3rio para pagamento com cart\u00e3o" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Buscar credenciais
    const { data: creds, error: credsError } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (credsError || !creds) {
      return new Response(JSON.stringify({
        error: `Credenciais MP (${environment}) n\u00e3o configuradas.`
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar order + items
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(`
        id, short_id, total, shipping_price, user_id,
        order_items (
          id, product_title, quantity, unit_price, product_type
        )
      `)
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Pedido n\u00e3o encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Pedido n\u00e3o pertence ao usu\u00e1rio" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar perfil
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, phone, document")
      .eq("id", user.id)
      .single();

    const firstName = profile?.full_name?.split(" ")[0] || "";
    const lastName = profile?.full_name?.split(" ").slice(1).join(" ") || "";
    const email = payer_email || profile?.email || user.email || "";
    const docNumber = payer_doc_number || profile?.document?.replace(/\D/g, "") || "";

    const totalAmount = Number(order.total);
    const external_reference = order.short_id || order.id;

    // Montar items para additional_info
    const items = (order.order_items || []).map((item: any) => ({
      id: item.id,
      title: item.product_title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      category_id: item.product_type === "ebook" ? "digital_goods" : "others",
    }));

    // ===== MONTAR BODY DO PAGAMENTO =====
    const paymentBody: any = {
      transaction_amount: totalAmount,
      description: `Pedido ${external_reference}`,
      external_reference: String(external_reference),
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      statement_descriptor: "GOLEIROVITOR",
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: payer_doc_type || "CPF",
          number: docNumber,
        },
      },
      additional_info: {
        items: items,
        payer: {
          first_name: firstName,
          last_name: lastName,
          phone: profile?.phone ? {
            area_code: profile.phone.substring(0, 2),
            number: profile.phone.substring(2),
          } : undefined,
        },
      },
    };

    // Configura\u00e7\u00f5es espec\u00edficas por m\u00e9todo
    if (payment_method === "credit_card" || payment_method === "debit_card") {
      paymentBody.token = token;
      paymentBody.installments = installments;
      paymentBody.payment_method_id = payment_method_id; // "visa", "master", etc.
      if (issuer_id) {
        paymentBody.issuer_id = issuer_id;
      }
    } else if (payment_method === "pix") {
      paymentBody.payment_method_id = "pix";
    }

    // Chamar API do Mercado Pago
    const idempotencyKey = `${order.id}-${Date.now()}`;
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(paymentBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Payment Error:", JSON.stringify(mpData));
      return new Response(JSON.stringify({
        error: "Erro ao processar pagamento",
        details: mpData,
        mp_status: mpData.status,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mapear status
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

    const orderStatus = statusMap[mpData.status] || "pending";

    // Atualizar order
    const updateData: any = {
      mp_payment_id: String(mpData.id),
      mp_payment_status: mpData.status,
      mp_payment_method: mpData.payment_method_id,
      mp_payment_type: mpData.payment_type_id,
      mp_external_reference: String(external_reference),
      mp_payer_email: mpData.payer?.email,
      mp_net_amount: mpData.transaction_details?.net_received_amount,
      mp_fee_amount: mpData.fee_details?.reduce((sum: number, f: any) => sum + (f.amount || 0), 0) || 0,
      status: orderStatus,
    };

    if (mpData.status === "approved") {
      updateData.mp_paid_at = mpData.date_approved || new Date().toISOString();
    }

    await supabaseAdmin
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    // Montar resposta baseada no m\u00e9todo
    const response: any = {
      payment_id: mpData.id,
      status: mpData.status,
      status_detail: mpData.status_detail,
      order_status: orderStatus,
      payment_method: payment_method,
    };

    // PIX: retornar QR Code e c\u00f3digo copia-cola
    if (payment_method === "pix") {
      response.pix_qr_code = mpData.point_of_interaction?.transaction_data?.qr_code || null;
      response.pix_qr_code_base64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || null;
      response.pix_ticket_url = mpData.point_of_interaction?.transaction_data?.ticket_url || null;
      response.pix_expiration = mpData.date_of_expiration || null;
    }

    // Cart\u00e3o: retornar detalhes
    if (payment_method === "credit_card" || payment_method === "debit_card") {
      response.installments = mpData.installments;
      response.card_last_four = mpData.card?.last_four_digits || null;
      response.card_brand = mpData.payment_method_id || null;
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
