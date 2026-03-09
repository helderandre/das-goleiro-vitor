"use client"

import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MousePointer,
  Settings,
  Trash2,
  ExternalLink,
  FileText,
  ShoppingBag,
  Loader2,
} from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface RefItem {
  slug: string
  title: string
}

export function ButtonBlockView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [editing, setEditing] = useState(false)
  const [blogPosts, setBlogPosts] = useState<RefItem[]>([])
  const [products, setProducts] = useState<RefItem[]>([])
  const [loading, setLoading] = useState(false)
  const { label, url, variant, linkType, refSlug } = node.attrs

  useEffect(() => {
    if (!editing) return

    const supabase = createClient()
    setLoading(true)

    Promise.all([
      supabase
        .from("blog_posts")
        .select("slug, title")
        .eq("status", "published")
        .order("title"),
      supabase
        .from("products")
        .select("slug, title")
        .order("title"),
    ]).then(([blogRes, prodRes]) => {
      if (blogRes.data) {
        setBlogPosts(blogRes.data.map((p) => ({ slug: p.slug, title: p.title })))
      }
      if (prodRes.data) {
        setProducts(prodRes.data.map((p) => ({ slug: p.slug, title: p.title })))
      }
      setLoading(false)
    })
  }, [editing])

  function handleLinkTypeChange(type: string) {
    updateAttributes({ linkType: type, url: "#", refSlug: "" })
  }

  function handleRefChange(slug: string) {
    updateAttributes({ refSlug: slug })
  }

  const iconMap: Record<string, React.ReactNode> = {
    external: <ExternalLink className="h-3.5 w-3.5" />,
    blog: <FileText className="h-3.5 w-3.5" />,
    product: <ShoppingBag className="h-3.5 w-3.5" />,
  }
  const labelMap: Record<string, string> = {
    external: "Link externo",
    blog: "Post do blog",
    product: "Produto",
  }
  const linkTypeIcon = iconMap[linkType] ?? iconMap.external
  const linkTypeLabel = labelMap[linkType] ?? labelMap.external

  return (
    <NodeViewWrapper className="my-4" data-type="button-block">
      <div className="group relative rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setEditing(!editing)}
          >
            <Settings className="h-3.5 w-3.5" />
          </Button>
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

        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Texto do botão</Label>
              <Input
                value={label}
                onChange={(e) => updateAttributes({ label: e.target.value })}
                placeholder="Clique aqui"
              />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo de link</Label>
              <Select
                value={linkType}
                onValueChange={handleLinkTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Link externo
                    </span>
                  </SelectItem>
                  <SelectItem value="blog">
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      Post do blog
                    </span>
                  </SelectItem>
                  <SelectItem value="product">
                    <span className="flex items-center gap-2">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Produto
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkType === "external" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">URL</Label>
                <Input
                  value={url}
                  onChange={(e) => updateAttributes({ url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            {linkType === "blog" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Post do blog</Label>
                {loading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando posts...
                  </div>
                ) : (
                  <Select
                    value={refSlug}
                    onValueChange={handleRefChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um post" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogPosts.map((post) => (
                        <SelectItem key={post.slug} value={post.slug}>
                          {post.title}
                        </SelectItem>
                      ))}
                      {blogPosts.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum post publicado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {linkType === "product" && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Produto</Label>
                {loading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Carregando produtos...
                  </div>
                ) : (
                  <Select
                    value={refSlug}
                    onValueChange={handleRefChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((prod) => (
                        <SelectItem key={prod.slug} value={prod.slug}>
                          {prod.title}
                        </SelectItem>
                      ))}
                      {products.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum produto cadastrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-xs">Estilo</Label>
              <Select
                value={variant}
                onValueChange={(v) => updateAttributes({ variant: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primário</SelectItem>
                  <SelectItem value="secondary">Secundário</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setEditing(false)}
            >
              Concluir
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
              <MousePointer className="h-4 w-4" />
              {label || "Botão"}
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              {linkTypeIcon}
              {linkTypeLabel}
              {refSlug && <span className="font-mono">({refSlug})</span>}
            </span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}
