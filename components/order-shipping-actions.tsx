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
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Loader2,
  MapPin,
  Package,
  Printer,
  Truck,
  XCircle,
} from "lucide-react"
import {
  quoteShipping,
  setShippingService,
  runLabelAction,
  cancelLabel,
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
  trackingUrl: string | null
}

/** O que cada passo faz de fato, para o admin não precisar adivinhar. */
const stepHints: Record<string, string> = {
  add_to_cart:
    "cria o envio no Melhor Envio com o remetente cadastrado, o endereço do pedido e os dados do cliente.",
  checkout:
    "debita o saldo da sua carteira no Melhor Envio. Não marca o pedido como enviado.",
  generate: "emite a etiqueta no Melhor Envio.",
  print: "abre o PDF da etiqueta para impressão.",
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
  trackingUrl,
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

  const nextStep = steps.find((step) => !step.done)

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
        {trackingCode && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Rastreio</span>
            {trackingUrl ? (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono text-xs text-primary underline underline-offset-2"
              >
                {trackingCode}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-mono text-xs">{trackingCode}</span>
            )}
          </div>
        )}
      </div>

      <details className="group rounded-md border bg-muted/40 px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          {nextStep ? (
            <span>
              Próximo passo:{" "}
              <span className="text-primary">{nextStep.label}</span>
            </span>
          ) : (
            <span>Etiqueta pronta — falta postar na transportadora</span>
          )}
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        </summary>

        <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
          {steps.map((step, index) => (
            <li key={step.key} className="flex gap-2">
              <span
                className={
                  step.done
                    ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600/15 text-green-600"
                    : "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
                }
              >
                {step.done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className={step.done ? "line-through" : undefined}>
                <span className="font-medium text-foreground">{step.label}</span>
                {" — "}
                {stepHints[step.key]}
              </span>
            </li>
          ))}
          <li className="flex gap-2">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-3 w-3" />
            </span>
            <span>
              <span className="font-medium text-foreground">Postar</span>
              {" — "}
              leve o pacote etiquetado à transportadora. O rastreio e o status
              chegam sozinhos pelo webhook do Melhor Envio; &ldquo;Rastrear&rdquo;
              só força a consulta antes disso.
            </span>
          </li>
        </ol>

        <p className="mt-3 text-xs text-muted-foreground">
          &ldquo;Cotar frete&rdquo; é opcional: o serviço já veio da escolha do
          cliente no checkout. Use apenas para trocar de transportadora.
        </p>
      </details>

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
          <>
            <Button
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={() =>
                run("tracking", () => runLabelAction(orderId, "tracking"), (result) => {
                  const code = (result.data as { tracking_code?: string | null })
                    ?.tracking_code
                  if (code) {
                    toast.success(`Rastreio: ${code}`)
                  } else {
                    toast.info(
                      "Ainda sem código. A transportadora só emite depois que o pacote é postado.",
                    )
                  }
                })
              }
            >
              {running === "tracking" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              Rastrear
            </Button>

            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={() =>
                run("cancel-label", () => cancelLabel(orderId), (result) =>
                  toast.success((result.message as string) ?? "Etiqueta cancelada"),
                )
              }
            >
              {running === "cancel-label" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancelar etiqueta
            </Button>
          </>
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
