// =====================================================================
// ---- 👨‍🍳 MGA · Fila de produção: o que a cozinha tem para preparar ----
// =====================================================================
// Itens das categorias marcadas "vai para a cozinha" entram na fila ao serem lançados
// (balcão, mesa e delivery). Colunas: na fila → preparando → pronto; "Entregue" tira da tela.
// Aberta em outra aba ou num segundo monitor, recebe os pedidos novos sozinha.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect} = React;
  const {html, D, useDados, useAviso, Cabecalho, plural, adicionaisTxt} = window.RestUI;
  const qtdBR = q => String(q).replace('.', ',');

  // Relógio: o tempo de espera muda de cor sozinho (a cada 20 s)
  function useRelogio(){ const [, set] = useState(0); useEffect(() => { const t = setInterval(() => set(x => x + 1), 20000); return () => clearInterval(t); }, []); }
  const minutos = iso => Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000));
  // Mesmos limites do delivery (Configurações › Restaurante): verde, amarelo, vermelho
  const faixa = min => min < D.config().entregaVerde ? 'verde' : min < D.config().entregaAmarelo ? 'amarelo' : 'vermelho';
  const titulo = v => v.tipo === 'MESA' ? `Mesa ${v.mesa}` : v.tipo === 'BALCAO' ? `Balcão #${v.numero}` : `${D.TIPOS_VENDA[v.tipo]} #${v.numero}`;
  const COLUNAS = [['FILA', 'Na fila', 'PREPARANDO', 'Começar'], ['PREPARANDO', 'Preparando', 'PRONTO', 'Pronto'], ['PRONTO', 'Pronto para servir', 'ENTREGUE', 'Entregue']];

  function TelaCozinha(){
    useDados(); useRelogio();
    const {el: aviso, tentar} = useAviso();
    const fila = D.filaProducao();
    const mover = (v, itens, estado) => tentar(() => D.moverPreparo(v.id, itens.map(i => i.id), estado));
    const total = estado => fila.reduce((s, x) => s + x.itens.filter(i => i.preparo.estado === estado).length, 0);
    return html`
      <${Cabecalho} titulo="Fila de produção" sub=${fila.length ? `${plural(fila.length, 'pedido', 'pedidos')} na cozinha · toque no item para avançar só ele` : 'Nada para preparar agora'} />
      ${aviso}
      <div className="rest-cozinha">
        ${COLUNAS.map(([estado, nome, proximo, rotulo]) => {
          // Um cartão por pedido em cada coluna, com os itens daquela etapa; o mais antigo primeiro
          const cartoes = fila.map(x => ({venda: x.venda, itens: x.itens.filter(i => i.preparo.estado === estado)})).filter(x => x.itens.length)
            .sort((a, b) => new Date(a.itens[0].preparo.desde) - new Date(b.itens[0].preparo.desde));
          return html`<section key=${estado} className=${'rest-coz-col ' + estado.toLowerCase()}>
            <h3>${nome} <small>${total(estado)}</small></h3>
            ${cartoes.length ? cartoes.map(({venda: v, itens}) => {
              const min = minutos(itens.reduce((m, i) => i.preparo.desde < m ? i.preparo.desde : m, itens[0].preparo.desde));
              return html`<article key=${v.id + estado} className=${'rest-coz-card ' + faixa(min)}>
                <header><b>${titulo(v)}</b><span className="rest-coz-tempo">${min} min</span></header>
                ${D.ehDelivery(v) && html`<small className="rest-coz-sub">${v.entrega?.nome}${v.modo === 'RETIRAR' ? ' · vem buscar' : ''}${v.aplicativo ? ` · ${v.aplicativo.nome}` : ''}</small>`}
                <ul>${itens.map(i => html`<li key=${i.id}>
                  <button type="button" title=${`Mover só este item para "${COLUNAS.find(c => c[0] === proximo)?.[1] || 'Entregue'}"`} onClick=${() => mover(v, [i], proximo)}>
                    <span className="rest-coz-item"><b>${qtdBR(i.quantidade)}×</b> ${i.nome}</span>
                    ${i.adicionais?.length ? html`<small>+ ${adicionaisTxt(i)}</small>` : null}
                    ${i.observacao ? html`<small className="rest-coz-obs">» ${i.observacao}</small>` : null}
                  </button></li>`)}</ul>
                ${v.obs && html`<p className="rest-coz-obs">Obs.: ${v.obs}</p>`}
                <button type="button" className=${'btn rest-coz-btn' + (estado === 'PRONTO' ? ' rest-btn-concluir' : '')} onClick=${() => mover(v, itens, proximo)}>${rotulo}${itens.length > 1 ? ` (${itens.length})` : ''}</button>
              </article>`;
            }) : html`<p className="rest-coz-vazio">—</p>`}
          </section>`;
        })}
      </div>
      <p className="dv-ajuda rest-nota">Entram na fila os itens das categorias marcadas "Vai para a cozinha" (Cadastros › Categorias). Cores do tempo: as mesmas do delivery (Configurações › Restaurante).</p>`;
  }

  window.RestUI.telas['vendas/cozinha'] = TelaCozinha;
})();
