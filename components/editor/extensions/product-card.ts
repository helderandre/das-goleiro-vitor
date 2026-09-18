import { Node } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    productCard: {
      setProductCard: (attrs: ProductCardAttrs) => ReturnType
    }
  }
}

export interface ProductCardAttrs {
  slug: string
  /** Link colado no editor; é o destino do cartão no site. */
  url: string
  title: string
  cover: string | null
  /** Preço com desconto, já formatado ("R$ 39,90"). */
  price: string
  /** Preço cheio riscado quando há desconto. */
  oldPrice: string | null
}

/**
 * Cartão de livro da loja. O HTML sai com estilos inline e link real para
 * funcionar no site mesmo sem CSS próprio para o bloco.
 */
export const ProductCard = Node.create({
  name: "productCard",
  group: "block",
  atom: true,

  addAttributes() {
    const attr = (name: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(`data-${name}`),
      renderHTML: () => ({}),
    })
    return {
      slug: attr("ref-slug"),
      url: attr("url"),
      title: attr("title"),
      cover: attr("cover"),
      price: attr("price"),
      oldPrice: attr("old-price"),
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="product-card"]' }]
  },

  renderHTML({ node }) {
    const { slug, url, title, cover, price, oldPrice } = node.attrs as ProductCardAttrs
    return [
      "div",
      {
        "data-type": "product-card",
        "data-link-type": "product",
        "data-ref-slug": slug,
        "data-url": url,
        "data-title": title,
        "data-cover": cover ?? undefined,
        "data-price": price,
        "data-old-price": oldPrice ?? undefined,
      },
      [
        "a",
        {
          href: url,
          class: "product-card",
          style:
            "display:flex;gap:14px;align-items:center;padding:12px;border:1px solid rgba(127,127,127,.3);border-radius:16px;text-decoration:none;color:inherit;",
        },
        ...(cover
          ? [["img", { src: cover, alt: title, style: "width:72px;height:100px;object-fit:cover;border-radius:8px;flex-shrink:0;" }]]
          : []),
        [
          "span",
          { style: "display:flex;flex-direction:column;gap:6px;" },
          ["strong", { style: "font-size:16px;line-height:1.3;" }, title],
          [
            "span",
            {},
            ["strong", {}, price],
            ...(oldPrice ? [" ", ["s", { style: "opacity:.6;font-size:13px;" }, oldPrice]] : []),
          ],
          ["span", { class: "btn btn-primary", style: "align-self:flex-start;" }, "Comprar"],
        ],
      ],
    ]
  },

  addCommands() {
    return {
      setProductCard:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    }
  },
})
