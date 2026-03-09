"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUploader } from "@/components/image-uploader"
import { createProduct, updateProduct } from "@/app/(dashboard)/produtos/actions"
import { Loader2, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface ExistingImage {
  id: string
  image_url: string
  is_cover: boolean
}

interface ProductFormProps {
  product?: {
    id: string
    title: string
    description: string | null
    price: number
    product_type: string | null
    stock: number | null
    discount_percent: number | null
    is_main: boolean | null
  }
  existingImages?: ExistingImage[]
}

export function ProductForm({ product, existingImages = [] }: ProductFormProps) {
  const [isPending, startTransition] = useTransition()
  const [productId, setProductId] = useState<string | null>(product?.id ?? null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  const isEditing = !!product

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (isEditing) {
        const result = await updateProduct(product.id, formData)
        if (result?.error) {
          toast.error(result.error)
        } else {
          toast.success("Produto atualizado")
          router.push("/produtos")
        }
      } else {
        const result = await createProduct(formData)
        if (result?.error) {
          toast.error(result.error)
        } else if (result?.productId) {
          setProductId(result.productId)
          toast.success("Produto criado! Agora adicione as imagens.")
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/produtos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informações do produto"
              : productId
                ? "Produto criado! Adicione imagens e finalize."
                : "Preencha os dados do novo produto"}
          </p>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={product?.title}
                  placeholder="Nome do produto"
                  required
                  disabled={!!productId && !isEditing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={product?.description ?? ""}
                  placeholder="Descrição do produto"
                  rows={5}
                  disabled={!!productId && !isEditing}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                productId={productId}
                existingImages={existingImages}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={product?.price}
                  placeholder="0.00"
                  required
                  disabled={!!productId && !isEditing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="product_type">Tipo</Label>
                <Select
                  name="product_type"
                  defaultValue={product?.product_type ?? "physical"}
                  disabled={!!productId && !isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Livro Físico</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={product?.stock ?? 0}
                  disabled={!!productId && !isEditing}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="discount_percent">Desconto (%)</Label>
                <Input
                  id="discount_percent"
                  name="discount_percent"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={product?.discount_percent ?? 0}
                  disabled={!!productId && !isEditing}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="is_main"
                  name="is_main"
                  type="checkbox"
                  defaultChecked={product?.is_main ?? false}
                  className="h-4 w-4 rounded border-input"
                  disabled={!!productId && !isEditing}
                />
                <Label htmlFor="is_main" className="font-normal">
                  Produto Principal (destaque)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                {/* Show save button for editing, or create button if no product yet */}
                {isEditing ? (
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Alterações
                  </Button>
                ) : !productId ? (
                  <Button type="submit" disabled={isPending}>
                    {isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Criar Produto
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => router.push("/produtos")}
                  >
                    Concluir
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/produtos")}
                >
                  {productId && !isEditing ? "Voltar" : "Cancelar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
