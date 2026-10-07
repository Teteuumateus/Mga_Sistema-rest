-- =====================================================================
-- MGA · Migração 09: cardápio digital mais seguro e registro apagado não volta
-- =====================================================================
-- Rode no SQL Editor do Supabase (desligue o tradutor do navegador antes de colar). Pode rodar de novo.
-- 1. Cada mesa ganha uma chave secreta que vai só no QR Code dela. Pedido feito pelo QR Code da mesa
--    entra sozinho na conta; pedido pelo link geral (cliente escolhe a mesa) espera a equipe confirmar.
-- 2. Adicionais conferidos de verdade: no máximo 20 por item, sem repetir, só de grupos ativos do
--    produto e respeitando o mínimo e o máximo de cada grupo.
-- 3. Limite por empresa (pedidos em sequência) e mensagens de erro claras para o cliente.
-- 4. O que for excluído fica anotado e nenhum computador consegue recriar (nem com dados antigos guardados).

-- 1. Chave secreta de cada mesa (o sistema não mexe nesta coluna ao gravar as mesas)
alter table public.mesas add column if not exists cardapio_chave text;
update public.mesas set cardapio_chave = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) where cardapio_chave is null;
alter table public.mesas alter column cardapio_chave set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
-- Pedido feito sem a chave da mesa: a equipe confirma antes de entrar na conta
alter table public.cardapio_pedidos add column if not exists confirmar boolean not null default false;
alter table public.cardapio_chamados add column if not exists confirmar boolean not null default false;

-- Texto que parece uuid (evita erro técnico na tela do cliente)
create or replace function public.cardapio_uuid(p text) returns uuid
language sql immutable set search_path = public as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p::uuid end
$$;

-- Pedido do cliente (troca a versão antiga: agora recebe a chave da mesa)
drop function if exists public.cardapio_pedir(text, uuid, jsonb, text, text);
create or replace function public.cardapio_pedir(p_codigo text, p_mesa uuid, p_itens jsonb, p_obs text, p_token text, p_chave text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e public.empresas;
  m public.mesas;
  it jsonb; ad jsonb;
  p public.produtos;
  g record;
  v_tam_id uuid; v_tam_nome text; v_op record; v_op_id uuid; v_vistos uuid[];
  v_itens jsonb := '[]'::jsonb; v_ads jsonb;
  v_qtd numeric; v_preco numeric; v_total numeric := 0; v_numero int; v_id uuid; v_confirmar boolean;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null then raise exception 'Cardápio não encontrado.'; end if;
  if not coalesce((e.config->'cardapio'->>'ativo')::boolean, false) then raise exception 'O restaurante não está recebendo pedidos pelo cardápio agora. Chame o garçom.'; end if;
  select * into m from public.mesas where id = p_mesa and empresa_id = e.id and ativo;
  if m.id is null then raise exception 'Mesa não encontrada. Escolha a mesa de novo.'; end if;
  v_confirmar := m.cardapio_chave is null or coalesce(p_chave, '') <> m.cardapio_chave;
  if coalesce(length(p_token), 0) < 16 or length(p_token) > 80 then raise exception 'Abra o cardápio de novo pelo link.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'O pedido está vazio.'; end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'Pedido grande demais: no máximo 40 itens por vez.'; end if;
  if exists (select 1 from public.cardapio_pedidos where cliente_token = p_token and criado_em > now() - interval '10 seconds') then
    raise exception 'Aguarde alguns segundos antes de enviar outro pedido.'; end if;
  if (select count(*) from public.cardapio_pedidos where empresa_id = e.id and mesa_id = m.id and criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitos pedidos desta mesa na última hora. Chame o garçom.'; end if;
  if (select count(*) from public.cardapio_pedidos where empresa_id = e.id and criado_em > now() - interval '10 minutes') >= 150 then
    raise exception 'Muitos pedidos ao mesmo tempo. Aguarde um pouco ou chame o garçom.'; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(it) <> 'object' then raise exception 'Pedido inválido. Atualize o cardápio.'; end if;
    select * into p from public.produtos where id = public.cardapio_uuid(it->>'produtoId') and empresa_id = e.id and ativo and tipo = 'VENDA'
      and coalesce((extra->>'cardapio')::boolean, true);
    if p.id is null then raise exception 'Um dos produtos não está mais disponível. Atualize o cardápio.'; end if;
    v_qtd := floor(case when it->>'quantidade' ~ '^\d{1,3}(\.\d+)?$' then (it->>'quantidade')::numeric else 0 end);
    if v_qtd < 1 or v_qtd > 50 then raise exception 'Quantidade inválida em "%".', p.nome; end if;
    v_preco := p.preco;
    v_tam_id := null; v_tam_nome := null;
    if coalesce(it->>'tamanhoId', '') <> '' then
      select t.id, t.nome, t.preco into v_tam_id, v_tam_nome, v_preco from public.produto_tamanhos t where t.id = public.cardapio_uuid(it->>'tamanhoId') and t.produto_id = p.id;
      if v_tam_id is null then raise exception 'Tamanho inválido em "%". Atualize o cardápio.', p.nome; end if;
    elsif exists (select 1 from public.produto_tamanhos where produto_id = p.id) then
      raise exception 'Escolha o tamanho de "%".', p.nome;
    end if;
    -- Adicionais: até 20, sem repetir, de grupos ativos ligados ao produto
    if jsonb_typeof(coalesce(it->'adicionais', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(it->'adicionais', '[]'::jsonb)) > 20 then
      raise exception 'Adicionais demais em "%".', p.nome; end if;
    v_ads := '[]'::jsonb; v_vistos := '{}';
    for ad in select * from jsonb_array_elements(coalesce(it->'adicionais', '[]'::jsonb)) loop
      v_op_id := public.cardapio_uuid(ad #>> '{}');
      if v_op_id is null or v_op_id = any(v_vistos) then raise exception 'Adicional inválido em "%". Atualize o cardápio.', p.nome; end if;
      v_vistos := v_vistos || v_op_id;
      select o.id, o.nome, o.preco into v_op from public.adicionais_opcoes o
        join public.grupos_adicionais ga on ga.id = o.grupo_id and ga.ativo
        join public.produto_grupos_adicionais pg on pg.grupo_id = o.grupo_id and pg.produto_id = p.id
        where o.id = v_op_id and o.ativo;
      if v_op.id is null then raise exception 'Adicional indisponível em "%". Atualize o cardápio.', p.nome; end if;
      v_ads := v_ads || jsonb_build_object('id', v_op.id, 'nome', v_op.nome, 'preco', v_op.preco);
      v_preco := v_preco + v_op.preco;
    end loop;
    -- Mínimo e máximo de cada grupo (ex.: "Ponto da carne: escolha 1", "Extras: até 2")
    for g in select ga.nome, ga.minimo, ga.maximo,
        (select count(*) from public.adicionais_opcoes o where o.grupo_id = ga.id and o.id = any(v_vistos)) as escolhidas,
        (select count(*) from public.adicionais_opcoes o where o.grupo_id = ga.id and o.ativo) as opcoes
      from public.grupos_adicionais ga join public.produto_grupos_adicionais pg on pg.grupo_id = ga.id and pg.produto_id = p.id
      where ga.ativo loop
      if g.opcoes > 0 and g.escolhidas < g.minimo then raise exception '%: escolha % em "%".', g.nome, g.minimo, p.nome; end if;
      if g.maximo > 0 and g.escolhidas > g.maximo then raise exception '%: no máximo % em "%".', g.nome, g.maximo, p.nome; end if;
    end loop;
    v_total := v_total + v_preco * v_qtd;
    v_itens := v_itens || jsonb_build_object('produtoId', p.id, 'nome', p.nome, 'quantidade', v_qtd, 'tamanhoId', v_tam_id, 'tamanho', v_tam_nome,
      'adicionais', v_ads, 'observacao', left(coalesce(it->>'observacao', ''), 100), 'preco', v_preco);
  end loop;
  insert into public.sequencias (empresa_id, nome, valor) values (e.id, 'pedido_cardapio', 1)
    on conflict (empresa_id, nome) do update set valor = public.sequencias.valor + 1 returning valor into v_numero;
  insert into public.cardapio_pedidos (empresa_id, numero, mesa_id, mesa_numero, itens, obs, total, cliente_token, confirmar)
    values (e.id, v_numero, m.id, m.numero, v_itens, nullif(left(trim(coalesce(p_obs, '')), 300), ''), v_total, p_token, v_confirmar) returning id into v_id;
  return jsonb_build_object('id', v_id, 'numero', v_numero, 'mesa', m.numero, 'total', v_total, 'confirmar', v_confirmar);
end $$;

-- Chamar o garçom / pedir a conta (troca a versão antiga: agora recebe a chave da mesa)
drop function if exists public.cardapio_chamar(text, uuid, text, text);
create or replace function public.cardapio_chamar(p_codigo text, p_mesa uuid, p_tipo text, p_token text, p_chave text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.empresas; m public.mesas; c public.cardapio_chamados; v_total numeric;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null then raise exception 'Cardápio não encontrado.'; end if;
  if p_tipo is null or p_tipo not in ('GARCOM', 'CONTA') then raise exception 'Pedido inválido.'; end if;
  select * into m from public.mesas where id = p_mesa and empresa_id = e.id and ativo;
  if m.id is null then raise exception 'Mesa não encontrada. Escolha a mesa de novo.'; end if;
  select * into c from public.cardapio_chamados where empresa_id = e.id and mesa_id = m.id and tipo = p_tipo and status = 'PENDENTE' order by criado_em desc limit 1;
  if c.id is not null then return jsonb_build_object('id', c.id, 'mesa', m.numero, 'tipo', c.tipo, 'total', c.total, 'repetido', true); end if;
  if (select count(*) from public.cardapio_chamados where empresa_id = e.id and criado_em > now() - interval '10 minutes') >= 100 then
    raise exception 'Muitos chamados ao mesmo tempo. Aguarde um pouco.'; end if;
  if p_tipo = 'CONTA' then
    select coalesce(sum(total), 0) into v_total from public.cardapio_pedidos
      where empresa_id = e.id and mesa_id = m.id and status not in ('FINALIZADO', 'CANCELADO') and criado_em > now() - interval '12 hours';
  end if;
  insert into public.cardapio_chamados (empresa_id, mesa_id, mesa_numero, tipo, total, cliente_token, confirmar)
    values (e.id, m.id, m.numero, p_tipo, v_total, left(p_token, 80), m.cardapio_chave is null or coalesce(p_chave, '') <> m.cardapio_chave) returning * into c;
  return jsonb_build_object('id', c.id, 'mesa', m.numero, 'tipo', c.tipo, 'total', c.total, 'repetido', false);
end $$;

revoke execute on function public.cardapio_uuid(text) from public, anon, authenticated;
revoke execute on function public.cardapio_pedir(text, uuid, jsonb, text, text, text) from public;
revoke execute on function public.cardapio_chamar(text, uuid, text, text, text) from public;
grant execute on function public.cardapio_pedir(text, uuid, jsonb, text, text, text), public.cardapio_chamar(text, uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Registro apagado não volta: um navegador com dados antigos não consegue recriar o que foi excluído
-- ---------------------------------------------------------------------
create table if not exists public.registros_excluidos (
  tabela text not null,
  id uuid not null,
  empresa_id uuid,
  excluido_em timestamptz not null default now(),
  primary key (tabela, id)
);
alter table public.registros_excluidos enable row level security;
revoke all on public.registros_excluidos from anon, authenticated;

create or replace function public.anotar_exclusao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.registros_excluidos (tabela, id, empresa_id) values (TG_TABLE_NAME, old.id, old.empresa_id) on conflict do nothing;
  return old;
end $$;
-- Inclusão de um id já excluído é ignorada em silêncio (a gravação do resto segue normal)
create or replace function public.barrar_excluido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.registros_excluidos where tabela = TG_TABLE_NAME and id = new.id) then return null; end if;
  return new;
end $$;
revoke execute on function public.anotar_exclusao(), public.barrar_excluido() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['categorias', 'grupos_adicionais', 'produtos', 'mesas', 'clientes', 'formas_pagamento', 'fornecedores', 'funcionarios',
    'entregadores', 'regioes_entrega', 'aplicativos_delivery', 'embalagens', 'promocoes', 'contas_bancarias', 'caixas', 'vendas', 'contas',
    'caixa_movimentos', 'estoque_movimentos', 'conta_bancaria_movimentos'] loop
    execute format('drop trigger if exists anotar_exclusao on public.%I', t);
    execute format('create trigger anotar_exclusao after delete on public.%I for each row execute function public.anotar_exclusao()', t);
    execute format('drop trigger if exists barrar_excluido on public.%I', t);
    execute format('create trigger barrar_excluido before insert on public.%I for each row execute function public.barrar_excluido()', t);
  end loop;
end $$;

-- Conferência: deve mostrar SEGURANCA 09 OK
select case when exists (select 1 from pg_trigger where tgname = 'barrar_excluido' and tgrelid = 'public.produtos'::regclass)
  and exists (select 1 from information_schema.columns where table_name = 'mesas' and column_name = 'cardapio_chave')
  and not exists (select 1 from public.mesas where cardapio_chave is null)
  and exists (select 1 from pg_proc where proname = 'cardapio_pedir' and pronargs = 6)
  and not exists (select 1 from pg_proc where proname = 'cardapio_pedir' and pronargs = 5)
  then 'SEGURANCA 09 OK' else 'ERRO' end as resultado;
