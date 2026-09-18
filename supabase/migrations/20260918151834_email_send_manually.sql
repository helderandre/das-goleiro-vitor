-- Envio manual de um e-mail do pedido que ainda não existe (ex.: pedido pago
-- antes da ativação dos e-mails). Usa a mesma chave de deduplicação do trigger:
-- o envio manual vale como o envio daquele evento, e o trigger não cria outro.
create or replace function public.send_order_email_manually(p_order_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  o public.orders;
  v_ok boolean;
  v_key text;
  v_new uuid;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Somente administradores podem enviar e-mails' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0002';
  end if;

  -- Mesma tabela do spec "Envio manual".
  v_ok := case p_kind
    when 'pedido_criado'        then o.status <> 'cancelled'
    when 'aguardando_pagamento' then o.status = 'pending' and o.mp_payment_status = 'pending'
                                     and o.mp_payment_id is not null
                                     and o.created_at + interval '12 hours' > now()
    when 'pagamento_recebido'   then o.status in ('paid', 'shipped', 'delivered')
    when 'pagamento_cancelado'  then o.status = 'cancelled'
    when 'pedido_enviado'       then o.status in ('shipped', 'delivered') and o.tracking_code is not null
    when 'pedido_concluido'     then o.status = 'delivered'
  end;

  if v_ok is null then
    raise exception 'Tipo de e-mail desconhecido: %', p_kind using errcode = '22023';
  end if;
  if not v_ok then
    raise exception 'Este e-mail não se aplica ao estado atual do pedido' using errcode = '22023';
  end if;

  v_key := case p_kind
    when 'pedido_criado'        then 'pedido_criado:' || o.id
    when 'aguardando_pagamento' then 'aguardando:' || o.id || ':' || o.mp_payment_id
    when 'pagamento_recebido'   then 'pago:' || o.id
    when 'pagamento_cancelado'  then 'cancelado:' || o.id
    when 'pedido_enviado'       then 'enviado:' || o.id
    when 'pedido_concluido'     then 'concluido:' || o.id
  end;

  insert into public.email_outbox (order_id, kind, dedupe_key, mp_payment_id, requested_by)
  values (o.id, p_kind, v_key,
          case when p_kind = 'aguardando_pagamento' then o.mp_payment_id end,
          auth.uid())
  on conflict (dedupe_key) do nothing
  returning id into v_new;

  if v_new is null then
    raise exception 'Este e-mail já existe para o pedido; use Reenviar' using errcode = '23505';
  end if;

  return v_new;
end;
$function$;

revoke all on function public.send_order_email_manually(uuid, text) from public, anon;
grant execute on function public.send_order_email_manually(uuid, text) to authenticated;
