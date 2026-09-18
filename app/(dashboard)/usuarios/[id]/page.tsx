import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getPaymentDisplay } from "@/lib/payment-methods"
import { MobileUserDetail } from "@/components/mobile/users/user-detail"

const PAID = ["paid", "shipped", "delivered"]

function initialsOf(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("")
}

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: orders }, { data: addresses }, { data: auth }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase
      .from("orders")
      .select("id, short_id, status, total, created_at, mp_payment_method, mp_payment_type, order_items(quantity)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("addresses").select("*").eq("user_id", id).order("is_default", { ascending: false }),
    supabase.auth.getUser(),
  ])
  if (!profile) notFound()

  const name = profile.full_name?.trim() || "Sem nome"
  const zip = (z: string | null) => (z && z.replace(/\D/g, "").length === 8 ? `${z.replace(/\D/g, "").slice(0, 5)}-${z.replace(/\D/g, "").slice(5)}` : z)

  return (
    <div className="mx-auto w-full max-w-md">
      <MobileUserDetail
        user={{
          id: profile.id,
          name,
          firstName: name.split(/\s+/)[0],
          email: profile.email,
          phone: profile.phone,
          initials: initialsOf(name),
          avatarUrl: profile.avatar_url,
          admin: profile.role === "admin",
          isSelf: auth.user?.id === profile.id,
          spent: (orders ?? []).filter((o) => PAID.includes(o.status ?? "")).reduce((s, o) => s + Number(o.total), 0),
        }}
        orders={(orders ?? []).map((o) => {
          const books = o.order_items.reduce((s, i) => s + i.quantity, 0)
          const date = o.created_at
            ? new Date(o.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" })
            : ""
          return {
            id: o.id,
            shortId: (o.short_id ?? o.id.slice(0, 6).toUpperCase()).replace(/^#/, ""),
            status: o.status ?? "pending",
            total: Number(o.total),
            label: [date, `${books} ${books === 1 ? "livro" : "livros"}`, getPaymentDisplay(o.mp_payment_method, o.mp_payment_type).typeLabel]
              .filter(Boolean)
              .join(" · "),
          }
        })}
        addresses={(addresses ?? []).map((a) => ({
          id: a.id,
          line1: [a.street, a.number].filter(Boolean).join(", ") + (a.complement ? ` · ${a.complement}` : ""),
          line2: [a.neighborhood, [a.city, a.state].filter(Boolean).join("/"), zip(a.zip_code)].filter(Boolean).join(" · "),
        }))}
      />
    </div>
  )
}
