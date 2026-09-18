"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import { BookOpen, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { ProductCardAttrs } from "./extensions/product-card"

export interface StoreBook {
  slug: string
  title: string
  cover: string | null
  price: string
  oldPrice: string | null
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

/** Livros da loja, para reconhecer um link colado no editor. */
export function useStoreBooks() {
  const [books, setBooks] = React.useState<StoreBook[]>([])
  React.useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from("products").select("id, slug, title, price, discount_percent"),
      supabase.from("product_images").select("product_id, image_url, is_cover"),
    ]).then(([prods, imgs]) => {
      const cover = new Map<string, string>()
      for (const img of imgs.data ?? []) {
        if (img.product_id && (img.is_cover || !cover.has(img.product_id))) cover.set(img.product_id, img.image_url)
      }
      setBooks(
        (prods.data ?? []).map((p) => {
          const price = Number(p.price)
          const discount = Number(p.discount_percent ?? 0)
          return {
            slug: p.slug,
            title: p.title,
            cover: cover.get(p.id) ?? null,
            price: brl(Math.round(price * (1 - discount / 100) * 100) / 100),
            oldPrice: discount > 0 ? brl(price) : null,
          }
        }),
      )
    })
  }, [])
  return books
}

/** O texto colado é um único link que aponta para um livro da loja? */
export function matchBookLink(text: string, books: StoreBook[]) {
  const url = text.trim()
  if (!/^https?:\/\/\S+$/.test(url)) return null
  let path: string
  try {
    path = decodeURIComponent(new URL(url).pathname)
  } catch {
    return null
  }
  // O slug mais longo primeiro: "vol-2-o-setimo…" não pode cair em "vol-2".
  const book = [...books]
    .sort((a, b) => b.slug.length - a.slug.length)
    .find((b) => path.split("/").includes(b.slug))
  return book ? { url, book } : null
}

export type BookLinkMode = "card" | "link" | "button"

export function insertBookLink(editor: Editor, mode: BookLinkMode, url: string, book: StoreBook) {
  const chain = editor.chain().focus()
  if (mode === "card") {
    const attrs: ProductCardAttrs = { slug: book.slug, url, title: book.title, cover: book.cover, price: book.price, oldPrice: book.oldPrice }
    chain.setProductCard(attrs).run()
  } else if (mode === "button") {
    chain.setButtonBlock({ label: "Comprar o livro", url, variant: "primary", linkType: "product", refSlug: book.slug }).run()
  } else {
    chain.insertContent({ type: "text", text: book.title, marks: [{ type: "link", attrs: { href: url } }] }).run()
  }
}

/** "Link de um livro da loja. Mostrar como: Cartão · Link · Botão". */
export function BookLinkChooser({
  book,
  onPick,
  onDismiss,
  floating,
}: {
  book: StoreBook
  onPick: (mode: BookLinkMode) => void
  onDismiss: () => void
  /** No mobile fica fixo acima da barra; no desktop, no fluxo da página. */
  floating?: boolean
}) {
  return (
    <div
      role="dialog"
      aria-label="Como mostrar o link do livro"
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "flex flex-col gap-2.5 rounded-[18px] border bg-card p-3 shadow-xl",
        floating && "fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50",
      )}
    >
      <div className="flex items-start gap-2.5">
        <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" />
        <span className="grow text-[13px] leading-snug">
          Link de <strong>{book.title}</strong>. Mostrar como:
        </span>
        <button type="button" aria-label="Fechar e manter como link" onClick={onDismiss} className="-m-1 flex size-8 items-center justify-center rounded-lg text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { mode: "card", label: "Cartão" },
            { mode: "link", label: "Link" },
            { mode: "button", label: "Botão" },
          ] as const
        ).map((o, i) => (
          <button
            key={o.mode}
            type="button"
            onClick={() => onPick(o.mode)}
            className={cn(
              "h-10 rounded-xl text-sm",
              i === 0 ? "bg-primary font-bold text-primary-foreground" : "border bg-muted/60 font-semibold",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
