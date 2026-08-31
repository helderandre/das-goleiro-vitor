import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://goleirovitor.com.br";

/** Validade da cobrança: boleto precisa de prazo maior. */
const EXPIRATION_HOURS_WITHOUT_TICKET = 24;
const EXPIRATION_HOURS_WITH_TICKET = 72;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Não autenticado" }, 401);

    const body = await req.json();
    const { order_id, environment = "sandbox" } = body;
    const site_url = body.site_url || SITE_URL;
    const allowTicket = body.allow_ticket !== false;

    if (!order_id) return json({ error: "order_id é obrigatório" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: creds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (!creds) {
      return json(
        { error: `Credenciais MP (${environment}) não configuradas. Insira na tabela mp_credentials.` },
        500,
      );
    }

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        `id, short_id, total, subtotal, shipping_price, me_service_name, user_id, status,
         order_items ( id, product_id, product_title, quantity, unit_price, product_type )`,
      )
      .eq("id", order_id)
      .single();

    if (!order) return json({ error: "Pedido não encontrado" }, 404);

    // O dono do pedido paga o próprio pedido; o admin cobra em nome do cliente.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, phone, document, role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    if (order.user_id !== user.id && !isAdmin) {
      return json({ error: "Pedido não pertence ao usuário" }, 403);
    }

    if (order.status === "paid") {
      return json({ error: "Pedido já está pago" }, 409);
    }

    // Dados do pagador: do dono do pedido, não de quem está criando a cobrança.
    const { data: payerProfile } = order.user_id
      ? await supabaseAdmin
          .from("profiles")
          .select("full_name, email, phone, document")
          .eq("id", order.user_id)
          .single()
      : { data: null };

    const items = (order.order_items ?? []).map((item: Record<string, any>) => ({
      id: item.product_id ?? item.id,
      title: item.product_title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: "BRL",
      category_id: item.product_type === "ebook" ? "digital_goods" : "others",
    }));

    if (items.length === 0) return json({ error: "Pedido sem itens" }, 400);

    // O frete vai como item: shipments.cost não é aceito no Checkout Pro.
    const shippingPrice = Number(order.shipping_price ?? 0);
    if (shippingPrice > 0) {
      items.push({
        id: "shipping",
        title: order.me_service_name ? `Frete – ${order.me_service_name}` : "Frete",
        quantity: 1,
        unit_price: shippingPrice,
        currency_id: "BRL",
        category_id: "others",
      });
    }

    // Confere o total do pedido contra a soma real dos itens.
    const computedTotal = Number(
      items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2),
    );
    if (Math.abs(computedTotal - Number(order.total ?? 0)) > 0.01) {
      await supabaseAdmin
        .from("orders")
        .update({
          total: computedTotal,
          subtotal: Number((computedTotal - shippingPrice).toFixed(2)),
        })
        .eq("id", order.id);
    }

    const hasEbookOnly = (order.order_items ?? []).every(
      (item: Record<string, any>) => item.product_type === "ebook",
    );

    const expirationHours =
      allowTicket && !hasEbookOnly ? EXPIRATION_HOURS_WITH_TICKET : EXPIRATION_HOURS_WITHOUT_TICKET;
    const expiresAt = new Date(Date.now() + expirationHours * 3600 * 1000);

    // external_reference aceita apenas [A-Za-z0-9_-]; o short_id tem '#'.
    const externalReference = String(order.id);

    const preferenceBody: Record<string, any> = {
      items,
      external_reference: externalReference,
      metadata: { order_id: order.id, short_id: order.short_id },
      payer: {
        name: payerProfile?.full_name || "",
        email: payerProfile?.email || "",
      },
      payment_methods: {
        // E-book é entrega imediata: boleto atrasaria demais.
        excluded_payment_types: hasEbookOnly || !allowTicket ? [{ id: "ticket" }] : [],
        installments: 12,
      },
      back_urls: {
        success: `${site_url}/checkout/confirmacao?order_id=${order.id}`,
        failure: `${site_url}/checkout/erro?order_id=${order.id}`,
        pending: `${site_url}/checkout/pendente?order_id=${order.id}`,
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
      statement_descriptor: "GOLEIROVITOR",
      expires: true,
      expiration_date_to: expiresAt.toISOString(),
    };

    if (payerProfile?.phone) {
      preferenceBody.payer.phone = { number: payerProfile.phone };
    }
    if (payerProfile?.document) {
      preferenceBody.payer.identification = {
        type: "CPF",
        number: payerProfile.document.replace(/\D/g, ""),
      };
    }

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.access_token}`,
      },
      body: JSON.stringify(preferenceBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP Error:", JSON.stringify(mpData));
      return json({ error: "Erro ao criar preferência no MP", details: mpData }, 500);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        mp_preference_id: mpData.id,
        mp_external_reference: externalReference,
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", order.id);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      type: "payment_link_created",
      actor: isAdmin && order.user_id !== user.id ? "admin" : "system",
      actor_id: user.id,
      payload: {
        preference_id: mpData.id,
        total: computedTotal,
        expires_at: expiresAt.toISOString(),
        environment,
      },
    });

    // sandbox_init_point está documentado como "não utilize": o ambiente é
    // definido pela credencial usada.
    return json({
      preference_id: mpData.id,
      init_point: mpData.init_point,
      checkout_url: mpData.init_point,
      expires_at: expiresAt.toISOString(),
      total: computedTotal,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Erro interno", message: String(err) }, 500);
  }
});
