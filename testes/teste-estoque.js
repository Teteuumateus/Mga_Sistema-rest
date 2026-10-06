const fs = require('fs');
const mem = {};
const store = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.localStorage = store; global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
// usuário admin logado
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Admin Teste', login: 'admin', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y', modulos: []}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(require('path').join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { if (!c) { console.log('FALHOU:', msg); process.exitCode = 1; } else console.log('ok -', msg); };
const coca = D.produtos().find(p => p.nome === 'Coca-Cola Lata 350ml');
const file = D.produtos().find(p => p.nome.startsWith('Filé Mignon à Cubana'));
ok(coca.controlaEstoque === false, 'produto de exemplo começa sem controle');
D.configurarEstoque(coca.id, {controla: true, minimo: '6'});
ok(coca.controlaEstoque && coca.estoqueMinimo === 6, 'configurar controle e mínimo');
ok(D.estoqueBaixo(coca), 'saldo 0 com mínimo 6 = repor');
D.entradaEstoque({produtoId: coca.id, quantidade: '24', custo: '3,00', documento: 'NF 1'});
ok(coca.estoque === 24 && coca.custo === 3, 'entrada 24 a R$3 → saldo 24, custo 3');
D.entradaEstoque({produtoId: coca.id, quantidade: '12', custo: '3,60', conta: {vencimento: D.hojeISO()}});
ok(coca.estoque === 36 && coca.custo === 3.2, 'custo médio ponderado (24×3 + 12×3,6)/36 = 3,20 → ' + coca.custo);
const conta = D.contas().find(c => c.descricao.includes('Coca'));
ok(conta && conta.valor === 43.2 && conta.categoria === 'Fornecedores', 'conta a pagar lançada R$ 43,20 em Fornecedores');
let e; try { D.saidaEstoque({produtoId: coca.id, quantidade: '100', motivo: 'Perda'}); } catch (x) { e = x; }
ok(e && e.regra, 'saída maior que o saldo é bloqueada: ' + (e && e.message));
D.saidaEstoque({produtoId: coca.id, quantidade: '2', motivo: 'Perda / quebra'});
ok(coca.estoque === 34, 'saída 2 → 34');
D.ajustarEstoque({produtoId: coca.id, contado: '30'});
ok(coca.estoque === 30, 'ajuste de inventário → 30');
try { D.entradaEstoque({produtoId: file.id, quantidade: '1'}); e = null; } catch (x) { e = x; }
ok(e && e.regra, 'produto sem controle não movimenta');
// venda
D.abrirCaixa({valorInicial: '100'});
const din = D.formasAtivas().find(f => f.tipo === 'DINHEIRO');
const v = D.registrarVenda({itens: [{produtoId: coca.id, quantidade: 3}, {produtoId: file.id, quantidade: 1}, {produtoId: coca.id, quantidade: 2}], pagamentos: [{formaId: din.id, valor: '200'}]});
ok(coca.estoque === 25, 'venda finalizada baixa 5 latas → 25');
ok(D.movEstoque().filter(m => m.vendaId === v.id).length === 1, 'um movimento por produto na venda');
// mesa aberta não baixa até fechar
const mesa = D.mesas()[0];
const vm = D.novaVenda({tipo: 'MESA', mesaId: mesa.id});
D.adicionarItem(vm.id, coca.id, {quantidade: 4});
ok(coca.estoque === 25, 'mesa aberta ainda não baixa');
D.receberParcial(vm.id, {valor: D.totaisVenda(vm).restante, pagamentos: [{formaId: din.id, valor: D.totaisVenda(vm).restante}]});
ok(coca.estoque === 21 && vm.status === 'FINALIZADA', 'mesa fechada baixa 4 → 21');
D.cancelarVenda(v.id, 'Cliente desistiu');
ok(coca.estoque === 26, 'cancelamento devolve 5 → 26');
try { D.cancelarVenda(v.id, 'de novo'); } catch (x) {}
ok(coca.estoque === 26, 'não devolve duas vezes');
// vende sem saldo: não trava
D.ajustarEstoque({produtoId: coca.id, contado: '1'});
D.registrarVenda({itens: [{produtoId: coca.id, quantidade: 3}], pagamentos: [{formaId: din.id, valor: '50'}]});
ok(coca.estoque === -2, 'venda sem saldo não trava e deixa negativo');
// cadastro: produto novo com estoque inicial e edição de saldo
const novo = D.salvarProduto({nome: 'Cerveja Long Neck', grupoId: D.grupos()[0].id, preco: '12', custo: '5', controlaEstoque: true, estoque: '48', estoqueMinimo: '12'});
ok(novo.estoque === 48 && D.movEstoque().some(m => m.produtoId === novo.id && m.motivo === 'Estoque inicial'), 'produto novo com estoque inicial gera movimento');
D.salvarProduto({...novo, estoque: '40,5', estoqueMinimo: '12'}, novo.id);
ok(novo.estoque === 40.5 && D.movEstoque().filter(m => m.produtoId === novo.id).length === 2, 'saldo editado no cadastro vira ajuste');
D.salvarProduto({...novo, ativo: false}, novo.id);
ok(D.movEstoque().filter(m => m.produtoId === novo.id).length === 2, 'desativar produto não mexe no estoque');
// persistência
ok(JSON.parse(mem.mga_restMovEstoque).length === D.movEstoque().length, 'movimentos gravados no localStorage');
ok(JSON.parse(mem.mga_restProdutos).find(p => p.id === coca.id).estoque === -2, 'saldo gravado no localStorage');
const aud = D.auditoria().filter(a => a.modulo === 'Estoque');
ok(aud.length >= 5, 'auditoria com módulo Estoque (' + aud.length + ')');
