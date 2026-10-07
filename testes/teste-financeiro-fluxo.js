// Contas repetidas/parceladas e fluxo de caixa previsto
const fs = require('fs'), path = require('path');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Admin', login: 'admin', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y', modulos: []}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(path.join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { if (!c) { console.log('FALHOU:', msg); process.exitCode = 1; } else console.log('ok -', msg); };
const hoje = D.hojeISO(), mais = n => D.diaISO(new Date(new Date(hoje + 'T12:00:00').getTime() + n * 86400000));

// Parcelas e repetição mensal
ok(D.somarMeses('2026-01-31', 1) === '2026-02-28' && D.somarMeses('2026-01-31', 2) === '2026-03-31' && D.somarMeses('2026-11-15', 2) === '2027-01-15', 'meses seguintes: 31/01 → 28/02 → 31/03; virada de ano');
const p = D.salvarConta({tipo: 'PAGAR', descricao: 'Forno novo', categoria: D.categorias().PAGAR[0], valor: '1.000,00', vencimento: '2026-01-31', repetir: 3, modoRepetir: 'parcelas'});
const forno = D.contas().filter(c => c.grupo && c.grupo === p.grupo);
ok(p.criadas === 3 && forno.length === 3, 'compra em 3 parcelas: 3 contas');
ok(forno.map(c => c.valor).join('|') === '333.33|333.33|333.34' && forno.map(c => c.vencimento).join('|') === '2026-01-31|2026-02-28|2026-03-31', 'parcelas 333,33 + 333,33 + 333,34 nos meses seguintes');
ok(forno[0].descricao === 'Forno novo (1/3)' && forno[2].descricao === 'Forno novo (3/3)', 'descrição com o número da parcela');
const al = D.salvarConta({tipo: 'PAGAR', descricao: 'Aluguel', categoria: D.categorias().PAGAR[0], valor: '3500', vencimento: mais(40), repetir: 12, modoRepetir: 'mensal'});
const aluguel = D.contas().filter(c => c.grupo === al.grupo);
ok(aluguel.length === 12 && aluguel.every(c => c.valor === 3500), 'aluguel repetido 12 meses, R$ 3.500 cada');
let erro = ''; try { D.salvarConta({tipo: 'PAGAR', descricao: 'x', categoria: D.categorias().PAGAR[0], valor: '10', vencimento: hoje, repetir: 99}); } catch (e) { erro = e.message; }
ok(/1 a 60/.test(erro), 'repetir mais de 60 vezes é recusado');

// Fluxo de caixa
D.contas().slice().forEach(c => { if (c.status === 'ABERTA') D.excluirConta(c.id); });
const banco = D.salvarContaBancaria({nome: 'Banco', tipo: 'BANCO', saldoInicial: '1000'});
D.salvarConta({tipo: 'RECEBER', descricao: 'Evento', categoria: D.categorias().RECEBER[0], valor: '500', vencimento: mais(3)});
D.salvarConta({tipo: 'PAGAR', descricao: 'Fornecedor', categoria: D.categorias().PAGAR[0], valor: '1800', vencimento: mais(5)});
D.salvarConta({tipo: 'PAGAR', descricao: 'Luz atrasada', categoria: D.categorias().PAGAR[0], valor: '100', vencimento: mais(-2)});
const f = D.fluxoCaixa({dias: 30});
ok(f.saldoHoje === 1000 && f.dias.length === 30, 'saldo de hoje = contas bancárias (R$ 1.000)');
ok(f.dias[0].saidas === 100 && f.atrasadas.n === 1, 'conta vencida entra no primeiro dia');
ok(f.dias[3].saldo === 1400 && f.dias[5].saldo === -400, 'saldo dia a dia: 1.000 − 100 + 500 = 1.400; depois − 1.800 = −400');
ok(f.primeiroNegativo?.dia === mais(5) && f.menor.saldo === -400, 'avisa o primeiro dia com saldo negativo');
ok(f.entradas === 500 && f.saidas === 1900 && f.saldoFinal === -400, 'totais do período');
ok(D.fluxoCaixa({dias: 3}).primeiroNegativo === null, 'nos próximos 3 dias o saldo fica positivo');
