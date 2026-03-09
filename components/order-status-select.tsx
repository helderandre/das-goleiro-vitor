"use client"

import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateOrderStatus } from "@/app/(dashboard)/pedidos/actions"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

const statuses = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
]

interface OrderStatusSelectProps {
  orderId: string
  currentStatus: string
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: OrderStatusSelectProps) {
  const [isPending, startTransition] = useTransition()

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, value)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Status atualizado")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Select key={currentStatus} defaultValue={currentStatus} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
    </div>
  )
}
