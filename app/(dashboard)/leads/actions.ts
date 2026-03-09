"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/leads")
  return { success: true }
}

export async function bulkUpdateLeadStatus(ids: string[], status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .in("id", ids)

  if (error) return { error: error.message }

  revalidatePath("/leads")
  return { success: true }
}

export async function bulkDeleteLeads(ids: string[]) {
  const supabase = await createClient()

  const { error } = await supabase.from("leads").delete().in("id", ids)

  if (error) return { error: error.message }

  revalidatePath("/leads")
  return { success: true }
}

export async function markAsRead(id: string) {
  const supabase = await createClient()

  await supabase
    .from("leads")
    .update({ status: "read" })
    .eq("id", id)
    .eq("status", "new")

  revalidatePath("/leads")
}
