"use client"

import * as React from "react"
import Link from "next/link"
import { Plus, Search, Star, TabletSmartphone } from "lucide-react"

import { cn } from "@/lib/utils"
import { formatBRL } from "../format"
import { finalPrice } from "./product-utils"

export interface MobileProductItem {
  id: string
  title: string
  coverUrl: string | null
  price: number
  discount: number
  stock: number | null
  isMain: boolean
  isEbook: boolean
  sold: number
  inCart: number
}

const filters = [
  { id: "todos", label: "Todos" },
  { id: "fisicos", label: "Físicos" },
  { id: "ebooks", label: "E-books" },
] as const

type FilterId = (typeof filters)[number]["id"]

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export function MobileProductList({ products }: { products: MobileProductItem[] }) {
  const [filter, setFilter] = React.useState<FilterId>("todos")
  const [query, setQuery] = React.useState("")

  const counts = {
    todos: products.length,
    fisicos: products.filter((p) => !p.isEbook).length,
    ebooks: products.filter((p) => p.isEbook).length,
  }

  const q = normalize(query.trim())
  const visible = products.filter((p) => {
    if (filter === "fisicos" && p.isEbook) return false
    if (filter === "ebooks" && !p.isEbook) return false
    return !q || normalize(p.title).includes(q)
  })

  const totals = visible.reduce(
    (acc, p) => ({
      stock: acc.stock + (p.isEbook ? 0 : (p.stock ?? 0)),
      sold: acc.sold + p.sold,
      inCart: acc.inCart + p.inCart,
    }),
    { stock: 0, sold: 0, inCart: 0 },
  )

  return (
    <div className="flex flex-col gap-[22px] pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">
            Catálogo da loja
          </span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">
            Produtos
          </h1>
        </div>
        <Link
          href="/produtos/novo"
          aria-label="Novo produto"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-[22px]" strokeWidth={2.4} />
        </Link>
      </header>

      <label className="flex h-[46px] items-center gap-2.5 rounded-[14px] border bg-card px-3.5 text-muted-foreground">
        <Search className="size-[18px] shrink-0" />
        <span className="sr-only">Buscar produto</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título"
          className="h-full min-w-0 grow bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div role="tablist" aria-label="Tipo" className="flex gap-1 rounded-[14px] border bg-card p-1">
        {filters.map((f) => {
          const selected = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setFilter(f.id)}
              className={cn(
                "h-9 grow rounded-[10px] text-sm transition-colors",
                selected
                  ? "bg-muted font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {f.label}{" "}
              <span className="font-medium text-muted-foreground">{counts[f.id]}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState filter={filter} searching={!!q} />
      ) : (
        <>
          <section
            aria-label="Resumo do estoque"
            className="grid grid-cols-3 divide-x rounded-[20px] border bg-card px-1 py-4"
          >
            <Stat value={totals.stock} label="em estoque" />
            <Stat value={totals.sold} label={totals.sold === 1 ? "vendido" : "vendidos"} />
            <Stat value={totals.inCart} label="no carrinho" />
          </section>

          <section aria-label="Lista de produtos" className="flex flex-col gap-3">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[22px] font-extrabold tracking-tight">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ProductCard({ product: p }: { product: MobileProductItem }) {
  const lowStock = !p.isEbook && p.stock !== null && p.stock <= 5
  return (
    <Link
      href={`/produtos/${p.id}`}
      className="flex gap-3.5 rounded-[20px] border bg-card p-3 active:scale-[0.99]"
    >
      <ProductCover url={p.coverUrl} title={p.title} className="h-[106px] w-[76px]" />
      <span className="flex min-w-0 grow flex-col gap-2 pt-0.5">
        <span className="flex gap-1.5">
          {p.isMain && (
            <span className="flex h-[22px] items-center gap-1 rounded-full bg-primary/15 px-2 text-[11px] font-bold text-primary">
              <Star className="size-[11px] fill-current" />
              Principal
            </span>
          )}
          <span className="flex h-[22px] items-center rounded-full bg-muted px-2 text-[11px] font-semibold text-foreground/80">
            {p.isEbook ? "E-book" : "Físico"}
          </span>
        </span>
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.title}</span>
        <span className="mt-auto flex items-baseline gap-2">
          <span className="text-[17px] font-extrabold tracking-tight whitespace-nowrap">
            {formatBRL(finalPrice(p.price, p.discount))}
          </span>
          {p.discount > 0 && (
            <span className="text-[13px] whitespace-nowrap text-muted-foreground line-through">
              {formatBRL(p.price)}
            </span>
          )}
          <span className="grow" />
          {!p.isEbook && (
            <span className="text-[13px] whitespace-nowrap text-muted-foreground">
              <span className={cn("font-bold text-foreground", lowStock && "text-destructive")}>
                {p.stock ?? 0}
              </span>{" "}
              unid.
            </span>
          )}
        </span>
      </span>
    </Link>
  )
}

/** Capa do livro; sem foto, um bloco com a primeira letra do título. */
export function ProductCover({
  url,
  title,
  className,
}: {
  url: string | null
  title: string
  className?: string
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imagens do Supabase Storage, como no resto do painel
      <img
        src={url}
        alt=""
        loading="lazy"
        className={cn("shrink-0 rounded-lg bg-muted object-cover shadow-md", className)}
      />
    )
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-lg font-bold text-primary",
        className,
      )}
    >
      {title.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function EmptyState({ filter, searching }: { filter: FilterId; searching: boolean }) {
  if (searching) {
    return (
      <p className="rounded-[20px] border bg-card p-5 text-center text-sm text-muted-foreground">
        Nenhum produto com esse título.
      </p>
    )
  }
  const ebook = filter === "ebooks"
  return (
    <section className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed bg-card px-6 py-11 text-center">
      <span className="flex size-14 items-center justify-center rounded-[18px] bg-primary/15 text-primary">
        <TabletSmartphone className="size-[26px]" strokeWidth={1.8} />
      </span>
      <span className="text-[17px] font-bold">
        {ebook ? "Nenhum e-book ainda" : "Nenhum produto ainda"}
      </span>
      {ebook && (
        <span className="text-sm leading-relaxed text-muted-foreground">
          E-books não têm frete. O cliente recebe o arquivo depois do pagamento.
        </span>
      )}
      <Link
        href="/produtos/novo"
        className="mt-1.5 flex h-[46px] items-center rounded-[14px] bg-primary px-5 text-[15px] font-bold text-primary-foreground"
      >
        {ebook ? "Criar e-book" : "Criar produto"}
      </Link>
    </section>
  )
}
