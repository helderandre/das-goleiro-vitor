"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Images, Trash2, Loader2, Copy } from "lucide-react"
import { deleteBlogImage } from "@/app/(dashboard)/blog/actions"
import { toast } from "sonner"

interface BlogImage {
  id: string
  image_url: string
  file_name: string | null
  file_size: number | null
  is_used: boolean | null
  created_at: string | null
}

interface BlogImageManagerProps {
  images: BlogImage[]
  onImageDeleted?: () => void
}

export function BlogImageManager({
  images: initialImages,
  onImageDeleted,
}: BlogImageManagerProps) {
  const [images, setImages] = useState(initialImages)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(imageId: string) {
    setDeletingId(imageId)
    startTransition(async () => {
      const result = await deleteBlogImage(imageId)
      if (result.success) {
        setImages((prev) => prev.filter((img) => img.id !== imageId))
        toast.success("Imagem removida")
        onImageDeleted?.()
      }
      setDeletingId(null)
    })
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success("URL copiada")
  }

  function formatSize(bytes: number | null) {
    if (!bytes) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const unusedCount = images.filter((img) => !img.is_used).length

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Images className="mr-2 h-4 w-4" />
          Imagens ({images.length})
          {unusedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {unusedCount} sem uso
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imagens do Post</DialogTitle>
          <DialogDescription>
            Gerencie as imagens enviadas para este post. Imagens marcadas como
            &quot;sem uso&quot; não estão no conteúdo atual.
          </DialogDescription>
        </DialogHeader>

        {images.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma imagem enviada ainda.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="group relative overflow-hidden rounded-lg border"
              >
                <div className="aspect-square">
                  <img
                    src={img.image_url}
                    alt={img.file_name ?? ""}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyUrl(img.image_url)}
                      title="Copiar URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(img.id)}
                      disabled={deletingId === img.id}
                    >
                      {deletingId === img.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <div className="text-white">
                    <p className="truncate text-xs font-medium">
                      {img.file_name ?? "imagem"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] opacity-80">
                        {formatSize(img.file_size)}
                      </span>
                      {!img.is_used && (
                        <Badge
                          variant="outline"
                          className="border-yellow-500 text-yellow-300 text-[10px] px-1 py-0"
                        >
                          sem uso
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
