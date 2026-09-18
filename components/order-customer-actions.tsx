"use client"

import { toast } from "sonner"
import { Copy, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPhone, whatsappOrderLink } from "@/lib/phone"

interface OrderCustomerActionsProps {
  name: string | null
  email: string | null
  phone: string | null
  shortId: string
}

export function OrderCustomerActions({
  name,
  email,
  phone,
  shortId,
}: OrderCustomerActionsProps) {
  const waLink = whatsappOrderLink(phone, name, shortId)

  async function copyData() {
    const text = [name, email, phone ? formatPhone(phone) : null]
      .filter(Boolean)
      .join("\n")
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Dados do cliente copiados")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button size="sm" variant="outline" onClick={copyData}>
        <Copy className="h-3.5 w-3.5" />
        Copiar dados
      </Button>
      {waLink && (
        <Button size="sm" variant="outline" asChild>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        </Button>
      )}
    </div>
  )
}
