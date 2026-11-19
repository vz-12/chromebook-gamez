/* ========================= THE PLANETARIUM — the review board =========================
   Each stage is a canvas the page marks with data-za="<stage>". The board finds them,
   gives each its own clock, pilot and room, and draws it every frame it is on screen,
   through the art's own functions. Stages are declared with ZB_STAGE(id, w, h, make).
   window.ZA_BOARD.act(stage, what, arg) drives a stage from the page's buttons. */
const ZB = { stages: {}, live: [], last: 0, draw: {}, held: /hold/.test(location.hash) };
function ZB_STAGE(id, w, h, make) { ZB.stages[id] = { w, h, make }; }

// a pilot for a stage: enough of P for the art to read
function zbPilot(o = {}) {
  return Object.assign({ x: WORLD.w / 2, y: WORLD.h / 2, r: 14, ang: 0, vx: 0, vy: 0, charId: 'runner', hp: 100, maxHp: 100,
    shield: 0, shieldMax: 0, dashT: 0, dashCh: 2, dashMax: 2, iframe: 0, twin: 0, twinT: 0, twinAng: 0, sun: 0, zs: {},
    zShadow: '', zShadowFixed: false, zTri: {}, zRead: null, zx: {}, dmg: 20, weapon: 'gun', waveClock: 0 }, o);
}
function zbTri(p) {
  p.zTri = {};
  for (const el of Object.keys(Z_EL)) if (Z_EL[el].signs.every(id => (p.zs[id] | 0) > 0)) p.zTri[el] = true;
}

/* ------------------------------------ the room ------------------------------------ */
// a floor for the field stages: the arena's grid, seen through a camera at (cx, cy)
function zbFloor(st, cx, cy, z) {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
  ctx.strokeStyle = 'rgba(30,58,95,0.35)'; ctx.lineWidth = 1 / z;
  ctx.beginPath();
  const x0 = Math.floor((cx - W / z) / 60) * 60, y0 = Math.floor((cy - H / z) / 60) * 60;
  for (let x = x0; x < cx + W / z; x += 60) { ctx.moveTo(x, cy - H / z); ctx.lineTo(x, cy + H / z); }
  for (let y = y0; y < cy + H / z; y += 60) { ctx.moveTo(cx - W / z, y); ctx.lineTo(cx + W / z, y); }
  ctx.stroke();
  ctx.restore();
}
// a hull as drawPlayer draws it: glow, outline, fill
function zbHull(p, col) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(p.x, p.y, 34, col || COL.player, 0.35);
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(p.ang);
  ctx.lineWidth = 2.2;
  drawShipHull(col || COL.player, 'rgba(10,25,40,0.92)');
  ctx.restore();
}
// the stage's particles, stepped and drawn (the game's own pass does this in a run)
function zbParts(dt) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= p.drag; p.vy *= p.drag;
    drawGlow(p.x, p.y, p.r * 3, p.color, 0.6 * p.life / p.max);
  }
  ctx.restore();
}
// a caption on a stage
function zbLabel(t, x, y, col, size, align) {
  ctx.save();
  ctx.font = `700 ${size || 11}px ${ZA_FD}`;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = col || '#94a3b8';
  ctx.fillText(t, x, y);
  ctx.restore();
}

/* ------------------------------------ the dome ------------------------------------
   The reading, playing its beats on a loop: the opening, the cursor over each plate,
   retrograde and back, the dome turned, a sign taken (straight on one loop, retrograde
   on the next), and the way out (the iris, and the glyph to its medallion). Move the
   cursor over it to read for yourself; the buttons beside it do the keys. */
const ZB_SETS = [
  [{ id: 'aries', mag: 1 }, { id: 'leo', mag: 2 }, { id: 'pisces', mag: 1 }],
  [{ id: 'scorpio', mag: 1 }, { id: 'libra', mag: 1 }, { id: 'capricorn', mag: 1 }],
  [{ id: 'gemini', mag: 1 }, { id: 'taurus', mag: 1 }, { id: 'aquarius', mag: 1 }],
  [{ id: 'cancer', mag: 1 }, { id: 'virgo', mag: 1 }, { id: 'sagittarius', mag: 1 }]
];
function zbDomeOpen(st) {
  const p = st.P;
  p.zs = { leo: 1, gemini: 2, virgo: 3 }; p.zShadow = ''; zbTri(p);
  st.set = 0;
  p.zRead = { offers: ZB_SETS[0].map(o => ({ ...o })), retro: false, done: false, turns: 0, took: null, msg: '' };
  st.state = 'planet'; st.credits = 420; st.left = -9;
}
function zbDomeAct(st, what, arg) {
  const r = st.P.zRead;
  if (what === 'auto') { st.auto = true; st.k = 0; zbDomeOpen(st); return; }
  if (what !== 'hover') st.auto = false;
  if (what === 'replay') { zbDomeOpen(st); return; }
  if (st.state !== 'planet' || !r) { if (what === 'leave' || what === 'replay') zbDomeOpen(st); return; }
  if (what === 'retro' && !r.done) r.retro = !r.retro;
  if (what === 'turn' && !r.done) {
    const c = 30 + r.turns * 25;
    if (st.credits < c) { r.msg = 'NOT ENOUGH CREDITS'; return; }
    st.credits -= c; r.turns++; st.set = (st.set + 1) % ZB_SETS.length;
    r.offers = ZB_SETS[st.set].map(o => ({ id: o.id, mag: (st.P.zs[o.id] | 0) + 1 }));
  }
  if (what === 'take' && !r.done) {
    const o = r.offers[arg | 0];
    if (!o) return;
    const retro = r.retro && zRetroOk(o), to = Math.min(3, o.mag + (retro ? 1 : 0));
    st.P.zs[o.id] = Math.max(st.P.zs[o.id] | 0, to);
    if (retro) st.P.zShadow = o.id;
    zbTri(st.P);
    r.done = true; r.took = { id: o.id, mag: to, retro };
  }
  if (what === 'leave') { st.state = 'play'; st.P.zRead = null; st.left = st.t; }
}
// read by hand: a click on a plate takes it, on a button does what it says; the keys once it has focus
function zbDomeClick(st, x, y) {
  st.auto = false;
  if (st.state !== 'planet') { zbDomeAct(st, 'replay'); return; }
  const sW = W, sH = H, sP = P;
  W = st.w; H = st.h; P = st.P;
  try {
    const B = planetButtons();
    const hit = b => b && x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
    for (const p of B.plates) if (hit(p)) return zbDomeAct(st, 'take', p.i);
    if (hit(B.retro)) return zbDomeAct(st, 'retro');
    if (hit(B.turn)) return zbDomeAct(st, 'turn');
    if (hit(B.leave)) return zbDomeAct(st, 'leave');
  } finally { W = sW; H = sH; P = sP; }
}
function zbDomeKey(st, k) {
  const m = { '1': ['take', 0], '2': ['take', 1], '3': ['take', 2], r: ['retro'], R: ['retro'], t: ['turn'], T: ['turn'], Escape: ['leave'], Enter: ['leave'] }[k];
  if (!m) return false;
  if (st.state !== 'planet') zbDomeAct(st, 'replay'); else zbDomeAct(st, m[0], m[1]);
  return true;
}
ZB_STAGE('dome', 1280, 720, () => {
  const st = { P: zbPilot(), auto: true, k: 0, loop: 0, act: zbDomeAct, click: zbDomeClick, key: zbDomeKey };
  zbDomeOpen(st);
  return st;
});
ZB.draw.dome = (st, dt) => {
  // the script, when nobody is driving it
  if (st.auto) {
    const k0 = st.k; st.k += dt;
    const at = t => k0 < t && st.k >= t;
    const pl = zPlates();
    const over = i => { const p = pl[i]; if (p) { st.mouse.x = p.x + p.w * 0.5; st.mouse.y = p.y + p.h * 0.62; } };
    if (st.k < 2.2) { st.mouse.x = -999; st.mouse.y = -999; }
    else if (st.k < 3.4) over(0); else if (st.k < 4.6) over(1); else if (st.k < 5.8) over(2);
    else if (st.k < 9.2) { st.mouse.x = -999; }
    else if (st.k < 12.2) over(1);
    else st.mouse.x = -999;
    mouse.x = st.mouse.x; mouse.y = st.mouse.y;
    if (at(6.0)) zbDomeAct(st, 'retro');
    if (at(8.4)) zbDomeAct(st, 'retro');
    if (at(9.4)) zbDomeAct(st, 'turn');
    if (at(11.6) && st.loop % 2) zbDomeAct(st, 'retro');
    if (at(12.6)) zbDomeAct(st, 'take', 1);
    if (at(16.0)) zbDomeAct(st, 'leave');
    if (st.k > 19.0) { st.loop++; st.k = 0; zbDomeOpen(st); }
    st.auto = true;
  }
  state = st.state; credits = st.credits;
  if (st.state === 'planet') drawPlanetarium();
  else {
    zbFloor(st, WORLD.w / 2, WORLD.h / 2, 1);
    zbHull({ x: W / 2, y: H / 2 + 40, ang: -0.5 });
    if (typeof zDrawDark === 'function') zDrawDark();
    if (typeof signTray === 'function') signTray(18, 250, 74);
  }
};

/* --------------------------------- the mounting --------------------------------- */
function zbMount(cv) {
  if (cv.__zb) return;
  const id = cv.getAttribute('data-za'), def = ZB.stages[id];
  if (!def) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(def.w * dpr); cv.height = Math.round(def.h * dpr);
  const st = Object.assign({ id, cv, g: cv.getContext('2d'), w: def.w, h: def.h, dpr, t: 0, mouse: { x: -999, y: -999, down: false },
                             keys: {}, parts: [], draw: ZB.draw[id] }, def.make());
  cv.__zb = st;
  const at = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * def.w / b.width, (e.clientY - b.top) * def.h / b.height]; };
  cv.addEventListener('mousemove', e => { [st.mouse.x, st.mouse.y] = at(e); if (st.id === 'dome') st.auto = false; });
  cv.addEventListener('mouseleave', () => { st.mouse.x = st.mouse.y = -999; });
  cv.addEventListener('mousedown', () => { st.mouse.down = true; });
  cv.addEventListener('mouseup', () => { st.mouse.down = false; });
  cv.addEventListener('click', e => { const [x, y] = at(e); if (st.click) st.click(st, x, y); });
  cv.addEventListener('keydown', e => { if (st.key && st.key(st, e.key)) e.preventDefault(); });
  if (!cv.hasAttribute('tabindex')) cv.setAttribute('tabindex', '0');
  ZB.live.push(st);
}
// each stage reads and keeps its own dome and tray state, as each machine does in a run
const ZB_ZAD0 = ZAD;
function zbZad() {
  const z = {};
  for (const k in ZB_ZAD0) { const v = ZB_ZAD0[k]; z[k] = v instanceof Map ? new Map() : Array.isArray(v) ? v.slice() : v && typeof v === 'object' ? { ...v } : v; }
  return z;
}
function zbStep(st, dt) {
  ZAD = st.zad || (st.zad = zbZad());
  ZAT = st.zat || (st.zat = { at: {}, flashAt: {} });
  ctx = st.g; W = st.w; H = st.h; DPR = st.dpr; uiTime = st.t; elapsed = st.t;
  mouse.x = st.mouse.x; mouse.y = st.mouse.y; mouse.down = st.mouse.down;
  for (const k in keys) delete keys[k];
  parts = st.parts; P = st.P || P;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  try { st.draw(st, dt); st.err = null; }
  catch (e) {
    if (!st.err) console.error('stage ' + st.id + ':', e);
    st.err = e;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0, 0, W, 22);
    ctx.fillStyle = '#fff'; ctx.font = '12px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(String(e && e.message), 8, 11);
  }
}
function zbFrame(ts) {
  const now = ts / 1000, dt = clamp(now - (ZB.last || now), 0, 0.05);
  ZB.last = now;
  const vh = window.innerHeight || 800, vw = window.innerWidth || 1200;
  for (const st of ZB.live) {
    if (!st.cv.isConnected || ZB.held) continue;
    const b = st.cv.getBoundingClientRect();
    if (!ZB.all && (b.bottom < -50 || b.top > vh + 50 || b.right < -50 || b.left > vw + 50)) continue;
    st.t += dt;
    zbStep(st, dt);
  }
  requestAnimationFrame(zbFrame);
}
function zbScan() { document.querySelectorAll('canvas[data-za]').forEach(zbMount); }
function zbStart() { zbScan(); setInterval(zbScan, 400); requestAnimationFrame(zbFrame); }
window.ZA_BOARD = {
  mount(cv) { if (cv && cv.getAttribute && cv.getAttribute('data-za')) zbMount(cv); },
  act(id, what, arg) { for (const st of ZB.live) if (st.id === id && st.act) st.act(st, what, arg); },
  // for a test: step every stage by dt, n times, whether or not it is on screen
  step(dt, n) { for (let k = 0; k < (n || 1); k++) for (const st of ZB.live) { st.t += dt; zbStep(st, dt); } },
  stepStage(id, dt) { ZB.held = true; for (const st of ZB.live) if (st.id === id) { st.t += dt; zbStep(st, dt); } },
  errors() { return ZB.live.filter(s => s.err).map(s => s.id + ': ' + (s.err && s.err.stack || s.err)); },
  stages: () => Object.keys(ZB.stages)
};
