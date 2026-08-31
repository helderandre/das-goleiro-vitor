## Purpose

Manter o status de envio e o código de rastreio dos pedidos atualizados automaticamente, combinando webhooks do Melhor Envio com verificação ativa periódica.

## ADDED Requirements

### Requirement: Webhook do Melhor Envio validado e idempotente
O sistema SHALL expor um endpoint público que valida o header `X-ME-Signature` (HMAC-SHA256 do corpo bruto com o Secret do aplicativo; corpo lido antes de qualquer parse) e responde 2xx em menos de 6 segundos, processando depois. Eventos duplicados ou fora de ordem MUST NOT regredir o estado do envio (entregue nunca volta a postado).

#### Scenario: Assinatura inválida
- **WHEN** chega um POST cujo HMAC não confere
- **THEN** o sistema responde 401 e nada é alterado

#### Scenario: Retry do mesmo evento
- **WHEN** o Melhor Envio reenvia um `order.posted` já processado
- **THEN** o sistema responde 200 sem repetir a transição

### Requirement: Eventos refletidos no pedido
Eventos de etiqueta SHALL atualizar o envio e o pedido: postagem → pedido `shipped` com link de rastreio; entrega → `delivered` com data; cancelamento/não entrega/pausa → sinalizar `needs_attention` sem alterar o status principal do pedido. Estados intermediários (paga, gerada) SHALL ser registrados sem mudar o status do pedido.

#### Scenario: Pacote postado
- **WHEN** chega o evento de postagem de um envio do pedido
- **THEN** o pedido vira `shipped`, mesmo que o código da transportadora ainda não exista

#### Scenario: Entrega
- **WHEN** chega o evento de entrega
- **THEN** o pedido vira `delivered` com a data registrada

### Requirement: Verificação ativa complementar
O sistema SHALL verificar periodicamente (em lote, a cada ~2 h) os envios não terminais e os postados sem código de transportadora, aplicando as mesmas regras de transição. Isso MUST cobrir: código que chega até 1 dia útil após a postagem (sem evento próprio), webhooks perdidos e etiquetas geradas fora do aplicativo.

#### Scenario: Código chega depois da postagem
- **WHEN** um envio está postado sem código de transportadora e a verificação ativa o encontra preenchido
- **THEN** o código é salvo e passa a ser exibido ao cliente

### Requirement: Código exibido e link público
O código de rastreio exibido SHALL ser o da transportadora e, na sua ausência, o código do Melhor Envio; o protocolo interno (ORD-…) MUST NOT ser exibido ao cliente. O link público SHALL ser a página do Melhor Rastreio recebida no evento. Enquanto o envio está postado sem código, o cliente SHALL ver aviso de que o código pode levar até 1 dia útil.

#### Scenario: Rastreio no site
- **WHEN** o cliente abre um pedido postado
- **THEN** vê o código disponível (transportadora ou ME) e um link de rastreio que abre sem login

### Requirement: Edição manual preservada para envios externos
O campo de rastreio manual SHALL continuar disponível para pedidos enviados fora do Melhor Envio; quando existir envio vinculado ao ME, o valor vindo da integração SHALL prevalecer sobre o manual.

#### Scenario: Envio feito por fora
- **WHEN** o admin envia um pedido sem usar o Melhor Envio e digita o código
- **THEN** o código manual é exibido ao cliente normalmente
