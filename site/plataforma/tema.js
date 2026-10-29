// Modo claro / escuro das telas da plataforma (os jogos têm cores próprias e não mudam).
// Carrega no <head>, antes da página aparecer, para não piscar na cor errada.
// Sem escolha salva, segue a preferência do aparelho; o botão [data-tema-btn] alterna e lembra neste navegador.
(() => {
  const CHAVE = 'turma:tema', raiz = document.documentElement;
  let salvo = null;
  try { salvo = localStorage.getItem(CHAVE); } catch {}
  raiz.dataset.tema = salvo === 'claro' || salvo === 'escuro' ? salvo
    : matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro';

  function atualizar() {
    const claro = raiz.dataset.tema === 'claro';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', claro ? '#e6f4fd' : '#0b1624');
    for (const b of document.querySelectorAll('[data-tema-btn]')) {
      b.setAttribute('aria-label', claro ? 'Mudar para o modo escuro' : 'Mudar para o modo claro');
      b.title = b.getAttribute('aria-label');
    }
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-tema-btn]')) return;
    raiz.dataset.tema = raiz.dataset.tema === 'claro' ? 'escuro' : 'claro';
    try { localStorage.setItem(CHAVE, raiz.dataset.tema); } catch {}
    atualizar();
  });
  document.addEventListener('DOMContentLoaded', atualizar);
})();
