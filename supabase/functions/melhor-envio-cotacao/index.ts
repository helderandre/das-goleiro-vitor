import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MELHOR_ENVIO_API = Deno.env.get("MELHOR_ENVIO_API_URL") || "https://sandbox.melhorenvio.com.br";
const CLIENT_ID = Deno.env.get("CLIENT_ID_ME") || "";
const CLIENT_SECRET = Deno.env.get("SECRET_ME") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface CotacaoRequest {
  cep_origem: string;
  cep_destino: string;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valor_seguro?: number;
  aviso_recebimento?: boolean;
  mao_propria?: boolean;
  servicos?: string;
  todas_transportadoras?: boolean; // se true, retorna TODAS (default: true)
  filtro_transportadora?: string;  // ex: "correios", "jadlog", ou vazio para todas
}

async function getValidToken(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: tokenRow, error } = await supabase.from("melhor_envio_tokens").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).single();
  if (error || !tokenRow) { const fb = Deno.env.get("MELHOR_ENVIO_TOKEN") || ""; if (fb) return fb; throw new Error("Nenhum token encontrado."); }
  const dl = (new Date(tokenRow.expires_at).getTime() - Date.now()) / 86400000;
  if (dl > 2) return tokenRow.access_token;
  if (!CLIENT_ID || !CLIENT_SECRET) return tokenRow.access_token;
  try {
    const r = await fetch(`${MELHOR_ENVIO_API}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: tokenRow.refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }) });
    if (!r.ok) return tokenRow.access_token;
    const n = await r.json(); const ne = new Date(); ne.setSeconds(ne.getSeconds() + (n.expires_in || 2592000));
    await supabase.from("melhor_envio_tokens").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", tokenRow.id);
    await supabase.from("melhor_envio_tokens").insert({ app_name: "goleiro-victor", access_token: n.access_token, refresh_token: n.refresh_token, expires_at: ne.toISOString(), refreshed_at: new Date().toISOString(), is_active: true });
    return n.access_token;
  } catch { return tokenRow.access_token; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "GET") {
      let tokenStatus = "desconhecido";
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data } = await sb.from("melhor_envio_tokens").select("expires_at, refreshed_at").eq("is_active", true).limit(1).single();
        if (data) { const dl = ((new Date(data.expires_at).getTime() - Date.now()) / 86400000).toFixed(1); tokenStatus = `ativo (expira em ${dl} dias)`; }
      } catch {}
      return new Response(JSON.stringify({
        status: "ok", service: "Melhor Envio - Cotacao v3 (Todas Transportadoras)",
        token_status: tokenStatus,
        servicos: { "1": "Correios PAC", "2": "Correios SEDEX", "3": "Jadlog .Package", "4": "Jadlog .Com", "17": "Correios Mini Envios" },
        parametros_opcionais: { filtro_transportadora: "correios | jadlog | (vazio = todas)" },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Use GET ou POST" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body: CotacaoRequest = await req.json();
    const required = ["cep_origem", "cep_destino", "peso", "altura", "largura", "comprimento"];
    const missing = required.filter(f => body[f as keyof CotacaoRequest] === undefined || body[f as keyof CotacaoRequest] === null);
    if (missing.length) return new Response(JSON.stringify({ error: "Campos faltando", campos: missing }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const token = await getValidToken();

    const payload: Record<string, unknown> = {
      from: { postal_code: body.cep_origem.replace(/\D/g, "") },
      to: { postal_code: body.cep_destino.replace(/\D/g, "") },
      volumes: [{ height: body.altura, width: body.largura, length: body.comprimento, weight: body.peso }],
      options: { insurance_value: body.valor_seguro || 0, receipt: body.aviso_recebimento || false, own_hand: body.mao_propria || false },
    };
    if (body.servicos) payload.services = body.servicos;

    const meResponse = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}`, "User-Agent": "GoleiroVictor (helder@helderandre.com)" },
      body: JSON.stringify(payload),
    });

    const meData = await meResponse.json();
    if (!meResponse.ok) return new Response(JSON.stringify({ error: "Erro na API do Melhor Envio", detalhes: meData }), { status: meResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Filtrar por transportadora se solicitado, senao retorna TODAS
    let resultados = Array.isArray(meData) ? meData : [];

    const filtro = (body.filtro_transportadora || "").toLowerCase().trim();
    if (filtro) {
      resultados = resultados.filter((item: Record<string, unknown>) =>
        item.company && typeof item.company === "object" &&
        String((item.company as Record<string, unknown>).name || "").toLowerCase().includes(filtro)
      );
    }

    // Formatar resposta
    const cotacoes = resultados.map((item: Record<string, unknown>) => ({
      id: item.id,
      servico: item.name,
      transportadora: item.company ? (item.company as Record<string, unknown>).name : "Desconhecida",
      transportadora_logo: item.company ? (item.company as Record<string, unknown>).picture : null,
      preco: item.custom_price || item.price,
      preco_original: item.price,
      prazo_dias: item.custom_delivery_time || item.delivery_time,
      prazo_original: item.delivery_time,
      prazo_range: item.delivery_range,
      desconto: item.discount,
      pacotes: item.packages,
      erro: item.error,
    }));

    return new Response(JSON.stringify({
      status: "ok",
      origem: body.cep_origem,
      destino: body.cep_destino,
      total_servicos: cotacoes.length,
      cotacoes: cotacoes,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: "Erro interno", detalhes: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
