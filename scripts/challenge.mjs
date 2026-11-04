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
     premiere <pilot> <when>  its fight held for a showing at that time (ISO with
                              its zone), or none: fought before then, it goes
                              on air nowhere and is told to nobody; at the
                              premiere it is shown from its recording as
                              though live, and what it decided is told once
                              the showing has reached its end
     reel <pilot> <entry> <secs>  shown at the premiere in place of its match's
                              recording: a vault entry holding a broadcast's
                              whole log (as replay=1 writes it), and its
                              length in seconds; or none
     date <pilot> <when>      the date it names, ISO with its zone
                              (2026-11-14T18:00Z), or none
     announce <pilot> <words> what the game's menu says while its match is
                              on air (src/live.js), from a vault entry of
                              its own, or none
     film <pilot> <module> [voice] [--won]
                              THE ENDING: the movie every game plays once if
                              it is lost (index.html, ENDING; src/film.js),
                              its module's vault entry and its voice's (an
                              mp3), or none; with --won, the movie if it is
                              won instead. Nothing hands either out before
     parts <pilot> <words>    THE PARTS: what it leaves the account it was
                              sent to if they win it, from a vault entry of
                              its own ({ "t", "x", "done" }), or none
     unuse <pilot>            the parts' use taken back: the winner chooses
                              again
     door <pilot> <address>   THE DOOR: where every game sends its players
                              once it is lost (index.html, THE DOOR), an
                              origin (https://name.example), or none. Its
                              players go through it until the world is
                              mended. Keep the address out of this repo
     mend <pilot> [none]      the world mended by hand (the site behind the
                              door does it when the account the challenge
                              was sent to wins there): the door closes and
                              every game plays again; none opens it again
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
import { armSql, dateSql, premiereSql, reelSql, cancelSql, inVaultSql, challengesSql, announceSql, filmSql, partsSql, unuseSql, decideSql, calmSql, columnsSql, addedSql,
         doorSql, mendSql, checkPilot, checkWords, checkDate, checkOutcome, checkDoor } from './lib/challenge-sql.mjs';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), WON = flag('--won'), PERSIST = opt('--persist-to');
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
    case 'reel': {
      if (!a1 || !a2) die('reel <pilot> <vault entry> <seconds> | reel <pilot> none');
      const sql = reelSql(a1, a2 === 'none' ? null : a2, Number(args[3]));
      if (!live()) show(sql);
      if (a2 !== 'none' && !run(inVaultSql([a2])).length) die('the vault' + where + ' holds no ' + a2 + ': put it first');
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'no reel: its own recording is shown' : 'shown from ' + a2 + ' (' + args[3] + ' s) at its premiere'));
      break;
    }
    case 'premiere': {
      if (!a1 || !a2) die('premiere <pilot> <when | none>');
      const sql = premiereSql(a1, checkDate(a2));
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'no premiere: its fight goes on air as it is played' : 'held for its showing at ' + new Date(checkDate(a2)).toISOString()));
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
      if (!a1 || !a2) die('film <pilot> <module | none> [voice] [--won]');
      const film = a2 === 'none' ? null : a2, voice = film ? (args[3] || null) : null;
      const sql = filmSql(a1, film, voice, WON);
      if (!live()) show(sql);
      const want = [film, voice].filter(Boolean), held = want.length ? run(inVaultSql(want)).map(r => r.id) : [];
      for (const id of want) if (!held.includes(id)) die('the vault' + where + ' holds no ' + id + ': put it first');
      columns();
      run(sql);
      const way = WON ? ' if it is won' : ' if it is lost';
      console.log(a1 + where + ': ' + (film ? 'its ending' + way + ', the movie in ' + film + (voice ? ', said from ' + voice : ', silent') : 'no ending' + way));
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
    case 'door': {
      if (!a1 || !a2) die('door <pilot> <address | none>');
      const sql = doorSql(a1, checkDoor(a2));
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'no door' : 'if it is lost, every game sends its players to ' + a2));
      break;
    }
    case 'mend': {
      if (!a1 || (a2 && a2 !== 'none')) die('mend <pilot> [none]');
      const sql = mendSql(a1, a2 !== 'none');
      if (!live()) show(sql);
      columns();
      run(sql);
      console.log(a1 + where + ': ' + (a2 === 'none' ? 'not mended: the door is open again' : 'mended: the door closes, every game plays again'));
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
                     'won film ' + r.won_film + (r.won_voice !== '-' ? ' (' + r.won_voice + ')' : ''),
                     'parts ' + r.parts + (r.parts_used !== '-' ? ' (used ' + r.parts_used + ' on ' + r.parts_use + ' ' + r.parts_on + ')' : ''),
                     'door ' + r.door, 'mended ' + r.mended].join('  ·  '));
      break;
    }
    default:
      die('arm <pilot> <words> | premiere <pilot> <when | none> | date <pilot> <when | none> | announce <pilot> <words | none> | film <pilot> <module | none> [voice] [--won] | ' +
          'parts <pilot> <words | none> | unuse <pilot> | door <pilot> <address | none> | mend <pilot> [none] | decide <pilot> <lost | won | none> | ' +
          'calm <pilot> [off] | cancel <pilot> | list   [--remote | --local]');
  }
} catch (e) { die(e.message); }
