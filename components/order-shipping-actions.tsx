"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Calculator,
  Check,
  ExternalLink,
  Loader2,
  Package,
  Printer,
  Truck,
} from "lucide-react"
import {
  quoteShipping,
  setShippingService,
  runLabelAction,
} from "@/app/(dashboard)/pedidos/actions"

interface QuoteOption {
  id: number
  servico: string
  transportadora: string
  preco: string | number | null
  prazo_dias: number | null
}

interface OrderShippingActionsProps {
  orderId: string
  shippingStatus: string | null
  serviceId: number | null
  serviceName: string | null
  shippingPrice: number | null
  cartId: string | null
  labelUrl: string | null
  trackingCode: string | null
}

const shippingLabels: Record<string, string> = {
  pending: "Aguardando",
  cart: "No carrinho",
  paid: "Etiqueta paga",
  generated: "Etiqueta gerada",
  printed: "Etiqueta impressa",
  posted: "Postado",
  in_transit: "Em trânsito",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

export function OrderShippingActions({
  orderId,
  shippingStatus,
  serviceId,
  serviceName,
  shippingPrice,
  cartId,
  labelUrl,
  trackingCode,
}: OrderShippingActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState<string | null>(null)
  const [quotes, setQuotes] = useState<QuoteOption[] | null>(null)

  function run(key: string, fn: () => Promise<{ error?: string } & Record<string, unknown>>, onDone?: (result: Record<string, unknown>) => void) {
    setRunning(key)
    startTransition(async () => {
      const result = await fn()
      setRunning(null)
      if (result.error) {
        toast.error(result.error)
        return
      }
      onDone?.(result)
    })
  }

  const steps: { key: string; label: string; icon: typeof Package; action: "add_to_cart" | "checkout" | "generate" | "print" | "tracking"; done: boolean }[] = [
    {
      key: "add_to_cart",
      label: "Adicionar ao carrinho",
      icon: Package,
      action: "add_to_cart",
      done: Boolean(cartId),
    },
    {
      key: "checkout",
      label: "Pagar etiqueta",
      icon: Truck,
      action: "checkout",
      done: ["paid", "generated", "printed", "posted", "in_transit", "delivered"].includes(shippingStatus ?? ""),
    },
    {
      key: "generate",
      label: "Gerar",
      icon: Check,
      action: "generate",
      done: ["generated", "printed", "posted", "in_transit", "delivered"].includes(shippingStatus ?? ""),
    },
    {
      key: "print",
      label: "Imprimir",
      icon: Printer,
      action: "print",
      done: Boolean(labelUrl),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Status do envio</span>
          <Badge variant={shippingStatus === "delivered" ? "default" : "secondary"}>
            {shippingLabels[shippingStatus ?? "pending"] ?? shippingStatus}
          </Badge>
        </div>
        {serviceName && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Serviço</span>
            <span>
              {serviceName}
              {shippingPrice ? ` · R$ ${Number(shippingPrice).toFixed(2)}` : ""}
            </span>
          </div>
        )}
        {cartId && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Envio no ME</span>
            <span className="font-mono text-xs">{cartId.slice(0, 8)}…</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            run("quote", () => quoteShipping(orderId), (result) => {
              const options = (result.options as QuoteOption[]) ?? []
              setQuotes(options)
              toast.success(`${options.length} serviço(s) disponíveis`)
            })
          }
        >
          {running === "quote" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          Cotar frete
        </Button>

        {steps.map((step) => (
          <Button
            key={step.key}
            size="sm"
            variant={step.done ? "ghost" : "outline"}
            disabled={isPending}
            onClick={() =>
              run(step.key, () => runLabelAction(orderId, step.action), () =>
                toast.success(`${step.label}: ok`),
              )
            }
          >
            {running === step.key ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <step.icon className="h-4 w-4" />
            )}
            {step.label}
            {step.done && <Check className="h-3 w-3 text-green-600" />}
          </Button>
        ))}

        {cartId && (
          <Button
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() =>
              run("tracking", () => runLabelAction(orderId, "tracking"), () =>
                toast.success("Rastreio atualizado"),
              )
            }
          >
            {running === "tracking" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Truck className="h-4 w-4" />
            )}
            Rastrear
          </Button>
        )}
      </div>

      {quotes && quotes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">Serviços disponíveis</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell>
                        <div className="font-medium">{quote.servico}</div>
                        <div className="text-xs text-muted-foreground">{quote.transportadora}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {quote.prazo_dias ? `${quote.prazo_dias} dias úteis` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        R$ {Number(quote.preco).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={serviceId === quote.id ? "default" : "outline"}
                          disabled={isPending}
                          onClick={() =>
                            run(
                              `use-${quote.id}`,
                              () =>
                                setShippingService(
                                  orderId,
                                  quote.id,
                                  `${quote.servico} (${quote.transportadora})`,
                                  Number(quote.preco),
                                ),
                              () => toast.success(`Serviço ${quote.servico} selecionado`),
                            )
                          }
                        >
                          {running === `use-${quote.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : serviceId === quote.id ? (
                            "Selecionado"
                          ) : (
                            "Usar"
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {(labelUrl || trackingCode) && <Separator />}

      <div className="flex flex-wrap gap-2">
        {labelUrl && (
          <Button size="sm" variant="outline" asChild>
            <a href={labelUrl} target="_blank" rel="noopener noreferrer">
              <Printer className="h-4 w-4" />
              Abrir etiqueta
            </a>
          </Button>
        )}
        {trackingCode && (
          <Button size="sm" variant="outline" asChild>
            <a
              href={`https://www.melhorrastreio.com.br/rastreio/${trackingCode}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Rastrear {trackingCode}
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
