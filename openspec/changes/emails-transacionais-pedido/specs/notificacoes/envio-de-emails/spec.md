## Purpose

Garantir que os e-mails do pedido saiam de forma confiável, sem duplicar e sem atrapalhar o processamento do pedido, e dar ao admin visibilidade sobre o que foi enviado e entregue ao cliente, com a possibilidade de reenviar.

## ADDED Requirements

### Requirement: Disparo independente da origem da mudança
Os e-mails SHALL ser disparados pela mudança de estado do pedido, qualquer que seja a origem da mudança: criação do pedido, webhook do Mercado Pago, webhook ou consulta do Melhor Envio, cancelamento automático por prazo ou alteração manual pelo admin.

#### Scenario: Pagamento aprovado pelo webhook
- **WHEN** o webhook do Mercado Pago marca um pedido como pago
- **THEN** o e-mail de pagamento recebido é disparado

#### Scenario: Status alterado pelo admin
- **WHEN** o admin muda o status de um pedido para entregue pelo dashboard
- **THEN** o e-mail de pedido concluído é disparado

### Requirement: No máximo um envio por evento
Cada e-mail SHALL ser enviado automaticamente no máximo uma vez por evento, mesmo que a mudança de estado seja reprocessada, que o webhook seja reenviado ou que o envio seja tentado mais de uma vez. Para "aguardando pagamento", o evento é cada pagamento pendente distinto; para os demais, o evento é a primeira vez que o pedido entra no estado correspondente. O reenvio manual pelo admin é a única forma de enviar o mesmo e-mail de novo. Um e-mail enviado manualmente conta como o envio daquele evento: se a mudança de estado correspondente acontecer depois, ela não gera outro.

#### Scenario: Webhook reenviado
- **WHEN** o Mercado Pago reenvia a mesma notificação de pagamento aprovado três vezes
- **THEN** o cliente recebe um único e-mail de pagamento recebido

#### Scenario: Nova tentativa após falha de rede
- **WHEN** a primeira tentativa de envio fica sem resposta e é repetida
- **THEN** o cliente recebe um único e-mail

### Requirement: Envio não interfere no pedido
Uma falha ao enfileirar ou enviar um e-mail MUST NOT impedir, atrasar nem desfazer a mudança de estado do pedido.

#### Scenario: Provedor de e-mail fora do ar
- **WHEN** o provedor de e-mail está indisponível no momento em que o pagamento é aprovado
- **THEN** o pedido é marcado como pago normalmente e o e-mail fica pendente para nova tentativa

### Requirement: Novas tentativas
Falhas temporárias de envio SHALL ser repetidas automaticamente com intervalo crescente, em até 5 tentativas ao longo de cerca de uma hora. Falhas permanentes, como endereço inválido, MUST NOT ser repetidas. Esgotadas as tentativas, o e-mail MUST ficar registrado como falho, com o motivo.

#### Scenario: Instabilidade passageira
- **WHEN** a primeira tentativa falha por instabilidade e a segunda funciona
- **THEN** o e-mail é entregue e o histórico mostra duas tentativas

#### Scenario: Endereço inválido
- **WHEN** o provedor recusa o envio porque o endereço do cliente é inválido
- **THEN** o e-mail é marcado como falho sem novas tentativas

### Requirement: E-mail obsoleto não é enviado
No momento do envio, o e-mail SHALL ser conferido contra o estado atual do pedido. Se ele não fizer mais sentido, MUST ser descartado e registrado como descartado.

#### Scenario: Pix pago antes do envio do aviso
- **WHEN** o e-mail de aguardando pagamento ainda não saiu e o pedido já foi pago
- **THEN** o aviso de aguardando pagamento é descartado e o cliente recebe apenas o de pagamento recebido

### Requirement: Ordem dos e-mails do mesmo pedido
Os e-mails de um mesmo pedido SHALL chegar na ordem em que os eventos aconteceram. Um e-mail MUST NOT ser enviado enquanto um e-mail anterior do mesmo pedido ainda estiver pendente de envio ou de nova tentativa.

#### Scenario: Primeiro e-mail em nova tentativa
- **WHEN** o e-mail de pedido criado aguarda nova tentativa e o pagamento é aprovado em seguida
- **THEN** o e-mail de pagamento recebido só sai depois que o de pedido criado for enviado ou dado como falho

### Requirement: Remetente e respostas
Os e-mails SHALL sair de um remetente com o nome da loja em um domínio verificado no provedor. Respostas do cliente SHALL chegar ao contato da loja.

#### Scenario: Cliente responde o e-mail
- **WHEN** o cliente responde o e-mail de pedido enviado
- **THEN** a resposta chega à caixa de entrada da loja

### Requirement: Modo de teste
O envio SHALL ter um modo de teste em que todos os e-mails vão para um endereço interno configurado, com o assunto marcado como teste e indicando o destinatário original. No modo de teste, nenhum e-mail MUST chegar a clientes. O histórico SHALL continuar mostrando o cliente como destinatário e indicar que o e-mail foi entregue ao endereço interno.

#### Scenario: Teste em produção
- **WHEN** o modo de teste está ativo e um cliente real paga um pedido
- **THEN** o e-mail de pagamento recebido vai para o endereço interno, com o assunto marcado como teste e o e-mail do cliente indicado

### Requirement: Desligamento do envio
O envio SHALL poder ser desligado por configuração, sem alteração de código. Com o envio desligado, os e-mails — inclusive os reenviados manualmente — MUST ser registrados como descartados e MUST NOT ser enviados depois, quando o envio for religado.

#### Scenario: Envio desligado durante um incidente
- **WHEN** o envio é desligado, um pedido é pago e depois o envio é religado
- **THEN** o e-mail daquele pagamento não é enviado e aparece como descartado no histórico

### Requirement: Histórico de e-mails no dashboard
O detalhe do pedido no dashboard SHALL mostrar os e-mails do pedido com o tipo, o destinatário, a situação de envio (pendente, enviado, falho ou descartado), a situação de entrega, a data, a linha do tempo dos eventos de entrega e, quando houver, o motivo da falha, do descarte ou da rejeição. E-mails reenviados SHALL aparecer como novos itens, identificados como reenvio do original.

#### Scenario: Cliente diz que não recebeu
- **WHEN** o admin abre o pedido de um cliente que diz não ter recebido o código de rastreio
- **THEN** vê se o e-mail de pedido enviado saiu, para qual endereço, se foi entregue e quando

#### Scenario: Reenvio visível no histórico
- **WHEN** o admin reenvia o e-mail de pagamento recebido
- **THEN** o histórico mostra o e-mail original e, abaixo, o reenvio com sua própria situação

### Requirement: Rastreio da entrega
Cada e-mail enviado SHALL ter sua situação de entrega atualizada a partir das notificações do provedor: enviado, entregue, entrega atrasada, aberto, clicado, rejeitado pelo servidor do destinatário (bounce) ou marcado como spam. A situação exibida SHALL ser a mais relevante: rejeitado e marcado como spam prevalecem sobre qualquer situação positiva; entre as positivas, prevalece a mais avançada (clicado, depois aberto, entregue, atrasado, enviado), independentemente da ordem em que as notificações chegarem. Abertura e clique MAY não ser registrados quando o rastreio estiver desligado no domínio do remetente ou o programa de e-mail do cliente bloquear o rastreio.

#### Scenario: E-mail entregue e aberto
- **WHEN** o provedor notifica que o e-mail foi entregue e, depois, que foi aberto
- **THEN** o histórico mostra o e-mail como aberto, com os dois eventos na linha do tempo

#### Scenario: Notificações fora de ordem
- **WHEN** a notificação de abertura chega antes da de entrega
- **THEN** a situação exibida continua sendo "aberto"

#### Scenario: Endereço rejeitado
- **WHEN** o servidor do cliente rejeita o e-mail porque a caixa não existe
- **THEN** o histórico mostra o e-mail como rejeitado, com o motivo informado pelo provedor

#### Scenario: Marcado como spam depois de aberto
- **WHEN** o cliente abre o e-mail e em seguida o marca como spam
- **THEN** a situação exibida passa a ser "marcado como spam"

### Requirement: Notificações de entrega autenticadas
As notificações de entrega SHALL ser aceitas somente com assinatura válida do provedor e dentro de uma janela de 5 minutos do horário da assinatura. A mesma notificação recebida mais de uma vez MUST ser registrada uma única vez. Notificações de e-mails que não pertencem a nenhum e-mail de pedido, como os e-mails de conta do Auth, MUST ser ignoradas sem erro.

#### Scenario: Assinatura inválida
- **WHEN** chega uma notificação com assinatura inválida ou fora da janela de tempo
- **THEN** ela é recusada e nenhuma situação de entrega muda

#### Scenario: Notificação repetida
- **WHEN** o provedor reenvia a mesma notificação de entrega
- **THEN** o evento aparece uma única vez na linha do tempo

#### Scenario: E-mail de redefinição de senha
- **WHEN** chega a notificação de entrega de um e-mail de redefinição de senha
- **THEN** ela é aceita e ignorada, sem erro

### Requirement: Envio manual
O admin SHALL poder enviar pelo histórico um e-mail do pedido de um tipo que ainda não existe para ele, escolhendo entre os tipos que fazem sentido para o estado atual do pedido:

| tipo | disponível quando o pedido está |
|---|---|
| pedido criado | em qualquer estado, exceto cancelado |
| aguardando pagamento | pendente, com Pix pendente dentro do prazo |
| pagamento recebido | pago, enviado ou entregue |
| pagamento cancelado | cancelado |
| pedido enviado | enviado ou entregue, com código de rastreio |
| pedido concluído | entregue |

O dashboard MUST oferecer apenas os tipos disponíveis que ainda não existem no histórico; um tipo que já existe é reenviado pelo *Reenvio manual*. O envio SHALL passar pelas mesmas regras do envio automático — modo de teste, desligamento e descarte de e-mail obsoleto — e aparecer no histórico identificado como envio manual. O pedido MUST ser recusado quando o tipo não estiver disponível para o estado atual ou já existir. Somente administradores MAY enviar.

#### Scenario: Pedido pago antes da ativação
- **WHEN** o admin abre um pedido pago antes da ativação dos e-mails, sem nenhum e-mail no histórico
- **THEN** o dashboard oferece "Pedido criado" e "Pagamento recebido", e ao escolher "Pagamento recebido" o cliente recebe esse e-mail

#### Scenario: Tipo que não faz sentido
- **WHEN** alguém tenta enviar pela API o e-mail de pedido concluído para um pedido apenas pago
- **THEN** o pedido é recusado e nenhum e-mail é criado

#### Scenario: Evento acontece depois do envio manual
- **WHEN** o admin envia manualmente "Pedido criado" e o pedido é pago em seguida
- **THEN** o cliente recebe o de pagamento recebido normalmente, e não recebe um segundo "Pedido criado"

#### Scenario: Tipo já existente
- **WHEN** o pedido já tem o e-mail de pagamento recebido no histórico
- **THEN** o dashboard não o oferece no envio manual; o caminho é reenviá-lo

### Requirement: Reenvio manual
O admin SHALL poder reenviar pelo histórico qualquer e-mail do pedido que não esteja pendente nem em envio. Quando o e-mail já constar como entregue, aberto ou clicado, o dashboard MUST pedir confirmação antes de reenviar. O reenvio SHALL criar um novo e-mail no histórico, ligado ao original, montado com os dados atuais do pedido e enviado ao e-mail atual da conta do cliente. O reenvio MUST passar pelas mesmas regras do envio automático: e-mail obsoleto é descartado, o modo de teste redireciona e o envio desligado descarta. Enquanto houver um reenvio pendente do mesmo e-mail, um novo pedido de reenvio MUST ser recusado. Somente administradores MAY reenviar.

#### Scenario: Reenviar e-mail que falhou
- **WHEN** o e-mail de pedido enviado falhou e o admin clica em reenviar
- **THEN** um novo e-mail de pedido enviado é enviado ao cliente e aparece no histórico ligado ao original

#### Scenario: Reenviar e-mail já entregue
- **WHEN** o admin clica em reenviar um e-mail que consta como entregue
- **THEN** o dashboard pede confirmação e só reenvia depois dela

#### Scenario: Duplo clique
- **WHEN** o admin clica duas vezes seguidas em reenviar o mesmo e-mail
- **THEN** apenas um reenvio é criado e o segundo pedido é recusado com aviso

#### Scenario: Reenvio de aviso obsoleto
- **WHEN** o admin reenvia o e-mail de aguardando pagamento de um pedido que já foi pago
- **THEN** o reenvio é descartado com o motivo "pedido já pago" e o cliente não recebe o código de um Pix vencido

#### Scenario: Cliente tenta reenviar
- **WHEN** um usuário que não é administrador tenta reenviar um e-mail pela API
- **THEN** o pedido é recusado e nenhum e-mail é criado

### Requirement: Proteção de credenciais e dados
A chave do provedor de e-mail e o segredo de assinatura das notificações MUST NOT ser expostos ao navegador, ao dashboard ou à loja. O histórico de e-mails e os eventos de entrega MUST ser legíveis apenas por administradores.

#### Scenario: Cliente consulta a fila de e-mails
- **WHEN** um cliente autenticado tenta ler o histórico de e-mails pela API
- **THEN** não recebe nenhum registro
