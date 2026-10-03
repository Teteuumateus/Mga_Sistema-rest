// =====================================================================
// ---- 🏦 MGA · Contas bancárias e movimento de conta (extrato) ----
// =====================================================================
// Saldo de cada conta (banco, cofre, carteira digital), lançamentos avulsos, transferências
// e o que caiu de baixas de contas e sangrias.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, StatusAtivo, Acoes, FormCard, Modal, Tabela, Segmentos, confirmar, plural} = window.RestUI;
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  const ORIGEM = {AVULSO: 'Lançamento', TRANSFERENCIA: 'Transferência', BAIXA: 'Conta paga/recebida', CAIXA: 'Caixa'};

  // ---- Contas bancárias ----
  function TelaContasBancarias({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const lista = D.contasBancarias().slice().sort((a, b) => Number(b.ativo) - Number(a.ativo) || porNome(a, b));
    const total = lista.filter(c => c.ativo).reduce((s, c) => s + D.saldoConta(c.id), 0);
    const salvar = () => { if (tentar(() => D.salvarContaBancaria(form, form.id), c => `Conta "${c.nome}" ${form.id ? 'atualizada' : 'cadastrada'}.`)) setForm(null); };
    const excluir = c => { if (confirmar(`Excluir a conta "${c.nome}"?`)) tentar(() => D.excluirContaBancaria(c.id), `Conta "${c.nome}" excluída.`); };
    return html`
      <${Cabecalho} titulo="Contas bancárias" sub=${lista.length ? `Saldo somado das contas ativas: ${D.moedaBR(total)}` : 'Banco, cofre e carteira digital: o dinheiro que não está na gaveta do caixa'}>
        <button type="button" className="btn btn-ghost" onClick=${() => ir('fin/extrato')} disabled=${!lista.length}>Movimento de conta</button>
        <button type="button" className="btn" onClick=${() => setForm({id: null, nome: '', tipo: 'BANCO', banco: '', saldoInicial: '', dataInicial: D.hojeISO(), ativo: true})}>+ Nova conta</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar conta — ${form.nome}` : 'Nova conta bancária'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Banco do Brasil, Cofre, Mercado Pago" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Tipo">
            <select value=${form.tipo} onChange=${e => setForm({...form, tipo: e.target.value})}>${Object.entries(D.TIPOS_CONTA_BANCARIA).map(([k, n]) => html`<option key=${k} value=${k}>${n}</option>`)}</select>
          <//>
          <${Campo} rotulo="Agência / conta (opcional)"><input type="text" value=${form.banco} maxLength="40" placeholder="Ex.: Ag. 1234 · CC 56789-0" onInput=${e => setForm({...form, banco: e.target.value})} /><//>
          <${Campo} rotulo="Saldo inicial (R$)"><${CampoValor} valor=${form.saldoInicial} onChange=${v => setForm(f => ({...f, saldoInicial: v}))} /><//>
          <${Campo} rotulo="Saldo inicial em"><input type="date" value=${form.dataInicial} onChange=${e => setForm({...form, dataInicial: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa</label>
        <//>`}
      <${Tabela} colunas=${['Conta', 'Tipo', 'Saldo inicial', 'Saldo atual', 'Status']} vazio="Nenhuma conta cadastrada.">
        ${lista.map(c => html`<tr key=${c.id} className=${c.ativo ? '' : 'rest-inativo'}>
          <td><button type="button" className="rest-link" onClick=${() => ir('fin/extrato', {c: c.id})}>${c.nome}</button>${c.banco ? html`<small className="history-date">${c.banco}</small>` : null}</td>
          <td>${D.TIPOS_CONTA_BANCARIA[c.tipo]}</td>
          <td className="nowrap">${D.moedaBR(c.saldoInicial)}<small className="history-date">em ${D.dataBR(c.dataInicial)}</small></td>
          <td className=${'nowrap ' + (D.saldoConta(c.id) < 0 ? 'mov-neg' : '')}><b>${D.moedaBR(D.saldoConta(c.id))}</b></td>
          <td><${StatusAtivo} ativo=${c.ativo} /></td>
          <td><${Acoes} nome=${c.nome} onEditar=${() => setForm({...c, saldoInicial: D.valorBR(c.saldoInicial)})} onExcluir=${() => excluir(c)} /></td>
        </tr>`)}
      <//>
      <p className="dv-ajuda rest-nota">Para o dinheiro cair numa conta: escolha a conta ao dar baixa em Contas a pagar/receber, ou na sangria do caixa (ex.: depósito no banco ou cofre).</p>`;
  }

  // ---- Movimento de conta (extrato) ----
  const PERIODOS = [['mes', 'Este mês'], ['30', '30 dias'], ['tudo', 'Tudo']];
  function TelaExtrato({params}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const contas = D.contasBancarias().slice().sort(porNome);
    const [contaId, setContaId] = useState(params.c && D.contaBancariaPorId(params.c) ? params.c : contas[0]?.id || '');
    const [periodo, setPeriodo] = useState('mes');
    const [busca, setBusca] = useState('');
    const [janela, setJanela] = useState(null); // {tipo: 'lanc' | 'transf', ...}
    const c = D.contaBancariaPorId(contaId);
    if (!c) return html`<${Cabecalho} titulo="Movimento de conta" sub="Cadastre uma conta em Financeiro › Contas bancárias." />`;
    const hoje = D.hojeISO();
    const desde = periodo === 'mes' ? hoje.slice(0, 8) + '01' : periodo === '30' ? D.diaISO(new Date(Date.now() - 29 * 86400000)) : '';
    // Saldo corrido: começa no saldo do dia anterior ao período
    const todos = D.movConta().filter(m => m.contaId === c.id).sort((a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm));
    const anterior = desde ? D.saldoConta(c.id, D.diaISO(new Date(new Date(desde + 'T12:00:00').getTime() - 86400000))) : c.saldoInicial;
    let saldo = anterior;
    const linhas = todos.filter(m => !desde || m.data >= desde).map(m => { saldo = Math.round((saldo + (m.tipo === 'ENTRADA' ? m.valor : -m.valor)) * 100) / 100; return {...m, saldo}; })
      .filter(m => !busca || D.norm(m.descricao).includes(D.norm(busca))).reverse();
    const entradas = linhas.filter(m => m.tipo === 'ENTRADA').reduce((s, m) => s + m.valor, 0), saidas = linhas.filter(m => m.tipo === 'SAIDA').reduce((s, m) => s + m.valor, 0);
    const confirmarJanela = () => {
      const ok = janela.tipo === 'lanc'
        ? tentar(() => D.lancamentoConta({contaId: c.id, tipo: janela.tipoMov, valor: janela.valor, data: janela.data, descricao: janela.descricao}), m => `${m.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${D.moedaBR(m.valor)} lançada.`)
        : tentar(() => D.transferirEntreContas({origemId: c.id, destinoId: janela.destinoId, valor: janela.valor, data: janela.data, descricao: janela.descricao}), 'Transferência registrada.');
      if (ok) setJanela(null);
    };
    const excluir = m => { if (confirmar(`Excluir "${m.descricao}" (${D.moedaBR(m.valor)})${m.transferencia ? ' e a outra ponta da transferência' : ''}?`)) tentar(() => D.excluirMovConta(m.id), 'Lançamento excluído.'); };
    return html`
      <${Cabecalho} titulo="Movimento de conta" sub=${`${c.nome} · saldo atual ${D.moedaBR(D.saldoConta(c.id))}`}>
        <button type="button" className="btn btn-ghost" disabled=${contas.length < 2} onClick=${() => setJanela({tipo: 'transf', destinoId: contas.find(x => x.id !== c.id)?.id || '', valor: '', data: hoje, descricao: ''})}>⇄ Transferir</button>
        <button type="button" className="btn" onClick=${() => setJanela({tipo: 'lanc', tipoMov: 'SAIDA', valor: '', data: hoje, descricao: ''})}>+ Lançamento</button>
      <//>
      ${aviso}
      <div className="rest-kpis-mini">
        <div className="rest-kpi-mini"><span>Saldo anterior</span><b>${D.moedaBR(anterior)}</b><small>${desde ? `antes de ${D.dataBR(desde)}` : 'saldo inicial'}</small></div>
        <div className="rest-kpi-mini"><span>Entradas</span><b className="mov-pos">${D.moedaBR(entradas)}</b><small>no período</small></div>
        <div className="rest-kpi-mini"><span>Saídas</span><b className="mov-neg">${D.moedaBR(saidas)}</b><small>no período</small></div>
        <div className="rest-kpi-mini"><span>Saldo atual</span><b>${D.moedaBR(D.saldoConta(c.id))}</b><small>${D.TIPOS_CONTA_BANCARIA[c.tipo]}</small></div>
      </div>
      <div className="cad-toolbar rest-filtros">
        <select className="rest-select" value=${contaId} onChange=${e => setContaId(e.target.value)} aria-label="Conta">${contas.map(x => html`<option key=${x.id} value=${x.id}>${x.nome}</option>`)}</select>
        <${Segmentos} rotulo="Período" opcoes=${PERIODOS} valor=${periodo} onChange=${setPeriodo} />
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar descrição..." />
      </div>
      <${Tabela} colunas=${['Data', 'Descrição', 'Origem', 'Valor', 'Saldo']} vazio="Nenhum movimento no período.">
        ${linhas.map(m => html`<tr key=${m.id}>
          <td className="nowrap">${D.dataBR(m.data)}</td>
          <td>${m.descricao}<small className="history-date">${m.usuario}</small></td>
          <td><span className="badge rest-b-venda">${ORIGEM[m.origem] || '—'}</span></td>
          <td className=${'nowrap ' + (m.tipo === 'ENTRADA' ? 'mov-pos' : 'mov-neg')}><b>${m.tipo === 'ENTRADA' ? '+' : '−'} ${D.moedaBR(m.valor)}</b></td>
          <td className="nowrap">${D.moedaBR(m.saldo)}</td>
          <td><${Acoes} nome=${m.descricao} onExcluir=${['AVULSO', 'TRANSFERENCIA'].includes(m.origem) ? () => excluir(m) : null} /></td>
        </tr>`)}
      <//>
      ${janela && html`
        <${Modal} titulo=${janela.tipo === 'lanc' ? `Lançamento em ${c.nome}` : `Transferir de ${c.nome}`} onFechar=${() => setJanela(null)}>
          <form onSubmit=${e => { e.preventDefault(); confirmarJanela(); }}>
            <div className="form-grid">
              ${janela.tipo === 'lanc' ? html`<${Campo} rotulo="Tipo">
                  <select value=${janela.tipoMov} onChange=${e => setJanela({...janela, tipoMov: e.target.value})}><option value="SAIDA">Saída (tarifa, retirada...)</option><option value="ENTRADA">Entrada (depósito, rendimento...)</option></select>
                <//>`
                : html`<${Campo} rotulo="Para a conta">
                  <select value=${janela.destinoId} onChange=${e => setJanela({...janela, destinoId: e.target.value})}>${contas.filter(x => x.id !== c.id && x.ativo).map(x => html`<option key=${x.id} value=${x.id}>${x.nome}</option>`)}</select>
                <//>`}
              <${Campo} rotulo="Valor (R$)"><${CampoValor} valor=${janela.valor} onChange=${v => setJanela(j => ({...j, valor: v}))} /><//>
              <${Campo} rotulo="Data"><input type="date" value=${janela.data} onChange=${e => setJanela({...janela, data: e.target.value})} /><//>
              <${Campo} rotulo=${janela.tipo === 'lanc' ? 'Descrição' : 'Descrição (opcional)'} largo><input type="text" maxLength="80" value=${janela.descricao} placeholder=${janela.tipo === 'lanc' ? 'Ex.: Tarifa bancária' : 'Ex.: Depósito do cofre'} onInput=${e => setJanela({...janela, descricao: e.target.value})} /><//>
            </div>
            ${aviso}
            <div className="cf-acoes">
              <button type="button" className="btn btn-ghost" onClick=${() => setJanela(null)}>Cancelar</button>
              <button type="submit" className="btn">${janela.tipo === 'lanc' ? 'Lançar' : 'Transferir'}</button>
            </div>
          </form>
        <//>`}`;
  }

  Object.assign(window.RestUI.telas, {'fin/contas': TelaContasBancarias, 'fin/extrato': TelaExtrato});
})();
