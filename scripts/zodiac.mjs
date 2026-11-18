#!/usr/bin/env node
/* ===========================================================================
   THE PLANETARIUM — its test: `npm run test:zodiac` (PLANETARIUM-PLAN.md)

   The game in Node (scripts/lib/game-vm.mjs), no browser. Each part sets up
   a run, gives what it is testing, and checks the thing it says it does:

     READING     three signs rise, distinct; a held sign comes back at its next
                 magnitude; the keys take, turn retrograde, turn the dome and
                 leave; a shadow is carried, and lifts as the next reward room
                 opens; BAD READING's never does
     SIGNS       each of the twelve, at the magnitude that adds the thing
     SHADOWS     each of the twelve
     TRINES      all four
     EVERY HULL  every sign at III, and every shadow, on the gun, the lance and
                 the blade, played and drawn, with nothing thrown
     IN STEP     the same run with every sign, played twice, is the same run
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

function game() {
  const g = loadGame(IDX, { w: 1280, h: 720 });
  g.run(`pageDead = true; Save.profile.name = 'PILOT'; Save.profile.gfxSeen = GFX_VER; state = 'menu';
    globalThis.__trig = false; globalThis.__dash = false; globalThis.__mv = [0, 0]; globalThis.__aim = null;
    inputSource = rec => { rec.mx = __mv[0]; rec.my = __mv[1]; rec.trig = __trig; rec.lmb = __trig; rec.auto = false;
      rec.dash = __dash; __dash = false; rec.touch = false; rec.taim = null; rec.local = false;
      rec.press = inputQueue.splice(0); rec.held = '';
      const a = __aim || { x: P.x + 300, y: P.y }; rec.ax = a.x; rec.ay = a.y; };`);
  return g;
}
// a run on that pilot, the room emptied and the clock held so nothing comes unless asked
function enter(g, pilot = 'runner', seed = 7) {
  g.run(`runCharNext = CHARS.findIndex(c => c.id === '${pilot}'); runSeedNext = ${seed}; resetGame(); state = 'play';
    enemies.length = 0; ebullets.length = 0; bullets.length = 0; hazards.length = 0; spawnBudget = 0; spawnT = 1e9;
    betweenWaves = 0; bossAlive = true; P.maxHp = P.hp = 400; credits = 0;
    P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2; __aim = null; __trig = false; __mv = [0, 0];`);
}
const steps = (g, n) => g.run(`for (let i = 0; i < ${n}; i++) { if (state !== 'play') state = 'play'; update(${STEP}); }`);
// a body that stands still and does nothing, at an offset from the pilot
const dummy = (g, dx, dy, hp = 1e6, type = 'grunt') => g.run(`(() => { const e = spawnEnemy('${type}', P.x + ${dx}, P.y + ${dy}, { elite: false });
  e.maxHp = e.hp = ${hp}; e.spd = 0; e.dmg = 0; e.atkT = 1e9; e.cd = 1e9; e.armor = 0; e.dr = 0; return e.id; })()`);
const hp = (g, id) => J(g, `(enemies.find(e => e.id === ${id}) || { hp: -1 }).hp`);
// an enemy round, set loose at an offset, flying at the pilot
const round = (g, dx, dy, spd = 200) => g.run(`(() => { const x = P.x + ${dx}, y = P.y + ${dy}, a = Math.atan2(P.y - y, P.x - x);
  const b = { x, y, vx: Math.cos(a) * ${spd}, vy: Math.sin(a) * ${spd}, r: 6, dmg: 5, life: 9, col: '#fff', spin: 0 };
  ebullets.push(b); return ebullets.length - 1; })()`);

/* ------------------------------------------------------------------------- */
console.log('THE PLANETARIUM');
console.log('· READING');
{
  const g = game();
  enter(g);
  g.run(`openPlanetarium(); uiArm = 0;`);
  const r = J(g, `P.zRead`);
  ok(J(g, `state`) === 'planet' && r.offers.length === 3, 'three signs rise', r);
  ok(new Set(r.offers.map(o => o.id)).size === 3 && r.offers.every(o => o.mag === 1), 'three different signs, each new at I', r.offers);
  const id = r.offers[1].id;
  g.run(`handleKey('2')`);
  ok(J(g, `zm('${id}')`) === 1 && J(g, `P.zRead.done`), '2 takes the second, at I', id);
  ok(!J(g, `P.zShadow`), 'and no shadow comes with a sign read as it is');
  g.run(`handleKey('enter')`);
  ok(J(g, `state`) === 'play' && J(g, `P.zRead`) === null, 'ENTER leaves the dome once it is read');

  g.run(`openPlanetarium(); uiArm = 0;`);
  const r2 = J(g, `P.zRead`);
  ok(r2.offers.some(o => o.id === id && o.mag === 2), 'a held sign comes back, at its next magnitude', r2.offers);
  g.run(`handleKey('enter')`);
  ok(J(g, `state`) === 'planet', 'ENTER does not walk out of a reading still to take');
  g.run(`credits = 100; handleKey('t')`);
  ok(J(g, `credits`) === 70 && J(g, `P.zRead.turns`) === 1, 'T turns the dome for 30 credits');
  g.run(`handleKey('t')`);
  ok(J(g, `credits`) === 15, 'and 25 more the next time');
  g.run(`credits = 0; handleKey('t')`);
  ok(J(g, `P.zRead.turns`) === 2, 'with nothing to pay, the dome does not turn');
  g.run(`handleKey('r')`);
  ok(J(g, `P.zRead.retro`), 'R turns the plates to retrograde');
  const o = J(g, `P.zRead.offers[0]`);
  g.run(`handleKey('1')`);
  ok(J(g, `zm('${o.id}')`) === Math.min(3, o.mag + 1), 'a sign read retrograde arrives a magnitude higher', o);
  ok(o.mag >= 3 ? !J(g, `P.zShadow`) : J(g, `P.zShadow`) === o.id, 'carrying its own shadow (none, when it could go no higher)', J(g, `P.zShadow`));
  g.run(`leavePlanetarium(); state = 'play'; if (!P.zShadow) zShadowOn('${o.id}');`);
  g.run(`RUN.planetarium = false; openReward(); state = 'play';`);
  ok(!J(g, `P.zShadow`), 'the shadow lifts as the next reward room opens: the sky turns');
  g.run(`openPlanetarium(); uiArm = 0; handleKey('escape');`);
  ok(J(g, `state`) === 'play', 'ESC walks away from a reading');

  // BAD READING: at the door, retrograde, and it never lifts
  enter(g);
  g.run(`chalApplyShip({ sign: 'scorpio', signMag: 2, signRetro: 1 });`);
  ok(J(g, `zm('scorpio')`) === 2 && J(g, `P.zShadow`) === 'scorpio', 'BAD READING: Scorpio II at the door, its shadow carried');
  g.run(`RUN.planetarium = false; openReward(); state = 'play';`);
  ok(J(g, `P.zShadow`) === 'scorpio', 'and the sky does not turn for it');

  // all twelve at III: nothing left to read
  enter(g);
  g.run(`for (const s of SIGNS) zGive(s.id, 3); openPlanetarium();`);
  ok(J(g, `P.zRead.offers.length`) === 0, 'with every sign ascendant the sky has nothing left to offer');
  g.run(`render()`);
}

console.log('· SIGNS');
{
  const g = game();
  // ARIES
  enter(g);
  g.run(`zGive('aries', 1)`);
  ok(J(g, `P.dashMax`) === 3, 'ARIES I: +2 dash charges');
  const a = dummy(g, 80, 0, 1e6);
  g.run(`__mv = [1, 0]; __dash = true;`); steps(g, 3);
  ok(J(g, `P.iframe`) > 0.2, 'ARIES I: untouchable while dashing');
  steps(g, 20);
  ok(hp(g, a) < 1e6 - 40, 'ARIES I: the dash gores', hp(g, a));
  ok(J(g, `enemies.find(e => e.id === ${a}).stagger`) > 0, 'ARIES I: and stuns');
  enter(g);
  g.run(`zGive('aries', 3)`);
  const a2 = dummy(g, 300, 0, 1e6), a3 = dummy(g, 220, 160, 1e6);
  g.run(`__mv = [1, 0]; __dash = true;`); steps(g, 40);
  ok(hp(g, a3) < 1e6, 'ARIES III: the dash ends in a blast', hp(g, a3));

  // TAURUS
  enter(g);
  g.run(`credits = 500;`);
  const d0 = J(g, `zDmgMul({ x: 0, y: 0, r: 1 })`);
  const p0 = J(g, `makeShopStock().filter(i => i.kind === 'up').map(i => PRICE[i.rar] ? i.cost / PRICE[i.rar] : 0)`);
  g.run(`zGive('taurus', 1)`);
  ok(J(g, `zDmgMul({ x: 0, y: 0, r: 1 })`) / d0 > 1.49, 'TAURUS I: 500 credits carried is +50% damage');
  ok(J(g, `zArmorAdd()`) === 5, 'TAURUS I: and +5 armour');
  ok(J(g, `zShopMul()`) === 0.6, 'TAURUS I: shops charge 40% less', p0);
  g.run(`zGive('taurus', 2)`);
  ok(J(g, `makeShopStock().length`) === 6 && J(g, `makeShopStock().some(i => i.rar === 'legend')`), 'TAURUS II: a legendary on the counter, and it still holds six');
  g.run(`credits = 1000; zWave(false)`);
  ok(J(g, `credits`) === 1100, 'TAURUS II: a wave pays 10% interest');
  g.run(`zGive('taurus', 3); credits = 2000; P.iframe = 0; hurtPlayer(99999);`);
  ok(J(g, `P.hp`) === J(g, `P.maxHp`) && J(g, `credits`) < 2000 && J(g, `state`) === 'play', 'TAURUS III: a killing blow is paid in credits, healed to full');

  // GEMINI
  enter(g);
  g.run(`zGive('gemini', 1); P.parallel = 1; P.back = 1;`);
  dummy(g, 400, 0); dummy(g, -400, 0);
  g.run(`__trig = true;`); steps(g, 2);
  ok(J(g, `bullets.filter(b => !b.mine).length`) >= 3, 'GEMINI I: the twin fires the whole volley (barrels and Backdraft)', J(g, `bullets.filter(b => !b.mine).length`));
  g.run(`zGive('gemini', 3)`);
  ok(J(g, `zTwins().length`) === 3, 'GEMINI III: four of you');
  const gr = dummy(g, 100, 0, 1e6);
  g.run(`__trig = false; enemies.find(e => e.id === ${gr}).x = (arena.x0 + arena.x1) / 2 + 100; enemies.find(e => e.id === ${gr}).y = P.y;`);
  steps(g, 30);
  ok(hp(g, gr) < 1e6, 'GEMINI III: the ring cuts what touches it', hp(g, gr));

  // CANCER
  enter(g);
  g.run(`zGive('cancer', 1)`);
  ok(J(g, `P.shieldMax`) === 3 && J(g, `P.shield`) === 3, 'CANCER I: +3 shields');
  const c = dummy(g, 60, 0, 1e6);
  g.run(`P.iframe = 0; hurtPlayer(10);`);
  ok(hp(g, c) < 1e6 && J(g, `P.shield`) === 2, 'CANCER I: a breaking shield bursts');
  g.run(`zGive('cancer', 3); P.shield = 0; P.shieldMax = 0; P.iframe = 0; hurtPlayer(P.maxHp * 0.9);`);
  ok(J(g, `P.hp`) === J(g, `P.maxHp`) && J(g, `P.zx.caraT`) > 0, 'CANCER III: under a quarter the shell shuts, healed to full');

  // LEO
  enter(g);
  g.run(`zGive('leo', 1)`);
  ok(J(g, `zLeoR()`) === 220, 'LEO I: the corona reaches 220');
  const l = dummy(g, 150, 0, 1e6);
  steps(g, 30);
  ok(hp(g, l) < 1e6 && J(g, `enemies.find(e => e.id === ${l}).burn`) > 0, 'LEO I: what is in it burns, and catches fire');
  g.run(`zGive('leo', 2)`);
  const lr = round(g, 280, 0, 120); steps(g, 50);
  ok(J(g, `ebullets.length`) === 0, 'LEO II: an enemy round crossing into it burns away');
  g.run(`zGive('leo', 3); P.zx.novaN = 19;`);
  const ln = dummy(g, 100, 0, 1); const lfar = dummy(g, 900, 0, 1e6);
  steps(g, 20);
  ok(hp(g, lfar) < 1e6 && J(g, `P.zx.novaT`) > 0, 'LEO III: the twentieth kill goes nova across the room');

  // VIRGO
  enter(g);
  g.run(`zGive('virgo', 1)`);
  ok(J(g, `P.homing`) > 6, 'VIRGO I: your rounds seek');
  const v = dummy(g, 200, 0, 100);
  g.run(`enemies.find(e => e.id === ${v}).hp = 25; damageEnemy(enemies.find(e => e.id === ${v}), 6, false, P.x, P.y);`);
  ok(J(g, `enemies.find(e => e.id === ${v}).dead`), 'VIRGO I: under 20% it is reaped');
  g.run(`zGive('virgo', 3)`);
  ok(J(g, `P.crit`) >= 1, 'VIRGO III: every hit is a critical');

  // LIBRA
  enter(g);
  g.run(`zGive('libra', 1)`);
  const lb = dummy(g, 120, 0, 1e6);
  g.run(`P.iframe = 0; hurtPlayer(20);`);
  ok(1e6 - hp(g, lb) > 50, 'LIBRA I: a hit you take is repaid five times over', 1e6 - hp(g, lb));
  g.run(`P.hp = 100; damageEnemy(enemies.find(e => e.id === ${lb}), 2000, false, P.x, P.y);`);
  steps(g, 60);
  ok(J(g, `P.hp`) > 100, 'LIBRA I: what you deal heals you', J(g, `P.hp`));
  g.run(`zGive('libra', 3); P.zx.judgeT = 9.99;`);
  steps(g, 2);
  ok(1e6 - hp(g, lb) > 2000, 'LIBRA III: JUDGEMENT falls on the heaviest');

  // SCORPIO
  enter(g);
  g.run(`zGive('scorpio', 1)`);
  ok(J(g, `zVenomCap()`) === 25, 'SCORPIO I: venom to 25 stacks');
  const sc = dummy(g, 200, 0, 1e6);
  g.run(`__trig = true;`); steps(g, 240); g.run(`__trig = false;`);
  ok(J(g, `enemies.find(e => e.id === ${sc}).psn`) > 12, 'SCORPIO I: past the old 12', J(g, `enemies.find(e => e.id === ${sc}).psn`));
  g.run(`zGive('scorpio', 3); const e = enemies.find(e => e.id === ${sc}); e.psn = 25; e.zSting = 7; globalThis.__h0 = e.hp;
    damageEnemy(e, 1, false, P.x, P.y);`);
  ok(J(g, `__h0 - enemies.find(e => e.id === ${sc}).hp`) > 1000, 'SCORPIO III: the eighth hit sets the venom off');

  // SAGITTARIUS
  enter(g);
  g.run(`zGive('sagittarius', 1)`);
  dummy(g, 500, 0);
  g.run(`__trig = true;`); steps(g, 2);
  ok(J(g, `bullets.length`) >= 3 && J(g, `bullets.every(b => b.arrow)`), 'SAGITTARIUS I: every round an arrow, two more a volley');
  g.run(`__trig = false; zGive('sagittarius', 3); bullets.length = 0; P.zx.rainT = 2.99;`);
  steps(g, 2);
  ok(J(g, `bullets.length`) >= 24, 'SAGITTARIUS III: arrows rain where you aim');

  // CAPRICORN
  enter(g);
  g.run(`wave = 10; globalThis.__d0 = P.dmg; zGive('capricorn', 1);`);
  ok(Math.abs(J(g, `P.dmg / __d0`) - Math.pow(1.08, 5)) < 1e-6, 'CAPRICORN I: starts half way up the waves cleared');
  g.run(`__d0 = P.dmg; zWave(false);`);
  ok(Math.abs(J(g, `P.dmg / __d0`) - 1.08) < 1e-6, 'CAPRICORN I: +8% a wave');
  g.run(`zGive('capricorn', 2); __d0 = P.dmg; zWave(true);`);
  ok(Math.abs(J(g, `P.dmg / __d0`) - Math.pow(1.08, 5)) < 1e-6, 'CAPRICORN II: a boss counts five');

  // AQUARIUS
  enter(g);
  g.run(`zGive('aquarius', 1)`);
  g.run(`__mv = [1, 0];`); steps(g, 30); g.run(`__mv = [0, 0];`);
  ok(J(g, `hazards.filter(h => h.kind === 'current').length`) > 0, 'AQUARIUS I: charged water where you go');
  g.run(`zGive('aquarius', 3); P.zx.floodCd = 9.99;`);
  const aq = dummy(g, 700, 0, 1e6); round(g, 500, 300);
  steps(g, 2);
  ok(hp(g, aq) < 1e6 && J(g, `ebullets.length`) === 0, 'AQUARIUS III: the flood erases rounds and shocks the room');

  // PISCES
  enter(g);
  g.run(`zGive('pisces', 1)`);
  round(g, 100, 0, 200);
  g.run(`globalThis.__x0 = ebullets[0].x;`); steps(g, 10);
  const moved = J(g, `__x0 - ebullets[0].x`);
  ok(moved > 0 && moved < 200 * 10 / 60 * 0.5, 'PISCES I: an enemy round in the deep crawls', moved);
  g.run(`zGive('pisces', 2); ebullets.length = 0;`);
  dummy(g, 600, 0);
  round(g, 120, 0, 20);
  steps(g, 70);
  ok(J(g, `ebullets.length`) === 0 && J(g, `bullets.length`) >= 1, 'PISCES II: a round a second in the deep changes sides');
  g.run(`zGive('pisces', 3); bullets.length = 0; P.zx.tideT = 11.99;`);
  round(g, 600, 200);
  steps(g, 2);
  ok(J(g, `ebullets.length`) === 0 && J(g, `bullets.length`) >= 1, 'PISCES III: the tide turns every round in the room');
}

console.log('· SHADOWS');
{
  const g = game();
  // each shadow on its own, without its sign, so nothing the sign gives hides what the shadow takes
  const sh = id => { enter(g); g.run(`zShadowOn('${id}', true)`); };
  sh('aries');
  g.run(`__mv = [1, 0];`); steps(g, 10); g.run(`__mv = [0, 0]; globalThis.__x0 = P.x;`); steps(g, 20);
  ok(J(g, `P.x - __x0`) > 50, 'HEADLONG: let go, and you keep going');
  const ar = dummy(g, 0, 0, 1e6);
  g.run(`globalThis.__h = P.hp; P.iframe = 0; hurtPlayer(10, { src: enemies.find(e => e.id === ${ar}) });`);
  ok(J(g, `__h - P.hp`) >= 20, 'HEADLONG: a body you run into hurts twice as much', J(g, `__h - P.hp`));
  sh('taurus');
  g.run(`__dash = true;`); steps(g, 2);
  ok(J(g, `P.dashT`) <= 0, 'EARTHBOUND: no dash');
  sh('gemini');
  g.run(`P.x = arena.x0 + 200;`);
  dummy(g, 400, 0);
  g.run(`__trig = true;`); steps(g, 40); g.run(`__trig = false;`);
  ok(J(g, `ebullets.some(b => b.kind === 'zshadow')`), 'THE OTHER ONE: fires back at you while you fire');
  sh('cancer');
  g.run(`P.shieldMax = P.shield = 2; P.armor = 5; P.iframe = 0; globalThis.__h = P.hp; P.vx = 0; P.vy = 0; hurtPlayer(10);`);
  ok(J(g, `P.shield`) === 2 && J(g, `__h - P.hp`) === 10, 'THE MOLT: no shields and no armour');
  sh('leo');
  g.run(`render()`);
  ok(J(g, `zsh('leo')`), 'SUNLESS: carried, and the dark is drawn');
  sh('virgo');
  g.run(`__trig = true; globalThis.__h = P.hp;`); steps(g, 120); g.run(`__trig = false;`);
  ok(J(g, `__h - P.hp`) >= 5, 'EXACTING: every miss costs a health', J(g, `__h - P.hp`));
  sh('libra');
  const lbs = dummy(g, 200, 0, 1e6);
  g.run(`globalThis.__h = P.hp; damageEnemy(enemies.find(e => e.id === ${lbs}), 300, false, P.x, P.y);`);
  steps(g, 40);
  ok(J(g, `__h - P.hp`) >= 20, 'THE SCALES: what you deal comes back as harm', J(g, `__h - P.hp`));
  sh('scorpio');
  g.run(`P.iframe = 0; hurtPlayer(5); P.iframe = 0; hurtPlayer(5);`);
  ok(J(g, `P.zx.selfPsn`) === 2, 'THE STING TURNS: every hit taken poisons you');
  g.run(`globalThis.__h = P.hp;`); steps(g, 1); g.run(`P.hp += 50;`); steps(g, 1);
  ok(J(g, `P.hp`) <= J(g, `__h`), 'THE STING TURNS: and you cannot heal while poisoned');
  sh('sagittarius');
  g.run(`__trig = true;`); steps(g, 120); g.run(`__trig = false;`);
  ok(J(g, `ebullets.some(b => b.kind === 'zshadow')`), 'THE ARROW RETURNS: your rounds come back for you');
  sh('capricorn');
  ok(Math.abs(J(g, `zDmgMul({ x: 0, y: 0, r: 1 })`) - 0.34) < 1e-9, 'THE LONG CLIMB: a third of your damage');
  g.run(`zWave(false)`);
  ok(Math.abs(J(g, `zDmgMul({ x: 0, y: 0, r: 1 })`) - 0.49) < 1e-9, 'THE LONG CLIMB: climbing back 15% a wave');
  sh('aquarius');
  g.run(`P.waveClock = 60; P.x = arena.x0 + 20; globalThis.__h = P.hp;`); steps(g, 60);
  ok(J(g, `__h - P.hp`) >= 8, 'THE RISING TIDE: standing in the water drains you', J(g, `__h - P.hp`));
  sh('pisces');
  ok(J(g, `zSpdMul()`) === 0.7 && J(g, `zDashMul()`) === 0.5, 'DEEP WATER: 30% slower, half the dash');
}

console.log('· TRINES');
{
  const g = game();
  for (const [el, ids] of [['fire', ['aries', 'leo', 'sagittarius']], ['earth', ['taurus', 'virgo', 'capricorn']],
                           ['air', ['gemini', 'libra', 'aquarius']], ['water', ['cancer', 'scorpio', 'pisces']]]) {
    enter(g);
    g.run(ids.slice(0, 2).map(i => `zGive('${i}', 1);`).join(''));
    ok(!J(g, `zTri('${el}')`), `${el.toUpperCase()}: two of three is no trine`);
    g.run(`globalThis.__a = [P.armor, P.maxHp, P.speed, P.dashMax]; zGive('${ids[2]}', 1);`);
    ok(J(g, `zTri('${el}')`), `${el.toUpperCase()}: the third completes the GRAND TRINE`);
    if (el === 'earth') ok(J(g, `P.armor - __a[0]`) === 10, 'BEDROCK: +10 armour');
    if (el === 'air') ok(J(g, `P.dashMax - __a[3]`) === 2, 'TAILWIND: +2 dash charges');
  }
}

console.log('· EVERY HULL');
{
  const g = game();
  for (const pilot of ['runner', 'ember', 'melee', 'hacker']) {
    let threw = '';
    for (const sh of ['', ...g.run(`SIGNS.map(s => s.id).join()`).split(',')]) {
      enter(g, pilot, 11);
      try {
        g.run(`for (const s of SIGNS) zGive(s.id, 3); P.maxHp = P.hp = 8000; credits = 600; ${sh ? `zShadowOn('${sh}')` : ''}`);
        g.run(`__trig = true;`);
        for (let i = 0; i < 6; i++) {
          if (i % 2) dummy(g, 220, (i - 3) * 60, 300, 'spitter'); else dummy(g, -180, i * 30, 300);
          g.run(`__dash = true; __mv = [Math.cos(${i}), Math.sin(${i})];`);
          steps(g, 25);
          g.run(`render()`);
        }
      } catch (e) { threw = (sh || 'signs') + ': ' + String(e && e.message || e); break; }
    }
    ok(!threw, `${pilot}: every sign at III, and each shadow, played and drawn`, threw);
  }
}

console.log('· IN STEP');
{
  const print = g => g.run(`JSON.stringify([simRngState, simTick, Math.round(P.x * 100), Math.round(P.y * 100), Math.round(P.hp * 100),
    enemies.map(e => [e.id, Math.round(e.hp), e.psn | 0]), bullets.length, ebullets.length, hazards.length, Math.round(credits)])`);
  const one = () => {
    const g = game();
    enter(g, 'runner', 21);
    g.run(`for (const s of SIGNS) zGive(s.id, 2); zShadowOn('gemini'); P.maxHp = P.hp = 8000; credits = 400; __trig = true;`);
    const out = [];
    for (let i = 0; i < 8; i++) {
      dummy(g, 200 + i * 10, (i - 4) * 50, 2000, i % 2 ? 'spitter' : 'grunt');
      g.run(`__dash = true; __mv = [Math.cos(${i}), Math.sin(${i})];`);
      steps(g, 30);
      out.push(print(g));
    }
    return out;
  };
  const a = one(), b = one();
  const at = a.findIndex((x, i) => x !== b[i]);
  ok(at < 0, 'the same run, twice, is the same run', at < 0 ? undefined : [a[at], b[at]]);
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
