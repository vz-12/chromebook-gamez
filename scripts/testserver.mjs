/* ===========================================================================
   VOIDRUNNER — local TEST SERVER  (dev only; never shipped)

   A tiny dependency-free static server for the synced repo that injects the
   DEV TEST CONSOLE (scripts/testconsole.js) into index.html on the fly. No
   wrangler, no build, no network: just the client game + the test console,
   for driving every route / boss / path / story flag in the local browser.

     node scripts/testserver.mjs [port]      (default 8790)

   The Worker API (src/*: sync, auth, leaderboard, PvP) is NOT served here —
   those calls just fail quietly, which the client already tolerates. Use the
   full wrangler dev (`npm run dev`) when you need the back end; it injects the
   same console via scripts/dev.mjs. The repo's real index.html is never
   modified by either path.
   ========================================================================= */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8790;
const CONSOLE_SRC = join(ROOT, 'scripts', 'testconsole.js');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.webp': 'image/webp', '.opus': 'audio/ogg', '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

async function injectConsole(html) {
  let src;
  try { src = await readFile(CONSOLE_SRC, 'utf8'); }
  catch { return html; }
  const tag = '\n<!-- DEV TEST CONSOLE (local only — injected by scripts/testserver.mjs) -->\n<script>\n'
            + src + '\n</scr' + 'ipt>\n';
  return html.includes('</body>') ? html.replace('</body>', tag + '</body>') : html + tag;
}

createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/' || urlPath.endsWith('/')) urlPath += 'index.html';
    // keep the path inside ROOT
    const rel = normalize(urlPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');
    let file = join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    if (!existsSync(file)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404: ' + rel); return; }

    const ext = extname(file).toLowerCase();
    if (ext === '.html') {
      let html = await readFile(file, 'utf8');
      html = await injectConsole(html);
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      res.end(html);
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end('500: ' + e.message);
  }
}).listen(PORT, () => {
  console.log('VOIDRUNNER test server  →  http://localhost:' + PORT);
  console.log('  game    : ' + join(ROOT, 'index.html') + '  (synced repo)');
  console.log('  console : injected scripts/testconsole.js — press ` or ⚙ in the page');
  console.log('  note    : static only; Worker API (sync/auth/leaderboard/pvp) is not served');
});
