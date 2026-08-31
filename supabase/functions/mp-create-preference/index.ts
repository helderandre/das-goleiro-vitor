import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://goleirovitor.com.br";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
    const { order_id, environment = "sandbox" } = body;
    const site_url = body.site_url || SITE_URL;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id \u00e9 obrigat\u00f3rio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creds, error: credsError } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();

    if (credsError || !creds) {
      return new Response(JSON.stringify({ 
        error: `Credenciais MP (${environment}) n\u00e3o configuradas. Insira na tabela mp_credentials.` 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, phone, document")
      .eq("id", user.id)
      .single();

    const items: any[] = (order.order_items || []).map((item: any) => ({
      id: item.id,
      title: item.product_title,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: "BRL",
      category_id: item.product_type === "ebook" ? "digital_goods" : "others",
    }));

    const shippingPrice = Number(order.shipping_price || 0);
    if (shippingPrice > 0) {
      items.push({
        id: "shipping",
        title: "Frete",
        quantity: 1,
        unit_price: shippingPrice,
        currency_id: "BRL",
        category_id: "others",
      });
    }

    const external_reference = order.short_id || order.id;

    const preferenceBody: any = {
      items,
      external_reference: String(external_reference),
      payer: {
        name: profile?.full_name || user.email?.split("@")[0] || "",
        email: profile?.email || user.email || "",
      },
      payment_methods: {
        excluded_payment_types: [],
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
    };

    if (profile?.phone) {
      preferenceBody.payer.phone = { number: profile.phone };
    }
    if (profile?.document) {
      preferenceBody.payer.identification = {
        type: "CPF",
        number: profile.document.replace(/\D/g, ""),
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
      return new Response(JSON.stringify({ error: "Erro ao criar prefer\u00eancia no MP", details: mpData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("orders")
      .update({
        mp_preference_id: mpData.id,
        mp_external_reference: String(external_reference),
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point,
        checkout_url: environment === "sandbox" ? mpData.sandbox_init_point : mpData.init_point,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro interno", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
