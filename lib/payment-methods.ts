import {
  CreditCard,
  QrCode,
  Landmark,
  Banknote,
  HelpCircle,
} from "lucide-react"

/** mp_payment_type → categoria do pagamento */
export const paymentTypeLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
  credit_card: { label: "Crédito", icon: CreditCard },
  debit_card: { label: "Débito", icon: CreditCard },
  bank_transfer: { label: "Pix", icon: QrCode },
  ticket: { label: "Boleto", icon: Landmark },
  account_money: { label: "Saldo MP", icon: Banknote },
  // fallbacks diretos caso mp_payment_type venha com esses valores
  pix: { label: "Pix", icon: QrCode },
}

/** mp_payment_method → bandeira/método específico */
export const paymentBrandLabels: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  cabal: "Cabal",
  diners: "Diners",
  naranja: "Naranja",
  maestro: "Maestro",
  debvisa: "Visa Débito",
  debmaster: "Mastercard Débito",
  debelo: "Elo Débito",
  debcabal: "Cabal Débito",
  pix: "Pix",
  bolbradesco: "Boleto Bradesco",
  pec: "Pagamento na Lotérica",
  account_money: "Saldo MP",
}

/**
 * Retorna label, ícone e bandeira a partir dos campos MP do pedido.
 * - `type`: "Crédito", "Débito", "Pix", etc.
 * - `brand`: "Visa", "Mastercard", etc. (ou null)
 * - `icon`: componente Lucide
 * - `displayLabel`: texto combinado ex: "Crédito · Visa"
 */
export function getPaymentDisplay(
  mpPaymentMethod: string | null | undefined,
  mpPaymentType: string | null | undefined,
) {
  const typeInfo = mpPaymentType ? paymentTypeLabels[mpPaymentType] : null
  const brand = mpPaymentMethod ? paymentBrandLabels[mpPaymentMethod] : null

  // Se não tem type mas tem method, tenta inferir
  const fallbackInfo = mpPaymentMethod ? paymentTypeLabels[mpPaymentMethod] : null
  const resolvedType = typeInfo ?? fallbackInfo

  const icon = resolvedType?.icon ?? HelpCircle
  const typeLabel = resolvedType?.label ?? mpPaymentType ?? mpPaymentMethod ?? null

  // Não mostra bandeira se é igual ao tipo (ex: pix/pix)
  const showBrand = brand && brand.toLowerCase() !== typeLabel?.toLowerCase()

  const displayLabel = showBrand
    ? `${typeLabel} · ${brand}`
    : typeLabel

  return {
    typeLabel,
    brand,
    icon,
    displayLabel,
    hasData: !!(mpPaymentMethod || mpPaymentType),
  }
}
