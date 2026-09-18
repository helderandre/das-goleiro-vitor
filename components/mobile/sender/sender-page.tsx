"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChevronRight, Loader2, Plus, Star } from "lucide-react"

import { setDefaultSender } from "@/app/(dashboard)/remetente/actions"

export interface MobileSender {
  id: string
  name: string
  line1: string
  line2: string
  cep: string
  documentMasked: string
  phone: string
  isDefault: boolean
}

export function MobileSenderPage({ senders }: { senders: MobileSender[] }) {
  const router = useRouter()
  const [pending, setPending] = React.useState<string | null>(null)
  const current = senders.find((s) => s.isDefault) ?? null
  const others = senders.filter((s) => !s.isDefault)

  async function makeDefault(id: string) {
    setPending(id)
    const result = await setDefaultSender(id)
    setPending(null)
    if (result.error) return toast.error(result.error)
    toast.success("Remetente padrão atualizado")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-[22px] pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted-foreground">Sai nas etiquetas do Melhor Envio</span>
          <h1 className="text-[32px] leading-tight font-extrabold tracking-tight">Remetente</h1>
        </div>
        <Link
          href="/remetente/novo"
          aria-label="Novo remetente"
          className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="size-[22px]" strokeWidth={2.4} />
        </Link>
      </header>

      {current ? (
        <section aria-label="Remetente padrão" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Padrão</h2>
            <span className="text-xs text-muted-foreground">usado em todos os envios</span>
          </div>
          <Link
            href={`/remetente/${current.id}`}
            className="flex flex-col gap-3.5 rounded-[22px] bg-[#F4F1E6] p-[18px] text-[#1C1B16] shadow-xl shadow-black/30"
          >
            <span className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold tracking-[1.5px] text-[#6B6A5E]">REMETENTE</span>
              <span className="flex h-[22px] items-center gap-1 rounded-full bg-[#1C1B16] px-2 text-[11px] font-extrabold text-[#E8B10E]">
                <Star className="size-[11px] fill-current" />
                Padrão
              </span>
            </span>
            <span className="flex flex-col gap-0.5 text-[15px] leading-snug">
              <strong className="text-[17px]">{current.name}</strong>
              <span>{current.line1}</span>
              <span>{current.line2}</span>
              <span className="font-mono font-semibold">CEP {current.cep}</span>
            </span>
            <span className="flex flex-wrap gap-x-3.5 gap-y-1 border-t border-dashed border-[#1C1B16]/25 pt-3 text-xs text-[#4A493F]">
              <span>{current.documentMasked}</span>
              <span>{current.phone}</span>
            </span>
          </Link>
          <span className="px-1 text-[13px] leading-snug text-muted-foreground">
            É o endereço que aparece na etiqueta e para onde os Correios devolvem o pacote se não conseguirem entregar.
          </span>
        </section>
      ) : (
        <p className="rounded-2xl border border-destructive/35 bg-destructive/10 p-4 text-sm">
          Nenhum remetente padrão. Sem ele o Melhor Envio não emite etiqueta.
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">Outros remetentes</h2>
        {others.length > 0 && (
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            {others.map((s) => (
              <div key={s.id} className="flex items-center gap-2 pr-2">
                <Link href={`/remetente/${s.id}`} className="flex min-w-0 grow items-center gap-3 py-3 pl-4">
                  <span className="flex min-w-0 grow flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{s.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{s.line2}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
                <button
                  type="button"
                  onClick={() => makeDefault(s.id)}
                  disabled={!!pending}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-muted px-3 text-[13px] font-semibold disabled:opacity-60"
                >
                  {pending === s.id && <Loader2 className="size-3.5 animate-spin" />}
                  Usar este
                </button>
              </div>
            ))}
          </div>
        )}
        <Link
          href="/remetente/novo"
          className="flex items-center gap-3.5 rounded-[20px] border-[1.5px] border-dashed border-primary/45 bg-primary/5 p-4"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
            <Plus className="size-[21px]" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">Adicionar outro endereço</span>
            <span className="text-[13px] text-muted-foreground">Ex.: enviar de outra cidade durante uma viagem</span>
          </span>
        </Link>
      </section>
    </div>
  )
}
