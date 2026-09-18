"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

/** Dia no formato "2026-09-18" (fuso de São Paulo, vindo do servidor). */
export type DayKey = string

export interface Period {
  start: DayKey | null
  end: DayKey | null
  preset: PresetId | null
}

export type PresetId = "hoje" | "7d" | "mes" | "30d" | "tudo"

export const ALL_TIME: Period = { start: null, end: null, preset: "tudo" }

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"]
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

function toKey(y: number, m: number, d: number): DayKey {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function parseKey(key: DayKey) {
  const [y, m, d] = key.split("-").map(Number)
  return { y, m: m - 1, d }
}

function addDays(key: DayKey, days: number): DayKey {
  const { y, m, d } = parseKey(key)
  const date = new Date(Date.UTC(y, m, d + days))
  return toKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function labelOf(key: DayKey, withMonth = true) {
  const { m, d } = parseKey(key)
  return withMonth ? `${d} de ${MONTHS[m]}` : String(d)
}

/** "1 a 18 de setembro", "18 de setembro", "Todos os pedidos". */
export function describePeriod(period: Period) {
  if (!period.start) return "Todos os pedidos"
  if (!period.end) return "Toque no último dia do período"
  if (period.start === period.end) return labelOf(period.start)
  const a = parseKey(period.start)
  const b = parseKey(period.end)
  return a.m === b.m && a.y === b.y
    ? `${a.d} a ${labelOf(period.end)}`
    : `${labelOf(period.start)} a ${labelOf(period.end)}`
}

export function presetPeriod(id: PresetId, today: DayKey): Period {
  switch (id) {
    case "hoje":
      return { start: today, end: today, preset: id }
    case "7d":
      return { start: addDays(today, -6), end: today, preset: id }
    case "30d":
      return { start: addDays(today, -29), end: today, preset: id }
    case "mes":
      return { start: `${today.slice(0, 8)}01`, end: today, preset: id }
    case "tudo":
      return ALL_TIME
  }
}

const PRESETS: { id: PresetId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "mes", label: "Este mês" },
  { id: "30d", label: "30 dias" },
  { id: "tudo", label: "Tudo" },
]

export function PeriodSheet({
  open,
  onOpenChange,
  value,
  onApply,
  today,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: Period
  onApply: (period: Period) => void
  today: DayKey
}) {
  const [draft, setDraft] = React.useState<Period>(value)
  const [month, setMonth] = React.useState(() => parseKey(value.end ?? today))

  // Cada abertura parte do filtro aplicado (ajuste de estado durante o
  // render, no padrão do React para derivar de props).
  const [lastOpen, setLastOpen] = React.useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setDraft(value)
      setMonth(parseKey(value.end ?? today))
    }
  }

  const t = parseKey(today)
  const isCurrentMonth = month.y === t.y && month.m === t.m
  const firstWeekday = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay()
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate()

  function pick(key: DayKey) {
    setDraft((p) => {
      if (!p.start || p.end) return { start: key, end: null, preset: null }
      if (key < p.start) return { start: key, end: p.start, preset: null }
      return { start: p.start, end: key, preset: null }
    })
  }

  function shiftMonth(delta: number) {
    setMonth(({ y, m }) => {
      const date = new Date(Date.UTC(y, m + delta, 1))
      return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: 1 }
    })
  }

  const cells: (DayKey | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(month.y, month.m, i + 1)),
  ]

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">Período</DrawerTitle>
          <DrawerDescription aria-live="polite" className="text-sm">
            {describePeriod(draft)}
          </DrawerDescription>
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const next = presetPeriod(p.id, today)
                setDraft(next)
                setMonth(parseKey(next.end ?? today))
              }}
              className={cn(
                "h-9 shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap",
                draft.preset === p.id
                  ? "bg-foreground font-bold text-background"
                  : "border bg-muted/60 font-medium text-foreground/80",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 rounded-[20px] bg-muted/60 p-3.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => shiftMonth(-1)}
              className="flex size-9 items-center justify-center rounded-xl bg-muted"
            >
              <ChevronLeft className="size-[18px]" />
            </button>
            <span className="text-[15px] font-bold">
              {MONTHS[month.m].charAt(0).toUpperCase() + MONTHS[month.m].slice(1)} de {month.y}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => shiftMonth(1)}
              disabled={isCurrentMonth}
              className="flex size-9 items-center justify-center rounded-xl bg-muted disabled:opacity-40"
            >
              <ChevronRight className="size-[18px]" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((key, i) => {
              if (!key) return <span key={`e${i}`} className="h-10" />
              const future = key > today
              const { start, end } = draft
              const inRange = !!start && !!end && key >= start && key <= end
              const edge = key === start || key === end
              const span = inRange && start !== end
              return (
                <span
                  key={key}
                  className={cn(
                    "flex h-10 items-center justify-center",
                    span && "bg-primary/15",
                    span && key === start && "rounded-l-full",
                    span && key === end && "rounded-r-full",
                  )}
                >
                  <button
                    type="button"
                    disabled={future}
                    aria-pressed={edge}
                    aria-label={labelOf(key)}
                    onClick={() => pick(key)}
                    className={cn(
                      "size-10 rounded-full text-sm",
                      edge
                        ? "bg-primary font-extrabold text-primary-foreground"
                        : future
                          ? "text-muted-foreground/40"
                          : inRange
                            ? "font-medium text-foreground"
                            : "font-medium text-foreground/80",
                      key === today && !edge && "font-extrabold ring-1 ring-muted-foreground/50 ring-inset",
                    )}
                  >
                    {labelOf(key, false)}
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setDraft(ALL_TIME)}
            className="h-[54px] rounded-2xl border bg-muted/60 text-base font-semibold"
          >
            Limpar
          </button>
          <button
            type="button"
            disabled={!!draft.start && !draft.end}
            onClick={() => {
              onApply(draft)
              onOpenChange(false)
            }}
            className="h-[54px] rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            Aplicar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
