// Servidor local: o site em http://localhost:8000 e o painel do administrador em http://localhost:8000/admin
// (para o site local chamar a API, inclua http://localhost:8000 no parâmetro EnderecosDoSite do stack).
// Uso: node servir.mjs   (ou dê dois cliques em admin.cmd, que já abre o painel)
//
// O painel só existe aqui, nunca vai para o Amplify: no site publicado, /admin mostra a página 404.
// Ele só aceita conexões deste computador (127.0.0.1) e usa o login da AWS do perfil "turmadosjogos"
// (aws login --profile turmadosjogos), que também só existe neste computador.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { extname, join, normalize } from 'node:path';

const PORTA = 8000;
const PASTA = join(import.meta.dirname, 'site');
const PAINEL = join(import.meta.dirname, 'admin', 'index.html');
const TIPOS = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png',
  '.webp':'image/webp', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml' };

// ---------------- painel do administrador ----------------
const PERFIL = process.env.TURMA_PERFIL || 'turmadosjogos', REGIAO = 'sa-east-1', PILHA = 'turma-dos-jogos';
// senha de uso único, criada a cada vez que o servidor liga: vai dentro da página do painel e toda chamada precisa dela.
// Outro site aberto no navegador não consegue ler a página, então não consegue chamar o painel.
const CHAVE = randomBytes(24).toString('hex');
const HOSTS = new Set([`localhost:${PORTA}`, `127.0.0.1:${PORTA}`]);
const AWS_EXE = [join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Amazon', 'AWSCLIV2', 'aws.exe')].find(existsSync) ?? 'aws';
const ambiente = { ...process.env }; delete ambiente.AWS_DEFAULT_SSL_VERIFY;   // o perfil usa ca_bundle: certificado sempre verificado

function aws(args) {
  return new Promise((ok, falha) => execFile(AWS_EXE, [...args, '--profile', PERFIL, '--region', REGIAO, '--output', 'json'],
    { env:ambiente, maxBuffer:50e6, windowsHide:true },
    (e, saida, erro) => {
      if (!e) return ok(saida.trim() ? JSON.parse(saida) : {});
      const texto = String(erro || e.message);
      const x = new Error(texto.trim().split('\n').pop());
      x.login = /expired|reauthenticate|aws login|Unable to locate credentials|token/i.test(texto);
      falha(x);
    }));
}
// valor do DynamoDB ({ S: 'x' }, { N: '1' }, { M: {...} }...) para JavaScript comum
const valor = v => v.S ?? (v.N !== undefined ? +v.N : v.BOOL ?? (v.NULL ? null : v.M ? objeto(v.M) : v.L ? v.L.map(valor) : v.SS ?? v.NS));
const objeto = m => Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, valor(v)]));

let recursos = null;   // id do grupo de usuários do Cognito e nome da tabela, lidos da pilha do CloudFormation
async function lerRecursos() {
  if (recursos) return recursos;
  const r = await aws(['cloudformation', 'describe-stack-resources', '--stack-name', PILHA]);
  const id = nome => r.StackResources.find(x => x.LogicalResourceId === nome)?.PhysicalResourceId;
  return recursos = { pool:id('Usuarios'), tabela:id('Perfis') };
}
const usernameValido = u => typeof u === 'string' && /^[0-9a-f-]{36}$/.test(u);

const API = {
  async 'GET contas'() {
    const { pool, tabela } = await lerRecursos();
    const [quem, us, linhas] = await Promise.all([
      aws(['sts', 'get-caller-identity']),
      aws(['cognito-idp', 'list-users', '--user-pool-id', pool]),
      // só as colunas necessárias (sem o progresso das crianças)
      aws(['dynamodb', 'scan', '--table-name', tabela, '--projection-expression', '#d, #i, validaAte, plano',
        '--expression-attribute-names', JSON.stringify({ '#d':'dono', '#i':'id' })]),
    ]);
    const itens = linhas.Items.map(objeto);
    const contas = us.Users.map(u => {
      const at = Object.fromEntries(u.Attributes.map(a => [a.Name, a.Value]));
      const minhas = itens.filter(i => i.dono === u.Username);
      const l = minhas.find(i => i.id === '#licenca');
      return { username:u.Username, email:at.email, status:u.UserStatus, ativo:u.Enabled, criado:u.UserCreateDate,
        perfis:minhas.filter(i => !String(i.id).startsWith('#')).length,
        licenca:l ? { validaAte:l.validaAte, plano:l.plano, ativa:Date.parse(l.validaAte) > Date.now() } : null };
    }).sort((a, b) => String(a.email).localeCompare(String(b.email)));
    return { quem:quem.Arn, perfil:PERFIL, contas };
  },
  async 'GET perfis'(q) {
    if (!usernameValido(q.username)) throw Object.assign(new Error('conta inválida'), { status:400 });
    const { tabela } = await lerRecursos();
    const r = await aws(['dynamodb', 'query', '--table-name', tabela, '--key-condition-expression', 'dono = :d',
      '--expression-attribute-values', JSON.stringify({ ':d':{ S:q.username } })]);
    return { perfis:r.Items.map(objeto).filter(i => !String(i.id).startsWith('#')).map(({ dono, ...p }) => p) };
  },
  // licença de teste: grava a mesma linha "#licenca" que a API lê ({ validaAte, plano })
  async 'POST licenca'(q, corpo) {
    const dias = Math.round(+corpo.dias);
    if (!usernameValido(corpo.username) || !(dias >= 1 && dias <= 3650)) throw Object.assign(new Error('dados inválidos'), { status:400 });
    const { tabela } = await lerRecursos();
    const validaAte = new Date(Date.now() + dias * 864e5).toISOString();
    await aws(['dynamodb', 'put-item', '--table-name', tabela, '--item', JSON.stringify({
      dono:{ S:corpo.username }, id:{ S:'#licenca' }, validaAte:{ S:validaAte }, plano:{ S:'teste-admin' } })]);
    return { validaAte };
  },
  async 'DELETE licenca'(q, corpo) {
    if (!usernameValido(corpo.username)) throw Object.assign(new Error('conta inválida'), { status:400 });
    const { tabela } = await lerRecursos();
    await aws(['dynamodb', 'delete-item', '--table-name', tabela, '--key',
      JSON.stringify({ dono:{ S:corpo.username }, id:{ S:'#licenca' } })]);
    return { ok:true };
  },
  // abre o login da AWS no navegador deste computador (o mesmo que "aws login --profile turmadosjogos")
  async 'POST login'() {
    spawn(AWS_EXE, ['login', '--profile', PERFIL, '--region', REGIAO], { env:ambiente, detached:true, stdio:'ignore', windowsHide:true }).unref();
    return { ok:true };
  },
};

async function painel(req, res, url) {
  const json = (status, dados) => { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(dados)); };
  // só este computador, pelo endereço local (bloqueia sites que tentam se passar por "localhost")
  if (!HOSTS.has(req.headers.host)) return json(403, { erro:'endereço não permitido' });
  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    const html = (await readFile(PAINEL, 'utf8')).replace('__CHAVE_DO_PAINEL__', CHAVE);
    res.writeHead(200, { 'Content-Type':TIPOS['.html'], 'Cache-Control':'no-store', 'X-Frame-Options':'DENY',
      'Content-Security-Policy':"frame-ancestors 'none'", 'Referrer-Policy':'no-referrer' });
    return res.end(html);
  }
  const acao = `${req.method} ${url.pathname.replace(/^\/admin\/api\//, '')}`;
  if (!url.pathname.startsWith('/admin/api/') || !API[acao]) return json(404, { erro:'rota' });
  if (req.headers['x-chave-painel'] !== CHAVE) return json(403, { erro:'chave do painel inválida: recarregue a página' });
  let corpo = {};
  if (req.method !== 'GET') {
    let t = ''; for await (const parte of req) { t += parte; if (t.length > 10000) return json(413, { erro:'grande demais' }); }
    try { corpo = t ? JSON.parse(t) : {}; } catch { return json(400, { erro:'JSON inválido' }); }
  }
  try { json(200, await API[acao](Object.fromEntries(url.searchParams), corpo)); }
  catch (e) { json(e.status || (e.login ? 401 : 500), { erro:e.message, login:!!e.login }); }
}

// ---------------- site ----------------
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return painel(req, res, url);
  let caminho = normalize(decodeURIComponent(url.pathname)).replace(/^([\\/]\.\.)+/, '');
  if (caminho.endsWith('/') || caminho.endsWith('\\')) caminho += 'index.html';
  try {
    const dados = await readFile(join(PASTA, caminho));
    res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(dados);
  } catch {
    // igual à regra do Amplify: endereço que não existe mostra a página 404 do site, com o código 404
    res.writeHead(404, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-store' }); res.end(await readFile(join(PASTA, '404.html')));
  }
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`Site em http://localhost:${PORTA}`);
  console.log(`Painel do administrador em http://localhost:${PORTA}/admin  (perfil da AWS: ${PERFIL})`);
});
