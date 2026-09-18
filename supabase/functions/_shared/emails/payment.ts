/**
 * Forma de pagamento em linguagem clara, a partir dos campos do Mercado Pago.
 * Espelha lib/payment-methods.ts do dashboard (Node), sem os ícones; as
 * functions rodam em Deno e não importam código do dashboard.
 */

const TYPE_LABELS: Record<string, string> = {
  credit_card: "Crédito",
  debit_card: "Débito",
  bank_transfer: "Pix",
  ticket: "Boleto",
  account_money: "Saldo MP",
  pix: "Pix",
};

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  elo: "Elo",
  amex: "American Express",
  hipercard: "Hipercard",
  cabal: "Cabal",
  diners: "Diners",
  maestro: "Maestro",
  debvisa: "Visa Débito",
  debmaster: "Mastercard Débito",
  debelo: "Elo Débito",
  pix: "Pix",
  bolbradesco: "Boleto Bradesco",
  account_money: "Saldo MP",
};

/** "Pix", "Crédito · Visa" ou null quando não há dado de pagamento. */
export function paymentLabel(
  method: string | null | undefined,
  type: string | null | undefined,
): string | null {
  const typeLabel = (type && TYPE_LABELS[type]) || (method && TYPE_LABELS[method]) || type || method || null;
  const brand = method ? BRAND_LABELS[method] : null;
  if (!typeLabel) return null;
  // Não repete quando a bandeira é o próprio tipo (pix/pix).
  if (brand && brand.toLowerCase() !== typeLabel.toLowerCase()) return `${typeLabel} · ${brand}`;
  return typeLabel;
}
