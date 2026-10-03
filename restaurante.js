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
      ['cad/produtos', 'Produtos'], ['cad/grupos', 'Categorias'], ['cad/mesas', 'Mesas'], ['cad/clientes', 'Clientes'], ['cad/entregadores', 'Entregadores'],
      ['cad/formas', 'Formas de pagamento'], ['cad/usuarios', 'Usuários', 'configuracoes']]},
    // Vendas: Mesas (salão) e Delivery (WhatsApp/telefone) no topo; depois balcão e caixa.
    // Cada item: [rota, nome, módulo (se diferente do grupo), dica]
    {grupo: 'vendas', nome: 'Vendas', ic: '🧾', modulo: 'vendas', itens: [
      ['mesas', 'Mesas', 'mesas', 'Vendas das mesas do salão'],
      ['delivery', 'Delivery', 'delivery', 'Pedidos feitos pelo WhatsApp ou por telefone'],
      ['vendas/pdv', 'Venda balcão'], ['vendas/caixa', 'Caixa'], ['vendas/lista', 'Vendas realizadas'], ['vendas/caixas', 'Caixas anteriores']]},
    {grupo: 'est', nome: 'Estoque', ic: '📦', modulo: 'estoque', itens: [['estoque', 'Posição do estoque'], ['estoque/movimentos', 'Movimentações']]},
    {grupo: 'fin', nome: 'Financeiro', ic: '💰', modulo: 'financeiro', itens: [['fin/pagar', 'Contas a pagar'], ['fin/receber', 'Contas a receber'], ['fin/categorias', 'Categorias financeiras']]},
    {rota: 'relatorios', nome: 'Relatórios', ic: '📈', modulo: 'relatorios'},
    {grupo: 'config', nome: 'Configurações', ic: '⚙️', modulo: 'configuracoes', itens: [['config/restaurante', 'Restaurante'], ['config/auditoria', 'Auditoria'], ['config/dados', 'Dados do sistema']]}
  ];
  const EM_BREVE = {
    relatorios: {nome: 'Relatórios', ic: '📈', fase: 6, texto: 'Vendas, caixa, delivery e produtos por período, operador e forma de pagamento.'}
  };
  const ROTAS = {};
  MENU.forEach(m => m.itens
    ? m.itens.forEach(([r, n, mod, dica]) => { ROTAS[r] = {titulo: `${m.nome} › ${n}`, modulo: mod || m.modulo, grupo: m.grupo, dica}; })
    : (ROTAS[m.rota] = {titulo: m.nome, modulo: m.modulo, grupo: null}));
  // Rotas fora do menu (abertas a partir de outra tela)
  ROTAS['mesas/pedido'] = {titulo: 'Vendas › Mesas › Pedido', modulo: 'mesas', grupo: 'vendas', pai: 'mesas'};
  ROTAS['delivery/novo'] = {titulo: 'Vendas › Delivery › Novo pedido', modulo: 'delivery', grupo: 'vendas', pai: 'delivery'};
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
  function sair(){ D.encerrarSessao(); location.replace('login.html'); }
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
  function MenuLateral({rota, aberto, setAberto}){
    useDados();
    // Contadores de alerta nos grupos: contas vencidas e produtos no mínimo ou abaixo
    const alertas = {
      fin: D.podeAcessar('financeiro') ? [D.contas().filter(D.contaVencida).length, 'conta(s) vencida(s)'] : [0],
      est: D.podeAcessar('estoque') ? [D.produtos().filter(p => p.ativo && D.estoqueBaixo(p)).length, 'produto(s) no estoque mínimo ou abaixo'] : [0]
    };
    const visiveis = MENU.map(m => m.itens ? {...m, itens: m.itens.filter(([r]) => pode(r))} : m)
      .filter(m => m.itens ? m.itens.length : D.podeAcessar(m.modulo));
    return html`
      <aside className="sidebar" id="sidebar">
        <button type="button" className="brand" onClick=${() => ir('dashboard')} title="Ir para o Dashboard"><span className="dot"></span>MGA</button>
        <nav className="nav" aria-label="Menu principal">
          ${visiveis.map(m => m.itens
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
              </button>`)}
        </nav>
        <button type="button" className="logout-btn" onClick=${sair}><span className="ic">↪</span>Sair</button>
        <div className="sidebar-foot">MGA Restaurante<br />v3.0 · 100% Web</div>
      </aside>`;
  }

  // ---- Barra superior: título, saudação, status do caixa e operador ----
  function BarraSuperior({rota}){
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
        <div className="rest-topo-esq">
          <h1>${ROTAS[rota].titulo}</h1>
          <span className="rest-saudacao">${saudacao}, ${u.nome.split(' ')[0]}!</span>
        </div>
        <div className="topbar-right">
          <button type="button" className=${'rest-caixa ' + (cx ? 'aberto' : 'fechado')} disabled=${!podeCaixa} onClick=${() => ir('vendas/caixa')}
            title=${cx ? `Caixa #${cx.numero} · operador ${cx.operador} · aberto em ${desde}` : 'Nenhum caixa aberto'}>
            <span className="rest-caixa-ponto" aria-hidden="true"></span>${cx ? 'Caixa aberto' : 'Caixa fechado'}
            ${cx && html`<small>#${cx.numero} · ${cx.operador.split(' ')[0]} · desde ${desde}</small>`}
          </button>
          <${BotaoTema} />
          <div className="who" title=${`${u.nome} (${u.login}) · ${D.PERFIS[u.perfil].nome}`}>
            <span className="rest-who-txt"><b>${u.nome}</b><small>${D.PERFIS[u.perfil].nome}</small></span>
            <div className="avatar" aria-hidden="true">${u.nome.slice(0, 2).toUpperCase()}</div>
          </div>
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
    useEffect(() => {
      const mudou = () => { const l = lerRota(); setLocal(l); setAberto(g => ROTAS[l.rota].grupo || g); window.scrollTo(0, 0); };
      window.addEventListener('hashchange', mudou);
      return () => window.removeEventListener('hashchange', mudou);
    }, []);
    useEffect(() => { document.title = `MGA | ${ROTAS[rota].titulo}`; }, [rota]);
    // Usuário desativado ou sessão encerrada durante o uso
    if (!D.sessaoAtual()) { location.replace('login.html'); return null; }
    const Tela = window.RestUI.telas[rota];
    return html`
      <${MenuLateral} rota=${rota} aberto=${aberto} setAberto=${setAberto} />
      <div className=${'main' + (['vendas/pdv', 'mesas/pedido', 'delivery/novo'].includes(rota) ? ' rest-main-pdv' : '')}>
        <${BarraSuperior} rota=${rota} />
        <main className="content">
          ${!pode(rota) ? html`<${SemAcesso} rota=${rota} />` : Tela ? html`<${Tela} key=${rota} params=${params} ir=${ir} />` : html`<${TelaEmBreve} rota=${rota} />`}
        </main>
      </div>`;
  }

  ReactDOM.createRoot(raiz).render(html`<${App} />`);
})();
