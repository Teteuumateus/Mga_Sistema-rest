// =====================================================================
// ---- 🧾 MGA · PDV: venda de balcão e pagamento ----
// =====================================================================
// Feito para atendimento: botões grandes, busca rápida e poucos cliques.
// Atalhos: F2 ou "/" busca · Enter na busca adiciona o 1º produto · F4 finaliza · Esc fecha janelas.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect, useRef} = React;
  const {html, D, useDados, useAviso, Modal, rotuloCarrinho, montado} = window.RestUI;

  // O carrinho sobrevive à troca de tela (fica guardado nesta aba)
  const CHAVE = 'mga_pdvCarrinho';
  const lerCarrinho = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || {itens: [], desconto: '', acrescimo: '', obs: ''}; } catch (e) { return {itens: [], desconto: '', acrescimo: '', obs: ''}; } };
  const gravarCarrinho = c => { try { sessionStorage.setItem(CHAVE, JSON.stringify(c)); } catch (e) { /* storage indisponível */ } };
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const qtdBR = q => String(q).replace('.', ',');
  const ajuste = (entrada, base) => { try { return D.valorAjuste(entrada, base); } catch (e) { return NaN; } };

  // ---- Janela de pagamento: várias formas, valor pago, pendente e troco ----
  // Quantidade digitada no carrinho: vale ao sair do campo ou no Enter (dá para digitar "1,5");
  // zero ou valor inválido volta ao que estava (para tirar o item use o ✕)
  function QtdCampo({valor, rotulo, onMudar}){
    const [t, setT] = useState(null);
    const aplicar = () => { const q = D.lerValor(t); if (t !== null && Number.isFinite(q) && q > 0 && q !== valor) onMudar(q); setT(null); };
    return html`<input type="text" inputMode="decimal" value=${t ?? D.qtdBR(valor)} aria-label=${rotulo}
      onInput=${e => setT(e.target.value)} onBlur=${aplicar} onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setT(null); }} onFocus=${e => e.target.select()} />`;
  }

  function Pagamento({total, onConcluir, onFechar, erro, titulo = 'Pagamento', rotulo = 'Concluir venda', subtitulo = '', formaInicial = null}){
    useDados();
    const formas = D.formasAtivas();
    const [lista, setLista] = useState([]); // [{formaId, valor}]
    const [formaId, setFormaId] = useState(formas.some(f => f.id === formaInicial) ? formaInicial : formas[0]?.id || '');
    const [valor, setValor] = useState(total > 0 ? D.valorBR(total) : ''); // já abre com o valor a pagar (Enter imediato funciona)
    const [clienteId, setClienteId] = useState('');
    const [aviso, setAviso] = useState('');
    const campo = useRef(null), botaoConcluir = useRef(null);
    // Aplica na ordem: só dinheiro passa do restante e vira troco
    let restante = total; let troco = 0;
    const aplicados = lista.map(p => {
      const f = D.formaPorId(p.formaId), v = r2(p.valor), aplicado = r2(Math.min(v, restante));
      restante = r2(restante - aplicado);
      if (f.tipo === 'DINHEIRO') troco = r2(troco + v - aplicado);
      return {...p, f, aplicado, v};
    });
    const pago = r2(total - restante);
    const forma = D.formaPorId(formaId);
    const temPrazo = aplicados.some(p => p.f.tipo === 'PRAZO') || forma?.tipo === 'PRAZO';
    useEffect(() => { setValor(restante > 0 ? D.valorBR(restante) : ''); campo.current?.select(); }, [lista.length, formaId]);
    // Pago por completo: o foco vai para "Concluir venda" (Enter conclui)
    const quitado = restante <= 0.001;
    useEffect(() => { if (quitado) botaoConcluir.current?.focus(); }, [quitado]);
    const adicionar = (id = formaId, v = valor) => {
      const f = D.formaPorId(id), n = D.lerValor(v);
      setAviso('');
      if (!(n > 0)) return setAviso('Informe o valor recebido.');
      if (restante <= 0.001) return setAviso('A venda já está paga.');
      if (f.tipo !== 'DINHEIRO' && n > restante + 0.001) return setAviso(`${f.nome}: valor maior que o restante (${D.moedaBR(restante)}). Só dinheiro pode passar e gerar troco.`);
      setLista([...lista, {formaId: id, valor: r2(n)}]);
    };
    const concluir = () => {
      if (restante > 0.001) return setAviso(`Falta receber ${D.moedaBR(restante)}.`);
      if (temPrazo && !clienteId) return setAviso('Venda a prazo: escolha o cliente.');
      onConcluir({pagamentos: lista, clienteId: clienteId || null});
    };
    // F2…F8 escolhem a forma na ordem da tela (F5 deixa de recarregar a página aqui)
    useEffect(() => {
      const atalho = e => {
        const n = /^F([2-8])$/.exec(e.key);
        if (!n || !formas[Number(n[1]) - 2]) return;
        e.preventDefault();
        setFormaId(formas[Number(n[1]) - 2].id);
        setTimeout(() => campo.current?.select(), 0);
      };
      document.addEventListener('keydown', atalho);
      return () => document.removeEventListener('keydown', atalho);
    });
    const teclado = e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (restante > 0.001) adicionar(); else concluir();
    };
    // Atalhos de notas para dinheiro: valor exato e arredondamentos para cima
    const notas = forma?.tipo === 'DINHEIRO' && restante > 0 ? [...new Set([restante, ...[10, 20, 50, 100, 200].map(n => Math.ceil(restante / n) * n)])].filter(n => n >= restante).slice(0, 5) : [];
    return html`
      <${Modal} titulo=${titulo} onFechar=${onFechar}>
        <div className="rest-pag" onKeyDown=${teclado}>
          ${subtitulo && html`<p className="dv-ajuda">${subtitulo}</p>`}
          <div className="rest-pag-totais">
            <div><span>Total</span><b>${D.moedaBR(total)}</b></div>
            <div><span>Pago</span><b>${D.moedaBR(pago)}</b></div>
            <div className=${restante > 0.001 ? 'pendente' : 'quitado'}><span>${restante > 0.001 ? 'Falta' : 'Quitado'}</span><b>${D.moedaBR(restante)}</b></div>
            <div className=${troco > 0 ? 'troco' : ''}><span>Troco</span><b>${D.moedaBR(troco)}</b></div>
          </div>
          ${restante > 0.001 && html`
            <div className="rest-pag-formas" role="radiogroup" aria-label="Forma de pagamento">
              ${formas.map(f => html`<button type="button" key=${f.id} role="radio" aria-checked=${f.id === formaId} className=${'rest-pag-forma' + (f.id === formaId ? ' ativa' : '')}
                onClick=${() => setFormaId(f.id)} onDoubleClick=${() => adicionar(f.id, D.valorBR(restante))}>${formas.indexOf(f) < 7 ? html`<kbd>F${formas.indexOf(f) + 2}</kbd> ` : null}${f.nome}</button>`)}
            </div>
            <div className="rest-pag-valor">
              <label htmlFor="pagValor">${forma?.tipo === 'DINHEIRO' ? 'Valor recebido do cliente' : 'Valor'}</label>
              <div><input id="pagValor" ref=${campo} type="text" inputMode="decimal" value=${valor} onInput=${e => setValor(e.target.value)} autoFocus />
                <button type="button" className="btn" onClick=${() => adicionar()}>Adicionar</button></div>
            </div>
            ${notas.length > 1 && html`<div className="rest-pag-notas">${notas.map(n => html`<button type="button" key=${n} onClick=${() => adicionar(formaId, D.valorBR(n))}>${n === restante ? 'Exato' : D.moedaBR(n)}</button>`)}</div>`}`}
          ${aplicados.length > 0 && html`<ul className="rest-pag-lista">${aplicados.map((p, k) => html`<li key=${k}>
            <span>${p.f.nome}${p.v > p.aplicado ? html`<small>recebido ${D.moedaBR(p.v)}</small>` : null}</span><b>${D.moedaBR(p.aplicado)}</b>
            <button type="button" aria-label=${'Remover ' + p.f.nome} onClick=${() => setLista(lista.filter((_, j) => j !== k))}>✕</button></li>`)}</ul>`}
          ${temPrazo && html`<div className="field"><label htmlFor="pagCliente">Cliente (venda a prazo)</label>
            <select id="pagCliente" value=${clienteId} onChange=${e => setClienteId(e.target.value)}>
              <option value="">Escolha o cliente...</option>
              ${D.clientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => html`<option key=${c.id} value=${c.id}>${c.nome}${c.telefone ? ' · ' + c.telefone : ''}</option>`)}
            </select></div>`}
          ${(aviso || erro) && html`<div className="toast rest-toast toast-erro" role="alert">${aviso || erro}</div>`}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Voltar</button>
          <button type="button" ref=${botaoConcluir} className="btn rest-btn-concluir" disabled=${restante > 0.001} onClick=${concluir}>${rotulo}${troco > 0 ? ` · troco ${D.moedaBR(troco)}` : ''}</button>
        </div>
      <//>`;
  }

  // ---- Montar o item: tamanho, etapas obrigatórias e adicionais (mínimo e máximo de cada grupo) ----
  function MontarItem({p, qtd, onConfirmar, onFechar}){
    const grupos = (p.gruposAdicionais || []).map(D.grupoAdicionalPorId).filter(g => g && g.ativo);
    const tamanhos = p.tamanhos || [];
    const [tamanhoId, setTamanhoId] = useState(tamanhos.length === 1 ? tamanhos[0].id : '');
    const [sel, setSel] = useState([]);
    const [quantidade, setQuantidade] = useState(qtd > 0 ? qtd : 1);
    const [obs, setObs] = useState('');
    const [erro, setErro] = useState('');
    const doGrupo = g => sel.filter(id => g.opcoes.some(o => o.id === id));
    const alternar = (g, o) => {
      setErro('');
      if (sel.includes(o.id)) return setSel(sel.filter(id => id !== o.id));
      if (g.max === 1) return setSel([...sel.filter(id => !g.opcoes.some(x => x.id === id)), o.id]); // escolha única: troca
      if (g.max && doGrupo(g).length >= g.max) return setErro(`${g.nome}: no máximo ${g.max}.`);
      setSel([...sel, o.id]);
    };
    const unit = D.precoItem(p, {tamanhoId, adicionais: sel});
    const regra = g => g.min && g.max === g.min ? `escolha ${g.min}` : g.min ? `escolha de ${g.min}${g.max ? ` a ${g.max}` : ' ou mais'}` : g.max ? `opcional · até ${g.max}` : 'opcional';
    const confirmar = () => {
      if (tamanhos.length && !tamanhoId) return setErro('Escolha o tamanho.');
      const faltando = grupos.find(g => doGrupo(g).length < g.min);
      if (faltando) return setErro(`${faltando.nome}: ${regra(faltando)}.`);
      if (!(quantidade > 0)) return setErro('Quantidade inválida.');
      onConfirmar(quantidade, {tamanhoId: tamanhoId || null, adicionais: sel, observacao: obs});
    };
    return html`
      <${Modal} titulo=${p.nome} onFechar=${onFechar}>
        <div className="rest-montar" onKeyDown=${e => { if (e.key === 'Enter' && e.target.tagName !== 'BUTTON') { e.preventDefault(); confirmar(); } }}>
          ${tamanhos.length > 0 && html`<section><h4>Tamanho <small>escolha 1</small></h4>
            <div className="rest-montar-opcoes">${tamanhos.map(t => {
              const pr = D.precoBase(p, t.id);
              return html`<button type="button" key=${t.id} className=${'rest-montar-op' + (tamanhoId === t.id ? ' ativo' : '')} aria-pressed=${tamanhoId === t.id} onClick=${() => { setTamanhoId(t.id); setErro(''); }}>
                <b>${t.nome}</b><span>${pr.promo ? html`<s>${D.moedaBR(pr.tabela)}</s> ` : null}${D.moedaBR(pr.preco)}</span></button>`;
            })}</div></section>`}
          ${grupos.map(g => html`<section key=${g.id}><h4>${g.nome} <small className=${g.min ? 'obrigatorio' : ''}>${regra(g)}</small></h4>
            <div className="rest-montar-opcoes">${g.opcoes.filter(o => o.ativo).map(o => html`<button type="button" key=${o.id} className=${'rest-montar-op' + (sel.includes(o.id) ? ' ativo' : '')}
              aria-pressed=${sel.includes(o.id)} onClick=${() => alternar(g, o)}><b>${o.nome}</b>${o.preco > 0 ? html`<span>+ ${D.moedaBR(o.preco)}</span>` : null}</button>`)}</div></section>`)}
          <div className="rest-montar-rodape">
            <div className="field"><label htmlFor="mtObs">Observação</label><input id="mtObs" type="text" maxLength="100" placeholder="Ex.: sem cebola" value=${obs} onInput=${e => setObs(e.target.value)} /></div>
            <div className="rest-car-acoes rest-montar-qtd" aria-label="Quantidade">
              <button type="button" aria-label="Diminuir" onClick=${() => setQuantidade(q => Math.max(1, q - 1))}>−</button>
              <span className="rest-qtd-txt">${qtdBR(quantidade)}</span>
              <button type="button" aria-label="Aumentar" onClick=${() => setQuantidade(q => q + 1)}>+</button>
            </div>
          </div>
          ${erro && html`<div className="toast rest-toast toast-erro" role="alert">${erro}</div>`}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
          <button type="button" className="btn rest-btn-concluir" onClick=${confirmar}>Adicionar · ${D.moedaBR(r2(unit * quantidade))}</button>
        </div>
      <//>`;
  }

  // ---- Seletor de produtos (PDV e pedido da mesa): categorias, busca, quantidade e grade ----
  // onEscolher(produto, quantidade, opcoes) devolve true quando o item entrou.
  // opcoes = {tamanhoId, adicionais: [ids], observacao} quando o produto tem tamanhos ou adicionais.
  function SeletorProdutos({onEscolher, refBusca}){
    useDados();
    const [grupo, setGrupo] = useState('');
    const [busca, setBusca] = useState('');
    const [qtd, setQtd] = useState('1');
    const [montando, setMontando] = useState(null);
    const grupos = D.grupos().filter(g => g.ativo && D.produtosDoGrupo(g.id).some(p => p.ativo));
    const b = D.norm(busca), cod = busca.trim().toUpperCase();
    const produtos = D.produtos().filter(p => p.ativo && p.tipo !== 'INSUMO' && D.grupoPorId(p.grupoId)?.ativo !== false)
      .filter(p => busca ? D.norm(p.nome + ' ' + p.codigo).includes(b) || p.codigo === cod : !grupo || p.grupoId === grupo)
      .sort((x, y) => (busca && x.codigo === cod ? -1 : 0) || (D.grupoPorId(x.grupoId)?.ordem || 0) - (D.grupoPorId(y.grupoId)?.ordem || 0) || x.nome.localeCompare(y.nome, 'pt-BR'));
    const escolher = p => {
      if (D.precisaMontar(p)) return setMontando(p);
      if (onEscolher(p, D.lerValor(qtd))) setQtd('1');
    };
    const montar = (q, opcoes) => { if (onEscolher(montando, q, opcoes)) { setMontando(null); setQtd('1'); } };
    return html`
      <nav className="rest-pdv-grupos" aria-label="Categorias">
        <button type="button" className=${'rest-pdv-grupo' + (!grupo && !busca ? ' ativo' : '')} onClick=${() => { setGrupo(''); setBusca(''); }}>Todos</button>
        ${grupos.map(g => html`<button type="button" key=${g.id} className=${'rest-pdv-grupo' + (grupo === g.id && !busca ? ' ativo' : '')} onClick=${() => { setGrupo(g.id); setBusca(''); }}>${g.nome}</button>`)}
      </nav>
      <section className="rest-pdv-produtos">
        <div className="rest-pdv-busca">
          <input ref=${refBusca} type="search" className="search" placeholder="Buscar produto ou código (F2)" value=${busca} aria-label="Buscar produto"
            onInput=${e => setBusca(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter' && produtos[0]) { escolher(produtos[0]); setBusca(''); } }} />
          <label className="rest-pdv-qtd" title="Quantidade do próximo produto">Qtd
            <input type="text" inputMode="decimal" value=${qtd} onInput=${e => setQtd(e.target.value)} onFocus=${e => e.target.select()} aria-label="Quantidade do próximo produto" /></label>
        </div>
        <div className="rest-pdv-grade">
          ${produtos.length ? produtos.map(p => html`<button type="button" key=${p.id} className="rest-pdv-prod" onClick=${() => escolher(p)} title=${p.descricao || p.nome}>
            ${p.foto ? html`<img src=${p.foto} alt="" />` : html`<span className="rest-pdv-ini" aria-hidden="true">${p.nome.slice(0, 1)}</span>`}
            <span className="rest-pdv-nome">${p.nome}</span>
            ${(() => { const pr = D.precoBase(p); return html`<span className="rest-pdv-preco">${(p.tamanhos || []).length ? html`<small>a partir de </small>` : null}${pr.promo ? html`<s>${D.moedaBR(pr.tabela)}</s> ` : null}${D.moedaBR(pr.preco)}</span>
              ${pr.promo ? html`<span className="rest-pdv-promo">🏷️ ${pr.promo.nome}</span>` : null}`; })()}
            ${p.controlaEstoque && html`<span className=${'rest-pdv-estoque' + (D.estoqueBaixo(p) ? ' baixo' : '')}>${p.estoque > 0 ? `${D.qtdBR(p.estoque)} ${p.unidade} em estoque` : 'Sem estoque'}</span>`}
          </button>`) : html`<p className="rest-grafico-vazio">Nenhum produto encontrado.</p>`}
        </div>
      </section>
      ${montando && html`<${MontarItem} p=${montando} qtd=${D.lerValor(qtd)} onFechar=${() => setMontando(null)} onConfirmar=${montar} />`}`;
  }

  function TelaPDV({ir}){
    useDados();
    const {el: aviso, mostrar} = useAviso();
    const [car, setCarState] = useState(lerCarrinho);
    const [obsAberta, setObsAberta] = useState(null);
    const [pagando, setPagando] = useState(false);
    const [erroPag, setErroPag] = useState('');
    const [concluida, setConcluida] = useState(null); // venda recém-finalizada
    const refBusca = useRef(null);
    const setCar = c => { setCarState(c); gravarCarrinho(c); };
    const cx = D.caixaAberto();

    // Linhas do carrinho com preço atual do cadastro
    const linhas = car.itens.map(i => ({...i, p: D.produtoPorId(i.produtoId)})).filter(i => i.p).map(i => ({...i, preco: D.precoItem(i.p, i), rot: rotuloCarrinho(i.p, i)}));
    const subtotal = r2(linhas.reduce((s, i) => s + i.quantidade * i.preco, 0));
    const acrescimo = ajuste(car.acrescimo, subtotal), desconto = ajuste(car.desconto, subtotal);
    const ajusteInvalido = !Number.isFinite(acrescimo) || !Number.isFinite(desconto) || desconto > subtotal + acrescimo + 0.001;
    const total = ajusteInvalido ? NaN : r2(subtotal - desconto + acrescimo);
    const nItens = linhas.reduce((s, i) => s + i.quantidade, 0);

    const adicionar = (p, q, opcoes = {}) => {
      if (!(q > 0)) { mostrar('Quantidade inválida.', true); return false; }
      const novo = {key: Date.now() + Math.random(), produtoId: p.id, quantidade: r2(q), observacao: opcoes.observacao || '', tamanhoId: opcoes.tamanhoId || null, adicionais: opcoes.adicionais || []};
      // Item montado (tamanho/adicionais) entra sempre como linha nova; o simples soma na linha igual
      const igual = !montado(novo) && !novo.observacao && car.itens.find(i => i.produtoId === p.id && !i.observacao && !montado(i));
      const itens = igual ? car.itens.map(i => i === igual ? {...i, quantidade: r2(i.quantidade + q)} : i) : [...car.itens, novo];
      setCar({...car, itens});
      return true;
    };
    const mudarQtd = (key, q) => setCar({...car, itens: car.itens.map(i => i.key === key ? {...i, quantidade: Math.round(Math.max(q, 0) * 1000) / 1000} : i).filter(i => i.quantidade > 0)});
    const remover = key => setCar({...car, itens: car.itens.filter(i => i.key !== key)});
    const limpar = () => { if (!car.itens.length || window.confirm('Descartar a venda atual?')) { setCar({itens: [], desconto: '', acrescimo: '', obs: ''}); setObsAberta(null); } };
    const finalizar = () => {
      if (!linhas.length) return mostrar('Adicione ao menos um produto.', true);
      if (ajusteInvalido) return mostrar('Confira o desconto e o acréscimo.', true);
      if (!(total > 0)) return mostrar('O total precisa ser maior que R$ 0,00.', true);
      setErroPag(''); setPagando(true);
    };
    const paraDelivery = () => {
      if (!linhas.length) return mostrar('Adicione ao menos um produto.', true);
      window.RestUI.rascunhoDelivery?.({itens: linhas.map(({p, preco, rot, ...i}) => i), desconto: car.desconto, acrescimo: car.acrescimo, obs: car.obs});
      setCar({itens: [], desconto: '', acrescimo: '', obs: ''});
      ir('delivery/novo', {tipo: 'DELIVERY'});
    };
    const concluir = ({pagamentos, clienteId}) => {
      try {
        const v = D.registrarVenda({tipo: 'BALCAO', itens: linhas.map(i => ({produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, tamanhoId: i.tamanhoId, adicionais: i.adicionais})),
          desconto: car.desconto, acrescimo: car.acrescimo, obs: car.obs, pagamentos, clienteId});
        setPagando(false); setCar({itens: [], desconto: '', acrescimo: '', obs: ''}); setObsAberta(null);
        setConcluida(v);
        window.RestUI.impressao.aposBalcao(v);
      } catch (e) { setErroPag(e.regra ? e.message : 'Erro inesperado: ' + e.message); if (!e.regra) console.error(e); }
    };

    // Atalhos de teclado
    useEffect(() => {
      const tecla = e => {
        if (pagando || concluida || !cx) return;
        if (e.key === 'F2' || (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); refBusca.current?.focus(); refBusca.current?.select(); }
        if (e.key === 'F4') { e.preventDefault(); finalizar(); }
        if (e.key === 'F11' && D.podeAcessar('delivery')) { e.preventDefault(); paraDelivery(); }
      };
      window.addEventListener('keydown', tecla);
      return () => window.removeEventListener('keydown', tecla);
    });
    useEffect(() => { if (cx && !pagando && !concluida) refBusca.current?.focus(); }, [!!cx, concluida]);

    if (!cx) return html`
      <div className="rest-pdv-fechado">
        <p className="dv-ajuda">O caixa está fechado. Para vender, abra o caixa:</p>
        <${window.RestUI.AbrirCaixa} compacto onAberto=${() => mostrar('Caixa aberto. Boas vendas!')} />
      </div>`;

    if (concluida) {
      const t = D.totaisVenda(concluida);
      return html`
        <div className="card rest-concluida" role="status">
          <span className="rest-concluida-ic" aria-hidden="true">✓</span>
          <h2>Venda #${concluida.numero} concluída</h2>
          <p>${D.moedaBR(t.total)} · ${concluida.pagamentos.map(p => p.nome).join(' + ')}</p>
          ${t.troco > 0 && html`<div className="rest-troco"><span>Troco</span><b>${D.moedaBR(t.troco)}</b></div>`}
          <div className="rest-concluida-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => window.RestUI.impressao.cupom(concluida)}>🖨️ Cupom</button>
            <button type="button" className="btn btn-ghost" onClick=${() => window.RestUI.impressao.comanda(concluida, {todos: true})}>🖨️ Comanda</button>
          </div>
          <button type="button" className="btn rest-btn-grande" autoFocus onClick=${() => setConcluida(null)}>Nova venda (Enter)</button>
        </div>`;
    }

    return html`
      <div className="rest-pdv-aviso">${aviso}</div>
      <div className="rest-pdv">
        <${SeletorProdutos} refBusca=${refBusca} onEscolher=${adicionar} />

        <aside className="rest-pdv-carrinho" aria-label="Venda atual">
          <div className="rest-car-topo"><b>Venda balcão</b><span>${qtdBR(r2(nItens))} ${nItens === 1 ? 'item' : 'itens'}</span>
            ${linhas.length > 0 && html`<button type="button" className="rest-link" onClick=${limpar}>Limpar</button>`}</div>
          <ul className="rest-car-itens">
            ${linhas.length ? linhas.map(i => html`<li key=${i.key}>
              <div className="rest-car-linha">
                <span className="rest-car-nome">${i.rot.nome}${i.rot.extras ? html`<small className="rest-car-extras">+ ${i.rot.extras}</small>` : null}<small>${D.moedaBR(i.preco)} ${i.p.unidade !== 'UN' ? '/ ' + i.p.unidade : 'un.'}</small></span>
                <b>${D.moedaBR(i.quantidade * i.preco)}</b>
              </div>
              <div className="rest-car-acoes">
                <button type="button" aria-label="Diminuir" onClick=${() => mudarQtd(i.key, i.quantidade - 1)}>−</button>
                <${QtdCampo} valor=${i.quantidade} rotulo=${'Quantidade de ' + i.p.nome} onMudar=${q => mudarQtd(i.key, q)} />
                <button type="button" aria-label="Aumentar" onClick=${() => mudarQtd(i.key, i.quantidade + 1)}>+</button>
                <button type="button" className=${'rest-car-obs-btn' + (i.observacao ? ' com' : '')} onClick=${() => setObsAberta(obsAberta === i.key ? null : i.key)}>${i.observacao ? '✎ obs.' : '+ obs.'}</button>
                <button type="button" className="rest-car-rm" aria-label=${'Excluir ' + i.p.nome} onClick=${() => remover(i.key)}>✕</button>
              </div>
              ${(obsAberta === i.key || i.observacao) && html`<input type="text" className="rest-car-obs" placeholder="Observação (ex.: sem cebola)" maxLength="100" value=${i.observacao}
                autoFocus=${obsAberta === i.key} onInput=${e => setCar({...car, itens: car.itens.map(x => x.key === i.key ? {...x, observacao: e.target.value} : x)})}
                onKeyDown=${e => { if (e.key === 'Enter') setObsAberta(null); }} />`}
            </li>`) : html`<li className="rest-car-vazio">Toque nos produtos para adicionar.<small>Busca: F2 · Finalizar: F4</small></li>`}
          </ul>
          <div className="rest-car-ajustes">
            <label>Desconto<input type="text" inputMode="decimal" placeholder="R$ ou %" value=${car.desconto} onInput=${e => setCar({...car, desconto: e.target.value})} /></label>
            <label>Acréscimo<input type="text" inputMode="decimal" placeholder="R$ ou %" value=${car.acrescimo} onInput=${e => setCar({...car, acrescimo: e.target.value})} /></label>
          </div>
          <div className="rest-car-totais">
            <div><span>Subtotal</span><b>${D.moedaBR(subtotal)}</b></div>
            <div><span>Desconto</span><b>${Number.isFinite(desconto) ? '− ' + D.moedaBR(desconto) : 'inválido'}</b></div>
            <div><span>Acréscimo</span><b>${Number.isFinite(acrescimo) ? '+ ' + D.moedaBR(acrescimo) : 'inválido'}</b></div>
            <div className="rest-car-total"><span>Total</span><b>${Number.isFinite(total) ? D.moedaBR(total) : '—'}</b></div>
          </div>
          <input type="text" className="rest-car-obs" placeholder="Observação da venda (opcional)" maxLength="200" value=${car.obs} onInput=${e => setCar({...car, obs: e.target.value})} />
          ${D.podeAcessar('delivery') && html`<button type="button" className="btn btn-ghost" disabled=${!linhas.length} onClick=${paraDelivery}>🛵 Transformar em delivery <kbd>F11</kbd></button>`}
          <button type="button" className="btn rest-btn-finalizar" disabled=${!linhas.length || !(total > 0)} onClick=${finalizar}>Finalizar venda <kbd>F4</kbd></button>
        </aside>
      </div>
      ${pagando && html`<${Pagamento} total=${total} erro=${erroPag} onFechar=${() => setPagando(false)} onConcluir=${concluir} />`}`;
  }

  Object.assign(window.RestUI, {SeletorProdutos, Pagamento});
  window.RestUI.telas['vendas/pdv'] = TelaPDV;
})();
