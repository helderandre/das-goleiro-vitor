-- Um lote com vários e-mails, espaçados para respeitar o limite do Resend,
-- passa dos 5s iniciais; o pg_net desistia antes da function responder.
create or replace function public.kick_email_dispatch()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'email_dispatch_secret';
  if v_secret is null then
    raise warning 'email_dispatch_secret ausente no Vault; envio aguardará a varredura';
    return;
  end if;

  perform net.http_post(
    url     := 'https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/send-order-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$function$;

revoke all on function public.kick_email_dispatch() from public, anon, authenticated;
