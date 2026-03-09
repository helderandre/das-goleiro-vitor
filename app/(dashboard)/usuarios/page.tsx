import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { UsersTable } from "./users-table"

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>
}) {
  const { role, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: false })

  if (role && role !== "all") {
    query = query.eq("role", role)
  }

  const { data: profiles } = await query

  // Get order counts per user
  const { data: orderCounts } = await supabase
    .from("orders")
    .select("user_id, total")

  const userStats = new Map<string, { count: number; total: number }>()
  orderCounts?.forEach((o) => {
    if (!o.user_id) return
    const existing = userStats.get(o.user_id) ?? { count: 0, total: 0 }
    existing.count++
    existing.total += Number(o.total)
    userStats.set(o.user_id, existing)
  })

  // Get addresses per user
  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })

  const addressMap = new Map<string, typeof addresses>()
  addresses?.forEach((addr) => {
    if (!addr.user_id) return
    const list = addressMap.get(addr.user_id) ?? []
    list.push(addr)
    addressMap.set(addr.user_id, list)
  })

  // Filter by search
  let filtered = profiles ?? []
  if (q) {
    const search = q.toLowerCase()
    filtered = filtered.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(search) ||
        p.email?.toLowerCase().includes(search),
    )
  }

  const usersWithStats = filtered.map((p) => ({
    ...p,
    orderCount: userStats.get(p.id)?.count ?? 0,
    orderTotal: userStats.get(p.id)?.total ?? 0,
    addresses: addressMap.get(p.id) ?? [],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
        <p className="text-muted-foreground">
          Usuários cadastrados na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
          <CardDescription>
            {usersWithStats.length} usuário(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={usersWithStats}
            currentRole={role}
            currentSearch={q}
          />
        </CardContent>
      </Card>
    </div>
  )
}
