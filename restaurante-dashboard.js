// =====================================================================
// ---- 📊 MGA · Dashboard: cards do dia/mês e gráficos (Recharts) ----
// =====================================================================
// Cores: paleta categórica validada (claro e escuro) para daltonismo e contraste;
// "Outros" e o ano anterior ficam em cinza para não competir com o principal.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect} = React;
  const {html, D, useDados, Cabecalho, plural} = window.RestUI;
  const R = window.Recharts;

  const PALETA = {
    claro: {serie: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4'], outros: '#b9b8b1', anterior: '#a3a29b',
      grade: '#e6e9ee', eixo: '#898781', superficie: '#ffffff'},
    escuro: {serie: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'], outros: '#5d5c57', anterior: '#6f6e68',
      grade: '#223049', eixo: '#8596ae', superficie: '#111a2b'}
  };
  // Acompanha a troca de tema (o botão grava data-theme no <html>)
  function useTema(){
    const ler = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'escuro' : 'claro';
    const [tema, setTema] = useState(ler);
    useEffect(() => {
      const obs = new MutationObserver(() => setTema(ler()));
      obs.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
      return () => obs.disconnect();
    }, []);
    return PALETA[tema];
  }

  const moedaCurta = v => v >= 1000 ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + ' mil' : 'R$ ' + Math.round(v);
  const pct = (v, total) => total ? (v / total * 100).toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '%' : '0%';

  // ---- Cards ----
  function Card({cor, icone, rotulo, valor, sub, mes, alerta, onClick}){
    return html`
      <button type="button" className=${'rest-card rest-card-' + cor} onClick=${onClick}>
        <span className="rest-card-topo"><span className="rest-card-ic" aria-hidden="true">${icone}</span><span className="rest-card-rotulo">${rotulo}</span><span className="rest-card-hoje">hoje</span></span>
        <b className="rest-card-valor">${valor}</b>
        <small className="rest-card-sub">${sub}</small>
        ${alerta && html`<small className="rest-card-alerta">⚠ ${alerta}</small>`}
        <span className="rest-card-mes"><span>No mês</span><b>${mes}</b></span>
      </button>`;
  }

  // ---- Moldura dos gráficos: título, resumo, legenda e alternância gráfico/tabela ----
  function Grafico({titulo, sub, legenda, tabela, vazio, children}){
    const [verTabela, setVerTabela] = useState(false);
    return html`
      <section className="card rest-grafico">
        <div className="rest-grafico-cab">
          <div><h3>${titulo}</h3>${sub && html`<p>${sub}</p>`}</div>
          ${!vazio && html`<button type="button" className="rest-tabela-btn" aria-pressed=${verTabela} onClick=${() => setVerTabela(!verTabela)}>${verTabela ? 'Gráfico' : 'Tabela'}</button>`}
        </div>
        ${vazio ? html`<p className="rest-grafico-vazio">${vazio}</p>`
          : verTabela ? html`<div className="table-scroll rest-grafico-tabela"><table>
              <thead><tr>${tabela.colunas.map(c => html`<th key=${c}>${c}</th>`)}</tr></thead>
              <tbody>${tabela.linhas.map((l, k) => html`<tr key=${k}>${l.map((c, j) => html`<td key=${j} className=${j ? 'nowrap' : ''}>${c}</td>`)}</tr>`)}</tbody>
            </table></div>`
          : html`${legenda && html`<ul className="rest-legenda">${legenda.map(l => html`<li key=${l.nome}><i style=${{background: l.cor}}></i>${l.nome}</li>`)}</ul>`}${children}`}
      </section>`;
  }

  // Tooltip no visual do sistema (texto na cor do tema, marca colorida ao lado)
  const Dica = ({active, payload, label, titulo}) => {
    if (!active || !payload || !payload.length) return null;
    return html`<div className="rest-dica">
      <b>${titulo ? titulo(label, payload) : label}</b>
      ${payload.filter(p => p.value != null).map(p => html`<div key=${p.dataKey || p.name}><i style=${{background: p.color || p.payload?.cor}}></i>${p.name}<span>${D.moedaBR(p.value)}</span></div>`)}
    </div>`;
  };

  // Pizza (rosca) com até 5 fatias + "Outros"; a legenda ao lado traz valor e % (rótulo visível)
  function fatias(lista, cores){
    const top = lista.slice(0, 5).map((x, k) => ({...x, cor: cores.serie[k]}));
    const resto = lista.slice(5).reduce((s, x) => s + x.valor, 0);
    return resto > 0 ? [...top, {nome: 'Outros', valor: Math.round(resto * 100) / 100, cor: cores.outros}] : top;
  }
  function Pizza({dados, cores}){
    const total = dados.reduce((s, x) => s + x.valor, 0);
    return html`
      <div className="rest-pizza">
        <div className="rest-pizza-grafico">
          <${R.ResponsiveContainer} width="100%" height=${220}>
            <${R.PieChart}>
              <${R.Pie} data=${dados} dataKey="valor" nameKey="nome" innerRadius="58%" outerRadius="92%" paddingAngle=${1.5} stroke=${cores.superficie} strokeWidth=${2} isAnimationActive=${false}>
                ${dados.map(d => html`<${R.Cell} key=${d.nome} fill=${d.cor} />`)}
              <//>
              <${R.Tooltip} content=${p => html`<${Dica} ...${p} titulo=${(_, pl) => pct(pl[0].value, total) + ' do total'} />`} />
            <//>
          <//>
          <div className="rest-pizza-centro"><small>Total</small><b>${moedaCurta(total)}</b></div>
        </div>
        <ul className="rest-pizza-legenda">
          ${dados.map(d => html`<li key=${d.nome}><i style=${{background: d.cor}}></i><span className="rest-pl-nome">${d.nome}</span><b>${D.moedaBR(d.valor)}</b><small>${pct(d.valor, total)}</small></li>`)}
        </ul>
      </div>`;
  }

  function TelaDashboard({ir}){
    useDados();
    const cores = useTema();
    if (!R) return html`<div className="card rest-offline"><b>Gráficos indisponíveis.</b><p>A biblioteca de gráficos (Recharts) não carregou. Verifique a internet e recarregue (F5).</p></div>`;
    const d = D.resumoDashboard();
    const fin = D.podeAcessar('financeiro'); // contas e despesas só para quem tem o Financeiro
    const {vendas, receber, pagar, ticket} = d.cards;
    const agora = new Date();
    const nomeMes = agora.toLocaleDateString('pt-BR', {month: 'long'});
    const dataExt = agora.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
    const ano = d.ano, mesAtual = agora.getMonth();
    const variacao = d.comparativo.anterior ? (d.comparativo.atual / d.comparativo.anterior - 1) * 100 : null;
    // O mês corrente ainda não terminou: sai da linha cheia e vira um trecho tracejado com ponto vazado,
    // para a queda de um mês incompleto não parecer queda de vendas
    const serieMeses = d.porMes.map((m, k) => ({...m, atual: k < mesAtual ? m.atual : null,
      parcial: k === mesAtual || (k === mesAtual - 1) ? m.atual : null}));
    const grupos = fatias(d.porGrupo, cores), despesas = fatias(d.despesasPorCategoria, cores);
    const resultado = d.totalReceitasMes - d.totalDespesasMes;
    const eixo = {stroke: cores.grade, tick: {fill: cores.eixo, fontSize: 12}, tickLine: false};

    return html`
      <${Cabecalho} titulo="Dashboard" sub=${dataExt.charAt(0).toUpperCase() + dataExt.slice(1)}>
        ${D.temDemo() && html`<span className="badge b-wait" title="Remova em Configurações › Dados do sistema">Com dados de demonstração</span>`}
      <//>
      <div className="rest-cards">
        <${Card} cor="azul" icone="🧾" rotulo="Total de vendas" valor=${D.moedaBR(vendas.hoje)} sub=${plural(vendas.nHoje, 'venda finalizada', 'vendas finalizadas')}
          mes=${D.moedaBR(vendas.mes)} onClick=${() => ir('vendas/lista', {p: 'hoje'})} />
        ${fin && html`
        <${Card} cor="verde" icone="📥" rotulo="Total a receber" valor=${D.moedaBR(receber.hoje)} sub=${plural(receber.nHoje, 'conta vence', 'contas vencem') + ' hoje'}
          alerta=${receber.nVencidas ? `${D.moedaBR(receber.vencidas)} em atraso` : ''} mes=${D.moedaBR(receber.mes)} onClick=${() => ir('fin/receber', {f: 'hoje'})} />
        <${Card} cor="laranja" icone="📤" rotulo="Total a pagar" valor=${D.moedaBR(pagar.hoje)} sub=${plural(pagar.nHoje, 'conta vence', 'contas vencem') + ' hoje'}
          alerta=${pagar.nVencidas ? `${D.moedaBR(pagar.vencidas)} vencido` : ''} mes=${D.moedaBR(pagar.mes)} onClick=${() => ir('fin/pagar', {f: 'hoje'})} />`}
        <${Card} cor="roxo" icone="🎯" rotulo="Ticket médio" valor=${D.moedaBR(ticket.hoje)} sub="por venda finalizada"
          mes=${D.moedaBR(ticket.mes)} onClick=${() => ir('vendas/lista', {p: 'hoje'})} />
      </div>

      <div className="rest-graficos">
        <${Grafico} titulo="Vendas por mês"
          sub=${`${ano} × ${ano - 1}${variacao === null ? '' : ` · ${variacao >= 0 ? '▲' : '▼'} ${Math.abs(variacao).toLocaleString('pt-BR', {maximumFractionDigits: 1})}% de 1º/jan até hoje`} · ${d.porMes[mesAtual].mes} parcial (até dia ${agora.getDate()})`}
          vazio=${!d.porMes.some(m => m.atual || m.anterior) && 'Ainda não há vendas finalizadas.'}
          legenda=${[{nome: String(ano), cor: cores.serie[0]}, {nome: String(ano - 1), cor: cores.anterior}]}
          tabela=${{colunas: ['Mês', String(ano), String(ano - 1)], linhas: d.porMes.map((m, k) => [m.mes + (k === mesAtual ? ' (parcial)' : ''), m.atual == null ? '—' : D.moedaBR(m.atual), D.moedaBR(m.anterior)])}}>
          <${R.ResponsiveContainer} width="100%" height=${260}>
            <${R.LineChart} data=${serieMeses} margin=${{top: 8, right: 12, left: 4, bottom: 0}}>
              <${R.CartesianGrid} stroke=${cores.grade} vertical=${false} />
              <${R.XAxis} dataKey="mes" ...${eixo} />
              <${R.YAxis} ...${eixo} axisLine=${false} width=${74} tickFormatter=${moedaCurta} />
              <${R.Tooltip} cursor=${{stroke: cores.eixo, strokeWidth: 1}}
                content=${p => html`<${Dica} ...${p} payload=${(p.payload || []).filter(x => !(x.dataKey === 'parcial' && serieMeses[mesAtual].mes !== p.label))}
                  titulo=${l => l === serieMeses[mesAtual].mes ? `${l} (parcial, até dia ${agora.getDate()})` : l} />`} />
              <${R.Line} type="monotone" dataKey="anterior" name=${String(ano - 1)} stroke=${cores.anterior} strokeWidth=${2} dot=${false} activeDot=${{r: 4, strokeWidth: 2, stroke: cores.superficie}} isAnimationActive=${false} />
              <${R.Line} type="monotone" dataKey="parcial" name=${String(ano)} stroke=${cores.serie[0]} strokeWidth=${2} strokeDasharray="5 4" strokeOpacity=${0.7} legendType="none"
                dot=${pt => pt.index === mesAtual ? html`<circle key="parcial" cx=${pt.cx} cy=${pt.cy} r=${4} fill=${cores.superficie} stroke=${cores.serie[0]} strokeWidth=${2} />` : html`<g key=${'p' + pt.index}></g>`}
                activeDot=${{r: 5, strokeWidth: 2, stroke: cores.superficie}} isAnimationActive=${false} />
              <${R.Line} type="monotone" dataKey="atual" name=${String(ano)} stroke=${cores.serie[0]} strokeWidth=${2} dot=${{r: 3, strokeWidth: 0, fill: cores.serie[0]}} activeDot=${{r: 5, strokeWidth: 2, stroke: cores.superficie}} connectNulls=${false} isAnimationActive=${false} />
            <//>
          <//>
        <//>

        <${Grafico} titulo="Vendas por grupo" sub=${`Valor dos itens vendidos em ${nomeMes}`} vazio=${!grupos.length && `Nenhuma venda em ${nomeMes} ainda.`}
          tabela=${{colunas: ['Grupo', 'Vendido', '%'], linhas: d.porGrupo.map(g => [g.nome, D.moedaBR(g.valor), pct(g.valor, d.porGrupo.reduce((s, x) => s + x.valor, 0))])}}>
          <${Pizza} dados=${grupos} cores=${cores} />
        <//>

        ${fin && html`
        <${Grafico} titulo=${`Receitas × despesas em ${nomeMes}`}
          sub=${`Receitas ${D.moedaBR(d.totalReceitasMes)} · Despesas ${D.moedaBR(d.totalDespesasMes)} · Resultado ${resultado < 0 ? '−' : ''}${D.moedaBR(Math.abs(resultado))}`}
          vazio=${!d.totalReceitasMes && !d.totalDespesasMes && `Sem receitas nem despesas em ${nomeMes}.`}
          legenda=${[{nome: 'Receitas', cor: cores.serie[0]}, {nome: 'Despesas', cor: cores.serie[1]}]}
          tabela=${{colunas: ['Dia', 'Receitas', 'Despesas'], linhas: d.porDia.filter(x => x.receitas || x.despesas).map(x => [String(x.dia).padStart(2, '0'), D.moedaBR(x.receitas), D.moedaBR(x.despesas)])}}>
          <${R.ResponsiveContainer} width="100%" height=${260}>
            <${R.BarChart} data=${d.porDia} margin=${{top: 8, right: 12, left: 4, bottom: 0}} barGap=${2} barCategoryGap="18%">
              <${R.CartesianGrid} stroke=${cores.grade} vertical=${false} />
              <${R.XAxis} dataKey="dia" ...${eixo} interval="preserveStartEnd" minTickGap=${8} />
              <${R.YAxis} ...${eixo} axisLine=${false} width=${74} tickFormatter=${moedaCurta} />
              <${R.Tooltip} content=${p => html`<${Dica} ...${p} titulo=${l => `Dia ${l} de ${nomeMes}`} />`} cursor=${{fill: cores.grade, opacity: 0.5}} />
              <${R.Bar} dataKey="receitas" name="Receitas" fill=${cores.serie[0]} radius=${[4, 4, 0, 0]} isAnimationActive=${false} />
              <${R.Bar} dataKey="despesas" name="Despesas" fill=${cores.serie[1]} radius=${[4, 4, 0, 0]} isAnimationActive=${false} />
            <//>
          <//>
        <//>

        <${Grafico} titulo="Despesas por categoria" sub=${`Contas a pagar com vencimento em ${nomeMes}`} vazio=${!despesas.length && `Nenhuma conta a pagar em ${nomeMes}.`}
          tabela=${{colunas: ['Categoria', 'Valor', '%'], linhas: d.despesasPorCategoria.map(c => [c.nome, D.moedaBR(c.valor), pct(c.valor, d.totalDespesasMes)])}}>
          <${Pizza} dados=${despesas} cores=${cores} />
        <//>`}
      </div>
      <p className="dv-ajuda rest-nota">Regime de competência: a venda conta no dia em que foi finalizada (inclusive a prazo) e cada conta conta no vencimento. Contas a receber geradas por vendas a prazo não entram de novo como receita.</p>`;
  }

  window.RestUI.telas.dashboard = TelaDashboard;
})();
