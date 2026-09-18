"use client"

import * as React from "react"
import Link from "next/link"
import { MapPin, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import type { MobileEvent } from "./types"

export function MobileAgendaList({ events }: { events: MobileEvent[] }) {
  const upcoming = events.filter((e) => !e.past).sort((a, b) => a.startMs - b.startMs)
  const past = events.filter((e) => e.past).sort((a, b) => b.startMs - a.startMs)
  const [tab, setTab] = React.useState<"proximos" | "passados">("proximos")

  const next = upcoming[0]
  const list = tab === "proximos" ? upcoming.slice(1) : past
  const groups: { label: string; items: MobileEvent[] }[] = []
  for (const e of list) {
    const last = groups[groups.length - 1]
    if (last?.label === e.monthLabel) last.items.push(e)
    else groups.push({ label: e.monthLabel, items: [e] })
  }

  return (
    <div className="flex flex-col gap-5 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">
            {next ? (next.ongoing ? "Acontecendo agora" : `Próximo ${next.relative}`) : "Nenhum evento marcado"}
          </span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Agenda</h1>
        </div>
        <Link
          href="/agenda/novo"
          aria-label="Novo evento"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-[22px]" strokeWidth={2.4} />
        </Link>
      </header>

      <div role="tablist" aria-label="Quando" className="flex gap-1 rounded-[14px] border bg-card p-1">
        {(
          [
            { id: "proximos", label: "Próximos", count: upcoming.length },
            { id: "passados", label: "Passados", count: past.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-9 grow rounded-[10px] text-sm",
              tab === t.id ? "bg-muted font-semibold" : "font-medium text-muted-foreground",
            )}
          >
            {t.label} <span className="font-medium text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "proximos" && next && (
        <Link
          href={`/agenda/${next.id}`}
          className="flex flex-col gap-3.5 rounded-3xl border border-primary/35 bg-primary/10 p-[18px] active:scale-[0.99]"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold tracking-wider text-primary uppercase">
              {next.ongoing ? "Acontecendo agora" : `Próximo · ${next.relative}`}
            </span>
            <TypeChip event={next} />
          </span>
          <span className="flex items-center gap-3.5">
            <span className="flex h-[70px] w-16 shrink-0 flex-col items-center justify-center gap-px rounded-2xl bg-primary text-primary-foreground">
              <span className="text-[26px] leading-none font-extrabold">{next.day}</span>
              <span className="text-[11px] font-extrabold tracking-wider">{next.monthShort}</span>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="line-clamp-2 text-[17px] leading-snug font-bold">{next.title}</span>
              <span className="text-[13px] text-foreground/80">{next.rangeLabel}</span>
            </span>
          </span>
          {next.place && (
            <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <MapPin className="size-4 shrink-0" strokeWidth={1.8} />
              <span className="truncate">{next.place}</span>
            </span>
          )}
        </Link>
      )}

      {groups.length === 0 && !(tab === "proximos" && next) && (
        <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          {tab === "proximos" ? "Nenhum evento marcado." : "Nenhum evento passado."}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">{g.label}</h2>
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            {g.items.map((e) => {
              const stale = e.past && e.status === "a confirmar"
              return (
                <Link
                  key={e.id}
                  href={`/agenda/${e.id}`}
                  className={cn("flex items-center gap-3 px-3.5 py-3 active:bg-foreground/5", e.past && !stale && "opacity-80")}
                >
                  <span className="flex h-[54px] w-[50px] shrink-0 flex-col items-center justify-center gap-px rounded-[14px] bg-muted">
                    <span className="text-[19px] leading-none font-extrabold">{e.day}</span>
                    <span className="text-[10px] font-bold tracking-wider text-primary">{e.weekday}</span>
                  </span>
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{e.title}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {[e.place, e.time].filter(Boolean).join(" · ")}
                    </span>
                    {stale && (
                      <span className="text-xs font-semibold text-primary">Já passou e segue “a confirmar”</span>
                    )}
                  </span>
                  <TypeChip event={e} />
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function TypeChip({ event: e }: { event: MobileEvent }) {
  const pending = e.status === "a confirmar"
  return (
    <span
      className={cn(
        "flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold",
        pending ? "border border-primary/50 text-primary" : "bg-muted text-foreground/80",
      )}
    >
      {pending ? "A confirmar" : e.typeLabel}
    </span>
  )
}
