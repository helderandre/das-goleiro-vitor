-- Pedido não pago em 12 horas é cancelado automaticamente.
--
-- Até aqui nenhum pedido expirava: um pedido pendente ficava pendente para
-- sempre, segurando o estoque reservado pela create_order.
--
-- O prazo é sempre created_at + 12h, calculado no servidor. Os pagamentos no
-- Mercado Pago (Pix e Checkout Pro) passam a expirar nesse mesmo instante, para
-- que nenhum pagamento possa ser aprovado depois do cancelamento. Boleto foi
-- removido: a compensação leva até 3 dias úteis e não cabe na janela.

-- 1. create_order grava o prazo na criação. A loja lê orders.expires_at para
--    decidir se o pedido expirou. p_expires_at continua na assinatura por
--    compatibilidade, mas é ignorado: o prazo não pode vir do cliente.
create or replace function public.create_order(
  p_items jsonb,
  p_shipping_address jsonb default null::jsonb,
  p_shipping_price numeric default 0,
  p_service_id integer default null::integer,
  p_service_name text default null::text,
  p_origin text default 'site'::text,
  p_expires_at timestamp with time zone default null::timestamp with time zone
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_order_id uuid;
  v_short_id text;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_unit_price numeric;
  v_subtotal numeric := 0;
  v_total numeric;
  v_updated integer;
  v_has_physical boolean := false;
  v_expires_at timestamptz := now() + interval '12 hours';
begin
  if v_user is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens' using errcode = '22023';
  end if;

  -- Pedido com item físico precisa de endereço e de serviço de frete escolhido.
  -- Conferido antes de inserir qualquer coisa, para não deixar pedido órfão.
  select exists (
    select 1
      from jsonb_array_elements(p_items) as it
      join public.products p on p.id = (it->>'product_id')::uuid
     where p.product_type = 'physical'
  ) into v_has_physical;

  if v_has_physical then
    if p_shipping_address is null or coalesce(p_shipping_address->>'zip_code', '') = '' then
      raise exception 'Pedido com item físico exige endereço de entrega com CEP'
        using errcode = '22023';
    end if;
    if p_service_id is null or coalesce(p_shipping_price, 0) <= 0 then
      raise exception 'Pedido com item físico exige um serviço de frete escolhido'
        using errcode = '22023';
    end if;
  end if;

  v_short_id := '#' || upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into public.orders (user_id, short_id, total, subtotal, status, shipping_address,
                             shipping_price, me_service_id, me_service_name, origin, expires_at)
  values (v_user, v_short_id, 0, 0, 'pending', p_shipping_address,
          coalesce(p_shipping_price, 0), p_service_id, p_service_name,
          coalesce(p_origin, 'site'), v_expires_at)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest(coalesce((v_item->>'quantity')::integer, 1), 1);

    select id, title, price, coalesce(discount_percent, 0) as discount_percent,
           product_type, stock
      into v_product
      from public.products
     where id = (v_item->>'product_id')::uuid;

    if not found then
      raise exception 'Produto % não encontrado', v_item->>'product_id' using errcode = '23503';
    end if;

    -- Preço vem do catálogo, nunca do cliente.
    v_unit_price := round(v_product.price * (1 - v_product.discount_percent / 100.0), 2);
    v_subtotal := v_subtotal + (v_unit_price * v_quantity);

    -- Reserva atômica: em Read Committed o segundo comprador reavalia o WHERE
    -- depois do commit do primeiro e não encontra estoque.
    if v_product.product_type = 'physical' then
      update public.products
         set stock = stock - v_quantity
       where id = v_product.id
         and stock >= v_quantity;

      get diagnostics v_updated = row_count;
      if v_updated = 0 then
        raise exception 'Estoque insuficiente para %', v_product.title using errcode = '23514';
      end if;
    end if;

    insert into public.order_items (order_id, product_id, product_title, product_type,
                                    quantity, unit_price)
    values (v_order_id, v_product.id, v_product.title, v_product.product_type,
            v_quantity, v_unit_price);
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_total := round(v_subtotal + coalesce(p_shipping_price, 0), 2);

  update public.orders
     set subtotal = v_subtotal,
         total = v_total
   where id = v_order_id;

  insert into public.order_events (order_id, type, to_status, actor, actor_id, payload)
  values (v_order_id, 'order_created', 'pending', 'system', v_user,
          jsonb_build_object('subtotal', v_subtotal, 'shipping_price', coalesce(p_shipping_price, 0),
                             'total', v_total, 'origin', coalesce(p_origin, 'site'),
                             'expires_at', v_expires_at));

  return jsonb_build_object('order_id', v_order_id, 'short_id', v_short_id,
                            'subtotal', v_subtotal, 'shipping_price', coalesce(p_shipping_price, 0),
                            'total', v_total, 'expires_at', v_expires_at);
end;
$function$;

-- 2. Cancela os pedidos vencidos e devolve o estoque.
--    Não toca em pedido com pagamento em análise (in_process/authorized) nem em
--    pedido sinalizado para revisão: esses se resolvem pelo webhook ou por uma
--    pessoa. O UPDATE ... RETURNING é atômico por linha, então um pedido pago
--    pelo webhook no mesmo instante não é cancelado.
create or replace function public.expire_unpaid_orders()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    update public.orders o
       set status = 'cancelled',
           updated_at = now()
     where o.status = 'pending'
       and o.created_at + interval '12 hours' <= now()
       and not o.needs_attention
       and coalesce(o.mp_payment_status, '') not in ('approved', 'in_process', 'authorized')
    returning o.id, o.created_at, o.mp_payment_status
  loop
    -- Só pedido criado pela create_order reservou estoque; devolver o de um
    -- pedido inserido por fora inflaria o estoque.
    if exists (select 1 from public.order_events e
                where e.order_id = r.id and e.type = 'order_created') then
      perform public.release_order_stock(r.id);
    end if;

    insert into public.order_events (order_id, type, from_status, to_status, actor, payload)
    values (r.id, 'order_expired', 'pending', 'cancelled', 'system',
            jsonb_build_object('rule', 'nao pago em 12h',
                               'created_at', r.created_at,
                               'mp_payment_status', r.mp_payment_status));
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

-- Roda pelo pg_cron como postgres; ninguém mais precisa chamá-la pela API.
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;

-- 3. A cada 15 minutos. O pagamento no MP já expira no prazo exato, então o
--    atraso do cron só afeta quando o estoque volta, nunca se dá para pagar.
select cron.schedule(
  'expire-unpaid-orders',
  '*/15 * * * *',
  $$select public.expire_unpaid_orders();$$
);
