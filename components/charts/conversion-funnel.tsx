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
  value: {
    label: "Quantidade",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

interface ConversionFunnelProps {
  data: {
    addToCart: number
    checkoutStarted: number
    checkoutCompleted: number
    uniqueCarts: number
    uniquePurchasers: number
  }
}

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  const funnelData = [
    { step: "Add ao Carrinho", value: data.addToCart },
    { step: "Checkout Iniciado", value: data.checkoutStarted },
    { step: "Checkout Completo", value: data.checkoutCompleted },
  ]

  const conversionRate =
    data.addToCart > 0
      ? ((data.checkoutCompleted / data.addToCart) * 100).toFixed(1)
      : "0"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
        <CardDescription>
          Taxa de conversão: {conversionRate}% — {data.uniquePurchasers} compradores de {data.uniqueCarts} carrinhos
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.addToCart === 0 ? (
          <p className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Sem dados de conversão.
          </p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={funnelData} accessibilityLayer>
              <XAxis dataKey="step" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
