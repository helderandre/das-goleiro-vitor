"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient()

  // Ninguém muda o próprio papel: evita um admin se trancar fora do painel.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.id === userId) return { error: "Você não pode mudar o seu próprio acesso." }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId)

  if (error) return { error: error.message }

  revalidatePath("/usuarios")
  revalidatePath(`/usuarios/${userId}`)
  return { success: true }
}
