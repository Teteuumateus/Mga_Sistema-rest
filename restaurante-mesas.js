// =====================================================================
// ---- 🍽️ MGA · Mesas: mapa, pedido aberto, divisão da conta e taxa de serviço ----
// =====================================================================
// Fluxo: Mesa → pedido aberto → consumo → fechamento → pagamento (vira venda no caixa).
// Garçom abre, lança e pede a conta; quem tem acesso ao caixa recebe.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect, useRef} = React;
  const {html, D, useDados, useAviso, Cabecalho, Modal, Segmentos, confirmar, plural} = window.RestUI;
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const qtdBR = q => String(q).replace('.', ',');

  // "há 35 min" / "há 1 h 20 min" (atualiza a cada 30 s)
  function useRelogio(){ const [, set] = useState(0); useEffect(() => { const t = setInterval(() => set(x => x + 1), 30000); return () => clearInterval(t); }, []); }
  function tempoDesde(iso){
    const min = Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
  }
  const situacao = v => !v ? 'livre' : v.contaPedida ? 'conta' : 'ocupada';
  const NOME_SITUACAO = {livre: 'Livre', ocupada: 'Ocupada', conta: 'Conta pedida'};

  // ---- Abrir mesa: quantas pessoas ----
  function AbrirMesa({mesa, onFechar, ir}){
    const {el: aviso, tentar} = useAviso();
    const [pessoas, setPessoas] = useState(Math.min(mesa.lugares || 2, 4) || 2);
    const cx = D.caixaAberto();
    const abrir = () => { const v = tentar(() => D.novaVenda({tipo: 'MESA', mesaId: mesa.id, pessoas})); if (v) ir('mesas/pedido', {id: v.id}); };
    return html`
      <${Modal} titulo=${`Abrir mesa ${mesa.numero}`} onFechar=${onFechar}>
        ${!cx ? html`
          <p className="dv-ajuda">O caixa está fechado. As mesas só abrem com o caixa aberto, porque o consumo vira venda do caixa.</p>
          ${D.podeAcessar('vendas') ? html`<button type="button" className="btn" onClick=${() => ir('vendas/caixa')}>Ir para o caixa</button>`
            : html`<p className="dv-ajuda">Peça ao responsável pelo caixa para abri-lo.</p>`}`
        : html`
          <p className="dv-ajuda">${mesa.descricao ? mesa.descricao + ' · ' : ''}${mesa.lugares ? `${mesa.lugares} lugares` : ''}</p>
          <div className="rest-pessoas" role="group" aria-label="Pessoas na mesa">
            <span>Pessoas</span>
            ${[1, 2, 3, 4, 5, 6, 8].map(n => html`<button type="button" key=${n} className=${pessoas === n ? 'ativo' : ''} aria-pressed=${pessoas === n} onClick=${() => setPessoas(n)}>${n}</button>`)}
            <input type="number" min="1" max="99" value=${pessoas} aria-label="Outro número de pessoas" onInput=${e => setPessoas(Math.max(1, Number(e.target.value) || 1))}
              onKeyDown=${e => { if (e.key === 'Enter') abrir(); }} />
          </div>
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
            <button type="button" className="btn rest-btn-concluir" autoFocus onClick=${abrir}>Abrir mesa</button>
          </div>`}
      <//>`;
  }

  // ---- Mapa das mesas ----
  const FILTROS = [['todas', 'Todas'], ['livre', 'Livres'], ['ocupada', 'Ocupadas'], ['conta', 'Conta pedida']];
  function TelaMesas({ir, params}){
    useDados(); useRelogio();
    const [filtro, setFiltro] = useState('todas');
    const [abrindo, setAbrindo] = useState(null);
    const {el: aviso, mostrar} = useAviso();
    useEffect(() => { if (params?.aberta) { mostrar(`Mesa ${params.aberta} continua aberta. A comanda fica guardada até fechar a conta.`); history.replaceState(null, '', '#/mesas'); } }, []);
    // Busca rápida da barra superior: mesa livre chega aqui para ser aberta
    useEffect(() => {
      const m = params?.abrir && D.mesaPorId(params.abrir);
      if (m && !D.vendaDaMesa(m.id)) setAbrindo(m);
      if (params?.abrir) ir('mesas');
    }, [params?.abrir]);
    const lista = D.mesas().filter(m => m.ativo).map(m => ({m, v: D.vendaDaMesa(m.id)})).map(x => ({...x, s: situacao(x.v)}));
    const ocupadas = lista.filter(x => x.v);
    const consumo = ocupadas.reduce((s, x) => s + D.totaisVenda(x.v).total, 0);
    const conta = ocupadas.filter(x => x.v.contaPedida).length;
    const visiveis = lista.filter(x => filtro === 'todas' || x.s === filtro || (filtro === 'ocupada' && x.s === 'conta'));
    const clicar = ({m, v}) => v ? ir('mesas/pedido', {id: v.id}) : setAbrindo(m);
    return html`
      <${Cabecalho} titulo="Mesas" sub=${`${plural(ocupadas.length, 'ocupada', 'ocupadas')} de ${lista.length} · ${D.moedaBR(consumo)} em consumo${conta ? ` · ${plural(conta, 'conta pedida', 'contas pedidas')}` : ''}`}>
        ${!D.caixaAberto() && html`<span className="badge rest-b-vencida">Caixa fechado: abra o caixa para abrir mesas</span>`}
      <//>
      ${aviso}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Filtrar mesas" opcoes=${FILTROS} valor=${filtro} onChange=${setFiltro} />
        <ul className="rest-legenda-mesas" aria-label="Legenda">
          ${Object.entries(NOME_SITUACAO).map(([k, n]) => html`<li key=${k}><i className=${'rest-mesa-ponto ' + k}></i>${n}</li>`)}
        </ul>
      </div>
      ${lista.length ? html`
        <div className="rest-mapa">
          ${visiveis.map(x => {
            const t = x.v && D.totaisVenda(x.v);
            return html`<button type="button" key=${x.m.id} className=${'rest-mesa ' + x.s} onClick=${() => clicar(x)}
              aria-label=${`Mesa ${x.m.numero}: ${NOME_SITUACAO[x.s]}${t ? ', ' + D.moedaBR(t.total) : ''}`}>
              <span className="rest-mesa-num">${x.m.numero}${x.v && html`<small className="rest-mesa-garcom" title="Quem abriu a mesa">${x.v.operador.split(' ')[0]}</small>`}</span>
              ${x.v ? html`
                <b className="rest-mesa-valor">${D.moedaBR(t.total)}</b>
                <span className="rest-mesa-info">${x.v.contaPedida ? '🧾 Conta pedida' : `${x.v.pessoas} pessoa${x.v.pessoas === 1 ? '' : 's'}`} · ${tempoDesde(x.v.data)}</span>
                ${t.pago > 0 && html`<span className="rest-mesa-info">recebido ${D.moedaBR(t.pago)}</span>`}`
              : html`<b className="rest-mesa-valor">Livre</b><span className="rest-mesa-info">${x.m.descricao || (x.m.lugares ? `${x.m.lugares} lugares` : '')}</span>`}
            </button>`;
          })}
        </div>
        ${!visiveis.length && html`<p className="rest-grafico-vazio">Nenhuma mesa nessa situação.</p>`}`
      : html`<div className="card rest-breve-card"><h2>Nenhuma mesa cadastrada</h2><p>Cadastre as mesas em Cadastros › Mesas.</p></div>`}
      ${abrindo && html`<${AbrirMesa} mesa=${abrindo} ir=${ir} onFechar=${() => setAbrindo(null)} />`}`;
  }

  // ---- Fechar a conta: inteira, dividida por pessoas ou por itens ----
  const MODOS = [['inteira', 'Conta inteira'], ['pessoas', 'Dividir por pessoas'], ['itens', 'Por itens']];
  function FecharConta({v, onFechar, onFinalizada}){
    useDados();
    const t = D.totaisVenda(v);
    // Divisão já começada (pagamentos "Pessoa k/n"): retoma com as mesmas partes
    const feitas = v.pagamentos.map(p => /^Pessoa (\d+)\/(\d+)$/.exec(p.parte || '')).filter(Boolean);
    const nFeito = feitas.length ? Number(feitas[feitas.length - 1][2]) : 0;
    const daDivisao = v.pagamentos.filter(p => new RegExp(`^Pessoa \\d+/${nFeito}$`).test(p.parte || ''));
    const [modo, setModo] = useState(nFeito ? 'pessoas' : 'inteira');
    const [n, setN] = useState(nFeito || Math.max(2, v.pessoas || 2));
    const [base, setBase] = useState(nFeito ? r2(t.restante + daDivisao.reduce((s, p) => s + p.valor, 0)) : null); // valor dividido (o que faltava ao começar a divisão)
    const [recebidas, setRecebidas] = useState(nFeito ? [...new Set(feitas.filter(x => Number(x[2]) === nFeito).map(x => Number(x[1])))] : []); // pessoas já recebidas
    const [sel, setSel] = useState([]);
    const [receber, setReceber] = useState(null); // {valor, itemIds, parte, titulo}
    const [erro, setErro] = useState('');
    const [msg, setMsg] = useState('');
    const naoPagos = v.itens.filter(i => !i.pago);
    // Divisão igual: centavos que sobram vão para a última pessoa
    const valorBase = base ?? t.restante;
    const cada = Math.floor(valorBase / n * 100) / 100;
    const partes = Array.from({length: n}, (_, k) => Math.min(k < n - 1 ? cada : r2(valorBase - cada * (n - 1)), t.restante));
    const valorSel = D.valorDosItens(v, sel);
    const confirmarReceber = ({pagamentos, clienteId}) => {
      try {
        const r = D.receberParcial(v.id, {valor: receber.valor, itemIds: receber.itemIds || [], parte: receber.parte, pagamentos, clienteId});
        if (receber.pessoa) setRecebidas([...recebidas, receber.pessoa]);
        setSel([]); setReceber(null); setErro('');
        setMsg(`${receber.parte}: recebido ${D.moedaBR(receber.valor)}${r.troco > 0 ? ` · troco ${D.moedaBR(r.troco)}` : ''}.`);
        if (r.finalizada) onFinalizada(r);
      } catch (e) { setErro(e.regra ? e.message : 'Erro inesperado: ' + e.message); if (!e.regra) console.error(e); }
    };
    if (receber) return html`<${window.RestUI.Pagamento} total=${receber.valor} erro=${erro} titulo=${receber.titulo} rotulo="Confirmar recebimento"
      subtitulo=${`Mesa ${v.mesa} · ${receber.parte}`} onFechar=${() => { setReceber(null); setErro(''); }} onConcluir=${confirmarReceber} />`;
    return html`
      <${Modal} titulo=${`Fechar conta · Mesa ${v.mesa}`} onFechar=${onFechar}>
        <div className="rest-conta">
          <div className="rest-pag-totais">
            <div><span>Total</span><b>${D.moedaBR(t.total)}</b></div>
            <div><span>Recebido</span><b>${D.moedaBR(t.pago)}</b></div>
            <div className="pendente"><span>Falta</span><b>${D.moedaBR(t.restante)}</b></div>
            <div><span>Pessoas</span><b>${v.pessoas}</b></div>
          </div>
          ${msg && html`<div className="toast rest-toast toast-ok" role="status">${msg}</div>`}
          <${Segmentos} rotulo="Como pagar" opcoes=${MODOS} valor=${modo} onChange=${m => { setModo(m); setMsg(''); }} />

          ${modo === 'inteira' && html`
            <p className="dv-ajuda">Recebe todo o valor que falta, com uma ou mais formas de pagamento.</p>
            <button type="button" className="btn rest-btn-grande rest-btn-concluir" onClick=${() => setReceber({valor: t.restante, parte: 'Conta inteira', titulo: 'Receber conta'})}>
              Receber ${D.moedaBR(t.restante)}</button>`}

          ${modo === 'pessoas' && html`
            <div className="rest-pessoas" role="group" aria-label="Dividir em quantas pessoas">
              <span>Dividir em</span>
              ${[2, 3, 4, 5, 6].map(k => html`<button type="button" key=${k} className=${n === k ? 'ativo' : ''} aria-pressed=${n === k} disabled=${recebidas.length > 0}
                onClick=${() => setN(k)}>${k}</button>`)}
              <input type="number" min="2" max="50" value=${n} disabled=${recebidas.length > 0} aria-label="Outro número de pessoas" onInput=${e => setN(Math.min(50, Math.max(2, Number(e.target.value) || 2)))} />
            </div>
            <p className="dv-ajuda">Divide ${D.moedaBR(valorBase)}${t.pago > 0 && !recebidas.length ? ' (o que ainda falta)' : ''} em ${n} partes.${recebidas.length ? ' Para mudar a quantidade, termine esta divisão.' : ''}</p>
            <ul className="rest-partes">${partes.map((valor, k) => {
              const pessoa = k + 1, ok = recebidas.includes(pessoa);
              return html`<li key=${pessoa} className=${ok ? 'ok' : ''}>
                <span>Pessoa ${pessoa}</span><b>${D.moedaBR(valor)}</b>
                ${ok ? html`<span className="badge b-ok">Recebido</span>`
                  : html`<button type="button" className="btn" onClick=${() => { if (base === null) setBase(t.restante); setReceber({valor, pessoa, parte: `Pessoa ${pessoa}/${n}`, titulo: `Receber pessoa ${pessoa} de ${n}`}); }}>Receber</button>`}
              </li>`;
            })}</ul>`}

          ${modo === 'itens' && html`
            <p className="dv-ajuda">Marque o que esta pessoa vai pagar. O valor já inclui a parte da taxa de serviço${t.desconto || t.acrescimo ? ', do desconto e do acréscimo' : ''}.</p>
            ${naoPagos.length ? html`
              <ul className="rest-itens-conta">${naoPagos.map(i => html`<li key=${i.id}>
                <label className="rest-check"><input type="checkbox" checked=${sel.includes(i.id)} onChange=${() => setSel(sel.includes(i.id) ? sel.filter(x => x !== i.id) : [...sel, i.id])} />
                  ${qtdBR(i.quantidade)}× ${i.nome}</label><b>${D.moedaBR(D.valorDosItens(v, [i.id]))}</b></li>`)}</ul>
              <div className="rest-form-acoes">
                <button type="button" className="btn btn-ghost" onClick=${() => setSel(sel.length === naoPagos.length ? [] : naoPagos.map(i => i.id))}>${sel.length === naoPagos.length ? 'Desmarcar tudo' : 'Marcar o restante'}</button>
                <button type="button" className="btn rest-btn-concluir" disabled=${!sel.length}
                  onClick=${() => setReceber({valor: valorSel, itemIds: sel, parte: 'Itens: ' + naoPagos.filter(i => sel.includes(i.id)).map(i => i.nome).join(', '), titulo: 'Receber itens'})}>
                  Receber ${sel.length ? D.moedaBR(valorSel) : 'itens marcados'}</button>
              </div>`
            : html`<p className="dv-ajuda">Todos os itens já foram pagos. Use "Conta inteira" para receber o que falta.</p>`}`}
        </div>
        <div className="cf-acoes"><button type="button" className="btn btn-ghost" onClick=${onFechar}>Voltar ao pedido</button></div>
      <//>`;
  }

  // ---- Pedido da mesa ----
  function TelaPedido({params, ir}){
    useDados(); useRelogio();
    const {el: aviso, tentar, mostrar} = useAviso();
    const [fechando, setFechando] = useState(false);
    const [transferindo, setTransferindo] = useState(false);
    const [editando, setEditando] = useState(null); // item em edição: quantidade, preço unitário, desconto e observação
    const [obsAberta, setObsAberta] = useState(null);
    const [final, setFinal] = useState(null);
    const refBusca = useRef(null);
    const v = D.vendaPorId(params.id);
    const podeReceber = D.podeAcessar('vendas');
    useEffect(() => {
      const tecla = e => { if (e.key === 'F2' && !fechando) { e.preventDefault(); refBusca.current?.focus(); } };
      window.addEventListener('keydown', tecla);
      return () => window.removeEventListener('keydown', tecla);
    });
    if (final) return html`
      <div className="card rest-concluida" role="status">
        <span className="rest-concluida-ic" aria-hidden="true">✓</span>
        <h2>Conta da mesa ${final.venda.mesa} fechada</h2>
        <p>${D.moedaBR(D.totaisVenda(final.venda).total)} · venda #${final.venda.numero}</p>
        ${final.troco > 0 && html`<div className="rest-troco"><span>Troco</span><b>${D.moedaBR(final.troco)}</b></div>`}
        <div className="rest-concluida-acoes"><button type="button" className="btn btn-ghost" onClick=${() => window.RestUI.impressao.cupom(final.venda)}>🖨️ Imprimir cupom</button></div>
        <button type="button" className="btn rest-btn-grande" autoFocus onClick=${() => ir('mesas')}>Voltar às mesas</button>
      </div>`;
    if (!v || v.tipo !== 'MESA' || v.status !== 'ABERTA') return html`
      <div className="card rest-breve-card"><h2>Pedido não está aberto</h2>
        <p>${v ? `O pedido #${v.numero} já foi ${v.status === 'FINALIZADA' ? 'fechado' : 'cancelado'}.` : 'Pedido não encontrado.'}</p>
        <button type="button" className="btn" onClick=${() => ir('mesas')}>Voltar às mesas</button></div>`;

    const t = D.totaisVenda(v);
    const imp = window.RestUI.impressao;
    const novosCozinha = imp.pendentes(v).length;
    const adicionar = (p, q, opcoes = {}) => !!tentar(() => D.adicionarItem(v.id, p.id, {quantidade: q, ...opcoes}), i => `${qtdBR(q)}× ${i.nome} lançado na mesa ${v.mesa}.`);
    const mudarQtd = (i, q) => q <= 0 ? remover(i) : tentar(() => D.alterarItem(v.id, i.id, {quantidade: q}));
    const remover = i => { if (confirmar(`Excluir ${qtdBR(i.quantidade)}× ${i.nome} da mesa ${v.mesa}?`)) tentar(() => D.removerItem(v.id, i.id), `${i.nome} excluído.`); };
    const cancelarMesa = () => {
      const motivo = window.prompt(`Cancelar o pedido da mesa ${v.mesa}? Informe o motivo:`);
      if (motivo !== null && tentar(() => D.cancelarVenda(v.id, motivo))) ir('mesas');
    };
    const livres = D.mesas().filter(m => m.ativo && !D.vendaDaMesa(m.id));
    return html`
      <div className="rest-pdv-aviso">${aviso}</div>
      <div className="rest-mesa-topo">
        <button type="button" className="btn btn-ghost" onClick=${() => ir('mesas')}>← Mesas</button>
        <div className="rest-mesa-titulo"><h2>Mesa ${v.mesa}</h2>
          <span>Pedido #${v.numero} · aberto há ${tempoDesde(v.data)} por ${v.operador}${v.contaPedida ? ' · 🧾 conta pedida' : ''}</span></div>
        <div className="rest-mesa-acoes">
          <button type="button" className="btn btn-ghost" onClick=${() => setTransferindo(true)}>Transferir</button>
          <button type="button" className="btn btn-ghost" onClick=${cancelarMesa}>Cancelar mesa</button>
        </div>
      </div>
      <div className="rest-pdv rest-pdv-mesa">
        <${window.RestUI.SeletorProdutos} refBusca=${refBusca} onEscolher=${adicionar} />
        <aside className="rest-pdv-carrinho" aria-label="Comanda da mesa">
          <div className="rest-car-topo"><b>Comanda</b><span>${plural(v.itens.length, 'item', 'itens')}</span>
            <span className="rest-pessoas-mini">👥
              <button type="button" aria-label="Menos pessoas" onClick=${() => v.pessoas > 1 && tentar(() => D.definirPessoas(v.id, v.pessoas - 1))}>−</button>
              ${v.pessoas}
              <button type="button" aria-label="Mais pessoas" onClick=${() => tentar(() => D.definirPessoas(v.id, v.pessoas + 1))}>+</button></span></div>
          <ul className="rest-car-itens">
            ${v.itens.length ? v.itens.map(i => html`<li key=${i.id} className=${i.pago ? 'rest-item-pago' : ''}>
              <div className="rest-car-linha">
                <span className="rest-car-nome">${qtdBR(i.quantidade)}× ${i.nome}${i.pago ? html` <span className="badge b-ok">pago</span>` : null}
                  <small>${D.moedaBR(i.precoUnitario)} un.${i.adicionadoEm ? ` · ${new Date(i.adicionadoEm).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} ${i.adicionadoPor || ''}` : ''}</small>
                  ${i.adicionais?.length ? html`<small className="rest-car-extras">+ ${window.RestUI.adicionaisTxt(i)}</small>` : null}
                  ${i.desconto > 0 || i.promocao ? html`<small className="rest-car-extras">${i.promocao ? `🏷️ ${i.promocao}` : ''}${i.desconto > 0 ? `${i.promocao ? ' · ' : ''}desconto ${D.moedaBR(i.desconto)}` : ''}</small>` : null}
                  ${i.observacao && obsAberta !== i.id ? html`<small className="rest-obs-txt">📝 ${i.observacao}</small>` : null}</span>
                <b>${D.moedaBR(i.quantidade * i.precoUnitario - (i.desconto || 0))}</b>
              </div>
              ${!i.pago && html`<div className="rest-car-acoes">
                <button type="button" aria-label="Diminuir" onClick=${() => mudarQtd(i, i.quantidade - 1)}>−</button>
                <span className="rest-qtd-txt">${qtdBR(i.quantidade)}</span>
                <button type="button" aria-label="Aumentar" onClick=${() => mudarQtd(i, i.quantidade + 1)}>+</button>
                <button type="button" className=${'rest-car-obs-btn' + (i.observacao ? ' com' : '')} onClick=${() => setObsAberta(obsAberta === i.id ? null : i.id)}>${i.observacao ? '✎ obs.' : '+ obs.'}</button>
                <button type="button" className="rest-car-obs-btn" title="Quantidade, preço unitário e desconto" onClick=${() => setEditando({id: i.id, quantidade: qtdBR(i.quantidade), preco: D.valorBR(i.precoUnitario), desconto: i.desconto ? D.valorBR(i.desconto) : '', observacao: i.observacao || ''})}>✎</button>
                <button type="button" className="rest-car-rm" aria-label=${'Excluir ' + i.nome} onClick=${() => remover(i)}>✕</button>
              </div>`}
              ${obsAberta === i.id && html`<input type="text" className="rest-car-obs" placeholder="Observação (ex.: sem cebola)" maxLength="100" defaultValue=${i.observacao} autoFocus
                onKeyDown=${e => { if (e.key === 'Enter') e.target.blur(); }} onBlur=${e => { tentar(() => D.alterarItem(v.id, i.id, {observacao: e.target.value})); setObsAberta(null); }} />`}
            </li>`) : html`<li className="rest-car-vazio">Mesa aberta. Toque nos produtos para lançar.<small>Busca: F2</small></li>`}
          </ul>
          <label className="rest-servico">
            <input type="checkbox" checked=${!!v.taxaServico?.ativa} onChange=${e => tentar(() => D.definirServico(v.id, e.target.checked))} />
            <span>Taxa de serviço (${String(v.taxaServico?.percentual ?? D.config().taxaServico).replace('.', ',')}%)</span>
          </label>
          <div className="rest-car-totais">
            <div><span>Consumo</span><b>${D.moedaBR(t.itens)}</b></div>
            ${t.servico > 0 && html`<div><span>Taxa de serviço</span><b>+ ${D.moedaBR(t.servico)}</b></div>`}
            ${t.desconto > 0 && html`<div><span>Desconto</span><b>− ${D.moedaBR(t.desconto)}</b></div>`}
            ${t.acrescimo > 0 && html`<div><span>Acréscimo</span><b>+ ${D.moedaBR(t.acrescimo)}</b></div>`}
            <div className="rest-car-total"><span>Total</span><b>${D.moedaBR(t.total)}</b></div>
            ${t.pago > 0 && html`<div><span>Recebido</span><b>${D.moedaBR(t.pago)}</b></div><div className="rest-falta"><span>Falta</span><b>${D.moedaBR(t.restante)}</b></div>`}
          </div>
          ${t.pago > 0 && podeReceber && html`<details className="rest-recebimentos"><summary>${plural(v.pagamentos.length, 'recebimento', 'recebimentos')} parciais</summary>
            <ul>${v.pagamentos.map(p => html`<li key=${p.id}><span>${p.parte || 'Recebimento'} · ${p.nome}</span><b>${D.moedaBR(p.valor)}</b>
              <button type="button" className="rest-link" onClick=${() => { if (confirmar(`Desfazer o recebimento de ${D.moedaBR(p.valor)} (${p.nome})? O valor deve ser devolvido ao cliente.`)) tentar(() => D.removerPagamento(v.id, p.id), 'Recebimento desfeito.'); }}>desfazer</button></li>`)}</ul></details>`}
          <div className="rest-mesa-imprimir">
            <button type="button" className="btn btn-ghost" disabled=${!novosCozinha} title="Imprime a comanda só com os itens ainda não enviados"
              onClick=${() => { const n = imp.comanda(v); mostrar(`${plural(n, 'item enviado', 'itens enviados')} para a cozinha.`); }}>🖨️ Cozinha${novosCozinha ? ` (${novosCozinha})` : ''}</button>
            <button type="button" className="btn btn-ghost" disabled=${!v.itens.length} title="Pré-conta para o cliente conferir" onClick=${() => imp.conferencia(v)}>🖨️ Conferência</button>
          </div>
          <button type="button" className="btn rest-btn-manter" disabled=${!v.itens.length} title="O cliente continua consumindo: a mesa fica aberta com a comanda"
            onClick=${() => { if (D.config().impressao.comandaAuto) imp.comanda(v); ir('mesas', {aberta: v.mesa}); }}>🍽️ Manter mesa aberta</button>
          <button type="button" className="btn btn-ghost" onClick=${() => { if (tentar(() => D.pedirConta(v.id, !v.contaPedida), v.contaPedida ? 'Conta reaberta.' : 'Conta pedida: a mesa aparece em laranja no mapa.') && v.contaPedida) imp.aposPedirConta(v); }}>
            ${v.contaPedida ? 'Reabrir conta' : '🧾 Pedir conta'}</button>
          ${podeReceber ? html`<button type="button" className="btn rest-btn-finalizar" disabled=${!v.itens.length} onClick=${() => setFechando(true)}>Fechar conta · ${D.moedaBR(t.restante)}</button>`
            : html`<p className="dv-ajuda">O recebimento é feito pelo caixa.</p>`}
        </aside>
      </div>
      ${editando && (() => {
        const i = v.itens.find(x => x.id === editando.id);
        if (!i) return null;
        const salvarItem = () => { if (tentar(() => D.alterarItem(v.id, i.id, {quantidade: editando.quantidade, precoUnitario: editando.preco, desconto: editando.desconto, observacao: editando.observacao}), `${i.nome} atualizado.`)) setEditando(null); };
        const totalItem = (D.lerValor(editando.quantidade) || 0) * (D.lerValor(editando.preco) || 0) - (D.lerValor(editando.desconto) || 0);
        return html`<${Modal} titulo=${`Editar · ${i.nome}`} onFechar=${() => setEditando(null)}>
          <form onSubmit=${e => { e.preventDefault(); salvarItem(); }}>
            <div className="form-grid">
              <div className="field"><label htmlFor="eiQtd">Quantidade</label><input id="eiQtd" type="text" inputMode="decimal" value=${editando.quantidade} onInput=${e => setEditando({...editando, quantidade: e.target.value})} /></div>
              <div className="field"><label htmlFor="eiPreco">Preço unitário (R$)</label><input id="eiPreco" type="text" inputMode="decimal" value=${editando.preco} onInput=${e => setEditando({...editando, preco: e.target.value})} /></div>
              <div className="field"><label htmlFor="eiDesc">Desconto no item (R$)</label><input id="eiDesc" type="text" inputMode="decimal" placeholder="0,00" value=${editando.desconto} onInput=${e => setEditando({...editando, desconto: e.target.value})} /></div>
              <div className="field rest-largo"><label htmlFor="eiObs">Observação</label><input id="eiObs" type="text" maxLength="100" value=${editando.observacao} onInput=${e => setEditando({...editando, observacao: e.target.value})} /></div>
            </div>
            <p className="dv-ajuda">Total do item: <b>${D.moedaBR(Math.max(totalItem, 0))}</b>. Mudanças de preço e desconto ficam registradas na auditoria.</p>
            ${aviso}
            <div className="cf-acoes">
              <button type="button" className="btn btn-ghost" onClick=${() => setEditando(null)}>Cancelar</button>
              <button type="submit" className="btn">Salvar</button>
            </div>
          </form>
        <//>`;
      })()}
      ${fechando && html`<${FecharConta} v=${v} onFechar=${() => setFechando(false)} onFinalizada=${r => { setFechando(false); setFinal(r); imp.aposMesa(r.venda); }} />`}
      ${transferindo && html`
        <${Modal} titulo=${`Transferir mesa ${v.mesa}`} onFechar=${() => setTransferindo(false)}>
          <p className="dv-ajuda">Escolha a mesa livre para onde o pedido vai.</p>
          <div className="rest-mapa rest-mapa-mini">${livres.length ? livres.map(m => html`<button type="button" key=${m.id} className="rest-mesa livre"
            onClick=${() => { if (tentar(() => D.transferirMesa(v.id, m.id), `Pedido transferido para a mesa ${m.numero}.`)) setTransferindo(false); }}>
            <span className="rest-mesa-num">${m.numero}</span><span className="rest-mesa-info">${m.descricao || 'Livre'}</span></button>`)
            : html`<p className="dv-ajuda">Nenhuma mesa livre.</p>`}</div>
          <div className="cf-acoes"><button type="button" className="btn btn-ghost" onClick=${() => setTransferindo(false)}>Cancelar</button></div>
        <//>`}`;
  }

  window.RestUI.telas.mesas = TelaMesas;
  window.RestUI.telas['mesas/pedido'] = TelaPedido;
})();
