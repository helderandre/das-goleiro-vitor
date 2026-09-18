import { createClient } from "@/lib/supabase/server"
import { getPaymentDisplay } from "@/lib/payment-methods"
import type {
  MobileOverviewData,
  MobilePayment,
  MobileTask,
} from "@/components/mobile/mobile-overview"
import type { MobileOrder } from "@/components/mobile/order-sheet"

const TZ = "America/Sao_Paulo"

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

const shippingLabels: Record<string, string> = {
  paid: "etiqueta paga",
  generated: "etiqueta gerada",
  printed: "etiqueta impressa",
}

/** "2026-09-18" no fuso de São Paulo. */
function dayKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TZ })
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  })
}

function whenLabel(iso: string | null, now: Date) {
  if (!iso) return ""
  const date = new Date(iso)
  const key = dayKey(date)
  if (key === dayKey(now)) return `hoje, ${timeLabel(date)}`
  if (key === dayKey(new Date(now.getTime() - 86_400_000)))
    return `ontem, ${timeLabel(date)}`
  const day = date.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
  })
  return `${day}, ${timeLabel(date)}`
}

/** "Sexta, 18 de setembro" */
function greetingDate(now: Date) {
  const weekday = now
    .toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "long" })
    .replace(/-feira$/, "")
  const rest = now.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
  })
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${rest}`
}

/** "V2" para "Verdade de Campeão · Vol. 2"; senão as iniciais. */
function productBadge(title: string) {
  const vol = title.match(/vol(?:ume)?\.?\s*(\d+)/i)
  if (vol) return `V${vol[1]}`
  return title
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")
}

export async function getMobileOverviewData(): Promise<MobileOverviewData> {
  const supabase = await createClient()
  const now = new Date()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: profile },
    { data: paidOrders },
    { data: actionOrders },
    { data: unreadMessages },
    { count: newLeadsCount },
    { count: productsCount },
    { count: upcomingEventsCount },
    { count: usersCount },
    { data: cartFunnel },
    { data: nextEvent },
    { data: products },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user!.id).single(),
    supabase
      .from("orders")
      .select("total, mp_fee_amount, shipping_price, mp_paid_at, created_at")
      .in("status", ["paid", "shipped", "delivered"]),
    supabase
      .from("orders")
      .select(
        "id, short_id, status, user_id, total, shipping_price, shipping_status, tracking_code, tracking_url, me_service_name, needs_attention, attention_reason, mp_payment_method, mp_payment_type, mp_paid_at, created_at, order_items(id, product_title, product_type, quantity, unit_price)",
      )
      .or("status.eq.paid,needs_attention.eq.true")
      .order("created_at", { ascending: true }),
    supabase
      .from("order_messages")
      .select("order_id, orders(short_id)")
      .eq("sender_role", "customer")
      .is("read_at", null),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", now.toISOString()),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("v_cart_funnel")
      .select("unique_carts, unique_purchasers")
      .single(),
    supabase
      .from("events")
      .select("id, title, start_date, location_name, city, state")
      .gte("start_date", now.toISOString())
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("products")
      .select("id, title, price, discount_percent, stock, is_main")
      .order("is_main", { ascending: false })
      .order("title", { ascending: false })
      .limit(6),
  ])

  const userIds = [
    ...new Set((actionOrders ?? []).map((o) => o.user_id).filter(Boolean)),
  ] as string[]
  const { data: customers } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", userIds)
    : { data: [] }
  const customerById = new Map((customers ?? []).map((c) => [c.id, c]))

  // Capa de cada livro; sem capa marcada, vale a primeira imagem.
  const productIds = (products ?? []).map((p) => p.id)
  const { data: images } = productIds.length
    ? await supabase
        .from("product_images")
        .select("product_id, image_url, is_cover")
        .in("product_id", productIds)
        .order("created_at", { ascending: true })
    : { data: [] }
  const coverById = new Map<string, string>()
  for (const img of images ?? []) {
    if (!img.product_id) continue
    if (img.is_cover || !coverById.has(img.product_id))
      coverById.set(img.product_id, img.image_url)
  }

  const payments: MobilePayment[] = (paidOrders ?? []).map((o) => {
    const at = new Date(o.mp_paid_at ?? o.created_at ?? now)
    return {
      total: Number(o.total),
      fee: Number(o.mp_fee_amount ?? 0),
      shipping: Number(o.shipping_price ?? 0),
      at: at.getTime(),
      day: dayKey(at),
    }
  })

  const urgentTasks: MobileTask[] = []
  const shippingTasks: MobileTask[] = []

  for (const o of actionOrders ?? []) {
    const customer = o.user_id ? customerById.get(o.user_id) : undefined
    const shortId = o.short_id ?? o.id.slice(0, 6).toUpperCase()
    const payment = getPaymentDisplay(o.mp_payment_method, o.mp_payment_type)
    const order: MobileOrder = {
      id: o.id,
      shortId,
      status: o.status,
      statusLabel: statusLabels[o.status ?? "pending"] ?? o.status ?? "—",
      customerName: customer?.full_name ?? null,
      customerPhone: customer?.phone ?? null,
      whenLabel: whenLabel(o.mp_paid_at ?? o.created_at, now),
      serviceName: o.me_service_name,
      shippingStatus: o.shipping_status,
      trackingCode: o.tracking_code,
      trackingUrl: o.tracking_url,
      attentionReason: o.attention_reason,
      needsAttention: o.needs_attention,
      paymentLabel: payment.typeLabel ? `pago via ${payment.typeLabel}` : null,
      shippingPrice: Number(o.shipping_price ?? 0),
      total: Number(o.total),
      items: o.order_items.map((i) => ({
        id: i.id,
        title: i.product_title,
        quantity: i.quantity,
        subtotal: Number(i.unit_price) * i.quantity,
      })),
    }

    if (o.needs_attention) {
      urgentTasks.push({
        key: `attention-${o.id}`,
        icon: "alert",
        title: "Revisar pedido",
        code: `#${shortId}`,
        subtitle: o.attention_reason ?? customer?.full_name ?? "Pedido pede atenção",
        order,
        urgent: true,
      })
      continue
    }

    // Pago e com item físico: falta etiqueta ou postagem. E-book não tem envio.
    const physical = o.order_items.some((i) => i.product_type !== "ebook")
    const status = o.shipping_status
    if (!physical || ["posted", "in_transit", "delivered", "cancelled"].includes(status ?? "")) {
      continue
    }
    const printed = status === "printed"
    shippingTasks.push({
      key: `ship-${o.id}`,
      icon: printed ? "truck" : "printer",
      title: printed ? "Postar pedido" : "Gerar etiqueta",
      code: `#${shortId}`,
      subtitle: [
        customer?.full_name,
        o.me_service_name,
        status ? shippingLabels[status] : "sem etiqueta",
      ]
        .filter(Boolean)
        .join(" · "),
      order,
    })
  }

  const unreadByOrder = new Map<string, { shortId: string; count: number }>()
  for (const m of unreadMessages ?? []) {
    const prev = unreadByOrder.get(m.order_id)
    unreadByOrder.set(m.order_id, {
      shortId: m.orders?.short_id ?? m.order_id.slice(0, 6).toUpperCase(),
      count: (prev?.count ?? 0) + 1,
    })
  }
  const messageTasks: MobileTask[] = [...unreadByOrder].map(([orderId, m]) => ({
    key: `msg-${orderId}`,
    icon: "message",
    title: "Responder cliente",
    code: `#${m.shortId}`,
    subtitle: `${m.count} ${m.count === 1 ? "mensagem não lida" : "mensagens não lidas"}`,
    href: `/pedidos/${orderId}`,
  }))

  const leadTasks: MobileTask[] = newLeadsCount
    ? [
        {
          key: "leads",
          icon: "lead",
          title: newLeadsCount === 1 ? "1 lead novo" : `${newLeadsCount} leads novos`,
          subtitle: "Contatos e convites aguardando resposta",
          href: "/leads",
        },
      ]
    : []

  const fullName = profile?.full_name?.trim() || "Admin"
  const nameParts = fullName.split(/\s+/)

  let eventCard: MobileOverviewData["nextEvent"] = null
  if (nextEvent) {
    const start = new Date(nextEvent.start_date)
    const cityState = [nextEvent.city, nextEvent.state].filter(Boolean).join("/")
    eventCard = {
      id: nextEvent.id,
      day: start.toLocaleDateString("pt-BR", { timeZone: TZ, day: "2-digit" }),
      month: start
        .toLocaleDateString("pt-BR", { timeZone: TZ, month: "short" })
        .replace(".", "")
        .toUpperCase(),
      title: nextEvent.title,
      place: nextEvent.location_name ?? (cityState || null),
    }
  }

  return {
    dateLabel: greetingDate(now),
    todayKey: dayKey(now),
    nowMs: now.getTime(),
    firstName: nameParts[0]!,
    fullName,
    avatarUrl: profile?.avatar_url ?? null,
    payments,
    tasks: [...urgentTasks, ...shippingTasks, ...messageTasks, ...leadTasks],
    productsCount: productsCount ?? 0,
    upcomingEventsCount: upcomingEventsCount ?? 0,
    conversion: {
      purchasers: Number(cartFunnel?.unique_purchasers ?? 0),
      carts: Number(cartFunnel?.unique_carts ?? 0),
    },
    usersCount: usersCount ?? 0,
    nextEvent: eventCard,
    products: (products ?? []).map((p) => ({
      id: p.id,
      title: p.title,
      badge: productBadge(p.title),
      coverUrl: coverById.get(p.id) ?? null,
      price: Number(p.price),
      discount: Number(p.discount_percent ?? 0),
      stock: p.stock,
    })),
  }
}
