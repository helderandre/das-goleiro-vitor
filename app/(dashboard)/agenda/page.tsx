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
import { Plus, Pencil, MapPin, Globe } from "lucide-react"
import { DeleteEventButton } from "./delete-button"

const typeLabels: Record<string, string> = {
  palestra: "Palestra",
  missao: "Missão",
  clinica: "Clínica",
  culto: "Culto",
}

const typeColors: Record<string, string> = {
  palestra: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  missao: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  clinica: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  culto: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmado: { label: "Confirmado", variant: "default" },
  "a confirmar": { label: "A Confirmar", variant: "outline" },
  "em-andamento": { label: "Em Andamento", variant: "secondary" },
  encerrado: { label: "Encerrado", variant: "destructive" },
}

export default async function AgendaPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("start_date", { ascending: false })

  const now = new Date().toISOString()
  const upcoming = events?.filter((e) => e.start_date >= now) ?? []
  const past = events?.filter((e) => e.start_date < now) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agenda</h1>
          <p className="text-muted-foreground">
            Gerencie os eventos e missões
          </p>
        </div>
        <Button asChild>
          <Link href="/agenda/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Evento
          </Link>
        </Button>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Eventos</CardTitle>
          <CardDescription>
            {upcoming.length} evento(s) futuro(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum evento futuro cadastrado.
              </p>
              <Button asChild className="mt-4">
                <Link href="/agenda/novo">Criar evento</Link>
              </Button>
            </div>
          ) : (
            <EventTable events={upcoming} />
          )}
        </CardContent>
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eventos Passados</CardTitle>
            <CardDescription>
              {past.length} evento(s) encerrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventTable events={past} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface EventRow {
  id: string
  title: string
  cover_url: string | null
  event_type: string | null
  location_type: string | null
  city: string | null
  state: string | null
  start_date: string
  status: string | null
}

function EventTable({ events }: { events: EventRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Capa</TableHead>
          <TableHead>Título</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Local</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const sc = statusConfig[event.status ?? "confirmado"] ?? statusConfig.confirmado

          return (
            <TableRow key={event.id}>
              <TableCell>
                {event.cover_url ? (
                  <img
                    src={event.cover_url}
                    alt={event.title}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    ?
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{event.title}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${typeColors[event.event_type ?? "palestra"] ?? ""}`}
                >
                  {typeLabels[event.event_type ?? "palestra"]}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  {event.location_type === "online" ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Online</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {[event.city, event.state].filter(Boolean).join(" - ") ||
                          "—"}
                      </span>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(event.start_date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <Badge variant={sc.variant}>{sc.label}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/agenda/${event.id}/editar`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <DeleteEventButton
                    eventId={event.id}
                    eventTitle={event.title}
                  />
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
