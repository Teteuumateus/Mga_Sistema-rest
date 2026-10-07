// Importação de produtos por planilha: prévia, criação, atualização e erros por linha
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

const agua = D.produtos().find(p => p.nome === 'Água Mineral 500ml');
const antes = D.produtos().length;
const linhas = [
  {linha: 2, nome: 'Pastel de Carne', categoria: 'Salgados', preco: '8,50', custo: 3, unidade: 'un', controla: 'Não', ativo: 'Sim'},
  {linha: 3, codigo: agua.codigo, preco: 5},                                      // atualiza só o preço
  {linha: 4, nome: 'Refrigerante 2L', categoria: 'Bebidas', preco: 12.9, controla: 'Sim', estoque: '1.250', minimo: 10},
  {linha: 5, nome: 'Sem preço', categoria: 'Bebidas'},                              // erro: preço
  {linha: 6, nome: 'Farinha', categoria: 'Insumos', tipo: 'Insumo', custo: '4,20', unidade: 'KG', estoque: 25},
  {linha: 7, nome: 'Unidade errada', categoria: 'Bebidas', preco: 3, unidade: 'litros'}, // erro: unidade
  {linha: 8, nome: 'Pastel de Carne', categoria: 'Salgados', preco: 9},             // erro: repetido
  {linha: 9}                                                                         // em branco: ignora
];
const p1 = D.importarProdutos(linhas);
ok(p1.novos === 3 && p1.atualizados === 1 && p1.erros === 3, `prévia: 3 novos, 1 atualizado, 3 com erro (${p1.novos}/${p1.atualizados}/${p1.erros})`);
ok(p1.categoriasNovas.sort().join(',') === 'Insumos,Salgados', 'prévia: cria as categorias Salgados e Insumos');
ok(D.produtos().length === antes, 'prévia não grava nada');
ok(p1.itens.find(i => i.linha === 5).erros[0].includes('preço'), 'linha 5: erro de preço');
ok(p1.itens.find(i => i.linha === 7).erros[0].includes('unidade'), 'linha 7: erro de unidade');
ok(p1.itens.find(i => i.linha === 8).erros.some(e => e.includes('repetido')), 'linha 8: nome repetido na planilha');

const r = D.importarProdutos(linhas, {aplicar: true});
ok(r.feitos === 4 && !r.falhas.length, `importou 4 (${r.feitos}, falhas ${JSON.stringify(r.falhas)})`);
const pastel = D.produtos().find(p => p.nome === 'Pastel de Carne');
ok(pastel && pastel.preco === 8.5 && pastel.custo === 3 && D.grupoPorId(pastel.grupoId).nome === 'Salgados' && pastel.codigo, 'pastel criado com preço, custo, categoria nova e código');
const agua2 = D.produtoPorId(agua.id);
ok(agua2.preco === 5 && agua2.nome === agua.nome && agua2.grupoId === agua.grupoId, 'água: só o preço mudou');
const refri = D.produtos().find(p => p.nome === 'Refrigerante 2L');
ok(refri.controlaEstoque && refri.estoque === 1250 && refri.estoqueMinimo === 10, 'refrigerante: controla estoque, saldo 1.250, mínimo 10');
const farinha = D.produtos().find(p => p.nome === 'Farinha');
ok(farinha.tipo === 'INSUMO' && farinha.unidade === 'KG' && farinha.estoque === 25 && farinha.controlaEstoque, 'farinha: insumo em KG com 25 em estoque');
ok(D.auditoria().some(a => /importados por planilha/.test(a.descricao)), 'auditoria registra a importação');

// Reimportar a mesma planilha: atualiza, não duplica
const r2 = D.importarProdutos(linhas.filter(l => [2, 4].includes(l.linha)).map(l => ({...l, preco: 10})), {aplicar: true});
ok(r2.atualizados === 2 && r2.novos === 0 && D.produtos().filter(p => p.nome === 'Pastel de Carne').length === 1, 'reimportar atualiza sem duplicar');
ok(D.produtos().find(p => p.nome === 'Refrigerante 2L').estoque === 1250, 'reimportar sem mexer no estoque mantém o saldo');

// Sem permissão de cadastros
const g = {id: 'g1', nome: 'Garçom', login: 'garcom', perfil: 'GARCOM', ativo: true, hash: 'x', sal: 'y', modulos: ['mesas']};
D.substituirCadastros({usuarios: [...D.usuarios(), g]}); mem.mga_sessao = JSON.stringify({usuarioId: 'g1'});
let bloqueou = false; try { D.importarProdutos(linhas); } catch (e) { bloqueou = true; }
ok(bloqueou, 'garçom não importa produtos');

// Códigos sem zero na frente, espaços repetidos e formatos de número
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
const agua1 = D.produtos().find(p => p.codigo === '001');
const r3 = D.importarProdutos([{linha: 2, codigo: '1', preco: '4,75'}, {linha: 3, nome: 'Agua  Mineral   500ml', preco: '4,80'}]);
ok(r3.itens[0].acao === 'ATUALIZAR' && r3.itens[0].produto?.id === agua1.id, 'código "1" encontra o produto "001"');
ok(r3.itens[1].acao === 'ATUALIZAR' && r3.itens[1].produto?.id === agua1.id, 'nome com espaços repetidos encontra o mesmo produto');
const novo = D.importarProdutos([{linha: 2, codigo: '7', nome: 'Produto Sete Novo', categoria: 'Bebidas', preco: 3}], {aplicar: true});
ok(D.produtos().some(p => p.nome === 'Produto Sete Novo' && p.codigo === '007') || D.produtos().some(p => p.codigo === '007' && p.nome !== 'Produto Sete Novo'), 'código novo "7" vira "007"');
ok(D.lerValor('1.234,56') === 1234.56 && D.lerValor('1,234.56') === 1234.56 && D.lerValor('6,50') === 6.5, 'números: 1.234,56 · 1,234.56 · 6,50');
ok(isNaN(D.lerValor('0x10')) && isNaN(D.lerValor('1e3')) && isNaN(D.lerValor('abc')), 'textos que não são número são recusados (0x10, 1e3)');
