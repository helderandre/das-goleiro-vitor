import { Check, Circle, X } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { key: "pending", label: "Pendente" },
  { key: "paid", label: "Pago" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregue" },
]

const statusOrder: Record<string, number> = {
  pending: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
}

export function OrderTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIndex = statusOrder[currentStatus] ?? 0
  const isCancelled = currentStatus === "cancelled"

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
          <X className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-destructive">Pedido Cancelado</p>
          <p className="text-sm text-muted-foreground">
            Este pedido foi cancelado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, i) => {
        const isCompleted = i <= currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 text-muted-foreground/30",
                  isCurrent && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCompleted
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-2 h-0.5 flex-1",
                  i < currentIndex ? "bg-primary" : "bg-muted-foreground/20",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
