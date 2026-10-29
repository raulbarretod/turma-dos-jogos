// Cobra Tabuada — o jogo. Carregado pela plataforma só quando o aluno clica em Jogar.
// Usa o desenho e as cores de cartao.js (window.CobraTabuada) e o Three.js (carregado antes).
(() => {
  const game = {};
  Plataforma.define('cobra', {
    enter(ctx) { if (!game.ready) init(ctx.root); game.enter(ctx); },
    leave() { game.leave?.(); },
  });

  const MARKUP = `
<div class="hud" id="hud">
  <div><span>Pontos</span><b id="score">0</b></div>
  <div class="r" id="bestBox"><span>Recorde</span><b id="best">0</b></div>
</div>
<button id="musicBtn" aria-pressed="true" aria-label="Desligar música">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M8 4.5l8-2v10.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M8 4.5V15" stroke="currentColor" stroke-width="1.6"/>
    <ellipse cx="5.8" cy="15.2" rx="2.4" ry="1.9" fill="currentColor"/><ellipse cx="13.8" cy="13.2" rx="2.4" ry="1.9" fill="currentColor"/>
    <path id="musicOff" d="M3 3l14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="display:none"/>
  </svg>
</button>
<button id="soundBtn" aria-pressed="true" aria-label="Desligar sons">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M3 7h3l4-3.5v13L6 13H3z" fill="currentColor"/>
    <g id="soundOn" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M13 7.2a4 4 0 0 1 0 5.6"/><path d="M15.2 5a7 7 0 0 1 0 10"/></g>
    <g id="soundOff" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="display:none"><path d="M13 7.5l5 5M18 7.5l-5 5"/></g>
  </svg>
</button>
<button id="pauseBtn" hidden aria-label="Pausar jogo">
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4" y="3" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="12" y="3" width="4" height="14" rx="1.5" fill="currentColor"/></svg>
</button>
<div class="panel" id="panel" hidden>
  <div class="card">
    <div class="intro">
      ${CobraTabuada.logoSVG('class="mascot" id="logo" role="img" aria-label="Desenho da cobra com o visual escolhido no vestiário"')}
      <h1 id="title">Cobra <em>Tabuada</em></h1>
      <p id="msg">Guie a cobra até os orbes e responda a tabuada para continuar.</p>
      <p class="who">Jogando como <b id="who">—</b> · <button class="link" id="hubBtn">Todos os jogos</button> · <button class="link" id="logoutBtn">Trocar jogador</button></p>
      <div class="actions">
        <button id="play">Jogar</button>
        <button id="studyBtn" class="alt">Estudos</button>
        <button id="closetBtn" class="alt">Vestiário</button>
        <button id="profileBtn" class="alt">Perfil</button>
        <button id="homeBtn" class="alt" hidden>Tela inicial</button>
      </div>
    </div>
    <section class="rules" id="rules" aria-labelledby="rulesTitle">
      <h2 id="rulesTitle">Como jogar</h2>
      <div class="rule"><b>Mover</b><span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> ou <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>. No celular, deslize o dedo. <span class="desk-only"><kbd>Espaço</kbd> pausa.</span><span class="touch-only">O botão no topo da tela pausa.</span></span></div>
      <div class="rule"><b>Comer</b><span>Pegue o orbe rosa. Bater na borda ou no próprio corpo encerra o jogo.</span></div>
      <div class="rule"><b>Responder</b><span>Cada orbe abre uma conta da tabuada do 1 ao 10. Acertou: +1 ponto e 3 s para escolher a direção. Errou: fim de jogo.</span></div>
      <div class="rule"><b>Tempo</b><div>Quanto mais pontos, menos tempo para responder.
        <div class="times">
          <div><strong style="color:#4fd16e">30 s</strong><small>0–10 pts</small></div>
          <div><strong style="color:#a8d85a">20 s</strong><small>11–20 pts</small></div>
          <div><strong style="color:#ffb238">15 s</strong><small>21–30 pts</small></div>
          <div><strong style="color:#ff4f8b">10 s</strong><small>30+ pts</small></div>
        </div></div></div>
      <div class="rule warn"><b>Cuidado</b><span>Sair da tela durante a pergunta leva ao encerramento da partida.</span></div>
    </section>
  </div>
</div>
<div class="study-hud" id="studyHud" hidden>Tabuada do <b id="studyHudN">7</b> · <span id="studyHudP">0</span> de 11<span class="study-dots" id="studyDots"></span></div>
<div class="panel" id="studyPanel" hidden>
  <div class="card">
    <span class="eyebrow">Estudos</span>
    <h1 class="sub-h1">Escolha a <em>tabuada</em></h1>
    <p>Responda da conta × 0 até × 10 sem errar e ganhe a medalha daquela tabuada. São 1000 para colecionar.</p>
    <form class="jump" id="jumpForm" autocomplete="off">
      <input id="jumpInput" type="number" inputmode="numeric" min="1" max="1000" placeholder="Número de 1 a 1000" aria-label="Número da tabuada">
      <button type="submit">Estudar</button>
    </form>
    <p class="hint" id="jumpError" aria-live="polite"></p>
    <div class="pager">
      <button class="scroll-btn" id="pagePrev" aria-label="Tabuadas anteriores">‹</button>
      <span id="pageInfo">1–20 · 0 de 1000 medalhas</span>
      <button class="scroll-btn" id="pageNext" aria-label="Próximas tabuadas">›</button>
    </div>
    <div class="tiles" id="tiles"></div>
    <button id="studyBack" class="alt">Voltar</button>
  </div>
</div>
<div class="panel" id="medalPanel" hidden>
  <div class="card">
    <span class="eyebrow">Medalha conquistada</span>
    <div id="medalBig"></div>
    <h1 class="sub-h1" id="medalTitle">Tabuada do 7 <em>completa!</em></h1>
    <p id="medalMsg">A medalha foi adicionada ao seu perfil.</p>
    <div class="actions">
      <button id="medalNext">Próxima tabuada</button>
      <button id="medalProfile" class="alt">Ver perfil</button>
      <button id="medalHome" class="alt">Tela inicial</button>
    </div>
  </div>
</div>
<div class="panel" id="profilePanel" hidden>
  <div class="card">
    <span class="eyebrow">Perfil</span>
    <h1 class="sub-h1" id="profileName">—</h1>
    <div class="stats">
      <div><b id="profileBest">0</b><span>Recorde</span></div>
      <div><b id="profileCount">0</b><span>Medalhas de 1000</span></div>
    </div>
    <div class="group"><h2>Minhas medalhas</h2><div class="medals" id="medals"></div></div>
    <div class="actions">
      <button id="profileStudy">Estudar</button>
      <button id="profileBack" class="alt">Voltar</button>
    </div>
  </div>
</div>
<div class="panel" id="closet" hidden>
  <div class="card closet">
    <span class="eyebrow">Vestiário</span>
    <h1>Vista sua <em>cobra</em></h1>
    <div class="stage"><canvas id="preview" aria-label="Prévia da cobra com o visual escolhido"></canvas></div>
    <div class="group"><h2>Acessório</h2><div class="opts" id="accOpts"></div><p id="accHint" class="hint" aria-live="polite"></p></div>
    <div class="group"><h2>Cor <span id="colorName">Verde</span></h2><div class="swatch-row">
      <button class="scroll-btn" id="colorPrev" aria-label="Ver cores anteriores">‹</button>
      <div class="swatches" id="colorOpts"></div>
      <button class="scroll-btn" id="colorNext" aria-label="Ver mais cores">›</button>
    </div></div>
    <button id="closetDone">Pronto</button>
  </div>
</div>
<div class="panel" id="prizePanel" hidden>
  <div class="card">
    <span class="eyebrow">Prêmio desta partida</span>
    <svg class="prize-hat" viewBox="0 0 120 100" role="img" aria-label="Chapéu de Papai Noel">
      <path d="M20 76 C 28 40, 50 12, 78 12 C 98 12, 106 30, 104 56 C 98 44, 90 38, 84 40 C 90 52, 96 64, 100 76 Z" fill="#d62839"/>
      <path d="M84 40 C 90 52, 96 64, 100 76 L 80 76 C 82 62, 82 50, 84 40 Z" fill="#a81d2c"/>
      <path d="M34 62 C 40 40, 56 22, 74 18" fill="none" stroke="#ff6b78" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      <rect x="10" y="70" width="100" height="18" rx="9" fill="#f4f6fa"/>
      <rect x="10" y="80" width="100" height="8" rx="4" fill="#d9dee8"/>
      <circle cx="104" cy="60" r="10" fill="#f4f6fa"/>
    </svg>
    <h1>Chapéu de <em class="santa">Papai Noel</em></h1>
    <p id="prizeMsg">Faça 10 pontos para desbloquear e usar no Vestiário.</p>
    <div class="progress"><div><i id="prizeBar"></i></div><span id="prizeInfo">Seu recorde: 0 de 10</span></div>
    <div class="actions">
      <button id="prizeGo">Começar</button>
      <button id="prizeBack" class="alt">Voltar</button>
    </div>
  </div>
</div>
<div class="toast" id="toast" hidden role="status"></div>
<div class="count" id="countBox" hidden aria-live="polite">
  <span id="countMsg">Certo!</span>
  <b id="countNum">3</b>
  <small>Já pode escolher a direção</small>
</div>
<div class="panel" id="pausePanel" hidden>
  <div class="card">
    <span class="eyebrow">Pausa</span>
    <h1>Jogo <em>pausado</em></h1>
    <p id="pauseInfo">Pontos: 0</p>
    <button id="resume">Continuar</button>
    <p class="desk-only">ou aperte Espaço</p>
  </div>
</div>
<div class="panel" id="quizPanel" hidden>
  <form class="card" id="quizForm" autocomplete="off">
    <span class="eyebrow">Tabuada</span>
    <div class="quiz" id="question">7 <span>×</span> 8</div>
    <div class="timer"><div><i id="timeBar"></i></div><span id="timeLeft">30 s</span></div>
    <input id="answer" type="number" inputmode="numeric" min="0" required aria-label="Resposta">
    <button type="submit">Responder</button>
  </form>
</div>`;

  function init(root) {
    root.innerHTML = MARKUP;
    const N = 18, $ = id => document.getElementById(id);
    const { COLORS, ACCESSORIES, UNLOCK } = CobraTabuada;
    let ctx = null, profile = null;   // plataforma: usuário, dados salvos, voltar
    const store = { get: () => +profile.load('best', 0) || 0, set: v => profile.save('best', v) };

    // --- cena ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    root.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1624);
    scene.fog = new THREE.Fog(0x0b1624, 28, 55);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight(0x9cc4ff, 0x1a1020, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-8, 20, 10); sun.castShadow = true;
    Object.assign(sun.shadow.camera, { left:-12, right:12, top:12, bottom:-12 });
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const board = new THREE.Mesh(new THREE.BoxGeometry(N, 0.6, N), new THREE.MeshStandardMaterial({ color:0x132338, roughness:.9 }));
    board.position.y = -0.3; board.receiveShadow = true; scene.add(board);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(N + .6, 0.4, N + .6), new THREE.MeshStandardMaterial({ color:0x1d3350, emissive:0xff4f8b, emissiveIntensity:.15 }));
    rim.position.y = -0.45; scene.add(rim);
    const grid = new THREE.GridHelper(N, N, 0x2a4566, 0x2a4566);
    grid.position.y = 0.01; grid.material.transparent = true; grid.material.opacity = .5; scene.add(grid);

    const food = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), new THREE.MeshStandardMaterial({ color:0xff4f8b, emissive:0xff4f8b, emissiveIntensity:.8, flatShading:true }));
    food.castShadow = true; scene.add(food);
    const glow = new THREE.PointLight(0xff4f8b, 1.5, 6); scene.add(glow);
    // cópia da bolinha que encolhe para dentro da boca quando é comida
    const ghost = new THREE.Mesh(food.geometry, food.material); ghost.visible = false; scene.add(ghost);
    const ghostFrom = new THREE.Vector3(), headAt = new THREE.Vector3();
    let ghostT = 0, mouthOpen = 0;

    // --- visual da cobra (vestiário) ---
    let now = 0;   // tempo atual, usado pelo camaleão
    let skin = { acc:'cowboy', color:0 };
    const hueAt = (i, n) => CobraTabuada.hue(skin, i, n, now);
    const unlocked = acc => (UNLOCK[acc] ?? 0) <= store.get();
    const paintLogo = () => CobraTabuada.paintLogo($('logo'), skin, now);
    function loadSkin() { skin = CobraTabuada.validSkin(profile.load('skin', {}), store.get()); paintLogo(); }

    const std = (color, extra) => new THREE.MeshStandardMaterial({ color, ...extra });
    const cyl = (rt, rb, h, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg);
    function buildAccessory(type) {
      const g = new THREE.Group(), add = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
      if (type === 'cowboy') {
        const felt = std(0x9a6430, { roughness:.8 });
        add(cyl(0.62, 0.62, 0.05, 24), felt).scale.x = 1.15;          // aba
        add(cyl(0.26, 0.33, 0.36), felt, 0, 0.2);                      // copa
        add(cyl(0.335, 0.335, 0.08), std(0x3a2412), 0, 0.06);          // fita
        g.position.set(0, 0.46, -0.05); g.rotation.x = -0.18;           // inclinado para trás
      } else if (type === 'headset') {
        const dark = std(0x1c2230, { roughness:.4, metalness:.5 }), led = std(0x4fd1e0, { emissive:0x4fd1e0, emissiveIntensity:1 });
        add(new THREE.TorusGeometry(0.5, 0.055, 8, 24, Math.PI), dark, 0, 0.1);               // arco sobre a cabeça
        for (const s of [-1, 1]) {
          add(cyl(0.22, 0.22, 0.14), dark, s * 0.5, 0.05).rotation.z = Math.PI / 2;          // conchas
          add(cyl(0.12, 0.12, 0.02), led, s * 0.58, 0.05).rotation.z = Math.PI / 2;          // luz
        }
        add(cyl(0.025, 0.025, 0.5, 8), dark, -0.46, -0.02, 0.28).rotation.x = Math.PI / 2;   // haste do microfone
        add(new THREE.SphereGeometry(0.07, 10, 8), led, -0.46, -0.02, 0.54);
        g.position.y = 0.2;
      } else if (type === 'santa') {
        const fur = std(0xf4f6fa, { roughness:1 });
        add(new THREE.ConeGeometry(0.4, 0.85, 20), std(0xd62839, { roughness:.7 }), 0.14, 0.4).rotation.z = -0.4;   // gorro caído
        add(cyl(0.44, 0.44, 0.14, 24), fur, 0, 0.02);                                                            // barra branca
        add(new THREE.SphereGeometry(0.11, 12, 8), fur, 0.33, 0.8);                                              // pompom
        g.position.y = 0.4;
      } else {
        add(new THREE.SphereGeometry(0.74, 32, 20),
            std(0xbfe6ff, { transparent:true, opacity:.22, roughness:.05, metalness:.3, depthWrite:false }));   // bolha de vidro
        add(new THREE.TorusGeometry(0.62, 0.1, 10, 32), std(0xeef2f7, { roughness:.5 }), 0, -0.42).rotation.x = Math.PI / 2;  // gola
        add(cyl(0.02, 0.02, 0.3, 6), std(0xcfd6e0), 0.3, 0.75).rotation.z = -0.3;               // antena
        add(new THREE.SphereGeometry(0.06, 8, 6), std(0xff4f8b, { emissive:0xff4f8b }), 0.35, 0.9);
        g.position.y = 0.05;
      }
      g.traverse(o => o.castShadow = !o.material?.transparent);   // vidro não faz sombra
      return g;
    }
    function dress(head, type = skin.acc) {
      const old = head.userData.acc;
      if (old) {   // libera da placa de vídeo o acessório anterior (trocar muito no vestiário não acumula memória)
        head.remove(old);
        old.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
      }
      head.add(head.userData.acc = buildAccessory(type));
    }
    const segGeo = new THREE.BoxGeometry(0.86, 0.7, 0.86), segs = [];
    function makeHead() {
      const m = new THREE.Mesh(segGeo, std(0xffffff, { roughness:.35, metalness:.2 }));
      for (const sx of [-0.22, 0.22]) {          // olhos: mostram para onde a cabeça aponta
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), new THREE.MeshBasicMaterial({ color:0xffffff }));
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color:0x0b1624 }));
        eye.position.set(sx, 0.28, 0.3); pupil.position.set(0, 0.03, 0.09); eye.add(pupil); m.add(eye);
      }
      // boca: fenda escura na frente da cabeça, abre perto da comida
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.04), new THREE.MeshBasicMaterial({ color:0x3a0a14 }));
      mouth.position.set(0, -0.08, 0.44); m.add(mouth); m.userData.mouth = mouth;
      // mandíbula: lingueta vermelha que sai para a frente quando a boca abre (visível de cima)
      const jawGeo = new THREE.BoxGeometry(0.56, 0.06, 0.62); jawGeo.translate(0, 0, 0.31);
      const jaw = new THREE.Mesh(jawGeo, new THREE.MeshStandardMaterial({ color:0xb3263a, roughness:.6 }));
      jaw.position.set(0, -0.14, 0.4); jaw.scale.z = 0.001; m.add(jaw); m.userData.jaw = jaw;
      dress(m); return m;
    }
    const col = new THREE.Color();
    function paint(m, i, n) {   // gradiente da cabeça à cauda na cor escolhida, com listras
      const c = COLORS[skin.color];
      col.setHSL(hueAt(i, n), c.s ?? 0.7, (i === 0 ? 0.55 : 0.45 - (i % 2) * 0.06) * (c.lk ?? 1));
      m.material.color.copy(col); m.material.emissive.copy(col).multiplyScalar(i === 0 ? .35 : .12);
    }
    const segMesh = i => segs[i] || (segs[i] = (() => {
      const m = i === 0 ? makeHead() : new THREE.Mesh(segGeo, std(0xffffff, { roughness:.35, metalness:.2 }));
      m.castShadow = true; scene.add(m); return m;
    })());

    // seta no chão indicando o próximo movimento
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 3), new THREE.MeshBasicMaterial({ color:0xffb238, transparent:true }));
    arrow.geometry.rotateX(Math.PI / 2);   // aponta para +z
    const arrowPivot = new THREE.Group(); arrowPivot.add(arrow); arrow.position.z = 1.35; scene.add(arrowPivot);
    const angle = d => Math.atan2(d.x, d.z);
    const turnTo = (a, b, k) => a + (((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k;

    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h); camera.aspect = w / h;
      // distância que faz o tabuleiro inteiro caber na largura E na altura da tela
      const tan = Math.tan(camera.fov * Math.PI / 360), half = N / 2 + 1.5;
      const dist = Math.max(half / tan, half * 1.05 / (tan * camera.aspect));
      camera.position.set(0, 1, .62).setLength(dist); camera.lookAt(0, 0, 1);
      scene.fog.near = dist + 4; scene.fog.far = dist + 30; camera.far = dist + 40;
      camera.updateProjectionMatrix();
    }
    addEventListener('resize', resize); resize();

    // --- lógica ---
    let snake, from, dir, queue, fpos, score, best = 0, step, acc = 0, state = 'menu', pop = 0;
    const W = c => c - N / 2 + 0.5;

    function reset() {
      snake = [{x:9,z:9},{x:8,z:9},{x:7,z:9}]; from = snake.map(s => ({...s}));
      dir = {x:1,z:0}; queue = []; score = 0; step = 0.15; acc = 0;
      $('score').textContent = 0; placeFood();
    }
    function placeFood() {
      do fpos = { x: Math.random() * N | 0, z: Math.random() * N | 0 };
      while (snake.some(s => s.x === fpos.x && s.z === fpos.z));
    }
    function tick() {
      if (queue.length) dir = queue.shift();
      const h = { x: snake[0].x + dir.x, z: snake[0].z + dir.z };
      const eat = h.x === fpos.x && h.z === fpos.z;
      const body = eat ? snake : snake.slice(0, -1);
      if (h.x < 0 || h.z < 0 || h.x >= N || h.z >= N || body.some(s => s.x === h.x && s.z === h.z)) return over();
      const old = snake;
      snake = [h, ...body];
      from = snake.map((_, i) => old[Math.min(i, old.length - 1)]);
      if (eat) {
        pop = 1; sfx.play('eat');
        ghostFrom.set(W(fpos.x), 0.5, W(fpos.z)); ghostT = 1;   // a bolinha "entra" na boca
        placeFood(); ask();
      }
    }

    // --- tabuada ---
    let qa, qb, qTime = 0, qLimit = 30;
    // tempo para responder conforme a pontuação atual
    const timeLimit = s => s <= 10 ? 30 : s <= 20 ? 20 : s <= 30 ? 15 : 10;
    // modo Estudos: uma tabuada escolhida, de × 0 a × 10, em ordem
    let mode = 'free', studyN = 1, studyIdx = 0;
    const STUDY_STEPS = 11;
    const studyTime = n => n <= 10 ? 30 : n <= 100 ? 45 : 60;   // números maiores, mais tempo
    function ask() {
      if (mode === 'study') { qa = studyN; qb = studyIdx; }
      else { qa = 1 + Math.random() * 10 | 0; qb = 1 + Math.random() * 10 | 0; }
      $('question').innerHTML = `${qa} <span>×</span> ${qb}`;
      $('answer').value = '';
      qLimit = qTime = mode === 'study' ? studyTime(studyN) : timeLimit(score); updateTimer();
      state = 'quiz'; $('quizPanel').hidden = false; $('answer').focus();
      music.stop();   // silêncio para pensar na resposta
    }
    function updateTimer() {
      $('timeLeft').textContent = `${Math.ceil(qTime)} s`;
      $('timeBar').style.transform = `scaleX(${qTime / qLimit})`;
      $('timeBar').classList.toggle('low', qTime <= 5);
    }
    $('quizForm').onsubmit = e => {
      e.preventDefault();
      if (state !== 'quiz') return;
      $('quizPanel').hidden = true; $('answer').blur();
      if (+$('answer').value !== qa * qb) return over(`${qa} × ${qb} = ${qa * qb}. `);
      score++; $('score').textContent = score;
      sfx.play('correct');
      if (mode === 'study') {
        studyIdx++; updateStudyHud();
        if (studyIdx >= STUDY_STEPS) return finishStudy();
      } else if (score > best) {   // recorde atualizado na hora, para liberar prêmios durante a partida
        const prizes = Object.keys(UNLOCK).filter(a => best < UNLOCK[a] && score >= UNLOCK[a]);
        best = score; store.set(best); $('best').textContent = best;
        prizes.forEach(a => toast(`Prêmio desbloqueado: chapéu de ${ACCESSORIES[a]}! Use no Vestiário.`));
      }
      step = Math.max(0.065, step * 0.96); acc = 0;
      $('countMsg').textContent = `Certo! ${qa} × ${qb} = ${qa * qb}`;
      cd = 3; $('countNum').textContent = 3; $('countBox').hidden = false; state = 'count';
    };
    let cd = 0;   // contagem regressiva após acerto

    // --- sons (gerados na hora com Web Audio, sem arquivos) ---
    let actx, muted = false, musicMuted = false;
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
      correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.18)); },               // arpejo subindo
      wrong()   { tone(260, 0, 0.45, { type:'sawtooth', vol:0.09, to:90 }); tone(180, 0.08, 0.45, { type:'square', vol:0.05, to:70 }); },
      eat()     { tone(700, 0, 0.07, { type:'square', vol:0.07, to:220 }); tone(420, 0.06, 0.08, { type:'square', vol:0.06, to:140 }); },  // nhac
      medal()   { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.1, 0.3, { vol:0.16 })); },
    };
    // música de fundo bem baixinha: melodia pentatônica em loop + baixo, só com a cobra andando
    const MELODY = [659, 784, 880, 784, 659, 0, 587, 659, 784, 0, 880, 1047, 880, 784, 659, 0];
    const BASS = [131, 110, 87, 98];
    const music = {
      timer:null, step:0,
      start() {
        if (this.timer || muted || musicMuted) return;
        try { actx ??= new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch { return; }
        this.timer = setInterval(() => {
          const s = this.step++, i = s % 16;
          if (MELODY[i]) tone(MELODY[i], 0, 0.2, { vol:0.02 });
          if (i % 4 === 0) tone(BASS[Math.floor(s / 16) % 4], 0, 0.7, { type:'sine', vol:0.035 });
        }, 210);
      },
      stop() { clearInterval(this.timer); this.timer = null; },
    };
    function setMuted(m) {
      muted = m; ctx.device.save('muted', m);
      if (m) music.stop(); else if (state === 'play') music.start();
      $('soundBtn').setAttribute('aria-pressed', !m);
      $('soundBtn').setAttribute('aria-label', m ? 'Ligar sons' : 'Desligar sons');
      $('soundOn').style.display = m ? 'none' : ''; $('soundOff').style.display = m ? '' : 'none';
    }
    $('soundBtn').onclick = () => { setMuted(!muted); $('soundBtn').blur(); if (!muted) sfx.play('correct'); };
    // botão só da música (os efeitos continuam)
    function setMusicMuted(m) {
      musicMuted = m; ctx.device.save('musicMuted', m);
      $('musicBtn').setAttribute('aria-pressed', !m);
      $('musicBtn').setAttribute('aria-label', m ? 'Ligar música' : 'Desligar música');
      $('musicOff').style.display = m ? '' : 'none';
      if (m) music.stop(); else if (state === 'play') music.start();
    }
    $('musicBtn').onclick = () => { setMusicMuted(!musicMuted); $('musicBtn').blur(); };
    let toastTimer;
    function toast(text) {
      $('toast').textContent = text; $('toast').hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 5000);
    }

    function over(why = '', title = why ? `Resposta <em>errada</em>` : `Fim de <em>jogo</em>`) {
      state = 'over'; $('studyHud').hidden = true;
      music.stop(); sfx.play('wrong');
      $('title').innerHTML = title;
      if (mode === 'study') {
        $('msg').textContent = `${why}Você acertou ${score} de ${STUDY_STEPS} da tabuada do ${studyN}.`;
      } else {
        if (score > best) { best = score; store.set(best); $('best').textContent = best; }
        $('msg').textContent = `${why}Você fez ${score} ponto${score === 1 ? '' : 's'}. Recorde: ${best}.`;
      }
      // fim de partida: só "Tentar de novo" e "Tela inicial"
      $('play').textContent = 'Tentar de novo';
      for (const id of ['studyBtn', 'closetBtn', 'profileBtn']) $(id).hidden = true;
      $('rules').hidden = true; $('homeBtn').hidden = false; $('panel').hidden = false; $('play').focus();
    }
    function start() {
      reset(); state = 'play'; $('panel').hidden = true; music.start();
      $('studyHud').hidden = mode !== 'study'; updateStudyHud();
      $('bestBox').hidden = mode === 'study';   // recorde não vale nos Estudos
    }
    // antes de jogar, mostra o próximo prêmio ainda bloqueado (se houver)
    function play() {
      if (mode === 'study') return startStudy(studyN);   // "Tentar de novo" repete a mesma tabuada
      const prize = Object.keys(UNLOCK).find(a => !unlocked(a));
      if (!prize) return start();
      const need = UNLOCK[prize], rec = store.get();
      $('prizeMsg').textContent = `Faça ${need} pontos para desbloquear e usar no Vestiário.`;
      $('prizeInfo').textContent = `Seu recorde: ${rec} de ${need}`;
      $('prizeBar').style.width = `${Math.min(100, rec / need * 100)}%`;
      backTo = state; state = 'prize';
      $('panel').hidden = true; $('prizePanel').hidden = false; $('prizeGo').focus();
    }
    $('play').onclick = play;
    $('prizeGo').onclick = () => { $('prizePanel').hidden = true; start(); };
    $('prizeBack').onclick = () => { state = backTo; $('prizePanel').hidden = true; $('panel').hidden = false; $('play').focus(); };
    const intro = { title: $('title').innerHTML, msg: $('msg').textContent };
    const OVERLAYS = ['studyPanel', 'medalPanel', 'profilePanel', 'closet', 'prizePanel', 'pausePanel', 'quizPanel', 'countBox', 'toast'];
    function goHome() {   // tela inicial com as instruções
      state = 'menu'; mode = 'free'; $('studyHud').hidden = true; $('bestBox').hidden = false;
      music.stop();
      for (const id of OVERLAYS) $(id).hidden = true;
      for (const id of ['studyBtn', 'closetBtn', 'profileBtn']) $(id).hidden = false;
      $('title').innerHTML = intro.title; $('msg').textContent = intro.msg; $('play').textContent = 'Jogar';
      $('rules').hidden = false; $('homeBtn').hidden = true; $('panel').hidden = false; $('play').focus();
    }
    $('homeBtn').onclick = goHome;
    $('hubBtn').onclick = () => ctx.exit();
    $('logoutBtn').onclick = () => ctx.logout();

    // --- pausa ---
    function setPause(on) {
      state = on ? 'pause' : 'play'; acc = 0;
      on ? music.stop() : music.start();
      $('pauseInfo').textContent = `Pontos: ${score}`;
      $('pausePanel').hidden = !on;
      document.activeElement?.blur();
    }
    $('resume').onclick = () => setPause(false);
    $('pauseBtn').onclick = () => { if (state === 'play') setPause(true); };
    // pausa sozinho se o aluno trocar de aba ou minimizar;
    // durante a pergunta, sair da aba encerra o jogo (evita consultar a resposta)
    function leftQuiz() {
      if (state !== 'quiz') return;
      $('quizPanel').hidden = true; $('answer').blur();
      over(`Você saiu do jogo durante a pergunta. A resposta era ${qa} × ${qb} = ${qa * qb}. `, `Saiu do <em>jogo</em>`);
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) return;
      if (state === 'play') setPause(true);
      leftQuiz();
    });
    addEventListener('blur', leftQuiz);   // Alt+Tab ou clique fora da janela do jogo
    // fechar a aba no meio da partida ainda guarda o recorde
    addEventListener('pagehide', () => { if (ctx && mode === 'free' && score > best) store.set(score); });

    // --- estudos, medalhas e perfil ---
    const PAGE = 20, MAX_TAB = 1000;
    let studyPage = 0;
    const medals = () => profile.load('medals', []);
    const tier = n => n <= 10 ? 'bronze' : n <= 100 ? 'silver' : 'gold';
    const medalHTML = (n, size = 48) =>
      `<span class="medal-w" style="--s:${size}px"><span class="medal ${tier(n)} ${n >= 1000 ? 'd4' : n >= 100 ? 'd3' : ''}">${n}</span></span>`;

    function updateStudyHud() {
      $('studyHudN').textContent = studyN; $('studyHudP').textContent = studyIdx;
      $('studyDots').innerHTML = Array.from({ length:STUDY_STEPS }, (_, i) => `<i class="${i < studyIdx ? 'on' : ''}"></i>`).join('');
    }
    function renderTiles() {
      const got = new Set(medals()), from = studyPage * PAGE + 1, to = Math.min(from + PAGE - 1, MAX_TAB);
      $('tiles').innerHTML = Array.from({ length:to - from + 1 }, (_, i) => {
        const n = from + i, done = got.has(n);
        return `<button class="tile ${done ? `done ${tier(n)}` : ''}" data-n="${n}" aria-label="Tabuada do ${n}${done ? ', medalha conquistada' : ''}">${n}</button>`;
      }).join('');
      $('pageInfo').textContent = `${from}–${to} · ${got.size} de ${MAX_TAB} medalhas`;
      $('pagePrev').disabled = studyPage === 0; $('pageNext').disabled = to >= MAX_TAB;
    }
    function openStudy() {
      state = 'study'; studyPage = Math.floor((Math.min(studyN, MAX_TAB) - 1) / PAGE);
      for (const id of ['panel', 'medalPanel', 'profilePanel']) $(id).hidden = true;
      $('jumpError').textContent = ''; $('jumpInput').value = '';
      renderTiles(); $('studyPanel').hidden = false;
    }
    function startStudy(n) {
      mode = 'study'; studyN = n; studyIdx = 0;
      for (const id of ['studyPanel', 'medalPanel', 'profilePanel']) $(id).hidden = true;
      start();
    }
    function finishStudy() {
      state = 'won'; $('studyHud').hidden = true; music.stop();
      setTimeout(() => sfx.play('medal'), 350);   // depois do som de acerto
      const list = medals(), had = list.includes(studyN);
      if (!had) profile.save('medals', [...list, studyN].sort((a, b) => a - b));
      $('medalBig').innerHTML = medalHTML(studyN, 120);
      $('medalTitle').innerHTML = `Tabuada do ${studyN} <em>completa!</em>`;
      $('medalMsg').textContent = had ? 'Você já tinha esta medalha. Mandou bem de novo!' : 'A medalha foi adicionada ao seu perfil.';
      $('medalNext').hidden = studyN >= MAX_TAB;
      $('medalPanel').hidden = false; $('medalNext').focus();
    }
    function openProfile() {
      state = 'profile';
      for (const id of ['panel', 'medalPanel', 'studyPanel']) $(id).hidden = true;
      const list = medals();
      $('profileName').textContent = ctx.user.name;
      $('profileBest').textContent = store.get(); $('profileCount').textContent = list.length;
      $('medals').innerHTML = list.length
        ? list.map(n => `<figure>${medalHTML(n, 44)}<figcaption>Tabuada do ${n}</figcaption></figure>`).join('')
        : '<p class="empty">Nenhuma medalha ainda. Vá em Estudos e complete uma tabuada.</p>';
      $('profilePanel').hidden = false; $('profileStudy').focus();
    }
    $('studyBtn').onclick = openStudy;
    $('profileBtn').onclick = openProfile;
    $('studyBack').onclick = goHome;
    $('profileBack').onclick = goHome;
    $('profileStudy').onclick = openStudy;
    $('medalHome').onclick = goHome;
    $('medalProfile').onclick = openProfile;
    $('medalNext').onclick = () => startStudy(studyN + 1);
    $('pagePrev').onclick = () => { studyPage--; renderTiles(); };
    $('pageNext').onclick = () => { studyPage++; renderTiles(); };
    $('tiles').onclick = e => { const b = e.target.closest('[data-n]'); if (b) startStudy(+b.dataset.n); };
    $('jumpForm').onsubmit = e => {
      e.preventDefault();
      const n = +$('jumpInput').value;
      if (!Number.isInteger(n) || n < 1 || n > MAX_TAB) { $('jumpError').textContent = 'Digite um número inteiro de 1 a 1000.'; return; }
      startStudy(n);
    };

    // --- controles ---
    const DIRS = { ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] };
    function turn(x, z) {
      if (state === 'count') queue = [];   // na contagem vale só a última escolha
      const last = queue[queue.length - 1] || dir;
      if (queue.length < 3 && last.x !== -x && last.z !== -z && (last.x !== x || last.z !== z)) queue.push({x, z});
    }
    addEventListener('keydown', e => {
      const k = DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (k && (state === 'play' || state === 'count')) { e.preventDefault(); turn(...k); }
      if (e.key === ' ' && (state === 'play' || state === 'pause')) { e.preventDefault(); setPause(state === 'play'); }
      if (e.key === 'Enter' && (state === 'menu' || state === 'over') && document.activeElement !== $('play')) play();
    });
    let t0;
    addEventListener('touchstart', e => t0 = e.touches[0], { passive:true });
    addEventListener('touchend', e => {
      if (!t0 || (state !== 'play' && state !== 'count')) return;
      const dx = e.changedTouches[0].clientX - t0.clientX, dy = e.changedTouches[0].clientY - t0.clientY;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) Math.abs(dx) > Math.abs(dy) ? turn(Math.sign(dx), 0) : turn(0, Math.sign(dy));
    });

    // --- vestiário ---
    let pv, backTo = 'menu';
    function makePreview() {
      const r = new THREE.WebGLRenderer({ canvas:$('preview'), antialias:true, alpha:true });
      r.setPixelRatio(Math.min(devicePixelRatio, 2));
      const s = new THREE.Scene();
      s.add(new THREE.HemisphereLight(0x9cc4ff, 0x1a1020, 0.7));
      const l = new THREE.DirectionalLight(0xffffff, 0.9); l.position.set(-3, 6, 5); s.add(l);
      const cam = new THREE.PerspectiveCamera(32, 4 / 3, 0.1, 50);
      cam.position.set(0, 2.8, 5.6); cam.lookAt(0, 0.45, -0.3);
      const g = new THREE.Group(); s.add(g);
      const plate = new THREE.Mesh(cyl(2.6, 2.6, 0.08, 48), std(0x132338, { roughness:.9 }));
      plate.position.y = -0.04; g.add(plate);
      // cobra enrolada de pose, cabeça virada para a câmera
      const path = [[0.8,1],[0.8,0],[0.8,-1],[-0.2,-1],[-1.2,-1],[-1.2,0],[-1.2,1]];
      const body = path.map(([x, z], i) => {
        const m = i === 0 ? makeHead() : new THREE.Mesh(segGeo, std(0xffffff, { roughness:.35, metalness:.2 }));
        m.position.set(x, 0.35, z); m.scale.setScalar(i === 0 ? 1.08 : 1 - i / path.length * 0.3); g.add(m); return m;
      });
      return { r, s, cam, g, body };
    }
    function renderPreview(t) {
      const c = $('preview'), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * pv.r.getPixelRatio())) { pv.r.setSize(w, h, false); pv.cam.aspect = w / h; pv.cam.updateProjectionMatrix(); }
      pv.g.rotation.y = Math.sin(t * 0.7) * 0.5;
      pv.body.forEach((m, i) => paint(m, i, pv.body.length));
      pv.r.render(pv.s, pv.cam);
    }
    const LOCK_ICON = `<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>`;
    function renderOptions() {
      $('accOpts').innerHTML = Object.entries(ACCESSORIES).map(([k, name]) => unlocked(k)
        ? `<button class="opt" data-acc="${k}" aria-pressed="${skin.acc === k}">${name}</button>`
        : `<button class="opt locked" data-acc="${k}" aria-disabled="true">${LOCK_ICON}${name}<small>${UNLOCK[k]} pts</small></button>`).join('');
      const keep = $('colorOpts').scrollLeft;   // não perde a posição da faixa ao escolher
      $('colorOpts').innerHTML = COLORS.map((c, i) =>
        `<button class="swatch" data-color="${i}" aria-pressed="${skin.color === i}" aria-label="${c.name}" title="${c.name}"
          style="--c:${c.css ?? `hsl(${c.h * 360} 70% 50%)`}"></button>`).join('');
      $('colorOpts').scrollTo({ left:keep, behavior:'instant' });
      $('colorName').textContent = COLORS[skin.color].name;
    }
    function setSkin(change) {
      Object.assign(skin, change);
      profile.save('skin', skin);
      if (change.acc) { if (segs[0]) dress(segs[0]); dress(pv.body[0]); }
      renderOptions(); paintLogo();
    }
    let tryTimer;
    $('accOpts').onclick = e => {
      const b = e.target.closest('[data-acc]'); if (!b) return;
      const a = b.dataset.acc;
      if (!unlocked(a)) {
        $('accHint').textContent = `Bloqueado: faça ${UNLOCK[a]} pontos em uma partida para liberar o chapéu de ${ACCESSORIES[a]}. Seu recorde: ${store.get()}.`;
        dress(pv.body[0], a);   // deixa experimentar na prévia por alguns segundos
        clearTimeout(tryTimer); tryTimer = setTimeout(() => dress(pv.body[0]), 2500);
        return;
      }
      $('accHint').textContent = ''; clearTimeout(tryTimer);
      setSkin({ acc:a });
    };
    $('colorOpts').onclick = e => { const b = e.target.closest('[data-color]'); if (b) setSkin({ color:+b.dataset.color }); };
    const swatchPage = d => $('colorOpts').scrollBy({ left: d * $('colorOpts').clientWidth * 0.8 });
    $('colorPrev').onclick = () => swatchPage(-1);
    $('colorNext').onclick = () => swatchPage(1);
    $('closetBtn').onclick = () => {
      backTo = state; state = 'closet';
      pv ??= makePreview(); renderOptions();
      $('panel').hidden = true; $('closet').hidden = false; $('closetDone').focus();
      // leva a cor escolhida para o centro da faixa
      const sel = $('colorOpts').querySelector('[aria-pressed="true"]'), box = $('colorOpts');
      box.scrollTo({ left: sel.offsetLeft - box.offsetLeft - (box.clientWidth - sel.offsetWidth) / 2, behavior:'instant' });
    };
    $('closetDone').onclick = () => { state = backTo; $('closet').hidden = true; $('panel').hidden = false; $('play').focus(); };

    // --- loop ---
    reset();
    const clock = new THREE.Clock();
    const pauseBtn = $('pauseBtn'), countNum = $('countNum'), panelEl = $('panel');   // usados a cada quadro
    function loop() {
      const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
      now = t;
      if (COLORS[skin.color].rainbow && !panelEl.hidden) paintLogo();
      if (state === 'quiz') {
        qTime = Math.max(0, qTime - dt); updateTimer();
        if (qTime === 0) {
          $('quizPanel').hidden = true; $('answer').blur();
          over(`A resposta era ${qa} × ${qb} = ${qa * qb}. `, `Tempo <em>esgotado</em>`);
        }
      }
      if (state === 'count') {
        cd -= dt; if (+countNum.textContent !== Math.ceil(cd)) countNum.textContent = Math.ceil(cd);
        if (cd <= 0) { $('countBox').hidden = true; acc = 0; state = 'play'; music.start(); }
      }
      if (pauseBtn.hidden !== (state !== 'play')) pauseBtn.hidden = state !== 'play';
      if (state === 'play') { acc += dt; while (acc >= step && state === 'play') { acc -= step; tick(); } }
      const k = state === 'play' ? acc / step : 1;
      pop = Math.max(0, pop - dt * 4);

      snake.forEach((s, i) => {
        const m = segMesh(i), f = from[i] || s;
        m.visible = true;
        m.position.set(W(f.x + (s.x - f.x) * k), 0.35, W(f.z + (s.z - f.z) * k));
        const sc = i === 0 ? 1.08 + pop * .3 : 1 - i / snake.length * 0.3;
        m.scale.set(sc, sc, sc);
        paint(m, i, snake.length);
      });
      for (let i = snake.length; i < segs.length; i++) segs[i].visible = false;

      // cabeça gira suavemente para a direção atual; a seta mostra a próxima
      const head = segs[0], next = queue[0] || dir;
      head.rotation.y = turnTo(head.rotation.y, angle(state === 'play' ? dir : next), Math.min(1, dt * 14));
      // boca abre quando a comida está perto e fecha de uma vez ao comer (nhac!)
      const near = Math.hypot(W(fpos.x) - head.position.x, W(fpos.z) - head.position.z) < 2.6;
      mouthOpen += ((state === 'play' && near ? 1 : 0) - mouthOpen) * Math.min(1, dt * 12);
      const open = mouthOpen * (1 - pop);
      head.userData.mouth.scale.y = 1 + 3.5 * open;
      head.userData.jaw.scale.z = Math.max(0.001, open); head.userData.jaw.rotation.x = open * 0.35;
      ghostT = Math.max(0, ghostT - dt * 5);
      ghost.visible = ghostT > 0;
      if (ghost.visible) {
        headAt.set(head.position.x, 0.3, head.position.z);
        ghost.position.lerpVectors(headAt, ghostFrom, ghostT); ghost.scale.setScalar(ghostT);
      }
      arrowPivot.position.set(head.position.x, 0.06, head.position.z);
      arrowPivot.rotation.y = angle(next);
      arrowPivot.visible = ['play', 'count', 'pause', 'quiz'].includes(state);
      arrow.material.opacity = state === 'play' ? 0.35 : 0.6 + Math.sin(t * 8) * 0.3;

      food.position.set(W(fpos.x), 0.5 + Math.sin(t * 3) * 0.12, W(fpos.z));
      food.rotation.set(t, t * 1.3, 0);
      glow.position.copy(food.position);
      renderer.render(scene, camera);
      if (state === 'closet') renderPreview(t);
    }

    // --- entrada e saída pela plataforma ---
    game.enter = c => {
      ctx = c; profile = c.storage;
      loadSkin(); if (segs[0]) dress(segs[0]); if (pv) dress(pv.body[0]);
      best = store.get(); $('best').textContent = best;
      $('who').textContent = c.user.name;
      setMuted(c.device.load('muted', false)); setMusicMuted(c.device.load('musicMuted', false));
      resize(); goHome();
      clock.getDelta(); renderer.setAnimationLoop(loop);
    };
    game.leave = () => {
      if (mode === 'free' && score > best) store.set(score);
      music.stop(); state = 'away'; renderer.setAnimationLoop(null);
    };
    game.ready = true;
  }
})();
