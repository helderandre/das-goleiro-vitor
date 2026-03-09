import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    buttonBlock: {
      setButtonBlock: (attrs: {
        label: string
        url: string
        variant?: string
        linkType?: string
        refSlug?: string
      }) => ReturnType
    }
  }
}

export const ButtonBlock = Node.create({
  name: "buttonBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      label: { default: "Clique aqui" },
      url: { default: "#" },
      variant: { default: "primary" },
      linkType: {
        default: "external",
        parseHTML: (element) => element.getAttribute("data-link-type") ?? "external",
        renderHTML: () => ({}), // rendered manually in renderHTML
      },
      refSlug: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-ref-slug") ?? "",
        renderHTML: () => ({}), // rendered manually in renderHTML
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="button-block"]' }]
  },

  renderHTML({ node }) {
    const { label, url, variant, linkType, refSlug } = node.attrs
    return [
      "div",
      {
        "data-type": "button-block",
        "data-link-type": linkType,
        "data-ref-slug": refSlug || undefined,
        label,
        url,
        variant,
      },
      [
        "a",
        {
          href: url,
          class: `btn btn-${variant}`,
          target: "_blank",
          rel: "noopener",
        },
        label,
      ],
    ]
  },

  addCommands() {
    return {
      setButtonBlock:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
