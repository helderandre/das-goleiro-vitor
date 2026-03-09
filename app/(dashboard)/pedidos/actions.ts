"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function updateOrderStatus(orderId: string, status: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${orderId}`)
  return { success: true }
}

export async function updateTrackingCode(orderId: string, trackingCode: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({ tracking_code: trackingCode || null })
    .eq("id", orderId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${orderId}`)
  return { success: true }
}

export async function uploadPaymentProof(orderId: string, formData: FormData) {
  const supabase = await createClient()
  const file = formData.get("file") as File

  if (!file) {
    return { error: "Nenhum arquivo selecionado" }
  }

  const ext = file.name.split(".").pop()
  const filePath = `${orderId}/comprovante.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("payment-proofs")
    .upload(filePath, file, { upsert: true })

  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from("payment-proofs")
    .getPublicUrl(filePath)

  const { error: updateError } = await supabase
    .from("orders")
    .update({ payment_proof_url: urlData.publicUrl })
    .eq("id", orderId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/pedidos/${orderId}`)
  return { success: true, url: urlData.publicUrl }
}

export async function removePaymentProof(orderId: string) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("payment_proof_url")
    .eq("id", orderId)
    .single()

  if (order?.payment_proof_url) {
    const path = order.payment_proof_url.split("/payment-proofs/").pop()
    if (path) {
      await supabase.storage.from("payment-proofs").remove([decodeURIComponent(path)])
    }
  }

  const { error } = await supabase
    .from("orders")
    .update({ payment_proof_url: null })
    .eq("id", orderId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/pedidos/${orderId}`)
  return { success: true }
}
