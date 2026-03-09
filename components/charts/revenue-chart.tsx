"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface RevenueChartProps {
  data: Array<{
    date: string
    revenue: number
  }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita</CardTitle>
        <CardDescription>Receita diária dos checkouts completados</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Sem dados de receita no período.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <AreaChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
                }
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    }
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                fill="var(--chart-1)"
                fillOpacity={0.2}
                stroke="var(--chart-1)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
