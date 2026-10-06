// Teste do banco: monta supabase/schema.sql num PostgreSQL vazio (PGlite, sem instalar nada além
// do pacote) e confere a separação entre empresas e as proteções.
// Primeira vez: cd testes && npm install · Rodar: node testes/banco.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const db = new PGlite();
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) process.exitCode = 1; };

// O que o Supabase já tem pronto: login (auth), papéis e publicação do tempo real
await db.exec(`create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated; create role anon; create role service_role; create publication supabase_realtime;
  grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`);
const M = '99999999-9999-9999-9999-999999999999', A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222', C = '33333333-3333-3333-3333-333333333333';
await db.exec(`insert into auth.users values ('${M}', 'mateusandrade.brasil@gmail.com'), ('${A}', 'ana@x.com'), ('${B}', 'bia@x.com'), ('${C}', 'caixa@x.com')`);
await db.exec(fs.readFileSync(path.join(PASTA, 'schema.sql'), 'utf8'));

// Duas empresas (A e B), um caixa na A, cadastros e uma venda na B
await db.exec(`grant usage on schema public to service_role; set role service_role;`);
const eA = (await db.query(`select montar_empresa('${A}', 'MGA', 'Ana', 'ana@x.com') id`)).rows[0].id;
const eB = (await db.query(`select montar_empresa('${B}', 'Pizzaria', 'Bia', 'bia@x.com') id`)).rows[0].id;
await db.exec(`reset role; insert into usuarios (id, empresa_id, nome, login, perfil) values ('${C}', '${eA}', 'Caixa', 'caixa@x.com', 'CAIXA');
  insert into categorias (id, empresa_id, nome) values ('aaaaaaaa-0000-0000-0000-00000000000a', '${eA}', 'Lanches'), ('bbbbbbbb-0000-0000-0000-00000000000b', '${eB}', 'Pizzas');
  insert into caixas (id, empresa_id, numero, operador_nome) values ('bbbbbbbb-0000-0000-0000-0000000000c1', '${eB}', 1, 'Bia');
  insert into vendas (id, empresa_id, numero, caixa_id, tipo, operador_nome) values ('bbbbbbbb-0000-0000-0000-0000000000f1', '${eB}', 1, 'bbbbbbbb-0000-0000-0000-0000000000c1', 'BALCAO', 'Bia');
  insert into auditoria (empresa_id, descricao) values ('${eA}', 'Venda cancelada');`);

const como = uid => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
const anonimo = () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
const valor = async sql => (await db.query(sql)).rows[0];
// Comando que deve funcionar (passa) ou ser recusado pelo banco (recusa)
const passa = async (m, sql) => { try { await db.query(sql); ok(true, m); } catch (e) { ok(false, `${m} (recusado: ${e.message})`); } };
const recusa = async (m, sql) => { try { await db.query(sql); ok(false, `${m} (passou!)`); } catch (e) { ok(true, m); } };

// Estrutura
await db.exec('reset role');
ok((await valor(`select count(*)::int n from pg_tables where schemaname = 'public' and rowsecurity`)).n >= 40, 'todas as tabelas com separação por empresa (RLS)');
ok((await valor(`select count(*)::int n from pg_constraint where conname like '%mesma_empresa'`)).n >= 40, 'travas entre empresas criadas');
ok((await valor(`select count(*)::int n from masters`)).n === 1, 'master criado pelo e-mail');

// Ataques entre empresas e de funcionário
await como(A);
await recusa('A não cria produto na categoria da B', `insert into produtos (categoria_id, codigo, nome) values ('bbbbbbbb-0000-0000-0000-00000000000b', '900', 'Sonda')`);
await recusa('A não lança item numa venda da B', `insert into venda_itens (venda_id, nome, quantidade, preco_unitario) values ('bbbbbbbb-0000-0000-0000-0000000000f1', 'Lixo', 1, 1)`);
await recusa('A não abre venda no caixa da B', `insert into vendas (numero, caixa_id, tipo, operador_nome) values (77, 'bbbbbbbb-0000-0000-0000-0000000000c1', 'BALCAO', 'x')`);
ok((await valor(`select count(*)::int n from categorias`)).n === 1, 'A só enxerga a própria categoria');
await como(C);
await recusa('caixa não muda plano nem vencimento da empresa', `update empresas set plano = 'VITALICIO', assinatura_vence_em = '2099-12-31' where id = '${eA}'`);
await passa('caixa altera nome e configurações da empresa', `update empresas set nome = 'MGA Restaurante', config = '{"a":1}' where id = '${eA}'`);
await recusa('caixa não apaga a auditoria', `delete from auditoria`);
await passa('caixa registra auditoria nova', `insert into auditoria (descricao) values ('teste')`);
await recusa('caixa não se promove a administrador', `insert into usuarios (id, empresa_id, nome, login, perfil) values ('${C}', '${eA}', 'x', 'y', 'ADMIN')`);
await anonimo();
await recusa('sem login não chama funções internas', `select public.minha_empresa()`);
await recusa('sem login não lê empresas', `select * from empresas`);

// Uso normal da empresa A
await como(A);
await passa('A cria produto na própria categoria', `insert into produtos (id, categoria_id, codigo, nome, preco) values ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-00000000000a', '001', 'X-Burger', 20)`);
await passa('A abre caixa', `insert into caixas (id, numero, operador_nome) values ('aaaaaaaa-0000-0000-0000-0000000000c1', 1, 'Ana')`);
await passa('A cadastra cliente', `insert into clientes (id, nome) values ('aaaaaaaa-0000-0000-0000-0000000000e1', 'Cliente')`);
await passa('A vende com cliente', `insert into vendas (id, numero, caixa_id, tipo, operador_nome, cliente_id) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 1, 'aaaaaaaa-0000-0000-0000-0000000000c1', 'BALCAO', 'Ana', 'aaaaaaaa-0000-0000-0000-0000000000e1')`);
await passa('A lança item da venda', `insert into venda_itens (venda_id, produto_id, nome, quantidade, preco_unitario) values ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000a1', 'X-Burger', 1, 20)`);
await passa('A exclui o cliente (a venda fica sem cliente)', `delete from clientes where id = 'aaaaaaaa-0000-0000-0000-0000000000e1'`);
ok((await valor(`select cliente_id from vendas where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'`)).cliente_id === null, 'venda ficou sem cliente');
await passa('A exclui a venda (itens saem junto)', `delete from vendas where id = 'aaaaaaaa-0000-0000-0000-0000000000f1'`);
ok((await valor(`select count(*)::int n from venda_itens`)).n === 0, 'itens da venda excluídos');
await como(B);
await passa('B exclui a própria categoria', `delete from categorias where id = 'bbbbbbbb-0000-0000-0000-00000000000b'`);

// Empresa desativada perde o acesso; o master continua entrando
await db.exec(`reset role; update empresas set ativo = false where id = '${eA}'`);
await como(C);
ok((await valor(`select count(*)::int n from categorias`)).n === 0, 'empresa desativada: funcionário não vê nada');
await como(M);
await passa('master entra na empresa desativada (suporte)', `select public.master_entrar('${eA}')`);
ok((await valor(`select count(*)::int n from categorias`)).n === 1, 'master vê os dados da empresa em que entrou');
console.log(process.exitCode ? 'HOUVE FALHAS' : 'TUDO OK');
