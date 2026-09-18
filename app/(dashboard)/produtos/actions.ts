"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
}

/** Aceita "39,90" e "39.90". Vazio ou inválido → null. */
function parseDecimal(value: FormDataEntryValue | null): number | null {
  if (value === null) return null
  const n = parseFloat(String(value).trim().replace(",", "."))
  return Number.isFinite(n) ? n : null
}

/**
 * Campos do produto presentes no FormData. Campo ausente fica de fora, assim
 * um formulário que não tem peso/medidas (o do desktop) não zera esses dados.
 */
function productFields(formData: FormData) {
  const fields: {
    title?: string
    slug?: string
    description?: string
    price?: number
    product_type?: string
    stock?: number
    discount_percent?: number
    is_main?: boolean
    weight?: number | null
    height?: number | null
    width?: number | null
    length?: number | null
  } = {}

  if (formData.has("title")) {
    const title = (formData.get("title") as string).trim()
    fields.title = title
    fields.slug = slugify(title)
  }
  if (formData.has("description"))
    fields.description = formData.get("description") as string
  if (formData.has("price")) fields.price = parseDecimal(formData.get("price")) ?? 0
  if (formData.has("product_type"))
    fields.product_type = formData.get("product_type") as string
  if (formData.has("stock"))
    fields.stock = parseInt(formData.get("stock") as string) || 0
  if (formData.has("discount_percent"))
    fields.discount_percent = parseInt(formData.get("discount_percent") as string) || 0
  // Checkbox desmarcado não vai no FormData: o form diz que tem o campo.
  if (formData.has("is_main") || formData.has("has_is_main"))
    fields.is_main = formData.get("is_main") === "on"
  for (const key of ["weight", "height", "width", "length"] as const) {
    if (formData.has(key)) fields[key] = parseDecimal(formData.get(key))
  }
  return fields
}

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const fields = productFields(formData)
  if (!fields.title) return { error: "Informe o título do produto." }

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...fields,
      title: fields.title,
      slug: fields.slug!,
      price: fields.price ?? 0,
      is_main: fields.is_main ?? false,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/produtos")
  return { success: true, productId: data.id }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("products")
    .update(productFields(formData))
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/produtos")
  revalidatePath(`/produtos/${id}`)
  return { success: true }
}

export async function updateProductStock(id: string, stock: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("products")
    .update({ stock: Math.max(0, Math.round(stock)) })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/produtos")
  revalidatePath(`/produtos/${id}`)
  return { success: true }
}

export async function uploadProductImage(
  productId: string,
  formData: FormData,
  isCover: boolean,
) {
  const supabase = await createClient()

  const file = formData.get("file") as File
  if (!file || file.size === 0) return { error: "Nenhum arquivo selecionado" }

  const ext = file.name.split(".").pop() ?? "webp"
  const path = `${productId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("products")
    .upload(path, file, { contentType: file.type || "image/webp" })

  if (uploadError) return { error: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from("products").getPublicUrl(path)

  const { data: imageRecord, error: insertError } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: publicUrl,
      is_cover: isCover,
    })
    .select("id, image_url, is_cover")
    .single()

  if (insertError) return { error: insertError.message }

  return { success: true, image: imageRecord }
}

export async function setCoverImage(productId: string, imageId: string) {
  const supabase = await createClient()

  await supabase
    .from("product_images")
    .update({ is_cover: false })
    .eq("product_id", productId)

  await supabase
    .from("product_images")
    .update({ is_cover: true })
    .eq("id", imageId)

  revalidatePath("/produtos")
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  // Check if product has orders
  const { count } = await supabase
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("product_id", id)

  if (count && count > 0) {
    return { error: "Produto possui pedidos vinculados e não pode ser excluído." }
  }

  // Delete images from storage
  const { data: images } = await supabase
    .from("product_images")
    .select("image_url")
    .eq("product_id", id)

  if (images) {
    const paths = images
      .map((img) => {
        const url = img.image_url
        const match = url.match(/products\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      await supabase.storage.from("products").remove(paths)
    }
  }

  // Delete product images records
  await supabase.from("product_images").delete().eq("product_id", id)

  // Delete cart items referencing this product
  await supabase.from("cart_items").delete().eq("product_id", id)

  // Delete the product
  const { error } = await supabase.from("products").delete().eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/produtos")
  return { success: true }
}

export async function deleteProductImage(imageId: string, imageUrl: string) {
  const supabase = await createClient()

  const match = imageUrl.match(/products\/(.+)$/)
  if (match) {
    await supabase.storage.from("products").remove([match[1]])
  }

  await supabase.from("product_images").delete().eq("id", imageId)

  revalidatePath("/produtos")
  return { success: true }
}
