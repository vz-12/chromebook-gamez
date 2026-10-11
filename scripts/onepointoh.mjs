#!/usr/bin/env node
/* ===========================================================================
   ONE POINT OH — the route's test: `npm run test:opo` (ONE-POINT-OH-PLAN.md)

   The game and the first build, in Node (scripts/lib/game-vm.mjs), with no
   browser. The copy's frame is a second context whose parent is the game's
   window, so the two talk exactly as they do on the page (OPO_HOST,
   OPO_COPY).

     the copy      onepointoh/first.html is 3af8b6d's script byte for byte,
                   with the seal and the hooks around it (opo-build --check)
     the seals     booted and played, the first build never reads or writes
                   today's save key, never fetches anything, and its top five
                   is the lock's own runs
     the coaxing   five lines in five portal rooms, counted on the profile;
                   then the old door, always the first time, about half the
                   rooms after; never in a daily, a challenge, the rush,
                   freeplay, co-op, a statue's run, or once he is beaten
     the door      apart from the gates, slow to arm, entered only by
                   standing in it; it locks the profile, plays the revert and
                   files the run you left
     the lock      a locked profile boots into the copy and draws nothing of
                   the menu; the profile's merge keeps a lock while either
                   side has one; the account carries it to another device and
                   back; a copy that never starts lifts it; a dev account can
                   lift it by hand, and nobody else can
     the crack     fire into it breaks out, with the run's cards; dying at it
                   keeps what was done; it widens by itself every locked run
     the fight     opened from the break, fought to today: the five phases,
                   the record, HOLLOW, the cascade, out; the lock lifts and
                   the real save is as it was. Left mid-fight, the lock holds
                   and nothing is recorded
     the hooks     every OPO_ART hook is drawn on the way, and none throws

   Whether the portal rooms and the fight stay in step and survive a
   snapshot is scripts/determinism.mjs ('opo-route', 'onepointoh').
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadGame, makeWindow } from './lib/game-vm.mjs';
import { makeD1 } from './lib/d1-sqlite.mjs';
import { checkPage, PAGE } from './opo-build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const IDX = path.join(ROOT, 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 500) : ''));
}
const section = t => console.log('· ' + t);
// checks made inside the game come back as [[cond, what, extra], ...]
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }
const STEP = 1 / 60;

/* ================================ the copy ================================ */
section('the copy (scripts/opo-build.mjs)');
const pageText = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, 'utf8') : null;
{
  const bad = checkPage(pageText);
  ok(!bad.length, 'onepointoh/first.html is 3af8b6d\'s script byte for byte, made by the build script', bad);
  ok(/Content-Security-Policy[^>]*script-src 'self' 'unsafe-inline'/.test(pageText) && !/esm\.sh/.test(pageText.split('<script>')[0]),
     'its policy lets nothing load from anywhere but this site (the third seal)');
  ok(pageText.indexOf('seal.js') < pageText.indexOf('"use strict"') && pageText.indexOf('lock.js') > pageText.lastIndexOf('</script>\n<!--'),
     'the seal runs before its script, the hooks after');
}

/* A storage with a prototype, as a browser's is: the seal patches the
   prototype, in the frame's window only. */
function makeStorageClass() {
  return class Storage {
    constructor() { Object.defineProperty(this, '_m', { value: new Map() }); }
    getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; }
    setItem(k, v) { this._m.set(String(k), String(v)); }
    removeItem(k) { this._m.delete(String(k)); }
    clear() { this._m.clear(); }
    key(i) { return [...this._m.keys()][i] ?? null; }
    get length() { return this._m.size; }
    dump() { return Object.fromEntries(this._m); }
  };
}
const inlineScript = html => [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])[0];
/* The copy, booted: a window of its own, its parent the game's window (or a
   stand-in host), and its three scripts in the page's order. */
function bootCopy(parent, storage) {
  const win = makeWindow(1280, 720);
  const Storage = makeStorageClass();
  win.Storage = Storage;
  win.localStorage = storage || new Storage();
  win.parent = parent || win;
  win.top = parent || win;
  win.Response = undefined;                    // as old as it gets: the seal answers without one
  const ctx = vm.createContext(win);
  const run = (code, name) => vm.runInContext(code, ctx, { filename: name });
  run(fs.readFileSync(path.join(ROOT, 'onepointoh', 'seal.js'), 'utf8'), 'seal.js');
  run(inlineScript(pageText), 'first.html');
  run(fs.readFileSync(path.join(ROOT, 'onepointoh', 'lock.js'), 'utf8'), 'lock.js');
  return { win, ctx, run, store: win.localStorage };
}
const settle = () => new Promise(r => setTimeout(r, 20));

/* ================================ the seals ================================ */
section('the seals');
{
  const calls = { ready: 0, broke: [], art: {}, devLift: 0 };
  const host = { OPO_HOST: {
    ready() { calls.ready++; }, broke(i) { calls.broke.push(i); },
    art(name) { calls.art[name] = (calls.art[name] || 0) + 1; },
    name() { return 'LOCKED_ONE'; }, lines(k) { return k === 'crack' ? ['Leave that.'] : []; },
    devLift() { calls.devLift++; } } };
  const c = bootCopy(host);
  await settle();
  ok(calls.ready === 1, 'the copy says it is up (OPO_HOST.ready)');
  ok(c.run(`Save.profile.name`) === 'LOCKED_ONE' && c.run(`state`) === 'menu', 'it opens on its menu, under the game\'s callsign', c.run(`state`));
  ok(c.run(`Save.status`) === 'error' && c.run(`Save.db`) === null, 'Fireproof never loads: it keeps to the browser', c.run(`Save.status`));
  // play a run to its end, through the first build's own keys
  c.run(`handleKey(' '); P.hp = 1; hurtPlayer(9999);`);
  await settle();
  const keys = Object.keys(c.store.dump());
  ok(!keys.includes('voidrunner_save_v1') && !keys.includes('voidrunner_best'), 'today\'s save key is never written', keys);
  ok(keys.every(k => k.startsWith('voidrunner_opo_')), 'everything it keeps is under the lock\'s own keys', keys);
  const saveOld = JSON.parse(c.store.getItem('voidrunner_opo_save_v1') || '{}');
  ok(saveOld.runs === 1, 'its save is its own, and counts the run', saveOld);
  const refused = JSON.parse(c.run(`JSON.stringify(OPO_SEAL.refused)`));
  ok(!refused.fetch.length && !refused.other.length, 'it fetched nothing it was not answered for', refused);
  const board = JSON.parse(c.store.getItem('voidrunner_opo_board_v1') || '[]');
  ok(board.length === 1 && board[0].name === 'LOCKED_ONE', 'its run was posted to the lock\'s own board, not the Worker', board);
  ok(c.run(`Board.status`) === 'ok' && c.run(`Board.top.length`) === 1, 'and its top five is the lock\'s own runs', c.run(`Board.top.length`));
  // the seal refuses today's key outright, and anything outside
  c.run(`localStorage.setItem('voidrunner_save_v1_x', 'no'); localStorage.setItem('anything', 'no');`);
  ok(c.store.getItem('anything') === null && c.store.getItem('voidrunner_save_v1_x') === null, 'a key outside the lock\'s is never written');
  let threw = false;
  await c.run(`fetch('https://esm.sh/x').then(() => 'got', () => 'refused')`).then(v => { threw = v === 'refused'; });
  ok(threw, 'and a fetch to anywhere else is refused');
  c.run(`dispatchEvent && 0`);
}

/* ========================== today's game, and its art ========================== */
// a copy of the game, art hooks counted, signed in or not
function game(opts = {}) {
  const g = loadGame(IDX, Object.assign({ w: 1280, h: 720 }, opts));
  g.run(`pageDead = true; Save.profile.name = 'PILOT'; Save.profile.gfxSeen = GFX_VER; state = 'menu';
    globalThis.__art = {};
    for (const k of Object.keys(OPO_ART)) { const f = OPO_ART[k]; OPO_ART[k] = (...a) => { __art[k] = (__art[k] || 0) + 1; return f(...a); }; }`);
  return g;
}
const artSeen = {};
const takeArt = g => { for (const [k, n] of Object.entries(JSON.parse(g.run(`JSON.stringify(__art)`)))) artSeen[k] = (artSeen[k] || 0) + n; };
// steps, played as the determinism bot does: the input record written straight in
const BOT = `inputSource = rec => { rec.mx = 0; rec.my = 0; rec.trig = true; rec.lmb = true; rec.auto = false; rec.dash = false;
  rec.touch = false; rec.taim = null; rec.local = false; rec.press = []; rec.held = '';
  const t = opo ? { x: opo.hx, y: opo.hy } : (enemies.find(e => !e.dead) || { x: P.x, y: P.y - 200 });
  rec.ax = t.x; rec.ay = t.y; };`;
const steps = (g, n, draw) => g.run(`(() => { for (let i = 0; i < ${n}; i++) {
  if (state === 'levelup') { uiArm = 0; handleKey('1'); }
  update(${STEP}); ${draw ? 'if (i % 6 === 0) render();' : ''} } return state; })()`);

/* ================================ the coaxing ================================ */
section('the coaxing, and the old door');
{
  const g = game();
  const room = () => g.run(`(() => { lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom(); const d = !!opoDoor; render();
    const out = JSON.stringify({ line: opoLine && opoLine.text, kind: opoLine && opoLine.kind, door: d, n: RUN.opoCoax, saved: Save.profile.opoCoax });
    portals.length = 0; awaitingPortal = false; opoDoor = null; opoLine = null; return out; })()`);
  g.run(`runCharNext = 0; resetGame(); state = 'play'; RUN.altPath = true; ${BOT}`);
  const lines = [];
  for (let i = 0; i < 5; i++) lines.push(JSON.parse(room()));
  ok(lines.every((l, i) => l.kind === 'coax' && l.line && !l.door && l.n === i + 1), 'one line a portal room, five rooms, no door yet', lines);
  ok(lines[4].saved === 5, 'counted on the profile (opoCoax), so a new run picks up where this left off', lines[4]);
  ok(lines[0].line === 'There were no doors. The next room just came.', 'in his words', lines[0].line);
  const first = JSON.parse(room());
  ok(first.door && first.kind === 'door' && first.line === 'Just go in. You will see.', 'the next portal room: the old door, always', first);
  const more = [];
  for (let i = 0; i < 24; i++) more.push(JSON.parse(room()));
  const doors = more.filter(r => r.door).length;
  ok(doors >= 6 && doors <= 18, 'walked past, it comes back in about half the portal rooms', doors);
  ok(more.filter(r => r.door).every(r => r.kind === 'still'), 'and he keeps on: "Still here." "It is not far."', more.filter(r => r.door).map(r => r.line));
  // only ordinary solo runs
  g.run(`Save.profile.opoCoax = 0;`);
  const not = {
    daily:    `Chal.on = { daily: true, n: 'DAILY' };`,
    challenge:`Chal.on = { n: 'X' };`,
    freeplay: `freeRun = true;`,
    statue:   `riteRun = 'runner';`,
    beaten:   `RUN.opoDone = true;`,
    'no fracture': `RUN.altPath = false;`
  };
  for (const [k, set] of Object.entries(not)) {
    const r = JSON.parse(g.run(`(() => { runCharNext = 0; resetGame(); state = 'play'; RUN.altPath = true; RUN.opoCoax = 0; ${set}
      lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom(); const o = JSON.stringify({ line: opoLine && opoLine.text, n: RUN.opoCoax });
      Chal.on = null; freeRun = false; riteRun = null; return o; })()`));
    ok(!r.line && !r.n, 'never in ' + (k === 'beaten' ? 'a run once he is beaten' : k === 'no fracture' ? 'a run before THE FRACTURE is open' : 'a ' + k + '\'s run'), r);
  }
  // the door itself: apart, slow to arm, and entered only by standing in it
  g.run(`runCharNext = 0; resetGame(); state = 'play'; RUN.altPath = true; RUN.opoCoax = OPO_SAY.coax.length; lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom();`);
  const placed = JSON.parse(g.run(`JSON.stringify({ d: opoDoor, gates: portals.map(p => ({ x: p.x, y: p.y, r: p.r })) })`));
  ok(placed.d && placed.gates.every(p => Math.hypot(p.x - placed.d.x, p.y - placed.d.y) > p.r + placed.d.r + 100), 'it stands apart from the two gates', placed);
  g.run(`P.x = opoDoor.x; P.y = opoDoor.y; for (let i = 0; i < 60; i++) opoDoorTick(${STEP});`);
  ok(g.run(`!!opoDoor && !opoLocked()`), 'it does not take you while it arms');
  g.run(`for (let i = 0; i < Math.ceil(OPO.doorArm * 60); i++) { P.x = opoDoor.x + (i % 2 ? 300 : 0); opoDoorTick(${STEP}); }`);
  ok(g.run(`!!opoDoor && !opoLocked()`), 'nor flying through it');
  const runs0 = g.run(`Save.profile.runs`);
  g.run(`score = 1234; wave = 26; P.x = opoDoor.x; P.y = opoDoor.y; for (let i = 0; i < 60 && opoDoor; i++) opoDoorTick(${STEP});`);
  ok(g.run(`!opoDoor && !!opoRevert && opoLocked()`), 'standing in it: the lock is on the profile at once, and the revert plays');
  g.run(`for (let i = 0; i < 60 * 4; i++) { update(${STEP}); render(); }`);
  ok(g.run(`!!opoRevert && state === 'play' && /^\\u2018.*\\.\\u2019$/.test(opoLine.text)`), 'he quotes each piece as it goes', g.run(`opoLine && opoLine.text`));
  g.run(`for (let i = 0; i < 60 * 5 && state !== 'opolock'; i++) { update(${STEP}); render(); }`);
  ok(g.run(`state`) === 'opolock' && g.run(`OpoLock.on`), 'and ends on the first build: the lock', g.run(`state`));
  ok(g.run(`Save.profile.runs`) === runs0 + 1, 'the run you walked out of is filed as it stood');
  render(g);
  takeArt(g);
}
function render(g) { g.run(`render()`); }

/* ================================ the lock ================================ */
section('the lock');
{
  // the merge: a lock holds while either side has one, a lift lets it go, beaten is gone
  const g = game();
  const m = JSON.parse(g.run(`(() => {
    const b = o => Object.assign(Save.blank(), o);
    const L = (a, c) => opoLocked(Save.merge(b(a), b(c)));
    return JSON.stringify({
      either: L({ opoLock: 1 }, {}) && L({}, { opoLock: 1 }),
      lifted: !L({ opoLock: 1, opoLift: 1 }, { opoLock: 1 }),
      again: L({ opoLock: 2, opoLift: 1 }, { opoLock: 1, opoLift: 1 }),
      beaten: !L({ opoLock: 3 }, { opoDone: true }),
      repaired: (() => { const p = Save.repair(b({ opoLock: 'x', opoLift: -4, opoCoax: 2.5 })); return p.opoLock === 0 && p.opoLift === 0 && p.opoCoax === 2; })()
    }); })()`));
  ok(m.either && m.lifted && m.again && m.beaten, 'a merge keeps a lock while either side has one, lets it go on a lift, and never once he is beaten', m);
  ok(m.repaired, 'and junk on disk is nothing', m);

  // boot: a locked profile goes straight into the copy, and draws nothing of the menu
  g.run(`opoLockSet(); state = 'menu'; update(${STEP});`);
  ok(g.run(`state`) === 'opolock' && g.run(`OpoLock.on && !!OpoLock.el`), 'a locked profile boots into the first build, framed', g.run(`state`));
  g.run(`globalThis.__menu = 0; const _rm = renderMenu; renderMenu = () => { __menu++; _rm(); }; render(); renderMenu = _rm;`);
  ok(g.run(`__menu`) === 0, 'and today\'s menu is never drawn');
  ok(g.run(`(handleKey('k'), handleKey('l'), handleKey('h'), state)`) === 'opolock', 'none of today\'s keys open anything (challenges, co-op, the hub)');
  // a copy that never starts lifts the lock rather than leave a blank page
  g.run(`for (let i = 0; i < 60 * (OPO.bootSecs + 1); i++) update(${STEP});`);
  ok(g.run(`state`) === 'menu' && !g.run(`opoLocked()`) && !g.run(`OpoLock.on`), 'a copy that never says it is up lifts the lock', g.run(`state`));
  // the dev's way out
  g.run(`opoLockSet(); state = 'menu'; update(${STEP}); OPO_HOST.ready({ canvas: null });`);
  g.run(`OPO_HOST.devLift();`);
  ok(g.run(`opoLocked()`), 'nobody but a dev account lifts it by hand');
  g.run(`Save.profile.awards = (Save.profile.awards || []).concat([{ perk: 'opo-lift' }]); OPO_HOST.devLift();`);
  ok(!g.run(`opoLocked()`) && g.run(`state`) === 'menu', 'a dev account can ([\\\\] in the lock, the opo-lift perk)');
  takeArt(g);
}

/* ============================ the account carries it ============================ */
section('the account carries it');
{
  const worker = (await import('../src/index.js')).default;
  const DB = makeD1();
  const env = { DB, ASSETS: { fetch: () => new Response('asset') } };
  let cookie = '';
  const call = async (method, p, body) => {
    const headers = { 'cf-connecting-ip': '10.9.0.2', origin: 'https://voidrunner.online' };
    if (cookie) headers.cookie = 'vr_s=' + cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + p,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) cookie = m[1];
    let d = null; try { d = await res.json(); } catch (e) {}
    return { status: res.status, d };
  };
  const reg = await call('POST', '/api/account', { op: 'register', name: 'held_one', pass: 'correct horse locked', pid: 'b'.repeat(32) });
  ok(reg.status === 201, 'signed up', reg.status);
  const one = game();
  one.run(`opoLockSet();`);
  const put = await call('PUT', '/api/account/save', { rev: 0, save: JSON.parse(one.run(`JSON.stringify(Account.strip(Save.profile))`)), unlocks: {} });
  ok(put.status === 200, 'a device he holds pushes its save', put.status);
  let got = await call('GET', '/api/account/save');
  const two = game();
  ok(two.run(`Account.adopt(${JSON.stringify(got.d.save)}) && opoLocked()`), 'another device takes it in at the menu, and is held');
  two.run(`update(${STEP})`);
  ok(two.run(`state`) === 'opolock', 'and boots into the first build too', two.run(`state`));
  // let go on the first device: the lift reaches the second, in the lock
  one.run(`opoLiftSet();`);
  const put2 = await call('PUT', '/api/account/save', { rev: got.d.rev, save: JSON.parse(one.run(`JSON.stringify(Account.strip(Save.merge(${JSON.stringify(got.d.save)}, Save.profile)))`)), unlocks: {} });
  ok(put2.status === 200, 'the lift goes up', put2.status);
  got = await call('GET', '/api/account/save');
  ok(two.run(`Account.adopt(${JSON.stringify(got.d.save)})`) && !two.run(`opoLocked()`) && two.run(`state`) === 'menu', 'and the held device lets go, from inside the lock', two.run(`state`));
  // and PvP's queue is shut while he holds it (pvp/src/gates.js)
  const { entryFor } = await import('../pvp/src/gates.js');
  const acct = { id: reg.d.account ? reg.d.account.id : null, created: 0, perks: [] };
  const idRow = await DB.prepare('SELECT id, created FROM accounts WHERE name = ?1').bind('held_one').first();
  acct.id = idRow.id; acct.created = idRow.created;
  let e = await entryFor(DB, acct, 'casual');
  ok(e.open, 'PvP\'s casual queue is open while nobody holds the game', e);
  const locked = JSON.parse(one.run(`(() => { opoLockSet(); return JSON.stringify(Account.strip(Save.profile)); })()`));
  got = await call('GET', '/api/account/save');
  await call('PUT', '/api/account/save', { rev: got.d.rev, save: locked, unlocks: {} });
  e = await entryFor(DB, acct, 'casual');
  ok(!e.open && /VOIDRUNNER/.test(e.why || ''), 'and shut while he does', e);
  e = await entryFor(DB, Object.assign({}, acct, { perks: ['dev'] }), 'casual');
  ok(e.open, 'except for a dev account, as every gate is');
}

/* ======================== the crack, the break, the fight ======================== */
section('the crack');
{
  const g = game();
  g.run(`opoLockSet(); state = 'menu'; update(${STEP});`);
  ok(g.run(`state`) === 'opolock', 'held');
  const c = bootCopy(g.win);
  await settle();
  ok(g.run(`OpoLock.ready && !!OpoLock.tex()`), 'the copy comes up inside the game, and its canvas is there to draw from');
  // a locked run: SPACE, as the first build has it
  c.run(`handleKey(' ');`);
  const w1 = JSON.parse(c.run(`JSON.stringify(OPO_COPY.crack())`));
  ok(w1.runs === 1 && Math.abs(w1.w - 0.2) < 1e-9, 'every locked run has a crack, a little wider by itself', w1);
  // fly up to it and fire into the wall, the hull held up so the room cannot end the run
  const fire = n => c.run(`(() => { for (let i = 0; i < ${n}; i++) {
      if (state === 'levelup') chooseOffer(0); else if (state === 'shop') closeShop(); else if (state === 'pause') state = 'play';
      if (state === 'dead') break;
      P.hp = P.maxHp = 1e9;
      const s = OPO_COPY.span();
      keys['w'] = P.y > 60; keys['a'] = P.x > s.cx + 20; keys['d'] = P.x < s.cx - 20;
      mouse.down = true; mouse.x = s.cx - cam.x + W / 2; mouse.y = -40 - cam.y + H / 2;
      update(${STEP}); if (i % 10 === 0) render();
    } return JSON.stringify(Object.assign(OPO_COPY.crack(), OPO_COPY.run(), { score, state })); })()`);
  let r = JSON.parse(fire(60 * 6));
  ok(r.p > 0.1 && r.held, 'rounds that reach it are fire on it', r);
  const sc0 = r.score;
  r = JSON.parse(fire(60 * 2));
  ok(r.score === sc0, 'the score stops counting while you fire at it', [sc0, r.score]);
  ok(c.run(`enemies.length`) > 4, 'and the first build\'s bodies come for you, more of them', c.run(`enemies.length`));
  ok(r.line || c.run(`OPO_COPY.run().line`) !== undefined, 'and he forbids it');
  // die at it: what was done is kept
  const pBefore = r.p;
  c.run(`P.hp = 0; P.maxHp = 100; gameOver();`);
  const kept = JSON.parse(c.store.getItem('voidrunner_opo_crack_v1'));
  ok(kept.p >= pBefore - 1e-9 && !kept.broke, 'dying at the crack keeps what was done to it', kept);
  ok(g.run(`opoLocked() && state === 'opolock'`), 'and the lock holds');
  c.run(`handleKey(' ');`);
  ok(JSON.parse(c.run(`JSON.stringify(OPO_COPY.crack())`)).w > w1.w, 'the next locked run, it is wider again');
  c.run(`for (const k in P.up) delete P.up[k]; P.up.rate = 2; P.up.dmg = 1; P.up.notacard = 4;`);
  g.run(`{ const _b = OPO_HOST.broke; OPO_HOST.broke = i => { globalThis.__broke = JSON.parse(JSON.stringify(i)); _b(i); }; }`);
  r = JSON.parse(fire(60 * 20));
  ok(r.broke, 'held long enough, it gives', r);
  takeArt(g);

  section('face to face, and the fight');
  ok(g.run(`state`) === 'play' && g.run(`!!opo && OpoLock.mode === 'fight'`), 'the break hands the room to the game: a fight, the copy playing on under it', g.run(`state`));
  const took = JSON.parse(g.run(`JSON.stringify(__broke.up)`));
  delete took.notacard;
  const carried = JSON.parse(g.run(`JSON.stringify(P.up)`));
  ok(took.rate >= 2 && JSON.stringify(Object.keys(carried).sort().map(k => [k, carried[k]])) === JSON.stringify(Object.keys(took).sort().map(k => [k, took[k]])),
     'carrying the cards the broken run took, by the same ids, and nothing that is not a card', [took, carried]);
  ok(g.run(`P.charId`) === 'runner', 'flying VOIDRUNNER');
  ok(g.run(`Save.profile.opoMet && Tales.has('n:onepointoh', 0)`), 'met: his page I');
  ok(g.run(`OpoLock.el.style.zIndex`) === '-1', 'today\'s canvas over the frame');
  const before = JSON.parse(g.run(`JSON.stringify({ runs: Save.profile.runs, best: Save.profile.best, kills: Save.profile.kills, time: Save.profile.time, bestWave: Save.profile.bestWave })`));
  // fight, as the bot does, until the lock lifts
  g.run(`P.maxHp = P.hp = 60000; ${BOT}`);
  const seen = { ph: new Set(), stages: new Set(), hollow: false, base: false, panes: 0, sweeps: 0, restores: 0, oldDash: false };
  for (let s = 0; s < 420 && g.run(`!!opo`); s++) {
    steps(g, 60, true);
    const o = g.run(`opo && JSON.stringify({ ph: opo.ph, stage: opo.stage, up: Object.keys(P.up).length, hollow: opo.hollow, panes: opo.panes.length, sweeps: opo.sweeps.length, restores: opo.restores.length, dmg: P.dmg })`);
    if (!o) break;
    const x = JSON.parse(o);
    seen.ph.add(x.ph); seen.stages.add(x.stage);
    seen.panes += x.panes; seen.sweeps += x.sweeps; seen.restores += x.restores;
    if (x.ph === 4 && x.up === 0 && x.hollow) seen.base = true;
  }
  ok([0, 1, 2, 3, 4].every(i => seen.ph.has(i)), 'all five phases', [...seen.ph]);
  ok(['open', 'fight', 'cascade', 'out'].every(s => seen.stages.has(s)), 'the shatter, the fight, the cascade, out', [...seen.stages]);
  ok(seen.panes > 0 && seen.sweeps > 0 && seen.restores > 0, 'panes, reverts and restores, each in its phase', seen);
  ok(seen.base, 'HOLLOW: nothing left on the ship by THE BASE SHIP');
  ok(g.run(`state`) === 'menu' && !g.run(`opoLocked()`) && !g.run(`OpoLock.on`), 'out: the lock lifts, back to today\'s menu', g.run(`state`));
  ok(g.run(`Save.profile.opoDone && Tales.has('n:onepointoh', 1)`), 'beaten: his page II');
  const after = JSON.parse(g.run(`JSON.stringify({ runs: Save.profile.runs, best: Save.profile.best, kills: Save.profile.kills, time: Save.profile.time, bestWave: Save.profile.bestWave })`));
  ok(JSON.stringify(after) === JSON.stringify(before), 'and the real save is exactly as it was', [before, after]);
  // beaten, he never comes back
  g.run(`runCharNext = 0; resetGame(); state = 'play'; lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom();`);
  ok(g.run(`!opoLine && !opoDoor`), 'the voice never comes back, and neither does the old door');
  takeArt(g);
}

section('left mid-fight');
{
  const g = game();
  g.run(`opoLockSet(); state = 'menu'; update(${STEP});`);
  const c = bootCopy(g.win);
  await settle();
  const before = g.run(`JSON.stringify({ runs: Save.profile.runs, best: Save.profile.best, kills: Save.profile.kills })`);
  g.run(`OPO_HOST.broke({ up: { rate: 1 } }); P.maxHp = P.hp = 60000; ${BOT}`);
  steps(g, 60 * 12, true);
  ok(g.run(`!!opo && opo.stage === 'fight'`), 'in the fight');
  g.run(`state = 'pause'; quitToMenu();`);
  steps(g, 30);
  ok(g.run(`state`) === 'opolock' && g.run(`opoLocked()`) && g.run(`OpoLock.mode`) === 'copy', 'left: the lock holds, back to the first build', g.run(`state`));
  ok(g.run(`JSON.stringify({ runs: Save.profile.runs, best: Save.profile.best, kills: Save.profile.kills })`) === before, 'and nothing of the fight leaks into the real save');
  // lost: the same, after a beat
  const c2 = bootCopy(g.win);
  await settle();
  g.run(`OPO_HOST.broke({ up: {} }); P.maxHp = P.hp = 60000; ${BOT}`);
  steps(g, 60 * 6);
  g.run(`P.hp = 1; hurtPlayer(1e6, { pure: true });`);
  ok(g.run(`state`) === 'dead' && g.run(`lastStats.opo`), 'lost: no run, no report');
  g.run(`render()`);
  steps(g, 60 * 4);
  ok(g.run(`state`) === 'opolock' && g.run(`opoLocked()`), 'and after a beat, the first build again', g.run(`state`));
  ok(g.run(`JSON.stringify({ runs: Save.profile.runs, best: Save.profile.best, kills: Save.profile.kills })`) === before, 'still nothing recorded');
  takeArt(g);
  void c; void c2;
}

/* ============================ returning players ============================ */
/* A veteran's save, as it sits in a browser from before ONE POINT OH: none of
   his fields, the clears never counted (reconcileClears finds THE FRACTURE
   from how deep it has been), the hub open, the Founder's story still open,
   escalated. Everything the route touches, it has. */
section('returning players, with THE FRACTURE open');
const VET = {
  name: 'VETERAN', best: 284000, bestWave: 61, bestSector: 'THE VOID', runs: 214, kills: 52000, time: 300000,
  clears: 0, altPath: false, planetarium: true, malware: true, deepFracture: true, hardened: true,
  keeperMet: true, keeperDone: true, trueEnd: true, askedHarder: true, amalgamDone: true,
  rootDone: true, keyEver: true, metFounder: true, campVisits: 4, tribunalDone: false,
  outsiderIn: true, awakened: { ember: true, hacker: true }, rushBest: 1e6, gfxSeen: 3, logSeen: 99
};
function veteran(over) {
  const save = Object.assign({}, VET, over || {});
  const g = loadGame(IDX, { w: 1280, h: 720, before: win => win.localStorage.setItem('voidrunner_save_v1', JSON.stringify(save)) });
  g.run(`pageDead = true; state = 'menu';
    globalThis.__art = {};
    for (const k of Object.keys(OPO_ART)) { const f = OPO_ART[k]; OPO_ART[k] = (...a) => { __art[k] = (__art[k] || 0) + 1; return f(...a); }; }`);
  return g;
}
// one run, one portal room: what he said, whether the door stood, and the count
const roomOf = g => JSON.parse(g.run(`(() => { runCharNext = 0; resetGame(); state = 'play';
  lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom();
  return JSON.stringify({ line: opoLine && opoLine.kind, door: !!opoDoor, n: RUN.opoCoax, rite: riteRun }); })()`));
{
  const g = veteran();
  const boot = JSON.parse(g.run(`JSON.stringify({ alt: Save.profile.altPath, clears: Save.profile.clears, coax: Save.profile.opoCoax, lock: Save.profile.opoLock, lift: Save.profile.opoLift, done: Save.profile.opoDone })`));
  ok(boot.alt && boot.clears >= 2, 'an old save that never counted its clears still has THE FRACTURE', boot);
  ok(boot.coax === 0 && boot.lock === 0 && boot.lift === 0 && boot.done === false, 'and starts the route from nothing: none of his fields were on it', boot);
  ok(!g.run(`opoLocked()`) && (g.run(`update(${STEP}), state`) === 'menu'), 'it is not held, and boots to today\'s menu');

  // a run committed at a statue is never coaxed, and one that dies there leaves nothing behind
  g.run(`hubCommit('melee'); lastBossDeath = { x: P.x, y: P.y - 100 }; openPortalRoom();`);
  ok(g.run(`riteRun === 'melee' && !opoLine && RUN.opoCoax === 0`), 'a statue\'s run: no voice');
  g.run(`P.hp = 0; gameOver(); state = 'menu';`);
  const after = roomOf(g);
  ok(after.rite === null && after.line === 'coax' && after.n === 1, 'the next ordinary run, after a statue\'s run died short of its wave: coaxed, and no rite waiting at wave 25', after);

  // the count is the profile's: four more runs, and the door, through a reload in the middle
  for (let i = 0; i < 2; i++) roomOf(g);
  const saved = g.run(`JSON.stringify(Save.profile)`);
  const g2 = loadGame(IDX, { w: 1280, h: 720, before: win => win.localStorage.setItem('voidrunner_save_v1', saved) });
  g2.run(`pageDead = true; state = 'menu';`);
  const rooms = [roomOf(g2), roomOf(g2), roomOf(g2)];
  ok(rooms[0].line === 'coax' && rooms[0].n === 4 && rooms[1].n === 5 && !rooms[1].door, 'a reload picks up where it left off', rooms);
  ok(rooms[2].door && rooms[2].line === 'door', 'and the room after the fifth line has the old door', rooms[2]);

  // a fresh device, signed in: the account's save brings the count and THE FRACTURE with it
  const fresh = game();
  ok(fresh.run(`Account.adopt(${g2.run(`JSON.stringify(Account.strip(Save.profile))`)}) && Save.profile.altPath && Save.profile.opoCoax === 6`), 'a new device signed in carries the count, at the menu');
  const fr = roomOf(fresh);
  ok(fr.n === 6 || fr.n === 7, 'and goes on from it', fr);
}

section('returning players: the old door in any room');
{
  const g = veteran({ opoCoax: 5 });
  // the clearance it keeps from every gate, the library's door and the shards, and whether it is inside the walls
  const check = `(() => { const d = opoDoor; if (!d) return JSON.stringify({ door: false, n: RUN.opoCoax, line: opoLine && opoLine.kind });
    let m = Infinity;
    for (const p of portals) m = Math.min(m, Math.hypot(d.x - p.x, d.y - p.y) - p.r - d.r);
    if (libraryPortal) m = Math.min(m, Math.hypot(d.x - libraryPortal.x, d.y - libraryPortal.y) - libraryPortal.r - d.r);
    for (const h of hazards) if (h.kind === 'mirror') m = Math.min(m, Math.hypot(d.x - h.x, d.y - h.y) - h.r - d.r);
    const inside = d.x - d.r >= arena.x0 && d.x + d.r <= arena.x1 && d.y - d.r >= arena.y0 && d.y + d.r <= arena.y1;
    return JSON.stringify({ door: true, room: m, inside, n: RUN.opoCoax }); })()`;
  const rooms = { open: [], cramped: [], mirror: [], library: [] };
  for (let seed = 1; seed <= 24; seed++) {
    for (const kind of Object.keys(rooms)) {
      const r = JSON.parse(g.run(`(() => { runSeedNext = ${seed * 7 + 3}; runCharNext = 0; resetGame(); state = 'play'; RUN.opoCoax = 5;
        if ('${kind}' === 'cramped') { arenaShrinkTo(WORLD.w / 2, WORLD.h / 2, 980, 760); arena.x0 = arena.tx0; arena.y0 = arena.ty0; arena.x1 = arena.tx1; arena.y1 = arena.ty1; }
        if ('${kind}' === 'mirror') enterStage(ALT_STAGES.find(s => s.name === 'THE MIRROR'));
        if ('${kind}' === 'library') placePortal({ kind: 'library', boss: 'warden' });
        const a = simRnd(TAU), d = simRnd(500);
        lastBossDeath = { x: clamp(P.x + Math.cos(a) * d, arena.x0, arena.x1), y: clamp(P.y + Math.sin(a) * d, arena.y0, arena.y1) };
        openPortalRoom();
        return ${check}; })()`));
      rooms[kind].push(r);
    }
  }
  const placed = Object.values(rooms).flat().filter(r => r.door);
  ok(placed.every(r => r.inside && r.room >= 60), 'wherever it stands, it is inside the walls and well clear of every gate, the library\'s door and the shards',
     placed.filter(r => !r.inside || r.room < 60));
  ok(rooms.open.every(r => r.door) && rooms.mirror.every(r => r.door) && rooms.library.every(r => r.door), 'in an open room, THE MIRROR and beside a library, it always stands',
     Object.fromEntries(['open', 'mirror', 'library'].map(k => [k, rooms[k].filter(r => !r.door).length])));
  const skipped = Object.values(rooms).flat().filter(r => !r.door);
  ok(skipped.every(r => r.n === 5 && !r.line), 'and in a room with nowhere it fits, it waits for the next room without a word, still owed', skipped);
  ok(rooms.cramped.filter(r => r.door).length > 0, 'a cramped room still finds a place for it', rooms.cramped.filter(r => r.door).length);

  // walked into in a cramped room: it takes you, and no gate does first
  g.run(`runSeedNext = 41; runCharNext = 0; resetGame(); state = 'play'; RUN.opoCoax = 5;
    arenaShrinkTo(WORLD.w / 2, WORLD.h / 2, 980, 760); arena.x0 = arena.tx0; arena.y0 = arena.ty0; arena.x1 = arena.tx1; arena.y1 = arena.ty1;
    lastBossDeath = { x: P.x, y: P.y }; openPortalRoom();
    inputSource = rec => { rec.mx = 0; rec.my = 0; rec.trig = false; rec.lmb = false; rec.auto = false; rec.dash = false;
      rec.touch = false; rec.taim = null; rec.local = false; rec.press = []; rec.held = ''; rec.ax = P.x; rec.ay = P.y - 100; };`);
  if (g.run(`!!opoDoor`)) {
    g.run(`P.x = opoDoor.x; P.y = opoDoor.y; for (let i = 0; i < 60 * 5 && !opoRevert; i++) { P.x = opoDoor ? opoDoor.x : P.x; P.y = opoDoor ? opoDoor.y : P.y; update(${STEP}); }`);
    ok(g.run(`!!opoRevert && opoLocked()`), 'walked into in a cramped room, it takes you, and no gate does first', g.run(`JSON.stringify({ rev: !!opoRevert, awaiting: awaitingPortal, stage: stage.name })`));
  } else ok(false, 'the cramped room for the walk-in had no door');
  takeArt(g);
}

section('returning players: the fight, with their own story open');
{
  // the Founder's story open (the tear rides every run) and, separately, ROOT's key carried
  for (const [what, over] of [['the Founder\'s tear', {}], ['ROOT\'s key', { metFounder: false, keyEver: true }]]) {
    const g = veteran(Object.assign({ opoCoax: 6, opoLock: 1 }, over));
    g.run(`update(${STEP})`);
    ok(g.run(`state`) === 'opolock', what + ': a held veteran boots into the lock');
    bootCopy(g.win);
    await settle();
    const runs0 = g.run(`Save.profile.runs`), best0 = g.run(`Save.profile.best`);
    g.run(`OPO_HOST.broke({ up: { rate: 2, dmg: 2, multi: 1 } }); P.maxHp = P.hp = 60000; ${BOT}`);
    ok(g.run(`!!opo && !tear && !P.key && !keyItem`), what + ': nothing of it follows you into his fight', g.run(`JSON.stringify({ tear: !!tear, key: P.key })`));
    let strays = 0;
    for (let s = 0; s < 420 && g.run(`!!opo`); s++) {
      // hurt now and then, as a fight does: a tear would open for that
      g.run(`if (opo && opo.stage === 'fight' && simTick % 600 < 60) P.hp = Math.min(P.hp, P.maxHp * 0.3);`);
      steps(g, 60);
      if (g.run(`!!(tribunal || campVisit || choice || amalOpen || (state === 'devtalk'))`)) strays++;
    }
    ok(!strays, what + ': no tear, tribunal, door or talk opens in his fight', strays);
    ok(g.run(`state`) === 'menu' && g.run(`Save.profile.opoDone && !opoLocked()`), what + ': fought to today, and let go', g.run(`state`));
    ok(g.run(`Save.profile.runs`) === runs0 && g.run(`Save.profile.best`) === best0, what + ': and the veteran\'s record is as it was');
    ok(g.run(`Save.profile.metFounder === ${over.metFounder === false ? 'false' : 'true'} && !Save.profile.tribunalDone`), what + ': and their own story is where they left it');
    takeArt(g);
  }
}

/* ================================ the art kit ================================ */
section('the art kit (OPO_KIT)');
{
  const g = game();
  take(g.run(`(() => { var C = []; var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
    const K = OPO_KIT, near = (a, b, e) => Math.abs(a - b) <= (e || 1e-6);
    // the diorama
    const S = K.screen(1280, 720);
    const p0 = S.project(K.V(100, 200, 0)), pg = S.project(K.V(640 + 100, 360, S.glass));
    chk(near(p0.x, 100) && near(p0.y, 200) && near(p0.k, 1), 'on the floor a point is where it always was', p0);
    chk(near(pg.k, S.f / (S.f - S.glass)) && near(pg.x, 640 + 100 * pg.k) && pg.k > 1.9, 'raised to the glass it is about twice its size, spread from the middle', pg);
    chk(S.faces(K.V(0, 0, 1), K.V(640, 360, 0)) && !S.faces(K.V(0, 0, -1), K.V(640, 360, 0)), 'the eye sees a face turned to it, not one turned away');
    // quaternions
    const q = K.qAxis(K.V(0, 0, 1), Math.PI / 2), r = K.qRot(q, K.V(1, 0, 0));
    chk(near(r.x, 0) && near(r.y, 1) && near(r.z, 0), 'a quarter turn about z takes x to y', r);
    const qb = K.qBasis(K.V(0, 1, 0), K.V(-1, 0, 0), K.V(0, 0, 1)), rb = K.qRot(qb, K.V(1, 0, 0));
    chk(near(rb.x, 0) && near(rb.y, 1), 'a basis becomes the turn that makes it', rb);
    // the triangle map: exactly onto the corners
    const rec = { t: null, ops: [] };
    const fake = { save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, drawImage() { rec.ops.push('img'); },
                   transform(a, b, c, d, e, f) { rec.t = [a, b, c, d, e, f]; } };
    K.tri(fake, {}, 0, 0, 100, 0, 0, 50, 10, 20, 210, 40, 30, 120, 0);
    const m = rec.t, at = (u, v) => [m[0] * u + m[2] * v + m[4], m[1] * u + m[3] * v + m[5]];
    const c0 = at(0, 0), c1 = at(100, 0), c2 = at(0, 50);
    chk(near(c0[0], 10) && near(c0[1], 20) && near(c1[0], 210) && near(c1[1], 40) && near(c2[0], 30) && near(c2[1], 120) && rec.ops.length === 1,
        'a picture\\'s triangle lands exactly on the screen\\'s', [c0, c1, c2]);
    // fracture: the pieces cover the picture exactly, and carry their part of it
    const R = K.rect(0, 0, 1280, 720, 2);
    for (const [name, pieces] of [['radial', K.radial(R, { x: 500, y: 300 }, { spokes: 13, rings: 5, seed: 4 })], ['voronoi', K.voronoi(R, 30, 8)]]) {
      const sum = pieces.reduce((a, s) => a + s.area, 0);
      chk(Math.abs(sum - 1280 * 720) < 1280 * 720 * 1e-6, name + ': the pieces add up to the whole picture', [pieces.length, sum]);
      chk(pieces.every(s => s.pts.every(p => near(p.u, p.x * 2, 1e-6) && near(p.v, p.y * 2, 1e-6))), name + ': and each piece shows its own part of it');
    }
    chk(K.radial(R, { x: 500, y: 300 }, { seed: 4 }).length === K.radial(R, { x: 500, y: 300 }, { seed: 4 }).length, 'a seed breaks it the same way twice');
    // folds keep the paper rigid, and a half-turn lays a flap flat on the other half
    const sh = K.sheet({ x: 0, y: 0, w: 400, h: 200, img: {}, uvScale: 1 });
    sh.fold(200, 0, 200, 200, Math.PI, { move: { x: 0, y: 100 } });
    const pts = sh.polys.flat();
    chk(pts.every(p => p.x >= 200 - 1e-6 && near(p.z, 0, 1e-6)), 'folded in half: the left half lies flat on the right', pts.map(p => [p.x, p.z]).slice(0, 8));
    const lens = poly => poly.map((p, i) => { const q = poly[(i + 1) % poly.length]; return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z); });
    sh.pose(); const flat = sh.polys.map(lens);
    sh.fold(130, 0, 260, 200, 1.1, { side: -1 }).fold(0, 90, 400, 120, 2.0, { side: 1 });
    chk(sh.polys.length >= 3 && sh.polys.every(p => p.every(v => isFinite(v.x) && isFinite(v.z))), 'folds on folds cut it into pieces, each still whole', sh.polys.length);
    const sh2 = K.sheet({ x: 0, y: 0, w: 400, h: 200 }); sh2.fold(200, 0, 200, 200, 1.3, { side: 1 });
    chk(sh2.polys.filter(p => p.some(v => v.z > 1)).every(p => p.every(v => v.x >= 200 - 1e-6)), 'side 1 is the line\\'s left looking along it as the screen shows it: down the screen, that is its right');
    const sideL = sh2.polys.find(p => p.some(v => v.z > 1));
    chk(sideL && sideL.every(v => v.z >= -1e-6), 'a fold comes up toward the eye', sideL && sideL.map(v => v.z));
    chk(sh2.polys.every((p, i) => lens(p).every((l, k) => l > 0)), 'and no piece is torn');
    // a curl rolls what is past the line round a cylinder, and back over
    const pg2 = K.sheet({ x: 0, y: 0, w: 400, h: 100 }); pg2.curl(300, 0, 300, 100, 20, { side: -1, n: 12 });
    const zs = pg2.polys.flat().map(v => v.z);
    chk(Math.max(...zs) <= 40 + 1e-6 && Math.max(...zs) > 30 && pg2.polys.length > 10, 'a curl rolls up to its diameter, in strips', [Math.max(...zs), pg2.polys.length]);
    // roll: true winds all of it up round the cylinder instead, the end innermost
    const pg3 = K.sheet({ x: 0, y: 0, w: 600, h: 100 }); pg3.curl(300, 0, 300, 100, 20, { side: -1, roll: true });
    const wound = pg3.polys.flat().filter(v => v.z > 1e-6), off = v => Math.hypot(v.x - 300, v.z - 20);
    chk(wound.length && wound.every(v => off(v) <= 20 + 1e-6 && off(v) >= 3 - 1e-6 && v.z >= -1e-6) && pg3.polys.length > 50,
        'a roll winds all of it round the cylinder, in strips', [pg3.polys.length, Math.max(...wound.map(off)), Math.min(...wound.map(off))]);
    chk(pg3.polys.flat().filter(v => v.u > 300 + 1e-6).every(v => near(v.z, 0, 1e-9) && near(v.x, v.u, 1e-9)), 'and leaves the rest lying flat, where it was');
    // a back is its own picture: scaled to its own size, and turned the right way round
    const bu = K.backUv(0, 0, { width: 1280, height: 720 }, { width: 640, height: 360 }), bu2 = K.backUv(1280, 720, { width: 1280, height: 720 }, { width: 640, height: 360 });
    chk(near(bu.u, 640) && near(bu.v, 0) && near(bu2.u, 0) && near(bu2.v, 360), 'a back maps onto its own picture, mirrored', [bu, bu2]);
    const F = { width: 400, height: 200 }, B = { width: 100, height: 50 }, seen = [];
    let tri3 = [], mt = null;
    const fk = { save() {}, restore() {}, beginPath() { tri3 = []; }, moveTo(x, y) { tri3.push([x, y]); }, lineTo(x, y) { tri3.push([x, y]); }, closePath() {}, clip() {},
                 transform(a, b, c, d, e, f) { mt = [a, b, c, d, e, f]; }, fill() {}, stroke() {},
                 drawImage(img) { const [a, b, c, d, e, f] = mt, det = a * d - b * c;
                                  seen.push({ img, uv: tri3.map(([x, y]) => [(d * (x - e) - c * (y - f)) / det, (a * (y - f) - b * (x - e)) / det, x, y]) }); } };
    const fs3 = K.sheet({ x: 0, y: 0, w: 400, h: 200, img: F, back: B }); fs3.fold(200, 0, 200, 200, Math.PI, { move: { x: 0, y: 100 } });
    fs3.draw(fk, S, { flat: true, sub: 1 });
    const backs = seen.filter(s => s.img === B).flatMap(s => s.uv), fronts = seen.filter(s => s.img === F);
    chk(backs.length && fronts.length && backs.every(([u, v, x, y]) => u >= -1e-6 && u <= 100 + 1e-6 && v >= -1e-6 && v <= 50 + 1e-6 && near(u, x / 4, 0.5) && near(v, y / 4, 0.5)),
        'folded over, its back shows the back picture, inside it, reading the right way round', backs.slice(0, 4));
    // bodies: one dropped onto the floor comes to rest on it
    const sim = K.sim({ space: S, gravity: K.V(0, 0, -1600) }).floor(0);
    const b = sim.add(K.body({ shape: K.rect(-30, -20, 60, 40), thick: 8, x: 600, y: 300, z: 300, wx: 3, wy: 2 }));
    for (let i = 0; i < 60 * 8; i++) sim.step(1 / 60);
    const low = Math.min(...K.corners(b, 1).concat(K.corners(b, -1)).map(c => c.z));
    chk(b.sleeping && low > -0.5 && low < 1.5, 'a body dropped on the floor tumbles down and comes to rest on it', { z: b.p.z, low, sleeping: b.sleeping });
    // the glass: what reaches it strikes it, once, and falls back
    K.glass.clear();
    const sim2 = K.sim({ space: S, gravity: K.V(0, 0, -400) });
    const t = sim2.add(K.body({ shape: K.rect(-10, -10, 20, 20), x: 640, y: 360, z: 0, vz: 1800, glass: 'crack' }));
    for (let i = 0; i < 60 * 3; i++) sim2.step(1 / 60);
    chk(K.glass.hits.length === 1 && Math.abs(K.glass.hits[0].x - 640) < 30 && t.v.z < 0, 'a body flown at the screen cracks the glass where it struck, once, and falls back', K.glass.hits.map(h => [h.x, h.y]));
    const sim3 = K.sim({ space: S, gravity: K.V(0, 0, 0) });
    sim3.add(K.body({ shape: K.rect(-10, -10, 20, 20), x: 640, y: 360, vz: 2400, glass: 'pass' }));
    for (let i = 0; i < 60 * 2; i++) sim3.step(1 / 60);
    chk(sim3.bodies.length === 0 && K.glass.hits.length === 2, 'one that passes the glass goes on into the eye and is gone');
    // a folded sheet let go as bodies keeps where every piece was
    const sh3 = K.sheet({ x: 100, y: 100, w: 300, h: 200 }); sh3.fold(250, 100, 250, 300, 2.2, { side: 1 });
    const bs = sh3.bodies();
    const err = bs.reduce((e, bd, i) => { const cs = K.corners(bd, 1), ps = sh3.polys[i]; return Math.max(e, ...cs.map((c, k) => Math.hypot(c.x - ps[k].x, c.y - ps[k].y, c.z - ps[k].z))); }, 0);
    chk(bs.length === sh3.polys.length && err < 1e-6, 'a folded sheet becomes bodies exactly where its pieces lie', err);
    // scenes: kept while asked for, dropped once not
    let made = 0; const mk = () => ({ n: ++made });
    const a1 = K.scene('x', mk), a2 = K.scene('x', mk);
    chk(a1 === a2 && made === 1, 'a scene is the same object frame after frame');
    K.scene('x', mk, 2); chk(made === 2, 'and a new one when its generation changes');
    uiTime += 5; K.frameEnd(); chk(!K.scenes.has('x'), 'and gone once nobody asks for it');
    // events
    opoFx('paneBreak', { x: 1, y: 2 }); opoFx('peel', { id: 'rate' });
    const e1 = K.feed('a'), e2 = K.feed('a'), e3 = K.feed('b');
    chk(e1.length >= 2 && !e2.length && e3.length >= 2 && e1.some(e => e.kind === 'paneBreak' && e.x === 1), 'the run\\'s events, to each reader once', [e1.length, e2.length, e3.length]);
    return JSON.stringify(C);
  })()`));

  // drawing only: a fight with the kit working flat out in every hook plays the same as one with blank hooks
  const fight = withKit => {
    const h = game();
    if (withKit) h.run(`
      OPO_ART.worldFx = (g, s) => { const sc = s.kit.scene('wfx', () => s.kit.sim({ space: s.S }).floor(0));
        for (const e of s.kit.feed('wfx')) if (e.kind === 'hit' || e.kind === 'paneBreak') for (let i = 0; i < 3; i++)
          sc.add(s.kit.body({ shape: s.kit.rect(-6, -6, 12, 12), thick: 4, x: e.x, y: e.y, z: 10, vz: 600 + rnd() * 600, vx: rnd(-200, 200), vy: rnd(-200, 200), wx: rnd(-8, 8), life: 2 }));
        sc.space = s.S; sc.step(); sc.draw(g); };
      OPO_ART.screenFx = (g, w, h, s) => { const cap = s.kit.capture('t'); if (s.t % 3 < 0.02) s.kit.glass.hit(w / 2, h / 2, 1);
        const sh = s.kit.sheet({ x: 0, y: 0, w, h, img: cap.img, uvScale: cap.sx }); sh.fold(w / 2, 0, w / 2, h, 0.4).crumple(0.2); sh.draw(g, s.S); s.kit.glass.draw(g, w, h, { frame: cap }); };
      OPO_ART.worldFlat = (g, s) => { const shards = s.kit.radial(s.kit.rect(s.S.cx - 50, s.S.cy - 50, 100, 100, 1), { x: s.S.cx, y: s.S.cy }, { seed: 2 });
        s.kit.drawBodies(g, s.S, s.kit.bodiesOf(shards, { img: s.kit.first() })); };`);
    h.run(`runSeedNext = 77; runViewNext = { w: 1366, h: 768 }; runCharNext = 0; resetGame(); state = 'play'; opoOpen({ up: { rate: 2, multi: 1 } }); P.maxHp = P.hp = 60000; ${BOT}`);
    const prints = [];
    for (let s = 0; s < 70; s++) {
      steps(h, 60, true);
      prints.push(h.run(`JSON.stringify([simRngState, simTick, +P.x.toFixed(6), +P.y.toFixed(6), P.hp, opo && +opo.pos.toFixed(9), opo && opo.ph, ebullets.length, bullets.length, opo && opo.cells.join('')])`));
    }
    return prints;
  };
  const plain = fight(false), busy = fight(true);
  const at = plain.findIndex((p, i) => p !== busy[i]);
  ok(at < 0, 'the kit is drawing only: a fight with it busy in every hook plays step for step as one without', at);
}

/* ================================ the bench ================================ */
section('the art bench (?opo=bench)');
{
  const g = loadGame(IDX, { w: 1280, h: 720, search: '?opo=bench' });
  g.run(`pageDead = true; Save.profile.name = 'BENCH'; state = 'menu'; Save.profile.gfxSeen = GFX_VER;`);
  g.run(fs.readFileSync(path.join(ROOT, 'onepointoh', 'bench.js'), 'utf8'), 'bench.js');
  g.run(`update(${STEP})`);
  ok(g.run(`state`) === 'opobench', 'on this machine\'s own server, ?opo=bench opens the bench', g.run(`state`));
  const saveBefore = g.run(`localStorage.getItem('voidrunner_save_v1') || ''`);
  const res = JSON.parse(g.run(`(() => { const out = [];
    for (let d = 0; d < OPO_BENCH.demos.length; d++) {
      let err = null;
      try {
        if (d) handleKey('arrowright');
        for (let i = 0; i < 150; i++) { update(${STEP}); if (i % 3 === 0) render(); if (i === 40) handleClick(); }
        handleKey('w'); for (let i = 0; i < 10; i++) { update(${STEP}); render(); } handleKey('w');
        handleKey('l'); for (let i = 0; i < 10; i++) { update(${STEP}); render(); } handleKey('l');
      } catch (e) { err = String(e && e.stack || e).split('\\n').slice(0, 2).join(' | '); }
      out.push({ n: OPO_BENCH.demos[d].n, err });
    }
    return JSON.stringify(out); })()`));
  ok(res.length >= 8 && res.every(r => !r.err), 'every demo plays and draws, wireframed and flat too', res.filter(r => r.err));
  ok(g.run(`localStorage.getItem('voidrunner_save_v1') || ''`) === saveBefore, 'and the bench never touches the save');
  g.run(`handleKey('escape')`);
  ok(g.run(`state`) === 'menu', 'ESC goes back to the menu');
  const shut = loadGame(IDX, { w: 1280, h: 720, search: '?opo=bench', before: win => { win.location.hostname = 'voidrunner.online'; } });
  shut.run(`pageDead = true; Save.profile.name = 'X'; state = 'menu'; update(${STEP});`);
  ok(shut.run(`state`) === 'menu' && !shut.run(`opoBenchTried`), 'on the real site, for anyone but a dev account, the address does nothing');
}

/* ================================ the hooks ================================ */
section('the hooks');
{
  const g = game();
  // the rest of them by name: the admin jumps put each piece on screen
  g.run(`opoJump('cascade'); for (let i = 0; i < 30; i++) { update(${STEP}); render(); } opoJump('out'); for (let i = 0; i < 30; i++) { update(${STEP}); render(); }`);
  takeArt(g);
  const all = JSON.parse(g.run(`JSON.stringify(Object.keys(OPO_ART))`));
  const never = all.filter(k => !artSeen[k]);
  ok(!never.length, 'every hook is drawn (or sounded) somewhere on the route', never);
  ok(g.run(`OA_FAILED.size`) === 0, 'and none throws', g.run(`[...OA_FAILED].join()`));
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
