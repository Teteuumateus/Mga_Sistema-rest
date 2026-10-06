// =====================================================================
// ---- 🖨️ MGA · Impressão: cupom, comanda da cozinha, conferência e entrega ----
// =====================================================================
// Imprime pelo navegador em bobina de 58 ou 80 mm (Configurações › Impressão) ou em folha.
// O navegador sempre mostra a janela de impressão; para imprimir direto na impressora
// térmica, o Chrome pode ser aberto com --kiosk-printing (usa a impressora padrão).
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {html, D} = window.RestUI;

  const qtdBR = q => String(q).replace('.', ',');
  const dataHora = iso => new Date(iso || Date.now()).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'});
  const cfg = () => D.config().impressao;

  // ---- Motor: monta o conteúdo em #rest-impressao, imprime e limpa ----
  let raiz = null, estilo = null;
  function limpar(){
    document.body.classList.remove('rest-imprimindo');
    if (raiz) { raiz.unmount(); raiz = null; }
    if (estilo) { estilo.remove(); estilo = null; }
    window.removeEventListener('afterprint', limpar);
  }
  // paginas: um ou mais documentos (cada um sai separado na bobina); bobina=false usa folha A4
  function imprimir(paginas, {bobina = true} = {}){
    limpar();
    let alvo = document.getElementById('rest-impressao');
    if (!alvo) { alvo = document.createElement('div'); alvo.id = 'rest-impressao'; document.body.appendChild(alvo); }
    const largura = cfg().largura;
    alvo.className = bobina ? `rest-bobina rest-bobina-${largura}` : '';
    estilo = document.createElement('style');
    estilo.textContent = bobina ? `@page { size: ${largura}mm auto; margin: 2mm 3mm; }` : '@page { margin: 14mm; }';
    document.head.appendChild(estilo);
    raiz = ReactDOM.createRoot(alvo);
    raiz.render(html`${[].concat(paginas).map((p, k) => html`<div key=${k} className="cp-pagina">${p}</div>`)}`);
    document.body.classList.add('rest-imprimindo');
    window.addEventListener('afterprint', limpar);
    setTimeout(() => window.print(), 80); // dá tempo de o React desenhar
  }

  // ---- Peças dos documentos ----
  const Empresa = () => html`<div className="cp-empresa">${D.cabecalhoEmpresa().map((l, k) => k ? html`<span key=${k}>${l}</span>` : html`<b key=${k}>${l}</b>`)}</div>`;
  const Linha = ({a, b, forte}) => html`<div className=${'cp-l' + (forte ? ' cp-forte' : '')}><span>${a}</span><b>${b}</b></div>`;
  const nomeDaVenda = v => v.tipo === 'MESA' ? `Mesa ${v.mesa} · pedido #${v.numero}` : `${D.TIPOS_VENDA[v.tipo]} #${v.numero}`;
  const enderecoEntrega = e => [[e.endereco, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro, e.cidade].filter(Boolean).join(' · ');

  // Cupom da venda (não fiscal). conferencia = pré-conta da mesa; entrega = vai com o entregador.
  function Cupom({v, conferencia, entrega}){
    const t = D.totaisVenda(v);
    const e = v.entrega || {};
    const cli = D.clientePorId(v.clienteId);
    const pagos = v.pagamentos.filter(p => !['DESCONTO', 'ACRESCIMO'].includes(p.forma));
    const forma = v.formaPrevistaId && D.formaPorId(v.formaPrevistaId);
    const titulo = conferencia ? 'CONFERÊNCIA DE CONTA' : entrega ? (v.modo === 'RETIRAR' ? 'PEDIDO PARA RETIRADA' : 'PEDIDO PARA ENTREGA') : 'CUPOM NÃO FISCAL';
    return html`
      <div className="cp">
        <${Empresa} />
        <div className="cp-titulo">${titulo}</div>
        <${Linha} a=${nomeDaVenda(v)} b=${dataHora(v.finalizadaEm || v.data)} />
        ${v.tipo === 'MESA' && v.pessoas > 1 && html`<${Linha} a="Pessoas" b=${v.pessoas} />`}
        ${!D.ehDelivery(v) && cli && html`<${Linha} a="Cliente" b=${cli.nome} />`}
        ${D.ehDelivery(v) && html`<div className="cp-bloco">
          ${v.aplicativo && html`<span>Pedido pelo <b>${v.aplicativo.nome}</b></span>`}
          <b>${e.nome}</b><span>${e.telefone}</span>
          ${v.modo !== 'RETIRAR' ? html`<span>${enderecoEntrega(e)}</span>${e.referencia && html`<span>Ref.: ${e.referencia}</span>`}${e.regiao && html`<span>Região: ${e.regiao}</span>`}` : html`<span>Cliente vem buscar</span>`}
          ${v.agendadoPara && html`<span>Para: ${dataHora(v.agendadoPara)}</span>`}
        </div>`}
        <div className="cp-sep"></div>
        ${v.itens.map(i => html`<div key=${i.id} className="cp-item">
          <span>${qtdBR(i.quantidade)} x ${i.nome}</span>
          ${i.adicionais?.length ? html`<small>  + ${window.RestUI.adicionaisTxt(i)}</small>` : null}
          <div className="cp-l"><small>${qtdBR(i.quantidade)} x ${D.moedaBR(i.precoUnitario)}${i.desconto ? ` − ${D.moedaBR(i.desconto)}` : ''}</small><b>${D.moedaBR(i.quantidade * i.precoUnitario - (i.desconto || 0))}</b></div>
          ${i.observacao && html`<small>  obs.: ${i.observacao}</small>`}
        </div>`)}
        <div className="cp-sep"></div>
        <${Linha} a="Subtotal" b=${D.moedaBR(t.itens)} />
        ${t.desconto > 0 && html`<${Linha} a="Desconto" b=${'− ' + D.moedaBR(t.desconto)} />`}
        ${t.acrescimo > 0 && html`<${Linha} a="Acréscimo" b=${'+ ' + D.moedaBR(t.acrescimo)} />`}
        ${t.servico > 0 && html`<${Linha} a=${`Serviço (${String(v.taxaServico.percentual).replace('.', ',')}%)`} b=${'+ ' + D.moedaBR(t.servico)} />`}
        ${t.entrega > 0 && html`<${Linha} a="Taxa de entrega" b=${'+ ' + D.moedaBR(t.entrega)} />`}
        ${t.embalagem > 0 && html`<${Linha} a="Embalagens" b=${'+ ' + D.moedaBR(t.embalagem)} />`}
        <${Linha} forte a="TOTAL" b=${D.moedaBR(t.total)} />
        ${pagos.length > 0 && html`<div className="cp-sep"></div>${pagos.map(p => html`<${Linha} key=${p.id} a=${(p.nome || D.TIPOS_FORMA[D.tipoPagamento(p)]) + (p.parte ? ` · ${p.parte}` : '')} b=${D.moedaBR(p.recebido || p.valor)} />`)}`}
        ${t.troco > 0 && html`<${Linha} a="Troco" b=${D.moedaBR(t.troco)} />`}
        ${(conferencia || entrega) && t.pago > 0 && t.restante > 0.001 && html`<${Linha} forte a="FALTA PAGAR" b=${D.moedaBR(t.restante)} />`}
        ${conferencia && v.pessoas > 1 && html`<${Linha} a=${`Por pessoa (${v.pessoas})`} b=${D.moedaBR(t.restante / v.pessoas)} />`}
        ${entrega && t.restante > 0.001 && html`<div className="cp-bloco">
          <span>Pagamento na ${v.modo === 'RETIRAR' ? 'retirada' : 'entrega'}: <b>${forma?.nome || 'a combinar'}</b></span>
          ${v.trocoPara && html`<span>Troco para ${D.moedaBR(v.trocoPara)} (levar ${D.moedaBR(v.trocoPara - t.restante)})</span>`}
          ${v.levarMaquina && html`<span>Levar máquina de cartão</span>`}
        </div>`}
        ${v.obs && html`<div className="cp-bloco"><span>Obs.: ${v.obs}</span></div>`}
        <div className="cp-sep"></div>
        <div className="cp-rodape">
          <span>Atendente: ${v.operador}</span>
          ${!conferencia && !entrega && cfg().rodape && html`<span>${cfg().rodape}</span>`}
          <span>${conferencia ? 'Confira os itens antes de pagar.' : ''} Não é documento fiscal.</span>
        </div>
      </div>`;
  }

  // Comanda da cozinha: sem preços, letras grandes, com observações
  function Comanda({v, itens, via, vias, reimpressao}){
    const e = v.entrega || {};
    const quem = v.tipo === 'MESA' ? `MESA ${v.mesa}` : D.ehDelivery(v) ? `${v.tipo === 'ENCOMENDA' ? 'ENCOMENDA' : 'DELIVERY'} #${v.numero}` : `BALCÃO #${v.numero}`;
    return html`
      <div className="cp cp-comanda">
        <div className="cp-titulo">COMANDA · COZINHA${reimpressao ? ' · REIMPRESSÃO' : ''}</div>
        <div className="cp-quem">${quem}</div>
        <${Linha} a=${dataHora()} b=${v.operador.split(' ')[0]} />
        ${D.ehDelivery(v) && html`<div className="cp-bloco"><b>${e.nome}</b>${v.modo === 'RETIRAR' ? html`<span>Vem buscar</span>` : null}${v.agendadoPara ? html`<span>Para ${dataHora(v.agendadoPara)}</span>` : null}</div>`}
        <div className="cp-sep"></div>
        ${itens.map(i => html`<div key=${i.id} className="cp-cozinha">
          <b>${qtdBR(i.quantidade)} x ${i.nome}</b>
          ${i.adicionais?.length ? html`<span>+ ${window.RestUI.adicionaisTxt(i)}</span>` : null}
          ${i.observacao && html`<span>» ${i.observacao}</span>`}
        </div>`)}
        ${v.obs && html`<div className="cp-sep"></div><div className="cp-bloco"><span>Obs. do pedido: ${v.obs}</span></div>`}
        ${vias > 1 && html`<div className="cp-rodape"><span>via ${via} de ${vias}</span></div>`}
      </div>`;
  }

  // ---- Ações usadas pelas telas ----
  const daCozinha = i => !!i.preparo || (i.preparo === undefined && D.grupoPorId(D.produtoPorId(i.produtoId)?.grupoId)?.cozinha !== false);
  const pendentes = v => v.itens.filter(i => daCozinha(i) && !i.impressoEm);
  // Cupom ao concluir: nunca, sempre ou pergunta (como "Deseja imprimir o comprovante de venda?")
  const querCupom = (pergunta = 'Deseja imprimir o comprovante de venda?') => cfg().cupomModo === 'SEMPRE' || (cfg().cupomModo === 'PERGUNTAR' && window.confirm(pergunta));
  // Comandas (já com as vias); marca os itens como enviados à cozinha
  function paginasComanda(v, {todos = false} = {}){
    const itens = todos ? v.itens.filter(daCozinha) : pendentes(v);
    if (!itens.length) return [];
    const reimpressao = todos && itens.some(i => i.impressoEm);
    D.marcarImpresso(v.id, itens.map(i => i.id));
    const vias = cfg().viasComanda || 1;
    return Array.from({length: vias}, (_, k) => html`<${Comanda} v=${v} itens=${itens} via=${k + 1} vias=${vias} reimpressao=${reimpressao} />`);
  }
  const impressao = {
    imprimir,
    pendentes,
    cupom: v => imprimir(html`<${Cupom} v=${v} />`),
    conferencia: v => imprimir(html`<${Cupom} v=${v} conferencia />`),
    entrega: v => imprimir(html`<${Cupom} v=${v} entrega />`),
    // Retorna quantos itens foram para a cozinha (0 = nada novo)
    comanda(v, opcoes = {}){ const n = (opcoes.todos ? v.itens.filter(daCozinha) : pendentes(v)).length; const p = paginasComanda(v, opcoes); if (p.length) imprimir(p); return n; },
    // Automáticos (Configurações › Impressão), num só trabalho de impressão:
    // venda de balcão concluída → comanda + cupom; mesa fechada → cupom; delivery gravado → comanda + pedido para entrega
    aposBalcao(v){ const p = [...(cfg().comandaAuto ? paginasComanda(v) : []), ...(querCupom() ? [html`<${Cupom} v=${v} />`] : [])]; if (p.length) imprimir(p); },
    aposMesa(v){ if (querCupom()) imprimir(html`<${Cupom} v=${v} />`); },
    aposPedirConta(v){ if (querCupom('Imprimir a conferência da conta?')) imprimir(html`<${Cupom} v=${v} conferencia />`); },
    aposDelivery(v){ if (cfg().comandaAuto) imprimir([...paginasComanda(v), html`<${Cupom} v=${v} entrega />`]); },
    teste(){
      const exemplo = {id: 'teste', numero: 123, tipo: 'BALCAO', operador: D.usuario(), data: new Date().toISOString(), itens: [
        {id: 'a', quantidade: 2, nome: 'X-Burger', precoUnitario: 18, observacao: 'sem cebola'}, {id: 'b', quantidade: 1, nome: 'Coca-Cola Lata 350ml', precoUnitario: 6}],
        pagamentos: [{id: 'p', nome: 'Dinheiro', valor: 42, recebido: 50, troco: 8}], desconto: 0, acrescimo: 0};
      imprimir([html`<${Cupom} v=${exemplo} />`, html`<${Comanda} v=${exemplo} itens=${exemplo.itens} via=${1} vias=${1} />`]);
    }
  };
  window.RestUI.impressao = impressao;
  window.RestUI.CabecalhoEmpresa = Empresa;
})();
