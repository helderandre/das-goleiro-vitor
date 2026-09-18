"use client"

import { useEditor, EditorContent, ReactNodeViewRenderer } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import ImageExtension from "@tiptap/extension-image"
import LinkExtension from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TextAlign from "@tiptap/extension-text-align"
import UnderlineExtension from "@tiptap/extension-underline"
import Highlight from "@tiptap/extension-highlight"
import { ButtonBlock } from "./extensions/button-block"
import { VideoBlock } from "./extensions/video-block"
import { ImageGallery } from "./extensions/image-gallery"
import { EditorToolbar } from "./editor-toolbar"
import { ButtonBlockView } from "./node-views/button-block-view"
import { VideoBlockView } from "./node-views/video-block-view"
import { ImageGalleryView } from "./node-views/image-gallery-view"
import { EditorUi } from "./extensions/editor-ui"
import { ProductCard } from "./extensions/product-card"
import {
  MobileButtonBlockView,
  MobileGalleryBlockView,
  MobileVideoBlockView,
  ProductCardView,
} from "./mobile/block-views"
import { MobileEditorToolbar } from "./mobile/mobile-toolbar"
import {
  BookLinkChooser,
  insertBookLink,
  matchBookLink,
  useStoreBooks,
  type StoreBook,
} from "./book-link"
import { createClient } from "@/lib/supabase/client"
import { compressImage } from "@/lib/compress-image"
import { toast } from "sonner"
import { useCallback, useEffect, useRef, useState } from "react"
import "./tiptap-editor.css"

export interface ExistingImage {
  url: string
  name: string
}

interface TipTapEditorProps {
  content?: string
  postId: string
  onChange?: (html: string) => void
  existingImages?: ExistingImage[]
  /** mobile: barra presa acima do teclado e blocos editados em sheets. */
  variant?: "desktop" | "mobile"
}

export function TipTapEditor({
  content,
  postId,
  onChange,
  existingImages = [],
  variant = "desktop",
}: TipTapEditorProps) {
  const supabase = createClient()
  const mobile = variant === "mobile"

  // Link de livro colado: guarda até a pessoa escolher Cartão, Link ou Botão.
  const books = useStoreBooks()
  const booksRef = useRef<StoreBook[]>([])
  useEffect(() => {
    booksRef.current = books
  }, [books])
  const [pendingBook, setPendingBook] = useState<{ url: string; book: StoreBook } | null>(null)

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const compressed = await compressImage(file)
      const ext = compressed.name.split(".").pop()
      const path = `${postId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("blog")
        .upload(path, compressed, { contentType: compressed.type })

      if (uploadError) {
        toast.error("Erro ao fazer upload da imagem")
        return null
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("blog").getPublicUrl(path)

      // Register in blog_images table
      await supabase.from("blog_images").insert({
        post_id: postId,
        image_url: publicUrl,
        storage_path: path,
        file_name: compressed.name,
        file_size: compressed.size,
        is_used: true,
      })

      return publicUrl
    },
    [postId, supabase],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      ImageExtension.configure({
        allowBase64: false,
        HTMLAttributes: { class: "editor-image" },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: "editor-link" },
      }),
      Placeholder.configure({
        placeholder: "Comece a escrever o conteúdo do post...",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      UnderlineExtension,
      Highlight.configure({ multicolor: false }),
      ButtonBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(mobile ? MobileButtonBlockView : ButtonBlockView)
        },
      }),
      VideoBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(mobile ? MobileVideoBlockView : VideoBlockView)
        },
      }),
      ImageGallery.extend({
        addNodeView() {
          return ReactNodeViewRenderer(mobile ? MobileGalleryBlockView : ImageGalleryView)
        },
      }),
      ProductCard.extend({
        addNodeView() {
          return ReactNodeViewRenderer(ProductCardView)
        },
      }),
      EditorUi.configure({ mobile }),
    ],
    content: content ?? "",
    editorProps: {
      attributes: {
        class: mobile ? "tiptap-content tiptap-mobile" : "tiptap-content",
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? ""
        const match = matchBookLink(text, booksRef.current)
        if (!match) return false
        setPendingBook(match)
        return true
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const galleryStorage = (editor.storage as any).imageGallery
      galleryStorage.uploadImage = uploadImage
      galleryStorage.existingImages = existingImages.map((img) => ({
        url: img.url,
        name: img.name,
      }))
    }
  }, [editor, uploadImage, existingImages])

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      const url = await uploadImage(file)
      if (url && editor) {
        editor.chain().focus().setImage({ src: url }).run()
      }
    }

    input.click()
  }, [editor, uploadImage])

  const handleGalleryInsert = useCallback(() => {
    if (editor) {
      editor.chain().focus().setImageGallery({ images: [] }).run()
    }
  }, [editor])

  const handleVideoInsert = useCallback(() => {
    if (editor) {
      editor.chain().focus().setVideoBlock({ src: "" }).run()
    }
  }, [editor])

  const handleButtonInsert = useCallback(() => {
    if (editor) {
      editor
        .chain()
        .focus()
        .setButtonBlock({
          label: "Clique aqui",
          url: "#",
          variant: "primary",
        })
        .run()
    }
  }, [editor])

  if (!editor) return null

  const chooser = pendingBook && (
    <BookLinkChooser
      book={pendingBook.book}
      floating={mobile}
      onPick={(mode) => {
        insertBookLink(editor, mode, pendingBook.url, pendingBook.book)
        setPendingBook(null)
      }}
      onDismiss={() => {
        insertBookLink(editor, "link", pendingBook.url, pendingBook.book)
        setPendingBook(null)
      }}
    />
  )

  if (mobile) {
    return (
      <div>
        <EditorContent editor={editor} />
        {chooser}
        <MobileEditorToolbar
          editor={editor}
          onImage={handleImageUpload}
          onGallery={handleGalleryInsert}
          onVideo={handleVideoInsert}
          onButton={handleButtonInsert}
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <EditorToolbar
        editor={editor}
        onImageUpload={handleImageUpload}
        onGalleryInsert={handleGalleryInsert}
        onVideoInsert={handleVideoInsert}
        onButtonInsert={handleButtonInsert}
      />
      {chooser && <div className="border-b p-3">{chooser}</div>}
      <EditorContent editor={editor} />
    </div>
  )
}
