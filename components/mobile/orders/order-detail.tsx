"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Package,
  Printer,
  QrCode,
  RefreshCw,
  TriangleAlert,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { formatPhone, whatsappNumber, whatsappOrderLink } from "@/lib/phone"
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABELS } from "@/lib/order-status"
import {
  checkPaymentStatus,
  createPaymentLink,
  createPixPayment,
} from "@/app/(dashboard)/pedidos/actions"
import { EMAIL_KIND_LABELS } from "@/lib/order-email-kinds"
import type { OrderEmail } from "@/components/order-emails"
import { formatBRL } from "../format"
import { shippingNotice } from "../order-sheet"
import { ProductCover } from "../products/product-list"
import {
  ActionsSheet,
  EmailsSheet,
  MessagesSheet,
  ProofSheet,
  RefundSheet,
  ShippingSheet,
  StatusSheet,
  TrackingSheet,
  type OrderMessage,
} from "./order-sheets"

export interface MobileOrderDetailProps {
  order: {
    id: string
    shortId: string
    status: string
    shippingStatus: string | null
    total: number
    subtotal: number
    shippingPrice: number
    fee: number | null
    createdLabel: string
    paidLabel: string | null
    shippedLabel: string | null
    deliveredLabel: string | null
    /** "hoje às 20:53" enquanto o pedido pendente não expira. */
    autoCancelLabel: string | null
    needsAttention: boolean
    attentionReason: string | null
    serviceName: string | null
    serviceId: number | null
    cartId: string | null
    labelUrl: string | null
    trackingCode: string | null
    trackingUrl: string | null
    paymentLabel: string | null
    mpPaymentId: string | null
    mpPaymentStatus: string | null
    paymentProofUrl: string | null
    hasPhysical: boolean
  }
  customer: { name: string | null; email: string | null; phone: string | null } | null
  address: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    zip_code?: string
  } | null
  items: { id: string; title: string; quantity: number; subtotal: number; coverUrl: string | null; isEbook: boolean }[]
  messages: OrderMessage[]
  emails: OrderEmail[]
  manualKinds: string[]
}

export type SheetId =
  | "shipping"
  | "actions"
  | "refund"
  | "messages"
  | "emails"
  | "status"
  | "tracking"
  | "proof"

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  pending: { label: "Aguardando", className: "bg-muted text-foreground/80" },
  in_process: { label: "Em análise", className: "bg-muted text-foreground/80" },
  rejected: { label: "Recusado", className: "bg-destructive/15 text-destructive" },
  cancelled: { label: "Cancelado", className: "bg-destructive/15 text-destructive" },
  refunded: { label: "Reembolsado", className: "bg-muted text-foreground/80" },
  charged_back: { label: "Contestado", className: "bg-destructive/15 text-destructive" },
}

function formatCep(zip?: string) {
  const d = (zip ?? "").replace(/\D/g, "")
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : zip
}

async function copy(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  } catch {
    toast.error("Não foi possível copiar")
  }
}

export function MobileOrderDetail(props: MobileOrderDetailProps) {
  const { order: o, customer, address, items, messages, emails, manualKinds } = props
  const [sheet, setSheet] = React.useState<SheetId | null>(null)
  const [running, setRunning] = React.useState<string | null>(null)

  const open = (id: SheetId) => setSheet(id)
  const sheetProps = (id: SheetId) => ({
    open: sheet === id,
    onOpenChange: (next: boolean) => setSheet(next ? id : null),
  })

  const status = o.status
  const isPaidLike = ["paid", "shipped", "delivered"].includes(status)
  const waLink = whatsappOrderLink(customer?.phone ?? null, customer?.name ?? null, `#${o.shortId}`)
  const trackUrl = o.trackingCode
    ? (o.trackingUrl ?? `https://www.melhorrastreio.com.br/rastreio/${o.trackingCode}`)
    : null
  const notice = status === "paid" && o.hasPhysical ? shippingNotice(o.shippingStatus) : null
  const unread = messages.filter((m) => m.sender_role === "customer" && !m.read_at).length
  const net = o.total - (o.fee ?? 0) - o.shippingPrice

  // Andamento: Pago → Etiqueta → Postado → Entregue.
  const labelDone =
    ["generated", "printed", "posted", "in_transit", "delivered"].includes(o.shippingStatus ?? "") ||
    ["shipped", "delivered"].includes(status)
  const steps = [
    { label: "Pago", done: isPaidLike },
    { label: "Etiqueta", done: labelDone },
    { label: "Postado", done: ["shipped", "delivered"].includes(status) },
    { label: "Entregue", done: status === "delivered" },
  ]
  const current = steps.findIndex((s) => !s.done)

  function paymentAction(key: "link" | "pix" | "check") {
    setRunning(key)
    const run = async () => {
      if (key === "link") {
        const r = await createPaymentLink(o.id)
        if ("error" in r) return toast.error(r.error)
        if (r.checkoutUrl) await copy(r.checkoutUrl, "Link de pagamento copiado")
      } else if (key === "pix") {
        const r = await createPixPayment(o.id)
        if ("error" in r) return toast.error(r.error)
        const code = r.payment?.pix_qr_code
        if (code) await copy(code, "Pix copia-e-cola copiado")
      } else {
        const r = await checkPaymentStatus(o.id)
        if ("error" in r) return toast.error(r.error)
        toast.success(`Pagamento: ${PAYMENT_STATUS[r.payment?.status ?? ""]?.label ?? r.payment?.status ?? "consultado"}`)
      }
    }
    run().finally(() => setRunning(null))
  }

  /**
   * Cobrança pelo WhatsApp: gera o link do Mercado Pago e abre a conversa já
   * com ele. A janela abre antes do await para o navegador não bloquear.
   */
  function chargeOnWhatsApp() {
    const phone = customer?.phone ? whatsappNumber(customer.phone) : null
    if (!phone) return toast.error("Cliente sem celular cadastrado")
    const win = window.open("", "_blank")
    setRunning("charge")
    createPaymentLink(o.id)
      .then((r) => {
        if ("error" in r || !r.checkoutUrl) {
          win?.close()
          toast.error("error" in r ? r.error : "Não foi possível gerar o link")
          return
        }
        const first = customer?.name?.trim().split(/\s+/)[0]
        const text = `Olá${first ? `, ${first}` : ""}! Aqui é da loja Goleiro Vitor. Segue o link para pagar o pedido #${o.shortId}: ${r.checkoutUrl}`
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
        if (win) win.location.href = url
        else window.location.href = url
      })
      .finally(() => setRunning(null))
  }

  const primary = (() => {
    if (status === "pending")
      return { label: "Cobrar no WhatsApp", onClick: chargeOnWhatsApp, busy: running === "charge" }
    if (status === "paid" && o.hasPhysical)
      return { label: "Etapas do envio", onClick: () => open("shipping") }
    if (status === "shipped" && trackUrl) return { label: "Rastrear pedido", href: trackUrl }
    return { label: unread ? `Mensagens (${unread})` : "Mensagens", onClick: () => open("messages") }
  })()

  const btn2 =
    "flex h-[46px] items-center justify-center gap-2 rounded-[14px] border bg-muted/60 text-sm font-semibold active:scale-[0.98] disabled:opacity-60"

  return (
    <div className="flex flex-col gap-[26px] pt-1">
      <div className="flex items-center justify-between">
        <Link
          href="/pedidos"
          aria-label="Voltar para pedidos"
          className="flex size-11 items-center justify-center rounded-full border bg-card"
        >
          <ChevronLeft className="size-[22px]" />
        </Link>
        <button
          type="button"
          onClick={() => open("actions")}
          aria-label="Mais ações do pedido"
          className="flex size-11 items-center justify-center rounded-full border bg-card"
        >
          <MoreHorizontal className="size-[22px]" />
        </button>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="font-mono text-[26px] font-semibold">#{o.shortId}</h1>
          <span
            className={cn(
              "flex h-[26px] items-center rounded-full px-[11px] text-[13px] font-bold",
              ORDER_STATUS_CHIP[status] ?? ORDER_STATUS_CHIP.pending,
            )}
          >
            {ORDER_STATUS_LABELS[status] ?? status}
          </span>
        </div>
        <span className="truncate text-sm text-muted-foreground">
          {[customer?.name, o.createdLabel].filter(Boolean).join(" · ")}
        </span>
        <span className="mt-1.5 text-[44px] leading-none font-extrabold tracking-tighter">
          {formatBRL(o.total)}
        </span>
        <span className="text-sm text-muted-foreground">
          {isPaidLike
            ? `Pago${o.paymentLabel ? ` via ${o.paymentLabel}` : ""}${o.fee != null ? ` · líquido ${formatBRL(net)}` : ""}`
            : status === "cancelled"
              ? "Pedido cancelado"
              : "Aguardando pagamento"}
        </span>
      </header>

      {status !== "cancelled" && o.hasPhysical && (
        <ol aria-label="Andamento do pedido" className="grid grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.label} className="flex flex-col gap-2">
              <span className="flex items-center">
                <span
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                    s.done
                      ? "bg-primary text-primary-foreground"
                      : i === current
                        ? "border-2 border-primary"
                        : "border-2 border-muted-foreground/30",
                  )}
                >
                  {s.done && "✓"}
                </span>
                <span
                  className={cn(
                    "mx-1 h-0.5 grow",
                    i === steps.length - 1 ? "invisible" : s.done ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-xs",
                  s.done || i === current ? "font-semibold" : "font-medium text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      )}

      {o.needsAttention && (
        <Callout tone="alerta" icon={TriangleAlert} title="Este pedido precisa de revisão">
          {o.attentionReason ?? "Verifique o pagamento e o status do pedido."}
        </Callout>
      )}

      {status === "pending" && (
        <Callout
          tone="neutro"
          icon={Clock}
          title="Aguardando pagamento"
          footer={
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" className={btn2} disabled={!!running} onClick={() => paymentAction("link")}>
                {running === "link" ? <Loader2 className="size-[18px] animate-spin" /> : <Copy className="size-[18px]" />}
                Link de pagamento
              </button>
              <button type="button" className={btn2} disabled={!!running} onClick={() => paymentAction("pix")}>
                {running === "pix" ? <Loader2 className="size-[18px] animate-spin" /> : <QrCode className="size-[18px]" />}
                Gerar Pix
              </button>
            </div>
          }
        >
          {o.autoCancelLabel
            ? `Se não for pago, o pedido é cancelado sozinho ${o.autoCancelLabel} e o estoque volta.`
            : "O prazo de pagamento acabou; o cancelamento automático roda em instantes."}
        </Callout>
      )}

      {notice && (
        <Callout
          tone="acao"
          icon={Truck}
          title={notice.title}
          footer={
            <div className="grid grid-cols-2 gap-2.5">
              {o.labelUrl ? (
                <a href={o.labelUrl} target="_blank" rel="noopener noreferrer" className={btn2}>
                  <Printer className="size-[18px]" />
                  Ver etiqueta
                </a>
              ) : (
                <button type="button" className={btn2} onClick={() => open("shipping")}>
                  <Printer className="size-[18px]" />
                  Etiqueta
                </button>
              )}
              <button type="button" className={btn2} onClick={() => open("shipping")}>
                <Package className="size-[18px]" />
                Etapas do envio
              </button>
            </div>
          }
        >
          {notice.text}
        </Callout>
      )}

      {status === "shipped" && (
        <Callout tone="info" icon={Truck} title="Em trânsito">
          {o.shippedLabel ? `Postado ${o.shippedLabel}. ` : ""}Quando os Correios marcarem como entregue, o pedido fecha sozinho e o cliente recebe o e-mail de concluído.
        </Callout>
      )}

      {status === "delivered" && (
        <Callout tone="ok" icon={CircleCheck} title="Pedido entregue">
          {o.deliveredLabel ? `Entregue ${o.deliveredLabel}.` : "O cliente já recebeu o pedido."}
        </Callout>
      )}

      {status === "cancelled" && (
        <Callout tone="neutro" icon={XCircle} title="Pedido cancelado">
          O estoque voltou e o cliente foi avisado por e-mail.
        </Callout>
      )}

      {o.trackingCode && (
        <div className="flex items-center gap-2.5 rounded-[20px] border bg-card py-3.5 pr-3.5 pl-4">
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Rastreio{o.serviceName ? ` · ${o.serviceName}` : ""}
            </span>
            <span className="truncate font-mono text-[17px] font-semibold tracking-wide">{o.trackingCode}</span>
          </span>
          <button
            type="button"
            aria-label="Copiar código de rastreio"
            onClick={() => copy(o.trackingCode!, "Código de rastreio copiado")}
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-muted/60 active:scale-95"
          >
            <Copy className="size-[18px]" strokeWidth={1.8} />
          </button>
          {trackUrl && (
            <a
              href={trackUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Rastrear"
              className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-muted/60"
            >
              <ExternalLink className="size-[18px]" strokeWidth={1.8} />
            </a>
          )}
        </div>
      )}

      <Section title="Cliente">
        {customer ? (
          <div className="flex flex-col gap-3.5 rounded-[20px] border bg-card p-4">
            <span className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-base font-bold text-foreground/80">
                {(customer.name ?? "?")
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-base font-bold">{customer.name ?? "—"}</span>
                <span className="truncate text-[13px] text-muted-foreground">{customer.email}</span>
                {customer.phone && (
                  <span className="truncate text-[13px] text-muted-foreground">{formatPhone(customer.phone)}</span>
                )}
              </span>
            </span>
            <div className="grid grid-cols-3 gap-2">
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className={cn(btn2, "h-16 flex-col gap-1 text-xs")}>
                  <MessageCircle className="size-5" strokeWidth={1.8} />
                  WhatsApp
                </a>
              ) : (
                <span className={cn(btn2, "h-16 flex-col gap-1 text-xs opacity-40")}>
                  <MessageCircle className="size-5" strokeWidth={1.8} />
                  Sem celular
                </span>
              )}
              <a
                href={customer.email ? `mailto:${customer.email}?subject=${encodeURIComponent(`Pedido #${o.shortId}`)}` : undefined}
                className={cn(btn2, "h-16 flex-col gap-1 text-xs", !customer.email && "pointer-events-none opacity-40")}
              >
                <Mail className="size-5" strokeWidth={1.8} />
                E-mail
              </a>
              <button
                type="button"
                className={cn(btn2, "h-16 flex-col gap-1 text-xs")}
                onClick={() =>
                  copy(
                    [customer.name, customer.email, customer.phone ? formatPhone(customer.phone) : null]
                      .filter(Boolean)
                      .join("\n"),
                    "Dados do cliente copiados",
                  )
                }
              >
                <Copy className="size-5" strokeWidth={1.8} />
                Copiar dados
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-[20px] border bg-card p-4 text-sm text-muted-foreground">Cliente não identificado</p>
        )}
      </Section>

      {address && (
        <Section title="Entrega">
          <div className="flex gap-3 rounded-[20px] border bg-card p-4">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <span className="flex min-w-0 grow flex-col gap-0.5 text-[15px] leading-snug">
              <span className="font-semibold">
                {[address.street, address.number].filter(Boolean).join(", ")}
                {address.complement ? ` · ${address.complement}` : ""}
              </span>
              <span className="text-foreground/80">
                {[address.neighborhood, [address.city, address.state].filter(Boolean).join("/")]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="text-[13px] text-muted-foreground">
                {[address.zip_code && `CEP ${formatCep(address.zip_code)}`, o.serviceName].filter(Boolean).join(" · ")}
              </span>
            </span>
            <button
              type="button"
              aria-label="Copiar endereço"
              onClick={() =>
                copy(
                  [
                    [address.street, address.number].filter(Boolean).join(", "),
                    address.complement,
                    address.neighborhood,
                    [address.city, address.state].filter(Boolean).join(" - "),
                    address.zip_code && `CEP ${formatCep(address.zip_code)}`,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                  "Endereço copiado",
                )
              }
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/60"
            >
              <Copy className="size-4" strokeWidth={1.8} />
            </button>
          </div>
        </Section>
      )}

      <Section title="Itens e valores">
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
              <ProductCover url={item.coverUrl} title={item.title} className="h-14 w-10 rounded-md text-sm shadow-none" />
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{item.title}</span>
                <span className="text-[13px] text-muted-foreground">
                  {item.isEbook ? "E-book" : "Físico"} · × {item.quantity}
                </span>
              </span>
              <span className="text-[15px] font-semibold whitespace-nowrap">{formatBRL(item.subtotal)}</span>
            </div>
          ))}
          {o.shippingPrice > 0 && (
            <div className="flex justify-between gap-3 px-4 py-3.5 text-[15px]">
              <span className="min-w-0 truncate text-foreground/80">Frete{o.serviceName ? ` · ${o.serviceName}` : ""}</span>
              <span className="font-semibold whitespace-nowrap">{formatBRL(o.shippingPrice)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 px-4 py-3.5">
            <span className="text-[15px] font-bold">{isPaidLike ? "Total pago" : "Total"}</span>
            <span className="text-xl font-extrabold tracking-tight">{formatBRL(o.total)}</span>
          </div>
          {isPaidLike && o.fee != null && (
            <div className="flex flex-col gap-2 bg-foreground/[0.03] px-4 py-3.5 text-sm">
              <span className="flex justify-between">
                <span className="text-muted-foreground">Taxa Mercado Pago</span>
                <span className="whitespace-nowrap text-destructive">− {formatBRL(o.fee)}</span>
              </span>
              {o.shippingPrice > 0 && (
                <span className="flex justify-between">
                  <span className="text-muted-foreground">Frete repassado</span>
                  <span className="whitespace-nowrap text-muted-foreground">− {formatBRL(o.shippingPrice)}</span>
                </span>
              )}
              <span className="flex justify-between pt-1">
                <span className="font-bold">Líquido da loja</span>
                <span className="font-extrabold whitespace-nowrap text-primary">{formatBRL(net)}</span>
              </span>
            </div>
          )}
          {Math.abs(o.subtotal + o.shippingPrice - o.total) > 0.01 && (
            <p className="flex gap-1.5 px-4 py-3 text-xs text-destructive">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              Total não bate com subtotal + frete ({formatBRL(o.subtotal + o.shippingPrice)}).
            </p>
          )}
        </div>
      </Section>

      <Section title="Pagamento">
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <Row label="Meio" value={o.paymentLabel ?? "—"} />
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
            <span className="text-foreground/80">Status no Mercado Pago</span>
            {o.mpPaymentStatus ? (
              <span
                className={cn(
                  "flex h-6 items-center rounded-full px-2.5 text-xs font-bold",
                  PAYMENT_STATUS[o.mpPaymentStatus]?.className ?? "bg-muted",
                )}
              >
                {PAYMENT_STATUS[o.mpPaymentStatus]?.label ?? o.mpPaymentStatus}
              </span>
            ) : (
              <span className="text-muted-foreground">Sem cobrança</span>
            )}
          </div>
          {o.paidLabel && <Row label="Pago em" value={o.paidLabel} />}
          <div className="grid grid-cols-2 gap-2.5 p-4 pt-3">
            <button type="button" className={btn2} disabled={!!running} onClick={() => paymentAction("check")}>
              {running === "check" ? <Loader2 className="size-[17px] animate-spin" /> : <RefreshCw className="size-[17px]" />}
              Consultar MP
            </button>
            <button type="button" className={btn2} onClick={() => open("proof")}>
              <FileText className="size-[17px]" />
              Comprovante
            </button>
          </div>
        </div>
      </Section>

      <Section title="Conversa e e-mails">
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <ListButton
            icon={MessagesSquare}
            title="Mensagens"
            subtitle={
              messages.length === 0
                ? "Nenhuma mensagem ainda"
                : unread
                  ? `${unread} ${unread === 1 ? "nova" : "novas"} · ${messages.length} no total`
                  : `${messages.length} ${messages.length === 1 ? "mensagem" : "mensagens"}`
            }
            badge={unread || undefined}
            onClick={() => open("messages")}
          />
          <ListButton
            icon={Mail}
            title="E-mails"
            subtitle={
              emails.length === 0
                ? "Nenhum e-mail enviado"
                : `${EMAIL_KIND_LABELS[emails[emails.length - 1].kind] ?? "E-mail"} · ${emails.length} ${emails.length === 1 ? "enviado" : "enviados"}`
            }
            onClick={() => open("emails")}
          />
        </div>
      </Section>

      {status !== "cancelled" && (
        <button
          type="button"
          onClick={() => open("refund")}
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl border border-destructive/35 bg-destructive/10 text-base font-semibold text-destructive"
        >
          <Undo2 className="size-[18px]" />
          {o.mpPaymentId ? "Cancelar e devolver dinheiro" : "Cancelar pedido"}
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t bg-background/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Conversar no WhatsApp"
            className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-card"
          >
            <MessageCircle className="size-[22px]" strokeWidth={1.8} />
          </a>
        )}
        {"href" in primary && primary.href ? (
          <a
            href={primary.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[54px] grow items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground"
          >
            {primary.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={"onClick" in primary ? primary.onClick : undefined}
            disabled={"busy" in primary && primary.busy}
            className="flex h-[54px] grow items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {"busy" in primary && primary.busy && <Loader2 className="size-4 animate-spin" />}
            {primary.label}
          </button>
        )}
      </div>

      <ShippingSheet {...sheetProps("shipping")} order={o} />
      <ActionsSheet {...sheetProps("actions")} order={o} onPick={(id) => setSheet(id)} running={running} onCheckPayment={() => paymentAction("check")} />
      <RefundSheet {...sheetProps("refund")} order={o} />
      <MessagesSheet {...sheetProps("messages")} orderId={o.id} shortId={o.shortId} customerName={customer?.name ?? null} messages={messages} />
      <EmailsSheet {...sheetProps("emails")} orderId={o.id} recipient={customer?.email ?? null} emails={emails} manualKinds={manualKinds} />
      <StatusSheet {...sheetProps("status")} orderId={o.id} status={status} />
      <TrackingSheet {...sheetProps("tracking")} orderId={o.id} code={o.trackingCode} />
      <ProofSheet {...sheetProps("proof")} orderId={o.id} url={o.paymentProofUrl} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-3.5 text-[15px]">
      <span className="text-foreground/80">{label}</span>
      <span className="font-semibold whitespace-nowrap">{value}</span>
    </div>
  )
}

function ListButton({
  icon: Icon,
  title,
  subtitle,
  badge,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  subtitle: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 items-center gap-3.5 px-3.5 py-2.5 text-left active:bg-foreground/5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
        <Icon className="size-[21px]" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        <span className="truncate text-[13px] text-muted-foreground">{subtitle}</span>
      </span>
      {badge && (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
          {badge}
        </span>
      )}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

function Callout({
  tone,
  icon: Icon,
  title,
  children,
  footer,
}: {
  tone: "acao" | "alerta" | "info" | "ok" | "neutro"
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const styles = {
    acao: ["border-primary/30 bg-primary/10", "text-primary"],
    alerta: ["border-destructive/35 bg-destructive/10", "text-destructive"],
    info: ["border-blue-500/30 bg-blue-500/10", "text-blue-600 dark:text-blue-300"],
    ok: ["border-emerald-500/30 bg-emerald-500/10", "text-emerald-600 dark:text-emerald-300"],
    neutro: ["bg-card", "text-muted-foreground"],
  }[tone]
  return (
    <section className={cn("flex flex-col gap-3.5 rounded-[20px] border p-4", styles[0])}>
      <span className="flex gap-3">
        <Icon className={cn("mt-px size-[22px] shrink-0", styles[1])} strokeWidth={1.8} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{title}</span>
          <span className="text-[13px] leading-snug text-foreground/80">{children}</span>
        </span>
      </span>
      {footer}
    </section>
  )
}
