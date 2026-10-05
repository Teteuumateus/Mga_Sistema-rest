// =====================================================================
// MGA · Edge Function "usuarios": o administrador cria, altera e exclui os logins da equipe
// =====================================================================
// Roda no servidor do Supabase, com a chave secreta (service_role), que nunca vai para o navegador.
// Só o ADMINISTRADOR ativo da empresa pode usar, e só mexe em usuários da própria empresa.
// Chamada pelo sistema com: supa.functions.invoke('usuarios', {body: {acao: 'salvar' | 'excluir', ...}})
import {createClient} from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const MODULOS = ['cadastros', 'financeiro', 'estoque', 'vendas', 'mesas', 'cozinha', 'delivery', 'relatorios', 'configuracoes'];
const PERFIS = ['ADMIN', 'GERENTE', 'CAIXA', 'GARCOM', 'COZINHA'];
const BANIDO = '876000h'; // ~100 anos: usuário inativo não consegue entrar

class Regra extends Error {}
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), {status, headers: {...CORS, 'Content-Type': 'application/json'}});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  try {
    const adm = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth: {persistSession: false}});
    // Quem está pedindo (pelo login dele)
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const {data: {user}, error: erroLogin} = await adm.auth.getUser(token);
    if (erroLogin || !user) return resposta(401, {erro: 'Sua sessão expirou. Saia e entre de novo.'});
    // O master (MGA Tecnologia) dentro de uma empresa vale como administrador dela
    const {data: master} = await adm.from('masters').select('id, empresa_acesso').eq('id', user.id).maybeSingle();
    const {data: doBanco} = master ? {data: null} : await adm.from('usuarios').select('id, empresa_id, perfil, ativo').eq('id', user.id).maybeSingle();
    const eu = master?.empresa_acesso ? {id: master.id, empresa_id: master.empresa_acesso, perfil: 'ADMIN', ativo: true} : doBanco;
    if (!eu || !eu.ativo || eu.perfil !== 'ADMIN') return resposta(403, {erro: 'Só o administrador cadastra e altera usuários.'});
    const empresa = eu.empresa_id;
    const b = await req.json();

    // Não deixa a empresa ficar sem nenhum administrador ativo
    const unicoAdmin = async (id: string) => {
      const {data} = await adm.from('usuarios').select('id').eq('empresa_id', empresa).eq('perfil', 'ADMIN').eq('ativo', true);
      return (data || []).length === 1 && data![0].id === id;
    };
    const doUsuario = async (id: string) => {
      const {data} = await adm.from('usuarios').select('id, perfil, ativo').eq('id', id).eq('empresa_id', empresa).maybeSingle();
      if (!data) throw new Regra('Usuário não encontrado.');
      // O login master (MGA Tecnologia) nunca é alterado nem excluído por um restaurante
      const {data: ehMaster} = await adm.from('masters').select('id').eq('id', id).maybeSingle();
      if (ehMaster) throw new Regra('Este é o acesso da MGA Tecnologia (suporte) e não pode ser alterado aqui.');
      return data;
    };
    const gravarModulos = async (id: string, perfil: string, modulos: string[]) => {
      await adm.from('usuario_modulos').delete().eq('usuario_id', id);
      const lista = perfil === 'ADMIN' ? MODULOS : modulos.filter(m => MODULOS.includes(m));
      if (lista.length) {
        const {error} = await adm.from('usuario_modulos').insert(lista.map(modulo => ({empresa_id: empresa, usuario_id: id, modulo})));
        if (error) throw error;
      }
    };

    if (b.acao === 'salvar') {
      const nome = String(b.nome || '').trim();
      const email = String(b.email || '').trim().toLowerCase();
      const perfil = String(b.perfil || '');
      const ativo = b.ativo !== false;
      const senha = String(b.senha || '');
      const modulos: string[] = Array.isArray(b.modulos) ? b.modulos : [];
      if (!nome) throw new Regra('Informe o nome do usuário.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Regra('Informe um e-mail válido (é com ele que a pessoa entra).');
      if (!PERFIS.includes(perfil)) throw new Regra('Escolha o perfil.');
      if (senha && senha.length < 6) throw new Regra('A senha precisa ter pelo menos 6 caracteres.');

      if (b.id) {
        // Alterar usuário existente
        const alvo = await doUsuario(b.id);
        if (alvo.id === eu.id && (!ativo || perfil !== 'ADMIN')) throw new Regra('Você não pode tirar o seu próprio acesso de administrador.');
        if (alvo.perfil === 'ADMIN' && alvo.ativo && (perfil !== 'ADMIN' || !ativo) && await unicoAdmin(alvo.id))
          throw new Regra('Este é o único administrador ativo. Cadastre outro administrador antes.');
        const {error: e1} = await adm.auth.admin.updateUserById(alvo.id, {email, email_confirm: true, ...(senha ? {password: senha} : {}), ban_duration: ativo ? 'none' : BANIDO});
        if (e1) throw new Regra(/already|registered|exists/i.test(e1.message) ? 'Este e-mail já é usado por outra conta.' : e1.message);
        const {error: e2} = await adm.from('usuarios').update({nome, login: email, perfil, ativo}).eq('id', alvo.id);
        if (e2) throw e2;
        await gravarModulos(alvo.id, perfil, modulos);
        return resposta(200, {ok: true, id: alvo.id});
      }

      // Novo usuário: cria o login (sem precisar confirmar e-mail) e liga à empresa
      if (senha.length < 6) throw new Regra('Informe a senha (pelo menos 6 caracteres).');
      const {data: criado, error: e3} = await adm.auth.admin.createUser({email, password: senha, email_confirm: true, user_metadata: {nome}});
      if (e3 || !criado.user) throw new Regra(/already|registered|exists/i.test(e3?.message || '') ? 'Este e-mail já tem conta no sistema.' : (e3?.message || 'Não foi possível criar o login.'));
      const id = criado.user.id;
      const {error: e4} = await adm.from('usuarios').insert({id, empresa_id: empresa, nome, login: email, perfil, ativo});
      if (e4) { await adm.auth.admin.deleteUser(id); throw e4; }
      await gravarModulos(id, perfil, modulos);
      if (!ativo) await adm.auth.admin.updateUserById(id, {ban_duration: BANIDO});
      return resposta(200, {ok: true, id});
    }

    if (b.acao === 'excluir') {
      const alvo = await doUsuario(b.id);
      if (alvo.id === eu.id) throw new Regra('Você não pode excluir o seu próprio usuário.');
      if (alvo.perfil === 'ADMIN' && alvo.ativo && await unicoAdmin(alvo.id)) throw new Regra('Não é possível excluir o único administrador ativo.');
      // Excluir o login apaga o usuário e os módulos dele (ligação em cascata no banco)
      const {error} = await adm.auth.admin.deleteUser(alvo.id);
      if (error) throw error;
      return resposta(200, {ok: true});
    }

    return resposta(400, {erro: 'Ação inválida.'});
  } catch (e) {
    if (e instanceof Regra) return resposta(400, {erro: e.message});
    console.error(e);
    return resposta(500, {erro: 'Erro no servidor: ' + ((e as Error)?.message || String(e))});
  }
});
