#!/usr/bin/env node
/* ===========================================================================
   IMAGO, IN A RUN — its test: `npm run test:imago` (ONE-POINT-OH-RITE-PLAN.md)

   The game in Node (scripts/lib/game-vm.mjs), no browser.

     GRAZE        a round that passes the hull close pays, one that lands
                  does not, one dashed through pays more; only an awake
                  VOIDRUNNER fills it, never in IMAGO, never in the rite
     [F]          refuses short of a full meter; a full one is a minute of
                  IMAGO, drawn as the rite's moth, and then the ship again
     Z EYESPOTS   (user, 18 Oct) bombs thrown over a 130° cone along the aim,
                  every one bursting two seconds after the throw: where they
                  land, when they burst, what they hurt and how hard, one
                  thrown into a body riding it, the cooldown, the form
                  ending under them
     the rite     none of it answers there
     a snapshot   bombs in the air come back in another copy and burst the
                  same
     the hooks    every IMAGO_ART hook is drawn, effects on and off, and
                  none throws

   Whether a run with it stays in step is scripts/determinism.mjs ('imago')
   and scripts/lockstep.mjs (VOIDRUNNER is awake in its kit scenarios).
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 500) : ''));
}
const section = t => console.log('· ' + t);
const STEP = 1 / 60;
const J = (g, code) => JSON.parse(g.run(`JSON.stringify(${code})`));

// a copy of the game, its IMAGO hooks counted
function game() {
  const g = loadGame(IDX, { w: 1280, h: 720 });
  g.run(`pageDead = true; Save.profile.name = 'PILOT'; Save.profile.gfxSeen = GFX_VER; state = 'menu';
    globalThis.__art = {};
    for (const k of Object.keys(IMAGO_ART)) { const f = IMAGO_ART[k]; IMAGO_ART[k] = (...a) => { __art[k] = (__art[k] || 0) + 1; return f(...a); }; }
    globalThis.__press = [];
    globalThis.__dash = false;
    globalThis.__aim = null;
    inputSource = rec => { rec.mx = 0; rec.my = 0; rec.trig = false; rec.lmb = false; rec.auto = false; rec.dash = __dash; __dash = false;
      rec.touch = false; rec.taim = null; rec.local = false; rec.press = __press.concat(inputQueue.splice(0)); __press = [];   // and what the keyboard queued (handleKey) rec.held = '';
      const a = __aim || { x: P.x + 300, y: P.y }; rec.ax = a.x; rec.ay = a.y; };`);
  return g;
}
const artSeen = {};
const takeArt = g => { for (const [k, n] of Object.entries(J(g, `__art`))) artSeen[k] = (artSeen[k] || 0) + n; };
// a run on VOIDRUNNER, awake or not, the room emptied
function enter(g, awake = true, seed = 9) {
  g.run(`applyChar(CHARS.findIndex(c => c.id === 'runner')); runSeedNext = ${seed}; resetGame(); state = 'play'; P.awake = ${awake ? 1 : 0};
    P.maxHp = P.hp = 60000; enemies.length = 0; ebullets.length = 0; spawnBudget = 5; spawnT = 1e9; P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2;`);
}
const steps = (g, n, draw) => g.run(`(() => { for (let i = 0; i < ${n}; i++) {
  if (state === 'levelup') { uiArm = 0; handleKey('1'); }
  if (state !== 'play') state = 'play';
  update(${STEP}); ${draw ? 'if (i % 6 === 0) render();' : ''} } return state; })()`);
// a body that stands where it is put and soaks: d px from the hull along angle a (radians off the aim, which is +x)
const dummy = (g, d, a = 0) => g.run(`(() => { const e = spawnEnemy('grunt', P.x + Math.cos(${a}) * ${d}, P.y + Math.sin(${a}) * ${d}, { elite: false });
  e.maxHp = e.hp = 1e7; e.spd = 0; e.dmg = 0; e.atkT = 1e9; e.cd = 1e9; return e.id; })()`);
const hpOf = (g, id) => J(g, `(enemies.find(e => e.id === ${id}) || { hp: null }).hp`);
// hold the room still: no new waves, no rounds of theirs, the bodies where they were put
const HOLD = `for (const e of enemies) { e.vx = e.vy = 0; } ebullets.length = 0;`;
const held = (g, n) => { for (let i = 0; i < n; i++) { g.run(HOLD); steps(g, 1); } };
// a round of theirs, flying past (or into) the hull: offset off its line, from the left
const round = (g, off, spd = 500) => g.run(`(() => { const b = eshoot({ x: P.x - 200, y: P.y + ${off}, dmg: 5, r: 10, col: '#f87171' }, 0, ${spd}, 5, 6); b.x = P.x - 200; b.y = P.y + ${off}; b.owner = null; return ebullets.length; })()`);

/* ================================== GRAZE ================================== */
section('GRAZE');
{
  const g = game();
  enter(g, false);
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === 0, 'a hull not yet awake grazes nothing', J(g, `P.imGraze`));

  enter(g, true);
  ok(J(g, `P.imGraze === 0 && P.imT === 0 && P.imSpots.length === 0`), 'a new run starts empty');
  // a round 30 px off the line, radius 6 and the hull's 13: inside the band (edge 19, band to 45), never touching
  const hp0 = J(g, `P.hp`);
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === 1, 'a round passing close pays one, as it leaves', J(g, `P.imGraze`));
  ok(J(g, `P.hp`) === hp0, 'and it did not land');
  round(g, 70); steps(g, 50);
  ok(J(g, `P.imGraze`) === 1, 'one passing wide pays nothing', J(g, `P.imGraze`));
  round(g, 0); steps(g, 50);
  ok(J(g, `P.imGraze`) === 1, 'one that lands pays nothing', J(g, `P.imGraze`));
  ok(J(g, `P.hp`) < hp0, 'and it landed');
  // a dash through one: the round is met mid-dash
  g.run(`P.iframe = 0; P.dashCh = P.dashMax;`);
  round(g, 0, 400);
  steps(g, 24);
  g.run(`P.dashT = 0.5; P.iframe = 0.5;`);
  steps(g, 12);
  ok(J(g, `P.imGraze`) === 1 + 4, 'one dashed through pays four', J(g, `P.imGraze`));
  g.run(`P.imGraze = IM_MAX - 1;`);
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === J(g, `IM_MAX`), 'it fills to IM_MAX', J(g, `P.imGraze`));
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === J(g, `IM_MAX`), 'and no further', J(g, `P.imGraze`));
}

/* =================================== [F] =================================== */
section('[F]');
{
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX - 1; __press = ['f'];`); steps(g, 2);
  ok(J(g, `P.imT === 0 && P.imGraze === IM_MAX - 1`), 'short of a full meter, F refuses and spends nothing', J(g, `[P.imT, P.imGraze]`));
  g.run(`__press = ['z'];`); steps(g, 2);
  ok(J(g, `P.imSpots.length`) === 0, 'Z out of IMAGO throws nothing');
  g.run(`P.imGraze = IM_MAX; handleKey('f');`); steps(g, 2);
  ok(J(g, `imOn() && P.imGraze === 0 && P.imT > IM_LEN - 0.1`), 'a full meter is IMAGO, for a minute (F, from the keyboard)', J(g, `[P.imT, P.imGraze]`));
  steps(g, 30, true);
  ok((J(g, `__art`).hull || 0) > 0, 'the hull is IMAGO\'s while it is on (IMAGO_ART.hull)', J(g, `__art`));
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === 0, 'grazes do not fill it while it is on', J(g, `P.imGraze`));
  g.run(`__press = ['x'];`); steps(g, 1);
  g.run(`__press = ['c'];`); steps(g, 1);
  ok(J(g, `P.imCd.every(c => c === 0) && P.imSpots.length === 0`), 'X and C are not named yet, and do nothing', J(g, `P.imCd`));
  g.run(`P.imT = 0.05;`); steps(g, 6);
  ok(J(g, `!imOn() && P.imT === 0`), 'the minute ends, and it is the ship again');
  const before = J(g, `__art.hull || 0`);
  steps(g, 30, true);
  ok(J(g, `__art.hull || 0`) === before, 'and the ship is drawn as the ship', [before, J(g, `__art.hull || 0`)]);
  takeArt(g);
}

/* ================================ Z, EYESPOTS ================================ */
section('Z — EYESPOTS');
{
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  // the aim is +x; throw, from the keyboard, as a player does
  g.run(`handleKey('z');`); steps(g, 1);
  const n = J(g, `EYE_ROWS.reduce((s, r) => s + r[0], 0)`);
  const S = J(g, `P.imSpots.map(s => ({ a: Math.atan2(s.ty - s.y0, s.tx - s.x0), d: Math.hypot(s.tx - s.x0, s.ty - s.y0), t: s.t }))`);
  ok(S.length === n && n === 9, 'Z throws nine', S.length);
  const half = 65 * Math.PI / 180 + 1e-9;
  ok(S.every(s => Math.abs(s.a) <= half), 'every one inside the 130° cone along the aim', S.map(s => +(s.a * 180 / Math.PI).toFixed(1)));
  const spread = Math.max(...S.map(s => s.a)) - Math.min(...S.map(s => s.a));
  ok(spread > 120 * Math.PI / 180, 'and they fill it, edge to edge', +(spread * 180 / Math.PI).toFixed(1));
  ok(S.every(s => s.d >= 95 - 12.01 && s.d <= 195 + 12.01), 'thrown 83 to 207 px out, in two rows', S.map(s => Math.round(s.d)));
  ok(J(g, `P.imCd[0]`) > J(g, `EYE_CD`) - 0.1, 'Z is on its cooldown', J(g, `P.imCd[0]`));
  g.run(`__press = ['z'];`); steps(g, 1);
  ok(J(g, `P.imSpots.length`) === n, 'pressed again inside it, nothing more is thrown', J(g, `P.imSpots.length`));
  /* when they burst: all of them, on the same step, two seconds after the
     throw. The step they were thrown on ages them too, so that is step 1 of
     their fuse, and the one pressed inside the cooldown was step 2. */
  let k = 2, burstAt = -1, gone = [];
  while (k < 200) {
    steps(g, 1, true); k++;
    const left = J(g, `P.imSpots.length`);
    if (left < n && burstAt < 0) { burstAt = k; gone.push(left); }
  }
  ok(burstAt === Math.round(J(g, `EYE_FUSE`) / STEP), 'they burst two seconds after the throw, to the step', { step: burstAt, s: +(burstAt * STEP).toFixed(4) });
  ok(gone[0] === 0, 'every one of them on the same step', gone);
  takeArt(g);
}
{
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  const inn = dummy(g, 150, 0), out = dummy(g, 150, Math.PI), far = dummy(g, 420, 0);
  g.run(HOLD);
  const h0 = [hpOf(g, inn), hpOf(g, out), hpOf(g, far)];
  g.run(`__press = ['z'];`); held(g, 1);
  // where each lands, and how many blasts will reach the body in the cone
  held(g, 30);
  const reach = J(g, `(() => { const e = enemies.find(q => q.id === ${inn}); return P.imSpots.filter(s => Math.hypot(e.x - s.x, e.y - s.y) < EYE_R + e.r).length; })()`);
  const rode = J(g, `P.imSpots.filter(s => s.on).length`);
  held(g, 80);
  ok(hpOf(g, inn) === h0[0], 'nothing is hurt before they burst', [h0[0], hpOf(g, inn)]);
  held(g, 15);
  const per = J(g, `EYE_DMG * suPower()`);
  const lost = h0[0] - hpOf(g, inn);
  ok(reach >= 2, 'a body in the cone, close, is in reach of more than one', reach);
  ok(Math.abs(lost - per * reach) < 1e-6 * per * reach + 1e-6, 'and takes every blast it is in, at full weight', { lost, per, reach, rode });
  ok(hpOf(g, out) === h0[1], 'a body behind the hull takes nothing', [h0[1], hpOf(g, out)]);
  ok(hpOf(g, far) === h0[2], 'nor one beyond their reach', [h0[2], hpOf(g, far)]);
  ok(J(g, `P.hp`) === 60000, 'and the hull takes nothing from its own');
  // twice the damage upgrades, twice the blast
  g.run(`P.dmg *= 2; P.imCd[0] = 0; __press = ['z'];`); held(g, 1);
  held(g, 30);
  const reach2 = J(g, `(() => { const e = enemies.find(q => q.id === ${inn}); return P.imSpots.filter(s => Math.hypot(e.x - s.x, e.y - s.y) < EYE_R + e.r).length; })()`);
  const h1 = hpOf(g, inn);
  held(g, 100);
  ok(Math.abs((h1 - hpOf(g, inn)) - per * 2 * reach2) < 1e-6 * per * reach2 + 1e-6, 'upgrades to the damage scale the blast', { lost: h1 - hpOf(g, inn), want: per * 2 * reach2 });
}
{
  // a body in the way: the bomb thrown into it lands on it and rides it, and still bursts there
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  const id = dummy(g, 60, 0);
  g.run(HOLD + `__press = ['z'];`); held(g, 1);
  held(g, 20);
  const on = J(g, `P.imSpots.filter(s => s.on && s.on.id === ${id}).length`);
  ok(on >= 1, 'a bomb thrown into a body lands on it', on);
  g.run(`(() => { const e = enemies.find(q => q.id === ${id}); e.x += 120; e.y -= 80; })()`);
  g.run(`for (const e of enemies) { e.vx = e.vy = 0; }`); steps(g, 1);
  const follows = J(g, `(() => { const e = enemies.find(q => q.id === ${id}); return P.imSpots.filter(s => s.on === e).every(s => Math.hypot(s.x - e.x, s.y - e.y) <= e.r + 0.01); })()`);
  ok(follows, 'and rides it where it goes');
  const h0 = hpOf(g, id);
  held(g, 100);
  ok(h0 - hpOf(g, id) >= J(g, `EYE_DMG * suPower()`) * on - 1e-6, 'it bursts on the body, wherever it went', { lost: h0 - hpOf(g, id), on });
  // the body dying first drops it where it was, and it still bursts
  g.run(`P.imCd[0] = 0;`);
  const id2 = dummy(g, 60, 0);
  g.run(HOLD + `__press = ['z'];`); held(g, 1);
  held(g, 20);
  const rode2 = J(g, `P.imSpots.filter(s => s.on && s.on.id === ${id2}).length`);
  g.run(`(() => { const e = enemies.find(q => q.id === ${id2}); e.hp = 1; damageEnemy(e, 1e9, false, P.x, P.y); })()`);
  held(g, 1);
  ok(rode2 >= 1 && J(g, `P.imSpots.every(s => !s.on || !s.on.dead)`), 'a body that dies under it lets it drop', rode2);
  ok(J(g, `P.imSpots.length`) === 9, 'and it is still there, to burst');
  held(g, 110);
  ok(J(g, `P.imSpots.length`) === 0, 'and it bursts');
}
{
  // the form ending under them: they burst all the same
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  const id = dummy(g, 150, 0);
  g.run(HOLD + `__press = ['z'];`); held(g, 1);
  g.run(`P.imT = 0.05;`); held(g, 10);
  ok(J(g, `!imOn() && P.imSpots.length === 9`), 'IMAGO ends with its bombs still out');
  const h0 = hpOf(g, id);
  held(g, 120);
  ok(J(g, `P.imSpots.length`) === 0 && hpOf(g, id) < h0, 'and they burst, and hurt, all the same', [h0, hpOf(g, id)]);
  g.run(`__press = ['z'];`); steps(g, 2);
  ok(J(g, `P.imSpots.length`) === 0, 'Z does nothing once it is the ship again');
}

/* ================================== the rite ================================== */
section('the rite');
{
  const g = game();
  enter(g, true);
  g.run(`enterRite('runner');`);
  steps(g, 400);
  ok(J(g, `oprOn()`), 'in VOIDRUNNER\'s rite');
  g.run(`P.awake = 1; P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  ok(J(g, `P.imT === 0 && !imOn()`), 'F is not IMAGO there');
  g.run(`__press = ['z'];`); steps(g, 2);
  ok(J(g, `P.imSpots.length`) === 0, 'nor is Z anything');
  g.run(`P.imGraze = 0;`);
  for (let i = 0; i < 5; i++) { round(g, 30); steps(g, 50); }
  ok(J(g, `P.imGraze`) === 0, 'and its grazes are the rite\'s, not GRAZE in a run', J(g, `P.imGraze`));
}

/* ================================= a snapshot ================================= */
section('a snapshot');
{
  const a = game(), c = game();
  enter(a, true, 21);
  a.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(a, 2);
  const ids = [dummy(a, 120, 0.3), dummy(a, 60, -0.2), dummy(a, 200, 0)];
  a.run(HOLD + `__press = ['z'];`); held(a, 1);
  held(a, 40);
  const snap = a.run(`JSON.stringify(snapWrite())`);
  c.run(`applyChar(CHARS.findIndex(ch => ch.id === 'runner')); resetGame(); state = 'play'; snapRead(JSON.parse(${JSON.stringify(snap)}));`);
  ok(J(c, `P.imSpots.length`) === 9 && J(c, `imOn()`), 'the bombs and the form come back in another copy', J(c, `[P.imSpots.length, P.imT]`));
  ok(J(c, `P.imSpots.filter(s => s.on).every(s => enemies.includes(s.on))`), 'a bomb on a body is on the same body there');
  held(a, 90); held(c, 90);
  const hpA = ids.map(id => hpOf(a, id)), hpC = ids.map(id => hpOf(c, id));
  ok(JSON.stringify(hpA) === JSON.stringify(hpC), 'they burst the same in both', { hpA, hpC });
  ok(J(c, `P.imSpots.length`) === 0, 'and all of them are gone');
}

/* ================================== the hooks ================================== */
section('the hooks');
{
  for (const mat of [1, 0]) {
    const g = game();
    g.run(`FXO.mat = ${mat}; FXO.parts = ${mat};`);
    enter(g, true);
    round(g, 30);
    steps(g, 40, true);
    g.run(`P.imGraze = IM_MAX;`); steps(g, 6, true);
    g.run(`__press = ['f'];`); steps(g, 2, true);
    dummy(g, 70, 0); dummy(g, 180, 0.4);
    g.run(`__press = ['z'];`);
    for (let i = 0; i < 160; i++) { g.run(HOLD); steps(g, 1); if (i % 3 === 0) g.run(`render()`); }
    g.run(`P.imT = 0.02;`); steps(g, 12, true);
    takeArt(g);
    const failed = J(g, `[...IM_FAILED, ...OR_FAILED]`);
    ok(failed.length === 0, 'no hook threw' + (mat ? '' : ', with Surface materials off'), failed);
  }
  const want = J(game(), `Object.keys(IMAGO_ART)`);
  for (const k of want) ok((artSeen[k] || 0) > 0, 'IMAGO_ART.' + k + ' is drawn', artSeen);
}

console.log(`\nimago: ${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
