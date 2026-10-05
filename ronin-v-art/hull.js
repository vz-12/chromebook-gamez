/* ================ V: LAST VOW — RONIN's own art, with the vow's lines (hull.js) ================
   Replaces three of RONIN's own functions in index.html, where they stand (lift.mjs puts this
   block where drawRoninUnder was):
     drawRoninUnder(w)   index.html's own, with the vow's lines added (each marked V)
     drawRoninHull()     index.html's own, with the vow's lines added (each marked V)
     vraKatana(L, heat, a, v)   redrawn whole (4 Oct); the same call, plus v
   Through the vow (vkwK() eases it in on the cut) his gold goes to red: the floor under him
   cracks red and the brush-ring breaks and turns faster; the cloak's hem is alight and red runs
   through the cloth; the tails redden toward their ends and burn there; the shoulder plates
   crack; the blade is red-hot at rest; the kasa darkens, the crack the fight put in it burns, and
   its rim is the vow's clock (RONIN's own minute is held); his eyes are red. Outside the vow
   every V line is a no-op (vw is 0), so RONIN draws as before, the katana aside.
   Needs model.js (vkwK, vkwFloor, vkwCloak, vkwKasaCrack) and the placeholders' RKV_RED.
=============================================================================================== */
function drawRoninUnder(w) {
  const dt = vraTick(), t = uiTime, s = vraRoninS(), vw = vkwK();    // V: vw, how far the vow's look is in
  const C = vraCloth(dt);
  ctx.save();
  // the floor: an ink ring with a gold brush circle, turning (V: through the vow, red, broken, faster)
  ctx.fillStyle = rgba(VRA_INK, (0.35 + 0.25 * vw) * w);                                  // V
  ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 30 + 6 * vw, 0, TAU); ctx.fill();               // V
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x, P.y, 60, VRA_GOLD, 0.14 * w * (1 - vw));                                   // V
  vraBrushArc(P.x, P.y, P.r + 28, t * 0.4, (TAU - 0.7) * w, 3, VRA_GOLD, 0.35 * w * (1 - vw));   // V
  if (vw > 0) vkwFloor(w * vw);                                                            // V
  ctx.globalCompositeOperation = 'source-over';
  // the flood: ink out from under the hull, cracks of gold across it
  if (s < VRT.own + 0.3) {
    const q = clamp(s / VRT.own, 0, 1), f = 1 - clamp((s - VRT.own) / 0.3, 0, 1);
    ctx.fillStyle = rgba(VRA_INK, 0.92 * f);
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const an = i / 24 * TAU, r = (8 + 34 * vraOut(q)) * (0.8 + 0.3 * vraH(i + Math.floor(t * 12) * 0.01));
      const x = P.x + Math.cos(an) * r, y = P.y + Math.sin(an) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    if (vraH(Math.floor(t * 60)) > 0.4) vraInk(P.x, P.y, 1, 90, 7, 0.6);
  }
  // the cloak and its tails
  const cloakK = vraOut((s - VRT.cloak) / VRT.cloakLen);
  if (cloakK > 0 && C) {
    const A = C.ch[0], B = C.ch[1];
    const nA = Math.max(2, Math.round(A.length * cloakK)), nB = Math.max(2, Math.round(B.length * cloakK));
    ctx.save();
    ctx.globalAlpha = P.ghost > 0 && P.dashT > 0 ? 0.5 : 1;
    ctx.beginPath();
    ctx.moveTo(A[0].x, A[0].y);
    for (let i = 1; i < nA; i++) ctx.lineTo(A[i].x, A[i].y);
    const ea = A[nA - 1], eb = B[nB - 1];
    ctx.quadraticCurveTo((ea.x + eb.x) / 2 - Math.cos(P.ang) * 4, (ea.y + eb.y) / 2 - Math.sin(P.ang) * 4, eb.x, eb.y);
    for (let i = nB - 2; i >= 0; i--) ctx.lineTo(B[i].x, B[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(P.x, P.y, (ea.x + eb.x) / 2, (ea.y + eb.y) / 2);
    g.addColorStop(0, vw > 0 ? vriMix('#111827', '#1f0b0e', vw) : '#111827'); g.addColorStop(1, '#05060a');   // V
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = rgba(VRA_GOLD, 0.75 * (1 - vw)); ctx.lineWidth = 1.1; ctx.stroke();  // V
    if (vw > 0) vkwCloak(A, B, nA, nB, ea, eb, vw);                                      // V
    // the crest on the back: a ring and a cut
    const cx = lerp(P.x, (ea.x + eb.x) / 2, 0.55), cy = lerp(P.y, (ea.y + eb.y) / 2, 0.55);
    ctx.globalCompositeOperation = 'lighter';
    vraBrushArc(cx, cy, 4.2, P.ang + 0.6, TAU - 1.1, 1.4, VRA_GOLD, 0.8 * cloakK * (1 - vw));        // V
    if (vw > 0) vraBrushArc(cx, cy, 4.2, P.ang + 0.6, TAU - 1.1, 1.6, RKV_RED, 0.9 * cloakK * vw);  // V
    ctx.restore();
    for (const T of [C.ch[2], C.ch[3]]) {
      const nT = Math.max(2, Math.round(T.length * cloakK));
      ctx.lineCap = 'round';
      for (let i = 1; i < nT; i++) {
        const u = i / T.length, a = 0.95 * (1 - u * 0.35);                                  // V
        ctx.strokeStyle = i > nT - 3 ? vriMix(VRA_GOLD, '#ef4444', vw, a) : vriMix(VRA_IVORY, '#fca5a5', vw * u * 1.3, a);   // V
        ctx.lineWidth = 2.8 * (1 - u) + 0.8;
        ctx.beginPath(); ctx.moveTo(T[i - 1].x, T[i - 1].y); ctx.lineTo(T[i].x, T[i].y); ctx.stroke();
      }
    }
  }
  ctx.restore();
  // what it gives off: embers off the rim, ink off the tails (V: red embers; the tails burn at their ends)
  VRA.emitAcc += dt * (vw > 0 ? 40 : P.roninT < 10 ? 34 : 22);                             // V
  while (VRA.emitAcc > 1) {
    VRA.emitAcc -= 1;
    if (s < VRT.own) break;
    const an = rnd(TAU);
    vraPart({ k: 'ember', x: P.x + Math.cos(an) * 16, y: P.y + Math.sin(an) * 16,
              vx: -Math.cos(P.ang) * 30 + rnd(15, -15), vy: -Math.sin(P.ang) * 30 - 25,
              r: rnd(1.4, 0.6), col: vw > 0.5 ? '#ef4444' : VRA_GOLD, a: 0.9, life: rnd(1, 0.5), drag: 0.4, g: -20 });   // V
    if (C && rnd() < 0.35) {
      const T = C.ch[2 + (rnd() < 0.5 ? 0 : 1)], e = T[T.length - 1];
      if (vw > 0.5) vraPart({ k: 'ember', x: e.x, y: e.y, vx: rnd(20, -20), vy: rnd(20, -20) - 15, r: rnd(1.2, 0.5), col: '#f97316', a: 0.9, life: rnd(0.6, 0.3), drag: 0.4, g: -25 });   // V
      else vraInk(e.x, e.y, 1, 20, 3.5, 0.7);                                               // V
    }
  }
}

/* the hull, while RONIN owns it. Called from drawPlayer in place of the stock hull */
function drawRoninHull() {
  const s = vraRoninS(), t = uiTime, vw = vkwK(), q = vowPhase();     // V
  const hatK = vraOut((s - VRT.hat) / VRT.hatLen);
  const drawK = vraOut((s - VRT.draw) / VRT.drawLen);
  const phasing = P.ghost > 0 && P.dashT > 0, hurt = P.hurtFlash > 0;
  const R = 16;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.globalAlpha = phasing ? 0.55 : 1;
  ctx.rotate(P.ang);
  // shoulder plates, under the brim
  for (const sd of [-1, 1]) {
    ctx.save(); ctx.scale(1, sd);
    ctx.beginPath();
    ctx.moveTo(-6, 11); ctx.lineTo(5, 11.5); ctx.lineTo(4, 18.5); ctx.lineTo(-7, 17); ctx.closePath();
    ctx.fillStyle = vraMetal(0, 11, 0, 18, ['#1f2937', '#0b0d14']); ctx.fill();
    ctx.strokeStyle = vriMix(VRA_GOLD, RKV_RED, vw, 0.8 * hatK); ctx.lineWidth = 1; ctx.stroke();   // V
    ctx.strokeStyle = vriMix(VRA_GOLD, RKV_RED, vw, 0.35 * hatK); ctx.lineWidth = 0.7;              // V
    ctx.beginPath(); ctx.moveTo(-6.5, 14); ctx.lineTo(4.5, 14.8); ctx.stroke();
    if (vw > 0) {                                 // V: red through a crack in the plate
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ef4444', 0.7 * vw * hatK); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-4.5, 11.6); ctx.lineTo(-2, 13.6); ctx.lineTo(-3, 15.2); ctx.lineTo(0, 17.4); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  // the katana at rest: low along the aim; across the front on a parry
  if (!(P.swingT > 0) && drawK > 0) {
    const parry = P.parryT > 0;
    const pose = parry ? { x: 12, y: 0, a: -Math.PI / 2 + 0.25, L: 30 }
               : P.dashT > 0 ? { x: 4, y: 3, a: 0, L: 34 }
               : { x: 2, y: 8, a: 0.22 + Math.sin(t * 1.6) * 0.03, L: 32 };
    ctx.save(); ctx.translate(pose.x, pose.y); ctx.rotate(pose.a);
    vraKatana(pose.L * drawK, parry || vw > 0 ? 1 : 0.3, drawK, vw);                               // V
    ctx.restore();
  }
  ctx.rotate(-P.ang);
  // the kasa, opening like an umbrella, rib by rib
  const open = TAU * hatK, a0 = P.ang + Math.PI;
  if (hatK > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(-1.5, 2.5, R * hatK + 1, 0, TAU); ctx.fill();
    const lx = Math.cos(P.ang - 0.8) * 4, ly = Math.sin(P.ang - 0.8) * 4;
    const g = ctx.createRadialGradient(lx, ly, 0, 0, 0, R);
    g.addColorStop(0, hurt ? '#7f1d1d' : vriMix('#3a2f1c', '#3d1a12', vw)); g.addColorStop(0.5, hurt ? '#450a0a' : vriMix('#1a140a', '#1c0b08', vw));   // V
    g.addColorStop(1, '#07080c');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, a0 - open / 2, a0 + open / 2); ctx.closePath(); ctx.fill();
    // ribs and weave
    const nr = 18;
    for (let i = 0; i < nr; i++) {
      const an = a0 - Math.PI + (i + 0.5) / nr * TAU;
      const rel = ((an - a0 + Math.PI * 3) % TAU) - Math.PI;
      if (Math.abs(rel) > open / 2) continue;
      ctx.strokeStyle = vriMix(VRA_GOLD, '#f87171', vw, 0.2); ctx.lineWidth = 0.7;               // V
      ctx.beginPath(); ctx.moveTo(Math.cos(an) * 2, Math.sin(an) * 2);
      ctx.lineTo(Math.cos(an) * (R - 0.6), Math.sin(an) * (R - 0.6)); ctx.stroke();
    }
    ctx.strokeStyle = vriMix('#fde68a', '#f87171', vw, 0.1); ctx.lineWidth = 0.6;                  // V
    for (const rr of [R * 0.42, R * 0.7]) {
      ctx.beginPath(); ctx.arc(0, 0, rr, a0 - open / 2, a0 + open / 2); ctx.stroke();
    }
    // the rim is the clock: gold for what is left, ash for what is spent (V: through the vow, the vow's own, red; RONIN's minute is held)
    const vo = vw > 0 && q && q.cut;                                                               // V
    const k = vo ? clamp(q.left / VOW_LEN, 0, 1) : clamp(P.roninT / RONIN_LEN, 0, 1);              // V
    const low = vo ? q.left < 5 : P.roninT < 10;                                                   // V
    const fl = low ? (vo ? 0.45 + 0.55 * Math.abs(Math.sin(t * 12)) : 0.55 + 0.45 * Math.abs(Math.sin(t * 6))) : 1;   // V
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, R, a0 - open / 2, a0 + open / 2); ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const left = open * k;
    ctx.strokeStyle = rgba(hurt ? VRA_RED : vo ? RKV_RED : VRA_GOLD, fl); ctx.lineWidth = vo ? 2.4 : 2;   // V
    ctx.beginPath(); ctx.arc(0, 0, R, P.ang - left / 2, P.ang + left / 2); ctx.stroke();
    if (vw > 0) vkwKasaCrack(R, vw, low);                                                          // V
    // the chain, on the front of the brim
    const ch = clamp((P.chain || 0) / CHAIN_MAX, 0, 1), n = CHAIN_MAX;
    for (let i = 0; i < n; i++) {
      const an = P.ang + (i - (n - 1) / 2) * 0.16;
      const lit = i < (P.chain || 0);
      ctx.fillStyle = lit ? (vw > 0.5 ? (ch >= 1 ? '#fee2e2' : '#ef4444') : rgba(ch >= 1 ? '#fef9c3' : VRA_GOLD, 1)) : 'rgba(148,163,184,0.25)';   // V
      ctx.beginPath(); ctx.arc(Math.cos(an) * (R + 3.4), Math.sin(an) * (R + 3.4), lit ? 1.3 : 0.9, 0, TAU); ctx.fill();
    }
    // eyes, glinting under the front of the brim
    const ex = Math.cos(P.ang) * (R - 3), ey = Math.sin(P.ang) * (R - 3);
    const px = -Math.sin(P.ang) * 3.4, py = Math.cos(P.ang) * 3.4;
    drawGlow(ex, ey, 9, VRA_GOLD, 0.4 * hatK * (1 - vw));                                           // V
    if (vw > 0) drawGlow(ex, ey, 11, RKV_RED, 0.6 * hatK * vw);                                    // V: his eyes, red
    ctx.fillStyle = rgba(vw > 0.5 ? '#fecaca' : '#ffffff', hatK);                                  // V
    for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + px * sd, ey + py * sd, 0.9, 0, TAU); ctx.fill(); }
    drawGlow(Math.cos(P.ang) * 2, Math.sin(P.ang) * 2, 7, vw > 0.5 ? RKV_RED : VRA_GOLD, 0.5);     // V
    ctx.restore();
    ctx.fillStyle = vraMetal(-2, -2, 2, 2, vw > 0.5 ? ['#fee2e2', '#b91c1c'] : ['#fffbeb', '#b45309']);   // V
    ctx.beginPath(); ctx.arc(Math.cos(P.ang) * 1.5, Math.sin(P.ang) * 1.5, 1.8, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* ----------------------------- the katana (redrawn whole, 4 Oct) -----------------------------
   Replaces the game's vraKatana: the same call, plus v. Along +x from the
   tsuba, the hilt behind it and the blade ahead to its tip at (L, -0.07 L) as
   before, so the ink and blood C draws along it still lie on it. The blade
   curves toward its back (mune, the -y side); the edge (ha) is the +y side.
   From the pommel: the kashira (iron, a gold edge); the wrap, black silk over
   ivory ray skin in five windows, a gold menuki under it either side; the
   fuchi (gold); the tsuba (iron, a gold rim, a crescent moon cut through it);
   the habaki (gold, filed); then the blade: a groove (bo-hi) down its back,
   the ridge (shinogi) with darker steel above it, the temper line (hamon) in
   irregular waves, the yokote, and the tip (kissaki) with its own temper line.
   heat: 0.3 at rest, 1 on a parry or a finisher (the edge, and a glow round it).
   v (V): how far the vow's look is in, vkwK() unless it is passed. Red shows
   through the wrap's windows, the moon in the tsuba bleeds as the cut-in's
   does, the steel darkens and the hamon burns, light runs down the groove,
   and embers come off the edge.
   Small on the screen (under 1.8 px a unit: 1× in the room, and the swing)
   only the shape is drawn: the outline, the dark back, the pale hamon, the
   bright edge. The fine work comes in from there.
---------------------------------------------------------------------------------------------- */
const VRK = { kashira: -10.2, grip0: -9.4, grip1: -1.55, tsuba0: -0.85, tsuba1: 0.55, habaki1: 2.6, w0: 2.6, w1: 1.9, hw: 1.6 };
// screen px to a unit, here
function vrkScale() {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) / (DPR || 1);
}
/* the blade for a length L: s runs from under the habaki (0) to the tip (1) */
function vrkBlade(L) {
  const x0 = VRK.habaki1 - 0.4, yt = -L * 0.07, span = L - x0;
  if (span < 1) return null;
  const sy = clamp(1 - clamp(L * 0.11, 2.6, 7.5) / span, 0.5, 0.94);   // the yokote
  const B = { x0, xt: L, yt, span, sy };
  B.X = s => x0 + span * s;
  B.back = s => -VRK.w0 / 2 + (yt + VRK.w0 / 2) * (0.35 * s + 0.65 * s * s);
  B.wide = s => lerp(VRK.w0, VRK.w1, Math.min(1, s / sy));
  B.edge = s => B.back(s) + B.wide(s);
  B.ridge = s => B.back(s) + 0.3 * B.wide(s);
  // the kissaki's edge (fukura): on from the yokote along the edge's own line, bowing round to the tip
  const ex = B.X(sy), ey = B.edge(sy);
  const dy = ((yt + VRK.w0 / 2) * (0.35 + 1.3 * sy) + (VRK.w1 - VRK.w0) / sy) / span, dl = Math.hypot(1, dy);
  const reach = Math.hypot(L - ex, yt - ey) * 0.62;
  B.E = { x: ex, y: ey }; B.C = { x: ex + reach / dl, y: ey + dy * reach / dl }; B.T = { x: L, y: yt };
  return B;
}
const vrkQ = (B, u) => { const k = 1 - u; return { x: k * k * B.E.x + 2 * k * u * B.C.x + u * u * B.T.x, y: k * k * B.E.y + 2 * k * u * B.C.y + u * u * B.T.y }; };
const vrkQd = (B, u) => ({ x: 2 * (1 - u) * (B.C.x - B.E.x) + 2 * u * (B.T.x - B.C.x), y: 2 * (1 - u) * (B.C.y - B.E.y) + 2 * u * (B.T.y - B.C.y) });
function vrkPoly(pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
}
// the outline: up the back to the tip, round the fukura, down the edge
function vrkOutline(B, n) {
  ctx.beginPath(); ctx.moveTo(B.X(0), B.back(0));
  for (let i = 1; i <= n; i++) ctx.lineTo(B.X(i / n), B.back(i / n));
  ctx.quadraticCurveTo(B.C.x, B.C.y, B.E.x, B.E.y);
  for (let i = n; i >= 0; i--) { const s = B.sy * i / n; ctx.lineTo(B.X(s), B.edge(s)); }
  ctx.closePath();
}
// the steel above the ridge, out to the tip along the ko-shinogi
function vrkUpper(B, n) {
  ctx.beginPath(); ctx.moveTo(B.X(0), B.back(0));
  for (let i = 1; i <= n; i++) ctx.lineTo(B.X(i / n), B.back(i / n));
  for (let i = n; i >= 0; i--) { const s = B.sy * i / n; ctx.lineTo(B.X(s), B.ridge(s)); }
  ctx.closePath();
}
// the temper line: low by the habaki, then in irregular waves, then round the kissaki short of the tip
function vrkHamon(B, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const s = B.sy * i / n, d = B.X(s) - B.x0, w = B.wide(s);
    const wave = 0.55 * Math.sin(d * 2.6) + 0.3 * Math.sin(d * 1.15 + 1.3) + 0.15 * Math.sin(d * 5.3 + 0.4);
    pts.push([B.X(s), B.edge(s) - w * (0.15 + clamp((d - 0.4) / 1.6, 0, 1) * (0.13 + 0.09 * wave))]);
  }
  for (let i = 1; i <= 8; i++) {
    const u = i / 10, p = vrkQ(B, u), d = vrkQd(B, u), l = Math.hypot(d.x, d.y) || 1, inset = VRK.w1 * (0.28 - 0.13 * u);
    pts.push([p.x + d.y / l * inset, p.y - d.x / l * inset]);
  }
  return pts;
}
// the hamon's zone: from its line out to the edge
function vrkHamonZone(B, pts, n) {
  vrkPoly(pts);
  for (let i = 8; i >= 0; i--) { const p = vrkQ(B, i / 10); ctx.lineTo(p.x, p.y); }
  for (let i = n; i >= 0; i--) { const s = B.sy * i / n; ctx.lineTo(B.X(s), B.edge(s)); }
  ctx.closePath();
}
// the groove down the back, from under the habaki to short of the yokote, its end rounded
function vrkHi(B, n) {
  const b = B.sy - Math.min(0.14, 1.5 / B.span);
  const up = s => B.back(s) + 0.075 * B.wide(s), lo = s => B.back(s) + 0.225 * B.wide(s);
  ctx.beginPath(); ctx.moveTo(B.X(0), up(0));
  for (let i = 1; i <= n; i++) { const s = b * i / n; ctx.lineTo(B.X(s), up(s)); }
  ctx.quadraticCurveTo(B.X(b) + (lo(b) - up(b)) * 1.1, (up(b) + lo(b)) / 2, B.X(b), lo(b));
  for (let i = n; i >= 0; i--) { const s = b * i / n; ctx.lineTo(B.X(s), lo(s)); }
  ctx.closePath();
  return { b, mid: s => (up(s) + lo(s)) / 2 };
}
/* the hilt: the kashira, the wrap and its windows (V: red through them), the menuki, the fuchi */
function vrkHilt(v, fine, finer) {
  const g0 = VRK.grip0, g1 = VRK.grip1, k0 = VRK.kashira, hw = VRK.hw, t = uiTime;
  const grip = () => {
    ctx.beginPath();
    ctx.moveTo(g0, -hw); ctx.quadraticCurveTo((g0 + g1) / 2, -hw + 0.22, g1, -hw - 0.04);
    ctx.lineTo(g1, hw + 0.04); ctx.quadraticCurveTo((g0 + g1) / 2, hw - 0.22, g0, hw);
    ctx.closePath();
  };
  ctx.beginPath();                                // the kashira, iron, its end rounded
  ctx.moveTo(g0 + 0.1, -hw - 0.03); ctx.lineTo(k0 + 0.5, -hw + 0.06);
  ctx.quadraticCurveTo(k0 - 0.12, -hw * 0.85, k0 - 0.12, 0);
  ctx.quadraticCurveTo(k0 - 0.12, hw * 0.85, k0 + 0.5, hw - 0.06);
  ctx.lineTo(g0 + 0.1, hw + 0.03); ctx.closePath();
  ctx.fillStyle = vraMetal(0, -hw, 0, hw, ['#5b554c', '#1d1b18', '#070707']); ctx.fill();
  ctx.strokeStyle = rgba(VRA_GOLD, fine ? 0.75 : 0.5); ctx.lineWidth = fine ? 0.14 : 0.3; ctx.stroke();
  grip();                                         // the silk
  ctx.fillStyle = '#0c0e15'; ctx.fill();
  if (!fine) {                                    // small: its crossings as gold flecks, as before
    ctx.strokeStyle = rgba(VRA_GOLD, 0.5); ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = g0 + 0.4; x < g1 - 0.6; x += 1.6) { ctx.moveTo(x, -1.4); ctx.lineTo(x + 0.8, 1.4); ctx.moveTo(x + 0.8, -1.4); ctx.lineTo(x, 1.4); }
    ctx.stroke();
  } else {
    const n = 5, p = (g1 - g0) / n, hx = p * 0.34, hy = hw * 0.62;
    ctx.save();
    grip(); ctx.clip();
    for (let i = 0; i < n; i++) {
      const cx = g0 + (i + 0.5) * p;
      const win = () => { ctx.beginPath(); ctx.moveTo(cx - hx, 0); ctx.lineTo(cx, -hy); ctx.lineTo(cx + hx, 0); ctx.lineTo(cx, hy); ctx.closePath(); };
      win(); ctx.fillStyle = vriMix('#e9e1cc', '#f2b8ae', v); ctx.fill();   // the ray skin through the silk (V: warmed)
      if (finer) {                                // its nodules
        ctx.fillStyle = 'rgba(126,108,82,0.45)';
        for (let j = 0; j < 7; j++) {
          const qx = (vraH(i * 13 + j) - 0.5) * hx * 1.2, qy = (vraH(i * 17 + j + 5) - 0.5) * hy * 1.2;
          if (Math.abs(qx) / hx + Math.abs(qy) / hy > 0.8) continue;
          ctx.beginPath(); ctx.arc(cx + qx, qy, 0.07, 0, TAU); ctx.fill();
        }
      }
      if (v > 0) {                                // V: the vow, red through the binding
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        win(); ctx.fillStyle = rgba('#ef4444', 0.55 * v * (0.75 + 0.25 * Math.sin(t * 5 + i * 1.3))); ctx.fill();
        ctx.restore();
      }
      win(); ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.1; ctx.stroke();
      if (i) {                                    // where the silk crosses itself, twisted
        const xx = g0 + i * p;
        ctx.strokeStyle = 'rgba(100,116,139,0.55)'; ctx.lineWidth = 0.12;
        ctx.beginPath();
        ctx.moveTo(xx - p * 0.2, -hy); ctx.lineTo(xx + p * 0.2, hy);
        ctx.moveTo(xx - p * 0.2, hy); ctx.lineTo(xx + p * 0.04, hy * 0.15);
        ctx.stroke();
      }
    }
    for (const [mx, sd] of [[g0 + 2.5 * p, 1], [g0 + 2.1 * p, -1]]) {   // the menuki, under the silk either side
      ctx.fillStyle = vraMetal(mx - 0.6, 0, mx + 0.6, 0, ['#fff3c4', '#d29a3a', '#7a4610']);
      ctx.beginPath(); ctx.ellipse(mx, sd * hw * 0.84, p * 0.36, 0.26, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#0c0e15'; ctx.lineWidth = 0.16;
      ctx.beginPath(); ctx.moveTo(mx - 0.25, sd * hw * 1.1); ctx.lineTo(mx + 0.15, sd * hw * 0.55); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(148,163,184,0.22)'; ctx.lineWidth = 0.1;   // the silk's sheen along its edge
    ctx.beginPath(); ctx.moveTo(g0, -hw + 0.15); ctx.quadraticCurveTo((g0 + g1) / 2, -hw + 0.37, g1, -hw + 0.11); ctx.stroke();
    ctx.restore();
  }
  const f1 = VRK.tsuba0 - 0.22;                   // the fuchi
  ctx.fillStyle = vraMetal(0, -hw - 0.12, 0, hw + 0.12, ['#fff3c4', '#d08a2e', '#6e3a0c']);
  ctx.fillRect(g1, -hw - 0.12, f1 - g1, 2 * hw + 0.24);
  if (fine) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(g1, -hw - 0.12, 0.08, 2 * hw + 0.24); }
}
/* the tsuba: iron, a gold rim, a crescent moon cut through it (V: the moon bleeds, as the cut-in's does) */
function vrkTsuba(v, fine) {
  const t0 = VRK.tsuba0, t1 = VRK.tsuba1, cx = (t0 + t1) / 2, rx = (t1 - t0) / 2 + 0.3, ry = 3.9;
  ctx.save();
  ctx.fillStyle = rgba(VRA_GOLD, 0.85);           // the seppa, either side of it
  ctx.fillRect(t0 - 0.22, -2.3, 0.2, 4.6); ctx.fillRect(t1 + 0.02, -2.3, 0.2, 4.6);
  const iron = ctx.createLinearGradient(cx - rx, -ry, cx + rx, ry);
  iron.addColorStop(0, '#4d463d'); iron.addColorStop(0.5, '#1e1b17'); iron.addColorStop(1, '#090808');
  ctx.beginPath(); ctx.ellipse(cx, 0, rx, ry, 0, 0, TAU);
  ctx.fillStyle = iron; ctx.fill();
  ctx.strokeStyle = vriMix(VRA_GOLD, '#f87171', v * 0.85, 0.95); ctx.lineWidth = fine ? 0.26 : 0.5; ctx.stroke();
  if (fine) {
    const mx = cx - 0.05, my = -1.55;             // the moon: a disc, and the iron over it but for a crescent
    ctx.beginPath(); ctx.ellipse(mx, my, rx * 0.5, 1.15, 0, 0, TAU);
    ctx.fillStyle = vriMix('#030304', '#b91c1c', v); ctx.fill();
    ctx.beginPath(); ctx.ellipse(mx + rx * 0.2, my - 0.32, rx * 0.46, 1.02, 0, 0, TAU);
    ctx.fillStyle = iron; ctx.fill();
    ctx.strokeStyle = 'rgba(255,247,214,0.3)'; ctx.lineWidth = 0.1;   // the light along its rim
    ctx.beginPath(); ctx.ellipse(cx, 0, rx - 0.1, ry - 0.1, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    if (v > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(mx - 0.1, my + 0.35, 1.6, '#ef4444', 0.65 * v); }
  }
  ctx.restore();
}
/* the habaki: gold, filed in fine diagonals, its front edge slanting */
function vrkHabaki(fine) {
  const x0 = VRK.tsuba1 + 0.2, x1 = VRK.habaki1;
  const shape = () => { ctx.beginPath(); ctx.moveTo(x0, -1.5); ctx.lineTo(x1 - 0.3, -1.42); ctx.lineTo(x1 + 0.12, 1.46); ctx.lineTo(x0, 1.56); ctx.closePath(); };
  shape();
  ctx.fillStyle = vraMetal(0, -1.5, 0, 1.56, ['#fff7d6', '#e3a64e', '#a35f17', '#5c300a']); ctx.fill();
  if (!fine) return;
  ctx.save();
  shape(); ctx.clip();
  ctx.strokeStyle = 'rgba(92,48,10,0.4)'; ctx.lineWidth = 0.07;
  ctx.beginPath();
  for (let x = x0 - 2.4; x < x1 + 0.6; x += 0.32) { ctx.moveTo(x, -1.6); ctx.lineTo(x + 1.1, 1.6); }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,247,214,0.7)'; ctx.lineWidth = 0.1;
  ctx.beginPath(); ctx.moveTo(x0 + 0.05, -1.4); ctx.lineTo(x1 - 0.35, -1.33); ctx.stroke();
}
/* V: the vow in the steel (additive): the hamon red-hot, light down the groove, embers off the edge */
function vrkVow(B, hp, n, v, fine) {
  const t = uiTime, fl = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7);
  ctx.save();
  vrkOutline(B, n); ctx.clip();
  vrkHamonZone(B, hp, n); ctx.fillStyle = rgba('#ef4444', 0.5 * v * fl); ctx.fill();
  vrkPoly(hp); ctx.strokeStyle = rgba('#fdba74', 0.85 * v * fl); ctx.lineWidth = fine ? 0.16 : 0.35; ctx.stroke();
  if (fine) {
    const hi = vrkHi(B, n);
    ctx.fillStyle = rgba('#dc2626', 0.45 * v); ctx.fill();
    const gp = (t * 0.7) % 1.3;                   // a brighter pulse, running out to the tip
    if (gp < 1) {
      const s = hi.b * gp, x = B.X(s), y = hi.mid(s), k = Math.sin(Math.PI * gp) * v, ds = 1.1 / B.span;
      const s0 = Math.max(0, s - ds), s1 = Math.min(hi.b, s + ds);
      drawGlow(x, y, 1.4, '#ef4444', 0.8 * k);
      vraLens(B.X(s0), hi.mid(s0), B.X(s1), hi.mid(s1), 0.06, '#fee2e2', 0.8 * k);
    }
  }
  ctx.restore();
  for (let i = 0; i < 7; i++) {                   // embers off the edge, each somewhere new each time round
    const per = 0.7 + 0.6 * vraH(i + 3130), q = (t + vraH(i + 3100) * 9) / per, ph = q - Math.floor(q);
    const s = Math.min(B.sy, 0.08 + 0.84 * vraH(i * 7 + Math.floor(q) * 0.37 + 3160));
    const x = B.X(s) - ph * 1.6, y = B.edge(s) + ph * 2.4, al = v * (1 - ph) * (1 - ph);
    drawGlow(x, y, 0.9 + 0.6 * (1 - ph), '#f97316', 0.8 * al);
    ctx.fillStyle = rgba('#fee2e2', al); ctx.beginPath(); ctx.arc(x, y, 0.12, 0, TAU); ctx.fill();
  }
}
/* a katana, along +x from the tsuba */
function vraKatana(L, heat, a, v) {
  if (L <= 0.5) return;
  if (v === undefined) v = vkwK();                                                          // V
  const t = uiTime, sc = vrkScale(), fine = sc >= 1.8, finer = sc >= 6, B = vrkBlade(L);
  ctx.save();
  ctx.globalAlpha *= a;
  vrkHilt(v, fine, finer);
  if (B) {
    const n = clamp(Math.round(B.span / (fine ? 1.1 : 3.5)), 6, 64), hp = vrkHamon(B, fine ? n * 2 : n);
    ctx.save();
    vrkOutline(B, n);
    ctx.fillStyle = vriMix('#a3afbf', '#3a1416', v); ctx.fill();                            // the steel (V: darkened)
    ctx.clip();
    vrkUpper(B, n); ctx.fillStyle = vriMix('#465266', '#170a0c', v); ctx.fill();             // above the ridge, burnished dark
    vrkHamonZone(B, hp, n); ctx.fillStyle = vriMix('#eef2f6', '#8f1d1d', v, 0.62 + 0.25 * v); ctx.fill();
    if (fine) {
      vrkHi(B, n); ctx.fillStyle = vriMix('#151b27', '#090304', v); ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,0.22)'; ctx.lineWidth = 0.07; ctx.stroke();
    }
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (fine) {
      ctx.beginPath(); ctx.moveTo(B.X(0), B.ridge(0));                                       // the ridge, out to the tip; the yokote across
      for (let i = 1; i <= n; i++) { const s = B.sy * i / n; ctx.lineTo(B.X(s), B.ridge(s)); }
      ctx.lineTo(B.T.x, B.T.y);
      ctx.moveTo(B.X(B.sy), B.ridge(B.sy)); ctx.lineTo(B.E.x, B.E.y);
      ctx.strokeStyle = vriMix('#e2e8f0', '#fca5a5', v, 0.5 - 0.15 * v); ctx.lineWidth = 0.1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(B.X(0), B.back(0));                                         // the back
      for (let i = 1; i <= n; i++) ctx.lineTo(B.X(i / n), B.back(i / n));
      ctx.strokeStyle = vriMix('#cbd5e1', '#7f1d1d', v, 0.6); ctx.lineWidth = 0.12; ctx.stroke();
      if (v < 1) {
        vrkPoly(hp); ctx.strokeStyle = rgba('#ffffff', 0.55 * (1 - v)); ctx.lineWidth = 0.12; ctx.stroke();   // the hamon's bright line
        if (finer) {                                                                           // and its feet, running to the edge
          ctx.strokeStyle = rgba('#ffffff', 0.3 * (1 - v)); ctx.lineWidth = 0.06;
          ctx.beginPath();
          for (let i = 3; i < hp.length - 9; i += 3) { const [x, y] = hp[i]; ctx.moveTo(x, y); ctx.lineTo(x + 0.08, y + 0.28); }
          ctx.stroke();
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); ctx.moveTo(B.X(0.02), B.edge(0.02));                                     // the edge, round the fukura to the tip
    for (let i = 1; i <= n; i++) { const s = B.sy * i / n; ctx.lineTo(B.X(s), B.edge(s)); }
    ctx.quadraticCurveTo(B.C.x, B.C.y, B.T.x, B.T.y);
    ctx.strokeStyle = vriMix('#ffffff', '#fecaca', v, 0.45 + 0.45 * heat);
    ctx.lineWidth = fine ? 0.16 + 0.1 * heat : 0.45 + 0.3 * heat; ctx.stroke();
    const g = (t * 0.8) % 1.6;                                                                 // a glint running out along it
    if (g < 1) {
      const s = Math.min(g, B.sy), ga = 0.7 * (1 - Math.abs(g - 0.5) * 2) + 0.1, gc = v > 0.5 ? '#fecaca' : '#ffffff';   // V
      if (fine) {                                                                              // close: a streak of light on the edge
        const ds = 1.6 / B.span, s0 = Math.max(0, s - ds), s1 = Math.min(B.sy, s + ds);
        vraLens(B.X(s0), B.edge(s0) - 0.12, B.X(s1), B.edge(s1) - 0.12, 0.14, gc, ga);
        drawGlow(B.X(s), B.edge(s) - 0.15, 1.2, gc, ga * 0.8);
      } else drawGlow(B.X(s), B.edge(s) - B.wide(s) * 0.2, 5, gc, ga);
    }
    if (heat > 0.5) drawGlow(L * 0.6, -1, L * 0.5, v > 0.5 ? RKV_RED : VRA_GOLD, (v > 0.5 ? 0.5 : 0.35) * heat);   // V
    if (v > 0) vrkVow(B, hp, n, v, fine);                                                      // V
    ctx.restore();
  }
  vrkHabaki(fine);
  vrkTsuba(v, fine);
  ctx.restore();
}
/* ============================ end of hull.js ============================ */
