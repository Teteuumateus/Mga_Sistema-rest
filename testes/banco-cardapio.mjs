// Teste do banco do cardápio digital: monta supabase/schema.sql
// num PostgreSQL de teste e confere o que o cliente sem login consegue (e não consegue) fazer.
// Primeira vez: cd testes && npm install · Rodar: node testes/banco-cardapio.mjs
import {PGlite} from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
const PASTA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const db = new PGlite();
const ok = (c, m) => { console.log((c ? 'ok - ' : 'FALHOU: ') + m); if (!c) process.exitCode = 1; };

await db.exec(`create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role authenticated; create role anon; create role service_role; create publication supabase_realtime;
  grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon; grant usage on schema public to anon;`);
const M = '99999999-9999-9999-9999-999999999999', A = '11111111-1111-1111-1111-111111111111', B = '22222222-2222-2222-2222-222222222222';
await db.exec(`insert into auth.users values ('${M}', 'mateusandrade.brasil@gmail.com'), ('${A}', 'ana@x.com'), ('${B}', 'bia@x.com')`);
const schema = fs.readFileSync(path.join(PASTA, 'schema.sql'), 'utf8');
await db.exec(schema);
// Migração ainda separada (antes de entrar no schema.sql)
const mig09 = path.join(PASTA, 'migracao-09-seguranca.sql');
if (!schema.includes('barrar_excluido') && fs.existsSync(mig09)) await db.exec(fs.readFileSync(mig09, 'utf8'));
await db.exec(`grant usage on schema public to anon;`);

// Empresa A com cardápio aberto; empresa B
await db.exec(`grant usage on schema public to service_role; set role service_role;`);
const eA = (await db.query(`select montar_empresa('${A}', 'MGA', 'Ana', 'ana@x.com') id`)).rows[0].id;
const eB = (await db.query(`select montar_empresa('${B}', 'Pizzaria', 'Bia', 'bia@x.com') id`)).rows[0].id;
const ids = {cat: 'aaaaaaaa-0000-0000-0000-00000000000a', burger: 'aaaaaaaa-0000-0000-0000-0000000000b1', suco: 'aaaaaaaa-0000-0000-0000-0000000000b2',
  oculto: 'aaaaaaaa-0000-0000-0000-0000000000b3', insumo: 'aaaaaaaa-0000-0000-0000-0000000000b4', tamP: 'aaaaaaaa-0000-0000-0000-0000000000c1', tamG: 'aaaaaaaa-0000-0000-0000-0000000000c2',
  grupo: 'aaaaaaaa-0000-0000-0000-0000000000d1', bacon: 'aaaaaaaa-0000-0000-0000-0000000000d2', mesa5: 'aaaaaaaa-0000-0000-0000-0000000000e5', mesaB: 'bbbbbbbb-0000-0000-0000-0000000000e1'};
await db.exec(`reset role;
  insert into categorias (id, empresa_id, nome, ordem) values ('${ids.cat}', '${eA}', 'Lanches', 1);
  insert into produtos (id, empresa_id, categoria_id, codigo, nome, preco, custo, descricao) values
    ('${ids.burger}', '${eA}', '${ids.cat}', '001', 'X-Burger', 25, 9, 'Pão e carne'),
    ('${ids.suco}', '${eA}', '${ids.cat}', '002', 'Suco', 8, 2, null),
    ('${ids.oculto}', '${eA}', '${ids.cat}', '003', 'Fora do cardápio', 10, 1, null),
    ('${ids.insumo}', '${eA}', '${ids.cat}', '004', 'Farinha', 0, 4, null);
  update produtos set extra = '{"cardapio": false}' where id = '${ids.oculto}';
  update produtos set tipo = 'INSUMO' where id = '${ids.insumo}';
  insert into produto_tamanhos (id, empresa_id, produto_id, nome, preco, ordem) values ('${ids.tamP}', '${eA}', '${ids.suco}', '300 ml', 8, 0), ('${ids.tamG}', '${eA}', '${ids.suco}', '500 ml', 11, 1);
  insert into grupos_adicionais (id, empresa_id, nome, minimo, maximo) values ('${ids.grupo}', '${eA}', 'Extras', 0, 2);
  insert into adicionais_opcoes (id, empresa_id, grupo_id, nome, preco, ordem) values ('${ids.bacon}', '${eA}', '${ids.grupo}', 'Bacon', 4, 0);
  insert into produto_grupos_adicionais (empresa_id, produto_id, grupo_id) values ('${eA}', '${ids.burger}', '${ids.grupo}');
  insert into mesas (id, empresa_id, numero) values ('${ids.mesa5}', '${eA}', '50'), ('${ids.mesaB}', '${eB}', '51');`);

const como = uid => db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
const anonimo = () => db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
const um = async (sql, p) => (await db.query(sql, p)).rows[0];
const falha = async sql => { try { await db.query(sql); return null; } catch (e) { return e.message; } };
const TOKEN = 'celular-do-cliente-0001', TOKEN2 = 'celular-do-cliente-0002';
const itens = js => JSON.stringify(js).replace(/'/g, "''");

// 1. Equipe cria o código do link; cardápio fechado ainda
await como(A);
const codigo = (await um(`select public.cardapio_ativar() c`)).c;
ok(/^[a-f0-9]{10}$/.test(codigo), 'código do link criado: ' + codigo);
ok((await um(`select public.cardapio_ativar() c`)).c === codigo, 'chamar de novo devolve o mesmo código');
await anonimo();
const pub = (await um(`select public.cardapio_publico('${codigo}') j`)).j;
ok(pub.empresa.nome === 'MGA' && pub.empresa.aberto === false, 'cliente abre o cardápio (ainda fechado para pedidos)');
ok(pub.produtos.map(p => p.nome).join(',') === 'Suco,X-Burger', 'só produtos de venda, ativos e visíveis no cardápio');
ok(!JSON.stringify(pub).includes('custo') && !JSON.stringify(pub).includes('"9"'), 'cardápio público não mostra custo');
ok(pub.produtos.find(p => p.nome === 'Suco').tamanhos.length === 2 && pub.adicionais[0].opcoes[0].nome === 'Bacon', 'tamanhos e adicionais no cardápio');
ok(pub.mesas.some(m => m.numero === '50') && !pub.mesas.some(m => m.id === ids.mesaB), 'mesas desta empresa (e nenhuma da outra)');
ok(/não está recebendo pedidos/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '[{"produtoId":"${ids.burger}","quantidade":1}]', '', '${TOKEN}')`)), 'cardápio fechado recusa pedido');
ok(/não encontrado/.test(await falha(`select public.cardapio_publico('codigoerrado')`)), 'código errado: cardápio não encontrado');
ok(/permission denied/.test(await falha(`select * from cardapio_pedidos`)), 'cliente não lê a tabela de pedidos');
ok(/permission denied/.test(await falha(`select * from produtos`)), 'cliente não lê a tabela de produtos');

// 2. Abre o cardápio e faz um pedido (preço vem do cadastro, não do celular)
await db.exec(`reset role; update empresas set config = config || '{"cardapio": {"ativo": true}}' where id = '${eA}'`);
await anonimo();
const ped = (await um(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([
  {produtoId: ids.burger, quantidade: 2, adicionais: [ids.bacon], observacao: 'sem cebola', preco: 0.01},
  {produtoId: ids.suco, quantidade: 1, tamanhoId: ids.tamG}])}', 'Capricha', '${TOKEN}') j`)).j;
ok(ped.numero === 1 && ped.mesa === '50' && Number(ped.total) === (25 + 4) * 2 + 11, 'pedido #1 da mesa 50: total R$ 69 calculado pelo banco (' + ped.total + ')');
ok(/Aguarde/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([{produtoId: ids.suco, quantidade: 1, tamanhoId: ids.tamP}])}', '', '${TOKEN}')`)), 'dois pedidos seguidos do mesmo celular: pede para aguardar');
const ped2 = (await um(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([{produtoId: ids.suco, quantidade: 1, tamanhoId: ids.tamP}])}', '', '${TOKEN2}') j`)).j;
ok(ped2.numero === 2, 'outro celular na mesma mesa: pedido #2');
ok(/não está mais disponível/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([{produtoId: ids.oculto, quantidade: 1}])}', '', 'celular-3-xxxxxxxxxxxx')`)), 'produto fora do cardápio é recusado');
ok(/Escolha o tamanho/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([{produtoId: ids.suco, quantidade: 1}])}', '', 'celular-4-xxxxxxxxxxxx')`)), 'produto com tamanho exige o tamanho');
ok(/Mesa não encontrada/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesaB}', '${itens([{produtoId: ids.burger, quantidade: 1}])}', '', 'celular-5-xxxxxxxxxxxx')`)), 'mesa de outra empresa é recusada');
ok(/Quantidade inválida/.test(await falha(`select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens([{produtoId: ids.burger, quantidade: 500}])}', '', 'celular-6-xxxxxxxxxxxx')`)), 'quantidade absurda é recusada');
const meus = (await um(`select public.cardapio_meus_pedidos('${codigo}', '${TOKEN}') j`)).j;
ok(meus.length === 1 && meus[0].status === 'NOVO' && meus[0].itens[0].adicionais[0].nome === 'Bacon', 'cliente vê só os próprios pedidos e o status');

// 3. Chamar garçom e pedir a conta
const g1 = (await um(`select public.cardapio_chamar('${codigo}', '${ids.mesa5}', 'GARCOM', '${TOKEN}') j`)).j;
const g2 = (await um(`select public.cardapio_chamar('${codigo}', '${ids.mesa5}', 'GARCOM', '${TOKEN}') j`)).j;
ok(g1.mesa === '50' && g2.repetido && g2.id === g1.id, 'chamar o garçom duas vezes não duplica');
const conta = (await um(`select public.cardapio_chamar('${codigo}', '${ids.mesa5}', 'CONTA', '${TOKEN}') j`)).j;
ok(Number(conta.total) === 69 + 8, 'pedir a conta soma os pedidos da mesa: R$ 77');

// 4. Equipe: vê pedidos e chamados, pega o pedido (um computador só), muda status
await como(A);
ok((await um(`select count(*)::int n from cardapio_pedidos`)).n === 2 && (await um(`select count(*)::int n from cardapio_chamados`)).n === 2, 'equipe vê os 2 pedidos e os 2 chamados');
ok((await um(`select public.cardapio_aceitar('${ped.id}') a`)).a === true, 'primeiro computador pega o pedido');
ok((await um(`select public.cardapio_aceitar('${ped.id}') a`)).a === false, 'segundo computador não pega o mesmo pedido');
await db.query(`update cardapio_pedidos set status = 'PREPARANDO' where id = '${ped.id}'`);
await db.query(`update cardapio_chamados set status = 'ATENDIDO' where tipo = 'GARCOM'`);
await anonimo();
ok((await um(`select public.cardapio_meus_pedidos('${codigo}', '${TOKEN}') j`)).j[0].status === 'PREPARANDO', 'cliente vê o pedido "em preparação"');
await como(B);
ok((await um(`select count(*)::int n from cardapio_pedidos`)).n === 0, 'outra empresa não vê os pedidos');
ok((await um(`select public.cardapio_aceitar('${ped2.id}') a`)).a === false, 'outra empresa não pega o pedido');
// Empresa desativada: link para de funcionar
await db.exec(`reset role; update empresas set ativo = false where id = '${eA}'`);
await anonimo();
ok(/não encontrado/.test(await falha(`select public.cardapio_publico('${codigo}')`)), 'empresa desativada: link do cardápio para');

// ---- Migração 09: chave da mesa, adicionais conferidos, erros claros e registro apagado não volta ----
await db.exec(`reset role; update empresas set ativo = true, config = config || '{"cardapio": {"ativo": true}}' where id = '${eA}'`);
await db.exec(`reset role; insert into grupos_adicionais (id, empresa_id, nome, minimo, maximo) values ('aaaaaaaa-0000-0000-0000-0000000000d3', '${eA}', 'Ponto', 1, 1);
  insert into adicionais_opcoes (id, empresa_id, grupo_id, nome, preco, ordem) values ('aaaaaaaa-0000-0000-0000-0000000000d4', '${eA}', 'aaaaaaaa-0000-0000-0000-0000000000d3', 'Ao ponto', 0, 0),
    ('aaaaaaaa-0000-0000-0000-0000000000d5', '${eA}', '${ids.grupo}', 'Ovo', 2, 1);
  insert into produto_grupos_adicionais (empresa_id, produto_id, grupo_id) values ('${eA}', '${ids.burger}', 'aaaaaaaa-0000-0000-0000-0000000000d3');`);
const chave = (await um(`select cardapio_chave c from mesas where id = '${ids.mesa5}'`)).c;
ok(/^[a-f0-9]{12}$/.test(chave), 'cada mesa tem chave secreta');
await anonimo();
ok(!JSON.stringify((await um(`select public.cardapio_publico('${codigo}') j`)).j).includes(chave), 'cardápio público não mostra a chave das mesas');
const ponto = 'aaaaaaaa-0000-0000-0000-0000000000d4', ovo = 'aaaaaaaa-0000-0000-0000-0000000000d5';
const pedir = (its, tok, ch) => `select public.cardapio_pedir('${codigo}', '${ids.mesa5}', '${itens(its)}', '', '${tok}'${ch === undefined ? '' : `, '${ch}'`}) j`;
const comQr = (await um(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ponto, ids.bacon]}], 'cel-09-aaaaaaaaaaaaa', chave))).j;
ok(comQr.confirmar === false && Number(comQr.total) === 29, 'pedido pelo QR da mesa (com a chave): entra direto, total R$ 29');
const semQr = (await um(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ponto]}], 'cel-09-bbbbbbbbbbbbb'))).j;
ok(semQr.confirmar === true, 'pedido pelo link geral (sem a chave): equipe confirma antes');
ok((await um(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ponto]}], 'cel-09-ccccccccccccc', 'chaveerrada'))).j.confirmar === true, 'chave errada: equipe confirma antes');
ok(/Adicionais demais/.test(await falha(pedir([{produtoId: ids.burger, quantidade: 50, adicionais: Array(3000).fill(ids.bacon)}], 'cel-09-ddddddddddddd', chave))), '3.000 adicionais: recusado');
ok(/Adicional inválido/.test(await falha(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ponto, ids.bacon, ids.bacon]}], 'cel-09-eeeeeeeeeeeee', chave))), 'adicional repetido: recusado');
await db.exec(`reset role; update grupos_adicionais set maximo = 1 where id = '${ids.grupo}'`); await anonimo();
ok(/no máximo 1/.test(await falha(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ponto, ids.bacon, ovo]}], 'cel-09-ggggggggggggg', chave))), 'mais extras que o máximo do grupo: recusado');
ok(/Ponto: escolha 1/.test(await falha(pedir([{produtoId: ids.burger, quantidade: 1, adicionais: [ids.bacon]}], 'cel-09-hhhhhhhhhhhhh', chave))), 'etapa obrigatória sem escolha: recusado');
const msgUuid = await falha(pedir([{produtoId: 'nao-e-uuid', quantidade: 1}], 'cel-09-iiiiiiiiiiiii', chave));
ok(/não está mais disponível/.test(msgUuid) && !/uuid/.test(msgUuid), 'código inválido: mensagem clara, sem erro técnico');
ok(/Pedido inválido/.test(await falha(`select public.cardapio_chamar('${codigo}', '${ids.mesa5}', null, 'cel-09-jjjjjjjjjjjjj')`)), 'chamado sem tipo: mensagem clara');
await db.exec(`reset role; update grupos_adicionais set maximo = 2 where id = '${ids.grupo}'`);
// Registro apagado não volta
await como(A);
await db.query(`delete from produtos where id = '${ids.suco}'`);
await db.query(`insert into produtos (id, categoria_id, codigo, nome, preco) values ('${ids.suco}', '${ids.cat}', '002', 'Suco', 8) on conflict (id) do update set nome = excluded.nome`);
ok((await um(`select count(*)::int n from produtos where id = '${ids.suco}'`)).n === 0, 'produto excluído não é recriado por um navegador com dados antigos');
await db.query(`insert into produtos (categoria_id, codigo, nome, preco) values ('${ids.cat}', '090', 'Suco novo', 8)`);
ok((await um(`select count(*)::int n from produtos where nome = 'Suco novo'`)).n === 1, 'produto novo (outro id) entra normalmente');
await anonimo();
ok(/permission denied/.test(await falha(`select * from registros_excluidos`)), 'registro de exclusões não é visível de fora');
console.log(process.exitCode ? 'HOUVE FALHAS' : 'TUDO OK');
