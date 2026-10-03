// =====================================================================
// ---- 📦 MGA · Estoque: posição, entradas, saídas, inventário e movimentações ----
// =====================================================================
// Só produtos com "controla estoque" têm saldo. A venda finalizada baixa o estoque
// sozinha e a venda cancelada devolve (regras em restaurante-dados.js).
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, Acoes, Modal, Tabela, Segmentos, plural} = window.RestUI;

  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  const valorEstoque = p => Math.max(Number(p.estoque) || 0, 0) * (p.custo || 0);
  const somaValor = lista => lista.reduce((s, p) => s + valorEstoque(p), 0);
  const semEstoque = p => p.controlaEstoque && Number(p.estoque) <= 0;
  const FILTROS = [['controlados', 'Controlados'], ['repor', 'Repor'], ['zerados', 'Sem estoque'], ['todos', 'Todos os produtos']];

  function Situacao({p}){
    if (!p.controlaEstoque) return html`<span className="rest-cod">Não controla</span>`;
    if (semEstoque(p)) return html`<span className="badge rest-b-vencida">Sem estoque</span>`;
    if (D.estoqueBaixo(p)) return html`<span className="badge b-wait">Repor</span>`;
    return html`<span className="badge b-ok">OK</span>`;
  }

  // ---- Janela de entrada, saída ou ajuste de inventário ----
  const TITULOS = {ENTRADA: 'Entrada de mercadoria', SAIDA: 'Saída de estoque', AJUSTE: 'Ajuste de inventário'};
  const CONFIRMAR = {ENTRADA: 'Confirmar entrada', SAIDA: 'Confirmar saída', AJUSTE: 'Ajustar saldo'};
  function JanelaMovimento({inicial, onFechar, aviso, tentar}){
    const [f, setF] = useState(inicial);
    const set = k => e => setF({...f, [k]: e.target.value});
    const controlados = D.produtos().filter(p => p.controlaEstoque && (p.ativo || p.id === f.produtoId)).sort(porNome);
    const p = D.produtoPorId(f.produtoId);
    const qtd = D.lerValor(f.quantidade), custo = D.lerValor(f.custo);
    const podeConta = D.podeAcessar('financeiro');
    const novoSaldo = !p || !(qtd >= 0) ? null : f.tipo === 'ENTRADA' ? p.estoque + qtd : f.tipo === 'SAIDA' ? p.estoque - qtd : qtd;
    const novoCusto = p && f.tipo === 'ENTRADA' && qtd > 0 && custo > 0 ? D.custoMedio(p, qtd, custo) : null;
    const confirmar = () => {
      const acoes = {
        ENTRADA: [() => D.entradaEstoque({...f, conta: podeConta && f.conta ? {vencimento: f.vencimento} : null}),
          m => `Entrada de ${D.qtdBR(m.quantidade)} ${m.unidade} de "${m.produto}". Saldo: ${D.qtdBR(m.saldo)} ${m.unidade}.${podeConta && f.conta ? ' Conta a pagar lançada.' : ''}`],
        SAIDA: [() => D.saidaEstoque(f), m => `Saída de ${D.qtdBR(-m.quantidade)} ${m.unidade} de "${m.produto}". Saldo: ${D.qtdBR(m.saldo)} ${m.unidade}.`],
        AJUSTE: [() => D.ajustarEstoque({...f, contado: f.quantidade}), m => `Saldo de "${m.produto}" ajustado para ${D.qtdBR(m.saldo)} ${m.unidade}.`]
      };
      if (tentar(...acoes[f.tipo])) onFechar();
    };
    return html`
      <${Modal} titulo=${TITULOS[f.tipo]} onFechar=${onFechar}>
        <form onSubmit=${e => { e.preventDefault(); confirmar(); }}>
          <div className="form-grid">
            <${Campo} rotulo="Produto" largo>
              <select value=${f.produtoId} onChange=${set('produtoId')}>
                <option value="" disabled>Escolha...</option>
                ${controlados.map(x => html`<option key=${x.id} value=${x.id}>${x.codigo} · ${x.nome} (${D.qtdBR(x.estoque)} ${x.unidade})</option>`)}
              </select>
            <//>
            <${Campo} rotulo=${f.tipo === 'AJUSTE' ? `Quantidade contada${p ? ` (${p.unidade})` : ''}` : `Quantidade${p ? ` (${p.unidade})` : ''}`}>
              <input type="text" inputMode="decimal" value=${f.quantidade} placeholder="0" onInput=${set('quantidade')} />
            <//>
            ${f.tipo === 'ENTRADA' && html`
              <${Campo} rotulo=${`Custo unitário (R$)${p ? ` por ${p.unidade}` : ''}`}><${CampoValor} valor=${f.custo} onChange=${v => setF(x => ({...x, custo: v}))} /><//>
              <${Campo} rotulo="Fornecedor / nota (opcional)" largo><input type="text" value=${f.documento} maxLength="80" placeholder="Ex.: Distribuidora X · NF 1234" onInput=${set('documento')} /><//>`}
            ${f.tipo === 'SAIDA' && html`
              <${Campo} rotulo="Motivo" largo><input type="text" list="est-motivos" value=${f.motivo} maxLength="80" placeholder="Ex.: Perda / quebra" onInput=${set('motivo')} /><//>`}
            ${f.tipo === 'AJUSTE' && html`
              <${Campo} rotulo="Observação (opcional)" largo><input type="text" value=${f.motivo} maxLength="80" placeholder="Inventário" onInput=${set('motivo')} /><//>`}
          </div>
          <datalist id="est-motivos">${D.MOTIVOS_SAIDA.map(m => html`<option key=${m} value=${m} />`)}</datalist>
          ${p && html`<p className="rest-est-previa">
            Saldo: <b>${D.qtdBR(p.estoque)} ${p.unidade}</b>${novoSaldo !== null && D.lerValor(f.quantidade) >= 0 && f.quantidade !== '' ? html` → <b className=${novoSaldo < 0 ? 'mov-neg' : ''}>${D.qtdBR(novoSaldo)} ${p.unidade}</b>` : null}
            ${novoCusto !== null && html`<br />Custo médio: ${D.moedaBR(p.custo)} → <b>${D.moedaBR(novoCusto)}</b> · total da compra <b>${D.moedaBR(qtd * custo)}</b>`}
          </p>`}
          ${f.tipo === 'ENTRADA' && podeConta && html`
            <label className="rest-check rest-no-caixa"><input type="checkbox" checked=${f.conta} onChange=${e => setF({...f, conta: e.target.checked})} /> Lançar conta a pagar ao fornecedor</label>
            ${f.conta && html`<div className="form-grid"><${Campo} rotulo="Vencimento"><input type="date" value=${f.vencimento} onChange=${set('vencimento')} /><//></div>`}`}
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
            <button type="submit" className="btn">${CONFIRMAR[f.tipo]}</button>
          </div>
        </form>
      <//>`;
  }

  // ---- Janela para ligar o controle e definir o estoque mínimo ----
  function JanelaConfig({inicial, onFechar, aviso, tentar}){
    const [f, setF] = useState(inicial);
    const p = D.produtoPorId(f.produtoId);
    const salvar = () => { if (tentar(() => D.configurarEstoque(f.produtoId, f), x => x.controlaEstoque ? `"${x.nome}" controla estoque (mínimo ${D.qtdBR(x.estoqueMinimo)} ${x.unidade}).` : `"${x.nome}" não controla mais estoque.`)) onFechar(); };
    return html`
      <${Modal} titulo=${`Estoque — ${p.nome}`} onFechar=${onFechar}>
        <form onSubmit=${e => { e.preventDefault(); salvar(); }}>
          <label className="rest-check"><input type="checkbox" checked=${f.controla} onChange=${e => setF({...f, controla: e.target.checked})} /> Controlar estoque deste produto</label>
          <p className="dv-ajuda">${f.controla ? 'A venda finalizada baixa o saldo e a venda cancelada devolve.' : 'Pratos feitos na hora normalmente não controlam estoque. O saldo atual fica guardado.'}</p>
          ${f.controla && html`<div className="form-grid">
            <${Campo} rotulo=${`Estoque mínimo (${p.unidade})`}><input type="text" inputMode="decimal" value=${f.minimo} placeholder="0" onInput=${e => setF({...f, minimo: e.target.value})} /><//>
          </div>
          <p className="dv-ajuda">Com o saldo no mínimo ou abaixo, o produto aparece em "Repor" e no contador do menu.</p>`}
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
            <button type="submit" className="btn">Salvar</button>
          </div>
        </form>
      <//>`;
  }

  // ---- Posição do estoque ----
  function TelaPosicao({params, ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [filtro, setFiltro] = useState(FILTROS.some(([f]) => f === params.f) ? params.f : 'controlados');
    const [grupo, setGrupo] = useState('');
    const [busca, setBusca] = useState('');
    const [inativos, setInativos] = useState(false);
    const [mov, setMov] = useState(null);
    const [config, setConfig] = useState(null);
    const todos = D.produtos().filter(p => inativos || p.ativo);
    const controlados = todos.filter(p => p.controlaEstoque);
    const repor = controlados.filter(D.estoqueBaixo), zerados = controlados.filter(semEstoque);
    const porFiltro = {controlados: p => p.controlaEstoque, repor: D.estoqueBaixo, zerados: semEstoque, todos: () => true}[filtro];
    const b = D.norm(busca);
    const lista = todos.filter(porFiltro)
      .filter(p => !grupo || p.grupoId === grupo)
      .filter(p => !busca || D.norm(p.nome + ' ' + p.codigo).includes(b))
      .sort((x, y) => filtro === 'repor' ? (x.estoque - (x.estoqueMinimo || 0)) - (y.estoque - (y.estoqueMinimo || 0)) || porNome(x, y)
        : (D.grupoPorId(x.grupoId)?.ordem || 0) - (D.grupoPorId(y.grupoId)?.ordem || 0) || porNome(x, y));
    const abrir = (tipo, p) => setMov({tipo, produtoId: p?.id || '', quantidade: '', custo: p?.custo ? D.valorBR(p.custo) : '', documento: '', motivo: '',
      conta: false, vencimento: D.hojeISO()});
    const configurar = (p, controla = p.controlaEstoque) => setConfig({produtoId: p.id, controla, minimo: p.estoqueMinimo ? D.qtdBR(p.estoqueMinimo) : ''});

    const kpi = (rotulo, n, sub, alerta, f) => html`
      <button type="button" className=${'rest-kpi-mini' + (alerta && n ? ' hv-alerta' : '') + (filtro === f ? ' ativo' : '')} onClick=${() => setFiltro(f)} aria-pressed=${filtro === f}>
        <span>${rotulo}</span><b>${n}</b><small>${sub}</small>
      </button>`;
    return html`
      <${Cabecalho} titulo="Posição do estoque" sub="A venda finalizada baixa o estoque sozinha; a venda cancelada devolve">
        <button type="button" className="btn btn-ghost" onClick=${() => ir('estoque/movimentos')}>Movimentações</button>
        <button type="button" className="btn" onClick=${() => abrir('ENTRADA')} disabled=${!controlados.length} title=${controlados.length ? '' : 'Nenhum produto controla estoque'}>+ Entrada de mercadoria</button>
      <//>
      ${aviso}
      <div className="rest-kpis-mini">
        ${kpi('Produtos controlados', controlados.length, plural(todos.length - controlados.length, 'sem controle', 'sem controle'), false, 'controlados')}
        ${kpi('Repor', repor.length, 'no estoque mínimo ou abaixo', true, 'repor')}
        ${kpi('Sem estoque', zerados.length, 'saldo zero ou negativo', true, 'zerados')}
        <div className="rest-kpi-mini"><span>Valor em estoque</span><b>${D.moedaBR(somaValor(controlados))}</b><small>pelo custo médio</small></div>
      </div>
      ${!controlados.length && html`<p className="rest-dica-est">Nenhum produto controla estoque ainda. Em <b>Todos os produtos</b>, clique em <b>Controlar</b> nas bebidas e itens comprados prontos,
        ou marque "Controlar estoque" no cadastro do produto.</p>`}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Situação" opcoes=${FILTROS} valor=${filtro} onChange=${setFiltro} />
        <select className="rest-select" value=${grupo} onChange=${e => setGrupo(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          ${D.grupos().map(g => html`<option key=${g.id} value=${g.id}>${g.nome}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar produto ou código..." />
        <label className="rest-check"><input type="checkbox" checked=${inativos} onChange=${e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      </div>
      <${Tabela} colunas=${['Cód.', 'Produto', 'Saldo', 'Mínimo', 'Custo médio', 'Valor em estoque', 'Situação']}
        vazio=${filtro === 'repor' ? 'Nenhum produto precisa de reposição.' : filtro === 'zerados' ? 'Nenhum produto sem estoque.' : 'Nenhum produto encontrado.'}
        rodape=${html`<tfoot><tr><td colSpan="5">${plural(lista.length, 'produto', 'produtos')} na lista</td><td className="nowrap"><b>${D.moedaBR(somaValor(lista.filter(p => p.controlaEstoque)))}</b></td><td colSpan="2"></td></tr></tfoot>`}>
        ${lista.map(p => html`<tr key=${p.id} className=${p.ativo ? '' : 'rest-inativo'}>
          <td className="nowrap rest-cod">${p.codigo}</td>
          <td>${p.controlaEstoque
            ? html`<button type="button" className="rest-link" title="Ver movimentações" onClick=${() => ir('estoque/movimentos', {p: p.id})}>${p.nome}</button>`
            : html`<b>${p.nome}</b>`}<small className="history-date">${D.grupoPorId(p.grupoId)?.nome || '—'}</small></td>
          ${p.controlaEstoque ? html`
            <td className="nowrap"><b className=${D.estoqueBaixo(p) ? 'rest-est-alerta' : ''}>${D.qtdBR(p.estoque)}</b> <small className="rest-cod">${p.unidade}</small></td>
            <td className="nowrap">${p.estoqueMinimo ? `${D.qtdBR(p.estoqueMinimo)} ${p.unidade}` : html`<span className="rest-cod">—</span>`}</td>
            <td className="nowrap">${p.custo ? D.moedaBR(p.custo) : html`<span className="rest-cod">—</span>`}</td>
            <td className="nowrap">${p.custo ? D.moedaBR(valorEstoque(p)) : html`<span className="rest-cod">—</span>`}</td>`
          : html`<td colSpan="4" className="rest-cod">—</td>`}
          <td className="nowrap"><${Situacao} p=${p} /></td>
          <td>${p.controlaEstoque
            ? html`<${Acoes} nome=${'estoque de ' + p.nome} onEditar=${() => configurar(p)}>
                <button type="button" className="rest-acao-baixa" onClick=${() => abrir('ENTRADA', p)}>Entrada</button>
                <button type="button" className="rest-acao-estorno" onClick=${() => abrir('SAIDA', p)}>Saída</button>
                <button type="button" className="rest-acao-estorno" onClick=${() => abrir('AJUSTE', p)} title="Informar a quantidade contada">Ajuste</button>
              <//>`
            : html`<${Acoes} nome=${p.nome}><button type="button" className="rest-acao-estorno" onClick=${() => configurar(p, true)}>Controlar</button><//>`}</td>
        </tr>`)}
      <//>
      ${mov && html`<${JanelaMovimento} inicial=${mov} onFechar=${() => setMov(null)} aviso=${aviso} tentar=${tentar} />`}
      ${config && html`<${JanelaConfig} inicial=${config} onFechar=${() => setConfig(null)} aviso=${aviso} tentar=${tentar} />`}`;
  }

  // ---- Movimentações ----
  const PERIODOS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['tudo', 'Tudo']];
  const LIMITE = 300; // linhas mostradas de uma vez
  const BADGE = {ENTRADA: 'b-ok', SAIDA: 'rest-b-vencida', AJUSTE: 'rest-b-aberta', VENDA: 'rest-b-venda', ESTORNO: 'b-wait'};
  function TelaMovimentos({params, ir}){
    useDados();
    const [periodo, setPeriodo] = useState(params.p ? 'tudo' : 'mes');
    const [tipo, setTipo] = useState('');
    const [produtoId, setProdutoId] = useState(params.p || '');
    const [busca, setBusca] = useState('');
    const hoje = D.hojeISO();
    const seteDias = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return D.diaISO(d); })();
    const desde = {hoje, '7d': seteDias, mes: hoje.slice(0, 8) + '01', tudo: ''}[periodo];
    const todos = D.movEstoque();
    const comMov = new Set(todos.map(m => m.produtoId));
    const produtos = D.produtos().filter(p => p.controlaEstoque || comMov.has(p.id)).sort(porNome);
    const b = D.norm(busca);
    const nomeDe = m => D.produtoPorId(m.produtoId)?.nome || m.produto;
    const lista = todos.filter(m => (!desde || D.diaISO(new Date(m.data)) >= desde) && (!tipo || m.tipo === tipo) && (!produtoId || m.produtoId === produtoId))
      .filter(m => !busca || D.norm([nomeDe(m), m.motivo, m.usuario].join(' ')).includes(b))
      .reverse();
    const dataHora = iso => new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'});
    return html`
      <${Cabecalho} titulo="Movimentações do estoque" sub=${`${plural(lista.length, 'movimento', 'movimentos')} no filtro · entradas, saídas, ajustes e vendas`}>
        <button type="button" className="btn btn-ghost" onClick=${() => ir('estoque')}>Posição do estoque</button>
      <//>
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Período" opcoes=${PERIODOS} valor=${periodo} onChange=${setPeriodo} />
        <select className="rest-select" value=${tipo} onChange=${e => setTipo(e.target.value)} aria-label="Tipo de movimento">
          <option value="">Todos os tipos</option>
          ${Object.entries(D.TIPOS_MOV_ESTOQUE).map(([k, n]) => html`<option key=${k} value=${k}>${n}</option>`)}
        </select>
        <select className="rest-select" value=${produtoId} onChange=${e => setProdutoId(e.target.value)} aria-label="Produto">
          <option value="">Todos os produtos</option>
          ${produtos.map(p => html`<option key=${p.id} value=${p.id}>${p.nome}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar produto, motivo ou usuário..." />
      </div>
      <${Tabela} colunas=${['Data', 'Produto', 'Movimento', 'Quantidade', 'Saldo', 'Custo unit.', 'Detalhe']}
        vazio=${todos.length ? 'Nenhum movimento com esse filtro.' : 'Nenhum movimento ainda. Faça uma entrada de mercadoria ou finalize uma venda de produto controlado.'}
        rodape=${lista.length > LIMITE ? html`<tfoot><tr><td colSpan="8">Mostrando os ${LIMITE} mais recentes de ${lista.length}. Use os filtros para ver os demais.</td></tr></tfoot>` : null}>
        ${lista.slice(0, LIMITE).map(m => html`<tr key=${m.id}>
          <td className="nowrap">${dataHora(m.data)}</td>
          <td><b>${nomeDe(m)}</b></td>
          <td><span className=${'badge ' + BADGE[m.tipo]}>${D.TIPOS_MOV_ESTOQUE[m.tipo]}</span></td>
          <td className=${'nowrap ' + (m.quantidade > 0 ? 'mov-pos' : 'mov-neg')}><b>${m.quantidade > 0 ? '+' : '−'}${D.qtdBR(Math.abs(m.quantidade))}</b> <small>${m.unidade}</small></td>
          <td className="nowrap">${D.qtdBR(m.saldo)} <small className="rest-cod">${m.unidade}</small></td>
          <td className="nowrap">${m.custoUnitario ? D.moedaBR(m.custoUnitario) : html`<span className="rest-cod">—</span>`}</td>
          <td>${m.motivo || html`<span className="rest-cod">—</span>`}<small className="history-date">${m.usuario}</small></td>
          <td></td>
        </tr>`)}
      <//>`;
  }

  Object.assign(window.RestUI.telas, {estoque: TelaPosicao, 'estoque/movimentos': TelaMovimentos});
})();
