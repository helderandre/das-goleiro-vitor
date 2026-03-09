import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "@/components/product-form"

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single()

  if (!product) {
    notFound()
  }

  const { data: images } = await supabase
    .from("product_images")
    .select("id, image_url, is_cover")
    .eq("product_id", id)
    .order("created_at", { ascending: true })

  return (
    <ProductForm
      product={product}
      existingImages={
        images?.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          is_cover: img.is_cover ?? false,
        })) ?? []
      }
    />
  )
}
