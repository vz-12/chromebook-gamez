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
