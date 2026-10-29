// Cobra Tabuada — cartão na lista de jogos + desenho e cores da cobra, compartilhados com o jogo.
// Arquivo leve: carrega junto com a plataforma. O jogo em si (jogo.js) só carrega ao clicar em Jogar.
(() => {
  const COLORS = [
    { name:'Verde', h:.36 }, { name:'Ciano', h:.5 }, { name:'Azul', h:.6 }, { name:'Roxo', h:.75 },
    { name:'Rosa', h:.9 }, { name:'Vermelho', h:.995 }, { name:'Laranja', h:.07 }, { name:'Dourado', h:.13 },
    { name:'Preto', h:.62, s:.18, lk:.4, css:'#1b1f27',
      // o logo é desenhado sobre fundo escuro: tons próprios + contorno para a cobra não sumir
      logo:{ main:'#2b303b', dark:'#171a21', light:'#7a8497', head:'#363d4b', rim:'#5a6780' } },
    { name:'Camaleão', rainbow:true, css:'conic-gradient(#4fd16e, #3fc6d8, #5a78e6, #b05ae6, #e65aa8, #e6a25a, #d8d23f, #4fd16e)' },
  ];
  const ACCESSORIES = { cowboy:'Cowboy', headset:'Headset', astro:'Astronauta', santa:'Papai Noel' };
  const UNLOCK = { santa:10 };   // prêmios: pontos de recorde necessários para liberar
  const wrap = h => (h % 1 + 1) % 1;
  // matiz de cada segmento: camaleão muda com o tempo e ondula ao longo do corpo
  const hue = (skin, i, n, now) => {
    const c = COLORS[skin.color];
    return wrap(c.rainbow ? now * 0.08 + i * 0.035 : c.h - i / Math.max(n, 12) * 0.06);
  };
  const validSkin = (saved, best) => {
    const s = { acc:'cowboy', color:0, ...saved };
    return ACCESSORIES[s.acc] && COLORS[s.color] && (UNLOCK[s.acc] ?? 0) <= best ? s : { acc:'cowboy', color:0 };
  };

  // desenho da cobra (logo e cartão); cores vêm de --sk-main, --sk-dark, --sk-light, --sk-head, --sk-rim
  const LOGO = `
    <path d="M22 100 C 50 40, 78 128, 112 82 S 150 38, 164 62" fill="none" style="stroke:var(--sk-rim, transparent)" stroke-width="27" stroke-linecap="round"/>
    <path d="M22 100 C 50 40, 78 128, 112 82 S 150 38, 164 62" fill="none" style="stroke:var(--sk-main)" stroke-width="22" stroke-linecap="round"/>
    <path d="M22 100 C 50 40, 78 128, 112 82 S 150 38, 164 62" fill="none" style="stroke:var(--sk-dark)" stroke-width="22" stroke-linecap="round" stroke-dasharray="3 15"/>
    <path d="M26 96 C 52 46, 78 120, 110 78 S 148 44, 160 60" fill="none" style="stroke:var(--sk-light)" stroke-width="5" stroke-linecap="round" opacity=".55"/>
    <ellipse cx="176" cy="56" rx="26" ry="19" style="fill:var(--sk-head); stroke:var(--sk-rim, transparent)" stroke-width="2.5"/>
    <ellipse cx="170" cy="62" rx="14" ry="7" style="fill:var(--sk-light)" opacity=".5"/>
    <circle cx="180" cy="46" r="7" fill="#fff"/><circle cx="182" cy="46" r="3.5" fill="#0b1624"/>
    <circle cx="164" cy="47" r="6" fill="#fff"/><circle cx="166" cy="47" r="3" fill="#0b1624"/>
    <path d="M200 60 q 5 1 10 0 m-4 0 l6 -5 m-6 5 l6 5" fill="none" stroke="#ff4f8b" stroke-width="3" stroke-linecap="round"/>
    <path d="M186 64 q 8 4 14 -2" fill="none" style="stroke:var(--sk-dark)" stroke-width="2.5" stroke-linecap="round"/>
    <g class="acc" data-acc="headset">
      <path d="M159 58 C 150 24, 196 18, 198 44" fill="none" stroke="#1c2230" stroke-width="6" stroke-linecap="round"/>
      <rect x="152" y="52" width="15" height="20" rx="6" fill="#1c2230"/>
      <circle cx="159.5" cy="62" r="4" fill="#4fd1e0"/>
      <path d="M162 71 Q 176 80 190 72" fill="none" stroke="#1c2230" stroke-width="3" stroke-linecap="round"/>
      <circle cx="191" cy="71" r="4" fill="#4fd1e0"/>
    </g>
    <g class="acc" data-acc="astro">
      <ellipse cx="172" cy="84" rx="28" ry="7" fill="#eef2f7"/>
      <circle cx="176" cy="52" r="34" fill="#bfe6ff" fill-opacity=".22" stroke="#dfefff" stroke-width="2.5"/>
      <path d="M152 36 A 28 28 0 0 1 170 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <path d="M196 25 L203 11" stroke="#cfd6e0" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="204" cy="9" r="4" fill="#ff4f8b"/>
    </g>
    <g class="acc" data-acc="santa">
      <path d="M153 36 Q 168 0 198 10 Q 214 16 214 40 Q 206 24 196 32 Z" fill="#d62839"/>
      <rect x="148" y="29" width="54" height="11" rx="5.5" fill="#f4f6fa" transform="rotate(-5 175 34)"/>
      <circle cx="214" cy="43" r="6" fill="#f4f6fa"/>
    </g>
    <g class="acc" data-acc="cowboy"><g transform="rotate(-10 175 34)">
      <path d="M157 34 C 156 22, 158 14, 164 11 Q 175 17 186 11 C 192 14, 194 22, 193 34 Z" fill="#a0692f"/>
      <path d="M175 15 L175 27" stroke="#7a4c22" stroke-width="2" stroke-linecap="round"/>
      <rect x="156.5" y="28" width="37" height="6" fill="#4a2c12"/>
      <rect x="170" y="28.5" width="6" height="5" rx="1" fill="#ffb238"/>
      <path d="M132 36 Q 138 26 149 32 Q 175 40 201 32 Q 212 26 218 36 Q 175 50 132 36 Z" fill="#8b5a2b"/>
    </g></g>`;
  const logoSVG = attrs => `<svg viewBox="0 -6 224 136" ${attrs}>${LOGO}</svg>`;
  // pinta o desenho com a cor e o acessório escolhidos
  function paintLogo(el, skin, now = 0) {
    const c = COLORS[skin.color], h = hue(skin, 0, 1, now) * 360, sk = (c.s ?? .7) / .7, lk = c.lk ?? 1;
    for (const [v, s, l] of [['main', 55, 40], ['dark', 60, 30], ['light', 65, 73], ['head', 52, 49]])
      el.style.setProperty(`--sk-${v}`, c.logo?.[v] ?? `hsl(${h} ${s * sk}% ${l * lk}%)`);
    el.style.setProperty('--sk-rim', c.logo?.rim ?? 'transparent');
    el.querySelectorAll('.acc').forEach(g => g.style.display = g.dataset.acc === skin.acc ? '' : 'none');
  }

  window.CobraTabuada = { COLORS, ACCESSORIES, UNLOCK, hue, validSkin, logoSVG, paintLogo };

  const bestOf = storage => +storage.load('best', 0) || 0;
  Plataforma.register({
    id:'cobra', storage:'cobra', title:'Cobra Tabuada', tags:['Matemática', 'Tabuada 1–1000'],
    desc:'Guie a cobra até os orbes e responda a tabuada para continuar crescendo.',
    styles:['jogos/cobra-tabuada/jogo.css'],
    // biblioteca 3D de fora, com a "impressão digital" oficial (SRI): o navegador recusa o arquivo se ele for alterado
    scripts:[{ src:'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
      integrity:'sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==' },
      'jogos/cobra-tabuada/jogo.js'],
    art(storage) {
      const box = document.createElement('div');
      box.innerHTML = logoSVG('role="img" aria-label="Cobra Tabuada"');
      paintLogo(box.firstElementChild, validSkin(storage.load('skin', {}), bestOf(storage)));
      return box.innerHTML;
    },
    stats(storage) {
      const m = storage.load('medals', []).length;
      return `Recorde ${bestOf(storage)} · ${m} medalha${m === 1 ? '' : 's'}`;
    },
  });
})();
