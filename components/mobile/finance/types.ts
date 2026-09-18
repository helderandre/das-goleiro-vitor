export interface FinanceTransaction {
  id: string
  shortId: string
  /** recebido: pago/enviado/entregue; reembolso: devolvido no MP. */
  kind: "recebido" | "pendente" | "reembolso" | "cancelado"
  customerName: string | null
  initials: string
  total: number
  fee: number
  shipping: number
  net: number
  /** "Pix", "Crédito"… — agrupa as formas de pagamento. */
  paymentType: string
  paymentLabel: string | null
  serviceName: string | null
  mpPaymentId: string | null
  mpPaymentStatus: string | null
  /** "2026-09-18" em São Paulo: base dos filtros de período. */
  day: string
  dayLabel: string
  time: string
  whenLabel: string
}
