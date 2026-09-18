export interface MobileEvent {
  id: string
  title: string
  /** "24" */
  day: string
  /** "QUI" */
  weekday: string
  /** "SET" */
  monthShort: string
  /** "Setembro de 2026" — agrupa a lista. */
  monthLabel: string
  time: string
  /** "Qui 24 a dom 27 · 16:30" */
  rangeLabel: string
  place: string
  typeLabel: string
  status: string
  statusLabel: string
  past: boolean
  ongoing: boolean
  /** "em 6 dias", "hoje", "há 12 dias" */
  relative: string
  coverUrl: string | null
  startMs: number
}
