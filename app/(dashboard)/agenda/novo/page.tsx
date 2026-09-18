import { EventForm } from "@/components/event-form"
import { MobileEventForm, type MobileEventFormValues } from "@/components/mobile/agenda/event-form-mobile"
import { createClient } from "@/lib/supabase/server"
import { inviteDetails, parseInviteDate, parseInviteTime } from "@/lib/leads"

const EMPTY: MobileEventFormValues = {
  title: "",
  description: "",
  eventType: "palestra",
  status: "confirmado",
  startIso: null,
  endIso: null,
  locationType: "presencial",
  locationName: "",
  city: "",
  state: "",
  contactName: "",
  contactPhone: "",
  externalLink: "",
  coverUrl: null,
}

/** Converte "2026-10-15" + "19:30" (horário de Brasília) em ISO. */
function brtIso(date: string, time: string | null) {
  return new Date(`${date}T${time ?? "19:00"}:00-03:00`).toISOString()
}

/** Evento novo, opcionalmente pré-preenchido com um convite (?lead=<id>). */
async function initialFromLead(leadId: string | undefined) {
  if (!leadId) return { initial: EMPTY, note: undefined }
  const supabase = await createClient()
  const { data: lead } = await supabase
    .from("leads")
    .select("name, phone, message, event_details")
    .eq("id", leadId)
    .maybeSingle()
  if (!lead) return { initial: EMPTY, note: undefined }

  const d = inviteDetails(lead.event_details)
  const dates = (d?.schedule ?? [])
    .map((s) => ({ date: parseInviteDate(s.date), time: parseInviteTime(s.time) }))
    .filter((s): s is { date: string; time: string | null } => !!s.date)
    .sort((a, b) => a.date.localeCompare(b.date))
  const first = dates[0]
  const last = dates.length > 1 ? dates[dates.length - 1] : null

  return {
    initial: {
      ...EMPTY,
      status: "a confirmar",
      description: lead.message ?? "",
      locationType: d?.locationType === "online" ? "online" : "presencial",
      city: d?.city ?? "",
      state: d?.state ?? "",
      contactName: lead.name,
      contactPhone: lead.phone ?? "",
      startIso: first ? brtIso(first.date, first.time) : null,
      endIso: last ? brtIso(last.date, last.time) : null,
    },
    note: `Preenchido com o convite de ${lead.name}. Confira título, local e horários antes de criar.`,
  }
}

export default async function NovoEventoPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>
}) {
  const { lead } = await searchParams
  const { initial, note } = await initialFromLead(lead)

  return (
    <>
      <div className="md:hidden">
        <MobileEventForm initial={initial} prefillNote={note} />
      </div>
      <div className="hidden md:block">
        <EventForm />
      </div>
    </>
  )
}
