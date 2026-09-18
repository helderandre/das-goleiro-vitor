"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  CalendarDays,
  ChevronLeft,
  ImagePlus,
  Link2,
  Loader2,
  MapPin,
  PenLine,
  Share2,
  Trash2,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { EVENT_STATUSES } from "@/lib/events"
import { formatPhone, whatsappNumber } from "@/lib/phone"
import { deleteEvent, updateEventStatus } from "@/app/(dashboard)/agenda/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

export interface MobileEventDetailProps {
  event: {
    id: string
    title: string
    description: string | null
    status: string
    typeLabel: string
    online: boolean
    coverUrl: string | null
    relative: string
    past: boolean
    ongoing: boolean
    whenTitle: string
    whenSub: string | null
    locationName: string | null
    cityState: string
    contactName: string | null
    contactPhone: string | null
    externalLink: string | null
    /** ISO, para o arquivo de calendário. */
    startIso: string
    endIso: string | null
  }
}

const STATUS_CHIP: Record<string, string> = {
  "a confirmar": "border border-primary/50 text-primary",
  confirmado: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "em andamento": "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  encerrado: "bg-muted text-foreground/70",
}

/** Arquivo .ics: abre direto no calendário do celular. */
function downloadIcs(e: MobileEventDetailProps["event"]) {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  const end = e.endIso ?? new Date(new Date(e.startIso).getTime() + 2 * 3600_000).toISOString()
  const esc = (t: string) => t.replace(/[\\,;]/g, (m) => `\\${m}`).replace(/\n/g, "\\n")
  const location = [e.locationName, e.cityState].filter(Boolean).join(", ")
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Goleiro Vitor//Agenda//PT",
    "BEGIN:VEVENT",
    `UID:${e.id}@goleirovitor.com.br`,
    `DTSTAMP:${fmt(new Date().toISOString())}`,
    `DTSTART:${fmt(e.startIso)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(e.title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }))
  const a = document.createElement("a")
  a.href = url
  a.download = "evento.ics"
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function MobileEventDetail({ event: e }: MobileEventDetailProps) {
  const router = useRouter()
  const [status, setStatus] = React.useState(e.status)
  const [saving, setSaving] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const mapQuery = [e.locationName, e.cityState].filter(Boolean).join(", ")
  const waContact = e.contactPhone ? whatsappNumber(e.contactPhone) : null

  async function changeStatus(next: string) {
    if (next === status) return
    const prev = status
    setStatus(next)
    setSaving(next)
    const result = await updateEventStatus(e.id, next)
    setSaving(null)
    if (result.error) {
      setStatus(prev)
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function share() {
    const text = `${e.title} — ${e.whenTitle}${mapQuery ? ` · ${mapQuery}` : ""}`
    try {
      if (navigator.share) await navigator.share({ title: e.title, text, url: e.externalLink ?? undefined })
      else {
        await navigator.clipboard.writeText(text)
        toast.success("Dados do evento copiados")
      }
    } catch {
      // compartilhamento cancelado
    }
  }

  const statusLabel = EVENT_STATUSES.find((s) => s.value === status)?.label ?? status
  const when = e.ongoing ? "Acontecendo agora" : e.past ? `Foi ${e.relative}` : `Começa ${e.relative}`

  return (
    <div className="-mx-4 -mt-[max(1rem,env(safe-area-inset-top))] flex flex-col md:mx-0 md:mt-0">
      <section
        aria-label="Capa"
        className="relative flex h-[250px] flex-col justify-between overflow-hidden rounded-b-[32px] bg-card px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-5 md:rounded-[32px]"
      >
        {e.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- capa no Supabase Storage
          <img src={e.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <div className="relative flex justify-between">
          <Link
            href="/agenda"
            aria-label="Voltar para agenda"
            className="flex size-11 items-center justify-center rounded-full border bg-background/70 backdrop-blur"
          >
            <ChevronLeft className="size-[22px]" />
          </Link>
          <button
            type="button"
            onClick={share}
            aria-label="Compartilhar evento"
            className="flex size-11 items-center justify-center rounded-full border bg-background/70 backdrop-blur"
          >
            <Share2 className="size-[19px]" strokeWidth={1.8} />
          </button>
        </div>
        {!e.coverUrl && (
          <Link
            href={`/agenda/${e.id}/editar`}
            className="flex flex-col items-center gap-2 self-center text-[13px] font-semibold text-muted-foreground"
          >
            <span className="flex size-[52px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-primary/50 text-primary">
              <ImagePlus className="size-[22px]" strokeWidth={1.8} />
            </span>
            Adicionar capa
          </Link>
        )}
        <span />
      </section>

      <div className="flex flex-col gap-6 px-5 pt-[22px] md:px-0">
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Chip className={STATUS_CHIP[status] ?? "bg-muted"}>{statusLabel}</Chip>
            <Chip className="bg-muted text-foreground/80">{e.typeLabel}</Chip>
            <Chip className="bg-muted text-foreground/80">{e.online ? "Online" : "Presencial"}</Chip>
          </div>
          <h1 className="text-[25px] leading-tight font-extrabold tracking-tight">{e.title}</h1>
          <span className={cn("text-sm font-semibold", e.past ? "text-muted-foreground" : "text-primary")}>{when}</span>
        </div>

        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <InfoRow
            icon={CalendarDays}
            title={e.whenTitle}
            sub={e.whenSub}
            action={!e.past ? { label: "Agenda do celular", onClick: () => downloadIcs(e) } : undefined}
          />
          <InfoRow
            icon={MapPin}
            title={e.online ? "Online" : (e.locationName ?? (e.cityState || "Local não informado"))}
            sub={e.online ? null : e.locationName ? e.cityState : null}
            action={
              !e.online && mapQuery
                ? { label: "Mapa", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` }
                : undefined
            }
          />
          <InfoRow
            icon={User}
            title={e.contactName ?? "Sem contato"}
            sub={e.contactPhone ? formatPhone(e.contactPhone) : "Quem convidou ou organiza"}
            action={
              waContact
                ? { label: "WhatsApp", href: `https://wa.me/${waContact}` }
                : e.contactName || e.contactPhone
                  ? undefined
                  : { label: "Adicionar", href: `/agenda/${e.id}/editar`, internal: true }
            }
          />
          <InfoRow
            icon={Link2}
            title={e.externalLink ? "Link externo" : "Sem link externo"}
            sub={e.externalLink ?? "Inscrição, transmissão ou página"}
            action={
              e.externalLink
                ? { label: "Abrir", href: e.externalLink }
                : { label: "Adicionar", href: `/agenda/${e.id}/editar`, internal: true }
            }
          />
        </div>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold tracking-tight">Descrição</h2>
          {e.description ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{e.description}</p>
          ) : (
            <Link
              href={`/agenda/${e.id}/editar`}
              className="rounded-[20px] border bg-card p-4 text-sm leading-relaxed text-muted-foreground"
            >
              Nenhuma descrição. Toque para escrever o que o público precisa saber.
            </Link>
          )}
        </section>

        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold tracking-tight">Status</h2>
          <div role="radiogroup" aria-label="Status do evento" className="grid grid-cols-2 gap-2">
            {EVENT_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={status === s.value}
                onClick={() => changeStatus(s.value)}
                className={cn(
                  "flex h-[46px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] text-[15px]",
                  status === s.value ? "border-primary bg-primary/10 font-bold" : "bg-card font-medium text-foreground/80",
                )}
              >
                {saving === s.value && <Loader2 className="size-4 animate-spin" />}
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-muted-foreground">Muda na hora, sem abrir a edição.</span>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t bg-background/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label="Excluir evento"
          className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-card text-destructive"
        >
          <Trash2 className="size-5" strokeWidth={1.8} />
        </button>
        <Link
          href={`/agenda/${e.id}/editar`}
          className="flex h-[54px] grow items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground"
        >
          <PenLine className="size-[18px]" />
          Editar evento
        </Link>
      </div>

      <DeleteEventSheet open={deleteOpen} onOpenChange={setDeleteOpen} id={e.id} title={e.title} />
    </div>
  )
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("flex h-6 items-center rounded-full px-2.5 text-xs font-bold", className)}>{children}</span>
}

function InfoRow({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  sub: string | null
  action?: { label: string; href?: string; onClick?: () => void; internal?: boolean }
}) {
  const btn = "flex h-[34px] shrink-0 items-center rounded-[11px] bg-muted px-3 text-[13px] font-semibold"
  return (
    <div className="flex items-center gap-3.5 px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-[19px]" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{title}</span>
        {sub && <span className="truncate text-[13px] text-muted-foreground">{sub}</span>}
      </span>
      {action &&
        (action.onClick ? (
          <button type="button" onClick={action.onClick} className={btn}>
            {action.label}
          </button>
        ) : action.internal ? (
          <Link href={action.href!} className={btn}>
            {action.label}
          </Link>
        ) : (
          <a href={action.href} target="_blank" rel="noopener noreferrer" className={btn}>
            {action.label}
          </a>
        ))}
    </div>
  )
}

function DeleteEventSheet({
  open,
  onOpenChange,
  id,
  title,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string
  title: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function remove() {
    startTransition(async () => {
      const result = await deleteEvent(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success("Evento excluído")
      onOpenChange(false)
      router.push("/agenda")
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-3 pt-5 text-center">
          <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-destructive/15 text-destructive">
            <Trash2 className="size-7" strokeWidth={1.8} />
          </span>
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">Excluir este evento?</DrawerTitle>
          <DrawerDescription className="text-[15px] leading-normal text-foreground/85">
            <strong className="text-foreground">{title}</strong> sai da agenda do site e do painel. Não dá para desfazer.
          </DrawerDescription>
          <span className="text-[13px] leading-snug text-muted-foreground">
            Se só mudou de data ou foi cancelado, prefira editar ou marcar como Encerrado: o histórico fica.
          </span>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-destructive text-base font-bold text-white disabled:opacity-60"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Excluir evento
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-[50px] rounded-2xl border bg-muted/60 text-base font-semibold">
            Voltar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
