import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteSettingsForm } from "@/components/site-settings-form"
import { MobileSitePage } from "@/components/mobile/site/site-page"
import type { SocialLink } from "@/lib/site"

export default async function SitePage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single()

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Erro ao carregar configurações do site.</p>
      </div>
    )
  }

  const t = (v: string | null) => v?.trim() ?? ""
  const links = (Array.isArray(settings.social_links) ? settings.social_links : []) as unknown as SocialLink[]

  return (
    <>
    <div className="md:hidden">
      <MobileSitePage
        site={{
          id: settings.id,
          profile_image_url: settings.profile_image_url,
          profile_name: t(settings.profile_name),
          profile_subtitle: t(settings.profile_subtitle),
          profile_quote: t(settings.profile_quote),
          video_thumbnail_url: settings.video_thumbnail_url,
          video_category: t(settings.video_category),
          video_title: t(settings.video_title),
          video_duration: t(settings.video_duration),
          video_youtube_url: t(settings.video_youtube_url),
          impact_badge: t(settings.impact_badge),
          impact_number: t(settings.impact_number),
          impact_description: t(settings.impact_description),
          social_links: links.map((l) => ({ platform: l.platform, label: l.label, url: t(l.url) })),
          updatedLabel: settings.updated_at
            ? new Date(settings.updated_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
            : null,
        }}
      />
    </div>
    <div className="hidden space-y-6 md:block">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Site</h1>
        <p className="text-muted-foreground">
          Gerencie os conteúdos da página inicial do site público.
        </p>
      </div>

      <SiteSettingsForm settings={settings} />
    </div>
    </>
  )
}
