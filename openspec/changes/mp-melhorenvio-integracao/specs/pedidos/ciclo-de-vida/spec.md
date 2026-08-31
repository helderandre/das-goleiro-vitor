## Purpose

Definir o modelo de estados do pedido com pagamento e envio automatizados, a reserva de estoque e a trilha de auditoria — preservando o contrato que o site público já consome.

## ADDED Requirements

### Requirement: Modelo de estados compatível
`orders.status` SHALL manter exatamente os cinco valores atuais (`pending`, `paid`, `shipped`, `delivered`, `cancelled`) consumidos pelo site público. Estados de pagamento (aprovado, recusado, reembolsado, contestado…) e de envio (etiqueta paga, gerada, postada…) SHALL viver em campos próprios (`mp_payment_status`, `shipping_status`) sem alterar o enum, além de uma sinalização `needs_attention` para casos que exigem decisão humana.

#### Scenario: Reembolso não quebra o site
- **WHEN** um pedido pago é reembolsado
- **THEN** o site continua recebendo um dos cinco status conhecidos e o detalhe fica em `mp_payment_status`

### Requirement: Transições controladas e auditadas
Toda mudança de status SHALL ser validada contra as transições permitidas (`pending → paid → shipped → delivered`, com `cancelled` alcançável antes do envio) e registrada em trilha de eventos com autor (admin, webhook, job), estado anterior, novo estado e momento. Transições automáticas MUST ser monotônicas.

#### Scenario: Timeline do pedido
- **WHEN** o admin abre um pedido entregue
- **THEN** vê a sequência de eventos com data e origem de cada mudança (pagamento, etiqueta, postagem, entrega)

#### Scenario: Regressão bloqueada
- **WHEN** um processo automático tenta mover um pedido `delivered` para `shipped`
- **THEN** a transição é rejeitada e registrada como anomalia

### Requirement: Reserva atômica de estoque
O estoque de produtos físicos SHALL ser decrementado atomicamente na criação do pedido (site e dashboard) — dois pedidos simultâneos MUST NOT vender a mesma última unidade — e devolvido quando o pedido é cancelado, expira sem pagamento ou é reembolsado antes do envio. E-books não têm estoque.

#### Scenario: Corrida pelo último exemplar
- **WHEN** dois clientes fecham ao mesmo tempo o último exemplar de um livro
- **THEN** apenas um pedido é criado; o outro recebe erro de estoque

#### Scenario: Pedido expira
- **WHEN** um pedido `pending` passa da validade sem pagamento aprovado (confirmado na API)
- **THEN** o pedido vira `cancelled` e o estoque volta

### Requirement: Integridade contra escrita do cliente
Clientes autenticados MUST NOT conseguir alterar status, valores ou frete de pedidos; a criação de pedido SHALL ocorrer somente pelo fluxo do servidor que recalcula valores. Dados internos das integrações (eventos de webhook, tokens, identificadores de etiqueta) MUST ficar inacessíveis a clientes.

#### Scenario: Tentativa de adulterar o total
- **WHEN** um cliente tenta atualizar `orders.total` diretamente pela API do banco
- **THEN** a escrita é negada pelas políticas de acesso

### Requirement: Liberação de e-book condicionada ao pagamento
O acesso ao arquivo de um e-book SHALL ser liberado somente quando o pedido estiver `paid`, e revogado em reembolso total.

#### Scenario: Download antes do Pix cair
- **WHEN** o cliente volta do checkout com Pix pendente e tenta baixar o e-book
- **THEN** o download não está disponível até a confirmação do pagamento

### Requirement: Receita separada do repasse de frete
Relatórios e métricas de receita SHALL distinguir `subtotal` (produtos) de `shipping_cost` (repasse ao frete); a receita de produtos MUST NOT ser inflada pelo valor do frete.

#### Scenario: Overview após o go-live
- **WHEN** o admin vê a receita do mês no overview
- **THEN** o valor de produtos aparece separado do total com frete
