"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function createEvent(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const eventType = formData.get("event_type") as string
  const locationType = formData.get("location_type") as string
  const locationName = formData.get("location_name") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const externalLink = formData.get("external_link") as string
  const contactName = formData.get("contact_name") as string
  const contactPhone = formData.get("contact_phone") as string
  const status = formData.get("status") as string

  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      description: description || null,
      event_type: eventType,
      location_type: locationType,
      location_name: locationName || null,
      city: city || null,
      state: state || null,
      start_date: startDate,
      end_date: endDate || null,
      external_link: externalLink || null,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      status,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Handle cover upload
  const cover = formData.get("cover") as File
  if (cover && cover.size > 0) {
    const ext = cover.name.split(".").pop()
    const path = `events/${data.id}/cover.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("blog")
      .upload(path, cover, { contentType: cover.type })

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("blog").getPublicUrl(path)
      await supabase
        .from("events")
        .update({ cover_url: urlData.publicUrl })
        .eq("id", data.id)
    }
  }

  revalidatePath("/agenda")
  redirect("/agenda")
}

export async function updateEvent(id: string, formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const eventType = formData.get("event_type") as string
  const locationType = formData.get("location_type") as string
  const locationName = formData.get("location_name") as string
  const city = formData.get("city") as string
  const state = formData.get("state") as string
  const startDate = formData.get("start_date") as string
  const endDate = formData.get("end_date") as string
  const externalLink = formData.get("external_link") as string
  const contactName = formData.get("contact_name") as string
  const contactPhone = formData.get("contact_phone") as string
  const status = formData.get("status") as string

  const { error } = await supabase
    .from("events")
    .update({
      title,
      description: description || null,
      event_type: eventType,
      location_type: locationType,
      location_name: locationName || null,
      city: city || null,
      state: state || null,
      start_date: startDate,
      end_date: endDate || null,
      external_link: externalLink || null,
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      status,
    })
    .eq("id", id)

  if (error) return { error: error.message }

  // Handle cover upload
  const cover = formData.get("cover") as File
  if (cover && cover.size > 0) {
    const ext = cover.name.split(".").pop()
    const path = `events/${id}/cover.${ext}`

    await supabase.storage.from("blog").upload(path, cover, {
      contentType: cover.type,
      upsert: true,
    })

    const { data: urlData } = supabase.storage.from("blog").getPublicUrl(path)
    await supabase
      .from("events")
      .update({ cover_url: `${urlData.publicUrl}?t=${Date.now()}` })
      .eq("id", id)
  }

  revalidatePath("/agenda")
  redirect("/agenda")
}

export async function deleteEvent(id: string) {
  const supabase = await createClient()

  // Remove cover from storage
  const { data: event } = await supabase
    .from("events")
    .select("cover_url")
    .eq("id", id)
    .single()

  if (event?.cover_url) {
    const match = event.cover_url.match(/blog\/(.+?)(\?|$)/)
    if (match) {
      await supabase.storage.from("blog").remove([match[1]])
    }
  }

  const { error } = await supabase.from("events").delete().eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/agenda")
  return { success: true }
}
