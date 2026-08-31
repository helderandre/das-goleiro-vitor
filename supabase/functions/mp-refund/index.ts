import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Cancelamento e reembolso do pedido.
 *
 * A ação certa depende do estado REAL do pagamento, consultado na API:
 *  - pending / in_process / authorized -> cancela o pagamento
 *  - approved                          -> reembolsa (total, sem frete, ou valor livre)
 *  - sem pagamento                     -> apenas cancela o pedido
 *
 * O registro em order_refunds é criado ANTES da chamada, com a chave de
 * idempotência que será enviada ao Mercado Pago — assim um retry repete a mesma
 * operação em vez de criar uma segunda devolução.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MP_API = "https://api.mercadopago.com";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Devolver dinheiro é ação de admin.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") return json({ error: "Apenas administradores" }, 403);

    const body = await req.json();
    const {
      order_id,
      kind = "full", // full | products_only | custom
      amount: customAmount,
      reason,
      environment = "sandbox",
    } = body;

    if (!order_id) return json({ error: "order_id é obrigatório" }, 400);

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, short_id, status, total, shipping_price, mp_payment_id, mp_payment_status, mp_paid_at")
      .eq("id", order_id)
      .single();
    if (!order) return json({ error: "Pedido não encontrado" }, 404);

    const { data: creds } = await supabaseAdmin
      .from("mp_credentials")
      .select("access_token")
      .eq("environment", environment)
      .eq("is_active", true)
      .single();
    if (!creds) return json({ error: `Credenciais MP (${environment}) não configuradas` }, 500);

    const mpHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.access_token}`,
    };

    // ── Sem pagamento: cancela só localmente ──────────────────────────────
    if (!order.mp_payment_id) {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled", needs_attention: false, attention_reason: null })
        .eq("id", order.id);
      await supabaseAdmin.rpc("release_order_stock", { p_order_id: order.id });
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        type: "order_cancelled",
        from_status: order.status,
        to_status: "cancelled",
        actor: "admin",
        actor_id: user.id,
        payload: { reason: reason ?? null, had_payment: false },
      });
      return json({ status: "cancelled", mensagem: "Pedido cancelado (não havia pagamento)" });
    }

    // ── Estado real do pagamento ──────────────────────────────────────────
    const paymentResponse = await fetch(`${MP_API}/v1/payments/${order.mp_payment_id}`, {
      headers: mpHeaders,
    });
    if (!paymentResponse.ok) {
      return json({ error: "Não foi possível consultar o pagamento no Mercado Pago" }, 502);
    }
    const payment = await paymentResponse.json();

    // ── Pagamento ainda não aprovado: cancela no MP ───────────────────────
    if (["pending", "in_process", "authorized"].includes(payment.status)) {
      const cancelResponse = await fetch(`${MP_API}/v1/payments/${order.mp_payment_id}`, {
        method: "PUT",
        headers: mpHeaders,
        body: JSON.stringify({ status: "cancelled" }),
      });
      const cancelData = await cancelResponse.json();
      if (!cancelResponse.ok) {
        return json({ error: "Erro ao cancelar o pagamento", details: cancelData }, 400);
      }

      await supabaseAdmin
        .from("orders")
        .update({
          status: "cancelled",
          mp_payment_status: "cancelled",
          needs_attention: false,
          attention_reason: null,
        })
        .eq("id", order.id);
      await supabaseAdmin.rpc("release_order_stock", { p_order_id: order.id });
      await supabaseAdmin.from("order_events").insert({
        order_id: order.id,
        type: "payment_cancelled",
        from_status: order.status,
        to_status: "cancelled",
        actor: "admin",
        actor_id: user.id,
        payload: { mp_payment_id: order.mp_payment_id, reason: reason ?? null },
      });

      return json({ status: "cancelled", mensagem: "Pagamento cancelado e pedido encerrado" });
    }

    // ── Pagamento aprovado: reembolso ─────────────────────────────────────
    if (payment.status !== "approved") {
      return json(
        { error: `Pagamento está "${payment.status}": não é possível cancelar nem reembolsar` },
        409,
      );
    }

    // Prazo do Mercado Pago: 180 dias da aprovação.
    if (payment.date_approved) {
      const days = (Date.now() - new Date(payment.date_approved).getTime()) / 86400000;
      if (days > 180) {
        return json({ error: "Fora do prazo do Mercado Pago (180 dias após a aprovação)" }, 409);
      }
    }

    const alreadyRefunded = Number(payment.transaction_amount_refunded ?? 0);
    const paidAmount = Number(payment.transaction_amount ?? order.total ?? 0);
    const shippingPrice = Number(order.shipping_price ?? 0);

    let amount: number;
    if (kind === "full") {
      amount = Number((paidAmount - alreadyRefunded).toFixed(2));
    } else if (kind === "products_only") {
      amount = Number((paidAmount - shippingPrice - alreadyRefunded).toFixed(2));
    } else {
      amount = Number(Number(customAmount ?? 0).toFixed(2));
    }

    if (!(amount > 0)) return json({ error: "Valor de reembolso inválido" }, 400);
    if (amount + alreadyRefunded > paidAmount + 0.01) {
      return json(
        { error: `Valor excede o pago: já devolvido R$ ${alreadyRefunded.toFixed(2)} de R$ ${paidAmount.toFixed(2)}` },
        400,
      );
    }

    // Registro antes da chamada: a chave de idempotência precisa sobreviver a um retry.
    const idempotencyKey = crypto.randomUUID();
    const { data: refundRow, error: refundError } = await supabaseAdmin
      .from("order_refunds")
      .insert({
        order_id: order.id,
        mp_payment_id: String(order.mp_payment_id),
        amount,
        kind,
        status: "requested",
        idempotency_key: idempotencyKey,
        reason: reason ?? null,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (refundError) {
      // O índice único impede um segundo reembolso enquanto houver um em aberto.
      if (refundError.code === "23505") {
        return json({ error: "Já existe um reembolso em andamento para este pedido" }, 409);
      }
      return json({ error: refundError.message }, 500);
    }

    const isTotal = Math.abs(amount - (paidAmount - alreadyRefunded)) < 0.01;
    const mpRefundResponse = await fetch(`${MP_API}/v1/payments/${order.mp_payment_id}/refunds`, {
      method: "POST",
      headers: {
        ...mpHeaders,
        "X-Idempotency-Key": idempotencyKey,
        // Pix em contingência volta 201 + in_process em vez de 400.
        "X-Render-In-Process-Refunds": "true",
      },
      body: isTotal ? "{}" : JSON.stringify({ amount }),
    });

    const refundData = await mpRefundResponse.json();

    if (!mpRefundResponse.ok) {
      await supabaseAdmin
        .from("order_refunds")
        .update({ status: "rejected", mp_response: refundData })
        .eq("id", refundRow.id);
      return json({ error: "Erro ao reembolsar no Mercado Pago", details: refundData }, 400);
    }

    // O reembolso é assíncrono: só concluído quando o MP retorna approved.
    const refundStatus = refundData.status === "approved" ? "approved" : "in_process";

    await supabaseAdmin
      .from("order_refunds")
      .update({
        status: refundStatus,
        mp_refund_id: refundData.id ? String(refundData.id) : null,
        mp_response: refundData,
      })
      .eq("id", refundRow.id);

    const orderUpdate: Record<string, unknown> = {
      needs_attention: refundStatus === "in_process",
      attention_reason: refundStatus === "in_process" ? "Reembolso em processamento" : null,
    };

    // Só encerra o pedido quando o dinheiro efetivamente voltou e foi total.
    if (refundStatus === "approved" && isTotal) {
      orderUpdate.status = "cancelled";
      orderUpdate.mp_payment_status = "refunded";
      await supabaseAdmin.rpc("release_order_stock", { p_order_id: order.id });
    }

    await supabaseAdmin.from("orders").update(orderUpdate).eq("id", order.id);

    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      type: "refund_requested",
      from_status: order.status,
      to_status: (orderUpdate.status as string) ?? order.status,
      actor: "admin",
      actor_id: user.id,
      payload: {
        amount,
        kind,
        refund_status: refundStatus,
        mp_refund_id: refundData.id ?? null,
        reason: reason ?? null,
      },
    });

    return json({
      status: refundStatus,
      mensagem:
        refundStatus === "approved"
          ? `Reembolso de R$ ${amount.toFixed(2)} concluído`
          : `Reembolso de R$ ${amount.toFixed(2)} em processamento`,
      amount,
      refund: refundData,
    });
  } catch (err) {
    console.error("[mp-refund]", err);
    return new Response(JSON.stringify({ error: "Erro interno", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
