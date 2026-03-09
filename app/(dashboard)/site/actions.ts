"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateSiteSettings(id: string, formData: FormData) {
  const supabase = await createClient()

  const profileName = formData.get("profile_name") as string
  const profileSubtitle = formData.get("profile_subtitle") as string
  const profileQuote = formData.get("profile_quote") as string
  const socialLinksRaw = formData.get("social_links") as string

  const videoCategory = formData.get("video_category") as string
  const videoTitle = formData.get("video_title") as string
  const videoDuration = formData.get("video_duration") as string
  const videoYoutubeUrl = formData.get("video_youtube_url") as string

  const impactBadge = formData.get("impact_badge") as string
  const impactNumber = formData.get("impact_number") as string
  const impactDescription = formData.get("impact_description") as string

  let socialLinks: { platform: string; url: string; label: string }[] = []
  try {
    socialLinks = JSON.parse(socialLinksRaw || "[]")
  } catch {
    // keep empty array
  }

  const { error } = await supabase
    .from("site_settings")
    .update({
      profile_name: profileName,
      profile_subtitle: profileSubtitle,
      profile_quote: profileQuote,
      social_links: socialLinks,
      video_category: videoCategory,
      video_title: videoTitle,
      video_duration: videoDuration,
      video_youtube_url: videoYoutubeUrl || null,
      impact_badge: impactBadge,
      impact_number: impactNumber,
      impact_description: impactDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { error: error.message }

  // Handle profile image upload
  const profileImage = formData.get("profile_image") as File
  if (profileImage && profileImage.size > 0) {
    const ext = profileImage.name.split(".").pop()
    const path = `site/profile.${ext}`

    await supabase.storage.from("blog").upload(path, profileImage, {
      contentType: profileImage.type,
      upsert: true,
    })

    const { data: urlData } = supabase.storage.from("blog").getPublicUrl(path)
    await supabase
      .from("site_settings")
      .update({ profile_image_url: `${urlData.publicUrl}?t=${Date.now()}` })
      .eq("id", id)
  }

  // Handle video thumbnail upload
  const videoThumbnail = formData.get("video_thumbnail") as File
  if (videoThumbnail && videoThumbnail.size > 0) {
    const ext = videoThumbnail.name.split(".").pop()
    const path = `site/video-thumbnail.${ext}`

    await supabase.storage.from("blog").upload(path, videoThumbnail, {
      contentType: videoThumbnail.type,
      upsert: true,
    })

    const { data: urlData } = supabase.storage.from("blog").getPublicUrl(path)
    await supabase
      .from("site_settings")
      .update({ video_thumbnail_url: `${urlData.publicUrl}?t=${Date.now()}` })
      .eq("id", id)
  }

  revalidatePath("/site")
  return { success: true }
}
