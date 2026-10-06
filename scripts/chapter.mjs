#!/usr/bin/env node
/* ===========================================================================
   THE TALES' SEALED CHAPTERS, BY HAND — `npm run chapter -- <command>`
   (the route: src/tales.js)

     open <id> <vault-id>     the chapter opens for everyone, its pages read
                              out of that vault entry (put it first, given to
                              nobody: `npm run vault -- put <vault-id> <file>`)
     seal <id>                closed again; the opening is forgotten
     list                     every chapter, and when it opened

   The story's own event will open a chapter itself (openChapter); this is
   for before that exists, and for testing on wrangler dev. As with `npm run
   vault`, nothing runs without --remote (the live database) or --local
   (wrangler dev's; add --persist-to <dir> if yours lives elsewhere): without
   either, the SQL is printed.

   A chapter's file is JSON, { "pages": { "<entry>": { "t": "title",
   "x": "text" } } }, entries as the codex keys them ('n:founder'). It never
   belongs in this repo: the repo is public, and so would the chapter be.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { openSql, sealSql, chaptersSql } from './lib/tales-sql.mjs';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), PERSIST = opt('--persist-to');
const die = m => { console.error('chapter: ' + m); process.exit(1); };
const where = REMOTE ? ' (live)' : ' (local)';

/* One statement at a time, on the command line: these never hold a double
   quote or a percent sign (every id is checked against a plain pattern), and
   D1's import, which a --file goes through on the live database, answers with
   a count rather than the rows (scripts/vault.mjs says the same). */
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
    case 'open': {
      if (!a1 || !a2) die('open <id> <vault-id>');
      const sql = openSql(a1, a2);
      if (!live()) show(sql);
      run(sql);
      console.log('opened ' + a1 + where + ', its pages in vault entry ' + a2);
      break;
    }
    case 'seal': {
      const sql = sealSql(a1);
      if (!live()) show(sql);
      run(sql);
      console.log('sealed ' + a1 + where);
      break;
    }
    case 'list': {
      if (!live()) show(chaptersSql());
      const rows = run(chaptersSql());
      if (!rows.length) console.log('no chapters' + where);
      for (const r of rows) console.log(r.id.padEnd(12) + r.vault.padEnd(14) + r.opened);
      break;
    }
    default:
      die('open <id> <vault-id> | seal <id> | list   [--remote | --local]');
  }
} catch (e) { die(e.message); }
