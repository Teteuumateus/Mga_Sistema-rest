// =====================================================================
// ---- 📱 MGA · Cardápio digital: configuração, pedidos da mesa e chamados ----
// =====================================================================
// O cliente usa cardapio.html (sem login). Aqui, a equipe:
//  · Cardápio digital: link e QR Codes das mesas, prévia, quais produtos aparecem e em que ordem.
//  · Pedidos do cardápio: pedidos (com status), chamados de garçom e pedidos de conta, com aviso sonoro.
// Pedido novo entra sozinho na conta da mesa (RestDados.lancarPedidoCardapio): só um computador lança
// (cardapio_aceitar no banco), e só quem tem o módulo Mesas com o caixa aberto.
// Tudo isto precisa do Supabase (modo nuvem); sem ele as telas explicam.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect} = React;
  const {html, D, useDados, useAviso, Cabecalho, Campo, Modal, Segmentos, confirmar, plural} = window.RestUI;
  const supa = window.supa;
  const STATUS = {NOVO: 'Novo pedido', PREPARANDO: 'Em preparação', PRONTO: 'Pronto', ENTREGUE: 'Entregue', FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado'};
  const ORDEM = ['NOVO', 'PREPARANDO', 'PRONTO', 'ENTREGUE', 'FINALIZADO'];
  const BADGE = {NOVO: 'rest-b-vencida', PREPARANDO: 'b-wait', PRONTO: 'b-ok', ENTREGUE: 'rest-b-aberta', FINALIZADO: 'rest-b-venda', CANCELADO: 'rest-b-venda'};
  const PROXIMO = {NOVO: ['PREPARANDO', 'Em preparação'], PREPARANDO: ['PRONTO', 'Pronto'], PRONTO: ['ENTREGUE', 'Entregue'], ENTREGUE: ['FINALIZADO', 'Finalizar']};
  const haQuanto = iso => { const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000)); return min < 1 ? 'agora' : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)} h ${min % 60} min`; };
  const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});

  // =====================================================================
  // ---- Pedidos e chamados vindos do banco (tempo real) ----
  const RC = {ativo: false, pedidos: [], chamados: [], codigo: null, erro: ''};
  const ouvintes = new Set();
  const avisar = () => ouvintes.forEach(fn => fn());
  const emAndamento = new Set();
  const nuvem = () => !!(window.MGA_NUVEM?.ativa && supa);
  RC.on = fn => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
  RC.pendentes = () => RC.pedidos.filter(p => p.status === 'NOVO').length + RC.chamados.filter(c => c.status === 'PENDENTE').length;
  const doBanco = p => ({...p, itens: p.itens || []});
  const LIMITE_AUTOMATICO = 30 * 60000; // pedido com mais de 30 min sem entrar na mesa: só manualmente
  // Entra sozinho na conta: feito pelo QR Code da mesa (com a chave) e recente
  const automatico = p => !p.confirmar && Date.now() - new Date(p.criado_em) < LIMITE_AUTOMATICO;
  const vistos = new Set(); // pedidos/chamados já avisados (o aviso sai uma vez, venha do tempo real ou da conferência)

  async function carregar(){
    const desde = new Date(Date.now() - 24 * 3600000).toISOString();
    const [a, b] = await Promise.all([
      supa.from('cardapio_pedidos').select('*').or(`status.in.(NOVO,PREPARANDO,PRONTO,ENTREGUE),criado_em.gte."${desde}"`).order('criado_em', {ascending: false}).limit(300),
      supa.from('cardapio_chamados').select('*').or(`status.eq.PENDENTE,criado_em.gte."${desde}"`).order('criado_em', {ascending: false}).limit(200)
    ]);
    if (a.error || b.error) throw new Error((a.error || b.error).message);
    // Conferência de 30 em 30 s: avisa o que chegou e o tempo real não trouxe (a primeira carga não avisa)
    if (RC.carregado) {
      a.data.filter(p => p.status === 'NOVO' && !vistos.has(p.id)).forEach(p => notificar(`Mesa ${p.mesa_numero} · novo pedido #${p.numero}${p.confirmar ? ' (confirmar)' : ''}`));
      b.data.filter(c => c.status === 'PENDENTE' && !vistos.has(c.id)).forEach(c => notificar(c.tipo === 'CONTA' ? `Mesa ${c.mesa_numero} pediu a conta` : `Mesa ${c.mesa_numero} chamou o garçom`));
    }
    [...a.data, ...b.data].forEach(x => vistos.add(x.id));
    RC.carregado = true;
    RC.pedidos = a.data.map(doBanco); RC.chamados = b.data; RC.erro = '';
    avisar();
    processar();
  }
  async function atualizarPedido(id, campos){
    const {error} = await supa.from('cardapio_pedidos').update({...campos, atualizado_em: new Date().toISOString()}).eq('id', id);
    if (error) throw new Error(error.message);
    const p = RC.pedidos.find(x => x.id === id); if (p) Object.assign(p, campos);
    avisar();
  }
  async function atualizarChamado(id, campos){
    const {error} = await supa.from('cardapio_chamados').update(campos).eq('id', id);
    if (error) throw new Error(error.message);
    const c = RC.chamados.find(x => x.id === id); if (c) Object.assign(c, campos);
    avisar();
  }
  RC.mudarStatus = (p, status) => atualizarPedido(p.id, {status});
  RC.atender = c => atualizarChamado(c.id, {status: 'ATENDIDO', atendido_em: new Date().toISOString(), atendido_por: D.usuario()});
  // Lançar de novo (deu erro ou o computador que pegou fechou antes de lançar)
  RC.relancar = async p => {
    if (!D.caixaAberto()) throw new Error('Abra o caixa para lançar o pedido na mesa.');
    if (!D.podeAcessar('mesas')) throw new Error('Seu usuário não tem acesso às Mesas.');
    await atualizarPedido(p.id, {aceito_em: null, aceito_por: null, erro: null});
    return lancar(RC.pedidos.find(x => x.id === p.id), {manual: true});
  };

  // Pedido novo → conta da mesa (só um computador consegue pegar cada pedido)
  async function lancar(p, {manual = false} = {}){
    if (!p || p.status !== 'NOVO' || p.aceito_em || p.venda_id || emAndamento.has(p.id)) return;
    if (!manual && !automatico(p)) return; // espera a equipe confirmar
    if (!D.podeAcessar('mesas') || !D.caixaAberto()) return;
    emAndamento.add(p.id);
    try {
      // A mesa pode ter conta aberta em outro computador que ainda não chegou aqui: espera sincronizar
      if (p.mesa_id && !D.vendaDaMesa(p.mesa_id)) {
        const {data: abertas} = await supa.from('vendas').select('id').eq('mesa_id', p.mesa_id).eq('status', 'ABERTA').limit(1);
        if (abertas?.length && !D.vendaPorId(abertas[0].id)) return;
      }
      const {data: meu, error} = await supa.rpc('cardapio_aceitar', {p_pedido: p.id});
      if (error) throw new Error(error.message);
      if (!meu) return; // outro computador pegou
      p.aceito_em = new Date().toISOString();
      let v;
      try { v = D.lancarPedidoCardapio({numero: p.numero, mesaId: p.mesa_id, mesaNumero: p.mesa_numero, itens: p.itens, obs: p.obs}); }
      catch (e) {
        await atualizarPedido(p.id, {erro: e.message || String(e)}).catch(x => console.error('Cardápio:', x));
        notificar(`Pedido #${p.numero} da mesa ${p.mesa_numero} não entrou na conta: ${e.message}`, true);
        return;
      }
      // Já está na conta: se a gravação falhar, tenta de novo (o lançamento não se repete)
      for (let k = 0; k < 5; k++) {
        try { await atualizarPedido(p.id, {venda_id: v.id, erro: null}); break; }
        catch (e) { p.venda_id = v.id; await new Promise(r => setTimeout(r, 3000 * (k + 1))); }
      }
    } catch (e) { console.error('Cardápio:', e); }
    finally { emAndamento.delete(p.id); }
  }
  // Acompanha a conta da mesa: venda fechada/cancelada e itens prontos na cozinha mudam o status do pedido
  function acompanhar(p){
    const v = p.venda_id && D.vendaPorId(p.venda_id);
    if (!v || ['FINALIZADO', 'CANCELADO'].includes(p.status)) return;
    let novo = null;
    if (v.status === 'FINALIZADA') novo = 'FINALIZADO';
    else if (v.status === 'CANCELADA') novo = 'CANCELADO';
    else {
      const daCozinha = v.itens.filter(i => i.cardapio === p.numero && i.preparo);
      if (daCozinha.length) {
        const est = daCozinha.map(i => i.preparo.estado);
        const s = est.every(x => x === 'ENTREGUE') ? 'ENTREGUE' : est.every(x => ['PRONTO', 'ENTREGUE'].includes(x)) ? 'PRONTO' : est.some(x => x !== 'FILA') ? 'PREPARANDO' : null;
        if (s && ORDEM.indexOf(s) > ORDEM.indexOf(p.status)) novo = s;
      }
    }
    if (novo) atualizarPedido(p.id, {status: novo}).catch(e => console.error('Cardápio:', e));
  }
  let tProcessar = null;
  function processar(){
    clearTimeout(tProcessar);
    tProcessar = setTimeout(() => {
      if (!RC.ativo) return;
      RC.pedidos.filter(p => p.status === 'NOVO' && !p.aceito_em).sort((a, b) => a.numero - b.numero).forEach(lancar);
      RC.pedidos.forEach(acompanhar);
    }, 300);
  }

  // ---- Aviso na tela + som ----
  let elAvisos = null;
  function bip(){
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t, k) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = k ? 1046 : 784; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18); });
      setTimeout(() => ctx.close(), 800);
    } catch (e) { /* sem som */ }
  }
  function notificar(texto, erro){
    if (!elAvisos) { elAvisos = document.createElement('div'); elAvisos.className = 'rest-cd-avisos'; elAvisos.setAttribute('aria-live', 'assertive'); document.body.appendChild(elAvisos); }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'rest-cd-aviso' + (erro ? ' erro' : '');
    b.innerHTML = '<span aria-hidden="true">🔔</span><span></span><small>ver</small>';
    b.children[1].textContent = texto;
    b.onclick = () => { b.remove(); location.hash = '/vendas/cardapio'; };
    elAvisos.prepend(b);
    setTimeout(() => b.remove(), 20000);
    bip();
  }

  // ---- Tempo real ----
  function aoMudar(tabela, payload){
    const n = payload.new;
    if (!n?.id) return;
    if (tabela === 'cardapio_pedidos') {
      const i = RC.pedidos.findIndex(p => p.id === n.id);
      if (i < 0) { RC.pedidos.unshift(doBanco(n)); if (n.status === 'NOVO' && !vistos.has(n.id)) notificar(`Mesa ${n.mesa_numero} · novo pedido #${n.numero}${n.confirmar ? ' (confirmar)' : ''}`); vistos.add(n.id); }
      else RC.pedidos[i] = {...RC.pedidos[i], ...doBanco(n)};
    } else {
      const i = RC.chamados.findIndex(c => c.id === n.id);
      if (i < 0) {
        RC.chamados.unshift(n);
        const novo = !vistos.has(n.id); vistos.add(n.id);
        if (n.status === 'PENDENTE' && novo) {
          notificar(n.tipo === 'CONTA' ? `Mesa ${n.mesa_numero} pediu a conta` : `Mesa ${n.mesa_numero} chamou o garçom`);
          // Pediu a conta: a mesa aparece com "conta pedida" na tela de Mesas
          const v = n.tipo === 'CONTA' && n.mesa_id && D.vendaDaMesa(n.mesa_id);
          if (v && !n.confirmar && !v.contaPedida && D.podeAcessar('mesas') && v.itens.length) try { D.pedirConta(v.id, true); } catch (e) { /* segue */ }
        }
      } else RC.chamados[i] = {...RC.chamados[i], ...n};
    }
    avisar(); processar();
  }
  async function iniciar(){
    const u = D.sessaoAtual();
    if (!nuvem() || !u?.empresaId) return;
    RC.ativo = true;
    try { await carregar(); } catch (e) { RC.erro = /cardapio_pedidos|does not exist|schema cache/.test(e.message) ? 'migracao' : e.message; avisar(); return; }
    if (supa.channel) {
      supa.channel('cardapio-' + u.empresaId)
        .on('postgres_changes', {event: '*', schema: 'public', table: 'cardapio_pedidos', filter: 'empresa_id=eq.' + u.empresaId}, p => aoMudar('cardapio_pedidos', p))
        .on('postgres_changes', {event: '*', schema: 'public', table: 'cardapio_chamados', filter: 'empresa_id=eq.' + u.empresaId}, p => aoMudar('cardapio_chamados', p))
        .subscribe();
    }
    // Garantia se o tempo real cair: confere de tempos em tempos
    setInterval(() => carregar().catch(() => {}), 30000);
    D.on(processar); // caixa aberto, venda fechada, cozinha andou...
  }
  Promise.resolve(window.MGA_PRONTO).then(() => iniciar());
  window.RestCardapio = RC;
  RC._iniciar = iniciar; RC._receber = aoMudar; // usados pelos testes automáticos
  // Para o menu: número de pedidos novos + chamados pendentes
  window.RestUI.useCardapioWeb = () => { const [, set] = useState(0); useEffect(() => RC.on(() => set(x => x + 1)), []); return RC; };

  // Link do cardápio: o mesmo endereço do sistema trocando a página
  const linkCardapio = (codigo, mesa, chave) => codigo ? new URL('cardapio.html?e=' + codigo + (mesa ? '&m=' + encodeURIComponent(mesa) : '') + (chave ? '&k=' + encodeURIComponent(chave) : ''), location.href).href : '';
  // Chave secreta de cada mesa (vai só no QR Code): pedido com ela entra sozinho na conta
  async function chavesDasMesas(){
    const {data, error} = await supa.from('mesas').select('id, cardapio_chave');
    if (error) return {};
    return Object.fromEntries(data.map(m => [m.id, m.cardapio_chave]));
  }
  // Abre o cardápio do cliente numa aba nova (a aba abre na hora do clique, senão o navegador bloqueia)
  RC.abrir = async () => {
    if (!nuvem()) { location.hash = '/cardapio'; return; }
    const aba = window.open('about:blank', '_blank');
    try {
      if (!RC.codigo) {
        const {data, error} = await supa.rpc('cardapio_ativar');
        if (error) throw new Error(error.message);
        RC.codigo = data;
      }
      if (aba) aba.location.href = linkCardapio(RC.codigo); else window.open(linkCardapio(RC.codigo), '_blank');
    } catch (e) { aba?.close(); location.hash = '/cardapio'; }
  };
  const linkPublicado = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname);

  function SemNuvem({texto}){
    return html`<div className="card rest-breve-card"><span className="rest-breve-ic" aria-hidden="true">📱</span><h2>Cardápio digital</h2>
      <p>${texto}</p></div>`;
  }
  const AvisoMigracao = () => html`<p className="rest-imp-alerta">Falta preparar o banco para o cardápio: rode a etapa 8 (cardápio digital) de <b>supabase/schema.sql</b> no SQL Editor do Supabase e recarregue a página.</p>`;

  // =====================================================================
  // ---- Tela: Pedidos do cardápio ----
  function TelaPedidos({ir}){
    useDados();
    window.RestUI.useCardapioWeb();
    const {el: aviso, mostrar} = useAviso();
    const [filtro, setFiltro] = useState('abertos');
    const [, tique] = useState(0);
    useEffect(() => { const t = setInterval(() => tique(x => x + 1), 30000); return () => clearInterval(t); }, []);
    if (!nuvem()) return html`<${SemNuvem} texto="Os pedidos do cardápio digital chegam pela internet: entre no sistema com o seu e-mail (modo nuvem) para recebê-los." />`;
    const fazer = (fn, ok) => Promise.resolve().then(fn).then(() => ok && mostrar(ok), e => mostrar(e.message, true));
    const chamados = RC.chamados.filter(c => c.status === 'PENDENTE');
    const lista = RC.pedidos.filter(p => filtro === 'abertos' ? !['FINALIZADO', 'CANCELADO'].includes(p.status) : true);
    const esperando = RC.pedidos.filter(p => p.status === 'NOVO' && !p.venda_id && !p.erro);
    // Ainda não entrou na conta: precisa confirmar (sem QR / antigo), deu erro ou o computador que pegou parou
    const travado = p => p.status === 'NOVO' && !p.venda_id && (p.erro || !automatico(p) || (p.aceito_em && Date.now() - new Date(p.aceito_em) > 90000));
    const abrirMesa = mesaId => { const v = mesaId && D.vendaDaMesa(mesaId); v ? ir('mesas/pedido', {id: v.id}) : ir('mesas'); };
    const cancelar = p => { if (confirmar(`Cancelar o pedido #${p.numero} da mesa ${p.mesa_numero}?${p.venda_id ? '\n\nOs itens continuam na conta da mesa: tire por lá, se for o caso.' : ''}`)) fazer(() => RC.mudarStatus(p, 'CANCELADO'), `Pedido #${p.numero} cancelado.`); };
    return html`
      <${Cabecalho} titulo="Pedidos do cardápio" sub="Pedidos feitos pelo cliente na mesa, chamados de garçom e pedidos de conta">
        ${D.podeAcessar('cadastros') && html`<button type="button" className="btn btn-ghost" onClick=${() => ir('cardapio')}>Configurar cardápio</button>`}
        <button type="button" className="btn" onClick=${RC.abrir}>📱 Abrir cardápio</button>
      <//>
      ${aviso}
      ${RC.erro === 'migracao' && html`<${AvisoMigracao} />`}
      ${RC.erro && RC.erro !== 'migracao' && html`<p className="rest-imp-alerta">Não foi possível carregar os pedidos: ${RC.erro}</p>`}
      ${esperando.length > 0 && !D.caixaAberto() && html`<p className="rest-imp-alerta">${plural(esperando.length, 'pedido esperando', 'pedidos esperando')}: abra o caixa para os pedidos entrarem nas contas das mesas.</p>`}
      ${chamados.length > 0 && html`
        <section className="rest-cd-chamados" aria-label="Chamados das mesas">
          ${chamados.map(c => html`<div key=${c.id} className=${'rest-cd-chamado ' + (c.tipo === 'CONTA' ? 'conta' : 'garcom')}>
            <span className="rest-cd-chamado-ic" aria-hidden="true">${c.tipo === 'CONTA' ? '🧾' : '🙋'}</span>
            <span><b>Mesa ${c.mesa_numero}</b> ${c.tipo === 'CONTA' ? 'pediu a conta' : 'chamou o garçom'}${c.confirmar ? ' (pelo link geral)' : ''}<small>${haQuanto(c.criado_em)}${c.tipo === 'CONTA' && D.vendaDaMesa(c.mesa_id) ? ` · conta ${D.moedaBR(D.totaisVenda(D.vendaDaMesa(c.mesa_id)).total)}` : ''}</small></span>
            ${c.tipo === 'CONTA' && html`<button type="button" className="btn btn-ghost" onClick=${() => abrirMesa(c.mesa_id)}>Abrir conta</button>`}
            <button type="button" className="btn" onClick=${() => fazer(() => RC.atender(c), `Mesa ${c.mesa_numero} atendida.`)}>Atendido</button>
          </div>`)}
        </section>`}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Mostrar" opcoes=${[['abertos', 'Em aberto'], ['todos', 'Últimas 24 horas']]} valor=${filtro} onChange=${setFiltro} />
      </div>
      ${!lista.length ? html`<div className="card rest-cd-vazio">${filtro === 'abertos' ? 'Nenhum pedido em aberto. Quando um cliente pedir pelo cardápio, ele aparece aqui com um aviso sonoro.' : 'Nenhum pedido nas últimas 24 horas.'}</div>`
        : html`<div className="rest-cd-grade">${lista.map(p => html`
          <article key=${p.id} className=${'card rest-cd-pedido' + (p.status === 'NOVO' ? ' novo' : '')}>
            <header><b>#${p.numero} · Mesa ${p.mesa_numero}</b><span className=${'badge ' + BADGE[p.status]}>${STATUS[p.status]}</span></header>
            <small className="rest-cod">${hora(p.criado_em)} · ${haQuanto(p.criado_em)}${p.venda_id ? ' · na conta da mesa' : ''}</small>
            ${!p.venda_id && p.status === 'NOVO' && p.confirmar && html`<p className="rest-imp-alerta">Feito pelo link geral (sem o QR Code da mesa): confira com a mesa ${p.mesa_numero} antes de lançar.</p>`}
            <ul>${p.itens.map((i, k) => html`<li key=${k}><b>${i.quantidade}x</b> ${i.nome}${i.tamanho ? ` (${i.tamanho})` : ''}
              ${(i.adicionais || []).length > 0 && html`<small>+ ${i.adicionais.map(a => a.nome).join(', ')}</small>`}${i.observacao && html`<small>Obs.: ${i.observacao}</small>`}</li>`)}</ul>
            ${p.obs && html`<p className="rest-cd-obs">Observação: ${p.obs}</p>`}
            ${p.erro && html`<p className="rest-imp-alerta">Não entrou na conta: ${p.erro}</p>`}
            <div className="rest-cd-total"><span>Total</span><b>${D.moedaBR(p.total)}</b></div>
            <footer>
              ${travado(p) && D.podeAcessar('mesas') && html`<button type="button" className="btn" onClick=${() => fazer(() => RC.relancar(p), 'Pedido lançado na conta da mesa.')}>${!p.erro && p.confirmar ? 'Confirmar e lançar na mesa' : 'Lançar na mesa'}</button>`}
              ${PROXIMO[p.status] && (p.venda_id || p.status !== 'NOVO') && html`<button type="button" className="btn" onClick=${() => fazer(() => RC.mudarStatus(p, PROXIMO[p.status][0]), `#${p.numero}: ${STATUS[PROXIMO[p.status][0]]}.`)}>${PROXIMO[p.status][1]}</button>`}
              <button type="button" className="btn btn-ghost" onClick=${() => abrirMesa(p.mesa_id)}>Mesa</button>
              ${!['FINALIZADO', 'CANCELADO'].includes(p.status) && html`<button type="button" className="btn btn-ghost rest-cd-cancelar" onClick=${() => cancelar(p)}>Cancelar</button>`}
            </footer>
          </article>`)}</div>`}`;
  }

  // =====================================================================
  // ---- Tela: Cardápio digital (configuração) ----
  // QR Code: biblioteca baixada só quando usada
  let qrLib = null;
  const carregarQr = () => window.qrcode ? Promise.resolve(window.qrcode) : (qrLib ||= new Promise((ok, falha) => {
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
    s.onload = () => ok(window.qrcode); s.onerror = () => { qrLib = null; falha(new Error('Não foi possível baixar o gerador de QR Code. Confira a internet.')); };
    document.head.appendChild(s);
  }));
  const qrSvg = (qrcode, texto) => { const q = qrcode(0, 'M'); q.addData(texto); q.make(); return q.createSvgTag({cellSize: 5, margin: 2, scalable: true}); };
  async function imprimirQr(codigo){
    const qrcode = await carregarQr();
    const chaves = await chavesDasMesas();
    const mesas = D.mesas().filter(m => m.ativo);
    const esc = v => String(v).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
    const w = window.open('', '_blank');
    if (!w) throw new Error('O navegador bloqueou a janela de impressão. Permita pop-ups para este site.');
    w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>QR Codes das mesas · ${esc(D.nomeMarca())}</title><style>
      body{font-family:Inter,system-ui,sans-serif;margin:0;padding:16px;color:#14202e}
      .grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px}
      .qr{border:2px dashed #c9d1dc;border-radius:16px;padding:16px;text-align:center;break-inside:avoid}
      .qr svg{width:180px;height:180px}.qr h2{margin:0 0 4px;font-size:28px}.qr p{margin:6px 0 0;font-size:13px;color:#5f6b7a}.qr b{display:block;font-size:15px}
      @media print{body{padding:0}.dica{display:none}}</style></head><body>
      <p class="dica">Imprima e coloque cada QR Code na mesa correspondente. Ao apontar a câmera, o cliente abre o cardápio já na mesa certa.</p>
      <div class="grade">${mesas.map(m => `<div class="qr"><b>${esc(D.nomeMarca())}</b><h2>Mesa ${esc(m.numero)}</h2>${qrSvg(qrcode, linkCardapio(codigo, m.id, chaves[m.id]))}
        <p>Aponte a câmera do celular para ver o cardápio, fazer o pedido e chamar o garçom.</p></div>`).join('')}</div>
      <script>setTimeout(() => print(), 400)<\/script></body></html>`);
    w.document.close();
  }

  function JanelaProduto({p, onFechar, aviso, tentar}){
    const [f, setF] = useState({nome: p.nome, descricao: p.descricao || '', preco: D.valorBR(p.preco), foto: p.foto || ''});
    const [erroFoto, setErroFoto] = useState('');
    const escolher = e => { const a = e.target.files[0]; e.target.value = ''; if (a) window.RestUI.lerFoto(a).then(foto => setF(x => ({...x, foto})), err => setErroFoto(err.message)); };
    const salvar = () => { if (tentar(() => D.editarNoCardapio(p.id, f), x => `"${x.nome}" atualizado no cardápio.`)) onFechar(); };
    return html`
      <${Modal} titulo=${`Produto no cardápio — ${p.nome}`} onFechar=${onFechar}>
        <form onSubmit=${e => { e.preventDefault(); salvar(); }}>
          <div className="rest-foto-campo">
            <div className="rest-foto-previa">${f.foto ? html`<img src=${f.foto} alt="Foto do produto" />` : html`<span aria-hidden="true">📷</span>`}</div>
            <div className="rest-foto-acoes"><b>Imagem</b><small>Aparece no cardápio do cliente. JPG ou PNG.</small>
              <div className="rest-form-acoes"><label className="btn btn-ghost rest-foto-btn">${f.foto ? 'Trocar' : 'Escolher'}<input type="file" accept="image/*" hidden onChange=${escolher} /></label>
                ${f.foto && html`<button type="button" className="btn btn-ghost" onClick=${() => setF({...f, foto: ''})}>Remover</button>`}</div>
              ${erroFoto && html`<small className="mov-neg">${erroFoto}</small>`}</div>
          </div>
          <div className="form-grid">
            <${Campo} rotulo="Nome" largo><input type="text" maxLength="80" value=${f.nome} onInput=${e => setF({...f, nome: e.target.value})} /><//>
            <${Campo} rotulo=${(p.tamanhos || []).length ? 'Preço (os tamanhos têm preço próprio no cadastro)' : 'Preço (R$)'}><input type="text" inputMode="decimal" value=${f.preco} disabled=${(p.tamanhos || []).length > 0} onInput=${e => setF({...f, preco: e.target.value})} /><//>
            <${Campo} rotulo="Descrição" largo><textarea rows="3" maxLength="300" value=${f.descricao} placeholder="Ingredientes, tamanho da porção..." onInput=${e => setF({...f, descricao: e.target.value})}></textarea><//>
          </div>
          <p className="dv-ajuda">É o mesmo produto do cadastro: a alteração vale no balcão, nas mesas e no delivery. Tamanhos, adicionais e ficha técnica ficam em Cadastros › Produtos.</p>
          ${aviso}
          <div className="cf-acoes"><button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button><button type="submit" className="btn">Salvar</button></div>
        </form>
      <//>`;
  }

  function TelaCardapio({ir}){
    useDados();
    const {el: aviso, tentar, mostrar} = useAviso();
    const [codigo, setCodigo] = useState(RC.codigo);
    const [erroLink, setErroLink] = useState('');
    const [editando, setEditando] = useState(null);
    const [categoria, setCategoria] = useState(null); // {id, nome}
    const [previa, setPrevia] = useState(false);
    const [qr, setQr] = useState(null); // {mesa, svg}
    const cfg = D.config().cardapio || {};
    const [mensagem, setMensagem] = useState(cfg.mensagem || '');
    const online = nuvem();
    useEffect(() => {
      if (!online || codigo) return;
      supa.rpc('cardapio_ativar').then(({data, error}) => {
        if (error) setErroLink(/cardapio_ativar|schema cache|does not exist/.test(error.message) ? 'migracao' : error.message);
        else { RC.codigo = data; setCodigo(data); }
      });
    }, []);
    const link = linkCardapio(codigo);
    const copiar = texto => navigator.clipboard?.writeText(texto).then(() => mostrar('Link copiado.'), () => mostrar('Não foi possível copiar: selecione o link e copie.', true));
    const alternar = () => tentar(() => D.configurarCardapio({ativo: !cfg.ativo, mensagem}), x => x.ativo ? 'Cardápio aberto: os clientes já podem pedir.' : 'Cardápio fechado para pedidos (os clientes ainda veem o cardápio).');
    const verQr = async m => { try { const q = await carregarQr(); const link = linkCardapio(codigo, m.id, (await chavesDasMesas())[m.id]); setQr({mesa: m, link, svg: qrSvg(q, link)}); } catch (e) { mostrar(e.message, true); } };
    const grupos = D.grupos().slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const produtosDe = g => D.produtosDoGrupo(g.id).filter(p => p.ativo && (p.tipo || 'VENDA') !== 'INSUMO')
      .sort((a, b) => (a.ordemCardapio || 9999) - (b.ordemCardapio || 9999) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const mover = (lista, k, d, fn) => { const ids = lista.map(x => x.id); const j = k + d; if (j < 0 || j >= ids.length) return; [ids[k], ids[j]] = [ids[j], ids[k]]; tentar(() => fn(ids)); };
    const visiveis = D.produtos().filter(D.noCardapio).length;
    return html`
      <${Cabecalho} titulo="Cardápio digital" sub="O cliente abre pelo link ou pelo QR Code da mesa, vê os produtos e faz o pedido; ele entra na conta da mesa">
        <button type="button" className="btn btn-ghost" onClick=${() => ir('vendas/cardapio')}>Pedidos do cardápio</button>
        <button type="button" className="btn" disabled=${!codigo} onClick=${() => setPrevia(true)}>Ver prévia</button>
      <//>
      ${aviso}
      ${!online && html`<p className="rest-imp-alerta">O link do cardápio funciona no modo nuvem (entrando com o seu e-mail). Aqui você já pode organizar os produtos.</p>`}
      ${erroLink === 'migracao' && html`<${AvisoMigracao} />`}
      ${erroLink && erroLink !== 'migracao' && html`<p className="rest-imp-alerta">${erroLink}</p>`}
      ${online && codigo && html`
        <section className="card rest-cd-link">
          <div className="rest-cd-link-topo">
            <div><span className=${'badge ' + (cfg.ativo ? 'b-ok' : 'b-wait')}>${cfg.ativo ? 'Recebendo pedidos' : 'Fechado para pedidos'}</span>
              <h3>Link do cardápio</h3><small className="rest-cod">${plural(visiveis, 'produto aparece', 'produtos aparecem')} para o cliente</small></div>
            <button type="button" className=${'btn' + (cfg.ativo ? ' btn-ghost' : '')} onClick=${alternar}>${cfg.ativo ? 'Fechar para pedidos' : 'Abrir para pedidos'}</button>
          </div>
          <div className="rest-cd-link-linha">
            <input type="text" readOnly value=${link} aria-label="Link do cardápio" onFocus=${e => e.target.select()} />
            <button type="button" className="btn btn-ghost" onClick=${() => copiar(link)}>Copiar</button>
            <button type="button" className="btn btn-ghost" onClick=${() => window.open(link, '_blank')}>Abrir</button>
          </div>
          ${!linkPublicado() && html`<p className="dv-ajuda">O sistema ainda está rodando neste computador: o link só funciona para os clientes depois de publicado na internet (servidor/domínio). Até lá, use "Abrir" para testar aqui.</p>`}
          <div className="form-grid">
            <${Campo} rotulo="Recado no topo do cardápio (opcional)" largo>
              <input type="text" maxLength="200" value=${mensagem} placeholder="Ex.: Cozinha aberta até 23h · Wi-Fi: MGA_Clientes" onInput=${e => setMensagem(e.target.value)}
                onBlur=${() => { if (mensagem !== (cfg.mensagem || '')) tentar(() => D.configurarCardapio({ativo: cfg.ativo, mensagem}), 'Recado salvo.'); }} />
            <//>
          </div>
          <div className="rest-cd-mesas">
            <b>QR Code de cada mesa</b><small className="rest-cod">o cliente já entra na mesa certa</small>
            <div className="rest-cd-mesas-lista">${D.mesas().filter(m => m.ativo).map(m => html`<button key=${m.id} type="button" className="btn btn-ghost" onClick=${() => verQr(m)}>Mesa ${m.numero}</button>`)}</div>
            <button type="button" className="btn btn-ghost" onClick=${() => imprimirQr(codigo).catch(e => mostrar(e.message, true))}>🖨 Imprimir QR Codes de todas as mesas</button>
          </div>
        </section>`}
      <div className="rest-cd-cab-lista">
        <h3>Produtos no cardápio</h3>
        <div className="rest-form-acoes">
          <button type="button" className="btn btn-ghost" onClick=${() => setCategoria({id: null, nome: ''})}>+ Categoria</button>
          <button type="button" className="btn btn-ghost" onClick=${() => ir('cad/produtos')}>+ Produto (Cadastros)</button>
        </div>
      </div>
      <p className="dv-ajuda">Os produtos são os mesmos do cadastro. Desmarque "No cardápio" para esconder do cliente sem excluir. Use as setas para mudar a ordem. Adicionais e tamanhos: Cadastros › Produtos e Adicionais e etapas.</p>
      ${grupos.map((g, gk) => { const lista = produtosDe(g); return html`
        <section key=${g.id} className=${'card rest-cd-cat' + (g.ativo ? '' : ' rest-inativo')}>
          <header>
            <div><b>${g.nome}</b><small className="rest-cod">${g.ativo ? plural(lista.filter(D.noCardapio).length, 'no cardápio', 'no cardápio') : 'categoria inativa: não aparece'}</small></div>
            <div className="rest-cd-setas">
              <button type="button" aria-label=${'Subir ' + g.nome} disabled=${gk === 0} onClick=${() => mover(grupos, gk, -1, D.ordenarCategorias)}>↑</button>
              <button type="button" aria-label=${'Descer ' + g.nome} disabled=${gk === grupos.length - 1} onClick=${() => mover(grupos, gk, 1, D.ordenarCategorias)}>↓</button>
              <button type="button" className="btn btn-ghost" onClick=${() => setCategoria({id: g.id, nome: g.nome, ativo: g.ativo, cozinha: g.cozinha !== false})}>Editar</button>
            </div>
          </header>
          ${!lista.length ? html`<p className="dv-ajuda">Nenhum produto de venda nesta categoria.</p>` : html`<ul className="rest-cd-produtos">${lista.map((p, k) => html`
            <li key=${p.id} className=${D.noCardapio(p) ? '' : 'fora'}>
              <span className="rest-cd-foto">${p.foto ? html`<img src=${p.foto} alt="" />` : '🍽️'}</span>
              <span className="rest-cd-nome"><b>${p.nome}</b><small>${(p.tamanhos || []).length ? 'a partir de ' + D.moedaBR(Math.min(...p.tamanhos.map(t => t.preco))) : D.moedaBR(p.preco)}${p.descricao ? ' · ' + p.descricao : ''}</small></span>
              <label className="rest-check"><input type="checkbox" checked=${D.noCardapio(p)} onChange=${e => tentar(() => D.mostrarNoCardapio(p.id, e.target.checked))} /> No cardápio</label>
              <span className="rest-cd-setas">
                <button type="button" aria-label=${'Subir ' + p.nome} disabled=${k === 0} onClick=${() => mover(lista, k, -1, D.ordenarCardapio)}>↑</button>
                <button type="button" aria-label=${'Descer ' + p.nome} disabled=${k === lista.length - 1} onClick=${() => mover(lista, k, 1, D.ordenarCardapio)}>↓</button>
                <button type="button" className="btn btn-ghost" onClick=${() => setEditando(p)}>Editar</button>
              </span>
            </li>`)}</ul>`}
        </section>`; })}
      ${editando && html`<${JanelaProduto} p=${editando} onFechar=${() => setEditando(null)} aviso=${aviso} tentar=${tentar} />`}
      ${categoria && html`
        <${Modal} titulo=${categoria.id ? 'Editar categoria' : 'Nova categoria'} onFechar=${() => setCategoria(null)}>
          <form onSubmit=${e => { e.preventDefault(); if (tentar(() => D.salvarGrupo({ativo: true, cozinha: true, ...categoria}, categoria.id), x => `Categoria "${x.nome}" salva.`)) setCategoria(null); }}>
            <div className="form-grid"><${Campo} rotulo="Nome" largo><input type="text" maxLength="40" value=${categoria.nome} onInput=${e => setCategoria({...categoria, nome: e.target.value})} /><//></div>
            ${categoria.id && html`<label className="rest-check"><input type="checkbox" checked=${categoria.ativo} onChange=${e => setCategoria({...categoria, ativo: e.target.checked})} /> Ativa (aparece no cardápio e no PDV)</label>`}
            ${aviso}
            <div className="cf-acoes"><button type="button" className="btn btn-ghost" onClick=${() => setCategoria(null)}>Cancelar</button><button type="submit" className="btn">Salvar</button></div>
          </form>
        <//>`}
      ${previa && html`
        <${Modal} titulo="Prévia do cardápio" onFechar=${() => setPrevia(false)}>
          <p className="dv-ajuda">Como o cliente vê (as alterações aparecem depois de salvas no servidor). Na prévia nada é enviado ao restaurante.</p>
          <div className="rest-cd-previa"><iframe title="Prévia do cardápio" src=${link + '&previa=1'}></iframe></div>
        <//>`}
      ${qr && html`
        <${Modal} titulo=${`QR Code · Mesa ${qr.mesa.numero}`} onFechar=${() => setQr(null)}>
          <div className="rest-cd-qr" dangerouslySetInnerHTML=${{__html: qr.svg}}></div>
          <div className="rest-cd-link-linha"><input type="text" readOnly value=${qr.link} onFocus=${e => e.target.select()} aria-label="Link da mesa" />
            <button type="button" className="btn btn-ghost" onClick=${() => copiar(qr.link)}>Copiar</button></div>
          <p className="dv-ajuda">Este link é só da mesa ${qr.mesa.numero}: pedidos feitos por ele entram direto na conta. Não divulgue fora da mesa.</p>
        <//>`}`;
  }

  Object.assign(window.RestUI.telas, {'vendas/cardapio': TelaPedidos, cardapio: TelaCardapio});
})();
