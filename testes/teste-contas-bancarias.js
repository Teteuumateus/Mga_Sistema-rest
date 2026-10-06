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
const prod = n => D.produtos().find(x => x.nome === n);
const hoje = D.hojeISO();

// ---- Contas bancárias e extrato ----
const bb = D.salvarContaBancaria({nome: 'Banco do Brasil', tipo: 'BANCO', saldoInicial: '1.000,00'});
const cofre = D.salvarContaBancaria({nome: 'Cofre', tipo: 'CAIXA', saldoInicial: '0'});
D.lancamentoConta({contaId: bb.id, tipo: 'SAIDA', valor: '12,90', descricao: 'Tarifa bancária', data: hoje});
ok(D.saldoConta(bb.id) === 987.1, 'saldo: 1.000 − tarifa 12,90 = 987,10');
D.transferirEntreContas({origemId: bb.id, destinoId: cofre.id, valor: '200', data: hoje});
ok(D.saldoConta(bb.id) === 787.1 && D.saldoConta(cofre.id) === 200, 'transferência de 200 do banco para o cofre');
const conta = D.salvarConta({tipo: 'PAGAR', descricao: 'Conta de luz', categoria: 'Energia', valor: '300', vencimento: hoje});
D.baixarConta(conta.id, {data: hoje, forma: 'PIX', contaBancariaId: bb.id});
ok(D.saldoConta(bb.id) === 487.1, 'conta de luz paga pelo banco: saldo 487,10');
falha(() => D.excluirMovConta(D.movConta().find(m => m.origem === 'BAIXA').id), 'lançamento de baixa não se exclui pelo extrato');
D.estornarBaixa(conta.id);
ok(D.saldoConta(bb.id) === 787.1, 'estorno da baixa devolve ao saldo');
falha(() => D.baixarConta(conta.id, {data: hoje, forma: 'PIX', noCaixa: true, contaBancariaId: bb.id}), 'caixa e conta ao mesmo tempo');
D.abrirCaixa({valorInicial: '500'});
D.movimentarCaixa('SANGRIA', {valor: '300', motivo: 'Depósito', contaBancariaId: cofre.id});
ok(D.saldoConta(cofre.id) === 500 && D.resumoCaixa(D.caixaAberto().id).saldoDinheiro === 200, 'sangria de 300 vai para o cofre (500) e sai da gaveta (200)');
const tf = D.movConta().find(m => m.origem === 'TRANSFERENCIA');
D.excluirMovConta(tf.id);
ok(D.saldoConta(bb.id) === 987.1 && D.saldoConta(cofre.id) === 300, 'excluir transferência tira as duas pontas');
falha(() => D.excluirContaBancaria(bb.id), 'conta com movimento não exclui');

// ---- Relatório financeiro (DRE) ----
const xb = prod('X-Burger');
D.salvarProduto({...xb, custo: '8'}, xb.id);
const din = D.formasAtivas().find(f => f.tipo === 'DINHEIRO').id;
D.registrarVenda({itens: [{produtoId: xb.id, quantidade: 10}], pagamentos: [{formaId: din, valor: '180'}]}); // receita 180, CMV 80
D.salvarConta({tipo: 'PAGAR', descricao: 'Aluguel', categoria: 'Aluguel', valor: '50', vencimento: hoje});
D.salvarConta({tipo: 'PAGAR', descricao: 'Compra de pão', categoria: 'Fornecedores', valor: '70', vencimento: hoje});
D.salvarConta({tipo: 'RECEBER', descricao: 'Evento', categoria: 'Outras receitas', valor: '40', vencimento: hoje});
const rf = D.relatorioFinanceiro({de: hoje, ate: hoje});
ok(rf.receita === 180 && rf.cmv === 80 && rf.lucroBruto === 100, 'DRE: receita 180, CMV 80, lucro bruto 100');
ok(rf.despesas === 350 && rf.compras === 70, 'despesas 350 (luz 300 + aluguel 50); compras de 70 ficam fora (já estão no CMV)');
ok(rf.resultado === 100 - 350 + 40, `resultado: 100 − 350 + 40 = ${rf.resultado}`);
ok(rf.sangrias.length === 1 && rf.sangrias[0].valor === 300, 'sangrias do período');
ok(rf.meses.length === 12 && rf.meses[new Date().getMonth()].receitas === 220, 'mês atual: receitas 180 + 40');

// ---- Engenharia de cardápio ----
const p = n => prod(n);
[['X-Salada', '9', 30], ['Picanha na Chapa', '40', 2], ['Batata Frita', '20', 3], ['Misto Quente', '3', 25]].forEach(([n, custo, q]) => {
  D.salvarProduto({...p(n), custo}, p(n).id);
  D.registrarVenda({itens: [{produtoId: p(n).id, quantidade: q}], pagamentos: [{formaId: din, valor: String(q * p(n).preco)}]});
});
const eg = D.engenhariaCardapio({de: hoje, ate: hoje});
const cls = n => eg.lista.find(x => x.nome === n)?.classe;
ok(eg.lista.length === 5, `${eg.lista.length} produtos com custo na análise (corte qtd ${eg.corteQtd}, margem média ${eg.corteMargem})`);
console.log('   classes:', eg.lista.map(x => `${x.nome}: ${D.CLASSES_CARDAPIO[x.classe]} (qtd ${x.qtd}, margem un ${x.margemUn})`).join(' | '));
ok(cls('Picanha na Chapa') === 'QUEBRA' && cls('Misto Quente') === 'BURRO' && cls('X-Salada') === 'BURRO' && cls('Batata Frita') === 'CAO', 'picanha = quebra-cabeça; misto e x-salada (margem abaixo da média) = burro de carga; batata = cão');
