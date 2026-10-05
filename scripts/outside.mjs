/* ===========================================================================
   THE OUTSIDE PILOTS TEST — `npm run test:outside`  (OUTSIDE PILOTS, index.html)

   The game in Node (scripts/lib/game-vm.mjs), with the network stubbed to
   answer as the vault does (src/vault.js), and the tests' stand-in pilot
   (scripts/fixtures/outside-pilot.js) as the module. The loader runs only
   what the vault meant to send, as the id it was sent under, and never one
   of the game's own; the pilot flies, its hooks each take their turn, and
   one that throws is skipped without stopping the run; and nothing it flies
   is recorded, offered to the account's public unlocks, or taken into the
   co-op lobby. Whether it stays in step and survives a snapshot is
   scripts/determinism.mjs's 'outside' scenario.
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
const FIXTURE = fs.readFileSync(path.join(here, 'fixtures', 'outside-pilot.js'), 'utf8');
const sha = t => createHash('sha256').update(t).digest('hex');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);

/* A copy of the game whose network is the vault: `files` is id -> text (or
   { text, hash } to send a hash that is not the text's), anything else 404.
   Every request is kept in `asked`. */
function game(files = {}) {
  const g = loadGame(IDX, { w: 1280, h: 720 });
  g.asked = [];
  g.errors = [];
  g.vault = () => g.asked.filter(a => a.url.startsWith('/api/vault'));   // the game asks for the account too, at boot
  g.win.console = Object.assign(Object.create(console), { error: (...a) => g.errors.push(a.map(String).join(' ')) });
  g.win.fetch = async (url, opt = {}) => {
    g.asked.push({ url: String(url), method: opt.method || 'GET', body: opt.body });
    const m = /^\/api\/vault\?id=([^&]*)&h=(.*)$/.exec(String(url));
    const f = m && files[decodeURIComponent(m[1])];
    if (!f) return { ok: false, status: 404, headers: { get: () => null }, text: async () => '', json: async () => ({ error: 'not found' }) };
    const text = typeof f === 'string' ? f : f.text, hash = typeof f === 'string' ? sha(f) : f.hash;
    return { ok: true, status: 200, headers: { get: k => (k.toLowerCase() === 'x-vault-hash' ? hash : null) },
             text: async () => text, json: async () => { throw new Error('not json'); } };
  };
  return g;
}

/* code in the game's own scope */
const run = (g, code) => g.run(code);
const boot = (g, list) => run(g, 'Outside.boot(' + JSON.stringify(list) + ')');
const item = (id, text) => ({ id, h: sha(text), size: Buffer.byteLength(text) });
const STEP = 'update(1 / 60)';
const steps = (g, n) => { for (let i = 0; i < n; i++) run(g, 'if (state !== "play" && state !== "dead") state = "play"; ' + STEP); };
// into a run as pilot `id`, on a fixed seed, the hull too tough to die by accident
const fly = (g, id) => run(g, `Save.profile.gfxSeen = GFX_VER; applyChar(CHARS.findIndex(c => c.id === ${JSON.stringify(id)}));
  runSeedNext = 7; resetGame(); state = 'play'; P.maxHp = P.hp = 1e6;`);

/* ---------------------------------------------------------------------- */
section('the loader runs what the vault sent, as the id it was sent under');
{
  const g = game({ x0: FIXTURE });
  const base = run(g, 'CHARS.length');
  await boot(g, [item('x0', FIXTURE)]);
  ok(g.vault().length === 1 && g.vault()[0].url === '/api/vault?id=x0&h=' + sha(FIXTURE), 'asked once, by its hash', g.vault());
  ok(run(g, 'CHARS.length') === base + 1, 'one pilot more');
  const c = JSON.parse(run(g, 'JSON.stringify(CHARS[CHARS.length - 1])'));
  ok(c.id === 'x0' && c.outside === true && c.n === 'TEST PILOT' && c.weapon === 'bullet' && c.hp === 110,
     'a CHARS entry, marked as from outside, its name in capitals', c);
  ok(run(g, "Object.keys(OUTSIDE.by.get('x0')).sort().join()") === run(g, 'OUTSIDE_HOOKS.slice().sort().join()'), 'every hook kept',
     run(g, "Object.keys(OUTSIDE.by.get('x0')).sort().join()"));
  await boot(g, [item('x0', FIXTURE)]);
  ok(g.vault().length === 1 && run(g, 'CHARS.length') === base + 1, 'booted again: not fetched or added twice');
  ok(!g.errors.length, 'nothing logged', g.errors);
}

/* ---------------------------------------------------------------------- */
section('and nothing else: a damaged copy, another id, one of the game\'s own, a bad def, a 404');
{
  const other = FIXTURE.replace('id: VR.id', "id: 'runner'");
  const weapon = FIXTURE.replace("weapon: 'bullet'", "weapon: 'nuke'");
  const noHp = FIXTURE.replace('hp: 110,', 'hp: -1,');
  const g = game({ bent: { text: FIXTURE, hash: '0'.repeat(64) }, liar: other, runner: FIXTURE, armed: weapon, frail: noHp });
  const base = run(g, 'CHARS.length');
  await boot(g, [item('bent', FIXTURE), item('liar', other), item('runner', FIXTURE), item('armed', weapon), item('frail', noHp), item('gone', 'x')]);
  ok(g.vault().length === 6, 'each was asked for', g.vault().map(a => a.url));
  ok(run(g, 'CHARS.length') === base && run(g, 'OUTSIDE.by.size') === 0, 'none of them became a pilot');
  ok(run(g, "CHARS[0].id === 'runner' && !CHARS[0].outside"), 'VOIDRUNNER is still VOIDRUNNER');
  const said = g.errors.join('\n');
  ok(/bent: not the text the vault sent/.test(said), 'a hash that does not match: refused before it runs', g.errors);
  ok(/the id it was loaded as: liar/.test(said), 'a def under another id: refused', g.errors);
  ok(/runner is one of the game's own/.test(said), 'the vault naming one of the game\'s own: refused', g.errors);
  ok(/armed: no weapon called nuke/.test(said) && /frail: hp is a number over 0/.test(said), 'a def that does not hold up: refused', g.errors);
  ok(g.errors.length === 5, 'and the 404 quietly: nothing to say', g.errors);
}

/* ---------------------------------------------------------------------- */
section('it flies: each hook takes its turn, as the pilot');
const G = game({ x0: FIXTURE });
await boot(G, [item('x0', FIXTURE)]);
{
  fly(G, 'x0');
  ok(run(G, "P.charId === 'x0' && P.outside === 1 && P.weapon === 'bullet' && P.maxHp > 0"), 'a pilot of its own');
  ok(run(G, 'P.ox && P.ox.pulses === 0 && P.ox.guard === 2 && P.ox.ev.run === 1'), 'init put its state on the pilot, and the run was heard',
     run(G, 'JSON.stringify(P.ox)'));
  ok(run(G, 'JSON.stringify(outsideWorld)') === '{}', 'the run\'s share starts empty');
  steps(G, 400);
  ok(run(G, 'P.ox.pulses') >= 2 && run(G, 'outsideWorld.test && outsideWorld.test.ticks') > 0, 'step ran, every step', run(G, 'JSON.stringify(P.ox)'));
  run(G, "inputPress('z')");
  steps(G, 1);
  ok(run(G, 'P.ox.mode') === 1 && run(G, 'P.ox.keys') === 1, 'key: Z taken by the pilot', run(G, 'JSON.stringify(P.ox)'));
  // drawing: every layer, as the pilot, and the canvas handed back as it was
  const draws = () => JSON.parse(run(G, `(() => { const h = OUTSIDE.by.get('x0'), n = {}, keep = {};
    for (const k of ['back', 'floor', 'under', 'over', 'fx', 'hud', 'hull', 'screen', 'cursor', 'bullet']) { keep[k] = h[k]; h[k] = (...a) => { n[k] = (n[k] || 0) + 1; return keep[k](...a); }; }
    const t = ctx.getTransform ? 0 : 0; render(); Object.assign(h, keep); return JSON.stringify(n); })()`));
  run(G, 'mouse.down = true'); steps(G, 20); run(G, 'mouse.down = false');
  const n = draws();
  // the hull's outline is drawn by every pass that needs it (glow, body, edge), so at least once; a round each, in view
  ok(n.back === 1 && n.floor === 1 && n.under === 1 && n.over === 1 && n.fx === 1 && n.hud === 1 && n.screen === 1 && n.cursor === 1 &&
     n.hull >= 1 && n.bullet >= 1, 'render: the room, floor, under, over, fx, the HUD, the screen and the cursor once each; the hull; its rounds', n);
  ok(run(G, "JSON.stringify(OUTSIDE.errs)") === '{}', 'and none of it threw');
  // the menu: its place in the row, and the menu while it is chosen
  const menu = JSON.parse(run(G, `(() => { const h = OUTSIDE.by.get('x0'), keep = { hangar: h.hangar, menu: h.menu, hull: h.hull }, n = {};
    for (const k in keep) h[k] = (...a) => { n[k] = (n[k] || 0) + 1; return keep[k](...a); };
    const was = state; state = 'menu'; render(); state = was; Object.assign(h, keep); return JSON.stringify(n); })()`));
  ok(menu.hangar === 1 && menu.menu === 1 && !menu.hull, 'the menu: hangar() in the row, menu() as the one chosen, its hull left to them', menu);
}

/* ---------------------------------------------------------------------- */
section('its keys: every one its kit answers, through the game\'s own way in, and what is held');
{
  fly(G, 'x0');
  const mode = () => run(G, 'P.ox.mode');
  run(G, "handleKey('3')"); steps(G, 1);
  ok(mode() === 2 && run(G, 'P.ox.keys') === 1, 'a number key in a run: queued, then played to it', run(G, 'JSON.stringify(P.ox)'));
  run(G, "for (const k of ['1', 'e', 'f', 'x', 'c', '4']) handleKey(k)"); steps(G, 1);
  ok(run(G, 'P.ox.keys') === 7 && mode() === 0, 'and the rest of them, every one', run(G, 'P.ox.keys'));
  run(G, "keys['1'] = false; keys['e'] = false; keys['f'] = false; keys['x'] = false; keys['c'] = false; keys['4'] = false; keys['3'] = false");
  // held: from the devices into the record, and the kit reads only the record
  run(G, "keys['q'] = true; keys['x'] = true"); steps(G, 3);
  ok(run(G, 'P.in.held') === 'qx' && run(G, 'P.ox.held') === 3, 'held keys: in the record, in the order kept (qx)', run(G, 'P.in.held'));
  run(G, "keys['q'] = false; keys['x'] = false"); steps(G, 1);
  ok(run(G, 'P.in.held') === '' && run(G, 'P.ox.held') === 3, 'let go: nothing held');
  // the game's own pilots: neither the number keys nor anything held
  fly(G, 'runner');
  run(G, "inputQueue.length = 0; handleKey('2'); keys['q'] = true");
  ok(run(G, 'inputQueue.length') === 0, 'VOIDRUNNER: a number key in a run is nobody\'s');
  steps(G, 1);
  ok(run(G, 'P.in.held') === '', 'and nothing held is kept for it');
  run(G, "keys['q'] = false; keys['2'] = false");
  // the wire: what lockstep sends keeps the number keys and what is held, and costs nothing when there is nothing held
  const wire = JSON.parse(run(G, `(() => {
    const a = Object.assign(newInput(), { held: 'qzx4', press: ['1', '4', 'e', 'parry'], ax: 300, ay: 200 });
    const b = Object.assign(newInput(), { press: ['q'], ax: 300, ay: 200 });
    const ra = lsCanon(a), rb = lsCanon(b);
    return JSON.stringify({ ra: [ra.held, ra.press], rb: [rb.held, rb.press] });
  })()`));
  ok(wire.ra[0] === '4qzx' && wire.ra[1].join() === '1,4,e,parry', 'on the wire: the number keys, and what is held in the record order', wire);
  ok(wire.rb[0] === '' && wire.rb[1].join() === 'q', 'nothing held: none read back', wire);
}

/* ---------------------------------------------------------------------- */
section('its weapon, its blink, and the blow: its own');
{
  fly(G, 'x0');
  // a body to shoot, straight ahead of the hull
  run(G, "inputSource = rec => { inputSample(rec); rec.ax = P.x + 300; rec.ay = P.y; }; spawnEnemy('brute', P.x + 160, P.y)");
  const ours = () => run(G, 'bullets.filter(b => b.ox !== undefined).length');
  run(G, 'mouse.down = true'); steps(G, 30); run(G, 'mouse.down = false');
  ok(run(G, 'P.ox.shots') > 0 && ours() > 0, 'fire(): the trigger, its own rounds, tagged', run(G, 'P.ox.shots'));
  steps(G, 30);
  ok(run(G, 'P.ox.hits') > 0, 'hit(): told where its rounds landed', run(G, 'JSON.stringify(P.ox)'));
  run(G, 'inputSource = inputSample');
  // the blink, on space: moved the whole way, and the press spent
  const x0 = run(G, 'P.x');
  run(G, "keys[' '] = true; P.iframe = 0"); steps(G, 1);
  ok(run(G, 'P.ox.blinks') === 1 && Math.abs(run(G, 'P.x') - x0) > 100 && run(G, "!keys[' ']"), 'dash(): its blink in place of the dash, the press spent',
     { blinks: run(G, 'P.ox.blinks'), moved: run(G, 'P.x') - x0 });
  // the blow: two guards take it whole, then half lands
  run(G, 'enemies.length = 0; ebullets.length = 0');
  const hp0 = run(G, 'P.hp = P.maxHp = 1000');
  const blow = () => run(G, 'P.iframe = 0; hurtPlayer(40); P.hp');
  ok(blow() === 1000 && blow() === 1000 && run(G, 'P.ox.blocked') === 2, 'hurt(): true takes a blow whole', run(G, 'JSON.stringify(P.ox)'));
  ok(blow() === 980 && run(G, 'P.ox.halved') === 1, 'and a number is what lands instead (half of 40)', run(G, 'P.hp'));
}

/* ---------------------------------------------------------------------- */
section('its cut-in holds the room, the hull and every blow, and hides the crosshair');
{
  fly(G, 'x0');
  run(G, "enemies.length = 0; ebullets.length = 0; spawnEnemy('grunt', P.x + 400, P.y)");
  run(G, "handleKey('v'); keys['v'] = false"); steps(G, 1);
  ok(run(G, 'outsideCut()') === true && run(G, 'slowmo') === 0.1, 'cut(): on, and the room at slow() (0.1)', run(G, 'slowmo'));
  const x0 = run(G, 'P.x'), hp0 = run(G, 'P.hp');
  run(G, "keys['d'] = true"); steps(G, 10); run(G, "keys['d'] = false");
  ok(run(G, 'P.x') === x0, 'the hull stands still', run(G, 'P.x') - x0);
  run(G, 'P.iframe = 0; hurtPlayer(50)');
  ok(run(G, 'P.hp') === hp0 && run(G, 'P.ox.blocked') === 0, 'nothing lands, nothing even reaches hurt()');
  const n = JSON.parse(run(G, `(() => { const h = OUTSIDE.by.get('x0'), n = {}, keep = { screen: h.screen, cursor: h.cursor };
    for (const k in keep) h[k] = (...a) => { n[k] = (n[k] || 0) + 1; return keep[k](...a); };
    render(); Object.assign(h, keep); return JSON.stringify(n); })()`));
  ok(n.screen === 1 && !n.cursor, 'its screen drawn, no crosshair at all', n);
  steps(G, 60);
  ok(run(G, 'outsideCut()') === false && run(G, 'slowmo') === 1, 'over: the room\'s clock back', run(G, 'slowmo'));
  run(G, "keys['d'] = true"); steps(G, 10); run(G, "keys['d'] = false");
  ok(run(G, 'P.x') > x0, 'and the hull flies again');
}

/* ---------------------------------------------------------------------- */
section('it hears the run: a floor, a kill, a level, the end');
{
  fly(G, 'x0');
  const ev = () => JSON.parse(run(G, 'JSON.stringify(P.ox.ev)'));
  ok(ev().run === 1 && !ev().stage, 'a run begins: run, and no floor yet', ev());
  // the first wave enters the first floor
  for (let i = 0; i < 600 && !ev().stage; i++) steps(G, 1);
  ok(ev().stage === 1, 'stage: the first floor', ev());
  const k0 = ev().kill || 0;
  run(G, "const e = spawnEnemy('grunt', P.x + 300, P.y); damageEnemy(e, 1e6, false, P.x, P.y)");
  ok(ev().kill === k0 + 1, 'kill: a body dies', ev());
  run(G, 'P.xp = P.xpNext; checkLevel(); if (state === "levelup") { offers = []; state = "play"; }');
  ok(ev().level === 1, 'level: a level dealt', ev());
  run(G, 'gameOver(true)');
  ok(ev().dead === 1, 'dead: the end', ev());
}

/* ---------------------------------------------------------------------- */
section('a hook that throws is logged once, skipped, and the run goes on');
{
  fly(G, 'x0');
  const before = G.errors.length;
  run(G, "OUTSIDE.by.get('x0').__step = OUTSIDE.by.get('x0').step; OUTSIDE.by.get('x0').step = () => { throw new Error('broken on purpose'); }");
  const t0 = run(G, 'simTick');
  steps(G, 30);
  ok(run(G, 'simTick') === t0 + 30 && run(G, "state") === 'play', 'thirty steps all the same');
  ok(run(G, "OUTSIDE.errs['x0.step']") === 30, 'every one counted', run(G, 'JSON.stringify(OUTSIDE.errs)'));
  ok(G.errors.length === before + 1 && /x0\.step.*broken on purpose/.test(G.errors[before]), 'and said once', G.errors.slice(before));
  run(G, "OUTSIDE.by.get('x0').step = OUTSIDE.by.get('x0').__step; delete OUTSIDE.by.get('x0').__step; OUTSIDE.errs = {}");
  const p0 = run(G, 'P.ox.pulses');
  steps(G, 200);
  ok(run(G, 'P.ox.pulses') > p0, 'mended, it picks up where it was');
}

/* ---------------------------------------------------------------------- */
section('it counts for nothing: no record, no best, no board, no ladder');
{
  const rec = () => JSON.parse(run(G, `JSON.stringify({ runs: Save.profile.runs || 0, best: Save.profile.best || 0, kills: Save.profile.kills || 0,
    bestRun: Save.profile.bestRun || null, rushRuns: Save.profile.rushRuns || 0, rushBest: Save.profile.rushBest || 0 })`));
  const posts = () => G.asked.filter(a => a.method === 'POST' && /leaderboard/.test(a.url)).length;
  run(G, "Save.profile.name = 'tester'");
  // the game's own pilot, first, so the test is seen to see a record when there is one
  fly(G, 'runner'); steps(G, 60);
  let r0 = rec(), p0 = posts();
  run(G, 'score = 1234567; gameOver(true)');
  let r1 = rec();
  ok(r1.runs === r0.runs + 1 && r1.best === 1234567 && posts() === p0 + 1, 'VOIDRUNNER: recorded and sent to the board (the test can see one)', { r0, r1 });
  // now the outside pilot, a far better run
  fly(G, 'x0'); steps(G, 60);
  r0 = rec(); p0 = posts();
  run(G, 'score = 9999999; gameOver(true)');
  r1 = rec();
  ok(JSON.stringify(r1) === JSON.stringify(r0), 'the outside pilot: the profile untouched', { r0, r1 });
  ok(posts() === p0, 'no board heard of it');
  ok(run(G, 'lastStats.outside === true && lastStats.isRecord === false && lastStats.score === 9999999'), 'the death screen\'s numbers, marked as not counting');
  // the rush, which pays out on its own ladder
  run(G, "applyChar(CHARS.findIndex(c => c.id === 'x0')); runSeedNext = 8; startRush(); state = 'play'; P.maxHp = P.hp = 1e6");
  ok(run(G, 'P.charId') === 'x0' && run(G, '!!(Chal.on && Chal.on.rush)'), 'into a rush as the outside pilot');
  steps(G, 60);
  r0 = rec();
  run(G, 'score = 500000; gameOver(true)');
  ok(JSON.stringify(rec()) === JSON.stringify(r0), 'the rush: no run, no best on its ladder', { r0, r1: rec() });
  run(G, 'quitToMenu()');
  // a challenge, beaten: kept (the profile shows it to anybody) for the game's own pilot, never for this one
  const ch = run(G, 'CHALLENGES.findIndex(c => chalOpen(c) && !(c.m && c.m.char !== undefined))');
  ok(ch >= 0, 'a challenge any pilot may fly', ch);
  const beat = id => JSON.parse(run(G, `(() => { const c = CHALLENGES[${ch}]; Save.profile.chal = [];
    applyChar(CHARS.findIndex(x => x.id === ${JSON.stringify(id)})); runSeedNext = 9; startChallenge(c); P.maxHp = P.hp = 1e6;
    chalCheckGoal(c.goal); const out = { pilot: P.charId, won: Chal.won, kept: Save.profile.chal.slice(), reward: !!Chal.reward };
    chalQuit(); quitToMenu(); return JSON.stringify(out); })()`));
  const mine = beat('runner'), theirs = beat('x0');
  ok(mine.pilot === 'runner' && mine.won && mine.kept.length === 1, 'VOIDRUNNER beats it: the clear is kept (the test can see one)', mine);
  ok(theirs.pilot === 'x0' && theirs.won && !theirs.kept.length && !theirs.reward, 'the outside pilot beats it: won, and nothing kept', theirs);
}

/* ---------------------------------------------------------------------- */
section('kept to this machine: not in the account\'s unlocks, not into the co-op lobby');
{
  const u = JSON.parse(run(G, 'JSON.stringify(Account.unlocks(Save.profile))'));
  ok(u.chars.includes('runner') && !u.chars.includes('x0'), 'Account.unlocks: the game\'s pilots, never this one', u.chars);
  run(G, "state = 'menu'; applyChar(CHARS.findIndex(c => c.id === 'x0'))");
  ok(run(G, 'CHAR().id') === 'x0', 'picked at the menu');
  run(G, 'openLan()');
  ok(run(G, "state") === 'lan' && run(G, 'CHAR().id') === 'runner' && run(G, 'Save.profile.charIdx') === 0, 'the lobby: back to the first pilot', run(G, 'CHAR().id'));
  // cycling through the lobby's pilots passes it by
  const seen = run(G, `(() => { const s = new Set(); for (let i = 0; i < CHARS.length * 2; i++) { lanCycleChar(); s.add(CHAR().id); } return [...s].join(); })()`);
  ok(!seen.split(',').includes('x0') && seen.split(',').includes('runner'), 'C in the lobby never lands on it', seen);
  run(G, "state = 'menu'");
}

/* ---------------------------------------------------------------------- */
section('the pilot last flown here comes back once it has loaded, at the menu');
{
  const g = game({ x0: FIXTURE });
  const at = run(g, 'CHARS.length');                 // where it will land
  run(g, `Save.profile.charIdx = ${at}; applyChar(Save.profile.charIdx); state = 'menu'`);
  ok(run(g, 'CHAR().id') !== 'x0', 'before it loads, a pilot of the game\'s own');
  await boot(g, [item('x0', FIXTURE)]);
  ok(run(g, 'CHAR().id') === 'x0' && run(g, 'selectedChar') === at, 'loaded: flown again', run(g, 'CHAR().id'));
  // but never swapped in under a run already going
  const h = game({ x0: FIXTURE });
  run(h, `Save.profile.charIdx = ${at}; applyChar(0); runSeedNext = 3; resetGame(); state = 'play'`);
  await boot(h, [item('x0', FIXTURE)]);
  ok(run(h, 'CHAR().id') === 'runner' && run(h, 'P.charId') === 'runner', 'mid-run: the run keeps its pilot');
}

/* ---------------------------------------------------------------------- */
section('end to end: the real Worker and database, the game signing in through them');
{
  const { makeD1 } = await import('./lib/d1-sqlite.mjs');
  const { putSql, giveSql } = await import('./lib/vault-sql.mjs');
  const worker = (await import('../src/index.js')).default;
  const DB = makeD1();
  const env = { DB, ASSETS: { fetch: () => new Response('asset') } };
  const exec = sql => DB.sql.exec(sql);
  /* One browser: the game's fetch goes to the Worker, with a cookie jar that
     every page of it shares. `asked` keeps each path it asked for. */
  const browser = ip => {
    const b = { cookie: '', asked: [] };
    b.fetch = async (url, opt = {}) => {
      b.asked.push(String(url));
      const headers = new Headers(opt.headers || {});
      headers.set('origin', 'https://voidrunner.online');
      headers.set('cf-connecting-ip', ip);
      if (b.cookie) headers.set('cookie', 'vr_s=' + b.cookie);
      const res = await worker.fetch(new Request('https://voidrunner.online' + url,
        { method: opt.method || 'GET', headers, body: opt.body }), env);
      const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
      if (m) b.cookie = m[1];
      return res;
    };
    // a page of it, keeping its own list of what it asked for
    b.page = () => {
      const g = loadGame(IDX, { w: 1280, h: 720 });
      g.asked = [];
      g.win.fetch = (url, opt) => { g.asked.push(String(url)); return b.fetch(url, opt); };
      return g;
    };
    return b;
  };
  const until = async (g, cond) => { for (let i = 0; i < 300 && !run(g, cond); i++) await new Promise(r => setTimeout(r, 10)); return !!run(g, cond); };

  // the entry put and the perk given the way `npm run vault` does it, to an account made by the game
  exec(putSql('x0', Buffer.from(FIXTURE)).sql);
  const dev = browser('10.9.0.1'), plain = browser('10.9.0.2');
  for (const [b, name] of [[dev, 'vault_dev'], [plain, 'vault_plain']]) {
    const g = b.page();
    const r = await run(g, `Account.signUp(${JSON.stringify(name)}, 'correct horse ' + ${JSON.stringify(name)})`);
    ok(r && r.ok, 'the game signs up ' + name, r);
  }
  exec(giveSql('vault_dev', 'x0'));

  // signing in on a page: the account answers, and the pilot arrives
  const A = dev.page();
  const base = run(A, 'CHARS.length');
  const r = await run(A, "Account.signIn('vault_dev', 'correct horse vault_dev')");
  ok(r && r.ok, 'signed in', r);
  ok(await until(A, "OUTSIDE.by.has('x0')"), 'signed in: the pilot arrives', A.asked);
  ok(run(A, 'CHARS.length') === base + 1 && run(A, "CHARS[CHARS.length - 1].n") === 'TEST PILOT', 'in the hangar, as the vault named it');
  ok(A.asked.filter(u => u.startsWith('/api/vault')).length === 1, 'fetched once', A.asked);

  // a page loaded already signed in: the boot's account reply names it
  const B = dev.page();
  await run(B, 'Account.boot()');
  ok(await until(B, "OUTSIDE.by.has('x0')"), 'a new page, signed in: the pilot arrives from the boot', B.asked);
  ok(run(B, "Account.me && Account.me.name") === 'vault_dev', 'as the account it is');

  // it flies a run on the page, and the account's save says nothing of it
  fly(A, 'x0');
  steps(A, 300);
  ok(run(A, "P.charId === 'x0' && P.ox.pulses > 0"), 'a run flown with it', run(A, 'JSON.stringify(P.ox)'));
  run(A, 'score = 777777; gameOver(true)');
  await run(A, 'Account.push()');
  const row = DB.sql.prepare('SELECT s.data, s.unlocks FROM saves s JOIN accounts a ON a.id = s.account WHERE a.name = ?').get('vault_dev');
  ok(row && !/"x0"/.test(row.data) && !JSON.parse(row.unlocks).chars.includes('x0'), 'the save pushed: no trace of the pilot, nor in its unlocks',
     row && JSON.parse(row.unlocks).chars);
  ok(row && !row.data.includes('777777'), 'nor the run');

  // an account without the perk: no field, no request, no pilot
  const C = plain.page();
  await run(C, "Account.signIn('vault_plain', 'correct horse vault_plain')");
  await run(C, 'Account.boot()');
  await new Promise(r => setTimeout(r, 50));
  ok(C.asked.includes('/api/account') && !C.asked.some(u => u.startsWith('/api/vault')) && !run(C, "OUTSIDE.by.has('x0')"),
     'another account: never asks, never has it', C.asked);
  // and asking by hand gets the same as asking for nothing
  const a = await plain.fetch('/api/vault?id=x0'), b = await plain.fetch('/api/vault?id=nothing');
  ok(a.status === 404 && (await a.text()) === (await b.text()), 'asking by hand: the answer nothing gets');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\nall ${passes} passed`);
process.exit(fails ? 1 : 0);
