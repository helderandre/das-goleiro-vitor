## Purpose

Permitir que o admin crie pedidos completos pelo dashboard — venda por WhatsApp, evento ou balcão — com o mesmo ciclo de cobrança, frete e envio dos pedidos do site.

## ADDED Requirements

### Requirement: Criação de pedido pelo admin
O admin SHALL poder criar um pedido escolhendo produtos e quantidades, para um cliente existente ou avulso (nome, e-mail, telefone e CPF), com endereço de entrega quando houver item físico. Preços e total MUST ser calculados no servidor a partir do cadastro de produtos; o pedido SHALL registrar a origem `manual`.

#### Scenario: Venda por WhatsApp
- **WHEN** o admin cria um pedido com 1 livro para um cliente avulso informando CEP e endereço
- **THEN** o pedido nasce `pending` com subtotal calculado do cadastro e os dados do destinatário completos

### Requirement: Frete escolhido de cotação real
Para pedidos com item físico, o admin SHALL escolher o serviço de frete a partir de uma cotação real do Melhor Envio no momento da criação, e a cotação escolhida SHALL ser congelada no pedido como nos pedidos do site.

#### Scenario: Escolha do serviço
- **WHEN** o admin informa o CEP do cliente na criação do pedido
- **THEN** vê os serviços disponíveis com preço e prazo e a escolha fica registrada no pedido

### Requirement: Mesmas regras de estoque
A criação manual SHALL reservar estoque atomicamente como a criação pelo site; sem estoque suficiente, a criação MUST falhar com mensagem clara.

#### Scenario: Último exemplar
- **WHEN** o admin tenta criar um pedido de um produto com estoque zerado
- **THEN** a criação é recusada indicando o produto sem estoque

### Requirement: Cobrança gerada e acompanhada
O pedido manual SHALL ganhar cobrança pelo mesmo mecanismo dos pedidos do site (preferência com dados do pagador pré-preenchidos e validade), com o link exposto ao admin para envio ao cliente. A confirmação de pagamento SHALL ocorrer pelo mesmo webhook, sem tratamento especial.

#### Scenario: Cliente paga o link
- **WHEN** o cliente paga o link enviado pelo admin
- **THEN** o pedido vira `paid` pelo webhook e o fluxo de etiqueta fica disponível

#### Scenario: Link não pago até a validade
- **WHEN** a cobrança expira sem pagamento
- **THEN** o pedido é cancelado automaticamente e o estoque liberado

### Requirement: Registro de pagamento fora do sistema
O admin SHALL poder marcar um pedido manual como pago por meio externo (ex.: dinheiro em evento), anexando comprovante opcional; essa ação SHALL ficar registrada na trilha do pedido com autor e forma de pagamento.

#### Scenario: Venda em dinheiro num evento
- **WHEN** o admin registra pagamento externo em um pedido manual
- **THEN** o pedido vira `paid` com a forma "externo" e a ação auditada
