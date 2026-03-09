"use client"

import { useEffect, useTransition } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { updateLeadStatus, markAsRead } from "@/app/(dashboard)/leads/actions"
import { toast } from "sonner"
import {
  Mail,
  Phone,
  User,
  Calendar,
  MapPin,
  Globe,
  Clock,
  Loader2,
} from "lucide-react"
import type { Json } from "@/lib/supabase/database.types"

interface EventDetails {
  locationType?: string
  duration?: string
  city?: string
  state?: string
  schedule?: Array<{ date: string; time: string }>
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  type: string | null
  status: string | null
  event_details: Json | null
  created_at: string | null
}

const statusLabels: Record<string, string> = {
  new: "Novo",
  read: "Lido",
  answered: "Respondido",
  archived: "Arquivado",
}

const statusColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "default",
  read: "secondary",
  answered: "outline",
  archived: "destructive",
}

interface LeadDetailDrawerProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadDetailDrawer({
  lead,
  open,
  onOpenChange,
}: LeadDetailDrawerProps) {
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (lead && lead.status === "new" && open) {
      markAsRead(lead.id)
    }
  }, [lead, open])

  if (!lead) return null

  const eventDetails = lead.event_details as EventDetails | null

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const result = await updateLeadStatus(lead!.id, status)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Status atualizado")
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{lead.name}</SheetTitle>
            <Badge variant={statusColors[lead.status ?? "new"]}>
              {statusLabels[lead.status ?? "new"]}
            </Badge>
          </div>
          <SheetDescription>
            {lead.type === "invite" ? "Convite para evento" : "Contato geral"} —{" "}
            {lead.created_at
              ? new Date(lead.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          {/* Contact info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Informações de Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{lead.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-primary underline underline-offset-2"
                >
                  {lead.email}
                </a>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-primary underline underline-offset-2"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Message */}
          {lead.message && (
            <>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Mensagem</h3>
                <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                  {lead.message}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Event details (for invite type) */}
          {lead.type === "invite" && eventDetails && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Detalhes do Convite</h3>
                <div className="space-y-2 rounded-lg border p-3">
                  {eventDetails.locationType && (
                    <div className="flex items-center gap-2 text-sm">
                      {eventDetails.locationType === "online" ? (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        {eventDetails.locationType === "online"
                          ? "Online"
                          : "Presencial"}
                      </span>
                    </div>
                  )}
                  {eventDetails.duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {eventDetails.duration === "single-day"
                          ? "Um dia"
                          : "Vários dias"}
                      </span>
                    </div>
                  )}
                  {(eventDetails.city || eventDetails.state) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {[eventDetails.city, eventDetails.state]
                          .filter(Boolean)
                          .join(" - ")}
                      </span>
                    </div>
                  )}
                  {eventDetails.schedule && eventDetails.schedule.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Datas/Horários:
                      </p>
                      {eventDetails.schedule.map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>
                            {s.date} - {s.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Status change */}
          <div className="space-y-2">
            <Label>Alterar Status</Label>
            <div className="flex items-center gap-2">
              <Select
                defaultValue={lead.status ?? "new"}
                onValueChange={handleStatusChange}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="read">Lido</SelectItem>
                  <SelectItem value="answered">Respondido</SelectItem>
                  <SelectItem value="archived">Arquivado</SelectItem>
                </SelectContent>
              </Select>
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
