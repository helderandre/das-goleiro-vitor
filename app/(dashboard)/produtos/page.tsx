import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
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
import { Plus, Pencil, ShoppingCart, Eye, XCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DeleteProductButton } from "./delete-button"

export default async function ProdutosPage() {
  const supabase = await createClient()

  const { data: products } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, image_url, is_cover")

  const { data: analytics } = await supabase
    .from("v_product_analytics")
    .select("product_id, total_add_to_cart, total_checkout_started, total_checkout_completed, abandoned_carts")

  const analyticsMap = new Map<string, {
    addToCart: number
    checkoutStarted: number
    checkoutCompleted: number
    abandoned: number
  }>()
  analytics?.forEach((a) => {
    if (a.product_id) {
      analyticsMap.set(a.product_id, {
        addToCart: Number(a.total_add_to_cart ?? 0),
        checkoutStarted: Number(a.total_checkout_started ?? 0),
        checkoutCompleted: Number(a.total_checkout_completed ?? 0),
        abandoned: Number(a.abandoned_carts ?? 0),
      })
    }
  })

  const coverMap = new Map<string, string>()
  images?.forEach((img) => {
    if (img.is_cover && img.product_id) {
      coverMap.set(img.product_id, img.image_url)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos do marketplace
          </p>
        </div>
        <Button asChild>
          <Link href="/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Produtos</CardTitle>
          <CardDescription>
            {products?.length ?? 0} produto(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!products || products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum produto cadastrado ainda.
              </p>
              <Button asChild className="mt-4">
                <Link href="/produtos/novo">Criar primeiro produto</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Imagem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Desconto</TableHead>
                  <TableHead className="text-center">Principal</TableHead>
                  <TableHead className="text-center">Carrinho</TableHead>
                  <TableHead className="text-center">Checkouts</TableHead>
                  <TableHead className="text-center">Abandonos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {coverMap.get(product.id) ? (
                        <img
                          src={coverMap.get(product.id)}
                          alt={product.title}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                          ?
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {product.product_type === "ebook"
                          ? "E-book"
                          : "Físico"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(product.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.stock ?? 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.discount_percent
                        ? `${product.discount_percent}%`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {product.is_main ? (
                        <Badge variant="default">Sim</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="inline-flex items-center gap-1 text-sm">
                              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                              {analyticsMap.get(product.id)?.addToCart ?? 0}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Adições ao carrinho</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm">
                        {analyticsMap.get(product.id)?.checkoutCompleted ?? 0}
                        <span className="text-muted-foreground">
                          /{analyticsMap.get(product.id)?.checkoutStarted ?? 0}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {(analyticsMap.get(product.id)?.abandoned ?? 0) > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="mr-1 h-3 w-3" />
                          {analyticsMap.get(product.id)?.abandoned}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/produtos/${product.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <DeleteProductButton
                          productId={product.id}
                          productTitle={product.title}
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
