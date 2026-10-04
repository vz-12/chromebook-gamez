/* ===========================================================================
   LOCAL PVP — `npm run dev:pvp`.

   The PvP Worker (pvp/wrangler.jsonc) under `wrangler dev` on port 8788, on
   the same local D1 database as `npm run dev`, so an account made in the
   local game signs in here too.

   Open the game at http://localhost:8787 and this at http://127.0.0.1:8788.
   Two host names keep two cookie jars, as the real two sites do; a cookie
   ignores the port, so two localhost ports would share one and hide whether
   the hand-off works. The game's PVP button already points here.

   Extra arguments go to wrangler.
   ========================================================================= */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// the play page first, from the game as it is now: restart this after editing index.html
execFileSync(process.execPath, [join(ROOT, 'scripts', 'pvp-build.mjs')], { stdio: 'inherit' });
// the address the Worker sees in request.url is the one the browser is on (scripts/dev.mjs)
const child = spawn('npx', ['--yes', 'wrangler', 'dev', '-c', 'pvp/wrangler.jsonc', '--port', '8788',
                            '--local-upstream', '127.0.0.1:8788',
                            '--persist-to', join(ROOT, '.wrangler', 'state'), ...process.argv.slice(2)],
                    { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
child.on('exit', code => process.exit(code ?? 0));
