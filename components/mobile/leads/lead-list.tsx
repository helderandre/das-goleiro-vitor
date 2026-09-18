"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"

export interface MobileLeadItem {
  id: string
  name: string
  initials: string
  whenLabel: string
  isInvite: boolean
  status: string
  message: string | null
  place: string | null
  dates: string | null
}

const FILTERS = [
  { id: "all", label: "Todos", match: () => true },
  { id: "new", label: "Novos", match: (l: MobileLeadItem) => l.status === "new" },
  { id: "invite", label: "Convites", match: (l: MobileLeadItem) => l.isInvite && l.status !== "archived" },
  { id: "answered", label: "Respondidos", match: (l: MobileLeadItem) => l.status === "answered" },
  { id: "archived", label: "Arquivados", match: (l: MobileLeadItem) => l.status === "archived" },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

export function MobileLeadList({ leads }: { leads: MobileLeadItem[] }) {
  const [filter, setFilter] = React.useState<FilterId>("all")
  // "Todos" esconde os arquivados: eles têm a aba própria.
  const active = FILTERS.find((f) => f.id === filter)!
  const visible = leads.filter((l) => (filter === "all" ? l.status !== "archived" : active.match(l)))
  const newCount = leads.filter((l) => l.status === "new").length

  return (
    <div className="flex flex-col gap-5 pt-4">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted-foreground">
          {newCount === 0
            ? "Tudo respondido"
            : `${newCount} ${newCount === 1 ? "novo esperando" : "novos esperando"} resposta`}
        </span>
        <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Leads</h1>
      </header>

      <div role="tablist" aria-label="Filtro" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = f.id === filter
          const count = f.id === "all" ? leads.filter((l) => l.status !== "archived").length : leads.filter(f.match).length
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-[38px] shrink-0 rounded-full px-3.5 text-sm whitespace-nowrap",
                on ? "bg-foreground font-bold text-background" : "border bg-card font-medium text-foreground/80",
              )}
            >
              {f.label}{" "}
              <span className={cn("font-medium", on ? "text-background/60" : "text-muted-foreground")}>{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          {leads.length === 0
            ? "Nenhum lead ainda. Contatos e convites do site aparecem aqui."
            : "Nenhum lead neste filtro."}
        </p>
      ) : (
        visible.map((l) => {
          const unread = l.status === "new"
          return (
            <Link
              key={l.id}
              href={`/leads/${l.id}`}
              className={cn(
                "flex flex-col gap-2.5 rounded-[20px] border bg-card p-3.5 active:scale-[0.99]",
                unread && "border-primary/35",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-foreground/80">
                  {l.initials}
                  {unread && (
                    <span className="absolute top-0 right-0 size-[11px] rounded-full bg-primary ring-2 ring-card" />
                  )}
                </span>
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className={cn("truncate text-[15px]", unread ? "font-extrabold" : "font-semibold")}>{l.name}</span>
                  <span className="text-xs text-muted-foreground">{l.whenLabel}</span>
                </span>
                <span
                  className={cn(
                    "flex h-[22px] shrink-0 items-center rounded-full px-2 text-[11px] font-bold",
                    l.isInvite ? "bg-primary/15 text-primary" : "bg-muted text-foreground/80",
                  )}
                >
                  {l.isInvite ? "Convite" : "Contato"}
                </span>
              </span>
              {l.message && <span className="line-clamp-2 text-sm leading-snug text-foreground/80">{l.message}</span>}
              {l.isInvite && (l.place || l.dates) && (
                <span className="flex flex-wrap gap-1.5">
                  {[l.place, l.dates].filter(Boolean).map((t) => (
                    <span key={t} className="flex h-[26px] items-center rounded-[9px] bg-muted px-2.5 text-xs font-semibold text-foreground/80">
                      {t}
                    </span>
                  ))}
                </span>
              )}
            </Link>
          )
        })
      )}
    </div>
  )
}
