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
import { ArrowLeft, MapPin, User, Package } from "lucide-react"
import { OrderStatusSelect } from "@/components/order-status-select"
import { OrderTimeline } from "@/components/order-timeline"
import { OrderTrackingCode } from "@/components/order-tracking-code"
import { OrderPaymentProof } from "@/components/order-payment-proof"

interface ShippingAddress {
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  zip_code?: string
  label?: string
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

  const [{ data: items }, { data: profile }] = await Promise.all([
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
  ])

  const address = order.shipping_address as ShippingAddress | null
  const hasPhysicalItems = items?.some((item) => item.product_type !== "ebook") ?? false

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pedidos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Pedido #{order.short_id ?? order.id.slice(0, 8)}
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
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product_title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {item.product_type === "ebook" ? "E-book" : "Físico"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
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
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">
                    {Number(order.total).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
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
              <CardTitle>Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.mp_preference_id && (
                <p className="text-xs text-muted-foreground break-all">
                  MP Preference: {order.mp_preference_id}
                </p>
              )}
              <OrderPaymentProof
                orderId={order.id}
                currentUrl={order.payment_proof_url}
              />
            </CardContent>
          </Card>

          {hasPhysicalItems && (
            <Card>
              <CardHeader>
                <CardTitle>Envio</CardTitle>
              </CardHeader>
              <CardContent>
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
