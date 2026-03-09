import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { NavUser } from "@/components/nav-user"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

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

  const { count: newLeadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "new")

  return (
    <SidebarProvider>
      <AppSidebar newLeadsCount={newLeadsCount ?? 0} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex-1" />
          <NavUser
            user={{
              name: profile?.full_name ?? "Admin",
              email: profile?.email ?? user!.email ?? "",
              avatar_url: profile?.avatar_url,
            }}
          />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
