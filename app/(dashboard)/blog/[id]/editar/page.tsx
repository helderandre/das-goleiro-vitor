import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BlogPostEditor } from "./blog-post-editor"

export default async function EditarPostPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single()

  if (!post) notFound()

  const { data: images } = await supabase
    .from("blog_images")
    .select("*")
    .eq("post_id", id)
    .order("created_at", { ascending: false })

  return (
    <BlogPostEditor
      post={post}
      images={
        images?.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          file_name: img.file_name,
          file_size: img.file_size,
          is_used: img.is_used,
          created_at: img.created_at,
        })) ?? []
      }
    />
  )
}
