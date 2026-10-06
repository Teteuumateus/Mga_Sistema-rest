const fs = require('fs');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Ana', login: 'ana', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y'}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
mem.mga_restConfig = JSON.stringify({nome: 'Teste', impressao: {largura: '58', cupomAuto: true}}); // configuração antiga
eval(fs.readFileSync(require('path').join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALHOU: ') + msg); if (!c) process.exitCode = 1; };
const falha = (fn, msg) => { try { fn(); ok(false, msg + ' (não deu erro)'); } catch (e) { ok(!!e.regra, msg + ': ' + e.message); } };
const prod = n => D.produtos().find(x => x.nome === n);
const din = () => D.formasAtivas().find(f => f.tipo === 'DINHEIRO').id;
const forma = t => D.formasAtivas().find(f => f.tipo === t).id;

ok(D.config().impressao.cupomModo === 'SEMPRE' && !('cupomAuto' in D.config().impressao), 'cupom automático antigo vira "imprimir sempre"');
ok(D.grupos().find(g => g.nome === 'Bebidas').cozinha === false && D.grupos().find(g => g.nome === 'Lanches').cozinha === true, 'Bebidas fora da cozinha; Lanches na cozinha');
ok(!!D.PERFIS.COZINHA && D.PERFIS.COZINHA.modulos.join() === 'cozinha', 'perfil Cozinha só com a fila de produção');

// ---- Fila de produção ----
D.abrirCaixa({valorInicial: '100'});
const v = D.registrarVenda({itens: [{produtoId: prod('X-Bacon').id, quantidade: 2}, {produtoId: prod('Coca-Cola Lata 350ml').id, quantidade: 1}], pagamentos: [{formaId: din(), valor: '60'}]});
let fila = D.filaProducao();
ok(fila.length === 1 && fila[0].itens.length === 1 && fila[0].itens[0].nome === 'X-Bacon', 'balcão finalizado: só o lanche vai para a fila (bebida não)');
D.moverPreparo(v.id, [fila[0].itens[0].id], 'PREPARANDO');
ok(v.itens[0].preparo.estado === 'PREPARANDO' && v.itens[0].preparo.preparandoPor === 'Ana', 'item em preparo, com quem');
D.moverPreparo(v.id, [v.itens[0].id], 'ENTREGUE');
ok(D.filaProducao().length === 0, 'item entregue sai da fila');
// Delivery acompanha a cozinha
const dv = D.registrarDelivery({itens: [{produtoId: prod('X-Tudo').id, quantidade: 1}, {produtoId: prod('Batata Frita').id, quantidade: 1}],
  cliente: {nome: 'Cli', telefone: '11999990000', endereco: 'Rua', numero: '1', bairro: 'Centro'}, taxaEntrega: '5'});
D.moverPreparo(dv.id, [dv.itens[0].id], 'PREPARANDO');
ok(dv.statusDelivery === 'PREPARANDO', 'delivery passa para "Em preparação" quando a cozinha começa');
D.moverPreparo(dv.id, dv.itens.map(i => i.id), 'PRONTO');
ok(dv.statusDelivery === 'PRONTO', 'tudo pronto na cozinha: delivery fica "Pronto"');
D.cancelarVenda(dv.id, 'teste');
ok(!D.filaProducao().some(x => x.venda.id === dv.id), 'pedido cancelado sai da fila');

// ---- Aplicativos e embalagens ----
const ifood = D.salvarAplicativo({nome: 'iFood', comissao: '12'});
falha(() => D.salvarAplicativo({nome: 'X', comissao: '120'}), 'comissão acima de 99%');
const marm = D.salvarEmbalagem({nome: 'Marmita de alumínio', preco: '1,50', produtoIds: [prod('Marmitex Grande').id, prod('Marmitex Pequena').id]});
falha(() => D.salvarEmbalagem({nome: 'Outra', preco: '1', produtoIds: [prod('Marmitex Grande').id]}), 'produto com duas embalagens');
const d2 = D.registrarDelivery({itens: [{produtoId: prod('Marmitex Grande').id, quantidade: 2}, {produtoId: prod('Marmitex Pequena').id, quantidade: 1}, {produtoId: prod('Coca-Cola 2L').id, quantidade: 1}],
  cliente: {nome: 'Cli2', telefone: '11988887777', endereco: 'Rua', numero: '2', bairro: 'Centro'}, taxaEntrega: '5', aplicativoId: ifood.id});
const t2 = D.totaisVenda(d2);
ok(t2.embalagem === 4.5 && t2.total === 26 * 2 + 18 + 14 + 5 + 4.5, `embalagem 3 × 1,50 = 4,50 no total (${t2.total})`);
ok(d2.aplicativo.nome === 'iFood' && d2.aplicativo.comissao === 12, 'pedido guarda o aplicativo e a comissão');
const ent = D.salvarEntregador({nome: 'Zé'});
D.enviarEntregador(ent.id, [d2.id]);
D.entregarPedido(d2.id, {pagamentos: [{formaId: forma('PIX'), valor: String(t2.total)}]});
const rd = D.relatorioDelivery({de: D.hojeISO(), ate: D.hojeISO()});
const linhaApp = rd.porAplicativo.find(x => x.nome === 'iFood');
ok(linhaApp && Math.abs(linhaApp.comissao - t2.total * 0.12) < 0.01, `relatório: comissão do iFood ${linhaApp?.comissao}`);
falha(() => D.excluirAplicativo(ifood.id), 'aplicativo com pedidos não exclui');

// ---- Conferência do caixa por forma ----
D.registrarVenda({itens: [{produtoId: prod('X-Salada').id, quantidade: 1}], pagamentos: [{formaId: forma('DEBITO'), valor: '20'}]});
const r = D.resumoCaixa(D.caixaAberto().id);
ok(r.esperado.DEBITO === 20 && r.esperado.PIX === t2.total, `esperado por forma: débito ${r.esperado.DEBITO}, PIX ${r.esperado.PIX}`);
falha(() => D.fecharCaixa({valorContado: String(r.saldoDinheiro), conferencia: {DEBITO: '15'}}), 'diferença no cartão exige motivo');
const cx = D.fecharCaixa({valorContado: String(r.saldoDinheiro), conferencia: {DEBITO: '15', PIX: String(t2.total)}, obs: 'venda passada duas vezes'});
const deb = cx.conferencia.find(c => c.tipo === 'DEBITO');
ok(cx.conferencia.length === 3 && deb.diferenca === -5, 'fechamento guarda a conferência: débito com falta de R$ 5');

// ---- Impressão ----
D.salvarImpressao({largura: '80', cupomModo: 'PERGUNTAR', comandaAuto: true, viasComanda: 1, rodape: ''});
ok(D.config().impressao.cupomModo === 'PERGUNTAR', 'cupom: perguntar');
