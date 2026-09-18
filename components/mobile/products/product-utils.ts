/** Preço que o cliente paga, com o desconto aplicado e arredondado em centavos. */
export function finalPrice(price: number, discountPercent: number) {
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100
}

/** 0.3 → "0,3"; null → "". Para preencher campos numéricos em pt-BR. */
export function decimalInput(value: number | null | undefined) {
  return value == null ? "" : String(value).replace(".", ",")
}

/** 42 → "42,00"; 1234.5 → "1.234,50". */
export function moneyInput(value: number | null | undefined) {
  if (value == null) return ""
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Máscara de moeda estilo app de banco: os dígitos entram pelos centavos
 * ("4444" → "44,44"). Vazio continua vazio.
 */
export function maskMoney(raw: string) {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 9)
  if (!digits) return ""
  return moneyInput(parseInt(digits, 10) / 100)
}

/** "1.234,56" → 1234.56; inválido → NaN. */
export function parseMoney(masked: string) {
  return parseFloat(masked.replace(/\./g, "").replace(",", "."))
}
