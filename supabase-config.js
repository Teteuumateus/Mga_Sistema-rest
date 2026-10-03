// =====================================================================
// ---- MGA · ligação com o Supabase (banco de dados na nuvem) ----
// =====================================================================
// Conexão com o Supabase (a chave publishable pode ficar no navegador; quem protege os dados é o RLS)
// NUNCA coloque aqui a chave secreta (service_role / sb_secret_...): ela dá acesso total ao banco.
// Precisa da biblioteca supabase-js carregada antes (CDN nas páginas login.html e mga-sistema.html).
const SUPABASE_URL = 'https://pmrlintqicsfohqyirhh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HE0ehNwkLJXbT0gg4a0Jpg_xRzJf6zX';

window.MGA_SUPABASE = {url: SUPABASE_URL, anonKey: SUPABASE_KEY};
// Sem internet a biblioteca não carrega: o sistema segue funcionando com os dados do navegador
window.supa = window.supabase ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
