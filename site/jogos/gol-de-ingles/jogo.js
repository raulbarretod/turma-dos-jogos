// Gol de Inglês — o jogo. Carregado pela plataforma só quando o aluno clica em Jogar.
// Pênalti: clique dentro do gol para chutar. O goleiro pula, chega perto, mas nunca pega.
// Fora ou na trave = fim. Depois do gol, traduza a palavra (inglês ⇄ português).
(() => {
  const game = {};
  Plataforma.define('gol', {
    enter(ctx) { if (!game.ready) init(ctx.root); game.enter(ctx); },
    leave() { game.leave?.(); },
  });

  // Palavras: 'inglês|alternativa', 'português|alternativa' — a primeira de cada lado é a que aparece;
  // as outras também valem como resposta (ex.: masculino e feminino).
  const w = (en, pt) => ({ en:en.split('|'), pt:pt.split('|') });
  const WORDS = {
    cores: [w('red', 'vermelho|vermelha'), w('blue', 'azul'), w('green', 'verde'), w('yellow', 'amarelo|amarela'),
      w('black', 'preto|preta|negro'), w('white', 'branco|branca'), w('orange', 'laranja'), w('purple', 'roxo|roxa|violeta'),
      w('pink', 'rosa|cor-de-rosa|cor de rosa'), w('brown', 'marrom|castanho'), w('gray|grey', 'cinza|cinzento')],
    animais: [w('dog', 'cachorro|cão|cachorra'), w('cat', 'gato|gata'), w('bird', 'pássaro|ave|passarinho'), w('fish', 'peixe'),
      w('horse', 'cavalo'), w('cow', 'vaca'), w('pig', 'porco'), w('duck', 'pato'), w('rabbit', 'coelho'),
      w('lion', 'leão'), w('monkey', 'macaco'), w('frog', 'sapo|rã')],
    frutas: [w('apple', 'maçã'), w('grape', 'uva'), w('strawberry', 'morango'), w('lemon', 'limão'), w('pear', 'pera'),
      w('watermelon', 'melancia'), w('pineapple', 'abacaxi'), w('mango', 'manga'), w('banana', 'banana')],
    escola: [w('book', 'livro'), w('pencil', 'lápis'), w('pen', 'caneta'), w('eraser', 'borracha'), w('ruler', 'régua'),
      w('notebook', 'caderno'), w('backpack', 'mochila'), w('teacher', 'professor|professora'),
      w('student', 'aluno|aluna|estudante'), w('scissors', 'tesoura')],
    casa: [w('house', 'casa'), w('door', 'porta'), w('window', 'janela'), w('chair', 'cadeira'), w('table', 'mesa'),
      w('bed', 'cama'), w('kitchen', 'cozinha'), w('bathroom', 'banheiro'), w('key', 'chave'), w('clock', 'relógio')],
  };
  // Níveis: palavras, tempo para traduzir (0 = sem tempo) e largura da faixa da trave que faz perder.
  // Cada nível abre ao fazer UNLOCK_GOALS gols no nível anterior.
  const UNLOCK_GOALS = 5;
  const LEVELS = [
    { id:'facil', name:'Fácil', words:WORDS.cores, topics:'Cores', time:0, post:4 },
    { id:'medio', name:'Médio', words:[...WORDS.animais, ...WORDS.frutas], topics:'Animais e frutas', time:20, post:16 },
    { id:'dificil', name:'Difícil', words:[...WORDS.escola, ...WORDS.casa], topics:'Escola e casa', time:12, post:30 },
  ];

  const MARKUP = `
<svg class="gol-scene" id="gScene" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" aria-label="Campo com o gol: clique dentro do gol para chutar">
  <defs>
    <linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1624"/><stop offset="1" stop-color="#17345c"/></linearGradient>
    <radialGradient id="gLight"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <pattern id="gNet" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M0 0L16 16M16 0L0 16" stroke="#fff" stroke-opacity=".3"/></pattern>
  </defs>
  <rect width="800" height="262" fill="url(#gSky)"/>
  <circle cx="90" cy="30" r="80" fill="url(#gLight)" opacity=".3"/><circle cx="710" cy="30" r="80" fill="url(#gLight)" opacity=".3"/>
  <g id="gCrowd"></g>
  <rect y="242" width="800" height="278" fill="#1d7a45"/>
  <g fill="#1a6e3e"><rect x="0" y="242" width="100" height="278"/><rect x="200" y="242" width="100" height="278"/>
    <rect x="400" y="242" width="100" height="278"/><rect x="600" y="242" width="100" height="278"/></g>
  <path d="M110 330H690M150 330L110 392H690L650 330" fill="none" stroke="#e9f5ec" stroke-opacity=".7" stroke-width="3"/>
  <circle cx="400" cy="470" r="4" fill="#e9f5ec"/>
  <g class="gol-net" id="gNetG">
    <rect x="192" y="132" width="416" height="198" fill="#0b1624" opacity=".4"/>
    <rect x="192" y="132" width="416" height="198" fill="url(#gNet)"/>
  </g>
  <!-- faixa rosa junto às traves: acertar aqui conta como trave (maior nos níveis difíceis) -->
  <g id="gDanger" fill="#ff4f8b" opacity=".28">
    <rect id="gDangerL" x="192" y="132" width="0" height="198"/><rect id="gDangerR" x="608" y="132" width="0" height="198"/>
    <rect id="gDangerT" x="192" y="132" width="416" height="0"/>
  </g>
  <g fill="#f4f6fa">
    <rect x="180" y="120" width="12" height="212" rx="3"/><rect x="608" y="120" width="12" height="212" rx="3"/>
    <rect x="180" y="120" width="440" height="12" rx="3"/>
  </g>
  <!-- goleiro depois das traves: fica na frente delas, não atrás -->
  <g id="gKeeper" transform="translate(400 330)">
    <rect x="-15" y="-44" width="11" height="44" rx="4" fill="#1c2230"/>
    <rect x="4" y="-44" width="11" height="44" rx="4" fill="#1c2230"/>
    <rect x="-19" y="-62" width="38" height="22" rx="6" fill="#0f1d2f"/>
    <rect x="-44" y="-152" width="12" height="50" rx="6" fill="#ff4f8b" transform="rotate(-22 -38 -104)"/>
    <rect x="32" y="-152" width="12" height="50" rx="6" fill="#ff4f8b" transform="rotate(22 38 -104)"/>
    <rect x="-24" y="-112" width="48" height="54" rx="12" fill="#ff4f8b"/>
    <text y="-78" text-anchor="middle" font-family="Chakra Petch, sans-serif" font-weight="700" font-size="18" fill="#0b1624">1</text>
    <circle cx="-56" cy="-150" r="10" fill="#4fd16e"/><circle cx="56" cy="-150" r="10" fill="#4fd16e"/>
    <circle cy="-128" r="15" fill="#e0ac69"/>
    <path d="M-15 -130 a15 15 0 0 1 30 0 q-15 -6 -30 0z" fill="#3a2412"/>
  </g>
  <ellipse id="gShadow" cx="400" cy="490" rx="22" ry="6" fill="#000" opacity=".35"/>
  <g id="gBall" transform="translate(400 468)">
    <circle r="22" fill="#fff" stroke="#0b1624" stroke-width="2"/>
    <path d="M0 -8L7.6 -2.5L4.7 6.5H-4.7L-7.6 -2.5Z" fill="#0b1624"/>
    <path d="M0 -8V-21M7.6 -2.5L20 -7M4.7 6.5L12 17M-4.7 6.5L-12 17M-7.6 -2.5L-20 -7" stroke="#0b1624" stroke-width="2"/>
  </g>
</svg>
<div class="gol-hud">
  <div><span>Gols</span><b id="gScore">0</b></div>
  <div class="r"><span id="gBestLabel">Recorde</span><b id="gBest">0</b></div>
</div>
<div class="gol-toast" id="gToast" hidden role="status"></div>
<p class="gol-tip" id="gTip" hidden>Clique dentro do gol para chutar</p>
<div class="gol-flash" id="gFlash" hidden aria-live="assertive"></div>
<button class="gol-sound" id="gSound" aria-pressed="true" aria-label="Desligar sons">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M3 7h3l4-3.5v13L6 13H3z" fill="currentColor"/>
    <g id="gSoundOn" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13 7.2a4 4 0 0 1 0 5.6"/><path d="M15.2 5a7 7 0 0 1 0 10"/></g>
    <g id="gSoundOff" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="display:none"><path d="M13 7.5l5 5M18 7.5l-5 5"/></g>
  </svg>
</button>
<div class="panel" id="gHome" hidden>
  <div class="card">
    <div class="gol-intro">
      ${GolDeIngles.artSVG('class="gol-art" role="img" aria-label="Gol, goleiro e bola"')}
      <h1 id="gTitle">Gol de <em>Inglês</em></h1>
      <p id="gMsg">Bata o pênalti e traduza a palavra para continuar.</p>
      <p class="gol-who">Jogando como <b id="gWho">—</b> · <button class="link" id="gHubBtn">Todos os jogos</button> · <button class="link" id="gLogout">Trocar jogador</button></p>
      <div class="gol-levels" id="gLevels" role="radiogroup" aria-label="Nível"></div>
      <div class="actions">
        <button id="gPlay">Jogar</button>
        <button id="gHomeBtn" class="alt" hidden>Tela inicial</button>
      </div>
    </div>
    <section class="gol-rules" id="gRules" aria-labelledby="gRulesTitle">
      <h2 id="gRulesTitle">Como jogar</h2>
      <div class="gol-rule"><b>Chutar</b><span>Clique ou toque dentro do gol, no lugar onde quer mandar a bola.</span></div>
      <div class="gol-rule"><b>Goleiro</b><span>Ele vai pular e tentar pegar a bola. Capriche no chute!</span></div>
      <div class="gol-rule warn"><b>Cuidado</b><span>Chutar para fora ou na trave encerra a partida.</span></div>
      <div class="gol-rule"><b>Traduzir</b><span>Depois de cada gol, escreva a palavra em português ou em inglês. Errou: fim de jogo.</span></div>
      <div class="gol-rule"><b>Níveis</b><span>Quanto mais difícil, mais palavras novas, menos tempo para traduzir e maior a faixa rosa da trave. Faça ${UNLOCK_GOALS} gols para liberar o próximo nível.</span></div>
    </section>
  </div>
</div>
<div class="panel" id="gQuiz" hidden>
  <form class="card" id="gQuizForm" autocomplete="off">
    <span class="eyebrow">Gol! Agora traduza</span>
    <p class="gol-dir" id="gDir">Escreva em <b>português</b></p>
    <span class="gol-flag" id="gFrom">Inglês</span>
    <div class="gol-word" id="gWord">red</div>
    <div class="gol-timer" id="gTimer" hidden><div><i id="gTimeBar"></i></div><span id="gTimeLeft">20 s</span></div>
    <input id="gAnswer" autocapitalize="none" spellcheck="false" aria-label="Sua tradução" required>
    <button type="submit">Responder</button>
  </form>
</div>`;

  function init(root) {
    root.innerHTML = MARKUP;
    const $ = id => document.getElementById(id);
    let ctx = null, state = 'away', score = 0, best = 0, token = 0, level = LEVELS[0];
    // recorde por nível ("best" antigo, de antes dos níveis, vale para o Fácil)
    const bestOf = lv => +ctx.storage.load(`best_${lv.id}`, lv.id === 'facil' ? ctx.storage.load('best', 0) : 0) || 0;
    const isOpen = i => i === 0 || bestOf(LEVELS[i - 1]) >= UNLOCK_GOALS;

    // torcida: pontinhos coloridos na arquibancada
    $('gCrowd').innerHTML = Array.from({ length:140 }, (_, i) => {
      const x = (i % 70) * 11.6 + 6 + (i >= 70 ? 5 : 0), y = i >= 70 ? 226 : 212;
      const c = ['#ff4f8b', '#ffb238', '#4fd16e', '#5a78e6', '#e8eef6', '#7f93ab'][Math.random() * 6 | 0];
      return `<circle cx="${x}" cy="${y + Math.random() * 4}" r="4.2" fill="${c}" opacity=".55"/>`;
    }).join('');

    // --- sons (Web Audio, sem arquivos) ---
    let actx, muted = false;
    function tone(freq, at, dur, { type = 'triangle', vol = 0.18, to } = {}) {
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
      kick()    { tone(160, 0, 0.12, { type:'sine', vol:0.3, to:50 }); },
      goal()    { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.25, { vol:0.16 })); },
      correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.18)); },
      wrong()   { tone(260, 0, 0.45, { type:'sawtooth', vol:0.09, to:90 }); tone(180, 0.08, 0.45, { type:'square', vol:0.05, to:70 }); },
      post()    { tone(1800, 0, 0.5, { type:'sine', vol:0.12, to:1700 }); tone(2400, 0, 0.35, { type:'sine', vol:0.06 }); },   // "plim" do poste
    };
    function setMuted(m) {
      muted = m; ctx.device.save('muted', m);
      $('gSound').setAttribute('aria-pressed', !m);
      $('gSound').setAttribute('aria-label', m ? 'Ligar sons' : 'Desligar sons');
      $('gSoundOn').style.display = m ? 'none' : ''; $('gSoundOff').style.display = m ? '' : 'none';
    }
    $('gSound').onclick = () => { setMuted(!muted); $('gSound').blur(); if (!muted) sfx.play('correct'); };

    // --- animação ---
    const lerp = (a, b, k) => a + (b - a) * k;
    const easeOut = k => 1 - (1 - k) ** 3;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // anima de 0 a 1 em "ms"; para sozinha se a partida for interrompida (token muda)
    function tween(ms, fn, t = token) {
      return new Promise(resolve => {
        const t0 = performance.now();
        const step = now => {
          if (t !== token) return resolve();
          const k = Math.min(1, Math.max(0, (now - t0) / ms)); fn(k);
          k < 1 ? requestAnimationFrame(step) : resolve();
        };
        requestAnimationFrame(step);
      });
    }
    const BALL0 = { x:400, y:468 };
    const ballEl = $('gBall'), shadowEl = $('gShadow'), keeperEl = $('gKeeper');   // usados a cada quadro da animação
    function placeBall(x, y, s, shadowY) {
      ballEl.setAttribute('transform', `translate(${x} ${y}) scale(${s})`);
      shadowEl.setAttribute('cx', x); shadowEl.setAttribute('cy', shadowY);
      shadowEl.setAttribute('rx', 22 * s); shadowEl.setAttribute('ry', 6 * s);
    }
    const placeKeeper = (x, y, a) => keeperEl.setAttribute('transform', `translate(${x} ${y}) rotate(${a})`);
    function resetScene() {
      placeBall(BALL0.x, BALL0.y, 1, 490); placeKeeper(400, 330, 0);
      $('gNetG').classList.remove('shake'); $('gFlash').hidden = true;
    }

    // --- chute ---
    const GOAL = { l:192, r:608, t:132, b:330 }, POST = 12;
    function classify(x, y) {
      const PAD = level.post;   // faixa da trave: maior nos níveis difíceis
      if (y > GOAL.b + 4) return 'out';
      const top = GOAL.t - POST - PAD;
      const onLeft = x >= GOAL.l - POST - PAD && x <= GOAL.l + PAD && y >= top;
      const onRight = x >= GOAL.r - PAD && x <= GOAL.r + POST + PAD && y >= top;
      const onBar = y >= top && y <= GOAL.t + PAD && x >= GOAL.l - POST - PAD && x <= GOAL.r + POST + PAD;
      if (onLeft || onRight || onBar) return 'post';
      return x > GOAL.l && x < GOAL.r && y > GOAL.t ? 'goal' : 'out';
    }
    // O goleiro nunca pega: bola perto do meio → ele pula para o lado errado;
    // bola no canto → ele pula para o lado certo, mas as luvas param antes da bola.
    // Em qualquer caso o corpo e as luvas ficam dentro do gol (entre as traves).
    function keeperDive(tx, ty) {
      tx = Math.min(GOAL.r - 10, Math.max(GOAL.l + 10, tx));   // chute para fora: ele pula até a trave
      ty = Math.max(GOAL.t + 10, ty);
      const dx = tx - 400, side = Math.sign(dx) || (Math.random() < .5 ? -1 : 1);
      const lift = ty < 210 ? 30 : 0, REACH = 150;
      if (Math.abs(dx) < 170) return { x:400 - side * 50, y:330 - lift, a:-side * 40 };
      const cos = Math.min(1, Math.max(0.2, (330 - lift - ty) / REACH)), a = Math.acos(cos);
      const x = tx - side * (Math.sin(a) * REACH + 40);
      return { x:Math.min(470, Math.max(330, x)), y:330 - lift, a:side * a * 180 / Math.PI };
    }
    async function shoot(tx, ty) {
      state = 'shoot'; $('gScene').classList.add('locked'); $('gTip').hidden = true;
      const t = token, result = classify(tx, ty), k = keeperDive(tx, ty);
      sfx.play('kick');
      const endY = Math.min(ty + 8, 340);
      await Promise.all([
        tween(620, p => {
          const e = easeOut(p);
          placeBall(lerp(BALL0.x, tx, e), lerp(BALL0.y, ty, e) - Math.sin(Math.PI * p) * 40, lerp(1, .52, e), lerp(490, endY, e));
        }, t),
        wait(90).then(() => tween(420, p => { const e = easeOut(p); placeKeeper(lerp(400, k.x, e), lerp(330, k.y, e), lerp(0, k.a, e)); }, t)),
      ]);
      if (t !== token) return;
      if (result === 'goal') {
        $('gNetG').classList.remove('shake'); void $('gNetG').getBBox(); $('gNetG').classList.add('shake');
        flash('GOL!'); sfx.play('goal');
        await wait(1000); if (t !== token) return;
        ask();
      } else {
        if (result === 'post') {
          sfx.play('post');
          const back = tx < 400 ? 1 : -1;   // a bola volta para o campo
          await tween(380, p => placeBall(lerp(tx, tx + back * 120, p), lerp(ty, 470, p) - Math.sin(Math.PI * p) * 30, lerp(.52, .85, p), lerp(endY, 492, p)), t);
        }
        flash(result === 'post' ? 'Na trave!' : 'Pra fora!', true);
        await wait(1000); if (t !== token) return;
        over(result);
      }
    }
    function flash(text, miss = false) {
      const f = $('gFlash'); f.hidden = true; f.textContent = text; f.classList.toggle('miss', miss);
      void f.offsetWidth; f.hidden = false;
    }
    $('gScene').addEventListener('click', e => {
      if (state !== 'aim') return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform($('gScene').getScreenCTM().inverse());
      shoot(p.x, p.y);
    });

    // --- tradução ---
    let deck = [], card = null, toPT = true, qTime = 0, qTimer = null;
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
    function nextCard() {   // embaralha e só repete depois de passar por todas
      if (!deck.length) deck = [...level.words].sort(() => Math.random() - .5);
      return deck.pop();
    }
    // tempo para traduzir (Médio e Difícil); acabou = fim de jogo
    function startTimer() {
      clearInterval(qTimer); $('gTimer').hidden = !level.time;
      if (!level.time) return;
      const t = token; qTime = level.time; showTime();
      qTimer = setInterval(() => {
        if (t !== token || state !== 'quiz') return clearInterval(qTimer);
        qTime = Math.max(0, qTime - 0.1); showTime();
        if (qTime === 0) { clearInterval(qTimer); $('gQuiz').hidden = true; $('gAnswer').blur(); over('time'); }
      }, 100);
    }
    function showTime() {
      $('gTimeLeft').textContent = `${Math.ceil(qTime)} s`;
      $('gTimeBar').style.transform = `scaleX(${qTime / level.time})`;
      $('gTimeBar').classList.toggle('low', qTime <= 5);
    }
    function ask() {
      state = 'quiz'; card = nextCard(); toPT = Math.random() < .5; $('gFlash').hidden = true;
      $('gDir').innerHTML = `Escreva em <b>${toPT ? 'português' : 'inglês'}</b>`;
      $('gFrom').textContent = toPT ? 'Inglês' : 'Português';
      $('gWord').textContent = toPT ? card.en[0] : card.pt[0];
      $('gWord').lang = toPT ? 'en' : 'pt-BR';
      $('gAnswer').value = ''; $('gQuiz').hidden = false; $('gAnswer').focus();
      startTimer();
    }
    $('gQuizForm').onsubmit = e => {
      e.preventDefault();
      if (state !== 'quiz') return;
      $('gQuiz').hidden = true; $('gAnswer').blur(); clearInterval(qTimer);
      const ok = (toPT ? card.pt : card.en).map(norm).includes(norm($('gAnswer').value));
      if (!ok) return over('wrong');
      score++; $('gScore').textContent = score; sfx.play('correct');
      if (score > best) {
        const i = LEVELS.indexOf(level), next = LEVELS[i + 1], wasOpen = next && isOpen(i + 1);
        best = score; ctx.storage.save(`best_${level.id}`, best); $('gBest').textContent = best;
        if (next && !wasOpen && isOpen(i + 1)) toast(`Nível ${next.name} liberado! Escolha na tela inicial.`);
      }
      $('gTip').textContent = `Certo! ${card.en[0]} = ${card.pt[0]}. Chute de novo!`;
      aim();
    };

    // --- telas ---
    function aim() {
      token++; state = 'aim'; resetScene();
      $('gScene').classList.remove('locked'); $('gTip').hidden = false;
    }
    function start() {
      score = 0; $('gScore').textContent = 0;
      $('gHome').hidden = true; $('gTip').textContent = 'Clique dentro do gol para chutar';
      aim();
    }
    function over(reason) {
      token++; state = 'over'; sfx.play('wrong'); $('gFlash').hidden = true; clearInterval(qTimer);
      const pair = card ? `"${toPT ? card.en[0] : card.pt[0]}" em ${toPT ? 'português' : 'inglês'} é "${toPT ? card.pt[0] : card.en[0]}". ` : '';
      $('gTitle').innerHTML = { out:'Pra <em>fora!</em>', post:'Na <em>trave!</em>',
        wrong:'Resposta <em>errada</em>', time:'Tempo <em>esgotado</em>' }[reason];
      $('gMsg').textContent = `${reason === 'wrong' || reason === 'time' ? pair : ''}Você fez ${score} gol${score === 1 ? '' : 's'} no nível ${level.name}. Recorde: ${best}.`;
      $('gPlay').textContent = 'Tentar de novo';
      $('gRules').hidden = true; $('gLevels').hidden = true; $('gHomeBtn').hidden = false; $('gTip').hidden = true;
      $('gScene').classList.add('locked'); $('gHome').hidden = false; $('gPlay').focus();
    }
    const intro = { title:$('gTitle').innerHTML, msg:$('gMsg').textContent };
    function goHome() {
      token++; state = 'menu'; resetScene();
      for (const id of ['gQuiz', 'gTip']) $(id).hidden = true;
      $('gTitle').innerHTML = intro.title; $('gMsg').textContent = intro.msg; $('gPlay').textContent = 'Jogar';
      $('gRules').hidden = false; $('gLevels').hidden = false; $('gHomeBtn').hidden = true; $('gScene').classList.add('locked');
      renderLevels(); $('gHome').hidden = false; $('gPlay').focus();
    }
    // --- níveis ---
    const LOCK = `<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    function setLevel(lv) {
      level = lv; deck = []; best = bestOf(lv);
      ctx.storage.save('level', lv.id);
      $('gBest').textContent = best; $('gBestLabel').textContent = `Recorde · ${lv.name}`;
      // desenha a faixa da trave do nível (no Fácil é fina demais para mostrar)
      const p = lv.post > 6 ? lv.post : 0;
      $('gDangerL').setAttribute('width', p); $('gDangerR').setAttribute('width', p);
      $('gDangerR').setAttribute('x', GOAL.r - p); $('gDangerT').setAttribute('height', p);
    }
    function renderLevels() {
      $('gLevels').innerHTML = LEVELS.map((lv, i) => {
        const open = isOpen(i);
        return `<button class="gol-level${open ? '' : ' locked'}" role="radio" aria-checked="${lv === level}" data-lv="${i}"${open ? '' : ' aria-disabled="true"'}>
          <b>${lv.name}</b><small>${lv.topics} · ${lv.time ? `${lv.time} s` : 'sem tempo'}</small>
          <em>${open ? `Recorde ${bestOf(lv)}` : `${LOCK} ${UNLOCK_GOALS} gols no ${LEVELS[i - 1].name}`}</em></button>`;
      }).join('');
    }
    $('gLevels').onclick = e => {
      const b = e.target.closest('[data-lv]'); if (!b) return;
      const i = +b.dataset.lv;
      if (!isOpen(i)) return toast(`Faça ${UNLOCK_GOALS} gols no nível ${LEVELS[i - 1].name} para liberar o ${LEVELS[i].name}.`);
      setLevel(LEVELS[i]); renderLevels();
    };
    let toastTimer;
    function toast(text) {
      $('gToast').textContent = text; $('gToast').hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => $('gToast').hidden = true, 3500);
    }
    $('gPlay').onclick = start;
    $('gHomeBtn').onclick = goHome;
    $('gHubBtn').onclick = () => ctx.exit();
    $('gLogout').onclick = () => ctx.logout();
    addEventListener('keydown', e => {
      if (e.key === 'Enter' && (state === 'menu' || state === 'over') && document.activeElement?.tagName !== 'BUTTON') start();
    });

    // --- entrada e saída pela plataforma ---
    game.enter = c => {
      ctx = c; card = null; $('gWho').textContent = c.user.name;
      const saved = LEVELS.findIndex(lv => lv.id === c.storage.load('level', 'facil'));
      setLevel(LEVELS[saved > 0 && isOpen(saved) ? saved : 0]);
      setMuted(c.device.load('muted', false));
      goHome();
    };
    game.leave = () => { token++; state = 'away'; clearInterval(qTimer); };
    game.ready = true;
  }
})();
