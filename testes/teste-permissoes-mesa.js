// Garçom na mesa: lança itens e pede a conta, mas não muda preço, não dá desconto e não tira/cancela o que já foi para a cozinha
const fs = require('fs'), path = require('path');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Admin', login: 'admin', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y', modulos: []},
  {id: 'g1', nome: 'Garçom', login: 'garcom', perfil: 'GARCOM', ativo: true, hash: 'x', sal: 'y', modulos: ['mesas']}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(path.join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { if (!c) { console.log('FALHOU:', msg); process.exitCode = 1; } else console.log('ok -', msg); };
const falha = fn => { try { fn(); return ''; } catch (e) { return e.message; } };
D.abrirCaixa({valorInicial: '50'});
mem.mga_sessao = JSON.stringify({usuarioId: 'g1'});
const p = D.produtos().find(x => x.ativo && !x.tamanhos?.length && !(x.gruposAdicionais || []).length && x.tipo !== 'INSUMO' && D.grupoPorId(x.grupoId)?.cozinha !== false);
const v = D.novaVenda({tipo: 'MESA', mesaId: D.mesas()[0].id});
const i1 = D.adicionarItem(v.id, p.id, {quantidade: 1}), i2 = D.adicionarItem(v.id, p.id, {quantidade: 1});
ok(v.itens.length === 2, 'garçom lança itens na mesa');
ok(!falha(() => D.alterarItem(v.id, i1.id, {quantidade: 2, observacao: 'sem sal', precoUnitario: i1.precoUnitario, desconto: ''})), 'garçom muda quantidade e observação');
ok(/caixa ou o gerente/.test(falha(() => D.alterarItem(v.id, i1.id, {precoUnitario: '1,00'}))), 'garçom não muda o preço');
ok(/caixa ou o gerente/.test(falha(() => D.alterarItem(v.id, i1.id, {desconto: '5'}))), 'garçom não dá desconto');
ok(!falha(() => D.removerItem(v.id, i2.id)), 'garçom tira item que ainda não foi para a cozinha');
D.vendaPorId(v.id).itens[0].impressoEm = new Date().toISOString();
ok(/cozinha/.test(falha(() => D.removerItem(v.id, i1.id))), 'garçom não tira item que já foi para a cozinha');
ok(/cozinha/.test(falha(() => D.cancelarVenda(v.id, 'teste do garçom'))), 'garçom não cancela mesa com pedido na cozinha');
ok(!falha(() => D.pedirConta(v.id, true)), 'garçom pede a conta');
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
ok(!falha(() => D.alterarItem(v.id, i1.id, {precoUnitario: '1,00'})), 'administrador muda o preço');
