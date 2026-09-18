/** Rótulos e cores de status do pedido, para as telas mobile. */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

export const ORDER_STATUS_CHIP: Record<string, string> = {
  pending: "bg-muted text-foreground/80",
  paid: "bg-primary text-primary-foreground",
  shipped: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
}

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
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

/** Mesmo prazo de expire_unpaid_orders e das cobranças no Mercado Pago. */
export const ORDER_TTL_MS = 12 * 60 * 60 * 1000
