-- =====================================================================
-- MGA Restaurante · banco de dados no Supabase (PostgreSQL) — estrutura completa
-- =====================================================================
-- Como usar: Supabase › SQL Editor › New query › cole este arquivo inteiro › Run.
-- Só para um projeto NOVO (vazio): cria tudo de uma vez. O banco atual já tem tudo isto.
-- Cria as tabelas, as ligações entre elas e a separação por empresa: cada restaurante só
-- enxerga e grava os próprios dados (RLS). Inclui as etapas aplicadas depois (2 a 7):
--   2. gravação de tudo e tempo real        5. master entrando numa empresa (suporte)
--   3. usuários lidos pelo sistema          6. segurança (empresa, auditoria, funções)
--   4. usuário master e criação de empresa  7. trava entre empresas nas ligações
--   8. cardápio digital (pedidos pela mesa, chamar garçom e pedir a conta)
--   9. cardápio mais seguro (chave da mesa no QR Code) e registro excluído não volta
--
-- Login: usa o Supabase Auth (auth.users). Empresas e administradores são criados pelo
-- painel master (Edge Function "master"); funcionários, por Cadastros › Usuários
-- (Edge Function "usuarios"). Antes da etapa 4, crie no Supabase o login do master
-- (Authentication › Users › Add user) com o e-mail usado na etapa 4.
--
-- Valores em R$: numeric(12,2) · quantidades: numeric(12,3) · datas e horas: timestamptz.

-- ---------------------------------------------------------------------
-- Empresa e acesso
-- ---------------------------------------------------------------------
create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,                     -- nome fantasia (aparece no menu)
  razao_social text, cnpj text, ie text, telefone text, email text,
  cep text, endereco text, numero text, bairro text, cidade text, uf text,
  -- Taxa de serviço, taxa de entrega padrão, tempos do delivery, impressão (como no restConfig)
  config jsonb not null default '{}'::jsonb,
  plano text not null default 'TESTE',    -- para a assinatura (TESTE, MENSAL...)
  assinatura_vence_em date,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  login text not null,
  perfil text not null check (perfil in ('ADMIN', 'GERENTE', 'CAIXA', 'GARCOM', 'COZINHA')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, login)
);

-- Empresa do usuário logado: base de todas as regras de acesso
create or replace function public.minha_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from public.usuarios where id = auth.uid() and ativo
$$;

create table public.usuario_modulos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  modulo text not null check (modulo in ('cadastros', 'financeiro', 'estoque', 'vendas', 'mesas', 'cozinha', 'delivery', 'relatorios', 'configuracoes')),
  primary key (usuario_id, modulo)
);

create table public.auditoria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  data timestamptz not null default now(),
  usuario text,
  modulo text,
  descricao text not null,
  detalhe text
);
create table public.auditoria_alteracoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  auditoria_id uuid not null references public.auditoria(id) on delete cascade,
  campo text not null, antes text, depois text
);

-- Numeração própria de cada empresa (venda #1, caixa #1, código 001...)
create table public.sequencias (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,                     -- 'venda', 'caixa', 'produto'
  valor bigint not null default 0,
  primary key (empresa_id, nome)
);

-- ---------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------
create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  cozinha boolean not null default true,  -- vai para a fila de produção
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id),
  codigo text not null,
  nome text not null,
  tipo text not null default 'VENDA' check (tipo in ('VENDA', 'INSUMO')),
  preco numeric(12,2) not null default 0,
  custo numeric(12,2) not null default 0,  -- custo médio
  unidade text not null default 'UN',
  controla_estoque boolean not null default false,
  estoque numeric(12,3) not null default 0,
  estoque_minimo numeric(12,3) not null default 0,
  foto_url text,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, codigo),
  unique (empresa_id, nome)
);

create table public.produto_tamanhos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  nome text not null,
  preco numeric(12,2) not null check (preco > 0),
  ordem int not null default 0,
  unique (produto_id, nome)
);

create table public.produto_ficha_tecnica (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  insumo_id uuid not null references public.produtos(id),
  quantidade numeric(12,3) not null check (quantidade > 0),
  unique (produto_id, insumo_id),
  check (produto_id <> insumo_id)
);

create table public.grupos_adicionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  minimo int not null default 0 check (minimo >= 0),   -- 1 ou mais = etapa obrigatória
  maximo int not null default 0 check (maximo >= 0),   -- 0 = sem limite
  ativo boolean not null default true,
  unique (empresa_id, nome),
  check (maximo = 0 or maximo >= minimo)
);
create table public.adicionais_opcoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  grupo_id uuid not null references public.grupos_adicionais(id) on delete cascade,
  nome text not null,
  preco numeric(12,2) not null default 0 check (preco >= 0),
  ordem int not null default 0,
  ativo boolean not null default true,
  unique (grupo_id, nome)
);
create table public.produto_grupos_adicionais (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  grupo_id uuid not null references public.grupos_adicionais(id) on delete cascade,
  primary key (produto_id, grupo_id)
);

create table public.promocoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  alvo text not null check (alvo in ('PRODUTO', 'CATEGORIA')),
  tipo text not null check (tipo in ('PERCENTUAL', 'PRECO')),
  valor numeric(12,2) not null check (valor > 0),
  hora_inicio time, hora_fim time,
  data_inicio date, data_fim date,
  ativo boolean not null default true,
  check (tipo = 'PERCENTUAL' or alvo = 'PRODUTO'),
  check (tipo = 'PRECO' or valor < 100)
);
create table public.promocao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  promocao_id uuid not null references public.promocoes(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete cascade,
  categoria_id uuid references public.categorias(id) on delete cascade,
  check ((produto_id is null) <> (categoria_id is null))
);
create table public.promocao_dias (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  promocao_id uuid not null references public.promocoes(id) on delete cascade,
  dia smallint not null check (dia between 0 and 6),   -- 0 = domingo
  primary key (promocao_id, dia)
);

create table public.embalagens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  preco numeric(12,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true,
  unique (empresa_id, nome)
);
create table public.embalagem_produtos (
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  embalagem_id uuid not null references public.embalagens(id) on delete cascade,
  produto_id uuid not null unique references public.produtos(id) on delete cascade,  -- uma embalagem por produto
  primary key (embalagem_id, produto_id)
);

create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero text not null,
  descricao text,
  lugares int not null default 4,
  ativo boolean not null default true,
  unique (empresa_id, numero)
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  telefone text, documento text, email text,
  cep text, endereco text, numero text, complemento text, bairro text, cidade text, referencia text,
  obs text,
  criado_em timestamptz not null default now()
);
create index on public.clientes (empresa_id, telefone);

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  documento text, telefone text, email text, contato text, endereco text, cidade text, obs text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (empresa_id, nome)
);

create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cpf text, telefone text,
  cargo text not null,
  admissao date,
  salario numeric(12,2) not null default 0,
  usuario_id uuid unique references public.usuarios(id) on delete set null,
  obs text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.entregadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  telefone text, cpf text,
  veiculo text not null default 'Moto',
  placa text, obs text,
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table public.regioes_entrega (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cidade text,
  taxa numeric(12,2) not null default 0,
  tempo_min int,
  ativo boolean not null default true
);
create table public.regiao_bairros (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  regiao_id uuid not null references public.regioes_entrega(id) on delete cascade,
  bairro text not null,
  unique (regiao_id, bairro)
);

create table public.aplicativos_delivery (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  comissao numeric(5,2) not null default 0 check (comissao >= 0 and comissao < 100),
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table public.formas_pagamento (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'PRAZO', 'OUTROS')),
  ordem int not null default 0,
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

-- ---------------------------------------------------------------------
-- Caixa e vendas
-- ---------------------------------------------------------------------
create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero int not null,
  operador_id uuid references public.usuarios(id),
  operador_nome text not null,
  aberto_por text,
  abertura timestamptz not null default now(),
  valor_inicial numeric(12,2) not null default 0,
  status text not null default 'ABERTO' check (status in ('ABERTO', 'FECHADO')),
  fechamento timestamptz,
  fechado_por text,
  valor_contado numeric(12,2),
  diferenca numeric(12,2),
  obs_fechamento text,
  resumo jsonb,                            -- resumo congelado no fechamento
  unique (empresa_id, numero)
);
-- Só um caixa aberto por empresa
create unique index caixas_um_aberto on public.caixas (empresa_id) where status = 'ABERTO';

create table public.caixa_conferencia (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  caixa_id uuid not null references public.caixas(id) on delete cascade,
  forma text not null,                     -- DINHEIRO, PIX, DEBITO, CREDITO, OUTROS
  esperado numeric(12,2) not null,
  contado numeric(12,2) not null,
  diferenca numeric(12,2) not null
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  numero int not null,
  caixa_id uuid not null references public.caixas(id),
  tipo text not null check (tipo in ('BALCAO', 'MESA', 'DELIVERY', 'ENCOMENDA')),
  status text not null default 'ABERTA' check (status in ('ABERTA', 'FINALIZADA', 'CANCELADA')),
  cliente_id uuid references public.clientes(id) on delete set null,
  mesa_id uuid references public.mesas(id) on delete set null,
  mesa_numero text,
  pessoas int not null default 1,
  conta_pedida boolean not null default false,
  taxa_servico_ativa boolean not null default false,
  taxa_servico_percentual numeric(5,2) not null default 0,
  taxa_entrega numeric(12,2) not null default 0,
  taxa_embalagem numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  acrescimo numeric(12,2) not null default 0,
  aplicativo_id uuid references public.aplicativos_delivery(id) on delete set null,
  aplicativo_nome text,
  aplicativo_comissao numeric(5,2),
  obs text,
  operador_id uuid references public.usuarios(id),
  operador_nome text not null,
  data timestamptz not null default now(),
  finalizada_em timestamptz,
  cancelada_em timestamptz,
  cancelada_por text,
  motivo_cancelamento text,
  estoque_baixado boolean not null default false,
  unique (empresa_id, numero)
);
create index on public.vendas (empresa_id, finalizada_em);
create index on public.vendas (empresa_id, status);

create table public.venda_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  codigo text,
  nome text not null,                      -- com o tamanho: "Suco (500 ml)"
  tamanho text,
  quantidade numeric(12,3) not null check (quantidade > 0),
  preco_unitario numeric(12,2) not null,
  preco_tabela numeric(12,2),              -- preço sem promoção
  promocao text,
  custo_unitario numeric(12,2) not null default 0,
  desconto numeric(12,2) not null default 0,
  observacao text,
  pago boolean not null default false,
  adicionado_por text,
  adicionado_em timestamptz not null default now(),
  impresso_em timestamptz,                 -- comanda da cozinha já impressa
  preparo_estado text check (preparo_estado in ('FILA', 'PREPARANDO', 'PRONTO', 'ENTREGUE')),
  preparo_desde timestamptz,
  preparo_atualizado_em timestamptz,
  preparo_por text
);
create index on public.venda_itens (venda_id);
create index on public.venda_itens (empresa_id, preparo_estado) where preparo_estado is not null;

create table public.venda_item_adicionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  item_id uuid not null references public.venda_itens(id) on delete cascade,
  grupo text,
  nome text not null,
  preco numeric(12,2) not null default 0
);

create table public.venda_pagamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  forma_id uuid references public.formas_pagamento(id),
  tipo text not null,                      -- DINHEIRO, PIX, DEBITO, CREDITO, PRAZO, OUTROS
  nome text not null,
  valor numeric(12,2) not null,            -- valor aplicado na conta
  recebido numeric(12,2) not null,         -- valor entregue pelo cliente
  troco numeric(12,2) not null default 0,
  parte text,                              -- "Pessoa 1", itens escolhidos...
  recebido_por text,
  data timestamptz not null default now()
);
create index on public.venda_pagamentos (venda_id);

create table public.venda_entrega (
  venda_id uuid primary key references public.vendas(id) on delete cascade,
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  modo text not null default 'ENTREGAR' check (modo in ('ENTREGAR', 'RETIRAR')),
  status_delivery text not null default 'RECEBIDO' check (status_delivery in ('RECEBIDO', 'PREPARANDO', 'PRONTO', 'SAIU', 'ENTREGUE')),
  nome text not null, telefone text not null,
  cep text, endereco text, numero text, complemento text, bairro text, cidade text, referencia text,
  regiao text,
  agendado_para timestamptz,               -- encomenda
  forma_prevista_id uuid references public.formas_pagamento(id),
  troco_para numeric(12,2),
  levar_maquina boolean not null default false,
  entregador_id uuid references public.entregadores(id)
);

create table public.venda_historico_delivery (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  venda_id uuid not null references public.vendas(id) on delete cascade,
  status text not null,
  data timestamptz not null default now(),
  usuario text,
  entregador text
);

-- ---------------------------------------------------------------------
-- Estoque
-- ---------------------------------------------------------------------
create table public.estoque_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  produto_id uuid not null references public.produtos(id),
  produto_nome text not null,
  unidade text not null,
  tipo text not null check (tipo in ('ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'ESTORNO', 'PRODUCAO')),
  quantidade numeric(12,3) not null,       -- + entra, − sai
  saldo numeric(12,3) not null,            -- saldo depois do movimento
  custo_unitario numeric(12,2),
  motivo text,
  venda_id uuid references public.vendas(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  lote text,                               -- compra ou produção que gerou vários movimentos
  data timestamptz not null default now(),
  usuario text
);
create index on public.estoque_movimentos (empresa_id, produto_id, data);

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------
create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('PAGAR', 'RECEBER')),
  nome text not null,
  unique (empresa_id, tipo, nome)
);

create table public.contas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null check (tipo in ('PAGAR', 'RECEBER')),
  descricao text not null,
  categoria_id uuid not null references public.categorias_financeiras(id),
  valor numeric(12,2) not null check (valor > 0),
  vencimento date not null,
  status text not null default 'ABERTA' check (status in ('ABERTA', 'PAGA')),
  pago_em date,
  forma text,
  cliente_id uuid references public.clientes(id) on delete set null,
  fornecedor_id uuid references public.fornecedores(id) on delete set null,
  venda_id uuid references public.vendas(id) on delete cascade,   -- venda a prazo
  obs text,
  criado_em timestamptz not null default now()
);
create index on public.contas (empresa_id, tipo, vencimento);

-- Movimentos do caixa (abertura, sangria, suprimento, estorno, recebimento e pagamento de contas)
create table public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  caixa_id uuid not null references public.caixas(id) on delete cascade,
  tipo text not null check (tipo in ('ABERTURA', 'SUPRIMENTO', 'SANGRIA', 'ESTORNO', 'RECEBIMENTO', 'PAGAMENTO')),
  valor numeric(12,2) not null,
  forma text not null default 'DINHEIRO',
  descricao text,
  data timestamptz not null default now(),
  operador text,
  venda_id uuid references public.vendas(id) on delete set null,
  conta_id uuid references public.contas(id) on delete set null
);
create index on public.caixa_movimentos (caixa_id);

create table public.contas_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  tipo text not null default 'BANCO' check (tipo in ('BANCO', 'CAIXA', 'CARTEIRA')),
  banco text,                              -- agência / conta
  saldo_inicial numeric(12,2) not null default 0,
  data_inicial date not null default current_date,
  ativo boolean not null default true,
  unique (empresa_id, nome)
);

create table public.conta_bancaria_movimentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  conta_bancaria_id uuid not null references public.contas_bancarias(id),
  tipo text not null check (tipo in ('ENTRADA', 'SAIDA')),
  valor numeric(12,2) not null check (valor > 0),
  descricao text not null,
  data date not null default current_date,
  origem text not null check (origem in ('AVULSO', 'TRANSFERENCIA', 'BAIXA', 'CAIXA')),
  transferencia_id uuid,                   -- liga as duas pontas de uma transferência
  conta_id uuid references public.contas(id) on delete cascade,                      -- baixa de conta
  caixa_movimento_id uuid references public.caixa_movimentos(id) on delete cascade,  -- sangria/suprimento
  usuario text,
  criado_em timestamptz not null default now()
);
create index on public.conta_bancaria_movimentos (conta_bancaria_id, data);

-- =====================================================================
-- Separação por empresa (Row Level Security)
-- =====================================================================
-- Em todas as tabelas com empresa_id: só lê e grava quem é da mesma empresa,
-- e o empresa_id é preenchido sozinho com a empresa de quem está logado.
do $$
declare t text;
begin
  foreach t in array array[
    'usuarios', 'usuario_modulos', 'auditoria', 'auditoria_alteracoes', 'sequencias',
    'categorias', 'produtos', 'produto_tamanhos', 'produto_ficha_tecnica', 'grupos_adicionais', 'adicionais_opcoes',
    'produto_grupos_adicionais', 'promocoes', 'promocao_itens', 'promocao_dias', 'embalagens', 'embalagem_produtos',
    'mesas', 'clientes', 'fornecedores', 'funcionarios', 'entregadores', 'regioes_entrega', 'regiao_bairros',
    'aplicativos_delivery', 'formas_pagamento',
    'caixas', 'caixa_conferencia', 'vendas', 'venda_itens', 'venda_item_adicionais', 'venda_pagamentos',
    'venda_entrega', 'venda_historico_delivery', 'estoque_movimentos',
    'categorias_financeiras', 'contas', 'caixa_movimentos', 'contas_bancarias', 'conta_bancaria_movimentos'
  ] loop
    execute format('alter table public.%I alter column empresa_id set default public.minha_empresa()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (empresa_id = public.minha_empresa()) with check (empresa_id = public.minha_empresa())', t || '_da_empresa', t);
    execute format('create index if not exists %I on public.%I (empresa_id)', t || '_empresa_idx', t);
  end loop;
end $$;

-- A própria empresa: cada um vê e altera só a sua (criar é pela função abaixo)
alter table public.empresas enable row level security;
create policy empresas_ver on public.empresas for select to authenticated using (id = public.minha_empresa());
create policy empresas_alterar on public.empresas for update to authenticated using (id = public.minha_empresa()) with check (id = public.minha_empresa());

-- =====================================================================
-- Permissões da API: só usuários logados (authenticated) usam as tabelas; o RLS acima
-- filtra as linhas de cada empresa. Visitante sem login (anon) não acessa nada.
-- Necessário porque o projeto foi criado sem "Expor automaticamente novas tabelas".
-- =====================================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
grant execute on function public.minha_empresa() to authenticated;

-- =====================================================================
-- Primeiro acesso: cria a empresa, o administrador e os cadastros iniciais
-- =====================================================================
create or replace function public.criar_empresa(p_nome text, p_nome_admin text, p_login text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_empresa uuid;
begin
  if auth.uid() is null then raise exception 'Faça login antes de criar a empresa.'; end if;
  if exists (select 1 from public.usuarios where id = auth.uid()) then raise exception 'Este usuário já pertence a uma empresa.'; end if;
  if coalesce(trim(p_nome), '') = '' then raise exception 'Informe o nome do restaurante.'; end if;

  insert into public.empresas (nome, config) values (trim(p_nome),
    '{"taxaServico": 10, "servicoPadrao": true, "taxaEntrega": 0, "entregaVerde": 20, "entregaAmarelo": 40,
      "impressao": {"largura": "80", "cupomModo": "NAO", "comandaAuto": false, "viasComanda": 1, "rodape": "Obrigado pela preferência! Volte sempre."}}'::jsonb)
  returning id into v_empresa;

  insert into public.usuarios (id, empresa_id, nome, login, perfil)
  values (auth.uid(), v_empresa, trim(p_nome_admin), lower(trim(p_login)), 'ADMIN');

  -- Formas de pagamento, categorias financeiras e mesas iniciais (as mesmas do sistema hoje)
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
grant execute on function public.criar_empresa(text, text, text) to authenticated;

-- Próximo número (venda, caixa, código de produto) sem repetir, mesmo com dois caixas ao mesmo tempo
create or replace function public.proximo_numero(p_nome text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into public.sequencias (empresa_id, nome, valor) values (public.minha_empresa(), p_nome, 1)
  on conflict (empresa_id, nome) do update set valor = public.sequencias.valor + 1
  returning valor into v;
  return v;
end $$;
grant execute on function public.proximo_numero(text) to authenticated;

-- =====================================================================
-- 2. Gravação de tudo e tempo real
-- =====================================================================
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

-- =====================================================================
-- 3. Usuários lidos pelo sistema
-- =====================================================================
-- =====================================================================
-- MGA Restaurante · migração 03: usuários só são alterados pelo servidor
-- =====================================================================
-- Rode DEPOIS da migração 02 (Supabase › SQL Editor › New query › cole › Run).
-- Pode rodar mais de uma vez sem problema.
--
-- Antes: qualquer funcionário logado podia alterar a tabela usuarios pela API (até se dar o
-- perfil de administrador). Agora o sistema só LÊ usuários e módulos; criar, alterar e excluir
-- é feito pela Edge Function "usuarios", que confere se quem pede é o administrador.
-- (O primeiro acesso continua funcionando: a função criar_empresa roda com permissão própria.)

drop policy if exists usuarios_da_empresa on public.usuarios;
drop policy if exists usuarios_ver on public.usuarios;
create policy usuarios_ver on public.usuarios for select to authenticated using (empresa_id = public.minha_empresa());

drop policy if exists usuario_modulos_da_empresa on public.usuario_modulos;
drop policy if exists usuario_modulos_ver on public.usuario_modulos;
create policy usuario_modulos_ver on public.usuario_modulos for select to authenticated using (empresa_id = public.minha_empresa());

-- Tempo real também para a lista de usuários
do $$
begin
  alter publication supabase_realtime add table public.usuarios;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- 4. Usuário master e criação de empresa
-- =====================================================================
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

-- =====================================================================
-- 5. Master entrando numa empresa (suporte)
-- =====================================================================
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

-- =====================================================================
-- 6. Segurança: empresa, auditoria e funções
-- =====================================================================
-- 1. Empresa: o sistema só grava estas colunas (nome, dados da empresa e configurações).
--    Funcionário não altera plano, vencimento nem "ativo" da empresa.
revoke update on public.empresas from authenticated;
grant update (nome, razao_social, cnpj, ie, telefone, email, cep, endereco, numero, bairro, cidade, uf, config)
  on public.empresas to authenticated;

-- 2. Empresa do usuário logado: só se o usuário e a empresa estiverem ativos (master: a empresa em que entrou)
create or replace function public.minha_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select empresa_acesso from public.masters where id = auth.uid()),
    (select u.empresa_id from public.usuarios u join public.empresas e on e.id = u.empresa_id
      where u.id = auth.uid() and u.ativo and e.ativo)
  )
$$;

-- 3. Auditoria: ver e incluir; nunca alterar nem excluir
drop policy if exists auditoria_da_empresa on public.auditoria;
drop policy if exists auditoria_ver on public.auditoria;
drop policy if exists auditoria_incluir on public.auditoria;
create policy auditoria_ver on public.auditoria for select to authenticated using (empresa_id = public.minha_empresa());
create policy auditoria_incluir on public.auditoria for insert to authenticated with check (empresa_id = public.minha_empresa());
drop policy if exists auditoria_alteracoes_da_empresa on public.auditoria_alteracoes;
drop policy if exists auditoria_alteracoes_ver on public.auditoria_alteracoes;
drop policy if exists auditoria_alteracoes_incluir on public.auditoria_alteracoes;
create policy auditoria_alteracoes_ver on public.auditoria_alteracoes for select to authenticated using (empresa_id = public.minha_empresa());
create policy auditoria_alteracoes_incluir on public.auditoria_alteracoes for insert to authenticated with check (empresa_id = public.minha_empresa());
revoke update, delete on public.auditoria, public.auditoria_alteracoes from authenticated;

-- 4. Funções internas: só para quem está logado
revoke execute on function public.minha_empresa() from public, anon;
revoke execute on function public.eh_master() from public, anon;
revoke execute on function public.proximo_numero(text) from public, anon;
grant execute on function public.minha_empresa() to authenticated;
grant execute on function public.eh_master() to authenticated;
grant execute on function public.proximo_numero(text) to authenticated;

-- =====================================================================
-- 7. Trava entre empresas nas ligações
-- =====================================================================
-- Para cada ligação (chave estrangeira) entre duas tabelas que têm empresa_id, uma segunda ligação
-- exige a mesma empresa: (coluna, empresa_id) → (id, empresa_id). Pode rodar mais de uma vez.
do $$
declare
  fk record;
  nome text;
  ruins int := 0;
begin
  for fk in
    select c.conname, c.conrelid::regclass as filha, c.confrelid::regclass as mae,
           af.attname as coluna, ap.attname as coluna_mae, cf.relname as tabela_filha, cm.relname as tabela_mae
    from pg_constraint c
    join pg_class cf on cf.oid = c.conrelid
    join pg_class cm on cm.oid = c.confrelid
    join pg_namespace nf on nf.oid = cf.relnamespace and nf.nspname = 'public'
    join pg_namespace nm on nm.oid = cm.relnamespace and nm.nspname = 'public'
    join pg_attribute af on af.attrelid = c.conrelid and af.attnum = c.conkey[1]
    join pg_attribute ap on ap.attrelid = c.confrelid and ap.attnum = c.confkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and ap.attname = 'id'
      and af.attname <> 'empresa_id'
      and exists (select 1 from pg_attribute x where x.attrelid = c.conrelid and x.attname = 'empresa_id' and not x.attisdropped)
      and exists (select 1 from pg_attribute x where x.attrelid = c.confrelid and x.attname = 'empresa_id' and not x.attisdropped)
  loop
    nome := left(fk.tabela_mae || '_id_empresa_key', 63);
    if not exists (select 1 from pg_constraint where conrelid = fk.mae and conname = nome) then
      execute format('alter table %s add constraint %I unique (id, empresa_id)', fk.mae, nome);
    end if;
    nome := left(fk.tabela_filha || '_' || fk.coluna || '_mesma_empresa', 63);
    if not exists (select 1 from pg_constraint where conrelid = fk.filha and conname = nome) then
      execute format('alter table %s add constraint %I foreign key (%I, empresa_id) references %s (id, empresa_id) not valid',
        fk.filha, nome, fk.coluna, fk.mae);
    end if;
    begin
      execute format('alter table %s validate constraint %I', fk.filha, nome);
    exception when foreign_key_violation then
      ruins := ruins + 1;
      raise notice 'Atenção: % tem registros ligados a outra empresa (coluna %).', fk.tabela_filha, fk.coluna;
    end;
  end loop;
  if ruins > 0 then raise notice '% ligação(ões) antigas entre empresas encontradas. A trava já vale para os novos registros.', ruins; end if;
end $$;

-- =====================================================================
-- 8. Cardápio digital (pedidos pela mesa, chamar garçom e pedir a conta)
-- =====================================================================
-- Código do link de cada empresa (ex.: cardapio.html?e=k7m2p9qa)
alter table public.empresas add column if not exists cardapio_codigo text unique;

-- Pedidos feitos pelo cardápio
create table if not exists public.cardapio_pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.minha_empresa() references public.empresas(id) on delete cascade,
  numero int not null,
  mesa_id uuid references public.mesas(id) on delete set null,
  mesa_numero text not null,
  itens jsonb not null,                    -- [{produtoId, nome, quantidade, tamanhoId, tamanho, adicionais:[{id,nome,preco}], observacao, preco}]
  obs text,
  total numeric(12,2) not null default 0,
  status text not null default 'NOVO' check (status in ('NOVO', 'PREPARANDO', 'PRONTO', 'ENTREGUE', 'FINALIZADO', 'CANCELADO')),
  cliente_token text not null,             -- identifica o celular do cliente (para ele ver o andamento)
  aceito_em timestamptz,                   -- um computador do restaurante pegou o pedido para lançar na mesa
  aceito_por uuid,
  venda_id uuid,                           -- conta da mesa em que foi lançado
  erro text,                               -- motivo, se não foi possível lançar
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, numero)
);
create index if not exists cardapio_pedidos_empresa_status on public.cardapio_pedidos (empresa_id, status);
create index if not exists cardapio_pedidos_token on public.cardapio_pedidos (cliente_token);

-- Chamar o garçom e pedir a conta
create table if not exists public.cardapio_chamados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.minha_empresa() references public.empresas(id) on delete cascade,
  mesa_id uuid references public.mesas(id) on delete set null,
  mesa_numero text not null,
  tipo text not null check (tipo in ('GARCOM', 'CONTA')),
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'ATENDIDO')),
  total numeric(12,2),
  cliente_token text,
  criado_em timestamptz not null default now(),
  atendido_em timestamptz,
  atendido_por text
);
create index if not exists cardapio_chamados_empresa_status on public.cardapio_chamados (empresa_id, status);

-- Mesa sempre da mesma empresa (trava entre empresas, como na etapa 7)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'mesas_id_empresa_key') then
    alter table public.mesas add constraint mesas_id_empresa_key unique (id, empresa_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cardapio_pedidos_mesa_id_mesma_empresa') then
    alter table public.cardapio_pedidos add constraint cardapio_pedidos_mesa_id_mesma_empresa foreign key (mesa_id, empresa_id) references public.mesas (id, empresa_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cardapio_chamados_mesa_id_mesma_empresa') then
    alter table public.cardapio_chamados add constraint cardapio_chamados_mesa_id_mesma_empresa foreign key (mesa_id, empresa_id) references public.mesas (id, empresa_id);
  end if;
end $$;

-- Equipe: cada empresa só vê e mexe nos próprios pedidos e chamados
alter table public.cardapio_pedidos enable row level security;
alter table public.cardapio_chamados enable row level security;
drop policy if exists cardapio_pedidos_da_empresa on public.cardapio_pedidos;
create policy cardapio_pedidos_da_empresa on public.cardapio_pedidos for all to authenticated
  using (empresa_id = public.minha_empresa()) with check (empresa_id = public.minha_empresa());
drop policy if exists cardapio_chamados_da_empresa on public.cardapio_chamados;
create policy cardapio_chamados_da_empresa on public.cardapio_chamados for all to authenticated
  using (empresa_id = public.minha_empresa()) with check (empresa_id = public.minha_empresa());
grant select, insert, update, delete on public.cardapio_pedidos, public.cardapio_chamados to authenticated;
revoke all on public.cardapio_pedidos, public.cardapio_chamados from anon;

-- Tempo real: pedido novo e chamado aparecem na hora para a equipe
do $$ begin
  begin alter publication supabase_realtime add table public.cardapio_pedidos; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.cardapio_chamados; exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- Funções do cliente (sem login)
-- ---------------------------------------------------------------------
-- Empresa do link (só se ativa)
create or replace function public.cardapio_empresa(p_codigo text) returns public.empresas
language sql stable security definer set search_path = public as $$
  select * from public.empresas where cardapio_codigo = p_codigo and ativo and coalesce(p_codigo, '') <> ''
$$;
revoke execute on function public.cardapio_empresa(text) from public, anon, authenticated;

create or replace function public.cardapio_publico(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.empresas;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null then raise exception 'Cardápio não encontrado.'; end if;
  return jsonb_build_object(
    'empresa', jsonb_build_object('nome', e.nome, 'aberto', coalesce((e.config->'cardapio'->>'ativo')::boolean, false),
      'mensagem', e.config->'cardapio'->>'mensagem', 'telefone', e.telefone, 'taxaServico', coalesce((e.config->>'taxaServico')::numeric, 0)),
    'categorias', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'ordem', c.ordem) order by c.ordem, c.nome)
      from public.categorias c where c.empresa_id = e.id and c.ativo), '[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'preco', p.preco, 'foto', p.foto_url,
        'categoriaId', p.categoria_id, 'unidade', p.unidade, 'ordem', coalesce((p.extra->>'ordemCardapio')::int, 9999),
        'tamanhos', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'nome', t.nome, 'preco', t.preco) order by t.ordem) from public.produto_tamanhos t where t.produto_id = p.id), '[]'::jsonb),
        'adicionais', coalesce((select jsonb_agg(pg.grupo_id) from public.produto_grupos_adicionais pg where pg.produto_id = p.id), '[]'::jsonb))
        order by coalesce((p.extra->>'ordemCardapio')::int, 9999), p.nome)
      from public.produtos p join public.categorias c on c.id = p.categoria_id and c.ativo
      where p.empresa_id = e.id and p.ativo and p.tipo = 'VENDA' and coalesce((p.extra->>'cardapio')::boolean, true)), '[]'::jsonb),
    'adicionais', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'nome', g.nome, 'min', g.minimo, 'max', g.maximo,
        'opcoes', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nome', o.nome, 'preco', o.preco) order by o.ordem) from public.adicionais_opcoes o where o.grupo_id = g.id and o.ativo), '[]'::jsonb)))
      from public.grupos_adicionais g where g.empresa_id = e.id and g.ativo), '[]'::jsonb),
    'mesas', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero) order by m.numero) from public.mesas m where m.empresa_id = e.id and m.ativo), '[]'::jsonb)
  );
end $$;

-- Pedido do cliente: o preço vem do cadastro (não do celular). Limites contra abuso.
create or replace function public.cardapio_pedir(p_codigo text, p_mesa uuid, p_itens jsonb, p_obs text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e public.empresas;
  m public.mesas;
  it jsonb; ad jsonb;
  p public.produtos;
  v_tam_id uuid; v_tam_nome text; v_op record;
  v_itens jsonb := '[]'::jsonb; v_ads jsonb;
  v_qtd numeric; v_preco numeric; v_total numeric := 0; v_numero int; v_id uuid;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null then raise exception 'Cardápio não encontrado.'; end if;
  if not coalesce((e.config->'cardapio'->>'ativo')::boolean, false) then raise exception 'O restaurante não está recebendo pedidos pelo cardápio agora. Chame o garçom.'; end if;
  select * into m from public.mesas where id = p_mesa and empresa_id = e.id and ativo;
  if m.id is null then raise exception 'Mesa não encontrada. Escolha a mesa de novo.'; end if;
  if coalesce(length(p_token), 0) < 16 then raise exception 'Abra o cardápio de novo pelo link.'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'O pedido está vazio.'; end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'Pedido grande demais: no máximo 40 itens por vez.'; end if;
  if exists (select 1 from public.cardapio_pedidos where cliente_token = p_token and criado_em > now() - interval '10 seconds') then
    raise exception 'Aguarde alguns segundos antes de enviar outro pedido.'; end if;
  if (select count(*) from public.cardapio_pedidos where empresa_id = e.id and mesa_id = m.id and criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'Muitos pedidos desta mesa na última hora. Chame o garçom.'; end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    select * into p from public.produtos where id = (it->>'produtoId')::uuid and empresa_id = e.id and ativo and tipo = 'VENDA'
      and coalesce((extra->>'cardapio')::boolean, true);
    if p.id is null then raise exception 'Um dos produtos não está mais disponível. Atualize o cardápio.'; end if;
    v_qtd := floor(coalesce((it->>'quantidade')::numeric, 0));
    if v_qtd < 1 or v_qtd > 50 then raise exception 'Quantidade inválida em "%".', p.nome; end if;
    v_preco := p.preco;
    v_tam_id := null; v_tam_nome := null;
    if coalesce(it->>'tamanhoId', '') <> '' then
      select t.id, t.nome, t.preco into v_tam_id, v_tam_nome, v_preco from public.produto_tamanhos t where t.id = (it->>'tamanhoId')::uuid and t.produto_id = p.id;
      if v_tam_id is null then raise exception 'Tamanho inválido em "%".', p.nome; end if;
    elsif exists (select 1 from public.produto_tamanhos where produto_id = p.id) then
      raise exception 'Escolha o tamanho de "%".', p.nome;
    end if;
    v_ads := '[]'::jsonb;
    for ad in select * from jsonb_array_elements(coalesce(it->'adicionais', '[]'::jsonb)) loop
      select o.id, o.nome, o.preco into v_op from public.adicionais_opcoes o
        join public.produto_grupos_adicionais pg on pg.grupo_id = o.grupo_id and pg.produto_id = p.id
        where o.id = (ad #>> '{}')::uuid and o.ativo;
      if v_op.id is null then raise exception 'Adicional inválido em "%".', p.nome; end if;
      v_ads := v_ads || jsonb_build_object('id', v_op.id, 'nome', v_op.nome, 'preco', v_op.preco);
      v_preco := v_preco + v_op.preco;
    end loop;
    v_total := v_total + v_preco * v_qtd;
    v_itens := v_itens || jsonb_build_object('produtoId', p.id, 'nome', p.nome, 'quantidade', v_qtd, 'tamanhoId', v_tam_id, 'tamanho', v_tam_nome,
      'adicionais', v_ads, 'observacao', left(coalesce(it->>'observacao', ''), 100), 'preco', v_preco);
  end loop;
  insert into public.sequencias (empresa_id, nome, valor) values (e.id, 'pedido_cardapio', 1)
    on conflict (empresa_id, nome) do update set valor = public.sequencias.valor + 1 returning valor into v_numero;
  insert into public.cardapio_pedidos (empresa_id, numero, mesa_id, mesa_numero, itens, obs, total, cliente_token)
    values (e.id, v_numero, m.id, m.numero, v_itens, nullif(left(trim(coalesce(p_obs, '')), 300), ''), v_total, p_token) returning id into v_id;
  return jsonb_build_object('id', v_id, 'numero', v_numero, 'mesa', m.numero, 'total', v_total);
end $$;

-- Andamento dos pedidos deste celular (últimas 12 horas)
create or replace function public.cardapio_meus_pedidos(p_codigo text, p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e public.empresas;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null or coalesce(length(p_token), 0) < 16 then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'numero', numero, 'mesa', mesa_numero, 'status', status, 'total', total,
      'itens', itens, 'obs', obs, 'criadoEm', criado_em) order by criado_em desc)
    from public.cardapio_pedidos where empresa_id = e.id and cliente_token = p_token and criado_em > now() - interval '12 hours'), '[]'::jsonb);
end $$;

-- Chamar o garçom (GARCOM) ou pedir a conta (CONTA). Se já tem um pendente igual, devolve o mesmo.
create or replace function public.cardapio_chamar(p_codigo text, p_mesa uuid, p_tipo text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.empresas; m public.mesas; c public.cardapio_chamados; v_total numeric;
begin
  e := public.cardapio_empresa(p_codigo);
  if e.id is null then raise exception 'Cardápio não encontrado.'; end if;
  if p_tipo not in ('GARCOM', 'CONTA') then raise exception 'Pedido inválido.'; end if;
  select * into m from public.mesas where id = p_mesa and empresa_id = e.id and ativo;
  if m.id is null then raise exception 'Mesa não encontrada. Escolha a mesa de novo.'; end if;
  select * into c from public.cardapio_chamados where empresa_id = e.id and mesa_id = m.id and tipo = p_tipo and status = 'PENDENTE' order by criado_em desc limit 1;
  if c.id is not null then return jsonb_build_object('id', c.id, 'mesa', m.numero, 'tipo', c.tipo, 'total', c.total, 'repetido', true); end if;
  -- Conta: soma do que esta mesa pediu pelo cardápio e ainda não foi finalizado (o valor exato sai da conta da mesa)
  if p_tipo = 'CONTA' then
    select coalesce(sum(total), 0) into v_total from public.cardapio_pedidos
      where empresa_id = e.id and mesa_id = m.id and status not in ('FINALIZADO', 'CANCELADO') and criado_em > now() - interval '12 hours';
  end if;
  insert into public.cardapio_chamados (empresa_id, mesa_id, mesa_numero, tipo, total, cliente_token)
    values (e.id, m.id, m.numero, p_tipo, v_total, left(p_token, 80)) returning * into c;
  return jsonb_build_object('id', c.id, 'mesa', m.numero, 'tipo', c.tipo, 'total', c.total, 'repetido', false);
end $$;

-- ---------------------------------------------------------------------
-- Funções da equipe (logada)
-- ---------------------------------------------------------------------
-- Cria (uma vez) o código do link do cardápio desta empresa e devolve
create or replace function public.cardapio_ativar() returns text
language plpgsql security definer set search_path = public as $$
declare v_empresa uuid := public.minha_empresa(); v_codigo text;
begin
  if v_empresa is null then raise exception 'Entre no sistema de novo.'; end if;
  select cardapio_codigo into v_codigo from public.empresas where id = v_empresa;
  if v_codigo is null then
    loop
      v_codigo := lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
      exit when not exists (select 1 from public.empresas where cardapio_codigo = v_codigo);
    end loop;
    update public.empresas set cardapio_codigo = v_codigo where id = v_empresa;
  end if;
  return v_codigo;
end $$;

-- Um computador do restaurante "pega" o pedido para lançar na mesa (só um consegue, mesmo com vários abertos)
create or replace function public.cardapio_aceitar(p_pedido uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  update public.cardapio_pedidos set aceito_em = now(), aceito_por = auth.uid(), atualizado_em = now()
    where id = p_pedido and empresa_id = public.minha_empresa() and aceito_em is null and status = 'NOVO'
    returning true into v_ok;
  return coalesce(v_ok, false);
end $$;

revoke execute on function public.cardapio_publico(text) from public;
revoke execute on function public.cardapio_pedir(text, uuid, jsonb, text, text) from public;
revoke execute on function public.cardapio_meus_pedidos(text, text) from public;
revoke execute on function public.cardapio_chamar(text, uuid, text, text) from public;
grant execute on function public.cardapio_publico(text), public.cardapio_pedir(text, uuid, jsonb, text, text),
  public.cardapio_meus_pedidos(text, text), public.cardapio_chamar(text, uuid, text, text) to anon, authenticated;
revoke execute on function public.cardapio_ativar(), public.cardapio_aceitar(uuid) from public, anon;
grant execute on function public.cardapio_ativar(), public.cardapio_aceitar(uuid) to authenticated;

-- =====================================================================
-- 9. Cardápio mais seguro (chave da mesa no QR Code) e registro excluído não volta
-- =====================================================================
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
