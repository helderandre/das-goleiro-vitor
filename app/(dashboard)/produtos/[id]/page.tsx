import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MobileProductDetail } from "@/components/mobile/products/product-detail"

/** numeric do Postgres chega como string ("0.3"). */
function toNumber(value: number | string | null) {
  return value == null ? null : Number(value)
}

export default async function ProdutoPage({
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

  if (!product) notFound()

  const [{ data: images }, { data: analytics }, { data: soldItems }, { count: orderItemsCount }] =
    await Promise.all([
      supabase
        .from("product_images")
        .select("id, image_url, is_cover")
        .eq("product_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("v_product_analytics")
        .select("total_add_to_cart, total_checkout_started, abandoned_carts")
        .eq("product_id", id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("quantity, orders!inner(status)")
        .eq("product_id", id)
        .in("orders.status", ["paid", "shipped", "delivered"]),
      // Mesma regra do deleteProduct: qualquer pedido, em qualquer status, trava a exclusão.
      supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("product_id", id),
    ])

  // Capa primeiro, as demais na ordem de envio.
  const sortedImages = [...(images ?? [])].sort(
    (a, b) => Number(b.is_cover ?? false) - Number(a.is_cover ?? false),
  )

  return (
    <div className="mx-auto w-full max-w-md">
      <MobileProductDetail
        product={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          price: Number(product.price),
          discount: Number(product.discount_percent ?? 0),
          stock: product.stock ?? 0,
          isMain: product.is_main ?? false,
          isEbook: product.product_type === "ebook",
          weight: toNumber(product.weight),
          height: toNumber(product.height),
          width: toNumber(product.width),
          length: toNumber(product.length),
        }}
        images={sortedImages.map((img) => img.image_url)}
        stats={{
          inCart: Number(analytics?.total_add_to_cart ?? 0),
          checkouts: Number(analytics?.total_checkout_started ?? 0),
          sold: (soldItems ?? []).reduce((sum, item) => sum + item.quantity, 0),
          abandoned: Number(analytics?.abandoned_carts ?? 0),
        }}
        orderItemsCount={orderItemsCount ?? 0}
      />
    </div>
  )
}
