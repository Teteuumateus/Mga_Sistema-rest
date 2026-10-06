// Master dentro da empresa do cliente (modo suporte)
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/teste-nuvem.js', 'utf8');
eval(src.slice(0, src.indexOf('(async () => {')).replace(/^const /gm, 'var '));
(async () => {
  const banco = bancoFalso();
  banco.comoEmpresa('A');
  banco.T.empresas.push({id: 'A', nome: 'MGA', config: {}, empresa_id: 'A'});
  const M = crypto.randomUUID(), ANA = crypto.randomUUID();
  banco.T.usuarios.push({id: ANA, empresa_id: 'A', nome: 'Ana', login: 'ana@x.com', perfil: 'ADMIN', ativo: true},
    {id: M, empresa_id: 'A', nome: 'Mateus', login: 'mateusandrade.brasil@gmail.com', perfil: 'ADMIN', ativo: false},
    {id: crypto.randomUUID(), empresa_id: 'B', nome: 'Bia', login: 'bia@x.com', perfil: 'ADMIN', ativo: true});
  let empresaDoMaster = 'A';
  banco.cliente.rpc = async nome => nome === 'minha_empresa' ? {data: empresaDoMaster, error: null} : {data: null, error: {message: '?'}};
  // Navegador com dados de OUTRA empresa (auditoria ainda não enviada)
  const mem = {local: {mga_nuvemEmpresa: 'trocou', mga_nuvemVersao: '2',
    mga_restAuditoria: JSON.stringify([{id: 'aud-da-outra', data: '2026-10-01T10:00:00Z', modulo: 'Sistema', acao: 'da outra empresa'}])}, sessao: {}};
  mem.local.mga_restUsuarios = JSON.stringify([{id: M, nome: 'MGA Tecnologia (suporte)', login: 'mateusandrade.brasil@gmail.com', perfil: 'ADMIN', ativo: true, empresaId: 'A', master: true, modulos: []}]);
  mem.sessao.mga_sessao = JSON.stringify({usuarioId: M});
  const {D, N} = await abrirPagina(mem, banco);
  let foiPara = null; global.location.replace = u => { foiPara = u; };
  ok(N.ativa && D.sessaoAtual()?.id === M && D.sessaoAtual().master, 'master entra na empresa e continua logado');
  ok(D.usuarios().map(u => u.nome).sort().join() === 'Ana,MGA Tecnologia (suporte)', 'lista de usuários: só os da empresa (sem a Bia de outra empresa), com o master no lugar do registro inativo');
  ok(D.podeAcessar('configuracoes') && D.podeAcessar('cadastros'), 'master tem acesso total dentro da empresa');
  await espera(150);
  ok(!banco.T.auditoria.some(a => a.id === 'aud-da-outra'), 'auditoria de outra empresa deste navegador NÃO vai para esta');
  D.salvarGrupo ? null : null;
  const g = D.grupos()[0] || D.salvarGrupo({nome: 'Lanches'});
  D.salvarProduto({nome: 'Suco do suporte', grupoId: g.id, preco: '8'});
  await espera(200);
  ok(banco.T.produtos.some(p => p.nome === 'Suco do suporte'), 'produto cadastrado pelo master vai para o banco da empresa');
  // Entrou em outra empresa por outra aba
  empresaDoMaster = 'B';
  D.salvarProduto({nome: 'Não pode ir', grupoId: g.id, preco: '9'});
  await espera(200);
  ok(!banco.T.produtos.some(p => p.nome === 'Não pode ir'), 'master trocou de empresa em outra aba: esta aba para de salvar');
  await espera(4200);
  ok(foiPara === 'master.html', 'e volta para o painel master');
  process.exit(process.exitCode || 0);
})().catch(e => { console.error(e); process.exit(1); });
