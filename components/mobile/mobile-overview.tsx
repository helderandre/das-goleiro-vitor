"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  BookOpen,
  BookPlus,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Filter,
  Loader2,
  MessageCircle,
  MessageSquare,
  PenLine,
  Printer,
  Truck,
  TriangleAlert,
  Users,
} from "lucide-react"

import { createPost } from "@/app/(dashboard)/blog/actions"
import { cn } from "@/lib/utils"
import { useMobileShell } from "./mobile-shell"
import { OrderSheet, type MobileOrder } from "./order-sheet"
import { formatBRL } from "./format"

export interface MobilePayment {
  total: number
  fee: number
  shipping: number
  /** Epoch ms do pagamento (mp_paid_at, senão created_at). */
  at: number
  /** "2026-09-18" no fuso de São Paulo. */
  day: string
}

export type TaskIcon = "truck" | "printer" | "alert" | "message" | "lead"

export interface MobileTask {
  key: string
  icon: TaskIcon
  title: string
  /** Trecho em fonte mono depois do título (ex.: "#8CC5EB"). */
  code?: string
  subtitle: string
  order?: MobileOrder
  href?: string
  urgent?: boolean
}

export interface MobileOverviewData {
  dateLabel: string
  todayKey: string
  /** Epoch ms da renderização no servidor; base de "7 dias" e "30 dias". */
  nowMs: number
  firstName: string
  initials: string
  payments: MobilePayment[]
  tasks: MobileTask[]
  productsCount: number
  upcomingEventsCount: number
  conversion: { purchasers: number; carts: number }
  usersCount: number
  nextEvent: {
    id: string
    day: string
    month: string
    title: string
    place: string | null
  } | null
  products: {
    id: string
    title: string
    badge: string
    price: number
    discount: number
    stock: number | null
  }[]
}

const periods = [
  { id: "hoje", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "tudo", label: "Tudo" },
] as const

type PeriodId = (typeof periods)[number]["id"]

const DAY = 86_400_000

const taskIcons: Record<TaskIcon, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  truck: Truck,
  printer: Printer,
  alert: TriangleAlert,
  message: MessageCircle,
  lead: MessageSquare,
}

export function MobileOverview({ data }: { data: MobileOverviewData }) {
  const { openMore } = useMobileShell()
  const [period, setPeriod] = React.useState<PeriodId>("tudo")
  const [sheetOrder, setSheetOrder] = React.useState<MobileOrder | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)

  const revenue = React.useMemo(() => {
    const now = data.nowMs
    const inPeriod = data.payments.filter((p) => {
      if (period === "hoje") return p.day === data.todayKey
      if (period === "7d") return p.at >= now - 7 * DAY
      if (period === "30d") return p.at >= now - 30 * DAY
      return true
    })
    const gross = inPeriod.reduce((s, p) => s + p.total, 0)
    const fee = inPeriod.reduce((s, p) => s + p.fee, 0)
    const shipping = inPeriod.reduce((s, p) => s + p.shipping, 0)
    return { count: inPeriod.length, gross, fee, shipping, net: gross - fee - shipping }
  }, [data.payments, data.todayKey, data.nowMs, period])

  function openOrder(order: MobileOrder) {
    setSheetOrder(order)
    setSheetOpen(true)
  }

  const pct = (v: number) => (revenue.gross > 0 ? (v / revenue.gross) * 100 : 0)
  const conversionRate =
    data.conversion.carts > 0
      ? Math.round((data.conversion.purchasers / data.conversion.carts) * 100)
      : 0

  return (
    <div className="flex flex-col gap-7 pt-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground first-letter:uppercase">
            {data.dateLabel}
          </span>
          <h1 className="truncate text-[32px] leading-tight font-extrabold tracking-tight">
            Olá, {data.firstName}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="#para-fazer"
            aria-label={
              data.tasks.length
                ? `${data.tasks.length} pendências`
                : "Nenhuma pendência"
            }
            className="relative flex size-11 items-center justify-center rounded-full border bg-card"
          >
            <Bell className="size-5" strokeWidth={1.8} />
            {data.tasks.length > 0 && (
              <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary ring-2 ring-card" />
            )}
          </a>
          <button
            type="button"
            onClick={openMore}
            aria-label="Conta e mais opções"
            className="flex size-11 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-primary-foreground"
          >
            {data.initials}
          </button>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Período"
        className="flex gap-1 rounded-[14px] border bg-card p-1"
      >
        {periods.map((p) => {
          const selected = period === p.id
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "h-9 grow rounded-[10px] text-sm transition-colors",
                selected
                  ? "bg-muted font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <section
        aria-label="Receita líquida"
        className="flex flex-col gap-[18px] rounded-3xl border bg-card p-[22px]"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
            Receita líquida
          </span>
          <span className="text-[44px] leading-none font-extrabold tracking-tighter">
            {formatBRL(revenue.net)}
          </span>
          <span className="text-sm text-muted-foreground">
            {revenue.count === 0
              ? "Nenhum pedido pago no período"
              : `de ${formatBRL(revenue.gross)} recebidos em ${revenue.count} ${revenue.count === 1 ? "pedido pago" : "pedidos pagos"}`}
          </span>
        </div>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
          {revenue.gross > 0 && (
            <>
              <div className="bg-primary" style={{ width: `${pct(revenue.net)}%` }} />
              <div
                className="bg-muted-foreground/60"
                style={{ width: `${pct(revenue.shipping)}%` }}
              />
              {revenue.fee > 0 && (
                <div
                  className="min-w-1 bg-destructive/80"
                  style={{ width: `${pct(revenue.fee)}%` }}
                />
              )}
            </>
          )}
        </div>
        <div className="flex flex-col gap-2.5 text-sm">
          <LegendRow color="bg-primary" label="Líquido" value={revenue.net} />
          <LegendRow color="bg-muted-foreground/60" label="Frete" value={revenue.shipping} />
          <LegendRow color="bg-destructive/80" label="Taxa Mercado Pago" value={revenue.fee} />
        </div>
      </section>

      <section id="para-fazer" aria-label="Para fazer agora" className="flex scroll-mt-4 flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[19px] font-bold tracking-tight">Para fazer agora</h2>
          {data.tasks.length > 0 && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-[7px] text-xs font-bold text-primary-foreground">
              {data.tasks.length}
            </span>
          )}
        </div>
        {data.tasks.length === 0 ? (
          <p className="rounded-[20px] border bg-card p-4 text-sm text-muted-foreground">
            Tudo em dia. Nenhum pedido esperando envio.
          </p>
        ) : (
          data.tasks.map((task) => {
            const Icon = taskIcons[task.icon]
            const className = cn(
              "flex w-full items-center gap-3.5 rounded-[20px] border bg-card p-3.5 text-left active:scale-[0.99]",
              task.urgent ? "border-destructive/40" : task.order && "border-primary/35",
            )
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
                    task.urgent
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">
                    {task.title}
                    {task.code && (
                      <span className="font-mono font-semibold"> {task.code}</span>
                    )}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {task.subtitle}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
              </>
            )
            return task.order ? (
              <button
                key={task.key}
                type="button"
                className={className}
                onClick={() => openOrder(task.order!)}
              >
                {body}
              </button>
            ) : (
              <Link key={task.key} href={task.href ?? "/"} className={className}>
                {body}
              </Link>
            )
          })
        )}
      </section>

      <Shortcuts />

      <section aria-label="Resumo" className="flex flex-col gap-3">
        <h2 className="text-[19px] font-bold tracking-tight">Resumo</h2>
        <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <StatCard href="/produtos" icon={BookOpen} value={data.productsCount} label="livros no catálogo" />
          <StatCard href="/agenda" icon={CalendarDays} value={data.upcomingEventsCount} label="eventos próximos" />
          <StatCard
            icon={Filter}
            value={`${conversionRate}%`}
            label={`${data.conversion.purchasers} de ${data.conversion.carts} carrinhos`}
          />
          <StatCard href="/usuarios" icon={Users} value={data.usersCount} label="usuários" />
        </div>
      </section>

      {data.nextEvent && (
        <section aria-label="Próximo evento" className="flex flex-col gap-3">
          <SectionHeader title="Próximo evento" href="/agenda" link="Agenda" />
          <Link
            href={`/agenda/${data.nextEvent.id}`}
            className="flex items-center gap-3.5 rounded-[20px] border bg-card p-3.5"
          >
            <span className="flex h-[60px] w-14 shrink-0 flex-col items-center justify-center gap-px rounded-[14px] bg-muted">
              <span className="text-[22px] leading-none font-extrabold">{data.nextEvent.day}</span>
              <span className="text-[11px] font-bold tracking-wider text-primary">
                {data.nextEvent.month}
              </span>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="line-clamp-2 text-[15px] leading-snug font-semibold">
                {data.nextEvent.title}
              </span>
              {data.nextEvent.place && (
                <span className="truncate text-[13px] text-muted-foreground">
                  {data.nextEvent.place}
                </span>
              )}
            </span>
          </Link>
        </section>
      )}

      {data.products.length > 0 && (
        <section aria-label="Estoque" className="flex flex-col gap-3">
          <SectionHeader title="Estoque" href="/produtos" link="Produtos" />
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            {data.products.map((p) => (
              <Link
                key={p.id}
                href={`/produtos/${p.id}`}
                className="flex items-center gap-3.5 p-3.5 active:bg-foreground/5"
              >
                <span className="flex h-[54px] w-10 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-xs font-bold text-primary">
                  {p.badge}
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{p.title}</span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {formatBRL(p.price)}
                    {p.discount > 0 && ` · ${p.discount}% off`}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={cn(
                      "text-[17px] font-bold",
                      p.stock !== null && p.stock <= 5 && "text-destructive",
                    )}
                  >
                    {p.stock ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">unid.</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <OrderSheet order={sheetOrder} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  )
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("size-2.5 shrink-0 rounded-[3px]", color)} />
      <span className="min-w-0 grow truncate text-foreground/85">{label}</span>
      <span className="shrink-0 font-semibold whitespace-nowrap">{formatBRL(value)}</span>
    </div>
  )
}

function SectionHeader({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
      <Link href={href} className="text-sm font-semibold text-primary">
        {link}
      </Link>
    </div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  value: React.ReactNode
  label: string
  href?: string
}) {
  const body = (
    <>
      <span className="flex size-9 items-center justify-center rounded-[11px] bg-muted text-foreground/80">
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[28px] leading-tight font-extrabold tracking-tight">{value}</span>
        <span className="truncate text-[13px] text-muted-foreground">{label}</span>
      </span>
    </>
  )
  const className =
    "flex w-[150px] shrink-0 snap-start flex-col gap-3.5 rounded-[20px] border bg-card p-4"
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}

function Shortcuts() {
  const [isPending, startTransition] = React.useTransition()

  const items = [
    { label: "Produto", icon: BookPlus, href: "/produtos/novo" },
    { label: "Evento", icon: CalendarPlus, href: "/agenda/novo" },
    { label: "Post", icon: PenLine },
    { label: "Etiquetas", icon: Printer, href: "/pedidos?status=paid" },
  ]

  const tile =
    "flex size-[60px] items-center justify-center rounded-[20px] border bg-card text-primary"

  return (
    <section aria-label="Atalhos" className="grid grid-cols-4 gap-2">
      {items.map((item) =>
        item.href ? (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-2 text-xs font-medium text-foreground/85"
          >
            <span className={tile}>
              <item.icon className="size-6" strokeWidth={1.8} />
            </span>
            {item.label}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await createPost()
              })
            }
            className="flex flex-col items-center gap-2 text-xs font-medium text-foreground/85"
          >
            <span className={tile}>
              {isPending ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <item.icon className="size-6" strokeWidth={1.8} />
              )}
            </span>
            {item.label}
          </button>
        ),
      )}
    </section>
  )
}
