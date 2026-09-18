import type { MobileSender } from "@/components/mobile/sender/sender-page"
import { formatPhone } from "@/lib/phone"

interface SenderRow {
  id: string
  name: string
  document: string | null
  phone: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  is_default: boolean | null
}

const t = (v: string | null) => v?.trim() ?? ""

/** CPF com o meio escondido: "***.004.235-**"; CNPJ só com os 4 finais. */
function maskDocument(doc: string | null) {
  const d = (doc ?? "").replace(/\D/g, "")
  if (d.length === 11) return `CPF ***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
  if (d.length === 14) return `CNPJ **.***.***/${d.slice(8, 12)}-**`
  return "Sem documento"
}

export function toMobileSender(s: SenderRow): MobileSender {
  const zip = (s.zip_code ?? "").replace(/\D/g, "")
  return {
    id: s.id,
    name: t(s.name),
    line1: [t(s.street), t(s.number)].filter(Boolean).join(", ") + (t(s.complement) ? ` · ${t(s.complement)}` : ""),
    line2: [t(s.neighborhood), [t(s.city), t(s.state)].filter(Boolean).join("/")].filter(Boolean).join(" · "),
    cep: zip.length === 8 ? `${zip.slice(0, 5)}-${zip.slice(5)}` : zip,
    documentMasked: maskDocument(s.document),
    phone: s.phone ? formatPhone(s.phone) : "Sem telefone",
    isDefault: !!s.is_default,
  }
}
