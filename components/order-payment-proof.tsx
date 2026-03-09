"use client"

import { useRef, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  uploadPaymentProof,
  removePaymentProof,
} from "@/app/(dashboard)/pedidos/actions"
import { toast } from "sonner"
import { FileUp, Loader2, Trash2, ExternalLink } from "lucide-react"

interface OrderPaymentProofProps {
  orderId: string
  currentUrl: string | null
}

export function OrderPaymentProof({
  orderId,
  currentUrl,
}: OrderPaymentProofProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("file", file)

    startTransition(async () => {
      const result = await uploadPaymentProof(orderId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Comprovante enviado")
      }
    })

    if (fileRef.current) fileRef.current.value = ""
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removePaymentProof(orderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Comprovante removido")
      }
    })
  }

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium">Comprovante de Pagamento</span>

      {currentUrl ? (
        <div className="space-y-2">
          {currentUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
            <img
              src={currentUrl}
              alt="Comprovante"
              className="max-h-48 rounded-lg border object-contain"
            />
          ) : (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver comprovante
            </a>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileUp className="mr-1 h-3.5 w-3.5" />
              )}
              Substituir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remover
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="mr-1 h-3.5 w-3.5" />
          )}
          Enviar comprovante
        </Button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  )
}
