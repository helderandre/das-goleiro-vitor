import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"
import { MobileShell } from "@/components/mobile/mobile-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", user!.id)
    .single()

  const [{ count: newLeadsCount }, { count: ordersBadge }] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    // Selo da aba Pedidos no mobile: pagos esperando envio ou pedindo atenção.
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .or("status.eq.paid,needs_attention.eq.true"),
  ])

  const userInfo = {
    name: profile?.full_name ?? "Admin",
    email: profile?.email ?? user!.email ?? "",
    avatar_url: profile?.avatar_url,
  }

  return (
    <MobileShell
      user={userInfo}
      ordersBadge={ordersBadge ?? 0}
      newLeadsCount={newLeadsCount ?? 0}
    >
      {/* Alvo do shouldScaleBackground do Vaul: encolhe por trás das sheets.
          A barra de abas fica fora para não perder o position: fixed. */}
      <div data-vaul-drawer-wrapper className="min-h-svh bg-background">
        <SidebarProvider>
          <AppSidebar newLeadsCount={newLeadsCount ?? 0} />
          <SidebarInset className="min-w-0">
            <header className="hidden h-14 shrink-0 items-center gap-2 border-b px-4 md:flex">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex-1" />
              <NavUser user={userInfo} />
            </header>
            <main className="min-w-0 flex-1 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </MobileShell>
  )
}
