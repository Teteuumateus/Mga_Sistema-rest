// ---- Navegação: menu lateral agrupado ----
// Cada rota aponta para um painel e, dentro do PDV, para uma das telas internas (sub-abas ocultas).
const ROTAS = {
  'pdv/dashboard':         {painel: 'pdv', aba: 'dashboard',     titulo: 'PDV › Dashboard'},
  'pdv/vender':            {painel: 'pdv', aba: 'vender',        titulo: 'PDV › Vender'},
  'pdv/caixa':             {painel: 'pdv', aba: 'caixa',         titulo: 'PDV › Caixa'},
  'pdv/vendas':            {painel: 'pdv', aba: 'vendas',        titulo: 'PDV › Vendas'},
  'estoque/produtos':      {painel: 'pdv', aba: 'cadastro',      titulo: 'Estoque › Produtos'},
  'estoque/entrada':       {painel: 'pdv', aba: 'estoque',       titulo: 'Estoque › Entrada'},
  'estoque/saida':         {painel: 'pdv', aba: 'saida',         titulo: 'Estoque › Saída'},
  'estoque/movimentacoes': {painel: 'pdv', aba: 'movimentacoes', titulo: 'Estoque › Movimentações'},
  'estoque/inventario':    {painel: 'pdv', aba: 'inventario',    titulo: 'Estoque › Inventário'},
  'clientes/lista':        {painel: 'pdv', aba: 'clientes',      titulo: 'Clientes'},
  'clientes/historico':    {painel: 'pdv', aba: 'clihist',       titulo: 'Clientes › Histórico'},
  'relatorios/vendas':     {painel: 'pdv', aba: 'relatorio', relatorio: 'vendas',     titulo: 'Relatórios › Vendas'},
  'relatorios/produtos':   {painel: 'pdv', aba: 'relatorio', relatorio: 'produtos',   titulo: 'Relatórios › Produtos'},
  'relatorios/estoque':    {painel: 'pdv', aba: 'relatorio', relatorio: 'estoque',    titulo: 'Relatórios › Estoque'},
  'relatorios/financeiro': {painel: 'pdv', aba: 'relatorio', relatorio: 'financeiro', titulo: 'Relatórios › Financeiro'},
  'gestao/visao':          {painel: 'gestao', gestaoAba: 'pdv',       titulo: 'Gestão › Visão geral'},
  'gestao/auditoria':      {painel: 'gestao', gestaoAba: 'auditoria', titulo: 'Auditoria'},
  'gestao/dados':          {painel: 'gestao', gestaoAba: 'dados',     titulo: 'Gestão › Dados do sistema'},
  'food/painel':           {painel: 'food', foodAba: 'painel',   titulo: 'Food › Dashboard'},
  'food/pedido':           {painel: 'food', foodAba: 'pedido',   titulo: 'Food › Novo pedido'},
  'food/pedidos':          {painel: 'food', foodAba: 'pedidos',  titulo: 'Food › Pedidos'},
  'food/importar':         {painel: 'food', foodAba: 'importar', titulo: 'Food › Importar vendas'},
  'food/cardapio':         {painel: 'food', foodAba: 'cardapio', titulo: 'Food › Produtos'},
  'food/ficha':            {painel: 'food', foodAba: 'ficha',    titulo: 'Food › Ficha técnica'},
  'food/estoque':          {painel: 'food', foodAba: 'estoque',  titulo: 'Food › Estoque'},
  'food/relatorios':       {painel: 'food', foodAba: 'relatorios', titulo: 'Food › Relatórios'},
  'food/clientes':         {painel: 'food', foodAba: 'clientes', titulo: 'Food › Clientes'},
  'food/custos':           {painel: 'food', foodAba: 'custos',   titulo: 'Food › Custos'},
  'food/insumos':          {painel: 'food', foodAba: 'insumos',  titulo: 'Food › Ingredientes'},
  'food/canais':           {painel: 'food', foodAba: 'canais',   titulo: 'Food › Plataformas'},
  'food/config':           {painel: 'food', foodAba: 'config',   titulo: 'Food › Configuração'},
  'financeiro':            {painel: 'financeiro', finAba: 'dashboard', titulo: 'Financeiro › Dashboard'},
  'fin/dashboard':         {painel: 'financeiro', finAba: 'dashboard', titulo: 'Financeiro › Dashboard'},
  'fin/receitas':          {painel: 'financeiro', finAba: 'lista', finTipo: 'receita', titulo: 'Financeiro › Receitas'},
  'fin/despesas':          {painel: 'financeiro', finAba: 'lista', finTipo: 'despesa', titulo: 'Financeiro › Despesas'},
  'fin/pagar':             {painel: 'financeiro', finAba: 'contas', finTipo: 'despesa', titulo: 'Financeiro › Contas a pagar'},
  'fin/receber':           {painel: 'financeiro', finAba: 'contas', finTipo: 'receita', titulo: 'Financeiro › Contas a receber'},
  'fin/fluxo':             {painel: 'financeiro', finAba: 'fluxo', titulo: 'Financeiro › Fluxo de caixa'},
  'fin/dre':               {painel: 'financeiro', finAba: 'dre', titulo: 'Financeiro › DRE'},
  'fin/recorrencias':      {painel: 'financeiro', finAba: 'recorrencias', titulo: 'Financeiro › Recorrências'},
  'fin/integracoes':       {painel: 'financeiro', finAba: 'integracoes', titulo: 'Financeiro › Integrações'},
  'fin/config':            {painel: 'financeiro', finAba: 'config', titulo: 'Financeiro › Configuração'},
  'modulos':               {painel: 'modulos', titulo: 'Módulos e plano'},
  'helpdesk':              {painel: 'helpdesk',   titulo: 'Help Desk'}
};
let rotaAtual = null;
let relatorioTipo = 'vendas';
let navegando = false; // evita que a sincronização reaja às próprias trocas do roteador

function marcarRota(rota){
  const r = ROTAS[rota];
  rotaAtual = rota;
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + r.painel));
  document.querySelectorAll('#sidebar [data-rota]').forEach(b => {
    const ativo = b.dataset.rota === rota;
    b.classList.toggle('active', ativo);
    if (ativo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  // Grupo do menu da tela atual (a Auditoria fica no rodapé, fora dos grupos)
  const botao = document.querySelector(`#sidebar [data-rota="${rota}"]`);
  const grupo = botao ? (botao.closest('.nav-grupo')?.dataset.grupo || null) : (rota.includes('/') ? rota.split('/')[0] : null);
  document.querySelectorAll('#navPrincipal .nav-grupo').forEach(g => {
    g.classList.toggle('grupo-ativo', g.dataset.grupo === grupo);
    // Sanfona: só o grupo da tela atual fica aberto
    definirGrupoAberto(g, g.dataset.grupo === grupo);
  });
  document.querySelector('#appShell .main').classList.remove('modo-inicio');
  document.getElementById('pageTitle').textContent = r.titulo;
  // Status do caixa / localizar venda: só nas telas do PDV
  const topo = document.querySelector('#panel-pdv .pdv-topbar');
  if (topo) topo.style.display = grupo === 'pdv' ? '' : 'none';
  document.getElementById('sidebar').classList.remove('open');
}

function irPara(rota){
  const r = ROTAS[rota];
  if (!r) return;
  navegando = true;
  marcarRota(rota);
  if (r.relatorio) relatorioTipo = r.relatorio;
  if (r.aba) document.querySelector(`#subtabsPDV .stab[data-tab="${r.aba}"]`)?.click();
  if (r.foodAba) document.querySelector(`#subtabsFood .stab[data-tab="${r.foodAba}"]`)?.click();
  if (r.finAba) { if (r.finTipo) finTipoAtual = r.finTipo; document.querySelector(`#subtabsFin .stab[data-tab="${r.finAba}"]`)?.click(); }
  if (r.painel === 'modulos') { modRascunho = null; renderModulos(); }
  if (r.gestaoAba) {
    // Na Gestão, a Auditoria tem entrada própria no menu; a barra interna mostra só os painéis
    const barra = document.getElementById('subtabsDashboard');
    // Auditoria e Dados têm entrada própria no menu: a barra interna só mostra os painéis PDV/Food/Financeiro
    const telasProprias = ['auditoria', 'dados'];
    barra.style.display = telasProprias.includes(r.gestaoAba) ? 'none' : '';
    telasProprias.forEach(t => { barra.querySelector(`.stab[data-tab="${t}"]`).style.display = 'none'; });
    const atual = barra.querySelector('.stab.active')?.dataset.tab;
    const alvo = telasProprias.includes(r.gestaoAba) ? r.gestaoAba : (atual && !telasProprias.includes(atual) ? atual : 'pdv');
    barra.querySelector(`.stab[data-tab="${alvo}"]`).click();
  }
  navegando = false;
  lsSet('ultimaRota', rota);
}

function definirGrupoAberto(grupo, aberto){
  grupo.classList.toggle('recolhido', !aberto);
  grupo.querySelector('.nav-titulo').setAttribute('aria-expanded', String(aberto));
}

// Código antigo que troca de tela clicando nas sub-abas continua funcionando:
// a troca é refletida no menu e no título.
function sincronizarRotaPorAba(aba){
  if (navegando) return;
  const rota = aba === 'relatorio' ? 'relatorios/' + relatorioTipo : Object.keys(ROTAS).find(k => ROTAS[k].aba === aba);
  if (rota) { marcarRota(rota); lsSet('ultimaRota', rota); }
}

document.querySelectorAll('#sidebar [data-rota]').forEach(b => b.addEventListener('click', () => irPara(b.dataset.rota)));
// Clicar no título do grupo (ex.: PDV) abre as opções dele (Dashboard, Vender, Caixa, Vendas)
// no menu e na tela, sobre fundo azul. A tela só carrega quando uma opção é escolhida.
const DESCRICAO_TELA = {
  'pdv/dashboard': 'Vendas do dia, ticket médio e gráficos', 'pdv/vender': 'Registrar uma nova venda',
  'pdv/caixa': 'Abrir, fechar, sangria e suprimento', 'pdv/vendas': 'Histórico, cancelamentos e devoluções',
  'estoque/produtos': 'Cadastro de produtos', 'estoque/entrada': 'Registrar compras e reposição',
  'estoque/saida': 'Perdas, consumo e ajustes', 'estoque/movimentacoes': 'Tudo que entrou e saiu',
  'estoque/inventario': 'Contagem e conferência', 'clientes/lista': 'Cadastro de clientes',
  'clientes/historico': 'Compras por cliente', 'relatorios/vendas': 'Vendas por período',
  'relatorios/produtos': 'Produtos mais vendidos', 'relatorios/estoque': 'Posição e valor do estoque',
  'relatorios/financeiro': 'Receitas e formas de pagamento', 'gestao/visao': 'Resumo de todos os módulos',
  'gestao/auditoria': 'Quem fez o quê e quando', 'gestao/dados': 'Backup e limpeza',
  'food/painel': 'Faturamento, custos, taxas e lucro', 'food/pedido': 'Lançar um pedido', 'food/pedidos': 'Quadro de pedidos',
  'food/importar': 'Ler prints das plataformas', 'food/cardapio': 'Cardápio: preços, adicionais e combos',
  'food/ficha': 'Ingredientes e custo de cada produto', 'food/estoque': 'Saldo e baixa automática dos ingredientes',
  'food/relatorios': 'Fechamento do dia, ganhos e perdas', 'food/clientes': 'Quem compra, quanto e por qual canal',
  'food/custos': 'Custos fixos e ponto de equilíbrio',
  'food/insumos': 'Ingredientes e preços de compra', 'food/canais': 'Canais de venda e taxas', 'food/config': 'Tipo de negócio e metas de margem'
};
const textoProprio = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
function abrirGrupoMenu(grupo){
  const g = document.querySelector(`#navPrincipal .nav-grupo[data-grupo="${grupo}"]`);
  if (!g) return;
  rotaAtual = null;
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-inicio'));
  document.querySelectorAll('#sidebar [data-rota]').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  document.querySelectorAll('#navPrincipal .nav-grupo').forEach(x => {
    x.classList.toggle('grupo-ativo', x === g);
    definirGrupoAberto(x, x === g);
  });
  const titulo = g.querySelector('.nav-titulo');
  const nome = textoProprio(titulo);
  document.getElementById('pageTitle').textContent = nome;
  document.getElementById('inicioTitulo').textContent = nome;
  document.getElementById('inicioIcone').textContent = titulo.querySelector('.ic')?.textContent || '';
  document.getElementById('inicioOpcoes').innerHTML = [...g.querySelectorAll('[data-rota]')].map(b => {
    const atalho = b.querySelector('kbd') ? ` <kbd>${b.querySelector('kbd').textContent}</kbd>` : '';
    return `<button type="button" class="inicio-opcao" data-ir="${b.dataset.rota}"><b>${textoProprio(b)}${atalho}</b><small>${DESCRICAO_TELA[b.dataset.rota] || ''}</small><span class="inicio-seta">→</span></button>`;
  }).join('');
  document.querySelector('#appShell .main').classList.add('modo-inicio');
  document.getElementById('sidebar').classList.remove('open');
}
// ---- Boas-vindas: tela inicial ao entrar e ao clicar no nome MGA ----
const DESCRICAO_MODULO = {
  pdv: 'Vender, caixa e histórico de vendas', estoque: 'Produtos, entradas, saídas e inventário',
  clientes: 'Cadastro e histórico de compras', relatorios: 'Vendas, produtos, estoque e financeiro',
  gestao: 'Visão geral, auditoria e dados', food: 'Pedidos, fichas técnicas e lucro real',
  financeiro: 'Contas e movimentações financeiras', fin: 'Receitas, despesas, contas e fluxo de caixa', helpdesk: 'Chamados e atendimento'
};
function abrirBoasVindas(){
  rotaAtual = null;
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-boasvindas'));
  document.querySelectorAll('#sidebar [data-rota]').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  document.querySelectorAll('#navPrincipal .nav-grupo').forEach(g => { g.classList.remove('grupo-ativo'); definirGrupoAberto(g, false); });
  document.getElementById('pageTitle').textContent = 'Início';
  const agora = new Date();
  const h = agora.getHours();
  const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('bvTitulo').textContent = `${saudacao}, ${usuarioAtual}! Bem-vindo(a) ao MGA`;
  const data = agora.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  document.getElementById('bvData').textContent = data.charAt(0).toUpperCase() + data.slice(1);
  // Resumo rápido do dia
  const hoje = agora.toDateString();
  const vendasHoje = vendasRealizadas.filter(v => new Date(v.data).toDateString() === hoje && !vendaCancelada(v));
  const totalHoje = vendasHoje.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const repor = produtosParaRepor().length;
  const pedidosHoje = foodPedidos.filter(p => new Date(p.data).toDateString() === hoje && p.status !== 'cancelado').length;
  const card = (rotulo, valor, sub, rota) => `<button type="button" class="bv-card" data-ir="${rota}"><span>${rotulo}</span><b>${valor}</b><small>${sub}</small></button>`;
  document.getElementById('bvResumo').innerHTML = [
    card('Caixa', caixa.aberto ? '● Aberto' : '○ Fechado', caixa.aberto ? 'pronto para vender' : 'abra para começar a vender', 'pdv/caixa'),
    card('Vendas hoje', moeda(totalHoje), `${vendasHoje.length} venda${vendasHoje.length === 1 ? '' : 's'}`, 'pdv/dashboard'),
    card('Estoque baixo', repor, repor ? `produto${repor === 1 ? '' : 's'} para repor` : 'tudo em dia', 'estoque/entrada'),
    card('Pedidos Food hoje', pedidosHoje, 'delivery e balcão', 'food/pedidos')
  ].filter((c, k) => moduloAtivo(k < 3 ? 'pdv' : 'food')).concat(moduloAtivo('financeiro') ? [cardFinBoasVindas()] : []).join('');
  // Atalhos para os módulos (mesmos do menu lateral)
  const grupos = [...document.querySelectorAll('#navPrincipal .nav-grupo')].filter(g => !g.hidden).map(g => {
    const t = g.querySelector('.nav-titulo');
    return `<button type="button" class="inicio-opcao" data-abrir-grupo="${g.dataset.grupo}"><b>${t.querySelector('.ic')?.textContent || ''} ${textoProprio(t)}</b><small>${DESCRICAO_MODULO[g.dataset.grupo] || ''}</small><span class="inicio-seta">→</span></button>`;
  });
  const simples = [...document.querySelectorAll('#navPrincipal .nav-simples')].map(b =>
    `<button type="button" class="inicio-opcao" data-ir="${b.dataset.rota}"><b>${b.querySelector('.ic')?.textContent || ''} ${textoProprio(b)}</b><small>${DESCRICAO_MODULO[b.dataset.rota] || ''}</small><span class="inicio-seta">→</span></button>`);
  document.getElementById('bvModulos').innerHTML = grupos.concat(simples).join('');
  document.querySelector('#appShell .main').classList.add('modo-inicio');
  document.getElementById('sidebar').classList.remove('open');
}
document.getElementById('btnInicio').addEventListener('click', abrirBoasVindas);
document.getElementById('bvModulos').addEventListener('click', e => {
  const b = e.target.closest('[data-abrir-grupo]');
  if (b) abrirGrupoMenu(b.dataset.abrirGrupo);
});

document.querySelectorAll('#navPrincipal .nav-titulo').forEach(t => t.addEventListener('click', () => {
  const g = t.closest('.nav-grupo');
  // Já está nas opções deste grupo: o clique só recolhe/expande a lista lateral
  if (!rotaAtual && g.classList.contains('grupo-ativo')) { definirGrupoAberto(g, g.classList.contains('recolhido')); return; }
  abrirGrupoMenu(g.dataset.grupo);
}));
document.querySelectorAll('#subtabsPDV .stab').forEach(b => b.addEventListener('click', () => sincronizarRotaPorAba(b.dataset.tab)));
document.addEventListener('click', e => {
  const alvo = e.target.closest('[data-ir]');
  if (alvo) irPara(alvo.dataset.ir);
});

// ---- Componente genérico de Cadastro (reaproveitado por cada módulo) ----
function criarCadastroGenerico(containerId, config){
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <div class="cad-toolbar">
      <input type="text" class="search gcad-busca" style="width:260px;" placeholder="Buscar...">
      <button class="btn gcad-novo">+ Novo</button>
    </div>
    <div class="card gcad-form" style="display:none;margin-bottom:20px;">
      <div class="form-grid">
        ${config.campos.map(c=>`<div class="field"><label>${c.label}</label><input type="text" data-campo="${c.id}" placeholder="${c.placeholder||''}"></div>`).join('')}
      </div>
      <div style="display:flex;gap:10px;">
        <button class="btn gcad-salvar">Salvar</button>
        <button class="btn btn-ghost gcad-cancelar">Cancelar</button>
      </div>
    </div>
    <div class="card">
      <table><thead><tr>${config.colunas.map(c=>`<th>${c.label}</th>`).join('')}<th></th></tr></thead>
      <tbody class="gcad-tbody"></tbody></table>
      <p class="empty-msg gcad-vazio" style="display:none;">Nenhum registro encontrado.</p>
    </div>`;
  const dados = config.dados;
  // Se houver dados salvos localmente para essa chave, eles substituem os dados de exemplo
  if (config.storageKey) {
    const salvos = lsGet(config.storageKey, null);
    if (salvos) { dados.length = 0; salvos.forEach(d => dados.push(d)); }
  }
  function persistir(){ if (config.storageKey) lsSet(config.storageKey, dados); }
  let editandoIndex = null;
  function render(){
    const busca = el.querySelector('.gcad-busca').value.toLowerCase();
    const tbody = el.querySelector('.gcad-tbody');
    const filtrados = dados.map((d,i)=>({d,i})).filter(o => JSON.stringify(o.d).toLowerCase().includes(busca));
    tbody.innerHTML = '';
    filtrados.forEach(({d,i}) => {
      const tr = document.createElement('tr');
      tr.innerHTML = config.colunas.map(c => `<td>${c.format ? c.format(d[c.key]) : (d[c.key] || '—')}</td>`).join('') +
        `<td><div class="row-actions"><button class="edit" data-i="${i}">✎</button><button class="del" data-i="${i}">✕</button></div></td>`;
      tbody.appendChild(tr);
    });
    el.querySelector('.gcad-vazio').style.display = filtrados.length ? 'none' : 'block';
    tbody.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => {
      if (confirm('Excluir este registro?')) {
        const removido = dados.splice(b.dataset.i, 1)[0];
        if (config.modulo) registrarAuditoria(config.modulo, `${config.entidade || 'Registro'} "${removido[config.campos[0].id]}" excluído`);
        persistir(); render(); if(config.onChange) config.onChange();
      }
    }));
    tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => {
      editandoIndex = Number(b.dataset.i);
      const reg = dados[editandoIndex];
      el.querySelectorAll('[data-campo]').forEach(inp => inp.value = reg[inp.dataset.campo] ?? '');
      el.querySelector('.gcad-form').style.display = 'block';
    }));
  }
  el.querySelector('.gcad-busca').addEventListener('input', render);
  el.querySelector('.gcad-novo').addEventListener('click', () => {
    editandoIndex = null;
    el.querySelectorAll('[data-campo]').forEach(inp => inp.value = '');
    el.querySelector('.gcad-form').style.display = 'block';
  });
  el.querySelector('.gcad-cancelar').addEventListener('click', () => el.querySelector('.gcad-form').style.display = 'none');
  el.querySelector('.gcad-salvar').addEventListener('click', () => {
    const primeiro = config.campos[0].id;
    const novo = {};
    el.querySelectorAll('[data-campo]').forEach(inp => {
      const campo = config.campos.find(c => c.id === inp.dataset.campo);
      novo[inp.dataset.campo] = campo.parse ? campo.parse(inp.value) : inp.value.trim();
    });
    if (!novo[primeiro]) return;
    if (config.onSave) config.onSave(novo, editandoIndex !== null ? dados[editandoIndex] : null);
    if (config.modulo) {
      const antigo = editandoIndex !== null ? dados[editandoIndex] : null;
      const nome = `${config.entidade || 'Registro'} "${novo[primeiro]}"`;
      if (!antigo) registrarAuditoria(config.modulo, `${nome} cadastrado`);
      else {
        const campos = Object.fromEntries(config.campos.map(c => [c.id, {nome: c.label}]));
        const alteracoes = diferencas(antigo, novo, campos);
        if (alteracoes.length) registrarAuditoria(config.modulo, `${nome} editado`, {alteracoes});
      }
    }
    if (editandoIndex !== null) dados[editandoIndex] = novo;
    else dados.push(novo);
    editandoIndex = null;
    el.querySelector('.gcad-form').style.display = 'none';
    persistir();
    render();
    if (config.onChange) config.onChange();
  });
  render();
}

// Alterna entre sub-abas genéricas (Operação/Visão geral x Cadastro) de cada módulo
function wireSubtabs(containerId, panesMap){
  const container = document.getElementById(containerId);
  container.querySelectorAll('.stab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.keys(panesMap).forEach(key => {
        document.getElementById(panesMap[key]).style.display = (key === btn.dataset.tab) ? 'block' : 'none';
      });
    });
  });
}

document.getElementById('menuToggle').addEventListener('click', ()=>{
  document.getElementById('sidebar').classList.toggle('open');
});

// ---- Persistência local (localStorage) ----
function lsGet(key, def){
  try{
    const raw = localStorage.getItem('mga_'+key);
    return raw !== null ? JSON.parse(raw) : def;
  }catch(e){ return def; }
}
function lsSet(key, val){
  try{ localStorage.setItem('mga_'+key, JSON.stringify(val)); }catch(e){ /* storage indisponível */ }
}

// ---- MGA PDV (funciona de forma independente, com catálogo próprio) ----
const produtosPDVPadrao = [
  {codigo:'001', barras:'7891000001010', nome:'Camisa Polo', categoria:'Vestuário', preco:79.90, custo:40, estoque:32, minimo:5, ativo:true},
  {codigo:'002', barras:'7891000001027', nome:'Bermuda Jeans', categoria:'Vestuário', preco:89.90, custo:45, estoque:20, minimo:5, ativo:true},
  {codigo:'003', barras:'7891000001034', nome:'Boné Aba Reta', categoria:'Acessórios', preco:39.90, custo:18, estoque:15, minimo:5, ativo:true},
  {codigo:'004', barras:'7891000001041', nome:'Meia Cano Alto', categoria:'Acessórios', preco:14.90, custo:6, estoque:4, minimo:10, ativo:true},
  {codigo:'005', barras:'7891000001058', nome:'Refrigerante 2L', categoria:'Bebidas', preco:9.90, custo:5, estoque:24, minimo:6, ativo:true},
  {codigo:'006', barras:'7891000001065', nome:'Água Mineral', categoria:'Bebidas', preco:3.50, custo:1.5, estoque:50, minimo:10, ativo:true},
];
const produtosPDV = lsGet('produtos', produtosPDVPadrao);
let carrinho = [];
let pagamentosVenda = [];
const caixa = lsGet('caixa', {aberto:false, valorInicial:0, movimentos:[]});
let vendasRealizadas = lsGet('vendas', []);
let vendaSeq = lsGet('vendaSeq', 1032);
let ultimaMovEstoque = lsGet('ultimaMovEstoque', null);
const usuarioAtual = lsGet('usuario', 'Operador');

// ---- Auditoria: quem fez cada alteração, e quando ----
// Cada registro: data, usuário, módulo, descrição, alterações (campo: antes → depois) e referência (ex.: venda).
const LIMITE_AUDITORIA = 5000; // mantém os mais recentes para não estourar o armazenamento local
let auditoria = lsGet('auditoria', []);
function registrarAuditoria(modulo, descricao, extra){
  auditoria.push({data: new Date().toISOString(), usuario: usuarioAtual, modulo, descricao, ...(extra || {})});
  if (auditoria.length > LIMITE_AUDITORIA) auditoria.splice(0, auditoria.length - LIMITE_AUDITORIA);
  lsSet('auditoria', auditoria);
  if (typeof renderAuditoria === 'function' && document.getElementById('gestaoAuditoria')?.offsetParent) renderAuditoria();
}
// Compara dois objetos nos campos indicados e devolve a lista de alterações
function diferencas(antes, depois, campos){
  return Object.entries(campos).map(([k, rotulo]) => {
    const fmt = v => (v === null || v === undefined || v === '') ? '—' : rotulo.moeda ? moeda(v) : typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v);
    const a = antes ? antes[k] : undefined, d = depois[k];
    if (k === 'foto') return (a || '') !== (d || '') ? {campo: rotulo.nome, antes: a ? 'com foto' : 'sem foto', depois: d ? 'com foto' : 'sem foto'} : null;
    return fmt(a) !== fmt(d) ? {campo: rotulo.nome, antes: fmt(a), depois: fmt(d)} : null;
  }).filter(Boolean);
}

function moeda(v){ return 'R$ ' + Number(v||0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
function paraNumero(v){ return parseFloat(String(v).replace(',', '.')) || 0; }
function dataHoraCurta(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

// ---- Movimentações de estoque ----
// Toda alteração de estoque vira um lançamento: Inicial → Entrada → Venda → Devolução → Saída → Ajuste.
// O estoque atual de um produto é sempre a soma das quantidades lançadas para ele.
const TIPOS_MOV = ['Inicial', 'Entrada', 'Venda', 'Devolução', 'Saída', 'Ajuste'];
let movEstoque = lsGet('movEstoque', null);

// Primeira execução com o livro de movimentações: reconstrói o histórico a partir
// do estoque atual + saídas por venda já registradas, para que os números fechem.
if (!Array.isArray(movEstoque)) {
  movEstoque = [];
  const saidasAntigas = lsGet('saidasEstoque', []).slice().sort((a,b) => new Date(a.data) - new Date(b.data));
  const vendidoPorNome = {};
  saidasAntigas.forEach(s => { vendidoPorNome[s.produto] = (vendidoPorNome[s.produto]||0) + s.quantidade; });
  const dataAbertura = new Date((saidasAntigas.length ? new Date(saidasAntigas[0].data).getTime() : Date.now()) - 60000).toISOString();
  const saldoPorNome = {};
  produtosPDV.forEach(p => {
    const inicial = p.estoque + (vendidoPorNome[p.nome]||0);
    saldoPorNome[p.nome] = inicial;
    movEstoque.push({data:dataAbertura, codigo:p.codigo, produto:p.nome, tipo:'Inicial', qtd:inicial, saldo:inicial, motivo:'Saldo de abertura', usuario:usuarioAtual});
  });
  saidasAntigas.forEach(s => {
    const prod = produtosPDV.find(p => p.nome === s.produto);
    saldoPorNome[s.produto] = (saldoPorNome[s.produto]||0) - s.quantidade;
    movEstoque.push({data:s.data, codigo:prod ? prod.codigo : null, produto:s.produto, tipo:'Venda', qtd:-s.quantidade, saldo:saldoPorNome[s.produto], motivo:'Venda #' + s.venda, venda:s.venda, usuario:usuarioAtual});
  });
  lsSet('movEstoque', movEstoque);
}

// Lança uma movimentação. Com aplicar=false o estoque do produto já foi alterado
// (ex.: pelo cadastro) e só registramos o lançamento.
function lancarMovEstoque(prod, tipo, qtd, motivo, extra, aplicar = true){
  if (aplicar) prod.estoque += qtd;
  const mov = {data:new Date().toISOString(), codigo:prod.codigo, produto:prod.nome, tipo, qtd, saldo:prod.estoque, motivo, usuario:usuarioAtual, ...(extra||{})};
  movEstoque.push(mov);
  // Baixas por venda já ficam no registro da própria venda; o resto entra na auditoria com antes → depois
  if (tipo !== 'Venda') {
    registrarAuditoria('Estoque', `Estoque de ${prod.nome} alterado (${tipo})`, {
      alteracoes: [{campo: 'Estoque', antes: String(prod.estoque - qtd), depois: String(prod.estoque)}],
      detalhe: motivo, ref: mov.venda ? {venda: mov.venda} : undefined
    });
  }
  return mov;
}
function salvarEstoque(){
  lsSet('produtos', produtosPDV);
  lsSet('movEstoque', movEstoque);
  ultimaMovEstoque = new Date().toISOString();
  lsSet('ultimaMovEstoque', ultimaMovEstoque);
}

// Soma os lançamentos por tipo (para um produto ou para todos)
function resumoMovimentos(codigo){
  const r = {Inicial:0, Entrada:0, Venda:0, 'Devolução':0, 'Saída':0, Ajuste:0, total:0};
  movEstoque.forEach(m => {
    if (codigo && m.codigo !== codigo) return;
    r[m.tipo] = (r[m.tipo]||0) + m.qtd;
    r.total += m.qtd;
  });
  return r;
}

// ---- Vendas canceladas e devolvidas ----
// Uma venda cancelada sai de todos os totais; devoluções parciais reduzem o valor líquido.
function vendaCancelada(v){ return v.status === 'cancelada'; }
function valorDevolvido(v){ return (v.devolucoes || []).reduce((s, d) => s + d.valor, 0); }
function valorLiquidoVenda(v){ return vendaCancelada(v) ? 0 : Math.max(Math.round((v.total - valorDevolvido(v)) * 100) / 100, 0); }
function vendasValidas(lista){ return lista.filter(v => !vendaCancelada(v)); }
function chaveItem(i){ return i.codigo || i.nome; }
function qtdDevolvida(v, item){
  return (v.devolucoes || []).flatMap(d => d.itens).filter(i => chaveItem(i) === chaveItem(item)).reduce((s, i) => s + i.qtd, 0);
}

function renderCatalogoPDV(){
  const busca = document.getElementById('buscaPDV').value.toLowerCase();
  const lista = document.getElementById('listaProdutosPDV');
  lista.innerHTML = '';
  produtosPDV
    .filter(p => p.ativo && (p.nome.toLowerCase().includes(busca) || p.codigo.includes(busca) || (p.barras||'').includes(busca)))
    .forEach(p => {
      const semEstoque = p.estoque <= 0;
      const div = document.createElement('button');
      div.className = 'pdv-item';
      if (semEstoque) div.style.opacity = '.5';
      if (p.foto) div.classList.add('com-foto');
      div.innerHTML = `${p.foto ? `<img class="pdv-item-foto" src="${p.foto}" alt="">` : ''}<b>${p.nome}</b><span>Cód. ${p.codigo}</span>
        ${p.estoque <= p.minimo ? `<span class="stock-tag">Estoque: ${p.estoque}</span>` : `<span>Estoque: ${p.estoque}</span>`}
        <span class="preco">${moeda(p.preco)}</span>`;
      div.addEventListener('click', () => adicionarAoCarrinho(p));
      lista.appendChild(div);
    });
}

// ---- Carrinho ----
// Cada item guarda o preço praticado (pode ser alterado com permissão), o preço de
// tabela original e o desconto do item como texto ("5,00" ou "10%").
let permissaoPrecoVenda = false; // liberada pela senha do supervisor até o fim da venda

function adicionarAoCarrinho(produto, qtd = 1){
  if (!caixa.aberto) { avisar('Abra o caixa para iniciar uma venda.', true); return false; }
  const item = carrinho.find(i => i.codigo === produto.codigo);
  const qtdAtual = item ? item.qtd : 0;
  if (qtdAtual + qtd > produto.estoque) { avisar(`Estoque insuficiente para "${produto.nome}" (disponível: ${produto.estoque}).`, true); return false; }
  if (item) item.qtd += qtd;
  else carrinho.push({codigo:produto.codigo, nome:produto.nome, preco:produto.preco, precoOriginal:produto.preco, qtd, descTexto:''});
  renderCarrinho();
  return true;
}

// Converte "5,00" (R$) ou "10%" em valor, limitado à base
function calcularDesconto(texto, base){
  const t = String(texto || '').trim();
  if (!t) return 0;
  const valor = t.endsWith('%') ? base * Math.min(paraNumero(t.slice(0, -1)), 100) / 100 : paraNumero(t);
  return Math.round(Math.min(Math.max(valor, 0), base) * 100) / 100;
}

function calcularVenda(){
  const itens = carrinho.map(i => {
    const bruto = i.preco * i.qtd;
    const desconto = calcularDesconto(i.descTexto, bruto);
    return {...i, bruto, desconto, liquido: bruto - desconto};
  });
  const subtotal = itens.reduce((s,i) => s + i.bruto, 0);
  const descontoItens = itens.reduce((s,i) => s + i.desconto, 0);
  const baseVenda = subtotal - descontoItens;
  const descontoVenda = calcularDesconto(document.getElementById('descontoVenda').value, baseVenda);
  return {itens, subtotal, descontoItens, descontoVenda, total: Math.round(Math.max(baseVenda - descontoVenda, 0) * 100) / 100};
}
function totalVenda(){ return calcularVenda().total; }

function pedirPermissaoSupervisor(acao){
  if (permissaoPrecoVenda) return true;
  const senha = prompt(`Permissão necessária para ${acao}.\nSenha do supervisor:`);
  if (senha === null) return false;
  if (senha !== String(lsGet('senhaSupervisor', '1234'))) { avisar('Senha do supervisor incorreta.', true); return false; }
  permissaoPrecoVenda = true;
  return true;
}

function renderCarrinho(){
  const box = document.getElementById('carrinhoItens');
  const venda = calcularVenda();
  document.getElementById('carrinhoVazio').style.display = carrinho.length ? 'none' : 'block';
  box.innerHTML = venda.itens.map((item, i) => {
    const precoAlterado = Math.abs(item.preco - item.precoOriginal) > 0.001;
    return `
    <div class="cart-item">
      <div class="ci-top">
        <div class="ci-info">
          <b class="nome">${item.nome}</b>
          <small>Cód. ${item.codigo} · ${moeda(item.preco)} un.
            <button type="button" class="ci-preco" data-i="${i}" title="Alterar preço (requer permissão)">✎ preço</button>
            ${precoAlterado ? `<span class="ci-tag">tabela ${moeda(item.precoOriginal)}</span>` : ''}
          </small>
        </div>
        <div class="ci-valor">
          ${item.desconto > 0 ? `<s>${moeda(item.bruto)}</s>` : ''}
          <b>${moeda(item.liquido)}</b>
        </div>
      </div>
      <div class="ci-bottom">
        <div class="qtd">
          <span class="qtd-label">Qtd:</span>
          <button type="button" class="menos" data-i="${i}" aria-label="Diminuir quantidade">−</button>
          <input type="number" class="ci-qtd" data-i="${i}" value="${item.qtd}" min="1" step="1" aria-label="Quantidade">
          <button type="button" class="mais" data-i="${i}" aria-label="Aumentar quantidade">+</button>
        </div>
        <label class="ci-desc">Desc. <input type="text" data-i="${i}" value="${item.descTexto}" placeholder="R$ ou %"></label>
        <button type="button" class="rm" data-i="${i}" title="Excluir item" aria-label="Excluir item"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button>
      </div>
    </div>`;
  }).join('');

  const estoqueDe = item => produtosPDV.find(p => p.codigo === item.codigo)?.estoque ?? 0;
  box.querySelectorAll('.mais').forEach(b => b.addEventListener('click', () => {
    const item = carrinho[b.dataset.i];
    if (item.qtd + 1 > estoqueDe(item)) { avisar(`Estoque insuficiente para "${item.nome}".`, true); return; }
    item.qtd++; renderCarrinho();
  }));
  box.querySelectorAll('.menos').forEach(b => b.addEventListener('click', () => {
    const item = carrinho[b.dataset.i];
    if (item.qtd <= 1) { if (confirm(`Remover "${item.nome}" da venda?`)) carrinho.splice(b.dataset.i, 1); }
    else item.qtd--;
    renderCarrinho();
  }));
  box.querySelectorAll('.ci-qtd').forEach(inp => inp.addEventListener('change', () => {
    const item = carrinho[inp.dataset.i];
    let qtd = parseInt(inp.value, 10);
    if (!Number.isInteger(qtd) || qtd < 1) qtd = 1;
    if (qtd > estoqueDe(item)) { avisar(`Estoque insuficiente para "${item.nome}" (disponível: ${estoqueDe(item)}).`, true); qtd = estoqueDe(item); }
    item.qtd = qtd; renderCarrinho();
  }));
  box.querySelectorAll('.ci-desc input').forEach(inp => inp.addEventListener('change', () => {
    carrinho[inp.dataset.i].descTexto = inp.value.trim(); renderCarrinho();
  }));
  box.querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => { carrinho.splice(b.dataset.i, 1); renderCarrinho(); }));
  box.querySelectorAll('.ci-preco').forEach(b => b.addEventListener('click', () => {
    const item = carrinho[b.dataset.i];
    if (!pedirPermissaoSupervisor('alterar o preço')) return;
    const novo = prompt(`Novo preço unitário para "${item.nome}" (tabela: ${moeda(item.precoOriginal)}):`, item.preco.toFixed(2).replace('.', ','));
    if (novo === null) return;
    const preco = paraNumero(novo);
    if (preco <= 0) { avisar('Preço inválido.', true); return; }
    registrarAuditoria('Vendas', `Preço de ${item.nome} alterado na venda em andamento (autorizado pelo supervisor)`, {
      alteracoes: [{campo: 'Preço unitário', antes: moeda(item.preco), depois: moeda(preco)}]
    });
    item.preco = preco; renderCarrinho();
  }));
  // Carrinho esvaziado: pagamentos já lançados perdem o sentido e são descartados
  if (!carrinho.length && pagamentosVenda.length) { pagamentosVenda = []; renderPagamentos(); return; }
  atualizarTotais();
}

function renderPagamentos(){
  const box = document.getElementById('pagamentosLista');
  box.innerHTML = '';
  pagamentosVenda.forEach((p, i) => {
    const div = document.createElement('div');
    div.className = 'pag-item';
    const detalheTroco = p.troco > 0.001 ? `<small class="pag-troco">recebido ${moeda(p.recebido)} · troco ${moeda(p.troco)}</small>` : '';
    div.innerHTML = `<span>${p.forma}${p.vale ? ` <small class="pag-troco">${p.vale}</small>` : ''}${detalheTroco}</span><span>${moeda(p.valor)} <span class="rm" data-i="${i}">✕</span></span>`;
    box.appendChild(div);
  });
  box.querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => { pagamentosVenda.splice(b.dataset.i, 1); renderPagamentos(); atualizarTotais(); }));
  atualizarTotais();
}

// Carrinho vazio: área de pagamento desativada e sem nenhuma verificação/mensagem de pagamento
// Motivo que impede finalizar a venda (null = pode finalizar)
function bloqueioFinalizar(){
  if (!caixa.aberto) return 'Abra o caixa para vender.';
  if (!carrinho.length) return 'Adicione ao menos um produto.';
  if (carrinho.some(i => !(i.qtd > 0))) return 'Todos os itens precisam ter quantidade maior que zero.';
  const total = totalVenda();
  if (!(total > 0)) return 'O total da venda precisa ser maior que R$ 0,00.';
  const pago = Math.round(pagamentosVenda.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  if (pago < total - 0.001) return `Falta pagar ${moeda(total - pago)}.`;
  if (pago > total + 0.001) return 'Os pagamentos passam do total. Remova um pagamento.';
  return null;
}

function atualizarEstadoPagamento(){
  const vazio = !carrinho.length;
  ['formaPagamentoSel', 'valorPagamentoInput', 'btnAddPagamento'].forEach(id => { document.getElementById(id).disabled = vazio; });
  // Finalizar só com: produto, quantidade > 0, total > 0 e pagamento suficiente
  const bloqueio = bloqueioFinalizar();
  const btn = document.getElementById('btnFinalizar');
  btn.disabled = !!bloqueio;
  btn.title = bloqueio || '';
  const dica = document.getElementById('finalizarDica');
  dica.textContent = bloqueio && !vazio ? bloqueio : '';
  dica.style.display = dica.textContent ? 'block' : 'none';
  document.querySelector('.pdv-carrinho').classList.toggle('carrinho-vazio', vazio);
  if (vazio) {
    document.getElementById('valorPagamentoInput').value = '';
    document.getElementById('trocoBox').style.display = 'none';
    // Remove um aviso de pagamento que tenha ficado na tela
    const toast = document.getElementById('toastPDV');
    if (toast.textContent === 'A venda já está totalmente paga.') toast.style.display = 'none';
  }
  return vazio;
}

function atualizarTotais(){
  const venda = calcularVenda();
  document.getElementById('pdvSubtotal').textContent = moeda(venda.subtotal);
  document.getElementById('linhaDescItens').style.display = venda.descontoItens > 0 ? 'flex' : 'none';
  document.getElementById('pdvDescItens').textContent = '− ' + moeda(venda.descontoItens);
  document.getElementById('pdvTotal').textContent = moeda(venda.total);
  const restante = restanteAPagar(venda.total);
  const troco = trocoTotal();
  // Pagamento completo com troco em dinheiro: o box passa a destacar o troco a devolver
  const mostrarTroco = restante <= 0.001 && troco > 0.001;
  document.getElementById('boxRestante').classList.toggle('com-troco', mostrarTroco);
  document.getElementById('restanteRotulo').textContent = mostrarTroco ? 'Troco a devolver' : 'Restante a pagar';
  document.getElementById('restantePagar').textContent = moeda(mostrarTroco ? troco : restante);
  const inputValor = document.getElementById('valorPagamentoInput');
  if (document.activeElement !== inputValor && document.getElementById('formaPagamentoSel').value !== 'Vale-troca') {
    inputValor.value = restante > 0 ? restante.toFixed(2).replace('.', ',') : '';
  }
  if (atualizarEstadoPagamento()) return; // carrinho vazio: não mostra painel de troco
  atualizarPainelTroco();
}

// ---- Pagamento em dinheiro: cálculo de troco ----
// Cada pagamento guarda o valor abatido da venda (valor); em dinheiro também o
// que o cliente entregou (recebido) e o troco devolvido.
function restanteAPagar(total = totalVenda()){
  const pago = pagamentosVenda.reduce((s,p) => s + p.valor, 0);
  return Math.max(Math.round((total - pago) * 100) / 100, 0);
}
function trocoTotal(){ return pagamentosVenda.reduce((s,p) => s + (p.troco || 0), 0); }

function atualizarPainelTroco(){
  const box = document.getElementById('trocoBox');
  const restante = restanteAPagar();
  const formaSel = document.getElementById('formaPagamentoSel').value;
  const dinheiro = formaSel === 'Dinheiro';
  const inputPag = document.getElementById('valorPagamentoInput');
  inputPag.placeholder = dinheiro ? 'Cliente pagou (R$)' : formaSel === 'Vale-troca' ? 'Código do vale (ex: VT-0001)' : 'Valor (padrão: restante)';
  // No vale-troca o campo é o código, não o valor
  if (formaSel === 'Vale-troca' && /^[\d.,]+$/.test(inputPag.value)) inputPag.value = '';
  if (!dinheiro || restante <= 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  const recebido = paraNumero(document.getElementById('valorPagamentoInput').value) || restante;
  const diferenca = Math.round((recebido - restante) * 100) / 100;
  document.getElementById('trocoTotal').textContent = moeda(restante);
  document.getElementById('trocoRecebido').textContent = moeda(recebido);
  document.getElementById('trocoRotulo').textContent = diferenca < 0 ? 'Falta pagar' : 'Troco';
  document.getElementById('trocoValor').textContent = moeda(Math.abs(diferenca));
  document.getElementById('trocoLinha').classList.toggle('falta', diferenca < 0);

  // Atalhos de notas: valor exato + arredondamentos para cima comuns
  const sugestoes = [...new Set([5, 10, 20, 50, 100].map(n => Math.ceil(restante / n) * n))]
    .filter(v => v > restante + 0.001).sort((a,b) => a - b).slice(0, 3);
  const atalhos = document.getElementById('trocoAtalhos');
  atalhos.innerHTML = `<button type="button" data-v="${restante}">Exato</button>` +
    sugestoes.map(v => `<button type="button" data-v="${v}">${moeda(v)}</button>`).join('');
  atalhos.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    document.getElementById('valorPagamentoInput').value = Number(b.dataset.v).toFixed(2).replace('.', ',');
    atualizarPainelTroco();
  }));
}
document.getElementById('formaPagamentoSel').addEventListener('change', atualizarPainelTroco);
document.getElementById('valorPagamentoInput').addEventListener('input', atualizarPainelTroco);
document.getElementById('valorPagamentoInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('btnAddPagamento').click();
});

function avisar(msg, erro){
  const toast = document.getElementById('toastPDV');
  toast.textContent = msg;
  toast.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  toast.style.display = 'block';
  clearTimeout(avisar.timer);
  avisar.timer = setTimeout(() => toast.style.display = 'none', 3000);
}

// Localiza produto por código interno ou código de barras. Aceita "3*7891..." para quantidade.
function lerCodigo(valor){
  const m = valor.match(/^(\d+)\s*[*xX]\s*(.+)$/);
  const qtd = m ? parseInt(m[1], 10) : 1;
  const codigo = (m ? m[2] : valor).trim();
  const produto = produtosPDV.find(p => p.ativo && (p.codigo === codigo || p.barras === codigo));
  return {produto, qtd};
}

document.getElementById('codigoBarrasPDV').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const valor = e.target.value.trim();
  if (!valor) return;
  const {produto, qtd} = lerCodigo(valor);
  if (!produto) { avisar(`Produto não encontrado para o código "${valor}".`, true); e.target.select(); return; }
  if (adicionarAoCarrinho(produto, qtd)) e.target.value = '';
  else e.target.select();
});
document.getElementById('buscaPDV').addEventListener('input', renderCatalogoPDV);
document.getElementById('buscaPDV').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const {produto, qtd} = lerCodigo(e.target.value.trim());
  if (produto) { if (adicionarAoCarrinho(produto, qtd)) { e.target.value = ''; renderCatalogoPDV(); } }
  else avisar('Produto não encontrado para o código informado.', true);
});
// F2 foca o campo de código de barras
document.addEventListener('keydown', (e) => {
  if (e.key !== 'F2' || !moduloAtivo('pdv')) return;
  e.preventDefault();
  document.querySelector('#subtabsPDV .stab[data-tab="vender"]').click();
  document.getElementById('codigoBarrasPDV').focus();
});
document.getElementById('descontoVenda').addEventListener('input', atualizarTotais);

// Cliente e vendedor: sugestões a partir do histórico
let vendedoresPDV = lsGet('vendedores', [usuarioAtual]);
function renderSugestoesVenda(){
  document.getElementById('listaVendedoresPDV').innerHTML = vendedoresPDV.map(v => `<option value="${v}">`).join('');
}
document.getElementById('vendaVendedor').value = usuarioAtual;

function limparVenda(){
  carrinho = []; pagamentosVenda = [];
  permissaoPrecoVenda = false;
  ['descontoVenda', 'vendaObs'].forEach(id => document.getElementById(id).value = '');
  selecionarClienteVenda(null);
  renderCarrinho(); renderPagamentos();
}
document.getElementById('btnLimparVenda').addEventListener('click', () => {
  if (!carrinho.length && !pagamentosVenda.length) return;
  if (confirm('Descartar a venda atual?')) limparVenda();
});

document.getElementById('btnAddPagamento').addEventListener('click', () => {
  const forma = document.getElementById('formaPagamentoSel').value;
  const restante = restanteAPagar();
  if (!carrinho.length) return; // venda vazia: nada a pagar, nenhuma mensagem
  if (restante <= 0) { avisar('A venda já está totalmente paga.', true); return; }
  const inputValor = document.getElementById('valorPagamentoInput');

  // A prazo (fiado): exige cliente cadastrado; a venda fica "Pendente" até o recebimento
  if (forma === 'A prazo') {
    const cli = clienteDaVenda();
    if (!cli) { avisar('Para vender a prazo, selecione um cliente cadastrado.', true); document.getElementById('vendaCliente').focus(); return; }
    const valor = Math.min(paraNumero(inputValor.value) || restante, restante);
    if (valor <= 0) return;
    // Limite de crédito: o que ele já deve + o que está lançando a prazo nesta venda
    const cr = creditoCliente(cli);
    const jaNestaVenda = pagamentosVenda.filter(p => p.forma === 'A prazo').reduce((s, p) => s + p.valor, 0);
    if (cr.limite != null && cr.aberto + jaNestaVenda + valor > cr.limite + 0.001) {
      const disp = Math.max(cr.limite - cr.aberto - jaNestaVenda, 0);
      avisar(`Limite de crédito de ${cli.nome} excedido. Em aberto: ${moeda(cr.aberto)} · limite ${moeda(cr.limite)} · disponível ${moeda(disp)}.`, true);
      if (disp > 0.001) inputValor.value = numBR(disp);
      return;
    }
    pagamentosVenda.push({forma, valor});
    inputValor.value = '';
    renderPagamentos();
    avisar(`${moeda(valor)} a prazo para ${cli.nome}. A venda ficará pendente até o recebimento.`);
    return;
  }

  // Vale-troca: o campo recebe o código do vale; usa o saldo até o valor restante
  if (forma === 'Vale-troca') {
    const codigo = inputValor.value.trim().toUpperCase().replace(/^VT-?/, 'VT-').replace(/^VT-(\d+)$/, (_, n) => 'VT-' + n.padStart(4, '0'));
    const vale = valesTroca.find(x => x.codigo === codigo);
    if (!vale) { avisar('Vale-troca não encontrado. Confira o código (ex: VT-0001).', true); return; }
    if (vale.saldo <= 0.001) { avisar(`O vale ${vale.codigo} não tem saldo.`, true); return; }
    if (pagamentosVenda.some(p => p.vale === vale.codigo)) { avisar('Esse vale já foi lançado nesta venda.', true); return; }
    const valor = Math.min(vale.saldo, restante);
    pagamentosVenda.push({forma, valor, vale: vale.codigo});
    inputValor.value = '';
    renderPagamentos();
    avisar(`Vale ${vale.codigo}: ${moeda(valor)} aplicado${vale.saldo > valor ? ` (sobra ${moeda(vale.saldo - valor)} no vale)` : ''}.`);
    return;
  }

  const informado = paraNumero(inputValor.value) || restante;
  if (informado <= 0) return;

  if (forma === 'Dinheiro') {
    // Pode entregar mais que o restante: o excedente vira troco
    const valor = Math.min(informado, restante);
    pagamentosVenda.push({forma, valor, recebido: informado, troco: Math.round((informado - valor) * 100) / 100});
  } else {
    if (informado > restante + 0.001) { avisar(`${forma} não pode passar do restante (${moeda(restante)}). Troco só em dinheiro.`, true); return; }
    pagamentosVenda.push({forma, valor: informado});
  }
  inputValor.value = '';
  inputValor.blur();
  renderPagamentos();
});

document.getElementById('btnFinalizar').addEventListener('click', () => {
  // Proteção extra além do botão desabilitado (mesma regra)
  const bloqueio = bloqueioFinalizar();
  if (bloqueio) { if (carrinho.length) avisar(bloqueio, true); return; }
  const venda = calcularVenda();
  const total = venda.total;
  const pago = pagamentosVenda.reduce((s,p) => s + p.valor, 0);
  if (pago < total - 0.001) { avisar('Complete o pagamento antes de finalizar.', true); return; }
  if (pago > total + 0.001) { avisar('Os pagamentos passam do total da venda. Remova um pagamento e lance novamente.', true); return; }
  const clienteCadastro = clienteDaVenda();
  const cliente = clienteCadastro ? clienteCadastro.nome : document.getElementById('vendaCliente').value.trim();
  const vendedor = document.getElementById('vendaVendedor').value.trim() || usuarioAtual;
  const observacao = document.getElementById('vendaObs').value.trim();

  vendaSeq++;

  // Baixa de estoque: uma movimentação "Venda" por item
  carrinho.forEach(item => {
    const prod = produtosPDV.find(p => p.codigo === item.codigo);
    if (prod) lancarMovEstoque(prod, 'Venda', -item.qtd, 'Venda #' + vendaSeq, {venda:vendaSeq});
  });
  salvarEstoque();

  // Registra pagamentos em dinheiro no caixa pelo valor líquido (recebido − troco devolvido)
  pagamentosVenda.filter(p => p.forma === 'Dinheiro').forEach(p => {
    caixa.movimentos.push({tipo:'Venda', desc:`Venda #${vendaSeq} em dinheiro`, valor:p.valor, recebido:p.recebido ?? p.valor, troco:p.troco || 0, hora: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  });
  lsSet('caixa', caixa);

  // Registra a venda no histórico (usado pelo dashboard de Gestão)
  const porForma = {};
  pagamentosVenda.forEach(p => { porForma[p.forma] = (porForma[p.forma]||0) + p.valor; });
  const formaTop = Object.entries(porForma).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  vendasRealizadas.push({
    numero: vendaSeq,
    data: new Date().toISOString(),
    itens: carrinho.map(i => `${i.qtd}x ${i.nome}`).join(', '),
    // O custo do momento da venda fica gravado para o lucro não mudar se o custo for alterado depois
    produtos: venda.itens.map(({codigo, nome, qtd, preco, precoOriginal, desconto}) => ({codigo, nome, qtd, preco, precoOriginal, desconto, custo: Number(produtosPDV.find(p => p.codigo === codigo)?.custo || 0)})),
    pagamentos: pagamentosVenda.map(({forma, valor, recebido, troco, vale}) => (forma === 'Dinheiro' ? {forma, valor, recebido: recebido ?? valor, troco: troco || 0} : vale ? {forma, valor, vale} : {forma, valor})),
    subtotal: venda.subtotal,
    descontoItens: venda.descontoItens,
    descontoVenda: venda.descontoVenda,
    desconto: venda.descontoItens + venda.descontoVenda,
    cliente, vendedor, observacao,
    clienteId: clienteCadastro ? clienteCadastro.id : null,
    clienteDoc: clienteCadastro ? clienteCadastro.doc : '',
    usuario: usuarioAtual,
    troco: trocoTotal(),
    total,
    forma: formaTop
  });
  lsSet('vendas', vendasRealizadas);
  lsSet('vendaSeq', vendaSeq);
  const vendaNova = vendasRealizadas[vendasRealizadas.length - 1];
  registrarAuditoria('Vendas', `Venda #${vendaSeq} criada — ${moeda(total)}`, {
    detalhe: `${vendaNova.itens} · ${formasDaVenda(vendaNova).join(' + ')}${cliente ? ` · Cliente: ${cliente}` : ''}${vendaNova.desconto > 0.001 ? ` · Desconto: ${moeda(vendaNova.desconto)}` : ''}`,
    ref: {venda: vendaSeq}
  });
  // Baixa o saldo dos vales-troca usados
  pagamentosVenda.filter(p => p.vale).forEach(p => {
    const vale = valesTroca.find(x => x.codigo === p.vale);
    if (!vale) return;
    vale.saldo = Math.max(Math.round((vale.saldo - p.valor) * 100) / 100, 0);
    (vale.usos = vale.usos || []).push({venda: vendaSeq, valor: p.valor, data: new Date().toISOString()});
  });
  salvarVales();
  if (!vendedoresPDV.includes(vendedor)) { vendedoresPDV.push(vendedor); lsSet('vendedores', vendedoresPDV); }
  renderMovimentosCaixa();
  renderSugestoesVenda();
  renderClientes();
  renderHistoricoVendas();

  mostrarComprovante(vendasRealizadas[vendasRealizadas.length - 1]);

  limparVenda();
  renderTelasEstoque();
  atualizarDashboardPDV(); atualizarDashboardFinanceiro();
});

function mostrarComprovante(venda){
  const total = Number(venda.total) || 0;
  const produtos = Array.isArray(venda.produtos) && venda.produtos.length
    ? venda.produtos
    : String(venda.itens || '').split(', ').filter(Boolean).map(texto => {
        const partes = texto.match(/^(\d+)x\s+(.+)$/);
        return {nome: partes ? partes[2] : texto, qtd: partes ? Number(partes[1]) : 1, preco: null};
      });
  const subtotal = Number.isFinite(venda.subtotal) ? venda.subtotal : total;
  const desconto = Number.isFinite(venda.desconto) ? venda.desconto : Math.max(subtotal - total, 0);
  const descontoItens = Number(venda.descontoItens) || 0;
  const descontoVenda = Number.isFinite(venda.descontoVenda) ? venda.descontoVenda : desconto - descontoItens;
  const dataHora = new Date(venda.data).toLocaleString('pt-BR');
  const pagamentos = Array.isArray(venda.pagamentos) && venda.pagamentos.length
    ? venda.pagamentos
    : [{forma: venda.forma || '—', valor: total}];
  const linhas = produtos.map(item => {
    const precoValido = Number.isFinite(item.preco);
    const descItem = Number(item.desconto) || 0;
    const descricaoPreco = precoValido ? `${item.qtd} x ${moeda(item.preco)}` : `Quantidade: ${item.qtd}`;
    const totalItem = precoValido ? moeda(item.preco * item.qtd - descItem) : '—';
    return `
    <tr>
      <td><span class="receipt-product">${item.nome}</span><small>${descricaoPreco}${descItem > 0 ? ` · desc. − ${moeda(descItem)}` : ''}</small></td>
      <td>${totalItem}</td>
    </tr>`;
  }).join('');
  // Em dinheiro, o comprovante mostra o valor entregue pelo cliente; o troco vem logo abaixo
  const linhasPagamento = pagamentos.map(p => `<tr><td>${p.forma}${p.vale ? ` ${p.vale}` : ''}${p.troco > 0.001 ? ' (recebido)' : ''}</td><td>${moeda(p.troco > 0.001 ? p.recebido : p.valor)}</td></tr>`).join('');
  document.getElementById('comprovanteTitulo').textContent = 'Comprovante de venda';
  document.getElementById('comprovanteConteudo').innerHTML = `
    <header class="receipt-head">
      <div class="receipt-logo">MGA</div>
      <p class="receipt-company">MGA Soluções Tecnológicas</p>
      <p class="receipt-store">Loja Matriz</p>
      <div class="receipt-doc">Comprovante de venda</div>
      <p class="receipt-id">Venda #${venda.numero}<br>${dataHora}</p>
      <p class="receipt-id">Cliente: ${venda.cliente || 'Consumidor final'}${venda.clienteDoc ? `<br>CPF/CNPJ: ${venda.clienteDoc}` : ''}${venda.vendedor ? `<br>Vendedor: ${venda.vendedor}` : ''}</p>
    </header>
    ${vendaCancelada(venda) ? `<div class="receipt-cancelada">VENDA CANCELADA<small>${new Date(venda.cancelamento.data).toLocaleString('pt-BR')} · ${esc(venda.cancelamento.motivo)}</small></div>` : ''}
    <table class="receipt-items">
      <thead><tr><th>Produto</th><th>Total</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div class="receipt-summary">
      <div class="receipt-line"><span>Subtotal</span><b>${moeda(subtotal)}</b></div>
      ${descontoItens > 0.001 ? `<div class="receipt-line"><span>Desconto nos itens</span><b>− ${moeda(descontoItens)}</b></div>` : ''}
      ${descontoVenda > 0.001 ? `<div class="receipt-line"><span>Desconto na venda</span><b>− ${moeda(descontoVenda)}</b></div>` : ''}
      <div class="receipt-grand"><span>Total</span><b>${moeda(total)}</b></div>
    </div>
    <div class="receipt-payments">
      <div class="receipt-section-title">Pagamento</div>
      <table><tbody>${linhasPagamento}</tbody></table>
    </div>
    ${venda.troco > 0.001 ? `<div class="receipt-change"><span>Troco</span><b>${moeda(venda.troco)}</b></div>` : ''}
    ${(venda.devolucoes || []).map(d => `<div class="receipt-devolucao"><span>Devolução ${new Date(d.data).toLocaleDateString('pt-BR')} (${d.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(', ')})${d.vale ? ` · ${d.vale}` : ` · ${esc(d.forma)}`}</span><b>− ${moeda(d.valor)}</b></div>`).join('')}
    ${venda.observacao ? `<div class="receipt-obs"><b>Obs.:</b> ${venda.observacao}</div>` : ''}
    <p class="receipt-footer">Obrigado pela preferência.<br>Documento não fiscal.</p>`;
  document.getElementById('comprovanteOverlay').style.display = 'flex';
}
document.getElementById('btnFecharComprovante').addEventListener('click', () => document.getElementById('comprovanteOverlay').style.display = 'none');
document.getElementById('btnImprimir').addEventListener('click', () => window.print());

// ---- Caixa ----
const FORMAS_PAGAMENTO = ['Dinheiro', 'PIX', 'Débito', 'Crédito'];
// Movimentos manuais listados no caixa; os de "entrada" somam, os demais subtraem
const MOVS_CAIXA_LISTADOS = ['Sangria', 'Suprimento', 'Estorno', 'Recebimento'];
const MOVS_CAIXA_ENTRADA = ['Suprimento', 'Recebimento'];

// Caixa aberto antes deste controle não tem horário de abertura: assume início do dia
if (caixa.aberto && !caixa.abertura) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  caixa.abertura = hoje.toISOString();
  lsSet('caixa', caixa);
}

// Vendas feitas entre a abertura e o fechamento deste caixa
function vendasDoCaixa(){
  const inicio = new Date(caixa.abertura || 0).getTime();
  const fim = !caixa.aberto && caixa.fechamento ? new Date(caixa.fechamento).getTime() : Infinity;
  return vendasRealizadas.filter(v => { const t = new Date(v.data).getTime(); return t >= inicio && t <= fim; });
}

// Panorama do caixa: abertura, vendas por forma, sangrias, suprimentos e dinheiro esperado na gaveta
function resumoCaixa(){
  const todas = vendasDoCaixa();
  const vendas = vendasValidas(todas); // canceladas não contam
  const porForma = Object.fromEntries(FORMAS_PAGAMENTO.map(f => [f, 0]));
  let trocoDevolvido = 0;
  vendas.forEach(v => {
    const pags = Array.isArray(v.pagamentos) && v.pagamentos.length ? v.pagamentos : [{forma: v.forma, valor: v.total}];
    pags.forEach(p => { porForma[p.forma] = (porForma[p.forma] || 0) + p.valor; });
    // Vendas antigas gravavam o dinheiro recebido cheio; o troco precisa sair do dinheiro
    if (v.troco > 0 && !pags.some(p => 'recebido' in p)) porForma.Dinheiro -= v.troco;
    trocoDevolvido += v.troco || 0;
  });
  const soma = tipo => caixa.movimentos.filter(m => m.tipo === tipo).reduce((s,m) => s + m.valor, 0);
  const sangrias = soma('Sangria');
  const suprimentos = soma('Suprimento');
  const estornos = soma('Estorno'); // dinheiro devolvido ao cliente em devoluções/cancelamentos
  // Recebimentos de vendas a prazo feitos neste caixa (só o dinheiro entra na gaveta)
  const recebimentos = caixa.movimentos.filter(m => m.tipo === 'Recebimento');
  const recebidoDinheiro = recebimentos.filter(m => m.forma === 'Dinheiro').reduce((s, m) => s + m.valor, 0);
  const recebidoTotal = recebimentos.reduce((s, m) => s + m.valor, 0);
  const totalVendido = Object.values(porForma).reduce((s,v) => s + v, 0);
  const canceladas = todas.length - vendas.length;
  const devolvido = vendas.reduce((s, v) => s + valorDevolvido(v), 0);
  return {
    abertura: caixa.valorInicial || 0, porForma, totalVendido, numVendas: vendas.length, trocoDevolvido,
    sangrias, suprimentos, estornos, canceladas, devolvido, recebidoDinheiro, recebidoTotal,
    esperado: (caixa.valorInicial || 0) + porForma.Dinheiro + recebidoDinheiro + suprimentos - sangrias - estornos
  };
}

function htmlResumoCaixa(r){
  const linhasFormas = Object.entries(r.porForma).map(([forma, valor]) =>
    `<div class="rc-line"><span>${forma}</span><b>${moeda(valor)}</b></div>`).join('');
  return `
    <div class="rc-sec"><div class="rc-title">Abertura</div><div class="rc-line"><span>Troco inicial</span><b>${moeda(r.abertura)}</b></div></div>
    <div class="rc-sec"><div class="rc-title">Vendas <small>${r.numVendas} venda${r.numVendas === 1 ? '' : 's'}</small></div>
      ${linhasFormas}
      <div class="rc-line rc-sub"><span>Total vendido</span><b>${moeda(r.totalVendido)}</b></div>
      ${r.trocoDevolvido > 0.001 ? `<div class="rc-note">Troco devolvido: ${moeda(r.trocoDevolvido)} (já descontado do dinheiro)</div>` : ''}
    </div>
    <div class="rc-sec"><div class="rc-title">Sangrias</div><div class="rc-line rc-neg"><span>Retiradas</span><b>− ${moeda(r.sangrias)}</b></div></div>
    <div class="rc-sec"><div class="rc-title">Suprimentos</div><div class="rc-line rc-pos"><span>Entradas</span><b>+ ${moeda(r.suprimentos)}</b></div></div>
    ${r.recebidoTotal > 0.001 ? `
    <div class="rc-sec"><div class="rc-title">Recebimentos a prazo</div>
      <div class="rc-line rc-pos"><span>Em dinheiro</span><b>+ ${moeda(r.recebidoDinheiro)}</b></div>
      ${r.recebidoTotal - r.recebidoDinheiro > 0.001 ? `<div class="rc-note">Outras formas (PIX/cartão): ${moeda(r.recebidoTotal - r.recebidoDinheiro)}</div>` : ''}
    </div>` : ''}
    ${r.estornos > 0.001 || r.canceladas || r.devolvido > 0.001 ? `
    <div class="rc-sec"><div class="rc-title">Devoluções e cancelamentos</div>
      <div class="rc-line rc-neg"><span>Estornos em dinheiro</span><b>− ${moeda(r.estornos || 0)}</b></div>
      ${r.canceladas ? `<div class="rc-note">${r.canceladas} venda${r.canceladas === 1 ? ' cancelada' : 's canceladas'} (fora dos totais)</div>` : ''}
      ${r.devolvido > 0.001 ? `<div class="rc-note">Devolvido em vendas deste caixa: ${moeda(r.devolvido)}</div>` : ''}
    </div>` : ''}
    <div class="rc-total"><span>Dinheiro esperado</span><b>${moeda(r.esperado)}</b></div>
    <div class="rc-note">Abertura + vendas e recebimentos em dinheiro + suprimentos − sangrias − estornos. PIX, cartões e vendas a prazo não entram na gaveta.</div>`;
}

function formasDaVenda(v){
  return Array.isArray(v.pagamentos) && v.pagamentos.length ? [...new Set(v.pagamentos.map(p => p.forma))] : [v.forma];
}

function renderMovimentosCaixa(){
  const tbody = document.getElementById('tabelaMovimentos');
  const vendasCaixa = vendasDoCaixa();
  tbody.innerHTML = vendasCaixa.length
    ? vendasCaixa.slice().reverse().map(v => {
        const dataHora = new Date(v.data).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'});
        return `<tr class="${vendaCancelada(v) ? 'venda-cancelada' : ''}"><td>#${v.numero}<small class="history-date">${dataHora}</small></td><td>${v.itens}${badgeStatusVenda(v)}</td><td>${formasDaVenda(v).map(f => `<span class="badge b-ok">${f}</span>`).join(' ')}</td><td>${valorVendaHtml(v)}</td><td><button type="button" class="history-receipt-btn" data-numero="${v.numero}">Detalhes</button></td></tr>`;
      }).join('')
    : '<tr><td colspan="5" class="history-empty">Nenhuma venda neste caixa ainda.</td></tr>';
  tbody.querySelectorAll('.history-receipt-btn').forEach(button => {
    button.addEventListener('click', () => abrirDetalhesVenda(button.dataset.numero));
  });

  const r = resumoCaixa();
  document.getElementById('kpiValorInicial').textContent = moeda(r.abertura);
  document.getElementById('kpiTotalVendido').textContent = moeda(r.totalVendido);
  document.getElementById('kpiNumVendas').textContent = r.numVendas;
  document.getElementById('kpiSaldoEsperado').textContent = moeda(r.esperado);
  document.getElementById('resumoCaixa').innerHTML = htmlResumoCaixa(r);
  document.getElementById('caixaAberturaInfo').textContent = caixa.abertura ? '· aberto em ' + dataHoraCurta(caixa.abertura) : '';

  const movs = caixa.movimentos.filter(m => MOVS_CAIXA_LISTADOS.includes(m.tipo));
  document.getElementById('tabelaMovCaixa').innerHTML = movs.length
    ? movs.slice().reverse().map(m => {
        const sangria = !MOVS_CAIXA_ENTRADA.includes(m.tipo);
        return `<tr><td>${m.hora}</td><td><span class="badge ${sangria ? 'mt-saida' : 'mt-entrada'}">${m.tipo}</span></td><td>${m.desc}</td><td class="${sangria ? 'mov-neg' : 'mov-pos'}">${sangria ? '−' : '+'} ${moeda(m.valor)}</td></tr>`;
      }).join('')
    : '<tr><td colspan="4" class="history-empty">Nenhuma sangria ou suprimento.</td></tr>';
  atualizarPainelFechamento();
}

function abrirCaixa(valorInicial){
  caixa.valorInicial = valorInicial;
  caixa.aberto = true;
  caixa.abertura = new Date().toISOString();
  caixa.fechamento = null;
  caixa.movimentos = [];
  registrarAuditoria('Caixa', `Caixa aberto com troco inicial de ${moeda(valorInicial)}`);
  document.getElementById('caixaFechadoView').style.display = 'none';
  document.getElementById('caixaAbertoView').style.display = 'block';
  document.getElementById('fechamentoResumo').style.display = 'none';
  document.getElementById('caixaStatus').innerHTML = '<span class="dot-status on"></span>Caixa aberto <span class="muted">· agora</span>';
  lsSet('caixa', caixa);
  renderMovimentosCaixa();
  atualizarDashboardFinanceiro();
  atualizarBotaoTopoCaixa();
}

// Painel de fechamento: mostra esperado x contado e a diferença enquanto a pessoa digita
function atualizarPainelFechamento(){
  const input = document.getElementById('valorContadoCaixa');
  const btn = document.getElementById('btnConfirmarFechamento');
  const box = document.getElementById('fcDiferenca');
  const esperado = resumoCaixa().esperado;
  const preenchido = input.value.trim() !== '';
  const contado = paraNumero(input.value);
  const diferenca = Math.round((contado - esperado) * 100) / 100;
  document.getElementById('fcEsperado').textContent = moeda(esperado);
  document.getElementById('fcContado').textContent = preenchido ? moeda(contado) : '—';
  box.className = 'fc-diferenca' + (!preenchido ? '' : diferenca === 0 ? ' ok' : diferenca > 0 ? ' sobra' : ' falta');
  box.textContent = !preenchido ? 'Conte o dinheiro da gaveta e informe o valor acima.'
    : diferenca === 0 ? 'Confere com o esperado.'
    : diferenca > 0 ? `Sobra de ${moeda(diferenca)}` : `Falta de ${moeda(Math.abs(diferenca))}`;
  btn.disabled = !preenchido;
  btn.classList.toggle('com-falta', preenchido && diferenca < 0);
  btn.textContent = !preenchido || diferenca === 0 ? 'Fechar caixa'
    : `Fechar caixa com ${diferenca > 0 ? 'sobra' : 'falta'} de ${moeda(Math.abs(diferenca))}`;
}

// Leva a pessoa até o campo de valor contado
function irParaFechamento(){
  document.querySelector('#subtabsPDV .stab[data-tab="caixa"]').click();
  const input = document.getElementById('valorContadoCaixa');
  document.getElementById('fecharCaixaCard').scrollIntoView({behavior:'smooth', block:'center'});
  input.focus({preventScroll:true});
}

document.getElementById('valorContadoCaixa').addEventListener('input', atualizarPainelFechamento);
document.getElementById('valorContadoCaixa').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !document.getElementById('btnConfirmarFechamento').disabled) fecharCaixa();
});
document.getElementById('btnConfirmarFechamento').addEventListener('click', () => fecharCaixa());

// ---- Conferência de fechamento ----
function moedaComSinal(v){ return (v > 0 ? '+' : v < 0 ? '−' : '') + moeda(Math.abs(v)); }

function atualizarConferencia(){
  const esperado = resumoCaixa().esperado;
  const informado = paraNumero(document.getElementById('cfInformado').value);
  const diferenca = Math.round((informado - esperado) * 100) / 100;
  document.getElementById('cfEsperado').textContent = moeda(esperado);
  document.getElementById('cfDiferenca').textContent = moedaComSinal(diferenca) + (diferenca > 0 ? ' (sobra)' : diferenca < 0 ? ' (falta)' : '');
  document.getElementById('cfDiferencaLinha').className = 'cf-linha cf-diferenca ' + (diferenca === 0 ? 'ok' : diferenca > 0 ? 'sobra' : 'falta');
  document.getElementById('cfMotivoObrig').textContent = diferenca === 0 ? '(opcional)' : '(obrigatório)';
  document.getElementById('cfErro').textContent = '';
  return {esperado, informado, diferenca};
}

// Abre a conferência a partir do valor contado no painel
function fecharCaixa(){
  const input = document.getElementById('valorContadoCaixa');
  if (input.value.trim() === '') { irParaFechamento(); return; }
  document.getElementById('cfInformado').value = paraNumero(input.value).toFixed(2).replace('.', ',');
  document.getElementById('cfMotivo').value = '';
  atualizarConferencia();
  document.getElementById('conferenciaOverlay').style.display = 'flex';
  document.getElementById('cfMotivo').focus();
}

function fecharConferencia(){ document.getElementById('conferenciaOverlay').style.display = 'none'; }

document.getElementById('cfInformado').addEventListener('input', atualizarConferencia);
document.getElementById('btnCancelarConferencia').addEventListener('click', fecharConferencia);
document.getElementById('conferenciaOverlay').addEventListener('click', (e) => { if (e.target.id === 'conferenciaOverlay') fecharConferencia(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('conferenciaOverlay').style.display === 'flex') fecharConferencia();
});
document.getElementById('btnConfirmarConferencia').addEventListener('click', () => {
  const {informado, diferenca} = atualizarConferencia();
  const motivo = document.getElementById('cfMotivo').value.trim();
  if (diferenca !== 0 && motivo.length < 3) {
    document.getElementById('cfErro').textContent = 'Informe o motivo da diferença para confirmar o fechamento.';
    document.getElementById('cfMotivo').focus();
    return;
  }
  fecharConferencia();
  confirmarFechamentoCaixa(informado, motivo);
});

function confirmarFechamentoCaixa(informado, motivo){
  const r = resumoCaixa();
  const diferenca = Math.round((informado - r.esperado) * 100) / 100;
  const historicoCaixas = lsGet('historicoCaixas', []);
  const fechamento = {
    numero: historicoCaixas.length + 1,
    abertura: caixa.abertura, fechamento: new Date().toISOString(), usuario: usuarioAtual,
    valorAbertura: r.abertura, porForma: r.porForma, totalVendido: r.totalVendido, numVendas: r.numVendas,
    trocoDevolvido: r.trocoDevolvido, sangrias: r.sangrias, suprimentos: r.suprimentos,
    esperado: r.esperado, informado, diferenca, motivo,
    estornos: r.estornos, canceladas: r.canceladas,
    movimentos: caixa.movimentos.filter(m => MOVS_CAIXA_LISTADOS.includes(m.tipo)),
    vendas: vendasDoCaixa().map(v => ({numero: v.numero, data: v.data, total: v.total, liquido: valorLiquidoVenda(v), cancelada: vendaCancelada(v), formas: formasDaVenda(v)}))
  };
  historicoCaixas.push(fechamento);
  lsSet('historicoCaixas', historicoCaixas);

  document.getElementById('fechamentoConteudo').innerHTML = `
    <p>Dinheiro esperado: <b>${moeda(r.esperado)}</b></p>
    <p>Dinheiro informado: <b>${moeda(informado)}</b></p>
    <p style="color:${diferenca >= 0 ? '#0e7c5f' : '#c22a4e'};">Diferença: <b style="color:inherit">${moedaComSinal(diferenca)}</b></p>
    ${motivo ? `<p>Motivo: <b>${motivo}</b></p>` : ''}`;
  document.getElementById('fechamentoResumo').style.display = 'block';
  document.getElementById('fechamentoResumo').dataset.numero = fechamento.numero;

  document.getElementById('valorContadoCaixa').value = '';
  caixa.fechamento = fechamento.fechamento;
  registrarAuditoria('Caixa', `Caixa #${fechamento.numero} fechado — ${diferenca === 0 ? 'sem diferença' : `${diferenca > 0 ? 'sobra' : 'falta'} de ${moeda(Math.abs(diferenca))}`}`, {
    alteracoes: [{campo: 'Dinheiro esperado', antes: '—', depois: moeda(r.esperado)}, {campo: 'Dinheiro informado', antes: '—', depois: moeda(informado)}],
    detalhe: motivo ? `Motivo da diferença: ${motivo}` : `Total vendido: ${moeda(r.totalVendido)} em ${r.numVendas} venda(s)`
  });
  caixa.aberto = false;
  document.getElementById('caixaAbertoView').style.display = 'none';
  document.getElementById('caixaFechadoView').style.display = 'block';
  document.getElementById('caixaStatus').innerHTML = '<span class="dot-status"></span>Caixa fechado';
  lsSet('caixa', caixa);
  atualizarDashboardFinanceiro();
  atualizarBotaoTopoCaixa();
  renderHistoricoCaixas();
  mostrarRelatorioCaixa(fechamento);
}

// ---- Relatório de fechamento (usa o modal do comprovante, pronto para imprimir) ----
function mostrarRelatorioCaixa(h){
  const dt = iso => iso ? new Date(iso).toLocaleString('pt-BR', {dateStyle:'short', timeStyle:'short'}) : '—';
  const porForma = h.porForma || {};
  const movimentos = h.movimentos || [];
  const vendas = h.vendas || [];
  const ticket = h.numVendas ? h.totalVendido / h.numVendas : 0;
  document.getElementById('comprovanteTitulo').textContent = 'Relatório de fechamento';
  document.getElementById('comprovanteConteudo').innerHTML = `
    <header class="receipt-head">
      <div class="receipt-logo">MGA</div>
      <p class="receipt-company">MGA Soluções Tecnológicas</p>
      <p class="receipt-store">Loja Matriz</p>
      <div class="receipt-doc">Fechamento de caixa #${h.numero || '—'}</div>
      <p class="receipt-id">Abertura: ${dt(h.abertura)}<br>Fechamento: ${dt(h.fechamento)}<br>Operador: ${h.usuario || '—'}</p>
    </header>
    <div class="receipt-section-title">Resumo</div>
    <div class="receipt-summary">
      <div class="receipt-line"><span>Abertura (troco inicial)</span><b>${moeda(h.valorAbertura)}</b></div>
      ${Object.entries(porForma).map(([f, v]) => `<div class="receipt-line"><span>Vendas ${f}</span><b>${moeda(v)}</b></div>`).join('')}
      <div class="receipt-line"><span><b>Total vendido</b> (${h.numVendas || 0} venda${h.numVendas === 1 ? "" : "s"})</span><b>${moeda(h.totalVendido)}</b></div>
      <div class="receipt-line"><span>Ticket médio</span><b>${moeda(ticket)}</b></div>
      ${h.trocoDevolvido > 0.001 ? `<div class="receipt-line"><span>Troco devolvido</span><b>${moeda(h.trocoDevolvido)}</b></div>` : ''}
      <div class="receipt-line"><span>Sangrias</span><b>− ${moeda(h.sangrias)}</b></div>
      <div class="receipt-line"><span>Suprimentos</span><b>+ ${moeda(h.suprimentos)}</b></div>
      ${h.estornos > 0.001 ? `<div class="receipt-line"><span>Estornos (devoluções)</span><b>− ${moeda(h.estornos)}</b></div>` : ''}
      ${h.canceladas ? `<div class="receipt-line"><span>Vendas canceladas</span><b>${h.canceladas}</b></div>` : ''}
    </div>
    ${movimentos.length ? `
    <div class="receipt-section-title">Sangrias e suprimentos</div>
    <table><tbody>${movimentos.map(m => `<tr><td>${m.hora} · ${m.tipo}<small class="receipt-sub">${m.desc}</small></td><td>${MOVS_CAIXA_ENTRADA.includes(m.tipo) ? '+' : '−'} ${moeda(m.valor)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="receipt-section-title">Conferência</div>
    <div class="receipt-summary">
      <div class="receipt-line"><span>Dinheiro esperado</span><b>${moeda(h.esperado)}</b></div>
      <div class="receipt-line"><span>Dinheiro informado</span><b>${moeda(h.informado)}</b></div>
      <div class="receipt-grand ${h.diferenca < 0 ? 'receipt-falta' : ''}"><span>Diferença</span><b>${moedaComSinal(h.diferenca || 0)}</b></div>
      ${h.motivo ? `<div class="receipt-obs"><b>Motivo:</b> ${h.motivo}</div>` : ''}
    </div>
    ${vendas.length ? `
    <div class="receipt-section-title">Vendas (${vendas.length})</div>
    <table class="receipt-items"><tbody>${vendas.map(v => `<tr><td>#${v.numero} · ${new Date(v.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}<small class="receipt-sub">${v.cancelada ? 'CANCELADA' : (v.formas || []).join(' + ')}</small></td><td>${v.cancelada ? `<s>${moeda(v.total)}</s>` : moeda(v.liquido ?? v.total)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="receipt-assinaturas">
      <div><span></span>Operador</div>
      <div><span></span>Supervisor</div>
    </div>
    <p class="receipt-footer">Relatório gerado em ${dt(new Date().toISOString())}.<br>Documento de controle interno.</p>`;
  document.getElementById('comprovanteOverlay').style.display = 'flex';
}

function relatorioPorNumero(numero){
  return lsGet('historicoCaixas', []).find((h, i) => String(h.numero || i + 1) === String(numero));
}
document.getElementById('btnVerRelatorioCaixa').addEventListener('click', () => {
  const h = relatorioPorNumero(document.getElementById('fechamentoResumo').dataset.numero);
  if (h) mostrarRelatorioCaixa(h);
});
document.getElementById('btnImprimirRelatorioCaixa').addEventListener('click', () => {
  const h = relatorioPorNumero(document.getElementById('fechamentoResumo').dataset.numero);
  if (h) { mostrarRelatorioCaixa(h); window.print(); }
});

function renderHistoricoCaixas(){
  const historico = lsGet('historicoCaixas', []);
  const tbody = document.getElementById('tabelaHistoricoCaixas');
  tbody.innerHTML = historico.length
    ? historico.map((h, i) => ({...h, numero: h.numero || i + 1})).reverse().map(h => {
        const dif = h.diferenca || 0;
        const badge = dif === 0 ? '<span class="badge b-ok">Confere</span>'
          : `<span class="badge ${dif > 0 ? 'mt-venda' : 'mt-saida'}">${moedaComSinal(dif)}</span>`;
        return `<tr><td>#${h.numero}</td><td>${typeof h.abertura === 'string' ? dataHoraCurta(h.abertura) : '—'}</td><td>${dataHoraCurta(h.fechamento)}</td><td>${h.usuario || '—'}</td><td>${moeda(h.totalVendido)}</td><td>${badge}${h.motivo ? `<small class="history-date">${h.motivo}</small>` : ''}</td><td><button type="button" class="history-receipt-btn" data-numero="${h.numero}">Ver relatório</button></td></tr>`;
      }).join('')
    : '<tr><td colspan="7" class="history-empty">Nenhum fechamento registrado ainda.</td></tr>';
  tbody.querySelectorAll('.history-receipt-btn').forEach(b => b.addEventListener('click', () => {
    const h = relatorioPorNumero(b.dataset.numero);
    if (h) mostrarRelatorioCaixa(h);
  }));
}

function atualizarBotaoTopoCaixa(){
  const btn = document.getElementById('btnTopoCaixa');
  btn.textContent = 'Ações Caixa';
  btn.style.background = caixa.aberto ? '#c22a4e' : '';
  atualizarTotais(); // abrir/fechar o caixa muda se é possível finalizar a venda
}

document.getElementById('btnTopoCaixa').addEventListener('click', () => {
  document.querySelector('#subtabsPDV .stab[data-tab="caixa"]').click();
  if (caixa.aberto) {
    irParaFechamento();
  } else {
    const valor = paraNumero(prompt('Valor inicial (troco):', '100,00'));
    abrirCaixa(valor);
  }
});

document.getElementById('btnAbrirCaixa').addEventListener('click', () => {
  abrirCaixa(paraNumero(document.getElementById('valorInicialCaixa').value));
});

document.getElementById('btnSangria').addEventListener('click', () => {
  const valor = paraNumero(prompt('Valor da sangria (retirada):', '0,00'));
  if (!valor) return;
  const motivo = prompt('Motivo da sangria:', 'Retirada de caixa') || 'Retirada de caixa';
  caixa.movimentos.push({tipo:'Sangria', desc:motivo, valor, hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  registrarAuditoria('Caixa', `Sangria de ${moeda(valor)}`, {detalhe: motivo});
  lsSet('caixa', caixa);
  renderMovimentosCaixa();
  atualizarDashboardFinanceiro();
});
document.getElementById('btnSuprimento').addEventListener('click', () => {
  const valor = paraNumero(prompt('Valor do suprimento (entrada):', '0,00'));
  if (!valor) return;
  const motivo = prompt('Motivo do suprimento:', 'Reforço de troco') || 'Reforço de troco';
  caixa.movimentos.push({tipo:'Suprimento', desc:motivo, valor, hora:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})});
  registrarAuditoria('Caixa', `Suprimento de ${moeda(valor)}`, {detalhe: motivo});
  lsSet('caixa', caixa);
  renderMovimentosCaixa();
  atualizarDashboardFinanceiro();
});
document.getElementById('btnFecharCaixa').addEventListener('click', irParaFechamento);

// ---- Dashboard de Gestão conectado aos dados reais ----
function initCaixaView(){
  atualizarBotaoTopoCaixa();
  if (!caixa.aberto) return;
  document.getElementById('caixaFechadoView').style.display = 'none';
  document.getElementById('caixaAbertoView').style.display = 'block';
  document.getElementById('caixaStatus').innerHTML = '<span class="dot-status on"></span>Caixa aberto';
  renderMovimentosCaixa();
}


function renderRankingEstoquePDV(){
  const box = document.getElementById('rankingEstoquePDV');
  const ordenados = [...produtosPDV].sort((a,b) => b.estoque - a.estoque);
  const max = ordenados.length ? ordenados[0].estoque : 0;

  box.innerHTML = ordenados.length ? ordenados.map(p => {
    const pct = max ? Math.round((p.estoque / max) * 100) : 0;
    const cor = p.estoque <= p.minimo ? '#f0a533' : '#2f8bff';
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:${p===ordenados[ordenados.length-1]?0:12}px;">
        <div style="width:150px;flex-shrink:0;font-size:13px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.nome}</div>
        <div style="flex:1;background:var(--track);border-radius:6px;height:18px;overflow:hidden;">
          <div style="width:${pct}%;background:${cor};height:100%;border-radius:6px;"></div>
        </div>
        <div style="width:44px;text-align:right;font-size:13px;font-weight:700;color:var(--ink);">${p.estoque}</div>
      </div>`;
  }).join('') : '<p class="empty-msg">Nenhum produto cadastrado.</p>';

  const totalProdutos = produtosPDV.length;
  const totalUnidades = produtosPDV.reduce((s,p) => s + p.estoque, 0);
  document.getElementById('peTotalProdutos').textContent = totalProdutos;
  document.getElementById('peTotalUnidades').textContent = totalUnidades;
  document.getElementById('peMaiorEstoque').textContent = ordenados.length ? `${ordenados[0].nome} (${ordenados[0].estoque})` : '—';
  document.getElementById('peMenorEstoque').textContent = ordenados.length ? `${ordenados[ordenados.length-1].nome} (${ordenados[ordenados.length-1].estoque})` : '—';
}

// ---- Estoque mínimo / reposição ----
let somenteReposicao = false;
function precisaRepor(p){ return p.ativo !== false && p.estoque <= p.minimo; }
// Mais urgentes primeiro: menor proporção estoque/mínimo
function produtosParaRepor(){
  return produtosPDV.filter(precisaRepor).sort((a,b) => (a.estoque / (a.minimo || 1)) - (b.estoque / (b.minimo || 1)));
}
// Quantidade sugerida: completar até o estoque máximo; sem máximo cadastrado, até o dobro do mínimo
function qtdSugeridaReposicao(p){
  const alvo = p.maximo != null && p.maximo > p.minimo ? p.maximo : p.minimo * 2;
  return Math.max(alvo - p.estoque, 1);
}

function reporProduto(codigo){
  const prod = produtosPDV.find(p => p.codigo === codigo);
  if (!prod) return;
  document.querySelector('#subtabsPDV .stab[data-tab="estoque"]').click();
  mostrarFormEstoque('entrada');
  document.getElementById('entProduto').value = codigo;
  preencherCustoEntrada();
  document.getElementById('entQtd').value = qtdSugeridaReposicao(prod);
  atualizarResumoEntrada();
  document.getElementById('entradaCard').scrollIntoView({behavior:'smooth', block:'start'});
}

function renderEstoqueBaixo(){
  const lista = produtosParaRepor();
  const painel = document.getElementById('painelEstoqueBaixo');
  painel.style.display = lista.length ? 'block' : 'none';
  // Contador no menu: grupo "Estoque" e item "Entrada"
  ['navBadgeEstoque', 'navBadgeEntrada'].forEach(id => {
    const b = document.getElementById(id);
    b.textContent = lista.length || '';
    b.title = lista.length ? `${lista.length} produto(s) para repor` : '';
  });
  if (!lista.length) return;
  document.getElementById('ebResumo').textContent = `${lista.length} produto${lista.length === 1 ? ' precisa' : 's precisam'} de reposição`;
  document.getElementById('ebLista').innerHTML = lista.map(p => {
    const pct = Math.min(Math.round((p.estoque / (p.minimo || 1)) * 100), 100);
    return `<li>
      <span class="eb-nome">${p.nome}</span>
      <span class="eb-barra" aria-hidden="true"><span style="width:${pct}%"></span></span>
      <span class="eb-qtd"><b class="${p.estoque === 0 ? 'eb-zero' : ''}">${p.estoque}</b> / mínimo ${p.minimo}</span>
      <button type="button" class="eb-repor" data-codigo="${p.codigo}">Repor</button>
    </li>`;
  }).join('');
  document.querySelectorAll('#ebLista .eb-repor').forEach(b => b.addEventListener('click', () => reporProduto(b.dataset.codigo)));
}

function renderEstoquePDV(){
  const busca = (document.getElementById('buscaEstoquePDV').value || '').toLowerCase();
  const tbody = document.getElementById('tabelaEstoquePDV');
  const filtrados = produtosPDV.filter(p => (p.nome.toLowerCase().includes(busca) || p.categoria.toLowerCase().includes(busca)) && (!somenteReposicao || precisaRepor(p)));
  document.getElementById('filtroReposicao').style.display = somenteReposicao ? 'flex' : 'none';
  tbody.innerHTML = filtrados.length
    ? filtrados.map(p => {
        const repor = p.estoque <= p.minimo;
        return `<tr><td>${p.nome}</td><td>${p.categoria}</td><td>${p.estoque}</td><td>${p.minimo}</td>
          <td>${repor ? `<span class="badge b-wait">Abaixo do mínimo</span><small class="history-date">sugestão: repor ${qtdSugeridaReposicao(p)}</small>` : '<span class="badge b-ok">OK</span>'}</td>
          <td>${repor ? `<button type="button" class="history-receipt-btn" data-repor="${p.codigo}">Repor</button>` : ''}</td></tr>`;
      }).join('')
    : `<tr><td colspan="6" class="history-empty">${somenteReposicao ? 'Nenhum produto precisa de reposição.' : 'Nenhum produto encontrado.'}</td></tr>`;
  tbody.querySelectorAll('[data-repor]').forEach(b => b.addEventListener('click', () => reporProduto(b.dataset.repor)));
  renderRankingEstoquePDV();
  renderEstoqueBaixo();
}
document.getElementById('buscaEstoquePDV').addEventListener('input', renderEstoquePDV);
document.getElementById('btnVerReposicao').addEventListener('click', () => {
  somenteReposicao = true;
  document.getElementById('buscaEstoquePDV').value = '';
  renderEstoquePDV();
  document.getElementById('cardTabelaEstoque').scrollIntoView({behavior:'smooth', block:'start'});
});
document.getElementById('btnMostrarTodosEstoque').addEventListener('click', () => { somenteReposicao = false; renderEstoquePDV(); });

function renderSaidaEstoquePDV(){
  const saidas = movEstoque.filter(m => m.tipo === 'Venda' || m.tipo === 'Saída');
  const hoje = new Date().toLocaleDateString('pt-BR');
  const saidasHoje = saidas.filter(m => new Date(m.data).toLocaleDateString('pt-BR') === hoje);
  const unidadesHoje = saidasHoje.reduce((s,m) => s - m.qtd, 0);

  const vendidoHoje = {};
  saidasHoje.filter(m => m.tipo === 'Venda').forEach(m => { vendidoHoje[m.produto] = (vendidoHoje[m.produto]||0) - m.qtd; });
  const rankingHoje = Object.entries(vendidoHoje).sort((a,b) => b[1]-a[1]);

  document.getElementById('psUnidadesHoje').textContent = unidadesHoje;
  document.getElementById('psProdutosHoje').textContent = rankingHoje.length;
  document.getElementById('psTotalRegistros').textContent = saidas.length;
  document.getElementById('psMaisVendidoHoje').textContent = rankingHoje.length ? `${rankingHoje[0][0]} (${rankingHoje[0][1]})` : '—';

  const tbody = document.getElementById('tabelaSaidaEstoque');
  tbody.innerHTML = saidas.length
    ? saidas.slice().reverse().map(m => `<tr><td>${dataHoraCurta(m.data)}</td><td>${m.produto}</td><td>${badgeTipoMov(m.tipo)}</td><td class="mov-neg">${m.qtd}</td><td>${m.motivo}</td></tr>`).join('')
    : '<tr><td colspan="5" class="history-empty">Nenhuma saída registrada ainda.</td></tr>';
}

function badgeTipoMov(tipo){
  const classe = {Inicial:'mt-inicial', Entrada:'mt-entrada', Venda:'mt-venda', 'Devolução':'mt-devolucao', 'Saída':'mt-saida', Ajuste:'mt-ajuste'}[tipo] || '';
  return `<span class="badge ${classe}">${tipo}</span>`;
}
function qtdSinal(q){
  return `<span class="${q > 0 ? 'mov-pos' : (q < 0 ? 'mov-neg' : '')}">${q > 0 ? '+' + q : q}</span>`;
}

// ---- Formulário de movimentação manual (Entrada / Saída / Ajuste de inventário) ----
function renderSelectProdutosMov(){
  const opcoes = produtosPDV.map(p => `<option value="${p.codigo}">${p.nome} (estoque: ${p.estoque})</option>`).join('');
  ['movProduto', 'entProduto', 'filtroMovProduto'].forEach(id => {
    const sel = document.getElementById(id);
    const atual = sel.value;
    sel.innerHTML = (id === 'filtroMovProduto' ? '<option value="">Todos os produtos</option>' : '') + opcoes;
    if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  });
  atualizarDicaMov();
}

const MOTIVO_PADRAO_MOV = {Entrada:'Compra de fornecedor', 'Saída':'Perda / avaria', Ajuste:'Inventário'};
function atualizarDicaMov(){
  const tipo = document.getElementById('movTipo').value;
  const prod = produtosPDV.find(p => p.codigo === document.getElementById('movProduto').value);
  document.getElementById('movQtdLabel').textContent = tipo === 'Ajuste' ? 'Quantidade contada' : 'Quantidade';
  document.getElementById('movMotivo').placeholder = 'Ex: ' + MOTIVO_PADRAO_MOV[tipo];
  document.getElementById('movDica').textContent = !prod ? '' : tipo === 'Ajuste'
    ? `Estoque no sistema: ${prod.estoque}. Informe o que foi contado — a diferença vira um ajuste.`
    : `Estoque atual: ${prod.estoque} → ficará ${tipo === 'Entrada' ? '+' : '−'} a quantidade informada.`;
}

function avisarEstoque(msg, erro){
  const toast = document.getElementById('toastMovEstoque');
  toast.textContent = msg;
  toast.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3500);
}

document.getElementById('movTipo').addEventListener('change', atualizarDicaMov);
document.getElementById('movProduto').addEventListener('change', atualizarDicaMov);
document.getElementById('btnRegistrarMov').addEventListener('click', () => {
  const prod = produtosPDV.find(p => p.codigo === document.getElementById('movProduto').value);
  const tipo = document.getElementById('movTipo').value;
  const qtdInput = document.getElementById('movQtd');
  const qtd = parseInt(qtdInput.value, 10);
  const motivoInput = document.getElementById('movMotivo');
  const motivo = motivoInput.value.trim() || MOTIVO_PADRAO_MOV[tipo];
  if (!prod) { avisarEstoque('Selecione um produto.', true); return; }
  if (!Number.isInteger(qtd) || qtd < 0 || (qtd === 0 && tipo !== 'Ajuste')) { avisarEstoque('Informe uma quantidade válida.', true); return; }

  let delta;
  if (tipo === 'Entrada') delta = qtd;
  else if (tipo === 'Saída') {
    if (qtd > prod.estoque) { avisarEstoque(`Saída maior que o estoque atual (${prod.estoque}).`, true); return; }
    delta = -qtd;
  } else {
    delta = qtd - prod.estoque;
    if (delta === 0) { avisarEstoque('Contagem confere com o sistema. Nenhum ajuste necessário.'); return; }
  }

  lancarMovEstoque(prod, tipo, delta, motivo);
  salvarEstoque();
  qtdInput.value = ''; motivoInput.value = '';
  avisarEstoque(`Movimentação registrada (${tipo}): ${prod.nome} ${delta > 0 ? '+' : ''}${delta} (saldo ${prod.estoque}).`);
  renderTelasEstoque();
});

// ---- Entrada de estoque (compra de fornecedor) ----
function hojeISO(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dataBR(iso){ const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; }

function mostrarFormEstoque(qual){
  // O formulário de saída/ajuste fica fixo na tela Estoque › Saída
  const entrada = document.getElementById('entradaCard');
  entrada.style.display = qual === 'entrada' ? 'block' : 'none';
  if (qual === 'entrada') {
    ['entFornecedor', 'entQtd', 'entObs'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('entData').value = hojeISO();
    document.getElementById('entData').max = hojeISO();
    document.getElementById('entAtualizarCusto').checked = true;
    preencherCustoEntrada();
    document.getElementById('entFornecedor').focus();
  }
}

function preencherCustoEntrada(){
  const prod = produtosPDV.find(p => p.codigo === document.getElementById('entProduto').value);
  document.getElementById('entCusto').value = prod ? Number(prod.custo || 0).toFixed(2).replace('.', ',') : '';
  // Sugere o fornecedor do cadastro quando o campo está vazio
  const fornecedor = document.getElementById('entFornecedor');
  if (prod && prod.fornecedor && !fornecedor.value.trim()) fornecedor.value = prod.fornecedor;
  atualizarResumoEntrada();
}

function atualizarResumoEntrada(){
  const prod = produtosPDV.find(p => p.codigo === document.getElementById('entProduto').value);
  const qtd = parseInt(document.getElementById('entQtd').value, 10) || 0;
  const custo = paraNumero(document.getElementById('entCusto').value);
  const box = document.getElementById('entResumo');
  if (!prod) { box.textContent = ''; return; }
  const custoAtual = Number(prod.custo || 0);
  const mudouCusto = Math.abs(custo - custoAtual) > 0.001;
  box.innerHTML = `<span>Total da entrada: <b>${moeda(qtd * custo)}</b></span>
    <span>Estoque: <b>${prod.estoque} → ${prod.estoque + qtd}</b></span>
    ${mudouCusto ? `<span class="entrada-aviso">Custo no cadastro: ${moeda(custoAtual)}</span>` : ''}`;
}

function renderFornecedores(){
  const fornecedores = [...new Set([...movEstoque.map(m => m.fornecedor), ...produtosPDV.map(p => p.fornecedor)].filter(Boolean))].sort();
  document.getElementById('listaFornecedores').innerHTML = fornecedores.map(f => `<option value="${f}">`).join('');
}

function renderEntradasEstoque(){
  const entradas = movEstoque.filter(m => m.tipo === 'Entrada').slice().reverse();
  document.getElementById('tabelaEntradasEstoque').innerHTML = entradas.length
    ? entradas.map(m => `<tr>
        <td>${m.dataDoc ? dataBR(m.dataDoc) : dataHoraCurta(m.data)}</td>
        <td>${m.fornecedor || '—'}</td>
        <td>${m.produto}</td>
        <td class="mov-pos">+${m.qtd}</td>
        <td>${m.custoUnit != null ? moeda(m.custoUnit) : '—'}</td>
        <td>${m.custoUnit != null ? `<b>${moeda(m.custoUnit * m.qtd)}</b>` : '—'}</td>
        <td>${m.obs || (m.fornecedor ? '—' : m.motivo)}</td>
        <td>${m.usuario || '—'}</td></tr>`).join('')
    : `<tr><td colspan="8" class="history-empty">Nenhuma entrada (compra) registrada ainda.${movEstoque.some(m => m.tipo === 'Inicial') ? ` O estoque que já existia (${resumoMovimentos().Inicial} un.) está em <b>Estoque inicial</b>, acima.` : ''}</td></tr>`;
  renderFornecedores();
}

document.getElementById('btnNovaEntrada').addEventListener('click', () => mostrarFormEstoque('entrada'));
document.getElementById('btnSaidaAjuste').addEventListener('click', () => irPara('estoque/saida'));
document.getElementById('btnCancelarEntrada').addEventListener('click', () => mostrarFormEstoque(null));
document.getElementById('entProduto').addEventListener('change', preencherCustoEntrada);
['entQtd', 'entCusto'].forEach(id => document.getElementById(id).addEventListener('input', atualizarResumoEntrada));

document.getElementById('btnRegistrarEntrada').addEventListener('click', () => {
  const fornecedor = document.getElementById('entFornecedor').value.trim();
  const prod = produtosPDV.find(p => p.codigo === document.getElementById('entProduto').value);
  const qtd = parseInt(document.getElementById('entQtd').value, 10);
  const custoTexto = document.getElementById('entCusto').value.trim();
  const custo = paraNumero(custoTexto);
  const dataDoc = document.getElementById('entData').value;
  const obs = document.getElementById('entObs').value.trim();

  if (!fornecedor) { avisarEstoque('Informe o fornecedor.', true); document.getElementById('entFornecedor').focus(); return; }
  if (!prod) { avisarEstoque('Selecione um produto.', true); return; }
  if (!Number.isInteger(qtd) || qtd <= 0) { avisarEstoque('Informe uma quantidade maior que zero.', true); document.getElementById('entQtd').focus(); return; }
  if (!custoTexto || custo < 0) { avisarEstoque('Informe o custo unitário.', true); document.getElementById('entCusto').focus(); return; }
  if (!dataDoc || dataDoc > hojeISO()) { avisarEstoque('Informe uma data válida (não pode ser futura).', true); return; }

  const motivo = `Compra · ${fornecedor}` + (obs ? ` — ${obs}` : '');
  lancarMovEstoque(prod, 'Entrada', qtd, motivo, {fornecedor, custoUnit: custo, dataDoc, obs});
  if (document.getElementById('entAtualizarCusto').checked && Math.abs((prod.custo || 0) - custo) > 0.001) {
    registrarAuditoria('Produtos', `Custo de ${prod.nome} atualizado pela entrada de estoque`, {
      alteracoes: [{campo: 'Custo', antes: moeda(prod.custo), depois: moeda(custo)}], detalhe: `Fornecedor: ${fornecedor}`
    });
    prod.custo = custo;
  }
  salvarEstoque();
  mostrarFormEstoque(null);
  avisarEstoque(`Entrada registrada: ${prod.nome} +${qtd} (${moeda(qtd * custo)}). Estoque atual: ${prod.estoque}.`);
  renderTelasEstoque();
});

// Composição do estoque (usada em Entrada Estoque e em Movimentações).
// "Estoque inicial" é uma categoria própria: saldo que já existia quando o controle começou
// ou quando o produto foi cadastrado — não é uma entrada (compra).
function htmlFluxoEstoque(r, atual){
  const fmtAjuste = r.Ajuste > 0 ? '+' + r.Ajuste : String(r.Ajuste);
  return `
    <div class="flow-step"><span>Estoque inicial</span><b>${r.Inicial}</b><small>saldo de abertura</small></div>
    <div class="flow-op">+</div>
    <div class="flow-step pos"><span>Entradas</span><b>${r.Entrada}</b><small>compras / reposição</small></div>
    <div class="flow-op">−</div>
    <div class="flow-step neg"><span>Vendas</span><b>${-r.Venda}</b></div>
    <div class="flow-op">+</div>
    <div class="flow-step pos"><span>Devoluções</span><b>${r['Devolução']}</b></div>
    <div class="flow-op">−</div>
    <div class="flow-step neg"><span>Outras saídas</span><b>${-r['Saída']}</b><small>perdas, avarias</small></div>
    <div class="flow-op">±</div>
    <div class="flow-step adj"><span>Ajustes</span><b>${fmtAjuste}</b><small>inventário</small></div>
    <div class="flow-op">=</div>
    <div class="flow-step total"><span>Estoque atual</span><b>${atual}</b></div>`;
}

// Estoque inicial por produto, com a origem de cada saldo
function renderEstoqueInicial(){
  const iniciais = movEstoque.filter(m => m.tipo === 'Inicial');
  const total = iniciais.reduce((s, m) => s + m.qtd, 0);
  const r = resumoMovimentos();
  const atual = produtosPDV.reduce((s, p) => s + p.estoque, 0);
  document.getElementById('fluxoEstoqueEntrada').innerHTML = htmlFluxoEstoque(r, atual);
  document.getElementById('estoqueInicialResumo').textContent = `${total} unidade${total === 1 ? '' : 's'} em ${iniciais.length} produto${iniciais.length === 1 ? '' : 's'}`;
  document.getElementById('tabelaEstoqueInicial').innerHTML = iniciais.length
    ? iniciais.slice().sort((a, b) => b.qtd - a.qtd).map(m => `<tr>
        <td>${esc(m.produto)}</td>
        <td><b>${m.qtd}</b></td>
        <td>${dataHoraCurta(m.data)}</td>
        <td>${m.motivo === 'Saldo de abertura' ? 'Saldo que já existia quando o controle de estoque começou' : 'Informado no cadastro do produto'}</td>
        <td>${esc(m.usuario || '—')}</td></tr>`).join('')
    : '<tr><td colspan="5" class="history-empty">Nenhum estoque inicial registrado.</td></tr>';
}

// ---- Tela de Movimentações ----
function renderMovimentacoes(){
  const codigo = document.getElementById('filtroMovProduto').value;
  const tipo = document.getElementById('filtroMovTipo').value;

  // Fluxo resumido: Inicial → Entradas → Vendas/Saídas → Ajustes → Atual
  const r = resumoMovimentos(codigo);
  const atual = codigo
    ? (produtosPDV.find(p => p.codigo === codigo)?.estoque ?? 0)
    : produtosPDV.reduce((s,p) => s + p.estoque, 0);
  document.getElementById('fluxoEstoque').innerHTML = htmlFluxoEstoque(r, atual);
  const divergente = r.total !== atual;
  const aviso = document.getElementById('fluxoAviso');
  aviso.style.display = divergente ? 'block' : 'none';
  aviso.textContent = divergente ? `Atenção: a soma das movimentações (${r.total}) não bate com o estoque atual (${atual}). Faça um ajuste de inventário para corrigir.` : '';

  // Conferência por produto
  document.getElementById('tabelaConferenciaEstoque').innerHTML = produtosPDV.length
    ? produtosPDV.map(p => {
        const rp = resumoMovimentos(p.codigo);
        const ok = rp.total === p.estoque;
        return `<tr><td>${p.nome}</td><td>${rp.Inicial}</td><td>${qtdSinal(rp.Entrada)}</td><td>${qtdSinal(rp.Venda)}</td><td>${qtdSinal(rp['Devolução'])}</td><td>${qtdSinal(rp['Saída'])}</td><td>${qtdSinal(rp.Ajuste)}</td><td><b>${p.estoque}</b></td><td>${ok ? '<span class="badge b-ok">Confere</span>' : `<span class="badge mt-saida">Diverge (${rp.total})</span>`}</td></tr>`;
      }).join('')
    : '<tr><td colspan="9" class="history-empty">Nenhum produto cadastrado.</td></tr>';

  // Extrato de movimentações
  const lista = movEstoque.filter(m => (!codigo || m.codigo === codigo) && (!tipo || m.tipo === tipo)).slice().reverse();
  document.getElementById('tabelaMovEstoque').innerHTML = lista.length
    ? lista.map(m => `<tr><td>${dataHoraCurta(m.data)}</td><td>${m.produto}</td><td>${badgeTipoMov(m.tipo)}</td><td><b>${qtdSinal(m.qtd)}</b></td><td>${m.saldo}</td><td>${m.motivo}</td><td>${m.usuario || '—'}</td></tr>`).join('')
    : '<tr><td colspan="7" class="history-empty">Nenhuma movimentação encontrada.</td></tr>';
}
document.getElementById('filtroMovProduto').addEventListener('change', renderMovimentacoes);
document.getElementById('filtroMovTipo').addEventListener('change', renderMovimentacoes);

function renderTelasEstoque(){
  renderCatalogoPDV();
  renderEstoquePDV();
  renderSaidaEstoquePDV();
  renderSelectProdutosMov();
  renderMovimentacoes();
  renderEntradasEstoque();
  renderEstoqueInicial();
  renderProdutos();
}

function atualizarDashboardPDV(){
  const hoje = new Date().toLocaleDateString('pt-BR');
  const vendasHoje = vendasValidas(vendasRealizadas).filter(v => new Date(v.data).toLocaleDateString('pt-BR') === hoje);
  const totalHoje = vendasHoje.reduce((s,v) => s + valorLiquidoVenda(v), 0);
  const numVendas = vendasHoje.length;
  const ticketMedio = numVendas ? totalHoje / numVendas : 0;
  const porForma = {};
  vendasHoje.forEach(v => { porForma[v.forma] = (porForma[v.forma]||0) + v.total; });
  const entradas = Object.entries(porForma).sort((a,b) => b[1]-a[1]);
  const formaTopTxt = entradas.length ? `${entradas[0][0]} (${Math.round(entradas[0][1]/totalHoje*100)}%)` : '—';

  const dash = document.getElementById('dashPdv');
  dash.querySelector('.k1 b').textContent = moeda(totalHoje);
  dash.querySelector('.k2 b').textContent = numVendas;
  dash.querySelector('.k3 b').textContent = moeda(ticketMedio);
  dash.querySelector('.k4 b').textContent = formaTopTxt;

  const tbody = dash.querySelector('table tbody');
  const ultimas = [...vendasRealizadas].slice(-5).reverse();
  tbody.innerHTML = ultimas.length
    ? ultimas.map(v => `<tr class="${vendaCancelada(v) ? 'venda-cancelada' : ''}"><td>#${v.numero}</td><td>${v.itens}${badgeStatusVenda(v)}</td><td>${valorVendaHtml(v)}</td><td><span class="badge b-ok">${v.forma}</span></td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--muted);">Nenhuma venda registrada ainda.</td></tr>';
}

function atualizarDashboardFinanceiro(){
  const receber = financeiroItens.filter(f => (f.tipo||'').toLowerCase().startsWith('rec')).reduce((s,f) => s + f.valor, 0);
  const pagar = financeiroItens.filter(f => (f.tipo||'').toLowerCase().startsWith('des')).reduce((s,f) => s + f.valor, 0);
  const saldoCaixa = resumoCaixa().esperado;
  const fluxo = receber - pagar;

  const dash = document.getElementById('dashFinanceiro');
  dash.querySelector('.k1 b').textContent = moeda(receber);
  dash.querySelector('.k2 b').textContent = moeda(pagar);
  dash.querySelector('.k3 b').textContent = moeda(saldoCaixa);
  dash.querySelector('.k4 b').textContent = fluxo >= 0 ? 'Positivo' : 'Negativo';

  const tbody = dash.querySelector('table tbody');
  tbody.innerHTML = financeiroItens.length
    ? financeiroItens.map(f => `<tr><td>${f.nome}</td><td>${f.tipo}</td><td>${moeda(f.valor)}</td><td>—</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;color:var(--muted);">Nenhum lançamento cadastrado.</td></tr>';
}

// ---- Ativar sub-abas Operação/Cadastro de cada módulo ----
wireSubtabs('subtabsPDV', {vender:'pdvVender', caixa:'pdvCaixa', vendas:'pdvVendas', cadastro:'pdvCadastro', clientes:'pdvClientes', estoque:'pdvEstoque', saida:'pdvSaidaEstoque', movimentacoes:'pdvMovimentacoes', dashboard:'pdvDashboard',
  inventario:'pdvInventario', clihist:'pdvClientesHistorico', relatorio:'pdvRelatorio'});
wireSubtabs('subtabsHelpdesk', {visao:'helpdeskVisao', cadastro:'helpdeskCadastro'});

// ---- Cadastro de produtos (PDV) ----
// Cadastro próprio (não usa o genérico) por ter foto, unidade, margem calculada e integração com o estoque.
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c])); }
function numBR(v){ return Number(v || 0).toFixed(2).replace('.', ','); }
function margemDe(custo, preco){ return preco > 0 ? ((preco - custo) / preco) * 100 : 0; }

// Completa campos que produtos antigos não tinham
produtosPDV.forEach(p => {
  if (p.unidade === undefined) p.unidade = 'UN';
  ['marca', 'fornecedor', 'foto', 'obs', 'barras', 'categoria'].forEach(k => { if (p[k] === undefined) p[k] = ''; });
  if (p.maximo === undefined) p.maximo = null;
  if (p.ativo === undefined) p.ativo = true;
});

let produtoEditando = null; // código do produto em edição (null = novo)
let fotoProdutoAtual = '';

function avisarProduto(msg, erro){
  const toast = document.getElementById('toastProduto');
  toast.textContent = msg;
  toast.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  toast.style.display = 'block';
  clearTimeout(avisarProduto.timer);
  avisarProduto.timer = setTimeout(() => toast.style.display = 'none', 3500);
}

function renderListasProduto(){
  const unicos = k => [...new Set(produtosPDV.map(p => p[k]).filter(Boolean))].sort();
  document.getElementById('listaCategorias').innerHTML = unicos('categoria').map(v => `<option value="${esc(v)}">`).join('');
  document.getElementById('listaMarcas').innerHTML = unicos('marca').map(v => `<option value="${esc(v)}">`).join('');
  renderFornecedores();
}

function mostrarFotoProduto(){
  const box = document.getElementById('prodFotoPreview');
  box.innerHTML = fotoProdutoAtual ? `<img src="${fotoProdutoAtual}" alt="Foto do produto">` : '<span>Sem foto</span>';
  document.getElementById('btnRemoverFoto').style.display = fotoProdutoAtual ? 'inline-block' : 'none';
}

// Reduz a foto para no máximo 320px (JPEG) antes de guardar, para caber no armazenamento local
function carregarFotoProduto(arquivo){
  if (!arquivo || !arquivo.type.startsWith('image/')) { avisarProduto('Escolha um arquivo de imagem.', true); return; }
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, 320 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      fotoProdutoAtual = canvas.toDataURL('image/jpeg', 0.82);
      mostrarFotoProduto();
    };
    img.onerror = () => avisarProduto('Não foi possível ler essa imagem.', true);
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arquivo);
}

function atualizarLucroProduto(){
  const custo = paraNumero(document.getElementById('prodCusto').value);
  const preco = paraNumero(document.getElementById('prodPreco').value);
  const box = document.getElementById('prodLucro');
  if (!preco) { box.textContent = ''; return; }
  const lucro = preco - custo;
  box.innerHTML = `Lucro por ${document.getElementById('prodUnidade').value}: <b class="${lucro < 0 ? 'mov-neg' : 'mov-pos'}">${moeda(lucro)}</b>` +
    (custo > 0 ? ` · markup ${numBR((lucro / custo) * 100)}%` : '');
}

// Custo/venda recalculam a margem; digitar a margem recalcula o preço de venda
function recalcularMargem(){
  const custo = paraNumero(document.getElementById('prodCusto').value);
  const preco = paraNumero(document.getElementById('prodPreco').value);
  document.getElementById('prodMargem').value = preco > 0 ? numBR(margemDe(custo, preco)) : '';
  atualizarLucroProduto();
}
function recalcularPrecoPelaMargem(){
  const custo = paraNumero(document.getElementById('prodCusto').value);
  const margem = paraNumero(document.getElementById('prodMargem').value);
  if (custo > 0 && margem < 100) document.getElementById('prodPreco').value = numBR(custo / (1 - margem / 100));
  atualizarLucroProduto();
}

function abrirFormProduto(codigo){
  const p = codigo ? produtosPDV.find(x => x.codigo === codigo) : null;
  produtoEditando = p ? p.codigo : null;
  const val = (id, v) => document.getElementById(id).value = v ?? '';
  document.getElementById('formProdutoTitulo').textContent = p ? `Editar produto — ${p.nome}` : 'Novo produto';
  val('prodNome', p?.nome); val('prodCodigo', p?.codigo); val('prodBarras', p?.barras);
  val('prodCategoria', p?.categoria); val('prodMarca', p?.marca); val('prodUnidade', p?.unidade || 'UN');
  val('prodFornecedor', p?.fornecedor);
  val('prodCusto', p ? numBR(p.custo) : ''); val('prodPreco', p ? numBR(p.preco) : '');
  val('prodEstoque', p ? p.estoque : ''); val('prodMinimo', p ? p.minimo : '');
  val('prodMaximo', p && p.maximo != null ? p.maximo : '');
  val('prodStatus', !p || p.ativo !== false ? 'ativo' : 'inativo');
  val('prodObs', p?.obs);
  document.getElementById('prodEstoqueLabel').textContent = p ? 'Estoque atual' : 'Estoque inicial';
  document.getElementById('prodEstoqueDica').textContent = p
    ? 'Alterar o estoque aqui gera um "Ajuste" nas movimentações. Para compras, use Entrada Estoque.'
    : 'O estoque inicial é registrado como "Inicial" nas movimentações.';
  document.getElementById('prodErro').textContent = '';
  fotoProdutoAtual = p?.foto || '';
  mostrarFotoProduto();
  recalcularMargem();
  renderListasProduto();
  document.getElementById('formProduto').style.display = 'block';
  document.getElementById('formProduto').scrollIntoView({behavior:'smooth', block:'start'});
  document.getElementById('prodNome').focus({preventScroll:true});
}

function fecharFormProduto(){
  document.getElementById('formProduto').style.display = 'none';
  produtoEditando = null;
}

const CAMPOS_AUDITORIA_PRODUTO = {
  nome: {nome: 'Nome'}, codigo: {nome: 'Código'}, barras: {nome: 'Código de barras'}, categoria: {nome: 'Categoria'},
  marca: {nome: 'Marca'}, unidade: {nome: 'Unidade'}, fornecedor: {nome: 'Fornecedor'},
  custo: {nome: 'Custo', moeda: true}, preco: {nome: 'Preço de venda', moeda: true},
  minimo: {nome: 'Estoque mínimo'}, maximo: {nome: 'Estoque máximo'}, ativo: {nome: 'Ativo'}, obs: {nome: 'Observação'}, foto: {nome: 'Foto'}
};
function salvarProduto(){
  const v = id => document.getElementById(id).value.trim();
  const inteiro = id => v(id) === '' ? null : parseInt(v(id), 10);
  const erro = (msg, id) => { document.getElementById('prodErro').textContent = msg; if (id) document.getElementById(id).focus(); };
  const antigo = produtoEditando ? produtosPDV.find(p => p.codigo === produtoEditando) : null;

  const novo = {
    ...(antigo || {}),
    nome: v('prodNome'), codigo: v('prodCodigo'), barras: v('prodBarras'),
    categoria: v('prodCategoria'), marca: v('prodMarca'), unidade: v('prodUnidade'), fornecedor: v('prodFornecedor'),
    custo: paraNumero(v('prodCusto')), preco: paraNumero(v('prodPreco')),
    estoque: inteiro('prodEstoque') ?? 0, minimo: inteiro('prodMinimo') ?? 0, maximo: inteiro('prodMaximo'),
    ativo: v('prodStatus') === 'ativo', obs: v('prodObs'), foto: fotoProdutoAtual
  };

  if (!novo.nome) return erro('Informe o nome do produto.', 'prodNome');
  if (!novo.codigo) return erro('Informe o código interno.', 'prodCodigo');
  const outros = produtosPDV.filter(p => p !== antigo);
  if (outros.some(p => p.codigo === novo.codigo)) return erro(`Já existe um produto com o código "${novo.codigo}".`, 'prodCodigo');
  if (novo.barras && outros.some(p => p.barras === novo.barras)) return erro('Esse código de barras já está em outro produto.', 'prodBarras');
  if (novo.preco <= 0) return erro('Informe o preço de venda.', 'prodPreco');
  if (novo.estoque < 0 || novo.minimo < 0 || (novo.maximo != null && novo.maximo < 0)) return erro('Estoque não pode ser negativo.', 'prodEstoque');
  if (novo.maximo != null && novo.maximo < novo.minimo) return erro('O estoque máximo não pode ser menor que o mínimo.', 'prodMaximo');

  // Auditoria: cadastro ou campos alterados (o estoque é registrado pela movimentação)
  if (!antigo) {
    registrarAuditoria('Produtos', `Produto ${novo.nome} cadastrado`, {detalhe: `Código ${novo.codigo} · Preço ${moeda(novo.preco)} · Custo ${moeda(novo.custo)}`});
  } else {
    const alteracoes = diferencas(antigo, novo, CAMPOS_AUDITORIA_PRODUTO);
    if (alteracoes.length) registrarAuditoria('Produtos', `Produto ${novo.nome} editado`, {alteracoes});
  }

  // Estoque definido/alterado no cadastro também vira movimentação
  if (!antigo) {
    lancarMovEstoque(novo, 'Inicial', novo.estoque, 'Cadastro do produto', null, false);
    produtosPDV.push(novo);
  } else {
    if (antigo.codigo !== novo.codigo) movEstoque.forEach(m => { if (m.codigo === antigo.codigo) m.codigo = novo.codigo; });
    const diff = novo.estoque - antigo.estoque;
    if (diff) lancarMovEstoque(novo, 'Ajuste', diff, 'Ajuste manual no cadastro', null, false);
    produtosPDV[produtosPDV.indexOf(antigo)] = novo;
  }
  let semEspaco = false;
  try {
    localStorage.setItem('mga_produtos', JSON.stringify(produtosPDV));
  } catch (e) {
    // Sem espaço (geralmente por fotos): salva sem a foto
    semEspaco = true;
    novo.foto = '';
    lsSet('produtos', produtosPDV);
  }
  lsSet('movEstoque', movEstoque);
  fecharFormProduto();
  avisarProduto(semEspaco ? 'Armazenamento do navegador cheio: o produto foi salvo sem a foto.'
    : antigo ? `Produto "${novo.nome}" atualizado.` : `Produto "${novo.nome}" cadastrado.`, semEspaco);
  renderTelasEstoque();
}

function excluirProduto(codigo){
  const p = produtosPDV.find(x => x.codigo === codigo);
  if (!p) return;
  if (carrinho.some(i => i.codigo === codigo)) { avisarProduto('Esse produto está na venda atual. Remova do carrinho antes de excluir.', true); return; }
  if (!confirm(`Excluir "${p.nome}"?\n\nO histórico de vendas e movimentações é mantido. Se o produto só saiu de linha, prefira marcá-lo como Inativo.`)) return;
  produtosPDV.splice(produtosPDV.indexOf(p), 1);
  registrarAuditoria('Produtos', `Produto ${p.nome} excluído`, {detalhe: `Código ${p.codigo} · estoque no momento: ${p.estoque}`});
  lsSet('produtos', produtosPDV);
  avisarProduto(`Produto "${p.nome}" excluído.`);
  renderTelasEstoque();
}

function renderProdutos(){
  const busca = document.getElementById('buscaProdutos').value.toLowerCase();
  const status = document.getElementById('filtroStatusProdutos').value;
  const lista = produtosPDV.filter(p =>
    [p.nome, p.codigo, p.barras, p.marca, p.categoria, p.fornecedor].some(x => String(x || '').toLowerCase().includes(busca)) &&
    (!status || (status === 'ativo') === (p.ativo !== false)));
  const tbody = document.getElementById('tabelaProdutos');
  tbody.innerHTML = lista.length ? lista.map(p => {
    const margem = margemDe(p.custo || 0, p.preco);
    const baixo = p.estoque <= p.minimo;
    return `<tr class="${p.ativo === false ? 'prod-inativo' : ''}">
      <td>${p.foto ? `<img class="prod-thumb" src="${p.foto}" alt="">` : `<span class="prod-thumb prod-thumb-vazio">${esc(p.nome.charAt(0))}</span>`}</td>
      <td><b>${esc(p.nome)}</b><small class="history-date">${[p.marca, p.unidade, p.fornecedor].filter(Boolean).map(esc).join(' · ')}</small></td>
      <td>${esc(p.codigo)}<small class="history-date">${esc(p.barras) || '—'}</small></td>
      <td>${esc(p.categoria) || '—'}</td>
      <td>${moeda(p.custo)}</td>
      <td><b>${moeda(p.preco)}</b></td>
      <td class="${margem < 0 ? 'mov-neg' : ''}">${numBR(margem)}%</td>
      <td><b class="${baixo ? 'mov-neg' : ''}">${p.estoque}</b><small class="history-date">mín ${p.minimo}${p.maximo != null ? ` · máx ${p.maximo}` : ''}</small></td>
      <td>${p.ativo !== false ? '<span class="badge b-ok">Ativo</span>' : '<span class="badge b-wait">Inativo</span>'}</td>
      <td><div class="row-actions"><button type="button" class="edit" data-codigo="${esc(p.codigo)}" title="Editar">✎</button><button type="button" class="del" data-codigo="${esc(p.codigo)}" title="Excluir">✕</button></div></td>
    </tr>`;
  }).join('') : '<tr><td colspan="10" class="history-empty">Nenhum produto encontrado.</td></tr>';
  tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => abrirFormProduto(b.dataset.codigo)));
  tbody.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => excluirProduto(b.dataset.codigo)));
}

document.getElementById('btnNovoProduto').addEventListener('click', () => abrirFormProduto(null));
document.getElementById('btnCancelarProduto').addEventListener('click', fecharFormProduto);
document.getElementById('btnSalvarProduto').addEventListener('click', salvarProduto);
document.getElementById('buscaProdutos').addEventListener('input', renderProdutos);
document.getElementById('filtroStatusProdutos').addEventListener('change', renderProdutos);
document.getElementById('prodCusto').addEventListener('input', recalcularMargem);
document.getElementById('prodPreco').addEventListener('input', recalcularMargem);
document.getElementById('prodMargem').addEventListener('input', recalcularPrecoPelaMargem);
document.getElementById('prodUnidade').addEventListener('change', atualizarLucroProduto);
document.getElementById('prodFoto').addEventListener('change', e => { carregarFotoProduto(e.target.files[0]); e.target.value = ''; });
document.getElementById('btnRemoverFoto').addEventListener('click', () => { fotoProdutoAtual = ''; mostrarFotoProduto(); });

// ==================================================================
// ---- MGA Food: gestão para alimentação com lucro real por venda ----
// ==================================================================
// Venda − ingredientes − embalagem − taxa da plataforma − outros custos = lucro estimado.
// O custo de cada item vem da FICHA TÉCNICA (ingredientes × preço de compra), de
// adicionais escolhidos pelo cliente e, nos combos, das fichas de cada componente.

const TIPOS_NEGOCIO = [
  {id: 'pizzaria',     nome: 'Pizzaria',      ic: '🍕', categorias: ['Pizzas', 'Pizzas doces', 'Adicionais', 'Bebidas']},
  {id: 'esfiharia',    nome: 'Esfiharia',     ic: '🥙', categorias: ['Esfihas abertas', 'Esfihas fechadas', 'Kibes', 'Bebidas']},
  {id: 'hamburgueria', nome: 'Hamburgueria',  ic: '🍔', categorias: ['Hambúrgueres', 'Combos', 'Porções', 'Bebidas']},
  {id: 'lanchonete',   nome: 'Lanchonete',    ic: '🌭', categorias: ['Lanches', 'Salgados', 'Sucos', 'Bebidas']},
  {id: 'restaurante',  nome: 'Restaurante',   ic: '🍗', categorias: ['Pratos', 'Executivos', 'Sobremesas', 'Bebidas']},
  {id: 'acaiteria',    nome: 'Açaíteria',     ic: '🥤', categorias: ['Açaí', 'Complementos', 'Cremes', 'Bebidas']},
  {id: 'cafeteria',    nome: 'Cafeteria',     ic: '☕', categorias: ['Cafés', 'Doces', 'Salgados', 'Bebidas geladas']},
  {id: 'confeitaria',  nome: 'Confeitaria',   ic: '🍰', categorias: ['Bolos', 'Doces', 'Tortas', 'Encomendas']},
  {id: 'delivery',     nome: 'Delivery',      ic: '🍱', categorias: ['Marmitas', 'Combos', 'Sobremesas', 'Bebidas']}
];

// Taxas de EXEMPLO: cada loja deve conferir o próprio contrato com a plataforma
const CANAIS_PADRAO = [
  {id: 'balcao',   nome: 'Balcão',           ic: '🏪', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: false, ativo: true, fixo: true},
  {id: 'whatsapp', nome: 'WhatsApp',         ic: '📱', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 5, outrosCusto: 0, promocoes: true, entrega: true,  ativo: true},
  {id: 'telefone', nome: 'Telefone',         ic: '📞', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 5, outrosCusto: 0, promocoes: true, entrega: true,  ativo: true},
  {id: 'site',     nome: 'Site próprio',     ic: '🌐', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 6, outrosCusto: 0, promocoes: true, entrega: true,  ativo: true},
  {id: 'proprio',  nome: 'Delivery próprio', ic: '🛵', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 6, outrosCusto: 0, promocoes: true, entrega: true,  ativo: true},
  {id: 'ifood',    nome: 'iFood',            ic: '🟢', comissao: 12, pagamento: 4,   fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: true,  ativo: true},
  {id: 'rappi',    nome: 'Rappi',            ic: '🟠', comissao: 15, pagamento: 3.5, fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: true,  ativo: false},
  {id: '99food',   nome: '99Food',           ic: '🟣', comissao: 10, pagamento: 3,   fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: true,  ativo: false},
  // Keeta sem taxa de exemplo: informe as do seu contrato (ou o print traz a taxa/valor recebido)
  {id: 'keeta',    nome: 'Keeta',            ic: '🔵', comissao: 0,  pagamento: 0,   fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: true,  ativo: false}
];

// Ingredientes de exemplo (preço de compra por unidade)
const INSUMOS_PADRAO = [
  ['Massa de pizza grande', 'ingrediente', 'un', 3.00], ['Massa de pizza média', 'ingrediente', 'un', 2.50],
  ['Molho de tomate', 'ingrediente', 'kg', 12.00], ['Mussarela', 'ingrediente', 'kg', 34.00],
  ['Calabresa', 'ingrediente', 'kg', 36.67], ['Cebola', 'ingrediente', 'kg', 10.00], ['Orégano', 'ingrediente', 'kg', 40.00],
  ['Presunto', 'ingrediente', 'kg', 35.00], ['Champignon', 'ingrediente', 'kg', 40.00], ['Azeitona', 'ingrediente', 'kg', 30.00],
  ['Tomate', 'ingrediente', 'kg', 8.00], ['Manjericão', 'ingrediente', 'kg', 60.00], ['Chocolate', 'ingrediente', 'kg', 35.00],
  ['Catupiry', 'ingrediente', 'kg', 32.00], ['Bacon', 'ingrediente', 'kg', 41.67],
  ['Pão de hambúrguer', 'ingrediente', 'un', 1.20], ['Hambúrguer 150g', 'ingrediente', 'un', 4.50], ['Queijo prato', 'ingrediente', 'kg', 40.00],
  ['Alface e tomate', 'ingrediente', 'kg', 13.33], ['Molho especial', 'ingrediente', 'kg', 20.00],
  ['Batata congelada', 'ingrediente', 'kg', 12.00], ['Óleo de fritura', 'ingrediente', 'L', 10.00],
  ['Refrigerante 2L', 'ingrediente', 'un', 8.50], ['Refrigerante lata', 'ingrediente', 'un', 2.70],
  ['Caixa de pizza grande', 'embalagem', 'un', 2.50], ['Caixa de pizza média', 'embalagem', 'un', 2.00],
  ['Embalagem de hambúrguer', 'embalagem', 'un', 0.80], ['Embalagem de batata', 'embalagem', 'un', 0.50]
].map(([nome, tipo, unidade, preco]) => ({nome, tipo, unidade, preco}));

// Cardápio de exemplo com fichas técnicas (quantidade na unidade informada)
const CARDAPIO_PADRAO = [
  {nome: 'Pizza Calabresa', categoria: 'Pizzas', preco: 39.90, ficha: [
    ['Massa de pizza grande', 1, 'un'], ['Molho de tomate', 100, 'g'], ['Mussarela', 250, 'g'], ['Calabresa', 150, 'g'],
    ['Cebola', 50, 'g'], ['Orégano', 5, 'g'], ['Caixa de pizza grande', 1, 'un']]},
  {nome: 'Pizza Especial', categoria: 'Pizzas', preco: 79.90, outros: 1.50, ficha: [
    ['Massa de pizza grande', 1, 'un'], ['Molho de tomate', 100, 'g'], ['Mussarela', 300, 'g'], ['Presunto', 100, 'g'],
    ['Champignon', 50, 'g'], ['Azeitona', 50, 'g'], ['Orégano', 5, 'g'], ['Cebola', 90, 'g'], ['Caixa de pizza grande', 1, 'un']]},
  {nome: 'Pizza Marguerita', categoria: 'Pizzas', preco: 54.90, ficha: [
    ['Massa de pizza grande', 1, 'un'], ['Molho de tomate', 100, 'g'], ['Mussarela', 250, 'g'], ['Tomate', 100, 'g'],
    ['Manjericão', 5, 'g'], ['Orégano', 5, 'g'], ['Caixa de pizza grande', 1, 'un']]},
  {nome: 'Pizza Chocolate (média)', categoria: 'Pizzas doces', preco: 49.90, ficha: [
    ['Massa de pizza média', 1, 'un'], ['Chocolate', 200, 'g'], ['Caixa de pizza média', 1, 'un']]},
  {nome: 'Catupiry', categoria: 'Adicionais', tipo: 'adicional', preco: 8.00, ficha: [['Catupiry', 100, 'g']]},
  {nome: 'Bacon', categoria: 'Adicionais', tipo: 'adicional', preco: 6.00, ficha: [['Bacon', 60, 'g']]},
  {nome: 'Borda recheada', categoria: 'Adicionais', tipo: 'adicional', preco: 12.00, ficha: [['Catupiry', 120, 'g']]},
  {nome: 'X-Burger', categoria: 'Hambúrgueres', preco: 24.90, ficha: [
    ['Pão de hambúrguer', 1, 'un'], ['Hambúrguer 150g', 1, 'un'], ['Queijo prato', 40, 'g'], ['Alface e tomate', 30, 'g'],
    ['Molho especial', 20, 'g'], ['Embalagem de hambúrguer', 1, 'un']]},
  {nome: 'Batata frita', categoria: 'Porções', preco: 14.90, ficha: [
    ['Batata congelada', 200, 'g'], ['Óleo de fritura', 30, 'ml'], ['Embalagem de batata', 1, 'un']]},
  {nome: 'Refrigerante 2L', categoria: 'Bebidas', preco: 14.00, ficha: [['Refrigerante 2L', 1, 'un']]},
  {nome: 'Refrigerante lata', categoria: 'Bebidas', preco: 6.00, ficha: [['Refrigerante lata', 1, 'un']]},
  {nome: 'Combo X-Burger', categoria: 'Combos', tipo: 'combo', preco: 34.90, componentes: [['X-Burger', 1], ['Batata frita', 1], ['Refrigerante lata', 1]]}
];
// Nomes do cardápio de exemplo da versão anterior (para trocar pelo novo, se não foi mexido)
const CARDAPIO_ANTIGO = ['Pizza Especial (grande)', 'Pizza Calabresa (grande)', 'Pizza Marguerita (grande)', 'Pizza Chocolate (média)', 'Borda recheada', 'Refrigerante 2L'];

const idFood = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const r2 = v => Math.round((Number(v) || 0) * 100) / 100;

let foodConfig = lsGet('foodConfig', null) || {tipo: 'pizzaria', margemVerde: 30, margemAmarela: 15};
let foodCanais = lsGet('foodCanais', null) || CANAIS_PADRAO.map(c => ({...c}));
let foodInsumos = lsGet('foodInsumos', null);
let foodCardapio = lsGet('foodCardapio', null);

function criarCardapioPadrao(){
  const insumoId = nome => foodInsumos.find(i => i.nome === nome)?.id;
  const itens = CARDAPIO_PADRAO.map(d => ({id: idFood(), nome: d.nome, categoria: d.categoria, tipo: d.tipo || 'produto', preco: d.preco,
    ativo: true, ingredientes: 0, embalagem: 0, outros: d.outros || 0,
    ficha: (d.ficha || []).map(([n, qtd, unidade]) => ({insumoId: insumoId(n), qtd, unidade})), componentes: []}));
  CARDAPIO_PADRAO.forEach((d, k) => {
    if (d.componentes) itens[k].componentes = d.componentes.map(([n, qtd]) => ({itemId: itens.find(i => i.nome === n).id, qtd}));
  });
  return itens;
}
if (!Array.isArray(foodInsumos)) {
  foodInsumos = INSUMOS_PADRAO.map(i => ({id: idFood(), ...i}));
  // Cardápio de exemplo da versão anterior ainda intacto: troca pelo novo, com fichas técnicas
  if (Array.isArray(foodCardapio) && foodCardapio.length === CARDAPIO_ANTIGO.length && foodCardapio.every(i => CARDAPIO_ANTIGO.includes(i.nome))) foodCardapio = null;
}
if (!Array.isArray(foodCardapio)) {
  // Primeira vez: aproveita o cadastro simples antigo (sem custos) ou usa o cardápio de exemplo
  const antigo = lsGet('food', null);
  foodCardapio = Array.isArray(antigo)
    ? antigo.map(i => ({id: idFood(), nome: i.nome, categoria: i.categoria || '', tipo: 'produto', preco: Number(i.preco) || 0, ativo: true, ingredientes: 0, embalagem: 0, outros: 0, ficha: [], componentes: []}))
    : criarCardapioPadrao();
}
// Itens salvos na versão anterior (custo manual) ganham os campos novos
foodCardapio.forEach(i => { i.tipo = i.tipo || 'produto'; i.ficha = i.ficha || []; i.componentes = i.componentes || []; });
let foodPedidos = lsGet('foodPedidos', []);
let foodSeq = lsGet('foodSeq', 0);
// Canais novos da tabela padrão (ex.: Keeta) entram para quem já tinha a lista salva
CANAIS_PADRAO.forEach(c => { if (!foodCanais.some(x => x.id === c.id)) foodCanais.push({...c}); });
// Campos novos dos canais (ícone, outros custos, promoções) para listas salvas antes
foodCanais.forEach(c => {
  const pad = CANAIS_PADRAO.find(x => x.id === c.id);
  if (c.ic == null) c.ic = pad ? pad.ic : '🏷️';
  if (c.outrosCusto == null) c.outrosCusto = 0;
  if (c.promocoes == null) c.promocoes = true;
  if (c.id === 'balcao' && ['Balcão / mesa', 'Loja física'].includes(c.nome)) c.nome = 'Balcão';
});
let foodImportacoes = lsGet('foodImportacoes', []);
let foodMovEstoque = lsGet('foodMovEstoque', []);
let foodAlertasMargem = lsGet('foodAlertasMargem', []); // mudanças de custo das fichas técnicas
let foodCustos = lsGet('foodCustos', null) || {fixos: [], diasMes: 26};
// Ingredientes e embalagens que entraram depois na lista padrão (uma vez só)
if (!lsGet('foodInsumosV2', false)) {
  [['Farinha de trigo', 'ingrediente', 'kg', 5.00], ['Frango desfiado', 'ingrediente', 'kg', 28.00],
   ['Copo descartável', 'embalagem', 'un', 0.15], ['Guardanapo', 'embalagem', 'un', 0.03]].forEach(([nome, tipo, unidade, preco]) => {
    if (!foodInsumos.some(i => i.nome.toLowerCase() === nome.toLowerCase())) foodInsumos.push({id: idFood(), nome, tipo, unidade, preco});
  });
  lsSet('foodInsumosV2', true);
}
const salvarFood = () => {
  lsSet('foodImportacoes', foodImportacoes); lsSet('foodMovEstoque', foodMovEstoque);
  lsSet('foodAlertasMargem', foodAlertasMargem); lsSet('foodCustos', foodCustos);
  atualizarBadgeFoodEstoque();
  lsSet('foodConfig', foodConfig); lsSet('foodCanais', foodCanais); lsSet('foodInsumos', foodInsumos);
  lsSet('foodCardapio', foodCardapio); lsSet('foodPedidos', foodPedidos); lsSet('foodSeq', foodSeq);
};
salvarFood();

const tipoNegocio = () => TIPOS_NEGOCIO.find(t => t.id === foodConfig.tipo) || TIPOS_NEGOCIO[0];
const canalPorId = id => foodCanais.find(c => c.id === id) || foodCanais[0];
const taxaPercentual = c => (Number(c.comissao) || 0) + (Number(c.pagamento) || 0);
const itemPorId = id => foodCardapio.find(i => i.id === id);
const insumoPorId = id => foodInsumos.find(i => i.id === id);

// ---- Unidades: kg↔g, L↔ml, un ----
const FATOR_UNIDADE = {kg: 1000, g: 1, L: 1000, ml: 1, un: 1};
const FAMILIA_UNIDADE = {kg: 'massa', g: 'massa', L: 'volume', ml: 'volume', un: 'unidade'};
const unidadesDaFamilia = u => Object.keys(FAMILIA_UNIDADE).filter(x => FAMILIA_UNIDADE[x] === FAMILIA_UNIDADE[u]);
function custoBaseInsumo(ins){ return (Number(ins.preco) || 0) / FATOR_UNIDADE[ins.unidade]; } // R$ por g, ml ou un
function custoLinhaFicha(l){
  const ins = insumoPorId(l.insumoId);
  if (!ins || FAMILIA_UNIDADE[l.unidade] !== FAMILIA_UNIDADE[ins.unidade]) return 0;
  return custoBaseInsumo(ins) * (Number(l.qtd) || 0) * FATOR_UNIDADE[l.unidade];
}
function textoCustoBase(ins){
  const base = custoBaseInsumo(ins);
  const u = {massa: 'g', volume: 'ml', unidade: 'un'}[FAMILIA_UNIDADE[ins.unidade]];
  return u === 'un' ? `${moeda(base)}/un` : `R$ ${base.toFixed(4).replace('.', ',')}/${u}`;
}

// Custo de 1 unidade de um item do cardápio, separado em ingredientes / embalagem / outros
function custosItem(i, profundidade = 0){
  if (i.tipo === 'combo' && profundidade < 2) {
    const soma = {ingredientes: 0, embalagem: 0, outros: Number(i.outros) || 0};
    (i.componentes || []).forEach(c => {
      const comp = itemPorId(c.itemId);
      if (!comp) return;
      const cc = custosItem(comp, profundidade + 1);
      soma.ingredientes += cc.ingredientes * c.qtd; soma.embalagem += cc.embalagem * c.qtd; soma.outros += cc.outros * c.qtd;
    });
    return {ingredientes: r2(soma.ingredientes), embalagem: r2(soma.embalagem), outros: r2(soma.outros)};
  }
  if (i.ficha && i.ficha.length) {
    let ingredientes = 0, embalagem = 0;
    i.ficha.forEach(l => { const v = custoLinhaFicha(l); if (insumoPorId(l.insumoId)?.tipo === 'embalagem') embalagem += v; else ingredientes += v; });
    return {ingredientes: r2(ingredientes), embalagem: r2(embalagem), outros: r2(i.outros)};
  }
  // Sem ficha técnica: custo informado manualmente (ou linha de pedido já calculada)
  return {ingredientes: r2(i.ingredientes), embalagem: r2(i.embalagem), outros: r2(i.outros)};
}
const custoItem = i => { const c = custosItem(i); return r2(c.ingredientes + c.embalagem + c.outros); };
const itemComCusto = i => ({...i, ...custosItem(i)});
const semCusto = i => !custoItem(i);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const origemCusto = i => i.tipo === 'combo' ? `combo · ${plural(i.componentes.length, 'item', 'itens')}` : i.ficha.length ? `ficha técnica · ${plural(i.ficha.length, 'ingrediente', 'ingredientes')}` : 'custo manual';

// Cálculo central do lucro de um pedido (itens já com custos por unidade)
function calcularLucroFood(itens, canal, desconto = 0){
  const venda = r2(itens.reduce((s, i) => s + i.preco * i.qtd, 0));
  const descCliente = r2(Math.min(Math.max(desconto, 0), venda));
  // Promoção paga pela plataforma (canal com "Promoções no cálculo" desmarcado): o cliente paga menos, a loja recebe o preço cheio
  const desc = canal.promocoes === false ? 0 : descCliente;
  const receita = r2(venda - desc);
  const ingredientes = r2(itens.reduce((s, i) => s + (i.ingredientes || 0) * i.qtd, 0));
  const embalagem = r2(itens.reduce((s, i) => s + (i.embalagem || 0) * i.qtd, 0));
  const outrosItens = r2(itens.reduce((s, i) => s + (i.outros || 0) * i.qtd, 0));
  const pct = taxaPercentual(canal);
  const taxa = receita > 0 ? r2(receita * pct / 100 + (Number(canal.fixa) || 0)) : 0;
  const entrega = receita > 0 ? r2(Number(canal.entregaCusto) || 0) : 0;
  const outrosCanal = receita > 0 ? r2(Number(canal.outrosCusto) || 0) : 0;
  const outros = r2(outrosItens + entrega + outrosCanal);
  const lucro = r2(receita - ingredientes - embalagem - taxa - outros);
  return {venda, desconto: desc, descontoSubsidiado: r2(descCliente - desc), receita, ingredientes, embalagem, taxa, taxaPct: pct, taxaFixa: Number(canal.fixa) || 0,
    outros, outrosItens, outrosCanal, entrega, lucro, margem: receita > 0 ? lucro / receita * 100 : 0, canalNome: canal.nome};
}
const lucroItemNoCanal = (i, canal) => calcularLucroFood([{...itemComCusto(i), qtd: 1}], canal);

function faixaMargem(m){
  if (m >= foodConfig.margemVerde) return {cls: 'verde', ic: '🟢', rotulo: 'Margem boa'};
  if (m >= foodConfig.margemAmarela) return {cls: 'amarelo', ic: '🟡', rotulo: 'Atenção'};
  return {cls: 'vermelho', ic: '🔴', rotulo: 'Margem baixa'};
}
const pctBR = v => (Number(v) || 0).toFixed(2).replace('.', ',') + '%';

// Composição do lucro no formato: VENDA / (−) custos / LUCRO ESTIMADO / 🟢 Lucro · Margem
function htmlLucro(c, vazio){
  if (vazio) return '<p class="lc-vazio">A composição do lucro aparece aqui assim que houver itens.</p>';
  const f = faixaMargem(c.margem);
  const taxaDesc = c.taxaPct || c.taxaFixa ? `${esc(c.canalNome)} · ${pctBR(c.taxaPct)}${c.taxaFixa ? ` + ${moeda(c.taxaFixa)}` : ''}` : `${esc(c.canalNome)} · sem taxa`;
  return `
    <div class="lc-titulo">Composição do lucro</div>
    ${c.desconto > 0 ? `<div class="lc-linha lc-sub"><span>Subtotal</span><b>${moeda(c.venda)}</b></div><div class="lc-linha lc-sub"><span>Desconto</span><b>− ${moeda(c.desconto)}</b></div>` : ''}
    ${c.descontoSubsidiado > 0 ? `<div class="lc-linha lc-sub"><span>Promoção paga pela plataforma <small>não reduz o que você recebe</small></span><b>${moeda(c.descontoSubsidiado)}</b></div>` : ''}
    <div class="lc-linha lc-venda"><span>VENDA</span><b>${moeda(c.receita)}</b></div>
    <div class="lc-linha"><span>(−) Custo dos ingredientes</span><b>${moeda(c.ingredientes)}</b></div>
    <div class="lc-linha"><span>(−) Embalagem</span><b>${moeda(c.embalagem)}</b></div>
    <div class="lc-linha"><span>(−) Taxa da plataforma <small>${taxaDesc}</small></span><b>${moeda(c.taxa)}</b></div>
    <div class="lc-linha"><span>(−) Outros custos${c.entrega || c.outrosCanal ? ` <small>inclui ${[c.entrega ? `entrega ${moeda(c.entrega)}` : '', c.outrosCanal ? `custos do canal ${moeda(c.outrosCanal)}` : ''].filter(Boolean).join(' e ')}</small>` : ''}</span><b>${moeda(c.outros)}</b></div>
    <div class="lc-total"><span>LUCRO ESTIMADO</span><b class="lc-${f.cls}">${moeda(c.lucro)}</b></div>
    <div class="lc-indicador lc-bg-${f.cls}">${f.ic} Lucro: <b>${moeda(c.lucro)}</b> · Margem: <b>${pctBR(c.margem)}</b></div>`;
}

function avisarFood(id, msg, erro){
  const t = document.getElementById(id);
  t.textContent = msg;
  t.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  t.style.display = 'block';
  clearTimeout(avisarFood[id]);
  avisarFood[id] = setTimeout(() => t.style.display = 'none', 3500);
}

function preencherSelectCanais(sel, apenasAtivos = true){
  const atual = sel.value;
  sel.innerHTML = foodCanais.filter(c => !apenasAtivos || c.ativo).map(c => `<option value="${c.id}">${c.ic ? c.ic + ' ' : ''}${esc(c.nome)}${taxaPercentual(c) ? ` (${pctBR(taxaPercentual(c))})` : ''}</option>`).join('');
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
}

// ---- Novo pedido ----
let foodCarrinho = [];
let foodCategoria = '';
const adicionaisAtivos = () => foodCardapio.filter(i => i.tipo === 'adicional' && i.ativo !== false);

function renderFoodNovoPedido(){
  const nomesClientes = [...new Set([...(typeof clientes !== 'undefined' ? clientes.map(c => c.nome) : []), ...foodPedidos.map(p => p.cliente).filter(n => n && !ehMesa(n))])];
  document.getElementById('listaClientesFood').innerHTML = nomesClientes.slice(0, 300).map(n => `<option value="${esc(n)}">`).join('');
  preencherSelectCanais(document.getElementById('fnCanal'));
  document.getElementById('fnNumero').textContent = '#' + (foodSeq + 1);
  // Adicionais não aparecem soltos: são escolhidos ao adicionar um produto
  const vendaveis = foodCardapio.filter(i => i.ativo !== false && i.tipo !== 'adicional');
  const categorias = [...new Set(vendaveis.map(i => i.categoria).filter(Boolean))];
  if (foodCategoria && !categorias.includes(foodCategoria)) foodCategoria = '';
  document.getElementById('fnCategorias').innerHTML = ['', ...categorias].map(c => `<button type="button" class="fn-chip ${c === foodCategoria ? 'active' : ''}" data-cat="${esc(c)}">${c ? esc(c) : 'Todos'}</button>`).join('');
  document.querySelectorAll('#fnCategorias .fn-chip').forEach(b => b.addEventListener('click', () => { foodCategoria = b.dataset.cat; renderFoodNovoPedido(); }));
  const busca = document.getElementById('fnBusca').value.trim().toLowerCase();
  const canal = canalPorId(document.getElementById('fnCanal').value);
  const lista = vendaveis.filter(i => (!foodCategoria || i.categoria === foodCategoria) && (!busca || (i.nome + ' ' + i.categoria).toLowerCase().includes(busca)));
  document.getElementById('fnItens').innerHTML = lista.length ? lista.map(i => {
    const c = lucroItemNoCanal(i, canal);
    const f = faixaMargem(c.margem);
    return `<button type="button" class="pdv-item fn-item" data-id="${i.id}">
      <b>${i.tipo === 'combo' ? '🍔 ' : ''}${esc(i.nome)}</b><span>${i.tipo === 'combo' ? i.componentes.map(x => `${x.qtd}x ${esc(itemPorId(x.itemId)?.nome || '?')}`).join(' + ') : esc(i.categoria)}</span>
      <span class="preco">${moeda(i.preco)}</span>
      <span class="fn-lucro lc-${f.cls}">${semCusto(i) ? '⚠ custo não informado' : `${f.ic} lucro ${moeda(c.lucro)} (${pctBR(c.margem)})`}</span>
    </button>`;
  }).join('') : '<p class="empty-msg">Nenhum item encontrado. Cadastre itens em Food › Produtos.</p>';
  document.querySelectorAll('#fnItens .fn-item').forEach(b => b.addEventListener('click', () => escolherItemFood(b.dataset.id)));
  renderFoodCarrinho();
}

// Produto com adicionais disponíveis abre a escolha; combos e bebidas entram direto
let adicionaisPara = null;
function escolherItemFood(id){
  const item = itemPorId(id);
  if (!item) return;
  const semAdicionais = item.tipo === 'combo' || /bebida/i.test(item.categoria || '') || !adicionaisAtivos().length;
  if (semAdicionais) { adicionarItemFood(id, []); return; }
  adicionaisPara = id;
  document.getElementById('adicionaisTitulo').textContent = `Adicionais — ${item.nome}`;
  document.getElementById('adicionaisSub').textContent = 'Marque o que o cliente pediu a mais. O preço e o custo dos adicionais entram na conta do lucro.';
  document.getElementById('adicionaisLista').innerHTML = adicionaisAtivos().map(a => `
    <label class="ad-opcao"><input type="checkbox" value="${a.id}"> <span class="ad-nome">${esc(a.nome)}</span>
      <span class="ad-preco">+ ${moeda(a.preco)}</span><small>custo ${moeda(custoItem(a))}</small></label>`).join('');
  document.querySelectorAll('#adicionaisLista input').forEach(inp => inp.addEventListener('change', atualizarTotalAdicionais));
  atualizarTotalAdicionais();
  document.getElementById('adicionaisOverlay').style.display = 'flex';
}
function adicionaisMarcados(){ return [...document.querySelectorAll('#adicionaisLista input:checked')].map(i => i.value); }
function atualizarTotalAdicionais(){
  const item = itemPorId(adicionaisPara);
  const linha = montarLinhaFood(item, adicionaisMarcados());
  document.getElementById('adicionaisTotal').innerHTML = `
    <div class="lc-linha"><span>${esc(item.nome)}${linha.adicionais.length ? ' + ' + linha.adicionais.map(a => esc(a.nome)).join(' + ') : ''}</span><b>${moeda(linha.preco)}</b></div>
    <div class="lc-linha lc-sub"><span>Custo total</span><b>${moeda(linha.ingredientes + linha.embalagem + linha.outros)}</b></div>`;
  document.getElementById('btnAdConfirmar').textContent = adicionaisMarcados().length ? 'Adicionar ao pedido' : 'Adicionar sem adicionais';
}
function fecharAdicionais(){ document.getElementById('adicionaisOverlay').style.display = 'none'; adicionaisPara = null; }
document.getElementById('btnAdCancelar').addEventListener('click', fecharAdicionais);
document.getElementById('btnAdConfirmar').addEventListener('click', () => { const id = adicionaisPara, ads = adicionaisMarcados(); fecharAdicionais(); adicionarItemFood(id, ads); });
document.getElementById('adicionaisOverlay').addEventListener('click', e => { if (e.target.id === 'adicionaisOverlay') fecharAdicionais(); });

// Linha do pedido: preço e custos por unidade já somando os adicionais (fica congelada no pedido)
function montarLinhaFood(item, adicionaisIds){
  const base = custosItem(item);
  const adicionais = adicionaisIds.map(itemPorId).filter(Boolean).map(a => ({id: a.id, nome: a.nome, preco: a.preco, ...custosItem(a)}));
  const soma = k => r2(base[k] + adicionais.reduce((s, a) => s + a[k], 0));
  return {
    chave: item.id + '|' + adicionaisIds.slice().sort().join(','), id: item.id, nome: item.nome, tipo: item.tipo,
    precoBase: item.preco, custoBase: r2(base.ingredientes + base.embalagem + base.outros),
    preco: r2(item.preco + adicionais.reduce((s, a) => s + a.preco, 0)),
    ingredientes: soma('ingredientes'), embalagem: soma('embalagem'), outros: soma('outros'),
    adicionais: adicionais.map(a => ({id: a.id, nome: a.nome, preco: a.preco, custo: r2(a.ingredientes + a.embalagem + a.outros)})),
    componentes: item.tipo === 'combo' ? item.componentes.map(c => `${c.qtd}x ${itemPorId(c.itemId)?.nome || '?'}`) : [],
    qtd: 1
  };
}
function adicionarItemFood(id, adicionaisIds){
  const item = itemPorId(id);
  if (!item) return;
  const linha = montarLinhaFood(item, adicionaisIds);
  const igual = foodCarrinho.find(l => l.chave === linha.chave);
  if (igual) igual.qtd++; else foodCarrinho.push(linha);
  renderFoodCarrinho();
}

function htmlDetalheLinha(l){
  const partes = [];
  if (l.componentes && l.componentes.length) partes.push(l.componentes.map(esc).join(' + '));
  if (l.adicionais && l.adicionais.length) partes.push(l.adicionais.map(a => `+ ${esc(a.nome)} ${moeda(a.preco)} <em>(custo ${moeda(a.custo)})</em>`).join('<br>'));
  return partes.length ? `<div class="fn-adicionais">${partes.join('<br>')}</div>` : '';
}

function renderFoodCarrinho(){
  const canal = canalPorId(document.getElementById('fnCanal').value);
  const vazio = !foodCarrinho.length;
  document.getElementById('fnVazio').style.display = vazio ? 'block' : 'none';
  document.getElementById('fnCarrinho').innerHTML = foodCarrinho.map((i, k) => `
    <div class="cart-item">
      <div class="ci-top">
        <div class="ci-info"><b class="nome">${esc(i.nome)}</b>${htmlDetalheLinha(i)}<small>${moeda(i.preco)} un. · custo ${moeda(i.ingredientes + i.embalagem + i.outros)}</small></div>
        <div class="ci-valor"><b>${moeda(i.preco * i.qtd)}</b></div>
      </div>
      <div class="ci-bottom">
        <div class="qtd"><span class="qtd-label">Qtd:</span>
          <button type="button" class="menos" data-k="${k}" aria-label="Diminuir">−</button>
          <span class="fn-qtd">${i.qtd}</span>
          <button type="button" class="mais" data-k="${k}" aria-label="Aumentar">+</button>
        </div>
        <button type="button" class="rm" data-k="${k}" title="Remover item" aria-label="Remover item" style="margin-left:auto;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button>
      </div>
    </div>`).join('');
  const box = document.getElementById('fnCarrinho');
  box.querySelectorAll('.mais').forEach(b => b.addEventListener('click', () => { foodCarrinho[b.dataset.k].qtd++; renderFoodCarrinho(); }));
  box.querySelectorAll('.menos').forEach(b => b.addEventListener('click', () => { const i = foodCarrinho[b.dataset.k]; i.qtd--; if (i.qtd <= 0) foodCarrinho.splice(b.dataset.k, 1); renderFoodCarrinho(); }));
  box.querySelectorAll('.rm').forEach(b => b.addEventListener('click', () => { foodCarrinho.splice(b.dataset.k, 1); renderFoodCarrinho(); }));
  const c = calcularLucroFood(foodCarrinho, canal, paraNumero(document.getElementById('fnDesconto').value));
  document.getElementById('fnLucro').innerHTML = htmlLucro(c, vazio);
  document.getElementById('btnFnRegistrar').disabled = vazio || c.receita <= 0;
}

function limparPedidoFood(){
  foodCarrinho = [];
  ['fnCliente', 'fnDesconto', 'fnObs'].forEach(id => document.getElementById(id).value = '');
  renderFoodNovoPedido();
}

function registrarPedidoFood(){
  if (!foodCarrinho.length) return;
  const canal = canalPorId(document.getElementById('fnCanal').value);
  const desconto = paraNumero(document.getElementById('fnDesconto').value);
  const calc = calcularLucroFood(foodCarrinho, canal, desconto);
  if (calc.receita <= 0) return;
  foodSeq++;
  const pedido = {
    numero: foodSeq, data: new Date().toISOString(), usuario: usuarioAtual,
    canalId: canal.id, canalNome: canal.nome, entrega: !!canal.entrega,
    taxas: {comissao: canal.comissao, pagamento: canal.pagamento, fixa: canal.fixa, entregaCusto: canal.entregaCusto}, // guardadas como estavam no momento
    cliente: document.getElementById('fnCliente').value.trim(), obs: document.getElementById('fnObs').value.trim(),
    itens: foodCarrinho.map(i => ({...i})), desconto: calc.desconto, calc,
    status: 'preparo', historico: [{status: 'preparo', data: new Date().toISOString(), usuario: usuarioAtual}]
  };
  foodPedidos.push(pedido);
  baixarEstoquePedido(pedido);
  salvarFood();
  registrarAuditoria('Food', `Pedido Food #${pedido.numero} registrado — ${moeda(calc.receita)} (${canal.nome})`, {
    detalhe: `${pedido.itens.map(i => `${i.qtd}x ${i.nome}${i.adicionais.length ? ' (+ ' + i.adicionais.map(a => a.nome).join(', ') + ')' : ''}`).join(', ')} · lucro estimado ${moeda(calc.lucro)} (${pctBR(calc.margem)})`
  });
  const faltando = pedido.consumo.map(c => insumoPorId(c.insumoId)).filter(i => i && ['baixo', 'zerado'].includes(situacaoEstoqueFood(i).cls));
  avisarFood('toastFood', `Pedido #${pedido.numero} registrado · lucro estimado ${moeda(calc.lucro)} (${pctBR(calc.margem)}).${faltando.length ? ` ⚠ Estoque baixo: ${faltando.map(i => i.nome).join(', ')}.` : ''}`);
  limparPedidoFood();
  atualizarDashFood();
}

document.getElementById('fnBusca').addEventListener('input', renderFoodNovoPedido);
document.getElementById('fnCanal').addEventListener('change', renderFoodNovoPedido);
document.getElementById('fnDesconto').addEventListener('input', renderFoodCarrinho);
document.getElementById('btnFnLimpar').addEventListener('click', () => { if (!foodCarrinho.length || confirm('Descartar o pedido atual?')) limparPedidoFood(); });
document.getElementById('btnFnRegistrar').addEventListener('click', registrarPedidoFood);

// ---- Pedidos (quadro de acompanhamento) ----
const ETAPAS_FOOD = [
  {id: 'preparo', nome: 'Em preparo'}, {id: 'pronto', nome: 'Pronto'},
  {id: 'entrega', nome: 'Saiu para entrega'}, {id: 'entregue', nome: 'Entregue'}
];
function proximaEtapa(p){
  const ordem = p.entrega ? ['preparo', 'pronto', 'entrega', 'entregue'] : ['preparo', 'pronto', 'entregue'];
  return ordem[ordem.indexOf(p.status) + 1] || null;
}
function mudarStatusPedido(numero, status){
  const p = foodPedidos.find(x => x.numero === Number(numero));
  if (!p) return;
  if (status === 'cancelado') {
    const motivo = prompt(`Cancelar o pedido #${p.numero}? Informe o motivo:`, 'Cliente desistiu');
    if (motivo === null) return;
    p.motivoCancelamento = motivo || 'Sem motivo';
    estornarEstoquePedido(p, 'Pedido cancelado');
    registrarAuditoria('Food', `Pedido Food #${p.numero} cancelado — ${moeda(p.calc.receita)}`, {detalhe: `Motivo: ${p.motivoCancelamento}`});
  }
  p.status = status;
  p.historico.push({status, data: new Date().toISOString(), usuario: usuarioAtual});
  salvarFood();
  renderFoodPedidos();
  atualizarDashFood();
}
const nomeLinhaPedido = i => `${i.qtd}x ${esc(i.nome)}${(i.adicionais || []).length ? ` <em>+ ${i.adicionais.map(a => esc(a.nome)).join(', ')}</em>` : ''}`;

function renderFoodPedidos(){
  const hoje = new Date().toDateString();
  // Em andamento (qualquer dia) + entregues de hoje
  const visiveis = foodPedidos.filter(p => p.status !== 'cancelado' && (p.status !== 'entregue' || new Date(p.data).toDateString() === hoje));
  const hojePedidos = foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data).toDateString() === hoje);
  const lucroHoje = hojePedidos.reduce((s, p) => s + p.calc.lucro, 0);
  document.getElementById('fkResumo').textContent = `Hoje: ${hojePedidos.length} pedido${hojePedidos.length === 1 ? '' : 's'} · vendas ${moeda(hojePedidos.reduce((s, p) => s + p.calc.receita, 0))} · lucro estimado ${moeda(lucroHoje)}`;
  document.getElementById('fkQuadro').innerHTML = ETAPAS_FOOD.map(et => {
    const lista = visiveis.filter(p => p.status === et.id).sort((a, b) => a.numero - b.numero);
    return `<div class="fk-coluna">
      <h3>${et.nome} <span class="fk-cont">${lista.length}</span></h3>
      ${lista.length ? lista.map(p => {
        const f = faixaMargem(p.calc.margem);
        const prox = proximaEtapa(p);
        return `<div class="fk-card">
          <div class="fk-card-topo"><b>#${p.numero}</b><span class="badge mt-venda">${p.importado ? '📲 ' : ''}${esc(p.canalNome)}</span><small>${new Date(p.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</small></div>
          ${p.cliente ? `<div class="fk-cliente">${esc(p.cliente)}</div>` : ''}
          <div class="fk-itens">${p.itens.map(nomeLinhaPedido).join('<br>')}</div>
          ${p.obs ? `<div class="fk-obs">${esc(p.obs)}</div>` : ''}
          <div class="fk-valores"><b>${moeda(p.calc.receita)}</b><span class="fk-lucro lc-bg-${f.cls}">${f.ic} ${moeda(p.calc.lucro)} · ${pctBR(p.calc.margem)}</span></div>
          <div class="fk-acoes">
            <button type="button" class="link-btn fk-detalhe" data-n="${p.numero}">Ver lucro</button>
            ${p.status !== 'entregue' ? `<button type="button" class="link-btn fk-cancelar" data-n="${p.numero}">Cancelar</button>` : ''}
            ${prox ? `<button type="button" class="btn fk-avancar" data-n="${p.numero}" data-s="${prox}">${ETAPAS_FOOD.find(e => e.id === prox).nome} →</button>` : ''}
          </div>
        </div>`;
      }).join('') : '<p class="fk-vazio">Nenhum pedido.</p>'}
    </div>`;
  }).join('');
  const q = document.getElementById('fkQuadro');
  q.querySelectorAll('.fk-avancar').forEach(b => b.addEventListener('click', () => mudarStatusPedido(b.dataset.n, b.dataset.s)));
  q.querySelectorAll('.fk-cancelar').forEach(b => b.addEventListener('click', () => mudarStatusPedido(b.dataset.n, 'cancelado')));
  q.querySelectorAll('.fk-detalhe').forEach(b => b.addEventListener('click', () => mostrarLucroPedidoFood(b.dataset.n)));
}

// Detalhe do pedido: usa o modal de comprovante
function mostrarLucroPedidoFood(numero){
  const p = foodPedidos.find(x => x.numero === Number(numero));
  if (!p) return;
  document.getElementById('comprovanteTitulo').textContent = `Pedido Food #${p.numero}`;
  document.getElementById('comprovanteConteudo').innerHTML = `
    <header class="receipt-head">
      <div class="receipt-logo">${tipoNegocio().ic} MGA Food</div>
      <p class="receipt-id">Pedido #${p.numero} · ${new Date(p.data).toLocaleString('pt-BR')}<br>Canal: ${esc(p.canalNome)}${p.cliente ? ` · ${esc(p.cliente)}` : ''}</p>
    </header>
    <table class="receipt-items"><tbody>${p.itens.map(i => `<tr><td><span class="receipt-product">${i.qtd}x ${esc(i.nome)}</span>
      ${(i.adicionais || []).map(a => `<small>+ ${esc(a.nome)} ${moeda(a.preco)} · custo ${moeda(a.custo)}</small>`).join('')}
      <small>custo un. ${moeda((i.ingredientes || 0) + (i.embalagem || 0) + (i.outros || 0))}</small></td><td>${moeda(i.preco * i.qtd)}</td></tr>`).join('')}</tbody></table>
    <div class="lucro-card lucro-comprovante">${htmlLucro(p.calc)}</div>
    ${p.obs ? `<div class="receipt-obs"><b>Obs.:</b> ${esc(p.obs)}</div>` : ''}
    <p class="receipt-footer">Lucro estimado com as fichas técnicas e as taxas do canal no momento do pedido.<br>Não inclui aluguel, salários, impostos e despesas fixas.</p>`;
  document.getElementById('comprovanteOverlay').style.display = 'flex';
}

// ---- Cardápio e fichas técnicas ----
let fcEditando = null;
let fcRascunho = null; // item em edição (tipo, ficha, componentes)
function canalMaisCaro(){
  return foodCanais.filter(c => c.ativo).sort((a, b) => (taxaPercentual(b) + b.fixa + b.entregaCusto) - (taxaPercentual(a) + a.fixa + a.entregaCusto))[0] || foodCanais[0];
}
const ROTULO_TIPO = {produto: 'Produto', adicional: 'Adicional', combo: 'Combo'};

function renderFoodCardapio(){
  const selRef = document.getElementById('fcCanalRef');
  if (!selRef.value) { preencherSelectCanais(selRef); selRef.value = canalMaisCaro().id; } else preencherSelectCanais(selRef);
  const ref = canalPorId(selRef.value);
  const balcao = canalPorId('balcao');
  document.getElementById('fcColCanal').textContent = `Lucro no ${ref.nome}`;
  document.getElementById('listaCategoriasFood').innerHTML = [...new Set([...tipoNegocio().categorias, ...foodCardapio.map(i => i.categoria)].filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('');
  const busca = document.getElementById('fcBusca').value.trim().toLowerCase();
  const ordem = {produto: 0, combo: 1, adicional: 2};
  const lista = foodCardapio.filter(i => !busca || (i.nome + ' ' + i.categoria).toLowerCase().includes(busca))
    .sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || String(a.categoria).localeCompare(String(b.categoria), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
  const celLucro = (i, canal) => {
    const c = lucroItemNoCanal(i, canal);
    const f = faixaMargem(c.margem);
    return `<b class="lc-${f.cls}">${moeda(c.lucro)}</b><small class="history-date">${f.ic} ${pctBR(c.margem)}${canal.id !== 'balcao' ? ` · taxa ${moeda(c.taxa)}` : ''}</small>`;
  };
  document.getElementById('fcTabela').innerHTML = lista.length ? lista.map(i => {
    const c = lucroItemNoCanal(i, ref);
    const f = faixaMargem(c.margem);
    const situacao = i.ativo === false ? '<span class="badge b-wait">Inativo</span>'
      : semCusto(i) ? '<span class="badge b-wait">⚠ Custo não informado</span>'
      : `<span class="badge fc-badge-${f.cls}">${f.ic} ${f.rotulo}</span>`;
    return `<tr class="${i.ativo === false ? 'prod-inativo' : ''}">
      <td><b>${esc(i.nome)}</b>${i.tipo === 'combo' ? `<small class="history-date">${i.componentes.map(x => `${x.qtd}x ${esc(itemPorId(x.itemId)?.nome || '?')}`).join(' + ')}</small>` : ''}</td>
      <td><span class="badge fc-tipo-${i.tipo}">${ROTULO_TIPO[i.tipo]}</span></td>
      <td>${esc(i.categoria) || '—'}</td><td class="nowrap">${moeda(i.preco)}</td>
      <td class="nowrap"><b>${moeda(custoItem(i))}</b><small class="history-date">${origemCusto(i)}</small></td>
      <td class="nowrap">${celLucro(i, balcao)}</td><td class="nowrap">${celLucro(i, ref)}</td><td>${situacao}</td>
      <td><div class="row-actions"><button type="button" class="edit" data-id="${i.id}" title="Editar / ver ficha técnica">✎</button><button type="button" class="del" data-id="${i.id}" title="Excluir">✕</button></div></td></tr>`;
  }).join('') : '<tr><td colspan="9" class="history-empty">Nenhum item no cardápio.</td></tr>';
  document.querySelectorAll('#fcTabela .edit').forEach(b => b.addEventListener('click', () => abrirFormFood(b.dataset.id)));
  document.querySelectorAll('#fcTabela .del').forEach(b => b.addEventListener('click', () => excluirItemFood(b.dataset.id)));
}

const AJUDA_TIPO = {
  produto: 'Item vendido no cardápio. O custo vem da ficha técnica: ingredientes e embalagens de 1 unidade.',
  adicional: 'Extra que o cliente escolhe junto com um produto (ex.: Catupiry, Bacon). O preço e o custo somam no pedido.',
  combo: 'Conjunto de itens com preço próprio. O custo é a soma das fichas técnicas dos itens do combo.'
};
function abrirFormFood(id){
  const i = id ? itemPorId(id) : null;
  fcEditando = i ? i.id : null;
  fcRascunho = {tipo: i?.tipo || 'produto', ficha: (i?.ficha || []).map(l => ({...l})), componentes: (i?.componentes || []).map(c => ({...c}))};
  const val = (campo, v) => document.getElementById(campo).value = v ?? '';
  document.getElementById('fcFormTitulo').textContent = i ? `Editar — ${i.nome}` : 'Novo item';
  val('fcNome', i?.nome); val('fcCategoria', i?.categoria || tipoNegocio().categorias[0]);
  val('fcPreco', i ? numBR(i.preco) : '');
  val('fcIngredientes', i && !i.ficha.length ? numBR(i.ingredientes) : '');
  val('fcEmbalagem', i && !i.ficha.length ? numBR(i.embalagem) : '');
  val('fcOutros', i && i.outros ? numBR(i.outros) : '');
  val('fcAtivo', !i || i.ativo !== false ? '1' : '0');
  document.getElementById('fcErro').textContent = '';
  preencherSelectCanais(document.getElementById('fcPreviewCanal'));
  document.getElementById('fcPreviewCanal').value = document.getElementById('fcCanalRef').value || canalMaisCaro().id;
  renderFormFood();
  document.getElementById('fcForm').style.display = 'block';
  document.getElementById('fcForm').scrollIntoView({behavior: 'smooth', block: 'start'});
  document.getElementById('fcNome').focus({preventScroll: true});
}

// Monta as linhas da ficha técnica / do combo e o resumo de custos
function renderFormFood(){
  const t = fcRascunho.tipo;
  document.querySelectorAll('#fcTipo button').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  document.getElementById('fcTipoAjuda').textContent = AJUDA_TIPO[t];
  document.getElementById('fcBlocoFicha').style.display = t === 'combo' ? 'none' : '';
  document.getElementById('fcBlocoCombo').style.display = t === 'combo' ? '' : 'none';
  document.getElementById('fcManual').style.display = t !== 'combo' && !fcRascunho.ficha.length ? '' : 'none';

  const opcoesInsumo = sel => foodInsumos.slice().sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${x.tipo === 'embalagem' ? '📦 ' : ''}${esc(x.nome)} (${moeda(x.preco)}/${x.unidade})</option>`).join('');
  document.getElementById('fcFichaLinhas').innerHTML = fcRascunho.ficha.length ? fcRascunho.ficha.map((l, k) => {
    const ins = insumoPorId(l.insumoId);
    const unidades = ins ? unidadesDaFamilia(ins.unidade) : ['un'];
    return `<tr>
      <td><select class="ff-insumo" data-k="${k}"><option value="">Escolha...</option>${opcoesInsumo(l.insumoId)}</select></td>
      <td class="ff-qtd-cel"><input type="text" class="ff-qtd" data-k="${k}" inputmode="decimal" value="${String(l.qtd).replace('.', ',')}">
        <select class="ff-unidade" data-k="${k}">${unidades.map(u => `<option ${u === l.unidade ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
      <td class="nowrap ff-custo">${moeda(custoLinhaFicha(l))}</td>
      <td><button type="button" class="rm ff-rm" data-k="${k}" title="Remover" aria-label="Remover ingrediente">✕</button></td></tr>`;
  }).join('') : '<tr><td colspan="4" class="history-empty">Nenhum ingrediente na ficha ainda.</td></tr>';

  const opcoesItem = sel => foodCardapio.filter(x => x.tipo !== 'combo' && x.id !== fcEditando).map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.nome)} (custo ${moeda(custoItem(x))})</option>`).join('');
  document.getElementById('fcComboLinhas').innerHTML = fcRascunho.componentes.length ? fcRascunho.componentes.map((c, k) => {
    const comp = itemPorId(c.itemId);
    return `<tr>
      <td><select class="fcb-item" data-k="${k}"><option value="">Escolha...</option>${opcoesItem(c.itemId)}</select></td>
      <td><input type="number" class="fcb-qtd" data-k="${k}" min="1" step="1" value="${c.qtd}"></td>
      <td class="nowrap">${comp ? moeda(custoItem(comp) * c.qtd) : '—'}</td>
      <td><button type="button" class="rm fcb-rm" data-k="${k}" title="Remover" aria-label="Remover item do combo">✕</button></td></tr>`;
  }).join('') : '<tr><td colspan="4" class="history-empty">Nenhum item no combo ainda.</td></tr>';

  const f = document.getElementById('fcFichaLinhas');
  f.querySelectorAll('.ff-insumo').forEach(s => s.addEventListener('change', () => {
    const l = fcRascunho.ficha[s.dataset.k]; l.insumoId = s.value;
    const ins = insumoPorId(s.value);
    if (ins && FAMILIA_UNIDADE[l.unidade] !== FAMILIA_UNIDADE[ins.unidade]) l.unidade = ins.unidade === 'kg' ? 'g' : ins.unidade === 'L' ? 'ml' : ins.unidade;
    renderFormFood();
  }));
  f.querySelectorAll('.ff-qtd').forEach(inp => inp.addEventListener('input', () => {
    fcRascunho.ficha[inp.dataset.k].qtd = paraNumero(inp.value);
    inp.closest('tr').querySelector('.ff-custo').textContent = moeda(custoLinhaFicha(fcRascunho.ficha[inp.dataset.k]));
    atualizarResumoFood();
  }));
  f.querySelectorAll('.ff-unidade').forEach(s => s.addEventListener('change', () => { fcRascunho.ficha[s.dataset.k].unidade = s.value; renderFormFood(); }));
  f.querySelectorAll('.ff-rm').forEach(b => b.addEventListener('click', () => { fcRascunho.ficha.splice(b.dataset.k, 1); renderFormFood(); }));
  const cb = document.getElementById('fcComboLinhas');
  cb.querySelectorAll('.fcb-item').forEach(s => s.addEventListener('change', () => { fcRascunho.componentes[s.dataset.k].itemId = s.value; renderFormFood(); }));
  cb.querySelectorAll('.fcb-qtd').forEach(inp => inp.addEventListener('change', () => { fcRascunho.componentes[inp.dataset.k].qtd = Math.max(parseInt(inp.value, 10) || 1, 1); renderFormFood(); }));
  cb.querySelectorAll('.fcb-rm').forEach(b => b.addEventListener('click', () => { fcRascunho.componentes.splice(b.dataset.k, 1); renderFormFood(); }));
  atualizarResumoFood();
}

function dadosFormFood(){
  const v = id => document.getElementById(id).value.trim();
  const d = {nome: v('fcNome'), categoria: v('fcCategoria'), tipo: fcRascunho.tipo, preco: r2(paraNumero(v('fcPreco'))),
    ativo: v('fcAtivo') === '1', outros: r2(paraNumero(v('fcOutros'))),
    ficha: fcRascunho.tipo === 'combo' ? [] : fcRascunho.ficha.filter(l => l.insumoId && l.qtd > 0).map(l => ({...l})),
    componentes: fcRascunho.tipo === 'combo' ? fcRascunho.componentes.filter(c => c.itemId).map(c => ({...c})) : []};
  // Custo manual só vale quando não há ficha técnica
  d.ingredientes = d.ficha.length || d.tipo === 'combo' ? 0 : r2(paraNumero(v('fcIngredientes')));
  d.embalagem = d.ficha.length || d.tipo === 'combo' ? 0 : r2(paraNumero(v('fcEmbalagem')));
  return d;
}

// Resumo no formato da ficha: custo total / venda / lucro bruto / margem
function atualizarResumoFood(){
  const d = dadosFormFood();
  const c = custosItem(d);
  const total = r2(c.ingredientes + c.embalagem + c.outros);
  const lucro = r2(d.preco - total);
  const margem = d.preco > 0 ? lucro / d.preco * 100 : 0;
  const fx = faixaMargem(margem);
  document.getElementById('fcResumo').innerHTML = `
    <div class="lc-titulo">Custo de 1 unidade</div>
    <div class="lc-linha"><span>Ingredientes</span><b>${moeda(c.ingredientes)}</b></div>
    <div class="lc-linha"><span>Embalagem</span><b>${moeda(c.embalagem)}</b></div>
    <div class="lc-linha"><span>Outros custos</span><b>${moeda(c.outros)}</b></div>
    <div class="lc-linha lc-venda"><span>CUSTO TOTAL</span><b>${moeda(total)}</b></div>
    <div class="lc-linha"><span>Venda</span><b>${moeda(d.preco)}</b></div>
    <div class="lc-total"><span>LUCRO BRUTO</span><b class="lc-${fx.cls}">${moeda(lucro)}</b></div>
    <div class="lc-indicador lc-bg-${fx.cls}">${fx.ic} Margem: <b>${pctBR(margem)}</b> <small>(antes de taxas de plataforma)</small></div>`;
  const canal = canalPorId(document.getElementById('fcPreviewCanal').value);
  document.getElementById('fcPreview').innerHTML = htmlLucro(calcularLucroFood([{...d, ...c, qtd: 1}], canal), d.preco <= 0);
}

function salvarItemFood(){
  const d = dadosFormFood();
  const erro = msg => { document.getElementById('fcErro').textContent = msg; };
  if (!d.nome) return erro('Informe o nome do item.');
  if (d.preco <= 0) return erro('Informe o preço de venda.');
  if (d.tipo === 'combo' && !d.componentes.length) return erro('Adicione pelo menos um item ao combo.');
  if ([d.ingredientes, d.embalagem, d.outros].some(x => x < 0)) return erro('Custos não podem ser negativos.');
  if (fcRascunho.ficha.some(l => !l.insumoId || !(l.qtd > 0)) && d.tipo !== 'combo') return erro('Complete ou remova as linhas da ficha técnica sem ingrediente ou quantidade.');
  const antigo = itemPorId(fcEditando);
  const custoAntes = antigo ? custoItem(antigo) : null;
  if (antigo) {
    const alteracoes = diferencas(antigo, d, {nome: {nome: 'Nome'}, categoria: {nome: 'Categoria'}, tipo: {nome: 'Tipo'}, preco: {nome: 'Preço', moeda: true}, ativo: {nome: 'Ativo'}});
    Object.assign(antigo, d);
    const custoDepois = custoItem(antigo);
    if (Math.abs(custoDepois - custoAntes) > 0.001) alteracoes.push({campo: 'Custo (ficha técnica)', antes: moeda(custoAntes), depois: moeda(custoDepois)});
    if (alteracoes.length) registrarAuditoria('Food', `Item do cardápio ${d.nome} editado`, {alteracoes});
  } else {
    const novo = {id: idFood(), ...d};
    foodCardapio.push(novo);
    registrarAuditoria('Food', `${ROTULO_TIPO[d.tipo]} ${d.nome} cadastrado no cardápio`, {detalhe: `Preço ${moeda(d.preco)} · custo ${moeda(custoItem(novo))} (${origemCusto(novo)})`});
  }
  salvarFood();
  document.getElementById('fcForm').style.display = 'none';
  renderFoodCardapio();
}
function excluirItemFood(id){
  const i = itemPorId(id);
  if (!i) return;
  const combos = foodCardapio.filter(c => c.tipo === 'combo' && c.componentes.some(x => x.itemId === id));
  if (combos.length) { alert(`"${i.nome}" faz parte de: ${combos.map(c => c.nome).join(', ')}.\nRemova-o desses combos antes de excluir.`); return; }
  if (!confirm(`Excluir "${i.nome}" do cardápio?\n\nOs pedidos já registrados não são alterados.`)) return;
  foodCardapio.splice(foodCardapio.indexOf(i), 1);
  registrarAuditoria('Food', `Item do cardápio ${i.nome} excluído`);
  salvarFood();
  renderFoodCardapio();
}
document.getElementById('fcBusca').addEventListener('input', renderFoodCardapio);
document.getElementById('fcCanalRef').addEventListener('change', renderFoodCardapio);
document.getElementById('btnFcNovo').addEventListener('click', () => abrirFormFood(null));
document.getElementById('btnFcCancelar').addEventListener('click', () => { document.getElementById('fcForm').style.display = 'none'; });
document.getElementById('btnFcSalvar').addEventListener('click', salvarItemFood);
document.querySelectorAll('#fcTipo button').forEach(b => b.addEventListener('click', () => {
  fcRascunho.tipo = b.dataset.t;
  if (b.dataset.t === 'adicional' && !document.getElementById('fcCategoria').value.trim()) document.getElementById('fcCategoria').value = 'Adicionais';
  renderFormFood();
}));
document.getElementById('btnFcAddLinha').addEventListener('click', () => { fcRascunho.ficha.push({insumoId: '', qtd: 1, unidade: 'g'}); renderFormFood(); });
document.getElementById('btnFcAddComponente').addEventListener('click', () => { fcRascunho.componentes.push({itemId: '', qtd: 1}); renderFormFood(); });
['fcPreco', 'fcIngredientes', 'fcEmbalagem', 'fcOutros'].forEach(id => document.getElementById(id).addEventListener('input', atualizarResumoFood));
document.getElementById('fcPreviewCanal').addEventListener('change', atualizarResumoFood);

// ---- Ingredientes (insumos) ----
let fiEditando = null;
const itensQueUsam = insId => foodCardapio.filter(i => (i.ficha || []).some(l => l.insumoId === insId));
function renderFoodInsumos(){
  const busca = document.getElementById('fiBusca').value.trim().toLowerCase();
  const tipo = document.getElementById('fiFiltroTipo').value;
  const lista = foodInsumos.filter(i => (!tipo || i.tipo === tipo) && (!busca || i.nome.toLowerCase().includes(busca)))
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  document.getElementById('fiTabela').innerHTML = lista.length ? lista.map(i => {
    const usos = itensQueUsam(i.id);
    return `<tr><td><b>${esc(i.nome)}</b></td>
      <td><span class="badge ${i.tipo === 'embalagem' ? 'mt-ajuste' : 'mt-entrada'}">${i.tipo === 'embalagem' ? 'Embalagem' : 'Ingrediente'}</span></td>
      <td class="nowrap">${moeda(i.preco)} / ${i.unidade}</td><td class="nowrap">${textoCustoBase(i)}</td>
      <td>${usos.length ? `${usos.length} ${usos.length === 1 ? 'item' : 'itens'}<small class="history-date">${usos.slice(0, 3).map(u => esc(u.nome)).join(', ')}${usos.length > 3 ? '…' : ''}</small>` : '<span class="hv-muted">não usado</span>'}</td>
      <td><div class="row-actions"><button type="button" class="edit" data-id="${i.id}" title="Editar">✎</button><button type="button" class="del" data-id="${i.id}" title="Excluir">✕</button></div></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="history-empty">Nenhum ingrediente encontrado.</td></tr>';
  document.querySelectorAll('#fiTabela .edit').forEach(b => b.addEventListener('click', () => abrirFormInsumo(b.dataset.id)));
  document.querySelectorAll('#fiTabela .del').forEach(b => b.addEventListener('click', () => excluirInsumo(b.dataset.id)));
}
function abrirFormInsumo(id){
  const i = id ? insumoPorId(id) : null;
  fiEditando = i ? i.id : null;
  document.getElementById('fiFormTitulo').textContent = i ? `Editar — ${i.nome}` : 'Novo ingrediente';
  document.getElementById('fiNome').value = i?.nome || '';
  document.getElementById('fiTipo').value = i?.tipo || 'ingrediente';
  document.getElementById('fiUnidade').value = i?.unidade || 'kg';
  document.getElementById('fiPreco').value = i ? numBR(i.preco) : '';
  document.getElementById('fiErro').textContent = '';
  const usos = i ? itensQueUsam(i.id) : [];
  document.getElementById('fiImpacto').textContent = usos.length ? `Usado em ${usos.length} item(ns): ${usos.map(u => u.nome).join(', ')}. Alterar o preço recalcula o custo de todos eles.` : '';
  // Com o ingrediente em uso, só dá para trocar entre unidades da mesma família (kg↔g, L↔ml)
  [...document.getElementById('fiUnidade').options].forEach(o => { o.disabled = !!usos.length && FAMILIA_UNIDADE[o.value] !== FAMILIA_UNIDADE[i.unidade]; });
  atualizarBaseInsumo();
  document.getElementById('fiForm').style.display = 'block';
  document.getElementById('fiNome').focus();
}
function atualizarBaseInsumo(){
  const u = document.getElementById('fiUnidade').value;
  document.getElementById('fiPrecoLabel').textContent = `Preço por ${u} (R$) *`;
  const preco = paraNumero(document.getElementById('fiPreco').value);
  document.getElementById('fiBase').textContent = preco > 0 ? `Custo base: ${textoCustoBase({preco, unidade: u})}` : '';
}
function salvarInsumo(){
  const nome = document.getElementById('fiNome').value.trim();
  const tipo = document.getElementById('fiTipo').value;
  const unidade = document.getElementById('fiUnidade').value;
  const preco = r2(paraNumero(document.getElementById('fiPreco').value));
  const erro = m => { document.getElementById('fiErro').textContent = m; };
  if (!nome) return erro('Informe o nome do ingrediente.');
  if (!(preco > 0)) return erro('Informe o preço de compra.');
  if (foodInsumos.some(i => i.id !== fiEditando && i.nome.toLowerCase() === nome.toLowerCase())) return erro('Já existe um ingrediente com esse nome.');
  const antigo = insumoPorId(fiEditando);
  let mudancasCusto = [];
  if (antigo) {
    const foto = fotoCustos(), precoAntes = antigo.preco, unidadeAntes = antigo.unidade;
    const usos = itensQueUsam(antigo.id);
    const custosAntes = usos.map(u => custoItem(u));
    const alteracoes = diferencas(antigo, {nome, tipo, unidade, preco}, {nome: {nome: 'Nome'}, tipo: {nome: 'Tipo'}, unidade: {nome: 'Unidade'}, preco: {nome: 'Preço de compra', moeda: true}});
    Object.assign(antigo, {nome, tipo, unidade, preco});
    usos.forEach((u, k) => { const depois = custoItem(u); if (Math.abs(depois - custosAntes[k]) > 0.001) alteracoes.push({campo: `Custo de ${u.nome}`, antes: moeda(custosAntes[k]), depois: moeda(depois)}); });
    mudancasCusto = registrarMudancaCusto(foto, `${nome}: ${moeda(precoAntes)}/${unidadeAntes} → ${moeda(preco)}/${unidade}`);
    if (alteracoes.length) registrarAuditoria('Food', `Ingrediente ${nome} alterado`, {alteracoes, detalhe: usos.length ? `Recalcula ${usos.length} item(ns) do cardápio` : ''});
  } else {
    foodInsumos.push({id: idFood(), nome, tipo, unidade, preco});
    registrarAuditoria('Food', `Ingrediente ${nome} cadastrado`, {detalhe: `${moeda(preco)} por ${unidade}`});
  }
  salvarFood();
  document.getElementById('fiForm').style.display = 'none';
  renderFoodInsumos();
  mostrarMudancasCusto(mudancasCusto, 'fiResultado');
}
function excluirInsumo(id){
  const i = insumoPorId(id);
  if (!i) return;
  const usos = itensQueUsam(id);
  if (usos.length) { alert(`"${i.nome}" está nas fichas técnicas de: ${usos.map(u => u.nome).join(', ')}.\nRemova-o dessas fichas antes de excluir.`); return; }
  if (!confirm(`Excluir o ingrediente "${i.nome}"?`)) return;
  foodInsumos.splice(foodInsumos.indexOf(i), 1);
  registrarAuditoria('Food', `Ingrediente ${i.nome} excluído`);
  salvarFood();
  renderFoodInsumos();
}
document.getElementById('fiBusca').addEventListener('input', renderFoodInsumos);
document.getElementById('fiFiltroTipo').addEventListener('change', renderFoodInsumos);
document.getElementById('btnFiNovo').addEventListener('click', () => abrirFormInsumo(null));
document.getElementById('btnFiCancelar').addEventListener('click', () => { document.getElementById('fiForm').style.display = 'none'; });
document.getElementById('btnFiSalvar').addEventListener('click', salvarInsumo);
['fiUnidade', 'fiPreco'].forEach(id => document.getElementById(id).addEventListener(id === 'fiPreco' ? 'input' : 'change', atualizarBaseInsumo));

// ---- Canais e taxas ----
function renderFoodCanais(){
  const num = (c, campo, passo) => `<input type="number" class="fcanal-num" data-id="${c.id}" data-campo="${campo}" min="0" step="${passo}" value="${c[campo]}">`;
  const exemplo = c => {
    const ex = calcularLucroFood([{preco: 79.90, ingredientes: 0, embalagem: 0, outros: 0, qtd: 1}], c);
    const extras = [ex.entrega ? `entrega ${moeda(ex.entrega)}` : '', ex.outrosCanal ? `outros ${moeda(ex.outrosCanal)}` : ''].filter(Boolean).join(' · ');
    return `<b>${moeda(79.90 - ex.taxa - ex.entrega - ex.outrosCanal)}</b><small class="history-date">taxa ${moeda(ex.taxa)}${extras ? ' · ' + extras : ''}</small>`;
  };
  const chk = (c, campo, rotulo, marcado, bloqueado) => `<input type="checkbox" class="fcanal-chk" data-id="${c.id}" data-campo="${campo}" ${marcado ? 'checked' : ''} ${bloqueado ? 'disabled' : ''} aria-label="${rotulo}">`;
  const ORDEM_CANAIS = ['ifood', '99food', 'keeta', 'whatsapp', 'site', 'balcao', 'telefone', 'proprio', 'rappi'];
  const posCanal = c => { const k = ORDEM_CANAIS.indexOf(c.id); return k < 0 ? 99 : k; };
  document.getElementById('fcanaisTabela').innerHTML = foodCanais.slice().sort((a, b) => posCanal(a) - posCanal(b)).map(c => `<tr>
      <td class="nowrap"><span class="fcanal-ic">${c.ic || '🏷️'}</span> ${c.fixo ? `<b>${esc(c.nome)}</b>` : `<input type="text" class="fcanal-nome" data-id="${c.id}" value="${esc(c.nome)}">`}</td>
      <td>${num(c, 'comissao', '0.1')}</td><td>${num(c, 'pagamento', '0.1')}</td><td>${num(c, 'fixa', '0.01')}</td><td>${num(c, 'entregaCusto', '0.01')}</td><td>${num(c, 'outrosCusto', '0.01')}</td>
      <td>${chk(c, 'promocoes', 'Considerar promoções no cálculo', c.promocoes !== false)}</td>
      <td>${chk(c, 'entrega', 'Tem entrega', c.entrega)}</td>
      <td>${chk(c, 'ativo', 'Canal ativo', c.ativo, c.fixo)}</td>
      <td class="nowrap fcanal-ex">${exemplo(c)}</td>
      <td>${c.fixo ? '' : `<div class="row-actions"><button type="button" class="del" data-id="${c.id}" title="Remover canal">✕</button></div>`}</td></tr>`).join('');
  const t = document.getElementById('fcanaisTabela');
  t.querySelectorAll('.fcanal-num').forEach(inp => inp.addEventListener('input', () => {
    const c = foodCanais.find(x => x.id === inp.dataset.id); c[inp.dataset.campo] = Math.max(Number(inp.value) || 0, 0);
    inp.closest('tr').querySelector('.fcanal-ex').innerHTML = exemplo(c);
  }));
  t.querySelectorAll('.fcanal-chk').forEach(inp => inp.addEventListener('change', () => { foodCanais.find(x => x.id === inp.dataset.id)[inp.dataset.campo] = inp.checked; }));
  t.querySelectorAll('.fcanal-nome').forEach(inp => inp.addEventListener('input', () => { foodCanais.find(x => x.id === inp.dataset.id).nome = inp.value; }));
  t.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => {
    const c = foodCanais.find(x => x.id === b.dataset.id);
    if (!confirm(`Remover o canal "${c.nome}"?`)) return;
    foodCanais.splice(foodCanais.indexOf(c), 1);
    renderFoodCanais();
  }));
}
document.getElementById('btnCanalNovo').addEventListener('click', () => {
  foodCanais.push({id: idFood(), nome: 'Novo canal', ic: '🏷️', comissao: 0, pagamento: 0, fixa: 0, entregaCusto: 0, outrosCusto: 0, promocoes: true, entrega: true, ativo: true});
  renderFoodCanais();
});
document.getElementById('btnCanaisSalvar').addEventListener('click', () => {
  if (foodCanais.some(c => !String(c.nome).trim())) { avisarFood('toastCanais', 'Todo canal precisa de um nome.', true); return; }
  const antes = lsGet('foodCanais', CANAIS_PADRAO);
  const mudancas = foodCanais.flatMap(c => {
    const a = antes.find(x => x.id === c.id);
    return diferencas(a || {}, c, {comissao: {nome: `${c.nome} · comissão %`}, pagamento: {nome: `${c.nome} · pagamento %`}, fixa: {nome: `${c.nome} · taxa fixa`, moeda: true},
      entregaCusto: {nome: `${c.nome} · entrega`, moeda: true}, outrosCusto: {nome: `${c.nome} · outros custos`, moeda: true},
      promocoes: {nome: `${c.nome} · promoções no cálculo`}, ativo: {nome: `${c.nome} · ativo`}});
  });
  salvarFood();
  if (mudancas.length) registrarAuditoria('Food', 'Taxas dos canais de venda alteradas', {alteracoes: mudancas});
  avisarFood('toastCanais', 'Taxas salvas. O lucro dos próximos pedidos usa os novos valores.');
});

// ---- Configuração ----
function renderFoodConfig(){
  document.getElementById('fcfgTipos').innerHTML = TIPOS_NEGOCIO.map(t => `<button type="button" class="fcfg-tipo ${t.id === foodConfig.tipo ? 'active' : ''}" data-id="${t.id}"><span>${t.ic}</span>${t.nome}</button>`).join('');
  document.querySelectorAll('#fcfgTipos .fcfg-tipo').forEach(b => b.addEventListener('click', () => {
    foodConfig.tipo = b.dataset.id;
    renderFoodConfig();
  }));
  document.getElementById('fcfgVerde').value = foodConfig.margemVerde;
  document.getElementById('fcfgAmarelo').value = foodConfig.margemAmarela;
}
document.getElementById('btnFcfgSalvar').addEventListener('click', () => {
  const verde = Number(document.getElementById('fcfgVerde').value), amarelo = Number(document.getElementById('fcfgAmarelo').value);
  if (!(verde > amarelo) || amarelo < 0 || verde > 100) { avisarFood('toastFcfg', 'A margem "boa" precisa ser maior que a de "atenção" (entre 0 e 100%).', true); return; }
  const antes = lsGet('foodConfig', {tipo: 'pizzaria'});
  foodConfig.margemVerde = verde; foodConfig.margemAmarela = amarelo;
  salvarFood();
  registrarAuditoria('Food', `Configuração do Food salva — ${tipoNegocio().nome}`, {alteracoes: diferencas(antes, foodConfig, {tipo: {nome: 'Tipo de negócio'}, margemVerde: {nome: 'Margem boa %'}, margemAmarela: {nome: 'Margem de atenção %'}})});
  avisarFood('toastFcfg', 'Configuração salva.');
});

// ---- Painel de lucro ----
let fpPeriodo = 'hoje';
function pedidosPeriodoFood(){
  const ini = new Date(); ini.setHours(0, 0, 0, 0);
  if (fpPeriodo !== 'hoje') ini.setDate(ini.getDate() - (Number(fpPeriodo) - 1));
  return foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data) >= ini);
}
// Cartões de resumo (Dashboard e Relatórios)
function htmlKpisFood(lista, sufixo){
  const soma = k => lista.reduce((s, p) => s + (p.calc[k] || 0), 0);
  const receita = soma('receita'), lucro = soma('lucro'), taxas = soma('taxa');
  const custos = soma('ingredientes') + soma('embalagem') + soma('outros');
  const margem = receita ? lucro / receita * 100 : 0;
  const f = faixaMargem(margem);
  return `
    <div><span>Faturamento${sufixo}</span><b>${moeda(receita)}</b><small>vendas menos descontos</small></div>
    <div><span>Pedidos</span><b>${lista.length}</b><small>cancelados não entram</small></div>
    <div><span>Ticket médio</span><b>${moeda(lista.length ? receita / lista.length : 0)}</b><small>por pedido</small></div>
    <div><span>Custo dos produtos</span><b>${moeda(custos)}</b><small>ingredientes, embalagem e outros</small></div>
    <div><span>Taxas plataformas</span><b>${moeda(taxas)}</b><small>${receita ? pctBR(taxas / receita * 100) + ' do faturamento' : '—'}</small></div>
    <div class="fp-lucro lc-bg-${f.cls}"><span>Lucro estimado</span><b>${moeda(lucro)}</b><small>margem ${pctBR(margem)}</small></div>`;
}
// Por produto: faturamento (com o desconto rateado) − custo dos produtos
function resumoProdutosFood(lista){
  const m = new Map();
  lista.forEach(p => {
    const venda = p.calc.venda || 1;
    p.itens.forEach(i => {
      const bruto = i.preco * i.qtd, parte = bruto / venda;
      const fat = bruto - (p.calc.desconto || 0) * parte;
      const custo = ((i.ingredientes || 0) + (i.embalagem || 0) + (i.outros || 0)) * i.qtd;
      const o = m.get(i.nome) || {nome: i.nome, qtd: 0, faturamento: 0, custo: 0, semCusto: false};
      o.qtd += i.qtd; o.faturamento += fat; o.custo += custo;
      if (i.semCusto || !custo) o.semCusto = true;
      m.set(i.nome, o);
    });
  });
  return [...m.values()].map(o => ({...o, lucro: o.faturamento - o.custo, margem: o.faturamento ? (o.faturamento - o.custo) / o.faturamento * 100 : 0}))
    .sort((a, b) => b.lucro - a.lucro);
}
const avisoSemCusto = o => o.semCusto ? '<small class="history-date">⚠ sem custo cadastrado</small>' : '';
// Produtos do cardápio pela margem (preço de venda − custo), da menor para a maior
function produtosPorMargem(){
  const ref = canalMaisCaro();
  return foodCardapio.filter(i => i.ativo !== false && i.tipo !== 'adicional' && !semCusto(i) && i.preco > 0)
    .map(i => { const custo = custoItem(i); return {item: i, venda: i.preco, custo, margem: (i.preco - custo) / i.preco * 100, noCanal: lucroItemNoCanal(i, ref)}; })
    .sort((a, b) => a.margem - b.margem);
}
const linhaMargem = o => `<tr><td><b>${esc(o.item.nome)}</b></td><td class="nowrap">${moeda(o.venda)}</td><td class="nowrap">${moeda(o.custo)}</td><td class="nowrap"><b>${pctBR(o.margem)}</b></td><td class="nowrap">${moeda(o.noCanal.lucro)}<small class="history-date">margem ${pctBR(o.noCanal.margem)} após taxas</small></td></tr>`;

function renderFoodPainel(){
  const t = tipoNegocio();
  document.getElementById('fpTitulo').textContent = `${t.ic} MGA Food — ${t.nome}`;
  const lista = pedidosPeriodoFood();
  document.getElementById('fpSub').textContent = lista.length ? `${lista.length} pedido${lista.length === 1 ? '' : 's'} no período · cancelados não entram na conta` : 'Nenhum pedido no período ainda.';
  document.getElementById('fpKpis').innerHTML = htmlKpisFood(lista, fpPeriodo === 'hoje' ? ' hoje' : '');
  const porCanal = new Map();
  lista.forEach(p => { const o = porCanal.get(p.canalNome) || {n: 0, receita: 0, taxa: 0, lucro: 0}; o.n++; o.receita += p.calc.receita; o.taxa += p.calc.taxa + p.calc.entrega; o.lucro += p.calc.lucro; porCanal.set(p.canalNome, o); });
  document.getElementById('fpCanais').innerHTML = porCanal.size ? [...porCanal.entries()].sort((a, b) => b[1].receita - a[1].receita).map(([nome, o]) => {
    const fc = faixaMargem(o.receita ? o.lucro / o.receita * 100 : 0);
    return `<tr><td><b>${esc(nome)}</b></td><td>${o.n}</td><td class="nowrap">${moeda(o.receita)}</td><td class="nowrap mov-neg">− ${moeda(o.taxa)}</td><td class="nowrap"><b class="lc-${fc.cls}">${moeda(o.lucro)}</b></td><td class="nowrap">${fc.ic} ${pctBR(o.receita ? o.lucro / o.receita * 100 : 0)}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="history-empty">Sem pedidos no período.</td></tr>';
  const produtos = resumoProdutosFood(lista);
  document.getElementById('fpItens').innerHTML = produtos.length ? produtos.slice(0, 8).map(o =>
    `<tr><td>${esc(o.nome)}${avisoSemCusto(o)}</td><td>${o.qtd}</td><td class="nowrap">${moeda(o.faturamento)}</td><td class="nowrap">${moeda(o.custo)}</td><td class="nowrap"><b>${moeda(o.lucro)}</b></td></tr>`).join('')
    : '<tr><td colspan="5" class="history-empty">Sem pedidos no período.</td></tr>';
  const ref = canalMaisCaro();
  document.querySelector('#foodPainel .fp-col-canal').textContent = `Lucro no ${ref.nome}`;
  const margens = produtosPorMargem();
  document.getElementById('fpBaixaMargem').innerHTML = margens.length ? margens.slice(0, 5).map(linhaMargem).join('')
    : '<tr><td colspan="5" class="history-empty">Cadastre o custo dos produtos para ver as margens.</td></tr>';
  const ativos = foodCardapio.filter(i => i.ativo !== false);
  const semCustoLista = ativos.filter(semCusto);
  const semFicha = ativos.filter(i => i.tipo !== 'combo' && !i.ficha.length && !semCusto(i));
  const baixos = insumosAbaixoMinimo();
  const quedas = margensQueCairam(7);
  const alertas = [
    ...quedas.map(m => `⚠️ A margem de <b>${esc(m.nome)}</b> diminuiu: custo ${moeda(m.custoAntes)} → ${moeda(m.custoDepois)} · margem ${pctBR(m.margemAntes)} → ${pctBR(m.margemDepois)} <small class="history-date">${esc(m.motivo)} · ${dataHoraCurta(m.data)}</small>`),
    ...(baixos.length ? [`🥫 <b>${plural(baixos.length, 'ingrediente', 'ingredientes')}</b> abaixo do mínimo no estoque: ${baixos.slice(0, 5).map(i => esc(i.nome)).join(', ')}${baixos.length > 5 ? '…' : ''}. <button type="button" class="link-btn" data-ir="food/estoque">Ver estoque →</button>`] : []),
    ...semCustoLista.map(i => `⚠ <b>${esc(i.nome)}</b> está sem custo cadastrado: o lucro dele aparece maior do que é.`),
    ...semFicha.map(i => `📝 <b>${esc(i.nome)}</b> usa custo manual. Monte a ficha técnica para o custo acompanhar o preço dos ingredientes.`)
  ];
  document.getElementById('fpAlertas').innerHTML = alertas.length
    ? `<div class="rel-bloco-titulo">Atenção</div><ul class="fp-lista">${alertas.map(a => `<li>${a}</li>`).join('')}</ul><button type="button" class="link-btn" data-ir="food/ficha">Revisar fichas técnicas →</button>`
    : '<div class="rel-bloco-titulo">Cardápio em dia ✓</div><p class="dv-ajuda">Todos os itens ativos têm custo e ficha técnica cadastrados, e nenhum ingrediente está abaixo do mínimo.</p>';
}
document.querySelectorAll('#fpPeriodo button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#fpPeriodo button').forEach(x => x.classList.toggle('active', x === b));
  fpPeriodo = b.dataset.p;
  renderFoodPainel();
}));

// Painel Food em Gestão › Visão geral (usa os pedidos reais)
function atualizarDashFood(){
  const dash = document.getElementById('dashFood');
  if (!dash) return;
  const hoje = new Date().toDateString();
  const lista = foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data).toDateString() === hoje);
  const receita = lista.reduce((s, p) => s + p.calc.receita, 0);
  const lucro = lista.reduce((s, p) => s + p.calc.lucro, 0);
  const kpis = dash.querySelectorAll('.kpi');
  const setKpi = (k, rotulo, valor) => { kpis[k].querySelector('span').textContent = rotulo; kpis[k].querySelector('b').textContent = valor; };
  setKpi(0, 'Pedidos hoje', lista.length);
  setKpi(1, 'Faturamento hoje', moeda(receita));
  setKpi(2, 'Lucro estimado hoje', moeda(lucro));
  setKpi(3, 'Em preparo agora', `${foodPedidos.filter(p => p.status === 'preparo').length} pedido(s)`);
  const nomes = {preparo: 'Em preparo', pronto: 'Pronto', entrega: 'Saiu p/ entrega', entregue: 'Entregue', cancelado: 'Cancelado'};
  const ultimos = foodPedidos.slice(-5).reverse();
  dash.querySelector('tbody').innerHTML = ultimos.length ? ultimos.map(p => `<tr><td>#${p.numero}</td><td>${p.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(', ')}</td><td>${moeda(p.calc.receita)}</td><td><span class="badge ${p.status === 'cancelado' ? 'mt-saida' : p.status === 'entregue' ? 'b-ok' : 'b-wait'}">${nomes[p.status]}</span></td></tr>`).join('')
    : '<tr><td colspan="4" class="history-empty">Nenhum pedido Food registrado ainda.</td></tr>';
}

// ---- 📲 Importar vendas de plataformas (print → OCR → conferência → pedidos) ----
// A imagem é lida no próprio navegador (Tesseract.js); só o leitor é baixado da internet.
const PLATAFORMAS_IMPORT = [
  {id: 'ifood', nome: 'iFood', cor: '#ea1d2c'}, {id: '99food', nome: '99Food', cor: '#ffb800'},
  {id: 'keeta', nome: 'Keeta', cor: '#ffd000'}, {id: 'outra', nome: 'Outra', cor: '#64748b'}
];
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
let impPlataforma = 'ifood';
let impLidos = [];      // pedidos encontrados no texto, aguardando conferência
let impTextoBruto = '';

function canalDaImportacao(){
  const id = impPlataforma === 'outra' ? document.getElementById('impCanalOutro').value : impPlataforma;
  return canalPorId(id);
}

// ---- Leitura do texto: número do pedido, data, hora, itens, quantidade, valores, desconto, taxa, recebido ----
const normTxt = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const RE_VALOR = /R\$\s*-?\s*(\d{1,3}(?:[.\s]\d{3})*,\d{2}|\d+,\d{2})/gi;
const RE_PEDIDO = /(?:^|\s)(?:#\s?|n[ºo°]\.?\s*|pedido\s*(?:n[ºo°]\.?\s*)?#?\s*)(\d{3,})\b/i;
const RE_QTD = /^(\d{1,2})\s*(?:x|×|un\.?)\s+/i;
const RE_DATA = /\b(\d{2})\/(\d{2})(?:\/(\d{2,4}))?\b/;
const RE_HORA = /\b([01]?\d|2[0-3])[:h](\d{2})\b/;
const valorBR = s => Number(String(s).replace(/[.\s]/g, '').replace(',', '.')) || 0;

function dataISOdoTexto(m){
  if (!m) return null;
  const hoje = new Date();
  let ano = m[3] ? Number(m[3]) : hoje.getFullYear();
  if (ano < 100) ano += 2000;
  const dia = Number(m[1]), mes = Number(m[2]);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function interpretarTextoPlataforma(texto){
  // Correções comuns de OCR: "RS 49,90", "R8 49,90", "R$49.90"
  const limpo = String(texto || '')
    .replace(/\bR\s?[S58$]\s?(?=\d)/g, 'R$ ')
    .replace(/(R\$\s*\d+)\.(\d{2})(?!\d)/g, '$1,$2');
  let linhas = limpo.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  // Linha que começa com o número do pedido sem "#" (o OCR costuma ler "#" como "4", "H" ou "*"):
  // "45021 Pizza Calabresa R$ 49,90". Se todas começam com "4" e têm o mesmo tamanho, o "4" era o "#".
  const RE_INICIO_NUM = /^([#H*£$]?)\s?(\d{4,7})\s+(?=\D*[a-zà-ú])/i;
  const TEM_VALOR = /R\$\s*-?\s*\d/; // sem a flag "g": não guarda posição entre linhas
  const inicios = linhas.map(l => { const m = l.match(RE_INICIO_NUM); return m && TEM_VALOR.test(l) ? m : null; });
  const numeros = inicios.filter(Boolean).map(m => m[2]);
  // "#" lido como "4": números com um dígito a mais que os outros e começando com 4
  const menor = Math.min(...numeros.map(n => n.length));
  const todosCom4 = numeros.length >= 2 && numeros.every(n => n[0] === '4' && n.length === numeros[0].length && n.length >= 5);
  const algunsCom4 = numeros.some(n => n.length === menor) && numeros.every(n => n.length === menor || (n.length === menor + 1 && n[0] === '4'));
  const corrigirNumero = (n, prefixo) => (todosCom4 || (algunsCom4 && n.length === menor + 1)) && !prefixo.trim() ? n.slice(1) : n;
  linhas = linhas.map((l, k) => {
    const m = inicios[k];
    if (!m || /(?:^|\s)#\s?\d{3,}/.test(l)) return l;
    return l.replace(RE_INICIO_NUM, `#${corrigirNumero(m[2], m[1])} `);
  });
  const dataGlobal = dataISOdoTexto(limpo.match(RE_DATA));
  const pedidos = [];
  let atual = null;
  const novoItem = (textoItem, valor) => {
    let nome = textoItem.replace(RE_VALOR, '').replace(RE_HORA, '').replace(RE_DATA, '').replace(/[•·|:–—-]+\s*$/, '').replace(/^[\s•·|:–—-]+/, '').trim();
    let qtd = 1;
    const mq = nome.match(RE_QTD);
    if (mq) { qtd = Number(mq[1]) || 1; nome = nome.replace(RE_QTD, '').trim(); }
    if (!/[a-zà-ú]/i.test(nome)) return;
    atual.itens.push({nome, qtd, valor: r2(valor)});
  };
  for (const linha of linhas) {
    const valores = [...linha.matchAll(RE_VALOR)].map(m => valorBR(m[1]) * (/-\s*R\$|R\$\s*-/.test(m[0]) ? -1 : 1));
    const mPed = linha.match(RE_PEDIDO);
    const low = normTxt(linha);
    if (mPed) {
      const md = linha.match(RE_DATA), mh = linha.match(RE_HORA);
      atual = {numeroExterno: mPed[1], data: dataISOdoTexto(md) || dataGlobal, hora: mh ? `${mh[1].padStart(2, '0')}:${mh[2]}` : '', itens: [], total: null, desconto: 0, taxa: null, recebido: null};
      pedidos.push(atual);
      const resto = linha.replace(mPed[0], ' ').trim();
      if (valores.length && /[a-zà-ú]{3,}/i.test(resto.replace(RE_VALOR, ''))) novoItem(resto, valores[valores.length - 1]);
      else if (valores.length) atual.total = valores[valores.length - 1];
      continue;
    }
    if (!atual) continue; // cabeçalho do print
    if (!atual.hora) { const mh = linha.match(RE_HORA); if (mh) atual.hora = `${mh[1].padStart(2, '0')}:${mh[2]}`; }
    if (!valores.length) {
      // Item sem preço na mesma linha (ex.: "1x Pizza Calabresa") — o valor pode vir depois; fica para conferir
      if (RE_QTD.test(linha) && /[a-zà-ú]{3,}/i.test(linha)) novoItem(linha, 0);
      continue;
    }
    const v = Math.abs(valores[valores.length - 1]);
    if (/desconto|cupom|promoc|voucher/.test(low)) { atual.desconto = r2((atual.desconto || 0) + v); continue; }
    if (/(taxa|tarifa|comiss)/.test(low) && !/entrega|servico ao cliente/.test(low)) { atual.taxa = r2((atual.taxa || 0) + v); continue; }
    if (/recebe|repasse|liquido|a receber|valor liquido/.test(low)) { atual.recebido = v; continue; }
    if (/subtotal/.test(low)) continue;
    if (/\btotal\b|valor do pedido|valor total/.test(low)) { atual.total = v; continue; }
    if (/entrega|frete/.test(low)) continue; // taxa de entrega paga pelo cliente: não é produto
    novoItem(linha, v);
  }
  // Pedido com itens sem preço: se só um item está sem valor, ele recebe o que falta do total
  pedidos.forEach(p => {
    const semValor = p.itens.filter(i => !i.valor);
    const soma = p.itens.reduce((s, i) => s + i.valor, 0);
    if (semValor.length === 1 && p.total) semValor[0].valor = r2(Math.max(p.total + p.desconto - soma, 0));
    if (!p.itens.length && p.total) p.itens.push({nome: 'Pedido sem itens detalhados', qtd: 1, valor: p.total + p.desconto});
  });
  return pedidos.filter(p => p.itens.some(i => i.valor > 0) || p.total);
}

// Vincula o nome lido no print a um item do cardápio (para puxar o custo da ficha técnica)
// Palavras genéricas não servem para diferenciar itens ("Pizza Portuguesa" ≠ "Pizza Calabresa")
const PALAVRAS_GENERICAS = new Set(['pizza', 'pizzas', 'combo', 'combos', 'lanche', 'lanches', 'porcao', 'grande', 'media', 'medio', 'pequena', 'pequeno',
  'broto', 'familia', 'com', 'sem', 'para', 'tradicional', 'especial', 'litro', 'litros', 'lata', 'unidade', 'bebida', 'bebidas', 'sabor']);
const palavrasDistintas = t => normTxt(t).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 1 && !PALAVRAS_GENERICAS.has(w));
function vincularItemCardapio(nome){
  const lidas = palavrasDistintas(nome);
  if (!lidas.length) return ''; // ex.: só "Combo" — ambíguo, o usuário escolhe
  const alvo = normTxt(nome).trim();
  let melhor = null, nota = 0;
  foodCardapio.filter(i => i.tipo !== 'adicional').forEach(i => {
    const doItem = palavrasDistintas(i.nome);
    if (!doItem.length) return;
    const comuns = doItem.filter(w => lidas.includes(w)).length;
    // Todas as palavras distintas precisam bater; nomes de tamanho parecido desempatam
    let s = comuns / Math.max(doItem.length, lidas.length);
    if (normTxt(i.nome).trim() === alvo) s = 2;
    s -= Math.abs(normTxt(i.nome).length - alvo.length) / 1000;
    if (s > nota) { nota = s; melhor = i; }
  });
  return nota >= 0.99 ? melhor.id : '';
}

function jaImportado(p, canalId){ return foodPedidos.some(x => x.importado && x.numeroExterno === p.numeroExterno && x.canalId === canalId); }

// Monta as linhas e o cálculo de lucro de um pedido lido (a taxa do print, se houver, substitui a do canal)
function calcularPedidoImportado(p, canal){
  const linhas = p.itens.filter(i => i.valor > 0).map(i => {
    const cad = i.vinculo ? itemPorId(i.vinculo) : null;
    const base = cad ? montarLinhaFood(cad, []) : {chave: 'imp|' + i.nome, id: '', nome: i.nome, tipo: 'produto', ingredientes: 0, embalagem: 0, outros: 0, adicionais: [], componentes: []};
    return {...base, nome: cad ? cad.nome : i.nome, nomeLido: i.nome, qtd: i.qtd, preco: r2(i.valor / i.qtd), semCusto: !cad};
  });
  const calc = calcularLucroFood(linhas, canal, p.desconto || 0);
  let origemTaxa = 'canal';
  if (p.taxa != null && p.taxa !== '') { calc.taxa = r2(p.taxa); origemTaxa = 'print'; }
  else if (p.recebido != null && p.recebido !== '') { calc.taxa = r2(Math.max(calc.receita - p.recebido, 0)); origemTaxa = 'recebido'; }
  if (origemTaxa !== 'canal') {
    calc.taxaPct = calc.receita ? calc.taxa / calc.receita * 100 : 0; calc.taxaFixa = 0;
    calc.entrega = 0; calc.outrosCanal = 0; calc.outros = calc.outrosItens;
    calc.lucro = r2(calc.receita - calc.ingredientes - calc.embalagem - calc.taxa - calc.outros);
    calc.margem = calc.receita ? calc.lucro / calc.receita * 100 : 0;
  }
  return {linhas, calc, origemTaxa};
}

// ---- Tela ----
function renderFoodImportar(){
  document.getElementById('impPlataformas').innerHTML = PLATAFORMAS_IMPORT.map(pl =>
    `<button type="button" class="imp-plat ${pl.id === impPlataforma ? 'active' : ''}" data-id="${pl.id}" style="--cor-plat:${pl.cor}"><span class="imp-plat-dot"></span>${pl.nome}</button>`).join('');
  document.querySelectorAll('#impPlataformas .imp-plat').forEach(b => b.addEventListener('click', () => { impPlataforma = b.dataset.id; renderFoodImportar(); if (impLidos.length) renderRevisaoImport(); }));
  document.getElementById('impOutraBox').style.display = impPlataforma === 'outra' ? '' : 'none';
  const sel = document.getElementById('impCanalOutro');
  const atual = sel.value;
  sel.innerHTML = foodCanais.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  if ([...sel.options].some(o => o.value === atual)) sel.value = atual;
  const canal = canalDaImportacao();
  document.getElementById('impTaxaInfo').innerHTML = taxaPercentual(canal) || canal.fixa
    ? `Taxa cadastrada para <b>${esc(canal.nome)}</b>: ${pctBR(taxaPercentual(canal))}${canal.fixa ? ` + ${moeda(canal.fixa)}` : ''}. Se o print mostrar a taxa ou o valor recebido, o sistema usa o valor do print.`
    : `⚠ <b>${esc(canal.nome)}</b> está sem taxa cadastrada. Se o print não mostrar a taxa ou o valor recebido, o lucro vai aparecer maior do que é. <button type="button" class="link-btn link-inline" data-ir="food/canais">Cadastrar taxas →</button>`;
  renderHistoricoImport();
}

function carregarTesseract(){
  if (window.Tesseract) return Promise.resolve();
  return new Promise((ok, falha) => {
    const s = document.createElement('script');
    s.src = TESSERACT_URL;
    s.onload = ok;
    s.onerror = () => falha(new Error('Não foi possível baixar o leitor de imagens. Verifique a conexão com a internet ou cole o texto do relatório.'));
    document.head.appendChild(s);
  });
}

function progressoImport(texto, fracao){
  document.getElementById('impProgresso').style.display = '';
  document.getElementById('impProgressoTexto').textContent = texto;
  document.getElementById('impBarra').style.width = Math.round((fracao || 0) * 100) + '%';
}

async function lerPrints(arquivos){
  const imagens = [...arquivos].filter(a => a.type.startsWith('image/'));
  if (!imagens.length) { avisarFood('toastImp', 'Envie uma imagem (PNG ou JPG) do print.', true); return; }
  document.getElementById('impPrevias').innerHTML = imagens.map(a => `<img src="${URL.createObjectURL(a)}" alt="Print enviado: ${esc(a.name)}">`).join('');
  try {
    progressoImport('Preparando o leitor de imagens…', 0.02);
    await carregarTesseract();
    const textos = [];
    for (let k = 0; k < imagens.length; k++) {
      const rotulo = imagens.length > 1 ? `Lendo o print ${k + 1} de ${imagens.length}` : 'Lendo o print';
      const {data} = await window.Tesseract.recognize(imagens[k], 'por', {
        logger: m => { if (m.status === 'recognizing text') progressoImport(`${rotulo}… ${Math.round(m.progress * 100)}%`, (k + m.progress) / imagens.length); }
      });
      textos.push(data.text);
    }
    progressoImport('Leitura concluída.', 1);
    processarTextoImport(textos.join('\n'));
  } catch (e) {
    document.getElementById('impProgresso').style.display = 'none';
    avisarFood('toastImp', e.message || 'Não foi possível ler a imagem.', true);
  }
}

function processarTextoImport(texto){
  impTextoBruto = texto;
  const canal = canalDaImportacao();
  impLidos = interpretarTextoPlataforma(texto).map(p => ({
    ...p, incluir: !jaImportado(p, canal.id),
    itens: p.itens.map(i => ({...i, vinculo: vincularItemCardapio(i.nome)}))
  }));
  if (!impLidos.length) {
    document.getElementById('impRevisao').style.display = 'none';
    avisarFood('toastImp', 'Não encontrei pedidos no print. Confira se aparecem o número do pedido e os valores em R$ — ou cole o texto.', true);
    return;
  }
  renderRevisaoImport();
  document.getElementById('impRevisao').scrollIntoView({behavior: 'smooth', block: 'start'});
}

function renderRevisaoImport(){
  const canal = canalDaImportacao();
  document.getElementById('impRevisao').style.display = '';
  document.getElementById('impTextoLido').textContent = impTextoBruto;
  const opcoesCardapio = sel => '<option value="">— sem vínculo (sem custo) —</option>' +
    foodCardapio.filter(i => i.tipo !== 'adicional').map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.nome)} (custo ${moeda(custoItem(i))})</option>`).join('');
  let totalVendas = 0, totalLucro = 0, n = 0;
  document.getElementById('impPedidos').innerHTML = impLidos.map((p, k) => {
    const {calc, origemTaxa} = calcularPedidoImportado(p, canal);
    const f = faixaMargem(calc.margem);
    const dup = jaImportado(p, canal.id);
    const somaItens = r2(p.itens.reduce((s, i) => s + (i.valor || 0), 0));
    const difTotal = p.total != null && Math.abs(p.total - (somaItens - (p.desconto || 0))) > 0.05;
    if (p.incluir) { totalVendas += calc.receita; totalLucro += calc.lucro; n++; }
    return `<div class="imp-pedido ${p.incluir ? '' : 'imp-excluido'}" data-k="${k}">
      <div class="imp-ped-topo">
        <label class="entrada-check"><input type="checkbox" class="imp-incluir" data-k="${k}" ${p.incluir ? 'checked' : ''}> <b>Pedido</b></label>
        <label class="imp-num-pedido"># <input type="text" class="imp-campo" data-k="${k}" data-c="numeroExterno" value="${esc(p.numeroExterno)}" aria-label="Número do pedido na plataforma"></label>
        ${dup ? '<span class="badge b-wait">⚠ Já importado antes</span>' : ''}
        <span class="imp-ped-campos">
          <label>Data <input type="date" class="imp-campo" data-k="${k}" data-c="data" value="${p.data || hojeISO()}"></label>
          <label>Hora <input type="time" class="imp-campo" data-k="${k}" data-c="hora" value="${p.hora || ''}"></label>
        </span>
      </div>
      <table class="imp-itens"><thead><tr><th>Lido no print</th><th>Item do cardápio (custo)</th><th>Qtd.</th><th>Valor</th><th></th></tr></thead><tbody>
        ${p.itens.map((i, j) => `<tr class="${i.vinculo ? '' : 'imp-sem-vinculo'}">
          <td><input type="text" class="imp-item" data-k="${k}" data-j="${j}" data-c="nome" value="${esc(i.nome)}"></td>
          <td><select class="imp-item" data-k="${k}" data-j="${j}" data-c="vinculo">${opcoesCardapio(i.vinculo)}</select></td>
          <td><input type="number" class="imp-item imp-qtd" data-k="${k}" data-j="${j}" data-c="qtd" min="1" step="1" value="${i.qtd}"></td>
          <td><input type="text" class="imp-item imp-valor" data-k="${k}" data-j="${j}" data-c="valor" inputmode="decimal" value="${numBR(i.valor)}"></td>
          <td><button type="button" class="rm imp-rm" data-k="${k}" data-j="${j}" title="Remover item" aria-label="Remover item">✕</button></td></tr>`).join('')}
      </tbody></table>
      <div class="imp-ped-rodape">
        <label>Desconto <input type="text" class="imp-campo imp-valor" data-k="${k}" data-c="desconto" inputmode="decimal" value="${numBR(p.desconto || 0)}"></label>
        <label>Taxa da plataforma <input type="text" class="imp-campo imp-valor" data-k="${k}" data-c="taxa" inputmode="decimal" value="${p.taxa != null ? numBR(p.taxa) : ''}" placeholder="do canal"></label>
        <label>Valor recebido <input type="text" class="imp-campo imp-valor" data-k="${k}" data-c="recebido" inputmode="decimal" value="${p.recebido != null ? numBR(p.recebido) : ''}" placeholder="—"></label>
        <span class="imp-lucro lc-bg-${f.cls}">Venda ${moeda(calc.receita)} · taxa ${moeda(calc.taxa)} <small>(${origemTaxa === 'print' ? 'do print' : origemTaxa === 'recebido' ? 'pelo valor recebido' : 'do canal'})</small> · ${f.ic} lucro <b>${moeda(calc.lucro)}</b> (${pctBR(calc.margem)})</span>
      </div>
      ${difTotal ? `<p class="imp-aviso">⚠ O total do print (${moeda(p.total)}) é diferente da soma dos itens menos o desconto (${moeda(somaItens - (p.desconto || 0))}). Confira os valores.</p>` : ''}
      ${p.itens.some(i => !i.vinculo) ? '<p class="imp-aviso">⚠ Itens sem vínculo entram sem custo: o lucro deles aparece maior do que é. Escolha o item do cardápio correspondente.</p>' : ''}
    </div>`;
  }).join('');
  document.getElementById('impResumo').innerHTML = `Encontrei <b>${impLidos.length}</b> pedido${impLidos.length === 1 ? '' : 's'} de <b>${esc(canal.nome)}</b>. Selecionados: <b>${n}</b> · vendas ${moeda(totalVendas)} · lucro estimado ${moeda(totalLucro)}.`;
  document.getElementById('btnImpConfirmar').textContent = n ? `Importar ${n} pedido${n === 1 ? '' : 's'}` : 'Importar pedidos';
  document.getElementById('btnImpConfirmar').disabled = !n;

  const box = document.getElementById('impPedidos');
  box.querySelectorAll('.imp-incluir').forEach(c => c.addEventListener('change', () => { impLidos[c.dataset.k].incluir = c.checked; renderRevisaoImport(); }));
  box.querySelectorAll('.imp-campo').forEach(inp => inp.addEventListener('change', () => {
    const p = impLidos[inp.dataset.k], campo = inp.dataset.c;
    if (campo === 'data' || campo === 'hora') p[campo] = inp.value;
    else if (campo === 'numeroExterno') { p.numeroExterno = inp.value.replace(/\D/g, '') || p.numeroExterno; p.incluir = p.incluir && !jaImportado(p, canalDaImportacao().id); }
    else p[campo] = inp.value.trim() === '' ? (campo === 'desconto' ? 0 : null) : r2(paraNumero(inp.value));
    renderRevisaoImport();
  }));
  box.querySelectorAll('.imp-item').forEach(inp => inp.addEventListener('change', () => {
    const i = impLidos[inp.dataset.k].itens[inp.dataset.j], campo = inp.dataset.c;
    i[campo] = campo === 'nome' || campo === 'vinculo' ? inp.value : campo === 'qtd' ? Math.max(parseInt(inp.value, 10) || 1, 1) : r2(paraNumero(inp.value));
    renderRevisaoImport();
  }));
  box.querySelectorAll('.imp-rm').forEach(b => b.addEventListener('click', () => { impLidos[b.dataset.k].itens.splice(b.dataset.j, 1); renderRevisaoImport(); }));
}

function confirmarImportacao(){
  const canal = canalDaImportacao();
  const selecionados = impLidos.filter(p => p.incluir && p.itens.some(i => i.valor > 0));
  if (!selecionados.length) return;
  const loteId = idFood();
  let vendas = 0, lucro = 0;
  selecionados.forEach(p => {
    const {linhas, calc, origemTaxa} = calcularPedidoImportado(p, canal);
    const data = new Date(`${p.data || hojeISO()}T${p.hora || '12:00'}:00`);
    foodSeq++;
    const novoPedido = {
      numero: foodSeq, data: (isNaN(data) ? new Date() : data).toISOString(), usuario: usuarioAtual,
      canalId: canal.id, canalNome: canal.nome, entrega: !!canal.entrega,
      taxas: {comissao: canal.comissao, pagamento: canal.pagamento, fixa: canal.fixa, entregaCusto: canal.entregaCusto},
      cliente: '', obs: `Importado do ${canal.nome} · pedido #${p.numeroExterno}`,
      itens: linhas, desconto: calc.desconto, calc,
      importado: true, loteImportacao: loteId, numeroExterno: p.numeroExterno, origemTaxa, recebido: p.recebido,
      status: 'entregue', historico: [{status: 'entregue', data: new Date().toISOString(), usuario: usuarioAtual}]
    };
    foodPedidos.push(novoPedido);
    baixarEstoquePedido(novoPedido);
    vendas += calc.receita; lucro += calc.lucro;
  });
  foodImportacoes.push({id: loteId, data: new Date().toISOString(), plataforma: canal.nome, pedidos: selecionados.length, vendas: r2(vendas), lucro: r2(lucro), usuario: usuarioAtual});
  salvarFood();
  registrarAuditoria('Food', `Importação de vendas ${canal.nome}: ${selecionados.length} pedido(s) — ${moeda(vendas)}`, {
    detalhe: `Pedidos ${selecionados.map(p => '#' + p.numeroExterno).join(', ')} · lucro estimado ${moeda(lucro)}`
  });
  avisarFood('toastImp', `${selecionados.length} pedido(s) importado(s) do ${canal.nome}: vendas ${moeda(vendas)} · lucro estimado ${moeda(lucro)}.`);
  const diaFechamento = selecionados.map(p => p.data || hojeISO()).sort().pop();
  descartarImportacao();
  atualizarDashFood();
  renderHistoricoImport();
  abrirFechamentoDia(diaFechamento);
}

function descartarImportacao(){
  impLidos = []; impTextoBruto = '';
  document.getElementById('impRevisao').style.display = 'none';
  document.getElementById('impPrevias').innerHTML = '';
  document.getElementById('impProgresso').style.display = 'none';
  document.getElementById('impTexto').value = '';
}

function renderHistoricoImport(){
  document.getElementById('impHistorico').innerHTML = foodImportacoes.length ? foodImportacoes.slice().reverse().map(l => `<tr>
    <td>${dataHoraCurta(l.data)}</td><td>${esc(l.plataforma)}</td><td>${l.pedidos}</td><td class="nowrap">${moeda(l.vendas)}</td><td class="nowrap">${moeda(l.lucro)}</td><td>${esc(l.usuario)}</td>
    <td><button type="button" class="link-btn imp-desfazer" data-id="${l.id}">Desfazer</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="history-empty">Nenhuma importação ainda.</td></tr>';
  document.querySelectorAll('#impHistorico .imp-desfazer').forEach(b => b.addEventListener('click', () => {
    const lote = foodImportacoes.find(l => l.id === b.dataset.id);
    if (!lote || !confirm(`Desfazer a importação de ${lote.pedidos} pedido(s) do ${lote.plataforma}?\n\nOs pedidos importados nesse lote serão removidos.`)) return;
    foodPedidos.filter(p => p.loteImportacao === lote.id).forEach(p => estornarEstoquePedido(p, 'Importação desfeita'));
    foodPedidos = foodPedidos.filter(p => p.loteImportacao !== lote.id);
    foodImportacoes = foodImportacoes.filter(l => l.id !== lote.id);
    salvarFood();
    registrarAuditoria('Food', `Importação de vendas ${lote.plataforma} desfeita — ${lote.pedidos} pedido(s)`, {detalhe: `Vendas removidas: ${moeda(lote.vendas)}`});
    renderHistoricoImport();
    atualizarDashFood();
  }));
}

const impDrop = document.getElementById('impDrop');
document.getElementById('impArquivo').addEventListener('change', e => { if (e.target.files.length) lerPrints(e.target.files); e.target.value = ''; });
impDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('impArquivo').click(); } });
['dragenter', 'dragover'].forEach(t => impDrop.addEventListener(t, e => { e.preventDefault(); impDrop.classList.add('arrastando'); }));
['dragleave', 'drop'].forEach(t => impDrop.addEventListener(t, e => { e.preventDefault(); impDrop.classList.remove('arrastando'); }));
impDrop.addEventListener('drop', e => { if (e.dataTransfer.files.length) lerPrints(e.dataTransfer.files); });
// Colar um print direto (Ctrl+V) na tela de importação
document.addEventListener('paste', e => {
  if (document.getElementById('foodImportar').offsetParent === null) return;
  const imgs = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  if (imgs.length) { e.preventDefault(); lerPrints(imgs); }
});
document.getElementById('btnImpLerTexto').addEventListener('click', () => {
  const t = document.getElementById('impTexto').value;
  if (!t.trim()) { avisarFood('toastImp', 'Cole o texto do relatório primeiro.', true); return; }
  processarTextoImport(t);
});
document.getElementById('impCanalOutro').addEventListener('change', () => { renderFoodImportar(); if (impLidos.length) renderRevisaoImport(); });
document.getElementById('btnImpDescartar').addEventListener('click', descartarImportacao);
document.getElementById('btnImpConfirmar').addEventListener('click', confirmarImportacao);

// ---- Estoque de ingredientes (baixa automática pela ficha técnica) ----
const r3 = v => Math.round((Number(v) || 0) * 1000) / 1000;
function controlaEstoque(ins){ return !!ins && ins.estoque != null; }
const fmtQtdIns = (v, u) => `${(Number(v) || 0).toLocaleString('pt-BR', {maximumFractionDigits: 3})} ${u}`;
function situacaoEstoqueFood(ins){
  if (!controlaEstoque(ins)) return {cls: 'nao', rotulo: 'Não controlado', badge: 'b-wait'};
  if (ins.estoque <= 0) return {cls: 'zerado', rotulo: ins.estoque < 0 ? 'Negativo' : 'Zerado', badge: 'mt-saida'};
  if (ins.minimo && ins.estoque <= ins.minimo) return {cls: 'baixo', rotulo: 'Abaixo do mínimo', badge: 'mt-ajuste'};
  return {cls: 'ok', rotulo: 'OK', badge: 'b-ok'};
}
function insumosAbaixoMinimo(){ return foodInsumos.filter(i => ['baixo', 'zerado'].includes(situacaoEstoqueFood(i).cls)); }
function atualizarBadgeFoodEstoque(){
  const b = document.getElementById('navBadgeFoodEstoque');
  if (!b) return;
  const n = insumosAbaixoMinimo().length;
  b.textContent = n || '';
  b.title = n ? `${n} ingrediente(s) abaixo do mínimo` : '';
}
// Quanto de cada ingrediente (na unidade de compra) um item consome; combos somam os itens
function consumoItem(item, mult, acc, prof = 0){
  if (!item || prof > 3) return acc;
  if (item.tipo === 'combo') { (item.componentes || []).forEach(c => consumoItem(itemPorId(c.itemId), mult * c.qtd, acc, prof + 1)); return acc; }
  (item.ficha || []).forEach(l => {
    const ins = insumoPorId(l.insumoId);
    if (!ins || FAMILIA_UNIDADE[l.unidade] !== FAMILIA_UNIDADE[ins.unidade]) return;
    acc.set(ins.id, (acc.get(ins.id) || 0) + mult * (Number(l.qtd) || 0) * FATOR_UNIDADE[l.unidade] / FATOR_UNIDADE[ins.unidade]);
  });
  return acc;
}
function consumoDoPedido(p){
  const acc = new Map();
  p.itens.forEach(l => {
    if (!l.id) return; // item importado sem vínculo com o cardápio
    consumoItem(itemPorId(l.id), l.qtd, acc);
    (l.adicionais || []).forEach(a => consumoItem(itemPorId(a.id), l.qtd, acc));
  });
  return [...acc.entries()].map(([insumoId, qtd]) => ({insumoId, qtd: r3(qtd)})).filter(c => c.qtd > 0);
}
function lancarMovFood(ins, tipo, qtd, motivo, ref){
  ins.estoque = r3((Number(ins.estoque) || 0) + qtd);
  foodMovEstoque.push({id: idFood(), data: new Date().toISOString(), insumoId: ins.id, nome: ins.nome, unidade: ins.unidade, tipo, qtd: r3(qtd), saldo: ins.estoque, motivo: motivo || '', ref: ref || null, usuario: usuarioAtual});
  if (foodMovEstoque.length > 5000) foodMovEstoque = foodMovEstoque.slice(-5000);
}
// O consumo fica guardado no pedido para o estorno devolver exatamente o que saiu
function baixarEstoquePedido(p){
  p.consumo = consumoDoPedido(p).filter(c => controlaEstoque(insumoPorId(c.insumoId)));
  p.consumo.forEach(c => lancarMovFood(insumoPorId(c.insumoId), 'Consumo', -c.qtd, `Pedido Food #${p.numero}${p.importado ? ` · ${p.canalNome} #${p.numeroExterno}` : ''}`, {pedido: p.numero}));
}
function estornarEstoquePedido(p, motivo){
  (p.consumo || []).forEach(c => { const ins = insumoPorId(c.insumoId); if (controlaEstoque(ins)) lancarMovFood(ins, 'Estorno', c.qtd, `${motivo} · pedido #${p.numero}`, {pedido: p.numero}); });
  p.consumo = [];
}
function consumo7dias(insId){
  const ini = Date.now() - 7 * 864e5;
  return r3(-foodMovEstoque.filter(m => m.insumoId === insId && (m.tipo === 'Consumo' || m.tipo === 'Estorno') && new Date(m.data).getTime() >= ini).reduce((s, m) => s + m.qtd, 0));
}
const BADGE_MOV_FOOD = {Entrada: 'mt-entrada', Inicial: 'mt-inicial', Consumo: 'mt-venda', Estorno: 'mt-devolucao', Ajuste: 'mt-ajuste', Perda: 'mt-saida'};

function renderFoodEstoque(){
  const controlados = foodInsumos.filter(controlaEstoque);
  const baixos = insumosAbaixoMinimo();
  const valor = controlados.reduce((s, i) => s + Math.max(i.estoque, 0) * i.preco, 0);
  const consumoValor = controlados.reduce((s, i) => s + consumo7dias(i.id) * i.preco, 0);
  document.getElementById('feKpis').innerHTML = `
    <div><span>Ingredientes controlados</span><b>${controlados.length}</b><small>de ${foodInsumos.length} cadastrados</small></div>
    <div><span>Abaixo do mínimo</span><b>${baixos.length}</b><small>${baixos.length ? baixos.slice(0, 3).map(i => esc(i.nome)).join(', ') + (baixos.length > 3 ? '…' : '') : 'tudo em dia'}</small></div>
    <div><span>Valor em estoque</span><b>${moeda(valor)}</b><small>pelo preço de compra</small></div>
    <div><span>Consumo 7 dias</span><b>${moeda(consumoValor)}</b><small>baixado pelos pedidos</small></div>`;
  const busca = document.getElementById('feBusca').value.trim().toLowerCase();
  const filtro = document.getElementById('feFiltro').value;
  const ordem = {zerado: 0, baixo: 1, ok: 2, nao: 3};
  const lista = foodInsumos.filter(i => (!busca || i.nome.toLowerCase().includes(busca))
      && (!filtro || (filtro === 'baixo' ? baixos.includes(i) : filtro === 'controlados' ? controlaEstoque(i) : !controlaEstoque(i))))
    .sort((a, b) => ordem[situacaoEstoqueFood(a).cls] - ordem[situacaoEstoqueFood(b).cls] || a.nome.localeCompare(b.nome, 'pt-BR'));
  document.getElementById('feTabela').innerHTML = lista.length ? lista.map(i => {
    const st = situacaoEstoqueFood(i), ctl = controlaEstoque(i), c7 = consumo7dias(i.id);
    return `<tr class="${st.cls === 'nao' ? 'prod-inativo' : ''}">
      <td><b>${esc(i.nome)}</b><small class="history-date">${i.tipo === 'embalagem' ? 'Embalagem' : 'Ingrediente'} · ${moeda(i.preco)}/${i.unidade}</small></td>
      <td class="nowrap">${ctl ? `<b>${fmtQtdIns(i.estoque, i.unidade)}</b>` : '<span class="hv-muted">—</span>'}</td>
      <td class="nowrap">${i.minimo ? fmtQtdIns(i.minimo, i.unidade) : '—'}</td>
      <td><span class="badge ${st.badge}">${st.rotulo}</span></td>
      <td class="nowrap">${ctl ? moeda(Math.max(i.estoque, 0) * i.preco) : '—'}</td>
      <td class="nowrap">${c7 ? fmtQtdIns(c7, i.unidade) : '—'}</td>
      <td><div class="fe-acoes"><button type="button" class="link-btn fe-mov" data-id="${i.id}" data-t="entrada">Entrada</button><button type="button" class="link-btn fe-mov" data-id="${i.id}" data-t="ajuste">${ctl ? 'Ajustar' : 'Informar estoque'}</button></div></td></tr>`;
  }).join('') : '<tr><td colspan="7" class="history-empty">Nenhum ingrediente encontrado.</td></tr>';
  document.querySelectorAll('#feTabela .fe-mov').forEach(b => b.addEventListener('click', () => abrirMovFood(b.dataset.id, b.dataset.t)));
  const movs = foodMovEstoque.slice(-100).reverse();
  document.getElementById('feMovs').innerHTML = movs.length ? movs.map(m => `<tr>
      <td class="nowrap">${dataHoraCurta(m.data)}</td><td>${esc(m.nome)}</td><td><span class="badge ${BADGE_MOV_FOOD[m.tipo] || 'mt-ajuste'}">${m.tipo}</span></td>
      <td class="nowrap ${m.qtd < 0 ? 'mov-neg' : ''}">${m.qtd > 0 ? '+' : ''}${fmtQtdIns(m.qtd, m.unidade)}</td><td class="nowrap">${fmtQtdIns(m.saldo, m.unidade)}</td>
      <td>${esc(m.motivo) || '—'}</td><td>${esc(m.usuario)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="history-empty">Nenhuma movimentação ainda. Informe o estoque dos ingredientes para começar o controle.</td></tr>';
}

let feTipo = 'entrada';
const AJUDA_MOV_FOOD = {
  entrada: 'Compra ou recebimento: soma ao estoque. Informe o custo pago para manter o preço das fichas técnicas em dia.',
  ajuste: 'Contagem física: informe a quantidade que existe hoje. O sistema lança a diferença.',
  perda: 'Vencido, estragado ou desperdiçado: sai do estoque sem virar venda.'
};
function abrirMovFood(insId, tipo){
  feTipo = tipo || 'entrada';
  const sel = document.getElementById('feInsumo');
  sel.innerHTML = foodInsumos.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(i => `<option value="${i.id}">${esc(i.nome)} (${i.unidade})</option>`).join('');
  if (insId) sel.value = insId;
  ['feQtd', 'feCusto', 'feMotivo'].forEach(id => document.getElementById(id).value = '');
  const ins = insumoPorId(sel.value);
  document.getElementById('feMinimo').value = ins && ins.minimo ? String(ins.minimo).replace('.', ',') : '';
  document.getElementById('feErro').textContent = '';
  atualizarFormMovFood();
  document.getElementById('feForm').style.display = 'block';
  document.getElementById('feQtd').focus();
}
function atualizarFormMovFood(){
  document.querySelectorAll('#feTipo button').forEach(b => b.classList.toggle('active', b.dataset.t === feTipo));
  document.getElementById('feTipoAjuda').textContent = AJUDA_MOV_FOOD[feTipo];
  const ins = insumoPorId(document.getElementById('feInsumo').value);
  if (!ins) return;
  const u = ins.unidade;
  document.getElementById('feQtdLabel').textContent = {entrada: `Quantidade comprada (${u}) *`, ajuste: `Quantidade contada (${u}) *`, perda: `Quantidade perdida (${u}) *`}[feTipo];
  document.getElementById('feMinimoLabel').textContent = `Estoque mínimo (${u})`;
  document.getElementById('feCustoBox').style.display = feTipo === 'entrada' ? '' : 'none';
  document.getElementById('feCustoLabel').textContent = `Custo pago por ${u} (R$)`;
  document.getElementById('feCusto').placeholder = numBR(ins.preco);
  const qtd = paraNumero(document.getElementById('feQtd').value);
  const custo = paraNumero(document.getElementById('feCusto').value);
  const mudaPreco = feTipo === 'entrada' && custo > 0 && Math.abs(custo - ins.preco) > 0.001;
  document.getElementById('feAtualizarBox').style.display = mudaPreco ? '' : 'none';
  const usos = itensQueUsam(ins.id).length;
  document.getElementById('feAtualizarTexto').textContent = `Atualizar o preço de compra de ${moeda(ins.preco)} para ${moeda(custo)} por ${u}${usos ? ` (recalcula ${plural(usos, 'ficha técnica', 'fichas técnicas')})` : ''}`;
  const atual = controlaEstoque(ins) ? ins.estoque : 0;
  const temQtd = document.getElementById('feQtd').value.trim() !== '';
  const novo = feTipo === 'entrada' ? atual + qtd : feTipo === 'perda' ? atual - qtd : qtd;
  document.getElementById('feResumo').textContent = controlaEstoque(ins) || temQtd
    ? `Estoque de ${ins.nome}: ${fmtQtdIns(atual, u)}${temQtd ? ` → ${fmtQtdIns(r3(novo), u)}` : ''}${!controlaEstoque(ins) ? ' · passa a ser controlado' : ''}`
    : `${ins.nome} ainda não tem estoque controlado. Ao registrar, os pedidos passam a dar baixa dele.`;
}
function salvarMovFood(){
  const ins = insumoPorId(document.getElementById('feInsumo').value);
  const erro = m => { document.getElementById('feErro').textContent = m; };
  if (!ins) return erro('Escolha o ingrediente.');
  const txtQtd = document.getElementById('feQtd').value.trim();
  const qtd = r3(paraNumero(txtQtd));
  if (!txtQtd || qtd < 0 || (feTipo !== 'ajuste' && qtd <= 0)) return erro('Informe uma quantidade válida.');
  const txtMin = document.getElementById('feMinimo').value.trim();
  const minimo = r3(paraNumero(txtMin));
  if (minimo < 0) return erro('O estoque mínimo não pode ser negativo.');
  const motivo = document.getElementById('feMotivo').value.trim();
  const eraControlado = controlaEstoque(ins);
  const antes = eraControlado ? ins.estoque : 0;
  if (!eraControlado) ins.estoque = 0;
  const delta = r3(feTipo === 'entrada' ? qtd : feTipo === 'perda' ? -qtd : qtd - antes);
  const tipo = feTipo === 'entrada' ? 'Entrada' : feTipo === 'perda' ? 'Perda' : eraControlado ? 'Ajuste' : 'Inicial';
  const padrao = {Entrada: 'Compra', Perda: 'Perda / desperdício', Ajuste: 'Contagem de estoque', Inicial: 'Estoque inicial'}[tipo];
  const custoInformado = r2(paraNumero(document.getElementById('feCusto').value));
  // Compras guardam o custo pago: o Financeiro lança a compra como despesa
  if (delta !== 0 || !eraControlado) lancarMovFood(ins, tipo, delta, motivo || padrao, tipo === 'Entrada' ? {custoUnit: custoInformado > 0 ? custoInformado : ins.preco} : null);
  const alteracoes = [{campo: `Estoque ${ins.nome}`, antes: eraControlado ? fmtQtdIns(antes, ins.unidade) : 'não controlado', depois: fmtQtdIns(ins.estoque, ins.unidade)}];
  if (txtMin !== '' && minimo !== (ins.minimo || 0)) { alteracoes.push({campo: `Mínimo ${ins.nome}`, antes: fmtQtdIns(ins.minimo || 0, ins.unidade), depois: fmtQtdIns(minimo, ins.unidade)}); ins.minimo = minimo; }
  const custo = r2(paraNumero(document.getElementById('feCusto').value));
  let mudancasCusto = [];
  if (feTipo === 'entrada' && custo > 0 && Math.abs(custo - ins.preco) > 0.001 && document.getElementById('feAtualizarPreco').checked) {
    const usos = itensQueUsam(ins.id), custosAntes = usos.map(custoItem), foto = fotoCustos(), precoAntes = ins.preco;
    alteracoes.push({campo: `Preço de compra ${ins.nome}`, antes: moeda(ins.preco), depois: moeda(custo)});
    ins.preco = custo;
    usos.forEach((u, k) => { const depois = custoItem(u); if (Math.abs(depois - custosAntes[k]) > 0.001) alteracoes.push({campo: `Custo de ${u.nome}`, antes: moeda(custosAntes[k]), depois: moeda(depois)}); });
    mudancasCusto = registrarMudancaCusto(foto, `${ins.nome}: ${moeda(precoAntes)} → ${moeda(custo)}/${ins.unidade} (entrada de estoque)`);
  }
  registrarAuditoria('Food', `Estoque de ${ins.nome}: ${tipo.toLowerCase()} ${delta > 0 ? '+' : ''}${fmtQtdIns(delta, ins.unidade)}`, {alteracoes, detalhe: motivo || padrao});
  salvarFood();
  document.getElementById('feForm').style.display = 'none';
  renderFoodEstoque();
  avisarFood('toastFe', delta === 0 && eraControlado ? `Contagem confere: ${ins.nome} com ${fmtQtdIns(ins.estoque, ins.unidade)}.` : `${{Entrada: "Entrada registrada", Perda: "Perda registrada", Ajuste: "Ajuste registrado", Inicial: "Estoque inicial registrado"}[tipo]}: ${ins.nome} agora com ${fmtQtdIns(ins.estoque, ins.unidade)}.`);
  mostrarMudancasCusto(mudancasCusto, 'feResultado');
}
document.getElementById('btnFeNovo').addEventListener('click', () => abrirMovFood(null, 'entrada'));
document.getElementById('btnFeCancelar').addEventListener('click', () => { document.getElementById('feForm').style.display = 'none'; });
document.getElementById('btnFeSalvar').addEventListener('click', salvarMovFood);
document.querySelectorAll('#feTipo button').forEach(b => b.addEventListener('click', () => { feTipo = b.dataset.t; atualizarFormMovFood(); }));
document.getElementById('feInsumo').addEventListener('change', () => {
  const ins = insumoPorId(document.getElementById('feInsumo').value);
  document.getElementById('feMinimo').value = ins && ins.minimo ? String(ins.minimo).replace('.', ',') : '';
  atualizarFormMovFood();
});
['feQtd', 'feCusto'].forEach(id => document.getElementById(id).addEventListener('input', atualizarFormMovFood));
document.getElementById('feBusca').addEventListener('input', renderFoodEstoque);
document.getElementById('feFiltro').addEventListener('change', renderFoodEstoque);

// ---- Ficha técnica (consulta por produto) ----
let ftSel = null;
function renderFoodFicha(){
  const busca = document.getElementById('ftBusca').value.trim().toLowerCase();
  const ordem = {produto: 0, combo: 1, adicional: 2};
  // Categorias na ordem do tipo de negócio (ex.: Pizzas antes de Bebidas)
  const cats = tipoNegocio().categorias;
  const posCat = c => { const k = cats.indexOf(c); return k < 0 ? 99 : k; };
  const lista = foodCardapio.filter(i => !busca || (i.nome + ' ' + i.categoria).toLowerCase().includes(busca))
    .sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || posCat(a.categoria) - posCat(b.categoria) || String(a.categoria).localeCompare(String(b.categoria), 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!ftSel || !itemPorId(ftSel) || (busca && !lista.some(i => i.id === ftSel))) ftSel = lista[0]?.id || null;
  let grupo = null;
  document.getElementById('ftLista').innerHTML = lista.length ? lista.map(i => {
    const titulo = i.tipo === 'produto' ? (i.categoria || 'Produtos') : ROTULO_TIPO[i.tipo] + 's';
    const cab = titulo !== grupo ? `<div class="ft-grupo">${esc(titulo)}</div>` : '';
    grupo = titulo;
    const custo = custoItem(i), margem = i.preco ? (i.preco - custo) / i.preco * 100 : 0;
    return `${cab}<button type="button" class="ft-item ${i.id === ftSel ? 'active' : ''}" data-id="${i.id}"><b>${esc(i.nome)}</b><small>${semCusto(i) ? '⚠ sem custo' : `custo ${moeda(custo)} · margem ${pctBR(margem)}`}</small></button>`;
  }).join('') : '<p class="empty-msg">Nenhum produto encontrado.</p>';
  document.querySelectorAll('#ftLista .ft-item').forEach(b => b.addEventListener('click', () => { ftSel = b.dataset.id; renderFoodFicha(); }));
  renderFichaDetalhe();
}
function renderFichaDetalhe(){
  const el = document.getElementById('ftDetalhe');
  const i = itemPorId(ftSel);
  if (!i) { el.innerHTML = '<p class="empty-msg">Cadastre produtos em Food › Produtos para montar as fichas técnicas.</p>'; return; }
  const c = custosItem(i), custo = custoItem(i);
  const lucro = r2(i.preco - custo), margem = i.preco ? lucro / i.preco * 100 : 0;
  let tabela;
  if (i.tipo === 'combo') {
    tabela = `<table><thead><tr><th>Item do combo</th><th>Qtd.</th><th>Custo un.</th><th>Custo</th></tr></thead><tbody>${i.componentes.map(x => {
      const comp = itemPorId(x.itemId), cu = comp ? custoItem(comp) : 0;
      return `<tr><td>${esc(comp?.nome || '?')}</td><td>${x.qtd}</td><td class="nowrap">${moeda(cu)}</td><td class="nowrap">${moeda(cu * x.qtd)}</td></tr>`;
    }).join('')}</tbody><tfoot><tr><td colspan="3">Custo do combo</td><td class="nowrap">${moeda(custo)}</td></tr></tfoot></table>`;
  } else if (i.ficha.length) {
    const total = i.ficha.reduce((s, l) => s + custoLinhaFicha(l), 0) || 1;
    tabela = `<table><thead><tr><th>Ingrediente</th><th>Quantidade</th><th>Preço de compra</th><th>Custo</th><th>% do custo</th></tr></thead><tbody>${i.ficha.map(l => {
      const ins = insumoPorId(l.insumoId), v = custoLinhaFicha(l);
      return `<tr><td>${esc(ins?.nome || 'Ingrediente removido')}${ins?.tipo === 'embalagem' ? ' <small class="history-date">embalagem</small>' : ''}</td><td class="nowrap">${String(l.qtd).replace('.', ',')} ${l.unidade}</td>
        <td class="nowrap">${ins ? `${moeda(ins.preco)}/${ins.unidade}` : '—'}</td><td class="nowrap">${moeda(v)}</td><td class="nowrap">${pctBR(v / total * 100)}</td></tr>`;
    }).join('')}</tbody><tfoot><tr><td colspan="3">Custo da ficha</td><td class="nowrap">${moeda(c.ingredientes + c.embalagem)}</td><td></td></tr></tfoot></table>`;
  } else {
    tabela = `<p class="dv-ajuda">Este item ainda não tem ficha técnica: usa custo manual (ingredientes ${moeda(c.ingredientes)} · embalagem ${moeda(c.embalagem)}). Monte a ficha para o custo acompanhar o preço dos ingredientes e para o estoque dar baixa automática.</p>`;
  }
  // Quantas unidades o estoque atual permite produzir
  const cons = [...consumoItem(i, 1, new Map()).entries()];
  let producao = '';
  if (cons.length) {
    const controlados = cons.filter(([id]) => controlaEstoque(insumoPorId(id)));
    if (controlados.length) {
      const limites = controlados.map(([id, q]) => ({ins: insumoPorId(id), n: Math.max(Math.floor(insumoPorId(id).estoque / q + 1e-9), 0)})).sort((a, b) => a.n - b.n);
      producao = `🥫 Com o estoque atual dá para fazer <b>${limites[0].n} unidade${limites[0].n === 1 ? '' : 's'}</b> (limitado por ${esc(limites[0].ins.nome)}).${controlados.length < cons.length ? ' Alguns ingredientes não têm estoque controlado.' : ''}`;
    } else producao = '🥫 Os ingredientes desta ficha ainda não têm estoque controlado. <button type="button" class="link-btn" data-ir="food/estoque">Informar estoque →</button>';
  }
  const canais = foodCanais.filter(x => x.ativo);
  el.innerHTML = `
    ${(() => { const m = margensQueCairam(30).find(x => x.itemId === i.id); return m ? `<div class="ft-alerta">⚠️ <b>A margem deste produto diminuiu.</b> Custo ${moeda(m.custoAntes)} → ${moeda(m.custoDepois)} · margem ${pctBR(m.margemAntes)} → ${pctBR(m.margemDepois)}<small>${esc(m.motivo)} · ${dataHoraCurta(m.data)}</small></div>` : ''; })()}
    <div class="ft-cab">
      <div><h3>${esc(i.nome)}</h3><p>${ROTULO_TIPO[i.tipo]}${i.categoria ? ` · ${esc(i.categoria)}` : ''} · ${origemCusto(i)}${i.ativo === false ? ' · inativo' : ''}</p></div>
      <button type="button" class="btn" id="btnFtEditar">✎ Editar ficha técnica</button>
    </div>
    <div class="table-scroll">${tabela}</div>
    <div class="ft-colunas">
      <div class="lucro-card">
        <div class="lc-titulo">Custo e lucro de 1 unidade</div>
        <div class="lc-linha lc-venda"><span>Preço de venda</span><b>${moeda(i.preco)}</b></div>
        <div class="lc-linha"><span>(−) Ingredientes</span><b>${moeda(c.ingredientes)}</b></div>
        <div class="lc-linha"><span>(−) Embalagem</span><b>${moeda(c.embalagem)}</b></div>
        <div class="lc-linha"><span>(−) Outros custos</span><b>${moeda(c.outros)}</b></div>
        <div class="lc-total"><span>Lucro antes das taxas</span><b>${moeda(lucro)}</b></div>
        <div class="lc-linha lc-sub"><span>Margem</span><b>${pctBR(margem)}</b></div>
      </div>
      <div class="table-scroll">
        <div class="lc-titulo">Lucro em cada canal</div>
        <table><thead><tr><th>Canal</th><th>Taxas</th><th>Lucro</th><th>Margem</th></tr></thead><tbody>${canais.map(x => {
          const l = lucroItemNoCanal(i, x);
          return `<tr><td>${x.ic || ''} ${esc(x.nome)}</td><td class="nowrap">${moeda(l.taxa + l.entrega + l.outrosCanal)}</td><td class="nowrap"><b>${moeda(l.lucro)}</b></td><td class="nowrap">${pctBR(l.margem)}</td></tr>`;
        }).join('')}</tbody></table>
      </div>
    </div>
    ${producao ? `<div class="ft-producao">${producao}</div>` : ''}`;
  document.getElementById('btnFtEditar').addEventListener('click', () => { irPara('food/cardapio'); abrirFormFood(i.id); });
}
document.getElementById('ftBusca').addEventListener('input', renderFoodFicha);

// ---- Relatórios do Food ----
let frPeriodo = '30';
function intervaloRelFood(){
  let ini = new Date(); ini.setHours(0, 0, 0, 0);
  let fim = new Date(); fim.setHours(23, 59, 59, 999);
  if (frPeriodo === '7' || frPeriodo === '30') ini.setDate(ini.getDate() - (Number(frPeriodo) - 1));
  else if (frPeriodo === 'mes') ini.setDate(1);
  else if (frPeriodo === 'custom') {
    const a = document.getElementById('frIni').value, b = document.getElementById('frFim').value;
    if (a) ini = new Date(a + 'T00:00:00');
    if (b) fim = new Date(b + 'T23:59:59.999');
  }
  return {ini, fim};
}
function pedidosRelFood(){
  const {ini, fim} = intervaloRelFood();
  return foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data) >= ini && new Date(p.data) <= fim);
}
function renderFoodRelatorios(){
  const {ini, fim} = intervaloRelFood();
  const lista = pedidosRelFood();
  const dataCurta = d => d.toLocaleDateString('pt-BR');
  document.getElementById('frSub').textContent = `${dataCurta(ini)} a ${dataCurta(fim)} · ${plural(lista.length, 'pedido', 'pedidos')} · cancelados não entram`;
  document.getElementById('frKpis').innerHTML = htmlKpisFood(lista, '');
  const vazio = n => `<tr><td colspan="${n}" class="history-empty">Sem pedidos no período.</td></tr>`;
  // 🔥 Onde estou ganhando dinheiro?
  const produtos = resumoProdutosFood(lista);
  const lucroTotal = produtos.reduce((s, o) => s + Math.max(o.lucro, 0), 0);
  document.getElementById('frProdutos').innerHTML = produtos.length ? produtos.map(o => `<tr>
      <td><b>${esc(o.nome)}</b>${avisoSemCusto(o)}</td><td>${o.qtd}</td><td class="nowrap">${moeda(o.faturamento)}</td><td class="nowrap">${moeda(o.custo)}</td>
      <td class="nowrap"><b>${moeda(o.lucro)}</b></td><td class="nowrap">${pctBR(o.margem)}</td><td class="nowrap">${lucroTotal && o.lucro > 0 ? pctBR(o.lucro / lucroTotal * 100) : '—'}</td></tr>`).join('') : vazio(7);
  // ⚠️ Onde estou perdendo dinheiro?
  document.querySelector('#foodRelatorios .fr-col-canal').textContent = `Lucro no ${canalMaisCaro().nome}`;
  const margens = produtosPorMargem();
  document.getElementById('frBaixa').innerHTML = margens.length ? margens.map(linhaMargem).join('') : '<tr><td colspan="5" class="history-empty">Cadastre o custo dos produtos para ver as margens.</td></tr>';
  const negativos = lista.filter(p => p.calc.lucro < 0);
  document.getElementById('frNegativos').innerHTML = negativos.length
    ? `<div class="rel-bloco-titulo" style="margin-top:14px;">Pedidos com lucro negativo no período</div><ul class="fp-lista">${negativos.slice(0, 20).map(p => `<li>#${p.numero}${p.numeroExterno ? ` (${esc(p.canalNome)} #${esc(p.numeroExterno)})` : ` · ${esc(p.canalNome)}`} · ${dataCurta(new Date(p.data))} · venda ${moeda(p.calc.receita)} · custos ${moeda(p.calc.ingredientes + p.calc.embalagem + p.calc.outros)} · taxas ${moeda(p.calc.taxa)} · lucro <b>${moeda(p.calc.lucro)}</b></li>`).join('')}</ul>`
    : '';
  // Por canal
  const receitaTotal = lista.reduce((s, p) => s + p.calc.receita, 0);
  const porCanal = new Map();
  lista.forEach(p => { const o = porCanal.get(p.canalNome) || {n: 0, receita: 0, taxa: 0, lucro: 0}; o.n++; o.receita += p.calc.receita; o.taxa += p.calc.taxa + p.calc.entrega; o.lucro += p.calc.lucro; porCanal.set(p.canalNome, o); });
  document.getElementById('frCanais').innerHTML = porCanal.size ? [...porCanal.entries()].sort((a, b) => b[1].receita - a[1].receita).map(([nome, o]) => `<tr>
      <td><b>${esc(nome)}</b></td><td>${o.n}</td><td class="nowrap">${moeda(o.receita)}</td><td class="nowrap">${pctBR(receitaTotal ? o.receita / receitaTotal * 100 : 0)}</td>
      <td class="nowrap mov-neg">− ${moeda(o.taxa)}</td><td class="nowrap"><b>${moeda(o.lucro)}</b></td><td class="nowrap">${pctBR(o.receita ? o.lucro / o.receita * 100 : 0)}</td></tr>`).join('') : vazio(7);
  // Por dia
  const porDia = new Map();
  lista.forEach(p => {
    const d = new Date(p.data); d.setHours(0, 0, 0, 0);
    const o = porDia.get(d.getTime()) || {n: 0, receita: 0, custo: 0, taxa: 0, lucro: 0};
    o.n++; o.receita += p.calc.receita; o.custo += p.calc.ingredientes + p.calc.embalagem + p.calc.outros; o.taxa += p.calc.taxa; o.lucro += p.calc.lucro;
    porDia.set(d.getTime(), o);
  });
  document.getElementById('frDias').innerHTML = porDia.size ? [...porDia.entries()].sort((a, b) => b[0] - a[0]).map(([t, o]) => `<tr>
      <td class="nowrap">${new Date(t).toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'})}</td><td>${o.n}</td><td class="nowrap">${moeda(o.receita)}</td>
      <td class="nowrap">${moeda(o.custo)}</td><td class="nowrap">${moeda(o.taxa)}</td><td class="nowrap"><b>${moeda(o.lucro)}</b></td></tr>`).join('') : vazio(6);
  // Ingredientes consumidos (pelas fichas atuais)
  const consumo = new Map();
  lista.forEach(p => consumoDoPedido(p).forEach(c => consumo.set(c.insumoId, (consumo.get(c.insumoId) || 0) + c.qtd)));
  const linhasConsumo = [...consumo.entries()].map(([id, q]) => ({ins: insumoPorId(id), q})).filter(x => x.ins).map(x => ({...x, custo: x.q * x.ins.preco})).sort((a, b) => b.custo - a.custo);
  document.getElementById('frConsumo').innerHTML = linhasConsumo.length ? linhasConsumo.map(x => `<tr><td>${esc(x.ins.nome)}</td><td class="nowrap">${fmtQtdIns(r3(x.q), x.ins.unidade)}</td><td class="nowrap">${moeda(x.custo)}</td></tr>`).join('')
    : '<tr><td colspan="3" class="history-empty">Nenhum ingrediente consumido no período (itens sem ficha técnica não entram).</td></tr>';
}
document.querySelectorAll('#frPeriodo button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#frPeriodo button').forEach(x => x.classList.toggle('active', x === b));
  frPeriodo = b.dataset.p;
  const datas = document.getElementById('frDatas');
  datas.style.display = frPeriodo === 'custom' ? 'inline-flex' : 'none';
  if (frPeriodo === 'custom' && !document.getElementById('frIni').value) {
    const hoje = new Date();
    document.getElementById('frIni').value = hojeISO().slice(0, 8) + '01';
    document.getElementById('frFim').value = hojeISO();
  }
  renderFoodRelatorios();
}));
['frIni', 'frFim'].forEach(id => document.getElementById(id).addEventListener('change', renderFoodRelatorios));
document.getElementById('btnFrCSV').addEventListener('click', () => {
  const lista = pedidosRelFood();
  const {ini, fim} = intervaloRelFood();
  const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = v => (Number(v) || 0).toFixed(2).replace('.', ',');
  const linhas = [['Produto', 'Vendas', 'Faturamento', 'Custo', 'Lucro', 'Margem %']];
  resumoProdutosFood(lista).forEach(o => linhas.push([o.nome, o.qtd, n(o.faturamento), n(o.custo), n(o.lucro), n(o.margem)]));
  linhas.push([], ['Pedido', 'Data', 'Canal', 'Pedido na plataforma', 'Faturamento', 'Custo dos produtos', 'Taxas', 'Lucro', 'Margem %']);
  lista.forEach(p => linhas.push([p.numero, new Date(p.data).toLocaleString('pt-BR'), p.canalNome, p.numeroExterno || '', n(p.calc.receita), n(p.calc.ingredientes + p.calc.embalagem + p.calc.outros), n(p.calc.taxa), n(p.calc.lucro), n(p.calc.margem)]));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['﻿' + linhas.map(l => l.map(cel).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
  link.download = `food_relatorio_${ini.toISOString().slice(0, 10)}_${fim.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
});

// ---- Custo das fichas técnicas: aviso quando a margem diminui ----
function fotoCustos(){ return new Map(foodCardapio.map(i => [i.id, custoItem(i)])); }
// Compara o custo de todos os itens (combos inclusive) antes/depois de uma mudança de preço
function registrarMudancaCusto(foto, motivo){
  const mudancas = [];
  foodCardapio.forEach(i => {
    const antes = foto.get(i.id), depois = custoItem(i);
    if (antes == null || Math.abs(depois - antes) < 0.005 || !(i.preco > 0)) return;
    const margemAntes = (i.preco - antes) / i.preco * 100, margemDepois = (i.preco - depois) / i.preco * 100;
    mudancas.push({id: idFood(), data: new Date().toISOString(), itemId: i.id, nome: i.nome, preco: i.preco, custoAntes: antes, custoDepois: depois,
      margemAntes, margemDepois, caiu: margemDepois < margemAntes, motivo, usuario: usuarioAtual});
  });
  if (mudancas.length) foodAlertasMargem = foodAlertasMargem.concat(mudancas).slice(-200);
  return mudancas;
}
// Última queda de margem de cada item nos últimos N dias (se o custo voltou a cair depois, some)
function margensQueCairam(dias){
  const ini = Date.now() - dias * 864e5, ultima = new Map();
  foodAlertasMargem.filter(m => new Date(m.data).getTime() >= ini).forEach(m => ultima.set(m.itemId, m));
  return [...ultima.values()].filter(m => m.caiu && itemPorId(m.itemId)).reverse();
}
function mostrarMudancasCusto(lista, alvoId){
  const el = document.getElementById(alvoId);
  if (!lista.length) { el.style.display = 'none'; return; }
  el.innerHTML = `<div class="rel-bloco-titulo">Custo das fichas técnicas atualizado</div><p class="dv-ajuda">${esc(lista[0].motivo)}</p>
    <ul class="fp-lista">${lista.map(m => `<li><b>${esc(m.nome)}</b>: custo ${moeda(m.custoAntes)} → ${moeda(m.custoDepois)} · margem ${pctBR(m.margemAntes)} → ${pctBR(m.margemDepois)}
      ${m.caiu ? '<span class="fi-caiu">⚠️ A margem deste produto diminuiu.</span>' : '<span class="fi-subiu">✓ A margem aumentou.</span>'}</li>`).join('')}</ul>
    <button type="button" class="link-btn fi-fechar">Ok, entendi</button>`;
  el.style.display = 'block';
  el.querySelector('.fi-fechar').addEventListener('click', () => { el.style.display = 'none'; });
}

// ---- 📊 Fechamento do dia ----
const chaveDiaLocal = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
function custoFixoMensal(){ return r2((foodCustos.fixos || []).reduce((s, c) => s + (Number(c.valor) || 0), 0)); }
function custoFixoDiario(){ return foodCustos.diasMes > 0 ? r2(custoFixoMensal() / foodCustos.diasMes) : 0; }
function dadosFechamento(dataISO){
  const doDia = foodPedidos.filter(p => chaveDiaLocal(p.data) === dataISO);
  const lista = doDia.filter(p => p.status !== 'cancelado');
  const soma = k => r2(lista.reduce((s, p) => s + (Number(p.calc[k]) || 0), 0));
  const canais = new Map();
  lista.forEach(p => { const o = canais.get(p.canalNome) || {nome: p.canalNome, n: 0, receita: 0, taxa: 0, lucro: 0}; o.n++; o.receita += p.calc.receita; o.taxa += p.calc.taxa; o.lucro += p.calc.lucro; canais.set(p.canalNome, o); });
  return {n: lista.length, cancelados: doDia.length - lista.length, bruto: soma('venda'), descontos: soma('desconto'), subsidiado: soma('descontoSubsidiado'),
    taxas: soma('taxa'), custo: soma('ingredientes'), embalagens: soma('embalagem'), outros: soma('outros'), resultado: soma('lucro'),
    fixoDia: custoFixoDiario(), semCusto: lista.filter(p => p.itens.some(i => i.semCusto)).length,
    canais: [...canais.values()].sort((a, b) => b.receita - a.receita)};
}
function textoFechamento(f, dataTxt){
  const l = (r, v, neg) => `${r}: ${neg && v ? '-' : ''}${moeda(v)}`;
  const linhas = ['📊 Fechamento do dia', dataTxt, '', `Pedidos: ${f.n}`, l('Faturamento bruto', f.bruto), l('Descontos', f.descontos, true), l('Taxas de plataformas', f.taxas, true),
    l('Custo dos produtos', f.custo, true), l('Embalagens', f.embalagens, true)];
  if (f.outros) linhas.push(l('Outros custos', f.outros, true));
  linhas.push('--------------------------------', l('Resultado estimado', f.resultado));
  if (f.fixoDia) linhas.push(l('Custos fixos do dia', f.fixoDia, true), l('Resultado após custos fixos', f.resultado - f.fixoDia));
  if (f.canais.length) { linhas.push('', 'Por canal'); f.canais.forEach(c => linhas.push(`${c.nome}: ${c.n} venda(s) · ${moeda(c.receita)} · taxas ${moeda(c.taxa)} · lucro ${moeda(c.lucro)}`)); }
  return linhas.join('\n');
}
function abrirFechamentoDia(dataISO){
  dataISO = dataISO || hojeISO();
  const f = dadosFechamento(dataISO);
  const dataTxt = new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'});
  const linha = (rotulo, v, neg) => `<div class="fech-linha"><span>${rotulo}</span><b>${neg && v ? '−' : ''}${moeda(v)}</b></div>`;
  document.getElementById('comprovanteTitulo').textContent = `MGA Food · ${new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR')}`;
  document.getElementById('comprovanteConteudo').innerHTML = `
    <header class="receipt-head">
      <div class="receipt-logo">📊 Fechamento do dia</div>
      <p class="receipt-id">${dataTxt.charAt(0).toUpperCase() + dataTxt.slice(1)}<br>${tipoNegocio().ic} MGA Food${f.cancelados ? ` · ${plural(f.cancelados, 'pedido cancelado', 'pedidos cancelados')} fora da conta` : ''}</p>
    </header>
    ${f.n ? `<div class="fech-linhas">
      <div class="fech-linha"><span>Pedidos</span><b>${f.n}</b></div>
      ${linha('Faturamento bruto', f.bruto)}
      ${linha('Descontos', f.descontos, true)}
      ${linha('Taxas de plataformas', f.taxas, true)}
      ${linha('Custo dos produtos', f.custo, true)}
      ${linha('Embalagens', f.embalagens, true)}
      ${f.outros ? linha('Outros custos <small>entrega e extras</small>', f.outros, true) : ''}
      <div class="fech-total"><span>Resultado estimado</span><b class="${f.resultado < 0 ? 'mov-neg' : ''}">${moeda(f.resultado)}</b></div>
      ${f.fixoDia ? `${linha('Custos fixos do dia <small>rateio de aluguel, salários…</small>', f.fixoDia, true)}<div class="fech-total"><span>Resultado após custos fixos</span><b class="${f.resultado - f.fixoDia < 0 ? 'mov-neg' : ''}">${moeda(f.resultado - f.fixoDia)}</b></div>` : ''}
    </div>
    <div class="fech-sub">Por canal</div>
    <table class="fech-canais"><thead><tr><th>Canal</th><th>Vendas</th><th>Faturamento</th><th>Taxas</th><th>Lucro</th></tr></thead>
      <tbody>${f.canais.map(c => `<tr><td>${esc(c.nome)}</td><td>${c.n}</td><td>${moeda(c.receita)}</td><td>${moeda(c.taxa)}</td><td><b>${moeda(c.lucro)}</b></td></tr>`).join('')}</tbody></table>
    ${f.subsidiado ? `<p class="fech-nota">Promoções pagas pelas plataformas: ${moeda(f.subsidiado)} (não reduzem o resultado).</p>` : ''}
    ${f.semCusto ? `<p class="fech-nota">⚠ ${plural(f.semCusto, 'pedido tem', 'pedidos têm')} item sem custo cadastrado: o resultado aparece maior do que é.</p>` : ''}`
    : '<p class="empty-msg">Nenhum pedido neste dia.</p>'}
    <p class="receipt-footer">Estimativa pelas fichas técnicas e taxas cadastradas. Não inclui impostos.${f.fixoDia ? '' : '<br>Cadastre os custos fixos em Food › Custos para ver o resultado depois de aluguel, salários etc.'}</p>
    ${f.n ? '<div class="fech-acoes"><button type="button" class="btn btn-ghost" id="btnCopiarFechamento">📋 Copiar resumo</button></div>' : ''}`;
  const copiar = document.getElementById('btnCopiarFechamento');
  if (copiar) copiar.addEventListener('click', () => {
    const texto = textoFechamento(f, dataTxt);
    const ok = () => { copiar.textContent = '✓ Copiado'; };
    const alternativo = () => { const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (e) { /* sem área de transferência */ } t.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(ok, alternativo); else alternativo();
  });
  document.getElementById('comprovanteOverlay').style.display = 'flex';
}
document.getElementById('btnFpFechamento').addEventListener('click', () => abrirFechamentoDia(hojeISO()));
document.getElementById('btnFrFech').addEventListener('click', () => abrirFechamentoDia(document.getElementById('frFechData').value || hojeISO()));
document.getElementById('frFechData').value = hojeISO();

// ---- Clientes do Food ----
const ehMesa = n => /^\s*(mesa|comanda|balc[aã]o)\b/i.test(String(n || ''));
let fclSel = null;
function clientesFood(){
  const m = new Map();
  foodPedidos.filter(p => p.status !== 'cancelado' && p.cliente && !ehMesa(p.cliente)).forEach(p => {
    const k = normTxt(p.cliente).trim();
    const o = m.get(k) || {chave: k, nome: p.cliente.trim(), pedidos: [], total: 0, lucro: 0, canais: new Map(), ultimo: null};
    o.pedidos.push(p); o.total += p.calc.receita; o.lucro += p.calc.lucro;
    o.canais.set(p.canalNome, (o.canais.get(p.canalNome) || 0) + 1);
    if (!o.ultimo || new Date(p.data) > new Date(o.ultimo)) o.ultimo = p.data;
    // Prefere a grafia com maiúsculas ("João Silva" em vez de "joão silva")
    if (/[A-ZÀ-Ý]/.test(p.cliente) && !/[A-ZÀ-Ý]/.test(o.nome)) o.nome = p.cliente.trim();
    m.set(k, o);
  });
  return [...m.values()].map(o => ({...o, canal: [...o.canais.entries()].sort((a, b) => b[1] - a[1])[0][0],
    cadastro: clientes.find(c => normTxt(c.nome).trim() === o.chave)})).sort((a, b) => b.total - a.total);
}
function renderFoodClientes(){
  const todos = clientesFood();
  const validos = foodPedidos.filter(p => p.status !== 'cancelado');
  const identificados = validos.filter(p => p.cliente && !ehMesa(p.cliente)).length;
  const totalGasto = todos.reduce((s, o) => s + o.total, 0), totalPedidos = todos.reduce((s, o) => s + o.pedidos.length, 0);
  document.getElementById('fclKpis').innerHTML = `
    <div><span>Clientes</span><b>${todos.length}</b><small>com pedido no Food</small></div>
    <div><span>Pedidos identificados</span><b>${identificados}</b><small>de ${validos.length} pedidos${validos.length ? ` (${pctBR(identificados / validos.length * 100)})` : ''}</small></div>
    <div><span>Ticket médio</span><b>${moeda(totalPedidos ? totalGasto / totalPedidos : 0)}</b><small>por pedido de cliente</small></div>
    <div><span>Quem mais compra</span><b>${todos.length ? esc(todos[0].nome) : '—'}</b><small>${todos.length ? `${moeda(todos[0].total)} em ${plural(todos[0].pedidos.length, 'pedido', 'pedidos')}` : 'nenhum cliente ainda'}</small></div>`;
  const busca = normTxt(document.getElementById('fclBusca').value).trim();
  const lista = todos.filter(o => !busca || o.chave.includes(busca));
  document.getElementById('fclTabela').innerHTML = lista.length ? lista.map(o => `<tr class="${o.chave === fclSel ? 'fcl-sel' : ''}">
      <td><b>${esc(o.nome)}</b>${o.cadastro?.telefone ? `<small class="history-date">📞 ${esc(o.cadastro.telefone)}</small>` : ''}</td>
      <td>${o.pedidos.length}</td><td class="nowrap">${moeda(o.total)}</td><td class="nowrap">${moeda(o.total / o.pedidos.length)}</td>
      <td class="nowrap"><b>${moeda(o.lucro)}</b></td><td>${esc(o.canal)}</td><td class="nowrap">${dataHoraCurta(o.ultimo)}</td>
      <td><button type="button" class="link-btn fcl-ver" data-k="${esc(o.chave)}">Ver pedidos</button></td></tr>`).join('')
    : `<tr><td colspan="8" class="history-empty">${todos.length ? 'Nenhum cliente encontrado.' : 'Nenhum pedido com cliente ainda. Informe o cliente no Novo pedido.'}</td></tr>`;
  document.querySelectorAll('#fclTabela .fcl-ver').forEach(b => b.addEventListener('click', () => { fclSel = b.dataset.k; renderFoodClientes(); document.getElementById('fclDetalhe').scrollIntoView({behavior: 'smooth', block: 'start'}); }));
  const det = document.getElementById('fclDetalhe');
  const sel = todos.find(o => o.chave === fclSel);
  if (!sel) { det.style.display = 'none'; return; }
  det.style.display = 'block';
  det.innerHTML = `<div class="rel-bloco-titulo">Pedidos de ${esc(sel.nome)}</div>
    <table><thead><tr><th>Pedido</th><th>Data</th><th>Canal</th><th>Itens</th><th>Valor</th><th>Lucro</th><th></th></tr></thead><tbody>
    ${sel.pedidos.slice().sort((a, b) => new Date(b.data) - new Date(a.data)).map(p => `<tr><td>#${p.numero}</td><td class="nowrap">${dataHoraCurta(p.data)}</td><td>${esc(p.canalNome)}</td>
      <td>${p.itens.map(nomeLinhaPedido).join('<br>')}</td><td class="nowrap">${moeda(p.calc.receita)}</td><td class="nowrap"><b>${moeda(p.calc.lucro)}</b></td>
      <td><button type="button" class="link-btn fcl-lucro" data-n="${p.numero}">Ver lucro</button></td></tr>`).join('')}</tbody></table>`;
  det.querySelectorAll('.fcl-lucro').forEach(b => b.addEventListener('click', () => mostrarLucroPedidoFood(b.dataset.n)));
}
document.getElementById('fclBusca').addEventListener('input', renderFoodClientes);

// ---- Custos fixos e ponto de equilíbrio ----
// "1.500,00" ou "1500,5" (com vírgula: ponto é milhar) · "1500.50" (sem vírgula: ponto é decimal)
const lerValorBR = t => String(t).includes(',') ? Number(String(t).replace(/[.\s]/g, '').replace(',', '.')) || 0 : paraNumero(t);
const SUGESTOES_CUSTOS = ['Aluguel', 'Salários', 'Encargos', 'Energia', 'Água', 'Gás', 'Internet', 'Contador', 'Marketing', 'Sistema', 'Manutenção'];
function renderFoodCustos(){
  const fixos = foodCustos.fixos;
  document.getElementById('fcuSugestoes').innerHTML = SUGESTOES_CUSTOS.filter(n => !fixos.some(c => normTxt(c.nome) === normTxt(n)))
    .map(n => `<button type="button" class="fn-chip fcu-sug" data-n="${n}">+ ${n}</button>`).join('');
  document.querySelectorAll('#fcuSugestoes .fcu-sug').forEach(b => b.addEventListener('click', () => adicionarCustoFixo(b.dataset.n)));
  document.getElementById('fcuTabela').innerHTML = fixos.length ? fixos.map(c => `<tr>
      <td><input type="text" class="fcu-nome" data-id="${c.id}" value="${esc(c.nome)}" aria-label="Nome do custo"></td>
      <td><input type="text" class="fcu-valor" data-id="${c.id}" inputmode="decimal" value="${c.valor ? numBR(c.valor) : ''}" placeholder="0,00" aria-label="Valor por mês"></td>
      <td><div class="row-actions"><button type="button" class="del" data-id="${c.id}" title="Remover">✕</button></div></td></tr>`).join('')
    : '<tr><td colspan="3" class="history-empty">Nenhum custo fixo cadastrado. Use as sugestões acima ou "+ Adicionar custo".</td></tr>';
  const t = document.getElementById('fcuTabela');
  t.querySelectorAll('.fcu-nome').forEach(inp => inp.addEventListener('input', () => { fixos.find(c => c.id === inp.dataset.id).nome = inp.value; }));
  t.querySelectorAll('.fcu-valor').forEach(inp => inp.addEventListener('input', () => { fixos.find(c => c.id === inp.dataset.id).valor = Math.max(r2(lerValorBR(inp.value)), 0); atualizarResumoCustos(); }));
  t.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => { foodCustos.fixos = fixos.filter(c => c.id !== b.dataset.id); renderFoodCustos(); }));
  document.getElementById('fcuDias').value = foodCustos.diasMes;
  atualizarResumoCustos();
}
function adicionarCustoFixo(nome){
  foodCustos.fixos.push({id: idFood(), nome: nome || '', valor: 0});
  renderFoodCustos();
  const inps = document.querySelectorAll(nome ? '#fcuTabela .fcu-valor' : '#fcuTabela .fcu-nome');
  if (inps.length) inps[inps.length - 1].focus();
}
function atualizarResumoCustos(){
  const mensal = custoFixoMensal(), diario = custoFixoDiario();
  document.getElementById('fcuTotal').innerHTML = `<b>${moeda(mensal)}</b>`;
  const hoje = new Date();
  const ini30 = new Date(); ini30.setHours(0, 0, 0, 0); ini30.setDate(ini30.getDate() - 29);
  const lista30 = foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data) >= ini30);
  const soma = (l, k) => l.reduce((s, p) => s + (Number(p.calc[k]) || 0), 0);
  const lucro30 = soma(lista30, 'lucro'), n30 = lista30.length;
  const lucroPedido = n30 ? lucro30 / n30 : 0;
  const equilibrio = diario > 0 && lucroPedido > 0 ? Math.ceil(diario / lucroPedido) : null;
  const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const lucroMes = soma(foodPedidos.filter(p => p.status !== 'cancelado' && new Date(p.data) >= iniMes), 'lucro');
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const fixosAteHoje = r2(mensal * hoje.getDate() / diasNoMes);
  const resultadoMes = lucroMes - fixosAteHoje;
  document.getElementById('fcuKpis').innerHTML = `
    <div><span>Custos fixos por mês</span><b>${moeda(mensal)}</b><small>${plural(foodCustos.fixos.filter(c => c.valor > 0).length, 'custo', 'custos')}</small></div>
    <div><span>Custo fixo por dia</span><b>${moeda(diario)}</b><small>${foodCustos.diasMes} dias de funcionamento</small></div>
    <div><span>Ponto de equilíbrio</span><b>${equilibrio != null ? `${equilibrio} pedidos/dia` : '—'}</b><small>${n30 ? `lucro médio de ${moeda(lucroPedido)} por pedido (30 dias)` : 'sem pedidos nos últimos 30 dias'}</small></div>
    <div class="fp-lucro lc-bg-${resultadoMes >= 0 ? 'verde' : 'vermelho'}"><span>Resultado do mês até agora</span><b>${moeda(resultadoMes)}</b><small>lucro ${moeda(lucroMes)} − fixos de ${hoje.getDate()} de ${diasNoMes} dias ${moeda(fixosAteHoje)}</small></div>`;
  const receita30 = soma(lista30, 'receita');
  const partes = [
    {nome: 'Ingredientes', v: soma(lista30, 'ingredientes'), cor: '#f59e0b'},
    {nome: 'Embalagens', v: soma(lista30, 'embalagem'), cor: '#8b5cf6'},
    {nome: 'Taxas de plataformas', v: soma(lista30, 'taxa'), cor: '#ef4444'},
    {nome: 'Outros (entrega e extras)', v: soma(lista30, 'outros'), cor: '#64748b'},
    {nome: 'Lucro estimado', v: lucro30, cor: '#16a34a'}
  ];
  const pct = v => receita30 ? v / receita30 * 100 : 0;
  document.getElementById('fcuBarra').innerHTML = receita30 ? partes.filter(p => p.v > 0).map(p => `<span style="width:${pct(p.v)}%;background:${p.cor}" title="${p.nome}: ${pctBR(pct(p.v))}"></span>`).join('') : '';
  document.getElementById('fcuVariaveis').innerHTML = receita30 ? partes.map(p => `<tr><td><span class="fcu-dot" style="background:${p.cor}"></span>${p.nome}</td><td class="nowrap">${moeda(p.v)}</td><td class="nowrap">${pctBR(pct(p.v))}</td><td class="nowrap">${moeda(n30 ? p.v / n30 : 0)}</td></tr>`).join('')
    + `<tr class="fcu-total"><td>Faturamento</td><td class="nowrap">${moeda(receita30)}</td><td>100%</td><td class="nowrap">${moeda(n30 ? receita30 / n30 : 0)}</td></tr>`
    : '<tr><td colspan="4" class="history-empty">Sem pedidos nos últimos 30 dias.</td></tr>';
}
document.getElementById('btnFcuNovo').addEventListener('click', () => adicionarCustoFixo(''));
document.getElementById('fcuDias').addEventListener('input', e => { const d = Math.round(Number(e.target.value)); if (d >= 1 && d <= 31) { foodCustos.diasMes = d; atualizarResumoCustos(); } });
document.getElementById('btnFcuSalvar').addEventListener('click', () => {
  foodCustos.fixos = foodCustos.fixos.filter(c => String(c.nome).trim() || c.valor > 0);
  if (foodCustos.fixos.some(c => !String(c.nome).trim())) { avisarFood('toastFcu', 'Todo custo precisa de um nome.', true); return; }
  const antes = lsGet('foodCustos', {fixos: [], diasMes: 26});
  const totalAntes = r2((antes.fixos || []).reduce((s, c) => s + (Number(c.valor) || 0), 0));
  salvarFood();
  const alteracoes = [];
  if (totalAntes !== custoFixoMensal()) alteracoes.push({campo: 'Custos fixos por mês', antes: moeda(totalAntes), depois: moeda(custoFixoMensal())});
  if (antes.diasMes !== foodCustos.diasMes) alteracoes.push({campo: 'Dias de funcionamento', antes: String(antes.diasMes), depois: String(foodCustos.diasMes)});
  registrarAuditoria('Food', `Custos fixos salvos — ${moeda(custoFixoMensal())}/mês`, {alteracoes, detalhe: foodCustos.fixos.map(c => `${c.nome} ${moeda(c.valor)}`).join(', ')});
  renderFoodCustos();
  avisarFood('toastFcu', `Custos salvos: ${moeda(custoFixoMensal())} por mês · ${moeda(custoFixoDiario())} por dia.`);
});

// Cada tela do Food renderiza ao ser aberta
wireSubtabs('subtabsFood', {painel: 'foodPainel', pedido: 'foodPedido', pedidos: 'foodPedidos', importar: 'foodImportar', cardapio: 'foodCardapio', ficha: 'foodFicha', insumos: 'foodInsumos', estoque: 'foodEstoque', canais: 'foodCanais', relatorios: 'foodRelatorios', clientes: 'foodClientes', custos: 'foodCustos', config: 'foodConfig'});
const RENDER_FOOD = {painel: renderFoodPainel, pedido: renderFoodNovoPedido, pedidos: renderFoodPedidos, importar: renderFoodImportar, cardapio: renderFoodCardapio, ficha: renderFoodFicha, insumos: renderFoodInsumos, estoque: renderFoodEstoque, canais: renderFoodCanais, relatorios: renderFoodRelatorios, clientes: renderFoodClientes, custos: renderFoodCustos, config: renderFoodConfig};
document.querySelectorAll('#subtabsFood .stab').forEach(b => b.addEventListener('click', () => RENDER_FOOD[b.dataset.tab]()));
atualizarDashFood();
atualizarBadgeFoodEstoque();

// Cadastro do Financeiro (categorias/contas)
const financeiroItens = [
  {nome:'Aluguel', tipo:'Despesa', valor:4000},
  {nome:'Fornecedor de bebidas', tipo:'Despesa', valor:2500},
  {nome:'Vendas PIX', tipo:'Receita', valor:8500},
];
// Cadastro do Help Desk (técnicos)
const helpdeskItens = [{nome:'Carlos Souza', especialidade:'Suporte NF-e', contato:'(11) 98888-4444'}];
criarCadastroGenerico('cad-helpdesk', {
  campos: [
    {id:'nome', label:'Técnico / Atendente', placeholder:'Ex: Carlos Souza'},
    {id:'especialidade', label:'Especialidade', placeholder:'Ex: Suporte NF-e'},
    {id:'contato', label:'Contato', placeholder:'(11) 90000-0000'}
  ],
  colunas: [{key:'nome', label:'Nome'}, {key:'especialidade', label:'Especialidade'}, {key:'contato', label:'Contato'}],
  dados: helpdeskItens,
  storageKey: 'helpdesk', modulo: 'Help Desk', entidade: 'Técnico'
});



// Sub-abas do Dashboard por módulo
wireSubtabs('subtabsDashboard', {pdv:'dashPdv', food:'dashFood', financeiro:'dashFinanceiro', auditoria:'gestaoAuditoria', dados:'gestaoDados'});




// ---- Cancelamento, troca e devolução ----
let valesTroca = lsGet('valesTroca', []);
function salvarVales(){ lsSet('valesTroca', valesTroca); }
function senhaSupervisorOk(v){ return v === String(lsGet('senhaSupervisor', '1234')); }
function horaAgora(){ return new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}); }

// ---- Status da venda: Pago · Pendente (a prazo em aberto) · Cancelado · Devolvido ----
function valorAPrazo(v){ return pagamentosDaVenda(v).filter(p => p.forma === 'A prazo').reduce((s, p) => s + p.valor, 0); }
function valorRecebido(v){ return (v.recebimentos || []).reduce((s, r) => s + r.valor, 0); }
function saldoPendente(v){ return vendaCancelada(v) ? 0 : Math.max(Math.round((valorAPrazo(v) - valorRecebido(v)) * 100) / 100, 0); }
function statusVenda(v){
  if (vendaCancelada(v)) return 'cancelado';
  if ((v.devolucoes || []).length && valorLiquidoVenda(v) <= 0.001) return 'devolvido';
  if (saldoPendente(v) > 0.001) return 'pendente';
  if ((v.devolucoes || []).length) return 'parcial';
  return 'pago';
}
const STATUS_VENDA = {
  pago: {rotulo: 'Pago', classe: 'b-ok'},
  pendente: {rotulo: 'Pendente', classe: 'b-wait'},
  cancelado: {rotulo: 'Cancelado', classe: 'mt-saida'},
  devolvido: {rotulo: 'Devolvido', classe: 'mt-devolucao'},
  parcial: {rotulo: 'Devolução parcial', classe: 'mt-devolucao'}
};
function badgeStatus(v){
  const s = STATUS_VENDA[statusVenda(v)];
  // Pendente com devolução parcial mostra as duas informações
  const extra = statusVenda(v) === 'pendente' && (v.devolucoes || []).length ? ' <span class="badge mt-devolucao">Devolução parcial</span>' : '';
  return `<span class="badge ${s.classe}">${s.rotulo}</span>${extra}`;
}
// Nas listas comuns, só destaca o que foge do normal (não mostra "Pago")
function badgeStatusVenda(v){ return statusVenda(v) === 'pago' ? '' : ' ' + badgeStatus(v); }
function valorVendaHtml(v){
  if (vendaCancelada(v)) return `<s class="valor-riscado">${moeda(v.total)}</s>`;
  if ((v.devolucoes || []).length) return `<s class="valor-riscado">${moeda(v.total)}</s> <b>${moeda(valorLiquidoVenda(v))}</b>`;
  return `<b>${moeda(v.total)}</b>`;
}

// Itens originais da venda (com preço) e valor unitário líquido de cada um
function itensOriginais(v){ return Array.isArray(v.produtos) ? v.produtos : []; }
function valorUnitarioLiquido(v, item){
  if (!Number.isFinite(item.preco) || !item.qtd) return null;
  const liquidoItem = (item.preco * item.qtd - (item.desconto || 0)) / item.qtd;
  // O desconto geral da venda é rateado proporcionalmente entre os itens
  const base = (v.subtotal ?? itensOriginais(v).reduce((s, i) => s + i.preco * i.qtd, 0)) - (v.descontoItens || 0);
  const fator = base > 0 ? v.total / base : 1;
  return Math.round(liquidoItem * fator * 100) / 100;
}
function dinheiroDaVenda(v){ return pagamentosDaVenda(v).filter(p => p.forma === 'Dinheiro').reduce((s, p) => s + p.valor, 0); }
function vendaNoCaixaAtual(v){ return caixa.aberto && vendasDoCaixa().includes(v); }
function atualizarTudoAposVenda(){
  lsSet('vendas', vendasRealizadas);
  lsSet('caixa', caixa);
  salvarEstoque();
  renderMovimentosCaixa();
  renderTelasEstoque();
  atualizarDashboardPDV();
  atualizarDashboardFinanceiro();
  renderClientes();
  renderHistoricoVendas();
  if (dashboardVisivel()) renderDashboard();
}

// ---- Detalhes da venda ----
let vendaAberta = null;
function abrirDetalhesVenda(numero){
  const v = vendasRealizadas.find(x => String(x.numero) === String(numero));
  if (!v) { avisar(`Venda #${numero} não encontrada.`, true); return false; }
  vendaAberta = v;
  const itens = itensOriginais(v).length ? itensOriginais(v) : itensDaVenda({...v, devolucoes: []});
  const cancelada = vendaCancelada(v);
  const devolucoes = v.devolucoes || [];
  const restante = itens.some(i => i.qtd - qtdDevolvida(v, i) > 0);
  document.getElementById('detalhesVendaTitulo').innerHTML = `Venda #${v.numero}${badgeStatusVenda(v)}`;
  document.getElementById('detalhesVendaConteudo').innerHTML = `
    <div class="hc-resumo">
      <div><span>Data</span><b>${dataHoraCurta(v.data)}</b></div>
      <div><span>Cliente</span><b>${esc(v.cliente) || 'Consumidor final'}</b></div>
      <div><span>Vendedor</span><b>${esc(v.vendedor || v.usuario) || '—'}</b></div>
      <div><span>Valor</span><b>${valorVendaHtml(v)}</b></div>
    </div>
    ${cancelada ? `<div class="dv-alerta">Cancelada em ${dataHoraCurta(v.cancelamento.data)} por ${esc(v.cancelamento.usuario)} · Motivo: ${esc(v.cancelamento.motivo)}${v.cancelamento.estornoDinheiro ? ` · Estorno em dinheiro: ${moeda(v.cancelamento.estornoDinheiro)}` : ''}</div>` : ''}
    <div class="table-scroll"><table>
      <thead><tr><th>Produto</th><th>Qtd.</th><th>Devolvido</th><th>Valor</th></tr></thead>
      <tbody>${itens.map(i => `<tr><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${qtdDevolvida(v, i) || '—'}</td><td>${Number.isFinite(i.preco) ? moeda(i.preco * i.qtd - (i.desconto || 0)) : '—'}</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="hc-contato">Pagamento: ${pagamentosDaVenda(v).map(p => `${esc(p.forma)}${p.vale ? ` (${p.vale})` : ''} ${moeda(p.valor)}`).join(' + ')} · Operador: ${esc(operadorDaVenda(v))}</p>
    ${valorAPrazo(v) > 0 ? `<div class="dv-prazo">
      <div>A prazo: <b>${moeda(valorAPrazo(v))}</b> · recebido ${moeda(valorRecebido(v))} · ${saldoPendente(v) > 0.001 ? `<b class="dv-aberto">em aberto ${moeda(saldoPendente(v))}</b>` : '<b>quitado ✓</b>'}</div>
      ${(v.recebimentos || []).map(r => `<small>${dataHoraCurta(r.data)} · ${esc(r.forma)} ${moeda(r.valor)} · ${esc(r.usuario)}</small>`).join('')}
    </div>` : ''}
    ${devolucoes.length ? `<div class="stitle">Devoluções</div>${devolucoes.map(d => `
      <div class="dv-registro">
        <b>${dataHoraCurta(d.data)} · ${moeda(d.valor)}</b> — ${d.itens.map(i => `${i.qtd}x ${esc(i.nome)}`).join(', ')}
        <small>${d.tipo === 'vale' ? `Vale-troca ${d.vale}` : `Reembolso em ${esc(d.forma)}`} · ${esc(d.motivo)}${d.defeito ? ' · com defeito (avaria)' : ''} · ${esc(d.usuario)}</small>
        ${d.tipo === 'vale' ? `<button type="button" class="link-btn dv-reimprimir" data-vale="${d.vale}">Reimprimir vale</button>` : ''}
      </div>`).join('')}` : ''}`;
  document.querySelectorAll('#detalhesVendaConteudo .dv-reimprimir').forEach(b => b.addEventListener('click', () => {
    const vale = valesTroca.find(x => x.codigo === b.dataset.vale);
    if (vale) mostrarComprovanteVale(vale);
  }));
  const temPreco = itens.every(i => Number.isFinite(i.preco));
  const bDev = document.getElementById('btnDvDevolucao');
  const bCan = document.getElementById('btnDvCancelar');
  bDev.disabled = cancelada || !restante || !temPreco;
  bDev.title = cancelada ? 'Venda cancelada' : !restante ? 'Todos os itens já foram devolvidos' : !temPreco ? 'Venda antiga sem preço por item' : '';
  bCan.disabled = cancelada || devolucoes.length > 0;
  bCan.title = cancelada ? 'Venda já cancelada' : devolucoes.length ? 'Esta venda já tem devolução; use Troca/devolução para os itens restantes' : '';
  document.getElementById('btnDvReceber').style.display = saldoPendente(v) > 0.001 ? '' : 'none';
  document.getElementById('detalhesVendaOverlay').style.display = 'flex';
  return true;
}
function fecharDetalhesVenda(){ document.getElementById('detalhesVendaOverlay').style.display = 'none'; }

document.getElementById('btnFecharDetalhesVenda').addEventListener('click', fecharDetalhesVenda);
document.getElementById('btnDvComprovante').addEventListener('click', () => { if (vendaAberta) mostrarComprovante(vendaAberta); });

// ---- Receber pagamento de venda a prazo ----
document.getElementById('btnDvReceber').addEventListener('click', () => {
  const v = vendaAberta;
  if (!v) return;
  document.getElementById('receberTitulo').textContent = `Receber pagamento — venda #${v.numero}`;
  document.getElementById('receberResumo').innerHTML = `
    <div class="cf-linha"><span>Cliente</span><b>${esc(v.cliente) || '—'}</b></div>
    <div class="cf-linha"><span>Vendido a prazo</span><b>${moeda(valorAPrazo(v))}</b></div>
    <div class="cf-linha"><span>Já recebido</span><b>${moeda(valorRecebido(v))}</b></div>
    <div class="cf-linha cf-diferenca falta"><span>Em aberto</span><b>${moeda(saldoPendente(v))}</b></div>`;
  document.getElementById('rcForma').value = 'Dinheiro';
  document.getElementById('rcValor').value = numBR(saldoPendente(v));
  document.getElementById('rcErro').textContent = '';
  document.getElementById('receberOverlay').style.display = 'flex';
  document.getElementById('rcValor').select();
});
document.getElementById('btnVoltarReceber').addEventListener('click', () => document.getElementById('receberOverlay').style.display = 'none');
document.getElementById('btnConfirmarReceber').addEventListener('click', () => {
  const v = vendaAberta;
  const erro = msg => { document.getElementById('rcErro').textContent = msg; };
  const forma = document.getElementById('rcForma').value;
  const valor = Math.round(paraNumero(document.getElementById('rcValor').value) * 100) / 100;
  if (!caixa.aberto) return erro('Abra o caixa para registrar o recebimento.');
  if (valor <= 0) return erro('Informe o valor recebido.');
  if (valor > saldoPendente(v) + 0.001) return erro(`O valor passa do saldo em aberto (${moeda(saldoPendente(v))}).`);
  (v.recebimentos = v.recebimentos || []).push({data: new Date().toISOString(), forma, valor, usuario: usuarioAtual});
  registrarAuditoria('Vendas', `Recebimento de ${moeda(valor)} na venda #${v.numero} (${forma})`, {
    detalhe: `Cliente: ${v.cliente || '—'} · Em aberto após: ${moeda(saldoPendente(v))}`, ref: {venda: v.numero}
  });
  caixa.movimentos.push({tipo: 'Recebimento', forma, valor, desc: `Recebimento venda #${v.numero} (${forma})`, hora: horaAgora()});
  atualizarTudoAposVenda();
  document.getElementById('receberOverlay').style.display = 'none';
  abrirDetalhesVenda(v.numero);
  avisar(saldoPendente(v) > 0.001 ? `Recebido ${moeda(valor)}. Ainda em aberto: ${moeda(saldoPendente(v))}.` : `Venda #${v.numero} quitada.`);
});
document.getElementById('btnDvCancelar').addEventListener('click', () => abrirCancelamento(vendaAberta));
document.getElementById('btnDvDevolucao').addEventListener('click', () => abrirDevolucao(vendaAberta));
document.getElementById('formLocalizarVenda').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('localizarVendaNum');
  const numero = soDigitos(input.value);
  if (!numero) { input.focus(); return; }
  if (abrirDetalhesVenda(numero)) input.value = '';
  else input.select();
});

// ---- Cancelar venda ----
function abrirCancelamento(v){
  if (!v || vendaCancelada(v)) return;
  const dinheiro = dinheiroDaVenda(v);
  const noCaixa = vendaNoCaixaAtual(v);
  document.getElementById('cancelarVendaTitulo').textContent = `Cancelar venda #${v.numero}`;
  document.getElementById('cancelarVendaResumo').innerHTML = `
    <div class="cf-linha"><span>${esc(v.itens)}</span><b>${moeda(v.total)}</b></div>
    <ul class="cv-efeitos">
      <li>Os produtos voltam para o estoque (movimentação "Devolução").</li>
      <li>A venda sai dos totais do caixa, do dashboard e do cliente.</li>
      ${dinheiro > 0 ? `<li>${noCaixa ? `Devolver <b>${moeda(dinheiro)}</b> em dinheiro ao cliente (a venda deixa de contar no caixa).` : `Estorno de <b>${moeda(dinheiro)}</b> em dinheiro sai do caixa atual.`}</li>` : ''}
      ${pagamentosDaVenda(v).some(p => p.forma !== 'Dinheiro' && p.forma !== 'Vale-troca' && p.forma !== 'A prazo') ? '<li>Pagamentos em PIX/cartão precisam ser estornados na maquininha/banco.</li>' : ''}
      ${pagamentosDaVenda(v).some(p => p.forma === 'Vale-troca') ? '<li>O valor pago com vale-troca volta para o vale.</li>' : ''}
    </ul>`;
  ['cvMotivoSel', 'cvMotivoOutro', 'cvSenha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cvMotivoOutroBox').style.display = 'none';
  document.getElementById('cvErro').textContent = '';
  document.getElementById('cancelarVendaOverlay').style.display = 'flex';
  document.getElementById('cvMotivoSel').focus();
}
document.getElementById('cvMotivoSel').addEventListener('change', e => {
  document.getElementById('cvMotivoOutroBox').style.display = e.target.value === 'outro' ? 'block' : 'none';
});
document.getElementById('btnVoltarCancelamento').addEventListener('click', () => document.getElementById('cancelarVendaOverlay').style.display = 'none');
document.getElementById('btnConfirmarCancelamento').addEventListener('click', () => {
  const v = vendaAberta;
  const erro = msg => { document.getElementById('cvErro').textContent = msg; };
  const sel = document.getElementById('cvMotivoSel').value;
  const motivo = sel === 'outro' ? document.getElementById('cvMotivoOutro').value.trim() : sel;
  if (!motivo) return erro('Informe o motivo do cancelamento.');
  if (!senhaSupervisorOk(document.getElementById('cvSenha').value)) return erro('Senha do supervisor incorreta.');
  const dinheiro = dinheiroDaVenda(v);
  const noCaixa = vendaNoCaixaAtual(v);
  // Recebimentos de venda a prazo em dinheiro entraram na gaveta: também voltam ao cliente
  const recebidoDinheiro = (v.recebimentos || []).filter(r => r.forma === 'Dinheiro').reduce((s, r) => s + r.valor, 0);
  const aEstornar = (dinheiro > 0 && !noCaixa ? dinheiro : 0) + recebidoDinheiro;
  if (aEstornar > 0 && !caixa.aberto) return erro(`Abra o caixa para devolver ${moeda(aEstornar)} em dinheiro.`);

  // 1. Produtos voltam ao estoque
  itensOriginais(v).length ? itensOriginais(v).forEach(i => devolverAoEstoque(i, i.qtd, `Cancelamento venda #${v.numero} — ${motivo}`, v.numero, false))
    : itensDaVenda({...v, devolucoes: []}).forEach(i => devolverAoEstoque(i, i.qtd, `Cancelamento venda #${v.numero} — ${motivo}`, v.numero, false));
  // 2. Dinheiro: se a venda é de outro caixa, o estorno sai do caixa atual
  const estornoDinheiro = aEstornar;
  if (estornoDinheiro) caixa.movimentos.push({tipo: 'Estorno', desc: `Cancelamento venda #${v.numero}`, valor: estornoDinheiro, hora: horaAgora()});
  // 3. Vale-troca usado volta a ter saldo
  pagamentosDaVenda(v).filter(p => p.vale).forEach(p => {
    const vale = valesTroca.find(x => x.codigo === p.vale);
    if (vale) { vale.saldo = Math.round((vale.saldo + p.valor) * 100) / 100; vale.usos = (vale.usos || []).filter(u => u.venda !== v.numero); }
  });
  salvarVales();
  // 4. Marca a venda (com usuário, data e motivo)
  v.status = 'cancelada';
  v.cancelamento = {data: new Date().toISOString(), usuario: usuarioAtual, motivo, estornoDinheiro};
  registrarAuditoria('Vendas', `Venda #${v.numero} cancelada — ${moeda(v.total)}`, {
    detalhe: `Motivo: ${motivo} · autorizado com senha do supervisor${estornoDinheiro ? ` · estorno em dinheiro ${moeda(estornoDinheiro)}` : ''}`,
    ref: {venda: v.numero}
  });
  atualizarTudoAposVenda();
  document.getElementById('cancelarVendaOverlay').style.display = 'none';
  abrirDetalhesVenda(v.numero);
  avisar(`Venda #${v.numero} cancelada. Estoque devolvido.`);
});

// Registra a volta de um item ao estoque; com defeito, dá baixa em seguida como avaria
function devolverAoEstoque(item, qtd, motivo, numeroVenda, defeito){
  const prod = produtosPDV.find(p => (item.codigo && p.codigo === item.codigo) || (!item.codigo && p.nome === item.nome));
  if (!prod || qtd <= 0) return;
  lancarMovEstoque(prod, 'Devolução', qtd, motivo, {venda: numeroVenda});
  if (defeito) lancarMovEstoque(prod, 'Saída', -qtd, `Avaria — devolução venda #${numeroVenda}`, {venda: numeroVenda});
}

// ---- Troca / devolução ----
function abrirDevolucao(v){
  if (!v || vendaCancelada(v)) return;
  document.getElementById('devolucaoTitulo').textContent = `Troca / devolução — venda #${v.numero}`;
  document.getElementById('devolucaoItens').innerHTML = itensOriginais(v).map((i, idx) => {
    const disp = i.qtd - qtdDevolvida(v, i);
    return `<tr><td>${esc(i.nome)}</td><td>${i.qtd}</td><td>${qtdDevolvida(v, i) || '—'}</td><td>${moeda(valorUnitarioLiquido(v, i))}</td>
      <td><input type="number" class="dv-qtd" data-idx="${idx}" min="0" max="${disp}" step="1" value="0" ${disp ? '' : 'disabled'}> <small>de ${disp}</small></td></tr>`;
  }).join('');
  ['dvMotivo', 'dvSenha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('dvTipo').value = 'vale';
  document.getElementById('dvForma').value = 'Dinheiro';
  document.getElementById('dvDefeito').checked = false;
  document.getElementById('dvFormaBox').style.display = 'none';
  document.getElementById('dvErro').textContent = '';
  document.querySelectorAll('#devolucaoItens .dv-qtd').forEach(inp => inp.addEventListener('input', atualizarTotalDevolucao));
  atualizarTotalDevolucao();
  document.getElementById('devolucaoOverlay').style.display = 'flex';
}
function itensSelecionadosDevolucao(){
  const v = vendaAberta;
  return [...document.querySelectorAll('#devolucaoItens .dv-qtd')].map(inp => {
    const item = itensOriginais(v)[inp.dataset.idx];
    const disp = item.qtd - qtdDevolvida(v, item);
    const qtd = Math.min(Math.max(parseInt(inp.value, 10) || 0, 0), disp);
    return {item, qtd, valorUnit: valorUnitarioLiquido(v, item)};
  }).filter(x => x.qtd > 0);
}
function atualizarTotalDevolucao(){
  const sel = itensSelecionadosDevolucao();
  const total = Math.round(sel.reduce((s, x) => s + x.qtd * x.valorUnit, 0) * 100) / 100;
  const tipo = document.getElementById('dvTipo').value;
  document.getElementById('dvTotal').innerHTML = sel.length
    ? `${sel.reduce((s, x) => s + x.qtd, 0)} item(ns) · <b>${moeda(total)}</b> ${tipo === 'vale' ? 'em vale-troca' : 'de reembolso'}`
    : 'Nenhum item selecionado.';
  return total;
}
document.getElementById('dvTipo').addEventListener('change', e => {
  document.getElementById('dvFormaBox').style.display = e.target.value === 'reembolso' ? 'block' : 'none';
  atualizarTotalDevolucao();
});
document.getElementById('dvMotivo').addEventListener('change', e => {
  if (e.target.value === 'Produto com defeito') document.getElementById('dvDefeito').checked = true;
});
document.getElementById('btnVoltarDevolucao').addEventListener('click', () => document.getElementById('devolucaoOverlay').style.display = 'none');
document.getElementById('btnConfirmarDevolucao').addEventListener('click', () => {
  const v = vendaAberta;
  const erro = msg => { document.getElementById('dvErro').textContent = msg; };
  const sel = itensSelecionadosDevolucao();
  const total = atualizarTotalDevolucao();
  const motivo = document.getElementById('dvMotivo').value;
  const tipo = document.getElementById('dvTipo').value;
  const forma = document.getElementById('dvForma').value;
  const defeito = document.getElementById('dvDefeito').checked;
  if (!sel.length) return erro('Informe a quantidade de pelo menos um item.');
  if (!motivo) return erro('Informe o motivo da devolução.');
  if (!senhaSupervisorOk(document.getElementById('dvSenha').value)) return erro('Senha do supervisor incorreta.');
  if (tipo === 'reembolso' && forma === 'Dinheiro' && !caixa.aberto) return erro('Abra o caixa para devolver dinheiro.');

  sel.forEach(x => devolverAoEstoque(x.item, x.qtd, `Devolução venda #${v.numero} — ${motivo}`, v.numero, defeito));
  let vale = null;
  if (tipo === 'vale') {
    vale = {codigo: 'VT-' + String(valesTroca.length + 1).padStart(4, '0'), valor: total, saldo: total, data: new Date().toISOString(),
      vendaOrigem: v.numero, clienteId: v.clienteId || null, cliente: v.cliente || '', usuario: usuarioAtual, usos: []};
    valesTroca.push(vale);
    salvarVales();
  } else if (forma === 'Dinheiro') {
    caixa.movimentos.push({tipo: 'Estorno', desc: `Devolução venda #${v.numero}`, valor: total, hora: horaAgora()});
  }
  v.devolucoes = v.devolucoes || [];
  v.devolucoes.push({data: new Date().toISOString(), usuario: usuarioAtual, motivo, defeito, tipo, forma: tipo === 'vale' ? 'Vale-troca' : forma,
    vale: vale ? vale.codigo : null, valor: total,
    itens: sel.map(x => ({codigo: x.item.codigo, nome: x.item.nome, qtd: x.qtd, valorUnit: x.valorUnit}))});
  registrarAuditoria('Vendas', `Devolução na venda #${v.numero} — ${moeda(total)}`, {
    detalhe: `${sel.map(x => `${x.qtd}x ${x.item.nome}`).join(', ')} · ${vale ? `vale-troca ${vale.codigo} emitido` : `reembolso em ${forma}`} · Motivo: ${motivo}${defeito ? ' · com defeito' : ''} · autorizado com senha do supervisor`,
    ref: {venda: v.numero}
  });
  atualizarTudoAposVenda();
  document.getElementById('devolucaoOverlay').style.display = 'none';
  abrirDetalhesVenda(v.numero);
  if (vale) mostrarComprovanteVale(vale);
  avisar(tipo === 'vale' ? `Devolução registrada. Vale-troca ${vale.codigo} de ${moeda(total)} gerado.` : `Devolução registrada. Reembolso de ${moeda(total)} em ${forma}.`);
});

function mostrarComprovanteVale(vale){
  document.getElementById('comprovanteTitulo').textContent = 'Vale-troca';
  document.getElementById('comprovanteConteudo').innerHTML = `
    <header class="receipt-head">
      <div class="receipt-logo">MGA</div>
      <p class="receipt-company">MGA Soluções Tecnológicas</p>
      <p class="receipt-store">Loja Matriz</p>
      <div class="receipt-doc">Vale-troca</div>
      <p class="receipt-id">Emitido em ${new Date(vale.data).toLocaleString('pt-BR')}<br>Referente à venda #${vale.vendaOrigem}${vale.cliente ? `<br>Cliente: ${esc(vale.cliente)}` : ''}</p>
    </header>
    <div class="receipt-vale-codigo">${vale.codigo}</div>
    <div class="receipt-summary">
      <div class="receipt-line"><span>Valor do vale</span><b>${moeda(vale.valor)}</b></div>
      <div class="receipt-grand"><span>Saldo disponível</span><b>${moeda(vale.saldo)}</b></div>
    </div>
    <p class="receipt-footer">Apresente este código no caixa para usar como pagamento.<br>Emitido por ${esc(vale.usuario)}. Documento não fiscal.</p>`;
  document.getElementById('comprovanteOverlay').style.display = 'flex';
}

// Fechar modais com Esc / clique fora
['detalhesVendaOverlay', 'cancelarVendaOverlay', 'devolucaoOverlay'].forEach(id => document.getElementById(id).addEventListener('click', e => {
  if (e.target.id === id) document.getElementById(id).style.display = 'none';
}));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  // fecha o de cima primeiro
  for (const id of ['cancelarVendaOverlay', 'devolucaoOverlay', 'detalhesVendaOverlay']) {
    const el = document.getElementById(id);
    if (el.style.display === 'flex') { el.style.display = 'none'; break; }
  }
});


// ---- Histórico de vendas (com filtros) ----
function operadorDaVenda(v){ return v.usuario || v.vendedor || '—'; }
const LIMITE_HISTORICO = 300;

function periodoPadraoVendas(){
  const fim = hojeISO();
  const d = new Date(); d.setDate(d.getDate() - 29);
  const ini = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {ini, fim};
}

// Opções de forma e operador a partir das vendas existentes (mantém a seleção atual)
function preencherFiltrosVendas(){
  const preencher = (id, valores, rotuloTodos) => {
    const sel = document.getElementById(id);
    const atual = sel.value;
    sel.innerHTML = `<option value="">${rotuloTodos}</option>` + valores.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (valores.includes(atual)) sel.value = atual;
  };
  const formas = [...new Set([...FORMAS_PAGAMENTO, 'Vale-troca', 'A prazo', ...vendasRealizadas.flatMap(formasDaVenda)].filter(Boolean))];
  const operadores = [...new Set(vendasRealizadas.map(operadorDaVenda).filter(o => o && o !== '—'))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  preencher('hvForma', formas, 'Todas');
  preencher('hvOperador', operadores, 'Todos');
}

function vendasFiltradas(){
  const busca = document.getElementById('hvBusca').value.trim().toLowerCase().replace(/^#/, '');
  const buscaDig = soDigitos(busca);
  const ini = document.getElementById('hvDataIni').value;
  const fim = document.getElementById('hvDataFim').value;
  const forma = document.getElementById('hvForma').value;
  const operador = document.getElementById('hvOperador').value;
  const status = document.getElementById('hvStatus').value;
  const tIni = ini ? new Date(ini + 'T00:00:00').getTime() : -Infinity;
  const tFim = fim ? new Date(fim + 'T23:59:59.999').getTime() : Infinity;
  return vendasRealizadas.filter(v => {
    const t = new Date(v.data).getTime();
    if (t < tIni || t > tFim) return false;
    if (forma && !formasDaVenda(v).includes(forma)) return false;
    if (operador && operadorDaVenda(v) !== operador) return false;
    if (status) {
      const s = statusVenda(v);
      if (status === 'devolvido' ? !(s === 'devolvido' || s === 'parcial' || (v.devolucoes || []).length) : s !== status) return false;
    }
    if (busca) {
      const campos = [String(v.numero), v.cliente, v.itens, v.vendedor].map(x => String(x || '').toLowerCase());
      const achou = campos.some(c => c.includes(busca)) || (buscaDig.length >= 3 && soDigitos(v.clienteDoc).includes(buscaDig));
      if (!achou) return false;
    }
    return true;
  }).sort((a, b) => new Date(b.data) - new Date(a.data));
}

function renderHistoricoVendas(){
  preencherFiltrosVendas();
  const lista = vendasFiltradas();
  const validas = vendasValidas(lista);
  const bruto = validas.reduce((s, v) => s + v.total, 0);
  const liquido = validas.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const canceladas = lista.filter(vendaCancelada);
  const aReceber = lista.reduce((s, v) => s + saldoPendente(v), 0);
  const pendentes = lista.filter(v => saldoPendente(v) > 0.001).length;
  document.getElementById('hvResumo').innerHTML = `
    <div><span>Vendas</span><b>${validas.length}</b></div>
    <div><span>Valor vendido</span><b>${moeda(bruto)}</b></div>
    <div><span>Líquido (após devoluções)</span><b>${moeda(liquido)}</b></div>
    <div><span>Canceladas</span><b>${canceladas.length}</b><small>${canceladas.length ? moeda(canceladas.reduce((s, v) => s + v.total, 0)) : ''}</small></div>
    <div class="${aReceber > 0.001 ? 'hv-alerta' : ''}"><span>A receber</span><b>${moeda(aReceber)}</b><small>${pendentes ? `${pendentes} venda${pendentes === 1 ? '' : 's'} pendente${pendentes === 1 ? '' : 's'}` : ''}</small></div>`;
  document.getElementById('hvContagem').textContent = lista.length > LIMITE_HISTORICO
    ? `Mostrando as ${LIMITE_HISTORICO} mais recentes de ${lista.length} vendas. Refine os filtros ou exporte o CSV.`
    : `${lista.length} venda${lista.length === 1 ? '' : 's'} encontrada${lista.length === 1 ? '' : 's'}`;
  const tbody = document.getElementById('tabelaHistoricoVendas');
  tbody.innerHTML = lista.length ? lista.slice(0, LIMITE_HISTORICO).map(v => `<tr class="${vendaCancelada(v) ? 'venda-cancelada' : ''}">
      <td><b>#${v.numero}</b><small class="history-date">${dataHoraCurta(v.data)}</small></td>
      <td>${esc(v.cliente) || '<span class="hv-muted">Consumidor final</span>'}${v.clienteDoc ? `<small class="history-date">${esc(v.clienteDoc)}</small>` : ''}</td>
      <td class="hv-itens">${esc(v.itens)}</td>
      <td>${formasDaVenda(v).map(f => `<span class="badge b-ok">${esc(f)}</span>`).join(' ')}</td>
      <td>${esc(operadorDaVenda(v))}</td>
      <td>${badgeStatus(v)}${saldoPendente(v) > 0.001 ? `<small class="history-date">em aberto ${moeda(saldoPendente(v))}</small>` : ''}</td>
      <td class="nowrap">${valorVendaHtml(v)}</td>
      <td><button type="button" class="history-receipt-btn" data-numero="${v.numero}">Detalhes</button></td>
    </tr>`).join('')
    : '<tr><td colspan="8" class="history-empty">Nenhuma venda encontrada com esses filtros.</td></tr>';
  tbody.querySelectorAll('.history-receipt-btn').forEach(b => b.addEventListener('click', () => abrirDetalhesVenda(b.dataset.numero)));
}

function limparFiltrosVendas(){
  const p = periodoPadraoVendas();
  document.getElementById('hvBusca').value = '';
  document.getElementById('hvDataIni').value = p.ini;
  document.getElementById('hvDataFim').value = p.fim;
  ['hvForma', 'hvOperador', 'hvStatus'].forEach(id => document.getElementById(id).value = '');
  renderHistoricoVendas();
}

function exportarVendasCSV(){
  const lista = vendasFiltradas();
  if (!lista.length) { avisar('Nenhuma venda para exportar com esses filtros.', true); return; }
  const num = v => Number(v || 0).toFixed(2).replace('.', ',');
  const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [['Venda', 'Data', 'Cliente', 'CPF/CNPJ', 'Itens', 'Pagamento', 'Operador', 'Vendedor', 'Status', 'Total', 'Devolvido', 'Líquido', 'Em aberto']];
  lista.forEach(v => linhas.push([v.numero, new Date(v.data).toLocaleString('pt-BR'), v.cliente || 'Consumidor final', v.clienteDoc || '', v.itens,
    formasDaVenda(v).join(' + '), operadorDaVenda(v), v.vendedor || '', STATUS_VENDA[statusVenda(v)].rotulo,
    num(v.total), num(valorDevolvido(v)), num(valorLiquidoVenda(v)), num(saldoPendente(v))]));
  const csv = '﻿' + linhas.map(l => l.map(cel).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  a.download = `vendas_${document.getElementById('hvDataIni').value || 'inicio'}_${document.getElementById('hvDataFim').value || 'hoje'}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

document.getElementById('formFiltroVendas').addEventListener('submit', e => { e.preventDefault(); renderHistoricoVendas(); });
document.getElementById('btnLimparFiltroVendas').addEventListener('click', limparFiltrosVendas);
document.getElementById('btnExportarVendas').addEventListener('click', exportarVendasCSV);
document.querySelector('#subtabsPDV .stab[data-tab="vendas"]').addEventListener('click', renderHistoricoVendas);
(() => { const p = periodoPadraoVendas(); document.getElementById('hvDataIni').value = p.ini; document.getElementById('hvDataFim').value = p.fim; })();

// ---- Clientes ----
function novoIdCliente(){ return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
let clientes = lsGet('clientes', null);
if (!Array.isArray(clientes)) {
  // Primeira vez: cria os clientes a partir dos nomes já digitados nas vendas e vincula essas vendas
  clientes = [];
  vendasRealizadas.forEach(v => {
    const nome = String(v.cliente || '').trim();
    if (!nome) return;
    let c = clientes.find(x => x.nome.toLowerCase() === nome.toLowerCase());
    if (!c) { c = {id: novoIdCliente(), nome, doc: '', telefone: '', email: '', endereco: '', obs: '', dataCadastro: v.data}; clientes.push(c); }
    v.clienteId = c.id;
  });
  lsSet('clientes', clientes);
  lsSet('vendas', vendasRealizadas);
}

const soDigitos = v => String(v || '').replace(/\D/g, '');
function formatarDoc(v){
  const d = soDigitos(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
}
function formatarTelefone(v){
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
// Validação dos dígitos verificadores de CPF (11) e CNPJ (14)
function docValido(v){
  const d = soDigitos(v);
  if (/^(\d)\1+$/.test(d)) return false;
  if (d.length === 11) {
    const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  if (d.length === 14) {
    const dv = n => { const pesos = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2]; const s = pesos.reduce((a, p, i) => a + Number(d[i]) * p, 0); const r = s % 11; return r < 2 ? 0 : 11 - r; };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
  }
  return false;
}
const emailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function mascarar(id, fn){ const el = document.getElementById(id); el.addEventListener('input', () => { el.value = fn(el.value); }); }
['cliDoc', 'crDoc'].forEach(id => mascarar(id, formatarDoc));
['cliTelefone', 'crTelefone'].forEach(id => mascarar(id, formatarTelefone));

function vendasDoCliente(c){
  return vendasRealizadas.filter(v => v.clienteId ? v.clienteId === c.id : String(v.cliente || '').toLowerCase() === c.nome.toLowerCase());
}
function estatisticasCliente(c){
  const todas = vendasDoCliente(c);
  const vendas = vendasValidas(todas);
  const total = vendas.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const ultima = vendas.reduce((m, v) => (!m || v.data > m ? v.data : m), null);
  // "vendas" (para o histórico) inclui as canceladas, marcadas; os números usam só as válidas
  return {vendas: todas, total, n: vendas.length, ultima, ticket: vendas.length ? total / vendas.length : 0};
}
function salvarClientes(){ lsSet('clientes', clientes); }

// Valida os dados comuns ao formulário completo e ao cadastro rápido
function validarCliente(dados, idAtual){
  if (!dados.nome) return 'Informe o nome do cliente.';
  if (dados.doc && !docValido(dados.doc)) return 'CPF/CNPJ inválido. Confira os números.';
  if (dados.doc && clientes.some(c => c.id !== idAtual && soDigitos(c.doc) === soDigitos(dados.doc))) return 'Já existe um cliente com esse CPF/CNPJ.';
  if (dados.telefone && soDigitos(dados.telefone).length < 10) return 'Telefone incompleto (use DDD + número).';
  if (dados.email && !emailValido(dados.email)) return 'E-mail inválido.';
  return '';
}

function avisarCliente(msg, erro){
  const toast = document.getElementById('toastCliente');
  toast.textContent = msg;
  toast.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  toast.style.display = 'block';
  clearTimeout(avisarCliente.timer);
  avisarCliente.timer = setTimeout(() => toast.style.display = 'none', 3500);
}

// ---- Tela de clientes ----
let clienteEditando = null;
function abrirFormCliente(id){
  const c = id ? clientes.find(x => x.id === id) : null;
  clienteEditando = c ? c.id : null;
  const val = (campo, v) => document.getElementById(campo).value = v || '';
  document.getElementById('formClienteTitulo').textContent = c ? `Editar cliente — ${c.nome}` : 'Novo cliente';
  val('cliNome', c?.nome); val('cliDoc', c?.doc); val('cliTelefone', c?.telefone); val('cliEmail', c?.email);
  val('cliEndereco', c?.endereco); val('cliObs', c?.obs);
  val('cliLimite', c && c.limiteCredito != null ? numBR(c.limiteCredito) : '');
  val('cliDataCadastro', new Date(c ? c.dataCadastro : Date.now()).toLocaleDateString('pt-BR'));
  document.getElementById('cliErro').textContent = '';
  document.getElementById('formCliente').style.display = 'block';
  document.getElementById('formCliente').scrollIntoView({behavior: 'smooth', block: 'start'});
  document.getElementById('cliNome').focus({preventScroll: true});
}
function fecharFormCliente(){ document.getElementById('formCliente').style.display = 'none'; clienteEditando = null; }

function salvarCliente(){
  const v = id => document.getElementById(id).value.trim();
  const dados = {nome: v('cliNome'), doc: v('cliDoc'), telefone: v('cliTelefone'), email: v('cliEmail'), endereco: v('cliEndereco'), obs: v('cliObs'),
    limiteCredito: v('cliLimite') ? Math.round(paraNumero(v('cliLimite')) * 100) / 100 : null};
  const erro = validarCliente(dados, clienteEditando) || (dados.limiteCredito != null && dados.limiteCredito < 0 ? 'O limite de crédito não pode ser negativo.' : '');
  if (erro) { document.getElementById('cliErro').textContent = erro; return; }
  const existente = clientes.find(c => c.id === clienteEditando);
  if (existente) {
    const alteracoes = diferencas(existente, dados, {nome: {nome: 'Nome'}, doc: {nome: 'CPF/CNPJ'}, telefone: {nome: 'Telefone'}, email: {nome: 'E-mail'}, endereco: {nome: 'Endereço'}, obs: {nome: 'Observação'}, limiteCredito: {nome: 'Limite de crédito', moeda: true}});
    if (alteracoes.length) registrarAuditoria('Clientes', `Cliente ${dados.nome} editado`, {alteracoes});
    Object.assign(existente, dados);
  } else {
    clientes.push({id: novoIdCliente(), ...dados, dataCadastro: new Date().toISOString()});
    registrarAuditoria('Clientes', `Cliente ${dados.nome} cadastrado`, {detalhe: [dados.doc, dados.telefone].filter(Boolean).join(' · ')});
  }
  salvarClientes();
  fecharFormCliente();
  avisarCliente(existente ? `Cliente "${dados.nome}" atualizado.` : `Cliente "${dados.nome}" cadastrado.`);
  renderClientes();
  atualizarInfoClienteVenda();
}

function excluirCliente(id){
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  const {n} = estatisticasCliente(c);
  if (!confirm(`Excluir o cliente "${c.nome}"?${n ? `\n\nEle tem ${n} compra(s). As vendas continuam no histórico com o nome, mas sem o vínculo ao cadastro.` : ''}`)) return;
  clientes.splice(clientes.indexOf(c), 1);
  registrarAuditoria('Clientes', `Cliente ${c.nome} excluído`, {detalhe: n ? `${n} compra(s) no histórico` : ''});
  salvarClientes();
  if (clienteVendaId === id) selecionarClienteVenda(null);
  avisarCliente(`Cliente "${c.nome}" excluído.`);
  renderClientes();
}

// Crédito do cliente: quanto deve (vendas a prazo em aberto), limite e quanto ainda pode comprar a prazo
function creditoCliente(c){
  const aberto = Math.round(vendasDoCliente(c).reduce((s, v) => s + saldoPendente(v), 0) * 100) / 100;
  const limite = c.limiteCredito ?? null;
  return {aberto, limite, disponivel: limite == null ? null : Math.max(Math.round((limite - aberto) * 100) / 100, 0)};
}
function htmlCredito(cr){
  if (cr.limite == null && !cr.aberto) return '<span class="hv-muted">—</span>';
  const aberto = cr.aberto > 0.001 ? `<b class="dv-aberto">${moeda(cr.aberto)} em aberto</b>` : '<span>nada em aberto</span>';
  return `${aberto}<small class="history-date">${cr.limite == null ? 'sem limite' : `limite ${moeda(cr.limite)} · disponível ${moeda(cr.disponivel)}`}</small>`;
}

function renderClientes(){
  const busca = document.getElementById('buscaClientes').value.toLowerCase().trim();
  const buscaDig = soDigitos(busca);
  const ordem = document.getElementById('ordemClientes').value;
  const lista = clientes.map(c => ({c, e: estatisticasCliente(c)}))
    .filter(({c}) => !busca || [c.nome, c.email].some(x => String(x || '').toLowerCase().includes(busca)) || (buscaDig && [c.doc, c.telefone].some(x => soDigitos(x).includes(buscaDig))));
  const ord = {
    nome: (a, b) => a.c.nome.localeCompare(b.c.nome, 'pt-BR'),
    total: (a, b) => b.e.total - a.e.total,
    ultima: (a, b) => String(b.e.ultima || '').localeCompare(String(a.e.ultima || '')),
    cadastro: (a, b) => String(b.c.dataCadastro).localeCompare(String(a.c.dataCadastro))
  };
  lista.sort(ord[ordem]);

  // Indicadores
  const trintaDias = Date.now() - 30 * 86400000;
  const todos = clientes.map(c => ({c, e: estatisticasCliente(c)}));
  const top = todos.slice().sort((a, b) => b.e.total - a.e.total)[0];
  document.getElementById('kpiClientesTotal').textContent = clientes.length;
  document.getElementById('kpiClientesAtivos').textContent = todos.filter(x => x.e.ultima && new Date(x.e.ultima).getTime() >= trintaDias).length;
  const identificadas = vendasRealizadas.filter(v => v.clienteId || v.cliente).length;
  document.getElementById('kpiClientesVendasPct').textContent = vendasRealizadas.length ? Math.round((identificadas / vendasRealizadas.length) * 100) + '%' : '0%';
  document.getElementById('kpiClientesTop').textContent = top && top.e.total > 0 ? top.c.nome : '—';

  const tbody = document.getElementById('tabelaClientes');
  tbody.innerHTML = lista.length ? lista.map(({c, e}) => `<tr>
      <td><button type="button" class="cli-nome" data-id="${c.id}" title="Ver histórico do cliente">${esc(c.nome)}</button><small class="history-date">cliente desde ${new Date(c.dataCadastro).toLocaleDateString('pt-BR')}</small></td>
      <td class="nowrap">${esc(c.doc) || '<span class="hv-muted">—</span>'}</td>
      <td><span class="nowrap">${esc(c.telefone) || '—'}</span><small class="history-date">${esc(c.email) || ''}</small></td>
      <td class="cli-endereco">${esc(c.endereco) || '<span class="hv-muted">—</span>'}</td>
      <td class="nowrap"><b>${moeda(e.total)}</b></td>
      <td>${e.n}</td>
      <td class="nowrap">${e.n ? moeda(e.ticket) : '—'}</td>
      <td class="nowrap">${e.ultima ? new Date(e.ultima).toLocaleDateString('pt-BR') : '—'}</td>
      <td class="nowrap">${htmlCredito(creditoCliente(c))}</td>
      <td><div class="row-actions">
        <button type="button" class="hist" data-id="${c.id}" title="Histórico de compras">☰</button>
        <button type="button" class="vend" data-id="${c.id}" title="Nova venda para este cliente">🛒</button>
        <button type="button" class="edit" data-id="${c.id}" title="Editar">✎</button>
        <button type="button" class="del" data-id="${c.id}" title="Excluir">✕</button>
      </div></td></tr>`).join('')
    : `<tr><td colspan="10" class="history-empty">${clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</td></tr>`;
  tbody.querySelectorAll('.hist, .cli-nome').forEach(b => b.addEventListener('click', () => abrirHistoricoCliente(b.dataset.id)));
  tbody.querySelectorAll('.vend').forEach(b => b.addEventListener('click', () => venderParaCliente(b.dataset.id)));
  tbody.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => abrirFormCliente(b.dataset.id)));
  tbody.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => excluirCliente(b.dataset.id)));
}

// Monta o histórico do cliente dentro de um container (usado na janela e em Clientes › Histórico)
function renderHistoricoClienteEm(box, c, aoVender){
  const e = estatisticasCliente(c);
  const cr = creditoCliente(c);
  box.innerHTML = `
    <div class="hc-resumo hc-resumo-6">
      <div><span>Total comprado</span><b>${moeda(e.total)}</b></div>
      <div><span>Compras</span><b>${e.n}</b></div>
      <div><span>Última compra</span><b>${e.ultima ? new Date(e.ultima).toLocaleDateString('pt-BR') : '—'}</b></div>
      <div><span>Ticket médio</span><b>${moeda(e.ticket)}</b></div>
      <div><span>Cliente desde</span><b>${new Date(c.dataCadastro).toLocaleDateString('pt-BR')}</b></div>
      <div class="${cr.aberto > 0.001 ? 'hv-alerta' : ''}"><span>Crédito</span><b>${cr.aberto > 0.001 ? `${moeda(cr.aberto)} em aberto` : 'Nada em aberto'}</b><small>${cr.limite == null ? 'sem limite definido' : `limite ${moeda(cr.limite)} · disponível ${moeda(cr.disponivel)}`}</small></div>
    </div>
    <div class="hc-dados">
      <span><em>CPF/CNPJ</em>${esc(c.doc) || '—'}</span>
      <span><em>Telefone</em>${esc(c.telefone) || '—'}</span>
      <span><em>E-mail</em>${esc(c.email) || '—'}</span>
      <span><em>Endereço</em>${esc(c.endereco) || '—'}</span>
      ${c.obs ? `<span><em>Observação</em>${esc(c.obs)}</span>` : ''}
    </div>
    <div class="stitle">Histórico</div>
    ${e.vendas.length ? `<div class="hc-lista">${e.vendas.slice().reverse().map(v => `
      <button type="button" class="hc-venda ${vendaCancelada(v) ? 'venda-cancelada' : ''}" data-numero="${v.numero}" title="Ver detalhes da venda">
        <b class="hc-num">#${v.numero}</b>
        <span class="hc-data">${dataHoraCurta(v.data)}</span>
        <span class="hc-itens">${esc(v.itens)}</span>
        <span class="hc-status">${badgeStatus(v)}</span>
        <span class="hc-valor">${valorVendaHtml(v)}</span>
      </button>`).join('')}</div>` : '<p class="history-empty">Nenhuma compra registrada para este cliente.</p>'}
    <button type="button" class="btn hc-vender" data-id="${c.id}">🛒 Nova venda para ${esc(c.nome.split(' ')[0])}</button>`;
  box.querySelectorAll('.hc-venda').forEach(b => b.addEventListener('click', () => abrirDetalhesVenda(b.dataset.numero)));
  box.querySelector('.hc-vender').addEventListener('click', () => { if (aoVender) aoVender(); venderParaCliente(c.id); });
}

function abrirHistoricoCliente(id){
  const c = clientes.find(x => x.id === id);
  if (!c) return;
  document.getElementById('historicoClienteTitulo').textContent = c.nome;
  renderHistoricoClienteEm(document.getElementById('historicoClienteConteudo'), c, fecharHistoricoCliente);
  document.getElementById('historicoClienteOverlay').style.display = 'flex';
}

// ---- Clientes › Histórico (tela) ----
function renderClientesHistorico(){
  const sel = document.getElementById('chCliente');
  const atual = sel.value;
  const ordenados = clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  sel.innerHTML = '<option value="">Selecione um cliente...</option>' + ordenados.map(c => {
    const e = estatisticasCliente(c);
    return `<option value="${c.id}">${esc(c.nome)}${c.doc ? ' — ' + esc(c.doc) : ''} (${e.n} compra${e.n === 1 ? '' : 's'})</option>`;
  }).join('');
  if (clientes.some(c => c.id === atual)) sel.value = atual;
  const box = document.getElementById('chConteudo');
  const c = clientes.find(x => x.id === sel.value);
  document.getElementById('chAjuda').style.display = c ? 'none' : '';
  if (c) { renderHistoricoClienteEm(box, c); return; }
  // Sem cliente escolhido: últimas compras de clientes identificados
  const recentes = vendasRealizadas.filter(v => v.clienteId && clientes.some(x => x.id === v.clienteId)).slice(-15).reverse();
  box.innerHTML = `<div class="stitle" style="margin-top:0;">Últimas compras de clientes identificados</div>` + (recentes.length
    ? `<div class="hc-lista">${recentes.map(v => `
      <button type="button" class="hc-venda ch-escolher" data-cliente="${v.clienteId}" title="Ver histórico de ${esc(v.cliente)}">
        <b class="hc-num">#${v.numero}</b>
        <span class="hc-data">${dataHoraCurta(v.data)}</span>
        <span class="hc-itens"><b>${esc(v.cliente)}</b> · ${esc(v.itens)}</span>
        <span class="hc-status">${badgeStatus(v)}</span>
        <span class="hc-valor">${valorVendaHtml(v)}</span>
      </button>`).join('')}</div>`
    : '<p class="history-empty">Nenhuma venda com cliente identificado ainda.</p>');
  box.querySelectorAll('.ch-escolher').forEach(b => b.addEventListener('click', () => { sel.value = b.dataset.cliente; renderClientesHistorico(); }));
}
document.getElementById('chCliente').addEventListener('change', renderClientesHistorico);
document.querySelector('#subtabsPDV .stab[data-tab="clihist"]').addEventListener('click', renderClientesHistorico);
function fecharHistoricoCliente(){ document.getElementById('historicoClienteOverlay').style.display = 'none'; }

function venderParaCliente(id){
  selecionarClienteVenda(id);
  document.querySelector('#subtabsPDV .stab[data-tab="vender"]').click();
  document.getElementById('codigoBarrasPDV').focus();
}

document.getElementById('btnNovoCliente').addEventListener('click', () => abrirFormCliente(null));
document.getElementById('btnCancelarCliente').addEventListener('click', fecharFormCliente);
document.getElementById('btnSalvarCliente').addEventListener('click', salvarCliente);
document.getElementById('buscaClientes').addEventListener('input', renderClientes);
document.getElementById('ordemClientes').addEventListener('change', renderClientes);
document.getElementById('btnFecharHistoricoCliente').addEventListener('click', fecharHistoricoCliente);
document.querySelector('#subtabsPDV .stab[data-tab="clientes"]').addEventListener('click', renderClientes);

// ---- Cliente na venda (lista pesquisável) ----
let clienteVendaId = null;
let comboIndice = -1;
const comboInput = document.getElementById('vendaCliente');
const comboLista = document.getElementById('comboClienteLista');

function clienteDaVenda(){ return clientes.find(c => c.id === clienteVendaId) || null; }

function atualizarInfoClienteVenda(){
  const info = document.getElementById('vendaClienteInfo');
  const c = clienteDaVenda();
  const texto = comboInput.value.trim();
  document.getElementById('comboCliente').classList.toggle('selecionado', !!c);
  if (c) {
    const e = estatisticasCliente(c);
    info.className = 'cliente-info';
    info.textContent = [c.doc || null, e.n ? `${e.n} compra${e.n === 1 ? '' : 's'} · ${moeda(e.total)}` : 'primeira compra', e.ultima ? `última ${new Date(e.ultima).toLocaleDateString('pt-BR')}` : null].filter(Boolean).join(' · ');
  } else if (texto) {
    info.className = 'cliente-info aviso';
    info.textContent = 'Não cadastrado: só o nome vai para a venda.';
  } else {
    info.className = 'cliente-info';
    info.textContent = '';
  }
}

function selecionarClienteVenda(id){
  clienteVendaId = id;
  const c = clienteDaVenda();
  comboInput.value = c ? c.nome : '';
  fecharCombo();
  atualizarInfoClienteVenda();
}

function opcoesCombo(){
  const t = comboInput.value.trim().toLowerCase();
  const dig = soDigitos(t);
  const achados = clientes.filter(c => !t || c.nome.toLowerCase().includes(t) || (dig.length >= 3 && [c.doc, c.telefone].some(x => soDigitos(x).includes(dig))))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 8);
  return [{tipo: 'consumidor'}, ...achados.map(c => ({tipo: 'cliente', c})), {tipo: 'novo', nome: comboInput.value.trim()}];
}

function abrirCombo(){
  const opcoes = opcoesCombo();
  comboIndice = Math.min(Math.max(comboIndice, 0), opcoes.length - 1);
  comboLista.innerHTML = opcoes.map((o, i) => {
    const ativo = i === comboIndice ? ' ativo' : '';
    if (o.tipo === 'consumidor') return `<li role="option" class="combo-op${ativo}" data-i="${i}"><b>Consumidor final</b><small>venda sem identificação</small></li>`;
    if (o.tipo === 'novo') return `<li role="option" class="combo-op combo-novo${ativo}" data-i="${i}">+ Cadastrar ${o.nome ? `"${esc(o.nome)}"` : 'novo cliente'}</li>`;
    return `<li role="option" class="combo-op${ativo}${o.c.id === clienteVendaId ? ' escolhido' : ''}" data-i="${i}"><b>${esc(o.c.nome)}</b><small>${[o.c.doc, o.c.telefone].filter(Boolean).map(esc).join(' · ') || 'sem documento'}</small></li>`;
  }).join('');
  comboLista.querySelectorAll('.combo-op').forEach(li => li.addEventListener('mousedown', e => { e.preventDefault(); escolherOpcaoCombo(opcoes[li.dataset.i]); }));
  comboLista.style.display = 'block';
  comboInput.setAttribute('aria-expanded', 'true');
}
function fecharCombo(){ comboLista.style.display = 'none'; comboInput.setAttribute('aria-expanded', 'false'); comboIndice = -1; }

function escolherOpcaoCombo(o){
  if (o.tipo === 'consumidor') selecionarClienteVenda(null);
  else if (o.tipo === 'cliente') selecionarClienteVenda(o.c.id);
  else abrirClienteRapido(o.nome);
}

comboInput.addEventListener('focus', () => { comboIndice = 0; abrirCombo(); });
comboInput.addEventListener('input', () => { clienteVendaId = null; comboIndice = 1; abrirCombo(); atualizarInfoClienteVenda(); });
comboInput.addEventListener('blur', () => setTimeout(() => {
  fecharCombo();
  // Nome digitado igual a um cliente cadastrado: vincula automaticamente
  if (!clienteVendaId) {
    const iguais = clientes.filter(c => c.nome.toLowerCase() === comboInput.value.trim().toLowerCase());
    if (iguais.length === 1) selecionarClienteVenda(iguais[0].id);
  }
  atualizarInfoClienteVenda();
}, 120));
comboInput.addEventListener('keydown', e => {
  const aberto = comboLista.style.display === 'block';
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!aberto) { comboIndice = 0; abrirCombo(); return; }
    const total = comboLista.children.length;
    comboIndice = (comboIndice + (e.key === 'ArrowDown' ? 1 : -1) + total) % total;
    abrirCombo();
  } else if (e.key === 'Enter' && aberto) {
    e.preventDefault();
    escolherOpcaoCombo(opcoesCombo()[comboIndice]);
  } else if (e.key === 'Escape') {
    fecharCombo();
  }
});
document.getElementById('comboClienteSeta').addEventListener('mousedown', e => {
  e.preventDefault();
  if (comboLista.style.display === 'block') fecharCombo();
  else { comboInput.focus(); comboIndice = 0; abrirCombo(); }
});

// Cadastro rápido direto da venda
function abrirClienteRapido(nome){
  fecharCombo();
  ['crNome', 'crDoc', 'crTelefone', 'crEmail'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('crNome').value = nome || '';
  document.getElementById('crErro').textContent = '';
  document.getElementById('clienteRapidoOverlay').style.display = 'flex';
  document.getElementById(nome ? 'crDoc' : 'crNome').focus();
}
function fecharClienteRapido(){ document.getElementById('clienteRapidoOverlay').style.display = 'none'; }
document.getElementById('btnCancelarClienteRapido').addEventListener('click', fecharClienteRapido);
document.getElementById('btnSalvarClienteRapido').addEventListener('click', () => {
  const v = id => document.getElementById(id).value.trim();
  const dados = {nome: v('crNome'), doc: v('crDoc'), telefone: v('crTelefone'), email: v('crEmail'), endereco: '', obs: ''};
  const erro = validarCliente(dados, null);
  if (erro) { document.getElementById('crErro').textContent = erro; return; }
  const novo = {id: novoIdCliente(), ...dados, dataCadastro: new Date().toISOString()};
  clientes.push(novo);
  registrarAuditoria('Clientes', `Cliente ${novo.nome} cadastrado (cadastro rápido na venda)`, {detalhe: [novo.doc, novo.telefone].filter(Boolean).join(' · ')});
  salvarClientes();
  fecharClienteRapido();
  selecionarClienteVenda(novo.id);
  avisar(`Cliente "${novo.nome}" cadastrado e vinculado à venda.`);
  renderClientes();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('clienteRapidoOverlay').style.display === 'flex') fecharClienteRapido();
  if (document.getElementById('historicoClienteOverlay').style.display === 'flex') fecharHistoricoCliente();
});
['clienteRapidoOverlay', 'historicoClienteOverlay'].forEach(id => document.getElementById(id).addEventListener('click', e => {
  if (e.target.id === id) document.getElementById(id).style.display = 'none';
}));


// ---- Tela de auditoria (Gestão > Auditoria) ----
const MODULOS_AUDITORIA = ['Vendas', 'Caixa', 'Estoque', 'Produtos', 'Clientes', 'Food', 'Financeiro', 'Help Desk', 'Sistema'];
const LIMITE_TELA_AUDITORIA = 500;

function preencherFiltrosAuditoria(){
  const sel = (id, valores) => {
    const el = document.getElementById(id);
    const atual = el.value;
    el.innerHTML = '<option value="">Todos</option>' + valores.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (valores.includes(atual)) el.value = atual;
  };
  sel('auUsuario', [...new Set(auditoria.map(a => a.usuario).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  sel('auModulo', [...new Set([...MODULOS_AUDITORIA, ...auditoria.map(a => a.modulo)])]);
}

function auditoriaFiltrada(){
  const busca = document.getElementById('auBusca').value.trim().toLowerCase().replace(/^#/, '');
  const ini = document.getElementById('auDataIni').value;
  const fim = document.getElementById('auDataFim').value;
  const usuario = document.getElementById('auUsuario').value;
  const modulo = document.getElementById('auModulo').value;
  const tIni = ini ? new Date(ini + 'T00:00:00').getTime() : -Infinity;
  const tFim = fim ? new Date(fim + 'T23:59:59.999').getTime() : Infinity;
  return auditoria.filter(a => {
    const t = new Date(a.data).getTime();
    if (t < tIni || t > tFim) return false;
    if (usuario && a.usuario !== usuario) return false;
    if (modulo && a.modulo !== modulo) return false;
    if (busca) {
      const texto = [a.descricao, a.detalhe, a.usuario, a.modulo, a.ref?.venda, ...(a.alteracoes || []).flatMap(x => [x.campo, x.antes, x.depois])].join(' ').toLowerCase();
      if (!texto.includes(busca)) return false;
    }
    return true;
  }).slice().reverse();
}

function renderAuditoria(){
  preencherFiltrosAuditoria();
  const lista = auditoriaFiltrada();
  document.getElementById('auContagem').textContent = lista.length > LIMITE_TELA_AUDITORIA
    ? `Mostrando os ${LIMITE_TELA_AUDITORIA} registros mais recentes de ${lista.length}. Refine os filtros ou exporte o CSV.`
    : `${lista.length} registro${lista.length === 1 ? '' : 's'}`;
  document.getElementById('auNota').textContent = `Os registros de auditoria não podem ser editados nem apagados pela tela. O sistema guarda os ${LIMITE_AUDITORIA.toLocaleString('pt-BR')} mais recentes (hoje: ${auditoria.length.toLocaleString('pt-BR')}).`;
  let diaAnterior = '';
  document.getElementById('auLista').innerHTML = lista.length ? lista.slice(0, LIMITE_TELA_AUDITORIA).map(a => {
    const d = new Date(a.data);
    const dia = d.toLocaleDateString('pt-BR', {weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'});
    const cabecalho = dia !== diaAnterior ? `<div class="au-dia">${dia.charAt(0).toUpperCase() + dia.slice(1)}</div>` : '';
    diaAnterior = dia;
    return `${cabecalho}<div class="au-item">
      <span class="au-hora">${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
      <span class="au-usuario" title="Usuário">${esc(a.usuario || '—')}</span>
      <span class="badge au-mod au-mod-${String(a.modulo || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}">${esc(a.modulo)}</span>
      <div class="au-desc">
        <b>${esc(a.descricao)}</b>
        ${(a.alteracoes || []).length ? `<div class="au-alts">${a.alteracoes.map(x => `<span><em>${esc(x.campo)}:</em> ${x.antes === '—' ? '' : `<s>${esc(x.antes)}</s> → `}<strong>${esc(x.depois)}</strong></span>`).join('')}</div>` : ''}
        ${a.detalhe ? `<small>${esc(a.detalhe)}</small>` : ''}
      </div>
      ${a.ref?.venda ? `<button type="button" class="history-receipt-btn au-ref" data-venda="${a.ref.venda}">Venda #${a.ref.venda}</button>` : '<span></span>'}
    </div>`;
  }).join('') : '<p class="history-empty">Nenhum registro encontrado com esses filtros.</p>';
  document.querySelectorAll('#auLista .au-ref').forEach(b => b.addEventListener('click', () => abrirDetalhesVenda(b.dataset.venda)));
}

function exportarAuditoriaCSV(){
  const lista = auditoriaFiltrada();
  if (!lista.length) return;
  const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const linhas = [['Data', 'Hora', 'Usuário', 'Módulo', 'Descrição', 'Alterações', 'Detalhe', 'Venda']];
  lista.forEach(a => {
    const d = new Date(a.data);
    linhas.push([d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR'), a.usuario, a.modulo, a.descricao,
      (a.alteracoes || []).map(x => `${x.campo}: ${x.antes} → ${x.depois}`).join(' | '), a.detalhe || '', a.ref?.venda || '']);
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob(['﻿' + linhas.map(l => l.map(cel).join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
  link.download = `auditoria_${document.getElementById('auDataIni').value || 'inicio'}_${document.getElementById('auDataFim').value || 'hoje'}.csv`;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
}

function limparFiltrosAuditoria(){
  const p = periodoPadraoVendas();
  document.getElementById('auBusca').value = '';
  document.getElementById('auDataIni').value = p.ini;
  document.getElementById('auDataFim').value = p.fim;
  ['auUsuario', 'auModulo'].forEach(id => document.getElementById(id).value = '');
  renderAuditoria();
}

document.getElementById('formFiltroAuditoria').addEventListener('submit', e => { e.preventDefault(); renderAuditoria(); });
document.getElementById('btnLimparAuditoria').addEventListener('click', limparFiltrosAuditoria);
document.getElementById('btnExportarAuditoria').addEventListener('click', exportarAuditoriaCSV);
document.querySelector('#subtabsDashboard .stab[data-tab="auditoria"]').addEventListener('click', renderAuditoria);
(() => { const p = periodoPadraoVendas(); document.getElementById('auDataIni').value = p.ini; document.getElementById('auDataFim').value = p.fim; })();


// ---- Estoque › Inventário (contagem geral) ----
// A contagem fica em rascunho (código → quantidade contada) até ser aplicada.
let inventarioRascunho = lsGet('inventarioRascunho', {}) || {};
function salvarRascunhoInventario(){ lsSet('inventarioRascunho', inventarioRascunho); }
function diferencaInventario(p){
  const contado = inventarioRascunho[p.codigo];
  return contado === undefined || contado === '' ? null : Number(contado) - p.estoque;
}

function atualizarResumoInventario(){
  const ativos = produtosPDV.filter(p => p.ativo !== false);
  const contados = ativos.filter(p => diferencaInventario(p) !== null);
  const comDif = contados.filter(p => diferencaInventario(p) !== 0);
  const valor = comDif.reduce((s, p) => s + diferencaInventario(p) * Number(p.custo || 0), 0);
  document.getElementById('invResumo').innerHTML = `
    <div><span>Contados</span><b>${contados.length} de ${ativos.length}</b></div>
    <div><span>Com diferença</span><b class="${comDif.length ? 'mov-neg' : ''}">${comDif.length}</b></div>
    <div><span>Valor da diferença</span><b class="${valor < 0 ? 'mov-neg' : valor > 0 ? 'mov-pos' : ''}">${moedaComSinal(valor)}</b></div>`;
  document.getElementById('btnInvAplicar').disabled = !comDif.length;
  document.getElementById('btnInvAplicar').textContent = comDif.length ? `Aplicar ${comDif.length} ajuste${comDif.length === 1 ? '' : 's'}` : 'Aplicar ajustes';
}

function celulasDiferenca(p){
  const d = diferencaInventario(p);
  if (d === null) return ['<span class="hv-muted">—</span>', '<span class="hv-muted">—</span>'];
  if (d === 0) return ['<span class="badge b-ok">Confere</span>', '—'];
  return [qtdSinal(d), `<span class="${d < 0 ? 'mov-neg' : 'mov-pos'}">${moedaComSinal(d * Number(p.custo || 0))}</span>`];
}

function renderInventario(){
  const busca = document.getElementById('invBusca').value.trim().toLowerCase();
  const soDif = document.getElementById('invSoDiferenca').checked;
  const lista = produtosPDV.filter(p => p.ativo !== false)
    .filter(p => !busca || [p.nome, p.codigo, p.barras].some(x => String(x || '').toLowerCase().includes(busca)))
    .filter(p => !soDif || (diferencaInventario(p) || 0) !== 0)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const tbody = document.getElementById('tabelaInventario');
  tbody.innerHTML = lista.length ? lista.map(p => {
    const [dif, valor] = celulasDiferenca(p);
    const contado = inventarioRascunho[p.codigo];
    return `<tr data-codigo="${esc(p.codigo)}">
      <td><b>${esc(p.nome)}</b></td>
      <td>${esc(p.codigo)}<small class="history-date">${esc(p.barras) || ''}</small></td>
      <td>${p.estoque} ${esc(p.unidade || 'UN')}</td>
      <td><input type="number" class="inv-qtd" min="0" step="1" value="${contado ?? ''}" placeholder="—" aria-label="Quantidade contada de ${esc(p.nome)}"></td>
      <td class="inv-dif">${dif}</td>
      <td class="inv-valor">${valor}</td></tr>`;
  }).join('') : `<tr><td colspan="6" class="history-empty">${soDif ? 'Nenhum item com diferença.' : 'Nenhum produto encontrado.'}</td></tr>`;
  tbody.querySelectorAll('.inv-qtd').forEach((inp, i, todos) => {
    inp.addEventListener('input', () => {
      const tr = inp.closest('tr');
      const p = produtosPDV.find(x => x.codigo === tr.dataset.codigo);
      const v = inp.value.trim();
      if (v === '') delete inventarioRascunho[p.codigo];
      else inventarioRascunho[p.codigo] = Math.max(parseInt(v, 10) || 0, 0);
      salvarRascunhoInventario();
      const [dif, valor] = celulasDiferenca(p);
      tr.querySelector('.inv-dif').innerHTML = dif;
      tr.querySelector('.inv-valor').innerHTML = valor;
      atualizarResumoInventario();
    });
    // Enter vai para o próximo produto (contagem rápida)
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); (todos[i + 1] || inp).focus(); todos[i + 1]?.select(); }
    });
  });
  atualizarResumoInventario();
}

function avisarInventario(msg, erro){
  const t = document.getElementById('toastInventario');
  t.textContent = msg;
  t.className = 'toast ' + (erro ? 'toast-erro' : 'toast-ok');
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 4000);
}

document.getElementById('invBusca').addEventListener('input', renderInventario);
document.getElementById('invSoDiferenca').addEventListener('change', renderInventario);
document.getElementById('btnInvLimpar').addEventListener('click', () => {
  if (!Object.keys(inventarioRascunho).length || !confirm('Apagar toda a contagem digitada?')) return;
  inventarioRascunho = {};
  salvarRascunhoInventario();
  renderInventario();
});
document.getElementById('btnInvAplicar').addEventListener('click', () => {
  const ajustes = produtosPDV.filter(p => p.ativo !== false && (diferencaInventario(p) || 0) !== 0);
  if (!ajustes.length) return;
  const motivo = document.getElementById('invMotivo').value.trim() || 'Inventário';
  const resumo = ajustes.map(p => `${p.nome}: ${p.estoque} → ${inventarioRascunho[p.codigo]}`).join('\n');
  if (!confirm(`Aplicar ${ajustes.length} ajuste(s) de estoque?\n\n${resumo}`)) return;
  ajustes.forEach(p => lancarMovEstoque(p, 'Ajuste', diferencaInventario(p), `Inventário — ${motivo}`));
  registrarAuditoria('Estoque', `Inventário aplicado — ${ajustes.length} ajuste(s)`, {detalhe: `${motivo} · ${Object.keys(inventarioRascunho).length} produto(s) contado(s)`});
  salvarEstoque();
  inventarioRascunho = {};
  salvarRascunhoInventario();
  document.getElementById('invMotivo').value = '';
  renderTelasEstoque();
  renderInventario();
  avisarInventario(`Inventário aplicado: ${ajustes.length} ajuste(s) registrado(s) em Movimentações.`);
});
document.querySelector('#subtabsPDV .stab[data-tab="inventario"]').addEventListener('click', renderInventario);

// ---- Relatórios ----
const RELATORIOS = {
  vendas: {titulo: 'Relatório de vendas', descricao: 'Resumo, formas de pagamento, operadores, vendedores e vendas por dia no período.'},
  produtos: {titulo: 'Relatório de produtos', descricao: 'Quantidade vendida, faturamento, custo e lucro bruto por produto, com curva ABC.'},
  estoque: {titulo: 'Relatório de estoque', descricao: 'Posição atual e valor do estoque, e movimentações por produto no período.'},
  financeiro: {titulo: 'Relatório financeiro', descricao: 'Recebimentos por forma, contas a receber e fechamentos de caixa no período.'}
};
let relatorioCSV = [];

// Tabela de relatório: também guarda as linhas para a exportação em CSV
function tabelaRel(titulo, cabecalho, linhas, rodape){
  relatorioCSV.push([titulo], cabecalho, ...linhas.map(l => l.map(c => c.csv ?? c)), ...(rodape ? [rodape.map(c => c.csv ?? c)] : []), []);
  const cel = c => (c && typeof c === 'object' ? c.html : esc(c));
  return `<div class="card table-scroll rel-bloco">
    <div class="rel-bloco-titulo">${esc(titulo)}</div>
    <table>
      <thead><tr>${cabecalho.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${linhas.length ? linhas.map(l => `<tr>${l.map(c => `<td${c && typeof c === 'object' ? ' class="nowrap"' : ''}>${cel(c)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cabecalho.length}" class="history-empty">Sem dados no período.</td></tr>`}</tbody>
      ${rodape && linhas.length ? `<tfoot><tr>${rodape.map(c => `<td${c && typeof c === 'object' ? ' class="nowrap"' : ''}>${cel(c)}</td>`).join('')}</tr></tfoot>` : ''}
    </table></div>`;
}
const vM = v => ({html: moeda(v), csv: numBR(v)});                      // valor em R$
const vP = v => ({html: numBR(v) + '%', csv: numBR(v)});               // percentual
function cardsRel(itens){
  relatorioCSV.push(['Resumo'], ...itens.map(([k, v]) => [k, typeof v === 'object' ? v.csv : v]), []);
  return `<div class="hv-resumo rel-cards">${itens.map(([k, v, extra]) => `<div${extra ? ` class="${extra}"` : ''}><span>${esc(k)}</span><b>${typeof v === 'object' ? v.html : esc(v)}</b></div>`).join('')}</div>`;
}

function periodoRel(){
  const ini = document.getElementById('relDataIni').value;
  const fim = document.getElementById('relDataFim').value;
  return {ini, fim, tIni: ini ? new Date(ini + 'T00:00:00') : new Date(0), tFim: fim ? new Date(fim + 'T23:59:59.999') : new Date(8.64e15)};
}
function vendasPeriodo(){ const p = periodoRel(); return vendasRealizadas.filter(v => { const t = new Date(v.data); return t >= p.tIni && t <= p.tFim; }); }
function somarPor(lista, chave, valor){
  const m = new Map();
  lista.forEach(x => { const k = chave(x); const o = m.get(k) || {n: 0, v: 0}; o.n++; o.v += valor(x); m.set(k, o); });
  return [...m.entries()].sort((a, b) => b[1].v - a[1].v);
}

function relVendas(){
  const todas = vendasPeriodo();
  const validas = vendasValidas(todas);
  const canceladas = todas.filter(vendaCancelada);
  const bruto = validas.reduce((s, v) => s + (v.subtotal ?? v.total), 0);
  const descontos = validas.reduce((s, v) => s + (v.desconto || 0), 0);
  const devolvido = validas.reduce((s, v) => s + valorDevolvido(v), 0);
  const liquido = validas.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const aReceber = validas.reduce((s, v) => s + saldoPendente(v), 0);
  const formas = somarPor(validas.flatMap(v => pagamentosDaVenda(v).map(p => ({...p, numero: v.numero}))), p => p.forma, p => p.valor);
  const totalFormas = formas.reduce((s, [, o]) => s + o.v, 0);
  const porDia = somarPor(validas, v => new Date(v.data).toISOString().slice(0, 10), valorLiquidoVenda).sort((a, b) => a[0].localeCompare(b[0]));
  return cardsRel([
    ['Vendas', validas.length], ['Valor bruto', vM(bruto)], ['Descontos', vM(descontos)], ['Devoluções', vM(devolvido)],
    ['Líquido', vM(liquido), 'rel-destaque'], ['Ticket médio', vM(validas.length ? liquido / validas.length : 0)],
    ['Canceladas', `${canceladas.length} (${moeda(canceladas.reduce((s, v) => s + v.total, 0))})`], ['A receber (a prazo)', vM(aReceber)]
  ]) + `<div class="rel-grid">` +
    tabelaRel('Por forma de pagamento', ['Forma', 'Lançamentos', 'Valor', '%'],
      formas.map(([f, o]) => [f, o.n, vM(o.v), vP(totalFormas ? o.v / totalFormas * 100 : 0)]), ['Total', formas.reduce((s, [, o]) => s + o.n, 0), vM(totalFormas), '100%']) +
    tabelaRel('Por operador', ['Operador', 'Vendas', 'Líquido', 'Ticket médio'],
      somarPor(validas, operadorDaVenda, valorLiquidoVenda).map(([k, o]) => [k, o.n, vM(o.v), vM(o.v / o.n)])) +
    tabelaRel('Por vendedor', ['Vendedor', 'Vendas', 'Líquido', 'Ticket médio'],
      somarPor(validas, v => v.vendedor || '—', valorLiquidoVenda).map(([k, o]) => [k, o.n, vM(o.v), vM(o.v / o.n)])) +
    `</div>` +
    tabelaRel('Vendas por dia', ['Dia', 'Vendas', 'Líquido', 'Ticket médio'],
      porDia.map(([d, o]) => [dataBR(d), o.n, vM(o.v), vM(o.v / o.n)]), ['Total', validas.length, vM(liquido), vM(validas.length ? liquido / validas.length : 0)]);
}

function relProdutos(){
  const validas = vendasValidas(vendasPeriodo());
  const m = new Map();
  validas.forEach(v => {
    itensDaVenda(v).forEach(i => {
      const k = chaveItem(i);
      const o = m.get(k) || {nome: i.nome, qtd: 0, fat: 0, custo: 0, devol: 0, vendas: new Set()};
      const unit = valorUnitarioLiquido(v, i) ?? (i.preco || 0);
      o.qtd += i.qtd; o.fat += unit * i.qtd; o.custo += custoDoItem(i) * i.qtd; o.vendas.add(v.numero);
      m.set(k, o);
    });
    (v.devolucoes || []).forEach(d => d.itens.forEach(i => {
      const k = chaveItem(i);
      const o = m.get(k) || {nome: i.nome, qtd: 0, fat: 0, custo: 0, devol: 0, vendas: new Set()};
      o.devol += i.qtd; m.set(k, o);
    }));
  });
  const linhas = [...m.values()].sort((a, b) => b.fat - a.fat);
  const totalFat = linhas.reduce((s, o) => s + o.fat, 0);
  const totalCusto = linhas.reduce((s, o) => s + o.custo, 0);
  let acumulado = 0;
  // Curva ABC: A até 80% do faturamento acumulado, B até 95%, C o restante
  const comAbc = linhas.map(o => { acumulado += o.fat; const pct = totalFat ? acumulado / totalFat * 100 : 100; return {...o, abc: pct <= 80.0001 ? 'A' : pct <= 95.0001 ? 'B' : 'C'}; });
  const qtdA = comAbc.filter(o => o.abc === 'A').length;
  return cardsRel([
    ['Produtos vendidos', linhas.length], ['Unidades', linhas.reduce((s, o) => s + o.qtd, 0)], ['Faturamento', vM(totalFat)],
    ['Custo', vM(totalCusto)], ['Lucro bruto', vM(totalFat - totalCusto), 'rel-destaque'], ['Margem bruta', vP(totalFat ? (totalFat - totalCusto) / totalFat * 100 : 0)],
    ['Curva A', `${qtdA} produto${qtdA === 1 ? '' : 's'} = 80% do faturamento`]
  ]) + tabelaRel('Desempenho por produto', ['Produto', 'Curva', 'Qtd. vendida', 'Devolvido', 'Vendas', 'Faturamento', 'Custo', 'Lucro bruto', 'Margem', 'Participação'],
    comAbc.map(o => [o.nome, {html: `<span class="badge rel-abc rel-abc-${o.abc}">${o.abc}</span>`, csv: o.abc}, o.qtd, o.devol || '—', o.vendas.size,
      vM(o.fat), vM(o.custo), vM(o.fat - o.custo), vP(o.fat ? (o.fat - o.custo) / o.fat * 100 : 0), vP(totalFat ? o.fat / totalFat * 100 : 0)]),
    ['Total', '', linhas.reduce((s, o) => s + o.qtd, 0), linhas.reduce((s, o) => s + o.devol, 0), '', vM(totalFat), vM(totalCusto), vM(totalFat - totalCusto), vP(totalFat ? (totalFat - totalCusto) / totalFat * 100 : 0), '100%']);
}

function relEstoque(){
  const p = periodoRel();
  const movs = movEstoque.filter(m => { const t = new Date(m.data); return t >= p.tIni && t <= p.tFim; });
  const soma = (cod, tipo) => movs.filter(m => m.codigo === cod && m.tipo === tipo).reduce((s, m) => s + m.qtd, 0);
  const prods = produtosPDV.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const valorCusto = prods.reduce((s, x) => s + x.estoque * Number(x.custo || 0), 0);
  const valorVenda = prods.reduce((s, x) => s + x.estoque * Number(x.preco || 0), 0);
  const baixos = prods.filter(x => x.ativo !== false && x.estoque <= x.minimo).length;
  return cardsRel([
    ['Produtos', prods.length], ['Unidades em estoque', prods.reduce((s, x) => s + x.estoque, 0)],
    ['Valor em estoque (custo)', vM(valorCusto), 'rel-destaque'], ['Valor em estoque (venda)', vM(valorVenda)],
    ['Abaixo do mínimo', baixos, baixos ? 'hv-alerta' : '']
  ]) + tabelaRel('Posição atual do estoque', ['Produto', 'Código', 'Estoque', 'Mínimo', 'Máximo', 'Custo un.', 'Valor (custo)', 'Preço', 'Valor (venda)', 'Situação'],
    prods.map(x => [x.nome, x.codigo, x.estoque, x.minimo, x.maximo ?? '—', vM(x.custo || 0), vM(x.estoque * (x.custo || 0)), vM(x.preco), vM(x.estoque * x.preco),
      {html: x.ativo === false ? '<span class="badge b-wait">Inativo</span>' : x.estoque <= x.minimo ? '<span class="badge b-wait">⚠ Repor</span>' : '<span class="badge b-ok">OK</span>',
       csv: x.ativo === false ? 'Inativo' : x.estoque <= x.minimo ? 'Repor' : 'OK'}]),
    ['Total', '', prods.reduce((s, x) => s + x.estoque, 0), '', '', '', vM(valorCusto), '', vM(valorVenda), '']) +
  tabelaRel('Movimentações no período', ['Produto', 'Entradas', 'Vendas', 'Devoluções', 'Outras saídas', 'Ajustes', 'Saldo do período'],
    prods.map(x => {
      const e = soma(x.codigo, 'Entrada') + soma(x.codigo, 'Inicial'), v = soma(x.codigo, 'Venda'), d = soma(x.codigo, 'Devolução'), s = soma(x.codigo, 'Saída'), a = soma(x.codigo, 'Ajuste');
      return [x.nome, e, v, d, s, a, {html: qtdSinal(e + v + d + s + a), csv: e + v + d + s + a}];
    }).filter(l => l.slice(1, 6).some(n => n !== 0)));
}

function relFinanceiro(){
  const p = periodoRel();
  const validas = vendasValidas(vendasPeriodo());
  const formas = somarPor(validas.flatMap(v => pagamentosDaVenda(v)), x => x.forma, x => x.valor);
  const totalFormas = formas.reduce((s, [, o]) => s + o.v, 0);
  // Recebimentos de vendas a prazo feitos no período (a venda pode ser de antes)
  const recebs = vendasRealizadas.flatMap(v => (v.recebimentos || []).map(r => ({...r, numero: v.numero, cliente: v.cliente}))).filter(r => { const t = new Date(r.data); return t >= p.tIni && t <= p.tFim; });
  const aReceber = [...somarPor(vendasRealizadas.filter(v => saldoPendente(v) > 0.001), v => v.cliente || '—', saldoPendente)];
  const fechamentos = lsGet('historicoCaixas', []).map((h, i) => ({...h, numero: h.numero || i + 1})).filter(h => { const t = new Date(h.fechamento); return t >= p.tIni && t <= p.tFim; });
  const difTotal = fechamentos.reduce((s, h) => s + (h.diferenca || 0), 0);
  // Receitas e despesas realizadas no período, pelo novo Financeiro
  const lanc = lancamentosFin().filter(l => l.status === 'pago' && new Date(l.pagoEm || l.data) >= p.tIni && new Date(l.pagoEm || l.data) <= p.tFim);
  const receitas = lanc.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0);
  const despesas = lanc.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0);
  return cardsRel([
    ['Entradas por vendas', vM(totalFormas), 'rel-destaque'], ['Recebido de vendas a prazo', vM(recebs.reduce((s, r) => s + r.valor, 0))],
    ['A receber (em aberto)', vM(aReceber.reduce((s, [, o]) => s + o.v, 0)), aReceber.length ? 'hv-alerta' : ''],
    ['Caixas fechados', fechamentos.length], ['Diferenças de caixa', {html: `<span class="${difTotal < 0 ? 'mov-neg' : difTotal > 0 ? 'mov-pos' : ''}">${moedaComSinal(difTotal)}</span>`, csv: numBR(difTotal)}],
    ['Receitas (Financeiro)', vM(receitas)], ['Despesas (Financeiro)', vM(despesas)]
  ]) + `<div class="rel-grid">` +
    tabelaRel('Vendas por forma de pagamento', ['Forma', 'Lançamentos', 'Valor', '%'],
      formas.map(([f, o]) => [f, o.n, vM(o.v), vP(totalFormas ? o.v / totalFormas * 100 : 0)]), ['Total', formas.reduce((s, [, o]) => s + o.n, 0), vM(totalFormas), '100%']) +
    tabelaRel('Contas a receber (vendas a prazo)', ['Cliente', 'Vendas em aberto', 'Em aberto'],
      aReceber.map(([c, o]) => [c, o.n, vM(o.v)]), ['Total', aReceber.reduce((s, [, o]) => s + o.n, 0), vM(aReceber.reduce((s, [, o]) => s + o.v, 0))]) +
    `</div>` +
    tabelaRel('Recebimentos de vendas a prazo no período', ['Data', 'Venda', 'Cliente', 'Forma', 'Valor', 'Usuário'],
      recebs.map(r => [dataHoraCurta(r.data), '#' + r.numero, r.cliente || '—', r.forma, vM(r.valor), r.usuario || '—'])) +
    tabelaRel('Fechamentos de caixa no período', ['Caixa', 'Abertura', 'Fechamento', 'Operador', 'Vendido', 'Esperado', 'Informado', 'Diferença', 'Motivo'],
      fechamentos.map(h => ['#' + h.numero, typeof h.abertura === 'string' ? dataHoraCurta(h.abertura) : '—', dataHoraCurta(h.fechamento), h.usuario || '—',
        vM(h.totalVendido || 0), vM(h.esperado || 0), vM(h.informado || 0),
        {html: `<span class="${h.diferenca < 0 ? 'mov-neg' : h.diferenca > 0 ? 'mov-pos' : ''}">${moedaComSinal(h.diferenca || 0)}</span>`, csv: numBR(h.diferenca || 0)}, h.motivo || '—']));
}

function renderRelatorio(){
  const info = RELATORIOS[relatorioTipo];
  document.getElementById('relTitulo').textContent = info.titulo;
  document.getElementById('relDescricao').textContent = info.descricao;
  const p = periodoRel();
  relatorioCSV = [[info.titulo], ['Período', `${p.ini ? dataBR(p.ini) : 'início'} a ${p.fim ? dataBR(p.fim) : 'hoje'}`], ['Gerado em', new Date().toLocaleString('pt-BR'), 'por', usuarioAtual], []];
  const html = {vendas: relVendas, produtos: relProdutos, estoque: relEstoque, financeiro: relFinanceiro}[relatorioTipo]();
  document.getElementById('relConteudo').innerHTML = `<p class="rel-periodo">Período: <b>${p.ini ? dataBR(p.ini) : 'início'}</b> a <b>${p.fim ? dataBR(p.fim) : 'hoje'}</b>${relatorioTipo === 'estoque' ? ' · a posição do estoque é sempre a atual' : ''} · gerado em ${new Date().toLocaleString('pt-BR')} por ${esc(usuarioAtual)}</p>` + html;
}

document.getElementById('formRelatorio').addEventListener('submit', e => { e.preventDefault(); renderRelatorio(); });
document.getElementById('btnRelExportar').addEventListener('click', () => {
  const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + relatorioCSV.map(l => l.map(cel).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
  a.download = `relatorio_${relatorioTipo}_${document.getElementById('relDataIni').value || 'inicio'}_${document.getElementById('relDataFim').value || 'hoje'}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
});
document.getElementById('btnRelImprimir').addEventListener('click', () => {
  document.body.classList.add('imprimir-relatorio');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('imprimir-relatorio'));
document.querySelector('#subtabsPDV .stab[data-tab="relatorio"]').addEventListener('click', renderRelatorio);
(() => { const p = periodoPadraoVendas(); document.getElementById('relDataIni').value = p.ini; document.getElementById('relDataFim').value = p.fim; })();

// ---- Gestão › Dados do sistema: resumo, backup e limpeza ----
// Preferências de tela e o usuário logado não são "dados do negócio": são mantidos ao limpar.
const CHAVES_PRESERVADAS = ['mga_tema', 'mga_usuario', 'mga_navRecolhidos', 'mga_mgaModulos'];
function chavesDoSistema(){
  const chaves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mga_') && !CHAVES_PRESERVADAS.includes(k)) chaves.push(k);
  }
  return chaves;
}

function renderDadosSistema(){
  let bytes = 0;
  try { chavesDoSistema().forEach(k => { bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; }); } catch (e) { /* storage indisponível */ }
  const itens = [
    ['Vendas', vendasRealizadas.length], ['Produtos', produtosPDV.length], ['Clientes', clientes.length],
    ['Movimentações de estoque', movEstoque.length], ['Fechamentos de caixa', lsGet('historicoCaixas', []).length],
    ['Vales-troca', valesTroca.length], ['Registros de auditoria', auditoria.length],
    ['Espaço usado', bytes > 1048576 ? (bytes / 1048576).toFixed(2).replace('.', ',') + ' MB' : Math.ceil(bytes / 1024) + ' KB']
  ];
  document.getElementById('dadosResumo').innerHTML = itens.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
  document.getElementById('limparDadosLista').innerHTML = itens.slice(0, 7).map(([k, v]) => `<li>${k}: <b>${v}</b></li>`).join('')
    + '<li>Caixa atual, cadastros de Food, Financeiro e Help Desk, contagem de inventário</li>';
}

function exportarBackup(){
  const dados = {};
  chavesDoSistema().forEach(k => { dados[k] = localStorage.getItem(k); });
  const conteudo = JSON.stringify({sistema: 'MGA', versao: 1, geradoEm: new Date().toISOString(), usuario: usuarioAtual, dados}, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([conteudo], {type: 'application/json'}));
  a.download = `mga-backup-${hojeISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  registrarAuditoria('Sistema', 'Backup dos dados exportado', {detalhe: `${Object.keys(dados).length} conjuntos de dados`});
}

function importarBackup(arquivo){
  const leitor = new FileReader();
  leitor.onload = () => {
    let backup;
    try { backup = JSON.parse(leitor.result); } catch (e) { alert('Arquivo inválido: não é um backup do MGA.'); return; }
    const dados = backup && backup.sistema === 'MGA' ? backup.dados : null;
    if (!dados || !Object.keys(dados).every(k => k.startsWith('mga_'))) { alert('Arquivo inválido: não é um backup do MGA.'); return; }
    const quando = backup.geradoEm ? new Date(backup.geradoEm).toLocaleString('pt-BR') : 'data desconhecida';
    if (!confirm(`Restaurar o backup de ${quando}?\n\nOs dados atuais deste navegador serão substituídos pelos do arquivo.`)) return;
    chavesDoSistema().forEach(k => localStorage.removeItem(k));
    Object.entries(dados).forEach(([k, v]) => { if (!CHAVES_PRESERVADAS.includes(k)) localStorage.setItem(k, v); });
    // Registra a restauração na auditoria restaurada
    const aud = JSON.parse(localStorage.getItem('mga_auditoria') || '[]');
    aud.push({data: new Date().toISOString(), usuario: usuarioAtual, modulo: 'Sistema', descricao: 'Backup restaurado', detalhe: `Backup de ${quando}`});
    localStorage.setItem('mga_auditoria', JSON.stringify(aud));
    location.reload();
  };
  leitor.readAsText(arquivo);
}

function abrirLimparDados(){
  renderDadosSistema();
  ['ldConfirma', 'ldSenha'].forEach(id => document.getElementById(id).value = '');
  document.querySelector('input[name="limparModo"][value="demo"]').checked = true;
  document.getElementById('ldErro').textContent = '';
  document.getElementById('btnConfirmarLimparDados').disabled = true;
  document.getElementById('limparDadosOverlay').style.display = 'flex';
  document.getElementById('ldConfirma').focus();
}
function fecharLimparDados(){ document.getElementById('limparDadosOverlay').style.display = 'none'; }

function limparTodosOsDados(){
  if (document.getElementById('ldConfirma').value.trim().toUpperCase() !== 'LIMPAR') { document.getElementById('ldErro').textContent = 'Digite LIMPAR para confirmar.'; return; }
  if (!senhaSupervisorOk(document.getElementById('ldSenha').value)) { document.getElementById('ldErro').textContent = 'Senha do supervisor incorreta.'; return; }
  const vazio = document.querySelector('input[name="limparModo"]:checked').value === 'vazio';
  const resumo = `${vendasRealizadas.length} vendas, ${produtosPDV.length} produtos, ${clientes.length} clientes, ${movEstoque.length} movimentações`;
  try {
    chavesDoSistema().forEach(k => localStorage.removeItem(k));
    // "Totalmente vazio": grava listas vazias para o sistema não recriar os exemplos
    if (vazio) ['produtos', 'food', 'foodCardapio', 'financeiro', 'helpdesk', 'clientes', 'movEstoque'].forEach(k => localStorage.setItem('mga_' + k, '[]'));
    // A nova auditoria começa com o registro de quem limpou
    localStorage.setItem('mga_auditoria', JSON.stringify([{data: new Date().toISOString(), usuario: usuarioAtual, modulo: 'Sistema',
      descricao: `Todos os dados foram apagados (${vazio ? 'recomeço vazio' : 'recomeço com produtos de exemplo'})`, detalhe: `Antes: ${resumo} · autorizado com senha do supervisor`}]));
  } catch (e) {
    document.getElementById('ldErro').textContent = 'Não foi possível limpar o armazenamento do navegador.';
    return;
  }
  location.reload();
}

document.getElementById('btnExportarBackup').addEventListener('click', exportarBackup);
document.getElementById('inputImportarBackup').addEventListener('change', e => { if (e.target.files[0]) importarBackup(e.target.files[0]); e.target.value = ''; });
document.getElementById('btnAbrirLimparDados').addEventListener('click', abrirLimparDados);
document.getElementById('btnCancelarLimparDados').addEventListener('click', fecharLimparDados);
document.getElementById('btnConfirmarLimparDados').addEventListener('click', limparTodosOsDados);
document.getElementById('ldConfirma').addEventListener('input', e => {
  document.getElementById('btnConfirmarLimparDados').disabled = e.target.value.trim().toUpperCase() !== 'LIMPAR';
});
document.getElementById('limparDadosOverlay').addEventListener('click', e => { if (e.target.id === 'limparDadosOverlay') fecharLimparDados(); });
document.querySelector('#subtabsDashboard .stab[data-tab="dados"]').addEventListener('click', renderDadosSistema);

// ---- Dashboard (página inicial) ----
let dashPeriodo = 'hoje';
let dashMetrica = 'faturamento';

// Intervalo do período escolhido e do período anterior equivalente (para comparação)
function intervaloDashboard(p){
  const agora = new Date();
  const inicioHoje = new Date(agora); inicioHoje.setHours(0, 0, 0, 0);
  const dia = 86400000;
  if (p === 'hoje') return {ini: inicioHoje, fim: agora, antIni: new Date(inicioHoje - dia), antFim: new Date(agora - dia), comp: 'ontem'};
  if (p === 'mes') {
    const ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const antIni = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    const antFim = new Date(Math.min(new Date(agora.getFullYear(), agora.getMonth() - 1, agora.getDate(), agora.getHours(), agora.getMinutes()), ini - 1));
    return {ini, fim: agora, antIni, antFim, comp: 'mês anterior'};
  }
  const n = Number(p);
  const ini = new Date(inicioHoje - (n - 1) * dia);
  return {ini, fim: agora, antIni: new Date(ini - n * dia), antFim: new Date(ini - 1), comp: `${n} dias anteriores`};
}
function vendasEntre(ini, fim){
  return vendasValidas(vendasRealizadas).filter(v => { const t = new Date(v.data); return t >= ini && t <= fim; });
}
// Itens efetivamente vendidos (já descontadas as unidades devolvidas)
function itensDaVenda(v){
  const itens = Array.isArray(v.produtos) && v.produtos.length ? v.produtos
    : String(v.itens || '').split(', ').filter(Boolean).map(t => { const m = t.match(/^(\d+)x\s+(.+)$/); return {nome: m ? m[2] : t, qtd: m ? Number(m[1]) : 1}; });
  return itens.map(i => {
    const devolvida = qtdDevolvida(v, i);
    if (!devolvida) return i;
    const qtd = Math.max(i.qtd - devolvida, 0);
    return {...i, qtd, desconto: i.qtd ? (i.desconto || 0) * qtd / i.qtd : 0};
  }).filter(i => i.qtd > 0);
}
function custoDoItem(item){
  if (Number.isFinite(item.custo)) return item.custo;
  const prod = produtosPDV.find(p => (item.codigo && p.codigo === item.codigo) || p.nome === item.nome);
  return prod ? Number(prod.custo || 0) : 0;
}
function pagamentosDaVenda(v){
  return Array.isArray(v.pagamentos) && v.pagamentos.length ? v.pagamentos : [{forma: v.forma, valor: v.total}];
}

// Formatação compacta para eixos (R$ 1,2 mil)
function moedaCurta(v){
  if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1).replace('.', ',') + ' mi';
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + ' mil';
  return 'R$ ' + Math.round(v);
}
function passoRedondo(max, ticks = 4){
  if (max <= 0) return 1;
  const bruto = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  return [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= bruto);
}

// Tooltip compartilhado pelos gráficos
const vizTooltip = document.getElementById('vizTooltip');
function mostrarTooltip(e, html){
  vizTooltip.innerHTML = html;
  vizTooltip.style.display = 'block';
  const r = vizTooltip.getBoundingClientRect();
  let x = e.clientX + 14, y = e.clientY - r.height - 10;
  if (x + r.width > window.innerWidth - 8) x = e.clientX - r.width - 14;
  if (y < 8) y = e.clientY + 16;
  vizTooltip.style.left = x + 'px';
  vizTooltip.style.top = y + 'px';
}
function esconderTooltip(){ vizTooltip.style.display = 'none'; }

// Gráfico de colunas (faturamento ou nº de vendas por hora/dia)
function renderChartVendas(buckets){
  const box = document.getElementById('chartVendas');
  const valor = b => dashMetrica === 'faturamento' ? b.faturamento : b.vendas;
  const total = buckets.reduce((s, b) => s + valor(b), 0);
  if (!total) { box.innerHTML = '<p class="viz-vazio">Nenhuma venda no período.</p>'; return; }

  const W = Math.max(box.clientWidth, 320), H = 240, m = {t: 22, r: 8, b: 28, l: dashMetrica === 'faturamento' ? 62 : 34};
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const maxV = Math.max(...buckets.map(valor));
  const passo = dashMetrica === 'faturamento' ? passoRedondo(maxV) : Math.max(1, Math.ceil(passoRedondo(maxV)));
  const topo = Math.ceil(maxV / passo) * passo || passo;
  const y = v => m.t + ih - (v / topo) * ih;
  const banda = iw / buckets.length;
  const bw = Math.min(24, banda * 0.62);
  const idxMax = buckets.findIndex(b => valor(b) === maxV);
  // Rótulos do eixo X sem sobreposição
  const cada = Math.ceil(buckets.length / Math.max(1, Math.floor(iw / 44)));

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${document.getElementById('chartVendasTitulo').textContent}">`;
  for (let v = 0; v <= topo + 1e-9; v += passo) {
    svg += `<line class="viz-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`;
    svg += `<text class="viz-eixo" x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${dashMetrica === 'faturamento' ? moedaCurta(v) : v}</text>`;
  }
  buckets.forEach((b, i) => {
    const cx = m.l + banda * i + banda / 2;
    const v = valor(b);
    if (v > 0) {
      const h = Math.max(ih - (y(v) - m.t), 2);
      const x0 = cx - bw / 2, y0 = m.t + ih - h, r = Math.min(4, h, bw / 2);
      svg += `<path class="viz-bar" data-i="${i}" d="M${x0},${m.t + ih} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${m.t + ih} Z"/>`;
    }
    if (i % cada === 0) svg += `<text class="viz-eixo" x="${cx}" y="${H - 8}" text-anchor="middle">${b.rotulo}</text>`;
  });
  // Rótulo apenas no maior valor
  const cxMax = m.l + banda * idxMax + banda / 2;
  svg += `<text class="viz-rotulo" x="${cxMax}" y="${y(maxV) - 7}" text-anchor="middle">${dashMetrica === 'faturamento' ? moedaCurta(maxV) : maxV}</text>`;
  svg += `<line class="viz-base" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ih}" y2="${m.t + ih}"/>`;
  // Áreas de hover (a banda inteira, maior que a barra)
  buckets.forEach((_, i) => { svg += `<rect class="viz-hit" data-i="${i}" x="${m.l + banda * i}" y="${m.t}" width="${banda}" height="${ih}"/>`; });
  svg += '</svg>';
  box.innerHTML = svg;

  box.querySelectorAll('.viz-hit').forEach(hit => {
    const i = Number(hit.dataset.i), b = buckets[i];
    const bar = box.querySelector(`.viz-bar[data-i="${i}"]`);
    hit.addEventListener('mousemove', e => {
      mostrarTooltip(e, `<b>${b.titulo}</b><div class="vt-linha"><span>Faturamento</span><b>${moeda(b.faturamento)}</b></div><div class="vt-linha"><span>Vendas</span><b>${b.vendas}</b></div>`);
      if (bar) bar.classList.add('ativo');
    });
    hit.addEventListener('mouseleave', () => { esconderTooltip(); if (bar) bar.classList.remove('ativo'); });
  });

  document.getElementById('tabelaChartVendas').innerHTML = `<table><thead><tr><th>Período</th><th>Faturamento</th><th>Vendas</th></tr></thead><tbody>${
    buckets.filter(b => b.vendas).map(b => `<tr><td>${b.titulo}</td><td>${moeda(b.faturamento)}</td><td>${b.vendas}</td></tr>`).join('')}</tbody></table>`;
}

// Barras horizontais em HTML (uma série: rótulo à esquerda, valor na ponta)
function renderBarrasH(boxId, linhas, vazio){
  const box = document.getElementById(boxId);
  if (!linhas.length) { box.innerHTML = `<p class="viz-vazio">${vazio}</p>`; return; }
  const max = Math.max(...linhas.map(l => l.valor), 1);
  box.innerHTML = `<div class="hbars">${linhas.map((l, i) => `
    <div class="hbar" data-i="${i}">
      <span class="hbar-nome">${esc(l.nome)}</span>
      <span class="hbar-trilho"><span class="hbar-barra" style="width:${Math.max((l.valor / max) * 100, 1.5)}%"></span></span>
      <span class="hbar-valor">${l.texto}</span>
    </div>`).join('')}</div>`;
  box.querySelectorAll('.hbar').forEach(row => {
    const l = linhas[row.dataset.i];
    row.addEventListener('mousemove', e => mostrarTooltip(e, l.tooltip));
    row.addEventListener('mouseleave', esconderTooltip);
  });
}

function renderChartEstoque(){
  const box = document.getElementById('chartEstoque');
  const lista = produtosPDV.filter(p => p.ativo !== false)
    .sort((a, b) => (a.estoque / (a.minimo || 1)) - (b.estoque / (b.minimo || 1))).slice(0, 10);
  if (!lista.length) { box.innerHTML = '<p class="viz-vazio">Nenhum produto ativo.</p>'; return; }
  const escala = Math.max(...lista.map(p => Math.max(p.estoque, p.minimo, p.maximo || 0)), 1);
  box.innerHTML = `<div class="hbars">${lista.map((p, i) => {
    const baixo = p.estoque <= p.minimo;
    return `<div class="hbar ${baixo ? 'hbar-baixo' : ''}" data-i="${i}">
      <span class="hbar-nome">${esc(p.nome)}</span>
      <span class="hbar-trilho">
        <span class="hbar-barra" style="width:${Math.max((p.estoque / escala) * 100, p.estoque ? 1.5 : 0)}%"></span>
        <span class="hbar-min" style="left:${(p.minimo / escala) * 100}%"></span>
      </span>
      <span class="hbar-valor">${p.estoque} ${esc(p.unidade || 'UN')}${baixo ? ' <span class="hbar-status">⚠ repor</span>' : ''}</span>
    </div>`;
  }).join('')}</div>`;
  box.querySelectorAll('.hbar').forEach(row => {
    const p = lista[row.dataset.i];
    row.addEventListener('mousemove', e => mostrarTooltip(e, `<b>${esc(p.nome)}</b><div class="vt-linha"><span>Estoque</span><b>${p.estoque}</b></div><div class="vt-linha"><span>Mínimo</span><b>${p.minimo}</b></div>${p.maximo != null ? `<div class="vt-linha"><span>Máximo</span><b>${p.maximo}</b></div>` : ''}${p.estoque <= p.minimo ? '<div class="vt-alerta">⚠ Abaixo do mínimo</div>' : ''}`));
    row.addEventListener('mouseleave', esconderTooltip);
  });
}

function renderDashboard(){
  const iv = intervaloDashboard(dashPeriodo);
  const vendas = vendasEntre(iv.ini, iv.fim);
  const anteriores = vendasEntre(iv.antIni, iv.antFim);
  const faturamento = vendas.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const fatAnterior = anteriores.reduce((s, v) => s + valorLiquidoVenda(v), 0);
  const itens = vendas.flatMap(itensDaVenda);
  const unidades = itens.reduce((s, i) => s + (i.qtd || 0), 0);
  const custo = itens.reduce((s, i) => s + custoDoItem(i) * (i.qtd || 0), 0);
  const lucro = faturamento - custo;
  const baixos = produtosParaRepor();

  const nomes = {hoje: 'Vendas hoje', '7': 'Vendas (7 dias)', '30': 'Vendas (30 dias)', mes: 'Vendas no mês'};
  document.getElementById('dashUsuario').textContent = usuarioAtual;
  const hojeExtenso = new Date().toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
  document.getElementById('dashData').textContent = hojeExtenso.charAt(0).toUpperCase() + hojeExtenso.slice(1);
  document.getElementById('dkVendasLabel').textContent = nomes[dashPeriodo];
  document.getElementById('dkVendas').textContent = moeda(faturamento);
  const delta = document.getElementById('dkVendasDelta');
  if (fatAnterior > 0) {
    const pct = ((faturamento - fatAnterior) / fatAnterior) * 100;
    delta.className = 'dk-sub ' + (pct >= 0 ? 'dk-up' : 'dk-down');
    delta.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1).replace('.', ',')}% vs ${iv.comp}`;
  } else {
    delta.className = 'dk-sub';
    delta.textContent = faturamento > 0 ? `sem vendas em ${iv.comp} para comparar` : 'nenhuma venda ainda';
  }
  document.getElementById('dkNumVendas').textContent = vendas.length;
  document.getElementById('dkTicket').textContent = moeda(vendas.length ? faturamento / vendas.length : 0);
  // Mostra a conta: faturamento ÷ número de vendas
  document.getElementById('dkTicketSub').textContent = vendas.length
    ? `${moeda(faturamento)} ÷ ${vendas.length} venda${vendas.length === 1 ? '' : 's'}`
    : 'valor médio gasto em cada venda';
  document.getElementById('dkProdutos').textContent = unidades;
  document.getElementById('dkProdutosSub').textContent = `unidades · ${new Set(itens.map(i => i.nome)).size} produtos diferentes`;
  document.getElementById('dkEstoqueBaixo').textContent = baixos.length;
  document.getElementById('dkEstoqueBaixoBox').classList.toggle('tem-alerta', baixos.length > 0);
  document.getElementById('dkEstoqueBaixoSub').textContent = baixos.length ? '⚠ ver reposição →' : 'tudo em dia ✓';
  document.getElementById('dkLucro').textContent = moeda(lucro);
  document.getElementById('dkLucroSub').textContent = faturamento > 0
    ? `margem bruta ${((lucro / faturamento) * 100).toFixed(1).replace('.', ',')}% · custo ${moeda(custo)}`
    : 'vendas − custo dos produtos';
  document.getElementById('dkLucroConta').textContent = `${moeda(faturamento)} − ${moeda(custo)} = ${moeda(lucro)}`;

  // Colunas: por hora (hoje) ou por dia
  let buckets;
  if (dashPeriodo === 'hoje') {
    const horas = vendas.map(v => new Date(v.data).getHours());
    const hIni = Math.min(8, ...horas), hFim = Math.max(20, ...horas);
    buckets = [];
    for (let h = hIni; h <= hFim; h++) buckets.push({rotulo: `${h}h`, titulo: `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59`, faturamento: 0, vendas: 0, h});
    vendas.forEach(v => { const b = buckets.find(x => x.h === new Date(v.data).getHours()); b.faturamento += valorLiquidoVenda(v); b.vendas++; });
  } else {
    buckets = [];
    for (let d = new Date(iv.ini); d <= iv.fim; d.setDate(d.getDate() + 1)) {
      buckets.push({rotulo: d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}), titulo: d.toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit', month: '2-digit'}), chave: d.toDateString(), faturamento: 0, vendas: 0});
    }
    vendas.forEach(v => { const b = buckets.find(x => x.chave === new Date(v.data).toDateString()); if (b) { b.faturamento += valorLiquidoVenda(v); b.vendas++; } });
  }
  document.getElementById('chartVendasTitulo').textContent = (dashMetrica === 'faturamento' ? 'Faturamento' : 'Vendas') + (dashPeriodo === 'hoje' ? ' por hora' : ' por dia');
  document.getElementById('chartVendasSub').textContent = dashMetrica === 'faturamento'
    ? `total ${moeda(faturamento)} em ${vendas.length} venda${vendas.length === 1 ? '' : 's'}`
    : `${vendas.length} venda${vendas.length === 1 ? '' : 's'} · ${moeda(faturamento)}`;
  renderChartVendas(buckets);

  // Produtos mais vendidos (top 5 por unidades)
  const porProduto = {};
  itens.forEach(i => { const p = porProduto[i.nome] || (porProduto[i.nome] = {qtd: 0, valor: 0}); p.qtd += i.qtd || 0; p.valor += (i.preco || 0) * (i.qtd || 0) - (i.desconto || 0); });
  renderBarrasH('chartTopProdutos', Object.entries(porProduto).sort((a, b) => b[1].qtd - a[1].qtd).slice(0, 5).map(([nome, p]) => ({
    nome, valor: p.qtd, texto: `${p.qtd} un.`,
    tooltip: `<b>${esc(nome)}</b><div class="vt-linha"><span>Unidades</span><b>${p.qtd}</b></div><div class="vt-linha"><span>Faturado</span><b>${moeda(p.valor)}</b></div>`
  })), 'Nenhum produto vendido no período.');

  // Formas de pagamento
  const porForma = {};
  vendas.forEach(v => pagamentosDaVenda(v).forEach(p => {
    const f = porForma[p.forma] || (porForma[p.forma] = {valor: 0, vendas: new Set()});
    f.valor += p.valor; f.vendas.add(v.numero);
  }));
  const totalPag = Object.values(porForma).reduce((s, f) => s + f.valor, 0);
  renderBarrasH('chartPagamentos', Object.entries(porForma).sort((a, b) => b[1].valor - a[1].valor).map(([forma, f]) => {
    const pct = totalPag ? (f.valor / totalPag) * 100 : 0;
    return {nome: forma, valor: f.valor, texto: `${moeda(f.valor)} · ${pct.toFixed(0)}%`,
      tooltip: `<b>${esc(forma)}</b><div class="vt-linha"><span>Valor</span><b>${moeda(f.valor)}</b></div><div class="vt-linha"><span>Participação</span><b>${pct.toFixed(1).replace('.', ',')}%</b></div><div class="vt-linha"><span>Vendas</span><b>${f.vendas.size}</b></div>`};
  }), 'Nenhum pagamento no período.');

  renderChartEstoque();
}

function ligarSegmentado(id, attr, aoMudar){
  document.querySelectorAll(`#${id} button`).forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('active', x === b));
    aoMudar(b.dataset[attr]);
  }));
}
ligarSegmentado('dashPeriodo', 'p', v => { dashPeriodo = v; renderDashboard(); });
ligarSegmentado('dashMetrica', 'm', v => { dashMetrica = v; renderDashboard(); });
document.getElementById('btnIrPDV').addEventListener('click', () => {
  document.querySelector('#subtabsPDV .stab[data-tab="vender"]').click();
  document.getElementById('codigoBarrasPDV').focus();
});
document.getElementById('dkEstoqueBaixoBox').addEventListener('click', () => {
  irPara('estoque/entrada');
  if (produtosParaRepor().length) document.getElementById('btnVerReposicao').click();
});
// O gráfico de colunas mede a largura real, então só renderiza com a tela visível
function dashboardVisivel(){ return document.getElementById('pdvDashboard').offsetParent !== null; }
document.querySelector('#subtabsPDV .stab[data-tab="dashboard"]').addEventListener('click', renderDashboard);
let dashResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(dashResizeTimer);
  dashResizeTimer = setTimeout(() => { if (dashboardVisivel()) renderDashboard(); }, 150);
});

// ---- Inicialização (por último, depois que todos os dados/cadastros já existem) ----
initCaixaView();
renderTelasEstoque();
renderSugestoesVenda();
renderHistoricoCaixas();
renderClientes();
renderHistoricoVendas();
renderCarrinho();
renderPagamentos();
atualizarDashboardPDV();
atualizarDashboardFinanceiro();

// =====================================================================
// ---- 🧩 Módulos contratados (MGA PDV · MGA Food · MGA Financeiro) ----
// =====================================================================
const MODULOS_MGA = [
  {id: 'pdv', nome: 'MGA PDV', ic: '🛒', para: 'Para quem precisa vender', itens: ['PDV e caixa', 'Produtos', 'Estoque', 'Clientes', 'Vendas', 'Relatórios']},
  {id: 'food', nome: 'MGA Food', ic: '🍕', para: 'Para quem trabalha com alimentação', itens: ['Pedidos e delivery', 'Fichas técnicas', 'Estoque de ingredientes', 'Plataformas e importação', 'Custos e lucro real', 'Relatórios']},
  {id: 'financeiro', nome: 'MGA Financeiro', ic: '💰', para: 'Para quem quer controlar as finanças', itens: ['Contas a pagar', 'Contas a receber', 'Receitas e despesas', 'Fluxo de caixa', 'Recorrências', 'DRE e integrações']}
];
const PLANOS_SUGERIDOS = [
  {nome: 'Loja de roupas', mods: ['pdv']}, {nome: 'Mercado', mods: ['pdv', 'financeiro']}, {nome: 'Pizzaria', mods: ['food']},
  {nome: 'Pizzaria maior', mods: ['food', 'financeiro']}, {nome: 'Restaurante', mods: ['food', 'financeiro']}, {nome: 'MGA Gestão Completo', mods: ['pdv', 'food', 'financeiro']}
];
let mgaModulos = Object.assign({ativos: {pdv: true, food: true, financeiro: true}, precos: {pdv: 59.90, food: 69.90, financeiro: 49.90}, desconto2: 9.90, desconto3: 29.80}, lsGet('mgaModulos', {}));
function moduloAtivo(id){ return !!(mgaModulos.ativos || {})[id]; }
function precoPlano(ativos, cfg = mgaModulos){
  const ids = MODULOS_MGA.filter(m => ativos[m.id]).map(m => m.id);
  const soma = r2(ids.reduce((s, id) => s + (Number(cfg.precos[id]) || 0), 0));
  const desconto = r2(Math.min(ids.length === 3 ? cfg.desconto3 : ids.length === 2 ? cfg.desconto2 : 0, soma));
  return {ids, soma, desconto, total: r2(soma - desconto)};
}
const nomesPlano = ids => ids.map(id => MODULOS_MGA.find(m => m.id === id).nome).join(' + ') || 'nenhum módulo';
function aplicarModulos(){
  document.querySelectorAll('#sidebar [data-modulo]').forEach(el => { el.hidden = !moduloAtivo(el.dataset.modulo); });
  // Tela aberta de um módulo que foi desativado → volta para o início
  const btn = rotaAtual && document.querySelector(`#sidebar [data-rota="${rotaAtual}"]`);
  if (btn && btn.closest('[data-modulo]')?.hidden) abrirBoasVindas();
}
let modRascunho = null;
function renderModulos(){
  if (!modRascunho) modRascunho = JSON.parse(JSON.stringify(mgaModulos));
  const r = modRascunho, p = precoPlano(r.ativos, r), atual = precoPlano(mgaModulos.ativos);
  const mudou = JSON.stringify(r) !== JSON.stringify(mgaModulos);
  document.getElementById('modPlano').innerHTML = `
    <div><span class="mod-rotulo">${mudou ? 'Novo plano (não salvo)' : 'Plano atual'}</span><b class="mod-nome">${nomesPlano(p.ids)}</b>
      ${p.desconto ? `<small>Soma dos módulos ${moeda(p.soma)} · desconto de combinação ${moeda(p.desconto)}</small>` : '<small>Sem desconto de combinação</small>'}</div>
    <div class="mod-total"><b>${moeda(p.total)}</b><span>/mês</span>${mudou ? `<small>hoje: ${moeda(atual.total)}/mês</small>` : ''}</div>`;
  document.getElementById('modCards').innerHTML = MODULOS_MGA.map(m => {
    const on = !!r.ativos[m.id];
    return `<div class="card mod-card ${on ? 'on' : ''}">
      <div class="mod-card-topo"><span class="mod-ic">${m.ic}</span><div><b>${m.nome}</b><small>${m.para}</small></div></div>
      <div class="mod-status">${on ? '🟢 Ativo' : '⚪ Não contratado'} · <b>${moeda(r.precos[m.id])}</b>/mês</div>
      <ul>${m.itens.map(x => `<li>${x}</li>`).join('')}</ul>
      <button type="button" class="btn ${on ? 'btn-ghost' : ''} mod-toggle" data-id="${m.id}">${on ? 'Desativar' : 'Ativar'}</button>
    </div>`;
  }).join('');
  document.querySelectorAll('#modCards .mod-toggle').forEach(b => b.addEventListener('click', () => { r.ativos[b.dataset.id] = !r.ativos[b.dataset.id]; renderModulos(); }));
  document.getElementById('modSugestoes').innerHTML = PLANOS_SUGERIDOS.map((s, k) => {
    const at = Object.fromEntries(MODULOS_MGA.map(m => [m.id, s.mods.includes(m.id)]));
    const igual = MODULOS_MGA.every(m => !!r.ativos[m.id] === at[m.id]);
    return `<button type="button" class="mod-sug ${igual ? 'active' : ''}" data-k="${k}"><b>${s.nome}</b><span>${nomesPlano(s.mods)}</span><small>${moeda(precoPlano(at, r).total)}/mês</small></button>`;
  }).join('');
  document.querySelectorAll('#modSugestoes .mod-sug').forEach(b => b.addEventListener('click', () => {
    const s = PLANOS_SUGERIDOS[b.dataset.k];
    MODULOS_MGA.forEach(m => { r.ativos[m.id] = s.mods.includes(m.id); });
    renderModulos();
  }));
  const campo = (id, rotulo, v) => `<div class="field"><label for="${id}">${rotulo}</label><input type="text" id="${id}" inputmode="decimal" value="${numBR(v)}"></div>`;
  document.getElementById('modPrecos').innerHTML = MODULOS_MGA.map(m => campo('modPreco_' + m.id, `${m.nome} (R$/mês)`, r.precos[m.id])).join('')
    + campo('modDesc2', 'Desconto com 2 módulos (R$)', r.desconto2) + campo('modDesc3', 'Desconto com os 3 módulos (R$)', r.desconto3);
  document.querySelectorAll('#modPrecos input').forEach(inp => inp.addEventListener('change', () => {
    const v = Math.max(r2(lerValorBR(inp.value)), 0);
    if (inp.id === 'modDesc2') r.desconto2 = v; else if (inp.id === 'modDesc3') r.desconto3 = v; else r.precos[inp.id.replace('modPreco_', '')] = v;
    renderModulos();
  }));
}
document.getElementById('btnModSalvar').addEventListener('click', () => {
  const erro = m => { document.getElementById('modErro').textContent = m; };
  const r = modRascunho;
  if (!r || !MODULOS_MGA.some(m => r.ativos[m.id])) return erro('Deixe pelo menos um módulo ativo.');
  if (!senhaSupervisorOk(document.getElementById('modSenha').value)) return erro('Senha do administrador incorreta.');
  erro('');
  const antes = precoPlano(mgaModulos.ativos), depois = precoPlano(r.ativos, r);
  const alteracoes = [];
  if (nomesPlano(antes.ids) !== nomesPlano(depois.ids)) alteracoes.push({campo: 'Módulos ativos', antes: nomesPlano(antes.ids), depois: nomesPlano(depois.ids)});
  if (antes.total !== depois.total) alteracoes.push({campo: 'Mensalidade', antes: moeda(antes.total), depois: moeda(depois.total)});
  mgaModulos = JSON.parse(JSON.stringify(r));
  lsSet('mgaModulos', mgaModulos);
  registrarAuditoria('Sistema', `Plano alterado: ${nomesPlano(depois.ids)} — ${moeda(depois.total)}/mês`, {alteracoes});
  document.getElementById('modSenha').value = '';
  aplicarModulos();
  renderModulos();
  avisarFood('toastMod', `Plano salvo: ${nomesPlano(depois.ids)} · ${moeda(depois.total)}/mês. O menu já mostra só os módulos ativos.`);
});

// =====================================================================
// ---- 💰 MGA Financeiro ----
// Lançamentos manuais ficam guardados; os que vêm do PDV, do Food e do estoque são
// montados a partir da origem (com "origem" visível), então não há como contar duas vezes.
// =====================================================================
const CATEGORIAS_FIN_PADRAO = {
  receita: ['Vendas', 'Serviços', 'Outras receitas'],
  despesa: ['Aluguel', 'Energia elétrica', 'Água', 'Internet', 'Salários', 'Impostos', 'Fornecedores', 'Marketing', 'Manutenção', 'Taxas', 'Taxas de plataformas', 'Devoluções', 'Outros']
};
const INTEGRACOES_PADRAO = {pdvVendas: true, foodVendas: true, foodTaxas: true, compras: true};
let finLancamentos = lsGet('finLancamentos', []);
let finRecorrencias = lsGet('finRecorrencias', []);
let finAjustes = lsGet('finAjustes', {}); // status de lançamentos automáticos (ex.: compra marcada como a pagar)
let finConfig = Object.assign({saldoInicial: 0, saldoData: hojeISO().slice(0, 8) + '01', categorias: JSON.parse(JSON.stringify(CATEGORIAS_FIN_PADRAO))}, lsGet('finConfig', {}));
finConfig.integracoes = Object.assign({}, INTEGRACOES_PADRAO, finConfig.integracoes || {});
let finTipoAtual = 'receita';
const idFin = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const dataBRfin = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const inicioDoDia = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const somaDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const isoMeioDia = iso => iso ? iso + 'T12:00:00' : null;
function salvarFin(){
  lsSet('finLancamentos', finLancamentos); lsSet('finRecorrencias', finRecorrencias);
  lsSet('finAjustes', finAjustes); lsSet('finConfig', finConfig);
  atualizarBadgesFin();
}

// Lançamentos automáticos (derivados das vendas, pedidos e compras)
function lancamentosAutomaticos(){
  const out = [], integ = finConfig.integracoes;
  const ajustar = l => { const a = finAjustes[l.key]; return a ? Object.assign(l, a) : l; };
  if (moduloAtivo('pdv') && integ.pdvVendas) vendasRealizadas.forEach(v => {
    if (vendaCancelada(v)) return;
    const origem = {modulo: 'PDV', rotulo: `Venda #${v.numero}`, venda: v.numero};
    pagamentosDaVenda(v).forEach((p, k) => {
      // A prazo vira conta a receber; vale-troca não é dinheiro novo
      if (p.forma === 'A prazo' || p.vale || p.forma === 'Vale-troca') return;
      out.push({key: `pdv:${v.numero}:${k}`, tipo: 'receita', descricao: `Venda PDV #${v.numero}`, valor: r2(p.valor), categoria: 'Vendas', data: v.data, pagoEm: v.data, status: 'pago', forma: p.forma, pessoa: v.cliente || '', origem, auto: true});
    });
    (v.recebimentos || []).forEach((rc, k) => out.push({key: `pdvrec:${v.numero}:${k}`, tipo: 'receita', descricao: `Recebimento da venda a prazo #${v.numero}`, valor: r2(rc.valor), categoria: 'Vendas', data: rc.data, pagoEm: rc.data, status: 'pago', forma: rc.forma, pessoa: v.cliente || '', origem, auto: true}));
    const pend = saldoPendente(v);
    if (pend > 0.001) out.push({key: `pdvprazo:${v.numero}`, tipo: 'receita', descricao: `Venda a prazo #${v.numero}`, valor: pend, categoria: 'Vendas', data: v.data, vencimento: somaDias(v.data, 30).toISOString(), pagoEm: null, status: 'pendente', forma: 'A prazo', pessoa: v.cliente || '', origem: {...origem, receberNoPdv: true}, auto: true});
    (v.devolucoes || []).forEach((dv, k) => {
      if (dv.tipo === 'vale') return; // devolução em vale-troca não tira dinheiro do caixa
      out.push({key: `pdvdev:${v.numero}:${k}`, tipo: 'despesa', descricao: `Devolução da venda #${v.numero}`, valor: r2(dv.valor), categoria: 'Devoluções', data: dv.data, pagoEm: dv.data, status: 'pago', forma: dv.forma, pessoa: v.cliente || '', origem, auto: true});
    });
  });
  if (moduloAtivo('food')) foodPedidos.forEach(p => {
    if (p.status === 'cancelado') return;
    const origem = {modulo: 'Food', rotulo: `Pedido #${p.numero}${p.numeroExterno ? ` · ${p.canalNome} #${p.numeroExterno}` : ''}`, pedido: p.numero};
    if (integ.foodVendas && p.calc.receita > 0) out.push({key: `food:${p.numero}`, tipo: 'receita', descricao: `Venda ${p.canalNome} · pedido #${p.numero}`, valor: r2(p.calc.receita), categoria: 'Vendas', data: p.data, pagoEm: p.data, status: 'pago', forma: p.canalNome, pessoa: p.cliente || '', origem, auto: true});
    if (integ.foodTaxas && p.calc.taxa > 0) out.push({key: `foodtaxa:${p.numero}`, tipo: 'despesa', descricao: `Taxa ${p.canalNome} · pedido #${p.numero}`, valor: r2(p.calc.taxa), categoria: 'Taxas de plataformas', data: p.data, pagoEm: p.data, status: 'pago', forma: p.canalNome, pessoa: p.canalNome, origem, auto: true});
  });
  if (integ.compras) {
    if (moduloAtivo('pdv')) movEstoque.forEach(m => {
      if (m.tipo !== 'Entrada' || !(Number(m.custoUnit) > 0)) return;
      const data = /^\d{4}-\d{2}-\d{2}$/.test(m.dataDoc || '') ? isoMeioDia(m.dataDoc) : m.data;
      out.push(ajustar({key: `compra:${m.data}:${m.codigo}`, tipo: 'despesa', descricao: `Compra: ${m.qtd}x ${m.produto}`, valor: r2(m.qtd * m.custoUnit), categoria: 'Fornecedores', data, pagoEm: data, status: 'pago', forma: '—', pessoa: m.fornecedor || '', origem: {modulo: 'Estoque', rotulo: 'Entrada de estoque', rota: 'estoque/movimentacoes'}, auto: true, ajustavel: true}));
    });
    if (moduloAtivo('food')) foodMovEstoque.forEach(m => {
      if (m.tipo !== 'Entrada' || !(m.ref && Number(m.ref.custoUnit) > 0)) return;
      out.push(ajustar({key: `comprafood:${m.id}`, tipo: 'despesa', descricao: `Compra: ${fmtQtdIns(m.qtd, m.unidade)} de ${m.nome}`, valor: r2(m.qtd * m.ref.custoUnit), categoria: 'Fornecedores', data: m.data, pagoEm: m.data, status: 'pago', forma: '—', pessoa: m.motivo && m.motivo !== 'Compra' ? m.motivo : '', origem: {modulo: 'Estoque', rotulo: 'Estoque do Food', rota: 'food/estoque'}, auto: true, ajustavel: true}));
    });
  }
  return out;
}
function lancamentosFin(){
  const manuais = finLancamentos.map(l => ({...l, key: 'man:' + l.id, auto: false,
    origem: l.recorrenciaId ? {modulo: 'Recorrência', rotulo: 'Recorrência'} : {modulo: 'Manual', rotulo: 'Manual'}}));
  return manuais.concat(lancamentosAutomaticos());
}
const dataCaixa = l => l.status === 'pago' ? (l.pagoEm || l.data) : (l.vencimento || l.data);
const atrasado = l => l.status === 'pendente' && new Date(l.vencimento || l.data) < inicioDoDia();
function badgeStatusFin(l){
  if (l.status === 'pago') return `<span class="badge b-ok">${l.tipo === 'receita' ? 'Recebido' : 'Pago'}</span>`;
  return atrasado(l) ? '<span class="badge mt-saida">Atrasado</span>' : '<span class="badge b-wait">Pendente</span>';
}
const CLASSE_ORIGEM = {PDV: 'fo-pdv', Food: 'fo-food', Estoque: 'fo-estoque', Recorrência: 'fo-rec', Manual: 'fo-manual'};
const badgeOrigem = l => `<span class="badge fin-orig ${CLASSE_ORIGEM[l.origem.modulo] || ''}" title="Origem do lançamento">${l.origem.modulo === 'Manual' ? 'Manual' : `${esc(l.origem.modulo)}${l.origem.rotulo && l.origem.rotulo !== l.origem.modulo ? ' · ' + esc(l.origem.rotulo) : ''}`}</span>`;
function pendentesFin(tipo){ return lancamentosFin().filter(l => l.status === 'pendente' && (!tipo || l.tipo === tipo)); }
function atualizarBadgesFin(){
  const fimHoje = somaDias(inicioDoDia(), 1);
  const n = pendentesFin('despesa').filter(l => new Date(l.vencimento || l.data) < fimHoje).length;
  ['navBadgePagar', 'navBadgeFin'].forEach(id => { const b = document.getElementById(id); if (b) { b.textContent = n || ''; b.title = n ? `${n} conta(s) a pagar vencendo hoje ou atrasada(s)` : ''; } });
}
function cardFinBoasVindas(){
  const fimHoje = somaDias(inicioDoDia(), 1);
  const venc = pendentesFin('despesa').filter(l => new Date(l.vencimento || l.data) < somaDias(fimHoje, 7));
  const total = venc.reduce((s, l) => s + l.valor, 0), atras = venc.filter(atrasado).length;
  return `<button type="button" class="bv-card" data-ir="fin/pagar"><span>Contas a pagar (7 dias)</span><b>${moeda(total)}</b><small>${venc.length ? `${plural(venc.length, 'conta', 'contas')}${atras ? ` · ${atras} atrasada${atras === 1 ? '' : 's'}` : ''}` : 'nada vencendo'}</small></button>`;
}
function verOrigemFin(l){
  if (l.origem.venda) { irPara('pdv/vendas'); abrirDetalhesVenda(l.origem.venda); }
  else if (l.origem.pedido) mostrarLucroPedidoFood(l.origem.pedido);
  else if (l.origem.rota) irPara(l.origem.rota);
}
// Pagar / receber
function baixarLancamentoFin(key){
  const l = lancamentosFin().find(x => x.key === key);
  if (!l) return;
  if (l.origem.receberNoPdv) { verOrigemFin(l); return; } // venda a prazo: o recebimento é feito na venda (entra no caixa)
  const agora = new Date().toISOString();
  if (!l.auto) {
    const m = finLancamentos.find(x => 'man:' + x.id === key);
    m.status = 'pago'; m.pagoEm = agora;
  } else if (l.ajustavel) finAjustes[key] = {status: 'pago', pagoEm: agora, vencimento: l.vencimento || null};
  registrarAuditoria('Financeiro', `${l.tipo === 'receita' ? 'Recebido' : 'Pago'}: ${l.descricao} — ${moeda(l.valor)}`, {detalhe: `${l.pessoa ? l.pessoa + ' · ' : ''}vencimento ${dataBRfin(l.vencimento)}`});
  salvarFin();
}
// Compra do estoque (automática) que ainda não foi paga: vira conta a pagar
function compraAPagar(key){
  const l = lancamentosFin().find(x => x.key === key);
  if (!l || !l.ajustavel) return;
  const padrao = somaDias(l.data, 30).toLocaleDateString('pt-BR');
  const txt = prompt(`Vencimento desta compra (dd/mm/aaaa):\n${l.descricao} — ${moeda(l.valor)}`, padrao);
  if (txt === null) return;
  const m = String(txt).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) { alert('Data inválida. Use dd/mm/aaaa.'); return; }
  const venc = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12);
  finAjustes[key] = {status: 'pendente', pagoEm: null, vencimento: venc.toISOString()};
  registrarAuditoria('Financeiro', `Compra lançada em contas a pagar: ${l.descricao} — ${moeda(l.valor)}`, {detalhe: `Vencimento ${venc.toLocaleDateString('pt-BR')}`});
  salvarFin();
  RENDER_FIN.lista();
}

// ---- Dashboard ----
let fdPeriodo = 'mes';
function intervaloFin(p){
  const h = new Date();
  if (p === 'anterior') return {ini: new Date(h.getFullYear(), h.getMonth() - 1, 1), fim: new Date(h.getFullYear(), h.getMonth(), 0, 23, 59, 59, 999)};
  if (p === '30') return {ini: somaDias(inicioDoDia(), -29), fim: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23, 59, 59, 999)};
  if (p === 'ano') return {ini: new Date(h.getFullYear(), 0, 1), fim: new Date(h.getFullYear(), 11, 31, 23, 59, 59, 999)};
  return {ini: new Date(h.getFullYear(), h.getMonth(), 1), fim: new Date(h.getFullYear(), h.getMonth() + 1, 0, 23, 59, 59, 999)};
}
const noIntervalo = (d, {ini, fim}) => { const t = new Date(d); return t >= ini && t <= fim; };
const somaValor = lista => r2(lista.reduce((s, l) => s + l.valor, 0));
function saldoAtualFin(todos = lancamentosFin()){
  const ini = new Date(finConfig.saldoData + 'T00:00:00'), agora = new Date();
  return r2(todos.filter(l => l.status === 'pago' && new Date(l.pagoEm || l.data) >= ini && new Date(l.pagoEm || l.data) <= agora)
    .reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), Number(finConfig.saldoInicial) || 0));
}
function agruparTabela(lista, chave, total){
  const m = new Map();
  lista.forEach(l => { const k = chave(l); const o = m.get(k) || {n: 0, v: 0}; o.n++; o.v += l.valor; m.set(k, o); });
  return [...m.entries()].sort((a, b) => b[1].v - a[1].v).map(([k, o]) => `<tr><td>${esc(k)}</td><td>${o.n}</td><td class="nowrap">${moeda(o.v)}</td><td class="nowrap">${pctBR(total ? o.v / total * 100 : 0)}</td></tr>`).join('');
}
function renderFinDashboard(){
  const todos = lancamentosFin(), per = intervaloFin(fdPeriodo);
  const realizados = todos.filter(l => l.status === 'pago' && noIntervalo(l.pagoEm || l.data, per));
  const rec = realizados.filter(l => l.tipo === 'receita'), desp = realizados.filter(l => l.tipo === 'despesa');
  const vr = somaValor(rec), vd = somaValor(desp), resultado = r2(vr - vd);
  const pr = todos.filter(l => l.status === 'pendente' && l.tipo === 'receita'), pp = todos.filter(l => l.status === 'pendente' && l.tipo === 'despesa');
  const atrR = pr.filter(atrasado), atrP = pp.filter(atrasado);
  document.getElementById('fdSub').textContent = `${dataBRfin(per.ini)} a ${dataBRfin(per.fim)} · realizado (recebido e pago) no período`;
  document.getElementById('fdKpis').innerHTML = `
    <div><span>Receitas</span><b>${moeda(vr)}</b><small>${plural(rec.length, 'lançamento', 'lançamentos')}</small></div>
    <div><span>Despesas</span><b>${moeda(vd)}</b><small>${plural(desp.length, 'lançamento', 'lançamentos')}</small></div>
    <div class="fp-lucro lc-bg-${resultado >= 0 ? 'verde' : 'vermelho'}"><span>Resultado</span><b>${moeda(resultado)}</b><small>receitas − despesas</small></div>
    <div><span>A receber</span><b>${moeda(somaValor(pr))}</b><small>${atrR.length ? `${atrR.length} atrasada${atrR.length === 1 ? '' : 's'} · ${moeda(somaValor(atrR))}` : plural(pr.length, 'conta em aberto', 'contas em aberto')}</small></div>
    <div><span>A pagar</span><b>${moeda(somaValor(pp))}</b><small>${atrP.length ? `${atrP.length} atrasada${atrP.length === 1 ? '' : 's'} · ${moeda(somaValor(atrP))}` : plural(pp.length, 'conta em aberto', 'contas em aberto')}</small></div>
    <div><span>Saldo atual</span><b>${moeda(saldoAtualFin(todos))}</b><small>caixa e bancos (saldo inicial + realizado)</small></div>`;
  // Fluxo de caixa por dia (realizado)
  const dias = new Map();
  realizados.forEach(l => { const k = chaveDiaLocal(l.pagoEm || l.data); const o = dias.get(k) || {e: 0, s: 0}; if (l.tipo === 'receita') o.e += l.valor; else o.s += l.valor; dias.set(k, o); });
  const linhas = [...dias.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-31);
  const max = Math.max(...linhas.map(([, o]) => Math.max(o.e, o.s)), 1);
  document.getElementById('fdFluxo').innerHTML = linhas.length ? linhas.map(([k, o]) => {
    const liq = o.e - o.s;
    return `<div class="fd-dia"><span class="fd-data">${k.slice(8, 10)}/${k.slice(5, 7)}</span>
      <div class="fd-barras"><span class="fd-e" style="width:${o.e / max * 100}%"></span><span class="fd-s" style="width:${o.s / max * 100}%"></span></div>
      <b class="${liq < 0 ? 'mov-neg' : 'mov-pos'}">${liq < 0 ? '− ' : '+ '}${moeda(Math.abs(liq))}</b></div>`;
  }).join('') + '<div class="fd-legenda"><span class="fd-e"></span> entradas <span class="fd-s"></span> saídas</div>'
    : '<p class="empty-msg">Nenhuma entrada ou saída no período.</p>';
  // Vencimentos: atrasados e próximos 7 dias
  const limite = somaDias(inicioDoDia(), 8);
  const venc = todos.filter(l => l.status === 'pendente' && new Date(l.vencimento || l.data) < limite).sort((a, b) => new Date(a.vencimento || a.data) - new Date(b.vencimento || b.data));
  document.getElementById('fdVenc').innerHTML = venc.length ? venc.slice(0, 12).map(l => `<tr class="${atrasado(l) ? 'fin-atrasado' : ''}">
      <td class="nowrap">${dataBRfin(l.vencimento || l.data)}${atrasado(l) ? ' <span class="badge mt-saida">Atrasado</span>' : ''}</td><td>${esc(l.descricao)}${l.pessoa ? `<small class="history-date">${esc(l.pessoa)}</small>` : ''}</td>
      <td>${l.tipo === 'receita' ? 'A receber' : 'A pagar'}</td><td class="nowrap ${l.tipo === 'despesa' ? 'mov-neg' : ''}">${moeda(l.valor)}</td></tr>`).join('')
    : '<tr><td colspan="4" class="history-empty">Nada vencendo nos próximos 7 dias.</td></tr>';
  document.getElementById('fdOrigens').innerHTML = rec.length ? agruparTabela(rec, l => l.origem.modulo === 'Recorrência' ? 'Manual (recorrência)' : l.origem.modulo, vr) : '<tr><td colspan="4" class="history-empty">Sem receitas no período.</td></tr>';
  document.getElementById('fdCategorias').innerHTML = desp.length ? agruparTabela(desp, l => l.categoria || 'Sem categoria', vd) : '<tr><td colspan="4" class="history-empty">Sem despesas no período.</td></tr>';
}
document.querySelectorAll('#fdPeriodo button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#fdPeriodo button').forEach(x => x.classList.toggle('active', x === b));
  fdPeriodo = b.dataset.p;
  renderFinDashboard();
}));
document.querySelectorAll('#finDashboard [data-novo]').forEach(b => b.addEventListener('click', () => setTimeout(() => abrirFormFin(null))));

// ---- Receitas / Despesas ----
let flEditando = null;
function categoriasFin(tipo){ return finConfig.categorias[tipo] || []; }
function renderFinLista(){
  const tipo = finTipoAtual, rec = tipo === 'receita';
  document.getElementById('flTitulo').textContent = rec ? '📥 Receitas' : '📤 Despesas';
  document.getElementById('btnFlNovo').textContent = rec ? '+ Nova receita' : '+ Nova despesa';
  const ini = document.getElementById('flIni'), fim = document.getElementById('flFim');
  if (!ini.value) { const p = intervaloFin('mes'); ini.value = chaveDiaLocal(p.ini); fim.value = chaveDiaLocal(p.fim); }
  const selCat = document.getElementById('flFiltroCategoria'), catAtual = selCat.value;
  const todos = lancamentosFin().filter(l => l.tipo === tipo);
  const cats = [...new Set([...categoriasFin(tipo), ...todos.map(l => l.categoria).filter(Boolean)])];
  selCat.innerHTML = '<option value="">Todas as categorias</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  if (cats.includes(catAtual)) selCat.value = catAtual;
  const per = {ini: new Date(ini.value + 'T00:00:00'), fim: new Date((fim.value || ini.value) + 'T23:59:59.999')};
  const st = document.getElementById('flFiltroStatus').value, org = document.getElementById('flFiltroOrigem').value;
  const busca = normTxt(document.getElementById('flBusca').value).trim();
  const lista = todos.filter(l => noIntervalo(l.data, per) && (!st || l.status === st) && (!selCat.value || l.categoria === selCat.value)
      && (!org || l.origem.modulo === org) && (!busca || normTxt(`${l.descricao} ${l.pessoa} ${l.origem.rotulo} ${l.obs || ''}`).includes(busca)))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  const pagos = lista.filter(l => l.status === 'pago'), pend = lista.filter(l => l.status === 'pendente');
  document.getElementById('flSub').textContent = `${plural(lista.length, 'lançamento', 'lançamentos')} · ${rec ? 'recebido' : 'pago'} ${moeda(somaValor(pagos))} · pendente ${moeda(somaValor(pend))}`;
  document.getElementById('flTabela').innerHTML = lista.length ? lista.map(l => {
    const acoes = l.auto
      ? `<button type="button" class="link-btn fl-origem" data-k="${l.key}">Ver origem</button>${l.ajustavel ? (l.status === 'pago' ? `<button type="button" class="link-btn fl-apagar" data-k="${l.key}">Ainda não paguei</button>` : `<button type="button" class="link-btn fl-baixar" data-k="${l.key}">Pagar</button>`) : ''}`
      : `${l.status === 'pendente' ? `<button type="button" class="link-btn fl-baixar" data-k="${l.key}">${rec ? 'Receber' : 'Pagar'}</button>` : ''}<div class="row-actions"><button type="button" class="edit" data-id="${l.id}" title="Editar">✎</button><button type="button" class="del" data-id="${l.id}" title="Excluir">✕</button></div>`;
    return `<tr class="${l.auto ? 'fin-auto' : ''}">
      <td class="nowrap">${dataBRfin(l.data)}</td>
      <td><b>${esc(l.descricao)}</b>${l.pessoa ? `<small class="history-date">${esc(l.pessoa)}</small>` : ''}${l.status === 'pendente' ? `<small class="history-date">vence ${dataBRfin(l.vencimento)}</small>` : ''}</td>
      <td>${esc(l.categoria) || '—'}</td><td>${badgeOrigem(l)}</td><td>${esc(l.forma) || '—'}</td><td>${badgeStatusFin(l)}</td>
      <td class="nowrap"><b class="${rec ? '' : 'mov-neg'}">${moeda(l.valor)}</b></td><td><div class="fl-acoes">${acoes}</div></td></tr>`;
  }).join('') : `<tr><td colspan="8" class="history-empty">Nenhuma ${rec ? 'receita' : 'despesa'} no período com esses filtros.</td></tr>`;
  document.getElementById('flTotalRotulo').textContent = `Total (${plural(lista.length, 'lançamento', 'lançamentos')})`;
  document.getElementById('flTotal').innerHTML = `<b>${moeda(somaValor(lista))}</b>`;
  const t = document.getElementById('flTabela');
  t.querySelectorAll('.fl-origem').forEach(b => b.addEventListener('click', () => verOrigemFin(lancamentosFin().find(x => x.key === b.dataset.k))));
  t.querySelectorAll('.fl-baixar').forEach(b => b.addEventListener('click', () => { baixarLancamentoFin(b.dataset.k); renderFinLista(); avisarFood('toastFl', rec ? 'Recebimento registrado.' : 'Pagamento registrado.'); }));
  t.querySelectorAll('.fl-apagar').forEach(b => b.addEventListener('click', () => compraAPagar(b.dataset.k)));
  t.querySelectorAll('.edit').forEach(b => b.addEventListener('click', () => abrirFormFin(b.dataset.id)));
  t.querySelectorAll('.del').forEach(b => b.addEventListener('click', () => excluirLancamentoFin(b.dataset.id)));
}
function atualizarFormFin(){
  const tipo = flEditando ? finLancamentos.find(x => x.id === flEditando).tipo : finTipoAtual;
  const pend = document.getElementById('flStatus').value === 'pendente';
  document.getElementById('flVencBox').style.display = pend ? '' : 'none';
  const rec = tipo === 'receita';
  document.getElementById('flStatus').options[0].textContent = rec ? 'Recebido' : 'Pago';
  document.getElementById('flPessoaLabel').textContent = rec ? 'Cliente' : 'Fornecedor';
  // Aviso de duplicidade: venda que já entrou sozinha pelo PDV/Food
  const aviso = document.getElementById('flAviso');
  aviso.textContent = '';
  const valor = r2(lerValorBR(document.getElementById('flValor').value)), data = document.getElementById('flData').value;
  if (rec && !flEditando && valor > 0 && data && document.getElementById('flCategoria').value === 'Vendas') {
    const igual = lancamentosAutomaticos().find(l => l.tipo === 'receita' && Math.abs(l.valor - valor) < 0.01 && chaveDiaLocal(l.data) === data);
    if (igual) aviso.textContent = `⚠ Já existe uma receita automática de ${moeda(valor)} nesse dia (${igual.origem.modulo} · ${igual.origem.rotulo}). Vendas do PDV e do Food entram sozinhas: lançar de novo conta em dobro.`;
  }
}
function abrirFormFin(id){
  const l = id ? finLancamentos.find(x => x.id === id) : null;
  flEditando = l ? l.id : null;
  const tipo = l ? l.tipo : finTipoAtual;
  document.getElementById('flFormTitulo').textContent = l ? `Editar — ${l.descricao}` : tipo === 'receita' ? 'Nova receita' : 'Nova despesa';
  const cats = [...new Set([...categoriasFin(tipo), ...(l && l.categoria ? [l.categoria] : [])])];
  document.getElementById('flCategoria').innerHTML = cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  const val = (idc, v) => { document.getElementById(idc).value = v ?? ''; };
  val('flDescricao', l?.descricao); val('flValor', l ? numBR(l.valor) : '');
  val('flCategoria', l?.categoria || (tipo === 'receita' ? 'Vendas' : cats[0]));
  val('flData', l ? chaveDiaLocal(l.data) : hojeISO());
  val('flStatus', l?.status || 'pago');
  val('flVencimento', l?.vencimento ? chaveDiaLocal(l.vencimento) : hojeISO());
  val('flForma', l?.forma || 'PIX'); val('flPessoa', l?.pessoa); val('flObs', l?.obs);
  document.getElementById('flRepetir').checked = false;
  document.getElementById('flRepetirBox').style.display = l ? 'none' : '';
  document.getElementById('flErro').textContent = '';
  atualizarFormFin();
  document.getElementById('flForm').style.display = 'block';
  document.getElementById('flDescricao').focus();
}
function salvarFormFin(){
  const erro = m => { document.getElementById('flErro').textContent = m; };
  const antigo = flEditando ? finLancamentos.find(x => x.id === flEditando) : null;
  const tipo = antigo ? antigo.tipo : finTipoAtual;
  const descricao = document.getElementById('flDescricao').value.trim();
  const valor = r2(lerValorBR(document.getElementById('flValor').value));
  const data = document.getElementById('flData').value, status = document.getElementById('flStatus').value;
  const venc = document.getElementById('flVencimento').value;
  if (!descricao) return erro('Informe a descrição.');
  if (!(valor > 0)) return erro('Informe um valor maior que zero.');
  if (!data) return erro('Informe a data.');
  if (status === 'pendente' && !venc) return erro('Informe o vencimento.');
  if (document.getElementById('flAviso').textContent && !confirm(document.getElementById('flAviso').textContent + '\n\nLançar mesmo assim?')) return;
  const dados = {descricao, valor, categoria: document.getElementById('flCategoria').value, data: isoMeioDia(data), status,
    vencimento: status === 'pendente' ? isoMeioDia(venc) : (antigo?.vencimento || null),
    pagoEm: status === 'pago' ? (antigo?.status === 'pago' && antigo.pagoEm ? antigo.pagoEm : isoMeioDia(data)) : null,
    forma: document.getElementById('flForma').value, pessoa: document.getElementById('flPessoa').value.trim(), obs: document.getElementById('flObs').value.trim()};
  const rotulo = tipo === 'receita' ? 'Receita' : 'Despesa';
  if (antigo) {
    const alteracoes = diferencas(antigo, dados, {descricao: {nome: 'Descrição'}, valor: {nome: 'Valor', moeda: true}, categoria: {nome: 'Categoria'}, status: {nome: 'Status'}, pessoa: {nome: tipo === 'receita' ? 'Cliente' : 'Fornecedor'}});
    Object.assign(antigo, dados);
    registrarAuditoria('Financeiro', `${rotulo} alterada: ${descricao}`, {alteracoes});
  } else {
    const novo = {id: idFin(), tipo, ...dados, recorrenciaId: null, criadoEm: new Date().toISOString(), usuario: usuarioAtual};
    finLancamentos.push(novo);
    let extra = '';
    if (document.getElementById('flRepetir').checked) {
      // A recorrência começa no mês seguinte: o deste mês é o lançamento que acabou de ser criado
      const base = new Date(status === 'pendente' ? venc + 'T12:00:00' : data + 'T12:00:00');
      const prox = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      finRecorrencias.push({id: idFin(), tipo, descricao, valor, categoria: dados.categoria, dia: base.getDate(), inicio: `${prox.getFullYear()}-${String(prox.getMonth() + 1).padStart(2, '0')}`, fim: '', pessoa: dados.pessoa, forma: dados.forma, ativo: true, gerados: [], criadoEm: new Date().toISOString(), usuario: usuarioAtual});
      extra = ` · repete todo dia ${base.getDate()}`;
      gerarRecorrencias();
    }
    registrarAuditoria('Financeiro', `${rotulo} lançada: ${descricao} — ${moeda(valor)}`, {detalhe: `${dados.categoria} · ${status === 'pago' ? (tipo === 'receita' ? 'recebido' : 'pago') : 'pendente, vence ' + dataBRfin(dados.vencimento)}${extra}`});
  }
  salvarFin();
  document.getElementById('flForm').style.display = 'none';
  renderFinLista();
  avisarFood('toastFl', `${rotulo} ${antigo ? 'alterada' : 'lançada'}: ${descricao} · ${moeda(valor)}.`);
}
function excluirLancamentoFin(id){
  const l = finLancamentos.find(x => x.id === id);
  if (!l || !confirm(`Excluir "${l.descricao}" (${moeda(l.valor)})?`)) return;
  finLancamentos = finLancamentos.filter(x => x.id !== id);
  registrarAuditoria('Financeiro', `${l.tipo === 'receita' ? 'Receita' : 'Despesa'} excluída: ${l.descricao} — ${moeda(l.valor)}`);
  salvarFin();
  renderFinLista();
}
document.getElementById('btnFlNovo').addEventListener('click', () => abrirFormFin(null));
document.getElementById('btnFlCancelar').addEventListener('click', () => { document.getElementById('flForm').style.display = 'none'; });
document.getElementById('btnFlSalvar').addEventListener('click', salvarFormFin);
['flStatus', 'flCategoria', 'flData'].forEach(id => document.getElementById(id).addEventListener('change', atualizarFormFin));
document.getElementById('flValor').addEventListener('input', atualizarFormFin);
['flIni', 'flFim', 'flFiltroStatus', 'flFiltroCategoria', 'flFiltroOrigem'].forEach(id => document.getElementById(id).addEventListener('change', renderFinLista));
document.getElementById('flBusca').addEventListener('input', renderFinLista);

// ---- Contas a pagar / a receber ----
let fcpFiltro = 'todas';
function renderFinContas(){
  const tipo = finTipoAtual, pagar = tipo === 'despesa';
  document.getElementById('fcpTitulo').textContent = pagar ? '📅 Contas a pagar' : '💵 Contas a receber';
  document.getElementById('fcpColPessoa').textContent = pagar ? 'Fornecedor' : 'Cliente';
  const hoje0 = inicioDoDia(), amanha = somaDias(hoje0, 1);
  const todas = pendentesFin(tipo).sort((a, b) => new Date(a.vencimento || a.data) - new Date(b.vencimento || b.data));
  const venc = l => new Date(l.vencimento || l.data);
  const filtros = {
    hoje: l => venc(l) >= hoje0 && venc(l) < amanha, '7': l => venc(l) >= hoje0 && venc(l) < somaDias(hoje0, 8),
    '30': l => venc(l) >= hoje0 && venc(l) < somaDias(hoje0, 31), atrasadas: l => venc(l) < hoje0, todas: () => true
  };
  const lista = todas.filter(filtros[fcpFiltro]);
  const atr = todas.filter(filtros.atrasadas), hj = todas.filter(filtros.hoje), sete = todas.filter(filtros['7']);
  document.getElementById('fcpSub').textContent = pagar ? 'Despesas pendentes, pela data de vencimento.' : 'Receitas pendentes, incluindo as vendas a prazo do PDV.';
  document.getElementById('fcpKpis').innerHTML = `
    <div><span>Total em aberto</span><b>${moeda(somaValor(todas))}</b><small>${plural(todas.length, 'conta', 'contas')}</small></div>
    <div class="${atr.length ? 'fp-lucro lc-bg-vermelho' : ''}"><span>Atrasadas</span><b>${moeda(somaValor(atr))}</b><small>${plural(atr.length, 'conta', 'contas')}</small></div>
    <div><span>Vence hoje</span><b>${moeda(somaValor(hj))}</b><small>${plural(hj.length, 'conta', 'contas')}</small></div>
    <div><span>Próximos 7 dias</span><b>${moeda(somaValor(sete))}</b><small>${plural(sete.length, 'conta', 'contas')}</small></div>`;
  document.getElementById('fcpTabela').innerHTML = lista.length ? lista.map(l => {
    const dias = Math.round((inicioDoDia(venc(l)) - hoje0) / 864e5);
    const quando = dias < 0 ? `<span class="badge mt-saida">atrasada há ${plural(-dias, 'dia', 'dias')}</span>` : dias === 0 ? '<span class="badge b-wait">vence hoje</span>' : `<small class="history-date">em ${plural(dias, 'dia', 'dias')}</small>`;
    const botao = l.origem.receberNoPdv ? `<button type="button" class="btn btn-ghost fcp-baixar" data-k="${l.key}">Receber no PDV</button>`
      : (!l.auto || l.ajustavel) ? `<button type="button" class="btn fcp-baixar" data-k="${l.key}">${pagar ? 'Pagar' : 'Receber'}</button>` : '';
    return `<tr class="${dias < 0 ? 'fin-atrasado' : ''}"><td class="nowrap">${dataBRfin(venc(l))} ${quando}</td><td><b>${esc(l.descricao)}</b></td><td>${esc(l.pessoa) || '—'}</td>
      <td>${esc(l.categoria) || '—'}</td><td>${badgeOrigem(l)}</td><td class="nowrap"><b>${moeda(l.valor)}</b></td><td>${botao}</td></tr>`;
  }).join('') : `<tr><td colspan="7" class="history-empty">Nenhuma conta ${fcpFiltro === 'atrasadas' ? 'atrasada' : 'neste filtro'}. ✓</td></tr>`;
  document.getElementById('fcpTotal').innerHTML = `<b>${moeda(somaValor(lista))}</b>`;
  document.querySelectorAll('#fcpTabela .fcp-baixar').forEach(b => b.addEventListener('click', () => {
    const l = lista.find(x => x.key === b.dataset.k);
    baixarLancamentoFin(b.dataset.k);
    if (!l.origem.receberNoPdv) { renderFinContas(); avisarFood('toastFcp', `${pagar ? 'Pago' : 'Recebido'}: ${l.descricao} · ${moeda(l.valor)}.`); }
  }));
}
document.querySelectorAll('#fcpFiltro button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#fcpFiltro button').forEach(x => x.classList.toggle('active', x === b));
  fcpFiltro = b.dataset.f;
  renderFinContas();
}));
document.getElementById('btnFcpNovo').addEventListener('click', () => {
  irPara(finTipoAtual === 'despesa' ? 'fin/despesas' : 'fin/receitas');
  abrirFormFin(null);
  document.getElementById('flStatus').value = 'pendente';
  atualizarFormFin();
});

// ---- Fluxo de caixa ----
function renderFinFluxo(){
  const ini = document.getElementById('ffIni'), fim = document.getElementById('ffFim');
  if (!ini.value) { const p = intervaloFin('mes'); ini.value = chaveDiaLocal(p.ini); fim.value = chaveDiaLocal(p.fim); }
  const tIni = new Date(ini.value + 'T00:00:00'), tFim = new Date((fim.value || ini.value) + 'T23:59:59.999');
  const previstos = document.getElementById('ffPrevistos').checked;
  const todos = lancamentosFin(), hoje0 = inicioDoDia(), inicioSaldo = new Date(finConfig.saldoData + 'T00:00:00');
  // Pendente atrasado entra hoje: é dinheiro que ainda deve entrar/sair
  const quando = l => l.status === 'pago' ? new Date(l.pagoEm || l.data) : new Date(Math.max(new Date(l.vencimento || l.data), hoje0));
  const eventos = todos.filter(l => l.status === 'pago' || previstos);
  const antes = eventos.filter(l => l.status === 'pago' && quando(l) >= inicioSaldo && quando(l) < tIni);
  let saldo = r2((tIni >= inicioSaldo ? Number(finConfig.saldoInicial) || 0 : 0) + antes.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0));
  const saldoIni = saldo;
  const dias = new Map();
  eventos.filter(l => quando(l) >= tIni && quando(l) <= tFim).forEach(l => {
    const k = chaveDiaLocal(quando(l)); const o = dias.get(k) || {e: 0, s: 0, prev: 0, n: 0};
    if (l.tipo === 'receita') o.e += l.valor; else o.s += l.valor;
    if (l.status === 'pendente') o.prev++; o.n++;
    dias.set(k, o);
  });
  const linhas = [...dias.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1);
  let entradas = 0, saidas = 0;
  document.getElementById('ffTabela').innerHTML = linhas.length ? linhas.map(([k, o]) => {
    entradas += o.e; saidas += o.s; saldo = r2(saldo + o.e - o.s);
    const futuro = o.prev === o.n;
    return `<tr class="${futuro ? 'ff-previsto' : ''}"><td class="nowrap">${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}</td>
      <td class="nowrap mov-pos">${o.e ? '+ ' + moeda(o.e) : '—'}</td><td class="nowrap mov-neg">${o.s ? '− ' + moeda(o.s) : '—'}</td>
      <td class="nowrap">${moeda(o.e - o.s)}</td><td class="nowrap"><b class="${saldo < 0 ? 'mov-neg' : ''}">${moeda(saldo)}</b></td>
      <td>${o.prev ? `<small class="history-date">${futuro ? 'previsto' : `${o.prev} previsto(s)`}</small>` : ''}</td></tr>`;
  }).join('') : '<tr><td colspan="6" class="history-empty">Nenhuma movimentação no período.</td></tr>';
  document.getElementById('ffSub').textContent = previstos ? 'Realizado + previsto (contas pendentes pelo vencimento).' : 'Só o realizado (recebido e pago).';
  document.getElementById('ffKpis').innerHTML = `
    <div><span>Saldo no início</span><b>${moeda(saldoIni)}</b><small>${dataBRfin(tIni)}</small></div>
    <div><span>Entradas</span><b class="mov-pos">${moeda(entradas)}</b><small>no período</small></div>
    <div><span>Saídas</span><b class="mov-neg">${moeda(saidas)}</b><small>no período</small></div>
    <div class="fp-lucro lc-bg-${saldo >= 0 ? 'verde' : 'vermelho'}"><span>Saldo no fim</span><b>${moeda(saldo)}</b><small>${dataBRfin(tFim)}${previstos ? ' · com previstos' : ''}</small></div>`;
}
['ffIni', 'ffFim', 'ffPrevistos'].forEach(id => document.getElementById(id).addEventListener('change', renderFinFluxo));

// ---- DRE simplificada (competência) ----
function renderFinDre(){
  const inp = document.getElementById('fdrMes');
  if (!inp.value) inp.value = hojeISO().slice(0, 7);
  const [a, m] = inp.value.split('-').map(Number);
  const per = {ini: new Date(a, m - 1, 1), fim: new Date(a, m, 0, 23, 59, 59, 999)};
  const noMes = d => noIntervalo(d, per);
  const vendas = moduloAtivo('pdv') ? vendasRealizadas.filter(v => !vendaCancelada(v) && noMes(v.data)) : [];
  const pdvBruto = r2(vendas.reduce((s, v) => s + v.total, 0));
  const devs = moduloAtivo('pdv') ? vendasRealizadas.filter(v => !vendaCancelada(v)).flatMap(v => (v.devolucoes || []).filter(d => noMes(d.data)).map(d => ({v, d}))) : [];
  const devolucoes = r2(devs.reduce((s, x) => s + x.d.valor, 0));
  const custoProd = (v, codigo) => Number((v.produtos || []).find(p => p.codigo === codigo)?.custo || 0);
  const cmvPdv = r2(vendas.reduce((s, v) => s + (v.produtos || []).reduce((t, p) => t + (Number(p.custo) || 0) * p.qtd, 0), 0)
    - devs.reduce((s, x) => s + (x.d.itens || []).reduce((t, i) => t + custoProd(x.v, i.codigo) * i.qtd, 0), 0));
  const pedidos = moduloAtivo('food') ? foodPedidos.filter(p => p.status !== 'cancelado' && noMes(p.data)) : [];
  const foodBruto = r2(pedidos.reduce((s, p) => s + p.calc.venda, 0));
  const foodDesc = r2(pedidos.reduce((s, p) => s + (p.calc.desconto || 0), 0));
  const cmvFood = r2(pedidos.reduce((s, p) => s + p.calc.ingredientes + p.calc.embalagem + (p.calc.outrosItens || 0), 0));
  const manuais = lancamentosFin().filter(l => !l.auto && noMes(l.data));
  const outrasVendas = r2(manuais.filter(l => l.tipo === 'receita' && l.categoria === 'Vendas').reduce((s, l) => s + l.valor, 0));
  const outrasReceitas = r2(manuais.filter(l => l.tipo === 'receita' && l.categoria !== 'Vendas').reduce((s, l) => s + l.valor, 0));
  // Despesas operacionais: tudo do mês, menos compra de mercadoria (vira estoque) e devoluções (já deduzidas)
  const despesas = lancamentosFin().filter(l => l.tipo === 'despesa' && noMes(l.data) && !['Fornecedores', 'Devoluções'].includes(l.categoria) && l.origem.modulo !== 'Estoque');
  const porCat = new Map();
  despesas.forEach(l => porCat.set(l.categoria || 'Outros', (porCat.get(l.categoria || 'Outros') || 0) + l.valor));
  const totalDesp = r2(despesas.reduce((s, l) => s + l.valor, 0));
  const bruto = r2(pdvBruto + foodBruto + outrasVendas), deducoes = r2(foodDesc + devolucoes), liquida = r2(bruto - deducoes);
  const cmv = r2(cmvPdv + cmvFood), lucroBruto = r2(liquida - cmv), resultado = r2(lucroBruto - totalDesp + outrasReceitas);
  const pct = v => liquida ? pctBR(v / liquida * 100) : '—';
  const detalhe = partes => partes.filter(([, v]) => v).map(([n, v]) => `${n} ${moeda(v)}`).join(' · ');
  const linha = (rotulo, v, cls = '', sub = '', mostrarPct = true) => `<div class="fdr-linha ${cls}"><span>${rotulo}${sub ? `<small>${sub}</small>` : ''}</span><b>${moeda(v)}</b><em>${mostrarPct ? pct(v) : ''}</em></div>`;
  const nomeMes = per.ini.toLocaleDateString('pt-BR', {month: 'long', year: 'numeric'});
  document.getElementById('fdrTabela').innerHTML = `
    <div class="fdr-titulo">Resultado de ${nomeMes}</div>
    ${linha('Faturamento bruto', bruto, 'fdr-forte', detalhe([['PDV', pdvBruto], ['Food', foodBruto], ['Outras vendas', outrasVendas]]), false)}
    ${linha('(−) Descontos e devoluções', deducoes, '', detalhe([['Descontos Food', foodDesc], ['Devoluções PDV', devolucoes]]))}
    ${linha('= Receita líquida', liquida, 'fdr-total')}
    ${linha('(−) Custo dos produtos vendidos', cmv, '', detalhe([['PDV', cmvPdv], ['Food (fichas técnicas)', cmvFood]]))}
    ${linha('= Lucro bruto', lucroBruto, 'fdr-total')}
    ${linha('(−) Despesas operacionais', totalDesp, '', porCat.size ? '' : 'nenhuma despesa lançada no mês')}
    ${[...porCat.entries()].sort((x, y) => y[1] - x[1]).map(([c, v]) => linha(esc(c), v, 'fdr-sub')).join('')}
    ${outrasReceitas ? linha('(+) Outras receitas', outrasReceitas) : ''}
    ${linha('= Resultado operacional', resultado, 'fdr-total fdr-final ' + (resultado < 0 ? 'fdr-neg' : 'fdr-pos'))}`;
}
document.getElementById('fdrMes').addEventListener('change', renderFinDre);

// ---- Recorrências ----
// Cria os lançamentos até 2 meses à frente; cada mês é gerado uma vez só (mesmo se o lançamento for excluído)
function gerarRecorrencias(){
  const limite = new Date(); limite.setMonth(limite.getMonth() + 2);
  let criou = 0;
  finRecorrencias.filter(r => r.ativo !== false).forEach(r => {
    let [a, m] = r.inicio.split('-').map(Number);
    const [fa, fm] = r.fim ? r.fim.split('-').map(Number) : [9999, 12];
    r.gerados = r.gerados || [];
    for (let guarda = 0; guarda < 240; guarda++) {
      if (a > fa || (a === fa && m > fm)) break;
      const venc = new Date(a, m - 1, Math.min(r.dia, new Date(a, m, 0).getDate()), 12);
      if (venc > limite) break;
      const comp = `${a}-${String(m).padStart(2, '0')}`;
      if (!r.gerados.includes(comp)) {
        finLancamentos.push({id: idFin(), tipo: r.tipo, descricao: r.descricao, valor: r.valor, categoria: r.categoria, data: venc.toISOString(), vencimento: venc.toISOString(), pagoEm: null, status: 'pendente',
          forma: r.forma || 'Boleto', pessoa: r.pessoa || '', obs: '', recorrenciaId: r.id, competencia: comp, criadoEm: new Date().toISOString(), usuario: usuarioAtual});
        r.gerados.push(comp); criou++;
      }
      m++; if (m > 12) { m = 1; a++; }
    }
  });
  if (criou) salvarFin();
  return criou;
}
function preencherCategoriasRecorrencia(){
  const tipo = document.getElementById('frcTipo').value, sel = document.getElementById('frcCategoria');
  sel.innerHTML = categoriasFin(tipo).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
function renderFinRecorrencias(){
  gerarRecorrencias();
  preencherCategoriasRecorrencia();
  if (!document.getElementById('frcInicio').value) document.getElementById('frcInicio').value = hojeISO().slice(0, 7);
  const mesAno = c => c ? `${c.slice(5, 7)}/${c.slice(0, 4)}` : '';
  document.getElementById('frcTabela').innerHTML = finRecorrencias.length ? finRecorrencias.slice().reverse().map(r => {
    const prox = finLancamentos.filter(l => l.recorrenciaId === r.id && l.status === 'pendente').sort((x, y) => new Date(x.vencimento) - new Date(y.vencimento))[0];
    return `<tr class="${r.ativo === false ? 'prod-inativo' : ''}"><td><b>${esc(r.descricao)}</b>${r.pessoa ? `<small class="history-date">${esc(r.pessoa)}</small>` : ''}</td>
      <td>${r.tipo === 'receita' ? 'Receita' : 'Despesa'}</td><td>${esc(r.categoria)}</td><td class="nowrap"><b>${moeda(r.valor)}</b></td>
      <td>Todo dia ${r.dia} · mensal<small class="history-date">desde ${mesAno(r.inicio)}${r.fim ? ` até ${mesAno(r.fim)}` : ''}</small></td>
      <td class="nowrap">${prox ? dataBRfin(prox.vencimento) : '—'}</td>
      <td><span class="badge ${r.ativo === false ? 'mt-saida' : 'b-ok'}">${r.ativo === false ? 'Encerrada' : 'Ativa'}</span></td>
      <td><div class="fl-acoes">${r.ativo === false ? '' : `<button type="button" class="link-btn frc-encerrar" data-id="${r.id}">Encerrar</button>`}<div class="row-actions"><button type="button" class="del" data-id="${r.id}" title="Excluir">✕</button></div></div></td></tr>`;
  }).join('') : '<tr><td colspan="8" class="history-empty">Nenhuma recorrência. Ex.: Aluguel R$ 2.000,00 todo dia 05.</td></tr>';
  document.querySelectorAll('#frcTabela .frc-encerrar').forEach(b => b.addEventListener('click', () => encerrarRecorrencia(b.dataset.id, false)));
  document.querySelectorAll('#frcTabela .del').forEach(b => b.addEventListener('click', () => encerrarRecorrencia(b.dataset.id, true)));
}
// Encerrar/excluir remove só os lançamentos futuros ainda pendentes; o que já foi pago fica
function encerrarRecorrencia(id, excluir){
  const r = finRecorrencias.find(x => x.id === id);
  if (!r) return;
  const hoje0 = inicioDoDia();
  const futuros = finLancamentos.filter(l => l.recorrenciaId === id && l.status === 'pendente' && new Date(l.vencimento) >= hoje0);
  if (!confirm(`${excluir ? 'Excluir' : 'Encerrar'} a recorrência "${r.descricao}"?\n\n${futuros.length ? `${plural(futuros.length, 'lançamento futuro pendente será removido', 'lançamentos futuros pendentes serão removidos')}.` : 'Nenhum lançamento futuro pendente.'} Os já pagos continuam.`)) return;
  finLancamentos = finLancamentos.filter(l => !futuros.includes(l));
  if (excluir) finRecorrencias = finRecorrencias.filter(x => x.id !== id); else r.ativo = false;
  registrarAuditoria('Financeiro', `Recorrência ${excluir ? 'excluída' : 'encerrada'}: ${r.descricao} — ${moeda(r.valor)}/mês`, {detalhe: `${futuros.length} lançamento(s) futuro(s) removido(s)`});
  salvarFin();
  renderFinRecorrencias();
}
document.getElementById('frcTipo').addEventListener('change', preencherCategoriasRecorrencia);
document.getElementById('btnFrcSalvar').addEventListener('click', () => {
  const erro = m => { document.getElementById('frcErro').textContent = m; };
  const descricao = document.getElementById('frcDescricao').value.trim(), valor = r2(lerValorBR(document.getElementById('frcValor').value));
  const dia = Math.round(Number(document.getElementById('frcDia').value)), inicio = document.getElementById('frcInicio').value, fim = document.getElementById('frcFim').value;
  if (!descricao) return erro('Informe a descrição.');
  if (!(valor > 0)) return erro('Informe o valor.');
  if (!(dia >= 1 && dia <= 31)) return erro('O dia precisa estar entre 1 e 31.');
  if (!inicio) return erro('Informe o mês de início.');
  if (fim && fim < inicio) return erro('O mês final é antes do inicial.');
  erro('');
  const r = {id: idFin(), tipo: document.getElementById('frcTipo').value, descricao, valor, categoria: document.getElementById('frcCategoria').value, dia, inicio, fim,
    pessoa: document.getElementById('frcPessoa').value.trim(), forma: 'Boleto', ativo: true, gerados: [], criadoEm: new Date().toISOString(), usuario: usuarioAtual};
  finRecorrencias.push(r);
  const n = gerarRecorrencias();
  registrarAuditoria('Financeiro', `Recorrência criada: ${descricao} — ${moeda(valor)} todo dia ${dia}`, {detalhe: `${r.tipo === 'receita' ? 'Receita' : 'Despesa'} · ${r.categoria} · ${n} lançamento(s) gerado(s)`});
  salvarFin();
  ['frcDescricao', 'frcValor', 'frcFim', 'frcPessoa'].forEach(id => { document.getElementById(id).value = ''; });
  renderFinRecorrencias();
  avisarFood('toastFrc', `Recorrência criada: ${plural(n, 'lançamento gerado', 'lançamentos gerados')} em ${r.tipo === 'receita' ? 'Contas a receber' : 'Contas a pagar'}.`);
});

// ---- Centro de integrações ----
const OPCOES_INTEGRACAO = [
  {k: 'pdvVendas', mod: 'pdv', rotulo: 'Enviar vendas do PDV para o Financeiro', sub: 'Cada venda vira receita pela forma de pagamento. Venda a prazo entra em Contas a receber; devolução em dinheiro ou PIX entra como saída.'},
  {k: 'foodVendas', mod: 'food', rotulo: 'Enviar vendas do Food para o Financeiro', sub: 'Pedidos registrados e importados das plataformas viram receita.'},
  {k: 'foodTaxas', mod: 'food', rotulo: 'Enviar taxas das plataformas', sub: 'Comissão e taxa de pagamento de cada pedido (iFood, 99Food, Keeta…) viram despesa.'},
  {k: 'compras', mod: null, rotulo: 'Enviar compras de fornecedores', sub: 'Entradas de estoque com custo (produtos do PDV e ingredientes do Food) viram despesa. Dá para marcar uma compra como "a pagar".'}
];
function renderFinIntegracoes(){
  const mes = intervaloFin('mes'), auto = lancamentosAutomaticos().filter(l => noIntervalo(l.data, mes));
  const conta = mod => auto.filter(l => l.origem.modulo === mod).length;
  const status = (on, contratado = true) => on ? '<span class="fint-on">🟢 Conectado</span>' : `<span class="fint-off">⚪ ${contratado ? 'Não conectado' : 'Não contratado'}</span>`;
  const cards = [
    {ic: '🛒', nome: 'MGA PDV', on: moduloAtivo('pdv'), contratado: moduloAtivo('pdv'), det: `${plural(conta('PDV'), 'lançamento', 'lançamentos')} este mês`},
    {ic: '🍕', nome: 'MGA Food', on: moduloAtivo('food'), contratado: moduloAtivo('food'), det: `${plural(conta('Food'), 'lançamento', 'lançamentos')} este mês`},
    {ic: '📦', nome: 'Estoque (compras)', on: finConfig.integracoes.compras && (moduloAtivo('pdv') || moduloAtivo('food')), contratado: true, det: `${plural(conta('Estoque'), 'compra', 'compras')} este mês`},
    {ic: '📲', nome: 'Marketplaces', on: moduloAtivo('food'), contratado: moduloAtivo('food'), det: 'iFood, 99Food e Keeta pelo Food › Importar vendas'},
    {ic: '🏦', nome: 'Bancos', on: false, contratado: true, det: 'Conciliação bancária: em breve'}
  ];
  document.getElementById('fintCards').innerHTML = cards.map(c => `<div class="card fint-card ${c.on ? 'on' : ''}"><span class="fint-ic">${c.ic}</span><div><b>${c.nome}</b>${status(c.on, c.contratado)}<small>${c.det}</small></div></div>`).join('');
  document.getElementById('fintOpcoes').innerHTML = OPCOES_INTEGRACAO.map(o => {
    const disp = !o.mod || moduloAtivo(o.mod);
    return `<label class="fint-opcao ${disp ? '' : 'off'}"><input type="checkbox" data-k="${o.k}" ${finConfig.integracoes[o.k] ? 'checked' : ''} ${disp ? '' : 'disabled'}>
      <span><b>${o.rotulo}</b><small>${disp ? o.sub : 'Módulo não contratado.'}</small></span></label>`;
  }).join('');
  document.querySelectorAll('#fintOpcoes input').forEach(inp => inp.addEventListener('change', () => {
    finConfig.integracoes[inp.dataset.k] = inp.checked;
    const o = OPCOES_INTEGRACAO.find(x => x.k === inp.dataset.k);
    registrarAuditoria('Financeiro', `Integração ${inp.checked ? 'ligada' : 'desligada'}: ${o.rotulo}`);
    salvarFin();
    renderFinIntegracoes();
    avisarFood('toastFint', `${inp.checked ? 'Ligado' : 'Desligado'}: ${o.rotulo.toLowerCase()}.`);
  }));
}

// ---- Configuração ----
let fconfRascunho = null;
function renderFinConfig(){
  if (!fconfRascunho) fconfRascunho = JSON.parse(JSON.stringify(finConfig.categorias));
  document.getElementById('fconfSaldo').value = numBR(finConfig.saldoInicial);
  document.getElementById('fconfSaldoData').value = finConfig.saldoData;
  ['receita', 'despesa'].forEach(tipo => {
    const el = document.getElementById(tipo === 'receita' ? 'fconfCatRec' : 'fconfCatDesp');
    el.innerHTML = fconfRascunho[tipo].map((c, k) => `<span class="fconf-chip">${esc(c)}<button type="button" data-t="${tipo}" data-k="${k}" title="Remover" aria-label="Remover ${esc(c)}">✕</button></span>`).join('');
  });
  document.querySelectorAll('.fconf-chip button').forEach(b => b.addEventListener('click', () => { fconfRascunho[b.dataset.t].splice(Number(b.dataset.k), 1); renderFinConfig(); }));
}
function adicionarCategoriaFin(tipo){
  const inp = document.getElementById(tipo === 'receita' ? 'fconfNovaRec' : 'fconfNovaDesp');
  const nome = inp.value.trim();
  if (!nome || fconfRascunho[tipo].some(c => normTxt(c) === normTxt(nome))) return;
  fconfRascunho[tipo].push(nome); inp.value = '';
  renderFinConfig();
}
document.getElementById('btnFconfAddRec').addEventListener('click', () => adicionarCategoriaFin('receita'));
document.getElementById('btnFconfAddDesp').addEventListener('click', () => adicionarCategoriaFin('despesa'));
document.getElementById('fconfNovaRec').addEventListener('keydown', e => { if (e.key === 'Enter') adicionarCategoriaFin('receita'); });
document.getElementById('fconfNovaDesp').addEventListener('keydown', e => { if (e.key === 'Enter') adicionarCategoriaFin('despesa'); });
document.getElementById('btnFconfSalvar').addEventListener('click', () => {
  if (!fconfRascunho.receita.length || !fconfRascunho.despesa.length) { avisarFood('toastFconf', 'Deixe pelo menos uma categoria de receita e uma de despesa.', true); return; }
  const antes = {saldoInicial: finConfig.saldoInicial, saldoData: finConfig.saldoData};
  finConfig.saldoInicial = r2(lerValorBR(document.getElementById('fconfSaldo').value));
  finConfig.saldoData = document.getElementById('fconfSaldoData').value || finConfig.saldoData;
  finConfig.categorias = JSON.parse(JSON.stringify(fconfRascunho));
  registrarAuditoria('Financeiro', 'Configuração do Financeiro salva', {alteracoes: diferencas(antes, finConfig, {saldoInicial: {nome: 'Saldo inicial', moeda: true}, saldoData: {nome: 'Data do saldo inicial'}})});
  salvarFin();
  avisarFood('toastFconf', 'Configuração salva.');
});

// Cada tela do Financeiro renderiza ao ser aberta
wireSubtabs('subtabsFin', {dashboard: 'finDashboard', lista: 'finLista', contas: 'finContas', fluxo: 'finFluxo', dre: 'finDre', recorrencias: 'finRecorrencias', integracoes: 'finIntegracoes', config: 'finConfig'});
const RENDER_FIN = {dashboard: renderFinDashboard, lista: () => { document.getElementById('flForm').style.display = 'none'; renderFinLista(); }, contas: renderFinContas, fluxo: renderFinFluxo,
  dre: renderFinDre, recorrencias: renderFinRecorrencias, integracoes: renderFinIntegracoes, config: () => { fconfRascunho = null; renderFinConfig(); }};
document.querySelectorAll('#subtabsFin .stab').forEach(b => b.addEventListener('click', () => { RENDER_FIN[b.dataset.tab](); atualizarBadgesFin(); }));
gerarRecorrencias();
atualizarBadgesFin();
aplicarModulos();
