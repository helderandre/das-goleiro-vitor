/** "(42) 99817-9043" para celular ou fixo com DDD; senão, como veio. */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "")
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return phone
}

/** Número no formato do wa.me: DDI 55 + DDD + número. Null se não reconhecer. */
export function whatsappNumber(phone: string): string | null {
  const d = phone.replace(/\D/g, "")
  if (d.length === 10 || d.length === 11) return `55${d}`
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return d
  return null
}

/** Link do wa.me com a saudação padrão da loja sobre um pedido. */
export function whatsappOrderLink(
  phone: string | null,
  name: string | null,
  shortId: string,
): string | null {
  const waNumber = phone ? whatsappNumber(phone) : null
  if (!waNumber) return null
  const firstName = name?.trim().split(/\s+/)[0]
  const text = `Olá${firstName ? `, ${firstName}` : ""}! Aqui é da loja Goleiro Vitor, sobre o seu pedido ${shortId}.`
  return `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`
}
