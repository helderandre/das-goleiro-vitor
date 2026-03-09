import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EventForm } from "@/components/event-form"

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single()

  if (!event) notFound()

  return <EventForm event={event} />
}
