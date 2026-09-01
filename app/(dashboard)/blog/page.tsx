import { createClient } from "@/lib/supabase/server"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil } from "lucide-react"
import Link from "next/link"
import { DeletePostButton } from "./delete-button"
import { NewPostButton } from "./new-post-button"

const categoryColors: Record<string, string> = {
  Esporte: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Fé": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Social: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Viagens: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
}

export default async function BlogPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Blog</h1>
          <p className="text-muted-foreground">
            Gerencie os posts do blog
          </p>
        </div>
        <NewPostButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Posts</CardTitle>
          <CardDescription>
            {posts?.length ?? 0} post(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!posts || posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum post criado ainda.
              </p>
              <NewPostButton className="mt-4" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 hidden sm:table-cell">Capa</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden lg:table-cell">Categorias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="hidden sm:table-cell">
                      {post.cover_url ? (
                        <img
                          src={post.cover_url}
                          alt={post.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words">
                      <p className="font-medium">{post.title}</p>
                      {post.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {post.excerpt}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {post.categories?.map((cat) => (
                          <span
                            key={cat}
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColors[cat] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.status === "published" ? (
                        <Badge variant="default">Publicado</Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden md:table-cell">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("pt-BR")
                        : post.created_at
                          ? new Date(post.created_at).toLocaleDateString("pt-BR")
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/blog/${post.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeletePostButton
                          postId={post.id}
                          postTitle={post.title}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
