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
  // depois: algo abaixo do campo (ex.: a situação da busca do CEP)
  function Campo({rotulo, children, largo, depois}){
    const id = React.useId();
    return html`<div className=${'field' + (largo ? ' rest-largo' : '')}>
      <label htmlFor=${id}>${rotulo}</label>${React.cloneElement(React.Children.only(children), {id})}${depois || null}
    </div>`;
  }

  // Campo de valor em R$: aceita "1.234,56" e formata ao sair
  const CampoValor = ({valor, onChange}) => html`
    <input type="text" inputMode="decimal" value=${valor} placeholder="0,00" onInput=${e => onChange(e.target.value)}
      onBlur=${() => { const v = D.lerValor(valor); if (Number.isFinite(v)) onChange(D.valorBR(v)); }} />`;

  const StatusAtivo = ({ativo}) => ativo
    ? html`<span className="badge b-ok">Ativo</span>`
    : html`<span className="badge b-wait">Inativo</span>`;

  // semExcluir: motivo para não deixar excluir (troca o ✕ por um cadeado com a explicação)
  const Acoes = ({onEditar, onExcluir, semExcluir, nome, children}) => html`
    <div className="row-actions">
      ${children}
      ${onEditar && html`<button type="button" className="edit" title=${'Editar ' + nome} aria-label=${'Editar ' + nome} onClick=${onEditar}>✎</button>`}
      ${semExcluir ? html`<button type="button" className="rest-sem-excluir" aria-disabled="true" title=${semExcluir} aria-label=${semExcluir}>🔒</button>`
        : onExcluir && html`<button type="button" className="del" title=${'Excluir ' + nome} aria-label=${'Excluir ' + nome} onClick=${onExcluir}>✕</button>`}
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

  // ---- Endereço pelo CEP (ViaCEP, gratuito e sem cadastro) ----
  // Resolve {endereco, bairro, cidade, uf} ou null (CEP inexistente ou sem internet). Cada CEP é buscado uma vez só.
  const cepsBuscados = new Map();
  function buscarCep(cep){
    const d = String(cep || '').replace(/\D/g, '');
    if (d.length !== 8) return Promise.resolve(null);
    if (!cepsBuscados.has(d)) cepsBuscados.set(d, fetch(`https://viacep.com.br/ws/${d}/json/`)
      .then(r => r.ok ? r.json() : null)
      .then(j => j && !j.erro ? {endereco: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', uf: j.uf || ''} : null)
      .catch(() => { cepsBuscados.delete(d); return null; }));
    return cepsBuscados.get(d);
  }
  // No formulário: chame mudar(cep) ao digitar; com 8 dígitos preenche rua, bairro, cidade e UF (só os campos que o formulário tem).
  // atualizar recebe uma função (form => novo form), como o setState. el = linha de situação para pôr abaixo do CEP.
  function useCep(atualizar){
    const [situacao, setSituacao] = useState(null);
    const ultimo = useRef('');
    const mudar = cep => {
      const d = String(cep || '').replace(/\D/g, '');
      if (d.length !== 8) { ultimo.current = ''; setSituacao(null); return; }
      if (d === ultimo.current) return;
      ultimo.current = d;
      setSituacao({tipo: 'busca', msg: 'Buscando o endereço...'});
      buscarCep(d).then(r => {
        if (ultimo.current !== d) return; // a pessoa já digitou outro CEP
        if (!r) return setSituacao({tipo: 'erro', msg: navigator.onLine === false ? 'Sem internet: preencha o endereço à mão.' : 'CEP não encontrado: preencha o endereço à mão.'});
        atualizar(f => {
          const novo = {...f};
          Object.entries(r).forEach(([k, v]) => { if (v && k in f) novo[k] = v; });
          // Endereço já com essa rua (ex.: "Rua X, 120") fica como está, para não perder o número
          if (r.endereco && D.norm(f.endereco || '').startsWith(D.norm(r.endereco))) novo.endereco = f.endereco;
          return novo;
        });
        setSituacao({tipo: 'ok', msg: `✓ ${[r.endereco, r.bairro, r.cidade && `${r.cidade}/${r.uf}`].filter(Boolean).join(' · ')}${r.endereco ? ' · confira o número' : ''}`});
      });
    };
    const el = situacao && html`<small className=${situacao.tipo === 'ok' ? 'rest-achado' : situacao.tipo === 'erro' ? 'rest-fora-regiao' : 'history-date'} role="status">${situacao.msg}</small>`;
    const limpar = () => { ultimo.current = ''; setSituacao(null); };
    return {mudar, limpar, el};
  }

  // ---- Confirmação de exclusão (janela do sistema, no lugar do confirm do navegador) ----
  // pedir({titulo, nome, detalhe, foto, icone, aviso, excluir, desativar}): excluir e desativar já vêm com o
  // tentar() da tela; desativar é opcional (aparece só para quem quer apenas esconder o cadastro).
  function useExcluir(){
    const [pedido, setPedido] = useState(null);
    const fechar = () => setPedido(null);
    const fazer = fn => { setPedido(null); fn(); };
    const p = pedido;
    const el = p && html`
      <${Modal} titulo=${p.titulo} onFechar=${fechar}>
        <div className="rest-prod-cel rest-excluir-prod">
          ${p.foto ? html`<img className="rest-prod-mini" src=${p.foto} alt="" />` : html`<span className="rest-prod-mini rest-prod-sem" aria-hidden="true">${p.icone || '🗑️'}</span>`}
          <div><b>${p.nome}</b>${p.detalhe ? html`<small className="history-date">${p.detalhe}</small>` : null}</div>
        </div>
        <p className="dv-ajuda">${p.aviso ? p.aviso + ' ' : ''}<b>Essa ação não pode ser desfeita.</b></p>
        ${p.desativar && html`<p className="dv-ajuda">Se quiser só tirar de uso por um tempo, use <b>Desativar</b>: o cadastro fica guardado e dá para ativar de novo.</p>`}
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${fechar}>Cancelar</button>
          ${p.desativar && html`<button type="button" className="btn btn-ghost" onClick=${() => fazer(p.desativar)}>Desativar</button>`}
          <button type="button" className="btn btn-perigo" onClick=${() => fazer(p.excluir)}>${p.rotulo || 'Excluir'}</button>
        </div>
      <//>`;
    return {pedir: setPedido, el};
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

  window.RestUI = {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, StatusAtivo, Acoes, FormCard, Modal, useExcluir, useCep, buscarCep, Tabela, Segmentos, confirmar, plural, adicionaisTxt, rotuloCarrinho, montado, telas: {}};
})();
