"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
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

export async function createProduct(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const price = parseFloat(formData.get("price") as string)
  const productType = formData.get("product_type") as string
  const stock = parseInt(formData.get("stock") as string) || 0
  const discountPercent = parseInt(formData.get("discount_percent") as string) || 0
  const isMain = formData.get("is_main") === "on"
  const slug = slugify(title)

  const { data, error } = await supabase
    .from("products")
    .insert({
      title,
      slug,
      description,
      price,
      product_type: productType,
      stock,
      discount_percent: discountPercent,
      is_main: isMain,
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  return { success: true, productId: data.id }
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const price = parseFloat(formData.get("price") as string)
  const productType = formData.get("product_type") as string
  const stock = parseInt(formData.get("stock") as string) || 0
  const discountPercent = parseInt(formData.get("discount_percent") as string) || 0
  const isMain = formData.get("is_main") === "on"
  const slug = slugify(title)

  const { error } = await supabase
    .from("products")
    .update({
      title,
      slug,
      description,
      price,
      product_type: productType,
      stock,
      discount_percent: discountPercent,
      is_main: isMain,
    })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/produtos")
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
