## Why

A loja entrou em produção sem nenhuma comunicação com o cliente depois do checkout. Quem compra não recebe confirmação do pedido, não é avisado de que o Pix vence em 12 horas, não sabe quando o pagamento foi aprovado e não recebe o código de rastreio — hoje ele só existe dentro do dashboard. Com o cancelamento automático em 12h já ativo, o silêncio passou a custar venda: o cliente que gerou o Pix e esqueceu perde o pedido sem ser lembrado.

## What Changes

- **E-mails de conta em português e com a identidade da loja**: confirmação de cadastro e redefinição de senha. Os dois fluxos já funcionam — a confirmação de cadastro está ativa, e a loja chama `resetPasswordForEmail` e trata a nova senha em `/auth?view=reset` —, mas ambos os e-mails saem com o template padrão do Supabase, em inglês. Eles continuam sendo enviados pelo Supabase Auth, que já usa o Resend por SMTP; mudam apenas os templates.
- Envio automático de seis e-mails ao cliente, disparados pelas mudanças de estado do pedido:
  1. **Pedido criado** — confirmação com itens, frete e total.
  2. **Aguardando pagamento** — quando um pagamento pendente é gerado (Pix), com o prazo de 12h e o link para pagar.
  3. **Pagamento recebido** — quando o pagamento é aprovado.
  4. **Pagamento cancelado** — quando o pedido é cancelado, com o motivo (prazo expirado, estorno ou cancelamento pela loja).
  5. **Pedido enviado** — com o código de rastreio e o link de acompanhamento.
  6. **Pedido concluído** — quando a entrega é confirmada.
- O disparo acontece no banco, a partir da mudança de estado do pedido, e não em cada ponto do código que altera o pedido. Hoje o status muda em sete lugares (create_order, mp-webhook, mp-create-payment, melhor-envio-webhook, melhor-envio-etiquetas, expire_unpaid_orders e o seletor manual do dashboard); amarrar o e-mail a cada um deles garantiria que algum ficasse de fora.
- Cada e-mail é enviado automaticamente no máximo uma vez por pedido, com nova tentativa automática em caso de falha do Resend. A única forma de enviar de novo é o reenvio manual.
- Nova Edge Function que monta e envia os e-mails pela API do Resend.
- Histórico de e-mails no detalhe do pedido no dashboard, para o admin saber o que o cliente recebeu.
- **Rastreio da entrega** pelo webhook do Resend: cada e-mail do pedido mostra se foi entregue, se atrasou, se foi rejeitado pelo servidor do cliente (bounce), marcado como spam, aberto ou clicado.
- **Envio manual** pelo dashboard: o admin envia um e-mail que ainda não existe para o pedido, escolhendo entre os tipos que fazem sentido para o estado atual — por exemplo, "Pagamento recebido" para um pedido pago antes da ativação.
- **Reenvio manual** pelo dashboard: o admin reenvia qualquer e-mail do pedido que não esteja em envio no momento, com confirmação quando ele já consta como entregue. O reenvio gera um novo registro e mantém o original no histórico.
- Modo de teste que redireciona todos os e-mails para um endereço interno.

## Capabilities

### New Capabilities

- `notificacoes/emails-do-pedido`: quais e-mails o cliente recebe, o que dispara cada um e o que cada um precisa conter.
- `notificacoes/envio-de-emails`: garantias de entrega — no máximo um envio automático por evento, novas tentativas, remetente, modo de teste, rastreio da entrega, reenvio manual e visibilidade no dashboard.
- `notificacoes/emails-de-conta`: e-mails do Supabase Auth ligados à conta do cliente — confirmação de cadastro e redefinição de senha.

### Modified Capabilities

<!-- Nenhuma: openspec/specs/ ainda não tem capabilities publicadas. -->

## Impact

- **Banco**: nova tabela de fila de e-mails, nova tabela de eventos de entrega, trigger em `orders`, função de reenvio e job no pg_cron para novas tentativas. Nenhuma coluna existente de `orders` muda.
- **Edge Functions**: nova function de envio e nova function que recebe o webhook do Resend. As functions existentes de pagamento e frete **não mudam** — continuam só alterando o pedido.
- **Dashboard**: seção de histórico de e-mails no detalhe do pedido, com a situação de entrega, a linha do tempo de eventos e o botão de reenviar.
- **Supabase Auth**: templates de confirmação de cadastro e de recuperação de senha (assunto e HTML). A URL de redirecionamento da loja em produção precisa estar na lista de Redirect URLs do Auth; caso contrário o link do e-mail cai na Site URL.
- **Dependência externa**: API e webhooks do Resend. É preciso cadastrar no painel do Resend o endereço do webhook e guardar o segredo de assinatura como secret das functions; para registrar abertura e clique, o rastreio precisa estar ligado no domínio.
- **Credenciais do Resend**: API do Resend. **Pré-requisito**: o Resend configurado hoje no Supabase é o SMTP do Auth (confirmação de cadastro e senha), que não é acessível pelas Edge Functions — não existe nenhum secret do Resend no projeto. É preciso criar uma API key no Resend e cadastrá-la como secret, além de confirmar que o domínio do remetente está verificado.
- **Loja (lp-victor)**: nenhuma mudança obrigatória. Os e-mails apontam para a página do pedido que a loja já tem.

## Non-goals

- E-mails para o admin (novo pedido, pagamento aprovado). Pode vir depois reaproveitando a mesma fila.
- WhatsApp ou SMS.
- Lembrete antes do vencimento do Pix (por exemplo, faltando 2h). A fila suporta isso, mas não está no escopo.
- Descadastro: os seis e-mails são transacionais e não levam link de opt-out.
- Trocar o destinatário ao reenviar. O reenvio vai sempre para o e-mail atual da conta do cliente.
- Os demais templates do Auth — troca de e-mail, magic link, convite — continuam no padrão do Supabase. A loja não usa esses fluxos hoje.
- Reimplementar a redefinição de senha pela fila de e-mails ou por Auth Hook.
