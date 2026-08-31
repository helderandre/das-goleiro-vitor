"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Undo2 } from "lucide-react"
import { refundOrder } from "@/app/(dashboard)/pedidos/actions"

type RefundKind = "full" | "products_only" | "custom"

interface OrderRefundDialogProps {
  orderId: string
  total: number
  shippingPrice: number
  hasPayment: boolean
  isShipped: boolean
}

export function OrderRefundDialog({
  orderId,
  total,
  shippingPrice,
  hasPayment,
  isShipped,
}: OrderRefundDialogProps) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<RefundKind>(isShipped ? "products_only" : "full")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const productsOnly = Number((total - shippingPrice).toFixed(2))

  const options: { value: RefundKind; label: string; hint: string }[] = [
    {
      value: "full",
      label: `Tudo — R$ ${total.toFixed(2)}`,
      hint: "Produtos e frete",
    },
    {
      value: "products_only",
      label: `Sem o frete — R$ ${productsOnly.toFixed(2)}`,
      hint: "Use quando o pedido já foi postado",
    },
    { value: "custom", label: "Outro valor", hint: "Ex.: devolução de um item" },
  ]

  function handleSubmit() {
    startTransition(async () => {
      const result = await refundOrder(orderId, {
        kind,
        amount: kind === "custom" ? Number(amount.replace(",", ".")) : undefined,
        reason: reason || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(result.message ?? "Pedido cancelado")
      setOpen(false)
      setReason("")
      setAmount("")
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Undo2 className="h-4 w-4" />
          {hasPayment ? "Cancelar e devolver" : "Cancelar pedido"}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasPayment ? "Cancelar e devolver" : "Cancelar pedido"}</DialogTitle>
          <DialogDescription>
            {hasPayment
              ? "Se o pagamento ainda não foi aprovado, ele é cancelado. Se já foi, o valor é devolvido ao cliente pelo Mercado Pago."
              : "Não há pagamento registrado: o pedido será apenas encerrado e o estoque devolvido."}
          </DialogDescription>
        </DialogHeader>

        {hasPayment && (
          <div className="space-y-3">
            <Label>Quanto devolver</Label>
            <div className="space-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name="refund-kind"
                    value={option.value}
                    checked={kind === option.value}
                    onChange={() => setKind(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            {kind === "custom" && (
              <div className="space-y-1.5">
                <Label htmlFor="refund-amount">Valor (R$)</Label>
                <Input
                  id="refund-amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="refund-reason">Motivo (opcional)</Label>
          <Textarea
            id="refund-reason"
            rows={2}
            placeholder="Ex.: cliente desistiu da compra"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        {isShipped && (
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Este pedido já foi enviado. Se a etiqueta ainda não foi postada, cancele-a antes —
            o valor do frete volta para a Melhor Carteira, não para o cliente.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
