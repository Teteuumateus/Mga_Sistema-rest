// =====================================================================
// ---- 👥 MGA · Cadastros: fornecedores, funcionários e regiões de entrega ----
// =====================================================================
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, StatusAtivo, Acoes, FormCard, Tabela, confirmar, plural} = window.RestUI;
  const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
  // Campo de texto ligado ao formulário (com máscara opcional)
  const texto = (form, setForm) => (k, rotulo, extra = {}) => html`<${Campo} rotulo=${rotulo} largo=${extra.largo}>
    <input type=${extra.tipo || 'text'} value=${form[k] ?? ''} maxLength=${extra.max || 120} placeholder=${extra.ph || ''} inputMode=${extra.modo || null}
      onInput=${e => setForm({...form, [k]: extra.mascara ? extra.mascara(e.target.value) : e.target.value})} />
  <//>`;

  // ---- Fornecedores ----
  const FORNECEDOR_VAZIO = {id: null, nome: '', documento: '', telefone: '', email: '', contato: '', endereco: '', cidade: '', obs: '', ativo: true};
  function TelaFornecedores({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null);
    const todos = D.fornecedores();
    const b = D.norm(busca), bDig = busca.replace(/\D/g, '');
    const lista = todos.filter(f => !busca || D.norm([f.nome, f.contato, f.cidade].join(' ')).includes(b) || (bDig && (f.documento + f.telefone).replace(/\D/g, '').includes(bDig))).sort(porNome);
    // Compras (entradas de estoque) e contas a pagar de cada fornecedor
    const compras = id => D.movEstoque().filter(m => m.fornecedorId === id).length;
    const emAberto = id => D.contas().filter(c => c.fornecedorId === id && c.status === 'ABERTA').reduce((s, c) => s + c.valor, 0);
    const salvar = () => { if (tentar(() => D.salvarFornecedor(form, form.id), f => form.id ? `Fornecedor "${f.nome}" atualizado.` : `Fornecedor "${f.nome}" cadastrado.`)) setForm(null); };
    const excluir = f => { if (confirmar(`Excluir o fornecedor "${f.nome}"?`)) tentar(() => D.excluirFornecedor(f.id), `Fornecedor "${f.nome}" excluído.`); };
    const campo = form && texto(form, setForm);
    return html`
      <${Cabecalho} titulo="Fornecedores" sub=${todos.length ? `${plural(todos.filter(f => f.ativo).length, 'fornecedor ativo', 'fornecedores ativos')} · aparecem na entrada de estoque e nas contas a pagar` : 'Quem vende para o restaurante: distribuidoras, açougue, hortifrúti...'}>
        <button type="button" className="btn" onClick=${() => setForm({...FORNECEDOR_VAZIO})}>+ Novo fornecedor</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar fornecedor — ${form.nome}` : 'Novo fornecedor'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          ${campo('nome', 'Nome', {max: 80, ph: 'Ex.: Distribuidora de Bebidas Sol'})}
          ${campo('documento', 'CNPJ ou CPF (opcional)', {modo: 'numeric', ph: '00.000.000/0000-00', mascara: D.mascaraDoc})}
          ${campo('telefone', 'Telefone', {modo: 'tel', ph: '(11) 3333-4444', mascara: D.mascaraTelefone})}
          ${campo('contato', 'Contato (vendedor)', {max: 60, ph: 'Ex.: Marcos'})}
          ${campo('email', 'E-mail', {tipo: 'email', max: 80})}
          ${campo('cidade', 'Cidade', {max: 60})}
          ${campo('endereco', 'Endereço', {largo: true, max: 120})}
          ${campo('obs', 'Observação', {largo: true, max: 200, ph: 'Ex.: entrega às terças; pedido mínimo R$ 300'})}
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (aparece nas compras)</label>
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar por nome, CNPJ, telefone ou cidade..." /></div>
      <${Tabela} colunas=${['Fornecedor', 'CNPJ / CPF', 'Contato', 'Compras', 'A pagar', 'Status']} vazio=${busca ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}>
        ${lista.map(f => html`<tr key=${f.id} className=${f.ativo ? '' : 'rest-inativo'}>
          <td><b>${f.nome}</b>${f.cidade || f.obs ? html`<small className="history-date">${[f.cidade, f.obs].filter(Boolean).join(' · ')}</small>` : null}</td>
          <td className="nowrap">${f.documento || '—'}</td>
          <td>${f.telefone || '—'}${f.contato || f.email ? html`<small className="history-date">${[f.contato, f.email].filter(Boolean).join(' · ')}</small>` : null}</td>
          <td>${compras(f.id) ? (D.podeAcessar('estoque') ? html`<button type="button" className="rest-link" onClick=${() => ir('estoque/entradas')}>${plural(compras(f.id), 'entrada', 'entradas')}</button>` : plural(compras(f.id), 'entrada', 'entradas')) : '—'}</td>
          <td className="nowrap">${emAberto(f.id) ? D.moedaBR(emAberto(f.id)) : '—'}</td>
          <td><${StatusAtivo} ativo=${f.ativo} /></td>
          <td><${Acoes} nome=${f.nome} onEditar=${() => setForm({...FORNECEDOR_VAZIO, ...f})} onExcluir=${() => excluir(f)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Funcionários ----
  const FUNCIONARIO_VAZIO = {id: null, nome: '', cpf: '', telefone: '', cargo: '', admissao: '', salario: '', usuarioId: '', obs: '', ativo: true};
  function TelaFuncionarios(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [cargo, setCargo] = useState('');
    const [form, setForm] = useState(null);
    const todos = D.funcionarios();
    const cargos = [...new Set([...D.CARGOS, ...todos.map(f => f.cargo)])];
    const lista = todos.filter(f => (!cargo || f.cargo === cargo) && (!busca || D.norm(f.nome + ' ' + f.cargo).includes(D.norm(busca)))).sort(porNome);
    const ativos = todos.filter(f => f.ativo);
    const folha = ativos.reduce((s, f) => s + (f.salario || 0), 0);
    const salvar = () => { if (tentar(() => D.salvarFuncionario(form, form.id), f => form.id ? `Funcionário "${f.nome}" atualizado.` : `Funcionário "${f.nome}" cadastrado.`)) setForm(null); };
    const excluir = f => { if (confirmar(`Excluir o funcionário "${f.nome}"? Para quem saiu da empresa, prefira desativar e manter o histórico.`)) tentar(() => D.excluirFuncionario(f.id), `Funcionário "${f.nome}" excluído.`); };
    const editar = f => setForm({...FUNCIONARIO_VAZIO, ...f, salario: f.salario ? D.valorBR(f.salario) : '', usuarioId: f.usuarioId || ''});
    const campo = form && texto(form, setForm);
    const usuarios = D.usuarios().filter(u => u.hash || u.nuvem);
    const podeFinanceiro = D.podeAcessar('financeiro');
    return html`
      <${Cabecalho} titulo="Funcionários" sub=${todos.length ? `${plural(ativos.length, 'funcionário ativo', 'funcionários ativos')}${podeFinanceiro && folha ? ` · folha mensal ${D.moedaBR(folha)}` : ''}` : 'A equipe do restaurante (quem entra no sistema fica em Usuários)'}>
        <button type="button" className="btn" onClick=${() => setForm({...FUNCIONARIO_VAZIO})}>+ Novo funcionário</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar funcionário — ${form.nome}` : 'Novo funcionário'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          ${campo('nome', 'Nome', {max: 80})}
          <${Campo} rotulo="Cargo"><input type="text" list="cargos-mga" value=${form.cargo} maxLength="40" placeholder="Escolha ou digite" onInput=${e => setForm({...form, cargo: e.target.value})} /><//>
          ${campo('cpf', 'CPF (opcional)', {modo: 'numeric', ph: '000.000.000-00', mascara: D.mascaraCpf})}
          ${campo('telefone', 'Telefone', {modo: 'tel', ph: '(11) 98765-4321', mascara: D.mascaraTelefone})}
          <${Campo} rotulo="Admissão"><input type="date" value=${form.admissao} onChange=${e => setForm({...form, admissao: e.target.value})} /><//>
          <${Campo} rotulo="Salário (R$)"><${CampoValor} valor=${form.salario} onChange=${v => setForm(x => ({...x, salario: v}))} /><//>
          <${Campo} rotulo="Usuário do sistema (opcional)">
            <select value=${form.usuarioId} onChange=${e => setForm({...form, usuarioId: e.target.value})}>
              <option value="">— não entra no sistema —</option>
              ${usuarios.map(u => html`<option key=${u.id} value=${u.id}>${u.nome} (${u.login})</option>`)}
            </select>
          <//>
          ${campo('obs', 'Observação', {largo: true, max: 200, ph: 'Ex.: turno da noite; folga às segundas'})}
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (trabalha no restaurante)</label>
        <//>`}
      <datalist id="cargos-mga">${cargos.map(c => html`<option key=${c} value=${c} />`)}</datalist>
      <div className="cad-toolbar">
        <select className="rest-select" value=${cargo} onChange=${e => setCargo(e.target.value)} aria-label="Cargo">
          <option value="">Todos os cargos</option>
          ${cargos.filter(c => todos.some(f => f.cargo === c)).map(c => html`<option key=${c}>${c}</option>`)}
        </select>
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar por nome ou cargo..." />
      </div>
      <${Tabela} colunas=${['Funcionário', 'Cargo', 'Telefone', 'Admissão', ...(podeFinanceiro ? ['Salário'] : []), 'Status']} vazio=${busca || cargo ? 'Nenhum funcionário encontrado.' : 'Nenhum funcionário cadastrado.'}>
        ${lista.map(f => {
          const u = f.usuarioId && D.usuarioPorId(f.usuarioId);
          return html`<tr key=${f.id} className=${f.ativo ? '' : 'rest-inativo'}>
            <td><b>${f.nome}</b>${u || f.cpf ? html`<small className="history-date">${[f.cpf, u && `usuário ${u.login}`].filter(Boolean).join(' · ')}</small>` : null}</td>
            <td>${f.cargo}</td>
            <td className="nowrap">${f.telefone || '—'}</td>
            <td className="nowrap">${f.admissao ? D.dataBR(f.admissao) : '—'}</td>
            ${podeFinanceiro && html`<td className="nowrap">${f.salario ? D.moedaBR(f.salario) : '—'}</td>`}
            <td><${StatusAtivo} ativo=${f.ativo} /></td>
            <td><${Acoes} nome=${f.nome} onEditar=${() => editar(f)} onExcluir=${() => excluir(f)} /></td>
          </tr>`;
        })}
      <//>`;
  }

  // ---- Regiões de entrega ----
  const REGIAO_VAZIA = {id: null, nome: '', cidade: '', bairros: '', taxa: '', tempo: '', ativo: true};
  function TelaRegioes(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null);
    const todas = D.regioes();
    const b = D.norm(busca);
    const lista = todas.filter(r => !busca || D.norm([r.nome, r.cidade, ...r.bairros].join(' ')).includes(b))
      .sort((x, y) => (x.cidade || '').localeCompare(y.cidade || '', 'pt-BR') || x.taxa - y.taxa || porNome(x, y));
    const cidadePadrao = D.config().empresa.cidade || todas[0]?.cidade || '';
    const salvar = () => { if (tentar(() => D.salvarRegiao(form, form.id), r => `Região "${r.nome}" ${form.id ? 'atualizada' : 'cadastrada'}: ${plural(r.bairros.length, 'bairro', 'bairros')}, taxa ${D.moedaBR(r.taxa)}.`)) setForm(null); };
    const excluir = r => { if (confirmar(`Excluir a região "${r.nome}"?`)) tentar(() => D.excluirRegiao(r.id), `Região "${r.nome}" excluída.`); };
    const editar = r => setForm({...r, bairros: r.bairros.join(', '), taxa: D.valorBR(r.taxa), tempo: r.tempo ?? ''});
    const nBairros = todas.filter(r => r.ativo).reduce((s, r) => s + r.bairros.length, 0);
    return html`
      <${Cabecalho} titulo="Regiões de entrega" sub=${todas.length ? `${plural(nBairros, 'bairro atendido', 'bairros atendidos')} · o delivery preenche a taxa pelo bairro do cliente` : 'Agrupe os bairros por taxa de entrega. Fora das regiões vale a taxa padrão (Configurações › Restaurante).'}>
        <button type="button" className="btn" onClick=${() => setForm({...REGIAO_VAZIA, cidade: cidadePadrao})}>+ Nova região</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar região — ${form.nome}` : 'Nova região de entrega'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome da região"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Centro, Zona Norte, Até 3 km" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Cidade"><input type="text" value=${form.cidade} maxLength="60" placeholder="Ex.: Campinas" onInput=${e => setForm({...form, cidade: e.target.value})} /><//>
          <${Campo} rotulo="Taxa de entrega (R$)"><${CampoValor} valor=${form.taxa} onChange=${v => setForm(x => ({...x, taxa: v}))} /><//>
          <${Campo} rotulo="Tempo estimado (min, opcional)"><input type="number" min="1" max="600" value=${form.tempo} placeholder="Ex.: 40" onInput=${e => setForm({...form, tempo: e.target.value})} /><//>
          <${Campo} rotulo="Bairros (separe por vírgula)" largo>
            <textarea rows="3" value=${form.bairros} placeholder="Ex.: Centro, Cambuí, Botafogo, Guanabara" onInput=${e => setForm({...form, bairros: e.target.value})}></textarea>
          <//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa (o delivery usa esta taxa)</label>
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar região, cidade ou bairro..." /></div>
      <${Tabela} colunas=${['Região', 'Cidade', 'Bairros', 'Taxa', 'Tempo', 'Status']} vazio=${busca ? 'Nenhuma região com esse bairro.' : 'Nenhuma região cadastrada.'}>
        ${lista.map(r => html`<tr key=${r.id} className=${r.ativo ? '' : 'rest-inativo'}>
          <td><b>${r.nome}</b></td>
          <td>${r.cidade || html`<span className="rest-cod">qualquer</span>`}</td>
          <td className="rest-bairros-cel">${r.bairros.join(', ')}</td>
          <td className="nowrap"><b>${D.moedaBR(r.taxa)}</b></td>
          <td className="nowrap">${r.tempo ? `${r.tempo} min` : '—'}</td>
          <td><${StatusAtivo} ativo=${r.ativo} /></td>
          <td><${Acoes} nome=${'região ' + r.nome} onEditar=${() => editar(r)} onExcluir=${() => excluir(r)} /></td>
        </tr>`)}
      <//>`;
  }

  Object.assign(window.RestUI.telas, {'cad/fornecedores': TelaFornecedores, 'cad/funcionarios': TelaFuncionarios, 'cad/regioes': TelaRegioes});
})();
