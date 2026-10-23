/* ===========================================================================
   EMBER · THE BLUE BEETLE — OVERDRIVE's moves (BEETLE-PLAN.md, step 4)
   Z, X, C and COMBO 1, drawn over the stock logic. Every function here takes
   the same state the stock art is handed (P.odScorch, odScars, odPyros,
   P.odStrike, odRing) and draws in the same layer, so wiring it in is
   swapping one call for another. The stock constants (SCORCH_*, SCAR_*,
   PYRO_*, STRIKE_*, BRAND_*) are read, never copied.

     Z  SCORCHED EARTH   a bombardier's spray: a wide jet of boiling blue fire,
                         pulsing down its length, bubbling, splashing where it
                         ends. As bright at the tip as at the jaws, because its
                         damage does not fall off. Its scores cool from cyan
                         through violet to black glass.
     X  PYROTECHNICS     fire beetles circle the mark through its second,
                         faster as it runs out; at zero they dive in, the
                         column goes up, and they burst out of its top. It
                         leaves a crater cooling to glass.
     C  BRAND            the beetle beats its wings of fire and climbs at the
                         camera; the cut up is two shell halves sweeping shut
                         across the screen; the X is aimed as two lanes with a
                         mandible's hooks at their ends, and cut by a foot of
                         fire carrying a sickle blade.
     COMBO 1             the wall is a curtain of blue flame studded with fire
                         thorns, a pale arc at its foot burning away; the giant
                         column primes with the whole floor cracking and a
                         swarm spiralling in, then goes up.

     btlScorch(B, sc)                  world, additive (drawOdScorch)
     btlScars(scars, t, parts)         world, floor (drawOdScars)
     btlPyroMarks(pyros)               world, floor (drawOdPyroMarks)
     btlPyros(pyros, parts)            world, additive (drawOdPyros)
     btlStrikeHull(B, me, alt, wings)  world: the beetle leaving and landing (drawOdStrikeHull)
     btlStrikeMarks(st, ax, ay, zoom, t)   world, floor: the X aimed at (ax, ay) (drawOdStrikeMarks)
     btlStrikeFoot(st, zoom, t)        world, additive: the foot (drawOdStrike)
     btlStrikeCut(black, W, H, t)      screen: the cuts (drawOdStrikeCut)
     btlBrandWall(g)                   world, additive (drawOdBrandWall)
     btlBrandNukeMark(st, t)           world, floor (drawOdBrandNukeMark)
     btlBrandNuke(st, t, parts)        world, additive (drawOdBrandNuke)
     btlKitScreen(a, b, W, H)          screen: Z lighting and going out (drawOdKitScreen)
=========================================================================== */

const BTL_KIT = {
  // cooling, hot to cold: white, ice, cyan, blue, indigo, violet, then glass
  cool: ['#f0fdff', '#cffafe', '#22d3ee', '#2563eb', '#4338ca', '#6d28d9', '#1e1033'],
  glass: '#04030d', lip: '#67e8f9', deep: '#312e81', blue: '#2563eb', sky: '#38bdf8',
  cyan: '#22d3ee', ice: '#cffafe', white: '#f0fdff', violet: '#6d28d9', orchid: '#a855f7', pink: '#f0abfc'
};
// a point on the cooling ramp: 1 just laid, 0 gone cold
function btlCool(h) {
  const R = BTL_KIT.cool, f = (1 - clamp(h, 0, 1)) * (R.length - 1), i = Math.min(R.length - 2, Math.floor(f));
  return btlMix(R[i], R[i + 1], f - i);
}
const btlEaseOut = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/* A fire beetle, small, the way the swarm draws them: a blur of wings, a dark
   body, a lit abdomen, and its glow. (x, y) where, hd its heading, s its size. */
function btlFireBeetle(x, y, hd, s, col, a, T, i) {
  if (a <= 0.01) return;
  const pulse = 0.65 + 0.35 * Math.sin(T * 13 + i * 1.7);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, 9 * s, col, 0.55 * pulse * a);
  ctx.translate(x, y); ctx.rotate(hd); ctx.scale(s, s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(205,250,255,0.24)';
  const flap = Math.sin(T * 70 + i) * 0.6;
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(0.2, sd * 1.9, 1.9, 0.7 + flap * 0.3, sd * 0.5, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#0c0a24';
  ctx.beginPath(); ctx.ellipse(0.6, 0, 2.1, 1.25, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(BTL_KIT.white, 0.9 * pulse * a);
  ctx.beginPath(); ctx.ellipse(-1.2, 0, 1.2, 0.95, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/* =================================== Z ==================================== */
function btlScorch(B, sc) {
  if (!sc || sc.k <= 0.01) return;
  const t = sc.t, k = sc.k, hw = Math.max(sc.half, 1);
  const L = Math.hypot(sc.x2 - sc.x1, sc.y2 - sc.y1), ang = Math.atan2(sc.y2 - sc.y1, sc.x2 - sc.x1);
  if (L < 1) return;
  ctx.save();
  ctx.translate(sc.x1, sc.y1); ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  // the billow round it, churning forward
  const N = Math.max(10, Math.round(L / (hw * 0.7)));
  for (let i = 0; i < N; i++) {
    const u = (i + (t * 2.4) % 1) / N, x = u * L, w = moFlow(x * 0.05, i * 3.1, t * 2, 1);
    const r = hw * (1.25 + 0.25 * Math.sin(t * 9 + i * 1.3)) * (0.55 + 0.45 * Math.min(1, u * 6));
    ctx.globalAlpha = 0.3 * k;
    const spr = btlPuff(Math.round(clamp(0.35 + 0.5 * u + 0.15 * w[0], 0, 1) * 15));
    ctx.drawImage(spr, x - r, w[1] * hw * 0.25 - r, r * 2, r * 2);
  }
  // the jet: its body, edges boiling on the flow
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const x = L * i / 14;
    pts.push({ x, y: moFlow(x * 0.04, 7.7, t * 3, 1)[1] * hw * 0.12 * Math.min(1, i / 3) });
  }
  // moRibbon takes full widths: the body fills the hitbox, 2 × half
  moRibbon(pts, hw * 1.9, hw * 2.1, { cap: 'round' });
  let g = ctx.createLinearGradient(0, -hw, 0, hw);
  g.addColorStop(0, rgba(BTL_KIT.violet, 0)); g.addColorStop(0.25, rgba(BTL_KIT.blue, 0.42 * k));
  g.addColorStop(0.5, rgba(BTL_KIT.sky, 0.6 * k)); g.addColorStop(0.75, rgba(BTL_KIT.blue, 0.42 * k)); g.addColorStop(1, rgba(BTL_KIT.violet, 0));
  ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fill();
  moRibbon(pts, hw * 1.0, hw * 1.2, { cap: 'round' });
  ctx.fillStyle = rgba(BTL_KIT.cyan, 0.45 * k); ctx.fill();
  // the pulses: a bombardier fires in beats, and each one runs down the jet
  ctx.lineWidth = Math.max(1, hw * 0.08);
  for (let j = 0; j < 6; j++) {
    const u = (t * 5.5 + j / 6) % 1, x = u * L, a = (1 - u * 0.4) * k;
    ctx.strokeStyle = rgba(BTL_KIT.ice, 0.55 * a);
    ctx.beginPath(); ctx.ellipse(x, 0, hw * 0.24, hw * (0.85 + 0.1 * Math.sin(j)), 0, 0, TAU); ctx.stroke();
  }
  // the boil: bubbles riding it
  for (let m = 0; m < 22; m++) {
    const u = (btlHash(m, 31) + t * (1.1 + btlHash(m, 32) * 0.8)) % 1, x = u * L;
    const y = (btlHash(m, 33) - 0.5) * hw * 1.6, r = hw * (0.05 + btlHash(m, 34) * 0.08) * (0.6 + 0.4 * Math.sin(t * 20 + m));
    ctx.strokeStyle = rgba(BTL_KIT.white, 0.6 * k); ctx.lineWidth = Math.max(0.6, hw * 0.03);
    ctx.beginPath(); ctx.arc(x, y, Math.max(0.8, r), 0, TAU); ctx.stroke();
  }
  // the core
  moRibbon(pts, hw * 0.3, hw * 0.18, { cap: 'round' });
  ctx.fillStyle = rgba(BTL_KIT.white, 0.85 * k); ctx.fill();
  // the jaws, and the splash where it ends
  drawGlow(0, 0, hw * 2.4, BTL_KIT.sky, 0.6 * k);
  drawGlow(L, 0, hw * 2.6, BTL_KIT.orchid, 0.5 * k);
  drawGlow(L, 0, hw * 1.2, BTL_KIT.white, 0.5 * k);
  ctx.lineCap = 'round';
  for (let j = 0; j < 9; j++) {
    const a = Math.PI + (btlHash(j, 41) - 0.5) * 2.6 + Math.sin(t * 7 + j) * 0.2;
    const l = hw * (0.8 + 1.2 * ((t * 3 + btlHash(j, 42)) % 1));
    ctx.strokeStyle = rgba(btlCool(0.8 - (l / hw) * 0.25), 0.55 * k); ctx.lineWidth = Math.max(1, hw * 0.08);
    ctx.beginPath(); ctx.moveTo(L + Math.cos(a) * hw * 0.4, Math.sin(a) * hw * 0.4); ctx.lineTo(L + Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
  }
  ctx.restore();
  if (B && B.parts && Math.random() < 0.7 * k) {
    const a = ang + Math.PI + (Math.random() - 0.5) * 2.4, s = 80 + Math.random() * 160;
    moPart({ x: sc.x2, y: sc.y2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3.5, flow: 20, fs: 30,
             life: 0.3 + Math.random() * 0.4, r: 1 + Math.random() * 1.5, layer: 'btlEmber' }, B.parts);
  }
}

/* The scores: a trench cooling from where it was laid. The lip catches cyan,
   the floor of it goes to black glass with the light sliding along it, and
   while it is still hot it seams and splits in shards. */
function btlScars(scars, t, parts) {
  if (!scars || !scars.length) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of scars) {
    if (!s.stamps.length) continue;
    const fade = clamp((s.life - s.t) / 1.6, 0, 1);
    if (fade <= 0.005) continue;
    const w = s.half * 2 / SCAR_HALF * 0.78;
    const path = (dx, dy) => {
      ctx.beginPath();
      for (const st of s.stamps) {
        const q = Math.max(0.45, st.k), mx = (st.x1 + st.x2) / 2, my = (st.y1 + st.y2) / 2;
        ctx.moveTo(lerp(mx, st.x1, q) + dx, lerp(my, st.y1, q) + dy);
        ctx.lineTo(lerp(mx, st.x2, q) + dx, lerp(my, st.y2, q) + dy);
      }
    };
    const layer = (dx, dy, lw, col, a) => { path(dx, dy); ctx.globalAlpha = a * fade; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke(); };
    ctx.globalCompositeOperation = 'source-over';
    layer(0, 0, w * 2.1, BTL_KIT.glass, 0.28);             // the scorch round it
    layer(0, 0, w * 1.5, BTL_KIT.glass, 0.32);
    layer(0, -w * 0.09, w * 1.12, BTL_KIT.lip, 0.14);      // the lip, catching the light
    layer(0, w * 0.07, w * 1.08, '#000000', 0.45);         // and its shadow
    layer(0, 0, w, '#070512', 0.92);                       // the trench
    layer(0, w * 0.06, w * 0.62, BTL_KIT.glass, 0.9);      // its floor, glassed
    ctx.globalCompositeOperation = 'lighter';
    // the glass: one glint sliding the length of the trench, strongest once it is cold
    const cold = clamp(s.t / (s.life * 0.6), 0, 1);
    if (cold > 0.02) {
      let total = 0;
      for (const st of s.stamps) total += Math.hypot(st.x2 - st.x1, st.y2 - st.y1);
      const win = Math.max(w * 0.8, 30), S = ((t * 160 + s.seed * 7) % (total + win * 2)) - win;
      ctx.lineCap = 'butt';
      let run = 0;
      for (const st of s.stamps) {
        const L = Math.hypot(st.x2 - st.x1, st.y2 - st.y1);
        const a0 = clamp((S - win - run) / L, 0, 1), a1 = clamp((S + win - run) / L, 0, 1);
        run += L;
        if (L < 1 || a1 <= a0) continue;
        const ux = (st.x2 - st.x1) / L, uy = (st.y2 - st.y1) / L, nx = -uy, ny = ux;
        for (const [off, a] of [[-0.18, 0.35], [0.12, 0.2]]) {
          ctx.globalAlpha = a * cold * fade; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = clamp(w * 0.03, 0.8, 3);
          ctx.beginPath();
          ctx.moveTo(st.x1 + ux * L * a0 + nx * w * off, st.y1 + uy * L * a0 + ny * w * off);
          ctx.lineTo(st.x1 + ux * L * a1 + nx * w * off, st.y1 + uy * L * a1 + ny * w * off);
          ctx.stroke();
        }
      }
      ctx.lineCap = 'round';
    }
    // the heat in it: seams, then shards splitting off them
    for (let i = 0; i < s.stamps.length; i++) {
      const st = s.stamps[i], age = s.t - st.at;
      const heat = clamp(1 - age / (s.life * 0.8), 0, 1) * (age < 0.25 ? 1 : 0.85);
      const flick = 0.85 + 0.15 * Math.sin(t * 9 + i * 1.7 + s.seed);
      const q = Math.max(0.45, st.k), mx = (st.x1 + st.x2) / 2, my = (st.y1 + st.y2) / 2;
      const ax = lerp(mx, st.x1, q), ay = lerp(my, st.y1, q), bx = lerp(mx, st.x2, q), by = lerp(my, st.y2, q);
      const sw = clamp(w / 40, 1, 2.5);                  // seams grow a little with the trench (BRAND's is six times Z's)
      ctx.strokeStyle = btlCool(heat * 0.95);
      ctx.globalAlpha = (0.12 + 0.22 * heat) * fade * flick; ctx.lineWidth = (1.6 + 2.6 * heat) * sw;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = (0.2 + 0.45 * heat) * fade * flick; ctx.lineWidth = (1 + heat) * sw;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      if (heat > 0.05) {
        const L = Math.hypot(bx - ax, by - ay);
        if (L < 4) continue;
        const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux, nC = Math.min(6, 1 + Math.floor(L / 80));
        ctx.lineWidth = Math.min(1.6, sw); ctx.strokeStyle = btlCool(heat * 0.8); ctx.globalAlpha = 0.7 * heat * fade;   // cracks stay hairlines
        ctx.beginPath();
        for (let c = 0; c < nC; c++) {
          // a shard: a straight split out and a second one back, a triangle of glass
          const hs = s.seed + i * 13.7 + c * 5.3, d = L * (0.08 + btlHash(hs, 1) * 0.84), sd = btlHash(hs, 2) < 0.5 ? -1 : 1;
          const cl = w * (0.35 + btlHash(hs, 3) * 0.35), sk = (btlHash(hs, 4) - 0.5) * cl;
          const px = ax + ux * d, py = ay + uy * d;
          ctx.moveTo(px, py);
          ctx.lineTo(px + ux * sk + nx * sd * cl, py + uy * sk + ny * sd * cl);
          ctx.lineTo(px + ux * (sk + cl * 0.5) + nx * sd * cl * 0.45, py + uy * (sk + cl * 0.5) + ny * sd * cl * 0.45);
        }
        ctx.stroke();
      }
      if (parts && heat > 0.15 && Math.random() < 0.02 * heat) {
        const u = Math.random();
        moPart({ x: lerp(ax, bx, u), y: lerp(ay, by, u), vx: (Math.random() - 0.5) * 24, vy: -30 - Math.random() * 40,
                 drag: 1.5, flow: 14, fs: 26, life: 0.4 + Math.random() * 0.4, r: 1 + Math.random(), layer: 'btlEmber' }, parts);
      }
    }
  }
  ctx.restore();
}

/* =================================== X ==================================== */
// a ragged disc, for the crater
function btlBlot(x, y, rad, seed) {
  ctx.beginPath();
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * TAU, q = rad * (0.9 + btlHash(seed, i % 28) * 0.18);
    i ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
// cracks run out from the middle, as far as `reach` of the radius
function btlCracks(x, y, r, reach, seed, col, a, n = 9) {
  ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU + btlHash(seed, i) * 0.5;
    let px = x, py = y;
    ctx.moveTo(px, py);
    for (let j = 1; j <= 5; j++) {
      const d = r * reach * j / 5, aj = a0 + (btlHash(seed + i, j) - 0.5) * 0.5;
      px = x + Math.cos(aj) * d; py = y + Math.sin(aj) * d;
      ctx.lineTo(px, py);
    }
  }
  ctx.stroke();
}
function btlPyroMarks(pyros) {
  if (!pyros || !pyros.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const p of pyros) {
    if (!p.up) {
      const k = clamp(p.t / PYRO_DELAY, 0, 1), e = btlEaseOut(k);
      // the floor cooling dark, then warming cold from under
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, rgba(BTL_KIT.deep, 0.25 + 0.4 * k)); g.addColorStop(0.7, rgba('#0b0a24', 0.32 + 0.2 * k)); g.addColorStop(1, rgba(BTL_KIT.glass, 0.15));
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      btlCracks(p.x, p.y, p.r, e, p.seed, btlCool(0.3 + 0.6 * k), 0.4 + 0.5 * k);
      // the rim, and the countdown burning away round it from the top
      const pulse = 0.5 + 0.5 * Math.sin(p.t * (10 + 38 * k));
      ctx.globalAlpha = 0.45 + 0.25 * pulse * k; ctx.strokeStyle = BTL_KIT.cyan; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
      if (k < 1) {
        ctx.globalAlpha = 0.9; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, -Math.PI / 2 + k * TAU, Math.PI * 1.5); ctx.stroke();
        const ha = -Math.PI / 2 + k * TAU;
        drawGlow(p.x + Math.cos(ha) * p.r, p.y + Math.sin(ha) * p.r, 14, BTL_KIT.white, 0.8);
      }
      ctx.globalCompositeOperation = 'source-over';
      // the beetles: round the rim, faster as the second runs out, closing in at the end
      const n = 9;
      for (let i = 0; i < n; i++) {
        const sp = 2 + 9 * k * k, a = p.seed + (i / n) * TAU + p.t * sp + k * k * 1.5;
        const rr = p.r * (0.92 - 0.25 * Math.pow(k, 4));
        const x = p.x + Math.cos(a) * rr, y = p.y + Math.sin(a) * rr * 0.92;
        btlFireBeetle(x, y, a + Math.PI / 2, 1.1, i % 3 ? BTL_KIT.cyan : BTL_KIT.orchid, Math.min(1, p.t * 5), p.t, i);
      }
    } else {
      // the crater, cooling to glass
      const u = clamp((p.t - PYRO_DELAY) / PYRO_AFTER, 0, 1), fade = 1 - clamp((u - 0.75) / 0.25, 0, 1);
      ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = BTL_KIT.glass; btlBlot(p.x, p.y, p.r * 0.92, p.seed); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6 * fade; ctx.strokeStyle = btlCool(1 - u * 0.8); ctx.lineWidth = 2;
      btlBlot(p.x, p.y, p.r * 0.92, p.seed); ctx.stroke();
      btlCracks(p.x, p.y, p.r * 0.9, 1, p.seed, btlCool(0.9 - u * 0.8), 0.6 * (1 - u) * fade);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}
/* The column, top-down the way the stock draws it: a white base, tongues
   climbing up-screen, a ring round its foot; then it lets go of the ground
   and rises away, and the beetles that dived in burst out of its top. */
function btlColumn(x, y, r, u, seed, bright, beetles, T, hMax) {
  const rise = btlEaseOut(clamp(u / 0.12, 0, 1)), go = u < 0.4 ? 0 : (u - 0.4) / 0.6, colK = (1 - go * go) * bright;
  const Hc = (hMax || r * 3.4) * rise, base = y - Hc * 0.85 * go * go, top = y - Hc - r * 1.4 * go;
  const bw = r * 0.85 * (1 - go * 0.5);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the ring off its foot
  const ringK = clamp(u / 0.35, 0, 1);
  ctx.globalAlpha = (1 - ringK) * 0.8 * bright; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, r * (1 + ringK * 0.6), r * (1 + ringK * 0.6) * 0.62, 0, 0, TAU); ctx.stroke();
  drawGlow(x, base, bw * 2.2, BTL_KIT.blue, 0.5 * colK);
  drawGlow(x, base, bw * 1.1, BTL_KIT.white, 0.55 * colK * (1 - go));
  // the body: tongues climbing, cooler as they go up
  for (let i = 0; i < 26; i++) {
    const ph = (T * (1.6 + btlHash(seed, i) * 0.8) + btlHash(seed, i + 40)) % 1;
    const yy = lerp(base, top, ph), sway = Math.sin(T * 5 + i * 1.7) * bw * 0.25 * ph;
    const xx = x + (btlHash(seed, i + 80) - 0.5) * bw * 1.3 * (1 - ph * 0.6) + sway;
    const len = Hc * (0.18 + 0.2 * btlHash(seed, i + 120)) * (1 - ph * 0.5), wid = bw * (0.32 - ph * 0.18);
    const a = Math.sin(ph * Math.PI) * colK;
    ctx.globalAlpha = 0.28 * a; ctx.fillStyle = btlCool(0.9 - ph * 0.75); btlLeaf(xx, yy, -Math.PI / 2, len, wid, sway * 0.4); ctx.fill();
    ctx.globalAlpha = 0.35 * a; ctx.fillStyle = btlCool(1 - ph * 0.5); btlLeaf(xx, yy, -Math.PI / 2, len * 0.5, wid * 0.4, sway * 0.2); ctx.fill();
  }
  ctx.restore();
  // the beetles, out of its top as it goes up
  if (beetles && u > 0.02) {
    const n = beetles, out = btlEaseOut(clamp(u / 0.7, 0, 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + btlHash(seed, i + 200) * 0.6, d = r * (0.3 + out * (1.6 + btlHash(seed, i + 220)));
      const bx = x + Math.cos(a) * d, by = y - Hc * 0.6 + Math.sin(a) * d * 0.7;
      btlFireBeetle(bx, by, a, 1.2 * Math.max(1, r / 160), i % 3 ? BTL_KIT.cyan : BTL_KIT.orchid, (1 - u) * bright, T, i);
    }
  }
}
function btlPyros(pyros, parts) {
  if (!pyros) return;
  for (const p of pyros) {
    if (!p.up) continue;
    const u = clamp((p.t - PYRO_DELAY) / PYRO_AFTER, 0, 1);
    btlColumn(p.x, p.y, p.r, u, p.seed, 1, 9, p.t);
    if (parts && u < 0.5 && Math.random() < 0.5)
      moPart({ x: p.x + (Math.random() - 0.5) * p.r, y: p.y - Math.random() * p.r * 2, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 120,
               drag: 1.4, flow: 22, fs: 34, life: 0.6 + Math.random() * 0.6, r: 1 + Math.random() * 1.6, layer: 'btlEmber' }, parts);
  }
}

/* =================================== C ==================================== */
/* The beetle, from the wing turn to touching down again: it beats its wings
   of fire, climbs at the camera (bigger, lifting up the screen) and its
   shadow drops away below it. alt 0 on the floor … 1 up; wings 0 … 1. */
function btlStrikeHull(B, me, alt, wings) {
  const s = 1 + alt * 0.9, lift = alt * 26;
  // the shadow, left on the floor
  ctx.save();
  ctx.globalAlpha = 0.45 * (1 - alt * 0.6);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(me.x + alt * 18, me.y + alt * 22, 18 * (1 - alt * 0.45), 11 * (1 - alt * 0.45), me.ang, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(me.x, me.y - lift); ctx.scale(s, s); ctx.translate(-me.x, -me.y);
  ctx.globalAlpha = 1 - clamp((alt - 0.7) / 0.3, 0, 1) * 0.5;
  const od = me.od || { open: 1, life: 1 };
  const was = me.od, beat = B.flap;
  me.od = Object.assign({}, od, { open: Math.max(od.open || 0, wings) });
  B.flap = 1 + wings * 2.5;                    // the wings drive harder to lift it
  btlDrawUnder(B, me); btlDrawHull(B, me);
  me.od = was; B.flap = beat;
  ctx.restore();
  // the downdraft: rings pressed out across the floor while it climbs
  if (wings > 0.05 && alt < 0.95) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < 3; j++) {
      const u = (B.t * 2.2 + j / 3) % 1;
      ctx.globalAlpha = (1 - u) * 0.35 * wings * (1 - alt);
      ctx.strokeStyle = BTL_KIT.cyan; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(me.x, me.y, 14 + u * 60, (14 + u * 60) * 0.7, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

/* The X aimed at (ax, ay) while EMBER is up, and the X marked once it is:
   two lanes as wide as the foot, each with a mandible's base at the end it
   starts from and its hook at the end it finishes, chevrons running the way
   it is traced, numbered 1 and 2. zoom is camZoom: line widths are divided by
   it so they read the same on screen. */
function btlStrikeMarks(st, strokes, zoom, t, R) {
  if (!strokes || !strokes.length) return;
  const locked = st && (st.ph === 'tell' || st.ph === 'fire' || st.ph === 'xdone' || st.ph === 'ring' || st.ph === 'walled' || st.ph === 'nuke');
  // a stroke already cut is the trench's now: past the X, all of them
  const cut = i => locked && (st.ph === 'fire' ? !!st.beam && st.beam.i > i : st.ph !== 'tell');
  const z = 1 / Math.max(0.05, zoom);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  strokes.forEach((s, i) => {
    if (cut(i)) return;
    const L = s.len || Math.hypot(s.x2 - s.x1, s.y2 - s.y1), ang = s.ang !== undefined ? s.ang : Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
    ctx.save();
    ctx.translate(s.x1, s.y1); ctx.rotate(ang);
    const a = locked ? 0.75 : 0.45 + 0.15 * Math.sin(t * 6);
    // the lane
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.25 * a; ctx.fillStyle = BTL_KIT.deep; ctx.fillRect(0, -R, L, R * 2);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a; ctx.strokeStyle = BTL_KIT.cyan; ctx.lineWidth = 1.5 * z;
    ctx.setLineDash(locked ? [] : [10 * z, 8 * z]); ctx.lineDashOffset = -t * 60 * z;
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(L, -R); ctx.moveTo(0, R); ctx.lineTo(L, R); ctx.stroke();
    ctx.setLineDash([]);
    // the mandible: its base where the stroke starts, its hook where it ends
    ctx.globalAlpha = a; ctx.fillStyle = rgba(BTL_KIT.violet, 0.5); ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 1.4 * z;
    ctx.beginPath();
    ctx.moveTo(-R * 0.4, -R * 1.25); ctx.quadraticCurveTo(R * 0.6, -R * 1.4, R * 0.8, -R);
    ctx.lineTo(R * 0.8, R); ctx.quadraticCurveTo(R * 0.6, R * 1.4, -R * 0.4, R * 1.25);
    ctx.quadraticCurveTo(-R * 0.9, 0, -R * 0.4, -R * 1.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L - R * 0.6, -R); ctx.quadraticCurveTo(L + R * 1.3, -R * 0.9, L + R * 0.9, R * 0.9);
    ctx.quadraticCurveTo(L + R * 0.5, -R * 0.1, L - R * 0.6, R * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    // chevrons, running the way it is cut
    ctx.lineWidth = 2 * z; ctx.strokeStyle = BTL_KIT.ice;
    const step = Math.max(R * 1.6, 40 * z), off = (t * 140 * z) % step;
    for (let d = R * 1.2 + off; d < L - R; d += step) {
      ctx.globalAlpha = a * (0.4 + 0.6 * Math.sin(Math.PI * d / L));
      ctx.beginPath(); ctx.moveTo(d - R * 0.35, -R * 0.45); ctx.lineTo(d, 0); ctx.lineTo(d - R * 0.35, R * 0.45); ctx.stroke();
    }
    ctx.restore();
    // the number, square to the screen
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = a; ctx.fillStyle = BTL_KIT.ice;
    ctx.font = `700 ${18 * z}px 'Chakra Petch', 'Segoe UI', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), s.x1 + Math.cos(ang + Math.PI) * R * 1.6, s.y1 + Math.sin(ang + Math.PI) * R * 1.6);
  });
  ctx.restore();
}

/* The foot of fire, seen from straight above: a disc of blue fire with a
   white core, and the sickle blade that cuts it, sweeping across the stroke
   as it drives, a smear behind it and rings pulsing out. */
function btlStrikeFoot(st, zoom, t) {
  const b = st && st.beam;
  if (!b || b.R < 0.5 || b.ph === 'gap') return;
  const R = b.R, k = b.k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // the smear, behind it along where it has come from
  if (b.ph === 'trace' || b.ph === 'off') {
    const back = b.ang + Math.PI;
    for (let j = 1; j <= 6; j++) {
      const d = R * 0.45 * j;
      drawGlow(b.x + Math.cos(back) * d, b.y + Math.sin(back) * d, R * (1.1 - j * 0.12), btlCool(0.75 - j * 0.08), 0.3 * k * (1 - j / 7));
    }
  }
  drawGlow(b.x, b.y, R * 2.2, BTL_KIT.deep, 0.45 * k);
  drawGlow(b.x, b.y, R * 1.3, BTL_KIT.blue, 0.5 * k);
  ctx.globalAlpha = 0.5 * k; ctx.fillStyle = BTL_KIT.sky;
  ctx.beginPath(); ctx.arc(b.x, b.y, R * 0.85, 0, TAU); ctx.fill();
  drawGlow(b.x, b.y, R * 0.55, BTL_KIT.white, 0.85 * k);
  // rings, pulsing out
  for (let j = 0; j < 3; j++) {
    const u = (t * 2.6 + j / 3) % 1;
    ctx.globalAlpha = (1 - u) * 0.5 * k; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 2 / Math.max(0.2, zoom);
    ctx.beginPath(); ctx.arc(b.x, b.y, R * (0.7 + u * 0.8), 0, TAU); ctx.stroke();
  }
  // the blade: a mandible, sweeping across the line as it cuts
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.ang + Math.sin(t * 14) * 0.35);
  ctx.globalAlpha = 0.9 * k;
  ctx.beginPath();
  ctx.moveTo(-R * 0.2, -R * 1.15);
  ctx.quadraticCurveTo(R * 1.3, -R * 0.9, R * 1.05, R * 0.25);      // the outer edge, round the front
  ctx.quadraticCurveTo(R * 0.85, -R * 0.35, -R * 0.1, -R * 0.62);    // the inner edge, back to the base
  ctx.closePath();
  const g = ctx.createLinearGradient(-R, -R, R, R);
  g.addColorStop(0, rgba(BTL_KIT.violet, 0.5)); g.addColorStop(0.6, rgba(BTL_KIT.cyan, 0.8)); g.addColorStop(1, rgba(BTL_KIT.white, 0.95));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(BTL_KIT.white, 0.9 * k); ctx.lineWidth = 2 / Math.max(0.2, zoom); ctx.stroke();
  ctx.restore();
  ctx.restore();
}

/* The cut up, and the cut back down: two shell halves sweeping shut across
   the screen, meeting in a seam that glows, then parting again on the other
   side. black is odStrikeBlack(): 0 open, 1 shut. */
function btlStrikeCut(black, W, H, t) {
  if (black <= 0.001) return;
  const e = black * black * (3 - 2 * black), half = W / 2 * e + 2;
  ctx.save();
  for (const sd of [-1, 1]) {
    const outer = sd < 0 ? -W * 0.1 : W * 1.1;
    const bulge = W * 0.06 * (1 - e);
    // the half: its leading edge bowed like the rim of a wing case
    ctx.beginPath();
    ctx.moveTo(outer, -10);
    ctx.lineTo(sd < 0 ? half : W - half, -10);
    ctx.quadraticCurveTo((sd < 0 ? half : W - half) - sd * bulge, H / 2, sd < 0 ? half : W - half, H + 10);
    ctx.lineTo(outer, H + 10);
    ctx.closePath();
    const x0 = sd < 0 ? 0 : W, x1 = sd < 0 ? half : W - half;
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#030209'); g.addColorStop(0.7, '#0c0a24'); g.addColorStop(0.92, '#231a5c'); g.addColorStop(1, '#4c1d95');
    ctx.fillStyle = g; ctx.fill();
    // its striae, catching a little light
    ctx.save(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(103,232,249,0.06)'; ctx.lineWidth = 1;
    for (let i = 1; i <= 7; i++) {
      const x = lerp(x0, x1, i / 8);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x - sd * bulge * 0.5, H / 2, x, H); ctx.stroke();
    }
    ctx.restore();
    // the rim, lit
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(207,250,254,' + (0.55 * black) + ')'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, -10); ctx.quadraticCurveTo(x1 - sd * bulge, H / 2, x1, H + 10); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  // shut: the seam down the middle, burning
  if (e > 0.9) {
    ctx.globalCompositeOperation = 'lighter';
    const s = (e - 0.9) / 0.1;
    const g = ctx.createLinearGradient(W / 2 - 14, 0, W / 2 + 14, 0);
    g.addColorStop(0, 'rgba(34,211,238,0)'); g.addColorStop(0.5, 'rgba(240,253,255,' + 0.9 * s + ')'); g.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = g; ctx.fillRect(W / 2 - 14, 0, 28, H);
  }
  ctx.restore();
}

/* ================================ COMBO 1 ================================= */
function btlBrandWall(g) {
  if (!g) return;
  const t = g.t, rise = t < 0.35 ? btlEaseOut(t / 0.35) * 1.25 : t < 0.7 ? lerp(1.25, 1, (t - 0.35) / 0.35) : 1;
  const sink = clamp((g.life - t) / 0.6, 0, 1), h = g.r * 0.32 * rise * sink * (0.92 + 0.08 * Math.sin(t * 2.3));
  if (h <= 0.5) return;
  const z = g.r / 160;                                       // its detail grows with it
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  /* the curtain: the trench ring stacked upward in fine steps, so it reads
     as one sheet of fire rising off the floor and thinning as it climbs */
  for (let j = 0; j < 18; j++) {
    const u = j / 17;
    ctx.globalAlpha = 0.07 * (1 - u * 0.85) * sink; ctx.strokeStyle = btlCool(1 - u * 0.7); ctx.lineWidth = (4 - u * 2) * z;
    ctx.beginPath(); ctx.ellipse(g.x, g.y - h * u, g.r, g.r, 0, 0, TAU); ctx.stroke();
  }
  // its foot, where it comes out of the trench, burning hottest
  ctx.globalAlpha = 0.35 * sink; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 2.2 * z;
  ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r, 0, 0, TAU); ctx.stroke();
  // tongues licking off the lip, and thorns of chitin standing out of the trench
  const N = 64;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU, x = g.x + Math.cos(a) * g.r, y = g.y + Math.sin(a) * g.r;
    const ph = (t * 1.3 + btlHash(g.seed, i)) % 1, len = h * (0.22 + 0.4 * Math.sin(ph * Math.PI)), bend = Math.sin(t * 3 + i) * 2 * z;
    const lip = y - h * (0.82 + 0.1 * Math.sin(t * 2 + i * 0.7));
    ctx.globalAlpha = 0.14 * sink; ctx.fillStyle = BTL_KIT.blue; btlLeaf(x, lip, -Math.PI / 2, len, 3.2 * z, bend); ctx.fill();
    ctx.globalAlpha = 0.18 * sink; ctx.fillStyle = BTL_KIT.cyan; btlLeaf(x, lip, -Math.PI / 2, len * 0.45, 1.4 * z, bend * 0.5); ctx.fill();
    if (i % 4 === 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.85 * sink; ctx.fillStyle = '#0c0a24'; ctx.strokeStyle = BTL_KIT.cyan; ctx.lineWidth = 1 * z;
      const th = h * 0.6, lean = Math.cos(a) * 5 * z, bw = 4 * z;
      ctx.beginPath();
      ctx.moveTo(x - bw, y); ctx.quadraticCurveTo(x - bw * 0.6 + lean, y - th * 0.6, x + lean * 1.6, y - th);
      ctx.quadraticCurveTo(x + bw * 0.4 + lean, y - th * 0.45, x + bw, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
    }
  }
  // the time it has left: a pale arc at its foot, burning away
  const left = clamp(1 - t / g.life, 0, 1);
  ctx.globalAlpha = 0.55 * sink; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 2 * z;
  ctx.beginPath(); ctx.arc(g.x, g.y, g.r + 10 * z, -Math.PI / 2, -Math.PI / 2 + left * TAU); ctx.stroke();
  ctx.restore();
}
function btlBrandNukeMark(st, t) {
  const n = st && st.nuke;
  if (!n) return;
  ctx.save();
  if (!n.up) {
    const k = clamp(n.t / PYRO_DELAY, 0, 1), e = btlEaseOut(k), heat = clamp(0.5 + (n.heat || 0) / 200, 0.5, 1);
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, rgba(BTL_KIT.deep, 0.3 + 0.45 * k)); g.addColorStop(0.8, rgba('#0b0a24', 0.35 + 0.2 * k)); g.addColorStop(1, rgba(BTL_KIT.glass, 0.2));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    btlCracks(n.x, n.y, n.r, e, n.seed, btlCool(0.3 + 0.65 * k), (0.4 + 0.5 * k) * heat, 16);
    // rings closing in
    for (let j = 0; j < 3; j++) {
      const u = 1 - ((k * 2.5 + j / 3) % 1);
      ctx.globalAlpha = 0.35 * (1 - u) * heat; ctx.strokeStyle = BTL_KIT.cyan; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * u, 0, TAU); ctx.stroke();
    }
    // the countdown round it
    ctx.globalAlpha = 0.9; ctx.strokeStyle = BTL_KIT.ice; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, -Math.PI / 2 + k * TAU, Math.PI * 1.5); ctx.stroke();
    // a swarm spiralling in across all of it
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 24; i++) {
      const a = n.seed + (i / 24) * TAU + n.t * (1.5 + 6 * k * k), rr = n.r * (0.95 - 0.8 * Math.pow(k, 2.2) * (0.5 + 0.5 * btlHash(i, 51)));
      btlFireBeetle(n.x + Math.cos(a) * rr, n.y + Math.sin(a) * rr, a + Math.PI / 2, 1.3 * Math.max(1, n.r / 160), i % 3 ? BTL_KIT.cyan : BTL_KIT.orchid, Math.min(1, n.t * 4), n.t, i);
    }
  } else {
    const u = clamp((n.t - PYRO_DELAY) / PYRO_AFTER, 0, 1);
    ctx.globalAlpha = 0.85; ctx.fillStyle = BTL_KIT.glass; btlBlot(n.x, n.y, n.r * 0.95, n.seed); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    btlCracks(n.x, n.y, n.r * 0.95, 1, n.seed, btlCool(0.9 - u * 0.8), 0.6 * (1 - u), 16);
  }
  ctx.restore();
}
function btlBrandNuke(st, t, parts) {
  const n = st && st.nuke;
  if (!n || !n.up) return;
  // its brightness follows the heat it was paid with, as the stock column's does
  const u = clamp((n.t - PYRO_DELAY) / PYRO_AFTER, 0, 1), bright = clamp((n.heat || 60) / 100, 0.5, 1);
  if (u < 0.15) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(n.x, n.y, n.r * 2.4, BTL_KIT.white, (1 - u / 0.15) * 0.9 * bright); ctx.restore(); }
  btlColumn(n.x, n.y, n.r, u, n.seed, bright, 22, n.t, n.r * 1.8);
  if (parts && u < 0.6)
    for (let i = 0; i < 3; i++)
      moPart({ x: n.x + (Math.random() - 0.5) * n.r * 1.4, y: n.y - Math.random() * n.r * 2.4, vx: (Math.random() - 0.5) * 140, vy: -80 - Math.random() * 160,
               drag: 1.2, flow: 30, fs: 50, life: 0.7 + Math.random() * 0.7, r: 1.2 + Math.random() * 2, layer: 'btlEmber' }, parts);
}
function btlKitScreen(a, b, W, H) {
  if (a <= 0 && b <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (a > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(224,247,255,' + 0.14 * a * a + ')'); g.addColorStop(1, 'rgba(56,189,248,' + 0.28 * a * a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (b > 0) { ctx.fillStyle = 'rgba(76,29,149,' + 0.1 * b * b + ')'; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
