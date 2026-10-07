// Entrada de estoque por planilha: prévia, uma compra por fornecedor + nota, custo médio, conta a pagar e erros
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
const coca = p('Coca-Cola Lata 350ml'), agua = p('Água Mineral 500ml');
const forn = D.salvarFornecedor({nome: 'Distribuidora Bahia', documento: ''});
const linhas = [
  {linha: 2, codigo: coca.codigo, produto: coca.nome, quantidade: 24, custo: '3,50', fornecedor: 'Distribuidora Bahia', documento: 'NF 100'},
  {linha: 3, produto: 'água mineral 500ml', quantidade: '12', custo: 1.2, fornecedor: 'distribuidora bahia', documento: 'NF 100'},
  {linha: 4, produto: 'Coca-Cola Lata 350ml', quantidade: 6, custo: 3.8},                 // outra nota (sem fornecedor)
  {linha: 5, produto: 'Produto que não existe', quantidade: 5, custo: 1},                // erro: não cadastrado
  {linha: 6, produto: 'Fanta 600ml', quantidade: 'abc'},                                  // erro: quantidade
  {linha: 7, produto: 'Fanta 600ml', quantidade: 3, fornecedor: 'Fornecedor Fantasma'},  // erro: fornecedor
  {linha: 8, codigo: coca.codigo, quantidade: 2, fornecedor: 'Distribuidora Bahia', documento: 'NF 100'}, // erro: repetido na nota
  {linha: 9, produto: 'Suco Natural de Laranja', quantidade: ''}                          // sem quantidade: ignora
];
const prev = D.importarEntradas(linhas);
ok(prev.validos === 3 && prev.erros === 4 && prev.notas === 2, `prévia: 3 válidas, 4 com erro, 2 notas (${prev.validos}/${prev.erros}/${prev.notas})`);
ok(prev.total === 24 * 3.5 + 12 * 1.2 + 6 * 3.8, 'prévia: total das notas');
ok(prev.passamAControlar.includes('Coca-Cola Lata 350ml'), 'prévia avisa quem passa a controlar estoque');
ok(prev.itens.find(i => i.linha === 5).erros[0].includes('não está cadastrado'), 'linha 5: produto não cadastrado');
ok(prev.itens.find(i => i.linha === 7).erros[0].includes('fornecedor'), 'linha 7: fornecedor não cadastrado');
ok(prev.itens.find(i => i.linha === 8).erros[0].includes('repetido'), 'linha 8: repetido na mesma nota');
ok(!prev.itens.some(i => i.linha === 9), 'linha sem quantidade é ignorada');
ok(D.produtoPorId(coca.id).estoque === (coca.estoque || 0), 'prévia não mexe no estoque');

const contasAntes = D.contas().length;
const r = D.importarEntradas(linhas, {aplicar: true, conta: {vencimento: D.hojeISO()}});
ok(r.feitas.length === 2 && !r.falhas.length, `duas compras registradas (${r.feitas.length}, falhas ${JSON.stringify(r.falhas)})`);
const coca2 = D.produtoPorId(coca.id), agua2 = D.produtoPorId(agua.id);
ok(coca2.controlaEstoque && coca2.estoque === 30, 'coca: passou a controlar e tem 30 (24 + 6)');
ok(agua2.estoque === 12, 'água: 12 em estoque');
ok(Math.abs(coca2.custo - (24 * 3.5 + 6 * 3.8) / 30) < 0.011, 'coca: custo médio das duas notas');
const movs = D.movEstoque().filter(m => m.tipo === 'ENTRADA' && m.produtoId === coca.id);
ok(movs.some(m => /Distribuidora Bahia · NF 100/.test(m.motivo)) && movs.some(m => /Importação de planilha/.test(m.motivo)), 'entradas com fornecedor e nota no histórico');
ok(D.contas().length === contasAntes + 2 && D.contas().some(c => /Distribuidora Bahia/.test(c.descricao) && c.valor === 24 * 3.5 + 12 * 1.2), 'conta a pagar por nota');

// Sem permissão de estoque
const g = {id: 'g1', nome: 'Garçom', login: 'garcom', perfil: 'GARCOM', ativo: true, hash: 'x', sal: 'y', modulos: ['mesas']};
D.substituirCadastros({usuarios: [...D.usuarios(), g]}); mem.mga_sessao = JSON.stringify({usuarioId: 'g1'});
let bloqueou = false; try { D.importarEntradas(linhas); } catch (e) { bloqueou = true; }
ok(bloqueou, 'garçom não importa entradas');

// Mesma nota importada de novo: a prévia avisa
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
const de_novo = D.importarEntradas([{linha: 2, codigo: coca.codigo, quantidade: 1, custo: 3, fornecedor: 'Distribuidora Bahia', documento: 'NF 100'}]);
ok(de_novo.repetidas.length === 1 && de_novo.repetidas[0].includes('NF 100'), 'nota "NF 100" já lançada: a prévia avisa');
ok(D.importarEntradas([{linha: 2, codigo: coca.codigo, quantidade: 1, documento: 'NF 999'}]).repetidas.length === 0, 'nota nova: sem aviso');
