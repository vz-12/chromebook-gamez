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

   No browser and no dependencies: the game's script is loaded into a bare
   context where the canvas, audio, storage and network are stubs.

     node scripts/determinism.mjs [path/to/index.html] [--quick] [--only name,name]

   Exits 1 if any scenario's runs differ, or if a different seed fails to. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const ONLY = (() => { const i = args.indexOf('--only'); return i >= 0 ? new Set(args[i + 1].split(',')) : null; })();
const IDX = args.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');

/* ------------------------------ the stub browser ------------------------------ */
const noop = () => {};
let ctxCalls = 0;                                // canvas calls made: proof the drawing really ran
const CTX_DEFAULTS = {
  globalAlpha: 1, lineWidth: 1, font: '10px sans-serif', fillStyle: '#000', strokeStyle: '#000',
  globalCompositeOperation: 'source-over', textAlign: 'start', textBaseline: 'alphabetic',
  letterSpacing: '0px', filter: 'none', imageSmoothingEnabled: true, shadowBlur: 0, shadowColor: '#000',
  shadowOffsetX: 0, shadowOffsetY: 0, lineCap: 'butt', lineJoin: 'miter', miterLimit: 10, lineDashOffset: 0,
  direction: 'ltr', fontKerning: 'auto',
};
const gradient = { addColorStop: noop };
const matrix = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, invertSelf() { return this; }, inverse() { return this; },
  multiply() { return this; }, translate() { return this; }, scale() { return this; }, rotate() { return this; },
  transformPoint: p => ({ x: p.x, y: p.y }) });
function makeCtx(canvas) {
  const t = Object.assign({}, CTX_DEFAULTS);
  const fns = {
    measureText: s => ({ width: String(s).length * 7, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2,
                         actualBoundingBoxLeft: 0, actualBoundingBoxRight: String(s).length * 7 }),
    getImageData: (x, y, w, h) => { w = Math.max(1, w | 0); h = Math.max(1, h | 0); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    createImageData: (w, h) => { if (typeof w === 'object') { h = w.height; w = w.width; } w = Math.max(1, w | 0); h = Math.max(1, h | 0); return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    createLinearGradient: () => gradient, createRadialGradient: () => gradient, createConicGradient: () => gradient,
    createPattern: () => ({ setTransform: noop }),
    getTransform: matrix, isPointInPath: () => false, isPointInStroke: () => false, getLineDash: () => [],
  };
  return new Proxy(t, {
    get(o, k) { if (k === 'canvas') return canvas; if (k in fns) { ctxCalls++; return fns[k]; } if (k in o) return o[k]; ctxCalls++; return noop; },
    set(o, k, v) { o[k] = v; return true; },
  });
}
function makeEl(tag = 'div') {
  const el = { tagName: String(tag).toUpperCase(), style: {}, children: [], dataset: {},
    appendChild(c) { this.children.push(c); return c; }, removeChild: noop, remove: noop, insertBefore(c) { return c; },
    setAttribute: noop, getAttribute: () => null, addEventListener: noop, removeEventListener: noop,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
    focus: noop, blur: noop, click: noop, querySelector: () => null, querySelectorAll: () => [] };
  return el;
}
function makeCanvas() {
  const c = makeEl('canvas');
  c.width = 300; c.height = 150;
  const ctx = makeCtx(c);
  c.getContext = () => ctx;
  c.toDataURL = () => 'data:,';
  c.toBlob = cb => cb && cb(null);
  c.getBoundingClientRect = () => ({ left: 0, top: 0, right: c.width, bottom: c.height, width: c.width, height: c.height });
  return c;
}
function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); },
           clear: () => m.clear(), key: i => [...m.keys()][i] ?? null, get length() { return m.size; } };
}
function makeWindow(w, h) {
  const els = {};
  const document = {
    getElementById: id => els[id] || (els[id] = id === 'c' ? makeCanvas() : makeEl()),
    createElement: tag => (String(tag).toLowerCase() === 'canvas' ? makeCanvas() : makeEl(tag)),
    createElementNS: (ns, tag) => makeEl(tag), createTextNode: () => makeEl('#text'),
    body: makeEl('body'), head: makeEl('head'), documentElement: makeEl('html'),
    addEventListener: noop, removeEventListener: noop, querySelector: () => null, querySelectorAll: () => [],
    fonts: { load: () => Promise.resolve([]), ready: Promise.resolve(), add: noop, check: () => true, forEach: noop },
    hidden: false, visibilityState: 'visible', title: '', cookie: '', referrer: '',
  };
  class Img { constructor() { this.width = 0; this.height = 0; this.complete = false; } set src(v) { this._src = v; } get src() { return this._src; } addEventListener() {} decode() { return Promise.resolve(); } }
  class FontFace { constructor(n) { this.family = n; } load() { return Promise.resolve(this); } }
  class Obs { observe() {} unobserve() {} disconnect() {} }
  const win = {
    document, innerWidth: w, innerHeight: h, devicePixelRatio: 1, screen: { width: 1920, height: 1080 },
    localStorage: makeStorage(), sessionStorage: makeStorage(),
    navigator: { userAgent: 'node determinism', language: 'en-US', languages: ['en-US'], maxTouchPoints: 0, onLine: true,
                 clipboard: { writeText: async () => {} }, getGamepads: () => [] },
    location: { hostname: 'localhost', host: 'localhost', origin: 'http://localhost', href: 'http://localhost/',
                protocol: 'http:', pathname: '/', search: '', hash: '', replace: noop, reload: noop, assign: noop },
    history: { replaceState: noop, pushState: noop },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    addEventListener: noop, removeEventListener: noop, dispatchEvent: () => true,
    requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    requestIdleCallback: () => 0, cancelIdleCallback: noop,
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,   // nothing runs on the wall clock here
    fetch: () => Promise.reject(new Error('offline')),
    Image: Img, FontFace, ResizeObserver: Obs, IntersectionObserver: Obs, MutationObserver: Obs,
    OffscreenCanvas: class { constructor(w2, h2) { const c = makeCanvas(); c.width = w2; c.height = h2; return c; } },
    Event: class { constructor(type, o) { this.type = type; Object.assign(this, o || {}); } preventDefault() {} stopPropagation() {} },
    performance: globalThis.performance, crypto: webcrypto, console,
    URL, URLSearchParams, Blob, TextEncoder, TextDecoder, atob, btoa, structuredClone, queueMicrotask,
    Promise, Math, JSON, Date, Intl,
  };
  win.KeyboardEvent = win.MouseEvent = win.TouchEvent = win.Event;
  win.window = win.self = win.globalThis = win.top = win.parent = win;
  return win;
}

/* ------------------------------ load the game ------------------------------ */
const html = fs.readFileSync(IDX, 'utf8').replace(/\r\n/g, '\n');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const game = scripts.reduce((a, b) => (b.length > a.length ? b : a));
const win = makeWindow(1280, 720);
const ctx = vm.createContext(win);
const t0 = Date.now();
vm.runInContext(game, ctx, { filename: 'index.html' });
const loadMs = Date.now() - t0;

/* --------------------- the harness, inside the game's scope --------------------- */
vm.runInContext(`(() => {
  pageDead = true;
  const STEP = 1 / 60;
  Save.profile.gfxSeen = GFX_VER;
  if (typeof RUSH_PEAK !== 'undefined') Save.profile.rushBest = RUSH_PEAK;   // THE VAGRANT unlocked
  const SNAP = JSON.stringify(Save.profile), FX0 = JSON.stringify(FXO);
  const restore = () => { const o = JSON.parse(SNAP); for (const k of Object.keys(Save.profile)) delete Save.profile[k]; Object.assign(Save.profile, o); };
  const r = v => typeof v === 'number' ? (Number.isFinite(v) ? +v.toPrecision(12) : String(v)) : (v === undefined ? null : v);
  const pk = (o, ks) => ks.map(k => r(o[k]));
  // what the game is, at a moment: everything a desync would show up in
  function fingerprint() {
    return JSON.stringify([simRngState, simTick, wave, r(elapsed), r(credits), state,
      pk(P, ['x', 'y', 'vx', 'vy', 'hp', 'maxHp', 'level', 'xp', 'dmg', 'fireRate', 'dashCh', 'ang', 'suT', 'roninT', 'ventT']),
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
    run = { o, k: 0, prints: [], bosses: new Set(), maxWave: 0, drawErrors: 0, firstDrawError: null };
  }
  function play(o) {
    start(o);
    for (; run.k < o.steps; run.k++) {
      if (state === 'pause') state = 'play';
      if (state === 'levelup') { uiArm = 0; handleKey('1'); }
      else if (state !== 'play' && state !== 'dead') state = 'play';
      if (o.b && o.b.junk) junk(o.b);
      update(STEP);
      if (o.b && o.b.draw && run.k % 5 === 0) { try { render(); } catch (err) { run.drawErrors++; if (!run.firstDrawError) run.firstDrawError = String(err && err.stack || err).split('\\n').slice(0, 3).join(' | '); } }
      run.maxWave = Math.max(run.maxWave, wave);
      for (const e of enemies) if (e.boss) run.bosses.add(e.boss);
      if ((run.k + 1) % 60 === 0) run.prints.push(fnv(fingerprint()));
    }
    inputSource = inputSample;
    return { prints: run.prints, bosses: [...run.bosses], maxWave: run.maxWave, level: P.level, drawErrors: run.drawErrors, firstDrawError: run.firstDrawError };
  }
  globalThis.__det = { play };
})();`, ctx, { filename: 'determinism-harness' });

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
const play = (sc, b) => {
  if (b === true) b = ALL;
  if (b) b = Object.assign({ junk: b.devices || b.save }, b);
  win.innerWidth = b && b.window ? 800 : 1280; win.innerHeight = b && b.window ? 600 : 720;
  vm.runInContext('resize()', ctx);
  const o = Object.assign({}, sc, { steps: Math.round(sc.steps * L), view: VIEW, b,
    starter: sc.starter ? vm.runInContext('() => { ' + sc.starter + '; }', ctx) : null });
  return ctx.__det.play(o);
};

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
console.log(`VOIDRUNNER determinism · ${path.relative(process.cwd(), IDX) || IDX} · loaded in ${loadMs} ms${QUICK ? ' · quick' : ''}\n`);
let failed = 0;
const pad = (s, n) => String(s).padEnd(n);
for (const sc of S) {
  if (ONLY && !ONLY.has(sc.name)) continue;
  const t = Date.now();
  let a, b, err = null;
  let drawn = 0;
  try { a = play(sc, false); const c0 = ctxCalls; b = play(sc, true); drawn = ctxCalls - c0; } catch (e) { err = e; }
  if (err) { failed++; console.log(`${pad(sc.name, 12)} ERROR  ${String(err && err.stack || err).split('\n').slice(0, 4).join(' | ')}`); continue; }
  const i = a.prints.findIndex((h, j) => h !== b.prints[j]);
  const ok = i < 0 && a.prints.length === b.prints.length && a.prints.length > 0;
  if (!ok) failed++;
  const draw = `  · drawn: ${(drawn / 1e6).toFixed(1)}M canvas calls` + (b.drawErrors ? `, ${b.drawErrors} draw errors (${b.firstDrawError})` : '');
  console.log(`${pad(sc.name, 12)} ${ok ? 'same' : 'DIFFER at ' + i + 's'}  ${pad(a.prints.length + 's', 6)} wave ${pad(a.maxWave, 3)} lvl ${pad(a.level, 3)} ${pad(a.bosses.join(',') || '-', 40)} ${((Date.now() - t) / 1000).toFixed(1)}s${draw}`);
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
