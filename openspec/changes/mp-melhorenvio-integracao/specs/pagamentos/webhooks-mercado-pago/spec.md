## Purpose

Receber notificações do Mercado Pago no dashboard, validar autenticidade, e refletir o estado real dos pagamentos nos pedidos de forma idempotente.

## ADDED Requirements

### Requirement: Endpoint público com assinatura validada
O sistema SHALL expor um endpoint HTTPS público (fora da autenticação de admin) que valida o header `x-signature` (HMAC-SHA256 do manifest `id:{data.id};request-id:{x-request-id};ts:{ts};`, com `data.id` lido da query string) usando a chave secreta da aplicação, em comparação de tempo constante. Requisições com assinatura inválida MUST ser rejeitadas com 401 sem nenhum efeito colateral.

#### Scenario: Assinatura inválida
- **WHEN** chega um POST com `x-signature` que não confere com o manifest
- **THEN** o sistema responde 401 e nenhum pedido ou evento é alterado

#### Scenario: data.id alfanumérico
- **WHEN** o `data.id` da query contém letras maiúsculas
- **THEN** a validação tenta a caixa original e minúsculas antes de rejeitar

### Requirement: Resposta rápida e processamento resiliente
O endpoint SHALL registrar o evento recebido e responder 200/201 em menos de 22 segundos. Eventos duplicados ou irrelevantes SHALL receber 200; erro transitório (banco/API indisponível) SHALL responder 5xx para provocar reenvio. Eventos registrados e não processados SHALL ser reprocessáveis depois.

#### Scenario: Reenvio do mesmo evento
- **WHEN** o Mercado Pago reenvia uma notificação já processada (mesmo `data.id` + `x-request-id`)
- **THEN** o sistema responde 200 e não aplica a transição novamente

### Requirement: Estado real consultado na API
O payload da notificação MUST NOT ser usado como fonte do status. Após validar, o sistema SHALL consultar o pagamento na API e decidir pelo `status` retornado. Antes de marcar um pedido como pago, o valor da transação MUST ser maior ou igual ao total do pedido.

#### Scenario: Pagamento com valor menor que o pedido
- **WHEN** o pagamento aprovado tem `transaction_amount` menor que `orders.total`
- **THEN** o pedido não é marcado como pago e é sinalizado para atenção do admin

#### Scenario: Pagamento inexistente (simulador)
- **WHEN** a consulta do pagamento retorna 404 (ex.: Data ID fictício do simulador)
- **THEN** o sistema registra, responde 200 e não altera pedidos

### Requirement: Mapeamento de status e monotonicidade
O sistema SHALL manter `mp_payment_status` (valor bruto do MP) separado de `orders.status` e aplicar: `approved` → `paid` (+`paid_at`, id do pagamento, meio); `pending`/`in_process`/`authorized` → mantém `pending`; `rejected` → mantém `pending` (nova tentativa permitida); `cancelled` → `cancelled` com liberação de estoque; `refunded` → registrado como reembolsado; `charged_back`/`in_mediation` → sinaliza `needs_attention` e bloqueia geração de etiqueta. Transições MUST ser monotônicas: um evento atrasado MUST NOT regredir `paid` para `pending`.

#### Scenario: Pix expira
- **WHEN** chega notificação de pagamento `cancelled` com detalhe `expired` de um pedido `pending`
- **THEN** o pedido vira `cancelled` e o estoque reservado é liberado

#### Scenario: Evento fora de ordem
- **WHEN** um `payment.created` (pending) chega depois do `payment.updated` (approved) já processado
- **THEN** o pedido permanece `paid`

### Requirement: Modo teste isolado da produção
Notificações com `live_mode: false` recebidas no ambiente de produção SHALL ser registradas e respondidas com 200 sem alterar pedidos.

#### Scenario: Simulação do painel em produção
- **WHEN** o admin usa o botão "Simular" do painel apontando para a URL de produção
- **THEN** nenhum pedido real é alterado

### Requirement: Reconciliação sob demanda
O dashboard SHALL oferecer uma ação "Verificar pagamento" que busca os pagamentos do pedido por `external_reference` na API e aplica o mesmo mapeamento de status, cobrindo notificações perdidas.

#### Scenario: Webhook perdido
- **WHEN** um pedido está `pending` mas o pagamento foi aprovado sem notificação processada
- **THEN** a ação de verificação marca o pedido como `paid`
