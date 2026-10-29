// Gol de Inglês — cartão na lista de jogos. O jogo em si (jogo.js) só carrega ao clicar em Jogar.
(() => {
  // desenho do cartão e da tela inicial: gol com rede, goleiro e bola
  const ART = `
    <defs><pattern id="golArtNet" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M0 0L10 10M10 0L0 10" stroke="#fff" stroke-opacity=".3"/></pattern></defs>
    <rect x="20" y="22" width="180" height="84" fill="#0b1624" opacity=".35"/>
    <rect x="20" y="22" width="180" height="84" fill="url(#golArtNet)"/>
    <path d="M14 108V16H206V108" fill="none" stroke="#f4f6fa" stroke-width="8" stroke-linejoin="round"/>
    <path d="M0 108H220" stroke="#e9f5ec" stroke-opacity=".6" stroke-width="2"/>
    <g transform="translate(92 106) rotate(-24)">
      <rect x="-9" y="-26" width="7" height="26" rx="3" fill="#1c2230"/><rect x="2" y="-26" width="7" height="26" rx="3" fill="#1c2230"/>
      <rect x="-14" y="-64" width="28" height="40" rx="8" fill="#ff4f8b"/>
      <rect x="-26" y="-92" width="8" height="30" rx="4" fill="#ff4f8b" transform="rotate(-18 -22 -64)"/>
      <rect x="18" y="-92" width="8" height="30" rx="4" fill="#ff4f8b" transform="rotate(18 22 -64)"/>
      <circle cx="-28" cy="-92" r="6" fill="#4fd16e"/><circle cx="28" cy="-92" r="6" fill="#4fd16e"/>
      <circle cy="-76" r="10" fill="#e0ac69"/>
    </g>
    <g transform="translate(158 46)">
      <circle r="13" fill="#fff" stroke="#0b1624" stroke-width="1.5"/>
      <path d="M0 -5L4.8 -1.6L3 4H-3L-4.8 -1.6Z" fill="#0b1624"/>
    </g>
    <path d="M186 60 q -14 30 -40 50" fill="none" stroke="#ffb238" stroke-width="2" stroke-dasharray="3 5" opacity=".7"/>`;
  const artSVG = attrs => `<svg viewBox="0 0 220 120" ${attrs}>${ART}</svg>`;
  window.GolDeIngles = { artSVG };

  Plataforma.register({
    id:'gol', storage:'gol', title:'Gol de Inglês', tags:['Inglês', 'Vocabulário'],
    desc:'Bata o pênalti, faça o gol e traduza a palavra do inglês para o português (ou o contrário).',
    styles:['jogos/gol-de-ingles/jogo.css'],
    scripts:['jogos/gol-de-ingles/jogo.js'],
    art:() => artSVG('role="img" aria-label="Gol de Inglês"'),
    stats(storage) {   // maior recorde entre os níveis + nível mais alto liberado (5 gols abrem o próximo)
      const [f, m, d] = [+storage.load('best_facil', storage.load('best', 0)) || 0,
        +storage.load('best_medio', 0) || 0, +storage.load('best_dificil', 0) || 0];
      const best = Math.max(f, m, d), top = f < 5 ? 'Fácil' : m < 5 ? 'Médio' : 'Difícil';
      return `Recorde ${best} gol${best === 1 ? '' : 's'} · Até o ${top}`;
    },
  });
})();
