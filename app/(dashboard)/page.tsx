import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Package,
  ShoppingCart,
  FileText,
  CalendarDays,
  MessageSquare,
  Users,
  DollarSign,
  TrendingUp,
  XCircle,
} from "lucide-react"
import { RevenueChart } from "@/components/charts/revenue-chart"
import { OrdersByStatus } from "@/components/charts/orders-by-status"
import { TopProducts } from "@/components/charts/top-products"
import { ConversionFunnel } from "@/components/charts/conversion-funnel"

async function getOverviewData() {
  const supabase = await createClient()

  const [
    { count: productsCount },
    { count: pendingOrdersCount },
    { data: paidOrders },
    { count: blogPostsCount },
    { count: upcomingEventsCount },
    { count: newLeadsCount },
    { count: usersCount },
    { data: recentOrders },
    { data: recentLeads },
    { data: allOrders },
    { data: checkoutSummary },
    { data: cartAdditions },
    { data: cartFunnel },
    { data: productAnalytics },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("total")
      .in("status", ["paid", "shipped", "delivered"]),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .gte("start_date", new Date().toISOString()),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id, short_id, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("leads")
      .select("id, name, email, type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    // All orders for status chart
    supabase.from("orders").select("status"),
    // Checkout summary view for revenue chart
    supabase
      .from("v_checkout_summary")
      .select("*")
      .order("event_date", { ascending: true }),
    // Cart additions view for top products
    supabase
      .from("v_cart_additions")
      .select("*")
      .order("total_additions", { ascending: false })
      .limit(5),
    // Cart funnel view
    supabase.from("v_cart_funnel").select("*").single(),
    // Product analytics for abandoned carts
    supabase
      .from("v_product_analytics")
      .select("product_id, product_title, total_add_to_cart, total_checkout_started, total_checkout_completed, abandoned_carts")
      .gt("abandoned_carts", 0)
      .order("abandoned_carts", { ascending: false })
      .limit(5),
  ])

  const totalRevenue =
    paidOrders?.reduce((sum, order) => sum + Number(order.total), 0) ?? 0

  // Build orders by status
  const statusCounts: Record<string, number> = {
    pending: 0,
    paid: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  }
  allOrders?.forEach((o) => {
    const s = o.status ?? "pending"
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  })
  const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))

  // Build revenue chart data
  const revenueData =
    checkoutSummary?.map((row) => ({
      date: row.event_date
        ? new Date(row.event_date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
          })
        : "",
      revenue: Number(row.total_revenue ?? 0),
    })) ?? []

  // Build top products data
  const topProductsData =
    cartAdditions?.map((row) => ({
      name: row.product_title ?? "—",
      additions: Number(row.total_additions ?? 0),
    })) ?? []

  // Build funnel data
  const funnelData = {
    addToCart: Number(cartFunnel?.total_add_to_cart ?? 0),
    checkoutStarted: Number(cartFunnel?.total_checkout_started ?? 0),
    checkoutCompleted: Number(cartFunnel?.total_checkout_completed ?? 0),
    uniqueCarts: Number(cartFunnel?.unique_carts ?? 0),
    uniquePurchasers: Number(cartFunnel?.unique_purchasers ?? 0),
  }

  // Abandoned carts data
  const abandonedCartsData =
    productAnalytics?.map((row) => ({
      productId: row.product_id,
      productTitle: row.product_title ?? "—",
      addToCart: Number(row.total_add_to_cart ?? 0),
      checkoutStarted: Number(row.total_checkout_started ?? 0),
      checkoutCompleted: Number(row.total_checkout_completed ?? 0),
      abandoned: Number(row.abandoned_carts ?? 0),
    })) ?? []

  const totalAbandonedCarts = abandonedCartsData.reduce(
    (sum, p) => sum + p.abandoned,
    0,
  )

  const conversionRate =
    funnelData.addToCart > 0
      ? ((funnelData.checkoutCompleted / funnelData.addToCart) * 100).toFixed(1)
      : "0"

  return {
    productsCount: productsCount ?? 0,
    pendingOrdersCount: pendingOrdersCount ?? 0,
    totalRevenue,
    blogPostsCount: blogPostsCount ?? 0,
    upcomingEventsCount: upcomingEventsCount ?? 0,
    newLeadsCount: newLeadsCount ?? 0,
    usersCount: usersCount ?? 0,
    recentOrders: recentOrders ?? [],
    recentLeads: recentLeads ?? [],
    ordersByStatus,
    revenueData,
    topProductsData,
    funnelData,
    conversionRate,
    abandonedCartsData,
    totalAbandonedCarts,
  }
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

const statusColors: Record<string, string> = {
  pending: "text-yellow-600",
  paid: "text-green-600",
  shipped: "text-blue-600",
  delivered: "text-emerald-600",
  cancelled: "text-red-600",
}

const leadTypeLabels: Record<string, string> = {
  contact: "Contato",
  invite: "Convite",
}

export default async function OverviewPage() {
  const data = await getOverviewData()

  const cards = [
    {
      title: "Receita Total",
      value: data.totalRevenue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
      icon: DollarSign,
      description: "Pedidos pagos/enviados/entregues",
    },
    {
      title: "Pedidos Pendentes",
      value: data.pendingOrdersCount,
      icon: ShoppingCart,
      description: "Aguardando pagamento",
    },
    {
      title: "Produtos",
      value: data.productsCount,
      icon: Package,
      description: "Total cadastrados",
    },
    {
      title: "Posts no Blog",
      value: data.blogPostsCount,
      icon: FileText,
      description: "Total publicados",
    },
    {
      title: "Eventos Próximos",
      value: data.upcomingEventsCount,
      icon: CalendarDays,
      description: "A partir de hoje",
    },
    {
      title: "Leads Novos",
      value: data.newLeadsCount,
      icon: MessageSquare,
      description: "Aguardando resposta",
    },
    {
      title: "Usuários",
      value: data.usersCount,
      icon: Users,
      description: "Total cadastrados",
    },
    {
      title: "Carrinhos Abandonados",
      value: data.totalAbandonedCarts,
      icon: XCircle,
      description: "Checkouts não finalizados",
    },
    {
      title: "Taxa de Conversão",
      value: `${data.conversionRate}%`,
      icon: TrendingUp,
      description: `${data.funnelData.uniquePurchasers} de ${data.funnelData.uniqueCarts} carrinhos`,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Resumo geral do site Goleiro Vitor
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart data={data.revenueData} />
        <OrdersByStatus data={data.ordersByStatus} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopProducts data={data.topProductsData} />
        <ConversionFunnel data={data.funnelData} />
      </div>

      {/* Abandoned Carts */}
      {data.abandonedCartsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Carrinhos Abandonados por Produto</CardTitle>
            <CardDescription>
              Produtos com checkouts iniciados mas não finalizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.abandonedCartsData.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.addToCart} adições · {item.checkoutStarted} checkouts · {item.checkoutCompleted} compras
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">{item.abandoned}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Pedidos Recentes</CardTitle>
            <CardDescription>Últimos 5 pedidos realizados</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pedido ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{order.short_id ?? order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at!).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {Number(order.total).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                      <p
                        className={`text-xs ${statusColors[order.status ?? "pending"]}`}
                      >
                        {statusLabels[order.status ?? "pending"]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Leads Recentes</CardTitle>
            <CardDescription>
              Últimos 5 contatos recebidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum lead ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lead.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">
                        {leadTypeLabels[lead.type ?? "contact"]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.created_at!).toLocaleDateString(
                          "pt-BR",
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
