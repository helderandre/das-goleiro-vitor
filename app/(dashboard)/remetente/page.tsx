import { createClient } from "@/lib/supabase/server"
import { SenderAddressForm } from "@/components/sender-address-form"

export default async function RemetentePage() {
  const supabase = await createClient()

  const { data: senders } = await supabase
    .from("sender_addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  const defaultSender = senders?.find((s) => s.is_default) ?? null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Remetente</h1>
        <p className="text-muted-foreground">
          Configure o endereço de remetente usado nas etiquetas de envio.
        </p>
      </div>

      <SenderAddressForm sender={defaultSender} allSenders={senders ?? []} />
    </div>
  )
}
