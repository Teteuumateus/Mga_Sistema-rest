// =====================================================================
// ---- ⚙️ MGA · Configurações: auditoria e dados do sistema ----
// =====================================================================
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useRef} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Modal, Segmentos, confirmar, plural} = window.RestUI;

  // ---- Auditoria: quem fez o quê e quando ----
  const PERIODOS = [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['todos', 'Tudo']];
  const PAGINA = 100;
  function TelaAuditoria(){
    useDados();
    const [periodo, setPeriodo] = useState('7');
    const [modulo, setModulo] = useState('');
    const [busca, setBusca] = useState('');
    const [limite, setLimite] = useState(PAGINA);
    const todos = D.auditoria();
    const modulos = [...new Set(todos.map(a => a.modulo))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const inicio = periodo === 'todos' ? 0 : periodo === 'hoje' ? new Date().setHours(0, 0, 0, 0) : Date.now() - Number(periodo) * 86400000;
    const b = D.norm(busca);
    const lista = todos.filter(a => new Date(a.data).getTime() >= inicio && (!modulo || a.modulo === modulo)
      && (!busca || D.norm([a.descricao, a.usuario, a.detalhe].join(' ')).includes(b))).reverse();
    return html`
      <${Cabecalho} titulo="Auditoria" sub=${`${plural(lista.length, 'registro', 'registros')} no filtro · ${plural(todos.length, 'registro guardado', 'registros guardados')} (os ${(5000).toLocaleString('pt-BR')} mais recentes)`} />
      <div className="cad-toolbar rest-filtros">
        <${Segmentos} rotulo="Período" opcoes=${PERIODOS} valor=${periodo} onChange=${v => { setPeriodo(v); setLimite(PAGINA); }} />
        <select className="rest-select" value=${modulo} onChange=${e => { setModulo(e.target.value); setLimite(PAGINA); }} aria-label="Módulo">
          <option value="">Todos os módulos</option>
          ${modulos.map(m => html`<option key=${m}>${m}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${v => { setBusca(v); setLimite(PAGINA); }} placeholder="Buscar descrição ou usuário..." />
      </div>
      <div className="card table-scroll">
        <table>
          <thead><tr><th>Quando</th><th>Usuário</th><th>Módulo</th><th>O que aconteceu</th></tr></thead>
          <tbody>
            ${lista.length ? lista.slice(0, limite).map((a, k) => html`<tr key=${a.data + k}>
              <td className="nowrap">${new Date(a.data).toLocaleString('pt-BR', {dateStyle: 'short', timeStyle: 'short'})}</td>
              <td>${a.usuario || '—'}</td>
              <td><span className="badge rest-b-aberta">${a.modulo}</span></td>
              <td>${a.descricao}
                ${a.detalhe && html`<small className="history-date">${a.detalhe}</small>`}
                ${a.alteracoes?.length ? html`<ul className="rest-alteracoes">${a.alteracoes.map((x, j) => html`<li key=${j}><b>${x.campo}:</b> ${x.antes} → ${x.depois}</li>`)}</ul>` : null}
              </td>
            </tr>`) : html`<tr><td colSpan="4" className="history-empty">Nenhum registro com esse filtro.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${lista.length > limite && html`<div className="rest-mais"><button type="button" className="btn btn-ghost" onClick=${() => setLimite(limite + PAGINA)}>Mostrar mais ${Math.min(PAGINA, lista.length - limite)} de ${lista.length - limite}</button></div>`}`;
  }

  // ---- Dados do sistema: resumo, backup, demonstração e limpeza ----
  function baixarArquivo(nome, conteudo){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conteudo], {type: 'application/json'}));
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function TelaDados(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [limpar, setLimpar] = useState(null); // {confirma, senha, modo}
    const [erroLimpar, setErroLimpar] = useState('');
    const arquivo = useRef(null);
    const r = D.resumoDados();
    const espaco = r.bytes > 1048576 ? (r.bytes / 1048576).toFixed(2).replace('.', ',') + ' MB' : Math.ceil(r.bytes / 1024) + ' KB';
    const itens = [['Vendas', r.vendas], ['Produtos', r.produtos], ['Grupos', r.grupos], ['Clientes', r.clientes], ['Entregadores', r.entregadores],
      ['Contas a pagar/receber', r.contas], ['Registros de auditoria', r.auditoria], ['Espaço usado', espaco]];
    const exportar = () => tentar(() => baixarArquivo(`mga-backup-${D.hojeISO()}.json`, D.exportarBackup()), 'Backup baixado. Guarde o arquivo em local seguro.');
    const importar = f => {
      if (!f) return;
      const leitor = new FileReader();
      leitor.onload = () => {
        const b = tentar(() => D.lerBackup(leitor.result));
        if (!b) return;
        const quando = b.geradoEm ? new Date(b.geradoEm).toLocaleString('pt-BR') : 'data desconhecida';
        if (!confirmar(`Restaurar o backup de ${quando}?\n\nOs dados atuais deste navegador serão substituídos pelos do arquivo.`)) return;
        b.aplicar();
        location.reload();
      };
      leitor.readAsText(f);
    };
    const gerarDemo = () => {
      if (!confirmar('Gerar dados de demonstração?\n\nCria vendas desde janeiro do ano passado e contas a pagar/receber dos últimos meses, para ver o Dashboard funcionando. Eles ficam marcados e saem com "Remover demonstração", sem mexer nos seus dados.')) return;
      tentar(() => D.gerarDemonstracao(), x => `Demonstração gerada: ${x.vendas.toLocaleString('pt-BR')} vendas e ${x.contas} contas.`);
    };
    const removerDemo = () => { if (confirmar('Remover todos os dados de demonstração?')) tentar(() => D.removerDemonstracao(), x => `Removidos: ${x.vendas.toLocaleString('pt-BR')} vendas e ${x.contas} contas de demonstração.`); };
    const confirmarLimpar = () => {
      if (limpar.confirma.trim().toUpperCase() !== 'LIMPAR') { setErroLimpar('Digite LIMPAR para confirmar.'); return; }
      try { D.limparTudo({modo: limpar.modo, senha: limpar.senha}); location.reload(); }
      catch (e) { setErroLimpar(e.message); }
    };
    return html`
      <${Cabecalho} titulo="Dados do sistema" sub="Tudo fica guardado neste navegador. Faça backup com frequência." />
      ${aviso}
      <div className="hv-resumo rest-dados-resumo">${itens.map(([k, v]) => html`<div key=${k}><span>${k}</span><b>${typeof v === 'number' ? v.toLocaleString('pt-BR') : v}</b></div>`)}</div>
      <div className="rest-dados-grid">
        <section className="card rest-dados-card">
          <h3 className="rest-form-titulo">💾 Backup</h3>
          <p className="dv-ajuda">Baixa um arquivo com todos os dados (cadastros, vendas, financeiro e auditoria). Para trocar de computador ou navegador, restaure o arquivo lá.</p>
          <div className="rest-form-acoes">
            <button type="button" className="btn" onClick=${exportar}>Baixar backup</button>
            <button type="button" className="btn btn-ghost" onClick=${() => arquivo.current.click()}>Restaurar backup...</button>
            <input type="file" accept=".json,application/json" ref=${arquivo} hidden onChange=${e => { importar(e.target.files[0]); e.target.value = ''; }} />
          </div>
        </section>
        <section className="card rest-dados-card">
          <h3 className="rest-form-titulo">🧪 Demonstração</h3>
          <p className="dv-ajuda">${r.demo ? 'Há dados de demonstração no sistema (vendas e contas marcadas). Remova antes de começar a usar de verdade.' : 'Gera vendas e contas de exemplo para ver o Dashboard e os gráficos com números. Seus dados não são alterados.'}</p>
          <div className="rest-form-acoes">
            ${r.demo ? html`<button type="button" className="btn btn-ghost" onClick=${removerDemo}>Remover demonstração</button>`
              : html`<button type="button" className="btn btn-ghost" onClick=${gerarDemo}>Gerar dados de demonstração</button>`}
          </div>
        </section>
        <section className="card rest-dados-card rest-perigo">
          <h3 className="rest-form-titulo">🗑️ Apagar todos os dados</h3>
          <p className="dv-ajuda">Apaga cadastros, vendas, caixas, financeiro e auditoria deste navegador. <b>Não pode ser desfeito</b> sem um backup. O tema e o usuário logado são mantidos.</p>
          <div className="rest-form-acoes"><button type="button" className="btn btn-perigo" onClick=${() => { setErroLimpar(''); setLimpar({confirma: '', senha: '', modo: 'exemplo'}); }}>Apagar tudo...</button></div>
        </section>
      </div>
      ${limpar && html`
        <${Modal} titulo="Apagar todos os dados" onFechar=${() => setLimpar(null)}>
          <p className="dv-ajuda">Recomeçar:</p>
          <label className="rest-check rest-radio"><input type="radio" name="modoLimpar" checked=${limpar.modo === 'exemplo'} onChange=${() => setLimpar({...limpar, modo: 'exemplo'})} /> Com os grupos e produtos de exemplo</label>
          <label className="rest-check rest-radio"><input type="radio" name="modoLimpar" checked=${limpar.modo === 'vazio'} onChange=${() => setLimpar({...limpar, modo: 'vazio'})} /> Totalmente vazio</label>
          <div className="form-grid rest-limpar-campos">
            <div className="field"><label htmlFor="ldConfirma">Digite LIMPAR</label><input id="ldConfirma" type="text" autoComplete="off" value=${limpar.confirma} onInput=${e => setLimpar({...limpar, confirma: e.target.value})} /></div>
            <div className="field"><label htmlFor="ldSenha">Senha do supervisor</label><input id="ldSenha" type="password" value=${limpar.senha} onInput=${e => setLimpar({...limpar, senha: e.target.value})}
              onKeyDown=${e => { if (e.key === 'Enter') confirmarLimpar(); }} /></div>
          </div>
          ${erroLimpar && html`<div className="toast rest-toast toast-erro" role="alert">${erroLimpar}</div>`}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setLimpar(null)}>Cancelar</button>
            <button type="button" className="btn btn-perigo" disabled=${limpar.confirma.trim().toUpperCase() !== 'LIMPAR'} onClick=${confirmarLimpar}>Apagar tudo</button>
          </div>
        <//>`}`;
  }

  // ---- Restaurante: nome e taxa de serviço ----
  function TelaRestaurante(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const c = D.config();
    const [form, setForm] = useState({nome: c.nome, taxaServico: String(c.taxaServico).replace('.', ','), servicoPadrao: c.servicoPadrao,
      taxaEntrega: D.valorBR(c.taxaEntrega), entregaVerde: String(c.entregaVerde), entregaAmarelo: String(c.entregaAmarelo)});
    const salvar = e => { e.preventDefault(); tentar(() => D.salvarConfig(form), 'Configuração salva. Vale para as mesas abertas daqui em diante.'); };
    const exemplo = 100 * (D.lerValor(form.taxaServico) || 0) / 100;
    return html`
      <${Cabecalho} titulo="Restaurante" sub="Dados gerais, taxa de serviço das mesas e tempos do delivery" />
      ${aviso}
      <form className="card rest-config-form" onSubmit=${salvar}>
        <div className="form-grid">
          <div className="field"><label htmlFor="cfNome">Nome do restaurante</label><input id="cfNome" type="text" maxLength="60" value=${form.nome} onInput=${e => setForm({...form, nome: e.target.value})} /></div>
          <div className="field"><label htmlFor="cfTaxa">Taxa de serviço (%)</label><input id="cfTaxa" type="text" inputMode="decimal" value=${form.taxaServico} onInput=${e => setForm({...form, taxaServico: e.target.value})} /></div>
        </div>
        <label className="rest-check"><input type="checkbox" checked=${form.servicoPadrao} onChange=${e => setForm({...form, servicoPadrao: e.target.checked})} /> Incluir a taxa automaticamente nas mesas (dá para tirar em cada mesa)</label>
        <p className="dv-ajuda">Exemplo: consumo de R$ 100,00 + taxa = ${D.moedaBR(100 + (Number.isFinite(exemplo) ? exemplo : 0))}. A taxa é calculada sobre o consumo da mesa.</p>
        <h3 className="rest-form-titulo rest-config-sub">Delivery</h3>
        <div className="form-grid">
          <div className="field"><label htmlFor="cfEntrega">Taxa de entrega padrão (R$)</label><input id="cfEntrega" type="text" inputMode="decimal" value=${form.taxaEntrega} onInput=${e => setForm({...form, taxaEntrega: e.target.value})} /></div>
          <div className="field"><label htmlFor="cfVerde">🟢 Verde até (min)</label><input id="cfVerde" type="number" min="1" value=${form.entregaVerde} onInput=${e => setForm({...form, entregaVerde: e.target.value})} /></div>
          <div className="field"><label htmlFor="cfAmarelo">🟡 Amarelo até (min)</label><input id="cfAmarelo" type="number" min="2" value=${form.entregaAmarelo} onInput=${e => setForm({...form, entregaAmarelo: e.target.value})} /></div>
        </div>
        <p className="dv-ajuda">O tempo conta a partir do pedido. Passando do amarelo, o pedido fica 🔴 vermelho (fora do tempo esperado).</p>
        <div className="rest-form-acoes"><button type="submit" className="btn">Salvar</button></div>
      </form>`;
  }

  Object.assign(window.RestUI.telas, {'config/auditoria': TelaAuditoria, 'config/dados': TelaDados, 'config/restaurante': TelaRestaurante});
})();
