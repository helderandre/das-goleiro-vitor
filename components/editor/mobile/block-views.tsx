"use client"

import * as React from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Check,
  GripVertical,
  Images,
  Loader2,
  MousePointerClick,
  Play,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import type { ProductCardAttrs } from "../extensions/product-card"

/* -------------------------------------------------------------------------- */
/* Base                                                                       */
/* -------------------------------------------------------------------------- */

/** Fecha a sheet e só então remove o bloco (a animação de saída termina antes). */
function useDeferredDelete(deleteNode: () => void, setOpen: (o: boolean) => void) {
  return React.useCallback(() => {
    setOpen(false)
    setTimeout(deleteNode, 350)
  }, [deleteNode, setOpen])
}

function BlockSheet({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  onRemove,
  onDone,
  doneLabel = "Concluir",
  doneDisabled,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description: string
  onRemove: () => void
  onDone: () => void
  doneLabel?: string
  doneDisabled?: boolean
  children: React.ReactNode
}) {
  // Dentro de um node view do TipTap a gaveta fechada não termina de sair
  // sozinha e a trava de rolagem da página fica presa. Desmontar depois da
  // animação de saída limpa a trava.
  const [mounted, setMounted] = React.useState(open)
  if (open && !mounted) setMounted(true)
  React.useEffect(() => {
    if (open) return
    const t = setTimeout(() => setMounted(false), 400)
    return () => clearTimeout(t)
  }, [open])
  if (!mounted) return null

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} repositionInputs={false}>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] data-[vaul-drawer-direction=bottom]:max-h-[92svh]">
        <div className="flex items-center gap-3 pt-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
            <Icon className="size-[21px]" strokeWidth={1.8} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <DrawerTitle className="text-xl font-extrabold">{title}</DrawerTitle>
            <DrawerDescription className="text-[13px]">{description}</DrawerDescription>
          </div>
        </div>
        <div data-vaul-no-drag className="-mx-5 flex min-h-0 flex-col gap-[18px] overflow-y-auto overscroll-contain px-5">{children}</div>
        <div className="flex gap-2.5">
          <button
            type="button"
            aria-label="Remover bloco"
            onClick={onRemove}
            className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-muted/60 text-destructive"
          >
            <Trash2 className="size-5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={doneDisabled}
            className="flex h-[54px] grow items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            {doneLabel}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{children}</span>
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="radiogroup" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-[42px] rounded-[13px] border-[1.5px] text-sm",
            value === o.value ? "border-primary bg-primary/10 font-bold" : "bg-muted/60 font-medium text-foreground/80",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Toque no bloco dentro do texto: cartão compacto que abre a sheet. */
function BlockPreview({
  selected,
  badge,
  onOpen,
  children,
}: {
  selected: boolean
  badge: React.ReactNode
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      contentEditable={false}
      onClick={onOpen}
      className={cn(
        "relative block w-full rounded-2xl border-[1.5px] p-1.5 text-left",
        selected ? "border-primary" : "border-transparent",
      )}
    >
      <span className="absolute -top-3 right-2.5 z-10 flex h-6 items-center gap-1 rounded-lg bg-primary px-2 text-[11px] font-extrabold text-primary-foreground">
        {badge}
      </span>
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/* Botão                                                                      */
/* -------------------------------------------------------------------------- */

interface RefItem {
  slug: string
  title: string
  sub?: string
  cover?: string | null
}

const VARIANT_CLASS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-muted text-foreground",
  outline: "border-[1.5px] border-primary text-primary",
}

export function MobileButtonBlockView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const { label, url, variant, linkType, refSlug } = node.attrs
  // Recém-inserido (texto padrão, sem destino): já abre a edição.
  const [open, setOpen] = React.useState(label === "Clique aqui" && url === "#" && !refSlug)
  const [products, setProducts] = React.useState<RefItem[] | null>(null)
  const [posts, setPosts] = React.useState<RefItem[] | null>(null)
  const removeBlock = useDeferredDelete(deleteNode, setOpen)

  React.useEffect(() => {
    if (!open || products) return
    const supabase = createClient()
    Promise.all([
      supabase.from("products").select("id, slug, title, price, discount_percent").order("is_main", { ascending: false }),
      supabase.from("product_images").select("product_id, image_url, is_cover"),
      supabase.from("blog_posts").select("slug, title, published_at").eq("status", "published").order("published_at", { ascending: false }),
    ]).then(([prods, imgs, blog]) => {
      const cover = new Map<string, string>()
      for (const img of imgs.data ?? []) {
        if (img.product_id && (img.is_cover || !cover.has(img.product_id))) cover.set(img.product_id, img.image_url)
      }
      setProducts(
        (prods.data ?? []).map((p) => {
          const final = Number(p.price) * (1 - Number(p.discount_percent ?? 0) / 100)
          return {
            slug: p.slug,
            title: p.title,
            cover: cover.get(p.id) ?? null,
            sub: final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          }
        }),
      )
      setPosts((blog.data ?? []).map((b) => ({ slug: b.slug, title: b.title })))
    })
  }, [open, products])

  const destination =
    linkType === "product"
      ? refSlug
        ? `Livro: ${products?.find((p) => p.slug === refSlug)?.title ?? refSlug}`
        : "Escolha o livro"
      : linkType === "blog"
        ? refSlug
          ? `Post: ${posts?.find((p) => p.slug === refSlug)?.title ?? refSlug}`
          : "Escolha o post"
        : url && url !== "#"
          ? url
          : "Informe o endereço"

  const list = linkType === "product" ? products : linkType === "blog" ? posts : null

  return (
    <NodeViewWrapper className="my-4" data-type="button-block">
      <BlockPreview
        selected={selected}
        onOpen={() => setOpen(true)}
        badge={
          <>
            <MousePointerClick className="size-3" strokeWidth={2.4} />
            Botão
          </>
        }
      >
        <span className="flex flex-col items-center gap-1.5 py-2">
          <span className={cn("flex h-12 items-center rounded-[14px] px-5 text-[15px] font-bold", VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary)}>
            {label || "Botão"}
          </span>
          <span className="max-w-full truncate text-xs text-muted-foreground">{destination}</span>
        </span>
      </BlockPreview>

      <BlockSheet
        open={open}
        onOpenChange={setOpen}
        icon={MousePointerClick}
        title="Botão"
        description="Leva o leitor para um livro, um post ou um link"
        onRemove={removeBlock}
        onDone={() => setOpen(false)}
      >
        <div className="flex flex-col items-center gap-1.5 rounded-[18px] border border-dashed bg-background p-4">
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Prévia</span>
          <span className={cn("flex h-[46px] items-center rounded-[13px] px-5 text-[15px] font-bold", VARIANT_CLASS[variant] ?? VARIANT_CLASS.primary)}>
            {label || "Botão"}
          </span>
        </div>

        <label className="flex flex-col gap-1 rounded-2xl bg-muted/60 px-3.5 py-3">
          <span className="text-xs font-semibold text-muted-foreground">Texto do botão</span>
          <input
            value={label}
            onChange={(e) => updateAttributes({ label: e.target.value })}
            placeholder="Clique aqui"
            className="bg-transparent text-base font-semibold outline-none"
          />
        </label>

        <div className="flex flex-col gap-2">
          <Label>Estilo</Label>
          <Segmented
            value={variant}
            onChange={(v) => updateAttributes({ variant: v })}
            options={[
              { value: "primary", label: "Primário" },
              { value: "secondary", label: "Secundário" },
              { value: "outline", label: "Contorno" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Leva para</Label>
          <Segmented
            value={linkType}
            onChange={(v) => updateAttributes({ linkType: v, url: "#", refSlug: "" })}
            options={[
              { value: "product", label: "Livro" },
              { value: "blog", label: "Post" },
              { value: "external", label: "Link" },
            ]}
          />
          {linkType === "external" ? (
            <label className="flex flex-col gap-1 rounded-2xl bg-muted/60 px-3.5 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Endereço</span>
              <input
                type="url"
                value={url === "#" ? "" : url}
                onChange={(e) => updateAttributes({ url: e.target.value || "#" })}
                placeholder="https://…"
                className="bg-transparent text-[15px] outline-none"
              />
            </label>
          ) : !list ? (
            <span className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando…
            </span>
          ) : list.length === 0 ? (
            <span className="py-2 text-sm text-muted-foreground">
              {linkType === "product" ? "Nenhum livro cadastrado." : "Nenhum post publicado."}
            </span>
          ) : (
            <div className="flex flex-col divide-y overflow-hidden rounded-2xl bg-muted/60">
              {list.map((item) => {
                const on = refSlug === item.slug
                return (
                  <button
                    key={item.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => updateAttributes({ refSlug: item.slug })}
                    className="flex items-center gap-3 px-3 py-2.5 text-left"
                  >
                    {item.cover !== undefined &&
                      (item.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element -- capa no Supabase Storage
                        <img src={item.cover} alt="" className="h-12 w-[34px] shrink-0 rounded-[5px] object-cover" />
                      ) : (
                        <span className="h-12 w-[34px] shrink-0 rounded-[5px] bg-muted" />
                      ))}
                    <span className="flex min-w-0 grow flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold">{item.title}</span>
                      {item.sub && <span className="text-xs text-muted-foreground">{item.sub}</span>}
                    </span>
                    <span className={cn("size-5 shrink-0 rounded-full border-2", on ? "border-[6px] border-primary" : "border-muted-foreground/40")} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </BlockSheet>
    </NodeViewWrapper>
  )
}

/* -------------------------------------------------------------------------- */
/* Vídeo                                                                      */
/* -------------------------------------------------------------------------- */

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export function MobileVideoBlockView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const src: string = node.attrs.src ?? ""
  const [open, setOpen] = React.useState(!src)
  const [input, setInput] = React.useState(src)
  const removeBlock = useDeferredDelete(deleteNode, setOpen)
  const embed = embedUrl(input)
  const provider = embed?.includes("vimeo") ? "Vimeo" : "YouTube"

  function done() {
    if (!embed) {
      if (!src) removeBlock()
      else setOpen(false)
      return
    }
    updateAttributes({ src: embed })
    setOpen(false)
  }

  return (
    <NodeViewWrapper className="my-4" data-type="video-block">
      <BlockPreview
        selected={selected}
        onOpen={() => {
          setInput(src)
          setOpen(true)
        }}
        badge={
          <>
            <Video className="size-3" strokeWidth={2.4} />
            Vídeo
          </>
        }
      >
        <span className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl bg-muted text-[13px] font-semibold text-muted-foreground">
          <span className="flex size-[52px] items-center justify-center rounded-full bg-background/80 text-foreground">
            <Play className="size-6" />
          </span>
          {src ? (src.includes("vimeo") ? "Vídeo do Vimeo" : "Vídeo do YouTube") : "Toque para colar o link"}
        </span>
      </BlockPreview>

      <BlockSheet
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : done())}
        icon={Video}
        title="Vídeo"
        description="YouTube ou Vimeo, pelo link"
        onRemove={removeBlock}
        onDone={done}
        doneLabel={embed ? "Salvar vídeo" : "Concluir"}
      >
        <label className={cn("flex flex-col gap-1 rounded-2xl bg-muted/60 px-3.5 py-3 border-[1.5px]", embed ? "border-primary" : "border-transparent")}>
          <span className="text-xs font-semibold text-muted-foreground">Link do vídeo</span>
          <input
            type="url"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://youtu.be/…"
            className="bg-transparent font-mono text-sm outline-none"
          />
        </label>
        {input && (
          <span className={cn("flex items-center gap-2 text-[13px] font-semibold", embed ? "text-emerald-600 dark:text-emerald-300" : "text-destructive")}>
            {embed ? <Check className="size-4" strokeWidth={2.4} /> : <X className="size-4" strokeWidth={2.4} />}
            {embed ? `Vídeo do ${provider} reconhecido` : "Link não reconhecido: use YouTube ou Vimeo"}
          </span>
        )}
        {embed && (
          <iframe
            src={embed}
            className="aspect-video w-full rounded-2xl"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
        <span className="text-[13px] leading-snug text-muted-foreground">
          Cole o link de compartilhar do app do YouTube ou do Vimeo. Outros sites não tocam dentro do post.
        </span>
      </BlockSheet>
    </NodeViewWrapper>
  )
}

/* -------------------------------------------------------------------------- */
/* Galeria                                                                    */
/* -------------------------------------------------------------------------- */

export function MobileGalleryBlockView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const images: string[] = node.attrs.images ?? []
  const [open, setOpen] = React.useState(images.length === 0)
  const [picking, setPicking] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)
  const removeBlock = useDeferredDelete(deleteNode, setOpen)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = (editor.storage as any).imageGallery as {
    uploadImage: ((file: File) => Promise<string | null>) | null
    existingImages: { url: string; name: string }[]
  }
  const available = (storage?.existingImages ?? []).filter((img) => !images.includes(img.url))

  async function upload(files: File[]) {
    if (!storage?.uploadImage || files.length === 0) return
    setUploading(true)
    const urls: string[] = []
    for (const f of files) {
      const u = await storage.uploadImage(f)
      if (u) urls.push(u)
    }
    setUploading(false)
    if (urls.length) updateAttributes({ images: [...images, ...urls] })
  }

  return (
    <NodeViewWrapper className="my-4" data-type="image-gallery">
      <BlockPreview
        selected={selected}
        onOpen={() => setOpen(true)}
        badge={
          <>
            <Images className="size-3" strokeWidth={2.4} />
            Galeria · {images.length} {images.length === 1 ? "foto" : "fotos"}
          </>
        }
      >
        {images.length ? (
          <span className="grid grid-cols-3 gap-1.5">
            {images.slice(0, 6).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- imagem do post no Storage
              <img key={`${src}-${i}`} src={src} alt="" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </span>
        ) : (
          <span className="flex h-24 items-center justify-center rounded-xl bg-muted text-[13px] font-semibold text-muted-foreground">
            Toque para adicionar fotos
          </span>
        )}
      </BlockPreview>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ""
          upload(files)
        }}
      />

      <BlockSheet
        open={open}
        onOpenChange={(o) => (!o && images.length === 0 ? removeBlock() : setOpen(o))}
        icon={Images}
        title="Galeria"
        description={images.length ? `${images.length} ${images.length === 1 ? "foto" : "fotos"} · segure a alça e arraste para reordenar` : "Adicione as fotos da galeria"}
        onRemove={removeBlock}
        onDone={() => (images.length === 0 ? removeBlock() : setOpen(false))}
      >
        {images.length > 0 && (
          <SortablePhotos
            images={images}
            onReorder={(next) => updateAttributes({ images: next })}
            onRemove={(i) => updateAttributes({ images: images.filter((_, j) => j !== i) })}
          />
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
            className="flex h-[50px] items-center justify-center gap-2 rounded-2xl border bg-muted/60 text-[15px] font-semibold disabled:opacity-60"
          >
            {uploading ? <Loader2 className="size-[18px] animate-spin" /> : <Upload className="size-[18px]" />}
            {uploading ? "Enviando…" : "Câmera ou galeria"}
          </button>
          <button
            type="button"
            disabled={available.length === 0}
            onClick={() => setPicking((p) => !p)}
            className={cn(
              "flex h-[50px] items-center justify-center gap-2 rounded-2xl border text-[15px] font-semibold disabled:opacity-40",
              picking ? "border-primary bg-primary/10" : "bg-muted/60",
            )}
          >
            <Images className="size-[18px]" />
            Fotos do post
          </button>
        </div>

        {picking && available.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {available.map((img) => (
              <button
                key={img.url}
                type="button"
                onClick={() => updateAttributes({ images: [...images, img.url] })}
                aria-label={`Adicionar ${img.name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem do post no Storage */}
                <img src={img.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              </button>
            ))}
          </div>
        )}
        <span className="text-[13px] leading-snug text-muted-foreground">
          “Fotos do post” reaproveita imagens já enviadas neste post, sem subir de novo.
        </span>
      </BlockSheet>
    </NodeViewWrapper>
  )
}

/**
 * Lista das fotos com arrastar e soltar pela alça. A alça tem touch-action
 * none e a lista fica fora do gesto da sheet (data-vaul-no-drag), para
 * arrastar a foto não fechar a gaveta nem rolar a página.
 */
function SortablePhotos({
  images,
  onReorder,
  onRemove,
}: {
  images: string[]
  onReorder: (next: string[]) => void
  onRemove: (index: number) => void
}) {
  // A mesma foto pode entrar duas vezes na galeria: o id leva a posição.
  const ids = images.map((src, i) => `${i}::${src}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(images, from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div data-vaul-no-drag className="flex flex-col gap-1.5">
          {images.map((src, i) => (
            <SortablePhoto key={ids[i]} id={ids[i]} src={src} index={i} onRemove={() => onRemove(i)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortablePhoto({ id, src, index, onRemove }: { id: string; src: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2.5 rounded-2xl bg-muted/60 py-2 pr-2 pl-1",
        isDragging && "z-10 scale-[1.02] bg-muted shadow-xl ring-2 ring-primary",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Arrastar foto ${index + 1}`}
        className="flex h-[54px] w-9 shrink-0 touch-none items-center justify-center rounded-xl text-muted-foreground active:text-primary"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem do post no Storage */}
      <img src={src} alt="" className="size-[54px] shrink-0 rounded-[10px] object-cover" draggable={false} />
      <span className="grow text-sm font-semibold">Foto {index + 1}</span>
      <button
        type="button"
        aria-label={`Remover foto ${index + 1}`}
        onClick={onRemove}
        className="flex size-10 items-center justify-center rounded-xl text-destructive"
      >
        <X className="size-[18px]" />
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Cartão de livro (desktop e mobile)                                         */
/* -------------------------------------------------------------------------- */

export function ProductCardView({ node, deleteNode, selected }: NodeViewProps) {
  const a = node.attrs as ProductCardAttrs
  return (
    <NodeViewWrapper className="my-4" data-type="product-card">
      <div
        contentEditable={false}
        className={cn("relative flex gap-3.5 rounded-2xl border-[1.5px] bg-card p-3", selected ? "border-primary" : "border-border")}
      >
        {a.cover && (
          // eslint-disable-next-line @next/next/no-img-element -- capa no Supabase Storage
          <img src={a.cover} alt="" className="h-[98px] w-[70px] shrink-0 rounded-lg object-cover shadow-md" />
        )}
        <span className="flex min-w-0 grow flex-col gap-1.5">
          <span className="text-[11px] font-bold tracking-wider text-primary uppercase">Livro</span>
          <span className="text-[15px] leading-snug font-bold">{a.title}</span>
          <span className="mt-auto flex items-baseline gap-2">
            <span className="font-extrabold">{a.price}</span>
            {a.oldPrice && <span className="text-xs text-muted-foreground line-through">{a.oldPrice}</span>}
            <span className="grow" />
            <span className="flex h-[34px] items-center rounded-[10px] bg-primary px-3.5 text-[13px] font-bold text-primary-foreground">
              Comprar
            </span>
          </span>
        </span>
        <button
          type="button"
          aria-label="Remover cartão"
          onClick={deleteNode}
          className="absolute -top-2.5 -right-2.5 flex size-8 items-center justify-center rounded-full border bg-background text-destructive shadow"
        >
          <X className="size-4" />
        </button>
      </div>
    </NodeViewWrapper>
  )
}
