## 1. Pré-requisitos (usuário)

- [x] 1.1 Criar uma API key no Resend com permissão de envio e confirmar que o domínio do remetente aparece como verificado (SPF e DKIM válidos) no painel do Resend
- [x] 1.2 Cadastrar nos secrets das Edge Functions `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO` e `EMAIL_TEST_RECIPIENT` (endereço interno), e verificar com `supabase secrets list` que os quatro aparecem
- [x] 1.3 Gerar um valor aleatório para `EMAIL_DISPATCH_SECRET`, cadastrá-lo como secret das functions e verificar que aparece em `supabase secrets list`
- [x] 1.4 No painel do Resend, cadastrar o webhook apontando para `.../functions/v1/resend-webhook` com os eventos `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.opened` e `email.clicked`, ligar *open* e *click tracking* no domínio e cadastrar o segredo de assinatura como `RESEND_WEBHOOK_SECRET`; verificar em `supabase secrets list`

## 2. Banco de dados

- [x] 2.1 Criar a migration com a tabela `email_outbox` (pedido com `on delete cascade`, tipo, chave de deduplicação `unique`, destinatário, situação, tentativas, `next_attempt_at`, último erro, id do Resend, datas) e verificar a estrutura com `list_tables`
- [x] 2.2 Habilitar RLS em `email_outbox` com `select` apenas para `profiles.role = 'admin'` e nenhuma política de escrita, e verificar que um usuário comum recebe zero linhas e que um admin lê o histórico
- [x] 2.3 Criar o trigger `AFTER INSERT OR UPDATE` em `orders` que enfileira os seis tipos conforme a tabela do design, com `on conflict do nothing` na chave e bloco `exception` que nunca propaga erro; verificar numa transação revertida que cada transição gera exatamente uma linha e que repeti-la não gera outra
- [x] 2.4 Verificar, na mesma transação revertida, que um pedido marcado como `shipped` sem `tracking_code` não enfileira o e-mail de enviado e que gravar o código depois enfileira
- [x] 2.5 Verificar, na mesma transação revertida, que um erro forçado dentro do trigger não impede o `update` do pedido
- [x] 2.6 Criar a RPC de reivindicação de lote com `for update skip locked`, que ignora linhas com uma linha anterior do mesmo pedido ainda `pending` ou `sending`; verificar que duas chamadas simultâneas não devolvem a mesma linha e que a ordem por pedido é respeitada
- [x] 2.7 Guardar `EMAIL_DISPATCH_SECRET` no Supabase Vault e criar o trigger `AFTER INSERT` em `email_outbox` que chama a function via `net.http_post` lendo o segredo do Vault; verificar em `net._http_response` que a chamada sai após o commit
- [x] 2.8 Agendar no pg_cron a varredura a cada minuto (pendentes vencidos e linhas presas em `sending` há mais de 10 minutos) e verificar em `cron.job` e em `cron.job_run_details` que ela executa
- [x] 2.9 Criar a tabela `email_events` (e-mail da fila com `on delete cascade`, tipo, momento, detalhe, payload, `svix_id` único) e a coluna `delivery_status` em `email_outbox`, com RLS de leitura só para admin; verificar que um usuário comum não lê nenhum evento
- [x] 2.10 Criar a RPC que registra um evento e atualiza `delivery_status` apenas quando o peso do novo evento for maior (tabela da decisão 8); verificar numa transação revertida que abertura antes de entrega mantém "aberto", que spam depois de aberto vira "spam" e que o mesmo `svix_id` duas vezes gera um único evento
- [x] 2.11 Criar a RPC `requeue_order_email` que exige admin, recusa original ou reenvio pendente e insere a nova linha ligada à original; verificar numa transação revertida que um não-admin é recusado, que o segundo pedido seguido é recusado e que a nova linha dispara a chamada imediata
- [x] 2.12 Versionar a migration em `supabase/migrations/` com a versão registrada em `schema_migrations`

## 3. Templates

- [x] 3.1 Criar `supabase/functions/_shared/emails/` com o layout, os componentes (botão, caixa, barra de progresso, tabela de itens) e os utilitários de escape de HTML, moeda `pt-BR` e data em `America/Sao_Paulo`, portados do gerador dos mockups
- [x] 3.2 Portar o mapeamento de forma de pagamento de `lib/payment-methods.ts` para o módulo compartilhado e verificar que `bank_transfer/pix` resulta em "Pix" e `credit_card/visa` em "Crédito · Visa"
- [x] 3.3 Implementar os seis templates devolvendo `{ subject, preheader, html, text }`, com os três textos do e-mail de cancelamento, e verificar gerando os seis HTML a partir de dados de exemplo e comparando com os mockups em `mockups/`
- [x] 3.4 Verificar que nenhum template estoura 375px de largura e que a versão texto contém todos os links completos
- [x] 3.5 Verificar que um título de produto com `<script>` aparece escapado no HTML gerado

## 4. Function de envio

- [x] 4.1 Criar a function `send-order-emails` com `verify_jwt = false` no `config.toml`, recusando com 401 chamadas sem `x-dispatch-secret` válido; verificar com `curl` com e sem o cabeçalho
- [x] 4.2 Implementar a carga dos dados do pedido, itens, capas e perfil, e o registro de "sem destinatário" quando o cliente não tiver e-mail
- [x] 4.3 Implementar a checagem de aplicabilidade por tipo (por exemplo, "aguardando pagamento" com pedido já pago ou cancelado vira `skipped`) e verificar com um pedido pago cuja linha de aguardando ainda está pendente
- [x] 4.4 Implementar a consulta ao Mercado Pago para o copia e cola e o link do QR Code, com a versão sem código quando a consulta falhar; verificar os dois caminhos
- [x] 4.5 Implementar a escolha do texto de cancelamento pelo último evento do pedido (`order_expired`, estorno em `order_refunds`, demais) e verificar os três casos
- [x] 4.6 Implementar o envio pelo Resend com `Idempotency-Key` igual ao id da linha e `tags` com o tipo e o id do pedido, gravando o id devolvido pelo Resend; verificar que duas chamadas com a mesma chave produzem um único e-mail
- [ ] 4.7 Implementar o tratamento de erro da tabela do design (permanente, temporário com intervalos de 1, 5, 15 e 30 minutos, limite de 5 tentativas) e verificar simulando uma resposta 500 e uma 422
- [x] 4.8 Implementar o modo de teste (`EMAIL_TEST_RECIPIENT`, prefixo `[TESTE → …]` no assunto) e o desligamento (`EMAIL_ENABLED=false` descarta com motivo), e verificar os dois
- [x] 4.9 Fazer o deploy e verificar com `list_edge_functions` que a function está ativa com `verify_jwt: false`

## 5. Webhook de rastreio

- [x] 5.1 Criar a function `resend-webhook` com `verify_jwt = false` no `config.toml`, validando a assinatura Svix sobre o corpo bruto em tempo constante e recusando carimbos com mais de 5 minutos; verificar com um payload assinado localmente (aceito), um com assinatura trocada (401) e um com carimbo antigo (401)
- [x] 5.2 Associar o evento ao e-mail da fila pelo `data.email_id` e gravar pela RPC da tarefa 2.10; responder 200 sem gravar quando não houver correspondência, e verificar com um `email_id` desconhecido
- [x] 5.3 Fazer o deploy e verificar com o botão de teste do painel do Resend que o evento chega e aparece em `email_events`

## 6. Dashboard

- [ ] 6.1 Adicionar ao detalhe do pedido o card "E-mails" com tipo, destinatário, situação de envio, selo de situação de entrega, data, motivo de falha, descarte ou rejeição, e reenvios agrupados sob o original; verificar num pedido com e-mails enviados, falhos, descartados e reenviados
- [ ] 6.2 Adicionar a linha do tempo recolhível dos eventos de entrega de cada e-mail e verificar num e-mail com entrega e abertura
- [ ] 6.3 Adicionar o botão "Reenviar" (oculto em e-mails pendentes ou em envio) com server action chamando `requeue_order_email`, confirmação quando a situação for entregue, aberto ou clicado, e aviso quando a RPC recusar; verificar os três casos
- [ ] 6.4 Verificar o card a 375px de largura e rodar `tsc`, `eslint` nos arquivos tocados e `next build` sem erros novos

## 7. E-mails de conta (Supabase Auth)

- [x] 7.1 Criar `supabase/templates/confirmacao-cadastro.html` e `supabase/templates/redefinir-senha.html` a partir dos mockups 07 e 08, com as variáveis `{{ .ConfirmationURL }}` e `{{ .Email }}`
- [ ] 7.2 Ler `mailer_otp_exp` pela Management API e ajustar o texto de validade do e-mail de redefinição para o valor real
- [ ] 7.3 Conferir pela Management API que a *Site URL* é `https://goleirovitor.com.br` e que as Redirect URLs incluem `https://goleirovitor.com.br/**`, corrigindo se preciso
- [ ] 7.4 Aplicar assunto e conteúdo dos dois templates com `PATCH /v1/projects/{ref}/config/auth` enviando apenas os quatro campos `mailer_*`, e verificar pela mesma API que o SMTP continua configurado
- [ ] 7.5 Testar com uma conta de teste: cadastro, clique na confirmação levando à loja, pedido de redefinição, clique levando a `/auth?view=reset` e troca de senha concluída

## 8. Validação ponta a ponta em modo de teste

- [ ] 8.1 Com `EMAIL_TEST_RECIPIENT` ativo, fazer um pedido real de valor baixo pagando com Pix e verificar a chegada, em ordem, de pedido criado, aguardando pagamento (com copia e cola funcional) e pagamento recebido
- [ ] 8.2 Seguir o mesmo pedido até a postagem e a entrega e verificar pedido enviado (código e link corretos) e pedido concluído
- [ ] 8.3 Criar um pedido e não pagar, e verificar o e-mail de cancelamento com o texto de prazo expirado após o cancelamento automático
- [ ] 8.4 Conferir os e-mails recebidos no Gmail (web e app) e no Apple Mail (Mac e iPhone), e verificar se não caíram no spam
- [ ] 8.5 Verificar no card do dashboard que todos os e-mails dos testes aparecem com a situação de envio e de entrega corretas
- [ ] 8.6 Com o modo de teste desligado só para isso, enviar para `delivered@resend.dev`, `bounced@resend.dev` e `complained@resend.dev` e verificar no card as situações entregue, rejeitado e marcado como spam
- [ ] 8.7 Reenviar pelo dashboard um e-mail que falhou e um já entregue, e verificar a confirmação, o novo item ligado ao original e a chegada do e-mail

## 9. Ativação

- [ ] 9.1 Remover `EMAIL_TEST_RECIPIENT` e verificar com o próximo pedido real que o e-mail chega ao cliente, conferindo no card do dashboard
