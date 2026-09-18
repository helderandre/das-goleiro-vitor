"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABELS } from "@/lib/order-status"
import { formatBRL } from "../format"
import {
  ALL_TIME,
  PeriodSheet,
  describePeriod,
  type DayKey,
  type Period,
} from "./period-sheet"

export interface MobileOrderListItem {
  id: string
  shortId: string
  status: string
  customerName: string | null
  initials: string
  itemsLabel: string
  total: number
  /** Dia do pedido em São Paulo, para filtrar e agrupar. */
  day: DayKey
  /** "Hoje", "Ontem", "15 de setembro". */
  dayLabel: string
  hint: string | null
  hintTone: "acao" | "alerta" | "info"
  needsAttention: boolean
}

const FILTERS = [
  { id: "all", label: "Todos", match: () => true },
  { id: "paid", label: "A enviar", match: (o: MobileOrderListItem) => o.status === "paid" },
  { id: "pending", label: "Pendentes", match: (o: MobileOrderListItem) => o.status === "pending" },
  { id: "shipped", label: "Enviados", match: (o: MobileOrderListItem) => o.status === "shipped" },
  { id: "delivered", label: "Entregues", match: (o: MobileOrderListItem) => o.status === "delivered" },
  { id: "cancelled", label: "Cancelados", match: (o: MobileOrderListItem) => o.status === "cancelled" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function MobileOrderList({
  orders,
  today,
  initialStatus,
}: {
  orders: MobileOrderListItem[]
  today: DayKey
  initialStatus?: string
}) {
  const [filter, setFilter] = React.useState<FilterId>(
    FILTERS.some((f) => f.id === initialStatus) ? (initialStatus as FilterId) : "all",
  )
  const [query, setQuery] = React.useState("")
  const [period, setPeriod] = React.useState<Period>(ALL_TIME)
  const [periodOpen, setPeriodOpen] = React.useState(false)

  const q = normalize(query.trim().replace(/^#/, ""))
  const inPeriod = orders.filter(
    (o) => !period.start || !period.end || (o.day >= period.start && o.day <= period.end),
  )
  const searched = inPeriod.filter(
    (o) =>
      !q ||
      normalize(o.shortId).includes(q) ||
      normalize(o.customerName ?? "").includes(q),
  )
  const active = FILTERS.find((f) => f.id === filter)!
  const visible = searched.filter(active.match)

  const groups: { label: string; orders: MobileOrderListItem[] }[] = []
  for (const o of visible) {
    const last = groups[groups.length - 1]
    if (last?.label === o.dayLabel) last.orders.push(o)
    else groups.push({ label: o.dayLabel, orders: [o] })
  }

  const toShip = orders.filter((o) => o.status === "paid").length
  const hasPeriod = !!period.start

  return (
    <div className="flex flex-col gap-5 pt-4">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted-foreground">
          {toShip === 0
            ? "Nada esperando envio"
            : `${toShip} esperando envio`}
        </span>
        <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Pedidos</h1>
      </header>

      <div className="flex gap-2.5">
        <label className="flex h-[46px] min-w-0 grow items-center gap-2.5 rounded-[14px] border bg-card px-3.5 text-muted-foreground">
          <Search className="size-[18px] shrink-0" />
          <span className="sr-only">Buscar pedido</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número do pedido ou cliente"
            className="h-full min-w-0 grow bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          onClick={() => setPeriodOpen(true)}
          aria-label={hasPeriod ? `Período: ${describePeriod(period)}` : "Filtrar por período"}
          className={cn(
            "relative flex size-[46px] shrink-0 items-center justify-center rounded-[14px] border",
            hasPeriod ? "border-primary bg-primary/15 text-primary" : "bg-card",
          )}
        >
          <CalendarDays className="size-5" strokeWidth={1.8} />
        </button>
      </div>

      {hasPeriod && (
        <button
          type="button"
          onClick={() => setPeriod(ALL_TIME)}
          className="-mt-2 flex h-9 items-center gap-2 self-start rounded-full bg-primary/15 pr-3 pl-3.5 text-sm font-semibold text-primary"
        >
          {describePeriod(period)}
          <span aria-hidden className="text-base leading-none">×</span>
          <span className="sr-only">Remover filtro de período</span>
        </button>
      )}

      <div role="tablist" aria-label="Status" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = f.id === filter
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
              {f.label}{" "}
              <span className={cn("font-medium", on ? "text-background/60" : "text-muted-foreground")}>
                {searched.filter(f.match).length}
              </span>
            </button>
          )
        })}
      </div>

      {groups.length === 0 ? (
        <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          {orders.length === 0 ? "Nenhum pedido ainda." : "Nenhum pedido com esses filtros."}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.label} className="flex flex-col gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
              {g.label}
            </h2>
            {g.orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </section>
        ))
      )}

      <PeriodSheet
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        value={period}
        onApply={setPeriod}
        today={today}
      />
    </div>
  )
}

function OrderCard({ order: o }: { order: MobileOrderListItem }) {
  return (
    <Link
      href={`/pedidos/${o.id}`}
      className={cn(
        "flex flex-col rounded-[20px] border bg-card p-3.5 active:scale-[0.99]",
        o.needsAttention
          ? "border-destructive/45"
          : o.hintTone === "acao" && "border-primary/35",
      )}
    >
      <span className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground/80">
          {o.initials}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{o.customerName ?? "Cliente não identificado"}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            <span className="font-mono font-medium text-foreground/80">#{o.shortId}</span> · {o.itemsLabel}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-base font-extrabold tracking-tight whitespace-nowrap">{formatBRL(o.total)}</span>
          <span
            className={cn(
              "flex h-[22px] items-center rounded-full px-2 text-[11px] font-bold",
              ORDER_STATUS_CHIP[o.status] ?? ORDER_STATUS_CHIP.pending,
            )}
          >
            {ORDER_STATUS_LABELS[o.status] ?? o.status}
          </span>
        </span>
      </span>
      {o.hint && (
        <span
          className={cn(
            "mt-3 truncate border-t pt-3 text-[13px]",
            o.hintTone === "acao" && "font-semibold text-primary",
            o.hintTone === "alerta" && "font-semibold text-destructive",
            o.hintTone === "info" && "font-medium text-muted-foreground",
          )}
        >
          {o.hint}
        </span>
      )}
    </Link>
  )
}
