## Purpose

Permitir que o admin cancele pedidos e devolva dinheiro ao cliente com segurança: a ação certa para cada estado do pagamento, sem reembolso duplicado e com conciliação do que acontece fora do dashboard.

## ADDED Requirements

### Requirement: Ação decidida pelo estado real do pagamento
Antes de cancelar ou reembolsar, o sistema SHALL consultar o pagamento na API e decidir pela regra: pagamento `pending`/`in_process`/`authorized` → cancelamento do pagamento + expiração da preferência; pagamento `approved` → reembolso; sem pagamento criado → apenas expirar a preferência e cancelar o pedido localmente. O status local MUST NOT ser a única fonte da decisão.

#### Scenario: Cancelar pedido com boleto pendente
- **WHEN** o admin cancela um pedido cujo pagamento está `pending`
- **THEN** o pagamento é cancelado no MP, a preferência é expirada, o pedido vira `cancelled` e o estoque é liberado

#### Scenario: Estado mudou entre a tela e a ação
- **WHEN** o admin aciona "Cancelar" mas o pagamento acabou de ser aprovado
- **THEN** o sistema não executa o cancelamento, recarrega o estado e oferece o fluxo de reembolso

### Requirement: Reembolso idempotente e registrado
Cada solicitação de reembolso SHALL ser registrada (valor, tipo — total, somente produtos, ou personalizado — motivo e autor) com uma chave de idempotência única persistida ANTES da chamada à API; retries da mesma solicitação MUST reutilizar a mesma chave. Enquanto houver reembolso solicitado ou em processamento para o pedido, uma nova solicitação MUST NOT ser criada. O valor reembolsado acumulado MUST NOT exceder o valor pago.

#### Scenario: Timeout na chamada de reembolso
- **WHEN** a chamada de reembolso falha por timeout e o admin tenta de novo
- **THEN** a mesma chave de idempotência é reenviada e nenhum reembolso duplicado é criado

#### Scenario: Duplo clique
- **WHEN** o admin aciona reembolso duas vezes em sequência
- **THEN** apenas uma solicitação é registrada e executada

### Requirement: Reembolso tratado como assíncrono
Um reembolso SHALL ser considerado concluído somente quando a API o retornar aprovado ou quando a notificação de pagamento refletir a devolução. Reembolsos Pix em contingência (`in_process`) SHALL ser exibidos como "em processamento" e acompanhados até o desfecho.

#### Scenario: Reembolso Pix em contingência
- **WHEN** a API responde que o reembolso ficou `in_process`
- **THEN** o pedido mostra "reembolso em processamento" e só é marcado como reembolsado após confirmação

### Requirement: Modalidades de reembolso
O admin SHALL poder escolher: reembolso total; "somente produtos" (total menos frete), para pedidos já enviados; ou valor específico por item. Pedidos só de e-book SHALL ter reembolso total com revogação do acesso ao arquivo.

#### Scenario: Devolução após envio
- **WHEN** o cliente devolve um pedido já postado e a política é não devolver o frete
- **THEN** o admin executa "somente produtos" e o valor reembolsado é `total − shipping_cost`

### Requirement: Bloqueios e mensagens de erro
O sistema SHALL impedir, com explicação clara: reembolso após 180 dias da aprovação; reembolso quando a API recusa por saldo indisponível na conta MP; reembolso parcial quando a transação não suporta (oferecendo o total como alternativa).

#### Scenario: Fora do prazo
- **WHEN** o admin tenta reembolsar um pagamento aprovado há mais de 180 dias
- **THEN** a ação é bloqueada com o aviso "fora do prazo do Mercado Pago"

### Requirement: Conciliação de devoluções externas
Reembolsos originados fora do dashboard (painel do MP, mediação/BPP, chargeback) SHALL ser detectados pelas notificações e refletidos no pedido, incluindo valor acumulado devolvido.

#### Scenario: Reembolso feito pelo painel do MP
- **WHEN** o titular devolve um pagamento diretamente no painel do Mercado Pago
- **THEN** o pedido passa a exibir o reembolso e o status de pagamento correspondente

### Requirement: Contestações (chargeback) e alerta de fraude
Ao receber contestação, o sistema SHALL sinalizar o pedido, bloquear geração/postagem de etiqueta e exibir o prazo de defesa com envio de comprovantes (rastreio, tela do pedido). Ao receber alerta de fraude, o pedido MUST ser bloqueado para envio imediatamente.

#### Scenario: Chargeback de pedido pago
- **WHEN** chega notificação de contestação para um pedido `paid` ainda não postado
- **THEN** o pedido fica `needs_attention`, a geração de etiqueta é bloqueada e o admin vê o prazo para anexar comprovantes
