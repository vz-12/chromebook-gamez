#!/usr/bin/env node
/* ===========================================================================
   THE TYRANTS FELLED, BY HAND — `npm run felled -- <command>`  (src/felled.js)

     list                 every tyrant felled: which, by whom, how often,
     (or nothing)         when, and NEW beside the ones nobody has read
     seen                 all of them marked read, as an admin's menu does
     forget <id> [boss]   an entry's fellings wiped (every boss of it, or one):
                          for a tyrant made anew, so its next fall is news

   Like `npm run vault`, nothing runs without --remote (the live database) or
   --local (wrangler dev's; add --persist-to <dir> if yours lives elsewhere):
   without either, the SQL is printed.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { listSql, seenSql, forgetSql } from './lib/felled-sql.mjs';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), PERSIST = opt('--persist-to');
const die = m => { console.error('felled: ' + m); process.exit(1); };
const where = REMOTE ? ' (live)' : ' (local)';

/* Every statement here is short, so it goes to wrangler as one --command
   line (no double quote or percent sign in it: the ids and keys are checked
   against plain patterns first), and wrangler's JSON is read for the rows. */
function run(sql) {
  const line = sql.replace(/\s+/g, ' ').trim();
  if (/["%]/.test(line)) die('a statement with a double quote or a percent sign cannot go on the command line');
  const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', '--command', line, '--yes', '--json'];
  if (PERSIST) a.push('--persist-to', PERSIST);
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true, maxBuffer: 16 << 20 })
    : spawnSync('npx', a, { encoding: 'utf8', maxBuffer: 16 << 20 });
  const at = (r.stdout || '').indexOf('[');
  let out = null;
  try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
  if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
    die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
  return out.flatMap(x => x.results || []);
}
const live = () => REMOTE || LOCAL;
function show(sql) {
  console.log(sql);
  console.log('\n(printed only: add --remote for the live database, --local for wrangler dev\'s)');
  process.exit(0);
}
// a row of the list, as people read it
function line(r) {
  let info = {};
  try { info = JSON.parse(r.info || '{}') || {}; } catch (e) {}
  const where = [info.room, info.pilot, info.coop ? 'co-op' : ''].filter(Boolean).join(', ');
  return (r.seen ? '     ' : ' NEW ') + String(r.name).padEnd(24) + ' ' + (r.mod + '/' + r.boss).padEnd(16) + ' by ' + String(r.who).padEnd(16)
    + ' ' + String(r.times).padStart(3) + 'x  first ' + r.firstAt + '  last ' + r.lastAt + ' UTC' + (r.firstEver ? '  THE FIRST' : '')
    + (where ? '  (' + where + ')' : '');
}

const [cmd = 'list', a1, a2] = args;
try {
  switch (cmd) {
    case 'list': {
      if (!live()) show(listSql());
      const rows = run(listSql());
      if (!rows.length) { console.log('no tyrant has fallen' + where); break; }
      const unread = rows.filter(r => !r.seen).length;
      console.log(rows.length + ' felling' + (rows.length === 1 ? '' : 's') + where + ', ' + unread + ' unread:');
      for (const r of rows) console.log(line(r));
      break;
    }
    case 'seen': {
      const upTo = Date.now();
      if (!live()) show(seenSql(upTo));
      run(seenSql(upTo));
      console.log('every felling up to now is read' + where);
      break;
    }
    case 'forget': {
      const sql = forgetSql(a1, a2);
      if (!live()) show(sql);
      run(sql);
      console.log('forgot ' + (a2 ? a1 + '/' + a2 : 'every boss of ' + a1) + where);
      break;
    }
    default:
      die('list | seen | forget <id> [boss]   [--remote | --local]');
  }
} catch (e) { die(e.message); }
