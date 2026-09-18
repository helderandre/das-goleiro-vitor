## Purpose

Manter o cliente informado sobre o próprio pedido por e-mail, da criação à entrega, com o conteúdo de que ele precisa em cada etapa: o que comprou, até quando pagar, como pagar, quando o pagamento caiu, como rastrear e quando chegou.

## ADDED Requirements

### Requirement: Destinatário do e-mail do pedido
Os e-mails do pedido SHALL ser enviados ao e-mail da conta do cliente dono do pedido. Quando o cliente não tiver e-mail cadastrado, o e-mail MUST NOT ser enviado e o motivo MUST ficar registrado no histórico do pedido.

#### Scenario: Cliente com e-mail
- **WHEN** um pedido de um cliente com e-mail cadastrado muda de estado
- **THEN** o e-mail correspondente é enviado para o e-mail da conta desse cliente

#### Scenario: Cliente sem e-mail
- **WHEN** o dono do pedido não tem e-mail cadastrado
- **THEN** nenhum e-mail é enviado e o histórico do pedido registra que faltou o destinatário

### Requirement: E-mail de pedido criado
Quando um pedido é criado, o cliente SHALL receber um e-mail confirmando o pedido com: número do pedido, itens (título, quantidade e preço), subtotal, frete com o nome do serviço escolhido, total, endereço de entrega quando houver item físico, o prazo de pagamento (12 horas após a criação, em horário de Brasília) e um link para a página do pedido na loja.

#### Scenario: Pedido com livro físico
- **WHEN** o cliente fecha um pedido com um livro físico e frete SEDEX
- **THEN** recebe um e-mail com o livro, o subtotal, a linha de frete "SEDEX", o total, o endereço e o horário limite para pagar

#### Scenario: Enviado depois do pagamento
- **WHEN** o e-mail de pedido criado é enviado com o pedido já pago, por envio manual
- **THEN** ele informa que o pagamento já foi recebido e não mostra prazo de pagamento nem aviso de cancelamento

#### Scenario: Prazo exibido no fuso da loja
- **WHEN** um pedido é criado às 11:53 no horário de Brasília
- **THEN** o e-mail informa que o pagamento deve ser feito até as 23:53 do mesmo dia, horário de Brasília

### Requirement: E-mail de aguardando pagamento
Quando um pagamento pendente é gerado para um pedido pendente — hoje, um Pix —, o cliente SHALL receber um e-mail com o valor, o código Pix copia e cola, um link para abrir o QR Code e o horário em que o Pix vence. O e-mail SHALL ser enviado uma vez para cada pagamento pendente distinto: se o cliente gerar um novo Pix, recebe o novo código. Pagamentos aprovados na hora, como cartão aprovado, MUST NOT gerar este e-mail.

#### Scenario: Pix gerado
- **WHEN** o cliente gera um Pix para o pedido
- **THEN** recebe um e-mail com o copia e cola, o link do QR Code e o horário de vencimento

#### Scenario: Novo Pix para o mesmo pedido
- **WHEN** o cliente gera um segundo Pix para o mesmo pedido
- **THEN** recebe um novo e-mail com o código do segundo Pix

#### Scenario: Cartão aprovado na hora
- **WHEN** o cliente paga com cartão e o pagamento é aprovado imediatamente
- **THEN** não recebe o e-mail de aguardando pagamento, apenas o de pagamento recebido

#### Scenario: Código do Pix indisponível no envio
- **WHEN** não é possível obter o copia e cola do Pix no momento do envio
- **THEN** o e-mail é enviado mesmo assim, com o valor, o vencimento e o link para pagar pela página do pedido

### Requirement: E-mail de pagamento recebido
Quando o pedido passa para pago, o cliente SHALL receber um e-mail com o número do pedido, o valor pago, a forma de pagamento em linguagem clara (por exemplo, "Pix" ou "Crédito · Visa"), os itens e o próximo passo: que o código de rastreio chegará por e-mail quando o pacote for postado.

#### Scenario: Pix aprovado
- **WHEN** o Mercado Pago confirma o Pix de um pedido pendente
- **THEN** o cliente recebe o e-mail de pagamento recebido informando o valor e "Pix"

### Requirement: E-mail de pagamento cancelado
Quando o pedido passa para cancelado, o cliente SHALL receber um e-mail com o número do pedido e o motivo do cancelamento, com texto próprio para cada caso:
- **prazo expirado** — o pagamento não foi identificado em 12 horas e os livros voltaram para o estoque; orienta a responder o e-mail com o comprovante caso já tenha pago;
- **estorno** — informa o valor estornado e o prazo de devolução conforme a forma de pagamento;
- **cancelado pela loja** — informa que a equipe cancelou o pedido e como tirar dúvidas.

O e-mail SHALL oferecer um link para voltar à loja.

#### Scenario: Pedido vencido
- **WHEN** um pedido não é pago em 12 horas e é cancelado automaticamente
- **THEN** o cliente recebe o e-mail de cancelamento com o motivo "prazo expirado" e a orientação para quem já pagou

#### Scenario: Pedido estornado
- **WHEN** o admin cancela e estorna um pedido pago
- **THEN** o cliente recebe o e-mail de cancelamento com o valor estornado

### Requirement: E-mail de pedido enviado
Quando o pedido está enviado e tem código de rastreio, o cliente SHALL receber um e-mail com o código de rastreio, um link para acompanhar a entrega, a transportadora e o serviço, o prazo estimado quando conhecido e os itens. O link SHALL ser o de rastreio informado pela transportadora quando existir; caso contrário, um link público de rastreio pelo código. Se o pedido for marcado como enviado sem código, o e-mail MUST aguardar o código e ser enviado assim que ele for registrado.

#### Scenario: Postagem com código
- **WHEN** a transportadora registra a postagem e o pedido recebe o código de rastreio
- **THEN** o cliente recebe o e-mail com o código e o link para rastrear

#### Scenario: Enviado sem código
- **WHEN** o admin marca o pedido como enviado antes de haver código de rastreio
- **THEN** nenhum e-mail é enviado nesse momento, e o e-mail de pedido enviado sai quando o código for registrado

### Requirement: E-mail de pedido concluído
Quando o pedido passa para entregue, o cliente SHALL receber um e-mail confirmando a entrega, com o número do pedido e a orientação para relatar problemas com a entrega em até 7 dias respondendo o e-mail.

#### Scenario: Entrega confirmada
- **WHEN** a transportadora confirma a entrega
- **THEN** o cliente recebe o e-mail de pedido concluído

### Requirement: Padrão de conteúdo dos e-mails do pedido
Todos os e-mails do pedido SHALL estar em português do Brasil, seguir a identidade visual da loja, trazer o número do pedido no assunto, ter um texto de prévia para a caixa de entrada, uma versão em texto puro e links absolutos para a loja. Eles SHALL ser legíveis em telas de 375px de largura sem rolagem horizontal. Eles MUST NOT conter CPF, dados de cartão além da bandeira, nem o endereço de e-mail de outra pessoa.

#### Scenario: Leitura no celular
- **WHEN** o cliente abre qualquer um dos e-mails num celular
- **THEN** o conteúdo cabe na largura da tela e os botões podem ser tocados

#### Scenario: Cliente que não exibe HTML
- **WHEN** o programa de e-mail do cliente mostra apenas texto
- **THEN** ele lê as mesmas informações, incluindo links completos

### Requirement: Sem e-mails retroativos
A ativação dos e-mails MUST NOT gerar envios automáticos para pedidos e mudanças de estado anteriores a ela. Apenas mudanças ocorridas depois da ativação disparam e-mails automaticamente; o admin MAY enviar manualmente um e-mail de um pedido anterior (ver `notificacoes/envio-de-emails`, *Envio manual*).

#### Scenario: Pedido já pago antes da ativação
- **WHEN** os e-mails são ativados e existe um pedido que já estava pago
- **THEN** o cliente desse pedido não recebe automaticamente o e-mail de pedido criado nem o de pagamento recebido, mas recebe o de pedido enviado quando ele for postado
