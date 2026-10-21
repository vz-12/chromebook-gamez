#!/usr/bin/env node
/* ===========================================================================
   ALL HALLOWS, chapter III — the test (part of `npm run test:hallows`)

   THE YARD (index.html, "ALL HALLOWS — BOOK I: THE LOST SOUL · ACT III"),
   played through the game's own functions:

     the chain     quests 5 and 6 are built, wait on their chapter's date, and
                   the soul gives them in order; the third ascension; and the
                   wait line at the top landing
     rising        the stones and the gates; a death on a plot raises its
                   grave, a risen climbs out of it with its stone's line, and
                   the wave waits for it; the cap
     the bodies    a risen's three guns; a gravedigger digs where you were,
                   its pit slows you and swallows what falls in, and a death
                   near it is buried and gets up; a bell raises the three
                   nearest graves, on your side if it is yours
     the errand    a marked gravedigger fills in the soul's stone unless it is
                   felled; kept across attempts; three, and the stone is read
     THE RAGE QUIT wave five only with the errand done; nothing finishes him
                   before his last quarter; a quarter crossed and he runs for
                   the nearest open gate, his back to you; through it, that
                   one did not count; held, or burnt down, the quarter
                   stands; the soul takes a gate; the last quarter's gates;
                   his death, the quest, the medal and the third ascension
     the word      after a death in his fight, a line about how it went
     the medals    SHALLOW GRAVE and LAG, and nowhere they should not be
     the menu      the knock when the yard opens
     the epilogue  PAST NINETEEN: given at the top landing, the soul along for
                   an ordinary run and nowhere else, twenty and it goes up,
                   the run untouched by it; the vigil after, the wall; and
                   THE LANTERN
     the hooks     every Act III hook called and none throwing; Act I's and
                   Act II's never asked to draw the yard

   The determinism suite (npm test) flies the yard and THE RAGE QUIT too, and
   holds them to the run's rules (seeded, snapshot-safe).
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }

const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'HALLOWS'; state = 'menu';
  Save.profile.logSeen = LOG_VER;`;
// inside the game: checks, a clock, and a few ways in
const KIT = `
  var C = [];
  var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  var STEP = 1 / 60;
  var day = d => { HL.day = d; };
  var book = () => hlP();
  var wipe = () => { Save.profile.hl = {}; };
  var steps = (n, f) => { for (let i = 0; i < n; i++) { if (state === 'levelup') { uiArm = 0; handleKey('1'); } update(STEP); if (f && f(i)) return i; } return n; };
  var yard = () => { applyChar(0); runSeedNext = 78; hlAreaStart('yard'); if (state === 'levelup') { uiArm = 0; handleKey('1'); } };
  // the room emptied, the wave held open (something still owed, nothing sent)
  var calm = () => { for (const e of enemies) if (e.type !== 'boss') e.dead = true; ebullets.length = 0; spawnBudget = 5; spawnT = 1e9;
                     for (const g of hlArea.graves) if (g.st !== 'rest') { g.st = 'rest'; g.t = 0; g.risen = 0; }
                     hlArea.graves = hlArea.graves.filter(g => !g.fresh); hlArea.pits.length = 0; };
  var at = (t, dx, dy, o) => spawnEnemy(t, P.x + (dx || 0), P.y + (dy || 0), o || {});
  var talkAll = () => { for (let i = 0; i < 40 && vig.talk; i++) { vigilInteract(); vigilInteract(); } };
  // the boss wave, the errand done
  var ragequit = () => { yard(); steps(400, () => hlArea.n >= 1); calm(); hlArea.n = 4; betweenWaves = 0.01; steps(3); return hlArea.boss; };
  // a clear patch of yard: no stone's plot under (x, y)
  var clear = (x, y) => !hlArea.graves.some(g => len(g.x - x, g.y - y) < GRAVE_PLOT + 40);
`;

/* =============================== the chain ================================ */
section('the chain');
const g = loadGame(IDX, { w: 1280, h: 720 });
g.run(SETUP);
take(g.run(`(() => { ${KIT}
  wipe();
  chk(!hlQuest('q5').later && !hlQuest('q6').later, 'quests 5 and 6 are built');
  chk(['grave', 'lag'].every(id => { const m = HL_MEDALS.find(z => z.id === id); return m && !m.later && m.d.length > 40; }), 'SHALLOW GRAVE and LAG are on the stand, with what they do');
  chk(HL_AREAS.yard && HL_AREAS.yard.stage.boss === 'ragequit' && HL_AREAS.yard.waveFrom === 16, 'THE YARD: waves 16 to 20, and THE RAGE QUIT');
  chk(BOSSES.ragequit && BOSSES.ragequit.secret && CODEX_B.ragequit, 'he is a secret boss, with a codex line');
  chk(['risen', 'gravedigger', 'bellringer'].every(k => ETYPE[k] && CODEX_E[k] && HL_ETYPES[k]), 'the yard\\'s three bodies, with codex lines');

  day('2026-10-22');
  const b = book(); b.q = { q1: 2, q2: 2, q3: 2, q4: 2 };
  b.seen = { prologue: 1, first: 1 };
  for (const q of ['q1', 'q2', 'q3', 'q4']) { b.seen[q + ':shown'] = 1; b.seen[q + ':done'] = 1; }
  chk(hlCurrent() === null, 'before 23 Oct the chain waits in front of the yard');
  chk(hlWaitLines() === HL_SAY.waitYard, 'and he says the yard is not open');
  enterVigil();
  vig.near = 'way'; vig.nearI = 2; vigilInteract();
  chk(!hlAreaOn() && vig.said === 'shut', 'the way up to the yard is shut');
  exitVigil();

  day('2026-10-23');
  chk(hlCurrent() && hlCurrent().id === 'q5', 'on 23 Oct: WHERE HE PUT ME');
  enterVigil();
  const s = vigSoulPos(); P.x = s.x; P.y = s.y + 60;
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q5Give[0][1], 'walk up to the soul and it gives it', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlQGiven('q5') && !hlQDone('q5'), 'given');
  vig.near = 'way'; vig.nearI = 2; vigilInteract();
  chk(hlYardOn() && stage.name === 'THE YARD', 'and the way up to the yard is open');
  chalQuit(); hlArea = null; enterVigil();
  P.x = s.x; P.y = s.y + 60;
  b.q.q5 = 2; b.prog.q5 = 3;
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === "That's mine.", 'told: that is its stone', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlSeen('q5:done') && hlSoulShown() === 3, 'an errand changes nothing of where the soul stands');
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q6Give[0][1], 'then GG');
  talkAll();
  b.q.q6 = 2;
  steps(2);
  chk(!!vig.asc && vig.asc.to === 3, 'THE RAGE QUIT down: the soul rises to the top landing');
  steps(Math.ceil(HL_ASC_T * 60) + 2);
  chk(vig.talk && /finally said it/.test(vig.talk.lines[0][1]), 'and says he said it', vig.talk && vig.talk.lines[0]);
  chk(hlSoulShown() === 4 && hlLandingShown() === 3, 'the lantern warm: stage 4, landing 3');
  talkAll();
  chk(hlCurrent() && hlCurrent().id === 'q7', 'and then the last of it: PAST NINETEEN');
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q7Give[0][1], 'take me with you', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlQGiven('q7') && !hlQDone('q7'), 'given');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* ================================= rising ================================= */
section('rising');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23'); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 1 };
  yard(); P.iframe = 1e9;
  chk(hlYardOn() && stage.name === 'THE YARD', 'in THE YARD');
  chk(hlArea.graves.length === GRAVE_N + 1 && hlArea.graves.filter(g => g.soul).length === 1, 'twenty stones and the soul\\'s', hlArea.graves.length);
  chk(hlArea.graves.every(g => g.st === 'rest' && (g.soul || HL_EPITAPHS.some(([w, s]) => w === g.wave && s === g.said))), 'each one a quit run: its wave and its last line');
  chk(hlArea.gates.length === 4 && hlArea.gates.every(g => g.x >= arena.x0 && g.x <= arena.x1 && g.y >= arena.y0 && g.y <= arena.y1), 'four gates, at the walls');
  const S = hlSoulStone();
  chk(S && S.wave === 19 && S.hull === 4 && S.said === 'brb', 'the soul\\'s: WAVE 19 · HULL 4% · brb');
  steps(400, () => hlArea.n >= 1); calm();
  // a death on a plot
  const gr = hlArea.graves.find(g => !g.soul);
  const v = at('grunt'); v.x = gr.x + 10; v.y = gr.y; killEnemy(v);
  chk(gr.st === 'rise', 'a death on a stone\\'s plot: it rises', gr.st);
  chk(hlWaveThreats() >= 1, 'and the wave waits for it');
  steps(Math.ceil(GRAVE_RISE_T * 60) + 2);
  const r = enemies.find(o => !o.dead && o.type === 'risen' && o.id === gr.risen);
  chk(gr.st === 'open' && r && len(r.x - gr.x, r.y - gr.y) < 30, 'a risen climbs out of it', [gr.st, !!r]);
  chk(r && r.hlLine.wave === gr.wave && r.hlLine.said === gr.said, 'with its stone\\'s line');
  chk(r && RISEN_GUNS.includes(r.hlGun), 'flying a quit run\\'s gun', r && r.hlGun);
  chk(r && r.phased && r.hlClimb > 0, 'climbing out, nothing touches it');
  steps(Math.ceil(RISEN_CLIMB * 60) + 2);
  chk(r && !r.phased, 'and then it is there');
  // the soul's own never rises
  const sv = at('grunt'); sv.x = S.x; sv.y = S.y; killEnemy(sv);
  chk(S.st === 'rest', 'the soul\\'s stone never rises');
  // the cap
  calm();
  for (let i = 0; i < RISEN_MAX; i++) at('risen', 3000, 0);
  const gc = hlArea.graves.find(g => !g.soul && g.st === 'rest');
  const cv = at('grunt'); cv.x = gc.x; cv.y = gc.y; killEnemy(cv);
  chk(gc.st === 'rest', 'with as many up as it holds, the graves wait', hlRisenUp());
  // sent by the wave, a risen still climbs out of the nearest shut grave
  calm();
  const far = { x: arena.x0 + 80, y: arena.y0 + 80 };
  let near = null, nd = 1e9; for (const o of hlArea.graves) if (o.st === 'rest' && !o.soul) { const dd = len(o.x - far.x, o.y - far.y); if (dd < nd) { nd = dd; near = o; } }
  const w = spawnEnemy('risen', far.x, far.y, {});
  chk(near.st === 'open' && w.x === near.x && w.y === near.y && near.risen === w.id, 'one the wave sends climbs out of the nearest grave');
  // an emptied grave settles once its risen is gone
  w.dead = true; near.t = GRAVE_OPEN_T; steps(2);
  chk(near.st === 'rest', 'emptied, it settles again');
  chalQuit(); hlArea = null;
  return JSON.stringify(C);
})()`));

/* =============================== the bodies =============================== */
section('the bodies');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23'); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 1 };
  yard(); steps(400, () => hlArea.n >= 1); calm();
  P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2; P.vx = P.vy = 0;
  // RISEN: the three guns
  const gun = (k, dx) => { const r = at('risen', dx, 0, { hlDoor: true }); r.hlClimb = 0; r.phased = false; r.hlGun = k; r.cd = 0; r.state = 0; return r; };
  P.iframe = 0; P.hp = P.maxHp = 5000;
  const ls = gun('lance', 160);
  steps(Math.ceil((RISEN_WIND + 0.1) * 60), () => ls.state === 2);
  steps(2);
  chk(P.hp < 5000 && ls.hlFired === 1, 'a lance: down its locked heading', [P.hp]);
  ls.dead = true; P.hp = 5000; P.iframe = 0;
  const sw = gun('swing', 60);
  steps(60, () => sw.state === 2); steps(2);
  chk(P.hp < 5000, 'a swing: round it');
  sw.dead = true; P.hp = 5000; P.iframe = 1e9;
  const st = gun('stream', 300);
  steps(90, () => ebullets.filter(b => b.hlKind === 'risen').length >= RISEN_STREAM.n);
  chk(ebullets.filter(b => b.hlKind === 'risen').length >= RISEN_STREAM.n, 'a stream: rounds, one after another');
  st.dead = true; calm(); steps(2);

  // GRAVEDIGGER
  const dg = at('gravedigger', 300, 0); dg.cd = 0;
  for (let i = 0; i < 24; i++) hlArea.trail.push({ x: P.x - 120, y: P.y });
  steps(1);
  chk(dg.state === 1 && dg.hlDigAt && Math.abs(dg.hlDigAt.x - (P.x - 120)) < 1, 'a gravedigger goes to where you were');
  steps(60 * 8, () => hlArea.pits.length > 0);
  const pit = hlArea.pits[0];
  chk(pit && pit.by === dg.id && len(pit.x - (P.x - 120), pit.y - P.y) < 30, 'and digs a pit there', pit);
  P.x = pit.x; P.y = pit.y; steps(1);
  chk(P.slowT > 0 && P.slowV === PIT_SLOW, 'a pit slows you');
  const inb = { mine: true, x: pit.x, y: pit.y, px: pit.x - pit.r - 20, py: pit.y, r: 3 };
  const outb = { mine: true, x: pit.x + 10, y: pit.y, px: pit.x, py: pit.y, r: 3 };
  chk(hlBulletHit(inb) && !hlBulletHit(outb), 'and swallows what falls in, not what climbs out of it');
  pit.t = pit.life; steps(2);
  chk(!hlArea.pits.includes(pit), 'and closes after a while');
  P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2;
  // a death near it is buried, and gets up
  let bx = dg.x + 120, by = dg.y;
  for (let k = 0; k < 12 && !clear(bx, by); k++) by += 40;
  const bu = at('grunt'); bu.x = bx; bu.y = by; killEnemy(bu);
  const fresh = hlArea.graves.find(g => g.fresh);
  chk(fresh && fresh.st === 'buried', 'a death near a gravedigger is buried', fresh && fresh.st);
  steps(Math.ceil(BURY_T * 60) + 2);
  chk(fresh && fresh.st === 'open' && enemies.some(o => !o.dead && o.type === 'risen' && o.id === fresh.risen), 'and gets up as a risen');
  dg.dead = true; calm(); steps(2);

  // BELLRINGER
  const bell = at('bellringer', 0, 200);
  steps(1);
  bell.hlTollT = BELL_WIND - 0.01; steps(1);
  chk(bell.state === 1, 'a bell swings before it tolls');
  const shut = hlArea.graves.filter(g => g.st === 'rest' && !g.soul).sort((a, b) => len(a.x - bell.x, a.y - bell.y) - len(b.x - bell.x, b.y - bell.y)).slice(0, BELL_RAISE);
  bell.hlTollT = 0.001; steps(1);
  chk(shut.every(g => g.st === 'rise') && hlArea.graves.filter(g => g.st === 'rise').length === BELL_RAISE, 'a toll raises the three graves nearest it');
  chk(bell.hlTolls === 1 && Math.abs(bell.hlTollT - BELL_T) < 0.05, 'and it tolls again in six seconds');
  calm();
  const foe1 = at('grunt', 1500, 0); foe1.spd = 0;           // something for it to fight, or one of yours stays at heel
  const bell2 = at('bellringer', 0, 200); hackKin(bell2); steps(1); bell2.hlTollT = 0.001; steps(1);
  steps(Math.ceil(GRAVE_RISE_T * 60) + 2);
  const kin = enemies.filter(o => !o.dead && o.type === 'risen');
  chk(kin.length === BELL_RAISE && kin.every(o => o.hacked), 'one of yours raises them on your side', kin.map(o => o.hacked));
  calm(); steps(2);
  chalQuit(); hlArea = null;
  return JSON.stringify(C);
})()`));

/* =============================== the errand =============================== */
section('the errand');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23'); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 1 };
  yard(); steps(400, () => hlArea.n >= 1); calm();
  chk(hlArea.coldDue === 0, 'nothing marked in the first wave');
  betweenWaves = 0.01; steps(3);
  chk(hlArea.n === 2 && hlArea.coldDue > 0, 'the second wave owes a marked gravedigger', [hlArea.n, hlArea.coldDue]);
  calm();
  steps(Math.ceil(hlArea.coldDue * 60) + 2);
  let m = enemies.find(o => !o.dead && o.hlMarked);
  const S = hlSoulStone();
  chk(m && m.type === 'gravedigger' && m.dmg === 0, 'it comes, and never touches you');
  chk(m && !hackable(m), 'it is the soul\\'s errand: nothing to take');
  P.iframe = 1e9;
  steps(60 * 8, () => m.state === 3);
  chk(m.state === 3 && len(m.x - S.x, m.y - S.y) < 60, 'it goes to the soul\\'s stone and starts to fill it in');
  const f0 = m.hlFill; steps(60);
  chk(Math.abs(m.hlFill - f0 - 1 / DIG_FILL_T) < 0.01, 'twenty seconds of it', m.hlFill - f0);
  m.hlFill = 0.999; steps(2);
  chk(m.dead && hlProgress('q5') === 0 && hlArea.coldLive === 0, 'left to it, it fills the stone in', [m.dead, hlProgress('q5')]);
  for (let i = 0; i < 2; i++) { hlDigSprout(); killEnemy(enemies.find(o => !o.dead && o.hlMarked)); }
  chk(hlProgress('q5') === 2 && !hlQDone('q5'), 'two felled: two kept', hlProgress('q5'));
  // a death in the yard keeps them
  chalQuit(); hlArea = null;
  yard(); steps(400, () => hlArea.n >= 1); calm();
  hlArea.n = 1; betweenWaves = 0.01; steps(3);
  chk(hlArea.coldDue > 0, 'next attempt: the third is still owed');
  hlDigSprout(); killEnemy(enemies.find(o => !o.dead && o.hlMarked));
  chk(hlQDone('q5') && book().medals.includes('grave') && book().candles === 10, 'the third: WHERE HE PUT ME, 10 candles and SHALLOW GRAVE', [hlQDone('q5'), book().medals, book().candles]);
  calm(); hlArea.n = 2; betweenWaves = 0.01; steps(3);
  steps(60 * 10);
  chk(!enemies.some(o => !o.dead && o.hlMarked), 'once done, no more come');
  chalQuit(); hlArea = null;
  // wave five without the errand: the yard lets you go
  wipe(); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 1 };
  yard(); steps(400, () => hlArea.n >= 1); calm();
  hlArea.n = 4; betweenWaves = 0.01; steps(3);
  chk(hlArea.end && hlArea.end.why === 'errand' && !enemies.some(o => !o.dead && o.boss), 'wave five with the errand open: THE YARD LETS YOU GO');
  steps(Math.ceil(HL_END_T * 60) + 5);
  chk(inVigil, 'and it is back to the vigil');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* ============================== THE RAGE QUIT ============================== */
section('THE RAGE QUIT');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23'); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 1 };
  const e = ragequit();
  chk(e && e.boss === 'ragequit' && bossAlive, 'wave five, the errand done: THE RAGE QUIT');
  steps(2);
  chk(hlBarks.some(b => b.e === e && b.text === HL_BARK.ragequit.enter[0]), 'oh great, this again');
  e.armor = 0; e.absorb = 0; e.dr = 0;
  P.iframe = 1e9; P.maxHp = P.hp = 1e6;
  spawnBudget = 0; spawnT = 1e9;
  // nothing finishes him before his last quarter
  damageEnemy(e, e.maxHp * 5, false, P.x, P.y);
  chk(!e.dead && e.hp >= 1, 'he cannot be finished before his last quarter: he leaves first', e.hp);
  e.hp = e.maxHp;
  // a quarter crossed: he runs for the nearest open gate
  const G0 = hlArea.gates[1];
  e.x = G0.x - 260; e.y = G0.y; e.vx = e.vy = 0; P.x = (arena.x0 + arena.x1) / 2 - 500; P.y = (arena.y0 + arena.y1) / 2;
  e.hp = e.maxHp * 0.74; steps(1);
  chk(e.hlBolt && e.hlBolt.gate === 1 && hlBarks.some(b => b.text === HL_BARK.ragequit.bolt), 'a quarter down: "I\\'m done. I\\'m DONE." — for the nearest gate', e.hlBolt);
  const h0 = e.hp; damageEnemy(e, 100, false, P.x, P.y); const stand = h0 - e.hp;
  steps(Math.ceil(RQ_BOLT_WIND * 60) + 1);
  chk(hlRqRunning(e), 'he says so, then runs');
  const h1 = e.hp; damageEnemy(e, 100, false, P.x, P.y); const run = h1 - e.hp;
  chk(Math.abs(run / stand - RQ_BACK_MUL) < 0.01, 'running, his back is to you: half as much again', [stand, run]);
  steps(60 * 4, () => !!e.hlAway);
  chk(e.hlAway && Math.abs(e.hp - e.maxHp) < 1, 'through the gate: he comes back with what he had when the quarter began', e.hp / e.maxHp);
  chk(hlArea.jolt && !ebullets.length, 'the room jolts back');
  chk(hlBarks.some(b => b.text === HL_BARK.ragequit.restart) && HL.fight.escapes === 1, '"That one didn\\'t count."');
  chk(hlArea.soulGate === 1, 'and the soul goes to stand in the gate he went through');
  chk(e.invuln && e.phased, 'gone, nothing touches him');
  steps(Math.ceil(RQ_AWAY * 60) + 2);
  chk(!e.hlAway && !e.invuln, 'and he comes back in');
  steps(Math.ceil(6 * 60));
  chk(hlBarks.length && hlBarks.some(b => b.text === 'Wave nineteen.' && b.boss === 'soul'), 'the soul says what it came to say, at its gate', hlBarks.map(b => b.text));
  chk(hlArea.gates[1].by === 'soul', 'and holds it');
  // the graves he raised in a quarter rise again
  calm(); spawnBudget = 0;
  const gr = hlArea.graves.find(x => !x.soul && x.st === 'rest');
  hlGraveRaise(gr); steps(Math.ceil(GRAVE_RISE_T * 60) + 2);
  enemies.filter(o => o.type === 'risen').forEach(o => { o.dead = true; });
  chk(gr.st === 'open' && gr.q === e.hlQN, 'a grave raised in his quarter', [gr.st, gr.q, e.hlQN]);
  const G3 = hlArea.gates[3];
  e.x = G3.x + 200; e.y = G3.y; e.hp = e.maxHp * 0.74; steps(1);
  chk(e.hlBolt && e.hlBolt.gate === 3, 'he goes again, for the nearest open one');
  steps(60 * 4, () => !!e.hlAway);
  chk(e.hlAway && gr.st === 'rise', 'and through it: the grave he raised in it rises again', gr.st);
  steps(Math.ceil(RQ_AWAY * 60) + 2);
  calm(); spawnBudget = 0;
  // held: you stand in the gate he is making for
  e.x = G3.x + 300; e.y = G3.y; e.hp = e.maxHp * 0.74; steps(1);
  steps(Math.ceil(RQ_BOLT_WIND * 60) + 1);
  P.x = G3.x; P.y = G3.y; steps(1);
  chk(hlArea.gates[3].by === 'you', 'you can stand in a gate');
  steps(60 * 4, () => !e.hlBolt);
  chk(!e.hlBolt && !e.hlAway && e.hlQ === 1 && hlBarks.some(b => b.text === HL_BARK.ragequit.stopped), 'his gate held: he cannot leave, and the quarter stands', [e.hlQ, !!e.hlAway]);
  chk(Math.abs(e.hlQHp - e.hp) < 1, 'the next begins where he is');
  // burnt: take enough off him while he runs
  P.x = (arena.x0 + arena.x1) / 2; P.y = (arena.y0 + arena.y1) / 2;
  e.x = hlArea.gates[0].x; e.y = hlArea.gates[0].y + 600; e.hp = e.maxHp * 0.49; steps(1);
  chk(e.hlBolt && e.hlBolt.gate === 0, 'half: he goes again');
  steps(Math.ceil(RQ_BOLT_WIND * 60) + 2);
  damageEnemy(e, e.maxHp * RQ_BOLT_STOP / RQ_BACK_MUL + 5, false, P.x, P.y); steps(1);
  chk(!e.hlBolt && !e.hlAway && e.hlQ === 2, 'burn it down while he runs and he stops short: it stands', e.hlQ);
  chk(e.floor !== undefined, 'and he still cannot be finished');
  // his last quarter
  calm(); spawnBudget = 0;
  const r1 = at('risen', 400, 0); r1.hlClimb = 0;
  e.x = hlArea.gates[2].x; e.y = hlArea.gates[2].y - 500; e.hp = e.maxHp * 0.24; steps(1);
  chk(e.hlBolt && e.hlBolt.last && hlArea.march, 'his last quarter: he goes, and the risen stop fighting you');
  const inGates = enemies.filter(o => !o.dead && o.type === 'risen' && o.hlGate !== undefined);
  chk(r1.hlGate !== undefined && r1.phased, 'they go to the gates, and nothing touches them');
  chk(hlArea.gates.filter(x => x.i !== hlArea.soulGate).every(x => inGates.some(o => o.hlGate === x.i)), 'a risen for every gate but the soul\\'s', inGates.map(o => o.hlGate));
  chk(hlWaveThreats() === 1, 'and they hold nothing open: he does', hlWaveThreats());
  steps(60 * 6, () => !e.hlBolt);
  chk(e.hlCornered && !e.hlAway && hlBarks.some(b => b.text === HL_BARK.ragequit.shut), 'he cannot leave: "No. No no no. Let me out."');
  steps(60 * 5);
  chk(hlArea.gates.every(x => x.by), 'every run he left is standing in a door', hlArea.gates.map(x => x.by));
  chk(e.floor === undefined && e.hlQ === 3, 'and now he can lose');
  e.hp = e.maxHp * 0.2; steps(1);
  chk(!e.hlBolt, 'cornered, he does not run again');
  // his moves
  e.atkT = 0; e.hlWind = null; e.hlMove = null;
  steps(120, () => ebullets.some(b => b.hlKind === 'mash' || b.hlKind === 'pad') || (e.hlMove && e.hlMove.kind === 'charge'));
  chk(ebullets.some(b => b.hlKind === 'mash' || b.hlKind === 'pad') || (e.hlMove && e.hlMove.kind === 'charge'), 'his tilt: something thrown, mashed or charged');
  e.atkT = 0; e.hlWind = { kind: 'pad', t: RQ_WIND.pad, T: RQ_WIND.pad, ang: 0 }; ebullets.length = 0; steps(2);
  const pad = ebullets.find(b => b.hlKind === 'pad');
  chk(pad && pad.ricP === RQ_PAD.bounces && pad.hlPadOf === e.id, 'THE CONTROLLER bounces across the yard');
  // down
  ebullets.length = 0;
  killEnemy(e);
  chk(hlQDone('q6') && book().medals.includes('lag') && book().candles === 20, 'THE RAGE QUIT down: GG, 20 candles and LAG', [hlQDone('q6'), book().medals, book().candles]);
  chk(hlArea.end && hlArea.end.why === 'win' && hlArea.death && hlArea.death.boss === 'ragequit', 'and the yard lets you go');
  chk(hlBarks.some(b => b.text === HL_BARK.ragequit.death), '...gg.');
  steps(Math.ceil(HL_END_T * 60) + 5);
  chk(inVigil, 'back to the vigil');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* ================================ the word ================================ */
section('the word after');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23'); book().q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 1 };
  const die = (f, hpk, q) => {
    const e = ragequit(); Object.assign(HL.fight, f); e.hp = e.maxHp * (hpk || 1); if (q !== undefined) e.hlQ = q;
    P.iframe = 0; P.revive = 0; P.hp = 1; hurtPlayer(9999);
    steps(2);
    const S = HL.deadSay;
    chalQuit(); hlArea = null;
    return S;
  };
  let S = die({ escapes: 3 });
  chk(S && S.theme === 'escape' && S.text === HL_SAY.hintRQ.escape[0][1], 'he got out, and out again: about that, obliquely first', S);
  S = die({ escapes: 3 });
  chk(S && S.text === HL_SAY.hintRQ.escape[1][1], 'and a little plainer the next time', S);
  chk(hlSeen('hint:rq:escape:0') && !hlSeen('hint:escape:0') && !hlSeen('hint:dg:escape:0'), 'his are kept apart');
  S = die({ escapes: 1 }); chk(S && S.theme === 'back', 'out once, and never stopped short', S);
  S = die({ escapes: 1, held: 1 }, 0.1, 3); chk(S && S.theme === 'close', 'nearly', S);
  S = die({}, 0.4, 2); chk(S && S.theme === 'tilt', 'late, with him at his wildest', S);
  S = die({}); chk(S && S.theme === 'general', 'otherwise', S);
  for (const k of Object.keys(HL_SAY.hintRQ)) for (const [who, t] of HL_SAY.hintRQ[k])
    if (!/^[A-Z]/.test(t)) chk(false, 'two landings up the soul speaks in sentences, and so does he: ' + t);
  return JSON.stringify(C);
})()`));

/* =============================== the medals =============================== */
section('the medals');
take(g.run(`(() => { ${KIT}
  wipe(); HL.day = null; HL.force = true;
  const b = book(); b.medals = ['grave', 'lag']; b.equip = ['grave', 'lag'];
  applyChar(0); resetGame(); state = 'play'; wave = 3;
  steps(1);
  chk(HL.eq.grave && HL.eq.lag, 'worn in an ordinary run');
  // SHALLOW GRAVE
  P.iframe = 1e9;
  const felled = [];
  for (let i = 0; i < GRAVE_EVERY; i++) { const o = at('grunt', 200 + i * 10, 0); killEnemy(o); felled.push(o); }
  chk(felled.slice(0, -1).every(o => o.dead) && !felled[GRAVE_EVERY - 1].dead, 'SHALLOW GRAVE: one in ten climbs back out');
  const up = felled[GRAVE_EVERY - 1];
  chk(up.hacked && up.hackKin && up.hlGraveT === GRAVE_ALLY_T, 'on your side', [up.hacked, up.hlGraveT]);
  steps(Math.ceil(GRAVE_ALLY_T * 60) + 2);
  chk(up.dead, 'for eight seconds');
  const egg = []; for (let i = 0; i < GRAVE_EVERY; i++) { const o = at('boss', 500, 0, { boss: 'warden' }); o.hp = 1; killEnemy(o); egg.push(o); }
  chk(egg.every(o => o.dead && !o.hacked), 'never a boss');
  // flying THE HACKER: longer, not more
  enemies.length = 0;
  P.hacker = true;
  const mine = at('grunt', 200); mine.hacked = true; mine.hackKin = false; mine.hp = mine.maxHp; mine.hackCd = 9;
  const theirs = at('grunt', 900); theirs.spd = 0;
  steps(60);
  const lost = 1 - mine.hp / mine.maxHp;
  chk(Math.abs(lost - HACK_DECAY * GRAVE_HACK) < 0.002, 'on THE HACKER, its bodies fade a quarter slower', lost);
  P.hacker = false; enemies.length = 0;
  // LAG
  ebullets.length = 0; P.hlLagN = 0;
  const rs = [];
  for (let i = 0; i < LAG_EVERY; i++) { const bb = { x: P.x + 100, y: P.y + i * 3, vx: 40, vy: 0, r: 4, dmg: 1, life: 9, col: '#fff' }; ebullets.push(bb); rs.push(bb); }
  steps(1);
  const hung = rs.filter(bb => bb.frozen > 0), moving = rs.find(bb => !(bb.frozen > 0));
  chk(hung.length === 1, 'LAG: one round in six that comes near hangs', hung.length);
  const x0 = hung[0].x, o0 = moving.x;
  steps(30);
  chk(hung[0].x === x0 && moving.x > o0, 'in the air, while the rest go on');
  steps(Math.ceil(LAG_T * 60));
  chk(!(hung[0].frozen > 0) && hung[0].vx === 40, 'for a second, then it goes on too');
  steps(30); chk(rs.every(bb => !(bb.frozen > 0)), 'and once is all it stutters');
  ebullets.length = 0;
  // not in a challenge
  resetGame(); Chal.on = { id: 'x', m: {} }; state = 'play'; steps(1);
  chk(!HL.eq.grave && !HL.eq.lag, 'not in a challenge');
  Chal.on = null; HL.force = false; resetGame(); state = 'play'; steps(1);
  chk(!HL.eq.lag, 'nor once the event is shut');
  state = 'menu';
  return JSON.stringify(C);
})()`));

/* ================================ the menu ================================ */
section('the menu');
take(g.run(`(() => { ${KIT}
  wipe(); state = 'menu';
  const b = book(); b.seen = { prologue: 1, 'ch:1': 1 }; b.q = { q1: 2, q2: 2, q3: 2, q4: 2 };
  day('2026-10-22'); steps(2);
  chk(!HL.pro && hlChapterBeatDue() < 0, 'before the yard opens, no knock');
  day('2026-10-23');
  chk(hlChapterBeatDue() === 2, 'the yard open, the house done: the floor is due');
  steps(1);
  chk(HL.pro && HL.pro.name === 'chapter', 'it knocks, through the hatch');
  let said = null;
  steps(60 * 12, () => { const l = HL.pro && HL.pro.line(); if (l) said = l.text; return !HL.pro; });
  chk(said === HL_SAY.ch2[0][1], 'and he says it is near the top', said);
  chk(!HL.pro && hlSeen('ch:2'), 'once');
  wipe(); book().seen = { prologue: 1, 'ch:1': 1 }; book().q = { q1: 2, q2: 2, q3: 2 };
  steps(2); chk(!HL.pro, 'with the house not done, nothing is asking for you yet');
  HL.day = null;
  return JSON.stringify(C);
})()`));

/* ============================== the epilogue ============================== */
section('the epilogue');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-23');
  const b = book(); b.q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 2, q6: 2, q7: 1 };
  b.seen = { prologue: 1, first: 1 };
  for (const q of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']) { b.seen[q + ':shown'] = 1; b.seen[q + ':done'] = 1; }
  // not in a challenge, an area or a sandbox
  resetGame(); Chal.on = { id: 'x', m: {} }; state = 'play'; steps(2);
  chk(!hlRide, 'not in a challenge');
  Chal.on = null; resetGame(); freeRun = true; state = 'play'; steps(2);
  chk(!hlRide, 'nor in freeplay');
  freeRun = false;
  yard(); steps(2); chk(!hlRide, 'nor up in the yard'); chalQuit(); hlArea = null;
  // an ordinary run: it rides along
  applyChar(0); resetGame(); state = 'play'; P.iframe = 1e9; steps(2);
  chk(hlRide && !hlRide.beat, 'an ordinary run: it rides along');
  wave = 19; steps(30);
  chk(!hlRide.beat && !hlQDone('q7'), 'nineteen is not twenty');
  wave = 20; steps(2);
  chk(hlRide.beat && !hlQDone('q7'), 'wave twenty: its hull is whole');
  steps(Math.ceil(RIDE_BEAT_T * 60) + 2);
  chk(hlRide.say && hlRide.say.text === HL_SAY.q7Beat[0][1], 'and it says what twenty looks like');
  chk(hlQDone('q7') && b.medals.includes('lantern') && b.candles === 20, 'PAST NINETEEN: 20 candles, and it left its lantern', [hlQDone('q7'), b.medals, b.candles]);
  steps(Math.ceil(RIDE_GO_T * 60));
  chk(hlRide.gone && state === 'play', 'it goes up, and the run goes on');
  resetGame(); state = 'play'; steps(2);
  chk(!hlRide, 'and it does not ride again');
  // the ride has no say in the run: the same seed plays the same with it or without it
  const fly = given => {
    b.q.q7 = given ? 1 : 2; b.equip = []; resetGame(); runSeedNext = 4242; resetGame(); state = 'play'; P.iframe = 1e9;
    steps(60 * 30);
    return [score, enemies.filter(o => !o.dead).length, P.x.toFixed(4), P.y.toFixed(4), simRngState, !!hlRide].join(',');
  };
  const w = fly(true), wo = fly(false);
  chk(w.split(',').slice(0, -1).join() === wo.split(',').slice(0, -1).join() && w.endsWith('true') && wo.endsWith('false'), 'the ride changes nothing of the run', [w, wo]);
  b.q.q7 = 2;
  // the vigil after: the soul has gone up, and he says so
  state = 'menu'; enterVigil(); steps(Math.ceil(2 * 60));
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q7Done[0][1], 'it went up: he says so, on the way in', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlSoulShown() === 5 && hlSeen('q7:done'), 'the soul is gone (stage 5)');
  const s = vigSoulPos(); P.x = s.x; P.y = s.y; steps(2);
  chk(vig.near !== 'soul', 'and there is nothing there to talk to');
  chk(hlCurrent() === null, 'and the story is finished');
  exitVigil();
  // THE LANTERN
  HL.force = true; b.equip = ['lantern'];
  applyChar(0); resetGame(); state = 'play'; wave = 3; steps(1);
  chk(HL.eq.lantern, 'THE LANTERN, worn');
  P.iframe = 0; const h0 = P.hp; hurtPlayer(10);
  chk(P.hp === h0 && P.hlLanternWave === wave, 'it takes the first hit of a wave for you');
  P.iframe = 0; hurtPlayer(10);
  chk(P.hp < h0, 'and only the first');
  wave = 4; P.iframe = 0; const h1 = P.hp; hurtPlayer(10);
  chk(P.hp === h1, 'and the next wave, again');
  bullets.length = 0;
  inputSource = rec => { rec.mx = 0; rec.my = 0; rec.ax = P.x + 300; rec.ay = P.y; rec.trig = true; rec.lmb = true; rec.auto = false; rec.dash = false; rec.press = []; rec.held = ''; rec.touch = false; rec.taim = null; rec.local = false; };
  steps(60);
  inputSource = inputSample;
  const lb = bullets.filter(x => x.hlLantern);
  chk(lb.length >= 2 && lb.every(x => !x.mine && Math.abs(x.dmg) < P.dmg * stanceMul() * 2 * LANTERN_DMG + 1e-6), 'it shoots what you shoot, weakly, and none of it counts as yours', lb.length);
  HL.force = false; state = 'menu';
  return JSON.stringify(C);
})()`));

/* ================================ the hooks =============================== */
/* Twice: on the placeholders in the page, and with hl-art.js loaded, which
   draws the patch and the house and leaves the yard's placeholders standing
   until its art lands. */
const ART = path.join(path.dirname(IDX), 'hl-art.js');
function flyHooks(art) {
  const h = loadGame(IDX, { w: 1280, h: 720 });
  h.run(SETUP);
  if (art) { h.run(fs.readFileSync(ART, 'utf8')); ok(h.run('HL_ART_HS_C !== undefined'), 'hl-art.js is loaded'); }
  const ACT3 = ['hlYardArtTick', 'hlYardEnterFx', 'hlGraveRiseFx', 'hlRisenUpFx', 'hlRisenWindFx', 'hlRisenFireFx', 'hlRisenDownFx',
    'hlDigFx', 'hlPitDigFx', 'hlPitCloseFx', 'hlPitSwallowFx', 'hlBuryFx', 'hlDigDownFx', 'hlDigSproutFx', 'hlDigStoppedFx',
    'hlDigLostFx', 'hlStoneUncoverFx', 'hlBellWindFx', 'hlBellTollFx', 'hlBellDownFx', 'hlRqWindFx', 'hlRqMoveFx', 'hlRqBoltFx',
    'hlRqStopFx', 'hlRqEscapeFx', 'hlRqBackFx', 'hlRqSoulFx', 'hlRqMarchFx', 'hlYardBossDeathFx', 'hlGraveAllyFx', 'hlLagFx',
    'hlYardLights', 'drawHlYardFloor', 'drawHlYardGrave', 'drawHlYardPit', 'drawHlYardGate', 'drawHlYardSoul', 'drawHlYardBody',
    'drawHlYardEBullet', 'drawHlYardGlow', 'drawHlYardTele', 'drawHlYardBossDeath', 'drawHlYardBark', 'drawHlYardHud',
    'drawHlRageQuitBar', 'hlRideFx', 'drawHlRider', 'drawHlWall', 'hlLanternFx', 'drawHlLantern'];
  const OTHERS = ['hlLights', 'drawHlAreaFloor', 'drawHlGlow', 'drawHlBody', 'drawHlEBullet', 'drawHlBossDeath', 'drawHlBark',
    'drawHlTele', 'drawHlAreaHud', 'drawHlPileHud', 'hlAreaEnterFx', 'hlBossDeathFx', 'drawHlBossBar',
    'hlHouseArtTick', 'hlHouseEnterFx', 'hlHouseLights', 'drawHlHouseFloor', 'drawHlHouseWreck', 'drawHlHouseBody',
    'drawHlHouseEBullet', 'drawHlHouseGlow', 'drawHlHouseTele', 'drawHlHouseBossDeath', 'drawHlHouseBark', 'drawHlHouseQuiet',
    'drawHlHouseHud', 'drawHlOnlineHud', 'drawHlDeadGameBar', 'hlHouseBossDeathFx'];
  h.run(`globalThis.__calls = {}; globalThis.__errs = {}; globalThis.__other = {};`);
  for (const n of ACT3)
    h.run(`{ const f = ${n}; ${n} = function (...a) { __calls['${n}'] = (__calls['${n}'] || 0) + 1; try { return f.apply(this, a); } catch (err) { __errs['${n}'] = String(err); throw err; } }; }`);
  for (const n of OTHERS)
    h.run(`{ const f = ${n}; ${n} = function (...a) { if (hlYardOn()) __other['${n}'] = (__other['${n}'] || 0) + 1; return f.apply(this, a); }; }`);
  const missing = ACT3.filter(n => !h.run(`typeof ${n} === 'function'`));
  ok(!missing.length, 'every Act III hook is a function', missing);
  take(h.run(`(() => { ${KIT}
    wipe(); day('2026-10-23');
    const b = book(); b.q = { q1: 2, q2: 2, q3: 2, q4: 2, q5: 1 }; b.medals = ['grave', 'lag']; b.equip = ['grave', 'lag'];
    yard();
    P.maxHp = P.hp = 60000; P.dmg *= 4;
    let k = 0;
    inputSource = rec => {
      k++;
      let t = null, td = 1e9;
      for (const o of enemies) { if (o.dead || o.hacked || o.phased) continue; const d = len(o.x - P.x, o.y - P.y) - (o.hlMarked ? 900 : 0); if (d < td) { td = d; t = o; } }
      rec.mx = t ? Math.sign(t.x - P.x) * 0.5 : 0; rec.my = t ? Math.sign(t.y - P.y) * 0.5 : 0;
      rec.ax = t ? t.x : P.x + 100; rec.ay = t ? t.y : P.y; rec.trig = true; rec.lmb = true; rec.auto = false;
      rec.dash = k % 90 === 0; rec.press = []; rec.held = ''; rec.touch = false; rec.taim = null; rec.local = false;
    };
    let drawErr = null;
    const frame = i => { if (i % 4 === 0) { try { render(); } catch (err) { drawErr = drawErr || String(err && err.stack || err).split('\\n').slice(0, 3).join(' | '); } } return false; };
    steps(60 * 40, frame);                       // the first wave, some of it
    // a pit, and a round into it
    calm();
    const pd = at('gravedigger', 300, 0); hlPitAdd(pd); const p0 = hlArea.pits[hlArea.pits.length - 1];
    hlBulletHit({ mine: true, x: p0.x, y: p0.y, px: p0.x - 200, py: p0.y, r: 3 });
    const bu = at('grunt', 360, 40); killEnemy(bu); steps(30, frame);
    killEnemy(pd); steps(2, frame);
    // a bell, tolling, and put down
    const bell = at('bellringer', 0, 260); bell.hlTollT = 1.1; steps(90, frame); killEnemy(bell); steps(2, frame);
    // the errand: one filling the stone in, drawn; one lost; three felled
    hlDigSprout(); steps(30, frame);
    for (const o of enemies) if (o.hlMarked) { o.state = 3; o.hlFill = 0.999; } steps(2, frame);
    for (let i = 0; i < 3; i++) { hlDigSprout(); for (const o of enemies) if (!o.dead && o.hlMarked) killEnemy(o); steps(2, frame); }
    calm(); hlArea.n = 4; betweenWaves = 0.01;
    steps(60 * 20, frame);                       // his fight
    const e = hlArea && hlArea.boss;
    if (e && !e.dead) {
      const G = hlArea.gates[1];
      e.x = G.x - 200; e.y = G.y; e.hp = e.maxHp * 0.74; steps(20, frame);
      if (e.hlBolt) hlRqEscape(e, G); steps(2, frame);                                                         // out
      steps(60 * 3, frame);
      e.hp = e.maxHp * 0.74; steps(1, frame); steps(60, frame);
      if (e.hlBolt) { damageEnemy(e, e.maxHp * 0.3, false, P.x, P.y); steps(2, frame); }                       // burnt
      e.hp = e.maxHp * 0.49; steps(1, frame); steps(60 * 6, i => { frame(i); return !e.hlBolt; });
      if (e.hlAway) steps(60 * 2, frame);
      e.hlQ = 2; e.hp = e.maxHp * 0.24; steps(60 * 8, i => { frame(i); return e.hlCornered; });              // the last
      steps(60 * 4, frame);
      P.iframe = 99; killEnemy(e); steps(10, frame);
    }
    steps(Math.ceil(HL_END_T * 60) + 5, frame);
    // the medals, in an ordinary run
    exitVigil(); resetGame(); state = 'play'; steps(1, frame);
    for (let i = 0; i < GRAVE_EVERY; i++) killEnemy(at('grunt', 200 + i * 8)); steps(20, frame);
    P.hlLagN = LAG_EVERY - 1; ebullets.push({ x: P.x + 80, y: P.y, vx: 30, vy: 0, r: 4, dmg: 1, life: 9, col: '#fff' }); steps(5, frame);
    // the epilogue: the soul along, twenty, and gone; then the vigil's wall
    b.q.q6 = 2; b.q.q7 = 1; b.equip = ['lantern']; b.medals.push('lantern');
    exitVigil(); resetGame(); state = 'play'; steps(2, frame);
    P.iframe = 0; hurtPlayer(5); steps(30, frame);
    wave = 20; steps(Math.ceil((RIDE_GO_T + 1) * 60), frame);
    state = 'menu'; enterVigil(); steps(60 * 3, frame);
    inputSource = inputSample;
    chk(!drawErr, 'nothing drawn threw', drawErr);
    state = 'menu';
    return JSON.stringify(C);
  })()`));
  const calls = JSON.parse(h.run('JSON.stringify(__calls)')), errs = JSON.parse(h.run('JSON.stringify(__errs)')), other = JSON.parse(h.run('JSON.stringify(__other)'));
  const never = ACT3.filter(n => !calls[n]);
  ok(!never.length, 'every Act III hook is called', never);
  ok(!Object.keys(errs).length, 'and none throws', errs);
  ok(!Object.keys(other).length, 'the patch\'s and the house\'s hooks are never asked to draw the yard', other);
}
section('the hooks');
flyHooks(false);
section('with hl-art.js loaded');
flyHooks(true);

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
