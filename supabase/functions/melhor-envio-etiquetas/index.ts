import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MELHOR_ENVIO_API = Deno.env.get("MELHOR_ENVIO_API_URL") || "https://sandbox.melhorenvio.com.br";
const CLIENT_ID = Deno.env.get("CLIENT_ID_ME") || "";
const CLIENT_SECRET = Deno.env.get("SECRET_ME") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const USER_AGENT = Deno.env.get("ME_USER_AGENT") || "GoleiroVictor (helder@helderandre.com)";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type Supa = any;

async function getValidToken(supabase: Supa): Promise<string> {
  const { data: t } = await supabase
    .from("melhor_envio_tokens")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!t) throw new Error("Nenhum token ativo do Melhor Envio.");

  const daysLeft = (new Date(t.expires_at).getTime() - Date.now()) / 86400000;
  if (daysLeft > 2) return t.access_token;
  if (!CLIENT_ID || !CLIENT_SECRET) return t.access_token;

  const r = await fetch(`${MELHOR_ENVIO_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: t.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!r.ok) return t.access_token;

  const n = await r.json();
  const expiresAt = new Date(Date.now() + (n.expires_in || 2592000) * 1000);
  await supabase.from("melhor_envio_tokens").update({ is_active: false }).eq("id", t.id);
  await supabase.from("melhor_envio_tokens").insert({
    app_name: "goleiro-victor",
    access_token: n.access_token,
    refresh_token: n.refresh_token,
    expires_at: expiresAt.toISOString(),
    refreshed_at: new Date().toISOString(),
    is_active: true,
  });
  return n.access_token;
}

async function meRequest(token: string, path: string, method: string, body?: unknown) {
  console.log(`[ME] ${method} ${path}`);
  const r = await fetch(`${MELHOR_ENVIO_API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": USER_AGENT,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const txt = await r.text();
  console.log(`[ME RESP ${r.status}]`, txt.slice(0, 2000));
  let d;
  try {
    d = JSON.parse(txt);
  } catch {
    d = { raw: txt };
  }
  return { ok: r.ok, status: r.status, data: d };
}

async function logEvent(
  supabase: Supa,
  orderId: string,
  type: string,
  payload: Record<string, unknown>,
  toStatus?: string,
) {
  await supabase.from("order_events").insert({
    order_id: orderId,
    type,
    to_status: toStatus ?? null,
    actor: "admin",
    payload,
  });
}

/** Espera a etiqueta ficar gerada — a geração no ME é assíncrona. */
async function waitForGeneration(token: string, meOrderId: string, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
    const t = await meRequest(token, "/api/v2/me/shipment/tracking", "POST", { orders: [meOrderId] });
    const info = t.ok ? t.data?.[meOrderId] : null;
    if (info?.generated_at) return true;
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const token = await getValidToken(supabase);

    // ---- GET: status e saldo ----
    if (req.method === "GET") {
      if (action === "balance") {
        const balance = await meRequest(token, "/api/v2/me/balance", "GET");
        return jsonResponse({ status: "ok", saldo: balance.data });
      }

      if (action === "status") {
        const orderId = url.searchParams.get("order_id");
        if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);

        const { data: order } = await supabase
          .from("orders")
          .select(
            "id, short_id, status, shipping_status, me_cart_id, me_service_id, me_service_name, shipping_price, tracking_code, label_url, shipped_at, delivered_at",
          )
          .eq("id", orderId)
          .single();
        if (!order) return jsonResponse({ error: "Pedido nao encontrado" }, 404);

        let rastreio = null;
        if (order.me_cart_id) {
          const t = await meRequest(token, "/api/v2/me/shipment/tracking", "POST", {
            orders: [order.me_cart_id],
          });
          if (t.ok) rastreio = t.data;
        }
        return jsonResponse({ order, rastreio });
      }

      return jsonResponse({
        status: "ok",
        service: "Melhor Envio - Etiquetas v5",
        actions: ["add_to_cart", "checkout", "generate", "print", "tracking", "cancel", "status", "balance"],
      });
    }

    if (req.method !== "POST") return jsonResponse({ error: "Metodo nao permitido" }, 405);

    const body = await req.json();
    const orderId = body.order_id;
    if (!orderId) return jsonResponse({ error: "order_id obrigatorio" }, 400);

    // ---- ADD TO CART ----
    if (action === "add_to_cart") {
      const { data: order } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .single();
      if (!order) return jsonResponse({ error: "Pedido nao encontrado" }, 404);
      if (order.me_cart_id) {
        return jsonResponse({ error: "Pedido ja no carrinho ME", me_cart_id: order.me_cart_id }, 409);
      }

      // Pré-condições
      if (order.status !== "paid") {
        return jsonResponse({ error: `Pedido precisa estar pago (está: ${order.status})` }, 400);
      }
      if (order.needs_attention) {
        return jsonResponse({ error: `Pedido sinalizado: ${order.attention_reason ?? "verificar"}` }, 400);
      }

      const physical = (order.order_items ?? []).filter(
        (item: Record<string, unknown>) => item.product_type !== "ebook",
      );
      if (physical.length === 0) return jsonResponse({ error: "Pedido sem itens fisicos" }, 400);

      // Remetente: sempre do banco.
      const { data: sender } = await supabase
        .from("sender_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sender) {
        return jsonResponse({ error: "Cadastre um endereco de remetente (sender_addresses)" }, 400);
      }

      // Destinatário: endereço do pedido + perfil do cliente.
      const address = order.shipping_address as Record<string, string> | null;
      if (!address?.zip_code) return jsonResponse({ error: "Pedido sem endereco de entrega" }, 400);

      const { data: profile } = order.user_id
        ? await supabase
            .from("profiles")
            .select("full_name, email, phone, document")
            .eq("id", order.user_id)
            .single()
        : { data: null };

      const missing: string[] = [];
      if (!profile?.full_name) missing.push("nome");
      if (!profile?.document) missing.push("CPF");
      if (!profile?.phone) missing.push("telefone");
      if (missing.length > 0) {
        return jsonResponse(
          { error: `Faltam dados do destinatario: ${missing.join(", ")}`, campos: missing },
          400,
        );
      }

      // Produtos declarados: itens reais do pedido (a DC-e é emitida com eles).
      const produtos = physical.map((item: Record<string, any>) => ({
        name: item.product_title,
        quantity: item.quantity,
        unitary_value: Number(item.unit_price),
      }));
      const insuranceValue = Number(
        produtos.reduce((sum, p) => sum + p.unitary_value * p.quantity, 0).toFixed(2),
      );

      // Volumes: dimensões dos produtos, com padrão de livro.
      const productIds = physical.map((item: Record<string, any>) => item.product_id).filter(Boolean);
      const { data: productRows } = productIds.length
        ? await supabase.from("products").select("id, weight, height, width, length").in("id", productIds)
        : { data: [] };

      const dimensions = new Map(
        (productRows ?? []).map((p: Record<string, any>) => [p.id, p]),
      );

      let weight = 0;
      let height = 4;
      let width = 12;
      let length = 17;
      for (const item of physical as Record<string, any>[]) {
        const dim = dimensions.get(item.product_id) as Record<string, number> | undefined;
        weight += Number(dim?.weight ?? 0.3) * item.quantity;
        height = Math.max(height, Number(dim?.height ?? 4));
        width = Math.max(width, Number(dim?.width ?? 12));
        length = Math.max(length, Number(dim?.length ?? 17));
      }

      const volumes = body.volumes ?? [
        {
          height: Math.round(height),
          width: Math.round(width),
          length: Math.round(length),
          weight: Number(weight.toFixed(3)),
        },
      ];

      const serviceId = order.me_service_id || body.service_id;
      if (!serviceId) {
        return jsonResponse({ error: "Cote o frete e escolha um servico antes de gerar a etiqueta" }, 400);
      }

      // Saldo: sem carteira suficiente o checkout falha depois.
      const balance = await meRequest(token, "/api/v2/me/balance", "GET");
      const available = Number(balance.data?.balance ?? 0);
      const expected = Number(order.shipping_price ?? 0);
      if (balance.ok && expected > 0 && available < expected) {
        return jsonResponse(
          {
            error: `Saldo insuficiente na Melhor Carteira: R$ ${available.toFixed(2)} disponivel, etiqueta custa cerca de R$ ${expected.toFixed(2)}`,
            saldo: balance.data,
          },
          402,
        );
      }

      const cartPayload = {
        service: serviceId,
        from: {
          name: sender.name,
          phone: sender.phone,
          email: sender.email,
          document: sender.document,
          company_document: "",
          state_register: "", // envio nao comercial (conta CPF): DC-e, sem NF-e
          address: sender.street,
          complement: sender.complement ?? "",
          number: String(sender.number),
          district: sender.neighborhood,
          city: sender.city,
          state_abbr: sender.state,
          country_id: "BR",
          postal_code: String(sender.zip_code).replace(/\D/g, ""),
          note: "",
        },
        to: {
          name: profile!.full_name,
          phone: profile!.phone,
          email: profile!.email,
          document: String(profile!.document).replace(/\D/g, ""),
          company_document: "",
          state_register: "",
          address: address.street,
          complement: address.complement ?? "",
          number: String(address.number),
          district: address.neighborhood,
          city: address.city,
          state_abbr: address.state,
          country_id: "BR",
          postal_code: String(address.zip_code).replace(/\D/g, ""),
          note: "",
        },
        products: produtos,
        volumes,
        options: {
          insurance_value: insuranceValue,
          receipt: body.aviso_recebimento ?? false,
          own_hand: body.mao_propria ?? false,
          collect: false,
          reverse: false,
          non_commercial: true,
          platform: "GoleiroVictor",
          tags: [{ tag: String(order.short_id || order.id), url: null }],
        },
      };

      const meRes = await meRequest(token, "/api/v2/me/cart", "POST", cartPayload);
      if (!meRes.ok) {
        return jsonResponse(
          { error: "Erro ao inserir no carrinho do ME", detalhes: meRes.data, service_usado: serviceId },
          meRes.status || 422,
        );
      }

      const meCartId = meRes.data.id;
      await supabase
        .from("orders")
        .update({
          me_cart_id: meCartId,
          me_service_id: serviceId,
          me_service_name: order.me_service_name || meRes.data?.service?.name || null,
          shipping_price: Number(meRes.data?.price ?? order.shipping_price ?? 0),
          shipping_status: "cart",
        })
        .eq("id", orderId);

      await logEvent(supabase, orderId, "label_cart_added", {
        me_cart_id: meCartId,
        service_id: serviceId,
        price: meRes.data?.price,
        protocol: meRes.data?.protocol,
      });

      return jsonResponse({
        status: "ok",
        mensagem: "Envio adicionado ao carrinho",
        me_cart_id: meCartId,
        service_usado: serviceId,
        dados_me: meRes.data,
      });
    }

    // ---- CHECKOUT (paga a etiqueta com saldo da carteira) ----
    if (action === "checkout") {
      const { data: order } = await supabase
        .from("orders")
        .select("me_cart_id, shipping_status")
        .eq("id", orderId)
        .single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);

      const meRes = await meRequest(token, "/api/v2/me/shipment/checkout", "POST", {
        orders: [order.me_cart_id],
      });

      // 422 "já paga" é sucesso para efeito de idempotência.
      const alreadyPaid =
        meRes.status === 422 && JSON.stringify(meRes.data).includes("já foram pagas");

      if (!meRes.ok && !alreadyPaid) {
        return jsonResponse({ error: "Erro no checkout da etiqueta", detalhes: meRes.data }, meRes.status);
      }

      // Pagar a etiqueta NÃO significa que o pedido foi enviado: o pedido só
      // vira "shipped" quando a transportadora registra a postagem.
      await supabase.from("orders").update({ shipping_status: "paid" }).eq("id", orderId);

      await logEvent(supabase, orderId, "label_paid", {
        me_cart_id: order.me_cart_id,
        already_paid: alreadyPaid,
      });

      return jsonResponse({
        status: "ok",
        mensagem: alreadyPaid ? "Etiqueta ja estava paga" : "Etiqueta paga",
        dados_me: meRes.data,
      });
    }

    // ---- GENERATE ----
    if (action === "generate") {
      const { data: order } = await supabase
        .from("orders")
        .select("me_cart_id")
        .eq("id", orderId)
        .single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);

      const meRes = await meRequest(token, "/api/v2/me/shipment/generate", "POST", {
        orders: [order.me_cart_id],
      });
      if (!meRes.ok) {
        return jsonResponse({ error: "Erro ao gerar etiqueta", detalhes: meRes.data }, meRes.status);
      }

      await supabase.from("orders").update({ shipping_status: "generated" }).eq("id", orderId);
      await logEvent(supabase, orderId, "label_generated", { me_cart_id: order.me_cart_id });

      return jsonResponse({ status: "ok", mensagem: "Etiqueta gerada", dados_me: meRes.data });
    }

    // ---- PRINT ----
    if (action === "print") {
      const { data: order } = await supabase
        .from("orders")
        .select("me_cart_id, shipping_status")
        .eq("id", orderId)
        .single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);

      let meRes = await meRequest(token, "/api/v2/me/shipment/print", "POST", {
        mode: "public",
        orders: [order.me_cart_id],
      });

      // A geração é assíncrona: se a etiqueta ainda não ficou pronta, espera e repete.
      if (!meRes.ok || !meRes.data?.url) {
        await waitForGeneration(token, order.me_cart_id);
        meRes = await meRequest(token, "/api/v2/me/shipment/print", "POST", {
          mode: "public",
          orders: [order.me_cart_id],
        });
      }

      if (!meRes.ok || !meRes.data?.url) {
        return jsonResponse({ error: "Erro ao imprimir etiqueta", detalhes: meRes.data }, meRes.status || 422);
      }

      const labelUrl = meRes.data.url;
      await supabase
        .from("orders")
        .update({ shipping_status: "printed", label_url: labelUrl })
        .eq("id", orderId);
      await logEvent(supabase, orderId, "label_printed", { label_url: labelUrl });

      return jsonResponse({ status: "ok", label_url: labelUrl, dados_me: meRes.data });
    }

    // ---- CANCEL ----
    if (action === "cancel") {
      const { data: order } = await supabase
        .from("orders")
        .select("me_cart_id, shipping_status")
        .eq("id", orderId)
        .single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);

      const check = await meRequest(token, "/api/v2/me/shipment/cancellable", "POST", {
        orders: [order.me_cart_id],
      });
      const cancellable = check.ok ? check.data?.[order.me_cart_id]?.cancellable : false;

      if (!cancellable) {
        return jsonResponse(
          {
            error: "Etiqueta nao pode mais ser cancelada (transportadora ja notificada ou envio postado)",
            detalhes: check.data,
          },
          409,
        );
      }

      const meRes = await meRequest(token, "/api/v2/me/shipment/cancel", "POST", {
        order: {
          id: order.me_cart_id,
          reason_id: "2",
          description: body.motivo || "Cancelamento solicitado pelo lojista",
        },
      });
      if (!meRes.ok) {
        return jsonResponse({ error: "Erro ao cancelar etiqueta", detalhes: meRes.data }, meRes.status);
      }

      await supabase
        .from("orders")
        .update({
          shipping_status: "cancelled",
          me_cart_id: null,
          label_url: null,
          needs_attention: true,
          attention_reason: "Etiqueta cancelada — estorno cai na Melhor Carteira em até 12h",
        })
        .eq("id", orderId);

      await logEvent(supabase, orderId, "label_cancelled", {
        me_cart_id: order.me_cart_id,
        motivo: body.motivo ?? null,
        // O valor volta para a carteira da loja, não para o cliente.
        estorno: "melhor_carteira",
      });

      return jsonResponse({
        status: "ok",
        mensagem: "Etiqueta cancelada. O valor volta para a Melhor Carteira em ate 12h.",
        dados_me: meRes.data,
      });
    }

    // ---- TRACKING ----
    if (action === "tracking") {
      const { data: order } = await supabase
        .from("orders")
        .select("me_cart_id, tracking_code, status, shipping_status")
        .eq("id", orderId)
        .single();
      if (!order?.me_cart_id) return jsonResponse({ error: "Sem me_cart_id" }, 400);

      const meRes = await meRequest(token, "/api/v2/me/shipment/tracking", "POST", {
        orders: [order.me_cart_id],
      });
      if (!meRes.ok) {
        return jsonResponse({ error: "Erro ao consultar rastreio", detalhes: meRes.data }, meRes.status);
      }

      const info = meRes.data?.[order.me_cart_id];
      const update: Record<string, unknown> = {};

      // Código da transportadora pode demorar até 1 dia útil; o do ME serve antes.
      const code = info?.tracking || info?.melhorenvio_tracking || null;
      if (code && code !== order.tracking_code) update.tracking_code = code;

      const meStatus = String(info?.status ?? "");
      if (meStatus === "delivered") {
        update.shipping_status = "delivered";
        update.delivered_at = info?.delivered_at ?? new Date().toISOString();
        if (order.status !== "delivered") update.status = "delivered";
      } else if (meStatus === "posted" || meStatus === "in_transit") {
        update.shipping_status = "posted";
        if (!order.shipped_at) update.shipped_at = info?.posted_at ?? new Date().toISOString();
        if (order.status === "paid") update.status = "shipped";
      } else if (meStatus === "canceled" || meStatus === "cancelled") {
        update.shipping_status = "cancelled";
      }

      if (Object.keys(update).length > 0) {
        await supabase.from("orders").update(update).eq("id", orderId);
        await logEvent(supabase, orderId, "tracking_updated", {
          me_status: meStatus,
          tracking: code,
        }, update.status as string | undefined);
      }

      return jsonResponse({ status: "ok", tracking_code: code, rastreio: meRes.data });
    }

    return jsonResponse({ error: "action invalida" }, 400);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[etiquetas]", msg);
    return jsonResponse({ error: "Erro interno", detalhes: msg }, 500);
  }
});
