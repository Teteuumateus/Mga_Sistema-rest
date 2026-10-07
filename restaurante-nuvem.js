// =====================================================================
// ---- ☁️ MGA · tudo gravado no Supabase ----
// =====================================================================
// O sistema trabalha com os dados na memória (rápido, as telas não mudam) e:
//  1. Ao entrar, carrega do Supabase tudo do restaurante (cadastros, vendas, caixa, estoque,
//     financeiro, configurações e auditoria).
//  2. A cada salvamento, grava no Supabase só o que mudou (inclui, altera e exclui).
//  3. Tempo real: o que outro computador grava aparece aqui na hora.
//  4. Na primeira vez em cada navegador, junta o que estava no navegador com o que está no
//     banco (pelo nome/código) e troca os ids antigos, sem perder a ligação das vendas.
// Cada registro vai inteiro no campo "extra" (é ele que o sistema lê de volta) e também nas
// colunas normais, para consultas e relatórios no Supabase.
(function(){
  'use strict';
  const D = window.RestDados;
  const supa = window.supa;
  const r = v => Number(v) || 0;
  const ou = v => v === '' || v === undefined ? null : v;
  const nrm = v => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const digitos = v => String(v ?? '').replace(/\D/g, '');
  const ehUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v));
  const vazio = o => !o || !Object.keys(o).length;
  const CHAVE_MARCA = 'mga_nuvemEmpresa', CHAVE_VERSAO = 'mga_nuvemVersao', VERSAO = '2';
  // Diário do que foi alterado NESTE navegador e o banco ainda não confirmou (sem internet, erro, aba fechada):
  // {empresa, tabelas: {produtos: [ids]...}, config}. Na próxima abertura com internet só esses registros são
  // enviados (nunca o retrato inteiro: um registro excluído no banco por outro computador não volta).
  const CHAVE_SUJOS = 'mga_nuvemSujos', CHAVE_PENDENTE_ANTIGA = 'mga_nuvemPendente';
  const lerSujos = () => { try { return JSON.parse(localStorage.getItem(CHAVE_SUJOS)) || null; } catch (e) { return null; } };
  const limparSujos = () => { try { localStorage.removeItem(CHAVE_SUJOS); localStorage.removeItem(CHAVE_PENDENTE_ANTIGA); } catch (e) { /* storage indisponível */ } };

  // ---- Aviso discreto no canto da tela (salvando / erro) ----
  let elAviso = null;
  function aviso(texto, tipo){
    if (!elAviso) { elAviso = document.createElement('div'); elAviso.className = 'nuvem-aviso'; elAviso.setAttribute('role', 'status'); document.body.appendChild(elAviso); }
    elAviso.textContent = texto || '';
    elAviso.className = 'nuvem-aviso' + (texto ? ' visivel ' + (tipo || '') : '');
  }
  const traduzir = m => /Failed to fetch|NetworkError/i.test(m) ? 'sem internet.' : /duplicate key|unique/i.test(m) ? 'já existe um registro com esse nome, código ou número.'
    : /JWT|token|401/i.test(m) ? 'a sessão expirou, entre de novo.' : m;

  // ---- O que está no sistema agora (só o que vai para o banco: dados de demonstração ficam fora) ----
  const semDemo = l => (l || []).filter(x => x && !x.demo && x.id);
  const coletar = () => ({
    grupos: D.grupos(), adicionais: D.adicionais(), produtos: D.produtos(), mesas: D.mesas(), clientes: D.clientes(), formas: D.formas(),
    fornecedores: D.fornecedores(), funcionarios: D.funcionarios(), entregadores: D.entregadores(), regioes: D.regioes(), aplicativos: D.aplicativos(),
    embalagens: D.embalagens(), promocoes: D.promocoes(), contasBancarias: D.contasBancarias(),
    caixas: semDemo(D.caixas()), vendas: semDemo(D.vendas()), contas: semDemo(D.contas()), movCaixa: D.movCaixa(), movEstoque: D.movEstoque(),
    movConta: D.movConta(), auditoria: D.auditoria().filter(a => a.id)
  });
  // Ids que existem (para não apontar para algo que não está no banco)
  const contexto = e => {
    const s = l => new Set((l || []).map(x => x.id));
    return {grupos: s(e.grupos), adicionais: s(e.adicionais), produtos: s(e.produtos), mesas: s(e.mesas), clientes: s(e.clientes), formas: s(e.formas),
      fornecedores: s(e.fornecedores), entregadores: s(e.entregadores), aplicativos: s(e.aplicativos), caixas: s(e.caixas), vendas: s(e.vendas),
      contas: s(e.contas), movCaixa: s(e.movCaixa), contasBancarias: s(e.contasBancarias)};
  };
  const ref = (conjunto, id) => id && conjunto.has(id) ? id : null;

  // ---- Tabelas: ordem = pais antes dos filhos. "filhos" são regravados quando o pai muda. ----
  // natural: como reconhecer o mesmo cadastro no banco (na primeira vez em cada navegador)
  const SPECS = [
    {nome: 'categorias', col: 'grupos', natural: g => nrm(g.nome),
      colunas: g => ({id: g.id, nome: g.nome, ordem: g.ordem || 0, cozinha: g.cozinha !== false, ativo: g.ativo !== false})},
    {nome: 'grupos_adicionais', col: 'adicionais', natural: g => nrm(g.nome),
      colunas: g => ({id: g.id, nome: g.nome, minimo: g.min || 0, maximo: g.max || 0, ativo: g.ativo !== false}),
      filhos: [{nome: 'adicionais_opcoes', por: 'grupo_id', linhas: g => (g.opcoes || []).map((o, k) => ({id: o.id, grupo_id: g.id, nome: o.nome, preco: r(o.preco), ordem: k, ativo: o.ativo !== false}))}]},
    {nome: 'produtos', col: 'produtos', natural: p => String(p.codigo || '').toUpperCase(),
      colunas: (p, x) => ({id: p.id, categoria_id: p.grupoId, codigo: p.codigo, nome: p.nome, tipo: p.tipo === 'INSUMO' ? 'INSUMO' : 'VENDA', preco: r(p.preco), custo: r(p.custo),
        unidade: p.unidade || 'UN', controla_estoque: !!p.controlaEstoque, estoque: r(p.estoque), estoque_minimo: r(p.estoqueMinimo), foto_url: p.foto || null,
        descricao: p.descricao || null, ativo: p.ativo !== false}),
      filhos: [
        {nome: 'produto_tamanhos', por: 'produto_id', linhas: p => (p.tamanhos || []).map((t, k) => ({id: t.id, produto_id: p.id, nome: t.nome, preco: r(t.preco), ordem: k}))},
        {nome: 'produto_ficha_tecnica', por: 'produto_id', linhas: (p, x) => (p.ficha || []).filter(f => x.produtos.has(f.produtoId)).map(f => ({produto_id: p.id, insumo_id: f.produtoId, quantidade: r(f.quantidade)}))},
        {nome: 'produto_grupos_adicionais', por: 'produto_id', linhas: (p, x) => (p.gruposAdicionais || []).filter(g => x.adicionais.has(g)).map(g => ({produto_id: p.id, grupo_id: g}))}]},
    {nome: 'mesas', col: 'mesas', natural: m => String(m.numero),
      colunas: m => ({id: m.id, numero: m.numero, descricao: m.descricao || null, lugares: Math.round(r(m.lugares)), ativo: m.ativo !== false})},
    {nome: 'clientes', col: 'clientes', natural: c => digitos(c.telefone).length >= 10 ? digitos(c.telefone) : nrm(c.nome),
      colunas: c => ({id: c.id, nome: c.nome, telefone: ou(c.telefone), documento: ou(c.doc), email: ou(c.email), cep: ou(c.cep), endereco: ou(c.endereco), numero: ou(c.numero),
        complemento: ou(c.complemento), bairro: ou(c.bairro), cidade: ou(c.cidade), referencia: ou(c.referencia), obs: ou(c.obs), ...(c.dataCadastro ? {criado_em: c.dataCadastro} : {})})},
    {nome: 'formas_pagamento', col: 'formas', natural: f => nrm(f.nome),
      colunas: f => ({id: f.id, nome: f.nome, tipo: f.tipo, ordem: f.ordem || 0, ativo: f.ativo !== false})},
    {nome: 'fornecedores', col: 'fornecedores', natural: f => digitos(f.documento) || nrm(f.nome),
      colunas: f => ({id: f.id, nome: f.nome, documento: ou(f.documento), telefone: ou(f.telefone), email: ou(f.email), contato: ou(f.contato), endereco: ou(f.endereco),
        cidade: ou(f.cidade), obs: ou(f.obs), ativo: f.ativo !== false, ...(f.criadoEm ? {criado_em: f.criadoEm} : {})})},
    {nome: 'funcionarios', col: 'funcionarios', natural: f => digitos(f.cpf) || nrm(f.nome),
      colunas: f => ({id: f.id, nome: f.nome, cpf: ou(f.cpf), telefone: ou(f.telefone), cargo: f.cargo || 'Funcionário', admissao: ou(f.admissao), salario: r(f.salario),
        obs: ou(f.obs), ativo: f.ativo !== false, ...(f.criadoEm ? {criado_em: f.criadoEm} : {})})},
    {nome: 'entregadores', col: 'entregadores', natural: e => nrm(e.nome),
      colunas: e => ({id: e.id, nome: e.nome, telefone: ou(e.telefone), cpf: ou(e.cpf), veiculo: e.veiculo || 'Moto', placa: ou(e.placa), obs: ou(e.obs), ativo: e.ativo !== false})},
    {nome: 'regioes_entrega', col: 'regioes', natural: g => nrm(g.nome) + '|' + nrm(g.cidade),
      colunas: g => ({id: g.id, nome: g.nome, cidade: ou(g.cidade), taxa: r(g.taxa), tempo_min: g.tempo ?? null, ativo: g.ativo !== false}),
      filhos: [{nome: 'regiao_bairros', por: 'regiao_id', linhas: g => (g.bairros || []).map(b => ({regiao_id: g.id, bairro: b}))}]},
    {nome: 'aplicativos_delivery', col: 'aplicativos', natural: a => nrm(a.nome),
      colunas: a => ({id: a.id, nome: a.nome, comissao: r(a.comissao), ativo: a.ativo !== false})},
    {nome: 'embalagens', col: 'embalagens', natural: e => nrm(e.nome),
      colunas: e => ({id: e.id, nome: e.nome, preco: r(e.preco), ativo: e.ativo !== false}),
      filhos: [{nome: 'embalagem_produtos', por: 'embalagem_id', linhas: (e, x) => (e.produtoIds || []).filter(p => x.produtos.has(p)).map(p => ({embalagem_id: e.id, produto_id: p}))}]},
    {nome: 'promocoes', col: 'promocoes', natural: p => nrm(p.nome),
      colunas: p => ({id: p.id, nome: p.nome, alvo: p.alvo, tipo: p.tipo, valor: r(p.valor), hora_inicio: ou(p.horaIni), hora_fim: ou(p.horaFim), data_inicio: ou(p.de), data_fim: ou(p.ate), ativo: p.ativo !== false}),
      filhos: [
        {nome: 'promocao_itens', por: 'promocao_id', linhas: (p, x) => (p.ids || []).filter(i => p.alvo === 'PRODUTO' ? x.produtos.has(i) : x.grupos.has(i))
          .map(i => p.alvo === 'PRODUTO' ? {promocao_id: p.id, produto_id: i} : {promocao_id: p.id, categoria_id: i})},
        {nome: 'promocao_dias', por: 'promocao_id', linhas: p => (p.dias || []).map(d => ({promocao_id: p.id, dia: d}))}]},
    {nome: 'contas_bancarias', col: 'contasBancarias', natural: c => nrm(c.nome),
      colunas: c => ({id: c.id, nome: c.nome, tipo: c.tipo || 'BANCO', banco: ou(c.banco), saldo_inicial: r(c.saldoInicial), data_inicial: c.dataInicial || null, ativo: c.ativo !== false})},
    {nome: 'caixas', col: 'caixas', numerado: true,
      colunas: c => ({id: c.id, numero: c.numero, operador_nome: c.operador || 'Operador', aberto_por: ou(c.abertoPor), abertura: c.abertura, valor_inicial: r(c.valorInicial),
        status: c.status === 'FECHADO' ? 'FECHADO' : 'ABERTO', fechamento: ou(c.fechamento), fechado_por: ou(c.fechadoPor), valor_contado: c.valorContado ?? null,
        diferenca: c.diferenca ?? null, obs_fechamento: ou(c.obsFechamento), resumo: c.resumo || null}),
      filhos: [{nome: 'caixa_conferencia', por: 'caixa_id', linhas: c => (c.conferencia || []).map(x => ({caixa_id: c.id, forma: x.tipo, esperado: r(x.esperado), contado: r(x.contado), diferenca: r(x.diferenca)}))}]},
    {nome: 'vendas', col: 'vendas', numerado: true, filtro: (v, x) => x.caixas.has(v.caixaId),
      colunas: (v, x) => ({id: v.id, numero: v.numero, caixa_id: v.caixaId, tipo: v.tipo, status: v.status, cliente_id: ref(x.clientes, v.clienteId), mesa_id: ref(x.mesas, v.mesaId),
        mesa_numero: ou(v.mesa), pessoas: v.pessoas || 1, conta_pedida: !!v.contaPedida, taxa_servico_ativa: !!v.taxaServico?.ativa, taxa_servico_percentual: r(v.taxaServico?.percentual),
        taxa_entrega: r(v.taxaEntrega), taxa_embalagem: r(v.taxaEmbalagem), desconto: r(v.desconto), acrescimo: r(v.acrescimo), aplicativo_id: ref(x.aplicativos, v.aplicativo?.id),
        aplicativo_nome: v.aplicativo?.nome || null, aplicativo_comissao: v.aplicativo ? r(v.aplicativo.comissao) : null, obs: ou(v.obs), operador_nome: v.operador || 'Operador',
        data: v.data, finalizada_em: ou(v.finalizadaEm), cancelada_em: ou(v.canceladaEm), cancelada_por: ou(v.canceladaPor), motivo_cancelamento: ou(v.motivoCancelamento),
        estoque_baixado: !!v.estoqueBaixado}),
      filhos: [
        {nome: 'venda_itens', por: 'venda_id', linhas: (v, x) => (v.itens || []).map(i => ({id: i.id, venda_id: v.id, produto_id: ref(x.produtos, i.produtoId), codigo: ou(i.codigo), nome: i.nome,
          tamanho: ou(i.tamanho), quantidade: r(i.quantidade) || 1, preco_unitario: r(i.precoUnitario), preco_tabela: i.precoTabela ?? null, promocao: ou(i.promocao), custo_unitario: r(i.custoUnitario),
          desconto: r(i.desconto), observacao: ou(i.observacao), pago: !!i.pago, adicionado_por: ou(i.adicionadoPor), ...(i.adicionadoEm ? {adicionado_em: i.adicionadoEm} : {}),
          impresso_em: ou(i.impressoEm), preparo_estado: i.preparo?.estado || null, preparo_desde: i.preparo?.desde || null, extra: i}))},
        {nome: 'venda_item_adicionais', linhas: v => (v.itens || []).flatMap(i => (i.adicionais || []).map(a => ({item_id: i.id, grupo: ou(a.grupo), nome: a.nome, preco: r(a.preco)})))},
        {nome: 'venda_pagamentos', por: 'venda_id', linhas: (v, x) => (v.pagamentos || []).map(p => ({id: p.id, venda_id: v.id, forma_id: ref(x.formas, p.formaId), tipo: D.tipoPagamento(p),
          nome: p.nome || p.forma || 'Pagamento', valor: r(p.valor), recebido: r(p.recebido ?? p.valor), troco: r(p.troco), parte: ou(p.parte), recebido_por: ou(p.recebidoPor),
          ...(p.data ? {data: p.data} : {}), extra: p}))},
        {nome: 'venda_entrega', por: 'venda_id', linhas: (v, x) => v.entrega ? [{venda_id: v.id, modo: v.modo === 'RETIRAR' ? 'RETIRAR' : 'ENTREGAR',
          status_delivery: v.statusDelivery || 'RECEBIDO', nome: v.entrega.nome || '', telefone: v.entrega.telefone || '', cep: ou(v.entrega.cep), endereco: ou(v.entrega.endereco),
          numero: ou(v.entrega.numero), complemento: ou(v.entrega.complemento), bairro: ou(v.entrega.bairro), cidade: ou(v.entrega.cidade), referencia: ou(v.entrega.referencia),
          regiao: ou(v.entrega.regiao), agendado_para: ou(v.agendadoPara), forma_prevista_id: ref(x.formas, v.formaPrevistaId), troco_para: v.trocoPara ?? null,
          levar_maquina: !!v.levarMaquina, entregador_id: ref(x.entregadores, v.entregadorId)}] : []},
        {nome: 'venda_historico_delivery', por: 'venda_id', linhas: v => (v.historico || []).map(h => ({venda_id: v.id, status: h.status, data: h.data, usuario: ou(h.usuario), entregador: ou(h.entregador)}))}]},
    {nome: 'contas', col: 'contas',
      colunas: (c, x) => ({id: c.id, tipo: c.tipo, descricao: c.descricao, categoria: ou(c.categoria), valor: r(c.valor), vencimento: c.vencimento, status: c.status === 'PAGA' ? 'PAGA' : 'ABERTA',
        pago_em: ou(c.pagoEm), forma: ou(c.forma), cliente_id: ref(x.clientes, c.clienteId), fornecedor_id: ref(x.fornecedores, c.fornecedorId), venda_id: ref(x.vendas, c.vendaId),
        obs: ou(c.obs), ...(c.criadoEm ? {criado_em: c.criadoEm} : {})})},
    {nome: 'caixa_movimentos', col: 'movCaixa', filtro: (m, x) => x.caixas.has(m.caixaId),
      colunas: (m, x) => ({id: m.id, caixa_id: m.caixaId, tipo: m.tipo, valor: r(m.valor), forma: m.forma || 'DINHEIRO', descricao: ou(m.descricao), data: m.data, operador: ou(m.operador),
        venda_id: ref(x.vendas, m.vendaId), conta_id: ref(x.contas, m.contaId)})},
    {nome: 'estoque_movimentos', col: 'movEstoque',
      colunas: (m, x) => ({id: m.id, produto_id: ref(x.produtos, m.produtoId), produto_nome: m.produto || '—', unidade: m.unidade || 'UN', tipo: m.tipo, quantidade: r(m.quantidade),
        saldo: r(m.saldo), custo_unitario: m.custoUnitario ?? null, motivo: ou(m.motivo), venda_id: ref(x.vendas, m.vendaId), fornecedor_id: ref(x.fornecedores, m.fornecedorId),
        lote: ou(m.lote), data: m.data, usuario: ou(m.usuario)})},
    {nome: 'conta_bancaria_movimentos', col: 'movConta', filtro: (m, x) => x.contasBancarias.has(m.contaId),
      colunas: (m, x) => ({id: m.id, conta_bancaria_id: m.contaId, tipo: m.tipo, valor: r(m.valor), descricao: m.descricao || '—', data: m.data,
        origem: ['AVULSO', 'TRANSFERENCIA', 'BAIXA', 'CAIXA'].includes(m.origem) ? m.origem : 'AVULSO', transferencia_id: ehUuid(m.transferencia) ? m.transferencia : null,
        conta_id: ref(x.contas, m.contaFinanceiraId), caixa_movimento_id: ref(x.movCaixa, m.movCaixaId), usuario: ou(m.usuario), ...(m.criadoEm ? {criado_em: m.criadoEm} : {})})},
    // Auditoria: só inclui (registro de quem fez o quê nunca muda nem sai)
    {nome: 'auditoria', col: 'auditoria', soInclui: true,
      colunas: a => ({id: a.id, data: a.data, usuario: ou(a.usuario), modulo: ou(a.modulo), descricao: a.descricao || '—', detalhe: ou(a.detalhe)}),
      filhos: [{nome: 'auditoria_alteracoes', por: 'auditoria_id', linhas: a => (a.alteracoes || []).map(x => ({auditoria_id: a.id, campo: String(x.campo), antes: ou(x.antes), depois: ou(x.depois)}))}]}
  ];
  const specDe = Object.fromEntries(SPECS.map(s => [s.nome, s]));
  const itensDe = (s, e, x) => (e[s.col] || []).filter(o => o && o.id && (!s.filtro || s.filtro(o, x)));
  const assinatura = o => JSON.stringify(o);
  const linhaDe = (s, o, x) => ({...s.colunas(o, x), extra: o});

  // Cadastros gravados antes do campo "extra" (versão anterior): montados pelas colunas
  function deColunas(nome, l, f){
    const ord = lista => lista.slice().sort((a, b) => r(a.ordem) - r(b.ordem));
    switch (nome) {
      case 'categorias': return {id: l.id, nome: l.nome, ordem: l.ordem, ativo: l.ativo, cozinha: l.cozinha};
      case 'grupos_adicionais': return {id: l.id, nome: l.nome, min: l.minimo, max: l.maximo, ativo: l.ativo,
        opcoes: ord(f('adicionais_opcoes', 'grupo_id', l.id)).map(o => ({id: o.id, nome: o.nome, preco: r(o.preco), ativo: o.ativo}))};
      case 'produtos': return {id: l.id, codigo: l.codigo, nome: l.nome, tipo: l.tipo, preco: r(l.preco), custo: r(l.custo), unidade: l.unidade, grupoId: l.categoria_id,
        controlaEstoque: l.controla_estoque, estoque: r(l.estoque), estoqueMinimo: r(l.estoque_minimo), foto: l.foto_url || '', descricao: l.descricao || '', ativo: l.ativo,
        tamanhos: ord(f('produto_tamanhos', 'produto_id', l.id)).map(t => ({id: t.id, nome: t.nome, preco: r(t.preco)})),
        ficha: f('produto_ficha_tecnica', 'produto_id', l.id).map(x => ({produtoId: x.insumo_id, quantidade: r(x.quantidade)})),
        gruposAdicionais: f('produto_grupos_adicionais', 'produto_id', l.id).map(x => x.grupo_id)};
      case 'mesas': return {id: l.id, numero: l.numero, descricao: l.descricao || '', lugares: l.lugares, ativo: l.ativo};
      case 'clientes': return {id: l.id, nome: l.nome, telefone: l.telefone || '', doc: l.documento || '', email: l.email || '', cep: l.cep || '', endereco: l.endereco || '',
        numero: l.numero || '', complemento: l.complemento || '', bairro: l.bairro || '', cidade: l.cidade || '', referencia: l.referencia || '', obs: l.obs || '', dataCadastro: l.criado_em};
      case 'formas_pagamento': return {id: l.id, nome: l.nome, tipo: l.tipo, ativo: l.ativo, ordem: l.ordem};
      default: return null;
    }
  }
  // Linha do banco → registro do sistema (o "extra" é o registro completo)
  const objetoDe = (nome, l, f) => !vazio(l.extra) ? l.extra : deColunas(nome, l, f);

  // ---- Leitura do banco ----
  async function lerTudo(tabela, ajuste = q => q){
    const todas = [];
    for (let de = 0; ; de += 1000) { // a API devolve no máximo 1000 linhas por vez
      const {data, error} = await ajuste(supa.from(tabela).select('*')).range(de, de + 999);
      if (error) throw new Error(`${tabela}: ${error.message}`);
      todas.push(...data);
      if (data.length < 1000) return todas;
    }
  }
  const FILHOS_ANTIGOS = ['adicionais_opcoes', 'produto_tamanhos', 'produto_ficha_tecnica', 'produto_grupos_adicionais'];
  async function baixarTudo(empresaId){
    const b = {};
    for (const s of SPECS) {
      b[s.nome] = s.nome === 'auditoria'
        ? (await supa.from('auditoria').select('*').order('data', {ascending: false}).range(0, 4999)).data || []
        : await lerTudo(s.nome, q => q.order('id'));
    }
    for (const t of FILHOS_ANTIGOS) b[t] = await lerTudo(t);
    const emp = await supa.from('empresas').select('*').eq('id', empresaId).maybeSingle();
    if (emp.error) throw new Error('empresas: ' + emp.error.message);
    b.empresa = emp.data;
    b.categorias_financeiras = await lerTudo('categorias_financeiras');
    b.sequencias = await lerTudo('sequencias');
    return b;
  }
  function estadoDoBanco(b){
    const f = (t, campo, id) => (b[t] || []).filter(x => x[campo] === id);
    const e = {};
    SPECS.forEach(s => { e[s.col] = (b[s.nome] || []).map(l => objetoDe(s.nome, l, f)).filter(Boolean); });
    e.auditoria = e.auditoria.slice().sort((x, y) => String(x.data).localeCompare(String(y.data)));
    // O banco devolve na ordem dos ids (aleatória): movimentos em ordem de data, como o sistema grava
    const porData = (x, y) => String(x.data || x.criadoEm || '').localeCompare(String(y.data || y.criadoEm || ''));
    ['movEstoque', 'movCaixa', 'movConta'].forEach(k => { if (e[k]) e[k] = e[k].slice().sort(porData); });
    return e;
  }
  // Configurações do restaurante (tabela empresas): colunas são o que vale para o nome e os dados da empresa
  function configDoBanco(emp){
    if (!emp) return null;
    const c = emp.config || {};
    return {...D.config(), ...c, nome: emp.nome, empresa: {...(D.config().empresa || {}), ...(c.empresa || {}), razaoSocial: emp.razao_social || '', cnpj: emp.cnpj || '',
      ie: emp.ie || '', telefone: emp.telefone || '', email: emp.email || '', cep: emp.cep || '', endereco: emp.endereco || '', numero: emp.numero || '',
      bairro: emp.bairro || '', cidade: emp.cidade || '', uf: emp.uf || ''}};
  }
  const linhaEmpresa = c => ({nome: c.nome, razao_social: ou(c.empresa?.razaoSocial), cnpj: ou(c.empresa?.cnpj), ie: ou(c.empresa?.ie), telefone: ou(c.empresa?.telefone),
    email: ou(c.empresa?.email), cep: ou(c.empresa?.cep), endereco: ou(c.empresa?.endereco), numero: ou(c.empresa?.numero), bairro: ou(c.empresa?.bairro),
    cidade: ou(c.empresa?.cidade), uf: ou(c.empresa?.uf), config: c});
  const categoriasDoBanco = linhas => ({PAGAR: linhas.filter(c => c.tipo === 'PAGAR').map(c => c.nome), RECEBER: linhas.filter(c => c.tipo === 'RECEBER').map(c => c.nome)});
  const linhasCategorias = cat => ['PAGAR', 'RECEBER'].flatMap(t => (cat?.[t] || []).map(nome => ({tipo: t, nome})));

  // ---- Gravação: compara com o que o banco tem e manda só a diferença ----
  let espelho = {};            // tabela → Map(id → registro em JSON), o que o banco tem
  let espelhoConfig = '', espelhoCategorias = new Set(), espelhoSeq = '';
  let empresaAtual = null;
  function montarEspelho(e){
    const x = contexto(e);
    espelho = {};
    SPECS.forEach(s => { espelho[s.nome] = new Map(itensDe(s, e, x).map(o => [o.id, assinatura(o)])); });
  }
  const lotes = (lista, n) => Array.from({length: Math.ceil(lista.length / n)}, (_, k) => lista.slice(k * n, k * n + n));
  async function pedir(promessa, tabela){ const {data, error} = await promessa; if (error) { const e = new Error(`${tabela}: ${error.message}`); e.supa = error; e.tabela = tabela; throw e; } return data; }
  // Registros que mudaram aqui em relação ao que o banco confirmou
  function mudancas(s, e, x){
    const antes = espelho[s.nome] || new Map();
    return itensDe(s, e, x).filter(o => s.soInclui ? !antes.has(o.id) : antes.get(o.id) !== assinatura(o));
  }
  function anotarSujos(empresaId, e){
    if (!empresaId) return;
    const x = contexto(e), j = lerSujos();
    const d = j && j.empresa === empresaId ? j : {empresa: empresaId, tabelas: {}, config: false};
    SPECS.forEach(s => mudancas(s, e, x).forEach(o => { const l = (d.tabelas[s.nome] ||= []); if (!l.includes(o.id)) l.push(o.id); }));
    if (espelhoConfig && assinatura(D.config()) !== espelhoConfig) d.config = true;
    try { localStorage.setItem(CHAVE_SUJOS, JSON.stringify(d)); } catch (x2) { /* storage indisponível */ }
  }
  // Registro recusado pelo banco por já ter sido excluído (registros_excluidos): sai também daqui
  function tirarLocal(s, ids){
    if (!ids.size || !D[s.col]) return;
    D.substituirCadastros({[s.col]: D[s.col]().filter(o => !ids.has(o.id))});
    ids.forEach(id => espelho[s.nome]?.delete(id));
  }

  // apenas: {tabela: Set(ids)} — envia só esses registros (diário do que foi feito sem conexão)
  async function enviarEstado(e, {semExcluir = false, apenas = null, config = true} = {}){
    const x = contexto(e);
    const daEmpresa = l => ({...l, empresa_id: empresaAtual});
    let primeiroErro = null;
    const tentar = async fn => { try { await fn(); } catch (erro) { primeiroErro ||= erro; console.error('Supabase:', erro); } };
    const plano = SPECS.map(s => {
      const antes = espelho[s.nome] || new Map();
      const itens = itensDe(s, e, x);
      const mudou = mudancas(s, e, x).filter(o => !apenas || apenas[s.nome]?.has(o.id));
      const ids = new Set(itens.map(o => o.id));
      const saiu = semExcluir || apenas || s.soInclui ? [] : [...antes.keys()].filter(id => !ids.has(id));
      return {s, mudou, saiu};
    });
    // 1. Inclui/altera dos pais para os filhos (os filhos de cada pai alterado são regravados).
    //    O banco devolve o que gravou: o que não voltou foi barrado (já excluído) e sai daqui também.
    for (const {s, mudou} of plano) {
      if (!mudou.length) continue;
      await tentar(async () => {
        const salvos = new Set();
        for (const lote of lotes(mudou, 300)) {
          const data = await pedir(supa.from(s.nome).upsert(lote.map(o => daEmpresa(linhaDe(s, o, x))), {onConflict: 'id', ignoreDuplicates: !!s.soInclui}).select('id'), s.nome);
          (data || []).forEach(l => salvos.add(l.id));
        }
        const gravados = mudou.filter(o => salvos.has(o.id));
        const barrados = new Set(s.soInclui ? [] : mudou.filter(o => !salvos.has(o.id)).map(o => o.id));
        for (const f of s.filhos || []) {
          if (f.por && !s.soInclui) for (const lote of lotes(gravados.map(o => o.id), 150)) await pedir(supa.from(f.nome).delete().in(f.por, lote), f.nome);
          const linhas = gravados.flatMap(o => f.linhas(o, x));
          for (const lote of lotes(linhas, 500)) await pedir(supa.from(f.nome).insert(lote.map(daEmpresa)), f.nome);
        }
        (s.soInclui ? mudou : gravados).forEach(o => (espelho[s.nome] ||= new Map()).set(o.id, assinatura(o)));
        if (barrados.size) { barrados.forEach(id => x[s.col]?.delete(id)); tirarLocal(s, barrados); console.warn(`Supabase: ${barrados.size} registro(s) de ${s.nome} já excluído(s) no banco`); }
      });
    }
    // 2. Exclui dos filhos para os pais
    for (const {s, saiu} of plano.slice().reverse()) {
      if (!saiu.length) continue;
      await tentar(async () => {
        for (const lote of lotes(saiu, 150)) await pedir(supa.from(s.nome).delete().in('id', lote), s.nome);
        saiu.forEach(id => espelho[s.nome].delete(id));
      });
    }
    if (!config) { if (primeiroErro) throw primeiroErro; return; }
    // 3. Configurações, categorias financeiras e numeração
    const cfg = assinatura(D.config());
    if (cfg !== espelhoConfig && empresaAtual) { await pedir(supa.from('empresas').update(linhaEmpresa(D.config())).eq('id', empresaAtual), 'empresas'); espelhoConfig = cfg; }
    const cats = linhasCategorias(D.categorias());
    const novasCats = cats.filter(c => !espelhoCategorias.has(c.tipo + '|' + c.nome));
    if (novasCats.length) await pedir(supa.from('categorias_financeiras').upsert(novasCats.map(daEmpresa), {onConflict: 'empresa_id,tipo,nome'}), 'categorias_financeiras');
    if (!semExcluir) for (const k of [...espelhoCategorias].filter(k => !cats.some(c => c.tipo + '|' + c.nome === k))) {
      const [tipo, nome] = k.split('|');
      await pedir(supa.from('categorias_financeiras').delete().eq('tipo', tipo).eq('nome', nome), 'categorias_financeiras');
    }
    espelhoCategorias = new Set(cats.map(c => c.tipo + '|' + c.nome));
    const seq = D.seq(), sseq = assinatura(seq);
    if (sseq !== espelhoSeq) {
      await pedir(supa.from('sequencias').upsert(['produto', 'caixa', 'venda'].map(nome => daEmpresa({nome, valor: r(seq[nome])})), {onConflict: 'empresa_id,nome'}), 'sequencias');
      espelhoSeq = sseq;
    }
    if (primeiroErro) throw primeiroErro;
  }

  // Dois computadores criaram a mesma "Venda #120" (ou caixa): o deste ganha o próximo número livre
  async function renumerar(tabela){
    const s = specDe[tabela];
    const {data, error} = await supa.from(tabela).select('numero').order('numero', {ascending: false}).limit(1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    let proximo = (data[0]?.numero || 0) + 1;
    const antes = espelho[tabela] || new Map();
    const lista = (D[s.col] ? D[s.col]() : []).map(o => !o.demo && !antes.has(o.id) && o.numero < proximo ? {...o, numero: proximo++} : o);
    D.substituirCadastros({[s.col]: lista.sort((a, b) => a.numero - b.numero)});
  }

  // Master em modo suporte: só grava se o banco ainda o considera nesta empresa
  async function conferirEmpresaDoMaster(){
    if (!D.sessaoAtual()?.master) return;
    const {data, error} = await supa.rpc('minha_empresa');
    if (error) throw error;
    if (data !== empresaAtual) throw Object.assign(new Error('O master entrou em outra empresa.'), {trocouEmpresa: true});
  }
  function saiuDaEmpresa(){
    aviso('Você voltou ao painel master ou entrou em outra empresa. Esta tela foi fechada sem salvar, para não misturar os dados.', 'erro');
    setTimeout(() => { D.encerrarSessao(); location.replace('master.html'); }, 4000);
  }

  // Fila: uma gravação por vez; se falhar, tenta de novo (o espelho só muda quando o banco confirma)
  let fila = Promise.resolve(), pendente = false, ocupado = false, tentarDeNovo = null, renumeracoes = 0;
  function agendar(){
    try { anotarSujos(empresaAtual, coletar()); } catch (e) { console.error(e); }
    if (pendente) return;
    pendente = true;
    fila = fila.then(async () => {
      pendente = false; ocupado = true;
      aviso('Salvando…');
      try { await conferirEmpresaDoMaster(); await enviarEstado(coletar()); aviso(''); clearTimeout(tentarDeNovo); renumeracoes = 0; if (!pendente) limparSujos(); }
      catch (e) {
        if (e.trocouEmpresa) { saiuDaEmpresa(); return; }
        console.error('Supabase:', e);
        const msg = e.supa?.message || e.message;
        if (/caixas_um_aberto/.test(msg)) {
          aviso('Já existe um caixa aberto em outro computador. Recarregando com os dados do servidor…', 'erro');
          setTimeout(() => location.reload(), 3000);
        } else if (/numero_key|_numero/.test(msg) && (e.tabela === 'vendas' || e.tabela === 'caixas') && ++renumeracoes <= 5) {
          await renumerar(e.tabela).catch(x => console.error(x));
          ocupado = false; agendar(); return;
        } else {
          aviso('Não foi possível salvar no servidor: ' + traduzir(msg) + ' Tentando de novo…', 'erro');
          clearTimeout(tentarDeNovo); tentarDeNovo = setTimeout(agendar, 15000);
        }
      } finally { ocupado = false; }
    });
  }

  // ---- Tempo real: aplica o que outros computadores gravaram ----
  const remotos = {}; let timerRemoto = null;
  function aoMudarNoBanco(tabela, payload){
    if (tabela === 'empresas') { remotos.empresas = true; }
    else {
      if (payload.new?.empresa_id && payload.new.empresa_id !== empresaAtual) return;
      const id = payload.new?.id || payload.old?.id;
      if (!id) return;
      (remotos[tabela] ||= new Set()).add(id);
    }
    clearTimeout(timerRemoto);
    timerRemoto = setTimeout(aplicarRemotos, 500);
  }
  async function aplicarRemotos(){
    if (pendente || ocupado) { timerRemoto = setTimeout(aplicarRemotos, 800); return; } // termina de gravar antes
    const tabelas = Object.keys(remotos);
    for (const tabela of tabelas) {
      const ids = remotos[tabela]; delete remotos[tabela];
      if (tabela === 'empresas') {
        const {data} = await supa.from('empresas').select('*').eq('id', empresaAtual).maybeSingle();
        const c = configDoBanco(data);
        if (c && assinatura(c) !== assinatura(D.config()) && assinatura(D.config()) === espelhoConfig) { D.substituirCadastros({config: c}); espelhoConfig = assinatura(c); }
        continue;
      }
      const s = specDe[tabela];
      const {data, error} = await supa.from(tabela).select('*').in('id', [...ids]);
      if (error) { console.error(error); ids.forEach(id => (remotos[tabela] ||= new Set()).add(id)); clearTimeout(timerRemoto); timerRemoto = setTimeout(aplicarRemotos, 5000); continue; }
      const vieram = new Map(data.map(l => [l.id, objetoDe(tabela, l, () => [])]));
      const antes = espelho[tabela] || new Map();
      const atual = D[s.col] ? D[s.col]() : [];
      // Não pisa em alteração feita aqui e ainda não gravada
      const livre = id => { const o = atual.find(x => x.id === id); return !o || antes.get(id) === assinatura(o); };
      let lista = atual.filter(o => !ids.has(o.id) || !livre(o.id) || vieram.has(o.id));
      lista = lista.map(o => ids.has(o.id) && livre(o.id) && vieram.has(o.id) ? vieram.get(o.id) : o);
      vieram.forEach((o, id) => { if (!atual.some(x => x.id === id)) lista.push(o); });
      if (s.numerado) lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
      D.substituirCadastros({[s.col]: lista});
      ids.forEach(id => { if (vieram.has(id)) { if (livre(id)) antes.set(id, assinatura(vieram.get(id))); } else antes.delete(id); });
    }
  }
  function ligarTempoReal(){
    if (!supa.channel) return;
    let canal = supa.channel('mga-' + empresaAtual);
    [...SPECS.filter(s => s.nome !== 'auditoria').map(s => s.nome), 'empresas'].forEach(t => {
      canal = canal.on('postgres_changes', {event: '*', schema: 'public', table: t}, p => aoMudarNoBanco(t, p));
    });
    // Usuário criado/alterado em outro computador: recarrega a lista
    canal = canal.on('postgres_changes', {event: '*', schema: 'public', table: 'usuarios'}, () => { carregarUsuarios().catch(e => console.error(e)); });
    let conectou = false;
    canal.subscribe(status => { if (status === 'SUBSCRIBED') { if (conectou) conferirExclusoes(true); conectou = true; } });
    window.addEventListener?.('online', () => conferirExclusoes(true));
    document.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible') conferirExclusoes(); });
  }
  // O tempo real não reenvia o que perdeu (internet caiu, computador dormiu): confere quais registros
  // ainda existem no banco e tira daqui os excluídos (os alterados aqui e ainda não gravados ficam)
  let ultimaConferencia = Date.now();
  async function conferirExclusoes(agora){
    if (!empresaAtual || pendente || ocupado || (!agora && Date.now() - ultimaConferencia < 120000)) return;
    ultimaConferencia = Date.now();
    try {
      for (const s of SPECS.filter(x => !x.soInclui)) {
        const antes = espelho[s.nome];
        const atual = D[s.col] ? D[s.col]() : [];
        if (!antes || !atual.some(o => antes.has(o.id))) continue;
        const noBanco = new Set();
        for (let de = 0; ; de += 1000) {
          const {data, error} = await supa.from(s.nome).select('id').range(de, de + 999);
          if (error) throw error;
          data.forEach(l => noBanco.add(l.id));
          if (data.length < 1000) break;
        }
        const sumiram = new Set(atual.filter(o => antes.has(o.id) && !noBanco.has(o.id) && antes.get(o.id) === assinatura(o)).map(o => o.id));
        if (sumiram.size) tirarLocal(s, sumiram);
      }
    } catch (e) { console.error('Supabase (conferência):', e); }
  }

  // ---- Primeira vez neste navegador (ou versão anterior): junta navegador e banco ----
  // Cadastros iguais (mesmo nome/código) ficam com o id do banco; o resto ganha um id novo
  // (uuid). Os ids são trocados em tudo o que está guardado, para nada perder a ligação.
  function trocarIdsGuardados(mapa){
    const trocar = v => typeof v === 'string' ? (mapa[v] || v) : Array.isArray(v) ? v.map(trocar)
      : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trocar(x)])) : v;
    [localStorage, sessionStorage].forEach(arm => {
      for (let i = 0; i < arm.length; i++) {
        const k = arm.key(i);
        if (!k || !k.startsWith('mga_') || ['mga_tema', 'mga_sessao', 'mga_usuario', 'mga_restUsuarios', CHAVE_MARCA, CHAVE_VERSAO].includes(k)) continue;
        try { arm.setItem(k, JSON.stringify(trocar(JSON.parse(arm.getItem(k))))); } catch (e) { /* valor que não é JSON: fica como está */ }
      }
    });
  }
  const GUARDADO = {grupos: 'restGrupos', adicionais: 'restAdicionais', produtos: 'restProdutos', mesas: 'restMesas', clientes: 'clientes', formas: 'restFormas',
    fornecedores: 'restFornecedores', funcionarios: 'restFuncionarios', entregadores: 'restEntregadores', regioes: 'restRegioes', aplicativos: 'restAplicativos',
    embalagens: 'restEmbalagens', promocoes: 'restPromocoes', contasBancarias: 'restContasBancarias', caixas: 'restCaixas', vendas: 'restVendas', contas: 'restContas',
    movCaixa: 'restMovCaixa', movEstoque: 'restMovEstoque', movConta: 'restMovConta', auditoria: 'auditoria'};
  const lerGuardado = k => { try { return JSON.parse(localStorage.getItem('mga_' + k)); } catch (e) { return null; } };
  function estadoGuardado(){
    const e = {};
    Object.entries(GUARDADO).forEach(([col, k]) => { e[col] = lerGuardado(k) || []; });
    e.caixas = semDemo(e.caixas); e.vendas = semDemo(e.vendas); e.contas = semDemo(e.contas);
    return e;
  }

  async function juntar(banco){
    const exemplo = !!lerGuardado('cadastrosExemplo');
    const local = estadoGuardado();
    const doBanco = estadoDoBanco(banco);
    const mapa = {}, novos = new Set();
    const idNovo = id => ehUuid(id) ? id : D.novoId();
    // Cadastros: mesmo nome/código no banco → mesmo id
    SPECS.filter(s => s.natural).forEach(s => {
      const porChave = new Map((doBanco[s.col] || []).filter(o => s.natural(o)).map(o => [s.natural(o), o]));
      (local[s.col] || []).forEach(o => {
        const igual = s.natural(o) && porChave.get(s.natural(o));
        mapa[o.id] = igual ? igual.id : idNovo(o.id);
        if (!igual) novos.add(mapa[o.id]);
        // Itens de dentro (opções e tamanhos): pelo nome dentro do mesmo cadastro
        (o.opcoes || []).forEach(op => { const x = igual?.opcoes?.find(y => nrm(y.nome) === nrm(op.nome)); mapa[op.id] = x ? x.id : idNovo(op.id); });
        (o.tamanhos || []).forEach(t => { const x = igual?.tamanhos?.find(y => nrm(y.nome) === nrm(t.nome)); mapa[t.id] = x ? x.id : idNovo(t.id); });
      });
    });
    // Todo o resto (vendas, itens, pagamentos, caixas, movimentos...): ids antigos viram uuid
    const visitar = v => {
      if (Array.isArray(v)) return v.forEach(visitar);
      if (!v || typeof v !== 'object') return;
      if (typeof v.id === 'string' && !ehUuid(v.id) && !(v.id in mapa)) mapa[v.id] = D.novoId();
      if (typeof v.transferencia === 'string' && !ehUuid(v.transferencia) && !(v.transferencia in mapa)) mapa[v.transferencia] = D.novoId();
      Object.values(v).forEach(visitar);
    };
    Object.values(GUARDADO).forEach(k => visitar(lerGuardado(k)));
    Object.keys(mapa).forEach(k => { if (mapa[k] === k) delete mapa[k]; });
    trocarIdsGuardados(mapa);
    // Auditoria antiga sem id ganha um
    const aud = lerGuardado('auditoria') || [];
    if (aud.some(a => !a.id)) localStorage.setItem('mga_auditoria', JSON.stringify(aud.map(a => a.id ? a : {...a, id: D.novoId()})));

    // O que vai para o banco
    const e = estadoGuardado();
    const bancoVazio = !doBanco.grupos.length && !doBanco.produtos.length;
    SPECS.filter(s => s.natural).forEach(s => {
      if (exemplo) { e[s.col] = []; return; }                       // cardápio de exemplo deste navegador não vai para o banco
      if (bancoVazio) return;                                      // restaurante novo no banco: vai tudo daqui
      e[s.col] = e[s.col].filter(o => novos.has(o.id));            // banco já tem: só o que falta lá
    });
    montarEspelho(doBanco);
    espelhoCategorias = new Set(linhasCategorias(categoriasDoBanco(banco.categorias_financeiras)).map(c => c.tipo + '|' + c.nome));
    espelhoSeq = assinatura(D.seq()); // a numeração vem do maior número existente; não precisa enviar agora
    // Configurações: as deste navegador valem se não for um navegador novo (cardápio de exemplo)
    espelhoConfig = exemplo ? assinatura(D.config()) : '';
    await enviarEstado(e, {semExcluir: true});
  }

  // ---- Usuários da equipe: lidos do banco; criados/alterados/excluídos pela Edge Function "usuarios" ----
  async function carregarUsuarios(){
    const {data, error} = await supa.from('usuarios').select('id, nome, login, perfil, ativo, criado_em, usuario_modulos!usuario_modulos_usuario_id_mesma_empresa(modulo)').eq('empresa_id', empresaAtual);
    if (error) throw new Error('usuarios: ' + error.message);
    const master = D.sessaoAtual()?.master ? D.sessaoAtual() : null;
    if (!data.length && !master) return; // sem migração/permissão: mantém a lista local (o usuário logado não pode sumir)
    D.substituirCadastros({usuarios: [...data.filter(u => u.id !== master?.id).map(u => {
      const perfil = D.PERFIS[u.perfil] ? u.perfil : 'CAIXA', mods = (u.usuario_modulos || []).map(m => m.modulo).filter(m => D.MODULOS[m]);
      return {id: u.id, nome: u.nome, login: u.login, perfil, ativo: u.ativo, criadoEm: u.criado_em, empresaId: empresaAtual, nuvem: true,
        modulos: perfil === 'ADMIN' ? Object.keys(D.MODULOS) : (mods.length ? mods : D.PERFIS[perfil].modulos)};
    }), ...(master ? [master] : [])]});
  }
  const regra = msg => Object.assign(new Error(msg), {regra: true});
  async function chamarFuncao(corpo){
    const {data, error} = await supa.functions.invoke('usuarios', {body: corpo});
    if (error) {
      let msg = error.message;
      try { msg = (await error.context.json()).erro || msg; } catch (e) { /* resposta sem JSON */ }
      if (/Failed to send|fetch|NetworkError|not found|404/i.test(msg)) msg = 'Não foi possível falar com o servidor. Confira a internet e se a função "usuarios" foi publicada no Supabase.';
      throw regra(msg);
    }
    if (data?.erro) throw regra(data.erro);
    return data;
  }
  // Mesmas telas, outro caminho: em vez de guardar a senha no navegador, cria o login de verdade no Supabase
  function ligarUsuarios(){
    D.salvarUsuario = async (d, id) => {
      if (!D.podeAcessar('configuracoes')) throw regra('Só o administrador cadastra usuários.');
      if (!id || d.senha) {
        if (String(d.senha || '').length < 6) throw regra(id ? 'A nova senha precisa ter pelo menos 6 caracteres.' : 'Informe a senha (pelo menos 6 caracteres).');
        if (d.senha !== d.confirmar) throw regra('As senhas não conferem.');
      }
      const email = String(d.login || '').trim().toLowerCase();
      const r = await chamarFuncao({acao: 'salvar', id: id || null, nome: d.nome, email, perfil: d.perfil, ativo: d.ativo !== false,
        senha: d.senha || '', modulos: Array.isArray(d.modulos) ? d.modulos : []});
      await carregarUsuarios();
      D.registrarAuditoria('Configurações', `Usuário "${String(d.nome).trim()}" (${email}) ${id ? 'editado' : 'cadastrado'} como ${D.PERFIS[d.perfil]?.nome || d.perfil}`);
      return D.usuarioPorId(r.id) || {id: r.id, nome: d.nome, login: email};
    };
    D.excluirUsuario = async id => {
      const u = D.usuarioPorId(id);
      await chamarFuncao({acao: 'excluir', id});
      await carregarUsuarios();
      D.registrarAuditoria('Configurações', `Usuário "${u?.nome || id}" excluído`);
    };
  }

  // ---- Início ----
  async function iniciar(){
    const u = D.sessaoAtual();
    if (!supa || !u?.empresaId) return; // sem Supabase (offline ou login antigo): segue com o navegador
    const {data: {session}} = await supa.auth.getSession();
    if (!session) { soNesteNavegador(u.empresaId, 'Sem conexão com o servidor.'); return; }
    empresaAtual = u.empresaId;
    try { await conferirEmpresaDoMaster(); } catch (e) { if (e.trocouEmpresa) { saiuDaEmpresa(); return new Promise(() => {}); } throw e; }
    aviso('Carregando os dados do restaurante…');
    const banco = await baixarTudo(u.empresaId);
    const marca = localStorage.getItem(CHAVE_MARCA);
    if (marca === null || (marca === u.empresaId && localStorage.getItem(CHAVE_VERSAO) !== VERSAO)) {
      await juntar(banco);
      localStorage.setItem(CHAVE_MARCA, u.empresaId);
      localStorage.setItem(CHAVE_VERSAO, VERSAO);
      location.reload();
      return new Promise(() => {}); // a página vai recarregar
    }
    // Alterações deste navegador que não chegaram ao banco (sem internet, erro, página fechada): envia antes
    let banco2 = banco;
    const sujos = lerSujos();
    if (marca === u.empresaId && sujos?.empresa === u.empresaId && (Object.values(sujos.tabelas || {}).some(l => l.length) || sujos.config)) {
      aviso('Enviando alterações feitas sem conexão…');
      montarEspelho(estadoDoBanco(banco));
      espelhoConfig = assinatura(configDoBanco(banco.empresa) || {});
      const apenas = Object.fromEntries(Object.entries(sujos.tabelas || {}).map(([k, v]) => [k, new Set(v)]));
      try { await enviarEstado(coletar(), {semExcluir: true, apenas, config: !!sujos.config}); }
      catch (e) {
        if (!e.supa) throw e; // sem internet: segue com o navegador e tenta de novo depois
        console.error('Supabase:', e);
        setTimeout(() => aviso('Algumas alterações feitas sem conexão não puderam ser gravadas: ' + traduzir(e.supa.message), 'erro'), 1500);
      }
      limparSujos();
      banco2 = await baixarTudo(u.empresaId);
    } else limparSujos(); // marca antiga (versão anterior) ou de outra empresa: nada a reenviar
    return carregarDoBanco(u, banco2, marca);
  }
  async function carregarDoBanco(u, banco, marca){
    // Daqui em diante vale o que está no banco (outro restaurante neste navegador também cai aqui)
    const mesmaEmpresa = marca === u.empresaId;
    localStorage.setItem(CHAVE_MARCA, u.empresaId);
    localStorage.setItem(CHAVE_VERSAO, VERSAO);
    const e = estadoDoBanco(banco);
    // Dados de demonstração ficam só neste navegador; auditoria ainda não enviada também
    if (mesmaEmpresa) {
      ['caixas', 'vendas', 'contas'].forEach(col => { e[col] = [...e[col], ...D[col]().filter(o => o.demo)]; });
      const idsAud = new Set(e.auditoria.map(a => a.id));
      e.auditoria = [...e.auditoria, ...D.auditoria().filter(a => a.id && !idsAud.has(a.id))].sort((a, b) => String(a.data).localeCompare(String(b.data)));
    }
    const config = configDoBanco(banco.empresa);
    const categorias = banco.categorias_financeiras.length ? categoriasDoBanco(banco.categorias_financeiras) : D.categorias();
    const seqBanco = Object.fromEntries(banco.sequencias.map(x => [x.nome, Number(x.valor) || 0]));
    D.substituirCadastros({...e, ...(config ? {config} : {}), categorias, seq: {produto: Math.max(D.seq().produto || 0, seqBanco.produto || 0),
      caixa: Math.max(D.seq().caixa || 0, seqBanco.caixa || 0), venda: Math.max(D.seq().venda || 0, seqBanco.venda || 0)}});
    montarEspelho(e);
    espelhoConfig = assinatura(D.config());
    espelhoCategorias = new Set(linhasCategorias(D.categorias()).map(c => c.tipo + '|' + c.nome));
    espelhoSeq = assinatura(D.seq());
    await carregarUsuarios();
    ligarUsuarios();
    D.aoSalvar(() => agendar());
    ligarTempoReal();
    window.MGA_NUVEM.ativa = true;
    aviso('');
  }

  // Sem servidor: só segue com os dados deste navegador se forem desta mesma empresa
  function soNesteNavegador(empresaId, motivo){
    const marca = localStorage.getItem(CHAVE_MARCA);
    if (marca && marca !== empresaId) {
      const raiz = document.getElementById('appShell');
      if (raiz) raiz.innerHTML = '<div class="content"><div class="card rest-offline"><b>Não foi possível carregar os dados da empresa.</b><p>' + motivo
        + ' Confira a internet e recarregue a página (F5).</p></div></div>';
      return true;
    }
    // O que for feito agora vai para o banco na próxima abertura com internet (só o que mudar daqui em diante)
    montarEspelho(coletar()); espelhoConfig = assinatura(D.config());
    D.aoSalvar(() => anotarSujos(empresaId, coletar()));
    aviso(motivo + ' Usando os dados deste navegador; eles serão enviados quando a conexão voltar (recarregue a página).', 'erro');
    if (supa?.auth?.onAuthStateChange) supa.auth.onAuthStateChange((ev, s) => { if (s && ev !== 'INITIAL_SESSION') aviso('A conexão voltou. Recarregue a página (F5) para enviar as alterações.', 'erro'); });
    return false;
  }

  window.MGA_NUVEM = {ativa: false, baixarTudo, estadoDoBanco, aoMudarNoBanco, aplicarRemotos, agendar};
  // A tela só é montada depois que os dados chegam (restaurante.js espera esta promessa)
  window.MGA_PRONTO = iniciar().catch(e => {
    console.error('Supabase:', e);
    const u = D.sessaoAtual();
    if (u?.empresaId && soNesteNavegador(u.empresaId, 'Não foi possível carregar do servidor (' + traduzir(e.supa?.message || e.message) + ').')) return new Promise(() => {});
  });
})();
