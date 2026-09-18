"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  CircleX,
  Copy,
  CreditCard,
  Loader2,
  Minus,
  Package,
  PenLine,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/motion"
import {
  deleteProduct,
  updateProductStock,
} from "@/app/(dashboard)/produtos/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "../format"
import { finalPrice } from "./product-utils"
import { ProductCover } from "./product-list"

export interface MobileProductDetailProps {
  product: {
    id: string
    title: string
    slug: string
    description: string | null
    price: number
    discount: number
    stock: number
    isMain: boolean
    isEbook: boolean
    weight: number | null
    height: number | null
    width: number | null
    length: number | null
  }
  images: string[]
  stats: { inCart: number; checkouts: number; sold: number; abandoned: number }
  /** Itens de pedido que usam o produto; > 0 impede excluir. */
  orderItemsCount: number
}

function formatNumber(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
}

export function MobileProductDetail({
  product: p,
  images,
  stats,
  orderItemsCount,
}: MobileProductDetailProps) {
  const [stockOpen, setStockOpen] = React.useState(false)
  const [stockDraft, setStockDraft] = React.useState(p.stock)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  function openStock(startAt: number) {
    setStockDraft(startAt)
    setStockOpen(true)
  }

  const hasDims = p.weight && p.height && p.width && p.length

  async function copySlug() {
    try {
      await navigator.clipboard.writeText(p.slug)
      toast.success("Endereço copiado")
    } catch {
      toast.error("Não foi possível copiar")
    }
  }

  return (
    <div className="-mx-4 -mt-[max(1rem,env(safe-area-inset-top))] flex flex-col md:mx-0 md:mt-0">
      <Gallery images={images} title={p.title} />

      <div className="flex flex-col gap-[26px] px-5 pt-[22px] md:px-0">
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {p.isMain && (
              <span className="flex h-6 items-center gap-1 rounded-full bg-primary/15 px-2.5 text-xs font-bold text-primary">
                <Star className="size-3 fill-current" />
                Principal
              </span>
            )}
            <span className="flex h-6 items-center rounded-full bg-muted px-2.5 text-xs font-semibold text-foreground/80">
              {p.isEbook ? "E-book" : "Livro físico"}
            </span>
          </div>
          <h1 className="text-[25px] leading-tight font-extrabold tracking-tight">{p.title}</h1>
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[32px] font-extrabold tracking-tight">
              {formatBRL(finalPrice(p.price, p.discount))}
            </span>
            {p.discount > 0 && (
              <>
                <span className="text-[15px] text-muted-foreground line-through">
                  {formatBRL(p.price)}
                </span>
                <span className="flex h-[22px] items-center self-center rounded-full bg-destructive/15 px-2 text-xs font-bold text-destructive">
                  {p.discount}% off
                </span>
              </>
            )}
          </div>
        </div>

        {!p.isEbook && (
          <button
            type="button"
            onClick={() => openStock(p.stock)}
            className="flex items-center gap-3.5 rounded-[20px] border bg-card p-3.5 text-left active:scale-[0.99]"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
              <Package className="size-6" strokeWidth={1.8} />
            </span>
            <span className="flex grow flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">Estoque</span>
              <span
                className={cn(
                  "text-xl font-extrabold tracking-tight",
                  p.stock <= 5 && "text-destructive",
                )}
              >
                {p.stock}{" "}
                <span className="text-sm font-medium text-muted-foreground">
                  {p.stock === 1 ? "unidade" : "unidades"}
                </span>
              </span>
            </span>
            <span className="flex h-9 items-center rounded-xl bg-muted px-3.5 text-sm font-semibold">
              Ajustar
            </span>
          </button>
        )}

        <section aria-label="Desempenho" className="flex flex-col gap-3">
          <h2 className="text-[19px] font-bold tracking-tight">Desempenho</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile icon={ShoppingCart} value={stats.inCart} label="adições ao carrinho" />
            <StatTile icon={CreditCard} value={stats.checkouts} label="checkouts iniciados" />
            <StatTile icon={ShoppingBag} value={stats.sold} label={stats.sold === 1 ? "vendido" : "vendidos"} />
            <StatTile icon={CircleX} value={stats.abandoned} label="carrinhos abandonados" />
          </div>
        </section>

        {!p.isEbook && (
          <section aria-label="Envio" className="flex flex-col gap-3">
            <h2 className="text-[19px] font-bold tracking-tight">Envio</h2>
            {hasDims ? (
              <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
                <InfoRow label="Peso" value={`${formatNumber(p.weight!)} kg`} />
                <InfoRow
                  label="Dimensões"
                  value={`${formatNumber(p.width!)} × ${formatNumber(p.length!)} × ${formatNumber(p.height!)} cm`}
                />
              </div>
            ) : (
              <Link
                href={`/produtos/${p.id}/editar`}
                className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5"
              >
                <TriangleAlert className="mt-px size-5 shrink-0 text-destructive" strokeWidth={1.8} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Peso e medidas incompletos</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">
                    Sem eles a cotação de frete sai errada. Toque para preencher.
                  </span>
                </span>
              </Link>
            )}
            <span className="px-1 text-[13px] leading-snug text-muted-foreground">
              Usados na cotação de frete do Melhor Envio no checkout.
            </span>
          </section>
        )}

        {p.description && (
          <section aria-label="Descrição" className="flex flex-col gap-2.5">
            <h2 className="text-[19px] font-bold tracking-tight">Descrição</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">
              {p.description}
            </p>
          </section>
        )}

        <section
          aria-label="Endereço na loja"
          className="flex items-center gap-3 rounded-[18px] border bg-card py-3.5 pr-3.5 pl-4"
        >
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Endereço na loja
            </span>
            <span className="truncate font-mono text-[13px] font-medium">{p.slug}</span>
          </span>
          <button
            type="button"
            onClick={copySlug}
            aria-label="Copiar endereço do produto"
            className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border bg-muted/60 active:scale-95"
          >
            <Copy className="size-[18px]" strokeWidth={1.8} />
          </button>
        </section>

        <div className="flex gap-2.5 pb-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Excluir produto"
            className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border bg-card text-destructive"
          >
            <Trash2 className="size-5" strokeWidth={1.8} />
          </button>
          <Link
            href={`/produtos/${p.id}/editar`}
            className="flex h-[54px] grow items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground"
          >
            <PenLine className="size-[18px]" />
            Editar produto
          </Link>
        </div>
      </div>

      <StockSheet
        open={stockOpen}
        onOpenChange={setStockOpen}
        productId={p.id}
        title={p.title}
        current={p.stock}
        value={stockDraft}
        onValueChange={setStockDraft}
      />
      <DeleteSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        productId={p.id}
        title={p.title}
        orderItemsCount={orderItemsCount}
        onZeroStock={() => {
          setDeleteOpen(false)
          openStock(0)
        }}
      />
    </div>
  )
}

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = React.useState(0)
  const scroller = React.useRef<HTMLDivElement>(null)

  function onScroll() {
    const el = scroller.current
    if (!el) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  function goTo(i: number) {
    const el = scroller.current
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }

  return (
    <section
      aria-label="Fotos"
      className="relative flex flex-col items-center gap-3 rounded-b-[32px] bg-card pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-4 md:rounded-[32px]"
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
      >
        {(images.length ? images : [null]).map((url, i) => (
          <div key={url ?? i} className="flex w-full shrink-0 snap-center justify-center pb-3">
            <ProductCover
              url={url}
              title={title}
              className="h-[325px] w-[232px] rounded-[10px] text-5xl shadow-2xl shadow-black/50"
            />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div role="tablist" aria-label="Fotos do produto" className="flex gap-1">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Foto ${i + 1}`}
              onClick={() => goTo(i)}
              className="flex size-7 items-center justify-center"
            >
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-[18px] bg-primary" : "w-1.5 bg-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
      <Link
        href="/produtos"
        aria-label="Voltar para produtos"
        className="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 flex size-11 items-center justify-center rounded-full border bg-background/70 backdrop-blur"
      >
        <ChevronLeft className="size-[22px]" />
      </Link>
    </section>
  )
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  value: number
  label: string
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border bg-card p-3.5">
      <Icon className="size-[18px] text-muted-foreground" strokeWidth={1.8} />
      <span className="flex flex-col">
        <AnimatedNumber value={value} className="text-2xl font-extrabold" />
        <span className="text-[13px] leading-tight text-muted-foreground">{label}</span>
      </span>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-[15px] text-[15px]">
      <span className="text-foreground/80">{label}</span>
      <span className="font-semibold whitespace-nowrap">{value}</span>
    </div>
  )
}

function StockSheet({
  open,
  onOpenChange,
  productId,
  title,
  current,
  value,
  onValueChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  title: string
  current: number
  /** Valor em edição; quem abre a sheet define o ponto de partida. */
  value: number
  onValueChange: (value: number) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const set = (v: number) => onValueChange(Math.max(0, v))
  const delta = value - current

  function save() {
    startTransition(async () => {
      const result = await updateProductStock(productId, value)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Estoque atualizado")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">
            Ajustar estoque
          </DrawerTitle>
          <DrawerDescription className="truncate text-sm">{title}</DrawerDescription>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[22px] bg-muted/60 p-[18px]">
          <button
            type="button"
            aria-label="Diminuir"
            onClick={() => set(value - 1)}
            className="flex size-[60px] shrink-0 items-center justify-center rounded-[20px] border bg-card active:scale-95"
          >
            <Minus className="size-6" strokeWidth={2.2} />
          </button>
          <span className="flex flex-col items-center gap-0.5">
            <span aria-live="polite" className="text-[52px] leading-none font-extrabold tracking-tighter">
              {value}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {delta === 0
                ? "unidades agora"
                : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} em relação a ${current}`}
            </span>
          </span>
          <button
            type="button"
            aria-label="Aumentar"
            onClick={() => set(value + 1)}
            className="flex size-[60px] shrink-0 items-center justify-center rounded-[20px] bg-primary text-primary-foreground active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "+10", run: () => set(value + 10) },
            { label: "+50", run: () => set(value + 50) },
            { label: "−10", run: () => set(value - 10) },
            { label: "Zerar", run: () => set(0) },
          ].map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={q.run}
              className="h-11 rounded-[14px] border bg-muted/60 text-sm font-semibold text-foreground/85"
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={save}
            disabled={isPending || delta === 0}
            className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar estoque
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[50px] rounded-2xl text-base font-semibold text-foreground/80"
          >
            Cancelar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function DeleteSheet({
  open,
  onOpenChange,
  productId,
  title,
  orderItemsCount,
  onZeroStock,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  title: string
  orderItemsCount: number
  onZeroStock: () => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const blocked = orderItemsCount > 0

  function remove() {
    startTransition(async () => {
      const result = await deleteProduct(productId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Produto excluído")
      onOpenChange(false)
      router.push("/produtos")
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-3 pt-5 text-center">
          <span className="flex size-[60px] items-center justify-center rounded-[20px] bg-destructive/15 text-destructive">
            {blocked ? (
              <TriangleAlert className="size-7" strokeWidth={1.8} />
            ) : (
              <Trash2 className="size-7" strokeWidth={1.8} />
            )}
          </span>
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">
            {blocked ? "Este livro não pode ser excluído" : "Excluir este produto?"}
          </DrawerTitle>
          <DrawerDescription className="text-[15px] leading-normal text-foreground/85">
            {blocked ? (
              <>
                <strong className="text-foreground">{title}</strong> aparece em{" "}
                {orderItemsCount === 1 ? "1 pedido" : `${orderItemsCount} pedidos`}, e o
                histórico de vendas precisa dele. Para tirar da loja, zere o estoque.
              </>
            ) : (
              <>
                <strong className="text-foreground">{title}</strong> e as fotos saem do
                catálogo e dos carrinhos. Não dá para desfazer.
              </>
            )}
          </DrawerDescription>
        </div>

        <div className="flex flex-col gap-2.5">
          {blocked ? (
            <button
              type="button"
              onClick={onZeroStock}
              className="h-[54px] rounded-2xl bg-primary text-base font-bold text-primary-foreground"
            >
              Zerar estoque
            </button>
          ) : (
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-destructive text-base font-bold text-white disabled:opacity-60"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Excluir produto
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[50px] rounded-2xl border bg-muted/60 text-base font-semibold"
          >
            Voltar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
