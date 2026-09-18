"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { ChevronDown, Loader2, RotateCw, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  resendOrderEmail,
  sendOrderEmailManually,
} from "@/app/(dashboard)/pedidos/actions"
import { EMAIL_KIND_LABELS } from "@/lib/order-email-kinds"

export interface OrderEmail {
  id: string
  kind: string
  status: string
  delivery_status: string | null
  recipient: string | null
  attempts: number
  last_error: string | null
  created_at: string
  sent_at: string | null
  resent_from: string | null
  requested_by: string | null
  test_redirect_to: string | null
}

export interface OrderEmailEvent {
  id: string
  outbox_id: string
  type: string
  occurred_at: string
  detail: string | null
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

const STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: "Pendente", variant: "secondary" },
  sending: { label: "Enviando", variant: "secondary" },
  sent: { label: "Enviado", variant: "outline" },
  failed: { label: "Falhou", variant: "destructive" },
  skipped: { label: "Descartado", variant: "outline" },
}

const DELIVERY: Record<string, { label: string; variant: BadgeVariant }> = {
  sent: { label: "Aguardando entrega", variant: "secondary" },
  delivery_delayed: { label: "Entrega atrasada", variant: "secondary" },
  delivered: { label: "Entregue", variant: "default" },
  opened: { label: "Aberto", variant: "default" },
  clicked: { label: "Clicado", variant: "default" },
  bounced: { label: "Rejeitado", variant: "destructive" },
  complained: { label: "Marcado como spam", variant: "destructive" },
}

/** Já chegou ao cliente: reenviar pede confirmação. */
const REACHED = new Set(["delivered", "opened", "clicked"])
const IN_QUEUE = new Set(["pending", "sending"])

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface OrderEmailsProps {
  orderId: string
  emails: OrderEmail[]
  events: OrderEmailEvent[]
  /** Tipos que fazem sentido para o estado atual e ainda não existem. */
  availableKinds: string[]
}

export function OrderEmails({
  orderId,
  emails,
  events,
  availableKinds,
}: OrderEmailsProps) {
  const sendButton =
    availableKinds.length > 0 ? (
      <ManualSendButton orderId={orderId} kinds={availableKinds} />
    ) : null

  if (emails.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Nenhum e-mail enviado para este pedido.
        </p>
        {sendButton}
      </div>
    )
  }

  // Cada original com seus reenvios logo abaixo.
  const roots = emails.filter((e) => !e.resent_from)
  const resends = new Map<string, OrderEmail[]>()
  for (const e of emails) {
    if (!e.resent_from) continue
    resends.set(e.resent_from, [...(resends.get(e.resent_from) ?? []), e])
  }
  const eventsByEmail = new Map<string, OrderEmailEvent[]>()
  for (const ev of events) {
    eventsByEmail.set(ev.outbox_id, [
      ...(eventsByEmail.get(ev.outbox_id) ?? []),
      ev,
    ])
  }

  return (
    <div className="space-y-4">
      <div className="divide-y">
        {roots.map((root) => {
          const group = [root, ...(resends.get(root.id) ?? [])]
          const latest = group[group.length - 1]
          const inQueue = group.some((e) => IN_QUEUE.has(e.status))
          return (
            <div key={root.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
              {group.map((email, index) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  isResend={index > 0}
                  events={eventsByEmail.get(email.id) ?? []}
                />
              ))}
              {!inQueue && (
                <ResendButton
                  orderId={orderId}
                  email={latest}
                  needsConfirm={REACHED.has(latest.delivery_status ?? "")}
                />
              )}
            </div>
          )
        })}
      </div>
      {sendButton}
    </div>
  )
}

function ManualSendButton({
  orderId,
  kinds,
}: {
  orderId: string
  kinds: string[]
}) {
  const [isPending, startTransition] = useTransition()

  function send(kind: string) {
    startTransition(async () => {
      const result = await sendOrderEmailManually(orderId, kind)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        `"${EMAIL_KIND_LABELS[kind] ?? kind}" colocado na fila de envio`
      )
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Enviar e-mail
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Disponíveis para o estado atual
        </DropdownMenuLabel>
        {kinds.map((kind) => (
          <DropdownMenuItem key={kind} onSelect={() => send(kind)}>
            {EMAIL_KIND_LABELS[kind] ?? kind}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmailRow({
  email,
  isResend,
  events,
}: {
  email: OrderEmail
  isResend: boolean
  events: OrderEmailEvent[]
}) {
  const status = STATUS[email.status] ?? {
    label: email.status,
    variant: "outline" as const,
  }
  const delivery = email.delivery_status
    ? DELIVERY[email.delivery_status]
    : null
  // Motivo da rejeição vem no evento, não na linha da fila.
  const rejection = events
    .filter(
      (e) => (e.type === "bounced" || e.type === "complained") && e.detail
    )
    .at(-1)?.detail
  const reason =
    email.status === "failed" || email.status === "skipped"
      ? email.last_error
      : null
  const retrying =
    email.status === "pending" && email.attempts > 0 ? email.last_error : null

  return (
    <div className={isResend ? "border-l-2 pl-3" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {EMAIL_KIND_LABELS[email.kind] ?? email.kind}
          {isResend && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              reenvio
            </span>
          )}
          {!isResend && email.requested_by && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              envio manual
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {email.status !== "sent" && (
            <Badge variant={status.variant}>{status.label}</Badge>
          )}
          {email.status === "sent" && delivery && (
            <Badge variant={delivery.variant}>{delivery.label}</Badge>
          )}
        </div>
      </div>

      <p className="mt-0.5 text-xs break-all text-muted-foreground">
        {email.recipient ?? "—"} ·{" "}
        {formatDateTime(email.sent_at ?? email.created_at)}
      </p>
      {email.test_redirect_to && (
        <p className="mt-0.5 text-xs break-all text-amber-600 dark:text-amber-500">
          Modo de teste: entregue a {email.test_redirect_to}, não ao cliente
        </p>
      )}

      {reason && <p className="mt-1 text-xs text-muted-foreground">{reason}</p>}
      {retrying && (
        <p className="mt-1 text-xs text-muted-foreground">
          Nova tentativa agendada ({email.attempts} de 5): {retrying}
        </p>
      )}
      {rejection && (
        <p className="mt-1 text-xs text-destructive">{rejection}</p>
      )}

      {events.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">
              Ver linha do tempo ({events.length})
            </span>
            <span className="hidden group-open:inline">
              Ocultar linha do tempo
            </span>
          </summary>
          <ol className="mt-2 space-y-1 border-l pl-3">
            {events.map((ev) => (
              <li key={ev.id} className="text-xs">
                <span className="font-medium">
                  {DELIVERY[ev.type]?.label ?? ev.type}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {formatDateTime(ev.occurred_at)}
                </span>
                {ev.detail && (
                  <span className="block break-all text-muted-foreground">
                    {ev.detail}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}

function ResendButton({
  orderId,
  email,
  needsConfirm,
}: {
  orderId: string
  email: OrderEmail
  needsConfirm: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function resend() {
    setConfirmOpen(false)
    startTransition(async () => {
      const result = await resendOrderEmail(email.id, orderId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("E-mail colocado na fila de envio")
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 text-xs"
        disabled={isPending}
        onClick={() => (needsConfirm ? setConfirmOpen(true) : resend())}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RotateCw className="h-3.5 w-3.5" />
        )}
        Reenviar
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar mesmo assim?</DialogTitle>
            <DialogDescription>
              Este e-mail já consta como{" "}
              {DELIVERY[email.delivery_status ?? ""]?.label.toLowerCase() ??
                "entregue"}{" "}
              para {email.recipient}. O cliente vai receber uma nova cópia,
              montada com os dados atuais do pedido.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={resend}>Reenviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
