"use client"

import { useRouter, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import { useCallback, useState } from "react"

const statuses = [
  { value: "all", label: "Todos" },
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
]

interface OrderFiltersProps {
  currentStatus?: string
  currentSearch?: string
}

export function OrderFilters({ currentStatus, currentSearch }: OrderFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(currentSearch ?? "")

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams()
      if (key === "status") {
        if (value && value !== "all") params.set("status", value)
        if (search) params.set("q", search)
      } else {
        if (currentStatus && currentStatus !== "all")
          params.set("status", currentStatus)
        if (value) params.set("q", value)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, currentStatus, search],
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID ou cliente..."
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
        defaultValue={currentStatus ?? "all"}
        onValueChange={(v) => updateParams("status", v)}
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
