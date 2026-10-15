// Exclusão de cadastros: o que fica no histórico ganha cadeado (motivoSemExcluir) e o "Desativar" da janela
// de exclusão salva o próprio cadastro com ativo: false, sem perder nada.
const fs = require('fs');
const mem = {};
global.localStorage = {getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length(){ return Object.keys(mem).length; }};
global.sessionStorage = {getItem: () => null, setItem(){}, removeItem(){}};
global.window = global;
mem.mga_restUsuarios = JSON.stringify([{id: 'u1', nome: 'Ana', login: 'ana', perfil: 'ADMIN', ativo: true, hash: 'x', sal: 'y'},
  {id: 'u2', nome: 'Bia', login: 'bia', perfil: 'CAIXA', ativo: true, hash: 'x', sal: 'y'}]);
mem.mga_sessao = JSON.stringify({usuarioId: 'u1'});
eval(fs.readFileSync(require('path').join(__dirname, '..', 'restaurante-dados.js'), 'utf8'));
const D = window.RestDados;
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALHOU: ') + msg); if (!c) process.exitCode = 1; };
const falha = (fn, msg) => { try { fn(); ok(false, msg + ' (não deu erro)'); } catch (e) { ok(e.regra, msg + ': ' + e.message); } };
const trava = (tipo, id) => D.motivoSemExcluir(tipo, id);

// Antes de vender: produto, forma, entregador, aplicativo e usuário Bia ficam livres
const [p1, p2] = D.produtos().filter(p => p.tipo !== 'INSUMO' && !(p.tamanhos || []).length && !D.precisaMontar(p));
const forma = D.formasAtivas().find(f => f.tipo === 'DINHEIRO');
const ent = D.salvarEntregador({nome: 'Zé', telefone: '(11) 98888-7777', veiculo: 'Moto', placa: 'ABC1D23'});
const app = D.salvarAplicativo({nome: 'iFood', comissao: '12,5'});
ok(!trava('produto', p1.id) && !trava('forma', forma.id) && !trava('entregador', ent.id) && !trava('aplicativo', app.id) && !trava('usuario', 'u2'), 'sem vendas: nada travado');
ok(trava('usuario', 'u1').includes('próprio usuário'), 'o próprio usuário fica travado');
const grupo = D.grupoPorId(p1.grupoId);
ok(trava('grupo', grupo.id).includes('produto'), 'categoria com produtos fica travada');

// Uma venda trava o que ela usou; o índice acompanha a mudança sem precisar recarregar
D.abrirCaixa({valorInicial: '0'});
D.registrarVenda({itens: [{produtoId: p1.id, quantidade: 1}], pagamentos: [{formaId: forma.id, valor: '1000'}]});
ok(trava('produto', p1.id).includes('já foi vendido') && !trava('produto', p2.id), 'produto vendido travado, o outro não');
ok(trava('forma', forma.id).includes('já foi usada'), 'forma usada travada');
ok(trava('usuario', 'u1').length > 0, 'quem abriu o caixa fica no histórico');
falha(() => D.excluirProduto(p1.id), 'excluir produto vendido continua barrado no backend');
falha(() => D.excluirForma(forma.id), 'excluir forma usada continua barrada');

const v = D.registrarDelivery({itens: [{produtoId: p2.id, quantidade: 1}], cliente: {nome: 'Cli', telefone: '11999990000', endereco: 'Rua', numero: '1', bairro: 'Centro', cidade: 'X'}, taxaEntrega: '0', aplicativoId: app.id});
const cli = D.clientes().find(c => c.nome === 'Cli');
ok(trava('cliente', cli.id).includes('venda em aberto'), 'cliente com venda em aberto travado');
ok(D.vendaPorId(v.id).aplicativo?.id === app.id && trava('aplicativo', app.id).includes('pedidos'), 'aplicativo com pedido travado');
D.novaVenda({tipo: 'DELIVERY', clienteId: cli.id, entregadorId: ent.id});
ok(trava('entregador', ent.id).includes('entregas'), 'entregador com pedido travado');

// Mesa com pedido aberto trava; livre não
const mesa = D.mesas()[0];
ok(!trava('mesa', mesa.id), 'mesa livre pode excluir');
D.novaVenda({tipo: 'MESA', mesaId: mesa.id, pessoas: 2});
ok(trava('mesa', mesa.id).includes('pedido aberto'), 'mesa ocupada travada');

// "Desativar" da janela: salva o cadastro como está, só com ativo: false
const desativa = (nome, lista, salvar, item, campos) => {
  const antes = JSON.stringify(campos.map(k => item[k]));
  salvar({...item, ativo: false}, item.id);
  const depois = lista().find(x => x.id === item.id);
  ok(depois && depois.ativo === false && JSON.stringify(campos.map(k => depois[k])) === antes, `desativar ${nome} mantém os dados`);
};
desativa('categoria', D.grupos, D.salvarGrupo, grupo, ['nome', 'cozinha']);
desativa('produto', D.produtos, D.salvarProduto, p2, ['nome', 'preco', 'codigo', 'grupoId']);
desativa('entregador', D.entregadores, D.salvarEntregador, D.salvarEntregador({nome: 'Lu', telefone: '(11) 97777-6666', veiculo: 'Bicicleta', placa: ''}), ['nome', 'telefone', 'veiculo']);
desativa('aplicativo', D.aplicativos, D.salvarAplicativo, D.aplicativoPorId(app.id), ['nome', 'comissao']);
const mesa2 = D.mesas().find(m => m.id !== mesa.id);
desativa('mesa', D.mesas, D.salvarMesa, mesa2, ['numero', 'lugares']);
const forma2 = D.salvarForma({nome: 'Vale', tipo: 'OUTROS'});
desativa('forma de pagamento', D.formas, D.salvarForma, forma2, ['nome', 'tipo']);
const ad = D.salvarGrupoAdicional({nome: 'Borda', min: '0', max: '1', opcoes: [{nome: 'Catupiry', preco: '8,00'}, {nome: 'Cheddar', preco: '9,50'}]});
desativa('adicionais', D.adicionais, D.salvarGrupoAdicional, ad, ['nome', 'min', 'max']);
ok(JSON.stringify(D.grupoAdicionalPorId(ad.id).opcoes.map(o => [o.nome, o.preco])) === JSON.stringify([['Catupiry', 8], ['Cheddar', 9.5]]), 'adicionais desativado mantém opções e preços');
const promo = D.salvarPromocao({nome: 'Terça', alvo: 'PRODUTO', ids: [p2.id], tipo: 'PERCENTUAL', valor: '10', dias: [2]});
desativa('promoção', D.promocoes, D.salvarPromocao, promo, ['nome', 'tipo', 'valor', 'ids', 'dias']);
const emb = D.salvarEmbalagem({nome: 'Caixa pizza', preco: '2,50', produtoIds: [p1.id]});
desativa('embalagem', D.embalagens, D.salvarEmbalagem, emb, ['nome', 'preco', 'produtoIds']);
const forn = D.salvarFornecedor({nome: 'Atacadão', telefone: '(11) 3333-4444'});
desativa('fornecedor', D.fornecedores, D.salvarFornecedor, forn, ['nome', 'telefone']);
const func = D.salvarFuncionario({nome: 'Carlos', cargo: 'Garçom', salario: '1.800,00'});
desativa('funcionário', D.funcionarios, D.salvarFuncionario, func, ['nome', 'cargo', 'salario']);
const reg = D.salvarRegiao({nome: 'Centro', cidade: 'Campinas', bairros: 'Centro, Cambuí', taxa: '5,50', tempo: '30'});
desativa('região', D.regioes, D.salvarRegiao, reg, ['nome', 'cidade', 'bairros', 'taxa', 'tempo']);
