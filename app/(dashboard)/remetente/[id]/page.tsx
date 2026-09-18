import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MobileSenderForm } from "@/components/mobile/sender/sender-form"

export default async function RemetentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: s } = await supabase.from("sender_addresses").select("*").eq("id", id).single()
  if (!s) notFound()

  const t = (v: string | null) => v?.trim() ?? ""
  return (
    <div className="mx-auto w-full max-w-md">
      <MobileSenderForm
        canDelete={!s.is_default}
        initial={{
          id: s.id,
          name: t(s.name),
          document: t(s.document),
          phone: t(s.phone),
          email: t(s.email),
          zip_code: t(s.zip_code),
          street: t(s.street),
          number: t(s.number),
          complement: t(s.complement),
          neighborhood: t(s.neighborhood),
          city: t(s.city),
          state: t(s.state),
          isDefault: !!s.is_default,
        }}
      />
    </div>
  )
}
