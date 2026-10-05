-- =====================================================================
-- MGA Restaurante · migração 05: o master vê as empresas e entra em qualquer uma (suporte)
-- =====================================================================
-- Rode DEPOIS da migração 04 (Supabase › SQL Editor › New query › cole › Run).
-- Pode rodar mais de uma vez sem problema.
--
-- O painel master lista as empresas direto do banco (não depende da Edge Function).
-- "Entrar" grava em masters.empresa_acesso a empresa escolhida; a partir daí o banco trata o master
-- como usuário daquela empresa (todas as regras de acesso usam minha_empresa()).

alter table public.masters add column if not exists empresa_acesso uuid references public.empresas(id) on delete set null;

create or replace function public.eh_master() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.masters where id = auth.uid())
$$;
grant execute on function public.eh_master() to authenticated;

-- Empresa de quem está logado: a que o master escolheu, ou a do usuário (se ativo)
create or replace function public.minha_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select empresa_acesso from public.masters where id = auth.uid()),
    (select empresa_id from public.usuarios where id = auth.uid() and ativo)
  )
$$;

-- O master enxerga todas as empresas e os usuários delas (para o painel)
drop policy if exists empresas_master_ver on public.empresas;
create policy empresas_master_ver on public.empresas for select to authenticated using (public.eh_master());
drop policy if exists usuarios_master_ver on public.usuarios;
create policy usuarios_master_ver on public.usuarios for select to authenticated using (public.eh_master());

-- Entrar numa empresa (null = sair de todas)
create or replace function public.master_entrar(p_empresa uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_nome text;
begin
  if not public.eh_master() then raise exception 'Acesso só para o usuário master.'; end if;
  if p_empresa is not null then
    select nome into v_nome from public.empresas where id = p_empresa;
    if v_nome is null then raise exception 'Empresa não encontrada.'; end if;
  end if;
  update public.masters set empresa_acesso = p_empresa where id = auth.uid();
  return v_nome;
end $$;
revoke all on function public.master_entrar(uuid) from public, anon;
grant execute on function public.master_entrar(uuid) to authenticated;

-- Conferência: deve mostrar OK
select case when exists (select 1 from information_schema.columns where table_name = 'masters' and column_name = 'empresa_acesso')
  then 'OK' else 'ERRO' end as resultado;
