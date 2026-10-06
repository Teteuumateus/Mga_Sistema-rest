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
              <${Campo} rotulo="Fornecedor (opcional)">
                <select value=${f.fornecedorId} onChange=${set('fornecedorId')}>
                  <option value="">—</option>
                  ${D.fornecedores().filter(x => x.ativo).sort(porNome).map(x => html`<option key=${x.id} value=${x.id}>${x.nome}</option>`)}
                </select>
              <//>
              <${Campo} rotulo="Nota fiscal / observação (opcional)"><input type="text" value=${f.documento} maxLength="80" placeholder="Ex.: NF 1234" onInput=${set('documento')} /><//>`}
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

  // ---- Compra: nota do fornecedor com vários itens e, se quiser, uma conta a pagar ----
  const linhaCompra = () => ({key: 'k' + Math.random().toString(36).slice(2, 9), produtoId: '', quantidade: '', custo: ''});
  // Lista todos os produtos ativos do cadastro; o que ainda não controla estoque passa a controlar
  function JanelaCompra({onFechar, aviso, tentar, ir}){
    const [f, setF] = useState({fornecedorId: '', documento: '', conta: false, vencimento: D.hojeISO(), itens: [linhaCompra()]});
    const ativos = D.produtos().filter(p => p.ativo).sort(porNome);
    const controlados = ativos.filter(p => p.controlaEstoque), semControle = ativos.filter(p => !p.controlaEstoque);
    const opcao = x => html`<option key=${x.id} value=${x.id}>${x.codigo} · ${x.nome}${x.tipo === 'INSUMO' ? ' (insumo)' : ''}</option>`;
    const mudar = (key, k, v) => setF(x => ({...x, itens: x.itens.map(i => {
      if (i.key !== key) return i;
      const novo = {...i, [k]: v};
      // Ao escolher o produto, sugere o último custo (também ao trocar, se o custo ainda era o sugerido)
      const sugerido = id => { const p = D.produtoPorId(id); return p?.custo ? D.valorBR(p.custo) : ''; };
      if (k === 'produtoId' && (!i.custo || i.custo === sugerido(i.produtoId))) novo.custo = sugerido(v);
      return novo;
    })}));
    const total = f.itens.filter(i => i.produtoId).reduce((s, i) => s + (D.lerValor(i.quantidade) || 0) * (D.lerValor(i.custo) || 0), 0);
    const podeConta = D.podeAcessar('financeiro');
    const confirmar = () => {
      if (f.itens.some(i => !i.produtoId && (String(i.quantidade).trim() || String(i.custo).trim()))) return tentar(() => { throw Object.assign(new Error('Escolha o produto de cada linha (ou tire a linha com ✕).'), {regra: true}); });
      if (tentar(() => D.compraEstoque({...f, conta: podeConta && f.conta ? {vencimento: f.vencimento} : null, ligarControle: true}),
        r => `Compra registrada: ${plural(r.itens, 'item', 'itens')}, ${D.moedaBR(r.total)}${podeConta && f.conta ? ' · conta a pagar lançada' : ''}.`)) onFechar();
    };
    return html`
      <${Modal} titulo="Entrada de estoque" onFechar=${onFechar}>
        <form className="rest-compra" onSubmit=${e => { e.preventDefault(); confirmar(); }}>
          <p className="dv-ajuda">Só entra no estoque o que está cadastrado em Cadastros › Produtos.${ir ? html` <button type="button" className="rest-link" onClick=${() => { onFechar(); ir('cad/produtos'); }}>Cadastrar produto</button>` : null}</p>
          <div className="form-grid">
            <${Campo} rotulo="Fornecedor (opcional)">
              <select value=${f.fornecedorId} onChange=${e => setF({...f, fornecedorId: e.target.value})}>
                <option value="">—</option>${D.fornecedores().filter(x => x.ativo).sort(porNome).map(x => html`<option key=${x.id} value=${x.id}>${x.nome}</option>`)}
              </select>
            <//>
            <${Campo} rotulo="Nota fiscal / observação"><input type="text" maxLength="80" value=${f.documento} placeholder="Ex.: NF 1234" onInput=${e => setF({...f, documento: e.target.value})} /><//>
          </div>
          <div className="rest-compra-cab"><span>Produto</span><span>Quantidade</span><span>Custo unit. (R$)</span><span>Total</span><span></span></div>
          ${f.itens.map(i => {
            const p = D.produtoPorId(i.produtoId);
            return html`<div key=${i.key} className="rest-linha-edit rest-compra-linha">
              <select value=${i.produtoId} aria-label="Produto" onChange=${e => mudar(i.key, 'produtoId', e.target.value)}>
                <option value="">Escolha...</option>
                ${controlados.length > 0 && html`<optgroup label="Controlam estoque">${controlados.map(opcao)}</optgroup>`}
                ${semControle.length > 0 && html`<optgroup label="Ainda não controlam (passam a controlar)">${semControle.map(opcao)}</optgroup>`}
              </select>
              <input type="text" inputMode="decimal" value=${i.quantidade} placeholder=${p ? p.unidade : 'Qtd'} aria-label="Quantidade" onInput=${e => mudar(i.key, 'quantidade', e.target.value)} />
              <input type="text" inputMode="decimal" value=${i.custo} placeholder="0,00" aria-label="Custo unitário" onInput=${e => mudar(i.key, 'custo', e.target.value)} />
              <b className="rest-num">${D.moedaBR((D.lerValor(i.quantidade) || 0) * (D.lerValor(i.custo) || 0))}</b>
              <button type="button" className="rest-car-rm" aria-label="Tirar item" disabled=${f.itens.length === 1} onClick=${() => setF(x => ({...x, itens: x.itens.filter(y => y.key !== i.key)}))}>✕</button>
              ${p && !p.controlaEstoque && html`<small className="rest-compra-aviso">"${p.nome}" passa a controlar estoque: ${(p.ficha || []).length
                ? 'a venda vai baixar o próprio produto, não mais os insumos da ficha técnica.' : 'a venda vai baixar o saldo dele.'}</small>`}
            </div>`;
          })}
          <button type="button" className="rest-link" onClick=${() => setF(x => ({...x, itens: [...x.itens, linhaCompra()]}))}>+ Adicionar item</button>
          <p className="rest-est-previa">Total da compra: <b>${D.moedaBR(total)}</b> · o custo médio de cada produto é atualizado.</p>
          ${podeConta && html`
            <label className="rest-check rest-no-caixa"><input type="checkbox" checked=${f.conta} onChange=${e => setF({...f, conta: e.target.checked})} /> Lançar uma conta a pagar com o total</label>
            ${f.conta && html`<div className="form-grid"><${Campo} rotulo="Vencimento"><input type="date" value=${f.vencimento} onChange=${e => setF({...f, vencimento: e.target.value})} /><//></div>`}`}
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
            <button type="submit" className="btn">Confirmar entrada</button>
          </div>
        </form>
      <//>`;
  }

  // ---- Produção: faz o produto pela ficha técnica (sai insumo, entra produto) ----
  function JanelaProducao({produtoId, onFechar, aviso, tentar}){
    const [qtd, setQtd] = useState('');
    const [obs, setObs] = useState('');
    const p = D.produtoPorId(produtoId);
    const n = D.lerValor(qtd) || 0;
    const confirmar = () => { if (tentar(() => D.produzir({produtoId, quantidade: qtd, obs}), m => `Produzido ${D.qtdBR(m.quantidade)} ${m.unidade} de "${m.produto}". Saldo: ${D.qtdBR(m.saldo)}.`)) onFechar(); };
    return html`
      <${Modal} titulo=${`Produzir · ${p.nome}`} onFechar=${onFechar}>
        <form onSubmit=${e => { e.preventDefault(); confirmar(); }}>
          <div className="form-grid">
            <${Campo} rotulo=${`Quantidade a produzir (${p.unidade})`}><input type="text" inputMode="decimal" value=${qtd} placeholder="0" onInput=${e => setQtd(e.target.value)} /><//>
            <${Campo} rotulo="Observação (opcional)"><input type="text" maxLength="80" value=${obs} placeholder="Ex.: lote da manhã" onInput=${e => setObs(e.target.value)} /><//>
          </div>
          <table className="rest-producao-tab"><thead><tr><th>Insumo</th><th className="rest-num">Usa</th><th className="rest-num">Tem</th></tr></thead>
            <tbody>${p.ficha.map(c => {
              const ins = D.produtoPorId(c.produtoId), usa = c.quantidade * n, falta = ins && ins.controlaEstoque && usa > ins.estoque + 0.0001;
              return html`<tr key=${c.produtoId}><td>${ins?.nome || '?'}</td><td className=${'rest-num' + (falta ? ' mov-neg' : '')}>${D.qtdBR(usa)} ${ins?.unidade || ''}</td><td className="rest-num">${ins?.controlaEstoque ? `${D.qtdBR(ins.estoque)} ${ins.unidade}` : 'sem controle'}</td></tr>`;
            })}</tbody></table>
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
            <button type="submit" className="btn">Produzir</button>
          </div>
        </form>
      <//>`;
  }

  // ---- Zerar estoque (todos ou por categoria), com motivo ----
  function JanelaZerar({onFechar, aviso, tentar}){
    const [f, setF] = useState({grupoId: '', motivo: ''});
    const alvo = D.produtos().filter(p => p.controlaEstoque && Number(p.estoque) !== 0 && (!f.grupoId || p.grupoId === f.grupoId));
    const confirmar = () => {
      if (!window.confirm(`Zerar o estoque de ${plural(alvo.length, 'produto', 'produtos')}? Cada um ganha um ajuste no histórico.`)) return;
      if (tentar(() => D.zerarEstoque(f), n => `Estoque zerado em ${plural(n, 'produto', 'produtos')}.`)) onFechar();
    };
    return html`
      <${Modal} titulo="Zerar estoque" onFechar=${onFechar}>
        <p className="dv-ajuda">Deixa o saldo em zero (por exemplo, antes de um inventário completo). Fica tudo registrado nas movimentações.</p>
        <div className="form-grid">
          <${Campo} rotulo="Categoria">
            <select value=${f.grupoId} onChange=${e => setF({...f, grupoId: e.target.value})}><option value="">Todas</option>${D.grupos().map(g => html`<option key=${g.id} value=${g.id}>${g.nome}</option>`)}</select>
          <//>
          <${Campo} rotulo="Motivo"><input type="text" maxLength="80" value=${f.motivo} placeholder="Ex.: inventário anual" onInput=${e => setF({...f, motivo: e.target.value})} /><//>
        </div>
        <p className="rest-est-previa">${plural(alvo.length, 'produto com saldo', 'produtos com saldo')} ${f.grupoId ? 'nesta categoria' : 'no total'}.</p>
        ${aviso}
        <div className="cf-acoes">
          <button type="button" className="btn btn-ghost" onClick=${onFechar}>Cancelar</button>
          <button type="button" className="btn btn-perigo" disabled=${!alvo.length} onClick=${confirmar}>Zerar estoque</button>
        </div>
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
    const [janela, setJanela] = useState(null); // {tipo: 'compra' | 'zerar' | 'producao', produtoId}
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
    const abrir = (tipo, p) => setMov({tipo, produtoId: p?.id || '', quantidade: '', custo: p?.custo ? D.valorBR(p.custo) : '', documento: '', fornecedorId: '', motivo: '',
      conta: false, vencimento: D.hojeISO()});
    const configurar = (p, controla = p.controlaEstoque) => setConfig({produtoId: p.id, controla, minimo: p.estoqueMinimo ? D.qtdBR(p.estoqueMinimo) : ''});

    const kpi = (rotulo, n, sub, alerta, f) => html`
      <button type="button" className=${'rest-kpi-mini' + (alerta && n ? ' hv-alerta' : '') + (filtro === f ? ' ativo' : '')} onClick=${() => setFiltro(f)} aria-pressed=${filtro === f}>
        <span>${rotulo}</span><b>${n}</b><small>${sub}</small>
      </button>`;
    return html`
      <${Cabecalho} titulo="Posição do estoque" sub="A venda finalizada baixa o estoque sozinha; a venda cancelada devolve">
        <button type="button" className="btn btn-ghost" onClick=${() => ir('estoque/movimentos')}>Movimentações</button>
        <button type="button" className="btn btn-ghost" onClick=${() => setJanela({tipo: 'zerar'})} disabled=${!controlados.length}>Zerar estoque</button>
        <button type="button" className="btn" onClick=${() => setJanela({tipo: 'compra'})} title="Nota com um ou vários itens">+ Entrada</button>
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
                ${(p.ficha || []).length > 0 && html`<button type="button" className="rest-acao-estorno" onClick=${() => setJanela({tipo: 'producao', produtoId: p.id})} title="Produzir pela ficha técnica">Produzir</button>`}
              <//>`
            : html`<${Acoes} nome=${p.nome}><button type="button" className="rest-acao-estorno" onClick=${() => configurar(p, true)}>Controlar</button><//>`}</td>
        </tr>`)}
      <//>
      ${mov && html`<${JanelaMovimento} inicial=${mov} onFechar=${() => setMov(null)} aviso=${aviso} tentar=${tentar} />`}
      ${config && html`<${JanelaConfig} inicial=${config} onFechar=${() => setConfig(null)} aviso=${aviso} tentar=${tentar} />`}
      ${janela?.tipo === 'compra' && html`<${JanelaCompra} onFechar=${() => setJanela(null)} aviso=${aviso} tentar=${tentar} ir=${ir} />`}
      ${janela?.tipo === 'zerar' && html`<${JanelaZerar} onFechar=${() => setJanela(null)} aviso=${aviso} tentar=${tentar} />`}
      ${janela?.tipo === 'producao' && html`<${JanelaProducao} produtoId=${janela.produtoId} onFechar=${() => setJanela(null)} aviso=${aviso} tentar=${tentar} />`}`;
  }

  // ---- Movimentações ----
  const PERIODOS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['tudo', 'Tudo']];
  const LIMITE = 300; // linhas mostradas de uma vez
  const BADGE = {ENTRADA: 'b-ok', SAIDA: 'rest-b-vencida', AJUSTE: 'rest-b-aberta', VENDA: 'rest-b-venda', ESTORNO: 'b-wait', PRODUCAO: 'rest-b-producao'};
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

  // =====================================================================
  // ---- Entradas, saídas e dashboard do estoque (a partir das movimentações) ----
  // Entrada: compra, estoque inicial e o que a produção fez. Saída: venda (baixa automática ao
  // finalizar; venda cancelada devolve), saída manual (perda, consumo...) e insumo usado na produção.
  const ehEntrada = m => m.quantidade > 0 && (m.tipo === 'ENTRADA' || m.tipo === 'PRODUCAO');
  const ehSaida = m => ['VENDA', 'ESTORNO', 'SAIDA'].includes(m.tipo) || (m.tipo === 'PRODUCAO' && m.quantidade < 0);
  const origemEntrada = m => m.tipo === 'PRODUCAO' ? 'Produção' : m.motivo === 'Estoque inicial' ? 'Estoque inicial' : 'Compra';
  const ORIGENS_SAIDA = [['', 'Todas as saídas'], ['VENDA', 'Vendas'], ['SAIDA', 'Saídas manuais'], ['PRODUCAO', 'Usado na produção']];
  const origemSaida = m => m.tipo === 'ESTORNO' ? 'VENDA' : m.tipo; // venda cancelada abate das vendas
  const NOME_ORIGEM = {VENDA: 'Venda', ESTORNO: 'Venda cancelada', SAIDA: 'Saída manual', PRODUCAO: 'Usado na produção'};
  const BADGE_ORIGEM = {Compra: 'b-ok', 'Estoque inicial': 'rest-b-aberta', 'Produção': 'rest-b-producao', VENDA: 'rest-b-venda', ESTORNO: 'b-wait', SAIDA: 'rest-b-vencida', PRODUCAO: 'rest-b-producao'};
  const r3 = v => Math.round(v * 1000) / 1000;
  const dataHora = iso => new Date(iso).toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'});
  const Qtd = ({q, u, sinal}) => html`<span className="nowrap">${sinal && q ? (q > 0 ? '+' : '−') : ''}${D.qtdBR(sinal ? Math.abs(q) : q)} <small className="rest-cod">${u}</small></span>`;
  const Traco = () => html`<span className="rest-cod">—</span>`;
  const custoAtual = m => D.produtoPorId(m.produtoId)?.custo || 0;
  const nomeMov = m => D.produtoPorId(m.produtoId)?.nome || m.produto;

  // ---- Período (lembrado enquanto o sistema está aberto) ----
  const ATALHOS = [['hoje', 'Hoje'], ['7d', '7 dias'], ['mes', 'Este mês'], ['mesPassado', 'Mês passado'], ['tudo', 'Tudo']];
  function datasDo(a){
    const h = new Date(), iso = D.diaISO, dia = n => { const d = new Date(h); d.setDate(d.getDate() + n); return d; };
    return {hoje: {de: iso(h), ate: iso(h)}, '7d': {de: iso(dia(-6)), ate: iso(h)}, mes: {de: iso(new Date(h.getFullYear(), h.getMonth(), 1)), ate: iso(h)},
      mesPassado: {de: iso(new Date(h.getFullYear(), h.getMonth() - 1, 1)), ate: iso(new Date(h.getFullYear(), h.getMonth(), 0))}, tudo: {de: '', ate: iso(h)}}[a];
  }
  let periodoGuardado = {atalho: 'mes', ...datasDo('mes')};
  function usePeriodo(){
    const [f, setF] = useState(() => periodoGuardado.atalho ? (periodoGuardado = {...periodoGuardado, ...datasDo(periodoGuardado.atalho)}) : periodoGuardado);
    return [f, novo => { periodoGuardado = {...f, ...novo}; setF(periodoGuardado); }];
  }
  const noPeriodo = f => m => { const d = D.diaISO(new Date(m.data)); return (!f.de || d >= f.de) && (!f.ate || d <= f.ate); };
  const periodoBR = f => !f.de ? 'Todo o período' : f.de === f.ate ? D.dataBR(f.de) : `${D.dataBR(f.de)} a ${D.dataBR(f.ate)}`;
  function FiltroPeriodo({f, setF, children}){
    const data = k => e => {
      const v = e.target.value;
      if (k === 'ate' && !v) return;
      setF({atalho: '', [k]: v, ...(k === 'de' && v && v > f.ate ? {ate: v} : {}), ...(k === 'ate' && f.de && v < f.de ? {de: v} : {})});
    };
    return html`
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Período" opcoes=${ATALHOS} valor=${f.atalho} onChange=${a => setF({atalho: a, ...datasDo(a)})} />
        <span className="rest-rel-datas">
          <input type="date" className="rest-select" value=${f.de} max=${D.hojeISO()} onChange=${data('de')} aria-label="De" />
          <span>a</span>
          <input type="date" className="rest-select" value=${f.ate} max=${D.hojeISO()} onChange=${data('ate')} aria-label="Até" />
        </span>
        ${children}
      </div>`;
  }
  const novaSaida = () => ({tipo: 'SAIDA', produtoId: '', quantidade: '', custo: '', documento: '', fornecedorId: '', motivo: '', conta: false, vencimento: D.hojeISO()});
  const BotoesEstoque = ({ir, atual}) => [['estoque/dashboard', 'Dashboard'], ['estoque/entradas', 'Entradas'], ['estoque/saidas', 'Saídas'], ['estoque', 'Posição']]
    .filter(([r]) => r !== atual).map(([r, n]) => html`<button key=${r} type="button" className="btn btn-ghost" onClick=${() => ir(r)}>${n}</button>`);

  // ---- 1. Entrada de estoque ----
  function TelaEntradas({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [f, setF] = usePeriodo();
    const [produtoId, setProdutoId] = useState('');
    const [busca, setBusca] = useState('');
    const [nova, setNova] = useState(false);
    const todas = D.movEstoque().filter(ehEntrada);
    const b = D.norm(busca);
    const lista = todas.filter(noPeriodo(f)).filter(m => !produtoId || m.produtoId === produtoId)
      .filter(m => !busca || D.norm([nomeMov(m), m.motivo, m.usuario, origemEntrada(m)].join(' ')).includes(b)).reverse();
    const comEntrada = new Set(todas.map(m => m.produtoId));
    const produtos = D.produtos().filter(p => comEntrada.has(p.id)).sort(porNome);
    const valor = m => m.quantidade * (m.custoUnitario || 0);
    const total = lista.reduce((s, m) => s + valor(m), 0);
    const detalhe = m => m.tipo === 'PRODUCAO' || ['Estoque inicial', 'Compra'].includes(m.motivo) ? '' : m.motivo;
    return html`
      <${Cabecalho} titulo="Entrada de estoque" sub=${`${periodoBR(f)} · compras, estoque inicial e produção`}>
        <${BotoesEstoque} ir=${ir} atual="estoque/entradas" />
        <button type="button" className="btn" onClick=${() => setNova(true)}>+ Nova entrada</button>
      <//>
      ${!nova && aviso}
      <div className="rest-kpis-mini">
        <div className="rest-kpi-mini"><span>Entradas</span><b>${lista.length}</b><small>${plural(new Set(lista.map(m => m.produtoId)).size, 'produto', 'produtos')}</small></div>
        <div className="rest-kpi-mini"><span>Valor das entradas</span><b>${D.moedaBR(total)}</b><small>quantidade × custo da nota</small></div>
        <div className="rest-kpi-mini"><span>Compras</span><b>${lista.filter(m => origemEntrada(m) === 'Compra').length}</b><small>itens de nota lançados</small></div>
        <div className="rest-kpi-mini"><span>Produção</span><b>${lista.filter(m => m.tipo === 'PRODUCAO').length}</b><small>feitos pela ficha técnica</small></div>
      </div>
      <${FiltroPeriodo} f=${f} setF=${setF}>
        <select className="rest-select" value=${produtoId} onChange=${e => setProdutoId(e.target.value)} aria-label="Produto">
          <option value="">Todos os produtos</option>${produtos.map(p => html`<option key=${p.id} value=${p.id}>${p.nome}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar produto, fornecedor, nota..." />
      <//>
      <${Tabela} colunas=${['Data', 'Produto', 'Origem', 'Quantidade', 'Custo unit.', 'Total', 'Fornecedor / nota']}
        vazio=${todas.length ? 'Nenhuma entrada com esse filtro.' : 'Nenhuma entrada ainda. Clique em "+ Nova entrada" e escolha os produtos do cadastro.'}
        rodape=${lista.length ? html`<tfoot><tr><td colSpan="5">${plural(lista.length, 'entrada', 'entradas')}${lista.length > LIMITE ? ` · mostrando as ${LIMITE} mais recentes` : ''}</td>
          <td className="nowrap"><b>${D.moedaBR(total)}</b></td><td colSpan="2"></td></tr></tfoot>` : null}>
        ${lista.slice(0, LIMITE).map(m => html`<tr key=${m.id}>
          <td className="nowrap">${dataHora(m.data)}</td>
          <td><b>${nomeMov(m)}</b></td>
          <td><span className=${'badge ' + BADGE_ORIGEM[origemEntrada(m)]}>${origemEntrada(m)}</span></td>
          <td className="mov-pos"><b><${Qtd} q=${m.quantidade} u=${m.unidade} sinal /></b></td>
          <td className="nowrap">${m.custoUnitario ? D.moedaBR(m.custoUnitario) : html`<${Traco} />`}</td>
          <td className="nowrap">${m.custoUnitario ? D.moedaBR(valor(m)) : html`<${Traco} />`}</td>
          <td>${detalhe(m) || html`<${Traco} />`}<small className="history-date">${m.usuario}</small></td>
          <td></td>
        </tr>`)}
      <//>
      ${nova && html`<${JanelaCompra} onFechar=${() => setNova(false)} aviso=${aviso} tentar=${tentar} ir=${ir} />`}`;
  }

  // ---- 2. Saída de estoque ----
  function TelaSaidas({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [f, setF] = usePeriodo();
    const [origem, setOrigem] = useState('');
    const [ver, setVer] = useState('detalhe');
    const [busca, setBusca] = useState('');
    const [mov, setMov] = useState(null);
    const todas = D.movEstoque().filter(ehSaida);
    const b = D.norm(busca);
    const lista = todas.filter(noPeriodo(f)).filter(m => !origem || origemSaida(m) === origem)
      .filter(m => !busca || D.norm([nomeMov(m), m.motivo, m.usuario].join(' ')).includes(b)).reverse();
    // Quanto saiu (positivo); a venda cancelada devolve e por isso abate
    const saiu = m => -m.quantidade;
    const custo = lista.reduce((s, m) => s + saiu(m) * custoAtual(m), 0);
    const custoDe = o => lista.filter(m => origemSaida(m) === o).reduce((s, m) => s + saiu(m) * custoAtual(m), 0);
    const porProduto = Object.values(lista.reduce((acc, m) => {
      const l = acc[m.produtoId] || (acc[m.produtoId] = {id: m.produtoId, nome: nomeMov(m), unidade: m.unidade, VENDA: 0, SAIDA: 0, PRODUCAO: 0, total: 0, custo: 0});
      l[origemSaida(m)] = r3(l[origemSaida(m)] + saiu(m)); l.total = r3(l.total + saiu(m)); l.custo += saiu(m) * custoAtual(m);
      return acc;
    }, {})).sort((x, y) => y.custo - x.custo || y.total - x.total);
    const qtdOu = (q, u) => q ? html`<${Qtd} q=${q} u=${u} />` : html`<${Traco} />`;
    return html`
      <${Cabecalho} titulo="Saída de estoque" sub=${`${periodoBR(f)} · a venda finalizada baixa o estoque sozinha; a cancelada devolve`}>
        <${BotoesEstoque} ir=${ir} atual="estoque/saidas" />
        <button type="button" className="btn" onClick=${() => setMov(novaSaida())} title="Perda, produto vencido, consumo interno...">+ Saída manual</button>
      <//>
      ${!mov && aviso}
      <div className="rest-kpis-mini">
        <div className="rest-kpi-mini"><span>Custo das saídas</span><b>${D.moedaBR(custo)}</b><small>pelo custo médio atual</small></div>
        <div className="rest-kpi-mini"><span>Vendas</span><b>${D.moedaBR(custoDe('VENDA'))}</b><small>${plural(lista.filter(m => m.tipo === 'VENDA').length, 'baixa automática', 'baixas automáticas')}</small></div>
        <div className=${'rest-kpi-mini' + (custoDe('SAIDA') > 0 ? ' hv-alerta' : '')}><span>Saídas manuais</span><b>${D.moedaBR(custoDe('SAIDA'))}</b><small>perdas, vencidos, consumo...</small></div>
        <div className="rest-kpi-mini"><span>Usado na produção</span><b>${D.moedaBR(custoDe('PRODUCAO'))}</b><small>insumos da ficha técnica</small></div>
      </div>
      <${FiltroPeriodo} f=${f} setF=${setF}>
        <select className="rest-select" value=${origem} onChange=${e => setOrigem(e.target.value)} aria-label="Origem">
          ${ORIGENS_SAIDA.map(([k, n]) => html`<option key=${k} value=${k}>${n}</option>`)}
        </select>
        <${Segmentos} rotulo="Ver" opcoes=${[['detalhe', 'Detalhado'], ['produto', 'Por produto']]} valor=${ver} onChange=${setVer} />
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar produto, venda, motivo..." />
      <//>
      ${ver === 'produto' ? html`
        <${Tabela} colunas=${['Produto', 'Vendido', 'Saídas manuais', 'Usado na produção', 'Total que saiu', 'Custo', 'Saldo atual']} vazio="Nenhuma saída com esse filtro."
          rodape=${porProduto.length ? html`<tfoot><tr><td colSpan="5">${plural(porProduto.length, 'produto', 'produtos')}</td><td className="nowrap"><b>${D.moedaBR(custo)}</b></td><td colSpan="2"></td></tr></tfoot>` : null}>
          ${porProduto.map(l => { const p = D.produtoPorId(l.id); return html`<tr key=${l.id}>
            <td><button type="button" className="rest-link" title="Ver movimentações" onClick=${() => ir('estoque/movimentos', {p: l.id})}>${l.nome}</button></td>
            <td>${qtdOu(l.VENDA, l.unidade)}</td>
            <td>${qtdOu(l.SAIDA, l.unidade)}</td>
            <td>${qtdOu(l.PRODUCAO, l.unidade)}</td>
            <td className="mov-neg"><b><${Qtd} q=${l.total} u=${l.unidade} /></b></td>
            <td className="nowrap">${D.moedaBR(l.custo)}</td>
            <td>${p?.controlaEstoque ? html`<${Qtd} q=${p.estoque} u=${p.unidade} />` : html`<${Traco} />`}</td>
            <td></td>
          </tr>`; })}
        <//>`
      : html`
        <${Tabela} colunas=${['Data', 'Produto', 'Origem', 'Quantidade', 'Custo', 'Venda / motivo']}
          vazio=${todas.length ? 'Nenhuma saída com esse filtro.' : 'Nenhuma saída ainda. Ao finalizar uma venda de produto que controla estoque, a baixa aparece aqui.'}
          rodape=${lista.length > LIMITE ? html`<tfoot><tr><td colSpan="7">Mostrando as ${LIMITE} mais recentes de ${lista.length}. Use os filtros para ver as demais.</td></tr></tfoot>` : null}>
          ${lista.slice(0, LIMITE).map(m => html`<tr key=${m.id}>
            <td className="nowrap">${dataHora(m.data)}</td>
            <td><b>${nomeMov(m)}</b></td>
            <td><span className=${'badge ' + BADGE_ORIGEM[m.tipo]}>${NOME_ORIGEM[m.tipo]}</span></td>
            <td className=${m.quantidade < 0 ? 'mov-neg' : 'mov-pos'}><b><${Qtd} q=${m.quantidade} u=${m.unidade} sinal /></b></td>
            <td className="nowrap">${custoAtual(m) ? (saiu(m) < 0 ? '− ' : '') + D.moedaBR(Math.abs(saiu(m) * custoAtual(m))) : html`<${Traco} />`}</td>
            <td>${m.motivo || html`<${Traco} />`}<small className="history-date">${m.usuario}</small></td>
            <td></td>
          </tr>`)}
        <//>`}
      ${mov && html`<${JanelaMovimento} inicial=${mov} onFechar=${() => setMov(null)} aviso=${aviso} tentar=${tentar} />`}`;
  }

  // ---- 3. Dashboard do estoque: o que entrou, o que saiu e o saldo ----
  // Saldo de um produto ao fim de um dia: o saldo do último movimento até lá (movimentos em ordem)
  function saldoAte(movs, p, dia){
    if (!movs.length) return Number(p.estoque) || 0;
    let saldo = 0;
    for (const m of movs) { if (D.diaISO(new Date(m.data)) > dia) break; saldo = m.saldo; }
    return saldo;
  }
  function TelaDashEstoque({ir}){
    useDados();
    const [f, setF] = usePeriodo();
    const [grupo, setGrupo] = useState('');
    const [busca, setBusca] = useState('');
    const movsDe = D.movEstoque().reduce((acc, m) => { (acc[m.produtoId] = acc[m.produtoId] || []).push(m); return acc; }, {});
    const naData = noPeriodo(f);
    const vespera = f.de ? (() => { const d = new Date(f.de + 'T12:00:00'); d.setDate(d.getDate() - 1); return D.diaISO(d); })() : null;
    const produtos = D.produtos().filter(p => p.controlaEstoque || movsDe[p.id]);
    const linhas = produtos.map(p => {
      const movs = movsDe[p.id] || [], doPeriodo = movs.filter(naData);
      const soma = fn => r3(doPeriodo.filter(fn).reduce((s, m) => s + m.quantidade, 0));
      const entradas = soma(ehEntrada), saidas = -soma(ehSaida), ajustes = soma(m => m.tipo === 'AJUSTE');
      return {p, entradas, saidas, ajustes, mexeu: doPeriodo.length > 0,
        valorEntradas: doPeriodo.filter(ehEntrada).reduce((s, m) => s + m.quantidade * (m.custoUnitario || p.custo || 0), 0), valorSaidas: saidas * (p.custo || 0),
        inicial: vespera ? saldoAte(movs, p, vespera) : 0, final: saldoAte(movs, p, f.ate)};
    });
    const b = D.norm(busca);
    const visiveis = linhas.filter(l => !grupo || l.p.grupoId === grupo).filter(l => !busca || D.norm(l.p.nome + ' ' + l.p.codigo).includes(b))
      .sort((x, y) => (y.mexeu - x.mexeu) || y.valorSaidas - x.valorSaidas || porNome(x.p, y.p));
    const tot = k => linhas.reduce((s, l) => s + l[k], 0);
    const controlados = D.produtos().filter(p => p.ativo && p.controlaEstoque);
    const repor = controlados.filter(D.estoqueBaixo).sort((x, y) => (x.estoque - (x.estoqueMinimo || 0)) - (y.estoque - (y.estoqueMinimo || 0)));
    const top = linhas.filter(l => l.saidas > 0).sort((x, y) => y.valorSaidas - x.valorSaidas || y.saidas - x.saidas).slice(0, 6);
    const medida = l => l.valorSaidas || l.saidas, maxTop = Math.max(0, ...top.map(medida));
    const qtdOu = (q, u, sinal) => q ? html`<${Qtd} q=${q} u=${u} sinal=${sinal} />` : html`<${Traco} />`;
    return html`
      <${Cabecalho} titulo="Dashboard do estoque" sub=${`${periodoBR(f)} · o que entrou, o que saiu e o saldo disponível`}>
        <${BotoesEstoque} ir=${ir} atual="estoque/dashboard" />
      <//>
      <${FiltroPeriodo} f=${f} setF=${setF} />
      <div className="rest-kpis-mini">
        <button type="button" className="rest-kpi-mini" onClick=${() => ir('estoque/entradas')}><span>Entradas</span><b className="mov-pos">${D.moedaBR(tot('valorEntradas'))}</b>
          <small>${plural(linhas.filter(l => l.entradas > 0).length, 'produto recebido', 'produtos recebidos')} · ver entradas</small></button>
        <button type="button" className="rest-kpi-mini" onClick=${() => ir('estoque/saidas')}><span>Saídas</span><b className="mov-neg">${D.moedaBR(tot('valorSaidas'))}</b>
          <small>pelo custo médio · ver saídas</small></button>
        <button type="button" className="rest-kpi-mini" onClick=${() => ir('estoque')}><span>Saldo disponível</span><b>${D.moedaBR(somaValor(controlados))}</b>
          <small>${plural(controlados.filter(p => p.estoque > 0).length, 'produto com saldo', 'produtos com saldo')} · valor hoje</small></button>
        <button type="button" className=${'rest-kpi-mini' + (repor.length ? ' hv-alerta' : '')} onClick=${() => ir('estoque', {f: 'repor'})}><span>Repor</span><b>${repor.length}</b>
          <small>no estoque mínimo ou abaixo</small></button>
      </div>
      <div className="rest-est-dash">
        <section className="card">
          <h3>O que mais saiu</h3>
          ${top.length ? html`<ul className="rest-est-top">${top.map(l => html`<li key=${l.p.id}>
              <span><b>${l.p.nome}</b><small><${Qtd} q=${l.saidas} u=${l.p.unidade} />${l.valorSaidas ? ` · ${D.moedaBR(l.valorSaidas)}` : ''}</small></span>
              <span className="rest-rel-barra rest-est-barra" aria-hidden="true"><i style=${{width: (medida(l) / maxTop * 100) + '%'}}></i></span>
            </li>`)}</ul>`
          : html`<p className="rest-grafico-vazio">Nenhuma saída no período.</p>`}
        </section>
        <section className="card">
          <h3>Precisa repor</h3>
          ${repor.length ? html`<ul className="rest-est-top">${repor.slice(0, 6).map(p => html`<li key=${p.id}>
              <span><b>${p.nome}</b><small>saldo <b className="rest-est-alerta">${D.qtdBR(p.estoque)}</b> · mínimo ${D.qtdBR(p.estoqueMinimo || 0)} ${p.unidade}</small></span>
            </li>`)}</ul>
            ${repor.length > 6 && html`<button type="button" className="rest-link" onClick=${() => ir('estoque', {f: 'repor'})}>Ver os ${repor.length} →</button>`}`
          : html`<p className="rest-grafico-vazio">Nenhum produto no estoque mínimo.</p>`}
        </section>
      </div>
      <div className="cad-toolbar rest-filtros">
        <select className="rest-select" value=${grupo} onChange=${e => setGrupo(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>${D.grupos().map(g => html`<option key=${g.id} value=${g.id}>${g.nome}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar produto ou código..." />
      </div>
      <${Tabela} colunas=${['Produto', vespera ? `Saldo em ${D.dataBR(vespera)}` : 'Saldo inicial', 'Entradas', 'Saídas', 'Ajustes', `Saldo em ${D.dataBR(f.ate)}`, 'Situação hoje']}
        vazio=${produtos.length ? 'Nenhum produto com esse filtro.' : 'Nenhum produto controla estoque ainda. Faça uma entrada em "Entrada de estoque".'}>
        ${visiveis.map(l => html`<tr key=${l.p.id} className=${l.p.ativo ? '' : 'rest-inativo'}>
          <td><button type="button" className="rest-link" title="Ver movimentações" onClick=${() => ir('estoque/movimentos', {p: l.p.id})}>${l.p.nome}</button>
            <small className="history-date">${D.grupoPorId(l.p.grupoId)?.nome || '—'}</small></td>
          <td><${Qtd} q=${l.inicial} u=${l.p.unidade} /></td>
          <td className="mov-pos">${qtdOu(l.entradas, l.p.unidade)}</td>
          <td className="mov-neg">${qtdOu(l.saidas, l.p.unidade)}</td>
          <td>${qtdOu(l.ajustes, l.p.unidade, true)}</td>
          <td><b className=${l.final < 0 ? 'mov-neg' : ''}><${Qtd} q=${l.final} u=${l.p.unidade} /></b></td>
          <td className="nowrap"><${Situacao} p=${l.p} /></td>
          <td></td>
        </tr>`)}
      <//>
      <p className="dv-ajuda">Saldo inicial + entradas − saídas ± ajustes de inventário = saldo no fim do período. Valores: custo da nota nas entradas e custo médio atual nas saídas e no saldo.</p>`;
  }

  Object.assign(window.RestUI.telas, {estoque: TelaPosicao, 'estoque/movimentos': TelaMovimentos,
    'estoque/entradas': TelaEntradas, 'estoque/saidas': TelaSaidas, 'estoque/dashboard': TelaDashEstoque});
})();
