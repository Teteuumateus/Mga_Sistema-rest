const fs = require('fs');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Ana Caixa', login: 'ana', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y'}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(require('path').join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALHOU: ') + msg); if (!c) process.exitCode = 1; };
const hoje = D.hojeISO();
const prod = n => D.produtos().find(p => p.nome === n);
D.salvarProduto({...prod('X-Burger'), custo: '8,00'}, prod('X-Burger').id);
D.abrirCaixa({valorInicial: '100'});
const f = tipo => D.formasAtivas().find(x => x.tipo === tipo).id;
D.registrarVenda({itens: [{produtoId: prod('X-Burger').id, quantidade: 2}, {produtoId: prod('Batata Frita').id, quantidade: 1}], desconto: '4', pagamentos: [{formaId: f('PIX'), valor: '60'}]}); // 36+28-4 = 60
D.registrarVenda({itens: [{produtoId: prod('X-Burger').id, quantidade: 1}], pagamentos: [{formaId: f('DINHEIRO'), valor: '50'}]}); // 18, troco 32
const c = D.registrarVenda({itens: [{produtoId: prod('Pudim de Leite').id, quantidade: 1}], pagamentos: [{formaId: f('DINHEIRO'), valor: '12'}]});
D.cancelarVenda(c.id, 'teste');
const per = {de: hoje, ate: hoje};
const rv = D.relatorioVendas(per);
ok(rv.n === 2 && rv.total === 78 && rv.ticket === 39, `vendas: n=${rv.n} total=${rv.total} ticket=${rv.ticket}`);
ok(rv.descontos === 4 && rv.canceladas.n === 1 && rv.canceladas.valor === 12, 'descontos 4, 1 cancelada de 12');
ok(rv.porForma.find(x => x.nome === 'PIX').valor === 60 && rv.porForma.find(x => x.nome === 'Dinheiro').valor === 18, 'por forma: PIX 60, Dinheiro 18 (cancelada e troco não contam) → ' + JSON.stringify(rv.porForma));
ok(rv.porOperador[0].nome === 'Ana Caixa' && rv.porOperador[0].valor === 78, 'por operador');
ok(rv.porHora.reduce((s, h) => s + h.valor, 0) === 78 && rv.porDia.length === 1, 'por hora/dia somam o total');
const rp = D.relatorioProdutos(per);
const xb = rp.lista.find(x => x.nome === 'X-Burger');
ok(xb.qtd === 3 && xb.valor === 54 && xb.custo === 24 && xb.lucro === 30, 'X-Burger: 3 un, R$54, custo 24, lucro 30');
ok(rp.lista.find(x => x.nome === 'Batata Frita').semCusto && rp.semCusto === 1, 'produto sem custo marcado');
ok(rp.lista[0].curva === 'A' && rp.total === 82, 'curva ABC e total de itens 82 (desconto da venda fica fora)');
const rc = D.relatorioCaixa(per);
ok(rc.lista.length === 1 && rc.vendas === 78 && rc.lista[0].esperado === 118, `caixa: vendas 78, dinheiro esperado 100+18 = ${rc.lista[0].esperado}`);
// anterior
const pa = D.periodoAnterior('2026-10-01', '2026-10-31');
ok(pa.de === '2026-08-31' && pa.ate === '2026-09-30', 'período anterior de 31 dias: ' + JSON.stringify(pa));
// delivery
const dv = D.registrarDelivery({itens: [{produtoId: prod('X-Bacon').id, quantidade: 1}], cliente: {nome: 'Cli', telefone: '11999998888', endereco: 'Rua A', numero: '1', bairro: 'Centro'}, taxaEntrega: '5'});
const ent = D.salvarEntregador({nome: 'Zé Moto'});
D.enviarEntregador(ent.id, [dv.id]);
D.entregarPedido(dv.id, {pagamentos: [{formaId: f('PIX'), valor: '29'}]});
const rd = D.relatorioDelivery(per);
ok(rd.n === 1 && rd.total === 29 && rd.taxas === 5 && rd.porEntregador[0].nome === 'Zé Moto' && rd.porBairro[0].nome === 'Centro' && rd.tempoMedio === 0, 'delivery: 1 pedido, R$29, taxa 5, entregador e bairro');
// demo: desempenho
D.gerarDemonstracao();
const t0 = Date.now();
const ano = {de: (new Date().getFullYear() - 1) + '-01-01', ate: hoje};
const a = D.relatorioVendas(ano), b = D.relatorioProdutos(ano), cc = D.relatorioCaixa(ano), d = D.relatorioDelivery(ano);
ok(true, `demo: ${a.n} vendas, ${b.lista.length} produtos, ${cc.lista.length} caixas, ${d.n} deliveries em ${Date.now() - t0} ms`);
