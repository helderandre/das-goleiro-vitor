"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  BarChart3,
  BookPlus,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  FileText,
  Globe,
  House,
  LayoutGrid,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Moon,
  Package,
  PenLine,
  Plus,
  ShoppingBag,
  Sun,
  Users,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { createPost } from "@/app/(dashboard)/blog/actions"
import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

interface MobileShellContextValue {
  openCreate: () => void
  openMore: () => void
}

const MobileShellContext = React.createContext<MobileShellContextValue | null>(
  null,
)

export function useMobileShell() {
  const ctx = React.useContext(MobileShellContext)
  if (!ctx) throw new Error("useMobileShell precisa do MobileShellProvider")
  return ctx
}

interface MobileShellProps {
  children: React.ReactNode
  user: { name: string; email: string; avatar_url?: string | null }
  /** Pedidos pagos esperando envio + pedidos que pedem atenção. */
  ordersBadge: number
  newLeadsCount: number
}

/**
 * Casca de app para telas < md: barra de abas fixa, botão central "Criar" e a
 * gaveta "Mais" com o resto das seções. No desktop nada disso aparece — a
 * sidebar continua sendo a navegação.
 */
export function MobileShell({
  children,
  user,
  ordersBadge,
  newLeadsCount,
}: MobileShellProps) {
  const [createOpen, setCreateOpen] = React.useState(false)
  const [moreOpen, setMoreOpen] = React.useState(false)

  const value = React.useMemo(
    () => ({
      openCreate: () => setCreateOpen(true),
      openMore: () => setMoreOpen(true),
    }),
    [],
  )

  return (
    <MobileShellContext.Provider value={value}>
      {children}
      <MobileTabBar
        ordersBadge={ordersBadge}
        onCreate={() => setCreateOpen(true)}
        onMore={() => setMoreOpen(true)}
        moreActive={moreOpen}
      />
      <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
      <MoreSheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        user={user}
        newLeadsCount={newLeadsCount}
      />
    </MobileShellContext.Provider>
  )
}

function MobileTabBar({
  ordersBadge,
  onCreate,
  onMore,
  moreActive,
}: {
  ordersBadge: number
  onCreate: () => void
  onMore: () => void
  moreActive: boolean
}) {
  const pathname = usePathname()
  // Telas internas (detalhe, formulário) têm a própria barra de ações, como
  // num app: a barra de abas só aparece nas telas de primeiro nível.
  const isNested = pathname.split("/").filter(Boolean).length > 1
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  const tabs = [
    { href: "/", label: "Início", icon: House },
    { href: "/pedidos", label: "Pedidos", icon: ShoppingBag, badge: ordersBadge },
  ]
  const tabsRight = [{ href: "/financeiro", label: "Financeiro", icon: BarChart3 }]
  const inMainTabs = [...tabs, ...tabsRight].some((t) => isActive(t.href))

  if (isNested) return null

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-start border-t bg-background/95 px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden"
    >
      {tabs.map((tab) => (
        <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
      ))}
      <div className="flex justify-center">
        <button
          type="button"
          aria-label="Criar"
          onClick={onCreate}
          className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-[5px] ring-background transition-transform active:scale-95"
        >
          <Plus className="size-6.5" strokeWidth={2.4} />
        </button>
      </div>
      {tabsRight.map((tab) => (
        <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
      ))}
      <button
        type="button"
        onClick={onMore}
        className={cn(
          "flex min-h-11 flex-col items-center gap-1 pt-1.5 text-[11px] font-medium",
          moreActive || !inMainTabs ? "text-primary" : "text-muted-foreground",
        )}
      >
        <LayoutGrid className="size-6" strokeWidth={1.8} />
        Mais
      </button>
    </nav>
  )
}

function TabLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  badge?: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 flex-col items-center gap-1 pt-1.5 text-[11px]",
        active ? "font-semibold text-primary" : "font-medium text-muted-foreground",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2 : 1.8} />
      {label}
      {!!badge && (
        <span className="absolute top-0 left-1/2 ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  )
}

/** Linha de lista estilo iOS: ícone em pastilha, título, subtítulo e chevron. */
export function SheetRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  href,
  pending,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  subtitle?: string
  onClick?: () => void
  href?: string
  pending?: boolean
  trailing?: React.ReactNode
}) {
  const content = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary/15 text-primary">
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Icon className="size-[22px]" strokeWidth={1.8} />
        )}
      </span>
      <span className="flex min-w-0 grow flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        {subtitle && (
          <span className="text-[13px] text-muted-foreground">{subtitle}</span>
        )}
      </span>
      {trailing}
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </>
  )
  const className =
    "flex min-h-[64px] w-full items-center gap-3.5 px-3.5 py-3 text-left active:bg-foreground/5 disabled:opacity-60"

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} disabled={pending} className={className}>
      {content}
    </button>
  )
}

export function SheetGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-foreground/[0.07] overflow-hidden rounded-[20px] bg-muted/60">
      {children}
    </div>
  )
}

function CreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const close = () => onOpenChange(false)

  function newPost() {
    // createPost cria o rascunho e redireciona para o editor.
    startTransition(async () => {
      await createPost()
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1 pt-4 pb-[18px]">
          <DrawerTitle className="text-[22px] font-extrabold tracking-tight">
            Criar
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            O que você quer adicionar?
          </DrawerDescription>
        </div>
        <SheetGroup>
          <SheetRow
            icon={BookPlus}
            title="Novo produto"
            subtitle="Livro físico ou e-book no catálogo"
            href="/produtos/novo"
            onClick={close}
          />
          <SheetRow
            icon={CalendarPlus}
            title="Novo evento"
            subtitle="Palestra, culto ou missão na agenda"
            href="/agenda/novo"
            onClick={close}
          />
          <SheetRow
            icon={PenLine}
            title="Novo post"
            subtitle={isPending ? "Criando rascunho…" : "Artigo para o blog"}
            onClick={newPost}
            pending={isPending}
          />
        </SheetGroup>
        <button
          type="button"
          onClick={close}
          className="mt-[18px] h-[52px] rounded-2xl border bg-muted/60 text-base font-semibold"
        >
          Cancelar
        </button>
      </DrawerContent>
    </Drawer>
  )
}

const moreItems = [
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/blog", label: "Blog", icon: FileText },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/leads", label: "Leads", icon: MessageSquare },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/remetente", label: "Remetente", icon: MapPin },
  { href: "/site", label: "Site", icon: Globe },
]

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

/** Foto de perfil; sem foto, as iniciais sobre o amarelo da marca. */
export function UserAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl?: string | null
  className?: string
}) {
  const [failed, setFailed] = React.useState(false)
  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL externa do Supabase Storage/OAuth
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full bg-muted object-cover", className)}
      />
    )
  }
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground",
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

function MoreSheet({
  open,
  onOpenChange,
  user,
  newLeadsCount,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: { name: string; email: string; avatar_url?: string | null }
  newLeadsCount: number
}) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [signingOut, setSigningOut] = React.useState(false)
  const close = () => onOpenChange(false)

  async function signOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isDark = resolvedTheme === "dark"

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground>
      <DrawerContent className="px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3.5 pt-4 pb-[18px]">
          <UserAvatar
            name={user.name}
            avatarUrl={user.avatar_url}
            className="size-12 text-base"
          />
          <div className="flex min-w-0 flex-col">
            <DrawerTitle className="truncate text-lg font-bold">
              {user.name}
            </DrawerTitle>
            <DrawerDescription className="truncate text-[13px]">
              {user.email}
            </DrawerDescription>
          </div>
        </div>

        <div className="-mx-5 overflow-y-auto px-5">
          <div className="grid grid-cols-4 gap-y-4 pb-5">
            {moreItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="relative flex flex-col items-center gap-2 text-xs font-medium"
              >
                <span className="flex size-[60px] items-center justify-center rounded-[20px] border bg-muted/60 text-primary">
                  <item.icon className="size-6" strokeWidth={1.8} />
                </span>
                {item.label}
                {item.href === "/leads" && newLeadsCount > 0 && (
                  <span className="absolute -top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {newLeadsCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <SheetGroup>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex min-h-14 items-center gap-3.5 px-3.5 text-left text-base font-medium active:bg-foreground/5"
            >
              {isDark ? (
                <Sun className="size-5 text-muted-foreground" />
              ) : (
                <Moon className="size-5 text-muted-foreground" />
              )}
              {isDark ? "Tema claro" : "Tema escuro"}
            </button>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex min-h-14 items-center gap-3.5 px-3.5 text-left text-base font-medium text-destructive active:bg-foreground/5 disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <LogOut className="size-5" />
              )}
              Sair
            </button>
          </SheetGroup>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
