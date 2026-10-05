#!/usr/bin/env node
/* ===========================================================================
   GIVING A LOOK BY HAND — `npm run grant -- <account> <kind>:<id> ["why"]`
   (PVP-PLAN.md, Phase 7 part 1; the catalog and the gates are src/looks.js)

     npm run grant -- notz decal:founder "PLAYED IN THE FIRST WEEK"
         gives the account that item, whatever its gate, with a why the
         profile shows beside it (written again if it was given before)
     npm run grant -- notz decal:founder --take
         takes it back: off the profile on its next view
     npm run grant -- notz --list
         what the account has been given by hand
     npm run grant -- --items
         every item in the catalog, and its gate

   Without --remote or --local it only prints the SQL it would run. With one
   of them it runs it through wrangler against the `voidrunner` D1 database:
   --local is wrangler dev's copy (add --persist-to <dir> if yours lives
   elsewhere), --remote is the live one. The SQL can also be pasted into the
   D1 console in Cloudflare's dashboard as it is.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LOOKS, KINDS, itemOf } from '../src/looks.js';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), TAKE = flag('--take'), LIST = flag('--list'), ITEMS = flag('--items');
const PERSIST = opt('--persist-to');
const die = m => { console.error('grant: ' + m); process.exit(1); };

if (ITEMS) {
  for (const k of KINDS) {
    console.log(k.toUpperCase());
    for (const it of LOOKS[k]) console.log('  ' + (k + ':' + it.id).padEnd(22) + it.n.padEnd(16) + it.gate);
  }
  process.exit(0);
}

const [name, item, why = ''] = args;
if (!name || !/^[a-z0-9_-]{3,16}$/i.test(name)) die('give an account name (3 to 16 of a-z 0-9 _ -)');
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const acct = `(SELECT id FROM accounts WHERE name = ${q(name.toLowerCase())})`;
const TABLE = `CREATE TABLE IF NOT EXISTS look_grants (account TEXT NOT NULL, item TEXT NOT NULL, why TEXT, at INTEGER NOT NULL, PRIMARY KEY (account, item));`;
let sql;
if (LIST) sql = `${TABLE} SELECT item, why, datetime(at / 1000, 'unixepoch') AS given FROM look_grants WHERE account = ${acct} ORDER BY at;`;
else {
  const m = /^([a-z]+):([\w-]+)$/.exec(item || '');
  if (!m || !itemOf(m[1], m[2])) die(`no such item "${item || ''}": run with --items for the catalog`);
  if (why.length > 80) die('keep the why to 80 characters');
  sql = TAKE
    ? `${TABLE} DELETE FROM look_grants WHERE account = ${acct} AND item = ${q(item)};`
    : `${TABLE} INSERT INTO look_grants (account, item, why, at) SELECT id, ${q(item)}, ${q(why)}, ${Date.now()} FROM accounts WHERE name = ${q(name.toLowerCase())} `
      + `ON CONFLICT (account, item) DO UPDATE SET why = excluded.why, at = excluded.at;`;
}
if (!REMOTE && !LOCAL) {
  console.log(sql);
  console.log('\n(printed only: add --remote for the live database, --local for wrangler dev\'s)');
  process.exit(0);
}
// a name with no account runs without error and changes nothing, so say whether it exists
const check = `SELECT COUNT(*) AS n FROM accounts WHERE name = ${q(name.toLowerCase())};`;
/* The SQL goes to wrangler as a file: on Windows npx has to run through the
   shell, which would split a --command at its spaces. Its JSON answer is the
   word on whether it worked: on Windows wrangler can crash on its way out (a
   libuv assertion) after it has done its work. */
const run = cmd => {
  const file = join(tmpdir(), 'vr-grant-' + process.pid + '-' + Date.now() + '.sql');
  writeFileSync(file, cmd);
  const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', '--file', file, '--json', '--yes'];
  if (PERSIST) a.push('--persist-to', PERSIST);
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true })
    : spawnSync('npx', a, { encoding: 'utf8' });
  rmSync(file, { force: true });
  const at = (r.stdout || '').indexOf('[');
  let out = null;
  try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
  if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
    die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
  return out;
};
const found = run(check);
const n = Array.isArray(found) && found[0] && found[0].results && found[0].results[0] ? found[0].results[0].n : null;
if (n === 0) die(`no account named "${name}"`);
const out = run(sql);
if (LIST) {
  const rows = (Array.isArray(out) ? out : []).flatMap(r => r.results || []);
  if (!rows.length) console.log(name + ' has been given nothing by hand');
  for (const r of rows) console.log((r.item || '').padEnd(22) + (r.given || '') + (r.why ? '  ' + r.why : ''));
} else console.log((TAKE ? 'took ' : 'gave ') + item + (TAKE ? ' from ' : ' to ') + name + (REMOTE ? ' (live)' : ' (local)'));
