"use client"

import { useCallback, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react"
import {
  deleteProductImage,
  uploadProductImage,
  setCoverImage,
} from "@/app/(dashboard)/produtos/actions"
import { compressImage } from "@/lib/compress-image"
import { toast } from "sonner"

interface ExistingImage {
  id: string
  image_url: string
  is_cover: boolean
}

interface ImageUploaderProps {
  productId: string | null
  existingImages: ExistingImage[]
  onImagesChange?: (images: ExistingImage[]) => void
}

export function ImageUploader({
  productId,
  existingImages,
  onImagesChange,
}: ImageUploaderProps) {
  const [images, setImages] = useState<ExistingImage[]>(existingImages)
  const [isUploading, setIsUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const updateImages = useCallback(
    (updated: ExistingImage[]) => {
      setImages(updated)
      onImagesChange?.(updated)
    },
    [onImagesChange],
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawFiles = Array.from(e.target.files ?? [])
      if (rawFiles.length === 0 || !productId) return

      setIsUploading(true)

      try {
        for (let i = 0; i < rawFiles.length; i++) {
          const compressed = await compressImage(rawFiles[i])
          const isCover = images.length === 0 && i === 0

          const fd = new FormData()
          fd.set("file", compressed)

          const result = await uploadProductImage(productId, fd, isCover)

          if (result.error) {
            toast.error(`Erro ao enviar ${rawFiles[i].name}: ${result.error}`)
            continue
          }

          if (result.image) {
            setImages((prev) => {
              const updated = [...prev, result.image as ExistingImage]
              onImagesChange?.(updated)
              return updated
            })
          }
        }

        toast.success(
          rawFiles.length === 1
            ? "Imagem enviada"
            : `${rawFiles.length} imagens enviadas`,
        )
      } catch {
        toast.error("Erro ao enviar imagens")
      } finally {
        setIsUploading(false)
        e.target.value = ""
      }
    },
    [productId, images.length, onImagesChange],
  )

  function handleSetCover(imageId: string) {
    if (!productId) return

    startTransition(async () => {
      const result = await setCoverImage(productId, imageId)
      if (result.success) {
        const updated = images.map((img) => ({
          ...img,
          is_cover: img.id === imageId,
        }))
        updateImages(updated)
        toast.success("Capa definida")
      }
    })
  }

  function handleDeleteExisting(imageId: string, imageUrl: string) {
    setDeletingId(imageId)
    startTransition(async () => {
      const result = await deleteProductImage(imageId, imageUrl)
      if (result.success) {
        const updated = images.filter((img) => img.id !== imageId)
        updateImages(updated)
        toast.success("Imagem removida")
      }
      setDeletingId(null)
    })
  }

  if (!productId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Salve o produto primeiro para poder adicionar imagens.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {/* Existing images */}
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
          >
            <img
              src={img.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSetCover(img.id)}
                title="Definir como capa"
                disabled={isPending}
              >
                <Star
                  className={`h-4 w-4 ${img.is_cover ? "fill-yellow-400 text-yellow-400" : ""}`}
                />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteExisting(img.id, img.image_url)}
                disabled={deletingId === img.id}
              >
                {deletingId === img.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            {img.is_cover && (
              <span className="absolute left-1 top-1 rounded bg-yellow-500 px-1.5 py-0.5 text-[10px] font-bold text-black">
                CAPA
              </span>
            )}
          </div>
        ))}

        {/* Upload button */}
        <label
          className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary ${isUploading ? "pointer-events-none opacity-50" : ""}`}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">Enviando...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Adicionar</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Clique na estrela para definir a imagem de capa. Passe o mouse sobre a
        imagem para ver as opções.
      </p>
    </div>
  )
}
