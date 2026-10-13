#!/usr/bin/env node
/* ===========================================================================
   ACHIEVEMENTS — the test: `npm run test:ach`

   The line of goals (index.html, ACHIEVEMENTS), in the game's own VM:

     the line      every goal is reached in order: done one by one through
                   the profile, the next one is always the first not done
     the record    a goal is read off the profile, so an old save has what it
                   earned; the first look keeps it all without a word, and so
                   does a burst (a record arriving)
     the cards     a goal done in a run is announced once, one done on the
                   menu is marked NEW instead, and the panel clears NEW
     the save      kept goals survive the profile's own round trip
     the merge     the earlier day, seen on either is seen, junk dropped,
                   neither looked at is still neither
     the run       none of it rolls simRand: the run's stream is where it was
     the frame     the panel at four sizes, the door, the report's goal and
                   the card, by keys, mouse and finger; every art hook called,
                   and a hook that throws loses only its own piece

     node scripts/achievements.mjs [path/to/index.html]

   No packages and no network. Exits 1 on any failure. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.slice(2).find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');
const t0 = Date.now();

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }

const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'ACH'; state = 'menu';`;
const KIT = `
  var C = [];
  var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  var ids = () => achList().map(a => a.id);
  var nx = () => { const a = achNext(); return a ? a.id : null; };
  var frame = () => { uiTime += 0.6; render(); };
`;
/* What does each goal, on a profile, by the flags and counts the game itself
   writes when it is done in play. Every id in the line must be here. */
const DOERS = `{
  flight:      p => { p.runs = 1; },
  warden:      p => { Tales.n['k:warden'] = 1; },
  forgeheart:  p => { Tales.n['k:forgeheart'] = 1; },
  broodmother: p => { Tales.n['k:broodmother'] = 1; },
  archivist:   p => { Tales.n['k:archivist'] = 1; },
  nullcore:    p => { p.bestWave = 26; },
  unwritten:   p => { p.trueEnd = true; },
  amalgam:     p => { p.amalgamDone = true; },
  clears:      p => { p.clears = 2; p.altPath = true; },
  curator:     p => { Tales.n['k:curator'] = 1; },
  theother:    p => { p.otherKills = 1; },
  infection:   p => { p.deepFracture = true; },
  root:        p => { p.rootDone = true; },
  founder:     p => { p.metFounder = true; },
  tribunal:    p => { p.tribunalDone = true; },
  outsider:    p => { p.outsiderIn = true; },
  overdrive:   p => { p.awakened = Object.assign({}, p.awakened, { ember: true }); },
  hacker:      p => { p.codexM = MALWARE.map(m => m.id); },
  superuser:   p => { p.awakened = Object.assign({}, p.awakened, { hacker: true }); },
  vagrant:     p => { p.rushBest = RUSH_PEAK; },
  ronin:       p => { p.awakened = Object.assign({}, p.awakened, { melee: true }); },
  opodoor:     p => { p.opoMet = true; },
  opodone:     p => { p.opoDone = true; },
  origin:      p => { p.awakened = Object.assign({}, p.awakened, { runner: true }); }
}`;

/* ================================ the line ================================ */
section('the line, walked in order');
const g = loadGame(IDX, { w: 1280, h: 720 });
g.run(SETUP);
take(g.run(`(() => { ${KIT}
  const DO = ${DOERS};
  const p = Save.profile;
  chk(p.ach && typeof p.ach === 'object' && !Object.keys(p.ach).length, 'a new profile is looked at once on load, and has nothing', p.ach);
  const L = achList();
  chk(L.length >= 20, 'the line is all there', L.length);
  chk(new Set(L.map(a => a.id)).size === L.length, 'no two goals share an id');
  chk(ACHIEVEMENTS.every(a => DO[a.id]), 'every goal has a doer in this test', ACHIEVEMENTS.filter(a => !DO[a.id]).map(a => a.id));
  chk(ACHIEVEMENTS.every(a => ACH_ACTS.some(x => x.id === a.act)), 'every goal is in an act');
  chk(ACHIEVEMENTS.every(a => a.how && a.n), 'every goal has a name and says how');
  chk(ACH_ACTS.every(x => L.some(a => a.act === x.id)), 'no act is empty');
  // acts in order: the line never goes back to an earlier act
  const order = L.map(a => ACH_ACTS.findIndex(x => x.id === a.act));
  chk(order.every((v, i) => !i || v >= order[i - 1]), 'the line runs act by act', order);
  chk(!ids().includes('origin') === !riteBuilt('runner'), 'VOIDRUNNER\\'s rite is in the line only once it is built');
  chk(achList().every(a => !achIs(a)), 'nothing is done on a new profile');

  state = 'play';
  const seen = [];
  for (const a of L) {
    chk(nx() === a.id, 'next is ' + a.id, nx());
    DO[a.id](p);
    chk(achIs(a), a.id + ' is done once its deed is', a.id);
    Ach.cards.length = 0;
    const n = achScan(true);
    chk(n === 1, a.id + ': its deed does that one goal and no other', { n, kept: Object.keys(p.ach) });
    chk(Ach.cards.length === 1 && Ach.cards[0].a === a, a.id + ': announced in a run', Ach.cards.map(c => c.a.id));
    chk(/^\\d{4}-\\d\\d-\\d\\d$/.test(p.ach[a.id]), a.id + ': kept with its day', p.ach[a.id]);
    chk(achScan(true) === 0 && Ach.cards.length === 1, a.id + ': announced once');
    seen.push(a.id);
  }
  chk(nx() === null, 'the whole line done, there is no next');
  chk(achFresh(L[0]), 'a goal announced in a run is NEW until the panel shows it');
  return JSON.stringify(C); })()`));

section('out of order, and the record');
const g2 = loadGame(IDX, { w: 1280, h: 720 });
g2.run(SETUP);
take(g2.run(`(() => { ${KIT}
  const p = Save.profile;
  state = 'play';
  p.runs = 3; p.trueEnd = true;
  Ach.cards.length = 0;
  achScan(true);
  chk(achIs(achList().find(a => a.id === 'unwritten')), 'a goal further on is done when it is done');
  chk(nx() === 'warden', 'and the next is still the first not done', nx());
  // a goal done on the menu: NEW, no card
  state = 'menu';
  Ach.cards.length = 0;
  Tales.n['k:warden'] = 1;
  achScan(ACH_LIVE.includes(state));
  chk(!Ach.cards.length, 'done on the menu: no card');
  chk(achFresh(achList().find(a => a.id === 'warden')), 'but NEW');
  openAch('menu');
  chk(state === 'ach', 'A on the menu: the panel');
  chk(achList()[Ach.sel] === achNext(), 'the panel opens on the next goal', Ach.sel);
  uiArm = 0; achKey('escape');
  chk(state === 'menu', 'ESC shuts it');
  chk(!achList().some(achFresh), 'and what it showed is not NEW any more', p.achSeen);

  // a burst is a record arriving: kept, no card, not NEW
  state = 'play';
  Ach.cards.length = 0;
  Object.assign(p, { altPath: true, clears: 2, otherKills: 1, deepFracture: true, rootDone: true, metFounder: true });
  const n = achScan(true);
  chk(n === 5 && !Ach.cards.length, 'more than ACH_BURST at once: kept without a card', { n, cards: Ach.cards.length });
  chk(!achList().some(achFresh), 'and not NEW');
  // the burst does not swallow the next single deed
  p.tribunalDone = true;
  achScan(true);
  chk(Ach.cards.length === 1 && Ach.cards[0].a.id === 'tribunal', 'one at a time is announced again');
  // a sandbox keeps nothing, so earns nothing; PvP has none of it
  return JSON.stringify(C); })()`));

section('an old save, looked at for the first time');
const OLD = { name: 'VET', runs: 40, bestWave: 31, trueEnd: true, amalgamDone: true, clears: 3, altPath: true,
              otherKills: 2, gfxSeen: 3 };
const g3 = loadGame(IDX, { w: 1280, h: 720, before: win => win.localStorage.setItem('voidrunner_save_v1', JSON.stringify(OLD)) });
take(g3.run(`(() => { ${KIT}
  const p = Save.profile;
  const kept = Object.keys(p.ach || {});
  chk(['flight', 'warden', 'forgeheart', 'broodmother', 'archivist', 'nullcore', 'unwritten', 'amalgam', 'clears', 'theother'].every(k => kept.includes(k)),
      'everything the old record did is kept on its first look', kept);
  chk(!Ach.cards.length, 'without a card');
  chk(!achList().some(achFresh), 'and without a NEW');
  chk(nx() === 'curator', 'and the next goal is where the record stands', nx());
  // the round trip: what was kept is read back by another copy
  const raw = localStorage.getItem(SAVE_KEY);
  chk(raw && JSON.parse(raw).ach && JSON.parse(raw).ach.theother, 'kept goals are written to the save');
  return JSON.stringify(C); })()`));
const saved = g3.run(`localStorage.getItem(SAVE_KEY)`);
const g4 = loadGame(IDX, { w: 1280, h: 720, before: win => win.localStorage.setItem('voidrunner_save_v1', saved) });
take(g4.run(`(() => { ${KIT}
  const a = JSON.parse(${JSON.stringify(saved)}).ach, b = Save.profile.ach;
  chk(Object.keys(a).every(k => b[k] === a[k]), 'and read back by another copy, on the same days');
  return JSON.stringify(C); })()`));

section('the merge');
take(g.run(`(() => { ${KIT}
  const A = Object.assign(Save.blank(), { ach: { flight: '2026-10-01', warden: '2026-10-05' }, achSeen: ['flight'] });
  const B = Object.assign(Save.blank(), { ach: { warden: '2026-10-03', root: '2026-10-09', '': 'x', huge: 5, bad: 'yesterday' }, achSeen: ['root', 7] });
  const m = Save.merge(A, B);
  chk(m.ach.flight === '2026-10-01' && m.ach.root === '2026-10-09', 'kept on either is kept', m.ach);
  chk(m.ach.warden === '2026-10-03', 'on the earlier day', m.ach.warden);
  chk(!('huge' in m.ach) && !('bad' in m.ach) && !('' in m.ach), 'junk is dropped', m.ach);
  chk(m.achSeen.length === 2 && m.achSeen.includes('flight') && m.achSeen.includes('root'), 'seen on either is seen', m.achSeen);
  const n = Save.merge(Save.blank(), Save.blank());
  chk(n.ach === null && Array.isArray(n.achSeen), 'neither looked at is still neither', n.ach);
  const o = Save.merge(Save.blank(), A);
  chk(o.ach.flight === '2026-10-01', 'one side looked at, the other not: what was kept stays', o.ach);
  return JSON.stringify(C); })()`));

/* ================================ the run ================================ */
section('never the run');
take(g2.run(`(() => { ${KIT}
  state = 'play';
  const was = simRngState;
  Save.profile.opoMet = true;
  for (let i = 0; i < 6; i++) { uiTime += 0.6; achTick(); achDrawCard(); }
  state = 'dead'; lastStats = { score: 1, wave: 3, kills: 1, level: 1, time: 10 };
  for (let i = 0; i < 3; i++) frame();
  openAch('menu');
  for (let i = 0; i < 3; i++) frame();
  chk(simRngState === was, 'scanning, the cards, the report and the panel never roll simRand');
  return JSON.stringify(C); })()`));

/* =============================== the frame =============================== */
section('the frame, at four sizes');
const ALL = `Object.keys(ACH_ART)`;
for (const [w, h] of [[1280, 720], [900, 520], [600, 700], [360, 640]]) {
  const f = loadGame(IDX, { w, h, search: '?hooks=1' });
  f.run(SETUP);
  take(f.run(`(() => { ${KIT}
    const p = Save.profile;
    p.runs = 2; Tales.n['k:warden'] = 1; p.clears = 1;
    achScan(false);
    // the menu and its door
    state = 'menu'; frame();
    // the panel: keys, the wheel's scroll, a click on a row, a finger that drags
    openAch('menu'); uiArm = 0; frame();
    for (const k of ['arrowdown', 'arrowdown', 'end', 'arrowup', 'home', 'n']) { achKey(k); frame(); }
    chk(achList()[Ach.sel] === achNext(), 'N: back to the next one (' + ${w} + 'x' + ${h} + ')');
    Ach.scroll = achMaxScroll(); frame();
    const g = achGeom();
    mouse.x = g.listX + 30; mouse.y = g.listY + 60; achClick(); frame();
    chk(state === 'ach', 'a click on a row keeps the panel open');
    mouse.x = g.done.x + 5; mouse.y = g.done.y + 5; achClick();
    chk(state === 'menu', 'DONE shuts it');
    // a counted goal is next, for the meter: THE HACKER, once the line has come that far
    const L = achList();
    for (const a of L) { if (a.id === 'hacker') break; a.done = (x => () => true)(a.done); }
    p.codexM = [MALWARE[0].id];
    openAch('menu'); uiArm = 0; frame();
    chk(achNext() && achNext().id === 'hacker' && achProg(achNext())[0] === 1, 'a counted goal says how far', achNext() && achNext().id);
    uiArm = 0; achKey('escape');
    // the report, with its goal
    state = 'dead'; lastStats = { score: 10, wave: 2, kills: 3, level: 2, time: 40 }; frame();
    chk(achGoalLine(lastStats) === achNext(), 'the report says the next goal');
    chk(!achGoalLine({ chal: { id: 'x' } }), 'and not under a challenge');
    // a card, in a run
    state = 'play'; achAnnounce(L[0]); frame(); uiTime += 1; render();
    return JSON.stringify(C); })()`));
  const called = JSON.parse(f.run(`JSON.stringify([...AA_CALLED])`));
  const all = JSON.parse(f.run(`JSON.stringify(${ALL})`));
  ok(all.every(k => called.includes(k)), 'every art hook is called (' + w + 'x' + h + ')', all.filter(k => !called.includes(k)));
  ok(f.run(`AA_FAILED.size`) === 0, 'and none throws', f.run(`JSON.stringify([...AA_FAILED])`));
}

section('a hook that throws loses only its own piece');
const fz = loadGame(IDX, { w: 1280, h: 720 });
fz.run(SETUP);
take(fz.run(`(() => { ${KIT}
  const warn = console.warn; let warned = 0; console.warn = () => { warned++; };
  for (const k of Object.keys(ACH_ART)) ACH_ART[k] = () => { throw new Error('bad ' + k); };
  let threw = null;
  try {
    Save.profile.runs = 1; state = 'menu'; frame();
    openAch('menu'); frame(); frame(); uiArm = 0; achKey('escape');
    state = 'play'; achAnnounce(achList()[0]); frame();
    state = 'dead'; lastStats = { score: 1, wave: 1, kills: 0, level: 1, time: 1 }; frame();
  } catch (e) { threw = String(e && e.stack || e); }
  console.warn = warn;
  chk(!threw, 'nothing escapes into the game', threw);
  chk(AA_FAILED.size === AA_CALLED.size && AA_FAILED.size >= 8, 'each one called is named', [...AA_FAILED]);
  chk(warned === AA_FAILED.size, 'once each, however often it is called', warned);
  return JSON.stringify(C); })()`));

// PvP's page has none of it: checked where PvP boots (scripts/pvp-engine.mjs, practice)

console.log((fails ? fails + ' FAILED, ' : '') + passes + ' passed  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
process.exit(fails ? 1 : 0);
