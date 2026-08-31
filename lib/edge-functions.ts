import "server-only"
import { createClient } from "@/lib/supabase/server"

/**
 * Chama uma Supabase Edge Function com o token do admin logado.
 *
 * A integração com Mercado Pago e Melhor Envio vive nas Edge Functions
 * (ver docs/edge-functions.md); o dashboard apenas as consome.
 */
export async function callEdgeFunction<T = unknown>(
  slug: string,
  options: {
    method?: "GET" | "POST"
    query?: Record<string, string>
    body?: unknown
  } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  const { method = "POST", query, body } = options

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const url = new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${slug}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store",
    })

    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }

    if (!response.ok) {
      const record = parsed as Record<string, unknown> | null
      const message =
        (typeof record?.error === "string" && record.error) ||
        (typeof record?.message === "string" && record.message) ||
        `Erro ${response.status}`
      const details = record?.detalhes ?? record?.details
      return {
        ok: false,
        status: response.status,
        data: parsed as T,
        error: details ? `${message}: ${JSON.stringify(details)}` : message,
      }
    }

    return { ok: true, status: response.status, data: parsed as T, error: null }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : "Falha de rede ao chamar a função",
    }
  }
}
