"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createEvent, updateEvent } from "@/app/(dashboard)/agenda/actions"
import { ArrowLeft, Loader2, Upload, X, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface EventFormProps {
  event?: {
    id: string
    title: string
    description: string | null
    event_type: string | null
    location_type: string | null
    location_name: string | null
    city: string | null
    state: string | null
    start_date: string
    end_date: string | null
    external_link: string | null
    contact_name: string | null
    contact_phone: string | null
    status: string | null
    cover_url: string | null
  }
}

function toDateTimeLocal(iso: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function EventForm({ event }: EventFormProps) {
  const [isPending, startTransition] = useTransition()
  const [locationType, setLocationType] = useState(
    event?.location_type ?? "presencial",
  )
  const [coverPreview, setCoverPreview] = useState<string | null>(
    event?.cover_url ?? null,
  )
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const isEditing = !!event

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  function handleRemoveCover() {
    setCoverFile(null)
    setCoverPreview(null)
  }

  function handleSubmit(formData: FormData) {
    if (coverFile) {
      formData.set("cover", coverFile)
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateEvent(event.id, formData)
        : await createEvent(formData)

      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/agenda">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Editar Evento" : "Novo Evento"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? "Atualize as informações do evento"
              : "Preencha os dados do novo evento"}
          </p>
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={event?.title}
                  placeholder="Nome do evento"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={event?.description ?? ""}
                  placeholder="Descrição do evento"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="event_type">Tipo</Label>
                  <Select
                    name="event_type"
                    defaultValue={event?.event_type ?? "palestra"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="palestra">Palestra</SelectItem>
                      <SelectItem value="missao">Missão</SelectItem>
                      <SelectItem value="clinica">Clínica</SelectItem>
                      <SelectItem value="culto">Culto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    defaultValue={event?.status ?? "confirmado"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="a confirmar">A Confirmar</SelectItem>
                      <SelectItem value="em-andamento">Em Andamento</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Local</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Modalidade</Label>
                <Select
                  name="location_type"
                  value={locationType}
                  onValueChange={setLocationType}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {locationType === "presencial" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="location_name">Nome do Local</Label>
                    <Input
                      id="location_name"
                      name="location_name"
                      defaultValue={event?.location_name ?? ""}
                      placeholder="Ex: Igreja Central, Ginásio Municipal"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        name="city"
                        defaultValue={event?.city ?? ""}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input
                        id="state"
                        name="state"
                        defaultValue={event?.state ?? ""}
                        placeholder="UF"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid gap-2">
                <Label htmlFor="external_link">Link Externo</Label>
                <Input
                  id="external_link"
                  name="external_link"
                  type="url"
                  defaultValue={event?.external_link ?? ""}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Datas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Início</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(event?.start_date ?? null)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Fim (opcional)</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="datetime-local"
                  defaultValue={toDateTimeLocal(event?.end_date ?? null)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imagem de Capa</CardTitle>
            </CardHeader>
            <CardContent>
              {coverPreview ? (
                <div className="relative">
                  <img
                    src={coverPreview}
                    alt="Capa"
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                  <div className="absolute right-2 top-2 flex gap-1">
                    <label className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      <Upload className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                      />
                    </label>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleRemoveCover}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-sm">Adicionar capa</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="contact_name">Nome</Label>
                <Input
                  id="contact_name"
                  name="contact_name"
                  defaultValue={event?.contact_name ?? ""}
                  placeholder="Pessoa de contato"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact_phone">Telefone</Label>
                <Input
                  id="contact_phone"
                  name="contact_phone"
                  defaultValue={event?.contact_phone ?? ""}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditing ? "Salvar Alterações" : "Criar Evento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/agenda")}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
