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

const methodColors: Record<string, string> = {
  credit_card: "var(--chart-1)",
  debit_card: "var(--chart-2)",
  bank_transfer: "var(--chart-3)",
  pix: "var(--chart-3)",
  ticket: "var(--chart-4)",
  bolbradesco: "var(--chart-4)",
  account_money: "var(--chart-5)",
  outro: "var(--muted-foreground)",
}

const chartConfig = {
  credit_card: { label: "Crédito", color: "var(--chart-1)" },
  debit_card: { label: "Débito", color: "var(--chart-2)" },
  bank_transfer: { label: "Pix", color: "var(--chart-3)" },
  pix: { label: "Pix", color: "var(--chart-3)" },
  ticket: { label: "Boleto", color: "var(--chart-4)" },
  bolbradesco: { label: "Boleto", color: "var(--chart-4)" },
  account_money: { label: "Saldo MP", color: "var(--chart-5)" },
  outro: { label: "Outro", color: "var(--muted-foreground)" },
} satisfies ChartConfig

interface PaymentMethodChartProps {
  data: Array<{
    method: string
    total: number
    count: number
  }>
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const filtered = data.filter((d) => d.total > 0)

  if (filtered.length === 0) {
    return (
      <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Sem dados de pagamento.
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
          nameKey="method"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
        >
          {filtered.map((entry) => (
            <Cell
              key={entry.method}
              fill={methodColors[entry.method] ?? "var(--chart-1)"}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  )
}
