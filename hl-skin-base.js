/* ===========================================================================
   ALL HALLOWS · THE WARDROBE — the harness base (prepatch only; never shipped)
   The bench the prize skins are drawn on outside the game, on the same code
   the game runs: this file shims the handful of game globals THE KIT and THE
   WARDROBE lean on, then loads, in this order,
       hl-kit.js  →  hl-wardrobe.js  →  the art (hl-art.js, or ?art=<file>)
   and builds the bench around THE WARDROBE's own stage. Nothing here is
   drawn by a second renderer: the stage, the stock hull, the bodies, the
   rounds and every hook call are the wardrobe's, exactly as the menu's
   showcase runs them.

   Opened from "Hallows Skins.dc.html" (the design file is the page), over
   any static server rooted at prepatch. ?art=<file> draws another art file
   instead of hl-art.js, for a drop you have not lifted yet.

   THE BENCH
     the big stage    arena / plate / card, any prize, any pilot, zoom
     the cards        all four prizes at menu size, side by side
     events           every moment the wardrobe answers, fired at the stage
     REPEAT           re-fires the last event every 1.6 s while you draw it
     PAUSE + SCRUB    the clock stops (uiTime too); the slider drags every
                      live moment through its length (m.k, m.age, m.tl)
     STEP             one 1/60 s frame while paused
     LIT ROOM         the kit's light pass under the rounds, and your
                      hlSkinLights — how the prize looks in THE PATCH at night
     DEBUG            sockets, trail, managed bodies, springs, moments
     RELOAD ART       re-fetches the art file in place; its hooks replace the
                      old ones without losing the stage
     the list         every hook: ● drawn by the art · ○ still a placeholder
   The legacy prize hooks (hlSkinUnder/Player/Bullet/Part/Enemy) read the
   global P; the bench points P at the stage's wearer while it draws, so the
   27 Sep look shows here too until the art moves to the new hooks.
=========================================================================== */

/* -------------------------------- the shims -------------------------------- */
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);       // the game's argument order
function rgba(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const _benchGlow = new Map();
function glowSprite(hex) {
  let s = _benchGlow.get(hex);
  if (s) return s;
  const S = 96;
  s = document.createElement('canvas'); s.width = s.height = S;
  const g = s.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, rgba(hex, 1)); gr.addColorStop(0.18, rgba(hex, 0.75));
  gr.addColorStop(0.45, rgba(hex, 0.22)); gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  _benchGlow.set(hex, s);
  return s;
}
function drawGlow(x, y, r, color, a = 1) {
  const was = ctx.globalAlpha;
  ctx.globalAlpha = was * a;
  ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = was;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function poly(x, y, r, sides, ang) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = ang + i * TAU / sides, X = x + Math.cos(a) * r, Y = y + Math.sin(a) * r;
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.closePath();
}
/* the four hulls, copied from index.html's hullPath(id) */
function hullPath(id) {
  ctx.beginPath();
  const pts = id === 'hacker' ? [18, 0, 4, 6, 10, 13, -4, 11, -9, 0, -4, -11, 10, -13, 4, -6]
    : id === 'ember' ? [22, 0, 13, 2.6, 9, 7, 2, 13.5, -7, 12, -5, 4.6, -12, 3.2, -9, 0, -12, -3.2, -5, -4.6,
                        -7, -12, 2, -13.5, 9, -7, 13, -2.6]
    : id === 'melee' ? [12.6, 0, 10.4, 4.4, 11.4, 10.2, 2.4, 13.2, -6.4, 12, -9.2, 6, -15, 4, -12.8, 0, -15, -4,
                        -9.2, -6, -6.4, -12, 2.4, -13.2, 11.4, -10.2, 10.4, -4.4]
    : [18, 0, 9, 3.4, 5.5, 8.5, -5, 13, -8.5, 9.5, -6, 4.2, -10.5, 3.2, -6.5, 0, -10.5, -3.2, -6, -4.2,
       -8.5, -9.5, -5, -13, 5.5, -8.5, 9, -3.4];
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
const FXO = { parts: true, mat: true, bglow: true, mblur: true, ghosts: true };
const COL = { player: '#67e8f9', bullet: '#a5f3fc', crit: '#fbbf24', shield: '#38bdf8' };
let ctx = null, W = 0, H = 0, DPR = 1, uiTime = 0, P = null;
/* the legacy art spawns into the game's particle pool; here that is the
   stage being drawn (its sparks, which hlSkinDebris dresses) */
let _benchParts = null;
function spawnPart(x, y, vx, vy, r, color, life, drag = 0.94) {
  if (!_benchParts || _benchParts.length > 500) return;
  _benchParts.push({ x, y, vx, vy, r, color, life, max: life, drag });
}

/* --------------------------------- the prizes ------------------------------- */
/* DEV_SKINS' four rows, as index.html has them (the names, colours and bases
   the wardrobe reads). Keep in step if those change. */
const BENCH_SKINS = [
  { id: 'hl-carved', n: 'THE CARVED', col: '#fb923c', fx: 'hallows', tier: 1,
    base: { player: { col: '#fb923c' }, bullet: { col: '#fdba74' } } },
  { id: 'hl-lantern', n: 'THE LANTERN', col: '#f97316', fx: 'hallows', tier: 2,
    base: { player: { col: '#f97316' }, bullet: { col: '#fed7aa' } } },
  { id: 'hl-hallows', n: 'ALL HALLOWS', col: '#ea580c', fx: 'hallows', tier: 3,
    base: { player: { col: '#ea580c' }, bullet: { col: '#fdba74' } } },
  { id: 'hl-lostsoul', n: 'THE LOST SOUL', col: '#a5f3fc', fx: 'lostsoul',
    base: { player: { col: '#a5f3fc' }, bullet: { col: '#cffafe' } } }
];
const BENCH_PILOTS = [['runner', 'VOIDRUNNER'], ['ember', 'EMBER'], ['hacker', 'THE HACKER'], ['melee', 'THE VAGRANT']];
const BENCH_EVENTS = ['equip', 'run', 'volley', 'kill', 'elite', 'boss', 'streak', 'hurt', 'heal', 'shield',
                      'dash', 'parry', 'perfect', 'level', 'wave', 'low', 'down', 'death'];

/* --------------------------------- loading --------------------------------- */
function hlBenchLoad(files, done) {
  const next = i => {
    if (i >= files.length) { done(); return; }
    const s = document.createElement('script');
    s.src = files[i] + (files[i].indexOf('?') < 0 ? '?t=' + Date.now() : '');
    s.onload = () => next(i + 1);
    s.onerror = () => { console.error('bench: could not load ' + files[i]); next(i + 1); };
    document.body.appendChild(s);
  };
  next(0);
}

/* ---------------------------------- the page -------------------------------- */
const BENCH = { st: null, cards: [], skin: 2, pilot: 'runner', mode: 'arena', zoom: 2.4, speed: 1,
                paused: false, repeat: false, last: '', repT: 0, step: 0, art: 'hl-art.js',
                els: {}, lastNow: 0 };

function hlBenchStart(opt = {}) {
  BENCH.art = opt.art || new URLSearchParams(location.search).get('art') || 'hl-art.js';
  hlBenchLoad(['hl-kit.js', 'hl-wardrobe.js', BENCH.art], () => {
    if (typeof hlWrStage !== 'function') { document.body.textContent = 'hl-wardrobe.js did not load.'; return; }
    hlBenchBuild();
    hlBenchStage();
    requestAnimationFrame(hlBenchFrame);
  });
}

const $b = (tag, css, txt) => {
  const el = document.createElement(tag);
  if (css) el.style.cssText = css;
  if (txt !== undefined) el.textContent = txt;
  return el;
};
function benchBtn(parent, label, fn, tone) {
  const col = tone === 'hot' ? '#fca5a5' : tone === 'warm' ? '#fdba74' : '#cbd5e1';
  const b = $b('button', `background:#0b1220;color:${col};border:1px solid #1e293b;border-radius:5px;
    font:700 10px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;padding:7px 9px;cursor:pointer;
    white-space:nowrap`, label);
  b.onclick = () => fn(b);
  parent.appendChild(b);
  return b;
}
function benchLit(b, on, col) {
  b.style.borderColor = on ? (col || '#fb923c') : '#1e293b';
  b.style.color = on ? '#fff7ed' : '#94a3b8';
}

function hlBenchBuild() {
  document.body.style.cssText = 'margin:0;background:#05060a;color:#cbd5e1;font-family:Barlow,"Segoe UI",system-ui,sans-serif;overflow:hidden';
  const root = $b('div', 'position:fixed;inset:0;display:grid;grid-template-columns:1fr 300px;grid-template-rows:auto 1fr auto;gap:0');
  document.body.appendChild(root);

  // the top bar: which prize, which pilot, which view
  const top = $b('div', 'grid-column:1 / 3;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;border-bottom:1px solid #111827');
  root.appendChild(top);
  const title = $b('div', 'display:flex;flex-direction:column;gap:2px;margin-right:14px');
  title.appendChild($b('div', "font:800 15px Barlow,sans-serif;letter-spacing:.16em;color:#fdba74", 'THE WARDROBE'));
  title.appendChild($b('div', "font:600 9.5px 'JetBrains Mono',monospace;letter-spacing:.18em;color:#64748b", 'ALL HALLOWS · PRIZE SKIN BENCH'));
  top.appendChild(title);
  const grp = (label) => { const g = $b('div', 'display:flex;gap:4px;align-items:center;margin-right:10px');
                           g.appendChild($b('span', "font:600 9px 'JetBrains Mono',monospace;color:#475569;margin-right:4px", label));
                           top.appendChild(g); return g; };
  const gs = grp('PRIZE');
  BENCH.els.skins = BENCH_SKINS.map((s, i) => benchBtn(gs, s.n.replace(/^THE /, ''), () => { BENCH.skin = i; hlBenchDress(); }));
  const gp = grp('PILOT');
  BENCH.els.pilots = BENCH_PILOTS.map(([id, n]) => benchBtn(gp, n.replace(/^THE /, ''), () => { BENCH.pilot = id; hlBenchDress(); }));
  const gm = grp('VIEW');
  BENCH.els.modes = ['arena', 'plate', 'card'].map(m => benchBtn(gm, m.toUpperCase(), () => { BENCH.mode = m; hlBenchStage(); }));
  const gz = grp('ZOOM');
  const zoom = $b('input', 'width:90px;accent-color:#fb923c');
  zoom.type = 'range'; zoom.min = 1; zoom.max = 4.5; zoom.step = 0.1; zoom.value = BENCH.zoom;
  zoom.oninput = () => { BENCH.zoom = +zoom.value; if (BENCH.st) BENCH.st.zoom = BENCH.zoom; };
  gz.appendChild(zoom);

  // the stage
  const mid = $b('div', 'position:relative;min-height:0;border-right:1px solid #111827');
  const cv = $b('canvas', 'position:absolute;inset:0;width:100%;height:100%;display:block');
  mid.appendChild(cv);
  BENCH.els.cv = cv;
  root.appendChild(mid);

  // the side: clock, events, hooks, readout
  const side = $b('div', 'overflow-y:auto;padding:12px 12px 20px;display:flex;flex-direction:column;gap:14px');
  root.appendChild(side);
  const head = t => side.appendChild($b('div', "font:700 9.5px 'JetBrains Mono',monospace;letter-spacing:.2em;color:#38bdf8", t));
  const row = () => { const r = $b('div', 'display:flex;flex-wrap:wrap;gap:4px'); side.appendChild(r); return r; };

  head('CLOCK');
  const rc = row();
  BENCH.els.pause = benchBtn(rc, 'PAUSE', () => { BENCH.paused = !BENCH.paused; hlBenchPaint(); });
  benchBtn(rc, 'STEP', () => { BENCH.paused = true; BENCH.step++; hlBenchPaint(); });
  BENCH.els.speeds = [0.1, 0.25, 0.5, 1, 2].map(v => benchBtn(rc, v + '×', () => { BENCH.speed = v; hlBenchPaint(); }));
  const scrubRow = $b('div', 'display:flex;gap:6px;align-items:center');
  scrubRow.appendChild($b('span', "font:600 9px 'JetBrains Mono',monospace;color:#475569", 'SCRUB'));
  const scrub = $b('input', 'flex:1;accent-color:#f472b6');
  scrub.type = 'range'; scrub.min = 0; scrub.max = 1; scrub.step = 0.001; scrub.value = 0;
  scrub.oninput = () => hlBenchScrub(+scrub.value);
  scrubRow.appendChild(scrub);
  side.appendChild(scrubRow);
  side.appendChild($b('div', 'font-size:11px;color:#64748b;line-height:1.4',
    'Pause, fire an event, then drag: every live moment is held at that point of its length.'));

  head('EVENTS');
  const re = row();
  for (const ev of BENCH_EVENTS) benchBtn(re, ev.toUpperCase(), () => hlBenchFire(ev),
    ev === 'death' || ev === 'hurt' ? 'hot' : ev === 'boss' || ev === 'streak' || ev === 'level' ? 'warm' : undefined);
  const rr = row();
  BENCH.els.repeat = benchBtn(rr, 'REPEAT LAST', () => { BENCH.repeat = !BENCH.repeat; hlBenchPaint(); });
  BENCH.els.auto = benchBtn(rr, 'AUTO', () => { if (BENCH.st) BENCH.st.auto = !BENCH.st.auto; hlBenchPaint(); });
  BENCH.els.hurtEvery = benchBtn(rr, 'HURT EVERY 4S', () => { if (BENCH.st) BENCH.st.hurtEvery = BENCH.st.hurtEvery ? 0 : 4; hlBenchPaint(); });

  head('VIEW');
  const rv = row();
  BENCH.els.lit = benchBtn(rv, 'LIT ROOM', () => { if (BENCH.st) BENCH.st.lit = !BENCH.st.lit; hlBenchPaint(); });
  BENCH.els.debug = benchBtn(rv, 'DEBUG', () => { HL_WR.debug = !HL_WR.debug; hlBenchPaint(); });
  benchBtn(rv, 'RELOAD ART', () => hlBenchReloadArt(), 'warm');

  head('HOOKS');
  BENCH.els.hooks = $b('div', "font:500 10.5px/1.55 'JetBrains Mono',monospace;columns:2;column-gap:8px");
  side.appendChild(BENCH.els.hooks);

  head('THE WEARER');
  BENCH.els.read = $b('pre', "margin:0;font:500 10.5px/1.5 'JetBrains Mono',monospace;color:#94a3b8;white-space:pre-wrap");
  side.appendChild(BENCH.els.read);

  // the cards: all four, at menu size
  const foot = $b('div', 'grid-column:1 / 3;display:flex;gap:10px;padding:10px 16px 14px;border-top:1px solid #111827;overflow-x:auto');
  root.appendChild(foot);
  BENCH.cards = BENCH_SKINS.map(s => {
    const box = $b('div', `flex:0 0 228px;border:1px solid ${rgba(s.col, 0.35)};border-radius:6px;overflow:hidden;background:#06090f`);
    const c = $b('canvas', 'display:block;width:228px;height:132px');
    box.appendChild(c);
    box.appendChild($b('div', `padding:6px 10px 7px;font:700 10px Barlow,sans-serif;letter-spacing:.14em;color:${s.col}`, s.n));
    foot.appendChild(box);
    return { s, cv: c, st: null };
  });
  hlBenchPaint();
}

function hlBenchStage() {
  const s = BENCH_SKINS[BENCH.skin];
  const was = BENCH.st;
  BENCH.st = hlWrStage(s, BENCH.pilot, { mode: BENCH.mode, zoom: BENCH.zoom, where: 'bench' });
  BENCH.st.me.real = true;
  if (was) { BENCH.st.lit = was.lit; BENCH.st.auto = was.auto; BENCH.st.hurtEvery = was.hurtEvery; }
  for (const c of BENCH.cards) {
    c.st = hlWrStage(c.s, BENCH.pilot, { mode: 'card', zoom: 1.5, where: 'bench' });
    c.st.me.real = true;
  }
  hlBenchPaint();
}
function hlBenchDress() {
  const s = BENCH_SKINS[BENCH.skin];
  hlWrStageDress(BENCH.st, s, BENCH.pilot);
  for (const c of BENCH.cards) hlWrStageDress(c.st, c.s, BENCH.pilot);
  hlBenchPaint();
}
function hlBenchFire(ev) {
  if (!BENCH.st) return;
  BENCH.last = ev; BENCH.repT = 0;
  P = BENCH.st.me; _benchParts = BENCH.st.debris;
  hlWrStageFire(BENCH.st, ev);
}
function hlBenchScrub(k) {
  if (!BENCH.st) return;
  BENCH.paused = true;
  for (const m of BENCH.st.me.moments) {
    m.age = k * m.dur; m.k = k;
    if (m.tl) m.tl.seek(m.age);
  }
  hlBenchPaint();
}
function hlBenchReloadArt() {
  const s = document.createElement('script');
  s.src = BENCH.art + '?t=' + Date.now();
  s.onload = () => { for (const st of [BENCH.st, ...BENCH.cards.map(c => c.st)]) if (st) hlWrLook(st.me); hlBenchPaint(); };
  s.onerror = () => console.error('bench: could not reload ' + BENCH.art);
  document.body.appendChild(s);
}

function hlBenchPaint() {
  const E = BENCH.els;
  if (!E.skins) return;
  E.skins.forEach((b, i) => benchLit(b, i === BENCH.skin, BENCH_SKINS[i].col));
  E.pilots.forEach((b, i) => benchLit(b, BENCH_PILOTS[i][0] === BENCH.pilot, '#67e8f9'));
  E.modes.forEach((b, i) => benchLit(b, ['arena', 'plate', 'card'][i] === BENCH.mode, '#67e8f9'));
  E.speeds.forEach((b, i) => benchLit(b, [0.1, 0.25, 0.5, 1, 2][i] === BENCH.speed, '#a3e635'));
  benchLit(E.pause, BENCH.paused, '#f472b6'); E.pause.textContent = BENCH.paused ? 'PLAY' : 'PAUSE';
  benchLit(E.repeat, BENCH.repeat, '#fbbf24');
  benchLit(E.debug, HL_WR.debug, '#38bdf8');
  const st = BENCH.st;
  benchLit(E.lit, !!(st && st.lit), '#fbbf24');
  benchLit(E.auto, !!(st && st.auto), '#a3e635');
  benchLit(E.hurtEvery, !!(st && st.hurtEvery), '#fca5a5');
  E.hooks.innerHTML = '';
  for (const h of hlWrHookState()) {
    const d = $b('div', `color:${h.art ? '#a3e635' : '#475569'};break-inside:avoid`, (h.art ? '● ' : '○ ') + h.name.replace(/^hlSkin/, ''));
    E.hooks.appendChild(d);
  }
}

/* draws one stage into one canvas: the canvas's own size, DPR, and its own
   turn at being ctx, W, H and P */
function hlBenchDraw(cv, st) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  ctx = cv.getContext('2d'); W = w; H = h; DPR = dpr;
  P = st.me; _benchParts = st.debris;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  hlWrStageDraw(st, { x: 0, y: 0, w, h });
  // the screen pass, over the stage (a real run draws it over the whole frame)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hlWrDrawScreen(st.me);
}

let _benchReadT = 0;
function hlBenchFrame(now) {
  const real = Math.min(0.1, (now - (BENCH.lastNow || now)) / 1000);
  BENCH.lastNow = now;
  let dt = BENCH.paused ? 0 : real * BENCH.speed;
  if (BENCH.step > 0) { BENCH.step--; dt = 1 / 60; }
  uiTime += dt;
  const st = BENCH.st;
  if (st) {
    st.ww = (BENCH.els.cv.clientWidth || 1) / st.zoom; st.wh = (BENCH.els.cv.clientHeight || 1) / st.zoom;
    P = st.me; _benchParts = st.debris;
    const was = st.paused; st.paused = false; st.speed = 1;
    hlWrStageTick(st, dt);
    st.paused = was;
    if (BENCH.repeat && BENCH.last && dt > 0 && (BENCH.repT += dt) >= 1.6) { BENCH.repT = 0; hlWrStageFire(st, BENCH.last); }
    hlBenchDraw(BENCH.els.cv, st);
  }
  for (const c of BENCH.cards) {
    if (!c.st) continue;
    c.st.ww = 228 / c.st.zoom; c.st.wh = 132 / c.st.zoom;
    P = c.st.me; _benchParts = c.st.debris;
    hlWrStageTick(c.st, dt);
    hlBenchDraw(c.cv, c.st);
  }
  if (st && (now - _benchReadT > 120)) {
    _benchReadT = now;
    const me = st.me, f = v => (typeof v === 'number' ? v.toFixed(2) : String(v));
    const since = Object.entries(me.since).filter(([, v]) => v < 5).map(([k, v]) => k + ' ' + v.toFixed(1)).join(' · ');
    BENCH.els.read.textContent =
      me.id + ' · ' + me.pilot + ' · tier ' + me.tier + (st.lit ? ' · lit' : '') + '\n' +
      'speed ' + f(me.speed) + '  turn ' + f(me.turn) + '  lean ' + f(me.lean) + '\n' +
      'recoil ' + f(me.recoil) + '  flinch ' + f(me.flinch) + '  bob ' + f(me.bob) + '\n' +
      'heat ' + f(me.heat) + '  pulse ' + f(me.pulse) + '  streak ' + me.streak + ' (best ' + me.best + ')\n' +
      'hp ' + f(me.hpK) + '  low ' + f(me.lowK) + '  idle ' + f(me.idle) + '  dashK ' + f(me.dashK) + '\n' +
      'moments ' + me.moments.map(m => m.name + ' ' + m.k.toFixed(2)).join(', ') + '\n' +
      'parts ' + me.parts.length + '  rounds ' + me.rounds.size + '  bodies ' + Object.keys(me.bodies).join(',') + '\n' +
      'since: ' + (since || '—');
  }
  requestAnimationFrame(hlBenchFrame);
}
