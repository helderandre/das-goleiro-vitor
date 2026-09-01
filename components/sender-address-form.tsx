"use client"

import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Star, Trash2, MapPin } from "lucide-react"
import { toast } from "sonner"
import {
  upsertSenderAddress,
  deleteSenderAddress,
  setDefaultSender,
} from "@/app/(dashboard)/remetente/actions"

interface SenderAddress {
  id: string
  name: string
  phone: string
  email: string
  document: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  zip_code: string
  is_default: boolean
  created_at: string | null
}

interface SenderAddressFormProps {
  sender: SenderAddress | null
  allSenders: SenderAddress[]
}

export function SenderAddressForm({ sender, allSenders }: SenderAddressFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isAdding, setIsAdding] = useState(false)
  const router = useRouter()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertSenderAddress(sender?.id ?? null, formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(sender ? "Remetente atualizado" : "Remetente criado")
        setIsAdding(false)
        router.refresh()
      }
    })
  }

  function handleNewSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await upsertSenderAddress(null, formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Novo remetente adicionado")
        setIsAdding(false)
        router.refresh()
      }
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSenderAddress(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Remetente removido")
        router.refresh()
      }
    })
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      const result = await setDefaultSender(id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Remetente padrão atualizado")
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Default sender form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {sender ? "Remetente Padrão" : "Cadastrar Remetente"}
          </CardTitle>
          <CardDescription>
            Este endereço será usado como remetente nas etiquetas do Melhor Envio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={sender?.name ?? ""}
                  placeholder="Nome do remetente"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={sender?.email ?? ""}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={sender?.phone ?? ""}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="document">CPF/CNPJ</Label>
                <Input
                  id="document"
                  name="document"
                  defaultValue={sender?.document ?? ""}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="street">Rua / Logradouro</Label>
                <Input
                  id="street"
                  name="street"
                  defaultValue={sender?.street ?? ""}
                  placeholder="Rua, Avenida..."
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  name="number"
                  defaultValue={sender?.number ?? ""}
                  placeholder="123"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  name="complement"
                  defaultValue={sender?.complement ?? ""}
                  placeholder="Apto, Bloco..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  name="neighborhood"
                  defaultValue={sender?.neighborhood ?? ""}
                  placeholder="Bairro"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  defaultValue={sender?.city ?? ""}
                  placeholder="Cidade"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={2}
                  defaultValue={sender?.state ?? ""}
                  placeholder="SP"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  name="zip_code"
                  defaultValue={sender?.zip_code ?? ""}
                  placeholder="00000-000"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {sender ? "Salvar Alterações" : "Cadastrar Remetente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Other senders list */}
      {allSenders.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Outros Remetentes</CardTitle>
            <CardDescription>
              Clique na estrela para definir como padrão.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {allSenders
              .filter((s) => !s.is_default)
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-start justify-between gap-4 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-muted-foreground">
                      {s.street}, {s.number}
                      {s.complement ? ` - ${s.complement}` : ""}
                    </p>
                    <p className="text-muted-foreground">
                      {s.neighborhood}, {s.city} - {s.state} | CEP: {s.zip_code}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetDefault(s.id)}
                      disabled={isPending}
                      title="Definir como padrão"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id)}
                      disabled={isPending}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Add new sender */}
      {!isAdding ? (
        <Button variant="outline" onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar outro remetente
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Novo Remetente</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleNewSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="new-name">Nome completo</Label>
                  <Input id="new-name" name="name" placeholder="Nome" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-email">E-mail</Label>
                  <Input id="new-email" name="email" type="email" placeholder="email@exemplo.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-phone">Telefone</Label>
                  <Input id="new-phone" name="phone" placeholder="(11) 99999-9999" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-document">CPF/CNPJ</Label>
                  <Input id="new-document" name="document" placeholder="000.000.000-00" required />
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 grid gap-2">
                  <Label htmlFor="new-street">Rua / Logradouro</Label>
                  <Input id="new-street" name="street" placeholder="Rua, Avenida..." required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-number">Número</Label>
                  <Input id="new-number" name="number" placeholder="123" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-complement">Complemento</Label>
                  <Input id="new-complement" name="complement" placeholder="Apto, Bloco..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-neighborhood">Bairro</Label>
                  <Input id="new-neighborhood" name="neighborhood" placeholder="Bairro" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-city">Cidade</Label>
                  <Input id="new-city" name="city" placeholder="Cidade" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-state">Estado (UF)</Label>
                  <Input id="new-state" name="state" maxLength={2} placeholder="SP" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-zip_code">CEP</Label>
                  <Input id="new-zip_code" name="zip_code" placeholder="00000-000" required />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
