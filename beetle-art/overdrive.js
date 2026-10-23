/* ===========================================================================
   EMBER · THE BLUE BEETLE — OVERDRIVE (BEETLE-PLAN.md, step 4)
   The transformation, redrawn on the stock beat (odPhase): the room dims,
   something comes for EMBER, it lands, the room catches, the vanes open and
   the lance turns into the helix. The timings are the stock ones (OD_T_*);
   only what is drawn changes.

     THE SWARM    in place of the falling spark. Fire beetles stream in from
                  every edge of the screen on curling flights, each landing on
                  a different part of the shell and lighting it, the last one
                  at the moment the spark would have landed. It is computed
                  from the clock (T), not stepped, so it can be scrubbed and
                  looks the same at any frame rate.
     THE ROOM     the floor catches in blue: the stock pools, recoloured, with
                  cold coals and violet edges.
     THE FORM     the elytra flung wide and held there, two great wings of blue
                  fire unfolding from under them (a membrane, feathers of flame
                  along its trailing edge, a hard spar), a white core burning
                  in the gap, the shell's seams lit, and a crest of flame on
                  every plate of the body.
     THE LANCE    the helix's two strands become two braided jets of flame,
                  cyan in front and violet behind, flaring where they cross.
     THE GRADE    an indigo dim, a cold grade while it burns, an icy flash.

     btlOdLit(T)                   how much of the swarm has landed, 0..1
     btlOdSwarm(T, sx, sy, ang, sc, W, H)
                                   the swarm, in screen space, homing on the hull
                                   at (sx, sy) facing ang, sc px to a hull unit
     btlOdFloor(pools, t, life, parts)
                                   the burning floor (odPools, world); embers
                                   go into parts, a MOTION pool, if given
     btlOdWings(B, me, q)          the wings of fire and the core, under the hull
     btlOdGrade(q, T, flash, W, H, mid)
                                   the dim, the grade and the flash, screen space;
                                   mid() draws between the dim and the grade (the swarm)
   The beetle's own art reads me.od (odPhase()) and me.odLit (btlOdLit) to
   fling the shell, light the seams, crest the body and braid the lance.
=========================================================================== */

const BTL_OD = {
  flies: 40,
  // where on the hull each one lands, in hull space: the shell, the pronotum, the head
  spots: [[-6, 4], [-6, -4], [-10, 6], [-10, -6], [-13, 2.5], [-13, -2.5], [-4, 8], [-4, -8], [0, 5], [0, -5],
          [2, 0], [-8, 0], [7, 3], [7, -3], [-11, 9], [-11, -9], [-15, 0], [3, 8], [3, -8], [10, 0]],
  feathers: 9,
  ink: '#1e1b4b', deep: '#312e81', blue: '#2563eb', sky: '#38bdf8', cyan: '#22d3ee', ice: '#cffafe',
  white: '#f0fdff', violet: '#6d28d9', orchid: '#a855f7'
};
const btlHash = (i, k) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };

/* ================================= THE SWARM ============================== */
// one fire beetle: when it sets out, when it lands, where from and how it turns
function btlFly(i) {
  const n = BTL_OD.flies, last = i === n - 1;
  return {
    i, t0: OD_T_SPARK + btlHash(i, 1) * 0.6,
    t1: last ? OD_T_LAND : OD_T_LAND - 0.5 + btlHash(i, 2) * 0.48,
    a0: btlHash(i, 3) * TAU, dir: btlHash(i, 4) < 0.5 ? -1 : 1, spin: 1.4 + btlHash(i, 5) * 1.9,
    spot: BTL_OD.spots[i % BTL_OD.spots.length],
    col: i % 3 ? BTL_OD.cyan : BTL_OD.orchid, size: 0.8 + btlHash(i, 6) * 0.5
  };
}
const _btlFlies = [];
const btlFlies = () => _btlFlies.length ? _btlFlies : (Array.from({ length: BTL_OD.flies }, (_, i) => _btlFlies.push(btlFly(i))), _btlFlies);
function btlOdLit(T) {
  let n = 0;
  for (const f of btlFlies()) if (T >= f.t1) n++;
  return n / BTL_OD.flies;
}
/* Where one is at T: on a spiral closing on its landing spot, drifting on
   the flow while it is far out and darting in at the end. */
function btlFlyAt(f, T, sx, sy, ang, sc, R) {
  const u = clamp((T - f.t0) / (f.t1 - f.t0), 0, 1);
  const ca = Math.cos(ang), sa = Math.sin(ang), [lx, ly] = f.spot;
  const tx = sx + (lx * ca - ly * sa) * sc, ty = sy + (lx * sa + ly * ca) * sc;
  // far out it drifts; the turn comes as it closes, so it darts in rather than sweeping
  const r = R * (1 - Math.pow(u, 1.5)), th = f.a0 + f.dir * f.spin * Math.pow(u, 2.4);
  const w = moFlow(f.i * 9.1 + u * 4, f.i * 5.3, T * 0.6, 1.3);
  const drift = R * 0.07 * (1 - u);
  return { x: tx + Math.cos(th) * r + w[0] * drift, y: ty + Math.sin(th) * r * 0.9 + w[1] * drift, u, tx, ty };
}
function btlOdSwarm(T, sx, sy, ang, sc, W, H) {
  if (T < OD_T_SPARK - 0.05 || T > OD_T_LAND + 0.6) return;
  const R = Math.max(W, H) * 0.62, lit = btlOdLit(T);
  ctx.save();
  ctx.lineCap = 'round';
  // the hull taking the light as they land
  ctx.globalCompositeOperation = 'lighter';
  if (lit > 0) drawGlow(sx, sy, (16 + lit * 46) * Math.max(1, sc * 0.5), BTL_OD.cyan, 0.12 + lit * 0.3);
  for (const f of btlFlies()) {
    if (T < f.t0) continue;
    if (T >= f.t1) {
      // the landing: a small cold pop where it struck
      const k = (T - f.t1) / 0.32;
      if (k < 1) {
        const p = btlFlyAt(f, f.t1, sx, sy, ang, sc, R);
        ctx.globalAlpha = (1 - k) * 0.8;
        ctx.strokeStyle = BTL_OD.ice; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.tx, p.ty, 2 + k * 11, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
        drawGlow(p.tx, p.ty, 10 * (1 - k) + 3, f.col, 0.6 * (1 - k));
      }
      continue;
    }
    const p = btlFlyAt(f, T, sx, sy, ang, sc, R), q = btlFlyAt(f, Math.max(f.t0, T - 0.016), sx, sy, ang, sc, R);
    const hd = Math.atan2(p.y - q.y, p.x - q.x), pulse = 0.65 + 0.35 * Math.sin(T * 13 + f.i * 1.7);
    // its streak: where it was a moment ago, read off the same flight, fading
    let prev = p;
    for (let j = 1; j <= 6; j++) {
      const tt = T - j * 0.012;
      if (tt < f.t0) break;
      const s = btlFlyAt(f, tt, sx, sy, ang, sc, R), k = 1 - j / 7;
      ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = rgba(f.col, 0.45 * k); ctx.lineWidth = 2.6 * f.size * k + 0.4; ctx.stroke();
      ctx.strokeStyle = rgba(BTL_OD.ice, 0.6 * k); ctx.lineWidth = 0.9 * f.size * k; ctx.stroke();
      prev = s;
    }
    drawGlow(p.x, p.y, (11 + pulse * 6) * f.size, f.col, 0.6 * pulse);
    // the beetle itself: a dark body, a lit abdomen, a blur of wings
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(hd); ctx.scale(f.size * 1.5, f.size * 1.5);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(205,250,255,0.22)';
    const flap = Math.sin(T * 70 + f.i) * 0.6;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(0.2, s * 1.9, 1.9, 0.7 + flap * 0.3, s * 0.5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#0c0a24';
    ctx.beginPath(); ctx.ellipse(0.6, 0, 2.1, 1.25, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(BTL_OD.white, 0.9 * pulse);
    ctx.beginPath(); ctx.ellipse(-1.2, 0, 1.2, 0.95, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/* ================================== THE ROOM ==============================
   The stock pools, burning blue. Tongues lean up-screen in a narrow cone and
   overlap, so each pool churns as one body of flame. */
function btlLeaf(bx, by, ang, len, wid, bend) {
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  const tx = bx + ca * len + nx * bend, ty = by + sa * len + ny * bend;
  const mx = bx + ca * len * 0.45, my = by + sa * len * 0.45;
  ctx.beginPath();
  ctx.moveTo(bx + nx * wid, by + ny * wid);
  ctx.quadraticCurveTo(mx + nx * wid * 1.15 + nx * bend * 0.4, my + ny * wid * 1.15 + ny * bend * 0.4, tx, ty);
  ctx.quadraticCurveTo(mx - nx * wid * 1.15 + nx * bend * 0.4, my - ny * wid * 1.15 + ny * bend * 0.4, bx - nx * wid, by - ny * wid);
  ctx.closePath();
}
function btlOdFloor(pools, t, life, parts) {
  if (!pools || !pools.length || life <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of pools) {
    const up = clamp((t - p.born) / 0.55, 0, 1) * life;
    if (up <= 0.001) continue;
    const fl = 0.82 + Math.sin(t * (5.1 + p.k) + p.seed) * 0.1 + Math.sin(t * (11.3 + p.k * 2) + p.seed * 2) * 0.05;
    const R = p.r * up * fl;
    drawGlow(p.x, p.y, R * 1.5, BTL_OD.ink, 0.42 * up);
    drawGlow(p.x, p.y, R * 0.8, BTL_OD.blue, 0.26 * up);
    ctx.globalAlpha = 0.16 * up; ctx.fillStyle = BTL_OD.deep;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 0.66, R * 0.4, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const ph = (t * (0.9 + p.k * 0.35) + i * 0.317 + p.seed) % 1;
      const spread = (i / 7 - 0.5) * 0.95 + Math.sin(p.seed + i) * 0.08;
      const a = -Math.PI / 2 + spread * 0.8 + Math.sin(t * 1.9 + i * 2.2 + p.seed) * 0.14;
      const bx = p.x + spread * R * 0.5, by = p.y + Math.abs(spread) * R * 0.1;
      const grow = 0.5 + Math.sin(ph * Math.PI) * 0.7, len = R * (0.62 + (0.5 - Math.abs(spread)) * 0.8) * grow;
      const bend = Math.sin(t * 3.4 + i * 1.6 + p.seed) * R * 0.14, fade = up * (0.35 + Math.sin(ph * Math.PI) * 0.5);
      ctx.globalAlpha = 0.24 * fade; ctx.fillStyle = BTL_OD.violet; btlLeaf(bx, by, a, len, R * 0.28, bend); ctx.fill();
      ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = BTL_OD.blue; btlLeaf(bx, by, a, len * 0.72, R * 0.17, bend * 0.7); ctx.fill();
      ctx.globalAlpha = 0.32 * fade; ctx.fillStyle = '#a5f3fc'; btlLeaf(bx, by, a, len * 0.36, R * 0.08, bend * 0.4); ctx.fill();
    }
    ctx.globalAlpha = (0.24 + Math.sin(t * 7 + p.seed) * 0.08) * up; ctx.fillStyle = BTL_OD.ice;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, R * 0.24, R * 0.1, 0, 0, TAU); ctx.fill();
    if (parts && Math.random() < 0.1 * life)
      moPart({ x: p.x + (Math.random() - 0.5) * R * 0.9, y: p.y + (Math.random() - 0.5) * R * 0.6,
               vx: (Math.random() - 0.5) * 44, vy: -30 - Math.random() * 62, drag: 1.2, flow: 18, fs: 30,
               life: 0.6 + Math.random() * 0.8, r: 1 + Math.random() * 1.4, layer: 'btlEmber' }, parts);
  }
  ctx.restore();
}

/* ================================== THE FORM ==============================
   Under the hull: the core burning in the gap the shell leaves, and the two
   wings of fire. Each wing is a membrane on a spar, with feathers of flame
   licking back off its trailing edge; the inner feathers run white, the outer
   ones are cooling to violet by the time they get there. */
function btlOdWings(B, me, q) {
  const open = q ? q.open : 0;
  if (open <= 0.001) return;
  const t = B.t, surge = btlSurge(t), lag = clamp(B.turn * 0.05, -0.7, 0.7), flap = B.flap || 1;   // flap: BRAND drives them harder
  ctx.save();
  ctx.translate(me.x, me.y); ctx.rotate(me.ang);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // the core, in the gap between the flung elytra
  drawGlow(-7, 0, (14 + surge * 8) * open, BTL_OD.sky, 0.45 * open);
  drawGlow(-7, 0, (6 + surge * 3) * open, BTL_OD.white, 0.5 * open);
  ctx.globalAlpha = 0.85 * open; ctx.fillStyle = BTL_OD.white;
  ctx.beginPath(); ctx.ellipse(-7, 0, 3.4 + surge, 1.6 + surge * 0.4, 0, 0, TAU); ctx.fill();
  for (const s of [-1, 1]) {
    const beat = Math.sin(t * 5.2 * flap + s * 0.4) * 0.1 * flap, skew = lag * s;
    const dir = Math.PI - s * (1.0 - beat) - lag * 0.45;             // the spar: back and out
    const L = 34 * open * (0.88 + surge * 0.12);
    const rx = -2.5, ry = 3.4 * s, ca = Math.cos(dir), sa = Math.sin(dir);
    const tipX = rx + ca * L, tipY = ry + sa * L;
    // the spar bows forward a little: a point on it at u, and the way it runs there
    const sp = u => {
      const bow = Math.sin(u * Math.PI) * 4 * s * open;
      return [rx + ca * L * u - sa * bow, ry + sa * L * u + ca * bow];
    };
    // the membrane, between the spar and a trailing edge swept back toward the tail
    const back = dir - s * 0.85 - skew * 0.4;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    for (let i = 1; i <= 8; i++) { const [x, y] = sp(i / 8); ctx.lineTo(x, y); }
    ctx.quadraticCurveTo(tipX + Math.cos(back) * L * 0.2, tipY + Math.sin(back) * L * 0.2,
                         rx + Math.cos(back) * L * 0.55 - 4, ry + Math.sin(back) * L * 0.55);
    ctx.quadraticCurveTo(-9, 5 * s, rx, ry);
    ctx.closePath();
    const mg = ctx.createLinearGradient(rx, ry, tipX, tipY);
    mg.addColorStop(0, rgba(BTL_OD.cyan, 0.3 * open)); mg.addColorStop(0.55, rgba(BTL_OD.orchid, 0.16 * open));
    mg.addColorStop(1, rgba(BTL_OD.violet, 0.06 * open));
    ctx.globalAlpha = 1; ctx.fillStyle = mg; ctx.fill();
    // the feathers, off the spar and back over the membrane
    const N = BTL_OD.feathers;
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), [bx, by] = sp(0.12 + k * 0.88);
      const flick = 0.86 + Math.sin(t * (6 + i * 1.6) + i * 2.3 + s) * 0.14, span = open * flick;
      const a = dir - s * (0.95 + k * 0.35) - skew * (0.3 + k * 0.4);
      const len = (10 + 24 * Math.sin(Math.min(1, 0.2 + k * 0.85) * Math.PI)) * span * (0.85 + surge * 0.25);
      const w = (3.2 - k * 1.2) * span, bend = s * (3 + k * 6) * span + Math.sin(t * 4.2 + i * 1.3 + s) * 2 * span;
      const near = 1 - k * 0.55;
      ctx.globalAlpha = 0.22 * span; ctx.fillStyle = BTL_OD.deep; btlLeaf(bx, by, a, len, w * 1.9, bend); ctx.fill();
      ctx.globalAlpha = 0.3 * span * near; ctx.fillStyle = BTL_OD.blue; btlLeaf(bx, by, a, len * 0.86, w * 1.05, bend * 0.8); ctx.fill();
      ctx.globalAlpha = 0.36 * span * flick * near * near;
      ctx.fillStyle = k < 0.22 ? BTL_OD.white : i % 3 === 0 ? BTL_OD.ice : BTL_OD.cyan;
      btlLeaf(bx, by, a, len * 0.5, w * 0.42, bend * 0.5); ctx.fill();
      if (B.parts && Math.random() < 0.03 * open * surge * surge) {
        const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len, c = Math.cos(me.ang), n = Math.sin(me.ang);
        moPart({ x: me.x + ex * c - ey * n, y: me.y + ex * n + ey * c, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60,
                 drag: 2, flow: 20, fs: 24, life: 0.4 + Math.random() * 0.5, r: 0.9 + Math.random(), layer: 'btlEmber' }, B.parts);
      }
    }
    // the spar: one hard line, and the reason it reads as a wing
    ctx.globalAlpha = 0.7 * open; ctx.strokeStyle = BTL_OD.ice; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(rx, ry);
    for (let i = 1; i <= 12; i++) { const [x, y] = sp(i / 12); ctx.lineTo(x, y); }
    ctx.stroke();
    // two veins across the membrane
    ctx.globalAlpha = 0.3 * open; ctx.lineWidth = 0.6;
    for (const u of [0.35, 0.68]) {
      const [x, y] = sp(u);
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + Math.cos(back) * L * 0.18, y + Math.sin(back) * L * 0.18,
                           x + Math.cos(back) * L * 0.34 - 2, y + Math.sin(back) * L * 0.34);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// the stock surge: an idle breath with a gout now and then, ~0.72 … ~1.67
function btlSurge(t) {
  const raw = Math.sin(t * 3.7) * 0.5 + Math.sin(t * 8.9 + 1.3) * 0.28 + Math.sin(t * 1.61) * 0.22;
  return 0.72 + Math.pow(clamp(raw * 0.5 + 0.5, 0, 1), 2.1) * 0.95;
}

/* the crest on one plate of the body, in that plate's frame: a tongue of
   blue fire off its back, leaning back along the body */
function btlOdCrest(B, i, R, life) {
  const t = B.t, fl = 0.8 + 0.2 * Math.sin(t * (9 + i) + i * 1.9), len = (5 + R * 0.9) * life * fl;
  const bend = Math.sin(t * 4.1 + i * 0.8) * 1.6;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35 * life; ctx.fillStyle = BTL_OD.blue; btlLeaf(-1, 0, Math.PI, len, R * 0.42, bend); ctx.fill();
  ctx.globalAlpha = 0.5 * life; ctx.fillStyle = '#a5f3fc'; btlLeaf(-1, 0, Math.PI, len * 0.55, R * 0.2, bend * 0.6); ctx.fill();
  ctx.restore();
}

/* ================================= THE LANCE ==============================
   Two jets of flame wound round the beam's axis, depth-sorted so one passes
   behind the other. The winding is the stock helix's (turns, spin, reach), so
   it fills the same lane; the strands flicker on the flow. */
function btlOdBraid(B, me, k) {
  const segs = me.segs;
  if (k <= 0.001 || !segs || !segs.length) return;
  const a = segs[0], b = segs[segs.length - 1], t = B.t;
  const ox = a.x1, oy = a.y1, len = Math.hypot(b.x2 - ox, b.y2 - oy), ang = Math.atan2(b.y2 - oy, b.x2 - ox);
  const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
  const STEPS = 64, TURNS = 5.4, SPIN = 7.2, AMP = 11;
  const pt = (j, s) => {
    const u = s / STEPS, d = u * len, ph = u * TURNS * TAU - t * SPIN + j * Math.PI;
    const taper = Math.sin(Math.min(1, u * 1.35) * Math.PI * 0.5) * (1 - u * 0.22);
    const off = (Math.sin(ph) * AMP + moFlow(u * 7 + j * 3, j * 4, t * 2, 1)[1] * 1.6) * taper * k;
    return { x: ox + ca * d + nx * off, y: oy + sa * d + ny * off, depth: Math.cos(ph), u };
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const pass of [-1, 1]) for (const j of [0, 1]) {
    let run = false;
    for (let s = 0; s <= STEPS; s++) {
      const p = pt(j, s), side = p.depth < 0 ? -1 : 1;
      if (side !== pass) { run = false; continue; }
      if (!run) { run = true; ctx.beginPath(); ctx.moveTo(p.x, p.y); } else ctx.lineTo(p.x, p.y);
      if (s === STEPS || (pt(j, s + 1).depth < 0 ? -1 : 1) !== pass) {
        const front = pass > 0, fade = k * (1 - p.u * 0.55);
        ctx.globalAlpha = (front ? 0.28 : 0.2) * fade; ctx.strokeStyle = front ? BTL_OD.blue : BTL_OD.deep;
        ctx.lineWidth = front ? 9 : 6; ctx.stroke();
        ctx.globalAlpha = (front ? 0.8 : 0.45) * fade; ctx.strokeStyle = front ? BTL_OD.sky : BTL_OD.violet;
        ctx.lineWidth = front ? 3.6 : 2.2; ctx.stroke();
        if (front) { ctx.globalAlpha = 0.95 * fade; ctx.strokeStyle = BTL_OD.white; ctx.lineWidth = 1.2; ctx.stroke(); }
        run = false;
      }
    }
  }
  ctx.globalAlpha = 1;
  // where the strands cross: the only place that flares
  for (let s = 2; s < STEPS; s++) {
    const p = pt(0, s), q = pt(1, s);
    if (Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > 5) continue;
    drawGlow((p.x + q.x) / 2, (p.y + q.y) / 2, 15, '#a5f3fc', 0.4 * k);
  }
  // the jaws and the far end
  drawGlow(ox, oy, 24, BTL_OD.sky, 0.55 * k);
  const ex = ox + ca * len, ey = oy + sa * len;
  drawGlow(ex, ey, 30 + Math.sin(t * 22) * 5, BTL_OD.orchid, 0.55 * k);
  ctx.globalAlpha = 0.9 * k; ctx.fillStyle = BTL_OD.white;
  ctx.translate(ex, ey); ctx.rotate(ang + t * 3);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const a2 = i * TAU / 8, r = i % 2 ? 3.4 : 10; i ? ctx.lineTo(Math.cos(a2) * r, Math.sin(a2) * r) : ctx.moveTo(Math.cos(a2) * r, Math.sin(a2) * r); }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* ================================== THE GRADE ============================= */
function btlOdGrade(q, T, flash, W, H, mid) {
  if (!q) return;
  const dAmt = q.dim * (1 - q.life * 0.45);
  if (dAmt > 0.002) {
    const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.12, W / 2, H / 2, Math.max(W, H) * 0.7);
    vig.addColorStop(0, 'rgba(4,3,16,' + (0.55 * dAmt) + ')');
    vig.addColorStop(1, 'rgba(3,2,12,' + (0.9 * dAmt) + ')');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  }
  if (mid) mid();                       // the swarm sits above the dim, as the spark did
  if (q.life > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75), pulse = 0.05 + Math.sin(T * 3.1) * 0.012;
    g.addColorStop(0, 'rgba(56,189,248,' + ((pulse + 0.02) * q.life) + ')');
    g.addColorStop(1, 'rgba(46,16,101,' + (pulse * 0.6 * q.life) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (flash > 0) { ctx.fillStyle = 'rgba(224,247,255,' + (Math.pow(flash, 2) * 0.72) + ')'; ctx.fillRect(0, 0, W, H); }
}
function btlDrawEmber(q, k) {
  drawGlow(q.x, q.y, q.r * 3.6, k > 0.5 ? BTL_OD.cyan : BTL_OD.orchid, 0.4 * k);
  ctx.fillStyle = rgba(BTL_OD.ice, 0.8 * k); ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.45, 0, TAU); ctx.fill();
}
