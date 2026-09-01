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
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
} from "lucide-react"
import { MonthlyRevenueChart } from "@/components/charts/monthly-revenue-chart"
import { PaymentStatusChart } from "@/components/charts/payment-status-chart"
import { PaymentMethodChart } from "@/components/charts/payment-method-chart"
import Link from "next/link"
import { getPaymentDisplay } from "@/lib/payment-methods"

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  paid: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

async function getFinancialData() {
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [
    { data: allOrders },
    { data: thisMonthOrders },
    { data: lastMonthOrders },
    { data: recentTransactions },
  ] = await Promise.all([
    supabase.from("orders").select("id, total, status, created_at, mp_payment_method, mp_payment_type, mp_net_amount, mp_fee_amount"),
    supabase
      .from("orders")
      .select("total, status, created_at")
      .gte("created_at", startOfMonth),
    supabase
      .from("orders")
      .select("total, status, created_at")
      .gte("created_at", startOfLastMonth)
      .lte("created_at", endOfLastMonth),
    supabase
      .from("orders")
      .select("id, short_id, total, status, created_at, user_id, mp_payment_method, mp_payment_type")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // Get profiles for recent transactions
  const userIds = [
    ...new Set(
      recentTransactions?.map((o) => o.user_id).filter(Boolean) as string[]
    ),
  ]
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds.length > 0 ? userIds : ["_"])
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

  const paidStatuses = ["paid", "shipped", "delivered"]

  // Total revenue (all time)
  const totalRevenue =
    allOrders
      ?.filter((o) => paidStatuses.includes(o.status ?? ""))
      .reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  // This month revenue
  const thisMonthRevenue =
    thisMonthOrders
      ?.filter((o) => paidStatuses.includes(o.status ?? ""))
      .reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  // Last month revenue
  const lastMonthRevenue =
    lastMonthOrders
      ?.filter((o) => paidStatuses.includes(o.status ?? ""))
      .reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  // Revenue growth %
  const revenueGrowth =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0
        ? 100
        : 0

  // Pending revenue
  const pendingRevenue =
    allOrders
      ?.filter((o) => o.status === "pending")
      .reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  // Cancelled/lost revenue
  const cancelledRevenue =
    allOrders
      ?.filter((o) => o.status === "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0) ?? 0

  // Average ticket
  const paidOrders = allOrders?.filter((o) =>
    paidStatuses.includes(o.status ?? "")
  )
  const avgTicket =
    paidOrders && paidOrders.length > 0
      ? paidOrders.reduce((sum, o) => sum + Number(o.total), 0) /
        paidOrders.length
      : 0

  // Total orders count
  const totalOrders = allOrders?.length ?? 0
  const paidOrdersCount = paidOrders?.length ?? 0

  // Revenue by status (for pie chart)
  const revenueByStatus: Record<string, number> = {}
  allOrders?.forEach((o) => {
    const s = o.status ?? "pending"
    revenueByStatus[s] = (revenueByStatus[s] ?? 0) + Number(o.total)
  })
  const paymentStatusData = Object.entries(revenueByStatus).map(
    ([status, total]) => ({ status, total })
  )

  // Revenue by payment type (for pie chart) — uses mp_payment_type (category)
  const revenueByMethod: Record<string, number> = {}
  const countByMethod: Record<string, number> = {}
  allOrders
    ?.filter((o) => paidStatuses.includes(o.status ?? ""))
    .forEach((o) => {
      const key = o.mp_payment_type ?? o.mp_payment_method ?? "outro"
      revenueByMethod[key] = (revenueByMethod[key] ?? 0) + Number(o.total)
      countByMethod[key] = (countByMethod[key] ?? 0) + 1
    })
  const paymentMethodData = Object.entries(revenueByMethod).map(
    ([method, total]) => ({ method, total, count: countByMethod[method] ?? 0 })
  )

  // Total fees and net
  const totalFees = allOrders
    ?.filter((o) => paidStatuses.includes(o.status ?? ""))
    .reduce((sum, o) => sum + Number(o.mp_fee_amount ?? 0), 0) ?? 0
  const totalNet = allOrders
    ?.filter((o) => paidStatuses.includes(o.status ?? ""))
    .reduce((sum, o) => sum + Number(o.mp_net_amount ?? 0), 0) ?? 0

  // Monthly revenue (last 12 months)
  const monthlyMap = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    monthlyMap.set(key, 0)
  }
  allOrders
    ?.filter((o) => paidStatuses.includes(o.status ?? ""))
    .forEach((o) => {
      const d = new Date(o.created_at!)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(o.total))
      }
    })
  const monthlyRevenueData = Array.from(monthlyMap.entries()).map(
    ([key, revenue]) => {
      const [year, month] = key.split("-")
      const d = new Date(Number(year), Number(month) - 1)
      return {
        month: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        revenue,
      }
    }
  )

  // Recent transactions with profile info
  const transactions =
    recentTransactions?.map((o) => {
      const profile = o.user_id ? profileMap.get(o.user_id) : null
      return {
        id: o.id,
        shortId: o.short_id ?? o.id.slice(0, 8),
        total: Number(o.total),
        status: o.status ?? "pending",
        createdAt: o.created_at!,
        customerName: profile?.full_name ?? "—",
        customerEmail: profile?.email ?? "",
        mpPaymentMethod: o.mp_payment_method,
        mpPaymentType: o.mp_payment_type,
      }
    }) ?? []

  return {
    totalRevenue,
    thisMonthRevenue,
    lastMonthRevenue,
    revenueGrowth,
    pendingRevenue,
    cancelledRevenue,
    avgTicket,
    totalOrders,
    paidOrdersCount,
    paymentStatusData,
    paymentMethodData,
    monthlyRevenueData,
    transactions,
    totalFees,
    totalNet,
  }
}

export default async function FinanceiroPage() {
  const data = await getFinancialData()

  const isGrowthPositive = data.revenueGrowth >= 0

  const cards = [
    {
      title: "Receita Total",
      value: formatBRL(data.totalRevenue),
      icon: DollarSign,
      description: `${data.paidOrdersCount} pedidos pagos`,
      color: "text-green-600",
    },
    {
      title: "Receita do Mês",
      value: formatBRL(data.thisMonthRevenue),
      icon: isGrowthPositive ? TrendingUp : TrendingDown,
      description: (
        <span className={isGrowthPositive ? "text-green-600" : "text-red-600"}>
          {isGrowthPositive ? (
            <ArrowUpRight className="mr-0.5 inline h-3 w-3" />
          ) : (
            <ArrowDownRight className="mr-0.5 inline h-3 w-3" />
          )}
          {Math.abs(data.revenueGrowth).toFixed(1)}% vs mês anterior
        </span>
      ),
      color: "text-blue-600",
    },
    {
      title: "Ticket Médio",
      value: formatBRL(data.avgTicket),
      icon: Receipt,
      description: `Base de ${data.paidOrdersCount} vendas`,
      color: "text-purple-600",
    },
    {
      title: "Pendente",
      value: formatBRL(data.pendingRevenue),
      icon: Clock,
      description: "Aguardando pagamento",
      color: "text-yellow-600",
    },
    {
      title: "Receita Líquida",
      value: formatBRL(data.totalNet),
      icon: CheckCircle2,
      description: "Após taxas do Mercado Pago",
      color: "text-emerald-600",
    },
    {
      title: "Taxas MP",
      value: formatBRL(data.totalFees),
      icon: XCircle,
      description: "Total retido pelo Mercado Pago",
      color: "text-red-600",
    },
    {
      title: "Mês Anterior",
      value: formatBRL(data.lastMonthRevenue),
      icon: Wallet,
      description: "Receita confirmada",
      color: "text-slate-600",
    },
    {
      title: "Total de Pedidos",
      value: data.totalOrders,
      icon: Receipt,
      description: "Todos os status",
      color: "text-slate-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
        <p className="text-muted-foreground">
          Visão geral das finanças e transações
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
              <card.icon className={`h-4 w-4 ${card.color}`} />
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

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Últimos 12 meses (pedidos confirmados)</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlyRevenueChart data={data.monthlyRevenueData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receita por Status</CardTitle>
            <CardDescription>Distribuição do valor total</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentStatusChart data={data.paymentStatusData} />
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Chart */}
      {data.paymentMethodData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Receita por Método</CardTitle>
              <CardDescription>Distribuição por forma de pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentMethodChart data={data.paymentMethodData} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Detalhes por Método</CardTitle>
              <CardDescription>Receita e quantidade por forma de pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.paymentMethodData
                  .sort((a, b) => b.total - a.total)
                  .map((item) => {
                    const pm = getPaymentDisplay(null, item.method)
                    const Icon = pm.icon
                    const pct = data.totalRevenue > 0 ? (item.total / data.totalRevenue) * 100 : 0
                    return (
                      <div key={item.method} className="flex items-center gap-3 rounded-lg border p-3">
                        <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{pm.typeLabel ?? item.method}</p>
                          <div className="mt-1 h-2 w-full rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{formatBRL(item.total)}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.count} pedido(s) · {pct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
          <CardDescription>
            10 pedidos mais recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.transactions.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              Nenhuma transação encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Link
                        href={`/pedidos/${tx.id}`}
                        className="font-mono text-sm text-primary underline underline-offset-2"
                      >
                        #{tx.shortId}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{tx.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {tx.customerEmail}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const pm = getPaymentDisplay(tx.mpPaymentMethod, tx.mpPaymentType)
                        const Icon = pm.icon
                        return pm.hasData ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {pm.displayLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[tx.status] ?? "secondary"}>
                        {statusLabels[tx.status] ?? tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatBRL(tx.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
