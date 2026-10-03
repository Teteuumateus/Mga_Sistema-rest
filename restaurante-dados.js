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
  const UNIDADES = ['UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX', 'DZ', 'PORÇÃO'];
  // Estoque: tipos de movimento e motivos sugeridos para a saída manual
  const TIPOS_MOV_ESTOQUE = {ENTRADA: 'Entrada', SAIDA: 'Saída', AJUSTE: 'Ajuste de inventário', VENDA: 'Venda', ESTORNO: 'Venda cancelada'};
  const MOTIVOS_SAIDA = ['Perda / quebra', 'Produto vencido', 'Consumo interno', 'Cortesia', 'Devolução ao fornecedor'];
  // ---- Usuários: perfis e módulos que cada um acessa (o administrador ajusta por usuário) ----
  const MODULOS = {cadastros: 'Cadastros', financeiro: 'Financeiro', estoque: 'Estoque', vendas: 'Vendas / PDV e caixa', mesas: 'Mesas',
    delivery: 'Delivery', relatorios: 'Relatórios', configuracoes: 'Configurações'};
  const PERFIS = {
    ADMIN: {nome: 'Administrador', modulos: Object.keys(MODULOS)},
    GERENTE: {nome: 'Gerente', modulos: ['vendas', 'relatorios', 'financeiro', 'estoque', 'mesas', 'delivery']},
    CAIXA: {nome: 'Operador / Caixa', modulos: ['vendas', 'mesas', 'delivery']},
    GARCOM: {nome: 'Garçom', modulos: ['mesas']}
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
  const novoId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const r2 = v => Math.round((Number(v) || 0) * 100) / 100;
  const r3 = v => Math.round((Number(v) || 0) * 1000) / 1000; // quantidades (0,350 KG)
  const agora = () => new Date().toISOString();
  // Datas de calendário no fuso local, no formato AAAA-MM-DD (vencimentos, dias do dashboard)
  const diaISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hojeISO = () => diaISO(new Date());
  const dataBR = iso => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—';
  const txt = v => String(v ?? '').trim();
  const norm = v => txt(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const digitos = v => String(v ?? '').replace(/\D/g, '');
  // "1.234,56" / "1234,5" (vírgula decimal) ou "1234.56" (ponto decimal)
  function lerValor(v){
    if (typeof v === 'number') return v;
    const t = txt(v).replace(/^R\$\s*/i, '');
    if (!t) return NaN;
    const n = Number(t.includes(',') ? t.replace(/[.\s]/g, '').replace(',', '.') : t);
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
    lista.push({data: agora(), usuario: usuario(), modulo, descricao, ...(extra || {})});
    gravar('auditoria', lista.slice(-LIMITE_AUDITORIA));
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
  let config = Object.assign({nome: 'Meu Restaurante', taxaServico: 10, servicoPadrao: true, taxaEntrega: 0, entregaVerde: 20, entregaAmarelo: 40}, ler('restConfig', {}));
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
  });
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
      restContas: contas, restCategorias: categorias, restMesas: mesas, restConfig: config, restMovEstoque: movEstoque};
    chaves.forEach(k => gravar(k, mapa[k]));
    versao++;
    ouvintes.forEach(fn => fn(versao));
  }
  const erro = msg => { const e = new Error(msg); e.regra = true; throw e; };

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
    if (u && !podeAcessar(modulo, u)) erro(`Seu usuário não tem acesso a ${MODULOS[modulo]}. Fale com o administrador.`);
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
  function encerrarSessao(){
    if (sessaoAtual()) registrarAuditoria('Sistema', 'Saiu do sistema');
    armazens().forEach(s => { try { s.removeItem(CHAVE_SESSAO); } catch (e) { /* */ } });
  }
  // Cadastro de usuários (só administrador). A senha é opcional na edição (vazia = mantém)
  async function salvarUsuario(d, id){
    exigir('configuracoes');
    const u = validarUsuario(d, id);
    const existente = id && usuarioPorId(id);
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
    const g = id && grupoPorId(id);
    if (g) {
      const alteracoes = [];
      if (g.nome !== nome) alteracoes.push({campo: 'Nome', antes: g.nome, depois: nome});
      if (g.ativo !== ativo) alteracoes.push({campo: 'Ativo', antes: g.ativo ? 'Sim' : 'Não', depois: ativo ? 'Sim' : 'Não'});
      Object.assign(g, {nome, ativo});
      if (alteracoes.length) auditar(`Categoria "${nome}" editada`, {alteracoes});
      salvar('restGrupos');
      return g;
    }
    const novo = {id: novoId('g'), nome, ordem: grupos.reduce((m, x) => Math.max(m, x.ordem || 0), 0) + 1, ativo};
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
  function salvarProduto(dados, id){
    const nome = txt(dados.nome);
    const preco = r2(lerValor(dados.preco));
    const custo = txt(dados.custo) === '' ? 0 : r2(lerValor(dados.custo));
    const estoque = txt(dados.estoque) === '' ? 0 : lerValor(dados.estoque);
    const estoqueMinimo = txt(dados.estoqueMinimo) === '' ? 0 : lerValor(dados.estoqueMinimo);
    const codigo = txt(dados.codigo).toUpperCase();
    if (!nome) erro('Informe o nome do produto.');
    if (!grupoPorId(dados.grupoId)) erro('Escolha a categoria do produto.');
    if (!Number.isFinite(lerValor(dados.preco)) || preco <= 0) erro('Informe um preço de venda maior que R$ 0,00.');
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
    const controlaEstoque = !!dados.controlaEstoque;
    const campos = {codigo, nome, preco, custo, unidade, grupoId: dados.grupoId, foto, descricao: txt(dados.descricao), ativo: dados.ativo !== false,
      controlaEstoque, estoqueMinimo: controlaEstoque ? r3(estoqueMinimo) : 0};
    const saldo = r3(estoque);
    const p = id && produtoPorId(id);
    const moeda = v => 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
    if (p) {
      if (!campos.codigo) campos.codigo = p.codigo;
      const fmt = {preco: moeda, custo: moeda, grupoId: v => grupoPorId(v)?.nome || '—', ativo: v => v ? 'Sim' : 'Não', foto: v => v ? 'com foto' : 'sem foto',
        controlaEstoque: v => v ? 'Sim' : 'Não'};
      const rotulo = {codigo: 'Código', nome: 'Nome', preco: 'Preço', custo: 'Custo', unidade: 'Unidade', grupoId: 'Categoria', foto: 'Foto', descricao: 'Descrição', ativo: 'Ativo',
        controlaEstoque: 'Controla estoque', estoqueMinimo: 'Estoque mínimo'};
      const alteracoes = Object.keys(rotulo).filter(k => (p[k] ?? '') !== (campos[k] ?? ''))
        .map(k => ({campo: rotulo[k], antes: (fmt[k] || String)(p[k] ?? '—'), depois: (fmt[k] || String)(campos[k] ?? '—')}));
      Object.assign(p, campos);
      // Saldo mudado no cadastro também fica no histórico do estoque (ajuste)
      const saldoAntes = r3(p.estoque);
      if (controlaEstoque && saldo !== saldoAntes) {
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
  function excluirProduto(id){
    const p = produtoPorId(id);
    if (!p) return;
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
  function entradaEstoque({produtoId, quantidade, custo, documento, conta = null}){
    exigir('estoque');
    const p = produtoComEstoque(produtoId);
    const qtd = lerQtd(quantidade);
    const custoUn = txt(custo) === '' ? 0 : r2(lerValor(custo));
    if (!Number.isFinite(custoUn) || custoUn < 0) erro('Custo unitário inválido.');
    if (conta) {
      exigir('financeiro');
      if (!(custoUn > 0)) erro('Informe o custo unitário para lançar a conta a pagar.');
      salvarConta({tipo: 'PAGAR', descricao: `Compra: ${qtdBR(qtd)} ${p.unidade} ${p.nome}${txt(documento) ? ` (${txt(documento)})` : ''}`,
        categoria: categorias.PAGAR.includes('Fornecedores') ? 'Fornecedores' : categorias.PAGAR[0], valor: r2(qtd * custoUn), vencimento: conta.vencimento, obs: ''});
    }
    const custoAntes = p.custo || 0;
    p.custo = custoMedio(p, qtd, custoUn);
    const m = lancarEstoque(p, 'ENTRADA', qtd, {custoUnitario: custoUn || null, motivo: txt(documento)});
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
  function baixarEstoqueVenda(v){
    const porProduto = {};
    v.itens.forEach(i => { const p = produtoPorId(i.produtoId); if (p?.controlaEstoque) porProduto[p.id] = r3((porProduto[p.id] || 0) + i.quantidade); });
    Object.entries(porProduto).forEach(([id, qtd]) => lancarEstoque(produtoPorId(id), 'VENDA', -qtd, {vendaId: v.id, motivo: `${nomeVenda(v)}${v.tipo === 'BALCAO' ? '' : ` (venda #${v.numero})`}`}));
    v.estoqueBaixado = true;
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
    const novo = {id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), doc: '', email: '', obs: '', ...c, dataCadastro: agora()};
    listaClientes().push(novo);
    auditar(`Cliente ${c.nome} cadastrado`, {detalhe: [c.telefone, c.bairro].filter(Boolean).join(' · ')});
    salvar('clientes');
    return novo;
  }
  function excluirClienteRest(id){
    const c = clientePorId(id);
    if (!c) return;
    if (vendas.some(v => v.clienteId === id && v.status === 'ABERTA')) erro(`${c.nome} tem uma venda em aberto no Restaurante. Finalize ou cancele antes.`);
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
  function movimentarCaixa(tipo, {valor, motivo}){
    exigir('vendas');
    const cx = caixaExigido();
    if (!['SUPRIMENTO', 'SANGRIA'].includes(tipo)) erro('Movimento inválido.');
    const v = r2(lerValor(valor));
    if (!(v > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (txt(motivo).length < 3) erro(`Informe o motivo ${tipo === 'SANGRIA' ? 'da sangria' : 'do suprimento'}.`);
    if (tipo === 'SANGRIA' && v > resumoCaixa(cx.id).saldoDinheiro + 0.001) erro(`A sangria passa do dinheiro no caixa (${moedaBR(resumoCaixa(cx.id).saldoDinheiro)}).`);
    const m = lancarMov(cx, tipo, v, 'DINHEIRO', txt(motivo));
    auditar(`${TIPOS_MOV_CAIXA[tipo]} de ${moedaBR(v)} no caixa #${cx.numero}`, {detalhe: m.descricao});
    salvar('restMovCaixa');
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
    // Tudo o que o caixa movimentou, em todas as formas (a prazo fica de fora: não entrou dinheiro)
    r.totalGeral = r2(r.inicial + Object.entries(porForma).filter(([t]) => t !== 'PRAZO').reduce((s, [, v]) => s + v, 0)
      + r.recebimentos + r.suprimentos - r.sangrias - r.pagamentos - r.estornos);
    return r;
  }
  function fecharCaixa({valorContado, obs}){
    exigir('vendas');
    const cx = caixaExigido();
    const abertas = vendas.filter(v => v.caixaId === cx.id && v.status === 'ABERTA' && v.tipo !== 'ENCOMENDA');
    if (abertas.length) erro(`Há ${abertas.length} venda${abertas.length === 1 ? '' : 's'} em aberto neste caixa (mesas ou deliveries). Finalize ou cancele antes de fechar.`);
    if (txt(valorContado) === '') erro('Conte o dinheiro da gaveta e informe o valor.');
    const contado = r2(lerValor(valorContado));
    if (!Number.isFinite(lerValor(valorContado)) || contado < 0) erro('Valor contado inválido.');
    const r = resumoCaixa(cx.id);
    const diferenca = r2(contado - r.saldoDinheiro);
    if (Math.abs(diferenca) > 0.001 && txt(obs).length < 3) erro(`Há ${diferenca > 0 ? 'sobra' : 'falta'} de ${moedaBR(Math.abs(diferenca))}. Informe o motivo para fechar.`);
    const {movimentos, caixa, ...congelado} = r;
    Object.assign(cx, {status: 'FECHADO', fechamento: agora(), fechadoPor: usuario(), valorContado: contado, diferenca, obsFechamento: txt(obs), resumo: congelado});
    auditar(`Caixa #${cx.numero} fechado — esperado ${moedaBR(r.saldoDinheiro)}, contado ${moedaBR(contado)}${Math.abs(diferenca) > 0.001 ? ` (${diferenca > 0 ? 'sobra' : 'falta'} de ${moedaBR(Math.abs(diferenca))})` : ''}`,
      {detalhe: txt(obs)});
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
    const entrega = r2(v.taxaEntrega || 0);
    const total = r2(Math.max(itens - desconto + acrescimo + servico + entrega, 0));
    const reais = v.pagamentos.filter(p => !AJUSTES.includes(p.forma));
    const pago = r2(reais.reduce((s, p) => s + p.valor, 0));
    return {itens, desconto, acrescimo, servico, entrega, total, pago, restante: r2(Math.max(total - pago, 0)), troco: r2(reais.reduce((s, p) => s + (p.troco || 0), 0))};
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
  function itemDaVenda(produtoId, quantidade, observacao){
    const p = produtoPorId(produtoId);
    if (!p) erro('Produto não encontrado.');
    if (!p.ativo) erro(`"${p.nome}" está desativado.`);
    const qtd = typeof quantidade === 'number' ? quantidade : lerValor(quantidade);
    if (!(qtd > 0)) erro(`Quantidade inválida para "${p.nome}".`);
    return {id: novoId('i'), produtoId: p.id, codigo: p.codigo, nome: p.nome, quantidade: r2(qtd), precoUnitario: p.preco, custoUnitario: p.custo || 0,
      desconto: 0, observacao: txt(observacao), pago: false};
  }
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
    const linhas = itens.map(i => itemDaVenda(i.produtoId, i.quantidade, i.observacao));
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
  function adicionarItem(vendaId, produtoId, {quantidade = 1, desconto = 0, observacao = ''} = {}){
    const v = editavelPor(vendaId);
    const item = itemDaVenda(produtoId, quantidade, observacao);
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
  function alterarItem(vendaId, itemId, {quantidade, observacao}){
    const v = editavelPor(vendaId);
    const i = itemDe(v, itemId);
    if (i.pago) erro(`"${i.nome}" já foi pago e não pode ser alterado.`);
    const antes = {...i};
    if (quantidade !== undefined) {
      const q = typeof quantidade === 'number' ? quantidade : lerValor(quantidade);
      if (!(q > 0)) erro('Quantidade inválida. Para tirar o item, use excluir.');
      i.quantidade = r2(q);
    }
    if (observacao !== undefined) i.observacao = txt(observacao);
    try { conferirPago(v); } catch (e) { Object.assign(i, antes); throw e; }
    salvar('restVendas');
    return i;
  }
  function removerItem(vendaId, itemId, motivo = ''){
    const v = editavelPor(vendaId);
    const i = itemDe(v, itemId);
    if (i.pago) erro(`"${i.nome}" já foi pago e não pode ser excluído.`);
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
    const v = vendaEditavel(vendaPorId(vendaId));
    const pag = montarPagamento(totaisVenda(v).restante, formaId, valor);
    if (pag.tipo === 'PRAZO' && !v.clienteId) erro('Venda a prazo precisa de um cliente.');
    v.pagamentos.push(pag);
    salvar('restVendas');
    return pag;
  }
  function finalizarVenda(vendaId){
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
    const linhas = d.itens.map(i => itemDaVenda(i.produtoId, i.quantidade, i.observacao));
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
    const base = r2(linhas.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0));
    const acr = valorAjuste(d.acrescimo, base), desc = valorAjuste(d.desconto, base);
    if (desc > base + acr + 0.001) erro('O desconto não pode passar do total do pedido.');
    const v = {id: novoId('v'), numero: seq.venda + 1, caixaId: cx.id, tipo, status: 'ABERTA', clienteId: null, mesaId: null, mesa: '', pessoas: 1,
      entregadorId: null, obs: txt(d.obs), operadorId: sessaoAtual()?.id || null, operador: usuario(), data: agora(), finalizadaEm: null,
      canceladaEm: null, motivoCancelamento: '', desconto: desc, acrescimo: acr, itens: linhas, pagamentos: [],
      entrega: ent, modo, agendadoPara, taxaEntrega: modo === 'ENTREGAR' ? taxa : 0, formaPrevistaId: forma?.id || null,
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
  function entregarPedido(id, {pagamentos = []} = {}){
    exigir('vendas');
    const v = pedidoAberto(id);
    const cx = caixaExigido();
    if (v.modo === 'ENTREGAR' && v.statusDelivery !== 'SAIU') erro('O pedido ainda não saiu para entrega.');
    if (v.tipo === 'DELIVERY' && cx.id !== v.caixaId) erro('O caixa deste pedido não está mais aberto.');
    let falta = totaisVenda(v).restante;
    const novos = [];
    pagamentos.forEach(p => { const pg = montarPagamento(falta, p.formaId, p.valor); falta = r2(falta - pg.valor); novos.push(pg); });
    if (falta > 0.001) erro(`Falta receber ${moedaBR(falta)}.`);
    if (novos.some(p => p.tipo === 'PRAZO') && !v.clienteId) erro('Pagamento a prazo precisa de um cliente.');
    // Encomenda pode ter sido feita em outro caixa: a venda entra no caixa de agora
    if (v.tipo === 'ENCOMENDA') v.caixaId = cx.id;
    novos.forEach(p => { p.recebidoPor = usuario(); v.pagamentos.push(p); });
    const status = v.statusDelivery;
    marcarStatus(v, 'ENTREGUE');
    try { concluir(v); } catch (e) { v.pagamentos.splice(v.pagamentos.length - novos.length); v.historico.pop(); v.statusDelivery = status; throw e; }
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

  // =====================================================================
  // ---- Financeiro: contas a pagar e a receber ----
  const contaPorId = id => contas.find(c => c.id === id);
  const dataValida = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(new Date(d + 'T12:00:00'));
  function salvarConta(dados, id){
    const tipo = dados.tipo;
    if (!TIPOS_CONTA[tipo]) erro('Tipo de conta inválido.');
    const c = {descricao: txt(dados.descricao), categoria: txt(dados.categoria), valor: r2(lerValor(dados.valor)), vencimento: txt(dados.vencimento),
      clienteId: tipo === 'RECEBER' ? (dados.clienteId || null) : null, obs: txt(dados.obs)};
    if (!c.descricao) erro('Informe a descrição da conta.');
    if (!categorias[tipo].includes(c.categoria)) erro('Escolha a categoria.');
    if (!(c.valor > 0)) erro('Informe um valor maior que R$ 0,00.');
    if (!dataValida(c.vencimento)) erro('Informe a data de vencimento.');
    if (c.clienteId && !clientePorId(c.clienteId)) erro('Cliente não encontrado.');
    const existente = id && contaPorId(id);
    if (existente) {
      if (existente.vendaId) erro('Esta conta veio de uma venda a prazo e não pode ser editada. Cancele a venda, se for o caso.');
      if (existente.status === 'PAGA') erro('Conta já baixada. Estorne a baixa para editar.');
      const rot = {descricao: 'Descrição', categoria: 'Categoria', valor: 'Valor', vencimento: 'Vencimento', obs: 'Observação'};
      const alteracoes = Object.keys(rot).filter(k => existente[k] !== c[k]).map(k => ({campo: rot[k], antes: String(existente[k] || '—'), depois: String(c[k] || '—')}));
      Object.assign(existente, c);
      if (alteracoes.length) auditar(`Conta ${TIPOS_CONTA[tipo].toLowerCase()} "${c.descricao}" editada`, {alteracoes});
      salvar('restContas');
      return existente;
    }
    const nova = {id: novoId('ct'), tipo, ...c, status: 'ABERTA', pagoEm: null, forma: '', vendaId: null, criadoEm: agora()};
    contas.push(nova);
    auditar(`Conta ${TIPOS_CONTA[tipo].toLowerCase()} "${c.descricao}" lançada — ${moedaBR(c.valor)} vence ${dataBR(c.vencimento)}`);
    salvar('restContas');
    return nova;
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
  function baixarConta(id, {data, forma, noCaixa = false}){
    const c = contaPorId(id);
    if (!c) erro('Conta não encontrada.');
    if (c.status === 'PAGA') erro('Esta conta já foi baixada.');
    if (!dataValida(data)) erro('Informe a data do pagamento.');
    if (data > hojeISO()) erro('A data do pagamento não pode ser no futuro.');
    if (!FORMAS_BAIXA.includes(forma)) erro('Escolha a forma de pagamento.');
    let mov = null;
    if (noCaixa) {
      const cx = caixaExigido();
      const tipoForma = TIPO_DA_BAIXA[forma] || 'OUTROS';
      if (c.tipo === 'PAGAR' && tipoForma === 'DINHEIRO' && c.valor > resumoCaixa(cx.id).saldoDinheiro + 0.001)
        erro(`Não há dinheiro suficiente no caixa (${moedaBR(resumoCaixa(cx.id).saldoDinheiro)}) para pagar ${moedaBR(c.valor)}.`);
      mov = lancarMov(cx, c.tipo === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO', c.valor, tipoForma, c.descricao, {contaId: c.id});
    }
    Object.assign(c, {status: 'PAGA', pagoEm: data, forma, movCaixaId: mov?.id || null});
    auditar(`Conta "${c.descricao}" ${c.tipo === 'PAGAR' ? 'paga' : 'recebida'} — ${moedaBR(c.valor)} (${forma})${mov ? ' pelo caixa' : ''}`);
    salvar('restContas', 'restMovCaixa');
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
    Object.assign(c, {status: 'ABERTA', pagoEm: null, forma: '', movCaixaId: null});
    auditar(`Baixa da conta "${c.descricao}" estornada`);
    salvar('restContas', 'restMovCaixa');
    return c;
  }
  const contaVencida = c => c.status === 'ABERTA' && c.vencimento < hojeISO();
  function salvarCategoria(tipo, nome, antigo){
    nome = txt(nome);
    if (!TIPOS_CONTA[tipo]) erro('Tipo inválido.');
    if (!nome) erro('Informe o nome da categoria.');
    const lista = categorias[tipo];
    if (lista.some(x => x !== antigo && norm(x) === norm(nome))) erro(`Já existe a categoria "${nome}".`);
    if (antigo) {
      if (antigo === CATEGORIA_PRAZO) erro(`"${CATEGORIA_PRAZO}" é usada pelas vendas e não pode ser renomeada.`);
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
    const n = contas.filter(c => c.tipo === tipo && c.categoria === nome).length;
    if (n) erro(`"${nome}" tem ${n} conta${n === 1 ? '' : 's'}. Mude a categoria delas antes de excluir.`);
    categorias[tipo] = categorias[tipo].filter(x => x !== nome);
    auditar(`Categoria "${nome}" excluída`);
    salvar('restCategorias');
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
  // ---- Dados de demonstração (marcados com demo: true; saem com um clique) ----
  const temDemo = () => vendas.some(v => v.demo) || contas.some(c => c.demo);
  function gerarDemonstracao(ref = new Date()){
    if (temDemo()) erro('Os dados de demonstração já existem. Remova-os antes de gerar de novo.');
    const ativos = produtos.filter(p => p.ativo);
    if (!ativos.length) erro('Cadastre ao menos um produto ativo antes de gerar a demonstração.');
    const sorte = (a, b) => a + Math.random() * (b - a);
    const umDe = lista => lista[Math.floor(Math.random() * lista.length)];
    const backup = {vendas: vendas.slice(), caixas: caixas.slice(), movCaixa: movCaixa.slice(), contas: contas.slice(), seq: {...seq}};
    const hoje = diaISO(ref);
    const temCaixaReal = !!caixaAberto();
    // Vendas do dia 1º de janeiro do ano passado até agora; o ano atual vende ~15% mais
    for (let d = new Date(ref.getFullYear() - 1, 0, 1); diaISO(d) <= hoje; d.setDate(d.getDate() + 1)) {
      const dia = diaISO(d), ehHoje = dia === hoje;
      seq.caixa++;
      const cx = {id: novoId('cx'), numero: seq.caixa, operador: usuario(), abertura: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 30).toISOString(),
        valorInicial: 150, status: ehHoje && !temCaixaReal ? 'ABERTO' : 'FECHADO', fechamento: null, valorContado: null, demo: true};
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
      if (cx.status === 'FECHADO') { cx.fechamento = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 30).toISOString(); cx.valorContado = r2(150 + total); cx.diferenca = 0; }
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
    const antes = {vendas: vendas.length, contas: contas.length};
    vendas = vendas.filter(v => !v.demo);
    caixas = caixas.filter(c => !c.demo);
    contas = contas.filter(c => !c.demo);
    const resumo = {vendas: antes.vendas - vendas.length, contas: antes.contas - contas.length};
    auditar('Dados de demonstração removidos', {detalhe: `${resumo.vendas} vendas e ${resumo.contas} contas`});
    salvar('restCaixas', 'restVendas', 'restContas');
    return resumo;
  }

  // =====================================================================
  // ---- Dados do sistema: resumo, backup e limpeza ----
  // Tema e usuário logado são preferências deste navegador: ficam ao limpar/restaurar.
  const CHAVES_PRESERVADAS = ['mga_tema', 'mga_usuario'];
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
      chavesSistema().forEach(k => localStorage.removeItem(k));
      Object.entries(b.dados).forEach(([k, v]) => { if (!CHAVES_PRESERVADAS.includes(k)) localStorage.setItem(k, v); });
      registrarAuditoria('Sistema', 'Backup restaurado', {detalhe: `Backup de ${b.geradoEm ? new Date(b.geradoEm).toLocaleString('pt-BR') : 'data desconhecida'}`});
    }};
  }
  // modo "exemplo": recomeça com os grupos e produtos de exemplo · "vazio": sem nada
  function limparTudo({modo, senha}){
    if (String(senha) !== String(ler('senhaSupervisor', '1234'))) erro('Senha do supervisor incorreta.');
    const resumo = resumoDados();
    // Usuários ficam: sem eles ninguém entraria de novo no sistema
    chavesSistema().filter(k => k !== 'mga_restUsuarios').forEach(k => localStorage.removeItem(k));
    if (modo === 'vazio') ['restGrupos', 'restProdutos'].forEach(k => gravar(k, []));
    gravar('auditoria', [{data: agora(), usuario: usuario(), modulo: 'Sistema',
      descricao: `Todos os dados foram apagados (${modo === 'vazio' ? 'recomeço vazio' : 'recomeço com produtos de exemplo'})`,
      detalhe: `Antes: ${resumo.vendas} vendas, ${resumo.produtos} produtos, ${resumo.clientes} clientes, ${resumo.contas} contas · autorizado com senha do supervisor`}]);
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
  const cad = fn => comModulo('Cadastros', fn), fin = fn => comModulo('Financeiro', fn), vnd = fn => comModulo('Vendas', fn), sis = fn => comModulo('Sistema', fn), mes = fn => comModulo('Mesas', fn), dlv = fn => comModulo('Delivery', fn), est = fn => comModulo('Estoque', fn);
  const porVenda = fn => (id, ...r) => { const t = vendaPorId(id)?.tipo; return (t === 'MESA' ? mes : t === 'DELIVERY' || t === 'ENCOMENDA' ? dlv : vnd)(fn)(id, ...r); };
  window.RestDados = {
    TIPOS_VENDA, STATUS_VENDA, TIPOS_FORMA, TIPOS_MOV_CAIXA, MOV_ENTRADA, MOV_SAIDA, VEICULOS, UNIDADES, TIPOS_CONTA, FORMAS_BAIXA, CATEGORIA_PRAZO,
    MODULOS, PERFIS, LIMITE_FOTO, TIPOS_MOV_ESTOQUE, MOTIVOS_SAIDA,
    on, versao: () => versao, norm, lerValor, moedaBR, valorBR, qtdBR, mascaraTelefone, mascaraCep, diaISO, hojeISO, dataBR,
    usuario, registrarAuditoria, auditoria,
    // Usuários, sessão e permissões
    usuarios: () => usuarios, usuarioPorId, temUsuarios, sessaoAtual, podeAcessar, modulosDo, ehAdmin,
    criarPrimeiroAdmin, autenticar, iniciarSessao, encerrarSessao, salvarUsuario, excluirUsuario,
    grupos: () => grupos, produtos: () => produtos, clientes: listaClientes, entregadores: () => entregadores,
    formas: () => formas, formasAtivas, formaPorId, prazoHabilitado, tipoPagamento,
    caixas: () => caixas, movCaixa: () => movCaixa, vendas: () => vendas, contas: () => contas, categorias: () => categorias,
    grupoPorId, produtoPorId, clientePorId, entregadorPorId, vendaPorId, contaPorId, caixaPorId, produtosDoGrupo, produtoVendido, contaVencida, proximoCodigo,
    salvarGrupo: cad(salvarGrupo), excluirGrupo: cad(excluirGrupo), salvarProduto: cad(salvarProduto), excluirProduto: cad(excluirProduto),
    salvarCliente: cad(salvarClienteRest), excluirCliente: cad(excluirClienteRest), salvarEntregador: cad(salvarEntregador), excluirEntregador: cad(excluirEntregador),
    salvarForma: cad(salvarForma), excluirForma: cad(excluirForma),
    // Estoque
    movEstoque: () => movEstoque, estoqueBaixo, custoMedio,
    entradaEstoque: est(entradaEstoque), saidaEstoque: est(saidaEstoque), ajustarEstoque: est(ajustarEstoque), configurarEstoque: est(configurarEstoque),
    // Caixa e vendas
    caixaAberto, abrirCaixa: comModulo('Caixa', abrirCaixa), movimentarCaixa: comModulo('Caixa', movimentarCaixa), resumoCaixa, fecharCaixa: comModulo('Caixa', fecharCaixa),
    valorAjuste, registrarVenda: vnd(registrarVenda), novaVenda: (d = {}) => (d.tipo === 'MESA' ? mes : vnd)(novaVenda)(d), adicionarItem: porVenda(adicionarItem), ajustarVenda: porVenda(ajustarVenda),
    adicionarPagamento: vnd(adicionarPagamento), finalizarVenda: vnd(finalizarVenda), cancelarVenda: porVenda(cancelarVenda), totaisVenda,
    salvarConta: fin(salvarConta), excluirConta: fin(excluirConta), baixarConta: fin(baixarConta), estornarBaixa: fin(estornarBaixa),
    salvarCategoria: fin(salvarCategoria), excluirCategoria: fin(excluirCategoria),
    // Mesas: cadastro, pedido aberto, divisão da conta e taxa de serviço
    mesas: mesasOrdenadas, mesaPorId, vendaDaMesa, config: () => config, valorDosItens,
    salvarMesa: cad(salvarMesa), excluirMesa: cad(excluirMesa), salvarConfig,
    alterarItem: mes(alterarItem), removerItem: mes(removerItem), definirServico: mes(definirServico), pedirConta: mes(pedirConta),
    definirPessoas: mes(definirPessoas), transferirMesa: mes(transferirMesa), receberParcial: mes(receberParcial), removerPagamento: mes(removerPagamento),
    // Delivery e encomenda
    STATUS_DELIVERY, ORDEM_STATUS, MODOS_ENTREGA, ehDelivery, pedidosDelivery, clientePorTelefone, tempoPedido, cpfValido, mascaraCpf,
    registrarDelivery: dlv(registrarDelivery), alterarStatusDelivery: dlv(alterarStatusDelivery), enviarEntregador: dlv(enviarEntregador), entregarPedido: dlv(entregarPedido),
    resumoDashboard, temDemo, gerarDemonstracao: sis(gerarDemonstracao), removerDemonstracao: sis(removerDemonstracao),
    resumoDados, exportarBackup, lerBackup, limparTudo
  };
})();
