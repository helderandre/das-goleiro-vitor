## Purpose

Gerar, pagar, imprimir e cancelar etiquetas do Melhor Envio a partir do dashboard, para pedidos pagos com itens físicos, em envio não comercial (conta CPF, Declaração de Conteúdo).

## ADDED Requirements

### Requirement: Pré-condições para gerar etiqueta
A geração de etiqueta SHALL exigir: pedido `paid` com item físico; dados completos do destinatário (nome, CPF, telefone, e-mail, endereço — Correios exige documento, Jadlog exige telefone); ausência de contestação, disputa ou alerta de fraude; e saldo suficiente na Melhor Carteira. Pré-condição não atendida MUST bloquear a ação com o motivo específico.

#### Scenario: Pedido sem CPF do destinatário
- **WHEN** o admin tenta gerar etiqueta de um pedido sem CPF do destinatário
- **THEN** a ação é bloqueada indicando o dado faltante e onde completá-lo

#### Scenario: Saldo insuficiente
- **WHEN** o saldo da carteira é menor que o custo da etiqueta
- **THEN** a ação é bloqueada com aviso e orientação de recarga

### Requirement: Envio não comercial (DC-e)
As etiquetas SHALL ser criadas como envio não comercial: `non_commercial` verdadeiro, sem chave de NF-e, remetente pessoa física (CPF) com inscrição estadual vazia/ISENTO. A lista de produtos declarada MUST estar completa e correta (nome, quantidade, valor unitário) — ela alimenta a DC-e emitida via SEFAZ — e a soma declarada MUST ser igual ao valor segurado.

#### Scenario: Declaração consistente
- **WHEN** uma etiqueta é criada para um pedido de 2 livros de R$ 45,00
- **THEN** a declaração lista os 2 itens e o valor segurado é R$ 90,00

### Requirement: Um envio por pacote da cotação
Para transportadoras que não aceitam múltiplos volumes (Correios, J&T, Loggi, Jadlog Centralizado), cada pacote da cotação congelada SHALL virar um envio separado, todos vinculados ao pedido. O identificador de cada envio no Melhor Envio SHALL ser persistido — ele é a única chave para pagamento, geração, impressão, cancelamento e rastreio.

#### Scenario: Cotação com dois pacotes nos Correios
- **WHEN** a cotação congelada tem 2 pacotes e o serviço é PAC
- **THEN** são criados 2 envios, cada um com seu identificador persistido no pedido

### Requirement: Fluxo por etapas, retomável e idempotente
O fluxo carrinho → pagamento → geração → impressão SHALL persistir o resultado de cada etapa e ser retomável do ponto de falha sem duplicar cobrança (tentar pagar etiqueta já paga SHALL ser tratado como sucesso). A geração é assíncrona: a impressão SHALL aguardar a confirmação de geração, com retry.

#### Scenario: Falha entre pagamento e geração
- **WHEN** o processo falha após o pagamento da etiqueta
- **THEN** uma nova execução retoma da geração, sem pagar de novo

#### Scenario: Impressão imediata após gerar
- **WHEN** a impressão é solicitada antes de a geração concluir
- **THEN** o sistema aguarda/repete até obter o arquivo, em vez de falhar definitivamente

### Requirement: Preço da etiqueta conferido contra o frete cobrado
Antes de pagar a etiqueta, o preço retornado pelo carrinho SHALL ser comparado ao `shipping_cost` congelado: se maior, o fluxo MUST parar e sinalizar o pedido para decisão do admin (absorver, trocar serviço ou reembolsar).

#### Scenario: Tabela de frete subiu após o pagamento do pedido
- **WHEN** o carrinho retorna preço maior que o frete cobrado do cliente
- **THEN** a etiqueta não é paga automaticamente e o pedido fica `needs_attention` com a diferença exibida

### Requirement: Impressão acessível ao admin
Após gerada, a etiqueta SHALL ficar acessível ao admin por link de impressão que não exija login no Melhor Envio, junto com a instrução de postagem (agência/prazo).

#### Scenario: Admin imprime a etiqueta
- **WHEN** a geração conclui
- **THEN** o pedido exibe o link de impressão e a orientação "postar em até 7 dias"

### Requirement: Cancelamento de etiqueta
O cancelamento SHALL primeiro verificar se a etiqueta é cancelável; se sim, cancelar com motivo e registrar que o estorno vai para a Melhor Carteira da loja (não para o cliente), com expectativa de crédito em ~12 h quando já gerada. Etiqueta não cancelável (já postada) SHALL direcionar para logística reversa (Correios).

#### Scenario: Cancelar antes da postagem
- **WHEN** o admin cancela um pedido cuja etiqueta foi gerada mas não postada
- **THEN** a etiqueta é cancelada, o estorno à carteira fica registrado como pendente e o reembolso ao cliente segue pelo Mercado Pago

### Requirement: Prazos de postagem monitorados
O sistema SHALL alertar o admin sobre etiquetas geradas e não postadas a partir do 5º dia e SHALL tratar expiração/cancelamento automático da etiqueta como estado terminal do envio (pedido permanece pago, sinalizado para ação).

#### Scenario: Etiqueta parada há 5 dias
- **WHEN** uma etiqueta gerada completa 5 dias sem postagem
- **THEN** o pedido aparece com alerta de prazo para o admin
