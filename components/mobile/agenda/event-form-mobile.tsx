"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ImagePlus, Loader2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/compress-image"
import { EVENT_STATUSES, EVENT_TYPES, TZ } from "@/lib/events"
import { createEvent, updateEvent } from "@/app/(dashboard)/agenda/actions"

export interface MobileEventFormValues {
  id?: string
  title: string
  description: string
  eventType: string
  status: string
  startIso: string | null
  endIso: string | null
  locationType: string
  locationName: string
  city: string
  state: string
  contactName: string
  contactPhone: string
  externalLink: string
  coverUrl: string | null
}

/** ISO → { date: "2026-09-24", time: "16:30" } no fuso de São Paulo. */
function splitIso(iso: string | null) {
  if (!iso) return { date: "", time: "" }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: TZ }),
    time: d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }),
  }
}

/** Data e hora escolhidas no aparelho → ISO com o fuso do aparelho. */
function joinIso(date: string, time: string) {
  if (!date) return ""
  return new Date(`${date}T${time || "00:00"}`).toISOString()
}

export function MobileEventForm({
  initial,
  /** Texto de apoio quando o formulário vem preenchido a partir de um lead. */
  prefillNote,
}: {
  initial: MobileEventFormValues
  prefillNote?: string
}) {
  const isEditing = !!initial.id
  const [isPending, startTransition] = React.useTransition()
  const [v, setV] = React.useState(initial)
  const start0 = splitIso(initial.startIso)
  const end0 = splitIso(initial.endIso)
  const [startDate, setStartDate] = React.useState(start0.date)
  const [startTime, setStartTime] = React.useState(start0.time)
  const [multiDay, setMultiDay] = React.useState(!!initial.endIso)
  const [endDate, setEndDate] = React.useState(end0.date)
  const [endTime, setEndTime] = React.useState(end0.time)
  const [cover, setCover] = React.useState<{ file: File; url: string } | null>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const set = <K extends keyof MobileEventFormValues>(key: K, value: MobileEventFormValues[K]) =>
    setV((prev) => ({ ...prev, [key]: value }))

  const valid = v.title.trim() && startDate && startTime && (!multiDay || endDate)
  const backHref = isEditing ? `/agenda/${initial.id}` : "/agenda"
  const coverPreview = cover?.url ?? v.coverUrl

  function submit() {
    if (!valid) return
    startTransition(async () => {
      const fd = new FormData()
      fd.set("title", v.title.trim())
      fd.set("description", v.description)
      fd.set("event_type", v.eventType)
      fd.set("status", v.status)
      fd.set("location_type", v.locationType)
      fd.set("location_name", v.locationType === "online" ? "" : v.locationName)
      fd.set("city", v.locationType === "online" ? "" : v.city)
      fd.set("state", v.locationType === "online" ? "" : v.state.toUpperCase())
      fd.set("contact_name", v.contactName)
      fd.set("contact_phone", v.contactPhone)
      fd.set("external_link", v.externalLink)
      fd.set("start_date", joinIso(startDate, startTime))
      fd.set("end_date", multiDay ? joinIso(endDate, endTime || startTime) : "")
      fd.set("redirect_to", isEditing ? `/agenda/${initial.id}` : "/agenda")
      if (cover) fd.set("cover", await compressImage(cover.file))
      const result = isEditing ? await updateEvent(initial.id!, fd) : await createEvent(fd)
      // Sucesso redireciona no servidor; só volta aqui com erro.
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(1rem,env(safe-area-inset-top))] grid grid-cols-[96px_minmax(0,1fr)_96px] items-center border-b bg-background/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <Link href={backHref} className="flex h-14 items-center px-3 text-base font-medium text-foreground/80">
          Cancelar
        </Link>
        <h1 className="truncate text-center text-[17px] font-bold">{isEditing ? "Editar evento" : "Novo evento"}</h1>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || isPending}
          className="flex h-14 items-center justify-end px-3 text-base font-bold text-primary disabled:text-muted-foreground/60"
        >
          {isPending ? <Loader2 className="size-5 animate-spin" /> : isEditing ? "Salvar" : "Criar"}
        </button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-7 pt-6"
      >
        {prefillNote && (
          <p className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-[13px] leading-snug">{prefillNote}</p>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) setCover({ file, url: URL.createObjectURL(file) })
          }}
        />
        {coverPreview ? (
          <div className="relative overflow-hidden rounded-[22px] border">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local ou Supabase Storage */}
            <img src={coverPreview} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex h-10 items-center rounded-xl bg-background/85 px-3.5 text-sm font-semibold backdrop-blur"
              >
                Trocar capa
              </button>
              {cover && (
                <button
                  type="button"
                  aria-label="Descartar nova capa"
                  onClick={() => setCover(null)}
                  className="flex size-10 items-center justify-center rounded-xl bg-background/85 backdrop-blur"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex h-[170px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-dashed border-primary/50 bg-primary/5"
          >
            <span className="flex size-[52px] items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ImagePlus className="size-6" strokeWidth={1.8} />
            </span>
            <span className="text-[15px] font-bold">Adicionar capa</span>
            <span className="text-[13px] text-muted-foreground">Aparece na agenda do site</span>
          </button>
        )}

        <Section title="Informações">
          <Group>
            <Field label="Título">
              <textarea
                rows={2}
                value={v.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Nome do evento"
                className="resize-none bg-transparent text-base leading-snug font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
              />
            </Field>
            <Field label="Descrição">
              <textarea
                rows={4}
                value={v.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="O que o público precisa saber"
                className="resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
              />
            </Field>
          </Group>
        </Section>

        <Section title="Tipo">
          <Choices options={EVENT_TYPES} value={v.eventType} onChange={(x) => set("eventType", x)} cols={4} />
        </Section>

        <Section title="Status">
          <Choices options={EVENT_STATUSES} value={v.status} onChange={(x) => set("status", x)} cols={2} />
        </Section>

        <Section title="Quando">
          <Group>
            <DateTimeRow label="Início" date={startDate} time={startTime} onDate={setStartDate} onTime={setStartTime} />
            <button
              type="button"
              role="switch"
              aria-checked={multiDay}
              onClick={() => {
                setMultiDay((m) => !m)
                if (!endDate) setEndDate(startDate)
                if (!endTime) setEndTime(startTime)
              }}
              className="flex min-h-14 items-center gap-3 px-4 text-left"
            >
              <span className="grow text-[15px] text-foreground/85">Mais de um dia</span>
              <Switch on={multiDay} />
            </button>
            {multiDay && (
              <DateTimeRow label="Fim" date={endDate} time={endTime} onDate={setEndDate} onTime={setEndTime} min={startDate} />
            )}
          </Group>
        </Section>

        <Section title="Onde">
          <Choices
            options={[
              { value: "presencial", label: "Presencial" },
              { value: "online", label: "Online" },
            ]}
            value={v.locationType}
            onChange={(x) => set("locationType", x)}
            cols={2}
          />
          {v.locationType !== "online" && (
            <Group>
              <Field label="Nome do local">
                <Input value={v.locationName} onChange={(x) => set("locationName", x)} placeholder="Ex.: IASD Central" />
              </Field>
              <div className="grid grid-cols-[minmax(0,1fr)_90px] divide-x">
                <Field label="Cidade">
                  <Input value={v.city} onChange={(x) => set("city", x)} placeholder="Cidade" />
                </Field>
                <Field label="UF">
                  <Input value={v.state} onChange={(x) => set("state", x.toUpperCase().slice(0, 2))} placeholder="UF" />
                </Field>
              </div>
            </Group>
          )}
        </Section>

        <Section title="Contato" hint="Fica só no painel; não aparece no site.">
          <Group>
            <Field label="Nome">
              <Input value={v.contactName} onChange={(x) => set("contactName", x)} placeholder="Quem convidou ou organiza" />
            </Field>
            <Field label="Telefone">
              <Input value={v.contactPhone} onChange={(x) => set("contactPhone", x)} placeholder="(00) 00000-0000" type="tel" />
            </Field>
          </Group>
        </Section>

        <Section title="Link externo" hint="Inscrição, transmissão ou página do evento.">
          <Group>
            <Field label="Link">
              <Input value={v.externalLink} onChange={(x) => set("externalLink", x)} placeholder="https://…" type="url" />
            </Field>
          </Group>
        </Section>


        <button
          type="submit"
          disabled={!valid || isPending}
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEditing ? "Salvar alterações" : "Criar evento"}
        </button>
      </form>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      {children}
      {hint && <span className="px-1 text-[13px] text-muted-foreground">{hint}</span>}
    </section>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-w-0 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
    />
  )
}

function Choices({
  options,
  value,
  onChange,
  cols,
}: {
  options: readonly { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  cols: number
}) {
  return (
    <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-11 rounded-[13px] border-[1.5px] px-1 text-sm",
            value === o.value ? "border-primary bg-primary/10 font-bold" : "bg-card font-medium text-foreground/80",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function DateTimeRow({
  label,
  date,
  time,
  onDate,
  onTime,
  min,
}: {
  label: string
  date: string
  time: string
  onDate: (v: string) => void
  onTime: (v: string) => void
  min?: string
}) {
  const pill = "h-9 rounded-[11px] bg-muted px-2.5 text-sm font-semibold outline-none dark:[color-scheme:dark]"
  return (
    <div className="flex min-h-14 items-center gap-2 pr-3 pl-4">
      <span className="grow text-[15px] text-foreground/85">{label}</span>
      <input type="date" aria-label={`${label}: data`} value={date} min={min} onChange={(e) => onDate(e.target.value)} className={pill} />
      <input type="time" aria-label={`${label}: hora`} value={time} onChange={(e) => onTime(e.target.value)} className={pill} />
    </div>
  )
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-muted-foreground/30")}>
      <span className={cn("absolute top-0.5 size-[27px] rounded-full bg-white shadow transition-[left]", on ? "left-[22px]" : "left-0.5")} />
    </span>
  )
}
