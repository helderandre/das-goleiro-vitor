"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatBRL } from "../format"
import { ALL_TIME, PeriodSheet, describePeriod, type Period } from "../orders/period-sheet"
import { TransactionRow, useTransactionSheet } from "./transaction-sheet"
import type { FinanceTransaction } from "./types"

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "recebido", label: "Recebidas" },
  { id: "pendente", label: "Pendentes" },
  { id: "reembolso", label: "Devoluções" },
  { id: "cancelado", label: "Canceladas" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

export function MobileTransactionList({
  transactions,
  today,
}: {
  transactions: FinanceTransaction[]
  today: string
}) {
  const [filter, setFilter] = React.useState<FilterId>("todas")
  const [period, setPeriod] = React.useState<Period>(ALL_TIME)
  const [periodOpen, setPeriodOpen] = React.useState(false)
  const { openTransaction, sheet } = useTransactionSheet()

  const inRange = transactions.filter(
    (t) => !period.start || !period.end || (t.day >= period.start && t.day <= period.end),
  )
  const visible = inRange.filter((t) => filter === "todas" || t.kind === filter)
  const received = inRange.filter((t) => t.kind === "recebido")
  const gross = received.reduce((s, t) => s + t.total, 0)
  const costs = received.reduce((s, t) => s + t.fee + t.shipping, 0)

  const groups: { label: string; rows: FinanceTransaction[] }[] = []
  for (const t of visible) {
    const last = groups[groups.length - 1]
    if (last?.label === t.dayLabel) last.rows.push(t)
    else groups.push({ label: t.dayLabel, rows: [t] })
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <div className="flex items-center gap-3">
        <Link
          href="/financeiro"
          aria-label="Voltar para Financeiro"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border bg-card"
        >
          <ChevronLeft className="size-[22px]" />
        </Link>
        <h1 className="grow text-2xl font-extrabold tracking-tight">Transações</h1>
        <button
          type="button"
          onClick={() => setPeriodOpen(true)}
          aria-label="Escolher período"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border",
            period.start ? "border-primary bg-primary/15 text-primary" : "bg-card",
          )}
        >
          <CalendarDays className="size-5" strokeWidth={1.8} />
        </button>
      </div>

      {period.start && (
        <button
          type="button"
          onClick={() => setPeriod(ALL_TIME)}
          className="-mt-1 flex h-9 items-center gap-2 self-start rounded-full bg-primary/15 pr-3 pl-3.5 text-sm font-semibold text-primary"
        >
          {describePeriod(period)}
          <span aria-hidden className="text-base leading-none">×</span>
          <span className="sr-only">Remover filtro de período</span>
        </button>
      )}

      <section aria-label="Resumo" className="grid grid-cols-3 divide-x rounded-[20px] border bg-card px-1 py-3.5">
        <Stat value={formatBRL(gross)} label="entrou" />
        <Stat value={formatBRL(costs)} label="taxa + frete" className="text-destructive" />
        <Stat value={formatBRL(gross - costs)} label="líquido" className="text-primary" />
      </section>

      <div role="tablist" aria-label="Tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-[38px] shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap",
                on ? "bg-foreground font-bold text-background" : "border bg-card font-medium text-foreground/80",
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          Nenhuma transação desse tipo no período.
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">{g.label}</h2>
            <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
              {g.rows.map((t) => (
                <TransactionRow key={t.id} t={t} onOpen={openTransaction} showTime />
              ))}
            </div>
          </section>
        ))
      )}

      <PeriodSheet open={periodOpen} onOpenChange={setPeriodOpen} value={period} onApply={setPeriod} today={today} />
      {sheet}
    </div>
  )
}

function Stat({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
      <span className={cn("truncate text-[15px] font-extrabold", className)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
