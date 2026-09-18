"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Respeita "reduzir movimento" do sistema: sem contagem nem crescimento. */
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

type Format = "brl" | "int" | "pct" | ((n: number) => string)

function formatValue(n: number, format: Format, decimals: number) {
  if (typeof format === "function") return format(n)
  if (format === "brl") return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  if (format === "pct") return `${n.toLocaleString("pt-BR", { maximumFractionDigits: decimals })}%`
  return Math.round(n).toLocaleString("pt-BR")
}

/**
 * Número que conta de 0 (ou do valor anterior) até o valor, ao aparecer e
 * sempre que o valor muda (ex.: trocar o período). SSR já sai com o valor
 * final, então não há salto nem conteúdo errado sem JavaScript.
 */
export function AnimatedNumber({
  value,
  format = "int",
  decimals = 1,
  duration = 900,
  className,
}: {
  value: number
  format?: Format
  decimals?: number
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = React.useState(value)
  const from = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = value
      setDisplay(value)
      return
    }
    const start = from.current ?? 0
    from.current = value
    if (start === value) return
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      setDisplay(start + (value - start) * easeOutCubic(p))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <span className={cn("tabular-nums", className)}>{formatValue(display, format, decimals)}</span>
}

/**
 * true um quadro depois de montar: serve para barras e medidores saírem de
 * zero e crescerem com transition até o tamanho final.
 */
export function useGrowIn() {
  const [on, setOn] = React.useState(false)
  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setOn(true)
      return
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

/** Bloco de esqueleto com brilho passando (desliga com reduzir movimento). */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span aria-hidden className={cn("skeleton block rounded-md bg-muted", className)} style={style} />
}
