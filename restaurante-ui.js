// =====================================================================
// ---- 🍽️ MGA · peças de tela compartilhadas (React 18 + htm, sem build) ----
// =====================================================================
// htm = JSX escrito em template string, sem compilador. Cada tela (restaurante-*.js)
// registra seus componentes em RestUI.telas; restaurante.js monta o app.
(function(){
  'use strict';
  // Sem internet o React não carrega: restaurante.js mostra o aviso
  if (!window.React || !window.ReactDOM || !window.htm || !window.RestDados) return;

  const {useState, useEffect, useRef} = React;
  const html = htm.bind(React.createElement);
  const D = window.RestDados;

  // Redesenha quando qualquer dado muda
  function useDados(){
    const [, setV] = useState(D.versao());
    useEffect(() => D.on(setV), []);
  }

  // ---- Aviso (toast) ----
  function useAviso(){
    const [aviso, setAviso] = useState(null);
    const timer = useRef(null);
    const mostrar = (msg, erro = false) => {
      setAviso({msg, erro});
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setAviso(null), erro ? 5000 : 3500);
    };
    useEffect(() => () => clearTimeout(timer.current), []);
    const el = aviso && html`<div className=${'toast rest-toast ' + (aviso.erro ? 'toast-erro' : 'toast-ok')} role=${aviso.erro ? 'alert' : 'status'}>${aviso.msg}</div>`;
    // Executa uma ação de dados; erro de regra vira aviso vermelho
    const tentar = (fn, ok) => {
      try { const r = fn(); if (ok) mostrar(typeof ok === 'function' ? ok(r) : ok); return r || true; }
      catch (e) { mostrar(e.regra ? e.message : 'Erro inesperado: ' + e.message, true); if (!e.regra) console.error(e); return false; }
    };
    return {el, mostrar, tentar};
  }

  // ---- Peças comuns ----
  const Cabecalho = ({titulo, sub, children}) => html`
    <div className="dash-head">
      <div><h2 className="dash-titulo">${titulo}</h2><p className="dash-sub">${sub}</p></div>
      <div className="dash-head-acoes">${children}</div>
    </div>`;

  const Busca = ({valor, onChange, placeholder}) => html`
    <input type="search" className="search rest-busca" placeholder=${placeholder} value=${valor}
      onInput=${e => onChange(e.target.value)} aria-label=${placeholder} />`;

  // Rótulo ligado ao campo pelo id (o .field do sistema usa label e input lado a lado)
  function Campo({rotulo, children, largo}){
    const id = React.useId();
    return html`<div className=${'field' + (largo ? ' rest-largo' : '')}>
      <label htmlFor=${id}>${rotulo}</label>${React.cloneElement(React.Children.only(children), {id})}
    </div>`;
  }

  // Campo de valor em R$: aceita "1.234,56" e formata ao sair
  const CampoValor = ({valor, onChange}) => html`
    <input type="text" inputMode="decimal" value=${valor} placeholder="0,00" onInput=${e => onChange(e.target.value)}
      onBlur=${() => { const v = D.lerValor(valor); if (Number.isFinite(v)) onChange(D.valorBR(v)); }} />`;

  const StatusAtivo = ({ativo}) => ativo
    ? html`<span className="badge b-ok">Ativo</span>`
    : html`<span className="badge b-wait">Inativo</span>`;

  const Acoes = ({onEditar, onExcluir, nome, children}) => html`
    <div className="row-actions">
      ${children}
      ${onEditar && html`<button type="button" className="edit" title=${'Editar ' + nome} aria-label=${'Editar ' + nome} onClick=${onEditar}>✎</button>`}
      ${onExcluir && html`<button type="button" className="del" title=${'Excluir ' + nome} aria-label=${'Excluir ' + nome} onClick=${onExcluir}>✕</button>`}
    </div>`;

  // Formulário em card: Enter salva, Esc cancela
  function FormCard({titulo, onSalvar, onCancelar, children, rotuloSalvar = 'Salvar'}){
    const ref = useRef(null);
    useEffect(() => {
      ref.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      ref.current?.querySelector('input, select')?.focus({preventScroll: true});
    }, []);
    return html`
      <form className="card rest-form" ref=${ref} onSubmit=${e => { e.preventDefault(); onSalvar(); }}
        onKeyDown=${e => { if (e.key === 'Escape') onCancelar(); }}>
        <h3 className="rest-form-titulo">${titulo}</h3>
        <div className="form-grid">${children}</div>
        <div className="rest-form-acoes">
          <button type="submit" className="btn">${rotuloSalvar}</button>
          <button type="button" className="btn btn-ghost" onClick=${onCancelar}>Cancelar</button>
        </div>
      </form>`;
  }

  // Janela sobreposta (mesmo visual das janelas do sistema): Esc ou clique fora fecham
  function Modal({titulo, onFechar, children}){
    const ref = useRef(null);
    useEffect(() => {
      const esc = e => { if (e.key === 'Escape') onFechar(); };
      document.addEventListener('keydown', esc);
      ref.current?.querySelector('input, select, button')?.focus();
      return () => document.removeEventListener('keydown', esc);
    }, []);
    return html`
      <div className="modal-overlay conferencia-overlay" style=${{display: 'flex'}} role="dialog" aria-modal="true" aria-label=${titulo}
        onMouseDown=${e => { if (e.target === e.currentTarget) onFechar(); }}>
        <div className="conferencia-box" ref=${ref}><h3>${titulo}</h3>${children}</div>
      </div>`;
  }

  function Tabela({colunas, vazio, children, rodape}){
    const temLinhas = React.Children.count(children) > 0;
    return html`
      <div className="card table-scroll">
        <table>
          <thead><tr>${colunas.map(c => html`<th key=${c}>${c}</th>`)}<th></th></tr></thead>
          <tbody>${temLinhas ? children : html`<tr><td colSpan=${colunas.length + 1} className="history-empty">${vazio}</td></tr>`}</tbody>
          ${temLinhas && rodape}
        </table>
      </div>`;
  }

  // Botões de escolha única lado a lado (filtros)
  const Segmentos = ({opcoes, valor, onChange, rotulo}) => html`
    <div className="seg" role="group" aria-label=${rotulo}>
      ${opcoes.map(([v, nome]) => html`<button type="button" key=${v} className=${v === valor ? 'active' : ''} aria-pressed=${v === valor} onClick=${() => onChange(v)}>${nome}</button>`)}
    </div>`;

  // Adicionais de um item já gravado ("Ao ponto, Bacon") e de um item ainda no carrinho
  const adicionaisTxt = i => (i.adicionais || []).map(a => a.nome).join(', ');
  function rotuloCarrinho(p, i){
    const t = i.tamanhoId && (p.tamanhos || []).find(x => x.id === i.tamanhoId);
    const opcoes = (p.gruposAdicionais || []).map(D.grupoAdicionalPorId).filter(Boolean).flatMap(g => g.opcoes).filter(o => (i.adicionais || []).includes(o.id));
    return {nome: p.nome + (t ? ` (${t.nome})` : ''), extras: opcoes.map(o => o.nome).join(', ')};
  }
  const montado = i => !!(i.tamanhoId || (i.adicionais || []).length);

  const confirmar = msg => window.confirm(msg);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

  window.RestUI = {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, StatusAtivo, Acoes, FormCard, Modal, Tabela, Segmentos, confirmar, plural, adicionaisTxt, rotuloCarrinho, montado, telas: {}};
})();
