#!/usr/bin/env node
/* ===========================================================================
   FROM ABOVE — the test: `npm run test:above` (index.html, FROM ABOVE)

   The game, booted in Node with the Worker's GET /api/live answered by the
   test, hunted:

     the word     the game takes `above` from /api/live; a run takes it when
                  it starts and keeps it, whatever the Worker says later,
                  and hands it to a co-op partner with the run's settings
     who          nobody before the third sector; then one every two to four
                  minutes of the fight. Never a sandbox, a rule sheet of
                  another kind, a scene of its own, PvP's page, or a pilot
                  from outside
     the mark     aimed where the hull will be, inside the room; the warning
                  shorter the further the run has gone, never under its
                  least; on the room's clock, and held by a cut-in
     landing      a hull inside it is taken whatever it carries; one that
                  left is not; nor one up off the floor, nor a ghost
     co-op        the pilot taken goes down and the other flies on; the last
                  one taken ends the run
     the run      its own seeded stream is never moved; the same seed, the
                  same spears; a mark in flight travels in a snapshot
     the drawing  every hook is called at its moment, and writes nothing
                  the run reads

   The lockstep suite flies it between two machines (lifecycle), and the
   determinism suite plays it twice and restores it (above).
   ========================================================================= */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
import { PVP_SCRIPTS } from './pvp-build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const flush = () => new Promise(r => setTimeout(r, 20));

function boot(opts = {}) {
  return loadGame(IDX, Object.assign({
    before: win => {
      win.__live = { live: null, every: 900, above: false };
      const was = win.fetch;
      win.fetch = (u, o) => (String(u) !== '/api/live' ? was(u, o)
        : Promise.resolve(new Response(JSON.stringify(win.__live), { status: 200 })));
    }
  }, opts));
}
const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'ABOVE'; state = 'menu';`;
async function word(g, above) {
  g.win.__live = above === undefined ? { live: null, every: 900 } : { live: null, every: 900, above };
  g.run('Live.next = 0; Live.tick();');
  await flush();
}
// a run, hunted or not as the game last heard, parked in a sector with nothing else going on in the room
const RUN = (sector = 3) => `resetGame(); state = 'play'; wave = ${(sector - 1) * 5 + 1}; betweenWaves = 1e9; spawnBudget = 0; enemies.length = 0;
                             P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2; P.vx = 0; P.vy = 0;`;
// the hunt's own step, n times, with the room's clock at k of the wall's
const ticks = (g, n, k = 1) => g.run(`for (let i = 0; i < ${n}; i++) aboveTick(1 / 60, ${k} / 60);`);
const marks = g => JSON.parse(g.run('JSON.stringify(aboveMarks)'));
// one aimed now, at the pilot as it is
const AIM = 'aboveNext = 0; aboveTick(1 / 60, 1 / 60);';

const g = boot();
g.run(SETUP);

section('the word: the Worker says it, and a run keeps what it started with');
{
  ok(g.run('Live.above') === false && g.run('typeof ABOVE') === 'object', 'nothing is hunted until the Worker says so');
  g.run(RUN());
  ok(g.run('RUN.above') === false && g.run('aboveQuiet()') === true, 'a run started before it is not hunted');
  await word(g, true);
  ok(g.run('Live.above') === true, 'the Worker says so: the game hears it with what is on air');
  ok(g.run('RUN.above') === false && g.run('aboveQuiet()') === true, 'the run already going stays as it started');
  g.run(RUN());
  ok(g.run('RUN.above') === true && g.run('aboveQuiet()') === false, 'the next run is hunted');
  ok(g.run('runPack().above') === true, 'and its settings say so, for a co-op partner');
  await word(g, false);
  ok(g.run('Live.above') === false && g.run('RUN.above') === true, 'the Worker stops saying it: this run keeps it to its end');
  g.run(RUN());
  ok(g.run('RUN.above') === false, 'and the next does not');
  for (const odd of [undefined, 1, 'true', null]) {
    await word(g, odd);
    if (g.run('Live.above') !== false) ok(false, 'only true is true', odd);
  }
  ok(g.run('Live.above') === false, 'an answer without it, or with anything but true, is no');
  // a guest takes the host's word, never its own Worker's
  g.run(`runFlagsNext = Object.assign(runPack(), { above: true }); ${RUN()}`);
  ok(g.run('RUN.above') === true && g.run('Live.above') === false, 'a guest\'s run is hunted by the header, whatever its own Worker says');
  g.run(`Live.above = true; runFlagsNext = Object.assign(runPack(), { above: false }); ${RUN()}`);
  ok(g.run('RUN.above') === false, 'and not hunted when the host\'s is not');
  g.run('Live.above = true');
}

section('who: the runs that have grown, in the fight proper');
{
  g.run(RUN(1));
  ticks(g, 60 * 60 * 20);
  ok(marks(g).length === 0 && g.run('aboveNext') > 0, 'the first sector: twenty minutes, and nothing comes');
  g.run('wave = 10');
  ticks(g, 60 * 60 * 20);
  ok(marks(g).length === 0, 'nor at the end of the second');
  g.run('wave = 11');
  const first = g.run('aboveNext');
  ok(first >= 120 && first <= 240, 'the third: the first is two to four minutes of fighting off', first);
  ticks(g, Math.ceil(first * 60) - 2);
  ok(marks(g).length === 0, 'not before its time');
  ticks(g, 4);
  ok(marks(g).length === 1 && marks(g)[0].t > 0, 'then one is aimed', marks(g));
  const next = g.run('aboveNext');
  ok(next >= 120 && next <= 240, 'and the next is as far off again', next);
  // every gap in the stream, for a good while: rare, and never outside its bounds
  const gaps = JSON.parse(g.run(`JSON.stringify((() => { aboveBegin(); const a = []; for (let i = 0; i < 400; i++) a.push(aboveGap()); return a; })())`));
  const mean = gaps.reduce((s, v) => s + v, 0) / gaps.length;
  ok(gaps.every(v => v >= 120 && v <= 240) && mean > 165 && mean < 195, 'two to four minutes apart, three on the whole', [Math.min(...gaps), mean, Math.max(...gaps)]);

  // not this run, or not here
  const quietWhen = (how, undo) => { g.run(RUN() + how); const q = g.run('aboveQuiet()'); g.run(AIM); const none = marks(g).length === 0; if (undo) g.run(undo); return q && none; };
  ok(quietWhen('freeRun = true;'), 'never a sandbox (freeplay)');
  ok(quietWhen('Chal.on = { id: "x" };'), 'never a challenge\'s rule sheet');
  ok(quietWhen('Chal.on = { rush: true };'), 'never the rush');
  ok(quietWhen('amalRite = true;') && quietWhen('rootRite = true;') && quietWhen('vrRite = true;'), 'never a rite');
  ok(quietWhen('inHub = true;') && quietWhen('inVigil = true;') && quietWhen('hlArea = { id: "patch" };'), 'never the hub, nor an ALL HALLOWS room');
  ok(quietWhen('amalgam = {};') && quietWhen('unwritten = {};') && quietWhen('root = {};') && quietWhen('tribunal = {};') && quietWhen('outro = {};'),
     'never a finale');
  ok(quietWhen('awaitingPortal = true;'), 'nor the room between two sectors');
  g.run(RUN() + 'Chal.on = { daily: true };' + AIM);
  ok(g.run('aboveQuiet()') === false && marks(g).length === 1, 'a daily is a run like any other: hunted');
  // a mark on the floor when the run goes into a scene of its own is gone with it
  g.run(RUN() + AIM);
  const had = marks(g).length;
  g.run('amalRite = true; aboveTick(1 / 60, 1 / 60);');
  ok(had === 1 && marks(g).length === 0, 'and a mark already down does not follow a run into one');
  // a pilot from outside is not hunted
  g.run(RUN() + 'P.outside = true;' + AIM);
  ok(marks(g).length === 0, 'never a pilot from outside');
  g.run('P.outside = false;');

  // PvP's own page: the same engine, never hunted
  const p = loadGame(IDX, { search: '?preview=belt', scripts: PVP_SCRIPTS.map(s => ({ name: s, code: readFileSync(path.join(here, '..', 'pvp', 'site', s), 'utf8') })) });
  ok(p.run('!!PVP') && p.run('Live.off()') === true && p.run('RUN.above = true; aboveQuiet()') === true, 'and never on PvP\'s page');
}

section('the mark: where the hull will be, and for how long');
{
  const warnAt = s => { g.run(RUN(s)); return g.run('aboveWarn()'); };
  const w = [3, 4, 5, 6, 8, 12, 20, 40].map(warnAt);
  ok(Math.abs(w[0] - 1.8) < 1e-9, 'the third sector: 1.8 seconds of warning', w[0]);
  ok(w.every((v, i) => i === 0 || v <= w[i - 1]) && w[1] < w[0] && w[4] < w[1], 'shorter, sector after sector', w);
  ok(Math.abs(w[1] - 1.8 * 0.88) < 1e-9 && Math.abs(w[2] - 1.8 * 0.88 * 0.88) < 1e-9, 'by the same share each time', w.slice(0, 3));
  ok(w[6] === 0.5 && w[7] === 0.5 && w[5] > 0.5, 'and never under half a second', w.slice(5));

  // sitting still: on the hull
  g.run(RUN() + AIM);
  let m = marks(g)[0];
  const at = JSON.parse(g.run('JSON.stringify([P.x, P.y, P.r])'));
  ok(Math.abs(m.x - at[0]) < 1e-6 && Math.abs(m.y - at[1]) < 1e-6 && m.r === 44 && m.max === 1.8 && m.k === 0 && m.took === -1,
     'a hull sitting still is marked where it sits', m);
  // moving: where it will be when the warning runs out
  g.run(RUN() + 'P.vx = 100; P.vy = -50;' + AIM);
  m = marks(g)[0];
  ok(Math.abs(m.x - (at[0] + 100 * 1.8)) < 1e-6 && Math.abs(m.y - (at[1] - 50 * 1.8)) < 1e-6, 'a hull that keeps its heading, where it will be by then', [m.x - at[0], m.y - at[1]]);
  // fast: no further ahead than its reach
  g.run(RUN() + 'P.vx = 900; P.vy = 0;' + AIM);
  m = marks(g)[0];
  ok(Math.abs(m.x - at[0] - 260) < 1e-6 && Math.abs(m.y - at[1]) < 1e-6, 'never further ahead than it can aim (a dash is not followed across the room)', m.x - at[0]);
  // at the wall: inside the room, whole
  g.run(RUN() + 'P.x = arena.x1 - 5; P.vx = 300; P.y = arena.y0 + 5; P.vy = -300;' + AIM);
  m = marks(g)[0];
  const room = JSON.parse(g.run('JSON.stringify([arena.x0, arena.y0, arena.x1, arena.y1])'));
  ok(m.x === room[2] - 44 && m.y === room[1] + 44, 'and always inside the room, whole', [m.x, m.y, room]);

  // the warning runs on the room's clock, and a cut-in holds it
  g.run(RUN() + AIM);
  const t0 = marks(g)[0].t;
  ticks(g, 30, 0);
  ok(marks(g)[0].t === t0, 'the room stopped: the warning waits');
  ticks(g, 30, 0.5);
  ok(Math.abs(marks(g)[0].t - (t0 - 0.25)) < 1e-9, 'the room slowed by half: so is the warning', marks(g)[0].t - t0);
  g.run('P.roninIntro = { cut: false, t: 0 };');          // RONIN's lead-in, as it has the screen
  ticks(g, 120);
  ok(Math.abs(marks(g)[0].t - (t0 - 0.25)) < 1e-9 && marks(g).length === 1, 'a cut-in has the screen: nothing lands on a hull it holds');
  const nx = g.run('aboveNext');
  g.run('aboveNext = 0;'); ticks(g, 5);
  ok(marks(g).length === 1 && g.run('aboveNext') === 0, 'and nothing new is aimed');
  g.run(`P.roninIntro = null; aboveNext = ${nx};`);
  ticks(g, 30);
  ok(marks(g)[0].t < t0 - 0.25, 'over, it comes on');
}

section('landing: taken, whatever the hull carries');
{
  // everything a build can answer a blow with, at once
  const ARMOUR = `P.hp = P.maxHp = 9999; P.shield = 5; P.shell = true; P.shellUp = true; P.iframe = 99; P.armor = 999; P.revive = 3; P.reviveMax = 3;
                  P.deadman = true; P.brakeUsed = false; freeGod = false;`;
  g.run(RUN() + ARMOUR + "P.hitBy = 'SHARD';" + AIM);   // and something in the room had hurt it before
  ticks(g, Math.ceil(1.8 * 60) - 2);
  ok(g.run('state') === 'play' && marks(g)[0].t > 0, 'until it lands, the run goes on');
  ticks(g, 4);
  ok(g.run('state') === 'dead' && marks(g)[0].took === 0 && marks(g)[0].t === 0,
     'a hull still inside it: the run is over, through shield, shell, i-frames, armour, brake and Second Wind', [g.run('state'), g.run('P.shield'), g.run('P.revive')]);
  ok(g.run('P.shield') === 5 && g.run('P.revive') === 3 && g.run('P.brakeUsed') === false, 'and none of them was spent on it');
  ok(g.run('aboveTook && Math.abs(aboveTook.x - P.x) < 1e-6 && aboveTook.at === simTick'), 'where and when it was taken is kept, for the screen it ends on');
  ok(g.run('!!lastStats && lastStats.wave === wave'), 'filed as any run that ended');
  ok(g.run('P.hitBy') === '' && g.run('deadRecap(lastStats).by') === '', 'and its report names nothing in the room for it', g.run('P.hitBy'));

  // RONIN's vow does not answer it either (the vow taken, its cut-in over)
  g.run(RUN() + 'P.roninVow = { t: 30, cut: true };' + AIM);
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('vowOn()') === true && g.run('state') === 'dead', 'nor does a vow');

  // out of it in time: missed, and the run goes on
  g.run(RUN() + AIM);
  ticks(g, 60);
  g.run('P.x += 44 + P.r + 0.5;');
  ticks(g, 60);
  ok(g.run('state') === 'play' && marks(g)[0].t === 0 && marks(g)[0].took === -1 && g.run('aboveTook') === null, 'a hull that left it is missed', marks(g)[0]);
  g.run(RUN() + AIM);
  ticks(g, 60);
  g.run('P.x += 44 + P.r - 0.5;');
  ticks(g, 60);
  ok(g.run('state') === 'dead', 'by its whole width: an edge still inside is inside');
  // what has landed stands a moment, and is gone
  g.run(RUN() + AIM + 'P.x += 200;');
  ticks(g, Math.ceil(1.8 * 60) + 2);
  const stood = marks(g)[0];
  ticks(g, Math.ceil(1.4 * 60) - 6);
  const still = marks(g).length;
  ticks(g, 8);
  ok(stood.t === 0 && stood.after > 1.3 && still === 1 && marks(g).length === 0, 'landed, it stands 1.4 seconds, then is gone', [stood, still]);

  // not under it, though standing there
  g.run(RUN() + 'P.odStrike = { ph: "up" };' + AIM);
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('state') === 'play' && marks(g)[0].took === -1, 'a hull up off the floor (EMBER\'s C) is missed');
  g.run(RUN() + 'P.hlGhost = true;' + AIM);
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('state') === 'play' && marks(g)[0].took === -1, 'and a ghost has nothing left to take');
}

section('co-op: down, as any death there; the last one ends the run');
{
  const CO = RUN() + 'pilotsBegin(0, false);';
  g.run(CO + 'aboveRng = 1;');
  ok(g.run('PILOTS.length') === 2 && g.run('pilotP(1).x - pilotP(0).x') === 54, 'two pilots, side by side');
  // far apart, so one mark takes one pilot; aimed until each has been aimed at
  g.run('pilotP(1).x = pilotP(0).x + 400;');
  const aimed = new Set();
  for (let i = 0; i < 40 && aimed.size < 2; i++) { g.run('aboveMarks.length = 0;' + AIM); aimed.add(marks(g)[0].k); }
  ok(aimed.size === 2, 'either pilot may be the one it is aimed at', [...aimed]);
  g.run('aboveMarks.length = 0;');
  // pilot 1 marked, and stays
  for (let i = 0; i < 60; i++) { g.run('aboveMarks.length = 0;' + AIM); if (marks(g)[0].k === 1) break; }
  ok(marks(g)[0].k === 1 && Math.abs(marks(g)[0].x - g.run('pilotP(1).x')) < 1e-6, 'aimed at the second pilot, where it is');
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('state') === 'play' && g.run('pilotP(1).down') === true && g.run('pilotP(0).down') === false && g.run('aboveTook') === null && g.run('PILOT.on') === 0,
     'taken: that pilot is down, the other flies on, and the run goes on', [g.run('state'), g.run('pilotP(1).down')]);
  // nothing is aimed at a wreck
  for (let i = 0; i < 12; i++) { g.run('aboveMarks.length = 0;' + AIM); if (marks(g)[0].k !== 0) ok(false, 'a wreck is not aimed at', marks(g)[0]); }
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('state') === 'dead' && g.run('aboveTook') !== null, 'the last pilot taken: the run is over');
  // one mark, both inside it
  g.run(CO + 'pilotP(1).x = pilotP(0).x + 20;' + AIM);
  ticks(g, Math.ceil(1.8 * 60) + 2);
  ok(g.run('state') === 'dead', 'both under one: both taken, and the run with them');
  g.run('pilotsEnd();');
}

section('the run: its own stream is never moved, and the same seed is the same hunt');
{
  // every roll of the run's own stream, counted, through a long hunt with spears landing and missing
  g.run(RUN() + `globalThis.__sr = simRand; globalThis.__rolls = 0; simRand = () => { __rolls++; return __sr(); };
                 ABOVE.gap = [1, 3]; aboveBegin();`);
  const rng0 = g.run('simRngState');
  g.run(`globalThis.__landed = 0; for (let i = 0; i < 60 * 240; i++) {
           aboveTick(1 / 60, 1 / 60);
           for (const m of aboveMarks) if (m.t > 0 && m.t < 0.5) { P.x = m.x + 200 > arena.x1 - 30 ? m.x - 200 : m.x + 200; }
           if (aboveMarks.some(m => m.t === 0 && !m.seen)) { for (const m of aboveMarks) if (m.t === 0) m.seen = 1; __landed++; }
         } simRand = __sr;`);
  ok(g.run('__landed') > 60 && g.run('state') === 'play', 'four minutes of them, landing and missing', g.run('__landed'));
  ok(g.run('__rolls') === 0 && g.run('simRngState') === rng0, 'and the run\'s own stream was never rolled: a run with it is the same run in everything else');

  // the same seed: the same hunt, on another copy of the game
  const g2 = boot();
  g2.run(SETUP + 'Live.above = true; ABOVE.gap = [1, 3];');
  // (the hull weaves, and sidesteps whatever is about to land near it: the same flying on both copies)
  const HUNT = `runSeedNext = 4242; ${RUN()} (() => { const out = []; let off = 0;
    for (let i = 0; i < 60 * 60; i++) {
      aboveTick(1 / 60, 1 / 60);
      if (aboveMarks.some(m => m.t > 0 && m.t < 0.4 && Math.abs(P.x - m.x) < 130)) off = off ? 0 : 260;
      P.x = (arena.x0 + arena.x1) / 2 - 130 + off + 200 * Math.sin(i / 37); P.vx = 200 / 37 * 60 * Math.cos(i / 37);
      for (const m of aboveMarks) if (!m.noted) { m.noted = 1; out.push([i, +m.x.toFixed(6), +m.y.toFixed(6), m.k]); }
    }
    return JSON.stringify([out.length, out, state]); })()`;
  const a = g.run(HUNT), b = g2.run(HUNT);
  ok(a === b && JSON.parse(a)[0] > 20 && JSON.parse(a)[2] === 'play', 'the same seed and the same flying: the same spears, step for step', [a.slice(0, 120), b.slice(0, 120)]);
  const c = g2.run(HUNT.replace('4242', '4243'));
  ok(c !== a, 'another seed: another hunt');
  g.run('ABOVE.gap = [120, 240];'); g2.run('ABOVE.gap = [120, 240];');

  // a mark in flight, taken over by another copy: it lands there on the same step
  g.run('runSeedNext = 77;' + RUN() + AIM);
  ticks(g, 40);
  g2.ctx.__snap = g.run('JSON.stringify(snapWrite())');
  g2.run(RUN() + 'snapRead(JSON.parse(__snap));');
  ok(JSON.stringify(marks(g2)) === JSON.stringify(marks(g)) && g2.run('aboveNext') === g.run('aboveNext') && g2.run('aboveRng') === g.run('aboveRng') && g2.run('RUN.above') === true,
     'a snapshot carries the hunt whole: the mark in flight, its clock, its stream', [marks(g), marks(g2)]);
  const land = h => h.run(`(() => { let i = 0; while (state === 'play' && i < 600) { aboveTick(1 / 60, 1 / 60); i++; } return i; })()`);
  const la = land(g), lb = land(g2);
  ok(la === lb && g.run('state') === 'dead' && g2.run('state') === 'dead', 'and it lands on the same step in both', [la, lb]);
}

section('the drawing: every hook at its moment, and nothing written to the run');
{
  const HOOKS = ['aboveArtMark', 'aboveArtSky', 'aboveArtSpear', 'aboveArtScreen', 'aboveArtDead', 'aboveMarkFx', 'aboveLandFx', 'aboveTakenFx'];
  g.run(`globalThis.__h = {}; for (const n of ${JSON.stringify(HOOKS)}) { const f = globalThis[n]; if (typeof f !== 'function') throw new Error('no hook ' + n);
           globalThis[n] = (...a) => { __h[n] = (__h[n] || 0) + 1; return f(...a); }; }`);
  const seen = () => { const h = JSON.parse(g.run('JSON.stringify(__h)')); g.run('__h = {}'); return h; };
  const draw = () => { let e = null; try { g.run('render()'); } catch (err) { e = err; } return e; };
  g.run(RUN());
  ok(!draw() && Object.keys(seen()).length === 0, 'nothing coming: nothing drawn');
  g.run(AIM);
  let h = seen();
  ok(h.aboveMarkFx === 1 && Object.keys(h).length === 1, 'aimed: its one effect, once', h);
  const before = JSON.stringify(marks(g)) + g.run('aboveRng') + g.run('simRngState');
  let err = draw();
  h = seen();
  ok(!err && h.aboveArtMark === 1 && h.aboveArtSky === 1 && h.aboveArtScreen === 1 && !h.aboveArtSpear && !h.aboveArtDead,
     'warned: the mark on the floor, what comes down, and the frame', [String(err), h]);
  ok(JSON.stringify(marks(g)) + g.run('aboveRng') + g.run('simRngState') === before, 'and drawing it changed nothing of the run');
  g.run('P.x += 200;');
  ticks(g, Math.ceil(1.8 * 60) + 2);
  h = seen();
  ok(h.aboveLandFx === 1 && !h.aboveTakenFx, 'landed on nobody: its effect, and no other', h);
  err = draw();
  h = seen();
  ok(!err && h.aboveArtSpear === 1 && !h.aboveArtMark && !h.aboveArtSky && !h.aboveArtScreen, 'standing in the floor: the spear, and no warning', [String(err), h]);
  // taken: the effect, and the word on the screen it ends on
  g.run(RUN() + AIM);
  ticks(g, Math.ceil(1.8 * 60) + 2);
  h = seen();
  ok(h.aboveLandFx === 1 && h.aboveTakenFx === 1, 'landed on the hull: taken', h);
  err = draw();
  h = seen();
  ok(!err && g.run('state') === 'dead' && h.aboveArtDead === 1 && h.aboveArtSpear === 1, 'the run\'s last screen says what ended it, the spear still standing', [String(err), h]);
  // an ordinary death says nothing of it
  g.run(RUN() + 'P.hp = 0; gameOver();');
  err = draw();
  h = seen();
  ok(!err && g.run('state') === 'dead' && !h.aboveArtDead, 'a run ended by anything else does not', [String(err), h]);
  // the placeholders name themselves when asked to
  ok(g.run('ABOVE_LABELS') === false, 'the placeholders\' labels are off');

  // through the game's own step: wired in, and the real room does not stop it
  g.run(RUN() + 'P.hp = P.maxHp = 1e9; aboveNext = 0.05;');
  let threw = null, landedAt = -1;
  try { for (let i = 0; i < 60 * 4 && landedAt < 0; i++) { g.run('update(1 / 60); if (' + i + ' % 6 === 0) render();'); if (g.run('state') === 'dead') landedAt = i; } } catch (e) { threw = e; }
  ok(!threw && landedAt > 60 && landedAt < 60 * 3 && g.run('aboveTook !== null'), 'the game\'s own step aims it, lands it and ends the run, a billion health or not', [String(threw && threw.stack).slice(0, 200), landedAt]);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
