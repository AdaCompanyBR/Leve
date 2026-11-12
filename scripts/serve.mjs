// Servidor estático mínimo para rodar o Leve localmente: npm start
// Igual ao GitHub Pages: a landing (pasta site/) na raiz e o app em /app/.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.md': 'text/plain; charset=utf-8' };
const port = Number(process.env.PORT) || 5173;

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  if (path === '/app' || path === '\\app') { res.writeHead(301, { location: '/app/' }); return res.end(); }
  if (path.endsWith('/') || path.endsWith('\\')) path += 'index.html';
  const file = /^[/\\]app[/\\]/.test(path) ? join(root, path.slice(4)) : join(root, 'site', path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
}).listen(port, () => console.log(`Landing em http://localhost:${port}/ e app em http://localhost:${port}/app/`));
