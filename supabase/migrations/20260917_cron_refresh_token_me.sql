-- Renovação preventiva do token do Melhor Envio.
--
-- O token dura 30 dias e as functions só o renovam quando alguém as chama. Uma
-- loja que passe 30 dias sem cotação perde o token e volta a exigir login
-- manual no painel. Este job garante a renovação independente de haver venda.
--
-- A cada 2 dias, às 4h UTC. A function busca o refresh token ativo no banco;
-- o segredo no header é o que autoriza esse modo.
select cron.unschedule('melhor-envio-refresh-token')
 where exists (select 1 from cron.job where jobname = 'melhor-envio-refresh-token');

select cron.schedule(
  'melhor-envio-refresh-token',
  '0 4 */2 * *',
  $$
  select net.http_post(
    url     := 'https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/melhor-envio-auth',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', '<ME_CRON_SECRET>'
               ),
    body    := '{}'::jsonb
  );
  $$
);
