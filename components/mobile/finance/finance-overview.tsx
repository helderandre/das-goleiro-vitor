"use client"

import * as React from "react"
import Link from "next/link"
import { CalendarDays, CreditCard, Landmark, Loader2, QrCode, RefreshCw, Truck, Wallet } from "lucide-react"

import { cn } from "@/lib/utils"
import { getWalletBalance } from "@/app/(dashboard)/pedidos/actions"
import { formatBRL } from "../format"
import { AnimatedNumber, useGrowIn } from "@/components/motion"
import { PeriodSheet, describePeriod, type Period } from "../orders/period-sheet"
import {
  TransactionRow,
  describeFinancePeriod,
  financePeriod,
  inPeriod,
  useTransactionSheet,
  type FinancePeriod,
  type FinancePresetId,
} from "./transaction-sheet"
import type { FinanceTransaction } from "./types"

const PRESETS: { id: FinancePresetId; label: string }[] = [
  { id: "mes", label: "Este mês" },
  { id: "passado", label: "Mês passado" },
  { id: "12m", label: "12 meses" },
  { id: "tudo", label: "Tudo" },
]

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const MONTHS_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

const METHOD_ICON: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Pix: QrCode,
  Crédito: CreditCard,
  Débito: CreditCard,
  Boleto: Landmark,
}

type Balance = { balance: number; reserved: number; debts: number }

export function MobileFinanceOverview({
  transactions,
  today,
}: {
  transactions: FinanceTransaction[]
  today: string
}) {
  const [period, setPeriod] = React.useState<FinancePeriod>(() => financePeriod("mes", today))
  const [periodOpen, setPeriodOpen] = React.useState(false)
  const [mode, setMode] = React.useState<"liquido" | "bruto">("liquido")
  const [bar, setBar] = React.useState(5)
  const { openTransaction, sheet } = useTransactionSheet()

  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [balanceState, setBalanceState] = React.useState<"loading" | "ok" | "error">("loading")
  const loadBalance = React.useCallback(() => {
    getWalletBalance().then((r) => {
      if ("error" in r || !r.balance) {
        setBalanceState("error")
        return
      }
      setBalance({
        balance: Number(r.balance.balance ?? 0),
        reserved: Number(r.balance.reserved ?? 0),
        debts: Number(r.balance.debts ?? 0),
      })
      setBalanceState("ok")
    })
  }, [])
  React.useEffect(() => {
    loadBalance()
  }, [loadBalance])

  const inRange = transactions.filter((t) => inPeriod(t, period))
  const received = inRange.filter((t) => t.kind === "recebido")
  const gross = received.reduce((s, t) => s + t.total, 0)
  const fees = received.reduce((s, t) => s + t.fee, 0)
  const shipping = received.reduce((s, t) => s + t.shipping, 0)
  const net = gross - fees - shipping
  const pending = inRange.filter((t) => t.kind === "pendente")
  const lost = inRange.filter((t) => t.kind === "cancelado" || t.kind === "reembolso")
  const grown = useGrowIn()
  const pct = (v: number) => (grown && gross > 0 ? (v / gross) * 100 : 0)

  // Últimos 6 meses até o mês atual.
  const [ty, tm] = today.split("-").map(Number)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(ty, tm - 1 - (5 - i), 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    const inMonth = transactions.filter((t) => t.kind === "recebido" && t.day.startsWith(key))
    return {
      short: MONTHS_SHORT[d.getUTCMonth()],
      full: `${MONTHS_FULL[d.getUTCMonth()]} de ${d.getUTCFullYear()}`,
      gross: inMonth.reduce((s, t) => s + t.total, 0),
      net: inMonth.reduce((s, t) => s + t.net, 0),
    }
  })
  const values = months.map((m) => (mode === "bruto" ? m.gross : m.net))
  const max = Math.max(...values, 1)

  const methods = new Map<string, { total: number; count: number }>()
  for (const t of received) {
    const m = methods.get(t.paymentType) ?? { total: 0, count: 0 }
    methods.set(t.paymentType, { total: m.total + t.total, count: m.count + 1 })
  }
  const methodList = [...methods.entries()].sort((a, b) => b[1].total - a[1].total)

  const sheetValue: Period =
    period.id === "custom" || (period.start && period.end)
      ? { start: period.start, end: period.end, preset: null }
      : { start: null, end: null, preset: "tudo" }

  const seg = (on: boolean) =>
    cn("h-9 grow rounded-[10px] text-sm", on ? "bg-muted font-semibold" : "font-medium text-muted-foreground")

  return (
    <div className="flex flex-col gap-6 pt-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[13px] font-medium text-muted-foreground">
            {describeFinancePeriod(period, describePeriod(sheetValue))}
          </span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Financeiro</h1>
        </div>
        <button
          type="button"
          onClick={() => setPeriodOpen(true)}
          aria-label="Escolher período no calendário"
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border",
            period.id === "custom" ? "border-primary bg-primary/15 text-primary" : "bg-card",
          )}
        >
          <CalendarDays className="size-5" strokeWidth={1.8} />
        </button>
      </header>

      <div role="tablist" aria-label="Período" className="flex gap-1 rounded-[14px] border bg-card p-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period.id === p.id}
            onClick={() => setPeriod(financePeriod(p.id, today))}
            className={seg(period.id === p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section aria-label="Receita líquida" className="flex flex-col gap-[18px] rounded-3xl border bg-card p-[22px]">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Receita líquida</span>
          <span className="text-[44px] leading-none font-extrabold tracking-tighter"><AnimatedNumber value={net} format="brl" /></span>
          <span className="text-sm text-muted-foreground">
            {received.length === 0
              ? "Nenhum pedido pago no período"
              : `de ${formatBRL(gross)} recebidos em ${received.length} ${received.length === 1 ? "pedido pago" : "pedidos pagos"}`}
          </span>
        </div>
        {gross > 0 && (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
              <div className="bg-primary transition-[width] duration-700 ease-out" style={{ width: `${pct(net)}%` }} />
              <div className="bg-muted-foreground/60 transition-[width] delay-100 duration-700 ease-out" style={{ width: `${pct(shipping)}%` }} />
              {fees > 0 && <div className="min-w-1 bg-destructive/80 transition-[width] delay-200 duration-700 ease-out" style={{ width: `${pct(fees)}%` }} />}
            </div>
            <div className="flex flex-col gap-2.5 text-sm">
              <Legend color="bg-primary" label="Líquido" value={net} />
              <Legend color="bg-muted-foreground/60" label="Frete" value={shipping} />
              <Legend color="bg-destructive/80" label="Taxa Mercado Pago" value={fees} />
            </div>
          </>
        )}
      </section>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-2.5">
        <Kpi label="Pedidos pagos" value={<AnimatedNumber value={received.length} />} hint={`de ${inRange.length} ${inRange.length === 1 ? "pedido" : "pedidos"} no período`} />
        <Kpi
          label="Ticket médio"
          value={received.length ? <AnimatedNumber value={gross / received.length} format="brl" /> : "—"}
          hint="valor bruto por pedido"
        />
        <Kpi
          label="A receber"
          value={<AnimatedNumber value={pending.reduce((s, t) => s + t.total, 0)} format="brl" />}
          hint={pending.length ? `${pending.length} ${pending.length === 1 ? "pedido pendente" : "pedidos pendentes"}` : "nenhum pedido pendente"}
        />
        <Kpi
          label="Cancelado"
          value={<AnimatedNumber value={lost.reduce((s, t) => s + t.total, 0)} format="brl" />}
          hint={lost.length ? `${lost.length} ${lost.length === 1 ? "pedido" : "pedidos"}` : "nada devolvido"}
        />
      </section>

      <section aria-label="Receita por mês" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[19px] font-bold tracking-tight">Receita por mês</h2>
          <div role="tablist" aria-label="Valor do gráfico" className="flex gap-0.5 rounded-[11px] border bg-card p-[3px]">
            {(["liquido", "bruto"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-[30px] rounded-lg px-3 text-[13px]",
                  mode === m ? "bg-muted font-semibold" : "font-medium text-muted-foreground",
                )}
              >
                {m === "liquido" ? "Líquido" : "Bruto"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-muted-foreground">
              {months[bar].full} · {mode === "bruto" ? "bruto" : "líquido"}
            </span>
            <AnimatedNumber value={values[bar]} format="brl" duration={500} className="text-lg font-extrabold" />
          </div>
          <div className="grid h-[150px] grid-cols-6 items-end gap-2.5">
            {months.map((m, i) => (
              <button
                key={m.full}
                type="button"
                aria-label={`${m.full}: ${formatBRL(values[i])}`}
                aria-pressed={bar === i}
                onClick={() => setBar(i)}
                className="flex h-full flex-col items-center justify-end gap-2"
              >
                <span
                  className={cn(
                    "w-full max-w-[34px] rounded-lg transition-[height] duration-700 ease-out",
                    values[i] > 0 ? (bar === i ? "bg-primary" : "bg-primary/45") : "bg-muted",
                  )}
                  style={{
                    height: grown && values[i] > 0 ? Math.max(8, Math.round((values[i] / max) * 118)) : 4,
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
                <span className={cn("text-xs", bar === i ? "font-bold" : "font-medium text-muted-foreground")}>
                  {m.short}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Formas de pagamento" className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold tracking-tight">Formas de pagamento</h2>
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          {methodList.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhum pagamento no período.</p>
          )}
          {methodList.map(([name, m]) => {
            const Icon = METHOD_ICON[name] ?? Wallet
            const share = gross > 0 ? Math.round((m.total / gross) * 100) : 0
            return (
              <div key={name} className="flex flex-col gap-2 px-4 py-3.5">
                <span className="flex justify-between gap-3 text-[15px]">
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                    {name}
                  </span>
                  <span className="font-bold whitespace-nowrap">{formatBRL(m.total)}</span>
                </span>
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${grown ? share : 0}%` }} />
                </span>
                <span className="text-xs text-muted-foreground">
                  {m.count} {m.count === 1 ? "pedido" : "pedidos"} · {share}% da receita
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-label="Saldo no Melhor Envio" className="flex items-center gap-3.5 rounded-[20px] border bg-card p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
          <Truck className="size-6" strokeWidth={1.8} />
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="text-[13px] text-muted-foreground">Saldo no Melhor Envio</span>
          <span className="text-xl font-extrabold">
            {balanceState === "ok" && balance
              ? formatBRL(balance.balance)
              : balanceState === "error"
                ? "Indisponível"
                : "Consultando…"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {balance && balance.reserved > 0
              ? `${formatBRL(balance.reserved)} reservado em etiquetas`
              : "Paga as etiquetas dos pedidos"}
          </span>
        </span>
        <button
          type="button"
          aria-label="Atualizar saldo"
          disabled={balanceState === "loading"}
          onClick={() => {
            setBalanceState("loading")
            loadBalance()
          }}
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-muted/60 disabled:opacity-60"
        >
          {balanceState === "loading" ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <RefreshCw className="size-[18px]" strokeWidth={1.8} />
          )}
        </button>
      </section>

      <section aria-label="Últimas transações" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold tracking-tight">Últimas transações</h2>
          <Link href="/financeiro/transacoes" className="text-sm font-semibold text-primary">
            Ver todas
          </Link>
        </div>
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          {transactions.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhuma transação ainda.</p>
          )}
          {transactions.slice(0, 5).map((t) => (
            <TransactionRow key={t.id} t={t} onOpen={openTransaction} />
          ))}
        </div>
      </section>

      <PeriodSheet
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        value={sheetValue}
        onApply={(p) =>
          setPeriod(p.start && p.end ? { id: "custom", start: p.start, end: p.end } : financePeriod("tudo", today))
        }
        today={today}
      />
      {sheet}
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("size-2.5 shrink-0 rounded-[3px]", color)} />
      <span className="min-w-0 grow truncate text-foreground/85">{label}</span>
      <AnimatedNumber value={value} format="brl" className="shrink-0 font-semibold whitespace-nowrap" />
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] border bg-card p-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[22px] font-extrabold tracking-tight whitespace-nowrap">{value}</span>
      <span className="truncate text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}
