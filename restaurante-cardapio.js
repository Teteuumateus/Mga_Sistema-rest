// =====================================================================
// ---- 🍔 MGA · Cardápio: adicionais e etapas, promoções ----
// =====================================================================
// Adicionais/etapas: grupos de opções que o atendente escolhe ao vender (ponto da carne, extras...).
// Promoções: preço especial por dia da semana, horário e período (happy hour, prato do dia...).
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState} = React;
  const {html, D, useDados, useAviso, Cabecalho, Busca, Campo, CampoValor, StatusAtivo, Acoes, FormCard, Tabela, Segmentos, confirmar, plural} = window.RestUI;
  const chave = () => 'k' + Math.random().toString(36).slice(2, 9);
  const regra = g => g.min && g.max === g.min ? `escolha ${g.min}` : g.min ? `escolha de ${g.min}${g.max ? ` a ${g.max}` : ' ou mais'}` : g.max ? `opcional · até ${g.max}` : 'opcional · sem limite';

  // ---- Adicionais e etapas ----
  const GRUPO_VAZIO = {id: null, nome: '', min: '0', max: '0', ativo: true, opcoes: []};
  function TelaAdicionais({ir}){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const [busca, setBusca] = useState('');
    const lista = D.adicionais().filter(g => !busca || D.norm(g.nome + ' ' + g.opcoes.map(o => o.nome).join(' ')).includes(D.norm(busca)))
      .slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const usados = id => D.produtos().filter(p => (p.gruposAdicionais || []).includes(id));
    const novo = (modelo = {}) => setForm({...GRUPO_VAZIO, ...modelo, opcoes: (modelo.opcoes || [{nome: '', preco: ''}]).map(o => ({...o, key: chave()}))});
    const editar = g => setForm({...g, min: String(g.min), max: String(g.max), opcoes: g.opcoes.map(o => ({...o, key: o.id, preco: o.preco ? D.valorBR(o.preco) : ''}))});
    const mudar = (key, k, v) => setForm(f => ({...f, opcoes: f.opcoes.map(o => o.key === key ? {...o, [k]: v} : o)}));
    const salvar = () => { if (tentar(() => D.salvarGrupoAdicional(form, form.id), g => `"${g.nome}" ${form.id ? 'atualizado' : 'cadastrado'}. Ligue aos produtos no cadastro de cada produto.`)) setForm(null); };
    const excluir = g => { if (confirmar(`Excluir o grupo "${g.nome}"?`)) tentar(() => D.excluirGrupoAdicional(g.id), `"${g.nome}" excluído.`); };
    // Modelos prontos para começar rápido
    const MODELOS = [
      {nome: 'Ponto da carne', min: '1', max: '1', opcoes: [{nome: 'Mal passada'}, {nome: 'Ao ponto'}, {nome: 'Bem passada'}]},
      {nome: 'Extras', min: '0', max: '3', opcoes: [{nome: 'Bacon', preco: '4,00'}, {nome: 'Cheddar', preco: '3,50'}, {nome: 'Ovo', preco: '2,00'}]},
      {nome: 'Acompanhamento', min: '1', max: '2', opcoes: [{nome: 'Arroz'}, {nome: 'Feijão'}, {nome: 'Fritas', preco: '5,00'}, {nome: 'Salada'}]}
    ];
    return html`
      <${Cabecalho} titulo="Adicionais e etapas" sub="Opções escolhidas na hora de vender. Com mínimo 1 vira etapa obrigatória (ex.: ponto da carne); com mínimo 0 é adicional (ex.: extras).">
        <button type="button" className="btn" onClick=${() => novo()}>+ Novo grupo</button>
      <//>
      ${aviso}
      ${!form && !D.adicionais().length && html`<div className="rest-dica-est">Comece por um modelo:
        ${MODELOS.map(m => html` <button type="button" key=${m.nome} className="rest-link" onClick=${() => novo(m)}>${m.nome}</button>`)}</div>`}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar — ${form.nome}` : 'Novo grupo de adicionais'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome do grupo"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Ponto da carne, Extras, Molhos" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Mínimo (0 = opcional)"><input type="number" min="0" max="20" value=${form.min} onInput=${e => setForm({...form, min: e.target.value})} /><//>
          <${Campo} rotulo="Máximo (0 = sem limite)"><input type="number" min="0" max="20" value=${form.max} onInput=${e => setForm({...form, max: e.target.value})} /><//>
          <p className="dv-ajuda rest-largo">Regra: <b>${regra({min: Number(form.min) || 0, max: Number(form.max) || 0})}</b>. Para escolha única (só uma opção), use mínimo 1 e máximo 1.</p>
          <fieldset className="rest-bloco rest-largo">
            <legend>Opções <small>preço em branco = sem custo extra</small></legend>
            ${form.opcoes.map(o => html`<div key=${o.key} className="rest-linha-edit">
              <input type="text" value=${o.nome} maxLength="40" placeholder="Nome (ex.: Bacon)" aria-label="Nome da opção" onInput=${e => mudar(o.key, 'nome', e.target.value)} />
              <input type="text" inputMode="decimal" value=${o.preco} placeholder="+ R$ 0,00" aria-label="Preço adicional" onInput=${e => mudar(o.key, 'preco', e.target.value)} />
              <label className="rest-check" title="Opção disponível"><input type="checkbox" checked=${o.ativo !== false} onChange=${e => mudar(o.key, 'ativo', e.target.checked)} /> ativa</label>
              <button type="button" className="rest-car-rm" aria-label="Tirar opção" onClick=${() => setForm(f => ({...f, opcoes: f.opcoes.filter(x => x.key !== o.key)}))}>✕</button>
            </div>`)}
            <button type="button" className="rest-link" onClick=${() => setForm(f => ({...f, opcoes: [...f.opcoes, {key: chave(), nome: '', preco: ''}]}))}>+ Adicionar opção</button>
          </fieldset>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo</label>
        <//>`}
      <div className="cad-toolbar"><${Busca} valor=${busca} onChange=${setBusca} placeholder="Buscar grupo ou opção..." /></div>
      <${Tabela} colunas=${['Grupo', 'Regra', 'Opções', 'Produtos', 'Status']} vazio=${busca ? 'Nenhum grupo encontrado.' : 'Nenhum grupo cadastrado.'}>
        ${lista.map(g => html`<tr key=${g.id} className=${g.ativo ? '' : 'rest-inativo'}>
          <td><b>${g.nome}</b></td>
          <td>${g.min ? html`<span className="badge b-wait">obrigatório</span> ` : null}<small className="rest-cod">${regra(g)}</small></td>
          <td className="rest-bairros-cel">${g.opcoes.map(o => `${o.nome}${o.preco ? ` (+${D.moedaBR(o.preco)})` : ''}${o.ativo === false ? ' · inativa' : ''}`).join(', ')}</td>
          <td>${usados(g.id).length ? html`<span title=${usados(g.id).map(p => p.nome).join(', ')}>${plural(usados(g.id).length, 'produto', 'produtos')}</span>` : html`<button type="button" className="rest-link" onClick=${() => ir('cad/produtos')}>ligar a produtos →</button>`}</td>
          <td><${StatusAtivo} ativo=${g.ativo} /></td>
          <td><${Acoes} nome=${g.nome} onEditar=${() => editar(g)} onExcluir=${() => excluir(g)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Promoções ----
  const PROMO_VAZIA = {id: null, nome: '', alvo: 'PRODUTO', ids: [], tipo: 'PERCENTUAL', valor: '', dias: [], horaIni: '', horaFim: '', de: '', ate: '', ativo: true};
  function TelaPromocoes(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const [buscaProd, setBuscaProd] = useState('');
    const lista = D.promocoes().slice().sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const agora = new Date();
    const valendo = x => D.produtos().some(p => D.promocoesVigentes(p, agora).some(y => y.id === x.id));
    const editar = x => setForm({...x, valor: x.tipo === 'PRECO' ? D.valorBR(x.valor) : String(x.valor).replace('.', ',')});
    const salvar = () => { if (tentar(() => D.salvarPromocao(form, form.id), x => `Promoção "${x.nome}" ${form.id ? 'atualizada' : 'cadastrada'}: ${D.descreverPromocao(x)}.`)) setForm(null); };
    const excluir = x => { if (confirmar(`Excluir a promoção "${x.nome}"?`)) tentar(() => D.excluirPromocao(x.id), `Promoção "${x.nome}" excluída.`); };
    const alternarId = id => setForm(f => ({...f, ids: f.ids.includes(id) ? f.ids.filter(x => x !== id) : [...f.ids, id]}));
    const alternarDia = d => setForm(f => ({...f, dias: f.dias.includes(d) ? f.dias.filter(x => x !== d) : [...f.dias, d]}));
    const nomeAlvo = x => x.ids.map(id => (x.alvo === 'PRODUTO' ? D.produtoPorId(id) : D.grupoPorId(id))?.nome).filter(Boolean);
    const opcoesAlvo = form && (form.alvo === 'PRODUTO'
      ? D.produtos().filter(p => p.tipo !== 'INSUMO' && (p.ativo || form.ids.includes(p.id)) && (!buscaProd || D.norm(p.nome).includes(D.norm(buscaProd))))
      : D.grupos());
    return html`
      <${Cabecalho} titulo="Promoções" sub="Preço especial por dia da semana, horário e período. Vale no PDV, nas mesas e no delivery automaticamente.">
        <button type="button" className="btn" onClick=${() => { setBuscaProd(''); setForm({...PROMO_VAZIA}); }}>+ Nova promoção</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar promoção — ${form.nome}` : 'Nova promoção'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Happy hour, Prato do dia" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Vale para">
            <select value=${form.alvo} onChange=${e => { const tipo = e.target.value === 'CATEGORIA' ? 'PERCENTUAL' : form.tipo; setForm({...form, alvo: e.target.value, ids: [], tipo, valor: tipo === form.tipo ? form.valor : ''}); }}>
              <option value="PRODUTO">Produtos escolhidos</option><option value="CATEGORIA">Categorias inteiras</option>
            </select>
          <//>
          <${Campo} rotulo="Tipo de desconto">
            <select value=${form.tipo} onChange=${e => setForm({...form, tipo: e.target.value, valor: ''})}>
              <option value="PERCENTUAL">Desconto em %</option>
              ${form.alvo === 'PRODUTO' && html`<option value="PRECO">Preço fixo (R$)</option>`}
            </select>
          <//>
          <${Campo} rotulo=${form.tipo === 'PRECO' ? 'Preço promocional (R$)' : 'Desconto (%)'}>
            ${form.tipo === 'PRECO' ? html`<${CampoValor} valor=${form.valor} onChange=${v => setForm(f => ({...f, valor: v}))} />`
              : html`<input type="text" inputMode="decimal" value=${form.valor} placeholder="Ex.: 20" onInput=${e => setForm({...form, valor: e.target.value})} />`}
          <//>
          <fieldset className="rest-bloco rest-largo">
            <legend>${form.alvo === 'PRODUTO' ? 'Produtos' : 'Categorias'} <small>${plural(form.ids.length, 'escolhido', 'escolhidos')}</small></legend>
            ${form.alvo === 'PRODUTO' && html`<input type="search" className="search rest-busca" value=${buscaProd} placeholder="Filtrar produtos..." aria-label="Filtrar produtos" onInput=${e => setBuscaProd(e.target.value)} />`}
            <div className="rest-bloco-checks rest-bloco-rolagem">${opcoesAlvo.map(x => html`<label key=${x.id} className="rest-check">
              <input type="checkbox" checked=${form.ids.includes(x.id)} onChange=${() => alternarId(x.id)} /> ${x.nome}${form.alvo === 'PRODUTO' ? html` <small className="rest-cod">${D.moedaBR(x.preco)}</small>` : null}</label>`)}</div>
          </fieldset>
          <fieldset className="rest-bloco rest-largo">
            <legend>Quando vale <small>sem dias marcados = todos os dias; sem horário = o dia todo</small></legend>
            <div className="rest-bloco-checks">${D.DIAS_SEMANA.map((n, d) => html`<label key=${n} className="rest-check"><input type="checkbox" checked=${form.dias.includes(d)} onChange=${() => alternarDia(d)} /> ${n}</label>`)}</div>
            <div className="form-grid">
              <div className="field"><label htmlFor="prIni">Das (hora)</label><input id="prIni" type="time" value=${form.horaIni} onChange=${e => setForm({...form, horaIni: e.target.value})} /></div>
              <div className="field"><label htmlFor="prFim">Até (hora)</label><input id="prFim" type="time" value=${form.horaFim} onChange=${e => setForm({...form, horaFim: e.target.value})} /></div>
              <div className="field"><label htmlFor="prDe">A partir de (data)</label><input id="prDe" type="date" value=${form.de} onChange=${e => setForm({...form, de: e.target.value})} /></div>
              <div className="field"><label htmlFor="prAte">Até (data)</label><input id="prAte" type="date" value=${form.ate} onChange=${e => setForm({...form, ate: e.target.value})} /></div>
            </div>
          </fieldset>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa</label>
        <//>`}
      <${Tabela} colunas=${['Promoção', 'Vale para', 'Quando', 'Agora', 'Status']} vazio="Nenhuma promoção cadastrada.">
        ${lista.map(x => {
          const alvos = nomeAlvo(x);
          return html`<tr key=${x.id} className=${x.ativo ? '' : 'rest-inativo'}>
            <td><b>${x.nome}</b><small className="history-date">${x.tipo === 'PRECO' ? `por ${D.moedaBR(x.valor)}` : `${String(x.valor).replace('.', ',')}% de desconto`}</small></td>
            <td className="rest-bairros-cel">${x.alvo === 'CATEGORIA' ? 'Categorias: ' : ''}${alvos.slice(0, 4).join(', ')}${alvos.length > 4 ? ` e mais ${alvos.length - 4}` : ''}</td>
            <td><small>${D.descreverPromocao(x).split(' · ').slice(1).join(' · ')}</small></td>
            <td>${x.ativo && valendo(x) ? html`<span className="badge b-ok">valendo agora</span>` : html`<span className="rest-cod">—</span>`}</td>
            <td><${StatusAtivo} ativo=${x.ativo} /></td>
            <td><${Acoes} nome=${x.nome} onEditar=${() => { setBuscaProd(''); editar(x); }} onExcluir=${() => excluir(x)} /></td>
          </tr>`;
        })}
      <//>`;
  }

  // ---- Embalagens: cobradas por item no delivery (ex.: marmita R$ 1,50) ----
  function TelaEmbalagens(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const [busca, setBusca] = useState('');
    const lista = D.embalagens().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const produtos = form ? D.produtos().filter(p => p.tipo !== 'INSUMO' && (p.ativo || form.produtoIds.includes(p.id)) && (!busca || D.norm(p.nome).includes(D.norm(busca)))) : [];
    const salvar = () => { if (tentar(() => D.salvarEmbalagem(form, form.id), e => `Embalagem "${e.nome}" ${form.id ? 'atualizada' : 'cadastrada'}.`)) setForm(null); };
    const excluir = e => { if (confirmar(`Excluir a embalagem "${e.nome}"?`)) tentar(() => D.excluirEmbalagem(e.id), `Embalagem "${e.nome}" excluída.`); };
    const alternar = id => setForm(f => ({...f, produtoIds: f.produtoIds.includes(id) ? f.produtoIds.filter(x => x !== id) : [...f.produtoIds, id]}));
    return html`
      <${Cabecalho} titulo="Embalagens" sub="Cobradas no delivery e na encomenda: cada unidade do produto soma o preço da embalagem dele">
        <button type="button" className="btn" onClick=${() => { setBusca(''); setForm({id: null, nome: '', preco: '', produtoIds: [], ativo: true}); }}>+ Nova embalagem</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar embalagem — ${form.nome}` : 'Nova embalagem'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="40" placeholder="Ex.: Marmita de alumínio, Copo 500 ml" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Preço cobrado (R$)"><${CampoValor} valor=${form.preco} onChange=${v => setForm(f => ({...f, preco: v}))} /><//>
          <fieldset className="rest-bloco rest-largo">
            <legend>Produtos que usam esta embalagem <small>${plural(form.produtoIds.length, 'escolhido', 'escolhidos')}</small></legend>
            <input type="search" className="search rest-busca" value=${busca} placeholder="Filtrar produtos..." aria-label="Filtrar produtos" onInput=${e => setBusca(e.target.value)} />
            <div className="rest-bloco-checks rest-bloco-rolagem">${produtos.map(p => {
              const outra = D.embalagens().find(x => x.id !== form.id && x.produtoIds.includes(p.id));
              return html`<label key=${p.id} className="rest-check" title=${outra ? `Já usa "${outra.nome}"` : ''}>
                <input type="checkbox" checked=${form.produtoIds.includes(p.id)} disabled=${!!outra} onChange=${() => alternar(p.id)} /> ${p.nome}${outra ? html` <small className="rest-cod">(${outra.nome})</small>` : null}</label>`;
            })}</div>
          </fieldset>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativa (cobra no delivery)</label>
        <//>`}
      <${Tabela} colunas=${['Embalagem', 'Preço', 'Produtos', 'Status']} vazio="Nenhuma embalagem cadastrada.">
        ${lista.map(e => html`<tr key=${e.id} className=${e.ativo ? '' : 'rest-inativo'}>
          <td><b>${e.nome}</b></td>
          <td className="nowrap"><b>${D.moedaBR(e.preco)}</b></td>
          <td className="rest-bairros-cel">${e.produtoIds.map(id => D.produtoPorId(id)?.nome).filter(Boolean).join(', ') || '—'}</td>
          <td><${StatusAtivo} ativo=${e.ativo} /></td>
          <td><${Acoes} nome=${e.nome} onEditar=${() => { setBusca(''); setForm({...e, preco: D.valorBR(e.preco), produtoIds: [...e.produtoIds]}); }} onExcluir=${() => excluir(e)} /></td>
        </tr>`)}
      <//>`;
  }

  // ---- Aplicativos de delivery: iFood, 99Food, Rappi... com a comissão ----
  function TelaAplicativos(){
    useDados();
    const {el: aviso, tentar} = useAviso();
    const [form, setForm] = useState(null);
    const lista = D.aplicativos().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const pedidos = id => D.vendas().filter(v => v.aplicativo?.id === id && v.status === 'FINALIZADA');
    const salvar = () => { if (tentar(() => D.salvarAplicativo(form, form.id), a => `Aplicativo "${a.nome}" ${form.id ? 'atualizado' : 'cadastrado'}.`)) setForm(null); };
    const excluir = a => { if (confirmar(`Excluir o aplicativo "${a.nome}"?`)) tentar(() => D.excluirAplicativo(a.id), `Aplicativo "${a.nome}" excluído.`); };
    return html`
      <${Cabecalho} titulo="Aplicativos de delivery" sub="De onde veio o pedido. A comissão aparece no relatório de delivery para você saber quanto cada aplicativo custa.">
        <button type="button" className="btn" onClick=${() => setForm({id: null, nome: '', comissao: '', ativo: true})}>+ Novo aplicativo</button>
      <//>
      ${aviso}
      ${form && html`
        <${FormCard} titulo=${form.id ? `Editar aplicativo — ${form.nome}` : 'Novo aplicativo'} onSalvar=${salvar} onCancelar=${() => setForm(null)}>
          <${Campo} rotulo="Nome"><input type="text" value=${form.nome} maxLength="30" placeholder="Ex.: iFood" onInput=${e => setForm({...form, nome: e.target.value})} /><//>
          <${Campo} rotulo="Comissão (%)"><input type="text" inputMode="decimal" value=${form.comissao} placeholder="Ex.: 12" onInput=${e => setForm({...form, comissao: e.target.value})} /><//>
          <label className="rest-check"><input type="checkbox" checked=${form.ativo} onChange=${e => setForm({...form, ativo: e.target.checked})} /> Ativo (aparece no pedido)</label>
        <//>`}
      <${Tabela} colunas=${['Aplicativo', 'Comissão', 'Pedidos entregues', 'Status']} vazio="Nenhum aplicativo cadastrado. Sem eles, todo delivery conta como pedido direto (WhatsApp/telefone).">
        ${lista.map(a => html`<tr key=${a.id} className=${a.ativo ? '' : 'rest-inativo'}>
          <td><b>${a.nome}</b></td>
          <td>${String(a.comissao).replace('.', ',')}%</td>
          <td>${pedidos(a.id).length || '—'}</td>
          <td><${StatusAtivo} ativo=${a.ativo} /></td>
          <td><${Acoes} nome=${a.nome} onEditar=${() => setForm({...a, comissao: String(a.comissao).replace('.', ',')})} onExcluir=${() => excluir(a)} /></td>
        </tr>`)}
      <//>`;
  }

  Object.assign(window.RestUI.telas, {'cad/adicionais': TelaAdicionais, 'cad/promocoes': TelaPromocoes, 'cad/embalagens': TelaEmbalagens, 'cad/aplicativos': TelaAplicativos});
})();
