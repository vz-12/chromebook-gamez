#!/usr/bin/env node
/* ===========================================================================
   A HIDDEN PILOT'S CHALLENGE, BY HAND — `npm run challenge -- <command>`
   (the rest of it: pvp/src/challenge.js)

     arm <pilot> <words>      armed: once a player has held VOID for a day
                              it goes to the highest of those who have
                              (checked hourly). <pilot> is the hidden
                              pilot's vault id, <words> the vault entry its
                              words are kept in (put it first, given to
                              nobody: `npm run vault -- put <words> <file>`).
                              Armed again, only the words change.
     date <pilot> <when>      the date it names, ISO with its zone
                              (2026-11-14T18:00Z), or none
     announce <pilot> <words> what the game's menu says while its match is
                              on air (src/live.js), from a vault entry of
                              its own, or none
     film <pilot> <module> [voice]
                              THE ENDING: the movie every game plays once if
                              it is lost (index.html, ENDING; src/film.js),
                              its module's vault entry and its voice's (an
                              mp3), or none. Nothing hands either out before
     parts <pilot> <words>    THE PARTS: what it leaves the account it was
                              sent to if they win it, from a vault entry of
                              its own ({ "t", "x", "done" }), or none
     unuse <pilot>            the parts' use taken back: the winner chooses
                              again
     decide <pilot> <how>    its fight, decided by hand: lost or won, as it
                              went for the account it was sent to (the
                              referee decides a match played to its end by
                              itself; one that was walked out of, never), or
                              none, to take a decision back. Decided, the
                              hunt on the game's runs is over (index.html,
                              FROM ABOVE)
     calm <pilot> [off]       the hunt held, at once and for as long as you
                              say, whatever else is so; off lets it go on
     cancel <pilot>           gone, sent or not; arm it again to start over
     list                     every challenge: armed, tripped by whom, sent
                              to whom, seen yet, its announcement, its match
                              on air and when, how it was decided, and
                              whether the hunt is held

   As with `npm run chapter`, nothing runs without --remote (the live
   database) or --local (wrangler dev's; add --persist-to <dir> if yours
   lives elsewhere): without either, the SQL is printed.

   The words' file is JSON, { "t": "title", "x": "text" }; an announcement's
   is { "t", "x", "as": the pilot's name as the menu shows it, "named": false
   to keep the other player's name off it }. Neither belongs in this repo:
   the repo is public, and so would the words be.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { armSql, dateSql, cancelSql, inVaultSql, challengesSql, announceSql, filmSql, partsSql, unuseSql, decideSql, calmSql, columnsSql, addedSql,
         checkPilot, checkWords, checkDate, checkOutcome } from './lib/challenge-sql.mjs';

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
// a table made before its newer columns gets them first (PvP's Worker does the same on first use)
function columns() {
  const add = addedSql(run(columnsSql()).map(r => r.name));
  if (add) run(add);
}
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
    case 'announce': {
      if (!a1 || !a2) die('announce <pilot> <words | none>');
      const words = a2 === 'none' ? null : a2;
      const sql = announceSql(a1, words);
      if (!live()) show(sql);
      if (words && !run(inVaultSql([words])).length) die('the vault' + where + ' holds no ' + words + ': put it first');
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (words ? 'announced from vault entry ' + words : 'no announcement'));
      break;
    }
    case 'film': {
      if (!a1 || !a2) die('film <pilot> <module | none> [voice]');
      const film = a2 === 'none' ? null : a2, voice = film ? (args[3] || null) : null;
      const sql = filmSql(a1, film, voice);
      if (!live()) show(sql);
      const want = [film, voice].filter(Boolean), held = want.length ? run(inVaultSql(want)).map(r => r.id) : [];
      for (const id of want) if (!held.includes(id)) die('the vault' + where + ' holds no ' + id + ': put it first');
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (film ? 'its ending, the movie in ' + film + (voice ? ', said from ' + voice : ', silent') : 'no ending'));
      break;
    }
    case 'parts': {
      if (!a1 || !a2) die('parts <pilot> <words | none>');
      const words = a2 === 'none' ? null : a2;
      const sql = partsSql(a1, words);
      if (!live()) show(sql);
      if (words && !run(inVaultSql([words])).length) die('the vault' + where + ' holds no ' + words + ': put it first');
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (words ? 'its parts, their words in ' + words : 'no parts'));
      break;
    }
    case 'unuse': {
      if (!a1) die('unuse <pilot>');
      const sql = unuseSql(a1);
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': its parts unused again');
      break;
    }
    case 'decide': {
      if (!a1 || !a2) die('decide <pilot> <lost | won | none>');
      const sql = decideSql(a1, checkOutcome(a2));
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'not decided: the hunt goes on' : 'decided, ' + a2 + ': the hunt is over'));
      break;
    }
    case 'calm': {
      if (!a1 || (a2 && a2 !== 'off')) die('calm <pilot> [off]');
      const sql = calmSql(a1, a2 !== 'off');
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'off' ? 'the hunt goes on' : 'the hunt is held'));
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
      columns();
      const rows = run(challengesSql());
      if (!rows.length) console.log('no challenges' + where);
      for (const r of rows)
        console.log([r.pilot, 'words ' + r.words, 'armed ' + r.armed, 'due ' + r.due, 'tripped ' + r.tripped,
                     'by ' + r.reached_by, 'season ' + r.season, 'sent to ' + r.target, 'seen ' + r.seen,
                     'announced ' + r.announce, 'match ' + r.match, 'on ' + r.started, 'off ' + r.ended,
                     'decided ' + r.decided + (r.outcome !== '-' ? ' (' + r.outcome + ')' : ''), 'held ' + r.calm,
                     'film ' + r.film + (r.film_voice !== '-' ? ' (' + r.film_voice + ')' : ''),
                     'parts ' + r.parts + (r.parts_used !== '-' ? ' (used ' + r.parts_used + ' on ' + r.parts_use + ' ' + r.parts_on + ')' : '')].join('  ·  '));
      break;
    }
    default:
      die('arm <pilot> <words> | date <pilot> <when | none> | announce <pilot> <words | none> | film <pilot> <module | none> [voice] | ' +
          'parts <pilot> <words | none> | unuse <pilot> | decide <pilot> <lost | won | none> | ' +
          'calm <pilot> [off] | cancel <pilot> | list   [--remote | --local]');
  }
} catch (e) { die(e.message); }
