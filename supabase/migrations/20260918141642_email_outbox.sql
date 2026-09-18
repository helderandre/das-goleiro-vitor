-- E-mails transacionais do pedido: fila, eventos de entrega, disparo e reenvio.
-- Change: openspec/changes/emails-transacionais-pedido

-- ---------------------------------------------------------------------------
-- 1. Fila de e-mails
-- ---------------------------------------------------------------------------
-- Guarda só o tipo e o controle de envio. O conteúdo é montado no envio, a
-- partir do estado atual do pedido: é o que permite descartar e-mail obsoleto.
create table public.email_outbox (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  kind            text not null check (kind in (
                    'pedido_criado', 'aguardando_pagamento', 'pagamento_recebido',
                    'pagamento_cancelado', 'pedido_enviado', 'pedido_concluido')),
  dedupe_key      text not null unique,
  mp_payment_id   text,
  status          text not null default 'pending'
                    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  delivery_status text check (delivery_status in (
                    'sent', 'delivery_delayed', 'delivered', 'opened', 'clicked',
                    'bounced', 'complained')),
  recipient       text,
  subject         text,
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at       timestamptz,
  last_error      text,
  provider_id     text unique,
  resent_from     uuid references public.email_outbox(id) on delete set null,
  requested_by    uuid,
  -- clock_timestamp e não now(): dois e-mails enfileirados na mesma transação
  -- precisam de horários distintos para a regra de ordem por pedido.
  created_at      timestamptz not null default clock_timestamp(),
  updated_at      timestamptz not null default clock_timestamp(),
  sent_at         timestamptz
);

create index email_outbox_order_idx on public.email_outbox (order_id, created_at);
create index email_outbox_due_idx on public.email_outbox (next_attempt_at) where status = 'pending';
create index email_outbox_resent_idx on public.email_outbox (resent_from) where resent_from is not null;

-- ---------------------------------------------------------------------------
-- 2. Eventos de entrega (webhook do Resend)
-- ---------------------------------------------------------------------------
create table public.email_events (
  id          uuid primary key default gen_random_uuid(),
  outbox_id   uuid not null references public.email_outbox(id) on delete cascade,
  type        text not null,
  occurred_at timestamptz not null,
  detail      text,
  payload     jsonb not null default '{}'::jsonb,
  svix_id     text not null unique,
  created_at  timestamptz not null default now()
);

create index email_events_outbox_idx on public.email_events (outbox_id, occurred_at);

-- ---------------------------------------------------------------------------
-- 3. RLS: leitura só para admin; escrita só por trigger, RPC e service_role
-- ---------------------------------------------------------------------------
alter table public.email_outbox enable row level security;
alter table public.email_events enable row level security;

create policy "Admins can read email outbox"
  on public.email_outbox for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can read email events"
  on public.email_events for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Chamada imediata da function de envio
-- ---------------------------------------------------------------------------
-- O segredo fica no Vault (nome 'email_dispatch_secret'), não em texto no SQL.
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

  -- pg_net só dispara depois do commit: a function já enxerga o pedido completo.
  perform net.http_post(
    url     := 'https://cxdxgfwlqdzczwwhdhyz.supabase.co/functions/v1/send-order-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dispatch-secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 5000  -- elevado para 30000 em 20260918143147
  );
end;
$function$;

create or replace function public.email_outbox_after_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  begin
    perform public.kick_email_dispatch();
  exception when others then
    raise warning 'kick_email_dispatch falhou: %', sqlerrm;
  end;
  return null;
end;
$function$;

-- Uma chamada por comando, não por linha.
create trigger email_outbox_kick
  after insert on public.email_outbox
  for each statement execute function public.email_outbox_after_insert();

-- ---------------------------------------------------------------------------
-- 5. Enfileiramento a partir das mudanças do pedido
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_order_email(
  p_order_id uuid, p_kind text, p_key text, p_mp_payment_id text default null)
returns void
language sql
security definer
set search_path to ''
as $function$
  insert into public.email_outbox (order_id, kind, dedupe_key, mp_payment_id)
  values (p_order_id, p_kind, p_key, p_mp_payment_id)
  on conflict (dedupe_key) do nothing;
$function$;

create or replace function public.orders_enqueue_emails()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Subtransação: qualquer erro aqui é descartado sem derrubar a mudança do pedido.
  begin
    if tg_op = 'INSERT' then
      if new.status = 'pending' then
        perform public.enqueue_order_email(new.id, 'pedido_criado', 'pedido_criado:' || new.id);
      end if;
      return null;
    end if;

    if new.status = 'pending'
       and new.mp_payment_status = 'pending'
       and new.mp_payment_id is not null
       and (old.mp_payment_id is distinct from new.mp_payment_id
            or old.mp_payment_status is distinct from new.mp_payment_status) then
      perform public.enqueue_order_email(new.id, 'aguardando_pagamento',
        'aguardando:' || new.id || ':' || new.mp_payment_id, new.mp_payment_id);
    end if;

    if new.status = 'paid' and old.status is distinct from 'paid' then
      perform public.enqueue_order_email(new.id, 'pagamento_recebido', 'pago:' || new.id);
    end if;

    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.enqueue_order_email(new.id, 'pagamento_cancelado', 'cancelado:' || new.id);
    end if;

    -- Enviado sem código espera o código; o e-mail sai quando os dois existirem.
    if new.status = 'shipped' and new.tracking_code is not null
       and not (old.status = 'shipped' and old.tracking_code is not null) then
      perform public.enqueue_order_email(new.id, 'pedido_enviado', 'enviado:' || new.id);
    end if;

    if new.status = 'delivered' and old.status is distinct from 'delivered' then
      perform public.enqueue_order_email(new.id, 'pedido_concluido', 'concluido:' || new.id);
    end if;
  exception when others then
    raise warning 'orders_enqueue_emails falhou para o pedido %: %', new.id, sqlerrm;
  end;
  return null;
end;
$function$;

create trigger orders_enqueue_emails
  after insert or update on public.orders
  for each row execute function public.orders_enqueue_emails();

-- ---------------------------------------------------------------------------
-- 6. Reivindicação de lote pela function de envio
-- ---------------------------------------------------------------------------
-- skip locked: duas execuções simultâneas nunca pegam a mesma linha.
-- Uma linha só sai se nenhuma anterior do mesmo pedido estiver pendente ou em
-- envio, para os e-mails chegarem na ordem dos eventos.
create or replace function public.claim_email_batch(p_limit integer default 20)
returns setof public.email_outbox
language sql
security definer
set search_path to ''
as $function$
  with candidates as (
    select o.id
      from public.email_outbox o
     where o.status = 'pending'
       and o.next_attempt_at <= now()
       and not exists (
             select 1 from public.email_outbox prev
              where prev.order_id = o.order_id
                and prev.created_at < o.created_at
                and prev.status in ('pending', 'sending'))
     order by o.created_at
     limit p_limit
     for update of o skip locked
  )
  update public.email_outbox e
     set status = 'sending',
         attempts = e.attempts + 1,
         locked_at = now(),
         updated_at = now()
    from candidates c
   where e.id = c.id
  returning e.*;
$function$;

-- ---------------------------------------------------------------------------
-- 7. Varredura periódica: novas tentativas, chamadas perdidas, linhas presas
-- ---------------------------------------------------------------------------
create or replace function public.email_dispatch_sweep()
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Function interrompida no meio do envio: volta para a fila. O Idempotency-Key
  -- no Resend impede que a nova tentativa gere um segundo e-mail.
  update public.email_outbox
     set status = 'pending', locked_at = null, updated_at = now()
   where status = 'sending' and locked_at < now() - interval '10 minutes';

  if exists (select 1 from public.email_outbox
              where status = 'pending' and next_attempt_at <= now()) then
    perform public.kick_email_dispatch();
  end if;
end;
$function$;

select cron.schedule('email-dispatch-sweep', '* * * * *', $$select public.email_dispatch_sweep();$$);

-- ---------------------------------------------------------------------------
-- 8. Eventos de entrega
-- ---------------------------------------------------------------------------
create or replace function public.email_delivery_weight(p_status text)
returns integer
language sql
immutable
set search_path to ''
as $function$
  select case p_status
    when 'complained'       then 7
    when 'bounced'          then 6
    when 'clicked'          then 5
    when 'opened'           then 4
    when 'delivered'        then 3
    when 'delivery_delayed' then 2
    when 'sent'             then 1
    else 0
  end;
$function$;

-- Devolve 'recorded', 'duplicate' ou 'unknown' (e-mail que não é de pedido,
-- como os do Auth). A situação só sobe de peso: notificações fora de ordem não
-- rebaixam o que já foi registrado.
create or replace function public.record_email_event(
  p_provider_id text, p_type text, p_occurred_at timestamptz,
  p_detail text, p_payload jsonb, p_svix_id text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_outbox_id uuid;
  v_inserted uuid;
begin
  select id into v_outbox_id from public.email_outbox where provider_id = p_provider_id;
  if v_outbox_id is null then
    return 'unknown';
  end if;

  insert into public.email_events (outbox_id, type, occurred_at, detail, payload, svix_id)
  values (v_outbox_id, p_type, p_occurred_at, p_detail, coalesce(p_payload, '{}'::jsonb), p_svix_id)
  on conflict (svix_id) do nothing
  returning id into v_inserted;

  if v_inserted is null then
    return 'duplicate';
  end if;

  update public.email_outbox
     set delivery_status = p_type, updated_at = now()
   where id = v_outbox_id
     and public.email_delivery_weight(p_type) > public.email_delivery_weight(delivery_status);

  return 'recorded';
end;
$function$;

-- ---------------------------------------------------------------------------
-- 9. Reenvio manual
-- ---------------------------------------------------------------------------
create or replace function public.requeue_order_email(p_outbox_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_orig public.email_outbox;
  v_root public.email_outbox;
  v_n integer;
  v_new uuid;
begin
  if not exists (select 1 from public.profiles
                  where id = auth.uid() and role = 'admin') then
    raise exception 'Somente administradores podem reenviar e-mails' using errcode = '42501';
  end if;

  select * into v_orig from public.email_outbox where id = p_outbox_id;
  if not found then
    raise exception 'E-mail não encontrado' using errcode = 'P0002';
  end if;

  -- Reenvio de um reenvio fica agrupado sob o original.
  if v_orig.resent_from is not null then
    select * into v_root from public.email_outbox where id = v_orig.resent_from;
  else
    v_root := v_orig;
  end if;

  if exists (select 1 from public.email_outbox
              where (id = v_root.id or resent_from = v_root.id)
                and status in ('pending', 'sending')) then
    raise exception 'Este e-mail ainda está na fila de envio' using errcode = '55000';
  end if;

  select count(*) + 1 into v_n from public.email_outbox where resent_from = v_root.id;

  -- A chave única também barra dois reenvios simultâneos que passem pela
  -- checagem acima ao mesmo tempo.
  insert into public.email_outbox (order_id, kind, dedupe_key, mp_payment_id, resent_from, requested_by)
  values (v_root.order_id, v_root.kind, v_root.dedupe_key || ':reenvio:' || v_n,
          v_root.mp_payment_id, v_root.id, auth.uid())
  returning id into v_new;

  return v_new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 10. Permissões
-- ---------------------------------------------------------------------------
revoke all on function public.kick_email_dispatch() from public, anon, authenticated;
revoke all on function public.enqueue_order_email(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.claim_email_batch(integer) from public, anon, authenticated;
revoke all on function public.email_dispatch_sweep() from public, anon, authenticated;
revoke all on function public.record_email_event(text, text, timestamptz, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.requeue_order_email(uuid) from public, anon;
grant execute on function public.claim_email_batch(integer) to service_role;
grant execute on function public.record_email_event(text, text, timestamptz, text, jsonb, text) to service_role;
grant execute on function public.requeue_order_email(uuid) to authenticated;
