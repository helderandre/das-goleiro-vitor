"use client"

import { useState } from "react"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  GalleryHorizontalEnd,
  Plus,
  Trash2,
  X,
  Upload,
  Images,
  Loader2,
  Check,
} from "lucide-react"

export function ImageGalleryView({
  node,
  updateAttributes,
  deleteNode,
  editor,
}: NodeViewProps) {
  const images: string[] = node.attrs.images ?? []
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tab, setTab] = useState<"existing" | "upload">("existing")
  const [uploading, setUploading] = useState(false)
  const [selectedExisting, setSelectedExisting] = useState<string[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = (editor.storage as any).imageGallery as {
    uploadImage: ((file: File) => Promise<string | null>) | null
    existingImages: { url: string; name: string }[]
  }

  const existingImages = storage?.existingImages ?? []
  const uploadImage = storage?.uploadImage ?? null

  async function handleUploadFiles() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.multiple = true

    input.onchange = async () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0 || !uploadImage) return

      setUploading(true)
      const newUrls: string[] = []

      for (const file of files) {
        const url = await uploadImage(file)
        if (url) newUrls.push(url)
      }

      if (newUrls.length > 0) {
        updateAttributes({ images: [...images, ...newUrls] })
      }
      setUploading(false)
      setDialogOpen(false)
    }

    input.click()
  }

  function handleAddExisting() {
    if (selectedExisting.length === 0) return
    updateAttributes({ images: [...images, ...selectedExisting] })
    setSelectedExisting([])
    setDialogOpen(false)
  }

  function toggleExistingImage(url: string) {
    setSelectedExisting((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url],
    )
  }

  function handleRemoveImage(index: number) {
    const updated = images.filter((_, i) => i !== index)
    updateAttributes({ images: updated })
  }

  // Filter out images already in this gallery
  const availableImages = existingImages.filter(
    (img) => !images.includes(img.url),
  )

  return (
    <NodeViewWrapper className="my-4" data-type="image-gallery">
      <div className="group relative rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={deleteNode}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <GalleryHorizontalEnd className="h-4 w-4" />
          <span>Galeria de Imagens ({images.length})</span>
        </div>

        {images.length > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="group/img relative aspect-square overflow-hidden rounded-md border"
              >
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/img:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedExisting([])
            setTab(availableImages.length > 0 ? "existing" : "upload")
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Adicionar Imagens
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Adicionar Imagens à Galeria</DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b pb-2">
            <button
              type="button"
              onClick={() => setTab("existing")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === "existing"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Images className="h-3.5 w-3.5" />
              Imagens do Post ({availableImages.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === "upload"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Enviar Novas
            </button>
          </div>

          {/* Existing images tab */}
          {tab === "existing" && (
            <div>
              {availableImages.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma imagem disponível. Envie novas imagens.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableImages.map((img) => {
                      const isSelected = selectedExisting.includes(img.url)
                      return (
                        <button
                          key={img.url}
                          type="button"
                          onClick={() => toggleExistingImage(img.url)}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-transparent hover:border-muted-foreground/30"
                          }`}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="h-full w-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddExisting}
                      disabled={selectedExisting.length === 0}
                    >
                      Adicionar {selectedExisting.length > 0 && `(${selectedExisting.length})`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="flex flex-col items-center gap-4 py-8">
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Enviando imagens...
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Selecione imagens do seu computador
                  </p>
                  <Button type="button" onClick={handleUploadFiles}>
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Imagens
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  )
}
