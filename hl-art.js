/* ===========================================================================
   ALL HALLOWS · ACT I — art hooks
   THE LOOK. Designed over the placeholder block, hook for hook; every hook
   keeps its contract in HALLOWS-GUIDE.txt (what it is handed, which layer it
   draws in, what it must not touch). Helpers are hlArt*, constants HL_ART_*,
   and the only thing written onto game objects is art-prefixed (e.artSeed,
   e.artT, e.artRope, e.artHeap).

   The grammar, in one paragraph: everything that belongs to the event is
   drawn upright in the 3/4 view the Outsider is already drawn in; the floors
   are baked; the room is lit by the kit's light pass and nothing else, so
   the dark stays the fog's job; every flame is additive and drawn after the
   pass, so a face or a breath always reads however dark the corner is.
   Orange is the patch and the candles. Cold (#a5f3fc) is only ever the soul
   and what is its own. Gold (#fde68a) is anything of his that you turned.
=========================================================================== */

const HL_ART_C = {
  rind: '#c2410c', rindHi: '#fb923c', rindLo: '#7c2d12', rindDeep: '#431407',
  stem: '#57432a', stemHi: '#8a6d45',
  coldRind: '#cbd5e1', coldHi: '#f1f5f9', coldLo: '#64748b', coldDeep: '#1e293b', cold: '#a5f3fc',
  flame: '#f97316', flameHi: '#fde68a', flameCore: '#fff7ed', ember: '#fdba74', hole: '#0c0503',
  vine: '#3f6212', vineHi: '#84cc16', vineLo: '#1a2e05', leaf: '#4d7c0f', leafHi: '#65a30d',
  straw: '#ca8a04', strawLo: '#854d0e', burlap: '#8a6a44', burlapLo: '#4a3620', coat: '#3b2f2a', coatLo: '#1f1815', hat: '#1c1917',
  box: '#9a6a36', boxHi: '#c08a4e', boxLo: '#5c3d1c', tape: '#d8c39a', sticker: '#fb923c', tag: '#fef3c7', price: '#9a3412',
  stone: '#161c2a', stoneHi: '#252d3e', stoneLo: '#0d1119', mortar: '#07090e',
  wax: '#e8dcc2', waxLo: '#a8977a', wood: '#3a2a1c', woodHi: '#5c4330', woodLo: '#1c140d', iron: '#475569',
  turned: '#fde68a', held: '#94a3b8', ink: '#e2e8f0', dim: '#64748b'
};
const HL_ART_FONT = "Barlow, 'Segoe UI', system-ui, sans-serif";
const HL_ART_MONO = "'JetBrains Mono', ui-monospace, monospace";
const HL_ART_SKIN_COL = { 'hl-carved': '#fb923c', 'hl-lantern': '#f59e0b', 'hl-hallows': '#ea580c', 'hl-lostsoul': '#a5f3fc' };
/* art-side clocks and smoothing; nothing the logic reads */
const HL_ART_S = { knockAt: [-9, -9, -9], openAt: -9, soulAng: -Math.PI / 2, smokeT: 0, wispT: 0, batT: 3, emberT: 0, candles: null, candleKey: '' };

/* ================================ small tools ============================== */
function hlArtEll(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); }
function hlArtRng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hlArtSeed(e) { if (e.artSeed === undefined) e.artSeed = Math.random() * 97; return e.artSeed; }
function hlArtText(t, x, y, o) {
  ctx.font = (o.w || 700) + ' ' + (o.px || 11) + 'px ' + (o.mono ? HL_ART_MONO : HL_ART_FONT);
  ctx.letterSpacing = o.ls || '0em';
  ctx.textAlign = o.al || 'left';
  ctx.fillStyle = o.col || HL_ART_C.ink;
  ctx.globalAlpha = o.a === undefined ? 1 : o.a;
  ctx.fillText(t, x, y);
  ctx.letterSpacing = '0em';
  ctx.globalAlpha = 1;
}
function hlArtWrap(text, maxW) {
  const out = []; let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
function hlArtKey(x, y, k, col, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = col; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - 9, y - 13, 18, 18, 3); ctx.stroke();
  ctx.restore();
  hlArtText(k, x, y + 0.5, { px: 10, col, a, al: 'center' });
}
/* a flame: a teardrop that leans on noise, additive */
function hlArtFlame(x, y, h, seed, a = 1, col = HL_ART_C.flame) {
  const f = hlFlicker(uiTime, seed, 0.8), hh = h * (0.75 + 0.35 * f);
  const lean = (hlNoise(uiTime * 2.3 + seed, 4) - 0.5) * h * 0.5;
  drawGlow(x, y - hh * 0.4, h * 2.6, col, 0.2 * a * f);
  ctx.globalAlpha = a * (0.7 + 0.3 * f);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - h * 0.28, y);
  ctx.quadraticCurveTo(x - h * 0.34, y - hh * 0.55, x + lean, y - hh);
  ctx.quadraticCurveTo(x + h * 0.34, y - hh * 0.55, x + h * 0.28, y);
  ctx.quadraticCurveTo(x, y + h * 0.2, x - h * 0.28, y);
  ctx.fill();
  ctx.fillStyle = HL_ART_C.flameHi;
  ctx.globalAlpha = a * 0.9 * f;
  hlArtEll(x + lean * 0.3, y - hh * 0.3, h * 0.12, hh * 0.28); ctx.fill();
  ctx.globalAlpha = 1;
}
/* the game's own starting hull, anywhere, any size */
function hlArtHull(x, y, ang, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  hullPath('runner');
  ctx.restore();
}

/* ================================== gourds ================================= */
const HL_ART_LOBES = [[-0.52, 0.5], [0.52, 0.5], [-0.24, 0.56], [0.24, 0.56], [0, 0.5]];
/* the carved face, in face units (r). eyes, nose, mouth */
const HL_ART_FACE = [
  [[-0.56, -0.02], [-0.14, -0.02], [-0.36, -0.42]],
  [[0.14, -0.02], [0.56, -0.02], [0.36, -0.42]],
  [[-0.1, 0.15], [0.1, 0.15], [0, -0.03]],
  [[-0.64, 0.2], [-0.46, 0.31], [-0.32, 0.23], [-0.17, 0.35], [0, 0.27], [0.17, 0.35], [0.32, 0.23], [0.46, 0.31], [0.64, 0.2],
   [0.5, 0.46], [0.27, 0.56], [0.2, 0.45], [0.05, 0.45], [-0.03, 0.59], [-0.25, 0.56], [-0.5, 0.46]]
];
function hlArtFacePath(fx, fy, s, sx, sy, from = 0, to = 4) {
  ctx.beginPath();
  for (let i = from; i < to; i++) {
    const P = HL_ART_FACE[i];
    ctx.moveTo(fx + P[0][0] * s * sx, fy + P[0][1] * s * sy);
    for (let k = 1; k < P.length; k++) ctx.lineTo(fx + P[k][0] * s * sx, fy + P[k][1] * s * sy);
    ctx.closePath();
  }
}
/* A pumpkin, upright, centred on (x, y). o: cold, flash, a, squash, lean,
   lid (a cut lid), rough (hatched: the rind broke), face(w, h) drawn in its
   own space before the flash. */
function hlArtPumpkin(x, y, r, o = {}) {
  const C = HL_ART_C, cold = !!o.cold, a = o.a === undefined ? 1 : o.a;
  const hi = cold ? C.coldHi : C.rindHi, mid = cold ? C.coldRind : C.rind, lo = cold ? C.coldLo : C.rindLo, deep = cold ? C.coldDeep : C.rindDeep;
  const w = r * 1.1, h = r * 0.9 * (o.squash || 1);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = a * 0.5;
  ctx.fillStyle = '#020306'; hlArtEll(0, h * 0.84, w * 0.95, h * 0.24); ctx.fill();
  ctx.globalAlpha = a;
  if (o.lean) ctx.rotate(o.lean);
  const g = ctx.createRadialGradient(-w * 0.35, -h * 0.45, r * 0.08, 0, 0, w * 1.2);
  g.addColorStop(0, hi); g.addColorStop(0.42, mid); g.addColorStop(1, lo);
  ctx.fillStyle = g;
  for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(cx * w, 0, rx * w, h); ctx.fill(); }
  ctx.strokeStyle = rgba(deep, 0.5); ctx.lineWidth = Math.max(0.8, r * 0.045);
  for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(cx * w, 0, rx * w, h); ctx.stroke(); }
  // the crown dimple and the stem
  ctx.fillStyle = rgba(deep, 0.7); hlArtEll(0, -h * 0.84, w * 0.2, h * 0.1); ctx.fill();
  if (o.lid) {
    ctx.strokeStyle = rgba(C.hole, 0.8); ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, px = (u - 0.5) * w * 0.9, py = -h * 0.62 + Math.sin(u * Math.PI) * -h * 0.14 + (i % 2 ? h * 0.07 : 0);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = cold ? '#475569' : C.stem;
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, -h * 0.82);
  ctx.quadraticCurveTo(-r * 0.1, -h * 1.12, r * 0.06, -h * 1.26);
  ctx.lineTo(r * 0.2, -h * 1.18);
  ctx.quadraticCurveTo(r * 0.06, -h * 1.06, r * 0.1, -h * 0.82);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = cold ? '#94a3b8' : C.stemHi; ctx.lineWidth = 0.8; ctx.stroke();
  if (o.rough) {
    // the rind it broke out of: a torn crown
    ctx.fillStyle = C.hole;
    ctx.beginPath();
    ctx.moveTo(-w * 0.38, -h * 0.7);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-w * 0.38 + i * w * 0.127, -h * (0.7 + (i % 2 ? 0.16 : 0.02)));
    ctx.lineTo(w * 0.38, -h * 0.62); ctx.quadraticCurveTo(0, -h * 0.5, -w * 0.38, -h * 0.62);
    ctx.fill();
  }
  if (o.face) o.face(w, h);
  if (o.flash > 0) {
    ctx.globalAlpha = a * o.flash * 0.8; ctx.fillStyle = '#ffffff';
    for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(cx * w, 0, rx * w, h); ctx.fill(); }
  }
  ctx.restore();
}
/* how far a gourd has carved itself: scratched in first, then cut through */
function hlArtCarve(g) {
  return { scratch: clamp(g / 0.4, 0, 1), cut: clamp((g - 0.4) / 0.45, 0, 1), split: clamp((g - 0.85) / 0.15, 0, 1) };
}
function hlArtGourd(e, ea) {
  const C = HL_ART_C, r = e.r, g = e.hlGrow || 0, K = hlArtCarve(g), sd = hlArtSeed(e);
  const up = HL_EASE.outBack(clamp(e.t / 0.45, 0, 1));
  const shk = K.split > 0 ? Math.sin(uiTime * 46 + sd) * K.split * r * 0.08 : 0;
  hlArtPumpkin(e.x + shk, e.y, r * up, {
    cold: e.hlCold, flash: e.flash, a: ea, squash: 0.9 + 0.1 * up, lean: (hlHash(sd) - 0.5) * 0.16,
    face: (w, h) => {
      const s = r * 0.82, fy = h * 0.06;
      // the scratches, one piece at a time
      ctx.lineWidth = Math.max(0.8, r * 0.035); ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        const k = clamp(K.scratch * 4 - i, 0, 1);
        if (k <= 0) break;
        ctx.strokeStyle = rgba(e.hlCold ? '#334155' : C.rindDeep, 0.75 * k);
        hlArtFacePath(0, fy, s, 1, 1, i, i + 1); ctx.stroke();
      }
      if (K.cut > 0) {
        ctx.fillStyle = rgba(C.hole, 0.35 + 0.6 * K.cut);
        hlArtFacePath(0, fy, s * (0.6 + 0.4 * K.cut), 1, 1); ctx.fill();
      }
      if (K.split > 0) {
        // the split: down the middle, and opening
        ctx.strokeStyle = C.hole; ctx.lineWidth = 1 + K.split * r * 0.12;
        ctx.beginPath(); ctx.moveTo(0, -h * 0.9);
        for (let i = 1; i <= 6; i++) ctx.lineTo((i % 2 ? 1 : -1) * r * 0.08, -h * 0.9 + i * h * 0.3);
        ctx.stroke();
      }
    }
  });
}
function hlArtGourdGlow(e) {
  const C = HL_ART_C, r = e.r, g = e.hlGrow || 0, K = hlArtCarve(g), sd = hlArtSeed(e);
  const col = e.hlCold ? C.cold : C.flame, f = hlFlicker(uiTime, sd, 0.7);
  const h = r * 0.9, fy = e.y + h * 0.06;
  if (e.hlCold) drawGlow(e.x, e.y, r * 3.2, C.cold, 0.1 + 0.05 * Math.sin(uiTime * 2.2 + sd));
  if (K.cut > 0) {
    ctx.globalAlpha = K.cut * (0.55 + 0.45 * f);
    ctx.fillStyle = e.hlCold ? '#e0f2fe' : C.flameHi;
    hlArtFacePath(e.x, fy, r * 0.82 * (0.6 + 0.4 * K.cut), 1, 1); ctx.fill();
    drawGlow(e.x, fy + r * 0.1, r * (1.6 + K.split), col, 0.25 * K.cut * f);
    ctx.globalAlpha = 1;
  }
  if (K.split > 0) drawGlow(e.x, e.y, r * 2.4, col, 0.2 * K.split * (0.6 + 0.4 * Math.sin(uiTime * 30)));
}

/* =================================== jack ================================== */
/* where its face is, as the body and the glow both draw it */
function hlArtJackPose(e) {
  const r = e.r, sp = Math.hypot(e.vx || 0, e.vy || 0);
  const hop = Math.abs(Math.sin(e.t * 9 + hlArtSeed(e))) * r * 0.14 * clamp(sp / 60, 0, 1);
  const a = e.state === 2 && e.hlBreathAng !== undefined ? e.hlBreathAng : e.ang;
  const lat = Math.cos(a), dep = Math.sin(a);
  const wind = e.state === 1 ? 1 - clamp(e.atkT / JACK_WIND, 0, 1) : e.state === 2 ? 1 : 0;
  const swell = 1 + wind * 0.08 + (e.state === 2 ? Math.sin(uiTime * 40) * 0.02 : 0);
  const w = r * 1.1, h = r * 0.9;
  return {
    x: e.x, y: e.y - hop, a, lat, dep, wind, swell,
    fx: lat * w * 0.34, fy: h * 0.08 + dep * h * 0.08 - (dep < 0 ? -dep * h * 0.2 : 0),
    sx: 0.58 + 0.42 * Math.sqrt(Math.max(0, 1 - lat * lat)), sy: dep < 0 ? 1 + dep * 0.5 : 1,
    vis: clamp(0.3 + 0.7 * (dep * 0.5 + 0.5) * 1.25, 0, 1), s: r * 0.8, hop
  };
}
function hlArtJack(e, ea) {
  const C = HL_ART_C, r = e.r, J = hlArtJackPose(e);
  // root legs: it walks on what it grew from
  const sp = clamp(Math.hypot(e.vx || 0, e.vy || 0) / 60, 0, 1);
  ctx.save();
  ctx.globalAlpha = ea;
  ctx.strokeStyle = C.vineLo; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.5, r * 0.12);
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1, k = i % 3;
    const ph = e.t * 14 + k * 2.1 + (side > 0 ? Math.PI : 0);
    const bx = e.x + side * r * (0.35 + k * 0.22), by = J.y + r * 0.62;
    const fx = bx + side * r * (0.35 + k * 0.1) + Math.cos(ph) * r * 0.2 * sp;
    const fy = e.y + r * 0.95 - Math.max(0, Math.sin(ph)) * r * 0.22 * sp;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + side * r * 0.3, by - r * 0.12, fx, fy); ctx.stroke();
  }
  ctx.restore();
  hlArtPumpkin(J.x, J.y, r * J.swell, {
    a: ea, flash: e.flash, lean: J.lat * 0.08, lid: !e.hlHatched, rough: e.hlHatched,
    face: () => {
      ctx.fillStyle = rgba(C.hole, 0.94 * J.vis + 0.06);
      hlArtFacePath(J.fx, J.fy, J.s, J.sx, J.sy); ctx.fill();
      ctx.strokeStyle = rgba(C.rindDeep, 0.7); ctx.lineWidth = 1; ctx.stroke();
    }
  });
}
function hlArtJackGlow(e) {
  const C = HL_ART_C, J = hlArtJackPose(e), r = e.r, sd = hlArtSeed(e);
  if (e.hlDark) return;
  const f = hlFlicker(uiTime, sd, 0.9), lv = (0.55 + 0.45 * f) * (1 + J.wind * 0.8);
  const fx = J.x + J.fx, fy = J.y + J.fy;
  ctx.save();
  drawGlow(fx, fy, r * (1.8 + J.wind), C.flame, 0.24 * lv);
  ctx.globalAlpha = clamp(J.vis * lv, 0, 1);
  ctx.fillStyle = J.wind > 0.5 ? C.flameCore : C.flameHi;
  hlArtFacePath(fx, fy, J.s * J.swell, J.sx, J.sy); ctx.fill();
  // facing away, the light still comes out of the lid
  if (J.dep < 0) drawGlow(J.x, J.y - r * 0.7, r * 1.2, C.flame, 0.2 * -J.dep * lv);
  ctx.restore();
  if (e.state >= 1) hlArtBreath(e, J);
}
/* the flame's reach: a telegraph while it winds, the breath once it goes */
function hlArtBreath(e, J) {
  const C = HL_ART_C, R = JACK_BREATH_R, A = JACK_BREATH_A, a = J.a;
  ctx.save();
  if (e.state === 1) {
    const k = J.wind;
    ctx.globalAlpha = 0.06 + 0.12 * k;
    ctx.fillStyle = C.flame;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, R * (0.4 + 0.6 * k), a - A, a + A); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.35 + 0.4 * k;
    ctx.strokeStyle = C.flame; ctx.lineWidth = 1.4; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -uiTime * 30;
    ctx.beginPath(); ctx.arc(e.x, e.y, R, a - A, a + A); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }
  const age = JACK_BREATH_T - (e.atkT || 0), on = clamp(age / 0.12, 0, 1) * clamp((e.atkT || 0) / 0.15, 0, 1);
  drawGlow(e.x + Math.cos(a) * R * 0.5, e.y + Math.sin(a) * R * 0.5, R * 0.9, C.flame, 0.28 * on);
  const N = 15, sd = hlArtSeed(e);
  for (let i = 0; i < N; i++) {
    const u = (i + 0.5) / N, da = (u - 0.5) * 2 * A * 0.92;
    const len = R * (0.62 + 0.38 * hlNoise(uiTime * 9 + i * 1.7 + sd, 3)) * (0.7 + 0.3 * on);
    const w = R * 0.1 * (1 - Math.abs(u - 0.5));
    const ang = a + da + (hlNoise(uiTime * 6 + i, 5) - 0.5) * 0.14;
    const x0 = e.x + Math.cos(a) * e.r * 0.6, y0 = e.y + Math.sin(a) * e.r * 0.6;
    const x1 = e.x + Math.cos(ang) * len, y1 = e.y + Math.sin(ang) * len;
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, rgba(C.flameCore, 0.9 * on)); gr.addColorStop(0.35, rgba(C.flameHi, 0.6 * on));
    gr.addColorStop(0.7, rgba(C.flame, 0.35 * on)); gr.addColorStop(1, rgba(C.flame, 0));
    ctx.fillStyle = gr;
    const nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + nx, (y0 + y1) / 2 + ny, x1, y1);
    ctx.quadraticCurveTo((x0 + x1) / 2 - nx, (y0 + y1) / 2 - ny, x0, y0);
    ctx.fill();
  }
  ctx.restore();
}

/* ================================== creeper ================================ */
function hlArtCreeper(e, ea) {
  const C = HL_ART_C, r = e.r, sd = hlArtSeed(e), v = e.hlVine;
  const face = v ? Math.atan2(v.y - e.y, v.x - e.x) : e.ang;
  ctx.save();
  ctx.globalAlpha = ea;
  ctx.fillStyle = 'rgba(2,3,6,0.5)'; hlArtEll(e.x, e.y + r * 0.7, r * 1.2, r * 0.32); ctx.fill();
  // tendrils, writhing
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a0 = sd + i * TAU / 7, wob = Math.sin(uiTime * 2.6 + i * 1.9 + sd);
    const L = r * (1.1 + 0.35 * hlHash(i + sd));
    const mx = e.x + Math.cos(a0 + wob * 0.4) * L * 0.6, my = e.y + Math.sin(a0 + wob * 0.4) * L * 0.4 + r * 0.2;
    const tx = e.x + Math.cos(a0 - wob * 0.5) * L, ty = e.y + Math.sin(a0 - wob * 0.5) * L * 0.62 + r * 0.25;
    ctx.strokeStyle = i % 2 ? C.vine : C.vineLo; ctx.lineWidth = r * 0.16;
    ctx.beginPath(); ctx.moveTo(e.x, e.y + r * 0.1); ctx.quadraticCurveTo(mx, my, tx, ty); ctx.stroke();
    ctx.lineWidth = r * 0.05; ctx.strokeStyle = C.vineHi;
    ctx.beginPath(); ctx.arc(tx, ty, r * 0.12, a0, a0 + 4.2); ctx.stroke();
  }
  // the pod
  const g = ctx.createRadialGradient(e.x - r * 0.3, e.y - r * 0.4, 1, e.x, e.y, r * 1.1);
  g.addColorStop(0, C.leafHi); g.addColorStop(0.5, C.vine); g.addColorStop(1, C.vineLo);
  ctx.fillStyle = g;
  hlArtEll(e.x, e.y - r * 0.05, r * 0.78, r * 0.72); ctx.fill();
  // leaves round it
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.62 + Math.sin(uiTime * 1.8 + i) * 0.06;
    ctx.save(); ctx.translate(e.x + Math.cos(a) * r * 0.55, e.y - r * 0.05 + Math.sin(a) * r * 0.5); ctx.rotate(a);
    ctx.fillStyle = i % 2 ? C.leaf : C.leafHi;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(r * 0.3, -r * 0.24, r * 0.62, 0); ctx.quadraticCurveTo(r * 0.3, r * 0.24, 0, 0); ctx.fill();
    ctx.strokeStyle = C.vineLo; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.55, 0); ctx.stroke();
    ctx.restore();
  }
  // the maw, turned to what it wants
  const open = v ? (v.st === 'held' ? 1 : 0.7) : 0.25 + 0.15 * Math.sin(uiTime * 3 + sd);
  const mx = e.x + Math.cos(face) * r * 0.3, my = e.y - r * 0.05 + Math.sin(face) * r * 0.22;
  ctx.fillStyle = C.hole; hlArtEll(mx, my, r * 0.34, r * 0.34 * open, face); ctx.fill();
  ctx.fillStyle = C.tag;
  for (let i = 0; i < 5; i++) {
    const a = face + Math.PI / 2 + (i - 2) * 0.32;
    const px = mx + Math.cos(a) * r * 0.3, py = my + Math.sin(a) * r * 0.3 * Math.max(0.35, open);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(face) * r * 0.1, py + Math.sin(face) * r * 0.1); ctx.lineTo(px + Math.cos(a + 1.3) * r * 0.06, py + Math.sin(a + 1.3) * r * 0.06); ctx.fill();
  }
  if (e.flash > 0) { ctx.globalAlpha = ea * e.flash * 0.8; ctx.fillStyle = '#ffffff'; hlArtEll(e.x, e.y - r * 0.05, r * 0.8, r * 0.74); ctx.fill(); }
  ctx.restore();
}

/* ================================= scarecrow ===============================
   Its pose is a function of e.artT, which only runs while you look away
   (hlArtTick), so it is still exactly where it was left, mid-twitch. */
function hlArtCrowPose(e) {
  const t = e.artT || 0, sd = hlArtSeed(e);
  const jerk = Math.pow(hlNoise(t * 1.6 + sd, 3), 3);
  return {
    lean: Math.sin(t * 5.3 + sd) * 0.07 + (hlNoise(t * 0.7, 8) - 0.5) * 0.12,
    head: Math.sin(t * 3.1 + sd) * 0.22 + (jerk > 0.3 ? (hlHash(Math.floor(t * 3) + sd) - 0.5) * 0.9 : 0),
    armL: Math.sin(t * 4.4 + sd) * 0.14, armR: Math.sin(t * 4.1 + sd + 2) * 0.14,
    hem: t
  };
}
function hlArtCrow(e, ea) {
  const C = HL_ART_C, r = e.r, Q = hlArtCrowPose(e), sd = hlArtSeed(e);
  const baseY = e.y + r * 0.95;
  ctx.save();
  ctx.globalAlpha = ea;
  ctx.fillStyle = 'rgba(2,3,6,0.55)'; hlArtEll(e.x, baseY, r * 0.8, r * 0.22); ctx.fill();
  ctx.translate(e.x, baseY); ctx.rotate(Q.lean);
  // the pole
  ctx.fillStyle = C.woodLo; ctx.fillRect(-r * 0.09, -r * 2.5, r * 0.18, r * 2.5);
  ctx.fillStyle = C.wood; ctx.fillRect(-r * 0.09, -r * 2.5, r * 0.07, r * 2.5);
  const shY = -r * 1.75;
  // the arms: crossbar and sleeves
  const arm = (side, rot) => {
    ctx.save(); ctx.translate(0, shY); ctx.rotate(rot * side);
    ctx.fillStyle = C.woodLo; ctx.fillRect(0, -r * 0.06, side * r * 1.4, r * 0.12);
    ctx.strokeStyle = C.coat; ctx.lineWidth = r * 0.34; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * r * 1.05, r * 0.06); ctx.stroke();
    ctx.strokeStyle = C.coatLo; ctx.lineWidth = r * 0.08;
    ctx.beginPath(); ctx.moveTo(side * r * 0.3, r * 0.12); ctx.lineTo(side * r * 1.0, r * 0.16); ctx.stroke();
    // straw out of the cuff
    ctx.lineWidth = 1.1; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i - 2.5) * 0.28 + (side < 0 ? Math.PI : 0);
      ctx.strokeStyle = i % 2 ? C.straw : C.strawLo;
      ctx.beginPath(); ctx.moveTo(side * r * 1.08, r * 0.06);
      ctx.lineTo(side * r * 1.08 + Math.cos(a) * r * (0.3 + hlHash(i + sd) * 0.2), r * 0.06 + Math.sin(a) * r * 0.3); ctx.stroke();
    }
    ctx.restore();
  };
  arm(-1, Q.armL); arm(1, Q.armR);
  // the coat, ragged at the hem
  ctx.fillStyle = C.coat;
  ctx.beginPath(); ctx.moveTo(-r * 0.5, shY - r * 0.1); ctx.lineTo(r * 0.5, shY - r * 0.1);
  ctx.lineTo(r * 0.62, -r * 0.7);
  for (let i = 0; i <= 8; i++) {
    const u = 1 - i / 8, x = (u - 0.5) * r * 1.24;
    ctx.lineTo(x, -r * 0.7 + (i % 2 ? r * 0.2 : 0) + Math.sin(Q.hem * 3 + i) * r * 0.04);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C.coatLo; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, shY); ctx.lineTo(r * 0.04, -r * 0.8); ctx.stroke();
  ctx.fillStyle = C.burlapLo; ctx.fillRect(-r * 0.38, shY + r * 0.35, r * 0.26, r * 0.22);        // a patch
  // the head: a sack, tied at the neck
  ctx.save(); ctx.translate(0, shY - r * 0.5); ctx.rotate(Q.head);
  ctx.strokeStyle = C.straw; ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) { const a = Math.PI * 0.2 + i * 0.1 * Math.PI; ctx.beginPath(); ctx.moveTo(0, r * 0.4); ctx.lineTo(Math.cos(a) * r * 0.5, r * 0.4 + Math.sin(a) * r * 0.28); ctx.stroke(); }
  const hg = ctx.createRadialGradient(-r * 0.15, -r * 0.15, 1, 0, 0, r * 0.62);
  hg.addColorStop(0, C.burlap); hg.addColorStop(1, C.burlapLo);
  ctx.fillStyle = hg; hlArtEll(0, 0, r * 0.5, r * 0.46); ctx.fill();
  ctx.fillStyle = C.burlapLo; ctx.fillRect(-r * 0.2, r * 0.36, r * 0.4, r * 0.1);
  // stitched eyes and mouth
  ctx.strokeStyle = '#1c1410'; ctx.lineWidth = 1.3;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * r * 0.24 - r * 0.07, -r * 0.1); ctx.lineTo(s * r * 0.24 + r * 0.07, r * 0.02);
    ctx.moveTo(s * r * 0.24 + r * 0.07, -r * 0.1); ctx.lineTo(s * r * 0.24 - r * 0.07, r * 0.02); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-r * 0.26, r * 0.18); ctx.quadraticCurveTo(0, r * 0.28, r * 0.26, r * 0.16); ctx.stroke();
  for (let i = 0; i < 5; i++) { const x = -r * 0.2 + i * r * 0.1; ctx.beginPath(); ctx.moveTo(x, r * 0.14); ctx.lineTo(x, r * 0.3); ctx.stroke(); }
  // the hat
  ctx.fillStyle = C.hat; hlArtEll(0, -r * 0.36, r * 0.72, r * 0.14, -0.1); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-r * 0.34, -r * 0.4); ctx.lineTo(-r * 0.2, -r * 0.92); ctx.lineTo(r * 0.16, -r * 0.98); ctx.lineTo(r * 0.34, -r * 0.42); ctx.closePath(); ctx.fill();
  ctx.fillStyle = C.strawLo; ctx.fillRect(-r * 0.32, -r * 0.54, r * 0.66, r * 0.08);
  ctx.restore();
  if (e.flash > 0) { ctx.globalAlpha = ea * e.flash * 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.6, -r * 2.8, r * 1.2, r * 2.4); }
  ctx.restore();
}
/* its eyes: lit only while it is moving */
function hlArtCrowGlow(e) {
  if (e.hlWatched) return;
  const r = e.r, Q = hlArtCrowPose(e), baseY = e.y + r * 0.95, shY = -r * 1.75;
  const hx = e.x + Math.sin(Q.lean) * -(shY - r * 0.5), hy = baseY + Math.cos(Q.lean) * (shY - r * 0.5);
  for (const s of [-1, 1]) {
    const ex = hx + Math.cos(Q.head + Q.lean) * s * r * 0.24, ey = hy - r * 0.04 + Math.sin(Q.head + Q.lean) * s * r * 0.24;
    drawGlow(ex, ey, r * 0.45, '#fbbf24', 0.55);
    ctx.fillStyle = '#fde68a'; ctx.globalAlpha = 0.9; ctx.fillRect(ex - 1, ey - 1, 2, 2); ctx.globalAlpha = 1;
  }
}

/* ================================ THE BACKLOG ==============================
   A heap that walks: sealed boxes, cases never opened, gourds he took, and a
   price on all of it. Two eyes in the gap. It grows by what it eats. */
const HL_ART_PRICES = ['4.99', '0.99', '19.99', '2.49', '9.99', '59.99', '1.00', '14.99'];
function hlArtHeapItems(e) {
  const n = e.hlHeap || 0;
  if (e.artHeap && e.artHeap.n === n && e.artHeap.r === e.r) return e.artHeap.items;
  const R = hlArtRng(0xb4c1), r = e.r, items = [];
  const box = (x, y, w, h, rot) => items.push({ k: 'box', x: x * r, y: y * r, w: w * r, h: h * r, rot, tag: R() < 0.65, p: HL_ART_PRICES[(R() * 8) | 0], v: R() });
  box(-0.66, 0.36, 0.52, 0.42, -0.08); box(-0.02, 0.44, 0.6, 0.46, 0.03); box(0.62, 0.34, 0.5, 0.42, 0.1);
  box(-0.4, -0.06, 0.52, 0.44, 0.12); box(0.34, -0.04, 0.5, 0.44, -0.09); box(-0.02, -0.44, 0.46, 0.38, 0.05);
  items.push({ k: 'case', x: -0.84 * r, y: -0.02 * r, w: 0.3 * r, h: 0.42 * r, rot: -0.4, v: R() });
  items.push({ k: 'case', x: 0.86 * r, y: 0.0 * r, w: 0.3 * r, h: 0.42 * r, rot: 0.34, v: R() });
  items.push({ k: 'case', x: 0.3 * r, y: -0.52 * r, w: 0.28 * r, h: 0.38 * r, rot: 0.5, v: R() });
  items.push({ k: 'gourd', x: -0.34 * r, y: 0.7 * r, r: 0.22 * r, v: R() });
  items.push({ k: 'gourd', x: 0.4 * r, y: 0.72 * r, r: 0.2 * r, v: R() });
  for (let i = 0; i < n; i++) {
    const j = Math.min(i, 10), side = i % 2 ? 1 : -1;
    items.push({ k: 'gourd', x: side * (0.15 + (j % 4) * 0.14) * r, y: (-0.66 - Math.floor(j / 2) * 0.1) * r, r: (0.17 + hlHash(i) * 0.05) * r, v: R() });
  }
  items.sort((a, b) => a.y - b.y);
  e.artHeap = { n, r: e.r, items };
  return items;
}
function hlArtTagShape(x, y, w, h, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-w / 2 + h * 0.4, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + h * 0.4, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath();
}
function hlArtHeapItem(it, ox, oy, sc, flash) {
  const C = HL_ART_C;
  ctx.save();
  ctx.translate(ox + it.x * sc, oy + it.y * sc);
  ctx.rotate(it.rot || 0);
  ctx.scale(sc, sc);
  if (it.k === 'box') {
    const w = it.w, h = it.h;
    const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, C.boxHi); g.addColorStop(0.5, C.box); g.addColorStop(1, C.boxLo);
    ctx.fillStyle = g; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = rgba(C.boxLo, 0.9); ctx.fillRect(-w / 2, -h / 2, w, h * 0.14);
    ctx.fillStyle = C.tape; ctx.globalAlpha = 0.85; ctx.fillRect(-w * 0.08, -h / 2, w * 0.16, h); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.boxLo; ctx.lineWidth = 1.2; ctx.strokeRect(-w / 2, -h / 2, w, h);
    if (it.tag) {
      ctx.fillStyle = C.sticker; ctx.fillRect(w * 0.12, -h * 0.05, w * 0.34, h * 0.26);
      ctx.fillStyle = '#431407'; ctx.font = '700 ' + Math.max(5, h * 0.17) + 'px ' + HL_ART_FONT; ctx.textAlign = 'center';
      ctx.fillText(it.p, w * 0.29, h * 0.14);
    }
  } else if (it.k === 'case') {
    const w = it.w, h = it.h;
    ctx.fillStyle = '#1e293b'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = it.v > 0.5 ? '#334155' : '#3f2a4d'; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h * 0.6);
    ctx.fillStyle = '#0f172a'; ctx.fillRect(-w / 2, -h / 2, w * 0.14, h);
    ctx.fillStyle = C.tag; ctx.globalAlpha = 0.9; ctx.fillRect(-w / 2 + 3, h * 0.2, w * 0.5, h * 0.12); ctx.globalAlpha = 1;   // the shrink-wrap's unbroken seal
    ctx.strokeStyle = 'rgba(226,232,240,0.25)'; ctx.lineWidth = 0.8; ctx.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
  }
  if (flash > 0 && it.k !== 'gourd') { ctx.globalAlpha = flash * 0.7; ctx.fillStyle = '#fff'; ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h); ctx.globalAlpha = 1; }
  ctx.restore();
  if (it.k === 'gourd') hlArtPumpkin(ox + it.x * sc, oy + it.y * sc, it.r * sc, { flash, lean: (it.v - 0.5) * 0.5 });
}
function hlArtBacklogPose(e) {
  const sp = clamp(Math.hypot(e.vx || 0, e.vy || 0) / 50, 0, 1), b = e.hlBinge || 0;
  return { bob: Math.abs(Math.sin(e.t * 5)) * 3 * sp, sway: Math.sin(e.t * 2.5) * 0.03 + Math.sin(uiTime * 37) * 0.012 * b, sp };
}
function hlArtBacklog(e, ea) {
  const C = HL_ART_C, r = e.r, Q = hlArtBacklogPose(e), items = hlArtHeapItems(e);
  ctx.save();
  ctx.globalAlpha = ea;
  ctx.fillStyle = 'rgba(2,3,6,0.6)'; hlArtEll(e.x, e.y + r * 0.86, r * 1.25, r * 0.28); ctx.fill();
  // feet, under it all, shuffling
  ctx.fillStyle = '#1c1410';
  for (const s of [-1, 1]) {
    const ph = e.t * 5 + (s > 0 ? Math.PI : 0);
    hlArtEll(e.x + s * r * 0.36 + Math.cos(ph) * 5 * Q.sp, e.y + r * 0.84 - Math.max(0, Math.sin(ph)) * 4 * Q.sp, r * 0.2, r * 0.1); ctx.fill();
  }
  ctx.translate(e.x, e.y - Q.bob); ctx.rotate(Q.sway);
  for (const it of items) hlArtHeapItem(it, 0, 0, 1, e.flash);
  // the gap, and whoever is in there
  ctx.fillStyle = C.hole;
  ctx.beginPath(); ctx.moveTo(-r * 0.24, r * 0.12); ctx.quadraticCurveTo(0, r * 0.0, r * 0.26, r * 0.1); ctx.quadraticCurveTo(0, r * 0.3, -r * 0.24, r * 0.12); ctx.fill();
  ctx.restore();
}
function hlArtBacklogGlow(e) {
  const r = e.r, Q = hlArtBacklogPose(e), sd = hlArtSeed(e);
  const blink = hlNoise(uiTime * 0.9 + sd, 2) > 0.86 ? 0.1 : 1, b = e.hlBinge || 0;
  const cx = e.x, cy = e.y - Q.bob + r * 0.14;
  const look = clamp(((typeof P !== 'undefined' ? P.x : cx) - cx) / 300, -1, 1) * r * 0.04;
  for (const s of [-1, 1]) {
    drawGlow(cx + s * r * 0.1 + look, cy, r * 0.22, b >= 2 ? '#f97316' : '#fde68a', 0.5);
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#fef3c7';
    hlArtEll(cx + s * r * 0.1 + look, cy, r * 0.045, r * 0.04 * blink); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* =============================== the patch's floor ========================= */
function hlArtPatchFloor(g, X, Y, w, h) {
  const R = hlArtRng(0x9a7c);
  g.fillStyle = 'rgba(22,12,7,0.9)'; g.fillRect(X, Y, w, h);
  // furrows: long rows ploughed across the field
  for (let y = Y + 30; y < Y + h; y += 46) {
    g.lineCap = 'round';
    for (const [col, lw, dy] of [['rgba(8,4,2,0.75)', 12, 0], ['rgba(58,34,18,0.55)', 3, -7], ['rgba(40,22,11,0.5)', 2, 6]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      for (let x = X; x <= X + w; x += 40) {
        const yy = y + dy + (hlNoise(x * 0.004, y * 0.1) - 0.5) * 14;
        x === X ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
  }
  // straw and leaves
  for (let i = 0; i < w * h / 900; i++) {
    const x = X + R() * w, y = Y + R() * h, a = R() * TAU, l = 3 + R() * 7;
    g.strokeStyle = R() < 0.5 ? 'rgba(133,77,14,0.45)' : 'rgba(161,98,7,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < w * h / 5200; i++) {
    const x = X + R() * w, y = Y + R() * h;
    g.fillStyle = ['#5a2e0e', '#7c3a12', '#3f2208', '#6b3a0f'][(R() * 4) | 0];
    g.globalAlpha = 0.55 + R() * 0.3;
    g.beginPath(); g.ellipse(x, y, 3 + R() * 4, 1.6 + R() * 2, R() * TAU, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  // vine runners with their leaves
  for (let i = 0; i < w * h / 90000; i++) {
    let x = X + R() * w, y = Y + R() * h, a = R() * TAU;
    g.strokeStyle = 'rgba(31,59,10,0.8)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y);
    const pts = [];
    for (let k = 0; k < 14; k++) { a += (R() - 0.5) * 0.9; x += Math.cos(a) * 18; y += Math.sin(a) * 18; g.lineTo(x, y); pts.push([x, y, a]); }
    g.stroke();
    for (const [px, py, pa] of pts) if (R() < 0.45) {
      g.save(); g.translate(px, py); g.rotate(pa + (R() < 0.5 ? 1.2 : -1.2));
      g.fillStyle = R() < 0.5 ? 'rgba(47,79,15,0.85)' : 'rgba(63,98,18,0.8)';
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(5, -6, 12, 0); g.quadraticCurveTo(5, 6, 0, 0); g.fill();
      g.restore();
    }
  }
  // old rind: what the last jacks came out of
  for (let i = 0; i < w * h / 70000; i++) {
    const x = X + R() * w, y = Y + R() * h;
    for (let k = 0; k < 3; k++) {
      g.fillStyle = k ? 'rgba(124,45,18,0.7)' : 'rgba(67,20,7,0.8)';
      g.beginPath(); g.ellipse(x + (R() - 0.5) * 22, y + (R() - 0.5) * 12, 6 + R() * 5, 2.5 + R() * 2, R() * TAU, 0, Math.PI); g.fill();
    }
  }
  // the fence round the field
  const post = (x, y) => {
    g.fillStyle = 'rgba(2,3,6,0.5)'; g.beginPath(); g.ellipse(x, y + 4, 9, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = HL_ART_C.woodLo; g.fillRect(x - 4, y - 26, 8, 30);
    g.fillStyle = HL_ART_C.woodHi; g.fillRect(x - 4, y - 26, 3, 30);
  };
  const inset = 26;
  g.strokeStyle = 'rgba(58,42,28,0.9)'; g.lineWidth = 3;
  for (const yy of [-18, -8]) { g.strokeRect(X + inset, Y + inset + yy, w - inset * 2, h - inset * 2); }
  for (let x = X + inset; x <= X + w - inset; x += 140) { post(x, Y + inset); post(x, Y + h - inset); }
  for (let y = Y + inset + 140; y < Y + h - inset; y += 140) { post(X + inset, y); post(X + w - inset, y); }
}
/* the lanterns hung on the fence: where they are, in world space */
function hlArtPatchLamps() {
  const X = arena.x0, Y = arena.y0, w = arena.x1 - arena.x0, h = arena.y1 - arena.y0, i = 26, out = [];
  for (const u of [0.18, 0.5, 0.82]) { out.push([X + w * u, Y + i - 30]); out.push([X + w * u, Y + h - i - 30]); }
  for (const v of [0.35, 0.7]) { out.push([X + i, Y + h * v - 30]); out.push([X + w - i, Y + h * v - 30]); }
  return out;
}

/* ================================ the vigil ================================ */
const HL_ART_LAND_W = [300, 250, 212, 178];
function hlArtVigilBake(g, X, Y) {
  const C = HL_ART_C, W0 = VIG_SIZE.w, H0 = VIG_SIZE.h, cx = X + W0 / 2, cy = Y + H0 / 2;
  const R = hlArtRng(0x51de);
  g.fillStyle = C.mortar; g.fillRect(X, Y, W0, H0);
  // flagstones, in courses
  for (let y = Y + 100; y < Y + H0; ) {
    const rh = 58 + R() * 26;
    for (let x = X - R() * 60; x < X + W0; ) {
      const sw = 70 + R() * 90;
      const v = R();
      g.fillStyle = hlMix('#141a27', '#1f2738', v);
      g.beginPath(); g.roundRect(x + 2, y + 2, sw - 4, rh - 4, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(x + 3, y + 3, sw - 6, 2);
      if (R() < 0.18) {
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.beginPath();
        let px = x + R() * sw, py = y + 3; g.moveTo(px, py);
        for (let k = 0; k < 4; k++) { px += (R() - 0.5) * 22; py += rh / 4; g.lineTo(px, Math.min(py, y + rh - 3)); }
        g.stroke();
      }
      x += sw;
    }
    y += rh;
  }
  // the path worn from the ladder to the stair
  const wp = g.createLinearGradient(cx, cy + 420, cx, cy - 60);
  wp.addColorStop(0, 'rgba(148,163,184,0.05)'); wp.addColorStop(1, 'rgba(148,163,184,0.02)');
  g.fillStyle = wp; g.beginPath(); g.ellipse(cx, cy + 180, 70, 260, 0, 0, TAU); g.fill();
  // the north wall, in elevation: brick courses
  const wy0 = Y, wy1 = cy - 400;
  g.fillStyle = '#0c0f17'; g.fillRect(X, wy0, W0, wy1 - wy0);
  for (let y = wy0 + 4, row = 0; y < wy1 - 4; y += 15, row++) {
    for (let x = X + (row % 2 ? -24 : 0); x < X + W0; x += 48) {
      g.fillStyle = hlMix('#161b28', '#20283a', R());
      g.fillRect(x + 1.5, y + 1.5, 45, 12);
    }
  }
  g.fillStyle = '#2a3244'; g.fillRect(X, wy0, W0, 4);
  const ws = g.createLinearGradient(0, wy1, 0, wy1 + 60);
  ws.addColorStop(0, 'rgba(0,0,0,0.6)'); ws.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = ws; g.fillRect(X, wy1, W0, 60);
  g.fillStyle = '#07090e'; g.fillRect(X, wy1 - 3, W0, 3);
  // THE WALL: one smooth panel, nothing on it yet
  g.fillStyle = '#1b2231'; g.fillRect(cx - 150, cy - 494, 300, 20);
  g.strokeStyle = '#2a3244'; g.lineWidth = 1.5; g.strokeRect(cx - 150, cy - 494, 300, 20);
  // side walls, and the south one
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? X : X + W0 - 28;
    g.fillStyle = '#0a0d14'; g.fillRect(x0, wy1, 28, H0 - (wy1 - Y));
    g.fillStyle = '#232b3b'; g.fillRect(s < 0 ? X + 26 : X + W0 - 28, wy1, 2, H0 - (wy1 - Y));
    const sh = g.createLinearGradient(s < 0 ? X + 28 : X + W0 - 28, 0, s < 0 ? X + 80 : X + W0 - 80, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(s < 0 ? X + 28 : X + W0 - 80, wy1, 52, H0 - (wy1 - Y));
  }
  g.fillStyle = '#0a0d14'; g.fillRect(X, Y + H0 - 22, W0, 22);
  g.fillStyle = '#232b3b'; g.fillRect(X, Y + H0 - 22, W0, 2);
  // the alcoves: niches cut into the side walls
  for (const o of VIG_SPOTS.alcoves) {
    const ax = cx + o.x, ay = cy + o.y, s = Math.sign(o.x), wx = s < 0 ? X + 28 : X + W0 - 28;
    g.fillStyle = '#05070b';
    g.beginPath(); g.moveTo(wx, ay - 46); g.lineTo(wx + s * 26, ay - 36); g.lineTo(wx + s * 26, ay + 36); g.lineTo(wx, ay + 46); g.closePath(); g.fill();
    g.strokeStyle = '#2a3244'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#1b2231'; g.fillRect(ax - 14, ay + 10, 28, 16);
    g.fillStyle = '#2a3244'; g.fillRect(ax - 14, ay + 10, 28, 3);
  }
  // the stair: four landings, the lowest in front
  const L = VIG_SPOTS.landings;
  const slab = (y, w, rh, top) => {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(cx - w / 2 - 4, y + rh, w + 8, 10);
    g.fillStyle = '#0e121b'; g.fillRect(cx - w / 2, y, w, rh);
    g.fillStyle = top; g.fillRect(cx - w / 2, y - 56, w, 56);
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(cx - w / 2, y - 56, w, 2);
    g.fillStyle = '#35405a'; g.fillRect(cx - w / 2, y - 1, w, 1.5);
  };
  // the short flight up to the house
  for (let k = 0; k < 2; k++) slab(cy - 372 - k * 14, 130 - k * 8, 10, '#1c2332');
  for (let i = 3; i >= 0; i--) {
    const y = cy + L[i].y + 22, w = HL_ART_LAND_W[i];
    if (i < 3) {
      const yTop = cy + L[i + 1].y + 22 + 16, yBot = y - 56;
      for (let k = 0, n = 2; k < n; k++) {
        const sy = lerp(yBot, yTop, (k + 0.5) / n);
        g.fillStyle = '#1a202e'; g.fillRect(cx - w * 0.3, sy - 8, w * 0.6, 12);
        g.fillStyle = '#0e121b'; g.fillRect(cx - w * 0.3, sy + 4, w * 0.6, 4);
      }
    }
    slab(y, w, 16, hlMix('#1d2433', '#283044', i / 3));
  }
  // wax on the floor where the candles will stand
  for (let i = 0; i < 70; i++) {
    const a = R() * TAU, rr = 90 + R() * 260;
    g.fillStyle = 'rgba(232,220,194,' + (0.03 + R() * 0.04) + ')';
    g.beginPath(); g.ellipse(cx + Math.cos(a) * rr, cy + 60 + Math.sin(a) * rr * 0.55, 3 + R() * 6, 2 + R() * 3, 0, 0, TAU); g.fill();
  }
}
/* where every candle stands: a spiral out from the foot of the stair that
   keeps off him, the stand, the path and the stair itself */
function hlArtCandles(n) {
  const c = vigPos({ x: 0, y: 0 }), key = n + ':' + Math.round(c.x) + ':' + Math.round(c.y);
  if (HL_ART_S.candleKey === key) return HL_ART_S.candles;
  const out = [], base = { x: 0, y: VIG_SPOTS.landings[0].y + 90 };
  const o = VIG_SPOTS.outsider, st = VIG_SPOTS.stand;
  for (let k = 0; out.length < n && k < 4000; k++) {
    const a = k * 2.39996, r = 70 + 14.5 * Math.sqrt(k);
    const x = base.x + Math.cos(a) * r, y = base.y + Math.sin(a) * r * 0.58;
    if (Math.abs(x) > 640 || y < -380 || y > 440) continue;
    if (Math.abs(x) < 42 && y > 0) continue;                                // the path
    if (Math.abs(x) < HL_ART_LAND_W[0] / 2 + 14 && y < 20) continue;       // the stair
    if (Math.hypot(x - o.x, (y - o.y - 20) * 1.4) < 62) continue;
    if (Math.abs(x - st.x) < 110 && y > st.y - 70 && y < st.y + 60) continue;
    if (Math.hypot(x - VIG_SPOTS.exit.x, y - VIG_SPOTS.exit.y) < 90) continue;
    const s = hlHash(k * 3.7);
    out.push({ x: c.x + x, y: c.y + y, h: 6 + s * 12, w: 2.4 + hlHash(k * 1.3) * 1.6, seed: k * 0.73, lean: (hlHash(k) - 0.5) * 0.2 });
  }
  HL_ART_S.candles = out; HL_ART_S.candleKey = key;
  return out;
}
function hlArtCandleBody(q, lit = true) {
  const C = HL_ART_C;
  ctx.fillStyle = 'rgba(232,220,194,0.18)'; hlArtEll(q.x, q.y, q.w * 2.4, q.w * 1.1); ctx.fill();
  ctx.fillStyle = C.waxLo; ctx.fillRect(q.x - q.w / 2, q.y - q.h, q.w, q.h);
  ctx.fillStyle = C.wax; ctx.fillRect(q.x - q.w / 2, q.y - q.h, q.w * 0.55, q.h);
  hlArtEll(q.x, q.y - q.h, q.w / 2, q.w * 0.22); ctx.fill();
  ctx.fillStyle = lit ? '#1c1410' : '#0b0b0b'; ctx.fillRect(q.x - 0.4, q.y - q.h - 2.4, 0.8, 2.4);
}
function hlArtSoulCandle() {
  const q = vigPos(VIG_SPOTS.landings[0]);
  return { x: q.x + 34, y: q.y + 12, h: 13, w: 3.6, seed: 77.7, lean: 0 };
}
/* the soul: stage 0 a light · 1 a hull gathering at 4% · 2 with a lantern ·
   3 whole · 4 the lantern warm · 5 gone */
function hlArtSoulState() {
  const st = hlSoulShown(), q = vigSoulPos();
  const ch = vig.change ? clamp(vig.change.t / 2.4, 0, 1) : 1;
  const bob = Math.sin(uiTime * 1.4) * 3;
  const talking = vig.talk && vig.talk.lines[vig.talk.i] && vig.talk.lines[vig.talk.i][0] === 'soul';
  return { st, x: q.x, y: q.y - 8 + bob, ch, talking, asc: !!vig.asc, near: vig.near === 'soul', ang: HL_ART_S.soulAng };
}
function hlArtSoulLantern(S) {
  // hung off the hull's port side, and always upright
  const a = S.ang + Math.PI / 2;
  return { x: S.x + Math.cos(a) * 26, y: S.y + Math.sin(a) * 26 + 10 };
}
function hlArtSoulBody(S) {
  const C = HL_ART_C;
  if (S.st >= 5) return;
  ctx.save();
  ctx.fillStyle = 'rgba(165,243,252,0.06)'; hlArtEll(S.x, S.y + 20, 34, 10); ctx.fill();
  if (S.st >= 1) {
    const f = hlHash(Math.floor(uiTime * 11) * 1.7), whole = S.st >= 3;
    const a = (whole ? 0.8 : S.st === 2 ? 0.45 + 0.4 * f : 0.18 + 0.55 * f) * S.ch;
    hlArtHull(S.x, S.y, S.ang, 1.6);
    if (whole) { ctx.fillStyle = rgba(S.st >= 4 ? '#fed7aa' : C.cold, 0.1 * S.ch); ctx.fill(); }
    ctx.strokeStyle = rgba(S.st >= 4 ? '#e0f2fe' : C.cold, a);
    if (!whole) ctx.setLineDash([2 + f * 5, 2 + (1 - f) * 4]);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (S.st >= 2) {
    const L = hlArtSoulLantern(S), warm = S.st >= 4;
    ctx.strokeStyle = rgba(C.cold, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.quadraticCurveTo((S.x + L.x) / 2, L.y - 16, L.x, L.y - 10); ctx.stroke();
    hlArtPumpkin(L.x, L.y, 7, { cold: !warm, a: S.ch, lid: true, face: () => {
      ctx.fillStyle = C.hole; hlArtFacePath(0, 1, 5.6, 1, 1); ctx.fill();
    } });
  }
  ctx.restore();
}
function hlArtSoulGlow(S) {
  const C = HL_ART_C;
  const f = hlFlicker(uiTime, 5.5, S.st >= 3 ? 0.3 : 0.8);
  if (S.st >= 5) return;
  const k = (S.near || S.talking ? 1.25 : 1) * (S.asc ? 1.5 : 1);
  if (S.st === 0) {
    drawGlow(S.x, S.y + 10, 46 * k, C.cold, 0.3 * f);
    drawGlow(S.x, S.y + 10, 12, '#e0f2fe', 0.9 * f);
  } else {
    drawGlow(S.x, S.y, 70 * k, C.cold, 0.16 * f * S.ch);
    drawGlow(S.x - Math.cos(S.ang) * 3, S.y - Math.sin(S.ang) * 3, 10, '#e0f2fe', 0.8 * f);
  }
  if (S.st >= 2) {
    const L = hlArtSoulLantern(S), warm = S.st >= 4, col = warm ? C.flame : C.cold;
    drawGlow(L.x, L.y, 26, col, 0.35 * f * S.ch);
    ctx.globalAlpha = (0.6 + 0.4 * f) * S.ch; ctx.fillStyle = warm ? C.flameHi : '#e0f2fe';
    hlArtFacePath(L.x, L.y + 1, 5.6, 1, 1); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (S.st === 1 || S.st === 2) {
    hlArtText('4%', S.x + 30, S.y - 16, { mono: true, w: 600, px: 9, col: C.cold, a: (0.35 + 0.35 * hlHash(Math.floor(uiTime * 7))) * S.ch });
  }
  if (vig.change) {
    // the gather: what it is becoming, pulled in from the room
    const t = vig.change.t, u = clamp(t / 2.4, 0, 1);
    ctx.strokeStyle = rgba(C.cold, 0.5 * (1 - u)); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(S.x, S.y, 12 + 110 * (1 - HL_EASE.out3(u)), 0, TAU); ctx.stroke();
    drawGlow(S.x, S.y, 90, C.cold, 0.35 * Math.sin(u * Math.PI));
  }
  if (vig.asc) {
    const u = clamp(vig.asc.t / HL_ASC_T, 0, 1), a = vigPos(VIG_SPOTS.landings[vig.asc.from]);
    const gr = ctx.createLinearGradient(a.x, a.y, S.x, S.y);
    gr.addColorStop(0, rgba(C.cold, 0)); gr.addColorStop(1, rgba(C.cold, 0.35 * Math.sin(u * Math.PI)));
    ctx.strokeStyle = gr; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(S.x, S.y); ctx.stroke();
  }
}
function hlArtWay(w, i) {
  const C = HL_ART_C, c = vigPos({ x: 0, y: 0 }), q = vigPos(w);
  const open = hlChapterOpen(w.ch) && !!HL_AREAS[w.area];
  const x0 = q.x - 54, x1 = q.x + 54, top = c.y - 486, bot = q.y + 30;
  const near = vig.near === 'way' && vig.nearI === i;
  ctx.save();
  // steps down from the threshold
  const wallBase = c.y - 400;
  if (bot > wallBase + 2) {
    const n = 3;
    for (let k = 0; k < n; k++) {
      const y0 = lerp(wallBase, bot, k / n), y1 = lerp(wallBase, bot, (k + 1) / n);
      ctx.fillStyle = hlMix('#1a202e', '#252d3e', k / n); ctx.fillRect(x0 - 6 - k * 6, y0, 120 + k * 12, y1 - y0);
      ctx.fillStyle = '#0e121b'; ctx.fillRect(x0 - 6 - k * 6, y1 - 4, 120 + k * 12, 4);
    }
  }
  // the opening
  const th = Math.min(bot, wallBase);
  ctx.beginPath();
  ctx.moveTo(x0, th); ctx.lineTo(x0, top + 54); ctx.arc(q.x, top + 54, 54, Math.PI, 0); ctx.lineTo(x1, th); ctx.closePath();
  if (open) {
    const g = ctx.createLinearGradient(0, top, 0, th);
    g.addColorStop(0, '#120804'); g.addColorStop(0.6, '#3a1606'); g.addColorStop(1, '#7c2d12');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    for (let k = 0; k < 6; k++) {
      const y = lerp(th - 6, top + 40, k / 6);
      ctx.fillStyle = rgba('#fb923c', 0.18 * (1 - k / 6)); ctx.fillRect(x0, y, 108, 3);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#05070b'; ctx.fill();
    // boarded
    ctx.save(); ctx.clip();
    for (let k = 0; k < 3; k++) {
      const y = top + 50 + k * 26, rot = (k - 1) * 0.08;
      ctx.save(); ctx.translate(q.x, y); ctx.rotate(rot);
      ctx.fillStyle = C.woodLo; ctx.fillRect(-64, -8, 128, 16);
      ctx.fillStyle = C.wood; ctx.fillRect(-64, -8, 128, 5);
      ctx.fillStyle = C.iron; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * 46, 0, 1.8, 0, TAU); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#2a3244'; ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = '#0d1119'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function hlArtAlcove(o, i) {
  const C = HL_ART_C, q = vigPos(o), p = HL_EVENT.prizes[i];
  const lit = p && Vigil.total >= p.at, s = Math.sign(o.x);
  const lx = q.x + s * 6, ly = q.y + 4;
  if (lit) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    hlArtHull(lx, ly - 28, -Math.PI / 2, 0.9);
    ctx.fillStyle = rgba(HL_ART_SKIN_COL[p.skin] || '#fb923c', 0.25); ctx.fill();
    ctx.strokeStyle = HL_ART_SKIN_COL[p.skin] || '#fb923c'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  hlArtPumpkin(lx, ly, 8, { lid: true, a: lit ? 1 : 0.55, face: () => { ctx.fillStyle = C.hole; hlArtFacePath(0, 1, 6.4, 1, 1); ctx.fill(); } });
}
/* the room's labels: after the light pass, so the dark never eats them */
function hlArtVigilLabels() {
  const c = vigPos({ x: 0, y: 0 });
  VIG_SPOTS.ways.forEach((w, i) => {
    const q = vigPos(w), open = hlChapterOpen(w.ch) && !!HL_AREAS[w.area], near = vig.near === 'way' && vig.nearI === i;
    hlArtText('THE ' + w.area.toUpperCase() + (open ? '' : '   ·   SHUT'), q.x, q.y + 52, { px: 9, ls: '0.28em', al: 'center', col: open ? '#fb923c' : '#64748b', a: near ? 1 : 0.7 });
  });
  VIG_SPOTS.alcoves.forEach((o, i) => {
    const q = vigPos(o), p = HL_EVENT.prizes[i]; if (!p) return;
    hlArtText(p.at + '', q.x - Math.sign(o.x) * 30, q.y + 44, { px: 9, ls: '0.2em', al: 'center', col: Vigil.total >= p.at ? '#fbbf24' : '#475569', a: 0.85 });
  });
  const st = vigPos(VIG_SPOTS.stand), ex = vigPos(VIG_SPOTS.exit);
  hlArtText('THE STAND', st.x, st.y + 50, { px: 9, ls: '0.28em', al: 'center', col: '#94a3b8', a: vig.near === 'stand' ? 0.95 : 0.5 });
  hlArtText('THE WAY BACK', ex.x, ex.y - 32, { px: 9, ls: '0.28em', al: 'center', col: '#94a3b8', a: vig.near === 'exit' ? 0.95 : 0.45 });
}
function hlArtAlcoveGlow(o, i) {
  const C = HL_ART_C, q = vigPos(o), p = HL_EVENT.prizes[i];
  if (!(p && Vigil.total >= p.at)) return;
  const s = Math.sign(o.x), lx = q.x + s * 6, ly = q.y + 4, f = hlFlicker(uiTime, i * 3.1, 0.6);
  drawGlow(lx, ly, 40, C.flame, 0.28 * f);
  ctx.globalAlpha = 0.6 + 0.4 * f; ctx.fillStyle = C.flameHi; hlArtFacePath(lx, ly + 1, 6.4, 1, 1); ctx.fill(); ctx.globalAlpha = 1;
  drawGlow(lx, ly - 28, 30, HL_ART_SKIN_COL[p.skin] || '#fb923c', 0.18);
}
function hlArtStand() {
  const C = HL_ART_C, q = vigPos(VIG_SPOTS.stand), book = typeof hlP === 'function' ? hlP() : { medals: [], equip: [] };
  ctx.save();
  ctx.fillStyle = 'rgba(2,3,6,0.5)'; hlArtEll(q.x, q.y + 26, 98, 12); ctx.fill();
  for (const s of [-1, 1]) {
    ctx.fillStyle = C.woodLo; ctx.fillRect(q.x + s * 80 - 4, q.y - 56, 8, 82);
    ctx.fillStyle = C.woodHi; ctx.fillRect(q.x + s * 80 - 4, q.y - 56, 3, 82);
    ctx.fillStyle = C.woodLo; ctx.fillRect(q.x + s * 80 - 14, q.y + 20, 28, 6);
  }
  ctx.fillStyle = C.wood; ctx.fillRect(q.x - 96, q.y - 62, 192, 10);
  ctx.fillStyle = C.woodHi; ctx.fillRect(q.x - 96, q.y - 62, 192, 2.5);
  HL_MEDALS.forEach((m, i) => {
    const hx = q.x - 66 + i * 22, hy = q.y - 52;
    ctx.strokeStyle = C.iron; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 5); ctx.arc(hx + 2.5, hy + 5, 2.5, Math.PI, 0, true); ctx.stroke();
    const own = book.medals.includes(m.id);
    if (!own) return;
    const sw = Math.sin(uiTime * 1.3 + i) * 0.05;
    const mx = hx + Math.sin(sw) * 22, my = hy + 22;
    ctx.strokeStyle = book.equip.includes(m.id) ? '#fb923c' : '#475569'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx - 2, hy + 6); ctx.lineTo(mx, my - 7); ctx.lineTo(hx + 4, hy + 6); ctx.stroke();
    hlArtMedal(m.id, mx, my, 7, book.equip.includes(m.id) ? 'worn' : 'own');
  });
  ctx.restore();
}

/* =================================== medals ================================
   One drawing, used on the stand in the room, in its panel and in the HUD. */
function hlArtMedalGlyph(id, r) {
  const C = HL_ART_C;
  ctx.fillStyle = '#1c1410'; ctx.strokeStyle = '#1c1410'; ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (id === 'gourd') {
    for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(cx * r * 0.62, r * 0.08, rx * r * 0.62, r * 0.46); ctx.fill(); }
    ctx.fillRect(-r * 0.05, -r * 0.55, r * 0.12, r * 0.18);
  } else if (id === 'oneday') {
    // an hourglass: put aside, paid later
    ctx.beginPath(); ctx.moveTo(-r * 0.42, -r * 0.55); ctx.lineTo(r * 0.42, -r * 0.55); ctx.lineTo(r * 0.06, 0); ctx.lineTo(r * 0.42, r * 0.55); ctx.lineTo(-r * 0.42, r * 0.55); ctx.lineTo(-r * 0.06, 0); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.5); ctx.lineTo(r * 0.3, r * 0.5); ctx.lineTo(0, r * 0.18); ctx.closePath(); ctx.fill();
  } else if (id === 'sheet') {
    ctx.beginPath(); ctx.moveTo(-r * 0.4, r * 0.5); ctx.lineTo(-r * 0.4, -r * 0.1); ctx.arc(0, -r * 0.1, r * 0.4, Math.PI, 0); ctx.lineTo(r * 0.4, r * 0.5);
    for (let i = 0; i < 4; i++) ctx.lineTo(r * 0.4 - (i + 0.5) * r * 0.2, r * (i % 2 ? 0.5 : 0.34));
    ctx.closePath(); ctx.fill();
  } else if (id === 'stillhere') {
    ctx.beginPath(); ctx.roundRect(-r * 0.5, -r * 0.42, r, r * 0.66, r * 0.16); ctx.moveTo(-r * 0.2, r * 0.24); ctx.lineTo(-r * 0.3, r * 0.52); ctx.lineTo(r * 0.05, r * 0.24); ctx.fill();
  } else if (id === 'grave') {
    ctx.beginPath(); ctx.moveTo(-r * 0.34, r * 0.5); ctx.lineTo(-r * 0.34, -r * 0.14); ctx.arc(0, -r * 0.14, r * 0.34, Math.PI, 0); ctx.lineTo(r * 0.34, r * 0.5); ctx.closePath(); ctx.fill();
  } else if (id === 'lag') {
    for (let i = 0; i < 4; i++) ctx.fillRect(-r * 0.46 + i * r * 0.25, r * 0.45 - (i + 1) * r * 0.22, r * 0.16, (i + 1) * r * 0.22);
  } else {
    ctx.beginPath(); ctx.roundRect(-r * 0.3, -r * 0.34, r * 0.6, r * 0.74, r * 0.1); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -r * 0.42, r * 0.18, Math.PI, 0); ctx.stroke();
  }
}
/* state: 'worn' | 'own' | 'unknown' */
function hlArtMedal(id, x, y, r, state) {
  const C = HL_ART_C;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'unknown') {
    ctx.fillStyle = '#0d1119'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    if (r >= 9) hlArtText('?', x, y + r * 0.35, { px: Math.round(r * 0.9), col: '#334155', al: 'center' });
    return;
  }
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, state === 'worn' ? '#fde68a' : '#cbd5e1'); g.addColorStop(0.55, state === 'worn' ? '#f59e0b' : '#94a3b8'); g.addColorStop(1, state === 'worn' ? '#9a3412' : '#475569');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = state === 'worn' ? '#7c2d12' : '#334155'; ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.85; hlArtMedalGlyph(id, r * 0.8);
  ctx.restore();
}

/* ================================ THE HATCH ================================ */
function hlArtHatchHole(r) { return { x: r.x + 22, y: r.y + 18, w: r.w - 44, h: r.h - 40 }; }

/* ================================ PORTRAITS ================================
   The subtitle's left edge, when the kit asks (hlSayDraw calls this if it is
   there). Him: the same line figure, close, lit by his own cold. It: what the
   soul is right now, in a frame that holds as still as its voice does — at
   the start it tears like a paused frame. Returns the room it took. */
const HL_ART_PORT = 66;
function hlSayPortrait(line, x, y, o) {
  const C = HL_ART_C, S = HL_ART_PORT, who = line.who;
  if (who !== 'outsider' && who !== 'soul') return 0;
  const k = o.fade === undefined ? 1 : o.fade, un = who === 'soul' ? 1 - (o.steady || 0) : 0;
  const bx = x, by = y - 46 + (46 + 12 - S) / 2 - 4;
  const col = who === 'soul' ? (typeof hlSoulShown === 'function' && hlSoulShown() >= 4 ? '#fdba74' : C.cold) : COLD_COL;
  const talk = o.typing ? 0.5 + 0.5 * hlNoise(uiTime * 9, 3) : 0;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(6,8,13,0.92)'; ctx.fillRect(bx, by, S, S);
  ctx.save();
  ctx.beginPath(); ctx.rect(bx + 1, by + 1, S - 2, S - 2); ctx.clip();
  const cx = bx + S / 2;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(cx, by + S * 0.45, S * 0.9, col, (0.1 + 0.05 * talk) * k);
  ctx.globalCompositeOperation = 'source-over';
  if (who === 'outsider') {
    const s = 58;
    outsiderFigure(cx, by + 26 + 0.56 * s, s, { pose: 'idle', a: k, noShadow: true, glow: 0.6, ph: 0.6, look: Math.sin(uiTime * 0.3) * 0.3 });
  } else {
    const st = typeof hlSoulShown === 'function' ? hlSoulShown() : 0, f = hlFlicker(uiTime, 5.5, st >= 3 ? 0.3 : 0.8);
    const sx = cx, sy = by + S * 0.52;
    if (st === 0) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(sx, sy, 20 + 8 * talk, C.cold, 0.45 * f * k);
      drawGlow(sx, sy, 6, '#e0f2fe', 0.9 * f * k);
    } else {
      const whole = st >= 3, fl = hlHash(Math.floor(uiTime * 11) * 1.7);
      hlArtHull(sx, sy + 2, -Math.PI / 2, 1.75);
      if (whole) { ctx.fillStyle = rgba(st >= 4 ? '#fed7aa' : C.cold, 0.1 * k); ctx.fill(); }
      ctx.strokeStyle = rgba(st >= 4 ? '#e0f2fe' : C.cold, (whole ? 0.85 : st === 2 ? 0.5 + 0.35 * fl : 0.2 + 0.55 * fl) * k);
      ctx.lineWidth = 1.4;
      if (!whole) ctx.setLineDash([2 + fl * 5, 2 + (1 - fl) * 4]);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(sx, sy + 4, 9 + 6 * talk, '#e0f2fe', 0.7 * f * k);
      if (st >= 2) {
        const warm = st >= 4, lx = sx + 19, ly = sy + 14;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = rgba(C.cold, 0.4 * k); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx + 9, sy + 4); ctx.lineTo(lx, ly - 7); ctx.stroke();
        hlArtPumpkin(lx, ly, 6, { cold: !warm, a: k, lid: true });
        ctx.globalCompositeOperation = 'lighter';
        drawGlow(lx, ly, 14, warm ? C.flame : C.cold, 0.4 * f * k);
        ctx.globalAlpha = k * (0.6 + 0.4 * f); ctx.fillStyle = warm ? C.flameHi : '#e0f2fe';
        hlArtFacePath(lx, ly + 1, 4.8, 1, 1); ctx.fill(); ctx.globalAlpha = k;
      }
      if (st <= 2) hlArtText('4%', bx + S - 5, by + S - 6, { mono: true, w: 600, px: 8, al: 'right', col: C.cold, a: (0.35 + 0.35 * hlHash(Math.floor(uiTime * 7))) * k });
    }
    ctx.globalCompositeOperation = 'source-over';
    // the paused frame: slices of it slip sideways, less as it comes back
    if (un > 0.05) {
      for (let i = 0; i < 3; i++) {
        const g = hlNoise(uiTime * 2.2 + i * 7.1, 21 + i);
        if (g < 1 - un * 0.55) continue;
        const yy = by + hlHash(Math.floor(uiTime * 6) + i * 3) * (S - 8), hh = 2 + hlHash(i + Math.floor(uiTime * 6)) * 5;
        const dx = (hlHash(Math.floor(uiTime * 13) + i) - 0.5) * 10 * un;
        ctx.drawImage(ctx.canvas, (bx) * (typeof DPR === 'number' ? DPR : 1), yy * (typeof DPR === 'number' ? DPR : 1), S * (typeof DPR === 'number' ? DPR : 1), hh * (typeof DPR === 'number' ? DPR : 1), bx + dx, yy, S, hh);
        ctx.fillStyle = rgba(C.cold, 0.12 * un * k); ctx.fillRect(bx, yy, S, 1);
      }
    }
  }
  ctx.restore();
  // the frame: a hairline and four corner ticks, in the voice's colour
  const jx = un ? (hlNoise(uiTime * 3, 30) - 0.5) * 1.6 * un : 0;
  ctx.strokeStyle = rgba(col, 0.28 * k); ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5 + jx, by + 0.5, S - 1, S - 1);
  ctx.strokeStyle = rgba(col, (0.7 + 0.3 * talk) * k); ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [ax, ay, dx, dy] of [[bx, by, 1, 1], [bx + S, by, -1, 1], [bx, by + S, 1, -1], [bx + S, by + S, -1, -1]]) {
    ctx.moveTo(ax + jx, ay + dy * 8); ctx.lineTo(ax + jx, ay); ctx.lineTo(ax + jx + dx * 8, ay);
  }
  ctx.stroke();
  ctx.restore();
  return S + 20;
}

/* ============================================================================
   HOOKS
============================================================================ */

/* ---- effect hooks ---- */
function hlQuestDoneFx(q) {
  Audio_.levelup();
  if (typeof P !== 'undefined') { hlEmit('ember', P.x, P.y, 26, { spread: 14, col: '#fdba74' }); ringFx(P.x, P.y, 16, 120, '#fb923c', 0.7, 2); }
}
function hlRipenFx(e) { ringFx(e.x, e.y, e.r, e.r * 2.2, '#fb923c', 0.4, 3); hlEmit('ember', e.x, e.y - e.r, 10, { spread: e.r * 0.6 }); }
function hlBankPaidFx(v) {
  floatText(P.x, P.y - 60, 'ONE DAY  +' + Math.round(v) + ' XP', '#fde68a', 16);
  ringFx(P.x, P.y, 20, 150, '#fde68a', 0.8, 2);
}
function hlPrizeFx(p) { banner('THE VIGIL   ·   A PRIZE', '#fb923c', 3.6); }
function hlKnockFx(i) {
  Audio_.tone(70 - i * 6, 0.22, 'sine', 0.14, 40);
  HL_ART_S.knockAt[i] = uiTime;
  const h = hlArtHatchHole(hlHatchRect());
  hlEmit('clod', h.x + h.w / 2, h.y + h.h / 2, 8 + i * 4, { spread: h.w * 0.4, col: '#57534e', speed: 0.5, size: 0.7 });
  hlEmit('smoke', h.x + h.w / 2, h.y + h.h / 2, 2 + i, { spread: h.w * 0.35, col: '#78716c', a: 0.07, size: 0.6 });
}
function hlHatchOpenFx() {
  Audio_.boom();
  HL_ART_S.openAt = uiTime;
  const h = hlArtHatchHole(hlHatchRect());
  hlEmit('ember', h.x + h.w / 2, h.y + h.h / 2, 22, { spread: h.w * 0.35, vy: -30 });
  hlEmit('smoke', h.x + h.w / 2, h.y, 6, { spread: h.w * 0.45, col: '#a8a29e', a: 0.08, size: 0.8, speed: 1.6 });
}
function hlVigilEnterFx() {
  hlPartsClear();
  const q = vigPos(VIG_SPOTS.exit);
  hlEmit('mote', q.x, q.y, 30, { spread: 70, col: '#cbd5e1' });
}
/* once a frame, wherever the event is on screen */
function hlArtTick(dt, scene) {
  if (dt <= 0) return;
  if (scene === 'menu') {
    HL_ART_S.emberT -= dt;
    if (HL_ART_S.emberT <= 0 && (!HL.pro || HL.pro.v('open') > 0.5)) {
      HL_ART_S.emberT = rnd(0.5, 0.18);
      const h = hlArtHatchHole(hlHatchRect());
      hlEmit('ember', h.x + rnd(h.w), h.y + h.h * 0.6, 1, { vy: -10, life: 1.4, size: 0.8 });
    }
    return;
  }
  if (scene === 'vigil') {
    // the soul turns to you while it speaks, and back to the stair after
    const S = hlArtSoulState();
    let want = -Math.PI / 2;
    if (S.talking) want = Math.atan2(P.y - S.y, P.x - S.x);
    let d = want - HL_ART_S.soulAng; d = Math.atan2(Math.sin(d), Math.cos(d));
    HL_ART_S.soulAng += d * (1 - Math.exp(-dt * 3));
    const cs = hlArtCandles(Math.min(260, Math.floor(Vigil.shown() / 10)));
    HL_ART_S.smokeT -= dt;
    if (cs.length && HL_ART_S.smokeT <= 0) {
      HL_ART_S.smokeT = 0.5 / Math.sqrt(cs.length);
      const q = cs[(Math.random() * cs.length) | 0];
      hlEmit('smoke', q.x, q.y - q.h - 8, 1, { a: 0.08, size: 0.6, col: '#94a3b8' });
    }
    HL_ART_S.wispT -= dt;
    if (S.st < 5 && HL_ART_S.wispT <= 0) {
      HL_ART_S.wispT = S.asc ? 0.03 : S.st === 0 ? 0.35 : 0.2;
      hlEmit('wisp', S.x + rnd(-10, 10), S.y + (S.st ? 0 : 10), 1, { size: S.st ? 0.9 : 0.6 });
    }
    if (Math.random() < dt * 3) { const q = vigPos(VIG_SPOTS.exit); hlEmit('mote', q.x + rnd(-70, 70), q.y + rnd(-50, 40), 1, { col: '#cbd5e1' }); }
    return;
  }
  // an area
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.type === 'scarecrow' && !e.hlWatched) e.artT = (e.artT || 0) + dt;
    if (e.type === 'creeper') {
      const v = e.hlVine;
      if (!v) { e.artRope = null; continue; }
      const d = Math.hypot(v.x - e.x, v.y - e.y), n = 14;
      if (!e.artRope) e.artRope = hlRope(e.x, e.y, n, Math.max(4, d / (n - 1)), { gy: 0, damp: 0.92, pinTail: true, ang: Math.atan2(v.y - e.y, v.x - e.x), iters: 6 });
      const R = e.artRope;
      hlVPin(R, 0, e.x, e.y); hlVPin(R, R.p.length - 1, v.x, v.y);
      const seg = Math.max(3, d / (n - 1)) * (v.st === 'held' ? 0.985 : v.st === 'back' ? 1.12 : 1.06);
      for (const c of R.c) c.rest = seg;
      const sd = hlArtSeed(e);
      hlVStep(R, dt, (x, y) => [(hlNoise(uiTime * 1.5 + y * 0.01 + sd, 1) - 0.5) * 700, (hlNoise(uiTime * 1.5 + x * 0.01 + sd, 2) - 0.5) * 700]);
    }
    if (e.type === 'jack' && !e.hlDark && Math.random() < dt * (e.state === 2 ? 30 : 1.4)) {
      const J = hlArtJackPose(e);
      if (e.state === 2) hlEmit('ember', e.x + Math.cos(J.a) * rnd(20, JACK_BREATH_R), e.y + Math.sin(J.a) * rnd(20, JACK_BREATH_R), 1, { vx: Math.cos(J.a) * 60, vy: Math.sin(J.a) * 60 });
      else hlEmit('ember', J.x, J.y - e.r * 0.8, 1, { size: 0.7 });
    }
  }
  HL_ART_S.batT -= dt;
  if (HL_ART_S.batT <= 0) {
    HL_ART_S.batT = rnd(9, 4);
    const fromL = Math.random() < 0.5, y = lerp(arena.y0, arena.y1, rnd(0.8, 0.2));
    hlEmit('bat', fromL ? cam.x - W / 2 / camZoom - 20 : cam.x + W / 2 / camZoom + 20, y, rndi(5, 2), { ang: fromL ? 0 : Math.PI, spread: 30, life: 8 });
  }
}
function hlSoulChangeFx(stage) {
  const s = vigSoulPos();
  ringFx(s.x, s.y, 8, 90, '#a5f3fc', 0.6, 3);
  for (let i = 0; i < 28; i++) {
    const a = i * TAU / 28, d = 120;
    hlEmit('wisp', s.x + Math.cos(a) * d, s.y + Math.sin(a) * d, 1, { vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60 + 20, life: 1.4 });
  }
}
function hlAscendFx(n) {
  Audio_.levelup();
  const s = vigSoulPos();
  hlEmit('wisp', s.x, s.y, 30, { spread: 20, vy: -30 });
}
function hlAreaEnterFx(A) {
  HL_ART_S.batT = 0.6;
  hlEmit('bat', cam.x - W / 2 / camZoom - 30, cam.y - 120, 7, { ang: 0.2, spread: 60, life: 9 });
}
function hlAreaEndFx(why) { if (why === 'win') hlEmit('ember', P.x, P.y, 30, { spread: 30 }); }
function hlBossDeathFx(e) {
  burst(e.x, e.y, 60, e.col, 420, 4, 0.9);
  hlEmit('clod', e.x, e.y, 30, { spread: e.r * 0.6, col: '#9a6a36', speed: 1.6, size: 1.6 });
  hlEmit('smoke', e.x, e.y, 20, { spread: e.r * 0.8, col: '#78716c', a: 0.25, size: 3, speed: 0.6 });
}
function hlColdSproutFx(g) {
  ringFx(g.x, g.y, 6, 70, '#a5f3fc', 0.5, 3);
  hlEmit('clod', g.x, g.y, 12, { col: '#3f2208', speed: 0.8 });
  hlEmit('wisp', g.x, g.y, 10, { spread: g.r });
}
function hlColdLostFx(e) { burst(e.x, e.y, 16, '#a5f3fc', 160, 2.4, 0.5); hlEmit('wisp', e.x, e.y, 16, { spread: e.r, vy: -50 }); }
function hlColdBreakFx(e, n, need) {
  burst(e.x, e.y, 24, '#a5f3fc', 240, 3, 0.6); Audio_.gem();
  hlEmit('clod', e.x, e.y, 16, { col: '#cbd5e1', speed: 1.3, size: 1.4 });
  hlEmit('wisp', e.x, e.y, 22, { spread: e.r, vy: -60, life: 1.6 });
  ringFx(e.x, e.y, e.r, e.r * 3.4, '#e0f2fe', 0.7, 2);
}
function hlGourdSplitFx(e, j) {
  burst(e.x, e.y, 14, '#fb923c', 200, 3, 0.4);
  hlEmit('clod', e.x, e.y, 16, { col: '#c2410c', speed: 1.2, size: 1.5 });
  hlEmit('clod', e.x, e.y, 8, { col: '#fef3c7', speed: 1, size: 0.7 });
}
function hlJackWindFx(e) { hlEmit('ember', e.x, e.y, 8, { spread: e.r * 1.6, vy: 20, life: 0.5 }); }
function hlJackBreathFx(e) { const a = e.hlBreathAng === undefined ? e.ang : e.hlBreathAng; hlEmit('ember', e.x, e.y, 14, { vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 0.6 }); }
function hlJackSeedFx(e) { hlEmit('smoke', e.x, e.y - e.r * 0.4, 2, { a: 0.12, col: '#a8a29e' }); }
function hlJackSnuffFx(e) {
  burst(e.x, e.y, 8, '#fde68a', 120, 2, 0.3);
  hlEmit('smoke', e.x, e.y - e.r * 0.6, 8, { a: 0.22, col: '#a8a29e', size: 1.4, life: 1.6 });
}
function hlVineThrowFx(e) { hlEmit('clod', e.x, e.y, 5, { col: '#4d7c0f', speed: 0.6, size: 0.8 }); }
function hlVineLatchFx(e) {
  Audio_.tone(180, 0.1, 'square', 0.05, 120);
  if (e.hlVine) ringFx(e.hlVine.x, e.hlVine.y, 4, 30, '#84cc16', 0.3, 2);
}
function hlVineCutFx(e, v) {
  burst(v.x, v.y, 8, '#4ade80', 160, 2, 0.3);
  hlEmit('clod', v.x, v.y, 10, { col: '#4d7c0f', speed: 0.9, size: 1 });
  e.artRope = null;
}
function hlCrowFreezeFx(e) { hlEmit('clod', e.x, e.y - e.r, 4, { col: '#ca8a04', speed: 0.3, size: 0.6 }); }
function hlCrowMoveFx(e) { hlEmit('clod', e.x, e.y - e.r * 1.6, 3, { col: '#a16207', speed: 0.4, size: 0.5 }); }
function hlBacklogEatFx(e, g) {
  burst(g.x, g.y, 12, '#fb923c', 180, 2.6, 0.4);
  hlEmit('clod', g.x, g.y, 10, { col: '#c2410c', speed: 0.9 });
}
function hlBingeFx(e, n) {
  shake(1.2); Audio_.boom();
  hlEmit('clod', e.x, e.y - e.r * 0.5, 24, { col: '#fb923c', speed: 1.6, size: 1.2 });
  ringFx(e.x, e.y, e.r, e.r * 4, '#fde68a', 0.6, 3);
}
function hlPieceStartFx(p) {}
function hlPieceHoldFx(p) { ringFx(p.x, p.y, 4, 26, '#94a3b8', 0.35, 1.5); }
function hlPieceResumeFx(p, byBinge) {
  Audio_.tone(520, 0.06, 'square', 0.05, 780);
  ringFx(p.x, p.y, 4, 34, p.turned ? '#fde68a' : '#fb923c', 0.3, 2);
}
function hlPieceEndFx(p) {}
function hlTurnHitFx(p, x, y) { burst(x, y, 10, '#fde68a', 220, 2.6, 0.3); ringFx(x, y, 6, 50, '#fde68a', 0.35, 2); }
function hlSlamLandFx(p) {
  ringFx(p.x, p.y, p.r * 0.3, p.r, p.turned ? '#fde68a' : '#fb923c', 0.4, 5); Audio_.boom();
  hlEmit('clod', p.x, p.y, 16, { spread: p.r * 0.5, col: '#3f2208', speed: 1.1 });
  hlEmit('smoke', p.x, p.y, 8, { spread: p.r * 0.6, col: '#78716c', a: 0.2, size: 2.4, speed: 0.4 });
}
function hlBarkFx(e, text) {}

/* ---- the world ---- */
function hlLights(scene) {
  if (scene === 'vigil') {
    const n = Math.min(260, Math.floor(Vigil.shown() / 10)), cs = hlArtCandles(n);
    // the room brightens as it fills: the ambient rises with the count
    hlLightBegin('#0a0d17', 1.5 + Math.min(1.4, n / 110));
    // the candles, gathered into pools
    const cells = new Map();
    for (const q of cs) {
      const k = Math.floor(q.x / 170) + ':' + Math.floor(q.y / 120);
      let c = cells.get(k); if (!c) cells.set(k, c = { x: 0, y: 0, n: 0, s: 0 });
      c.x += q.x; c.y += q.y; c.n++; c.s += q.seed;
    }
    for (const c of cells.values()) {
      hlLight({ x: c.x / c.n, y: c.y / c.n - 8, r: 130 + 30 * Math.sqrt(c.n), col: '#fb923c', a: Math.min(1, 0.35 + 0.1 * Math.sqrt(c.n)),
                flick: 0.55, seed: c.s, z: 22, size: 6 + Math.sqrt(c.n) * 2 });
    }
    const S = hlArtSoulState();
    if (S.st < 5) hlLight({ x: S.x, y: S.y, r: 190 + 26 * S.st, col: S.st >= 4 ? '#fed7aa' : '#a5f3fc', a: 0.75 + (S.asc ? 0.4 : 0), flick: S.st >= 3 ? 0.2 : 0.7, seed: 5.5, z: 26, size: 4 });
    if (S.st >= 2) { const L = hlArtSoulLantern(S); hlLight({ x: L.x, y: L.y, r: 120, col: S.st >= 4 ? '#f97316' : '#a5f3fc', a: 0.6, flick: 0.8, seed: 6.1, z: 14, shadow: false }); }
    if (S.st >= 5) { const q = hlArtSoulCandle(); hlLight({ x: q.x, y: q.y - 12, r: 170, col: '#fbbf24', a: 0.9, flick: 0.8, seed: 9, z: 20 }); }
    hlLight({ x: vigPos({ x: 0, y: 0 }).x, y: vigPos({ x: 0, y: -380 }).y, r: 760, col: '#64748b', a: 0.35, shadow: false });
    // the way back: the menu's cold light, straight down through the hatch
    const ex = vigPos(VIG_SPOTS.exit);
    hlLight({ x: ex.x, y: ex.y + 10, r: 300, col: '#94a3b8', a: 0.7, z: 500, size: 30 });
    // an open way up spills its own light down the steps
    VIG_SPOTS.ways.forEach(w => {
      if (!(hlChapterOpen(w.ch) && HL_AREAS[w.area])) return;
      const q = vigPos(w);
      hlLight({ x: q.x, y: q.y - 20, r: 420, col: '#fb923c', a: 0.95, z: 90, flick: 0.25, seed: 2.2, cone: { ang: Math.PI / 2, spread: 0.5, soft: 0.5 } });
    });
    VIG_SPOTS.alcoves.forEach((o, i) => {
      const p = HL_EVENT.prizes[i]; if (!(p && Vigil.total >= p.at)) return;
      const q = vigPos(o);
      hlLight({ x: q.x, y: q.y, r: 170, col: '#fbbf24', a: 0.8, flick: 0.6, seed: i * 3.1, z: 30 });
    });
    // what stands in it
    const o = vigPos(VIG_SPOTS.outsider);
    hlOccCircle(o.x, o.y + 28, 9, 70);
    const st = vigPos(VIG_SPOTS.stand);
    hlOccSeg(st.x - 96, st.y - 20, st.x + 96, st.y - 20, 50);
    hlOccCircle(P.x, P.y, 11, 12);
    return true;
  }
  // THE PATCH: a low orange light across the field, and lanterns on the fence
  hlLightBegin('#2b1d18', 1);
  const cx = (arena.x0 + arena.x1) / 2;
  hlLight({ x: cx - 500, y: arena.y0 - 500, r: 2800, col: '#c2410c', a: 0.62, z: 260, size: 60 });
  hlLight({ x: P.x, y: P.y, r: 320, col: '#fed7aa', a: 0.42, shadow: false });
  hlArtPatchLamps().forEach(([x, y], i) => hlLight({ x, y: y - 8, r: 260, col: '#fb923c', a: 0.85, flick: 0.6, seed: i * 1.9, z: 40, size: 5 }));
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.type === 'jack') {
      hlOccCircle(e.x, e.y, e.r * 0.85, 26);
      if (!e.hlDark) {
        const J = hlArtJackPose(e);
        hlLight({ x: e.x + J.fx, y: e.y + J.fy, r: 170 + J.wind * 60, col: '#f97316', a: 0.85 + J.wind * 0.4, flick: 0.9, seed: hlArtSeed(e), z: 22, shadow: false });
        if (e.state === 2) hlLight({ x: e.x + Math.cos(J.a) * JACK_BREATH_R * 0.55, y: e.y + Math.sin(J.a) * JACK_BREATH_R * 0.55, r: 200, col: '#fb923c', a: 0.75, flick: 1, seed: hlArtSeed(e) + 1, shadow: false });
      }
    } else if (e.type === 'gourd') {
      hlOccCircle(e.x, e.y, e.r * 0.9, 22);
      const K = hlArtCarve(e.hlGrow || 0);
      if (e.hlCold) hlLight({ x: e.x, y: e.y, r: 130, col: '#a5f3fc', a: 0.5, shadow: false });
      else if (K.cut > 0.2) hlLight({ x: e.x, y: e.y, r: 90 + 60 * K.cut, col: '#f97316', a: 0.5 * K.cut, flick: 0.7, seed: hlArtSeed(e), shadow: false });
    } else if (e.type === 'scarecrow') hlOccCircle(e.x, e.y + e.r * 0.4, e.r * 0.4, 80);
    else if (e.type === 'creeper') hlOccCircle(e.x, e.y, e.r * 0.7, 16);
    else if (e.boss === 'backlog') hlOccCircle(e.x, e.y, e.r * 0.85, 90);
  }
  return true;
}
function drawHlAreaFloor(A) {
  const X = arena.x0, Y = arena.y0, w = Math.round(arena.x1 - arena.x0), h = Math.round(arena.y1 - arena.y0);
  hlBake('hl-patch-floor', X, Y, w, h, g => hlArtPatchFloor(g, X, Y, w, h));
  // the lanterns' posts and bodies (their flames are in the glow)
  ctx.save();
  for (const [x, y] of hlArtPatchLamps()) {
    ctx.strokeStyle = HL_ART_C.woodLo; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y - 6); ctx.lineTo(x + 8, y - 6); ctx.stroke();
    ctx.strokeStyle = '#1c1410'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 8, y - 6); ctx.lineTo(x + 8, y); ctx.stroke();
    hlArtPumpkin(x + 8, y + 7, 6.5, { lid: true, face: () => { ctx.fillStyle = HL_ART_C.hole; hlArtFacePath(0, 1, 5.2, 1, 1); ctx.fill(); } });
  }
  ctx.restore();
}
function drawHlGlow(scene) {
  const C = HL_ART_C;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (scene === 'vigil') {
    const cs = hlArtCandles(Math.min(260, Math.floor(Vigil.shown() / 10)));
    for (const q of cs) hlArtFlame(q.x + q.lean * 6, q.y - q.h - 1.5, 3.4 + q.w * 0.6, q.seed, 0.9);
    const S = hlArtSoulState();
    if (S.st >= 5) { const q = hlArtSoulCandle(); hlArtFlame(q.x, q.y - q.h - 1.5, 6, q.seed, 1); }
    hlArtSoulGlow(S);
    VIG_SPOTS.alcoves.forEach(hlArtAlcoveGlow);
    hlArtVigilLabels();
    VIG_SPOTS.ways.forEach(w => {
      if (!(hlChapterOpen(w.ch) && HL_AREAS[w.area])) return;
      const q = vigPos(w);
      drawGlow(q.x, q.y + 10, 90, '#fb923c', 0.18 + 0.04 * Math.sin(uiTime * 1.7));
    });
    // the shaft of light down the way back
    const ex = vigPos(VIG_SPOTS.exit), gr = ctx.createLinearGradient(ex.x, ex.y + 80, ex.x, ex.y - 60);
    gr.addColorStop(0, 'rgba(148,163,184,0.1)'); gr.addColorStop(1, 'rgba(148,163,184,0)');
    ctx.fillStyle = gr; ctx.fillRect(ex.x - 48, ex.y - 60, 96, 140);
    const book = typeof hlP === 'function' ? hlP() : null, st = vigPos(VIG_SPOTS.stand);
    if (book) HL_MEDALS.forEach((m, i) => { if (book.equip.includes(m.id)) drawGlow(st.x - 66 + i * 22, st.y - 30, 16, '#fbbf24', 0.3); });
  } else {
    hlArtPatchLamps().forEach(([x, y], i) => {
      const f = hlFlicker(uiTime, i * 1.9, 0.6);
      drawGlow(x + 8, y + 8, 30, C.flame, 0.35 * f);
      ctx.globalAlpha = 0.6 + 0.4 * f; ctx.fillStyle = C.flameHi; hlArtFacePath(x + 8, y + 8, 5.2, 1, 1); ctx.fill(); ctx.globalAlpha = 1;
    });
    for (const e of enemies) {
      if (e.dead) continue;
      if (e.type === 'gourd') hlArtGourdGlow(e);
      else if (e.type === 'jack') hlArtJackGlow(e);
      else if (e.type === 'scarecrow') hlArtCrowGlow(e);
      else if (e.boss === 'backlog') hlArtBacklogGlow(e);
      if (e.type === 'creeper') drawGlow(e.x, e.y, e.r * 1.6, '#84cc16', 0.06);
      if (e.hlRipe) {
        ctx.strokeStyle = rgba('#fbbf24', 0.25 + 0.15 * Math.sin(uiTime * 4)); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, TAU); ctx.stroke();
      }
    }
    // the slams' cores, bright enough to shoot at in any light
    for (const p of hlHeld) if (p.kind === 'slam') {
      const col = p.turned ? C.turned : p.held ? C.held : C.sticker;
      drawGlow(p.x, p.y, 36, col, p.held ? 0.15 : 0.35);
      ctx.strokeStyle = rgba(col, p.held ? 0.5 : 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}

/* the event's own bodies, in place of the generic polygon */
function drawHlBody(e, ea) {
  ctx.save();
  if (e.type === 'gourd') hlArtGourd(e, ea);
  else if (e.type === 'jack') hlArtJack(e, ea);
  else if (e.type === 'creeper') hlArtCreeper(e, ea);
  else if (e.type === 'scarecrow') hlArtCrow(e, ea);
  else if (e.boss === 'backlog') hlArtBacklog(e, ea);
  else {
    ctx.globalAlpha = ea; ctx.fillStyle = rgba(e.col, 0.2); ctx.strokeStyle = e.col; ctx.lineWidth = 2;
    poly(e.x, e.y, e.r, e.sides, e.ang); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
/* the event's enemy rounds: seeds, and his price stickers — held is paused,
   turned is resumed and dangerous to him as well */
function drawHlEBullet(b) {
  const C = HL_ART_C, r = b.r, ang = Math.atan2(b.vy || 0, b.vx || 1);
  ctx.save();
  if (b.hlKind === 'seed') {
    drawGlow(b.x, b.y, r * 3.4, C.flame, 0.35);
    ctx.globalCompositeOperation = 'source-over';
    ctx.translate(b.x, b.y); ctx.rotate(ang + uiTime * 9);
    ctx.fillStyle = C.tag;
    ctx.beginPath(); ctx.moveTo(r * 1.3, 0); ctx.quadraticCurveTo(0, r * 1.05, -r * 1.1, 0); ctx.quadraticCurveTo(0, -r * 1.05, r * 1.3, 0); ctx.fill();
    ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return;
  }
  // THE BACKLOG's: a sticker, spinning. Paused, it hangs grey; resumed, gold.
  const held = b.hlHeld, turn = b.hlTurn;
  const col = turn ? C.turned : held ? C.held : C.sticker;
  drawGlow(b.x, b.y, r * (held ? 2.4 : 3.6), col, held ? 0.14 : turn ? 0.55 : 0.4);
  if (turn) {
    ctx.strokeStyle = rgba(C.turned, 0.5); ctx.lineWidth = r * 0.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(ang) * r * 4, b.y - Math.sin(ang) * r * 4); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  const spin = held ? 0.4 : uiTime * 7 + b.x * 0.01;
  hlArtTagShape(b.x, b.y, r * 2.6, r * 1.6, spin);
  ctx.globalAlpha = held ? 0.6 : 1;
  ctx.fillStyle = turn ? '#fef3c7' : held ? '#334155' : C.sticker; ctx.fill();
  ctx.strokeStyle = turn ? '#f59e0b' : held ? '#94a3b8' : '#7c2d12'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = held ? '#0d1119' : '#1c1410'; ctx.beginPath(); ctx.arc(-r * 0.75, 0, r * 0.22, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
  if (held) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(uiTime * 3 + b.x * 0.05);
    ctx.strokeStyle = C.held; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = uiTime * 6;
    ctx.beginPath(); ctx.arc(b.x, b.y, r * 2, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.ink; ctx.fillRect(b.x - r * 0.5, b.y - r * 0.55, r * 0.32, r * 1.1); ctx.fillRect(b.x + r * 0.18, b.y - r * 0.55, r * 0.32, r * 1.1);
    ctx.restore();
  }
}
/* the pause glyph, anywhere */
function hlArtPause(x, y, s, col, a) {
  ctx.globalAlpha = a; ctx.fillStyle = col;
  ctx.fillRect(x - s * 0.55, y - s * 0.6, s * 0.36, s * 1.2); ctx.fillRect(x + s * 0.19, y - s * 0.6, s * 0.36, s * 1.2);
  ctx.globalAlpha = 1;
}
/* a sweep: a price-gun's line of tape, run across the room */
function drawHlSweep(p) {
  const C = HL_ART_C, x2 = p.x + Math.cos(p.a) * p.len, y2 = p.y + Math.sin(p.a) * p.len;
  const col = p.turned ? C.turned : p.held ? C.held : C.sticker;
  ctx.save();
  ctx.lineCap = 'butt';
  if (p.t < p.tele) {
    const k = p.t / p.tele;
    // where it means to go: the whole arc, faint, and the line itself ticking in
    ctx.strokeStyle = rgba(col, 0.18); ctx.lineWidth = 1; ctx.setLineDash([2, 10]);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.len * 0.97, Math.min(p.a0, p.a1), Math.max(p.a0, p.a1)); ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.25 + 0.4 * k); ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -uiTime * 60;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
    return;
  }
  if (p.held) {
    // what it never finished: the rest of the arc, dotted
    ctx.strokeStyle = rgba(C.held, 0.22); ctx.lineWidth = 1; ctx.setLineDash([2, 8]);
    const lo = Math.min(p.a, p.a1), hi = Math.max(p.a, p.a1);
    ctx.beginPath(); ctx.arc(p.x, p.y, p.len * 0.97, lo, hi); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.strokeStyle = rgba(col, p.held ? 0.12 : 0.28); ctx.lineWidth = p.w * 2.4;
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.strokeStyle = rgba(col, p.held ? 0.4 : 0.85); ctx.lineWidth = p.w;
  if (p.held) ctx.setLineDash([10, 8]);
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  if (!p.held) {
    // the barcode, running down the tape
    ctx.strokeStyle = rgba('#fff7ed', 0.55); ctx.lineWidth = p.w * 0.6;
    ctx.setLineDash([2, 4, 1, 3, 3, 5, 1, 6]); ctx.lineDashOffset = -uiTime * (p.turned ? 260 : 180);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    for (let d = 90; d < p.len; d += 150) hlArtPause(p.x + Math.cos(p.a) * d, p.y + Math.sin(p.a) * d, 7, C.ink, 0.5);
  }
  if (p.turned) {
    // chevrons: which way it is going now
    ctx.strokeStyle = rgba(C.turned, 0.8); ctx.lineWidth = 2;
    const dir = Math.sign(p.a1 - p.a0) || 1, nx = -Math.sin(p.a) * dir, ny = Math.cos(p.a) * dir;
    for (let d = 60; d < p.len; d += 110) {
      const cx = p.x + Math.cos(p.a) * d + nx * p.w, cy = p.y + Math.sin(p.a) * d + ny * p.w;
      ctx.beginPath(); ctx.moveTo(cx - Math.cos(p.a) * 6, cy - Math.sin(p.a) * 6); ctx.lineTo(cx + nx * 7, cy + ny * 7); ctx.lineTo(cx + Math.cos(p.a) * 6, cy + Math.sin(p.a) * 6); ctx.stroke();
    }
  }
  ctx.restore();
}
/* a slam: a sale sticker slapped on the floor, counting down */
function drawHlSlam(p) {
  const C = HL_ART_C, k = hlPieceK(p);
  const col = p.turned ? C.turned : p.held ? C.held : C.sticker;
  ctx.save();
  // the scalloped edge
  ctx.beginPath();
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU, rr = p.r * (i % 2 ? 0.965 : 1);
    i ? ctx.lineTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr) : ctx.moveTo(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(col, p.held ? 0.05 : 0.08); ctx.fill();
  ctx.strokeStyle = rgba(col, p.held ? 0.45 : 0.85); ctx.lineWidth = 2;
  if (p.held) ctx.setLineDash([8, 6]);
  ctx.stroke(); ctx.setLineDash([]);
  // the countdown, filling in
  ctx.fillStyle = rgba(col, p.held ? 0.12 : 0.2 + 0.15 * k);
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r * k, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
  // the core: the thing to shoot
  ctx.fillStyle = p.held ? '#1e293b' : '#fef3c7';
  ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, TAU); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
  if (p.held) hlArtPause(p.x, p.y, 12, C.ink, 0.85);
  else hlArtText('SALE', p.x, p.y + 4, { px: 10, w: 800, ls: '0.08em', al: 'center', col: p.turned ? '#92400e' : '#9a3412' });
  ctx.restore();
}
/* the vine: a rope with leaves and thorns. Drawn solid over the additive
   layer, lit by hand, so it reads as a thing and not a glow. */
function drawHlVine(e, v) {
  const C = HL_ART_C, R = e.artRope;
  const pts = R ? R.p.map(q => [q.x, q.y]) : [[e.x, e.y], [v.x, v.y]];
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const mid = pts[pts.length >> 1], L = hlLightAt(mid[0], mid[1], false);
  const lit = c => hlLit(c, [Math.min(1.3, L[0] * 1.6 + 0.25), Math.min(1.3, L[1] * 1.6 + 0.25), Math.min(1.3, L[2] * 1.6 + 0.25)]);
  const w = v.st === 'held' ? 5 : 3.4;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = lit(C.vineLo); ctx.lineWidth = w + 2;
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.strokeStyle = lit(C.vine); ctx.lineWidth = w;
  ctx.stroke();
  // leaves and thorns along it
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [x2, y2] = pts[i + 1], a = Math.atan2(y2 - y, x2 - x), s = i % 2 ? 1 : -1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + s * 0.9);
    if (i % 3 === 0) {
      ctx.fillStyle = lit(i % 2 ? C.leaf : C.leafHi);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(5, -5, 11, 0); ctx.quadraticCurveTo(5, 5, 0, 0); ctx.fill();
    } else {
      ctx.fillStyle = lit('#d9f99d');
      ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(5, 0); ctx.lineTo(0, 1); ctx.fill();
    }
    ctx.restore();
  }
  if (v.st === 'held') {
    // the last of it, wound round the hull: shots can't cut this part
    ctx.strokeStyle = lit(C.vine); ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const a0 = uiTime * 2 + k * 2.1;
      ctx.beginPath(); ctx.ellipse(v.x, v.y, 17 + k * 2, 8 + k, a0 * 0.3, a0, a0 + 3.6); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  if (v.st === 'held') {
    // the reel: pulses running back toward the pod
    for (let k = 0; k < 3; k++) {
      const u = ((uiTime * 1.4 + k / 3) % 1), idx = Math.floor((1 - u) * (pts.length - 1));
      const [x, y] = pts[clamp(idx, 0, pts.length - 1)];
      drawGlow(x, y, 10, C.vineHi, 0.35);
    }
  }
  ctx.strokeStyle = rgba(C.vineHi, 0.18); ctx.lineWidth = 1;
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  ctx.restore();
}
/* THE BACKLOG, coming apart: the heap spills and the soul's save rolls out */
function drawHlBossDeath(d) {
  const C = HL_ART_C, t = d.t, r = d.r || 64;
  const R = hlArtRng(0xdead);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  // the spill: everything he had, flung out and settling
  for (let i = 0; i < 22; i++) {
    const a = R() * TAU, D = r * (1.2 + R() * 2.4), v = 1 - Math.exp(-t * (2.2 + R() * 2));
    const up = Math.max(0, Math.sin(Math.min(1, t / (0.5 + R() * 0.4)) * Math.PI)) * r * (0.4 + R() * 0.6) * Math.exp(-t);
    const x = d.x + Math.cos(a) * D * v, y = d.y + Math.sin(a) * D * v * 0.7 - up;
    const k = R(), rot = (R() - 0.5) * 8 * (1 - v) + (R() - 0.5);
    ctx.globalAlpha = 0.5; ctx.fillStyle = '#020306'; hlArtEll(x, d.y + Math.sin(a) * D * v * 0.7 + 6, 10, 3); ctx.fill(); ctx.globalAlpha = 1;
    if (k < 0.5) hlArtHeapItem({ k: 'box', x: 0, y: 0, w: r * 0.36, h: r * 0.3, rot, tag: k < 0.3, p: HL_ART_PRICES[i % 8] }, x, y, 1, 0);
    else if (k < 0.75) hlArtHeapItem({ k: 'case', x: 0, y: 0, w: r * 0.22, h: r * 0.3, rot, v: k }, x, y, 1, 0);
    else hlArtPumpkin(x, y, r * 0.16, { lean: rot * 0.2 });
  }
  // the save: an ordinary hull's cartridge, cold, rolling out to you
  const u = clamp((t - 0.7) / 1.6, 0, 1), roll = HL_EASE.out3(u);
  if (u > 0) {
    const sx = d.x + roll * r * 1.6, sy = d.y + r * 0.9 + roll * 10;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(roll * TAU * 1.5);
    ctx.fillStyle = '#0f172a'; ctx.strokeStyle = C.cold; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-11, -8, 22, 16, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(C.cold, 0.6); ctx.fillRect(-7, -5, 14, 5);
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(sx, sy, 50 + 10 * Math.sin(uiTime * 3), C.cold, 0.35 * u);
    if (u >= 1) hlArtText('WAVE 19  ·  HULL 4%', sx, sy + 30, { mono: true, w: 600, px: 10, al: 'center', col: C.cold, a: clamp((t - 2.3) / 0.6, 0, 1) * 0.85 });
  }
  ctx.restore();
}
/* a boss's spoken line. THE BACKLOG's are price stickers on a string. */
function drawHlBark(b) {
  const k = clamp(Math.min(b.t / 0.2, (b.life - b.t) / 0.4), 0, 1);
  const pop = HL_EASE.outBack(clamp(b.t / 0.3, 0, 1));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = k;
  ctx.font = "700 14px " + HL_ART_FONT;
  if (b.boss === 'backlog') {
    const tw = ctx.measureText(b.text).width, w = tw + 40, h = 28;
    const x = b.x + 20, y = b.y - b.r - 54, rot = -0.05 + Math.sin(uiTime * 1.6 + b.text.length) * 0.03;
    ctx.strokeStyle = 'rgba(254,243,199,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 0.6); ctx.quadraticCurveTo(x - w / 2 - 10, y + 30, x - w / 2 + 8, y); ctx.stroke();
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 14, -h / 2); ctx.lineTo(w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2 + 14, h / 2); ctx.lineTo(-w / 2, 0); ctx.closePath();
    ctx.fillStyle = '#fef3c7'; ctx.fill();
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.arc(-w / 2 + 9, 0, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7c2d12'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(b.text, -w / 2 + 24, 1);
    ctx.restore();
  } else {
    ctx.textAlign = 'center'; ctx.fillStyle = '#fed7aa';
    ctx.fillText(b.text, b.x, b.y - b.r - 30);
  }
  ctx.restore();
}

/* the room, and everything standing in it */
function drawVigilWorld() {
  const c = vigPos({ x: 0, y: 0 }), X = c.x - VIG_SIZE.w / 2, Y = c.y - VIG_SIZE.h / 2;
  hlBake('hl-vigil-room', X, Y, VIG_SIZE.w, VIG_SIZE.h, g => hlArtVigilBake(g, X, Y));
  ctx.save();
  VIG_SPOTS.ways.forEach(hlArtWay);
  VIG_SPOTS.alcoves.forEach(hlArtAlcove);
  // the way back: a ladder up into the hatch's light
  const ex = vigPos(VIG_SPOTS.exit);
  ctx.strokeStyle = HL_ART_C.woodHi; ctx.lineWidth = 3;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex.x + s * 16, ex.y - 18); ctx.lineTo(ex.x + s * 20, ex.y + 66); ctx.stroke(); }
  ctx.lineWidth = 2.2; ctx.strokeStyle = HL_ART_C.wood;
  for (let y = ex.y - 10; y < ex.y + 64; y += 11) { ctx.beginPath(); ctx.moveTo(ex.x - 17, y); ctx.lineTo(ex.x + 17, y); ctx.stroke(); }
  hlArtStand();
  // the candles: one for every ten lit anywhere
  const cs = hlArtCandles(Math.min(260, Math.floor(Vigil.shown() / 10)));
  for (const q of cs) hlArtCandleBody(q);
  // the soul, and the candle that is its own
  const S = hlArtSoulState();
  hlArtCandleBody(hlArtSoulCandle(), S.st >= 5);
  hlArtSoulBody(S);
  ctx.restore();
  // him: the game's own figure. He watches the hull.
  const o = vigPos(VIG_SPOTS.outsider);
  const his = vig.talk && vig.talk.lines[vig.talk.i] && vig.talk.lines[vig.talk.i][0] === 'outsider';
  outsiderFigure(o.x, o.y, 42, { pose: 'idle', look: clamp((P.x - o.x) / 260, -1, 1), ph: 0.6, glow: his ? 1.8 : 1 });
}

/* ---- the screen ---- */
function drawHlAreaHud(A, area) {
  const C = HL_ART_C, acc = A.stage.accent, n = Math.max(1, Math.min(5, area.n));
  ctx.save();
  // the room's name and its five waves; the fifth is his
  const y = 68;
  hlArtText(A.stage.name, W / 2 - 12, y, { px: 11, ls: '0.3em', al: 'right', col: acc });
  for (let i = 0; i < 5; i++) {
    const x = W / 2 + 6 + i * 16, on = i < n;
    if (i === 4) {
      ctx.globalAlpha = on ? 1 : 0.45;
      hlArtTagShape(x + 4, y - 4, 13, 8, 0); ctx.fillStyle = on ? C.sticker : '#1c1410'; ctx.fill();
      ctx.strokeStyle = acc; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = on ? acc : 'rgba(251,146,60,0.18)';
      ctx.beginPath(); ctx.arc(x, y - 4, on && i === n - 1 ? 3.6 : 2.6, 0, TAU); ctx.fill();
    }
  }
  const goal = hlChipGoal(), m = /(\d+)\s*\/\s*(\d+)/.exec(goal);
  const label = m ? goal.replace(/\s*\d+\s*\/\s*\d+\s*$/, '') : goal;
  hlArtText(label, W / 2 + (m ? -30 : 0), y + 20, { px: 10, ls: '0.24em', al: 'center', col: C.ink, a: 0.8 });
  if (m) {
    ctx.font = '700 10px ' + HL_ART_FONT; ctx.letterSpacing = '0.24em';
    const lw = ctx.measureText(label).width; ctx.letterSpacing = '0em';
    const x0 = W / 2 - 30 + lw / 2 + 12;
    for (let i = 0; i < +m[2]; i++) {
      const got = i < +m[1];
      ctx.save(); ctx.globalAlpha = got ? 1 : 0.4;
      ctx.fillStyle = got ? C.cold : 'transparent'; ctx.strokeStyle = C.cold; ctx.lineWidth = 1;
      for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(x0 + i * 16 + cx * 5.5, y + 16, rx * 5.5, 4.4); got ? ctx.fill() : ctx.stroke(); }
      ctx.restore();
    }
  }
  // where the cold ones are, and how long they have
  for (const e of enemies) {
    if (e.dead || !e.hlCold) continue;
    const sx = (e.x - cam.x) * camZoom + W / 2, sy = (e.y - cam.y) * camZoom + H / 2;
    if (sx > 0 && sx < W && sy > 0 && sy < H) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2), R = Math.min(W, H) * 0.42;
    const px = W / 2 + Math.cos(a) * R, py = H / 2 + Math.sin(a) * R, pu = 0.7 + 0.3 * Math.sin(uiTime * 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; drawGlow(px, py, 26, C.cold, 0.25 * pu); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = C.cold;
    ctx.beginPath(); ctx.moveTo(px + Math.cos(a) * 20, py + Math.sin(a) * 20);
    ctx.lineTo(px + Math.cos(a + 2.6) * 11, py + Math.sin(a + 2.6) * 11); ctx.lineTo(px + Math.cos(a - 2.6) * 11, py + Math.sin(a - 2.6) * 11); ctx.closePath(); ctx.fill();
    for (const [cx, rx] of HL_ART_LOBES) { hlArtEll(px + cx * 6, py, rx * 6, 5); ctx.fill(); }
    ctx.strokeStyle = rgba('#fb923c', 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, 11, -Math.PI / 2, -Math.PI / 2 + TAU * (e.hlGrow || 0)); ctx.stroke();
    ctx.restore();
  }
  if (area.end) {
    const k = clamp(area.end.t / HL_END_T, 0, 1), win = area.end.why === 'win';
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(2,4,8,0)'); vg.addColorStop(1, 'rgba(2,4,8,' + (0.85 * HL_EASE.in(k)) + ')');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const a = clamp((area.end.t - 0.6) / 0.8, 0, 1);
    hlArtText(win ? 'BACK TO THE VIGIL' : 'THE PATCH LETS YOU GO', W / 2, H / 2 + 120, { px: 13, ls: '0.34em', al: 'center', col: win ? '#fde68a' : C.ink, a });
    hlArtText(win ? 'IT HAS THE REST OF ITSELF' : 'WHAT YOU BROKE STAYS BROKEN', W / 2, H / 2 + 142, { px: 9, ls: '0.3em', al: 'center', col: '#94a3b8', a: a * 0.7 });
  }
  ctx.restore();
}
function drawHlVigilHud(v) {
  const said = v.sayT > 0 && v.said === 'shut';
  const t = said ? 'THAT WAY IS SHUT FOR NOW'
          : v.near === 'soul' ? 'THE LOST SOUL'
          : v.near === 'outsider' ? 'HIM'
          : v.near === 'stand' ? 'THE STAND   ·   MEDALS'
          : v.near === 'way' ? 'GO UP   ·   THE ' + VIG_SPOTS.ways[v.nearI].area.toUpperCase()
          : v.near === 'exit' ? 'THE WAY BACK' : '';
  if (!t) return;
  const col = said ? '#94a3b8' : v.near === 'soul' ? '#a5f3fc' : v.near === 'way' ? '#fb923c' : v.near === 'outsider' ? COLD_COL : '#e2e8f0';
  const a = said ? clamp(v.sayT / 0.4, 0, 1) : 0.9;
  ctx.save();
  ctx.font = '700 11px ' + HL_ART_FONT; ctx.letterSpacing = '0.22em';
  const tw = ctx.measureText(t).width; ctx.letterSpacing = '0em';
  const y = H - 70, x0 = W / 2 - (tw + (said ? 0 : 30)) / 2;
  if (!said) hlArtKey(x0 + 9, y, 'E', col, a);
  hlArtText(t, x0 + (said ? 0 : 30), y, { px: 11, ls: '0.22em', col, a });
  ctx.restore();
}
function drawHlStandUi(ui, book) {
  if (ui.msgT > 0) ui.msgT -= lastDT;
  const C = HL_ART_C, pw = 500, ph = 336, x = Math.round(W / 2 - pw / 2), y = Math.round(H / 2 - ph / 2);
  ctx.save();
  ctx.fillStyle = 'rgba(2,4,8,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(6,8,13,0.95)'; ctx.fillRect(x, y, pw, ph);
  ctx.fillStyle = 'rgba(251,146,60,0.35)'; ctx.fillRect(x, y, pw, 1);
  ctx.strokeStyle = 'rgba(51,65,85,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, pw - 1, ph - 1);
  hlArtText('THE STAND', x + 22, y + 32, { px: 11, ls: '0.3em', col: C.ink });
  hlArtText('TWO AT A TIME', x + 22, y + 48, { px: 9, ls: '0.28em', col: '#64748b' });
  // the worn pair
  for (let k = 0; k < 2; k++) {
    const sx = x + pw - 76 + k * 34, sy = y + 36, id = book.equip[k];
    ctx.strokeStyle = '#334155'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(sx, sy, 13, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    if (id) hlArtMedal(id, sx, sy, 12, 'worn');
  }
  ctx.fillStyle = 'rgba(51,65,85,0.5)'; ctx.fillRect(x + 22, y + 64, pw - 44, 1);
  // the hooks
  HL_MEDALS.forEach((m, i) => {
    const own = book.medals.includes(m.id), on = book.equip.includes(m.id), sel = i === ui.sel;
    const ry = y + 92 + i * 30;
    if (sel) { ctx.fillStyle = 'rgba(251,146,60,0.08)'; ctx.fillRect(x + 14, ry - 18, 232, 28); }
    hlArtText(String(i + 1), x + 26, ry, { px: 10, mono: true, w: 600, col: sel ? '#fb923c' : '#475569' });
    hlArtMedal(m.id, x + 54, ry - 4, 9, own ? (on ? 'worn' : 'own') : 'unknown');
    hlArtText(own ? m.n : '???', x + 72, ry, { px: 11, ls: '0.16em', col: sel ? C.ink : own ? '#94a3b8' : '#334155' });
    if (on) hlArtText('WORN', x + 236, ry, { px: 9, ls: '0.2em', al: 'right', col: '#fb923c' });
  });
  ctx.fillStyle = 'rgba(51,65,85,0.5)'; ctx.fillRect(x + 262, y + 76, 1, 214);
  // the one on the hook you are looking at
  const m = HL_MEDALS[ui.sel], own = m && book.medals.includes(m.id), on = m && book.equip.includes(m.id);
  const cx = x + 262 + (pw - 262) / 2;
  if (m) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (on) drawGlow(cx, y + 128, 80, '#f59e0b', 0.18);
    ctx.restore();
    hlArtMedal(m.id, cx, y + 128, 36, own ? (on ? 'worn' : 'own') : 'unknown');
    hlArtText(own ? m.n : (m.later ? 'NOT YET' : '???'), cx, y + 192, { px: 12, ls: '0.24em', al: 'center', col: own ? C.ink : '#475569' });
    if (own && m.d) {
      ctx.font = '400 12px ' + HL_ART_FONT;
      hlArtWrap(m.d, 196).slice(0, 5).forEach((ln, i) => hlArtText(ln, cx, y + 214 + i * 16, { px: 12, w: 400, al: 'center', col: '#94a3b8' }));
    } else hlArtText(m.later ? 'LATER IN THE MONTH' : 'EARNED IN THE VIGIL', cx, y + 214, { px: 9, ls: '0.24em', al: 'center', col: '#334155' });
  }
  // what just happened
  if (ui.msgT > 0) {
    const a = clamp(ui.msgT / 0.4, 0, 1);
    const t = ui.msg === 'full' ? 'TWO AT A TIME. TAKE ONE OFF.' : ui.msg === 'on' ? 'HUNG ON YOU' : ui.msg === 'off' ? 'BACK ON ITS HOOK' : 'NOT YOURS YET';
    hlArtText(t, x + pw / 2, y + ph - 44, { px: 10, ls: '0.24em', al: 'center', col: ui.msg === 'full' ? '#fca5a5' : ui.msg === 'on' ? '#fb923c' : '#94a3b8', a });
  }
  ctx.fillStyle = 'rgba(51,65,85,0.5)'; ctx.fillRect(x + 22, y + ph - 30, pw - 44, 1);
  hlArtText('1–7 / ENTER  WEAR     W / S  MOVE     ESC  CLOSE', x + pw / 2, y + ph - 12, { px: 9, ls: '0.2em', al: 'center', col: '#475569' });
  ctx.restore();
}
function drawHlMedalHud(equip, bank) {
  if (!equip.length && !bank) return;
  ctx.save();
  let x = W - 18;
  const y = H - 22;
  if (bank > 0) {
    const t = 'PUT ASIDE  ' + Math.round(bank).toLocaleString() + ' XP';
    hlArtText(t, x, y + 18 > H ? y : y, { px: 9, ls: '0.2em', al: 'right', col: '#fde68a', a: 0.8 });
    ctx.font = '700 9px ' + HL_ART_FONT; ctx.letterSpacing = '0.2em';
    x -= ctx.measureText(t).width + 16; ctx.letterSpacing = '0em';
  }
  for (let i = equip.length - 1; i >= 0; i--) {
    const m = HL_MEDALS.find(z => z.id === equip[i]) || { id: equip[i], n: equip[i] };
    ctx.font = '700 9px ' + HL_ART_FONT; ctx.letterSpacing = '0.2em';
    const tw = ctx.measureText(m.n).width; ctx.letterSpacing = '0em';
    hlArtText(m.n, x, y, { px: 9, ls: '0.2em', al: 'right', col: '#94a3b8' });
    hlArtMedal(m.id, x - tw - 14, y - 3.5, 8, 'worn');
    x -= tw + 36;
  }
  ctx.restore();
}
/* the menu: a trapdoor in the floor, bottom-right, with candlelight coming up
   through it, and him in it while the knock plays */
function drawHlHatch(r, T) {
  const C = HL_ART_C, open = T ? T.v('open') : 1, rise = T ? T.v('rise') : 0;
  const sh = T ? T.shake(6) : { x: 0, y: 0 }, hole = hlArtHatchHole(r);
  const hot = !T && typeof mouse !== 'undefined' && mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h ? 1 : 0;
  let bump = 0;
  if (T) for (let i = 0; i < 3; i++) { const d = T.t - (1.0 + i * 0.7); if (d >= 0) bump += Math.exp(-d * 12) * (0.6 + i * 0.2); }
  ctx.save();
  if (T && T.v('stall') > 0) { ctx.fillStyle = 'rgba(2,4,8,' + (0.5 * T.v('stall')) + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
  ctx.translate(sh.x, sh.y);
  const glowK = clamp(open * 1.2 + bump * 0.6, 0, 1.4) * (0.85 + 0.15 * hlFlicker(uiTime, 3.3, 0.8)) * (1 + hot * 0.25);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(hole.x + hole.w / 2, hole.y + hole.h / 2, hole.w * 1.3, C.flame, 0.14 * glowK);
  ctx.restore();
  // the frame, set in the menu's floor
  ctx.fillStyle = '#0b0906'; ctx.fillRect(r.x + 12, r.y + 10, r.w - 24, r.h - 22);
  ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 3; ctx.strokeRect(r.x + 12, r.y + 10, r.w - 24, r.h - 22);
  ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1; ctx.strokeRect(r.x + 8, r.y + 6, r.w - 16, r.h - 14);
  // the shaft: a ladder going down into candlelight
  ctx.save();
  ctx.beginPath(); ctx.rect(hole.x, hole.y, hole.w, hole.h); ctx.clip();
  const sg = ctx.createLinearGradient(0, hole.y, 0, hole.y + hole.h);
  sg.addColorStop(0, '#050403'); sg.addColorStop(1, hlMix('#1a0c04', '#7c2d12', clamp(glowK * 0.8, 0, 1)));
  ctx.fillStyle = sg; ctx.fillRect(hole.x, hole.y, hole.w, hole.h);
  ctx.strokeStyle = 'rgba(92,67,48,0.8)'; ctx.lineWidth = 2;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hole.x + hole.w / 2 + s * 16, hole.y); ctx.lineTo(hole.x + hole.w / 2 + s * 12, hole.y + hole.h); ctx.stroke(); }
  for (let k = 0; k < 4; k++) {
    const yy = hole.y + 8 + k * 14; ctx.strokeStyle = rgba('#5c4330', 0.4 + k * 0.15);
    ctx.beginPath(); ctx.moveTo(hole.x + hole.w / 2 - 15 + k, yy); ctx.lineTo(hole.x + hole.w / 2 + 15 - k, yy); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) hlArtFlame(hole.x + hole.w * (0.14 + i * 0.18), hole.y + hole.h - 3, 3 + (i % 2), i * 2.7 + 1, 0.55 * clamp(glowK, 0, 1));
  ctx.restore();
  // him, coming up into it
  if (rise > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x - 40, -H, r.w + 80, hole.y + hole.h + H); ctx.clip();
    const s = 34, fx = hole.x + hole.w / 2 - 6, fy = hole.y + hole.h + s * 0.2 + s * 0.95 * (1 - rise);
    outsiderFigure(fx, fy, s, { pose: 'rim', a: rise, grip: { x: -s * 1.05, y: hole.y + hole.h - fy - 2 }, noShadow: true });
    ctx.restore();
    ctx.fillStyle = 'rgba(5,4,3,0.85)'; ctx.fillRect(hole.x, hole.y + hole.h - 3, hole.w, 3);
  }
  // the door: planks on a hinge along the far edge; it swings up and over
  const th = open * Math.PI * 0.64, ch = Math.cos(th), dh = hole.h * ch, lift = bump * 3;
  const top = hole.y - lift, dw = hole.w * (1 + 0.06 * Math.sin(th));
  const dx = hole.x - (dw - hole.w) / 2;
  const y0 = Math.min(top, top + dh), hh = Math.abs(dh);
  if (hh > 0.5) {
    const under = ch < 0;
    ctx.fillStyle = under ? '#1c140d' : '#3a2a1c'; ctx.fillRect(dx, y0, dw, hh);
    ctx.strokeStyle = under ? '#0b0906' : '#1c140d'; ctx.lineWidth = 1.2;
    for (let k = 1; k < 5; k++) { const px = dx + dw * k / 5; ctx.beginPath(); ctx.moveTo(px, y0); ctx.lineTo(px, y0 + hh); ctx.stroke(); }
    ctx.fillStyle = under ? '#2a1f15' : '#5c4330';
    if (hh > 6) { ctx.fillRect(dx, y0 + hh * 0.2, dw, Math.max(1.5, hh * 0.1)); ctx.fillRect(dx, y0 + hh * 0.7, dw, Math.max(1.5, hh * 0.1)); }
    ctx.fillStyle = C.iron;
    for (const s of [0.22, 0.78]) ctx.fillRect(dx + dw * s - 5, under ? y0 + hh - 4 : y0, 10, 4);
    if (!under && hh > 10) { ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(dx + dw / 2, y0 + hh * 0.86, 5, Math.PI, 0); ctx.stroke(); }
    if (!under && open < 0.3) {
      // light through the seams, harder on every knock
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(C.flameHi, clamp(0.2 + bump * 0.9, 0, 1)); ctx.lineWidth = 1;
      for (let k = 1; k < 5; k++) { const px = dx + dw * k / 5; ctx.beginPath(); ctx.moveTo(px, y0 + 1); ctx.lineTo(px, y0 + hh - 1); ctx.stroke(); }
      ctx.restore();
    }
  }
  // dust, embers
  hlPartsDraw('lit'); hlPartsDraw('glow');
  if (!T) {
    hlArtText(hot ? 'GO DOWN   [V]' : 'THE VIGIL   [V]', r.x + r.w / 2, r.y + r.h + 14, { px: 9, ls: '0.24em', al: 'center', col: '#fb923c', a: hot ? 0.95 : 0.65 });
    if (hot) hlArtText('SOMEONE IS WAITING', r.x + r.w / 2, r.y - 4, { px: 9, ls: '0.24em', al: 'center', col: '#94a3b8', a: 0.45 });
  }
  ctx.restore();
}
/* ---- the vigil's prize skins (DEV_SKINS 'hl-*'): fx 'hallows' with a tier
   1–3, and 'lostsoul'. Called from SkinFx the way the imperial line is. ---- */
function hlSkinUnder(s) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (s.fx === 'lostsoul') drawGlow(P.x, P.y, 46, '#a5f3fc', 0.1 + 0.05 * hlHash(Math.floor(uiTime * 9)));
  else if ((s.tier || 1) >= 2) drawGlow(P.x, P.y + 4, 42, '#f97316', 0.12 * hlFlicker(uiTime, 1.3, 0.7));
  ctx.restore();
}
function hlSkinPlayer(s) {
  const C = HL_ART_C, tier = s.tier || 1, a = P.ang || 0;
  ctx.save();
  if (s.fx === 'lostsoul') {
    // the ordinary hull again, a ghost of it, at four percent
    const f = hlHash(Math.floor(uiTime * 11) * 1.7);
    ctx.globalCompositeOperation = 'lighter';
    hlArtHull(P.x - Math.cos(a) * 3, P.y - Math.sin(a) * 3, a, 1.35);
    ctx.strokeStyle = rgba(C.cold, 0.18 + 0.4 * f); ctx.lineWidth = 1.2; ctx.setLineDash([2 + f * 5, 3 + (1 - f) * 4]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return true;
  }
  // a face cut into the hull; lit from tier 2
  ctx.translate(P.x, P.y); ctx.rotate(a + Math.PI / 2);
  const lvl = tier >= 2 ? 0.6 + 0.4 * hlFlicker(uiTime, 2.2, 0.8) : 0;
  if (tier >= 2) { ctx.globalCompositeOperation = 'lighter'; drawGlow(0, 2, 16, C.flame, 0.3 * lvl); }
  ctx.globalCompositeOperation = tier >= 2 ? 'lighter' : 'source-over';
  ctx.fillStyle = tier >= 2 ? rgba(C.flameHi, 0.85 * lvl) : 'rgba(12,5,3,0.85)';
  hlArtFacePath(0, 2, 7, 1, 1); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const R = (P.r || 12) + 11;
  ctx.strokeStyle = rgba(s.col || '#fb923c', 0.18 + Math.sin(uiTime * 2.2) * 0.07); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
  if (tier >= 3) {
    // three small lanterns keep it company
    for (let i = 0; i < 3; i++) {
      const b = uiTime * 0.9 + i * TAU / 3, x = P.x + Math.cos(b) * R, y = P.y + Math.sin(b) * R;
      drawGlow(x, y, 9, C.flame, 0.35);
      ctx.fillStyle = C.flameHi; ctx.globalAlpha = 0.9; hlArtFacePath(x, y, 3.2, 1, 1); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (Math.random() < 0.3) spawnPart(P.x + rnd(-8, 8), P.y + rnd(-8, 8), rnd(20, -20), rnd(-20, -60), rnd(2, 1), '#fdba74', rnd(0.6, 0.3), 0.92);
  }
  ctx.restore();
  return true;
}
function hlSkinBullet(b, c, s) {
  if (s.fx !== 'lostsoul' && (s.tier || 1) < 2) return false;
  const C = HL_ART_C, r = b.r, ang = Math.atan2(b.vy || 0, b.vx || 1);
  ctx.save();
  if (s.fx === 'lostsoul') {
    drawGlow(b.x, b.y, r * 4, C.cold, 0.4);
    ctx.strokeStyle = rgba(C.cold, 0.5); ctx.lineWidth = r; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - Math.cos(ang) * r * 5, b.y - Math.sin(ang) * r * 5); ctx.stroke();
    ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(b.x, b.y, r * 0.8, 0, TAU); ctx.fill();
  } else {
    // a seed of fire: a flame lying along its flight
    drawGlow(b.x, b.y, r * 4.2, C.flame, 0.45);
    ctx.translate(b.x, b.y); ctx.rotate(ang);
    ctx.fillStyle = rgba(C.flame, 0.8);
    ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.quadraticCurveTo(-r * 0.2, r * 1.2, -r * 3.4, 0); ctx.quadraticCurveTo(-r * 0.2, -r * 1.2, r * 1.4, 0); ctx.fill();
    ctx.fillStyle = C.flameHi; hlArtEll(r * 0.3, 0, r * 0.8, r * 0.5); ctx.fill();
  }
  ctx.restore();
  return true;
}
function hlSkinPart(p, t, rad, s) {
  if (s.fx === 'lostsoul' || (s.tier || 1) < 3) return false;
  drawGlow(p.x, p.y, rad * 0.8, '#f97316', t * 0.4);
  ctx.save(); ctx.globalAlpha = t; ctx.fillStyle = '#fff7ed';
  ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.6, p.r * 0.5), 0, TAU); ctx.fill();
  ctx.restore();
  return true;
}
function hlSkinEnemy(e, ea, s) {
  if (s.fx === 'lostsoul' || (s.tier || 1) < 3 || e.boss) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(e.x, e.y + e.r * 0.3, e.r * 1.6, '#f97316', 0.06 * ea);
  ctx.restore();
}
/* ---- made ahead. Added by Claude on 27 Sep for the event's preload, and
   kept when the art changes: a new bake, or a light in a new colour, belongs
   in this list. The logic runs these one at a time in idle moments on the
   menu, and only while the event is live (hlArtPrep), so the first step into
   either room does not stall building them. Each must match what the draw
   hook will ask for, key and size, or the draw simply bakes it again. ---- */
function hlArtPreload() {
  const vx = WORLD.w / 2 - VIG_SIZE.w / 2, vy = WORLD.h / 2 - VIG_SIZE.h / 2;
  return [
    // the vigil's room: drawVigilWorld bakes it about the room's centre
    () => hlBakePrep('hl-vigil-room', vx, vy, VIG_SIZE.w, VIG_SIZE.h, g => hlArtVigilBake(g, vx, vy)),
    // the patch's field: the whole arena, as drawHlAreaFloor bakes it
    () => hlBakePrep('hl-patch-floor', 0, 0, WORLD.w, WORLD.h, g => hlArtPatchFloor(g, 0, 0, WORLD.w, WORLD.h)),
    // every light's falloff, and the glows
    () => hlSpritePrep(['#fb923c', '#a5f3fc', '#fed7aa', '#f97316', '#fbbf24', '#64748b', '#94a3b8',
                        '#c2410c', '#e0f2fe', '#fde68a', '#84cc16', '#ea580c', '#f59e0b', '#cbd5e1']),
    // where the candles stand, for today's count
    () => hlArtCandles(Math.min(260, Math.floor(Vigil.shown() / 10)))
  ];
}
/* ===================== end of ALL HALLOWS · ACT I art hooks ===================== */
