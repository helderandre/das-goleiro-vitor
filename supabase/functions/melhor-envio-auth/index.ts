import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("CLIENT_ID_ME") || "";
const CLIENT_SECRET = Deno.env.get("SECRET_ME") || "";
const BASE_URL = Deno.env.get("MELHOR_ENVIO_API_URL") || "https://sandbox.melhorenvio.com.br";
const FUNCTION_URL = "https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/melhor-envio-auth";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const SCOPES = [
  "shipping-calculate", "shipping-cancel", "shipping-checkout", "shipping-companies",
  "shipping-generate", "shipping-preview", "shipping-print", "shipping-share",
  "shipping-tracking", "cart-read", "cart-write", "orders-read",
  "users-read", "users-write",
  "companies-read", "companies-write",
  "webhooks-read", "webhooks-write",
  "ecommerce-shipping",
].join(" ");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function saveToken(accessToken: string, refreshToken: string, expiresIn: number) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  await supabase.from("melhor_envio_tokens").update({ is_active: false, updated_at: new Date().toISOString() }).eq("is_active", true);
  const expiresAt = new Date(); expiresAt.setSeconds(expiresAt.getSeconds() + (expiresIn || 2592000));
  const { error } = await supabase.from("melhor_envio_tokens").insert({ app_name: "goleiro-victor", access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt.toISOString(), is_active: true });
  if (error) { console.error("Erro ao salvar token:", error.message); return false; }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) return new Response(JSON.stringify({ error: "Secrets nao configurados" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // POST: Renovar token
    if (req.method === "POST") {
      const body = await req.json();
      if (!body.refresh_token) return new Response(JSON.stringify({ error: "refresh_token obrigatorio" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const res = await fetch(`${BASE_URL}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "refresh_token", refresh_token: body.refresh_token, client_id: CLIENT_ID, client_secret: CLIENT_SECRET }) });
      const data = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ error: "Erro ao renovar", detalhes: data }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const saved = await saveToken(data.access_token, data.refresh_token, data.expires_in);
      return new Response(JSON.stringify({ status: "token_renovado", salvo: saved }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // GET com ?code= : Callback
    const code = url.searchParams.get("code");
    if (code) {
      const res = await fetch(`${BASE_URL}/oauth/token`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ grant_type: "authorization_code", client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: FUNCTION_URL, code }) });
      const data = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ error: "Erro ao trocar code", detalhes: data }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const saved = await saveToken(data.access_token, data.refresh_token, data.expires_in);
      const expiresAt = new Date(); expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 2592000));
      const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>ME Auth OK</title><style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#0f172a;color:#e2e8f0}h1{color:#22c55e}.ok{background:#052e16;border:1px solid #22c55e;padding:16px;border-radius:8px;margin:16px 0;color:#86efac}.box{background:#1e293b;padding:12px;border-radius:8px;margin:8px 0;font-family:monospace;font-size:13px;border:1px solid #334155}.info{background:#1e293b;padding:16px;border-radius:8px;margin-top:20px}.info li{margin:8px 0}</style></head><body><h1>Autorizacao concluida!</h1><div class="ok"><strong>${saved ? "Token salvo no banco automaticamente!" : "Erro ao salvar - copie manualmente"}</strong></div><div class="box">Expira: ${expiresAt.toLocaleDateString("pt-BR")} (30 dias)</div><div class="box">Scopes: ${SCOPES}</div><div class="info"><strong>Proximo passo:</strong><ol><li>Cadastre uma <strong>LOJA</strong> no painel do sandbox: <a href="https://sandbox.melhorenvio.com.br" style="color:#60a5fa">sandbox.melhorenvio.com.br</a></li><li>Teste: <a href="https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/melhor-envio-debug" style="color:#60a5fa">melhor-envio-debug</a></li></ol></div></body></html>`;
      return new Response(html, { headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
    }

    // GET sem code: redirecionar
    const authUrl = `${BASE_URL}/oauth/authorize?` + new URLSearchParams({ client_id: CLIENT_ID, redirect_uri: FUNCTION_URL, response_type: "code", scope: SCOPES, state: crypto.randomUUID() }).toString();
    return Response.redirect(authUrl, 302);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
