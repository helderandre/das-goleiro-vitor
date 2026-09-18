/** Rótulos e formatação de eventos da Agenda (fuso de São Paulo). */

export const TZ = "America/Sao_Paulo"

export const EVENT_TYPES = [
  { value: "palestra", label: "Palestra" },
  { value: "culto", label: "Culto" },
  { value: "missao", label: "Missão" },
  { value: "clinica", label: "Clínica" },
] as const

export const EVENT_STATUSES = [
  { value: "a confirmar", label: "A confirmar" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em andamento", label: "Em andamento" },
  { value: "encerrado", label: "Encerrado" },
] as const

export const eventTypeLabel = (v: string | null) =>
  EVENT_TYPES.find((t) => t.value === v)?.label ?? v ?? "Evento"

export const eventStatusLabel = (v: string | null) =>
  EVENT_STATUSES.find((t) => t.value === v)?.label ?? v ?? ""

/** "2026-09-24" no fuso de São Paulo. */
export function spDay(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ })
}

export function spTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
}

/** Diferença em dias de calendário (São Paulo) entre hoje e a data. */
export function daysUntil(date: Date, now: Date) {
  const a = Date.parse(spDay(now))
  const b = Date.parse(spDay(date))
  return Math.round((b - a) / 86_400_000)
}

export function relativeDays(days: number) {
  if (days === 0) return "hoje"
  if (days === 1) return "amanhã"
  if (days > 1) return `em ${days} dias`
  if (days === -1) return "ontem"
  return `há ${-days} dias`
}

/** "qui, 24 de setembro" */
export function longDay(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short", day: "numeric", month: "long" }).replace(".", "")
}

export function cityState(city: string | null, state: string | null) {
  return [city?.trim(), state?.trim()].filter(Boolean).join("/")
}
