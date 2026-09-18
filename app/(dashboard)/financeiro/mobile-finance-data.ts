import { createClient } from "@/lib/supabase/server"
import { getPaymentDisplay } from "@/lib/payment-methods"
import { dayKey, timeLabel } from "../pedidos/mobile-orders-data"
import type { FinanceTransaction } from "@/components/mobile/finance/types"

function dayLabel(key: string, now: Date) {
  if (key === dayKey(now)) return "Hoje"
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Ontem"
  const [y, m, d] = key.split("-").map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    ...(y !== now.getFullYear() ? { year: "numeric" } : {}),
  })
}

function initialsOf(name: string | null) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("")
}

/**
 * Uma transação por pedido. A data de referência é a do pagamento (ou da
 * criação, para pedidos que não chegaram a ser pagos).
 */
export async function getFinanceTransactions(): Promise<{
  transactions: FinanceTransaction[]
  today: string
}> {
  const supabase = await createClient()
  const now = new Date()

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, short_id, status, total, mp_fee_amount, shipping_price, mp_payment_method, mp_payment_type, mp_payment_status, mp_payment_id, mp_paid_at, created_at, user_id, me_service_name",
    )
    .order("created_at", { ascending: false })

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))] as string[]
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] }
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const transactions: FinanceTransaction[] = (orders ?? []).map((o) => {
    const status = o.status ?? "pending"
    const at = new Date(o.mp_paid_at ?? o.created_at ?? now)
    const key = dayKey(at)
    const name = o.user_id ? (nameById.get(o.user_id) ?? null) : null
    const total = Number(o.total)
    const fee = Number(o.mp_fee_amount ?? 0)
    const shipping = Number(o.shipping_price ?? 0)
    const paidLike = ["paid", "shipped", "delivered"].includes(status)
    const refunded = ["refunded", "charged_back"].includes(o.mp_payment_status ?? "")
    const kind: FinanceTransaction["kind"] = paidLike
      ? "recebido"
      : status === "pending"
        ? "pendente"
        : refunded
          ? "reembolso"
          : "cancelado"
    const payment = getPaymentDisplay(o.mp_payment_method, o.mp_payment_type)

    return {
      id: o.id,
      shortId: (o.short_id ?? o.id.slice(0, 6).toUpperCase()).replace(/^#/, ""),
      kind,
      customerName: name,
      initials: initialsOf(name),
      total,
      fee,
      shipping,
      net: total - fee - shipping,
      paymentType: payment.typeLabel ?? "Sem pagamento",
      paymentLabel: payment.displayLabel,
      serviceName: o.me_service_name,
      mpPaymentId: o.mp_payment_id,
      mpPaymentStatus: o.mp_payment_status,
      day: key,
      dayLabel: dayLabel(key, now),
      time: timeLabel(at),
      whenLabel: `${at.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })} às ${timeLabel(at)}`,
    }
  })

  return { transactions, today: dayKey(now) }
}
