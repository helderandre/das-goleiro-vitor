"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Loader2 } from "lucide-react"
import { createPost } from "./actions"
import { cn } from "@/lib/utils"

export function NewPostButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await createPost()
    })
  }

  return (
    <Button onClick={handleClick} disabled={isPending} className={cn(className)}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Novo Post
    </Button>
  )
}
