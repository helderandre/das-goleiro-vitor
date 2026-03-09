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

  const [{ data: images }, { data: analyticsData }] = await Promise.all([
    supabase
      .from("product_images")
      .select("id, image_url, is_cover")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("v_product_analytics")
      .select("*")
      .eq("product_id", id)
      .single(),
  ])

  const analytics = analyticsData
    ? {
        addToCart: Number(analyticsData.total_add_to_cart ?? 0),
        removeFromCart: Number(analyticsData.total_remove_from_cart ?? 0),
        checkoutStarted: Number(analyticsData.total_checkout_started ?? 0),
        checkoutCompleted: Number(analyticsData.total_checkout_completed ?? 0),
        abandoned: Number(analyticsData.abandoned_carts ?? 0),
        uniqueAddToCart: Number(analyticsData.unique_add_to_cart ?? 0),
        uniqueCheckoutStarted: Number(analyticsData.unique_checkout_started ?? 0),
        uniqueCheckoutCompleted: Number(analyticsData.unique_checkout_completed ?? 0),
      }
    : undefined

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
      analytics={analytics}
    />
  )
}
