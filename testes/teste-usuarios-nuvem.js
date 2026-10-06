// Usuários na nuvem: lista vem do banco; salvar/excluir passam pela Edge Function "usuarios"
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/teste-nuvem.js', 'utf8');
eval(src.slice(0, src.indexOf('(async () => {')).replace(/^const /gm, 'var '));

(async () => {
  const banco = bancoFalso();
  banco.comoEmpresa('A');
  banco.T.empresas.push({id: 'A', nome: 'MGA', config: {}, empresa_id: 'A'});
  const ADM = crypto.randomUUID();
  banco.T.usuarios.push({id: ADM, empresa_id: 'A', nome: 'Mateus', login: 'mateus@mga.com', perfil: 'ADMIN', ativo: true, criado_em: '2026-10-01'});
  banco.T.usuario_modulos = [];
  // select com usuario_modulos(modulo) embutido
  const fromOrig = banco.cliente.from;
  banco.cliente.from = t => {
    const q = fromOrig(t);
    if (t !== 'usuarios') return q;
    const thenOrig = q.then;
    q.then = (res, rej) => thenOrig((r) => (r.data ? {...r, data: r.data.map(u => ({...u, usuario_modulos: banco.T.usuario_modulos.filter(m => m.usuario_id === u.id).map(m => ({modulo: m.modulo}))}))} : r), rej).then(res, rej);
    return q;
  };
  // Edge Function falsa (mesmas regras principais do index.ts)
  const corpos = [];
  banco.cliente.functions = {invoke: async (nome, {body: b}) => {
    corpos.push(b);
    const falha = msg => ({data: null, error: {message: 'Edge Function returned a non-2xx status code', context: {json: async () => ({erro: msg})}}});
    if (nome !== 'usuarios') return falha('?');
    if (b.acao === 'salvar') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) return falha('Informe um e-mail válido (é com ele que a pessoa entra).');
      if (banco.T.usuarios.some(u => u.login === b.email && u.id !== b.id)) return falha('Este e-mail já tem conta no sistema.');
      const id = b.id || crypto.randomUUID();
      const reg = {id, empresa_id: 'A', nome: b.nome, login: b.email, perfil: b.perfil, ativo: b.ativo, criado_em: '2026-10-03'};
      banco.T.usuarios = [...banco.T.usuarios.filter(u => u.id !== id), reg];
      banco.T.usuario_modulos = [...banco.T.usuario_modulos.filter(m => m.usuario_id !== id), ...b.modulos.map(modulo => ({usuario_id: id, modulo}))];
      return {data: {ok: true, id}, error: null};
    }
    if (b.acao === 'excluir') {
      if (b.id === ADM) return falha('Você não pode excluir o seu próprio usuário.');
      banco.T.usuarios = banco.T.usuarios.filter(u => u.id !== b.id);
      return {data: {ok: true}, error: null};
    }
  }};

  const mem = {local: {mga_nuvemEmpresa: 'A', mga_nuvemVersao: '2'}, sessao: {}};
  entrar(mem, ADM, 'A');
  const {D, N} = await abrirPagina(mem, banco);
  ok(N.ativa === true, 'modo nuvem ativo depois de carregar');
  ok(D.sessaoAtual()?.id === ADM && D.usuarios()[0].nuvem, 'administrador logado, vindo do banco');
  ok(D.podeAcessar('configuracoes') && D.podeAcessar('relatorios'), 'administrador tem todos os módulos');

  // Senha curta é barrada antes de chamar o servidor
  let erro = null;
  try { await D.salvarUsuario({nome: 'Ana', login: 'ana@mga.com', perfil: 'GARCOM', ativo: true, senha: '123', confirmar: '123', modulos: ['mesas']}); } catch (e) { erro = e; }
  ok(erro?.regra && /6/.test(erro.message) && corpos.length === 0, 'senha com menos de 6 caracteres: erro sem chamar o servidor');
  erro = null;
  try { await D.salvarUsuario({nome: 'Ana', login: 'ana@mga.com', perfil: 'GARCOM', ativo: true, senha: '123456', confirmar: '654321', modulos: ['mesas']}); } catch (e) { erro = e; }
  ok(erro?.regra && /conferem/.test(erro.message), 'senhas diferentes: erro');

  // Cria garçom
  const ana = await D.salvarUsuario({nome: 'Ana', login: 'Ana@MGA.com', perfil: 'GARCOM', ativo: true, senha: '123456', confirmar: '123456', modulos: ['mesas']});
  ok(corpos[0].email === 'ana@mga.com' && corpos[0].senha === '123456' && corpos[0].acao === 'salvar', 'cadastro vai para a função com e-mail em minúsculas');
  ok(ana.login === 'ana@mga.com' && D.usuarios().length === 2 && D.usuarioPorId(ana.id).modulos.join() === 'mesas', 'garçom aparece na lista com os módulos do banco');
  ok(!('senha' in D.usuarioPorId(ana.id)) && !D.usuarioPorId(ana.id).hash && !JSON.stringify(mem.local).includes('123456'), 'senha não fica guardada no navegador');
  ok(D.auditoria().some(a => /Ana.*cadastrado/.test(a.descricao || a.acao || JSON.stringify(a))), 'cadastro registrado na auditoria');

  // E-mail repetido: mensagem do servidor chega na tela
  erro = null;
  try { await D.salvarUsuario({nome: 'Outra', login: 'ana@mga.com', perfil: 'CAIXA', ativo: true, senha: '123456', confirmar: '123456', modulos: []}); } catch (e) { erro = e; }
  ok(erro?.regra && erro.message === 'Este e-mail já tem conta no sistema.', 'mensagem de erro do servidor aparece: ' + erro?.message);

  // Edita sem trocar senha
  await D.salvarUsuario({...D.usuarioPorId(ana.id), nome: 'Ana Paula', senha: '', confirmar: '', modulos: ['mesas', 'cozinha']}, ana.id);
  ok(corpos.at(-1).id === ana.id && corpos.at(-1).senha === '' && D.usuarioPorId(ana.id).nome === 'Ana Paula' && D.usuarioPorId(ana.id).modulos.length === 2, 'edição sem senha: nome e módulos atualizados');

  // Não exclui a si mesmo; exclui a Ana
  erro = null;
  try { await D.excluirUsuario(ADM); } catch (e) { erro = e; }
  ok(erro?.regra && D.usuarios().length === 2, 'não exclui o próprio usuário');
  await D.excluirUsuario(ana.id);
  ok(!D.usuarioPorId(ana.id) && D.usuarios().length === 1, 'usuário excluído some da lista');

  // Função não publicada
  banco.cliente.functions.invoke = async () => ({data: null, error: {message: 'Failed to send a request to the Edge Function', context: {json: async () => { throw new Error('x'); }}}});
  erro = null;
  try { await D.salvarUsuario({nome: 'Zé', login: 'ze@mga.com', perfil: 'CAIXA', ativo: true, senha: '123456', confirmar: '123456', modulos: ['vendas']}); } catch (e) { erro = e; }
  ok(erro?.regra && /função "usuarios"/.test(erro.message), 'função não publicada: mensagem clara');

  // Banco sem usuários visíveis (migração não rodada): lista local é mantida
  const banco2 = bancoFalso(); banco2.comoEmpresa('A'); banco2.T.empresas.push({id: 'A', nome: 'MGA', config: {}, empresa_id: 'A'});
  const mem2 = {local: {mga_nuvemEmpresa: 'A', mga_nuvemVersao: '2'}, sessao: {}};
  entrar(mem2, ADM, 'A');
  const p2 = await abrirPagina(mem2, banco2);
  ok(p2.D.sessaoAtual()?.id === ADM, 'sem usuários no banco: continua logado');
  process.exit(process.exitCode || 0);
})().catch(e => { console.error(e); process.exit(1); });
