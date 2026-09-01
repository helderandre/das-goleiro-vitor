"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { callEdgeFunction } from "@/lib/edge-functions"

/** Todas as credenciais em uso são de teste (ver tabela mp_credentials). */
const MP_ENVIRONMENT = "sandbox"

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

// ─────────────────────────────────────────────────────────────────────────────
// Integrações: Mercado Pago e Melhor Envio
//
// A lógica vive nas Supabase Edge Functions (ver docs/edge-functions.md).
// Estas actions apenas montam o payload a partir do banco e repassam a resposta.
// ─────────────────────────────────────────────────────────────────────────────

function revalidateOrder(orderId: string) {
  revalidatePath("/pedidos")
  revalidatePath(`/pedidos/${orderId}`)
}

/** Cria a preferência do Checkout Pro e devolve o link de pagamento. */
export async function createPaymentLink(orderId: string) {
  const result = await callEdgeFunction<{
    preference_id: string
    init_point: string
    sandbox_init_point: string
    checkout_url: string
  }>("mp-create-preference", {
    body: { order_id: orderId, environment: MP_ENVIRONMENT },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao chamar a integração" }

  revalidateOrder(orderId)
  return {
    success: true,
    checkoutUrl: result.data?.checkout_url || result.data?.init_point,
    preferenceId: result.data?.preference_id,
  }
}

/** Gera um pagamento Pix (QR Code + copia-e-cola) para o pedido. */
export async function createPixPayment(orderId: string) {
  const result = await callEdgeFunction<{
    payment_id: number
    status: string
    status_detail: string
    pix_qr_code: string | null
    pix_qr_code_base64: string | null
    pix_ticket_url: string | null
    pix_expiration: string | null
  }>("mp-create-payment", {
    body: { order_id: orderId, payment_method: "pix", environment: MP_ENVIRONMENT },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao chamar a integração" }

  revalidateOrder(orderId)
  return { success: true, payment: result.data }
}

/** Consulta o pagamento no Mercado Pago e sincroniza o pedido. */
export async function checkPaymentStatus(orderId: string) {
  const result = await callEdgeFunction<{
    payment_id: number
    status: string
    status_detail: string
  }>("mp-check-payment", {
    body: { order_id: orderId, environment: MP_ENVIRONMENT },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao chamar a integração" }

  revalidateOrder(orderId)
  return { success: true, payment: result.data }
}

interface QuoteOption {
  id: number
  servico: string
  transportadora: string
  preco: string | number | null
  prazo_dias: number | null
  erro?: string | null
}

/** Cota o frete do pedido usando o CEP do destinatário e o remetente padrão. */
export async function quoteShipping(orderId: string) {
  const supabase = await createClient()

  const [{ data: order }, { data: sender }] = await Promise.all([
    supabase.from("orders").select("shipping_address").eq("id", orderId).single(),
    supabase
      .from("sender_addresses")
      .select("zip_code")
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const address = order?.shipping_address as { zip_code?: string } | null
  if (!address?.zip_code) return { error: "Pedido sem CEP de entrega" }
  if (!sender?.zip_code) return { error: "Cadastre um endereço de remetente (sender_addresses)" }

  const { data: items } = await supabase
    .from("order_items")
    .select("quantity, unit_price, product_type, products(weight, height, width, length)")
    .eq("order_id", orderId)

  const physical = (items ?? []).filter((item) => item.product_type !== "ebook")
  if (physical.length === 0) return { error: "Pedido sem itens físicos" }

  // Soma o peso e usa a maior caixa; produtos sem medidas caem no padrão de livro.
  let weight = 0
  let height = 4
  let width = 12
  let length = 17
  let insurance = 0

  for (const item of physical) {
    const product = item.products as unknown as {
      weight: number | null
      height: number | null
      width: number | null
      length: number | null
    } | null
    const quantity = item.quantity ?? 1
    weight += Number(product?.weight ?? 0.3) * quantity
    height = Math.max(height, Number(product?.height ?? 4))
    width = Math.max(width, Number(product?.width ?? 12))
    length = Math.max(length, Number(product?.length ?? 17))
    insurance += Number(item.unit_price ?? 0) * quantity
  }

  const result = await callEdgeFunction<{ cotacoes: QuoteOption[] }>("melhor-envio-cotacao", {
    body: {
      cep_origem: sender.zip_code,
      cep_destino: address.zip_code,
      peso: Number(weight.toFixed(3)),
      altura: Math.round(height),
      largura: Math.round(width),
      comprimento: Math.round(length),
      valor_seguro: Number(insurance.toFixed(2)),
    },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao chamar a integração" }

  const options = (result.data?.cotacoes ?? []).filter((option) => !option.erro && option.preco)
  return { success: true, options }
}

/** Salva o serviço de frete escolhido para a etiqueta. */
export async function setShippingService(orderId: string, serviceId: number, serviceName: string, price: number) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({
      me_service_id: serviceId,
      me_service_name: serviceName,
      shipping_price: price,
    })
    .eq("id", orderId)

  if (error) return { error: error.message }

  revalidateOrder(orderId)
  return { success: true }
}

type LabelAction = "add_to_cart" | "checkout" | "generate" | "print" | "tracking"

/** Executa uma etapa do fluxo de etiqueta no Melhor Envio. */
export async function runLabelAction(orderId: string, action: LabelAction) {
  const supabase = await createClient()

  let body: Record<string, unknown> = { order_id: orderId }

  if (action === "add_to_cart") {
    const [{ data: order }, { data: sender }] = await Promise.all([
      supabase
        .from("orders")
        .select("shipping_address, total, user_id, short_id, me_service_id")
        .eq("id", orderId)
        .single(),
      supabase
        .from("sender_addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (!order) return { error: "Pedido não encontrado" }
    if (!sender) return { error: "Cadastre um endereço de remetente (sender_addresses)" }

    const address = order.shipping_address as Record<string, string> | null
    if (!address?.zip_code) return { error: "Pedido sem endereço de entrega" }

    const { data: profile } = order.user_id
      ? await supabase
          .from("profiles")
          .select("full_name, email, phone, document")
          .eq("id", order.user_id)
          .single()
      : { data: null }

    const missing: string[] = []
    if (!profile?.full_name) missing.push("nome do cliente")
    if (!profile?.document) missing.push("CPF do cliente")
    if (!profile?.phone) missing.push("telefone do cliente")
    if (missing.length > 0) {
      return { error: `Faltam dados do destinatário: ${missing.join(", ")}` }
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("product_title, quantity, unit_price, product_type, products(weight, height, width, length)")
      .eq("order_id", orderId)

    const physical = (items ?? []).filter((item) => item.product_type !== "ebook")
    if (physical.length === 0) return { error: "Pedido sem itens físicos" }

    let weight = 0
    let height = 4
    let width = 12
    let length = 17

    const produtos = physical.map((item) => {
      const product = item.products as unknown as {
        weight: number | null
        height: number | null
        width: number | null
        length: number | null
      } | null
      const quantity = item.quantity ?? 1
      weight += Number(product?.weight ?? 0.3) * quantity
      height = Math.max(height, Number(product?.height ?? 4))
      width = Math.max(width, Number(product?.width ?? 12))
      length = Math.max(length, Number(product?.length ?? 17))
      return {
        name: item.product_title,
        quantity,
        unitary_value: Number(item.unit_price ?? 0),
      }
    })

    const insurance = produtos.reduce((sum, item) => sum + item.unitary_value * item.quantity, 0)

    body = {
      order_id: orderId,
      service_id: order.me_service_id ?? undefined,
      remetente: {
        nome: sender.name,
        telefone: sender.phone,
        email: sender.email,
        documento: sender.document,
        endereco: sender.street,
        numero: sender.number,
        complemento: sender.complement ?? "",
        bairro: sender.neighborhood,
        cidade: sender.city,
        uf: sender.state,
        cep: sender.zip_code,
      },
      destinatario: {
        nome: profile!.full_name,
        telefone: profile!.phone,
        email: profile!.email,
        documento: profile!.document,
        endereco: address.street,
        numero: address.number,
        complemento: address.complement ?? "",
        bairro: address.neighborhood,
        cidade: address.city,
        uf: address.state,
        cep: address.zip_code,
      },
      produtos,
      volumes: [
        {
          height: Math.round(height),
          width: Math.round(width),
          length: Math.round(length),
          weight: Number(weight.toFixed(3)),
        },
      ],
      valor_seguro: Number(insurance.toFixed(2)),
      non_commercial: true,
    }
  }

  const result = await callEdgeFunction<Record<string, unknown>>("melhor-envio-etiquetas", {
    query: { action },
    body,
  })

  if (!result.ok) return { error: result.error ?? "Falha ao chamar a integração" }

  revalidateOrder(orderId)
  return { success: true, data: result.data }
}

/**
 * Cancela o pedido e devolve o dinheiro ao cliente.
 *
 * A function decide a ação pelo estado real do pagamento: cancela se ainda não
 * foi aprovado, reembolsa se já foi. `kind` escolhe o valor: tudo, tudo menos o
 * frete, ou um valor específico.
 */
export async function refundOrder(
  orderId: string,
  options: { kind?: "full" | "products_only" | "custom"; amount?: number; reason?: string } = {},
) {
  const result = await callEdgeFunction<{
    status: string
    mensagem: string
    amount?: number
  }>("mp-refund", {
    body: {
      order_id: orderId,
      kind: options.kind ?? "full",
      amount: options.amount,
      reason: options.reason,
      environment: MP_ENVIRONMENT,
    },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao cancelar o pedido" }

  revalidateOrder(orderId)
  return { success: true, status: result.data?.status, message: result.data?.mensagem }
}

/** Cancela a etiqueta no Melhor Envio (o valor volta para a Melhor Carteira). */
export async function cancelLabel(orderId: string, reason?: string) {
  const result = await callEdgeFunction<{ mensagem: string }>("melhor-envio-etiquetas", {
    query: { action: "cancel" },
    body: { order_id: orderId, motivo: reason },
  })

  if (!result.ok) return { error: result.error ?? "Falha ao cancelar a etiqueta" }

  revalidateOrder(orderId)
  return { success: true, message: result.data?.mensagem }
}

/** Saldo da Melhor Carteira — a etiqueta é paga com ele. */
export async function getWalletBalance() {
  const result = await callEdgeFunction<{
    saldo: { balance: number; reserved: number; debts: number }
  }>("melhor-envio-etiquetas", { method: "GET", query: { action: "balance" } })

  if (!result.ok) return { error: result.error ?? "Falha ao consultar o saldo" }
  return { success: true, balance: result.data?.saldo }
}

export async function sendOrderMessage(orderId: string, message: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }

  const { error } = await supabase.from("order_messages").insert({
    order_id: orderId,
    sender_id: user.id,
    sender_role: "admin",
    message,
  })

  if (error) return { error: error.message }

  revalidatePath(`/pedidos/${orderId}`)
  return { success: true }
}

export async function markMessagesAsRead(orderId: string) {
  const supabase = await createClient()

  await supabase
    .from("order_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .eq("sender_role", "customer")
    .is("read_at", null)

  revalidatePath(`/pedidos/${orderId}`)
}
