"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronLeft, ImagePlus, Loader2, SlidersHorizontal, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { DEFAULT_CATEGORIES } from "@/lib/blog"
import { compressImage } from "@/lib/compress-image"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import {
  deletePost,
  publishPost,
  removeCoverImage,
  syncUsedImages,
  unpublishPost,
  updatePost,
  uploadCoverImage,
} from "@/app/(dashboard)/blog/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

export interface MobilePostEditorProps {
  post: {
    id: string
    title: string
    slug: string
    excerpt: string | null
    content: string | null
    cover_url: string | null
    categories: string[] | null
    status: string
    published_at: string | null
    created_at: string | null
  }
  existingImages: { url: string; name: string }[]
}

type SaveState = "saved" | "dirty" | "saving" | "error"

/** Textarea que cresce com o texto, para título e resumo. */
function AutoGrow(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = React.useRef<HTMLTextAreaElement>(null)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return <textarea ref={ref} rows={1} {...props} />
}

export function MobilePostEditor({ post, existingImages }: MobilePostEditorProps) {
  const router = useRouter()
  const published = post.status === "published"
  const [title, setTitle] = React.useState(post.title === "Novo Post" ? "" : post.title)
  const [excerpt, setExcerpt] = React.useState(post.excerpt ?? "")
  const [content, setContent] = React.useState(post.content ?? "")
  const [categories, setCategories] = React.useState<string[]>(post.categories ?? [])
  const [coverUrl, setCoverUrl] = React.useState(post.cover_url)
  const [coverBusy, setCoverBusy] = React.useState(false)
  const [save, setSave] = React.useState<SaveState>("saved")
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [publishing, startPublishing] = React.useTransition()
  const coverInput = React.useRef<HTMLInputElement>(null)
  // Cada edição sobe a versão; o salvamento automático reage a ela.
  const [version, setVersion] = React.useState(0)
  const edited =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value)
      setSave("dirty")
      setVersion((n) => n + 1)
    }

  const persist = React.useCallback(async () => {
    setSave("saving")
    const fd = new FormData()
    fd.set("title", title.trim() || "Novo Post")
    fd.set("excerpt", excerpt)
    fd.set("content", content)
    fd.set("categories", categories.join(","))
    const result = await updatePost(post.id, fd)
    if (result?.error) {
      setSave("error")
      toast.error(result.error)
      return false
    }
    await syncUsedImages(post.id, content)
    setSave("saved")
    return true
  }, [title, excerpt, content, categories, post.id])

  // Rascunho salva sozinho 1,2 s depois da última mudança. Post publicado só
  // salva no botão: o texto no ar não muda enquanto a pessoa digita.
  const persistRef = React.useRef(persist)
  React.useEffect(() => {
    persistRef.current = persist
  }, [persist])
  React.useEffect(() => {
    if (version === 0 || published) return
    const t = setTimeout(() => persistRef.current(), 1200)
    return () => clearTimeout(t)
  }, [version, published])

  async function pickCover(file: File) {
    setCoverBusy(true)
    const fd = new FormData()
    fd.set("cover", await compressImage(file))
    const result = await uploadCoverImage(post.id, fd)
    setCoverBusy(false)
    if (result.error) return toast.error(result.error)
    setCoverUrl(result.url ?? null)
    toast.success("Capa atualizada")
  }

  function togglePublish() {
    startPublishing(async () => {
      const ok = await persist()
      if (!ok) return
      const result = published ? await unpublishPost(post.id) : await publishPost(post.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(published ? "Post voltou para rascunho" : "Post publicado!")
      setDetailsOpen(false)
      router.refresh()
    })
  }

  const statusLine =
    save === "saving"
      ? { text: "Salvando…", tone: "text-muted-foreground" }
      : save === "error"
        ? { text: "Não salvou — toque em Salvar", tone: "text-destructive" }
        : save === "dirty"
          ? { text: published ? "Alterações não salvas" : "Editando…", tone: published ? "text-primary" : "text-muted-foreground" }
          : { text: "Salvo", tone: "text-emerald-600 dark:text-emerald-300" }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-2 border-b bg-background/95 pt-[env(safe-area-inset-top)] pr-2 pl-3 backdrop-blur-md">
        <Link href="/blog" aria-label="Voltar para posts" className="flex size-11 items-center justify-center">
          <ChevronLeft className="size-[22px]" />
        </Link>
        <span className="flex min-w-0 grow flex-col py-2">
          <span className="text-[15px] font-bold">{published ? "Publicado" : "Rascunho"}</span>
          <span className={cn("truncate text-xs", statusLine.tone)}>{statusLine.text}</span>
        </span>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          aria-label="Detalhes do post"
          className="flex size-11 items-center justify-center"
        >
          <SlidersHorizontal className="size-5" strokeWidth={1.8} />
        </button>
        {published ? (
          <button
            type="button"
            onClick={() => persist().then((ok) => ok && toast.success("Post atualizado"))}
            disabled={save === "saved" || save === "saving"}
            className="flex h-10 items-center rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground disabled:opacity-50"
          >
            Salvar
          </button>
        ) : (
          <button
            type="button"
            onClick={togglePublish}
            disabled={publishing || !title.trim()}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground disabled:opacity-50"
          >
            {publishing && <Loader2 className="size-4 animate-spin" />}
            Publicar
          </button>
        )}
      </header>

      <div className="flex flex-col gap-[18px] pt-5">
        <input
          ref={coverInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) pickCover(file)
          }}
        />
        {coverUrl ? (
          <div className="relative overflow-hidden rounded-[20px] border">
            {/* eslint-disable-next-line @next/next/no-img-element -- capa no Supabase Storage */}
            <img src={coverUrl} alt="" className="aspect-video w-full object-cover" />
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button
                type="button"
                disabled={coverBusy}
                onClick={() => coverInput.current?.click()}
                className="flex h-10 items-center gap-1.5 rounded-xl bg-background/85 px-3.5 text-sm font-semibold backdrop-blur"
              >
                {coverBusy && <Loader2 className="size-4 animate-spin" />}
                Trocar
              </button>
              <button
                type="button"
                aria-label="Remover capa"
                disabled={coverBusy}
                onClick={async () => {
                  setCoverBusy(true)
                  await removeCoverImage(post.id)
                  setCoverBusy(false)
                  setCoverUrl(null)
                }}
                className="flex size-10 items-center justify-center rounded-xl bg-background/85 text-destructive backdrop-blur"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={coverBusy}
            onClick={() => coverInput.current?.click()}
            className="flex h-40 flex-col items-center justify-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-primary/50 bg-primary/5"
          >
            <span className="flex size-12 items-center justify-center rounded-[15px] bg-primary/15 text-primary">
              {coverBusy ? <Loader2 className="size-[22px] animate-spin" /> : <ImagePlus className="size-[22px]" strokeWidth={1.8} />}
            </span>
            <span className="text-[15px] font-bold">Adicionar capa</span>
            <span className="text-[13px] text-muted-foreground">Aparece na listagem e no topo do post</span>
          </button>
        )}

        <label className="flex flex-col">
          <span className="sr-only">Título</span>
          <AutoGrow
            value={title}
            onChange={(e) => edited(setTitle)(e.target.value)}
            placeholder="Título do post"
            className="resize-none overflow-hidden bg-transparent text-[28px] leading-tight font-extrabold tracking-tight outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <label className="flex flex-col">
          <span className="sr-only">Resumo</span>
          <AutoGrow
            value={excerpt}
            onChange={(e) => edited(setExcerpt)(e.target.value)}
            placeholder="Resumo que aparece na listagem"
            className="resize-none overflow-hidden bg-transparent text-base leading-normal text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <div className="h-px bg-border" />

        <TipTapEditor
          variant="mobile"
          postId={post.id}
          content={post.content ?? ""}
          onChange={edited(setContent)}
          existingImages={existingImages}
        />
      </div>

      <DetailsSheet
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        postId={post.id}
        slug={post.slug}
        published={published}
        createdAt={post.created_at}
        categories={categories}
        onCategories={edited(setCategories)}
        onTogglePublish={togglePublish}
        publishing={publishing}
        canPublish={!!title.trim()}
      />
    </div>
  )
}

function DetailsSheet({
  open,
  onOpenChange,
  postId,
  slug,
  published,
  createdAt,
  categories,
  onCategories,
  onTogglePublish,
  publishing,
  canPublish,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  postId: string
  slug: string
  published: boolean
  createdAt: string | null
  categories: string[]
  onCategories: (c: string[]) => void
  onTogglePublish: () => void
  publishing: boolean
  canPublish: boolean
}) {
  const router = useRouter()
  const [newCat, setNewCat] = React.useState("")
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, startDeleting] = React.useTransition()
  const all = [...DEFAULT_CATEGORIES, ...categories.filter((c) => !DEFAULT_CATEGORIES.includes(c))]

  function toggle(cat: string) {
    onCategories(categories.includes(cat) ? categories.filter((c) => c !== cat) : [...categories, cat])
  }

  function addCategory() {
    const t = newCat.trim()
    if (!t) return
    if (!all.some((c) => c.toLowerCase() === t.toLowerCase())) onCategories([...categories, t])
    setNewCat("")
  }

  function remove() {
    startDeleting(async () => {
      const result = await deletePost(postId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Post excluído")
      onOpenChange(false)
      router.push("/blog")
    })
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setConfirmDelete(false)
      }}
      shouldScaleBackground={false}
    >
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">Detalhes do post</DrawerTitle>
          <DrawerDescription className="text-sm">
            {published ? "Publicado" : "Rascunho"}
            {createdAt && ` · criado em ${new Date(createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`}
          </DrawerDescription>
        </div>

        {confirmDelete ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 p-4">
            <span className="text-sm leading-snug">
              Excluir o post e todas as imagens dele? <strong>Não dá para desfazer.</strong>
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl border bg-card text-sm font-semibold">
                Voltar
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-bold text-white disabled:opacity-60"
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Excluir post
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Categorias</span>
              <div className="flex flex-wrap gap-2">
                {all.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={categories.includes(c)}
                    onClick={() => toggle(c)}
                    className={cn(
                      "h-9 rounded-full px-3.5 text-sm",
                      categories.includes(c) ? "bg-foreground font-bold text-background" : "border bg-muted/60 font-medium",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="Nova categoria"
                  className="h-10 min-w-0 grow rounded-xl border bg-muted/60 px-3 text-sm outline-none"
                />
                <button type="button" onClick={addCategory} className="h-10 rounded-xl border px-3.5 text-sm font-semibold text-primary">
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-2xl bg-muted/60 px-3.5 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Endereço no site</span>
              <span className="truncate font-mono text-sm">{slug}</span>
              <span className="text-xs text-muted-foreground">Gerado a partir do título ao salvar.</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePublish}
                disabled={publishing || (!published && !canPublish)}
                className={cn(
                  "flex h-[54px] items-center justify-center gap-2 rounded-2xl text-base font-bold disabled:opacity-50",
                  published ? "border bg-muted/60" : "bg-primary text-primary-foreground",
                )}
              >
                {publishing && <Loader2 className="size-4 animate-spin" />}
                {published ? "Voltar para rascunho" : "Publicar agora"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-[50px] items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-destructive"
              >
                <Trash2 className="size-[18px]" />
                Excluir post
              </button>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
