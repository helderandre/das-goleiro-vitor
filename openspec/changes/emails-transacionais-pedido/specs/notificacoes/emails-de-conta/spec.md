## Purpose

Fazer com que os e-mails de conta enviados pelo Supabase Auth — confirmação de cadastro e redefinição de senha — falem português, tenham a identidade da loja e levem o cliente de volta à loja em produção.

## ADDED Requirements

### Requirement: E-mail de confirmação de cadastro
Ao se cadastrar, o cliente SHALL receber um e-mail em português com a identidade visual da loja, com o assunto "Confirme seu cadastro — Goleiro Vitor", um botão para confirmar o e-mail, o link completo como alternativa ao botão e a orientação para ignorar o e-mail caso não tenha criado a conta.

#### Scenario: Novo cadastro
- **WHEN** um cliente cria uma conta na loja
- **THEN** recebe o e-mail de confirmação em português com o botão de confirmação

#### Scenario: Botão não funciona
- **WHEN** o programa de e-mail do cliente não exibe o botão
- **THEN** o cliente consegue copiar o link completo de confirmação do corpo do e-mail

### Requirement: E-mail de redefinição de senha
Ao pedir para redefinir a senha, o cliente SHALL receber um e-mail em português com a identidade visual da loja, com o assunto "Redefina sua senha — Goleiro Vitor", o e-mail da conta, um botão para criar a nova senha, o link completo como alternativa, a validade do link e a orientação para ignorar o e-mail caso não tenha feito o pedido. A validade informada MUST corresponder à configuração do Auth.

#### Scenario: Esqueceu a senha
- **WHEN** o cliente pede para redefinir a senha na loja
- **THEN** recebe o e-mail em português com o botão para criar a nova senha e o prazo de validade do link

### Requirement: Links levam à loja em produção
Os links dos e-mails de conta SHALL levar à loja em produção: a confirmação de cadastro à loja, e a redefinição de senha à tela de nova senha da loja. Eles MUST NOT apontar para localhost nem para outro domínio.

#### Scenario: Link de redefinição
- **WHEN** o cliente clica no botão do e-mail de redefinição de senha
- **THEN** abre a tela de criar nova senha em goleirovitor.com.br

#### Scenario: Link de confirmação
- **WHEN** o cliente clica no botão do e-mail de confirmação de cadastro
- **THEN** a conta é confirmada e ele chega à loja em goleirovitor.com.br

### Requirement: Canal de envio preservado
Os e-mails de conta SHALL continuar sendo enviados pelo Supabase Auth, pelo SMTP já configurado. Somente o assunto e o conteúdo mudam; o fluxo de cadastro e de redefinição de senha da loja MUST continuar funcionando sem alteração.

#### Scenario: Fluxo existente intacto
- **WHEN** os novos templates são aplicados
- **THEN** cadastro, confirmação, pedido de redefinição e troca de senha funcionam como antes

### Requirement: Contato de ajuda nos e-mails de conta
Como o remetente dos e-mails de conta não recebe respostas, eles SHALL indicar um endereço de contato da loja para dúvidas, em vez de pedir que o cliente responda o e-mail.

#### Scenario: Cliente com dúvida sobre a conta
- **WHEN** o cliente lê o rodapé do e-mail de redefinição de senha
- **THEN** encontra o endereço de contato da loja
