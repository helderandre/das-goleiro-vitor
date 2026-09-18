import {
  cityState,
  daysUntil,
  eventStatusLabel,
  eventTypeLabel,
  relativeDays,
  spDay,
  spTime,
  TZ,
} from "@/lib/events"
import type { MobileEvent } from "@/components/mobile/agenda/types"

interface EventRow {
  id: string
  title: string
  start_date: string
  end_date: string | null
  event_type: string | null
  status: string | null
  location_type: string | null
  location_name: string | null
  city: string | null
  state: string | null
  cover_url: string | null
}

function weekdayShort(date: Date) {
  return date
    .toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short" })
    .replace(".", "")
    .toUpperCase()
}

/** "Qui 24 a dom 27 · 16:30" ou "Sáb 17 · 13:00". */
function rangeLabel(start: Date, end: Date | null) {
  const wd = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short" }).replace(".", "")
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: TZ, day: "numeric" })
  const first = `${wd(start).charAt(0).toUpperCase()}${wd(start).slice(1)} ${day(start)}`
  if (end && spDay(end) !== spDay(start)) {
    const sameMonth = spDay(end).slice(0, 7) === spDay(start).slice(0, 7)
    const last = sameMonth
      ? `${wd(end)} ${day(end)}`
      : `${wd(end)} ${end.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" })}`
    return `${first} a ${last} · ${spTime(start)}`
  }
  return `${first} · ${spTime(start)}`
}

export function toMobileEvent(e: EventRow, now: Date): MobileEvent {
  const start = new Date(e.start_date)
  const end = e.end_date ? new Date(e.end_date) : null
  const past = (end ?? start) < now
  const days = daysUntil(start, now)
  const month = start.toLocaleDateString("pt-BR", { timeZone: TZ, month: "long", year: "numeric" })
  const place = e.location_type === "online"
    ? "Online"
    : [e.location_name?.trim(), cityState(e.city, e.state)].filter(Boolean).join(" · ")

  return {
    id: e.id,
    title: e.title,
    day: start.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit" }),
    weekday: weekdayShort(start),
    monthShort: start.toLocaleDateString("pt-BR", { timeZone: TZ, month: "short" }).replace(".", "").toUpperCase(),
    monthLabel: month.charAt(0).toUpperCase() + month.slice(1),
    time: spTime(start),
    rangeLabel: rangeLabel(start, end),
    place,
    typeLabel: eventTypeLabel(e.event_type),
    status: e.status ?? "confirmado",
    statusLabel: eventStatusLabel(e.status),
    past,
    ongoing: !past && start <= now,
    relative: relativeDays(days),
    coverUrl: e.cover_url,
    startMs: start.getTime(),
  }
}

export const EVENT_COLUMNS =
  "id, title, start_date, end_date, event_type, status, location_type, location_name, city, state, cover_url"
