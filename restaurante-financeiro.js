// =====================================================================
// ---- 💰 MGA · Financeiro: contas a pagar, a receber e categorias ----
// =====================================================================
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, Acoes, FormCard, Modal, Tabela, Segmentos, confirmar, plural} = window.RestUI;

  const somaValor = lista => lista.reduce((s, c) => s + c.valor, 0);
  const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return D.diaISO(d); };
  const FILTROS = [['abertas', 'Em aberto'], ['vencidas', 'Vencidas'], ['hoje', 'Vencem hoje'], ['mes', 'Este mês'], ['pagas', 'Baixadas'], ['todas', 'Todas']];

  function Situacao({c, tipo}){
    const hoje = D.hojeISO();
    if (c.status === 'PAGA') return html`<span className="badge b-ok">${tipo === 'PAGAR' ? 'Paga' : 'Recebida'}</span><small className="history-date">${D.dataBR(c.pagoEm)} · ${c.forma}</small>`;
    if (c.vencimento < hoje) return html`<span className="badge rest-b-vencida">⚠ Vencida</span>`;
    if (c.vencimento === hoje) return html`<span className="badge b-wait">Vence hoje</span>`;
    return html`<span className="badge rest-b-aberta">Em aberto</span>`;
  }

  // ---- Contas a pagar / a receber (mesma tela, muda o tipo) ----
  function TelaContas({tipo, params, ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const pagar = tipo === 'PAGAR';
    const [filtro, setFiltro] = useState(FILTROS.some(([f]) => f === params.f) ? params.f : 'abertas');
    const [categoria, setCategoria] = useState('');
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null);
    const [baixa, setBaixa] = useState(null); // {conta, data, forma}
    const hoje = D.hojeISO(), mes = hoje.slice(0, 7), em7 = addDias(hoje, 7);
    const todas = D.contas().filter(c => c.tipo === tipo);
    const abertas = todas.filter(c => c.status === 'ABERTA');
    const vencidas = abertas.filter(c => c.vencimento < hoje);
    const venceHoje = abertas.filter(c => c.vencimento === hoje);
    const proximas = abertas.filter(c => c.vencimento > hoje && c.vencimento <= em7);
    const baixadasMes = todas.filter(c => c.status === 'PAGA' && (c.pagoEm || '').startsWith(mes));
    const porFiltro = {
      abertas: c => c.status === 'ABERTA', vencidas: c => D.contaVencida(c), hoje: c => c.status === 'ABERTA' && c.vencimento === hoje,
      mes: c => c.vencimento.startsWith(mes), pagas: c => c.status === 'PAGA', todas: () => true
    }[filtro];
    const b = D.norm(busca);
    const lista = todas.filter(porFiltro)
      .filter(c => !categoria || c.categoria === categoria)
      .filter(c => !busca || D.norm([c.descricao, c.categoria, D.clientePorId(c.clienteId)?.nome, D.fornecedorPorId(c.fornecedorId)?.nome].join(' ')).includes(b))
      .sort((x, y) => filtro === 'pagas' ? String(y.pagoEm).localeCompare(String(x.pagoEm)) : x.vencimento.localeCompare(y.vencimento));
    const cats = D.categorias()[tipo];
    const nomeBaixa = pagar ? 'Pagar' : 'Receber';

    const novo = () => setForm({id: null, tipo, descricao: '', categoria: cats[0] || '', valor: '', vencimento: hoje, clienteId: '', fornecedorId: '', obs: ''});
    const editar = c => setForm({id: c.id, tipo, descricao: c.descricao, categoria: c.categoria, valor: D.valorBR(c.valor), vencimento: c.vencimento, clienteId: c.clienteId || '',
      fornecedorId: c.fornecedorId || '', obs: c.obs || ''});
    const salvar = () => { if (tentar(() => D.salvarConta(form, form.id), c => form.id ? `Conta "${c.descricao}" atualizada.` : `Conta "${c.descricao}" lançada: ${D.moedaBR(c.valor)} vence ${D.dataBR(c.vencimento)}.`)) setForm(null); };
    const excluir = c => { if (confirmar(`Excluir a conta "${c.descricao}" (${D.moedaBR(c.valor)})?`)) tentar(() => D.excluirConta(c.id), `Conta "${c.descricao}" excluída.`); };
    const estornar = c => { if (confirmar(`Estornar a baixa de "${c.descricao}"? Ela volta a ficar em aberto.`)) tentar(() => D.estornarBaixa(c.id), `Baixa de "${c.descricao}" estornada.`); };
    const pelaCaixa = b => b.noCaixa && b.data === hoje && !!D.caixaAberto() && D.podeAcessar('vendas');
    const confirmarBaixa = () => { if (tentar(() => D.baixarConta(baixa.conta.id, {...baixa, noCaixa: pelaCaixa(baixa), contaBancariaId: pelaCaixa(baixa) ? null : baixa.contaBancariaId || null}), c => `"${c.descricao}" ${pagar ? 'paga' : 'recebida'}: ${D.moedaBR(c.valor)} (${c.forma}).`)) setBaixa(null); };

    const kpi = (rotulo, lista, sub, alerta, f) => html`
      <button type="button" className=${'rest-kpi-mini' + (alerta && lista.length ? ' hv-alerta' : '') + (filtro === f ? ' ativo' : '')} onClick=${() => setFiltro(f)} aria-pressed=${filtro === f}>
        <span>${rotulo}</span><b>${D.moedaBR(somaValor(lista))}</b><small>${sub(lista.length)}</small>
      </button>`;
    return html`
      <${Cabecalho} titulo=${pagar ? 'Contas a pagar' : 'Contas a receber'}
        sub=${`${plural(abertas.length, 'conta em aberto', 'contas em aberto')} · ${D.moedaBR(somaValor(abertas))}${pagar ? '' : ' · vendas a prazo entram aqui sozinhas'}`}>
        <button type="button" className="btn" onClick=${novo}>+ ${pagar ? 'Nova conta a pagar' : 'Nova conta a receber'}</button>
      <//>
      ${aviso}
      <div className="rest-kpis-mini">
        ${kpi('Vencidas', vencidas, n => plural(n, 'conta', 'contas'), true, 'vencidas')}
        ${kpi('Vencem hoje', venceHoje, n => plural(n, 'conta', 'contas'), false, 'hoje')}
        ${kpi('Próximos 7 dias', proximas, n => plural(n, 'conta', 'contas'), false, 'abertas')}
        ${kpi(pagar ? 'Pagas no mês' : 'Recebidas no mês', baixadasMes, n => plural(n, 'baixa', 'baixas'), false, 'pagas')}
      </div>
      ${form && html`
        <${FormCard} titulo=${form.id ? 'Editar conta' : pagar ? 'Nova conta a pagar' : 'Nova conta a receber'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Descrição" largo><input type="text" value=${form.descricao} maxLength="100" placeholder=${pagar ? 'Ex.: Conta de luz de setembro' : 'Ex.: Evento da empresa X'} onInput=${e => setForm({...form, descricao: e.target.value})} /><//>
          <${Campo} rotulo="Categoria">
            <select value=${form.categoria} onChange=${e => setForm({...form, categoria: e.target.value})}>${cats.map(c => html`<option key=${c}>${c}</option>`)}</select>
          <//>
          <${Campo} rotulo="Valor (R$)"><${CampoValor} valor=${form.valor} onChange=${v => setForm(f => ({...f, valor: v}))} /><//>
          <${Campo} rotulo="Vencimento"><input type="date" value=${form.vencimento} onChange=${e => setForm({...form, vencimento: e.target.value})} /><//>
          ${!pagar && html`<${Campo} rotulo="Cliente (opcional)">
            <select value=${form.clienteId} onChange=${e => setForm({...form, clienteId: e.target.value})}>
              <option value="">—</option>
              ${D.clientes().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(c => html`<option key=${c.id} value=${c.id}>${c.nome}</option>`)}
            </select>
          <//>`}
          ${pagar && html`<${Campo} rotulo="Fornecedor (opcional)">
            <select value=${form.fornecedorId} onChange=${e => setForm({...form, fornecedorId: e.target.value})}>
              <option value="">—</option>
              ${D.fornecedores().filter(f => f.ativo || f.id === form.fornecedorId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(f => html`<option key=${f.id} value=${f.id}>${f.nome}</option>`)}
            </select>
          <//>`}
          <${Campo} rotulo="Observação" largo><input type="text" value=${form.obs} maxLength="200" onInput=${e => setForm({...form, obs: e.target.value})} /><//>
        <//>`}
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Situação" opcoes=${FILTROS} valor=${filtro} onChange=${setFiltro} />
        <select className="rest-select" value=${categoria} onChange=${e => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          ${cats.map(c => html`<option key=${c}>${c}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar descrição ou cliente..." />
      </div>
      <${Tabela} colunas=${['Vencimento', 'Descrição', 'Valor', 'Situação']} vazio=${todas.length ? 'Nenhuma conta com esse filtro.' : `Nenhuma conta ${pagar ? 'a pagar' : 'a receber'} lançada ainda.`}
        rodape=${html`<tfoot><tr><td colSpan="2">${plural(lista.length, 'conta', 'contas')} na lista</td><td className="nowrap"><b>${D.moedaBR(somaValor(lista))}</b></td><td colSpan="2"></td></tr></tfoot>`}>
        ${lista.map(c => {
          const cli = D.clientePorId(c.clienteId), venda = c.vendaId && D.vendaPorId(c.vendaId), forn = D.fornecedorPorId(c.fornecedorId);
          return html`<tr key=${c.id} className=${D.contaVencida(c) ? 'rest-linha-vencida' : ''}>
            <td className="nowrap">${D.dataBR(c.vencimento)}</td>
            <td><b>${c.descricao}</b><small className="history-date">${[c.categoria, cli?.nome, forn?.nome, venda && `venda #${venda.numero}`].filter(Boolean).join(' · ')}</small></td>
            <td className="nowrap"><b>${D.moedaBR(c.valor)}</b></td>
            <td><${Situacao} c=${c} tipo=${tipo} /></td>
            <td><${Acoes} nome=${c.descricao}
              onEditar=${c.status === 'ABERTA' && !c.vendaId ? () => editar(c) : null}
              onExcluir=${c.status === 'ABERTA' && !c.vendaId ? () => excluir(c) : null}>
              ${c.status === 'ABERTA'
                ? html`<button type="button" className="rest-acao-baixa" onClick=${() => setBaixa({conta: c, data: hoje, forma: D.FORMAS_BAIXA[1], noCaixa: !!D.caixaAberto() && D.podeAcessar('vendas')})}>${nomeBaixa}</button>`
                : html`<button type="button" className="rest-acao-estorno" onClick=${() => estornar(c)}>Estornar</button>`}
            <//></td>
          </tr>`;
        })}
      <//>
      ${baixa && html`
        <${Modal} titulo=${`${nomeBaixa} conta`} onFechar=${() => setBaixa(null)}>
          <p className="rest-baixa-resumo"><b>${baixa.conta.descricao}</b><span>${D.moedaBR(baixa.conta.valor)} · vence ${D.dataBR(baixa.conta.vencimento)}</span></p>
          <div className="form-grid">
            <${Campo} rotulo=${pagar ? 'Data do pagamento' : 'Data do recebimento'}><input type="date" value=${baixa.data} max=${hoje} onChange=${e => setBaixa({...baixa, data: e.target.value})} /><//>
            <${Campo} rotulo="Forma">
              <select value=${baixa.forma} onChange=${e => setBaixa({...baixa, forma: e.target.value})}>${D.FORMAS_BAIXA.map(f => html`<option key=${f}>${f}</option>`)}</select>
            <//>
          </div>
          ${D.caixaAberto() && D.podeAcessar('vendas') && html`
            <label className="rest-check rest-no-caixa"><input type="checkbox" checked=${baixa.noCaixa && baixa.data === hoje} disabled=${baixa.data !== hoje}
              onChange=${e => setBaixa({...baixa, noCaixa: e.target.checked})} /> ${pagar ? 'Pagar com o' : 'Receber no'} caixa aberto (#${D.caixaAberto().numero})</label>
            <p className="dv-ajuda">${baixa.data !== hoje ? 'Só baixas com data de hoje entram no caixa.' : 'Marcado, o valor entra no saldo e no fechamento do caixa.'}</p>`}
          ${!pelaCaixa(baixa) && D.contasBancarias().some(c => c.ativo) && html`
            <div className="form-grid"><${Campo} rotulo=${pagar ? 'Saiu da conta (opcional)' : 'Entrou na conta (opcional)'}>
              <select value=${baixa.contaBancariaId || ''} onChange=${e => setBaixa({...baixa, contaBancariaId: e.target.value})}>
                <option value="">— não lançar em conta —</option>
                ${D.contasBancarias().filter(c => c.ativo).map(c => html`<option key=${c.id} value=${c.id}>${c.nome} · saldo ${D.moedaBR(D.saldoConta(c.id))}</option>`)}
              </select>
            <//></div>`}
          ${aviso}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setBaixa(null)}>Cancelar</button>
            <button type="button" className="btn" onClick=${confirmarBaixa}>Confirmar ${pagar ? 'pagamento' : 'recebimento'}</button>
          </div>
        <//>`}`;
  }

  // ---- Categorias ----
  function ListaCategorias({tipo, titulo, tentar}){
    const [nova, setNova] = useState('');
    const [editando, setEditando] = useState(null); // {antigo, nome}
    const cats = D.categorias()[tipo];
    const uso = nome => D.contas().filter(c => c.tipo === tipo && c.categoria === nome).length;
    const adicionar = e => { e.preventDefault(); if (tentar(() => D.salvarCategoria(tipo, nova), `Categoria "${nova.trim()}" criada.`)) setNova(''); };
    const renomear = () => { if (tentar(() => D.salvarCategoria(tipo, editando.nome, editando.antigo), `Categoria renomeada para "${editando.nome.trim()}".`)) setEditando(null); };
    return html`
      <div className="card rest-cat-card">
        <h3 className="rest-form-titulo">${titulo} <small>${cats.length}</small></h3>
        <form className="rest-cat-nova" onSubmit=${adicionar}>
          <input type="text" className="search" value=${nova} maxLength="40" placeholder="Nova categoria..." aria-label=${'Nova categoria de ' + titulo.toLowerCase()} onInput=${e => setNova(e.target.value)} />
          <button type="submit" className="btn" disabled=${!nova.trim()}>Adicionar</button>
        </form>
        <ul className="rest-cat-lista">
          ${cats.map(nome => html`<li key=${nome}>
            ${editando?.antigo === nome
              ? html`<form className="rest-cat-nova" onSubmit=${e => { e.preventDefault(); renomear(); }}>
                  <input type="text" className="search" value=${editando.nome} maxLength="40" autoFocus aria-label="Novo nome" onInput=${e => setEditando({...editando, nome: e.target.value})}
                    onKeyDown=${e => { if (e.key === 'Escape') setEditando(null); }} />
                  <button type="submit" className="btn">Salvar</button>
                  <button type="button" className="btn btn-ghost" onClick=${() => setEditando(null)}>Cancelar</button>
                </form>`
              : html`<span className="rest-cat-nome">${nome}${nome === D.CATEGORIA_PRAZO ? html` <small>(usada pelas vendas)</small>` : null}</span>
                <small className="rest-cat-uso">${plural(uso(nome), 'conta', 'contas')}</small>
                ${nome !== D.CATEGORIA_PRAZO && html`<${Acoes} nome=${nome} onEditar=${() => setEditando({antigo: nome, nome})}
                  onExcluir=${() => { if (confirmar(`Excluir a categoria "${nome}"?`)) tentar(() => D.excluirCategoria(tipo, nome), `Categoria "${nome}" excluída.`); }} />`}`}
          </li>`)}
        </ul>
      </div>`;
  }
  function TelaCategorias(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    return html`
      <${Cabecalho} titulo="Categorias" sub="Agrupam as contas e aparecem no gráfico de despesas por categoria do Dashboard" />
      ${aviso}
      <div className="rest-cat-grid">
        <${ListaCategorias} tipo="PAGAR" titulo="Despesas (contas a pagar)" tentar=${tentar} />
        <${ListaCategorias} tipo="RECEBER" titulo="Receitas (contas a receber)" tentar=${tentar} />
      </div>`;
  }

  Object.assign(window.RestUI.telas, {
    'fin/pagar': props => html`<${TelaContas} key="pagar" tipo="PAGAR" ...${props} />`,
    'fin/receber': props => html`<${TelaContas} key="receber" tipo="RECEBER" ...${props} />`,
    'fin/categorias': TelaCategorias
  });
})();
