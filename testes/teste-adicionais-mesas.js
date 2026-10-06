const fs = require('fs');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Ana', login: 'ana', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y'}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(require('path').join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALHOU: ') + msg); if (!c) process.exitCode = 1; };
const falha = (fn, msg) => { try { fn(); ok(false, msg + ' (não deu erro)'); } catch (e) { ok(!!e.regra, msg + ': ' + e.message); } };
const g = n => D.grupos().find(x => x.nome === n).id;
const prod = n => D.produtos().find(x => x.nome === n);

// ---- Adicionais e etapas ----
const ponto = D.salvarGrupoAdicional({nome: 'Ponto da carne', min: 1, max: 1, opcoes: [{nome: 'Mal passada'}, {nome: 'Ao ponto'}, {nome: 'Bem passada'}]});
const extras = D.salvarGrupoAdicional({nome: 'Extras', min: 0, max: 2, opcoes: [{nome: 'Bacon', preco: '4,00'}, {nome: 'Cheddar', preco: '3,50'}, {nome: 'Ovo', preco: '2'}]});
falha(() => D.salvarGrupoAdicional({nome: 'X', min: 3, max: 1, opcoes: [{nome: 'a'}]}), 'máximo menor que mínimo');
const burger = prod('Burger Clássico 180g');
D.salvarProduto({...burger, preco: '32,90', gruposAdicionais: [ponto.id, extras.id]}, burger.id);
ok(D.precisaMontar(burger), 'produto com etapa precisa ser montado');
falha(() => D.abrirCaixa({valorInicial: '0'}) && D.registrarVenda({itens: [{produtoId: burger.id, quantidade: 1}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '100'}]}), 'etapa obrigatória sem escolha');
const op = id => [...ponto.opcoes, ...extras.opcoes].find(o => o.nome === id).id;
falha(() => D.registrarVenda({itens: [{produtoId: burger.id, quantidade: 1, adicionais: [op('Ao ponto'), op('Bacon'), op('Cheddar'), op('Ovo')]}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '100'}]}), 'mais extras que o máximo');
ok(D.precoItem(burger, {adicionais: [op('Ao ponto'), op('Bacon'), op('Cheddar')]}) === 40.4, 'preço com adicionais 32,90 + 4 + 3,50 = 40,40');
const v1 = D.registrarVenda({itens: [{produtoId: burger.id, quantidade: 2, adicionais: [op('Ao ponto'), op('Bacon')]}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '100'}]});
const it = v1.itens[0];
ok(it.precoUnitario === 36.9 && it.adicionais.length === 2 && it.adicionais[0].nome === 'Ao ponto', 'item gravado com adicionais e preço 36,90');
ok(D.totaisVenda(v1).total === 73.8, 'total da venda 73,80');

// ---- Tamanhos ----
const suco = prod('Suco Natural de Laranja');
D.salvarProduto({...suco, tamanhos: [{nome: '300 ml', preco: '9'}, {nome: '500 ml', preco: '13,50'}]}, suco.id);
ok(suco.preco === 9 && suco.tamanhos.length === 2, 'preço "a partir de" = menor tamanho');
falha(() => D.registrarVenda({itens: [{produtoId: suco.id, quantidade: 1}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '50'}]}), 'tamanho obrigatório');
const v2 = D.registrarVenda({itens: [{produtoId: suco.id, quantidade: 1, tamanhoId: suco.tamanhos[1].id}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '50'}]});
ok(v2.itens[0].nome === 'Suco Natural de Laranja (500 ml)' && v2.itens[0].precoUnitario === 13.5, 'tamanho no nome e no preço');

// ---- Promoções ----
const agora = new Date(), dia = agora.getDay();
const ini = '00:00', fim = '23:59';
D.salvarPromocao({nome: 'Happy hour', alvo: 'CATEGORIA', ids: [g('Bebidas')], tipo: 'PERCENTUAL', valor: '20', dias: [dia], horaIni: ini, horaFim: fim});
ok(D.precoItem(suco, {tamanhoId: suco.tamanhos[1].id}) === 10.8, '20% na categoria Bebidas: 13,50 → 10,80');
const coca = prod('Coca-Cola Lata 350ml');
D.salvarPromocao({nome: 'Coca por 4', alvo: 'PRODUTO', ids: [coca.id], tipo: 'PRECO', valor: '4'});
ok(D.precoItem(coca) === 4, 'vale a promoção mais barata (R$ 4 contra 20% de 6 = 4,80)');
D.salvarPromocao({nome: 'Amanhã', alvo: 'PRODUTO', ids: [prod('X-Burger').id], tipo: 'PERCENTUAL', valor: '50', dias: [(dia + 1) % 7]});
ok(D.precoItem(prod('X-Burger')) === 18, 'promoção de outro dia não vale hoje');
falha(() => D.salvarPromocao({nome: 'x', alvo: 'CATEGORIA', ids: [g('Bebidas')], tipo: 'PRECO', valor: '3'}), 'preço fixo por categoria não é aceito');
const v3 = D.registrarVenda({itens: [{produtoId: coca.id, quantidade: 1}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '10'}]});
ok(v3.itens[0].promocao === 'Coca por 4' && v3.itens[0].precoTabela === 6, 'venda guarda a promoção aplicada e o preço de tabela');

// ---- Insumos, ficha técnica e produção ----
const ins = (nome, un, custo, est) => D.salvarProduto({nome, tipo: 'INSUMO', grupoId: g('Lanches'), unidade: un, custo, estoque: est, preco: ''});
const pao = ins('Pão de hambúrguer', 'UN', '1,00', '50'), carne = ins('Blend 180g', 'UN', '7,00', '40'), queijo = ins('Queijo prato', 'KG', '40,00', '2');
ok(pao.controlaEstoque && pao.tipo === 'INSUMO', 'insumo controla estoque sozinho');
falha(() => D.registrarVenda({itens: [{produtoId: pao.id, quantidade: 1}], pagamentos: []}), 'insumo não é vendido');
const xb = prod('X-Burger');
D.salvarProduto({...xb, ficha: [{produtoId: pao.id, quantidade: '1'}, {produtoId: carne.id, quantidade: '1'}, {produtoId: queijo.id, quantidade: '0,03'}]}, xb.id);
ok(D.custoProduto(xb) === 9.2, 'custo pela ficha 1 + 7 + 0,03×40 = 9,20');
falha(() => D.salvarProduto({...pao, ficha: [{produtoId: xb.id, quantidade: '1'}]}, pao.id), 'ficha circular bloqueada');
const v4 = D.registrarVenda({itens: [{produtoId: xb.id, quantidade: 3}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '100'}]});
ok(pao.estoque === 47 && carne.estoque === 37 && queijo.estoque === 1.91, 'venda baixa os insumos da ficha (pão 47, carne 37, queijo 1,91)');
ok(v4.itens[0].custoUnitario === 9.2, 'custo do item vem da ficha');
D.cancelarVenda(v4.id, 'teste');
ok(pao.estoque === 50 && queijo.estoque === 2, 'cancelamento devolve os insumos');
falha(() => D.excluirProduto(pao.id), 'insumo em ficha não pode ser excluído');
// Produção de molho (produto controlado com ficha)
const tomate = ins('Tomate', 'KG', '6,00', '10');
const molho = D.salvarProduto({nome: 'Molho de tomate', tipo: 'INSUMO', grupoId: g('Lanches'), unidade: 'L', estoque: '0', ficha: [{produtoId: tomate.id, quantidade: '2'}]});
D.produzir({produtoId: molho.id, quantidade: '3'});
ok(molho.estoque === 3 && tomate.estoque === 4 && molho.custo === 12, 'produção: 3 L de molho usam 6 kg de tomate, custo 12/L');
falha(() => D.produzir({produtoId: molho.id, quantidade: '5'}), 'produção sem insumo suficiente');

// ---- Compra com vários itens e zerar estoque ----
const forn = D.salvarFornecedor({nome: 'Atacadão'});
const r = D.compraEstoque({fornecedorId: forn.id, documento: 'NF 10', itens: [{produtoId: pao.id, quantidade: '100', custo: '1,20'}, {produtoId: carne.id, quantidade: '20', custo: '8'}], conta: {vencimento: D.hojeISO()}});
ok(r.total === 280 && pao.estoque === 150 && D.contas().some(c => c.valor === 280 && c.fornecedorId === forn.id), 'compra de 2 itens: estoque e uma conta de R$ 280');
falha(() => D.compraEstoque({itens: [{produtoId: pao.id, quantidade: '1'}, {produtoId: pao.id, quantidade: '2'}]}), 'produto repetido na compra');
const n = D.zerarEstoque({motivo: 'Inventário anual'});
ok(n >= 4 && pao.estoque === 0 && tomate.estoque === 0, `zerar estoque (${n} produtos)`);

// ---- Editar item: preço e desconto ----
const vm = D.novaVenda({tipo: 'MESA', mesaId: D.mesas()[0].id});
const im = D.adicionarItem(vm.id, prod('Picanha na Chapa').id, {quantidade: 1});
D.alterarItem(vm.id, im.id, {precoUnitario: '90,00', desconto: '5'});
ok(im.precoUnitario === 90 && im.desconto === 5 && D.auditoria().some(a => a.descricao.includes('item "Picanha na Chapa" alterado')), 'item da mesa: preço e desconto alterados e auditados');
falha(() => D.alterarItem(vm.id, im.id, {desconto: '200'}), 'desconto maior que o item');
