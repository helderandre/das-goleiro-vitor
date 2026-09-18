import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { EventForm } from "@/components/event-form"
import { MobileEventForm } from "@/components/mobile/agenda/event-form-mobile"

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

  return (
    <>
      <div className="md:hidden">
        <MobileEventForm
          initial={{
            id: event.id,
            title: event.title,
            description: event.description ?? "",
            eventType: event.event_type ?? "palestra",
            status: event.status ?? "confirmado",
            startIso: event.start_date,
            endIso: event.end_date,
            locationType: event.location_type ?? "presencial",
            locationName: event.location_name ?? "",
            city: event.city?.trim() ?? "",
            state: event.state?.trim() ?? "",
            contactName: event.contact_name ?? "",
            contactPhone: event.contact_phone ?? "",
            externalLink: event.external_link ?? "",
            coverUrl: event.cover_url,
          }}
        />
      </div>
      <div className="hidden md:block">
        <EventForm event={event} />
      </div>
    </>
  )
}
