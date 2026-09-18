"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Copy, ExternalLink, MessageCircle, Truck, X } from "lucide-react"

import { whatsappOrderLink } from "@/lib/phone"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "./format"

export interface MobileOrder {
  id: string
  shortId: string
  status: string | null
  statusLabel: string
  customerName: string | null
  customerPhone: string | null
  /** Já formatado no servidor, ex.: "hoje, 08:53". */
  whenLabel: string
  serviceName: string | null
  shippingStatus: string | null
  trackingCode: string | null
  trackingUrl: string | null
  attentionReason: string | null
  needsAttention: boolean
  paymentLabel: string | null
  shippingPrice: number
  total: number
  items: { id: string; title: string; quantity: number; subtotal: number }[]
}

/** O que falta fazer no envio, por shipping_status. Null = nada a avisar. */
export function shippingNotice(
  shippingStatus: string | null,
): { title: string; text: string } | null {
  switch (shippingStatus) {
    case "printed":
      return {
        title: "Etiqueta impressa — falta postar",
        text: "O cliente recebe o rastreio por e-mail quando os Correios lerem o pacote na agência.",
      }
    case "generated":
      return {
        title: "Etiqueta gerada — falta imprimir",
        text: "Imprima a etiqueta no pedido completo e cole no pacote antes de postar.",
      }
    case "paid":
      return {
        title: "Etiqueta paga — falta gerar",
        text: "Gere a etiqueta no pedido completo para liberar a impressão.",
      }
    case null:
    case "pending":
    case "cart":
      return {
        title: "Falta comprar a etiqueta",
        text: "Compre a etiqueta no Melhor Envio pelo pedido completo.",
      }
    default:
      return null
  }
}

export function OrderSheet({
  order,
  open,
  onOpenChange,
}: {
  /** Continua preenchido ao fechar, para a animação de saída ter conteúdo. */
  order: MobileOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const o = order
  const notice = o ? shippingNotice(o.shippingStatus) : null
  const waLink = o ? whatsappOrderLink(o.customerPhone, o.customerName, `#${o.shortId}`) : null
  const trackUrl = o?.trackingCode
    ? (o.trackingUrl ?? `https://www.melhorrastreio.com.br/rastreio/${o.trackingCode}`)
    : null

  async function copyTracking() {
    if (!o?.trackingCode) return
    try {
      await navigator.clipboard.writeText(o.trackingCode)
      toast.success("Código de rastreio copiado")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      shouldScaleBackground
    >
      {/* Altura do conteúdo (sem snap points): as ações do fim ficam sempre
          visíveis; se o pedido for longo, a sheet rola. */}
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[calc(100svh-env(safe-area-inset-top)-0.5rem)]">
        {o && (
          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <DrawerTitle className="font-mono text-[22px] font-semibold">
                    #{o.shortId}
                  </DrawerTitle>
                  <span className="flex h-6 items-center rounded-full bg-primary px-2.5 text-xs font-bold text-primary-foreground">
                    {o.statusLabel}
                  </span>
                </div>
                <DrawerDescription className="truncate text-sm">
                  {[o.customerName, o.whenLabel].filter(Boolean).join(" · ")}
                </DrawerDescription>
              </div>
              <DrawerClose
                aria-label="Fechar"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              >
                <X className="size-[18px]" />
              </DrawerClose>
            </div>

            {o.needsAttention && o.attentionReason && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm">
                <p className="font-semibold">Pedido pede atenção</p>
                <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                  {o.attentionReason}
                </p>
              </div>
            )}

            {notice && (
              <div className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3.5">
                <Truck className="mt-px size-5 shrink-0 text-primary" strokeWidth={1.8} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{notice.title}</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">
                    {notice.text}
                  </span>
                </span>
              </div>
            )}

            {o.trackingCode && (
              <div className="flex items-center gap-3">
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="truncate text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Rastreio{o.serviceName ? ` · ${o.serviceName}` : ""}
                  </span>
                  <span className="truncate font-mono text-lg font-semibold tracking-wide">
                    {o.trackingCode}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Copiar código de rastreio"
                  onClick={copyTracking}
                  className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-muted/60 active:scale-95"
                >
                  <Copy className="size-[18px]" strokeWidth={1.8} />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2.5 border-t pt-4 text-sm">
              {o.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-foreground/85">
                    {item.title}{" "}
                    <span className="text-muted-foreground">× {item.quantity}</span>
                  </span>
                  <span className="whitespace-nowrap">{formatBRL(item.subtotal)}</span>
                </div>
              ))}
              {o.shippingPrice > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-foreground/85">
                    Frete{o.serviceName ? ` · ${o.serviceName}` : ""}
                  </span>
                  <span className="whitespace-nowrap">{formatBRL(o.shippingPrice)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <span className="min-w-0 truncate text-[15px] font-semibold">
                  Total
                  {o.paymentLabel && (
                    <span className="text-[13px] font-normal text-muted-foreground">
                      {" "}· {o.paymentLabel}
                    </span>
                  )}
                </span>
                <span className="text-xl font-extrabold tracking-tight whitespace-nowrap">
                  {formatBRL(o.total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              {(waLink || trackUrl) && (
                <div className="grid grid-cols-2 gap-2.5">
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border bg-muted/60 text-[15px] font-semibold"
                    >
                      <MessageCircle className="size-[18px]" strokeWidth={1.8} />
                      WhatsApp
                    </a>
                  )}
                  {trackUrl && (
                    <a
                      href={trackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border bg-muted/60 text-[15px] font-semibold"
                    >
                      <ExternalLink className="size-[18px]" strokeWidth={1.8} />
                      Rastrear
                    </a>
                  )}
                </div>
              )}
              <Link
                href={`/pedidos/${o.id}`}
                className="flex h-[54px] items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground"
              >
                Abrir pedido completo
              </Link>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
