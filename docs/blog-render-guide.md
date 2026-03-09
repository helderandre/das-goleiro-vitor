# Guia de Renderização de Artigos do Blog

O conteúdo dos posts é armazenado como HTML no campo `blog_posts.content`. Esse HTML contém elementos padrão (headings, parágrafos, listas, etc.) e **blocos customizados** (galeria, vídeo, botão).

Este documento explica como renderizar cada elemento no frontend público.

---

## Estrutura Geral

```html
<!-- O conteúdo é HTML puro, basta injetar com dangerouslySetInnerHTML -->
<article className="blog-content">
  <div dangerouslySetInnerHTML={{ __html: post.content }} />
</article>
```

> Aplique o CSS documentado abaixo ao container `.blog-content` para estilizar corretamente.

---

## Elementos Padrão

Todos vêm do TipTap StarterKit e extensões comuns:

| Elemento | Tag HTML | Observações |
|---|---|---|
| Título H1 | `<h1>` | Pode não aparecer (o título do post vem de `blog_posts.title`) |
| Título H2 | `<h2>` | Seções principais |
| Título H3 | `<h3>` | Subseções |
| Parágrafo | `<p>` | Texto normal |
| Negrito | `<strong>` | — |
| Itálico | `<em>` | — |
| Sublinhado | `<u>` | Via extensão Underline |
| Destaque | `<mark>` | Fundo amarelo |
| Lista não-ordenada | `<ul><li>` | Com `<p>` dentro de cada `<li>` |
| Lista ordenada | `<ol><li>` | Com `<p>` dentro de cada `<li>` |
| Citação | `<blockquote>` | Borda esquerda colorida |
| Código inline | `<code>` | Fundo cinza |
| Bloco de código | `<pre><code>` | — |
| Linha horizontal | `<hr>` | — |
| Link | `<a class="editor-link">` | `target` e `rel` não são definidos automaticamente |
| Imagem avulsa | `<img class="editor-image">` | URL pública do Supabase Storage |
| Alinhamento | atributo `style="text-align: ..."` | Em headings e parágrafos |

---

## Blocos Customizados

### 1. Galeria de Imagens

**Identificação:** `data-type="image-gallery"`

**HTML gerado pelo editor:**

```html
<div data-type="image-gallery" class="image-gallery" data-images='["url1","url2","url3"]'>
  <img src="url1" class="gallery-image" />
  <img src="url2" class="gallery-image" />
  <img src="url3" class="gallery-image" />
</div>
```

**Atributos importantes:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `data-images` | JSON string | Array de URLs das imagens (fonte principal) |

**Como renderizar (React):**

```tsx
function BlogGallery({ element }: { element: Element }) {
  const images: string[] = JSON.parse(
    element.getAttribute("data-images") ?? "[]"
  )

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 my-4">
      {images.map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          className="aspect-square w-full rounded-lg object-cover"
          loading="lazy"
        />
      ))}
    </div>
  )
}
```

**CSS mínimo:**

```css
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0;
}

.gallery-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 0.5rem;
}
```

---

### 2. Bloco de Vídeo (iframe)

**Identificação:** `data-type="video-block"`

**HTML gerado pelo editor:**

```html
<div data-type="video-block" class="video-block" src="https://www.youtube.com/embed/VIDEO_ID">
  <iframe
    src="https://www.youtube.com/embed/VIDEO_ID"
    frameborder="0"
    allowfullscreen="true"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  ></iframe>
</div>
```

**Atributos importantes:**

| Atributo | Tipo | Descrição |
|---|---|---|
| `src` | string | URL do vídeo embed (YouTube, Vimeo, etc.) |

**Como renderizar (React):**

```tsx
function BlogVideo({ src }: { src: string }) {
  return (
    <div className="my-4">
      <iframe
        src={src}
        className="aspect-video w-full rounded-lg"
        frameBorder="0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        loading="lazy"
      />
    </div>
  )
}
```

**CSS mínimo:**

```css
.video-block {
  margin: 1rem 0;
}

.video-block iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
}
```

---

### 3. Bloco de Botão (CTA)

**Identificação:** `data-type="button-block"`

O botão suporta 3 tipos de link: externo, post do blog e produto. O tipo é indicado pelo atributo `data-link-type`.

**HTML gerado pelo editor:**

```html
<!-- Link externo -->
<div data-type="button-block" data-link-type="external" label="Comprar Livro" url="https://loja.com" variant="primary">
  <a href="https://loja.com" class="btn btn-primary" target="_blank" rel="noopener">
    Comprar Livro
  </a>
</div>

<!-- Link para post do blog -->
<div data-type="button-block" data-link-type="blog" data-ref-slug="meu-primeiro-post" label="Ler Post" url="#" variant="primary">
  <a href="#" class="btn btn-primary" target="_blank" rel="noopener">
    Ler Post
  </a>
</div>

<!-- Link para produto -->
<div data-type="button-block" data-link-type="product" data-ref-slug="livro-goleiro" label="Ver Produto" url="#" variant="secondary">
  <a href="#" class="btn btn-secondary" target="_blank" rel="noopener">
    Ver Produto
  </a>
</div>
```

**Atributos importantes:**

| Atributo | Tipo | Valores | Descrição |
|---|---|---|---|
| `label` | string | — | Texto exibido no botão |
| `url` | string | — | Link de destino (usado apenas quando `data-link-type="external"`) |
| `variant` | string | `primary`, `secondary`, `outline` | Estilo visual |
| `data-link-type` | string | `external`, `blog`, `product` | Tipo de link. Determina como o frontend resolve a URL |
| `data-ref-slug` | string | — | Slug do post ou produto referenciado (vazio quando `external`) |

**Lógica de resolução de URL no frontend:**

| `data-link-type` | URL final |
|---|---|
| `external` | Usar o atributo `url` diretamente |
| `blog` | Montar a partir do slug: `/blog/{data-ref-slug}` |
| `product` | Montar a partir do slug: `/produtos/{data-ref-slug}` |

**Como renderizar (React):**

```tsx
function BlogButton({ label, url, variant, linkType, refSlug }: {
  label: string
  url: string
  variant: string
  linkType: string
  refSlug: string
}) {
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border text-foreground",
  }

  // Resolve a URL final com base no tipo de link
  let href = url
  if (linkType === "blog" && refSlug) {
    href = `/blog/${refSlug}`
  } else if (linkType === "product" && refSlug) {
    href = `/produtos/${refSlug}`
  }

  // Links internos (blog/product) não precisam de target="_blank"
  const isExternal = linkType === "external"

  return (
    <div className="my-4">
      <a
        href={href}
        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`inline-block rounded-lg px-6 py-2.5 font-medium no-underline text-center ${styles[variant] ?? styles.primary}`}
      >
        {label}
      </a>
    </div>
  )
}
```

**CSS mínimo:**

```css
.btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
}

.btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.btn-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.btn-outline {
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}
```

---

## CSS Completo para o Frontend

Copie este CSS e aplique ao container do artigo. Substitua `.blog-content` pelo seletor que usar:

```css
/* === Tipografia === */
.blog-content h1 {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.2;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.blog-content h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.blog-content h3 {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.4;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.blog-content p {
  margin-bottom: 0.75rem;
  line-height: 1.7;
}

/* === Listas === */
.blog-content ul,
.blog-content ol {
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.blog-content ul { list-style-type: disc; }
.blog-content ol { list-style-type: decimal; }
.blog-content li { margin-bottom: 0.25rem; }

/* === Citação === */
.blog-content blockquote {
  border-left: 3px solid hsl(var(--primary));
  padding-left: 1rem;
  margin-left: 0;
  margin-bottom: 0.75rem;
  font-style: italic;
  color: hsl(var(--muted-foreground));
}

/* === Código === */
.blog-content code {
  background-color: hsl(var(--muted));
  border-radius: 0.25rem;
  padding: 0.15rem 0.4rem;
  font-size: 0.875em;
}

.blog-content pre {
  background-color: hsl(var(--muted));
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
}

.blog-content pre code {
  background: none;
  padding: 0;
}

/* === Linha horizontal === */
.blog-content hr {
  border: none;
  border-top: 1px solid hsl(var(--border));
  margin: 1.5rem 0;
}

/* === Links === */
.blog-content a,
.blog-content .editor-link {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* === Imagem avulsa === */
.blog-content .editor-image,
.blog-content img:not(.gallery-image) {
  max-width: 100%;
  height: auto;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

/* === Destaque === */
.blog-content mark {
  background-color: hsl(50, 100%, 70%);
  border-radius: 0.15rem;
  padding: 0.1rem 0.2rem;
}

/* === Galeria de Imagens === */
.blog-content .image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0;
}

.blog-content .gallery-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 0.5rem;
}

/* === Bloco de Vídeo === */
.blog-content .video-block {
  margin: 1rem 0;
}

.blog-content .video-block iframe {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.5rem;
}

/* === Bloco de Botão === */
.blog-content .btn {
  display: inline-block;
  padding: 0.625rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  text-decoration: none;
  text-align: center;
}

.blog-content .btn-primary {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.blog-content .btn-secondary {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.blog-content .btn-outline {
  border: 1px solid hsl(var(--border));
  color: hsl(var(--foreground));
}
```

---

## Abordagem Recomendada: Renderização com Componentes React

Para mais controle (lazy loading, lightbox, analytics), parse o HTML e substitua os blocos customizados por componentes React:

```tsx
import parse, { domToReact, HTMLReactParserOptions, Element } from "html-react-parser"

function BlogContent({ html }: { html: string }) {
  const options: HTMLReactParserOptions = {
    replace(domNode) {
      if (!(domNode instanceof Element)) return

      // Galeria de Imagens
      if (domNode.attribs["data-type"] === "image-gallery") {
        const images = JSON.parse(domNode.attribs["data-images"] ?? "[]")
        return <BlogGallery images={images} />
      }

      // Bloco de Vídeo
      if (domNode.attribs["data-type"] === "video-block") {
        return <BlogVideo src={domNode.attribs.src} />
      }

      // Bloco de Botão
      if (domNode.attribs["data-type"] === "button-block") {
        return (
          <BlogButton
            label={domNode.attribs.label}
            url={domNode.attribs.url}
            variant={domNode.attribs.variant}
            linkType={domNode.attribs["data-link-type"] ?? "external"}
            refSlug={domNode.attribs["data-ref-slug"] ?? ""}
          />
        )
      }
    },
  }

  return <article className="blog-content">{parse(html, options)}</article>
}
```

> Instale: `npm install html-react-parser`

---

## Exemplo de Conteúdo Real

```html
<h2><strong>A ideia</strong></h2>
<p>A ideia surgiu em uma conversa com um amigo pastor.</p>

<h2><strong>O processo</strong></h2>
<div data-type="image-gallery" class="image-gallery" data-images='["https://storage.com/img1.webp","https://storage.com/img2.webp"]'>
  <img src="https://storage.com/img1.webp" class="gallery-image" />
  <img src="https://storage.com/img2.webp" class="gallery-image" />
</div>

<p>Escrever um livro não é para os fracos.</p>

<blockquote><p><strong>"Escrever é se despir da armadura."</strong></p></blockquote>

<div data-type="video-block" class="video-block" src="https://www.youtube.com/embed/djNKtbONGGg">
  <iframe src="https://www.youtube.com/embed/djNKtbONGGg" frameborder="0" allowfullscreen="true"></iframe>
</div>

<div data-type="button-block" data-link-type="product" data-ref-slug="livro-goleiro" label="Comprar Livro" url="#" variant="primary">
  <a href="#" class="btn btn-primary" target="_blank" rel="noopener">Comprar Livro</a>
</div>
```
