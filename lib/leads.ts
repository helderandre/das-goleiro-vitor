import type { Json } from "@/lib/supabase/database.types"

/** Detalhes que o formulário de convite do site grava em leads.event_details. */
export interface InviteDetails {
  locationType?: string
  duration?: string
  city?: string
  state?: string
  schedule?: Array<{ date: string; time: string }>
}

export const LEAD_STATUSES = [
  { value: "new", label: "Novo" },
  { value: "read", label: "Lido" },
  { value: "answered", label: "Respondido" },
  { value: "archived", label: "Arquivado" },
] as const

export function inviteDetails(json: Json | null): InviteDetails | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null
  return json as InviteDetails
}

/** "2026-10-15" ou "15/10/2026" → "2026-10-15"; senão null. */
export function parseInviteDate(date: string): string | null {
  const iso = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`
  return null
}

/** "19:30", "19h30", "19h" → "19:30"; senão null. */
export function parseInviteTime(time: string): string | null {
  const m = time.match(/(\d{1,2})\s*[:h]\s*(\d{2})?/i)
  if (!m) return null
  return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`
}

/** "15/10 · 19:30" para exibir, caindo no texto original se não reconhecer. */
export function scheduleLabel(s: { date: string; time: string }) {
  const d = parseInviteDate(s.date)
  const t = parseInviteTime(s.time)
  const day = d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : s.date
  return [day, t ?? s.time].filter(Boolean).join(" · ")
}
