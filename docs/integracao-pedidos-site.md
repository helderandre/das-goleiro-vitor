# Integração de Pedidos — Visualização no Site

Este documento explica como consumir os dados de pedidos (status de pagamento, comprovante e código de rastreio) no site público do Goleiro Vitor. Os dados são **somente leitura** no site.

---

## 1. Configuração do Supabase Client (site)

```ts
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

---

## 2. Buscar Pedido do Usuário Logado

```ts
// Buscar todos os pedidos do usuário autenticado
const { data: orders } = await supabase
  .from("orders")
  .select(`
    id,
    short_id,
    total,
    status,
    tracking_code,
    payment_proof_url,
    created_at,
    order_items (
      id,
      product_title,
      product_type,
      quantity,
      unit_price
    )
  `)
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
```

---

## 3. Campos Disponíveis

| Campo               | Tipo     | Descrição                                      |
| ------------------- | -------- | ---------------------------------------------- |
| `status`            | `string` | `pending`, `paid`, `shipped`, `delivered`, `cancelled` |
| `tracking_code`     | `string` | Código de rastreio (ex: `BR123456789XX`). Apenas para produtos físicos. |
| `payment_proof_url` | `string` | URL pública do comprovante de pagamento (imagem ou PDF). |
| `total`             | `number` | Valor total do pedido em BRL.                  |
| `short_id`          | `string` | ID curto para exibição (ex: `#A1B2C3`).        |

---

## 4. Exibir Status do Pedido

```tsx
const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
}

function OrderStatus({ status }: { status: string }) {
  return <span>{statusLabels[status] ?? status}</span>
}
```

---

## 5. Exibir Comprovante de Pagamento (somente leitura)

```tsx
function PaymentProof({ url }: { url: string | null }) {
  if (!url) return <p>Nenhum comprovante enviado.</p>

  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url)

  if (isImage) {
    return <img src={url} alt="Comprovante" className="max-w-sm rounded-lg" />
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      Ver comprovante (PDF)
    </a>
  )
}
```

---

## 6. Exibir Código de Rastreio (somente leitura)

```tsx
function TrackingInfo({ code }: { code: string | null }) {
  if (!code) return <p>Código de rastreio ainda não disponível.</p>

  return (
    <div>
      <p>Código de rastreio: <strong>{code}</strong></p>
      <a
        href={`https://www.linkcorreios.com.br/?id=${code}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Rastrear nos Correios
      </a>
    </div>
  )
}
```

---

## 7. Exemplo Completo — Página "Meus Pedidos"

```tsx
export default async function MeusPedidosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: orders } = await supabase
    .from("orders")
    .select(`
      id, short_id, total, status,
      tracking_code, payment_proof_url, created_at,
      order_items (id, product_title, product_type, quantity, unit_price)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div>
      <h1>Meus Pedidos</h1>
      {orders?.map((order) => (
        <div key={order.id}>
          <h2>Pedido #{order.short_id}</h2>
          <p>Status: {statusLabels[order.status]}</p>
          <p>Total: {Number(order.total).toLocaleString("pt-BR", {
            style: "currency", currency: "BRL"
          })}</p>

          {/* Itens */}
          <ul>
            {order.order_items.map((item) => (
              <li key={item.id}>
                {item.product_title} x{item.quantity} —
                R$ {Number(item.unit_price).toFixed(2)}
              </li>
            ))}
          </ul>

          {/* Comprovante */}
          <PaymentProof url={order.payment_proof_url} />

          {/* Rastreio (só para pedidos com produto físico) */}
          {order.order_items.some((i) => i.product_type !== "ebook") && (
            <TrackingInfo code={order.tracking_code} />
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 8. Segurança (RLS)

Os dados já estão protegidos por Row Level Security no Supabase. O usuário só consegue ver seus próprios pedidos. Nenhuma ação de escrita (upload, edição de rastreio) é possível a partir do site — apenas o dashboard admin tem permissão para isso.

Se precisar adicionar uma policy de leitura para o usuário ver seus próprios pedidos:

```sql
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT TO authenticated
USING (auth.uid() = user_id);
```
