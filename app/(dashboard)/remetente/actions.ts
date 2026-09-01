"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

function readForm(formData: FormData) {
  return {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string).replace(/\D/g, ""),
    email: formData.get("email") as string,
    document: (formData.get("document") as string).replace(/\D/g, ""),
    street: formData.get("street") as string,
    number: formData.get("number") as string,
    complement: (formData.get("complement") as string) || "",
    neighborhood: formData.get("neighborhood") as string,
    city: formData.get("city") as string,
    state: (formData.get("state") as string).toUpperCase(),
    zip_code: (formData.get("zip_code") as string).replace(/\D/g, ""),
    updated_at: new Date().toISOString(),
  }
}

export async function upsertSenderAddress(id: string | null, formData: FormData) {
  const supabase = await createClient()
  const data = readForm(formData)

  if (id) {
    const { error } = await supabase
      .from("sender_addresses")
      .update(data)
      .eq("id", id)

    if (error) return { error: error.message }
  } else {
    // Só vira padrão automaticamente se ainda não existir nenhum remetente.
    const { count } = await supabase
      .from("sender_addresses")
      .select("id", { count: "exact", head: true })

    const { error } = await supabase
      .from("sender_addresses")
      .insert({ ...data, is_default: (count ?? 0) === 0 })

    if (error) return { error: error.message }
  }

  revalidatePath("/remetente")
  revalidatePath("/pedidos", "layout")
  return { success: true }
}

export async function deleteSenderAddress(id: string) {
  const supabase = await createClient()

  const { data: target } = await supabase
    .from("sender_addresses")
    .select("is_default")
    .eq("id", id)
    .single()

  if (target?.is_default) {
    return { error: "Não é possível remover o remetente padrão. Defina outro como padrão primeiro." }
  }

  const { error } = await supabase.from("sender_addresses").delete().eq("id", id)
  if (error) return { error: error.message }

  revalidatePath("/remetente")
  return { success: true }
}

export async function setDefaultSender(id: string) {
  const supabase = await createClient()

  const { error: clearError } = await supabase
    .from("sender_addresses")
    .update({ is_default: false })
    .neq("id", id)

  if (clearError) return { error: clearError.message }

  const { error } = await supabase
    .from("sender_addresses")
    .update({ is_default: true })
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/remetente")
  revalidatePath("/pedidos", "layout")
  return { success: true }
}
