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

export async function createPost() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: "Novo Post",
      slug: `novo-post-${Date.now()}`,
      status: "draft",
      author_id: user?.id,
      content: "",
      categories: [],
    })
    .select("id")
    .single()

  if (error) {
    return { error: error.message }
  }

  redirect(`/blog/${data.id}/editar`)
}

export async function updatePost(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const excerpt = formData.get("excerpt") as string
  const content = formData.get("content") as string
  const categoriesRaw = formData.get("categories") as string
  const categories = categoriesRaw
    ? categoriesRaw.split(",").map((c) => c.trim()).filter(Boolean)
    : []

  const slug = slugify(title)

  const { error } = await supabase
    .from("blog_posts")
    .update({
      title,
      slug,
      excerpt,
      content,
      categories,
    })
    .eq("id", id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/blog")
  revalidatePath(`/blog/${id}/editar`)
  return { success: true }
}

export async function publishPost(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("blog_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/blog")
  revalidatePath(`/blog/${id}/editar`)
  return { success: true }
}

export async function unpublishPost(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("blog_posts")
    .update({
      status: "draft",
      published_at: null,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/blog")
  revalidatePath(`/blog/${id}/editar`)
  return { success: true }
}

export async function deletePost(id: string) {
  const supabase = await createClient()

  // Get all images for this post
  const { data: images } = await supabase
    .from("blog_images")
    .select("storage_path")
    .eq("post_id", id)

  // Delete from storage
  if (images && images.length > 0) {
    const paths = images.map((img) => img.storage_path)
    await supabase.storage.from("blog").remove(paths)
  }

  // Delete cover from storage if it exists
  const { data: post } = await supabase
    .from("blog_posts")
    .select("cover_url")
    .eq("id", id)
    .single()

  if (post?.cover_url) {
    const match = post.cover_url.match(/blog\/(.+)$/)
    if (match) {
      await supabase.storage.from("blog").remove([match[1]])
    }
  }

  // blog_images cascade deletes with the post
  const { error } = await supabase.from("blog_posts").delete().eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/blog")
  return { success: true }
}

export async function uploadCoverImage(postId: string, formData: FormData) {
  const supabase = await createClient()

  const file = formData.get("cover") as File
  if (!file || file.size === 0) return { error: "Nenhum arquivo selecionado" }

  const ext = file.name.split(".").pop()
  const path = `${postId}/cover.${ext}`

  // Remove old cover if exists
  const { data: post } = await supabase
    .from("blog_posts")
    .select("cover_url")
    .eq("id", postId)
    .single()

  if (post?.cover_url) {
    const match = post.cover_url.match(/blog\/(.+)$/)
    if (match) {
      await supabase.storage.from("blog").remove([match[1]])
    }
  }

  const { error: uploadError } = await supabase.storage
    .from("blog")
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from("blog").getPublicUrl(path)

  const coverUrl = `${publicUrl}?t=${Date.now()}`

  await supabase
    .from("blog_posts")
    .update({ cover_url: coverUrl })
    .eq("id", postId)

  revalidatePath(`/blog/${postId}/editar`)
  return { success: true, url: coverUrl }
}

export async function removeCoverImage(postId: string) {
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("blog_posts")
    .select("cover_url")
    .eq("id", postId)
    .single()

  if (post?.cover_url) {
    const match = post.cover_url.match(/blog\/(.+?)(\?|$)/)
    if (match) {
      await supabase.storage.from("blog").remove([match[1]])
    }
  }

  await supabase
    .from("blog_posts")
    .update({ cover_url: null })
    .eq("id", postId)

  revalidatePath(`/blog/${postId}/editar`)
  return { success: true }
}

export async function deleteBlogImage(imageId: string) {
  const supabase = await createClient()

  const { data: image } = await supabase
    .from("blog_images")
    .select("storage_path")
    .eq("id", imageId)
    .single()

  if (image) {
    await supabase.storage.from("blog").remove([image.storage_path])
  }

  await supabase.from("blog_images").delete().eq("id", imageId)

  return { success: true }
}

export async function syncUsedImages(postId: string, content: string) {
  const supabase = await createClient()

  // Get all images for this post
  const { data: images } = await supabase
    .from("blog_images")
    .select("id, image_url")
    .eq("post_id", postId)

  if (!images) return

  // Check which images are actually used in the content
  for (const img of images) {
    const isUsed = content.includes(img.image_url)
    await supabase
      .from("blog_images")
      .update({ is_used: isUsed })
      .eq("id", img.id)
  }
}
