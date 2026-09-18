"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ImagePlus, Info, Loader2, Minus, Plus, Star, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/compress-image"
import {
  createProduct,
  deleteProductImage,
  setCoverImage,
  updateProduct,
  uploadProductImage,
} from "@/app/(dashboard)/produtos/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "../format"
import { decimalInput, finalPrice } from "./product-utils"

interface SavedImage {
  id: string
  url: string
  isCover: boolean
}

/** Foto escolhida no Novo produto, ainda não enviada. */
interface PendingImage {
  key: string
  file: File
  url: string
}

type Photo =
  | { kind: "saved"; key: string; url: string; isCover: boolean; image: SavedImage }
  | { kind: "pending"; key: string; url: string; isCover: boolean; image: PendingImage }

export interface MobileProductFormProps {
  product?: {
    id: string
    title: string
    description: string | null
    price: number
    productType: string | null
    stock: number | null
    discount: number
    isMain: boolean
    weight: number | null
    height: number | null
    width: number | null
    length: number | null
  }
  images?: SavedImage[]
}

const DISCOUNTS = [0, 5, 10, 15, 20]

export function MobileProductForm({ product, images = [] }: MobileProductFormProps) {
  const router = useRouter()
  const isEditing = !!product
  const [isPending, startTransition] = React.useTransition()
  const [status, setStatus] = React.useState<string | null>(null)

  const [title, setTitle] = React.useState(product?.title ?? "")
  const [description, setDescription] = React.useState(product?.description ?? "")
  const [price, setPrice] = React.useState(product ? decimalInput(product.price) : "")
  const [type, setType] = React.useState(product?.productType === "ebook" ? "ebook" : "physical")
  const [discount, setDiscount] = React.useState(product?.discount ?? 0)
  const [stock, setStock] = React.useState(product?.stock ?? 0)
  const [isMain, setIsMain] = React.useState(product?.isMain ?? false)
  const [dims, setDims] = React.useState({
    weight: decimalInput(product?.weight),
    height: decimalInput(product?.height),
    width: decimalInput(product?.width),
    length: decimalInput(product?.length),
  })

  const [saved, setSaved] = React.useState<SavedImage[]>(images)
  const [pending, setPending] = React.useState<PendingImage[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [sheetPhoto, setSheetPhoto] = React.useState<Photo | null>(null)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const fileInput = React.useRef<HTMLInputElement>(null)

  // Libera as prévias locais ao sair da tela.
  const pendingRef = React.useRef(pending)
  React.useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  React.useEffect(
    () => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.url)),
    [],
  )

  const photos: Photo[] = isEditing
    ? [...saved]
        .sort((a, b) => Number(b.isCover) - Number(a.isCover))
        .map((img) => ({ kind: "saved", key: img.id, url: img.url, isCover: img.isCover, image: img }))
    : pending.map((img, i) => ({ kind: "pending", key: img.key, url: img.url, isCover: i === 0, image: img }))

  const priceValue = parseFloat(price.replace(",", "."))
  const valid = title.trim().length > 0 && Number.isFinite(priceValue) && priceValue > 0
  const discounts = DISCOUNTS.includes(discount)
    ? DISCOUNTS
    : [...DISCOUNTS, discount].sort((a, b) => a - b)
  const backHref = isEditing ? `/produtos/${product.id}` : "/produtos"

  async function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length === 0) return

    if (!isEditing) {
      setPending((prev) => [
        ...prev,
        ...files.map((file) => ({
          key: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
        })),
      ])
      return
    }

    setUploading(true)
    let hasCover = saved.some((img) => img.isCover)
    for (const file of files) {
      const fd = new FormData()
      fd.set("file", await compressImage(file))
      const result = await uploadProductImage(product.id, fd, !hasCover)
      if (result.error || !result.image) {
        toast.error(`Erro ao enviar ${file.name}: ${result.error ?? "falhou"}`)
        continue
      }
      hasCover = true
      const img = result.image
      setSaved((prev) => [
        ...prev,
        { id: img.id, url: img.image_url, isCover: img.is_cover ?? false },
      ])
    }
    setUploading(false)
    router.refresh()
  }

  function makeCover(photo: Photo) {
    setSheetOpen(false)
    if (photo.kind === "pending") {
      setPending((prev) => [photo.image, ...prev.filter((p) => p.key !== photo.key)])
      return
    }
    startTransition(async () => {
      await setCoverImage(product!.id, photo.image.id)
      setSaved((prev) => prev.map((img) => ({ ...img, isCover: img.id === photo.image.id })))
      toast.success("Capa definida")
    })
  }

  function removePhoto(photo: Photo) {
    setSheetOpen(false)
    if (photo.kind === "pending") {
      URL.revokeObjectURL(photo.url)
      setPending((prev) => prev.filter((p) => p.key !== photo.key))
      return
    }
    startTransition(async () => {
      await deleteProductImage(photo.image.id, photo.image.url)
      setSaved((prev) => prev.filter((img) => img.id !== photo.image.id))
      toast.success("Foto excluída")
    })
  }

  function buildFormData() {
    const fd = new FormData()
    fd.set("title", title.trim())
    fd.set("description", description)
    fd.set("price", price)
    fd.set("product_type", type)
    fd.set("stock", String(stock))
    fd.set("discount_percent", String(discount))
    fd.set("has_is_main", "1")
    if (isMain) fd.set("is_main", "on")
    if (type === "physical") {
      for (const [key, value] of Object.entries(dims)) fd.set(key, value)
    }
    return fd
  }

  function submit() {
    if (!valid) return
    startTransition(async () => {
      if (isEditing) {
        const result = await updateProduct(product.id, buildFormData())
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success("Produto atualizado")
        router.push(`/produtos/${product.id}`)
        return
      }

      setStatus("Criando produto…")
      const result = await createProduct(buildFormData())
      if (result.error || !result.productId) {
        setStatus(null)
        toast.error(result.error ?? "Não foi possível criar o produto")
        return
      }
      for (let i = 0; i < pending.length; i++) {
        setStatus(`Enviando foto ${i + 1} de ${pending.length}…`)
        const fd = new FormData()
        fd.set("file", await compressImage(pending[i].file))
        const upload = await uploadProductImage(result.productId, fd, i === 0)
        if (upload.error) toast.error(`Foto ${i + 1} não foi enviada: ${upload.error}`)
      }
      toast.success("Produto criado")
      router.push(`/produtos/${result.productId}`)
    })
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(1rem,env(safe-area-inset-top))] grid grid-cols-[96px_minmax(0,1fr)_96px] items-center border-b bg-background/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <Link href={backHref} className="flex h-14 items-center px-3 text-base font-medium text-foreground/80">
          Cancelar
        </Link>
        <h1 className="truncate text-center text-[17px] font-bold">
          {isEditing ? "Editar produto" : "Novo produto"}
        </h1>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || isPending || uploading}
          className="flex h-14 items-center justify-end px-3 text-base font-bold text-primary disabled:text-muted-foreground/60"
        >
          {isPending ? <Loader2 className="size-5 animate-spin" /> : isEditing ? "Salvar" : "Criar"}
        </button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-7 pt-6"
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          onChange={addFiles}
          className="hidden"
        />

        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            className="flex h-[200px] flex-col items-center justify-center gap-2.5 rounded-[22px] border-[1.5px] border-dashed border-primary/50 bg-primary/5"
          >
            <span className="flex size-14 items-center justify-center rounded-[18px] bg-primary/15 text-primary">
              {uploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <ImagePlus className="size-[26px]" strokeWidth={1.8} />
              )}
            </span>
            <span className="text-base font-bold">Adicionar fotos</span>
            <span className="text-[13px] text-muted-foreground">
              Câmera ou galeria · a primeira vira capa
            </span>
          </button>
        ) : (
          <FormSection
            title="Fotos"
            aside={`${photos.length} ${photos.length === 1 ? "foto" : "fotos"}`}
            hint="Toque numa foto para torná-la capa ou excluir."
          >
            <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 [scrollbar-width:none]">
              {photos.map((photo, i) => (
                <button
                  key={photo.key}
                  type="button"
                  aria-label={photo.isCover ? `Foto ${i + 1}, capa` : `Foto ${i + 1}`}
                  onClick={() => {
                    setSheetPhoto(photo)
                    setSheetOpen(true)
                  }}
                  className={cn(
                    "relative h-[140px] w-[100px] shrink-0 overflow-hidden rounded-xl",
                    photo.isCover ? "border-2 border-primary" : "border",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou Supabase Storage */}
                  <img src={photo.url} alt="" className="size-full object-cover" />
                  {photo.isCover && (
                    <span className="absolute bottom-1.5 left-1.5 flex h-5 items-center rounded-full bg-primary px-[7px] text-[11px] font-bold text-primary-foreground">
                      Capa
                    </span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex h-[140px] w-[100px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-primary/50 bg-primary/5 text-[13px] font-semibold text-primary"
              >
                {uploading ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <ImagePlus className="size-6" strokeWidth={1.8} />
                )}
                {uploading ? "Enviando" : "Adicionar"}
              </button>
            </div>
          </FormSection>
        )}

        <FormSection title="Informações">
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            <label className="flex flex-col gap-1 px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Título</span>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                rows={2}
                placeholder="Ex.: Verdade de Campeão · Vol. 3"
                className="resize-none bg-transparent text-base leading-snug font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/70"
              />
            </label>
            <label className="flex flex-col gap-1 px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">Descrição</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={isEditing ? 6 : 4}
                placeholder="Sobre o que é o livro"
                className="resize-none bg-transparent text-[15px] leading-relaxed text-foreground/85 outline-none placeholder:text-muted-foreground/70"
              />
            </label>
          </div>
        </FormSection>

        <FormSection title="Tipo">
          <div role="radiogroup" aria-label="Tipo de produto" className="grid grid-cols-2 gap-2.5">
            {[
              { id: "physical", label: "Livro físico", hint: "Enviado pelos Correios" },
              { id: "ebook", label: "E-book", hint: "Arquivo digital" },
            ].map((t) => {
              const on = type === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setType(t.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border-[1.5px] p-3.5 text-left",
                    on ? "border-primary bg-primary/10" : "bg-card",
                  )}
                >
                  <span className="text-[15px] font-bold">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.hint}</span>
                </button>
              )
            })}
          </div>
        </FormSection>

        <FormSection
          title="Venda"
          hint={isEditing ? undefined : "Desconto e destaque você ajusta depois, na edição."}
        >
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            <label className="flex min-h-14 items-center gap-3 px-4">
              <span className="grow text-[15px] text-foreground/85">Preço</span>
              <span className="text-[15px] text-muted-foreground">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))}
                placeholder="0,00"
                className="w-24 bg-transparent text-right text-[17px] font-bold outline-none placeholder:text-muted-foreground/70"
              />
            </label>

            {isEditing ? (
              <>
                <div className="flex flex-col gap-2.5 px-4 py-3.5">
                  <span className="text-[15px] text-foreground/85">Desconto</span>
                  <div
                    role="radiogroup"
                    aria-label="Desconto"
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${discounts.length}, minmax(0, 1fr))` }}
                  >
                    {discounts.map((d) => {
                      const on = discount === d
                      return (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setDiscount(d)}
                          className={cn(
                            "h-10 rounded-xl text-sm",
                            on
                              ? "bg-primary font-bold text-primary-foreground"
                              : "border bg-muted/60 font-medium text-foreground/80",
                          )}
                        >
                          {d === 0 ? "Sem" : `${d}%`}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {Number.isFinite(priceValue) && priceValue > 0 && (
                  <div className="flex items-center justify-between gap-3 border-t-primary/20 bg-primary/10 px-4 py-3.5">
                    <span className="text-sm text-foreground/85">Cliente paga</span>
                    <span className="flex items-baseline gap-2">
                      {discount > 0 && (
                        <span className="text-[13px] text-muted-foreground line-through">
                          {formatBRL(priceValue)}
                        </span>
                      )}
                      <span className="text-xl font-extrabold tracking-tight text-primary">
                        {formatBRL(finalPrice(priceValue, discount))}
                      </span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              type === "physical" && (
                <label className="flex min-h-14 items-center gap-3 px-4">
                  <span className="grow text-[15px] text-foreground/85">Estoque inicial</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stock === 0 ? "" : String(stock)}
                    onChange={(e) => setStock(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                    placeholder="0"
                    className="w-20 bg-transparent text-right text-[17px] font-bold outline-none placeholder:text-muted-foreground/70"
                  />
                  <span className="text-[13px] text-muted-foreground">unid.</span>
                </label>
              )
            )}
          </div>
        </FormSection>

        {isEditing && (
          <FormSection title="Estoque e destaque">
            <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
              {type === "physical" && (
                <div className="flex min-h-16 items-center gap-3 pr-3 pl-4">
                  <span className="grow text-[15px] text-foreground/85">Estoque</span>
                  <button
                    type="button"
                    aria-label="Diminuir estoque"
                    onClick={() => setStock((s) => Math.max(0, s - 1))}
                    className="flex size-11 items-center justify-center rounded-[14px] border bg-muted/60 active:scale-95"
                  >
                    <Minus className="size-[18px]" strokeWidth={2.2} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Estoque"
                    value={String(stock)}
                    onChange={(e) => setStock(parseInt(e.target.value.replace(/\D/g, "")) || 0)}
                    className="w-12 bg-transparent text-center text-[19px] font-extrabold outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Aumentar estoque"
                    onClick={() => setStock((s) => s + 1)}
                    className="flex size-11 items-center justify-center rounded-[14px] border bg-muted/60 active:scale-95"
                  >
                    <Plus className="size-[18px]" strokeWidth={2.2} />
                  </button>
                </div>
              )}
              <button
                type="button"
                role="switch"
                aria-checked={isMain}
                onClick={() => setIsMain((v) => !v)}
                className="flex min-h-16 items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className="flex grow flex-col gap-0.5">
                  <span className="text-[15px] text-foreground/85">Produto principal</span>
                  <span className="text-xs text-muted-foreground">Livro em destaque na loja</span>
                </span>
                <span
                  className={cn(
                    "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors",
                    isMain ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-[27px] rounded-full bg-white shadow transition-[left]",
                      isMain ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </span>
              </button>
            </div>
          </FormSection>
        )}

        {type === "physical" ? (
          <FormSection
            title="Envio"
            hint={
              isEditing
                ? "Usados na cotação de frete do Melhor Envio. Pacote maior que o real encarece o frete."
                : "Os volumes atuais usam 0,3 kg e 12 × 17 × 4 cm. Confira antes de criar."
            }
          >
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { key: "weight", label: "Peso", unit: "kg", placeholder: "0,3" },
                  { key: "height", label: "Altura", unit: "cm", placeholder: "4" },
                  { key: "width", label: "Largura", unit: "cm", placeholder: "12" },
                  { key: "length", label: "Comprimento", unit: "cm", placeholder: "17" },
                ] as const
              ).map((f) => (
                <label key={f.key} className="flex flex-col gap-1 rounded-2xl border bg-card px-3.5 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">{f.label}</span>
                  <span className="flex items-baseline gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dims[f.key]}
                      onChange={(e) =>
                        setDims((d) => ({ ...d, [f.key]: e.target.value.replace(/[^\d,.]/g, "") }))
                      }
                      placeholder={f.placeholder}
                      className="w-full min-w-0 bg-transparent text-[17px] font-bold outline-none placeholder:font-medium placeholder:text-muted-foreground/60"
                    />
                    <span className="text-[13px] text-muted-foreground">{f.unit}</span>
                  </span>
                </label>
              ))}
            </div>
          </FormSection>
        ) : (
          <div className="flex gap-3 rounded-2xl border bg-card p-3.5">
            <Info className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <span className="text-[13px] leading-snug text-foreground/85">
              E-book não tem frete: peso e dimensões ficam de fora.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={!valid || isPending || uploading}
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {status ?? (isEditing ? "Salvar alterações" : "Criar produto")}
        </button>
      </form>

      <PhotoSheet
        photo={sheetPhoto}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        index={sheetPhoto ? photos.findIndex((p) => p.key === sheetPhoto.key) : -1}
        total={photos.length}
        onMakeCover={makeCover}
        onRemove={removePhoto}
      />
    </div>
  )
}

function FormSection({
  title,
  aside,
  hint,
  children,
}: {
  title: string
  aside?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </h2>
        {aside && <span className="text-[13px] text-muted-foreground">{aside}</span>}
      </div>
      {children}
      {hint && <span className="px-1 text-[13px] leading-snug text-muted-foreground">{hint}</span>}
    </section>
  )
}

function PhotoSheet({
  photo,
  open,
  onOpenChange,
  index,
  total,
  onMakeCover,
  onRemove,
}: {
  photo: Photo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  index: number
  total: number
  onMakeCover: (photo: Photo) => void
  onRemove: (photo: Photo) => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {photo && (
          <>
            <div className="flex items-center gap-4 pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) ou Supabase Storage */}
              <img
                src={photo.url}
                alt=""
                className="h-[118px] w-[84px] shrink-0 rounded-[10px] object-cover"
              />
              <div className="flex flex-col gap-1">
                <DrawerTitle className="text-xl font-extrabold tracking-tight">
                  Foto {index + 1} de {total}
                </DrawerTitle>
                <DrawerDescription className="text-sm">
                  {photo.isCover ? "Esta é a capa do produto" : "Foto do produto"}
                </DrawerDescription>
              </div>
            </div>

            <div className="flex flex-col divide-y overflow-hidden rounded-[20px] bg-muted/60">
              {!photo.isCover && (
                <button
                  type="button"
                  onClick={() => onMakeCover(photo)}
                  className="flex min-h-16 items-center gap-3.5 px-3.5 py-2.5 text-left active:bg-foreground/5"
                >
                  <span className="flex size-11 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
                    <Star className="size-[21px]" strokeWidth={1.8} />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold">Usar como capa</span>
                    <span className="text-[13px] text-muted-foreground">
                      Aparece na loja e nas listas
                    </span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(photo)}
                className="flex min-h-16 items-center gap-3.5 px-3.5 py-2.5 text-left text-destructive active:bg-foreground/5"
              >
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-destructive/15">
                  <Trash2 className="size-5" strokeWidth={1.8} />
                </span>
                <span className="text-base font-semibold">Excluir foto</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-[52px] rounded-2xl border bg-muted/60 text-base font-semibold"
            >
              Cancelar
            </button>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
