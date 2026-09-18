import type { Json } from "@/lib/supabase/database.types"
import { inviteDetails, parseInviteDate } from "@/lib/leads"
import { cityState, TZ } from "@/lib/events"
import type { MobileLeadItem } from "@/components/mobile/leads/lead-list"

interface LeadRow {
  id: string
  name: string
  message: string | null
  status: string | null
  type: string | null
  created_at: string | null
  event_details: Json | null
}

export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/** "Hoje, 10:12" / "Ontem, 16:05" / "15 set". */
export function leadWhen(iso: string | null, now: Date) {
  if (!iso) return ""
  const d = new Date(iso)
  const day = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: TZ })
  const time = d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
  if (day(d) === day(now)) return `Hoje, ${time}`
  if (day(d) === day(new Date(now.getTime() - 86_400_000))) return `Ontem, ${time}`
  return d.toLocaleDateString("pt-BR", { timeZone: TZ, day: "numeric", month: "short" }).replace(".", "")
}

export function toMobileLead(l: LeadRow, now: Date): MobileLeadItem {
  const d = inviteDetails(l.event_details)
  const schedule = d?.schedule ?? []
  const parsed = schedule.map((s) => parseInviteDate(s.date)).filter(Boolean) as string[]
  const place = d
    ? [d.locationType === "online" ? "Online" : "Presencial", cityState(d.city ?? null, d.state ?? null)]
        .filter(Boolean)
        .join(" · ")
    : null
  const dates = schedule.length
    ? `${schedule.length} ${schedule.length === 1 ? "dia" : "dias"}${
        parsed.length ? ` · ${[...new Set([parsed[0], parsed[parsed.length - 1]])].map((x) => `${x.slice(8, 10)}/${x.slice(5, 7)}`).join(" a ")}` : ""
      }`
    : null

  return {
    id: l.id,
    name: l.name,
    initials: initialsOf(l.name),
    whenLabel: leadWhen(l.created_at, now),
    isInvite: l.type === "invite",
    status: l.status ?? "new",
    message: l.message,
    place,
    dates,
  }
}

