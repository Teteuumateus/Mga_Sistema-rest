// =====================================================================
// ---- 📈 MGA · Relatórios: vendas, produtos, caixa e delivery por período ----
// =====================================================================
// Os números vêm de RestDados.relatorio* (mesmo regime do Dashboard: a venda conta no dia
// em que foi finalizada). Cada tabela exporta CSV (abre no Excel) e a tela imprime ou vira PDF.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, Cabecalho, Segmentos, plural} = window.RestUI;
  const R = window.Recharts;
  const G = window.RestUI.graficos;

  // ---- Período: atalhos e datas; fica guardado ao trocar de relatório ----
  const addDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const ATALHOS = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mesPassado', 'Mês passado'], ['ano', 'Este ano']];
  function datasDo(atalho){
    const h = new Date(), iso = D.diaISO;
    return {
      hoje: {de: iso(h), ate: iso(h)},
      ontem: {de: iso(addDias(h, -1)), ate: iso(addDias(h, -1))},
      '7d': {de: iso(addDias(h, -6)), ate: iso(h)},
      mes: {de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(h)},
      mesPassado: {de: iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), ate: iso(new Date(h.getFullYear(), h.getMonth(), 0))},
      ano: {de: iso(new Date(h.getFullYear(), 0, 1)), ate: iso(h)}
    }[atalho];
  }
  let filtroGuardado = {atalho: 'mes', ...datasDo('mes'), operador: '', grupoId: ''};
  function useFiltro(){
    const [f, setF] = useState(() => filtroGuardado.atalho ? (filtroGuardado = {...filtroGuardado, ...datasDo(filtroGuardado.atalho)}) : filtroGuardado);
    const mudar = novo => { filtroGuardado = {...f, ...novo}; setF(filtroGuardado); };
    return [f, mudar];
  }
  const periodoBR = f => f.de === f.ate ? D.dataBR(f.de) : `${D.dataBR(f.de)} a ${D.dataBR(f.ate)}`;

  // ---- Formatação por tipo de coluna (tela e CSV) ----
  const pctBR = v => v.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + '%';
  const dataHoraBR = iso => iso ? new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'}) : '—';
  const FMT = {
    txt: v => v, int: v => v.toLocaleString('pt-BR'), qtd: D.qtdBR, moeda: D.moedaBR, pct: pctBR, dataHora: dataHoraBR,
    dif: v => Math.abs(v) < 0.005 ? D.moedaBR(0) : (v > 0 ? '+ ' : '− ') + D.moedaBR(Math.abs(v)),
    abate: v => (v < -0.005 ? '− ' : '') + D.moedaBR(Math.abs(v)) // composição: só o que abate leva sinal
  };
  const NUMERICO = ['int', 'qtd', 'moeda', 'pct', 'dif', 'abate', 'dataHora'];
  const celulaCsv = (v, tipo) => {
    if (v === null || v === undefined || v === '') return '';
    if (['moeda', 'dif', 'abate'].includes(tipo)) return Number(v).toFixed(2).replace('.', ',');
    if (tipo === 'pct') return Number(v).toFixed(1).replace('.', ',');
    if (tipo === 'qtd') return String(v).replace('.', ',');
    if (tipo === 'dataHora') return dataHoraBR(v);
    const t = /^[=+\-@\t\r]/.test(String(v)) ? "'" + String(v) : String(v);
    return /[;"\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  // CSV com ";" e BOM: o Excel em português abre com acentos e colunas certas
  function baixarCsv(nome, colunas, linhas, total){
    const lin = [colunas.map(c => celulaCsv(c.nome, 'txt')), ...linhas.map(l => l.map((v, k) => celulaCsv(v, colunas[k].tipo))),
      ...(total ? [total.map((v, k) => celulaCsv(v, colunas[k].tipo))] : [])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lin.map(l => l.join(';')).join('\r\n')], {type: 'text/csv;charset=utf-8'}));
    a.download = nome + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  // Imprime a tela em tema claro, sem menu nem filtros (o navegador oferece "Salvar como PDF")
  function imprimir(){
    const raiz = document.documentElement, tema = raiz.getAttribute('data-theme');
    raiz.setAttribute('data-theme', 'light');
    document.body.classList.add('rest-rel-imprimindo');
    const voltar = () => { document.body.classList.remove('rest-rel-imprimindo'); if (tema) raiz.setAttribute('data-theme', tema); window.removeEventListener('afterprint', voltar); };
    window.addEventListener('afterprint', voltar);
    setTimeout(() => window.print(), 150); // dá tempo de os gráficos trocarem de cor
  }

  // ---- Peças ----
  function Filtros({f, setF, operador = true, children}){
    const ops = operador ? D.operadoresDasVendas() : [];
    const data = k => e => { if (e.target.value) setF({atalho: '', [k]: e.target.value, ...(k === 'de' && e.target.value > f.ate ? {ate: e.target.value} : {}), ...(k === 'ate' && e.target.value < f.de ? {de: e.target.value} : {})}); };
    return html`
      <div className="cad-toolbar rest-filtros rest-sem-impressao">
        <${Segmentos} rotulo="Período" opcoes=${ATALHOS} valor=${f.atalho} onChange=${a => setF({atalho: a, ...datasDo(a)})} />
        <span className="rest-rel-datas">
          <input type="date" className="rest-select" value=${f.de} max=${D.hojeISO()} onChange=${data('de')} aria-label="De" />
          <span>a</span>
          <input type="date" className="rest-select" value=${f.ate} max=${D.hojeISO()} onChange=${data('ate')} aria-label="Até" />
        </span>
        ${operador && html`<select className="rest-select" value=${f.operador} onChange=${e => setF({operador: e.target.value})} aria-label="Operador">
          <option value="">Todos os operadores</option>
          ${ops.map(o => html`<option key=${o}>${o}</option>`)}
        </select>`}
        ${children}
      </div>`;
  }
  // Cabeçalho que só aparece no papel
  const TopoImpressao = ({titulo, f}) => html`
    <div className="rest-so-impressao">
      <b>${D.config().nome} · ${titulo}</b>
      ${D.cabecalhoEmpresa().slice(1, 2).map(l => html`<span key=${l}>${l}</span>`)}
      <span>Período: ${periodoBR(f)}${f.operador ? ` · operador ${f.operador}` : ''} · emitido em ${new Date().toLocaleString('pt-BR')} por ${D.usuario()}</span>
    </div>`;
  const Kpi = ({rotulo, valor, sub, alerta}) => html`
    <div className=${'rest-kpi-mini' + (alerta ? ' hv-alerta' : '')}><span>${rotulo}</span><b>${valor}</b><small>${sub}</small></div>`;
  // Variação contra o período anterior do mesmo tamanho
  function variacao(atual, anterior, ant){
    if (!anterior) return `sem vendas em ${periodoBR(ant)}`;
    const v = (atual / anterior - 1) * 100;
    return `${v >= 0 ? '▲' : '▼'} ${pctBR(Math.abs(v))} sobre ${periodoBR(ant)}`;
  }

  // Tabela de relatório: colunas tipadas, total no rodapé, barra proporcional e botão CSV
  function TabelaRel({titulo, sub, colunas, linhas, total, csv, barra, vazio = 'Nada no período.', largo}){
    const max = barra != null ? Math.max(...linhas.map(l => Math.abs(l[barra]) || 0), 0) : 0;
    const cel = (v, c) => v === null || v === undefined || v === '' ? html`<span className="rest-cod">—</span>` : FMT[c.tipo || 'txt'](v);
    return html`
      <section className=${'card rest-grafico rest-rel-tabela' + (largo ? ' rest-rel-largo' : '')}>
        <div className="rest-grafico-cab">
          <div><h3>${titulo}</h3>${sub && html`<p>${sub}</p>`}</div>
          ${linhas.length > 0 && html`<button type="button" className="rest-tabela-btn rest-sem-impressao" title="Baixar planilha (abre no Excel)" onClick=${() => baixarCsv(csv, colunas, linhas, total)}>CSV</button>`}
        </div>
        ${!linhas.length ? html`<p className="rest-grafico-vazio">${vazio}</p>` : html`
          <div className="table-scroll"><table>
            <thead><tr>${colunas.map(c => html`<th key=${c.nome} className=${NUMERICO.includes(c.tipo) ? 'rest-num' : ''}>${c.nome}</th>`)}</tr></thead>
            <tbody>${linhas.map((l, k) => html`<tr key=${k}>${l.map((v, j) => html`<td key=${j} className=${(NUMERICO.includes(colunas[j].tipo) ? 'nowrap rest-num' : '') + (colunas[j].tipo === 'dif' && Math.abs(v) >= 0.005 ? (v > 0 ? ' mov-pos' : ' mov-neg') : '')}>
              ${cel(v, colunas[j])}
              ${j === barra && max > 0 && html`<span className="rest-rel-barra" aria-hidden="true"><i style=${{width: (Math.abs(v) / max * 100) + '%'}}></i></span>`}
            </td>`)}</tr>`)}</tbody>
            ${total && html`<tfoot><tr>${total.map((v, j) => html`<td key=${j} className=${NUMERICO.includes(colunas[j].tipo) ? 'nowrap rest-num' : ''}>${v === '' ? '' : cel(v, colunas[j])}</td>`)}</tr></tfoot>`}
          </table></div>`}
      </section>`;
  }
  const pctDe = (v, total) => total ? v / total * 100 : 0;
  const nomeArquivo = (rel, f) => `mga-${rel}-${f.de}${f.de === f.ate ? '' : '_a_' + f.ate}`;
  const BotaoImprimir = () => html`<button type="button" className="btn btn-ghost" onClick=${imprimir}>🖨️ Imprimir / PDF</button>`;

  // ---- Vendas ----
  // Mais de 62 dias: o gráfico agrupa por mês (barras diárias ficariam ilegíveis)
  function seriePorPeriodo(porDia){
    if (porDia.length <= 62) return {titulo: 'Vendas por dia', dados: porDia};
    const meses = {};
    porDia.forEach(d => { const k = d.dia.slice(0, 7); const m = meses[k] ||= {rotulo: k.slice(5) + '/' + k.slice(2, 4), valor: 0, n: 0}; m.valor += d.valor; m.n += d.n; });
    return {titulo: 'Vendas por mês', dados: Object.values(meses)};
  }
  function GraficoBarras({dados, cores, rotuloDica}){
    const eixo = {stroke: cores.grade, tick: {fill: cores.eixo, fontSize: 12}, tickLine: false};
    return html`
      <${R.ResponsiveContainer} width="100%" height=${240}>
        <${R.BarChart} data=${dados} margin=${{top: 8, right: 12, left: 4, bottom: 0}} barCategoryGap="18%">
          <${R.CartesianGrid} stroke=${cores.grade} vertical=${false} />
          <${R.XAxis} dataKey="rotulo" ...${eixo} interval="preserveStartEnd" minTickGap=${8} />
          <${R.YAxis} ...${eixo} axisLine=${false} width=${74} tickFormatter=${G.moedaCurta} />
          <${R.Tooltip} cursor=${{fill: cores.grade, opacity: 0.5}}
            content=${p => html`<${G.Dica} ...${p} titulo=${(l, pl) => `${rotuloDica(l)} · ${plural(pl[0]?.payload?.n || 0, 'venda', 'vendas')}`} />`} />
          <${R.Bar} dataKey="valor" name="Vendido" fill=${cores.serie[0]} radius=${[4, 4, 0, 0]} isAnimationActive=${false} />
        <//>
      <//>`;
  }
  function TelaVendas(){
    useDados();
    const cores = G.useTema();
    const [f, setF] = useFiltro();
    const r = D.relatorioVendas(f);
    const serie = seriePorPeriodo(r.porDia);
    const horas = r.porHora.filter(h => h.n);
    const faixaHoras = horas.length ? r.porHora.slice(horas[0].hora, horas[horas.length - 1].hora + 1) : [];
    const totalFormas = r.porForma.reduce((s, x) => s + x.valor, 0);
    const csv = rel => nomeArquivo('vendas-' + rel, f);
    return html`
      <${Cabecalho} titulo="Relatório de vendas" sub=${`${periodoBR(f)} · vendas finalizadas no período`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Relatório de vendas" f=${f} />
      <${Filtros} f=${f} setF=${setF} />
      <div className="rest-kpis-mini">
        <${Kpi} rotulo="Total vendido" valor=${D.moedaBR(r.total)} sub=${variacao(r.total, r.anterior.total, r.anterior)} />
        <${Kpi} rotulo="Vendas" valor=${r.n.toLocaleString('pt-BR')} sub=${`ticket médio ${D.moedaBR(r.ticket)}`} />
        <${Kpi} rotulo="Descontos concedidos" valor=${D.moedaBR(r.descontos)} sub=${r.itens ? pctBR(pctDe(r.descontos, r.itens)) + ' dos itens' : 'sem itens'} />
        <${Kpi} rotulo="Canceladas" valor=${r.canceladas.n.toLocaleString('pt-BR')} sub=${D.moedaBR(r.canceladas.valor) + ' cancelados'} alerta=${r.canceladas.n > 0} />
      </div>
      ${!R ? html`<p className="dv-ajuda">Gráficos indisponíveis (a biblioteca não carregou). As tabelas abaixo trazem os mesmos números.</p>` : html`
      <div className="rest-graficos">
        ${r.porDia.length > 1 && html`<${G.Grafico} titulo=${serie.titulo} sub=${`Total vendido · ${periodoBR(f)}`} vazio=${!r.n && 'Nenhuma venda finalizada no período.'}
          tabela=${{colunas: [serie.titulo === 'Vendas por dia' ? 'Dia' : 'Mês', 'Vendas', 'Vendido'], linhas: serie.dados.filter(d => d.n).map(d => [d.rotulo, String(d.n), D.moedaBR(d.valor)])}}>
          <${GraficoBarras} dados=${serie.dados} cores=${cores} rotuloDica=${l => l} />
        <//>`}
        <${G.Grafico} titulo="Vendas por hora" sub="Hora em que o pedido foi aberto · para escalar a equipe" vazio=${!r.n && 'Nenhuma venda finalizada no período.'}
          tabela=${{colunas: ['Hora', 'Vendas', 'Vendido'], linhas: horas.map(h => [`${h.hora}h–${h.hora + 1}h`, String(h.n), D.moedaBR(h.valor)])}}>
          <${GraficoBarras} dados=${faixaHoras} cores=${cores} rotuloDica=${l => `${l} às ${parseInt(l, 10) + 1}h`} />
        <//>
      </div>`}
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} titulo="Por forma de pagamento" sub="Valor recebido em cada forma (sem o troco)" csv=${csv('formas')} barra=${2}
          colunas=${[{nome: 'Forma'}, {nome: 'Pagamentos', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: '%', tipo: 'pct'}]}
          linhas=${r.porForma.map(x => [x.nome, x.n, x.valor, pctDe(x.valor, totalFormas)])}
          total=${['Total', r.porForma.reduce((s, x) => s + x.n, 0), totalFormas, 100]} />
        <${TabelaRel} titulo="Por tipo de venda" csv=${csv('tipos')} barra=${2}
          colunas=${[{nome: 'Tipo'}, {nome: 'Vendas', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: 'Ticket médio', tipo: 'moeda'}, {nome: '%', tipo: 'pct'}]}
          linhas=${r.porTipo.map(x => [x.nome, x.n, x.valor, x.valor / x.n, pctDe(x.valor, r.total)])}
          total=${['Total', r.n, r.total, r.ticket, r.n ? 100 : 0]} />
        <${TabelaRel} titulo="Por operador" sub="Quem registrou a venda" csv=${csv('operadores')} barra=${2}
          colunas=${[{nome: 'Operador'}, {nome: 'Vendas', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: 'Ticket médio', tipo: 'moeda'}, {nome: 'Descontos', tipo: 'moeda'}]}
          linhas=${r.porOperador.map(x => [x.nome, x.n, x.valor, x.valor / x.n, x.descontos || 0])}
          total=${['Total', r.n, r.total, r.ticket, r.descontos]} />
        <${TabelaRel} titulo="Composição do total" sub="Do valor dos itens ao total cobrado" csv=${csv('composicao')}
          colunas=${[{nome: 'Item'}, {nome: 'Valor', tipo: 'abate'}]}
          linhas=${r.n ? [['Itens vendidos', r.itens], ['Descontos', -r.descontos], ['Acréscimos', r.acrescimos], ['Taxa de serviço (mesas)', r.servico], ['Taxa de entrega', r.entrega], ...(r.embalagem ? [['Embalagens', r.embalagem]] : [])] : []}
          total=${['Total vendido', r.total]} />
      </div>
      <p className="dv-ajuda rest-nota">A venda conta no dia em que foi finalizada (inclusive a prazo). Canceladas ficam fora do total e aparecem só no cartão "Canceladas".</p>`;
  }

  // ---- Produtos ----
  function TelaProdutos(){
    useDados();
    const [f, setF] = useFiltro();
    const r = D.relatorioProdutos(f);
    const margem = r.comCusto.valor ? pctBR(pctDe(r.comCusto.lucro, r.comCusto.valor)) : '—';
    const nA = r.lista.filter(x => x.curva === 'A').length;
    const csv = rel => nomeArquivo('produtos-' + rel, f);
    return html`
      <${Cabecalho} titulo="Relatório de produtos" sub=${`${periodoBR(f)} · o que mais vende, quanto custa e quanto sobra`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Relatório de produtos" f=${f} />
      <${Filtros} f=${f} setF=${setF}>
        <select className="rest-select" value=${f.grupoId} onChange=${e => setF({grupoId: e.target.value})} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          ${D.grupos().map(g => html`<option key=${g.id} value=${g.id}>${g.nome}</option>`)}
        </select>
      <//>
      <div className="rest-kpis-mini">
        <${Kpi} rotulo="Faturamento dos itens" valor=${D.moedaBR(r.total)} sub=${`${D.qtdBR(r.qtd)} itens vendidos`} />
        <${Kpi} rotulo="Produtos vendidos" valor=${r.lista.length} sub=${nA ? `${plural(nA, 'produto faz', 'produtos fazem')} 80% do faturamento` : 'nenhum no período'} />
        <${Kpi} rotulo="Custo dos produtos" valor=${D.moedaBR(r.comCusto.custo)} sub=${r.semCusto ? `${plural(r.semCusto, 'produto', 'produtos')} sem custo cadastrado` : 'todos com custo cadastrado'} alerta=${r.semCusto > 0} />
        <${Kpi} rotulo="Lucro bruto" valor=${D.moedaBR(r.comCusto.lucro)} sub=${`margem ${margem}${r.semCusto ? ' · só produtos com custo' : ''}`} />
      </div>
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} largo titulo="Ranking de produtos" sub="Curva ABC: A = produtos que somam os primeiros 80% do faturamento, B = até 95%, C = o restante"
          csv=${csv('ranking')} barra=${5} vazio="Nenhum produto vendido no período."
          colunas=${[{nome: 'Curva'}, {nome: 'Cód.'}, {nome: 'Produto'}, {nome: 'Categoria'}, {nome: 'Qtd', tipo: 'qtd'}, {nome: 'Faturamento', tipo: 'moeda'}, {nome: '%', tipo: 'pct'},
            {nome: 'Custo', tipo: 'moeda'}, {nome: 'Lucro bruto', tipo: 'moeda'}, {nome: 'Margem', tipo: 'pct'}]}
          linhas=${r.lista.map(x => [x.curva, x.codigo, x.nome, x.grupo, x.qtd, x.valor, pctDe(x.valor, r.total), x.semCusto ? null : x.custo, x.lucro, x.margem])}
          total=${['', '', 'Total', '', r.qtd, r.total, r.total ? 100 : 0, r.comCusto.custo, r.comCusto.lucro, r.comCusto.valor ? pctDe(r.comCusto.lucro, r.comCusto.valor) : null]} />
        <${TabelaRel} titulo="Por categoria" csv=${csv('categorias')} barra=${3}
          colunas=${[{nome: 'Categoria'}, {nome: 'Produtos', tipo: 'int'}, {nome: 'Qtd', tipo: 'qtd'}, {nome: 'Faturamento', tipo: 'moeda'}, {nome: '%', tipo: 'pct'}]}
          linhas=${r.porGrupo.map(g => [g.nome, g.n, g.qtd, g.valor, pctDe(g.valor, r.total)])}
          total=${['Total', r.lista.length, r.qtd, r.total, r.total ? 100 : 0]} />
      </div>
      <p className="dv-ajuda rest-nota">Faturamento = quantidade × preço, menos o desconto do item. Descontos e acréscimos na venda inteira, taxa de serviço e taxa de entrega ficam fora (veja o relatório de vendas).
        O custo é o do produto no momento da venda; vendas sem custo cadastrado ficam fora do lucro.</p>`;
  }

  // ---- Caixa ----
  function TelaCaixa(){
    useDados();
    const [f, setF] = useFiltro();
    const r = D.relatorioCaixa(f);
    return html`
      <${Cabecalho} titulo="Relatório de caixa" sub=${`${periodoBR(f)} · caixas abertos no período`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Relatório de caixa" f=${f} />
      <${Filtros} f=${f} setF=${setF} />
      <div className="rest-kpis-mini">
        <${Kpi} rotulo="Caixas" valor=${r.lista.length} sub=${r.abertos ? `${r.abertos} ainda aberto` : 'todos fechados'} />
        <${Kpi} rotulo="Vendido nos caixas" valor=${D.moedaBR(r.vendas)} sub=${plural(r.nVendas, 'venda', 'vendas')} />
        <${Kpi} rotulo="Sobras e faltas" valor=${FMT.dif(r.sobras + r.faltas)} sub=${r.comDiferenca ? `sobras ${D.moedaBR(r.sobras)} · faltas ${D.moedaBR(Math.abs(r.faltas))}` : 'nenhuma diferença no fechamento'} alerta=${r.faltas < 0} />
        <${Kpi} rotulo="Sangrias" valor=${D.moedaBR(r.sangrias)} sub=${`suprimentos ${D.moedaBR(r.suprimentos)}`} />
      </div>
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} largo titulo="Caixas do período" sub="Dinheiro esperado = inicial + vendas e recebimentos em dinheiro + suprimentos − sangrias, pagamentos e estornos"
          csv=${nomeArquivo('caixas', f)} barra=${5} vazio="Nenhum caixa aberto no período."
          colunas=${[{nome: 'Caixa'}, {nome: 'Operador'}, {nome: 'Abertura', tipo: 'dataHora'}, {nome: 'Fechamento', tipo: 'dataHora'}, {nome: 'Vendas', tipo: 'int'}, {nome: 'Vendido', tipo: 'moeda'},
            {nome: 'Sangrias', tipo: 'moeda'}, {nome: 'Dinheiro esperado', tipo: 'moeda'}, {nome: 'Contado', tipo: 'moeda'}, {nome: 'Diferença', tipo: 'dif'}]}
          linhas=${r.lista.map(c => [`#${c.numero}${c.status === 'ABERTO' ? ' (aberto)' : ''}`, c.operador, c.abertura, c.fechamento, c.nVendas, c.vendas, c.sangrias, c.esperado, c.contado, c.diferenca])}
          total=${['Total', '', '', '', r.nVendas, r.vendas, r.sangrias, '', '', r.sobras + r.faltas]} />
      </div>`;
  }

  // ---- Delivery ----
  function TelaDelivery(){
    useDados();
    const [f, setF] = useFiltro();
    const r = D.relatorioDelivery(f);
    const cfg = D.config();
    const csv = rel => nomeArquivo('delivery-' + rel, f);
    const colunasEntrega = primeira => [{nome: primeira}, {nome: 'Pedidos', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: 'Taxas de entrega', tipo: 'moeda'}];
    const somaN = l => l.reduce((s, x) => s + x.n, 0), somaV = (l, k = 'valor') => l.reduce((s, x) => s + (x[k] || 0), 0);
    return html`
      <${Cabecalho} titulo="Relatório de delivery" sub=${`${periodoBR(f)} · deliveries e encomendas entregues`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Relatório de delivery" f=${f} />
      <${Filtros} f=${f} setF=${setF} />
      <div className="rest-kpis-mini">
        <${Kpi} rotulo="Pedidos entregues" valor=${r.n.toLocaleString('pt-BR')} sub=${`ticket médio ${D.moedaBR(r.ticket)}${r.canceladas ? ` · ${r.canceladas} cancelado${r.canceladas === 1 ? '' : 's'}` : ''}`} />
        <${Kpi} rotulo="Faturamento" valor=${D.moedaBR(r.total)} sub=${`${D.moedaBR(r.taxas)} em taxas de entrega`} />
        <${Kpi} rotulo="Tempo médio (delivery)" valor=${r.tempoMedio === null ? '—' : `${r.tempoMedio} min`} sub=${r.nTempos ? 'do pedido até a entrega' : 'nenhum delivery no período'} />
        <${Kpi} rotulo=${`No prazo (até ${cfg.entregaVerde} min)`} valor=${r.nTempos ? pctBR(pctDe(r.faixas.verde, r.nTempos)) : '—'}
          sub=${r.nTempos ? `${r.faixas.amarelo} até ${cfg.entregaAmarelo} min · ${r.faixas.vermelho} acima` : 'tempos em Configurações'} alerta=${r.faixas.vermelho > 0} />
      </div>
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} titulo="Por entregador" sub="Só pedidos com entrega (não conta os de retirada)" csv=${csv('entregadores')} barra=${1}
          colunas=${colunasEntrega('Entregador')} linhas=${r.porEntregador.map(x => [x.nome, x.n, x.valor, x.taxas || 0])}
          total=${['Total', somaN(r.porEntregador), somaV(r.porEntregador), somaV(r.porEntregador, 'taxas')]} />
        <${TabelaRel} titulo="Por região de entrega" sub="Regiões de Cadastros › Regiões de entrega" csv=${csv('regioes')} barra=${1}
          colunas=${colunasEntrega('Região')} linhas=${r.porRegiao.map(x => [x.nome, x.n, x.valor, x.taxas || 0])}
          total=${['Total', somaN(r.porRegiao), somaV(r.porRegiao), somaV(r.porRegiao, 'taxas')]} />
        <${TabelaRel} titulo="Por bairro" sub="Onde estão os clientes do delivery" csv=${csv('bairros')} barra=${1}
          colunas=${colunasEntrega('Bairro')} linhas=${r.porBairro.map(x => [x.nome, x.n, x.valor, x.taxas || 0])}
          total=${['Total', somaN(r.porBairro), somaV(r.porBairro), somaV(r.porBairro, 'taxas')]} />
        <${TabelaRel} titulo="Por aplicativo" sub="Comissão estimada pelo percentual de cada aplicativo" csv=${csv('aplicativos')} barra=${2}
          colunas=${[{nome: 'Origem'}, {nome: 'Pedidos', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: 'Comissão', tipo: 'moeda'}]}
          linhas=${r.porAplicativo.map(x => [x.nome, x.n, x.valor, x.comissao || 0])}
          total=${['Total', r.n, r.total, r.porAplicativo.reduce((s, x) => s + (x.comissao || 0), 0)]} />
        <${TabelaRel} titulo="Por tipo de pedido" csv=${csv('tipos')} barra=${2}
          colunas=${[{nome: 'Tipo'}, {nome: 'Pedidos', tipo: 'int'}, {nome: 'Valor', tipo: 'moeda'}, {nome: '%', tipo: 'pct'}]}
          linhas=${r.porModo.map(x => [x.nome, x.n, x.valor, pctDe(x.valor, r.total)])}
          total=${['Total', r.n, r.total, r.n ? 100 : 0]} />
      </div>`;
  }

  // ---- Engenharia de cardápio (CMV): popularidade × margem de contribuição ----
  const CLASSES = {
    ESTRELA: {ic: '⭐', dica: 'Vende muito e dá boa margem: mantenha em destaque e não mexa na receita.'},
    BURRO: {ic: '🐴', dica: 'Vende muito, mas a margem é baixa: revise preço, porção ou custo dos insumos.'},
    QUEBRA: {ic: '🧩', dica: 'Margem boa, vende pouco: divulgue, mude a posição no cardápio ou o nome.'},
    CAO: {ic: '🐶', dica: 'Vende pouco e dá pouca margem: pense em tirar do cardápio ou reformular.'}
  };
  const ORDEM_CLASSES = ['ESTRELA', 'BURRO', 'QUEBRA', 'CAO'];
  function TelaCardapio(){
    useDados();
    const cores = G.useTema();
    const [f, setF] = useFiltro();
    const e = D.engenhariaCardapio(f);
    const semCusto = D.relatorioProdutos(f).semCusto;
    const cor = c => cores.serie[ORDEM_CLASSES.indexOf(c)];
    const eixo = {stroke: cores.grade, tick: {fill: cores.eixo, fontSize: 12}, tickLine: false};
    return html`
      <${Cabecalho} titulo="Engenharia de cardápio" sub=${`${periodoBR(f)} · cruza quanto cada prato vende com quanto ele deixa de lucro por unidade`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Engenharia de cardápio" f=${f} />
      <${Filtros} f=${f} setF=${setF}>
        <select className="rest-select" value=${f.grupoId} onChange=${ev => setF({grupoId: ev.target.value})} aria-label="Categoria">
          <option value="">Todas as categorias</option>${D.grupos().map(g => html`<option key=${g.id} value=${g.id}>${g.nome}</option>`)}
        </select>
      <//>
      <div className="rest-kpis-mini">
        ${ORDEM_CLASSES.map(c => html`<${Kpi} key=${c} rotulo=${`${CLASSES[c].ic} ${D.CLASSES_CARDAPIO[c]}`} valor=${e.lista.filter(x => x.classe === c).length} sub=${CLASSES[c].dica.split(':')[0]} />`)}
      </div>
      ${semCusto > 0 && html`<p className="rest-dica-est">${plural(semCusto, 'produto vendido está', 'produtos vendidos estão')} sem custo e ficam fora da análise. Cadastre o custo ou a ficha técnica no produto.</p>`}
      ${R && e.lista.length > 0 && html`<${G.Grafico} titulo="Popularidade × margem" sub=${`Linhas: ${D.qtdBR(e.corteQtd)} unidades (70% da média) e ${D.moedaBR(e.corteMargem)} de margem média por unidade`}
        legenda=${ORDEM_CLASSES.map(c => ({nome: D.CLASSES_CARDAPIO[c], cor: cor(c)}))}
        tabela=${{colunas: ['Produto', 'Classe', 'Vendidos', 'Margem/un.'], linhas: e.lista.map(x => [x.nome, D.CLASSES_CARDAPIO[x.classe], D.qtdBR(x.qtd), D.moedaBR(x.margemUn)])}}>
        <${R.ResponsiveContainer} width="100%" height=${320}>
          <${R.ScatterChart} margin=${{top: 12, right: 20, left: 4, bottom: 8}}>
            <${R.CartesianGrid} stroke=${cores.grade} />
            <${R.XAxis} type="number" dataKey="qtd" name="Vendidos" ...${eixo} label=${{value: 'unidades vendidas', position: 'insideBottomRight', offset: -4, fill: cores.eixo, fontSize: 12}} />
            <${R.YAxis} type="number" dataKey="margemUn" name="Margem/un." ...${eixo} width=${74} tickFormatter=${v => 'R$ ' + Math.round(v)} />
            <${R.ReferenceLine} x=${e.corteQtd} stroke=${cores.eixo} strokeDasharray="4 4" />
            <${R.ReferenceLine} y=${e.corteMargem} stroke=${cores.eixo} strokeDasharray="4 4" />
            <${R.Tooltip} cursor=${{strokeDasharray: '3 3'}} content=${p => p.active && p.payload?.[0] ? html`<div className="rest-dica"><b>${p.payload[0].payload.nome}</b>
              <div><i style=${{background: cor(p.payload[0].payload.classe)}}></i>${D.CLASSES_CARDAPIO[p.payload[0].payload.classe]}</div>
              <div>Vendidos<span>${D.qtdBR(p.payload[0].payload.qtd)}</span></div><div>Margem por unidade<span>${D.moedaBR(p.payload[0].payload.margemUn)}</span></div></div>` : null} />
            ${ORDEM_CLASSES.map(c => html`<${R.Scatter} key=${c} name=${D.CLASSES_CARDAPIO[c]} data=${e.lista.filter(x => x.classe === c)} fill=${cor(c)} stroke=${cores.superficie} strokeWidth=${2} isAnimationActive=${false} />`)}
          <//>
        <//>
      <//>`}
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} largo titulo="Classificação dos produtos" sub="Margem = preço − custo (pela ficha técnica ou custo cadastrado no momento da venda)" csv=${nomeArquivo('engenharia-cardapio', f)} barra=${5}
          vazio="Nenhum produto com custo vendido no período."
          colunas=${[{nome: 'Classe'}, {nome: 'Produto'}, {nome: 'Categoria'}, {nome: 'Vendidos', tipo: 'qtd'}, {nome: 'Margem/un.', tipo: 'moeda'}, {nome: 'Lucro total', tipo: 'moeda'}, {nome: 'O que fazer'}]}
          linhas=${e.lista.map(x => [`${CLASSES[x.classe].ic} ${D.CLASSES_CARDAPIO[x.classe]}`, x.nome, x.grupo, x.qtd, x.margemUn, x.lucro, CLASSES[x.classe].dica.split(': ')[1]])} />
      </div>
      <p className="dv-ajuda rest-nota">Método Kasavana & Smith: é "popular" quem vende pelo menos 70% da média por produto, e "rentável" quem deixa margem por unidade acima da média ponderada.</p>`;
  }

  // ---- Financeiro: DRE, contas, sangrias e resultado mês a mês ----
  function TelaFinanceiro(){
    useDados();
    const [f, setF] = useFiltro();
    const r = D.relatorioFinanceiro({...f, operador: ''});
    const pct = v => r.receita ? v / r.receita * 100 : null;
    const csv = rel => nomeArquivo('financeiro-' + rel, f);
    const SIT = c => c.status === 'PAGA' ? (c.tipo === 'PAGAR' ? 'Paga' : 'Recebida') : c.vencimento < D.hojeISO() ? 'Vencida' : 'Em aberto';
    const contasTab = (lista, tipo) => html`<${TabelaRel} titulo=${tipo === 'PAGAR' ? 'Contas a pagar' : 'Contas a receber'} sub="Com vencimento no período" csv=${csv(tipo === 'PAGAR' ? 'pagar' : 'receber')}
      colunas=${[{nome: 'Vencimento'}, {nome: 'Descrição'}, {nome: 'Categoria'}, {nome: 'Situação'}, {nome: 'Valor', tipo: 'moeda'}]}
      linhas=${lista.slice().sort((a, b) => a.vencimento.localeCompare(b.vencimento)).map(c => [D.dataBR(c.vencimento), c.descricao, c.categoria, SIT(c), c.valor])}
      total=${['Total', '', '', '', lista.reduce((s, c) => s + c.valor, 0)]} vazio="Nenhuma conta no período." />`;
    return html`
      <${Cabecalho} titulo="Relatório financeiro" sub=${`${periodoBR(f)} · regime de competência (venda no dia em que fechou, conta no vencimento)`}><${BotaoImprimir} /><//>
      <${TopoImpressao} titulo="Relatório financeiro" f=${{...f, operador: ''}} />
      <${Filtros} f=${f} setF=${setF} operador=${false} />
      <div className="rest-kpis-mini">
        <${Kpi} rotulo="Receita de vendas" valor=${D.moedaBR(r.receita)} sub=${r.outras ? `+ ${D.moedaBR(r.outras)} outras receitas` : 'vendas finalizadas'} />
        <${Kpi} rotulo="Lucro bruto" valor=${D.moedaBR(r.lucroBruto)} sub=${`CMV ${D.moedaBR(r.cmv)}${pct(r.cmv) !== null ? ` (${pctBR(pct(r.cmv))} da receita)` : ''}`} />
        <${Kpi} rotulo="Despesas" valor=${D.moedaBR(r.despesas)} sub=${`fora compras de mercadoria (${D.moedaBR(r.compras)})`} />
        <${Kpi} rotulo="Resultado" valor=${FMT.dif(r.resultado)} sub=${pct(r.resultado) !== null ? `margem ${pctBR(pct(r.resultado))}` : 'sem vendas no período'} alerta=${r.resultado < 0} />
      </div>
      ${r.semCusto > 0 && html`<p className="rest-dica-est">${plural(r.semCusto, 'item vendido não tem custo', 'itens vendidos não têm custo')}: o CMV fica menor que o real. Cadastre o custo ou a ficha técnica dos produtos.</p>`}
      <div className="rest-graficos rest-rel-grade">
        <${TabelaRel} titulo="DRE — demonstrativo de resultado" csv=${csv('dre')}
          colunas=${[{nome: 'Linha'}, {nome: 'Valor', tipo: 'abate'}, {nome: '% da receita', tipo: 'pct'}]}
          linhas=${[['Receita de vendas', r.receita, 100], ['(−) Custo dos produtos vendidos (CMV)', -r.cmv, pct(r.cmv)], ['= Lucro bruto', r.lucroBruto, pct(r.lucroBruto)],
            ['(−) Comissões de aplicativos', -r.comissoes, pct(r.comissoes)], ['(−) Despesas', -r.despesas, pct(r.despesas)], ['(+) Outras receitas', r.outras, pct(r.outras)]]}
          total=${['= Resultado do período', r.resultado, pct(r.resultado)]} />
        <${TabelaRel} titulo="Despesas por categoria" sub=${`Contas a pagar no período, sem "${D.CATEGORIA_COMPRAS}" (compras de mercadoria já estão no CMV)`} csv=${csv('despesas')} barra=${1}
          colunas=${[{nome: 'Categoria'}, {nome: 'Valor', tipo: 'moeda'}, {nome: 'Pago', tipo: 'moeda'}, {nome: 'Em aberto', tipo: 'moeda'}]}
          linhas=${r.despesasPorCategoria.map(c => [c.nome, c.valor, c.pago, c.aberto])}
          total=${['Total', r.despesas, r.despesasPorCategoria.reduce((s, c) => s + c.pago, 0), r.despesasPorCategoria.reduce((s, c) => s + c.aberto, 0)]} />
        <${TabelaRel} largo titulo=${`Mês a mês em ${f.ate.slice(0, 4)}`} sub="Receitas (vendas + outras receitas), CMV, despesas e resultado de cada mês" csv=${csv('mensal')} barra=${1}
          colunas=${[{nome: 'Mês'}, {nome: 'Receitas', tipo: 'moeda'}, {nome: 'CMV', tipo: 'moeda'}, {nome: 'Despesas', tipo: 'moeda'}, {nome: 'Resultado', tipo: 'dif'}]}
          linhas=${r.meses.map(m => [m.nome, m.receitas, m.cmv, m.despesas, m.resultado])}
          total=${['Ano', ...['receitas', 'cmv', 'despesas', 'resultado'].map(k => r.meses.reduce((s, m) => s + m[k], 0))]} />
        ${contasTab(r.pagar, 'PAGAR')}
        ${contasTab(r.receber, 'RECEBER')}
        <${TabelaRel} largo titulo="Sangrias e suprimentos" sub="Dinheiro tirado ou colocado na gaveta dos caixas" csv=${csv('sangrias')}
          colunas=${[{nome: 'Data', tipo: 'dataHora'}, {nome: 'Caixa'}, {nome: 'Tipo'}, {nome: 'Motivo'}, {nome: 'Operador'}, {nome: 'Valor', tipo: 'dif'}]}
          linhas=${r.sangrias.map(m => [m.data, m.caixa ? `#${m.caixa}` : '—', D.TIPOS_MOV_CAIXA[m.tipo], m.descricao, m.operador, m.tipo === 'SANGRIA' ? -m.valor : m.valor])}
          vazio="Nenhuma sangria ou suprimento no período." />
      </div>`;
  }

  Object.assign(window.RestUI.telas, {'rel/vendas': TelaVendas, 'rel/produtos': TelaProdutos, 'rel/caixa': TelaCaixa, 'rel/delivery': TelaDelivery,
    'rel/cardapio': TelaCardapio, 'rel/financeiro': TelaFinanceiro});
})();
