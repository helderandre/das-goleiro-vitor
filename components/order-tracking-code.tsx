"use client"

import { useState, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateTrackingCode } from "@/app/(dashboard)/pedidos/actions"
import { toast } from "sonner"
import { AlertTriangle, Check, Loader2, Pencil, Truck, X } from "lucide-react"

interface OrderTrackingCodeProps {
  orderId: string
  currentCode: string | null
}

export function OrderTrackingCode({
  orderId,
  currentCode,
}: OrderTrackingCodeProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(currentCode ?? "")

  // "Rastrear" grava o código e revalida a página: sem ressincronizar, o
  // rascunho continuaria com o valor antigo (em geral vazio) e salvá-lo
  // apagaria o código recém-obtido.
  const [syncedCode, setSyncedCode] = useState(currentCode)
  if (syncedCode !== currentCode) {
    setSyncedCode(currentCode)
    setDraft(currentCode ?? "")
    setIsEditing(false)
  }

  const trimmed = draft.trim()
  const hasChanged = trimmed !== (currentCode ?? "")
  const isClearing = currentCode != null && trimmed === ""
  // Sem código salvo o campo já nasce editável; não há nada a proteger.
  const isLocked = Boolean(currentCode) && !isEditing

  function handleSave() {
    if (!hasChanged) return

    startTransition(async () => {
      const result = await updateTrackingCode(orderId, trimmed)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setIsEditing(false)
      toast.success(isClearing ? "Código removido" : "Código de rastreio salvo")
    })
  }

  function handleCancel() {
    setDraft(currentCode ?? "")
    setIsEditing(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Código de Rastreio</span>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ex: BR123456789XX"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isPending || isLocked}
          readOnly={isLocked}
          className={isLocked ? "font-mono" : undefined}
        />

        {isLocked ? (
          <Button
            size="icon"
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            title="Editar código"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button
              size="icon"
              variant="outline"
              onClick={handleSave}
              disabled={isPending || !hasChanged}
              title="Salvar"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            {isEditing && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      {isLocked && (
        <p className="text-xs text-muted-foreground">
          Código obtido do Melhor Envio. Clique no lápis para alterar.
        </p>
      )}

      {isEditing && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {isClearing
            ? "Salvar em branco remove o código do pedido."
            : "Alterar aqui sobrescreve o código vindo do Melhor Envio. Um novo “Rastrear” pode trazer o original de volta."}
        </p>
      )}
    </div>
  )
}
