// =====================================================================
// ---- 💵 MGA · Caixa: abertura, movimentos, fechamento e vendas realizadas ----
// =====================================================================
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, Modal, Segmentos, confirmar, plural} = window.RestUI;

  const dataHora = iso => iso ? new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '—';
  const sinal = v => (v > 0.001 ? '+ ' : v < -0.001 ? '− ' : '') + D.moedaBR(Math.abs(v));
  // Usuários que podem operar caixa (ativos, com acesso a Vendas)
  const operadoresCaixa = () => D.usuarios().filter(u => u.ativo && u.hash && D.podeAcessar('vendas', u));

  // ---- Abertura (também usada pelo PDV quando o caixa está fechado) ----
  function AbrirCaixa({onAberto, compacto}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const eu = D.sessaoAtual();
    const ops = operadoresCaixa();
    const [operadorId, setOperadorId] = useState(ops.some(u => u.id === eu?.id) ? eu.id : ops[0]?.id || '');
    const [valor, setValor] = useState('');
    const [agora, setAgora] = useState(new Date());
    useEffect(() => { const t = setInterval(() => setAgora(new Date()), 15000); return () => clearInterval(t); }, []);
    const abrir = e => { e.preventDefault(); const cx = tentar(() => D.abrirCaixa({operadorId, valorInicial: valor})); if (cx && onAberto) onAberto(cx); };
    return html`
      <form className=${'card rest-abrir-caixa' + (compacto ? ' compacto' : '')} onSubmit=${abrir}>
        <div className="rest-abrir-topo"><span className="rest-abrir-ic" aria-hidden="true">🔓</span>
          <div><h3>Abrir caixa</h3><p>Informe quem opera e o dinheiro que já está na gaveta.</p></div></div>
        ${aviso}
        <div className="form-grid">
          <${Campo} rotulo="Operador responsável">
            <select value=${operadorId} onChange=${e => setOperadorId(e.target.value)}>${ops.map(u => html`<option key=${u.id} value=${u.id}>${u.nome}</option>`)}</select>
          <//>
          <${Campo} rotulo="Data e hora"><input type="text" value=${agora.toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})} readOnly title="Registrada automaticamente na abertura" /><//>
          <${Campo} rotulo="Valor inicial em dinheiro (R$)"><${CampoValor} valor=${valor} onChange=${setValor} /><//>
        </div>
        <button type="submit" className="btn rest-btn-grande">Abrir caixa</button>
      </form>`;
  }

  // ---- Resumo de fechamento (tela, janela e impressão usam o mesmo) ----
  function ResumoFechamento({r, cx}){
    const linha = (rotulo, valor, cls = '') => html`<div className=${'rest-rf-linha ' + cls}><span>${rotulo}</span><b>${valor}</b></div>`;
    return html`
      <div className="rest-rf">
        <div className="rest-rf-cab">
          <b>Caixa #${cx.numero}</b>
          <span>Operador: ${cx.operador}</span>
          <span>Abertura: ${dataHora(cx.abertura)}${cx.abertoPor && cx.abertoPor !== cx.operador ? ` (por ${cx.abertoPor})` : ''}</span>
          ${cx.fechamento && html`<span>Fechamento: ${dataHora(cx.fechamento)}${cx.fechadoPor ? ` (por ${cx.fechadoPor})` : ''}</span>`}
        </div>
        ${linha('Saldo inicial', D.moedaBR(r.inicial))}
        ${linha(`Total de vendas (${plural(r.nVendas, 'venda', 'vendas')}${r.nCanceladas ? `, ${r.nCanceladas} cancelada${r.nCanceladas === 1 ? '' : 's'}` : ''})`, D.moedaBR(r.totalVendas), 'rest-rf-destaque')}
        <div className="rest-rf-grupo">Recebido por forma de pagamento</div>
        ${linha('Dinheiro', D.moedaBR(r.porForma.DINHEIRO))}
        ${linha('Cartão de débito', D.moedaBR(r.porForma.DEBITO))}
        ${linha('Cartão de crédito', D.moedaBR(r.porForma.CREDITO))}
        ${linha('PIX', D.moedaBR(r.porForma.PIX))}
        ${linha('Outras formas', D.moedaBR(r.porForma.OUTROS))}
        ${r.porForma.PRAZO > 0 && linha('A prazo (não entra no caixa)', D.moedaBR(r.porForma.PRAZO), 'rest-rf-nota')}
        ${r.valorCanceladas > 0 && linha(`Inclui ${D.moedaBR(r.valorCanceladas)} de vendas canceladas depois (devolvido nos estornos)`, '', 'rest-rf-nota')}
        ${r.trocos > 0 && linha('Troco devolvido (já descontado do dinheiro)', D.moedaBR(r.trocos), 'rest-rf-nota')}
        <div className="rest-rf-grupo">Movimentos do caixa</div>
        ${linha('Suprimentos', sinal(r.suprimentos), 'rest-rf-pos')}
        ${linha('Sangrias', sinal(-r.sangrias), 'rest-rf-neg')}
        ${linha('Estornos', sinal(-r.estornos), 'rest-rf-neg')}
        ${(r.recebimentos > 0 || r.pagamentos > 0) && html`
          ${linha('Recebimentos de contas', sinal(r.recebimentos), 'rest-rf-pos')}
          ${linha('Pagamentos de contas', sinal(-r.pagamentos), 'rest-rf-neg')}`}
        ${linha('Saldo final em dinheiro (esperado na gaveta)', D.moedaBR(r.saldoDinheiro), 'rest-rf-total')}
        ${cx.valorContado != null && html`
          ${linha('Valor contado', D.moedaBR(cx.valorContado))}
          ${linha('Diferença', Math.abs(cx.diferenca) < 0.001 ? 'Sem diferença' : `${cx.diferenca > 0 ? 'Sobra' : 'Falta'} de ${D.moedaBR(Math.abs(cx.diferenca))}`, Math.abs(cx.diferenca) < 0.001 ? 'rest-rf-ok' : 'rest-rf-dif')}
          ${cx.obsFechamento && linha('Motivo', cx.obsFechamento, 'rest-rf-nota')}`}
        <p className="rest-rf-rodape">Saldo final = inicial + vendas em dinheiro + suprimentos + recebimentos em dinheiro − sangrias − estornos e pagamentos em dinheiro. PIX e cartões não ficam na gaveta.</p>
      </div>`;
  }
  // Imprime só o resumo (o navegador também oferece "Salvar como PDF")
  function imprimirFechamento(cx){
    const r = cx.resumo ? {...cx.resumo} : D.resumoCaixa(cx.id);
    let alvo = document.getElementById('rest-impressao');
    if (!alvo) { alvo = document.createElement('div'); alvo.id = 'rest-impressao'; document.body.appendChild(alvo); }
    const raiz = ReactDOM.createRoot(alvo);
    raiz.render(html`<div className="rest-impressao-folha"><h1>MGA Restaurante · Fechamento de caixa</h1><${ResumoFechamento} r=${r} cx=${cx} />
      <p className="rest-rf-rodape">Impresso em ${new Date().toLocaleString('pt-BR')} por ${D.usuario()}</p>
      <div className="rest-assinaturas"><span>Operador</span><span>Conferente</span></div></div>`);
    document.body.classList.add('rest-imprimindo');
    const limpar = () => { document.body.classList.remove('rest-imprimindo'); raiz.unmount(); window.removeEventListener('afterprint', limpar); };
    window.addEventListener('afterprint', limpar);
    setTimeout(() => { window.print(); }, 60);
  }

  // ---- Tela do caixa ----
  const NOMES_MOV = {...D.TIPOS_MOV_CAIXA};
  function TelaCaixa({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [mov, setMov] = useState(null); // {tipo, valor, motivo}
    const [fechando, setFechando] = useState(null); // {contado, obs}
    const [fechado, setFechado] = useState(null);
    const cx = D.caixaAberto();
    if (fechado) return html`
      <${Cabecalho} titulo=${`Caixa #${fechado.numero} fechado`} sub="Confira o resumo e imprima o fechamento.">
        <button type="button" className="btn btn-ghost" onClick=${() => imprimirFechamento(fechado)}>🖨️ Imprimir / PDF</button>
        <button type="button" className="btn" onClick=${() => setFechado(null)}>Concluir</button>
      <//>
      <div className="card rest-rf-card"><${ResumoFechamento} r=${fechado.resumo} cx=${fechado} /></div>`;
    if (!cx) return html`
      <${Cabecalho} titulo="Caixa" sub="Nenhum caixa aberto. Abra o caixa para começar a vender." />
      <${AbrirCaixa} onAberto=${() => {}} />`;

    const r = D.resumoCaixa(cx.id);
    const salvarMov = () => { if (tentar(() => D.movimentarCaixa(mov.tipo, mov), m => `${NOMES_MOV[m.tipo]} de ${D.moedaBR(m.valor)} registrada.`)) setMov(null); };
    const contado = fechando ? D.lerValor(fechando.contado) : NaN;
    const diferenca = Number.isFinite(contado) ? Math.round((contado - r.saldoDinheiro) * 100) / 100 : null;
    const fechar = () => { const c = tentar(() => D.fecharCaixa({valorContado: fechando.contado, obs: fechando.obs})); if (c) { setFechando(null); setFechado(c); } };
    const movs = r.movimentos.filter(m => m.tipo !== 'ABERTURA').slice().reverse();
    return html`
      <${Cabecalho} titulo=${`Caixa #${cx.numero}`} sub=${`Operador: ${cx.operador} · aberto em ${dataHora(cx.abertura)}`}>
        <button type="button" className="btn btn-ghost" onClick=${() => setMov({tipo: 'SUPRIMENTO', valor: '', motivo: ''})}>+ Suprimento</button>
        <button type="button" className="btn btn-ghost" onClick=${() => setMov({tipo: 'SANGRIA', valor: '', motivo: ''})}>− Sangria</button>
        <button type="button" className="btn" onClick=${() => ir('vendas/pdv')}>Nova venda</button>
        <button type="button" className="btn btn-perigo" onClick=${() => setFechando({contado: '', obs: ''})}>Fechar caixa</button>
      <//>
      ${aviso}
      <div className="rest-kpis-mini">
        <div className="rest-kpi-mini rest-kpi-destaque"><span>Saldo em dinheiro</span><b>${D.moedaBR(r.saldoDinheiro)}</b><small>esperado na gaveta</small></div>
        <div className="rest-kpi-mini"><span>Total de vendas</span><b>${D.moedaBR(r.totalVendas)}</b><small>${plural(r.nVendas, 'venda', 'vendas')}${r.nCanceladas ? ` · ${r.nCanceladas} cancelada(s)` : ''}</small></div>
        <div className="rest-kpi-mini"><span>Ticket médio</span><b>${D.moedaBR(r.nVendas ? r.totalVendas / r.nVendas : 0)}</b><small>por venda</small></div>
        <div className="rest-kpi-mini"><span>Saldo inicial</span><b>${D.moedaBR(r.inicial)}</b><small>na abertura</small></div>
      </div>
      ${r.abertas?.n > 0 && html`<div className="rest-aviso-mesas" role="status">🍽️ <b>${plural(r.abertas.n, 'pedido aberto', 'pedidos abertos')}</b> (mesas e delivery) somando ${D.moedaBR(r.abertas.consumo)}${r.abertas.recebido > 0 ? ` · ${D.moedaBR(r.abertas.recebido)} já recebido` : ''}. O valor entra no caixa quando a conta fecha ou o pedido é entregue. <button type="button" className="rest-link" onClick=${() => ir('mesas')}>Ver mesas →</button></div>`}
      <div className="rest-caixa-grid">
        <section className="card">
          <h3 className="rest-form-titulo">Valores por forma de pagamento</h3>
          <div className="rest-formas-caixa">
            ${[['DINHEIRO', '💵'], ['PIX', '⚡'], ['DEBITO', '💳'], ['CREDITO', '💳'], ['OUTROS', '🎫'], ['PRAZO', '📒']].map(([t, ic]) => html`
              <div key=${t} className=${'rest-fc' + (r.porForma[t] > 0 ? '' : ' vazio')}><span>${ic} ${D.TIPOS_FORMA[t]}</span><b>${D.moedaBR(r.porForma[t])}</b></div>`)}
          </div>
          <div className="rest-rf">
            <div className="rest-rf-linha rest-rf-pos"><span>Suprimentos</span><b>${sinal(r.suprimentos)}</b></div>
            <div className="rest-rf-linha rest-rf-neg"><span>Sangrias</span><b>${sinal(-r.sangrias)}</b></div>
            <div className="rest-rf-linha rest-rf-neg"><span>Estornos</span><b>${sinal(-r.estornos)}</b></div>
            <div className="rest-rf-linha rest-rf-pos"><span>Recebimentos de contas</span><b>${sinal(r.recebimentos)}</b></div>
            <div className="rest-rf-linha rest-rf-neg"><span>Pagamentos de contas</span><b>${sinal(-r.pagamentos)}</b></div>
          </div>
        </section>
        <section className="card table-scroll">
          <h3 className="rest-form-titulo">Movimentos <small>${movs.length}</small></h3>
          <table>
            <thead><tr><th>Hora</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr></thead>
            <tbody>${movs.length ? movs.map(m => html`<tr key=${m.id}>
              <td className="nowrap">${new Date(m.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</td>
              <td><span className=${'badge ' + (D.MOV_ENTRADA.includes(m.tipo) ? 'b-ok' : 'rest-b-vencida')}>${NOMES_MOV[m.tipo]}</span></td>
              <td>${m.descricao}<small className="history-date">${D.TIPOS_FORMA[m.forma] || m.forma} · ${m.operador}</small></td>
              <td className=${'nowrap ' + (D.MOV_ENTRADA.includes(m.tipo) ? 'mov-pos' : 'mov-neg')}><b>${D.MOV_ENTRADA.includes(m.tipo) ? '+' : '−'} ${D.moedaBR(m.valor)}</b></td>
            </tr>`) : html`<tr><td colSpan="4" className="history-empty">Nenhuma sangria, suprimento ou estorno ainda.</td></tr>`}</tbody>
          </table>
          <button type="button" className="rest-link rest-ver-vendas" onClick=${() => ir('vendas/lista', {p: 'caixa'})}>Ver as vendas deste caixa →</button>
        </section>
      </div>
      ${mov && html`
        <${Modal} titulo=${mov.tipo === 'SANGRIA' ? 'Sangria (retirada)' : 'Suprimento (entrada)'} onFechar=${() => setMov(null)}>
          <p className="dv-ajuda">${mov.tipo === 'SANGRIA' ? `Dinheiro retirado da gaveta. Disponível: ${D.moedaBR(r.saldoDinheiro)}.` : 'Dinheiro colocado na gaveta (ex.: troco extra).'}</p>
          <div className="form-grid">
            <${Campo} rotulo="Valor (R$)"><${CampoValor} valor=${mov.valor} onChange=${v => setMov(m => ({...m, valor: v}))} /><//>
            <${Campo} rotulo="Motivo"><input type="text" value=${mov.motivo} maxLength="100" placeholder=${mov.tipo === 'SANGRIA' ? 'Ex.: depósito no banco' : 'Ex.: troco extra'} onInput=${e => setMov({...mov, motivo: e.target.value})}
              onKeyDown=${e => { if (e.key === 'Enter') salvarMov(); }} /><//>
          </div>
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setMov(null)}>Cancelar</button>
            <button type="button" className="btn" onClick=${salvarMov}>Registrar ${mov.tipo === 'SANGRIA' ? 'sangria' : 'suprimento'}</button>
          </div>
        <//>`}
      ${fechando && html`
        <${Modal} titulo=${`Fechar caixa #${cx.numero}`} onFechar=${() => setFechando(null)}>
          <div className="rest-fechar">
            <${ResumoFechamento} r=${r} cx=${cx} />
            <div className="form-grid">
              <${Campo} rotulo="Dinheiro contado na gaveta (R$)"><${CampoValor} valor=${fechando.contado} onChange=${v => setFechando(f => ({...f, contado: v}))} /><//>
            </div>
            <div className=${'rest-diferenca ' + (diferenca === null ? '' : Math.abs(diferenca) < 0.001 ? 'ok' : diferenca > 0 ? 'sobra' : 'falta')}>
              ${diferenca === null ? 'Conte o dinheiro e informe o valor acima.' : Math.abs(diferenca) < 0.001 ? '✓ Confere com o saldo esperado.'
                : `${diferenca > 0 ? 'Sobra' : 'Falta'} de ${D.moedaBR(Math.abs(diferenca))} em relação ao esperado (${D.moedaBR(r.saldoDinheiro)}).`}
            </div>
            ${diferenca !== null && Math.abs(diferenca) > 0.001 && html`
              <div className="field"><label htmlFor="fcObs">Motivo da diferença</label><input id="fcObs" type="text" maxLength="150" value=${fechando.obs} onInput=${e => setFechando({...fechando, obs: e.target.value})} /></div>`}
            ${aviso}
          </div>
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setFechando(null)}>Cancelar</button>
            <button type="button" className="btn btn-perigo" disabled=${diferenca === null} onClick=${fechar}>Confirmar fechamento</button>
          </div>
        <//>`}`;
  }

  // ---- Caixas anteriores ----
  function TelaCaixas(){
    useDados();
    const [ver, setVer] = useState(null);
    const lista = D.caixas().filter(c => c.status === 'FECHADO').slice().sort((a, b) => b.numero - a.numero);
    const [limite, setLimite] = useState(50);
    const resumo = c => c.resumo || D.resumoCaixa(c.id);
    return html`
      <${Cabecalho} titulo="Caixas anteriores" sub=${`${plural(lista.length, 'caixa fechado', 'caixas fechados')} · clique para ver ou imprimir o fechamento`} />
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Caixa</th><th>Operador</th><th>Abertura</th><th>Fechamento</th><th>Vendas</th><th>Saldo final</th><th>Contado</th><th>Diferença</th><th></th></tr></thead>
          <tbody>${lista.length ? lista.slice(0, limite).map(c => {
            const r = resumo(c), dif = c.diferenca || 0;
            return html`<tr key=${c.id}>
              <td><b>#${c.numero}</b>${c.demo ? html`<small className="history-date">demonstração</small>` : null}</td>
              <td>${c.operador}</td>
              <td className="nowrap">${dataHora(c.abertura)}</td>
              <td className="nowrap">${dataHora(c.fechamento)}</td>
              <td className="nowrap">${D.moedaBR(r.totalVendas)}<small className="history-date">${plural(r.nVendas, 'venda', 'vendas')}</small></td>
              <td className="nowrap">${D.moedaBR(r.saldoDinheiro)}</td>
              <td className="nowrap">${c.valorContado != null ? D.moedaBR(c.valorContado) : '—'}</td>
              <td className=${'nowrap ' + (Math.abs(dif) < 0.001 ? '' : dif > 0 ? 'mov-pos' : 'mov-neg')}>${Math.abs(dif) < 0.001 ? '—' : sinal(dif)}</td>
              <td><button type="button" className="rest-acao-linha" onClick=${() => setVer(c)}>Ver</button></td>
            </tr>`;
          }) : html`<tr><td colSpan="9" className="history-empty">Nenhum caixa fechado ainda.</td></tr>`}</tbody>
        </table>
      </div>
      ${lista.length > limite && html`<div className="rest-mais"><button type="button" className="btn btn-ghost" onClick=${() => setLimite(limite + 50)}>Mostrar mais</button></div>`}
      ${ver && html`
        <${Modal} titulo=${`Fechamento do caixa #${ver.numero}`} onFechar=${() => setVer(null)}>
          <div className="rest-fechar"><${ResumoFechamento} r=${resumo(ver)} cx=${ver} /></div>
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setVer(null)}>Fechar</button>
            <button type="button" className="btn" onClick=${() => imprimirFechamento(ver)}>🖨️ Imprimir / PDF</button>
          </div>
        <//>`}`;
  }

  // ---- Vendas realizadas (detalhe e cancelamento com estorno) ----
  const PERIODOS = [['caixa', 'Caixa atual'], ['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['todas', 'Todas']];
  function DetalheVenda({v, onFechar, onCancelada}){
    const {el: aviso, tentar} = useAviso();
    const [motivo, setMotivo] = useState('');
    const [cancelando, setCancelando] = useState(false);
    const t = D.totaisVenda(v);
    const cancelar = () => { if (tentar(() => D.cancelarVenda(v.id, motivo))) onCancelada(`Venda #${v.numero} cancelada. O valor pago foi estornado no caixa.`); };
    return html`
      <${Modal} titulo=${`Venda #${v.numero}`} onFechar=${onFechar}>
        <div className="rest-venda-det">
          <p className="dv-ajuda">${v.tipo === 'MESA' ? `Mesa ${v.mesa}` : D.TIPOS_VENDA[v.tipo]} · ${dataHora(v.finalizadaEm || v.data)} · operador ${v.operador}${v.clienteId ? ` · cliente ${D.clientePorId(v.clienteId)?.nome || '—'}` : ''}</p>
          ${v.status === 'CANCELADA' && html`<p className="toast rest-toast toast-erro">Cancelada em ${dataHora(v.canceladaEm)}${v.canceladaPor ? ` por ${v.canceladaPor}` : ''}: ${v.motivoCancelamento}</p>`}
          <table><tbody>${v.itens.map(i => html`<tr key=${i.id}><td>${String(i.quantidade).replace('.', ',')}× ${i.nome}${i.observacao ? html`<small className="history-date">${i.observacao}</small>` : null}</td>
            <td className="nowrap">${D.moedaBR(i.quantidade * i.precoUnitario - (i.desconto || 0))}</td></tr>`)}</tbody></table>
          <div className="rest-rf">
            <div className="rest-rf-linha"><span>Subtotal</span><b>${D.moedaBR(t.itens)}</b></div>
            ${t.desconto > 0 && html`<div className="rest-rf-linha rest-rf-neg"><span>Desconto</span><b>− ${D.moedaBR(t.desconto)}</b></div>`}
            ${t.entrega > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Taxa de entrega</span><b>+ ${D.moedaBR(t.entrega)}</b></div>`}
            ${t.servico > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Taxa de serviço</span><b>+ ${D.moedaBR(t.servico)}</b></div>`}
            ${t.acrescimo > 0 && html`<div className="rest-rf-linha rest-rf-pos"><span>Acréscimo</span><b>+ ${D.moedaBR(t.acrescimo)}</b></div>`}
            <div className="rest-rf-linha rest-rf-total"><span>Total</span><b>${D.moedaBR(t.total)}</b></div>
            ${v.pagamentos.filter(p => !['DESCONTO', 'ACRESCIMO'].includes(p.forma)).map(p => html`<div key=${p.id} className="rest-rf-linha"><span>${p.nome || D.TIPOS_FORMA[D.tipoPagamento(p)]}${p.parte ? ` · ${p.parte}` : ''}</span><b>${D.moedaBR(p.valor)}</b></div>`)}
            ${t.troco > 0 && html`<div className="rest-rf-linha rest-rf-nota"><span>Troco</span><b>${D.moedaBR(t.troco)}</b></div>`}
          </div>
          ${v.obs && html`<p className="dv-ajuda">Obs.: ${v.obs}</p>`}
          ${cancelando && html`<div className="field"><label htmlFor="cvMotivo">Motivo do cancelamento</label>
            <input id="cvMotivo" type="text" maxLength="150" value=${motivo} autoFocus onInput=${e => setMotivo(e.target.value)} onKeyDown=${e => { if (e.key === 'Enter') cancelar(); }} /></div>
            <p className="dv-ajuda">O valor pago à vista volta como <b>estorno</b> no caixa aberto.</p>`}
          ${aviso}
        </div>
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Fechar</button>
          ${v.status === 'FINALIZADA' && (cancelando
            ? html`<button type="button" className="btn btn-perigo" onClick=${cancelar}>Confirmar cancelamento</button>`
            : html`<button type="button" className="btn btn-perigo" onClick=${() => setCancelando(true)}>Cancelar venda</button>`)}
        </div>
      <//>`;
  }
  function TelaVendas({params}){
    useDados();
    const {el: aviso, mostrar} = useAviso();
    const cx = D.caixaAberto();
    const [periodo, setPeriodo] = useState(PERIODOS.some(([p]) => p === params.p) ? params.p : cx ? 'caixa' : 'hoje');
    const [busca, setBusca] = useState('');
    const [sel, setSel] = useState(null);
    const [limite, setLimite] = useState(100);
    const hoje = D.hojeISO();
    const filtro = {
      caixa: v => cx && v.caixaId === cx.id, hoje: v => D.diaISO(new Date(v.finalizadaEm || v.data)) === hoje,
      7: v => Date.now() - new Date(v.finalizadaEm || v.data) < 7 * 86400000, 30: v => Date.now() - new Date(v.finalizadaEm || v.data) < 30 * 86400000, todas: () => true
    }[periodo];
    const b = D.norm(busca);
    const lista = D.vendas().filter(v => v.status !== 'ABERTA' && filtro(v))
      .filter(v => !busca || String(v.numero) === busca.replace('#', '') || D.norm(v.operador + ' ' + v.itens.map(i => i.nome).join(' ')).includes(b))
      .slice().sort((x, y) => y.numero - x.numero);
    const validas = lista.filter(v => v.status === 'FINALIZADA');
    const total = validas.reduce((s, v) => s + D.totaisVenda(v).total, 0);
    const vSel = sel && D.vendaPorId(sel);
    return html`
      <${Cabecalho} titulo="Vendas realizadas" sub=${`${plural(validas.length, 'venda', 'vendas')} · ${D.moedaBR(total)}${lista.length > validas.length ? ` · ${lista.length - validas.length} cancelada(s)` : ''}`} />
      ${aviso}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Período" opcoes=${PERIODOS.filter(([p]) => p !== 'caixa' || cx)} valor=${periodo} onChange=${v => { setPeriodo(v); setLimite(100); }} />
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Nº da venda, produto ou operador..." />
      </div>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Venda</th><th>Data</th><th>Tipo</th><th>Itens</th><th>Pagamento</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>${lista.length ? lista.slice(0, limite).map(v => html`<tr key=${v.id} className=${v.status === 'CANCELADA' ? 'rest-inativo' : ''}>
            <td><b>#${v.numero}</b><small className="history-date">${v.operador}</small></td>
            <td className="nowrap">${dataHora(v.finalizadaEm || v.data)}</td>
            <td>${v.tipo === 'MESA' ? `Mesa ${v.mesa}` : D.TIPOS_VENDA[v.tipo]}${v.entrega?.nome ? html`<small className="history-date">${v.entrega.nome}</small>` : null}</td>
            <td className="rest-itens-cel">${v.itens.map(i => `${String(i.quantidade).replace('.', ',')}× ${i.nome}`).join(', ')}</td>
            <td>${[...new Set(v.pagamentos.filter(p => !['DESCONTO', 'ACRESCIMO'].includes(p.forma)).map(p => p.nome || D.TIPOS_FORMA[D.tipoPagamento(p)]))].join(' + ')}</td>
            <td className="nowrap"><b>${D.moedaBR(D.totaisVenda(v).total)}</b></td>
            <td>${v.status === 'CANCELADA' ? html`<span className="badge rest-b-vencida">Cancelada</span>` : html`<span className="badge b-ok">Finalizada</span>`}</td>
            <td><button type="button" className="rest-acao-linha" onClick=${() => setSel(v.id)}>Detalhes</button></td>
          </tr>`) : html`<tr><td colSpan="8" className="history-empty">Nenhuma venda nesse período.</td></tr>`}</tbody>
        </table>
      </div>
      ${lista.length > limite && html`<div className="rest-mais"><button type="button" className="btn btn-ghost" onClick=${() => setLimite(limite + 100)}>Mostrar mais</button></div>`}
      ${vSel && html`<${DetalheVenda} v=${vSel} onFechar=${() => setSel(null)} onCancelada=${msg => { setSel(null); mostrar(msg); }} />`}`;
  }

  window.RestUI.AbrirCaixa = AbrirCaixa;
  Object.assign(window.RestUI.telas, {'vendas/caixa': TelaCaixa, 'vendas/caixas': TelaCaixas, 'vendas/lista': TelaVendas});
})();
