// =====================================================================
// ---- 🍽️ MGA Restaurante · dados e regras de negócio ----
// =====================================================================
// Camada de dados do sistema, sem nenhuma tela: modelos, cadastro de exemplo,
// regras, dashboard, auditoria e backup. As telas (restaurante-*.js) só leem e
// gravam por aqui.
//
// Tudo fica no localStorage com o prefixo "mga_" (entra no backup):
//   restUsuarios, restFormas, restGrupos, restProdutos, restEntregadores, restCaixas,
//   restMovCaixa, restVendas, restSeq, restContas, restCategorias, restMovEstoque,
//   restFornecedores, restFuncionarios, restRegioes, restConfig (com empresa e impressão),
//   restAdicionais (adicionais e etapas), restPromocoes, restAplicativos, restEmbalagens,
//   restContasBancarias, restMovConta (extrato das contas bancárias),
//   clientes (com bairro, CEP, cidade e complemento), auditoria
//
// Regras gerais:
// - Nenhuma venda com o caixa fechado; toda venda pertence ao caixa aberto.
// - Tipo da venda: BALCAO, MESA, DELIVERY ou ENCOMENDA.
// - Status da venda: ABERTA, FINALIZADA ou CANCELADA.
// - Pagamentos misturados: Dinheiro, Débito, Crédito, Prazo e Outros (PIX,
//   Cheque, Cortesia), além de Desconto (abate do total) e Acréscimo (soma).
// - O que é pago "a prazo" vira conta a receber do cliente ao finalizar a venda.
(function(){
  'use strict';

  const TIPOS_VENDA = {BALCAO: 'Balcão', MESA: 'Mesa', DELIVERY: 'Delivery', ENCOMENDA: 'Encomenda'};
  const STATUS_VENDA = {ABERTA: 'Aberta', FINALIZADA: 'Finalizada', CANCELADA: 'Cancelada'};
  // Tipos de forma de pagamento: definem como o valor entra no caixa e nos relatórios.
  // As formas em si (nome, ativa) são um cadastro: dá para ter "Vale-refeição" do tipo OUTROS.
  const TIPOS_FORMA = {DINHEIRO: 'Dinheiro', PIX: 'PIX', DEBITO: 'Cartão de débito', CREDITO: 'Cartão de crédito', PRAZO: 'A prazo', OUTROS: 'Outros'};
  const FORMAS_PADRAO = [['Dinheiro', 'DINHEIRO', true], ['PIX', 'PIX', true], ['Cartão de débito', 'DEBITO', true], ['Cartão de crédito', 'CREDITO', true],
    ['Vale-refeição', 'OUTROS', true], ['Cheque', 'OUTROS', false], ['Cortesia', 'OUTROS', false], ['A prazo (fiado)', 'PRAZO', false]];
  // Vendas antigas guardavam desconto/acréscimo como "pagamento"; continuam sendo lidas
  const AJUSTES = ['DESCONTO', 'ACRESCIMO'];
  const TIPOS_MOV_CAIXA = {ABERTURA: 'Abertura', SUPRIMENTO: 'Suprimento', SANGRIA: 'Sangria', ESTORNO: 'Estorno', RECEBIMENTO: 'Recebimento', PAGAMENTO: 'Pagamento'};
  // Movimentos que entram (+) ou saem (−) do caixa
  const MOV_ENTRADA = ['SUPRIMENTO', 'RECEBIMENTO'], MOV_SAIDA = ['SANGRIA', 'ESTORNO', 'PAGAMENTO'];
  const VEICULOS = ['Moto', 'Bicicleta', 'Carro', 'A pé'];
  const CARGOS = ['Gerente', 'Caixa', 'Garçom', 'Cozinheiro(a)', 'Auxiliar de cozinha', 'Pizzaiolo', 'Chapeiro', 'Atendente', 'Entregador', 'Serviços gerais'];
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  // Dados da empresa (aparecem nas impressões) e preferências de impressão
  const EMPRESA_PADRAO = {razaoSocial: '', cnpj: '', ie: '', telefone: '', email: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '', uf: ''};
  const IMPRESSAO_PADRAO = {largura: '80', cupomModo: 'NAO', comandaAuto: false, viasComanda: 1, rodape: 'Obrigado pela preferência! Volte sempre.'};
  const MODOS_CUPOM = {NAO: 'Não imprimir', PERGUNTAR: 'Perguntar se quer imprimir', SEMPRE: 'Imprimir sempre'};
  const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX', 'DZ', 'PORÇÃO'];
  // Estoque: tipos de movimento e motivos sugeridos para a saída manual
  const TIPOS_MOV_ESTOQUE = {ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste de inventário', VENDA: 'Venda', ESTORNO: 'Venda cancelada', PRODUCAO: 'Produção'};
  // Produto de venda aparece no cardápio; insumo (pão, carne, molho...) só existe no estoque e na ficha técnica
  const TIPOS_PRODUTO = {VENDA: 'Produto de venda', INSUMO: 'Insumo'};
  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MOTIVOS_SAIDA = ['Perda / quebra', 'Produto vencido', 'Consumo interno', 'Cortesia', 'Devolução ao fornecedor'];
  // ---- Usuários: perfis e módulos que cada um acessa (o administrador ajusta por usuário) ----
  const MODULOS = {cadastros: 'Cadastros', financeiro: 'Financeiro', estoque: 'Estoque', vendas: 'Vendas / PDV e caixa', mesas: 'Mesas', cozinha: 'Fila de produção (cozinha)',
    delivery: 'Delivery', relatorios: 'Relatórios', configuracoes: 'Configurações'};
  const PERFIS = {
    ADMIN: {nome: 'Administrador', modulos: Object.keys(MODULOS)},
    GERENTE: {nome: 'Gerente', modulos: ['vendas', 'relatorios', 'financeiro', 'estoque', 'mesas', 'delivery', 'cozinha']},
    CAIXA: {nome: 'Operador / Caixa', modulos: ['vendas', 'mesas', 'delivery', 'cozinha']},
    GARCOM: {nome: 'Garçom', modulos: ['mesas']},
    COZINHA: {nome: 'Cozinha', modulos: ['cozinha']}
  };
  // Financeiro: contas a pagar (despesas) e a receber
  const TIPOS_CONTA = {PAGAR: 'A pagar', RECEBER: 'A receber'};
  const FORMAS_BAIXA = ['Dinheiro', 'PIX', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência'];
  const CATEGORIAS_PADRAO = {
    PAGAR: ['Fornecedores', 'Aluguel', 'Salários', 'Energia', 'Água', 'Gás', 'Internet e telefone', 'Impostos', 'Manutenção', 'Marketing', 'Outras despesas'],
    RECEBER: ['Vendas a prazo', 'Outras receitas']
  };
  const CATEGORIA_PRAZO = 'Vendas a prazo';
  const PRAZO_DIAS = 30; // vencimento padrão da conta gerada por venda a prazo

  // ---- Armazenamento ----
  const ler = (k, def) => { try { const raw = localStorage.getItem('mga_' + k); return raw !== null ? JSON.parse(raw) : def; } catch (e) { return def; } };
  const gravar = (k, v) => { try { localStorage.setItem('mga_' + k, JSON.stringify(v)); } catch (e) { /* storage indisponível */ } };
  // Supabase (restaurante-nuvem.js): recebe as chaves salvas para gravar no banco
  const aoSalvarFns = new Set();
  // Ids no formato uuid, o mesmo usado no Supabase (o prefixo antigo só fica nos dados anteriores)
  const novoId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const r3 = v => Math.round((Number(v) || 0) * 1000) / 1000; // quantidades (0,350 KG)
  const agora = () => new Date().toISOString();
  // Datas de calendário no fuso local, no formato AAAA-MM-DD (vencimentos, dias do dashboard)
  const diaISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hojeISO = () => diaISO(new Date());
  const dataBR = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
  const txt = v => String(v ?? '').trim();
  const norm = v => txt(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  const digitos = v => String(v ?? '').replace(/\D/g, '');
  // "1.234,56" / "1234,5" (vírgula decimal) ou "1234.56" (ponto decimal)
  function lerValor(v){
    if (typeof v === 'number') return v;
    const t = txt(v).replace(/^R\$\s*/i, '');
    if (!t || !/^-?[\d.,\s]+$/.test(t)) return NaN;
    if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(t)) return Number(t.replace(/,/g, '')); // 1,234.56
    // "1.250" (pontos a cada 3 dígitos, sem vírgula) é milhar: 1250, como o qtdBR escreve
    const milhar = /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t);
    const n = Number(t.includes(',') || milhar ? t.replace(/[.\s]/g, '').replace(',', '.') : t);
    return Number.isFinite(n) ? n : NaN;
  }
  // ---- Usuários e sessão ----
  // Senha guardada só como hash SHA-256 com "sal" próprio de cada usuário. Atenção: tudo roda no
  // navegador, então isso evita senha legível no armazenamento, mas não substitui um servidor.
  let usuarios = ler('restUsuarios', []);
  const CHAVE_SESSAO = 'mga_sessao';
  const armazens = () => [typeof sessionStorage !== 'undefined' ? sessionStorage : null, typeof localStorage !== 'undefined' ? localStorage : null].filter(Boolean);
  function sessaoAtual(){
    for (const s of armazens()) {
      try {
        const sessao = JSON.parse(s.getItem(CHAVE_SESSAO) || 'null');
        const u = sessao && usuarios.find(x => x.id === sessao.usuarioId && x.ativo);
        if (u) return u;
      } catch (e) { /* storage indisponível */ }
    }
    return null;
  }
  const usuario = () => sessaoAtual()?.nome || ler('usuario', 'Operador');

  // ---- Auditoria: quem fez cada alteração, e quando (mesma chave mga_auditoria do login) ----
  const LIMITE_AUDITORIA = 5000; // mantém os mais recentes para não estourar o armazenamento local
  function registrarAuditoria(modulo, descricao, extra){
    const lista = ler('auditoria', []);
    lista.push({id: novoId(), data: agora(), usuario: usuario(), modulo, descricao, ...(extra || {})});
    gravar('auditoria', lista.slice(-LIMITE_AUDITORIA));
    aoSalvarFns.forEach(fn => { try { fn(['auditoria']); } catch (e) { console.error(e); } });
  }
  let moduloAuditoria = 'Cadastros';
  // Cada bloco de funções marca o próprio módulo antes de auditar
  const auditar = (descricao, extra) => registrarAuditoria(moduloAuditoria, descricao, extra);
  const comModulo = (modulo, fn) => (...args) => { const antes = moduloAuditoria; moduloAuditoria = modulo; try { return fn(...args); } finally { moduloAuditoria = antes; } };

  // ---- Cadastro de exemplo (só na primeira vez) ----
  const SEED = {
    'Bebidas': [['Água Mineral 500ml', 4.00], ['Água com Gás 500ml', 4.50], ['Coca-Cola 2L', 14.00], ['Coca-Cola Lata 350ml', 6.00],
      ['Fanta 600ml', 8.00], ['Guaraná Antarctica 2L', 12.00], ['Suco Natural de Laranja', 9.00]],
    'Combo': [['Combo X-Burger + Batata + Refri', 34.90], ['Combo Executivo + Refri', 29.90], ['Combo Família (4 lanches + 2L)', 89.90]],
    'Hambúrguer Gourmet': [['Burger Clássico 180g', 32.90], ['Burger Bacon 180g', 36.90], ['Burger Cheddar Duplo', 42.90], ['Burger de Costela', 39.90]],
    'À la carte': [['Filé Mignon à Cubana', 89.90], ['Filé Mignon à Parmegiana', 84.90], ['Filé Mignon ao Molho Madeira', 82.90],
      ['Frango à Parmegiana', 59.90], ['Picanha na Chapa', 98.90]],
    'Lanches': [['X-Burger', 18.00], ['X-Salada', 20.00], ['X-Bacon', 24.00], ['X-Tudo', 29.00], ['Misto Quente', 12.00]],
    'Marmitex': [['Marmitex Pequena', 18.00], ['Marmitex Média', 22.00], ['Marmitex Grande', 26.00], ['Marmitex Executiva', 28.00]],
    'Porções': [['Batata Frita', 28.00], ['Calabresa Acebolada', 34.00], ['Frango a Passarinho', 38.00], ['Mandioca Frita', 26.00]],
    'Sobremesa': [['Pudim de Leite', 12.00], ['Petit Gâteau', 22.00], ['Mousse de Maracujá', 10.00], ['Sorvete 2 Bolas', 12.00]]
  };

  let grupos = ler('restGrupos', null);
  let produtos = ler('restProdutos', null);
  if (!Array.isArray(grupos)) {
    grupos = Object.keys(SEED).map((nome, k) => ({id: novoId('g'), nome, ordem: k + 1, ativo: true}));
    gravar('restGrupos', grupos);
  }
  if (!Array.isArray(produtos)) {
    gravar('cadastrosExemplo', true);
    produtos = [];
    let cod = 0;
    Object.entries(SEED).forEach(([grupo, itens]) => {
      const g = grupos.find(x => x.nome === grupo);
      if (!g) return;
      itens.forEach(([nome, preco]) => produtos.push({id: novoId('p'), codigo: String(++cod).padStart(3, '0'), nome, preco, grupoId: g.id, ativo: true}));
    });
    gravar('restProdutos', produtos);
  }
  let entregadores = ler('restEntregadores', []);
  const NOME_PADRAO = 'Meu Restaurante';
  let config = Object.assign({nome: NOME_PADRAO, taxaServico: 10, servicoPadrao: true, taxaEntrega: 0, entregaVerde: 20, entregaAmarelo: 40}, ler('restConfig', {}));
  config.empresa = {...EMPRESA_PADRAO, ...(config.empresa || {})};
  config.impressao = {...IMPRESSAO_PADRAO, ...(config.impressao || {})};
  // Versão anterior guardava só "cupom automático" (sim/não)
  if ('cupomAuto' in config.impressao) { config.impressao.cupomModo = config.impressao.cupomAuto ? 'SEMPRE' : config.impressao.cupomModo; delete config.impressao.cupomAuto; }
  let fornecedores = ler('restFornecedores', []);
  let funcionarios = ler('restFuncionarios', []);
  let regioes = ler('restRegioes', []);
  let mesas = ler('restMesas', null);
  if (!Array.isArray(mesas)) {
    mesas = Array.from({length: 12}, (_, k) => ({id: novoId('ms'), numero: String(k + 1).padStart(2, '0'), descricao: '', lugares: 4, ativo: true}));
    gravar('restMesas', mesas);
  }
  let formas = ler('restFormas', null);
  if (!Array.isArray(formas)) {
    formas = FORMAS_PADRAO.map(([nome, tipo, ativo], k) => ({id: novoId('fp'), nome, tipo, ativo, ordem: k + 1}));
    gravar('restFormas', formas);
  }
  // Produtos de versões anteriores ganham os campos do cadastro completo
  produtos.forEach(p => {
    if (p.custo === undefined) Object.assign(p, {custo: 0, estoque: 0, unidade: 'UN', foto: '', descricao: ''});
    // Antes do módulo Estoque: quem já tinha saldo informado passa a controlar
    if (p.controlaEstoque === undefined) Object.assign(p, {controlaEstoque: Number(p.estoque) !== 0, estoqueMinimo: 0});
    // Cardápio: tamanhos, adicionais/etapas e ficha técnica (insumos usados por unidade)
    if (p.tipo === undefined) Object.assign(p, {tipo: 'VENDA', tamanhos: [], gruposAdicionais: [], ficha: []});
  });
  // Categoria vai para a fila de produção da cozinha (bebidas, em geral, não)
  grupos.forEach(g => { if (g.cozinha === undefined) g.cozinha = !/bebida/i.test(g.nome); });
  let adicionais = ler('restAdicionais', []);
  let aplicativos = ler('restAplicativos', []);
  let contasBancarias = ler('restContasBancarias', []);
  let movConta = ler('restMovConta', []);
  let embalagens = ler('restEmbalagens', []);
  let promocoes = ler('restPromocoes', []);
  let caixas = ler('restCaixas', []);
  let movCaixa = ler('restMovCaixa', []);
  let vendas = ler('restVendas', []);
  let movEstoque = ler('restMovEstoque', []);
  let seq = Object.assign({produto: produtos.reduce((m, p) => Math.max(m, Number(p.codigo) || 0), 0), caixa: 0, venda: 0}, ler('restSeq', {}));
  let contas = ler('restContas', []);
  let categorias = ler('restCategorias', null);
  if (!categorias || !Array.isArray(categorias.PAGAR)) {
    categorias = JSON.parse(JSON.stringify(CATEGORIAS_PADRAO));
    gravar('restCategorias', categorias);
  }

  // Clientes: chave mga_clientes (a mesma do cadastro de clientes anterior, para não perder ninguém)
  const listaClientesArr = ler('clientes', []);
  const listaClientes = () => listaClientesArr;

  // ---- Avisos de mudança (as telas se inscrevem para redesenhar) ----
  const ouvintes = new Set();
  const on = fn => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
  let versao = 0;
  function salvar(...chaves){
    const mapa = {restGrupos: grupos, restProdutos: produtos, restEntregadores: entregadores, restUsuarios: usuarios, restFormas: formas,
      restCaixas: caixas, restMovCaixa: movCaixa, restVendas: vendas, restSeq: seq, clientes: listaClientes(),
      restContas: contas, restCategorias: categorias, restMesas: mesas, restConfig: config, restMovEstoque: movEstoque,
      restFornecedores: fornecedores, restFuncionarios: funcionarios, restRegioes: regioes, restAdicionais: adicionais, restPromocoes: promocoes,
      restAplicativos: aplicativos, restEmbalagens: embalagens, restContasBancarias: contasBancarias, restMovConta: movConta};
    chaves.forEach(k => gravar(k, mapa[k]));
    versao++;
    ouvintes.forEach(fn => fn(versao));
    aoSalvarFns.forEach(fn => { try { fn(chaves); } catch (e) { console.error(e); } });
  }
  const aoSalvar = fn => { aoSalvarFns.add(fn); return () => aoSalvarFns.delete(fn); };
  // Troca coleções pelas que vieram do banco (sem disparar nova gravação no banco)
  function substituirCadastros(d){
    const trocar = {
      grupos: v => { grupos = v; return 'restGrupos'; }, produtos: v => { produtos = v; return 'restProdutos'; },
      adicionais: v => { adicionais = v; return 'restAdicionais'; }, mesas: v => { mesas = v; return 'restMesas'; },
      formas: v => { formas = v; return 'restFormas'; }, clientes: v => { listaClientesArr.splice(0, listaClientesArr.length, ...v); return 'clientes'; },
      fornecedores: v => { fornecedores = v; return 'restFornecedores'; }, funcionarios: v => { funcionarios = v; return 'restFuncionarios'; },
      entregadores: v => { entregadores = v; return 'restEntregadores'; }, regioes: v => { regioes = v; return 'restRegioes'; },
      aplicativos: v => { aplicativos = v; return 'restAplicativos'; }, embalagens: v => { embalagens = v; return 'restEmbalagens'; },
      promocoes: v => { promocoes = v; return 'restPromocoes'; }, contasBancarias: v => { contasBancarias = v; return 'restContasBancarias'; },
      caixas: v => { caixas = v; return 'restCaixas'; }, movCaixa: v => { movCaixa = v; return 'restMovCaixa'; }, vendas: v => { vendas = v; return 'restVendas'; },
      contas: v => { contas = v; return 'restContas'; }, movEstoque: v => { movEstoque = v; return 'restMovEstoque'; }, movConta: v => { movConta = v; return 'restMovConta'; },
      categorias: v => { categorias = v; return 'restCategorias'; }, config: v => { config = v; return 'restConfig'; },
      usuarios: v => { usuarios = v; return 'restUsuarios'; }
    };
    const mapa = () => ({restGrupos: grupos, restProdutos: produtos, restAdicionais: adicionais, restMesas: mesas, restFormas: formas, clientes: listaClientes(),
      restFornecedores: fornecedores, restFuncionarios: funcionarios, restEntregadores: entregadores, restRegioes: regioes, restAplicativos: aplicativos,
      restEmbalagens: embalagens, restPromocoes: promocoes, restContasBancarias: contasBancarias, restCaixas: caixas, restMovCaixa: movCaixa,
      restVendas: vendas, restContas: contas, restMovEstoque: movEstoque, restMovConta: movConta, restCategorias: categorias, restConfig: config, restUsuarios: usuarios});
    const chaves = Object.keys(d).filter(k => trocar[k]).map(k => trocar[k](d[k]));
    if (d.seq) Object.assign(seq, d.seq);
    // Numeração continua do maior número existente
    seq.produto = Math.max(seq.produto || 0, produtos.reduce((m, p) => Math.max(m, Number(p.codigo) || 0), 0));
    seq.venda = Math.max(seq.venda || 0, vendas.reduce((m, v) => Math.max(m, v.numero || 0), 0));
    seq.caixa = Math.max(seq.caixa || 0, caixas.reduce((m, c) => Math.max(m, c.numero || 0), 0));
    const m = mapa();
    chaves.forEach(k => gravar(k, m[k]));
    gravar('restSeq', seq);
    if (d.auditoria) gravar('auditoria', d.auditoria.slice(-LIMITE_AUDITORIA));
    if (d.grupos || d.produtos) gravar('cadastrosExemplo', false);
    versao++;
    ouvintes.forEach(fn => fn(versao));
  }
  const erro = msg => { const e = new Error(msg); e.regra = true; throw e; };
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', e => {
    if (!e.key || !e.key.startsWith('mga_') || e.newValue === null) return;
    const novo = ler(e.key.slice(4), null);
    // Todas as coleções: uma aba com lista velha regravaria por cima do que a outra salvou
    const trocar = {restGrupos: v => { grupos = v; }, restProdutos: v => { produtos = v; }, restAdicionais: v => { adicionais = v; }, restMesas: v => { mesas = v; },
      restFormas: v => { formas = v; }, clientes: v => { listaClientesArr.splice(0, listaClientesArr.length, ...v); },
      restFornecedores: v => { fornecedores = v; }, restFuncionarios: v => { funcionarios = v; }, restEntregadores: v => { entregadores = v; },
      restRegioes: v => { regioes = v; }, restAplicativos: v => { aplicativos = v; }, restEmbalagens: v => { embalagens = v; }, restPromocoes: v => { promocoes = v; },
      restContasBancarias: v => { contasBancarias = v; }, restCaixas: v => { caixas = v; }, restMovCaixa: v => { movCaixa = v; }, restVendas: v => { vendas = v; },
      restContas: v => { contas = v; }, restMovEstoque: v => { movEstoque = v; }, restMovConta: v => { movConta = v; }, restCategorias: v => { categorias = v; },
      restConfig: v => { config = Object.assign({}, config, v); }, restUsuarios: v => { usuarios = v; }, restSeq: v => { seq = v; }}[e.key.slice(4)];
    if (!trocar || novo === null) return;
    trocar(novo);
    versao++;
    ouvintes.forEach(fn => fn(versao));
  });

  // =====================================================================
  // ---- Usuários, login e permissões ----
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  async function hashSenha(senha, sal){
    return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sal + ':' + senha)));
  }
  const novoSal = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  const usuarioPorId = id => usuarios.find(u => u.id === id);
  const normLogin = v => norm(v).replace(/\s+/g, '');
  const temUsuarios = () => usuarios.some(u => u.hash);
  const ehAdmin = u => !!u && u.perfil === 'ADMIN';
  const adminsAtivos = () => usuarios.filter(u => ehAdmin(u) && u.ativo);
  const modulosDo = u => !u ? [] : ehAdmin(u) ? Object.keys(MODULOS) : (u.modulos || []);
  const podeAcessar = (modulo, u = sessaoAtual()) => modulo === 'dashboard' ? !!u : modulosDo(u).includes(modulo);
  // Quem não tem o módulo não executa a ação, mesmo chamando a função direto
  function exigir(modulo){
    const u = sessaoAtual();
    if (!u) { if (temUsuarios()) erro('Sua sessão terminou. Entre de novo no sistema.'); return; }
    if (!podeAcessar(modulo, u)) erro(`Seu usuário não tem acesso a ${MODULOS[modulo]}. Fale com o administrador.`);
  }

  function validarUsuario(d, id){
    const u = {nome: txt(d.nome), login: normLogin(d.login), perfil: d.perfil, ativo: d.ativo !== false,
      modulos: (Array.isArray(d.modulos) ? d.modulos : PERFIS[d.perfil]?.modulos || []).filter(m => MODULOS[m])};
    if (!u.nome) erro('Informe o nome do usuário.');
    if (!u.login) erro('Informe o login (usado para entrar no sistema).');
    if (!/^[a-z0-9._-]{3,30}$/.test(u.login)) erro('Login: de 3 a 30 letras, números, ponto, traço ou sublinhado, sem espaços.');
    if (usuarios.some(x => x.id !== id && x.login === u.login)) erro(`O login "${u.login}" já está em uso.`);
    if (!PERFIS[u.perfil]) erro('Escolha o perfil.');
    if (ehAdmin(u)) u.modulos = Object.keys(MODULOS);
    return u;
  }
  const validarSenha = s => { if (String(s || '').length < 4) erro('A senha precisa ter pelo menos 4 caracteres.'); };

  // Primeiro acesso: sem nenhum usuário com senha, cria o administrador
  async function criarPrimeiroAdmin(d){
    if (temUsuarios()) erro('O administrador já foi criado. Entre com seu usuário.');
    const u = validarUsuario({...d, perfil: 'ADMIN'}, null);
    validarSenha(d.senha);
    if (d.senha !== d.confirmar) erro('As senhas não conferem.');
    const sal = novoSal();
    const novo = {id: novoId('u'), ...u, sal, hash: await hashSenha(d.senha, sal), criadoEm: agora()};
    usuarios = [novo];
    registrarAuditoria('Sistema', `Primeiro acesso: administrador "${novo.nome}" (${novo.login}) criado`);
    salvar('restUsuarios');
    return novo;
  }
  async function autenticar(login, senha){
    const u = usuarios.find(x => x.login === normLogin(login) && x.hash);
    // Mesma mensagem para login e senha errados: não revela quais logins existem
    if (!u || u.hash !== await hashSenha(String(senha || ''), u.sal)) erro('Usuário ou senha incorretos.');
    if (!u.ativo) erro('Este usuário está inativo. Fale com o administrador.');
    return u;
  }
  function iniciarSessao(u, lembrar){
    const sessao = JSON.stringify({usuarioId: u.id, inicio: agora()});
    armazens().forEach(s => { try { s.removeItem(CHAVE_SESSAO); } catch (e) { /* */ } });
    try { (lembrar ? localStorage : sessionStorage).setItem(CHAVE_SESSAO, sessao); } catch (e) { /* storage indisponível */ }
    gravar('usuario', u.nome); // nome usado pela auditoria e pelo tema do login
    registrarAuditoria('Sistema', 'Entrou no sistema', {detalhe: `${u.login} · ${PERFIS[u.perfil].nome}`});
  }
  // Login pelo Supabase: guarda o usuário do banco na lista local (sem senha) para sessaoAtual() achá-lo
  function iniciarSessaoSupabase(d, lembrar){
    const u = {id: d.id, nome: d.nome, login: d.login, perfil: PERFIS[d.perfil] ? d.perfil : 'CAIXA', ativo: true, empresaId: d.empresaId, master: !!d.master};
    u.modulos = ehAdmin(u) ? Object.keys(MODULOS) : (d.modulos?.length ? d.modulos : PERFIS[u.perfil].modulos).filter(m => MODULOS[m]);
    usuarios = usuarioPorId(u.id) ? usuarios.map(x => x.id === u.id ? {...x, ...u} : x) : [...usuarios, {...u, criadoEm: agora()}];
    salvar('restUsuarios');
    iniciarSessao(u, lembrar);
  }
  function encerrarSessao(){
    if (sessaoAtual()) registrarAuditoria('Sistema', 'Saiu do sistema');
    armazens().forEach(s => { try { s.removeItem(CHAVE_SESSAO); } catch (e) { /* */ } });
  }
  // Cadastro de usuários (só administrador). A senha é opcional na edição (vazia = mantém)
  async function salvarUsuario(d, id){
    exigir('configuracoes');
    const u = validarUsuario(d, id);
    const existente = id && usuarioPorId(id);
    if ((ehAdmin(u) || ehAdmin(existente)) && temUsuarios() && !ehAdmin(sessaoAtual())) erro('Só um administrador cadastra ou altera administradores.');
    if (!existente || d.senha) { validarSenha(d.senha); if (d.senha !== d.confirmar) erro('As senhas não conferem.'); }
    if (existente && ehAdmin(existente) && (!ehAdmin(u) || !u.ativo) && adminsAtivos().length === 1)
      erro('Este é o único administrador ativo. Cadastre outro administrador antes de mudar o perfil ou desativar.');
    if (existente && existente.id === sessaoAtual()?.id && !u.ativo) erro('Você não pode desativar o seu próprio usuário.');
    const senha = d.senha ? (() => { const sal = novoSal(); return {sal, hashP: hashSenha(d.senha, sal)}; })() : null;
    const extra = senha ? {sal: senha.sal, hash: await senha.hashP} : {};
    if (existente) {
      const rot = {nome: 'Nome', login: 'Login', perfil: 'Perfil', ativo: 'Ativo', modulos: 'Módulos'};
      const fmt = {perfil: v => PERFIS[v].nome, ativo: v => v ? 'Sim' : 'Não', modulos: v => v.map(m => MODULOS[m]).join(', ') || '—'};
      const alteracoes = Object.keys(rot).filter(k => JSON.stringify(existente[k]) !== JSON.stringify(u[k]))
        .map(k => ({campo: rot[k], antes: (fmt[k] || String)(existente[k]), depois: (fmt[k] || String)(u[k])}));
      if (senha) alteracoes.push({campo: 'Senha', antes: '••••', depois: 'alterada'});
      Object.assign(existente, u, extra);
      if (alteracoes.length) registrarAuditoria('Configurações', `Usuário "${u.nome}" editado`, {alteracoes});
      salvar('restUsuarios');
      return existente;
    }
    const novo = {id: novoId('u'), ...u, ...extra, criadoEm: agora()};
    usuarios.push(novo);
    registrarAuditoria('Configurações', `Usuário "${u.nome}" (${u.login}) cadastrado como ${PERFIS[u.perfil].nome}`);
    salvar('restUsuarios');
    return novo;
  }
  function excluirUsuario(id){
    exigir('configuracoes');
    const u = usuarioPorId(id);
    if (!u) return;
    if (u.id === sessaoAtual()?.id) erro('Você não pode excluir o seu próprio usuário.');
    if (ehAdmin(u) && u.ativo && adminsAtivos().length === 1) erro('Não é possível excluir o único administrador ativo.');
    if (caixas.some(c => c.operadorId === id) || vendas.some(v => v.operadorId === id))
      erro(`"${u.nome}" já operou caixa ou vendas e fica no histórico. Desative o usuário em vez de excluir.`);
    usuarios.splice(usuarios.indexOf(u), 1);
    registrarAuditoria('Configurações', `Usuário "${u.nome}" excluído`);
    salvar('restUsuarios');
  }

  // =====================================================================
  // ---- Formas de pagamento (cadastro) ----
  const formaPorId = id => formas.find(f => f.id === id);
  const formasAtivas = () => formas.filter(f => f.ativo).sort((a, b) => a.ordem - b.ordem);
  const prazoHabilitado = () => formasAtivas().some(f => f.tipo === 'PRAZO');
  function salvarForma(d, id){
    const f = {nome: txt(d.nome), tipo: d.tipo, ativo: d.ativo !== false};
    if (!f.nome) erro('Informe o nome da forma de pagamento.');
    if (!TIPOS_FORMA[f.tipo]) erro('Escolha o tipo.');
    const igual = formas.find(x => x.id !== id && norm(x.nome) === norm(f.nome));
    if (igual) erro(`Já existe a forma "${igual.nome}".`);
    const existente = id && formaPorId(id);
    if (existente) {
      if (existente.tipo !== f.tipo && formaUsada(id)) erro(`"${existente.nome}" já foi usada em vendas: o tipo não pode mudar. Crie outra forma.`);
      const outras = formas.filter(x => x.id !== id && x.ativo);
      if (!f.ativo && !outras.some(x => x.tipo !== 'PRAZO')) erro('Deixe pelo menos uma forma de pagamento à vista ativa.');
      Object.assign(existente, f);
      auditar(`Forma de pagamento "${f.nome}" editada (${f.ativo ? 'ativa' : 'inativa'})`);
      salvar('restFormas');
      return existente;
    }
    const nova = {id: novoId('fp'), ...f, ordem: formas.reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1};
    formas.push(nova);
    auditar(`Forma de pagamento "${f.nome}" (${TIPOS_FORMA[f.tipo]}) cadastrada`);
    salvar('restFormas');
    return nova;
  }
  const formaUsada = id => vendas.some(v => v.pagamentos.some(p => p.formaId === id));
  function excluirForma(id){
    const f = formaPorId(id);
    if (!f) return;
    if (formaUsada(id)) erro(`"${f.nome}" já foi usada em vendas. Desative em vez de excluir.`);
    if (f.ativo && !formas.some(x => x.id !== id && x.ativo && x.tipo !== 'PRAZO')) erro('Deixe pelo menos uma forma de pagamento à vista ativa.');
    formas.splice(formas.indexOf(f), 1);
    auditar(`Forma de pagamento "${f.nome}" excluída`);
    salvar('restFormas');
  }
  // Tipo de um pagamento, inclusive dos gravados antes do cadastro de formas
  function tipoPagamento(p){
    if (p.tipo) return p.tipo;
    if (p.forma === 'OUTROS' && p.detalhe === 'PIX') return 'PIX';
    return TIPOS_FORMA[p.forma] ? p.forma : 'OUTROS';
  }

  // =====================================================================
  // ---- Categorias (grupos) de produto ----
  const grupoPorId = id => grupos.find(g => g.id === id);
  const produtosDoGrupo = id => produtos.filter(p => p.grupoId === id);
  function salvarGrupo(dados, id){
    const nome = txt(dados.nome);
    if (!nome) erro('Informe o nome da categoria.');
    const gIgual = grupos.find(g => g.id !== id && norm(g.nome) === norm(nome));
    if (gIgual) erro(`Já existe a categoria "${gIgual.nome}".`);
    const ativo = dados.ativo !== false;
    const cozinha = dados.cozinha !== false;
    const g = id && grupoPorId(id);
    if (g) {
      const alteracoes = [];
      if (g.nome !== nome) alteracoes.push({campo: 'Nome', antes: g.nome, depois: nome});
      if (g.ativo !== ativo) alteracoes.push({campo: 'Ativo', antes: g.ativo ? 'Sim' : 'Não', depois: ativo ? 'Sim' : 'Não'});
      if (g.cozinha !== cozinha) alteracoes.push({campo: 'Vai para a cozinha', antes: g.cozinha ? 'Sim' : 'Não', depois: cozinha ? 'Sim' : 'Não'});
      Object.assign(g, {nome, ativo, cozinha});
      if (alteracoes.length) auditar(`Categoria "${nome}" editada`, {alteracoes});
      salvar('restGrupos');
      return g;
    }
    const novo = {id: novoId('g'), nome, ordem: grupos.reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1, ativo, cozinha};
    grupos.push(novo);
    auditar(`Categoria "${nome}" cadastrada`);
    salvar('restGrupos');
    return novo;
  }
  function excluirGrupo(id){
    const g = grupoPorId(id);
    if (!g) return;
    const n = produtosDoGrupo(id).length;
    if (n) erro(`A categoria "${g.nome}" tem ${n} produto${n === 1 ? "" : "s"}. Mova ou exclua os produtos antes, ou apenas desative a categoria.`);
    grupos.splice(grupos.indexOf(g), 1);
    auditar(`Categoria "${g.nome}" excluída`);
    salvar('restGrupos');
  }

  // ---- Produtos ----
  const produtoPorId = id => produtos.find(p => p.id === id);
  const produtoVendido = id => vendas.some(v => v.itens.some(i => i.produtoId === id));
  const LIMITE_FOTO = 250000; // ~180 KB de imagem: a tela reduz a foto antes de salvar
  const proximoCodigo = () => { let n = seq.produto + 1; while (produtos.some(p => p.codigo === String(n).padStart(3, '0'))) n++; return String(n).padStart(3, '0'); };
  // Tamanhos (P/M/G, 300 ml/500 ml...): cada um com o próprio preço
  function lerTamanhos(lista){
    const t = (Array.isArray(lista) ? lista : []).filter(x => txt(x.nome) || txt(x.preco))
      .map(x => ({id: x.id || novoId('tm'), nome: txt(x.nome), preco: r2(lerValor(x.preco))}));
    t.forEach(x => {
      if (!x.nome) erro('Informe o nome de cada tamanho.');
      if (!(x.preco > 0)) erro(`Informe o preço do tamanho "${x.nome}".`);
    });
    const rep = t.find((x, k) => t.findIndex(y => norm(y.nome) === norm(x.nome)) !== k);
    if (rep) erro(`O tamanho "${rep.nome}" está repetido.`);
    return t;
  }
  // Ficha técnica: insumos (ou outros produtos) usados para fazer uma unidade
  function lerFicha(lista, id){
    const f = (Array.isArray(lista) ? lista : []).filter(x => x.produtoId).map(x => ({produtoId: x.produtoId, quantidade: r3(lerValor(x.quantidade))}));
    f.forEach(x => {
      const c = produtoPorId(x.produtoId);
      if (!c) erro('Item da ficha técnica não encontrado.');
      if (id && c.id === id) erro(`"${c.nome}" não pode entrar na própria ficha técnica.`);
      if (id && usaNaFicha(c, id)) erro(`"${c.nome}" já usa este produto na ficha técnica dele: a ficha ficaria circular.`);
      if (!(x.quantidade > 0)) erro(`Informe a quantidade de "${c.nome}" na ficha técnica.`);
    });
    if (f.some((x, k) => f.findIndex(y => y.produtoId === x.produtoId) !== k)) erro('Um item aparece duas vezes na ficha técnica.');
    return f;
  }
  // Evita ficha circular (A usa B, B usa A)
  function usaNaFicha(p, alvoId, visitados = new Set()){
    if (!p || visitados.has(p.id)) return false;
    visitados.add(p.id);
    return (p.ficha || []).some(c => c.produtoId === alvoId || usaNaFicha(produtoPorId(c.produtoId), alvoId, visitados));
  }
  // Custo de uma unidade: pela ficha técnica (soma dos insumos) ou o custo cadastrado
  function custoProduto(p, nivel = 0){
    if (!p) return 0;
    if (!(p.ficha || []).length || nivel > 5) return p.custo || 0;
    return r2(p.ficha.reduce((s, c) => s + c.quantidade * custoProduto(produtoPorId(c.produtoId), nivel + 1), 0));
  }
  function salvarProduto(dados, id){
    const nome = txt(dados.nome);
    const tipo = dados.tipo === 'INSUMO' ? 'INSUMO' : 'VENDA';
    const tamanhos = tipo === 'VENDA' ? lerTamanhos(dados.tamanhos) : [];
    // Com tamanhos, o preço "a partir de" é o do menor tamanho
    if (tamanhos.length) dados = {...dados, preco: Math.min(...tamanhos.map(t => t.preco))};
    const preco = tipo === 'INSUMO' && txt(dados.preco) === '' ? 0 : r2(lerValor(dados.preco));
    const custo = txt(dados.custo) === '' ? 0 : r2(lerValor(dados.custo));
    const estoque = txt(dados.estoque) === '' ? 0 : lerValor(dados.estoque);
    const estoqueMinimo = txt(dados.estoqueMinimo) === '' ? 0 : lerValor(dados.estoqueMinimo);
    const codigo = txt(dados.codigo).toUpperCase();
    if (!nome) erro('Informe o nome do produto.');
    if (!grupoPorId(dados.grupoId)) erro('Escolha a categoria do produto.');
    if (tipo === 'VENDA' && (!Number.isFinite(lerValor(dados.preco)) || preco <= 0)) erro('Informe um preço de venda maior que R$ 0,00.');
    if (!Number.isFinite(preco) || preco < 0) erro('Preço inválido.');
    if (!Number.isFinite(custo) || custo < 0) erro('Custo inválido.');
    if (!Number.isFinite(estoque)) erro('Estoque inválido.');
    if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) erro('Estoque mínimo inválido.');
    if (codigo && !/^[A-Z0-9._-]{1,20}$/.test(codigo)) erro('Código: até 20 letras ou números, sem espaços.');
    const unidade = UNIDADES.includes(dados.unidade) ? dados.unidade : 'UN';
    const foto = typeof dados.foto === 'string' ? dados.foto : '';
    if (foto && (!foto.startsWith('data:image/') || foto.length > LIMITE_FOTO)) erro('Foto inválida ou grande demais. Use uma imagem JPG ou PNG.');
    const pIgual = produtos.find(p => p.id !== id && norm(p.nome) === norm(nome));
    if (pIgual) erro(`Já existe o produto "${pIgual.nome}" (cód. ${pIgual.codigo}).`);
    const cIgual = codigo && produtos.find(p => p.id !== id && p.codigo === codigo);
    if (cIgual) erro(`O código ${codigo} já é do produto "${cIgual.nome}".`);
    const controlaEstoque = tipo === 'INSUMO' || !!dados.controlaEstoque; // insumo sempre tem estoque
    const ficha = lerFicha(dados.ficha, id);
    const gruposAdic = tipo === 'VENDA' ? (Array.isArray(dados.gruposAdicionais) ? dados.gruposAdicionais : []).filter(g => grupoAdicionalPorId(g)) : [];
    const campos = {codigo, nome, preco, custo, unidade, grupoId: dados.grupoId, foto, descricao: txt(dados.descricao), ativo: dados.ativo !== false,
      controlaEstoque, estoqueMinimo: controlaEstoque ? r3(estoqueMinimo) : 0, tipo, tamanhos, gruposAdicionais: gruposAdic, ficha};
    const saldo = r3(estoque);
    const p = id && produtoPorId(id);
    const moeda = v => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
    if (p) {
      if (!campos.codigo) campos.codigo = p.codigo;
      const fmt = {preco: moeda, custo: moeda, grupoId: v => grupoPorId(v)?.nome || '—', ativo: v => v ? 'Sim' : 'Não', foto: v => v ? 'com foto' : 'sem foto',
        controlaEstoque: v => v ? 'Sim' : 'Não', tipo: v => TIPOS_PRODUTO[v] || '—',
        tamanhos: v => (v || []).map(t => `${t.nome} ${moeda(t.preco)}`).join(', ') || '—',
        gruposAdicionais: v => (v || []).map(g => grupoAdicionalPorId(g)?.nome || '?').join(', ') || '—',
        ficha: v => (v || []).map(c => `${qtdBR(c.quantidade)} ${produtoPorId(c.produtoId)?.unidade || ''} ${produtoPorId(c.produtoId)?.nome || '?'}`).join(', ') || '—'};
      const rotulo = {codigo: 'Código', nome: 'Nome', tipo: 'Tipo', preco: 'Preço', custo: 'Custo', unidade: 'Unidade', grupoId: 'Categoria', foto: 'Foto', descricao: 'Descrição', ativo: 'Ativo',
        controlaEstoque: 'Controla estoque', estoqueMinimo: 'Estoque mínimo', tamanhos: 'Tamanhos', gruposAdicionais: 'Adicionais e etapas', ficha: 'Ficha técnica'};
      const igual = (a, b) => typeof a === 'object' || typeof b === 'object' ? JSON.stringify(a ?? []) === JSON.stringify(b ?? []) : (a ?? '') === (b ?? '');
      const alteracoes = Object.keys(rotulo).filter(k => !igual(p[k], campos[k]))
        .map(k => ({campo: rotulo[k], antes: (fmt[k] || String)(p[k] ?? '—'), depois: (fmt[k] || String)(campos[k] ?? '—')}));
      Object.assign(p, campos);
      // Saldo mudado no cadastro também fica no histórico do estoque (ajuste). Só se o campo foi
      // mexido: senão uma venda feita com o formulário aberto seria desfeita pelo saldo antigo
      const saldoAntes = r3(p.estoque);
      const mexeuSaldo = dados.estoqueAberto === undefined || txt(dados.estoque) !== txt(dados.estoqueAberto);
      if (controlaEstoque && mexeuSaldo && saldo !== saldoAntes) {
        lancarEstoque(p, 'AJUSTE', saldo - saldoAntes, {motivo: 'Alterado no cadastro do produto'});
        alteracoes.push({campo: 'Estoque', antes: qtdBR(saldoAntes), depois: qtdBR(saldo)});
      }
      if (alteracoes.length) auditar(`Produto "${nome}" editado`, {alteracoes});
      salvar('restProdutos', 'restMovEstoque');
      return p;
    }
    if (!campos.codigo) campos.codigo = proximoCodigo();
    if (/^\d+$/.test(campos.codigo)) seq.produto = Math.max(seq.produto, Number(campos.codigo));
    const novo = {id: novoId('p'), ...campos, estoque: 0};
    produtos.push(novo);
    if (controlaEstoque && saldo) lancarEstoque(novo, 'ENTRADA', saldo, {motivo: 'Estoque inicial', custoUnitario: custo || null});
    auditar(`Produto "${nome}" cadastrado`, {detalhe: `cód. ${novo.codigo} · ${grupoPorId(campos.grupoId).nome} · ${moeda(preco)}${controlaEstoque ? ` · estoque ${qtdBR(saldo)} ${unidade}` : ''}`});
    salvar('restProdutos', 'restSeq', 'restMovEstoque');
    return novo;
  }
  // ---- Importação de produtos por planilha (Excel) ----
  // Cada linha: {linha, codigo, nome, categoria, tipo, preco, custo, unidade, controla, estoque, minimo, descricao, ativo}.
  // Produto já cadastrado (mesmo código ou, sem código, mesmo nome) é atualizado só nas colunas preenchidas;
  // categoria que não existe é criada. aplicar=false só confere e devolve a prévia.
  // "1" e "001" são o mesmo código (o Excel tira os zeros); código novo só com números fica com 3 dígitos
  const mesmoCodigo = (a, b) => a === b || (/^\d+$/.test(a) && /^\d+$/.test(b) && Number(a) === Number(b));
  const codigoDaPlanilha = v => { const c = txt(v).toUpperCase().replace(/\s/g, '').replace(/\.0+$/, ''); return /^\d{1,2}$/.test(c) ? c.padStart(3, '0') : c; };
  const simNao = v => { const t = norm(v); return t === '' ? null : ['sim', 's', 'x', 'true', '1', 'yes', 'verdadeiro'].includes(t) ? true : ['nao', 'n', 'false', '0', 'no', 'falso'].includes(t) ? false : undefined; };
  function importarProdutos(linhas, {aplicar = false} = {}){
    exigir('cadastros');
    const vazio = v => txt(v) === '';
    const numero = (v, rotulo, erros) => { if (vazio(v)) return null; const n = lerValor(v); if (!Number.isFinite(n) || n < 0) erros.push(`${rotulo} inválido(a): "${txt(v)}"`); return n; };
    const itens = [], codigos = new Map(), nomes = new Map(), catsNovas = new Map();
    (linhas || []).forEach(l => {
      if (['codigo', 'nome', 'categoria', 'preco', 'custo'].every(k => vazio(l[k]))) return; // linha em branco
      const erros = [];
      const codigo = codigoDaPlanilha(l.codigo);
      const nome = txt(l.nome);
      const p = (codigo && produtos.find(x => mesmoCodigo(x.codigo, codigo))) || (!codigo && nome && produtos.find(x => norm(x.nome) === norm(nome))) || null;
      if (!nome && !p) erros.push('informe o nome');
      if (codigo && !/^[A-Z0-9._-]{1,20}$/.test(codigo)) erros.push(`código "${codigo}" inválido (até 20 letras ou números)`);
      const tipoTxt = norm(l.tipo);
      const tipo = !tipoTxt ? (p?.tipo || 'VENDA') : tipoTxt.startsWith('insumo') ? 'INSUMO' : tipoTxt.startsWith('venda') || tipoTxt === 'produto' ? 'VENDA' : (erros.push(`tipo "${txt(l.tipo)}" (use Venda ou Insumo)`), 'VENDA');
      const catNome = txt(l.categoria);
      const g = catNome ? grupos.find(x => norm(x.nome) === norm(catNome)) : (p ? grupoPorId(p.grupoId) : null);
      if (!catNome && !p) erros.push('informe a categoria');
      if (catNome && !g) catsNovas.set(norm(catNome), catNome);
      const preco = numero(l.preco, 'preço', erros), custo = numero(l.custo, 'custo', erros);
      const estoque = numero(l.estoque, 'estoque', erros), minimo = numero(l.minimo, 'estoque mínimo', erros);
      if (tipo === 'VENDA' && !(preco > 0) && !(p && preco === null && p.preco > 0) && !(p?.tamanhos || []).length) erros.push('informe o preço de venda (maior que zero)');
      const uniTxt = txt(l.unidade).toUpperCase().replace('PORCAO', 'PORÇÃO');
      if (uniTxt && !UNIDADES.includes(uniTxt)) erros.push(`unidade "${txt(l.unidade)}" (use ${UNIDADES.join(', ')})`);
      const controla = simNao(l.controla), ativo = simNao(l.ativo);
      if (controla === undefined) erros.push(`"controla estoque" deve ser Sim ou Não`);
      if (ativo === undefined) erros.push(`"ativo" deve ser Sim ou Não`);
      // Repetido dentro da própria planilha
      const chave = codigo || norm(nome);
      if (codigo && codigos.has(codigo)) erros.push(`código ${codigo} repetido (linha ${codigos.get(codigo)})`);
      if (nome && nomes.has(norm(nome))) erros.push(`nome repetido (linha ${nomes.get(norm(nome))})`);
      if (codigo) codigos.set(codigo, l.linha);
      if (nome) nomes.set(norm(nome), l.linha);
      const outro = nome && produtos.find(x => x !== p && norm(x.nome) === norm(nome));
      if (outro) erros.push(`já existe outro produto "${outro.nome}" (cód. ${outro.codigo})`);
      itens.push({linha: l.linha, chave, acao: p ? 'ATUALIZAR' : 'NOVO', produto: p, nome: nome || p?.nome || '', categoria: catNome || g?.nome || '', erros,
        campos: {codigo, nome, tipo, catNome, preco, custo, estoque, minimo, unidade: uniTxt, controla, ativo, descricao: vazio(l.descricao) ? null : txt(l.descricao)}});
    });
    const validos = itens.filter(i => !i.erros.length);
    const previa = {itens, novos: validos.filter(i => i.acao === 'NOVO').length, atualizados: validos.filter(i => i.acao === 'ATUALIZAR').length,
      categoriasNovas: [...catsNovas.values()].filter(n => validos.some(i => norm(i.campos.catNome) === norm(n))), erros: itens.filter(i => i.erros.length).length};
    if (!aplicar) return previa;
    if (!validos.length) erro('Nenhuma linha válida para importar.');
    previa.categoriasNovas.forEach(nome => salvarGrupo({nome, ativo: true, cozinha: true}));
    const falhas = [];
    let feitos = 0;
    validos.forEach(i => {
      const c = i.campos, p = i.produto && produtoPorId(i.produto.id);
      const g = c.catNome ? grupos.find(x => norm(x.nome) === norm(c.catNome)) : grupoPorId(p.grupoId);
      const v = (novo, antigo) => novo === null || novo === undefined || novo === '' ? antigo : novo;
      const controla = c.controla ?? (c.estoque !== null && c.estoque > 0 ? true : p ? p.controlaEstoque : false);
      const dados = {...(p || {}), codigo: p ? p.codigo : v(c.codigo, ''), nome: v(c.nome, p?.nome), tipo: c.tipo, grupoId: g.id,
        preco: v(c.preco, p?.preco ?? ''), custo: v(c.custo, p?.custo ?? ''), unidade: v(c.unidade, p?.unidade || 'UN'), descricao: v(c.descricao, p?.descricao || ''),
        ativo: c.ativo ?? (p ? p.ativo : true), controlaEstoque: controla, estoqueMinimo: v(c.minimo, p?.estoqueMinimo ?? ''),
        // Estoque: só muda o saldo do produto já cadastrado se a coluna veio preenchida
        estoque: c.estoque !== null ? c.estoque : p ? p.estoque : '', ...(p && c.estoque === null ? {estoqueAberto: txt(p.estoque), estoque: txt(p.estoque)} : {})};
      if (!p && !dados.codigo) dados.codigo = proximoCodigo();
      try { salvarProduto(dados, p?.id); feitos++; } catch (e) { if (!e.regra) throw e; falhas.push({linha: i.linha, nome: i.nome, msg: e.message}); }
    });
    auditar(`Produtos importados por planilha: ${feitos} de ${validos.length}`, {detalhe: `${previa.novos} novos, ${previa.atualizados} atualizados${previa.categoriasNovas.length ? `, categorias criadas: ${previa.categoriasNovas.join(', ')}` : ''}`});
    return {...previa, feitos, falhas};
  }
  function excluirProduto(id){
    const p = produtoPorId(id);
    if (!p) return;
    const usa = produtos.find(x => (x.ficha || []).some(c => c.produtoId === id));
    if (usa) erro(`"${p.nome}" está na ficha técnica de "${usa.nome}". Tire da ficha antes de excluir.`);
    if (produtoVendido(id)) erro(`"${p.nome}" já aparece em vendas e não pode ser excluído. Desative-o para tirar do cardápio.`);
    produtos.splice(produtos.indexOf(p), 1);
    auditar(`Produto "${p.nome}" excluído`);
    salvar('restProdutos');
  }

  // =====================================================================
  // ---- Estoque ----
  // Só os produtos com "controla estoque" têm saldo. Pratos feitos na hora ficam sem controle.
  // Toda mudança de saldo vira um movimento (restMovEstoque) com o saldo depois dele.
  // A venda baixa o estoque ao ser finalizada e devolve se for cancelada; falta de saldo
  // não trava o atendimento (o saldo fica negativo e aparece em "Sem estoque").
  const estoqueBaixo = p => !!p.controlaEstoque && r3(p.estoque) <= (p.estoqueMinimo || 0);
  function lancarEstoque(p, tipo, delta, extra){
    const m = {id: novoId('me'), produtoId: p.id, produto: p.nome, unidade: p.unidade, tipo, quantidade: r3(delta),
      saldo: r3((Number(p.estoque) || 0) + delta), data: agora(), usuario: usuario(), motivo: '', ...(extra || {})};
    p.estoque = m.saldo;
    movEstoque.push(m);
    return m;
  }
  const produtoComEstoque = id => {
    const p = produtoPorId(id);
    if (!p) erro('Escolha o produto.');
    if (!p.controlaEstoque) erro(`"${p.nome}" não controla estoque. Ative o controle antes de movimentar.`);
    return p;
  };
  const lerQtd = (v, rotulo = 'a quantidade') => { const q = r3(lerValor(v)); if (!(q > 0)) erro(`Informe ${rotulo} (maior que zero).`); return q; };
  // Custo médio ponderado: o que já estava em estoque pesa junto com a compra nova
  function custoMedio(p, qtd, custoEntrada){
    const saldo = Number(p.estoque) || 0, atual = Number(p.custo) || 0;
    if (!(custoEntrada > 0)) return atual;
    if (saldo <= 0 || !(atual > 0)) return r2(custoEntrada);
    return r2((saldo * atual + qtd * custoEntrada) / (saldo + qtd));
  }
  // Entrada de mercadoria (compra). Com conta, lança também a conta a pagar ao fornecedor.
  function entradaEstoque({produtoId, quantidade, custo, documento, fornecedorId = null, conta = null}){
    exigir('estoque');
    const p = produtoComEstoque(produtoId);
    const qtd = lerQtd(quantidade);
    const custoUn = txt(custo) === '' ? 0 : r2(lerValor(custo));
    if (!Number.isFinite(custoUn) || custoUn < 0) erro('Custo unitário inválido.');
    const forn = fornecedorId ? fornecedorPorId(fornecedorId) || erro('Fornecedor não encontrado.') : null;
    if (conta) {
      exigir('financeiro');
      if (!(custoUn > 0)) erro('Informe o custo unitário para lançar a conta a pagar.');
      salvarConta({tipo: 'PAGAR', descricao: `Compra: ${qtdBR(qtd)} ${p.unidade} ${p.nome}${forn ? ` · ${forn.nome}` : ''}${txt(documento) ? ` (${txt(documento)})` : ''}`,
        categoria: categorias.PAGAR.includes('Fornecedores') ? 'Fornecedores' : categorias.PAGAR[0], valor: r2(qtd * custoUn), vencimento: conta.vencimento,
        fornecedorId: forn?.id || null, obs: ''});
    }
    const custoAntes = p.custo || 0;
    p.custo = custoMedio(p, qtd, custoUn);
    const m = lancarEstoque(p, 'ENTRADA', qtd, {custoUnitario: custoUn || null, fornecedorId: forn?.id || null, motivo: [forn?.nome, txt(documento)].filter(Boolean).join(' · ')});
    auditar(`Entrada de ${qtdBR(qtd)} ${p.unidade} de "${p.nome}" — saldo ${qtdBR(m.saldo)}`,
      {detalhe: [txt(documento), custoUn && `custo ${moedaBR(custoUn)}/${p.unidade}`, p.custo !== custoAntes && `custo médio ${moedaBR(custoAntes)} → ${moedaBR(p.custo)}`].filter(Boolean).join(' · ')});
    salvar('restProdutos', 'restMovEstoque');
    return m;
  }
  // Saída manual: perda, vencido, consumo interno... (não pode passar do saldo)
  function saidaEstoque({produtoId, quantidade, motivo}){
    exigir('estoque');
    const p = produtoComEstoque(produtoId);
    const qtd = lerQtd(quantidade);
    if (txt(motivo).length < 3) erro('Informe o motivo da saída.');
    if (qtd > r3(p.estoque) + 0.0001) erro(`A saída passa do saldo (${qtdBR(p.estoque)} ${p.unidade}). Se o saldo estiver errado, faça um ajuste de inventário.`);
    const m = lancarEstoque(p, 'SAIDA', -qtd, {motivo: txt(motivo)});
    auditar(`Saída de ${qtdBR(qtd)} ${p.unidade} de "${p.nome}" — saldo ${qtdBR(m.saldo)}`, {detalhe: m.motivo});
    salvar('restProdutos', 'restMovEstoque');
    return m;
  }
  // Inventário: informa o que foi contado e o sistema lança a diferença
  function ajustarEstoque({produtoId, contado, motivo}){
    exigir('estoque');
    const p = produtoComEstoque(produtoId);
    if (txt(contado) === '') erro('Informe a quantidade contada.');
    const q = r3(lerValor(contado));
    if (!Number.isFinite(q) || q < 0) erro('Quantidade contada inválida.');
    const delta = r3(q - (Number(p.estoque) || 0));
    if (!delta) erro(`O saldo de "${p.nome}" já é ${qtdBR(q)} ${p.unidade}.`);
    const m = lancarEstoque(p, 'AJUSTE', delta, {motivo: txt(motivo) || 'Inventário'});
    auditar(`Ajuste de estoque de "${p.nome}": ${qtdBR(m.saldo - delta)} → ${qtdBR(m.saldo)} ${p.unidade}`, {detalhe: m.motivo});
    salvar('restProdutos', 'restMovEstoque');
    return m;
  }
  // Liga/desliga o controle e define o mínimo (o saldo continua guardado se desligar)
  function configurarEstoque(produtoId, {controla, minimo}){
    exigir('estoque');
    const p = produtoPorId(produtoId) || erro('Produto não encontrado.');
    const min = txt(minimo) === '' ? 0 : r3(lerValor(minimo));
    if (!Number.isFinite(min) || min < 0) erro('Estoque mínimo inválido.');
    const antes = {controlaEstoque: !!p.controlaEstoque, estoqueMinimo: p.estoqueMinimo || 0};
    Object.assign(p, {controlaEstoque: !!controla, estoqueMinimo: controla ? min : antes.estoqueMinimo});
    const alteracoes = [];
    if (antes.controlaEstoque !== p.controlaEstoque) alteracoes.push({campo: 'Controla estoque', antes: antes.controlaEstoque ? 'Sim' : 'Não', depois: p.controlaEstoque ? 'Sim' : 'Não'});
    if (antes.estoqueMinimo !== p.estoqueMinimo) alteracoes.push({campo: 'Estoque mínimo', antes: qtdBR(antes.estoqueMinimo), depois: qtdBR(p.estoqueMinimo)});
    if (alteracoes.length) auditar(`Estoque de "${p.nome}" configurado`, {alteracoes});
    salvar('restProdutos');
    return p;
  }
  // Venda finalizada: baixa os itens dos produtos controlados (um movimento por produto)
  // Quanto de cada produto controlado sai do estoque: o próprio produto (se controla estoque)
  // ou, se ele é feito na hora com ficha técnica, os insumos da ficha
  function consumoDe(p, qtd, acumulado, nivel = 0){
    if (!p || nivel > 5) return;
    if (p.controlaEstoque) { acumulado[p.id] = r3((acumulado[p.id] || 0) + qtd); return; }
    (p.ficha || []).forEach(c => consumoDe(produtoPorId(c.produtoId), qtd * c.quantidade, acumulado, nivel + 1));
  }
  function baixarEstoqueVenda(v){
    const porProduto = {};
    v.itens.forEach(i => consumoDe(produtoPorId(i.produtoId), i.quantidade, porProduto));
    Object.entries(porProduto).forEach(([id, qtd]) => lancarEstoque(produtoPorId(id), 'VENDA', -qtd, {vendaId: v.id, motivo: `${nomeVenda(v)}${v.tipo === 'BALCAO' ? '' : ` (venda #${v.numero})`}`}));
    v.estoqueBaixado = true;
  }
  // Produção: faz um produto com ficha técnica (ex.: molho, massa) — sai insumo, entra o produto
  function produzir({produtoId, quantidade, obs}){
    exigir('estoque');
    const p = produtoComEstoque(produtoId);
    if (!(p.ficha || []).length) erro(`"${p.nome}" não tem ficha técnica. Cadastre os insumos no produto antes de produzir.`);
    const qtd = lerQtd(quantidade);
    const consumo = {};
    p.ficha.forEach(c => consumoDe(produtoPorId(c.produtoId), qtd * c.quantidade, consumo));
    const faltando = Object.entries(consumo).map(([id, q]) => produtoPorId(id)).find(x => r3(x.estoque) < r3(consumo[x.id]) - 0.0001);
    if (faltando) erro(`Falta ${faltando.nome}: precisa de ${qtdBR(consumo[faltando.id])} ${faltando.unidade}, há ${qtdBR(faltando.estoque)}.`);
    const lote = novoId('lt');
    const custoLote = r2(Object.entries(consumo).reduce((s, [id, q]) => s + q * (produtoPorId(id).custo || 0), 0));
    Object.entries(consumo).forEach(([id, q]) => lancarEstoque(produtoPorId(id), 'PRODUCAO', -q, {lote, motivo: `Usado na produção de ${qtdBR(qtd)} ${p.unidade} de ${p.nome}`}));
    const custoAntes = p.custo || 0;
    p.custo = custoMedio(p, qtd, r2(custoLote / qtd));
    const m = lancarEstoque(p, 'PRODUCAO', qtd, {lote, custoUnitario: r2(custoLote / qtd), motivo: txt(obs) || 'Produção'});
    auditar(`Produção de ${qtdBR(qtd)} ${p.unidade} de "${p.nome}" — saldo ${qtdBR(m.saldo)}`,
      {detalhe: Object.entries(consumo).map(([id, q]) => `${qtdBR(q)} ${produtoPorId(id).unidade} ${produtoPorId(id).nome}`).join(', ') + (p.custo !== custoAntes ? ` · custo ${moedaBR(custoAntes)} → ${moedaBR(p.custo)}` : '')});
    salvar('restProdutos', 'restMovEstoque');
    return m;
  }
  // Compra (nota com vários itens): uma entrada por item e, se pedir, uma única conta a pagar
  // Com ligarControle, o produto cadastrado que ainda não controla estoque passa a controlar
  function compraEstoque({fornecedorId = null, documento = '', itens = [], conta = null, ligarControle = false}){
    exigir('estoque');
    const forn = fornecedorId ? fornecedorPorId(fornecedorId) || erro('Fornecedor não encontrado.') : null;
    const doItem = id => { const p = produtoPorId(id) || erro('Produto não encontrado. Cadastre-o em Cadastros › Produtos.'); return ligarControle ? p : produtoComEstoque(id); };
    const linhas = itens.filter(i => i.produtoId).map(i => ({p: doItem(i.produtoId), qtd: lerQtd(i.quantidade, `a quantidade de ${produtoPorId(i.produtoId)?.nome || 'um item'}`),
      custo: txt(i.custo) === '' ? 0 : r2(lerValor(i.custo))}));
    if (!linhas.length) erro('Adicione ao menos um item à compra.');
    if (linhas.some(l => !Number.isFinite(l.custo) || l.custo < 0)) erro('Custo unitário inválido.');
    if (linhas.some((l, k) => linhas.findIndex(x => x.p.id === l.p.id) !== k)) erro('Um produto aparece duas vezes na compra. Some as quantidades numa linha só.');
    const total = r2(linhas.reduce((s, l) => s + l.qtd * l.custo, 0));
    if (conta) {
      exigir('financeiro');
      if (!(total > 0)) erro('Informe os custos para lançar a conta a pagar.');
      salvarConta({tipo: 'PAGAR', descricao: `Compra${forn ? ` · ${forn.nome}` : ''}${txt(documento) ? ` (${txt(documento)})` : ''} — ${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'}`,
        categoria: categorias.PAGAR.includes('Fornecedores') ? 'Fornecedores' : categorias.PAGAR[0], valor: total, vencimento: conta.vencimento, fornecedorId: forn?.id || null, obs: ''});
    }
    const lote = novoId('cp');
    const motivo = [forn?.nome, txt(documento)].filter(Boolean).join(' · ') || 'Compra';
    linhas.filter(l => !l.p.controlaEstoque).forEach(l => {
      l.p.controlaEstoque = true;
      auditar(`Estoque de "${l.p.nome}" configurado`, {alteracoes: [{campo: 'Controla estoque', antes: 'Não', depois: 'Sim'}]});
    });
    linhas.forEach(l => { l.p.custo = custoMedio(l.p, l.qtd, l.custo); lancarEstoque(l.p, 'ENTRADA', l.qtd, {lote, custoUnitario: l.custo || null, fornecedorId: forn?.id || null, motivo}); });
    auditar(`Compra registrada — ${linhas.length} ${linhas.length === 1 ? 'item' : 'itens'}, ${moedaBR(total)}`,
      {detalhe: `${motivo} · ` + linhas.map(l => `${qtdBR(l.qtd)} ${l.p.unidade} ${l.p.nome}`).join(', ')});
    salvar('restProdutos', 'restMovEstoque');
    return {itens: linhas.length, total};
  }
  // Entrada de estoque por planilha. Cada linha: {linha, codigo, produto, quantidade, custo, fornecedor, documento}.
  // O produto precisa estar cadastrado (código ou nome). Linha sem quantidade é ignorada (o modelo traz
  // todos os produtos). As linhas viram uma compra por fornecedor + nota (custo médio e, se pedir, conta a pagar).
  // aplicar=false só confere e devolve a prévia.
  function importarEntradas(linhas, {aplicar = false, conta = null} = {}){
    exigir('estoque');
    const itens = [];
    (linhas || []).forEach(l => {
      if (txt(l.quantidade) === '') return; // sem quantidade: não entra (linha do modelo não preenchida)
      const erros = [];
      const codigo = codigoDaPlanilha(l.codigo);
      const nome = txt(l.produto);
      const p = (codigo && produtos.find(x => mesmoCodigo(x.codigo, codigo))) || (nome && produtos.find(x => norm(x.nome) === norm(nome))) || null;
      if (!p) erros.push(codigo || nome ? `produto "${codigo || nome}" não está cadastrado (cadastre em Cadastros › Produtos)` : 'informe o código ou o nome do produto');
      const qtd = r3(lerValor(l.quantidade));
      if (!(qtd > 0)) erros.push(`quantidade inválida: "${txt(l.quantidade)}"`);
      const custo = txt(l.custo) === '' ? 0 : r2(lerValor(l.custo));
      if (!Number.isFinite(custo) || custo < 0) erros.push(`custo inválido: "${txt(l.custo)}"`);
      const fornNome = txt(l.fornecedor);
      const forn = fornNome ? fornecedores.find(f => norm(f.nome) === norm(fornNome) || (digitos(f.documento) && digitos(f.documento) === digitos(fornNome))) : null;
      if (fornNome && !forn) erros.push(`fornecedor "${fornNome}" não está cadastrado (cadastre em Cadastros › Fornecedores ou deixe em branco)`);
      const documento = txt(l.documento);
      itens.push({linha: l.linha, produto: p, nome: p?.nome || nome || codigo, quantidade: qtd, custo, fornecedor: forn, documento, erros,
        nota: `${forn?.id || ''}|${norm(documento)}`});
    });
    // Mesmo produto duas vezes na mesma nota: some numa linha só
    const vistos = new Map();
    itens.filter(i => !i.erros.length).forEach(i => {
      const k = i.nota + '|' + i.produto.id;
      if (vistos.has(k)) i.erros.push(`produto repetido na mesma nota (linha ${vistos.get(k)}); some as quantidades numa linha só`);
      else vistos.set(k, i.linha);
    });
    const validos = itens.filter(i => !i.erros.length);
    const notas = [...new Set(validos.map(i => i.nota))];
    // Nota já lançada antes (mesmo fornecedor e documento): importar de novo dobraria o estoque
    const repetidas = [...new Set(validos.filter(i => i.documento).map(i => [i.fornecedor?.nome, i.documento].filter(Boolean).join(' · ')))]
      .filter(motivo => movEstoque.some(m => m.tipo === 'ENTRADA' && m.motivo === motivo));
    const previa = {itens, validos: validos.length, erros: itens.length - validos.length, notas: notas.length, repetidas,
      total: r2(validos.reduce((s, i) => s + i.quantidade * i.custo, 0)), passamAControlar: [...new Set(validos.filter(i => !i.produto.controlaEstoque).map(i => i.produto.nome))]};
    if (!aplicar) return previa;
    if (!validos.length) erro('Nenhuma linha válida para dar entrada.');
    if (conta) exigir('financeiro');
    const feitas = [], falhas = [];
    notas.forEach(n => {
      const doGrupo = validos.filter(i => i.nota === n);
      const {fornecedor, documento} = doGrupo[0];
      try {
        const r = compraEstoque({fornecedorId: fornecedor?.id || null, documento: documento || 'Importação de planilha', ligarControle: true,
          itens: doGrupo.map(i => ({produtoId: i.produto.id, quantidade: i.quantidade, custo: i.custo})), conta: conta && doGrupo.some(i => i.custo > 0) ? conta : null});
        feitas.push({fornecedor: fornecedor?.nome || '', documento, itens: r.itens, total: r.total});
      } catch (e) { if (!e.regra) throw e; falhas.push({linhas: doGrupo.map(i => i.linha), msg: e.message}); }
    });
    return {...previa, feitas, falhas};
  }
  // Zerar estoque (todos os produtos controlados ou só de uma categoria): um ajuste para cada um
  function zerarEstoque({grupoId = '', motivo = ''} = {}){
    exigir('estoque');
    if (txt(motivo).length < 3) erro('Informe o motivo (ex.: inventário anual, troca de cardápio).');
    const alvo = produtos.filter(p => p.controlaEstoque && r3(p.estoque) !== 0 && (!grupoId || p.grupoId === grupoId));
    if (!alvo.length) erro('Nenhum produto com saldo para zerar.');
    alvo.forEach(p => lancarEstoque(p, 'AJUSTE', -r3(p.estoque), {motivo: `Estoque zerado: ${txt(motivo)}`}));
    auditar(`Estoque zerado em ${alvo.length} produto${alvo.length === 1 ? '' : 's'}${grupoId ? ` da categoria ${grupoPorId(grupoId)?.nome}` : ''}`, {detalhe: txt(motivo)});
    salvar('restProdutos', 'restMovEstoque');
    return alvo.length;
  }
  // Venda cancelada depois de finalizada: devolve exatamente o que foi baixado
  function devolverEstoqueVenda(v, motivo){
    if (!v.estoqueBaixado) return; // vendas de antes do módulo Estoque não baixaram nada
    movEstoque.filter(m => m.vendaId === v.id && m.tipo === 'VENDA').forEach(m => {
      const p = produtoPorId(m.produtoId);
      if (p) lancarEstoque(p, 'ESTORNO', -m.quantidade, {vendaId: v.id, motivo: `Venda #${v.numero} cancelada: ${txt(motivo)}`});
    });
    v.estoqueBaixado = false;
  }

  // =====================================================================
  // ---- Adicionais e etapas ----
  // Grupo de opções escolhidas ao vender o produto. Com mínimo ≥ 1 vira uma etapa obrigatória
  // (ex.: "Ponto da carne": escolha 1); com mínimo 0 é adicional opcional (ex.: "Extras", até 3).
  const grupoAdicionalPorId = id => adicionais.find(g => g.id === id);
  function salvarGrupoAdicional(d, id){
    const inteiro = v => txt(v) === '' ? 0 : Math.round(Number(v));
    const g = {nome: txt(d.nome), min: inteiro(d.min), max: inteiro(d.max), ativo: d.ativo !== false,
      opcoes: (Array.isArray(d.opcoes) ? d.opcoes : []).filter(o => txt(o.nome) || txt(o.preco))
        .map(o => ({id: o.id || novoId('ao'), nome: txt(o.nome), preco: txt(o.preco) === '' ? 0 : r2(lerValor(o.preco)), ativo: o.ativo !== false}))};
    if (!g.nome) erro('Informe o nome do grupo (ex.: Ponto da carne, Extras).');
    if (!g.opcoes.length) erro('Cadastre ao menos uma opção.');
    g.opcoes.forEach(o => { if (!o.nome) erro('Informe o nome de cada opção.'); if (!Number.isFinite(o.preco) || o.preco < 0) erro(`Preço inválido em "${o.nome}".`); });
    const rep = g.opcoes.find((x, k) => g.opcoes.findIndex(y => norm(y.nome) === norm(x.nome)) !== k);
    if (rep) erro(`A opção "${rep.nome}" está repetida.`);
    if (!(g.min >= 0) || !(g.max >= 0)) erro('Mínimo e máximo: números a partir de 0.');
    if (g.max && g.max < g.min) erro('O máximo precisa ser maior ou igual ao mínimo (0 = sem limite).');
    if (g.min > g.opcoes.filter(o => o.ativo).length) erro('O mínimo passa do número de opções ativas.');
    const igual = adicionais.find(x => x.id !== id && norm(x.nome) === norm(g.nome));
    if (igual) erro(`Já existe o grupo "${igual.nome}".`);
    const existente = id && grupoAdicionalPorId(id);
    const resumo = x => `${x.opcoes.map(o => o.nome + (o.preco ? ` +${moedaBR(o.preco)}` : '')).join(', ')} · escolha ${x.min}${x.max ? ` a ${x.max}` : ' ou mais'}`;
    if (existente) {
      const antes = resumo(existente);
      Object.assign(existente, g);
      auditar(`Adicionais "${g.nome}" editado`, antes !== resumo(existente) ? {alteracoes: [{campo: 'Opções', antes, depois: resumo(existente)}]} : undefined);
      salvar('restAdicionais');
      return existente;
    }
    const novo = {id: novoId('ad'), ...g};
    adicionais.push(novo);
    auditar(`Adicionais "${g.nome}" cadastrado`, {detalhe: resumo(novo)});
    salvar('restAdicionais');
    return novo;
  }
  function excluirGrupoAdicional(id){
    const g = grupoAdicionalPorId(id);
    if (!g) return;
    const n = produtos.filter(p => (p.gruposAdicionais || []).includes(id)).length;
    if (n) erro(`"${g.nome}" está em ${n} produto${n === 1 ? '' : 's'}. Tire dos produtos ou desative o grupo.`);
    adicionais.splice(adicionais.indexOf(g), 1);
    auditar(`Adicionais "${g.nome}" excluído`);
    salvar('restAdicionais');
  }

  // ---- Promoções: preço especial por dia da semana, horário e período ----
  const promocaoPorId = id => promocoes.find(x => x.id === id);
  const horaValida = v => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  function salvarPromocao(d, id){
    const x = {nome: txt(d.nome), alvo: d.alvo === 'CATEGORIA' ? 'CATEGORIA' : 'PRODUTO', ids: Array.isArray(d.ids) ? d.ids.filter(Boolean) : [],
      tipo: d.tipo === 'PRECO' ? 'PRECO' : 'PERCENTUAL', valor: r2(lerValor(d.valor)), dias: (Array.isArray(d.dias) ? d.dias : []).map(Number).filter(n => n >= 0 && n <= 6).sort(),
      horaIni: txt(d.horaIni), horaFim: txt(d.horaFim), de: txt(d.de), ate: txt(d.ate), ativo: d.ativo !== false};
    if (!x.nome) erro('Informe o nome da promoção (ex.: Happy hour).');
    if (!x.ids.length) erro(x.alvo === 'PRODUTO' ? 'Escolha ao menos um produto.' : 'Escolha ao menos uma categoria.');
    if (x.ids.some(i => !(x.alvo === 'PRODUTO' ? produtoPorId(i) : grupoPorId(i)))) erro('Produto ou categoria não encontrado.');
    if (!(x.valor > 0)) erro(x.tipo === 'PRECO' ? 'Informe o preço promocional.' : 'Informe o desconto em %.');
    if (x.tipo === 'PERCENTUAL' && x.valor >= 100) erro('O desconto precisa ser menor que 100%.');
    if (x.tipo === 'PRECO' && x.alvo !== 'PRODUTO') erro('Preço fixo só vale para produtos escolhidos (para categoria, use desconto em %).');
    if ((x.horaIni || x.horaFim) && !(horaValida(x.horaIni) && horaValida(x.horaFim) && x.horaIni !== x.horaFim)) erro('Horário: informe início e fim diferentes (HH:MM).');
    if ((x.de && !dataValida(x.de)) || (x.ate && !dataValida(x.ate))) erro('Período inválido.');
    if (x.de && x.ate && x.ate < x.de) erro('O fim do período é antes do início.');
    const existente = id && promocaoPorId(id);
    if (existente) {
      Object.assign(existente, x);
      auditar(`Promoção "${x.nome}" editada (${x.ativo ? 'ativa' : 'inativa'})`, {detalhe: descreverPromocao(existente)});
      salvar('restPromocoes');
      return existente;
    }
    const nova = {id: novoId('pr'), ...x};
    promocoes.push(nova);
    auditar(`Promoção "${x.nome}" cadastrada`, {detalhe: descreverPromocao(nova)});
    salvar('restPromocoes');
    return nova;
  }
  function excluirPromocao(id){
    const x = promocaoPorId(id);
    if (!x) return;
    promocoes.splice(promocoes.indexOf(x), 1);
    auditar(`Promoção "${x.nome}" excluída`);
    salvar('restPromocoes');
  }
  // "20% · Seg, Ter · 18:00–20:00 · até 31/12/2026"
  function descreverPromocao(x){
    return [x.tipo === 'PRECO' ? `por ${moedaBR(x.valor)}` : `${String(x.valor).replace('.', ',')}% de desconto`,
      x.dias.length && x.dias.length < 7 ? x.dias.map(dd => DIAS_SEMANA[dd]).join(', ') : 'todos os dias',
      x.horaIni && `${x.horaIni}–${x.horaFim}`, x.de && `de ${dataBR(x.de)}`, x.ate && `até ${dataBR(x.ate)}`].filter(Boolean).join(' · ');
  }
  const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  // Promoção que vale agora para o produto (a que deixa mais barato)
  function promocoesVigentes(p, quando = new Date()){
    const dia = quando.getDay(), hm = hhmm(quando), data = diaISO(quando);
    // Ex.: sexta 22:00–02:00 — sábado à 01:00 ainda é a promoção de sexta
    const madrugada = x => x.horaIni && x.horaIni > x.horaFim && hm < x.horaFim;
    return promocoes.filter(x => x.ativo && (x.alvo === 'PRODUTO' ? x.ids.includes(p.id) : x.ids.includes(p.grupoId))
      && (!x.dias.length || x.dias.includes(madrugada(x) ? (dia + 6) % 7 : dia)) && (!x.de || data >= x.de) && (!x.ate || data <= x.ate)
      && (!x.horaIni || (x.horaIni < x.horaFim ? hm >= x.horaIni && hm < x.horaFim : hm >= x.horaIni || hm < x.horaFim)));
  }
  // Preço da unidade (sem adicionais): tamanho escolhido e a melhor promoção do momento
  function precoBase(p, tamanhoId, quando = new Date()){
    const t = tamanhoId ? (p.tamanhos || []).find(x => x.id === tamanhoId) : null;
    const tabela = t ? t.preco : p.preco;
    let melhor = {preco: tabela, promo: null};
    promocoesVigentes(p, quando).forEach(x => {
      const v = x.tipo === 'PRECO' ? (t ? null : x.valor) : r2(tabela * (1 - x.valor / 100));
      if (v !== null && v < melhor.preco) melhor = {preco: r2(v), promo: x};
    });
    return {tabela, ...melhor};
  }
  // Confere tamanho e adicionais escolhidos (mínimo/máximo de cada etapa)
  function opcoesDoItem(p, {tamanhoId = null, adicionais: escolhidos = []} = {}){
    const tamanho = tamanhoId ? (p.tamanhos || []).find(x => x.id === tamanhoId) : null;
    if ((p.tamanhos || []).length && !tamanho) erro(`Escolha o tamanho de "${p.nome}".`);
    const lista = [];
    (p.gruposAdicionais || []).map(grupoAdicionalPorId).filter(g => g && g.ativo).forEach(g => {
      const deste = g.opcoes.filter(o => o.ativo && escolhidos.includes(o.id));
      if (deste.length < g.min) erro(`${p.nome} · ${g.nome}: escolha ${g.max === g.min ? g.min : `pelo menos ${g.min}`} opç${g.min === 1 ? 'ão' : 'ões'}.`);
      if (g.max && deste.length > g.max) erro(`${p.nome} · ${g.nome}: no máximo ${g.max} opç${g.max === 1 ? 'ão' : 'ões'}.`);
      deste.forEach(o => lista.push({grupo: g.nome, nome: o.nome, preco: o.preco}));
    });
    if (escolhidos.length > lista.length) erro(`Algum adicional escolhido não vale para "${p.nome}".`);
    return {tamanho, adicionais: lista};
  }
  // Preço unitário que a tela mostra no carrinho (o mesmo que a venda grava)
  function precoItem(p, opcoes = {}){
    const base = precoBase(p, opcoes.tamanhoId).preco;
    const extra = (p.gruposAdicionais || []).map(grupoAdicionalPorId).filter(g => g && g.ativo)
      .flatMap(g => g.opcoes.filter(o => o.ativo && (opcoes.adicionais || []).includes(o.id))).reduce((s, o) => s + o.preco, 0);
    return r2(base + extra);
  }
  // =====================================================================
  // ---- Fila de produção (cozinha): na fila → preparando → pronto → entregue ----
  const ESTADOS_PREPARO = {FILA: 'Na fila', PREPARANDO: 'Preparando', PRONTO: 'Pronto', ENTREGUE: 'Entregue'};
  const LIMITE_FILA_H = 18; // pedidos mais antigos que isso saem da fila (esquecidos)
  function filaProducao(ref = Date.now()){
    const limite = ref - LIMITE_FILA_H * 3600000;
    return vendas.filter(v => v.status !== 'CANCELADA' && new Date(v.data).getTime() >= limite)
      .map(v => ({venda: v, itens: v.itens.filter(i => i.preparo && i.preparo.estado !== 'ENTREGUE')}))
      .filter(x => x.itens.length);
  }
  function moverPreparo(vendaId, itemIds, estado){
    if (!['cozinha', 'mesas', 'vendas', 'delivery'].some(m => podeAcessar(m))) erro('Seu usuário não tem acesso à fila de produção.');
    if (!ESTADOS_PREPARO[estado]) erro('Situação inválida.');
    const v = vendaPorId(vendaId) || erro('Pedido não encontrado.');
    if (v.status === 'CANCELADA') erro('Este pedido foi cancelado.');
    const itens = v.itens.filter(i => itemIds.includes(i.id) && i.preparo);
    if (!itens.length) erro('Nenhum item para mover.');
    itens.forEach(i => { i.preparo = {...i.preparo, estado, [estado.toLowerCase() + 'Em']: agora(), [estado.toLowerCase() + 'Por']: usuario()}; });
    // Delivery acompanha a cozinha: começou a preparar → "Em preparação"; tudo pronto → "Pronto"
    if (ehDelivery(v) && v.status === 'ABERTA') {
      const daCozinha = v.itens.filter(i => i.preparo);
      if (estado === 'PREPARANDO' && v.statusDelivery === 'RECEBIDO') marcarStatus(v, 'PREPARANDO');
      if (daCozinha.every(i => ['PRONTO', 'ENTREGUE'].includes(i.preparo.estado)) && ['RECEBIDO', 'PREPARANDO'].includes(v.statusDelivery)) marcarStatus(v, 'PRONTO');
    }
    salvar('restVendas');
    return itens.length;
  }

  // ---- Aplicativos de delivery (iFood, 99Food...): comissão para o relatório ----
  const aplicativoPorId = id => aplicativos.find(a => a.id === id);
  function salvarAplicativo(d, id){
    const a = {nome: txt(d.nome), comissao: txt(d.comissao) === '' ? 0 : r2(lerValor(d.comissao)), ativo: d.ativo !== false};
    if (!a.nome) erro('Informe o nome do aplicativo.');
    if (!Number.isFinite(a.comissao) || a.comissao < 0 || a.comissao >= 100) erro('Comissão: de 0% a 99%.');
    const igual = aplicativos.find(x => x.id !== id && norm(x.nome) === norm(a.nome));
    if (igual) erro(`Já existe o aplicativo "${igual.nome}".`);
    const existente = id && aplicativoPorId(id);
    if (existente) { Object.assign(existente, a); auditar(`Aplicativo "${a.nome}" editado (${a.comissao}%)`); salvar('restAplicativos'); return existente; }
    const novo = {id: novoId('ap'), ...a};
    aplicativos.push(novo);
    auditar(`Aplicativo "${a.nome}" cadastrado (${a.comissao}%)`);
    salvar('restAplicativos');
    return novo;
  }
  function excluirAplicativo(id){
    const a = aplicativoPorId(id);
    if (!a) return;
    if (vendas.some(v => v.aplicativo?.id === id)) erro(`"${a.nome}" já tem pedidos. Desative em vez de excluir.`);
    aplicativos.splice(aplicativos.indexOf(a), 1);
    auditar(`Aplicativo "${a.nome}" excluído`);
    salvar('restAplicativos');
  }

  // ---- Embalagens (marmita, copo, sacola...): cobradas no delivery por item ----
  const embalagemPorId = id => embalagens.find(e => e.id === id);
  function salvarEmbalagem(d, id){
    const e = {nome: txt(d.nome), preco: txt(d.preco) === '' ? 0 : r2(lerValor(d.preco)), produtoIds: Array.isArray(d.produtoIds) ? d.produtoIds.filter(x => produtoPorId(x)) : [], ativo: d.ativo !== false};
    if (!e.nome) erro('Informe o nome da embalagem.');
    if (!Number.isFinite(e.preco) || e.preco < 0) erro('Preço da embalagem inválido.');
    const igual = embalagens.find(x => x.id !== id && norm(x.nome) === norm(e.nome));
    if (igual) erro(`Já existe a embalagem "${igual.nome}".`);
    // Cada produto usa uma embalagem só
    const outra = embalagens.find(x => x.id !== id && x.produtoIds.some(pid => e.produtoIds.includes(pid)));
    if (outra) erro(`"${produtoPorId(outra.produtoIds.find(pid => e.produtoIds.includes(pid))).nome}" já usa a embalagem "${outra.nome}".`);
    const existente = id && embalagemPorId(id);
    if (existente) { Object.assign(existente, e); auditar(`Embalagem "${e.nome}" editada (${moedaBR(e.preco)})`); salvar('restEmbalagens'); return existente; }
    const nova = {id: novoId('em'), ...e};
    embalagens.push(nova);
    auditar(`Embalagem "${e.nome}" cadastrada (${moedaBR(e.preco)})`);
    salvar('restEmbalagens');
    return nova;
  }
  function excluirEmbalagem(id){
    const e = embalagemPorId(id);
    if (!e) return;
    embalagens.splice(embalagens.indexOf(e), 1);
    auditar(`Embalagem "${e.nome}" excluída`);
    salvar('restEmbalagens');
  }
  const embalagemDoProduto = pid => embalagens.find(e => e.ativo && e.produtoIds.includes(pid)) || null;
  // Soma das embalagens dos itens (quantidade arredondada para cima: 1,5 marmita = 2 embalagens)
  const taxaEmbalagemDe = itens => r2(itens.reduce((s, i) => { const e = embalagemDoProduto(i.produtoId); return s + (e ? Math.ceil(i.quantidade) * e.preco : 0); }, 0));

  const precisaMontar = p => (p.tamanhos || []).length > 0 || (p.gruposAdicionais || []).some(g => grupoAdicionalPorId(g)?.ativo);

  // ---- Clientes (cadastro geral + campos de entrega) ----
  const clientePorId = id => listaClientes().find(c => c.id === id);
  const CAMPOS_CLIENTE = {nome: 'Nome', telefone: 'Telefone', endereco: 'Endereço', numero: 'Número', complemento: 'Complemento', bairro: 'Bairro',
    cidade: 'Cidade', cep: 'CEP', referencia: 'Referência'};
  function salvarClienteRest(dados, id){
    const c = {};
    Object.keys(CAMPOS_CLIENTE).forEach(k => { c[k] = txt(dados[k]); });
    if (!c.nome) erro('Informe o nome do cliente.');
    if (c.telefone && digitos(c.telefone).length < 10) erro('Telefone incompleto (use DDD + número).');
    if (c.telefone && listaClientes().some(x => x.id !== id && digitos(x.telefone) && digitos(x.telefone) === digitos(c.telefone)))
      erro('Já existe um cliente com esse telefone.');
    if (c.cep && digitos(c.cep).length !== 8) erro('CEP deve ter 8 números.');
    const existente = id && clientePorId(id);
    if (existente) {
      const alteracoes = Object.keys(CAMPOS_CLIENTE).filter(k => txt(existente[k]) !== c[k])
        .map(k => ({campo: CAMPOS_CLIENTE[k], antes: txt(existente[k]) || '—', depois: c[k] || '—'}));
      // Object.assign mantém os campos que só o cadastro geral usa (CPF, e-mail, limite...)
      Object.assign(existente, c);
      if (alteracoes.length) auditar(`Cliente ${c.nome} editado`, {alteracoes});
      salvar('clientes');
      return existente;
    }
    const novo = {id: novoId(), doc: '', email: '', obs: '', ...c, dataCadastro: agora()};
    listaClientes().push(novo);
    auditar(`Cliente ${c.nome} cadastrado`, {detalhe: [c.telefone, c.bairro].filter(Boolean).join(' · ')});
    salvar('clientes');
    return novo;
  }
  function excluirClienteRest(id){
    const c = clientePorId(id);
    if (!c) return;
    if (vendas.some(v => v.clienteId === id && v.status === 'ABERTA')) erro(`${c.nome} tem uma venda em aberto no Restaurante. Finalize ou cancele antes.`);
    if (contas.some(x => x.clienteId === id && x.status === 'ABERTA')) erro(`${c.nome} tem conta a receber em aberto. Receba ou exclua a conta antes.`);
    const lista = listaClientes();
    lista.splice(lista.indexOf(c), 1);
    auditar(`Cliente ${c.nome} excluído`);
    salvar('clientes');
  }

  // ---- Entregadores ----
  function cpfValido(v){
    const d = digitos(v);
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = n => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  const mascaraCpf = v => digitos(v).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  function cnpjValido(v){
    const d = digitos(v);
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const dv = n => { let s = 0, p = n - 7; for (let i = 0; i < n; i++) { s += Number(d[i]) * p--; if (p < 2) p = 9; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
  }
  const mascaraCnpj = v => digitos(v).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
  // CPF ou CNPJ no mesmo campo (fornecedor pode ser pessoa física)
  const docValido = v => digitos(v).length === 11 ? cpfValido(v) : cnpjValido(v);
  const mascaraDoc = v => digitos(v).length <= 11 ? mascaraCpf(v) : mascaraCnpj(v);
  const emailValido = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // ---- Fornecedores ----
  const fornecedorPorId = id => fornecedores.find(f => f.id === id);
  const CAMPOS_FORNECEDOR = {nome: 'Nome', documento: 'CPF/CNPJ', telefone: 'Telefone', email: 'E-mail', contato: 'Contato', endereco: 'Endereço', cidade: 'Cidade', obs: 'Observação'};
  function salvarFornecedor(d, id){
    const f = {};
    Object.keys(CAMPOS_FORNECEDOR).forEach(k => { f[k] = txt(d[k]); });
    f.ativo = d.ativo !== false;
    if (!f.nome) erro('Informe o nome do fornecedor.');
    if (f.documento && !docValido(f.documento)) erro('CPF/CNPJ inválido. Confira os números.');
    if (f.documento && fornecedores.some(x => x.id !== id && digitos(x.documento) === digitos(f.documento))) erro('Já existe um fornecedor com esse CPF/CNPJ.');
    if (f.telefone && digitos(f.telefone).length < 10) erro('Telefone incompleto (use DDD + número).');
    if (f.email && !emailValido(f.email)) erro('E-mail inválido.');
    const igual = fornecedores.find(x => x.id !== id && norm(x.nome) === norm(f.nome));
    if (igual) erro(`Já existe o fornecedor "${igual.nome}".`);
    const existente = id && fornecedorPorId(id);
    if (existente) {
      const alteracoes = Object.keys(CAMPOS_FORNECEDOR).filter(k => txt(existente[k]) !== f[k]).map(k => ({campo: CAMPOS_FORNECEDOR[k], antes: txt(existente[k]) || '—', depois: f[k] || '—'}));
      if (existente.ativo !== f.ativo) alteracoes.push({campo: 'Ativo', antes: existente.ativo ? 'Sim' : 'Não', depois: f.ativo ? 'Sim' : 'Não'});
      Object.assign(existente, f);
      if (alteracoes.length) auditar(`Fornecedor "${f.nome}" editado`, {alteracoes});
      salvar('restFornecedores');
      return existente;
    }
    const novo = {id: novoId('fo'), ...f, criadoEm: agora()};
    fornecedores.push(novo);
    auditar(`Fornecedor "${f.nome}" cadastrado`, {detalhe: [f.documento, f.telefone].filter(Boolean).join(' · ')});
    salvar('restFornecedores');
    return novo;
  }
  function excluirFornecedor(id){
    const f = fornecedorPorId(id);
    if (!f) return;
    if (contas.some(c => c.fornecedorId === id) || movEstoque.some(m => m.fornecedorId === id))
      erro(`"${f.nome}" já tem compras ou contas lançadas e fica no histórico. Desative em vez de excluir.`);
    fornecedores.splice(fornecedores.indexOf(f), 1);
    auditar(`Fornecedor "${f.nome}" excluído`);
    salvar('restFornecedores');
  }

  // ---- Funcionários (a equipe; diferente de usuário, que é quem entra no sistema) ----
  const funcionarioPorId = id => funcionarios.find(f => f.id === id);
  function salvarFuncionario(d, id){
    const f = {nome: txt(d.nome), cpf: txt(d.cpf), telefone: txt(d.telefone), cargo: txt(d.cargo), admissao: txt(d.admissao),
      salario: txt(d.salario) === '' ? 0 : r2(lerValor(d.salario)), usuarioId: d.usuarioId || null, obs: txt(d.obs), ativo: d.ativo !== false};
    if (!f.nome) erro('Informe o nome do funcionário.');
    if (!f.cargo) erro('Informe o cargo.');
    if (f.cpf && !cpfValido(f.cpf)) erro('CPF inválido. Confira os números.');
    if (f.cpf && funcionarios.some(x => x.id !== id && digitos(x.cpf) === digitos(f.cpf))) erro('Já existe um funcionário com esse CPF.');
    if (f.telefone && digitos(f.telefone).length < 10) erro('Telefone incompleto (use DDD + número).');
    if (f.admissao && !dataValida(f.admissao)) erro('Data de admissão inválida.');
    if (!Number.isFinite(f.salario) || f.salario < 0) erro('Salário inválido.');
    if (f.usuarioId && !usuarioPorId(f.usuarioId)) erro('Usuário não encontrado.');
    const outro = f.usuarioId && funcionarios.find(x => x.id !== id && x.usuarioId === f.usuarioId);
    if (outro) erro(`Esse usuário já está ligado a ${outro.nome}.`);
    const existente = id && funcionarioPorId(id);
    if (existente) {
      const rot = {nome: 'Nome', cpf: 'CPF', telefone: 'Telefone', cargo: 'Cargo', admissao: 'Admissão', salario: 'Salário', obs: 'Observação', ativo: 'Ativo'};
      const fmt = {salario: moedaBR, admissao: dataBR, ativo: v => v ? 'Sim' : 'Não'};
      const alteracoes = Object.keys(rot).filter(k => (existente[k] ?? '') !== (f[k] ?? ''))
        .map(k => ({campo: rot[k], antes: (fmt[k] || String)(existente[k] ?? '') || '—', depois: (fmt[k] || String)(f[k]) || '—'}));
      Object.assign(existente, f);
      if (alteracoes.length) auditar(`Funcionário "${f.nome}" editado`, {alteracoes});
      salvar('restFuncionarios');
      return existente;
    }
    const novo = {id: novoId('fu'), ...f, criadoEm: agora()};
    funcionarios.push(novo);
    auditar(`Funcionário "${f.nome}" cadastrado (${f.cargo})`);
    salvar('restFuncionarios');
    return novo;
  }
  function excluirFuncionario(id){
    const f = funcionarioPorId(id);
    if (!f) return;
    funcionarios.splice(funcionarios.indexOf(f), 1);
    auditar(`Funcionário "${f.nome}" excluído`);
    salvar('restFuncionarios');
  }

  // ---- Regiões de entrega: cidade, bairros e taxa (o delivery acha a região pelo bairro) ----
  const regiaoPorId = id => regioes.find(r => r.id === id);
  const listaBairros = v => (Array.isArray(v) ? v : String(v ?? '').split(/[,;\n]/)).map(txt).filter(Boolean)
    .filter((b, k, l) => l.findIndex(x => norm(x) === norm(b)) === k);
  const mesmaCidade = (a, b) => !txt(a) || !txt(b) || norm(a) === norm(b);
  function regiaoDoBairro(bairro, cidade){
    if (!txt(bairro)) return null;
    return regioes.find(r => r.ativo && mesmaCidade(r.cidade, cidade) && r.bairros.some(b => norm(b) === norm(bairro))) || null;
  }
  function salvarRegiao(d, id){
    const r = {nome: txt(d.nome), cidade: txt(d.cidade), bairros: listaBairros(d.bairros), taxa: txt(d.taxa) === '' ? 0 : r2(lerValor(d.taxa)),
      tempo: txt(d.tempo) === '' || d.tempo == null ? null : Math.round(Number(d.tempo)), ativo: d.ativo !== false};
    if (!r.nome) erro('Informe o nome da região.');
    if (!r.bairros.length) erro('Informe ao menos um bairro (separe por vírgula).');
    if (!Number.isFinite(r.taxa) || r.taxa < 0) erro('Taxa de entrega inválida.');
    if (r.tempo !== null && !(r.tempo > 0 && r.tempo <= 600)) erro('Tempo estimado: de 1 a 600 minutos.');
    const igual = regioes.find(x => x.id !== id && norm(x.nome) === norm(r.nome) && mesmaCidade(x.cidade, r.cidade));
    if (igual) erro(`Já existe a região "${igual.nome}".`);
    if (r.ativo) regioes.filter(x => x.id !== id && x.ativo && mesmaCidade(x.cidade, r.cidade)).forEach(x => {
      const repetido = r.bairros.find(b => x.bairros.some(y => norm(y) === norm(b)));
      if (repetido) erro(`O bairro "${repetido}" já está na região "${x.nome}".`);
    });
    const existente = id && regiaoPorId(id);
    if (existente) {
      const alteracoes = [];
      if (existente.taxa !== r.taxa) alteracoes.push({campo: 'Taxa', antes: moedaBR(existente.taxa), depois: moedaBR(r.taxa)});
      if (existente.bairros.join(', ') !== r.bairros.join(', ')) alteracoes.push({campo: 'Bairros', antes: existente.bairros.join(', '), depois: r.bairros.join(', ')});
      if (existente.ativo !== r.ativo) alteracoes.push({campo: 'Ativa', antes: existente.ativo ? 'Sim' : 'Não', depois: r.ativo ? 'Sim' : 'Não'});
      Object.assign(existente, r);
      auditar(`Região de entrega "${r.nome}" editada`, alteracoes.length ? {alteracoes} : undefined);
      salvar('restRegioes');
      return existente;
    }
    const nova = {id: novoId('rg'), ...r};
    regioes.push(nova);
    auditar(`Região de entrega "${r.nome}" cadastrada — ${moedaBR(r.taxa)}`, {detalhe: r.bairros.join(', ')});
    salvar('restRegioes');
    return nova;
  }
  function excluirRegiao(id){
    const r = regiaoPorId(id);
    if (!r) return;
    regioes.splice(regioes.indexOf(r), 1); // os pedidos guardam o nome da região: o histórico não muda
    auditar(`Região de entrega "${r.nome}" excluída`);
    salvar('restRegioes');
  }
  const entregadorPorId = id => entregadores.find(e => e.id === id);
  function salvarEntregador(dados, id){
    const e = {nome: txt(dados.nome), telefone: txt(dados.telefone), cpf: txt(dados.cpf), obs: txt(dados.obs),
      veiculo: VEICULOS.includes(dados.veiculo) ? dados.veiculo : VEICULOS[0], placa: txt(dados.placa).toUpperCase(), ativo: dados.ativo !== false};
    if (!e.nome) erro('Informe o nome do entregador.');
    if (e.cpf && !cpfValido(e.cpf)) erro('CPF inválido. Confira os números.');
    if (e.cpf && entregadores.some(x => x.id !== id && digitos(x.cpf) === digitos(e.cpf))) erro('Já existe um entregador com esse CPF.');
    if (!e.ativo && vendas.some(v => v.entregadorId === id && v.status === 'ABERTA')) erro('Este entregador está com pedido em rota. Conclua antes de desativar.');
    if (e.telefone && digitos(e.telefone).length < 10) erro('Telefone incompleto (use DDD + número).');
    const eIgual = entregadores.find(x => x.id !== id && norm(x.nome) === norm(e.nome));
    if (eIgual) erro(`Já existe o entregador "${eIgual.nome}".`);
    const existente = id && entregadorPorId(id);
    if (existente) {
      Object.assign(existente, e);
      auditar(`Entregador ${e.nome} editado`);
      salvar('restEntregadores');
      return existente;
    }
    const novo = {id: novoId('e'), ...e};
    entregadores.push(novo);
    auditar(`Entregador ${e.nome} cadastrado`);
    salvar('restEntregadores');
    return novo;
  }
  function excluirEntregador(id){
    const e = entregadorPorId(id);
    if (!e) return;
    if (vendas.some(v => v.entregadorId === id)) erro(`${e.nome} já fez entregas e não pode ser excluído. Desative o cadastro.`);
    entregadores.splice(entregadores.indexOf(e), 1);
    auditar(`Entregador ${e.nome} excluído`);
    salvar('restEntregadores');
  }

  // =====================================================================
  // ---- Caixa ----
  // O caixa guarda abertura, movimentos (suprimento, sangria, estorno, recebimento,
  // pagamento) e, no fechamento, o resumo congelado. As vendas apontam para o caixa.
  const caixaAberto = () => caixas.find(c => c.status === 'ABERTO') || null;
  const caixaPorId = id => caixas.find(c => c.id === id);
  const caixaExigido = () => caixaAberto() || erro('Nenhum caixa aberto. Abra o caixa primeiro.');
  function abrirCaixa({operadorId, valorInicial} = {}){
    exigir('vendas');
    if (caixaAberto()) erro(`O caixa #${caixaAberto().numero} já está aberto. Feche-o antes de abrir outro.`);
    const op = operadorId ? usuarioPorId(operadorId) : sessaoAtual();
    if (operadorId && (!op || !op.ativo)) erro('Escolha um operador ativo.');
    if (txt(valorInicial) === '') erro('Informe o valor inicial em dinheiro (pode ser 0,00).');
    const valor = r2(lerValor(valorInicial));
    if (!Number.isFinite(lerValor(valorInicial)) || valor < 0) erro('Valor inicial inválido.');
    seq.caixa++;
    const cx = {id: novoId('cx'), numero: seq.caixa, operadorId: op?.id || null, operador: op?.nome || usuario(), abertoPor: usuario(),
      abertura: agora(), valorInicial: valor, status: 'ABERTO', fechamento: null, valorContado: null, diferenca: null, obsFechamento: '', resumo: null};
    caixas.push(cx);
    movCaixa.push({id: novoId('m'), caixaId: cx.id, tipo: 'ABERTURA', valor, forma: 'DINHEIRO', descricao: 'Valor inicial', data: cx.abertura, operador: usuario()});
    auditar(`Caixa #${cx.numero} aberto por ${cx.operador} com ${moedaBR(valor)}`);
    salvar('restCaixas', 'restMovCaixa', 'restSeq');
    return cx;
  }
  const lancarMov = (cx, tipo, valor, forma, descricao, extra) => {
    const m = {id: novoId('m'), caixaId: cx.id, tipo, valor: r2(valor), forma, descricao, data: agora(), operador: usuario(), ...(extra || {})};
    movCaixa.push(m);
    return m;
  };
  // Suprimento (põe dinheiro no caixa) e sangria (tira dinheiro do caixa)
  function movimentarCaixa(tipo, {valor, motivo, contaBancariaId = null}){
    exigir('vendas');
    const cx = caixaExigido();
    if (!['SUPRIMENTO', 'SANGRIA'].includes(tipo)) erro('Movimento inválido.');
    const v = r2(lerValor(valor));
    if (!(v > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (txt(motivo).length < 3) erro(`Informe o motivo ${tipo === 'SANGRIA' ? 'da sangria' : 'do suprimento'}.`);
    if (tipo === 'SANGRIA' && v > resumoCaixa(cx.id).saldoDinheiro + 0.001) erro(`A sangria passa do dinheiro no caixa (${moedaBR(resumoCaixa(cx.id).saldoDinheiro)}).`);
    if (contaBancariaId) { exigir('financeiro'); contaAtiva(contaBancariaId); }
    const m = lancarMov(cx, tipo, v, 'DINHEIRO', txt(motivo));
    // Sangria vai para a conta (ex.: cofre, depósito no banco); suprimento sai da conta
    if (contaBancariaId) m.movContaId = lancarConta(contaBancariaId, tipo === 'SANGRIA' ? 'ENTRADA' : 'SAIDA', v,
      `${TIPOS_MOV_CAIXA[tipo]} do caixa #${cx.numero}: ${m.descricao}`, {origem: 'CAIXA', movCaixaId: m.id}).id;
    auditar(`${TIPOS_MOV_CAIXA[tipo]} de ${moedaBR(v)} no caixa #${cx.numero}${contaBancariaId ? ` (${tipo === 'SANGRIA' ? 'para' : 'de'} ${contaBancariaPorId(contaBancariaId).nome})` : ''}`, {detalhe: m.descricao});
    salvar('restMovCaixa', 'restMovConta');
    return m;
  }
  // Panorama do caixa: o que entrou e saiu por forma e o dinheiro que deve estar na gaveta
  function resumoCaixa(id){
    const cx = caixaPorId(id);
    if (!cx) erro('Caixa não encontrado.');
    const formasZero = () => Object.fromEntries(Object.keys(TIPOS_FORMA).map(t => [t, 0]));
    const doCaixa = vendas.filter(v => v.caixaId === cx.id && v.finalizadaEm);
    const validas = doCaixa.filter(v => v.status === 'FINALIZADA'), canceladas = doCaixa.filter(v => v.status === 'CANCELADA');
    // Recebido em vendas por forma (inclui as canceladas depois: o estorno devolve)
    const porForma = formasZero();
    doCaixa.forEach(v => v.pagamentos.filter(p => !AJUSTES.includes(p.forma)).forEach(p => { porForma[tipoPagamento(p)] = r2(porForma[tipoPagamento(p)] + p.valor); }));
    const movs = movCaixa.filter(m => m.caixaId === cx.id);
    const soma = (tipo, forma) => r2(movs.filter(m => m.tipo === tipo && (!forma || m.forma === forma)).reduce((s, m) => s + m.valor, 0));
    const totalVendas = r2(validas.reduce((s, v) => s + totaisVenda(v).total, 0));
    const r = {
      caixa: cx, inicial: cx.valorInicial, totalVendas, nVendas: validas.length, nCanceladas: canceladas.length, porForma,
      valorCanceladas: r2(canceladas.reduce((s, v) => s + v.pagamentos.filter(p => !AJUSTES.includes(p.forma) && tipoPagamento(p) !== 'PRAZO').reduce((t, p) => t + p.valor, 0), 0)),
      trocos: r2(doCaixa.reduce((s, v) => s + v.pagamentos.reduce((t, p) => t + (p.troco || 0), 0), 0)),
      suprimentos: soma('SUPRIMENTO'), sangrias: soma('SANGRIA'), estornos: soma('ESTORNO'), estornosDinheiro: soma('ESTORNO', 'DINHEIRO'),
      recebimentos: soma('RECEBIMENTO'), recebimentosDinheiro: soma('RECEBIMENTO', 'DINHEIRO'),
      pagamentos: soma('PAGAMENTO'), pagamentosDinheiro: soma('PAGAMENTO', 'DINHEIRO'), movimentos: movs
    };
    // Saldo final = dinheiro que deve estar na gaveta (PIX e cartões não ficam no caixa físico)
    const abertas = vendas.filter(v => v.caixaId === cx.id && v.status === 'ABERTA');
    r.abertas = {n: abertas.length, consumo: r2(abertas.reduce((s, v) => s + totaisVenda(v).total, 0)), recebido: r2(abertas.reduce((s, v) => s + totaisVenda(v).pago, 0))};
    r.saldoDinheiro = r2(r.inicial + porForma.DINHEIRO + r.recebimentosDinheiro + r.suprimentos - r.sangrias - r.pagamentosDinheiro - r.estornosDinheiro);
    // O que deve ter entrado em cada forma (cartões e PIX conferidos pelo extrato da maquininha/banco)
    const naForma = (tipo, forma) => r2(movs.filter(m => m.tipo === tipo && m.forma === forma).reduce((s, m) => s + m.valor, 0));
    r.esperado = {DINHEIRO: r.saldoDinheiro};
    ['PIX', 'DEBITO', 'CREDITO', 'OUTROS'].forEach(t => { r.esperado[t] = r2(porForma[t] + naForma('RECEBIMENTO', t) - naForma('PAGAMENTO', t) - naForma('ESTORNO', t)); });
    // Tudo o que o caixa movimentou, em todas as formas (a prazo fica de fora: não entrou dinheiro)
    r.totalGeral = r2(r.inicial + Object.entries(porForma).filter(([t]) => t !== 'PRAZO').reduce((s, [, v]) => s + v, 0)
      + r.recebimentos + r.suprimentos - r.sangrias - r.pagamentos - r.estornos);
    return r;
  }
  function fecharCaixa({valorContado, obs, conferencia = {}}){
    exigir('vendas');
    const cx = caixaExigido();
    const abertas = vendas.filter(v => v.caixaId === cx.id && v.status === 'ABERTA' && v.tipo !== 'ENCOMENDA');
    if (abertas.length) erro(`Há ${abertas.length} venda${abertas.length === 1 ? '' : 's'} em aberto neste caixa (mesas ou deliveries). Finalize ou cancele antes de fechar.`);
    if (txt(valorContado) === '') erro('Conte o dinheiro da gaveta e informe o valor.');
    const contado = r2(lerValor(valorContado));
    if (!Number.isFinite(lerValor(valorContado)) || contado < 0) erro('Valor contado inválido.');
    const r = resumoCaixa(cx.id);
    const diferenca = r2(contado - r.saldoDinheiro);
    // Conferência das outras formas (opcional): o que foi informado é comparado ao esperado
    const conferidas = ['PIX', 'DEBITO', 'CREDITO', 'OUTROS'].filter(t => txt(conferencia[t]) !== '').map(t => {
      const c = r2(lerValor(conferencia[t]));
      if (!Number.isFinite(lerValor(conferencia[t])) || c < 0) erro(`Valor conferido inválido em ${TIPOS_FORMA[t]}.`);
      return {tipo: t, nome: TIPOS_FORMA[t], esperado: r.esperado[t], contado: c, diferenca: r2(c - r.esperado[t])};
    });
    const comDiferenca = conferidas.filter(x => Math.abs(x.diferenca) > 0.001);
    if ((Math.abs(diferenca) > 0.001 || comDiferenca.length) && txt(obs).length < 3)
      erro(Math.abs(diferenca) > 0.001 ? `Há ${diferenca > 0 ? 'sobra' : 'falta'} de ${moedaBR(Math.abs(diferenca))} no dinheiro. Informe o motivo para fechar.`
        : `Há diferença em ${comDiferenca.map(x => x.nome).join(', ')}. Informe o motivo para fechar.`);
    const {movimentos, caixa, ...congelado} = r;
    Object.assign(cx, {status: 'FECHADO', fechamento: agora(), fechadoPor: usuario(), valorContado: contado, diferenca, obsFechamento: txt(obs), resumo: congelado,
      conferencia: [{tipo: 'DINHEIRO', nome: TIPOS_FORMA.DINHEIRO, esperado: r.saldoDinheiro, contado, diferenca}, ...conferidas]});
    auditar(`Caixa #${cx.numero} fechado — esperado ${moedaBR(r.saldoDinheiro)}, contado ${moedaBR(contado)}${Math.abs(diferenca) > 0.001 ? ` (${diferenca > 0 ? 'sobra' : 'falta'} de ${moedaBR(Math.abs(diferenca))})` : ''}`,
      {detalhe: [txt(obs), ...comDiferenca.map(x => `${x.nome}: ${x.diferenca > 0 ? 'sobra' : 'falta'} de ${moedaBR(Math.abs(x.diferenca))}`)].filter(Boolean).join(' · ')});
    salvar('restCaixas');
    return cx;
  }

  // ---- Vendas ----
  const vendaPorId = id => vendas.find(v => v.id === id);
  // Desconto/acréscimo digitados como "5,00" (R$) ou "10%" (sobre a base)
  function valorAjuste(entrada, base){
    const t = txt(entrada);
    if (!t) return 0;
    const v = t.endsWith('%') ? base * lerValor(t.slice(0, -1)) / 100 : lerValor(t);
    if (!Number.isFinite(v) || v < 0) erro('Desconto ou acréscimo inválido.');
    return r2(v);
  }
  // Totais: itens (qtd × preço − desconto do item) − desconto + acréscimo = total; pago = formas reais
  function totaisVenda(v){
    const itens = r2(v.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario - (i.desconto || 0), 0));
    const legado = forma => r2(v.pagamentos.filter(p => p.forma === forma).reduce((s, p) => s + p.valor, 0));
    const desconto = r2((v.desconto || 0) + legado('DESCONTO')), acrescimo = r2((v.acrescimo || 0) + legado('ACRESCIMO'));
    const servico = v.taxaServico?.ativa ? r2(itens * (v.taxaServico.percentual || 0) / 100) : 0;
    const entrega = r2(v.taxaEntrega || 0), embalagem = r2(v.taxaEmbalagem || 0);
    const total = r2(Math.max(itens - desconto + acrescimo + servico + entrega + embalagem, 0));
    const reais = v.pagamentos.filter(p => !AJUSTES.includes(p.forma));
    const pago = r2(reais.reduce((s, p) => s + p.valor, 0));
    return {itens, desconto, acrescimo, servico, entrega, embalagem, total, pago, restante: r2(Math.max(total - pago, 0)), troco: r2(reais.reduce((s, p) => s + (p.troco || 0), 0))};
  }
  // Aplica um pagamento sobre o restante. Só dinheiro pode passar do restante (gera troco).
  function montarPagamento(restante, formaId, valor){
    const f = formaPorId(formaId);
    if (!f || !f.ativo) erro('Escolha uma forma de pagamento ativa.');
    const v = r2(lerValor(valor));
    if (!(v > 0)) erro('O valor do pagamento deve ser maior que zero.');
    if (restante <= 0.001) erro('A venda já está totalmente paga.');
    if (f.tipo !== 'DINHEIRO' && v > restante + 0.001) erro(`${f.nome}: valor maior que o restante a pagar (${moedaBR(restante)}). Só dinheiro pode passar e gerar troco.`);
    const aplicado = r2(Math.min(v, restante));
    return {id: novoId('pg'), formaId: f.id, tipo: f.tipo, nome: f.nome, valor: aplicado, recebido: v, troco: r2(v - aplicado), data: agora()};
  }
  // opcoes: {tamanhoId, adicionais: [ids das opções]}; o preço sai do cadastro (tamanho + promoção + adicionais)
  function itemDaVenda(produtoId, quantidade, observacao, opcoes = {}){
    const p = produtoPorId(produtoId);
    if (!p) erro('Produto não encontrado.');
    if (!p.ativo) erro(`"${p.nome}" está desativado.`);
    if (p.tipo === 'INSUMO') erro(`"${p.nome}" é insumo e não é vendido.`);
    const qtd = typeof quantidade === 'number' ? quantidade : lerValor(quantidade);
    if (!(qtd > 0)) erro(`Quantidade inválida para "${p.nome}".`);
    const {tamanho, adicionais: escolhidos} = opcoesDoItem(p, opcoes);
    const pr = precoBase(p, tamanho?.id);
    const extra = r2(escolhidos.reduce((s, o) => s + o.preco, 0));
    return {id: novoId('i'), produtoId: p.id, codigo: p.codigo, nome: p.nome + (tamanho ? ` (${tamanho.nome})` : ''), quantidade: r3(qtd),
      precoUnitario: r2(pr.preco + extra), custoUnitario: custoProduto(p), desconto: 0, observacao: txt(observacao), pago: false,
      ...(tamanho ? {tamanho: tamanho.nome} : {}), ...(escolhidos.length ? {adicionais: escolhidos} : {}),
      ...(pr.promo ? {promocao: pr.promo.nome, precoTabela: r2(pr.tabela + extra)} : {}),
      ...(grupoPorId(p.grupoId)?.cozinha !== false ? {preparo: {estado: 'FILA', desde: agora()}} : {})};
  }
  const opcoesDe = i => ({tamanhoId: i.tamanhoId || null, adicionais: i.adicionais || []});
  // Fecha a venda: confere o pagamento, marca itens pagos e gera conta a receber do que foi a prazo
  function concluir(v){
    const t = totaisVenda(v);
    if (!v.itens.length) erro('Adicione ao menos um item.');
    if (t.restante > 0.001) erro(`Falta pagar ${moedaBR(t.restante)}.`);
    if (v.pagamentos.some(p => p.tipo === 'PRAZO') && !clientePorId(v.clienteId)) erro('Venda a prazo precisa de um cliente.');
    v.itens.forEach(i => { i.pago = true; });
    v.status = 'FINALIZADA';
    v.finalizadaEm = agora();
    baixarEstoqueVenda(v);
    const prazo = r2(v.pagamentos.filter(p => p.tipo === 'PRAZO').reduce((s, p) => s + p.valor, 0));
    if (prazo > 0) {
      const venc = new Date(); venc.setDate(venc.getDate() + PRAZO_DIAS);
      contas.push({id: novoId('ct'), tipo: 'RECEBER', descricao: `Venda #${v.numero} — ${clientePorId(v.clienteId)?.nome || 'cliente'}`,
        categoria: CATEGORIA_PRAZO, valor: prazo, vencimento: diaISO(venc), status: 'ABERTA', pagoEm: null, forma: '',
        clienteId: v.clienteId, vendaId: v.id, obs: '', criadoEm: agora()});
    }
    auditar(`Venda #${v.numero} (${TIPOS_VENDA[v.tipo]}) finalizada — ${moedaBR(t.total)}`,
      {detalhe: v.pagamentos.map(p => `${p.nome} ${moedaBR(p.valor)}`).join(' + ') + (t.troco ? ` · troco ${moedaBR(t.troco)}` : '')});
    return t;
  }
  // PDV de balcão: carrinho → venda finalizada de uma vez (nada fica pela metade)
  function registrarVenda({tipo = 'BALCAO', itens = [], desconto = '', acrescimo = '', pagamentos = [], clienteId = null, obs = ''} = {}){
    exigir('vendas');
    const cx = caixaExigido();
    if (!TIPOS_VENDA[tipo]) erro('Tipo de venda inválido.');
    if (!itens.length) erro('Adicione ao menos um produto.');
    if (clienteId && !clientePorId(clienteId)) erro('Cliente não encontrado.');
    const linhas = itens.map(i => itemDaVenda(i.produtoId, i.quantidade, i.observacao, opcoesDe(i)));
    const base = r2(linhas.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
    const acr = valorAjuste(acrescimo, base), desc = valorAjuste(desconto, base);
    if (desc > base + acr + 0.001) erro('O desconto não pode passar do total da venda.');
    const v = {id: novoId('v'), numero: seq.venda + 1, caixaId: cx.id, tipo, status: 'ABERTA', clienteId: clienteId || null, mesa: '', entregadorId: null,
      obs: txt(obs), operadorId: sessaoAtual()?.id || null, operador: usuario(), data: agora(), finalizadaEm: null, canceladaEm: null, motivoCancelamento: '',
      desconto: desc, acrescimo: acr, itens: linhas, pagamentos: []};
    if (totaisVenda(v).total <= 0) erro('O total da venda precisa ser maior que R$ 0,00.');
    pagamentos.forEach(p => v.pagamentos.push(montarPagamento(totaisVenda(v).restante, p.formaId, p.valor)));
    concluir(v);
    seq.venda++;
    vendas.push(v);
    salvar('restVendas', 'restContas', 'restSeq', 'restProdutos', 'restMovEstoque');
    return v;
  }
  // Vendas que ficam abertas (mesa, delivery): criadas, recebem itens e pagamentos, e são finalizadas depois.
  // Mesa: quem tem o módulo Mesas (garçom) abre, lança e pede a conta; receber exige o módulo Vendas (caixa).
  const moduloDaVenda = tipo => tipo === 'MESA' ? 'mesas' : tipo === 'DELIVERY' || tipo === 'ENCOMENDA' ? 'delivery' : 'vendas';
  function novaVenda({tipo = 'BALCAO', clienteId = null, mesaId = null, pessoas = 1, entregadorId = null, obs = ''} = {}){
    exigir(moduloDaVenda(tipo));
    const cx = caixaExigido();
    if (!TIPOS_VENDA[tipo]) erro('Tipo de venda inválido.');
    let mesa = null;
    if (tipo === 'MESA') {
      mesa = mesaPorId(mesaId);
      if (!mesa || !mesa.ativo) erro('Escolha uma mesa ativa.');
      const ocupada = vendaDaMesa(mesa.id);
      if (ocupada) erro(`A mesa ${mesa.numero} já está aberta (pedido #${ocupada.numero}).`);
    }
    if ((tipo === 'DELIVERY' || tipo === 'ENCOMENDA') && !clientePorId(clienteId)) erro(`Venda ${TIPOS_VENDA[tipo]} precisa de um cliente.`);
    const n = Math.max(1, Math.round(Number(pessoas) || 1));
    seq.venda++;
    const v = {id: novoId('v'), numero: seq.venda, caixaId: cx.id, tipo, status: 'ABERTA', clienteId: clienteId || null,
      mesaId: mesa?.id || null, mesa: mesa?.numero || '', pessoas: n, contaPedida: false,
      taxaServico: tipo === 'MESA' ? {ativa: !!config.servicoPadrao, percentual: config.taxaServico} : null,
      entregadorId: entregadorId || null, obs: txt(obs), operadorId: sessaoAtual()?.id || null, operador: usuario(), data: agora(), finalizadaEm: null,
      canceladaEm: null, motivoCancelamento: '', desconto: 0, acrescimo: 0, itens: [], pagamentos: []};
    vendas.push(v);
    if (mesa) auditar(`Mesa ${mesa.numero} aberta (pedido #${v.numero}, ${n} pessoa${n === 1 ? '' : 's'})`);
    salvar('restVendas', 'restSeq');
    return v;
  }
  const vendaEditavel = v => { if (!v) erro('Venda não encontrada.'); if (v.status !== 'ABERTA') erro(`A venda #${v.numero} está ${STATUS_VENDA[v.status].toLowerCase()}.`); return v; };
  const editavelPor = id => { const v = vendaEditavel(vendaPorId(id)); exigir(moduloDaVenda(v.tipo)); return v; };
  const nomeVenda = v => v.tipo === 'MESA' ? `Mesa ${v.mesa}` : v.tipo === 'BALCAO' ? `Venda #${v.numero}` : `${TIPOS_VENDA[v.tipo]} #${v.numero}`;
  function adicionarItem(vendaId, produtoId, {quantidade = 1, desconto = 0, observacao = '', tamanhoId = null, adicionais: escolhidos = []} = {}){
    const v = editavelPor(vendaId);
    const item = itemDaVenda(produtoId, quantidade, observacao, {tamanhoId, adicionais: escolhidos});
    const desc = r2(lerValor(desconto || 0));
    if (!(desc >= 0) || desc > r2(item.quantidade * item.precoUnitario)) erro('Desconto do item inválido.');
    Object.assign(item, {desconto: desc, adicionadoPor: usuario(), adicionadoEm: agora()});
    v.itens.push(item);
    v.contaPedida = false; // pediu mais coisa: a conta volta a ficar em aberto
    salvar('restVendas');
    return item;
  }
  const itemDe = (v, itemId) => v.itens.find(i => i.id === itemId) || erro('Item não encontrado.');
  // O total não pode ficar abaixo do que já foi pago
  const conferirPago = v => { const t = totaisVenda(v); if (t.pago > t.total + 0.001) erro(`Já foram recebidos ${moedaBR(t.pago)}: o total não pode ficar abaixo disso.`); };
  function alterarItem(vendaId, itemId, {quantidade, observacao, precoUnitario, desconto}){
    const v = editavelPor(vendaId);
    const i = itemDe(v, itemId);
    if (i.pago) erro(`"${i.nome}" já foi pago e não pode ser alterado.`);
    const antes = {...i};
    if (quantidade !== undefined) {
      const q = typeof quantidade === 'number' ? quantidade : lerValor(quantidade);
      if (!(q > 0)) erro('Quantidade inválida. Para tirar o item, use excluir.');
      i.quantidade = r3(q);
    }
    if (observacao !== undefined) i.observacao = txt(observacao);
    if (precoUnitario !== undefined) {
      const pu = r2(lerValor(precoUnitario));
      if (!(pu > 0)) erro('Preço unitário inválido.');
      i.precoUnitario = pu;
    }
    if (desconto !== undefined) {
      const dsc = txt(desconto) === '' ? 0 : r2(lerValor(desconto));
      if (!(dsc >= 0)) erro('Desconto do item inválido.');
      i.desconto = dsc;
    }
    if (r2(i.desconto || 0) > r2(i.quantidade * i.precoUnitario)) { Object.assign(i, antes); erro('O desconto passa do valor do item.'); }
    if ((antes.precoUnitario !== i.precoUnitario || r2(antes.desconto || 0) !== r2(i.desconto || 0)) && !podeAcessar('vendas')) {
      Object.assign(i, antes); erro('Mudar preço ou dar desconto é com o caixa ou o gerente.');
    }
    try { conferirPago(v); } catch (e) { Object.assign(i, antes); throw e; }
    // Preço e desconto mudados à mão ficam na auditoria
    const alteracoes = [];
    if (antes.precoUnitario !== i.precoUnitario) alteracoes.push({campo: 'Preço unitário', antes: moedaBR(antes.precoUnitario), depois: moedaBR(i.precoUnitario)});
    if ((antes.desconto || 0) !== (i.desconto || 0)) alteracoes.push({campo: 'Desconto', antes: moedaBR(antes.desconto || 0), depois: moedaBR(i.desconto || 0)});
    if (alteracoes.length) auditar(`${nomeVenda(v)}: item "${i.nome}" alterado`, {alteracoes});
    salvar('restVendas');
    return i;
  }
  function removerItem(vendaId, itemId, motivo = ''){
    const v = editavelPor(vendaId);
    const i = itemDe(v, itemId);
    if (i.pago) erro(`"${i.nome}" já foi pago e não pode ser excluído.`);
    if ((i.impressoEm || (i.preparo && i.preparo.estado !== 'FILA')) && !podeAcessar('vendas'))
      erro(`"${i.nome}" já foi para a cozinha: só o caixa ou o gerente tira o item.`);
    v.itens.splice(v.itens.indexOf(i), 1);
    try { conferirPago(v); } catch (e) { v.itens.push(i); throw e; }
    auditar(`${nomeVenda(v)}: item excluído — ${i.quantidade}× ${i.nome}`, {detalhe: txt(motivo)});
    salvar('restVendas');
  }
  function ajustarVenda(vendaId, {desconto, acrescimo}){
    const v = editavelPor(vendaId);
    const base = r2(v.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario - (i.desconto || 0), 0));
    const acr = valorAjuste(acrescimo, base), desc = valorAjuste(desconto, base);
    if (desc > base + acr + 0.001) erro('O desconto não pode passar do total da venda.');
    const antes = {desconto: v.desconto, acrescimo: v.acrescimo};
    Object.assign(v, {desconto: desc, acrescimo: acr});
    try { conferirPago(v); } catch (e) { Object.assign(v, antes); throw e; }
    const alteracoes = [['desconto', 'Desconto'], ['acrescimo', 'Acréscimo']].filter(([k]) => r2(antes[k] || 0) !== r2(v[k] || 0))
      .map(([k, campo]) => ({campo, antes: moedaBR(antes[k] || 0), depois: moedaBR(v[k] || 0)}));
    if (alteracoes.length) auditar(`${nomeVenda(v)}: ${alteracoes.map(a => a.campo.toLowerCase()).join(' e ')} alterado`, {alteracoes});
    salvar('restVendas');
    return totaisVenda(v);
  }
  // Taxa de serviço: liga/desliga em uma mesa específica (o percentual vem da configuração)
  function definirServico(vendaId, ativa){
    const v = editavelPor(vendaId);
    if (v.tipo !== 'MESA') erro('Taxa de serviço só vale para mesas.');
    const antes = v.taxaServico;
    v.taxaServico = {ativa: !!ativa, percentual: antes?.percentual ?? config.taxaServico};
    try { conferirPago(v); } catch (e) { v.taxaServico = antes; throw e; }
    auditar(`${nomeVenda(v)}: taxa de serviço ${ativa ? 'incluída' : 'retirada'} (${v.taxaServico.percentual}%)`);
    salvar('restVendas');
    return totaisVenda(v);
  }
  function pedirConta(vendaId, pedida = true){
    const v = editavelPor(vendaId);
    if (pedida && !v.itens.length) erro('A mesa ainda não tem itens.');
    v.contaPedida = !!pedida;
    auditar(`${nomeVenda(v)}: conta ${pedida ? 'pedida' : 'reaberta'}`);
    salvar('restVendas');
  }
  function definirPessoas(vendaId, pessoas){
    const v = editavelPor(vendaId);
    const n = Math.round(Number(pessoas));
    if (!(n >= 1 && n <= 99)) erro('Número de pessoas inválido.');
    v.pessoas = n;
    salvar('restVendas');
  }
  function transferirMesa(vendaId, mesaId){
    const v = editavelPor(vendaId);
    if (v.tipo !== 'MESA') erro('Só pedidos de mesa podem ser transferidos.');
    const destino = mesaPorId(mesaId);
    if (!destino || !destino.ativo) erro('Escolha uma mesa ativa.');
    if (destino.id === v.mesaId) erro('O pedido já está nesta mesa.');
    const ocupada = vendaDaMesa(destino.id);
    if (ocupada) erro(`A mesa ${destino.numero} está ocupada.`);
    const origem = v.mesa;
    Object.assign(v, {mesaId: destino.id, mesa: destino.numero});
    auditar(`Pedido #${v.numero} transferido da mesa ${origem} para a mesa ${destino.numero}`);
    salvar('restVendas');
    return v;
  }
  // Valor de itens escolhidos já com a parte proporcional da taxa de serviço, desconto e acréscimo.
  // Se forem todos os itens ainda não pagos, é exatamente o que falta (sem sobra de centavos).
  function valorDosItens(v, itemIds){
    const t = totaisVenda(v);
    const naoPagos = v.itens.filter(i => !i.pago);
    const escolhidos = naoPagos.filter(i => itemIds.includes(i.id));
    if (!escolhidos.length) return 0;
    if (escolhidos.length === naoPagos.length) return t.restante;
    const fator = t.itens > 0 ? t.total / t.itens : 1;
    const soma = escolhidos.reduce((s, i) => s + (i.quantidade * i.precoUnitario - (i.desconto || 0)) * fator, 0);
    return r2(Math.min(soma, t.restante));
  }
  // Recebe uma parte da conta: valor livre (divisão por pessoas), itens escolhidos ou o restante.
  // Quando a conta fica quitada, a venda é finalizada.
  function receberParcial(vendaId, {valor, itemIds = [], parte = '', pagamentos = [], clienteId = null}){
    exigir('vendas');
    const v = vendaEditavel(vendaPorId(vendaId));
    const cx = caixaExigido();
    if (cx.id !== v.caixaId) erro('O caixa deste pedido não está mais aberto.');
    if (!v.itens.length) erro('O pedido não tem itens.');
    if (v.tipo === 'ENCOMENDA') erro('Encomenda é recebida na entrega ou na retirada.');
    const t = totaisVenda(v);
    if (itemIds.some(id => { const i = v.itens.find(x => x.id === id); return !i || i.pago; })) erro('Algum item escolhido já foi pago ou não existe mais.');
    const alvo = itemIds.length ? valorDosItens(v, itemIds) : r2(lerValor(valor));
    if (!(alvo > 0)) erro('Informe o valor a receber.');
    if (alvo > t.restante + 0.001) erro(`O valor passa do que falta pagar (${moedaBR(t.restante)}).`);
    if (clienteId && !clientePorId(clienteId)) erro('Cliente não encontrado.');
    const novos = [];
    let falta = alvo;
    pagamentos.forEach(p => { const pg = montarPagamento(falta, p.formaId, p.valor); falta = r2(falta - pg.valor); novos.push(pg); });
    if (falta > 0.001) erro(`Falta receber ${moedaBR(falta)} desta parte.`);
    if (novos.some(p => p.tipo === 'PRAZO') && !(clienteId || v.clienteId)) erro('Pagamento a prazo precisa de um cliente.');
    if (clienteId) v.clienteId = clienteId;
    novos.forEach(p => { p.parte = txt(parte); p.itemIds = itemIds.slice(); p.recebidoPor = usuario(); v.pagamentos.push(p); });
    v.itens.filter(i => itemIds.includes(i.id)).forEach(i => { i.pago = true; });
    const quitou = totaisVenda(v).restante <= 0.001;
    auditar(`${nomeVenda(v)}: recebido ${moedaBR(alvo)}${parte ? ` (${txt(parte)})` : ''}`, {detalhe: novos.map(p => `${p.nome} ${moedaBR(p.valor)}`).join(' + ')});
    if (quitou && !ehDelivery(v)) concluir(v);
    salvar('restVendas', 'restContas', 'restProdutos', 'restMovEstoque');
    return {venda: v, finalizada: quitou && !ehDelivery(v), troco: r2(novos.reduce((s, p) => s + (p.troco || 0), 0))};
  }
  // Desfaz um recebimento parcial de um pedido ainda aberto (o dinheiro volta ao cliente)
  function removerPagamento(vendaId, pagamentoId){
    exigir('vendas');
    const v = vendaEditavel(vendaPorId(vendaId));
    const p = v.pagamentos.find(x => x.id === pagamentoId) || erro('Pagamento não encontrado.');
    v.pagamentos.splice(v.pagamentos.indexOf(p), 1);
    v.itens.filter(i => (p.itemIds || []).includes(i.id)).forEach(i => { i.pago = false; });
    auditar(`${nomeVenda(v)}: recebimento de ${moedaBR(p.valor)} (${p.nome}) desfeito`);
    salvar('restVendas');
  }
  function adicionarPagamento(vendaId, {formaId, valor}){
    exigir('vendas');
    const v = vendaEditavel(vendaPorId(vendaId));
    if (caixaExigido().id !== v.caixaId) erro('O caixa desta venda não está mais aberto.');
    if (v.tipo === 'ENCOMENDA') erro('Encomenda é recebida na entrega ou na retirada.');
    const pag = montarPagamento(totaisVenda(v).restante, formaId, valor);
    if (pag.tipo === 'PRAZO' && !v.clienteId) erro('Venda a prazo precisa de um cliente.');
    v.pagamentos.push(pag);
    salvar('restVendas');
    return pag;
  }
  function finalizarVenda(vendaId){
    exigir('vendas');
    const v = vendaEditavel(vendaPorId(vendaId));
    const cx = caixaAberto();
    if (!cx || cx.id !== v.caixaId) erro('O caixa desta venda não está mais aberto.');
    concluir(v);
    salvar('restVendas', 'restContas', 'restProdutos', 'restMovEstoque');
    return v;
  }
  // Cancelar devolve o que foi pago: cada pagamento à vista vira um estorno no caixa aberto
  function cancelarVenda(vendaId, motivo){
    const v = vendaPorId(vendaId);
    if (!v) erro('Venda não encontrada.');
    exigir(v.status === 'ABERTA' ? moduloDaVenda(v.tipo) : 'vendas');
    if (v.status === 'ABERTA' && v.tipo === 'MESA' && v.itens.some(i => i.impressoEm || (i.preparo && i.preparo.estado !== 'FILA')) && !podeAcessar('vendas'))
      erro('A mesa já tem pedido na cozinha: só o caixa ou o gerente cancela.');
    if (v.status === 'CANCELADA') erro(`A venda #${v.numero} já está cancelada.`);
    if (txt(motivo).length < 3) erro('Informe o motivo do cancelamento.');
    const eraAberta = v.status === 'ABERTA';
    if (eraAberta && v.pagamentos.some(p => !AJUSTES.includes(p.forma)))
      erro(`${nomeVenda(v)} já tem recebimentos. Desfaça os recebimentos antes de cancelar.`);
    const ligadas = contas.filter(c => c.vendaId === v.id);
    if (ligadas.some(c => c.status === 'PAGA')) erro(`A venda #${v.numero} já teve o valor a prazo recebido. Estorne o recebimento em Financeiro antes de cancelar.`);
    const devolver = v.status === 'FINALIZADA' ? v.pagamentos.filter(p => !AJUSTES.includes(p.forma) && tipoPagamento(p) !== 'PRAZO' && p.valor > 0) : [];
    const cx = devolver.length ? caixaAberto() : null;
    if (devolver.length && !cx) erro('Abra o caixa para cancelar: o valor pago será devolvido (estorno) pelo caixa aberto.');
    devolver.forEach(p => lancarMov(cx, 'ESTORNO', p.valor, tipoPagamento(p), `Cancelamento da venda #${v.numero}: ${txt(motivo)}`, {vendaId: v.id}));
    ligadas.forEach(c => contas.splice(contas.indexOf(c), 1));
    devolverEstoqueVenda(v, motivo);
    v.status = 'CANCELADA';
    v.canceladaEm = agora();
    v.canceladaPor = usuario();
    v.motivoCancelamento = txt(motivo);
    auditar(`${eraAberta ? nomeVenda(v) : `Venda #${v.numero}`} cancelada${devolver.length ? ` — estorno de ${moedaBR(devolver.reduce((s, p) => s + p.valor, 0))}` : ''}`, {detalhe: v.motivoCancelamento});
    salvar('restVendas', 'restContas', 'restMovCaixa', 'restProdutos', 'restMovEstoque');
    return v;
  }

  // =====================================================================
  // ---- Delivery e encomenda ----
  // Fluxo: pedido recebido → em preparação → pronto → saiu para entrega (entregador) → entregue
  // (recebe o pagamento e vira venda no caixa). "Vem buscar" pula o "saiu para entrega".
  // Encomenda é um pedido para data/hora marcada; é recebida na entrega ou retirada.
  const STATUS_DELIVERY = {RECEBIDO: 'Pedido recebido', PREPARANDO: 'Em preparação', PRONTO: 'Pronto', SAIU: 'Saiu para entrega', ENTREGUE: 'Entregue'};
  const ORDEM_STATUS = ['RECEBIDO', 'PREPARANDO', 'PRONTO', 'SAIU', 'ENTREGUE'];
  const MODOS_ENTREGA = {ENTREGAR: 'Entregar', RETIRAR: 'Vem buscar'};
  const ehDelivery = v => v && (v.tipo === 'DELIVERY' || v.tipo === 'ENCOMENDA');
  const pedidosDelivery = () => vendas.filter(v => ehDelivery(v) && v.status === 'ABERTA');
  const clientePorTelefone = tel => { const d = digitos(tel); return d.length >= 10 ? listaClientes().find(c => digitos(c.telefone) === d) || null : null; };
  const dataHoraValida = v => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(v || '')) && !isNaN(new Date(v));
  const marcarStatus = (v, status, extra = {}) => {
    v.statusDelivery = status;
    (v.historico ||= []).push({status, data: agora(), usuario: usuario(), ...extra});
  };

  // Tempo do pedido e faixa de cor: verde até X min, amarelo até Y, vermelho depois (Configurações)
  function tempoPedido(v, ref = Date.now()){
    const inicio = v.tipo === 'ENCOMENDA' && v.agendadoPara ? new Date(v.agendadoPara).getTime() : new Date(v.data).getTime();
    const fim = v.status === 'ABERTA' ? ref : new Date(v.finalizadaEm || v.canceladaEm || ref).getTime();
    const min = Math.floor((fim - inicio) / 60000);
    if (v.tipo === 'ENCOMENDA' && min < 0) return {min, faixa: 'agendado'};
    return {min: Math.max(min, 0), faixa: min < config.entregaVerde ? 'verde' : min < config.entregaAmarelo ? 'amarelo' : 'vermelho'};
  }

  // Cria o pedido de delivery/encomenda de uma vez (itens + dados de entrega). Fica aberto até a entrega.
  function registrarDelivery(d = {}){
    exigir('delivery');
    const cx = caixaExigido();
    const tipo = d.tipo === 'ENCOMENDA' ? 'ENCOMENDA' : 'DELIVERY';
    const modo = MODOS_ENTREGA[d.modo] ? d.modo : 'ENTREGAR';
    if (!(d.itens || []).length) erro('Adicione ao menos um produto.');
    const linhas = d.itens.map(i => itemDaVenda(i.produtoId, i.quantidade, i.observacao, opcoesDe(i)));
    const c = d.cliente || {};
    const ent = {nome: txt(c.nome), telefone: txt(c.telefone), cep: txt(c.cep), endereco: txt(c.endereco), numero: txt(c.numero),
      complemento: txt(c.complemento), bairro: txt(c.bairro), cidade: txt(c.cidade), referencia: txt(c.referencia)};
    if (!ent.nome) erro('Informe o nome do cliente.');
    if (digitos(ent.telefone).length < 10) erro('Informe o telefone do cliente (DDD + número).');
    if (modo === 'ENTREGAR') {
      if (!ent.endereco) erro('Informe o endereço de entrega.');
      if (!ent.numero) erro('Informe o número do endereço (ou "s/n").');
      if (!ent.bairro) erro('Informe o bairro.');
    }
    if (ent.cep && digitos(ent.cep).length !== 8) erro('CEP deve ter 8 números.');
    let agendadoPara = null;
    if (tipo === 'ENCOMENDA') {
      if (!dataHoraValida(d.agendadoPara)) erro('Informe a data e a hora da encomenda.');
      agendadoPara = new Date(d.agendadoPara).toISOString();
      if (new Date(agendadoPara) < Date.now() - 60000) erro('A data da encomenda já passou.');
    }
    const taxa = txt(d.taxaEntrega) === '' ? 0 : r2(lerValor(d.taxaEntrega));
    if (!Number.isFinite(taxa) || taxa < 0) erro('Taxa de entrega inválida.');
    const forma = d.formaPrevistaId ? formaPorId(d.formaPrevistaId) : null;
    if (d.formaPrevistaId && (!forma || !forma.ativo)) erro('Forma de pagamento inválida.');
    const app = d.aplicativoId ? aplicativoPorId(d.aplicativoId) : null;
    if (d.aplicativoId && (!app || !app.ativo)) erro('Aplicativo inválido.');
    const base = r2(linhas.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
    const acr = valorAjuste(d.acrescimo, base), desc = valorAjuste(d.desconto, base);
    if (desc > base + acr + 0.001) erro('O desconto não pode passar do total do pedido.');
    const v = {id: novoId('v'), numero: seq.venda + 1, caixaId: cx.id, tipo, status: 'ABERTA', clienteId: null, mesaId: null, mesa: '', pessoas: 1,
      entregadorId: null, obs: txt(d.obs), operadorId: sessaoAtual()?.id || null, operador: usuario(), data: agora(), finalizadaEm: null,
      canceladaEm: null, motivoCancelamento: '', desconto: desc, acrescimo: acr, itens: linhas, pagamentos: [],
      entrega: ent, modo, agendadoPara, taxaEntrega: modo === 'ENTREGAR' ? taxa : 0, taxaEmbalagem: taxaEmbalagemDe(linhas), formaPrevistaId: forma?.id || null,
      aplicativo: app ? {id: app.id, nome: app.nome, comissao: app.comissao} : null,
      levarMaquina: !!d.levarMaquina && ['DEBITO', 'CREDITO'].includes(forma?.tipo), trocoPara: null, statusDelivery: 'RECEBIDO', historico: []};
    const total = totaisVenda(v).total;
    if (!(total > 0)) erro('O total do pedido precisa ser maior que R$ 0,00.');
    if (txt(d.trocoPara) !== '') {
      const troco = r2(lerValor(d.trocoPara));
      if (forma && forma.tipo !== 'DINHEIRO') erro('"Troco para" só vale para pagamento em dinheiro.');
      if (!(troco >= total)) erro(`"Troco para" precisa ser maior ou igual ao total (${moedaBR(total)}).`);
      v.trocoPara = troco;
    }
    // Cliente: acha pelo telefone; com salvarCliente, cria ou atualiza o cadastro com o endereço
    let cli = clientePorTelefone(ent.telefone);
    if (d.salvarCliente !== false) {
      const dados = {...(cli || {}), ...Object.fromEntries(Object.entries(ent).filter(([, x]) => x))};
      cli = salvarClienteRest(dados, cli?.id || null);
    }
    v.clienteId = cli?.id || null;
    if (modo === 'ENTREGAR') v.entrega.regiao = regiaoDoBairro(ent.bairro, ent.cidade)?.nome || '';
    marcarStatus(v, 'RECEBIDO');
    seq.venda++;
    vendas.push(v);
    auditar(`${TIPOS_VENDA[tipo]} #${v.numero} recebido — ${ent.nome} · ${moedaBR(total)}`,
      {detalhe: [MODOS_ENTREGA[modo], agendadoPara && `para ${dataBR(diaISO(new Date(agendadoPara)))} ${new Date(agendadoPara).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`, forma?.nome].filter(Boolean).join(' · ')});
    salvar('restVendas', 'restSeq', 'clientes');
    return v;
  }
  const pedidoAberto = id => { const v = vendaPorId(id); if (!ehDelivery(v)) erro('Pedido não encontrado.'); return vendaEditavel(v); };
  // Avança ou volta o status (até "saiu para entrega"; a entrega é feita por entregarPedido)
  function alterarStatusDelivery(id, status){
    exigir('delivery');
    const v = pedidoAberto(id);
    if (!STATUS_DELIVERY[status] || status === 'ENTREGUE') erro('Status inválido. Para concluir, use "Entregue".');
    if (status === 'SAIU') {
      if (v.modo !== 'ENTREGAR') erro('Pedido para retirada não sai para entrega.');
      if (!v.entregadorId) erro('Escolha o entregador (Enviar para entrega).');
    }
    if (status === v.statusDelivery) return v;
    const antes = v.statusDelivery;
    marcarStatus(v, status);
    if (status !== 'SAIU' && antes === 'SAIU') v.entregadorId = null; // voltou da rua
    auditar(`${TIPOS_VENDA[v.tipo]} #${v.numero}: ${STATUS_DELIVERY[antes]} → ${STATUS_DELIVERY[status]}`);
    salvar('restVendas');
    return v;
  }
  // Envia vários pedidos de uma vez com o mesmo entregador
  function enviarEntregador(entregadorId, ids = []){
    exigir('delivery');
    const e = entregadorPorId(entregadorId);
    if (!e || !e.ativo) erro('Escolha um entregador ativo.');
    if (!ids.length) erro('Marque ao menos um pedido.');
    const lista = ids.map(pedidoAberto);
    const ruim = lista.find(v => v.modo !== 'ENTREGAR');
    if (ruim) erro(`O pedido #${ruim.numero} é para retirada.`);
    const naRua = lista.find(v => v.statusDelivery === 'SAIU');
    if (naRua) erro(`O pedido #${naRua.numero} já saiu para entrega.`);
    lista.forEach(v => { v.entregadorId = e.id; marcarStatus(v, 'SAIU', {entregador: e.nome}); });
    auditar(`${lista.length} pedido${lista.length === 1 ? '' : 's'} enviado${lista.length === 1 ? '' : 's'} com ${e.nome}`, {detalhe: lista.map(v => '#' + v.numero).join(', ')});
    salvar('restVendas');
    return lista;
  }
  // Entregue (ou retirado): recebe o que falta e vira venda finalizada no caixa aberto
  function entregarPedido(id, {pagamentos = [], clienteId = null} = {}){
    exigir('vendas');
    const v = pedidoAberto(id);
    const cx = caixaExigido();
    if (v.modo === 'ENTREGAR' && v.statusDelivery !== 'SAIU') erro('O pedido ainda não saiu para entrega.');
    if (v.tipo === 'DELIVERY' && cx.id !== v.caixaId) erro('O caixa deste pedido não está mais aberto.');
    let falta = totaisVenda(v).restante;
    const novos = [];
    pagamentos.forEach(p => { const pg = montarPagamento(falta, p.formaId, p.valor); falta = r2(falta - pg.valor); novos.push(pg); });
    if (falta > 0.001) erro(`Falta receber ${moedaBR(falta)}.`);
    if (clienteId && !clientePorId(clienteId)) erro('Cliente não encontrado.');
    if (novos.some(p => p.tipo === 'PRAZO') && !(clienteId || v.clienteId)) erro('Pagamento a prazo precisa de um cliente.');
    const clienteAntes = v.clienteId;
    if (clienteId) v.clienteId = clienteId;
    // Encomenda pode ter sido feita em outro caixa: a venda entra no caixa de agora
    const caixaAntes = v.caixaId;
    if (v.tipo === 'ENCOMENDA') v.caixaId = cx.id;
    novos.forEach(p => { p.recebidoPor = usuario(); v.pagamentos.push(p); });
    const status = v.statusDelivery;
    marcarStatus(v, 'ENTREGUE');
    try { concluir(v); } catch (e) { v.pagamentos.splice(v.pagamentos.length - novos.length); v.historico.pop(); v.statusDelivery = status; v.caixaId = caixaAntes; v.clienteId = clienteAntes; throw e; }
    salvar('restVendas', 'restContas', 'restProdutos', 'restMovEstoque');
    return {venda: v, troco: r2(novos.reduce((s, p) => s + (p.troco || 0), 0))};
  }

  // =====================================================================
  // ---- Mesas (cadastro) e configuração do restaurante ----
  const mesaPorId = id => mesas.find(m => m.id === id);
  const vendaDaMesa = mesaId => vendas.find(v => v.tipo === 'MESA' && v.status === 'ABERTA' && v.mesaId === mesaId) || null;
  const mesasOrdenadas = () => mesas.slice().sort((a, b) => a.numero.localeCompare(b.numero, 'pt-BR', {numeric: true}));
  function salvarMesa(d, id){
    const m = {numero: txt(d.numero).toUpperCase(), descricao: txt(d.descricao), lugares: Math.round(Number(d.lugares) || 0), ativo: d.ativo !== false};
    if (!m.numero) erro('Informe o número ou nome da mesa.');
    if (m.numero.length > 12) erro('Número da mesa: até 12 caracteres.');
    if (/^\d$/.test(m.numero)) m.numero = '0' + m.numero; // "5" vira "05" (ordena e aparece igual às outras)
    if (m.lugares < 0 || m.lugares > 99) erro('Lugares inválido.');
    const igual = mesas.find(x => x.id !== id && x.numero === m.numero);
    if (igual) erro(`Já existe a mesa ${m.numero}.`);
    const existente = id && mesaPorId(id);
    if (existente) {
      const aberta = vendaDaMesa(id);
      if (aberta && !m.ativo) erro(`A mesa ${existente.numero} está com pedido aberto. Feche a conta antes de desativar.`);
      if (aberta && m.numero !== existente.numero) aberta.mesa = m.numero;
      Object.assign(existente, m);
      auditar(`Mesa ${m.numero} editada`);
      salvar('restMesas', 'restVendas');
      return existente;
    }
    const nova = {id: novoId('ms'), ...m};
    mesas.push(nova);
    auditar(`Mesa ${m.numero} cadastrada`);
    salvar('restMesas');
    return nova;
  }
  function excluirMesa(id){
    const m = mesaPorId(id);
    if (!m) return;
    if (vendaDaMesa(id)) erro(`A mesa ${m.numero} está com pedido aberto.`);
    mesas.splice(mesas.indexOf(m), 1);
    auditar(`Mesa ${m.numero} excluída`);
    salvar('restMesas');
  }
  // ---- Cardápio digital ----
  // Produto aparece no cardápio se for de venda, ativo e não estiver marcado "fora do cardápio" (cardapio === false).
  // A ordem dentro da categoria fica em ordemCardapio; a das categorias, em ordem.
  const noCardapio = p => !!p && p.ativo && (p.tipo || 'VENDA') !== 'INSUMO' && p.cardapio !== false;
  function configurarCardapio({ativo, mensagem}){
    exigir('cadastros');
    const antes = config.cardapio || {};
    const novo = {...antes, ativo: !!ativo, mensagem: txt(mensagem).slice(0, 200)};
    config = {...config, cardapio: novo};
    if (!!antes.ativo !== novo.ativo) auditar(`Cardápio digital ${novo.ativo ? 'aberto para pedidos' : 'fechado para pedidos'}`);
    salvar('restConfig');
    return novo;
  }
  function mostrarNoCardapio(produtoId, mostrar){
    exigir('cadastros');
    const p = produtoPorId(produtoId) || erro('Produto não encontrado.');
    if (mostrar && (p.tipo || 'VENDA') === 'INSUMO') erro('Insumo não aparece no cardápio.');
    p.cardapio = !!mostrar;
    auditar(`"${p.nome}" ${mostrar ? 'aparece no' : 'saiu do'} cardápio digital`);
    salvar('restProdutos');
    return p;
  }
  // Nova ordem dos produtos de uma categoria (lista de ids na ordem desejada)
  function ordenarCardapio(ids){
    exigir('cadastros');
    ids.forEach((id, k) => { const p = produtoPorId(id); if (p) p.ordemCardapio = k + 1; });
    salvar('restProdutos');
  }
  function ordenarCategorias(ids){
    exigir('cadastros');
    ids.forEach((id, k) => { const g = grupoPorId(id); if (g) g.ordem = k + 1; });
    salvar('restGrupos');
  }
  // Alteração rápida pela tela do cardápio: nome, descrição, preço e foto (o resto do cadastro fica igual)
  function editarNoCardapio(id, {nome, descricao, preco, foto}){
    const p = produtoPorId(id) || erro('Produto não encontrado.');
    return salvarProduto({...p, nome, descricao, preco, foto: foto ?? p.foto, estoque: txt(p.estoque), estoqueAberto: txt(p.estoque)}, id);
  }
  // Lança um pedido do cardápio na conta da mesa (abre a mesa se precisar). Se algum item falhar, desfaz os já lançados.
  function lancarPedidoCardapio(pedido){
    exigir('mesas');
    const m = mesaPorId(pedido.mesaId);
    if (!m || !m.ativo) erro(`Mesa ${pedido.mesaNumero} não encontrada no cadastro.`);
    const aberta = vendaDaMesa(m.id);
    // Já lançado (ex.: a confirmação no banco falhou e alguém tentou de novo): não lança em dobro
    if (aberta && aberta.itens.some(i => i.cardapio === pedido.numero)) return aberta;
    const v = aberta || novaVenda({tipo: 'MESA', mesaId: m.id});
    const lancados = [];
    try {
      (pedido.itens || []).forEach((it, k) => {
        const obs = [txt(it.observacao), k === 0 && txt(pedido.obs) ? `Pedido: ${txt(pedido.obs)}` : ''].filter(Boolean).join(' · ');
        const item = adicionarItem(v.id, it.produtoId, {quantidade: it.quantidade, observacao: obs.slice(0, 100), tamanhoId: it.tamanhoId || null,
          adicionais: (it.adicionais || []).map(a => a.id)});
        item.cardapio = pedido.numero;
        // Preço: o que o cliente viu no cardápio, a não ser que o do sistema esteja menor (promoção)
        const visto = Number(it.preco);
        if (visto > 0 && item.precoUnitario > visto) item.precoUnitario = r2(visto);
        lancados.push(item.id);
      });
    } catch (e) {
      lancados.forEach(id => { try { removerItem(v.id, id, 'Pedido do cardápio não lançado'); } catch (x) { /* item já saiu */ } });
      if (!aberta) try { cancelarVenda(v.id, 'Pedido do cardápio não lançado'); } catch (x) { /* fica aberta, sem itens */ }
      throw e;
    }
    auditar(`Pedido #${pedido.numero} do cardápio lançado na mesa ${m.numero}`, {detalhe: (pedido.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(', ')});
    salvar('restVendas');
    return v;
  }
  function salvarConfig(d){
    exigir('configuracoes');
    const taxa = d.taxaServico === '' || d.taxaServico == null ? 0 : lerValor(d.taxaServico);
    if (!Number.isFinite(taxa) || taxa < 0 || taxa > 30) erro('Taxa de serviço: de 0% a 30%.');
    const num = (v, padrao) => txt(v) === '' || v == null ? padrao : lerValor(v);
    const taxaEntrega = r2(num(d.taxaEntrega, config.taxaEntrega));
    const verde = Math.round(num(d.entregaVerde, config.entregaVerde)), amarelo = Math.round(num(d.entregaAmarelo, config.entregaAmarelo));
    if (!Number.isFinite(taxaEntrega) || taxaEntrega < 0) erro('Taxa de entrega inválida.');
    if (!(verde >= 1) || !(amarelo > verde) || amarelo > 600) erro('Tempos do delivery: o limite do amarelo precisa ser maior que o do verde.');
    const novo = {...config, nome: txt(d.nome) || config.nome, taxaServico: r2(taxa), servicoPadrao: !!d.servicoPadrao, taxaEntrega, entregaVerde: verde, entregaAmarelo: amarelo};
    const alteracoes = [['nome', 'Nome do restaurante'], ['taxaServico', 'Taxa de serviço (%)'], ['servicoPadrao', 'Taxa ligada nas mesas'],
      ['taxaEntrega', 'Taxa de entrega padrão'], ['entregaVerde', 'Delivery verde até (min)'], ['entregaAmarelo', 'Delivery amarelo até (min)']]
      .filter(([k]) => config[k] !== novo[k]).map(([k, campo]) => ({campo, antes: String(config[k]), depois: String(novo[k])}));
    config = novo;
    if (alteracoes.length) registrarAuditoria('Configurações', 'Configuração do restaurante alterada', {alteracoes});
    salvar('restConfig');
    return config;
  }
  // Empresa: dados que saem no topo dos cupons, do fechamento de caixa e dos relatórios
  const CAMPOS_EMPRESA = {razaoSocial: 'Razão social', cnpj: 'CNPJ', ie: 'Inscrição estadual', telefone: 'Telefone', email: 'E-mail', cep: 'CEP',
    endereco: 'Endereço', numero: 'Número', bairro: 'Bairro', cidade: 'Cidade', uf: 'UF'};
  function salvarEmpresa(d){
    exigir('configuracoes');
    const e = {};
    Object.keys(CAMPOS_EMPRESA).forEach(k => { e[k] = txt(d[k]); });
    e.uf = e.uf.toUpperCase();
    const nome = txt(d.nome) || config.nome;
    if (e.cnpj && !cnpjValido(e.cnpj)) erro('CNPJ inválido. Confira os números.');
    if (e.telefone && digitos(e.telefone).length < 10) erro('Telefone incompleto (use DDD + número).');
    if (e.email && !emailValido(e.email)) erro('E-mail inválido.');
    if (e.cep && digitos(e.cep).length !== 8) erro('CEP deve ter 8 números.');
    if (e.uf && !UFS.includes(e.uf)) erro('UF inválida.');
    const alteracoes = Object.keys(CAMPOS_EMPRESA).filter(k => config.empresa[k] !== e[k]).map(k => ({campo: CAMPOS_EMPRESA[k], antes: config.empresa[k] || '—', depois: e[k] || '—'}));
    if (nome !== config.nome) alteracoes.unshift({campo: 'Nome fantasia', antes: config.nome, depois: nome});
    config = {...config, nome, empresa: e};
    if (alteracoes.length) registrarAuditoria('Configurações', 'Dados da empresa alterados', {alteracoes});
    salvar('restConfig');
    return config;
  }
  // Nome no menu lateral, no login e na aba do navegador: o da empresa, ou MGA até ser informado
  const nomeMarca = () => txt(config.nome) && config.nome !== NOME_PADRAO ? config.nome : 'MGA';
  // Linhas do cabeçalho das impressões: nome, razão social e CNPJ, endereço, telefone
  function cabecalhoEmpresa(){
    const e = config.empresa;
    const end = [[e.endereco, e.numero].filter(Boolean).join(', '), e.bairro, [e.cidade, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ');
    return [config.nome, [e.razaoSocial && e.razaoSocial !== config.nome && e.razaoSocial, e.cnpj && `CNPJ ${e.cnpj}`, e.ie && `IE ${e.ie}`].filter(Boolean).join(' · '),
      end, [e.telefone && `Tel. ${e.telefone}`, e.email].filter(Boolean).join(' · ')].filter(Boolean);
  }
  function salvarImpressao(d){
    exigir('configuracoes');
    const vias = Math.round(Number(d.viasComanda));
    const novo = {largura: ['58', '80'].includes(String(d.largura)) ? String(d.largura) : '80', cupomModo: MODOS_CUPOM[d.cupomModo] ? d.cupomModo : 'NAO', comandaAuto: !!d.comandaAuto,
      viasComanda: vias >= 1 && vias <= 3 ? vias : 1, rodape: txt(d.rodape).slice(0, 120)};
    const rot = {largura: 'Largura do papel (mm)', cupomModo: 'Cupom da venda', comandaAuto: 'Comanda automática', viasComanda: 'Vias da comanda', rodape: 'Rodapé'};
    const alteracoes = Object.keys(rot).filter(k => config.impressao[k] !== novo[k]).map(k => ({campo: rot[k], antes: String(config.impressao[k]), depois: String(novo[k])}));
    config = {...config, impressao: novo};
    if (alteracoes.length) registrarAuditoria('Configurações', 'Configuração de impressão alterada', {alteracoes});
    salvar('restConfig');
    return novo;
  }
  // Comanda da cozinha: marca os itens já enviados (a mesa imprime só os novos)
  function marcarImpresso(vendaId, itemIds){
    const v = vendaPorId(vendaId);
    if (!v) return;
    const quando = agora();
    v.itens.filter(i => itemIds.includes(i.id)).forEach(i => { i.impressoEm = quando; });
    salvar('restVendas');
  }

  // =====================================================================
  // ---- Financeiro: contas a pagar e a receber ----
  const contaPorId = id => contas.find(c => c.id === id);
  const dataValida = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T12:00:00')) && diaISO(new Date(d + 'T12:00:00')) === d;
  function salvarConta(dados, id){
    const tipo = dados.tipo;
    if (!TIPOS_CONTA[tipo]) erro('Tipo de conta inválido.');
    const c = {descricao: txt(dados.descricao), categoria: txt(dados.categoria), valor: r2(lerValor(dados.valor)), vencimento: txt(dados.vencimento),
      clienteId: tipo === 'RECEBER' ? (dados.clienteId || null) : null, fornecedorId: tipo === 'PAGAR' ? (dados.fornecedorId || null) : null, obs: txt(dados.obs)};
    if (!c.descricao) erro('Informe a descrição da conta.');
    if (!categorias[tipo].includes(c.categoria)) erro('Escolha a categoria.');
    if (!(c.valor > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (!dataValida(c.vencimento)) erro('Informe a data de vencimento.');
    if (c.clienteId && !clientePorId(c.clienteId)) erro('Cliente não encontrado.');
    if (c.fornecedorId && !fornecedorPorId(c.fornecedorId)) erro('Fornecedor não encontrado.');
    const existente = id && contaPorId(id);
    if (existente) {
      if (existente.vendaId) erro('Esta conta veio de uma venda a prazo e não pode ser editada. Cancele a venda, se for o caso.');
      if (existente.status === 'PAGA') erro('Conta já baixada. Estorne a baixa para editar.');
      const rot = {descricao: 'Descrição', categoria: 'Categoria', valor: 'Valor', vencimento: 'Vencimento', fornecedorId: 'Fornecedor', obs: 'Observação'};
      const fmt = {fornecedorId: v => fornecedorPorId(v)?.nome || '—'};
      const alteracoes = Object.keys(rot).filter(k => (existente[k] ?? null) !== (c[k] ?? null))
        .map(k => ({campo: rot[k], antes: (fmt[k] || String)(existente[k] || '—'), depois: (fmt[k] || String)(c[k] || '—')}));
      Object.assign(existente, c);
      if (alteracoes.length) auditar(`Conta ${TIPOS_CONTA[tipo].toLowerCase()} "${c.descricao}" editada`, {alteracoes});
      salvar('restContas');
      return existente;
    }
    // Repetir: "mensal" lança a mesma conta N meses seguidos (aluguel, internet...);
    // "parcelas" divide o valor em N vezes mensais (compra parcelada). Os centavos que sobram vão na última.
    const vezes = Math.round(Number(dados.repetir) || 1);
    if (!(vezes >= 1 && vezes <= 60)) erro('Repetir: de 1 a 60 vezes.');
    const parcelado = vezes > 1 && dados.modoRepetir === 'parcelas';
    const parcela = parcelado ? Math.floor(c.valor / vezes * 100) / 100 : c.valor;
    if (parcelado && !(parcela > 0)) erro('Valor pequeno demais para tantas parcelas.');
    const grupo = vezes > 1 ? novoId('gr') : null;
    const criadas = Array.from({length: vezes}, (_, k) => {
      const nova = {id: novoId('ct'), tipo, ...c, descricao: vezes > 1 ? `${c.descricao} (${k + 1}/${vezes})` : c.descricao,
        valor: parcelado ? (k === vezes - 1 ? r2(c.valor - parcela * (vezes - 1)) : parcela) : c.valor, vencimento: somarMeses(c.vencimento, k),
        status: 'ABERTA', pagoEm: null, forma: '', vendaId: null, criadoEm: agora(), ...(grupo ? {grupo, parcela: k + 1, parcelas: vezes} : {})};
      contas.push(nova);
      return nova;
    });
    auditar(vezes > 1
      ? `Conta ${TIPOS_CONTA[tipo].toLowerCase()} "${c.descricao}" lançada em ${vezes} ${parcelado ? 'parcelas' : 'meses'} — ${parcelado ? `total ${moedaBR(c.valor)}` : `${moedaBR(c.valor)} por mês`}, de ${dataBR(criadas[0].vencimento)} a ${dataBR(criadas[vezes - 1].vencimento)}`
      : `Conta ${TIPOS_CONTA[tipo].toLowerCase()} "${c.descricao}" lançada — ${moedaBR(c.valor)} vence ${dataBR(c.vencimento)}`);
    salvar('restContas');
    return Object.assign(criadas[0], {criadas: criadas.length});
  }
  function excluirConta(id){
    const c = contaPorId(id);
    if (!c) return;
    if (c.vendaId) erro('Esta conta veio de uma venda a prazo. Para tirá-la, cancele a venda.');
    if (c.status === 'PAGA') erro('Conta já baixada. Estorne a baixa antes de excluir.');
    contas.splice(contas.indexOf(c), 1);
    auditar(`Conta ${TIPOS_CONTA[c.tipo].toLowerCase()} "${c.descricao}" excluída`, {detalhe: moedaBR(c.valor)});
    salvar('restContas');
  }
  // Baixa = conta paga (a pagar) ou recebida (a receber)
  // Forma da baixa → tipo usado no caixa (boleto e transferência entram como "outros")
  const TIPO_DA_BAIXA = {'Dinheiro': 'DINHEIRO', 'PIX': 'PIX', 'Cartão de Débito': 'DEBITO', 'Cartão de Crédito': 'CREDITO'};
  // Com noCaixa, a baixa vira recebimento/pagamento no caixa aberto (entra no saldo e no fechamento)
  function baixarConta(id, {data, forma, noCaixa = false, contaBancariaId = null}){
    const c = contaPorId(id);
    if (!c) erro('Conta não encontrada.');
    if (c.status === 'PAGA') erro('Esta conta já foi baixada.');
    if (!dataValida(data)) erro('Informe a data do pagamento.');
    if (data > hojeISO()) erro('A data do pagamento não pode ser no futuro.');
    if (!FORMAS_BAIXA.includes(forma)) erro('Escolha a forma de pagamento.');
    if (noCaixa && contaBancariaId) erro('Escolha o caixa aberto ou uma conta bancária, não os dois.');
    if (contaBancariaId && !contaBancariaPorId(contaBancariaId)?.ativo) erro('Escolha uma conta bancária ativa.');
    let mov = null;
    if (noCaixa) {
      const cx = caixaExigido();
      const tipoForma = TIPO_DA_BAIXA[forma] || 'OUTROS';
      if (c.tipo === 'PAGAR' && tipoForma === 'DINHEIRO' && c.valor > resumoCaixa(cx.id).saldoDinheiro + 0.001)
        erro(`Não há dinheiro suficiente no caixa (${moedaBR(resumoCaixa(cx.id).saldoDinheiro)}) para pagar ${moedaBR(c.valor)}.`);
      mov = lancarMov(cx, c.tipo === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO', c.valor, tipoForma, c.descricao, {contaId: c.id});
    }
    const mc = contaBancariaId ? lancarConta(contaBancariaId, c.tipo === 'PAGAR' ? 'SAIDA' : 'ENTRADA', c.valor, c.descricao, {data, contaFinanceiraId: c.id, origem: 'BAIXA'}) : null;
    Object.assign(c, {status: 'PAGA', pagoEm: data, forma, movCaixaId: mov?.id || null, movContaId: mc?.id || null});
    auditar(`Conta "${c.descricao}" ${c.tipo === 'PAGAR' ? 'paga' : 'recebida'} — ${moedaBR(c.valor)} (${forma})${mov ? ' pelo caixa' : mc ? ` na conta ${contaBancariaPorId(contaBancariaId).nome}` : ''}`);
    salvar('restContas', 'restMovCaixa', 'restMovConta');
    return c;
  }
  function estornarBaixa(id){
    const c = contaPorId(id);
    if (!c || c.status !== 'PAGA') erro('Esta conta não está baixada.');
    // Baixa feita pelo caixa: o movimento sai junto, desde que aquele caixa ainda esteja aberto
    const mov = c.movCaixaId && movCaixa.find(m => m.id === c.movCaixaId);
    if (mov) {
      if (caixaPorId(mov.caixaId)?.status !== 'ABERTO') erro('Esta baixa entrou num caixa já fechado e não pode ser estornada.');
      movCaixa.splice(movCaixa.indexOf(mov), 1);
    }
    const mc = c.movContaId && movConta.find(m => m.id === c.movContaId);
    if (mc) movConta.splice(movConta.indexOf(mc), 1);
    Object.assign(c, {status: 'ABERTA', pagoEm: null, forma: '', movCaixaId: null, movContaId: null});
    auditar(`Baixa da conta "${c.descricao}" estornada`);
    salvar('restContas', 'restMovCaixa', 'restMovConta');
    return c;
  }
  const contaVencida = c => c.status === 'ABERTA' && c.vencimento < hojeISO();
  // Mesmo dia nos meses seguintes (dia 31 vira o último dia do mês quando ele não existe)
  function somarMeses(iso, n){
    const [a, m, d] = iso.split('-').map(Number);
    const ultimo = new Date(a, m - 1 + n + 1, 0).getDate();
    return diaISO(new Date(a, m - 1 + n, Math.min(d, ultimo)));
  }
  // Fluxo de caixa previsto: saldo de hoje (contas bancárias + dinheiro no caixa aberto) mais o que vai
  // entrar (contas a receber) e sair (contas a pagar) dia a dia. Vencidas contam no primeiro dia.
  function fluxoCaixa({dias = 30} = {}){
    const hoje = hojeISO(), fim = diaISO(new Date(new Date(hoje + 'T12:00:00').getTime() + (dias - 1) * 86400000));
    const bancos = contasBancarias.filter(c => c.ativo).map(c => ({nome: c.nome, saldo: saldoConta(c.id)}));
    const cx = caixaAberto();
    const dinheiroCaixa = cx ? resumoCaixa(cx.id).saldoDinheiro : 0;
    const saldoHoje = r2(bancos.reduce((s, b) => s + b.saldo, 0) + dinheiroCaixa);
    const abertas = contas.filter(c => c.status === 'ABERTA');
    const atrasadas = abertas.filter(c => c.vencimento < hoje);
    const soma = (l, t) => r2(l.filter(c => c.tipo === t).reduce((s, c) => s + c.valor, 0));
    let saldo = saldoHoje;
    const lista = [];
    for (let k = 0; k < dias; k++) {
      const dia = diaISO(new Date(new Date(hoje + 'T12:00:00').getTime() + k * 86400000));
      const doDia = abertas.filter(c => c.vencimento === dia || (k === 0 && c.vencimento < hoje));
      const entradas = soma(doDia, 'RECEBER'), saidas = soma(doDia, 'PAGAR');
      saldo = r2(saldo + entradas - saidas);
      lista.push({dia, entradas, saidas, saldo, contas: doDia.slice().sort((a, b) => a.tipo.localeCompare(b.tipo) || b.valor - a.valor)});
    }
    const menor = lista.reduce((m, d) => d.saldo < m.saldo ? d : m, lista[0]);
    return {de: hoje, ate: fim, bancos, dinheiroCaixa, temCaixa: !!cx, saldoHoje, dias: lista,
      atrasadas: {receber: soma(atrasadas, 'RECEBER'), pagar: soma(atrasadas, 'PAGAR'), n: atrasadas.length},
      entradas: r2(lista.reduce((s, d) => s + d.entradas, 0)), saidas: r2(lista.reduce((s, d) => s + d.saidas, 0)),
      saldoFinal: lista.length ? lista[lista.length - 1].saldo : saldoHoje, menor, primeiroNegativo: lista.find(d => d.saldo < 0) || null};
  }
  function salvarCategoria(tipo, nome, antigo){
    nome = txt(nome);
    if (!TIPOS_CONTA[tipo]) erro('Tipo inválido.');
    if (!nome) erro('Informe o nome da categoria.');
    const lista = categorias[tipo];
    if (lista.some(x => x !== antigo && norm(x) === norm(nome))) erro(`Já existe a categoria "${nome}".`);
    if (antigo) {
      if (antigo === CATEGORIA_PRAZO) erro(`"${CATEGORIA_PRAZO}" é usada pelas vendas e não pode ser renomeada.`);
      if (tipo === 'PAGAR' && antigo === CATEGORIA_COMPRAS) erro(`"${CATEGORIA_COMPRAS}" é usada nas compras de mercadoria e no relatório financeiro e não pode ser renomeada.`);
      lista[lista.indexOf(antigo)] = nome;
      contas.filter(c => c.tipo === tipo && c.categoria === antigo).forEach(c => { c.categoria = nome; });
      auditar(`Categoria "${antigo}" renomeada para "${nome}"`);
    } else {
      lista.push(nome);
      auditar(`Categoria "${nome}" criada (${TIPOS_CONTA[tipo].toLowerCase()})`);
    }
    salvar('restCategorias', 'restContas');
  }
  function excluirCategoria(tipo, nome){
    if (nome === CATEGORIA_PRAZO) erro(`"${CATEGORIA_PRAZO}" é usada pelas vendas e não pode ser excluída.`);
    if (tipo === 'PAGAR' && nome === CATEGORIA_COMPRAS) erro(`"${CATEGORIA_COMPRAS}" é usada nas compras de mercadoria e não pode ser excluída.`);
    const n = contas.filter(c => c.tipo === tipo && c.categoria === nome).length;
    if (n) erro(`"${nome}" tem ${n} conta${n === 1 ? '' : 's'}. Mude a categoria delas antes de excluir.`);
    categorias[tipo] = categorias[tipo].filter(x => x !== nome);
    auditar(`Categoria "${nome}" excluída`);
    salvar('restCategorias');
  }

  // =====================================================================
  // ---- Contas bancárias e movimento de conta (extrato) ----
  // Saldo = saldo inicial + entradas − saídas. Entram aqui: baixas de contas a pagar/receber
  // feitas "na conta", sangrias depositadas, suprimentos tirados da conta, lançamentos avulsos
  // (tarifa, rendimento...) e transferências entre contas.
  const TIPOS_CONTA_BANCARIA = {BANCO: 'Conta bancária', CAIXA: 'Cofre / dinheiro', CARTEIRA: 'Carteira digital (PIX, maquininha)'};
  const contaBancariaPorId = id => contasBancarias.find(c => c.id === id);
  const saldoConta = (id, ate = null) => { const c = contaBancariaPorId(id); if (!c) return 0;
    return r2((c.saldoInicial || 0) + movConta.filter(m => m.contaId === id && (!ate || m.data <= ate)).reduce((s, m) => s + (m.tipo === 'ENTRADA' ? m.valor : -m.valor), 0)); };
  function salvarContaBancaria(d, id){
    exigir('financeiro');
    const c = {nome: txt(d.nome), tipo: TIPOS_CONTA_BANCARIA[d.tipo] ? d.tipo : 'BANCO', banco: txt(d.banco), saldoInicial: txt(d.saldoInicial) === '' ? 0 : r2(lerValor(d.saldoInicial)),
      dataInicial: txt(d.dataInicial) || hojeISO(), ativo: d.ativo !== false};
    if (!c.nome) erro('Informe o nome da conta (ex.: Banco do Brasil, Cofre).');
    if (!Number.isFinite(c.saldoInicial)) erro('Saldo inicial inválido.');
    if (!dataValida(c.dataInicial)) erro('Data do saldo inicial inválida.');
    const igual = contasBancarias.find(x => x.id !== id && norm(x.nome) === norm(c.nome));
    if (igual) erro(`Já existe a conta "${igual.nome}".`);
    const existente = id && contaBancariaPorId(id);
    if (existente) {
      const alteracoes = existente.saldoInicial !== c.saldoInicial ? [{campo: 'Saldo inicial', antes: moedaBR(existente.saldoInicial), depois: moedaBR(c.saldoInicial)}] : [];
      Object.assign(existente, c);
      auditar(`Conta bancária "${c.nome}" editada`, alteracoes.length ? {alteracoes} : undefined);
      salvar('restContasBancarias');
      return existente;
    }
    const nova = {id: novoId('cb'), ...c};
    contasBancarias.push(nova);
    auditar(`Conta bancária "${c.nome}" cadastrada — saldo inicial ${moedaBR(c.saldoInicial)}`);
    salvar('restContasBancarias');
    return nova;
  }
  function excluirContaBancaria(id){
    exigir('financeiro');
    const c = contaBancariaPorId(id);
    if (!c) return;
    if (movConta.some(m => m.contaId === id)) erro(`"${c.nome}" tem movimentos no extrato. Desative em vez de excluir.`);
    contasBancarias.splice(contasBancarias.indexOf(c), 1);
    auditar(`Conta bancária "${c.nome}" excluída`);
    salvar('restContasBancarias');
  }
  // Lança no extrato (usado pelas baixas, sangrias e lançamentos avulsos)
  const contaAtiva = id => { const c = contaBancariaPorId(id); if (!c || !c.ativo) erro('Escolha uma conta bancária ativa.'); return c; };
  function lancarConta(contaId, tipo, valor, descricao, extra = {}){
    contaAtiva(contaId);
    const m = {id: novoId('mc'), contaId, tipo, valor: r2(valor), descricao: txt(descricao), data: extra.data || hojeISO(), usuario: usuario(), criadoEm: agora(), ...extra};
    movConta.push(m);
    return m;
  }
  // Lançamento avulso: depósito, tarifa, rendimento, retirada...
  function lancamentoConta({contaId, tipo, valor, descricao, data}){
    exigir('financeiro');
    if (!['ENTRADA', 'SAIDA'].includes(tipo)) erro('Escolha entrada ou saída.');
    const v = r2(lerValor(valor));
    if (!(v > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (txt(descricao).length < 3) erro('Informe a descrição (ex.: tarifa bancária).');
    if (!dataValida(data)) erro('Informe a data.');
    const m = lancarConta(contaId, tipo, v, descricao, {data, origem: 'AVULSO'});
    auditar(`${tipo === 'ENTRADA' ? 'Entrada' : 'Saída'} de ${moedaBR(v)} em "${contaBancariaPorId(contaId).nome}"`, {detalhe: m.descricao});
    salvar('restMovConta');
    return m;
  }
  function transferirEntreContas({origemId, destinoId, valor, data, descricao}){
    exigir('financeiro');
    if (!origemId || !destinoId || origemId === destinoId) erro('Escolha duas contas diferentes.');
    const v = r2(lerValor(valor));
    if (!(v > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (!dataValida(data)) erro('Informe a data.');
    const o = contaAtiva(origemId), dd = contaAtiva(destinoId);
    const transferencia = novoId('tf');
    lancarConta(origemId, 'SAIDA', v, txt(descricao) || `Transferência para ${dd?.nome}`, {data, transferencia, origem: 'TRANSFERENCIA'});
    lancarConta(destinoId, 'ENTRADA', v, txt(descricao) || `Transferência de ${o?.nome}`, {data, transferencia, origem: 'TRANSFERENCIA'});
    auditar(`Transferência de ${moedaBR(v)}: ${o.nome} → ${dd.nome}`);
    salvar('restMovConta');
  }
  // Exclui um lançamento avulso ou uma transferência inteira (os automáticos se desfazem na origem)
  function excluirMovConta(id){
    exigir('financeiro');
    const m = movConta.find(x => x.id === id) || erro('Lançamento não encontrado.');
    if (m.origem !== 'AVULSO' && m.origem !== 'TRANSFERENCIA') erro('Este lançamento veio de uma baixa ou do caixa: desfaça por lá (estorne a baixa).');
    const juntos = m.transferencia ? movConta.filter(x => x.transferencia === m.transferencia) : [m];
    juntos.forEach(x => movConta.splice(movConta.indexOf(x), 1));
    auditar(`Lançamento excluído do extrato: ${m.descricao} (${moedaBR(m.valor)})`);
    salvar('restMovConta');
  }

  // =====================================================================
  // ---- Dashboard ----
  // Regime de competência: venda conta no dia em que foi finalizada (inclusive a prazo);
  // conta a pagar/receber conta no vencimento. Contas a receber geradas por venda não
  // entram como receita de novo (a venda já entrou).
  const totalVenda = v => totaisVenda(v).total;
  function resumoDashboard(ref = new Date()){
    const hoje = diaISO(ref), mes = hoje.slice(0, 7), ano = ref.getFullYear();
    const finalizadas = vendas.filter(v => v.status === 'FINALIZADA' && v.finalizadaEm);
    const diaVenda = v => diaISO(new Date(v.finalizadaEm));
    const somaVendas = lista => r2(lista.reduce((s, v) => s + totalVenda(v), 0));
    const vHoje = finalizadas.filter(v => diaVenda(v) === hoje), vMes = finalizadas.filter(v => diaVenda(v).startsWith(mes));
    const abertas = tipo => contas.filter(c => c.tipo === tipo && c.status === 'ABERTA');
    const somaContas = lista => r2(lista.reduce((s, c) => s + c.valor, 0));
    const cartaoContas = tipo => {
      const a = abertas(tipo);
      const vencidas = a.filter(c => c.vencimento < hoje);
      return {hoje: somaContas(a.filter(c => c.vencimento === hoje)), mes: somaContas(a.filter(c => c.vencimento.startsWith(mes))),
        nHoje: a.filter(c => c.vencimento === hoje).length, vencidas: somaContas(vencidas), nVencidas: vencidas.length};
    };
    const cards = {
      vendas: {hoje: somaVendas(vHoje), mes: somaVendas(vMes), nHoje: vHoje.length, nMes: vMes.length},
      receber: cartaoContas('RECEBER'),
      pagar: cartaoContas('PAGAR'),
      ticket: {hoje: vHoje.length ? r2(somaVendas(vHoje) / vHoje.length) : 0, mes: vMes.length ? r2(somaVendas(vMes) / vMes.length) : 0}
    };
    // Vendas por mês: ano atual × anterior (meses futuros do ano atual ficam vazios)
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const porMes = MESES.map((nome, m) => ({mes: nome, atual: m <= ref.getMonth() ? 0 : null, anterior: 0}));
    finalizadas.forEach(v => {
      const d = new Date(v.finalizadaEm), y = d.getFullYear(), m = d.getMonth();
      if (y === ano && porMes[m].atual !== null) porMes[m].atual = r2(porMes[m].atual + totalVenda(v));
      else if (y === ano - 1) porMes[m].anterior = r2(porMes[m].anterior + totalVenda(v));
    });
    // Vendas por grupo no mês (valor dos itens, já com desconto do item)
    const porGrupo = {};
    vMes.forEach(v => v.itens.forEach(i => {
      const nome = grupoPorId(produtoPorId(i.produtoId)?.grupoId)?.nome || 'Sem grupo';
      porGrupo[nome] = r2((porGrupo[nome] || 0) + i.quantidade * i.precoUnitario - (i.desconto || 0));
    }));
    // Receitas × despesas por dia do mês
    const diasNoMes = new Date(ano, ref.getMonth() + 1, 0).getDate();
    const porDia = Array.from({length: diasNoMes}, (_, k) => ({dia: k + 1, receitas: 0, despesas: 0}));
    vMes.forEach(v => { const d = new Date(v.finalizadaEm).getDate() - 1; porDia[d].receitas = r2(porDia[d].receitas + totalVenda(v)); });
    contas.filter(c => c.vencimento.startsWith(mes)).forEach(c => {
      const d = Number(c.vencimento.slice(8, 10)) - 1;
      if (c.tipo === 'PAGAR') porDia[d].despesas = r2(porDia[d].despesas + c.valor);
      else if (!c.vendaId) porDia[d].receitas = r2(porDia[d].receitas + c.valor);
    });
    const despesasCat = {};
    contas.filter(c => c.tipo === 'PAGAR' && c.vencimento.startsWith(mes)).forEach(c => { despesasCat[c.categoria] = r2((despesasCat[c.categoria] || 0) + c.valor); });
    const ordenar = obj => Object.entries(obj).map(([nome, valor]) => ({nome, valor})).sort((a, b) => b.valor - a.valor);
    // Comparação justa: do 1º de janeiro até hoje, nos dois anos (mesmo dia e mês)
    const mesDia = hoje.slice(5);
    const comparativo = {atual: 0, anterior: 0};
    finalizadas.forEach(v => {
      const dv = diaVenda(v);
      if (dv.slice(5) > mesDia) return;
      if (dv.startsWith(String(ano))) comparativo.atual += totalVenda(v);
      else if (dv.startsWith(String(ano - 1))) comparativo.anterior += totalVenda(v);
    });
    comparativo.atual = r2(comparativo.atual); comparativo.anterior = r2(comparativo.anterior);
    return {hoje, mes, ano, cards, porMes, comparativo, porGrupo: ordenar(porGrupo), porDia,
      totalReceitasMes: r2(porDia.reduce((s, d) => s + d.receitas, 0)), totalDespesasMes: r2(porDia.reduce((s, d) => s + d.despesas, 0)),
      despesasPorCategoria: ordenar(despesasCat)};
  }

  // =====================================================================
  // ---- Relatórios (só leitura) ----
  // Mesmo regime do Dashboard: a venda conta no dia em que foi finalizada. Período "de/até"
  // inclusivo, no formato AAAA-MM-DD. Listas vêm ordenadas do maior valor para o menor.
  const noPeriodo = (iso, de, ate) => { if (!iso) return false; const d = diaISO(new Date(iso)); return d >= de && d <= ate; };
  const diasEntre = (de, ate) => Math.round((new Date(ate + 'T12:00:00') - new Date(de + 'T12:00:00')) / 86400000) + 1;
  // Período imediatamente anterior, do mesmo tamanho (para comparar)
  function periodoAnterior(de, ate){
    const fim = new Date(de + 'T12:00:00'); fim.setDate(fim.getDate() - 1);
    const ini = new Date(fim); ini.setDate(ini.getDate() - diasEntre(de, ate) + 1);
    return {de: diaISO(ini), ate: diaISO(fim)};
  }
  const operadoresDasVendas = () => [...new Set(vendas.map(v => v.operador).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const filtroVenda = ({operador = '', tipo = ''}) => v => (!operador || v.operador === operador) && (!tipo || v.tipo === tipo);
  const vendasDoPeriodo = f => vendas.filter(v => v.status === 'FINALIZADA' && noPeriodo(v.finalizadaEm, f.de, f.ate) && filtroVenda(f)(v));
  // Soma em grupos: {chave: {nome, n, valor, ...}} → lista ordenada por valor
  const acumular = (mapa, nome, valor, extra = {}) => {
    const x = mapa[nome] ||= {nome, n: 0, valor: 0};
    x.n++; x.valor = r2(x.valor + valor);
    Object.entries(extra).forEach(([k, v]) => { x[k] = r2((x[k] || 0) + v); });
    return x;
  };
  const ordenarValor = mapa => Object.values(mapa).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));

  // Vendas: totais, por dia, por hora, por forma de pagamento, por tipo e por operador
  function relatorioVendas(f){
    const lista = vendasDoPeriodo(f).map(v => ({v, t: totaisVenda(v)}));
    const soma = k => r2(lista.reduce((s, x) => s + x.t[k], 0));
    const total = soma('total');
    const porDia = [];
    for (let d = new Date(f.de + 'T12:00:00'); diaISO(d) <= f.ate; d.setDate(d.getDate() + 1))
      porDia.push({dia: diaISO(d), rotulo: dataBR(diaISO(d)).slice(0, 5), valor: 0, n: 0});
    const indiceDia = Object.fromEntries(porDia.map((x, k) => [x.dia, k]));
    const porHora = Array.from({length: 24}, (_, h) => ({hora: h, rotulo: `${h}h`, valor: 0, n: 0}));
    const formas = {}, tipos = {}, operadores = {};
    lista.forEach(({v, t}) => {
      const fim = new Date(v.finalizadaEm);
      const dia = porDia[indiceDia[diaISO(fim)]];
      dia.valor = r2(dia.valor + t.total); dia.n++;
      const hora = porHora[new Date(v.data).getHours()]; // hora em que o pedido começou
      hora.valor = r2(hora.valor + t.total); hora.n++;
      v.pagamentos.filter(p => !AJUSTES.includes(p.forma)).forEach(p => acumular(formas, p.nome || TIPOS_FORMA[tipoPagamento(p)], p.valor));
      acumular(tipos, TIPOS_VENDA[v.tipo], t.total);
      acumular(operadores, v.operador || '—', t.total, {descontos: t.desconto});
    });
    const canceladas = vendas.filter(v => v.status === 'CANCELADA' && noPeriodo(v.finalizadaEm || v.data, f.de, f.ate) && filtroVenda(f)(v));
    const ant = periodoAnterior(f.de, f.ate);
    return {n: lista.length, total, ticket: lista.length ? r2(total / lista.length) : 0,
      itens: soma('itens'), descontos: soma('desconto'), acrescimos: soma('acrescimo'), servico: soma('servico'), entrega: soma('entrega'), embalagem: soma('embalagem'),
      canceladas: {n: canceladas.length, valor: r2(canceladas.reduce((s, v) => s + totaisVenda(v).total, 0))},
      anterior: {...ant, total: r2(vendasDoPeriodo({...f, ...ant}).reduce((s, v) => s + totaisVenda(v).total, 0))},
      porDia, porHora, porForma: ordenarValor(formas), porTipo: ordenarValor(tipos), porOperador: ordenarValor(operadores)};
  }

  // Produtos: quantidade, faturamento (itens, já com desconto do item), custo, lucro e curva ABC
  function relatorioProdutos(f){
    const mapa = {};
    vendasDoPeriodo(f).forEach(v => v.itens.forEach(i => {
      const p = produtoPorId(i.produtoId);
      if (f.grupoId && p?.grupoId !== f.grupoId) return;
      const x = mapa[i.produtoId] ||= {produtoId: i.produtoId, codigo: p?.codigo || i.codigo || '', nome: p?.nome || i.nome, unidade: p?.unidade || 'UN',
        grupo: grupoPorId(p?.grupoId)?.nome || 'Sem categoria', qtd: 0, valor: 0, custo: 0, semCusto: false};
      x.qtd = r3(x.qtd + i.quantidade);
      x.valor = r2(x.valor + i.quantidade * i.precoUnitario - (i.desconto || 0));
      if (i.custoUnitario > 0) x.custo = r2(x.custo + i.quantidade * i.custoUnitario);
      else x.semCusto = true; // venda sem custo registrado: o lucro desse produto não é calculado
    }));
    const lista = Object.values(mapa).sort((a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome, 'pt-BR'));
    const total = r2(lista.reduce((s, x) => s + x.valor, 0));
    // Curva ABC: A = produtos que somam os primeiros 80% do faturamento, B = até 95%, C = o resto
    let acumulado = 0;
    lista.forEach(x => {
      x.curva = acumulado < total * 0.8 ? 'A' : acumulado < total * 0.95 ? 'B' : 'C';
      acumulado += x.valor;
      x.lucro = x.semCusto ? null : r2(x.valor - x.custo);
      x.margem = x.lucro === null || !x.valor ? null : x.lucro / x.valor * 100;
    });
    const comCusto = lista.filter(x => !x.semCusto);
    const grupos = {};
    lista.forEach(x => { const g = grupos[x.grupo] ||= {nome: x.grupo, n: 0, qtd: 0, valor: 0}; g.n++; g.qtd = r3(g.qtd + x.qtd); g.valor = r2(g.valor + x.valor); });
    return {lista, total, qtd: r3(lista.reduce((s, x) => s + x.qtd, 0)), porGrupo: ordenarValor(grupos),
      comCusto: {n: comCusto.length, valor: r2(comCusto.reduce((s, x) => s + x.valor, 0)), custo: r2(comCusto.reduce((s, x) => s + x.custo, 0)),
        lucro: r2(comCusto.reduce((s, x) => s + x.lucro, 0))}, semCusto: lista.length - comCusto.length};
  }

  // Caixa: cada caixa aberto no período com vendas, dinheiro esperado, contado e diferença
  function relatorioCaixa(f){
    const lista = caixas.filter(c => noPeriodo(c.abertura, f.de, f.ate) && (!f.operador || c.operador === f.operador))
      .sort((a, b) => b.numero - a.numero)
      .map(c => {
        const r = resumoCaixa(c.id);
        return {id: c.id, numero: c.numero, operador: c.operador, abertura: c.abertura, fechamento: c.fechamento, status: c.status,
          vendas: r.totalVendas, nVendas: r.nVendas, inicial: r.inicial, suprimentos: r.suprimentos, sangrias: r.sangrias,
          esperado: r.saldoDinheiro, contado: c.status === 'FECHADO' ? c.valorContado : null, diferenca: c.status === 'FECHADO' ? (c.diferenca || 0) : null};
      });
    const soma = (k, filtro = () => true) => r2(lista.filter(filtro).reduce((s, c) => s + (c[k] || 0), 0));
    return {lista, vendas: soma('vendas'), nVendas: lista.reduce((s, c) => s + c.nVendas, 0), suprimentos: soma('suprimentos'), sangrias: soma('sangrias'),
      sobras: soma('diferenca', c => c.diferenca > 0), faltas: soma('diferenca', c => c.diferenca < 0),
      comDiferenca: lista.filter(c => Math.abs(c.diferenca || 0) > 0.001).length, abertos: lista.filter(c => c.status === 'ABERTO').length};
  }

  // Delivery e encomenda: pedidos entregues, taxas, tempo de entrega, entregadores e bairros
  function relatorioDelivery(f){
    const lista = vendasDoPeriodo(f).filter(ehDelivery).map(v => ({v, t: totaisVenda(v)}));
    const total = r2(lista.reduce((s, x) => s + x.t.total, 0));
    const entregas = lista.filter(x => x.v.modo !== 'RETIRAR');
    // Tempo só do delivery (encomenda tem hora marcada)
    const tempos = lista.filter(x => x.v.tipo === 'DELIVERY').map(x => tempoPedido(x.v));
    const faixas = {verde: 0, amarelo: 0, vermelho: 0};
    tempos.forEach(t => { if (faixas[t.faixa] !== undefined) faixas[t.faixa]++; });
    const entregadoresM = {}, bairros = {}, modos = {}, regioesM = {}, apps = {};
    lista.forEach(({v, t}) => {
      acumular(modos, `${TIPOS_VENDA[v.tipo]} · ${MODOS_ENTREGA[v.modo] || MODOS_ENTREGA.ENTREGAR}`, t.total);
      acumular(apps, v.aplicativo?.nome || 'Pedido direto', t.total, {comissao: v.aplicativo ? t.total * (v.aplicativo.comissao || 0) / 100 : 0});
      if (v.modo === 'RETIRAR') return;
      acumular(entregadoresM, entregadorPorId(v.entregadorId)?.nome || 'Sem entregador', t.total, {taxas: t.entrega});
      acumular(bairros, txt(v.entrega?.bairro) || 'Não informado', t.total, {taxas: t.entrega});
      acumular(regioesM, txt(v.entrega?.regiao) || 'Sem região', t.total, {taxas: t.entrega});
    });
    const canceladas = vendas.filter(v => ehDelivery(v) && v.status === 'CANCELADA' && noPeriodo(v.canceladaEm || v.data, f.de, f.ate) && filtroVenda(f)(v));
    return {n: lista.length, total, ticket: lista.length ? r2(total / lista.length) : 0, nEntregas: entregas.length,
      taxas: r2(entregas.reduce((s, x) => s + x.t.entrega, 0)),
      tempoMedio: tempos.length ? Math.round(tempos.reduce((s, t) => s + t.min, 0) / tempos.length) : null, nTempos: tempos.length, faixas,
      canceladas: canceladas.length, porEntregador: ordenarValor(entregadoresM), porBairro: ordenarValor(bairros), porRegiao: ordenarValor(regioesM), porModo: ordenarValor(modos), porAplicativo: ordenarValor(apps)};
  }

  // Financeiro do período (competência): DRE, contas a pagar/receber, sangrias e suprimentos, mês a mês.
  // Compras de mercadoria (categoria Fornecedores) não entram como despesa na DRE: já estão no CMV.
  const CATEGORIA_COMPRAS = 'Fornecedores';
  function relatorioFinanceiro(f){
    const vs = vendasDoPeriodo(f);
    const receita = r2(vs.reduce((s, v) => s + totaisVenda(v).total, 0));
    const itens = vs.flatMap(v => v.itens);
    const cmv = r2(itens.reduce((s, i) => s + i.quantidade * (i.custoUnitario || 0), 0));
    const semCusto = itens.filter(i => !(i.custoUnitario > 0)).length;
    const comissoes = r2(vs.filter(v => v.aplicativo).reduce((s, v) => s + totaisVenda(v).total * (v.aplicativo.comissao || 0) / 100, 0));
    const noPer = c => c.vencimento >= f.de && c.vencimento <= f.ate;
    const pagar = contas.filter(c => c.tipo === 'PAGAR' && noPer(c)), receber = contas.filter(c => c.tipo === 'RECEBER' && noPer(c));
    const despesas = pagar.filter(c => c.categoria !== CATEGORIA_COMPRAS);
    const porCat = lista => { const m = {}; lista.forEach(c => { const x = m[c.categoria] ||= {nome: c.categoria, n: 0, valor: 0, pago: 0, aberto: 0}; x.n++; x.valor = r2(x.valor + c.valor); x[c.status === 'PAGA' ? 'pago' : 'aberto'] = r2(x[c.status === 'PAGA' ? 'pago' : 'aberto'] + c.valor); });
      return Object.values(m).sort((a, b) => b.valor - a.valor); };
    const totalDesp = r2(despesas.reduce((s, c) => s + c.valor, 0));
    const outras = r2(receber.filter(c => !c.vendaId).reduce((s, c) => s + c.valor, 0));
    const lucroBruto = r2(receita - cmv);
    const resultado = r2(lucroBruto - comissoes - totalDesp + outras);
    // Mês a mês no ano do fim do período
    const ano = f.ate.slice(0, 4);
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((nome, k) => {
      const ini = `${ano}-${String(k + 1).padStart(2, '0')}-01`, fim = diaISO(new Date(Number(ano), k + 1, 0));
      const vMes = vendasDoPeriodo({de: ini, ate: fim});
      const rec = r2(vMes.reduce((s, v) => s + totaisVenda(v).total, 0) + contas.filter(c => c.tipo === 'RECEBER' && !c.vendaId && c.vencimento >= ini && c.vencimento <= fim).reduce((s, c) => s + c.valor, 0));
      const custo = r2(vMes.flatMap(v => v.itens).reduce((s, i) => s + i.quantidade * (i.custoUnitario || 0), 0));
      const desp = r2(contas.filter(c => c.tipo === 'PAGAR' && c.categoria !== CATEGORIA_COMPRAS && c.vencimento >= ini && c.vencimento <= fim).reduce((s, c) => s + c.valor, 0));
      return {nome: `${nome}/${ano.slice(2)}`, receitas: rec, cmv: custo, despesas: desp, resultado: r2(rec - custo - desp)};
    });
    const movs = movCaixa.filter(m => ['SANGRIA', 'SUPRIMENTO'].includes(m.tipo) && noPeriodo(m.data, f.de, f.ate)).sort((a, b) => a.data.localeCompare(b.data));
    return {receita, cmv, semCusto, lucroBruto, comissoes, despesas: totalDesp, outras, resultado, despesasPorCategoria: porCat(despesas),
      compras: r2(pagar.filter(c => c.categoria === CATEGORIA_COMPRAS).reduce((s, c) => s + c.valor, 0)),
      pagar, receber, pagarPorCategoria: porCat(pagar), receberPorCategoria: porCat(receber), meses,
      sangrias: movs.map(m => ({...m, caixa: caixaPorId(m.caixaId)?.numero}))};
  }
  // Engenharia de cardápio (método Kasavana & Smith): popularidade × margem de contribuição
  //   Estrela: vende muito e dá boa margem · Burro de carga: vende muito, margem baixa
  //   Quebra-cabeça: margem boa, vende pouco · Cão: vende pouco e dá pouca margem
  const CLASSES_CARDAPIO = {ESTRELA: 'Estrela', BURRO: 'Burro de carga', QUEBRA: 'Quebra-cabeça', CAO: 'Cão'};
  function engenhariaCardapio(f){
    const lista = relatorioProdutos(f).lista.filter(x => !x.semCusto && x.qtd > 0);
    if (!lista.length) return {lista: [], corteQtd: 0, corteMargem: 0};
    const qtdTotal = lista.reduce((s, x) => s + x.qtd, 0);
    const corteQtd = r3(qtdTotal / lista.length * 0.7); // 70% da participação média
    const corteMargem = r2(lista.reduce((s, x) => s + x.lucro, 0) / qtdTotal); // margem média ponderada por unidade
    return {corteQtd, corteMargem, lista: lista.map(x => {
      const margemUn = r2(x.lucro / x.qtd), popular = x.qtd >= corteQtd, rentavel = margemUn >= corteMargem;
      return {...x, margemUn, classe: popular ? (rentavel ? 'ESTRELA' : 'BURRO') : (rentavel ? 'QUEBRA' : 'CAO')};
    }).sort((a, b) => b.lucro - a.lucro)};
  }

  // =====================================================================
  // ---- Dados de demonstração (marcados com demo: true; saem com um clique) ----
  const temDemo = () => vendas.some(v => v.demo) || contas.some(c => c.demo);
  function gerarDemonstracao(ref = new Date()){
    exigir('configuracoes');
    if (temDemo()) erro('Os dados de demonstração já existem. Remova-os antes de gerar de novo.');
    const ativos = produtos.filter(p => p.ativo && p.tipo !== 'INSUMO');
    if (!ativos.length) erro('Cadastre ao menos um produto ativo antes de gerar a demonstração.');
    const sorte = (a, b) => a + Math.random() * (b - a);
    const umDe = lista => lista[Math.floor(Math.random() * lista.length)];
    const backup = {vendas: vendas.slice(), caixas: caixas.slice(), movCaixa: movCaixa.slice(), contas: contas.slice(), seq: {...seq}};
    const hoje = diaISO(ref);
    // Vendas do dia 1º de janeiro do ano passado até agora; o ano atual vende ~15% mais
    for (let d = new Date(ref.getFullYear() - 1, 0, 1); diaISO(d) <= hoje; d.setDate(d.getDate() + 1)) {
      const dia = diaISO(d), ehHoje = dia === hoje;
      seq.caixa++;
      const cx = {id: novoId('cx'), numero: seq.caixa, operador: usuario(), abertura: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 30).toISOString(),
        valorInicial: 150, status: 'FECHADO', fechamento: null, valorContado: null, demo: true};
      caixas.push(cx);
      const fimSemana = [0, 5, 6].includes(d.getDay());
      const n = Math.round(sorte(2, fimSemana ? 7 : 4.5) * (d.getFullYear() === ref.getFullYear() ? 1.15 : 1));
      let total = 0;
      for (let k = 0; k < n; k++) {
        const hora = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(sorte(11, 23)), Math.floor(sorte(0, 60)));
        if (hora > ref) continue;
        const itens = Array.from({length: Math.ceil(sorte(0, 3))}, () => {
          const p = umDe(ativos);
          return {id: novoId('i'), produtoId: p.id, nome: p.nome, quantidade: Math.ceil(sorte(0, 2)), precoUnitario: p.preco, desconto: 0, observacao: '', pago: true};
        });
        const valor = r2(itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
        const tipoForma = umDe(['DINHEIRO', 'DEBITO', 'DEBITO', 'CREDITO', 'PIX', 'PIX']);
        const f = formasAtivas().find(x => x.tipo === tipoForma) || formasAtivas().find(x => x.tipo !== 'PRAZO');
        seq.venda++;
        vendas.push({id: novoId('v'), numero: seq.venda, caixaId: cx.id, tipo: umDe(['BALCAO', 'BALCAO', 'MESA', 'MESA', 'DELIVERY', 'ENCOMENDA']), status: 'FINALIZADA',
          clienteId: null, mesa: '', entregadorId: null, obs: '', operador: cx.operador, data: hora.toISOString(), finalizadaEm: hora.toISOString(),
          canceladaEm: null, motivoCancelamento: '', desconto: 0, acrescimo: 0, itens,
          pagamentos: [{id: novoId('pg'), formaId: f.id, tipo: f.tipo, nome: f.nome, valor, recebido: valor, troco: 0, data: hora.toISOString()}], demo: true});
        if (f.tipo === 'DINHEIRO') total += valor; // só o dinheiro fica na gaveta
      }
      cx.fechamento = (ehHoje ? new Date(ref) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 30)).toISOString(); cx.valorContado = r2(150 + total); cx.diferenca = 0;
    }
    // Contas: 2 meses atrás até o mês que vem; o que venceu antes de hoje está pago (menos uma, vencida)
    const fixas = [['Aluguel', 'Aluguel', 5, 3500, 3500], ['Folha de pagamento', 'Salários', 5, 6800, 6800], ['Conta de luz', 'Energia', 10, 780, 1050],
      ['Conta de água', 'Água', 12, 190, 280], ['Gás de cozinha', 'Gás', 15, 320, 460], ['Internet e telefone', 'Internet e telefone', 20, 149.9, 149.9],
      ['Impulsionamento redes sociais', 'Marketing', 25, 300, 300], ['Simples Nacional', 'Impostos', 20, 1400, 1900]];
    const lancar = (tipo, descricao, categoria, valor, venc) => {
      const pago = venc < hoje;
      contas.push({id: novoId('ct'), tipo, descricao, categoria, valor: r2(valor), vencimento: venc, status: pago ? 'PAGA' : 'ABERTA', pagoEm: pago ? venc : null,
        forma: pago ? umDe(['PIX', 'Boleto', 'Transferência']) : '', clienteId: null, vendaId: null, obs: '', criadoEm: agora(), demo: true});
    };
    for (let m = -2; m <= 1; m++) {
      const base = new Date(ref.getFullYear(), ref.getMonth() + m, 1);
      const dia = n => diaISO(new Date(base.getFullYear(), base.getMonth(), Math.min(n, new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate())));
      fixas.forEach(([desc, cat, d, min, max]) => lancar('PAGAR', desc, cat, sorte(min, max), dia(d)));
      [3, 10, 17, 24].forEach(d => lancar('PAGAR', umDe(['Hortifruti', 'Açougue', 'Distribuidora de bebidas', 'Atacadista']), 'Fornecedores', sorte(900, 2600), dia(d)));
    }
    lancar('PAGAR', 'Fornecedor de bebidas (pedido extra)', 'Fornecedores', 860, hoje);
    lancar('RECEBER', 'Evento corporativo (sinal)', 'Outras receitas', 1200, hoje);
    lancar('RECEBER', 'Encomenda de festa — saldo', 'Outras receitas', 950, diaISO(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + 6)));
    const atraso = new Date(ref); atraso.setDate(atraso.getDate() - 3);
    contas.push({id: novoId('ct'), tipo: 'PAGAR', descricao: 'Manutenção da coifa', categoria: 'Manutenção', valor: 480, vencimento: diaISO(atraso), status: 'ABERTA',
      pagoEm: null, forma: '', clienteId: null, vendaId: null, obs: '', criadoEm: agora(), demo: true});
    salvar('restCaixas', 'restVendas', 'restContas', 'restSeq');
    // Sem espaço no navegador: desfaz tudo em vez de deixar dados pela metade
    if (ler('restVendas', []).length !== vendas.length) {
      vendas = backup.vendas; caixas = backup.caixas; movCaixa = backup.movCaixa; contas = backup.contas; seq = backup.seq;
      salvar('restCaixas', 'restVendas', 'restContas', 'restSeq');
      erro('Não há espaço suficiente no navegador para os dados de demonstração.');
    }
    const resumo = {vendas: vendas.filter(v => v.demo).length, contas: contas.filter(c => c.demo).length};
    auditar('Dados de demonstração gerados', {detalhe: `${resumo.vendas} vendas e ${resumo.contas} contas`});
    return resumo;
  }
  function removerDemonstracao(){
    exigir('configuracoes');
    const antes = {vendas: vendas.length, contas: contas.length};
    vendas = vendas.filter(v => !v.demo);
    const usados = new Set([...vendas.map(v => v.caixaId), ...movCaixa.map(m => m.caixaId)]);
    caixas = caixas.filter(c => !c.demo || usados.has(c.id));
    contas = contas.filter(c => !c.demo);
    const resumo = {vendas: antes.vendas - vendas.length, contas: antes.contas - contas.length};
    auditar('Dados de demonstração removidos', {detalhe: `${resumo.vendas} vendas e ${resumo.contas} contas`});
    salvar('restCaixas', 'restVendas', 'restContas');
    return resumo;
  }

  // =====================================================================
  // ---- Dados do sistema: resumo, backup e limpeza ----
  // Tema e usuário logado são preferências deste navegador: ficam ao limpar/restaurar.
  const CHAVES_PRESERVADAS = ['mga_tema', 'mga_usuario', 'mga_sessao', 'mga_menuOculto'];
  function chavesSistema(){
    const lista = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mga_') && !CHAVES_PRESERVADAS.includes(k)) lista.push(k);
    }
    return lista;
  }
  function resumoDados(){
    let bytes = 0;
    try { chavesSistema().forEach(k => { bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; }); } catch (e) { /* storage indisponível */ }
    return {vendas: vendas.length, produtos: produtos.length, grupos: grupos.length, clientes: listaClientes().length, entregadores: entregadores.length,
      contas: contas.length, caixas: caixas.length, auditoria: ler('auditoria', []).length, bytes, demo: temDemo()};
  }
  function exportarBackup(){
    const dados = {};
    chavesSistema().forEach(k => { dados[k] = localStorage.getItem(k); });
    registrarAuditoria('Sistema', 'Backup dos dados exportado', {detalhe: `${Object.keys(dados).length} conjuntos de dados`});
    return JSON.stringify({sistema: 'MGA', versao: 2, geradoEm: agora(), usuario: usuario(), dados}, null, 2);
  }
  // Valida o arquivo; quem chama confirma com a pessoa e recarrega a página
  function lerBackup(texto){
    let b;
    try { b = JSON.parse(texto); } catch (e) { erro('Arquivo inválido: não é um backup do MGA.'); }
    if (!b || b.sistema !== 'MGA' || !b.dados || !Object.keys(b.dados).every(k => k.startsWith('mga_'))) erro('Arquivo inválido: não é um backup do MGA.');
    return {geradoEm: b.geradoEm || null, conjuntos: Object.keys(b.dados).length, aplicar(){
      const antes = Object.fromEntries(chavesSistema().map(k => [k, localStorage.getItem(k)]));
      try {
        chavesSistema().forEach(k => localStorage.removeItem(k));
        Object.entries(b.dados).forEach(([k, v]) => { if (!CHAVES_PRESERVADAS.includes(k)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); });
      } catch (e) {
        chavesSistema().forEach(k => localStorage.removeItem(k));
        Object.entries(antes).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch (x) { /* sem espaço */ } });
        erro('Não foi possível restaurar: falta espaço no navegador. Os dados atuais foram mantidos.');
      }
      registrarAuditoria('Sistema', 'Backup restaurado', {detalhe: `Backup de ${b.geradoEm ? new Date(b.geradoEm).toLocaleString('pt-BR') : 'data desconhecida'}`});
    }};
  }
  // modo "exemplo": recomeça com os grupos e produtos de exemplo · "vazio": sem nada
  async function limparTudo({modo, senha}){
    const u = sessaoAtual();
    if (temUsuarios() && !ehAdmin(u)) erro('Só o administrador pode apagar os dados.');
    if (u?.hash && await hashSenha(String(senha || ''), u.sal) !== u.hash) erro('Senha incorreta. Use a senha do seu login.');
    const resumo = resumoDados();
    // Usuários ficam: sem eles ninguém entraria de novo no sistema
    chavesSistema().filter(k => k !== 'mga_restUsuarios').forEach(k => localStorage.removeItem(k));
    if (modo === 'vazio') ['restGrupos', 'restProdutos'].forEach(k => gravar(k, []));
    gravar('auditoria', [{data: agora(), usuario: usuario(), modulo: 'Sistema',
      descricao: `Todos os dados foram apagados (${modo === 'vazio' ? 'recomeço vazio' : 'recomeço com produtos de exemplo'})`,
      detalhe: `Antes: ${resumo.vendas} vendas, ${resumo.produtos} produtos, ${resumo.clientes} clientes, ${resumo.contas} contas · autorizado com a senha de ${usuario()}`}]);
  }
  const auditoria = () => ler('auditoria', []);

  // ---- Formatação usada nas telas ----
  const moedaBR = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const valorBR = v => Number(v || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const qtdBR = v => Number(v || 0).toLocaleString('pt-BR', {maximumFractionDigits: 3}); // 12 · 0,35 · 1.250
  function mascaraTelefone(v){
    const d = digitos(v).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  const mascaraCep = v => { const d = digitos(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };

  // Cada grupo de funções aparece na auditoria com o próprio módulo
  const exigindo = (modulo, fn) => (...a) => { exigir(modulo); return fn(...a); };
  const cad = fn => comModulo('Cadastros', exigindo('cadastros', fn)), fin = fn => comModulo('Financeiro', exigindo('financeiro', fn)), vnd = fn => comModulo('Vendas', fn), sis = fn => comModulo('Sistema', fn), mes = fn => comModulo('Mesas', fn), dlv = fn => comModulo('Delivery', fn), est = fn => comModulo('Estoque', fn);
  const porVenda = fn => (id, ...r) => { const t = vendaPorId(id)?.tipo; return (t === 'MESA' ? mes : t === 'DELIVERY' || t === 'ENCOMENDA' ? dlv : vnd)(fn)(id, ...r); };
  window.RestDados = {
    TIPOS_VENDA, STATUS_VENDA, TIPOS_FORMA, TIPOS_MOV_CAIXA, MOV_ENTRADA, MOV_SAIDA, VEICULOS, UNIDADES, TIPOS_CONTA, FORMAS_BAIXA, CATEGORIA_PRAZO,
    MODULOS, PERFIS, LIMITE_FOTO, TIPOS_MOV_ESTOQUE, MOTIVOS_SAIDA,
    on, versao: () => versao, norm, lerValor, moedaBR, valorBR, qtdBR, mascaraTelefone, mascaraCep, diaISO, hojeISO, dataBR,
    usuario, registrarAuditoria, auditoria, novoId, aoSalvar, substituirCadastros,
    // Usuários, sessão e permissões
    usuarios: () => usuarios, usuarioPorId, temUsuarios, sessaoAtual, podeAcessar, modulosDo, ehAdmin,
    criarPrimeiroAdmin, autenticar, iniciarSessao, iniciarSessaoSupabase, encerrarSessao, salvarUsuario, excluirUsuario,
    grupos: () => grupos, produtos: () => produtos, clientes: listaClientes, entregadores: () => entregadores,
    formas: () => formas, formasAtivas, formaPorId, prazoHabilitado, tipoPagamento,
    seq: () => seq, caixas: () => caixas, movCaixa: () => movCaixa, vendas: () => vendas, contas: () => contas, categorias: () => categorias,
    grupoPorId, produtoPorId, clientePorId, entregadorPorId, vendaPorId, contaPorId, caixaPorId, produtosDoGrupo, produtoVendido, contaVencida, proximoCodigo,
    salvarGrupo: cad(salvarGrupo), excluirGrupo: cad(excluirGrupo), salvarProduto: cad(salvarProduto), excluirProduto: cad(excluirProduto), importarProdutos: cad(importarProdutos),
    salvarCliente: cad(salvarClienteRest), excluirCliente: cad(excluirClienteRest), salvarEntregador: cad(salvarEntregador), excluirEntregador: cad(excluirEntregador),
    salvarForma: cad(salvarForma), excluirForma: cad(excluirForma),
    // Pessoas, regiões de entrega, empresa e impressão
    CARGOS, UFS, cnpjValido, mascaraCnpj, mascaraDoc,
    fornecedores: () => fornecedores, fornecedorPorId, salvarFornecedor: cad(salvarFornecedor), excluirFornecedor: cad(excluirFornecedor),
    funcionarios: () => funcionarios, funcionarioPorId, salvarFuncionario: cad(salvarFuncionario), excluirFuncionario: cad(excluirFuncionario),
    regioes: () => regioes, regiaoPorId, regiaoDoBairro, salvarRegiao: cad(salvarRegiao), excluirRegiao: cad(excluirRegiao),
    salvarEmpresa, cabecalhoEmpresa, nomeMarca, salvarImpressao, marcarImpresso,
    // Estoque
    movEstoque: () => movEstoque, estoqueBaixo, custoMedio, custoProduto, TIPOS_PRODUTO,
    produzir: est(produzir), compraEstoque: est(compraEstoque), zerarEstoque: est(zerarEstoque), importarEntradas: est(importarEntradas),
    // Cardápio: adicionais/etapas, tamanhos e promoções
    DIAS_SEMANA, adicionais: () => adicionais, grupoAdicionalPorId, salvarGrupoAdicional: cad(salvarGrupoAdicional), excluirGrupoAdicional: cad(excluirGrupoAdicional),
    promocoes: () => promocoes, promocaoPorId, salvarPromocao: cad(salvarPromocao), excluirPromocao: cad(excluirPromocao), descreverPromocao,
    promocoesVigentes, precoBase, precoItem, precisaMontar,
    // Cozinha, aplicativos e embalagens
    ESTADOS_PREPARO, filaProducao, moverPreparo: vnd(moverPreparo), MODOS_CUPOM,
    aplicativos: () => aplicativos, aplicativoPorId, salvarAplicativo: cad(salvarAplicativo), excluirAplicativo: cad(excluirAplicativo),
    embalagens: () => embalagens, embalagemPorId, embalagemDoProduto, taxaEmbalagemDe, salvarEmbalagem: cad(salvarEmbalagem), excluirEmbalagem: cad(excluirEmbalagem),
    entradaEstoque: est(entradaEstoque), saidaEstoque: est(saidaEstoque), ajustarEstoque: est(ajustarEstoque), configurarEstoque: est(configurarEstoque),
    // Caixa e vendas
    caixaAberto, abrirCaixa: comModulo('Caixa', abrirCaixa), movimentarCaixa: comModulo('Caixa', movimentarCaixa), resumoCaixa, fecharCaixa: comModulo('Caixa', fecharCaixa),
    valorAjuste, registrarVenda: vnd(registrarVenda), novaVenda: (d = {}) => (d.tipo === 'MESA' ? mes : vnd)(novaVenda)(d), adicionarItem: porVenda(adicionarItem), ajustarVenda: porVenda(ajustarVenda),
    adicionarPagamento: vnd(adicionarPagamento), finalizarVenda: vnd(finalizarVenda), cancelarVenda: porVenda(cancelarVenda), totaisVenda,
    fluxoCaixa, somarMeses, salvarConta: fin(salvarConta), excluirConta: fin(excluirConta), baixarConta: fin(baixarConta), estornarBaixa: fin(estornarBaixa),
    salvarCategoria: fin(salvarCategoria), excluirCategoria: fin(excluirCategoria),
    // Mesas: cadastro, pedido aberto, divisão da conta e taxa de serviço
    mesas: mesasOrdenadas, mesaPorId, vendaDaMesa, config: () => config, valorDosItens,
    salvarMesa: cad(salvarMesa), excluirMesa: cad(excluirMesa), salvarConfig,
    // Cardápio digital
    noCardapio, configurarCardapio, mostrarNoCardapio: cad(mostrarNoCardapio), ordenarCardapio: cad(ordenarCardapio), ordenarCategorias: cad(ordenarCategorias),
    editarNoCardapio: cad(editarNoCardapio), lancarPedidoCardapio: mes(lancarPedidoCardapio),
    alterarItem: mes(alterarItem), removerItem: mes(removerItem), definirServico: mes(definirServico), pedirConta: mes(pedirConta),
    definirPessoas: mes(definirPessoas), transferirMesa: mes(transferirMesa), receberParcial: mes(receberParcial), removerPagamento: mes(removerPagamento),
    // Delivery e encomenda
    STATUS_DELIVERY, ORDEM_STATUS, MODOS_ENTREGA, ehDelivery, pedidosDelivery, clientePorTelefone, tempoPedido, cpfValido, mascaraCpf,
    registrarDelivery: dlv(registrarDelivery), alterarStatusDelivery: dlv(alterarStatusDelivery), enviarEntregador: dlv(enviarEntregador), entregarPedido: dlv(entregarPedido),
    resumoDashboard, temDemo,
    // Relatórios
    periodoAnterior, operadoresDasVendas, relatorioVendas, relatorioProdutos, relatorioCaixa, relatorioDelivery,
    relatorioFinanceiro, engenhariaCardapio, CLASSES_CARDAPIO, CATEGORIA_COMPRAS,
    // Contas bancárias e extrato
    TIPOS_CONTA_BANCARIA, contasBancarias: () => contasBancarias, contaBancariaPorId, saldoConta, movConta: () => movConta,
    salvarContaBancaria: fin(salvarContaBancaria), excluirContaBancaria: fin(excluirContaBancaria), lancamentoConta: fin(lancamentoConta),
    transferirEntreContas: fin(transferirEntreContas), excluirMovConta: fin(excluirMovConta), gerarDemonstracao: sis(gerarDemonstracao), removerDemonstracao: sis(removerDemonstracao),
    resumoDados, exportarBackup, lerBackup, limparTudo
  };
})();
