// =====================================================================
// ---- 🛵 MGA · Delivery e encomenda: pedidos, status, entregador e tempo ----
// =====================================================================
// Pedido (WhatsApp/telefone) → preparação → pronto → entregador → entrega → pagamento → caixa.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect, useRef} = React;
  const {html, D, useDados, useAviso, Cabecalho, Modal, Segmentos, confirmar, plural} = window.RestUI;
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const qtdBR = q => String(q).replace('.', ',');
  const hora = iso => new Date(iso).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'});
  const dataHora = iso => new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
  function useRelogio(){ const [, set] = useState(0); useEffect(() => { const t = setInterval(() => set(x => x + 1), 30000); return () => clearInterval(t); }, []); }

  // Rascunho do novo pedido (também recebe o carrinho do balcão pelo F11)
  const CHAVE = 'mga_deliveryRascunho';
  const lerRascunho = () => { try { return JSON.parse(sessionStorage.getItem(CHAVE)) || {itens: []}; } catch (e) { return {itens: []}; } };
  const gravarRascunho = r => { try { sessionStorage.setItem(CHAVE, JSON.stringify(r)); } catch (e) { /* storage indisponível */ } };

  // ---- Indicador de tempo: 🟢 / 🟡 / 🔴 (limites em Configurações › Restaurante) ----
  const ICONE_FAIXA = {verde: '🟢', amarelo: '🟡', vermelho: '🔴', agendado: '📅'};
  function Tempo({v}){
    const t = D.tempoPedido(v);
    const texto = t.faixa === 'agendado' ? `para ${dataHora(v.agendadoPara)}`
      : t.min < 60 ? `${String(t.min).padStart(2, '0')} min` : `${Math.floor(t.min / 60)} h ${String(t.min % 60).padStart(2, '0')} min`;
    const titulo = {verde: 'Dentro do tempo', amarelo: 'Atenção ao tempo', vermelho: 'Fora do tempo esperado', agendado: 'Encomenda agendada'}[t.faixa];
    return html`<span className=${'rest-tempo ' + t.faixa} title=${titulo}><span aria-hidden="true">${ICONE_FAIXA[t.faixa]}</span> ${texto}</span>`;
  }
  const PILULA = {RECEBIDO: 'rest-st-recebido', PREPARANDO: 'rest-st-preparando', PRONTO: 'rest-st-pronto', SAIU: 'rest-st-saiu', ENTREGUE: 'b-ok'};
  const nomeStatus = v => v.statusDelivery === 'ENTREGUE' && v.modo === 'RETIRAR' ? 'Retirado' : D.STATUS_DELIVERY[v.statusDelivery] || '—';
  const endereco = v => v.modo === 'RETIRAR' ? 'Vem buscar' : [`${v.entrega?.endereco || ''}${v.entrega?.numero ? ', ' + v.entrega.numero : ''}`, v.entrega?.complemento, v.entrega?.bairro].filter(Boolean).join(' · ');

  // Próxima ação de cada pedido (botão principal do cartão)
  function proximo(v){
    if (v.statusDelivery === 'RECEBIDO') return {status: 'PREPARANDO', rotulo: 'Iniciar preparo'};
    if (v.statusDelivery === 'PREPARANDO') return {status: 'PRONTO', rotulo: 'Marcar pronto'};
    if (v.statusDelivery === 'PRONTO') return v.modo === 'ENTREGAR' ? {enviar: true, rotulo: 'Enviar para entrega'} : {entregar: true, rotulo: 'Retirado pelo cliente'};
    return {entregar: true, rotulo: 'Entregue'};
  }

  // ---- Enviar para entrega: um entregador, vários pedidos ----
  function EnviarEntrega({inicial = [], onFechar, onEnviado}){
    useDados();
    const ativos = D.entregadores().filter(e => e.ativo);
    const [entregadorId, setEntregadorId] = useState(ativos[0]?.id || '');
    const pendentes = D.pedidosDelivery().filter(v => v.modo === 'ENTREGAR' && v.statusDelivery !== 'SAIU').sort((a, b) => a.numero - b.numero);
    const [sel, setSel] = useState(inicial.length ? inicial : pendentes.filter(v => v.statusDelivery === 'PRONTO').map(v => v.id));
    const [erro, setErro] = useState('');
    const enviar = () => { try { const l = D.enviarEntregador(entregadorId, sel); onEnviado(`${plural(l.length, 'pedido enviado', 'pedidos enviados')} com ${D.entregadorPorId(entregadorId).nome}.`); } catch (e) { setErro(e.message); } };
    return html`
      <${Modal} titulo="Enviar delivery · pedidos não enviados" onFechar=${onFechar}>
        <div className="rest-enviar">
          ${ativos.length ? html`<div className="field"><label htmlFor="envEntregador">Entregador</label>
            <select id="envEntregador" value=${entregadorId} onChange=${e => setEntregadorId(e.target.value)}>${ativos.map(e => html`<option key=${e.id} value=${e.id}>${e.nome}</option>`)}</select></div>`
            : html`<p className="toast rest-toast toast-erro">Nenhum entregador ativo. Cadastre em Cadastros › Entregadores.</p>`}
          ${pendentes.length ? html`<ul className="rest-itens-conta">${pendentes.map(v => html`<li key=${v.id}>
              <label className="rest-check"><input type="checkbox" checked=${sel.includes(v.id)} onChange=${() => setSel(sel.includes(v.id) ? sel.filter(x => x !== v.id) : [...sel, v.id])} />
                <span className="rest-envio-txt"><span><b>#${v.numero}</b> · ${hora(v.data)} · ${v.entrega.nome}</span><small className="history-date">${endereco(v)}</small></span></label>
              <span className=${'badge ' + PILULA[v.statusDelivery]}>${nomeStatus(v)}</span>
              <b>${D.moedaBR(D.totaisVenda(v).total)}</b></li>`)}</ul>
            <div className="rest-form-acoes"><button type="button" className="btn btn-ghost" onClick=${() => setSel(sel.length === pendentes.length ? [] : pendentes.map(v => v.id))}>${sel.length === pendentes.length ? 'Desmarcar todos' : 'Selecionar todos'}</button></div>`
            : html`<p className="dv-ajuda">Nenhum pedido aguardando entregador.</p>`}
          ${erro && html`<div className="toast rest-toast toast-erro" role="alert">${erro}</div>`}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Voltar</button>
          <button type="button" className="btn" disabled=${!sel.length || !entregadorId} onClick=${enviar}>Enviar ${sel.length ? `(${sel.length})` : ''}</button>
        </div>
      <//>`;
  }

  // ---- Detalhes do pedido: itens, entrega, histórico e cancelamento ----
  function Detalhes({v, onFechar, onCancelado}){
    const [motivo, setMotivo] = useState(null);
    const [erro, setErro] = useState('');
    const t = D.totaisVenda(v);
    const e = v.entrega || {};
    const cancelar = () => { try { D.cancelarVenda(v.id, motivo); onCancelado(`${D.TIPOS_VENDA[v.tipo]} #${v.numero} cancelado.`); } catch (x) { setErro(x.message); } };
    return html`
      <${Modal} titulo=${`${D.TIPOS_VENDA[v.tipo]} #${v.numero}`} onFechar=${onFechar}>
        <div className="rest-venda-det">
          <p className="dv-ajuda">${D.MODOS_ENTREGA[v.modo]} · pedido às ${dataHora(v.data)} por ${v.operador}${v.agendadoPara ? ` · para ${dataHora(v.agendadoPara)}` : ''}</p>
          <div className="rest-det-cliente">
            <b>${e.nome}</b> · ${e.telefone}
            ${v.modo === 'ENTREGAR' && html`<span>${endereco(v)}${e.cidade ? ' · ' + e.cidade : ''}${e.cep ? ' · CEP ' + e.cep : ''}</span>`}
            ${e.referencia && html`<span>Referência: ${e.referencia}</span>`}
          </div>
          <table><tbody>${v.itens.map(i => html`<tr key=${i.id}><td>${qtdBR(i.quantidade)}× ${i.nome}${i.adicionais?.length ? html`<small className="history-date">+ ${window.RestUI.adicionaisTxt(i)}</small>` : null}${i.observacao ? html`<small className="history-date">📝 ${i.observacao}</small>` : null}</td>
            <td className="nowrap">${D.moedaBR(i.quantidade * i.precoUnitario - (i.desconto || 0))}</td></tr>`)}</tbody></table>
          <div className="rest-rf">
            <div className="rest-rf-linha"><span>Produtos</span><b>${D.moedaBR(t.itens)}</b></div>
            ${t.desconto > 0 && html`<div className="rest-rf-linha rest-rf-neg"><span>Desconto</span><b>− ${D.moedaBR(t.desconto)}</b></div>`}
            ${t.acrescimo > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Acréscimo</span><b>+ ${D.moedaBR(t.acrescimo)}</b></div>`}
            ${t.entrega > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Taxa de entrega</span><b>+ ${D.moedaBR(t.entrega)}</b></div>`}
            ${t.embalagem > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Embalagens</span><b>+ ${D.moedaBR(t.embalagem)}</b></div>`}
            <div className="rest-rf-linha rest-rf-total"><span>Total</span><b>${D.moedaBR(t.total)}</b></div>
            ${v.aplicativo && html`<div className="rest-rf-linha rest-rf-nota"><span>Pedido pelo ${v.aplicativo.nome}</span><b>comissão ${String(v.aplicativo.comissao).replace('.', ',')}%</b></div>`}
            ${t.pago > 0 && html`<div className="rest-rf-linha"><span>Já pago</span><b>${D.moedaBR(t.pago)}</b></div>`}
            ${v.formaPrevistaId && html`<div className="rest-rf-linha rest-rf-nota"><span>Pagamento previsto</span><b>${D.formaPorId(v.formaPrevistaId)?.nome}${v.trocoPara ? ` · troco para ${D.moedaBR(v.trocoPara)}` : ''}${v.levarMaquina ? ' · levar máquina' : ''}</b></div>`}
          </div>
          ${v.obs && html`<p className="dv-ajuda">Obs.: ${v.obs}</p>`}
          <div className="rest-rf-grupo">Histórico</div>
          <ul className="rest-historico">${(v.historico || []).map((h, k) => html`<li key=${k}><span>${dataHora(h.data)}</span>${h.status === 'ENTREGUE' && v.modo === 'RETIRAR' ? 'Retirado' : D.STATUS_DELIVERY[h.status]}${h.entregador ? ` · ${h.entregador}` : ''} <small>${h.usuario}</small></li>`)}
            ${v.status === 'CANCELADA' && html`<li><span>${dataHora(v.canceladaEm)}</span>Cancelado: ${v.motivoCancelamento}</li>`}</ul>
          ${motivo !== null && html`<div className="field"><label htmlFor="dlvMotivo">Motivo do cancelamento</label>
            <input id="dlvMotivo" type="text" maxLength="150" autoFocus value=${motivo} onInput=${x => setMotivo(x.target.value)} onKeyDown=${x => { if (x.key === 'Enter') cancelar(); }} /></div>`}
          ${erro && html`<div className="toast rest-toast toast-erro" role="alert">${erro}</div>`}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Fechar</button>
          ${v.status !== 'CANCELADA' && html`<button type="button" className="btn btn-ghost" onClick=${() => window.RestUI.impressao.comanda(v, {todos: true})}>🖨️ Comanda</button>
            <button type="button" className="btn btn-ghost" onClick=${() => window.RestUI.impressao.entrega(v)}>🖨️ ${v.modo === 'RETIRAR' ? 'Cupom' : 'Cupom de entrega'}</button>`}
          ${v.status === 'ABERTA' && (motivo === null
            ? html`<button type="button" className="btn btn-perigo" onClick=${() => setMotivo('')}>Cancelar pedido</button>`
            : html`<button type="button" className="btn btn-perigo" onClick=${cancelar}>Confirmar cancelamento</button>`)}
        </div>
      <//>`;
  }

  // ---- Lista de pedidos ----
  const ABAS = [['delivery', 'Delivery'], ['encomenda', 'Encomendas'], ['concluidos', 'Concluídos hoje']];
  function TelaDelivery({ir, params}){
    useDados(); useRelogio();
    const {el: aviso, tentar, mostrar} = useAviso();
    const [aba, setAbaEstado] = useState(ABAS.some(([a]) => a === params.aba) ? params.aba : 'delivery');
    // A aba fica no endereço (F5 mantém) sem gerar nova entrada no histórico
    const setAba = a => { setAbaEstado(a); history.replaceState(null, '', '#/delivery?aba=' + a); };
    const [enviando, setEnviando] = useState(null);
    const [pagando, setPagando] = useState(null);
    const [erroPag, setErroPag] = useState('');
    const [detalhe, setDetalhe] = useState(null);
    useEffect(() => { if (params.ok) { mostrar(`Pedido #${params.ok} gravado: aparece como "Pedido recebido".`); history.replaceState(null, '', '#/delivery?aba=' + aba); } }, []);
    const abertos = D.pedidosDelivery();
    const hoje = D.hojeISO();
    const lista = aba === 'concluidos'
      ? D.vendas().filter(v => D.ehDelivery(v) && v.status !== 'ABERTA' && D.diaISO(new Date(v.finalizadaEm || v.canceladaEm || v.data)) === hoje && v.entrega).sort((a, b) => b.numero - a.numero)
      : abertos.filter(v => v.tipo === (aba === 'delivery' ? 'DELIVERY' : 'ENCOMENDA'))
        .sort((a, b) => aba === 'encomenda' ? String(a.agendadoPara).localeCompare(String(b.agendadoPara)) : a.numero - b.numero);
    const conta = s => abertos.filter(v => v.tipo === 'DELIVERY' && v.statusDelivery === s).length;
    const podeReceber = D.podeAcessar('vendas');
    const acao = v => {
      const p = proximo(v);
      if (p.status) return tentar(() => D.alterarStatusDelivery(v.id, p.status), `#${v.numero}: ${D.STATUS_DELIVERY[p.status]}.`);
      if (p.enviar) return setEnviando([v.id]);
      if (!podeReceber) return mostrar('A entrega é concluída pelo caixa (recebimento).', true);
      if (D.totaisVenda(v).restante <= 0.001) { if (confirmar(`Confirmar ${v.modo === 'RETIRAR' ? 'retirada' : 'entrega'} do pedido #${v.numero}? Ele já está pago.`)) tentar(() => D.entregarPedido(v.id), `Pedido #${v.numero} concluído.`); return; }
      setErroPag(''); setPagando(v);
    };
    const receber = ({pagamentos, clienteId}) => {
      try { const r = D.entregarPedido(pagando.id, {pagamentos, clienteId}); setPagando(null); mostrar(`Pedido #${r.venda.numero} concluído${r.troco > 0 ? ` · troco ${D.moedaBR(r.troco)}` : ''}.`); }
      catch (e) { setErroPag(e.regra ? e.message : 'Erro inesperado: ' + e.message); if (!e.regra) console.error(e); }
    };
    const voltarStatus = v => {
      const i = D.ORDEM_STATUS.indexOf(v.statusDelivery);
      const anterior = v.statusDelivery === 'SAIU' ? 'PRONTO' : D.ORDEM_STATUS[i - 1];
      if (anterior && confirmar(`Voltar o pedido #${v.numero} para "${D.STATUS_DELIVERY[anterior]}"?`)) tentar(() => D.alterarStatusDelivery(v.id, anterior));
    };
    const cx = D.caixaAberto();
    return html`
      <${Cabecalho} titulo="Delivery" sub=${`Pedidos pelo WhatsApp ou telefone · ${plural(abertos.filter(v => v.tipo === 'DELIVERY').length, 'delivery em andamento', 'deliveries em andamento')}`}>
        <button type="button" className="btn btn-ghost" onClick=${() => setEnviando([])}>🛵 Enviar para entrega</button>
        <button type="button" className="btn btn-ghost" disabled=${!cx} onClick=${() => ir('delivery/novo', {tipo: 'ENCOMENDA'})}>+ Encomenda</button>
        <button type="button" className="btn" disabled=${!cx} onClick=${() => ir('delivery/novo', {tipo: 'DELIVERY'})}>+ Novo delivery</button>
      <//>
      ${!cx && html`<div className="rest-aviso-mesas">O caixa está fechado: abra o caixa para lançar pedidos.</div>`}
      ${aviso}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Pedidos" opcoes=${ABAS.map(([a, n]) => [a, a === 'delivery' ? `${n} (${abertos.filter(v => v.tipo === 'DELIVERY').length})` : a === 'encomenda' ? `${n} (${abertos.filter(v => v.tipo === 'ENCOMENDA').length})` : n])} valor=${aba} onChange=${setAba} />
        ${aba === 'delivery' && html`<ul className="rest-legenda-mesas" aria-label="Pedidos por status">
          ${['RECEBIDO', 'PREPARANDO', 'PRONTO', 'SAIU'].map(s => html`<li key=${s}><span className=${'badge ' + PILULA[s]}>${D.STATUS_DELIVERY[s]}</span> ${conta(s)}</li>`)}</ul>`}
      </div>
      <p className="dv-ajuda rest-legenda-tempo">Tempo desde o pedido: 🟢 até ${D.config().entregaVerde} min · 🟡 até ${D.config().entregaAmarelo} min · 🔴 depois disso</p>
      ${lista.length ? html`<ul className="rest-pedidos">${lista.map(v => {
        const t = D.totaisVenda(v), p = v.status === 'ABERTA' && proximo(v), f = v.formaPrevistaId && D.formaPorId(v.formaPrevistaId);
        return html`<li key=${v.id} className=${'rest-pedido ' + (v.status === 'ABERTA' ? D.tempoPedido(v).faixa : v.status === 'CANCELADA' ? 'cancelado' : 'entregue')}>
          <div className="rest-pedido-tempo">${v.status === 'ABERTA' ? html`<${Tempo} v=${v} />` : html`<span className="rest-tempo">${v.status === 'CANCELADA' ? 'Cancelado' : `${D.tempoPedido(v).min} min`}</span>`}
            <small>#${v.numero} · ${hora(v.data)}</small></div>
          <div className="rest-pedido-cliente"><b>${v.entrega.nome}${v.aplicativo ? html` <span className="badge rest-b-aberta">${v.aplicativo.nome}</span>` : null}</b><span>${endereco(v)}</span><small>${v.entrega.telefone}${v.entrega.referencia ? ' · ' + v.entrega.referencia : ''}</small></div>
          <div className="rest-pedido-pag"><b>${D.moedaBR(t.total)}</b>
            <small>${t.restante <= 0.001 && v.status === 'ABERTA' ? '✓ pago' : f ? f.nome : 'pagamento na entrega'}${v.trocoPara ? ` · troco p/ ${D.moedaBR(v.trocoPara)}` : ''}${v.levarMaquina ? ' · levar máquina' : ''}</small></div>
          <div className="rest-pedido-status"><span className=${'badge ' + (v.status === 'CANCELADA' ? 'rest-b-vencida' : PILULA[v.statusDelivery])}>${v.status === 'CANCELADA' ? 'Cancelado' : nomeStatus(v)}</span>
            ${v.entregadorId && html`<small>🛵 ${D.entregadorPorId(v.entregadorId)?.nome}</small>`}</div>
          <div className="rest-pedido-acoes">
            ${p && html`<button type="button" className=${'btn' + (p.entregar ? ' rest-btn-concluir' : '')} onClick=${() => acao(v)}>${p.rotulo}</button>`}
            ${v.status === 'ABERTA' && v.statusDelivery !== 'RECEBIDO' && html`<button type="button" className="rest-acao-linha" title="Voltar um passo" onClick=${() => voltarStatus(v)}>↶</button>`}
            <button type="button" className="rest-acao-linha" onClick=${() => setDetalhe(v.id)}>Detalhes</button>
          </div>
        </li>`;
      })}</ul>`
      : html`<p className="rest-grafico-vazio">${aba === 'concluidos' ? 'Nenhum pedido concluído hoje.' : aba === 'encomenda' ? 'Nenhuma encomenda agendada.' : 'Nenhum delivery em andamento.'}</p>`}
      ${enviando && html`<${EnviarEntrega} inicial=${enviando} onFechar=${() => setEnviando(null)} onEnviado=${m => { setEnviando(null); mostrar(m); }} />`}
      ${pagando && html`<${window.RestUI.Pagamento} total=${D.totaisVenda(pagando).restante} erro=${erroPag} formaInicial=${pagando.formaPrevistaId}
        titulo=${`${pagando.modo === 'RETIRAR' ? 'Retirada' : 'Entrega'} do pedido #${pagando.numero}`} rotulo="Concluir pedido"
        subtitulo=${`${pagando.entrega.nome}${pagando.trocoPara ? ` · troco para ${D.moedaBR(pagando.trocoPara)}` : ''}`} onFechar=${() => setPagando(null)} onConcluir=${receber} />`}
      ${detalhe && D.vendaPorId(detalhe) && html`<${Detalhes} v=${D.vendaPorId(detalhe)} onFechar=${() => setDetalhe(null)} onCancelado=${m => { setDetalhe(null); mostrar(m); }} />`}`;
  }

  // ---- Dados do delivery (cliente, endereço, pagamento) ----
  function DadosEntrega({tipo, rascunho, totalProdutos, onFechar, onSalvo}){
    const ativos = D.formasAtivas().filter(f => f.tipo !== 'PRAZO');
    const agora = new Date(Date.now() + 3600000);
    const isoLocal = d => `${D.diaISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const [f, setF] = useState({telefone: '', nome: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', referencia: '',
      modo: 'ENTREGAR', agendadoPara: isoLocal(agora), taxaEntrega: D.valorBR(D.config().taxaEntrega), formaPrevistaId: ativos[0]?.id || '',
      trocoPara: '', levarMaquina: true, obs: '', salvarCliente: true});
    const [achado, setAchado] = useState(null);
    const [erro, setErro] = useState('');
    // Taxa pela região do bairro (Cadastros › Regiões de entrega), até a pessoa digitar outra taxa
    const temRegioes = D.regioes().some(r => r.ativo);
    const comTaxa = x => x.taxaManual || !temRegioes ? x : {...x, taxaEntrega: D.valorBR(D.regiaoDoBairro(x.bairro, x.cidade)?.taxa ?? D.config().taxaEntrega)};
    const set = (k, val) => setF(x => k === 'taxaEntrega' ? {...x, taxaEntrega: val, taxaManual: true} : comTaxa({...x, [k]: val}));
    const regiao = f.modo === 'ENTREGAR' && D.regiaoDoBairro(f.bairro, f.cidade);
    const bairrosRegioes = [...new Set(D.regioes().filter(r => r.ativo).flatMap(r => r.bairros))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    // Telefone com DDD completo: puxa o cadastro do cliente
    const mudarTelefone = val => {
      const tel = D.mascaraTelefone(val);
      const c = D.clientePorTelefone(tel);
      setAchado(c);
      setF(x => c ? comTaxa({...x, telefone: tel, nome: c.nome || '', cep: c.cep || '', endereco: c.endereco || '', numero: c.numero || '', complemento: c.complemento || '',
        bairro: c.bairro || '', cidade: c.cidade || '', referencia: c.referencia || ''}) : {...x, telefone: tel});
    };
    const forma = D.formaPorId(f.formaPrevistaId);
    const taxa = f.modo === 'ENTREGAR' ? (D.lerValor(f.taxaEntrega) || 0) : 0;
    const embalagem = D.taxaEmbalagemDe(rascunho.itens);
    const base = r2(totalProdutos), ajuste = v => { const t = String(v || '').trim(); return !t ? 0 : t.endsWith('%') ? r2(base * (D.lerValor(t.slice(0, -1)) || 0) / 100) : (D.lerValor(t) || 0); };
    const total = r2(totalProdutos - ajuste(rascunho.desconto) + ajuste(rascunho.acrescimo) + taxa + embalagem);
    const apps = D.aplicativos().filter(a => a.ativo);
    const salvar = () => {
      try {
        const v = D.registrarDelivery({tipo, itens: rascunho.itens.map(i => ({produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, tamanhoId: i.tamanhoId, adicionais: i.adicionais})),
          cliente: f, modo: f.modo, agendadoPara: f.agendadoPara, taxaEntrega: f.taxaEntrega, formaPrevistaId: f.formaPrevistaId,
          trocoPara: forma?.tipo === 'DINHEIRO' ? f.trocoPara : '', levarMaquina: f.levarMaquina, obs: [rascunho.obs, f.obs].map(x => (x || '').trim()).filter(Boolean).join(' · '),
          salvarCliente: f.salvarCliente, aplicativoId: f.aplicativoId || null, desconto: rascunho.desconto || '', acrescimo: rascunho.acrescimo || ''});
        onSalvo(v);
      } catch (e) { setErro(e.regra ? e.message : 'Erro inesperado: ' + e.message); if (!e.regra) console.error(e); }
    };
    const campo = (k, rotulo, extra = {}) => html`<div className=${'field' + (extra.largo ? ' rest-largo' : '')}><label htmlFor=${'de-' + k}>${rotulo}</label>
      <input id=${'de-' + k} type="text" value=${f[k]} maxLength=${extra.max || 120} placeholder=${extra.ph || ''} inputMode=${extra.modo || 'text'}
        onInput=${e => set(k, extra.mascara ? extra.mascara(e.target.value) : e.target.value)} list=${extra.lista || null} />${extra.depois || null}</div>`;
    return html`
      <${Modal} titulo=${`Dados ${tipo === 'ENCOMENDA' ? 'da encomenda' : 'do delivery'} · ${D.moedaBR(total)}`} onFechar=${onFechar}>
        <div className="rest-dados-delivery" onKeyDown=${e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); salvar(); } }}>
          <div className="rest-pessoas" role="radiogroup" aria-label="Opção de entrega">
            ${Object.entries(D.MODOS_ENTREGA).map(([k, n]) => html`<button type="button" key=${k} role="radio" aria-checked=${f.modo === k} className=${f.modo === k ? 'ativo rest-modo' : 'rest-modo'} onClick=${() => set('modo', k)}>${k === 'ENTREGAR' ? '🛵 ' : '🏪 '}${n}</button>`)}
          </div>
          <div className="form-grid">
            <div className="field"><label htmlFor="de-telefone">Telefone</label>
              <input id="de-telefone" type="text" inputMode="tel" autoFocus value=${f.telefone} placeholder="(11) 98765-4321" onInput=${e => mudarTelefone(e.target.value)} />
              ${achado ? html`<small className="rest-achado">✓ Cliente cadastrado</small>` : null}</div>
            ${campo('nome', 'Cliente', {max: 80})}
            ${tipo === 'ENCOMENDA' && html`<div className="field"><label htmlFor="de-agenda">Data e hora da entrega</label>
              <input id="de-agenda" type="datetime-local" value=${f.agendadoPara} onChange=${e => set('agendadoPara', e.target.value)} /></div>`}
            ${f.modo === 'ENTREGAR' && html`
              ${campo('cep', 'CEP', {ph: '00000-000', modo: 'numeric', mascara: D.mascaraCep})}
              ${campo('endereco', 'Endereço', {largo: true, ph: 'Rua, avenida...'})}
              ${campo('numero', 'Número', {max: 10})}
              ${campo('complemento', 'Complemento', {ph: 'Apto, bloco'})}
              ${campo('bairro', 'Bairro', {max: 60, lista: 'bairros-regioes', depois: temRegioes && f.bairro ? html`<small className=${regiao ? 'rest-achado' : 'rest-fora-regiao'}>${regiao
                ? `✓ Região ${regiao.nome}${regiao.tempo ? ` · cerca de ${regiao.tempo} min` : ''}` : 'Fora das regiões cadastradas: taxa padrão'}</small>` : null})}
              <datalist id="bairros-regioes">${bairrosRegioes.map(x => html`<option key=${x} value=${x} />`)}</datalist>
              ${campo('cidade', 'Cidade', {max: 60})}
              ${campo('referencia', 'Referência', {largo: true, ph: 'Ponto de referência'})}
              <div className="field"><label htmlFor="de-taxa">Taxa de entrega (R$)</label><input id="de-taxa" type="text" inputMode="decimal" value=${f.taxaEntrega} onInput=${e => set('taxaEntrega', e.target.value)} /></div>`}
            ${apps.length > 0 && html`<div className="field"><label htmlFor="de-app">Pedido por</label>
              <select id="de-app" value=${f.aplicativoId || ''} onChange=${e => set('aplicativoId', e.target.value)}>
                <option value="">WhatsApp / telefone (direto)</option>${apps.map(a => html`<option key=${a.id} value=${a.id}>${a.nome}${a.comissao ? ` · ${String(a.comissao).replace('.', ',')}%` : ''}</option>`)}
              </select></div>`}
            <div className="field"><label htmlFor="de-forma">Pagamento</label>
              <select id="de-forma" value=${f.formaPrevistaId} onChange=${e => set('formaPrevistaId', e.target.value)}>${ativos.map(x => html`<option key=${x.id} value=${x.id}>${x.nome}</option>`)}</select></div>
            ${forma?.tipo === 'DINHEIRO' && html`<div className="field"><label htmlFor="de-troco">Troco para (R$)</label><input id="de-troco" type="text" inputMode="decimal" placeholder="sem troco" value=${f.trocoPara} onInput=${e => set('trocoPara', e.target.value)} /></div>`}
            ${['DEBITO', 'CREDITO'].includes(forma?.tipo) && f.modo === 'ENTREGAR' && html`<label className="rest-check"><input type="checkbox" checked=${f.levarMaquina} onChange=${e => set('levarMaquina', e.target.checked)} /> Levar máquina de cartão</label>`}
            ${campo('obs', 'Observação', {largo: true, max: 200, ph: 'Ex.: interfone quebrado, ligar ao chegar'})}
          </div>
          <label className="rest-check"><input type="checkbox" checked=${f.salvarCliente} onChange=${e => set('salvarCliente', e.target.checked)} /> ${achado ? 'Atualizar o endereço no cadastro do cliente' : 'Salvar o cliente no cadastro'}</label>
          <div className="rest-rf">
            <div className="rest-rf-linha"><span>Produtos</span><b>${D.moedaBR(totalProdutos)}</b></div>
            ${taxa > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Taxa de entrega</span><b>+ ${D.moedaBR(taxa)}</b></div>`}
            ${embalagem > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Embalagens</span><b>+ ${D.moedaBR(embalagem)}</b></div>`}
            <div className="rest-rf-linha rest-rf-total"><span>Total</span><b>${D.moedaBR(total)}</b></div>
          </div>
          ${erro && html`<div className="toast rest-toast toast-erro" role="alert">${erro}</div>`}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Voltar</button>
          <button type="button" className="btn rest-btn-concluir" onClick=${salvar}>Gravar pedido</button>
        </div>
      <//>`;
  }

  // ---- Novo pedido: produtos + comanda, depois os dados de entrega ----
  function TelaNovo({params, ir}){
    useDados();
    const tipo = params.tipo === 'ENCOMENDA' ? 'ENCOMENDA' : 'DELIVERY';
    const {el: aviso, mostrar} = useAviso();
    const [r, setR] = useState(lerRascunho);
    const [dados, setDados] = useState(false);
    const [obsAberta, setObsAberta] = useState(null);
    const refBusca = useRef(null);
    const setRasc = x => { setR(x); gravarRascunho(x); };
    const linhas = r.itens.map(i => ({...i, p: D.produtoPorId(i.produtoId)})).filter(i => i.p).map(i => ({...i, preco: D.precoItem(i.p, i), rot: window.RestUI.rotuloCarrinho(i.p, i)}));
    const total = r2(linhas.reduce((s, i) => s + i.quantidade * i.preco, 0));
    const adicionar = (p, q, opcoes = {}) => {
      if (!(q > 0)) { mostrar('Quantidade inválida.', true); return false; }
      const novo = {key: Date.now() + Math.random(), produtoId: p.id, quantidade: r2(q), observacao: opcoes.observacao || '', tamanhoId: opcoes.tamanhoId || null, adicionais: opcoes.adicionais || []};
      const igual = !window.RestUI.montado(novo) && !novo.observacao && r.itens.find(i => i.produtoId === p.id && !i.observacao && !window.RestUI.montado(i));
      setRasc({...r, itens: igual ? r.itens.map(i => i === igual ? {...i, quantidade: r2(i.quantidade + q)} : i) : [...r.itens, novo]});
      return true;
    };
    const mudarQtd = (key, q) => setRasc({...r, itens: r.itens.map(i => i.key === key ? {...i, quantidade: r2(Math.max(q, 0))} : i).filter(i => i.quantidade > 0)});
    const continuar = () => { if (!linhas.length) mostrar('Adicione ao menos um produto.', true); else setDados(true); };
    useEffect(() => {
      const tecla = e => {
        if (dados) return;
        if (e.key === 'F2') { e.preventDefault(); refBusca.current?.focus(); }
        if (e.key === 'F4') { e.preventDefault(); continuar(); }
      };
      window.addEventListener('keydown', tecla);
      return () => window.removeEventListener('keydown', tecla);
    });
    if (!D.caixaAberto()) return html`<div className="card rest-breve-card"><h2>Caixa fechado</h2><p>Abra o caixa para lançar pedidos de delivery.</p>
      <button type="button" className="btn" onClick=${() => ir('delivery')}>Voltar ao delivery</button></div>`;
    return html`
      <div className="rest-pdv-aviso">${aviso}</div>
      <div className="rest-mesa-topo">
        <button type="button" className="btn btn-ghost" onClick=${() => ir('delivery')}>← Delivery</button>
        <div className="rest-mesa-titulo"><h2>${tipo === 'ENCOMENDA' ? 'Nova encomenda' : 'Novo delivery'}</h2><span>Escolha os produtos e depois informe o cliente e a entrega</span></div>
      </div>
      <div className="rest-pdv rest-pdv-mesa">
        <${window.RestUI.SeletorProdutos} refBusca=${refBusca} onEscolher=${adicionar} />
        <aside className="rest-pdv-carrinho" aria-label="Itens do pedido">
          <div className="rest-car-topo"><b>Pedido</b><span>${plural(linhas.length, 'item', 'itens')}</span>
            ${linhas.length > 0 && html`<button type="button" className="rest-link" onClick=${() => { if (confirmar('Limpar o pedido?')) setRasc({itens: []}); }}>Limpar</button>`}</div>
          <ul className="rest-car-itens">
            ${linhas.length ? linhas.map(i => html`<li key=${i.key}>
              <div className="rest-car-linha"><span className="rest-car-nome">${i.rot.nome}${i.rot.extras ? html`<small className="rest-car-extras">+ ${i.rot.extras}</small>` : null}<small>${D.moedaBR(i.preco)} un.</small></span><b>${D.moedaBR(i.quantidade * i.preco)}</b></div>
              <div className="rest-car-acoes">
                <button type="button" aria-label="Diminuir" onClick=${() => mudarQtd(i.key, i.quantidade - 1)}>−</button>
                <span className="rest-qtd-txt">${qtdBR(i.quantidade)}</span>
                <button type="button" aria-label="Aumentar" onClick=${() => mudarQtd(i.key, i.quantidade + 1)}>+</button>
                <button type="button" className=${'rest-car-obs-btn' + (i.observacao ? ' com' : '')} onClick=${() => setObsAberta(obsAberta === i.key ? null : i.key)}>${i.observacao ? '✎ obs.' : '+ obs.'}</button>
                <button type="button" className="rest-car-rm" aria-label=${'Excluir ' + i.p.nome} onClick=${() => mudarQtd(i.key, 0)}>✕</button>
              </div>
              ${(obsAberta === i.key || i.observacao) && html`<input type="text" className="rest-car-obs" placeholder="Observação (ex.: sem cebola)" maxLength="100" value=${i.observacao}
                autoFocus=${obsAberta === i.key} onInput=${e => setRasc({...r, itens: r.itens.map(x => x.key === i.key ? {...x, observacao: e.target.value} : x)})}
                onKeyDown=${e => { if (e.key === 'Enter') setObsAberta(null); }} />`}
            </li>`) : html`<li className="rest-car-vazio">Toque nos produtos para montar o pedido.<small>Busca: F2 · Continuar: F4</small></li>`}
          </ul>
          <div className="rest-car-totais"><div className="rest-car-total"><span>Produtos</span><b>${D.moedaBR(total)}</b></div></div>
          <button type="button" className="btn rest-btn-finalizar" disabled=${!linhas.length} onClick=${continuar}>Dados ${tipo === 'ENCOMENDA' ? 'da encomenda' : 'do delivery'} <kbd>F4</kbd></button>
        </aside>
      </div>
      ${dados && html`<${DadosEntrega} tipo=${tipo} rascunho=${r} totalProdutos=${total} onFechar=${() => setDados(false)}
        onSalvo=${v => { setRasc({itens: []}); window.RestUI.impressao.aposDelivery(v); ir('delivery', {aba: tipo === 'ENCOMENDA' ? 'encomenda' : 'delivery', ok: v.numero}); }} />`}`;
  }

  window.RestUI.rascunhoDelivery = gravarRascunho;
  Object.assign(window.RestUI.telas, {delivery: TelaDelivery, 'delivery/novo': TelaNovo});
})();
