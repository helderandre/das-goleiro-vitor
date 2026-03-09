# Dashboard Goleiro Vitor - Especificações de Implementação

> Dashboard administrativo para gerenciar a aplicação web (LP + Ecommerce + Agenda + Blog + Fale Conosco).
> Banco de dados: Supabase (projeto SUpabaseVitorGoleiro).

---

## Visão Geral do Banco de Dados

| Tabela           | Função                          |
| ---------------- | ------------------------------- |
| `profiles`       | Perfis de usuários (admin/user) |
| `products`       | Produtos (livros, e-books)      |
| `product_images` | Galeria de imagens por produto  |
| `orders`         | Pedidos de compra               |
| `order_items`    | Itens dos pedidos               |
| `cart_items`     | Carrinho de compras             |
| `cart_events`    | Analytics de conversão          |
| `events`         | Eventos da agenda               |
| `blog_posts`     | Posts do blog                   |
| `leads`          | Formulários de contato/convite  |
| `addresses`      | Endereços de entrega            |

**Views:** `v_cart_funnel`, `v_cart_additions`, `v_checkout_summary`

---

## SPEC-01: Fundação — Auth + Layout + Supabase

**Objetivo:** Configurar autenticação admin, layout do dashboard com sidebar, e conexão com Supabase.

### Tarefas

1. **Instalar dependências essenciais**
   - `@supabase/supabase-js`, `@supabase/ssr`
   - shadcn components: `sidebar`, `avatar`, `dropdown-menu`, `separator`, `sheet`, `tooltip`, `badge`, `input`, `label`, `card`, `table`, `dialog`, `select`, `textarea`, `tabs`, `skeleton`, `toast`/`sonner`

2. **Configurar Supabase client**
   - Criar `lib/supabase/client.ts` (browser client)
   - Criar `lib/supabase/server.ts` (server client para RSC/Route Handlers)
   - Criar `middleware.ts` para refresh de sessão
   - Configurar `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Gerar tipos TypeScript**
   - Usar MCP Supabase `generate_typescript_types` para criar `lib/supabase/database.types.ts`

4. **Implementar autenticação admin**
   - Criar página `/login` com email + senha
   - Middleware protegendo todas as rotas exceto `/login`
   - Verificação de `role = 'admin'` no profile
   - Redirect para `/login` se não autenticado ou não admin

5. **Criar layout do dashboard**
   - Layout com Sidebar (shadcn `Sidebar` component)
   - Menu items: Overview, Produtos, Pedidos, Blog, Agenda, Leads, Usuários
   - Header com avatar do admin, nome, botão de logout
   - Sidebar colapsável (mobile = sheet, desktop = fixa)
   - Breadcrumb de navegação
   - Theme toggle (dark/light)

6. **Criar página Overview (home)**
   - Cards de resumo: Total Produtos, Pedidos Pendentes, Posts no Blog, Eventos Próximos, Leads Novos
   - Dados buscados via Server Components diretamente do Supabase

### Arquivos Criados
```
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/database.types.ts
middleware.ts
app/login/page.tsx
app/(dashboard)/layout.tsx
app/(dashboard)/page.tsx
components/app-sidebar.tsx
components/nav-user.tsx
.env.local
```

### Critérios de Aceite
- [ ] Login funcional com email/senha
- [ ] Apenas usuários com `role = 'admin'` acessam o dashboard
- [ ] Sidebar navegável com todos os itens do menu
- [ ] Overview exibe contadores reais do banco
- [ ] Dark mode funcional
- [ ] Mobile responsivo

---

## SPEC-02: Gestão de Produtos (CRUD)

**Objetivo:** Permitir criar, editar, listar e excluir produtos e suas imagens.

### Tarefas

1. **Página de listagem `/produtos`**
   - Tabela com colunas: Imagem (cover), Título, Tipo, Preço, Estoque, Desconto, Principal, Ações
   - Filtros: por tipo (physical/ebook), busca por título
   - Ordenação por data de criação
   - Badge para produto principal (`is_main`)
   - Botão "Novo Produto"

2. **Formulário de criação/edição `/produtos/novo` e `/produtos/[id]/editar`**
   - Campos: título, slug (auto-gerado do título), descrição (textarea), preço, tipo (select: physical/ebook), estoque, desconto (%), produto principal (checkbox)
   - Validação com Zod
   - Upload de imagens para Supabase Storage (bucket `product-images`)
   - Marcar imagem de capa (`is_cover`)
   - Reordenar/remover imagens
   - Gerar slug automaticamente a partir do título

3. **Exclusão de produto**
   - Dialog de confirmação
   - Exclusão em cascata das imagens (storage + tabela `product_images`)
   - Verificar se produto tem pedidos vinculados antes de excluir

4. **Server Actions / Route Handlers**
   - `createProduct`, `updateProduct`, `deleteProduct`
   - `uploadProductImage`, `deleteProductImage`, `setCoverImage`

### Arquivos Criados
```
app/(dashboard)/produtos/page.tsx
app/(dashboard)/produtos/novo/page.tsx
app/(dashboard)/produtos/[id]/editar/page.tsx
app/(dashboard)/produtos/actions.ts
components/product-form.tsx
components/image-uploader.tsx
```

### Critérios de Aceite
- [ ] Listar todos os produtos com imagem, preço e status
- [ ] Criar produto com upload de múltiplas imagens
- [ ] Editar produto existente (dados + imagens)
- [ ] Excluir produto com confirmação
- [ ] Slug gerado automaticamente
- [ ] Validação de formulário funcional

---

## SPEC-03: Gestão de Pedidos

**Objetivo:** Visualizar pedidos, alterar status e ver detalhes.

### Tarefas

1. **Página de listagem `/pedidos`**
   - Tabela: Short ID, Cliente (nome do profile), Total, Status, Data, Ações
   - Filtros por status: pending, paid, shipped, delivered, cancelled
   - Busca por short_id ou nome do cliente
   - Badge colorido por status
   - Ordenação por data (mais recentes primeiro)

2. **Página de detalhes `/pedidos/[id]`**
   - Informações do pedido: ID, short_id, data, status, total
   - Lista de itens: produto, quantidade, preço unitário, subtotal
   - Endereço de entrega (parsed do JSON `shipping_address`)
   - Dados do cliente (nome, email, telefone via join com profiles)
   - Timeline de status
   - Select para alterar status do pedido

3. **Alterar status do pedido**
   - Select com opções: pending → paid → shipped → delivered / cancelled
   - Server Action para update
   - Toast de confirmação

### Arquivos Criados
```
app/(dashboard)/pedidos/page.tsx
app/(dashboard)/pedidos/[id]/page.tsx
app/(dashboard)/pedidos/actions.ts
components/order-status-badge.tsx
components/order-timeline.tsx
```

### Critérios de Aceite
- [ ] Listar todos os pedidos com dados do cliente
- [ ] Filtrar por status
- [ ] Ver detalhes completos do pedido
- [ ] Alterar status com feedback visual
- [ ] Exibir endereço de entrega formatado

---

## SPEC-04: Gestão do Blog (CRUD)

**Objetivo:** Criar, editar, listar e excluir posts do blog.

### Tarefas

1. **Página de listagem `/blog`**
   - Tabela: Cover, Título, Categorias (badges), Data de publicação, Ações
   - Filtro por categoria: Esporte, Fé, Social, Viagens
   - Busca por título
   - Indicador de rascunho (sem `published_at`) vs publicado

2. **Formulário de criação/edição `/blog/novo` e `/blog/[id]/editar`**
   - Campos: título, slug (auto-gerado), excerpt, conteúdo (Markdown com preview), categorias (multi-select), imagem de capa (upload)
   - Editor Markdown com toolbar básica (bold, italic, headings, links, images, blockquote, lists)
   - Preview lado a lado (split view)
   - Botão "Publicar" (seta `published_at`) e "Salvar Rascunho"
   - `author_id` preenchido automaticamente com o admin logado

3. **Exclusão de post**
   - Dialog de confirmação
   - Remover imagem de capa do Storage

4. **Migrar posts estáticos**
   - Script/action para importar os 6 posts hardcoded do web-site para o Supabase

### Arquivos Criados
```
app/(dashboard)/blog/page.tsx
app/(dashboard)/blog/novo/page.tsx
app/(dashboard)/blog/[id]/editar/page.tsx
app/(dashboard)/blog/actions.ts
components/blog-form.tsx
components/markdown-editor.tsx
```

### Critérios de Aceite
- [ ] Listar todos os posts com status (rascunho/publicado)
- [ ] Criar post com editor Markdown e preview
- [ ] Upload de imagem de capa
- [ ] Editar post existente
- [ ] Publicar/despublicar post
- [ ] Excluir post com confirmação
- [ ] Categorias multi-select funcionais

---

## SPEC-05: Gestão da Agenda (Eventos CRUD)

**Objetivo:** Criar, editar, listar e excluir eventos.

### Tarefas

1. **Página de listagem `/agenda`**
   - Visualização em cards ou tabela (toggle)
   - Colunas: Cover, Título, Tipo, Local, Data Início, Status, Ações
   - Filtros: por tipo (palestra/missao/clinica/culto), por status (confirmado/a confirmar/em-andamento/encerrado)
   - Separação visual entre eventos futuros e passados

2. **Formulário de criação/edição `/agenda/novo` e `/agenda/[id]/editar`**
   - Campos: título, descrição, tipo (select), localização (presencial/online)
   - Se presencial: local_name, cidade, estado
   - Datas: início e fim (date-time picker)
   - Link externo (opcional)
   - Imagem de capa (upload)
   - Contato: nome e telefone
   - Status (select)

3. **Exclusão de evento**
   - Dialog de confirmação
   - Remover imagem de capa do Storage

### Arquivos Criados
```
app/(dashboard)/agenda/page.tsx
app/(dashboard)/agenda/novo/page.tsx
app/(dashboard)/agenda/[id]/editar/page.tsx
app/(dashboard)/agenda/actions.ts
components/event-form.tsx
```

### Critérios de Aceite
- [ ] Listar eventos com filtros por tipo e status
- [ ] Criar evento com todos os campos
- [ ] Editar evento existente
- [ ] Upload de imagem de capa
- [ ] Excluir evento com confirmação
- [ ] Date picker funcional para início e fim

---

## SPEC-06: Gestão de Leads (Fale Conosco)

**Objetivo:** Visualizar e gerenciar leads recebidos pelo formulário de contato e convites.

### Tarefas

1. **Página de listagem `/leads`**
   - Tabela: Nome, Email, Telefone, Tipo (contact/invite), Status, Data, Ações
   - Filtros: por tipo, por status (new/read/answered/archived)
   - Badge de "Novo" para leads não lidos
   - Contador de novos leads no menu da sidebar
   - Ordenação por data (mais recentes primeiro)

2. **Visualização de lead (drawer ou dialog)**
   - Dados completos: nome, email, telefone, mensagem
   - Se tipo "invite": exibir `event_details` (JSON) formatado — tipo de local, duração, cidade/estado, datas/horários
   - Alterar status: new → read → answered → archived
   - Marcar como lido automaticamente ao abrir

3. **Ações em lote**
   - Selecionar múltiplos leads
   - Marcar como lido/arquivado em lote
   - Excluir em lote (com confirmação)

### Arquivos Criados
```
app/(dashboard)/leads/page.tsx
app/(dashboard)/leads/actions.ts
components/lead-detail-drawer.tsx
```

### Critérios de Aceite
- [ ] Listar todos os leads com tipo e status
- [ ] Filtrar por tipo e status
- [ ] Visualizar detalhes do lead (incluindo event_details de convites)
- [ ] Alterar status individualmente
- [ ] Ações em lote (marcar lido, arquivar, excluir)
- [ ] Contador de novos leads na sidebar

---

## SPEC-07: Gestão de Usuários

**Objetivo:** Visualizar usuários cadastrados e seus dados.

### Tarefas

1. **Página de listagem `/usuarios`**
   - Tabela: Avatar, Nome, Email, Telefone, Role, Data de Atualização
   - Filtro por role (admin/user)
   - Busca por nome ou email
   - Total de pedidos por usuário (count)

2. **Detalhes do usuário (drawer)**
   - Profile completo: avatar, nome, email, telefone, documento
   - Lista de endereços cadastrados
   - Lista de pedidos do usuário (link para detalhes)
   - Total gasto

3. **Promover/rebaixar role**
   - Alterar entre admin e user (com confirmação)

### Arquivos Criados
```
app/(dashboard)/usuarios/page.tsx
app/(dashboard)/usuarios/actions.ts
components/user-detail-drawer.tsx
```

### Critérios de Aceite
- [ ] Listar todos os usuários com dados do profile
- [ ] Filtrar e buscar por nome/email/role
- [ ] Ver detalhes com endereços e pedidos
- [ ] Alterar role do usuário

---

## SPEC-08: Analytics e Dashboard Avançado

**Objetivo:** Melhorar a página Overview com gráficos e métricas de conversão.

### Tarefas

1. **Instalar biblioteca de gráficos**
   - `recharts` (compatível com shadcn/ui charts)

2. **Cards de métricas (aprimorados)**
   - Receita total (soma dos pedidos pagos)
   - Pedidos no período (com comparação vs período anterior)
   - Taxa de conversão (via `v_cart_funnel`)
   - Novos usuários no período

3. **Gráficos**
   - Receita diária/semanal/mensal (line chart via `v_checkout_summary`)
   - Pedidos por status (pie/donut chart)
   - Produtos mais vendidos (bar chart)
   - Produtos mais adicionados ao carrinho (via `v_cart_additions`)
   - Funil de conversão: add_to_cart → checkout_started → checkout_completed (funnel/bar)

4. **Tabela de atividade recente**
   - Últimos 10 pedidos
   - Últimos 5 leads
   - Próximos 3 eventos

5. **Filtro de período**
   - Seletor: Hoje, 7 dias, 30 dias, 90 dias, Customizado
   - Date range picker

### Arquivos Criados
```
app/(dashboard)/page.tsx (atualizado)
components/charts/revenue-chart.tsx
components/charts/orders-by-status.tsx
components/charts/top-products.tsx
components/charts/conversion-funnel.tsx
components/recent-activity.tsx
components/date-range-picker.tsx
```

### Critérios de Aceite
- [ ] Cards com métricas reais do banco
- [ ] Gráfico de receita com filtro de período
- [ ] Gráfico de pedidos por status
- [ ] Top produtos (vendidos e adicionados ao carrinho)
- [ ] Funil de conversão funcional
- [ ] Atividade recente com links para detalhes

---

## Ordem de Implementação Recomendada

```
SPEC-01 (Fundação)          ██████████ Pré-requisito para tudo
    │
    ├── SPEC-02 (Produtos)  ████████
    ├── SPEC-03 (Pedidos)   ████████
    ├── SPEC-04 (Blog)      ████████
    ├── SPEC-05 (Agenda)    ██████
    ├── SPEC-06 (Leads)     ██████
    └── SPEC-07 (Usuários)  ██████
                               │
                    SPEC-08 (Analytics) ████████ Depende de dados existentes
```

> **SPEC-01** deve ser implementada primeiro. As SPECs 02-07 podem ser feitas em qualquer ordem (são independentes). SPEC-08 deve ser a última, pois depende de ter dados nas tabelas para os gráficos fazerem sentido.

---

## Stack Técnica do Dashboard

| Camada          | Tecnologia                                  |
| --------------- | ------------------------------------------- |
| Framework       | Next.js 16 (App Router, RSC, Server Actions)|
| UI              | shadcn/ui + Tailwind CSS v4                 |
| Banco de Dados  | Supabase (PostgreSQL)                       |
| Auth            | Supabase Auth                               |
| Storage         | Supabase Storage                            |
| Tipos           | TypeScript strict + tipos gerados           |
| Validação       | Zod                                         |
| Gráficos        | Recharts (SPEC-08)                          |
| Forms           | React Hook Form + Zod resolver              |
| Markdown        | Editor customizado com preview              |
