## Purpose

Cobrar pedidos da loja e do dashboard via Mercado Pago Checkout Pro: uma preferência criada no servidor, com valores recalculados a partir do banco, que gera o link de pagamento (`init_point`) do pedido.

## ADDED Requirements

### Requirement: Preferência criada no servidor com total recalculado
O sistema SHALL criar a preferência de pagamento exclusivamente no servidor, recalculando preços a partir de `products` (com desconto aplicado) e da cotação de frete congelada no pedido. Valores enviados pelo cliente (browser) MUST NOT ser usados como fonte do total cobrado.

#### Scenario: Total manipulado pelo cliente
- **WHEN** um pedido é criado com um `total` divergente da soma servidor (itens + frete)
- **THEN** a preferência é criada com o total recalculado no servidor e o pedido é corrigido, ou a criação é recusada com erro

### Requirement: Frete cobrado como item da preferência
O frete escolhido SHALL entrar na preferência como um item próprio ("Frete – <serviço>") com o valor da cotação congelada. O campo de custo de envio da preferência MUST NOT ser usado (não disponível para Checkout Pro); o endereço do destinatário SHALL ser enviado apenas como dado de antifraude.

#### Scenario: Pedido com item físico
- **WHEN** a preferência de um pedido com frete de R$ 22,50 (SEDEX) é criada
- **THEN** ela contém os itens do pedido mais um item "Frete – SEDEX" de R$ 22,50, e o total da preferência é igual a `subtotal + shipping_cost`

#### Scenario: Pedido só de e-books
- **WHEN** todos os itens do pedido são e-books
- **THEN** a preferência não contém item de frete nem dados de envio, e o meio boleto é excluído

### Requirement: Vínculo pedido–pagamento
Toda preferência SHALL carregar `external_reference` igual ao id do pedido (e o id do pedido em `metadata`), e o id da preferência SHALL ser persistido no pedido.

#### Scenario: Notificação localiza o pedido
- **WHEN** uma notificação de pagamento chega com `external_reference` preenchido
- **THEN** o sistema localiza o pedido correspondente sem depender de estado em memória

### Requirement: Limites e formatos dos campos
A preferência SHALL respeitar os limites documentados: `external_reference` ≤ 64 caracteres `[A-Za-z0-9_-]`; `notification_url` HTTPS com ≤ 248 caracteres; `statement_descriptor` ≤ 13 caracteres; `back_urls` e `picture_url` sempre HTTPS. `binary_mode` MUST ser falso quando Pix/boleto estiverem habilitados.

#### Scenario: Descritor de fatura
- **WHEN** a preferência é criada
- **THEN** o descritor enviado tem no máximo 13 caracteres (ex.: `GOLEIROVITOR`)

### Requirement: Expiração alinhada à reserva de estoque
Toda preferência SHALL ter expiração explícita: 24 horas quando boleto não está habilitado e 3 dias quando está. A expiração do pedido (`expires_at`) SHALL ser igual à da preferência.

#### Scenario: Pedido não pago expira
- **WHEN** a preferência expira sem pagamento aprovado
- **THEN** o pedido é elegível para cancelamento automático com liberação de estoque

### Requirement: Retorno do checkout não confirma pagamento
A página de retorno (back_url) SHALL apenas exibir o estado informado na query (aguardando, aprovado, recusado) sem alterar o pedido. A confirmação de pagamento MUST ocorrer somente via notificação/consulta à API.

#### Scenario: Pix pendente no retorno
- **WHEN** o comprador volta do checkout com um Pix ainda não pago
- **THEN** a página mostra "aguardando confirmação" e o pedido permanece `pending`

### Requirement: Link de cobrança para o admin
Para pedidos criados no dashboard, o sistema SHALL expor o `init_point` da preferência ao admin (visualizar e copiar) enquanto o pedido estiver aguardando pagamento.

#### Scenario: Admin envia cobrança por WhatsApp
- **WHEN** o admin cria um pedido manual e clica em "Gerar cobrança"
- **THEN** recebe um link de pagamento válido que pode ser copiado e enviado ao cliente
