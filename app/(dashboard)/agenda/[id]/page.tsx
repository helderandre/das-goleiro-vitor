import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { cityState, longDay, spDay, spTime } from "@/lib/events"
import { MobileEventDetail } from "@/components/mobile/agenda/event-detail"
import { toMobileEvent } from "../mobile-agenda-data"

export default async function EventoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase.from("events").select("*").eq("id", id).single()
  if (!event) notFound()

  const now = new Date()
  const m = toMobileEvent(event, now)
  const start = new Date(event.start_date)
  const end = event.end_date ? new Date(event.end_date) : null
  const sameDay = end && spDay(end) === spDay(start)

  return (
    <div className="mx-auto w-full max-w-md">
      <MobileEventDetail
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          status: event.status ?? "confirmado",
          typeLabel: m.typeLabel,
          online: event.location_type === "online",
          coverUrl: event.cover_url,
          relative: m.relative,
          past: m.past,
          ongoing: m.ongoing,
          whenTitle: `${longDay(start)}, ${spTime(start)}`,
          whenSub: end ? (sameDay ? `até ${spTime(end)}` : `até ${longDay(end)}, ${spTime(end)}`) : null,
          locationName: event.location_name?.trim() || null,
          cityState: cityState(event.city, event.state),
          contactName: event.contact_name,
          contactPhone: event.contact_phone,
          externalLink: event.external_link,
          startIso: event.start_date,
          endIso: event.end_date,
        }}
      />
    </div>
  )
}
