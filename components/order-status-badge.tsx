import { Badge } from "@/components/ui/badge"

const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  shipped: { label: "Enviado", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
}

export function OrderStatusBadge({ status }: { status: string | null }) {
  const s = status ?? "pending"
  const c = config[s] ?? config.pending

  return <Badge variant={c.variant}>{c.label}</Badge>
}
