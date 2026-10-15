#!/usr/bin/env node
/* ===========================================================================
   CONTINUE — the test: `npm run test:continue`

   A run kept on one page and taken back on another (index.html, "CONTINUE"),
   the way a player does it: played through the game's own frame(), so every
   hook a frame runs (the wardrobe of a prize skin among them) runs too, kept
   the way a closed tab keeps it (runSaveNow), and answered on a fresh page
   with the card's own keys.

     worn         the run is flown in each ALL HALLOWS prize skin, and in none:
                  the skin's wardrobe holds the pilot (HLW.P) every frame, and
                  once had the snapshot write the pilot as a pointer to it
     CONTINUE     the pilot comes back as it was kept, paused; the save is
                  spent (one continue more); resumed, it plays on, and no
                  frame throws (a thrown frame is the empty floor players saw)
     ABANDON      pressed twice, the run is filed and the save let go, and the
                  menu is drawn
     cannot       a snapshot that points at something this copy does not have
                  is turned down whole: the menu, a word about it, the save
                  gone, nothing half-restored, and the next page offers nothing

   The determinism suite (npm test) restores a snapshot in every scenario
   (run C); this is the rest of the trip: the card, the keys and the frames.
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');
const KEYS = ['voidrunner_run_v1', 'voidrunner_run_v1_snap'];

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);

/* A page of the game, with a player who has a name, has read the news, has
   seen the effects panel and has answered FIRST FLIGHT, wearing `skin` (an
   award held, so the wardrobe dresses the pilot in it). Its frames are run by
   hand: tick(n) is n frames of frame() at 60 a second, and while the bot
   flies, a level's cards are answered between frames, as a player would. */
function page(skin, store) {
  const G = loadGame(IDX, { w: 1280, h: 720 });
  if (store) for (const k of KEYS) if (store[k] != null) G.win.localStorage.setItem(k, store[k]);
  G.run(`Object.assign(Save.profile, { name: 'TEST', runs: 3, logSeen: LOG_VER, gfxSeen: GFX_VER,
           awards: ${skin ? `[{ skin: '${skin}' }]` : '[]'}, skinEquip: '${skin || ''}' });
         state = 'menu'; runSaveLoad();
         globalThis.__t = 1000; last = __t; pageDead = false; globalThis.__flying = false;
         globalThis.tick = n => { for (let i = 0; i < n; i++) {
           if (__flying && state === 'levelup') { uiArm = 0; handleKey('1'); }
           __t += 1000 / 60; frame(__t); } };`);
  G.tick = n => G.run(`tick(${n})`);
  // on until the run is in play (not on a card), so what is kept is this moment
  G.live = () => G.run(`for (let i = 0; i < 600 && state !== 'play'; i++) tick(1); state`);
  G.store = () => Object.fromEntries(KEYS.map(k => [k, G.win.localStorage.getItem(k)]));
  return G;
}
// a player who flies in circles and fires at the nearest thing, and cannot die
const BOT = `(() => { let k = 0; __flying = true; inputSource = rec => { k++;
  const d = Math.floor(k / 80) % 4; rec.mx = [0, 1, 0, -1][d]; rec.my = [-1, 0, 1, 0][d];
  let e = null, bd = 1e18; for (const o of enemies) { if (o.dead) continue; const q = (o.x - P.x) ** 2 + (o.y - P.y) ** 2; if (q < bd) { bd = q; e = o; } }
  rec.ax = e ? e.x : P.x + 200; rec.ay = e ? e.y : P.y; rec.trig = rec.lmb = true; rec.auto = false; rec.dash = k % 97 === 0;
  rec.touch = false; rec.taim = null; rec.held = ''; rec.press = [];
  P.hp = P.maxHp; }; })()`;
// a run of its own seed, so the test flies the same run every time
const START = `runSeedNext = 1015; startRun(); if (tutCardUp()) tutChoose(false); P.maxHp = P.hp = 60000;`;
// the run as the card and the test see it
const look = G => JSON.parse(G.run(`JSON.stringify({ state, wave, score, P: P && { x: P.x, y: P.y, hp: P.hp, level: P.level, kills: P.kills, charId: P.charId },
  card: runCardUp(), errs: frameErrors, note: QOL.runNote })`));
const meta = G => JSON.parse(G.win.localStorage.getItem(KEYS[0]) || 'null');

/* One run flown in `skin` for 25 seconds and kept as a closing tab keeps it;
   then a fresh page, the card, and `answer` (the keys pressed on it). */
function trip(skin, answer) {
  const A = page(skin);
  A.run(`${START} ${BOT};`);
  A.tick(25 * 60);
  A.live();
  const flown = look(A);
  A.run('runSaveNow()');                 // the tab closes: pagehide keeps the run where it is
  const B = page(skin, A.store());
  B.tick(30);                            // the menu, with the card on it, for half a second
  const card = look(B);
  // a key that throws, as a browser has it: the page carries on, and the test says so
  const threw = [];
  for (const k of answer) { try { B.run(`handleKey('${k}')`); } catch (e) { threw.push(String(e).split('\n')[0]); } B.tick(2); }
  B.tick(20);
  return { A, B, flown, card, threw, worn: A.run('HLW.P === P'), after: look(B) };
}

for (const skin of ['hl-carved', 'hl-lantern', 'hl-hallows', 'hl-lostsoul', '']) {
  const name = skin || 'no skin';
  section(`${name}: CONTINUE`);
  const t = trip(skin, ['enter']);
  ok(t.flown.state === 'play' && t.flown.errs === 0, `${name}: the run is flown without a thrown frame`, t.flown);
  if (skin) ok(t.worn, `${name}: the wardrobe holds the pilot while it is worn (HLW.P)`);
  ok(t.card.card && t.card.errs === 0, `${name}: the next page offers the run, and draws the card`, t.card);
  ok(!t.threw.length, `${name}: CONTINUE takes the run back without a throw`, t.threw);
  ok(t.after.state === 'pause', `${name}: CONTINUE comes back paused`, t.after);
  ok(t.after.P && t.after.P.x === t.flown.P.x && t.after.P.y === t.flown.P.y && t.after.P.hp === t.flown.P.hp &&
     t.after.P.level === t.flown.P.level && t.after.P.kills === t.flown.P.kills,
     `${name}: the pilot comes back as it was kept`, { kept: t.flown.P, back: t.after.P });
  ok(t.after.score === t.flown.score && t.after.wave === t.flown.wave, `${name}: and the run with it`, { kept: t.flown, back: t.after });
  ok((meta(t.B) || {}).n === 1, `${name}: the continue is spent at once (the save says one used)`, meta(t.B));
  ok(t.after.errs === 0, `${name}: no frame throws over the paused run`, t.after);
  t.B.run(`handleKey('escape'); ${BOT};`);
  t.B.tick(5 * 60);
  const on = look(t.B);
  ok((on.state === 'play' || on.state === 'levelup') && on.wave >= t.flown.wave && on.errs === 0,
     `${name}: resumed, it plays on without a thrown frame`, on);

  section(`${name}: ABANDON`);
  const a = trip(skin, ['escape', 'escape']);
  ok(!a.threw.length, `${name}: ABANDON takes the run back without a throw`, a.threw);
  ok(a.after.state === 'menu' && !a.after.card, `${name}: ABANDON twice ends it at the menu`, a.after);
  ok(a.after.note === 'THE RUN WAS ENDED AND FILED TO YOUR RECORD', `${name}: and says it was filed`, a.after.note);
  ok(!a.B.win.localStorage.getItem(KEYS[1]) && (meta(a.B) || {}).ended, `${name}: the save is let go`, meta(a.B));
  ok(a.after.errs === 0, `${name}: no frame throws`, a.after);
}

section('a snapshot that cannot be taken back');
{
  const A = page('');
  A.run(`${START} ${BOT};`);
  A.tick(10 * 60);
  A.live();
  A.run('runSaveNow()');
  // the pilot, written as a pointer to something no copy of the game has (as HLW.P once was, on a page with nothing worn)
  const store = A.store(), snap = JSON.parse(store[KEYS[1]]);
  snap.vars[snap.names[0].indexOf('P')] = { k: ['HLW', 'P'] };
  store[KEYS[1]] = JSON.stringify(snap);
  const B = page('', store);
  B.tick(30);
  ok(look(B).card, 'the card offers it');
  const errs = [];
  const was = B.win.console.error;
  B.win.console.error = (...a) => errs.push(a.map(String).join(' '));   // the game says so on the console; kept here, not printed
  B.run(`handleKey('enter')`);
  B.tick(30);
  B.win.console.error = was;
  const after = look(B);
  ok(after.state === 'menu', 'CONTINUE turns it down and stays at the menu', after);
  ok(after.note === 'THAT RUN COULD NOT BE RESTORED', 'and says so', after.note);
  ok(errs.some(e => /could not be restored/.test(e) && /HLW\.P/.test(e)), 'the console names what it pointed at', errs);
  ok(!B.win.localStorage.getItem(KEYS[1]) && !B.run('QOL.run'), 'the save is gone', meta(B));
  ok(after.P && after.errs === 0 && !after.card, 'nothing half-restored under the menu: a pilot, no thrown frame, no card', after);
  const C = page('', B.store());
  C.tick(30);
  ok(!look(C).card, 'and the next page offers nothing: no way back into it', look(C));
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
