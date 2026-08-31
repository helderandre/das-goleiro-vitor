# Tasks — Correção e conclusão da integração MP + Melhor Envio

> Ordem por risco: fechar exposições → versionar → corrigir → completar.

## 1. Segurança (urgente — endpoints públicos hoje)

- [ ] 1.1 `melhor-envio-etiquetas`: exigir `Authorization` do chamador, `getUser()` e `profiles.role = 'admin'` em todas as ações; verificar que chamada sem token e com token de usuário comum retornam 401/403 e que o admin continua gerando etiqueta no sandbox
- [ ] 1.2 `melhor-envio-webhook`: validar `X-ME-Signature` (HMAC-SHA256 do corpo bruto lido com `req.text()` antes de qualquer parse, aceitando base64 e hex) contra o Secret do app; verificar que POST sem assinatura recebe 401 e que um evento real do sandbox é aceito
- [ ] 1.3 `mp-webhook`: falhar fechado quando `MP_WEBHOOK_SECRET` não existir (hoje `return true`) e montar o manifest com `data.id` da **query string**; verificar 401 com assinatura inválida e 200 com o simulador do painel
- [ ] 1.4 Conferir os secrets configurados nas functions (`MP_WEBHOOK_SECRET`, `CLIENT_ID_ME`, `SECRET_ME`, `MELHOR_ENVIO_API_URL`) e registrar quais faltam; verificar que nenhuma function cai no caminho "sem secret"
- [ ] 1.5 Proteger ou remover `melhor-envio-debug` e `mp-test-card-payment`; verificar que não respondem mais sem credencial de admin

## 2. Versionar antes de refatorar

- [ ] 2.1 Criar `supabase/functions/<slug>/index.ts` com o código atual **de produção** das 10 functions e `supabase/config.toml`; verificar que `supabase functions deploy --dry-run` (ou diff manual) bate com o que está no servidor
- [ ] 2.2 Commitar o snapshot inicial sem alterações de lógica, para servir de baseline de rollback; verificar `git log` com o commit dedicado
- [ ] 2.3 Documentar em `README` ou `docs/` como implantar (`supabase functions deploy <slug>`) e onde ficam os secrets; verificar que outra pessoa consegue seguir o passo a passo

## 3. Corrigir `mp-webhook` (regras de negócio)

- [ ] 3.1 `rejected` deixa de mudar `orders.status` (mantém `pending`, grava `mp_payment_status` e o motivo); verificar com pagamento de teste recusado (titular OTHE) que o pedido segue `pending`
- [ ] 3.2 `refunded`/`charged_back`/`in_mediation` deixam de virar `cancelled`: sinalizam `needs_attention` e gravam o estado; verificar com evento simulado
- [ ] 3.3 Transições monotônicas (nunca regredir `paid`) e conferência `transaction_amount >= orders.total` antes de marcar pago; verificar reenviando um evento antigo e um pagamento de valor menor
- [ ] 3.4 Idempotência: UNIQUE em `mp_webhook_logs` por `(payment_id, event_id)` e corrigir o `update().eq().order().limit()` (encadeamento inválido para UPDATE); verificar que o mesmo evento processado duas vezes não altera o pedido duas vezes
- [ ] 3.5 Erro transitório (falha de banco/API) passa a responder 5xx para o MP reenviar, em vez do 200 atual; verificar com falha injetada
- [ ] 3.6 Ignorar notificações com `live_mode: false` quando a credencial ativa for de produção; verificar com o simulador do painel

## 4. Corrigir Mercado Pago — cobrança

- [ ] 4.1 `mp-create-preference`: usar `orders.id` como `external_reference` (o `#` do `short_id` é inválido na API), mantendo a busca por `short_id` no webhook para pedidos antigos; verificar preferência criada e webhook casando o pedido
- [ ] 4.2 Parar de usar `sandbox_init_point` (a doc marca "não utilize") e retornar sempre `init_point`; verificar checkout de teste abrindo pelo `init_point`
- [ ] 4.3 Adicionar `expires` + `expiration_date_to` (24 h sem boleto, 3 dias com boleto) e persistir a expiração no pedido; verificar preferência expirando
- [ ] 4.4 Recalcular itens e frete a partir do banco (não confiar em valores gravados pelo site) e conferir que a soma bate com `orders.total`; verificar com pedido de total divergente
- [ ] 4.5 Permitir uso por admin (além do dono do pedido) em `mp-create-preference` e `mp-create-payment`; verificar admin gerando cobrança de pedido de terceiro

## 5. Corrigir Melhor Envio — etiqueta e rastreio

- [ ] 5.1 `checkout` deixa de marcar `orders.status = 'shipped'` (só `shipping_status = 'paid'`); `shipped` passa a vir do evento de postagem; verificar fluxo completo no sandbox
- [ ] 5.2 Remetente vindo de `sender_addresses` (`is_default`) e destinatário de `orders.shipping_address` + `profiles`, em vez do corpo do request; verificar `add_to_cart` sem enviar remetente/destinatário
- [ ] 5.3 Produtos declarados = `order_items` reais (nome, quantidade, valor unitário) com soma igual a `insurance_value`, exigência da DC-e; verificar payload aceito no sandbox
- [ ] 5.4 Pré-condições antes de `add_to_cart`: pedido pago, item físico, CPF/telefone do destinatário presentes, sem contestação, saldo suficiente (`GET /me/balance`); verificar bloqueio com mensagem específica em cada caso
- [ ] 5.5 Nova ação `cancel`: `POST /shipment/cancellable` → `POST /shipment/cancel` com registro do estorno esperado na carteira; verificar no sandbox
- [ ] 5.6 `print` com retry após `generate` (geração é assíncrona) e persistência do `label_url`; verificar impressão logo após gerar
- [ ] 5.7 `melhor-envio-webhook`: mapear os eventos oficiais (`order.posted` → `shipped`, `order.delivered` → `delivered`, `order.cancelled`/`undelivered` → `needs_attention`), com idempotência em tabela própria e transições monotônicas; verificar com a sequência automática do sandbox
- [ ] 5.8 Cotação: passar a usar `products[]` (empacotamento automático) em vez de um volume fixo, filtrar itens com `error` e congelar a cotação escolhida no pedido; verificar cotação de 2 livros retornando pacotes

## 6. Banco — o que falta

- [ ] 6.1 Migration: `orders.needs_attention`, `orders.subtotal`, `orders.expires_at`, `orders.origin`; backfill `subtotal = total - shipping_price`; verificar que o dashboard e o site seguem funcionando
- [ ] 6.2 Migration: tabela `order_events` (trilha: pagamento, etiqueta, postagem, entrega, ações do admin) e `order_refunds` (valor, tipo, status, chave de idempotência única); verificar inserção pelas functions
- [ ] 6.3 Migration: tabela de deduplicação de webhooks do ME + UNIQUE em `mp_webhook_logs`; verificar que reenvio duplicado é ignorado
- [ ] 6.4 Função `create_order` (security definer, `set search_path=''`) com reserva atômica de estoque (`WHERE stock >= qty`); testar 2 chamadas concorrentes no último exemplar → 1 sucesso
- [ ] 6.5 Revisar policies de `orders`/`order_items` (`WITH CHECK`, sem UPDATE de `status`/`total` por `authenticated`) e RLS das tabelas internas (sem acesso anon); verificar com anon key
- [ ] 6.6 Corrigir os pedidos em estado inconsistente (`#D6B107` cancelado por recusa; pedidos marcados `shipped` no pagamento da etiqueta), registrando a correção; verificar listagem final

## 7. Lacunas de operação (dashboard + functions)

- [ ] 7.1 Function de reembolso/cancelamento: decide pela consulta ao pagamento (cancelar se pendente, reembolsar se aprovado), grava `order_refunds` com chave de idempotência antes da chamada, envia `X-Render-In-Process-Refunds`; verificar reembolso total no sandbox e retry sem duplicar
- [ ] 7.2 Criação de pedido manual pelo admin (cliente existente ou avulso, endereço, cotação, `origin = manual`) via `create_order`; verificar pedido criado com estoque reservado
- [ ] 7.3 Tela do pedido no dashboard: gerar cobrança (link), gerar/cancelar etiqueta, imprimir, reembolsar, rastreio e timeline de `order_events`; verificar cada ação num pedido de teste
- [ ] 7.4 Página "Integrações": estado da conexão ME (validade do token), saldo da carteira, ambiente ativo do MP; verificar exibição com dados reais do sandbox
- [ ] 7.5 Formulário de produto exigindo peso/dimensões para físicos (colunas já existem com default de livro); verificar criação/edição
- [ ] 7.6 Jobs via pg_cron: rastreio (2 h), reconciliação de pagamentos, expiração de pedidos, refresh preventivo do token ME; verificar execução e registro em `cron.job_run_details`

## 8. Homologação

- [ ] 8.1 E2E sandbox: pedido manual → cobrança → cartão APRO → `paid` → etiqueta → postado → entregue, com timeline completa e sem duplicidade
- [ ] 8.2 E2E cancelamentos: pendente, pago sem etiqueta, e etiqueta gerada (cancel + refund); verificar estoque e registros financeiros
- [ ] 8.3 Testes negativos: webhook sem assinatura, etiqueta sem admin, pagamento de valor menor, evento duplicado e fora de ordem — todos rejeitados
- [ ] 8.4 Resolver as Open Questions do design (encoding do `X-ME-Signature`, auditoria de `mp-check-payment`/`mp-test-card-payment`, como o site chama as functions, erro de saldo no ME) e registrar as respostas
- [ ] 8.5 Produção: KYC do MP concluído, credenciais de produção em `mp_credentials`, app ME de produção + conta verificada + saldo, webhooks recadastrados, transportadoras habilitadas; checklist assinado antes do go-live
- [ ] 8.6 Venda real de valor baixo (Pix) validando webhook de produção; reembolsar ao final e conferir a tarifa devolvida
