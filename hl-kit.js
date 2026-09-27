/* ===========================================================================
   THE KIT — ALL HALLOWS
   The shared runtime every piece of the event is drawn on: light and shadow,
   cloth and rope, rigs, the cutscene clock, dialogue, particles and baked
   layers. Written once, so that the soul, the rooms, the bosses and the
   scenes all read as one thing instead of eleven separately-lit drawings.

   The same file runs in the harness (hl-base.js provides the shims) and in
   the game (lifted whole into index.html, like su-art.js and od-art.js).
   It leans only on what both have: ctx, W, H, DPR, TAU, clamp, lerp, rgba,
   glowSprite, drawGlow and uiTime. Everything it declares is prefixed hl.

   There is no frame budget (user, 27 Sep). The light pass is full
   resolution and shadows are soft-sampled; nothing here is tuned down.
=========================================================================== */

/* =============================== NOISE & EASE ============================== */

const hlHash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
/* smooth 1D value noise, 0..1 */
function hlNoise(x, seed = 0) {
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), o = seed * 57.31;
  return hlHash(i + o) * (1 - u) + hlHash(i + 1 + o) * u;
}
function hlFbm(x, seed = 0) {
  return hlNoise(x, seed) * 0.55 + hlNoise(x * 2.31, seed + 1) * 0.3 + hlNoise(x * 5.17, seed + 2) * 0.15;
}
/* A flame's breath: a restless flutter with, now and then, a gutter — the
   dip a candle takes when the air moves. k scales how much it moves at all. */
function hlFlicker(t, seed = 0, k = 1) {
  const flutter = 1 - hlFbm(t * 7.3 + seed * 13.1, seed);
  const gutter = Math.pow(hlNoise(t * 0.83 + seed * 3.7, seed + 9), 7);
  return clamp(1 - k * (0.24 * flutter + 0.55 * gutter), 0.12, 1.04);
}

const HL_EASE = {
  lin: t => t,
  in: t => t * t,
  out: t => 1 - (1 - t) * (1 - t),
  inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: t => t * t * t,
  out3: t => 1 - Math.pow(1 - t, 3),
  inOut3: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out5: t => 1 - Math.pow(1 - t, 5),
  smooth: t => t * t * (3 - 2 * t),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inBack: t => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
  outElastic: t => (t <= 0 || t >= 1 ? t
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  outBounce: t => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  step: t => (t < 1 ? 0 : 1),
  hold: () => 0
};
const hlEase = (name, t) => (HL_EASE[name] || HL_EASE.smooth)(clamp(t, 0, 1));
/* 0..1 across [a, b] of x, eased */
const hlSpan = (x, a, b, e) => hlEase(e || 'lin', (x - a) / (b - a || 1));

/* ================================== COLOUR ================================= */

const _hlHexC = new Map();
function hlHex(hex) {
  let c = _hlHexC.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    _hlHexC.set(hex, c);
  }
  return c;
}
const hlRgbS = (r, g, b, a = 1) =>
  `rgba(${clamp(r | 0, 0, 255)},${clamp(g | 0, 0, 255)},${clamp(b | 0, 0, 255)},${a})`;
function hlMix(a, b, t, al = 1) {
  const A = hlHex(a), B = hlHex(b);
  return hlRgbS(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t), al);
}
/* a colour scaled by a light: [r,g,b] in 0..~1.5 */
function hlLit(hex, L, al = 1) {
  const c = hlHex(hex);
  return hlRgbS(c[0] * L[0], c[1] * L[1], c[2] * L[2], al);
}

/* =================================== LIGHT =================================
   The room is drawn fully lit, then multiplied by a light buffer: filled with
   the ambient colour, with every light added into it. A light that casts
   shadows is drawn on its own first and has its shadows cut out of it, so one
   candle's shadow is only dark where no other candle reaches — the way two
   lamps in a real room work.

   Shadows are soft by sampling: the light is treated as a small disk, a
   shadow is cast from several points on it, and the samples are summed, so
   the edge is hard at the foot of a stone and opens into a penumbra away from
   it. A light has a height (z) and an occluder can have one (h): a low thing
   by a tall lamp throws a short shadow, a tall stone by a floor candle throws
   one right across the room.

   Order in a scene:
     1. everything that receives light (floor, props, bodies)
     2. hlLightRender()          — the multiply, then the hot pass
     3. emissive things, additive — flames, eyes, the lantern's core
     4. the game's post (bloom picks up what the light made bright)
   Things drawn after the pass can ask hlLightAt / hlLightDir for the light
   at a point, for rim light and tint.
=========================================================================== */

const hlL = {
  ambient: [10, 12, 22],     // what an unlit floor is multiplied by (0..255)
  lights: [],                // this frame's lights
  occ: [],                   // this frame's occluders
  samples: 5,                // shadow samples per light
  blur: 1.6,                 // device px, softening between samples
  hot: 0.32,                 // light squared, added back: pools glow
  far: 4000,                 // shadow length when nothing limits it
  buf: null, bufT: null, bufS: null, cL: null, cT: null, cS: null,
  w: 0, h: 0, on: true
};

/* Starts a frame's light. ambient is what the darkest corner is. */
function hlLightBegin(ambientHex = '#0a0c16', level = 1) {
  hlL.lights.length = 0;
  hlL.occ.length = 0;
  const c = hlHex(ambientHex);
  hlL.ambient = [c[0] * level, c[1] * level, c[2] * level];
}

/* A light, in world space.
     x, y     where it is
     r        how far it reaches
     col      its colour
     a        its strength (can exceed 1: overbright light glows in the hot pass)
     z        how high it hangs (default 60) — sets shadow length
     flick    0 steady … 1 candle; seed makes candles breathe differently
     shadow   false for fill lights that should cast nothing
     size     radius of the source disk, for the penumbra
     cone     { ang, spread, soft } for a spill through a door or from a lantern
   Returns the light, so a caller can read back .f, the flicker it drew with. */
function hlLight(o) {
  const L = Object.assign({ a: 1, z: 60, flick: 0, seed: 0, shadow: true, size: 5, col: '#ffffff' }, o);
  L.f = L.flick ? hlFlicker(uiTime, L.seed, L.flick) : 1;
  L.rr = L.r * (L.flick ? 0.93 + 0.09 * L.f : 1);
  hlL.lights.push(L);
  return L;
}

/* Occluders. h is height; leave it out for walls and anything tall. */
function hlOccCircle(x, y, r, h = Infinity) { hlL.occ.push({ k: 0, x, y, r, h }); }
function hlOccSeg(x1, y1, x2, y2, h = Infinity) { hlL.occ.push({ k: 1, x1, y1, x2, y2, h }); }
function hlOccPoly(pts, h = Infinity) {          // [x0,y0,x1,y1,...], closed
  for (let i = 0; i < pts.length; i += 2) {
    const j = (i + 2) % pts.length;
    hlL.occ.push({ k: 1, x1: pts[i], y1: pts[i + 1], x2: pts[j], y2: pts[j + 1], h });
  }
}

/* The falloff every light is drawn with, as data, so the CPU sample
   (hlLightAt) and the sprite agree about how bright a point is. */
const HL_FALL = [[0, 1], [0.06, 0.92], [0.16, 0.7], [0.3, 0.44], [0.48, 0.22],
                 [0.66, 0.09], [0.84, 0.025], [1, 0]];
function hlFall(u) {
  if (u <= 0) return 1;
  if (u >= 1) return 0;
  for (let i = 1; i < HL_FALL.length; i++) {
    if (u <= HL_FALL[i][0]) {
      const a = HL_FALL[i - 1], b = HL_FALL[i];
      return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0]));
    }
  }
  return 0;
}
const _hlSpr = new Map();
function hlLightSprite(hex) {
  let s = _hlSpr.get(hex);
  if (s) return s;
  const S = 512;
  s = document.createElement('canvas'); s.width = s.height = S;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  const c = hlHex(hex);
  for (const [u, v] of HL_FALL) gr.addColorStop(u, `rgba(${c[0]},${c[1]},${c[2]},${v})`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  _hlSpr.set(hex, s);
  return s;
}

function hlLightEnsure() {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (hlL.buf && hlL.w === w && hlL.h === h) return;
  const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  hlL.buf = mk(); hlL.bufT = mk(); hlL.bufS = mk();
  hlL.cL = hlL.buf.getContext('2d');
  hlL.cT = hlL.bufT.getContext('2d');
  hlL.cS = hlL.bufS.getContext('2d');
  hlL.w = w; hlL.h = h;
}

/* One shadow polygon, from a point, pushed into the current path of g.
   Every quad is wound the same way so a nonzero fill unions them. */
function _hlQuad(g, ax, ay, bx, by, cx, cy, dx, dy) {
  const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay) + (cx - ax) * (dy - ay) - (dx - ax) * (cy - ay);
  if (area < 0) { g.moveTo(ax, ay); g.lineTo(dx, dy); g.lineTo(cx, cy); g.lineTo(bx, by); }
  else          { g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo(cx, cy); g.lineTo(dx, dy); }
  g.closePath();
}
function _hlLen(L, h, d) {
  // how far a shadow reaches: unlimited if the thing is as tall as the light
  if (!(h < L.z)) return hlL.far;
  return Math.min(hlL.far, d * h / (L.z - h));
}
function _hlShadowPath(g, L, px, py) {
  for (const o of hlL.occ) {
    if (o.k === 0) {
      const dx = o.x - px, dy = o.y - py, d = Math.hypot(dx, dy);
      if (d <= o.r + 0.5 || d - o.r > L.rr) continue;
      const base = Math.atan2(dy, dx), al = Math.acos(o.r / d);
      const t1x = o.x + Math.cos(base + Math.PI + al) * o.r, t1y = o.y + Math.sin(base + Math.PI + al) * o.r;
      const t2x = o.x + Math.cos(base + Math.PI - al) * o.r, t2y = o.y + Math.sin(base + Math.PI - al) * o.r;
      const ln = _hlLen(L, o.h, d);
      const e1 = Math.hypot(t1x - px, t1y - py) || 1, e2 = Math.hypot(t2x - px, t2y - py) || 1;
      _hlQuad(g, t1x, t1y,
        t1x + (t1x - px) / e1 * ln, t1y + (t1y - py) / e1 * ln,
        t2x + (t2x - px) / e2 * ln, t2y + (t2y - py) / e2 * ln,
        t2x, t2y);
      if (o.h < L.z) {
        // a short shadow ends round, not square
        const ex = o.x + dx / d * ln, ey = o.y + dy / d * ln;
        g.moveTo(ex + o.r, ey); g.arc(ex, ey, o.r, 0, TAU); g.closePath();
      }
    } else {
      const mx = (o.x1 + o.x2) / 2, my = (o.y1 + o.y2) / 2;
      const hl = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) / 2;
      const dm = Math.hypot(mx - px, my - py);
      if (dm - hl > L.rr) continue;
      const e1 = Math.hypot(o.x1 - px, o.y1 - py) || 1, e2 = Math.hypot(o.x2 - px, o.y2 - py) || 1;
      const l1 = _hlLen(L, o.h, e1), l2 = _hlLen(L, o.h, e2);
      _hlQuad(g, o.x1, o.y1,
        o.x1 + (o.x1 - px) / e1 * l1, o.y1 + (o.y1 - py) / e1 * l1,
        o.x2 + (o.x2 - px) / e2 * l2, o.y2 + (o.y2 - py) / e2 * l2,
        o.x2, o.y2);
    }
  }
}

function _hlDrawLight(g, L) {
  const spr = hlLightSprite(L.col);
  const rr = L.rr;
  g.globalAlpha = Math.min(1, L.a * L.f);
  if (L.cone) {
    const { ang, spread, soft = 0.35 } = L.cone;
    // the wedge, feathered: three nested wedges at rising alpha
    const base = g.globalAlpha;
    for (let k = 0; k < 3; k++) {
      const sp = spread * (1 + soft * (1 - k / 2));
      g.save();
      g.beginPath(); g.moveTo(L.x, L.y);
      g.arc(L.x, L.y, rr, ang - sp, ang + sp);
      g.closePath(); g.clip();
      g.globalAlpha = base / 3;
      g.drawImage(spr, L.x - rr, L.y - rr, rr * 2, rr * 2);
      g.restore();
    }
    g.globalAlpha = base;
  } else {
    g.drawImage(spr, L.x - rr, L.y - rr, rr * 2, rr * 2);
  }
  // overbright: a light stronger than 1 draws again, tighter
  if (L.a * L.f > 1) {
    g.globalAlpha = Math.min(1, L.a * L.f - 1);
    g.drawImage(spr, L.x - rr * 0.55, L.y - rr * 0.55, rr * 1.1, rr * 1.1);
  }
  g.globalAlpha = 1;
}

/* Call with the WORLD transform active on ctx. */
function hlLightRender() {
  if (!hlL.on) return;
  hlLightEnsure();
  const m = ctx.getTransform();
  const { cL, cT, cS, w, h } = hlL;
  const A = hlL.ambient;

  cL.setTransform(1, 0, 0, 1, 0, 0);
  cL.globalCompositeOperation = 'copy';
  cL.fillStyle = hlRgbS(A[0], A[1], A[2]);
  cL.fillRect(0, 0, w, h);
  cL.globalCompositeOperation = 'lighter';

  const N = Math.max(1, hlL.samples);
  for (const L of hlL.lights) {
    if (L.a * L.f <= 0.002) continue;
    const casts = L.shadow && hlL.occ.length;
    if (!casts) {
      cL.setTransform(m);
      _hlDrawLight(cL, L);
      continue;
    }
    // the light, alone
    cT.setTransform(1, 0, 0, 1, 0, 0);
    cT.globalCompositeOperation = 'source-over';
    cT.clearRect(0, 0, w, h);
    cT.setTransform(m);
    _hlDrawLight(cT, L);
    // its shadows, summed from points across the source disk
    cS.setTransform(1, 0, 0, 1, 0, 0);
    cS.globalCompositeOperation = 'source-over';
    cS.clearRect(0, 0, w, h);
    cS.setTransform(m);
    cS.globalCompositeOperation = 'lighter';
    cS.fillStyle = `rgba(0,0,0,${1 / N})`;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * TAU + L.seed, s = N === 1 ? 0 : L.size;
      cS.beginPath();
      _hlShadowPath(cS, L, L.x + Math.cos(a) * s, L.y + Math.sin(a) * s);
      cS.fill();
    }
    // cut them out of the light, then add what is left to the room
    cT.setTransform(1, 0, 0, 1, 0, 0);
    cT.globalCompositeOperation = 'destination-out';
    if (hlL.blur > 0) cT.filter = `blur(${hlL.blur * (typeof DPR === 'number' ? DPR : 1)}px)`;
    cT.drawImage(hlL.bufS, 0, 0);
    cT.filter = 'none';
    cT.globalCompositeOperation = 'source-over';
    cL.setTransform(1, 0, 0, 1, 0, 0);
    cL.drawImage(hlL.bufT, 0, 0);
  }
  cL.globalCompositeOperation = 'source-over';

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(hlL.buf, 0, 0);
  if (hlL.hot > 0) {
    // light squared: pools go warm and bright without lifting the dark
    cT.setTransform(1, 0, 0, 1, 0, 0);
    cT.globalCompositeOperation = 'copy';
    cT.drawImage(hlL.buf, 0, 0);
    cT.globalCompositeOperation = 'multiply';
    cT.drawImage(hlL.buf, 0, 0);
    cT.globalCompositeOperation = 'source-over';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = hlL.hot;
    ctx.drawImage(hlL.bufT, 0, 0);
  }
  ctx.restore();
}

/* ---- the same light, asked about on the CPU ---- */
function _hlSegHit(ax, ay, bx, by, cx, cy, dx, dy) {
  const r = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(r) < 1e-9) return false;
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / r;
  const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / r;
  return u > 0.001 && u < 0.999 && v >= 0 && v <= 1;
}
function _hlBlocked(L, x, y) {
  for (const o of hlL.occ) {
    if (o.k === 0) {
      // skip the occluder the point is standing on
      if (Math.hypot(x - o.x, y - o.y) <= o.r) continue;
      const dx = x - L.x, dy = y - L.y, l2 = dx * dx + dy * dy || 1;
      const t = clamp(((o.x - L.x) * dx + (o.y - L.y) * dy) / l2, 0, 1);
      if (Math.hypot(L.x + dx * t - o.x, L.y + dy * t - o.y) < o.r && t < 0.999) {
        if (!(o.h < L.z)) return true;
        const dOcc = Math.hypot(o.x - L.x, o.y - L.y);
        if (Math.hypot(x - o.x, y - o.y) < _hlLen(L, o.h, dOcc)) return true;
      }
    } else if (_hlSegHit(L.x, L.y, x, y, o.x1, o.y1, o.x2, o.y2)) return true;
  }
  return false;
}
/* The light at a point, as [r, g, b] multipliers (1 = fully lit). */
function hlLightAt(x, y, shadows = true) {
  const A = hlL.ambient, out = [A[0] / 255, A[1] / 255, A[2] / 255];
  for (const L of hlL.lights) {
    const d = Math.hypot(x - L.x, y - L.y);
    if (d >= L.rr) continue;
    if (L.cone) {
      let da = Math.atan2(y - L.y, x - L.x) - L.cone.ang;
      da = Math.abs(Math.atan2(Math.sin(da), Math.cos(da)));
      if (da > L.cone.spread * (1 + (L.cone.soft || 0.35))) continue;
    }
    if (shadows && L.shadow && _hlBlocked(L, x, y)) continue;
    const k = hlFall(d / L.rr) * L.a * L.f, c = hlHex(L.col);
    out[0] += c[0] / 255 * k; out[1] += c[1] / 255 * k; out[2] += c[2] / 255 * k;
  }
  return out;
}
/* Where the light at a point is coming from, weighted by how much of it each
   source gives: { x, y } unit vector toward the light, and k its strength.
   For rim light on anything drawn after the pass. */
function hlLightDir(x, y, shadows = true) {
  let vx = 0, vy = 0, k = 0, col = null, best = 0;
  for (const L of hlL.lights) {
    const d = Math.hypot(x - L.x, y - L.y);
    if (d >= L.rr || d < 0.001) continue;
    if (shadows && L.shadow && _hlBlocked(L, x, y)) continue;
    const w = hlFall(d / L.rr) * L.a * L.f;
    vx += (L.x - x) / d * w; vy += (L.y - y) / d * w; k += w;
    if (w > best) { best = w; col = L.col; }
  }
  const l = Math.hypot(vx, vy) || 1;
  return { x: vx / l, y: vy / l, k, col: col || '#ffffff' };
}

/* The room's grade: laid over the finished world before the post. mul tints
   everything, lift raises the blacks toward a colour (so the dark has a hue
   rather than being dead), and edge darkens the frame toward its own colour. */
function hlGrade(o) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (o.mul) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = o.mul; ctx.fillRect(0, 0, w, h);
  }
  if (o.lift) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = o.liftA === undefined ? 0.06 : o.liftA;
    ctx.fillStyle = o.lift; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  if (o.edge) {
    const r = Math.hypot(w, h) * 0.5;
    const g = ctx.createRadialGradient(w / 2, h / 2, r * (o.edgeIn || 0.3), w / 2, h / 2, r);
    g.addColorStop(0, rgba(o.edge, 0));
    g.addColorStop(1, rgba(o.edge, o.edgeA === undefined ? 0.55 : o.edgeA));
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* ============================== CLOTH & ROPE ===============================
   Verlet: every point remembers where it was, moves by the difference, and
   the constraints drag the points back to their rest lengths a few times a
   frame. That is the whole method, and it gives sheets that fold, vines that
   drag and a cord that whips, without anything being animated by hand.

   A constraint can be given a tear ratio: stretched past it, it breaks, and
   stays broken. A cloth is drawn cell by cell and a cell with a broken edge
   is not drawn, so tearing a sheet is simply pulling on it.
=========================================================================== */

function hlVBody(o = {}) {
  return { p: [], c: [], gx: o.gx || 0, gy: o.gy === undefined ? 900 : o.gy,
           damp: o.damp === undefined ? 0.985 : o.damp, iters: o.iters || 8,
           cols: 0, rows: 0, circles: [] };
}
function hlVPoint(b, x, y, pin = false) {
  const q = { x, y, px: x, py: y, pin, ox: x, oy: y };
  b.p.push(q);
  return b.p.length - 1;
}
function hlVLink(b, i, j, o = {}) {
  const a = b.p[i], c = b.p[j];
  b.c.push({ a: i, b: j, rest: o.rest || Math.hypot(c.x - a.x, c.y - a.y), k: o.k === undefined ? 1 : o.k,
             tear: o.tear || 0, alive: true, shear: !!o.shear });
}
/* A rope hanging from (x, y) along ang, n points spaced seg apart. */
function hlRope(x, y, n, seg, o = {}) {
  const b = hlVBody(o), ang = o.ang === undefined ? Math.PI / 2 : o.ang;
  for (let i = 0; i < n; i++)
    hlVPoint(b, x + Math.cos(ang) * seg * i, y + Math.sin(ang) * seg * i, i === 0 && o.pinHead !== false);
  for (let i = 0; i < n - 1; i++) hlVLink(b, i, i + 1, { tear: o.tear, k: o.k });
  if (o.pinTail) b.p[n - 1].pin = true;
  return b;
}
/* A cloth, cols × rows points, top-left at (x, y). pin: 'top' | 'corners' |
   an array of point indices. Shear links keep it from folding into a line. */
function hlCloth(x, y, cols, rows, seg, o = {}) {
  const b = hlVBody(o);
  b.cols = cols; b.rows = rows; b.seg = seg;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) hlVPoint(b, x + c * seg, y + r * seg * (o.squash || 1));
  const id = (c, r) => r * cols + c;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c < cols - 1) hlVLink(b, id(c, r), id(c + 1, r), { rest: seg, tear: o.tear, k: o.k });
    if (r < rows - 1) hlVLink(b, id(c, r), id(c, r + 1), { rest: seg, tear: o.tear, k: o.k });
    if (o.shear !== false && c < cols - 1 && r < rows - 1) {
      hlVLink(b, id(c, r), id(c + 1, r + 1), { rest: seg * Math.SQRT2, k: 0.4, shear: true, tear: o.tear });
      hlVLink(b, id(c + 1, r), id(c, r + 1), { rest: seg * Math.SQRT2, k: 0.4, shear: true, tear: o.tear });
    }
  }
  const pin = o.pin || 'top';
  if (pin === 'top') for (let c = 0; c < cols; c++) b.p[id(c, 0)].pin = true;
  else if (pin === 'corners') { b.p[id(0, 0)].pin = true; b.p[id(cols - 1, 0)].pin = true; }
  else if (Array.isArray(pin)) for (const i of pin) b.p[i].pin = true;
  // where each pinned point sits relative to the first, for hlVCarry
  const p0 = b.p[0];
  for (const q of b.p) { q.ox = q.x - p0.x; q.oy = q.y - p0.y; }
  return b;
}
/* One step. wind(x, y) → [ax, ay] is optional, in px/s². */
function hlVStep(b, dt, wind) {
  dt = Math.min(dt, 1 / 30);
  if (dt <= 0) return;
  const dt2 = dt * dt, d = Math.pow(b.damp, dt * 60);
  for (const q of b.p) {
    if (q.pin) { q.px = q.x; q.py = q.y; continue; }
    let ax = b.gx, ay = b.gy;
    if (wind) { const w = wind(q.x, q.y); ax += w[0]; ay += w[1]; }
    const vx = (q.x - q.px) * d, vy = (q.y - q.py) * d;
    q.px = q.x; q.py = q.y;
    q.x += vx + ax * dt2; q.y += vy + ay * dt2;
  }
  for (let it = 0; it < b.iters; it++) {
    for (const c of b.c) {
      if (!c.alive) continue;
      const a = b.p[c.a], e = b.p[c.b];
      const dx = e.x - a.x, dy = e.y - a.y, l = Math.hypot(dx, dy) || 1e-6;
      if (c.tear && l > c.rest * c.tear) { c.alive = false; continue; }
      const diff = (l - c.rest) / l * c.k;
      const wa = a.pin ? 0 : e.pin ? 1 : 0.5, we = e.pin ? 0 : a.pin ? 1 : 0.5;
      a.x += dx * diff * wa; a.y += dy * diff * wa;
      e.x -= dx * diff * we; e.y -= dy * diff * we;
    }
    for (const s of b.circles) for (const q of b.p) {
      if (q.pin) continue;
      const dx = q.x - s.x, dy = q.y - s.y, l = Math.hypot(dx, dy);
      if (l < s.r && l > 0) { q.x = s.x + dx / l * s.r; q.y = s.y + dy / l * s.r; }
    }
  }
}
/* Moves a pinned point (carrying its velocity, so a swung rope swings). */
function hlVPin(b, i, x, y) { const q = b.p[i]; q.pin = true; q.x = x; q.y = y; }
/* Moves every pinned point of a cloth together, keeping their layout. */
function hlVCarry(b, x, y) { for (const q of b.p) if (q.pin) { q.x = x + q.ox; q.y = y + q.oy; } }
function hlVRelease(b, i) { b.p[i].pin = false; }
/* Breaks every link whose middle is within r of (x, y). */
function hlVTear(b, x, y, r) {
  let n = 0;
  for (const c of b.c) {
    if (!c.alive) continue;
    const a = b.p[c.a], e = b.p[c.b];
    if (Math.hypot((a.x + e.x) / 2 - x, (a.y + e.y) / 2 - y) < r) { c.alive = false; n++; }
  }
  return n;
}
/* A shove: every point within r gets a kick, falling off to the edge. */
function hlVKick(b, x, y, r, fx, fy) {
  for (const q of b.p) {
    if (q.pin) continue;
    const d = Math.hypot(q.x - x, q.y - y);
    if (d < r) { const k = 1 - d / r; q.px -= fx * k; q.py -= fy * k; }
  }
}

/* A rope as a ribbon: a smooth centreline, tapering from w0 to w1. */
function hlDrawRope(b, o = {}) {
  const P = b.p, n = P.length;
  if (n < 2) return;
  const w0 = o.w0 === undefined ? 2 : o.w0, w1 = o.w1 === undefined ? w0 : o.w1;
  // a smoothed centreline: midpoints of the verlet points, with the ends kept
  const C = [[P[0].x, P[0].y]];
  for (let i = 0; i < n - 1; i++) C.push([(P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2]);
  C.push([P[n - 1].x, P[n - 1].y]);
  const L = [], R = [];
  for (let i = 0; i < C.length; i++) {
    const a = C[Math.max(0, i - 1)], c = C[Math.min(C.length - 1, i + 1)];
    let tx = c[0] - a[0], ty = c[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const u = i / (C.length - 1), w = lerp(w0, w1, o.ease ? hlEase(o.ease, u) : u) / 2;
    L.push([C[i][0] - ty * w, C[i][1] + tx * w]);
    R.push([C[i][0] + ty * w, C[i][1] - tx * w]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i < L.length; i++) ctx.lineTo(L[i][0], L[i][1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  if (o.fill !== false) { ctx.fillStyle = o.col || '#94a3b8'; ctx.fill(); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.lw || 1; ctx.stroke(); }
  return C;
}
/* A cloth, cell by cell. Each cell is shaded by how squeezed it is — a fold
   gathers darker, a stretch goes pale — and, if lit is set, by the light at
   its middle. Torn cells are skipped; the edges they leave are frayed. */
function hlDrawCloth(b, o = {}) {
  const { cols, rows } = b, P = b.p, seg = b.seg;
  const id = (c, r) => r * cols + c;
  const alive = new Map();
  for (const c of b.c) if (!c.shear) alive.set(c.a * 1e5 + c.b, c.alive);
  const edge = (i, j) => alive.get(Math.min(i, j) * 1e5 + Math.max(i, j)) !== false;
  const col = o.col || '#e2e8f0', dark = o.dark || '#1e293b', hi = o.hi || '#ffffff';
  const rest = seg * seg;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let r = 0; r < rows - 1; r++) for (let c = 0; c < cols - 1; c++) {
    const i0 = id(c, r), i1 = id(c + 1, r), i2 = id(c + 1, r + 1), i3 = id(c, r + 1);
    if (!edge(i0, i1) || !edge(i1, i2) || !edge(i3, i2) || !edge(i0, i3)) continue;
    const a = P[i0], e = P[i1], f = P[i2], g = P[i3];
    const area = Math.abs((e.x - a.x) * (g.y - a.y) - (g.x - a.x) * (e.y - a.y)
                        + (f.x - e.x) * (g.y - e.y) - (g.x - e.x) * (f.y - e.y)) / 2;
    const squeeze = clamp(area / rest, 0.15, 1.4);
    // which way the cell leans: a fold facing away reads darker
    const lean = clamp(((f.y + g.y) - (a.y + e.y)) / (2 * seg), 0, 1.3);
    let k = clamp(0.35 + squeeze * 0.5 + (lean - 1) * 0.35 + (o.bias || 0), 0, 1);
    let fill = k < 0.75 ? hlMix(dark, col, k / 0.75) : hlMix(col, hi, (k - 0.75) / 0.25);
    if (o.lit) {
      const L = hlLightAt((a.x + f.x) / 2, (a.y + f.y) / 2, o.litShadows !== false);
      const cc = fill.match(/\d+(\.\d+)?/g).map(Number);
      fill = hlRgbS(cc[0] * L[0], cc[1] * L[1], cc[2] * L[2]);
    }
    ctx.fillStyle = fill;
    ctx.strokeStyle = fill; ctx.lineWidth = 0.8;       // closes the hairline seams
    ctx.globalAlpha = o.a === undefined ? 1 : o.a;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(e.x, e.y); ctx.lineTo(f.x, f.y); ctx.lineTo(g.x, g.y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // frayed edges where it tore
  if (o.fray !== false) {
    ctx.globalAlpha = (o.a === undefined ? 1 : o.a) * 0.8;
    ctx.strokeStyle = o.frayCol || col; ctx.lineWidth = 0.9;
    for (const c of b.c) {
      if (c.alive || c.shear) continue;
      const a = P[c.a], e = P[c.b];
      const mx = (a.x + e.x) / 2, my = (a.y + e.y) / 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, mx, 0.7) + (hlHash(c.a) - 0.5) * 3, lerp(a.y, my, 0.7) + (hlHash(c.a + 7) - 0.5) * 3);
      ctx.moveTo(e.x, e.y); ctx.lineTo(lerp(e.x, mx, 0.7) + (hlHash(c.b) - 0.5) * 3, lerp(e.y, my, 0.7) + (hlHash(c.b + 7) - 0.5) * 3);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* =================================== RIG ===================================
   Springs for secondary motion, two-bone IK for anything that reaches, and a
   chain that follows its root with lag — the three things hand-animated
   pieces keep having to reinvent.
=========================================================================== */

/* A damped spring toward .to. k stiffness, d damping; d = 2√k is critical. */
function hlSpring(v = 0, k = 140, d = 16) {
  return {
    v, vel: 0, to: v, k, d,
    step(dt) {
      dt = Math.min(dt, 1 / 30);
      this.vel += ((this.to - this.v) * this.k - this.vel * this.d) * dt;
      this.v += this.vel * dt;
      return this.v;
    },
    kick(i) { this.vel += i; return this; },
    snap(v) { this.v = this.to = v; this.vel = 0; return this; }
  };
}
function hlSpring2(x = 0, y = 0, k = 140, d = 16) {
  const s = { x: hlSpring(x, k, d), y: hlSpring(y, k, d) };
  s.step = (dt, tx, ty) => {
    if (tx !== undefined) { s.x.to = tx; s.y.to = ty; }
    s.x.step(dt); s.y.step(dt);
    return s;
  };
  return s;
}
/* Two bones from a root to a target. bend ±1 picks which way the joint goes.
   The target is pulled in if it is out of reach. */
function hlIK(ax, ay, tx, ty, l1, l2, bend = 1) {
  let dx = tx - ax, dy = ty - ay, d = Math.hypot(dx, dy);
  const max = (l1 + l2) * 0.9999, min = Math.abs(l1 - l2) + 0.001;
  const dc = clamp(d, min, max);
  if (d > 0) { dx = dx / d * dc; dy = dy / d * dc; } else { dx = dc; dy = 0; }
  const base = Math.atan2(dy, dx);
  const cosA = clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1);
  const a1 = base - Math.acos(cosA) * bend;
  const ex = ax + Math.cos(a1) * l1, ey = ay + Math.sin(a1) * l1;
  return { ex, ey, hx: ax + dx, hy: ay + dy, a1, a2: Math.atan2(ay + dy - ey, ax + dx - ex) };
}
/* A chain that trails its root: each link turns toward its parent's heading
   on a spring, so a flick at the root travels down the length. */
function hlChain(n, seg, o = {}) {
  const ch = {
    n, seg, stiff: o.stiff || 60, damp: o.damp || 9, droop: o.droop || 0,
    ang: new Array(n).fill(o.ang || 0), vel: new Array(n).fill(0),
    pts: new Array(n + 1).fill(0).map(() => ({ x: 0, y: 0 })),
    step(x, y, rootAng, dt) {
      dt = Math.min(dt, 1 / 30);
      let parent = rootAng;
      this.pts[0].x = x; this.pts[0].y = y;
      for (let i = 0; i < this.n; i++) {
        let d = parent + this.droop * (i + 1) / this.n - this.ang[i];
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const k = this.stiff / (1 + i * 0.35);
        this.vel[i] += (d * k - this.vel[i] * this.damp) * dt;
        this.ang[i] += this.vel[i] * dt;
        const p = this.pts[i], q = this.pts[i + 1];
        q.x = p.x + Math.cos(this.ang[i]) * this.seg;
        q.y = p.y + Math.sin(this.ang[i]) * this.seg;
        parent = this.ang[i];
      }
      return this.pts;
    }
  };
  return ch;
}
/* squash and stretch from a speed: long along the motion, thin across it,
   area kept. */
function hlStretch(speed, k = 0.0016, max = 0.45) {
  const s = 1 + clamp(speed * k, 0, max);
  return { along: s, across: 1 / Math.sqrt(s) };
}
/* blends two poses (plain objects of numbers) */
function hlPose(a, b, t) {
  const o = {};
  for (const k in a) o[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? lerp(a[k], b[k], t) : (t < 0.5 ? a[k] : b[k]);
  return o;
}

/* ================================= TIMELINE ================================
   A scene is data: named tracks of keys, and cues. Every value is a pure
   function of the clock — nothing accumulates — so the scene can be dragged
   to any frame and it is exactly that frame, which is what the harness's
   scrubber relies on. Only 'call' cues do anything, and only when the clock
   passes them going forwards in play (never while scrubbing).

   def = {
     len: 12,
     tracks: {
       camX:  [[0, 0], [2.5, 140, 'inOut3'], [6, 140], [7, 0, 'out3']],
       rise:  [[3, 0], [4.2, 1, 'outBack']],
       ...                      // [time, value, ease into this key]
     },
     cues: [
       { at: 0.4, say: 'outsider', text: 'It is a run.', dur: 3.2 },
       { at: 5.1, shake: 0.6 },                // decays on its own
       { at: 6.0, span: 'door', dur: 1.4 },    // tl.s('door') → 0..1
       { at: 9.0, call: () => … },
     ]
   }
=========================================================================== */

function hlTimeline(def) {
  const tl = {
    len: def.len || 0, tracks: def.tracks || {}, cues: (def.cues || []).slice().sort((a, b) => a.at - b.at),
    t: 0, playing: true, speed: 1, done: false, name: def.name || 'scene',
    /* the value of a track now */
    v(name, dflt = 0) {
      const k = this.tracks[name];
      if (!k || !k.length) return dflt;
      const t = this.t;
      if (t <= k[0][0]) return k[0][1];
      for (let i = 1; i < k.length; i++) {
        if (t < k[i][0]) {
          const a = k[i - 1], b = k[i];
          return lerp(a[1], b[1], hlEase(b[2] || 'smooth', (t - a[0]) / (b[0] - a[0])));
        }
      }
      return k[k.length - 1][1];
    },
    /* progress through a named span cue, 0 before it and 1 after */
    s(name, e) {
      for (const c of this.cues) if (c.span === name) return hlEase(e || 'lin', (this.t - c.at) / (c.dur || 1));
      return 0;
    },
    /* seconds since a named mark (−1 if not yet reached) */
    since(name) {
      let best = -1;
      for (const c of this.cues) if (c.mark === name && this.t >= c.at) best = this.t - c.at;
      return best;
    },
    /* the line being spoken now: { who, text, age, dur, cue } or null */
    line(who) {
      let out = null;
      for (const c of this.cues) {
        if (!c.say || (who && c.say !== who)) continue;
        if (this.t >= c.at && this.t < c.at + (c.dur || 3)) out = { who: c.say, text: c.text, age: this.t - c.at, dur: c.dur || 3, cue: c };
      }
      return out;
    },
    /* camera shake from shake cues, as an offset; seeded so it scrubs */
    shake(amp = 12) {
      let x = 0, y = 0;
      for (const c of this.cues) {
        if (!c.shake || this.t < c.at) continue;
        const age = this.t - c.at, life = c.life || 0.6;
        if (age > life) continue;
        const k = c.shake * Math.pow(1 - age / life, 2) * amp;
        x += (hlNoise(age * 38 + c.at * 7, 3) - 0.5) * 2 * k;
        y += (hlNoise(age * 38 + c.at * 7, 5) - 0.5) * 2 * k;
      }
      return { x, y };
    },
    tick(dt) {
      if (!this.playing || this.done) return;
      const t0 = this.t;
      this.t = Math.min(this.len, this.t + dt * this.speed);
      for (const c of this.cues) if (c.call && c.at > t0 && c.at <= this.t) c.call(this);
      if (this.t >= this.len) { this.done = true; if (def.onEnd) def.onEnd(this); }
    },
    seek(t) { this.t = clamp(t, 0, this.len); this.done = this.t >= this.len; },
    restart() { this.t = 0; this.done = false; this.playing = true; },
    skip() { this.tick(this.len - this.t + 1e-6); }
  };
  return tl;
}

/* ================================= DIALOGUE ================================
   One presentation with a voice per speaker. Every line is typed as a pure
   function of its age, so it scrubs with the scene.

   The soul types unevenly — a stall on every ellipsis, a catch now and then,
   letters surfacing rather than appearing — and its `steady` (0 at first,
   rising with each ascension) takes the unevenness out of it. The outsider
   types flat and even, the way the hub already has him.
=========================================================================== */

const HL_VOICE = {
  outsider: { tag: 'OUTSIDE', col: '#dbe3ec', tagCol: '#94a3b8', cps: 26, font: "400 19px Barlow, 'Segoe UI', system-ui, sans-serif" },
  soul:     { tag: '',        col: '#cfe8ff', tagCol: '#a5b4fc', cps: 15, font: "400 19px Barlow, 'Segoe UI', system-ui, sans-serif", uneven: true },
  sys:      { tag: '',        col: '#94a3b8', tagCol: '#64748b', cps: 40, font: "600 13px 'JetBrains Mono', ui-monospace, monospace" }
};

/* When each character of a line lands, in seconds from the line's start. */
function hlTypeTimes(text, voice, steady = 0) {
  const v = HL_VOICE[voice] || HL_VOICE.outsider, out = [];
  let t = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let d = 1 / v.cps;
    if (v.uneven) {
      const un = 1 - steady;
      d *= 1 + (hlHash(i * 3.1 + text.length) - 0.5) * 1.2 * un;
      if (ch === '.' && text[i + 1] === '.') d += 0.05 * un;
      if (ch === '.' && text[i + 1] !== '.') d += 0.34 * un + 0.12;
      if (ch === ',') d += 0.16;
      if (hlHash(i * 7.7 + 1) < 0.06 * un) d += 0.28;          // a catch
    } else {
      if (ch === '.' || ch === ',') d += 0.08;
    }
    out.push(t);
    t += Math.max(0.012, d);
  }
  out.push(t);
  return out;
}
/* Draws a line as a subtitle across the bottom, in the hub's grammar: a plate
   with one hairline, the speaker's tag above, the words below. */
function hlSayDraw(line, o = {}) {
  if (!line) return;
  const v = HL_VOICE[line.who] || HL_VOICE.outsider;
  const steady = o.steady || 0;
  const times = line.cue && line.cue._tt && line.cue._st === steady ? line.cue._tt
    : hlTypeTimes(line.text, line.who, steady);
  if (line.cue) { line.cue._tt = times; line.cue._st = steady; }
  const fadeOut = clamp((line.dur - line.age) / 0.35, 0, 1);
  const y = o.y === undefined ? H - 118 : o.y;
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (o.plate !== false) {
    const bg = ctx.createLinearGradient(0, y - 46, 0, H);
    bg.addColorStop(0, 'rgba(4,6,11,0)');
    bg.addColorStop(0.35, `rgba(4,6,11,${0.88 * fadeOut})`);
    bg.addColorStop(1, `rgba(4,6,11,${0.96 * fadeOut})`);
    ctx.fillStyle = bg; ctx.fillRect(0, y - 46, W, H - y + 46);
    ctx.fillStyle = rgba(v.tagCol, 0.14 * fadeOut); ctx.fillRect(0, y - 46, W, 1);
  }
  let x = o.x === undefined ? Math.max(48, W / 2 - 430) : o.x;
  /* A portrait, if the art draws one (hlSayPortrait, in the art hooks): it
     takes the left of the plate and hands back how much room it used. */
  if (o.portrait !== false && typeof hlSayPortrait === 'function') {
    const typing = line.age < times[times.length - 1];
    x += hlSayPortrait(line, x, y, { fade: fadeOut, steady, typing }) || 0;
  }
  if (v.tag) {
    ctx.font = "700 9px Barlow, 'Segoe UI', system-ui, sans-serif";
    ctx.letterSpacing = '0.3em';
    ctx.fillStyle = rgba(v.tagCol, 0.5 * fadeOut);
    ctx.fillText(v.tag, x, y - 18);
    ctx.letterSpacing = '0em';
  }
  ctx.font = v.font;
  let cx = x, shown = 0;
  for (let i = 0; i < line.text.length; i++) {
    const ch = line.text[i], w = ctx.measureText(ch).width;
    const age = line.age - times[i];
    if (age < 0) break;
    shown = i + 1;
    let a = 1, dy = 0, dx = 0;
    if (v.uneven) {
      // letters surface: rise a little and sharpen in, and never quite settle
      const un = 1 - steady, k = clamp(age / 0.22, 0, 1);
      a = k * (0.82 + 0.18 * hlNoise(uiTime * 3 + i, 4));
      dy = (1 - HL_EASE.out3(k)) * 6 + (hlNoise(uiTime * 1.7 + i * 0.37, 8) - 0.5) * 1.6 * un;
      dx = (hlNoise(uiTime * 1.3 + i * 0.51, 11) - 0.5) * 1.1 * un;
      // the older the fragment, the fainter its tail
      if (un > 0 && i > line.text.length - 4 && line.text.endsWith('.')) a *= 0.7 + 0.3 * steady;
    }
    ctx.globalAlpha = a * fadeOut;
    ctx.fillStyle = v.col;
    ctx.fillText(ch, cx + dx, y + 12 + dy);
    cx += w;
  }
  ctx.globalAlpha = fadeOut;
  if (shown < line.text.length && !v.uneven && Math.sin(uiTime * 14) > 0) {
    ctx.fillStyle = rgba(v.tagCol, 0.8);
    ctx.fillRect(cx + 4, y - 2, 8, 16);
  }
  ctx.restore();
}
/* Letterbox bars, k 0..1. */
function hlLetterbox(k, h = 0.11) {
  if (k <= 0) return;
  const b = H * h * HL_EASE.inOut3(clamp(k, 0, 1));
  ctx.save();
  ctx.setTransform(typeof DPR === 'number' ? DPR : 1, 0, 0, typeof DPR === 'number' ? DPR : 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b);
  ctx.restore();
}
/* A full-screen fade toward a colour. */
function hlFade(k, col = '#000000') {
  if (k <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(k, 0, 1);
  ctx.fillStyle = col;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/* ================================ PARTICLES ================================
   One pool, many kinds. A kind is a spawn, a step and a draw; the step and
   draw are looked up per particle, so a new kind is one table entry. Two
   layers: 'lit' is drawn before the light pass and is lit like the floor
   (smoke, dirt, leaves, moths), 'glow' is drawn after, additively (embers,
   sparks, wisps).
=========================================================================== */

const hlParts = [];
const HL_PART_MAX = 2400;
const HL_PART = {
  /* a spark off a flame: rises, drifts, winks out */
  ember: {
    layer: 'glow',
    make: (q, o) => { q.vx = rnd(-14, 14) + (o.vx || 0); q.vy = rnd(-70, -30) + (o.vy || 0);
                      q.life = q.max = rnd(0.5, 1.4) * (o.life || 1); q.r = rnd(0.8, 2) * (o.size || 1); q.col = o.col || '#fdba74'; q.seed = Math.random() * 99; },
    step: (q, dt) => { q.vx += (hlNoise(uiTime * 2 + q.seed, 1) - 0.5) * 120 * dt; q.vy -= 10 * dt;
                       q.x += q.vx * dt; q.y += q.vy * dt; },
    draw: q => { const k = q.life / q.max, f = 0.6 + 0.4 * hlNoise(uiTime * 20 + q.seed, 2);
                 drawGlow(q.x, q.y, q.r * 5, q.col, 0.35 * k * f);
                 ctx.globalAlpha = k * f; ctx.fillStyle = '#fff7ed';
                 ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.6, 0, TAU); ctx.fill(); }
  },
  /* candle smoke: a thin thread that thickens and curls as it climbs */
  smoke: {
    layer: 'lit',
    make: (q, o) => { q.vx = rnd(-4, 4); q.vy = rnd(-34, -22) * (o.speed || 1);
                      q.life = q.max = rnd(1.6, 2.8) * (o.life || 1); q.r = rnd(1.5, 2.5) * (o.size || 1); q.col = o.col || '#9ca3af';
                      q.seed = Math.random() * 99; q.a = o.a || 0.16; },
    step: (q, dt) => { const age = q.max - q.life;
                       q.vx += (hlNoise(age * 1.3 + q.seed, 3) - 0.5) * 70 * dt; q.vy *= Math.pow(0.97, dt * 60);
                       q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 7; },
    draw: q => { const k = q.life / q.max, fade = Math.min(1, (q.max - q.life) / 0.25);
                 ctx.globalAlpha = q.a * k * fade; ctx.fillStyle = q.col;
                 ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
  },
  /* dust turning in a beam: only visible where the light is */
  mote: {
    layer: 'glow',
    make: (q, o) => { q.vx = rnd(-5, 5); q.vy = rnd(-5, 5); q.life = q.max = rnd(4, 9); q.r = rnd(0.5, 1.3);
                      q.seed = Math.random() * 99; q.col = o.col || '#fde68a'; },
    step: (q, dt) => { q.vx += (hlNoise(uiTime * 0.4 + q.seed, 6) - 0.5) * 18 * dt;
                       q.vy += (hlNoise(uiTime * 0.4 + q.seed, 7) - 0.5) * 18 * dt;
                       q.x += q.vx * dt; q.y += q.vy * dt; },
    draw: q => { const L = hlLightAt(q.x, q.y, false), b = Math.max(0, (L[0] + L[1] + L[2]) / 3 - 0.08);
                 const k = Math.min(1, q.life / 1.2, (q.max - q.life) / 1.2);
                 ctx.globalAlpha = clamp(b * 1.3, 0, 1) * k * (0.5 + 0.5 * hlNoise(uiTime * 3 + q.seed, 9));
                 ctx.fillStyle = q.col; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r); }
  },
  /* wax, earth, splinters: thrown, falls to a floor line, settles */
  clod: {
    layer: 'lit',
    make: (q, o) => { const a = rnd(0, TAU), s = rnd(40, 160) * (o.speed || 1);
                      q.vx = Math.cos(a) * s; q.vy = Math.sin(a) * s * 0.5; q.z = 0; q.vz = rnd(80, 220) * (o.speed || 1);
                      q.life = q.max = rnd(1.2, 2.4) * (o.life || 1); q.r = rnd(1, 3) * (o.size || 1); q.col = o.col || '#57534e'; },
    step: (q, dt) => { if (q.z > 0 || q.vz > 0) { q.vz -= 600 * dt; q.z = Math.max(0, q.z + q.vz * dt);
                       if (q.z === 0 && q.vz < 0) { q.vz = -q.vz * 0.3; q.vx *= 0.6; q.vy *= 0.6; if (q.vz < 20) q.vz = 0; } }
                       else { q.vx *= Math.pow(0.8, dt * 60); q.vy *= Math.pow(0.8, dt * 60); }
                       q.x += q.vx * dt; q.y += q.vy * dt; },
    draw: q => { const k = Math.min(1, q.life / 0.5);
                 ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#000';
                 ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r * 0.5, 0, 0, TAU); ctx.fill();
                 ctx.globalAlpha = k; ctx.fillStyle = q.col;
                 ctx.beginPath(); ctx.arc(q.x, q.y - q.z, q.r, 0, TAU); ctx.fill(); }
  },
  /* a cold wisp: the soul's shedding */
  wisp: {
    layer: 'glow',
    make: (q, o) => { q.vx = rnd(-10, 10) + (o.vx || 0); q.vy = rnd(-40, -16) + (o.vy || 0);
                      q.life = q.max = rnd(0.8, 1.8) * (o.life || 1); q.r = rnd(1.5, 3.5) * (o.size || 1); q.col = o.col || '#a5f3fc';
                      q.seed = Math.random() * 99; },
    step: (q, dt) => { q.vx += (hlNoise(uiTime * 1.5 + q.seed, 12) - 0.5) * 60 * dt; q.x += q.vx * dt; q.y += q.vy * dt; },
    draw: q => { const k = q.life / q.max; drawGlow(q.x, q.y, q.r * 4, q.col, 0.22 * k * k); }
  },
  /* a bat: flutters along, wings beating, veering on noise */
  bat: {
    layer: 'lit',
    make: (q, o) => { const a = o.ang === undefined ? rnd(0, TAU) : o.ang + rnd(-0.4, 0.4), s = rnd(90, 150);
                      q.vx = Math.cos(a) * s; q.vy = Math.sin(a) * s; q.life = q.max = o.life || rnd(3, 5);
                      q.r = rnd(4, 7) * (o.size || 1); q.seed = Math.random() * 99; q.col = o.col || '#0b0b12'; },
    step: (q, dt) => { const turn = (hlNoise(uiTime * 1.1 + q.seed, 13) - 0.5) * 4 * dt;
                       const c = Math.cos(turn), s = Math.sin(turn), vx = q.vx;
                       q.vx = vx * c - q.vy * s; q.vy = vx * s + q.vy * c;
                       q.x += q.vx * dt; q.y += q.vy * dt + Math.sin(uiTime * 9 + q.seed) * 18 * dt; },
    draw: q => { const flap = Math.sin(uiTime * 22 + q.seed * 3), ang = Math.atan2(q.vy, q.vx);
                 const k = Math.min(1, q.life / 0.4, (q.max - q.life) / 0.3);
                 ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(ang + Math.PI / 2);
                 ctx.globalAlpha = k; ctx.fillStyle = q.col; const r = q.r, up = flap * r * 0.7;
                 ctx.beginPath(); ctx.moveTo(0, -r * 0.4);
                 ctx.quadraticCurveTo(-r * 0.8, -r * 0.2 - up, -r * 1.6, up * 0.6);
                 ctx.quadraticCurveTo(-r * 0.9, r * 0.1, -r * 0.5, r * 0.25);
                 ctx.quadraticCurveTo(-r * 0.2, 0, 0, r * 0.45);
                 ctx.quadraticCurveTo(r * 0.2, 0, r * 0.5, r * 0.25);
                 ctx.quadraticCurveTo(r * 0.9, r * 0.1, r * 1.6, up * 0.6);
                 ctx.quadraticCurveTo(r * 0.8, -r * 0.2 - up, 0, -r * 0.4);
                 ctx.fill(); ctx.restore(); }
  }
};
function hlEmit(kind, x, y, n = 1, o = {}) {
  const K = HL_PART[kind];
  if (!K) return;
  for (let i = 0; i < n; i++) {
    if (hlParts.length >= HL_PART_MAX) hlParts.shift();
    const q = { kind, x: x + (o.spread ? rnd(-o.spread, o.spread) : 0), y: y + (o.spread ? rnd(-o.spread, o.spread) : 0) };
    K.make(q, o);
    hlParts.push(q);
  }
}
function hlPartsTick(dt) {
  for (let i = hlParts.length - 1; i >= 0; i--) {
    const q = hlParts[i];
    q.life -= dt;
    if (q.life <= 0) { hlParts.splice(i, 1); continue; }
    HL_PART[q.kind].step(q, dt);
  }
}
function hlPartsDraw(layer) {
  ctx.save();
  if (layer === 'glow') ctx.globalCompositeOperation = 'lighter';
  for (const q of hlParts) {
    const K = HL_PART[q.kind];
    if (K.layer !== layer) continue;
    K.draw(q);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function hlPartsClear() { hlParts.length = 0; }

/* =============================== BAKED LAYERS ==============================
   Anything that does not move is drawn once, at device resolution, into a
   canvas the size of the room, and blitted each frame. key names the layer;
   a change of key, size or DPR rebakes it. draw(g) is handed the bake's own
   context, already transformed so it draws in world coordinates — ctx is a
   const in the game and cannot be swapped out underneath the drawing code.

   hlBakePrep does the baking without the blit, so a layer can be made ahead
   of the first frame that needs it (the event's preload, hlArtPreload).
=========================================================================== */

const _hlBakes = new Map();
function hlBakePrep(key, x, y, w, h, draw) {
  const dpr = typeof DPR === 'number' ? DPR : 1;
  let b = _hlBakes.get(key);
  if (!b || b.w !== w || b.h !== h || b.dpr !== dpr) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(h * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, -x * dpr, -y * dpr);
    draw(g);
    b = { c, w, h, dpr };
    _hlBakes.set(key, b);
  }
  return b;
}
function hlBake(key, x, y, w, h, draw) {
  const b = hlBakePrep(key, x, y, w, h, draw);
  ctx.drawImage(b.c, x, y, w, h);
}
function hlUnbake(key) { if (key) _hlBakes.delete(key); else _hlBakes.clear(); }
/* Every sprite a set of colours will need, made now rather than on the frame
   that first asks: the light pass's falloff and the game's glow. */
function hlSpritePrep(cols) {
  for (const c of cols) { hlLightSprite(c); glowSprite(c); }
}
