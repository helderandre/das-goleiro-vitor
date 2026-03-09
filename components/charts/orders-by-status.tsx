"use client"

import { Pie, PieChart, Cell } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const statusColors: Record<string, string> = {
  pending: "var(--chart-3)",
  paid: "var(--chart-1)",
  shipped: "var(--chart-2)",
  delivered: "var(--chart-4)",
  cancelled: "var(--chart-5)",
}

const chartConfig = {
  pending: { label: "Pendente", color: "var(--chart-3)" },
  paid: { label: "Pago", color: "var(--chart-1)" },
  shipped: { label: "Enviado", color: "var(--chart-2)" },
  delivered: { label: "Entregue", color: "var(--chart-4)" },
  cancelled: { label: "Cancelado", color: "var(--chart-5)" },
} satisfies ChartConfig

interface OrdersByStatusProps {
  data: Array<{
    status: string
    count: number
  }>
}

export function OrdersByStatus({ data }: OrdersByStatusProps) {
  const filtered = data.filter((d) => d.count > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos por Status</CardTitle>
        <CardDescription>Distribuição dos pedidos</CardDescription>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Nenhum pedido encontrado.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto h-[250px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={filtered}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
              >
                {filtered.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={statusColors[entry.status] ?? "var(--chart-1)"}
                  />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
