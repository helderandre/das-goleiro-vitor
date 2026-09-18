import { MobileSenderForm } from "@/components/mobile/sender/sender-form"

export default function NovoRemetentePage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <MobileSenderForm
        canDelete={false}
        initial={{
          id: null,
          name: "",
          document: "",
          phone: "",
          email: "",
          zip_code: "",
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          isDefault: false,
        }}
      />
    </div>
  )
}
