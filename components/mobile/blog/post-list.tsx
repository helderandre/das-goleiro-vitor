"use client"

import * as React from "react"
import Link from "next/link"
import { ImageIcon, Loader2, PenLine, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { createPost } from "@/app/(dashboard)/blog/actions"

export interface MobilePostItem {
  id: string
  title: string
  excerpt: string | null
  coverUrl: string | null
  published: boolean
  /** "Esporte · 12 set" ou "Rascunho · criado 17 set" */
  meta: string
}

export function MobilePostList({ posts }: { posts: MobilePostItem[] }) {
  const [tab, setTab] = React.useState<"todos" | "publicados" | "rascunhos">("todos")
  const [creating, startCreating] = React.useTransition()
  const newPost = () => startCreating(async () => void (await createPost()))

  const published = posts.filter((p) => p.published).length
  const drafts = posts.length - published
  const visible = posts.filter((p) => (tab === "todos" ? true : tab === "publicados" ? p.published : !p.published))

  return (
    <div className="flex flex-col gap-5 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">
            {posts.length === 0
              ? "Nenhum post ainda"
              : `${published} ${published === 1 ? "publicado" : "publicados"} · ${drafts} ${drafts === 1 ? "rascunho" : "rascunhos"}`}
          </span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Blog</h1>
        </div>
        <button
          type="button"
          onClick={newPost}
          disabled={creating}
          aria-label="Novo post"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95 disabled:opacity-60"
        >
          {creating ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-[22px]" strokeWidth={2.4} />}
        </button>
      </header>

      {posts.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed bg-card px-6 py-12 text-center">
          <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-primary/15 text-primary">
            <PenLine className="size-[26px]" strokeWidth={1.8} />
          </span>
          <span className="text-lg font-bold">Nenhum post ainda</span>
          <span className="text-sm leading-relaxed text-muted-foreground">
            Escreva o primeiro direto do celular. Ele fica como rascunho até você publicar.
          </span>
          <button
            type="button"
            onClick={newPost}
            disabled={creating}
            className="mt-1.5 flex h-12 items-center gap-2 rounded-[14px] bg-primary px-[22px] text-[15px] font-bold text-primary-foreground disabled:opacity-60"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            Escrever post
          </button>
        </section>
      ) : (
        <>
          <div role="tablist" aria-label="Status" className="flex gap-1 rounded-[14px] border bg-card p-1">
            {(
              [
                { id: "todos", label: "Todos", count: posts.length },
                { id: "publicados", label: "Publicados", count: published },
                { id: "rascunhos", label: "Rascunhos", count: drafts },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn("h-9 grow rounded-[10px] text-sm", tab === t.id ? "bg-muted font-semibold" : "font-medium text-muted-foreground")}
              >
                {t.label} <span className="font-medium text-muted-foreground">{t.count}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 && (
            <p className="rounded-[20px] border bg-card px-5 py-7 text-center text-sm text-muted-foreground">Nenhum post aqui.</p>
          )}

          {visible.map((p) => (
            <Link key={p.id} href={`/blog/${p.id}/editar`} className="flex flex-col overflow-hidden rounded-[20px] border bg-card active:scale-[0.99]">
              {p.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- capa no Supabase Storage
                <img src={p.coverUrl} alt="" className="aspect-[16/8] w-full object-cover" />
              ) : (
                <span className="flex h-16 items-center justify-center gap-1.5 bg-muted text-[13px] font-semibold text-muted-foreground">
                  <ImageIcon className="size-4" />
                  Sem capa
                </span>
              )}
              <span className="flex flex-col gap-2 px-4 pt-3.5 pb-4">
                <span className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-[22px] items-center rounded-full px-2 text-[11px] font-bold",
                      p.published ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "border border-primary/50 text-primary",
                    )}
                  >
                    {p.published ? "Publicado" : "Rascunho"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{p.meta}</span>
                </span>
                <span className="text-[17px] leading-snug font-bold">{p.title}</span>
                {p.excerpt && <span className="line-clamp-2 text-sm leading-snug text-muted-foreground">{p.excerpt}</span>}
              </span>
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
