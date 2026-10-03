#!/usr/bin/env node
/* VOIDRUNNER — the lockstep test (Phase 2 of the co-op rework).

   Two copies of the game in one process, a host and a guest, joined by a
   simulated link with latency, jitter, reordering and packet loss, each
   running at its own frame rate with its own window and its own save. A bot
   flies each pilot, writing only its own machine's input; the machines trade
   nothing but the run's header and those inputs. Every second of game time
   both fingerprint the game, and the two must be identical: the same run,
   step for step, on two machines that were only ever told each other's input.
   A clean run must never need the safety net (the game's own fingerprints and
   the host's snapshots); 'parted' nudges each machine out of step once, on
   purpose, and the two must find it and be the same again within seconds,
   with the guest playing again the steps it was past the snapshot. 'builds'
   checks two different builds refuse lockstep.

     node scripts/lockstep.mjs [path/to/index.html] [--only name,name] [--short]

   Exits 1 if any scenario's machines part, or a run does not get going. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const IDX = args.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');
const ONLY = (() => { const i = args.indexOf('--only'); return i >= 0 ? new Set(args[i + 1].split(',')) : null; })();
const SHORT = args.includes('--short');

/* lat / jit: one-way latency and its spread, ms. loss: share of the unreliable
   packets (the inputs) that never arrive. hz: each machine's frame rate.
   freeze: the guest's machine stops for a while, the way a laptop does. */
const SCENARIOS = [
  { name: 'lan', seed: 201,      lat: 6,   jit: 3,  loss: 0,    hostHz: 60, guestHz: 60,  host: 'runner', wing: 'ember', end: 'host leaves' },
  { name: 'internet', yes: true, seed: 202, lat: 55,  jit: 30, loss: 0.08, hostHz: 60, guestHz: 144, host: 'hacker', wing: 'melee', kit: true },
  { name: 'bad', seed: 203,      lat: 120, jit: 90, loss: 0.25, hostHz: 50, guestHz: 30,  host: 'melee',  wing: 'runner', kit: true,
                      freeze: { at: 40000, ms: 1800 } },
  { name: 'saves', yes: true, seed: 204,    lat: 30,  jit: 15, loss: 0.05, hostHz: 75, guestHz: 60,  host: 'ember',  wing: 'hacker', kit: true,
                      guestSave: true },
  // the safety net: each machine nudges its own game once, out of step; both must find it and come back
  /* A run as people play it: ordinary hulls, so pilots go down, stand back up
     and die; the host starts the next run; and the guest leaves partway
     through one, and the host plays on alone. */
  { name: 'lifecycle', seed: 206, lat: 30, jit: 15, loss: 0.03, hostHz: 60, guestHz: 60,  host: 'runner', wing: 'melee', life: true, end: 'guest leaves' },
  { name: 'parted', seed: 205,   lat: 40,  jit: 20, loss: 0.05, hostHz: 60, guestHz: 72,  host: 'ember',  wing: 'runner', kit: true,
                      part: { guest: [1500], host: [6000] } },
];
const TICKS = SHORT ? 3600 : 10800;          // three minutes of game, or one

// a seeded stream for the link itself, so a failing run can be replayed
let ls = 12345;
const lr = () => { ls = (ls * 1664525 + 1013904223) >>> 0; return ls / 4294967296; };

const SETUP = (role, char, kit, scramble, kitRun, yes, part, life) => `(() => {   // kit: this save has woken pilots; kitRun: the run fires them (on both machines); part: steps this machine leaves the shared game on
  pageDead = true;
  Save.profile.gfxSeen = GFX_VER;
  // each player in a skin of their own, and wearing an award: each machine draws the other pilot in it
  Save.profile.skin = { player: { col: '${role}' === 'host' ? '#22c55e' : '#ff00ff' }, bullet: { col: '${role}' === 'host' ? '#bbf7d0' : '#fde047' } };
  { const aw = AWARD_SKINS(); if (aw.length) Save.profile.skinEquip = aw[('${role}' === 'host' ? 0 : 1) % aw.length].id; }
  globalThis.__drawErr = [];
  globalThis.__draw = () => { try { render(); } catch (e) { if (__drawErr.length < 5) __drawErr.push(String(e && e.message || e) + ' @ ' + String(e && e.stack || '').split(' at ')[1]); __drawErr.n = (__drawErr.n || 0) + 1; } };
  if (typeof RUSH_PEAK !== 'undefined') Save.profile.rushBest = RUSH_PEAK;
  ${kit ? "Save.profile.awakened = { ember: true, hacker: true, melee: true };" : ''}
  ${scramble ? `// the guest's own save says otherwise about everything: the host's must win
    Object.assign(Save.profile, { hardened: true, keeperDone: true, altPath: true, malware: true, planetarium: true,
      deepFracture: true, otherKills: 7, unwrittenDeaths: 4, clears: 9, chal: ['ch_ascetic', 'ch_purist'] });
    Codex.e.add('swarmer'); Codex.e.add('broodmother');` : ''}
  applyChar(CHARS.findIndex(c => c.id === '${char}'));
  globalThis.__out = [];
  netSend = function (buf, reliable) { __out.push({ d: buf, r: !!reliable }); Net.tx += (buf.byteLength || buf.length || 0); Net.txN++; return true; };
  Net.phase = 'live'; Net.role = '${role}';
  const near = (list, S, f) => { let b = null, bd = Infinity; for (const o of list) { if (f && !f(o)) continue; const d = (o.x - S.x) ** 2 + (o.y - S.y) ** 2; if (d < bd) { bd = d; b = o; } } return [b, bd]; };
  /* The menus, as a player meets them: keys through handleKey, at a human's
     pace, on this machine only. The host's choices travel and land on both;
     the guest's presses on the host's screens must change nothing. And the
     shared pause, from both sides, with a screen of one's own opened over it. */
  globalThis.__seen = new Set();
  let shopN = 0;
  const YES = ${yes ? "'y'" : "'n'"};       // a yes takes the story's turn: THE UNWRITTEN's fight, the amalgam's assembly
  const HOST_SCREENS = ['levelup', 'gear', 'shop', 'planet', 'library', 'talk', 'devtalk'];
  /* The pauses, one episode after another: who pauses (both at once, in the
     last), who opens a screen of their own over it, and who resumes. A pause
     that lands on a menu does nothing (the menu already holds the run), so
     the pauser tries again until the run is paused. */
  const EPISODES = [
    { at: 2000, by: ['guest'], over: { guest: 'x' }, up: 'host' },             // the codex over it, closed by the other's resume
    { at: 5000, by: ['host'], key: 'escape', over: { host: 'g' }, up: 'guest' },   // graphics over it, the same
    { at: 7000, by: ['guest'], up: 'guest' },                                   // its own pause, its own resume
    { at: 8500, by: ['host', 'guest'], up: 'host' },                            // both at the same step
  ];
  let ep = 0, pausedAt = -1, tried = -1e9;
  function pauses(k) {
    const e = EPISODES[ep], me = '${role}';
    if (!e) return;
    if (!LS.paused) {
      if (pausedAt >= 0) { ep++; pausedAt = -1; return; }                  // resumed: on to the next
      if (k >= e.at && state === 'play' && e.by.includes(me) && k - tried >= 30) { tried = k; handleKey(e.key || 'p'); }
      return;
    }
    if (pausedAt < 0) pausedAt = k;
    if (e.over && e.over[me] && k === pausedAt + 30) handleKey(e.over[me]);
    if (e.up === me && state === 'pause' && k >= pausedAt + 150 && (k - pausedAt) % 30 === 0) handleKey('p');
  }
  function menus(k) {
    __seen.add(state);
    pauses(k);
    if (k % 9) return;
    if ('${role}' !== 'host') {
      if (HOST_SCREENS.includes(state) || choice) handleKey(['1', '2', 'e', 'enter', ' ', 'r', 'y', 'n', 'a', 'f', 'x', 'q'][(k / 9 | 0) % 12]);
      return;
    }
    if (state !== 'shop') shopN = 0;
    if (state === 'levelup') handleKey(String(1 + (k / 9 | 0) % Math.max(1, offers.length)));
    else if (state === 'gear') handleKey(['1', '2', 'x'][(k / 9 | 0) % 3]);
    else if (state === 'shop') { if (uiArm <= 0) handleKey(['1', 'r', '2', '3', 'enter'][Math.min(4, shopN++)]); }   // not before it is armed
    else if (state === 'planet') handleKey(planetRevealed ? 'enter' : 'a');
    else if (state === 'library') handleKey('e');
    else if (state === 'talk') handleKey(talkAsk ? YES : ' ');
    else if (state === 'devtalk') handleKey(devAsk ? YES : ' ');
    else if (state === 'play' && choice) handleKey('n');
  }
  // a player: only ever its own machine's input record
  let sampled = -1;
  LS.source = rec => {
    const S = P, k = sampled = Math.max(sampled + 1, LS.delay);   // the step this record is for; P is this machine's own pilot here
    menus(k);
    let ix = 0, iy = 0;
    const [g, gd] = near(gems.concat(drops), S);
    if (g && gd < 900 * 900) { ix = g.x > S.x + 6 ? 1 : g.x < S.x - 6 ? -1 : 0; iy = g.y > S.y + 6 ? 1 : g.y < S.y - 6 ? -1 : 0; }
    else { const d = Math.floor(k / 80) % 4; ix = [0, 1, 0, -1][d]; iy = [-1, 0, 1, 0][d]; }
    rec.mx = ix; rec.my = iy;
    const [e] = near(enemies, S, o => !o.dead && !o.hacked);
    if (e) { rec.ax = e.x; rec.ay = e.y; } else { rec.ax = S.x + Math.cos(k * 0.03) * 200; rec.ay = S.y + Math.sin(k * 0.03) * 150; }
    rec.trig = true; rec.lmb = true; rec.auto = k % 600 > 300; rec.dash = k % 97 === 0;
    rec.touch = false; rec.taim = null;
    rec.press = [];
    if (${!!kit}) {                  // its own pilot's kit, on either side
      if (k % 900 === 70) rec.press.push(P.charId === 'melee' ? 'v' : 'f');
      if (k % 75 === 40) rec.press.push(['z', 'x', 'c', 'v'][Math.floor(k / 75) % 4]);
      if (P.charId === 'melee' && k % 23 === 0) rec.press.push('f');
    }
    if (gearNear && k % 30 === 0) rec.press.push('e');   // THE VAGRANT: a look at what is on the floor
  };
  const r = v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(12) : String(v)) : (v === undefined ? null : v);
  const pk = (o, ks) => ks.map(k => r(o[k]));
  const fnv = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  globalThis.__prints = new Map();
  globalThis.__stat = { waves: 0, bosses: new Set() };
  // the life of a run: steps across every run, pilots down and up, runs ended (on this machine's record)
  globalThis.__steps = 0;
  globalThis.__life = { downs: 0, ups: 0, deaths: 0, runs0: Save.profile.runs || 0, was: [false, false], dead: false };
  // every menu choice that lands, counted where it lands (pause and resume are counted from LS.paused)
  globalThis.__acts = {};
  let __was = false;
  // (counted by whose pilot made it: the guest's own cards, gear and buys are its own)
  for (const a of Object.keys(UI_ACTS)) { const f = UI_ACTS[a]; UI_ACTS[a] = i => { const n = a + (PILOT.on ? '·guest' : ''); __acts[n] = (__acts[n] || 0) + 1; f(i); }; }
  globalThis.OPENERS_LEFT = () => OPENERS.map(o => o[0]);
  const OPENERS = [
    [1500, () => openPlanetarium()],
    [2600, () => { libraryBook = BOOKS[Object.keys(BOOKS)[0]]; malwareOffer = null; state = 'library'; uiArm = 0.4; }],
    [3200, () => startTalk()],
    [4200, () => startDevTalk()],
    [6000, () => openShop()],
  ];
  // the same moment on both machines: test conditions, menus, and the fingerprint
  const PARTS = ${JSON.stringify(part || [])}, parted = new Set();
  LS.after = () => {
    const t = LS.tick;
    // a nudge on this machine alone: its roll and its enemies' hulls, as a desync would leave them (once: a replay passes here again)
    if (PARTS.includes(t) && !parted.has(t)) { parted.add(t); simRngState = (simRngState ^ 0x5bd1e995) >>> 0; for (const e of enemies) e.hp *= 0.93; }
    __steps++;
    if (t === 1 && !${!!life}) pilotsEach(() => { P.maxHp = P.hp = 60000; P.dmg *= 3; });
    if (t === 1 && ${!!life}) pilotsEach(() => { P.dmg *= 2; });   // ordinary hulls, so they go down; enough bite to clear a wave alone
    for (let k = 0; k < PILOTS.length; k++) { const o = pilotP(k), d = !!(o && o.down); if (d && !__life.was[k]) __life.downs++; if (!d && __life.was[k]) __life.ups++; __life.was[k] = d; }
    if (state === 'dead' && !__life.dead) __life.deaths++;
    __life.dead = state === 'dead';
    if (${!!kitRun} && t % 900 === 60) pilotsEach(() => {   // every pilot's kit, charged
      if (P.charId === 'hacker') P.suRoot = SU_MAX;
      else if (P.charId === 'ember') P.vent = VENT_MAX;
      else if (P.charId === 'melee' && !(P.roninT > 0)) roninFire(false);
    });
    // the rarer screens, opened on both machines at once when the run is in play; the host's bot answers them
    const shared = LS.paused ? 'pause' : state;
    __seen.add(state);
    if (LS.paused !== __was) { __acts[LS.paused ? 'pause' : 'resume'] = (__acts[LS.paused ? 'pause' : 'resume'] || 0) + 1; __was = LS.paused; }
    if (OPENERS.length && t >= OPENERS[0][0] && shared === 'play' && !choice) OPENERS.shift()[1]();
    __stat.waves = Math.max(__stat.waves, wave);
    for (const e of enemies) if (e.boss) __stat.bosses.add(e.boss);
    const TR = globalThis.__trace;
    if (TR && t >= TR[0] && t <= TR[1]) (globalThis.__full || (globalThis.__full = new Map())).set(t, JSON.stringify({ rng: simRngState, simTick, wave, state: shared, elapsed: r(elapsed),
      P: pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'parryT', 'parryCd', 'swingT', 'roninT', 'chain']),
      in: P.in && [P.in.mx, P.in.my, P.in.ax, P.in.ay, P.in.trig, P.in.dash, P.in.press.join('')],
      W: pk(pilotP(1) || {}, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'down', 'kills']),
      E: enemies.filter(e => !e.dead).map(e => [e.type, ...pk(e, ['x', 'y', 'hp', 'id'])]),
      B: bullets.length, EB: ebullets.length, G: gems.length, D: drops.length, RUN: RUN_FLAGS.map(k => r(RUN[k])) }));
    if (t % 60 === 0) __prints.set(LS.run * 1e6 + t, fnv(JSON.stringify([simRngState, simTick, wave, r(elapsed), r(credits), shared, LS.pausedBy,
      pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'suT', 'roninT', 'ventT']),
      pk(pilotP(1) || {}, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'down', 'suT', 'roninT', 'ventT']),
      Object.entries((pilotP(1) || {}).up || {}).sort(),
      enemies.filter(e => !e.dead).map(e => [e.type, e.boss || '', ...pk(e, ['x', 'y', 'hp', 'atk', 'cd', 'state', 'id'])]),
      bullets.map(b => pk(b, ['x', 'y'])), ebullets.map(b => pk(b, ['x', 'y'])),
      gems.map(g => pk(g, ['x', 'y'])), drops.map(d => [d.kind, ...pk(d, ['x', 'y'])]),
      Object.entries(P.up || {}).sort(), RUN_FLAGS.map(k => r(RUN[k]))])));
  };
})()`;

function play(sc) {
  ls = 12345;
  const H = { name: 'host', g: loadGame(IDX, { w: 1280, h: 720 }), hz: sc.hostHz };
  const G = { name: 'guest', g: loadGame(IDX, { w: 900, h: 640 }), hz: sc.guestHz };
  H.g.run(SETUP('host', sc.host, sc.kit, false, sc.kit, sc.yes, (sc.part || {}).host, sc.life), 'setup-host');
  G.g.run(SETUP('guest', sc.wing, sc.kit, sc.guestSave, sc.kit, sc.yes, (sc.part || {}).guest, sc.life), 'setup-guest');   // its own pilot, awake too when the scenario has kits
  H.peer = G; G.peer = H;
  for (const m of [H, G]) { m.inbox = []; m.next = 0; m.last = 0; m.lastRel = 0; m.frames = 0; m.waitFrames = 0; }
  H.g.run(`Net.ping = ${sc.lat * 2};`);
  if (process.env.LSTRACE) { const tr = process.env.LSTRACE.split(',').map(Number); H.g.ctx.__trace = tr; G.g.ctx.__trace = tr; }
  let now = 0;
  const ship = m => {                       // what m sent, onto the link
    const out = m.g.run('__out.splice(0)');
    for (const { d, r } of out) {
      if (!r && lr() < sc.loss) continue;    // the unreliable channel drops
      let at = now + sc.lat + (r ? 0 : lr() * sc.jit);   // the reliable channel keeps no jitter: how many pieces a snapshot takes must not move the rest
      if (r) { at = Math.max(at, m.lastRel + 0.01); m.lastRel = at; }   // the reliable one keeps its order
      m.peer.inbox.push({ at, d });
    }
  };
  const deliver = m => {
    m.inbox.sort((a, b) => a.at - b.at);
    while (m.inbox.length && m.inbox[0].at <= now) { const { d } = m.inbox.shift(); m.g.ctx.__msg = d; m.g.run('netOnMessage(__msg)'); }
  };
  // the handshake, then the host starts the run
  H.g.run('mpOnOpen()'); G.g.run('mpOnOpen()'); ship(H); ship(G);
  now = 200; deliver(H); deliver(G);
  if (!H.g.run('MP.ready') || !G.g.run('MP.ready')) throw new Error('the handshake did not finish');
  H.g.run(`runSeedNext = ${sc.seed}; mpStartRun()`); ship(H);   // the host's seed, fixed so a failing run can be replayed
  for (const m of [H, G]) { m.next = now; m.last = now; }
  const tick = m => m.g.run('LS.on ? LS.tick : 0');
  const steps = m => m.g.run('__steps');
  const limit = now + TICKS * 1000 / 60 * 4;
  let deadFor = 0, restarts = 0;
  while (Math.min(steps(H), steps(G)) < TICKS && now < limit) {
    const m = H.next <= G.next ? H : G;
    now = m.next;
    deliver(m);
    const frozen = m === G && sc.freeze && now >= sc.freeze.at && now < sc.freeze.at + sc.freeze.ms;
    if (!frozen) {
      const dt = Math.min(0.2, (now - m.last) / 1000);
      m.last = now;
      m.g.run(`lsFrame(${dt})`);
      // and drawn, as a browser would: drawing two pilots must touch nothing the game reads
      if (m.frames % 3 === 0) m.g.run('__draw()');
      m.frames++;
      if (m.g.run('LS.waitT > 0')) m.waitFrames++;
      // the host starts the next run a moment after both pilots are gone, as a player would
      if (m === H && sc.life) {
        if (H.g.run("state === 'dead' && LS.on")) deadFor += dt; else deadFor = 0;
        if (deadFor > 2) { deadFor = 0; restarts++; H.g.run(`runSeedNext = ${sc.seed + restarts}; handleKey(' ')`); }
      }
      ship(m);
    }
    m.next = now + (1000 / m.hz) * (0.9 + lr() * 0.2);
  }
  if (process.env.LSTRACE) {
    const fh = new Map(H.g.run('[...(globalThis.__full || new Map())]')), fg = new Map(G.g.run('[...(globalThis.__full || new Map())]'));
    for (const [t, a] of fh) { const b = fg.get(t); if (b && a !== b) {
      const A = JSON.parse(a), B = JSON.parse(b);
      console.log('first full difference at tick', t);
      for (const k of Object.keys(A)) if (JSON.stringify(A[k]) !== JSON.stringify(B[k]))
        console.log('  ' + k + '\n    host  ' + JSON.stringify(A[k]).slice(0, 300) + '\n    guest ' + JSON.stringify(B[k]).slice(0, 300));
      break; } }
  }
  if (process.env.LSDEBUG) for (const m of [H, G]) console.log(m.name, 'inbox', m.inbox.length, m.g.run("JSON.stringify({ on: LS.on, run: LS.run, tick: LS.tick, hi: LS.hi, delay: LS.delay, peerNeed: LS.peerNeed, acc: +LS.acc.toFixed(3), waitT: +LS.waitT.toFixed(2), mine: [...LS.mine.keys()].slice(0, 8), mineN: LS.mine.size, theirs: [...LS.theirs.keys()].slice(0, 8), theirsN: LS.theirs.size, state, MPon: MP.on, role: MP.role, frameErrors })"));
  /* The end of the session: one side leaves. The other must carry on as it
     should, with nothing thrown: the host alone, flying its run on for ten
     seconds; the guest, back at the lobby. */
  // each player's own kills, while both pilots are still flying
  const kills = { host: H.g.run('pilotP(0).kills'), wing: H.g.run('pilotP(1) ? pilotP(1).kills : 0'), hostRecords: H.g.run('coopMine().kills'), guestRecords: G.g.run('coopMine().kills') };
  let ending = null;
  if (sc.end) {
    const [goes, stays] = sc.end === 'guest leaves' ? [G, H] : [H, G];
    const was = JSON.parse(stays.g.run("JSON.stringify({ state, offers: offers.length })"));
    goes.g.run('mpQuit()'); ship(goes);
    now += sc.lat + 50; deliver(stays);
    const errs = [];
    for (let i = 0; i < 600; i++) {
      try { stays.g.run(`update(1 / 60); if (${i} % 3 === 0) __draw();`); } catch (e) { if (errs.length < 3) errs.push(String(e && e.message || e)); }
    }
    try { goes.g.run('update(1 / 60); __draw();'); } catch (e) { errs.push('the one who left: ' + String(e && e.message || e)); }
    ending = { was, stays: JSON.parse(stays.g.run("JSON.stringify({ MPon: MP.on, LSon: LS.on, pilots: PILOTS.length, state, lanView, offers: offers.length })")),
               goes: JSON.parse(goes.g.run("JSON.stringify({ MPon: MP.on, LSon: LS.on, pilots: PILOTS.length, state })")),
               errs, drawErr: [stays.g.run('__drawErr.n || 0'), goes.g.run('__drawErr.n || 0')] };
  }
  const ph = H.g.run('[...__prints]'), pg = new Map(G.g.run('[...__prints]'));
  let compared = 0, firstDiff = null;
  const diffs = [];
  // (keyed run * 1e6 + step; the step within its run is what the windows below are in)
  for (const [t, h] of ph) { if (!pg.has(t)) continue; compared++; if (pg.get(t) !== h) { diffs.push(t % 1e6); if (firstDiff == null) firstDiff = t % 1e6; } }
  const secs = now / 1000;
  return {
    compared, firstDiff, diffs, ticks: [tick(H), tick(G)],
    resyncs: [H.g.run('LS.resyncs'), G.g.run('LS.resyncs')],
    replayed: G.g.run('LS.replayed'),
    ending, restarts,
    life: [JSON.parse(H.g.run('JSON.stringify(__life)')), JSON.parse(G.g.run('JSON.stringify(__life)'))],
    runsRecorded: [H.g.run('(Save.profile.runs || 0) - __life.runs0'), G.g.run('(Save.profile.runs || 0) - __life.runs0')],
    // each player's own kills: the host's ship and the wingman, and what each machine would record
    kills,
    wave: H.g.run('__stat.waves'), bosses: H.g.run('[...__stat.bosses]'),
    wait: [H.waitFrames / Math.max(1, H.frames), G.waitFrames / Math.max(1, G.frames)],
    kbps: [H.g.run('Net.tx') / 1024 / secs, G.g.run('Net.tx') / 1024 / secs],
    delay: H.g.run('LS.delay'), realSecs: secs, speed: Math.min(steps(H), steps(G)) / 60 / ((now - 200) / 1000),
    acts: [JSON.parse(H.g.run('JSON.stringify(__acts)')), JSON.parse(G.g.run('JSON.stringify(__acts)'))],
    seen: [H.g.run('[...__seen]'), G.g.run('[...__seen]')],
    left: H.g.run('OPENERS_LEFT()').filter(t => t < TICKS),
    drawErr: [H.g.run('__drawErr.n || 0'), G.g.run('__drawErr.n || 0'), H.g.run('__drawErr[0] || ""'), G.g.run('__drawErr[0] || ""')],
  };
}

console.log(`VOIDRUNNER lockstep · ${path.relative(process.cwd(), IDX) || IDX}${SHORT ? ' · short' : ''}\n`);
let failed = 0;
for (const sc of SCENARIOS) {
  if (ONLY && !ONLY.has(sc.name)) continue;
  const t0 = Date.now();
  let r, err = null;
  try { r = play(sc); } catch (e) { err = e; }
  if (err) { failed++; console.log(`${sc.name.padEnd(9)} ERROR ${String(err && err.stack || err).split('\n').slice(0, 4).join(' | ')}`); continue; }
  /* Coverage, or the test proves nothing about menus: cards were picked through
     the host's keys, the shared pause went both ways, and each side opened a
     screen of its own over it (cards or gear, and the host's graphics, only
     in the full run). */
  const [ah, ag] = r.acts, miss = [];
  if (!ah.pick && !ah.gearTake && !SHORT) miss.push('no card or gear chosen');   // THE VAGRANT has loot, not cards, and may find none in a minute
  if (!ah['pick·guest'] && !ah['gearTake·guest'] && !SHORT) miss.push("the guest's pilot never chose its own card or gear");
  // a run as people play it: down and up, dead, again; each side keeps its own record of every run that ended
  if (sc.life) {
    const [lh, lg] = r.life;
    if (!lh.downs || !lh.ups) miss.push('no pilot went down and stood back up');
    if (!r.restarts) miss.push('no run ended and started again');
    if (lh.deaths !== lg.deaths || r.runsRecorded[0] !== lh.deaths || r.runsRecorded[1] !== lg.deaths)
      miss.push(`runs ended ${lh.deaths}/${lg.deaths}, recorded ${r.runsRecorded[0]}/${r.runsRecorded[1]}`);
  }
  // and the end of a session: whoever stays carries on, with nothing thrown
  if (r.ending) {
    const e = r.ending;
    if (e.errs.length || e.drawErr[0] || e.drawErr[1]) miss.push('after ' + sc.end + ': ' + (e.errs[0] || 'drawing threw'));
    if (e.stays.MPon || e.stays.LSon || e.stays.pilots || e.goes.MPon || e.goes.pilots) miss.push('after ' + sc.end + ': still linked ' + JSON.stringify(e));
    if (sc.end === 'guest leaves' && !['play', 'dead', 'pause', 'levelup', 'gear', 'shop'].includes(e.stays.state)) miss.push('the host was left in ' + e.stays.state);
    if (sc.end === 'guest leaves' && e.stays.state === 'levelup' && !e.stays.offers) miss.push('the host was left waiting on cards that went with the guest');
    if (sc.end === 'host leaves' && e.stays.state !== 'lan') miss.push('the guest was left in ' + e.stays.state + ', not the lobby');
  }
  if (r.drawErr[0] || r.drawErr[1]) miss.push(`drawing threw (host ${r.drawErr[0]}, guest ${r.drawErr[1]}): ${r.drawErr[2] || r.drawErr[3]}`);
  if (!ah.pause || !ah.resume) miss.push('no shared pause');
  if (!r.seen[1].includes('codex')) miss.push('guest never opened the codex over the pause');
  if (!SHORT && !r.seen[0].includes('gfx')) miss.push('host never opened graphics over the pause');
  // each records its own kills, and the wingman's are not the host's
  const k = r.kills;
  if (k.hostRecords !== k.host || k.guestRecords !== k.wing) miss.push(`kills recorded as ${k.hostRecords}/${k.guestRecords}, flown ${k.host}/${k.wing}`);
  if (!k.wing && !SHORT && !sc.life) miss.push('the wingman was never credited a kill');   // (a life scenario's count is the last run's)
  const same = JSON.stringify(Object.entries(ah).sort()) === JSON.stringify(Object.entries(ag).sort());
  /* In step: every fingerprint the same, and the safety net never needed. Where
     a machine was nudged out of step on purpose, the two may part only for a
     moment after each nudge (the net finds it, the host's snapshot puts it
     right), and must be the same everywhere else. */
  const parts = [...((sc.part || {}).host || []), ...((sc.part || {}).guest || [])].filter(t => t < TICKS).sort((a, b) => a - b);
  const BACK = 600;                           // ten seconds to find it and put it right, at most
  const within = t => parts.find(p => t >= p && t < p + BACK);
  const stray = r.diffs.filter(t => within(t) == null);
  let verdict;
  if (r.compared < TICKS / 60 - 2) verdict = 'STALLED';
  else if (stray.length) verdict = 'DIFFER at ' + (stray[0] / 60).toFixed(0) + 's';
  else if (!parts.length && r.resyncs[0] + r.resyncs[1]) verdict = 'RESYNCED ×' + r.resyncs[1] + ' (nothing should part a clean run)';
  else if (parts.length && r.resyncs[1] < parts.length) verdict = 'NEVER CAUGHT (' + r.resyncs[1] + ' of ' + parts.length + ' nudges put right)';
  else if (parts.length && !r.replayed) verdict = 'NOTHING PLAYED AGAIN (the guest was never past a snapshot: that path went untested)';
  else verdict = parts.length ? 'back in step' : 'same';
  const ok = /^(same|back in step)$/.test(verdict) && !miss.length;
  if (!ok) failed++;
  const net = parts.length ? '\n          ' + parts.map(p => {
    const d = r.diffs.filter(t => within(t) === p), last = d.length ? d[d.length - 1] : null;
    return `nudged at ${(p / 60).toFixed(0)}s: ${last == null ? 'never parted' : 'parted, the same again by ' + ((last + 60) / 60).toFixed(0) + 's'}`;
  }).join(' · ') + ` · ${r.resyncs[1]} snapshot${r.resyncs[1] === 1 ? '' : 's'} taken, ${r.replayed} steps played again` : '';
  console.log(`${sc.name.padEnd(9)} ${verdict}` +
    `  ${r.compared}s compared · delay ${r.delay} · game ran at ${(r.speed * 100).toFixed(0)}% of real time` +
    ` · ${r.kbps[0].toFixed(1)}/${r.kbps[1].toFixed(1)} KB/s · wave ${r.wave} ${r.bosses.join(',')} · ${((Date.now() - t0) / 1000).toFixed(1)}s` +
    `  [${sc.lat}±${sc.jit} ms, ${(sc.loss * 100).toFixed(0)}% loss, ${sc.hostHz}/${sc.guestHz} Hz${sc.freeze ? ', guest froze ' + sc.freeze.ms + ' ms' : ''}${sc.guestSave ? ', saves differ' : ''}]` +
    `\n          menus: ${Object.entries(ah).sort().map(([k, n]) => k + ' ' + n).join(' · ')}${same ? '' : '  (the guest saw a different count: it may have stopped a step behind)'}` +
    `\n          kills: host ${r.kills.host} · wingman ${r.kills.wing}, each on its own record` +
    net +
    (sc.life ? `
          life: ${r.life[0].downs} downs, ${r.life[0].ups} back up, ${r.life[0].deaths} runs ended and recorded on both, ${r.restarts} restarted by the host` : '') +
    (r.ending ? `
          ${sc.end}: the ${sc.end === 'guest leaves' ? 'host' : 'guest'} carried on (${r.ending.was.state} -> ${r.ending.stays.state}${r.ending.stays.lanView && sc.end === 'host leaves' ? ', ' + r.ending.stays.lanView : ''}), nothing thrown` : '') +
    (r.left.length ? `\n          screens never opened (the run was never back in play at the time): ${r.left.join(', ')}` : '') +
    (miss.length ? `\n          NOT COVERED: ${miss.join('; ')}` : ''));
}

/* Two different builds must not play together at all: the smallest change to
   the game parts them. The hello carries each side's build, and both refuse,
   saying why. */
function buildsCheck() {
  const H = loadGame(IDX, { w: 1280, h: 720 }), G = loadGame(IDX, { w: 900, h: 640 });
  for (const [m, role] of [[H, 'host'], [G, 'guest']])
    m.run(`pageDead = true; Save.profile.gfxSeen = GFX_VER; globalThis.__out = [];
           netSend = function (buf) { __out.push(buf); return true; }; Net.phase = 'live'; Net.role = '${role}';`);
  G.run("buildId = () => 'another build'");
  H.run('mpOnOpen()'); G.run('mpOnOpen()');
  const pass = (a, b) => { for (const d of a.run('__out.splice(0)')) { b.ctx.__msg = d; b.run('netOnMessage(__msg)'); } };
  pass(H, G); pass(G, H);
  return { host: H.run('MP.ready'), guest: G.run('MP.ready'), failed: H.run("Net.phase") === 'failed' && G.run("Net.phase") === 'failed',
           note: H.run('Net.note') || '' };
}
if (!ONLY || ONLY.has('builds')) {
  const b = buildsCheck(), ok = !b.host && !b.guest && b.failed && /version/.test(b.note);
  if (!ok) failed++;
  console.log(`${'builds'.padEnd(9)} ${ok ? 'refused' : 'NOT REFUSED'}  two different builds do not connect${b.note ? ': "' + b.note + '"' : ''}`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall in step');
process.exit(failed ? 1 : 0);
