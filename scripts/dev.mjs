/* ===========================================================================
   LOCAL DEV — `npm run dev`.

   Cloudflare publishes the site straight from the repo root (minus what
   .assetsignore lists). Pointing `wrangler dev` at the root as well does not
   work: wrangler writes its own files into .wrangler/ as it runs, every one
   of those counts as a change to the site, and it reloads forever.

   So this serves a snapshot instead: a copy of the repo root in
   .wrangler/site, with .assetsignore travelling along so wrangler filters
   it exactly as a deploy would. What you see locally is what Cloudflare
   would publish. Edits to the game need a restart to show up.

   Extra arguments go to wrangler, e.g. `npm run dev -- --test-scheduled`.
   ========================================================================= */
import { cpSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, '.wrangler', 'site');
const SKIP = new Set(['.git', '.wrangler', 'node_modules']);

rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });
for (const name of readdirSync(ROOT))
  if (!SKIP.has(name)) cpSync(join(ROOT, name), join(SITE, name), { recursive: true });

/* The address the Worker sees in request.url: the one the browser is on.
   Left alone, wrangler puts the production route there (voidrunner.online),
   and a hand-off to PvP (src/account.js), which compares the two, would
   refuse every local code. */
const args = process.argv.slice(2);
const portArg = args.find((a, i) => a.startsWith('--port=') || args[i - 1] === '--port');
const port = portArg ? portArg.replace('--port=', '') : '8787';
const upstream = args.some(a => a.startsWith('--local-upstream')) ? [] : ['--local-upstream', 'localhost:' + port];

const child = spawn('npx', ['--yes', 'wrangler', 'dev', '--assets', SITE, ...upstream, ...args],
                    { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 0));
