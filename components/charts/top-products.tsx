"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const chartConfig = {
  additions: {
    label: "Adições ao carrinho",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface TopProductsProps {
  data: Array<{
    name: string
    additions: number
  }>
}

export function TopProducts({ data }: TopProductsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produtos Populares</CardTitle>
        <CardDescription>Mais adicionados ao carrinho</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
            Sem dados de produtos.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={data} layout="vertical" accessibilityLayer>
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={120}
                tickFormatter={(v) => (v.length > 18 ? v.slice(0, 18) + "..." : v)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="additions"
                fill="var(--chart-2)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
