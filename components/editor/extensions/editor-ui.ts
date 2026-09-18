import { Extension } from "@tiptap/core"

/**
 * Guarda em que interface o editor está. Os blocos (botão, vídeo, galeria)
 * leem daqui: no mobile abrem sheets em vez da edição inline do desktop.
 */
export const EditorUi = Extension.create<{ mobile: boolean }, { mobile: boolean }>({
  name: "editorUi",
  addOptions() {
    return { mobile: false }
  },
  addStorage() {
    return { mobile: this.options.mobile }
  },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isMobileEditor = (editor: { storage: any }) => !!editor.storage.editorUi?.mobile
