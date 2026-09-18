"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Check,
  ChevronRight,
  ExternalLink,
  Globe,
  GripVertical,
  Heart,
  ImagePlus,
  Loader2,
  TriangleAlert,
  User,
  Video,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/compress-image"
import {
  PLATFORM_OPTIONS,
  buildFullUrl,
  extractHandle,
  getPlatformConfig,
  youtubeId,
  youtubeThumb,
  type SocialLink,
} from "@/lib/site"
import { updateSiteSettings } from "@/app/(dashboard)/site/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

export interface SiteValues {
  id: string
  profile_image_url: string | null
  profile_name: string
  profile_subtitle: string
  profile_quote: string
  video_thumbnail_url: string | null
  video_category: string
  video_title: string
  video_duration: string
  video_youtube_url: string
  impact_badge: string
  impact_number: string
  impact_description: string
  social_links: SocialLink[]
  updatedLabel: string | null
}

type SheetId = "perfil" | "video" | "impacto" | "redes"

interface Files {
  profile?: File
  thumbnail?: File
  thumbnailUrl?: string
}

export function MobileSitePage({ site }: { site: SiteValues }) {
  const router = useRouter()
  const [sheet, setSheet] = React.useState<SheetId | null>(null)
  const [saving, startSaving] = React.useTransition()

  /** Salva a página inteira: a action do site grava todos os campos juntos. */
  function save(next: SiteValues, files: Files = {}) {
    startSaving(async () => {
      const fd = new FormData()
      const keys = [
        "profile_name", "profile_subtitle", "profile_quote",
        "video_category", "video_title", "video_duration", "video_youtube_url",
        "impact_badge", "impact_number", "impact_description",
      ] as const
      for (const k of keys) fd.set(k, next[k].trim())
      fd.set("social_links", JSON.stringify(next.social_links.filter((l) => l.url)))
      if (files.profile) fd.set("profile_image", await compressImage(files.profile))
      if (files.thumbnail) fd.set("video_thumbnail", await compressImage(files.thumbnail))
      if (files.thumbnailUrl) fd.set("video_thumbnail_url", files.thumbnailUrl)
      const result = await updateSiteSettings(site.id, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Site atualizado")
      setSheet(null)
      router.refresh()
    })
  }

  const videoMissing = [
    !site.video_thumbnail_url && "capa",
    !site.video_youtube_url && "link",
    !site.video_title && "título",
  ].filter(Boolean) as string[]
  const profileDone = site.profile_image_url && site.profile_name && site.profile_subtitle && site.profile_quote
  const impactDone = site.impact_number && site.impact_description
  const sheetProps = (id: SheetId) => ({
    open: sheet === id,
    onOpenChange: (o: boolean) => setSheet(o ? id : null),
    site,
    saving,
    onSave: save,
  })

  return (
    <div className="flex flex-col gap-[22px] pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">Página inicial do site</span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Site</h1>
        </div>
        <a
          href="https://goleirovitor.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center gap-1.5 rounded-xl border bg-card px-3.5 text-sm font-semibold"
        >
          <ExternalLink className="size-4" />
          Ver site
        </a>
      </header>

      <section aria-label="Prévia" className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Como aparece no topo do site</h2>
        <button
          type="button"
          onClick={() => setSheet("perfil")}
          className="flex flex-col items-center gap-2.5 rounded-3xl bg-[#F4F1E6] px-[18px] py-6 text-center text-[#1C1B16]"
        >
          {site.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto do site no Storage
            <img src={site.profile_image_url} alt="" className="size-24 rounded-full object-cover shadow-lg" />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-full bg-[#E4E0D0] text-[#6B6A5E]">
              <User className="size-9" />
            </span>
          )}
          <span className="text-2xl font-extrabold tracking-tight">{site.profile_name || "Nome"}</span>
          <span className="text-[13px] font-semibold text-[#6B6A5E]">{site.profile_subtitle || "Subtítulo"}</span>
          {site.profile_quote && <span className="text-[15px] text-[#3A392F] italic">“{site.profile_quote}”</span>}
        </button>
      </section>

      <section aria-label="Seções" className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Seções da página inicial</h2>
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <SectionRow icon={User} title="Perfil" sub="Foto, nome, subtítulo e frase" ok={!!profileDone} status={profileDone ? "Completo" : "Incompleto"} onClick={() => setSheet("perfil")} />
          <SectionRow
            icon={Video}
            title="Vídeo em destaque"
            sub={site.video_title || "Sem título"}
            ok={videoMissing.length === 0}
            status={videoMissing.length === 0 ? "Completo" : `Falta ${videoMissing.join(" e ")}`}
            onClick={() => setSheet("video")}
          />
          <SectionRow
            icon={Heart}
            title="Impacto"
            sub={[site.impact_badge, [site.impact_number, site.impact_description].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Sem dados"}
            ok={!!impactDone}
            status={impactDone ? "Completo" : "Incompleto"}
            onClick={() => setSheet("impacto")}
          />
          <SectionRow
            icon={Globe}
            title="Redes sociais"
            sub={site.social_links.map((l) => l.label).join(" e ") || "Nenhuma"}
            ok={site.social_links.length > 0}
            status={`${site.social_links.length} ${site.social_links.length === 1 ? "rede" : "redes"}`}
            onClick={() => setSheet("redes")}
          />
        </div>
      </section>

      {videoMissing.length > 0 && (
        <button
          type="button"
          onClick={() => setSheet("video")}
          className="flex gap-3 rounded-[18px] border border-primary/30 bg-primary/10 p-3.5 text-left"
        >
          <TriangleAlert className="mt-px size-5 shrink-0 text-primary" strokeWidth={1.8} />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">O vídeo em destaque está sem {videoMissing.join(" e ")}</span>
            <span className="text-[13px] leading-snug text-foreground/80">
              No site, o bloco fica incompleto e o play não abre o vídeo. Toque para completar.
            </span>
          </span>
        </button>
      )}

      {site.updatedLabel && <span className="text-center text-xs text-muted-foreground">Última alteração em {site.updatedLabel}</span>}

      <ProfileSheet {...sheetProps("perfil")} />
      <VideoSheet {...sheetProps("video")} />
      <ImpactSheet {...sheetProps("impacto")} />
      <SocialSheet {...sheetProps("redes")} />
    </div>
  )
}

function SectionRow({
  icon: Icon,
  title,
  sub,
  ok,
  status,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  sub: string
  ok: boolean
  status: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 items-center gap-3.5 px-3.5 py-2.5 text-left active:bg-foreground/5">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-[13px] bg-primary/15 text-primary">
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="truncate text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <span className={cn("shrink-0 text-xs font-bold whitespace-nowrap", ok ? "text-emerald-600 dark:text-emerald-300" : "text-primary")}>{status}</span>
      <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" />
    </button>
  )
}

/* -------------------------------------------------------------------------- */

interface SheetBase {
  open: boolean
  onOpenChange: (o: boolean) => void
  site: SiteValues
  saving: boolean
  onSave: (next: SiteValues, files?: Files) => void
}

function Shell({
  open,
  onOpenChange,
  title,
  description,
  saving,
  onSave,
  canSave = true,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  saving: boolean
  onSave: () => void
  canSave?: boolean
  children: React.ReactNode
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] data-[vaul-drawer-direction=bottom]:max-h-[92svh]">
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">{title}</DrawerTitle>
          <DrawerDescription className="text-sm">{description}</DrawerDescription>
        </div>
        <div data-vaul-no-drag className="-mx-5 flex min-h-0 flex-col gap-[18px] overflow-y-auto overscroll-contain px-5">
          {children}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Salvar no site
        </button>
      </DrawerContent>
    </Drawer>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
  max,
  tone,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  max?: number
  tone?: "warn"
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1 px-4 py-3", tone === "warn" && "bg-primary/10")}>
      <span className={cn("flex justify-between text-xs font-semibold", tone === "warn" ? "text-primary" : "text-muted-foreground")}>
        {label}
        {max && <span className="font-medium">{value.length} de {max}</span>}
      </span>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/60"
        />
      ) : (
        <input
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
        />
      )}
    </label>
  )
}

/** Rascunho da sheet: parte do site salvo a cada abertura. */
function useDraft(open: boolean, site: SiteValues) {
  const [draft, setDraft] = React.useState(site)
  const [lastOpen, setLastOpen] = React.useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setDraft(site)
  }
  const set = <K extends keyof SiteValues>(k: K, v: SiteValues[K]) => setDraft((d) => ({ ...d, [k]: v }))
  return [draft, set, setDraft] as const
}

function usePickedImage(open: boolean) {
  const [picked, setPicked] = React.useState<{ file: File; url: string } | null>(null)
  const [lastOpen, setLastOpen] = React.useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setPicked(null)
  }
  return [picked, setPicked] as const
}

function ProfileSheet({ open, onOpenChange, site, saving, onSave }: SheetBase) {
  const [draft, set] = useDraft(open, site)
  const [photo, setPhoto] = usePickedImage(open)
  const input = React.useRef<HTMLInputElement>(null)
  const src = photo?.url ?? draft.profile_image_url

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Perfil" description="Topo da página inicial" saving={saving} onSave={() => onSave(draft, { profile: photo?.file })}>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) setPhoto({ file: f, url: URL.createObjectURL(f) })
        }}
      />
      <div className="flex items-center gap-4">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- prévia local ou Storage
          <img src={src} alt="" className="size-[76px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex size-[76px] shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-8 text-muted-foreground" />
          </span>
        )}
        <button type="button" onClick={() => input.current?.click()} className="h-10 rounded-xl border bg-muted/60 px-3.5 text-sm font-semibold">
          {src ? "Trocar foto" : "Adicionar foto"}
        </button>
      </div>
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        <Field label="Nome" value={draft.profile_name} onChange={(v) => set("profile_name", v)} placeholder="Vitor" />
        <Field label="Subtítulo" value={draft.profile_subtitle} onChange={(v) => set("profile_subtitle", v)} placeholder="Ex-Goleiro · Missionário" />
        <Field label="Frase" value={draft.profile_quote} onChange={(v) => set("profile_quote", v)} placeholder="Uma frase curta" rows={2} max={80} />
      </div>
    </Shell>
  )
}

function VideoSheet({ open, onOpenChange, site, saving, onSave }: SheetBase) {
  const [draft, set] = useDraft(open, site)
  const [thumb, setThumb] = usePickedImage(open)
  const input = React.useRef<HTMLInputElement>(null)
  const ytId = youtubeId(draft.video_youtube_url)
  const autoThumb = !thumb && !draft.video_thumbnail_url && ytId ? youtubeThumb(ytId) : null
  const preview = thumb?.url ?? draft.video_thumbnail_url ?? autoThumb
  const linkBad = !!draft.video_youtube_url && !ytId

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Vídeo em destaque"
      description="Aparece logo abaixo do perfil"
      saving={saving}
      canSave={!linkBad}
      onSave={() => onSave(draft, { thumbnail: thumb?.file, thumbnailUrl: autoThumb ?? undefined })}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ""
          if (f) setThumb({ file: f, url: URL.createObjectURL(f) })
        }}
      />
      {preview ? (
        <div className="relative overflow-hidden rounded-[18px] border">
          {/* eslint-disable-next-line @next/next/no-img-element -- prévia local, Storage ou YouTube */}
          <img src={preview} alt="" className="aspect-video w-full object-cover" />
          {autoThumb && (
            <span className="absolute top-2.5 left-2.5 rounded-lg bg-background/85 px-2 py-1 text-xs font-semibold backdrop-blur">
              Capa do YouTube
            </span>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute right-2.5 bottom-2.5 h-9 rounded-xl bg-background/85 px-3 text-[13px] font-semibold backdrop-blur"
          >
            Usar outra imagem
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex h-[150px] flex-col items-center justify-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed border-primary/50 bg-primary/5"
        >
          <ImagePlus className="size-6 text-primary" strokeWidth={1.8} />
          <span className="text-[15px] font-bold">Adicionar capa do vídeo</span>
          <span className="text-xs font-semibold text-primary">Ou cole o link: a capa vem do YouTube</span>
        </button>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          className={cn(
            "flex flex-col gap-1 rounded-2xl border-[1.5px] bg-muted/60 px-3.5 py-3",
            !draft.video_youtube_url ? "border-primary" : linkBad ? "border-destructive" : "border-transparent",
          )}
        >
          <span className={cn("text-xs font-semibold", !draft.video_youtube_url ? "text-primary" : "text-muted-foreground")}>
            Link do YouTube{!draft.video_youtube_url && " · falta"}
          </span>
          <input
            type="url"
            value={draft.video_youtube_url}
            onChange={(e) => set("video_youtube_url", e.target.value)}
            placeholder="https://youtu.be/…"
            className="bg-transparent text-[15px] outline-none"
          />
        </label>
        {draft.video_youtube_url && (
          <span className={cn("flex items-center gap-1.5 px-1 text-[13px] font-semibold", ytId ? "text-emerald-600 dark:text-emerald-300" : "text-destructive")}>
            {ytId ? <Check className="size-4" strokeWidth={2.4} /> : <X className="size-4" strokeWidth={2.4} />}
            {ytId ? "Vídeo do YouTube reconhecido" : "Link não reconhecido: use um link do YouTube"}
          </span>
        )}
      </div>

      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        <Field label="Título" value={draft.video_title} onChange={(v) => set("video_title", v)} placeholder="Título do vídeo" />
        <div className="grid grid-cols-[minmax(0,1fr)_110px] divide-x">
          <Field label="Categoria" value={draft.video_category} onChange={(v) => set("video_category", v)} placeholder="Testemunho" />
          <Field label="Duração" value={draft.video_duration} onChange={(v) => set("video_duration", v)} placeholder="12 min" />
        </div>
      </div>
    </Shell>
  )
}

function ImpactSheet({ open, onOpenChange, site, saving, onSave }: SheetBase) {
  const [draft, set] = useDraft(open, site)
  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Impacto" description="O número de destaque da página inicial" saving={saving} onSave={() => onSave(draft)}>
      <div className="flex flex-col items-center gap-1 rounded-[20px] bg-muted/60 py-5 text-center">
        {draft.impact_badge && (
          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">{draft.impact_badge}</span>
        )}
        <span className="text-4xl font-extrabold tracking-tight">{draft.impact_number || "—"}</span>
        <span className="text-sm text-muted-foreground">{draft.impact_description || "descrição"}</span>
      </div>
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
        <Field label="Local / selo" value={draft.impact_badge} onChange={(v) => set("impact_badge", v)} placeholder="Líbano" />
        <div className="grid grid-cols-[110px_minmax(0,1fr)] divide-x">
          <Field label="Número" value={draft.impact_number} onChange={(v) => set("impact_number", v)} placeholder="+500" />
          <Field label="Descrição" value={draft.impact_description} onChange={(v) => set("impact_description", v)} placeholder="crianças atendidas" />
        </div>
      </div>
    </Shell>
  )
}

function SocialSheet({ open, onOpenChange, site, saving, onSave }: SheetBase) {
  const [draft, , setDraft] = useDraft(open, site)
  const links = draft.social_links
  const setLinks = (next: SocialLink[]) => setDraft((d) => ({ ...d, social_links: next }))
  const ids = links.map((l, i) => `${i}::${l.platform}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  )
  const available = PLATFORM_OPTIONS.filter((p) => !links.some((l) => l.platform === p.value))

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    setLinks(arrayMove(links, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <Shell open={open} onOpenChange={onOpenChange} title="Redes sociais" description="Ícones do topo e do rodapé do site" saving={saving} onSave={() => onSave(draft)}>
      {links.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {links.map((l, i) => (
                <SocialRow
                  key={ids[i]}
                  id={ids[i]}
                  link={l}
                  onChange={(url) => setLinks(links.map((x, j) => (j === i ? { ...x, url } : x)))}
                  onRemove={() => setLinks(links.filter((_, j) => j !== i))}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {links.length > 1 && <span className="-mt-2 px-1 text-xs text-muted-foreground">Segure a alça e arraste para mudar a ordem.</span>}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Adicionar</span>
        <div className="grid grid-cols-3 gap-1.5">
          {available.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setLinks([...links, { platform: p.value, label: p.label, url: "" }])}
              className="h-10 truncate rounded-xl border bg-muted/60 px-2 text-[13px] font-semibold"
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function SocialRow({
  id,
  link,
  onChange,
  onRemove,
}: {
  id: string
  link: SocialLink
  onChange: (url: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const config = getPlatformConfig(link.platform)
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-2xl bg-muted/60 py-2 pr-1.5 pl-1", isDragging && "z-10 bg-muted shadow-xl ring-2 ring-primary")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Arrastar ${link.label}`}
        className="flex h-12 w-8 shrink-0 touch-none items-center justify-center text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <label className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-[13px] font-bold">{config.label}</span>
        <span className="flex min-w-0 items-baseline text-sm">
          {config.prefix && <span className="shrink-0 text-muted-foreground">{config.prefix.replace(/^https:\/\//, "")}</span>}
          <input
            value={extractHandle(link.platform, link.url)}
            onChange={(e) => onChange(buildFullUrl(link.platform, e.target.value.trim()))}
            placeholder={config.placeholder}
            className="min-w-0 grow bg-transparent font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
          />
        </span>
      </label>
      <button type="button" aria-label={`Remover ${link.label}`} onClick={onRemove} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-destructive">
        <X className="size-[18px]" />
      </button>
    </div>
  )
}
