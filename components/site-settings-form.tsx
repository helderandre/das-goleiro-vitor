"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, User, Video, Heart, ImagePlus, Plus, Trash2 } from "lucide-react"
import { updateSiteSettings } from "@/app/(dashboard)/site/actions"
import type { Tables } from "@/lib/supabase/database.types"

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram", prefix: "https://instagram.com/", placeholder: "goleirovitor" },
  { value: "youtube", label: "YouTube", prefix: "https://youtube.com/@", placeholder: "goleirovitor" },
  { value: "facebook", label: "Facebook", prefix: "https://facebook.com/", placeholder: "goleirovitor" },
  { value: "tiktok", label: "TikTok", prefix: "https://tiktok.com/@", placeholder: "goleirovitor" },
  { value: "twitter", label: "X (Twitter)", prefix: "https://x.com/", placeholder: "goleirovitor" },
  { value: "linkedin", label: "LinkedIn", prefix: "https://linkedin.com/in/", placeholder: "goleirovitor" },
  { value: "whatsapp", label: "WhatsApp", prefix: "https://wa.me/", placeholder: "5511999999999" },
  { value: "telegram", label: "Telegram", prefix: "https://t.me/", placeholder: "goleirovitor" },
  { value: "spotify", label: "Spotify", prefix: "https://open.spotify.com/artist/", placeholder: "id-do-artista" },
  { value: "threads", label: "Threads", prefix: "https://threads.net/@", placeholder: "goleirovitor" },
  { value: "pinterest", label: "Pinterest", prefix: "https://pinterest.com/", placeholder: "goleirovitor" },
  { value: "website", label: "Site / Link", prefix: "", placeholder: "https://meusite.com" },
] as const

function getPlatformConfig(platform: string) {
  return PLATFORM_OPTIONS.find((o) => o.value === platform) ?? PLATFORM_OPTIONS[PLATFORM_OPTIONS.length - 1]
}

/** Remove the base URL prefix to get just the handle/value part */
function extractHandle(platform: string, fullUrl: string): string {
  const config = getPlatformConfig(platform)
  if (!config.prefix || !fullUrl) return fullUrl
  if (fullUrl.startsWith(config.prefix)) return fullUrl.slice(config.prefix.length)
  // Try without protocol variations
  const withoutProtocol = fullUrl.replace(/^https?:\/\//, "")
  const prefixWithoutProtocol = config.prefix.replace(/^https?:\/\//, "")
  if (withoutProtocol.startsWith(prefixWithoutProtocol)) return withoutProtocol.slice(prefixWithoutProtocol.length)
  return fullUrl
}

/** Build full URL from handle and platform */
function buildFullUrl(platform: string, handle: string): string {
  if (!handle) return ""
  const config = getPlatformConfig(platform)
  if (!config.prefix) return handle // website: user types full URL
  // If user pasted a full URL, keep it as-is
  if (handle.startsWith("http://") || handle.startsWith("https://")) return handle
  return `${config.prefix}${handle}`
}

interface SocialLink {
  platform: string
  url: string
  label: string
}

interface SiteSettingsFormProps {
  settings: Tables<"site_settings">
}

export function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Store handles (not full URLs) in local state for display
  const rawLinks: SocialLink[] = Array.isArray(settings.social_links)
    ? (settings.social_links as unknown as SocialLink[])
    : []
  const initialLinks: SocialLink[] = rawLinks.map((link) => ({
    ...link,
    url: extractHandle(link.platform, link.url),
  }))
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialLinks)

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { platform: "instagram", url: "", label: "Instagram" }])
  }

  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSocialLink(index: number, field: keyof SocialLink, value: string) {
    setSocialLinks((prev) =>
      prev.map((link, i) => {
        if (i !== index) return link
        if (field === "platform") {
          const option = PLATFORM_OPTIONS.find((o) => o.value === value)
          // Re-extract handle if switching platforms (clear if prefix changed)
          return { ...link, platform: value, url: "", label: option?.label ?? value }
        }
        return { ...link, [field]: value }
      }),
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Build full URLs before saving
    const linksWithFullUrls = socialLinks.map((link) => ({
      ...link,
      url: buildFullUrl(link.platform, link.url),
    }))
    formData.set("social_links", JSON.stringify(linksWithFullUrls))

    startTransition(async () => {
      const result = await updateSiteSettings(settings.id, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Configurações salvas com sucesso!")
        router.refresh()
      }
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* ProfileCard Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil (Card Principal)
          </CardTitle>
          <CardDescription>
            Imagem de perfil, nome, subtítulo, frase e redes sociais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Image */}
          <div className="space-y-2">
            <Label>Foto de Perfil</Label>
            <div className="flex items-center gap-4">
              {settings.profile_image_url ? (
                <img
                  src={settings.profile_image_url}
                  alt="Perfil"
                  className="h-20 w-20 rounded-full object-cover border"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  name="profile_image"
                  accept="image/*"
                  className="max-w-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recomendado: 400x400px
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile_name">Nome</Label>
              <Input
                id="profile_name"
                name="profile_name"
                defaultValue={settings.profile_name}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile_subtitle">Subtítulo</Label>
              <Input
                id="profile_subtitle"
                name="profile_subtitle"
                defaultValue={settings.profile_subtitle}
                placeholder="Ex-Goleiro · Missionário"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile_quote">Frase / Citação</Label>
            <Input
              id="profile_quote"
              name="profile_quote"
              defaultValue={settings.profile_quote}
              placeholder="A luva que defende, a mão que estende"
              required
            />
          </div>

          <Separator />

          {/* Dynamic Social Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Redes Sociais</p>
              <Button type="button" variant="outline" size="sm" onClick={addSocialLink}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {socialLinks.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma rede social adicionada. Clique em &quot;Adicionar&quot; para incluir.
              </p>
            )}

            {socialLinks.map((link, index) => {
              const config = getPlatformConfig(link.platform)
              return (
                <div key={index} className="flex items-end gap-2">
                  <div className="w-[180px] space-y-1">
                    {index === 0 && <Label className="text-xs">Plataforma</Label>}
                    <Select
                      value={link.platform}
                      onValueChange={(val) => updateSocialLink(index, "platform", val)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    {index === 0 && <Label className="text-xs">{config.prefix ? "Usuário / ID" : "URL"}</Label>}
                    <div className="flex">
                      {config.prefix && (
                        <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground whitespace-nowrap">
                          {config.prefix}
                        </span>
                      )}
                      <Input
                        value={link.url}
                        onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                        placeholder={config.placeholder}
                        className={config.prefix ? "rounded-l-none" : ""}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeSocialLink(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* VideoCard Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Vídeo em Destaque
          </CardTitle>
          <CardDescription>
            Card de vídeo do YouTube exibido na página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Thumbnail do Vídeo</Label>
            <div className="flex items-center gap-4">
              {settings.video_thumbnail_url ? (
                <img
                  src={settings.video_thumbnail_url}
                  alt="Thumbnail"
                  className="h-20 w-36 rounded-lg object-cover border"
                />
              ) : (
                <div className="flex h-20 w-36 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  name="video_thumbnail"
                  accept="image/*"
                  className="max-w-xs"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Recomendado: 800x450px (16:9)
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_youtube_url">Link do YouTube</Label>
            <Input
              id="video_youtube_url"
              name="video_youtube_url"
              type="url"
              defaultValue={settings.video_youtube_url ?? ""}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Cole o link completo do vídeo do YouTube.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="video_category">Categoria / Badge</Label>
              <Input
                id="video_category"
                name="video_category"
                defaultValue={settings.video_category}
                placeholder="Testemunho"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="video_title">Título do Vídeo</Label>
              <Input
                id="video_title"
                name="video_title"
                defaultValue={settings.video_title}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video_duration">Duração</Label>
            <Input
              id="video_duration"
              name="video_duration"
              defaultValue={settings.video_duration}
              placeholder="12 min"
              required
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* ImpactCard Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Card de Impacto
          </CardTitle>
          <CardDescription>
            Contador de impacto social exibido na página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="impact_badge">Local / Badge</Label>
              <Input
                id="impact_badge"
                name="impact_badge"
                defaultValue={settings.impact_badge}
                placeholder="Libano"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact_number">Número</Label>
              <Input
                id="impact_number"
                name="impact_number"
                defaultValue={settings.impact_number}
                placeholder="+500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="impact_description">Descrição</Label>
              <Input
                id="impact_description"
                name="impact_description"
                defaultValue={settings.impact_description}
                placeholder="criancas atendidas"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} className="min-w-[160px]">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </form>
  )
}
