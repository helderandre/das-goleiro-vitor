/**
 * Tipos de e-mail do pedido e quais podem ser enviados manualmente.
 *
 * A regra espelha a RPC send_order_email_manually e serve só para montar o
 * menu do dashboard: quem decide é o banco, então um menu desatualizado não
 * consegue criar um envio inválido.
 */

export const EMAIL_KINDS = [
  "pedido_criado",
  "aguardando_pagamento",
  "pagamento_recebido",
  "pagamento_cancelado",
  "pedido_enviado",
  "pedido_concluido",
] as const

export type EmailKind = (typeof EMAIL_KINDS)[number]

export const EMAIL_KIND_LABELS: Record<string, string> = {
  pedido_criado: "Pedido criado",
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_recebido: "Pagamento recebido",
  pagamento_cancelado: "Pagamento cancelado",
  pedido_enviado: "Pedido enviado",
  pedido_concluido: "Pedido concluído",
}

export interface OrderForEmail {
  id: string
  status: string | null
  mp_payment_status: string | null
  mp_payment_id: string | null
  tracking_code: string | null
  created_at: string | null
}

const ORDER_TTL_MS = 12 * 60 * 60 * 1000

function isApplicable(kind: EmailKind, o: OrderForEmail, now: number): boolean {
  const status = o.status ?? ""
  switch (kind) {
    case "pedido_criado":
      return status !== "cancelled"
    case "aguardando_pagamento":
      return (
        status === "pending" &&
        o.mp_payment_status === "pending" &&
        !!o.mp_payment_id &&
        !!o.created_at &&
        new Date(o.created_at).getTime() + ORDER_TTL_MS > now
      )
    case "pagamento_recebido":
      return ["paid", "shipped", "delivered"].includes(status)
    case "pagamento_cancelado":
      return status === "cancelled"
    case "pedido_enviado":
      return ["shipped", "delivered"].includes(status) && !!o.tracking_code
    case "pedido_concluido":
      return status === "delivered"
  }
}

/** Mesma chave de deduplicação usada pelo trigger e pela RPC. */
function dedupeKey(kind: EmailKind, o: OrderForEmail): string {
  switch (kind) {
    case "pedido_criado":
      return `pedido_criado:${o.id}`
    case "aguardando_pagamento":
      return `aguardando:${o.id}:${o.mp_payment_id}`
    case "pagamento_recebido":
      return `pago:${o.id}`
    case "pagamento_cancelado":
      return `cancelado:${o.id}`
    case "pedido_enviado":
      return `enviado:${o.id}`
    case "pedido_concluido":
      return `concluido:${o.id}`
  }
}

/** Tipos que fazem sentido para o estado atual e ainda não existem no histórico. */
export function availableManualKinds(
  order: OrderForEmail,
  existingKeys: string[],
  now = Date.now()
): EmailKind[] {
  const existing = new Set(existingKeys)
  return EMAIL_KINDS.filter(
    (kind) =>
      isApplicable(kind, order, now) && !existing.has(dedupeKey(kind, order))
  )
}
