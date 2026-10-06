#!/usr/bin/env node
/* ===========================================================================
   ALL HALLOWS, chapter II — the test: `npm run test:hallows`

   THE HOUSE (index.html, "ALL HALLOWS — BOOK I: THE LOST SOUL · ACT II"),
   played through the game's own functions:

     the chain     quests 3 and 4 are built, wait on their chapter's date, and
                   the soul gives them in order; the wait line by floor
     the quiet     the light closes while nothing dies, a death throws it back
                   out, the lights are on between waves, the last few of a wave
                   are pointed out, and DEAD GAME's dark is darker
     the bodies    a sheet takes its share and lets out what was under it (as
                   kin, for THE HACKER); a lurker runs from the light and takes
                   double in it, and strikes only when the light has closed; a
                   poltergeist lifts, throws, and what it throws comes down
     the errand    three marked sheets, kept across attempts, read in order;
                   one that slips out comes up again
     DEAD GAME     wave five only with the errand done; the room's meter; a
                   ghost under the line; THEY LEFT and how far it reaches; the
                   decoys, worth nothing; the dark at the end; his death, the
                   quest, the medal and the second ascension
     the word      after a death in his fight, a line about how it went
     the medals    SHEET and STILL HERE, and nowhere they should not be
     the menu      the knock when the floor opens, and when it does not
     the hooks     every Act II hook called and none throwing; Act I's never
                   asked to draw the house

   The determinism suite (npm test) flies the house and DEAD GAME too, and
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
  var house = () => { applyChar(0); runSeedNext = 77; hlAreaStart('house'); if (state === 'levelup') { uiArm = 0; handleKey('1'); } };
  // the room emptied, the wave held open (something still owed, nothing sent)
  var calm = () => { for (const e of enemies) if (e.type !== 'boss') e.dead = true; ebullets.length = 0; spawnBudget = 5; spawnT = 1e9; };
  var at = (t, dx, dy, o) => spawnEnemy(t, P.x + (dx || 0), P.y + (dy || 0), o || {});
  var talkAll = () => { for (let i = 0; i < 40 && vig.talk; i++) { vigilInteract(); vigilInteract(); } };
`;

/* =============================== the chain ================================ */
section('the chain');
const g = loadGame(IDX, { w: 1280, h: 720 });
g.run(SETUP);
take(g.run(`(() => { ${KIT}
  wipe();
  chk(!hlQuest('q3').later && !hlQuest('q4').later, 'quests 3 and 4 are built');
  chk(HL_QUESTS.filter(q => q.later).map(q => q.id).join() === 'q5,q6,q7', 'and only chapter III waits', HL_QUESTS.filter(q => q.later).map(q => q.id));
  chk(['sheet', 'stillhere'].every(id => { const m = HL_MEDALS.find(z => z.id === id); return m && !m.later && m.d.length > 40; }), 'SHEET and STILL HERE are on the stand, with what they do');
  chk(HL_AREAS.house && HL_AREAS.house.stage.boss === 'deadgame' && HL_AREAS.house.waveFrom === 11, 'THE HOUSE: waves 11 to 15, and DEAD GAME');

  day('2026-10-10');
  const b = book(); b.q = { q1: 2, q2: 2 }; b.seen = { prologue: 1, first: 1, 'q1:shown': 1, 'q1:done': 1, 'q2:shown': 1, 'q2:done': 1 };
  chk(hlCurrent() === null, 'before 14 Oct the chain waits in front of the house');
  chk(hlWaitLines() === HL_SAY.wait && /house is not open/.test(HL_SAY.wait[0][1]), 'and he says the house is not open');
  enterVigil();
  chk(inVigil, 'the vigil opens');
  vig.near = 'way'; vig.nearI = 1; vigilInteract();
  chk(!hlAreaOn() && vig.said === 'shut', 'the way up to the house is shut');
  exitVigil();

  day('2026-10-14');
  chk(hlCurrent() && hlCurrent().id === 'q3', 'on 14 Oct: LAST MESSAGE');
  enterVigil();
  const s = vigSoulPos(); P.x = s.x; P.y = s.y + 60;
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q3Give[0][1], 'walk up to the soul and it gives it', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlQGiven('q3') && !hlQDone('q3'), 'given');
  b.q.q3 = 2; b.prog.q3 = 3;
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === 'ez. wait. brb.', 'told: the three words', vig.talk && vig.talk.lines[0]);
  talkAll();
  chk(hlSeen('q3:done') && hlSoulShown() === 2, 'an errand changes nothing of where the soul stands');
  steps(2);
  chk(vig.talk && vig.talk.lines[0][1] === HL_SAY.q4Give[0][1], 'then STILL HERE');
  talkAll();
  b.q.q4 = 2;
  steps(2);
  chk(!!vig.asc && vig.asc.to === 2, 'DEAD GAME down: the soul rises to the second landing');
  steps(Math.ceil(HL_ASC_T * 60) + 2);
  chk(vig.talk && /He's wrong/.test(vig.talk.lines[0][1]), 'and says so, in its own voice', vig.talk && vig.talk.lines[0]);
  chk(hlSoulShown() === 3 && hlLandingShown() === 2, 'whole now: stage 3, landing 2');
  talkAll();
  chk(hlCurrent() === null && hlWaitLines() === HL_SAY.waitYard, 'and then the yard is not open yet');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* =============================== the quiet ================================ */
section('the quiet');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-14'); book().q = { q1: 2, q2: 2, q3: 1 };
  house(); P.iframe = 1e9;
  chk(hlHouseOn() && stage.name === 'THE HOUSE', 'in THE HOUSE');
  chk(hlArea.quiet.r === QUIET.max && hlArea.wreck.length === WRECK_JUNK, 'lit, with things lying about', [hlArea.quiet.r, hlArea.wreck.length]);
  steps(400, () => hlArea.n >= 1);
  calm();
  const r0 = hlArea.quiet.r;
  steps(Math.round((QUIET.grace + QUIET.hold) * 60) - 10);
  chk(hlArea.quiet.r === QUIET.max && r0 === QUIET.max, 'a wave starts in the light, and holds it a moment', [r0, hlArea.quiet.r]);
  steps(Math.round((QUIET.dark - QUIET.hold) * 60) + 30);
  chk(hlArea.quiet.r <= QUIET.hull + 1 && hlArea.quiet.dark, 'four seconds with nothing dying: dark past the hull', hlArea.quiet.r);
  steps(60 * 6);
  chk(Math.abs(hlArea.quiet.r - QUIET.min) < 1, 'and it keeps closing', hlArea.quiet.r);
  chk(hlQuietK() > 0.99, 'as dark as it goes', hlQuietK());
  const e = at('grunt', 40); killEnemy(e);
  steps(30);
  chk(hlArea.quiet.r > 450, 'a death throws it back out', hlArea.quiet.r);
  steps(Math.round(QUIET.dark * 60) + 60);
  const two = at('grunt', 600); const three = at('grunt', -600); spawnBudget = 0; two.spd = three.spd = 0;
  steps(Math.round(QUIET.minT * 60));
  chk(hlArea.last && Math.abs(hlArea.quiet.r - QUIET.hull) < 1, 'the last few of a wave: the dark stops at the hull', [hlArea.last, hlArea.quiet.r]);
  two.dead = true; three.dead = true; steps(2);
  spawnBudget = 0; steps(200, () => betweenWaves > 0);
  steps(30);
  chk(betweenWaves > 0 && hlArea.quiet.r > 500, 'between waves the lights are on', [betweenWaves, hlArea.quiet.r]);
  hlArea.blackout = true; hlArea.quiet.t = 2; hlArea.n = 2; hlArea.quiet.wave = 2; betweenWaves = 0; spawnBudget = 5; spawnT = 1e9;
  steps(1);
  chk(hlArea.quiet.r <= QUIET_BLACK.max && hlArea.quiet.r < hlQuietCurve(2, QUIET), 'DEAD GAME\\'s dark is darker, and faster', hlArea.quiet.r);
  hlArea.blackout = false;
  chalQuit(); hlArea = null;
  chk(hlQuietR() === 0 && hlQuietK() === 0, 'outside the house there is no quiet');
  return JSON.stringify(C);
})()`));

/* =============================== the bodies =============================== */
section('the bodies');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-14'); book().q = { q1: 2, q2: 2, q3: 1 };
  house(); steps(400, () => hlArea.n >= 1); calm();
  // SHEET
  const sb = at('sheet', 300, 0, { under: 'brute', elite: false }), lone = at('brute', -300, 0, { elite: false });
  const share = sb.maxHp / (sb.maxHp + lone.maxHp);
  chk(Math.abs(share - SHEET_SOAK) < 0.01, 'a sheet takes the first 40% of the whole', share);
  chk(sb.r > ETYPE.sheet.r && sb.hlUnder === 'brute', 'and is the size of what is under it', [sb.r, sb.hlUnder]);
  chk(!hackable(sb), 'a sheet is cloth: nothing to hack');
  lone.dead = true;
  killEnemy(sb);
  const out = enemies.find(o => !o.dead && o.hlUnsheeted);
  chk(out && out.type === 'brute' && !out.hacked, 'torn: what was under it is out', out && out.type);
  calm();
  const rolls = {};
  for (let i = 0; i < 300; i++) { const s = at('sheet', 400); rolls[s.hlUnder] = 1; s.dead = true; }
  chk(Object.keys(rolls).every(k => SHEET_UNDER.some(p => p[0] === k)) && Object.keys(rolls).length >= 8, 'anything from the main roster can be under one', Object.keys(rolls));
  steps(2);
  const was = P.hacker; P.hacker = true;
  const sh = at('sheet', 300, 0, { under: 'spitter' }); killEnemy(sh);
  const kin = enemies.find(o => !o.dead && o.hlUnsheeted && o.type === 'spitter');
  chk(kin && kin.hacked && kin.hackKin, 'THE HACKER\\'s tear: it gets up on your side, as kin', kin && [kin.hacked, kin.hackKin]);
  P.hacker = was; calm(); steps(2);

  // LURKER
  hlArea.quiet.t = -5; steps(2);
  const lk = at('lurker', 200);
  steps(2);
  chk(lk.hlLit && !lk.hlDark, 'a lurker inside the light is lit');
  steps(20);
  chk(lk.state === 3 && len(lk.x - P.x, lk.y - P.y) > 200, 'and runs from it', [lk.state, Math.round(len(lk.x - P.x, lk.y - P.y))]);
  const h0 = lk.hp; damageEnemy(lk, 10, false, P.x, P.y); const lit = h0 - lk.hp;
  lk.x = P.x + 2000; steps(2);
  const h1 = lk.hp; damageEnemy(lk, 10, false, P.x, P.y); const dark = h1 - lk.hp;
  chk(Math.abs(lit / dark - LURK_LIT_MUL) < 0.01 && lk.hlDark, 'it takes double in the light', [lit, dark]);
  lk.dead = true; steps(2);
  // with the light wide it waits past it, out of reach; when it closes, it comes
  hlArea.quiet.t = -100; steps(2);
  const lw = at('lurker', 700); lw.cd = 0;
  let struck = false;
  steps(240, () => { if (lw.state === 2) struck = true; hlArea.quiet.t = -100; return false; });
  chk(!struck && len(lw.x - P.x, lw.y - P.y) > LURK_REACH, 'with the deaths coming it stays off you', Math.round(len(lw.x - P.x, lw.y - P.y)));
  hlArea.quiet.t = 0;
  steps(600, () => { if (lw.state === 2) struck = true; return struck; });
  chk(struck, 'when the light closes in, it strikes from the dark');
  calm(); steps(2);

  // POLTERGEIST
  hlArea.wreck.length = 0;
  const pg = at('poltergeist', 300); pg.cd = 0;
  steps(30);
  chk(pg.state === 0 && !pg.hlHold, 'nothing lying about: a poltergeist has nothing to throw');
  const w = hlWreckAdd({ x: pg.x + 40, y: pg.y, r: 16, col: '#94a3b8', sides: 4, kind: 'junk', junk: 0, type: null });
  steps(60, () => pg.state === 1);
  chk(pg.state === 1 && pg.hlHold === w.id && w.by === pg.id, 'something lying about: it lifts it');
  let thrown = null;
  steps(90, () => (thrown = ebullets.find(b => b.hlKind === 'wreck')));
  chk(thrown && !hlArea.wreck.includes(w), 'and throws it', !!thrown);
  P.x = arena.x0 + 40; P.y = arena.y0 + 40; P.iframe = 99;
  steps(Math.round(POLT_FLY * 60) + 5);
  chk(!ebullets.includes(thrown) && hlArea.wreck.some(o => o.kind === 'junk'), 'what it threw comes down where it got to, to be thrown again');
  const w2 = hlArea.wreck[0]; pg.cd = 0; pg.state = 0;
  steps(400, () => pg.state === 1);
  killEnemy(pg);
  chk(hlArea.wreck.every(o => !o.by), 'felled with something up: it falls');
  P.iframe = 0;
  const kills0 = hlArea.wreck.filter(o => o.kind === 'body').length;
  killEnemy(at('grunt', 100));
  chk(hlArea.wreck.filter(o => o.kind === 'body').length === kills0 + 1, 'every death leaves something lying about');
  chalQuit(); hlArea = null;
  return JSON.stringify(C);
})()`));

/* =============================== the errand =============================== */
section('the errand');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-14'); book().q = { q1: 2, q2: 2, q3: 1 };
  house(); steps(400, () => hlArea.n >= 1); calm();
  chk(hlArea.coldDue === 0, 'nothing marked in the first wave');
  betweenWaves = 0.01; steps(3);
  chk(hlArea.n === 2 && hlArea.coldDue > 0, 'the second wave owes a marked sheet', [hlArea.n, hlArea.coldDue]);
  calm();
  steps(Math.ceil(hlArea.coldDue * 60) + 2);
  let m = enemies.find(o => !o.dead && o.hlMarked);
  chk(m && m.dmg === 0 && !m.hlUnder, 'it comes: nothing under it, and it never touches you');
  chk(len(m.x - P.x, m.y - P.y) > 300, 'in front of you, not on you');
  const d0 = len(m.x - P.x, m.y - P.y);
  P.x = m.x - 200; P.y = m.y; steps(60);
  chk(len(m.x - P.x, m.y - P.y) > 260, 'it runs from you', Math.round(len(m.x - P.x, m.y - P.y)));
  m.t = MARK_ESCAPE; steps(2);
  chk(m.dead && hlProgress('q3') === 0 && hlArea.coldLive === 0, 'left long enough, it slips out', [m.dead, hlProgress('q3')]);
  for (let i = 0; i < 2; i++) { hlMarkSprout(); const s = enemies.find(o => !o.dead && o.hlMarked); killEnemy(s); }
  chk(hlProgress('q3') === 2 && !hlQDone('q3'), 'two torn: two lines', hlProgress('q3'));
  // a death in the house keeps them
  chalQuit(); hlArea = null;
  house(); steps(400, () => hlArea.n >= 1); calm();
  hlArea.n = 1; betweenWaves = 0.01; steps(3);
  chk(hlArea.coldDue > 0, 'next attempt: the third is still owed');
  hlMarkSprout(); killEnemy(enemies.find(o => !o.dead && o.hlMarked));
  chk(hlQDone('q3') && book().medals.includes('sheet') && book().candles === 10, 'the third: LAST MESSAGE, 10 candles and SHEET', [hlQDone('q3'), book().medals, book().candles]);
  chk(HL_LAST_CHAT.join(' ') === 'ez wait brb', 'and they read ez, wait, brb');
  calm(); hlArea.n = 2; betweenWaves = 0.01; steps(3);
  steps(60 * 10);
  chk(!enemies.some(o => !o.dead && o.hlMarked), 'once done, no more come');
  chalQuit(); hlArea = null;
  // wave five without the errand: the house lets you go
  wipe(); book().q = { q1: 2, q2: 2, q3: 1 };
  house(); steps(400, () => hlArea.n >= 1); calm();
  hlArea.n = 4; betweenWaves = 0.01; steps(3);
  chk(hlArea.end && hlArea.end.why === 'errand' && !enemies.some(o => !o.dead && o.boss), 'wave five with the errand open: THE HOUSE LETS YOU GO');
  steps(Math.ceil(HL_END_T * 60) + 5);
  chk(inVigil, 'and it is back to the vigil');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* =============================== DEAD GAME ================================ */
section('DEAD GAME');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-14'); book().q = { q1: 2, q2: 2, q3: 2, q4: 1 };
  house(); steps(400, () => hlArea.n >= 1); calm();
  hlArea.n = 4; betweenWaves = 0.01; steps(3);
  const e = hlArea.boss;
  chk(e && e.boss === 'deadgame' && bossAlive, 'wave five, the errand done: DEAD GAME');
  chk(Math.abs(hlArea.online - DG_ONLINE0) < 0.01, 'he comes as the room stands: nearly empty', hlArea.online);
  steps(2);
  chk(!e.hlSolid && e.invuln && e.phased, 'under the line: a ghost');
  const hp0 = e.hp; damageEnemy(e, e.maxHp * 0.2, false, P.x, P.y);
  chk(e.hp === hp0, 'nothing touches a ghost');
  chk(hlBarks.some(b => b.e === e && b.text === HL_BARK.deadgame.enter[0]), 'he says so as he comes in');
  // the room
  const on1 = hlArea.online;
  for (let i = 0; i < 2; i++) killEnemy(at('grunt', 300));
  chk(Math.abs(hlArea.online - on1 - 2 * DG_KILL) < 1e-9, 'every death puts some back', [on1, hlArea.online]);
  steps(2);
  chk(e.hlSolid && !e.invuln && !e.phased, 'over the line he is in the room');
  damageEnemy(e, e.maxHp * 0.1, false, P.x, P.y);
  chk(e.hp < hp0, 'and can be hurt', [e.hp, hp0]);
  const o1 = hlArea.online; steps(60);
  chk(Math.abs(o1 - hlArea.online - DG_DRAIN) < 0.01, 'it drains all the time', [o1, hlArea.online]);
  hlArea.online = 0; steps(2);
  const hlo = e.hp; steps(120);
  chk(e.hp > hlo && !e.hlSolid, 'a ghost mends', [hlo, e.hp]);
  // THEY LEFT
  calm(); spawnBudget = 0; spawnT = 1e9;
  const nearOnes = [0, 1, 2].map(i => at('grunt', 0, 0)); nearOnes.forEach((o, i) => { o.x = e.x + 120 + i * 30; o.y = e.y; o.spd = 0; });
  const far = at('grunt'); far.x = e.x + DG_CULL_R + 300; far.y = e.y; far.spd = 0;
  const yours = at('grunt'); yours.x = e.x + 60; yours.y = e.y; yours.hacked = true; yours.spd = 0;
  e.hlCullT = 0; steps(2);
  chk(hlArea.cull && hlBarks.some(b => b.text === HL_BARK.deadgame.cull), 'THEY LEFT: called, and said');
  const xp0 = gems.length, k0 = P.kills, on0 = hlArea.online;
  steps(Math.ceil((DG_CULL_WARN + DG_CULL_R / DG_CULL_SPD) * 60) + 5, () => { far.x = e.x + DG_CULL_R + 300; far.y = e.y; return false; });
  chk(nearOnes.every(o => o.dead), 'what of his it reaches is gone');
  chk(!far.dead, 'what is further than it reaches is not');
  chk(!yours.dead, 'and what is yours is not his to take');
  chk(gems.length === xp0 && P.kills === k0 && hlArea.online <= on0, 'taken back pays nothing, and lights nothing');
  chk(HL.fight.culled >= 3, 'the fight counts them', HL.fight.culled);
  far.dead = true; yours.dead = true;
  // LAST SEEN
  hlArea.online = 0; e.hlDecoyT = 0; steps(2);
  const dec = enemies.find(o => !o.dead && o.type === 'lastseen');
  chk(!!dec, 'a ghost leaves LAST SEEN marks');
  chk(!Codex.e.has('lastseen'), 'which are nobody: never written down');
  const g0 = gems.length, k1 = P.kills, o2 = hlArea.online;
  damageEnemy(dec, dec.maxHp * 2, false, P.x, P.y);
  chk(dec.dead && gems.length === g0 && P.kills === k1 && hlArea.online === o2 && HL.fight.popped === 1, 'shot: gone, worth nothing', [dec.dead, gems.length - g0, P.kills - k1]);
  chk(hlWaveThreats() === 1, 'and none of them hold the wave (he does)', hlWaveThreats());
  // the dark
  hlArea.online = 1; steps(2);
  e.hp = e.maxHp * (DG_DARK_AT - 0.01); steps(2);
  chk(hlArea.blackout && hlBarks.some(b => b.text === HL_BARK.deadgame.soul) && HL.fight.darkAt >= 0, 'at a third: the house goes dark, and he says the soul\\'s line');
  hlArea.online = 0; steps(2); const hd = e.hp; steps(120);
  chk(e.hp === hd, 'in the dark at the end he does not mend');
  // his moves, only while solid
  hlArea.online = 1; calm(); e.dead = false; enemies.push(e); e.atkT = 0; e.hlWind = null; e.hlThread = null;
  steps(90);
  chk(ebullets.some(b => b.hlKind === 'reply'), 'solid, he answers: replies');
  // down
  ebullets.length = 0; P.iframe = 99;
  killEnemy(e);
  chk(hlQDone('q4') && book().medals.includes('stillhere') && book().candles === 15, 'DEAD GAME down: STILL HERE, 15 candles and the medal', [hlQDone('q4'), book().medals, book().candles]);
  chk(hlArea.end && hlArea.end.why === 'win' && !hlArea.blackout && !hlArea.cull, 'the lights come back up');
  chk(hlBarks.some(b => b.text === HL_BARK.deadgame.death), '...still here, though.');
  steps(Math.ceil(HL_END_T * 60) + 5);
  chk(inVigil, 'back to the vigil');
  exitVigil();
  return JSON.stringify(C);
})()`));

/* ================================ the word ================================ */
section('the word after');
take(g.run(`(() => { ${KIT}
  wipe(); day('2026-10-14'); book().q = { q1: 2, q2: 2, q3: 2, q4: 1 };
  const die = (f, hpk) => {
    house(); steps(400, () => hlArea.n >= 1); calm();
    hlArea.n = 4; betweenWaves = 0.01; steps(3);
    const e = hlArea.boss; Object.assign(HL.fight, f); e.hp = e.maxHp * (hpk || 1);
    P.iframe = 0; P.revive = 0; P.hp = 1; hurtPlayer(9999);
    steps(2);
    const S = HL.deadSay;
    chalQuit(); hlArea = null;
    return S;
  };
  let S = die({ solidT: 1, ghostT: 30 });
  chk(state === 'dead' || S, 'a death in his fight');
  chk(S && S.theme === 'ghost' && S.text === HL_SAY.hintDG.ghost[0][1], 'he was a ghost for most of it: about that, obliquely first', S);
  S = die({ solidT: 1, ghostT: 30 });
  chk(S && S.text === HL_SAY.hintDG.ghost[1][1], 'and a little plainer the next time', S);
  chk(hlSeen('hint:dg:ghost:0') && !hlSeen('hint:ghost:0'), 'his are kept apart from THE BACKLOG\\'s');
  S = die({ solidT: 30, ghostT: 30, culled: 8 }); chk(S && S.theme === 'cull', 'he took a great many back', S);
  S = die({ solidT: 30, ghostT: 30, popped: 5 }); chk(S && S.theme === 'decoy', 'spent on the grey ones', S);
  S = die({ solidT: 30, ghostT: 30, darkAt: 5 }, 0.3); chk(S && S.theme === 'dark', 'went down in the dark', S);
  S = die({ solidT: 30, ghostT: 30, darkAt: 5 }, 0.1); chk(S && S.theme === 'close', 'nearly', S);
  S = die({ solidT: 30, ghostT: 30 }); chk(S && S.theme === 'general', 'otherwise', S);
  for (const k of Object.keys(HL_SAY.hintDG)) for (const [who, t] of HL_SAY.hintDG[k])
    if (!(who === 'soul' ? t === t.toLowerCase() : /^[A-Z]/.test(t))) chk(false, 'the soul still lowercase, him in sentences: ' + t);
  return JSON.stringify(C);
})()`));

/* =============================== the medals =============================== */
section('the medals');
take(g.run(`(() => { ${KIT}
  wipe(); HL.day = null; HL.force = true;
  const b = book(); b.medals = ['sheet', 'stillhere']; b.equip = ['sheet', 'stillhere'];
  applyChar(0); resetGame(); state = 'play'; wave = 3;
  steps(1);
  chk(HL.eq.sheet && HL.eq.stillhere, 'worn in an ordinary run');
  // SHEET
  P.dashCh = 1; P.dashT = 0; P.iframe = 0;
  inputSource = rec => { rec.mx = 1; rec.my = 0; rec.dash = true; rec.ax = P.x + 100; rec.ay = P.y; rec.press = []; rec.held = ''; };
  steps(1);
  inputSource = inputSample;
  chk(P.iframe > 0.28 + SHEET_IFRAME - 0.05 && P.hlSheetT > 0.4, 'SHEET: the dash keeps you out of reach longer', [P.iframe, P.hlSheetT]);
  const g1 = at('brute', 0, 0); g1.x = P.x; g1.y = P.y; const hp0 = P.hp, vx0 = P.vx;
  steps(1);
  chk(P.hp === hp0, 'and through bodies while it lasts');
  g1.dead = true;
  P.dashCh = 0; P.dashRe = 0; steps(60);
  chk(Math.abs(P.dashRe - SHEET_RECHARGE) < 0.05, 'it comes back slower', P.dashRe);
  // STILL HERE
  P.revive = 0; P.iframe = 0; P.hp = 1; hurtPlayer(9999);
  chk(state === 'play' && P.hlGhost && P.hp > 0, 'STILL HERE: the killing blow leaves you a ghost');
  const h1 = P.hp; hurtPlayer(9999); hurtPlayer(9999, { pure: true });
  chk(P.hp === h1 && state === 'play', 'nothing touches a ghost');
  const t1 = at('brute', 200, 0, { elite: false }); const m0 = t1.hp; damageEnemy(t1, 10, false, P.x, P.y);
  const t2 = at('brute', 300, 0, { elite: false }); P.hlGhost = null; damageEnemy(t2, 10, false, P.x, P.y); const full = t2.maxHp - t2.hp;
  P.hlGhost = { t: 0, T: GHOST_T, k0: P.kills, kills: 0, need: GHOST_KILLS };
  chk(Math.abs((m0 - t1.hp) / full - GHOST_DMG) < 0.01, 'and hits half as hard', [(m0 - t1.hp), full]);
  t1.dead = t2.dead = true;
  for (let i = 0; i < GHOST_KILLS; i++) killEnemy(at('grunt', 100));
  steps(1);
  chk(!P.hlGhost && Math.abs(P.hp - P.maxHp * GHOST_HP) < 1 && state === 'play', 'ten felled: back up at 30%', P.hp);
  P.revive = 0; P.iframe = 0; P.hp = 1; hurtPlayer(9999);
  chk(state === 'dead' && !P.hlGhost, 'once a run');
  resetGame(); state = 'play'; steps(1);
  P.revive = 0; P.iframe = 0; P.hp = 1; hurtPlayer(9999);
  chk(P.hlGhost && state === 'play', 'a new run, a new one');
  steps(Math.ceil(GHOST_T * 60) + 2);
  chk(state === 'dead' && !P.hlGhost, 'fewer than ten when it ends: the run is over');
  // not in a daily
  resetGame(); Chal.on = { id: 'x', m: {} }; state = 'play'; steps(1);
  chk(!HL.eq.stillhere && !HL.eq.sheet, 'not in a challenge');
  Chal.on = null; HL.force = false; resetGame(); state = 'play'; steps(1);
  chk(!HL.eq.stillhere, 'nor once the event is shut');
  state = 'menu';
  return JSON.stringify(C);
})()`));

/* ================================ the menu ================================ */
section('the menu');
take(g.run(`(() => { ${KIT}
  wipe(); state = 'menu';
  const b = book(); b.seen = { prologue: 1 }; b.q = { q1: 2, q2: 2 };
  day('2026-10-10'); steps(2);
  chk(!HL.pro && hlChapterBeatDue() < 0, 'before the house opens, no knock');
  day('2026-10-14');
  chk(hlChapterBeatDue() === 1, 'the house open, the patch done: the floor is due');
  steps(1);
  chk(HL.pro && HL.pro.name === 'chapter', 'it knocks, through the hatch');
  let said = null;
  steps(60 * 12, () => { const l = HL.pro && HL.pro.line(); if (l) said = l.text; return !HL.pro; });
  chk(said === HL_SAY.ch1[0][1], 'and he says it has gone up a floor', said);
  chk(!HL.pro && hlSeen('ch:1'), 'once');
  steps(2); chk(!HL.pro, 'and not again');
  delete b.seen['ch:1']; steps(1); handleKey('escape');
  chk(!HL.pro && hlSeen('ch:1'), '[ESC] skips it');
  wipe(); book().seen = { prologue: 1 }; book().q = { q1: 2 };
  steps(2); chk(!HL.pro, 'with the patch not done, nothing is asking for you yet');
  // told in the vigil with the floor open: the menu need not knock for it
  book().q.q2 = 2; hlChapterHeard(hlQuest('q2'));
  steps(2); chk(!HL.pro && hlSeen('ch:1'), 'the soul already said so: no knock');
  HL.day = null;
  return JSON.stringify(C);
})()`));

/* ================================ the hooks =============================== */
/* Twice: on the placeholders in the page, and on the art in hl-art.js, which
   the game fetches beside it and which replaces them by name. */
const ART = path.join(path.dirname(IDX), 'hl-art.js');
function flyHooks(art) {
  const h = loadGame(IDX, { w: 1280, h: 720 });
  h.run(SETUP);
  // the art file, as the page loads it: its hooks replace the placeholders by name
  if (art) { h.run(fs.readFileSync(ART, 'utf8')); ok(h.run('HL_ART_HS_C !== undefined && drawHlHouseBody.toString().includes("hlArtHs")'), 'hl-art.js draws the house'); }
  // hooks are global function declarations: replace them by name from outside, as the art file does
  const ACT2 = ['hlHouseArtTick', 'hlHouseEnterFx', 'hlQuietFlareFx', 'hlQuietDarkFx', 'hlSheetTearFx', 'hlMarkSproutFx',
    'hlMarkTornFx', 'hlMarkLostFx', 'hlLurkWindFx', 'hlLurkStrikeFx', 'hlLurkBurnFx', 'hlPoltLiftFx', 'hlPoltThrowFx',
    'hlWreckLandFx', 'hlDgSolidFx', 'hlDgWindFx', 'hlDgCullFx', 'hlDgTakeFx', 'hlDgDecoyFx', 'hlDecoyPopFx', 'hlDgDarkFx',
    'hlHouseBossDeathFx', 'hlSheetDashFx', 'hlGhostFx', 'hlHouseLights', 'drawHlHouseFloor', 'drawHlHouseWreck',
    'drawHlHouseBody', 'drawHlHouseEBullet', 'drawHlHouseGlow', 'drawHlHouseTele', 'drawHlHouseBossDeath', 'drawHlHouseBark',
    'drawHlHouseQuiet', 'drawHlHouseHud', 'drawHlOnlineHud', 'drawHlDeadGameBar', 'drawHlGhostHud'];
  const ACT1 = ['hlLights', 'drawHlAreaFloor', 'drawHlGlow', 'drawHlBody', 'drawHlEBullet', 'drawHlBossDeath', 'drawHlBark',
    'drawHlTele', 'drawHlAreaHud', 'drawHlPileHud', 'hlAreaEnterFx', 'hlBossDeathFx', 'drawHlBossBar'];
  h.run(`globalThis.__calls = {}; globalThis.__errs = {}; globalThis.__act1 = {};`);
  for (const n of ACT2)
    h.run(`{ const f = ${n}; ${n} = function (...a) { __calls['${n}'] = (__calls['${n}'] || 0) + 1; try { return f.apply(this, a); } catch (err) { __errs['${n}'] = String(err); throw err; } }; }`);
  for (const n of ACT1)
    h.run(`{ const f = ${n}; ${n} = function (...a) { if (hlHouseOn()) __act1['${n}'] = (__act1['${n}'] || 0) + 1; return f.apply(this, a); }; }`);
  const missing = ACT2.filter(n => !h.run(`typeof ${n} === 'function'`));
  ok(!missing.length, 'every Act II hook is a function', missing);
  // a whole house, drawn: the errand, the boss, the medals
  take(h.run(`(() => { ${KIT}
    wipe(); day('2026-10-14');
    const b = book(); b.q = { q1: 2, q2: 2, q3: 1 }; b.medals = ['sheet', 'stillhere']; b.equip = ['sheet', 'stillhere'];
    house();
    P.maxHp = P.hp = 60000; P.dmg *= 4;
    let k = 0;
    inputSource = rec => {
      k++;
      let t = null, td = 1e9;
      for (const o of enemies) { if (o.dead || o.hacked) continue; const d = len(o.x - P.x, o.y - P.y) - (o.hlMarked ? 900 : 0); if (d < td) { td = d; t = o; } }
      rec.mx = t ? Math.sign(t.x - P.x) * 0.5 : 0; rec.my = t ? Math.sign(t.y - P.y) * 0.5 : 0;
      rec.ax = t ? t.x : P.x + 100; rec.ay = t ? t.y : P.y; rec.trig = true; rec.lmb = true; rec.auto = false;
      rec.dash = k % 90 === 0; rec.press = []; rec.held = ''; rec.touch = false; rec.taim = null; rec.local = false;
    };
    let drawErr = null;
    const frame = i => { if (i % 4 === 0) { try { render(); } catch (err) { drawErr = drawErr || String(err && err.stack || err).split('\\n').slice(0, 3).join(' | '); } } return false; };
    steps(60 * 40, frame);                       // the first wave, some of it
    hlMarkSprout(); steps(30, frame);            // a marked one, drawn
    for (const o of enemies) if (o.hlMarked) { o.t = MARK_ESCAPE; } steps(2, frame);   // and one slipping out
    hlMarkSprout(); for (const o of enemies) if (!o.dead && o.hlMarked) killEnemy(o); steps(2, frame);
    b.q.q3 = 2; calm(); hlArea.n = 4; betweenWaves = 0.01;
    steps(60 * 60, frame);                       // his fight
    const e = hlArea && hlArea.boss;
    if (e && !e.dead) {
      hlArea.online = 0; e.hlDecoyT = 0; steps(30, frame);
      for (const o of enemies) if (!o.dead && o.type === 'lastseen') damageEnemy(o, 1e6, false, P.x, P.y);
      e.hlCullT = 0; for (let i = 0; i < 4; i++) at('grunt', 200 + i * 20); steps(180, frame);
      hlArea.online = 1; e.hp = e.maxHp * 0.3; steps(120, frame);
      P.iframe = 99; killEnemy(e); steps(10, frame);
    }
    steps(Math.ceil(HL_END_T * 60) + 5, frame);
    // the ghost, in an ordinary run
    exitVigil(); resetGame(); state = 'play'; steps(1, frame);
    P.revive = 0; P.iframe = 0; P.hp = 1; hurtPlayer(9999); steps(30, frame);
    inputSource = inputSample;
    chk(!drawErr, 'nothing drawn threw', drawErr);
    state = 'menu';
    return JSON.stringify(C);
  })()`));
  const calls = JSON.parse(h.run('JSON.stringify(__calls)')), errs = JSON.parse(h.run('JSON.stringify(__errs)')), act1 = JSON.parse(h.run('JSON.stringify(__act1)'));
  const never = ACT2.filter(n => !calls[n]);
  ok(!never.length, 'every Act II hook is called', never);
  ok(!Object.keys(errs).length, 'and none throws', errs);
  ok(!Object.keys(act1).length, 'Act I\'s hooks (the patch\'s) are never asked to draw the house', act1);
}
section('the hooks');
flyHooks(false);
section('the art (hl-art.js)');
flyHooks(true);

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
