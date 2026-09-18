"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatBRL } from "../format"

export interface MobileUserItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  initials: string
  avatarUrl: string | null
  admin: boolean
  orders: number
  spent: number
}

const FILTERS = [
  { id: "todos", label: "Todos", match: () => true },
  { id: "compraram", label: "Compraram", match: (u: MobileUserItem) => u.orders > 0 },
  { id: "admins", label: "Admins", match: (u: MobileUserItem) => u.admin },
  { id: "semcel", label: "Sem celular", match: (u: MobileUserItem) => !u.phone },
] as const

type FilterId = (typeof FILTERS)[number]["id"]

function normalize(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

export function MobileUserList({ users }: { users: MobileUserItem[] }) {
  const [filter, setFilter] = React.useState<FilterId>("todos")
  const [query, setQuery] = React.useState("")

  const q = normalize(query.trim())
  const digits = query.replace(/\D/g, "")
  const searched = users.filter(
    (u) =>
      !q ||
      normalize(u.name).includes(q) ||
      normalize(u.email ?? "").includes(q) ||
      (digits.length >= 3 && (u.phone ?? "").replace(/\D/g, "").includes(digits)),
  )
  const active = FILTERS.find((f) => f.id === filter)!
  const visible = searched.filter(active.match)
  const admins = users.filter((u) => u.admin).length

  return (
    <div className="flex flex-col gap-5 pt-4">
      <header className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted-foreground">
          {users.length} {users.length === 1 ? "cadastrado" : "cadastrados"} · {admins} {admins === 1 ? "admin" : "admins"}
        </span>
        <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Usuários</h1>
      </header>

      <label className="flex h-[46px] items-center gap-2.5 rounded-[14px] border bg-card px-3.5 text-muted-foreground">
        <Search className="size-[18px] shrink-0" />
        <span className="sr-only">Buscar usuário</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome, e-mail ou telefone"
          className="h-full min-w-0 grow bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div role="tablist" aria-label="Filtro" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = f.id === filter
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
              <span className={cn("font-medium", on ? "text-background/60" : "text-muted-foreground")}>
                {searched.filter(f.match).length}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">
          Ninguém encontrado com esses filtros.
        </p>
      ) : (
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          {visible.map((u) => (
            <Link key={u.id} href={`/usuarios/${u.id}`} className="flex items-center gap-3 px-3.5 py-3 active:bg-foreground/5">
              <Avatar user={u} className="size-[42px] text-sm" />
              <span className="flex min-w-0 grow flex-col gap-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[15px] font-semibold">{u.name}</span>
                  {u.admin && (
                    <span className="flex h-5 shrink-0 items-center rounded-full bg-primary/15 px-1.5 text-[10px] font-extrabold text-primary">
                      ADMIN
                    </span>
                  )}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {[u.phone ? "Celular" : "Sem celular", u.orders ? `${u.orders} ${u.orders === 1 ? "pedido" : "pedidos"}` : "sem pedidos"].join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end">
                <span className={cn("text-[15px] font-extrabold whitespace-nowrap", !u.orders && "text-muted-foreground/60")}>
                  {u.orders ? formatBRL(u.spent) : "—"}
                </span>
                {u.orders > 0 && <span className="text-[11px] text-muted-foreground">gasto</span>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function Avatar({
  user,
  className,
}: {
  user: { initials: string; avatarUrl: string | null; admin: boolean }
  className?: string
}) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar no Supabase Storage
      <img src={user.avatarUrl} alt="" className={cn("shrink-0 rounded-full bg-muted object-cover", className)} />
    )
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        user.admin ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80",
        className,
      )}
    >
      {user.initials}
    </span>
  )
}
