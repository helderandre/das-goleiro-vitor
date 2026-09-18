"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Check, Clock, Copy, RotateCcw, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "../format"
import type { FinanceTransaction } from "./types"

/* -------------------------------------------------------------------------- */
/* Período                                                                    */
/* -------------------------------------------------------------------------- */

export type FinancePresetId = "mes" | "passado" | "12m" | "tudo"

export interface FinancePeriod {
  id: FinancePresetId | "custom"
  start: string | null
  end: string | null
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

function monthStart(y: number, m: number) {
  const d = new Date(Date.UTC(y, m, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`
}

function monthEnd(y: number, m: number) {
  const d = new Date(Date.UTC(y, m + 1, 0))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

export function financePeriod(id: FinancePresetId, today: string): FinancePeriod {
  const [y, m] = today.split("-").map(Number)
  switch (id) {
    case "mes":
      return { id, start: monthStart(y, m - 1), end: today }
    case "passado":
      return { id, start: monthStart(y, m - 2), end: monthEnd(y, m - 2) }
    case "12m":
      return { id, start: monthStart(y, m - 12), end: today }
    case "tudo":
      return { id, start: null, end: null }
  }
}

/** "Setembro de 2026", "Agosto de 2026", "Out/2025 a set/2026"… */
export function describeFinancePeriod(p: FinancePeriod, custom: string) {
  if (p.id === "tudo" || !p.start || !p.end) return "Desde a abertura da loja"
  if (p.id === "custom") return custom
  const [sy, sm] = p.start.split("-").map(Number)
  const [ey, em] = p.end.split("-").map(Number)
  if (sy === ey && sm === em) {
    const name = MONTHS[sm - 1]
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${sy}`
  }
  const short = (y: number, mm: number) => `${MONTHS[mm - 1].slice(0, 3)}/${y}`
  const text = `${short(sy, sm)} a ${short(ey, em)}`
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function inPeriod(t: FinanceTransaction, p: FinancePeriod) {
  return !p.start || !p.end || (t.day >= p.start && t.day <= p.end)
}

/* -------------------------------------------------------------------------- */
/* Linha e recibo                                                             */
/* -------------------------------------------------------------------------- */

export function TransactionRow({
  t,
  onOpen,
  showTime,
}: {
  t: FinanceTransaction
  onOpen: (t: FinanceTransaction) => void
  /** Na lista agrupada por dia basta a hora; no resumo vai a data. */
  showTime?: boolean
}) {
  const value =
    t.kind === "recebido"
      ? `+ ${formatBRL(t.total)}`
      : t.kind === "reembolso"
        ? `− ${formatBRL(t.total)}`
        : formatBRL(t.total)
  const sub =
    t.kind === "recebido"
      ? `líquido ${formatBRL(t.net)}`
      : t.kind === "pendente"
        ? "aguardando"
        : t.kind === "reembolso"
          ? "devolvido"
          : "cancelado"
  return (
    <button
      type="button"
      onClick={() => onOpen(t)}
      className="flex w-full items-center gap-3 px-3.5 py-3 text-left active:bg-foreground/5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-bold text-foreground/80">
        {t.initials}
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{t.customerName ?? "Cliente não identificado"}</span>
        <span className="truncate text-xs text-muted-foreground">
          <span className="font-mono">#{t.shortId}</span> · {t.paymentType} · {showTime ? t.time : t.whenLabel}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={cn(
            "text-[15px] font-extrabold whitespace-nowrap",
            t.kind === "pendente" && "text-muted-foreground",
            t.kind === "reembolso" && "text-destructive",
            t.kind === "cancelado" && "font-bold text-muted-foreground line-through",
          )}
        >
          {value}
        </span>
        <span className="text-xs whitespace-nowrap text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}

const MP_STATUS: Record<string, string> = {
  approved: "Aprovado",
  pending: "Aguardando",
  in_process: "Em análise",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contestado",
}

export function TransactionSheet({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: FinanceTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = transaction
  const head = t
    ? {
        recebido: { icon: Check, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", text: "Recebido de" },
        pendente: { icon: Clock, tone: "bg-muted text-muted-foreground", text: "Aguardando pagamento de" },
        reembolso: { icon: RotateCcw, tone: "bg-destructive/15 text-destructive", text: "Devolvido a" },
        cancelado: { icon: XCircle, tone: "bg-muted text-muted-foreground", text: "Cancelado · " },
      }[t.kind]
    : null

  async function copySummary() {
    if (!t) return
    const lines = [
      `Pedido #${t.shortId} — ${t.customerName ?? "cliente"}`,
      `${t.whenLabel} · ${t.paymentLabel ?? t.paymentType}`,
      `Valor pago: ${formatBRL(t.total)}`,
      ...(t.kind === "recebido"
        ? [`Taxa Mercado Pago: − ${formatBRL(t.fee)}`, `Frete: − ${formatBRL(t.shipping)}`, `Líquido: ${formatBRL(t.net)}`]
        : []),
    ]
    try {
      await navigator.clipboard.writeText(lines.join("\n"))
      toast.success("Resumo copiado")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {t && head && (
          <>
            <div className="flex flex-col items-center gap-1.5 pt-4 text-center">
              <span className={cn("flex size-[52px] items-center justify-center rounded-full", head.tone)}>
                <head.icon className="size-6" strokeWidth={2.4} />
              </span>
              <DrawerDescription className="text-[13px]">
                {head.text} {t.customerName ?? "cliente"}
              </DrawerDescription>
              <DrawerTitle className="text-[38px] leading-tight font-extrabold tracking-tight">
                {formatBRL(t.total)}
              </DrawerTitle>
              <span className="text-[13px] text-muted-foreground">
                {t.paymentLabel ?? t.paymentType} · {t.whenLabel}
              </span>
            </div>

            {t.kind === "recebido" && (
              <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
                <Line label="Valor pago pelo cliente" value={formatBRL(t.total)} />
                <Line label="Taxa Mercado Pago" value={`− ${formatBRL(t.fee)}`} className="font-medium text-destructive" />
                <Line
                  label={`Frete${t.serviceName ? ` (${t.serviceName})` : ""}`}
                  value={`− ${formatBRL(t.shipping)}`}
                  className="font-medium text-muted-foreground"
                />
                <div className="flex items-baseline justify-between gap-3 bg-primary/10 px-4 py-3.5">
                  <span className="text-[15px] font-bold">Líquido da loja</span>
                  <span className="text-xl font-extrabold text-primary">{formatBRL(t.net)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
              <Line label="Pedido" value={`#${t.shortId}`} className="font-mono" />
              <Line label="Status no Mercado Pago" value={t.mpPaymentStatus ? (MP_STATUS[t.mpPaymentStatus] ?? t.mpPaymentStatus) : "Sem cobrança"} />
              {t.mpPaymentId && <Line label="ID do pagamento" value={t.mpPaymentId} className="font-mono text-foreground/80" />}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={copySummary}
                className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border bg-muted/60 text-[15px] font-semibold"
              >
                <Copy className="size-[18px]" strokeWidth={1.8} />
                Copiar resumo
              </button>
              <Link
                href={`/pedidos/${t.id}`}
                className="flex h-[50px] items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground"
              >
                Abrir pedido
              </Link>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

function Line({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-3 text-[15px]">
      <span className="min-w-0 truncate text-foreground/80">{label}</span>
      <span className={cn("font-semibold whitespace-nowrap", className)}>{value}</span>
    </div>
  )
}

/** Estado da sheet: mantém a transação durante a animação de saída. */
export function useTransactionSheet() {
  const [transaction, setTransaction] = React.useState<FinanceTransaction | null>(null)
  const [open, setOpen] = React.useState(false)
  return {
    openTransaction: (t: FinanceTransaction) => {
      setTransaction(t)
      setOpen(true)
    },
    sheet: <TransactionSheet transaction={transaction} open={open} onOpenChange={setOpen} />,
  }
}
