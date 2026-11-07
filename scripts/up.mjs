#!/usr/bin/env node
/* ===========================================================================
   THE WAY UP — the test: `npm run test:up` (index.html, THE WAY UP)
   The game, booted in Node, with the tests' stand-in rooms module
   (fixtures/up-rooms.js) run as the vault runs one:
     taken in    VR.rooms: the rooms, foes and bosses join the game's tables;
                 a module that would take the game's own, or send what it has
                 not got, is refused whole
     closed      no light before THE VOID's boss falls, nor without the module,
                 nor in a rule sheet, the rush or PvP; its place is its own stream
     the light   in every sector after: stood in a moment, it carries the run
                 up; left mid-sector, the rest of the sector is paid as skipped
     the rooms   five waves each, the boss on the fifth, the shop, the light to
                 the next (the waves wait for it), and after the last, let down
                 into the rotation, where the light stands again
     counts for  nothing: no record, no board, no codex, no tales, no save to go on
     co-op       only when the other machine runs the same module
     snapshot    a run in a room travels, and comes back pointing at the same room
     secrecy     the block names nothing it should not
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
const MOD = fs.readFileSync(path.join(here, 'fixtures', 'up-rooms.js'), 'utf8');
let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);

const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'UP'; state = 'menu'; tutSet('off');
  globalThis.__submitted = 0; { const was = Board.submit; Board.submit = (...a) => { __submitted++; }; }`;
function boot(withModule = true) {
  const g = loadGame(IDX);
  g.run(SETUP);
  if (withModule) g.run('Outside.run("u9", ' + JSON.stringify(MOD) + ')');
  return g;
}
// a fresh ordinary run, flown as VOIDRUNNER, its hull unkillable and quiet
function fresh(g, seed = 7) {
  g.run(`applyChar(0); runSeedNext = ${seed}; resetGame(); state = 'play'; P.maxHp = P.hp = 1e7; P.dmg *= 40;`);
}
// steps of play, the way the frame plays them; the level-ups and the shop answered as a player would
function step(g, sec) {
  g.run(`for (let i = 0; i < ${Math.round(sec * 60)}; i++) {
    if (state === 'levelup') { uiArm = 0; handleKey('1'); }
    if (state === 'shop') { uiArm = 0; ui('shopOut'); }
    if (state !== 'play') { if (state === 'dead') break; state = 'play'; }
    update(1 / 60);
  }`);
}
// everything standing, put down (paid), the waves' budgets spent
const clear = g => g.run(`for (const e of enemies.slice()) if (!e.dead && !e.hacked) killEnemy(e); spawnBudget = 0;`);
// play until a condition holds (or give up), clearing the room as it goes
function until(g, cond, sec = 120) {
  for (let i = 0; i < sec * 4; i++) {
    if (g.run(cond)) return true;
    clear(g); step(g, 0.25);
  }
  return !!g.run(cond);
}
const stand = g => g.run(`P.x = upLight.x; P.y = upLight.y; P.vx = P.vy = 0;`);

/* -------------------------------------------------------------------------- */
section('taken in: the rooms, their foes and bosses');
{
  const g = boot();
  ok(g.run('UP_ROOMS.length') === 2, 'two rooms');
  ok(g.run('UP.id') === 'u9' && g.run('upSig()') === g.run('OUTSIDE.sig.u9'), 'the module is the vault id it ran as, its mark the hello\'s');
  ok(g.run('!!ETYPE.x0f && ETYPE.x0f.hp === 16') && g.run('BOSSES.x0b.up === true && BOSSES.x0b.name === "THE STAND-IN"'), 'its foe joins ETYPE, its boss BOSSES');
  ok(g.run('UP_ROOMS[0].up === true && UP_ROOMS[0].hazard === null && UP_ROOMS[0].boss === "x0b"'), 'a room is marked as one, with no hazard of the game\'s');
  ok(g.run('Object.keys(UP.hooks).sort().join()') === 'back,enter,ev,floor,hud,lift,light,over,screen,step,wave', 'every hook kept', g.run('Object.keys(UP.hooks).join()'));
  ok(g.run('Outside.run("u9", ' + JSON.stringify(MOD) + '), UP_ROOMS.length') === 2, 'run again, it takes its own places back');
  const refused = (body, what) => {
    let threw = false;
    try { g.run('Outside.run("u9", ' + JSON.stringify(body) + ')'); } catch (e) { threw = true; }
    ok(threw && g.run('UP_ROOMS.length') === 2 && g.run('ETYPE.grunt.hp') === 11, 'refused whole: ' + what);
  };
  refused(`VR.rooms({ rooms: [{ name: 'X', pool: [['nothing', 1]], boss: 'x0b' }], bosses: { x0b: { r: 1, sides: 3, hpMul: 1, spd: 1, ai() {} } } })`, 'a room sending what it has not got');
  refused(`VR.rooms({ rooms: [{ name: 'X', pool: [['grunt', 1]], boss: 'x0b' }], foes: { grunt: { r: 1, hp: 1, spd: 1, dmg: 1, xp: 1, score: 1, sides: 3, ai() {} } }, bosses: { x0b: { r: 1, sides: 3, hpMul: 1, spd: 1, ai() {} } } })`, 'a foe that is one of the game\'s own');
  refused(`VR.rooms({ rooms: [{ name: 'X', pool: [['grunt', 1]], boss: 'warden' }] })`, 'a room ending on a boss of the game\'s');
  refused(`VR.rooms({ rooms: [{ name: 'X', pool: [['grunt', 1]], boss: 'x0b', f: () => 1 }], bosses: { x0b: { r: 1, sides: 3, hpMul: 1, spd: 1, ai() {} } } })`, 'a room that is not plain data');
  let other = false;
  try { g.run('Outside.run("u8", ' + JSON.stringify(MOD) + ')'); } catch (e) { other = true; }
  ok(other && g.run('UP.id') === 'u9', 'another module cannot take rooms that are another\'s');
}

section('closed: no light before THE VOID\'s boss, nor without the module, nor where it does not belong');
{
  const g = boot();
  fresh(g);
  ok(g.run('RUN.up') === g.run('upSig()') && g.run('RUN.up').length > 0, 'a run takes the module\'s mark as it starts');
  step(g, 3);
  ok(g.run('upOpen === false && upLight === null'), 'a fresh run: shut, no light');
  g.run('enterStage(STAGES[1])');
  ok(g.run('upLight === null'), 'a sector before THE VOID\'s boss: no light');
  // another boss is not it; nor THE VOID's boss anywhere but THE VOID
  g.run('stage = STAGES[3]; upFelled({ boss: "archivist" }); upFelled({ boss: "nullcore" })');
  ok(g.run('upOpen === false'), 'NULL felled anywhere but THE VOID opens nothing');
  const rng0 = g.run('simRngState');
  g.run('stage = STAGES[4]; upFelled({ boss: "nullcore" })');
  ok(g.run('upOpen === true'), 'THE VOID\'s boss down: open');
  g.run('enterStage(STAGES[0])');
  ok(g.run('!!upLight && !upLight.next'), 'the next sector has its light');
  ok(g.run('simRngState') === rng0, 'and its place took nothing from the run\'s stream');
  ok(g.run('upLight.x > arena.x0 && upLight.x < arena.x1 && upLight.y > arena.y0 && upLight.y < arena.y1'), 'in the room');
  ok(g.run('len(P.x - upLight.x, P.y - upLight.y)') >= 380, 'well clear of the hull', g.run('len(P.x - upLight.x, P.y - upLight.y)'));
  // a rule sheet, the rush, a sandbox
  g.run('Chal.on = { id: "x", n: "X", m: {} }; enterStage(STAGES[1])');
  ok(g.run('upLight === null'), 'not under a rule sheet');
  g.run('Chal.on = null');
  // no module, no light
  const n = boot(false);
  fresh(n);
  n.run('upOpen = true; enterStage(STAGES[1])');
  ok(n.run('RUN.up') === '' && n.run('upLight === null'), 'without the module: nothing');
  // the rush: VOID's boss in it opens nothing
  const r = boot();
  r.run('applyChar(0); runSeedNext = 3; startRush(); state = "play"; stage = STAGES[4]; upFelled({ boss: "nullcore" })');
  ok(r.run('upOpen === false'), 'the rush opens nothing');
}

section('the light: stood in, it carries the run up; mid-sector, the rest is paid as skipped');
{
  const g = boot();
  fresh(g);
  g.run('stage = STAGES[4]; upFelled({ boss: "nullcore" }); wave = 26; stageAbs = 5; enterStage(STAGES[0]); betweenWaves = 0; spawnBudget = 20;');
  step(g, 0.4);
  stand(g); step(g, 0.3);
  ok(g.run('upIdx') === -1, 'not before it has stood (settled) and been stood in long enough');
  const xp0 = g.run('P.xp + P.level * 1000'), cr0 = g.run('credits'), wave0 = g.run('wave');
  g.run('spawnEnemy("grunt", P.x + 300, P.y)');
  for (let i = 0; i < 12 && g.run('upIdx') < 0; i++) { stand(g); step(g, 0.2); }
  ok(g.run('upIdx') === 0 && g.run('stage === UP_ROOMS[0]'), 'up: in the first room');
  ok(g.run('wave') === 30 && g.run('stageAbs') === 6, 'its waves fall on the sector clock: the run is at the sector\'s end', { wave: g.run('wave'), from: wave0 });
  ok(g.run('P.xp + P.level * 1000') > xp0 && g.run('credits') > cr0, 'the waves left are paid as skipped');
  ok(g.run('enemies.filter(e => !e.dead && !e.hacked).length') === 0 && g.run('upBeen'), 'the sector\'s bodies stay behind; the run has been up');
  ok(g.run('upLiftT') >= 0 && g.run('upLight') === null, 'the lift plays; the light is spent');
  ok(g.run('JSON.stringify(upWorld.entered)') === '["ROOM ONE"]', 'the module heard the room entered');
  ok(g.run('musicWant(0.016)[0]') === 'void', 'the room plays the track it names');
  ok(g.run('!aboveQuiet() === false'), 'nothing comes from above in it (FROM ABOVE)');
  ok(g.run('runSaveable()') === false, 'a run in the rooms is not kept to go on');

  section('the rooms: five waves, the boss on the fifth, the shop, the light to the next');
  ok(until(g, 'wave === 31 && betweenWaves <= 0'), 'the first wave starts after the lift');
  ok(g.run('upWorld.lastWave') === 1, 'the module hears wave 1');
  ok(until(g, 'bossAlive'), 'the boss comes');
  ok(g.run('wave') === 35 && g.run('upWorld.lastWave') === 5 && g.run('upWorld.waves') === 5, 'on the fifth', { wave: g.run('wave'), n: g.run('upWorld.waves') });
  ok(g.run('enemies.some(e => e.boss === "x0b" && !e.dead)'), 'the room\'s own boss');
  ok((g.run("upWorld.foeSteps") | 0) > 0, "its foes ran their ai");
  g.run('for (const e of enemies) if (e.boss === "x0b") killEnemy(e)');
  ok(g.run('upWorld.felled') === 1, 'the module hears its boss down');
  ok(until(g, '!!upLight && upLight.next', 30), 'after the shop, the light to the next room');
  const w = g.run('wave');
  step(g, 3);
  ok(g.run('wave') === w && g.run('upHolds()'), 'the waves wait for it');
  for (let i = 0; i < 12 && g.run('upIdx') < 1; i++) { stand(g); step(g, 0.2); }
  ok(g.run('upIdx') === 1 && g.run('stage === UP_ROOMS[1]') && g.run('stageAbs') === 7, 'up again: the second room', { abs: g.run('stageAbs'), wave: g.run('wave') });
  ok(until(g, 'bossAlive'), 'its boss comes');
  ok(g.run('wave') === 40, 'on its fifth');
  g.run('for (const e of enemies) if (e.boss === "x0b") killEnemy(e)');
  ok(until(g, 'upIdx === -1 && !UP_ROOMS.includes(stage)', 40), 'after the last, let down into the rotation', { idx: g.run('upIdx'), st: g.run('stage.name') });
  ok(g.run('stage === STAGES[8 % 5]') && g.run('wave') === 41, 'where the wave clock has it', { st: g.run('stage.name'), wave: g.run('wave') });
  ok(g.run('!!upLight && !upLight.next'), 'and the light stands in it again');
  ok(g.run('JSON.stringify(upWorld)') === '{}', 'the module\'s share of the run is let go');
  ok(g.run('upWorld.evs === undefined'), 'its world emptied on the way down');

  section('counts for nothing');
  const best0 = g.run('Save.profile.best | 0'), runs0 = g.run('(Save.profile.runs || []).length');
  g.run('P.hp = 0; gameOver()');
  ok(g.run('lastStats.up === true && lastStats.isRecord === false'), 'the death says so');
  ok(g.run('__submitted') === 0 && g.run('Save.profile.best | 0') === best0 && g.run('(Save.profile.runs || []).length') === runs0, 'no board, no best, no record');
  ok(!g.run('Codex.e.has("x0f") || Codex.e.has("x0b")'), 'nothing in the codex');
  ok(!g.run('JSON.stringify(Tales.n || {}).includes("x0")'), 'nothing in the tales');
  ok(!g.run('JSON.stringify(Save.profile).includes("x0b") || JSON.stringify(Save.profile).includes("ROOM ONE")'), 'nothing of it in the save');
}

section('co-op: only when the other machine runs the same module');
{
  const g = boot();
  const sig = g.run('upSig()');
  g.run('MP.on = true; MP.heard = { outs: [] }');
  ok(g.run('upTake()') === '', 'the other machine has not got it: no way up');
  g.run(`MP.heard = { outs: [['u9', 'another']] }`);
  ok(g.run('upTake()') === '', 'a different copy: no way up');
  g.run(`MP.heard = { outs: [['u9', ${JSON.stringify(sig)}]] }`);
  ok(g.run('upTake()') === sig, 'the same one: the way up');
  g.run('MP.on = false; MP.heard = null; runFlagsNext = Object.assign(runPack(), { up: "another" }); runTake()');
  ok(g.run('RUN.up') === '', 'a guest handed a mark it does not run takes nothing');
  g.run(`runFlagsNext = Object.assign(runPack(), { up: ${JSON.stringify(sig)} }); runTake()`);
  ok(g.run('RUN.up') === sig, 'and the host\'s, when it runs the same');
}

section('snapshot: a run in a room travels, and points at the same room');
{
  const a = boot(), b = boot();
  fresh(a, 11);
  a.run('stage = STAGES[4]; upFelled({ boss: "nullcore" }); wave = 25; stageAbs = 5; enterStage(STAGES[0])');
  step(a, 1);
  for (let i = 0; i < 12 && a.run('upIdx') < 0; i++) { stand(a); step(a, 0.2); }
  step(a, 4);
  const snap = a.run('JSON.stringify(snapWrite())');
  ok(JSON.parse(snap).bad === 0, 'nothing in it that cannot travel', JSON.parse(snap).badAt);
  fresh(b, 99);
  b.run('snapRead(' + snap + ')');
  ok(b.run('stage === UP_ROOMS[0] && upIdx === 0'), 'the other copy is in the same room, by identity');
  ok(b.run('JSON.stringify(upWorld)') === a.run('JSON.stringify(upWorld)'), 'with the module\'s share of the run');
  ok(b.run('wave') === a.run('wave') && b.run('simRngState') === a.run('simRngState'), 'the same run');
}

section('secrecy: the block names nothing it should not');
{
  const src = fs.readFileSync(IDX, 'utf8');
  const at = src.indexOf('   THE WAY UP\r\n'), end = src.indexOf('end of THE WAY UP');
  ok(at > 0 && end > at, 'the block is there');
  /* The words that must never be here are kept out of the repo too: name a
     file of them (one a line) in UP_SEALED to have them checked. */
  const list = process.env.UP_SEALED && fs.existsSync(process.env.UP_SEALED)
    ? fs.readFileSync(process.env.UP_SEALED, 'utf8').split(String.fromCharCode(10)).map(s => s.trim().toLowerCase()).filter(Boolean) : null;
  const fix = fs.readFileSync(path.join(here, 'fixtures', 'up-rooms.js'), 'utf8').toLowerCase(), blk = src.slice(at, end).toLowerCase();
  if (list) ok(!list.some(w => blk.includes(w) || fix.includes(w)), 'no word of UP_SEALED in the block or the stand-in', list.filter(w => blk.includes(w) || fix.includes(w)));
  else console.log('  (UP_SEALED not set: the sealed words are not checked)');
  ok(!/UP_DEV[^]*?location\.hostname[^]*?\.online/.test(src.slice(at, end)), 'the dev switch is localhost only');
  const d = loadGame(IDX, { search: '?up=https://example.com/m.js' });
  ok(d.run('UP_DEV') === null, 'a module from anywhere but this machine is never fetched');
}

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
