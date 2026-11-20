// Tiny zero-dependency static server for the Phase 0 demo.
// Serves the engine/ folder; open http://localhost:5173/demo/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.env.PORT || 5173);
const types = {
  '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css',
  '.spice': 'text/plain; charset=utf-8', '.cir': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(root, path));
    if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
    if ((await stat(file)).isDirectory()) { res.writeHead(302, { Location: path + '/' }).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(port, () => console.log(`demo: http://localhost:${port}/demo/`));
