"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { sendOrderMessage, markMessagesAsRead } from "@/app/(dashboard)/pedidos/actions"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  message: string
  sender_role: string
  read_at: string | null
  created_at: string | null
}

interface OrderMessagesProps {
  orderId: string
  messages: Message[]
  unreadCount: number
}

export function OrderMessages({
  orderId,
  messages,
  unreadCount,
}: OrderMessagesProps) {
  const [text, setText] = useState("")
  const [isPending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (unreadCount > 0) {
      markMessagesAsRead(orderId)
    }
  }, [orderId, unreadCount])

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return

    setText("")
    startTransition(async () => {
      const result = await sendOrderMessage(orderId, trimmed)
      if (result.error) {
        toast.error(result.error)
        setText(trimmed)
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col">
      <div
        ref={scrollRef}
        className="flex flex-col gap-2 overflow-y-auto max-h-80 p-1"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma mensagem ainda.
          </p>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender_role === "admin"
            return (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                  isAdmin
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.message}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    isAdmin
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  )}
                >
                  {msg.created_at
                    ? new Date(msg.created_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                  {!isAdmin && !msg.read_at && " · não lida"}
                </p>
              </div>
            )
          })
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Textarea
          placeholder="Escreva uma mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="min-h-0 resize-none"
          disabled={isPending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={isPending || !text.trim()}
          className="shrink-0"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
