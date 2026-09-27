/* Harness base — lifted verbatim from Hacker rite v1 (shims, the oni, the room). */
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b = 0) => b + Math.random() * (a - b);
const ease = t => t * t * (3 - 2 * t);
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const ROOT_COL = '#f0abfc', HACK_COL = '#a3e635', SU_COL = '#fde047';
const CON_MONO = "'JetBrains Mono', ui-monospace, monospace";
const CON_BAR = "700 9px Barlow, 'Segoe UI', system-ui, sans-serif";
const CON_KIND = { in: '#e2e8f0', out: '#94a3b8', ok: '#a3e635', err: '#fca5a5', root: ROOT_COL, sys: '#64748b' };
const CON_ROWS = 7;
const FXO = { parts: true };

/* ------------------------------- game shims ------------------------------- */
const cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block'; document.body.appendChild(cv);
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, uiTime = 0;
const cam = { x: 0, y: 0, z: 1 };
const toScreen = (x, y) => ({ x: (x - cam.x) * cam.z + W / 2, y: (y - cam.y) * cam.z + H / 2 });

const _glow = new Map();
function glowSprite(hex) {
  let s = _glow.get(hex); if (s) return s;
  s = document.createElement('canvas'); s.width = s.height = 128;
  const g = s.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, rgba(hex, 1)); gr.addColorStop(0.32, rgba(hex, 0.42)); gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); _glow.set(hex, s); return s;
}
function drawGlow(x, y, r, color, a = 1) {
  ctx.globalAlpha = a; ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function poly(x, y, r, sides, ang) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = ang + i * TAU / sides;
    i ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}
function fitStr(s, w) {
  if (ctx.measureText(s).width <= w) return s;
  while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
  return s + '…';
}
function hullPath() {   // the HACKER's: a splayed fork, two prongs and an open bay
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(4, 6); ctx.lineTo(10, 13); ctx.lineTo(-4, 11);
  ctx.lineTo(-9, 0); ctx.lineTo(-4, -11); ctx.lineTo(10, -13); ctx.lineTo(4, -6); ctx.closePath();
}
let parts = [];
function spawnPart(x, y, vx, vy, r, color, life, drag = 0.94) {
  if (parts.length > 900) return;
  parts.push({ x, y, vx, vy, r, color, life, max: life, drag });
}
function tickParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d;
  }
}
function drawParts() {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    drawGlow(p.x, p.y, p.r * 3, p.color, a * 0.3);
    ctx.globalAlpha = a; ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.5, p.r, p.r);   // square: pixels, not embers
  }
  ctx.restore();
}
function rootChecker() {
  if (rootChecker.tile) return rootChecker.tile;
  const S = 24, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#1a0620'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#2f0c3a'; g.fillRect(0, 0, S / 2, S / 2); g.fillRect(S / 2, S / 2, S / 2, S / 2);
  return (rootChecker.tile = c);
}


const ONI_DEEP = '#0f2a07', ONI_DARK = '#1f4a0c', ONI_MID = '#4d7c0f',
      ONI_LIT = '#84cc16', ONI_PALE = '#d9f99d', ONI_BONE = '#f7fee7';
const oni = { t: -1, ang: 0, vel: 0, lag: 0, stretch: 1, px: 0, py: 0, trail: [] };
const easeBack = t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
function oniSurge(t) {
  const raw = Math.sin(t * 3.1) * 0.5 + Math.sin(t * 7.3 + 1.3) * 0.3 + Math.sin(t * 1.37) * 0.2;
  return 0.88 + Math.pow(clamp(raw * 0.5 + 0.5, 0, 1), 2) * 0.34;
}
function oniTick() {
  let dt = oni.t < 0 ? 0 : uiTime - oni.t;
  if (oni.t < 0 || dt > 0.25) { oni.ang = P.ang; oni.vel = 0; oni.px = P.x; oni.py = P.y; dt = 0; }
  oni.t = uiTime;
  dt = Math.min(dt, 0.04);
  let d = P.ang - oni.ang;
  while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  oni.vel += (d * 120 - oni.vel * 13) * dt;
  oni.ang += oni.vel * dt;
  oni.lag = d;
  const spd = dt > 0 ? Math.hypot(P.x - oni.px, P.y - oni.py) / dt : 0;
  oni.px = P.x; oni.py = P.y;
  oni.stretch += (1 + clamp(spd * 0.002, 0, 0.45) - oni.stretch) * Math.min(1, dt * 6);
}
// phase of each part of the possession, from w
function oniPhase(w) {
  return {
    eyes: ease(clamp(w / 0.22, 0, 1)),
    horn: easeBack(clamp((w - 0.12) / 0.42, 0, 1)),
    mane: easeBack(clamp((w - 0.24) / 0.5, 0, 1)),
    tusk: easeOut(clamp((w - 0.46) / 0.34, 0, 1)),
    seal: easeOut(clamp((w - 0.62) / 0.38, 0, 1)),
    hot: 1 - w
  };
}

/* one lock of the mane: a tapered ribbon with a travelling wave in it, so it
   whips from the root out rather than wobbling as a whole */
function oniStrand(bx, by, dir, len, wid, wave, ph, upto = 1) {
  const ca = Math.cos(dir), sa = Math.sin(dir), nx = -sa, ny = ca, N = 12;
  const Lp = [], Rp = [];
  let tip = null;
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * upto, dd = u * len;
    const off = Math.sin(u * 3.4 - uiTime * 6.5 + ph) * wave * u + wave * 0.5 * u * u;
    const cx = bx + ca * dd + nx * off, cy = by + sa * dd + ny * off;
    const ww = wid * Math.pow(1 - u, 0.85) * (0.7 + 0.55 * Math.sin(Math.min(1, u * 2.2) * Math.PI * 0.5));
    Lp.push(cx + nx * ww, cy + ny * ww); Rp.push(cx - nx * ww, cy - ny * ww);
    tip = [cx, cy];
  }
  ctx.beginPath(); ctx.moveTo(Lp[0], Lp[1]);
  for (let i = 2; i < Lp.length; i += 2) ctx.lineTo(Lp[i], Lp[i + 1]);
  for (let i = Rp.length - 2; i >= 0; i -= 2) ctx.lineTo(Rp[i], Rp[i + 1]);
  ctx.closePath();
  return tip;
}
const ONI_MANE = (() => {
  const out = [];
  for (let i = 0; i < 13; i++) {                        // the outer mane
    const k = i / 12 - 0.5;
    out.push({ th: Math.PI + k * 2.3, len: 30 + 40 * (1 - Math.abs(k) * 1.7), wid: 5.4 - Math.abs(k) * 3,
               ph: i * 1.7, wave: 5 + Math.abs(k) * 5, inner: false });
  }
  for (let i = 0; i < 7; i++) {                         // and the hot locks inside it
    const k = i / 6 - 0.5;
    out.push({ th: Math.PI + k * 1.3, len: 22 + 22 * (1 - Math.abs(k) * 1.6), wid: 3.2,
               ph: i * 2.3 + 0.7, wave: 4, inner: true });
  }
  return out;
})();
function oniManePath(m, ph, surge, k) {
  const lagK = oni.lag * 1.6;
  const bx = -3 + Math.cos(m.th) * 7, by = Math.sin(m.th) * 8.5;
  const spread = m.th - Math.PI;
  const dir = Math.PI + spread * 0.72 - lagK * (0.45 + Math.abs(spread) * 0.3);
  const fl = 0.9 + Math.sin(uiTime * (4 + m.ph % 3) + m.ph) * 0.1;
  const len = m.len * k * surge * oni.stretch * fl;
  return oniStrand(bx, by, dir, len, m.wid * Math.min(1, k * 1.2), m.wave * (1 + Math.abs(lagK)), m.ph + ph);
}

function bez(p, u) {
  const v = 1 - u;
  return [v * v * v * p[0] + 3 * v * v * u * p[2] + 3 * v * u * u * p[4] + u * u * u * p[6],
          v * v * v * p[1] + 3 * v * v * u * p[3] + 3 * v * u * u * p[5] + u * u * u * p[7]];
}
/* a horn: banded bone, swept back and hooking in, drawn to k of its length */
function oniHorn(s, k, shadow) {
  if (k <= 0.01) return;
  const B = [1, s * 10, -3, s * 22, -12, s * 29, -21, s * 43];
  const N = 22, L = [], R = [], C = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * k, p = bez(B, u), q = bez(B, Math.min(1, u + 0.01));
    let tx = q[0] - p[0], ty = q[1] - p[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const ww = lerp(5.4, 0.35, Math.pow(u, 0.8));
    L.push([p[0] - ty * ww, p[1] + tx * ww]); R.push([p[0] + ty * ww, p[1] - tx * ww]); C.push([p[0], p[1], u, -ty, tx, ww]);
  }
  const shape = (from = 0) => {
    ctx.beginPath(); ctx.moveTo(L[from][0], L[from][1]);
    for (let i = from + 1; i <= N; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = N; i >= from; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
  };
  if (shadow) { shape(); ctx.fillStyle = '#000'; ctx.fill(); return; }
  shape(); ctx.fillStyle = ONI_DARK; ctx.fill();
  ctx.strokeStyle = ONI_LIT; ctx.lineWidth = 1.1; ctx.stroke();
  // bands
  for (let j = 1; j <= 6; j++) {
    const i = Math.round(j / 7 * N); if (C[i][2] > k - 0.02) continue;
    const [x, y, , nx, ny, ww] = C[i];
    ctx.strokeStyle = ONI_DEEP; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - nx * ww, y - ny * ww); ctx.lineTo(x + nx * ww, y + ny * ww); ctx.stroke();
    ctx.strokeStyle = rgba(ONI_PALE, 0.45); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x - nx * ww + 1, y - ny * ww); ctx.lineTo(x + nx * ww + 1, y + ny * ww); ctx.stroke();
  }
  // rim light on the outside of the curve
  const rim = s > 0 ? L : R;
  ctx.strokeStyle = rgba(ONI_BONE, 0.75); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(rim[1][0], rim[1][1]);
  for (let i = 2; i <= N; i++) ctx.lineTo(rim[i][0], rim[i][1]); ctx.stroke();
  // the tip, burning
  const tf = Math.round(N * 0.74);
  if (k > 0.74) { shape(tf); ctx.fillStyle = SU_COL; ctx.fill(); }
  // a light that climbs the horn to the tip, every couple of seconds
  const cu = (uiTime * 0.55 + (s > 0 ? 0 : 0.5)) % 1.6;
  if (cu < 1 && cu < k) {
    const p = bez(B, cu);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(p[0], p[1], 9, ONI_PALE, 0.55 * Math.sin(cu * Math.PI)); ctx.restore();
  }
  if (k > 0.97) {
    const p = bez(B, 1);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(p[0], p[1], 8, SU_COL, 0.28 + Math.sin(uiTime * 5 + s) * 0.08); ctx.restore();
  }
}
/* a tusk, off the corner of the maw, curling in toward the line of fire */
function oniTusk(s, k) {
  if (k <= 0.01) return;
  const B = [12, s * 3.2, 16, s * 6.8, 21, s * 6.8, 23.5, s * 4];
  const N = 12, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * k, p = bez(B, u), q = bez(B, Math.min(1, u + 0.01));
    let tx = q[0] - p[0], ty = q[1] - p[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const ww = lerp(2.3, 0.25, u);
    L.push([p[0] - ty * ww, p[1] + tx * ww]); R.push([p[0] + ty * ww, p[1] - tx * ww]);
  }
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_BONE; ctx.fill();
  ctx.strokeStyle = ONI_MID; ctx.lineWidth = 0.8; ctx.stroke();
}
/* the seal on the floor: world-fixed, turning slowly. The permission bits
   are the ring's text, and 鬼 sits at its four quarters. */
function oniSeal(x, y, k, hot) {
  if (k <= 0.01) return;
  const R = 64 * lerp(1.9, 1, k), rot = uiTime * 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = k * (0.55 + Math.sin(uiTime * 1.7) * 0.08) + hot * 0.4;
  ctx.strokeStyle = rgba(ONI_LIT, 0.45); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R - 14, 0, TAU); ctx.stroke();
  ctx.rotate(rot);
  ctx.strokeStyle = rgba(ONI_LIT, 0.35); ctx.lineWidth = 1.4;
  for (let i = 0; i < 36; i++) {
    const a = i * TAU / 36, l = i % 3 ? 3 : 6;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 14), Math.sin(a) * (R - 14));
    ctx.lineTo(Math.cos(a) * (R - 14 + l), Math.sin(a) * (R - 14 + l)); ctx.stroke();
  }
  ctx.font = '700 8px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const bits = 'rwxrwxrwx';
  for (let q = 0; q < 4; q++) {
    for (let i = 0; i < 9; i++) {
      const a = q * TAU / 4 + 0.22 + i * 0.1;
      ctx.save(); ctx.rotate(a); ctx.translate(R - 7, 0); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = rgba(ONI_PALE, 0.7); ctx.fillText(bits[i], 0, 0); ctx.restore();
    }
    const a = q * TAU / 4;
    ctx.save(); ctx.rotate(a); ctx.translate(R - 7, 0); ctx.rotate(Math.PI / 2);
    ctx.font = "700 11px 'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif";
    ctx.fillStyle = SU_COL; ctx.fillText('鬼', 0, 0);
    ctx.font = '700 8px ' + CON_MONO; ctx.restore();
  }
  ctx.restore();
}

/* ART HOOK: SUPERUSER on the hull, the under-pass (drawRiteWorld, before the
   hull). w = 0 as sudo su lands, 1 once the turn is over; then it holds. */
function drawSuperuser(w) {
  oniTick();
  const ph = oniPhase(w), x = P.x, y = P.y;
  const surge = oniSurge(uiTime) * (1 + ph.hot * 0.35);

  oniSeal(x, y, ph.seal, ph.hot * ph.seal);

  // the air around it
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, 70 + ph.hot * 150, ONI_MID, 0.28 + ph.hot * 0.4);
  drawGlow(x, y, 34, ONI_LIT, 0.16 * ph.eyes);
  ctx.restore();

  // mane shadow on the plating: sells it as a thing with height over the floor
  if (ph.mane > 0.01) {
    ctx.save(); ctx.translate(x + 5, y + 7); ctx.rotate(oni.ang);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    for (const m of ONI_MANE) if (!m.inner) { oniManePath(m, 0, surge, ph.mane); ctx.fill(); }
    ctx.restore();
  }
  // the mane, in the lagging frame
  if (ph.mane > 0.01) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(oni.ang);
    const tips = [];
    for (const m of ONI_MANE) if (!m.inner) { oniManePath(m, 0, surge, ph.mane); ctx.fillStyle = ONI_DEEP; ctx.fill(); ctx.strokeStyle = rgba(ONI_MID, 0.8); ctx.lineWidth = 0.8; ctx.stroke(); }
    for (const m of ONI_MANE) if (!m.inner) { const t = oniManePath(m, 0.6, surge * 0.82, ph.mane); ctx.fillStyle = rgba(ONI_DARK, 0.95); ctx.fill(); tips.push(t); }
    ctx.globalCompositeOperation = 'lighter';
    for (const m of ONI_MANE) if (m.inner) { oniManePath(m, 1.3, surge, ph.mane); ctx.fillStyle = rgba(ONI_LIT, 0.34 + ph.hot * 0.3); ctx.fill(); }
    for (const m of ONI_MANE) if (m.inner) {
      const s2 = { ...m, wid: m.wid * 0.35, len: m.len * 0.6 };
      oniManePath(s2, 1.3, surge, ph.mane); ctx.fillStyle = rgba(ONI_PALE, 0.5); ctx.fill();
    }
    // the tips come apart into code
    ctx.font = '700 7px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    tips.forEach((t, i) => {
      if (!t) return;
      const f = Math.floor(uiTime * 9 + i * 3);
      ctx.globalAlpha = 0.35 + hash(f + i) * 0.4;
      ctx.fillStyle = i % 4 ? ONI_LIT : SU_COL;
      ctx.fillText(hash(f * 1.3 + i) > 0.5 ? '1' : '0', t[0] - 3, t[1]);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    if (FXO.parts && Math.random() < 0.55 * ph.mane && tips.length) {
      const t = tips[(Math.random() * tips.length) | 0], ca = Math.cos(oni.ang), sa = Math.sin(oni.ang);
      spawnPart(x + ca * t[0] - sa * t[1], y + sa * t[0] + ca * t[1], rnd(20, -20) - ca * 30, rnd(20, -20) - sa * 30,
                rnd(2.2, 1), Math.random() < 0.2 ? SU_COL : ONI_LIT, rnd(0.8, 0.35), 0.93);
    }
  }

  // bone: horns and tusks ride the hull itself, no lag
  ctx.save(); ctx.translate(x + 3, y + 4); ctx.rotate(P.ang);
  ctx.globalAlpha = 0.35;
  for (const s of [-1, 1]) oniHorn(s, ph.horn, true);
  ctx.restore();
  ctx.save(); ctx.translate(x, y); ctx.rotate(P.ang);
  oniHorn(-1, ph.horn); oniHorn(1, ph.horn);
  oniTusk(-1, ph.tusk); oniTusk(1, ph.tusk);
  // the maw: breath held between the tusks
  ctx.globalCompositeOperation = 'lighter';
  const br = 0.5 + Math.sin(uiTime * 3.3) * 0.2;
  drawGlow(21, 0, 9 + br * 4, ONI_LIT, 0.3 * ph.tusk);
  drawGlow(20, 0, 4, ONI_BONE, 0.35 * ph.tusk * br);
  ctx.restore();
}

/* NEW ART HOOK: SUPERUSER, the over-pass — right after the hull. The hull
   becomes the mask: dark lacquer, a furrowed gold brow, and the eyes, which
   burn and streak. On the possession they fire an anamorphic flare. */
function drawSuperuserHull(w) {
  const ph = oniPhase(w);
  ctx.save();
  ctx.translate(P.x, P.y); ctx.rotate(P.ang);
  hullPath();
  const g = ctx.createLinearGradient(18, 0, -9, 0);
  g.addColorStop(0, rgba('#1f4a0c', 0.95 * ph.eyes)); g.addColorStop(1, rgba('#07140a', 0.95 * ph.eyes));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(ONI_LIT, ph.eyes); ctx.lineWidth = 1.7; ctx.stroke();
  // the ridge down the snout
  ctx.strokeStyle = rgba(ONI_PALE, 0.45 * ph.eyes); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(16, 0); ctx.stroke();
  // the brow, furrowed
  ctx.strokeStyle = rgba(SU_COL, 0.95 * ph.eyes); ctx.lineWidth = 1.8; ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(-3, -10); ctx.lineTo(4.5, -6.6); ctx.lineTo(9, -1.8);
  ctx.moveTo(-3, 10); ctx.lineTo(4.5, 6.6); ctx.lineTo(9, 1.8);
  ctx.stroke();
  ctx.restore();

  // eyes, in world space so they can leave a trail
  const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  const eyes = [-1, 1].map(s => ({ x: P.x + ca * 5.6 - sa * s * 4.3, y: P.y + sa * 5.6 + ca * s * 4.3, s }));
  oni.trail.push({ t: uiTime, e: eyes });
  while (oni.trail.length && uiTime - oni.trail[0].t > 0.24) oni.trail.shift();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    for (let i = 1; i < oni.trail.length; i++) {
      const a0 = oni.trail[i - 1].e[k], a1 = oni.trail[i].e[k];
      const age = (uiTime - oni.trail[i].t) / 0.24;
      ctx.globalAlpha = (1 - age) * 0.8 * ph.eyes;
      ctx.strokeStyle = age < 0.35 ? SU_COL : ONI_LIT;
      ctx.lineWidth = 2.6 * (1 - age) + 0.4;
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
    }
  }
  const pulse = 0.85 + Math.sin(uiTime * 4.2) * 0.15;
  for (const e of eyes) {
    drawGlow(e.x, e.y, (13 + ph.hot * 30) * pulse, SU_COL, (0.75 + ph.hot * 0.25) * ph.eyes);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(P.ang + e.s * 0.55);
    ctx.globalAlpha = ph.eyes;
    ctx.fillStyle = '#fefce8';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.6, 1.35, 0, 0, TAU); ctx.fill();
    // the flare, only as it wakes
    const fl = Math.sin(clamp(w / 0.5, 0, 1) * Math.PI);
    if (fl > 0.01) {
      ctx.rotate(-(P.ang + e.s * 0.55));
      const L = 26 + fl * 130;
      const gr = ctx.createLinearGradient(-L, 0, L, 0);
      gr.addColorStop(0, rgba(SU_COL, 0)); gr.addColorStop(0.5, rgba('#fefce8', 0.9 * fl)); gr.addColorStop(1, rgba(SU_COL, 0));
      ctx.fillStyle = gr; ctx.fillRect(-L, -0.9, L * 2, 1.8);
    }
    ctx.restore();
  }
  ctx.restore();
}


function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}
addEventListener('resize', resize);

let grainTile, scanTile;
function tiles() {
  grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 96;
  const g = grainTile.getContext('2d'), d = g.createImageData(96, 96);
  for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() * 2 - 1) * 42; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; }
  g.putImageData(d, 0, 0);
  scanTile = document.createElement('canvas'); scanTile.width = 1; scanTile.height = 3;
  const s = scanTile.getContext('2d'); s.fillStyle = 'rgba(0,0,0,0.2)'; s.fillRect(0, 2, 1, 1);
}

function drawRoom() {
  ctx.fillStyle = '#05060a'; ctx.fillRect(cam.x - W, cam.y - H, W * 2, H * 2);
  const G = 64, x0 = cam.x - W / 2, y0 = cam.y - H / 2;
  ctx.strokeStyle = '#0e1626'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = Math.floor(x0 / G) * G; x < x0 + W; x += G) { ctx.moveTo(x, y0); ctx.lineTo(x, y0 + H); }
  for (let y = Math.floor(y0 / G) * G; y < y0 + H; y += G) { ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y); }
  ctx.stroke();
  const m = Math.min(W, H) * 0.06;
  ctx.strokeStyle = '#1d3557'; ctx.lineWidth = 3;
  ctx.strokeRect(x0 + m, y0 + m, W - m * 2, H - m * 2);
}
function drawHull(col) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x, P.y, 36, col, 0.22);
  ctx.restore();
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang);
  hullPath(); ctx.fillStyle = rgba(col, 0.14); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(1, 0, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawBody(z) {
  const col = z.hacked ? HACK_COL : z.col;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(z.x, z.y, z.r * 2.3, col, 0.3 + (z.flash || 0) * 0.3);
  ctx.globalCompositeOperation = 'source-over';
  poly(z.x, z.y, z.r, z.sides, uiTime * 0.4 + z.x);
  ctx.fillStyle = rgba(col, 0.16); ctx.fill();
  ctx.strokeStyle = (z.flash || 0) > 0.3 ? '#ffffff' : col; ctx.lineWidth = 2; ctx.stroke();
  if (z.hacked) {
    const R = z.r + 9;
    ctx.strokeStyle = rgba(HACK_COL, 0.9); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.arc(z.x, z.y, R, -Math.PI / 2, -Math.PI / 2 + TAU * 0.7); ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const a = -uiTime * 0.75 + k * TAU / 4;
      ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(z.x + Math.cos(a) * (z.r - 1), z.y + Math.sin(a) * (z.r - 1));
      ctx.lineTo(z.x + Math.cos(a) * (R + 4), z.y + Math.sin(a) * (R + 4)); ctx.stroke();
    }
  }
  ctx.restore();
}

const P = { x: 0, y: 0, r: 14, ang: -Math.PI / 2, slowT: 0 };
// the game's names for the rite file's helpers
const rrEase = ease, rrEaseOut = easeOut, rrEaseIn = easeIn, rrHash = hash, rrBez = bez, len = Math.hypot;
