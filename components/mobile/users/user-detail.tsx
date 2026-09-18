"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Loader2, Mail, MessageCircle, Phone, ShieldCheck, ShieldOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/motion"
import { formatPhone, whatsappNumber } from "@/lib/phone"
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABELS } from "@/lib/order-status"
import { updateUserRole } from "@/app/(dashboard)/usuarios/actions"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"
import { formatBRL } from "../format"
import { Avatar } from "./user-list"

export interface MobileUserDetailProps {
  user: {
    id: string
    name: string
    firstName: string
    email: string | null
    phone: string | null
    initials: string
    avatarUrl: string | null
    admin: boolean
    isSelf: boolean
    spent: number
  }
  orders: { id: string; shortId: string; status: string; total: number; label: string }[]
  addresses: { id: string; line1: string; line2: string }[]
}

export function MobileUserDetail({ user: u, orders, addresses }: MobileUserDetailProps) {
  const [roleOpen, setRoleOpen] = React.useState(false)
  const wa = u.phone ? whatsappNumber(u.phone) : null
  const actions = [
    { icon: MessageCircle, label: "WhatsApp", href: wa ? `https://wa.me/${wa}` : null },
    { icon: Mail, label: "E-mail", href: u.email ? `mailto:${u.email}` : null },
    { icon: Phone, label: "Ligar", href: u.phone ? `tel:${u.phone.replace(/\D/g, "")}` : null },
  ]

  return (
    <div className="flex flex-col gap-6 pt-1">
      <Link href="/usuarios" aria-label="Voltar para usuários" className="flex size-11 items-center justify-center rounded-full border bg-card">
        <ChevronLeft className="size-[22px]" />
      </Link>

      <header className="flex flex-col items-center gap-2.5 text-center">
        <Avatar user={u} className="size-[84px] text-[28px]" />
        <h1 className="text-[25px] leading-tight font-extrabold tracking-tight">{u.name}</h1>
        {u.email && <span className="max-w-full truncate text-sm text-muted-foreground">{u.email}</span>}
        <div className="flex gap-1.5">
          <span className={cn("flex h-6 items-center rounded-full px-2.5 text-xs font-bold", u.admin ? "bg-primary/15 text-primary" : "bg-muted text-foreground/80")}>
            {u.admin ? "Admin" : "Cliente"}
          </span>
          {orders.length > 0 && (
            <span className="flex h-6 items-center rounded-full bg-emerald-500/15 px-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Comprou {orders.length} {orders.length === 1 ? "vez" : "vezes"}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {actions.map((a) =>
          a.href ? (
            <a
              key={a.label}
              href={a.href}
              target={a.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border bg-muted/60 text-xs font-semibold"
            >
              <a.icon className="size-5" strokeWidth={1.8} />
              {a.label}
            </a>
          ) : (
            <span key={a.label} className="flex h-16 flex-col items-center justify-center gap-1 rounded-2xl border bg-muted/60 text-xs font-semibold opacity-40">
              <a.icon className="size-5" strokeWidth={1.8} />
              {a.label}
            </span>
          ),
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Pedidos" value={<AnimatedNumber value={orders.length} />} />
        <Stat label="Total gasto" value={<AnimatedNumber value={u.spent} format="brl" />} />
      </div>

      {orders.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-[19px] font-bold tracking-tight">Pedidos</h2>
          <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
            {orders.map((o) => (
              <Link key={o.id} href={`/pedidos/${o.id}`} className="flex items-center gap-3 px-3.5 py-3 active:bg-foreground/5">
                <span className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="font-mono text-[15px] font-semibold">#{o.shortId}</span>
                  <span className="truncate text-xs text-muted-foreground">{o.label}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[15px] font-extrabold">{formatBRL(o.total)}</span>
                  <span className={cn("flex h-5 items-center rounded-full px-2 text-[11px] font-bold", ORDER_STATUS_CHIP[o.status] ?? ORDER_STATUS_CHIP.pending)}>
                    {ORDER_STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold tracking-tight">Contato e endereço</h2>
        <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
          <Row label="Celular" value={u.phone ? formatPhone(u.phone) : "—"} />
          <Row label="E-mail" value={u.email ?? "—"} />
          {addresses.length === 0 && <Row label="Endereço" value="Nenhum salvo" />}
          {addresses.map((a, i) => (
            <div key={a.id} className="flex justify-between gap-4 px-4 py-3.5 text-[15px]">
              <span className="shrink-0 text-foreground/80">{addresses.length > 1 ? `Endereço ${i + 1}` : "Endereço"}</span>
              <span className="flex min-w-0 flex-col items-end text-right">
                <span className="font-semibold">{a.line1}</span>
                <span className="text-[13px] text-muted-foreground">{a.line2}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold tracking-tight">Acesso ao painel</h2>
        <button
          type="button"
          onClick={() => setRoleOpen(true)}
          disabled={u.isSelf}
          className="flex items-center gap-3.5 rounded-[20px] border bg-card px-4 py-3.5 text-left disabled:opacity-70"
        >
          <span className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-[13px]", u.admin ? "bg-primary/15 text-primary" : "bg-muted")}>
            <ShieldCheck className="size-5" strokeWidth={1.8} />
          </span>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="text-[15px] font-semibold">{u.admin ? "Admin" : "Cliente"}</span>
            <span className="text-[13px] text-muted-foreground">
              {u.isSelf ? "É você: seu acesso não muda por aqui" : u.admin ? "Entra no painel e mexe em tudo" : "Compra na loja; não entra no painel"}
            </span>
          </span>
          {!u.isSelf && (
            <span className="flex h-[34px] shrink-0 items-center rounded-[11px] bg-muted px-3 text-[13px] font-semibold">
              {u.admin ? "Tirar acesso" : "Tornar admin"}
            </span>
          )}
        </button>
      </section>

      <RoleSheet open={roleOpen} onOpenChange={setRoleOpen} user={u} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[20px] border bg-card p-3.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-2xl font-extrabold whitespace-nowrap">{value}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3.5 text-[15px]">
      <span className="shrink-0 text-foreground/80">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold">{value}</span>
    </div>
  )
}

function RoleSheet({
  open,
  onOpenChange,
  user: u,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user: MobileUserDetailProps["user"]
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const makeAdmin = !u.admin

  function confirm() {
    startTransition(async () => {
      const result = await updateUserRole(u.id, makeAdmin ? "admin" : "user")
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(makeAdmin ? `${u.firstName} agora é admin` : `${u.firstName} não é mais admin`)
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="gap-[18px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col items-center gap-3 pt-5 text-center">
          <span className={cn("flex size-[60px] items-center justify-center rounded-[20px]", makeAdmin ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive")}>
            {makeAdmin ? <ShieldCheck className="size-7" strokeWidth={1.8} /> : <ShieldOff className="size-7" strokeWidth={1.8} />}
          </span>
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">
            {makeAdmin ? `Dar acesso de admin a ${u.firstName}?` : `Tirar o acesso de ${u.firstName}?`}
          </DrawerTitle>
          <DrawerDescription className="text-[15px] leading-normal text-foreground/85">
            {makeAdmin
              ? "Admin entra no painel e vê e mexe em tudo: pedidos, dinheiro, clientes, produtos e configurações do site."
              : "Deixa de entrar no painel. Continua podendo comprar na loja normalmente."}
          </DrawerDescription>
        </div>
        {makeAdmin && (
          <ul className="flex flex-col gap-2 rounded-2xl bg-muted/60 px-4 py-3.5 text-sm text-foreground/85">
            {["Pode cancelar pedidos e devolver dinheiro", "Vê e-mail, telefone e endereço dos clientes", "Pode tirar o acesso de outros admins"].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" strokeWidth={2.4} />
                {t}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={confirm}
            disabled={isPending}
            className={cn(
              "flex h-[54px] items-center justify-center gap-2 rounded-2xl text-base font-bold disabled:opacity-60",
              makeAdmin ? "bg-primary text-primary-foreground" : "bg-destructive text-white",
            )}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {makeAdmin ? "Tornar admin" : "Tirar acesso"}
          </button>
          <button type="button" onClick={() => onOpenChange(false)} className="h-[50px] rounded-2xl border bg-muted/60 text-base font-semibold">
            Cancelar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
