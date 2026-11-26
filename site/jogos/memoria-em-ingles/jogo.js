// Memória em Inglês — o jogo. Carregado pela plataforma só quando o aluno clica em Jogar.
// Jogo da memória: metade das cartas tem a figura, metade tem a palavra em inglês.
// Vire duas cartas por vez e junte a palavra com a figura. Ao virar uma palavra, o jogo fala a palavra em inglês.
(() => {
  const game = {};
  Plataforma.define('memoria', {
    enter(ctx) { if (!game.ready) init(ctx.root); game.enter(ctx); },
    leave() { game.leave?.(); },
  });

  // Palavras: inglês, figura (emoji) e português (aparece quando o par é encontrado)
  const w = (en, fig, pt) => ({ en, fig, pt });
  const WORDS = {
    animais: [w('dog', '🐶', 'cachorro'), w('cat', '🐱', 'gato'), w('bird', '🐦', 'pássaro'), w('fish', '🐟', 'peixe'),
      w('horse', '🐴', 'cavalo'), w('cow', '🐮', 'vaca'), w('pig', '🐷', 'porco'), w('duck', '🦆', 'pato'),
      w('rabbit', '🐰', 'coelho'), w('lion', '🦁', 'leão'), w('monkey', '🐵', 'macaco'), w('frog', '🐸', 'sapo')],
    comidas: [w('apple', '🍎', 'maçã'), w('banana', '🍌', 'banana'), w('grape', '🍇', 'uva'), w('strawberry', '🍓', 'morango'),
      w('lemon', '🍋', 'limão'), w('pear', '🍐', 'pera'), w('watermelon', '🍉', 'melancia'), w('pineapple', '🍍', 'abacaxi'),
      w('cherry', '🍒', 'cereja'), w('bread', '🍞', 'pão'), w('milk', '🥛', 'leite'), w('egg', '🥚', 'ovo'),
      w('cheese', '🧀', 'queijo'), w('cake', '🍰', 'bolo')],
    escolaCasa: [w('book', '📖', 'livro'), w('pencil', '✏️', 'lápis'), w('scissors', '✂️', 'tesoura'), w('backpack', '🎒', 'mochila'),
      w('ruler', '📏', 'régua'), w('house', '🏠', 'casa'), w('door', '🚪', 'porta'), w('bed', '🛏️', 'cama'),
      w('key', '🔑', 'chave'), w('clock', '⏰', 'relógio'), w('ball', '⚽', 'bola'), w('car', '🚗', 'carro')],
    natureza: [w('sun', '☀️', 'sol'), w('moon', '🌙', 'lua'), w('star', '⭐', 'estrela'), w('tree', '🌳', 'árvore'),
      w('flower', '🌸', 'flor'), w('rain', '🌧️', 'chuva'), w('cloud', '☁️', 'nuvem')],
  };
  // Níveis: quantos pares e de quais temas. Terminar um nível libera o próximo.
  // Estrelas pelo número de jogadas (cada jogada = virar 2 cartas): poucas jogadas = mais estrelas.
  const LEVELS = [
    { id:'facil', name:'Fácil', pairs:6, words:WORDS.animais, topics:'Animais' },
    { id:'medio', name:'Médio', pairs:8, words:WORDS.comidas, topics:'Frutas e comidas' },
    { id:'dificil', name:'Difícil', pairs:10, words:[...WORDS.escolaCasa, ...WORDS.natureza], topics:'Escola, casa e natureza' },
  ];
  const starsFor = (lv, moves) => moves <= Math.ceil(lv.pairs * 1.5) ? 3 : moves <= Math.ceil(lv.pairs * 2.2) ? 2 : 1;
  const starText = n => '★'.repeat(n) + '☆'.repeat(3 - n);

  const MARKUP = `
<div class="mem-hud">
  <div><span>Jogadas</span><b id="mMoves">0</b></div>
  <div><span>Pares</span><b id="mPairs">0/0</b></div>
  <div class="r"><span id="mBestLabel">Recorde</span><b id="mBest">—</b></div>
</div>
<div class="mem-board" id="mBoard" role="grid" aria-label="Cartas da memória"></div>
<p class="mem-tip" id="mTip" hidden role="status"></p>
<div class="mem-toast" id="mToast" hidden role="status"></div>
<button class="mem-sound" id="mSound" aria-pressed="true" aria-label="Desligar sons e voz">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M3 7h3l4-3.5v13L6 13H3z" fill="currentColor"/>
    <g id="mSoundOn" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13 7.2a4 4 0 0 1 0 5.6"/><path d="M15.2 5a7 7 0 0 1 0 10"/></g>
    <g id="mSoundOff" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="display:none"><path d="M13 7.5l5 5M18 7.5l-5 5"/></g>
  </svg>
</button>
<div class="panel" id="mHome" hidden>
  <div class="card">
    <div class="mem-intro">
      ${MemoriaEmIngles.artSVG('class="mem-art" role="img" aria-label="Cartas da memória: verso, palavra e figura"')}
      <h1 id="mTitle">Memória em <em>Inglês</em></h1>
      <p id="mMsg">Junte cada palavra em inglês com a sua figura.</p>
      <p class="mem-stars" id="mStars" hidden></p>
      <p class="mem-who">Jogando como <b id="mWho">—</b> · <button class="link" id="mHubBtn">Todos os jogos</button> · <button class="link" id="mLogout">Trocar jogador</button></p>
      <div class="mem-levels" id="mLevels" role="radiogroup" aria-label="Nível"></div>
      <div class="actions">
        <button id="mPlay">Jogar</button>
        <button id="mHomeBtn" class="alt" hidden>Tela inicial</button>
      </div>
    </div>
    <section class="mem-rules" id="mRules" aria-labelledby="mRulesTitle">
      <h2 id="mRulesTitle">Como jogar</h2>
      <div class="mem-rule"><b>Virar</b><span>Toque em duas cartas. Umas têm figuras, outras têm palavras em inglês.</span></div>
      <div class="mem-rule"><b>Juntar</b><span>Achou a palavra da figura? O par fica aberto e você vê a tradução em português.</span></div>
      <div class="mem-rule"><b>Ouvir</b><span>Cada palavra virada é falada em inglês. Toque num par aberto para ouvir de novo.</span></div>
      <div class="mem-rule"><b>Estrelas</b><span>Quanto menos jogadas, mais estrelas. Termine um nível para liberar o próximo.</span></div>
    </section>
  </div>
</div>`;

  function init(root) {
    root.innerHTML = MARKUP;
    const $ = id => document.getElementById(id);
    let ctx = null, state = 'away', level = LEVELS[0], token = 0;
    let cards = [], open = [], moves = 0, found = 0;
    const bestOf = lv => +ctx.storage.load(`best_${lv.id}`, 0) || 0;     // menor número de jogadas (0 = ainda não terminou)
    const starsOf = lv => +ctx.storage.load(`stars_${lv.id}`, 0) || 0;
    const isOpen = i => i === 0 || starsOf(LEVELS[i - 1]) > 0;

    // --- sons (Web Audio, sem arquivos) e voz em inglês (síntese de fala do navegador) ---
    let actx, muted = false;
    function tone(freq, at, dur, { type = 'triangle', vol = 0.16, to } = {}) {
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + at;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.05);
    }
    const sfx = {
      play(name) {
        if (muted) return;
        try { actx ??= new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); this[name](); } catch {}
      },
      flip()  { tone(620, 0, 0.07, { type:'sine', vol:0.08, to:900 }); },
      match() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.18)); },
      miss()  { tone(300, 0, 0.22, { type:'sine', vol:0.08, to:220 }); },
      win()   { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.28, { vol:0.15 })); },
    };
    const fala = window.speechSynthesis;
    let voz = null;
    const escolherVoz = () => {
      const vozes = fala?.getVoices() ?? [];
      voz = vozes.find(v => v.lang === 'en-US') || vozes.find(v => v.lang?.startsWith('en')) || null;
    };
    if (fala) { escolherVoz(); fala.addEventListener?.('voiceschanged', escolherVoz); }
    function say(text) {
      if (muted || !fala) return;
      try {
        fala.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US'; u.rate = 0.85; if (voz) u.voice = voz;
        fala.speak(u);
      } catch {}
    }
    function setMuted(m) {
      muted = m; ctx.device.save('muted', m);
      if (m) try { fala?.cancel(); } catch {}
      $('mSound').setAttribute('aria-pressed', !m);
      $('mSound').setAttribute('aria-label', m ? 'Ligar sons e voz' : 'Desligar sons e voz');
      $('mSoundOn').style.display = m ? 'none' : ''; $('mSoundOff').style.display = m ? '' : 'none';
    }
    $('mSound').onclick = () => { setMuted(!muted); $('mSound').blur(); if (!muted) sfx.play('match'); };

    // --- mesa: cartas embaralhadas, grade conforme o nível e a tela (deitada ou em pé) ---
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    function layout() {
      const n = level.pairs * 2, portrait = innerWidth < innerHeight;
      const [cols, rows] = n === 12 ? (portrait ? [3, 4] : [4, 3]) : n === 16 ? [4, 4] : (portrait ? [4, 5] : [5, 4]);
      $('mBoard').style.setProperty('--cols', cols); $('mBoard').style.setProperty('--rows', rows);
    }
    addEventListener('resize', () => { if (state !== 'away') layout(); });

    function deal() {
      const words = shuffle(level.words).slice(0, level.pairs);
      cards = shuffle(words.flatMap((wd, i) => [{ pair:i, wd, kind:'fig' }, { pair:i, wd, kind:'word' }]));
      $('mBoard').innerHTML = cards.map((c, i) => `
        <button class="mem-card" data-i="${i}" aria-label="Carta ${i + 1}, virada para baixo">
          <span class="mem-inner">
            <span class="mem-face mem-back" aria-hidden="true">?</span>
            <span class="mem-face mem-front ${c.kind}" aria-hidden="true"${c.kind === 'word' ? ' lang="en"' : ''}>${c.kind === 'fig' ? c.wd.fig : c.wd.en}</span>
          </span>
        </button>`).join('');
      layout();
    }
    const cardEl = i => $('mBoard').children[i];
    function label(i) {
      const c = cards[i], el = cardEl(i);
      if (!el.classList.contains('up')) return el.setAttribute('aria-label', `Carta ${i + 1}, virada para baixo`);
      const what = c.kind === 'fig' ? `figura de ${c.wd.pt}` : `palavra ${c.wd.en}`;
      el.setAttribute('aria-label', `Carta ${i + 1}: ${what}${el.classList.contains('done') ? ', par encontrado' : ''}`);
    }
    function showHud() {
      $('mMoves').textContent = moves; $('mPairs').textContent = `${found}/${level.pairs}`;
    }

    $('mBoard').addEventListener('click', async e => {
      const el = e.target.closest('.mem-card'); if (!el || state !== 'play') return;
      const i = +el.dataset.i, c = cards[i];
      if (el.classList.contains('done')) return say(c.wd.en);   // par já aberto: só ouvir de novo
      if (el.classList.contains('up') || open.length === 2) return;
      el.classList.add('up'); label(i); sfx.play('flip');
      if (c.kind === 'word') say(c.wd.en);
      open.push(i);
      if (open.length < 2) return;
      moves++; showHud();
      const [a, b] = open, t = token;
      if (cards[a].pair === cards[b].pair) {
        open = []; found++; showHud();
        for (const k of [a, b]) { cardEl(k).classList.add('done'); label(k); }
        sfx.play('match');
        if (c.kind === 'fig') say(c.wd.en);   // virou a figura por último: fala a palavra do par
        tip(`${c.wd.fig} ${c.wd.en} = ${c.wd.pt}`);
        if (found === level.pairs) { await wait(1100); if (t === token) win(); }
      } else {
        await wait(1000); if (t !== token) return;
        sfx.play('miss');
        for (const k of [a, b]) { cardEl(k).classList.remove('up'); label(k); }
        open = [];
      }
    });
    function tip(text) { $('mTip').textContent = text; $('mTip').hidden = false; }

    // --- telas ---
    function start() {
      token++; state = 'play'; open = []; moves = 0; found = 0;
      deal(); showHud();
      $('mHome').hidden = true; $('mTip').hidden = true;
      $('mBoard').hidden = false; cardEl(0)?.focus({ preventScroll:true });
    }
    function win() {
      token++; state = 'over'; sfx.play('win');
      const i = LEVELS.indexOf(level), next = LEVELS[i + 1], wasOpen = next && isOpen(i + 1);
      const stars = starsFor(level, moves), best = bestOf(level), recorde = !best || moves < best;
      if (recorde) ctx.storage.save(`best_${level.id}`, moves);
      if (stars > starsOf(level)) ctx.storage.save(`stars_${level.id}`, stars);
      showBest();
      $('mTitle').innerHTML = 'Muito <em>bem!</em>';
      $('mMsg').textContent = `Você achou os ${level.pairs} pares em ${moves} jogadas no nível ${level.name}.` +
        (recorde ? ' Novo recorde!' : ` Recorde: ${best} jogadas.`);
      $('mStars').textContent = starText(stars); $('mStars').setAttribute('aria-label', `${stars} de 3 estrelas`); $('mStars').hidden = false;
      $('mPlay').textContent = 'Jogar de novo';
      $('mRules').hidden = true; $('mLevels').hidden = true; $('mHomeBtn').hidden = false;
      $('mHome').hidden = false; $('mPlay').focus();
      if (next && !wasOpen && isOpen(i + 1)) toast(`Nível ${next.name} liberado! Escolha na tela inicial.`);
    }
    const intro = { title:$('mTitle').innerHTML, msg:$('mMsg').textContent };
    function goHome() {
      token++; state = 'menu'; open = [];
      $('mTip').hidden = true; $('mBoard').hidden = true; $('mStars').hidden = true;
      $('mTitle').innerHTML = intro.title; $('mMsg').textContent = intro.msg; $('mPlay').textContent = 'Jogar';
      $('mRules').hidden = false; $('mLevels').hidden = false; $('mHomeBtn').hidden = true;
      renderLevels(); $('mHome').hidden = false; $('mPlay').focus();
    }

    // --- níveis ---
    const LOCK = `<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    function showBest() {
      const best = bestOf(level);
      $('mBest').textContent = best || '—';
      $('mBestLabel').innerHTML = `Recorde<i class="mem-lv"> · ${level.name}</i>`;
    }
    function setLevel(lv) { level = lv; ctx.storage.save('level', lv.id); showBest(); }
    function renderLevels() {
      $('mLevels').innerHTML = LEVELS.map((lv, i) => {
        const ok = isOpen(i), best = bestOf(lv);
        return `<button class="mem-level${ok ? '' : ' locked'}" role="radio" aria-checked="${lv === level}" data-lv="${i}"${ok ? '' : ' aria-disabled="true"'}>
          <b>${lv.name}</b><small>${lv.topics} · ${lv.pairs} pares</small>
          <em>${ok ? (best ? `${starText(starsOf(lv))} · ${best} jogadas` : 'Ainda não jogou') : `${LOCK} Termine o ${LEVELS[i - 1].name}`}</em></button>`;
      }).join('');
    }
    $('mLevels').onclick = e => {
      const b = e.target.closest('[data-lv]'); if (!b) return;
      const i = +b.dataset.lv;
      if (!isOpen(i)) return toast(`Termine o nível ${LEVELS[i - 1].name} para liberar o ${LEVELS[i].name}.`);
      setLevel(LEVELS[i]); renderLevels();
    };
    let toastTimer;
    function toast(text) {
      $('mToast').textContent = text; $('mToast').hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => $('mToast').hidden = true, 3500);
    }
    $('mPlay').onclick = start;
    $('mHomeBtn').onclick = goHome;
    $('mHubBtn').onclick = () => ctx.exit();
    $('mLogout').onclick = () => ctx.logout();
    addEventListener('keydown', e => {
      if (e.key === 'Enter' && (state === 'menu' || state === 'over') && document.activeElement?.tagName !== 'BUTTON') start();
    });

    // --- entrada e saída pela plataforma ---
    game.enter = c => {
      ctx = c; $('mWho').textContent = c.user.name;
      const saved = LEVELS.findIndex(lv => lv.id === c.storage.load('level', 'facil'));
      setLevel(LEVELS[saved > 0 && isOpen(saved) ? saved : 0]);
      setMuted(c.device.load('muted', false));
      goHome();
    };
    game.leave = () => { token++; state = 'away'; try { fala?.cancel(); } catch {} };
    game.ready = true;
  }
})();
