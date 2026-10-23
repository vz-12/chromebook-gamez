#!/usr/bin/env node
/* ===========================================================================
   KHEPRI, IN A RUN — its test: `npm run test:khepri` (BEETLE-PLAN.md)

   The game in Node (scripts/lib/game-vm.mjs), no browser. Two copies play
   the same scripted run on EMBER, awake: one wearing KHEPRI, one not. The
   run fires the lance, kills bodies and a boss, dashes, lights OVERDRIVE,
   and spends Z, X, C (with COMBO 1's ring and column) and V, drawing as it
   goes.

     WORN        a profile holding it, equipping it, on EMBER, has it on;
                 one that does not hold it cannot; on another hull it is off
     DRAWN       every guard handed over to the art at least once, and the art
                 never threw (the skin never turned itself off)
     KILLS       a body died its way, and a boss went to ash
     IN STEP     the run with the skin on and the run without it are the same
                 run, checkpoint for checkpoint: the art reads the game and
                 writes nothing the simulation reads
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
const STEP = 1 / 60;
let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; console.log('  ✓ ' + what); return; }
  fails++;
  console.log('  ✗ ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const J = (g, code) => JSON.parse(g.run(`JSON.stringify(${code})`));

// what the art was handed, counted: one name per guard, and the kills
const COUNTED = ['btlTick', 'btlDrawPilot', 'btlDrawLance', 'btlDrawFloorMarks', 'btlDrawOverBodies', 'btlOdDrawGrade',
  'btlOdFloor', 'btlOdWings', 'btlScorch', 'btlPyroMarks', 'btlPyros', 'btlStrikeHull', 'btlDrawStrikeMarks', 'btlStrikeFoot',
  'btlStrikeCut', 'btlBrandWall', 'btlBrandNukeMark', 'btlBrandNuke', 'btlKitScreen', 'btlKhepriAura', 'btlKhepriHull',
  'btlKhepriStars', 'btlKhepriScreen', 'btlKill', 'btlBossAsh', 'btlOdSwarm', 'btlOdBraid',
  'btlDrawVentHud', 'btlDrawOdHud', 'btlDrawStrikeUi', 'btlDrawBrandUi'];
// the stock kit's burst colours, and the beetle's (BTL_FX)
const STOCK_FX = ['#fff7ed', '#fde047', '#fdba74', '#fb923c', '#f97316'];

function game(worn) {
  const g = loadGame(IDX, { w: 1280, h: 720 });
  g.run(`pageDead = true; Save.profile.name = 'PILOT'; Save.profile.gfxSeen = GFX_VER; state = 'menu';
    globalThis.__n = {}; globalThis.__saw = {};
    for (const k of ${JSON.stringify(COUNTED)}) { const f = globalThis[k]; globalThis[k] = (...a) => { __n[k] = (__n[k] || 0) + 1; return f(...a); }; }
    globalThis.__press = []; globalThis.__dash = false; globalThis.__aim = null; globalThis.__trig = false;
    inputSource = rec => { rec.mx = 0; rec.my = 0; rec.trig = __trig; rec.lmb = __trig; rec.auto = false; rec.dash = __dash; __dash = false;
      rec.touch = false; rec.taim = null; rec.local = false; rec.press = __press.concat(inputQueue.splice(0)); __press = []; rec.held = '';
      const a = __aim || { x: P.x + 300, y: P.y }; rec.ax = a.x; rec.ay = a.y; };
    ${worn ? `Save.profile.awards = (Save.profile.awards || []).concat([{ skin: 'ember-gift', via: 'test' }]); Save.profile.skinEquip = 'ember-gift';` : ''}`);
  return g;
}
function enter(g, pilot = 'ember', seed = 9) {
  g.run(`applyChar(CHARS.findIndex(c => c.id === '${pilot}')); runSeedNext = ${seed}; resetGame(); state = 'play'; P.awake = 1;
    P.maxHp = P.hp = 60000; enemies.length = 0; ebullets.length = 0; spawnBudget = 5; spawnT = 1e9;
    P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2; __aim = { x: P.x + 300, y: P.y };`);
}
// the run, as both copies see it: the simulation's state and nothing of the art's
const PRINT = `JSON.stringify([simRngState, simTick, wave, Math.round(score), state,
  [P.x, P.y, P.vx, P.vy, P.hp, P.ang, P.vent, P.ventT, P.laserT, P.charge, P.dashT, P.kills].map(v => Math.round((v || 0) * 1000)),
  enemies.filter(e => !e.dead).map(e => [e.type, Math.round(e.x), Math.round(e.y), Math.round(e.hp)]),
  bullets.length, ebullets.length, odScars.length, odPyros.map(p => [Math.round(p.t * 100), p.up]),
  P.odStrike ? [P.odStrike.ph, Math.round(P.odStrike.T * 100)] : null, odRing ? Math.round(odRing.t * 100) : null,
  odStars.map(s => [Math.round(s.x), Math.round(s.y), s.held.length]), P.odFusion ? Math.round(P.odFusion.t * 100) : null])`;
const prints = [];
function steps(g, n, rec) {
  for (let i = 0; i < n; i++) {
    g.run(`if (state === 'levelup') { uiArm = 0; handleKey('1'); } if (state !== 'play') state = 'play'; update(${STEP}); btlFrame(); if (simTick % 5 === 0) render();
      if (odRing) __saw.ring = 1; if (P.odStrike && P.odStrike.nuke && P.odStrike.nuke.up) __saw.nuke = 1; if (P.odFusion) __saw.fusion = 1;`);
    if (rec && i % 30 === 0) rec.push(g.run(PRINT));
  }
}
// an ability, pressed in play: a card still to pick is picked first
const act = (g, code) => g.run(`if (state === 'levelup') { uiArm = 0; handleKey('1'); } state = 'play'; ${code}`);
const phase = g => g.run(`P.odStrike ? P.odStrike.ph : ''`);
const soak = (g, d, a, hp) => g.run(`(() => { const e = spawnEnemy('grunt', P.x + Math.cos(${a}) * ${d}, P.y + Math.sin(${a}) * ${d}, { elite: false });
  e.maxHp = e.hp = ${hp}; e.spd = 0; e.dmg = 0; e.atkT = 1e9; e.cd = 1e9; return e.id; })()`);

// one scripted run: everything KHEPRI draws, the same on both copies
function play(g, rec) {
  enter(g);
  for (let i = 0; i < 4; i++) soak(g, 90 + i * 40, (i - 1.5) * 0.12, 40);     // bodies that die in the lance
  soak(g, 160, 0.5, 1e7);
  g.run(`__trig = true;`); steps(g, 240, rec);
  // a boss, put down: it goes to ash
  g.run(`(() => { const e = spawnEnemy('grunt', P.x + 200, P.y - 60, { elite: false }); e.type = 'boss'; e.r = 40; e.sides = 7; killEnemy(e, 0); })()`);
  steps(g, 60, rec);
  g.run(`__dash = true;`); steps(g, 40, rec);
  // OVERDRIVE: the swarm, the room, the wings, the braid
  act(g, `P.vent = VENT_MAX; ventFire();`); steps(g, 330, rec);
  // Z, then X at a body; what Z's cast threw is kept for the colours
  g.run(`globalThis.__p0 = parts.length;`);
  act(g, `P.vent = VENT_MAX; odAbility(0); globalThis.__zSparks = parts.slice(__p0).map(p => p.color);`); steps(g, 150, rec);
  act(g, `P.vent = VENT_MAX; __aim = { x: P.x + 220, y: P.y + 40 }; odAbility(1);`); steps(g, 160, rec);
  // C: up, marked at the cursor once it is aiming, and COMBO 1's ring and column queued once it is marked
  act(g, `__trig = false; P.vent = VENT_MAX; __aim = { x: (arena.x0 + arena.x1) / 2 + 150, y: (arena.y0 + arena.y1) / 2 }; odAbility(2);`);
  for (let i = 0; i < 80 && phase(g) !== 'aim'; i++) steps(g, 3, rec);
  act(g, `odAbility(2);`);
  for (let i = 0; i < 40 && !['tell', 'fire'].includes(phase(g)); i++) steps(g, 2, rec);
  act(g, `P.vent = VENT_MAX; odAbility(0); P.vent = VENT_MAX; odAbility(1);`);
  for (let i = 0; i < 60 && phase(g) !== ''; i++) steps(g, 30, rec);
  // V: KHEPRI itself, throwing its suns
  act(g, `P.vent = VENT_MAX; odAbility(3); __trig = true;`); steps(g, 360, rec);
  steps(g, 30, rec);
}

console.log('KHEPRI · in a run');
console.log('· WORN');
{
  const g = game(true);
  enter(g);
  ok(J(g, `btlWorn()`), 'a profile holding it and wearing it on EMBER has it on');
  g.run(`applyChar(CHARS.findIndex(c => c.id === 'runner')); resetGame(); state = 'play';`);
  ok(!J(g, `btlWorn()`), 'on another hull it is off');
  const h = game(false);
  h.run(`Save.profile.skinEquip = 'ember-gift';`);
  enter(h);
  ok(!J(h, `btlWorn()`), 'a profile that does not hold it cannot wear it');
  ok(J(h, `devList().every(s => s.id !== 'ember-gift')`), 'and it is not listed for that profile');
  ok(J(g, `devList().some(s => s.id === 'ember-gift' && s.n === 'KHEPRI')`), 'it is listed, as KHEPRI, for one that holds it');
}

console.log('· DRAWN, KILLS, IN STEP');
{
  const a = game(true), b = game(false), pa = [], pb = [];
  play(a, pa); play(b, pb);
  const n = J(a, `__n`), off = J(a, `BTL_G.off`);
  ok(!off, 'the art never threw: the skin is still on at the end');
  const missing = COUNTED.filter(k => !n[k]);
  ok(!missing.length, `every guard handed over to the art (${COUNTED.length - missing.length}/${COUNTED.length})`, missing);
  ok((n.btlKill || 0) >= 3, 'bodies burned out its way', n.btlKill);
  ok((n.btlBossAsh || 0) >= 1, 'a boss went to ash', n.btlBossAsh);
  const saw = J(a, `__saw`);
  ok(saw.ring && saw.nuke, 'C ran COMBO 1 to the end: the ring wall stood and the giant column went up', saw);
  ok(saw.fusion, 'V lit: KHEPRI flew', saw);
  ok(!Object.keys(J(b, `__n`)).some(k => k !== 'btlTick' && J(b, `__n`)[k] > 0), 'the copy without it never drew any of it');
  // the bursts: the same sparks either way, in its colours only when it is worn
  const fxA = J(a, `BTL_G.fxN`), fxB = J(b, `BTL_G.fxN`), zA = J(a, `__zSparks`), zB = J(b, `__zSparks`), beetle = J(a, `Object.values(BTL_FX)`);
  ok(fxA >= 15 && fxB === 0, `the kit's effects threw in its colours (${fxA} of them), and none did without it`, [fxA, fxB]);
  ok(zA.length > 10 && zA.length === zB.length, 'Z\'s cast threw as many sparks worn as not', [zA.length, zB.length]);
  ok(zA.every(c => beetle.includes(c)) && zB.every(c => STOCK_FX.includes(c)),
     'every one of them on the beetle\'s ramp worn, and on the stock one without it', { worn: [...new Set(zA)], bare: [...new Set(zB)] });
  ok(J(a, `btlFxText('#fb923c')`) === '#67e8f9' && J(b, `btlFxText('#fb923c')`) === '#fb923c', 'VENT READY and the kit\'s numbers too');
  let first = -1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if (pa[i] !== pb[i]) { first = i; break; }
  ok(first < 0 && pa.length === pb.length && pa.length > 40, `worn and not worn, the run is the same at all ${pa.length} checkpoints`,
     first >= 0 ? { at: first, worn: pa[first], bare: pb[first] } : pa.length);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
