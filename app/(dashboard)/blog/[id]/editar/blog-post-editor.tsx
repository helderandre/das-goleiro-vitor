"use client"

import { useCallback, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { TipTapEditor } from "@/components/editor/tiptap-editor"
import { compressImage } from "@/lib/compress-image"
import { BlogImageManager } from "@/components/blog-image-manager"
import {
  updatePost,
  publishPost,
  unpublishPost,
  uploadCoverImage,
  removeCoverImage,
  syncUsedImages,
} from "@/app/(dashboard)/blog/actions"
import { DeletePostButton } from "@/app/(dashboard)/blog/delete-button"
import {
  ArrowLeft,
  Loader2,
  Save,
  Globe,
  EyeOff,
  Upload,
  X,
  ImageIcon,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

const DEFAULT_CATEGORIES = ["Esporte", "Fé", "Social", "Viagens"]

interface BlogImage {
  id: string
  image_url: string
  file_name: string | null
  file_size: number | null
  is_used: boolean | null
  created_at: string | null
}

interface BlogPostEditorProps {
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
  images: BlogImage[]
}

export function BlogPostEditor({ post, images }: BlogPostEditorProps) {
  const [content, setContent] = useState(post.content ?? "")
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    post.categories ?? [],
  )
  const [newCategory, setNewCategory] = useState("")
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const existing = post.categories ?? []
    return existing.filter((c) => !DEFAULT_CATEGORIES.includes(c))
  })
  const [coverUrl, setCoverUrl] = useState(post.cover_url)
  const [isSaving, startSaving] = useTransition()
  const [isPublishing, startPublishing] = useTransition()
  const [isUploadingCover, startUploadingCover] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories]

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }, [])

  const addCategory = useCallback(() => {
    const trimmed = newCategory.trim()
    if (!trimmed) return
    const allCats = [...DEFAULT_CATEGORIES, ...customCategories]
    if (allCats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setNewCategory("")
      return
    }
    setCustomCategories((prev) => [...prev, trimmed])
    setSelectedCategories((prev) => [...prev, trimmed])
    setNewCategory("")
  }, [newCategory, customCategories])

  function handleSave() {
    const formData = new FormData(formRef.current!)
    formData.set("content", content)
    formData.set("categories", selectedCategories.join(","))

    startSaving(async () => {
      // Sync used images
      await syncUsedImages(post.id, content)

      const result = await updatePost(post.id, formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Post salvo")
        router.refresh()
      }
    })
  }

  function handlePublish() {
    startPublishing(async () => {
      // Save first
      const formData = new FormData(formRef.current!)
      formData.set("content", content)
      formData.set("categories", selectedCategories.join(","))
      await updatePost(post.id, formData)
      await syncUsedImages(post.id, content)

      if (post.status === "published") {
        const result = await unpublishPost(post.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("Post despublicado")
          router.refresh()
        }
      } else {
        const result = await publishPost(post.id)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success("Post publicado!")
          router.refresh()
        }
      }
    })
  }

  function handleCoverUpload() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const compressed = await compressImage(file)
      const formData = new FormData()
      formData.set("cover", compressed)

      startUploadingCover(async () => {
        const result = await uploadCoverImage(post.id, formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          setCoverUrl(result.url ?? null)
          toast.success("Capa atualizada")
        }
      })
    }

    input.click()
  }

  function handleRemoveCover() {
    startUploadingCover(async () => {
      await removeCoverImage(post.id)
      setCoverUrl(null)
      toast.success("Capa removida")
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/blog">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Editar Post</h1>
            {post.status === "published" ? (
              <Badge variant="default">Publicado</Badge>
            ) : (
              <Badge variant="secondary">Rascunho</Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BlogImageManager images={images} onImageDeleted={() => router.refresh()} />
          <DeletePostButton
            postId={post.id}
            postTitle={post.title}
            redirectTo="/blog"
          />
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : post.status === "published" ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
            )}
            {post.status === "published" ? "Despublicar" : "Publicar"}
          </Button>
        </div>
      </div>

      <form ref={formRef} onSubmit={(e) => e.preventDefault()}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={post.title}
                    placeholder="Título do post"
                    required
                    className="text-lg font-semibold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="excerpt">Resumo</Label>
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    defaultValue={post.excerpt ?? ""}
                    placeholder="Breve descrição do post (aparece na listagem)"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Editor</CardTitle>
              </CardHeader>
              <CardContent>
                <TipTapEditor
                  content={post.content ?? ""}
                  postId={post.id}
                  onChange={setContent}
                  existingImages={images.map((img) => ({
                    url: img.image_url,
                    name: img.file_name ?? "imagem",
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cover Image */}
            <Card>
              <CardHeader>
                <CardTitle>Imagem de Capa</CardTitle>
              </CardHeader>
              <CardContent>
                {coverUrl ? (
                  <div className="relative">
                    <img
                      src={coverUrl}
                      alt="Capa"
                      className="aspect-video w-full rounded-lg object-cover"
                    />
                    <div className="absolute right-2 top-2 flex gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleCoverUpload}
                        disabled={isUploadingCover}
                      >
                        {isUploadingCover ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleRemoveCover}
                        disabled={isUploadingCover}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCoverUpload}
                    disabled={isUploadingCover}
                    className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {isUploadingCover ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm">Adicionar capa</span>
                      </>
                    )}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Categorias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        selectedCategories.includes(cat)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova categoria..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCategory()
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                    disabled={!newCategory.trim()}
                    className="h-8 shrink-0"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Meta Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-mono text-xs">{post.slug}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>
                    {post.created_at
                      ? new Date(post.created_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </span>
                </div>
                {post.published_at && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Publicado em</span>
                      <span>
                        {new Date(post.published_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Imagens</span>
                  <span>{images.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
