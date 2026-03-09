import { Node, mergeAttributes } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoBlock: {
      setVideoBlock: (attrs: { src: string }) => ReturnType
    }
  }
}

export const VideoBlock = Node.create({
  name: "videoBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="video-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "video-block",
        class: "video-block",
      }),
      [
        "iframe",
        {
          src: HTMLAttributes.src,
          frameborder: "0",
          allowfullscreen: "true",
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        },
      ],
    ]
  },

  addCommands() {
    return {
      setVideoBlock:
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
