-- =====================================================================
-- MGA Restaurante · migração 04: usuário MASTER (MGA Tecnologia)
-- =====================================================================
-- Rode DEPOIS da migração 03 (Supabase › SQL Editor › New query › cole › Run).
-- Pode rodar mais de uma vez sem problema.
--
-- O master é a conta da MGA Tecnologia: não pertence a nenhum restaurante, entra no painel
-- master.html, cria as empresas e o administrador de cada uma (pela Edge Function "master").
-- A tela de login não cria mais contas: o cliente só entra com o login que o master cadastrou.

create table if not exists public.masters (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  criado_em timestamptz not null default now()
);
alter table public.masters enable row level security;
-- Cada um só consegue ver se ele mesmo é master (ninguém se cadastra como master pela API)
drop policy if exists masters_ver_o_proprio on public.masters;
create policy masters_ver_o_proprio on public.masters for select to authenticated using (id = auth.uid());
grant select on public.masters to authenticated;
revoke all on public.masters from anon;

-- Monta a empresa nova: empresa, administrador e cadastros iniciais.
-- Só o servidor (Edge Function "master", com a chave secreta) pode chamar.
create or replace function public.montar_empresa(p_usuario uuid, p_nome text, p_nome_admin text, p_login text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_empresa uuid;
begin
  if p_usuario is null then raise exception 'Informe o usuário administrador.'; end if;
  if exists (select 1 from public.usuarios where id = p_usuario) then raise exception 'Este usuário já pertence a uma empresa.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome do restaurante.'; end if;

  insert into public.empresas (nome, config) values (trim(p_nome),
    '{"taxaServico": 10, "servicoPadrao": true, "taxaEntrega": 0, "entregaVerde": 20, "entregaAmarelo": 40,
      "impressao": {"largura": "80", "cupomModo": "NAO", "comandaAuto": false, "viasComanda": 1, "rodape": "Obrigado pela preferência! Volte sempre."}}'::jsonb)
  returning id into v_empresa;

  insert into public.usuarios (id, empresa_id, nome, login, perfil)
  values (p_usuario, v_empresa, trim(p_nome_admin), lower(trim(p_login)), 'ADMIN');

  -- Formas de pagamento, categorias financeiras e mesas iniciais
  insert into public.formas_pagamento (empresa_id, nome, tipo, ativo, ordem) values
    (v_empresa, 'Dinheiro', 'DINHEIRO', true, 1), (v_empresa, 'PIX', 'PIX', true, 2), (v_empresa, 'Cartão de débito', 'DEBITO', true, 3),
    (v_empresa, 'Cartão de crédito', 'CREDITO', true, 4), (v_empresa, 'Vale-refeição', 'OUTROS', true, 5), (v_empresa, 'Cheque', 'OUTROS', false, 6),
    (v_empresa, 'Cortesia', 'OUTROS', false, 7), (v_empresa, 'A prazo (fiado)', 'PRAZO', false, 8);
  insert into public.categorias_financeiras (empresa_id, tipo, nome)
    select v_empresa, 'PAGAR', unnest(array['Fornecedores', 'Aluguel', 'Salários', 'Energia', 'Água', 'Gás', 'Internet e telefone', 'Impostos', 'Manutenção', 'Marketing', 'Outras despesas']);
  insert into public.categorias_financeiras (empresa_id, tipo, nome)
    select v_empresa, 'RECEBER', unnest(array['Vendas a prazo', 'Outras receitas']);
  insert into public.mesas (empresa_id, numero, lugares)
    select v_empresa, lpad(n::text, 2, '0'), 4 from generate_series(1, 12) n;
  insert into public.sequencias (empresa_id, nome, valor) values (v_empresa, 'venda', 0), (v_empresa, 'caixa', 0), (v_empresa, 'produto', 0);

  return v_empresa;
end $$;
revoke all on function public.montar_empresa(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.montar_empresa(uuid, text, text, text) to service_role;

-- Fim do cadastro aberto: ninguém cria empresa sozinho pela tela de login
revoke execute on function public.criar_empresa(text, text, text) from public, anon, authenticated;

-- =====================================================================
-- SEU USUÁRIO MASTER
--   ANTES de rodar este arquivo: Supabase › Authentication › Users › Add user › Create new user
--   E-mail: mateusandrade.brasil@gmail.com · senha: a sua · marque "Auto Confirm User".
--   (Se esqueceu, crie o usuário agora e rode o arquivo de novo.)
-- =====================================================================
insert into public.masters (id, nome)
select id, 'MGA Tecnologia' from auth.users where lower(email) = 'mateusandrade.brasil@gmail.com'
on conflict (id) do nothing;

-- Conferência: deve mostrar "MASTER OK"
select case
  when not exists (select 1 from auth.users where lower(email) = 'mateusandrade.brasil@gmail.com')
    then 'FALTA: crie o usuário em Authentication › Users › Add user e rode de novo'
  when exists (select 1 from public.masters m join auth.users a on a.id = m.id where lower(a.email) = 'mateusandrade.brasil@gmail.com')
    then 'MASTER OK'
  else 'ERRO: master não foi criado'
end as resultado;
