/** Preço que o cliente paga, com o desconto aplicado e arredondado em centavos. */
export function finalPrice(price: number, discountPercent: number) {
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100
}

/** 0.3 → "0,3"; null → "". Para preencher campos numéricos em pt-BR. */
export function decimalInput(value: number | null | undefined) {
  return value == null ? "" : String(value).replace(".", ",")
}
