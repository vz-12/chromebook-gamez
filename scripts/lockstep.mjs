#!/usr/bin/env node
/* VOIDRUNNER — the lockstep test (Phase 2 of the co-op rework).

   Two copies of the game in one process, a host and a guest, joined by a
   simulated link with latency, jitter, reordering and packet loss, each
   running at its own frame rate with its own window and its own save. A bot
   flies each pilot, writing only its own machine's input; the machines trade
   nothing but the run's header and those inputs. Every second of game time
   both fingerprint the game, and the two must be identical: the same run,
   step for step, on two machines that were only ever told each other's input.

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
  { name: 'lan',      lat: 6,   jit: 3,  loss: 0,    hostHz: 60, guestHz: 60,  host: 'runner', wing: 'ember' },
  { name: 'internet', lat: 55,  jit: 30, loss: 0.08, hostHz: 60, guestHz: 144, host: 'hacker', wing: 'melee', kit: true },
  { name: 'bad',      lat: 120, jit: 90, loss: 0.25, hostHz: 50, guestHz: 30,  host: 'melee',  wing: 'runner', kit: true,
                      freeze: { at: 40000, ms: 1800 } },
  { name: 'saves',    lat: 30,  jit: 15, loss: 0.05, hostHz: 75, guestHz: 60,  host: 'ember',  wing: 'hacker', kit: true,
                      guestSave: true },
];
const TICKS = SHORT ? 3600 : 10800;          // three minutes of game, or one

// a seeded stream for the link itself, so a failing run can be replayed
let ls = 12345;
const lr = () => { ls = (ls * 1664525 + 1013904223) >>> 0; return ls / 4294967296; };

const SETUP = (role, char, kit, scramble, kitRun) => `(() => {   // kit: this save has woken pilots; kitRun: the run fires them (on both machines)
  pageDead = true;
  Save.profile.gfxSeen = GFX_VER;
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
  // a player: only ever its own machine's input record
  LS.source = rec => {
    const S = '${role}' === 'host' ? P : Wing, k = LS.tick;
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
    if ('${role}' === 'host' && ${!!kit}) {
      if (k % 900 === 70) rec.press.push(P.charId === 'melee' ? 'v' : 'f');
      if (k % 75 === 40) rec.press.push(['z', 'x', 'c', 'v'][Math.floor(k / 75) % 4]);
      if (P.charId === 'melee' && k % 23 === 0) rec.press.push('f');
    }
  };
  const r = v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(12) : String(v)) : (v === undefined ? null : v);
  const pk = (o, ks) => ks.map(k => r(o[k]));
  const fnv = s => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  globalThis.__prints = new Map();
  globalThis.__stat = { waves: 0, bosses: new Set() };
  // the same moment on both machines: test conditions, menus, and the fingerprint
  LS.after = () => {
    const t = LS.tick;
    if (t === 1) { P.maxHp = P.hp = 60000; P.dmg *= 3; Wing.maxHp = Wing.hp = 60000; }
    if (${!!kitRun} && t % 900 === 60) {
      if (P.charId === 'hacker') P.suRoot = SU_MAX;
      else if (P.charId === 'ember') P.vent = VENT_MAX;
      else if (P.charId === 'melee' && !(P.roninT > 0)) roninFire(false);
    }
    if (state === 'levelup' && offers[0]) chooseOffer(0);
    else if (state !== 'play' && state !== 'dead') state = 'play';
    __stat.waves = Math.max(__stat.waves, wave);
    for (const e of enemies) if (e.boss) __stat.bosses.add(e.boss);
    const TR = globalThis.__trace;
    if (TR && t >= TR[0] && t <= TR[1]) (globalThis.__full || (globalThis.__full = new Map())).set(t, JSON.stringify({ rng: simRngState, simTick, wave, state, elapsed: r(elapsed),
      P: pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'parryT', 'parryCd', 'swingT', 'roninT', 'chain']),
      in: P.in && [P.in.mx, P.in.my, P.in.ax, P.in.ay, P.in.trig, P.in.dash, P.in.press.join('')],
      W: pk(Wing, ['x', 'y', 'vx', 'vy', 'hp', 'dashCh', 'ang', 'down']), Win: [Wing.in.mx, Wing.in.my, Wing.in.ang, Wing.in.fire, Wing.in.dash],
      E: enemies.filter(e => !e.dead).map(e => [e.type, ...pk(e, ['x', 'y', 'hp', 'id'])]),
      B: bullets.length, EB: ebullets.length, G: gems.length, D: drops.length, RUN: RUN_FLAGS.map(k => r(RUN[k])) }));
    if (t % 60 === 0) __prints.set(t, fnv(JSON.stringify([simRngState, simTick, wave, r(elapsed), r(credits), state,
      pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'level', 'xp', 'dashCh', 'ang', 'suT', 'roninT', 'ventT']),
      pk(Wing, ['x', 'y', 'vx', 'vy', 'hp', 'dashCh', 'ang', 'down']),
      enemies.filter(e => !e.dead).map(e => [e.type, e.boss || '', ...pk(e, ['x', 'y', 'hp', 'atk', 'cd', 'state', 'id'])]),
      bullets.map(b => pk(b, ['x', 'y'])), ebullets.map(b => pk(b, ['x', 'y'])),
      gems.map(g => pk(g, ['x', 'y'])), drops.map(d => [d.kind, ...pk(d, ['x', 'y'])]),
      Object.entries(P.up || {}).sort(), RUN_FLAGS.map(k => r(RUN[k]))])));
  };
})()`;

function play(sc) {
  ls = 12345;
  const H = { name: 'host', g: loadGame(IDX, { w: 1280, h: 720, search: '?lockstep=1' }), hz: sc.hostHz };
  const G = { name: 'guest', g: loadGame(IDX, { w: 900, h: 640, search: '?lockstep=1' }), hz: sc.guestHz };
  H.g.run(SETUP('host', sc.host, sc.kit, false, sc.kit), 'setup-host');
  G.g.run(SETUP('guest', sc.wing, false, sc.guestSave, sc.kit), 'setup-guest');
  H.peer = G; G.peer = H;
  for (const m of [H, G]) { m.inbox = []; m.next = 0; m.last = 0; m.lastRel = 0; m.frames = 0; m.waitFrames = 0; }
  H.g.run(`Net.ping = ${sc.lat * 2};`);
  if (process.env.LSTRACE) { const tr = process.env.LSTRACE.split(',').map(Number); H.g.ctx.__trace = tr; G.g.ctx.__trace = tr; }
  let now = 0;
  const ship = m => {                       // what m sent, onto the link
    const out = m.g.run('__out.splice(0)');
    for (const { d, r } of out) {
      if (!r && lr() < sc.loss) continue;    // the unreliable channel drops
      let at = now + sc.lat + lr() * sc.jit;
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
  if (!H.g.run('MP.ls') || !G.g.run('MP.ls')) throw new Error('lockstep was not agreed');
  H.g.run('mpStartRun()'); ship(H);
  for (const m of [H, G]) { m.next = now; m.last = now; }
  const tick = m => m.g.run('LS.on ? LS.tick : 0');
  const limit = now + TICKS * 1000 / 60 * 4;
  while (Math.min(tick(H), tick(G)) < TICKS && now < limit) {
    const m = H.next <= G.next ? H : G;
    now = m.next;
    deliver(m);
    const frozen = m === G && sc.freeze && now >= sc.freeze.at && now < sc.freeze.at + sc.freeze.ms;
    if (!frozen) {
      const dt = Math.min(0.2, (now - m.last) / 1000);
      m.last = now;
      m.g.run(`lsFrame(${dt})`);
      m.frames++;
      if (m.g.run('LS.waitT > 0')) m.waitFrames++;
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
  const ph = H.g.run('[...__prints]'), pg = new Map(G.g.run('[...__prints]'));
  let compared = 0, firstDiff = null;
  for (const [t, h] of ph) { if (!pg.has(t)) continue; compared++; if (pg.get(t) !== h && firstDiff == null) firstDiff = t; }
  const secs = now / 1000;
  return {
    compared, firstDiff, ticks: [tick(H), tick(G)],
    wave: H.g.run('__stat.waves'), bosses: H.g.run('[...__stat.bosses]'),
    wait: [H.waitFrames / Math.max(1, H.frames), G.waitFrames / Math.max(1, G.frames)],
    kbps: [H.g.run('Net.tx') / 1024 / secs, G.g.run('Net.tx') / 1024 / secs],
    delay: H.g.run('LS.delay'), realSecs: secs, speed: Math.min(tick(H), tick(G)) / 60 / ((now - 200) / 1000),
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
  const ok = r.firstDiff == null && r.compared >= TICKS / 60 - 2;
  if (!ok) failed++;
  console.log(`${sc.name.padEnd(9)} ${ok ? 'same' : r.firstDiff != null ? 'DIFFER at ' + (r.firstDiff / 60).toFixed(0) + 's' : 'STALLED'}` +
    `  ${r.compared}s compared · delay ${r.delay} · game ran at ${(r.speed * 100).toFixed(0)}% of real time` +
    ` · ${r.kbps[0].toFixed(1)}/${r.kbps[1].toFixed(1)} KB/s · wave ${r.wave} ${r.bosses.join(',')} · ${((Date.now() - t0) / 1000).toFixed(1)}s` +
    `  [${sc.lat}±${sc.jit} ms, ${(sc.loss * 100).toFixed(0)}% loss, ${sc.hostHz}/${sc.guestHz} Hz${sc.freeze ? ', guest froze ' + sc.freeze.ms + ' ms' : ''}${sc.guestSave ? ', saves differ' : ''}]`);
}
console.log(failed ? `\n${failed} FAILED` : '\nall in step');
process.exit(failed ? 1 : 0);
