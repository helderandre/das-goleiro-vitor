"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, Loader2 } from "lucide-react"
import { deletePost } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DeletePostButtonProps {
  postId: string
  postTitle: string
  redirectTo?: string
}

export function DeletePostButton({
  postId,
  postTitle,
  redirectTo,
}: DeletePostButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(postId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Post excluído com sucesso")
        if (redirectTo) {
          router.push(redirectTo)
        } else {
          router.refresh()
        }
      }
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir post</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir &quot;{postTitle}&quot;? Todas as
            imagens associadas serão removidas. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
