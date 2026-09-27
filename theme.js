// ---- Tema claro / escuro (compartilhado entre login e sistema) ----
// Carregado no <head> para aplicar o tema antes da página pintar.
(function(){
  const CHAVE = 'mga_tema';
  function lerTema(){
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE));
      if (salvo === 'dark' || salvo === 'light') return salvo;
    } catch(e) { /* storage indisponível */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function aplicarTema(tema){
    document.documentElement.setAttribute('data-theme', tema);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const escuro = tema === 'dark';
      btn.setAttribute('aria-checked', String(escuro));
      btn.setAttribute('aria-label', escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro');
      btn.title = escuro ? 'Tema escuro' : 'Tema claro';
    });
  }
  aplicarTema(lerTema());

  document.addEventListener('DOMContentLoaded', () => {
    aplicarTema(lerTema());
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const novo = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(CHAVE, JSON.stringify(novo)); } catch(e) { /* storage indisponível */ }
        aplicarTema(novo);
      });
    });
  });
})();
