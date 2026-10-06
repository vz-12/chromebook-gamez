#!/usr/bin/env node
/* ===========================================================================
   FORGOTTEN TALES — the test: `npm run test:tales`

   The pages (index.html, FORGOTTEN TALES — the pages), the codex frame that
   shows them, and the server's sealed chapters (src/tales.js):

     the save      pages and counters survive the profile's own round trip
                   (a second copy of the game loads what the first saved)
     the merge     two stores, one record: bits unioned, counts the higher,
                   times the lower, junk dropped
     the account   a save with pages goes up through the real Worker and
                   comes down into another copy of the game, merged
     the pages     every opener, each through the game's own functions where
                   the game has one (a real kill, a real boss defeated, a real
                   rite passed), and the deeds that must not open one
     what counts   freeplay and challenges never; a daily does; in co-op only
                   your own pilot's deeds
     never the run tale() never rolls: the run's stream is where it was
     sealed        a chapter is nothing until the server opens it, and then
                   it is everyone's; its text is never in the game
     the frame     every section and every page of every entry drawn at four
                   screen sizes, and the keys, the mouse and a finger

   The determinism suite (npm test) is what proves the run itself unchanged.
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
import { makeD1 } from './lib/d1-sqlite.mjs';
import { putSql } from './lib/vault-sql.mjs';
import { openSql, sealSql } from './lib/tales-sql.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
// checks made inside the game come back as [[cond, what, extra], ...]
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }

const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'TALES'; state = 'menu';`;
// inside the game: a list of checks, and a run to make them in
const KIT = `
  var C = [];
  var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  var has = (k, i) => Tales.has(k, i);
  var run = () => { resetGame(); state = 'play'; wave = 1; tale('wave'); };   // wave 1: at 0 a body is born with negative health
  var spawnAt = (t, dx, dy, o) => spawnEnemy(t, P.x + (dx || 0), P.y + (dy || 0), o || {});
  var fell = (t, dx, dy, o) => { const e = spawnAt(t, dx === undefined ? 200 : dx, dy || 0, o); killEnemy(e, 0); return e; };
  var boss = (k, o) => spawnAt('boss', 400, 0, Object.assign({ boss: k }, o || {}));
  var down = e => { killEnemy(e, 0); };
`;

/* ================================ the pages ================================ */
section('the pages, by play');
const g = loadGame(IDX, { w: 1280, h: 720 });
g.run(SETUP);
take(g.run(`(() => { ${KIT}
  const L = talesAll();
  chk(L.length === 68, 'every entry: 25 enemies, 12 bosses and 3 people fought as bosses, 4 pilots and 3 awakenings, 10 sectors and 5 rooms, 6 people', L.length);
  chk(!L.some(e => /SERAPH/i.test(e.n)), 'no outside pilot is in it');
  chk(L.filter(e => e.pages.some(p => p.sealed)).map(e => e.key).sort().join() === 'a:melee,n:founder,p:ember', 'the sealed pages are hinted where the bible puts them');
  chk(Object.keys(TALE_TEXT).every(k => !TALE_TEXT[k][3]), 'no sealed text in the game');

  run();
  chk(has('p:runner', 0), 'flying it opens a pilot\\'s page I (the first wave)');
  chk(has('s:grid', 0), 'and the sector it starts in');
  for (let i = 0; i < 49; i++) fell('grunt');
  chk(!has('e:grunt', 1), 'forty-nine shards are not fifty');
  fell('grunt');
  chk(has('e:grunt', 0) && has('e:grunt', 1), 'meeting opens page I, fifty felled opens page II');
  chk(Tales.n['k:grunt'] === 50, 'and the count is kept', Tales.n['k:grunt']);

  fell('spitter', 200); chk(!has('e:spitter', 2), 'a spitter felled close is not across the room');
  fell('spitter', 700); chk(has('e:spitter', 2), 'a spitter felled from across the room');
  { const e = spawnAt('dasher', 200); down(e); chk(!has('e:dasher', 2), 'a lancer at rest is not mid-lunge');
    const f = spawnAt('dasher', 200); f.state = 2; down(f); chk(has('e:dasher', 2), 'a lancer felled mid-lunge'); }
  { const e = spawnAt('brute', 200); damageEnemy(e, e.maxHp * 0.5, false, P.x, P.y); damageEnemy(e, 1e9, false, P.x, P.y);
    chk(!has('e:brute', 2), 'a hulk worn down is not one shot');
    const f = spawnAt('brute', 200); damageEnemy(f, 1e9, false, P.x, P.y); chk(f.dead && has('e:brute', 2), 'a hulk felled with a single shot'); }
  { const e = spawnAt('sentinel', 150); e.ang = Math.PI; down(e); chk(!has('e:sentinel', 2), 'a sentinel felled through its face is not from behind');
    const f = spawnAt('sentinel', 150); f.ang = 0; down(f); chk(has('e:sentinel', 2), 'a sentinel felled from behind its shield'); }
  { const e = spawnAt('phaser', 200); tale('blink', e); elapsed += 1; down(e); chk(!has('e:phaser', 2), 'a phaser felled a second after it lands');
    const f = spawnAt('phaser', 200); tale('blink', f); down(f); chk(has('e:phaser', 2), 'a phaser felled the moment it blinks in'); }
  for (let i = 0; i < 99; i++) fell('swarmer');
  chk(!has('e:swarmer', 2), 'ninety-nine mites'); fell('swarmer'); chk(has('e:swarmer', 2), 'a hundred mites in one wave');
  { const e = spawnAt('splitter', 200); down(e);
    for (let n = 0; n < 4; n++) for (const o of enemies.slice()) if (!o.dead && o.type === 'splitter') down(o);
    chk(Tales.n['k:splitter'] === 7, 'a family is seven', Tales.n['k:splitter']);
    chk(has('e:splitter', 2), 'a whole family felled inside two seconds'); }
  { const h = spawnAt('healer', 300); down(h); chk(!has('e:healer', 2), 'a mender alone is not before anything near it');
    spawnAt('grunt', 320); spawnAt('grunt', 280, 30); const m = spawnAt('healer', 300); down(m);
    chk(has('e:healer', 2), 'a mender felled before what is near it'); }
  for (let i = 0; i < 20; i++) fell('egg'); chk(has('e:egg', 2), 'twenty clutches before they hatch');
  stage = STAGES[0]; for (let i = 0; i < 25; i++) fell('wraith');
  chk(!has('e:wraith', 2), 'wraiths outside THE VOID do not count');
  stage = STAGES[4]; for (let i = 0; i < 25; i++) fell('wraith'); chk(has('e:wraith', 2), 'twenty-five wraiths in THE VOID');
  { const e = spawnAt('revenant', 200); down(e); const ghost = enemies.find(o => !o.dead && o.type === 'revenant' && o.gen === 1);
    chk(!!ghost, 'a revenant stands back up (the game\\'s own)'); elapsed += 0.5; down(ghost); chk(has('e:revenant', 2), 'one and its ghost within a second'); }
  stage = ALT_STAGES.find(s => s.name === 'THE HALT'); for (let i = 0; i < 10; i++) fell('redactor');
  chk(has('e:redactor', 2), 'ten redactors in THE HALT');
  stage = STAGES[0];
  { const up = P.up; P.up = { rate: 5 }; fell('mimic'); chk(!has('e:mimic', 2), 'five cards are not twenty');
    P.up = { rate: 12, dmg: 8 }; fell('mimic'); chk(has('e:mimic', 2), 'a mimic felled with twenty cards'); P.up = up; }
  { const a = spawnAt('prism', 200); const rb = {}; tale('mirror', rb); tale('hurt', null, rb); down(a);
    chk(!has('e:prism', 2), 'a prism whose round came back to you');
    elapsed += 1; const b = spawnAt('prism', 200); down(b); chk(has('e:prism', 2), 'a prism felled without your own fire hitting you'); }
  for (let i = 0; i < 30; i++) fell('gourd'); chk(has('e:gourd', 2), 'thirty gourds before they ripen');
  for (let i = 0; i < 10; i++) tale('candle'); chk(has('e:jack', 2), 'ten candles put out');
  for (let i = 0; i < 10; i++) tale('vine'); chk(has('e:creeper', 2), 'ten vines cut');
  { const e = spawnAt('scarecrow', 200); e.hlWatched = true; down(e); chk(!has('e:scarecrow', 2), 'a scarecrow felled while watched');
    const f = spawnAt('scarecrow', 200); f.hlWatched = false; down(f); chk(has('e:scarecrow', 2), 'a scarecrow felled while it moves'); }
  // THE HOUSE (chapter II)
  { const s = spawnAt('sheet', 200, 0, { under: 'brute' }); down(s);
    const b = enemies.find(o => !o.dead && o.hlUnsheeted && o.type === 'brute');
    chk(!!b, 'a sheet torn lets out what was under it (the game\\'s own)');
    elapsed += 1.5; down(b); chk(!has('e:sheet', 2), 'what was under a sheet, a second and a half after');
    const s2 = spawnAt('sheet', 200, 0, { under: 'grunt' }); down(s2);
    const g2 = enemies.find(o => !o.dead && o.hlUnsheeted && o.type === 'grunt');
    elapsed += 0.5; down(g2); chk(has('e:sheet', 2), 'what was under a sheet, felled inside a second'); }
  { const l = spawnAt('lurker', 200); l.state = 0; down(l); chk(!has('e:lurker', 2), 'a lurker felled waiting');
    const m = spawnAt('lurker', 200); m.state = 2; down(m); chk(has('e:lurker', 2), 'a lurker felled mid-strike'); }
  { const p = spawnAt('poltergeist', 200); down(p); chk(!has('e:poltergeist', 2), 'a poltergeist felled with nothing up');
    const q = spawnAt('poltergeist', 200); q.hlHold = 1; down(q); chk(has('e:poltergeist', 2), 'a poltergeist felled before it lets go'); }
  { const b = spawnAt('bomber', 600, 0); for (let i = 0; i < 3; i++) { const o = spawnAt('grunt', 600 + i * 6, 6); o.hp = 1; }
    down(b); chk(has('e:bomber', 2), 'three others caught in one bomber\\'s blast'); }
  wave++; tale('hurt'); for (let i = 0; i < 5; i++) fell('artillery'); chk(!has('e:artillery', 2), 'five artillery in a wave you were hit in');
  wave++; for (let i = 0; i < 5; i++) fell('artillery'); chk(has('e:artillery', 2), 'five artillery in one wave, untouched');
  for (let i = 0; i < 25; i++) fell('turret'); chk(has('e:turret', 2), 'twenty-five emplacements in one run');
  for (let i = 0; i < 950; i++) fell('grunt'); chk(has('e:grunt', 2), 'a thousand shards');
  return JSON.stringify(C);
})()`));

section("the tales (step 5): the bible's rules");
take(g.run(`(() => { ${KIT}
  // ALL HALLOWS chapters II and III are not live yet, and the page source is public: these wait for them
  // (THE HOUSE's three bodies and DEAD GAME are chapter II's: their pages II and III too)
  const LATER = ['e:sheet 2', 'e:sheet 3', 'e:lurker 2', 'e:lurker 3', 'e:poltergeist 2', 'e:poltergeist 3',
                 'b:deadgame 2', 'b:deadgame 3', 'r:patch 3', 'n:soul 2', 'n:soul 3'];
  const miss = [], all = [];
  for (const en of talesAll()) {
    if (en.link) continue;
    en.pages.forEach((pg, i) => {
      if (pg.sealed || pg.held) return;
      const text = codexPageText({ tale: en.key, en }, i);
      if (!text) miss.push(en.key + ' ' + (i + 1)); else all.push([en.key, i, text]);
    });
  }
  chk(JSON.stringify(miss) === JSON.stringify(LATER), 'every page that can open has its words, but the ALL HALLOWS chapters not yet live', miss);
  chk(all.length >= 178, 'and that is every other page', all.length);
  chk(!all.some(([, , x]) => x.includes('!')), 'no exclamation marks', all.filter(([, , x]) => x.includes('!')).map(([k, i]) => k + ' ' + (i + 1)));
  const sealedWords = /\\b(raids?|heavens?|seraphs?|seraphim|wars?|atomi[sz]ed)\\b/i;
  chk(!all.some(([, , x]) => sealedWords.test(x)), 'nothing of the sealed chapter in a public page', all.filter(([, , x]) => sealedWords.test(x)).map(([k, i]) => k + ' ' + (i + 1)));
  // only the dev (every page II, and his own entry) and ROOT say it plainly
  const plain = /\\b(game|games|player|players|code)\\b/i;
  const said = all.filter(([k, i, x]) => i !== 1 && k !== 'n:dev' && k !== 'b:root' && plain.test(x)).map(([k, i]) => k + ' ' + (i + 1));
  chk(!said.length, 'nobody but the dev and ROOT says game, player or code', said);
  // and the two rules above can catch something
  chk(sealedWords.test('the second raid') && plain.test('a game'), 'those two rules are live');
  return JSON.stringify(C);
})()`));

section('the bosses');
take(g.run(`(() => { ${KIT}
  run();
  { const n = boss('nullcore'); tale('hurt'); down(n); chk(has('b:nullcore', 1) && !has('b:nullcore', 2), 'NULL defeated, but hit: page II only'); }
  { const w = boss('warden'); down(w); chk(has('b:warden', 1) && has('b:warden', 2), 'THE WARDEN defeated without a hit: pages II and III'); }
  chk(Tales.n['k:warden'] === 1, 'and it is counted as defeated');
  { const f = boss('forgeheart'); elapsed += 90; down(f); chk(!has('b:forgeheart', 2), 'FORGEHEART in a minute and a half');
    const h = boss('forgeheart'); elapsed += 30; down(h); chk(has('b:forgeheart', 2), 'FORGEHEART inside a minute');
    chk(Tales.n['t:forgeheart'] === 30, 'the best time is the faster', Tales.n['t:forgeheart']); }
  { const b = boss('broodmother'); for (let i = 0; i < 3; i++) tale('brood'); down(b); chk(!has('b:broodmother', 2), 'BROODMOTHER after three dives');
    const c = boss('broodmother'); tale('brood'); down(c); chk(has('b:broodmother', 2), 'BROODMOTHER before her third'); }
  { P.kills = 120; const a = boss('archivist'); down(a); chk(!has('b:archivist', 2), 'THE ARCHIVIST with 120 in its ledger');
    P.kills = 300; const b = boss('archivist'); down(b); chk(has('b:archivist', 2), 'THE ARCHIVIST with 300'); }
  { const c = boss('curator'); down(c); chk(!has('b:curator', 2), 'THE CURATOR, defeated by VOIDRUNNER');
    const id = P.charId; P.charId = 'melee'; const d = boss('curator'); down(d); P.charId = id;
    chk(has('b:curator', 2), 'THE CURATOR, defeated by THE VAGRANT'); }
  { const o = boss('theother'); down(o); chk(has('b:theother', 1) && !has('b:theother', 2), 'THE OTHER, cleared');
    const v = boss('theother'); v.virus = true; down(v); chk(has('b:theother', 2), 'the corrupted OTHER, cleared'); }
  { const s = boss('shopkeeper'); down(s); chk(has('n:shopkeeper', 1), 'THE SHOPKEEPER defeated: his page II, in PEOPLE'); }
  { stage = STAGES[0]; tale('stage', stage); tale('hurt'); const w = boss('warden'); down(w);
    chk(has('s:grid', 1) && !has('s:grid', 2), 'THE GRID cleared, but hit');
    tale('stage', stage); const x = boss('warden'); down(x); chk(has('s:grid', 2), 'THE GRID cleared without a hit'); }
  { stage = STAGES[4]; tale('stage', stage); const n = boss('nullcore'); down(n);
    chk(has('p:runner', 1), 'NULL defeated in THE VOID: VOIDRUNNER\\'s page II');
    chk(!has('p:runner', 2) && talesEntry('p:runner').pages[2].held, 'its page III is held: its rite is not built'); }
  { stage = STAGES[0]; const id = P.charId; P.charId = 'melee'; tale('stage', STAGES[1]); P.charId = id;
    chk(has('s:foundry', 0) && has('s:foundry', 2), 'THE FOUNDRY reached with THE VAGRANT'); }
  { tale('awake', 'hacker'); chk(has('a:hacker', 0), 'SUPERUSER woken: page I');
    for (const i of [0, 1, 2]) tale('act', 'hacker', i); chk(!has('a:hacker', 1), 'three of its actives');
    tale('act', 'hacker', 3); chk(has('a:hacker', 1), 'all four in one awakening');
    tale('awake', 'hacker'); tale('act', 'hacker', 0); tale('act', 'hacker', 1);
    const id = P.charId; P.charId = 'hacker'; P.suT = 20; const w = boss('warden'); down(w); P.charId = id; P.suT = 0;
    chk(has('a:hacker', 2), 'a boss defeated while awakened'); }
  { const u = boss('unwritten'); tale('rewind'); tale('unw'); chk(has('b:unwritten', 1) && !has('b:unwritten', 2), 'THE UNWRITTEN closed after a rewind');
    boss('unwritten'); tale('unw'); chk(has('b:unwritten', 2), 'THE UNWRITTEN closed on the first attempt'); }
  { const b = boss('backlog'); tale('binge'); down(b); chk(!has('b:backlog', 2), 'THE BACKLOG, a binge gone off');
    const c = boss('backlog'); down(c); chk(has('b:backlog', 2), 'THE BACKLOG, no binge'); }
  { const d = boss('deadgame'); tale('cull'); down(d); chk(has('b:deadgame', 1) && !has('b:deadgame', 2), 'DEAD GAME, with some sent away');
    const f = boss('deadgame'); down(f); chk(has('b:deadgame', 2), 'DEAD GAME, with nobody sent away'); }
  tale('library'); chk(has('n:keeper', 0) && has('r:library', 0), 'a library: the Bookkeeper met, and the room');
  tale('book'); chk(has('r:library', 1), 'a book taken');
  tale('buy'); chk(has('n:shopkeeper', 0), 'bought from him');
  tale('devtalk'); chk(has('n:dev', 0), 'the dev heard'); tale('outro'); chk(has('n:dev', 2), 'and his last line');
  { const P0 = P.book; P.book = BOOKS.shopkeeper; tale('dead'); P.book = P0; chk(has('n:shopkeeper', 2), 'his day book carried to the end of a run'); }
  { Tales.run.last = { k: 'spitter', t: elapsed }; tale('dead'); chk(Tales.n['d:spitter'] === 1, 'what felled you is filed against it'); }
  return JSON.stringify(C);
})()`));

section('the record');
take(g.run(`(() => { ${KIT}
  run();
  Tales.lines.length = 0;
  runSet('keeperDone', true);
  chk(has('n:keeper', 2), 'the Bookkeeper defeated (keeperDone): his page III');
  chk(Tales.lines.length === 1 && /THE BOOKKEEPER/.test(Tales.lines[0].n), 'and a line, since it opened in a run', Tales.lines);
  grantAwakening('melee');
  chk(has('p:melee', 2) && has('n:founder', 2) && has('a:melee', 0), 'THE VAGRANT\\'s rite: its page III, the Founder\\'s, and RONIN met');
  chk(!has('a:melee', 3) && talesPageState('a:melee', talesEntry('a:melee').pages[3], 3) === 'sealed', 'RONIN\\'s page IV stays sealed: no deed opens it');
  runSet('tribunalDone', true); chk(has('n:founder', 1) && has('r:stands', 1), 'the stands emptied');
  runSet('amalgamDone', true); chk(has('b:amalgam', 1) && has('n:dev', 1), 'THE AMALGAM finished');
  grantAwakening('ember'); chk(has('b:amalgam', 2) && has('p:ember', 2), 'EMBER\\'s rite');
  grantAwakening('hacker'); chk(has('b:root', 2) && has('p:hacker', 2), 'THE HACKER\\'s rite');
  chk(has('r:hub', 2), 'every hull whose rite is built, awake');
  // a full codex is still entries met, never pages
  chk(!('tales' in Codex.need()), 'a full codex asks nothing of the pages');
  return JSON.stringify(C);
})()`));

section('what counts');
take(g.run(`(() => { ${KIT}
  run();
  const n0 = Tales.n['k:spitter'] | 0;
  freeRun = true; fell('spitter'); freeRun = false;
  chk((Tales.n['k:spitter'] | 0) === n0, 'freeplay never counts');
  Chal.on = { id: 'test', m: {} }; fell('spitter');
  chk((Tales.n['k:spitter'] | 0) === n0, 'a challenge never counts');
  Chal.on = { daily: true, m: {} }; fell('spitter');
  chk((Tales.n['k:spitter'] | 0) === n0 + 1, 'a daily does');
  Chal.on = null;
  // co-op: a body the other pilot felled is theirs
  PILOTS.push({ v: [P] }, { v: [P] }); PILOT.on = 1;
  fell('spitter');
  chk((Tales.n['k:spitter'] | 0) === n0 + 1, 'in co-op, the other pilot\\'s kill is not yours');
  PILOT.on = 0; fell('spitter');
  chk((Tales.n['k:spitter'] | 0) === n0 + 2, 'and your own is');
  PILOTS.length = 0; PILOT.on = 0;
  // never the run: no roll, however much is told
  const s0 = JSON.stringify(simRngState), t0 = simTick, e0 = enemies.length;
  const body = { type: 'sentinel', x: P.x + 100, y: P.y, ang: 0, gen: 0 };
  for (let i = 0; i < 200; i++) { tale('kill', body); tale('hurt', body); tale('spawn', body); tale('blink', body); tale('boss', { boss: 'warden' }); tale('wave'); }
  chk(JSON.stringify(simRngState) === s0 && simTick === t0 && enemies.length === e0, 'tale() never rolls, ticks or spawns');
  let threw = false; try { tale('kill', null); tale('boss', null); tale('hurt', 7, 'x'); tale('nonsense'); } catch (e) { threw = true; }
  chk(!threw, 'and never throws into the run');
  return JSON.stringify(C);
})()`));

section('sealed');
take(g.run(`(() => { ${KIT}
  const pg = talesEntry('n:founder').pages[3];
  chk(pg.sealed === 'c1' && talesPageState('n:founder', pg, 3) === 'sealed', 'the Founder\\'s page IV: sealed');
  chk(!Tales.open('n:founder', 3, true), 'and nothing on this side opens it');
  Tales.sealedTake({ chapters: { c1: { at: 1, pages: { 'n:founder': { t: 'A TITLE', x: 'the text' }, 'e:grunt': { x: 'more' } } } } });
  chk(has('n:founder', 3) && Tales.sealed['n:founder'].x === 'the text', 'once the server opens the chapter, it is open');
  chk(talesEntry('e:grunt').pages.length === 4 && has('e:grunt', 3), 'a chapter can open a page IV the game had no hint of');
  Tales.sealedTake({ chapters: { c1: { pages: { 'n:founder': { x: 5 }, ['x'.repeat(60)]: { x: 'y' } } } } });
  chk(!has('n:founder', 3) && !Object.keys(Tales.sealed).length, 'a bad copy opens nothing');
  Tales.sealedTake({ chapters: {} });
  chk(talesEntry('e:grunt').pages.length === 3, 'and a sealed one is sealed again');
  return JSON.stringify(C);
})()`));

/* ======================== the save, the merge, the account ======================== */
section('the save and the merge');
const saved = JSON.parse(g.run(`(() => { Codex.flush(); Tales.flush(); return JSON.stringify(Save.profile); })()`));
ok(saved.tales && Object.keys(saved.tales.p).length > 40, 'the pages are in the profile', saved.tales && Object.keys(saved.tales.p).length);
const g2 = loadGame(IDX, { w: 1280, h: 720, before: win => win.localStorage.setItem('voidrunner_save_v1', JSON.stringify(saved)) });
take(g2.run(`(() => { var C = []; var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  const want = ${JSON.stringify(saved.tales)};
  chk(JSON.stringify(Tales.p) === JSON.stringify(want.p), 'a second copy loads every page', [Tales.p, want.p]);
  chk(JSON.stringify(Tales.n) === JSON.stringify(want.n), 'and every counter');
  chk(Tales.has('b:warden', 2) && Tales.has('e:grunt', 2), 'and they are open');
  const a = { p: { 'e:grunt': 1, 'b:warden': 3 }, r: { 'e:grunt': 1 }, n: { 'k:grunt': 40, 't:warden': 50 }, m: { 'e:grunt': '2026-10-05' } };
  const b = { p: { 'e:grunt': 2, 'e:mite': 1 }, r: {}, n: { 'k:grunt': 12, 't:warden': 41.5, 'k:mite': 3 }, m: { 'e:grunt': '2026-10-01' } };
  const m = talesMerge(a, b);
  chk(m.p['e:grunt'] === 3 && m.p['b:warden'] === 3 && m.p['e:mite'] === 1, 'pages: open on either, open', m.p);
  chk(m.r['e:grunt'] === 1, 'read on either, read');
  chk(m.n['k:grunt'] === 40 && m.n['k:mite'] === 3, 'a count: the higher', m.n);
  chk(m.n['t:warden'] === 41.5, 'a best time: the faster', m.n);
  chk(m.m['e:grunt'] === '2026-10-01', 'first met: the earlier day');
  const j = talesMerge({ p: { ['x'.repeat(41)]: 1, ok: 'no', a: Infinity }, n: { neg: -4, s: 'x' }, m: { a: 'yesterday' } }, null);
  chk(!Object.keys(j.p).length && !Object.keys(j.n).length && !Object.keys(j.m).length, 'junk is dropped', j);
  const s = Save.merge(Object.assign(Save.blank(), { tales: a }), Object.assign(Save.blank(), { tales: b }));
  chk(s.tales.p['e:mite'] === 1 && s.tales.n['k:grunt'] === 40, 'Save.merge carries them');
  chk(!!Save.blank().tales && !!Account.strip({ tales: a }).tales, 'a fresh profile has an empty book, and the account takes it whole');
  return JSON.stringify(C);
})()`));

section('the account');
{
  const worker = (await import('../src/index.js')).default;
  const DB = makeD1();
  const env = { DB, ASSETS: { fetch: () => new Response('asset') } };
  let cookie = '';
  const call = async (method, p, body) => {
    const headers = { 'cf-connecting-ip': '10.9.0.1', origin: 'https://voidrunner.online' };
    if (cookie) headers.cookie = 'vr_s=' + cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + p,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) cookie = m[1];
    let d = null; try { d = await res.json(); } catch (e) {}
    return { status: res.status, d };
  };
  const reg = await call('POST', '/api/account', { op: 'register', name: 'tale_reader', pass: 'correct horse tales', pid: 'a'.repeat(32) });
  ok(reg.status === 201, 'signed up', reg);
  const up = JSON.parse(g.run(`JSON.stringify(Account.strip(Save.profile))`));
  const put = await call('PUT', '/api/account/save', { rev: 0, save: up, unlocks: {} });
  ok(put.status === 200, 'the save with its pages goes up', put);
  const got = await call('GET', '/api/account/save');
  ok(got.status === 200 && JSON.stringify(got.d.save.tales) === JSON.stringify(up.tales), 'and comes back whole', got.status);
  // another machine, with a page of its own, takes the account's save in
  const g3 = loadGame(IDX, { w: 1280, h: 720 });
  g3.run(SETUP);
  take(g3.run(`(() => { var C = []; var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
    Tales.open('e:healer', 0, false); Tales.n['k:healer'] = 9; Tales.dirty = true; Tales.flush(true);
    const adopted = Account.adopt(${JSON.stringify(got.d.save)});
    chk(adopted, 'adopted at the menu');
    chk(Tales.has('b:warden', 2) && Tales.has('e:grunt', 2), 'the account\\'s pages arrive');
    chk(Tales.has('e:healer', 0) && Tales.n['k:healer'] === 9, 'and this machine\\'s own are kept');
    const mine = Account.strip(Save.profile);
    chk(mine.tales.p['e:healer'] && mine.tales.p['b:warden'], 'what goes back up is the union');
    return JSON.stringify(C);
  })()`));

  /* ============================ sealed chapters ============================ */
  section('sealed chapters (src/tales.js)');
  const r0 = await call('GET', '/api/tales');
  ok(r0.status === 200 && JSON.stringify(r0.d) === '{"chapters":{}}', 'nothing is open', r0);
  const pages = { pages: { 'n:founder': { t: 'IV', x: 'the sealed text' }, 'p:ember': { x: 'another' }, 'BAD KEY': { x: 'no' } } };
  DB.sql.exec(putSql('t1', Buffer.from(JSON.stringify(pages))).sql);
  const r1 = await call('GET', '/api/tales');
  ok(JSON.stringify(r1.d) === '{"chapters":{}}', 'its pages in the vault are not a chapter', r1.d);
  const v1 = await call('GET', '/api/vault?id=t1');
  ok(v1.status === 404, 'and the vault hands them to nobody', v1.status);
  DB.sql.exec(openSql('c1', 't1', 1700000000000));
  const r2 = await call('GET', '/api/tales');
  ok(r2.status === 200 && r2.d.chapters.c1 && r2.d.chapters.c1.at === 1700000000000, 'opened: the chapter is there', r2.d);
  ok(r2.d.chapters.c1.pages['n:founder'].x === 'the sealed text' && r2.d.chapters.c1.pages['p:ember'].x === 'another', 'with its pages, for everyone');
  ok(!r2.d.chapters.c1.pages['BAD KEY'], 'a page under a key the codex cannot have is left out');
  cookie = '';
  const r3 = await call('GET', '/api/tales');
  ok(JSON.stringify(r3.d) === JSON.stringify(r2.d), 'signed out, the same');
  DB.sql.exec(openSql('c1', 't1', 1800000000000));
  ok((await call('GET', '/api/tales')).d.chapters.c1.at === 1700000000000, 'opened twice: the first opening stands');
  DB.sql.exec(putSql('t2', Buffer.from('not json')).sql);
  DB.sql.exec(openSql('c2', 't2'));
  const r4 = await call('GET', '/api/tales');
  ok(r4.status === 200 && r4.d.chapters.c1 && !r4.d.chapters.c2, 'a chapter that cannot be read is left out, the rest still served', r4.d);
  DB.sql.exec(sealSql('c1'));
  ok(!(await call('GET', '/api/tales')).d.chapters.c1, 'sealed again');
  const { openChapter } = await import('../src/tales.js');
  await openChapter(DB, 'c1');
  ok((await call('GET', '/api/tales')).d.chapters.c1, "openChapter (what the story's event will call) opens it, from the vault entry it already names");
  const post = await call('POST', '/api/tales', {});
  ok(post.status === 404, 'nothing but GET', post.status);
  // and the game takes it in
  take(g3.run(`(() => { var C = []; var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
    Tales.sealedTake(${JSON.stringify(r2.d)});
    chk(Tales.has('n:founder', 3) && codexPageText({ tale: 'n:founder', en: talesEntry('n:founder') }, 3) === 'the sealed text', 'the game shows the server\\'s text on page IV');
    return JSON.stringify(C);
  })()`));
}

/* ================================ the frame ================================ */
section('the frame');
take(g.run(`(() => { ${KIT}
  state = 'menu';
  // every hook, watched: how often it is drawn, and whether it ever throws (TA swallows that)
  const calls = {}, thrown = {};
  for (const k of Object.keys(TALES_ART)) {
    const f = TALES_ART[k];
    TALES_ART[k] = function (...a) { calls[k] = (calls[k] | 0) + 1; try { return f.apply(this, a); } catch (e) { thrown[k] = thrown[k] || e.message; throw e; } };
  }
  Tales.openAll();
  // one of each item carried, so the item sections open and their books are drawn
  Codex.u.add(UPGRADES[0].id); Codex.m.add(MALWARE[0].id); Codex.b.add(Object.keys(BOOKS)[0]);
  Codex.z.add(SIGNS[0].id); Codex.g.add(GEAR_BASES[0].id);
  for (const [w, h] of [[1280, 720], [1366, 768], [800, 600], [640, 360]]) {
    W = w; H = h;
    const errs = [];
    openCodex('menu'); uiArm = 0;
    for (let t = 0; t < CODEX_TABS.length; t++) {
      codexTab = t; codexBook = -1;
      try { drawCodex(); } catch (e) { errs.push(CODEX_TABS[t].id + ': ' + e.message); }
      const list = codexList();
      for (let i = 0; i < list.length; i++) {
        if (!codexSeen(list[i])) continue;
        codexBook = i;
        for (let p = 0; p < codexBookPages(list[i]).length; p++) {
          codexPage = p;
          try { drawCodex(); } catch (e) { errs.push(list[i].key + ' p' + p + ': ' + e.message); }
        }
      }
    }
    chk(!errs.length, 'every section and every page draws at ' + w + 'x' + h, errs.slice(0, 4));
    // the rail and the book stay on the screen
    const rail = codexRailRects(), B = codexBookGeom();
    chk(rail.every(r => r.y >= 0 && r.y + r.h <= H && r.x + r.w <= W), 'the rail fits at ' + w + 'x' + h);
    chk(B.x >= 0 && B.y >= 0 && B.x + B.w <= W && B.y + B.h <= H, 'the book fits at ' + w + 'x' + h, B);
  }
  W = 1280; H = 720;
  // a torn page and a fresh copy too: openAll leaves none torn, and the record was handed back above
  { const keep = Save.profile.keeperDone; Save.profile.keeperDone = false;
    Tales.p['e:grunt'] = 1; codexTab = 0; codexBook = 0; codexPage = 2; drawCodex();
    codexBook = -1; drawCodex(); Save.profile.keeperDone = keep; }
  closeCodex(); chk(state === 'menu', 'Esc from the grid closes the codex');
  // keys
  openCodex('menu'); uiArm = 0;
  handleKey('tab'); chk(codexTab === 1, 'Tab: the next section');
  handleKey('q'); chk(codexTab === 0, 'Q: the one before');
  handleKey('arrowright'); chk(codexSel === 1, 'arrows browse');
  handleKey('enter'); chk(codexBook === 1, 'Enter opens a book');
  handleKey('arrowright'); chk(codexPage === 1, 'right turns the page');
  handleKey('arrowleft'); chk(codexPage === 0, 'left turns it back');
  handleKey('arrowdown'); chk(codexBook === 2, 'down: the next entry, the book still open');
  handleKey('escape'); chk(codexBook === -1 && state === 'codex', 'Esc shuts the book, and the codex stays');
  // the mouse
  { const r = codexCellRect(3); mouse.x = r.x + r.w / 2; mouse.y = r.y + r.h / 2; handleClick();
    chk(codexBook === 3, 'a click opens a card');
    const B = codexBookGeom(); mouse.x = B.next.x + 5; mouse.y = B.next.y + 5; handleClick(); chk(codexPage === 1, 'a click turns the page');
    const row = codexBookRow(), pr = codexPipRects(row); mouse.x = pr[2].x + 4; mouse.y = pr[2].y + 4; handleClick();
    chk(codexPage === 2, 'a click on a pip turns to that page');
    drawCodex(); chk(Tales.isRead(row.tale, 2), 'a page shown is a page read');
    mouse.x = 2; mouse.y = 2; handleClick(); chk(codexBook === -1, 'a click off the book shuts it'); }
  { const rail = codexRailRects(); mouse.x = rail[3].x + 8; mouse.y = rail[3].y + 8; handleClick(); chk(codexTab === 3, 'a click on the rail: that section'); }
  // a finger
  { codexTab = 0; codexScroll = 0; const r = codexCellRect(0), p = { x: r.x + 10, y: r.y + 10 };
    codexTouch('start', 1, p); codexTouch('end', 1, p); chk(codexBook === 0, 'a tap opens a card');
    codexPage = 0;
    codexTouch('start', 2, { x: 600, y: 300 }); codexTouch('move', 2, { x: 500, y: 305 }); codexTouch('end', 2, { x: 500, y: 305 });
    chk(codexPage === 1, 'a swipe turns the page');
    codexShut();
    const s0 = codexScroll; W = 640; H = 360;
    codexTouch('start', 3, { x: 400, y: 300 }); codexTouch('move', 3, { x: 400, y: 200 }); codexTouch('end', 3, { x: 400, y: 200 });
    chk(codexScroll > s0 && codexBook === -1, 'a drag scrolls the grid and opens nothing', codexScroll);
    W = 1280; H = 720; }
  // an entry not met cannot be opened
  { Tales.p = {}; Tales.r = {}; Codex.e.clear(); codexTab = 0; codexBook = -1; codexOpenBook(0); chk(codexBook === -1, 'a silhouette does not open'); }
  closeCodex();
  // the mid-run line
  { run(); Tales.lines.length = 0; Codex.e.delete('wraith'); spawnAt('wraith', 300);
    chk(Tales.lines.length === 1 && Tales.lines[0].i === 0, 'meeting something in a run: its line', Tales.lines);
    let threw = false; try { talesDrawLine(); uiTime += 5; talesDrawLine(); } catch (e) { threw = true; }
    chk(!threw && Tales.lines.length === 0, 'drawn, and gone after a few seconds'); }
  chk(!Object.keys(thrown).length, 'no art hook throws', thrown);
  const never = Object.keys(TALES_ART).filter(k => !calls[k]);
  chk(Object.keys(TALES_ART).length === 32 && !never.length, 'all 32 art hooks are drawn somewhere', never);
  return JSON.stringify(C);
})()`));

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
