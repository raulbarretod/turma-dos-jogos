// Plataforma Turma dos Jogos: login do responsável, perfis das crianças, lista de jogos e carregamento de cada jogo.
//
// Como um jogo entra na plataforma:
//   1. jogos/<pasta>/cartao.js chama Plataforma.register({...}) com o que aparece no cartão
//      (título, etiquetas, descrição, arte, resumo) e os arquivos do jogo (scripts e estilos).
//      (scripts de outro site: { src, integrity } com a impressão digital SRI)
//   2. Ao clicar em Jogar, a plataforma carrega esses arquivos (só na primeira vez)
//      e o jogo, já carregado, se liga com Plataforma.define(id, { enter(ctx), leave() }).
//   3. enter(ctx) recebe: root (o espaço #game-<id> onde o jogo desenha), user { id, name } (o perfil da criança),
//      storage (progresso da criança neste jogo, salvo na nuvem), device (preferências do aparelho),
//      exit() (voltar à lista) e logout() (trocar de jogador).
(() => {
  const $ = id => document.getElementById(id);
  const { Conta, Perfis } = window.Nuvem;
  const POLITICA = 'politica-v1';   // versão da Política de Privacidade aceita no cadastro
  const MAX_PERFIS = 6;
  const CORES = ['#4fd16e', '#3fc6d8', '#5a78e6', '#b05ae6', '#ff4f8b', '#ff6b4a', '#ffb238', '#d8d23f'];

  const local = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
  };
  const ULTIMO_PERFIL = 'turma:perfil', PENDENTES = 'turma:pendentes';

  let perfis = [], perfil = null, current = null;
  const games = [];

  // --- progresso das crianças ---
  // Os jogos leem e gravam na hora (memória); o que mudou vai para a nuvem em lotes, 1,5 s depois.
  // O que ainda não foi enviado fica guardado no aparelho e é reenviado se faltar internet ou a página fechar.
  const pendentes = local.get(PENDENTES, {});   // { idDoPerfil: { chave: valor } }
  let timer = null;
  const storageFor = g => ({
    load: (key, fallback) => { const v = perfil.dados[`${g.storage}:${key}`]; return v === undefined ? fallback : structuredClone(v); },
    save: (key, value) => {
      const k = `${g.storage}:${key}`;
      perfil.dados[k] = structuredClone(value);
      (pendentes[perfil.id] ??= {})[k] = value;
      local.set(PENDENTES, pendentes);
      clearTimeout(timer); timer = setTimeout(enviar, 1500);
    },
  });
  async function enviar(manter = false) {
    clearTimeout(timer); timer = null;
    for (const [id, lote] of Object.entries(pendentes)) {
      delete pendentes[id];
      try { await Perfis.salvarDados(id, lote, manter); }
      catch (e) {
        if (e.codigo === 'perfil') continue;   // perfil apagado em outro aparelho
        pendentes[id] = { ...lote, ...pendentes[id] };
        timer ??= setTimeout(enviar, 15000);
      }
    }
    local.set(PENDENTES, pendentes);
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(true); });
  addEventListener('online', () => enviar());
  // preferências do aparelho (som, música): continuam só neste navegador
  const deviceFor = g => ({
    load: (key, fallback) => local.get(`${g.storage}:${key}`, fallback),
    save: (key, value) => local.set(`${g.storage}:${key}`, value),
  });

  // carrega cada arquivo uma única vez
  const loaded = {};
  function loadFile(tag, attrs) {
    const url = attrs.src || attrs.href;
    return loaded[url] ??= new Promise((resolve, reject) => {
      const el = Object.assign(document.createElement(tag), attrs);
      el.onload = resolve;
      el.onerror = () => { delete loaded[url]; reject(new Error(url)); };
      document.head.append(el);
    });
  }

  function showPlatform(panelId) {
    current?.leave?.(); current = null;
    document.body.classList.add('platform');
    for (const id of ['loginPanel', 'perfisPanel', 'hubPanel', 'gameRoot']) $(id).hidden = id !== panelId;
  }

  const MENSAGENS = {
    UsernameExistsException:'O e-mail informado já existe nas nossas bases de dados. Use "Entrar" ou "Esqueci minha senha".',
    NotAuthorizedException:'E-mail ou senha incorretos.',
    UserNotFoundException:'E-mail ou senha incorretos.',
    CodeMismatchException:'Código incorreto. Confira o e-mail e tente de novo.',
    ExpiredCodeException:'Esse código expirou. Clique em "Reenviar código".',
    // na tela de confirmar, "incorreto" e "expirado" recebem a mesma resposta
    CodigoInvalidoNoCadastro:'Código incorreto ou vencido. Clique em "Reenviar código" e use o código do e-mail mais recente.',
    InvalidPasswordException:'A senha precisa ter pelo menos 8 caracteres, com uma letra maiúscula, um número e um caractere especial (ex.: ! @ # $ %).',
    LimitExceededException:'Muitas tentativas. Espere alguns minutos e tente de novo.',
    TooManyRequestsException:'Muitas tentativas. Espere alguns minutos e tente de novo.',
    TooManyFailedAttemptsException:'Muitas tentativas. Espere alguns minutos e tente de novo.',
    CodeDeliveryFailureException:'Não conseguimos enviar o e-mail. Confira o endereço digitado.',
    InvalidParameterException:'Confira o e-mail digitado.',
    UserLambdaValidationException:'Para criar a conta, marque que você é o responsável e concorda com os Termos e a Política.',
    SemInternet:'Sem conexão com a internet. Verifique e tente de novo.',
    limite:`Cada conta pode ter até ${MAX_PERFIS} perfis.`,
  };
  const mensagem = e => MENSAGENS[e?.codigo] || 'Algo deu errado. Tente de novo em instantes.';

  // --- login do responsável ---
  // Um só formulário com várias etapas: entrar, criar conta, confirmar e-mail, esqueci a senha, nova senha.
  const ETAPAS = {
    entrar:    { abas:true, email:true, senha:'Senha', esqueci:true, botao:'Entrar' },
    criar:     { abas:true, email:true, senha:'Crie uma senha', dica:true, aceite:true, botao:'Criar conta' },
    confirmar: { codigo:true, reenviar:true, voltar:true, botao:'Confirmar',
      aviso:e => `Enviamos um código de 6 números para ${e}. Se não chegar em alguns minutos, confira a caixa de spam.` },
    esqueci:   { email:true, voltar:true, botao:'Enviar código',
      aviso:() => 'Digite o e-mail da conta. Vamos enviar um código para você criar uma nova senha.' },
    novaSenha: { codigo:true, senha:'Nova senha', dica:true, voltar:true, botao:'Salvar nova senha',
      aviso:e => `Enviamos um código para ${e}. Digite o código e a nova senha.` },
  };
  let etapa = 'entrar', pendente = {};   // pendente: e-mail (e senha) entre uma etapa e outra
  function setEtapa(nome, ok = '') {
    etapa = nome;
    const c = ETAPAS[nome];
    $('loginTabs').hidden = !c.abas;
    $('tabLogin').setAttribute('aria-pressed', nome === 'entrar'); $('tabSignup').setAttribute('aria-pressed', nome === 'criar');
    $('loginAviso').hidden = !c.aviso; $('loginAviso').textContent = c.aviso?.(pendente.email) ?? '';
    $('fEmail').hidden = !c.email; $('fCodigo').hidden = !c.codigo; $('fSenha').hidden = !c.senha;
    $('senhaRotulo').textContent = c.senha || ''; $('senhaDica').hidden = !c.dica;
    $('loginPass').autocomplete = nome === 'entrar' ? 'current-password' : 'new-password';
    $('fAceite').hidden = !c.aceite;
    $('linkEsqueci').hidden = !c.esqueci; $('linkReenviar').hidden = !c.reenviar; $('linkVoltar').hidden = !c.voltar;
    $('loginSubmit').textContent = c.botao;
    $('loginCode').value = ''; $('loginError').textContent = ''; $('loginOk').textContent = ok;
    mostrarSenha(false);
    // sem pular a página: no celular a apresentação vem antes do login
    (c.codigo ? $('loginCode') : c.email && !$('loginEmail').value ? $('loginEmail') : c.senha ? $('loginPass') : $('loginEmail')).focus({ preventScroll:true });
  }
  function mostrarSenha(ver) {
    $('loginPass').type = ver ? 'text' : 'password';
    $('verSenha').setAttribute('aria-pressed', ver);
    $('verSenha').setAttribute('aria-label', ver ? 'Esconder senha' : 'Mostrar senha');
  }
  $('verSenha').onclick = () => mostrarSenha($('loginPass').type === 'password');
  // botão "Entrar" do topo: leva até o quadro de login, já na aba Entrar
  $('topoEntrar').onclick = () => {
    setEtapa('entrar');
    $('loginForm').scrollIntoView({ behavior:'smooth', block:'center' });
  };
  // "Criar conta grátis" (seção Como Funciona): mesmo quadro, já na aba Criar Conta
  $('comoCriar').onclick = () => {
    setEtapa('criar');
    $('loginForm').scrollIntoView({ behavior:'smooth', block:'center' });
  };
  $('tabLogin').onclick = () => setEtapa('entrar');
  $('tabSignup').onclick = () => setEtapa('criar');
  $('linkEsqueci').onclick = () => setEtapa('esqueci');
  $('linkVoltar').onclick = () => setEtapa('entrar');
  $('linkReenviar').onclick = async () => {
    // resposta igual para qualquer e-mail (não revela se já existe conta), exceto falta de internet ou excesso de tentativas
    const ok = () => { $('loginError').textContent = ''; $('loginOk').textContent = 'Reenviamos o código. ' +
      'Se o e-mail não chegar em alguns minutos, confira a caixa de spam.'; };
    try { await Conta.reenviar(pendente.email); ok(); }
    catch (e) { ['SemInternet', 'LimitExceededException', 'TooManyRequestsException'].includes(e.codigo) ? $('loginError').textContent = mensagem(e) : ok(); }
  };
  $('loginForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('loginEmail').value.trim().toLowerCase(), senha = $('loginPass').value, codigo = $('loginCode').value.trim();
    const c = ETAPAS[etapa];
    const err = t => { $('loginError').textContent = t; $('loginOk').textContent = ''; };
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Digite um e-mail válido.');
    if (c.codigo && !/^\d{6}$/.test(codigo)) return err('O código tem 6 números.');
    if (c.senha && !senha) return err('Digite a senha.');
    // mesma regra do Cognito: 8+ caracteres, maiúscula, número e um dos caracteres especiais aceitos por ele
    if (c.dica && (senha.length < 8 || !/[A-Z]/.test(senha) || !/\d/.test(senha) ||
        !/[\^$*.\[\]{}()?"!@#%&\/\\,><':;|_~`=+\- ]/.test(senha))) return err(MENSAGENS.InvalidPasswordException);
    if (c.aceite && !$('loginConsent').checked) return err('Para criar a conta, marque que você é o responsável e concorda com a Política de Privacidade.');
    const botao = $('loginSubmit'), texto = botao.textContent;
    if (botao.disabled) return;   // Enter repetido não manda o mesmo pedido várias vezes
    botao.disabled = true; botao.textContent = 'Aguarde…';
    try {
      if (etapa === 'entrar') { await Conta.entrar(email, senha); return entrou(); }
      if (etapa === 'criar') {
        // e-mail já cadastrado: o Cognito responde UsernameExistsException e o site avisa (não manda para a tela de código).
        // Cadastro que nunca foi confirmado: em "Entrar" o Cognito responde UserNotConfirmed e o site reenvia o código (abaixo).
        await Conta.criar(email, senha, POLITICA);
        pendente = { email, senha }; return setEtapa('confirmar');
      }
      if (etapa === 'confirmar') {
        await Conta.confirmar(pendente.email, codigo);
        await Conta.entrar(pendente.email, pendente.senha); return entrou();
      }
      if (etapa === 'esqueci') { await Conta.esqueci(email); pendente = { email }; return setEtapa('novaSenha'); }
      if (etapa === 'novaSenha') {
        await Conta.novaSenha(pendente.email, codigo, senha);
        await Conta.entrar(pendente.email, senha); return entrou();
      }
    } catch (x) {
      if (x.codigo === 'UserNotConfirmedException') {   // criou a conta mas não confirmou o e-mail
        pendente = { email, senha };
        await Conta.reenviar(email).catch(() => {});
        return setEtapa('confirmar');
      }
      if (etapa === 'confirmar' && ['NotAuthorizedException', 'ExpiredCodeException', 'CodeMismatchException'].includes(x.codigo))
        return err(MENSAGENS.CodigoInvalidoNoCadastro);
      err(mensagem(x));
    } finally { botao.disabled = false; if (botao.textContent === 'Aguarde…') botao.textContent = texto; }
  };
  function entrou() {
    $('loginPass').value = ''; $('loginConsent').checked = false; pendente = {};
    abrirPerfis();
  }
  async function sair(aviso = '') {
    await enviar();
    Conta.sair(); perfil = null; perfis = [];
    try { localStorage.removeItem(ULTIMO_PERFIL); } catch {}
    showPlatform('loginPanel'); setEtapa('entrar', aviso);
  }

  // --- "Quem vai jogar?": perfis das crianças ---
  let editando = false, perfilEmEdicao = null, corEscolhida = 0, generoEscolhido = null;
  const inicial = nome => [...nome.trim()][0]?.toUpperCase() ?? '?';
  const esc = t => t.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  // menino ou menina fica no progresso do perfil (chave "turma:genero"), então não precisa mudar a API
  const GENERO = 'turma:genero', GENEROS = { menino:'Menino', menina:'Menina' };
  const generoDe = p => GENEROS[p?.dados?.[GENERO]] ? p.dados[GENERO] : null;
  // desenho da criança (busto) sobre a cor do perfil; perfis antigos sem escolha continuam com a inicial
  const ROSTO = `
    <path d="M16 100c2-20 16-27 34-27s32 7 34 27z" fill="#0b1624" fill-opacity=".3"/>
    <rect x="44" y="62" width="12" height="14" rx="5" fill="#e9b387"/>
    <circle cx="50" cy="47" r="22" fill="#f6c9a0"/>
    <circle cx="41.5" cy="50" r="2.8" fill="#2b1a10"/><circle cx="58.5" cy="50" r="2.8" fill="#2b1a10"/>
    <circle cx="36" cy="57" r="3.6" fill="#ff7a8a" fill-opacity=".45"/><circle cx="64" cy="57" r="3.6" fill="#ff7a8a" fill-opacity=".45"/>
    <path d="M44 58q6 6 12 0" fill="none" stroke="#2b1a10" stroke-width="2.4" stroke-linecap="round"/>`;
  const DESENHOS = {
    menino: `
      <circle cx="28" cy="49" r="5" fill="#e9b387"/><circle cx="72" cy="49" r="5" fill="#e9b387"/>${ROSTO}
      <path d="M27 47c-3-19 10-27 24-27 13 0 25 8 22 27-3-9-8-13-13-14-5 3-13 4-20 2-6 2-10 6-13 12z" fill="#4a2c1a"/>`,
    menina: `
      <path d="M26 48c-3-22 10-30 24-30s27 8 24 30l4 26c-6 6-15 5-18-2H40c-3 7-12 8-18 2z" fill="#6b3a1f"/>${ROSTO}
      <path d="M38.9 49l-2.6-1.6M61.1 49l2.6-1.6" stroke="#2b1a10" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M28 48c0-17 10-24 22-24s22 7 22 24c-8-4-14-10-16-15-6 7-17 12-28 15z" fill="#6b3a1f"/>
      <g fill="#ff4f8b" stroke="#fff" stroke-width="1.5" transform="rotate(-18 65 23)"><ellipse cx="59" cy="23" rx="6.5" ry="4.8"/><ellipse cx="71" cy="23" rx="6.5" ry="4.8"/><circle cx="65" cy="23" r="3.2" fill="#d6336c"/></g>`,
  };
  const desenho = g => `<svg viewBox="0 0 100 100" aria-hidden="true">${DESENHOS[g]}</svg>`;
  const avatar = p => generoDe(p) ? desenho(generoDe(p)) : esc(inicial(p.nome));
  async function abrirPerfis({ automatico = false } = {}) {
    await enviar();
    perfil = null; editando = false;
    showPlatform('perfisPanel');
    $('contaEmail').textContent = Conta.email;
    $('perfisErro').textContent = ''; $('perfilForm').hidden = true;
    $('perfisEditar').hidden = true; $('contaExcluir').hidden = true;
    $('perfisLista').innerHTML = '<p class="note">Carregando perfis…</p>';
    try { perfis = await Perfis.listar(); }
    catch (e) {
      if (e.codigo === 'NaoLogado') return sair('Seu acesso expirou. Entre de novo.');
      $('perfisLista').innerHTML = '';
      $('perfisErro').textContent = `${mensagem(e)} `;
      $('perfisErro').append(Object.assign(document.createElement('button'),
        { className:'link', textContent:'Tentar de novo', onclick:() => abrirPerfis({ automatico }) }));
      return;
    }
    // o que ficou para enviar neste aparelho vale mais que a cópia da nuvem
    for (const p of perfis) Object.assign(p.dados ??= {}, pendentes[p.id]);
    enviar();
    const ultimo = perfis.find(p => p.id === local.get(ULTIMO_PERFIL, null));
    if (automatico && ultimo) return escolher(ultimo);
    desenharPerfis();
    if (!perfis.length) abrirFormPerfil(null);
  }
  function desenharPerfis() {
    $('perfisTitulo').innerHTML = editando ? 'Editar <em>perfis</em>' : 'Quem vai <em>jogar?</em>';
    $('perfisEditar').textContent = editando ? 'Pronto' : 'Editar perfis';
    $('perfisEditar').hidden = !perfis.length;
    $('contaExcluir').hidden = !editando;
    $('perfisLista').innerHTML = perfis.map(p => `
      <button class="perfil${editando ? ' editando' : ''}" data-perfil="${p.id}" style="--cor:${CORES[p.cor] ?? CORES[0]}">
        <span class="avatar" aria-hidden="true">${avatar(p)}</span><span class="nome">${esc(p.nome)}</span>
      </button>`).join('') +
      (perfis.length && perfis.length < MAX_PERFIS && !editando ? `
      <button class="perfil novo" data-novo>
        <span class="avatar" aria-hidden="true">+</span><span class="nome">Novo perfil</span>
      </button>` : '');
  }
  $('perfisLista').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.novo !== undefined) return abrirFormPerfil(null);
    const p = perfis.find(x => x.id === b.dataset.perfil);
    editando ? abrirFormPerfil(p) : escolher(p);
  };
  $('perfisEditar').onclick = () => { editando = !editando; $('perfilForm').hidden = true; desenharPerfis(); };
  $('perfisSair').onclick = () => sair();
  $('contaExcluir').onclick = async () => {
    if (!confirm('Excluir a conta apaga para sempre o login e o progresso de todas as crianças. Deseja continuar?')) return;
    try {
      await Conta.excluir();
      for (const id of Object.keys(pendentes)) delete pendentes[id];
      local.set(PENDENTES, pendentes);
      sair('Conta excluída.');
    } catch (e) { $('perfisErro').textContent = mensagem(e); }
  };

  function abrirFormPerfil(p) {
    perfilEmEdicao = p; corEscolhida = p?.cor ?? perfis.length % CORES.length; generoEscolhido = generoDe(p);
    $('perfilFormTitulo').textContent = p ? `Editar ${p.nome}` : perfis.length ? 'Novo perfil' : 'Crie o perfil da primeira criança';
    $('perfilNome').value = p?.nome ?? '';
    $('perfilApagar').hidden = !p; $('perfilCancelar').hidden = !perfis.length;
    $('perfilErro').textContent = '';
    desenharCores();
    $('perfilForm').hidden = false; $('perfilNome').focus();
  }
  function desenharCores() {
    $('perfilCores').innerHTML = CORES.map((c, i) =>
      `<button type="button" role="radio" aria-checked="${i === corEscolhida}" aria-label="Cor ${i + 1}" data-cor="${i}" style="--cor:${c}"></button>`).join('');
    desenharGeneros();   // os desenhos aparecem na cor escolhida
  }
  function desenharGeneros() {
    $('perfilGenero').innerHTML = Object.entries(GENEROS).map(([g, rotulo]) => `
      <button type="button" role="radio" aria-checked="${g === generoEscolhido}" data-genero="${g}" style="--cor:${CORES[corEscolhida]}">
        <span class="avatar">${desenho(g)}</span>${rotulo}</button>`).join('');
  }
  $('perfilCores').onclick = e => {
    const b = e.target.closest('[data-cor]'); if (!b) return;
    corEscolhida = +b.dataset.cor; desenharCores(); $('perfilCores').querySelector(`[data-cor="${corEscolhida}"]`).focus();
  };
  $('perfilGenero').onclick = e => {
    const b = e.target.closest('[data-genero]'); if (!b) return;
    generoEscolhido = b.dataset.genero; $('perfilErro').textContent = ''; desenharGeneros(); $('perfilGenero').querySelector(`[data-genero="${generoEscolhido}"]`).focus();
  };
  $('perfilCancelar').onclick = () => { $('perfilForm').hidden = true; desenharPerfis(); };
  $('perfilForm').onsubmit = async e => {
    e.preventDefault();
    const nome = $('perfilNome').value.trim();
    if (!nome) return void ($('perfilErro').textContent = 'Digite um apelido.');
    if (!generoEscolhido) return void ($('perfilErro').textContent = 'Escolha o desenho: menino ou menina.');
    const botao = $('perfilSalvar'); botao.disabled = true;
    try {
      let p = perfilEmEdicao;
      if (p) {
        await Perfis.editar(p.id, nome, corEscolhida);
        Object.assign(p, { nome, cor:corEscolhida });
      } else {
        perfis.push(p = await Perfis.criar(nome, corEscolhida));
        perfilEmEdicao = p;   // se o passo seguinte falhar, salvar de novo não cria um perfil repetido
        editando = false;
      }
      if (generoDe(p) !== generoEscolhido) {
        await Perfis.salvarDados(p.id, { [GENERO]:generoEscolhido });
        (p.dados ??= {})[GENERO] = generoEscolhido;
      }
      $('perfilForm').hidden = true; desenharPerfis();
    } catch (x) { $('perfilErro').textContent = mensagem(x); }
    finally { botao.disabled = false; }
  };
  $('perfilApagar').onclick = async () => {
    const p = perfilEmEdicao;
    if (!confirm(`Apagar o perfil de ${p.nome}? Todo o progresso nos jogos será perdido.`)) return;
    try {
      await Perfis.apagar(p.id);
      perfis = perfis.filter(x => x !== p); delete pendentes[p.id]; local.set(PENDENTES, pendentes);
      $('perfilForm').hidden = true;
      if (!perfis.length) { editando = false; desenharPerfis(); return abrirFormPerfil(null); }
      desenharPerfis();
    } catch (x) { $('perfilErro').textContent = mensagem(x); }
  };
  function escolher(p) {
    perfil = p; local.set(ULTIMO_PERFIL, p.id);
    openHub();
  }
  $('hubTrocar').onclick = () => abrirPerfis();
  $('hubLogout').onclick = () => sair();

  // --- lista de jogos ---
  const soonSlots = () => Math.max(1, 3 - games.length);   // espaços "Em breve" completando a fileira
  const CHEERS = ['Pronto para aprender brincando?', 'Que tal bater seu recorde hoje?', 'Cada jogo é um passo a mais!',
    'Bora treinar a mente?', 'Hoje é dia de conquistar medalhas!'];
  function openHub() {
    showPlatform('hubPanel');
    $('hubName').textContent = perfil.nome;
    const h = new Date().getHours();
    $('hubHello').textContent = h < 12 ? 'Bom dia,' : h < 18 ? 'Boa tarde,' : 'Boa noite,';
    $('hubCheer').textContent = CHEERS[Math.random() * CHEERS.length | 0];
    $('hubError').textContent = '';
    // reinicia a animação da saudação toda vez que a tela abre
    document.querySelectorAll('.hello .pop').forEach(el => { el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; });
    $('games').innerHTML = games.map(g => `
      <article class="game-card">
        <div class="art">${g.art(storageFor(g))}</div>
        <div class="body">
          <div class="tags">${g.tags.map(t => `<span>${t}</span>`).join('')}</div>
          <h3>${g.title}</h3>
          <p>${g.desc}</p>
          <p class="gstats">${g.stats(storageFor(g))}</p>
          <button data-game="${g.id}">Jogar</button>
        </div>
      </article>`).join('') +
      Array.from({ length:soonSlots() }, () => `
      <article class="game-card soon" aria-label="Novo jogo em breve">
        <div class="art">Em breve</div>
        <div class="body"><h3>Novo jogo</h3><p>Mais um jogo educativo está a caminho.</p></div>
      </article>`).join('');
    $('games').querySelector('[data-game]')?.focus();
  }
  async function launch(g, button) {
    button.disabled = true; button.textContent = 'Carregando…';
    try {
      await Promise.all(g.styles.map(href => loadFile('link', { rel:'stylesheet', href })));
      // em ordem: bibliotecas antes do jogo; arquivo de fora vem como { src, integrity } e é conferido pelo navegador
      for (const s of g.scripts) await loadFile('script', typeof s === 'string' ? { src:s } : { crossOrigin:'anonymous', ...s });
    } catch {
      $('hubError').textContent = `Não foi possível abrir ${g.title}. Verifique a internet e tente de novo.`;
      button.disabled = false; button.textContent = 'Jogar';
      return;
    }
    showPlatform('gameRoot');
    document.body.classList.remove('platform');
    // cada jogo desenha no próprio espaço (#game-<id>); só o do jogo atual fica visível
    let root = $(`game-${g.id}`);
    if (!root) { root = Object.assign(document.createElement('div'), { id:`game-${g.id}` }); $('gameRoot').append(root); }
    for (const el of $('gameRoot').children) el.hidden = el !== root;
    current = g;
    g.enter({ root, user:{ id:perfil.id, name:perfil.nome },
      storage:storageFor(g), device:deviceFor(g), exit:openHub, logout:() => abrirPerfis() });
  }
  $('games').onclick = e => {
    const b = e.target.closest('[data-game]');
    if (b) launch(games.find(g => g.id === b.dataset.game), b);
  };

  window.Plataforma = {
    register(meta) { games.push({ styles:[], scripts:[], ...meta }); },
    define(id, impl) { Object.assign(games.find(g => g.id === id), impl); },
    start() {
      if (!window.Nuvem.configurado) {
        showPlatform('loginPanel'); setEtapa('entrar');
        $('loginError').textContent = 'O login ainda não foi configurado (plataforma/config.js).';
        $('loginSubmit').disabled = true;
        return;
      }
      // continua logado ao recarregar a página, já no último perfil usado
      if (Conta.logado) abrirPerfis({ automatico:true });
      else { showPlatform('loginPanel'); setEtapa('entrar'); }
    },
  };
})();
