// Testa a gravação de TODAS as tabelas (restaurante-nuvem.js) com um Supabase falso que imita o schema
const fs = require('fs');
const crypto = require('crypto');
const DIR = require('path').join(__dirname, '..') + '/'; // pasta do sistema
const ok = (c, msg) => { console.log((c ? 'ok - ' : 'FALHOU: ') + msg); if (!c) process.exitCode = 1; };
const espera = ms => new Promise(r => setTimeout(r, ms));

// ---- Banco falso ----
const U = {
  categorias: [['nome']], produtos: [['codigo'], ['nome']], grupos_adicionais: [['nome']], adicionais_opcoes: [['grupo_id', 'nome']], produto_tamanhos: [['produto_id', 'nome']],
  produto_ficha_tecnica: [['produto_id', 'insumo_id']], produto_grupos_adicionais: [['produto_id', 'grupo_id']], mesas: [['numero']], formas_pagamento: [['nome']],
  fornecedores: [['nome']], entregadores: [['nome']], aplicativos_delivery: [['nome']], embalagens: [['nome']], embalagem_produtos: [['produto_id']],
  regiao_bairros: [['regiao_id', 'bairro']], promocao_dias: [['promocao_id', 'dia']], contas_bancarias: [['nome']], caixas: [['numero']], vendas: [['numero']],
  categorias_financeiras: [['tipo', 'nome']], sequencias: [['nome']], venda_entrega: [['venda_id']]
};
const FK = {
  produtos: {categoria_id: 'categorias'}, adicionais_opcoes: {grupo_id: 'grupos_adicionais'}, produto_tamanhos: {produto_id: 'produtos'},
  produto_ficha_tecnica: {produto_id: 'produtos', insumo_id: 'produtos'}, produto_grupos_adicionais: {produto_id: 'produtos', grupo_id: 'grupos_adicionais'},
  regiao_bairros: {regiao_id: 'regioes_entrega'}, embalagem_produtos: {embalagem_id: 'embalagens', produto_id: 'produtos'},
  promocao_itens: {promocao_id: 'promocoes', produto_id: 'produtos', categoria_id: 'categorias'}, promocao_dias: {promocao_id: 'promocoes'},
  caixa_conferencia: {caixa_id: 'caixas'}, vendas: {caixa_id: 'caixas', cliente_id: 'clientes', mesa_id: 'mesas', aplicativo_id: 'aplicativos_delivery'},
  venda_itens: {venda_id: 'vendas', produto_id: 'produtos'}, venda_item_adicionais: {item_id: 'venda_itens'}, venda_pagamentos: {venda_id: 'vendas', forma_id: 'formas_pagamento'},
  venda_entrega: {venda_id: 'vendas', forma_prevista_id: 'formas_pagamento', entregador_id: 'entregadores'}, venda_historico_delivery: {venda_id: 'vendas'},
  contas: {cliente_id: 'clientes', fornecedor_id: 'fornecedores', venda_id: 'vendas'}, caixa_movimentos: {caixa_id: 'caixas', venda_id: 'vendas', conta_id: 'contas'},
  estoque_movimentos: {produto_id: 'produtos', venda_id: 'vendas', fornecedor_id: 'fornecedores'},
  conta_bancaria_movimentos: {conta_bancaria_id: 'contas_bancarias', conta_id: 'contas', caixa_movimento_id: 'caixa_movimentos'}, auditoria_alteracoes: {auditoria_id: 'auditoria'}
};
// Ao excluir o pai: cascade / restrict / set null
const ON_DEL = {};
Object.entries(FK).forEach(([t, cols]) => Object.entries(cols).forEach(([c, alvo]) => {
  const modo = ['produtos.categoria_id', 'produto_ficha_tecnica.insumo_id', 'vendas.caixa_id'].includes(`${t}.${c}`) ? 'restrict'
    : ['vendas.cliente_id', 'vendas.mesa_id', 'vendas.aplicativo_id', 'venda_itens.produto_id', 'estoque_movimentos.produto_id', 'estoque_movimentos.venda_id', 'estoque_movimentos.fornecedor_id',
       'contas.cliente_id', 'contas.fornecedor_id', 'caixa_movimentos.venda_id', 'caixa_movimentos.conta_id', 'venda_pagamentos.forma_id', 'venda_entrega.forma_prevista_id', 'venda_entrega.entregador_id'].includes(`${t}.${c}`) ? 'setnull' : 'cascade';
  (ON_DEL[alvo] ||= []).push([t, c, modo]);
}));
const TABELAS = ['empresas', 'usuarios', 'categorias', 'produtos', 'produto_tamanhos', 'produto_ficha_tecnica', 'grupos_adicionais', 'adicionais_opcoes', 'produto_grupos_adicionais',
  'promocoes', 'promocao_itens', 'promocao_dias', 'embalagens', 'embalagem_produtos', 'mesas', 'clientes', 'fornecedores', 'funcionarios', 'entregadores', 'regioes_entrega',
  'regiao_bairros', 'aplicativos_delivery', 'formas_pagamento', 'caixas', 'caixa_conferencia', 'vendas', 'venda_itens', 'venda_item_adicionais', 'venda_pagamentos', 'venda_entrega',
  'venda_historico_delivery', 'estoque_movimentos', 'categorias_financeiras', 'contas', 'caixa_movimentos', 'contas_bancarias', 'conta_bancaria_movimentos', 'auditoria',
  'auditoria_alteracoes', 'sequencias'];
// jsonb do PostgreSQL devolve as chaves em outra ordem
const jsonb = v => Array.isArray(v) ? v.map(jsonb) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort((a, b) => a.length - b.length || a.localeCompare(b)).map(k => [k, jsonb(v[k])])) : v;
function bancoFalso(){
  const T = Object.fromEntries(TABELAS.map(t => [t, []]));
  const ouvintes = [];
  let empresa = null, chamadas = 0;
  const minha = t => T[t].filter(l => l.empresa_id === empresa);
  const avisar = (t, evento, novo, velho) => ouvintes.forEach(o => o.empresa === empresa || true ? o.fn(t, {eventType: evento, new: novo || {}, old: velho || {}}) : null);
  function validar(t, l, existente){
    for (const [c, alvo] of Object.entries(FK[t] || {}))
      if (l[c] != null && !T[alvo].some(x => x.id === l[c] && x.empresa_id === empresa)) return `insert or update on table "${t}" violates foreign key constraint "${t}_${c}_fkey"`;
    for (const u of U[t] || []) if (T[t].some(x => x !== existente && x.empresa_id === empresa && u.every(c => String(x[c]).toLowerCase() === String(l[c]).toLowerCase())))
      return `duplicate key value violates unique constraint "${t}_empresa_id_${u.join('_')}_key"`;
    if (t === 'caixas' && l.status === 'ABERTO' && T.caixas.some(x => x !== existente && x.empresa_id === empresa && x.status === 'ABERTO')) return 'duplicate key value violates unique constraint "caixas_um_aberto"';
    if (t === 'contas' && !(l.valor > 0)) return 'new row violates check constraint "contas_valor_check"';
    return null;
  }
  // Como o banco real (migração 09): o que foi excluído fica anotado e não pode ser incluído de novo
  const PAIS = ['categorias', 'grupos_adicionais', 'produtos', 'mesas', 'clientes', 'formas_pagamento', 'fornecedores', 'funcionarios', 'entregadores',
    'regioes_entrega', 'aplicativos_delivery', 'embalagens', 'promocoes', 'contas_bancarias', 'caixas', 'vendas', 'contas', 'caixa_movimentos', 'estoque_movimentos', 'conta_bancaria_movimentos'];
  const excluidos = new Set();
  function gravar(t, linhas, modo, onConflict, ignorar, salvas = []){
    for (const l0 of linhas) {
      if (PAIS.includes(t) && l0.id && excluidos.has(t + ':' + l0.id)) continue;
      const l = {...l0, empresa_id: empresa, ...(l0.extra ? {extra: jsonb(JSON.parse(JSON.stringify(l0.extra)))} : {})};
      if (!l.id && !['produto_ficha_tecnica', 'produto_grupos_adicionais', 'embalagem_produtos', 'promocao_dias', 'sequencias', 'venda_entrega'].includes(t)) l.id = crypto.randomUUID();
      const conf = modo === 'insert' ? null : (onConflict || 'id').split(',').filter(c => c !== 'empresa_id');
      const existente = conf && T[t].find(x => conf.every(c => x[c] === l[c]) && (x.empresa_id === empresa));
      if (modo === 'insert' && l.id && T[t].some(x => x.id === l.id)) return {message: `duplicate key value violates unique constraint "${t}_pkey"`};
      const erro = validar(t, l, existente);
      if (erro) return {message: erro};
      if (existente && ignorar) continue;
      if (existente) { Object.assign(existente, l); avisar(t, 'UPDATE', existente); } else { T[t].push(l); avisar(t, 'INSERT', l); }
      salvas.push({id: l.id});
    }
    return null;
  }
  function excluir(t, filtro){
    const alvo = minha(t).filter(filtro);
    for (const l of alvo) for (const [filho, c, modo] of ON_DEL[t] || [])
      if (modo === 'restrict' && T[filho].some(x => x[c] === l.id)) return {message: `update or delete on table "${t}" violates foreign key constraint on table "${filho}"`};
    for (const l of alvo) for (const [filho, c, modo] of ON_DEL[t] || []) {
      if (modo === 'setnull') T[filho].filter(x => x[c] === l.id).forEach(x => { x[c] = null; });
      if (modo === 'cascade') { const sai = T[filho].filter(x => x[c] === l.id); sai.forEach(x => excluir(filho, y => y === x)); }
    }
    T[t] = T[t].filter(l => !alvo.includes(l));
    if (PAIS.includes(t)) alvo.forEach(l => excluidos.add(t + ':' + l.id));
    alvo.forEach(l => avisar(t, 'DELETE', null, {id: l.id}));
    return null;
  }
  const consulta = t => {
    const filtros = []; let modo = 'select', dados = null, range = null, ordem = null, limite = null, umSo = false, conflito = null, ignorar = false;
    const q = {
      select(){ return q; }, order(c, o){ ordem = [c, o?.ascending !== false]; return q; }, range(a, b){ range = [a, b]; return q; }, limit(n){ limite = n; return q; },
      maybeSingle(){ umSo = true; return q; },
      upsert(l, o){ modo = 'upsert'; dados = l; conflito = o?.onConflict; ignorar = !!o?.ignoreDuplicates; return q; }, insert(l){ modo = 'insert'; dados = l; return q; },
      update(l){ modo = 'update'; dados = l; return q; }, delete(){ modo = 'delete'; return q; },
      in(c, v){ filtros.push(l => v.includes(l[c])); return q; }, eq(c, v){ filtros.push(l => l[c] === v); return q; },
      then(res, rej){
        chamadas++;
        let r;
        if (modo === 'upsert' || modo === 'insert') { const salvas = []; const error = gravar(t, dados, modo, conflito, ignorar, salvas); r = {error, data: error ? null : salvas}; }
        else if (modo === 'delete') r = {error: excluir(t, l => filtros.every(f => f(l)))};
        else if (modo === 'update') { const alvo = (t === 'empresas' ? T[t] : minha(t)).filter(l => filtros.every(f => f(l))); alvo.forEach(l => { Object.assign(l, {...dados, config: jsonb(dados.config)}); avisar(t, 'UPDATE', l); }); r = {error: null}; }
        else {
          let d = (t === 'empresas' ? T[t].filter(x => x.id === empresa) : minha(t)).filter(l => filtros.every(f => f(l)));
          if (ordem) d = d.slice().sort((a, b) => (a[ordem[0]] > b[ordem[0]] ? 1 : a[ordem[0]] < b[ordem[0]] ? -1 : 0) * (ordem[1] ? 1 : -1));
          if (range) d = d.slice(range[0], range[1] + 1);
          if (limite) d = d.slice(0, limite);
          d = JSON.parse(JSON.stringify(d));
          r = {data: umSo ? (d[0] || null) : d, error: null};
        }
        return Promise.resolve(r).then(res, rej);
      }
    };
    return q;
  };
  const cliente = {
    from: consulta,
    auth: {getSession: async () => ({data: {session: empresa ? {} : null}})},
    channel(){ const c = {fns: [], on(_, filtro, fn){ c.fns.push({t: filtro.table, fn}); return c; }, subscribe(){ ouvintes.push({empresa, fn: (t, p) => c.fns.filter(x => x.t === t).forEach(x => x.fn(p))}); return c; }}; return c; }
  };
  return {T, cliente, chamadas: () => chamadas, comoEmpresa: e => { empresa = e; }, limparOuvintes: () => { ouvintes.length = 0; }};
}

// ---- Navegador falso ----
function armazem(m = {}){ return {m, getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, key: i => Object.keys(m)[i], get length(){ return Object.keys(m).length; }}; }
async function abrirPagina(mem, banco){
  const ctx = {};
  global.window = global;
  global.localStorage = armazem(mem.local); global.sessionStorage = armazem(mem.sessao);
  global.document = {createElement: () => ({setAttribute(){}, textContent: '', className: ''}), body: {appendChild(){}}};
  let recarregou = false;
  global.location = {reload: () => { recarregou = true; }};
  global.supa = banco.cliente;
  delete global.RestDados; delete global.MGA_PRONTO;
  eval(fs.readFileSync(DIR + 'restaurante-dados.js', 'utf8'));
  eval(fs.readFileSync(DIR + 'restaurante-nuvem.js', 'utf8'));
  await Promise.race([global.MGA_PRONTO, espera(500)]);
  return {D: global.RestDados, N: global.MGA_NUVEM, recarregou: () => recarregou};
}
const entrar = (mem, uid, empresa) => {
  mem.local.mga_restUsuarios = JSON.stringify([{id: uid, nome: 'Mateus', login: 'mateus', perfil: 'ADMIN', ativo: true, empresaId: empresa, modulos: []}]);
  mem.local.mga_sessao = JSON.stringify({usuarioId: uid});
};
const contar = (banco, t) => banco.T[t].length;

(async () => {
  const banco = bancoFalso();
  banco.comoEmpresa('A');
  banco.T.empresas.push({id: 'A', nome: 'MGA Restaurante', config: {taxaServico: 10}, empresa_id: 'A'});
  const nomesFormas = ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito', 'Vale-refeição', 'Cheque', 'Cortesia', 'A prazo (fiado)'];
  await banco.cliente.from('formas_pagamento').insert(nomesFormas.map((nome, k) => ({nome, tipo: ['DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'OUTROS', 'OUTROS', 'OUTROS', 'PRAZO'][k], ordem: k + 1, ativo: k < 5})));
  await banco.cliente.from('mesas').insert(Array.from({length: 12}, (_, k) => ({numero: String(k + 1).padStart(2, '0'), lugares: 4})));
  await banco.cliente.from('categorias_financeiras').insert([...['Fornecedores', 'Aluguel', 'Energia'].map(nome => ({tipo: 'PAGAR', nome})), {tipo: 'RECEBER', nome: 'Vendas a prazo'}]);

  // ---- 1. Navegador com um dia de trabalho, ids antigos ----
  const mem = {local: {}, sessao: {}};
  global.window = global; global.localStorage = armazem(mem.local); global.sessionStorage = armazem(mem.sessao);
  eval(fs.readFileSync(DIR + 'restaurante-dados.js', 'utf8'));
  let D = global.RestDados;
  entrar(mem, 'u1', null);
  const p = n => D.produtos().find(x => x.nome === n);
  const forma = t => D.formasAtivas().find(f => f.tipo === t).id;
  D.salvarConfig({nome: 'Cantina da Praça', taxaServico: '12', servicoPadrao: true, taxaEntrega: '5', entregaVerde: '20', entregaAmarelo: '40'});
  D.salvarEmpresa({nome: 'Cantina da Praça', cnpj: '11.222.333/0001-81', cidade: 'Campinas', uf: 'SP'});
  const forn = D.salvarFornecedor({nome: 'Atacadão'});
  D.salvarEntregador({nome: 'Zé Moto'});
  D.salvarRegiao({nome: 'Centro', cidade: 'Campinas', bairros: 'Centro, Cambuí', taxa: '5'});
  const app = D.salvarAplicativo({nome: 'iFood', comissao: '12'});
  D.salvarEmbalagem({nome: 'Marmita', preco: '1,50', produtoIds: [p('Marmitex Grande').id]});
  D.salvarPromocao({nome: 'Happy hour', alvo: 'CATEGORIA', ids: [D.grupos()[0].id], tipo: 'PERCENTUAL', valor: '10'});
  D.salvarFuncionario({nome: 'Rita', cargo: 'Cozinheiro(a)', salario: '2000'});
  const ponto = D.salvarGrupoAdicional({nome: 'Ponto', min: 1, max: 1, opcoes: [{nome: 'Ao ponto'}, {nome: 'Bem passada'}]});
  D.salvarProduto({...p('Burger Clássico 180g'), gruposAdicionais: [ponto.id]}, p('Burger Clássico 180g').id);
  const banco1 = D.salvarContaBancaria({nome: 'Banco do Brasil', saldoInicial: '1000'});
  D.configurarEstoque(p('Coca-Cola Lata 350ml').id, {controla: true, minimo: '5'});
  D.compraEstoque({fornecedorId: forn.id, itens: [{produtoId: p('Coca-Cola Lata 350ml').id, quantidade: '24', custo: '3'}], conta: {vencimento: D.hojeISO()}});
  D.abrirCaixa({valorInicial: '100'});
  const vb = D.registrarVenda({itens: [{produtoId: p('Burger Clássico 180g').id, quantidade: 1, adicionais: [ponto.opcoes[0].id]}, {produtoId: p('Coca-Cola Lata 350ml').id, quantidade: 2}],
    pagamentos: [{formaId: forma('DINHEIRO'), valor: '60'}]});
  const vm = D.novaVenda({tipo: 'MESA', mesaId: D.mesas()[2].id, pessoas: 2});
  D.adicionarItem(vm.id, p('Picanha na Chapa').id, {quantidade: 1, observacao: 'mal passada'});
  const dv = D.registrarDelivery({itens: [{produtoId: p('Marmitex Grande').id, quantidade: 2}], aplicativoId: app.id, cliente: {nome: 'Joana', telefone: '11999991234', endereco: 'Rua A', numero: '10', bairro: 'Cambuí', cidade: 'Campinas'}, taxaEntrega: '5'});
  D.movimentarCaixa('SANGRIA', {valor: '20', motivo: 'Depósito', contaBancariaId: banco1.id});
  const conta = D.salvarConta({tipo: 'PAGAR', descricao: 'Aluguel', categoria: 'Aluguel', valor: '3000', vencimento: D.hojeISO()});
  D.baixarConta(conta.id, {data: D.hojeISO(), forma: 'PIX', contaBancariaId: banco1.id});
  D.salvarCategoria('PAGAR', 'Embalagens descartáveis');
  delete mem.local.mga_cadastrosExemplo;
  // Ids antigos (não-uuid) em tudo
  const legado = s => s.replace(/"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"/g, (m, id) => `"x${id.replace(/-/g, '').slice(0, 20)}"`);
  Object.keys(mem.local).forEach(k => { if (k.startsWith('mga_') && !['mga_sessao', 'mga_restUsuarios'].includes(k)) mem.local[k] = legado(mem.local[k]); });
  const antes = {vendas: JSON.parse(mem.local.mga_restVendas).length, mov: JSON.parse(mem.local.mga_restMovEstoque).length, aud: JSON.parse(mem.local.mga_auditoria).length};
  // Auditoria antiga sem id
  mem.local.mga_auditoria = JSON.stringify(JSON.parse(mem.local.mga_auditoria).map(({id, ...a}) => a));

  entrar(mem, 'u1', 'A');
  let pag = await abrirPagina(mem, banco);
  ok(pag.recarregou(), 'primeira vez: junta e recarrega');
  ok(contar(banco, 'vendas') === 3 && contar(banco, 'venda_itens') === 4, `vendas e itens no banco (${contar(banco, 'vendas')} vendas, ${contar(banco, 'venda_itens')} itens)`);
  ok(contar(banco, 'venda_pagamentos') === 1 && contar(banco, 'venda_entrega') === 1 && contar(banco, 'venda_historico_delivery') === 1, 'pagamento, entrega e histórico do delivery');
  ok(contar(banco, 'venda_item_adicionais') === 1 && banco.T.venda_item_adicionais[0].nome === 'Ao ponto', 'adicional do item (Ao ponto)');
  ok(contar(banco, 'caixas') === 1 && contar(banco, 'caixa_movimentos') === 2, 'caixa e movimentos (abertura + sangria)');
  ok(contar(banco, 'estoque_movimentos') === antes.mov && contar(banco, 'contas') === 2, `movimentos de estoque (${contar(banco, 'estoque_movimentos')}) e contas (compra + aluguel)`);
  ok(contar(banco, 'conta_bancaria_movimentos') === 2 && contar(banco, 'contas_bancarias') === 1, 'conta bancária e extrato (sangria + aluguel)');
  ok(['fornecedores', 'entregadores', 'aplicativos_delivery', 'embalagens', 'promocoes', 'funcionarios', 'regioes_entrega'].every(t => contar(banco, t) === 1)
    && contar(banco, 'regiao_bairros') === 2 && contar(banco, 'embalagem_produtos') === 1 && contar(banco, 'promocao_itens') === 1, 'fornecedor, entregador, região+bairros, aplicativo, embalagem, promoção, funcionário');
  ok(contar(banco, 'auditoria') === antes.aud && contar(banco, 'auditoria_alteracoes') > 0, `auditoria (${contar(banco, 'auditoria')} registros, com alterações)`);
  ok(banco.T.empresas[0].nome === 'Cantina da Praça' && banco.T.empresas[0].cnpj === '11.222.333/0001-81' && banco.T.empresas[0].config.taxaServico === 12, 'empresa: nome, CNPJ e configurações');
  ok(banco.T.categorias_financeiras.some(c => c.nome === 'Embalagens descartáveis') && banco.T.formas_pagamento.length === 8 && banco.T.mesas.length === 12, 'categoria financeira nova; formas e mesas sem duplicar');
  ok(banco.T.vendas.every(v => !v.extra.id || v.extra.id === v.id) && banco.T.caixa_movimentos.every(m => m.caixa_id), 'colunas e extra coerentes');

  pag = await abrirPagina(mem, banco); D = pag.D;
  ok(!pag.recarregou(), 'segunda abertura: carrega do banco');
  ok(D.vendas().length === 3 && D.caixaAberto() && D.vendaDaMesa(D.mesas().find(m => m.numero === '03').id), 'vendas, caixa aberto e mesa 03 ocupada voltam do banco');
  const vbd = D.vendas().find(v => v.numero === vb.numero);
  ok(D.produtoPorId(vbd.itens[0].produtoId)?.nome === 'Burger Clássico 180g' && vbd.itens[0].adicionais[0].nome === 'Ao ponto', 'venda do balcão inteira (produto e adicional)');
  ok(D.totaisVenda(D.vendas().find(v => v.tipo === 'DELIVERY')).embalagem === 3 && D.vendas().find(v => v.tipo === 'DELIVERY').aplicativo.nome === 'iFood', 'delivery com embalagem e aplicativo');
  ok(D.saldoConta(D.contasBancarias()[0].id) === 1000 + 20 - 3000, `saldo da conta bancária (${D.saldoConta(D.contasBancarias()[0].id)})`);
  ok(D.config().nome === 'Cantina da Praça' && D.config().taxaServico === 12 && D.categorias().PAGAR.includes('Embalagens descartáveis'), 'configurações e categorias financeiras voltam do banco');
  ok(D.auditoria().length >= antes.aud && D.auditoria().every(a => a.id), 'auditoria volta do banco');

  // ---- 2. Dia a dia: cada ação grava ----
  const chamadasAntes = banco.chamadas();
  D.adicionarItem(D.vendaDaMesa(D.mesas().find(m => m.numero === '03').id).id, D.produtos().find(x => x.nome === 'Batata Frita').id, {quantidade: 1});
  await espera(80);
  const mesaBanco = banco.T.vendas.find(v => v.mesa_numero === '03');
  ok(banco.T.venda_itens.filter(i => i.venda_id === mesaBanco.id).length === 2, 'item lançado na mesa vai para o banco');
  ok(banco.chamadas() - chamadasAntes < 25, `grava só o que mudou (${banco.chamadas() - chamadasAntes} chamadas)`);
  const vm2 = D.vendaDaMesa(D.mesas().find(m => m.numero === '03').id);
  D.receberParcial(vm2.id, {valor: D.totaisVenda(vm2).restante, pagamentos: [{formaId: D.formasAtivas().find(f => f.tipo === 'PIX').id, valor: D.totaisVenda(vm2).restante}]});
  await espera(80);
  ok(banco.T.vendas.find(v => v.id === vm2.id).status === 'FINALIZADA' && banco.T.venda_pagamentos.some(x => x.venda_id === vm2.id), 'fechar a conta da mesa: status e pagamento no banco');
  const nova = D.registrarVenda({itens: [{produtoId: D.produtos().find(x => x.nome.startsWith('Coca-Cola Lata')).id, quantidade: 3}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '50'}]});
  await espera(80);
  ok(banco.T.estoque_movimentos.some(m => m.venda_id === nova.id) && banco.T.produtos.find(x => x.nome.startsWith('Coca-Cola Lata')).estoque === 19, 'venda baixa o estoque no banco (24 − 2 − 3 = 19)');
  D.cancelarVenda(nova.id, 'teste');
  await espera(80);
  ok(banco.T.vendas.find(v => v.id === nova.id).status === 'CANCELADA' && banco.T.caixa_movimentos.some(m => m.tipo === 'ESTORNO'), 'cancelamento e estorno no banco');
  const conta2 = D.contas().find(c => c.descricao === 'Aluguel');
  D.estornarBaixa(conta2.id);
  await espera(80);
  ok(banco.T.contas.find(c => c.id === conta2.id).status === 'ABERTA' && banco.T.conta_bancaria_movimentos.length === 1, 'estorno de baixa: conta volta a aberta e sai do extrato');

  // ---- 3. Dois computadores ao mesmo tempo ----
  const mem2 = {local: {}, sessao: {}};
  entrar(mem2, 'u1', 'A');
  await abrirPagina(mem2, banco);                     // primeira vez (navegador novo)
  let pagB = await abrirPagina(mem2, banco);           // abre carregando do banco
  const DB_ = pagB.D;
  ok(DB_.vendas().length === D.vendas().length && DB_.caixaAberto(), `computador B vê as ${DB_.vendas().length} vendas e o caixa aberto`);
  // A e B criam uma venda cada, ao mesmo tempo, com o mesmo número
  global.RestDados = D;
  const vA = D.registrarVenda({itens: [{produtoId: D.produtos().find(x => x.nome === 'X-Salada').id, quantidade: 1}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '20'}]});
  const vB = DB_.registrarVenda({itens: [{produtoId: DB_.produtos().find(x => x.nome === 'X-Tudo').id, quantidade: 1}], pagamentos: [{formaId: DB_.formasAtivas()[0].id, valor: '30'}]});
  ok(vA.numero === vB.numero, `preparado: A e B criaram a venda #${vA.numero} ao mesmo tempo`);
  await espera(1500);
  const numeros = banco.T.vendas.map(v => v.numero);
  ok(new Set(numeros).size === numeros.length && banco.T.vendas.some(v => v.id === vA.id) && banco.T.vendas.some(v => v.id === vB.id), `as duas vendas estão no banco, sem número repetido (${banco.T.vendas.filter(v => [vA.id, vB.id].includes(v.id)).map(v => v.numero).join(' e ')})`);
  ok(D.vendas().some(v => v.id === vB.id) && DB_.vendas().some(v => v.id === vA.id), 'tempo real: A vê a venda do B e B vê a do A');
  // B lança item numa mesa; A recebe na hora
  const mesaB = DB_.novaVenda({tipo: 'MESA', mesaId: DB_.mesas().find(m => m.numero === '07').id});
  DB_.adicionarItem(mesaB.id, DB_.produtos().find(x => x.nome === 'X-Bacon').id, {quantidade: 2});
  await espera(1500);
  ok(D.vendaDaMesa(D.mesas().find(m => m.numero === '07').id)?.itens.length === 1, 'mesa aberta no B aparece ocupada no A, com o item');
  ok(D.filaProducao().some(x => x.venda.id === mesaB.id), 'fila de produção do A recebe o pedido do B');
  // Produto alterado no A aparece no B
  D.salvarProduto({...D.produtos().find(x => x.nome === 'X-Salada'), preco: '22'}, D.produtos().find(x => x.nome === 'X-Salada').id);
  await espera(1500);
  ok(DB_.produtos().find(x => x.nome === 'X-Salada').preco === 22, 'preço alterado no A aparece no B');

  // ---- 4. Excluir produto que tem movimentos de estoque não quebra ----
  const ins = D.salvarProduto({nome: 'Guardanapo', tipo: 'INSUMO', grupoId: D.grupos()[0].id, unidade: 'PCT', estoque: '10'});
  await espera(80);
  D.excluirProduto(ins.id);
  await espera(120);
  ok(!banco.T.produtos.some(x => x.id === ins.id) && banco.T.estoque_movimentos.some(m => m.produto_nome === 'Guardanapo' && m.produto_id === null), 'produto excluído: o movimento de estoque fica, sem a ligação');

  // ---- 5. Demonstração fica só no navegador ----
  global.RestDados = D;
  const vendasAntes = banco.T.vendas.length;
  D.removerDemonstracao(); D.fecharCaixa ? null : null;
  ok(banco.T.vendas.length === vendasAntes, 'dados de demonstração não vão para o banco');
  process.exit(process.exitCode || 0);
})().catch(e => { console.error(e); process.exit(1); });
