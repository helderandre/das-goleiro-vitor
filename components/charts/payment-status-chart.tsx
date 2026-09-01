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

interface PaymentStatusChartProps {
  data: Array<{
    status: string
    total: number
  }>
}

export function PaymentStatusChart({ data }: PaymentStatusChartProps) {
  const filtered = data.filter((d) => d.total > 0)

  if (filtered.length === 0) {
    return (
      <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Sem dados.
      </p>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto h-[250px] w-full">
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) =>
                Number(value).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })
              }
            />
          }
        />
        <Pie
          data={filtered}
          dataKey="total"
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
  )
}
