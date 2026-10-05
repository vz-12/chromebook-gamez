#!/usr/bin/env node
/* VOIDRUNNER — the determinism test (Phase 1 of the lockstep co-op rework).

   Lockstep co-op runs the same game on two machines and sends only inputs, so
   the same seed, the same inputs and the same run settings must give the same
   game, step for step, whatever else differs. This plays each scenario twice
   and compares a fingerprint of the game state every second of game time:

     run A   never drawn, every graphics effect off, the devices idle
     run B   drawn every few steps (to a stub canvas) with every effect on,
             at another window size, while the keyboard, mouse, autofire and
             the save's own flags are scrambled every step

   Both are fed the same seed, the same view (runViewNext), the same run
   settings (taken from the same save) and the same inputs, written straight
   into the input record by a bot. Anything the game reads that it should not
   (Math.random, the camera, the window, the devices, the drawing, the live
   save) makes B part from A, and the test names the second it happened.

     run C   a second copy of the game, loaded on its own, takes over a
             snapshot of run A a third of the way in (RUN SNAPSHOTS: what
             lockstep's safety net sends) and plays the rest as run B does

   C must match A from the snapshot on, and nothing in the snapshot may be
   something that cannot travel. If C parts, the snapshot left out something
   the run needs: --restore name prints the first field that differs. With
   Node's --expose-internals (npm test), the snapshot's reading of the
   game's own text is also held to a real parse.

   No browser and no dependencies: the game's script is loaded into a bare
   context where the canvas, audio, storage and network are stubs.

     node scripts/determinism.mjs [path/to/index.html] [--quick] [--only name,name] [--restore name]

   Exits 1 if any scenario's runs differ, or if a different seed fails to. */
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadGame, canvasCalls, gameScript } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const ONLY = (() => { const i = args.indexOf('--only'); return i >= 0 ? new Set(args[i + 1].split(',')) : null; })();
const IDX = args.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');

/* ------------------------------ load the game ------------------------------ */
const g = loadGame(IDX, { w: 1280, h: 720 });
const { win, ctx, loadMs } = g;

/* --------------------- the harness, inside the game's scope --------------------- */
const HARNESS = `(() => {
  pageDead = true;
  const STEP = 1 / 60;
  Save.profile.gfxSeen = GFX_VER;
  if (typeof RUSH_PEAK !== 'undefined') Save.profile.rushBest = RUSH_PEAK;   // THE VAGRANT unlocked
  const SAVE0 = JSON.stringify(Save.profile), FX0 = JSON.stringify(FXO);
  const restore = () => { const o = JSON.parse(SAVE0); for (const k of Object.keys(Save.profile)) delete Save.profile[k]; Object.assign(Save.profile, o); Codex.load(); };   // the codex too: runs write sightings into it
  const r = v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(12) : String(v)) : (v === undefined ? null : v);
  const pk = (o, ks) => ks.map(k => r(o[k]));
  // what the game is, at a moment: everything a desync would show up in
  function fingerprint() {
    return JSON.stringify([simRngState, simTick, wave, r(elapsed), r(credits), state,
      pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'level', 'xp', 'dmg', 'fireRate', 'dashCh', 'ang', 'suT', 'roninT', 'ventT', 'roninBroken']),
      // RONIN's V: the vow's clock, its grave, SKY CLEAR
      [P.roninVow ? r(P.roninVow.t) : null, P.roninGrave ? r(P.roninGrave.hp) : null, P.roninSkyClear ? P.roninSkyClear.stage + P.roninSkyClear.i : null],
      enemies.filter(e => !e.dead).map(e => [e.type, e.boss || '', ...pk(e, ['x', 'y', 'hp', 'atk', 'atkT', 'cd', 'state', 'ang', 'id'])]),
      bullets.map(b => pk(b, ['x', 'y', 'vx', 'vy'])), ebullets.map(b => pk(b, ['x', 'y', 'vx', 'vy'])),
      gems.map(g => pk(g, ['x', 'y', 'v'])), drops.map(d => [d.kind, ...pk(d, ['x', 'y'])]),
      hazards.map(h => [h.kind, ...pk(h, ['x', 'y', 'r'])]), Object.entries(P.up || {}).sort(),
      RUN_FLAGS.map(k => r(RUN[k]))]);
  }
  const fnv = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const near = (list, f) => { let b = null, bd = Infinity; for (const o of list) { if (f && !f(o)) continue; const d = (o.x - P.x) ** 2 + (o.y - P.y) ** 2; if (d < bd) { bd = d; b = o; } } return [b, bd]; };
  let run = null;
  // a player, written straight into the input record
  function bot(rec) {
    const k = run.k;
    let ix = 0, iy = 0;
    const [g, gd] = near(gems.concat(drops));
    if (g && gd < 900 * 900) { ix = g.x > P.x + 6 ? 1 : g.x < P.x - 6 ? -1 : 0; iy = g.y > P.y + 6 ? 1 : g.y < P.y - 6 ? -1 : 0; }
    else { const d = Math.floor(k / 80) % 4; ix = [0, 1, 0, -1][d]; iy = [-1, 0, 1, 0][d]; }
    rec.mx = ix; rec.my = iy;
    const [e] = near(enemies, o => !o.dead && !o.hacked);
    if (e) { rec.ax = e.x; rec.ay = e.y; } else { const a = k * 0.03; rec.ax = P.x + Math.cos(a) * 200; rec.ay = P.y + Math.sin(a) * 150; }
    rec.trig = true; rec.lmb = true; rec.auto = k % 600 > 300; rec.dash = k % 97 === 0;
    rec.touch = false; rec.taim = null; rec.local = false;
    const press = [];
    if (run.o.kit) {
      if (k % 900 === 60) {
        if (P.charId === 'hacker') { P.suRoot = SU_MAX; press.push('f'); }
        else if (P.charId === 'ember') { P.vent = VENT_MAX; press.push('f'); }
        else if (P.charId === 'melee' && !(P.roninT > 0)) roninFire(false);
      }
      // RONIN's V: low enough for it to light (the cycle of presses below then takes it), and now and
      // then a grave one blow from breaking
      if (P.charId === 'melee' && P.roninT > 0 && k % 900 === 300) P.hp = Math.min(P.hp, P.maxHp * 0.25);
      if (P.charId === 'melee' && P.roninGrave && k % 1800 === 700) P.roninGrave.hp = 1;
      if (k % 75 === 40) press.push(['z', 'x', 'c', 'v'][Math.floor(k / 75) % 4]);
      if (P.charId === 'melee' && k % 23 === 0) press.push('f');
      if (P.charId === 'melee' && k % 61 === 0) press.push('parry');
    }
    if (k % 400 === 200) press.push('q');
    rec.press = press;
  }
  // run B's noise: everything the game must not hear
  globalThis.FLAGS_JUNK_LIST = ['hardened', 'keeperDone', 'rootDone', 'altPath', 'deepFracture', 'malware', 'planetarium', 'amalgamDone', 'tribunalDone', 'metFounder', 'keyEver', 'devTalkDue', 'trueEnd', 'otherKills', 'unwrittenDeaths', 'clears', 'campVisits'];
  const FLAGS_JUNK = ['hardened', 'keeperDone', 'rootDone', 'altPath', 'deepFracture', 'malware', 'planetarium', 'amalgamDone', 'tribunalDone', 'metFounder', 'keyEver', 'devTalkDue', 'trueEnd'];
  function junk(b) {
    if (b.devices) {
      for (const key of ['w', 'a', 's', 'd', ' ', 'shift', 'j', 'z', 'x', 'c', 'v', 'f', 'q', 'e']) keys[key] = rnd() < 0.5;
      mouse.down = rnd() < 0.5; mouse.x = rnd(W); mouse.y = rnd(H); autoFire = rnd() < 0.5;
      // and the cursor's world point, which only the drawing may read (CLEAR SKY aimed at it once)
      mouse.wx = rnd(4000) - 2000; mouse.wy = rnd(4000) - 2000;
    }
    if (!b.save) return;
    const only = globalThis.__junkOnly;
    for (const f of FLAGS_JUNK) if (!only || only === f) Save.profile[f] = rnd() < 0.5;
    for (const [f, n] of [['otherKills', 9], ['unwrittenDeaths', 9], ['clears', 9], ['campVisits', 5]]) if (!only || only === f) Save.profile[f] = rndi(n);
  }
  function start(o) {
    restore();
    const fx = JSON.parse(FX0);
    for (const k of Object.keys(fx)) fx[k] = o.b && o.b.fx ? 1 : 0;
    Object.assign(FXO, fx);
    for (const k of Object.keys(keys)) keys[k] = false;
    mouse.down = false; autoFire = false;
    applyChar(CHARS.findIndex(c => c.id === o.char));
    runSeedNext = o.seed; runViewNext = o.view; resetGame(); state = 'play';
    if (o.starter) { runSeedNext = o.seed; runViewNext = o.view; o.starter(); if (state !== 'play' && state !== 'dead') state = 'play'; }
    if (o.kit) P.awake = 1;
    P.maxHp = P.hp = 60000; P.dmg *= 3;
    inputSource = bot;
    if (o.from) snapRead(JSON.parse(o.from));     // run C: the run so far is another copy's, taken over here
    run = { o, k: o.fromK || 0, prints: [], bosses: new Set(), maxWave: 0, drawErrors: 0, firstDrawError: null,
            vow: { vows: 0, skyClears: 0, broken: 0 }, was: [false, false, 0] };
  }
  function play(o) {
    start(o);
    for (; run.k < o.steps; run.k++) {
      if (o.snapAt === run.k) { const s = snapWrite(); run.snap = JSON.stringify(s); run.snapBad = s.badAt; }
      if (state === 'pause') state = 'play';
      if (state === 'levelup') { uiArm = 0; handleKey('1'); }
      else if (state !== 'play' && state !== 'dead') state = 'play';
      if (o.b && o.b.junk) junk(o.b);
      update(STEP);
      if (o.b && o.b.draw && run.k % 5 === 0) { try { render(); } catch (err) { run.drawErrors++; if (!run.firstDrawError) run.firstDrawError = String(err && err.stack || err).split('\\n').slice(0, 3).join(' | '); } }
      run.maxWave = Math.max(run.maxWave, wave);
      // RONIN's V, counted as it happens: the vow taken, SKY CLEAR played, a grave broken
      if (typeof vowOn === 'function') {
        const w = run.was, v = !!P.roninVow, s = !!P.roninSkyClear, br = P.roninBroken || 0;
        if (v && !w[0]) run.vow.vows++;
        if (s && !w[1]) run.vow.skyClears++;
        if (br > w[2]) run.vow.broken++;
        run.was = [v, s, br];
      }
      for (const e of enemies) if (e.boss) run.bosses.add(e.boss);
      if ((run.k + 1) % 60 === 0) run.prints.push(globalThis.__raw ? fingerprint() : fnv(fingerprint()));
    }
    inputSource = inputSample;
    return { prints: run.prints, bosses: [...run.bosses], maxWave: run.maxWave, level: P.level, drawErrors: run.drawErrors, firstDrawError: run.firstDrawError,
             snap: run.snap, snapBad: run.snapBad, vow: run.vow };
  }
  globalThis.__det = { play };
})();`;
vm.runInContext(HARNESS, ctx, { filename: 'determinism-harness' });
/* Run C's copy of the game: loaded on its own, at another size, it takes over
   run A's snapshot partway through and has to play the rest the same. */
let C = null;
const copyC = () => {
  if (!C) { C = loadGame(IDX, { w: 800, h: 600 }); vm.runInContext(HARNESS, C.ctx, { filename: 'determinism-harness-c' }); }
  return C;
};

/* ------------------------------ the scenarios ------------------------------ */
const L = QUICK ? 0.4 : 1;                       // --quick plays each for 40% as long
const VIEW = { w: 1366, h: 768 };
const S = [
  { name: 'runner',     char: 'runner', seed: 101, steps: 18000 },
  { name: 'ember',      char: 'ember',  seed: 102, steps: 18000, kit: true },
  { name: 'hacker',     char: 'hacker', seed: 103, steps: 18000, kit: true },
  { name: 'vagrant',    char: 'melee',  seed: 104, steps: 18000, kit: true },
  { name: 'rush',       char: 'ember',  seed: 105, steps: 36000, kit: true, starter: 'startRush()' },
  { name: 'keeper',     char: 'runner', seed: 106, steps: 7200,  starter: 'startKeeperFight()' },
  { name: 'unwritten',  char: 'runner', seed: 107, steps: 7200,  starter: 'resetGame(); startUnwritten()' },
  { name: 'amalgam',    char: 'ember',  seed: 108, steps: 7200,  kit: true, starter: 'resetGame(); startAmalgam()' },
  { name: 'root',       char: 'hacker', seed: 109, steps: 7200,  kit: true, starter: 'resetGame(); startRoot()' },
  { name: 'tribunal',   char: 'melee',  seed: 110, steps: 7200,  kit: true, starter: 'resetGame(); startTribunal()' },
  { name: 'rite-ember', char: 'ember',  seed: 111, steps: 7200,  kit: true, starter: "enterRite('ember')" },
  { name: 'rite-hacker',char: 'hacker', seed: 112, steps: 7200,  kit: true, starter: "enterRite('hacker')" },
  { name: 'rite-melee', char: 'melee',  seed: 113, steps: 7200,  kit: true, starter: "enterRite('melee')" },
  { name: 'patch',      char: 'runner', seed: 114, steps: 7200,  starter: "hlAreaStart('patch')" },
];
const ALL = { draw: true, fx: true, devices: true, save: true, window: true };
const play = (sc, b, more, G) => {
  const { win, ctx } = G || g;
  if (b === true) b = ALL;
  if (b) b = Object.assign({ junk: b.devices || b.save }, b);
  win.innerWidth = b && b.window ? 800 : 1280; win.innerHeight = b && b.window ? 600 : 720;
  vm.runInContext('resize()', ctx);
  const o = Object.assign({}, sc, { steps: Math.round(sc.steps * L), view: VIEW, b,
    starter: sc.starter ? vm.runInContext('() => { ' + sc.starter + '; }', ctx) : null }, more);
  return ctx.__det.play(o);
};
// where run A is snapshotted for run C: a third of the way in, on a second
const snapAt = sc => Math.max(60, Math.round(sc.steps * L / 3 / 60) * 60);

/* --restore name: where run C (the snapshot taken over by another copy) first
   parts from run A, field by field */
const RDIAG = (() => { const i = args.indexOf('--restore'); return i >= 0 ? args[i + 1] : null; })();
if (RDIAG) {
  const sc = S.find(x => x.name === RDIAG), at = snapAt(sc);
  ctx.__raw = true; copyC().ctx.__raw = true;
  const a = play(sc, false, { snapAt: at }), c = play(sc, true, { from: a.snap, fromK: at }, copyC());
  const from = at / 60, j = c.prints.findIndex((h, k) => h !== a.prints[from + k]);
  if (j < 0) { console.log('restore ' + RDIAG + ': same from ' + from + 's on'); process.exit(0); }
  const A = JSON.parse(a.prints[from + j]), Cc = JSON.parse(c.prints[j]);
  const names = ['rng', 'simTick', 'wave', 'elapsed', 'credits', 'state', 'P', 'enemies', 'bullets', 'ebullets', 'gems', 'drops', 'hazards', 'up', 'RUN'];
  console.log('restore ' + RDIAG + ': snapshot at ' + from + 's, first parts at ' + (from + j) + 's');
  A.forEach((x, k) => { const y = Cc[k], sx = JSON.stringify(x), sy = JSON.stringify(y); if (sx !== sy) {
    let i = 0; while (i < sx.length && sx[i] === sy[i]) i++;
    console.log('  ' + (names[k] || k) + '\n    A …' + sx.slice(Math.max(0, i - 160), i + 160) + '\n    C …' + sy.slice(Math.max(0, i - 160), i + 160)); } });
  process.exit(1);
}
const DIAG = (() => { const i = args.indexOf('--diagnose'); return i >= 0 ? args[i + 1] : null; })();
if (DIAG) {
  const sc = S.find(x => x.name === DIAG);
  const a = play(sc, false);
  console.log('diagnose ' + DIAG + ': which of run B\'s differences parts it from run A');
  for (const k of Object.keys(ALL)) {
    const b = play(sc, { [k]: true });
    const i = a.prints.findIndex((h, j) => h !== b.prints[j]);
    console.log('  ' + k.padEnd(8) + (i < 0 ? 'same' : 'DIFFER at ' + i + 's') + (b.drawErrors ? '  · draw errors ' + b.drawErrors : ''));
  }
  if (args.includes('--fields')) {
    const fields = vm.runInContext("FLAGS_JUNK_LIST", ctx);
    for (const f of fields) {
      ctx.__junkOnly = f;
      const b = play(sc, { save: true });
      const i = a.prints.findIndex((h, j) => h !== b.prints[j]);
      if (i >= 0) console.log('    save.' + f + ' DIFFER at ' + i + 's');
    }
    ctx.__junkOnly = null;
  }
  process.exit(0);
}
/* The snapshot finds the run's variables by reading the game's own text
   (snapScan). Hold that reading to a real parse of the same text: Node keeps
   a parser inside (acorn), which a script can reach when Node is started with
   --expose-internals (npm test does). Without it, this check is skipped. */
function namesCheck() {
  let acorn;
  try { acorn = createRequire(import.meta.url)('internal/deps/acorn/acorn/dist/acorn'); } catch (e) { return null; }
  const ast = acorn.parse(gameScript(IDX).code, { ecmaVersion: 'latest', sourceType: 'script' });
  const want = { lets: [], consts: [], fns: [] };
  const names = (p, out) => {
    if (!p) return;
    if (p.type === 'Identifier') out.push(p.name);
    else if (p.type === 'ObjectPattern') p.properties.forEach(q => names(q.value || q.argument, out));
    else if (p.type === 'ArrayPattern') p.elements.forEach(e => names(e, out));
    else if (p.type === 'AssignmentPattern') names(p.left, out);
    else if (p.type === 'RestElement') names(p.argument, out);
  };
  for (const st of ast.body) {
    if (st.type === 'VariableDeclaration') st.declarations.forEach(d => names(d.id, st.kind === 'const' ? want.consts : want.lets));
    else if ((st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') && st.id) want.fns.push(st.id.name);
  }
  const got = vm.runInContext('(() => { const n = snapScan(); return JSON.stringify({ lets: n.lets, consts: n.consts, fns: n.fns }); })()', ctx);
  const g2 = JSON.parse(got), miss = [];
  for (const k of Object.keys(want)) { const have = new Set(g2[k]); for (const n of want[k]) if (!have.has(n)) miss.push(k.slice(0, -1) + ' ' + n); }
  return { miss, counts: Object.fromEntries(Object.keys(want).map(k => [k, want[k].length])) };
}
console.log(`VOIDRUNNER determinism · ${path.relative(process.cwd(), IDX) || IDX} · loaded in ${loadMs} ms${QUICK ? ' · quick' : ''}\n`);
let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
{
  const nc = namesCheck();
  if (!nc) console.log(`${pad('names', 12)} skipped  (start Node with --expose-internals to hold the snapshot's scan to a real parse)`);
  else {
    if (nc.miss.length) failed++;
    console.log(`${pad('names', 12)} ${nc.miss.length ? 'MISSED ' + nc.miss.length + ': ' + nc.miss.slice(0, 12).join(', ') : 'all found'}` +
      `  the snapshot's scan against a parse: ${nc.counts.lets} lets, ${nc.counts.consts} consts, ${nc.counts.fns} functions and classes`);
  }
}
for (const sc of S) {
  if (ONLY && !ONLY.has(sc.name)) continue;
  const t = Date.now();
  let a, b, c, err = null;
  let drawn = 0;
  const at = snapAt(sc);
  try {
    a = play(sc, false, { snapAt: at }); const c0 = canvasCalls(); b = play(sc, true); drawn = canvasCalls() - c0;
    c = play(sc, true, { from: a.snap, fromK: at }, copyC());          // run C: run A's snapshot, taken over by another copy
  } catch (e) { err = e; }
  if (err) { failed++; console.log(`${pad(sc.name, 12)} ERROR  ${String(err && err.stack || err).split('\n').slice(0, 4).join(' | ')}`); continue; }
  const i = a.prints.findIndex((h, j) => h !== b.prints[j]);
  const ok = i < 0 && a.prints.length === b.prints.length && a.prints.length > 0;
  // run C against run A, from the snapshot on
  const from = at / 60, ci = c.prints.findIndex((h, j) => h !== a.prints[from + j]);
  const okC = ci < 0 && c.prints.length === a.prints.length - from && !(a.snapBad && a.snapBad.length);
  // the vagrant run has to have taken RONIN's V, both of the ways it ends included, or it proved nothing about it
  const vowCover = sc.name !== 'vagrant' || (a.vow.vows > 0 && a.vow.skyClears > 0 && a.vow.broken > 0);
  if (!ok || !okC || !vowCover) failed++;
  const vowNote = sc.char === 'melee' && sc.kit ? `  · vow ${a.vow.vows}, sky clear ${a.vow.skyClears}, broken ${a.vow.broken}${vowCover ? '' : ' (NOT ALL SEEN)'}` : '';
  const draw = `  · drawn: ${(drawn / 1e6).toFixed(1)}M canvas calls` + (b.drawErrors ? `, ${b.drawErrors} draw errors (${b.firstDrawError})` : '');
  const restored = okC ? `  · restored at ${from}s: same (${(a.snap.length / 1024).toFixed(0)} KB)`
    : `  · RESTORED at ${from}s: ${ci >= 0 ? 'DIFFER at ' + (from + ci) + 's' : 'cut short'}` +
      (a.snapBad && a.snapBad.length ? ', cannot travel: ' + a.snapBad.slice(0, 6).join('; ') : '');
  console.log(`${pad(sc.name, 12)} ${ok ? 'same' : 'DIFFER at ' + i + 's'}  ${pad(a.prints.length + 's', 6)} wave ${pad(a.maxWave, 3)} lvl ${pad(a.level, 3)} ${pad(a.bosses.join(',') || '-', 40)} ${((Date.now() - t) / 1000).toFixed(1)}s${draw}${restored}${vowNote}`);
}
if (!ONLY) {
  // a seed must matter
  const one = play(S[0], false), two = play(Object.assign({}, S[0], { seed: S[0].seed + 1 }), false);
  const shared = one.prints.filter((h, i) => h === two.prints[i]).length;
  const okSeed = shared < one.prints.length / 10;
  if (!okSeed) failed++;
  console.log(`${pad('seed', 12)} ${okSeed ? 'matters' : 'DOES NOT MATTER'}  another seed shares ${shared}/${one.prints.length} checkpoints`);
  /* and the test must be able to see a desync: plant one gameplay roll on
     Math.random (which enemy a spawn becomes, one time in ten) and it has to
     catch it. If this ever passes, the test has gone blind. */
  vm.runInContext("globalThis.__pet = pickEnemyType; pickEnemyType = (...a) => { const t = __pet(...a); return rnd() < 0.1 ? 'grunt' : t; };", ctx);
  const sc = Object.assign({}, S[0], { steps: 3600 / L });
  const ca = play(sc, false), cb = play(sc, true);
  vm.runInContext('pickEnemyType = __pet;', ctx);
  const at = ca.prints.findIndex((h, j) => h !== cb.prints[j]);
  const okCanary = at >= 0;
  if (!okCanary) failed++;
  console.log(`${pad('canary', 12)} ${okCanary ? 'caught' : 'MISSED'}  a planted unseeded roll ${okCanary ? 'parted the runs at ' + at + 's' : 'went unseen'}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall deterministic');
process.exit(failed ? 1 : 0);
