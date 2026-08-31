# Design — Correção e conclusão da integração MP + Melhor Envio

## Context

Ver `proposal.md` (Why) e `docs/dossie-pagamento-frete.html` (pesquisa nas docs oficiais, 27/08/2026). O estado real, levantado via MCP do Supabase em 31/08/2026:

**Já existe e funciona** (10 Edge Functions ativas, criadas em 09/03/2026, `verify_jwt: false` em todas):

| Function | O que faz hoje |
|---|---|
| `mp-create-preference` | Checkout Pro; itens do pedido + item "Frete"; `payer` do profile; back_urls do site; `notification_url` → `mp-webhook`. Exige usuário autenticado dono do pedido. |
| `mp-create-payment` | Checkout Transparente: Pix (QR, copia-e-cola, ticket) e cartão tokenizado, com `X-Idempotency-Key`. Mesma exigência de dono do pedido. |
| `mp-check-payment` / `mp-test-card-payment` | Consulta de pagamento / teste de cartão. |
| `mp-webhook` | Valida assinatura (parcialmente), loga em `mp_webhook_logs`, busca o pagamento tentando as credenciais de `mp_credentials`, localiza o pedido por `short_id` ou `id` e atualiza `orders`. |
| `melhor-envio-auth` | OAuth completo: `/oauth/authorize`, callback trocando `code` por token, refresh, persistência em `melhor_envio_tokens`. Callback = a própria function. |
| `melhor-envio-cotacao` | `POST /shipment/calculate` com `volumes` (um volume), retorno normalizado com `custom_price`/`custom_delivery_time`; refresh de token embutido. |
| `melhor-envio-etiquetas` | Ações `add_to_cart`, `checkout`, `generate`, `print`, `tracking`, `status`; grava `me_cart_id`, `shipping_status`, `label_url`, `tracking_code`. |
| `melhor-envio-webhook` | Recebe eventos e atualiza `orders` por `me_cart_id`. |
| `melhor-envio-debug` | Diagnóstico. |

**Evidência de que rodou**: pedido `#DE8FEF` com `mp_payment_id` aprovado (visa) + `me_cart_id` + `delivered`; `#0DD046` com rastreio `ME26005OBH3BR`.

**Restrições novas que este design precisa respeitar**: as functions não estão em git; o dashboard (Next 16 / OpenNext em Workers) apenas lê o banco; site público é outro repo consumindo as mesmas functions; conta CPF ⇒ envio não comercial (DC-e).

## Goals / Non-Goals

**Goals**
- Fechar as três exposições de segurança antes de qualquer uso em produção.
- Corrigir as regras de negócio erradas sem quebrar o que já funciona.
- Versionar as functions e completar as lacunas de operação do admin.

**Non-Goals**
- Migrar a integração para o Cloudflare Worker (decisão explícita: manter Edge Functions).
- Reescrever o que já funciona (cotação, preferência, fluxo de etiqueta, OAuth).
- Emissor de NF-e (conta CPF usa DC-e), marketplace, coleta domiciliar.

## Decisions

1. **Edge Functions (Deno) continuam sendo o runtime da integração; o dashboard consome.**
   Motivo: já estão implantadas, testadas e com o domínio `*.supabase.co` fora do Cloudflare (sem risco de Bot Fight Mode nos webhooks); os secrets e a service role já vivem lá; e a URL do webhook do MP e o callback OAuth do ME já estão cadastrados nos painéis apontando para elas — mudar de runtime exigiria recadastrar tudo. Alternativa rejeitada: reescrever no Worker (custo alto, nenhum ganho funcional).

2. **Autorização por papel dentro da function, não por `verify_jwt`.**
   Webhooks precisam continuar com `verify_jwt: false` (MP e ME não enviam JWT do Supabase) — a autenticidade vem da assinatura HMAC. Para funções de ação (`melhor-envio-etiquetas`, futuras de reembolso/pedido manual) o padrão passa a ser: ler o `Authorization` do chamador, `getUser()` e exigir `profiles.role = 'admin'`. As de checkout do cliente (`mp-create-preference`, `mp-create-payment`) mantêm a checagem de dono do pedido **e** passam a aceitar admin como alternativa.

3. **Validação de assinatura obrigatória e falha fechada.** Secret ausente ⇒ 401, nunca "pula validação". MP: manifest `id:{data.id da query};request-id:{x-request-id};ts:{ts};`, HMAC-SHA256 hex, comparação em tempo constante. ME: HMAC-SHA256 do corpo bruto (lido antes de qualquer parse) contra `X-ME-Signature`, aceitando base64 e hex.

4. **Estado do pagamento separado do estado do pedido.** `orders.status` continua com os 5 valores que o site consome; o detalhe do MP fica em `mp_payment_status` (já existe) e o do envio em `shipping_status` (já existe). Para o que não tem campo, adicionar `needs_attention` e uma trilha `order_events`. `rejected` não altera `orders.status`; `refunded`/`charged_back`/`in_mediation` sinalizam atenção.

5. **Idempotência por evento persistido.** MP: reaproveitar `mp_webhook_logs` com UNIQUE de deduplicação e marcar processamento; nunca aplicar duas vezes o mesmo `(payment_id, status)`. ME: criar tabela equivalente. Transições sempre monotônicas.

6. **`external_reference` = `orders.id` (UUID).** O `short_id` tem `#`, caractere inválido na API. O `mp-webhook` continua aceitando `short_id` na busca por compatibilidade com os pedidos antigos, mas novas cobranças usam o UUID.

7. **Etiqueta usa dados do banco, não do request.** Remetente de `sender_addresses` (`is_default`), destinatário de `orders.shipping_address` + `profiles`, produtos dos `order_items` (exigência da DC-e), serviço e volumes da cotação escolhida. O corpo do request deixa de ser fonte de verdade.

8. **Agendamento por pg_cron chamando as functions.** Rastreio (2 h), reconciliação de pagamentos, expiração de pedidos e refresh preventivo do token ME. Não há custom worker nem `wrangler triggers deploy` envolvidos.

9. **Versionar em `supabase/functions/<slug>/index.ts`** e passar a implantar por `supabase functions deploy`, mantendo o painel apenas para configuração. Sem isso não há histórico, revisão nem backup — hoje uma exclusão acidental perde o trabalho todo.

10. **Reserva de estoque atômica na criação do pedido** (função Postgres com `UPDATE … WHERE stock >= qty`), liberada em cancelamento/expiração — hoje não existe controle de estoque no fluxo.

## Risks / Trade-offs

- [Functions só existem no servidor Supabase] → versionar em `supabase/functions/` é a **primeira** entrega depois da segurança; até lá, qualquer alteração é irreversível.
- [Endpoints abertos em produção agora] → corrigir antes de qualquer divulgação da loja; `melhor-envio-etiquetas` pode drenar o saldo da carteira.
- [Pedidos existentes em estado inconsistente] (`#D6B107` cancelado por recusa; pedidos `shipped` marcados no pagamento da etiqueta) → migração de dados pontual, com registro do que foi corrigido.
- [Dois consumidores das mesmas functions (site e dashboard)] → mudança de contrato precisa ser aditiva; parâmetros novos com default compatível.
- [Sandbox vs produção do ME] → `MELHOR_ENVIO_API_URL` já é variável; validar que `mp_credentials` e o token ativo pertencem ao mesmo ambiente antes de cada operação.
- [Pix/boleto não aprovam em sandbox no Checkout Pro] → homologação final depende de uma venda real de valor baixo.
- [Alterar `orders.status` afeta o site público] → manter os 5 valores; qualquer campo novo é opcional para o site.

## Migration Plan

1. **Segurança** (mesma janela): admin obrigatório em `melhor-envio-etiquetas`; assinatura no `melhor-envio-webhook`; falha fechada no `mp-webhook`. Rollback = redeploy da versão anterior (por isso o passo 2 vem logo em seguida).
2. **Versionar** as 10 functions no repo a partir do código atual em produção, antes de qualquer refatoração.
3. **Correções de comportamento**, uma function por vez, com teste em sandbox entre elas.
4. **Migrations aditivas** (`needs_attention`, `order_events`, dedup de webhooks, reembolsos, reserva de estoque) — nenhuma coluna existente é removida ou renomeada.
5. **Lacunas** (pedido manual, cobrança, reembolso, cancelamento de etiqueta) e telas do dashboard.
6. **Correção dos dados** dos pedidos afetados e homologação em produção.

## Open Questions

- `mp-check-payment` e `mp-test-card-payment` não foram auditadas em detalhe — decidir na task de versionamento se `mp-test-card-payment` e `melhor-envio-debug` são removidas ou protegidas.
- Encoding real do `X-ME-Signature` (base64 no exemplo da doc) — o handler aceitará ambos até a primeira verificação em sandbox.
- Se o site público chama as functions com o token do usuário logado (provável) ou com anon key — define se a checagem de admin pode ser aplicada sem quebrá-lo.
- Tarifa do MP devolvida em reembolso parcial e comportamento do erro de saldo insuficiente no checkout do ME — confirmar em teste antes de exibir mensagens definitivas na UI.
