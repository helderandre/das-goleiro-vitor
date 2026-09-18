import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, ArrowLeft, Clock, Mail, MapPin, MessageSquare, User, Package } from "lucide-react"
import { getPaymentDisplay } from "@/lib/payment-methods"
import { OrderStatusSelect } from "@/components/order-status-select"
import { OrderTimeline } from "@/components/order-timeline"
import { OrderTrackingCode } from "@/components/order-tracking-code"
import { OrderPaymentProof } from "@/components/order-payment-proof"
import { OrderPaymentActions } from "@/components/order-payment-actions"
import { OrderShippingActions } from "@/components/order-shipping-actions"
import { OrderRefundDialog } from "@/components/order-refund-dialog"
import { OrderMessages } from "@/components/order-messages"
import { OrderEmails } from "@/components/order-emails"

interface ShippingAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  label?: string
  /** Cotação escolhida no checkout da loja. Nem todo pedido tem. */
  shipping?: {
    price?: number
    carrier?: string
    service_id?: number
    service_name?: string
    delivery_days?: number
  }
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function PedidoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single()

  if (!order) notFound()

  const [{ data: items }, { data: profile }, { data: messages }, { data: emails }] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    order.user_id
      ? supabase
          .from("profiles")
          .select("full_name, email, phone, avatar_url")
          .eq("id", order.user_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("order_messages")
      .select("id, message, sender_role, read_at, created_at")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("email_outbox")
      .select("id, kind, status, delivery_status, recipient, attempts, last_error, created_at, sent_at, resent_from")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
  ])

  const emailIds = (emails ?? []).map((e) => e.id)
  const { data: emailEvents } = emailIds.length
    ? await supabase
        .from("email_events")
        .select("id, outbox_id, type, occurred_at, detail")
        .in("outbox_id", emailIds)
        .order("occurred_at", { ascending: true })
    : { data: [] }

  const address = order.shipping_address as ShippingAddress | null
  const hasPhysicalItems = items?.some((item) => item.product_type !== "ebook") ?? false
  const unreadCount =
    messages?.filter((m) => m.sender_role === "customer" && !m.read_at).length ?? 0
  const payment = getPaymentDisplay(order.mp_payment_method, order.mp_payment_type)
  const PaymentIcon = payment.icon

  const shippingPrice = Number(order.shipping_price ?? 0)
  const total = Number(order.total)
  // subtotal só passou a ser preenchido pela create_order; pedidos antigos caem
  // no cálculo a partir dos itens.
  const subtotal =
    order.subtotal != null
      ? Number(order.subtotal)
      : (items ?? []).reduce(
          (sum, item) => sum + Number(item.unit_price) * item.quantity,
          0,
        )
  const quote = address?.shipping
  const serviceName = order.me_service_name ?? quote?.service_name ?? null
  const carrier = quote?.carrier ?? null
  const deliveryDays = quote?.delivery_days ?? null
  // Pedidos gravados direto pela loja (sem passar pela create_order) podem ter
  // total sem o frete somado — o admin precisa ver isso.
  const totalMismatch = Math.abs(subtotal + shippingPrice - total) > 0.01
  // Mesmo prazo de expire_unpaid_orders e das cobranças no Mercado Pago.
  const autoCancelAt =
    order.status === "pending" && order.created_at
      ? new Date(new Date(order.created_at).getTime() + 12 * 60 * 60 * 1000)
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pedidos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pedido {order.short_id ?? `#${order.id.slice(0, 8)}`}
          </h1>
          <p className="text-muted-foreground">
            {new Date(order.created_at!).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <OrderStatusSelect
          orderId={order.id}
          currentStatus={order.status ?? "pending"}
        />
      </div>

      {order.needs_attention && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Este pedido precisa de revisão</p>
            <p className="text-muted-foreground">
              {order.attention_reason ?? "Verifique o pagamento e o status do pedido."}
            </p>
          </div>
        </div>
      )}

      {autoCancelAt && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            Aguardando pagamento. Se não for pago, será cancelado automaticamente em{" "}
            <span className="font-medium text-foreground">
              {autoCancelAt.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            .
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens do Pedido
              </CardTitle>
              <CardDescription>
                {items?.length ?? 0} item(ns)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium whitespace-normal break-words">
                        {item.product_title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          {item.product_type === "ebook" ? "E-book" : "Físico"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {Number(item.unit_price).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(
                          Number(item.unit_price) * item.quantity
                        ).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Separator className="my-4" />
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatBRL(subtotal)}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">
                      Frete
                      {serviceName && (
                        <span className="text-foreground">
                          {" · "}
                          {serviceName}
                        </span>
                      )}
                    </span>
                    <span>
                      {shippingPrice > 0 ? formatBRL(shippingPrice) : "—"}
                    </span>
                  </div>

                  {(carrier || deliveryDays != null) && (
                    <p className="text-xs text-muted-foreground">
                      {carrier}
                      {carrier && deliveryDays != null && " · "}
                      {deliveryDays != null &&
                        `prazo estimado de ${deliveryDays} dia(s) úteis`}
                    </p>
                  )}

                  <Separator />

                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold">
                      {formatBRL(total)}
                    </span>
                  </div>

                  {totalMismatch && (
                    <p className="flex items-start gap-1.5 text-xs text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Total não bate com subtotal + frete (
                      {formatBRL(subtotal + shippingPrice)}). O pedido pode ter
                      sido criado sem somar o frete.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline currentStatus={order.status ?? "pending"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensagens
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount} nova(s)</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Conversa com o cliente sobre este pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderMessages
                orderId={order.id}
                messages={messages ?? []}
                unreadCount={unreadCount}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-mails
              </CardTitle>
              <CardDescription>
                O que o cliente recebeu sobre este pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrderEmails
                orderId={order.id}
                emails={emails ?? []}
                events={emailEvents ?? []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Client + Address */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile ? (
                <>
                  <p className="font-medium">{profile.full_name ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                  {profile.phone && (
                    <p className="text-sm text-muted-foreground">
                      {profile.phone}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cliente não identificado
                </p>
              )}
            </CardContent>
          </Card>

          {address && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>
                  {address.street}, {address.number}
                </p>
                {address.complement && <p>{address.complement}</p>}
                <p>{address.neighborhood}</p>
                <p>
                  {address.city} - {address.state}
                </p>
                <p>CEP: {address.zip_code}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PaymentIcon className="h-5 w-5" />
                Pagamento
              </CardTitle>
              <CardDescription>Mercado Pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OrderPaymentActions
                orderId={order.id}
                paymentId={order.mp_payment_id}
                paymentStatus={order.mp_payment_status}
                paymentMethod={order.mp_payment_method}
                paymentType={order.mp_payment_type}
                paidAt={order.mp_paid_at}
                preferenceId={order.mp_preference_id}
              />
              <Separator />
              <OrderPaymentProof
                orderId={order.id}
                currentUrl={order.payment_proof_url}
              />
              {order.status !== "cancelled" && (
                <>
                  <Separator />
                  <OrderRefundDialog
                    orderId={order.id}
                    total={Number(order.total)}
                    shippingPrice={Number(order.shipping_price ?? 0)}
                    hasPayment={Boolean(order.mp_payment_id)}
                    isShipped={["shipped", "delivered"].includes(order.status ?? "")}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {hasPhysicalItems && (
            <Card>
              <CardHeader>
                <CardTitle>Envio</CardTitle>
                <CardDescription>Melhor Envio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <OrderShippingActions
                  orderId={order.id}
                  shippingStatus={order.shipping_status}
                  serviceId={order.me_service_id}
                  serviceName={order.me_service_name}
                  shippingPrice={order.shipping_price}
                  cartId={order.me_cart_id}
                  labelUrl={order.label_url}
                  trackingCode={order.tracking_code}
                  trackingUrl={order.tracking_url}
                />
                <Separator />
                <OrderTrackingCode
                  orderId={order.id}
                  currentCode={order.tracking_code}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
