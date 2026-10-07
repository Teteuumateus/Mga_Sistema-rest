// Cardápio digital no sistema: visibilidade e ordem dos produtos, lançar pedido na conta da mesa e desfazer se falhar
const fs = require('fs'), path = require('path');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Admin Teste', login: 'admin', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y', modulos: []}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(path.join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { if (!c) { console.log('FALHOU:', msg); process.exitCode = 1; } else console.log('ok -', msg); };
const p = n => D.produtos().find(x => x.nome === n);

// Visibilidade e ordem
const burger = p('Burger Clássico 180g'), coca = p('Coca-Cola Lata 350ml');
ok(D.noCardapio(burger), 'produto de venda ativo aparece no cardápio por padrão');
D.mostrarNoCardapio(burger.id, false);
ok(!D.noCardapio(D.produtoPorId(burger.id)), 'desmarcado: sai do cardápio (continua cadastrado)');
D.mostrarNoCardapio(burger.id, true);
const insumo = D.produtos().find(x => x.tipo === 'INSUMO');
if (insumo) { let erro = ''; try { D.mostrarNoCardapio(insumo.id, true); } catch (e) { erro = e.message; } ok(/Insumo/.test(erro), 'insumo não entra no cardápio'); }
const doGrupo = D.produtosDoGrupo(coca.grupoId).map(x => x.id);
D.ordenarCardapio([...doGrupo].reverse());
ok(D.produtoPorId(doGrupo[doGrupo.length - 1]).ordemCardapio === 1, 'ordem dos produtos gravada');
const gs = D.grupos().map(g => g.id);
D.ordenarCategorias([gs[1], gs[0], ...gs.slice(2)]);
ok(D.grupoPorId(gs[1]).ordem === 1 && D.grupoPorId(gs[0]).ordem === 2, 'ordem das categorias gravada');
D.configurarCardapio({ativo: true, mensagem: 'Cozinha até 23h'});
ok(D.config().cardapio.ativo && D.config().cardapio.mensagem === 'Cozinha até 23h', 'cardápio aberto com recado');
const ed = D.editarNoCardapio(coca.id, {nome: 'Coca-Cola Lata', descricao: 'Gelada', preco: '6,50', foto: ''});
ok(ed.nome === 'Coca-Cola Lata' && ed.preco === 6.5 && ed.descricao === 'Gelada', 'edição rápida: nome, preço e descrição');

// Lançar pedido do cardápio na mesa (abre a mesa)
D.abrirCaixa({valorInicial: '100'});
const mesa = D.mesas()[4];
const ponto = burger.gruposAdicionais?.length ? null : D.salvarGrupoAdicional({nome: 'Ponto', min: 1, max: 1, opcoes: [{nome: 'Ao ponto'}, {nome: 'Bem passada'}]});
if (ponto) D.salvarProduto({...D.produtoPorId(burger.id), gruposAdicionais: [ponto.id], estoque: '', estoqueAberto: ''}, burger.id);
const g = D.grupoAdicionalPorId(D.produtoPorId(burger.id).gruposAdicionais[0]);
const pedido = {numero: 7, mesaId: mesa.id, mesaNumero: mesa.numero, obs: 'sem cebola',
  itens: [{produtoId: burger.id, nome: burger.nome, quantidade: 2, adicionais: [{id: g.opcoes[0].id, nome: g.opcoes[0].nome}], observacao: ''},
          {produtoId: coca.id, nome: 'Coca', quantidade: 1, adicionais: [], observacao: 'com gelo'}]};
const v = D.lancarPedidoCardapio(pedido);
ok(v.tipo === 'MESA' && v.mesaId === mesa.id && v.status === 'ABERTA', 'pedido abre a conta da mesa');
ok(v.itens.length === 2 && v.itens.every(i => i.cardapio === 7), 'itens lançados e marcados com o pedido #7');
ok(v.itens[0].observacao.includes('Pedido: sem cebola') && v.itens[1].observacao === 'com gelo', 'observação do pedido vai no primeiro item');
ok(v.itens[0].preparo && v.itens[0].preparo.estado === 'FILA', 'lanche vai para a fila da cozinha');
const v2 = D.lancarPedidoCardapio({...pedido, numero: 8, itens: [pedido.itens[1]]});
ok(v2.id === v.id && v.itens.length === 3, 'segundo pedido da mesma mesa entra na mesma conta');

// Item inválido: desfaz o que já tinha entrado e não deixa mesa vazia aberta
const mesa2 = D.mesas()[6];
let erro = '';
try { D.lancarPedidoCardapio({numero: 9, mesaId: mesa2.id, mesaNumero: mesa2.numero, itens: [pedido.itens[1], {produtoId: burger.id, nome: burger.nome, quantidade: 1, adicionais: []}]}); }
catch (e) { erro = e.message; }
ok(/Ponto/.test(erro), 'falta escolher a etapa obrigatória: erro claro (' + erro + ')');
ok(!D.vendaDaMesa(mesa2.id), 'mesa que não tinha conta não fica aberta vazia');
ok(D.auditoria().some(a => /Pedido #7 do cardápio lançado na mesa/.test(a.descricao)), 'auditoria registra o pedido lançado');

// Sem módulo Mesas não lança
const cz = {id: 'c1', nome: 'Cozinha', login: 'coz', perfil: 'COZINHA', ativo: true, hash: 'x', sal: 'y', modulos: ['cozinha']};
D.substituirCadastros({usuarios: [...D.usuarios(), cz]}); mem.mga_sessao = JSON.stringify({usuarioId: 'c1'});
let bloq = false; try { D.lancarPedidoCardapio({...pedido, numero: 10}); } catch (e) { bloq = true; }
ok(bloq, 'usuário da cozinha não lança pedido na mesa');

// Lançar de novo o mesmo pedido não duplica; preço é o que o cliente viu (ou menor)
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
const mesa3 = D.mesas()[8];
const cocaPreco = D.produtoPorId(coca.id).preco;
const ped = {numero: 20, mesaId: mesa3.id, mesaNumero: mesa3.numero, obs: '', itens: [{produtoId: coca.id, nome: 'Coca', quantidade: 2, adicionais: [], observacao: '', preco: cocaPreco - 1}]};
const va = D.lancarPedidoCardapio(ped);
const vb = D.lancarPedidoCardapio(ped);
ok(va.id === vb.id && va.itens.filter(i => i.cardapio === 20).length === 1, 'lançar o mesmo pedido de novo não duplica os itens');
ok(va.itens.find(i => i.cardapio === 20).precoUnitario === cocaPreco - 1, 'cobra o preço que o cliente viu no cardápio (menor que o do sistema)');
const ped2 = {...ped, numero: 21, itens: [{...ped.itens[0], preco: cocaPreco + 5}]};
const vc = D.lancarPedidoCardapio(ped2);
ok(vc.itens.find(i => i.cardapio === 21).precoUnitario === cocaPreco, 'se o sistema estiver mais barato (promoção), cobra o menor');
