"use client"

import * as React from "react"
import type { Editor } from "@tiptap/react"
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Heading,
  Highlighter,
  ImageIcon,
  Images,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MousePointerClick,
  Plus,
  Quote,
  Redo2,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer"

/**
 * Distância entre o fim da tela e o topo do teclado virtual, para a barra
 * ficar presa em cima dele (iOS e Android redimensionam o visualViewport).
 */
function useKeyboardInset() {
  const [inset, setInset] = React.useState(0)
  React.useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [])
  return inset
}

/** Re-renderiza a barra quando a seleção muda (estados ativos dos botões). */
function useEditorTick(editor: Editor) {
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const bump = () => setTick((t) => t + 1)
    editor.on("selectionUpdate", bump)
    editor.on("transaction", bump)
    return () => {
      editor.off("selectionUpdate", bump)
      editor.off("transaction", bump)
    }
  }, [editor])
}

export function MobileEditorToolbar({
  editor,
  onImage,
  onGallery,
  onVideo,
  onButton,
}: {
  editor: Editor
  onImage: () => void
  onGallery: () => void
  onVideo: () => void
  onButton: () => void
}) {
  useEditorTick(editor)
  const inset = useKeyboardInset()
  const [panel, setPanel] = React.useState<"blocos" | "texto" | null>(null)
  const [linkOpen, setLinkOpen] = React.useState(false)
  const chain = () => editor.chain().focus()

  const insert = (fn: () => void) => () => {
    setPanel(null)
    fn()
  }

  const blocks = [
    { icon: ImageIcon, label: "Imagem", run: onImage },
    { icon: Images, label: "Galeria", run: onGallery },
    { icon: Video, label: "Vídeo", run: onVideo },
    { icon: MousePointerClick, label: "Botão", run: onButton },
    { icon: Heading, label: "Título", run: () => chain().toggleHeading({ level: 2 }).run() },
    { icon: List, label: "Lista", run: () => chain().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numerada", run: () => chain().toggleOrderedList().run() },
    { icon: Quote, label: "Citação", run: () => chain().toggleBlockquote().run() },
    { icon: Minus, label: "Separador", run: () => chain().setHorizontalRule().run() },
    { icon: Code, label: "Código", run: () => chain().toggleCodeBlock().run() },
  ]

  const headingLevel = [1, 2, 3].find((l) => editor.isActive("heading", { level: l }))

  return (
    <>
      <div
        className="fixed inset-x-0 z-40 rounded-t-[22px] border-t bg-card md:hidden"
        style={{ bottom: inset }}
        // Não tira o foco do editor ao tocar nos botões.
        onMouseDown={(e) => e.preventDefault()}
      >
        {panel === "blocos" && (
          <div className="flex flex-col gap-3 px-3.5 pt-4 pb-1.5">
            <span className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold">Inserir bloco</span>
              <span className="text-xs text-muted-foreground">entra onde está o cursor</span>
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {blocks.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={insert(b.run)}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border bg-muted/60 px-1 py-2.5 text-[11px] font-semibold"
                >
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <b.icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {panel === "texto" && (
          <div className="flex flex-col gap-2 px-3.5 pt-4 pb-1.5">
            <span className="text-[15px] font-bold">Texto</span>
            <div className="grid grid-cols-4 gap-1.5">
              <Pill on={!headingLevel} onClick={() => chain().setParagraph().run()}>Parágrafo</Pill>
              {([1, 2, 3] as const).map((l) => (
                <Pill key={l} on={headingLevel === l} onClick={() => chain().toggleHeading({ level: l }).run()}>
                  Título {l}
                </Pill>
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              <Fmt icon={Bold} label="Negrito" on={editor.isActive("bold")} onClick={() => chain().toggleBold().run()} />
              <Fmt icon={Italic} label="Itálico" on={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()} />
              <Fmt icon={Underline} label="Sublinhado" on={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()} />
              <Fmt icon={Strikethrough} label="Tachado" on={editor.isActive("strike")} onClick={() => chain().toggleStrike().run()} />
              <Fmt icon={Highlighter} label="Destaque" on={editor.isActive("highlight")} onClick={() => chain().toggleHighlight().run()} />
              <Fmt icon={Link2} label="Link" on={editor.isActive("link")} onClick={() => setLinkOpen(true)} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Fmt icon={AlignLeft} label="Alinhar à esquerda" on={editor.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()} />
              <Fmt icon={AlignCenter} label="Centralizar" on={editor.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()} />
              <Fmt icon={AlignRight} label="Alinhar à direita" on={editor.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()} />
            </div>
          </div>
        )}

        <div
          role="toolbar"
          aria-label="Editor"
          className={cn("flex items-center gap-1 px-2.5 pt-2.5", inset > 0 ? "pb-2.5" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]")}
        >
          <TogglePill icon={Plus} label="Inserir" on={panel === "blocos"} onClick={() => setPanel((p) => (p === "blocos" ? null : "blocos"))} />
          <TogglePill icon={Type} label="Aa" on={panel === "texto"} onClick={() => setPanel((p) => (p === "texto" ? null : "texto"))} />
          <span className="mx-1 h-[26px] w-px shrink-0 bg-border" />
          <Quick icon={Bold} label="Negrito" on={editor.isActive("bold")} onClick={() => chain().toggleBold().run()} />
          <Quick icon={Italic} label="Itálico" on={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()} />
          <Quick icon={Link2} label="Link" on={editor.isActive("link")} onClick={() => setLinkOpen(true)} />
          <span className="grow" />
          <Quick icon={Undo2} label="Desfazer" disabled={!editor.can().undo()} onClick={() => chain().undo().run()} />
          <Quick icon={Redo2} label="Refazer" disabled={!editor.can().redo()} onClick={() => chain().redo().run()} />
        </div>
      </div>

      <LinkSheet editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
    </>
  )
}

function TogglePill({
  icon: Icon,
  label,
  on,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={on}
      onClick={onClick}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-[13px] px-3 text-sm font-bold",
        on ? "bg-primary text-primary-foreground" : "bg-muted",
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2.2} />
      {label}
    </button>
  )
}

function Quick({
  icon: Icon,
  label,
  on,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  on?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-30", on && "bg-primary/15 text-primary")}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  )
}

function Fmt(props: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  on: boolean
  onClick: () => void
}) {
  const Icon = props.icon
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.on}
      onClick={props.onClick}
      className={cn("flex h-12 items-center justify-center rounded-[14px]", props.on ? "bg-primary text-primary-foreground" : "bg-muted/60")}
    >
      <Icon className="size-5" strokeWidth={2} />
    </button>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("h-11 rounded-[13px] text-sm", on ? "bg-primary font-extrabold text-primary-foreground" : "bg-muted/60 font-semibold")}
    >
      {children}
    </button>
  )
}

function LinkSheet({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  const current = (editor.getAttributes("link").href as string | undefined) ?? ""
  const [value, setValue] = React.useState(current)
  const [lastOpen, setLastOpen] = React.useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) setValue(current)
  }
  const hasSelection = !editor.state.selection.empty

  function apply() {
    const href = value.trim()
    const c = editor.chain().focus().extendMarkRange("link")
    if (!href) c.unsetLink().run()
    else {
      const url = /^(https?:|mailto:|tel:|\/)/.test(href) ? href : `https://${href}`
      if (hasSelection || editor.isActive("link")) c.setLink({ href: url }).run()
      else c.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] }).run()
    }
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="gap-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-1 pt-4">
          <DrawerTitle className="text-xl font-extrabold">Link</DrawerTitle>
          <DrawerDescription className="text-[13px]">
            {hasSelection || current ? "Aplica no texto selecionado." : "Sem texto selecionado: o próprio endereço entra no texto."}
          </DrawerDescription>
        </div>
        <label className="flex flex-col gap-1 rounded-2xl bg-muted/60 px-3.5 py-3">
          <span className="text-xs font-semibold text-muted-foreground">Endereço</span>
          <input
            type="url"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
            placeholder="https://…"
            className="bg-transparent text-[15px] outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().extendMarkRange("link").unsetLink().run()
              onOpenChange(false)
            }}
            disabled={!current}
            className="h-[50px] rounded-2xl border bg-muted/60 text-[15px] font-semibold disabled:opacity-40"
          >
            Remover link
          </button>
          <button type="button" onClick={apply} className="h-[50px] rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground">
            Aplicar
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
