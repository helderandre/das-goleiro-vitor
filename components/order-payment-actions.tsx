"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, CreditCard, Loader2, QrCode, RefreshCw, ExternalLink } from "lucide-react"
import {
  createPaymentLink,
  createPixPayment,
  checkPaymentStatus,
} from "@/app/(dashboard)/pedidos/actions"
import { getPaymentDisplay } from "@/lib/payment-methods"

interface PixData {
  pix_qr_code: string | null
  pix_qr_code_base64: string | null
  pix_ticket_url: string | null
  pix_expiration: string | null
  status: string
}

interface OrderPaymentActionsProps {
  orderId: string
  paymentId: string | null
  paymentStatus: string | null
  paymentMethod: string | null
  paymentType: string | null
  paidAt: string | null
  preferenceId: string | null
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Aprovado", variant: "default" },
  pending: { label: "Aguardando", variant: "secondary" },
  in_process: { label: "Em análise", variant: "secondary" },
  rejected: { label: "Recusado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  refunded: { label: "Reembolsado", variant: "outline" },
  charged_back: { label: "Contestado", variant: "destructive" },
}

export function OrderPaymentActions({
  orderId,
  paymentId,
  paymentStatus,
  paymentMethod,
  paymentType,
  paidAt,
  preferenceId,
}: OrderPaymentActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const [pix, setPix] = useState<PixData | null>(null)

  const paymentDisplay = getPaymentDisplay(paymentMethod, paymentType)
  const PaymentIcon = paymentDisplay.icon

  function run(action: string, fn: () => Promise<{ error?: string } & Record<string, unknown>>) {
    setRunning(action)
    startTransition(async () => {
      const result = await fn()
      setRunning(null)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (action === "link") {
        const url = result.checkoutUrl as string | undefined
        if (url) {
          setCheckoutUrl(url)
          setPix(null)
          toast.success("Link de pagamento gerado")
        }
      } else if (action === "pix") {
        const payment = result.payment as PixData | undefined
        if (payment) {
          setPix(payment)
          setCheckoutUrl(null)
          toast.success("Pix gerado")
        }
      } else {
        const payment = result.payment as { status?: string } | undefined
        toast.success(`Pagamento: ${payment?.status ?? "consultado"}`)
      }
    })
  }

  const status = paymentStatus ? statusLabels[paymentStatus] : null

  // Cobrar de novo só faz sentido enquanto não há dinheiro liquidado. Depois de
  // aprovado (ou devolvido/contestado) um novo link ou Pix cobraria o cliente
  // em duplicidade.
  const isSettled = ["approved", "refunded", "charged_back"].includes(
    paymentStatus ?? "",
  )

  return (
    <div className="space-y-4">
      {paymentId ? (
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <Badge variant={status?.variant ?? "secondary"}>
              {status?.label ?? paymentStatus}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Pagamento</span>
            <span className="font-mono text-xs">{paymentId}</span>
          </div>
          {paymentDisplay.hasData && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Meio</span>
              <span className="flex items-center gap-1.5">
                <PaymentIcon className="h-3.5 w-3.5 text-muted-foreground" />
                {paymentDisplay.displayLabel}
              </span>
            </div>
          )}
          {paidAt && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Pago em</span>
              <span>{new Date(paidAt).toLocaleString("pt-BR")}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma cobrança registrada para este pedido.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {!isSettled && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => run("link", () => createPaymentLink(orderId))}
            >
              {running === "link" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Gerar link
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => run("pix", () => createPixPayment(orderId))}
            >
              {running === "pix" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
              Gerar Pix
            </Button>
          </>
        )}

        {paymentId && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run("check", () => checkPaymentStatus(orderId))}
          >
            {running === "check" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Consultar
          </Button>
        )}
      </div>

      {checkoutUrl && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Link de pagamento</p>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                {checkoutUrl}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(checkoutUrl)
                  toast.success("Link copiado")
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" asChild>
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </>
      )}

      {pix && (
        <>
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Pix gerado{pix.pix_expiration && ` · expira ${new Date(pix.pix_expiration).toLocaleString("pt-BR")}`}
            </p>
            {pix.pix_qr_code_base64 && (
              <Image
                src={`data:image/png;base64,${pix.pix_qr_code_base64}`}
                alt="QR Code do Pix"
                width={180}
                height={180}
                unoptimized
                className="rounded border bg-white p-2"
              />
            )}
            {pix.pix_qr_code && (
              <div className="flex gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs">
                  {pix.pix_qr_code}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(pix.pix_qr_code!)
                    toast.success("Código copia-e-cola copiado")
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {preferenceId && !checkoutUrl && (
        <p className="text-xs text-muted-foreground break-all">
          Preferência: {preferenceId}
        </p>
      )}
    </div>
  )
}
