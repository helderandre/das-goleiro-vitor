## Why

A integração de pagamento (Mercado Pago) e frete (Melhor Envio) **já existe e já rodou de ponta a ponta em sandbox** — mas vive inteiramente em 10 Supabase Edge Functions e no schema do banco, sem estar versionada em nenhum repositório. A auditoria de 31/08/2026 (código das functions + `docs/dossie-pagamento-frete.html`) encontrou três endpoints expostos sem autenticação nem validação de assinatura, regras de negócio incorretas que já produziram pedidos em estado errado, e lacunas nos fluxos que o dashboard precisa (pedido manual, reembolso, cancelamento de etiqueta).

Decisões já tomadas: conta **CPF** nos dois serviços (envio não comercial com DC-e, sem NF-e) e **manter as Edge Functions** como runtime da integração, corrigindo-as, em vez de reescrever no Cloudflare Worker.

## What Changes

### Segurança (urgente — endpoints em produção hoje)
- `melhor-envio-etiquetas` passa a exigir identidade de admin: hoje está com `verify_jwt: false` e **sem nenhuma verificação**, permitindo que qualquer pessoa na internet gaste o saldo da Melhor Carteira.
- `melhor-envio-webhook` passa a validar `X-ME-Signature` (HMAC-SHA256 do corpo bruto): hoje aceita qualquer POST e pode marcar pedidos como entregues.
- `mp-webhook` deixa de aceitar requisições quando `MP_WEBHOOK_SECRET` não está configurado (hoje `return true` pula a validação), e passa a montar o manifest com o `data.id` da **query string**, como a documentação exige.

### Correções de comportamento
- Pagamento `rejected` **deixa de cancelar** o pedido (o cliente pode tentar de novo no mesmo link) — hoje cancela, e já há pedido nesse estado no banco.
- `refunded`, `charged_back` e `in_mediation` deixam de virar `cancelled` genérico e passam a sinalizar o pedido para o admin.
- Transições passam a ser monotônicas e idempotentes (hoje um evento atrasado ou reenviado pode regredir um pedido pago), com conferência de valor pago ≥ total.
- `melhor-envio-etiquetas` deixa de marcar o pedido como `shipped` no pagamento da etiqueta — só a postagem muda o status.
- `mp-create-preference` deixa de enviar `short_id` (formato `#E27664`) como `external_reference` (o `#` é inválido na API), deixa de usar `sandbox_init_point` e passa a definir expiração.
- Remetente da etiqueta passa a vir de `sender_addresses` (a tabela existe e não é usada); produtos declarados passam a ser os itens reais do pedido, exigência da DC-e emitida via SEFAZ.

### Lacunas a implementar
- Criação de pedido manual pelo admin e geração de cobrança — hoje `mp-create-preference` e `mp-create-payment` exigem que o usuário autenticado seja o dono do pedido, o que impede o uso pelo admin.
- Cancelamento de pedido e reembolso (total, somente produtos, parcial) com idempotência e conciliação.
- Cancelamento de etiqueta (`cancellable`/`cancel`) e leitura do saldo da carteira antes do checkout.
- Verificação ativa de rastreio (o código da transportadora chega até 1 dia útil após a postagem, sem evento próprio) e reconciliação de pagamentos sem webhook.
- Telas correspondentes no dashboard, que hoje só lê os campos.

### Versionamento e operação
- As 10 Edge Functions passam a ser versionadas em `supabase/functions/` neste repositório (hoje existem apenas no servidor do Supabase, sem histórico nem backup).
- Functions auxiliares de teste (`mp-test-card-payment`, `melhor-envio-debug`) deixam de ficar públicas em produção.

## Capabilities

### New Capabilities

- `pagamentos/checkout-mercado-pago`: criação de preferência do Checkout Pro (itens + frete como item, limites de campos, expiração) e geração de link de cobrança para pedidos manuais.
- `pagamentos/webhooks-mercado-pago`: recepção, validação de assinatura, idempotência e mapeamento de status de pagamento → pedido.
- `pagamentos/cancelamento-reembolso`: regras de cancelar vs reembolsar por estado do pagamento, reembolso parcial, idempotência e conciliação (inclui reembolsos feitos fora do dashboard).
- `frete/cotacao-melhor-envio`: cotação por CEP com produtos físicos, filtragem de serviços indisponíveis, uso de `custom_price`, cache e re-cotação no checkout.
- `frete/etiquetas-melhor-envio`: fluxo carrinho → pagamento → geração → impressão, envio não comercial (DC-e), cancelamento de etiqueta (estorno para a carteira) e logística reversa.
- `frete/rastreio-melhor-envio`: webhook + verificação ativa, código exibido (transportadora ou ME), link Melhor Rastreio, transições `shipped`/`delivered`.
- `frete/conexao-melhor-envio`: aplicativo OAuth, armazenamento e renovação automática de tokens, User-Agent obrigatório, visibilidade do saldo da carteira.
- `pedidos/pedido-manual`: criação de pedido pelo admin no dashboard (cliente existente ou avulso), com reserva de estoque e cobrança.
- `pedidos/ciclo-de-vida`: modelo de estados, reserva/liberação atômica de estoque e trilha de eventos.

As capabilities descrevem o comportamento-alvo. Parte já está implementada (cotação, preferência, webhook MP, fluxo de etiqueta, OAuth do ME, Checkout Transparente com Pix e cartão); as specs valem como gabarito do que corrigir e do que falta.

### Modified Capabilities

<!-- Não há specs anteriores em openspec/specs/ (OpenSpec inicializado neste change). -->

## Impact

- **Supabase Edge Functions** (onde a integração vive): `mp-create-preference`, `mp-webhook`, `mp-create-payment`, `mp-check-payment`, `melhor-envio-auth`, `melhor-envio-cotacao`, `melhor-envio-etiquetas`, `melhor-envio-webhook`; auxiliares `mp-test-card-payment` e `melhor-envio-debug`.
- **Banco**: schema de pagamento/frete já existe (`products.weight/height/width/length`; `orders.mp_*` e `orders.me_cart_id/me_service_id/shipping_price/shipping_status/label_url/shipped_at/delivered_at`; tabelas `melhor_envio_tokens`, `mp_credentials`, `mp_webhook_logs`, `sender_addresses`, `order_messages`). Faltam: registro de reembolsos, trilha de eventos do pedido, deduplicação de webhooks do ME, campos de conferência (subtotal vs frete, sinalização de atenção) e reserva atômica de estoque.
- **Dashboard (este repo)**: telas de pedido (gerar cobrança, gerar/cancelar etiqueta, reembolsar, rastreio), criação de pedido manual, página de integrações (conexão ME, saldo, credenciais MP), e `supabase/functions/` versionado.
- **Site público (outro repo — fora deste change)**: consome as mesmas functions; muda apenas se o contrato de criação de pedido mudar (coleta de CPF/telefone do destinatário).
- **Contas**: MP em credenciais de teste (produção exige KYC); ME conectado via OAuth no sandbox (produção exige conta PF verificada, saldo na carteira e transportadoras habilitadas no app).
