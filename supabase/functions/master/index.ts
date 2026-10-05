// =====================================================================
// MGA · Edge Function "master": a MGA Tecnologia cria as empresas clientes e os administradores delas
// =====================================================================
// Roda no servidor do Supabase, com a chave secreta (service_role), que nunca vai para o navegador.
// Só quem está na tabela "masters" pode usar.
// Chamada pelo painel master.html com: supa.functions.invoke('master', {body: {acao: ..., ...}})
import {createClient} from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

class Regra extends Error {}
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), {status, headers: {...CORS, 'Content-Type': 'application/json'}});
const txt = (v: unknown) => String(v ?? '').trim();
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS});
  try {
    const adm = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth: {persistSession: false}});
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const {data: {user}, error: erroLogin} = await adm.auth.getUser(token);
    if (erroLogin || !user) return resposta(401, {erro: 'Sua sessão expirou. Saia e entre de novo.'});
    const {data: master} = await adm.from('masters').select('id').eq('id', user.id).maybeSingle();
    if (!master) return resposta(403, {erro: 'Acesso só para o usuário master.'});
    const b = await req.json();

    // Cria o login (já confirmado, sem e-mail de confirmação)
    const criarLogin = async (email: string, senha: string, nome: string) => {
      if (!emailValido(email)) throw new Regra('Informe um e-mail válido para o administrador (é com ele que o cliente entra).');
      if (senha.length < 6) throw new Regra('A senha do administrador precisa ter pelo menos 6 caracteres.');
      const {data, error} = await adm.auth.admin.createUser({email, password: senha, email_confirm: true, user_metadata: {nome}});
      if (error || !data.user) throw new Regra(/already|registered|exists/i.test(error?.message || '') ? 'Este e-mail já tem conta no sistema. Use outro e-mail.' : (error?.message || 'Não foi possível criar o login.'));
      return data.user.id;
    };

    if (b.acao === 'listar') {
      const {data: empresas, error: e1} = await adm.from('empresas').select('id, nome, cnpj, telefone, ativo, criado_em').order('criado_em', {ascending: false});
      if (e1) throw e1;
      const {data: usuarios, error: e2} = await adm.from('usuarios').select('id, empresa_id, nome, login, perfil, ativo');
      if (e2) throw e2;
      return resposta(200, {empresas: (empresas || []).map(e => {
        const daEmpresa = (usuarios || []).filter(u => u.empresa_id === e.id);
        return {...e, usuarios: daEmpresa.length, admins: daEmpresa.filter(u => u.perfil === 'ADMIN').map(({id, nome, login, ativo}) => ({id, nome, login, ativo}))};
      })});
    }

    if (b.acao === 'criar_empresa') {
      const nome = txt(b.nome), cnpj = txt(b.cnpj), telefone = txt(b.telefone);
      const adminNome = txt(b.admin_nome), email = txt(b.admin_email).toLowerCase(), senha = String(b.admin_senha || '');
      if (!nome) throw new Regra('Informe o nome do restaurante.');
      if (!adminNome) throw new Regra('Informe o nome do administrador.');
      const id = await criarLogin(email, senha, adminNome);
      const {data: empresa, error} = await adm.rpc('montar_empresa', {p_usuario: id, p_nome: nome, p_nome_admin: adminNome, p_login: email});
      if (error) { await adm.auth.admin.deleteUser(id); throw error; }
      if (cnpj || telefone) await adm.from('empresas').update({cnpj: cnpj || null, telefone: telefone || null}).eq('id', empresa);
      return resposta(200, {ok: true, empresa, admin: id});
    }

    if (b.acao === 'criar_admin') {
      const empresa = txt(b.empresa_id), nome = txt(b.nome), email = txt(b.email).toLowerCase(), senha = String(b.senha || '');
      const {data: existe} = await adm.from('empresas').select('id').eq('id', empresa).maybeSingle();
      if (!existe) throw new Regra('Empresa não encontrada.');
      if (!nome) throw new Regra('Informe o nome do administrador.');
      const id = await criarLogin(email, senha, nome);
      const {error} = await adm.from('usuarios').insert({id, empresa_id: empresa, nome, login: email, perfil: 'ADMIN', ativo: true});
      if (error) { await adm.auth.admin.deleteUser(id); throw error; }
      return resposta(200, {ok: true, id});
    }

    if (b.acao === 'redefinir_senha') {
      const senha = String(b.senha || '');
      if (senha.length < 6) throw new Regra('A nova senha precisa ter pelo menos 6 caracteres.');
      // Só senhas de usuários de restaurantes (nunca de outro master)
      const {data: alvo} = await adm.from('usuarios').select('id').eq('id', txt(b.usuario_id)).maybeSingle();
      if (!alvo) throw new Regra('Usuário não encontrado.');
      const {error} = await adm.auth.admin.updateUserById(alvo.id, {password: senha});
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
