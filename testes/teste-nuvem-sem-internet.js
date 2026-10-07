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
  await banco.cliente.from('formas_pagamento').insert([{nome: 'Dinheiro', tipo: 'DINHEIRO', ordem: 1, ativo: true}]);
  const mem = {local: {}, sessao: {}};
  entrar(mem, 'u1', 'A');
  // 1ª abertura: junta e recarrega; 2ª: carrega do banco
  let pg = await abrirPagina(mem, banco);
  ok(pg.recarregou(), 'primeira abertura junta e recarrega');
  pg = await abrirPagina(mem, banco);
  ok(pg.N.ativa, 'segunda abertura: sincronizando com o banco');
  let D = pg.D;
  ok(contar(banco, 'produtos') === 0, 'cardápio de exemplo do navegador não foi para a empresa vazia');
  const grupo = D.salvarGrupo({nome: 'Lanches'});
  D.salvarProduto({nome: 'X-Teste', grupoId: grupo.id, preco: '20', tipo: 'VENDA', unidade: 'UN', ativo: true});
  D.abrirCaixa({valorInicial: '50'});
  await espera(300);
  ok(contar(banco, 'caixas') === 1, 'caixa aberto foi para o banco');
  ok(!mem.local.mga_nuvemSujos, 'sem pendência depois de gravar');
  ok(banco.T.caixas.every(c => c.empresa_id === 'A'), 'linhas gravadas levam a empresa');

  // Sem internet (sem sessão): segue com o navegador e marca pendência
  banco.comoEmpresa(null);
  pg = await abrirPagina(mem, banco);
  D = pg.D;
  ok(!pg.N.ativa, 'sem sessão: modo deste navegador');
  const p = D.produtos().find(x => x.ativo && !x.tamanhos?.length && !(x.gruposAdicionais || []).length && x.tipo !== 'INSUMO');
  const v = D.registrarVenda({itens: [{produtoId: p.id, quantidade: 1}], pagamentos: [{formaId: D.formasAtivas()[0].id, valor: '500'}]});
  ok(JSON.parse(mem.local.mga_nuvemSujos || '{}').tabelas?.vendas?.includes(v.id), 'venda sem internet fica anotada no diário de pendências');
  ok(!banco.T.vendas.some(x => x.id === v.id), 'venda ainda não está no banco');

  // Volta a internet: abre de novo e a venda vai para o banco, sem sumir da tela
  banco.comoEmpresa('A');
  pg = await abrirPagina(mem, banco);
  await espera(300);
  ok(pg.N.ativa, 'com sessão de novo: sincronizando');
  ok(banco.T.vendas.some(x => x.id === v.id), 'a venda feita sem internet chegou ao banco');
  ok(pg.D.vendas().some(x => x.id === v.id), 'e continua no sistema depois de carregar do banco');
  ok(!mem.local.mga_nuvemSujos, 'pendência limpa');

  // Incidente de 06/10: produto excluído direto no banco não pode voltar
  // 1. Saiu do sistema (a gravação da auditoria da saída ficou pendente), produto apagado no banco, entra de novo
  const y = pg.D.salvarProduto({nome: 'Y-Teste', grupoId: pg.D.grupos()[0].id, preco: '9', tipo: 'VENDA', unidade: 'UN', ativo: true});
  await espera(300);
  ok(banco.T.produtos.some(x => x.id === y.id), 'produto Y foi para o banco');
  mem.local.mga_nuvemSujos = JSON.stringify({empresa: 'A', tabelas: {auditoria: [pg.D.auditoria().slice(-1)[0].id]}, config: false});
  await banco.cliente.from('produtos').delete().in('id', [y.id]);
  pg = await abrirPagina(mem, banco);
  await espera(300);
  ok(!banco.T.produtos.some(x => x.id === y.id) && !pg.D.produtoPorId(y.id), 'saiu, apagaram no banco, entrou de novo: o produto não volta');
  // 2. Aba que não ficou sabendo da exclusão (tempo real perdido) edita o produto apagado
  const z = pg.D.salvarProduto({nome: 'Z-Teste', grupoId: pg.D.grupos()[0].id, preco: '7', tipo: 'VENDA', unidade: 'UN', ativo: true});
  await espera(300);
  banco.limparOuvintes();
  await banco.cliente.from('produtos').delete().in('id', [z.id]);
  pg.D.salvarProduto({...pg.D.produtoPorId(z.id), preco: '8'}, z.id);
  await espera(400);
  ok(!banco.T.produtos.some(x => x.id === z.id), 'aba desatualizada edita produto apagado: o banco não recria');
  ok(!pg.D.produtoPorId(z.id), 'e o produto some também da tela dessa aba');
  ok(!mem.local.mga_nuvemSujos, 'nada fica pendente depois');

  // Outra empresa guardada neste navegador e sem internet: não mostra os dados dela
  const mem2 = {local: {...mem.local}, sessao: {}};
  entrar(mem2, 'u2', 'B');
  banco.comoEmpresa(null);
  let bloqueou = false;
  global.document = {createElement: () => ({setAttribute(){}, textContent: '', className: ''}), body: {appendChild(){}}};
  const antes = global.document;
  pg = await (async () => { const r = abrirPagina(mem2, banco); global.document.getElementById = id => (id === 'appShell' ? {set innerHTML(v){ bloqueou = /Não foi possível carregar/.test(v); }} : null); return r; })();
  ok(bloqueou || !pg.N.ativa, 'outra empresa sem internet: ' + (bloqueou ? 'tela bloqueada' : 'sem bloqueio (documento falso)'));
  console.log(process.exitCode ? 'HOUVE FALHAS' : 'TUDO OK');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
