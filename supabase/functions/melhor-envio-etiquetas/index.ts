import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MELHOR_ENVIO_API = Deno.env.get("MELHOR_ENVIO_API_URL") || "https://sandbox.melhorenvio.com.br";
const CLIENT_ID = Deno.env.get("CLIENT_ID_ME") || "";
const CLIENT_SECRET = Deno.env.get("SECRET_ME") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" };

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function getValidToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: t } = await supabase.from("melhor_envio_tokens").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
  if (!t) throw new Error("Nenhum token ativo.");
  const dl = (new Date(t.expires_at).getTime() - Date.now()) / 86400000;
  if (dl > 2) return t.access_token;
  if (!CLIENT_ID || !CLIENT_SECRET) return t.access_token;
  const r = await fetch(`${MELHOR_ENVIO_API}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: t.refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }) });
  if (!r.ok) return t.access_token;
  const n = await r.json(); const ne = new Date(Date.now() + (n.expires_in || 2592000) * 1000);
  await supabase.from("melhor_envio_tokens").update({ is_active: false }).eq("id", t.id);
  await supabase.from("melhor_envio_tokens").insert({ app_name: "goleiro-victor", access_token: n.access_token, refresh_token: n.refresh_token, expires_at: ne.toISOString(), refreshed_at: new Date().toISOString(), is_active: true });
  return n.access_token;
}

async function meRequest(token: string, path: string, method: string, body?: unknown) {
  console.log(`[ME] ${method} ${path}`);
  if (body) console.log(`[ME BODY]`, JSON.stringify(body, null, 2));
  const r = await fetch(`${MELHOR_ENVIO_API}${path}`, { method, headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}`, "User-Agent": "GoleiroVictor (helder@helderandre.com)" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const txt = await r.text(); console.log(`[ME RESP ${r.status}]`, txt);
  let d; try { d = JSON.parse(txt); } catch { d = { raw: txt }; }
  return { ok: r.ok, status: r.status, data: d };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const token = await getValidToken(supabase);

    if (req.method === "GET") {
      if (action === "status") {
        const oid = url.searchParams.get("order_id");
        if (!oid) return jsonResponse({ error: "order_id obrigatorio" }, 400);
        const { data: order } = await supabase.from("orders").select("id, short_id, status, shipping_status, me_cart_id, me_service_id, me_service_name, shipping_price, tracking_code, label_url, shipped_at, delivered_at").eq("id", oid).single();
        if (!order) return jsonResponse({ error: "Pedido nao encontrado" }, 404);
        let rastreio = null;
        if (order.me_cart_id) { const t = await meRequest(token, "/api/v2/me/shipment/tracking", "POST", { orders: [order.me_cart_id] }); if (t.ok) rastreio = t.data; }
        return jsonResponse({ order, rastreio });
      }
      return jsonResponse({ status: "ok", service: "Melhor Envio - Etiquetas v4", actions: ["add_to_cart","checkout","generate","print","tracking","status"] });
    }

    if (req.method !== "POST") return jsonResponse({ error: "Metodo nao permitido" }, 405);
    const body = await req.json();
    const orderId = body.order_id;

    // ---- ADD TO CART ----
    if (action === "add_to_cart") {
      if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);
      const { data: order } = await supabase.from("orders").select("*, order_items(*)").eq("id", orderId).single();
      if (!order) return jsonResponse({ error: "Pedido nao encontrado" }, 404);
      if (order.me_cart_id) return jsonResponse({ error: "Pedido ja no carrinho ME", me_cart_id: order.me_cart_id }, 409);

      const rem = body.remetente || {};
      const dest = body.destinatario || {};
      const missing: string[] = [];
      ["nome","telefone","email","documento","endereco","numero","bairro","cidade","uf","cep"].forEach(f => {
        if (!rem[f]) missing.push(`remetente.${f}`);
        if (!dest[f]) missing.push(`destinatario.${f}`);
      });
      if (missing.length) return jsonResponse({ error: "Campos faltando", campos: missing }, 400);

      const volumes = body.volumes || [{ height: 4, width: 12, length: 17, weight: 0.3 }];
      const vol = volumes[0];
      const totalValue = body.valor_seguro || Number(order.total) || 0;

      const products = body.produtos || [{
        name: "Pedido " + (order.short_id || order.id),
        quantity: 1, unitary_value: totalValue,
        weight: vol.weight, width: vol.width, height: vol.height, length: vol.length,
      }];

      // PRIORIDADE: order.me_service_id (banco) > body.service_id (frontend) > default 3
      const serviceId = order.me_service_id || body.service_id || 3;

      const cartPayload = {
        service: serviceId,
        from: {
          name: rem.nome, phone: rem.telefone, email: rem.email, document: rem.documento,
          company_document: rem.cnpj || "", state_register: rem.ie || "",
          address: rem.endereco, complement: rem.complemento || "", number: String(rem.numero),
          district: rem.bairro, city: rem.cidade, state_abbr: rem.uf,
          country_id: "BR", postal_code: String(rem.cep).replace(/\D/g, ""), note: "",
        },
        to: {
          name: dest.nome, phone: dest.telefone, email: dest.email, document: dest.documento,
          company_document: dest.cnpj || "", state_register: dest.ie || "",
          address: dest.endereco, complement: dest.complemento || "", number: String(dest.numero),
          district: dest.bairro, city: dest.cidade, state_abbr: dest.uf,
          country_id: "BR", postal_code: String(dest.cep).replace(/\D/g, ""), note: "",
        },
        products: products,
        volumes: [{ height: vol.height, width: vol.width, length: vol.length, weight: vol.weight }],
        options: {
          insurance_value: totalValue,
          receipt: body.aviso_recebimento || false, own_hand: body.mao_propria || false,
          collect: false, non_commercial: body.non_commercial !== undefined ? body.non_commercial : true,
          platform: "GoleiroVictor",
          tags: [{ tag: String(order.short_id || order.id), url: null }],
        },
      };

      if (body.nota_fiscal) (cartPayload.options as Record<string, unknown>).invoice = body.nota_fiscal;

      const meRes = await meRequest(token, "/api/v2/me/cart", "POST", cartPayload);

      if (!meRes.ok) {
        return jsonResponse({ error: "Erro ao inserir no carrinho do ME", detalhes: meRes.data, service_usado: serviceId, payload_enviado: cartPayload }, meRes.status || 422);
      }

      const meCartId = meRes.data.id;
      await supabase.from("orders").update({
        me_cart_id: meCartId, me_service_id: serviceId,
        me_service_name: body.service_name || meRes.data?.service?.name || "Jadlog",
        shipping_price: body.shipping_price || meRes.data?.price || 0,
        shipping_status: "cart",
      }).eq("id", orderId);

      return jsonResponse({ status: "ok", mensagem: "Envio adicionado ao carrinho", me_cart_id: meCartId, service_usado: serviceId, dados_me: meRes.data });
    }

    // ---- CHECKOUT ----
    if (action === "checkout") {
      if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);
      const { data: order } = await supabase.from("orders").select("me_cart_id").eq("id", orderId).single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);
      const meRes = await meRequest(token, "/api/v2/me/shipment/checkout", "POST", { orders: [order.me_cart_id] });
      if (!meRes.ok) return jsonResponse({ error: "Erro checkout", detalhes: meRes.data }, meRes.status);
      await supabase.from("orders").update({ shipping_status: "paid", status: "shipped" }).eq("id", orderId);
      return jsonResponse({ status: "ok", mensagem: "Etiqueta paga", dados_me: meRes.data });
    }

    // ---- GENERATE ----
    if (action === "generate") {
      if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);
      const { data: order } = await supabase.from("orders").select("me_cart_id").eq("id", orderId).single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);
      const meRes = await meRequest(token, "/api/v2/me/shipment/generate", "POST", { orders: [order.me_cart_id] });
      if (!meRes.ok) return jsonResponse({ error: "Erro gerar", detalhes: meRes.data }, meRes.status);
      await supabase.from("orders").update({ shipping_status: "generated" }).eq("id", orderId);
      return jsonResponse({ status: "ok", mensagem: "Etiqueta gerada", dados_me: meRes.data });
    }

    // ---- PRINT ----
    if (action === "print") {
      if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);
      const { data: order } = await supabase.from("orders").select("me_cart_id").eq("id", orderId).single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);
      const meRes = await meRequest(token, "/api/v2/me/shipment/print", "POST", { orders: [order.me_cart_id] });
      if (!meRes.ok) return jsonResponse({ error: "Erro imprimir", detalhes: meRes.data }, meRes.status);
      const labelUrl = meRes.data?.url || null;
      await supabase.from("orders").update({ shipping_status: "printed", label_url: labelUrl }).eq("id", orderId);
      return jsonResponse({ status: "ok", label_url: labelUrl, dados_me: meRes.data });
    }

    // ---- TRACKING ----
    if (action === "tracking") {
      if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);
      const { data: order } = await supabase.from("orders").select("me_cart_id, tracking_code").eq("id", orderId).single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);
      const meRes = await meRequest(token, "/api/v2/me/shipment/tracking", "POST", { orders: [order.me_cart_id] });
      if (!meRes.ok) return jsonResponse({ error: "Erro rastreio", detalhes: meRes.data }, meRes.status);
      let tc = order.tracking_code; let ns = null;
      const td = meRes.data;
      if (td && typeof td === "object") {
        const ot = td[order.me_cart_id];
        if (ot) { tc = ot.tracking || ot.melhorenvio_tracking || tc; if (ot.status === "delivered") ns = "delivered"; else if (ot.status === "in_transit" || ot.status === "posted") ns = "in_transit"; }
      }
      const u: Record<string, unknown> = {};
      if (tc && tc !== order.tracking_code) u.tracking_code = tc;
      if (ns === "delivered") { u.shipping_status = "delivered"; u.delivered_at = new Date().toISOString(); u.status = "delivered"; }
      else if (ns === "in_transit") { u.shipping_status = "in_transit"; if (!order.tracking_code) u.shipped_at = new Date().toISOString(); }
      if (Object.keys(u).length > 0) await supabase.from("orders").update(u).eq("id", orderId);
      return jsonResponse({ status: "ok", tracking_code: tc, rastreio: td });
    }

    return jsonResponse({ error: "action invalida" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return jsonResponse({ error: "Erro interno", detalhes: msg }, 500);
  }
});
