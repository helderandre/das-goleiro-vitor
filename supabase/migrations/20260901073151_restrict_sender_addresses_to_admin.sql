-- sender_addresses guarda o CPF/CNPJ, telefone e endereço do lojista, mas as
-- policies liberavam SELECT/INSERT/UPDATE/DELETE para qualquer usuário
-- autenticado. Como a loja pública compartilha o mesmo projeto Supabase,
-- qualquer cliente logado podia ler e sobrescrever o remetente das etiquetas.
-- Passa a exigir profiles.role = 'admin', mesmo padrão de order_messages.
-- As Edge Functions usam service_role e não são afetadas.

drop policy if exists "Authenticated users can read sender addresses" on public.sender_addresses;
drop policy if exists "Authenticated users can insert sender addresses" on public.sender_addresses;
drop policy if exists "Authenticated users can update sender addresses" on public.sender_addresses;
drop policy if exists "Authenticated users can delete sender addresses" on public.sender_addresses;

create policy "Admins can read sender addresses"
  on public.sender_addresses for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can insert sender addresses"
  on public.sender_addresses for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can update sender addresses"
  on public.sender_addresses for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Admins can delete sender addresses"
  on public.sender_addresses for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
