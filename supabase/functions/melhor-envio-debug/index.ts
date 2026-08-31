import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Teste do fluxo COMPLETO: cart -> checkout -> generate -> print
 * Usa Jadlog (service 3) que funciona no sandbox
 */

const MELHOR_ENVIO_API = Deno.env.get("MELHOR_ENVIO_API_URL") || "https://sandbox.melhorenvio.com.br";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: tokenRow } = await supabase.from("melhor_envio_tokens").select("access_token").eq("is_active", true).limit(1).single();
  if (!tokenRow) return new Response(JSON.stringify({ error: "sem token" }));
  const token = tokenRow.access_token;
  const h = { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}`, "User-Agent": "GoleiroVictor (helder@helderandre.com)" };

  const steps: Record<string, unknown> = {};

  // STEP 1: Inserir no carrinho (Jadlog service 3)
  const cartPayload = {
    service: 3,
    from: { name: "Vitor Barreto de Souza", phone: "12991111845", email: "helder@helderandre.com", document: "10082952485", address: "Rua Bartolomeu Fernandes Faria", complement: "Apto 121", number: "183", district: "Centro", city: "Jacarei", state_abbr: "SP", country_id: "BR", postal_code: "12308200" },
    to: { name: "Thaylane Teste", phone: "12996655000", email: "hahelderandre@gmail.com", document: "10084241454", address: "Rua Candido Pires de Almeida", number: "150", district: "Centro", city: "Jacarei", state_abbr: "SP", country_id: "BR", postal_code: "12308250" },
    products: [{ name: "Livro Goleiro Victor", quantity: 1, unitary_value: 104.5, weight: 0.6, width: 12, height: 4, length: 17 }],
    volumes: [{ height: 4, width: 12, length: 17, weight: 0.6 }],
    options: { insurance_value: 104.5, non_commercial: true, platform: "GoleiroVictor", tags: [{ tag: "teste-fluxo-completo" }] },
  };

  const r1 = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/cart`, { method: "POST", headers: h, body: JSON.stringify(cartPayload) });
  const r1b = await r1.json();
  steps["1_cart"] = { status: r1.status, ok: r1.ok, id: r1b.id, protocol: r1b.protocol, error: r1b.error };

  if (!r1.ok) {
    return new Response(JSON.stringify({ steps, erro: "Falhou no passo 1" }, null, 2), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  const cartId = r1b.id;

  // STEP 2: Checkout (pagar)
  const r2 = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/checkout`, { method: "POST", headers: h, body: JSON.stringify({ orders: [cartId] }) });
  const r2b = await r2.json();
  steps["2_checkout"] = { status: r2.status, ok: r2.ok, data: r2b };

  if (!r2.ok) {
    // Limpar carrinho se checkout falhou
    await fetch(`${MELHOR_ENVIO_API}/api/v2/me/cart/${cartId}`, { method: "DELETE", headers: h });
    return new Response(JSON.stringify({ steps, erro: "Falhou no passo 2" }, null, 2), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }

  // STEP 3: Gerar etiqueta
  const r3 = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/generate`, { method: "POST", headers: h, body: JSON.stringify({ orders: [cartId] }) });
  const r3b = await r3.json();
  steps["3_generate"] = { status: r3.status, ok: r3.ok, data: r3b };

  // STEP 4: Imprimir etiqueta
  // Aguardar um pouco para geração processar
  await new Promise(resolve => setTimeout(resolve, 2000));
  const r4 = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/print`, { method: "POST", headers: h, body: JSON.stringify({ orders: [cartId] }) });
  const r4b = await r4.json();
  steps["4_print"] = { status: r4.status, ok: r4.ok, data: r4b };

  // STEP 5: Rastreio
  const r5 = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/tracking`, { method: "POST", headers: h, body: JSON.stringify({ orders: [cartId] }) });
  const r5b = await r5.json();
  steps["5_tracking"] = { status: r5.status, ok: r5.ok, data: r5b };

  // Salvar no pedido de teste
  const { data: testOrder } = await supabase.from("orders").select("id").eq("status", "paid").limit(1).single();
  if (testOrder) {
    await supabase.from("orders").update({
      me_cart_id: cartId,
      me_service_id: 3,
      me_service_name: "Jadlog .Package",
      shipping_status: r4.ok ? "printed" : (r3.ok ? "generated" : (r2.ok ? "paid" : "cart")),
      label_url: r4b?.url || null,
      tracking_code: r5b?.[cartId]?.tracking || null,
    }).eq("id", testOrder.id);
    steps["pedido_atualizado"] = testOrder.id;
  }

  return new Response(JSON.stringify({ sucesso: "Fluxo completo executado!", cart_id: cartId, steps }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
