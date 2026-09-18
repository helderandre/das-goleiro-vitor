import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProductForm } from "@/components/product-form"
import { MobileProductForm } from "@/components/mobile/products/product-form-mobile"

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

  const imageList =
    images?.map((img) => ({
      id: img.id,
      image_url: img.image_url,
      is_cover: img.is_cover ?? false,
    })) ?? []

  // numeric do Postgres chega como string ("0.3").
  const toNumber = (value: number | string | null) =>
    value == null ? null : Number(value)

  return (
    <>
      <div className="md:hidden">
        <MobileProductForm
          product={{
            id: product.id,
            title: product.title,
            description: product.description,
            price: Number(product.price),
            productType: product.product_type,
            stock: product.stock,
            discount: Number(product.discount_percent ?? 0),
            isMain: product.is_main ?? false,
            weight: toNumber(product.weight),
            height: toNumber(product.height),
            width: toNumber(product.width),
            length: toNumber(product.length),
          }}
          images={imageList.map((img) => ({
            id: img.id,
            url: img.image_url,
            isCover: img.is_cover,
          }))}
        />
      </div>
      <div className="hidden md:block">
        <ProductForm product={product} existingImages={imageList} analytics={analytics} />
      </div>
    </>
  )
}
