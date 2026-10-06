#!/usr/bin/env node
/* ===========================================================================
   THE VAULT, BY HAND — `npm run vault -- <command>`  (the store: src/vault.js)

     put <id> <file>          the file becomes the entry's text (a new revision;
         [--name NAME]        the page asks for it by its hash, so a changed file
                              is fetched again and an unchanged one never is);
                              NAME is what its holders see it called, nobody else
     list                     every entry: its revision, parts, size and hash
     drop <id>                the entry, gone
     give <account> <id>      the account may load the entry ('vault:<id>' perk)
     take <account> <id>      and no longer may
     who <id>                 the accounts that may
     hash <file>              a file's sha-256, to hold against what list shows

   Like `npm run grant`, nothing runs without --remote (the live database) or
   --local (wrangler dev's; add --persist-to <dir> if yours lives elsewhere):
   without either, the SQL is printed. A put prints only its size, since the
   SQL is the whole file again in base64.

   The files themselves never belong in this repo: it is public. Keep them
   wherever they are kept, and put them from there.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { putSql, listSql, headSql, dropSql, giveSql, takeSql, whoSql, accountSql, checkId, sha256 } from './lib/vault-sql.mjs';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), PERSIST = opt('--persist-to'), NAME = opt('--name');
const die = m => { console.error('vault: ' + m); process.exit(1); };
const where = REMOTE ? ' (live)' : ' (local)';

/* The SQL goes to wrangler as a file (on Windows npx runs through the shell,
   which would split a --command at its spaces), and wrangler's JSON is read
   for the answer: on Windows it can crash on its way out after doing its
   work (scripts/grant.mjs says the same). A put is checked by reading the
   head back instead, since a long file can go through D1's import, which
   answers in its own words. */
function run(sql, { json = true, command = false } = {}) {
  const file = command ? null : join(tmpdir(), 'vr-vault-' + process.pid + '-' + Date.now() + '.sql');
  if (file) writeFileSync(file, sql);
  const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', ...(file ? ['--file', file] : ['--command', sql]), '--yes'];
  if (json) a.push('--json');
  if (PERSIST) a.push('--persist-to', PERSIST);
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true, maxBuffer: 64 << 20 })
    : spawnSync('npx', a, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (file) rmSync(file, { force: true });
  if (!json) return r;
  const at = (r.stdout || '').indexOf('[');
  let out = null;
  try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
  if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
    die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
  return out.flatMap(x => x.results || []);
}
/* What a read answers: its rows. The live database takes a --file through
   D1's import, which answers with a count of what it ran and never the rows,
   so there a read goes as --command (one line, as the shell is handed it:
   no double quote or percent sign in it, which the reads here never have;
   every name and id in them is checked against a plain pattern first). */
function read(sql) {
  if (!REMOTE) return run(sql);
  const line = sql.replace(/\s+/g, ' ').trim();
  if (/["%]/.test(line)) die('a read with a double quote or a percent sign cannot go on the command line');
  return run(line, { command: true });
}
const live = () => REMOTE || LOCAL;
function show(sql) {
  console.log(sql);
  console.log('\n(printed only: add --remote for the live database, --local for wrangler dev\'s)');
  process.exit(0);
}

const [cmd, a1, a2] = args;
try {
  switch (cmd) {
    case 'put': {
      checkId(a1);
      if (!a2) die('put <id> <file>');
      const bytes = readFileSync(a2);
      const p = putSql(a1, bytes, undefined, NAME);
      if (!live()) {
        console.log(`put ${a1}: ${bytes.length} bytes in ${p.parts} part${p.parts === 1 ? '' : 's'}, sha-256 ${p.hash}`);
        console.log('(nothing sent: add --remote for the live database, --local for wrangler dev\'s)');
        break;
      }
      run(p.sql, { json: false });
      const head = read(headSql(a1))[0];
      if (!head || head.hash !== p.hash) die(`the put did not land: the head reads ${head ? head.hash : 'nothing'}`);
      console.log(`put ${a1}${where}: ${bytes.length} bytes in ${p.parts} part${p.parts === 1 ? '' : 's'}, sha-256 ${p.hash.slice(0, 16)}…`);
      break;
    }
    case 'list': {
      if (!live()) show(listSql());
      const rows = read(listSql());
      if (!rows.length) console.log('the vault is empty' + where);
      for (const r of rows) console.log(r.id.padEnd(12) + String(r.size).padStart(9) + ' bytes  ' + String(r.parts).padStart(3) + ' parts  ' + r.hash.slice(0, 16) + '…  ' + r.put);
      break;
    }
    case 'drop': {
      if (!live()) show(dropSql(a1));
      run(dropSql(a1));
      console.log('dropped ' + a1 + where);
      break;
    }
    case 'give': case 'take': {
      if (!a1 || !/^[a-z0-9_-]{3,16}$/i.test(a1)) die(cmd + ' <account> <id>');
      checkId(a2);
      const sql = cmd === 'give' ? giveSql(a1, a2) : takeSql(a1, a2);
      if (!live()) show(sql);
      if (!read(accountSql(a1)).length) die(`no account named "${a1}"`);
      run(sql);
      const row = read(accountSql(a1))[0];
      console.log((cmd === 'give' ? 'gave ' : 'took ') + a2 + (cmd === 'give' ? ' to ' : ' from ') + a1 + where + ': perks ' + row.perks);
      break;
    }
    case 'who': {
      if (!live()) show(whoSql(a1));
      const rows = read(whoSql(a1));
      console.log(rows.length ? rows.map(r => r.name).join('\n') : 'nobody may load ' + a1 + where);
      break;
    }
    case 'hash': {
      // what a file's hash is, to compare with list's
      console.log(sha256(readFileSync(a1)));
      break;
    }
    default:
      die('put <id> <file> | list | drop <id> | give <account> <id> | take <account> <id> | who <id>   [--remote | --local]');
  }
} catch (e) { die(e.message); }
