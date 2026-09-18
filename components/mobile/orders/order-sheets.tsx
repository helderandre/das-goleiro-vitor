"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check,
  FileText,
  Loader2,
  RefreshCw,
  Send,
  Tag,
  Truck,
  Undo2,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ORDER_STATUS_LABELS } from "@/lib/order-status"
import { EMAIL_KIND_LABELS } from "@/lib/order-email-kinds"
import {
  cancelLabel,
  markMessagesAsRead,
  quoteShipping,
  refundOrder,
  resendOrderEmail,
  runLabelAction,
  sendOrderEmailManually,
  sendOrderMessage,
  setShippingService,
  updateOrderStatus,
  updateTrackingCode,
} from "@/app/(dashboard)/pedidos/actions"
import type { OrderEmail } from "@/components/order-emails"
import { OrderPaymentProof } from "@/components/order-payment-proof"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "../format"
import type { MobileOrderDetailProps, SheetId } from "./order-detail"

type Order = MobileOrderDetailProps["order"]

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface OrderMessage {
  id: string
  message: string
  sender_role: string
  read_at: string | null
  created_at: string | null
}

const primaryBtn =
  "flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
const closeBtn = "h-[52px] rounded-2xl border bg-muted/60 text-base font-semibold"

function SheetShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: SheetProps & {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className={cn("gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]", className)}>
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">{title}</DrawerTitle>
          {description && <DrawerDescription className="text-sm">{description}</DrawerDescription>}
        </div>
        {children}
      </DrawerContent>
    </Drawer>
  )
}

/* -------------------------------------------------------------------------- */
/* Etapas do envio                                                            */
/* -------------------------------------------------------------------------- */

type LabelAction = "add_to_cart" | "checkout" | "generate" | "print"

interface Quote {
  id: number
  servico: string
  transportadora: string
  preco: string | number | null
  prazo_dias: number | null
}

export function ShippingSheet({ order: o, ...sheet }: SheetProps & { order: Order }) {
  const router = useRouter()
  const [running, setRunning] = React.useState<string | null>(null)
  const [quotes, setQuotes] = React.useState<Quote[] | null>(null)
  const s = o.shippingStatus ?? ""
  const after = (list: string[]) => list.includes(s)

  const steps: { key: LabelAction; title: string; sub: string; cta: string; done: boolean }[] = [
    {
      key: "add_to_cart",
      title: "Adicionar ao carrinho do ME",
      sub: "Cria o envio com o remetente e o endereço do pedido",
      cta: "Adicionar",
      done: !!o.cartId,
    },
    {
      key: "checkout",
      title: "Pagar etiqueta",
      sub: `Debita ${o.shippingPrice ? formatBRL(o.shippingPrice) : "o frete"} do saldo do Melhor Envio`,
      cta: "Pagar",
      done: after(["paid", "generated", "printed", "posted", "in_transit", "delivered"]),
    },
    {
      key: "generate",
      title: "Gerar etiqueta",
      sub: "Emite a etiqueta no Melhor Envio",
      cta: "Gerar",
      done: after(["generated", "printed", "posted", "in_transit", "delivered"]),
    },
    {
      key: "print",
      title: "Imprimir",
      sub: "Abre o PDF para colar no pacote",
      cta: "Imprimir",
      done: !!o.labelUrl,
    },
  ]
  const next = steps.findIndex((step) => !step.done)
  const needsService = !o.serviceId

  async function run(key: string, fn: () => Promise<{ error?: string } & Record<string, unknown>>) {
    setRunning(key)
    try {
      const result = await fn()
      if (result.error) {
        toast.error(result.error)
        return null
      }
      router.refresh()
      return result
    } finally {
      setRunning(null)
    }
  }

  async function doStep(key: LabelAction) {
    // Janela aberta antes do await, senão o navegador do celular bloqueia.
    const win = key === "print" ? window.open("", "_blank") : null
    const result = await run(key, () => runLabelAction(o.id, key))
    if (key !== "print") {
      if (result) toast.success("Etapa concluída")
      return
    }
    const data = result?.data as { url?: string } | undefined
    const url = data?.url ?? o.labelUrl
    if (url && win) win.location.href = url
    else win?.close()
  }

  return (
    <SheetShell
      {...sheet}
      title="Etapas do envio"
      description={["Melhor Envio", o.serviceName, o.shippingPrice ? formatBRL(o.shippingPrice) : null]
        .filter(Boolean)
        .join(" · ")}
      className="data-[vaul-drawer-direction=bottom]:max-h-[92svh]"
    >
      <div className="-mx-5 flex flex-col gap-[18px] overflow-y-auto px-5">
        {needsService && !quotes && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
            <span className="text-sm leading-snug">
              Este pedido não tem serviço de frete escolhido. Cote e escolha antes de montar a etiqueta.
            </span>
            <button
              type="button"
              disabled={!!running}
              onClick={async () => {
                const result = await run("quote", () => quoteShipping(o.id))
                if (result) setQuotes((result.options as Quote[]) ?? [])
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {running === "quote" && <Loader2 className="size-4 animate-spin" />}
              Cotar frete
            </button>
          </div>
        )}

        {quotes && (
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
            {quotes.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum serviço disponível.</p>}
            {quotes.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={!!running}
                onClick={async () => {
                  const ok = await run(`svc-${q.id}`, () =>
                    setShippingService(o.id, q.id, q.servico, Number(q.preco)),
                  )
                  if (ok) {
                    toast.success(`${q.servico} selecionado`)
                    setQuotes(null)
                  }
                }}
                className="flex min-h-14 items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="flex grow flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{q.servico}</span>
                  <span className="text-xs text-muted-foreground">
                    {q.transportadora}
                    {q.prazo_dias ? ` · ${q.prazo_dias} dias úteis` : ""}
                  </span>
                </span>
                {running === `svc-${q.id}` ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="font-bold whitespace-nowrap">{formatBRL(Number(q.preco))}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <ol className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
          {steps.map((step, i) => {
            const isNext = i === next && !needsService
            return (
              <li key={step.key} className="flex min-h-[60px] items-center gap-3.5 px-3.5 py-2.5">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                    step.done
                      ? "bg-primary text-primary-foreground"
                      : i === next
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="size-4" strokeWidth={3} /> : i + 1}
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-[15px]",
                      step.done ? "font-medium text-muted-foreground line-through" : "font-semibold",
                    )}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{step.sub}</span>
                </span>
                {(isNext || (step.key === "print" && step.done)) && (
                  <button
                    type="button"
                    disabled={!!running}
                    onClick={() => doStep(step.key)}
                    className={cn(
                      "flex h-[38px] shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold disabled:opacity-60",
                      isNext ? "bg-primary text-primary-foreground" : "border bg-card",
                    )}
                  >
                    {running === step.key && <Loader2 className="size-3.5 animate-spin" />}
                    {step.done ? "De novo" : step.cta}
                  </button>
                )}
              </li>
            )
          })}
          <li className="flex min-h-[60px] items-center gap-3.5 px-3.5 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30">
              <Truck className="size-3.5 text-muted-foreground" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">Postar na agência</span>
              <span className="text-xs text-muted-foreground">Os Correios leem o pacote e o pedido vira Enviado</span>
            </span>
          </li>
        </ol>

        <span className="text-[13px] leading-snug text-muted-foreground">
          {next === -1
            ? "Falta só postar. Não há botão para isso: o Melhor Envio avisa sozinho quando os Correios leem o pacote."
            : "Cada passo libera o próximo. Um toque faz a etapa no Melhor Envio."}
        </span>

        {o.cartId && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={!!running}
              onClick={async () => {
                const result = await run("tracking", () => runLabelAction(o.id, "tracking"))
                if (!result) return
                const code = (result.data as { tracking_code?: string | null } | undefined)?.tracking_code
                if (code) toast.success(`Rastreio: ${code}`)
                else toast.info("Ainda sem código. A transportadora só emite depois da postagem.")
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border bg-card text-sm font-semibold disabled:opacity-60"
            >
              {running === "tracking" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Atualizar rastreio
            </button>
            <button
              type="button"
              disabled={!!running}
              onClick={async () => {
                const result = await run("cancel", () => cancelLabel(o.id))
                if (result) toast.success((result.message as string) ?? "Etiqueta cancelada")
              }}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-destructive/35 text-sm font-semibold text-destructive disabled:opacity-60"
            >
              {running === "cancel" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              Cancelar etiqueta
            </button>
          </div>
        )}

        <button type="button" onClick={() => sheet.onOpenChange(false)} className={closeBtn}>
          Fechar
        </button>
      </div>
    </SheetShell>
  )
}

/* -------------------------------------------------------------------------- */
/* Ações menos usadas (menu "…")                                              */
/* -------------------------------------------------------------------------- */

export function ActionsSheet({
  order: o,
  onPick,
  running,
  onCheckPayment,
  ...sheet
}: SheetProps & {
  order: Order
  onPick: (id: SheetId) => void
  running: string | null
  onCheckPayment: () => void
}) {
  const rows: {
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
    label: string
    sub?: string
    onClick: () => void
    danger?: boolean
    busy?: boolean
  }[] = [
    {
      icon: Tag,
      label: "Mudar status à mão",
      sub: `Hoje: ${ORDER_STATUS_LABELS[o.status] ?? o.status}. Use só se algo travar`,
      onClick: () => onPick("status"),
    },
    {
      icon: Truck,
      label: "Editar código de rastreio",
      sub: "Sobrescreve o que veio do Melhor Envio",
      onClick: () => onPick("tracking"),
    },
    {
      icon: FileText,
      label: o.paymentProofUrl ? "Comprovante de pagamento" : "Enviar comprovante",
      sub: o.paymentProofUrl ? "Ver, trocar ou remover" : "Foto ou PDF do pagamento",
      onClick: () => onPick("proof"),
    },
    {
      icon: RefreshCw,
      label: "Consultar pagamento no MP",
      sub: "Atualiza status e taxa",
      onClick: () => {
        sheet.onOpenChange(false)
        onCheckPayment()
      },
      busy: running === "check",
    },
  ]
  if (o.status !== "cancelled")
    rows.push({
      icon: Undo2,
      label: o.mpPaymentId ? "Cancelar e devolver" : "Cancelar pedido",
      onClick: () => onPick("refund"),
      danger: true,
    })

  return (
    <SheetShell {...sheet} title={`Pedido #${o.shortId}`} description="Ações menos usadas">
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        {rows.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={r.onClick}
            className={cn(
              "flex min-h-[62px] items-center gap-3.5 px-3.5 py-2 text-left active:bg-foreground/5",
              r.danger && "text-destructive",
            )}
          >
            <span
              className={cn(
                "flex size-[42px] shrink-0 items-center justify-center rounded-[13px]",
                r.danger ? "bg-destructive/15" : "bg-primary/15 text-primary",
              )}
            >
              {r.busy ? <Loader2 className="size-5 animate-spin" /> : <r.icon className="size-5" strokeWidth={1.8} />}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-semibold">{r.label}</span>
              {r.sub && <span className="text-[13px] text-muted-foreground">{r.sub}</span>}
            </span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => sheet.onOpenChange(false)} className={closeBtn}>
        Fechar
      </button>
    </SheetShell>
  )
}

/* -------------------------------------------------------------------------- */
/* Cancelar e devolver                                                        */
/* -------------------------------------------------------------------------- */

type RefundKind = "full" | "products_only" | "custom"

export function RefundSheet({ order: o, ...sheet }: SheetProps & { order: Order }) {
  const router = useRouter()
  const isShipped = ["shipped", "delivered"].includes(o.status)
  const hasPayment = !!o.mpPaymentId
  const [kind, setKind] = React.useState<RefundKind>(isShipped ? "products_only" : "full")
  const [amount, setAmount] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const productsOnly = Number((o.total - o.shippingPrice).toFixed(2))
  const customValue = Number(amount.replace(/\./g, "").replace(",", "."))
  const value = kind === "full" ? o.total : kind === "products_only" ? productsOnly : customValue
  const validCustom = kind !== "custom" || (customValue > 0 && customValue <= o.total)

  const options: { id: RefundKind; label: string; hint: string; value: string }[] = [
    { id: "full", label: "Tudo", hint: "Produtos e frete", value: formatBRL(o.total) },
    ...(o.shippingPrice > 0
      ? [{ id: "products_only" as const, label: "Sem o frete", hint: "Use quando o pedido já foi postado", value: formatBRL(productsOnly) }]
      : []),
    { id: "custom", label: "Outro valor", hint: "Ex.: devolução de um item", value: "" },
  ]

  function submit() {
    startTransition(async () => {
      const result = await refundOrder(o.id, {
        kind,
        amount: kind === "custom" ? customValue : undefined,
        reason: reason || undefined,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? "Pedido cancelado")
      sheet.onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <SheetShell
      {...sheet}
      title={hasPayment ? "Cancelar e devolver" : "Cancelar pedido"}
      description={
        hasPayment
          ? "Se o pagamento ainda não foi aprovado, ele é cancelado. Se já foi, o valor volta ao cliente pelo Mercado Pago."
          : "Não há pagamento registrado: o pedido é encerrado e o estoque volta."
      }
      className="data-[vaul-drawer-direction=bottom]:max-h-[92svh]"
    >
      <div className="-mx-5 flex flex-col gap-[18px] overflow-y-auto px-5">
        {hasPayment && (
          <div role="radiogroup" aria-label="Quanto devolver" className="flex flex-col gap-2">
            {options.map((opt) => {
              const on = kind === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setKind(opt.id)}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-2.5 text-left",
                    on ? "border-destructive bg-destructive/10" : "border-transparent bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                      on ? "border-destructive" : "border-muted-foreground/40",
                    )}
                  >
                    {on && <span className="size-2.5 rounded-full bg-destructive" />}
                  </span>
                  <span className="flex grow flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.hint}</span>
                  </span>
                  {opt.value && <span className="text-base font-extrabold whitespace-nowrap">{opt.value}</span>}
                </button>
              )
            })}
          </div>
        )}

        {hasPayment && kind === "custom" && (
          <label className="flex min-h-14 items-center gap-3 rounded-2xl bg-muted/60 px-4">
            <span className="grow text-[15px] text-foreground/80">Valor a devolver</span>
            <span className="text-muted-foreground">R$</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="0,00"
              className="w-24 bg-transparent text-right text-[17px] font-bold outline-none"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 rounded-2xl bg-muted/60 px-3.5 py-3">
          <span className="text-xs font-semibold text-muted-foreground">Motivo (opcional)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: cliente desistiu da compra"
            className="bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
          />
        </label>

        <span className="text-[13px] leading-snug text-muted-foreground">
          O pedido vira Cancelado, o estoque volta e o cliente recebe o e-mail de pagamento cancelado.
        </span>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !validCustom}
            className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-destructive text-base font-bold text-white disabled:opacity-50"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {hasPayment
              ? `Cancelar e devolver ${validCustom && value > 0 ? formatBRL(value) : ""}`.trim()
              : "Cancelar pedido"}
          </button>
          <button type="button" onClick={() => sheet.onOpenChange(false)} className="h-[50px] rounded-2xl text-base font-semibold text-foreground/80">
            Voltar
          </button>
        </div>
      </div>
    </SheetShell>
  )
}

/* -------------------------------------------------------------------------- */
/* Mensagens                                                                  */
/* -------------------------------------------------------------------------- */

function messageTime(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MessagesSheet({
  orderId,
  shortId,
  customerName,
  messages,
  ...sheet
}: SheetProps & {
  orderId: string
  shortId: string
  customerName: string | null
  messages: OrderMessage[]
}) {
  const router = useRouter()
  const [text, setText] = React.useState("")
  const [isPending, startTransition] = React.useTransition()
  const endRef = React.useRef<HTMLDivElement>(null)
  const hasUnread = messages.some((m) => m.sender_role === "customer" && !m.read_at)

  // Abriu a conversa: marca as mensagens do cliente como lidas.
  React.useEffect(() => {
    if (!sheet.open) return
    endRef.current?.scrollIntoView({ block: "end" })
    if (hasUnread) markMessagesAsRead(orderId).then(() => router.refresh())
  }, [sheet.open, hasUnread, orderId, router])

  function send() {
    const message = text.trim()
    if (!message) return
    startTransition(async () => {
      const result = await sendOrderMessage(orderId, message)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setText("")
      router.refresh()
    })
  }

  return (
    <Drawer open={sheet.open} onOpenChange={sheet.onOpenChange} shouldScaleBackground>
      <DrawerContent className="h-[88svh] data-[vaul-drawer-direction=bottom]:max-h-[88svh]">
        <div className="flex flex-col gap-0.5 px-5 pt-4 pb-3">
          <DrawerTitle className="text-xl font-extrabold">{customerName ?? "Cliente"}</DrawerTitle>
          <DrawerDescription className="text-[13px]">
            Pedido <span className="font-mono">#{shortId}</span> · aparece na área do cliente
          </DrawerDescription>
        </div>
        <div className="flex min-h-0 grow flex-col gap-3.5 overflow-y-auto px-5 py-2">
          {messages.length === 0 && (
            <p className="m-auto max-w-[260px] text-center text-sm text-muted-foreground">
              Nenhuma mensagem ainda. O que você escrever aqui aparece para o cliente na página do pedido.
            </p>
          )}
          {messages.map((m) => {
            const mine = m.sender_role !== "customer"
            return (
              <div key={m.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                <span
                  className={cn(
                    "max-w-[78%] rounded-[18px] px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap",
                    mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted",
                  )}
                >
                  {m.message}
                </span>
                <span className="text-[11px] text-muted-foreground">{messageTime(m.created_at)}</span>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="flex items-end gap-2.5 border-t px-5 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <label className="flex min-h-[46px] grow items-center rounded-[23px] border bg-muted/60 px-4">
            <span className="sr-only">Mensagem</span>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva uma mensagem"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            aria-label="Enviar"
            disabled={isPending || !text.trim()}
            className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            {isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </form>
      </DrawerContent>
    </Drawer>
  )
}

/* -------------------------------------------------------------------------- */
/* E-mails                                                                    */
/* -------------------------------------------------------------------------- */

const DELIVERY: Record<string, { label: string; tone: string }> = {
  sent: { label: "Aguardando entrega", tone: "text-muted-foreground" },
  delivery_delayed: { label: "Entrega atrasada", tone: "text-primary" },
  delivered: { label: "Entregue", tone: "text-emerald-600 dark:text-emerald-300" },
  opened: { label: "Aberto", tone: "text-emerald-600 dark:text-emerald-300" },
  clicked: { label: "Clicado", tone: "text-emerald-600 dark:text-emerald-300" },
  bounced: { label: "Rejeitado", tone: "text-destructive" },
  complained: { label: "Marcado como spam", tone: "text-destructive" },
}
const QUEUE: Record<string, { label: string; tone: string }> = {
  pending: { label: "Na fila", tone: "text-muted-foreground" },
  sending: { label: "Enviando", tone: "text-muted-foreground" },
  failed: { label: "Falhou", tone: "text-destructive" },
  skipped: { label: "Descartado", tone: "text-muted-foreground" },
}
const REACHED = new Set(["delivered", "opened", "clicked"])
const IN_QUEUE = new Set(["pending", "sending"])

export function EmailsSheet({
  orderId,
  recipient,
  emails,
  manualKinds,
  ...sheet
}: SheetProps & {
  orderId: string
  recipient: string | null
  emails: OrderEmail[]
  manualKinds: string[]
}) {
  const router = useRouter()
  const [running, setRunning] = React.useState<string | null>(null)
  const [confirm, setConfirm] = React.useState<OrderEmail | null>(null)

  // Último envio de cada tipo (o original ou o reenvio mais recente).
  const latest = new Map<string, OrderEmail>()
  for (const e of emails) {
    const prev = latest.get(e.kind)
    if (!prev || e.created_at > prev.created_at) latest.set(e.kind, e)
  }

  async function run(key: string, fn: () => Promise<{ error?: string }>, ok: string) {
    setRunning(key)
    const result = await fn()
    setRunning(null)
    if (result.error) return toast.error(result.error)
    toast.success(ok)
    router.refresh()
  }

  function resend(email: OrderEmail) {
    setConfirm(null)
    run(email.id, () => resendOrderEmail(email.id, orderId), "E-mail colocado na fila de envio")
  }

  return (
    <SheetShell
      {...sheet}
      title="E-mails do pedido"
      description={recipient ? `Enviados para ${recipient}` : "O que o cliente recebeu sobre este pedido"}
    >
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        {[...latest.values()].map((email) => {
          const state = email.delivery_status
            ? DELIVERY[email.delivery_status]
            : (QUEUE[email.status] ?? { label: "Enviado", tone: "text-muted-foreground" })
          const when = email.sent_at ?? email.created_at
          const queued = IN_QUEUE.has(email.status)
          return (
            <div key={email.id} className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{EMAIL_KIND_LABELS[email.kind] ?? email.kind}</span>
                <span className="truncate text-xs">
                  <span className={state?.tone}>{state?.label}</span>
                  <span className="text-muted-foreground"> · {messageTime(when)}</span>
                </span>
              </span>
              {!queued && (
                <button
                  type="button"
                  disabled={!!running}
                  onClick={() => (REACHED.has(email.delivery_status ?? "") ? setConfirm(email) : resend(email))}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border bg-card px-3.5 text-sm font-bold disabled:opacity-60"
                >
                  {running === email.id && <Loader2 className="size-3.5 animate-spin" />}
                  Reenviar
                </button>
              )}
            </div>
          )
        })}
        {manualKinds.map((kind) => (
          <div key={kind} className="flex min-h-[60px] items-center gap-3 px-3.5 py-2.5">
            <span className="flex grow flex-col gap-0.5">
              <span className="text-[15px] font-semibold">{EMAIL_KIND_LABELS[kind] ?? kind}</span>
              <span className="text-xs text-primary">Ainda não enviado</span>
            </span>
            <button
              type="button"
              disabled={!!running}
              onClick={() => run(kind, () => sendOrderEmailManually(orderId, kind), "E-mail colocado na fila de envio")}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {running === kind && <Loader2 className="size-3.5 animate-spin" />}
              Enviar
            </button>
          </div>
        ))}
        {latest.size === 0 && manualKinds.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">Nenhum e-mail para este pedido ainda.</p>
        )}
      </div>

      {confirm ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
          <span className="text-sm leading-snug">
            <strong>{EMAIL_KIND_LABELS[confirm.kind]}</strong> já chegou ao cliente. Reenviar mesmo assim? Ele recebe de novo.
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirm(null)} className="h-11 rounded-xl border bg-card text-sm font-semibold">
              Não
            </button>
            <button type="button" onClick={() => resend(confirm)} className="h-11 rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              Reenviar
            </button>
          </div>
        </div>
      ) : (
        <span className="text-[13px] leading-snug text-muted-foreground">
          Reenviar o que já chegou pede confirmação. Aberturas e cliques aparecem aqui quando o Resend avisa.
        </span>
      )}

      <button type="button" onClick={() => sheet.onOpenChange(false)} className={closeBtn}>
        Fechar
      </button>
    </SheetShell>
  )
}

/* -------------------------------------------------------------------------- */
/* Status manual, rastreio manual e comprovante                              */
/* -------------------------------------------------------------------------- */

export function StatusSheet({ orderId, status, ...sheet }: SheetProps & { orderId: string; status: string }) {
  const router = useRouter()
  const [running, setRunning] = React.useState<string | null>(null)

  async function pick(next: string) {
    if (next === status) return sheet.onOpenChange(false)
    setRunning(next)
    const result = await updateOrderStatus(orderId, next)
    setRunning(null)
    if (result?.error) return toast.error(result.error)
    toast.success("Status atualizado")
    sheet.onOpenChange(false)
    router.refresh()
  }

  return (
    <SheetShell
      {...sheet}
      title="Mudar status"
      description="O status muda sozinho com o pagamento e o Melhor Envio. Mude à mão só se algo travar."
    >
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={!!running}
            onClick={() => pick(value)}
            className="flex min-h-14 items-center justify-between px-4 text-left text-base font-medium"
          >
            {label}
            {running === value ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              value === status && <Check className="size-5 text-primary" strokeWidth={2.5} />
            )}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => sheet.onOpenChange(false)} className={closeBtn}>
        Fechar
      </button>
    </SheetShell>
  )
}

export function TrackingSheet({ orderId, code, ...sheet }: SheetProps & { orderId: string; code: string | null }) {
  const router = useRouter()
  const [value, setValue] = React.useState(code ?? "")
  const [isPending, startTransition] = React.useTransition()
  const [lastOpen, setLastOpen] = React.useState(sheet.open)
  if (sheet.open !== lastOpen) {
    setLastOpen(sheet.open)
    if (sheet.open) setValue(code ?? "")
  }

  function save() {
    startTransition(async () => {
      const result = await updateTrackingCode(orderId, value.trim().toUpperCase())
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(value.trim() ? "Código de rastreio salvo" : "Código removido")
      sheet.onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <SheetShell
      {...sheet}
      title="Código de rastreio"
      description="Alterar aqui sobrescreve o código vindo do Melhor Envio. Salvar em branco remove o código."
    >
      <label className="flex flex-col gap-1.5 rounded-2xl bg-muted/60 px-4 py-3">
        <span className="text-xs font-semibold text-muted-foreground">Código</span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoCapitalize="characters"
          placeholder="Ex.: BR123456789XX"
          className="bg-transparent font-mono text-lg font-semibold tracking-wide uppercase outline-none placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:text-muted-foreground/70"
        />
      </label>
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={save} disabled={isPending} className={primaryBtn}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar código
        </button>
        <button type="button" onClick={() => sheet.onOpenChange(false)} className="h-[50px] rounded-2xl text-base font-semibold text-foreground/80">
          Cancelar
        </button>
      </div>
    </SheetShell>
  )
}

export function ProofSheet({ orderId, url, ...sheet }: SheetProps & { orderId: string; url: string | null }) {
  return (
    <SheetShell {...sheet} title="Comprovante de pagamento" description="Foto ou PDF do pagamento do cliente">
      <div className="rounded-2xl bg-muted/60 p-4">
        <OrderPaymentProof orderId={orderId} currentUrl={url} />
      </div>
      <button type="button" onClick={() => sheet.onOpenChange(false)} className={closeBtn}>
        Fechar
      </button>
    </SheetShell>
  )
}
