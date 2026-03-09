"use client"

import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Video } from "lucide-react"
import { useState } from "react"

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/,
  )
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`

  return url
}

export function VideoBlockView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [editing, setEditing] = useState(!node.attrs.src)
  const [inputUrl, setInputUrl] = useState(node.attrs.src ?? "")

  function handleSave() {
    const embedUrl = getEmbedUrl(inputUrl)
    updateAttributes({ src: embedUrl })
    setEditing(false)
  }

  return (
    <NodeViewWrapper className="my-4" data-type="video-block">
      <div className="group relative rounded-lg border border-dashed border-border bg-muted/30 p-2">
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing(!editing)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={deleteNode}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {editing ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Video className="h-5 w-5" />
              <span className="text-sm font-medium">Inserir Vídeo</span>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">
                URL do YouTube ou Vimeo
              </Label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
            <Button type="button" size="sm" onClick={handleSave}>
              Inserir
            </Button>
          </div>
        ) : node.attrs.src ? (
          <div className="aspect-video overflow-hidden rounded">
            <iframe
              src={node.attrs.src}
              className="h-full w-full"
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}
