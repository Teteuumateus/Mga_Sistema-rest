// =====================================================================
// ---- 🗂️ MGA · Cadastros: produtos, categorias, clientes, entregadores, usuários e formas de pagamento ----
// =====================================================================
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useEffect} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, StatusAtivo, Acoes, FormCard, Tabela, confirmar, plural} = window.RestUI;

  // ---- Categorias (grupos de produto) ----
  function TelaGrupos({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null); // {id, nome, ativo}
    const lista = D.grupos().filter(g => !busca || D.norm(g.nome).includes(D.norm(busca)));
    const salvar = () => { if (tentar(() => D.salvarGrupo(form, form.id), form.id ? 'Categoria atualizada.' : `Categoria "${form.nome.trim()}" criada.`)) setForm(null); };
    const excluir = g => { if (confirmar(`Excluir a categoria "${g.nome}"?`)) tentar(() => D.excluirGrupo(g.id), `Categoria "${g.nome}" excluída.`); };
    return html`
      <${Cabecalho} titulo="Categorias" sub=${`${plural(D.grupos().length, 'categoria', 'categorias')} · aparecem como botões no PDV`}>
        <button type="button" className="btn" onClick=${() => setForm({id: null, nome: '', ativo: true})}>+ Nova categoria</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? 'Editar categoria' : 'Nova categoria'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome da categoria"><input type="text" value=${form.nome} maxLength="60" placeholder="Ex.: Pizzas" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa (aparece no PDV)</label>
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar categoria..." /></div>
      <${Tabela} colunas=${['Categoria', 'Produtos', 'Status']} vazio=${busca ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada.'}>
        ${lista.map(g => {
          const prods = D.produtosDoGrupo(g.id), ativos = prods.filter(p => p.ativo).length;
          return html`<tr key=${g.id} className=${g.ativo ? '' : 'rest-inativo'}>
            <td><b>${g.nome}</b></td>
            <td><button type="button" className="rest-link" onClick=${() => ir('cad/produtos', {grupo: g.id})} title="Ver os produtos desta categoria">
              ${plural(prods.length, 'produto', 'produtos')}${prods.length !== ativos ? ` (${ativos} ativos)` : ''} →</button></td>
            <td>${g.ativo ? html`<span className="badge b-ok">Ativa</span>` : html`<span className="badge b-wait">Inativa</span>`}</td>
            <td><${Acoes} nome=${g.nome} onEditar=${() => setForm({id: g.id, nome: g.nome, ativo: g.ativo})} onExcluir=${() => excluir(g)} /></td>
          </tr>`;
        })}
      <//>`;
  }

  // ---- Foto do produto: reduz para no máximo 360 px (JPEG) antes de guardar ----
  function lerFoto(arquivo){
    return new Promise((ok, falha) => {
      if (!/^image\//.test(arquivo.type)) { falha(new Error('Escolha um arquivo de imagem (JPG ou PNG).')); return; }
      const leitor = new FileReader();
      leitor.onerror = () => falha(new Error('Não foi possível ler a imagem.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => falha(new Error('Imagem inválida.'));
        img.onload = () => {
          const escala = Math.min(1, 360 / Math.max(img.width, img.height));
          const tela = document.createElement('canvas');
          tela.width = Math.round(img.width * escala); tela.height = Math.round(img.height * escala);
          const ctx = tela.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, tela.width, tela.height); // PNG transparente vira fundo branco
          ctx.drawImage(img, 0, 0, tela.width, tela.height);
          ok(tela.toDataURL('image/jpeg', 0.82));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }
  const margem = (preco, custo) => preco > 0 && custo > 0 ? (preco - custo) / preco * 100 : null;
  const pctBR = v => v.toLocaleString('pt-BR', {maximumFractionDigits: 1}) + '%';

  // ---- Produtos (cadastro completo) ----
  const PRODUTO_VAZIO = {id: null, codigo: '', nome: '', grupoId: '', preco: '', custo: '', estoque: '', unidade: 'UN', foto: '', descricao: '', ativo: true};
  function TelaProdutos({params}){
    const grupoInicial = params.grupo;
    useDados();
    const {el: aviso, tentar, mostrar} = useAviso();
    const [busca, setBusca] = useState('');
    const [grupo, setGrupo] = useState(grupoInicial || '');
    const [inativos, setInativos] = useState(false);
    const [form, setForm] = useState(null);
    useEffect(() => { if (grupoInicial !== undefined) setGrupo(grupoInicial || ''); }, [grupoInicial]);
    const grupos = D.grupos();
    const todos = D.produtos();
    const lista = todos
      .filter(p => (!grupo || p.grupoId === grupo) && (inativos || p.ativo))
      .filter(p => !busca || D.norm(p.nome + ' ' + p.codigo + ' ' + (p.descricao || '')).includes(D.norm(busca)))
      .sort((a, b) => (D.grupoPorId(a.grupoId)?.ordem || 0) - (D.grupoPorId(b.grupoId)?.ordem || 0) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const nInativos = todos.filter(p => !p.ativo).length;
    const num = v => v === '' || v == null ? '' : D.valorBR(v);
    const novo = () => setForm({...PRODUTO_VAZIO, codigo: D.proximoCodigo(), grupoId: grupo || grupos.find(g => g.ativo)?.id || ''});
    const editar = p => setForm({...PRODUTO_VAZIO, ...p, preco: num(p.preco), custo: p.custo ? num(p.custo) : '', estoque: String(p.estoque ?? '').replace('.', ',')});
    const salvar = () => { if (tentar(() => D.salvarProduto(form, form.id), p => form.id ? `Produto "${p.nome}" atualizado.` : `Produto "${p.nome}" cadastrado (cód. ${p.codigo}).`)) setForm(null); };
    const excluir = p => { if (confirmar(`Excluir o produto "${p.nome}"?`)) tentar(() => D.excluirProduto(p.id), `Produto "${p.nome}" excluído.`); };
    const alternar = p => tentar(() => D.salvarProduto({...p, ativo: !p.ativo}, p.id), `"${p.nome}" ${p.ativo ? 'desativado' : 'ativado'}.`);
    const escolherFoto = e => {
      const f = e.target.files[0]; e.target.value = '';
      if (f) lerFoto(f).then(foto => setForm(x => ({...x, foto})), err => mostrar(err.message, true));
    };
    const m = form && margem(D.lerValor(form.preco), D.lerValor(form.custo));
    const valor = k => html`<input type="text" inputMode="decimal" value=${form[k]} placeholder="0,00" onInput=${e => setForm({...form, [k]: e.target.value})}
      onBlur=${() => { const v = D.lerValor(form[k]); if (Number.isFinite(v)) setForm(f => ({...f, [k]: D.valorBR(v)})); }} />`;
    return html`
      <${Cabecalho} titulo="Produtos" sub=${`${plural(todos.length - nInativos, 'produto ativo', 'produtos ativos')}${nInativos ? ` · ${nInativos} inativo${nInativos === 1 ? '' : 's'}` : ''} em ${plural(grupos.length, 'categoria', 'categorias')}`}>
        <button type="button" className="btn" onClick=${novo} disabled=${!grupos.length} title=${grupos.length ? '' : 'Cadastre uma categoria primeiro'}>+ Novo produto</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar produto — ${form.nome}` : 'Novo produto'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <div className="rest-foto-campo rest-largo">
            <div className="rest-foto-previa">${form.foto ? html`<img src=${form.foto} alt="Foto do produto" />` : html`<span aria-hidden="true">📷</span>`}</div>
            <div className="rest-foto-acoes">
              <b>Foto</b><small>JPG ou PNG. É reduzida automaticamente.</small>
              <div className="rest-form-acoes">
                <label className="btn btn-ghost rest-foto-btn">${form.foto ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" hidden onChange=${escolherFoto} /></label>
                ${form.foto && html`<button type="button" className="btn btn-ghost" onClick=${() => setForm({...form, foto: ''})}>Remover</button>`}
              </div>
            </div>
          </div>
          <${Campo} rotulo="Código"><input type="text" value=${form.codigo} maxLength="20" onInput=${e => setForm({...form, codigo: e.target.value.toUpperCase().replace(/\s/g, '')})} /><//>
          <${Campo} rotulo="Nome" largo><input type="text" value=${form.nome} maxLength="80" placeholder="Ex.: Filé Mignon à Parmegiana" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Categoria">
            <select value=${form.grupoId} onChange=${e => setForm({...form, grupoId: e.target.value})}>
              <option value="" disabled>Escolha...</option>
              ${grupos.map(g => html`<option key=${g.id} value=${g.id}>${g.nome}${g.ativo ? '' : ' (inativa)'}</option>`)}
            </select>
          <//>
          <${Campo} rotulo="Preço de venda (R$)">${valor('preco')}<//>
          <${Campo} rotulo=${'Custo (R$)' + (m != null ? ` · margem ${pctBR(m)}` : '')}>${valor('custo')}<//>
          <${Campo} rotulo="Estoque atual"><input type="text" inputMode="decimal" value=${form.estoque} placeholder="0" onInput=${e => setForm({...form, estoque: e.target.value})} /><//>
          <${Campo} rotulo="Unidade">
            <select value=${form.unidade} onChange=${e => setForm({...form, unidade: e.target.value})}>${D.UNIDADES.map(u => html`<option key=${u}>${u}</option>`)}</select>
          <//>
          <${Campo} rotulo="Descrição" largo><input type="text" value=${form.descricao} maxLength="200" placeholder="Ingredientes, tamanho, observações para o atendente" onInput=${e => setForm({...form, descricao: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (aparece no PDV)</label>
        <//>`}
      <div className="rest-chips" role="group" aria-label="Filtrar por categoria">
        ${[{id: '', nome: 'Todos'}, ...grupos].map(g => {
          const n = g.id ? todos.filter(p => p.grupoId === g.id && (inativos || p.ativo)).length : todos.filter(p => inativos || p.ativo).length;
          return html`<button type="button" key=${g.id || 'todos'} className=${'fn-chip' + (grupo === g.id ? ' active' : '')} aria-pressed=${grupo === g.id} onClick=${() => setGrupo(g.id)}>${g.nome} <small>${n}</small></button>`;
        })}
      </div>
      <div className="cad-toolbar">
        <${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar por nome, código ou descrição..." />
        <label className="rest-check"><input type="checkbox" checked=${inativos} onChange=${e => setInativos(e.target.checked)} /> Mostrar inativos</label>
      </div>
      <${Tabela} colunas=${['Cód.', 'Produto', 'Categoria', 'Preço', 'Custo', 'Estoque', 'Status']} vazio=${busca || grupo ? 'Nenhum produto encontrado com esse filtro.' : 'Nenhum produto cadastrado.'}>
        ${lista.map(p => {
          const mg = margem(p.preco, p.custo);
          return html`<tr key=${p.id} className=${p.ativo ? '' : 'rest-inativo'}>
            <td className="nowrap rest-cod">${p.codigo}</td>
            <td><div className="rest-prod-cel">
              ${p.foto ? html`<img className="rest-prod-mini" src=${p.foto} alt="" />` : html`<span className="rest-prod-mini rest-prod-sem" aria-hidden="true">🍽️</span>`}
              <div><b>${p.nome}</b>${p.descricao ? html`<small className="history-date">${p.descricao}</small>` : null}</div>
            </div></td>
            <td>${D.grupoPorId(p.grupoId)?.nome || '—'}</td>
            <td className="nowrap"><b>${D.moedaBR(p.preco)}</b></td>
            <td className="nowrap">${p.custo ? html`${D.moedaBR(p.custo)}<small className="history-date">margem ${pctBR(mg)}</small>` : html`<span className="rest-cod">—</span>`}</td>
            <td className="nowrap">${String(p.estoque ?? 0).replace('.', ',')} <small className="rest-cod">${p.unidade}</small></td>
            <td><button type="button" className="rest-status-btn" onClick=${() => alternar(p)} title=${p.ativo ? 'Clique para desativar' : 'Clique para ativar'}><${StatusAtivo} ativo=${p.ativo} /></button></td>
            <td><${Acoes} nome=${p.nome} onEditar=${() => editar(p)} onExcluir=${() => excluir(p)} /></td>
          </tr>`;
        })}
      <//>`;
  }

  // ---- Clientes ----
  const CLIENTE_VAZIO = {id: null, nome: '', telefone: '', endereco: '', numero: '', complemento: '', bairro: '', cep: '', cidade: '', referencia: ''};
  function TelaClientes(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null);
    const todos = D.clientes();
    const b = D.norm(busca), bDig = busca.replace(/\D/g, '');
    const lista = todos
      .filter(c => !busca || D.norm([c.nome, c.bairro, c.endereco, c.cidade].join(' ')).includes(b) || (bDig && String(c.telefone || '').replace(/\D/g, '').includes(bDig)))
      .slice().sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    const campo = (k, rotulo, extra = {}) => html`<${Campo} rotulo=${rotulo} largo=${extra.largo}>
      <input type="text" value=${form[k]} maxLength=${extra.max || 120} placeholder=${extra.ph || ''} inputMode=${extra.modo || 'text'}
        onInput=${e => setForm({...form, [k]: extra.mascara ? extra.mascara(e.target.value) : e.target.value})} />
    <//>`;
    const salvar = () => { if (tentar(() => D.salvarCliente(form, form.id), c => form.id ? `Cliente "${c.nome}" atualizado.` : `Cliente "${c.nome}" cadastrado.`)) setForm(null); };
    const excluir = c => { if (confirmar(`Excluir o cliente "${c.nome}"?`)) tentar(() => D.excluirCliente(c.id), `Cliente "${c.nome}" excluído.`); };
    const comEndereco = todos.filter(c => c.endereco && c.bairro).length;
    return html`
      <${Cabecalho} titulo="Clientes" sub=${`${plural(todos.length, 'cliente', 'clientes')} · ${comEndereco} com endereço de entrega completo`}>
        <button type="button" className="btn" onClick=${() => setForm({...CLIENTE_VAZIO})}>+ Novo cliente</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar cliente — ${form.nome}` : 'Novo cliente'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          ${campo('nome', 'Nome', {max: 80, ph: 'Nome completo'})}
          ${campo('telefone', 'Telefone', {ph: '(11) 98765-4321', modo: 'tel', mascara: D.mascaraTelefone})}
          ${campo('endereco', 'Endereço', {largo: true, ph: 'Rua, número'})}
          ${campo('complemento', 'Complemento', {ph: 'Apto, bloco, referência'})}
          ${campo('bairro', 'Bairro', {max: 60})}
          ${campo('cep', 'CEP', {ph: '00000-000', modo: 'numeric', mascara: D.mascaraCep})}
          ${campo('cidade', 'Cidade', {max: 60})}
          ${campo('referencia', 'Referência', {largo: true, ph: 'Ponto de referência para o entregador'})}
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar por nome, telefone, bairro..." /></div>
      <${Tabela} colunas=${['Cliente', 'Telefone', 'Endereço', 'Bairro', 'Cidade / CEP']} vazio=${busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}>
        ${lista.map(c => html`<tr key=${c.id}>
          <td><b>${c.nome}</b></td>
          <td className="nowrap">${c.telefone || '—'}</td>
          <td>${c.endereco ? c.endereco + (c.numero ? ', ' + c.numero : '') : '—'}${c.complemento ? html`<small className="history-date">${c.complemento}</small>` : null}</td>
          <td>${c.bairro || '—'}</td>
          <td>${c.cidade || '—'}${c.cep ? html`<small className="history-date">${c.cep}</small>` : null}</td>
          <td><${Acoes} nome=${c.nome} onEditar=${() => setForm({...CLIENTE_VAZIO, ...Object.fromEntries(Object.keys(CLIENTE_VAZIO).map(k => [k, c[k] || ''])), id: c.id})} onExcluir=${() => excluir(c)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Entregadores ----
  function TelaEntregadores(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [busca, setBusca] = useState('');
    const [form, setForm] = useState(null);
    const todos = D.entregadores();
    const lista = todos.filter(e => !busca || D.norm(e.nome + ' ' + e.placa).includes(D.norm(busca))).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const salvar = () => { if (tentar(() => D.salvarEntregador(form, form.id), e => form.id ? `Entregador "${e.nome}" atualizado.` : `Entregador "${e.nome}" cadastrado.`)) setForm(null); };
    const excluir = e => { if (confirmar(`Excluir o entregador "${e.nome}"?`)) tentar(() => D.excluirEntregador(e.id), `Entregador "${e.nome}" excluído.`); };
    const ativos = todos.filter(e => e.ativo).length;
    return html`
      <${Cabecalho} titulo="Entregadores" sub=${todos.length ? `${plural(ativos, 'entregador ativo', 'entregadores ativos')} de ${todos.length}` : 'Cadastre quem faz as entregas do delivery'}>
        <button type="button" className="btn" onClick=${() => setForm({id: null, nome: '', telefone: '', veiculo: D.VEICULOS[0], placa: '', ativo: true})}>+ Novo entregador</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar entregador — ${form.nome}` : 'Novo entregador'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="80" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Telefone"><input type="text" inputMode="tel" value=${form.telefone} placeholder="(11) 98765-4321" onInput=${e => setForm({...form, telefone: D.mascaraTelefone(e.target.value)})} /><//>
          <${Campo} rotulo="Veículo">
            <select value=${form.veiculo} onChange=${e => setForm({...form, veiculo: e.target.value})}>${D.VEICULOS.map(v => html`<option key=${v}>${v}</option>`)}</select>
          <//>
          <${Campo} rotulo="CPF (opcional)"><input type="text" inputMode="numeric" value=${form.cpf || ''} placeholder="000.000.000-00" onInput=${e => setForm({...form, cpf: D.mascaraCpf(e.target.value)})} /><//>
          <${Campo} rotulo="Placa"><input type="text" value=${form.placa} maxLength="8" placeholder=${form.veiculo === 'Moto' || form.veiculo === 'Carro' ? 'ABC1D23' : 'opcional'} onInput=${e => setForm({...form, placa: e.target.value.toUpperCase()})} /><//>
          <${Campo} rotulo="Observação" largo><input type="text" maxLength="200" value=${form.obs || ''} placeholder="Ex.: só trabalha à noite" onInput=${e => setForm({...form, obs: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (pode receber entregas)</label>
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar por nome ou placa..." /></div>
      <${Tabela} colunas=${['Entregador', 'Telefone', 'CPF', 'Veículo', 'Status']} vazio=${busca ? 'Nenhum entregador encontrado.' : 'Nenhum entregador cadastrado ainda.'}>
        ${lista.map(e => html`<tr key=${e.id} className=${e.ativo ? '' : 'rest-inativo'}>
          <td><b>${e.nome}</b>${e.obs ? html`<small className="history-date">${e.obs}</small>` : null}</td>
          <td className="nowrap">${e.telefone || '—'}</td>
          <td className="nowrap">${e.cpf || '—'}</td>
          <td>${e.veiculo}${e.placa ? html`<small className="history-date">${e.placa}</small>` : null}</td>
          <td><${StatusAtivo} ativo=${e.ativo} /></td>
          <td><${Acoes} nome=${e.nome} onEditar=${() => setForm({...e})} onExcluir=${() => excluir(e)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Usuários e permissões (só administrador: módulo Configurações) ----
  const USUARIO_VAZIO = {id: null, nome: '', login: '', perfil: 'CAIXA', modulos: D.PERFIS.CAIXA.modulos, ativo: true, senha: '', confirmar: ''};
  function TelaUsuarios(){
    useDados();
    const {el: aviso, tentar, mostrar} = useAviso();
    const [form, setForm] = useState(null);
    const [salvando, setSalvando] = useState(false);
    const eu = D.sessaoAtual();
    const lista = D.usuarios().filter(u => u.hash).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const editar = u => setForm({...USUARIO_VAZIO, id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, modulos: D.modulosDo(u), ativo: u.ativo});
    // Trocar o perfil sugere os módulos padrão dele (o administrador ainda pode ajustar)
    const mudarPerfil = perfil => setForm({...form, perfil, modulos: D.PERFIS[perfil].modulos});
    const alternarModulo = m => setForm({...form, modulos: form.modulos.includes(m) ? form.modulos.filter(x => x !== m) : [...form.modulos, m]});
    const salvar = async () => {
      setSalvando(true);
      try { const u = await D.salvarUsuario(form, form.id); mostrar(form.id ? `Usuário "${u.nome}" atualizado.` : `Usuário "${u.nome}" cadastrado. Ele entra com o login "${u.login}".`); setForm(null); }
      catch (e) { mostrar(e.regra ? e.message : 'Erro inesperado: ' + e.message, true); }
      finally { setSalvando(false); }
    };
    const excluir = u => { if (confirmar(`Excluir o usuário "${u.nome}"?`)) tentar(() => D.excluirUsuario(u.id), `Usuário "${u.nome}" excluído.`); };
    const admin = form?.perfil === 'ADMIN';
    return html`
      <${Cabecalho} titulo="Usuários" sub="Quem entra no sistema e quais módulos cada um acessa">
        <button type="button" className="btn" onClick=${() => setForm({...USUARIO_VAZIO})}>+ Novo usuário</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar usuário — ${form.nome}` : 'Novo usuário'} onSalvar=${salvar} onCancelar=${() => setForm(null)} rotuloSalvar=${salvando ? 'Salvando...' : 'Salvar'}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="60" placeholder="Ex.: João da Silva" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Login (para entrar)"><input type="text" value=${form.login} maxLength="30" autoCapitalize="none" spellCheck="false" placeholder="Ex.: joao" onInput=${e => setForm({...form, login: e.target.value.toLowerCase().replace(/\s/g, '')})} /><//>
          <${Campo} rotulo="Perfil">
            <select value=${form.perfil} onChange=${e => mudarPerfil(e.target.value)}>${Object.entries(D.PERFIS).map(([k, p]) => html`<option key=${k} value=${k}>${p.nome}</option>`)}</select>
          <//>
          <${Campo} rotulo=${form.id ? 'Nova senha (vazio = mantém)' : 'Senha'}><input type="password" value=${form.senha} autoComplete="new-password" onInput=${e => setForm({...form, senha: e.target.value})} /><//>
          <${Campo} rotulo="Repita a senha"><input type="password" value=${form.confirmar} autoComplete="new-password" onInput=${e => setForm({...form, confirmar: e.target.value})} /><//>
          <fieldset className="rest-modulos rest-largo">
            <legend>Módulos que acessa ${admin ? '(administrador acessa tudo)' : ''}</legend>
            ${Object.entries(D.MODULOS).map(([k, nome]) => html`<label key=${k} className="rest-check"><input type="checkbox" disabled=${admin} checked=${admin || form.modulos.includes(k)} onChange=${() => alternarModulo(k)} /> ${nome}</label>`)}
          </fieldset>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (pode entrar no sistema)</label>
        <//>`}
      <${Tabela} colunas=${['Usuário', 'Login', 'Perfil', 'Módulos', 'Status']} vazio="Nenhum usuário.">
        ${lista.map(u => html`<tr key=${u.id} className=${u.ativo ? '' : 'rest-inativo'}>
          <td><b>${u.nome}</b>${u.id === eu?.id ? html`<small className="history-date">você</small>` : null}</td>
          <td className="rest-cod">${u.login}</td>
          <td>${D.PERFIS[u.perfil].nome}</td>
          <td className="rest-modulos-cel">${D.ehAdmin(u) ? 'Todos' : D.modulosDo(u).map(m => D.MODULOS[m]).join(', ') || '—'}</td>
          <td>${u.ativo ? html`<span className="badge b-ok">Ativo</span>` : html`<span className="badge b-wait">Inativo</span>`}</td>
          <td><${Acoes} nome=${u.nome} onEditar=${() => editar(u)} onExcluir=${u.id === eu?.id ? null : () => excluir(u)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Formas de pagamento ----
  function TelaFormas(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const lista = D.formas().slice().sort((a, b) => a.ordem - b.ordem);
    const salvar = () => { if (tentar(() => D.salvarForma(form, form.id), f => `Forma "${f.nome}" ${form.id ? 'atualizada' : 'cadastrada'}.`)) setForm(null); };
    const excluir = f => { if (confirmar(`Excluir a forma de pagamento "${f.nome}"?`)) tentar(() => D.excluirForma(f.id), `Forma "${f.nome}" excluída.`); };
    const alternar = f => tentar(() => D.salvarForma({...f, ativo: !f.ativo}, f.id), `"${f.nome}" ${f.ativo ? 'desativada' : 'ativada'}.`);
    const AJUDA = {DINHEIRO: 'Entra na gaveta e permite troco', PIX: 'Não entra na gaveta', DEBITO: 'Não entra na gaveta', CREDITO: 'Não entra na gaveta',
      PRAZO: 'Vira conta a receber do cliente (exige cliente na venda)', OUTROS: 'Vale-refeição, cheque, cortesia...'};
    return html`
      <${Cabecalho} titulo="Formas de pagamento" sub="As formas ativas aparecem na finalização da venda. O tipo define como o valor entra no caixa.">
        <button type="button" className="btn" onClick=${() => setForm({id: null, nome: '', tipo: 'OUTROS', ativo: true})}>+ Nova forma</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? 'Editar forma de pagamento' : 'Nova forma de pagamento'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Vale-refeição" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Tipo">
            <select value=${form.tipo} onChange=${e => setForm({...form, tipo: e.target.value})}>${Object.entries(D.TIPOS_FORMA).map(([k, n]) => html`<option key=${k} value=${k}>${n}</option>`)}</select>
          <//>
          <p className="dv-ajuda rest-largo">${AJUDA[form.tipo]}</p>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa (aparece no pagamento)</label>
        <//>`}
      <${Tabela} colunas=${['Forma', 'Tipo', 'Como funciona', 'Status']} vazio="Nenhuma forma de pagamento.">
        ${lista.map(f => html`<tr key=${f.id} className=${f.ativo ? '' : 'rest-inativo'}>
          <td><b>${f.nome}</b></td>
          <td>${D.TIPOS_FORMA[f.tipo]}</td>
          <td className="rest-cod">${AJUDA[f.tipo]}</td>
          <td><button type="button" className="rest-status-btn" onClick=${() => alternar(f)} title=${f.ativo ? 'Clique para desativar' : 'Clique para ativar'}>${f.ativo ? html`<span className="badge b-ok">Ativa</span>` : html`<span className="badge b-wait">Inativa</span>`}</button></td>
          <td><${Acoes} nome=${f.nome} onEditar=${() => setForm({...f})} onExcluir=${() => excluir(f)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Mesas ----
  function TelaCadMesas({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const lista = D.mesas();
    const salvar = () => { if (tentar(() => D.salvarMesa(form, form.id), m => `Mesa ${m.numero} ${form.id ? 'atualizada' : 'cadastrada'}.`)) setForm(null); };
    const excluir = m => { if (confirmar(`Excluir a mesa ${m.numero}?`)) tentar(() => D.excluirMesa(m.id), `Mesa ${m.numero} excluída.`); };
    // Próximo número livre, para cadastrar em sequência
    const proxima = () => { let n = 1; while (lista.some(m => m.numero === String(n).padStart(2, '0'))) n++; return String(n).padStart(2, '0'); };
    return html`
      <${Cabecalho} titulo="Mesas" sub=${`${plural(lista.filter(m => m.ativo).length, 'mesa ativa', 'mesas ativas')} · aparecem no mapa de Mesas`}>
        <button type="button" className="btn btn-ghost" onClick=${() => ir('mesas')}>Ver mapa</button>
        <button type="button" className="btn" onClick=${() => setForm({id: null, numero: proxima(), descricao: '', lugares: 4, ativo: true})}>+ Nova mesa</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar mesa ${form.numero}` : 'Nova mesa'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Número ou nome"><input type="text" value=${form.numero} maxLength="12" placeholder="Ex.: 25 ou VIP" onInput=${e => setForm({...form, numero: e.target.value})} /><//>
          <${Campo} rotulo="Lugares"><input type="number" min="0" max="99" value=${form.lugares} onInput=${e => setForm({...form, lugares: e.target.value})} /><//>
          <${Campo} rotulo="Local / descrição"><input type="text" value=${form.descricao} maxLength="40" placeholder="Ex.: Varanda" onInput=${e => setForm({...form, descricao: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa (aparece no mapa)</label>
        <//>`}
      <${Tabela} colunas=${['Mesa', 'Local', 'Lugares', 'Situação', 'Status']} vazio="Nenhuma mesa cadastrada.">
        ${lista.map(m => {
          const v = D.vendaDaMesa(m.id);
          return html`<tr key=${m.id} className=${m.ativo ? '' : 'rest-inativo'}>
            <td><b>${m.numero}</b></td>
            <td>${m.descricao || '—'}</td>
            <td>${m.lugares || '—'}</td>
            <td>${v ? html`<button type="button" className="rest-link" onClick=${() => ir('mesas/pedido', {id: v.id})}>Ocupada · ${D.moedaBR(D.totaisVenda(v).total)} →</button>` : 'Livre'}</td>
            <td>${m.ativo ? html`<span className="badge b-ok">Ativa</span>` : html`<span className="badge b-wait">Inativa</span>`}</td>
            <td><${Acoes} nome=${'mesa ' + m.numero} onEditar=${() => setForm({...m})} onExcluir=${() => excluir(m)} /></td>
          </tr>`;
        })}
      <//>`;
  }

  Object.assign(window.RestUI.telas, {
    'cad/mesas': TelaCadMesas,
    'cad/usuarios': TelaUsuarios, 'cad/formas': TelaFormas,
    'cad/grupos': TelaGrupos, 'cad/produtos': TelaProdutos, 'cad/clientes': TelaClientes, 'cad/entregadores': TelaEntregadores
  });
})();
