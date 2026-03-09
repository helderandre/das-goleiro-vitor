"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { updateUserRole } from "./actions"
import { toast } from "sonner"
import {
  Mail,
  Phone,
  FileText,
  MapPin,
  ShoppingCart,
  DollarSign,
  Loader2,
  Star,
  Home,
  Briefcase,
} from "lucide-react"

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

interface UserDetailDrawerProps {
  user: UserWithStats | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserDetailDrawer({
  user,
  open,
  onOpenChange,
}: UserDetailDrawerProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (!user) return null

  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?"

  function handleRoleChange(role: string) {
    startTransition(async () => {
      const result = await updateUserRole(user!.id, role)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Role atualizado")
        router.refresh()
      }
    })
  }

  const labelIcon: Record<string, React.ReactNode> = {
    casa: <Home className="h-3.5 w-3.5" />,
    trabalho: <Briefcase className="h-3.5 w-3.5" />,
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={user.avatar_url ?? undefined}
                alt={user.full_name ?? ""}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{user.full_name ?? "Sem nome"}</SheetTitle>
              <SheetDescription>{user.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{user.phone ?? "—"}</span>
              </div>
              {user.document && (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{user.document}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Orders summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Pedidos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <ShoppingCart className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">{user.orderCount}</p>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <DollarSign className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {user.orderTotal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <p className="text-xs text-muted-foreground">Total Gasto</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Addresses */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">
              Endereços ({user.addresses.length})
            </h3>
            {user.addresses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum endereço cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {user.addresses.map((addr) => (
                  <div key={addr.id} className="rounded-lg border p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      {labelIcon[addr.label?.toLowerCase() ?? ""] ?? (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      <span className="font-medium capitalize">
                        {addr.label ?? "Endereço"}
                      </span>
                      {addr.is_default && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {addr.street}, {addr.number}
                      {addr.complement ? ` - ${addr.complement}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {addr.neighborhood} — {addr.city}/{addr.state}
                    </p>
                    <p className="text-muted-foreground">
                      CEP: {addr.zip_code}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Role */}
          <div className="space-y-2">
            <Label>Alterar Role</Label>
            <div className="flex items-center gap-2">
              <Select
                defaultValue={user.role ?? "user"}
                onValueChange={handleRoleChange}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
