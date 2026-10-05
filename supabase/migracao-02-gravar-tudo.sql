-- =====================================================================
-- MGA Restaurante · migração 02: gravar todas as tabelas + tempo real
-- =====================================================================
-- Rode DEPOIS do schema.sql (Supabase › SQL Editor › New query › cole › Run).
-- Pode rodar mais de uma vez sem problema.

-- 1. Campo "extra" (jsonb): guarda detalhes do sistema que não têm coluna própria
--    (ex.: taxa de serviço da mesa, histórico do delivery), para nada se perder.
do $$
declare t text;
begin
  foreach t in array array[
    'categorias', 'produtos', 'grupos_adicionais', 'adicionais_opcoes', 'mesas', 'clientes', 'formas_pagamento',
    'fornecedores', 'funcionarios', 'entregadores', 'regioes_entrega', 'aplicativos_delivery', 'embalagens', 'promocoes',
    'contas_bancarias', 'caixas', 'caixa_movimentos', 'vendas', 'venda_itens', 'venda_pagamentos', 'contas',
    'estoque_movimentos', 'conta_bancaria_movimentos', 'auditoria'
  ] loop
    execute format('alter table public.%I add column if not exists extra jsonb not null default ''{}''::jsonb', t);
  end loop;
end $$;

-- 2. Contas a pagar/receber: o sistema guarda o NOME da categoria
alter table public.contas add column if not exists categoria text;
alter table public.contas alter column categoria_id drop not null;

-- 3. Movimentos de estoque: excluir um produto não apaga o histórico (só tira a ligação)
alter table public.estoque_movimentos alter column produto_id drop not null;
alter table public.estoque_movimentos drop constraint if exists estoque_movimentos_produto_id_fkey;
alter table public.estoque_movimentos add constraint estoque_movimentos_produto_id_fkey
  foreign key (produto_id) references public.produtos(id) on delete set null;

-- Itens de venda: idem (a venda antiga continua, mesmo se o produto sair do cadastro)
alter table public.venda_itens alter column produto_id drop not null;
alter table public.venda_itens drop constraint if exists venda_itens_produto_id_fkey;
alter table public.venda_itens add constraint venda_itens_produto_id_fkey
  foreign key (produto_id) references public.produtos(id) on delete set null;

-- 4. Tempo real: o que um computador grava aparece nos outros na hora
--    (o Supabase respeita a separação por empresa também aqui)
do $$
declare t text;
begin
  foreach t in array array[
    'categorias', 'produtos', 'produto_tamanhos', 'produto_ficha_tecnica', 'produto_grupos_adicionais', 'grupos_adicionais', 'adicionais_opcoes',
    'mesas', 'clientes', 'formas_pagamento', 'fornecedores', 'funcionarios', 'entregadores', 'regioes_entrega', 'aplicativos_delivery',
    'embalagens', 'promocoes', 'contas_bancarias', 'caixas', 'caixa_movimentos', 'vendas', 'venda_itens', 'venda_pagamentos',
    'contas', 'estoque_movimentos', 'conta_bancaria_movimentos', 'empresas'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;  -- já estava ligado
    end;
  end loop;
end $$;
