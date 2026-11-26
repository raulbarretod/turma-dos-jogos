// Servidor local para testar o site em http://localhost:8000 (para chamar a API daqui, inclua http://localhost:8000 no parâmetro EnderecosDoSite do stack).
// Uso: node servir.mjs
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PASTA = join(import.meta.dirname, 'site');
const TIPOS = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.png':'image/png',
  '.webp':'image/webp', '.webmanifest':'application/manifest+json', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8', '.xml':'application/xml' };

createServer(async (req, res) => {
  let caminho = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\\/]\.\.)+/, '');
  if (caminho.endsWith('/') || caminho.endsWith('\\')) caminho += 'index.html';
  try {
    const dados = await readFile(join(PASTA, caminho));
    res.writeHead(200, { 'Content-Type': TIPOS[extname(caminho)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(dados);
  } catch {
    // igual à regra do Amplify: endereço desconhecido mostra o index.html
    res.writeHead(200, { 'Content-Type': TIPOS['.html'] }); res.end(await readFile(join(PASTA, 'index.html')));
  }
}).listen(8000, () => console.log('Site em http://localhost:8000'));
