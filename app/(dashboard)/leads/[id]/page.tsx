import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { inviteDetails, scheduleLabel } from "@/lib/leads"
import { cityState } from "@/lib/events"
import { MobileLeadDetail } from "@/components/mobile/leads/lead-detail"
import { leadWhen } from "../mobile-leads-data"

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase.from("leads").select("*").eq("id", id).single()
  if (!lead) notFound()

  // Abrir o lead conta como leitura.
  let status = lead.status ?? "new"
  if (status === "new") {
    await supabase.from("leads").update({ status: "read" }).eq("id", id).eq("status", "new")
    status = "read"
  }

  const d = inviteDetails(lead.event_details)

  return (
    <div className="mx-auto w-full max-w-md">
      <MobileLeadDetail
        lead={{
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          status,
          isInvite: lead.type === "invite",
          receivedLabel: leadWhen(lead.created_at, new Date()).replace(/^(Hoje|Ontem)/, (m) => m.toLowerCase()),
          invite: d
            ? {
                modality: d.locationType ? (d.locationType === "online" ? "Online" : "Presencial") : null,
                duration: d.duration ? (d.duration === "single-day" ? "Um dia" : "Vários dias") : null,
                place: cityState(d.city ?? null, d.state ?? null) || null,
                dates: (d.schedule ?? []).map(scheduleLabel),
              }
            : null,
        }}
      />
    </div>
  )
}
