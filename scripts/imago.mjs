#!/usr/bin/env node
/* ===========================================================================
   IMAGO, IN A RUN — its test: `npm run test:imago` (ONE-POINT-OH-RITE-PLAN.md)

   The game in Node (scripts/lib/game-vm.mjs), no browser.

     GRAZE        a round that passes the hull close pays, one that lands
                  does not, one dashed through pays more; only an awake
                  VOIDRUNNER fills it, never in IMAGO, never in the rite
     [F]          refuses short of a full meter; a full one is a minute of
                  IMAGO, drawn as the rite's moth, and then the ship again
     the cut-in   [F] opens on it: the room held, the hull held, nothing
                  landing, no Z, none of the minute spent; the cut to the
                  step, the moth from there, and a snapshot taken in it
     Z EYESPOTS   (user, 18 Oct) bombs thrown over a 130° cone along the aim,
                  every one bursting two seconds after the throw: where they
                  land, when they burst, what they hurt and how hard, one
                  thrown into a body riding it, the cooldown, the form
                  ending under them
     X FLUTTER    (user, 18 Oct) ten seconds twice as fast, every round and
                  blow dodged, each dodge played out whole (aside and back):
                  the speed, a round seen coming and stepped clear of, the
                  hull home again, the round flying on, a volley, a blow,
                  the floor still landing, a wall, a dodge never cut short,
                  the end, the form ending under it, a snapshot mid-dodge
     C ARMORY     (user, 18 Oct) a wheel of eight overpowered guns: it opens on
                  C, slows the room and holds the hull; the aim picks, C or a
                  fresh click wears it, aimed at the hull it shuts; every gun
                  out-hits the hull's own, each its own way (a line, a chain,
                  a blast, a pull); the gun goes with the form, and what is
                  in the air finishes; a snapshot with it all in the air
     V ENDLESS    (user, 18 Oct: evolution and progress; the name is mine)
       FORMS      the rite's free evolution, earned: V molts the moth
                  (untouchable, silent, still flying, IMAGO's clock raised),
                  then PROGRESS from time, kills and grazes grows the rite's
                  eight growths in the rite's order, each fill needing more,
                  and OVERGROWTH past the eighth; they fire only with the
                  trigger held, out-hit the hull's own many times over and
                  reach behind and off the line; Z still answers, V again is
                  nothing; IMAGO ending sheds them and their shots finish; a
                  new IMAGO starts over; a snapshot with it all out
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
    globalThis.__mx = 0; globalThis.__my = 0;
    // what the test presses, and what the keyboard queued (handleKey)
    globalThis.__trig = false; globalThis.__auto = false;
    inputSource = rec => { rec.mx = __mx; rec.my = __my; rec.trig = __trig; rec.lmb = __trig; rec.auto = __auto; rec.dash = __dash; __dash = false;
      rec.touch = false; rec.taim = null; rec.local = false; rec.press = __press.concat(inputQueue.splice(0)); __press = []; rec.held = '';
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
// through IMAGO's cut-in, to the room again (the room held, if asked)
const throughCut = (g, hold, draw) => { const n = Math.round(J(g, `IM_T_CUT + IM_T_SETTLE`) / STEP) + 2; if (hold) held(g, n); else steps(g, n, draw); };
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
  ok(J(g, `P.imGraze`) === J(g, `IM_PAY`), 'a round passing close pays IM_PAY, as it leaves', J(g, `P.imGraze`));
  ok(J(g, `P.hp`) === hp0, 'and it did not land');
  round(g, 70); steps(g, 50);
  ok(J(g, `P.imGraze`) === J(g, `IM_PAY`), 'one passing wide pays nothing', J(g, `P.imGraze`));
  round(g, 0); steps(g, 50);
  ok(J(g, `P.imGraze`) === J(g, `IM_PAY`), 'one that lands pays nothing', J(g, `P.imGraze`));
  ok(J(g, `P.hp`) < hp0, 'and it landed');
  // a dash through one: the round is met mid-dash
  g.run(`P.iframe = 0; P.dashCh = P.dashMax;`);
  round(g, 0, 400);
  steps(g, 24);
  g.run(`P.dashT = 0.5; P.iframe = 0.5;`);
  steps(g, 12);
  ok(J(g, `P.imGraze`) === J(g, `IM_PAY + IM_PAY_DASH`), 'one dashed through pays IM_PAY_DASH', J(g, `P.imGraze`));
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
  throughCut(g);
  steps(g, 30, true);
  ok((J(g, `__art`).hull || 0) > 0, 'the hull is IMAGO\'s while it is on (IMAGO_ART.hull)', J(g, `__art`));
  round(g, 30); steps(g, 50);
  ok(J(g, `P.imGraze`) === 0, 'grazes do not fill it while it is on', J(g, `P.imGraze`));
  g.run(`__press = ['v'];`); steps(g, 1);
  ok(J(g, `!!P.imEvo && P.imEvo.molt > 0 && P.imSpots.length === 0 && P.imFlut === 0 && !P.imArmMenu`), 'V is ENDLESS FORMS, and nothing else', J(g, `P.imEvo`));
  g.run(`P.imT = 0.05;`); steps(g, 6);
  ok(J(g, `!imOn() && P.imT === 0`), 'the minute ends, and it is the ship again');
  const before = J(g, `__art.hull || 0`);
  steps(g, 30, true);
  ok(J(g, `__art.hull || 0`) === before, 'and the ship is drawn as the ship', [before, J(g, `__art.hull || 0`)]);
  takeArt(g);
}

/* ================================ the cut-in ================================ */
section('the cut-in');
{
  const g = game();
  enter(g, true);
  const id = dummy(g, 200, 0);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 1);
  ok(J(g, `imCutIn() && imOn() && !imShown()`), 'F opens on the cut-in: IMAGO is on, but not shown yet');
  steps(g, 1);
  ok(J(g, `slowmo`) === J(g, `IM_SLOW`), 'the room is held while it has the screen', J(g, `slowmo`));
  const at = J(g, `[P.x, P.y]`);
  g.run(`__dash = true; P.vx = 300;`); steps(g, 1);
  g.run(`__aim = { x: P.x, y: P.y + 300 };`); steps(g, 20); g.run(`__aim = null;`);
  ok(J(g, `P.dashT <= 0 && Math.hypot(P.x - ${at[0]}, P.y - ${at[1]}) < 0.5`), 'and the hull: no moving, no dashing', J(g, `[P.x - ${at[0]}, P.y - ${at[1]}, P.dashT]`));
  g.run(`hurtPlayer(25);`);
  ok(J(g, `P.hp`) === 60000, 'nothing lands on it');
  g.run(`__press = ['z'];`); steps(g, 2);
  ok(J(g, `P.imSpots.length === 0 && P.imCd[0] === 0`), 'Z does nothing, and spends nothing', J(g, `[P.imSpots.length, P.imCd[0]]`));
  ok(J(g, `P.imT`) === J(g, `IM_LEN`), 'none of the minute is spent', J(g, `P.imT`));
  // the cut, to the step, counting the step F was pressed on
  let k = 25, cutAt = -1;
  while (k < 400 && cutAt < 0) { steps(g, 1, true); k++; if (J(g, `!!(P.imIntro && P.imIntro.cut)`)) cutAt = k; }
  ok(cutAt === Math.round(J(g, `IM_T_CUT`) / STEP), 'the cut lands IM_T_CUT after F, to the step', { step: cutAt, want: Math.round(J(g, `IM_T_CUT`) / STEP) });
  ok(J(g, `imShown() && !imCutIn() && Math.abs(P.imAge - IM_WAKE_FROM - ${STEP}) < 1e-9`), 'from the cut the moth is in the room, still unfolding (its first step there run)', J(g, `P.imAge`));
  steps(g, 30, true);
  ok(J(g, `P.imT < IM_LEN - 0.4`), 'and the minute runs', J(g, `P.imT`));
  ok(J(g, `slowmo`) === 1, 'and the room with it', J(g, `slowmo`));
  steps(g, Math.round(J(g, `IM_T_SETTLE`) / STEP));
  ok(J(g, `P.imIntro`) === null, 'the cut-in is over once the room has settled');
  takeArt(g);
}
{
  // a snapshot in the middle of it: the other copy is in it too, and cuts on the same step
  const a = game(), c = game();
  enter(a, true, 33);
  a.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(a, 90);
  const snap = a.run(`JSON.stringify(snapWrite())`);
  c.run(`applyChar(CHARS.findIndex(ch => ch.id === 'runner')); resetGame(); state = 'play'; snapRead(JSON.parse(${JSON.stringify(snap)}));`);
  ok(J(c, `imCutIn()`) && Math.abs(J(c, `P.imIntro.t`) - J(a, `P.imIntro.t`)) < 1e-9, 'a snapshot taken in the cut-in comes back in it', J(c, `P.imIntro`));
  let ka = -1, kc = -1;
  for (let i = 0; i < 300 && (ka < 0 || kc < 0); i++) {
    steps(a, 1); steps(c, 1);
    if (ka < 0 && J(a, `!!P.imIntro && P.imIntro.cut`)) ka = i;
    if (kc < 0 && J(c, `!!P.imIntro && P.imIntro.cut`)) kc = i;
  }
  ok(ka >= 0 && ka === kc, 'and cuts on the same step', { ka, kc });
}

/* ================================ Z, EYESPOTS ================================ */
section('Z — EYESPOTS');
{
  const g = game();
  enter(g, true);
  g.run(`P.imGraze = IM_MAX; __press = ['f'];`); steps(g, 2);
  throughCut(g);
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
  throughCut(g);
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
  throughCut(g);
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
  throughCut(g);
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

/* ================================ X, FLUTTER ================================ */
section('X — FLUTTER');
/* A quiet room, every step: nobody in it, so the only threats are the ones
   the test sends (the held wave still sends bodies, and they fight back). */
const qsteps = (g, n, draw) => { for (let i = 0; i < n; i++) { g.run(`for (const e of enemies) e.dead = true; enemies.length = 0; spawnT = 1e9;`); steps(g, 1, draw); } };
// into IMAGO, past its cut-in, the room empty
const intoImago = g => { g.run(`P.imGraze = IM_MAX; handleKey('f');`); qsteps(g, 2); throughCut(g, true); };
// the hull's steady speed, flying flat out to the right for a second
const speed = g => { g.run(`__mx = 1;`); qsteps(g, 60); const v = J(g, `Math.hypot(P.vx, P.vy)`); g.run(`__mx = 0;`); qsteps(g, 40); return v; };
{
  const g = game();
  enter(g, true);
  g.run(`handleKey('x');`); qsteps(g, 1);
  ok(J(g, `P.imFlut`) === 0, 'X out of IMAGO is nothing');
  intoImago(g);
  const base = J(g, `P.speed`), v0 = speed(g);
  g.run(`handleKey('x');`); qsteps(g, 1);
  ok(J(g, `P.imFlut > FL_LEN - 0.05 && P.imCd[1] > FL_CD - 0.05`), 'X, from the keyboard: ten seconds of FLUTTER, and its cooldown', J(g, `[P.imFlut, P.imCd[1]]`));
  const v1 = speed(g);
  ok(Math.abs(v0 - base) < base * 0.01 && Math.abs(v1 - 2 * base) < base * 0.02, 'twice as fast while it runs', { base, v0, v1 });

  // a round straight at the hull: seen coming, stepped clear of, and the hull home again
  g.run(`P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2; P.vx = P.vy = 0;`);
  const hp0 = J(g, `P.hp`), x0 = J(g, `[P.x, P.y]`);
  g.run(`(() => { const b = eshoot({ x: P.x - 300, y: P.y, dmg: 30, r: 10, col: '#f87171' }, 0, 600, 30, 6); b.x = P.x - 300; b.y = P.y; b.owner = null; globalThis.__b = b; })()`);
  let began = null, crossOff = null, maxOff = 0;
  for (let i = 0; i < 70; i++) {
    const before = J(g, `{ bx: __b.x, d: !!P.imDodge }`);
    qsteps(g, 1);
    const s = J(g, `{ x: P.x, y: P.y, d: !!P.imDodge, bx: __b.x }`);
    const off = Math.hypot(s.x - x0[0], s.y - x0[1]);
    maxOff = Math.max(maxOff, off);
    if (s.d && began === null) began = x0[0] - s.bx;
    if (crossOff === null && before.bx < x0[0] && s.bx >= x0[0]) crossOff = off;
  }
  const edge = J(g, `__b.r + P.r`);
  ok(began !== null && began > edge, 'the round is seen coming: the dodge begins before it can touch', { began, edge });
  ok(Math.abs(maxOff - J(g, `FL_STEP`)) < 0.5, 'the hull steps aside the whole way', maxOff);
  ok(crossOff !== null && crossOff > edge, 'and is out of its line when it goes by', { crossOff, edge });
  const back = J(g, `[P.x - ${x0[0]}, P.y - ${x0[1]}, !!P.imDodge]`);
  ok(Math.hypot(back[0], back[1]) < 0.5 && !back[2], 'and comes all the way back', back);
  ok(J(g, `P.hp`) === hp0, 'nothing landed', [hp0, J(g, `P.hp`)]);
  ok(J(g, `ebullets.includes(__b) && __b.x > ${x0[0]} + 100`), 'and the round flew on past, unspent');

  // a volley from all round at once, and rounds from everywhere for two seconds: nothing lands, and no dodge is cut short
  const hp1 = J(g, `P.hp`);
  g.run(`globalThis.__cut = 0; globalThis.__dodges = 0; globalThis.__lastD = null;
    for (let k = 0; k < 16; k++) { const a = k * TAU / 16, b = eshoot({ x: P.x + Math.cos(a) * 260, y: P.y + Math.sin(a) * 260, dmg: 20, r: 1, col: '#f87171' }, a + Math.PI, 420, 20, 6); b.x = P.x + Math.cos(a) * 260; b.y = P.y + Math.sin(a) * 260; b.owner = null; }`);
  for (let i = 0; i < 120; i++) {
    if (i % 10 === 5) g.run(`(() => { const a = simRnd(TAU), b = eshoot({ x: P.x + Math.cos(a) * 240, y: P.y + Math.sin(a) * 240, dmg: 20, r: 1, col: '#f87171' }, a + Math.PI, 500, 20, 6); b.x = P.x + Math.cos(a) * 240; b.y = P.y + Math.sin(a) * 240; b.owner = null; })()`);
    g.run(`(() => { const d = P.imDodge; if (d !== __lastD) { if (__lastD && __lastD.t < FL_DODGE - 1e-9) __cut++; if (d) __dodges++; __lastD = d; } })()`);
    qsteps(g, 1);
  }
  ok(J(g, `P.hp`) === hp1, 'a volley from every side, and two seconds of rounds: nothing lands', [hp1, J(g, `P.hp`)]);
  ok(J(g, `__dodges`) >= 3 && J(g, `__cut`) === 0, 'each dodge played out whole, never cut short', J(g, `[__dodges, __cut]`));

  // a blow that is not a round: dodged, across the line from whoever threw it; the floor still lands
  g.run(`ebullets.length = 0;`); qsteps(g, 30);           // the room clear, and the last dodge home
  ok(J(g, `!P.imDodge`), 'and with nothing coming, it is still');
  g.run(`hurtPlayer(50, { src: { x: P.x + 20, y: P.y } });`);
  ok(J(g, `P.hp`) === hp1 && J(g, `!!P.imDodge && Math.abs(P.imDodge.sx) < 1e-9`), 'a blow from a body is dodged, stepping across its line', J(g, `[P.hp, P.imDodge && P.imDodge.sx]`));
  g.run(`hurtPlayer(7, { pure: true });`);
  ok(J(g, `P.hp`) === hp1 - 7, 'the floor and the build\'s own costs are nothing to dodge', J(g, `P.hp`));
  qsteps(g, 30);

  // against the top wall, a round along it: the step is away from the wall, and the hull stays in the room
  g.run(`P.x = (arena.x0 + arena.x1) / 2; P.y = arena.y0 + P.r + 2; P.vx = P.vy = 0; ebullets.length = 0;
    (() => { const b = eshoot({ x: P.x - 300, y: P.y, dmg: 30, r: 10, col: '#f87171' }, 0, 600, 30, 6); b.x = P.x - 300; b.y = P.y; b.owner = null; })()`);
  let sy = null, inside = true;
  for (let i = 0; i < 40; i++) { qsteps(g, 1); const s = J(g, `{ sy: P.imDodge ? P.imDodge.sy : null, y: P.y, ok: P.y >= arena.y0 + P.r - 1e-9 }`); if (sy === null && s.sy !== null) sy = s.sy; inside = inside && s.ok; }
  ok(sy !== null && sy > 0.99 && inside, 'off a wall, it steps the other way, into the room', { sy, inside });

  // the ten seconds end: a round lands again, and the hull is its own speed
  g.run(`ebullets.length = 0; P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2;`);
  qsteps(g, Math.round(J(g, `P.imFlut`) / STEP) + 2);
  ok(J(g, `P.imFlut === 0 && P.imT > 0`), 'ten seconds, and it is over (IMAGO still on)', J(g, `[P.imFlut, P.imT]`));
  const hp2 = J(g, `P.hp`);
  round(g, 0, 500); qsteps(g, 50);
  ok(J(g, `P.hp`) < hp2, 'a round lands again');
  const v2 = speed(g);
  ok(Math.abs(v2 - base) < base * 0.01, 'and the hull flies at its own speed', { base, v2 });
}
{
  // IMAGO ending under it ends it
  const g = game();
  enter(g, true); intoImago(g);
  g.run(`handleKey('x');`); qsteps(g, 2);
  g.run(`P.imT = 0.05;`); qsteps(g, 6);
  ok(J(g, `!imOn() && P.imFlut === 0`), 'IMAGO ending takes FLUTTER with it', J(g, `[P.imT, P.imFlut]`));
  const hp = J(g, `P.hp`);
  round(g, 0, 500); qsteps(g, 50);
  ok(J(g, `P.hp`) < hp, 'and rounds land on the ship again');
}
{
  // a snapshot taken mid-dodge: the other copy plays the rest of it the same
  const a = game(), c = game();
  enter(a, true, 23); intoImago(a);
  a.run(`handleKey('x');`); qsteps(a, 2);
  a.run(`(() => { const b = eshoot({ x: P.x - 300, y: P.y, dmg: 30, r: 10, col: '#f87171' }, 0, 600, 30, 6); b.x = P.x - 300; b.y = P.y; b.owner = null; })()`);
  let k = 0; while (!J(a, `!!P.imDodge && P.imDodge.t > 0.08`) && k++ < 80) qsteps(a, 1);
  const snap = a.run(`JSON.stringify(snapWrite())`);
  c.run(`applyChar(CHARS.findIndex(ch => ch.id === 'runner')); resetGame(); state = 'play'; snapRead(JSON.parse(${JSON.stringify(snap)}));`);
  ok(J(c, `!!P.imDodge && P.imFlut > 0`), 'a dodge and FLUTTER come back in another copy', J(c, `[!!P.imDodge, P.imFlut]`));
  qsteps(a, 40); qsteps(c, 40);
  const pa = J(a, `[P.x, P.y, P.hp, P.imFlut, !!P.imDodge]`), pc = J(c, `[P.x, P.y, P.hp, P.imFlut, !!P.imDodge]`);
  ok(JSON.stringify(pa) === JSON.stringify(pc), 'and the rest of it plays the same there', { pa, pc });
}

/* ================================ C, THE ARMORY ================================ */
section('C — THE ARMORY');
// a body that stands where it is put and soaks, at (dx, dy) from the hull
const bodyAt = (g, dx, dy) => g.run(`(() => { const e = spawnEnemy('grunt', P.x + ${dx}, P.y + ${dy}, { elite: false });
  e.maxHp = e.hp = 1e7; e.spd = 0; e.dmg = 0; e.atkT = 1e9; e.cd = 1e9; e.__mine = 1; return e.id; })()`);
// a quiet room, but for the bodies the test put there
const asteps = (g, n) => { for (let i = 0; i < n; i++) { g.run(`spawnT = 1e9; enemies.splice(0, enemies.length, ...enemies.filter(e => e.__mine && !e.dead)); for (const e of enemies) { e.vx = e.vy = 0; } ebullets.length = 0;`); steps(g, 1); } };
// aim at wedge k of the wheel (from the top, clockwise)
const aimWedge = (g, k) => g.run(`(() => { const a = -Math.PI / 2 + ${k} * TAU / ARMORY.length; __aim = { x: P.x + Math.cos(a) * 200, y: P.y + Math.sin(a) * 200 }; })()`);
// damage dealt to bodies set out ahead (on the aim, on its line further on, and off to the side) over two seconds of firing
const volley = g => {
  g.run(`enemies.splice(0, enemies.length); __aim = { x: P.x + 300, y: P.y };`);
  const ids = [bodyAt(g, 200, 0), bodyAt(g, 330, 0), bodyAt(g, 200, 60)];
  const h0 = ids.map(id => hpOf(g, id));
  g.run(`__trig = true;`); asteps(g, 120); g.run(`__trig = false;`); asteps(g, 220);
  return ids.map((id, k) => Math.round(h0[k] - hpOf(g, id)));
};
{
  const g = game();
  enter(g, true);
  g.run(`handleKey('c');`); asteps(g, 2);
  ok(J(g, `!P.imArmMenu`), 'C out of IMAGO opens nothing');
  g.run(`P.imGraze = IM_MAX; handleKey('f');`); asteps(g, 2); throughCut(g, true);
  const base = volley(g);
  ok(base[0] > 0, 'the hull\'s own gun, for the measure', base);

  // the wheel
  g.run(`__aim = { x: P.x + 300, y: P.y }; handleKey('c');`); asteps(g, 2);
  ok(J(g, `imArmOpen()`), 'C opens the armory, from the keyboard');
  ok(J(g, `slowmo`) <= J(g, `ARM_SLOW`) + 1e-9, 'the room slows while it is open', J(g, `slowmo`));
  const p0 = J(g, `[P.x, P.y]`), b0 = J(g, `bullets.length`);
  g.run(`__mx = 1; __auto = true;`); asteps(g, 30); g.run(`__mx = 0; __auto = false;`);
  const p1 = J(g, `[P.x, P.y]`);
  ok(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) < 0.5 && J(g, `bullets.length`) === b0, 'and the hull holds still, and does not fire', { moved: Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), b0, b1: J(g, `bullets.length`) });
  const hovers = [];
  for (let k = 0; k < 8; k++) { aimWedge(g, k); asteps(g, 1); hovers.push(J(g, `P.imArmMenu.hover`)); }
  ok(hovers.join() === '0,1,2,3,4,5,6,7', 'the aim picks the gun it points at, round the wheel', hovers);
  g.run(`__aim = { x: P.x + 10, y: P.y };`); asteps(g, 1);
  ok(J(g, `P.imArmMenu.hover`) === -1, 'aimed at the hull, nothing is picked');
  g.run(`__press = ['z'];`); asteps(g, 1);
  g.run(`__press = ['x'];`); asteps(g, 1);
  ok(J(g, `P.imSpots.length === 0 && P.imFlut === 0`), 'Z and X wait while it is open');
  g.run(`handleKey('c');`); asteps(g, 1);
  ok(J(g, `!P.imArmMenu && !P.imArm`), 'and C there shuts it, as it was');

  // a click held as it opens does not pick; a fresh one does
  g.run(`__trig = true;`); asteps(g, 1);
  aimWedge(g, 1); g.run(`handleKey('c');`); asteps(g, 4);
  ok(J(g, `imArmOpen() && !P.imArm`), 'a click held as it opens picks nothing');
  g.run(`__trig = false;`); asteps(g, 1); g.run(`__trig = true;`); asteps(g, 1); g.run(`__trig = false;`);
  ok(J(g, `!P.imArmMenu && P.imArm === 'rail'`), 'a fresh click wears the gun it points at', J(g, `P.imArm`));

  // every gun, worn by C, out-hits the hull's own, its own way
  const got = {};
  for (let k = 0; k < 8; k++) {
    g.run(`__trig = false; handleKey('c');`); asteps(g, 1); aimWedge(g, k); asteps(g, 1); g.run(`handleKey('c');`); asteps(g, 1);
    const id = J(g, `P.imArm`);
    got[id] = volley(g);
  }
  const ids = J(g, `ARMORY.map(a => a.id)`);
  ok(ids.every(id => got[id]), 'C wears each of the eight', Object.keys(got));
  ok(ids.every(id => got[id] && got[id][0] >= 4 * base[0]), 'every one out-hits the hull\'s own at least fourfold', { base: base[0], got });
  ok(got.rail[1] > 0 && got.lance[1] > 0 && got.minigun[1] > 0, 'the rail, the lance and the minigun go through to the body behind', { rail: got.rail, lance: got.lance, minigun: got.minigun });
  ok(got.tesla.every(d => d > 0), 'the lightning jumps to every body in reach', got.tesla);
  ok(got.howitzer.every(d => d > 0), 'the howitzer\'s blast takes all three', got.howitzer);
  ok(got.swarm[2] > 0 && got.flak[2] > 0, 'the missiles and the flak reach off the line', { swarm: got.swarm, flak: got.flak });
  ok(got.hole.every(d => d > 0), 'the singularity takes all three', got.hole);

  // the singularity drags bodies in
  g.run(`enemies.splice(0, enemies.length); P.imArm = 'hole'; P.imArmT = 0; P.imArmShots.length = 0; __aim = { x: P.x + 300, y: P.y };`);
  const far = bodyAt(g, 420, 140);
  g.run(`__trig = true;`); asteps(g, 1); g.run(`__trig = false;`); asteps(g, 100);
  const pulled = J(g, `(() => { const o = P.imArmShots[0], e = enemies.find(q => q.id === ${far}); return o && e ? [Math.round(Math.hypot(e.x - o.x, e.y - o.y)), Math.round(Math.hypot(P.x + 420 - o.x, P.y + 140 - o.y))] : null; })()`);
  ok(pulled && pulled[0] < pulled[1] - 40, 'the singularity drags a body in toward it', pulled);
  asteps(g, 200);
  ok(J(g, `P.imArmShots.length`) === 0, 'and closes');
  // a boss is too heavy to move
  const bossMoves = J(g, `(() => { enemies.splice(0, enemies.length); const e = spawnEnemy('boss', P.x + 260, P.y + 80, { boss: 'warden' }); e.__mine = 1; e.spd = 0; e.atkT = 1e9; e.hp = e.maxHp = 1e8;
    P.imArmShots.push({ id: 'hole', x: P.x + 260, y: P.y - 60, vx: 0, vy: 0, t: 2, dmg: 0, bdmg: 0, dps: 1, burst: 1, held: 0 });
    const x0 = e.x, y0 = e.y; for (let i = 0; i < 20; i++) imArmShotTick(1 / 60); return Math.hypot(e.x - x0, e.y - y0); })()`);
  ok(bossMoves < 1e-9, 'a boss is too heavy for it to drag', bossMoves);
  g.run(`P.imArmShots.length = 0; enemies.splice(0, enemies.length);`);

  // the gun goes with the form; what is in the air finishes
  g.run(`P.imArm = 'swarm'; P.imArmT = 0; __aim = { x: P.x + 300, y: P.y };`);
  const tgt = bodyAt(g, 300, 0), th = hpOf(g, tgt);
  g.run(`__trig = true;`); asteps(g, 1); g.run(`__trig = false; P.imT = 0.02;`); asteps(g, 4);
  ok(J(g, `!imOn() && !P.imArm && P.imArmShots.length > 0`), 'IMAGO ends: the gun goes, the missiles are still in the air', J(g, `[P.imT, P.imArm, P.imArmShots.length]`));
  asteps(g, 120);
  ok(hpOf(g, tgt) < th && J(g, `P.imArmShots.length`) === 0, 'and they finish what they were doing', [th, hpOf(g, tgt)]);
  const b2 = J(g, `bullets.length`);
  g.run(`__trig = true;`); asteps(g, 10); g.run(`__trig = false;`);
  ok(J(g, `bullets.length`) > b2, 'and the hull\'s own gun is back');
}
{
  // a snapshot with missiles, a shell and a singularity in the air: the other copy plays them out the same
  const a = game(), c = game();
  enter(a, true, 29);
  a.run(`P.imGraze = IM_MAX; handleKey('f');`); asteps(a, 2); throughCut(a, true);
  const ids = [bodyAt(a, 220, 0), bodyAt(a, 300, 90), bodyAt(a, 360, -70)];
  a.run(`__aim = { x: P.x + 300, y: P.y };`);
  for (const id of ['swarm', 'howitzer', 'hole']) { a.run(`P.imArm = '${id}'; P.imArmT = 0; __trig = true;`); asteps(a, 1); a.run(`__trig = false;`); }
  asteps(a, 8);
  const n = J(a, `P.imArmShots.length`);
  const snap = a.run(`JSON.stringify(snapWrite())`);
  c.run(`applyChar(CHARS.findIndex(ch => ch.id === 'runner')); resetGame(); state = 'play'; snapRead(JSON.parse(${JSON.stringify(snap)}));`);
  ok(n > 3 && J(c, `P.imArmShots.length`) === n && J(c, `P.imArm`) === 'hole', 'the armory\'s shots, and the gun worn, come back in another copy', [n, J(c, `P.imArmShots.length`), J(c, `P.imArm`)]);
  asteps(a, 260); asteps(c, 260);
  const hpA = ids.map(id => hpOf(a, id)), hpC = ids.map(id => hpOf(c, id));
  ok(JSON.stringify(hpA) === JSON.stringify(hpC) && hpA.some((h, k) => h < 1e7), 'and play out the same there', { hpA, hpC });
}

/* ============================== V — ENDLESS FORMS ============================== */
section('V — ENDLESS FORMS');
{
  const g = game();
  enter(g, true);
  g.run(`handleKey('v');`); asteps(g, 2);
  ok(J(g, `!P.imEvo`), 'V out of IMAGO grows nothing');
  g.run(`P.imGraze = IM_MAX; handleKey('f');`); asteps(g, 2); throughCut(g, true);
  const base = volley(g);
  ok(base[0] > 0 && base[1] === 0, 'the hull\'s own gun, for the measure', base);

  // V: the molt, IMAGO's clock raised to cover it
  g.run(`P.imT = 10; handleKey('v');`); asteps(g, 1);
  ok(J(g, `!!P.imEvo && P.imEvo.molt > 0 && P.imEvo.n === 0`), 'V, from the keyboard: the moth molts', J(g, `P.imEvo`));
  ok(J(g, `P.imT`) >= J(g, `EVO_LEN`) - 0.1, 'and IMAGO\'s clock is raised to cover it', J(g, `P.imT`));
  const hp0 = J(g, `P.hp`), b0 = J(g, `bullets.length`);
  g.run(`hurtPlayer(40); __trig = true;`); asteps(g, 10); g.run(`__trig = false;`);
  ok(J(g, `P.hp`) === hp0, 'nothing lands on it while it molts', [hp0, J(g, `P.hp`)]);
  ok(J(g, `bullets.length === ${b0} && P.imEvoShots.length === 0`), 'and its guns are silent', J(g, `[bullets.length, P.imEvoShots.length]`));
  const pm = J(g, `[P.x, P.y]`);
  g.run(`__mx = 1;`); asteps(g, 10); g.run(`__mx = 0;`);
  ok(J(g, `P.x`) > pm[0] + 20, 'but it still flies', [pm, J(g, `[P.x, P.y]`)]);
  asteps(g, Math.round(J(g, `EVO_MOLT`) / STEP));
  ok(J(g, `P.imEvo.molt === 0 && P.imEvo.n === 1 && P.imEvo.grow[0].i === 0`), 'out of the molt, with its first growth: TWIN BARRELS', J(g, `P.imEvo`));
  g.run(`P.imT = 60;`);

  // PROGRESS: time, kills, grazes
  let guard = 0;
  while (J(g, `P.imEvo.n`) < 2 && guard++ < 2000) asteps(g, 10);
  const took = J(g, `P.imEvo.grow[1].at - P.imEvo.grow[0].at`);
  ok(Math.abs(took - J(g, `EVO_NEED / EVO_TIME`)) < 0.2, 'time alone grows the next: EVO_NEED at EVO_TIME a second', { took, want: J(g, `EVO_NEED / EVO_TIME`) });
  let p0 = J(g, `P.imEvo.p`);
  g.run(`P.kills += 3;`); asteps(g, 1);
  ok(Math.abs(J(g, `P.imEvo.p`) - p0 - 3 * J(g, `EVO_KILL`) - J(g, `EVO_TIME`) * STEP) < 1e-6, 'a kill is EVO_KILL', [p0, J(g, `P.imEvo.p`)]);
  p0 = J(g, `P.imEvo.p`);
  round(g, 30); steps(g, 50);
  const paid = J(g, `P.imEvo.p`) - p0 - J(g, `EVO_TIME`) * 50 * STEP;
  ok(Math.abs(paid - J(g, `EVO_GRAZE`)) < 1e-6 && J(g, `P.imGraze`) === 0, 'a graze is PROGRESS now, not GRAZE', { paid, graze: J(g, `P.imGraze`) });

  // the rite's eight, in the rite's order, each fill needing more; then OVERGROWTH
  const needs = [];
  for (let k = 0; k < 8; k++) { needs.push(J(g, `imEvoNeed(P.imEvo)`)); g.run(`P.imEvo.p = imEvoNeed(P.imEvo);`); asteps(g, 1); }
  ok(J(g, `P.imEvo.grow.map(q => EVO_GROWTHS[q.i].id).join()`) === J(g, `OPR_GROWTHS.map(q => q.id).join()`) && J(g, `P.imEvo.n`) === 8,
     'it grows the rite\'s eight, in the rite\'s order', J(g, `P.imEvo.grow.map(q => q.i)`));
  ok(needs.every((n, k) => !k || Math.abs(n - needs[k - 1] - J(g, `EVO_STEP`)) < 1e-9), 'each fill needs EVO_STEP more than the last', needs);
  ok(J(g, `P.imEvo.lvl`) === 2 && Math.abs(J(g, `imEvoMul()`) - (1 + 2 * J(g, `EVO_OVER`))) < 1e-9, 'and past the eighth it keeps going: OVERGROWTH', J(g, `[P.imEvo.n, P.imEvo.lvl]`));
  g.run(`P.imEvo.lvl = 0; P.imEvo.p = 0; for (const q of P.imEvo.grow) q.at = -9;`);

  // they fire while you do, and only then (each volley from the same point in the growths' clocks)
  asteps(g, 60);
  ok(J(g, `P.imEvoShots.length`) === 0, 'with the trigger up, the growths are still');
  const clocks = `for (const q of P.imEvo.grow) q.fireT = 0.15;`;
  g.run(clocks);
  const evo = volley(g);
  const tot = a => a.reduce((x, y) => x + y, 0);
  ok(tot(evo) >= 8 * tot(base), 'with it held, all eight out-hit the hull\'s own many times over', { base, evo });
  ok(evo[1] > 0, 'through to the body behind on the line (the rifles, the cannon, the rail)', evo);
  g.run(`enemies.splice(0, enemies.length); __aim = { x: P.x + 300, y: P.y };` + clocks);
  const front = bodyAt(g, 200, 0), behind = bodyAt(g, -150, 0);
  g.run(`__trig = true;`); asteps(g, 120); g.run(`__trig = false;`); asteps(g, 220);
  ok(hpOf(g, behind) < 1e7 && hpOf(g, front) < 1e7, 'and off it: behind the hull too (the missiles turn on it, the crown is all round)', [1e7 - hpOf(g, front), 1e7 - hpOf(g, behind)]);
  g.run(`P.imEvo.lvl = 2;` + clocks);
  const over = volley(g);
  const ratio = tot(over) / tot(evo);
  ok(Math.abs(ratio - (1 + 2 * J(g, `EVO_OVER`))) < 0.15, 'OVERGROWTH makes every growth hit harder', { ratio, evo, over });
  g.run(`P.imEvo.lvl = 0;`);

  // the rest of the kit still answers; V again does nothing
  g.run(`P.imCd[0] = 0; __press = ['z'];`); asteps(g, 1);
  ok(J(g, `P.imSpots.length`) > 0, 'Z still answers while it evolves');
  const n0 = J(g, `[P.imEvo.n, P.imEvo.t]`);
  g.run(`handleKey('v');`); asteps(g, 1);
  ok(J(g, `P.imEvo.n === ${n0[0]} && P.imEvo.molt === 0`), 'and V again is nothing: once a form', J(g, `P.imEvo`));

  // IMAGO ends: the growths are shed, their shots in the air finish
  g.run(`enemies.splice(0, enemies.length); __aim = { x: P.x + 300, y: P.y };`);
  const far = bodyAt(g, 420, 0), fh = hpOf(g, far);
  g.run(`__trig = true;`); asteps(g, 6); g.run(`__trig = false; P.imT = 0.02;`); asteps(g, 3);
  ok(J(g, `!imOn() && !P.imEvo && P.imEvoShots.length > 0`), 'IMAGO ends: the growths are shed, their shots still in the air', J(g, `[P.imT, !!P.imEvo, P.imEvoShots.length]`));
  asteps(g, 150);
  ok(hpOf(g, far) < fh && J(g, `P.imEvoShots.length`) === 0, 'and they finish what they were doing', [fh, hpOf(g, far)]);

  // a new IMAGO, a new V, from the start
  g.run(`P.imGraze = IM_MAX; handleKey('f');`); asteps(g, 2); throughCut(g, true);
  g.run(`handleKey('v');`); asteps(g, 1);
  ok(J(g, `!!P.imEvo && P.imEvo.n === 0 && P.imEvo.molt > 0`), 'the next IMAGO, V evolves again, from the start', J(g, `P.imEvo`));
}
{
  // a snapshot with its growths out and their shots in the air: the other copy plays them out the same
  const a = game(), c = game();
  enter(a, true, 31);
  a.run(`P.imGraze = IM_MAX; handleKey('f');`); asteps(a, 2); throughCut(a, true);
  a.run(`handleKey('v');`); asteps(a, Math.round(J(a, `EVO_MOLT`) / STEP) + 2);
  for (let k = 0; k < 7; k++) { a.run(`P.imEvo.p = imEvoNeed(P.imEvo);`); asteps(a, 1); }
  const ids = [bodyAt(a, 220, 0), bodyAt(a, 320, 0), bodyAt(a, -150, 0)];
  a.run(`__aim = { x: P.x + 300, y: P.y }; __trig = true;`); asteps(a, 40); a.run(`__trig = false;`);
  const n = J(a, `P.imEvoShots.length`);
  const snap = a.run(`JSON.stringify(snapWrite())`);
  c.run(`applyChar(CHARS.findIndex(ch => ch.id === 'runner')); resetGame(); state = 'play'; snapRead(JSON.parse(${JSON.stringify(snap)}));`);
  ok(n > 3 && J(c, `P.imEvoShots.length`) === n && J(c, `P.imEvo.n`) === 8, 'its growths, and their shots, come back in another copy', [n, J(c, `P.imEvoShots.length`), J(c, `P.imEvo && P.imEvo.n`)]);
  a.run(`__trig = true;`); c.run(`__trig = true;`);
  asteps(a, 120); asteps(c, 120);
  const hpA = ids.map(id => hpOf(a, id)), hpC = ids.map(id => hpOf(c, id));
  ok(JSON.stringify(hpA) === JSON.stringify(hpC) && hpA.every(h => h < 1e7), 'and fire and play out the same there', { hpA, hpC });
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
  g.run(`__press = ['x'];`); steps(g, 2);
  ok(J(g, `P.imFlut`) === 0, 'nor X');
  g.run(`__press = ['c'];`); steps(g, 2);
  ok(J(g, `!P.imArmMenu && !P.imArm`), 'nor C');
  g.run(`__press = ['v'];`); steps(g, 2);
  ok(J(g, `!P.imEvo`), 'nor V');
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
  throughCut(a);
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
    throughCut(g, false, true);
    dummy(g, 70, 0); dummy(g, 180, 0.4);
    g.run(`__press = ['z'];`);
    for (let i = 0; i < 160; i++) { g.run(HOLD); steps(g, 1); if (i % 3 === 0) g.run(`render()`); }
    // X: FLUTTER, a round dodged, its image left behind
    g.run(`__press = ['x'];`); steps(g, 2, true);
    round(g, 0, 600); steps(g, 40, true);
    g.run(`__mx = 1;`); steps(g, 20, true); g.run(`__mx = 0;`);
    g.run(`P.imFlut = 0.02;`); steps(g, 6, true);
    // C: the wheel open, then each kind of gun worn and fired, drawn as it goes
    g.run(`ebullets.length = 0; P.imCd[2] = 0; __press = ['c'];`); steps(g, 3, true);
    for (const id of ['swarm', 'lance', 'rail', 'tesla', 'howitzer', 'hole']) {
      g.run(`P.imArmMenu = null; P.imArm = '${id}'; P.imArmT = 0; __auto = true;`);
      for (let i = 0; i < 40; i++) { g.run(HOLD); steps(g, 1); if (i % 2 === 0) g.run(`render()`); }
    }
    g.run(`__auto = false;`);
    for (let i = 0; i < 200; i++) { g.run(HOLD); steps(g, 1); if (i % 4 === 0) g.run(`render()`); }
    // V: the molt, then growth after growth, firing, then OVERGROWTH
    g.run(`P.imArm = null; __press = ['v'];`);
    for (let i = 0; i < 60; i++) { g.run(HOLD); steps(g, 1); if (i % 3 === 0) g.run(`render()`); }
    g.run(`__auto = true;`);
    for (let k = 0; k < 9; k++) {
      g.run(`P.imEvo.p = imEvoNeed(P.imEvo);`);
      for (let i = 0; i < 30; i++) { g.run(HOLD); steps(g, 1); if (i % 3 === 0) g.run(`render()`); }
    }
    g.run(`__auto = false;`);
    round(g, 30); steps(g, 40, true);
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
