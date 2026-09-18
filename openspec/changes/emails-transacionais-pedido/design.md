## Context

Motivação e escopo em `proposal.md`; comportamento esperado em `specs/notificacoes/`.

Estado atual que molda a solução:

- **O status do pedido muda em sete lugares**: `create_order` (SQL), `expire_unpaid_orders` (SQL, pg_cron), `mp-webhook`, `mp-create-payment`, `melhor-envio-webhook`, `melhor-envio-etiquetas` (ação `tracking`) e o seletor de status do dashboard (`updateOrderStatus`). O `mp-refund` também leva o pedido a `cancelled`.
- **Os campos necessários já existem em `orders`**: `status`, `mp_payment_id`, `mp_payment_status`, `mp_payment_type`, `tracking_code`, `tracking_url`, `created_at`, `expires_at`. O Pix grava `mp_payment_id`, `mp_payment_status = 'pending'` e `mp_payment_type = 'bank_transfer'` no momento em que é gerado. `order_events` registra a origem de cada transição (`order_expired`, estornos, ações do admin).
- **O Resend não está disponível para as Edge Functions.** O "Resend no Supabase" é o SMTP do Auth; nenhum secret do Resend existe no projeto.
- **As capas dos produtos são `.webp`** no Supabase Storage.
- **Os e-mails do Auth usam os templates padrão** (inglês). A loja chama `resetPasswordForEmail` com `redirectTo: <origin>/auth?view=reset`; o `signUp` não passa `emailRedirectTo`, então a confirmação volta para a *Site URL* do Auth.
- **O layout foi aprovado** nos mockups em `mockups/` (galeria em `mockups/index.html`).

## Goals / Non-Goals

**Goals:**
- Um único ponto de disparo, no banco, que cubra todas as origens de mudança sem tocar nas sete.
- Envio automático no máximo uma vez, com novas tentativas, sem nunca bloquear a transação do pedido; reenvio só por ação explícita do admin.
- Templates versionados no repositório, renderizados a partir do layout aprovado.
- Situação de entrega de cada e-mail visível no pedido, vinda do próprio provedor.

**Non-Goals:**
- Motor genérico de notificações (outros canais, preferências do usuário, e-mails de marketing).
- Editor de templates no dashboard.

## Decisions

### 1. Fila no banco (outbox) alimentada por trigger em `orders`

Uma tabela `email_outbox` recebe uma linha por e-mail a enviar. Um trigger `AFTER INSERT OR UPDATE` em `orders` avalia a transição e insere a linha correspondente.

| e-mail | condição no trigger | chave de deduplicação |
|---|---|---|
| pedido criado | `INSERT` com `status = 'pending'` | `pedido_criado:<order_id>` |
| aguardando pagamento | `status = 'pending'`, `mp_payment_status = 'pending'`, `mp_payment_id` novo ou status de pagamento alterado | `aguardando:<order_id>:<mp_payment_id>` |
| pagamento recebido | `status` passa a `'paid'` | `pago:<order_id>` |
| pagamento cancelado | `status` passa a `'cancelled'` | `cancelado:<order_id>` |
| pedido enviado | `status = 'shipped'` e `tracking_code` presente, e antes não era os dois | `enviado:<order_id>` |
| pedido concluído | `status` passa a `'delivered'` | `concluido:<order_id>` |

A deduplicação é uma restrição `unique` sobre a chave, com `insert ... on conflict do nothing`: webhooks reenviados, reprocessamentos e transições repetidas não geram segunda linha.

A linha guarda apenas o tipo, o pedido, a chave e o controle de envio — **não um snapshot do conteúdo**. O e-mail é montado no momento do envio a partir do estado atual, o que permite descartar e-mails obsoletos (spec *E-mail obsoleto não é enviado*) e resolve a ordem de gravação da `create_order`, que insere o pedido com total zero e só depois grava itens e totais, tudo na mesma transação.

O trigger é `SECURITY DEFINER` e todo o seu corpo fica dentro de um bloco `exception when others` que apenas registra um aviso: uma falha ao enfileirar nunca derruba a mudança do pedido (spec *Envio não interfere no pedido*).

**Alternativas descartadas:**
- *Chamar o envio em cada function que muda o pedido* — sete pontos a manter, e qualquer nova origem esquecida fica sem e-mail. É o problema que a proposta quer evitar.
- *Trigger sobre `order_events`* — nem toda transição gera evento com o mesmo formato (o seletor manual do dashboard, por exemplo), e o estado de interesse está em `orders`.
- *Supabase Database Webhooks* — equivalentes a pg_net, mas configurados fora do repositório e sem a deduplicação.

### 2. Disparo imediato por pg_net, com varredura pelo pg_cron

Um segundo trigger, `AFTER INSERT` em `email_outbox`, chama a function de envio via `net.http_post`. O pg_net executa a requisição depois do commit, então o dispatcher já enxerga o pedido completo.

Um job no pg_cron roda a cada minuto como rede de segurança: pega linhas pendentes cujo `next_attempt_at` já passou (novas tentativas e chamadas perdidas) e devolve para `pending` as que ficaram presas em `sending` por mais de 10 minutos (function interrompida no meio).

O segredo que autentica a chamada do banco para a function fica no **Supabase Vault** e é lido de `vault.decrypted_secrets` pela função SQL que faz o `http_post`. Diferente do cron de token do Melhor Envio, que guarda o segredo em texto puro no comando do job.

**Alternativa descartada:** só o cron a cada minuto. Mais simples, mas o e-mail de Pix chegaria com até um minuto de atraso, justamente quando o cliente está com o app do banco aberto.

### 3. Function `send-order-emails` e reivindicação de lote

A function recebe a chamada (do trigger ou do cron), reivindica um lote de até 20 linhas por uma RPC que usa `for update skip locked`, marca como `sending` e incrementa `attempts`. Duas execuções simultâneas nunca pegam a mesma linha.

A RPC só devolve uma linha se **nenhuma linha anterior do mesmo pedido** estiver `pending` ou `sending` (spec *Ordem dos e-mails do mesmo pedido*).

Para cada linha, a function:
1. Carrega pedido, itens, capa dos produtos e perfil do cliente.
2. Confere se o e-mail ainda se aplica ao estado atual; se não, marca `skipped` com o motivo.
3. Para "aguardando pagamento", consulta o pagamento no Mercado Pago (`GET /v1/payments/{id}`, credencial de `mp_credentials`) para obter o copia e cola (`point_of_interaction.transaction_data.qr_code`) e o link do QR Code (`ticket_url`). Se a consulta falhar, envia a versão sem o código, com link para a página do pedido (spec: *Código do Pix indisponível no envio*).
4. Para "pagamento cancelado", escolhe o texto pelo último evento do pedido: `order_expired` → prazo expirado; estorno registrado em `order_refunds` → estorno; demais → cancelado pela loja.
5. Renderiza assunto, HTML e texto puro.
6. Envia pelo Resend (`POST /emails`) com o cabeçalho `Idempotency-Key` igual ao id da linha, o que protege contra envio duplo se a function cair depois de enviar e antes de marcar `sent`.
7. Marca `sent` com o id devolvido pelo Resend, ou trata o erro.

**Tratamento de erro:**

| resposta do Resend | ação |
|---|---|
| 2xx | `sent` |
| 422 ou 400 (validação, endereço inválido) | `failed`, sem nova tentativa |
| 429, 5xx, timeout, erro de rede | `pending`, com `next_attempt_at` em 1, 5, 15 e 30 min |
| 5ª tentativa falha | `failed`, com o último erro |

A function tem `verify_jwt = false` e aceita apenas chamadas com o cabeçalho `x-dispatch-secret` igual ao secret `EMAIL_DISPATCH_SECRET`.

### 4. Templates em TypeScript, portados do gerador dos mockups

Os templates ficam em `supabase/functions/_shared/emails/`: um layout (cabeçalho, barra âmbar, rodapé), componentes (botão, caixa de destaque, barra de progresso, tabela de itens) e um arquivo por e-mail que devolve `{ subject, preheader, html, text }`. É a mesma estrutura do gerador usado nos mockups, o que garante que o aprovado é o que sai.

- HTML em tabelas com estilos inline, largura máxima de 600px e media query para telas estreitas.
- Todo texto dinâmico passa por escape de HTML.
- Datas em `America/Sao_Paulo` e valores em `pt-BR`.
- A forma de pagamento reaproveita o mesmo mapeamento de `lib/payment-methods.ts` do dashboard, copiado para o módulo compartilhado (o dashboard roda em Node e as functions em Deno).
- Link de rastreio: `tracking_url` quando existir; senão `https://www.melhorrastreio.com.br/rastreio/<código>`.

**Alternativa descartada:** React Email. Traria um passo de build JSX para dentro das Edge Functions em troca de pouco: são seis templates com layout fixo.

### 5. Configuração por secrets

| secret | uso |
|---|---|
| `RESEND_API_KEY` | autenticação na API do Resend |
| `EMAIL_FROM` | `Goleiro Vitor <pedidos@goleirovitor.com.br>` — domínio verificado |
| `EMAIL_REPLY_TO` | contato da loja que recebe as respostas |
| `EMAIL_DISPATCH_SECRET` | autentica o banco na function (cópia também no Vault) |
| `RESEND_WEBHOOK_SECRET` | segredo de assinatura (`whsec_...`) do webhook cadastrado no Resend |
| `EMAIL_TEST_RECIPIENT` | opcional; se definido, ativa o modo de teste |
| `EMAIL_ENABLED` | opcional; `false` desliga o envio e descarta os e-mails |

No modo de teste o destinatário é substituído e o assunto recebe o prefixo `[TESTE → <e-mail original>]`.

### 6. Templates do Auth aplicados pela Management API

Os HTML de confirmação de cadastro e de redefinição de senha ficam versionados em `supabase/templates/` e são aplicados com `PATCH /v1/projects/{ref}/config/auth`, enviando **apenas** os campos `mailer_subjects_confirmation`, `mailer_templates_confirmation_content`, `mailer_subjects_recovery` e `mailer_templates_recovery_content`.

Os templates usam as variáveis do Auth `{{ .ConfirmationURL }}` e `{{ .Email }}`. A validade exibida na redefinição de senha vem de `mailer_otp_exp`, lido na mesma API antes de aplicar.

A *Site URL* do Auth deve ser `https://goleirovitor.com.br` e a lista de Redirect URLs deve incluir `https://goleirovitor.com.br/**`.

**Alternativa descartada:** `supabase config push`. Ele sincroniza toda a configuração do Auth a partir do `config.toml`, que não contém o SMTP do Resend; aplicá-lo arriscaria desligar o SMTP de produção.

### 7. Histórico no dashboard

O detalhe do pedido ganha um card "E-mails" lendo `email_outbox` e `email_events` do pedido. O RLS das duas tabelas permite `select` apenas a administradores (`profiles.role = 'admin'`, o mesmo padrão de `sender_addresses`) e não permite `insert`, `update` nem `delete` a nenhum papel do cliente — só os triggers, as RPCs e as functions, que usam `SECURITY DEFINER` e `service_role`.

Cada e-mail mostra a situação de entrega como selo, a linha do tempo dos eventos recolhível e o botão de reenviar. Os reenvios aparecem logo abaixo do original, identificados como tal.

### 8. Rastreio pelo webhook do Resend

Uma function `resend-webhook` (`verify_jwt = false`) recebe as notificações do Resend: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened` e `email.clicked`.

- **Autenticação**: o Resend assina via Svix. A function valida `svix-id`, `svix-timestamp` e `svix-signature` com HMAC-SHA256 sobre `id.timestamp.corpo`, usando `RESEND_WEBHOOK_SECRET`, compara em tempo constante e recusa carimbos com mais de 5 minutos de diferença. A validação usa o corpo bruto, lido antes de qualquer parse — o mesmo cuidado já adotado no `melhor-envio-webhook`.
- **Registro**: cada notificação vira uma linha em `email_events` (e-mail da fila, tipo, momento informado pelo Resend, detalhe — motivo do bounce, link clicado — e o payload), com `svix-id` único. Uma notificação reenviada pelo Resend cai no `on conflict do nothing`.
- **Associação**: pelo `data.email_id` do payload, que é o id guardado em `email_outbox` no envio. Sem correspondência — e-mails do Auth, que também saem pelo Resend — a function responde 200 e não grava nada, para o Resend não ficar reenviando.
- **Situação de entrega**: uma coluna `delivery_status` em `email_outbox`, atualizada na mesma transação da inserção do evento, só quando o novo evento é mais relevante que o atual:

  | situação | peso |
  |---|---|
  | `complained` (spam) | 7 |
  | `bounced` (rejeitado) | 6 |
  | `clicked` | 5 |
  | `opened` | 4 |
  | `delivered` | 3 |
  | `delivery_delayed` | 2 |
  | `sent` | 1 |

  Comparar pelo peso, e não pela ordem de chegada, resolve notificações fora de ordem: uma abertura que chega antes da entrega não é rebaixada. `delivery_delayed` fica abaixo de `delivered` porque o atraso é superado quando a entrega acontece.

Cada envio passa ao Resend `tags` com o tipo e o id do pedido, para achar o e-mail também pelo painel do Resend.

Abertura e clique dependem de ligar *open tracking* e *click tracking* no domínio, no painel do Resend. O código não depende disso: ele registra o que chegar.

**Alternativa descartada:** consultar o Resend (`GET /emails/{id}`) sob demanda ao abrir o pedido. Não guarda histórico, não registra o momento de cada evento e gasta a cota da API a cada visualização.

### 9. Reenvio manual

Uma RPC `requeue_order_email(outbox_id)` com `SECURITY DEFINER`:

1. Confere que quem chama é admin (`profiles.role = 'admin'` do `auth.uid()`); senão, lança erro.
2. Recusa se o e-mail original estiver `pending` ou `sending`, ou se já houver um reenvio dele `pending` ou `sending` (protege contra duplo clique).
3. Insere uma nova linha com o mesmo tipo e pedido, `resent_from` apontando para a original, `requested_by` com o admin e chave de deduplicação `<chave original>:reenvio:<n>`.

A inserção dispara o mesmo trigger de chamada imediata da decisão 2, e a linha segue o caminho normal: checagem de aplicabilidade, modo de teste, desligamento e novas tentativas. O dashboard chama a RPC por uma server action e, se o original já consta como `delivered`, `opened` ou `clicked`, pede confirmação antes.

O reenvio é montado com os dados atuais do pedido e vai para o e-mail atual da conta. Ele não reaproveita o HTML do envio original — que nem é guardado (decisão 1).

### 10. Envio manual

Uma RPC `send_order_email_manually(order_id, kind)` com `SECURITY DEFINER` exige admin, confere se o tipo está disponível para o estado atual do pedido (tabela do spec *Envio manual*) e insere a linha **com a mesma chave de deduplicação que o trigger usaria** (`pago:<order_id>`, `aguardando:<order_id>:<mp_payment_id>`…) e `requested_by` preenchido. Usar a mesma chave faz o envio manual valer como o envio daquele evento: se o trigger disparar depois, o `on conflict do nothing` não cria outro. Já existindo a chave, a RPC recusa e o caminho é o reenvio.

No histórico, envio manual é a linha com `requested_by` preenchido e sem `resent_from`; não precisa de coluna nova.

O dashboard calcula os tipos disponíveis a partir do pedido e do histórico só para montar o menu. Quem decide é a RPC, então um menu desatualizado não consegue criar um envio inválido.

**Alternativa descartada:** permitir o envio manual de qualquer tipo, em qualquer estado. Um "Pedido concluído" para um pedido não entregue, ou um Pix para um pedido já pago, confundem o cliente.

**Alternativa descartada (reenvio):** voltar a linha original para `pending`. Perderia o histórico do primeiro envio e a situação de entrega dele, e o `Idempotency-Key` igual ao id da linha faria o Resend recusar o segundo envio.

## Risks / Trade-offs

- **Capas em WebP** → O Outlook clássico para Windows não exibe WebP; Gmail, Apple Mail, iOS e Outlook web exibem. A imagem tem tamanho fixo, borda e `alt` com o título, então o layout não quebra e a linha do item continua legível. Gerar miniaturas JPG no upload fica como melhoria futura.
- **Limite do Resend** → O plano gratuito permite 100 e-mails por dia e 2 requisições por segundo. O volume atual é de poucos pedidos por dia, cada um com no máximo 5 e-mails. A function envia o lote em sequência, não em paralelo.
- **Entregabilidade** → Sem SPF, DKIM e DMARC corretos os e-mails caem no spam. O domínio precisa aparecer como verificado no Resend antes da ativação.
- **Fila parada sem ninguém perceber** → Se o dispatcher falhar sempre, os e-mails se acumulam em silêncio. O histórico no dashboard mostra `falhou` por pedido; alerta automático fica fora do escopo.
- **Pedido apagado** → `email_outbox.order_id` usa `on delete cascade`: apagar um pedido apaga seu histórico de e-mails. Aceitável, é o mesmo tratamento de `order_events`.
- **Endereço rejeitado entra na lista de supressão** → Depois de um bounce definitivo, o Resend passa a recusar envios para aquele endereço, e o reenvio falha de novo. A situação "rejeitado" e o motivo ficam visíveis no card, indicando que o caminho é pedir ao cliente que corrija o e-mail da conta.
- **Rastreio de clique troca os links** → Com *click tracking* ligado, os links passam por um redirecionamento do Resend antes de chegar à loja, ao QR Code do Mercado Pago ou ao rastreio. É o comportamento esperado do recurso; o copia e cola do Pix é texto e não é afetado.
- **Abertura inflada ou ausente** → Programas que pré-carregam imagens (Apple Mail com proteção de privacidade) registram abertura sem leitura real, e programas que bloqueiam imagens não registram nenhuma. "Aberto" é indício, não prova; "entregue" é a informação confiável.
- **Mudança de status feita e desfeita pelo admin** → Um pedido marcado como entregue por engano dispara o e-mail de concluído, e voltar o status não "desenvia". O e-mail sai na hora; a deduplicação impede que ele se repita.

## Migration Plan

1. **Pré-requisitos (usuário):** criar a API key no Resend, confirmar o domínio verificado, cadastrar o webhook apontando para `resend-webhook` com os sete eventos, ligar *open* e *click tracking* no domínio e cadastrar os secrets da seção 5, com `EMAIL_TEST_RECIPIENT` apontando para um endereço interno.
2. **Banco:** migration com a tabela, RLS, RPC de reivindicação, triggers, segredo no Vault e job do pg_cron. A partir daqui os e-mails passam a ser enfileirados, mas todos vão para o endereço de teste.
3. **Functions:** deploy de `send-order-emails` e `resend-webhook`.
4. **Dashboard:** card de histórico com situação de entrega e reenvio.
5. **Validação em modo de teste:** percorrer os seis e-mails com um pedido real de valor baixo e conferir no Gmail e no Apple Mail, desktop e celular.
6. **Templates do Auth:** aplicar e testar cadastro e redefinição de senha com uma conta de teste.
7. **Ativação:** remover `EMAIL_TEST_RECIPIENT`.

**Rollback:** `EMAIL_ENABLED=false` para imediatamente os envios e os reenvios, sem deploy. Desativar o webhook no painel do Resend para de registrar eventos. Para remover de vez, desativar o job e dropar os triggers; a tabela pode ficar como histórico. Os templates do Auth voltam ao padrão reaplicando os campos vazios.

## Open Questions

- Endereço exato do remetente (`pedidos@`, `contato@`, `nao-responda@`): depende do que estiver verificado no Resend; não muda a implementação.
