"use client"

import { useCallback, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserDetailDrawer } from "./user-detail-drawer"
import { Eye, Search } from "lucide-react"

interface Address {
  id: string
  label: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  is_default: boolean | null
}

interface UserWithStats {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  document: string | null
  avatar_url: string | null
  role: string | null
  updated_at: string | null
  orderCount: number
  orderTotal: number
  addresses: Address[]
}

interface UsersTableProps {
  users: UserWithStats[]
  currentRole?: string
  currentSearch?: string
}

export function UsersTable({
  users,
  currentRole,
  currentSearch,
}: UsersTableProps) {
  const [search, setSearch] = useState(currentSearch ?? "")
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams()
      if (key === "role") {
        if (value && value !== "all") params.set("role", value)
        if (search) params.set("q", search)
      } else {
        if (currentRole && currentRole !== "all") params.set("role", currentRole)
        if (value) params.set("q", value)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, currentRole, search],
  )

  function getInitials(name: string | null) {
    if (!name) return "?"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") updateParams("q", search)
            }}
            onBlur={() => updateParams("q", search)}
          />
        </div>
        <Select
          defaultValue={currentRole ?? "all"}
          onValueChange={(v) => updateParams("role", v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhum usuário encontrado.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Pedidos</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead className="text-right">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar_url ?? undefined}
                        alt={user.full_name ?? ""}
                      />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {user.full_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {user.phone ?? "—"}
                </TableCell>
                <TableCell>
                  {user.role === "admin" ? (
                    <Badge variant="default">Admin</Badge>
                  ) : (
                    <Badge variant="secondary">Usuário</Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {user.orderCount}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {user.orderTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedUser(user)
                      setDrawerOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <UserDetailDrawer
        user={selectedUser}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
