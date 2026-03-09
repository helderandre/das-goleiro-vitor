import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteSettingsForm } from "@/components/site-settings-form"

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Site</h1>
        <p className="text-muted-foreground">
          Gerencie os conteúdos da página inicial do site público.
        </p>
      </div>

      <SiteSettingsForm settings={settings} />
    </div>
  )
}
