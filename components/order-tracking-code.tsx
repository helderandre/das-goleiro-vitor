"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateTrackingCode } from "@/app/(dashboard)/pedidos/actions"
import { toast } from "sonner"
import { Check, Loader2, Truck } from "lucide-react"

interface OrderTrackingCodeProps {
  orderId: string
  currentCode: string | null
}

export function OrderTrackingCode({
  orderId,
  currentCode,
}: OrderTrackingCodeProps) {
  const [code, setCode] = useState(currentCode ?? "")
  const [isPending, startTransition] = useTransition()

  const hasChanged = code !== (currentCode ?? "")

  function handleSave() {
    startTransition(async () => {
      const result = await updateTrackingCode(orderId, code)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Código de rastreio atualizado")
      }
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Código de Rastreio</span>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Ex: BR123456789XX"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isPending}
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleSave}
          disabled={isPending || !hasChanged}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
      {currentCode && (
        <p className="text-xs text-muted-foreground">
          Salvo: {currentCode}
        </p>
      )}
    </div>
  )
}
