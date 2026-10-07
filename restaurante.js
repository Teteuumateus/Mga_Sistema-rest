// =====================================================================
// ---- 🍽️ MGA · aplicação: login, menu lateral, barra superior e rotas ----
// =====================================================================
// Monta o sistema em #appShell. As telas vêm de RestUI.telas (restaurante-*.js).
// Rotas no endereço (#/fin/pagar?f=hoje): F5 mantém a tela e o "voltar" funciona.
// Cada rota pertence a um módulo; o menu e as telas respeitam as permissões do usuário.
(function(){
  'use strict';
  const raiz = document.getElementById('appShell');
  // Sem sessão: volta para o login
  if (window.RestDados && !window.RestDados.sessaoAtual()) { location.replace('login.html'); return; }
  // Sem internet o React não carrega: avisa em vez de mostrar uma página em branco
  if (!window.React || !window.ReactDOM || !window.htm || !window.RestDados || !window.RestUI) {
    raiz.innerHTML = `<div class="content"><div class="card rest-offline"><b>Não foi possível carregar o sistema.</b>
      <p>As telas usam React, baixado da internet. Verifique a conexão e recarregue a página (F5).</p></div></div>`;
    return;
  }

  const {useState, useEffect} = React;
  const {html, D, useDados} = window.RestUI;

  // Menu na ordem pedida; "modulo" diz qual permissão libera a seção (ou o item)
  const MENU = [
    {rota: 'dashboard', nome: 'Dashboard', ic: '📊', modulo: 'dashboard'},
    {grupo: 'cad', nome: 'Cadastros', ic: '🗂️', modulo: 'cadastros', itens: [
      ['cad/produtos', 'Produtos'], ['cad/grupos', 'Categorias'], ['cad/adicionais', 'Adicionais e etapas', null, 'Ponto da carne, extras, acompanhamentos...'],
      ['cad/promocoes', 'Promoções', null, 'Preço especial por dia e horário'], ['cad/embalagens', 'Embalagens', null, 'Cobradas por item no delivery'], ['cad/mesas', 'Mesas'], ['cad/clientes', 'Clientes'], ['cad/fornecedores', 'Fornecedores'],
      ['cad/funcionarios', 'Funcionários'], ['cad/entregadores', 'Entregadores'], ['cad/regioes', 'Regiões de entrega', null, 'Cidades, bairros e taxa de entrega'], ['cad/aplicativos', 'Aplicativos de delivery', null, 'iFood, 99Food... com a comissão de cada um'],
      ['cad/formas', 'Formas de pagamento'], ['cad/usuarios', 'Usuários', 'configuracoes']]},
    // Vendas: Mesas (salão) e Delivery (WhatsApp/telefone) no topo; depois balcão e caixa.
    // Cada item: [rota, nome, módulo (se diferente do grupo), dica]
    {grupo: 'vendas', nome: 'Vendas', ic: '🧾', modulo: 'vendas', itens: [
      ['mesas', 'Mesas', 'mesas', 'Vendas das mesas do salão'],
      ['delivery', 'Delivery', 'delivery', 'Pedidos feitos pelo WhatsApp ou por telefone'],
      ['vendas/pdv', 'Venda balcão'], ['vendas/cardapio', 'Pedidos do cardápio', 'mesas', 'Pedidos, chamados de garçom e pedidos de conta do cardápio digital'], ['vendas/cozinha', 'Fila de produção', 'cozinha', 'O que a cozinha tem para preparar'], ['vendas/caixa', 'Caixa'], ['vendas/lista', 'Vendas realizadas'], ['vendas/caixas', 'Caixas anteriores']]},
    {rota: 'cardapio', nome: 'Cardápio digital', ic: '📱', modulo: 'cadastros'},
    {grupo: 'est', nome: 'Estoque', ic: '📦', modulo: 'estoque', itens: [['estoque/dashboard', 'Dashboard do estoque', null, 'O que entrou, o que saiu e o saldo'],
      ['estoque/entradas', 'Entrada de estoque', null, 'Entrada de produtos do cadastro (compras)'], ['estoque/saidas', 'Saída de estoque', null, 'Vendas (baixa automática), perdas e consumo']]},
    {grupo: 'fin', nome: 'Financeiro', ic: '💰', modulo: 'financeiro', itens: [['fin/pagar', 'Contas a pagar'], ['fin/receber', 'Contas a receber'], ['fin/contas', 'Contas bancárias'],
      ['fin/extrato', 'Movimento de conta', null, 'Extrato, lançamentos e transferências'], ['fin/categorias', 'Categorias financeiras']]},
    {grupo: 'rel', nome: 'Relatórios', ic: '📈', modulo: 'relatorios', itens: [['rel/vendas', 'Vendas'], ['rel/produtos', 'Produtos'], ['rel/cardapio', 'Engenharia de cardápio', null, 'CMV: o que vende e o que dá lucro'],
      ['rel/caixa', 'Caixa'], ['rel/delivery', 'Delivery'], ['rel/financeiro', 'Financeiro (DRE)', 'financeiro', 'Resultado, contas, sangrias e mês a mês']]},
    {grupo: 'config', nome: 'Configurações', ic: '⚙️', modulo: 'configuracoes', itens: [['config/restaurante', 'Restaurante'], ['config/empresa', 'Empresa'], ['config/impressao', 'Impressão'], ['config/auditoria', 'Auditoria'], ['config/dados', 'Dados do sistema']]}
  ];
  // Seções ainda em desenvolvimento: {rota: {nome, ic, fase, texto}} (aparecem com o selo "fase N")
  const EM_BREVE = {};
  const ROTAS = {};
  MENU.forEach(m => m.itens
    ? m.itens.forEach(([r, n, mod, dica]) => { ROTAS[r] = {titulo: `${m.nome} › ${n}`, modulo: mod || m.modulo, grupo: m.grupo, dica}; })
    : (ROTAS[m.rota] = {titulo: m.nome, modulo: m.modulo, grupo: null}));
  // Rotas fora do menu (abertas a partir de outra tela)
  ROTAS['mesas/pedido'] = {titulo: 'Vendas › Mesas › Pedido', modulo: 'mesas', grupo: 'vendas', pai: 'mesas'};
  ROTAS['delivery/novo'] = {titulo: 'Vendas › Delivery › Novo pedido', modulo: 'delivery', grupo: 'vendas', pai: 'delivery'};
  // Fora do menu, abertas pelo Dashboard do estoque (ajuste de inventário, mínimo, produção e histórico do produto)
  ROTAS['estoque'] = {titulo: 'Estoque › Posição do estoque', modulo: 'estoque', grupo: 'est', pai: 'estoque/dashboard'};
  ROTAS['estoque/movimentos'] = {titulo: 'Estoque › Movimentações', modulo: 'estoque', grupo: 'est', pai: 'estoque/dashboard'};
  const pode = rota => !!ROTAS[rota] && D.podeAcessar(ROTAS[rota].modulo);

  // ---- Rotas no endereço ----
  function lerRota(){
    const [caminho, consulta] = location.hash.replace(/^#\/?/, '').split('?');
    const params = Object.fromEntries(new URLSearchParams(consulta || ''));
    return {rota: ROTAS[caminho] ? caminho : 'dashboard', params};
  }
  function ir(rota, params = {}){
    const q = new URLSearchParams(params).toString();
    location.hash = '/' + rota + (q ? '?' + q : '');
  }
  // O master (suporte) volta para o painel de empresas; os demais vão para o login
  function sair(){ const master = D.sessaoAtual()?.master; D.encerrarSessao(); location.replace(master ? 'master.html' : 'login.html'); }
  // Saiu (ou o usuário foi desativado) em outra aba: esta aba também sai
  window.addEventListener('storage', e => { if ((e.key === 'mga_sessao' || e.key === 'mga_restUsuarios') && !D.sessaoAtual()) location.replace('login.html'); });

  // ---- Tema claro/escuro (mesma chave do login: mga_tema) ----
  function BotaoTema(){
    const [escuro, setEscuro] = useState(document.documentElement.getAttribute('data-theme') === 'dark');
    const trocar = () => {
      const novo = escuro ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', novo);
      try { localStorage.setItem('mga_tema', JSON.stringify(novo)); } catch (e) { /* storage indisponível */ }
      setEscuro(!escuro);
    };
    return html`
      <button type="button" className="theme-toggle" role="switch" aria-checked=${escuro} aria-label=${escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'} title=${escuro ? 'Tema escuro' : 'Tema claro'} onClick=${trocar}>
        <svg className="tt-ic tt-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></svg>
        <svg className="tt-ic tt-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 3.5a8.5 8.5 0 1 1-11 11 7 7 0 0 0 11-11z"/></svg>
        <span className="tt-knob"></span>
      </button>`;
  }

  // ---- Menu lateral escuro (sanfona: abre o grupo da tela atual); só o que o usuário pode acessar ----
  const usarCardapioWeb = window.RestUI.useCardapioWeb || (() => null);
  function MenuLateral({rota, aberto, setAberto}){
    useDados();
    const cardapioWeb = usarCardapioWeb();
    // Contadores de alerta nos grupos: contas vencidas e produtos no mínimo ou abaixo
    const alertas = {
      vendas: cardapioWeb && D.podeAcessar('mesas') ? [cardapioWeb.pendentes(), 'pedido(s) novo(s) ou chamado(s) do cardápio digital'] : [0],
      fin: D.podeAcessar('financeiro') ? [D.contas().filter(D.contaVencida).length, 'conta(s) vencida(s)'] : [0],
      est: D.podeAcessar('estoque') ? [D.produtos().filter(p => p.ativo && D.estoqueBaixo(p)).length, 'produto(s) no estoque mínimo ou abaixo'] : [0]
    };
    const visiveis = MENU.map(m => m.itens ? {...m, itens: m.itens.filter(([r]) => pode(r))} : m)
      .filter(m => m.itens ? m.itens.length : D.podeAcessar(m.modulo));
    // Um item do menu: grupo com subitens (sanfona) ou link simples
    const itemMenu = m => m.itens
            ? html`<div key=${m.grupo} className=${'nav-grupo' + (aberto === m.grupo ? '' : ' recolhido') + (ROTAS[rota]?.grupo === m.grupo ? ' grupo-ativo' : '')}>
                <button type="button" className="nav-titulo" aria-expanded=${aberto === m.grupo} onClick=${() => setAberto(aberto === m.grupo ? null : m.grupo)}>
                  <span className="ic">${m.ic}</span>${m.nome}
                  ${alertas[m.grupo]?.[0] ? html`<span className="nav-badge" title=${`${alertas[m.grupo][0]} ${alertas[m.grupo][1]}`}>${alertas[m.grupo][0]}</span>` : null}
                  <span className="nav-seta" aria-hidden="true">▾</span>
                </button>
                <div className="nav-itens">
                  ${m.itens.map(([r, n, , dica]) => html`<button type="button" key=${r} title=${dica || null} className=${rota === r || ROTAS[rota]?.pai === r ? 'active' : ''} aria-current=${rota === r ? 'page' : null} onClick=${() => ir(r)}>${n}${EM_BREVE[r] ? html`<span className="rest-breve">fase ${EM_BREVE[r].fase}</span>` : null}</button>`)}
                </div>
              </div>`
            : html`<button type="button" key=${m.rota} className=${'nav-simples' + (rota === m.rota || ROTAS[rota]?.pai === m.rota ? ' active' : '')} aria-current=${rota === m.rota ? 'page' : null} onClick=${() => ir(m.rota)}>
                <span className="ic">${m.ic}</span>${m.nome}${EM_BREVE[m.rota] ? html`<span className="rest-breve">fase ${EM_BREVE[m.rota].fase}</span>` : null}
              </button>`;
    // Configurações e Sair ficam na parte de baixo do menu
    return html`
      <aside className="sidebar" id="sidebar">
        <button type="button" className="brand" onClick=${() => ir('dashboard')} title=${`${D.nomeMarca()} · ir para o Dashboard`}>
          <span className="dot"></span><span className=${'brand-nome' + (D.nomeMarca().length > 20 ? ' longo muito-longo' : D.nomeMarca().length > 9 ? ' longo' : '')}>${D.nomeMarca()}</span>
        </button>
        <nav className="nav" aria-label="Menu principal">
          ${visiveis.filter(m => m.grupo !== 'config').map(itemMenu)}
        </nav>
        <div className="rest-nav-baixo">
          ${D.sessaoAtual()?.master && html`
            <div className="rest-suporte-card" title="Você está nesta empresa como master (suporte)">
              <span className="rest-suporte-tag">🛠 Modo suporte</span>
              <b>${D.nomeMarca()}</b>
              <small>${D.sessaoAtual().nome} · ${D.PERFIS[D.sessaoAtual().perfil].nome}</small>
              <button type="button" onClick=${sair}>← Voltar ao painel master</button>
            </div>`}
          <nav className="nav" aria-label="Configurações">${visiveis.filter(m => m.grupo === 'config').map(itemMenu)}</nav>
          <button type="button" className="logout-btn" onClick=${sair}><span className="ic">↪</span>Sair</button>
        </div>
        <div className="sidebar-foot">MGA Tecnologia<br />v3.0 · 100% Web</div>
      </aside>`;
  }

  // ---- Atalhos da barra superior: achar mesa pelo número e abrir Mesas, Delivery e Balcão ----
  // "5" acha a mesa "05"; ocupada abre o pedido, livre abre a janela para abrir a mesa
  function Atalhos(){
    const [busca, setBusca] = useState('');
    const [erro, setErro] = useState(false);
    const podeMesas = D.podeAcessar('mesas'), podeDelivery = D.podeAcessar('delivery'), podeVendas = D.podeAcessar('vendas');
    const procurar = e => {
      e.preventDefault();
      const t = busca.trim().toUpperCase();
      if (!t) return;
      const m = D.mesas().find(x => x.ativo && (x.numero === t || x.numero === t.padStart(2, '0')));
      if (!m) { setErro(true); return; }
      const v = D.vendaDaMesa(m.id);
      setBusca('');
      v ? ir('mesas/pedido', {id: v.id}) : ir('mesas', {abrir: m.id});
    };
    const atalho = (rotulo, ic, rota) => html`<button type="button" className="rest-atalho" title=${rotulo} onClick=${() => ir(rota)}><span aria-hidden="true">${ic}</span><span className="rest-atalho-txt">${rotulo}</span></button>`;
    return html`
      <div className="rest-atalhos">
        ${podeMesas && html`<form className=${'rest-busca-mesa' + (erro ? ' erro' : '')} onSubmit=${procurar} role="search">
          <input type="search" inputMode="numeric" value=${busca} placeholder="Mesa nº" aria-label="Abrir mesa pelo número" title=${erro ? 'Mesa não encontrada' : 'Digite o número da mesa e tecle Enter'}
            onInput=${e => { setBusca(e.target.value); setErro(false); }} />
        </form>`}
        ${podeMesas && atalho('Mesas', '🍽️', 'mesas')}
        ${podeDelivery && atalho('Delivery', '🛵', 'delivery')}
        ${podeVendas && atalho('Balcão', '🧾', 'vendas/pdv')}
        ${(podeVendas || podeMesas) && window.RestCardapio && html`<button type="button" className="rest-atalho" title="Abrir o cardápio digital (como o cliente vê)" onClick=${() => window.RestCardapio.abrir()}>
          <span aria-hidden="true">📱</span><span className="rest-atalho-txt">Cardápio</span></button>`}
      </div>`;
  }
  // Tempo desde a abertura do caixa: "há 25 min", "há 1 h 38 min"
  const haQuanto = iso => { const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000)); return min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`; };

  // ---- Barra superior: título, saudação, status do caixa e operador ----
  // Menu lateral escondido ou à mostra: lembrado neste navegador (mga_menuOculto)
  // No celular o sistema abre com o menu escondido (o botão ☰ mostra)
  const lerMenuOculto = () => { if (window.matchMedia?.('(max-width: 980px)').matches) return true; try { return localStorage.getItem('mga_menuOculto') === '1'; } catch (e) { return false; } };
  function BarraSuperior({rota, menuOculto, alternarMenu}){
    useDados();
    const [agora, setAgora] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setAgora(new Date()), 60000); return () => clearInterval(t); }, []);
    const u = D.sessaoAtual();
    if (!u) return null;
    const h = agora.getHours();
    const saudacao = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const cx = D.caixaAberto();
    const desde = cx && new Date(cx.abertura).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
    const podeCaixa = D.podeAcessar('vendas');
    return html`
      <header className="topbar">
        <button type="button" className="rest-btn-menu" onClick=${alternarMenu} aria-expanded=${!menuOculto} aria-controls="sidebar"
          title=${menuOculto ? 'Mostrar o menu' : 'Esconder o menu'} aria-label=${menuOculto ? 'Mostrar o menu' : 'Esconder o menu'}>
          <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
        </button>
        <div className="rest-topo-esq">
          <h1>${ROTAS[rota].titulo}</h1>
          <span className="rest-saudacao">${u.master ? `${saudacao}! Modo suporte` : `${saudacao}, ${u.nome.split(' ')[0]}!`}</span>
        </div>
        <div className="topbar-right">
          <button type="button" className=${'rest-caixa ' + (cx ? 'aberto' : 'fechado')} disabled=${!podeCaixa} onClick=${() => ir('vendas/caixa')}
            title=${cx ? `Caixa #${cx.numero} · operador ${cx.operador} · aberto em ${desde}` : 'Nenhum caixa aberto'}>
            <span className="rest-caixa-ponto" aria-hidden="true"></span>${cx ? 'Caixa aberto' : 'Caixa fechado'}
            ${cx && html`<small>#${cx.numero} · ${cx.operador.split(' ')[0]} · aberto ${haQuanto(cx.abertura)}</small>`}
          </button>
          <${Atalhos} />
          <${BotaoTema} />
          ${!u.master && html`<div className="who" title=${`${u.nome} (${u.login}) · ${D.PERFIS[u.perfil].nome}`}>
            <span className="rest-who-txt"><b>${u.nome}</b><small>${D.PERFIS[u.perfil].nome}</small></span>
            <div className="avatar" aria-hidden="true">${u.nome.slice(0, 2).toUpperCase()}</div>
          </div>`}
        </div>
      </header>`;
  }

  // Seções das próximas fases
  function TelaEmBreve({rota}){
    const m = EM_BREVE[rota];
    return html`
      <div className="card rest-breve-card">
        <span className="rest-breve-ic" aria-hidden="true">${m.ic}</span>
        <h2>${m.nome}</h2>
        <p>${m.texto}</p>
        <span className="badge b-wait">Fase ${m.fase} do desenvolvimento</span>
        <button type="button" className="btn btn-ghost" onClick=${() => ir('dashboard')}>Voltar ao Dashboard</button>
      </div>`;
  }
  const SemAcesso = ({rota}) => html`
    <div className="card rest-breve-card">
      <span className="rest-breve-ic" aria-hidden="true">🔒</span>
      <h2>Sem acesso</h2>
      <p>Seu usuário não tem permissão para ${ROTAS[rota].titulo}. Peça ao administrador para liberar o módulo em Cadastros › Usuários.</p>
      <button type="button" className="btn btn-ghost" onClick=${() => ir('dashboard')}>Voltar ao Dashboard</button>
    </div>`;

  function App(){
    useDados();
    const [{rota, params}, setLocal] = useState(lerRota);
    const [aberto, setAberto] = useState(ROTAS[rota].grupo);
    const [menuOculto, setMenuOculto] = useState(lerMenuOculto);
    const alternarMenu = () => setMenuOculto(o => { try { localStorage.setItem('mga_menuOculto', o ? '0' : '1'); } catch (e) { /* storage indisponível */ } return !o; });
    useEffect(() => {
      const mudou = () => {
        const l = lerRota(); setLocal(l); setAberto(g => ROTAS[l.rota].grupo || g); window.scrollTo(0, 0);
        // Celular: o menu fica em cima da tela; depois de escolher, esconde para mostrar a tela
        if (window.matchMedia?.('(max-width: 980px)').matches) setMenuOculto(true);
      };
      window.addEventListener('hashchange', mudou);
      return () => window.removeEventListener('hashchange', mudou);
    }, []);
    useEffect(() => { document.title = `${D.nomeMarca()} | ${ROTAS[rota].titulo}`; }, [rota, D.nomeMarca()]);
    // Usuário desativado ou sessão encerrada durante o uso
    if (!D.sessaoAtual()) { location.replace('login.html'); return null; }
    const Tela = window.RestUI.telas[rota];
    return html`
      ${!menuOculto && html`<${MenuLateral} rota=${rota} aberto=${aberto} setAberto=${setAberto} />`}
      <div className=${'main' + (['vendas/pdv', 'mesas/pedido', 'delivery/novo'].includes(rota) ? ' rest-main-pdv' : '') + (rota === 'vendas/cozinha' ? ' rest-main-cozinha' : '')}>
        <${BarraSuperior} rota=${rota} menuOculto=${menuOculto} alternarMenu=${alternarMenu} />
        <main className="content">
          ${!pode(rota) ? html`<${SemAcesso} rota=${rota} />` : Tela ? html`<${Tela} key=${rota === 'mesas/pedido' ? rota + params.id : rota} params=${params} ir=${ir} />` : html`<${TelaEmBreve} rota=${rota} />`}
        </main>
      </div>`;
  }

  // Com o Supabase, a tela espera os cadastros chegarem do banco (restaurante-nuvem.js)
  raiz.innerHTML = '<div class="nuvem-carregando">Carregando…</div>';
  Promise.resolve(window.MGA_PRONTO).finally(() => { raiz.innerHTML = ''; ReactDOM.createRoot(raiz).render(html`<${App} />`); });
})();
