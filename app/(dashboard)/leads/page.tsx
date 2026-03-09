import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LeadsTable } from "./leads-table"

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>
}) {
  const { status, type } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }
  if (type && type !== "all") {
    query = query.eq("type", type)
  }

  const { data: leads } = await query

  const { count: newCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "new")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground">
          Contatos e convites recebidos pelo site
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Todos os Leads
            {(newCount ?? 0) > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {newCount} novo{(newCount ?? 0) > 1 ? "s" : ""}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {leads?.length ?? 0} lead(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadsTable
            leads={leads ?? []}
            currentStatus={status}
            currentType={type}
          />
        </CardContent>
      </Card>
    </div>
  )
}
