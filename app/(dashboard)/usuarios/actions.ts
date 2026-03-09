"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)

  if (error) return { error: error.message }

  revalidatePath("/usuarios")
  return { success: true }
}
