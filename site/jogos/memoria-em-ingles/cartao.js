// Memória em Inglês — cartão na lista de jogos. O jogo em si (jogo.js) só carrega ao clicar em Jogar.
(() => {
  // desenho do cartão e da tela inicial: três cartas na mesa (verso, palavra e figura)
  const ART = `
    <g transform="translate(46 64) rotate(-12)">
      <rect x="-30" y="-40" width="60" height="80" rx="9" fill="#7c5ce6" stroke="#f4f6fa" stroke-width="3"/>
      <rect x="-22" y="-32" width="44" height="64" rx="6" fill="none" stroke="#f4f6fa" stroke-opacity=".35" stroke-width="2" stroke-dasharray="4 4"/>
      <text y="14" text-anchor="middle" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="40" fill="#f4f6fa">?</text>
    </g>
    <g transform="translate(110 58)">
      <rect x="-32" y="-42" width="64" height="84" rx="9" fill="#f4f6fa" stroke="#ffb238" stroke-width="3"/>
      <text y="7" text-anchor="middle" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="19" fill="#14284b">apple</text>
      <rect x="-14" y="18" width="28" height="4" rx="2" fill="#4fd16e"/>
    </g>
    <g transform="translate(174 64) rotate(12)">
      <rect x="-30" y="-40" width="60" height="80" rx="9" fill="#f4f6fa" stroke="#ffb238" stroke-width="3"/>
      <path d="M0 -14 q 3 -10 12 -12 q -2 9 -12 12z" fill="#4fd16e"/>
      <path d="M0 -10 c -14 -8 -26 2 -24 16 c 2 14 12 22 18 20 q 6 -2 12 0 c 6 2 16 -6 18 -20 c 2 -14 -10 -24 -24 -16z" fill="#ff4f6b"/>
      <path d="M0 -12 v -8" stroke="#6b3f1d" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g fill="#ffb238"><circle cx="140" cy="10" r="3"/><circle cx="206" cy="24" r="2.5"/><circle cx="18" cy="16" r="2.5"/></g>`;
  const artSVG = attrs => `<svg viewBox="0 0 220 120" ${attrs}>${ART}</svg>`;
  window.MemoriaEmIngles = { artSVG };

  const NIVEIS = [['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil']];
  Plataforma.register({
    id:'memoria', storage:'memoria', title:'Memória em Inglês', tags:['Inglês', 'Memória'],
    desc:'Vire as cartas e junte cada palavra em inglês com a sua figura. O jogo fala a palavra para você ouvir.',
    styles:['jogos/memoria-em-ingles/jogo.css'],
    scripts:['jogos/memoria-em-ingles/jogo.js'],
    art:() => artSVG('role="img" aria-label="Memória em Inglês"'),
    stats(storage) {   // estrelas somadas dos 3 níveis + nível mais alto liberado (terminar um nível abre o próximo)
      const estrelas = NIVEIS.map(([id]) => +storage.load(`stars_${id}`, 0) || 0);
      const total = estrelas.reduce((a, b) => a + b, 0);
      if (!total) return 'Nenhuma partida ainda';
      const k = estrelas.findIndex(s => !s), ate = NIVEIS[k === -1 ? 2 : k][1];   // primeiro nível ainda sem estrelas
      return `${total} de 9 estrelas · Até o ${ate}`;
    },
  });
})();
