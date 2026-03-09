"use client"

import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  CalendarDays,
  MessageSquare,
  Users,
  Globe,
} from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Produtos",
    href: "/produtos",
    icon: Package,
  },
  {
    title: "Pedidos",
    href: "/pedidos",
    icon: ShoppingCart,
  },
  {
    title: "Blog",
    href: "/blog",
    icon: FileText,
  },
  {
    title: "Agenda",
    href: "/agenda",
    icon: CalendarDays,
  },
  {
    title: "Leads",
    href: "/leads",
    icon: MessageSquare,
  },
  {
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
  },
  {
    title: "Site",
    href: "/site",
    icon: Globe,
  },
]

interface AppSidebarProps {
  newLeadsCount?: number
}

export function AppSidebar({ newLeadsCount }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            GV
          </div>
          <span className="text-lg font-semibold">Goleiro Vitor</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.href === "/leads" &&
                      newLeadsCount !== undefined &&
                      newLeadsCount > 0 && (
                        <SidebarMenuBadge>{newLeadsCount}</SidebarMenuBadge>
                      )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
