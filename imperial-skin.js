/* =============================== the imperial ===============================
   THE BOSS RUSH's line, written once. Knight, duke and king are one effect that
   gains regalia with rank rather than three unrelated skins, and every tier
   keeps what the tier below it had in some grown form:

     KNIGHT  steel on gules. A heater shield over the hull, four blades on a
             faceted collar, a swallow-tailed pennon off the stern, and every
             round a lance. Dresses the pilot only.
     DUKE    gilt on purpure. The shield takes a coronet and three bezants, the
             collar six blades and jewels, the pennon grows into a velvet
             mantle, and the roster is taken into fief.
     KING    gold on crimson. The arched crown in a turning sun, a train in
             ermine, a laurel under the hull, eight jewelled blades, the roster
             banded in gold, and everything that breaks comes apart as coin.

   Shape is what keeps it apart from the other awards in a shared arena: the
   void is circles and crowns of unlight, the redaction is bars and square
   corners, the prototype is a selection box. This one is facets, blades and
   cloth, and it is the only one whose bodies are lit, because it is metal.

   Hooks: SkinFx.under() before the hull (the cloth hangs beneath the ship),
   SkinFx.player/bullet/part/enemy after, each one branch on s.tier.
   ========================================================================== */
const IMP_T = [null, {
  metal: ['#262d3b', '#96a2b8', '#f4f7fc'],
  mid: '#b8c2d6', hi: '#f4f7fc', lo: '#3b4457', dark: '#0c1018',
  field: '#a11d27', fieldHi: '#e0434b', cloth: '#9b1b25', clothHi: '#e0434b',
  edge: '#e8edf5', glow: '#cbd5e1', gem: null, gem2: null, blades: 4, spark: '#e8edf5'
}, {
  metal: ['#4f360b', '#cf9f38', '#fff1c1'],
  mid: '#d4a53c', hi: '#fff1c1', lo: '#6b4a12', dark: '#12081f',
  field: '#5b21b6', fieldHi: '#9d5cf5', cloth: '#4c1d95', clothHi: '#8b5cf6',
  edge: '#f3d98b', glow: '#c084fc', gem: '#c084fc', gem2: '#c084fc', blades: 6, spark: '#f3d98b'
}, {
  metal: ['#5e3f00', '#e3ad0b', '#fffbe6'],
  mid: '#eab308', hi: '#fffbe6', lo: '#7a5200', dark: '#1a1204',
  field: '#9f1239', fieldHi: '#f43f5e', cloth: '#8a0f2c', clothHi: '#e11d48',
  edge: '#fde68a', glow: '#fbbf24', gem: '#e11d48', gem2: '#3b82f6', blades: 8, spark: '#fde68a'
}];
const IMP_FUR = '#f7f3e8', IMP_TAIL = '#141018';
const IMP_STATE = {};
const impTier = s => Math.max(1, Math.min(3, (s && s.tier) | 0));

/* Polished metal is a gradient with the light in the middle of it: dark at
   both ends, a hot line just past centre. Used on the regalia, never on the
   rounds, which are too many to pay a gradient each. */
function impGrad(x0, y0, x1, y1, T) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, T.metal[0]); g.addColorStop(0.38, T.metal[1]);
  g.addColorStop(0.52, T.metal[2]); g.addColorStop(0.66, T.metal[1]);
  g.addColorStop(1, T.metal[0]);
  return g;
}
// a four-point glint, the thing a jewel does when light crosses it
function impStar(x, y, r, a) {
  if (a <= 0.02 || r <= 0.3) return;
  const k = r * 0.14;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#ffffff', Math.min(1, a));
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + k, y - k, x + r, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + r);
  ctx.quadraticCurveTo(x - k, y + k, x - r, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - r);
  ctx.fill();
  ctx.restore();
}
const impBlink = (t, per, off) => {
  const u = ((t + off) % per) / per;
  return u < 0.12 ? Math.sin(u / 0.12 * Math.PI) : 0;
};
/* The polish going past: a bright bar swept across whatever is clipped, once
   a period. It is the one thing that makes a flat shape read as a hard one. */
function impShine(x, y, w, h, t, per, off) {
  const u = ((t + off) % per) / 0.8;
  if (u >= 1) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x - w * 0.9 + u * w * 1.8, y);
  ctx.rotate(0.45);
  ctx.fillStyle = rgba('#ffffff', 0.55 * Math.sin(u * Math.PI));
  ctx.fillRect(-w * 0.07, -h * 1.2, w * 0.14, h * 2.4);
  ctx.restore();
}

/* ---- the arms: a heater shield, held upright over the hull like the other
   awards' marks, because a crest that rolls with a barrel roll is a decal. */
function impShieldPath(cx, ty, w, h) {
  const hw = w / 2;
  ctx.beginPath();
  ctx.moveTo(cx - hw, ty); ctx.lineTo(cx + hw, ty);
  ctx.lineTo(cx + hw, ty + h * 0.42);
  ctx.quadraticCurveTo(cx + hw, ty + h * 0.82, cx, ty + h);
  ctx.quadraticCurveTo(cx - hw, ty + h * 0.82, cx - hw, ty + h * 0.42);
  ctx.closePath();
}
function impShield(cx, ty, w, h, T, tier, t) {
  ctx.save();
  drawGlow(cx, ty + h * 0.45, h * 1.4, T.glow, 0.18);
  impShieldPath(cx, ty, w, h);
  const fg = ctx.createLinearGradient(cx - w * 0.5, ty, cx + w * 0.4, ty + h);
  fg.addColorStop(0, T.fieldHi); fg.addColorStop(0.55, T.field); fg.addColorStop(1, T.dark);
  ctx.fillStyle = fg; ctx.fill();
  ctx.save();
  ctx.clip();
  const mg = impGrad(cx - w * 0.5, ty, cx + w * 0.5, ty + h, T);
  // the chevron: the knight's whole blazon, kept by every rank above it
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.strokeStyle = rgba(T.dark, 0.7); ctx.lineWidth = h * 0.24;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.62, ty + h * 0.9); ctx.lineTo(cx, ty + h * 0.36); ctx.lineTo(cx + w * 0.62, ty + h * 0.9);
  ctx.stroke();
  ctx.strokeStyle = mg; ctx.lineWidth = h * 0.16; ctx.stroke();
  if (tier === 2) {
    // between three bezants: gold coin in the field, the duke's addition
    ctx.fillStyle = mg;
    for (const [bx, by] of [[-0.25, 0.19], [0.25, 0.19], [0, 0.72]]) {
      ctx.beginPath(); ctx.arc(cx + bx * w, ty + by * h, w * 0.085, 0, TAU); ctx.fill();
    }
  }
  impShine(cx, ty + h * 0.5, w, h, t, 3.4, 0);
  ctx.restore();
  // the bordure: dark under, polished over
  impShieldPath(cx, ty, w, h);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = mg; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

/* ---- the duke's coronet: a band, three strawberry leaves, two pearls on
   stems. Low and wide, because it is a rank and not yet a crown. */
function impCoronet(cx, by, w, T, t) {
  const hw = w * 0.56, bh = w * 0.19;
  const g = impGrad(cx - hw, by - bh * 3, cx + hw, by, T);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.fillStyle = g; ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const lx of [-0.74, 0, 0.74]) {
    const x = cx + lx * hw, s = lx ? 0.82 : 1;
    ctx.moveTo(x - bh * 0.95 * s, by - bh);
    ctx.quadraticCurveTo(x - bh * 1.2 * s, by - bh * 2.2 * s, x, by - bh * 2.9 * s);
    ctx.quadraticCurveTo(x + bh * 1.2 * s, by - bh * 2.2 * s, x + bh * 0.95 * s, by - bh);
    ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  for (const px of [-0.37, 0.37]) {
    const x = cx + px * hw;
    ctx.strokeStyle = g; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(x, by - bh); ctx.lineTo(x, by - bh * 2); ctx.stroke();
    ctx.fillStyle = IMP_FUR;
    ctx.beginPath(); ctx.arc(x, by - bh * 2.3, bh * 0.42, 0, TAU); ctx.fill();
  }
  ctx.beginPath(); ctx.rect(cx - hw, by - bh, hw * 2, bh);
  ctx.fillStyle = impGrad(cx, by - bh, cx, by, T); ctx.fill();
  ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = T.gem;
  for (const jx of [-0.5, 0, 0.5]) {
    ctx.beginPath(); ctx.ellipse(cx + jx * hw, by - bh / 2, bh * 0.36, bh * 0.28, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  impStar(cx, by - bh * 2.9, 3.4, impBlink(t, 2.8, 0.4) * 0.95);
  impStar(cx, by - bh / 2, 2.4, impBlink(t, 3.6, 1.7) * 0.8);
}

/* ---- the king's crown: velvet cap, two arches and a front arch meeting at
   the monde, a jewelled band on an ermine roll, and a sun turning behind it.
   The void already floats a crown, so this one is its opposite in every way
   that reads at a distance: lit where that is dark, arched where that is
   spired, and sitting in rays where that sits in a glow. */
function impCrown(cx, by, W, T, t) {
  const hw = W / 2, bh = W * 0.21, top = by - bh, ah = W * 0.6;
  const g = impGrad(cx - hw, top - ah, cx + hw, by, T);
  const sx = cx, sy = top - ah * 0.45;
  ctx.save();
  if (FXO.parts) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(sx, sy, W * 0.2, sx, sy, W * 1.55);
    rg.addColorStop(0, rgba(T.glow, 0.38)); rg.addColorStop(1, rgba(T.glow, 0));
    ctx.fillStyle = rg;
    ctx.beginPath();
    const rot = t * 0.16;
    for (let i = 0; i < 16; i++) {
      const a = rot + i * TAU / 16, L = W * (i % 2 ? 0.95 : 1.55), s = i % 2 ? 0.05 : 0.08;
      ctx.moveTo(sx + Math.cos(a - s) * W * 0.3, sy + Math.sin(a - s) * W * 0.3);
      ctx.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L);
      ctx.lineTo(sx + Math.cos(a + s) * W * 0.3, sy + Math.sin(a + s) * W * 0.3);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
  }
  drawGlow(sx, sy, W * 1.3, T.glow, 0.32);
  // the cap
  ctx.beginPath();
  ctx.moveTo(cx - hw * 0.8, top);
  ctx.bezierCurveTo(cx - hw * 0.84, top - ah * 1.05, cx + hw * 0.84, top - ah * 1.05, cx + hw * 0.8, top);
  ctx.closePath();
  const cg = ctx.createLinearGradient(cx - hw, top - ah, cx + hw * 0.6, top);
  cg.addColorStop(0, T.clothHi); cg.addColorStop(0.6, T.cloth); cg.addColorStop(1, T.dark);
  ctx.fillStyle = cg; ctx.fill();
  // the arches
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const sg of [-1, 1]) {
    ctx.moveTo(cx + sg * hw * 0.84, top);
    ctx.bezierCurveTo(cx + sg * hw * 0.92, top - ah * 0.78, cx + sg * hw * 0.3, top - ah * 1.02, cx, top - ah);
  }
  ctx.moveTo(cx, top); ctx.lineTo(cx, top - ah);
  ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = W * 0.13; ctx.stroke();
  ctx.strokeStyle = g; ctx.lineWidth = W * 0.075; ctx.stroke();
  ctx.fillStyle = IMP_FUR;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.arc(cx, top - ah * i / 4, W * 0.03, 0, TAU); ctx.fill();
  }
  // the monde and its cross
  const oy = top - ah - W * 0.09, orr = W * 0.11;
  ctx.fillStyle = impGrad(cx - orr, oy - orr, cx + orr, oy + orr, T);
  ctx.beginPath(); ctx.arc(cx, oy, orr, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = 0.8; ctx.stroke();
  const cy0 = oy - orr, cs = W * 0.12, cw = W * 0.065;
  ctx.fillStyle = g;
  ctx.fillRect(cx - cw / 2, cy0 - cs * 1.7, cw, cs * 1.75);
  ctx.fillRect(cx - cs * 0.55, cy0 - cs * 1.25, cs * 1.1, cw);
  // crosses and fleurs along the rim
  ctx.fillStyle = g; ctx.strokeStyle = rgba(T.dark, 0.85); ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = cx + (i / 4 * 2 - 1) * hw * 0.86, ht = bh * (i % 2 ? 1.1 : 1.5);
    ctx.moveTo(x - bh * 0.55, top + 0.5); ctx.lineTo(x, top - ht); ctx.lineTo(x + bh * 0.55, top + 0.5);
    ctx.closePath();
  }
  ctx.fill(); ctx.stroke();
  // the ermine roll, then the band on it
  ctx.beginPath(); ctx.rect(cx - hw * 1.05, by - 0.4, W * 1.05, bh * 0.8);
  ctx.fillStyle = IMP_FUR; ctx.fill();
  ctx.fillStyle = IMP_TAIL;
  for (let i = 0; i < 6; i++) {
    const x = cx + (i / 5 * 2 - 1) * hw * 0.88, y = by + bh * 0.3;
    ctx.beginPath(); ctx.moveTo(x, y - 1); ctx.lineTo(x + 0.8, y + 1); ctx.lineTo(x - 0.8, y + 1); ctx.closePath(); ctx.fill();
  }
  ctx.beginPath(); ctx.rect(cx - hw, top, W, bh);
  ctx.fillStyle = impGrad(cx, top, cx, by, T); ctx.fill();
  ctx.strokeStyle = rgba(T.dark, 0.9); ctx.lineWidth = 0.9; ctx.stroke();
  const gem = (x, col, r) => {
    ctx.fillStyle = rgba(T.dark, 0.9);
    ctx.beginPath(); ctx.ellipse(x, top + bh / 2, r * 1.45, r * 1.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(x, top + bh / 2, r * 1.2, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#ffffff', 0.75);
    ctx.beginPath(); ctx.arc(x - r * 0.4, top + bh / 2 - r * 0.35, r * 0.35, 0, TAU); ctx.fill();
  };
  gem(cx, T.gem, bh * 0.34); gem(cx - hw * 0.55, T.gem2, bh * 0.27); gem(cx + hw * 0.55, T.gem2, bh * 0.27);
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - hw, top, W, bh); ctx.clip();
  impShine(cx, top + bh / 2, W, bh * 3, t, 3.1, 0.6);
  ctx.restore();
  ctx.restore();
  impStar(cx, cy0 - cs * 1.7, 4.2, impBlink(t, 2.6, 0));
  impStar(cx, top + bh / 2, 3.4, impBlink(t, 3.3, 1.2));
  impStar(cx - hw * 0.55, top + bh / 2, 2.6, impBlink(t, 3.7, 2.1));
  impStar(cx + hw * 0.55, top + bh / 2, 2.6, impBlink(t, 4.1, 0.3));
}

/* ---- the guard: a faceted collar with blades set in it, pointing out. The
   facets are the point: every other award rings the hull with a circle. Each
   blade is two facets lit from the upper left, so the light stays where it
   is while the ring turns under it, which is what polished metal does. */
const impGuardRot = (t, tier) => t * 0.32 * (tier === 2 ? -1 : 1);
const impBladeLen = (R, tier, i) => R * (0.3 + tier * 0.04) * (tier === 3 && i % 2 ? 0.74 : 1);
function impGuard(x, y, R, T, tier, t) {
  const n = T.blades, rot = impGuardRot(t, tier), m = n * 2, rr = R - 1;
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (let i = 0; i < m; i++) {
    const a = rot + (i + 0.5) * TAU / m;
    const X = x + Math.cos(a) * rr, Y = y + Math.sin(a) * rr;
    i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
  }
  ctx.closePath();
  ctx.strokeStyle = rgba(T.dark, 0.85); ctx.lineWidth = 3.2; ctx.stroke();
  ctx.strokeStyle = rgba(T.mid, 0.6); ctx.lineWidth = 1; ctx.stroke();
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n, lit = 0.5 + 0.5 * Math.cos(a + 2.2);
    const L = impBladeLen(R, tier, i), w = R * 0.085;
    ctx.save();
    ctx.translate(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -w); ctx.lineTo(L * 0.7, -w * 0.8); ctx.lineTo(L, 0); ctx.lineTo(L * 0.7, w * 0.8); ctx.lineTo(0, w);
    ctx.closePath();
    ctx.fillStyle = T.mid; ctx.fill();
    ctx.strokeStyle = rgba(T.dark, 0.7); ctx.lineWidth = 0.6; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -w); ctx.lineTo(L * 0.7, -w * 0.8); ctx.lineTo(L, 0); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = rgba(T.hi, 0.12 + lit * 0.72); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, w); ctx.lineTo(L * 0.7, w * 0.8); ctx.lineTo(L, 0); ctx.lineTo(0, 0); ctx.closePath();
    ctx.fillStyle = rgba(T.dark, 0.55 - lit * 0.3); ctx.fill();
    ctx.fillStyle = T.mid; ctx.fillRect(-1, -w * 2.3, 2, w * 4.6);
    ctx.fillStyle = rgba(T.hi, lit * 0.75); ctx.fillRect(-1, -w * 2.3, 1, w * 4.6);
    ctx.restore();
    if (T.gem) {
      const gx = x + Math.cos(a) * rr, gy = y + Math.sin(a) * rr;
      ctx.fillStyle = rgba(T.dark, 0.9);
      ctx.beginPath(); ctx.arc(gx, gy, 1.9, 0, TAU); ctx.fill();
      ctx.fillStyle = tier === 3 && i % 2 ? T.gem2 : T.gem;
      ctx.beginPath(); ctx.arc(gx, gy, 1.35, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.85); ctx.fillRect(gx - 0.7, gy - 0.7, 0.7, 0.7);
    }
  }
  ctx.restore();
  // one edge catches the light at a time, walking round the collar
  if (FXO.parts) {
    const per = 1.5 - tier * 0.2, u = (t % per) / per;
    if (u < 0.3) {
      const k = Math.floor(t / per) % n, a = rot + k * TAU / n, d = rr + impBladeLen(R, tier, k);
      impStar(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + tier, Math.sin(u / 0.3 * Math.PI));
    }
  }
}

/* ---- the king's laurel: two branches cupping the hull from below, tied at
   the foot with a crimson bow. Held to the screen, so it always reads as a
   wreath rather than as scenery going round. */
function impLaurel(x, y, R, T, t) {
  const r = R + 6;
  ctx.save();
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const a0 = Math.PI / 2 + sd * 0.2, a1 = Math.PI / 2 + sd * 1.95;
    ctx.strokeStyle = rgba(T.lo, 0.95); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, r, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
    for (let k = 0; k < 7; k++) {
      const u = k / 6, a = Math.PI / 2 + sd * (0.32 + u * 1.6);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const tang = a + sd * Math.PI / 2, ls = 3.6 - u * 1.3;
      for (const side of [-1, 1]) {
        const la = tang + side * 0.62;
        ctx.save();
        ctx.translate(px + Math.cos(la) * ls * 0.85, py + Math.sin(la) * ls * 0.85);
        ctx.rotate(la);
        ctx.beginPath(); ctx.ellipse(0, 0, ls, ls * 0.38, 0, 0, TAU);
        ctx.fillStyle = side * sd > 0 ? T.metal[1] : T.mid; ctx.fill();
        ctx.strokeStyle = rgba(T.hi, 0.55); ctx.lineWidth = 0.5; ctx.stroke();
        ctx.restore();
      }
    }
  }
  const by = y + r;
  ctx.fillStyle = T.cloth; ctx.strokeStyle = rgba(T.edge, 0.7); ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(x, by); ctx.lineTo(x - 4, by - 2.2); ctx.lineTo(x - 4, by + 2.2); ctx.closePath();
  ctx.moveTo(x, by); ctx.lineTo(x + 4, by - 2.2); ctx.lineTo(x + 4, by + 2.2); ctx.closePath();
  ctx.moveTo(x - 0.6, by); ctx.lineTo(x - 3, by + 5); ctx.lineTo(x - 1.4, by + 5.4); ctx.closePath();
  ctx.moveTo(x + 0.6, by); ctx.lineTo(x + 3, by + 5); ctx.lineTo(x + 1.4, by + 5.4); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = T.mid; ctx.beginPath(); ctx.arc(x, by, 1.3, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---- the cloth: pennon, mantle, train. A chain hung off the stern that is
   pulled out behind the heading and let fall, then made to follow its own
   leader, so it streams when you fly and hangs and sways when you do not.
   The time step is clamped like the shed's, so a long frame cannot fling it. */
function impCape(st, T, tier, t) {
  const N = tier === 1 ? 11 : tier === 2 ? 12 : 14, L = tier === 1 ? 3.1 : tier === 2 ? 3.3 : 3.6;
  const ang = P.ang || 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const ax = P.x - ca * 10, ay = P.y - sa * 10;
  let pts = st.cape;
  if (!pts || pts.length !== N || Math.hypot(pts[0].x - ax, pts[0].y - ay) > 60) {
    pts = st.cape = [];
    for (let i = 0; i < N; i++) pts.push({ x: ax - ca * i * L, y: ay - sa * i * L });
  }
  const dt = Math.min(0.05, Math.max(0, t - (st.ct ?? t)));
  st.ct = t;
  pts[0].x = ax; pts[0].y = ay;
  for (let i = 1; i < N; i++) {
    const p = pts[i], q = pts[i - 1], f = i / N;
    p.x += (-ca * 22 + Math.sin(t * 2.6 - i * 0.6) * 14 * f) * dt;
    p.y += (-sa * 22 + 20 * (0.35 + f)) * dt;
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
    p.x = q.x + dx / d * L; p.y = q.y + dy / d * L;
  }
  const w0 = 2.2, w1 = tier === 1 ? 2.6 : tier === 2 ? 7.5 : 9.5;
  const Lp = [], Rp = [], nn = [];
  for (let i = 0; i < N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
    let nx = -(b.y - a.y), ny = b.x - a.x;
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const f = i / (N - 1), w = w0 + (w1 - w0) * (tier === 1 ? f : Math.sqrt(f));
    nn.push([nx, ny, w]);
    Lp.push([pts[i].x + nx * w, pts[i].y + ny * w]);
    Rp.push([pts[i].x - nx * w, pts[i].y - ny * w]);
  }
  const e = pts[N - 1];
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(Lp[0][0], Lp[0][1]);
    for (let i = 1; i < N; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
    if (tier === 1) ctx.lineTo(pts[N - 3].x, pts[N - 3].y);   // the swallowtail
    for (let i = N - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
    ctx.closePath();
  };
  outline();
  const cg = ctx.createLinearGradient(ax, ay, e.x, e.y);
  cg.addColorStop(0, T.clothHi); cg.addColorStop(0.45, T.cloth); cg.addColorStop(1, T.dark);
  ctx.fillStyle = cg; ctx.fill();
  if (FXO.mat && tier > 1) {
    // velvet: two folds down the length and a sheen that travels along it
    ctx.save(); outline(); ctx.clip();
    for (const off of [-0.45, 0.45]) {
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const k = off * nn[i][2] * (1 + Math.sin(t * 2 + i * 0.7) * 0.2);
        const X = pts[i].x + nn[i][0] * k, Y = pts[i].y + nn[i][1] * k;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.strokeStyle = rgba(T.dark, 0.4); ctx.lineWidth = 1.3; ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i < N; i++) i ? ctx.lineTo(pts[i].x, pts[i].y) : ctx.moveTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = rgba(T.clothHi, 0.28 + Math.sin(t * 1.7) * 0.12); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
  }
  // trim down both edges
  ctx.strokeStyle = tier === 1 ? rgba(T.edge, 0.6) : T.mid; ctx.lineWidth = tier === 1 ? 0.8 : 1.1;
  ctx.beginPath();
  for (let i = 0; i < N; i++) i ? ctx.lineTo(Lp[i][0], Lp[i][1]) : ctx.moveTo(Lp[i][0], Lp[i][1]);
  for (let i = 0; i < N; i++) i ? ctx.lineTo(Rp[i][0], Rp[i][1]) : ctx.moveTo(Rp[i][0], Rp[i][1]);
  ctx.stroke();
  if (tier === 2) {
    // gold fringe off the hem
    const dx = e.x - pts[N - 2].x, dy = e.y - pts[N - 2].y, dl = Math.hypot(dx, dy) || 1;
    ctx.strokeStyle = rgba(T.mid, 0.9); ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const u = k / 6, X = Lp[N - 1][0] + (Rp[N - 1][0] - Lp[N - 1][0]) * u;
      const Y = Lp[N - 1][1] + (Rp[N - 1][1] - Lp[N - 1][1]) * u;
      ctx.moveTo(X, Y); ctx.lineTo(X + dx / dl * 2.4, Y + dy / dl * 2.4);
    }
    ctx.stroke();
  } else if (tier === 3) {
    // the ermine hem, sewn on with a gold seam
    ctx.beginPath();
    ctx.moveTo(Lp[N - 3][0], Lp[N - 3][1]); ctx.lineTo(Lp[N - 2][0], Lp[N - 2][1]); ctx.lineTo(Lp[N - 1][0], Lp[N - 1][1]);
    ctx.lineTo(Rp[N - 1][0], Rp[N - 1][1]); ctx.lineTo(Rp[N - 2][0], Rp[N - 2][1]); ctx.lineTo(Rp[N - 3][0], Rp[N - 3][1]);
    ctx.closePath();
    ctx.fillStyle = IMP_FUR; ctx.fill();
    ctx.fillStyle = IMP_TAIL;
    for (const i of [N - 2, N - 1]) for (const k of [-0.55, 0, 0.55]) {
      const kk = i === N - 1 ? k + 0.27 : k;
      if (kk > 0.8) continue;
      const X = pts[i].x + nn[i][0] * nn[i][2] * kk, Y = pts[i].y + nn[i][1] * nn[i][2] * kk;
      ctx.beginPath(); ctx.moveTo(X, Y - 1.1); ctx.lineTo(X + 0.8, Y + 0.9); ctx.lineTo(X - 0.8, Y + 0.9); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = T.mid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Lp[N - 3][0], Lp[N - 3][1]); ctx.lineTo(Rp[N - 3][0], Rp[N - 3][1]); ctx.stroke();
  }
  ctx.restore();
}

/* ---- what comes off it. Same pool, same cap, same accumulator as the void's
   motes and the redaction's chaff: sparks off the blade points at every rank,
   gold leaf off the hem from the duke up, and glitter rising off the crown. */
function impShed(st, R, T, tier, t) {
  if (!FXO.parts) return;
  const dt = Math.min(0.05, Math.max(0, t - (st.sht ?? t)));
  st.sht = t;
  if (!dt) return;
  const n = T.blades, rot = impGuardRot(t, tier), rr = R - 1, dir = tier === 2 ? -1 : 1;
  st.sa = (st.sa || 0) + dt * (3 + tier * 2);
  while (st.sa >= 1) {
    st.sa -= 1;
    const i = (Math.random() * n) | 0, a = rot + i * TAU / n, d = rr + impBladeLen(R, tier, i);
    const ta = a + Math.PI / 2 * dir, sp = rnd(40, 14);
    spawnPart(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d,
              Math.cos(ta) * sp - (P.vx || 0) * 0.2, Math.sin(ta) * sp - (P.vy || 0) * 0.2,
              rnd(1.8, 0.9), T.spark, rnd(0.6, 0.3), 0.9, false);
  }
  if (tier >= 2 && st.cape) {
    st.sb = (st.sb || 0) + dt * (tier === 2 ? 9 : 14);
    while (st.sb >= 1) {
      st.sb -= 1;
      const e = st.cape[st.cape.length - 1];
      spawnPart(e.x + rnd(5, -5), e.y + rnd(5, -5), rnd(14, -14), rnd(22, 2), rnd(2, 1),
                Math.random() < 0.45 ? T.edge : (tier === 2 ? '#c084fc' : T.hi),
                rnd(0.9, 0.5), 0.92, false);
    }
  }
  if (tier === 3) {
    st.sc = (st.sc || 0) + dt * 8;
    const W = R * 0.95;
    while (st.sc >= 1) {
      st.sc -= 1;
      spawnPart(P.x + rnd(W * 0.5, -W * 0.5), P.y - R - 8 - rnd(W * 0.85, W * 0.2),
                rnd(10, -10), rnd(-14, -40), rnd(2.2, 1.1),
                Math.random() < 0.5 ? T.hi : T.edge, rnd(1, 0.6), 0.93, false);
    }
  }
}

/* ---- the pilot, in two passes: the cloth under the hull, everything else
   over it. The regalia sit at R + 8, clear of the longest blade. */
function impUnder(s, st) {
  const tier = impTier(s);
  impCape(st, IMP_T[tier], tier, uiTime);
}
function impPlayer(s, st) {
  const tier = impTier(s), T = IMP_T[tier];
  const R = (P.r || 12) + 11, t = uiTime, x = P.x, y = P.y;
  if (tier === 3) impLaurel(x, y, R, T, t);
  impGuard(x, y, R, T, tier, t);
  const bob = Math.sin(t * 1.9) * 1.3;
  if (tier === 3) impCrown(x, y - R - 8 - bob, R * 0.95, T, t);
  else {
    const w = R * 0.62, h = R * 0.74, ty = y - R - 8 - h - bob - (tier === 2 ? 1 : 0);
    impShield(x, ty, w, h, T, tier, t);
    if (tier === 2) impCoronet(x, ty - 0.5, w, T, t);
  }
  impShed(st, R, T, tier, t);
}

/* ---- the rounds: a lance with its pennon. Two facets split down the spine
   instead of a gradient, a crossguard, a jewel in the guard from the duke up,
   a glint on the point for the king. The round's own tint stays on the spine:
   the shape is the skin, the colour is still the state. Arrow rounds are left
   alone, as they are by every award. */
function impBullet(b, c, tier) {
  const T = IMP_T[tier], r = b.r, ph = uiTime * 7 + (b.x + b.y) * 0.05;
  if (FXO.bglow) drawGlow(b.x, b.y, r * (3.4 + tier * 0.35), T.glow, 0.24 + tier * 0.06);
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.lineJoin = 'miter';
  if (FXO.parts) {
    const x0 = -r * 0.5, len = r * (2.5 + tier * 0.45), hw = r * 0.42;
    const wave = u => Math.sin(ph - u * 3.2) * r * 0.3 * u;
    ctx.beginPath();
    ctx.moveTo(x0, -hw);
    for (let k = 1; k <= 4; k++) { const u = k / 4; ctx.lineTo(x0 - u * len, -hw * (1 - u * 0.3) + wave(u)); }
    ctx.lineTo(x0 - len * 0.72, wave(0.72));
    ctx.lineTo(x0 - len, hw * 0.7 + wave(1));
    for (let k = 3; k >= 0; k--) { const u = k / 4; ctx.lineTo(x0 - u * len, hw * (1 - u * 0.3) + wave(u)); }
    ctx.closePath();
    ctx.fillStyle = rgba(tier === 1 ? T.field : T.cloth, 0.95); ctx.fill();
    ctx.strokeStyle = rgba(T.edge, tier === 1 ? 0.45 : 0.7); ctx.lineWidth = 0.8; ctx.stroke();
  }
  const nose = r * 2.05;
  ctx.beginPath();
  ctx.moveTo(nose, 0); ctx.lineTo(r * 0.55, -r * 0.58); ctx.lineTo(-r * 0.25, -r * 0.34);
  ctx.lineTo(-r * 0.25, r * 0.34); ctx.lineTo(r * 0.55, r * 0.58); ctx.closePath();
  ctx.fillStyle = T.mid; ctx.fill();
  ctx.strokeStyle = b.crit ? '#ffffff' : rgba(T.dark, 0.8); ctx.lineWidth = b.crit ? 1.1 : 0.8; ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(nose, 0); ctx.lineTo(r * 0.55, -r * 0.58); ctx.lineTo(-r * 0.25, -r * 0.34); ctx.lineTo(-r * 0.25, 0);
  ctx.closePath();
  ctx.fillStyle = rgba(T.hi, 0.55 + Math.sin(ph * 0.5) * 0.2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(nose, 0); ctx.lineTo(r * 0.55, r * 0.58); ctx.lineTo(-r * 0.25, r * 0.34); ctx.lineTo(-r * 0.25, 0);
  ctx.closePath();
  ctx.fillStyle = rgba(T.dark, 0.38); ctx.fill();
  ctx.strokeStyle = rgba(c, 0.75); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(-r * 0.2, 0); ctx.lineTo(r * 1.6, 0); ctx.stroke();
  ctx.fillStyle = T.mid; ctx.fillRect(-r * 0.52, -r * 0.88, r * 0.3, r * 1.76);
  ctx.fillStyle = rgba(T.hi, 0.7); ctx.fillRect(-r * 0.52, -r * 0.88, r * 0.3, r * 0.3);
  if (T.gem) {
    ctx.fillStyle = T.gem;
    ctx.beginPath(); ctx.arc(-r * 0.37, 0, r * 0.22, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (tier === 3) {
    const a = Math.atan2(b.vy, b.vx);
    impStar(b.x + Math.cos(a) * r * 1.8, b.y + Math.sin(a) * r * 1.8, r * (0.7 + 0.5 * Math.sin(ph)), 0.7);
  }
  return true;
}

/* ---- the debris: struck metal. A two-facet lozenge turning as it falls at
   the first two ranks; at the king it is a coin, flipping. The colour the
   event asked for survives as the rim, so a crit still reads as a crit. */
function impPart(p, t, rad, tier) {
  /* The debris is the costly part of this line: measured in a heavy fight
     (200 bodies, ~175 rounds, the particle cap full) it is most of what the
     duke and the king cost over a bare hull. So it answers to the same switch
     as every other extra particle — with Extra particles off, the game's own
     plain glow draws instead, as it does for the sparks and the pennons. */
  if (!FXO.parts) return false;
  const T = IMP_T[tier], r = p.r * 1.15, spin = p.x * 0.09 + p.y * 0.07;
  if (tier >= 2) drawGlow(p.x, p.y, rad * 0.6, T.glow, t * 0.3);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (tier === 3) {
    const f = Math.abs(Math.cos(spin)), rx = r * 1.2 * (0.18 + f * 0.82), ry = r * 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0.3, 0, TAU);
    ctx.fillStyle = rgba(T.metal[1], t * 0.92); ctx.fill();
    ctx.strokeStyle = rgba(p.color, t * 0.95); ctx.lineWidth = 1; ctx.stroke();
    if (f > 0.4) {
      ctx.strokeStyle = rgba(T.hi, t * 0.75 * f); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.58, ry * 0.58, 0.3, 0, TAU); ctx.stroke();
    }
  } else {
    ctx.rotate(spin);
    const a = r * 1.4, b = r * 0.8;
    ctx.beginPath(); ctx.moveTo(0, -a); ctx.lineTo(b, 0); ctx.lineTo(-b, 0); ctx.closePath();
    ctx.fillStyle = rgba(T.hi, t * 0.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, a); ctx.lineTo(b, 0); ctx.lineTo(-b, 0); ctx.closePath();
    ctx.fillStyle = rgba(T.lo, t * 0.85); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -a); ctx.lineTo(b, 0); ctx.lineTo(0, a); ctx.lineTo(-b, 0); ctx.closePath();
    ctx.strokeStyle = rgba(p.color, t * 0.95); ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
  return true;
}

/* ---- the roster, from the duke up: taken into fief. Under the same rule as
   the void and the disclosure: everything sits in the annulus between 0.86r
   and 1.0r or outside the hull, so type marks, telegraphs and the pip at
   r + 11 all still read. Studs are the body's own colour, set in the tier's
   metal, so the roster stays colour-coded. At the king the band is gold, the
   studs are jewels, and a tithe mark rides the leading corner. */
function impEnemy(e, ea, tier) {
  const T = IMP_T[tier], R = e.r, n = e.sides, a = e.ang || 0, step = TAU / n;
  const ring = k => {
    for (let i = 0; i < n; i++) {
      const th = a + i * step, X = e.x + Math.cos(th) * R * k, Y = e.y + Math.sin(th) * R * k;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  };
  ctx.save();
  ctx.globalAlpha = ea === undefined ? 1 : ea;
  ctx.lineJoin = 'miter';
  ctx.beginPath(); ring(1); ring(0.86);
  ctx.fillStyle = tier === 3 ? rgba(T.lo, 0.6) : rgba(T.dark, 0.62);
  ctx.fill('evenodd');
  ctx.beginPath(); ring(0.86);
  ctx.strokeStyle = rgba(T.mid, tier === 3 ? 0.75 : 0.55); ctx.lineWidth = 1; ctx.stroke();
  if (FXO.mat) {
    for (let i = 0; i < n; i++) {
      const th = a + i * step, X = e.x + Math.cos(th) * R * 0.93, Y = e.y + Math.sin(th) * R * 0.93;
      poly(X, Y, 2.4, 4, th);
      ctx.fillStyle = T.mid; ctx.fill();
      poly(X, Y, 1.5, 4, th);
      ctx.fillStyle = rgba(e.col, 0.95); ctx.fill();
    }
    if (tier === 3) {
      // the tithe: a gold chevron off the leading corner, pointing out
      const cx = e.x + Math.cos(a) * (R + 3.5), cy = e.y + Math.sin(a) * (R + 3.5);
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(2.6, 0); ctx.lineTo(-1, -2.6); ctx.lineTo(0, 0); ctx.lineTo(-1, 2.6); ctx.closePath();
      ctx.fillStyle = T.mid; ctx.fill();
      ctx.restore();
      const k = Math.floor(uiTime * 1.3 + e.x * 0.01) % n, th = a + k * step;
      impStar(e.x + Math.cos(th) * R * 0.93, e.y + Math.sin(th) * R * 0.93, 2.8,
              impBlink(uiTime + e.y * 0.013, 0.77, 0) * 0.9);
    }
  }
  ctx.restore();
}
