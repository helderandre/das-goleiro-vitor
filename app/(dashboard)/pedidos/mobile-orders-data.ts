import { createClient } from "@/lib/supabase/server"
import { getPaymentDisplay } from "@/lib/payment-methods"
import { ORDER_TTL_MS } from "@/lib/order-status"
import type { MobileOrderListItem } from "@/components/mobile/orders/order-list"

const TZ = "America/Sao_Paulo"

/** "2026-09-18" no fuso de São Paulo. */
export function dayKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ })
}

export function timeLabel(date: Date) {
  return date.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
}

function dayLabel(key: string, now: Date) {
  if (key === dayKey(now)) return "Hoje"
  if (key === dayKey(new Date(now.getTime() - 86_400_000))) return "Ontem"
  const [y, m, d] = key.split("-").map(Number)
  const label = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    ...(y !== now.getFullYear() ? { year: "numeric" } : {}),
  })
  return label
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

const SHIPPING_HINT: Record<string, string> = {
  printed: "Etiqueta impressa — falta postar",
  generated: "Etiqueta gerada — falta imprimir",
  paid: "Etiqueta paga — falta gerar",
  cart: "Etiqueta no carrinho — falta pagar",
}

export async function getMobileOrders(): Promise<{
  orders: MobileOrderListItem[]
  today: string
}> {
  const supabase = await createClient()
  const now = new Date()

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, short_id, total, status, created_at, user_id, needs_attention, attention_reason, shipping_status, tracking_code, me_service_name, mp_payment_method, mp_payment_type, order_items(quantity, product_type)",
    )
    .order("created_at", { ascending: false })

  const userIds = [...new Set((orders ?? []).map((o) => o.user_id).filter(Boolean))] as string[]
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] }
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  const items: MobileOrderListItem[] = (orders ?? []).map((o) => {
    const created = new Date(o.created_at ?? now)
    const key = dayKey(created)
    const name = o.user_id ? (nameById.get(o.user_id) ?? null) : null
    const status = o.status ?? "pending"
    const books = o.order_items.reduce((sum, i) => sum + i.quantity, 0)
    const physical = o.order_items.some((i) => i.product_type !== "ebook")
    const payment = getPaymentDisplay(o.mp_payment_method, o.mp_payment_type)
    const via = physical ? o.me_service_name : payment.typeLabel

    let hint: string | null = null
    let hintTone: MobileOrderListItem["hintTone"] = "info"
    if (o.needs_attention) {
      hint = `Pede atenção: ${o.attention_reason ?? "confira pagamento e status"}`
      hintTone = "alerta"
    } else if (status === "pending") {
      const cancelAt = new Date(created.getTime() + ORDER_TTL_MS)
      if (cancelAt > now) {
        const sameDay = dayKey(cancelAt) === dayKey(now)
        hint = `Cancela sozinho ${sameDay ? "às" : "amanhã às"} ${timeLabel(cancelAt)} se não pagar`
      }
    } else if (status === "paid" && physical) {
      hint = SHIPPING_HINT[o.shipping_status ?? ""] ?? "Falta comprar a etiqueta"
      hintTone = "acao"
    } else if (status === "shipped") {
      hint = o.tracking_code ? `Em trânsito · ${o.tracking_code}` : "Em trânsito"
    }

    return {
      id: o.id,
      shortId: (o.short_id ?? o.id.slice(0, 6).toUpperCase()).replace(/^#/, ""),
      status,
      customerName: name,
      initials: initialsOf(name),
      itemsLabel: [`${books} ${books === 1 ? "livro" : "livros"}`, via].filter(Boolean).join(" · "),
      total: Number(o.total),
      day: key,
      dayLabel: dayLabel(key, now),
      hint,
      hintTone,
      needsAttention: o.needs_attention,
    }
  })

  return { orders: items, today: dayKey(now) }
}
