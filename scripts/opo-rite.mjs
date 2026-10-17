#!/usr/bin/env node
/* ===========================================================================
   VOIDRUNNER'S RITE — its test: `npm run test:opo-rite` (ONE-POINT-OH-RITE-PLAN.md)

   The game in Node (scripts/lib/game-vm.mjs), no browser.

     the switch    RITES.runner has a start: the statue, unlock-evo and the
                   achievement line all see the rite as built
     the open      he takes the build: every card off, the ship on its first
                   numbers; then the first piece comes back by itself
     the rule      the base round goes through him unspent; a round from a
                   whole hull lands for OPR_HIT, whatever the build
     the pieces    one more at each seam, in the order it grew them; a revert
                   takes the newest, the plating eats one, a graze grows one
                   back, and in HE KEEPS IT what he takes is his until you
                   shoot it loose
     the duel      every piece back into his set, his copy out of the tube,
                   rounds met, the marked one, the wake granted on its frame,
                   guns grown, the copy broken, the card, the menu
     the jumps     oprJump(0..4) opens each sequence as it would arrive
     left          a rite left is cleared by the next run
     the hooks     every OPR_ART hook is drawn on the way, and none throws

   Whether the rite stays in step and survives a snapshot is
   scripts/determinism.mjs ('rite-runner').
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

// a copy of the game, its rite's art hooks counted
function game() {
  const g = loadGame(IDX, { w: 1280, h: 720 });
  g.run(`pageDead = true; Save.profile.name = 'PILOT'; Save.profile.gfxSeen = GFX_VER; state = 'menu';
    globalThis.__art = {};
    for (const k of Object.keys(OPR_ART)) { const f = OPR_ART[k]; OPR_ART[k] = (...a) => { __art[k] = (__art[k] || 0) + 1; return f(...a); }; }`);
  return g;
}
const artSeen = {};
const takeArt = g => { for (const [k, n] of Object.entries(JSON.parse(g.run(`JSON.stringify(__art)`)))) artSeen[k] = (artSeen[k] || 0) + n; };
// a run on VOIDRUNNER with a few cards, taken into the rite
function enter(g, seed = 7) {
  g.run(`applyChar(CHARS.findIndex(c => c.id === 'runner')); runSeedNext = ${seed}; resetGame(); state = 'play';
    P.up.rate = 2; P.up.dmg = 1; UPGRADES.find(u => u.id === 'rate').f(P); UPGRADES.find(u => u.id === 'rate').f(P); UPGRADES.find(u => u.id === 'dmg').f(P);
    enterRite('runner');`);
}
// a bot: fires at him (or his copy), and weaves
const BOT = `inputSource = rec => { rec.mx = Math.sin(uiTime * 1.3); rec.my = Math.cos(uiTime * 0.7) * 0.4; rec.trig = true; rec.lmb = true; rec.auto = false; rec.dash = false;
  rec.touch = false; rec.taim = null; rec.local = false; rec.press = []; rec.held = '';
  const t = orite ? (orite.duel && orite.duel.copy ? orite.duel.copy : { x: orite.hx, y: orite.hy }) : { x: P.x, y: P.y - 200 };
  rec.ax = t.x; rec.ay = t.y; };`;
const STILL = `inputSource = rec => { rec.mx = 0; rec.my = 0; rec.trig = false; rec.lmb = false; rec.auto = false; rec.dash = false;
  rec.touch = false; rec.taim = null; rec.local = false; rec.press = []; rec.held = ''; rec.ax = P.x; rec.ay = P.y - 200; };`;
const steps = (g, n, draw) => g.run(`(() => { for (let i = 0; i < ${n}; i++) {
  if (state === 'levelup') { uiArm = 0; handleKey('1'); }
  update(${STEP}); ${draw ? 'if (i % 6 === 0) render();' : ''} } return state; })()`);
const J = (g, code) => JSON.parse(g.run(`JSON.stringify(${code})`));

/* ================================ the switch ================================ */
section('the switch');
{
  const g = game();
  ok(g.run(`riteBuilt('runner')`), 'RITES.runner has a start: the rite is built');
  ok(J(g, `RITES.runner.seqs()`).join() === 'putback,remember,paint,keep,oneship', 'five sequences, by id', J(g, `RITES.runner.seqs()`));
  ok(g.run(`Object.keys(RITES).filter(id => riteBuilt(id)).includes('runner')`), 'unlock-evo and the statue see it');
  g.run(`hubSyncState && hubSyncState()`);
  ok(g.run(`typeof hubState !== 'object' || hubState.runner !== 'veiled'`), 'its statue is no longer veiled', g.run(`JSON.stringify(hubState)`));
}

/* ================================= the open ================================= */
section('the open, and the rule');
{
  const g = game();
  enter(g);
  ok(g.run(`oprOn() && orite.stage === 'open'`), 'enterRite opens it');
  const before = J(g, `{ up: Object.keys(P.up).length, rate: P.fireRate }`);
  g.run(STILL);
  steps(g, Math.round(60 * 1.4));
  const took = J(g, `{ up: Object.keys(P.up).length, rate: P.fireRate, base: newPlayer().fireRate, cards: orite.cards.length }`);
  ok(before.up > 0 && took.up === 0 && took.cards > 0, 'he takes the build: every card off, into his set', [before, took]);
  ok(Math.abs(took.rate - took.base) < 1e-9 && before.rate > took.base, 'the ship on its own first numbers', [before, took]);
  steps(g, Math.round(60 * 1.6));
  ok(J(g, `orite.have`).join() === 'true,false,false,false' && g.run(`orite.due`) === 1, 'the first piece comes back by itself', J(g, `orite.have`));
  steps(g, 60 * 3);
  ok(g.run(`orite.stage === 'fight' && orite.seq === 0`), 'then HE PUTS IT BACK', J(g, `{ stage: orite.stage, seq: orite.seq }`));
  // the base round: nothing back, and it passes through him unspent
  g.run(`orite.have = [false, false, false, false]; orite.seqT = 99; bullets.length = 0;
    fireBullet(orite.hx, orite.hy + 60, -Math.PI / 2, 1); globalThis.__b = bullets[bullets.length - 1];`);
  const hp0 = g.run(`orite.hp`);
  steps(g, 6);
  ok(g.run(`orite.hp`) === hp0, 'the base round does not hurt him', [hp0, g.run(`orite.hp`)]);
  ok(g.run(`bullets.includes(__b) || __b.life <= 0 || (__b.hits && __b.hits.has(orite.e.id))`), 'and it goes through him unspent');
  // a whole hull: a round lands for OPR_HIT, whatever the build
  g.run(`orite.have = [true, false, false, false]; P.dmg = 9999; bullets.length = 0; orite.sweeps.length = 0; orite.panes.length = 0;
    fireBullet(orite.hx, orite.hy + 60, -Math.PI / 2, 1);`);
  const hp1 = g.run(`orite.hp`);
  steps(g, 6);
  ok(Math.abs(hp1 - g.run(`orite.hp`) - g.run(`OPR_HIT`)) < 1e-6, 'a round from a whole hull lands for OPR_HIT, whatever the build', [hp1, g.run(`orite.hp`)]);
  // and a sequence holds at its line until it has shown itself
  g.run(`orite.seqT = 0; orite.hp = OPR_HP * 0.8 + 2; bullets.length = 0; for (let k = 0; k < 4; k++) fireBullet(orite.hx - 6 + k * 4, orite.hy + 60, -Math.PI / 2, 1);`);
  steps(g, 8);
  ok(g.run(`orite.hp >= OPR_HP * 0.8 && orite.seq === 0`), 'a sequence holds at its line until it has run OPR_SEQ_MIN', g.run(`orite.hp`));
  takeArt(g);
}

/* ================================ the pieces ================================ */
section('the pieces');
{
  const g = game();
  enter(g);
  g.run(STILL);
  g.run(`oprJump(0)`); steps(g, 2);
  // a revert reaching the hull: the plating takes the first
  g.run(`orite.guardT = 0; oprCatch(orite, 'sweep');`);
  ok(J(g, `orite.have`)[0] === true && g.run(`orite.guardT > 0`), 'the plating takes a revert, and nothing is lost');
  g.run(`P.iframe = 0; P.dashT = 0; oprCatch(orite, 'sweep');`);
  ok(J(g, `orite.have`)[0] === false && g.run(`orite.lost.length === 1`), 'the next takes the newest piece, to the floor', J(g, `{ have: orite.have, lost: orite.lost }`));
  // a graze grows it back
  g.run(`orite.graze = 0; for (let k = 0; k < 7; k++) oprGraze(orite, OPR.pays.edge, 'test');`);
  ok(J(g, `orite.have`)[0] === true && g.run(`orite.lost.length === 0`), 'grazes fill GRAZE, and a full meter grows it back', J(g, `{ have: orite.have, graze: orite.graze }`));
  // dashed through: a graze, nothing lost
  g.run(`orite.guardT = 99; P.dashT = 0.2; const gz = orite.graze; oprCatch(orite, 'sweep'); globalThis.__gz = orite.graze - gz; P.dashT = 0;`);
  ok(J(g, `orite.have`)[0] === true && g.run(`__gz`) > 0, 'dashed through, it is a graze');
  // the seams: one more piece each, in the order it grew them
  for (let i = 1; i <= 3; i++) {
    g.run(`orite.seqT = 99; orite.hp = OPR_HP * OPR_SEQ[${i - 1}].until - 0.1;`);
    steps(g, 2);
    ok(g.run(`orite.seq`) === i && g.run(`orite.due`) === i + 1 && J(g, `orite.have`)[i] === true,
       'at the seam into ' + ['', 'HE REMEMBERS IT', 'HE PAINTS IT OVER', 'HE KEEPS IT'][i] + ': ' + ['', 'a second barrel', 'the lattice', 'the core'][i], J(g, `{ seq: orite.seq, due: orite.due, have: orite.have }`));
  }
  // the pieces at work
  steps(g, 30);
  ok(g.run(`P.count`) === 2, 'the barrel: rounds in pairs');
  g.run(`P.x += 1; for (let k = 0; k < 20; k++) { P.x += 6; update(${STEP}); }`);
  ok(g.run(`orite.trail.length`) > 3, 'the lattice: light left behind the hull', g.run(`orite.trail.length`));
  // HE KEEPS IT: what he takes is his, until you shoot his set
  g.run(`orite.seam = 0; orite.guardT = 99; P.iframe = 0; P.dashT = 0; oprCatch(orite, 'pane');`);
  ok(J(g, `orite.kept`).join() === '3' && g.run(`orite.lost.length === 0`), 'in HE KEEPS IT, the piece goes into his set', J(g, `{ kept: orite.kept, lost: orite.lost }`));
  g.run(`orite.seam = 0; for (let k = 0; k < OPR.keepHits; k++) oprStruck(orite.e, { x: orite.hx, y: orite.hy });`);
  ok(J(g, `orite.have`)[3] === true && g.run(`orite.kept.length === 0`), 'and OPR.keepHits rounds on the set work it loose');
  // all four in his set: rounds still work them loose, though none can hurt him
  g.run(`orite.have = [false, false, false, false]; orite.kept = [0, 1, 2, 3]; orite.keepHits = 0;`);
  const hp = g.run(`orite.hp`);
  g.run(`for (let k = 0; k < OPR.keepHits; k++) oprStruck(orite.e, { x: orite.hx, y: orite.hy });`);
  ok(J(g, `orite.have`)[0] === true && g.run(`orite.hp`) === hp, 'with nothing back, shooting the set still frees the first piece, and does not hurt him');
  takeArt(g);
}

/* ================================= the duel ================================= */
section('ONE SHIP, played to the card');
{
  const g = game();
  enter(g);
  g.run(`P.maxHp = P.hp = 60000; ${BOT}`);
  g.run(`oprJump(4)`);
  steps(g, 2, true);
  ok(g.run(`!!orite.duel && orite.duel.ph === 'take'`) && J(g, `orite.have`).every(h => !h), 'every piece back into his set at once', J(g, `{ duel: !!orite.duel, have: orite.have }`));
  const seen = { ph: new Set(), met: 0, awakeAt: null, wokeBeforeCard: false, grew: 0, card: false, shots: 0, beams: 0 };
  for (let s = 0; s < 150 && g.run(`!!orite`); s++) {
    steps(g, 30, true);
    const x = J(g, `orite && { ph: orite.duel && orite.duel.ph, n: orite.duel && orite.duel.n, awake: isAwake('runner'), card: !!rsCard,
      grow: orite.duel ? orite.duel.grow.length : 0, gs: orite.duel ? orite.duel.gshots.length : 0, gb: orite.duel ? orite.duel.gbeams.length : 0, stage: orite.stage }`);
    if (!x) break;
    if (x.ph) seen.ph.add(x.ph);
    seen.met = Math.max(seen.met, x.n || 0);
    seen.grew = Math.max(seen.grew, x.grow);
    seen.shots += x.gs; seen.beams += x.gb;
    if (x.awake && !x.card && !seen.card) seen.wokeBeforeCard = true;
    if (x.card) seen.card = true;
    if (g.run(`state`) === 'menu') break;
  }
  ok(['take', 'out', 'even', 'mark', 'awake', 'finish'].every(p => seen.ph.has(p)), 'the duel\'s beats: take, out, even, mark, awake, finish', [...seen.ph]);
  ok(seen.met >= g.run(`OPR_DUEL.wake`), 'rounds met, dead even, before the marked one', seen.met);
  ok(seen.wokeBeforeCard, 'the awakening is granted in the middle of the duel, before the card');
  ok(seen.grew === g.run(`OPR_GROWTHS.length`) && seen.shots > 0 && seen.beams > 0, 'awake, it grows guns out of its back, and they fire', seen);
  ok(seen.card, 'the card: AWAKENING');
  ok(g.run(`state`) === 'menu' && g.run(`isAwake('runner')`), 'then the menu, VOIDRUNNER awake', g.run(`state`));
  takeArt(g);
}

/* ================================ the jumps ================================= */
section('the admin jumps');
{
  const g = game();
  for (let i = 0; i < 5; i++) {
    enter(g, 30 + i);
    g.run(STILL);
    g.run(`oprJump(${i})`);
    steps(g, 3, true);
    ok(g.run(`orite.seq`) === i && (i < 4 ? g.run(`orite.due`) === i + 1 : g.run(`!!orite.duel`)), 'oprJump(' + i + ') opens ' + g.run(`OPR_SEQ[${i}].n`), J(g, `{ seq: orite.seq, due: orite.due }`));
  }
  takeArt(g);
}

/* ================================== left ==================================== */
section('left mid-rite');
{
  const g = game();
  enter(g);
  g.run(BOT);
  steps(g, 60 * 10);
  ok(g.run(`oprOn()`), 'in the rite');
  g.run(`state = 'pause'; quitToMenu(); runSeedNext = 9; resetGame(); state = 'play';`);
  ok(g.run(`!oprRite && !orite`), 'the next run starts clear of it');
  ok(!g.run(`isAwake('runner')`), 'and nothing was granted');
}

/* ================================= the hooks ================================= */
section('the hooks');
{
  const g = game();
  enter(g);
  // with ?hooks=1 off, every hook still drawn somewhere above; the rest by jump
  g.run(`oprJump(2)`);
  steps(g, 3);
  g.run(`orite.patch = { x: P.x, y: P.y, k: 0.4, t: 0 }; orite.kept = [1];`);
  for (let i = 0; i < 20; i++) { g.run(`update(${STEP}); render();`); }
  takeArt(g);
  const all = J(g, `Object.keys(OPR_ART)`);
  const never = all.filter(k => !artSeen[k]);
  ok(!never.length, 'every OPR_ART hook is drawn somewhere in the rite', never);
  ok(g.run(`OR_FAILED.size`) === 0 && g.run(`OA_FAILED.size`) === 0, 'and none throws, nor any of the route\'s it borrows', g.run(`[...OR_FAILED].join() + ' | ' + [...OA_FAILED].join()`));
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
