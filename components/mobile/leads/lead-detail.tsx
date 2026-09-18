"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Archive, ArchiveRestore, CalendarPlus, ChevronLeft, ChevronRight, Loader2, Mail, MessageCircle, Phone, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { LEAD_STATUSES } from "@/lib/leads"
import { formatPhone, whatsappNumber } from "@/lib/phone"
import { bulkDeleteLeads, updateLeadStatus } from "@/app/(dashboard)/leads/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

export interface MobileLeadDetailProps {
  lead: {
    id: string
    name: string
    email: string
    phone: string | null
    message: string | null
    status: string
    isInvite: boolean
    receivedLabel: string
    invite: {
      modality: string | null
      duration: string | null
      place: string | null
      dates: string[]
    } | null
  }
}

export function MobileLeadDetail({ lead: l }: MobileLeadDetailProps) {
  const router = useRouter()
  const [status, setStatus] = React.useState(l.status)
  const [saving, setSaving] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const wa = l.phone ? whatsappNumber(l.phone) : null
  const first = l.name.trim().split(/\s+/)[0]
  const waText = `Olá, ${first}! Aqui é da equipe do Goleiro Vitor, sobre ${l.isInvite ? "o seu convite" : "a sua mensagem"} pelo site.`
  const waHref = wa ? `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` : null
  const mailHref = `mailto:${l.email}?subject=${encodeURIComponent(l.isInvite ? "Seu convite para o Vitor" : "Seu contato pelo site")}`

  async function changeStatus(next: string) {
    if (next === status) return
    const prev = status
    setStatus(next)
    setSaving(next)
    const result = await updateLeadStatus(l.id, next)
    setSaving(null)
    if (result.error) {
      setStatus(prev)
      toast.error(result.error)
      return
    }
    if (next === "archived") toast.success("Lead arquivado")
    router.refresh()
  }

  /** Respondeu por WhatsApp ou e-mail: marca como respondido. */
  function markAnswered() {
    if (status === "new" || status === "read") changeStatus("answered")
  }

  const statusLabel = LEAD_STATUSES.find((s) => s.value === status)?.label ?? status
  const archived = status === "archived"

  return (
    <div className="flex flex-col gap-6 pt-1">
      <div className="flex items-center justify-between">
        <Link href="/leads" aria-label="Voltar para leads" className="flex size-11 items-center justify-center rounded-full border bg-card">
          <ChevronLeft className="size-[22px]" />
        </Link>
        <button
          type="button"
          onClick={() => changeStatus(archived ? "read" : "archived")}
          aria-label={archived ? "Desarquivar lead" : "Arquivar lead"}
          className="flex size-11 items-center justify-center rounded-full border bg-card"
        >
          {archived ? <ArchiveRestore className="size-[19px]" strokeWidth={1.8} /> : <Archive className="size-[19px]" strokeWidth={1.8} />}
        </button>
      </div>

      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={cn(
              "flex h-6 items-center rounded-full px-2.5 text-xs font-bold",
              l.isInvite ? "bg-primary/15 text-primary" : "bg-muted text-foreground/80",
            )}
          >
            {l.isInvite ? "Convite para evento" : "Contato geral"}
          </span>
          <span className="flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-bold text-foreground/80">{statusLabel}</span>
        </div>
        <h1 className="text-[26px] leading-tight font-extrabold tracking-tight">{l.name}</h1>
        <span className="text-sm text-muted-foreground">Recebido {l.receivedLabel}</span>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <QuickAction href={waHref} icon={MessageCircle} label="WhatsApp" onClick={markAnswered} />
        <QuickAction href={mailHref} icon={Mail} label="E-mail" onClick={markAnswered} />
        <QuickAction href={l.phone ? `tel:${l.phone.replace(/\D/g, "")}` : null} icon={Phone} label="Ligar" />
      </div>

      {l.message && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold tracking-tight">Mensagem</h2>
          <p className="rounded-[20px] border bg-card p-4 text-[15px] leading-relaxed whitespace-pre-line text-foreground/90">{l.message}</p>
        </section>
      )}

      {l.invite && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold tracking-tight">Detalhes do convite</h2>
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            {l.invite.modality && <Row label="Modalidade" value={l.invite.modality} />}
            {l.invite.duration && <Row label="Duração" value={l.invite.duration} />}
            {l.invite.place && <Row label="Cidade" value={l.invite.place} />}
            {l.invite.dates.length > 0 && <Row label="Datas" value={l.invite.dates.join("\n")} />}
          </div>
        </section>
      )}

      {l.isInvite && (
        <Link
          href={`/agenda/novo?lead=${l.id}`}
          className="flex items-center gap-3.5 rounded-[20px] border border-primary/35 bg-primary/10 p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground">
            <CalendarPlus className="size-[21px]" strokeWidth={2} />
          </span>
          <span className="flex grow flex-col gap-0.5">
            <span className="text-base font-bold">Aceitou? Crie o evento</span>
            <span className="text-[13px] text-foreground/80">A agenda já vem preenchida com cidade e datas do convite</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-primary" />
        </Link>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold tracking-tight">Contato</h2>
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <Row label="E-mail" value={l.email} />
          <Row label="Telefone" value={l.phone ? formatPhone(l.phone) : "—"} />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold tracking-tight">Status</h2>
        <div role="radiogroup" aria-label="Status do lead" className="grid grid-cols-4 gap-1.5">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={status === s.value}
              onClick={() => changeStatus(s.value)}
              className={cn(
                "flex h-11 items-center justify-center gap-1 rounded-[13px] border-[1.5px] text-[13px]",
                status === s.value ? "border-primary bg-primary/10 font-bold" : "bg-card font-medium text-foreground/80",
              )}
            >
              {saving === s.value && <Loader2 className="size-3.5 animate-spin" />}
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2.5 border-t bg-background/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          aria-label="Excluir lead"
          className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-card text-destructive"
        >
          <Trash2 className="size-5" strokeWidth={1.8} />
        </button>
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markAnswered}
            className="flex h-[54px] grow items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground"
          >
            <MessageCircle className="size-[19px]" />
            Responder no WhatsApp
          </a>
        ) : (
          <a
            href={mailHref}
            onClick={markAnswered}
            className="flex h-[54px] grow items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground"
          >
            <Mail className="size-[19px]" />
            Responder por e-mail
          </a>
        )}
      </div>

      <DeleteLeadSheet open={deleteOpen} onOpenChange={setDeleteOpen} id={l.id} name={l.name} />
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string | null
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick?: () => void
}) {
  const className = "flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border bg-muted/60 text-xs font-semibold"
  if (!href) {
    return (
      <span className={cn(className, "opacity-40")}>
        <Icon className="size-5" strokeWidth={1.8} />
        {label}
      </span>
    )
  }
  return (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" onClick={onClick} className={className}>
      <Icon className="size-5" strokeWidth={1.8} />
      {label}
    </a>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3.5 text-[15px]">
      <span className="shrink-0 text-foreground/80">{label}</span>
      <span className="min-w-0 text-right font-semibold break-words whitespace-pre-line">{value}</span>
    </div>
  )
}

function DeleteLeadSheet({
  open,
  onOpenChange,
  id,
  name,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  id: string
  name: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  function remove() {
    startTransition(async () => {
      const result = await bulkDeleteLeads([id])
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Lead excluído")
      onOpenChange(false)
      router.push("/leads")
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-3 pt-5 text-center">
          <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-destructive/15 text-destructive">
            <Trash2 className="size-7" strokeWidth={1.8} />
          </span>
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">Excluir este lead?</DrawerTitle>
          <DrawerDescription className="text-[15px] leading-normal text-foreground/85">
            A mensagem de <strong className="text-foreground">{name}</strong> some do painel. Não dá para desfazer. Para só tirar da
            lista, arquive.
          </DrawerDescription>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-destructive text-base font-bold text-white disabled:opacity-60"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Excluir lead
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-[50px] rounded-2xl border bg-muted/60 text-base font-semibold">
            Voltar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
