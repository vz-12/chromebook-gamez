#!/usr/bin/env node
/* ===========================================================================
   A HIDDEN PILOT'S CHALLENGE, BY HAND — `npm run challenge -- <command>`
   (the rest of it: pvp/src/challenge.js)

     arm <pilot> <words>      armed: the first player placed in VOID sends it
                              to the top of ranked. <pilot> is the hidden
                              pilot's vault id, <words> the vault entry its
                              words are kept in (put it first, given to
                              nobody: `npm run vault -- put <words> <file>`).
                              Armed again, only the words change.
     date <pilot> <when>      the date it names, ISO with its zone
                              (2026-11-14T18:00Z), or none
     cancel <pilot>           gone, sent or not; arm it again to start over
     list                     every challenge: armed, tripped by whom, sent
                              to whom, seen yet

   As with `npm run chapter`, nothing runs without --remote (the live
   database) or --local (wrangler dev's; add --persist-to <dir> if yours
   lives elsewhere): without either, the SQL is printed.

   The words' file is JSON, { "t": "title", "x": "text" }. It never belongs
   in this repo: the repo is public, and so would the words be.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { armSql, dateSql, cancelSql, inVaultSql, challengesSql, checkPilot, checkWords, checkDate } from './lib/challenge-sql.mjs';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), PERSIST = opt('--persist-to');
const die = m => { console.error('challenge: ' + m); process.exit(1); };
const where = REMOTE ? ' (live)' : ' (local)';

/* One statement at a time, on the command line, as scripts/chapter.mjs
   does and for its reasons: no double quote or percent sign in any of them,
   and D1's import answers a --file with a count rather than the rows. */
function run(sql) {
  const rows = [];
  for (const one of sql.split(/;\s*\n/).map(x => x.replace(/;\s*$/, '').replace(/\s+/g, ' ').trim()).filter(Boolean)) {
    if (/["%]/.test(one)) die('a statement with a double quote or a percent sign cannot go on the command line');
    const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', '--command', one, '--yes', '--json'];
    if (PERSIST) a.push('--persist-to', PERSIST);
    const r = process.platform === 'win32'
      ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true })
      : spawnSync('npx', a, { encoding: 'utf8' });
    const at = (r.stdout || '').indexOf('[');
    let out = null;
    try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
    if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
      die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
    rows.push(...out.flatMap(x => x.results || []));
  }
  return rows;
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
    case 'arm': {
      if (!a1 || !a2) die('arm <pilot> <words>');
      checkPilot(a1); checkWords(a2);
      const sql = armSql(a1, a2);
      if (!live()) show(sql);
      // nothing armed for a pilot the vault does not hold, nor with words it does not
      const held = run(inVaultSql([a1, a2])).map(r => r.id);
      for (const id of [a1, a2]) if (!held.includes(id)) die('the vault' + where + ' holds no ' + id + ': put it first');
      run(sql);
      console.log('armed ' + a1 + where + ', its words in vault entry ' + a2);
      break;
    }
    case 'date': {
      if (!a1 || !a2) die('date <pilot> <when | none>');
      const sql = dateSql(a1, checkDate(a2));
      if (!live()) show(sql);
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'no date' : new Date(checkDate(a2)).toISOString()));
      break;
    }
    case 'cancel': {
      const sql = cancelSql(a1);
      if (!live()) show(sql);
      run(sql);
      console.log('cancelled ' + a1 + where);
      break;
    }
    case 'list': {
      if (!live()) show(challengesSql());
      const rows = run(challengesSql());
      if (!rows.length) console.log('no challenges' + where);
      for (const r of rows)
        console.log([r.pilot, 'words ' + r.words, 'armed ' + r.armed, 'due ' + r.due, 'tripped ' + r.tripped,
                     'by ' + r.reached_by, 'season ' + r.season, 'sent to ' + r.target, 'seen ' + r.seen].join('  ·  '));
      break;
    }
    default:
      die('arm <pilot> <words> | date <pilot> <when | none> | cancel <pilot> | list   [--remote | --local]');
  }
} catch (e) { die(e.message); }
