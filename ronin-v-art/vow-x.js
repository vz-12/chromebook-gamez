/* ====================== V: LAST VOW — the vow's X (art, 5 Oct) ======================
   THUNDERCLAP (X), CHAIN LIGHTNING (X X), THE SKY FALLS (X X X), METEOR (Z X),
   ECLIPSE (Z X X), STARFALL (X Z X), TECTONIC (Z Z X) and RUPTURE (C X) play
   through X's own hooks; a vow dash or split (its key starts 'v') takes this
   look in place of the ink and sky. The vow's Z world: crimson, the dead, his
   true form. Where CLEAR SKY splits the world open onto sky, these split it
   open onto the dead.
   The dash: he runs as a string of crimson phantoms of himself, the burning
   eye at the front of each, over a black wake with a crimson core, and the
   dead are dragged along behind him, faces stretched down the wake.
   The split: every line tears open onto the realm of the dead, crimson and
   deep, the faces of the dead pressed up to the opening. Bone arms burst out
   of its lips and claw, and are dragged back as it shuts. The floor keeps a
   closing rift a while longer. Each its own:
     THUNDERCLAP      crimson lightning runs the path as it splits, and a thunder
                      ring goes out from where he lands
     CHAIN LIGHTNING  lightning on both paths; the leaps from body to body are
                      forked lightning, and a soul rides each one
     THE SKY FALLS    the triangle's own piece of the night sky, red, starred, the
                      dead in it, comes down on it while he runs, lands and breaks
     METEOR           he comes in as a burning comet; the cross craters, molten at
                      the rim, and the dead climb out of it
     ECLIPSE          a black moon slides over a crimson sun on the cross while he
                      runs the ring; the corona is the dead, streaming out
     STARFALL         every wounded body is marked, then struck by one of the dead
                      falling headlong out of the sky, wailing
     TECTONIC         the band between the crosses breaks into plates that heave,
                      crimson between them, hands reaching up through the seams
     RUPTURE          a pulse goes out from where he lands; every wounded body in
                      it bursts along its wound, crimson and bone thrown out of it
   The name burns on with its kanji on the crimson seal, as Z's do.
   Wiring, one line in each of X's hooks (everything else is in this block):
     drawRoninDashTrail()       first line: vkxTrail(); if (vkxIsVow(P.roninDash)) return;
     drawRoninSky()             first line: vkxSky();
                                its smear:  if (d && !vkxIsVow(d)) { ... }
                                its splits: if (sp.merged || vkxIsVow(sp)) continue;
     roninSkyFx(d)              first line: if (vkxIsVow(d)) return vkxSkyFx(d);
     roninSkyLandFx(d)          first line: if (vkxIsVow(d)) return vkxLandFx(d);
     roninSplitFx(sp)           first line: if (vkxIsVow(sp)) return vkxSplitFx(sp);
     roninSplitHitFx(e, sp, star)  first line: if (vkxIsVow(sp)) return vkxHitFx(e, sp, star);
   rkvArcs in the placeholders is replaced by the one at the end of this block;
   vkzFloorFx draws the floor's scars (vkxFloor) and vkzScreen the speed lines
   (vkxScreen). It reads the dash (d: key, n, pts, cum, len, T), the splits (sp:
   key, segs, area, stars, starAt, arcAt, w, t, at, done) and enemies, and
   changes nothing of the logic's. Art state in VKX. It needs the vow's Z block
   (vkz*) and X's own helpers (rkxAt, rkxProgress, rkxLeg, rkxSplitOf, rkxArea,
   rkxSegAng, RKX_STAR_FROM).
=================================================================================== */
Object.assign(VKZ_KANJI, { 'THUNDERCLAP': '雷鳴', 'CHAIN LIGHTNING': '連雷', 'THE SKY FALLS': '天崩', 'METEOR': '隕石',
                           'ECLIPSE': '日蝕', 'STARFALL': '流星', 'TECTONIC': '地裂', 'RUPTURE': '破裂' });
let VKX = { ghosts: [], ghostL: -1, ref: null, dashL: 0, wake: null, frameAt: -1,
            dashAt: -9, dashX: 0, dashY: 0, dashAng: 0, landAt: -9, landX: 0, landY: 0, landAng: 0, landKey: '',
            scars: [], bursts: [] };
const VKX_LIFE = { rift: 2.4, crater: 3.5, ring: 2.6, plates: 3.2, crush: 2.8 };   // how long each scar stays on the floor
const vkxIsVow = o => !!(o && o.key && o.key[0] === 'v');
const vkxMid = pts => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
function vkxPath(pts) {
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
}
// a point in the triangle Q, from two seeds
function vkxInTri(Q, u, v) {
  if (u + v > 1) { u = 1 - u; v = 1 - v; }
  return { x: Q[0].x + (Q[1].x - Q[0].x) * u + (Q[2].x - Q[0].x) * v, y: Q[0].y + (Q[1].y - Q[0].y) * u + (Q[2].y - Q[0].y) * v };
}

/* ------------------------------- the dash -------------------------------- */
/* under the hull: the black wake with its crimson core, and his phantoms down the path;
   the dead dragged along behind (every third phantom lets one go; METEOR's comet, every one) */
function vkxTrail() {
  const d = P.roninDash, t = uiTime, frame = VKX.frameAt !== t;
  VKX.frameAt = t;
  if (vkxIsVow(d)) {
    if (VKX.ref !== d) { VKX.ref = d; VKX.dashL = 0; VKX.ghostL = -1; }
    VKX.dashL = Math.max(VKX.dashL, rkxProgress(d));
    const at = VKX.dashL, rate = d.len / Math.max(0.02, d.T), every = d.key === 'vz' ? 1 : 3;
    for (let L = Math.max(0, VKX.ghostL + 18); L <= at; L += 18) {
      const p = rkxAt(d, L), i = Math.round(L / 18);
      VKX.ghosts.push({ x: p.x, y: p.y, a: p.a, at: t - (at - L) / rate });
      VKX.ghostL = L;
      if (i % every === 0) vkzSoul(p.x, p.y, p.a + Math.PI + rnd(0.5, -0.5), rnd(150, 80), { w: rnd(11, 7), life: rnd(0.8, 0.5), drag: 0.15 });
    }
    if (VKX.ghosts.length > 100) VKX.ghosts.splice(0, VKX.ghosts.length - 100);
    VKX.wake = { d, head: at, endAt: -1 };
    if (frame) {
      const h = rkxAt(d, at), c = Math.cos(h.a), s = Math.sin(h.a);
      for (let i = 0; i < 3; i++) {                // wind lines peeling off him, crimson
        const off = rnd(26, 10) * (rnd() < 0.5 ? -1 : 1);
        vraPart({ k: 'spark', x: P.x - s * off, y: P.y + c * off, vx: -c * rnd(420, 220), vy: -s * rnd(420, 220),
                  r: 0.9, col: VKZ_HOT, a: 0.8, life: rnd(0.2, 0.1), drag: 0.05 });
      }
    }
  } else if (VKX.wake && VKX.wake.endAt < 0) VKX.wake.endAt = t;
  for (let i = VKX.ghosts.length - 1; i >= 0; i--) if (t - VKX.ghosts[i].at > 0.4) VKX.ghosts.splice(i, 1);
  ctx.save();
  const w = VKX.wake;                             // the wake: from a tail trailing him (catching up once he lands) to the head
  if (w) {
    const ended = w.endAt >= 0, eq = ended ? (t - w.endAt) / 0.22 : 0;
    if (eq >= 1) VKX.wake = null;
    else {
      const head = ended ? w.d.len : w.head, tail0 = Math.max(0, head - 260), tail = ended ? lerp(tail0, head, vraEase(eq)) : tail0;
      if (head - tail > 2) {
        const N = Math.max(4, Math.ceil((head - tail) / 5)), L = [], R = [], C = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, p = rkxAt(w.d, lerp(tail, head, u)), wd = P.r * 1.35 * Math.pow(u, 0.8) * (1 - eq * 0.5) + 0.4;
          const nx = -Math.sin(p.a), ny = Math.cos(p.a);
          L.push([p.x + nx * wd, p.y + ny * wd]); R.push([p.x - nx * wd, p.y - ny * wd]); C.push([p.x, p.y, u]);
        }
        ctx.beginPath();
        L.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
        ctx.closePath();
        ctx.fillStyle = rgba(VKZ_VOID, 0.62 * (1 - eq)); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 1; i < C.length; i++) {
          const u = C[i][2], a = u * (1 - eq);
          ctx.strokeStyle = rgba(VKZ_CRIM, 0.35 * a); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(L[i - 1][0], L[i - 1][1]); ctx.lineTo(L[i][0], L[i][1]);
          ctx.moveTo(R[i - 1][0], R[i - 1][1]); ctx.lineTo(R[i][0], R[i][1]); ctx.stroke();
          ctx.strokeStyle = rgba(VKZ_HOT, 0.7 * a); ctx.lineWidth = 1.8 * u + 0.4;
          ctx.beginPath(); ctx.moveTo(C[i - 1][0], C[i - 1][1]); ctx.lineTo(C[i][0], C[i][1]); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }
  for (const g of VKX.ghosts) vkxGhost(g, Math.pow(1 - clamp((t - g.at) / 0.4, 0, 1), 1.5));
  ctx.restore();
}
// one of his phantoms on the run: the kasa dark, its brim lit crimson, the eye burning at its front, the blade low
function vkxGhost(g, k) {
  if (k <= 0.01) return;
  const c = Math.cos(g.a), s = Math.sin(g.a);
  ctx.fillStyle = rgba(VKZ_VOID, 0.5 * k);
  ctx.beginPath(); ctx.arc(g.x, g.y, 15.5, 0, TAU); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(g.x, g.y, 22, VKZ_CRIM, 0.35 * k);
  ctx.strokeStyle = rgba(VKZ_HOT, 0.6 * k); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(g.x, g.y, 15.5, g.a - 1.9, g.a + 1.9); ctx.stroke();
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.3 * k); ctx.lineWidth = 0.7;
  for (const rr of [6.5, 11]) { ctx.beginPath(); ctx.arc(g.x, g.y, rr, g.a - 1.4, g.a + 1.4); ctx.stroke(); }
  const ex = g.x + c * 12, ey = g.y + s * 12;
  drawGlow(ex, ey, 7, VKZ_CRIM, 0.8 * k);
  drawGlow(ex, ey, 2.2, VKZ_PALE, k);
  const bx = g.x + c * 4 - s * 5, by = g.y + s * 4 + c * 5;
  vraLens(bx, by, bx + c * 32, by + s * 32, 0.9, VKZ_HOT, 0.6 * k);
  ctx.restore();
}

/* ------------------------------ the pieces ------------------------------- */
// a bolt of crimson lightning from (x0, y0) to (x1, y1), w thick; seed it with the frame for its crackle
function vkxBolt(x0, y0, x1, y1, seed, w, a, forks) {
  if (a <= 0.01) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, ang = Math.atan2(dy, dx);
  const n = Math.max(3, Math.round(L / 22)), pts = [{ x: x0, y: y0 }];
  for (let i = 1; i < n; i++) {
    const u = i / n, j = (vraH(seed + i * 1.7) - 0.5) * Math.min(26, L * 0.14);
    pts.push({ x: x0 + dx * u + nx * j, y: y0 + dy * u + ny * j });
  }
  pts.push({ x: x1, y: y1 });
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const line = () => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); };
  for (const [lw, col, al] of [[w * 3.2, VKZ_CRIM, 0.35], [w * 1.4, VKZ_HOT, 0.8], [w * 0.45, VKZ_PALE, 1]]) {
    ctx.strokeStyle = rgba(col, al * a); ctx.lineWidth = lw; line(); ctx.stroke();
  }
  if (forks) for (let i = 1; i < pts.length - 1; i++) {      // forks off its bends
    if (vraH(seed + i * 5.3) < 0.55) continue;
    const p = pts[i], fa = ang + (vraH(seed + i * 2.9) < 0.5 ? 1 : -1) * (0.5 + 0.6 * vraH(seed + i)), fl = 14 + 22 * vraH(seed + i * 3.1);
    const fx = p.x + Math.cos(fa) * fl, fy = p.y + Math.sin(fa) * fl;
    const mx = (p.x + fx) / 2 + (vraH(seed + i * 8.1) - 0.5) * 8, my = (p.y + fy) / 2 + (vraH(seed + i * 9.7) - 0.5) * 8;
    ctx.strokeStyle = rgba(VKZ_HOT, 0.7 * a); ctx.lineWidth = w * 0.8;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.lineTo(fx, fy); ctx.stroke();
  }
  ctx.restore();
}
// a tear in the world onto the dead: a lens from (x0, y0) to (x1, y1), w at its widest; crimson and deep,
// the faces of the dead pressed up to the opening, its lips burning
function vkxTear(x0, y0, x1, y1, w, seed, a) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  if (L < 1 || w < 0.3 || a <= 0.01) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const lens = () => {
    ctx.beginPath(); ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(mx + nx * w * 2, my + ny * w * 2, x1, y1);
    ctx.quadraticCurveTo(mx - nx * w * 2, my - ny * w * 2, x0, y0);
  };
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const g = ctx.createLinearGradient(mx + nx * w, my + ny * w, mx - nx * w, my - ny * w);
  g.addColorStop(0, rgba(VKZ_VOID, a)); g.addColorStop(0.3, rgba(VKZ_DEEP, a)); g.addColorStop(0.5, rgba('#8a1230', a));
  g.addColorStop(0.7, rgba(VKZ_DEEP, a)); g.addColorStop(1, rgba(VKZ_VOID, a));
  lens(); ctx.fillStyle = g; ctx.fill();
  ctx.save(); lens(); ctx.clip();
  const n = Math.max(1, Math.floor(L / 34));
  for (let i = 0; i < n; i++) {
    const h = vraH(seed + i * 1.3), u = (i + 0.5 + (h - 0.5) * 0.5) / n, sd = i % 2 ? 1 : -1;
    const fw = clamp(w * 1.3, 6, 15) * (0.75 + 0.4 * vraH(seed + i * 7.1));
    vkzFace(x0 + dx * u + nx * sd * w * 0.2, y0 + dy * u + ny * sd * w * 0.2, Math.atan2(ny * sd, nx * sd) + (h - 0.5) * 0.6,
            fw * 1.7, fw, 0.7 + 0.3 * Math.sin(uiTime * 8 + i), 0.85 * a);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  lens(); ctx.strokeStyle = rgba(VKZ_HOT, 0.9 * a); ctx.lineWidth = 1.2; ctx.stroke();
  vraLens(x0, y0, x1, y1, w * 0.1 + 0.3, VKZ_PALE, 0.5 * a);
  ctx.restore();
}
// METEOR's blow: the flash, the shock ring, and the dead climbing up out of the crater over its rim
function vkxImpact(A, e, seed) {
  if (e < 0.45) {
    const q = e / 0.45, a = 1 - vraEase(q);
    drawGlow(A.x, A.y, A.r * (0.6 + 0.7 * vraOut(e / 0.1)), VKZ_CRIM, 0.85 * a);
    drawGlow(A.x, A.y, A.r * 0.3, VKZ_PALE, 0.95 * Math.exp(-e * 10));
    ctx.strokeStyle = rgba(VKZ_HOT, 0.9 * a); ctx.lineWidth = 7 * a + 1;
    ctx.beginPath(); ctx.arc(A.x, A.y, A.r * (0.2 + 0.95 * vraOut(q)), 0, TAU); ctx.stroke();
  }
  if (e < 1.05) {
    const k = e < 0.15 ? vraOut(e / 0.15) : e < 0.65 ? 1 : 1 - vraEase((e - 0.65) / 0.4);
    for (let i = 0; i < 12; i++) {
      const an = (i + vraH(seed + i) * 0.5) / 12 * TAU, rr = A.r * 0.34;
      vkzArm(A.x + Math.cos(an) * rr, A.y + Math.sin(an) * rr, an + (vraH(seed * 3 + i) - 0.5) * 0.6,
             8 + 18 * k, 0.4 + 0.4 * Math.sin(e * 9 + i), 26 + 6 * vraH(i + seed), k);
    }
  }
}
// ECLIPSE: a crimson sun on the cross and a black moon sliding over it (k, 0 to 1); its corona the dead,
// streaming out. At the split (e from 0) it is total, flares, and goes out
function vkxEclipse(A, k, e, seed) {
  const t = uiTime, R = A.r * 0.42, a = e < 0 ? clamp(k * 1.5, 0, 1) : 1 - vraEase((e - 0.35) / 0.55);
  if (a <= 0.01) return;
  const flare = e < 0 ? 0 : Math.exp(-e * 4);
  for (let i = 0; i < 16; i++) {                  // the corona
    const an = i / 16 * TAU + vraH(seed + i) * 0.3 + t * 0.25;
    const len = R * (0.6 + 0.6 * vraH(seed * 2 + i)) * (1 + 0.25 * Math.sin(t * 3 + i) + 1.2 * flare) * (0.4 + 0.6 * k);
    vkzFace(A.x + Math.cos(an) * (R + len * 0.35), A.y + Math.sin(an) * (R + len * 0.35), an, len, 9 + 4 * vraH(i + seed), 0.8, 0.75 * a);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(A.x, A.y, R * (2.6 + 1.5 * flare), VKZ_CRIM, (0.55 + 0.3 * flare) * a);
  ctx.fillStyle = rgba(VKZ_CRIM, 0.85 * a); ctx.beginPath(); ctx.arc(A.x, A.y, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(VKZ_PALE, 0.8 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(A.x, A.y, R, 0, TAU); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  const mx = A.x + (1 - k) * R * 2.1, my = A.y - (1 - k) * R * 0.5;
  ctx.fillStyle = rgba('#030102', 0.97 * a); ctx.beginPath(); ctx.arc(mx, my, R * 0.97, 0, TAU); ctx.fill();
  if (k > 0.85 && e < 0.3) {                      // as it closes, the last of the light beads at its edge
    ctx.globalCompositeOperation = 'lighter';
    const ba = Math.atan2(A.y - my, A.x - mx) + 0.6, bx = A.x + Math.cos(ba) * R, by = A.y + Math.sin(ba) * R;
    drawGlow(bx, by, 20, VKZ_PALE, a * (k - 0.85) / 0.15 * (e < 0 ? 1 : 1 - e / 0.3));
  }
  ctx.restore();
}
// THE SKY FALLS: the triangle's own piece of the night sky, red and starred with the dead in it, drop high
// over the room (1) to down on it (0); its shadow on the floor darkening as it comes
function vkxSkySlab(pts, drop, a, seed) {
  const c = vkxMid(pts), lift = drop * 260, sc = 1 + 0.3 * drop;
  const Q = pts.map(p => ({ x: c.x + (p.x - c.x) * sc, y: c.y + (p.y - c.y) * sc - lift }));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(VKZ_VOID, 0.5 * (1 - drop) * a); vkxPath(pts); ctx.fill();
  const qc = { x: c.x, y: c.y - lift }, R = Math.max(...Q.map(p => Math.hypot(p.x - qc.x, p.y - qc.y))) || 1;
  const g = ctx.createRadialGradient(qc.x, qc.y, 0, qc.x, qc.y, R);
  g.addColorStop(0, rgba(VKZ_DEEP, 0.95 * a)); g.addColorStop(1, rgba('#12020a', 0.95 * a));
  vkxPath(Q); ctx.fillStyle = g; ctx.fill();
  ctx.save(); vkxPath(Q); ctx.clip();
  ctx.fillStyle = rgba(VKZ_PALE, 0.85 * a);
  for (let i = 0; i < 36; i++) {
    const p = vkxInTri(Q, vraH(seed + i), vraH(seed + i * 3.3)), r = 0.6 + vraH(seed + i * 5) * 1.1;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    const p = vkxInTri(Q, vraH(seed * 2 + i), vraH(seed * 2 + i * 1.9));
    vkzFace(p.x, p.y, -Math.PI / 2 + (vraH(seed + i * 4) - 0.5) * 0.8, 30, 11, 0.9, 0.5 * a);
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(qc.x, qc.y, R * 1.1, VKZ_CRIM, 0.25 * a);
  vkxPath(Q); ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * a); ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
// and it lands: a flash over the whole of it, then it breaks, its pieces thrown up and out, still red night
function vkxSkyFalls(pts, e, seed) {
  if (e > 0.9) return;
  const c = vkxMid(pts);
  if (e < 0.06) vkxSkySlab(pts, 0, 1, seed);
  if (e < 0.35) {
    const a = 1 - vraEase(e / 0.35);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(c.x, c.y, 280, VKZ_CRIM, 0.8 * a); drawGlow(c.x, c.y, 90, VKZ_PALE, 0.6 * a);
    ctx.restore();
  }
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const quarter = ([A, B, C]) => { const ab = mid(A, B), bc = mid(B, C), ca = mid(C, A); return [[A, ab, ca], [ab, B, bc], [ca, bc, C], [ab, bc, ca]]; };
  const shards = [].concat(...quarter(pts).map(quarter));
  const q = clamp((e - 0.04) / 0.8, 0, 1), a = 1 - vraEase(q);
  if (q <= 0) return;
  ctx.save();
  shards.forEach((tri, i) => {
    const sc = vkxMid(tri), dx = sc.x - c.x, dy = sc.y - c.y, d = Math.hypot(dx, dy) || 1, h = vraH(seed + i * 2.7);
    const fly = vraOut(q) * (40 + 70 * h), up = Math.sin(Math.min(1, q * 1.3) * Math.PI) * (30 + 50 * h), rot = q * (h - 0.5) * 3.2, s = 1 - 0.35 * q;
    ctx.save();
    ctx.translate(sc.x + dx / d * fly, sc.y + dy / d * fly - up); ctx.rotate(rot); ctx.scale(s, s);
    const T = tri.map(p => ({ x: p.x - sc.x, y: p.y - sc.y }));
    ctx.globalCompositeOperation = 'source-over';
    vkxPath(T); ctx.fillStyle = rgba('#2a0610', 0.95 * a); ctx.fill();
    ctx.fillStyle = rgba(VKZ_PALE, 0.8 * a);
    for (let j = 0; j < 3; j++) { const p = vkxInTri(T, vraH(seed + i * 9 + j), vraH(seed + i * 5 + j * 2)); ctx.fillRect(p.x, p.y, 1.2, 1.2); }
    ctx.globalCompositeOperation = 'lighter';
    vkxPath(T); ctx.strokeStyle = rgba(VKZ_HOT, 0.85 * a); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}
// TECTONIC's band broken into plates: cut along it into pieces, each cracked once across; seeded
function vkxPlates(band, seed) {
  const [p0, p1, p2, p3] = band;                  // c1+n, c2+n, c2-n, c1-n
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y), m = Math.max(3, Math.round(len / 70)), plates = [];
  const at = (u, v) => ({ x: lerp(lerp(p0.x, p1.x, u), lerp(p3.x, p2.x, u), v), y: lerp(lerp(p0.y, p1.y, u), lerp(p3.y, p2.y, u), v) });
  const cut = i => i <= 0 ? 0 : i >= m ? 1 : (i + (vraH(seed + i) - 0.5) * 0.4) / m;
  for (let i = 0; i < m; i++) {
    const u0 = cut(i), u1 = cut(i + 1), v0 = 0.35 + 0.3 * vraH(seed * 2 + i), v1 = v0 + 0.1 * (vraH(seed + i * 5) - 0.5);
    plates.push([at(u0, 0), at(u1, 0), at(u1, v1), at(u0, v0)]);
    plates.push([at(u0, v0), at(u1, v1), at(u1, 1), at(u0, 1)]);
  }
  const seams = [];
  for (let i = 1; i < m; i++) seams.push(at(cut(i), 0.5));
  return { plates, seams, nx: (p0.x - p3.x) / 2, ny: (p0.y - p3.y) / 2 };
}
// how far the plates have heaved up at this age (0 to 1), and each plate where it now lies
function vkxHeave(sc, age) {
  const heave = vraOut(age / 0.25) * (1 - vraEase((age - 2.2) / 1)), set = vkxPlates(sc.pts, sc.seed);
  const L = Math.hypot(set.nx, set.ny) || 1, nx = set.nx / L, ny = set.ny / L;
  const tops = set.plates.map((q, i) => {
    const h = vraH(sc.seed * 3 + i), off = (h - 0.5) * 12 * heave, lift = (3 + 7 * h) * heave;
    return { base: q, lift, top: q.map(p => ({ x: p.x + nx * off, y: p.y + ny * off - lift })) };
  });
  return { heave, tops, seams: set.seams };
}
// TECTONIC splitting: light up out of the seams, and the dead's arms reaching up through them
function vkxQuake(A, e, seed) {
  if (e > 1.1) return;
  const set = vkxPlates(A.pts, seed), L = Math.hypot(set.nx, set.ny) || 1, k = e < 0.15 ? vraOut(e / 0.15) : 1 - vraEase((e - 0.6) / 0.5);
  if (e < 0.4) {
    const c = vkxMid(A.pts), a = 1 - vraEase(e / 0.4);
    drawGlow(c.x, c.y, 220, VKZ_CRIM, 0.6 * a);
  }
  set.seams.forEach((p, i) => {
    const sd = i % 2 ? 1 : -1, h = vraH(seed + i * 3.1);
    vkzArm(p.x, p.y, Math.atan2(set.ny * sd, set.nx * sd) + (h - 0.5) * 0.9, 8 + 18 * k, 0.4 + 0.4 * Math.sin(e * 8 + i), 28 + 6 * h, k);
  });
}
// STARFALL: one of the dead falling headlong out of the sky on a wounded body, wailing, and where it lands
function vkxStarSoul(st, ei) {
  if (ei < 0) return;
  const fx = st.x + RKX_STAR_FROM.x, fy = st.y + RKX_STAR_FROM.y, ang = Math.atan2(st.y - fy, st.x - fx);
  const head = vraOut(ei / 0.12), tail = vraEase((ei - 0.05) / 0.25);
  if (tail < 1) {
    const hx = lerp(fx, st.x, head), hy = lerp(fy, st.y, head), tx = lerp(fx, st.x, tail), ty = lerp(fy, st.y, tail);
    vraLens(tx, ty, hx, hy, 5, VKZ_CRIM, 0.55 * (1 - tail));
    vraLens(tx, ty, hx, hy, 1.6, VKZ_PALE, 0.9 * (1 - tail));
    if (head < 1) vkzFace(hx, hy, ang, 50, 15, 1, 1);
  }
  const iq = (ei - 0.12) / 0.5;
  if (iq >= 0 && iq < 1) {
    const ia = 1 - vraEase(iq);
    drawGlow(st.x, st.y, 40 * (1 - iq * 0.4), VKZ_CRIM, 0.7 * ia);
    drawGlow(st.x, st.y, 12, VKZ_PALE, 0.8 * ia);
    vraStreak(st.x, st.y, 50 + 30 * vraOut(iq), ia, VKZ_CRIM);
    ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * ia); ctx.lineWidth = 2 * ia + 0.4;
    ctx.beginPath(); ctx.arc(st.x, st.y, 6 + 40 * vraOut(iq), 0, TAU); ctx.stroke();
  }
}

/* ----------------------------- the split, waiting ----------------------------- */
// what is coming while he runs: METEOR's mark closing, ECLIPSE's moon sliding over, the sky coming down, the band trembling
function vkxOmen(sp, k, strobe) {
  const A = sp.area, t = uiTime;
  if (sp.key === 'vzx') { vkxEclipse(A, vraEase(k), -1, sp.id * 13); return; }
  if (sp.key === 'vxx') { vkxSkySlab(A.pts, 1 - vraIn(k), clamp(k * 3, 0, 1), sp.id * 13); return; }
  ctx.fillStyle = rgba(VKZ_CRIM, (0.04 + 0.1 * k) * strobe); rkxArea(A); ctx.fill();
  ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30;
  ctx.strokeStyle = rgba(VKZ_HOT, 0.3 + 0.4 * k); ctx.lineWidth = 1; rkxArea(A); ctx.stroke();
  ctx.setLineDash([]);
  if (sp.key === 'vz') {
    const r = A.r * (1.6 - 0.6 * vraOut(k));
    ctx.strokeStyle = rgba(VKZ_HOT, 0.6 * k); ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2 + t * 1.5; ctx.beginPath(); ctx.arc(A.x, A.y, r, an - 0.35, an + 0.35); ctx.stroke(); }
    drawGlow(A.x, A.y, 30 + 30 * k, VKZ_CRIM, 0.3 + 0.4 * k);
  }
  if (sp.key === 'vzz') {
    const set = vkxPlates(A.pts, sp.id * 13), jit = (1 - k) * 0 + k * 1.5;
    ctx.strokeStyle = rgba(VKZ_HOT, 0.5 * k * strobe); ctx.lineWidth = 1;
    for (const q of set.plates) {
      ctx.beginPath();
      q.forEach((p, i) => { const x = p.x + (vraH(p.x + t * 40) - 0.5) * jit, y = p.y + (vraH(p.y + t * 37) - 0.5) * jit; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.stroke();
    }
  }
}
// the bodies the stars will find, marked: STARFALL's dead waiting over each; RUPTURE's reach, and the wounded in it throbbing
function vkxStarOmen(sp, k) {
  const t = uiTime, S = sp.stars;
  if (sp.key === 'vc') {
    ctx.setLineDash([3, 8]); ctx.lineDashOffset = t * 24;
    ctx.strokeStyle = rgba(VKZ_HOT, 0.3 + 0.4 * k); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(S.x, S.y, S.r, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const e of enemies) {
    if (e.dead || !(e.woundT > 0) || Math.hypot(e.x - S.x, e.y - S.y) > S.r) continue;
    const beat = 0.5 + 0.5 * Math.sin(t * 14 + e.x * 0.1);
    drawGlow(e.x, e.y, e.r * 2 + 6 * beat, VKZ_CRIM, (0.25 + 0.35 * beat) * k);
    if (sp.key === 'vxz') {
      const sx = e.x + RKX_STAR_FROM.x * 0.4, sy = e.y + RKX_STAR_FROM.y * 0.4;
      drawGlow(sx, sy, 8 + 6 * k, VKZ_CRIM, 0.5 * k);
      drawGlow(sx, sy, 2.5, VKZ_PALE, 0.8 * k);
    }
  }
}

/* ----------------------------- the split, landed ----------------------------- */
function vkxSplit(sp, d) {
  const t = uiTime;
  if (!sp.done) {                                 // waiting: a crimson hairline as far as he has run, a bead burning down each line
    const k = clamp(sp.t / sp.at, 0, 1), mine = rkxSplitOf(d, sp), strobe = k > 0.82 ? 0.7 + 0.3 * Math.sin(t * 70) : 1;
    if (sp.area) vkxOmen(sp, k, strobe);
    if (sp.stars) vkxStarOmen(sp, k);
    for (const s of sp.segs) {
      const leg = mine ? rkxLeg(d, s) : -1;
      let x1 = s.x1, y1 = s.y1, x2 = s.x2, y2 = s.y2;
      if (leg > 0) {
        const p0 = d.pts[leg - 1], L0 = d.cum[leg - 1], f = clamp((VKX.dashL - L0) / ((d.cum[leg] - L0) || 1), 0, 1);
        if (f <= 0) continue;
        const p1 = d.pts[leg];
        x1 = p0.x; y1 = p0.y; x2 = lerp(p0.x, p1.x, f); y2 = lerp(p0.y, p1.y, f);
      }
      ctx.strokeStyle = rgba(VKZ_HOT, (0.25 + 0.45 * k) * strobe); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (leg < 0 || !d) {
        const u = vraEase(k), bx = lerp(x1, x2, u), by = lerp(y1, y2, u);
        drawGlow(bx, by, 7 + 7 * k, VKZ_CRIM, 0.5 + 0.4 * k);
        drawGlow(bx, by, 2.5, VKZ_PALE, 0.9);
      }
    }
    return;
  }
  const e = sp.t - sp.at, seed = sp.id * 13, A = sp.area;
  if (A) {                                        // what it closed, under its tears
    if (sp.key === 'vz') vkxImpact(A, e, seed);
    else if (sp.key === 'vzx') vkxEclipse(A, 1, e, seed);
    else if (sp.key === 'vxx') vkxSkyFalls(A.pts, e, seed);
    else if (sp.key === 'vzz') vkxQuake(A, e, seed);
  }
  // every line tears open onto the dead, lightning runs THUNDERCLAP's and CHAIN LIGHTNING's, and arms burst out
  const bolt = sp.key === 'v' || sp.key === 'vx', wk = (sp.w || SKY_W) / SKY_W, many = sp.segs.length > 12;
  let run = 0;
  sp.segs.forEach((s, si) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ov = 12, start = run;
    run += L;
    const es = e - si * (many ? 0.008 : 0.035);
    if (es < 0) return;
    const X1 = s.x1 - ux * ov, Y1 = s.y1 - uy * ov, X2 = s.x2 + ux * ov, Y2 = s.y2 + uy * ov;
    const head = vraOut(es / 0.06), tail = vraEase((es - 0.24) / 0.4);
    if (tail >= 1) return;
    const open = vraOut(es / 0.08) * (1 - 0.4 * tail), w = clamp(L / 22, 5, 10) * wk * open;
    vkxTear(lerp(X1, X2, tail), lerp(Y1, Y2, tail), lerp(X1, X2, head), lerp(Y1, Y2, head), w, seed + si * 7, 1);
    if (bolt && es < 0.32) vkxBolt(s.x1, s.y1, s.x2, s.y2, seed + si * 5 + Math.floor(t * 30), 1.4 * wk, 1 - es / 0.32, true);
    if (head < 1) drawGlow(lerp(X1, X2, head), lerp(Y1, Y2, head), 24, VKZ_PALE, 0.8);
    const k = es < 0.12 ? vraOut(es / 0.12) : 1 - vraEase((es - 0.3) / 0.35);
    if (k > 0.02) for (let u0 = 80 - start % 80; u0 < L; u0 += 80) {      // one arm every 80 px of all its lines
      const j = Math.floor((start + u0) / 80), sd = j % 2 ? 1 : -1, h = vraH(seed + j * 3.7);
      vkzArm(s.x1 + ux * u0 - uy * sd * w * 0.6, s.y1 + uy * u0 + ux * sd * w * 0.6, Math.atan2(ux * sd, -uy * sd) + (h - 0.5) * 0.8,
             6 + 16 * k, 0.35 + 0.4 * Math.sin(es * 10 + j), 24 + 6 * h, k);
    }
  });
  if (sp.key === 'vxz') sp.starAt.forEach((st, i) => vkxStarSoul(st, e - i * 0.045));
  if (sp.key === 'vc' && sp.stars && e < 0.4) {   // RUPTURE: its pulse going out from where he landed
    const q = e / 0.4, a = 1 - vraEase(q);
    ctx.strokeStyle = rgba(VKZ_HOT, 0.7 * a); ctx.lineWidth = 4 * a + 1;
    ctx.beginPath(); ctx.arc(sp.stars.x, sp.stars.y, sp.stars.r * vraOut(q), 0, TAU); ctx.stroke();
    drawGlow(sp.stars.x, sp.stars.y, 80, VKZ_CRIM, 0.6 * a);
  }
}
// RUPTURE: a wounded body bursts along its wound: the cut torn wide, crimson and bone thrown out either side of it
function vkxBursts() {
  const t = uiTime;
  for (let i = VKX.bursts.length - 1; i >= 0; i--) {
    const b = VKX.bursts[i], age = t - b.at;
    if (age > 0.6) { VKX.bursts.splice(i, 1); continue; }
    const q = age / 0.6, a = 1 - vraEase(q), c = Math.cos(b.a), s = Math.sin(b.a), L = b.r * (1.2 + 1.6 * vraOut(q / 0.3));
    drawGlow(b.x, b.y, b.r * (2.5 + 2 * vraOut(q)), VKZ_CRIM, 0.8 * a);
    drawGlow(b.x, b.y, b.r, VKZ_PALE, 0.9 * Math.exp(-age * 12));
    vraLens(b.x - c * L, b.y - s * L, b.x + c * L, b.y + s * L, 5 * a + 1, VKZ_HOT, a);
    for (let j = 0; j < 12; j++) {
      const sd = j % 2 ? 1 : -1, h = vraH(b.seed + j), an = b.a + sd * (Math.PI / 2 + (h - 0.5) * 1.1), u = (h - 0.5) * 1.6;
      const r0 = b.r * 0.5, r1 = r0 + (20 + 40 * vraH(b.seed + j * 3.1)) * vraOut(q / 0.5), ox = b.x + c * b.r * u, oy = b.y + s * b.r * u;
      vraLens(ox + Math.cos(an) * r0, oy + Math.sin(an) * r0, ox + Math.cos(an) * r1, oy + Math.sin(an) * r1, 1.6 * a, j % 3 ? VKZ_CRIM : VKZ_BONE, 0.9 * a);
    }
  }
}
// the floor's scars, lit: a rift's seam cooling, the crater's rim molten, light up out of the plates' seams, the crush's cracks
function vkxScarGlow() {
  const t = uiTime;
  for (const sc of VKX.scars) {
    const age = t - sc.at, heat = Math.exp(-age * 1.4);
    if (sc.kind === 'rift') {
      const open = 1 - vraEase(age / VKX_LIFE.rift);
      vraLens(sc.s.x1, sc.s.y1, sc.s.x2, sc.s.y2, sc.w * 0.12 * open, VKZ_CRIM, 0.45 * open);
    } else if (sc.kind === 'crater') {
      const a = 1 - vraEase((age - 2) / 1.5), R = sc.r * 0.5;
      ctx.strokeStyle = rgba(VKZ_HOT, (0.2 + 0.6 * heat) * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, R, 0, TAU); ctx.stroke();
      drawGlow(sc.x, sc.y, R * 1.2, VKZ_CRIM, 0.35 * heat * a);
    } else if (sc.kind === 'plates') {
      const H = vkxHeave(sc, age), a = 1 - vraEase((age - 2.6) / 0.6);
      vraLens(sc.pts[0].x / 2 + sc.pts[3].x / 2, sc.pts[0].y / 2 + sc.pts[3].y / 2, sc.pts[1].x / 2 + sc.pts[2].x / 2, sc.pts[1].y / 2 + sc.pts[2].y / 2,
              30 * H.heave, VKZ_CRIM, 0.35 * a);
      ctx.strokeStyle = rgba(VKZ_HOT, 0.55 * H.heave * a); ctx.lineWidth = 1.2;
      for (const p of H.tops) { vkxPath(p.top); ctx.stroke(); }
    } else if (sc.kind === 'crush') {
      const a = 1 - vraEase((age - 1.8) / 1), c = vkxMid(sc.pts);
      drawGlow(c.x, c.y, 140, VKZ_CRIM, 0.3 * heat * a);
    }
  }
}
/* the lit side of the vow's X, in X's additive pass: his step off, the hull at speed, the landing,
   every vow split, the floor's scars lit, RUPTURE's bursts */
function vkxSky() {
  const t = uiTime, d = P.roninDash;
  ctx.save();
  ctx.lineCap = 'round';
  vkxScarGlow();
  const sq = (t - VKX.dashAt) / 0.3;              // the step off: crimson at his footing
  if (sq >= 0 && sq < 1) {
    const a = 1 - vraEase(sq), c = Math.cos(VKX.dashAng), s = Math.sin(VKX.dashAng), L = 36 * (1 + vraOut(sq));
    drawGlow(VKX.dashX, VKX.dashY, 34 * (1 - sq * 0.5), VKZ_CRIM, 0.8 * a);
    drawGlow(VKX.dashX, VKX.dashY, 12, VKZ_PALE, 0.8 * a);
    vraLens(VKX.dashX + s * L, VKX.dashY - c * L, VKX.dashX - s * L, VKX.dashY + c * L, 2.4 * a, VKZ_HOT, a);
    vraStreak(VKX.dashX, VKX.dashY, 64 * (1 + sq), a * 0.8, VKZ_CRIM);
  }
  if (vkxIsVow(d)) {                              // at speed: a crimson smear; METEOR comes in as a burning comet
    const h = VKX.ref === d ? rkxAt(d, VKX.dashL) : { a: P.ang }, c = Math.cos(h.a), s = Math.sin(h.a);
    const comet = d.key === 'vz', back = Math.min(90, VKX.dashL + 10) * (comet ? 1.7 : 1);
    drawGlow(P.x, P.y, comet ? 64 : 36, VKZ_CRIM, comet ? 0.65 : 0.35);
    vraLens(P.x - c * back, P.y - s * back, P.x + c * 10, P.y + s * 10, comet ? 16 : 8, VKZ_CRIM, 0.45);
    vraLens(P.x - c * back * 0.8, P.y - s * back * 0.8, P.x + c * 8, P.y + s * 8, comet ? 4 : 2, VKZ_PALE, 0.85);
    if (comet) drawGlow(P.x + c * 6, P.y + s * 6, 22, VKZ_PALE, 0.75);
  }
  const lq = (t - VKX.landAt - 0.07) / 0.3;       // the landing: the blade sheathed, a click of crimson light at the hip
  if (lq >= 0 && lq < 1) {
    const a = 1 - vraEase(lq), c = Math.cos(VKX.landAng), s = Math.sin(VKX.landAng);
    const hx = VKX.landX - s * 9 - c * 2, hy = VKX.landY + c * 9 - s * 2, r = 12 * vraOut(lq * 2) + 4;
    drawGlow(hx, hy, 16, VKZ_PALE, 0.8 * a);
    vraLens(hx - c * r * 1.6, hy - s * r * 1.6, hx + c * r * 1.6, hy + s * r * 1.6, 1.4 * a + 0.3, VKZ_PALE, a);
    vraLens(hx - s * r * 0.7, hy + c * r * 0.7, hx + s * r * 0.7, hy - c * r * 0.7, 1 * a + 0.2, VKZ_HOT, a);
  }
  const tq = (t - VKX.landAt) / 0.5;              // THUNDERCLAP's thunder, going out from where he lands
  if (VKX.landKey === 'v' && tq >= 0 && tq < 1) {
    const a = 1 - vraEase(tq);
    ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * a); ctx.lineWidth = 5 * a + 1;
    ctx.beginPath(); ctx.arc(VKX.landX, VKX.landY, 20 + 180 * vraOut(tq), 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_PALE, 0.6 * a); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(VKX.landX, VKX.landY, 14 + 150 * vraOut(tq), 0, TAU); ctx.stroke();
  }
  for (const sp of roninSplits) if (vkxIsVow(sp) && !sp.merged) vkxSplit(sp, d);
  vkxBursts();
  ctx.restore();
}

/* ------------------------------- the floor -------------------------------- */
function vkxCraterFloor(sc, age) {
  const a = 1 - vraEase((age - 2) / 1.5), R = sc.r * 0.5 * vraOut(age / 0.12), heat = Math.exp(-age * 1.2);
  const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, R * 1.25);
  g.addColorStop(0, rgba(VKZ_VOID, 0.95 * a)); g.addColorStop(0.6, rgba(VKZ_DEEP, 0.85 * a));
  g.addColorStop(0.85, rgba(VKZ_VOID, 0.6 * a)); g.addColorStop(1, rgba(VKZ_VOID, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sc.x, sc.y, R * 1.25, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(VKZ_CRIM, (0.35 + 0.5 * heat) * a); ctx.lineWidth = 3;    // the rim, molten
  ctx.beginPath(); ctx.arc(sc.x, sc.y, R, 0, TAU); ctx.stroke();
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 14; i++) {                  // cracks out to the edge of what it struck
    let an = (i + vraH(sc.seed + i)) / 14 * TAU, x = sc.x + Math.cos(an) * R, y = sc.y + Math.sin(an) * R;
    const L = (sc.r - R) * (0.5 + 0.5 * vraH(sc.seed * 3 + i)) * vraOut(age / 0.2);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { an += (vraH(sc.seed + i * 5 + j * 1.7) - 0.5) * 0.8; x += Math.cos(an) * L / 4; y += Math.sin(an) * L / 4; ctx.lineTo(x, y); }
    ctx.strokeStyle = rgba(VKZ_VOID, 0.85 * a); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_CRIM, (0.25 + 0.55 * heat) * a); ctx.lineWidth = 0.9; ctx.stroke();
  }
  ctx.fillStyle = rgba('#05060a', 0.9 * a);       // what it threw out: chips of floor
  for (let i = 0; i < 18; i++) {
    const an = vraH(sc.seed + i * 1.9) * TAU, rr = sc.r * (0.55 + 0.5 * vraH(sc.seed + i * 3)), sz = 2 + 4 * vraH(sc.seed + i * 7);
    const x = sc.x + Math.cos(an) * rr, y = sc.y + Math.sin(an) * rr;
    ctx.beginPath(); ctx.moveTo(x - sz, y); ctx.lineTo(x, y - sz * 0.7); ctx.lineTo(x + sz * 0.8, y + sz * 0.2); ctx.lineTo(x - sz * 0.2, y + sz * 0.7); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// what the vow's X leaves on the floor (from vkzFloorFx): each line a closing rift; METEOR's crater, ECLIPSE's
// scorched ring, TECTONIC's plates heaved up over the depths, and THE SKY FALLS' crushed ground
function vkxFloor() {
  const t = uiTime;
  for (let i = VKX.scars.length - 1; i >= 0; i--) {
    const sc = VKX.scars[i], age = t - sc.at;
    if (age > VKX_LIFE[sc.kind]) { VKX.scars.splice(i, 1); continue; }
    if (sc.kind === 'rift') {
      const open = 1 - vraEase(age / VKX_LIFE.rift), R = vkzRift(sc.s, sc.seed, open, sc.w * 0.32);
      vkzPoly(R.A);
      for (let j = R.B.length - 1; j >= 0; j--) ctx.lineTo(R.B[j][0], R.B[j][1]);
      ctx.closePath();
      ctx.fillStyle = rgba(VKZ_VOID, 0.9); ctx.fill();
      vraLens(sc.s.x1, sc.s.y1, sc.s.x2, sc.s.y2, sc.w * 0.14 * open, VKZ_DEEP, 0.9);
    } else if (sc.kind === 'crater') vkxCraterFloor(sc, age);
    else if (sc.kind === 'ring') {
      const a = 1 - vraEase((age - 1.4) / 1.2), heat = Math.exp(-age * 1.5);
      ctx.strokeStyle = rgba(VKZ_VOID, 0.6 * a); ctx.lineWidth = 16;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(VKZ_CRIM, (0.2 + 0.5 * heat) * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, TAU); ctx.stroke();
    } else if (sc.kind === 'plates') {
      const H = vkxHeave(sc, age), a = 1 - vraEase((age - 2.6) / 0.6);
      vkxPath(sc.pts); ctx.fillStyle = rgba(VKZ_VOID, 0.9 * a * H.heave); ctx.fill();
      for (const p of H.tops) {
        ctx.fillStyle = rgba('#05060a', 0.95 * a);                 // its broken side, where it rose
        vkxPath(p.base); ctx.fill();
        ctx.fillStyle = rgba('#161a26', a);                       // and its top, lit a little
        vkxPath(p.top); ctx.fill();
        ctx.strokeStyle = rgba('#000000', 0.6 * a); ctx.lineWidth = 1; ctx.stroke();
      }
    } else if (sc.kind === 'crush') {
      const a = 1 - vraEase((age - 1.8) / 1), heat = Math.exp(-age * 1.3), c = vkxMid(sc.pts);
      vkxPath(sc.pts); ctx.fillStyle = rgba(VKZ_VOID, 0.55 * a); ctx.fill();
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let j = 0; j < 10; j++) {                // the ground cracked out from where it struck
        const v = sc.pts[j % 3], w = sc.pts[(j + 1) % 3], f = vraH(sc.seed + j);
        const ex = lerp(v.x, w.x, f), ey = lerp(v.y, w.y, f);
        let x = c.x, y = c.y;
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 1; k <= 4; k++) { x = lerp(c.x, ex, k / 4) + (vraH(sc.seed + j * 7 + k) - 0.5) * 14; y = lerp(c.y, ey, k / 4) + (vraH(sc.seed + j * 9 + k) - 0.5) * 14; ctx.lineTo(x, y); }
        ctx.strokeStyle = rgba(VKZ_VOID, 0.85 * a); ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = rgba(VKZ_CRIM, (0.2 + 0.6 * heat) * a); ctx.lineWidth = 0.9; ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/* ------------------------------- the screen ------------------------------- */
// (from vkzScreen) while he runs: the room closing in on him, crimson speed lines at the edges
function vkxScreen() {
  const d = P.roninDash;
  if (!vkxIsVow(d)) return;
  const t = uiTime, p = vraToScreen(P.x, P.y), R = Math.max(W, H);
  ctx.save();
  const g = ctx.createRadialGradient(p.x, p.y, 70 * camZoom, p.x, p.y, R * 0.75);
  g.addColorStop(0, 'rgba(10,2,5,0)'); g.addColorStop(1, rgba(VKZ_DEEP, 0.4));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  const h = VKX.ref === d ? rkxAt(d, VKX.dashL) : { a: P.ang }, c = Math.cos(h.a), s = Math.sin(h.a);
  const f = Math.floor(t * 30), clear = Math.min(W, H) * 0.3;
  for (let i = 0; i < 22; i++) {
    const off = (vraH(i * 3.7 + f) - 0.5) * R * 1.3, along = (vraH(i * 9.1 + f * 1.7) - 0.5) * R * 1.2;
    const x = W / 2 + c * along - s * off, y = H / 2 + s * along + c * off;
    if (Math.hypot(x - p.x, y - p.y) < clear) continue;
    const L = 40 + 90 * vraH(i * 1.3 + f * 0.7);
    vraLens(x - c * L, y - s * L, x + c * L, y + s * L, 0.9, VKZ_HOT, 0.26);
  }
  ctx.restore();
}

/* ------------------------------- the moments ------------------------------- */
// X pressed in the vow: crimson at his footing, his name on the seal
function vkxSkyFx(d) {
  const p0 = d.pts[0], p1 = d.pts[1] || d.pts[0], ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) || P.ang;
  VKX.dashAt = uiTime; VKX.dashX = p0.x; VKX.dashY = p0.y; VKX.dashAng = ang;
  VKX.ref = d; VKX.dashL = 0; VKX.ghostL = -1;
  VKZ.flashes.push({ at: uiTime, big: false, x: p0.x, y: p0.y, a: ang });
  vraInk(p0.x, p0.y, 6, 80, 6, 0.5);
  vraSparks(p0.x, p0.y, 14, VKZ_HOT, 320, ang + Math.PI, 1.1, 0.25, 1.2);
  roninVowNameFx(d.n, p0.x, p0.y);
  shake(0.12);
}
// he lands, and sheathes
function vkxLandFx(d) {
  const n = d.pts.length, p0 = d.pts[Math.max(0, n - 2)], p1 = d.pts[n - 1];
  const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) || P.ang;
  VKX.landAt = uiTime; VKX.landX = P.x; VKX.landY = P.y; VKX.landAng = ang; VKX.landKey = d.key;
  vraSparks(P.x, P.y, 12, VKZ_HOT, 280, ang, 1.2, 0.22, 1.1);
  vraInk(P.x, P.y, 5, 70, 6, 0.45);
  shake(d.key === 'v' ? 0.3 : 0.14);
}
// the split lands: sparks off every line and the dead let out of them; the floor keeps what it did
function vkxSplitFx(sp) {
  let longest = null, LL = 0, total = 0;
  sp.segs.forEach((s, si) => {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
    total += L;
    if (L > LL) { LL = L; longest = { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, a }; }
    const n = Math.max(3, Math.round(L / 18));
    for (let i = 0; i < n; i++) {
      const u = (i + rnd()) / n;
      vraSparks(s.x1 + dx * u, s.y1 + dy * u, 1, rnd() < 0.35 ? VKZ_PALE : VKZ_HOT, 260, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, 0.7, 0.3, 1.1);
    }
    if (rnd() < L / 140) vkzSoul((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, rnd(150, 80), { w: rnd(12, 8), life: rnd(0.9, 0.6), drag: 0.25 });
    VKX.scars.push({ kind: 'rift', s: { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }, w: sp.w || SKY_W, at: uiTime, seed: sp.id * 7 + si });
  });
  const A = sp.area;
  if (A) {
    const c = A.kind === 'circle' ? { x: A.x, y: A.y } : vkxMid(A.pts);
    if (sp.key === 'vz') VKX.scars.push({ kind: 'crater', x: A.x, y: A.y, r: A.r, at: uiTime, seed: sp.id });
    else if (sp.key === 'vzx') VKX.scars.push({ kind: 'ring', x: A.x, y: A.y, r: A.r, at: uiTime });
    else if (sp.key === 'vzz') VKX.scars.push({ kind: 'plates', pts: A.pts.map(p => ({ x: p.x, y: p.y })), at: uiTime, seed: sp.id * 13 });
    else if (sp.key === 'vxx') VKX.scars.push({ kind: 'crush', pts: A.pts.map(p => ({ x: p.x, y: p.y })), at: uiTime, seed: sp.id });
    for (let i = 0; i < 10; i++) vkzSoul(c.x, c.y, rnd(TAU), rnd(260, 140), { w: rnd(13, 9), life: rnd(0.8, 0.5), drag: 0.2 });
    vraEmbers(c.x, c.y, 18, VKZ_CRIM, 140, 1, 1.4);
    vraInk(c.x, c.y, 8, 160, 9, 0.7);
  }
  for (const st of sp.starAt) vraSparks(st.x, st.y, 10, VKZ_HOT, 320, 0, TAU, 0.3, 1.3);
  if (VKX.scars.length > 60) VKX.scars.splice(0, VKX.scars.length - 60);
  if (longest) VKZ.flashes.push({ at: uiTime, big: true, x: longest.x, y: longest.y, a: longest.a });
  shake(Math.min(0.6, 0.2 + total / 1400 + (A ? 0.15 : 0) + sp.starAt.length * 0.03));
}
// a body cut by it (or struck by a star, or leapt to): the cut through it and its soul dragged out;
// RUPTURE's: it bursts along its wound
function vkxHitFx(e, sp, star) {
  const w = RKA.wound.get(e), burst = star && sp.key === 'vc';
  const a = burst && w ? w.ang : star ? Math.atan2(-RKX_STAR_FROM.y, -RKX_STAR_FROM.x) : rkxSegAng(sp, e.x, e.y);
  VKZ.hits.push({ x: e.x, y: e.y, r: e.r, a, at: uiTime });
  if (VKZ.hits.length > 32) VKZ.hits.shift();
  if (w) w.ang = a; else RKA.wound.set(e, { ang: a, at: uiTime - 1 });
  if (burst) {
    VKX.bursts.push({ x: e.x, y: e.y, r: e.r, a, at: uiTime, seed: rnd(1000) });
    if (VKX.bursts.length > 16) VKX.bursts.shift();
    vkzSoul(e.x, e.y, -Math.PI / 2 + rnd(0.8, -0.8), rnd(200, 140), { w: Math.max(9, e.r * 0.9), life: 0.8, drag: 0.15, rise: 30 });
    vraSparks(e.x, e.y, 12, VKZ_BONE, 300, a + Math.PI / 2, 1.2, 0.3, 1.4);
    vraSparks(e.x, e.y, 12, VKZ_BONE, 300, a - Math.PI / 2, 1.2, 0.3, 1.4);
    vraEmbers(e.x, e.y, 14, VKZ_CRIM, 120, 0.8, 1.3);
    shake(0.2);
    return;
  }
  vkzSoul(e.x, e.y, a + (rnd() < 0.5 ? 0.35 : -0.35), rnd(260, 180), { w: Math.max(8, e.r * 0.85), life: 0.75, drag: 0.08 });
  vraSparks(e.x, e.y, 10, VKZ_PALE, 340, a, 0.35, 0.25, 1.3);
  vraSparks(e.x, e.y, 8, VKZ_CRIM, 220, a + Math.PI, 0.9, 0.35, 1.2);
  vraInk(e.x, e.y, 3, 100, 5, 0.4);
}

/* ---------------------- in place of the placeholders' ---------------------- */
// CHAIN LIGHTNING: each leap a forked bolt of crimson lightning, a beat after the last, with a soul riding it
function rkvArcs() {
  const t = uiTime;
  for (const sp of roninSplits) {
    if (!sp.arcAt || !sp.arcAt.length || !sp.done) continue;
    const age = sp.t - sp.at;
    sp.arcAt.forEach((q, i) => {
      const ai = age - i * 0.03, a = clamp(1 - ai / 0.5, 0, 1);
      if (ai < 0 || a <= 0) return;
      const grow = vraOut(ai / 0.06), x2 = lerp(q.x1, q.x2, grow), y2 = lerp(q.y1, q.y2, grow);
      vkxBolt(q.x1, q.y1, x2, y2, sp.id * 31 + i * 7 + Math.floor(t * 30), 1.6, a, true);
      drawGlow(q.x2, q.y2, 22, VKZ_CRIM, 0.6 * a * grow);
      if (ai < 0.25) {
        const u = vraOut(ai / 0.25);
        vkzFace(lerp(q.x1, q.x2, u), lerp(q.y1, q.y2, u), Math.atan2(q.y2 - q.y1, q.x2 - q.x1), 30, 10, 1, 0.9 * (1 - ai / 0.25));
      }
    });
  }
}
/* ======================= end of V: LAST VOW — the vow's X ======================= */
