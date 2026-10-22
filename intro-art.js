/* intro-art.js — THE OPENING's art (INTRO in index.html).
   Fetched only by a tab that is about to play its first look (Intro.load), so
   nobody pays for it twice. It defines IntroArt; introDraw hands it every frame.
   INTRO_ART_VER in index.html is this file's content hash (sha1, first 10):
   stamp it again whenever this file changes, or a browser may serve the old one.
   Designed on the "VOIDRUNNER Intro" canvas, where this same file plays with a
   scrubber, its shot list and a click track, beside the music cue sheet. */
/* =============================================================================
   VOIDRUNNER — THE OPENING                                              1:54
   "Everything here was loved by someone who would not let it go."

   A kingdom as it was; the dark; and the people who kept caring after
   there was anything left to care for — a king keeping seats, a counter
   kept open, a door locked the way you lock a door you mean to open, a
   pilot carrying a grave. Then everything put back, piece by piece, with
   the cracks left showing in gold.

   One call draws any frame:   IntroArt.draw(g, t, w, h, dpr, opt)
   g's canvas is w*dpr by h*dpr. Pure: the frame at t is always the same
   frame (no state, no RNG; hash() is a fixed noise), so it scrubs and
   replays. opt: { spoilers, bloom, grain }. SHOTS, FLASH and SUBS are the
   places it gets retimed to the finished track.
   ========================================================================== */
const IntroArt = (() => {
'use strict';
const LEN = 114, TAU = Math.PI * 2, PI = Math.PI;

/* ------------------------------------------------------------- the look */
const F = {
  head: "Barlow, 'Segoe UI', system-ui, sans-serif",
  label: "'Chakra Petch', Barlow, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  serif: "'Cormorant Garamond', Georgia, serif",
  maker: "'Courier New', Consolas, monospace"
};
const C = {
  bg: '#05060a', void: '#04050a', navy: '#0b1226', slate: '#3b4a6b', mist: '#94a3b8', ink: '#ece7dd',
  gold: '#e2b65c', goldHi: '#fff1c1', goldDim: '#8a6a2c', cyan: '#67e8f9', pink: '#f472b6', red: '#ef4444',
  lamp: '#ffd9a8', flame: '#ffe7b0'
};
const HULL = {
  runner: [18, 0, 9, 3.4, 5.5, 8.5, -5, 13, -8.5, 9.5, -6, 4.2, -10.5, 3.2, -6.5, 0, -10.5, -3.2, -6, -4.2, -8.5, -9.5, -5, -13, 5.5, -8.5, 9, -3.4],
  ember: [22, 0, 13, 2.6, 9, 7, 2, 13.5, -7, 12, -5, 4.6, -12, 3.2, -9, 0, -12, -3.2, -5, -4.6, -7, -12, 2, -13.5, 9, -7, 13, -2.6],
  hacker: [18, 0, 4, 6, 10, 13, -4, 11, -9, 0, -4, -11, 10, -13, 4, -6],
  melee: [12.6, 0, 10.4, 4.4, 11.4, 10.2, 2.4, 13.2, -6.4, 12, -9.2, 6, -15, 4, -12.8, 0, -15, -4, -9.2, -6, -6.4, -12, 2.4, -13.2, 11.4, -10.2, 10.4, -4.4]
};
const ELEGY = [
  'Nothing in the void was ever let go of. That was the trouble with it.',
  'The king kept a seat for everyone. The forge kept its shifts. The hive kept count.',
  'And when the dark took the rooms, someone came and put them back, line by line,',
  'as if loving a thing enough could make it what it was.'
];

/* --------------------------------------------------------- the timeline */
const SHOTS = [
  { id: 'elegy',   t0: 0,   t1: 11,  act: 'I',   bloom: .2 },
  { id: 'glory',   t0: 11,  t1: 22,  act: 'I',   bloom: .3 },
  { id: 'after',   t0: 22,  t1: 30,  act: 'I',   bloom: .5 },
  { id: 'maker',   t0: 30,  t1: 38,  act: 'II',  bloom: .35 },
  { id: 'king',    t0: 38,  t1: 46,  act: 'II',  bloom: .5 },
  { id: 'keepers', t0: 46,  t1: 54,  act: 'II',  bloom: .35 },
  { id: 'pilots',  t0: 54,  t1: 70,  act: 'II',  bloom: .4 },
  { id: 'stayed',  t0: 70,  t1: 78,  act: 'II',  bloom: .3 },
  { id: 'restore', t0: 78,  t1: 90,  act: 'II',  bloom: .45 },
  { id: 'seams',   t0: 90,  t1: 98,  act: 'III', bloom: .35 },
  { id: 'arrive',  t0: 98,  t1: 106, act: 'III', bloom: .4 },
  { id: 'title',   t0: 106, t1: 114, act: 'III', bloom: .45 }
];
// [when, how long] a white frame burns off
const FLASH = [[30, .35], [54, .18], [58, .18], [62, .18], [66, .18], [78, .25], [106, .45]];
// [when, how long, how hard] the picture tears
const GLITCH = [[70, .35, .55], [87.8, .3, .4]];
// [when, how long, px] the camera kicks
const SHAKE = [[30, .35, 5], [78, .3, 4], [88, .3, 4]];
// the lines said over the picture, in the voices the codex uses
const SUBS = [
  [24.3, 28.8, 'Someone kept a light on.', 'THE RECORD'],
  [41.6, 45.8, 'Nobody I have seated has ever been lost.', 'THE KING']
];
const BEATS = (() => {
  const b = [];
  for (let t = 0; t < 28; t += 2) b.push([t, 'soft']);
  for (let t = 30; t < 90; t += .5) b.push([t, (t - 30) % 2 === 0 ? 'bar' : 'beat']);
  for (const t of [105, 105.5, 105.75]) b.push([t, 'beat']);
  b.push([106, 'bar']);
  for (const t of [18.4, 19.2, 30, 35.4, 38, 46, 48, 50, 52, 54, 56, 58, 62, 66, 70, 78, 80, 82, 84, 86, 88, 90, 106]) b.push([t, 'cue']);
  return b;
})();

/* ------------------------------------------------------------------ math */
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const sm = (a, b, v) => { const k = cl((v - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
const eo = k => 1 - Math.pow(1 - cl(k, 0, 1), 3);
const ei = k => Math.pow(cl(k, 0, 1), 3);
const eio = k => { k = cl(k, 0, 1); return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function pulse(list, t, f) {
  let a = 0;
  for (const e of list) if (t >= e[0] && t < e[0] + e[1]) a = Math.max(a, (e[2] == null ? 1 : e[2]) * f(1 - (t - e[0]) / e[1]));
  return a;
}

/* ---------------------------------------------------------------- colour */
const RGB = new Map();
function rgb(hex) {
  let v = RGB.get(hex);
  if (!v) { const n = parseInt(hex.slice(1), 16); v = [n >> 16, n >> 8 & 255, n & 255]; RGB.set(hex, v); }
  return v;
}
function rgba(hex, a) { const v = rgb(hex); return 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + cl(a, 0, 1).toFixed(3) + ')'; }
const MIX = new Map();
function mixc(h1, h2, k) {
  const key = h1 + h2 + k.toFixed(2);
  let o = MIX.get(key);
  if (!o) {
    const a = rgb(h1), b = rgb(h2);
    o = '#' + [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], k)).toString(16).padStart(2, '0')).join('');
    MIX.set(key, o);
  }
  return o;
}

/* ---------------------------------------------------- buffers and lights */
const BUF = {};
function buf(name, w, h) {
  let b = BUF[name];
  if (!b) { const c = document.createElement('canvas'); b = BUF[name] = { c, g: c.getContext('2d') }; }
  if (b.c.width !== w || b.c.height !== h) { b.c.width = w; b.c.height = h; }
  return b;
}
// a light: a small hot core and a short falloff, never a haze
const SPR = new Map();
function spr(col) {
  let c = SPR.get(col);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), v = rgb(col), s = v[0] + ',' + v[1] + ',' + v[2];
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.06, 'rgba(' + s + ',1)'); gr.addColorStop(.18, 'rgba(' + s + ',.38)');
  gr.addColorStop(.45, 'rgba(' + s + ',.08)'); gr.addColorStop(1, 'rgba(' + s + ',0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  SPR.set(col, c);
  return c;
}
function light(g, x, y, r, col, a) {
  if (!(a > .004) || !(r > .3)) return;
  const ga = g.globalAlpha, op = g.globalCompositeOperation;
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = ga * Math.min(1, a);
  g.drawImage(spr(col), x - r, y - r, r * 2, r * 2);
  g.globalAlpha = ga; g.globalCompositeOperation = op;
}
let NOISE = null;
function noiseTile() {
  if (NOISE) return NOISE;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), im = x.createImageData(256, 256);
  for (let i = 0; i < 65536; i++) {
    const v = (hash(i * .7131 + 9) * 255) | 0;
    im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return NOISE = c;
}

/* ----------------------------------------------------------- 2D drawing */
function fill(g, W, H, col) { g.fillStyle = col; g.fillRect(-80, -80, W + 160, H + 160); }
function font(g, wt, px, fam) { g.font = wt + ' ' + Math.max(1, px).toFixed(2) + 'px ' + fam; }
function ls(g, em) { g.letterSpacing = em ? em + 'em' : '0px'; }
function stroke(g, col, w, a) { const ga = g.globalAlpha; g.globalAlpha = ga * (a == null ? 1 : a); g.lineWidth = w; g.strokeStyle = col; g.stroke(); g.globalAlpha = ga; }
function polyPath(g, x, y, r, n, rot) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU - PI / 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.closePath();
}
function ptsPath(g, pts, s, ox, oy) {
  s = s || 1; ox = ox || 0; oy = oy || 0;
  g.beginPath();
  for (let i = 0; i < pts.length; i++) i ? g.lineTo(ox + pts[i][0] * s, oy + pts[i][1] * s) : g.moveTo(ox + pts[i][0] * s, oy + pts[i][1] * s);
  g.closePath();
}
function hullPath(g, id, x, y, k, a) {
  const p = HULL[id] || HULL.runner, c = Math.cos(a), s = Math.sin(a);
  g.beginPath();
  for (let i = 0; i < p.length; i += 2) {
    const fx = p[i] * k, fy = p[i + 1] * k;
    i ? g.lineTo(x + fx * c - fy * s, y + fx * s + fy * c) : g.moveTo(x + fx * c - fy * s, y + fx * s + fy * c);
  }
  g.closePath();
}
// a hull, drawn clean: dark body, one crisp edge, its engine a small light
function hull2(g, id, x, y, k, a, col, al, t, o) {
  o = o || {};
  if (o.engine !== 0) {
    const tx = x - Math.cos(a) * 11.5 * k, ty = y - Math.sin(a) * 11.5 * k;
    light(g, tx, ty, 9 * k * (.9 + .1 * Math.sin(t * 41)), col, .8 * al);
  }
  hullPath(g, id, x, y, k, a);
  g.fillStyle = rgba(o.body || mixc(col, '#05070f', .78), al); g.fill();
  stroke(g, col, Math.max(1, k * .5), al);
  hullPath(g, id, x + Math.cos(a) * 2 * k, y + Math.sin(a) * 2 * k, k * .55, a);
  stroke(g, col, Math.max(.6, k * .22), .45 * al);
}
// a piece of text a character at a time, each placed by fn(i, n) → { a, dx, dy }
function chars(g, s, x, y, align, sp, fn) {
  const ws = [];
  let tot = 0;
  for (let i = 0; i < s.length; i++) { const w = g.measureText(s[i]).width; ws.push(w); tot += w + (i ? sp : 0); }
  let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
  const ta = g.textAlign;
  g.textAlign = 'center';
  for (let i = 0; i < s.length; i++) {
    const r = fn(i, s.length);
    if (r && r.a > .003) {
      const ga = g.globalAlpha;
      g.globalAlpha = ga * Math.min(1, r.a);
      g.fillText(r.ch || s[i], cx + ws[i] / 2 + (r.dx || 0), y + (r.dy || 0));
      g.globalAlpha = ga;
    }
    cx += ws[i] + sp;
  }
  g.textAlign = ta;
  return tot;
}
function wrap(g, text, maxW) {
  const words = text.split(' '), out = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (line && g.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}
const GLYPHS = '#%&@$/\\=+*01<>[]{}?ABCDEFGHKMNRSTXZ';
function scramble(s, k, seed, t) {
  const n = s.length, keep = Math.floor(k * n);
  let o = '';
  for (let i = 0; i < n; i++) {
    if (i < keep || s[i] === ' ') o += s[i];
    else o += GLYPHS[Math.floor(hash(seed + i * 7.3 + Math.floor(t * 22) * 1.31) * GLYPHS.length)];
  }
  return o;
}
// parallel lines inside the current path: the engraving's shading
function hatch(g, bb, sp, ang, col, a, w) {
  g.save(); g.clip();
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2, R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 2;
  const c = Math.cos(ang), s = Math.sin(ang);
  g.beginPath();
  for (let d = -R; d <= R; d += sp) { g.moveTo(cx - c * R - s * d, cy - s * R + c * d); g.lineTo(cx + c * R - s * d, cy + s * R + c * d); }
  stroke(g, col, w || 1, a);
  g.restore();
}
function motes(g, t, W, H, n, col, a, rise, seed, size) {
  g.fillStyle = col;
  const ga = g.globalAlpha;
  for (let i = 0; i < n; i++) {
    const hx = hash(i * 3.1 + seed), hy = hash(i * 7.7 + seed), hz = hash(i * 1.9 + seed);
    let y = (hy * H - t * rise * (.5 + hz)) % H;
    if (y < 0) y += H;
    const x = hx * W + Math.sin(t * .4 + i) * 12;
    g.globalAlpha = ga * a * (.3 + .7 * hz) * (.55 + .45 * Math.sin(t * 1.7 + i * 2.3));
    const s = (size || 1.2) * (.6 + hz);
    g.fillRect(x, y, s, s);
  }
  g.globalAlpha = ga;
}
// a four-point glint: crisp, gone in a moment
function spark(g, x, y, e, r, col) {
  if (e < 0 || e >= 1) return;
  const s = r * (.5 + e * .8), ga = g.globalAlpha;
  g.globalAlpha = ga * (1 - e);
  g.strokeStyle = col || C.goldHi; g.lineWidth = 1;
  g.beginPath();
  g.moveTo(x - s, y); g.lineTo(x + s, y); g.moveTo(x, y - s); g.lineTo(x, y + s);
  g.moveTo(x - s * .35, y - s * .35); g.lineTo(x + s * .35, y + s * .35); g.moveTo(x + s * .35, y - s * .35); g.lineTo(x - s * .35, y + s * .35);
  g.stroke();
  g.globalAlpha = ga;
}

/* ---------------------------------------------------------- shattering */
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
function centroid(p) {
  let x = 0, y = 0, a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[i], r = p[(i + 1) % p.length], cr = q[0] * r[1] - r[0] * q[1];
    a += cr; x += (q[0] + r[0]) * cr; y += (q[1] + r[1]) * cr;
  }
  if (Math.abs(a) < 1e-12) { let sx = 0, sy = 0; for (const q of p) { sx += q[0]; sy += q[1]; } return [sx / p.length, sy / p.length]; }
  return [x / (3 * a), y / (3 * a)];
}
function splitPoly(pts, px, py, nx, ny) {
  const A = [], B = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    const dp = (p[0] - px) * nx + (p[1] - py) * ny, dq = (q[0] - px) * nx + (q[1] - py) * ny;
    (dp >= 0 ? A : B).push(p);
    if ((dp >= 0) !== (dq >= 0)) { const k = dp / (dp - dq), m = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; A.push(m); B.push(m); }
  }
  return [A, B];
}
// a convex shape broken into n+1 pieces, always splitting the biggest one left
function shatter(poly, n, seed) {
  const pieces = [poly];
  for (let i = 0; i < n * 3 && pieces.length <= n; i++) {
    let bi = 0, ba = 0;
    pieces.forEach((p, j) => { const a = Math.abs(polyArea(p)); if (a > ba) { ba = a; bi = j; } });
    const p = pieces[bi], c = centroid(p), an = hash(seed + i * 3.7) * PI, r = Math.sqrt(ba) * .3;
    const [A, B] = splitPoly(p, c[0] + (hash(seed + i * 5.1) - .5) * r, c[1] + (hash(seed + i * 7.9) - .5) * r, Math.cos(an), Math.sin(an));
    if (A.length < 3 || B.length < 3 || Math.abs(polyArea(A)) < 1e-6 || Math.abs(polyArea(B)) < 1e-6) continue;
    pieces.splice(bi, 1, A, B);
  }
  return pieces.map((pts, i) => {
    const c = centroid(pts);
    return { pts, cx: c[0], cy: c[1], i, h1: hash(seed * 1.3 + i * 2.7), h2: hash(seed * 2.1 + i * 4.3), h3: hash(seed * 3.9 + i * 1.1) };
  });
}
function ngon(r, n, rot) { const o = []; for (let i = 0; i < n; i++) { const a = rot + i / n * TAU - PI / 2; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; }
function ellipse(rx, ry, n) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([Math.cos(a) * rx, Math.sin(a) * ry]); } return o; }
// a gold seam along a piece's edge, drawn in as q runs 0..1
function seam(g, pts, s, q, w) {
  if (q <= 0) return;
  const n = pts.length, upto = q * n;
  g.beginPath(); g.moveTo(pts[0][0] * s, pts[0][1] * s);
  for (let i = 1; i <= n && i - 1 < upto; i++) {
    const f = Math.min(1, upto - (i - 1)), a = pts[i - 1], b = pts[i % n];
    g.lineTo(lerp(a[0], b[0], f) * s, lerp(a[1], b[1], f) * s);
  }
  g.lineJoin = 'round'; g.lineCap = 'round';
  stroke(g, C.gold, w, 1);
  stroke(g, C.goldHi, Math.max(.5, w * .32), .9);
  g.lineCap = 'butt';
}
/* Pieces of a shape coming home. Each piece starts at start(p) seconds and
   takes o.dur to land; then its seam runs in gold. content(g, p) draws what
   is printed on the shape, clipped to the piece, in the shape's own units. */
function assemble(g, P, X, Y, S, t, o) {
  for (const p of P) {
    const st = o.start(p), q = eio((t - st) / o.dur);
    if (q <= 0 && !o.loose) continue;
    const an = p.h1 * TAU, d = o.spread * (1 - q) * (.45 + p.h2 * .8), rot = (p.h3 - .5) * o.spin * (1 - q);
    const ox = Math.cos(an) * d + (o.dx || 0) * (1 - q), oy = Math.sin(an) * d + (o.dy || 0) * (1 - q);
    g.save();
    g.translate(X + p.cx * S + ox, Y + p.cy * S + oy); g.rotate(rot); g.translate(-p.cx * S, -p.cy * S);
    g.globalAlpha *= (o.alpha == null ? 1 : o.alpha) * (o.loose ? 1 : cl(q * 3, 0, 1));
    ptsPath(g, p.pts, S);
    g.fillStyle = o.fill; g.fill();
    if (o.content) { g.save(); g.clip(); g.scale(S, S); o.content(g, p, q); g.restore(); ptsPath(g, p.pts, S); }
    stroke(g, o.edge || C.slate, o.edgeW || 1, o.edgeA == null ? .9 : o.edgeA);
    if (o.seam !== false && q >= 1) seam(g, p.pts, S, cl((t - st - o.dur) / (o.seamDur || .35), 0, 1), o.seamW || 2);
    g.restore();
    if (o.sparks && q >= 1) spark(g, X + p.cx * S, Y + p.cy * S, (t - st - o.dur) / .3, o.sparkR || 14);
  }
}

/* -------------------------------------------------------------------- 3D */
function cam(px, py, pz, tx, ty, tz, fov, roll, W, H) {
  let fx = tx - px, fy = ty - py, fz = tz - pz;
  const fl = Math.hypot(fx, fy, fz) || 1; fx /= fl; fy /= fl; fz /= fl;
  let rx = fy, ry = -fx;
  const rl = Math.hypot(rx, ry) || 1e-6; rx /= rl; ry /= rl;
  return { px, py, pz, fx, fy, fz, rx, ry, ux: ry * fz, uy: -rx * fz, uz: rx * fy - ry * fx,
    F: (H / 2) / Math.tan(fov * PI / 360), W, H, cr: Math.cos(roll || 0), sr: Math.sin(roll || 0), near: 4 };
}
function camL(a, b, k, W, H) {
  return cam(lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k), lerp(a[3], b[3], k), lerp(a[4], b[4], k),
    lerp(a[5], b[5], k), lerp(a[6], b[6], k), lerp(a[7] || 0, b[7] || 0, k), W, H);
}
function tc(c, x, y, z) {
  const dx = x - c.px, dy = y - c.py, dz = z - c.pz;
  return [dx * c.rx + dy * c.ry, dx * c.ux + dy * c.uy + dz * c.uz, dx * c.fx + dy * c.fy + dz * c.fz];
}
function ts(c, X, Y, Z) {
  const sx = X * c.F / Z, sy = -Y * c.F / Z;
  return [c.W / 2 + sx * c.cr - sy * c.sr, c.H / 2 + sx * c.sr + sy * c.cr, c.F / Z, Z];
}
function P3(c, x, y, z) { const p = tc(c, x, y, z); return p[2] < c.near ? null : ts(c, p[0], p[1], p[2]); }
function L3(path, c, x1, y1, z1, x2, y2, z2) {
  let a = tc(c, x1, y1, z1), b = tc(c, x2, y2, z2);
  const n = c.near;
  if (a[2] < n) { if (b[2] < n) return; const k = (n - a[2]) / (b[2] - a[2]); a = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, n]; }
  else if (b[2] < n) { const k = (n - b[2]) / (a[2] - b[2]); b = [b[0] + (a[0] - b[0]) * k, b[1] + (a[1] - b[1]) * k, n]; }
  const p = ts(c, a[0], a[1], a[2]), q = ts(c, b[0], b[1], b[2]);
  path.moveTo(p[0], p[1]); path.lineTo(q[0], q[1]);
}
function arc3(path, c, cx, cy, z, r, a0, a1, n) {
  for (let i = 0; i < n; i++) {
    const p = lerp(a0, a1, i / n), q = lerp(a0, a1, (i + 1) / n);
    L3(path, c, cx + Math.cos(p) * r, cy + Math.sin(p) * r, z, cx + Math.cos(q) * r, cy + Math.sin(q) * r, z);
  }
}

/* ------------------------------------------------- the stands, the throne */
const STANDS = (() => {
  const CY = 400, tiers = [], seats = [];
  for (let k = 0; k < 10; k++) {
    const R = 540 + k * 72, z = k * 44;
    tiers.push({ R, z });
    const n = Math.round(30 + k * 4);
    for (let j = 0; j < n; j++) {
      const a = lerp(PI * .1, PI * .9, (j + .5) / n);
      seats.push({ a, R: R + 26, z, k, j, s: k * 100 + j, d: k / 10 + Math.abs(a - PI / 2) / PI });
    }
  }
  return { CY, tiers, seats };
})();
// the amphitheatre, as lines: col and a set how it is lit
function standsLines(g, c, col, a, lw) {
  const T = STANDS.tiers, CY = STANDS.CY, p = new Path2D();
  for (let k = 0; k < T.length; k++) {
    const t = T[k], zt = t.z + 44;
    arc3(p, c, 0, CY, t.z, t.R, PI * .08, PI * .92, 40);
    arc3(p, c, 0, CY, zt, t.R, PI * .08, PI * .92, 40);
    for (let j = 0; j <= 16; j++) {
      const an = lerp(PI * .08, PI * .92, j / 16);
      L3(p, c, Math.cos(an) * t.R, CY + Math.sin(an) * t.R, t.z, Math.cos(an) * t.R, CY + Math.sin(an) * t.R, zt);
    }
  }
  g.lineWidth = lw || 1; g.strokeStyle = rgba(col, a); g.stroke(p);
}
// everyone seated: a head and shoulders each, or an empty seat's back
function crowd(g, c, col, a, filled, t) {
  const pth = new Path2D(), CY = STANDS.CY;
  for (const s of STANDS.seats) {
    const x = Math.cos(s.a) * s.R, y = CY + Math.sin(s.a) * s.R;
    const b = P3(c, x, y, s.z + 6);
    if (!b) continue;
    const r = Math.max(.7, 9 * b[2]);
    if (filled) {
      const hy = b[1] - r * 2.6 + Math.sin(t * 1.3 + s.s) * r * .08;
      pth.moveTo(b[0] + r, hy); pth.arc(b[0], hy, r, 0, TAU);
      pth.moveTo(b[0] - r * 1.9, b[1]); pth.arc(b[0], b[1] + r * .3, r * 1.9, PI, TAU);
    } else {
      pth.moveTo(b[0] - r * 1.6, b[1]); pth.lineTo(b[0] - r * 1.6, b[1] - r * 2.2); pth.lineTo(b[0] + r * 1.6, b[1] - r * 2.2); pth.lineTo(b[0] + r * 1.6, b[1]);
    }
  }
  g.lineWidth = .9; g.strokeStyle = rgba(col, a); g.stroke(pth);
}
// the seat at the front: a dais, and his triangle; mended if seamed
function throne(g, c, col, a, seamed, t) {
  const CY = STANDS.CY, d = new Path2D();
  for (const [r, z] of [[230, 0], [190, 22], [190, 0], [150, 44]]) arc3(d, c, 0, CY - 120, z, r, 0, TAU, 6);
  g.lineWidth = 1; g.strokeStyle = rgba(col, a * .8); g.stroke(d);
  const pts = [[-90, 44], [90, 44], [0, 270]].map(q => P3(c, q[0], CY - 120, q[1]));
  if (pts.some(q => !q)) return;
  const tri = pts.map(q => [q[0], q[1]]);
  ptsPath(g, tri);
  g.fillStyle = rgba('#120d06', .92 * a); g.fill();
  const bb = [Math.min(tri[0][0], tri[1][0]), tri[2][1], Math.max(tri[0][0], tri[1][0]), tri[0][1]];
  ptsPath(g, tri); hatch(g, bb, 4, PI / 3, col, .35 * a, .8);
  ptsPath(g, tri); stroke(g, col, 1.6, a);
  const inner = tri.map(q => [lerp(q[0], (tri[0][0] + tri[1][0] + tri[2][0]) / 3, .38), lerp(q[1], (tri[0][1] + tri[1][1] + tri[2][1]) / 3, .38)]);
  ptsPath(g, inner); stroke(g, col, 1, .7 * a);
  if (seamed) {
    // a crack across it, filled in gold
    const m = (u, v) => [lerp(tri[0][0], tri[1][0], u) * (1 - v) + tri[2][0] * v, lerp(tri[0][1], tri[1][1], u) * (1 - v) + tri[2][1] * v];
    const sp = [m(.18, .1), m(.35, .3), m(.3, .42), m(.52, .55), m(.47, .7), m(.6, .86)];
    g.beginPath(); sp.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
    g.lineJoin = 'round'; stroke(g, C.gold, 2.2, a); stroke(g, C.goldHi, .8, a);
  }
}

/* ================================================================ SHOTS ==
   Each is handed S = { g, W, H, u, tu, m, t, lt, d, opt, fx, dpr }: lt runs
   from 0 at its first frame; fx lets it ask the post pass for things. */
const CRACK = (() => {
  // a fracture spreading from a point: segments [x1,y1,x2,y2,at] in units of the screen's short side
  const segs = [];
  function walk(x, y, a, len, at, depth, seed) {
    for (let i = 0; i < len; i++) {
      a += (hash(seed + i * 1.7) - .5) * .9;
      const l = .03 + hash(seed + i * 3.1) * .05, nx = x + Math.cos(a) * l, ny = y + Math.sin(a) * l;
      segs.push([x, y, nx, ny, at]); x = nx; y = ny; at += l;
      if (depth < 2 && hash(seed + i * 9.3) > .72) walk(x, y, a + (hash(seed + i) > .5 ? .8 : -.8), Math.floor(len * .5), at, depth + 1, seed + i * 31);
    }
  }
  for (let b = 0; b < 7; b++) walk(0, 0, b / 7 * TAU + hash(b) * .5, 11, 0, 0, b * 101);
  return segs;
})();
const SCREEN = shatter([[0, 0], [1, 0], [1, 1], [0, 1]], 40, 17);
const EMB = shatter(ngon(1, 6, 0), 30, 5);
const BIG = shatter(ngon(1, 6, 0), 72, 9);
const DRIFT = shatter([[-1, -1], [1, -1], [1, 1], [-1, 1]], 26, 23);

// what is printed on the emblem: the game's own mark, engraved; s is pixels to a unit, so lines stay hairlines at any size
function emblemArt(g, t, s) {
  const px = 1 / s;
  polyPath(g, 0, 0, .93, 6, 0); stroke(g, C.pink, 2 * px, .6);
  polyPath(g, 0, 0, .74, 3, t * .1); stroke(g, C.cyan, 2.2 * px, .8);
  polyPath(g, 0, 0, .53, 3, -t * .15 + 1); stroke(g, C.cyan, 2.2 * px, .8);
  g.beginPath(); g.arc(0, 0, .985, 0, TAU); stroke(g, C.slate, 1.2 * px, .8);
  g.beginPath();
  const sp = Math.max(.02, 7 * px);
  for (let d = -1.8; d <= 1.8; d += sp) { g.moveTo(-1.2, d - .6); g.lineTo(1.2, d + .6); }
  stroke(g, C.slate, px, .3);
}

const DRAW = {

  /* 01 · I · THE RECORD. Four lines on what nobody here would let go of,
     over the kingdom's seal, faint, which cracks as they finish. */
  elegy(S) {
    const { g, W, H, lt, tu } = S;
    fill(g, W, H, '#030409');
    const out = 1 - sm(9.6, 10.9, lt);
    const R = Math.min(W, H) * .44;
    g.save(); g.translate(W / 2, H / 2); g.rotate(lt * .015);
    g.globalAlpha = .1 * out * sm(0, 2.5, lt);
    g.beginPath(); g.arc(0, 0, R, 0, TAU); stroke(g, C.gold, 1);
    g.beginPath(); g.arc(0, 0, R * .955, 0, TAU); stroke(g, C.gold, 1);
    g.beginPath();
    for (let i = 0; i < 72; i++) { const a = i / 72 * TAU, l = i % 6 ? .02 : .05; g.moveTo(Math.cos(a) * R * .955, Math.sin(a) * R * .955); g.lineTo(Math.cos(a) * R * (.955 - l), Math.sin(a) * R * (.955 - l)); }
    stroke(g, C.gold, 1);
    polyPath(g, 0, 0, R * .82, 6, 0); stroke(g, C.gold, 1);
    polyPath(g, 0, 0, R * .62, 3, 0); stroke(g, C.gold, 1);
    polyPath(g, 0, 0, R * .44, 3, PI); stroke(g, C.gold, 1);
    g.restore();
    // the crack that comes for it
    const ck = (lt - 8.3) * .55;
    if (ck > 0) {
      const s = Math.min(W, H);
      g.beginPath();
      for (const [x1, y1, x2, y2, at] of CRACK) if (at < ck) { g.moveTo(W / 2 + x1 * s, H / 2 + y1 * s); g.lineTo(W / 2 + x2 * s, H / 2 + y2 * s); }
      stroke(g, C.goldHi, 1, .35 * out);
    }
    motes(g, lt, W, H, 90, '#e8dcc6', .5 * sm(0, 2, lt) * out, 5, 3, 1.4 * tu);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // on a narrow screen each line breaks in two rather than shrinking to nothing
    let px = 24 * tu;
    font(g, 500, px, F.serif);
    const rows = [];
    ELEGY.forEach((L, i) => (H > W * 1.05 ? wrap(g, L, W * .84) : [L]).forEach(r => rows.push([r, i])));
    let wide = 0;
    for (const [L] of rows) wide = Math.max(wide, g.measureText(L).width);
    if (wide > W * .88) { px *= W * .88 / wide; wide = W * .88; }
    const lh = px * 1.85, ty = H / 2 - lh * (rows.length / 2 - .45);
    rows.forEach(([L, i], r) => {
      const s0 = .8 + i * 1.8, a = sm(s0, s0 + 1.4, lt) * out;
      if (a <= 0) return;
      font(g, 500, px, F.serif); ls(g, ((1 - eo((lt - s0) / 2.4)) * .07).toFixed(3));
      g.fillStyle = rgba(C.ink, a);
      g.fillText(L, W / 2, ty + r * lh + (1 - eo((lt - s0) / 1.4)) * 8 * tu);
    });
    ls(g, 0);
    const ca = sm(8.2, 9, lt) * out;
    if (ca > 0) {
      font(g, 600, px * .58, F.serif); ls(g, .2); g.textAlign = 'right';
      g.fillStyle = rgba('#d6cfc2', .9 * ca);
      const cy = ty + rows.length * lh + px * .15;
      g.fillText('— FROM THE LEDGER OF THE BOOKKEEPER', W / 2 + wide / 2, cy);
      ls(g, 0);
      g.fillStyle = rgba(C.gold, .8 * ca); g.fillRect(W / 2 + wide / 2 - 140 * tu * eo((lt - 8.4) / .8), cy + px * .55, 140 * tu * eo((lt - 8.4) / .8), 1);
    }
  },

  /* 02 · I · AS IT WAS. The kingdom at its height, as an engraving in gold:
     the stands full, banners, medals hung on threads, his seat at the front
     and his sun over everything. Then it cracks from the seat out, and the
     whole picture breaks and falls away into the dark. */
  glory(S) {
    const { g, W, H, lt, tu, dpr } = S;
    if (lt < 8.6) { gloryScene(S, g, lt); if (lt > 7.6) gloryCrack(S, g, lt); return; }
    const B = buf('glory', Math.round(W * dpr), Math.round(H * dpr));
    B.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    gloryScene(S, B.g, 8.6); gloryCrack(S, B.g, 8.6);
    fill(g, W, H, '#020203');
    const o = throneScreen(W, H, 8.6);
    for (const p of SCREEN) {
      const dx = p.cx * W - o[0], dy = p.cy * H - o[1], dist = Math.hypot(dx, dy) / Math.hypot(W, H);
      const e = Math.max(0, lt - 8.6 - dist * .9 - p.h2 * .25);
      const fall = .5 * 1500 * tu * e * e, sx = dx / (Math.hypot(dx, dy) || 1) * e * 90 * tu, rot = (p.h3 - .5) * e * 1.6;
      const al = 1 - sm(.7, 1.6, e);
      if (al <= 0) continue;
      g.save();
      g.globalAlpha = al;
      g.translate(p.cx * W + sx, p.cy * H + fall); g.rotate(rot); g.translate(-p.cx * W, -p.cy * H);
      g.beginPath(); p.pts.forEach((v, i) => i ? g.lineTo(v[0] * W, v[1] * H) : g.moveTo(v[0] * W, v[1] * H)); g.closePath();
      g.save(); g.clip(); g.drawImage(B.c, 0, 0, W, H); g.restore();
      if (e > 0) stroke(g, C.goldHi, 1, .5 * (1 - e));
      g.restore();
    }
  },

  /* 03 · I · AFTER. Nobody left in the stands. One lamp on one bench, still
     lit, and the pieces of what was drifting in the dark around it. At the
     end they turn, all of them, toward something. */
  after(S) {
    const { g, W, H, lt, tu } = S;
    fill(g, W, H, '#020306');
    const c = cam(-300 + lt * 22, -460 + lt * 46, 120 - lt * 3, 120, 300, 46, 48, 0, W, H);
    // the benches, row on row going back up into the dark
    const p = new Path2D(), legs = new Path2D();
    for (let r = 0; r < 14; r++) {
      const y = 300 + r * 92, z = r * 34;
      L3(p, c, -1100, y, z + 18, 1100, y, z + 18); L3(p, c, -1100, y + 22, z + 18, 1100, y + 22, z + 18);
      for (let x = -1100; x <= 1100; x += 220) L3(legs, c, x, y + 11, z, x, y + 11, z + 18);
    }
    g.lineWidth = 1; g.strokeStyle = rgba('#3b4a6b', .55); g.stroke(p);
    g.strokeStyle = rgba('#3b4a6b', .35); g.stroke(legs);
    // the last few seat-lights, going out
    for (let i = 0; i < 26; i++) {
      const r = 2 + Math.floor(hash(i * 3.3) * 11), x = (hash(i * 5.7) - .5) * 2000, off = 1 + hash(i * 7.1) * 7;
      if (lt > off) continue;
      const q = P3(c, x, 300 + r * 92 + 11, r * 34 + 24);
      if (q) light(g, q[0], q[1], 26 * q[2] * 3, C.lamp, .7 * (lt > off - .3 ? Math.abs(Math.sin(lt * 40)) : 1));
    }
    // what is left of it, adrift
    const turn = sm(5.6, 8, lt);
    for (const d of DRIFT) {
      const x0 = (d.h1 - .5) * 1600, y0 = 200 + d.h2 * 900, z0 = 120 + d.h3 * 380;
      const tx = 120, ty = 300, tz = 140;
      const x = lerp(x0, tx, ei(turn) * .85) + Math.sin(lt * .3 + d.i) * 20, y = lerp(y0, ty, ei(turn) * .85), z = lerp(z0, tz, ei(turn) * .85);
      const q = P3(c, x, y, z);
      if (!q) continue;
      const s = 30 * q[2] * 3 * (.5 + d.h3), rot = lt * (d.h2 - .5) * .8 + d.h1 * 6 + turn * 3;
      g.save(); g.translate(q[0], q[1]); g.rotate(rot);
      g.beginPath(); d.pts.forEach((v, i) => i ? g.lineTo((v[0] - d.cx) * s, (v[1] - d.cy) * s) : g.moveTo((v[0] - d.cx) * s, (v[1] - d.cy) * s)); g.closePath();
      g.fillStyle = 'rgba(14,11,6,.9)'; g.fill();
      stroke(g, C.gold, 1, .25 + .5 * Math.abs(Math.sin(rot * 1.7)));
      g.restore();
    }
    // the bench with the lamp on it
    const bx = 120, by = 300;
    const lp = P3(c, bx, by + 11, 18), top = P3(c, bx, by + 11, 70);
    if (lp && top) {
      const s = lp[2] * 2.2;
      const pool = g.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], 150 * s);
      pool.addColorStop(0, 'rgba(255,217,168,.2)'); pool.addColorStop(1, 'rgba(255,217,168,0)');
      g.fillStyle = pool; g.beginPath(); g.ellipse(lp[0], lp[1], 150 * s, 40 * s, 0, 0, TAU); g.fill();
      lantern(g, lp[0], lp[1], s, lt);
      light(g, lp[0], lp[1] - 12 * s, 70 * s * (1 + .3 * sm(7, 8, lt)), C.lamp, .35 + .3 * sm(7, 8, lt));
    }
  },

  /* 04 · II · THE MAKER. The drop. Under a desk lamp, the pieces come home
     one on every beat, each sealed in gold as it lands, and the game's mark
     comes back together. His note, as he wrote it: lowercase, struck out. */
  maker(S) {
    const { g, W, H, lt, tu, m } = S;
    fill(g, W, H, '#04050a');
    const tall = H > W * 1.05;
    const X = tall ? W / 2 : W * .7, Y = tall ? H * .33 : H * .5, R = Math.min(W, H) * (tall ? .3 : .34);
    // the lamp's cone, edged
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(255,217,168,.10)'); gr.addColorStop(1, 'rgba(255,217,168,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(X - 40 * tu, -10); g.lineTo(X + 40 * tu, -10); g.lineTo(X + R * 1.6, H + 10); g.lineTo(X - R * 1.6, H + 10); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(X - 40 * tu, -10); g.lineTo(X - R * 1.6, H + 10); g.moveTo(X + 40 * tu, -10); g.lineTo(X + R * 1.6, H + 10);
    stroke(g, C.lamp, 1, .12);
    const order = EMB.map(p => p.i).sort((a, b) => hash(a * 3.3) - hash(b * 3.3));
    const rank = new Map(order.map((id, k) => [id, k]));
    assemble(g, EMB, X, Y, R, lt, {
      start: p => .15 + rank.get(p.i) * .2, dur: .32, spread: Math.max(W, H) * .7, spin: 5,
      fill: '#0b1226', edge: '#3b4a6b', edgeW: 1, seamW: 2, sparks: true, sparkR: 16 * tu,
      content: gg => emblemArt(gg, lt, R)
    });
    // the note
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    const x0 = tall ? W * .08 : W * .07, maxW = tall ? W * .84 : W * .44, y0 = tall ? H * .66 : H * .38;
    let px = 28 * tu;
    font(g, 400, px, F.maker);
    const longest = g.measureText('i bought it when it was shutting down.').width;
    if (longest > maxW) { px *= maxW / longest; font(g, 400, px, F.maker); }
    const lh = px * 1.6;
    font(g, 600, 11 * tu, F.label); ls(g, .38); g.fillStyle = rgba(C.mist, sm(.1, .4, lt));
    g.fillText("THE MAKER'S NOTE", x0, y0 - lh * 1.1);
    ls(g, 0); font(g, 400, px, F.maker);
    const typed = (s, a, b) => s.slice(0, Math.floor(s.length * cl((lt - a) / (b - a), 0, 1)));
    g.fillStyle = '#d6dbe4';
    const l0 = typed('i bought it when it was shutting down.', .3, 1.6);
    const l1 = typed('they sent me everything that was left.', 2.0, 3.2);
    const l2 = typed('i thought i was making it.', 4.0, 5.0);
    const l3 = typed('i was putting it back.', 5.8, 6.7);
    g.fillText(l0, x0, y0); g.fillText(l1, x0, y0 + lh); g.fillText(l2, x0, y0 + lh * 2);
    const pre = g.measureText('i thought i was ').width, mk = g.measureText('making it.').width;
    const st = eo((lt - 5.25) / .3);
    if (st > 0) g.fillRect(x0 + pre - 2, y0 + lh * 2 - px * .3, (mk + 4) * st, Math.max(1.2, px * .07));
    g.fillStyle = C.goldHi; g.fillText(l3, x0, y0 + lh * 3);
    const line = lt < 1.8 ? 0 : lt < 3.6 ? 1 : lt < 5.6 ? 2 : 3, cur = [l0, l1, l2, l3][line];
    if (Math.floor(lt * 2.4) % 2 === 0) { g.fillStyle = '#d6dbe4'; g.fillRect(x0 + g.measureText(cur).width + 3, y0 + line * lh - px * .78, px * .55, px * .92); }
  },

  /* 05 · II · THE KING. The stands now, empty, and the seat at the front,
     mended. On every beat he lights more of the seats: he keeps one for
     everybody, and nobody he has seated has ever been lost. */
  king(S) {
    const { g, W, H, lt, tu } = S;
    const k = eio(lt / 8);
    const c = camL([0, -560, 70, 0, 700, 330, 50, 0], [180, -380, 190, 0, 700, 300, 48, .03], k, W, H);
    fill(g, W, H, '#040406');
    const sk = g.createLinearGradient(0, 0, 0, H);
    sk.addColorStop(0, '#05050a'); sk.addColorStop(1, '#0d0906');
    g.fillStyle = sk; g.fillRect(-80, -80, W + 160, H + 160);
    standsLines(g, c, '#3b4a6b', .55, 1);
    crowd(g, c, '#3b4a6b', .45, false, lt);
    // the seats he keeps lit
    for (const s of STANDS.seats) {
      const on = .3 + s.d * 3.4 + hash(s.s) * .5;
      if (lt < on) continue;
      const q = P3(c, Math.cos(s.a) * s.R, STANDS.CY + Math.sin(s.a) * s.R, s.z + 30);
      if (!q) continue;
      const e = lt - on, r = cl(5 * q[2], 1.2, 4);
      g.fillStyle = rgba(C.lamp, .9); g.fillRect(q[0] - r / 2, q[1] - r / 2, r, r);
      light(g, q[0], q[1], r * 4, C.lamp, .18);
      if (e < .35) spark(g, q[0], q[1], e / .35, r * 2.5, C.goldHi);
    }
    throne(g, c, C.gold, 1, true, lt);
  },

  /* 06 · II · THE KEEPERS. A bar each for the ones who kept things going
     with nobody to keep them for: the counter kept open, the door locked to
     be opened again, the clutch counted, the book kept. */
  keepers(S) {
    const i = Math.min(3, Math.floor(S.lt / 2)), k = S.lt - i * 2;
    KEEP[i](S, k);
  },

  /* 07 · II · WHO THEY WERE. A pilot every two bars, each alone in its own
     weather, holding on to something. Halfway in, what it was before it
     forgot comes back behind it, put together from pieces. */
  pilots(S) {
    const i = Math.min(3, Math.floor(S.lt / 4)), k = S.lt - i * 4;
    PILOT[i](S, k);
    // the cut: a hairline wipes across and the next one is behind it
    const out = sm(3.75, 4, k);
    if (out > 0 && i < 3) {
      const { g, W, H } = S, x = lerp(-W * .2, W * 1.2, out);
      g.save(); g.beginPath(); g.moveTo(x - H * .3, -10); g.lineTo(W + 80, -10); g.lineTo(W + 80, H + 10); g.lineTo(x + H * .3, H + 10); g.closePath();
      g.fillStyle = '#000'; g.fill();
      g.beginPath(); g.moveTo(x - H * .3, -10); g.lineTo(x + H * .3, H + 10); stroke(g, '#ffffff', 1.5, 1);
      g.restore();
    }
  },

  /* 08 · II · THE ONE WHO STAYED. He came on the first upload, and he has
     the first page by heart. Around him everything runs backwards, toward
     the day it was one ship and five rooms. */
  stayed(S) {
    const { g, W, H, lt, tu, opt } = S;
    fill(g, W, H, '#06070a');
    const cx = W / 2, cy = H * .48, s = Math.min(W, H);
    // the clock, running back
    g.save(); g.translate(cx, cy);
    const R = s * .44;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); stroke(g, '#cbd5e1', 1, .25);
    g.beginPath();
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * TAU - lt * .9, l = i % 10 ? .025 : .06;
      g.moveTo(Math.cos(a) * R, Math.sin(a) * R); g.lineTo(Math.cos(a) * R * (1 - l), Math.sin(a) * R * (1 - l));
    }
    stroke(g, '#cbd5e1', 1, .35);
    const ha = -lt * 2.6 - PI / 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(ha) * R * .9, Math.sin(ha) * R * .9); stroke(g, '#e2e8f0', 1.5, .5);
    g.restore();
    // the first page
    const pw = s * .5, ph = s * .66, rot = -.04 + Math.sin(lt * .4) * .01;
    g.save(); g.translate(cx, cy - s * .02); g.rotate(rot);
    g.fillStyle = '#0d0e10'; g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.strokeStyle = rgba('#d8d3c8', .7); g.lineWidth = 1; g.strokeRect(-pw / 2, -ph / 2, pw, ph);
    font(g, 700, 20 * tu, F.mono); g.textAlign = 'left'; g.fillStyle = rgba('#d8d3c8', .85);
    g.fillText('1.0', -pw / 2 + 18 * tu, -ph / 2 + 34 * tu);
    g.beginPath();
    for (let i = 0; i < 16; i++) { const y = -ph / 2 + 60 * tu + i * (ph - 90 * tu) / 16; g.moveTo(-pw / 2 + 18 * tu, y); g.lineTo(-pw / 2 + 18 * tu + (pw - 36 * tu) * (.4 + .6 * hash(i * 3.1)), y); }
    stroke(g, '#d8d3c8', 1, .18);
    // one ship and five rooms
    const rk = eo((lt - 1) / 2.5);
    const rooms = [[-.28, .02], [0, .02], [.28, .02], [-.14, .26], [.14, .26]];
    rooms.forEach(([x, y], j) => {
      const q = eo((lt - 1 - j * .3) / .6);
      if (q <= 0) return;
      const sz = pw * .2;
      g.strokeStyle = rgba('#e2e8f0', .75 * q); g.strokeRect(x * pw - sz / 2, y * ph - sz / 2, sz, sz);
    });
    if (rk > 0) hull2(g, 'runner', 0, ph * .02, 1.1 * tu * (s / 720), -PI / 2, '#e2e8f0', rk, lt, { engine: 0 });
    g.restore();
    // everything else, going back where it came from
    for (let i = 0; i < 90; i++) {
      const a = hash(i * 3.7) * TAU, ph2 = (hash(i * 5.3) + lt * (.25 + hash(i) * .2)) % 1;
      const r = lerp(s * .9, s * .2, ph2), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r, l = 16 * tu * (1 - ph2);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); stroke(g, '#cbd5e1', 1, .35 * ph2);
    }
    // him, in front of it
    const fx = cx, fy = cy + ph * .5 + 6 * tu, fr = Math.min(W, H) * .07;
    polyPath(g, fx, fy, fr, 8, PI / 8); g.fillStyle = '#0a0b0e'; g.fill(); stroke(g, '#e2e8f0', 1.4, 1);
    polyPath(g, fx, fy, fr * .62, 8, PI / 8 + lt * -.3); stroke(g, '#e2e8f0', 1, .6);
    g.beginPath(); g.arc(fx, fy, fr * .14, 0, TAU); g.fillStyle = '#e2e8f0'; g.fill();
    // what he says
    const la = sm(1.6, 2.4, lt) * (1 - sm(7.4, 7.9, lt));
    g.textAlign = 'center';
    font(g, 600, 11 * tu, F.label); ls(g, .42); g.fillStyle = rgba('#94a3b8', la);
    g.fillText(opt.spoilers ? 'ONE POINT OH' : 'THE ONE WHO STAYED', W / 2, 48 * tu);
    ls(g, 0); font(g, 'italic 500', 30 * tu, F.serif); g.fillStyle = rgba(C.ink, la);
    g.fillText('“I remember it properly.”', W / 2, 86 * tu);
    g.save(); g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,1)'; g.fillRect(-80, -80, W + 160, H + 160); g.restore();
  },

  /* 09 · II · RESTORATION. Every piece of it, at once: the mark rebuilt from
     everything there was, seam by seam, the stands' lights in a ring round
     it, every pilot's colour drawn in. The words land on the downbeats. */
  restore(S) {
    const { g, W, H, lt, tu } = S;
    fill(g, W, H, '#04050a');
    const X = W / 2, Y = H / 2, R = Math.min(W, H) * lerp(.24, .31, eio(lt / 12));
    // the ring of seats, lit
    for (let i = 0; i < 160; i++) {
      const on = .2 + i / 160 * 9;
      if (lt < on) continue;
      const a = i / 160 * TAU - PI / 2 + lt * .03, rr = R * 1.42;
      const x = X + Math.cos(a) * rr, y = Y + Math.sin(a) * rr;
      g.fillStyle = rgba(C.lamp, .9); g.fillRect(x - 1.5, y - 1.5, 3, 3);
      if (lt - on < .3) spark(g, x, y, (lt - on) / .3, 10 * tu);
    }
    // threads in every pilot's colour, drawn toward it
    const cols = ['#67e8f9', '#f87171', '#a3e635', '#a5b4fc', '#fbbf24', '#4ade80', '#f97316', '#e2e8f0'];
    cols.forEach((col, j) => {
      const a = j / cols.length * TAU + lt * .12, k = eo((lt - .5 - j * .4) / 2);
      if (k <= 0) return;
      const x0 = X + Math.cos(a) * Math.max(W, H), y0 = Y + Math.sin(a) * Math.max(W, H);
      const x1 = lerp(x0, X + Math.cos(a) * R * 1.05, k), y1 = lerp(y0, Y + Math.sin(a) * R * 1.05, k);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); stroke(g, col, 1.2, .8);
      light(g, x1, y1, 30 * tu, col, .5);
    });
    g.save(); g.translate(X, Y); g.rotate(lt * .04); g.translate(-X, -Y);
    // the shape it is becoming, waiting for its pieces
    g.setLineDash([4, 6]);
    polyPath(g, X, Y, R, 6, 0); stroke(g, C.gold, 1, .3 * (1 - sm(8, 9.5, lt)));
    polyPath(g, X, Y, R * .74, 3, lt * .1); stroke(g, C.cyan, 1, .22 * (1 - sm(8, 9.5, lt)));
    polyPath(g, X, Y, R * .53, 3, -lt * .15 + 1); stroke(g, C.cyan, 1, .22 * (1 - sm(8, 9.5, lt)));
    g.setLineDash([]);
    const order = BIG.map(p => p.i).sort((a, b) => Math.hypot(BIG[b].cx, BIG[b].cy) - Math.hypot(BIG[a].cx, BIG[a].cy));
    const rank = new Map(order.map((id, k) => [id, k]));
    assemble(g, BIG, X, Y, R, lt, {
      start: p => .05 + rank.get(p.i) / BIG.length * 8.4, dur: .45, spread: Math.max(W, H) * .8, spin: 6,
      fill: '#0b1226', edge: '#3b4a6b', edgeW: 1, seamW: 1.8, sparks: true, sparkR: 12 * tu,
      content: gg => emblemArt(gg, lt, R)
    });
    g.restore();
    // the words
    const words = [[2, 'PUT IT BACK.'], [4, 'EVERY PIECE.'], [6, 'EVERY SEAT.'], [8, 'EVERY ONE.'], [10, 'THE WAY IT WAS.']];
    for (let i = 0; i < words.length; i++) {
      const [at, w] = words[i], q = lt - at, last = i === words.length - 1;
      if (q < 0 || q > (last ? 2 : 1.85)) continue;
      const px = Math.min((last ? 64 : 54) * tu, W * .065);
      const a = sm(0, .12, q) * (last ? 1 : 1 - sm(1.6, 1.85, q));
      font(g, 800, px, F.head); ls(g, .06); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const y = i % 2 ? H * .13 : H * .93, dx = (1 - eo(q / .25)) * (i % 2 ? 1 : -1) * 60 * tu;
      g.fillStyle = rgba('#ffffff', a);
      const tw = chars(g, w, W / 2 + dx, y, 'center', 2 * tu, (j, n) => ({ a: eo((q - j * .02) / .15) }));
      g.fillStyle = rgba(C.gold, a); g.fillRect(W / 2 - tw / 2, y + 12 * tu, tw * eo((q - .1) / .4), 2 * tu);
      ls(g, 0);
    }
    S.fx.white = Math.max(S.fx.white, sm(11.2, 12, lt));
  },

  /* 10 · III · MENDED. Up close, the mark is whole and every crack shows,
     filled in gold. It will not be what it was. */
  seams(S) {
    const { g, W, H, lt, tu } = S;
    fill(g, W, H, '#04050a');
    const R = Math.min(W, H) * 1.5, pan = eio(lt / 8);
    const X = W / 2 + lerp(R * .45, -R * .3, pan), Y = H / 2 + lerp(R * .25, -R * .15, pan);
    g.save(); g.translate(X, Y); g.rotate(.2 + lt * .015); g.translate(-X, -Y);
    for (const p of BIG) {
      ptsPath(g, p.pts, R, X, Y);
      g.fillStyle = '#0b1226'; g.fill();
      g.save(); ptsPath(g, p.pts, R, X, Y); g.clip(); g.translate(X, Y); g.scale(R, R); emblemArt(g, lt + 12, R); g.restore();
    }
    const dim = 1 - sm(6.6, 7.8, lt);
    for (const p of BIG) { g.save(); g.translate(X, Y); seam(g, p.pts, R, 1, 3); g.restore(); }
    // light running along the seams
    for (let i = 0; i < 40; i++) {
      const p = BIG[(i * 7) % BIG.length], e = (lt * .35 + hash(i)) % 1, n = p.pts.length, f = e * n, j = Math.floor(f), fr = f - j;
      const a = p.pts[j], b = p.pts[(j + 1) % n];
      light(g, X + lerp(a[0], b[0], fr) * R, Y + lerp(a[1], b[1], fr) * R, 26 * tu, C.gold, .7 * dim);
    }
    g.restore();
    if (dim < 1) { g.fillStyle = rgba('#020306', 1 - dim); g.fillRect(-80, -80, W + 160, H + 160); }
    S.fx.white = Math.max(S.fx.white, 1 - sm(0, .8, lt));
    const l1 = sm(1.6, 2.4, lt) * (1 - sm(6.8, 7.6, lt)), l2 = sm(3.8, 4.6, lt) * (1 - sm(6.8, 7.6, lt));
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const y = H * .5, ta = Math.max(l1, l2);
    if (ta > 0) {
      const sh = g.createRadialGradient(W / 2, y, 0, W / 2, y, 360 * tu);
      sh.addColorStop(0, rgba('#020306', .85 * ta)); sh.addColorStop(1, rgba('#020306', 0));
      g.fillStyle = sh; g.fillRect(-80, -80, W + 160, H + 160);
    }
    font(g, 'italic 500', 32 * tu, F.serif);
    g.fillStyle = rgba(C.ink, l1); g.fillText('It will not be what it was.', W / 2, y - 6 * tu);
    g.fillStyle = rgba(C.goldHi, l2); g.fillText('It will be mended.', W / 2, y + 42 * tu);
    font(g, 600, 10 * tu, F.label); ls(g, .42); g.fillStyle = rgba(C.mist, l2 * .9);
    g.fillText('THE RECORD', W / 2, y + 72 * tu); ls(g, 0);
  },

  /* 11 · III · THE FIRST ROOM. Seen from above, the way the game sees it:
     the lamp somebody kept lit, the grid ruling itself out from under it,
     and the ordinary hull coming in out of the dark to stand by it. */
  arrive(S) {
    const { g, W, H, lt, m } = S;
    fill(g, W, H, '#05060a');
    const lx = W / 2 + 110 * m, ly = H * .62;
    gridDraw(g, W, H, lx, ly, 56 * m, lt, 1);
    const pool = g.createRadialGradient(lx, ly, 0, lx, ly, 260 * m);
    pool.addColorStop(0, 'rgba(255,217,168,.16)'); pool.addColorStop(1, 'rgba(255,217,168,0)');
    g.fillStyle = pool; g.fillRect(-80, -80, W + 160, H + 160);
    lampTop(g, lx, ly, m, lt);
    const k = eio((lt - 1.2) / 4.2), hx = lerp(W / 2 - 40 * m, W / 2, k), hy = lerp(H + 80 * m, H * .62, k);
    hull2(g, 'runner', hx, hy, 1.7 * m, -PI / 2, C.cyan, 1, lt);
  },

  /* 12 · III · VOIDRUNNER. The mark draws itself where the menu keeps it,
     and a seam runs once through the hexagon before it settles. The name
     comes out of the drive's scramble. Then everything but the menu goes. */
  title(S) {
    const { g, W, H, lt, tu, m } = S;
    const A = menuAnchor(W, H);
    fill(g, W, H, C.bg);
    const fade = 1 - sm(4.6, 7.4, lt);
    if (fade > 0) {
      g.globalAlpha = fade;
      const lx = W / 2 + 110 * m, ly = H * .62;
      gridDraw(g, W, H, lx, ly, 56 * m, 99, fade);
      lampTop(g, lx, ly, m, lt + 8);
      hull2(g, 'runner', W / 2, H * .62 + Math.sin(lt * 2.2) * 1.5 * m, 1.7 * m, -PI / 2, C.cyan, 1, lt);
      g.globalAlpha = 1;
    }
    // the menu's field of lights, coming up
    for (let i = 0; i < 44; i++) {
      const a = sm(3.5 + hash(i) * 3, 4.5 + hash(i) * 3, lt);
      if (a <= 0) continue;
      const cols = [C.cyan, C.pink, '#a78bfa', '#4ade80', '#fcd34d'];
      light(g, hash(i * 3.3) * W, (hash(i * 7.1) * H - lt * 5 * m + H * 2) % H, (5 + hash(i * 2) * 8) * m, cols[i % 5], .4 * a);
    }
    const ex = W / 2, ey = A.y - 96 * A.s;
    g.save(); g.translate(ex, ey); g.scale(A.s, A.s);
    light(g, 0, 0, 96, C.cyan, .2 * sm(.4, 1.4, lt));
    tracePoly(g, 0, 0, 56, 6, lt * .32, eo((lt - .3) / .8), rgba(C.pink, .7), 2);
    tracePoly(g, 0, 0, 42, 3, lt * .6, eo((lt - .8) / .6), rgba(C.cyan, .85), 2);
    tracePoly(g, 0, 0, 30, 3, -lt * .9 + 1, eo((lt - 1.0) / .6), rgba(C.cyan, .85), 2);
    const sk = sm(1.2, 1.9, lt) * (1 - sm(2.6, 3.6, lt));
    if (sk > 0) {
      g.beginPath();
      const sp = [[-50, -18], [-26, -10], [-14, 8], [6, 2], [20, 18], [48, 22]];
      sp.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]));
      g.lineJoin = 'round'; stroke(g, C.gold, 2.4, sk); stroke(g, C.goldHi, .9, sk);
    }
    g.restore();
    if (lt > 1.6) {
      const k = sm(1.6, 2.6, lt), px = Math.min(84, W * .13) * A.s;
      g.save();
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      font(g, 800, px, F.head);
      g.shadowColor = C.cyan; g.shadowBlur = 34 * A.s * sm(2.2, 3.2, lt);
      g.fillStyle = '#e0f2fe';
      g.fillText(scramble('VOIDRUNNER', k, 77, lt), W / 2, A.y - 6 * A.s);
      g.restore();
      const st = 'S U R V I V E   T H E   A R E N A', n = Math.floor(st.length * sm(2.8, 3.8, lt));
      font(g, 600, 12 * A.s, F.head); g.textAlign = 'center'; g.fillStyle = '#475569';
      g.fillText(st.slice(0, n), W / 2, A.y + 26 * A.s);
    }
  }
};

/* ------------------------------------------------- pieces the shots share */
function throneScreen(W, H, lt) { const c = gloryCam(W, H, lt), p = P3(c, 0, STANDS.CY - 120, 160); return p ? [p[0], p[1]] : [W / 2, H * .6]; }
function gloryCam(W, H, lt) { return camL([0, -1500, 230, 0, 600, 300, 46, 0], [0, -1180, 420, 0, 600, 330, 46, 0], eio(lt / 8.6), W, H); }
function gloryScene(S, g, lt) {
  const { W, H, tu } = S;
  const c = gloryCam(W, H, lt);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0a0704'); bg.addColorStop(.55, '#1a1209'); bg.addColorStop(1, '#0b0805');
  g.fillStyle = bg; g.fillRect(-80, -80, W + 160, H + 160);
  // his sun, engraved
  const sun = P3(c, 0, 3200, 1100);
  if (sun) {
    const r = 900 * sun[2];
    g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(sun[0] + r * (1 - i * .06), sun[1]); g.arc(sun[0], sun[1], r * (1 - i * .06), 0, TAU); }
    stroke(g, C.gold, 1, .4);
    g.beginPath();
    for (let i = 0; i < 96; i++) { const a = i / 96 * TAU + lt * .01, l = i % 2 ? 1.35 : 1.7; g.moveTo(sun[0] + Math.cos(a) * r * 1.08, sun[1] + Math.sin(a) * r * 1.08); g.lineTo(sun[0] + Math.cos(a) * r * l, sun[1] + Math.sin(a) * r * l); }
    stroke(g, C.gold, .8, .22);
    polyPath(g, sun[0], sun[1], r * .7, 3, lt * .02); stroke(g, C.gold, 1.2, .5);
  }
  // spires behind
  for (let i = 0; i < 36; i++) {
    const x = (hash(i * 3.3) - .5) * 3400, y = 1900 + hash(i * 5.1) * 700, h = 400 + hash(i * 7.7) * 900, w = 40 + hash(i) * 50;
    const b1 = P3(c, x - w, y, 0), b2 = P3(c, x + w, y, 0), tp = P3(c, x, y, h);
    if (!b1 || !b2 || !tp) continue;
    const tri = [[b1[0], b1[1]], [b2[0], b2[1]], [tp[0], tp[1]]];
    ptsPath(g, tri); g.fillStyle = '#0f0a05'; g.fill();
    ptsPath(g, tri); hatch(g, [b1[0], tp[1], b2[0], b1[1]], 3, PI / 2, C.gold, .25, .7);
    ptsPath(g, tri); stroke(g, C.gold, 1, .5);
  }
  // the floor, ruled
  const fl = new Path2D();
  for (let i = -10; i <= 10; i++) { L3(fl, c, i * 160, -800, 0, i * 160, 2000, 0); }
  for (let j = -5; j <= 12; j++) L3(fl, c, -1600, j * 160, 0, 1600, j * 160, 0);
  g.lineWidth = .8; g.strokeStyle = rgba(C.gold, .14); g.stroke(fl);
  standsLines(g, c, C.gold, .6, 1);
  crowd(g, c, C.gold, .62, true, lt);
  // banners between pillars on the top rim
  const top = STANDS.tiers[STANDS.tiers.length - 1], RR = top.R + 20, zt = top.z + 44;
  for (let i = 0; i <= 8; i++) {
    const an = lerp(PI * .1, PI * .9, i / 8), x = Math.cos(an) * RR, y = STANDS.CY + Math.sin(an) * RR;
    const p0 = P3(c, x, y, zt), p1 = P3(c, x, y, zt + 260);
    if (!p0 || !p1) continue;
    g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); stroke(g, C.gold, 1.2, .7);
    if (i < 8) {
      const an2 = lerp(PI * .1, PI * .9, (i + .5) / 8), bx = Math.cos(an2) * (RR - 6), by = STANDS.CY + Math.sin(an2) * (RR - 6);
      const w = 50, q = [P3(c, bx - Math.sin(an2) * w, by + Math.cos(an2) * w, zt + 240), P3(c, bx + Math.sin(an2) * w, by - Math.cos(an2) * w, zt + 240),
        P3(c, bx + Math.sin(an2) * w, by - Math.cos(an2) * w, zt + 90), P3(c, bx, by, zt + 120), P3(c, bx - Math.sin(an2) * w, by + Math.cos(an2) * w, zt + 90)];
      if (q.every(v => v)) {
        const pts = q.map(v => [v[0] + Math.sin(lt * .9 + i) * 1.5, v[1]]);
        ptsPath(g, pts); g.fillStyle = '#1b1208'; g.fill();
        const xs = pts.map(v => v[0]), ys = pts.map(v => v[1]);
        ptsPath(g, pts); hatch(g, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 2.6, PI / 2, C.gold, .35, .6);
        ptsPath(g, pts); stroke(g, C.gold, 1, .85);
      }
    }
  }
  throne(g, c, C.gold, 1, false, lt);
  // medals on threads
  for (let i = 0; i < 13; i++) {
    const x = (i - 6) * 230 + Math.sin(lt * .7 + i) * 8, y = 700 + hash(i * 4.4) * 700, z = 640 + hash(i * 2.2) * 300;
    const p = P3(c, x, y, z), top2 = P3(c, x, y, z + 1200);
    if (!p) continue;
    const r = 30 * p[2] * 1.3;
    if (top2) { g.beginPath(); g.moveTo(p[0], p[1] - r); g.lineTo(top2[0], top2[1]); stroke(g, C.gold, .7, .5); }
    g.beginPath(); g.moveTo(p[0] - r * .5, p[1] - r * 2.1); g.lineTo(p[0], p[1] - r); g.lineTo(p[0] + r * .5, p[1] - r * 2.1); stroke(g, C.gold, 1, .8);
    g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fillStyle = '#1b1208'; g.fill(); stroke(g, C.gold, 1.2, .95);
    polyPath(g, p[0], p[1], r * .62, 3, lt * .3 + i); stroke(g, C.gold, 1, .8);
    const gl = (lt * .5 + hash(i * 9)) % 1;
    if (gl < .12) spark(g, p[0] + r * .4, p[1] - r * .4, gl / .12, r * 1.4);
  }
  // the place card
  const ca = sm(.6, 1.4, lt) * (1 - sm(4.6, 5.4, lt));
  if (ca > 0) {
    g.save(); g.globalAlpha = ca; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    font(g, 600, 12 * tu, F.label); ls(g, .42); g.fillStyle = C.gold;
    g.fillText('THE KINGDOM', 56 * tu, H * .82);
    ls(g, 0); font(g, 'italic 500', 18 * tu, F.serif); g.fillStyle = '#e8dcc6';
    g.fillText('as it was', 56 * tu, H * .82 + 26 * tu);
    g.restore();
  }
}
function gloryCrack(S, g, lt) {
  const { W, H } = S, o = throneScreen(W, H, lt), s = Math.min(W, H) * .9, k = (lt - 7.6) * 1.1;
  g.beginPath();
  for (const [x1, y1, x2, y2, at] of CRACK) if (at < k) { g.moveTo(o[0] + x1 * s, o[1] + y1 * s); g.lineTo(o[0] + x2 * s, o[1] + y2 * s); }
  stroke(g, '#000000', 3, .8); stroke(g, '#fff7e0', 1.2, .95);
  light(g, o[0], o[1], 120 * S.tu * cl(k, 0, 1), C.goldHi, .6);
}
// a lantern standing on (x, y): a frame of thin bars, glass, and a small flame
function lantern(g, x, y, s, t) {
  const w = 11 * s, h = 24 * s, br = '#d4b07a';
  g.beginPath(); g.moveTo(x - w * 1.25, y); g.lineTo(x + w * 1.25, y); g.lineTo(x + w, y - 3 * s); g.lineTo(x - w, y - 3 * s); g.closePath();
  g.fillStyle = '#1a1208'; g.fill(); stroke(g, br, 1, 1);
  g.beginPath(); g.moveTo(x - w, y - 3 * s); g.lineTo(x - w * .85, y - h); g.lineTo(x + w * .85, y - h); g.lineTo(x + w, y - 3 * s); g.closePath();
  g.fillStyle = 'rgba(255,214,150,.13)'; g.fill(); stroke(g, br, 1.1, 1);
  g.beginPath(); g.moveTo(x, y - 3 * s); g.lineTo(x, y - h); stroke(g, br, .7, .7);
  g.beginPath(); g.moveTo(x - w * 1.05, y - h); g.lineTo(x, y - h - w * .8); g.lineTo(x + w * 1.05, y - h); g.closePath();
  g.fillStyle = '#1a1208'; g.fill(); stroke(g, br, 1.1, 1);
  g.beginPath(); g.arc(x, y - h - w * 1.15, w * .38, PI * 1.05, PI * 1.95); stroke(g, br, 1, 1);
  const fl = 1 + .1 * Math.sin(t * 17) + .06 * Math.sin(t * 31);
  g.beginPath(); g.moveTo(x, y - h * .74 * fl); g.quadraticCurveTo(x + w * .36, y - h * .38, x, y - h * .2); g.quadraticCurveTo(x - w * .36, y - h * .38, x, y - h * .74 * fl);
  g.fillStyle = C.flame; g.fill();
  g.beginPath(); g.moveTo(x, y - h * .55 * fl); g.quadraticCurveTo(x + w * .16, y - h * .36, x, y - h * .26); g.quadraticCurveTo(x - w * .16, y - h * .36, x, y - h * .55 * fl);
  g.fillStyle = '#ffffff'; g.fill();
}
function lampTop(g, x, y, m, t) {
  light(g, x, y, 90 * m, C.lamp, .8 + .05 * Math.sin(t * 17));
  g.beginPath(); g.rect(x - 9 * m, y - 9 * m, 18 * m, 18 * m); g.fillStyle = 'rgba(40,26,10,.7)'; g.fill(); stroke(g, '#c9a46a', 1.2, 1);
  g.beginPath(); g.arc(x, y, 4 * m, 0, TAU); g.fillStyle = C.flame; g.fill();
}
// the game's grid, ruled out from (cx, cy) as it is drawn
function gridDraw(g, W, H, cx, cy, sp, t, a) {
  const minor = new Path2D(), major = new Path2D();
  const nx = Math.ceil(W / sp) + 2, ny = Math.ceil(H / sp) + 2;
  for (let i = -nx; i <= nx; i++) {
    const p = eo((t - .2 - Math.abs(i) * .05) / .8);
    if (p <= 0) continue;
    const x = cx + i * sp, L = Math.max(W, H) * 1.2 * p, P = i % 4 ? minor : major;
    P.moveTo(x, cy - L); P.lineTo(x, cy + L);
  }
  for (let j = -ny; j <= ny; j++) {
    const p = eo((t - .3 - Math.abs(j) * .05) / .8);
    if (p <= 0) continue;
    const y = cy + j * sp, L = Math.max(W, H) * 1.2 * p, P = j % 4 ? minor : major;
    P.moveTo(cx - L, y); P.lineTo(cx + L, y);
  }
  g.lineWidth = 1; g.strokeStyle = rgba('#16243c', a); g.stroke(minor);
  g.strokeStyle = rgba('#1d3557', a); g.stroke(major);
}
// where the menu keeps its mark and name: the same sums as renderMenu()
function menuAnchor(W, H) {
  const topLimit = 96, roomy = H >= 430, tiny = H < 340, footTop = H - (roomy ? 138 : tiny ? 72 : 92);
  const avail = Math.max(96, footTop - topLimit), s = cl(avail / 390, .3, 1);
  return { y: topLimit + avail / 2 - 43 * s, s };
}
function tracePoly(g, x, y, r, n, rot, k, col, lw) {
  if (k <= 0) return;
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = rot + i / n * TAU - PI / 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  const upto = k * n;
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= n && i - 1 < upto; i++) { const f = Math.min(1, upto - (i - 1)); g.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); }
  g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke();
}

/* ------------------------------------------------------------ the keepers */
// a tableau's frame: a diagonal of a lighter dark, a hairline in its colour, and its line
function tableau(S, k, col, label, line) {
  const { g, W, H, tu } = S;
  fill(g, W, H, '#04050a');
  const tilt = H * .22;
  g.beginPath(); g.moveTo(-80, H * .72 + tilt); g.lineTo(W + 80, H * .72 - tilt); g.lineTo(W + 80, -80); g.lineTo(-80, -80); g.closePath();
  g.fillStyle = '#070a14'; g.fill();
  const hp = eo(k / .35);
  g.beginPath(); g.moveTo(-80, H * .72 + tilt); g.lineTo(lerp(-80, W + 80, hp), lerp(H * .72 + tilt, H * .72 - tilt, hp)); stroke(g, col, 1.2, .8);
  motes(g, k + 20, W, H, 50, col, .35, 8, 9, 1.4 * tu);
  return () => {
    const a = sm(.35, .7, k) * (1 - sm(1.82, 1.98, k));
    const x = 56 * tu, y = H * .86;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    font(g, 600, 11 * tu, F.label); ls(g, .42); g.fillStyle = rgba(col, a);
    g.fillText(label, x, y - 44 * tu);
    ls(g, 0);
    let px = 30 * tu;
    font(g, 'italic 500', px, F.serif);
    const w = g.measureText(line).width;
    if (w > W - x * 2) { px *= (W - x * 2) / w; font(g, 'italic 500', px, F.serif); }
    g.fillStyle = rgba(C.ink, a); g.fillText(line, x, y);
  };
}
const KEEP = [
  // THE SHOPKEEPER: a counter kept open, and a scale kept level
  (S, k) => {
    const { g, W, H, tu } = S;
    const col = '#fbbf24', say = tableau(S, k, col, 'THE SHOPKEEPER', 'A counter that is shut is a kingdom that is over.');
    const cx = H > W * 1.05 ? W / 2 : W * .6, cy = H * .5, s = Math.min(W, H) / 720, d = eo(k / .5);
    // the lamp over it
    g.beginPath(); g.moveTo(cx, -10); g.lineTo(cx, cy - 190 * s); stroke(g, col, 1, .6);
    g.beginPath(); g.moveTo(cx - 34 * s, cy - 150 * s); g.lineTo(cx - 14 * s, cy - 190 * s); g.lineTo(cx + 14 * s, cy - 190 * s); g.lineTo(cx + 34 * s, cy - 150 * s); g.closePath();
    g.fillStyle = '#120d05'; g.fill(); stroke(g, col, 1.2, .9);
    light(g, cx, cy - 146 * s, 160 * s, C.lamp, .55);
    const cone = g.createLinearGradient(0, cy - 150 * s, 0, cy + 90 * s);
    cone.addColorStop(0, 'rgba(255,217,168,.14)'); cone.addColorStop(1, 'rgba(255,217,168,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(cx - 34 * s, cy - 150 * s); g.lineTo(cx + 34 * s, cy - 150 * s); g.lineTo(cx + 260 * s, cy + 90 * s); g.lineTo(cx - 260 * s, cy + 90 * s); g.closePath(); g.fill();
    // the counter
    const cw = 330 * s;
    g.beginPath(); g.moveTo(cx - cw, cy + 40 * s); g.lineTo(cx + cw, cy + 40 * s); g.lineTo(cx + cw - 40 * s, cy + 10 * s); g.lineTo(cx - cw + 40 * s, cy + 10 * s); g.closePath();
    g.fillStyle = '#0f0c06'; g.fill(); stroke(g, col, 1.2, d);
    g.beginPath(); g.rect(cx - cw, cy + 40 * s, cw * 2, 120 * s); g.fillStyle = '#0a0804'; g.fill(); stroke(g, col, 1.2, d);
    g.beginPath(); g.rect(cx - cw, cy + 40 * s, cw * 2, 120 * s); hatch(g, [cx - cw, cy + 40 * s, cx + cw, cy + 160 * s], 5 * s, PI / 2, col, .18 * d, .8);
    // the scale, level
    const sw = Math.sin(k * 2.2) * .03 * (1 - k / 2);
    const px = cx - 120 * s, py = cy + 25 * s;
    g.beginPath(); g.moveTo(px - 30 * s, py); g.lineTo(px + 30 * s, py); g.moveTo(px, py); g.lineTo(px, py - 120 * s); stroke(g, col, 1.4, d);
    g.save(); g.translate(px, py - 120 * s); g.rotate(sw);
    g.beginPath(); g.moveTo(-90 * s, 0); g.lineTo(90 * s, 0); stroke(g, col, 1.6, d);
    for (const sd of [-1, 1]) {
      g.beginPath(); g.moveTo(sd * 90 * s, 0); g.lineTo(sd * 90 * s - 26 * s, 60 * s); g.moveTo(sd * 90 * s, 0); g.lineTo(sd * 90 * s + 26 * s, 60 * s); stroke(g, col, .8, d * .8);
      g.beginPath(); g.ellipse(sd * 90 * s, 62 * s, 30 * s, 7 * s, 0, 0, PI); stroke(g, col, 1.2, d);
    }
    g.restore();
    // the sign, still turned to OPEN
    g.save(); g.translate(cx + 150 * s, cy - 30 * s); g.rotate(Math.sin(k * 1.4) * .04);
    g.beginPath(); g.moveTo(-30 * s, -50 * s); g.lineTo(0, -80 * s); g.lineTo(30 * s, -50 * s); stroke(g, col, .8, d);
    g.beginPath(); g.rect(-56 * s, -50 * s, 112 * s, 40 * s); g.fillStyle = '#120d05'; g.fill(); stroke(g, col, 1.2, d);
    font(g, 700, 18 * s, F.label); ls(g, .3); g.textAlign = 'center'; g.fillStyle = rgba(col, d); g.fillText('OPEN', 2 * s, -23 * s); ls(g, 0);
    g.restore();
    say();
  },
  // FORGEHEART: a door locked gently, from outside
  (S, k) => {
    const { g, W, H, tu } = S;
    const col = '#f97316', say = tableau(S, k, col, 'THE FOUNDRY', 'He locked it the way you lock a door you mean to open.');
    const cx = H > W * 1.05 ? W / 2 : W * .6, cy = H * .47, s = Math.min(W, H) / 720, d = eo(k / .5);
    const dw = 150 * s, dh = 300 * s;
    g.beginPath(); g.rect(cx - dw - 24 * s, cy - dh - 24 * s, dw * 2 + 48 * s, dh * 2 + 24 * s); stroke(g, col, 1, .4 * d);
    g.beginPath(); g.rect(cx - dw, cy - dh, dw * 2, dh * 2); g.fillStyle = '#0e0905'; g.fill(); stroke(g, col, 1.4, d);
    g.beginPath(); g.rect(cx - dw, cy - dh, dw * 2, dh * 2); hatch(g, [cx - dw, cy - dh, cx + dw, cy + dh], 6 * s, PI / 2, col, .14 * d, .8);
    for (const [x, y, w, h] of [[-.8, -.85, .7, .7], [.1, -.85, .7, .7], [-.8, .05, .7, .75], [.1, .05, .7, .75]]) {
      g.beginPath(); g.rect(cx + x * dw, cy + y * dh, w * dw, h * dh); stroke(g, col, 1, .5 * d);
    }
    // through the little window: four plates turning
    const wx = cx, wy = cy - dh * .45, wr = 44 * s;
    g.save(); g.beginPath(); g.arc(wx, wy, wr, 0, TAU); g.fillStyle = '#1a0d04'; g.fill(); g.clip();
    light(g, wx, wy, wr * 1.8, '#f97316', .9);
    for (let p = 0; p < 4; p++) { g.beginPath(); g.arc(wx, wy, wr * .62, k * 1.2 + p * PI / 2, k * 1.2 + p * PI / 2 + .95); stroke(g, '#fdba74', 3 * s, 1); }
    g.restore();
    g.beginPath(); g.arc(wx, wy, wr, 0, TAU); stroke(g, col, 1.4, d);
    // light under the door
    g.fillStyle = rgba('#fb923c', .8); g.fillRect(cx - dw, cy + dh - 2, dw * 2, 2);
    light(g, cx, cy + dh, dw * .9, '#fb923c', .35);
    // the key, turning slowly
    const kx = cx + dw * .72, ky = cy + 20 * s, kr = eio((k - .4) / 1.2) * PI / 2;
    g.beginPath(); g.arc(kx, ky, 8 * s, 0, TAU); g.fillStyle = '#000'; g.fill(); stroke(g, col, 1, d);
    g.save(); g.translate(kx, ky); g.rotate(kr);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(60 * s, 0); stroke(g, '#fde68a', 2.4 * s, 1);
    g.beginPath(); g.arc(78 * s, 0, 18 * s, 0, TAU); stroke(g, '#fde68a', 2.4 * s, 1);
    g.beginPath(); g.arc(78 * s, 0, 8 * s, 0, TAU); stroke(g, '#fde68a', 1.4 * s, 1);
    g.restore();
    say();
  },
  // BROODMOTHER: every one of them counted
  (S, k) => {
    const { g, W, H, tu } = S;
    const col = '#4ade80', say = tableau(S, k, col, 'THE HIVE', 'Every one of them is counted.');
    const cx = H > W * 1.05 ? W / 2 : W * .6, cy = H * .46, s = Math.min(W, H) / 720, r = 44 * s, wv = Math.sqrt(3) * r;
    const cells = [];
    for (let q = -2; q <= 2; q++) for (let rr = -2; rr <= 2; rr++) { if (Math.abs(q + rr) > 2) continue; cells.push([cx + wv * (q + rr / 2), cy + r * 1.5 * rr]); }
    cells.sort((a, b) => hash(a[0] * .37 + a[1]) - hash(b[0] * .37 + b[1]));
    let n = 0;
    cells.forEach(([x, y], j) => {
      const on = .25 + j * .085, a = eo((k - .05 - j * .02) / .3);
      polyPath(g, x, y, r * .96, 6, PI / 6 - PI / 2 + PI / 2); g.fillStyle = '#06100a'; g.fill(); stroke(g, col, 1.2, a);
      if (k > on) {
        n++;
        const e = eo((k - on) / .25);
        g.beginPath(); g.ellipse(x, y, r * .34 * e, r * .46 * e, 0, 0, TAU); g.fillStyle = '#0d2214'; g.fill(); stroke(g, '#86efac', 1.2, 1);
        font(g, 600, 10 * s, F.mono); g.textAlign = 'center'; g.fillStyle = rgba('#bbf7d0', e); g.fillText(String(j + 1), x, y + r * .78);
      }
    });
    font(g, 700, 64 * s, F.mono); g.textAlign = 'right'; g.fillStyle = rgba(col, .9 * sm(.2, .4, k));
    g.fillText(String(n).padStart(2, '0'), W - 56 * tu, H * .3);
    font(g, 600, 11 * s, F.label); ls(g, .4); g.fillText('COUNTED', W - 56 * tu, H * .3 + 22 * s); ls(g, 0);
    say();
  },
  // THE BOOKKEEPER: the book kept, so that it can be finished
  (S, k) => {
    const { g, W, H, tu } = S;
    const col = '#fcd34d', say = tableau(S, k, col, 'THE BOOKKEEPER', 'I want the book finished, because then I may stop.');
    const cx = H > W * 1.05 ? W / 2 : W * .6, cy = H * .5, s = Math.min(W, H) / 720;
    const pg = (side) => {
      const sx = side;
      return [[cx, cy - 150 * s], [cx + sx * 300 * s, cy - 120 * s], [cx + sx * 320 * s, cy + 110 * s], [cx, cy + 90 * s]];
    };
    for (const sd of [-1, 1]) {
      const p = pg(sd);
      ptsPath(g, p); g.fillStyle = '#0f0d08'; g.fill(); stroke(g, col, 1.3, 1);
      for (let l = 0; l < 13; l++) {
        const q = (l + 1) / 14, a0 = [lerp(p[0][0], p[3][0], q), lerp(p[0][1], p[3][1], q)], a1 = [lerp(p[1][0], p[2][0], q), lerp(p[1][1], p[2][1], q)];
        const done = sd < 0 ? 1 : cl((k * 7 - l) / 1, 0, 1);
        g.beginPath(); g.moveTo(lerp(a0[0], a1[0], .06), lerp(a0[1], a1[1], .06)); g.lineTo(lerp(a0[0], a1[0], .06), lerp(a0[1], a1[1], .06));
        g.lineTo(lerp(a0[0], a1[0], .06 + .86 * done * (.55 + .45 * hash(l * 3 + sd))), lerp(a0[1], a1[1], .06 + .86 * done * (.55 + .45 * hash(l * 3 + sd))));
        stroke(g, col, 1, .45);
        if (sd < 0 && hash(l * 7.7) > .35) {
          g.beginPath(); g.moveTo(lerp(a0[0], a1[0], .05), lerp(a0[1], a1[1], .05) - 3 * s); g.lineTo(lerp(a0[0], a1[0], .9), lerp(a0[1], a1[1], .9) - 3 * s);
          stroke(g, col, 1.4, .8);
        }
      }
    }
    g.beginPath(); g.moveTo(cx, cy - 150 * s); g.lineTo(cx, cy + 90 * s); stroke(g, col, 1.6, 1);
    // the pen, writing the next line
    const l = Math.min(12, Math.floor(k * 7)), f = k * 7 - l, p = pg(1), q = (l + 1) / 14;
    const a0 = [lerp(p[0][0], p[3][0], q), lerp(p[0][1], p[3][1], q)], a1 = [lerp(p[1][0], p[2][0], q), lerp(p[1][1], p[2][1], q)];
    const nx = lerp(a0[0], a1[0], .06 + .86 * f * (.55 + .45 * hash(l * 3 + 1))), ny = lerp(a0[1], a1[1], .06 + .86 * f * (.55 + .45 * hash(l * 3 + 1)));
    g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 120 * s, ny - 140 * s); stroke(g, '#fde68a', 2.2 * s, 1);
    g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + 14 * s, ny - 4 * s); g.lineTo(nx + 4 * s, ny - 14 * s); g.closePath(); g.fillStyle = '#fde68a'; g.fill();
    say();
  }
];

/* -------------------------------------------------------------- the pilots */
// who each was before it forgot: convex silhouettes, so they break and mend cleanly
const CLOAK = [[0, -1], [.3, -.8], [.62, -.35], [.7, .98], [-.7, .98], [-.62, -.35], [-.3, -.8]];
const GHOST = {
  melee: shatter(CLOAK, 20, 31),
  ember: shatter([[0, -1], [.38, -.55], [.66, 0], [.7, .5], [.5, .9], [0, 1.02], [-.5, .9], [-.7, .5], [-.66, 0], [-.38, -.55]], 20, 37),
  hacker: shatter([[-1, -.95], [1, -.95], [.8, .35], [0, 1], [-.8, .35]], 20, 41)
};
function ghost(g, id, X, Y, R, k, col, edge, content) {
  assemble(g, GHOST[id], X, Y, R, k, {
    start: p => 1.5 + p.h2 * .6, dur: .4, spread: R * 1.6, spin: 3, fill: 'rgba(6,7,14,.92)', edge, edgeA: .55, seamW: 1.6,
    sparks: true, sparkR: 12, content: gg => content(gg, 1 / R)
  });
  // once whole, a hairline round all of it
  const w = sm(2.4, 3, k);
  if (w > 0) {
    const sil = id === 'melee' ? CLOAK
      : id === 'ember' ? [[0, -1], [.38, -.55], [.66, 0], [.7, .5], [.5, .9], [0, 1.02], [-.5, .9], [-.7, .5], [-.66, 0], [-.38, -.55]]
      : [[-1, -.95], [1, -.95], [.8, .35], [0, 1], [-.8, .35]];
    ptsPath(g, sil, R * 1.04, X, Y); stroke(g, col, 1, .5 * w);
  }
}
function pilotText(S, k, col, label, line, maker) {
  const { g, W, H, tu } = S;
  const tall = H > W * 1.05, x = tall ? W * .08 : W * .58, maxW = tall ? W * .84 : W * .37, y = tall ? H * .85 : H * .42;
  const a = sm(.5, .9, k) * (1 - sm(3.6, 3.9, k));
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  font(g, 600, 12 * tu, F.label); ls(g, .42); g.fillStyle = rgba(col, a);
  g.fillText(label, x, y - 20 * tu);
  ls(g, 0);
  g.fillStyle = rgba(col, a); g.fillRect(x, y - 8 * tu, 40 * tu * eo((k - .6) / .5), 1.5);
  const px = maker ? 23 * tu : 34 * tu;
  font(g, maker ? 400 : 'italic 500', px, maker ? F.maker : F.serif);
  const lines = wrap(g, maker ? line : '“' + line + '”', maxW);
  g.fillStyle = rgba(C.ink, a);
  lines.forEach((L, i) => g.fillText(L, x, y + 34 * tu + i * px * 1.3));
}
const PILOT = [
  // THE VAGRANT: rain, her grave carried on its back, and the strongest thing there is ahead of it
  (S, k) => {
    const { g, W, H, m } = S;
    fill(g, W, H, '#05060c');
    const hz = H * .74, col = '#a5b4fc';
    const bx = W * .86;
    g.beginPath(); g.moveTo(bx - 280 * m, hz); g.lineTo(bx - 130 * m, hz - 330 * m); g.lineTo(bx + 30 * m, hz - 390 * m); g.lineTo(bx + 210 * m, hz - 270 * m); g.lineTo(bx + 320 * m, hz); g.closePath();
    g.fillStyle = '#080913'; g.fill(); stroke(g, '#3b4a6b', 1, .7);
    g.beginPath(); g.moveTo(-80, hz); g.lineTo(W + 80, hz); stroke(g, col, 1, .5);
    const hx = W * ((H > W * 1.05 ? .5 : .27) + k * .012), hy = hz - 46 * m;
    ghost(g, 'melee', hx, H * .4, Math.min(H * .28, W * .4), k, col, '#3b4a6b', (gg, px) => {
      gg.beginPath(); gg.moveTo(0, -.78); gg.quadraticCurveTo(.26, -.62, .2, -.32); gg.lineTo(-.2, -.32); gg.quadraticCurveTo(-.26, -.62, 0, -.78); gg.closePath();
      gg.fillStyle = '#000'; gg.fill();
      gg.beginPath(); gg.arc(.07, -.5, .035, 0, TAU); gg.fillStyle = '#ef4444'; gg.fill();
      gg.beginPath(); gg.moveTo(-.95, .25); gg.lineTo(.95, -.2); stroke(gg, '#e2e8f0', 2.2 * px, .95);
      gg.beginPath(); for (let i = -6; i <= 6; i++) { gg.moveTo(i * .1, -.2); gg.lineTo(i * .13, 1); } stroke(gg, col, px, .15);
    });
    g.save(); g.translate(0, hz * 2); g.scale(1, -1); g.globalAlpha = .18; hull2(g, 'melee', hx, hy, 3.4 * m, -PI / 2, col, 1, k, { engine: 0 }); g.restore();
    // her grave, carried behind it
    const gx = hx - 30 * m, gy = hz - 4 * m, gw = 24 * m, gh = 92 * m;
    g.save(); g.translate(gx, gy); g.rotate(-.12);
    g.beginPath(); g.moveTo(-gw, 0); g.lineTo(-gw, -gh + gw); g.arc(0, -gh + gw, gw, PI, 0); g.lineTo(gw, 0); g.closePath();
    g.fillStyle = '#0a0b14'; g.fill(); stroke(g, col, 1.2, 1);
    g.beginPath(); g.moveTo(0, -gh + 14 * m); g.lineTo(0, -gh + 52 * m); g.moveTo(-11 * m, -gh + 28 * m); g.lineTo(11 * m, -gh + 28 * m); stroke(g, '#f87171', 1.2, .9);
    g.restore();
    hull2(g, 'melee', hx, hy, 3.4 * m, -PI / 2, col, 1, k, { engine: 0 });
    g.beginPath();
    for (let i = 0; i < 150; i++) {
      const x = (hash(i * 3.1) * (W + 200) + k * 40) % (W + 200) - 100, sp = 1300 + hash(i) * 600;
      const y = (hash(i * 7.3) * H + k * sp) % (H + 60) - 30;
      g.moveTo(x, y); g.lineTo(x - 7 * m, y + 26 * m);
    }
    stroke(g, '#94a3b8', 1, .32);
    pilotText(S, k, col, 'THE VAGRANT', 'I will not leave her again.');
  },
  // EMBER: a field on fire, and the one thing in it that will not run
  (S, k) => {
    const { g, W, H, m } = S;
    const hz = H * .76, col = '#f87171';
    const sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#080303'); sky.addColorStop(1, '#2a0904');
    g.fillStyle = sky; g.fillRect(-80, -80, W + 160, H + 160);
    const hx = H > W * 1.05 ? W / 2 : W * .3;
    ghost(g, 'ember', hx, H * .4, Math.min(H * .29, W * .42), k, '#fb923c', '#7c2d12', (gg, px) => {
      for (let i = 0; i < 4; i++) {
        const s = 1 - i * .2;
        gg.beginPath(); gg.moveTo(0, -.9 * s); gg.quadraticCurveTo(.5 * s, -.2 * s, .2 * s, .6 * s); gg.quadraticCurveTo(0, .9 * s, -.2 * s, .6 * s); gg.quadraticCurveTo(-.5 * s, -.2 * s, 0, -.9 * s);
        stroke(gg, ['#b91c1c', '#ea580c', '#fb923c', '#fde68a'][i], 1.6 * px, .85);
      }
      gg.beginPath(); gg.arc(-.13, -.12, .045, 0, TAU); gg.arc(.13, -.12, .045, 0, TAU); gg.fillStyle = '#fff7d6'; gg.fill();
    });
    // the fire: tongues outlined like an engraving, three deep
    const layers = [[1, '#7f1d1d', '#ef4444'], [.7, '#9a3412', '#f97316'], [.42, '#a16207', '#fde68a']];
    for (const [sc, fillc, line] of layers) {
      const tongues = new Path2D();
      for (let i = 0; i < 18; i++) {
        const x = (i / 17) * (W + 160) - 80 + Math.sin(i * 7.7) * 20 * m;
        const h = (90 + hash(i * 3.7) * 150) * m * sc * (.85 + .15 * Math.sin(k * 5 + i * 1.7)), w = 46 * m * sc + 20 * m;
        const sway = Math.sin(k * 3.2 + i * 1.3) * 14 * m;
        tongues.moveTo(x - w, hz + 2);
        tongues.bezierCurveTo(x - w * .6, hz - h * .45, x - w * .1 + sway * .5, hz - h * .7, x + sway, hz - h);
        tongues.bezierCurveTo(x + w * .2 + sway * .4, hz - h * .62, x + w * .7, hz - h * .4, x + w, hz + 2);
        tongues.closePath();
      }
      const gr = g.createLinearGradient(0, hz - 260 * m * sc, 0, hz);
      gr.addColorStop(0, rgba(fillc, .55)); gr.addColorStop(1, rgba(fillc, .95));
      g.fillStyle = gr; g.fill(tongues);
      g.lineWidth = 1.2; g.strokeStyle = line; g.stroke(tongues);
    }
    g.fillStyle = '#0d0302'; g.fillRect(-80, hz, W + 160, H - hz + 80);
    g.beginPath(); g.moveTo(-80, hz); g.lineTo(W + 80, hz); stroke(g, '#fdba74', 1, .8);
    g.fillStyle = '#fde68a';
    for (let i = 0; i < 46; i++) {
      const ph = (hash(i * 5.3) + k * (.22 + hash(i) * .25)) % 1, x = hash(i * 2.9) * W + Math.sin(k * 2 + i) * 20 * m, y = lerp(hz - 40 * m, -20, ph);
      g.globalAlpha = (1 - ph) * .9; g.fillRect(x, y, 1.6 * m, 1.6 * m);
    }
    g.globalAlpha = 1;
    hull2(g, 'ember', hx, hz - 50 * m, 3.4 * m, -PI / 2, col, 1, k);
    pilotText(S, k, col, 'EMBER', 'I ran once. That is the whole of it.');
  },
  // THE HACKER: seven pieces carried home, and itself put back whole
  (S, k) => {
    const { g, W, H, m } = S;
    fill(g, W, H, '#030603');
    const col = '#a3e635', hx = H > W * 1.05 ? W / 2 : W * .3, hy = H * .66;
    font(g, 500, 12 * m, F.mono); g.textAlign = 'left';
    for (let c = 0; c < 26; c++) {
      const x = c / 26 * W, off = (k * (40 + hash(c) * 60) * m + hash(c * 3) * H) % H;
      for (let r = 0; r < 14; r++) {
        const y = (off + r * 26 * m) % H;
        g.fillStyle = rgba(col, .06 + .08 * hash(c * 31 + r));
        g.fillText(GLYPHS[Math.floor(hash(c * 7 + r + Math.floor(k * 6)) * GLYPHS.length)], x, y);
      }
    }
    ghost(g, 'hacker', hx, H * .34, Math.min(H * .26, W * .4), k, '#fcd34d', '#3f6212', (gg, px) => {
      for (const sd of [-1, 1]) {
        gg.beginPath(); gg.moveTo(sd * .22, .05); gg.bezierCurveTo(sd * .7, -.1, sd * .9, -.5, sd * .5, -.88);
        stroke(gg, '#fcd34d', 5 * px, .95); stroke(gg, '#fff7d6', 1.4 * px, 1);
      }
      gg.beginPath(); gg.arc(-.12, .22, .045, 0, TAU); gg.arc(.12, .22, .045, 0, TAU); gg.fillStyle = '#fcd34d'; gg.fill();
      gg.beginPath(); gg.ellipse(0, .62, .6, .12, 0, 0, TAU); stroke(gg, '#fcd34d', 1.2 * px, .7);
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; gg.fillStyle = 'rgba(252,211,77,.7)'; gg.fillRect(Math.cos(a) * .6 - .01, .62 + Math.sin(a) * .12 - .015, .02, .03); }
    });
    hull2(g, 'hacker', hx, hy, 3.4 * m, -PI / 2, col, 1, k);
    for (let j = 0; j < 7; j++) {
      const at = .3 + j * .3, e = eio((k - at + .9) / .9), an = j / 7 * TAU + .4;
      const sx = hx + Math.cos(an) * W * .5, sy = hy + Math.sin(an) * H * .6;
      const hp = HULL.hacker, vi = (j * 2) % hp.length;
      const tx = hx + hp[vi + 1] * 3.4 * m, ty = hy - hp[vi] * 3.4 * m;
      if (e < 1) {
        const x = lerp(sx, tx, e), y = lerp(sy, ty, e);
        g.save(); g.translate(x, y); g.rotate(k * 3 + j);
        g.beginPath(); g.moveTo(0, -8 * m); g.lineTo(7 * m, 6 * m); g.lineTo(-6 * m, 5 * m); g.closePath(); g.fillStyle = '#0d1a05'; g.fill(); stroke(g, col, 1.2, 1);
        g.restore();
      } else {
        spark(g, tx, ty, (k - at) / .35, 16 * m);
        const q = cl((k - at) / .3, 0, 1);
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(lerp(hx, tx, q), lerp(hy, ty, q)); g.lineCap = 'round'; stroke(g, C.gold, 1.8, 1); stroke(g, C.goldHi, .6, 1); g.lineCap = 'butt';
      }
    }
    pilotText(S, k, col, 'THE HACKER', 'Not a piece of him. Whole, and mine.');
  },
  // VOIDRUNNER: nothing on it, and nothing missing from it
  (S, k) => {
    const { g, W, H, m } = S;
    fill(g, W, H, '#05060a');
    const pull = lerp(1.35, 1, eio((k - 1.2) / 2.2)), cx = H > W * 1.05 ? W / 2 : W * .3, cy = H * .55;
    g.save(); g.translate(cx, cy); g.scale(pull, pull); g.translate(-cx, -cy);
    gridDraw(g, W, H, cx, cy, 56 * m, 99, .9);
    for (let i = 0; i < 12; i++) {
      const a = sm(1.4 + i * .1, 2 + i * .1, k);
      if (a <= 0) continue;
      const x = cx + (hash(i * 3.1) - .5) * W * 1.15, y = cy + (hash(i * 5.7) - .5) * H * 1.15, r = (22 + hash(i) * 36) * m;
      if (Math.hypot(x - cx, y - cy) < 130 * m) continue;
      const P = shatter(ngon(1, 3 + (i % 4), hash(i) * 3), 5, i * 9 + 1);
      g.save(); g.globalAlpha = a;
      for (const p of P) { ptsPath(g, p.pts, r, x, y); g.fillStyle = '#0b1226'; g.fill(); stroke(g, '#3b4a6b', 1, 1); }
      for (const p of P) { g.save(); g.translate(x, y); seam(g, p.pts, r, 1, 1.6); g.restore(); }
      g.restore();
    }
    hull2(g, 'runner', cx, cy, 3.2 * m, -PI / 2, C.cyan, 1, k);
    g.restore();
    pilotText(S, k, C.cyan, 'VOIDRUNNER', 'it might be the only thing in here that is finished.', true);
  }
];

/* ---------------------------------------------------------------- post */
function bloom(G, src, Wp, Hp, amt) {
  const w2 = Math.max(2, Wp >> 1), h2 = Math.max(2, Hp >> 1);
  const a = buf('bA', w2, h2), b = buf('bB', Math.max(1, w2 >> 2), Math.max(1, h2 >> 2));
  a.g.globalCompositeOperation = 'source-over'; a.g.globalAlpha = 1; a.g.filter = 'none';
  a.g.drawImage(src, 0, 0, w2, h2);
  a.g.globalCompositeOperation = 'multiply'; a.g.drawImage(a.c, 0, 0); a.g.drawImage(a.c, 0, 0); a.g.drawImage(a.c, 0, 0);
  a.g.globalCompositeOperation = 'source-over';
  if ('filter' in b.g) b.g.filter = 'blur(2px)';
  b.g.drawImage(a.c, 0, 0, b.c.width, b.c.height);
  b.g.filter = 'none';
  G.save();
  G.globalCompositeOperation = 'lighter'; G.imageSmoothingEnabled = true;
  G.globalAlpha = Math.min(1, amt); G.drawImage(b.c, 0, 0, Wp, Hp);
  G.restore();
}
function tear(G, src, Wp, Hp, amt, t) {
  const n = 4 + Math.floor(amt * 8), seed = Math.floor(t * 24);
  for (let i = 0; i < n; i++) {
    const y = hash(seed * 7.1 + i * 3.3) * Hp, hh = (.006 + hash(seed + i * 9.7) * .04) * Hp;
    const dx = (hash(seed * 1.7 + i) - .5) * Wp * .1 * amt;
    G.drawImage(src, 0, y, Wp, hh, dx, y, Wp, hh);
  }
}
function letterbox(t) {
  if (t < 28) return .1;
  if (t < 30) return .1 * (1 - eio((t - 28) / 2));
  if (t < 90) return 0;
  if (t < 91.5) return .1 * eio((t - 90) / 1.5);
  if (t < 104) return .1;
  if (t < 107) return .1 * (1 - eio((t - 104) / 3));
  return 0;
}

/* ---------------------------------------------------------------- draw */
function shotAt(t) { for (const s of SHOTS) if (t < s.t1) return s; return SHOTS[SHOTS.length - 1]; }
function draw(G, t, W, H, dpr, opt) {
  opt = opt || {}; dpr = dpr || 1;
  t = cl(t, 0, LEN - 1e-4);
  const Wp = G.canvas.width, Hp = G.canvas.height;
  const S0 = buf('scene', Wp, Hp), g = S0.g;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.shadowBlur = 0; ls(g, 0);
  g.lineCap = 'butt'; g.lineJoin = 'miter';
  const sh = shotAt(t), u = Math.min(W / 1280, H / 720);
  const fx = { bloom: sh.bloom, glitch: pulse(GLITCH, t, x => x), white: 0 };
  const kick = pulse(SHAKE, t, x => x);
  g.save();
  if (kick > 0) g.translate((hash(t * 91) - .5) * 2 * kick * u, (hash(t * 57 + 3) - .5) * 2 * kick * u);
  const S = { g, W, H, u, tu: Math.max(u, Math.min(W, H) / 1000), m: Math.min(W, H) / 720, t, lt: t - sh.t0, d: sh.t1 - sh.t0, opt, fx, dpr };
  try { DRAW[sh.id](S); } catch (e) { if (typeof console !== 'undefined') console.error('IntroArt ' + sh.id, e); }
  g.restore();
  G.save();
  G.setTransform(1, 0, 0, 1, 0, 0);
  G.globalCompositeOperation = 'source-over'; G.globalAlpha = 1; G.filter = 'none';
  G.drawImage(S0.c, 0, 0);
  if (fx.glitch > .02) tear(G, S0.c, Wp, Hp, fx.glitch, t);
  if (fx.bloom > .02 && opt.bloom !== false) bloom(G, S0.c, Wp, Hp, fx.bloom);
  G.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vr = Math.hypot(W, H) / 2, vg = G.createRadialGradient(W / 2, H / 2, vr * .5, W / 2, H / 2, vr);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  G.fillStyle = vg; G.fillRect(0, 0, W, H);
  if (opt.grain !== false) {
    G.save(); G.setTransform(1, 0, 0, 1, 0, 0);
    G.globalCompositeOperation = 'overlay'; G.globalAlpha = .05;
    const pat = G.createPattern(noiseTile(), 'repeat'), ox = Math.floor(hash(Math.floor(t * 24)) * 256), oy = Math.floor(hash(Math.floor(t * 24) + .5) * 256);
    G.translate(-ox, -oy); G.fillStyle = pat; G.fillRect(ox, oy, Wp, Hp);
    G.restore();
  }
  const white = Math.max(pulse(FLASH, t, x => x * x), fx.white);
  if (white > 0) { G.fillStyle = 'rgba(248,251,255,' + cl(white, 0, 1).toFixed(3) + ')'; G.fillRect(0, 0, W, H); }
  const lb = letterbox(t) * H;
  if (lb > .5) { G.fillStyle = '#000'; G.fillRect(0, 0, W, lb); G.fillRect(0, H - lb, W, lb); }
  const tu = S.tu;
  for (const [a, b, text, who] of SUBS) {
    if (t < a || t > b) continue;
    const al = sm(a, a + .4, t) * (1 - sm(b - .4, b, t));
    G.textAlign = 'center'; G.textBaseline = 'alphabetic';
    font(G, 'italic 500', 27 * tu, F.serif);
    const y = H - Math.max(lb, 0) - 50 * tu;
    G.fillStyle = 'rgba(236,231,221,' + al.toFixed(3) + ')'; G.fillText(text, W / 2, y);
    font(G, 600, 10 * tu, F.label); ls(G, .42); G.fillStyle = 'rgba(148,163,184,' + (al * .9).toFixed(3) + ')';
    G.fillText(who, W / 2, y + 24 * tu); ls(G, 0);
  }
  G.restore();
}

return { LEN, SHOTS, BEATS, SUBS, FLASH, draw, menuAnchor };
})();
