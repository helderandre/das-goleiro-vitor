import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { OrderStatusBadge } from "@/components/order-status-badge"
import { OrderFilters } from "./filters"

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("orders")
    .select("id, short_id, total, status, created_at, user_id")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data: orders } = await query

  // Get profiles for all user_ids
  const userIds = [...new Set(orders?.map((o) => o.user_id).filter(Boolean) as string[])]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds.length > 0 ? userIds : ["_"])

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  // Filter by search query (client name or short_id)
  let filtered = orders ?? []
  if (q) {
    const search = q.toLowerCase()
    filtered = filtered.filter((order) => {
      const profile = order.user_id ? profileMap.get(order.user_id) : null
      const name = profile?.full_name?.toLowerCase() ?? ""
      const shortId = order.short_id?.toLowerCase() ?? ""
      return name.includes(search) || shortId.includes(search)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
        <p className="text-muted-foreground">
          Gerencie os pedidos do marketplace
        </p>
      </div>

      <OrderFilters currentStatus={status} currentSearch={q} />

      <Card>
        <CardHeader>
          <CardTitle>Todos os Pedidos</CardTitle>
          <CardDescription>
            {filtered.length} pedido(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Nenhum pedido encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => {
                  const profile = order.user_id
                    ? profileMap.get(order.user_id)
                    : null

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        #{order.short_id ?? order.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {profile?.full_name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {profile?.email ?? ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(order.total).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at!).toLocaleDateString(
                          "pt-BR",
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/pedidos/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
