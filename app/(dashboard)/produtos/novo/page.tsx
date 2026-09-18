import { ProductForm } from "@/components/product-form"
import { MobileProductForm } from "@/components/mobile/products/product-form-mobile"

export default function NovoProdutoPage() {
  return (
    <>
      <div className="md:hidden">
        <MobileProductForm />
      </div>
      <div className="hidden md:block">
        <ProductForm />
      </div>
    </>
  )
}
