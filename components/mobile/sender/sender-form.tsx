"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Loader2, Trash2, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { deleteSenderAddress, setDefaultSender, upsertSenderAddress } from "@/app/(dashboard)/remetente/actions"

export interface SenderValues {
  id: string | null
  name: string
  document: string
  phone: string
  email: string
  zip_code: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  isDefault: boolean
}

const onlyDigits = (v: string) => v.replace(/\D/g, "")

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

function maskDoc(v: string) {
  const d = onlyDigits(v).slice(0, 14)
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2")
}

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function MobileSenderForm({ initial, canDelete }: { initial: SenderValues; canDelete: boolean }) {
  const router = useRouter()
  const isEditing = !!initial.id
  const [v, setV] = React.useState<SenderValues>({
    ...initial,
    zip_code: maskCep(initial.zip_code),
    document: maskDoc(initial.document),
    phone: maskPhone(initial.phone),
  })
  const [cepState, setCepState] = React.useState<"idle" | "loading" | "ok" | "error">("idle")
  const [isPending, startTransition] = React.useTransition()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const numberRef = React.useRef<HTMLInputElement>(null)

  const set = (key: keyof SenderValues, value: string | boolean) => setV((p) => ({ ...p, [key]: value }))

  async function lookupCep(cep: string) {
    const d = onlyDigits(cep)
    if (d.length !== 8) return
    setCepState("loading")
    try {
      const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
      const data = await res.json()
      if (data.erro) throw new Error("CEP não encontrado")
      setV((p) => ({
        ...p,
        street: data.logradouro || p.street,
        neighborhood: data.bairro || p.neighborhood,
        city: data.localidade || p.city,
        state: data.uf || p.state,
      }))
      setCepState("ok")
      numberRef.current?.focus()
    } catch {
      setCepState("error")
    }
  }

  const required = [v.name, v.document, v.phone, v.zip_code, v.street, v.number, v.neighborhood, v.city, v.state]
  const valid = required.every((x) => String(x).trim()) && onlyDigits(v.zip_code).length === 8

  function submit() {
    if (!valid) return
    startTransition(async () => {
      const fd = new FormData()
      for (const key of ["name", "document", "phone", "email", "zip_code", "street", "number", "complement", "neighborhood", "city", "state"] as const) {
        fd.set(key, String(v[key]).trim())
      }
      const result = await upsertSenderAddress(initial.id, fd)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (initial.id && v.isDefault && !initial.isDefault) await setDefaultSender(initial.id)
      toast.success(isEditing ? "Remetente atualizado" : "Remetente criado")
      router.push("/remetente")
      router.refresh()
    })
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteSenderAddress(initial.id!)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Remetente removido")
      router.push("/remetente")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-30 -mx-4 -mt-[max(1rem,env(safe-area-inset-top))] grid grid-cols-[96px_minmax(0,1fr)_96px] items-center border-b bg-background/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <Link href="/remetente" className="flex h-14 items-center px-3 text-base font-medium text-foreground/80">
          Cancelar
        </Link>
        <h1 className="truncate text-center text-[17px] font-bold">{isEditing ? "Editar remetente" : "Novo remetente"}</h1>
        <button
          type="button"
          onClick={submit}
          disabled={!valid || isPending}
          className="flex h-14 items-center justify-end px-3 text-base font-bold text-primary disabled:text-muted-foreground/60"
        >
          {isPending ? <Loader2 className="size-5 animate-spin" /> : "Salvar"}
        </button>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="flex flex-col gap-7 pt-6"
      >
        <Section title="Quem envia" hint="Obrigatório para o Melhor Envio emitir a etiqueta.">
          <Group>
            <Field label="Nome completo" value={v.name} onChange={(x) => set("name", x)} placeholder="Nome do remetente" />
            <Field label="CPF ou CNPJ" value={v.document} onChange={(x) => set("document", maskDoc(x))} placeholder="000.000.000-00" inputMode="numeric" mono />
          </Group>
        </Section>

        <Section title="Contato">
          <Group>
            <Field label="Celular" value={v.phone} onChange={(x) => set("phone", maskPhone(x))} placeholder="(00) 00000-0000" inputMode="tel" />
            <Field label="E-mail" value={v.email} onChange={(x) => set("email", x)} placeholder="email@exemplo.com" inputMode="email" />
          </Group>
        </Section>

        <Section title="Endereço" hint="Digite o CEP: rua, bairro, cidade e UF vêm sozinhos.">
          <Group>
            <label className="flex flex-col gap-1 px-4 py-3">
              <span className="text-xs font-semibold text-muted-foreground">CEP</span>
              <span className="flex items-center gap-2">
                <input
                  value={v.zip_code}
                  inputMode="numeric"
                  onChange={(e) => {
                    const masked = maskCep(e.target.value)
                    set("zip_code", masked)
                    setCepState("idle")
                    if (onlyDigits(masked).length === 8) lookupCep(masked)
                  }}
                  placeholder="00000-000"
                  className="min-w-0 grow bg-transparent font-mono text-[17px] font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60"
                />
                {cepState === "loading" && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                {cepState === "ok" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                    <Check className="size-3.5" strokeWidth={2.6} />
                    Endereço preenchido
                  </span>
                )}
                {cepState === "error" && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-destructive">
                    <X className="size-3.5" strokeWidth={2.6} />
                    CEP não encontrado
                  </span>
                )}
              </span>
            </label>
            <Field label="Rua" value={v.street} onChange={(x) => set("street", x)} placeholder="Rua, avenida…" />
            <div className="grid grid-cols-2 divide-x">
              <Field label="Número" value={v.number} onChange={(x) => set("number", x)} placeholder="123" inputMode="numeric" inputRef={numberRef} />
              <Field label="Complemento" value={v.complement} onChange={(x) => set("complement", x)} placeholder="Apto, bloco…" />
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_64px] divide-x">
              <Field label="Bairro" value={v.neighborhood} onChange={(x) => set("neighborhood", x)} placeholder="Bairro" />
              <Field label="Cidade" value={v.city} onChange={(x) => set("city", x)} placeholder="Cidade" />
              <Field label="UF" value={v.state} onChange={(x) => set("state", x.toUpperCase().slice(0, 2))} placeholder="UF" />
            </div>
          </Group>
        </Section>

        {isEditing && (
          <div className="overflow-hidden rounded-[20px] border bg-card">
            <button
              type="button"
              role="switch"
              aria-checked={v.isDefault}
              disabled={initial.isDefault}
              onClick={() => set("isDefault", !v.isDefault)}
              className="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-80"
            >
              <span className="flex grow flex-col gap-0.5">
                <span className="text-[15px] text-foreground/85">Remetente padrão</span>
                <span className="text-xs text-muted-foreground">
                  {initial.isDefault ? "Este já é o padrão. Para trocar, escolha outro." : "Usado em todos os envios"}
                </span>
              </span>
              <span className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full", v.isDefault ? "bg-primary" : "bg-muted-foreground/30")}>
                <span className={cn("absolute top-0.5 size-[27px] rounded-full bg-white shadow", v.isDefault ? "left-[22px]" : "left-0.5")} />
              </span>
            </button>
          </div>
        )}

        {isEditing && canDelete && (
          confirmDelete ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 p-4">
              <span className="text-sm">Remover este remetente? Não dá para desfazer.</span>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="h-11 rounded-xl border bg-card text-sm font-semibold">
                  Voltar
                </button>
                <button type="button" onClick={remove} disabled={isPending} className="h-11 rounded-xl bg-destructive text-sm font-bold text-white disabled:opacity-60">
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-[54px] items-center justify-center gap-2 rounded-2xl border border-destructive/35 bg-destructive/10 text-base font-semibold text-destructive"
            >
              <Trash2 className="size-[18px]" />
              Remover remetente
            </button>
          )
        )}
        {isEditing && initial.isDefault && (
          <span className="-mt-4 text-center text-xs text-muted-foreground">O padrão só pode ser removido depois de escolher outro.</span>
        )}

        <button
          type="submit"
          disabled={!valid || isPending}
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
        >
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {isEditing ? "Salvar alterações" : "Cadastrar remetente"}
        </button>
      </form>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-[13px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      {children}
      {hint && <span className="px-1 text-[13px] text-muted-foreground">{hint}</span>}
    </section>
  )
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">{children}</div>
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  mono,
  inputRef,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  mono?: boolean
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 px-4 py-3">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        ref={inputRef}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-w-0 bg-transparent text-base font-semibold outline-none placeholder:font-normal placeholder:text-muted-foreground/60",
          mono && "font-mono",
        )}
      />
    </label>
  )
}
