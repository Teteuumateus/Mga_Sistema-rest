// =====================================================================
// ---- 📥 MGA · Importar produtos por planilha (Excel) ----
// =====================================================================
// "Baixar modelo" gera a planilha com as colunas certas (em branco ou com os produtos atuais, para
// alterar em lote). "Importar planilha" lê o arquivo, mostra a prévia (novos, atualizados e erros
// por linha) e só grava ao confirmar. A regra fica em RestDados.importarProdutos.
// A biblioteca do Excel (SheetJS) é baixada só quando alguém usa um destes botões.
(function(){
  'use strict';
  if (!window.RestUI) return;
  const {useState, useRef} = React;
  const {html, D, Modal, plural} = window.RestUI;

  // Colunas da planilha: chave usada na importação, título no Excel, largura e explicação
  const COLUNAS = [
    ['codigo', 'Código', 9, 'Opcional. Em branco, o sistema dá o próximo código. Se já existir, o produto é ATUALIZADO.'],
    ['nome', 'Nome *', 34, 'Obrigatório para produto novo. Sem código, um produto com o mesmo nome é atualizado.'],
    ['categoria', 'Categoria *', 20, 'Obrigatória para produto novo. Categoria que não existe é criada.'],
    ['tipo', 'Tipo', 9, 'Venda (aparece no PDV) ou Insumo (só estoque e ficha técnica). Em branco: Venda.'],
    ['preco', 'Preço de venda *', 15, 'Obrigatório para produto de venda. Ex.: 29,90'],
    ['custo', 'Custo', 10, 'Opcional. Quanto custa para o restaurante. Ex.: 12,50'],
    ['unidade', 'Unidade', 10, 'UN, KG, G, L, ML, PCT, CX, DZ ou PORÇÃO. Em branco: UN.'],
    ['controla', 'Controla estoque', 16, 'Sim ou Não. Bebidas e itens comprados prontos normalmente Sim.'],
    ['estoque', 'Estoque', 10, 'Opcional. Saldo atual. Em branco num produto já cadastrado: o saldo não muda.'],
    ['minimo', 'Estoque mínimo', 15, 'Opcional. Abaixo disso o produto aparece em "Repor".'],
    ['descricao', 'Descrição', 40, 'Opcional. Aparece no cardápio.'],
    ['ativo', 'Ativo', 8, 'Sim ou Não. Em branco: Sim.']
  ];
  // Nomes aceitos no cabeçalho (sem acento, sem "*" e sem o que estiver entre parênteses)
  const SINONIMOS = {codigo: ['codigo', 'cod', 'cod produto'], nome: ['nome', 'produto', 'nome do produto', 'descricao do produto'], categoria: ['categoria', 'grupo'],
    tipo: ['tipo'], preco: ['preco de venda', 'preco', 'preco venda', 'valor', 'valor de venda'], custo: ['custo', 'preco de custo', 'valor de custo'],
    unidade: ['unidade', 'un', 'und'], controla: ['controla estoque', 'controlar estoque', 'controla'], estoque: ['estoque', 'estoque inicial', 'estoque atual', 'saldo'],
    minimo: ['estoque minimo', 'minimo'], descricao: ['descricao', 'observacao'], ativo: ['ativo', 'status', 'situacao']};
  const limparTitulo = t => D.norm(String(t ?? '').replace(/\(.*?\)/g, '').replace(/\*/g, '')).replace(/[^a-z0-9]+/g, ' ').trim();
  const chaveDoTitulo = (t, sin = SINONIMOS) => { const n = limparTitulo(t); return Object.keys(sin).find(k => sin[k].includes(n)) || null; };

  // ---- SheetJS sob demanda ----
  let carregando = null;
  function xlsx(){
    if (window.XLSX) return Promise.resolve(window.XLSX);
    carregando ||= new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = () => ok(window.XLSX);
      s.onerror = () => { carregando = null; falha(new Error('Não foi possível baixar o leitor de Excel. Confira a internet e tente de novo.')); };
      document.head.appendChild(s);
    });
    return carregando;
  }

  // ---- Modelo: aba Produtos (para preencher), Instruções e Categorias ----
  async function baixarModelo(comProdutos){
    const X = await xlsx();
    const sim = v => v ? 'Sim' : 'Não';
    const linhas = comProdutos ? D.produtos().slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map(p => [p.codigo, p.nome, D.grupoPorId(p.grupoId)?.nome || '',
      p.tipo === 'INSUMO' ? 'Insumo' : 'Venda', p.preco || '', p.custo || '', p.unidade || 'UN', sim(p.controlaEstoque), '',
      p.estoqueMinimo || '', p.descricao || '', sim(p.ativo), p.controlaEstoque ? Number(p.estoque) || 0 : '']) : [];
    // Com os produtos: o saldo vai numa coluna só de consulta (a coluna Estoque fica vazia = o saldo não muda)
    const titulos = [...COLUNAS.map(c => c[1]), ...(comProdutos ? ['Saldo atual (consulta, não é importado)'] : [])];
    const ws = X.utils.aoa_to_sheet([titulos, ...linhas]);
    ws['!cols'] = [...COLUNAS.map(c => ({wch: c[2]})), ...(comProdutos ? [{wch: 22}] : [])];
    ws['!autofilter'] = {ref: X.utils.encode_range({s: {r: 0, c: 0}, e: {r: Math.max(linhas.length, 1), c: titulos.length - 1}})};
    // Preço, custo e estoque como número com vírgula no Excel em português
    linhas.forEach((_, k) => [4, 5].forEach(c => { const cel = ws[X.utils.encode_cell({r: k + 1, c})]; if (cel && cel.t === 'n') cel.z = '#,##0.00'; }));
    const instrucoes = X.utils.aoa_to_sheet([
      ['Como preencher a planilha de produtos — ' + D.nomeMarca()], [],
      ['1. Preencha a aba "Produtos": uma linha por produto, a partir da linha 2. Não mude a linha 1 (títulos).'],
      ['2. Colunas com * são obrigatórias para produto novo. As demais podem ficar em branco.'],
      ['3. No sistema: Cadastros › Produtos › Importar planilha. Antes de gravar aparece uma prévia com o que entra e os erros de cada linha.'],
      ['4. Produto que já existe (mesmo código ou, sem código, mesmo nome) é atualizado só nas colunas preenchidas. Nada é apagado.'],
      ['5. Tamanhos (P/M/G), adicionais, ficha técnica e foto continuam sendo cadastrados na tela do produto.'], [],
      ['Coluna', 'Como preencher'], ...COLUNAS.map(c => [c[1], c[3]]), [],
      ['Exemplos'], COLUNAS.map(c => c[1]),
      ['', 'X-Salada', 'Lanches', 'Venda', 24.9, 9.5, 'UN', 'Não', '', '', 'Pão, hambúrguer 150 g, queijo, alface e tomate', 'Sim'],
      ['', 'Coca-Cola Lata 350ml', 'Bebidas', 'Venda', 6, 3.2, 'UN', 'Sim', 48, 12, '', 'Sim'],
      ['', 'Farinha de trigo', 'Insumos', 'Insumo', '', 4.2, 'KG', 'Sim', 25, 5, '', 'Sim']
    ]);
    instrucoes['!cols'] = [{wch: 20}, {wch: 95}];
    const cats = X.utils.aoa_to_sheet([['Categorias cadastradas', 'Unidades aceitas'],
      ...Array.from({length: Math.max(D.grupos().length, D.UNIDADES.length)}, (_, k) => [D.grupos()[k]?.nome || '', D.UNIDADES[k] || ''])]);
    cats['!cols'] = [{wch: 28}, {wch: 18}];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Produtos');
    X.utils.book_append_sheet(wb, instrucoes, 'Instruções');
    X.utils.book_append_sheet(wb, cats, 'Categorias e unidades');
    X.writeFile(wb, comProdutos ? `produtos-${D.hojeISO()}.xlsx` : 'modelo-importar-produtos.xlsx');
  }

  // ---- Leitura: aba pelo nome (ou a primeira), acha a linha de títulos e monta as linhas ----
  // sin: nomes aceitos de cada coluna · chave: coluna que identifica a linha de títulos
  async function lerPlanilha(arquivo, {sin = SINONIMOS, chave = 'nome', rotuloChave = 'Nome', aba = 'produtos', exigidas = ['nome', 'categoria', 'preco']} = {}){
    const X = await xlsx();
    const buf = await arquivo.arrayBuffer();
    let wb;
    if (/\.(csv|txt)$/i.test(arquivo.name) || /csv|text\/plain/.test(arquivo.type)) {
      // CSV: "6,50" e acentos precisam chegar como texto (o leitor do Excel trataria como número americano)
      let texto;
      try { texto = new TextDecoder('utf-8', {fatal: true}).decode(buf); } catch (e) { texto = new TextDecoder('windows-1252').decode(buf); }
      texto = texto.replace(/^\uFEFF/, '');
      const primeira = texto.split(/\r?\n/)[0] || '';
      const sep = [';', '\t', ','].sort((a, b) => primeira.split(b).length - primeira.split(a).length)[0];
      wb = X.read(texto, {type: 'string', raw: true, FS: sep});
    } else wb = X.read(buf, {type: 'array'});
    const nomeAba = wb.SheetNames.find(n => D.norm(n) === aba) || wb.SheetNames[0];
    const tabela = X.utils.sheet_to_json(wb.Sheets[nomeAba], {header: 1, raw: true, defval: ''});
    const iTitulo = tabela.findIndex(l => l.some(c => chaveDoTitulo(c, sin) === chave));
    if (iTitulo < 0) throw Object.assign(new Error(`Não achei a linha de títulos (com a coluna "${rotuloChave}"). Use o modelo baixado pelo botão "Baixar modelo".`), {regra: true});
    const chaves = tabela[iTitulo].map(t => chaveDoTitulo(t, sin));
    const linhas = tabela.slice(iTitulo + 1).map((l, k) => {
      const o = {linha: iTitulo + k + 2};
      chaves.forEach((ch, c) => { if (ch && o[ch] === undefined) o[ch] = l[c]; });
      // "Ativo"/"Inativo" na coluna de status
      const at = D.norm(o.ativo);
      if (at === 'ativo') o.ativo = 'Sim'; else if (at === 'inativo') o.ativo = 'Não';
      return o;
    });
    return {linhas, aba: nomeAba, faltando: exigidas.filter(ch => !chaves.includes(ch))};
  }

  // ---- Botões da tela de Produtos + janela de prévia ----
  function ImportarProdutos({mostrar}){
    const entrada = useRef(null);
    const [ocupado, setOcupado] = useState('');
    const [janela, setJanela] = useState(null); // {arquivo, linhas, previa, faltando}
    const [filtro, setFiltro] = useState('todos');
    const pode = D.podeAcessar('cadastros');
    const falhar = e => mostrar(e.regra || e.message?.startsWith('Não') ? e.message : 'Não foi possível ler a planilha: ' + e.message, true);
    const modelo = async comProdutos => {
      setOcupado(comProdutos ? 'atuais' : 'modelo');
      try { await baixarModelo(comProdutos); } catch (e) { falhar(e); } finally { setOcupado(''); }
    };
    const escolher = async e => {
      const arquivo = e.target.files[0]; e.target.value = '';
      if (!arquivo) return;
      setOcupado('ler');
      try {
        const {linhas, faltando} = await lerPlanilha(arquivo);
        setFiltro('todos');
        setJanela({arquivo: arquivo.name, linhas, faltando, previa: D.importarProdutos(linhas)});
      } catch (x) { falhar(x); } finally { setOcupado(''); }
    };
    const importar = () => {
      try {
        const r = D.importarProdutos(janela.linhas, {aplicar: true});
        setJanela(null);
        const partes = [r.novos && plural(r.novos, 'produto novo', 'produtos novos'), r.atualizados && plural(r.atualizados, 'atualizado', 'atualizados'),
          r.categoriasNovas.length && plural(r.categoriasNovas.length, 'categoria criada', 'categorias criadas')].filter(Boolean);
        mostrar(`Importação concluída: ${partes.join(', ')}.${r.falhas.length ? ` ${plural(r.falhas.length, 'linha não entrou', 'linhas não entraram')}: ${r.falhas.map(f => `linha ${f.linha} (${f.msg})`).join('; ')}` : ''}`, r.falhas.length > 0);
      } catch (x) { mostrar(x.regra ? x.message : 'Erro inesperado: ' + x.message, true); if (!x.regra) console.error(x); }
    };
    if (!pode) return null;
    const p = janela?.previa;
    const validos = p ? p.novos + p.atualizados : 0;
    const visiveis = p ? p.itens.filter(i => filtro === 'todos' || (filtro === 'erros' ? i.erros.length : !i.erros.length)) : [];
    return html`
      <button type="button" className="btn btn-ghost" disabled=${!!ocupado} onClick=${() => modelo(false)} title="Planilha em branco com as colunas certas e as instruções">
        ${ocupado === 'modelo' ? 'Gerando…' : '⬇ Baixar modelo (Excel)'}</button>
      <button type="button" className="btn btn-ghost" disabled=${!!ocupado} onClick=${() => entrada.current.click()} title="Importar a planilha preenchida (.xlsx, .xls ou .csv)">
        ${ocupado === 'ler' ? 'Lendo…' : '⬆ Importar planilha'}</button>
      <input ref=${entrada} type="file" hidden accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange=${escolher} />
      ${janela && html`
        <${Modal} titulo="Importar produtos" onFechar=${() => setJanela(null)}>
          <p className="dv-ajuda">Arquivo <b>${janela.arquivo}</b> · confira antes de gravar. Produto já cadastrado é atualizado só nas colunas preenchidas.</p>
          ${janela.faltando.length > 0 && html`<p className="rest-imp-alerta">A planilha não tem a(s) coluna(s): ${janela.faltando.join(', ')}. Produtos novos precisam dela(s).</p>`}
          <div className="rest-kpis-mini rest-imp-kpis">
            <div className="rest-kpi-mini"><span>Novos</span><b className="mov-pos">${p.novos}</b><small>produtos a cadastrar</small></div>
            <div className="rest-kpi-mini"><span>Atualizados</span><b>${p.atualizados}</b><small>já cadastrados</small></div>
            <div className=${'rest-kpi-mini' + (p.erros ? ' hv-alerta' : '')}><span>Com erro</span><b>${p.erros}</b><small>não entram</small></div>
            <div className="rest-kpi-mini"><span>Categorias novas</span><b>${p.categoriasNovas.length}</b><small>${p.categoriasNovas.slice(0, 3).join(', ') || 'nenhuma'}${p.categoriasNovas.length > 3 ? '…' : ''}</small></div>
          </div>
          ${p.itens.length > 0 && html`
            <div className="rest-imp-filtro" role="group" aria-label="Mostrar">
              ${[['todos', `Todas (${p.itens.length})`], ['ok', `Prontas (${validos})`], ['erros', `Com erro (${p.erros})`]].map(([k, n]) =>
                html`<button key=${k} type="button" className=${'btn' + (filtro === k ? '' : ' btn-ghost')} onClick=${() => setFiltro(k)}>${n}</button>`)}
            </div>
            <div className="table-scroll rest-imp-tabela">
              <table>
                <thead><tr><th>Linha</th><th>Produto</th><th>Categoria</th><th>Situação</th></tr></thead>
                <tbody>${visiveis.slice(0, 300).map(i => html`<tr key=${i.linha} className=${i.erros.length ? 'rest-imp-erro' : ''}>
                  <td className="nowrap rest-cod">${i.linha}</td>
                  <td><b>${i.nome || '—'}</b>${i.produto ? html`<small className="history-date">cód. ${i.produto.codigo}</small>` : null}</td>
                  <td>${i.categoria || '—'}</td>
                  <td>${i.erros.length ? html`<span className="mov-neg">${i.erros.join('; ')}</span>`
                    : html`<span className=${'badge ' + (i.acao === 'NOVO' ? 'b-ok' : 'rest-b-aberta')}>${i.acao === 'NOVO' ? 'Novo' : 'Atualizar'}</span>`}</td>
                </tr>`)}</tbody>
              </table>
            </div>
            ${visiveis.length > 300 && html`<p className="dv-ajuda">Mostrando 300 de ${visiveis.length} linhas.</p>`}`}
          ${!p.itens.length && html`<p className="rest-grafico-vazio">A planilha não tem produtos preenchidos.</p>`}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => modelo(true)} disabled=${!!ocupado} title="Planilha com todos os produtos atuais, para alterar em lote">Baixar produtos atuais</button>
            <button type="button" className="btn btn-ghost" onClick=${() => setJanela(null)}>Cancelar</button>
            <button type="button" className="btn" disabled=${!validos} onClick=${importar}>${validos ? `Importar ${plural(validos, 'produto', 'produtos')}` : 'Nada para importar'}</button>
          </div>
        <//>`}`;
  }

  // =====================================================================
  // ---- Entrada de estoque por planilha ----
  // O modelo já lista os produtos cadastrados: basta preencher a quantidade (e o custo, fornecedor e nota).
  // Saldo atual e unidade vão só para consulta. Regra em RestDados.importarEntradas.
  const COLUNAS_ENTRADA = [
    ['codigo', 'Código', 9, 'Código do produto (vem preenchido). Use o código ou o nome.'],
    ['produto', 'Produto *', 34, 'Nome do produto, como está no cadastro.'],
    ['unidade', 'Unidade', 9, 'Só para consulta (não é lida na importação).'],
    ['saldo', 'Saldo atual', 11, 'Só para consulta: o saldo no momento em que a planilha foi gerada.'],
    ['quantidade', 'Quantidade *', 13, 'Quanto entrou, na unidade do produto. Em branco: o produto não entra.'],
    ['custo', 'Custo unitário', 14, 'Preço pago por unidade. Atualiza o custo médio. Ex.: 3,50'],
    ['fornecedor', 'Fornecedor', 24, 'Opcional. Nome (ou CNPJ) de um fornecedor cadastrado.'],
    ['documento', 'Nota fiscal', 14, 'Opcional. Itens com o mesmo fornecedor e nota viram uma compra só.']
  ];
  const SIN_ENTRADA = {codigo: ['codigo', 'cod', 'cod produto'], produto: ['produto', 'nome', 'nome do produto'], quantidade: ['quantidade', 'qtd', 'qtde', 'quant'],
    custo: ['custo unitario', 'custo', 'valor unitario', 'preco de custo', 'custo un'], fornecedor: ['fornecedor'], documento: ['nota fiscal', 'nota', 'nf', 'documento', 'numero da nota']};

  async function baixarModeloEntrada(){
    const X = await xlsx();
    const lista = D.produtos().filter(p => p.ativo).sort((a, b) => (a.tipo === 'INSUMO' ? 0 : 1) - (b.tipo === 'INSUMO' ? 0 : 1) || a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(p => [p.codigo, p.nome, p.unidade || 'UN', p.controlaEstoque ? Number(p.estoque) || 0 : 'não controla', '', p.custo || '', '', '']);
    const ws = X.utils.aoa_to_sheet([COLUNAS_ENTRADA.map(c => c[1]), ...lista]);
    ws['!cols'] = COLUNAS_ENTRADA.map(c => ({wch: c[2]}));
    ws['!autofilter'] = {ref: X.utils.encode_range({s: {r: 0, c: 0}, e: {r: Math.max(lista.length, 1), c: COLUNAS_ENTRADA.length - 1}})};
    lista.forEach((_, k) => { const cel = ws[X.utils.encode_cell({r: k + 1, c: 5})]; if (cel && cel.t === 'n') cel.z = '#,##0.00'; });
    const instrucoes = X.utils.aoa_to_sheet([
      ['Como dar entrada no estoque pela planilha — ' + D.nomeMarca()], [],
      ['1. A aba "Entrada" já lista os produtos cadastrados. Preencha a QUANTIDADE do que chegou; linhas sem quantidade não entram.'],
      ['2. O custo unitário vem com o custo atual: confira com a nota. Ele atualiza o custo médio do produto.'],
      ['3. Fornecedor e nota fiscal são opcionais. Itens com o mesmo fornecedor e nota viram uma única compra no sistema.'],
      ['4. No sistema: Estoque › Entrada de estoque › Importar planilha. Aparece uma prévia antes de gravar.'],
      ['5. Produto que ainda não controla estoque passa a controlar. Produto novo: cadastre antes em Cadastros › Produtos.'], [],
      ['Coluna', 'Como preencher'], ...COLUNAS_ENTRADA.map(c => [c[1], c[3]]), [],
      ['Fornecedores cadastrados'], ...D.fornecedores().filter(f => f.ativo).map(f => [f.nome, f.documento || ''])
    ]);
    instrucoes['!cols'] = [{wch: 26}, {wch: 95}];
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Entrada');
    X.utils.book_append_sheet(wb, instrucoes, 'Instruções');
    X.writeFile(wb, `entrada-estoque-${D.hojeISO()}.xlsx`);
  }

  function ImportarEntradas({mostrar}){
    const entrada = useRef(null);
    const [ocupado, setOcupado] = useState('');
    const [janela, setJanela] = useState(null); // {arquivo, linhas, previa, faltando}
    const [filtro, setFiltro] = useState('todos');
    const [conta, setConta] = useState(false);
    const [vencimento, setVencimento] = useState(D.hojeISO());
    const podeConta = D.podeAcessar('financeiro');
    const falhar = e => mostrar(e.regra || e.message?.startsWith('Não') ? e.message : 'Não foi possível ler a planilha: ' + e.message, true);
    const modelo = async () => { setOcupado('modelo'); try { await baixarModeloEntrada(); } catch (e) { falhar(e); } finally { setOcupado(''); } };
    const escolher = async e => {
      const arquivo = e.target.files[0]; e.target.value = '';
      if (!arquivo) return;
      setOcupado('ler');
      try {
        const {linhas, faltando} = await lerPlanilha(arquivo, {sin: SIN_ENTRADA, chave: 'quantidade', rotuloChave: 'Quantidade', aba: 'entrada', exigidas: ['quantidade']});
        setFiltro('todos'); setConta(false);
        setJanela({arquivo: arquivo.name, linhas, faltando, previa: D.importarEntradas(linhas)});
      } catch (x) { falhar(x); } finally { setOcupado(''); }
    };
    const importar = () => {
      try {
        const r = D.importarEntradas(janela.linhas, {aplicar: true, conta: podeConta && conta ? {vencimento} : null});
        setJanela(null);
        const itens = r.feitas.reduce((s, f) => s + f.itens, 0), total = r.feitas.reduce((s, f) => s + f.total, 0);
        mostrar(`Entrada registrada: ${plural(itens, 'item', 'itens')} em ${plural(r.feitas.length, 'compra', 'compras')}, ${D.moedaBR(total)}${podeConta && conta ? ' · conta a pagar lançada' : ''}.`
          + (r.falhas.length ? ` Não entraram as linhas ${r.falhas.map(f => `${f.linhas.join(', ')} (${f.msg})`).join('; ')}` : ''), r.falhas.length > 0);
      } catch (x) { mostrar(x.regra ? x.message : 'Erro inesperado: ' + x.message, true); if (!x.regra) console.error(x); }
    };
    if (!D.podeAcessar('estoque')) return null;
    const p = janela?.previa;
    const visiveis = p ? p.itens.filter(i => filtro === 'todos' || (filtro === 'erros' ? i.erros.length : !i.erros.length)) : [];
    return html`
      <button type="button" className="btn btn-ghost" disabled=${!!ocupado} onClick=${modelo} title="Planilha com os produtos cadastrados: é só preencher a quantidade">
        ${ocupado === 'modelo' ? 'Gerando…' : '⬇ Baixar modelo (Excel)'}</button>
      <button type="button" className="btn btn-ghost" disabled=${!!ocupado} onClick=${() => entrada.current.click()} title="Importar a planilha preenchida (.xlsx, .xls ou .csv)">
        ${ocupado === 'ler' ? 'Lendo…' : '⬆ Importar planilha'}</button>
      <input ref=${entrada} type="file" hidden accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv" onChange=${escolher} />
      ${janela && html`
        <${Modal} titulo="Importar entrada de estoque" onFechar=${() => setJanela(null)}>
          <p className="dv-ajuda">Arquivo <b>${janela.arquivo}</b> · confira antes de gravar. Só entram as linhas com quantidade; itens do mesmo fornecedor e nota viram uma compra.</p>
          ${janela.faltando.length > 0 && html`<p className="rest-imp-alerta">A planilha não tem a coluna Quantidade. Use o modelo do botão "Baixar modelo".</p>`}
          <div className="rest-kpis-mini rest-imp-kpis">
            <div className="rest-kpi-mini"><span>Itens</span><b className="mov-pos">${p.validos}</b><small>entram no estoque</small></div>
            <div className="rest-kpi-mini"><span>Compras</span><b>${p.notas}</b><small>por fornecedor e nota</small></div>
            <div className="rest-kpi-mini"><span>Valor</span><b>${D.moedaBR(p.total)}</b><small>quantidade × custo</small></div>
            <div className=${'rest-kpi-mini' + (p.erros ? ' hv-alerta' : '')}><span>Com erro</span><b>${p.erros}</b><small>não entram</small></div>
          </div>
          ${p.repetidas?.length > 0 && html`<p className="rest-imp-alerta">Atenção: ${p.repetidas.length === 1 ? 'a nota' : 'as notas'} <b>${p.repetidas.join(', ')}</b> já ${p.repetidas.length === 1 ? 'foi lançada' : 'foram lançadas'} antes. Importar de novo soma o estoque outra vez.</p>`}
          ${p.passamAControlar.length > 0 && html`<p className="dv-ajuda">Passam a controlar estoque: ${p.passamAControlar.slice(0, 6).join(', ')}${p.passamAControlar.length > 6 ? ` e mais ${p.passamAControlar.length - 6}` : ''}.</p>`}
          ${p.itens.length > 0 && html`
            <div className="rest-imp-filtro" role="group" aria-label="Mostrar">
              ${[['todos', `Todas (${p.itens.length})`], ['ok', `Prontas (${p.validos})`], ['erros', `Com erro (${p.erros})`]].map(([k, n]) =>
                html`<button key=${k} type="button" className=${'btn' + (filtro === k ? '' : ' btn-ghost')} onClick=${() => setFiltro(k)}>${n}</button>`)}
            </div>
            <div className="table-scroll rest-imp-tabela">
              <table>
                <thead><tr><th>Linha</th><th>Produto</th><th className="rest-num">Quantidade</th><th className="rest-num">Custo un.</th><th>Fornecedor / nota</th><th>Situação</th></tr></thead>
                <tbody>${visiveis.slice(0, 300).map(i => html`<tr key=${i.linha} className=${i.erros.length ? 'rest-imp-erro' : ''}>
                  <td className="nowrap rest-cod">${i.linha}</td>
                  <td><b>${i.nome || '—'}</b>${i.produto ? html`<small className="history-date">cód. ${i.produto.codigo}</small>` : null}</td>
                  <td className="rest-num nowrap">${i.quantidade > 0 ? `${D.qtdBR(i.quantidade)} ${i.produto?.unidade || ''}` : '—'}</td>
                  <td className="rest-num nowrap">${i.custo ? D.moedaBR(i.custo) : '—'}</td>
                  <td>${[i.fornecedor?.nome, i.documento].filter(Boolean).join(' · ') || '—'}</td>
                  <td>${i.erros.length ? html`<span className="mov-neg">${i.erros.join('; ')}</span>` : html`<span className="badge b-ok">Entra</span>`}</td>
                </tr>`)}</tbody>
              </table>
            </div>
            ${visiveis.length > 300 && html`<p className="dv-ajuda">Mostrando 300 de ${visiveis.length} linhas.</p>`}`}
          ${!p.itens.length && html`<p className="rest-grafico-vazio">Nenhuma linha com quantidade preenchida.</p>`}
          ${podeConta && p.validos > 0 && html`
            <label className="rest-check rest-no-caixa"><input type="checkbox" checked=${conta} onChange=${e => setConta(e.target.checked)} /> Lançar conta a pagar (uma por compra)</label>
            ${conta && html`<div className="form-grid"><div className="field"><label htmlFor="imp-venc">Vencimento</label><input id="imp-venc" type="date" value=${vencimento} onChange=${e => setVencimento(e.target.value)} /></div></div>`}`}
          <div className="cf-acoes">
            <button type="button" className="btn btn-ghost" onClick=${() => setJanela(null)}>Cancelar</button>
            <button type="button" className="btn" disabled=${!p.validos} onClick=${importar}>${p.validos ? `Dar entrada em ${plural(p.validos, 'item', 'itens')}` : 'Nada para importar'}</button>
          </div>
        <//>`}`;
  }

  window.RestUI.ImportarEntradas = ImportarEntradas;
  window.RestUI.ImportarProdutos = ImportarProdutos;
  window.RestUI.importacao = {baixarModelo, lerPlanilha, chaveDoTitulo};
})();
