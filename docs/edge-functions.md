# Edge Functions — pagamento e frete

A integração com Mercado Pago e Melhor Envio roda em **Supabase Edge Functions** (Deno), não no dashboard. O dashboard e o site público apenas consomem.

Projeto: `cxdxgfwlqdzczwwhdhyz` · Base: `https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/<slug>`

## Functions

| Slug | Papel |
|---|---|
| `mp-create-preference` | Checkout Pro: cria a preferência e devolve o link de pagamento. |
| `mp-create-payment` | Checkout Transparente: Pix (QR + copia-e-cola) e cartão tokenizado. |
| `mp-check-payment` | Consulta o estado de um pagamento. |
| `mp-webhook` | Recebe notificações do Mercado Pago e atualiza o pedido. |
| `mp-test-card-payment` | Auxiliar de teste. Não deve ficar exposta em produção. |
| `melhor-envio-auth` | OAuth do Melhor Envio: autorização, callback e refresh do token. |
| `melhor-envio-cotacao` | Cotação de frete por CEP. |
| `melhor-envio-etiquetas` | `add_to_cart`, `checkout`, `generate`, `print`, `tracking`, `status`. |
| `melhor-envio-webhook` | Recebe eventos de envio e atualiza o pedido. |
| `melhor-envio-debug` | Diagnóstico. Não deve ficar exposta em produção. |

## URLs cadastradas nos painéis externos

- **Webhook do Mercado Pago** → `.../functions/v1/mp-webhook`
- **Webhook do Melhor Envio** → `.../functions/v1/melhor-envio-webhook`
- **Callback OAuth do Melhor Envio** → `.../functions/v1/melhor-envio-auth`
  (precisa ser idêntico ao `redirect_uri` cadastrado no app, senão dá "Client invalid")

## Deploy

```bash
# uma vez, na conta dona do projeto
supabase login
supabase link --project-ref cxdxgfwlqdzczwwhdhyz

# implantar uma function
supabase functions deploy <slug>

# baixar o que está no servidor (para conferir contra o repo)
supabase functions download <slug>
```

`verify_jwt` de cada function está em `supabase/config.toml` e é aplicado no deploy.

## Secrets

Configurados no projeto Supabase (Edge Functions → Secrets), **não** neste repo:

| Secret | Usado por |
|---|---|
| `MP_WEBHOOK_SECRET` | `mp-webhook` (validação da assinatura) |
| `CLIENT_ID_ME`, `SECRET_ME` | `melhor-envio-auth`, `-cotacao`, `-etiquetas` (OAuth e refresh) |
| `MELHOR_ENVIO_API_URL` | todas do ME (sandbox × produção) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | injetados automaticamente |

O Access Token do Mercado Pago **não** é secret: fica na tabela `mp_credentials`, por ambiente (`sandbox` / `production`). O token do Melhor Envio fica em `melhor_envio_tokens`, renovado automaticamente.

## Estado atual

Ver `openspec/changes/mp-melhorenvio-integracao/` para o que precisa ser corrigido (segurança, regras de negócio) e o que falta (pedido manual, reembolso, cancelamento de etiqueta). O contexto completo das APIs está em `docs/dossie-pagamento-frete.html`.
