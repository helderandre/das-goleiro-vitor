import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageGallery: {
      setImageGallery: (attrs: { images: string[] }) => ReturnType
    }
  }
}

export const ImageGallery = Node.create({
  name: "imageGallery",
  group: "block",
  atom: true,

  addStorage() {
    return {
      uploadImage: null as ((file: File) => Promise<string | null>) | null,
      existingImages: [] as { url: string; name: string }[],
    }
  },

  addAttributes() {
    return {
      images: {
        default: [],
        parseHTML: (element) => {
          const raw = element.getAttribute("data-images")
          try {
            return JSON.parse(raw ?? "[]")
          } catch {
            return []
          }
        },
        renderHTML: (attributes) => ({
          "data-images": JSON.stringify(attributes.images),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-gallery"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    // HTMLAttributes already contains "data-images" as a JSON string
    // from the attribute's renderHTML, so we parse it back
    let images: string[] = []
    try {
      images = JSON.parse(HTMLAttributes["data-images"] ?? "[]")
    } catch {
      images = []
    }

    const children = images.map((src: string) => [
      "img",
      { src, class: "gallery-image" },
    ])

    return [
      "div",
      mergeAttributes(
        { "data-type": "image-gallery", class: "image-gallery" },
        HTMLAttributes,
      ),
      ...children,
    ]
  },

  addCommands() {
    return {
      setImageGallery:
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
