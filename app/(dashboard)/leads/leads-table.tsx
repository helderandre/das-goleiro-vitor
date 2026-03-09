"use client"

import { useCallback, useState, useTransition } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LeadDetailDrawer } from "@/components/lead-detail-drawer"
import { bulkUpdateLeadStatus, bulkDeleteLeads } from "./actions"
import { toast } from "sonner"
import {
  ChevronDown,
  Eye,
  Loader2,
  Mail,
  MailOpen,
  Archive,
  Trash2,
} from "lucide-react"
import type { Json } from "@/lib/supabase/database.types"

interface Lead {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  type: string | null
  status: string | null
  event_details: Json | null
  created_at: string | null
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  new: { label: "Novo", variant: "default" },
  read: { label: "Lido", variant: "secondary" },
  answered: { label: "Respondido", variant: "outline" },
  archived: { label: "Arquivado", variant: "destructive" },
}

const typeLabels: Record<string, string> = {
  contact: "Contato",
  invite: "Convite",
}

interface LeadsTableProps {
  leads: Lead[]
  currentStatus?: string
  currentType?: string
}

export function LeadsTable({
  leads,
  currentStatus,
  currentType,
}: LeadsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const pathname = usePathname()

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams()
      if (key === "status") {
        if (value && value !== "all") params.set("status", value)
        if (currentType && currentType !== "all") params.set("type", currentType)
      } else {
        if (currentStatus && currentStatus !== "all")
          params.set("status", currentStatus)
        if (value && value !== "all") params.set("type", value)
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, currentStatus, currentType],
  )

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkAction(action: "read" | "answered" | "archived" | "delete") {
    const ids = Array.from(selected)
    if (ids.length === 0) return

    startTransition(async () => {
      if (action === "delete") {
        const result = await bulkDeleteLeads(ids)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`${ids.length} lead(s) excluído(s)`)
          setSelected(new Set())
          router.refresh()
        }
      } else {
        const result = await bulkUpdateLeadStatus(ids, action)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success(`${ids.length} lead(s) atualizado(s)`)
          setSelected(new Set())
          router.refresh()
        }
      }
    })
  }

  function openLead(lead: Lead) {
    setSelectedLead(lead)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Filters + Bulk Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          defaultValue={currentStatus ?? "all"}
          onValueChange={(v) => updateFilters("status", v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="read">Lido</SelectItem>
            <SelectItem value="answered">Respondido</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          defaultValue={currentType ?? "all"}
          onValueChange={(v) => updateFilters("type", v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="contact">Contato</SelectItem>
            <SelectItem value="invite">Convite</SelectItem>
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground">
              {selected.size} selecionado(s)
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="mr-2 h-3.5 w-3.5" />
                  )}
                  Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleBulkAction("read")}>
                  <MailOpen className="mr-2 h-4 w-4" />
                  Marcar como Lido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("answered")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Marcar como Respondido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction("archived")}>
                  <Archive className="mr-2 h-4 w-4" />
                  Arquivar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkAction("delete")}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Table */}
      {leads.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nenhum lead encontrado.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === leads.length && leads.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const sc =
                statusConfig[lead.status ?? "new"] ?? statusConfig.new

              return (
                <TableRow
                  key={lead.id}
                  className={lead.status === "new" ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {lead.name}
                    {lead.status === "new" && (
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{lead.email}</TableCell>
                  <TableCell className="text-sm">
                    {lead.phone ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeLabels[lead.type ?? "contact"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openLead(lead)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <LeadDetailDrawer
        lead={selectedLead}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
