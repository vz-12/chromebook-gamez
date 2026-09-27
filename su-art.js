/* ===========================================================================
   SUPERUSER · Z — THE MANE — art
   Drop-in for index.html: replaces the placeholder art-hook block (from
   "art hooks" down to the end of drawSuHud) and oniManePath, and the bodies of
   suBite / suImpale / suSlam. Written against the game's own names.

   The idea: the drill IS the mane. As Z fires, every lock swings to the nape
   and shortens (oniGather), and one twisted rope leaves the back of the hull,
   whips round the side it is aimed at and spears out. It comes home the same
   way and the mane fans back out of it.

   X — ROOTKIT is at the bottom of the file: it replaces the placeholder block
   "X — ROOTKIT, art hooks" (drawSuKitFloor, drawSuKitExpo, drawSuPlunge) and
   the bodies of suKitOpen / suKitTake. oniGather above now gathers for both.

   V — ROOT is last of all: it replaces the placeholder block "V — ROOT, art
   hooks" (drawSuAscUnder, drawSuAscOver, drawSuAscScreen, drawSuAscWorld and
   the bodies of suAscFx / suAscEndFx / suJabFx / suJabHitFx / suJabImpaleFx /
   suJabThrowFx / suFlungHitFx / suFlungWallFx). drawSuLiftShadow and drawSuHud
   changed with it (a thrown body gets a shadow and no reticle; V shows ROOT
   live and spent for the area).

   COMBO #2 — FLING is after the drain: it replaces the placeholder block
   "COMBO #2 — FLING, art hooks" (drawSuFlingCue, drawSuFling, drawSuHusk and
   the bodies of suFlingArmFx / suFlingReel / suHuskThrowFx / suHuskHitFx).

   C — DRAIN is last: it replaces the placeholder block "C — DRAIN, art
   hooks" (drawSuDrain and the bodies of suDrainCast / suDrainBite /
   suDrainTake / suDrainPaid). oniGather gathers the mane partway for it.

   COMBO #1 is after X: it replaces the placeholder block "COMBO #1, art
   hooks" (drawSuComboCue, drawSuCombo, drawSuPiece, suComboPierce,
   suComboRipFx, suComboThrowFx, suPieceHitFx). drawSuOverBodies above keeps
   the combo's draw calls, and leaves the drill to drawSuCombo while it is
   in 'combo': all four drills are the mane's, grown from the nape.
=========================================================================== */

// 0 the mane as it is, 1 all of it wound into the drill — Z's or X's
function oniGather() {
  const p = P.suPlunge;
  const dr = P.suDrain;
  if (dr && !p && !P.suDrill && typeof DRAIN_REACH !== 'undefined') {   // C: the locks go out as strands
    const g = 0.6;
    return dr.ph === 'reach' ? g * rrEaseOut(clamp(dr.t / DRAIN_REACH, 0, 1))
         : dr.ph === 'drain' ? g : g * (1 - rrEaseIn(clamp(dr.t / DRAIN_BACK, 0, 1)));
  }
  const fl = P.suFling;                                                  // combo #2: the locks stay out
  if (fl && !p && !P.suDrill && typeof FLING_BACK !== 'undefined')
    return fl.ph === 'back' ? 0.6 * (1 - rrEaseIn(clamp(fl.t / FLING_BACK, 0, 1))) : 0.6;
  if (p) return p.ph === 'dive' ? rrEaseOut(clamp(p.t / (KIT_PLUNGE * KIT_GATHER), 0, 1))
                                : 1 - rrEaseIn(clamp(p.t / KIT_PULL, 0, 1));
  const d = P.suDrill;
  if (!d) return 0;
  if (d.ph === 'wind') return rrEaseOut(clamp(d.t / DRILL_WIND, 0, 1));
  if (d.ph === 'out') return 1;
  if (d.ph === 'back') return 1 - rrEaseIn(clamp(d.t / DRILL_BACK, 0, 1));
  return 1;
}

// REPLACES oniManePath: gathered, the locks crowd to the nape and point back
// into the drill's root instead of fanning.
function oniManePath(m, ph, surge, k) {
  const g = oniGather();
  const r = typeof suAscMorph === 'function' ? clamp(suAscMorph(), 0, 1.1) : 0;   // V: it stiffens into quills
  const lagK = oni.lag * 1.6 * (1 - g) * (1 - r * 0.7);
  const th = lerp(m.th, Math.PI + (m.th - Math.PI) * 0.3, g);
  let bx = -3 + Math.cos(th) * 7, by = Math.sin(th) * 8.5;
  if (r > 0) { bx = lerp(bx, -10 + Math.cos(th) * 12, r); by = lerp(by, Math.sin(th) * 17, r); }
  const spread = (m.th - Math.PI) * (1 - g * 0.9) * (1 + r * 0.55);
  const dir = Math.PI + spread * 0.72 - lagK * (0.45 + Math.abs(spread) * 0.3);
  const fl = 0.9 + Math.sin(uiTime * (4 + m.ph % 3) + m.ph) * 0.1 * (1 - r);
  const len = m.len * k * surge * oni.stretch * fl * (1 - g * 0.7) * (1 + r * 0.3);
  return oniStrand(bx, by, dir, len, m.wid * Math.min(1, k * 1.2) * (1 - r * 0.25), m.wave * (1 + Math.abs(lagK)) * (1 - g * 0.8) * (1 - r * 0.9), m.ph + ph);
}

/* ------------------------------ one-off fx --------------------------------
   Timed marks the moments leave behind, drawn from the two world passes. */
const suFx = [];
const SU_FX_LIFE = { bite: 0.28, impale: 0.36, slam: 1.0, open: 0.9, take: 0.6, rip: 0.8, throw: 0.3, lodge: 0.85,
                     drcast: 0.42, husk: 0.55, paid: 0.9,
                     farm: 0.4, freel: 0.5, hsplat: 0.75,
                     asc: 1.1, ascend: 0.9, asnap: 0.4, jbite: 0.22, fhit: 0.45, fwall: 0.6 };
function suFxAdd(kind, o) { o.kind = kind; o.at = uiTime; suFx.push(o); if (suFx.length > 48) suFx.shift(); }

function drawSuFx(floor) {
  for (let i = suFx.length - 1; i >= 0; i--) {
    const f = suFx[i], t = (uiTime - f.at) / SU_FX_LIFE[f.kind];
    if (t >= 1 || t < 0) { if (!floor) suFx.splice(i, 1); continue; }
    ctx.save();
    if (floor && f.kind === 'slam') suSlamFloor(f, t);
    if (!floor && f.kind === 'slam') suSlamAir(f, t);
    if (!floor && f.kind === 'bite') suBiteMark(f, t);
    if (!floor && f.kind === 'impale') suImpaleMark(f, t);
    if (floor && f.kind === 'open') suKitOpenFloor(f, t);
    if (!floor && f.kind === 'open') suKitOpenAir(f, t);
    if (!floor && f.kind === 'take') suKitTakeMark(f, t);
    if (!floor && f.kind === 'rip') suRipMark(f, t);
    if (!floor && f.kind === 'throw') suThrowMark(f, t);
    if (floor && f.kind === 'lodge') suLodgeFloor(f, t);
    if (!floor && f.kind === 'lodge') suLodgeMark(f, t);
    if (!floor && f.kind === 'drcast') suDrainCastMark(f, t);
    if (!floor && f.kind === 'husk') suDrainHuskMark(f, t);
    if (!floor && f.kind === 'paid') suDrainPaidMark(f, t);
    if (!floor && f.kind === 'farm') suFlingArmMark(f, t);
    if (floor && f.kind === 'asc') suAscFloor(f, t);
    if (!floor && f.kind === 'ascend') suAscEndMark(f, t);
    if (!floor && f.kind === 'asnap') suAscSnapMark(f, t);
    if (!floor && f.kind === 'jbite') suJabBiteMark(f, t);
    if (!floor && f.kind === 'fhit') suFlungHitMark(f, t);
    if (!floor && f.kind === 'fwall') suFlungWallMark(f, t);
    if (floor && f.kind === 'freel') suFlingReelFloor(f, t);
    if (floor && f.kind === 'hsplat') suHuskSplatFloor(f, t);
    if (!floor && f.kind === 'hsplat') suHuskSplatMark(f, t);
    ctx.restore();
  }
}

function suBiteMark(f, t) {
  const a = 1 - t, r = f.r * (0.6 + rrEaseOut(t) * 1.1);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  if (t < 0.3) {   // the hit spark: a hard white cross, on the drill's axis
    const q = (1 - t / 0.3) * 0.7, L = f.r * (1.4 + t * 2);
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang + 0.4);
    ctx.fillStyle = rgba('#fefce8', q);
    for (let j = 0; j < 4; j++) {
      ctx.rotate(Math.PI / 2); const l = j % 2 ? L * 0.55 : L;
      ctx.beginPath(); ctx.moveTo(0, -1.6 * q); ctx.lineTo(l, 0); ctx.lineTo(0, 1.6 * q); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    drawGlow(f.x, f.y, f.r * 1.5, '#fefce8', 0.4 * q);
  }
  // the flutes' wake: three arcs spun off the bit
  for (let j = 0; j < 3; j++) {
    const a0 = f.ang + j * TAU / 3 + t * 9;
    ctx.strokeStyle = rgba(j ? ONI_LIT : ONI_PALE, a * 0.9); ctx.lineWidth = 2.4 * a + 0.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, a0, a0 + 1.5); ctx.stroke();
  }
  // out the far side
  const ca = Math.cos(f.ang), sa = Math.sin(f.ang), L = f.r * (1 + t * 3.2);
  const g = ctx.createLinearGradient(f.x, f.y, f.x + ca * L, f.y + sa * L);
  g.addColorStop(0, rgba(ONI_PALE, a)); g.addColorStop(1, rgba(ONI_LIT, 0));
  ctx.strokeStyle = g; ctx.lineWidth = 3 * a + 0.5;
  ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + ca * L, f.y + sa * L); ctx.stroke();
}

function suImpaleMark(f, t) {
  const a = 1 - t, e = rrEaseOut(t);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(f.x, f.y, f.r * (2.4 - t), SU_COL, 0.7 * a);
  ctx.translate(f.x, f.y); ctx.rotate(f.ang);
  const spike = (L, w, col) => {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(-L * 0.25, 0); ctx.lineTo(0, -w); ctx.lineTo(L, 0); ctx.lineTo(0, w); ctx.closePath(); ctx.fill();
  };
  // through and out the back, and the cross it throws
  spike(f.r * (1.6 + e * 2.6), 3.2 * a + 0.6, rgba(SU_COL, a));
  spike(f.r * (1.1 + e * 1.4), 1.4 * a + 0.3, rgba('#fefce8', a));
  ctx.rotate(Math.PI / 2); spike(f.r * 1.3 * a, 2 * a, rgba(SU_COL, a * 0.8));
  ctx.rotate(Math.PI); spike(f.r * 1.3 * a, 2 * a, rgba(SU_COL, a * 0.8));
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(0, 0, f.r * (1 + e * 0.9), 0, TAU); ctx.stroke();
}

// the floor half of the slam: shock in the plating, 鬼 struck into it
function suSlamFloor(f, t) {
  const e = f.e;
  if (!e || e.dead || e.hacked || !(e.suPin > 0)) suCracks(f.x, f.y, f.r, f.seed, 1 - t, clamp(1 - t * 3, 0, 1));
  ctx.translate(f.x, f.y); ctx.scale(1, 0.5);
  ctx.globalCompositeOperation = 'lighter';
  for (const [d, col, w] of [[0, SU_COL, 5], [0.12, ONI_LIT, 3]]) {
    const u = clamp((t - d) / (1 - d), 0, 1); if (u <= 0) continue;
    const q = rrEaseOut(clamp(u / 0.55, 0, 1)), a = Math.pow(1 - u, 1.6);
    ctx.strokeStyle = rgba(col, a * 0.9); ctx.lineWidth = w * a + 0.6;
    ctx.beginPath(); ctx.arc(0, 0, f.r * (1 + q * 5.5), 0, TAU); ctx.stroke();
  }
  const st = clamp(t * 3.2, 0, 1), sa = Math.pow(1 - t, 2);
  ctx.font = '700 ' + Math.round(f.r * 2.3 * (1 + (1 - rrEaseOut(st)) * 0.7)) + 'px ' + CON_MONO;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(t < 0.12 ? '#fefce8' : t < 0.3 ? SU_COL : ONI_LIT, sa * 0.75);
  ctx.fillText('鬼', 0, 0);
}
// the air half: the streak it came down on
function suSlamAir(f, t) {
  const a = clamp(1 - t * 4, 0, 1); if (a <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  const w = f.r * 1.2 * a, top = f.y - SU_LIFT_H - f.r;
  const g = ctx.createLinearGradient(0, top, 0, f.y);
  g.addColorStop(0, rgba(SU_COL, 0)); g.addColorStop(1, rgba('#fefce8', a * 0.8));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(f.x - w * 0.3, top); ctx.lineTo(f.x + w * 0.3, top); ctx.lineTo(f.x + w, f.y); ctx.lineTo(f.x - w, f.y); ctx.closePath(); ctx.fill();
  drawGlow(f.x, f.y, f.r * 3.4, SU_COL, a * 0.6);
}

// a crater and the cracks run out of it, on the floor plane (squashed)
function suCracks(x, y, r, seed, a, hot) {
  if (a <= 0.01) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.35);
  cg.addColorStop(0, 'rgba(0,0,0,' + 0.6 * a + ')'); cg.addColorStop(0.75, 'rgba(0,0,0,' + 0.35 * a + ')'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, r * 1.35, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.45 * a); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.05, 0, TAU); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
  for (let i = 0; i < 7; i++) {
    const a0 = (i / 7) * TAU + (rrHash(seed + i) - 0.5) * 0.7, L = r * (1.7 + rrHash(seed + i * 3.1) * 1.5);
    const pts = [];
    for (let s = 0; s <= 4; s++) {
      const d = lerp(r * 0.75, L, s / 4), j = s ? (rrHash(seed + i * 7 + s) - 0.5) * 0.5 : 0;
      pts.push([Math.cos(a0 + j) * d, Math.sin(a0 + j) * d]);
    }
    const line = () => { ctx.beginPath(); pts.forEach((p, s) => s ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); };
    line(); ctx.strokeStyle = 'rgba(0,0,0,' + 0.75 * a + ')'; ctx.lineWidth = 3.4; ctx.stroke();
    line(); ctx.strokeStyle = rgba(ONI_LIT, 0.55 * a); ctx.lineWidth = 1; ctx.stroke();
    if (hot > 0) { line(); ctx.strokeStyle = rgba(SU_COL, hot); ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  ctx.restore();
}

/* ------------------------------- art hooks -------------------------------- */

// world pass, before the bodies: what sits on the floor under them
function drawSuUnderBodies() {
  if (typeof suZones !== 'undefined') for (const z of suZones) drawSuKitFloor(z, clamp(1 - z.t / z.life, 0, 1));   // X's areas
  for (const e of enemies) if (!e.dead && e.suPin > 0) drawSuPinFloor(e, clamp(e.suPin / (e.suPinMax || 1), 0, 1));
  drawSuFx(true);
  for (const e of enemies) if (!e.dead && e.suLift > 0) drawSuLiftShadow(e, e.suLift);
}
// world pass, after the bodies and before the hull (drawRiteUnderHull)
function drawSuOverBodies() {
  for (const e of enemies) if (!e.dead && e.suPin > 0) drawSuPin(e, clamp(e.suPin / (e.suPinMax || 1), 0, 1));
  if (typeof KIT_HACK !== 'undefined') for (const e of enemies)                     // X's exposure
    if (!e.dead && !e.hacked && e.type !== 'boss' && e.suExpo > 0) drawSuKitExpo(e, clamp(e.suExpo / KIT_HACK, 0, 1));
  if (P.suDrill && P.suDrill.ph !== 'combo') drawSuDrill(P.suDrill);            // the combo draws its own
  if (P.suPlunge) drawSuPlunge(P.suPlunge);                                       // X's plunge
  if (P.suDrain) drawSuDrain(P.suDrain);                                          // C's drain
  if (P.suFling) drawSuFling(P.suFling);                                          // combo #2's locks
  else if (P.suDrain && typeof suFlingCue === 'function' && suFlingCue(P.suDrain)) drawSuFlingCue(P.suDrain);
  if (typeof suPieces !== 'undefined') {
    if (P.suCombo) drawSuCombo(P.suCombo);                                        // combo #1
    else { const ce = suComboReady(); if (ce && suOn() && P.suCd[1] <= 0) drawSuComboCue(ce); }
    for (const pc of suPieces) pc.kind === 'husk' ? drawSuHusk(pc) : drawSuPiece(pc);
  }
  drawSuFx(false);
}

/* ART HOOK: the floor under a lifted body. k = e.suLift, 0 → 1 at the top.
   A soft shadow that shrinks as it rises, and a gold reticle that closes on
   the spot it will come down on, locking as the slam starts. */
function drawSuLiftShadow(e, k) {
  if (e.suFly || e.suJab) {   // ROOT's: thrown, not slammed — only its shadow on the floor
    const fx = e.x, fy = e.y + e.r * 0.35, sr = e.r * (1.1 - k * 0.3);
    ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.45);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, sr);
    sg.addColorStop(0, 'rgba(0,0,0,0.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, sr, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  const d = P.suDrill, slam = d && d.target === e && d.ph === 'slam';
  const lock = slam ? 1 : d && d.target === e && d.ph === 'hang' ? 1 : k;
  const fx = e.x, fy = e.y + e.r * 0.35;
  ctx.save();
  const sr = e.r * (1.15 - k * 0.35);
  const sg = ctx.createRadialGradient(fx, fy, 0, fx, fy, sr);
  sg.addColorStop(0, 'rgba(0,0,0,' + (0.6 - k * 0.2) + ')'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.45); ctx.translate(-fx, -fy);
  ctx.beginPath(); ctx.arc(fx, fy, sr, 0, TAU); ctx.fill();

  // the reticle, on the floor plane
  const R = e.r * lerp(2.5, 1.35, rrEaseOut(lock));
  const rot = (1 - lock) * 0.9 + uiTime * 0.4 * (1 - lock);
  const a = 0.35 + lock * 0.6 * (slam ? 1 : 0.75 + Math.sin(uiTime * 14) * 0.25);
  ctx.translate(fx, fy); ctx.rotate(rot);
  ctx.strokeStyle = rgba(SU_COL, a); ctx.lineWidth = 2.2 / 0.7; ctx.lineCap = 'square';
  for (let q = 0; q < 4; q++) {
    ctx.save(); ctx.rotate(q * TAU / 4);
    ctx.beginPath(); ctx.arc(0, 0, R, -0.32, 0.32); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R + 3, 0); ctx.lineTo(R + 9, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = rgba(ONI_LIT, 0.35 * lock); ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 6]); ctx.lineDashOffset = -uiTime * 30;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.62, 0, TAU); ctx.stroke();
  ctx.restore();

  // the drop line, floor to body
  const top = e.y - SU_LIFT_H * k;
  if (k > 0.15) {
    ctx.strokeStyle = rgba(SU_COL, 0.28 * k); ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]); ctx.lineDashOffset = uiTime * 50;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, top + e.r); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(fx, fy, e.r * 1.2, SU_COL, 0.12 + lock * 0.18);
  ctx.restore();
}

/* ART HOOK: THE MANE as a drill. The whole mane, wound into one braided rope:
   it leaves the nape, whips round the side it is aimed at and spears straight
   to a fluted bit. Over the bodies, under the hull and the gathered mane. */
function suManeCurve(d, ex, ey) {
  const a = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
  if (d.side === undefined) d.side = Math.random() < 0.5 ? -1 : 1;
  const dx = ex - P.x, dy = ey - P.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const cr = ca * uy - sa * ux;
  const s = Math.abs(cr) > 0.2 ? Math.sign(cr) : d.side;
  const x0 = P.x - ca * 10, y0 = P.y - sa * 10;
  const lead = Math.min(L * 0.32, 60), wide = 44 - clamp(L / 160, 0, 1) * 10;
  return [x0, y0,
          x0 - ca * 38 + nx * s * 22, y0 - sa * 38 + ny * s * 22,
          P.x + nx * s * wide + ux * lead, P.y + ny * s * wide + uy * lead,
          ex, ey];
}

function drawSuDrill(d) {
  const e = d.target, wind = d.ph === 'wind';
  const wk = wind ? rrEase(clamp(d.t / DRILL_WIND, 0, 1)) : 1;
  let tx = e ? e.x : P.x + Math.cos(d.ang) * d.len;
  let ty = e ? e.y - SU_LIFT_H * (e.suLift || 0) : P.y + Math.sin(d.ang) * d.len;
  let B;
  if (wind) {
    // the wind-up: the locks leave the nape and twist into a knot behind the hull
    const oa = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(oa), sa = Math.sin(oa);
    if (d.side === undefined) d.side = Math.random() < 0.5 ? -1 : 1;
    const x0 = P.x - ca * 10, y0 = P.y - sa * 10, L = 10 + 46 * wk, s = d.side, nx = -sa, ny = ca;
    tx = x0 - ca * L + nx * s * L * 0.3; ty = y0 - sa * L + ny * s * L * 0.3;
    B = [x0, y0, x0 - ca * L * 0.45, y0 - sa * L * 0.45, lerp(x0, tx, 0.75), lerp(y0, ty, 0.75), tx, ty];
  } else if (Math.hypot(tx - P.x, ty - P.y) < 2) return;
  if (e) {   // run it through the body, not up to it
    const ux0 = tx - P.x, uy0 = ty - P.y, l0 = Math.hypot(ux0, uy0) || 1;
    tx += ux0 / l0 * e.r * 0.55; ty += uy0 / l0 * e.r * 0.55;
  }
  if (!B) B = suManeCurve(d, tx, ty);
  const held = d.ph === 'lift' || d.ph === 'hang' || d.ph === 'slam' || d.ph === 'combo';
  const fade = d.ph === 'back' ? 1 - clamp((d.t / DRILL_BACK - 0.55) / 0.45, 0, 1) : 1;
  const trem = d.ph === 'hang' ? 1.6 : d.ph === 'lift' ? 0.7 : d.ph === 'combo' ? 1.2 : 0;
  const N = 40, pts = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = rrBez(B, u);
    if (trem) { const j = Math.sin(u * Math.PI) * Math.sin(uiTime * 95 + u * 9) * trem; p[0] += j; p[1] -= j; }
    pts.push(p);
    if (i) acc.push(acc[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
  }
  const tot = acc[N];
  const bl = Math.min(30, tot * 0.3);
  let bi = N; if (!wind) while (bi > 2 && tot - acc[bi] < bl) bi--;
  const bx = pts[bi][0], by = pts[bi][1];
  const bang = Math.atan2(ty - by, tx - bx), blen = Math.hypot(tx - bx, ty - by);

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // shadow on the plating; a lifted bit's shadow stays on the floor
  ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 7;
  ctx.beginPath();
  const lift = e ? SU_LIFT_H * (e.suLift || 0) : 0;
  for (let i = 0; i <= N; i++) {
    const p = pts[i], u = i / N;
    const x = p[0] + 5, y = p[1] + 7 + lift * Math.pow(u, 2.2);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();

  // width along the rope: thick where the mane is wound in, lean, then a collar
  const wAt = i => { if (wind) return (3 + 5 * wk) * (1 - 0.5 * i / N); const f = acc[i] / tot, fb = acc[bi] / tot; return 4 + 3.2 * Math.pow(1 - f, 3) + 1.3 * clamp((f - fb + 0.1) / 0.1, 0, 1); };
  const nrm = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  // silhouette
  const Lp = [], Rp = [];
  for (let i = 0; i <= bi; i++) { const [nx, ny] = nrm(i), w = wAt(i); Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]); }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (const p of Lp) ctx.lineTo(p[0], p[1]);
  for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_DEEP; ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 0.8; ctx.stroke();

  // the braid: three locks twisting round each other, the rope spinning
  const spin = wind ? 20 + 50 * wk : d.ph === 'out' ? 62 : held ? 24 : 34;
  for (const front of [false, true]) {
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i <= bi; i++) {
        const ph = acc[i] * 0.3 - uiTime * spin + k * TAU / 3;
        if ((Math.cos(ph) > 0) !== front) continue;
        const [nx, ny] = nrm(i), [mx, my] = nrm(i - 1), w = wAt(i);
        const o0 = Math.sin(ph - acc[i] * 0.3 + acc[i - 1] * 0.3) * w * 0.55, o1 = Math.sin(ph) * w * 0.55;
        ctx.strokeStyle = front ? (k === 0 ? ONI_LIT : ONI_MID) : ONI_DARK;
        ctx.lineWidth = w * (front ? 0.62 : 0.5);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0] + mx * o0, pts[i - 1][1] + my * o0);
        ctx.lineTo(pts[i][0] + nx * o1, pts[i][1] + ny * o1); ctx.stroke();
        if (front && Math.cos(ph) > 0.75) {
          ctx.strokeStyle = rgba(ONI_PALE, 0.7); ctx.lineWidth = 0.9; ctx.stroke();
        }
      }
    }
  }

  suFeeders(d, pts, acc, wind ? N : bi, wind ? tot : Math.min(80, tot * 0.4), wAt, nrm, spin, wk);

  // held: the rope strains and burns gold along its length
  ctx.globalCompositeOperation = 'lighter';
  if (held) {
    const hot = d.ph === 'lift' ? 0.35 : d.ph === 'combo' ? 0.9 : 0.7;
    ctx.strokeStyle = rgba(SU_COL, hot * (0.6 + Math.sin(uiTime * 30) * 0.2)); ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let i = 0; i <= bi; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
  }
  // out: speed, the rope tearing air
  if (d.ph === 'out') {
    for (let s = 0; s < 6; s++) {
      const i = Math.max(1, bi - 2 - ((s * 5 + (uiTime * 60 | 0)) % Math.max(1, bi - 2)));
      const [nx, ny] = nrm(i), side = s % 2 ? 1 : -1, w = wAt(i) + 4 + rrHash(s + (uiTime * 30 | 0)) * 4;
      const p = pts[i], q = pts[Math.max(0, i - 3)];
      ctx.strokeStyle = rgba(ONI_PALE, 0.35); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p[0] + nx * w * side, p[1] + ny * w * side); ctx.lineTo(q[0] + nx * w * side, q[1] + ny * w * side); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // the bit: a fluted cone, spinning, its point burning
  if (!wind) {
  ctx.save();
  ctx.translate(tx, ty); ctx.rotate(bang);
  const rb = 7.6;
  const cone = () => {
    ctx.beginPath(); ctx.moveTo(-blen, -rb);
    ctx.quadraticCurveTo(-blen * 0.45, -rb * 0.78, 0, 0);
    ctx.quadraticCurveTo(-blen * 0.45, rb * 0.78, -blen, rb); ctx.closePath();
  };
  cone();
  const cg = ctx.createLinearGradient(0, -rb, 0, rb);
  cg.addColorStop(0, ONI_LIT); cg.addColorStop(0.45, ONI_MID); cg.addColorStop(1, ONI_DEEP);
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); cone(); ctx.clip();
  const fr = d.ph === 'out' ? 7 : held ? 2.5 : 4;
  for (let j = 0; j < 6; j++) {
    const x = -blen + (((j / 6) + uiTime * fr) % 1) * blen * 1.3;
    ctx.strokeStyle = ONI_DEEP; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, -rb); ctx.lineTo(x - 8, rb); ctx.stroke();
    ctx.strokeStyle = rgba(ONI_PALE, 0.55); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x + 1.4, -rb); ctx.lineTo(x - 6.6, rb); ctx.stroke();
  }
  ctx.fillStyle = SU_COL; ctx.fillRect(-blen * 0.26, -rb, blen, rb * 2);
  ctx.restore();
  cone(); ctx.strokeStyle = rgba(ONI_PALE, 0.6); ctx.lineWidth = 0.8; ctx.stroke();
  // collar where the rope is bound into the bit
  ctx.fillStyle = ONI_DARK; ctx.strokeStyle = SU_COL; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-blen, 0, 2.4, rb + 1.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
  }

  ctx.globalCompositeOperation = 'lighter';
  if (wind) {   // the knot pulled tight, about to go
    drawGlow(tx, ty, 8 + 16 * wk, SU_COL, 0.25 + 0.5 * wk * wk);
    drawGlow(tx, ty, 30, ONI_LIT, 0.3 * wk);
  } else {
    drawGlow(tx, ty, held ? 22 : 16, SU_COL, 0.5);
    drawGlow(tx, ty, 34, ONI_LIT, 0.35);
  }
  ctx.restore();

  // bits come off the rope as it spins
  if (FXO.parts && d.ph !== 'back' && Math.random() < 0.5) {
    const i = 2 + (Math.random() * (bi - 2)) | 0, [nx, ny] = nrm(i), s = Math.random() < 0.5 ? -1 : 1;
    spawnPart(pts[i][0], pts[i][1], nx * s * rnd(90, 30), ny * s * rnd(90, 30), rnd(1.8, 0.8),
              Math.random() < 0.2 ? SU_COL : ONI_LIT, rnd(0.4, 0.2), 0.9);
  }
}

/* The locks feeding the rope: seven of them, each from its own root across
   the nape, spiralling round the rope's axis and closing on it until they are
   one. Drawn over the rope's first stretch, so the join is always visible. */
function suFeeders(d, pts, acc, iMax, span, wAt, nrm, spin, wk) {
  const oa = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(oa), sa = Math.sin(oa);
  const K = 7;
  let jEnd = 1; while (jEnd < iMax && acc[jEnd] < span) jEnd++;
  const tw = d.ph === 'wind' ? 0.9 + wk * 1.4 : 2.3;          // turns over the span: tightening as it winds
  for (const front of [false, true]) {
    for (let k = 0; k < K; k++) {
      const th = Math.PI + (k / (K - 1) - 0.5) * 2.1;
      const rx = -3 + Math.cos(th) * 7, ry = Math.sin(th) * 8.5;
      const r0x = P.x + ca * rx - sa * ry, r0y = P.y + sa * rx + ca * ry;
      const col = k % 3 === 0 ? ONI_LIT : k % 3 === 1 ? ONI_MID : ONI_PALE;
      let px = r0x, py = r0y;
      for (let i = 1; i <= jEnd; i++) {
        const u = i / jEnd, m = rrEaseOut(u);
        const ph = u * tw * TAU - uiTime * spin * 0.12 + k * TAU / K;
        const face = Math.cos(ph) > 0;
        const [nx, ny] = nrm(i), w = wAt(i);
        // from its root, falling in to orbit the rope and closing on it
        const orbit = w * (1.25 - 0.8 * u) * Math.sin(ph);
        const cx = lerp(r0x, pts[i][0], m) + nx * orbit, cy = lerp(r0y, pts[i][1], m) + ny * orbit;
        if (face === front) {
          const lw = lerp(3.4, 1.4, u);
          ctx.strokeStyle = front ? col : ONI_DEEP; ctx.lineWidth = lw + (front ? 0 : 0.6);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, cy); ctx.stroke();
          if (front) { ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.6; ctx.stroke(); }
        }
        px = cx; py = cy;
      }
    }
  }
  // the binding where they become one: a gold wrap, spinning
  const j = jEnd, [nx, ny] = nrm(j), w = wAt(j) + 1.2;
  ctx.strokeStyle = rgba(SU_COL, 0.85); ctx.lineWidth = 1.3;
  for (let b = 0; b < 3; b++) {
    const i = Math.max(1, j - b * 2), p = pts[i], q = nrm(i);
    ctx.beginPath(); ctx.moveTo(p[0] + q[0] * w, p[1] + q[1] * w); ctx.lineTo(p[0] - q[0] * w, p[1] - q[1] * w); ctx.stroke();
  }
}

/* the floor under a pinned body: the crater the slam made, cooling */
function drawSuPinFloor(e, k) {
  const age = (e.suPinMax || 1) * (1 - k);
  suCracks(e.x, e.y, e.r, e.id || (e.x * 0.37 | 0), clamp(k * 2.5, 0, 1), clamp(1 - age / 0.35, 0, 1));
}

/* ART HOOK: a body pinned by the slam. k = 1 at the slam → 0 as it frees.
   Three locks of the mane left staked over it, their ends driven into the
   plating, and twelve notches running down. They strain, then let go. */
function drawSuPin(e, k) {
  const seed = e.id || (e.x * 0.37 | 0);
  const free = clamp(1 - k / 0.22, 0, 1);            // the last stretch: they strain
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const th = rrHash(seed) * TAU + i * Math.PI / 3;
    const Rr = e.r + 7, ax = e.x + Math.cos(th) * Rr, ay = e.y + Math.sin(th) * Rr * 0.55;
    const bx2 = e.x - Math.cos(th) * Rr, by2 = e.y - Math.sin(th) * Rr * 0.55;
    const j = Math.sin(uiTime * 48 + i * 2) * 2.2 * free;
    const cx = e.x + j, cy = e.y - e.r * (1.15 + free * 0.35) - i * 1.5;
    const Lp = [], Rp = [], M = 14;
    for (let s = 0; s <= M; s++) {
      const u = s / M, v = 1 - u;
      const x = v * v * ax + 2 * v * u * cx + u * u * bx2, y = v * v * ay + 2 * v * u * cy + u * u * by2;
      const dx = 2 * v * (cx - ax) + 2 * u * (bx2 - cx), dy = 2 * v * (cy - ay) + 2 * u * (by2 - cy), l = Math.hypot(dx, dy) || 1;
      const w = 1 + 2.6 * Math.sin(u * Math.PI);
      Lp.push([x - dy / l * w, y + dx / l * w]); Rp.push([x + dy / l * w, y - dx / l * w]);
    }
    ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
    for (const p of Lp) ctx.lineTo(p[0], p[1]);
    for (let s = M; s >= 0; s--) ctx.lineTo(Rp[s][0], Rp[s][1]);
    ctx.closePath();
    ctx.globalAlpha = 0.25 + k * 0.75;
    ctx.fillStyle = ONI_DARK; ctx.fill();
    ctx.strokeStyle = free > 0 ? rgba(SU_COL, 0.5 + free * 0.5) : ONI_LIT; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.strokeStyle = rgba(ONI_PALE, 0.55); ctx.lineWidth = 0.7;
    ctx.beginPath(); for (let s = 3; s <= M - 3; s++) s > 3 ? ctx.lineTo(Lp[s][0], Lp[s][1]) : ctx.moveTo(Lp[s][0], Lp[s][1]); ctx.stroke();
    // where they go into the floor
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    drawGlow(ax, ay, 6, SU_COL, 0.55 * k + free * 0.4); drawGlow(bx2, by2, 6, SU_COL, 0.55 * k + free * 0.4);
    ctx.globalCompositeOperation = 'source-over';
  }
  // the count, notch by notch
  const R = e.r + 15, n = 12, lit = Math.ceil(n * k);
  ctx.lineCap = 'butt'; ctx.lineWidth = 2.2;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + i * TAU / n;
    const on = i < lit, last = on && i === lit - 1;
    ctx.strokeStyle = on ? rgba(k > 0.3 ? SU_COL : ONI_LIT, last ? 0.5 + Math.sin(uiTime * 18) * 0.4 : 0.9) : 'rgba(148,163,184,0.18)';
    ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * R, e.y + Math.sin(a) * R);
    ctx.lineTo(e.x + Math.cos(a) * (R + 4), e.y + Math.sin(a) * (R + 4)); ctx.stroke();
  }
  ctx.restore();
}

/* ART HOOK: the root meter and the four keys, where EMBER's vent sits.
   The meter is eight cells, one a body; the keys sweep their cooldown and
   flash as they come back. Returns the next free line. */
const SU_NAMES = ['MANE', 'KIT', 'SAP', ''];
const suHudFx = { prev: [0, 0, 0, 0], at: [-9, -9, -9, -9], rdyAt: -9, wasRdy: false };
function drawSuHud(pad, ly, bw) {
  if (!P.awake || P.charId !== 'hacker' || rootRite) return ly;
  const on = suOn(), k = clamp((P.suRoot || 0) / SU_MAX, 0, 1), ready = !on && k >= 0.999;
  if (ready && !suHudFx.wasRdy) suHudFx.rdyAt = uiTime;
  suHudFx.wasRdy = ready;
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  const asc = !!P.suAsc, lab = asc ? '# ROOT' : on ? 'SUPERUSER' : ready ? '[F] SUDO SU' : '[F] ROOT';
  ctx.font = "700 10px Barlow, 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = on || ready ? SU_COL : '#4d7c0f';
  if (ready) ctx.globalAlpha = 0.72 + Math.sin(uiTime * 6) * 0.28;
  ctx.fillText(lab, pad, ly);
  ctx.globalAlpha = 1;
  const lw = ctx.measureText(lab).width;
  ctx.font = "700 9px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = on ? rgba(SU_COL, 0.8) : ready ? rgba(SU_COL, 0.65) : '#4d7c0f';
  ctx.fillText(on ? P.suT.toFixed(1) + 's' : ready ? '#' : '$ ' + Math.floor(k * 100) + '%', pad + lw + 6, ly);

  // eight cells, a body each
  const n = Math.max(1, Math.round(SU_MAX / SU_GAIN)), barW = Math.min(77, bw - 6), gap = 2;
  const cw = (barW - gap * (n - 1)) / n, cy = ly + 7;
  const fillN = on ? clamp(P.suT / (asc && typeof ASC_LEN !== 'undefined' ? ASC_LEN : SU_LEN), 0, 1) * n : k * n;
  const sweep = clamp((uiTime - suHudFx.rdyAt) / 0.45, 0, 1);
  for (let i = 0; i < n; i++) {
    const x = pad + i * (cw + gap), f = clamp(fillN - i, 0, 1);
    ctx.fillStyle = 'rgba(148,163,184,0.16)'; ctx.fillRect(x, cy, cw, 5);
    if (f <= 0) continue;
    if (on) {
      const lead = f < 1;
      ctx.fillStyle = SU_COL; ctx.globalAlpha = lead ? 0.55 + Math.sin(uiTime * 20) * 0.35 : 1;
    } else if (ready) {
      ctx.fillStyle = SU_COL; ctx.globalAlpha = 0.6 + 0.4 * Math.max(0, Math.sin(uiTime * 6 - i * 0.7));
    } else ctx.fillStyle = f < 1 ? '#4d7c0f' : '#84cc16';
    ctx.fillRect(x, cy, cw * f, 5);
    ctx.globalAlpha = 1;
    if (ready && sweep < 1 && Math.abs(sweep * (n + 2) - 1 - i) < 1) { ctx.fillStyle = 'rgba(254,252,232,0.9)'; ctx.fillRect(x, cy - 1, cw, 7); }
  }

  // Z X C V
  const kw = (barW - 3 * 3) / 4, kh = 16, ky = ly + 18;
  ctx.textAlign = 'center';
  for (let i = 0; i < 4; i++) {
    const x = pad + i * (kw + 3), built = !!SU_NAMES[i];
    if (i === 3 && (asc || P.suAscUsed)) { suHudRootKey(x, ky, kw, kh, asc); continue; }
    const cd = P.suCd ? P.suCd[i] : 0, live = on && built;
    if (live && suHudFx.prev[i] > 0 && cd <= 0) suHudFx.at[i] = uiTime;
    suHudFx.prev[i] = cd;
    ctx.fillStyle = 'rgba(6,10,6,0.85)';
    roundRect(x, ky, kw, kh, 3); ctx.fill();
    if (live && cd > 0) {
      ctx.save(); roundRect(x, ky, kw, kh, 3); ctx.clip();
      const cx = x + kw / 2, cyy = ky + kh / 2, f = clamp(cd / ((typeof SU_CD_MAX !== 'undefined' && SU_CD_MAX[i]) || DRILL_CD), 0, 1);
      ctx.fillStyle = 'rgba(132,204,22,0.26)';
      ctx.beginPath(); ctx.moveTo(cx, cyy); ctx.arc(cx, cyy, kw, -Math.PI / 2, -Math.PI / 2 + TAU * f); ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (live) { ctx.fillStyle = 'rgba(253,224,71,0.1)'; roundRect(x, ky, kw, kh, 3); ctx.fill(); }
    ctx.strokeStyle = live ? (cd > 0 ? '#4d7c0f' : SU_COL) : built ? '#365314' : '#1e293b';
    ctx.lineWidth = 1.2; roundRect(x, ky, kw, kh, 3); ctx.stroke();
    const ft = (uiTime - suHudFx.at[i]) / 0.35;
    if (ft >= 0 && ft < 1) {
      const g = ft * 5;
      ctx.strokeStyle = rgba(SU_COL, 1 - ft); ctx.lineWidth = 1.5;
      roundRect(x - g, ky - g, kw + g * 2, kh + g * 2, 3 + g); ctx.stroke();
    }
    ctx.font = "700 9px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
    ctx.fillStyle = live ? (cd > 0 ? '#84cc16' : SU_COL) : built ? '#4d7c0f' : '#334155';
    ctx.fillText(SU_KEYS[i].toUpperCase(), x + kw / 2, ky + kh / 2 + 0.5);
    ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
    const sub = built ? (live && cd > 0 ? cd.toFixed(1) : SU_NAMES[i]) : '';
    if (sub) { ctx.fillStyle = live ? (cd > 0 ? '#4d7c0f' : rgba(SU_COL, 0.75)) : '#365314'; ctx.fillText(sub, x + kw / 2, ky + kh + 3); }
  }
  ctx.restore();
  return ly + 52;
}

// V, once it has been pressed: live, a gold key draining with ROOT's clock; spent, struck through till the boss falls
function suHudRootKey(x, ky, kw, kh, asc) {
  ctx.fillStyle = 'rgba(6,10,6,0.85)'; roundRect(x, ky, kw, kh, 3); ctx.fill();
  if (asc) {
    const f = clamp(P.suT / ((typeof ASC_LEN !== 'undefined' && ASC_LEN) || 30), 0, 1);
    ctx.save(); roundRect(x, ky, kw, kh, 3); ctx.clip();
    ctx.fillStyle = rgba(SU_COL, 0.3); ctx.fillRect(x, ky + kh * (1 - f), kw, kh * f);
    ctx.fillStyle = rgba('#fefce8', 0.5 + Math.sin(uiTime * 18) * 0.3); ctx.fillRect(x, ky + kh * (1 - f), kw, 1);
    ctx.restore();
    ctx.strokeStyle = SU_COL; ctx.lineWidth = 1.4; roundRect(x, ky, kw, kh, 3); ctx.stroke();
    const g = 1.5 + Math.sin(uiTime * 6) * 1.5;
    ctx.strokeStyle = rgba(SU_COL, 0.35); ctx.lineWidth = 1; roundRect(x - g, ky - g, kw + g * 2, kh + g * 2, 3 + g); ctx.stroke();
    ctx.font = "800 9px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fefce8'; ctx.fillText('#', x + kw / 2, ky + kh / 2 + 0.5);
    ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
    ctx.fillStyle = SU_COL; ctx.fillText(P.suT.toFixed(1), x + kw / 2, ky + kh + 3);
    return;
  }
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1.2; roundRect(x, ky, kw, kh, 3); ctx.stroke();
  ctx.font = "700 9px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#334155'; ctx.fillText('V', x + kw / 2, ky + kh / 2 + 0.5);
  ctx.strokeStyle = rgba('#64748b', 0.8); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + 3, ky + kh - 3); ctx.lineTo(x + kw - 3, ky + 3); ctx.stroke();
  ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
  ctx.fillStyle = '#475569'; ctx.fillText('SPENT', x + kw / 2, ky + kh + 3);
}

/* ---------------------- the three moments (bodies) ------------------------ */

/* the bit biting, once per body it drills: shavings thrown off the flutes,
   and the wake of the bit out the far side */
function suBite(e) {
  const ang = Math.atan2(e.y - P.y, e.x - P.x);
  for (let i = 0; i < 12; i++) {
    const a = ang + (i % 2 ? 1 : -1) * (Math.PI / 2 + rnd(0.7, -0.7)), s = rnd(300, 110);
    spawnPart(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, rnd(2.6, 1.2), i % 5 ? ONI_LIT : SU_COL, rnd(0.4, 0.2), 0.9);
  }
  for (let i = 0; i < 5; i++) {
    const a = ang + rnd(0.3, -0.3), s = rnd(420, 200);
    spawnPart(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s, rnd(2, 1), ONI_PALE, rnd(0.3, 0.15), 0.88);
  }
  suFxAdd('bite', { x: e.x, y: e.y, r: e.r, ang });
  suImpact('bite', e.x, e.y, e.r);
  shake(0.12);
  Audio_.tone(1400, 0.04, 'square', 0.05, 900);
}

/* impaled — the body the drill could not kill, on the end of the mane */
function suImpale(d, e, along) {
  d.target = e; d.ph = 'lift'; d.t = 0; d.len = Math.max(0, along);
  e.suHold = true; e.suLift = 0; e.vx = e.vy = 0;
  if (e.type === 'dasher') e.state = 0;
  const ang = Math.atan2(e.y - P.y, e.x - P.x);
  suFxAdd('impale', { x: e.x, y: e.y, r: e.r, ang });
  burst(e.x, e.y, 14, SU_COL, 300, 2.4, 0.4, 1.0, ang);
  floatText(e.x, e.y - e.r - 12, 'IMPALED', SU_COL, 14);
  suImpact('impale', e.x, e.y, e.r);
  shake(0.55);
  Audio_.tone(180, 0.2, 'square', 0.08, 90);
}

/* THE SLAM — the lifted body brought down into the floor */
function suSlam(d, e) {
  e.suLift = 0; e.suHold = false;
  e.vx = e.vy = 0;
  damageEnemy(e, DRILL_DMG * SLAM_MUL * suPower(), false, e.x, e.y);
  if (!e.dead && !e.hacked) e.suPin = e.suPinMax = e.type === 'boss' ? PIN_BOSS : PIN_T;
  shake(1.7);
  drawFlashT = Math.max(drawFlashT, 0.05);
  suImpact('slam', e.x, e.y, e.r);
  suFxAdd('slam', { x: e.x, y: e.y, r: e.r, e, seed: e.id || (e.x * 0.37 | 0) });
  for (let i = 0; i < 34; i++) {   // debris, thrown flat along the floor
    const a = rnd(TAU), s = rnd(380, 120);
    spawnPart(e.x, e.y, Math.cos(a) * s, Math.sin(a) * s * 0.5, rnd(3.2, 1.3),
              i % 4 ? ONI_LIT : i % 8 ? SU_COL : ONI_PALE, rnd(0.7, 0.3), 0.9);
  }
  Audio_.boom();
  suBack(d);
}

/* ------------------------------ impact frames -----------------------------
   The hits, sold the way a fight cut sells them: the world stops (hitStop),
   the screen inverts for a frame, cuts to black with the hit in white, and
   focus lines rush in on it. Screen pass — call drawSuImpact() at the top of
   drawSuScreen, before its suOn() check, so a slam still lands as it ends. */
let suImp = null;
const SU_IMP = {
  //        stop    invert  black   lines (all seconds, uiTime)
  bite:   { stop: 0.02,  inv: 0,     blk: 0,     lines: 0,    n: 0,  r: 0.7,  a: 0 },
  impale: { stop: 0.05,  inv: 0,     blk: 0,     lines: 0.14, n: 18, r: 0.5,  a: 0.28 },
  slam:   { stop: 0.09,  inv: 0,     blk: 0.035, lines: 0.2,  n: 26, r: 0.4,  a: 0.35 },
  open:   { stop: 0.06,  inv: 0,     blk: 0.03,  lines: 0.18, n: 22, r: 0.45, a: 0.3 },
  take:   { stop: 0.03,  inv: 0,     blk: 0,     lines: 0.12, n: 14, r: 0.55, a: 0.22 },
  pierce: { stop: 0.07,  inv: 0,     blk: 0.03,  lines: 0.16, n: 22, r: 0.45, a: 0.3 },
  rip:    { stop: 0.12,  inv: 0.03,  blk: 0.04,  lines: 0.26, n: 32, r: 0.35, a: 0.4 },
  piece:  { stop: 0.04,  inv: 0,     blk: 0,     lines: 0.1,  n: 12, r: 0.6,  a: 0.2 }
};
function suImpact(kind, x, y, r) {
  const k = SU_IMP[kind];
  hitStop = Math.max(hitStop, k.stop);
  // a bite never cuts over a bigger frame still playing
  if (suImp && SU_IMP[suImp.kind].n > k.n && uiTime - suImp.at < SU_IMP[suImp.kind].lines) return;
  suImp = { kind, x, y, r, at: uiTime };
}
function drawSuImpact() {
  const f = suImp; if (!f) return;
  const k = SU_IMP[f.kind], s = uiTime - f.at;
  if (s > k.lines || s < 0) { suImp = null; return; }
  const c = rrToScreen(f.x, f.y), D = Math.hypot(W, H);
  const fr = Math.floor(uiTime * 30);                  // lines re-cut at 30fps, like drawn frames
  ctx.save();
  if (s < k.inv) {
    // frame 1: the negative
    ctx.globalCompositeOperation = 'difference';
    ctx.fillStyle = '#fefce8'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  } else if (s < k.inv + k.blk) {
    // frame 2: black, and only the hit left in it
    ctx.fillStyle = 'rgba(2,3,2,0.55)'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.6; ctx.drawImage(glowSprite(SU_COL), c.x - f.r * 4, c.y - f.r * 4, f.r * 8, f.r * 8); ctx.globalAlpha = 1;
    ctx.fillStyle = '#fefce8';
    ctx.globalCompositeOperation = 'source-over';
  }
  // focus lines, rushing in on the hit
  const u = s / k.lines, a = s < k.inv + k.blk ? 1 : Math.pow(1 - u, 1.4);
  const inner = Math.min(W, H) * k.r * (0.8 + u * 0.5);
  if (!k.n) { ctx.restore(); return; }
  ctx.fillStyle = rgba('#fefce8', k.a * a);
  ctx.beginPath();
  for (let i = 0; i < k.n; i++) {
    const h = rrHash(fr * 13.1 + i * 7.7);
    const ang = (i + h * 0.8) / k.n * TAU, r0 = inner * (0.75 + rrHash(fr + i * 3.3) * 0.7);
    const w = (0.002 + rrHash(i * 5.1 + fr) * 0.006) * TAU;
    ctx.moveTo(c.x + Math.cos(ang) * r0, c.y + Math.sin(ang) * r0);
    ctx.lineTo(c.x + Math.cos(ang - w) * D, c.y + Math.sin(ang - w) * D);
    ctx.lineTo(c.x + Math.cos(ang + w) * D, c.y + Math.sin(ang + w) * D);
    ctx.closePath();
  }
  ctx.fill();
  // and a gold edge on the slam's, the moment it hits
  if (f.kind === 'slam' && s < k.inv + k.blk + 0.08) {
    ctx.strokeStyle = rgba(SU_COL, a * 0.4); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, inner * 0.7, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}


/* ===========================================================================
   SUPERUSER · X — ROOTKIT — art
   Replaces the placeholder block "X — ROOTKIT, art hooks" (drawSuKitFloor,
   drawSuKitExpo, drawSuPlunge) and the bodies of suKitOpen / suKitTake.

   The mane winds into the drill as it does for Z, but goes up instead of out:
   it whips round behind the hull, arcs over and comes down on the spot like a
   stake, screws itself into the plating and pulls back out. What it leaves is
   a root: traces run out under the floor from the socket, the plating inside
   is rewritten cell by cell, and every bite runs out along the traces.
=========================================================================== */
const KIT_GATHER = 0.3;    // share of the dive spent winding the mane
const KIT_REACH  = 0.82;   // share of the dive by which the bit meets the floor
const KIT_SINK   = 0.16;   // how far past the floor it is driven, in curve units
const KIT_BIT    = 26;     // the bit's length

// how much of the rope is out: 0 at the nape, 1 at the floor, 1 + KIT_SINK buried
function suPlungeReach(p) {
  if (p.ph === 'dive') {
    const u = clamp(p.t / KIT_PLUNGE, 0, 1);
    if (u < KIT_GATHER) return 0.1 * rrEaseOut(u / KIT_GATHER);
    if (u < KIT_REACH) return 0.1 + 0.9 * rrEaseIn((u - KIT_GATHER) / (KIT_REACH - KIT_GATHER));
    return 1 + KIT_SINK * rrEaseOut((u - KIT_REACH) / (1 - KIT_REACH));
  }
  return (1 + KIT_SINK) * (1 - rrEaseIn(clamp(p.t / KIT_PULL, 0, 1)));
}

// the drill's bit, pointed along ang with its tip at tx, ty (as drawSuDrill's)
function suBit(tx, ty, ang, blen, fr) {
  ctx.save();
  ctx.translate(tx, ty); ctx.rotate(ang);
  const rb = 7.6;
  const cone = () => {
    ctx.beginPath(); ctx.moveTo(-blen, -rb);
    ctx.quadraticCurveTo(-blen * 0.45, -rb * 0.78, 0, 0);
    ctx.quadraticCurveTo(-blen * 0.45, rb * 0.78, -blen, rb); ctx.closePath();
  };
  cone();
  const cg = ctx.createLinearGradient(0, -rb, 0, rb);
  cg.addColorStop(0, ONI_LIT); cg.addColorStop(0.45, ONI_MID); cg.addColorStop(1, ONI_DEEP);
  ctx.fillStyle = cg; ctx.fill();
  ctx.save(); cone(); ctx.clip();
  for (let j = 0; j < 6; j++) {
    const x = -blen + (((j / 6) + uiTime * fr) % 1) * blen * 1.3;
    ctx.strokeStyle = ONI_DEEP; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, -rb); ctx.lineTo(x - 8, rb); ctx.stroke();
    ctx.strokeStyle = rgba(ONI_PALE, 0.55); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x + 1.4, -rb); ctx.lineTo(x - 6.6, rb); ctx.stroke();
  }
  ctx.fillStyle = SU_COL; ctx.fillRect(-blen * 0.26, -rb, blen, rb * 2);
  ctx.restore();
  cone(); ctx.strokeStyle = rgba(ONI_PALE, 0.6); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = ONI_DARK; ctx.strokeStyle = SU_COL; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(-blen, 0, 2.4, rb + 1.2, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}

// the socket in the plating: dark, a gold lip; front = only the near half of the lip
function suSocket(x, y, k, front) {
  if (k <= 0.01) return;
  const rx = 13 * k, ry = 5.6 * k;
  if (!front) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.7, 'rgba(2,8,2,0.85)'); g.addColorStop(1, rgba(ONI_DEEP, 0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, TAU); ctx.stroke();
    return;
  }
  ctx.strokeStyle = SU_COL; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.stroke();
  ctx.strokeStyle = rgba(ONI_PALE, 0.5); ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.ellipse(x, y + 1.2, rx * 0.92, ry * 0.9, 0, 0.3, Math.PI - 0.3); ctx.stroke();
}

/* ART HOOK: the plunge. The whole mane wound into one rope again: it rises at
   the nape, whips round behind the hull, arcs over and comes straight down on
   the spot, bit first. The bit screws in past the floor; the area opens as it
   locks (suKitOpen). On the pull the rope draws back up the same arc. */
function drawSuPlunge(p) {
  const reach = suPlungeReach(p), dive = p.ph === 'dive';
  const wk = dive ? rrEaseOut(clamp(p.t / (KIT_PLUNGE * KIT_GATHER), 0, 1)) : 1;
  const gathering = dive && p.t < KIT_PLUNGE * KIT_GATHER;
  const fade = dive ? 1 : 1 - clamp((p.t / KIT_PULL - 0.6) / 0.4, 0, 1);
  const oa = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(oa), sa = Math.sin(oa), nx = -sa, ny = ca;
  if (p.side === undefined) p.side = Math.random() < 0.5 ? -1 : 1;
  const s = p.side, x0 = P.x - ca * 10, y0 = P.y - sa * 10;
  const Hm = 60 + Math.min(Math.hypot(p.x - P.x, p.y - P.y), DRILL_RANGE) * 0.3;
  // on the floor: back behind the hull, round the side, then settling on the spot
  const B = [x0, y0, x0 - ca * 44 + nx * s * 28, y0 - sa * 44 + ny * s * 28, p.x, p.y, p.x, p.y];

  const N = 44, pts = [], sh = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const u = reach * i / N;
    let gx, gy, h;
    if (u > 1) { gx = p.x; gy = p.y; h = -(u - 1) / KIT_SINK * KIT_BIT * 1.1; }
    else { const g = rrBez(B, u); gx = g[0]; gy = g[1]; h = Hm * Math.sin(Math.PI * Math.pow(u, 0.72)); }
    pts.push([gx, gy - h]); sh.push([gx + 5, gy + 7, h]);
    if (i) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const tot = acc[N];
  const sock = dive ? clamp((reach - 0.97) / 0.06, 0, 1) : fade;

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  suSocket(p.x, p.y, sock, false);
  if (tot < 2) { ctx.restore(); return; }

  // shadow on the plating, only where the rope is over it
  ctx.strokeStyle = 'rgba(0,0,0,0.34)'; ctx.lineWidth = 7;
  ctx.beginPath();
  let on = false;
  for (const q of sh) { if (q[2] < 0) break; on ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); on = true; }
  ctx.stroke();

  // below the floor it is gone
  ctx.save();
  if (reach > 0.9) {
    ctx.beginPath(); ctx.rect(p.x - 4000, p.y - 4000, 8000, 8000); ctx.rect(p.x - 18, p.y, 36, 44);
    ctx.clip('evenodd');
  }
  const hasBit = !gathering && tot > KIT_BIT * 1.8;
  let bi = N; if (hasBit) while (bi > 2 && tot - acc[bi] < KIT_BIT) bi--;
  const wAt = i => {
    if (gathering) return (3 + 5 * wk) * (1 - 0.5 * i / N);
    const f = acc[i] / tot, fb = acc[bi] / tot;
    return 4 + 3.2 * Math.pow(1 - f, 3) + 1.3 * clamp((f - fb + 0.1) / 0.1, 0, 1);
  };
  const nrm = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  // silhouette
  const Lp = [], Rp = [];
  for (let i = 0; i <= bi; i++) { const [mx, my] = nrm(i), w = wAt(i); Lp.push([pts[i][0] + mx * w, pts[i][1] + my * w]); Rp.push([pts[i][0] - mx * w, pts[i][1] - my * w]); }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (const q of Lp) ctx.lineTo(q[0], q[1]);
  for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_DEEP; ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 0.8; ctx.stroke();

  // the braid, spinning hardest as it screws in
  const sinking = dive && reach > 1;
  const spin = gathering ? 20 + 50 * wk : sinking ? 80 : dive ? 62 : 34;
  for (const front of [false, true]) {
    for (let k = 0; k < 3; k++) {
      for (let i = 1; i <= bi; i++) {
        const ph = acc[i] * 0.3 - uiTime * spin + k * TAU / 3;
        if ((Math.cos(ph) > 0) !== front) continue;
        const [mx, my] = nrm(i), [lx, ly] = nrm(i - 1), w = wAt(i);
        const o0 = Math.sin(ph - acc[i] * 0.3 + acc[i - 1] * 0.3) * w * 0.55, o1 = Math.sin(ph) * w * 0.55;
        ctx.strokeStyle = front ? (k === 0 ? ONI_LIT : ONI_MID) : ONI_DARK;
        ctx.lineWidth = w * (front ? 0.62 : 0.5);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1][0] + lx * o0, pts[i - 1][1] + ly * o0);
        ctx.lineTo(pts[i][0] + mx * o1, pts[i][1] + my * o1); ctx.stroke();
        if (front && Math.cos(ph) > 0.75) { ctx.strokeStyle = rgba(ONI_PALE, 0.7); ctx.lineWidth = 0.9; ctx.stroke(); }
      }
    }
  }
  suFeeders({ ph: gathering ? 'wind' : 'out' }, pts, acc, gathering ? N : bi, gathering ? tot : Math.min(80, tot * 0.4), wAt, nrm, spin, wk);

  // screwed in: the rope strains and burns gold along its length
  ctx.globalCompositeOperation = 'lighter';
  if (sinking) {
    ctx.strokeStyle = rgba(SU_COL, 0.55 + Math.sin(uiTime * 30) * 0.2); ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let i = 0; i <= bi; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
  }
  // coming down: the air it tears, over the bit
  if (dive && !gathering && reach > 0.45 && reach < 1.05) {
    const tip = pts[N], a = clamp((reach - 0.45) / 0.3, 0, 1) * clamp((1.05 - reach) / 0.1, 0, 1);
    for (const o of [-9, 0, 9]) {
      const L = 38 + rrHash(o + (uiTime * 30 | 0)) * 24;
      const g = ctx.createLinearGradient(0, tip[1] - L, 0, tip[1]);
      g.addColorStop(0, rgba(ONI_PALE, 0)); g.addColorStop(1, rgba(ONI_PALE, 0.45 * a));
      ctx.strokeStyle = g; ctx.lineWidth = o ? 1 : 1.6;
      ctx.beginPath(); ctx.moveTo(tip[0] + o, tip[1] - L - KIT_BIT); ctx.lineTo(tip[0] + o * 0.6, tip[1] - KIT_BIT * 0.6); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  const tip = pts[N];
  if (hasBit) {
    const bx = pts[bi][0], by = pts[bi][1];
    suBit(tip[0], tip[1], Math.atan2(tip[1] - by, tip[0] - bx), Math.hypot(tip[0] - bx, tip[1] - by), sinking ? 10 : dive ? 7 : 3);
  }
  ctx.restore();   // the floor clip

  suSocket(p.x, p.y, sock, true);
  ctx.globalCompositeOperation = 'lighter';
  if (gathering) {   // the knot pulled tight, rising off the nape
    drawGlow(tip[0], tip[1], 8 + 16 * wk, SU_COL, 0.25 + 0.5 * wk * wk);
    drawGlow(tip[0], tip[1], 30, ONI_LIT, 0.3 * wk);
  } else if (reach < 1) {
    drawGlow(tip[0], tip[1], 16, SU_COL, 0.5);
    drawGlow(tip[0], tip[1], 34, ONI_LIT, 0.35);
  } else {
    drawGlow(p.x, p.y, 22 + (reach - 1) / KIT_SINK * 14, SU_COL, 0.6);
    drawGlow(p.x, p.y, 44, ONI_LIT, 0.4);
  }
  ctx.restore();

  // the plating it chews out as it goes in
  if (FXO.parts && sinking) {
    for (let j = 0; j < 2; j++) {
      const a = rnd(TAU), v = rnd(260, 90);
      spawnPart(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 3, Math.cos(a) * v, Math.sin(a) * v * 0.45 - 40, rnd(2.4, 1),
                Math.random() < 0.3 ? SU_COL : ONI_LIT, rnd(0.4, 0.2), 0.9);
    }
  } else if (FXO.parts && !gathering && p.ph !== 'pull' && Math.random() < 0.5 && bi > 3) {
    const i = 2 + (Math.random() * (bi - 2)) | 0, [mx, my] = nrm(i), sd = Math.random() < 0.5 ? -1 : 1;
    spawnPart(pts[i][0], pts[i][1], mx * sd * rnd(90, 30), my * sd * rnd(90, 30), rnd(1.8, 0.8),
              Math.random() < 0.2 ? SU_COL : ONI_LIT, rnd(0.4, 0.2), 0.9);
  }
}

/* The root under an area: traces run out from the socket in straight runs and
   45° elbows, the way a board is routed, some with a spur. Built once. */
function suKitRoots(z) {
  if (z._roots) return z._roots;
  const out = [], n = 9, O = Math.PI / 4, S = z.seed;
  const run = (pts, acc, dir, maxR, steps, salt) => {
    let [x, y] = pts[pts.length - 1];
    for (let s = 0; s < steps; s++) {
      const step = 12 + rrHash(S + salt + s * 1.7) * 20;
      let nx2 = x + Math.cos(dir) * step, ny2 = y + Math.sin(dir) * step;
      const rr = Math.hypot(nx2, ny2);
      if (rr > maxR) { nx2 *= maxR / rr; ny2 *= maxR / rr; }
      acc.push(acc[acc.length - 1] + Math.hypot(nx2 - x, ny2 - y));
      x = nx2; y = ny2; pts.push([x, y]);
      if (rr > maxR) break;
      const o = Math.atan2(y, x), t = rrHash(S + salt * 3 + s * 5.3);
      const c = t < 0.3 ? dir - O : t < 0.6 ? dir + O : dir;
      let dd = c - o; while (dd > Math.PI) dd -= TAU; while (dd < -Math.PI) dd += TAU;
      dir = Math.abs(dd) < 0.85 ? c : Math.round(o / O) * O;
    }
    return { pts, acc, tot: acc[acc.length - 1] };
  };
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rrHash(S + i) - 0.5) * 0.45;
    const maxR = z.r * (0.8 + rrHash(S + i * 5) * 0.17);
    const r = run([[0, 0], [Math.cos(a) * 14, Math.sin(a) * 14]], [0, 14], Math.round(a / O) * O, maxR, 14, i * 17);
    out.push(r);
    if (r.pts.length > 4 && rrHash(S + i * 9) > 0.35) {
      const j = 2 + ((r.pts.length - 4) * rrHash(S + i * 2.3) | 0);
      const sd = rrHash(S + i * 4) < 0.5 ? -1 : 1, base = Math.atan2(r.pts[j][1], r.pts[j][0]);
      out.push(run([r.pts[j].slice()], [r.acc[j]], Math.round(base / O) * O + sd * O, maxR * 0.85, 4, i * 31 + 7));
    }
  }
  return z._roots = out;
}
// a point d along a trace (d counts from the socket, as the trace's acc does)
function suRootAt(r, d) {
  for (let i = 1; i < r.pts.length; i++) {
    if (d <= r.acc[i]) {
      const u = (d - r.acc[i - 1]) / ((r.acc[i] - r.acc[i - 1]) || 1), a = r.pts[i - 1], b = r.pts[i];
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
    }
  }
  return r.pts[r.pts.length - 1];
}
function suRootLine(r, L) {
  ctx.beginPath(); ctx.moveTo(r.pts[0][0], r.pts[0][1]);
  for (let i = 1; i < r.pts.length; i++) {
    if (r.acc[i] <= L) { ctx.lineTo(r.pts[i][0], r.pts[i][1]); continue; }
    const q = suRootAt(r, L); ctx.lineTo(q[0], q[1]); break;
  }
}

/* ART HOOK: the hacked area, on the floor. The plating inside is rewritten —
   a fine grid of cells flipping as the code goes over it, a wave of them as it
   opens — the root runs out under it, each bite a pulse out along the traces,
   a sweep goes round, and the rim carries the ownership it has been given and
   the time it has left, in gold. It glitches out over its last moments. */
function drawSuKitFloor(z, k) {
  const S = z.seed, gr = rrEaseOut(clamp(z.t / 0.45, 0, 1)), R = z.r * gr;
  const left = z.life - z.t, closing = clamp(1 - left / 0.8, 0, 1);
  const glitch = closing > 0 ? (rrHash(Math.floor(uiTime * 30) + S) < closing * 0.6 ? 0.25 : 1) : 1;
  const fade = clamp(z.t / 0.15, 0, 1) * (1 - closing * closing) * glitch;
  const bp = Math.pow(clamp(z.tick / KIT_TICK, 0, 1), 3);        // 1 just after a bite
  if (fade <= 0.01 || R < 2) return;
  ctx.save();
  ctx.translate(z.x, z.y);
  ctx.globalAlpha = fade;

  // the plating under it, tinted and rewritten
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, rgba(ONI_MID, 0.16)); g.addColorStop(0.72, rgba(ONI_DEEP, 0.3)); g.addColorStop(1, rgba(ONI_LIT, 0.12));
  ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.save(); ctx.scale(1, 0.55);
  ctx.font = '700 ' + Math.round(z.r * 0.62) + 'px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(ONI_LIT, 0.08 + bp * 0.06); ctx.fillText('鬼', 0, 0);
  ctx.restore();
  const C = 12, n = Math.ceil(z.r / C);
  for (let ix = -n; ix < n; ix++) for (let iy = -n; iy < n; iy++) {
    const cx = (ix + 0.5) * C, cy = (iy + 0.5) * C, d = Math.hypot(cx, cy);
    if (d > R - 3) continue;
    const front = gr < 1 && R - d < 18;                         // the write front, opening
    const h = rrHash(S + ix * 31.7 + iy * 57.3);
    const v = rrHash(Math.floor(uiTime * (2 + h * 4) + h * 10) * 1.31 + ix * 7.1 + iy * 13.7);
    if (!front && v < 0.86) continue;
    ctx.fillStyle = front ? rgba(ONI_PALE, 0.28 * (1 - (R - d) / 18)) : v > 0.965 ? rgba(ONI_LIT, 0.3) : rgba(ONI_MID, 0.22);
    ctx.fillRect(cx - C / 2 + 1, cy - C / 2 + 1, C - 2, C - 2);
  }
  // the sweep
  const sa = uiTime * 1.6 + S;
  if (ctx.createConicGradient) {
    const cg = ctx.createConicGradient(sa, 0, 0);
    cg.addColorStop(0, rgba(ONI_LIT, 0)); cg.addColorStop(0.84, rgba(ONI_LIT, 0)); cg.addColorStop(1, rgba(ONI_LIT, 0.14));
    ctx.fillStyle = cg; ctx.fillRect(-R, -R, R * 2, R * 2);
  }
  ctx.strokeStyle = rgba(ONI_PALE, 0.3); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(sa) * R, Math.sin(sa) * R); ctx.stroke();
  ctx.restore();

  // the root, growing out as it opens
  const roots = suKitRoots(z), L = rrEaseOut(clamp(z.t / 0.55, 0, 1)) * z.r * 1.5;
  ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
  for (const r of roots) { suRootLine(r, L); ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 3.4; ctx.stroke(); }
  for (const r of roots) { suRootLine(r, L); ctx.strokeStyle = ONI_MID; ctx.lineWidth = 1.6; ctx.stroke(); }
  for (const r of roots) { suRootLine(r, L); ctx.strokeStyle = rgba(ONI_LIT, 0.55 + bp * 0.3); ctx.lineWidth = 0.7; ctx.stroke(); }
  ctx.fillStyle = rgba(ONI_LIT, 0.7);
  for (const r of roots) for (let i = 1; i < r.pts.length - 1; i++) if (r.acc[i] <= L) ctx.fillRect(r.pts[i][0] - 1.3, r.pts[i][1] - 1.3, 2.6, 2.6);
  ctx.strokeStyle = rgba(ONI_PALE, 0.8); ctx.lineWidth = 1;
  for (const r of roots) if (r.tot <= L) { const e = r.pts[r.pts.length - 1]; ctx.beginPath(); ctx.arc(e[0], e[1], 2.6, 0, TAU); ctx.stroke(); }

  // each bite, out along the traces
  ctx.globalCompositeOperation = 'lighter';
  const since = clamp(KIT_TICK - z.tick, 0, KIT_TICK), V = 280;
  for (let j = 0; j < 4; j++) {
    const d = (since + j * KIT_TICK) * V;
    for (const r of roots) {
      if (d < r.acc[0] || d > Math.min(r.tot, L)) continue;
      const a = suRootAt(r, d), b = suRootAt(r, Math.max(r.acc[0], d - 9));
      ctx.strokeStyle = rgba(j ? ONI_PALE : '#fefce8', 0.9 - j * 0.18); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // the socket the mane went into, still burning
  suCracks(0, 0, 10, S, 1, bp * 0.8);
  suSocket(0, 0, 0.85, false); suSocket(0, 0, 0.85, true);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(0, 0, 26 + bp * 10, ONI_LIT, 0.3 + bp * 0.35);
  drawGlow(0, 0, 9, SU_COL, 0.35 + bp * 0.4);
  ctx.globalCompositeOperation = 'source-over';

  // the rim: two rings, a scale, and the ownership it was given
  if (R > 16) {
  ctx.strokeStyle = rgba(ONI_LIT, 0.7 + bp * 0.25); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(ONI_LIT, 0.28); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, R - 13, 0, TAU); ctx.stroke();
  const rot = -uiTime * 0.12 + S;
  ctx.save(); ctx.rotate(rot);
  ctx.strokeStyle = rgba(ONI_LIT, 0.35); ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 60; i++) {
    const a = i * TAU / 60, l = i % 5 ? 2.5 : 5;
    ctx.moveTo(Math.cos(a) * (R - 13), Math.sin(a) * (R - 13)); ctx.lineTo(Math.cos(a) * (R - 13 + l), Math.sin(a) * (R - 13 + l));
  }
  ctx.stroke();
  ctx.restore();
  if (gr > 0.6) {
    const txt = 'chown -R root:root ', step = 0.058, cnt = Math.floor(TAU / step);
    ctx.font = '700 7px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(ONI_PALE, 0.55 * clamp((gr - 0.6) / 0.4, 0, 1));
    const tr = uiTime * 0.2 + S;
    for (let i = 0; i < cnt; i++) {
      const ch = txt[i % txt.length]; if (ch === ' ') continue;
      const a = tr + i * step;
      ctx.save(); ctx.rotate(a); ctx.translate(R - 6, 0); ctx.rotate(Math.PI / 2); ctx.fillText(ch, 0, 0); ctx.restore();
    }
  }
  }
  // the time it has left, gold, round the outside; it blinks at the end
  const blink = left < 3 ? 0.55 + 0.45 * Math.sign(Math.sin(uiTime * (left < 1.2 ? 22 : 11))) : 1;
  ctx.lineCap = 'butt';
  ctx.strokeStyle = 'rgba(15,42,7,0.8)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(SU_COL, 0.85 * blink); ctx.lineWidth = 2.4;
  const a1 = -Math.PI / 2 + TAU * k;
  ctx.beginPath(); ctx.arc(0, 0, R + 6, -Math.PI / 2, a1); ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(Math.cos(a1) * (R + 6), Math.sin(a1) * (R + 6), 8, SU_COL, 0.6 * blink);
  ctx.restore();
}

// the area a body stands in, if any: the youngest
function suKitZoneAt(e) {
  let best = null;
  for (const z of suZones) if (len(e.x - z.x, e.y - z.y) <= z.r && (!best || z.t < best.t)) best = z;
  return best;
}

/* ART HOOK: a body's exposure. Ten cells round it, a second each; the one
   filling flickers. In an area the root reaches for it — a live trace in
   from the socket — and its code comes up off it. Past seven seconds it goes
   gold and brackets close on it. Stepped out, the cells stay, dimmed. */
function drawSuKitExpo(e, k) {
  const z = suKitZoneAt(e), n = 10, R = e.r + 11, lit = k * n, hot = k > 0.7;
  const ey = e.y - SU_LIFT_H * (e.suLift || 0), id = e.id || 0;
  const col = hot ? SU_COL : ONI_LIT;
  ctx.save();
  ctx.lineCap = 'butt';
  if (z) {
    const dx = e.x - z.x, dy = ey - z.y, l = Math.hypot(dx, dy);
    if (l > R + 16) {
      const ex = e.x - dx / l * R, ey2 = ey - dy / l * R;
      ctx.strokeStyle = rgba(col, 0.22 + k * 0.3); ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]); ctx.lineDashOffset = -uiTime * 70;
      ctx.beginPath(); ctx.moveTo(z.x + dx / l * 14, z.y + dy / l * 14); ctx.lineTo(ex, ey2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.font = '700 7px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let j = 0; j < 5; j++) {
      const u = (uiTime * (0.8 + k) + j / 5 + id * 0.13) % 1;
      const ax = e.x + Math.sin(j * 2.4 + id) * e.r * 0.9, ay = ey + e.r - u * e.r * 2.6;
      ctx.fillStyle = rgba(col, Math.sin(u * Math.PI) * 0.85);
      ctx.fillText(rrHash(Math.floor(uiTime * 8) + j * 3.7 + id) > 0.5 ? '1' : '0', ax, ay);
    }
  }
  const dim = z ? 1 : 0.5;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * TAU / n + 0.05, a1 = a0 + TAU / n - 0.1, f = clamp(lit - i, 0, 1);
    ctx.strokeStyle = 'rgba(15,42,7,0.85)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(e.x, ey, R, a0, a1); ctx.stroke();
    if (f <= 0) continue;
    const lead = f < 1 && z;
    ctx.strokeStyle = rgba(col, dim * (lead ? 0.55 + Math.sin(uiTime * 20) * 0.35 : 0.95)); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(e.x, ey, R, a0, a0 + (a1 - a0) * f); ctx.stroke();
  }
  if (hot) {
    const q = rrEaseOut(clamp((k - 0.7) / 0.3, 0, 1)), Rb = lerp(R + 16, R + 5, q);
    ctx.strokeStyle = rgba(SU_COL, dim * (0.45 + q * 0.45 * (0.75 + Math.sin(uiTime * 14) * 0.25))); ctx.lineWidth = 1.6; ctx.lineCap = 'square';
    for (let c = 0; c < 4; c++) {
      const a = Math.PI / 4 + c * Math.PI / 2;
      ctx.beginPath(); ctx.arc(e.x, ey, Rb, a - 0.28, a + 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * (Rb + 2), ey + Math.sin(a) * (Rb + 2)); ctx.lineTo(e.x + Math.cos(a) * (Rb + 6), ey + Math.sin(a) * (Rb + 6)); ctx.stroke();
    }
  }
  ctx.restore();
}

// the floor half of the opening: the write going out through the plating
function suKitOpenFloor(f, t) {
  suCracks(f.x, f.y, 14, f.seed, 1 - t, clamp(1 - t * 2.5, 0, 1));
  ctx.globalCompositeOperation = 'lighter';
  for (const [d, col, w] of [[0, SU_COL, 5], [0.1, ONI_LIT, 3], [0.22, ONI_PALE, 1.5]]) {
    const u = clamp((t - d) / (0.7 - d), 0, 1); if (u <= 0 || u >= 1) continue;
    const q = rrEaseOut(u), a = Math.pow(1 - u, 1.4);
    ctx.strokeStyle = rgba(col, a * 0.9); ctx.lineWidth = w * a + 0.6;
    ctx.beginPath(); ctx.arc(f.x, f.y, 14 + (f.r - 14) * q, 0, TAU); ctx.stroke();
  }
  const st = clamp(t * 3.2, 0, 1), sa = Math.pow(1 - t, 2);
  ctx.save(); ctx.translate(f.x, f.y); ctx.scale(1, 0.55);
  ctx.font = '700 ' + Math.round(46 * (1 + (1 - rrEaseOut(st)) * 0.8)) + 'px ' + CON_MONO;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(t < 0.12 ? '#fefce8' : t < 0.3 ? SU_COL : ONI_LIT, sa * 0.8);
  ctx.fillText('鬼', 0, 0);
  ctx.restore();
}
// the air half: the streak the mane came down on
function suKitOpenAir(f, t) {
  const a = clamp(1 - t * 4, 0, 1); if (a <= 0) return;
  ctx.globalCompositeOperation = 'lighter';
  const w = 14 * a, top = f.y - 130;
  const g = ctx.createLinearGradient(0, top, 0, f.y);
  g.addColorStop(0, rgba(SU_COL, 0)); g.addColorStop(1, rgba('#fefce8', a * 0.8));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(f.x - w * 0.25, top); ctx.lineTo(f.x + w * 0.25, top); ctx.lineTo(f.x + w, f.y); ctx.lineTo(f.x - w, f.y); ctx.closePath(); ctx.fill();
  drawGlow(f.x, f.y, 60, SU_COL, a * 0.6);
}

// taken: the root strikes up out of the socket into it, its ten cells close
// in on it, and a column of its code goes up
function suKitTakeMark(f, t) {
  const a = 1 - t;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (t < 0.4) {
    const q = 1 - t / 0.4, fr = Math.floor(uiTime * 30);
    const dx = f.x - f.zx, dy = f.y - f.zy, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, M = 7;
    ctx.beginPath();
    for (let i = 0; i <= M; i++) {
      const u = i / M, j = i && i < M ? (rrHash(fr * 3.1 + i + f.seed) - 0.5) * 18 : 0;
      const x = f.zx + dx * u + nx * j, y = f.zy + dy * u + ny * j;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = rgba(SU_COL, q * 0.9); ctx.lineWidth = 3 * q + 0.5; ctx.stroke();
    ctx.strokeStyle = rgba('#fefce8', q); ctx.lineWidth = 1; ctx.stroke();
  }
  const n = 10, R = (f.r + 11) * (1 - rrEaseIn(t) * 0.8), rot = rrEaseOut(t) * 1.2;
  ctx.lineCap = 'butt'; ctx.strokeStyle = rgba(SU_COL, a); ctx.lineWidth = 2.6 * a + 0.5;
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + rot + i * TAU / n + 0.06;
    ctx.beginPath(); ctx.arc(f.x, f.y, R, a0, a0 + TAU / n - 0.12); ctx.stroke();
  }
  const H = 80 * rrEaseOut(t), top = f.y - f.r - H;
  const g = ctx.createLinearGradient(0, top, 0, f.y);
  g.addColorStop(0, rgba(SU_COL, 0)); g.addColorStop(1, rgba(ONI_PALE, 0.45 * a));
  ctx.fillStyle = g; ctx.fillRect(f.x - f.r * 0.45, top, f.r * 0.9, f.y - top);
  ctx.font = '700 8px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let j = 0; j < 6; j++) {
    const y = f.y - f.r * 0.5 - H * (j / 6), x = f.x + (rrHash(j * 3.3 + f.seed) - 0.5) * f.r * 0.8;
    ctx.fillStyle = rgba(j % 3 ? SU_COL : '#fefce8', a * (1 - j / 7));
    ctx.fillText(rrHash(Math.floor(uiTime * 12) + j + f.seed) > 0.5 ? '1' : '0', x, y);
  }
  drawGlow(f.x, f.y, f.r * 3 * (1 - t * 0.5), SU_COL, 0.55 * a);
}

/* ART HOOK moment: the area opening, as the bit locks into the floor. */
function suKitOpen(p) {
  const seed = rnd(1000);
  suZones.push({ x: p.x, y: p.y, r: KIT_R, t: 0, life: KIT_LEN, tick: 0, seed });
  suFxAdd('open', { x: p.x, y: p.y, r: KIT_R, seed });
  for (let i = 0; i < 30; i++) {   // chewed plating, thrown flat along the floor
    const a = rnd(TAU), s = rnd(340, 100);
    spawnPart(p.x, p.y, Math.cos(a) * s, Math.sin(a) * s * 0.5, rnd(3, 1.2),
              i % 4 ? ONI_LIT : i % 8 ? SU_COL : ONI_PALE, rnd(0.6, 0.3), 0.9);
  }
  suImpact('open', p.x, p.y, 16);
  shake(0.6);
  Audio_.boom();
}

/* ART HOOK moment: taken by the area — ten seconds in it and the body is
   yours, through the same hackTake the console uses (which calls it HACKED).
   What cannot be taken is marked so it is not asked again every frame. */
function suKitTake(e) {
  if (!hackTake(e, true)) { e.suKitNo = true; return; }
  e.suExpo = 0;
  const z = suKitZoneAt(e) || suZones[suZones.length - 1] || e;
  suFxAdd('take', { x: e.x, y: e.y, r: e.r, zx: z.x, zy: z.y, seed: e.id || (e.x * 0.37 | 0) });
  suImpact('take', e.x, e.y, e.r);
  shake(0.25);
}


/* ===========================================================================
   SUPERUSER · COMBO #1 — RIP — art
   The drill already in the boss is joined by a second from the mane, then
   two more: each whips out of the nape and drives through along its arm. The boss cracks along the X
   between the four — the rip lines — and comes apart, each quarter skewered
   lengthwise on its drill: the shaft goes in at the torn point and the bit
   comes out through the rim. They hang there, sagging on the drills, then
   each is flung apex first, and lodges in what it hits before it shatters.
=========================================================================== */
const SU_RIP_ROT = 0.2;     // the boss's outline, in the world, as it is cut

function suComboSeed(c) { return c.seed || (c.seed = 1 + Math.floor(Math.abs(c.ang * 997) % 500)); }
function suComboEr(c) { return c.er || (c.e && c.e.r) || 30; }
// the bit tip of arm i, from the cross's centre: out through the quarter's rim
function suComboTip(c) { const er = suComboEr(c); return Math.max(10, er) * PIECE_OUT + er * 0.5 + 14; }

// a point on rip line l (world angle phi): d out from the centre, jittered off it
function suRipPt(seed, l, j, d, th, er) {
  const J = j && j < 5 ? (rrHash(seed + l * 10 + j) - 0.5) * er * 0.14 : 0;
  return [Math.cos(th) * d - Math.sin(th) * J, Math.sin(th) * d + Math.cos(th) * J];
}

/* one of the mane's drills in the combo: a braided rope along the curve B, out
   to reach of it, with the bit on its end. hide: a circle it is inside of —
   the boss — where the rope is not seen. */
function suComboRope(B, reach, hide, spin, fr, trem, feed) {
  if (reach <= 0.01) return null;
  const N = 36, pts = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const u = reach * i / N, p = rrBez(B, u);
    if (trem) { const j = Math.sin(u * Math.PI) * Math.sin(uiTime * 95 + u * 9 + B[0]) * trem; p[0] += j; p[1] -= j; }
    pts.push(p);
    if (i) acc.push(acc[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
  }
  const tot = acc[N]; if (tot < 4) return null;
  const bl = Math.min(20, tot * 0.3);
  let bi = N; while (bi > 2 && tot - acc[bi] < bl) bi--;
  const wAt = i => { const f = acc[i] / tot, fb = acc[bi] / tot; return 3.4 + 2.6 * Math.pow(1 - f, 3) + 1.2 * clamp((f - fb + 0.08) / 0.08, 0, 1); };
  const nrm = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // its shadow, on the floor far below
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 6;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N, x = pts[i][0] + 5, y = pts[i][1] + 7 + SU_LIFT_H * Math.pow(u, 2.2); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  if (hide) { ctx.beginPath(); ctx.rect(hide[0] - 4000, hide[1] - 4000, 8000, 8000); ctx.arc(hide[0], hide[1], hide[2], 0, TAU); ctx.clip('evenodd'); }
  const Lp = [], Rp = [];
  for (let i = 0; i <= bi; i++) { const [nx, ny] = nrm(i), w = wAt(i); Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]); }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (const q of Lp) ctx.lineTo(q[0], q[1]);
  for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_DEEP; ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 0.8; ctx.stroke();
  for (const front of [false, true]) for (let k = 0; k < 3; k++) for (let i = 1; i <= bi; i++) {
    const ph = acc[i] * 0.3 - uiTime * spin + k * TAU / 3;
    if ((Math.cos(ph) > 0) !== front) continue;
    const [nx, ny] = nrm(i), [mx, my] = nrm(i - 1), w = wAt(i);
    const o0 = Math.sin(ph - acc[i] * 0.3 + acc[i - 1] * 0.3) * w * 0.55, o1 = Math.sin(ph) * w * 0.55;
    ctx.strokeStyle = front ? (k === 0 ? ONI_LIT : ONI_MID) : ONI_DARK; ctx.lineWidth = w * (front ? 0.62 : 0.5);
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0] + mx * o0, pts[i - 1][1] + my * o0); ctx.lineTo(pts[i][0] + nx * o1, pts[i][1] + ny * o1); ctx.stroke();
    if (front && Math.cos(ph) > 0.75) { ctx.strokeStyle = rgba(ONI_PALE, 0.7); ctx.lineWidth = 0.9; ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(SU_COL, 0.55 + Math.sin(uiTime * 30 + B[0]) * 0.2); ctx.lineWidth = 1.1;
  ctx.beginPath(); for (let i = 0; i <= bi; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  const tip = pts[N], b0 = pts[bi];
  suBit(tip[0], tip[1], Math.atan2(tip[1] - b0[1], tip[0] - b0[0]), Math.hypot(tip[0] - b0[0], tip[1] - b0[1]), fr);
  ctx.restore();
  if (feed) { ctx.save(); ctx.lineCap = 'round'; suFeeders({ ph: 'out' }, pts, acc, bi, Math.min(80, tot * 0.4), wAt, nrm, spin, 1); ctx.restore(); }
  else {   // its root at the nape, bound in gold
    const [nx, ny] = nrm(1), w = wAt(1) + 1.2;
    ctx.strokeStyle = rgba(SU_COL, 0.85); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(pts[2][0] + nx * w, pts[2][1] + ny * w); ctx.lineTo(pts[2][0] - nx * w, pts[2][1] - ny * w); ctx.stroke();
  }
  return tip;
}

/* the curve drill i takes: out of the nape, a whip round to the side, then in
   along its arm — entering the boss on the far side from where its bit will
   come out — straight through the centre and out to the tip */
function suComboCurve(c, i, cx, cy, ang) {
  const oa = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(oa), sa = Math.sin(oa), nx = -sa, ny = ca;
  const s = [0, 1, i === 2 ? ((c.ang * 7) % 2 > 1 ? 1 : -1) * 0.5 : 0, -1][i];
  const a = ang !== undefined ? ang : c.ang + i * Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
  const er = suComboEr(c), tip = suComboTip(c);
  const x0 = P.x - ca * 10 + nx * s * 5, y0 = P.y - sa * 10 + ny * s * 5;
  const ex = cx - ux * er * 1.3, ey = cy - uy * er * 1.3;
  const wide = i === 2 ? 110 : 70;
  return [x0, y0,
          x0 - ca * 40 + nx * s * wide, y0 - sa * 40 + ny * s * wide,
          ex - ux * 100 + (i === 2 ? nx * wide * 0.8 * (s || 1) : 0), ey - uy * 100 + (i === 2 ? ny * wide * 0.8 * (s || 1) : 0),
          cx + ux * tip, cy + uy * tip];
}
// the moment a drill lands in the boss, fired when its bit gets there
function suComboBite(c, i, cx, cy) {
  const e = c.e, a = c.ang + i * Math.PI / 2, x0 = cx + Math.cos(a) * e.r, y0 = cy + Math.sin(a) * e.r;
  suFxAdd('impale', { x: x0, y: y0, r: Math.max(12, e.r * 0.4), ang: a });
  for (let k = 0; k < 12; k++) {
    const aa = a + rnd(0.55, -0.55), sp = rnd(400, 140);
    spawnPart(x0, y0, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(3, 1.2), k % 3 ? (e.col || SU_COL) : SU_COL, rnd(0.45, 0.2), 0.9);
  }
}

/* a quarter of the boss, in its own frame: the torn point at 0,0 and the
   quarter opening along +x, 90° wide, out to the boss's own outline. Its two
   torn faces are the rip lines it shares with its neighbours. */
function suWedge(p, seed, rot, hot) {
  const er = p.er, n = p.sides || 8, k = Math.PI / n, seg = TAU / n, col = p.col || '#ef4444';
  const rAt = th => { const u = (((th - rot) % seg) + seg) % seg; return er * Math.cos(k) / Math.cos(u - k); };
  const la = (p.i + 3) % 4, lb = p.i, A = [], B = [];
  for (let j = 0; j <= 5; j++) {
    A.push(suRipPt(seed, la, j, j === 5 ? rAt(-Math.PI / 4) : er * j / 5, -Math.PI / 4, er));
    B.push(suRipPt(seed, lb, j, j === 5 ? rAt(Math.PI / 4) : er * j / 5, Math.PI / 4, er));
  }
  const rim = [];
  for (let s = 1; s < 16; s++) { const th = -Math.PI / 4 + s / 16 * Math.PI / 2, r = rAt(th); rim.push([Math.cos(th) * r, Math.sin(th) * r]); }
  const shape = () => {
    ctx.beginPath(); ctx.moveTo(A[0][0], A[0][1]);
    for (const q of A) ctx.lineTo(q[0], q[1]);
    for (const q of rim) ctx.lineTo(q[0], q[1]);
    for (let j = 5; j >= 0; j--) ctx.lineTo(B[j][0], B[j][1]);
    ctx.closePath();
  };
  shape(); ctx.fillStyle = 'rgba(5,6,10,0.92)'; ctx.fill();
  ctx.fillStyle = rgba(col, 0.24); ctx.fill();
  // the exposed core, burning from the torn point out
  ctx.save(); shape(); ctx.clip();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, er * 0.75);
  g.addColorStop(0, rgba('#fefce8', 0.55 * hot)); g.addColorStop(0.3, rgba(SU_COL, 0.4 * hot)); g.addColorStop(1, rgba(SU_COL, 0));
  ctx.fillStyle = g; ctx.fillRect(-er, -er, er * 2.2, er * 2);
  ctx.restore();
  // its plating, what is left of the outline
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(A[5][0], A[5][1]); for (const q of rim) ctx.lineTo(q[0], q[1]); ctx.lineTo(B[5][0], B[5][1]); ctx.stroke();
  // the torn faces
  for (const F of [A, B]) {
    ctx.beginPath(); F.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = rgba(SU_COL, 0.35 + 0.6 * hot); ctx.lineWidth = 1.5; ctx.stroke();
    if (hot > 0.5) { ctx.strokeStyle = rgba('#fefce8', (hot - 0.5) * 1.4); ctx.lineWidth = 0.7; ctx.stroke(); }
  }
  return rAt(0);
}

/* ART HOOK: the cue. A boss on the mane, in the air, at half or under, and X
   ready: an X is marked across it on the lines it will be ripped along, the
   four drills' exits tick out round it, and the key sits over it. */
function drawSuComboCue(e) {
  const y = e.y - SU_LIFT_H * (e.suLift || 0), a = Math.atan2(e.y - P.y, e.x - P.x);
  const pu = 0.5 + 0.5 * Math.sin(uiTime * 10);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([4, 5]); ctx.lineDashOffset = -uiTime * 40;
  ctx.strokeStyle = rgba(SU_COL, 0.35 + 0.35 * pu); ctx.lineWidth = 1.5;
  for (let l = 0; l < 2; l++) {
    const f = a + Math.PI / 4 + l * Math.PI / 2, ca = Math.cos(f), sa = Math.sin(f), L = e.r * 1.1;
    ctx.beginPath(); ctx.moveTo(e.x - ca * L, y - sa * L); ctx.lineTo(e.x + ca * L, y + sa * L); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 4; i++) {
    const f = a + i * Math.PI / 2, ca = Math.cos(f), sa = Math.sin(f), nx = -sa, ny = ca;
    const d = e.r + 9 + pu * 5, s = 5;
    ctx.strokeStyle = rgba(SU_COL, i % 2 ? 0.55 : 0.9);
    ctx.beginPath();
    ctx.moveTo(e.x + ca * d + nx * s, y + sa * d + ny * s); ctx.lineTo(e.x + ca * (d + s), y + sa * (d + s));
    ctx.lineTo(e.x + ca * d - nx * s, y + sa * d - ny * s); ctx.stroke();
  }
  const kw = 24, kh = 18, kx = e.x - kw / 2, ky = y - e.r - 38;
  ctx.fillStyle = 'rgba(6,10,6,0.85)'; roundRect(kx, ky, kw, kh, 3); ctx.fill();
  ctx.fillStyle = rgba(SU_COL, 0.1 + 0.12 * pu); roundRect(kx, ky, kw, kh, 3); ctx.fill();
  ctx.strokeStyle = SU_COL; ctx.lineWidth = 1.4; roundRect(kx, ky, kw, kh, 3); ctx.stroke();
  const gw = pu * 5;
  ctx.strokeStyle = rgba(SU_COL, 0.5 * (1 - pu)); ctx.lineWidth = 1.2;
  roundRect(kx - gw, ky - gw, kw + gw * 2, kh + gw * 2, 3 + gw); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = "800 11px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
  ctx.fillStyle = SU_COL; ctx.fillText('X', e.x, ky + kh / 2 + 0.5);
  ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
  ctx.fillStyle = rgba(SU_COL, 0.8); ctx.fillText('RIP', e.x, ky + kh + 3);
  ctx.restore();
}

/* ART HOOK: the four drills — all of them the mane. The one already in it is
   joined by a second, then two more: each leaves the nape, whips round and
   drives in along its arm, through the boss and out the other side, the rope
   hidden where it is inside. The boss cracks along the X between the four,
   hotter as the rip comes. Holding, the quarters hang skewered on the four
   ropes' ends; a thrown one's rope pulls back into the mane. */
const COMBO_REACH = 0.12;   // a new drill's flight, nape to boss
function drawSuCombo(c) {
  const hold = c.ph === 'hold', er = suComboEr(c), seed = suComboSeed(c);
  const cx = hold ? c.hx : c.e.x, cy = hold ? c.hy : c.e.y - SU_LIFT_H * (c.e.suLift || 1);
  const k = hold ? 1 : clamp(c.t / COMBO_RIP, 0, 1);
  const bx = hold ? cx : cx + Math.sin(uiTime * 90) * k * k * 1.8, by = hold ? cy : cy + Math.cos(uiTime * 77) * k * k * 1.8;
  c.bit = c.bit || [false, false, false, false];
  c._pose = c._pose || []; c._rel = c._rel || [];
  ctx.save();
  if (!hold) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'miter';
    for (let l = 0; l < 4; l++) {
      const phi = c.ang + Math.PI / 4 + l * Math.PI / 2, reach = 0.3 + 0.7 * rrEaseOut(k), pts = [];
      for (let j = 0; j <= 5; j++) { if (j / 5 > reach + 0.001) break; const q = suRipPt(seed, l, j, er * 1.02 * j / 5, phi, er); pts.push([bx + q[0], by + q[1]]); }
      const line = () => { ctx.beginPath(); pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); };
      line(); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 2.5 + k * 3; ctx.stroke();
      line(); ctx.strokeStyle = rgba(SU_COL, 0.5 + 0.5 * k * (0.8 + Math.sin(uiTime * 40 + l) * 0.2)); ctx.lineWidth = 1 + k * 1.6; ctx.stroke();
      if (k > 0.6) { line(); ctx.strokeStyle = rgba('#fefce8', (k - 0.6) * 2); ctx.lineWidth = 0.8; ctx.stroke(); }
    }
  }
  for (let i = 0; i < 4; i++) {
    let reach, pose = null;
    if (!hold) {
      const t0 = i === 0 ? -1 : i === 2 ? 0 : c.n < 4 ? Infinity : COMBO_FOUR;
      reach = i === 0 ? 1 : rrEaseIn(clamp((c.t - t0) / COMBO_REACH, 0, 1));
      if (reach >= 1 && !c.bit[i]) { c.bit[i] = true; suComboBite(c, i, bx, by); }
    } else {
      // the drill is its quarter's: wound back and snapped with it, and once
      // it has let go, home from where it let go
      const p = suPieces.find(q => q.combo === c && q.i === i);
      if (p && p.held) { reach = 1; if (p.th) pose = c._pose[i] = suPiecePose(p); }
      else {
        if (c._rel[i] === undefined) c._rel[i] = uiTime;
        reach = 1 - rrEaseIn(clamp((uiTime - c._rel[i]) / COMBO_FOLLOW, 0, 1));
        pose = c._pose[i] || null;
      }
    }
    if (reach <= 0) continue;
    let B;
    if (pose) {   // the curve's centre put back where it sits for the quarter's torn point
      const ux = Math.cos(pose.a), uy = Math.sin(pose.a), d = Math.max(10, er) * PIECE_OUT - er * 0.5;
      B = suComboCurve(c, i, pose.x - ux * d, pose.y - uy * d, pose.a);
    } else B = suComboCurve(c, i, bx, by);
    suComboRope(B, reach, hold ? null : [bx, by, er * 0.85], hold ? 26 : reach < 1 ? 62 : 40, hold ? 2.5 : 8, hold ? 0.6 : 1.2 * k, i === 0);
    if (!hold && reach >= 1) {
      const a = c.ang + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(bx + ca * er, by + sa * er, 12 + k * 8, SU_COL, 0.55 + 0.3 * k);   // out
      drawGlow(bx - ca * er, by - sa * er, 9 + k * 5, SU_COL, 0.4 + 0.3 * k);     // in
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  if (!hold) drawGlow(cx, cy, er * (1.2 + k * 1.4), SU_COL, 0.15 + 0.4 * k * k);
  else { drawGlow(cx, cy, 26, SU_COL, 0.45); drawGlow(cx, cy, 50, ONI_LIT, 0.22); }
  ctx.restore();
}

/* where a held quarter is drawn: its torn point, and the way it opens. Hung,
   out along its drill and sagging. Thrown (p.th), wherever the throw has it
   (p.x, p.y is its middle), turning as it is wound back and whipping round
   as it is snapped, so it leaves torn point first, as it flies. */
function suPiecePose(p) {
  const c = p.combo, er = p.er, sag = 1.5 + Math.sin(uiTime * 9 + p.i * 2) * 1.2;
  if (!p.th) {
    const ca = Math.cos(p.a), sa = Math.sin(p.a);
    const slide = c && c.ph === 'hold' ? rrEaseOut(clamp(c.t / 0.14, 0, 1)) : 1;
    const hx = c ? c.hx : p.x - ca * p.out, hy = c ? c.hy : p.y - sa * p.out;
    const d = (Math.max(10, er) * PIECE_OUT - er * 0.5) * slide;
    return { x: hx + ca * d, y: hy + sa * d + sag, a: p.a + Math.sin(uiTime * 7 + p.i) * 0.035 };
  }
  const th = p.th, u = th.ph === 'wind' ? 0.35 * rrEaseOut(clamp(th.t / THROW_WIND, 0, 1))
                                        : 0.35 + 0.65 * rrEaseIn(clamp(th.t / THROW_SNAP, 0, 1));
  let da = th.a + Math.PI - p.a;
  while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
  const a = p.a + da * u, ux = Math.cos(a), uy = Math.sin(a);
  return { x: p.x - ux * er * 0.5, y: p.y - uy * er * 0.5 + sag * (1 - u), a };
}

/* ART HOOK: a quarter. Held, it is skewered lengthwise on its arm: the shaft
   goes in at the torn point, the bit comes out through the rim, and it sags
   on the drill. Thrown, it flies torn point first, still burning. */
function drawSuPiece(p) {
  const c = p.combo, seed = c ? suComboSeed(c) : 1, er = p.er;
  ctx.save();
  if (p.held) {
    const q = suPiecePose(p), ca = Math.cos(q.a), sa = Math.sin(q.a);
    ctx.translate(q.x, q.y);
    ctx.rotate(q.a);
    const rimX = suWedge(p, seed, SU_RIP_ROT - p.a, 1);
    // where the drill goes in, and where the bit comes out through the plating
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(0, 0, 11, SU_COL, 0.7);
    drawGlow(rimX, 0, 13, SU_COL, 0.75 + Math.sin(uiTime * 25 + p.i) * 0.15);
    ctx.fillStyle = rgba('#fefce8', 0.8);
    ctx.fillRect(rimX - 1.5, -4.5, 3, 9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    if (FXO.parts && Math.random() < (p.th ? 0.6 : 0.25)) {   // it sheds as it hangs, and more as it is swung
      const u = rnd(0.9, 0.2), x = q.x + ca * er * u, y = q.y + sa * er * u;
      spawnPart(x, y, rnd(30, -30), rnd(160, 60), rnd(2.4, 1), Math.random() < 0.4 ? SU_COL : (p.col || SU_COL), rnd(0.5, 0.25), 0.96);
    }
    return;
  }
  const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, head = Math.atan2(uy, ux);
  const hot = clamp(1 - p.t / 0.6, 0.35, 1), TL = 80, wd = er * 0.45;
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(p.x, p.y, p.x - ux * TL, p.y - uy * TL);
  g.addColorStop(0, rgba(p.col || SU_COL, 0.4)); g.addColorStop(1, rgba(p.col || SU_COL, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(p.x - uy * wd, p.y + ux * wd); ctx.lineTo(p.x - ux * TL, p.y - uy * TL); ctx.lineTo(p.x + uy * wd, p.y - ux * wd); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(SU_COL, 0.55); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.x + ux * er * 0.5, p.y + uy * er * 0.5); ctx.lineTo(p.x - ux * TL * 0.8, p.y - uy * TL * 0.8); ctx.stroke();
  drawGlow(p.x, p.y, er * 0.9, SU_COL, 0.3 * hot);
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(p.x, p.y); ctx.rotate(head + Math.PI + Math.sin(p.t * 34 + p.i) * 0.07); ctx.translate(-er * 0.55, 0);
  suWedge(p, seed, SU_RIP_ROT - p.a, hot);
  ctx.restore();
  if (FXO.parts && Math.random() < 0.6)
    spawnPart(p.x, p.y, -ux * rnd(160, 40) + rnd(40, -40), -uy * rnd(160, 40) + rnd(40, -40), rnd(2.4, 1),
              Math.random() < 0.5 ? SU_COL : (p.col || SU_COL), rnd(0.35, 0.15), 0.9);
}

// the rip: four gold tears out along the X, and the white of it
function suRipMark(f, t) {
  const a = 1 - t;
  ctx.globalCompositeOperation = 'lighter';
  for (let l = 0; l < 4; l++) {
    const phi = f.ang + Math.PI / 4 + l * Math.PI / 2, ca = Math.cos(phi), sa = Math.sin(phi), nx = -sa, ny = ca;
    const L0 = f.r * (0.2 + t * 0.9), L1 = f.r * (1.1 + rrEaseOut(t) * 2.4), w = 5 * a + 0.5;
    const mid = (L0 + L1) / 2;
    ctx.fillStyle = rgba(l % 2 ? SU_COL : '#fefce8', a);
    ctx.beginPath();
    ctx.moveTo(f.x + ca * L0, f.y + sa * L0);
    ctx.lineTo(f.x + ca * mid + nx * w, f.y + sa * mid + ny * w);
    ctx.lineTo(f.x + ca * L1, f.y + sa * L1);
    ctx.lineTo(f.x + ca * mid - nx * w, f.y + sa * mid - ny * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = rgba(SU_COL, a * 0.7); ctx.lineWidth = 4 * a + 0.5;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + rrEaseOut(t) * 1.8), 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(f.col || ONI_LIT, a * 0.5); ctx.lineWidth = 2 * a + 0.5;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.8 + rrEaseOut(t) * 1.1), 0, TAU); ctx.stroke();
  drawGlow(f.x, f.y, f.r * (2.6 - t), SU_COL, 0.8 * a);
  drawGlow(f.x, f.y, f.r * 1.2, '#fefce8', 0.6 * a * a);
}

// thrown: the whip off the end of the drill
function suThrowMark(f, t) {
  const a = 1 - t;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(ONI_PALE, a * 0.9); ctx.lineWidth = 3 * a + 0.5;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + t * 2), f.ang + Math.PI - 1, f.ang + Math.PI + 1); ctx.stroke();
  const ca = Math.cos(f.ang), sa = Math.sin(f.ang), L = f.r * (1.5 + t * 4);
  const g = ctx.createLinearGradient(f.x, f.y, f.x + ca * L, f.y + sa * L);
  g.addColorStop(0, rgba(SU_COL, a)); g.addColorStop(1, rgba(SU_COL, 0));
  ctx.strokeStyle = g; ctx.lineWidth = 2.5 * a + 0.5;
  ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + ca * L, f.y + sa * L); ctx.stroke();
}

// landed: the splash of it, on the floor
function suLodgeFloor(f, t) {
  const u = clamp(t / 0.5, 0, 1); if (u >= 1) return;
  ctx.globalCompositeOperation = 'lighter';
  const q = rrEaseOut(u), a = Math.pow(1 - u, 1.5);
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 4 * a + 0.5;
  ctx.beginPath(); ctx.arc(f.x, f.y, 8 + (PIECE_SPLASH - 8) * q, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(f.p.col || ONI_LIT, a * 0.5); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(f.x, f.y, 8 + (PIECE_SPLASH - 8) * q * 0.7, 0, TAU); ctx.stroke();
}
/* landed: the quarter driven into what it hit, torn point first — buried to
   a third of its length, the rest standing out the way it came — cracks
   running out of the wound; then it shatters */
function suLodgeMark(f, t) {
  const e = f.e, alive = e && !e.dead && enemies.includes(e);
  if (alive) { f.ex = e.x; f.ey = e.y; }
  const ex = f.ex, ey = f.ey, er = f.er, pr = f.p.er;
  const ux = Math.cos(f.ang), uy = Math.sin(f.ang);
  const kick = 1 - rrEaseOut(clamp(t / 0.12, 0, 1));             // driven in, the first frames
  const ax = ex - ux * (er * 0.3 - kick * er * 0.5), ay = ey - uy * (er * 0.3 - kick * er * 0.5);
  const jit = (1 - t) * 1.6, sx = Math.sin(uiTime * 80) * jit, sy = Math.cos(uiTime * 70) * jit;
  const shatter = t > 0.62;
  if (shatter && !f.sh) {
    f.sh = true;
    if (FXO.parts) for (let i = 0; i < 22; i++) {
      const a = f.ang + Math.PI + rnd(1.3, -1.3), s = rnd(320, 90), d = rnd(pr, 0);
      spawnPart(ax - ux * d, ay - uy * d, Math.cos(a) * s, Math.sin(a) * s, rnd(3.2, 1.2),
                i % 3 ? (f.p.col || SU_COL) : SU_COL, rnd(0.5, 0.25), 0.9);
    }
  }
  // cracks out of the wound, over the body
  ctx.lineCap = 'round';
  const ca = clamp(1 - t * 1.2, 0, 1);
  if (ca > 0) {
    for (let i = 0; i < 5; i++) {
      const a = f.ang + (i - 2) * 0.55 + (rrHash(f.seed + i) - 0.5) * 0.3, L = er * (0.35 + rrHash(f.seed + i * 3) * 0.45);
      const bx = ax + ux * er * 0.1, by = ay + uy * er * 0.1;
      ctx.strokeStyle = 'rgba(0,0,0,' + 0.7 * ca + ')'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a) * L, by + Math.sin(a) * L); ctx.stroke();
      ctx.strokeStyle = rgba(SU_COL, ca); ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (!shatter || rrHash(Math.floor(uiTime * 40)) > (t - 0.62) * 3) {
    ctx.save();
    ctx.globalAlpha = shatter ? clamp(1 - (t - 0.62) / 0.3, 0, 1) : 1;
    // what is inside the body is not seen
    ctx.beginPath(); ctx.rect(ex - 4000, ey - 4000, 8000, 8000); ctx.arc(ex, ey, er * 0.92, 0, TAU); ctx.clip('evenodd');
    ctx.translate(ax + sx, ay + sy); ctx.rotate(f.ang + Math.PI);
    suWedge(f.p, f.seed, SU_RIP_ROT - f.p.a, clamp(1 - t * 1.3, 0.2, 1));
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  const bx = ex - ux * er * 0.9, by = ey - uy * er * 0.9;
  drawGlow(bx, by, 14 + (1 - t) * 14, SU_COL, 0.7 * (1 - t));
  if (t < 0.15) drawGlow(ex, ey, er * 2.2, '#fefce8', 0.5 * (1 - t / 0.15));
}

/* ART HOOK moments. */
function suComboPierce(c, n) {
  c.n = n; c.er = c.e.r; suComboSeed(c);
  const e = c.e, y = e.y - SU_LIFT_H * (e.suLift || 1);
  // the hull grows them: the mane throws out a new drill (two for the second pair)
  const oa = oni.t >= 0 ? oni.ang : P.ang;
  for (let k = 0; k < 10; k++) {
    const a = oa + Math.PI + rnd(1.2, -1.2), sp = rnd(220, 80);
    spawnPart(P.x - Math.cos(oa) * 10, P.y - Math.sin(oa) * 10, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2.2, 1), k % 3 ? ONI_LIT : SU_COL, rnd(0.35, 0.15), 0.9);
  }
  suImpact(n === 2 ? 'impale' : 'pierce', e.x, y, e.r);
  shake(n === 2 ? 0.6 : 0.9);
  Audio_.tone(n === 2 ? 180 : 140, 0.2, 'square', 0.08, 90);
}
function suComboRipFx(c, x, y) {
  const er = suComboEr(c), col = c.e.col;
  drawFlashT = Math.max(drawFlashT, 0.06);
  suFxAdd('rip', { x, y, r: er, ang: c.ang, seed: suComboSeed(c), col });
  for (let i = 0; i < 44; i++) {   // what comes out of it, mostly along the tears
    const l = i % 4, a = c.ang + Math.PI / 4 + l * Math.PI / 2 + rnd(0.5, -0.5), s = rnd(460, 120);
    spawnPart(x + Math.cos(a) * er * 0.5, y + Math.sin(a) * er * 0.5, Math.cos(a) * s, Math.sin(a) * s, rnd(3.6, 1.4),
              i % 3 ? (col || SU_COL) : i % 6 ? SU_COL : '#fefce8', rnd(0.7, 0.3), 0.9);
  }
  floatText(x, y - er - 30, 'RIPPED', SU_COL, 18);
  suImpact('rip', x, y, er);
  shake(1.8);
  Audio_.boom(); Audio_.boss();
}
function suComboThrowFx(p) {
  const a = Math.atan2(p.vy, p.vx);
  suFxAdd('throw', { x: p.x, y: p.y, r: p.er * 0.5, ang: a });
  for (let i = 0; i < 8; i++) {
    const aa = a + Math.PI + rnd(0.8, -0.8), s = rnd(240, 80);
    spawnPart(p.x, p.y, Math.cos(aa) * s, Math.sin(aa) * s, rnd(2.2, 1), i % 2 ? ONI_LIT : SU_COL, rnd(0.3, 0.15), 0.9);
  }
  shake(0.25);
  Audio_.tone(420, 0.1, 'sawtooth', 0.06, 900);
}
function suPieceHitFx(p, e) {
  const a = Math.atan2(p.vy, p.vx);
  suFxAdd('lodge', { x: p.x, y: p.y, e, ex: e.x, ey: e.y, er: e.r, ang: a,
                     p: { er: p.er, sides: p.sides, col: p.col, i: p.i, a: p.a }, seed: p.combo ? suComboSeed(p.combo) : 1 });
  for (let i = 0; i < 18; i++) {   // through and out the far side
    const aa = a + rnd(0.6, -0.6), s = rnd(420, 140);
    spawnPart(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r, Math.cos(aa) * s, Math.sin(aa) * s, rnd(3, 1.2),
              i % 3 ? (e.col || SU_COL) : SU_COL, rnd(0.45, 0.2), 0.9);
  }
  suImpact('piece', e.x, e.y, e.r);
  shake(0.5);
  Audio_.boom();
}

/* ===========================================================================
   SUPERUSER · C — DRAIN — art
   Replaces the placeholder block "C — DRAIN, art hooks" in index.html:
   drawSuDrain and the bodies of suDrainCast / suDrainBite / suDrainTake /
   suDrainPaid.

   The idea: the mane parts into one lock per soldier. Each leaves its own root
   across the nape, whips back and round, and sinks a bone fang into its body.
   Then it drinks: gulps swell down the lock from the body to the hull, green
   going gold as they come; the body goes dark from the inside out, its code
   pulled off it into the wound, its ring of cells going out one by one. Dry,
   it crumples to nothing and the locks come home slack.
=========================================================================== */
const DRAIN_GULP = 2.6;     // gulps a second, each lock

// the order the locks leave the nape in: by where each soldier stands round the hull
function suDrainOrder(dr) {
  if (dr._ord && dr._ord.length === dr.bodies.length) return dr._ord;
  const oa = oni.t >= 0 ? oni.ang : P.ang;
  const rel = b => { let a = Math.atan2(b.y - P.y, b.x - P.x) - oa; while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };
  const idx = dr.bodies.map((b, i) => [rel(b), i]).sort((p, q) => p[0] - q[0]);
  const ord = new Array(dr.bodies.length);
  idx.forEach(([, i], r) => { ord[i] = r; });
  return (dr._ord = ord);
}
// lock i of n: its root on the nape, out of the back and round to the side the body is on
function suDrainCurve(i, n, tx, ty) {
  const oa = oni.t >= 0 ? oni.ang : P.ang, ca = Math.cos(oa), sa = Math.sin(oa), nx = -sa, ny = ca;
  const fan = n > 1 ? i / (n - 1) - 0.5 : 0;
  const th = Math.PI - fan * 2.2, rx = -3 + Math.cos(th) * 7, ry = Math.sin(th) * 8.5;
  const x0 = P.x + ca * rx - sa * ry, y0 = P.y + sa * rx + ca * ry;
  const dx = tx - x0, dy = ty - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const cr = ca * uy - sa * ux, s = Math.abs(cr) > 0.15 ? Math.sign(cr) : (fan >= 0 ? 1 : -1);
  const back = 24 + 22 * Math.abs(fan), lead = Math.min(L * 0.45, 110), bow = Math.min(L * 0.18, 42);
  return [x0, y0,
          x0 - ca * back + nx * s * (14 + 20 * Math.abs(fan)), y0 - sa * back + ny * s * (14 + 20 * Math.abs(fan)),
          tx - ux * lead + nx * s * bow, ty - uy * lead + ny * s * bow,
          tx, ty];
}

/* one lock: a tapered ribbon along B to reach of it, two strands twisting in
   it, a bone fang on its end. o.pulse: gulp positions, 0 at the nape, 1 at the
   fang. o.slack: it whips and sags. o.hide: the body it is sunk in, where it is
   not seen. Returns where it enters the body (or its tip). */
function suDrainLock(B, reach, o) {
  if (reach <= 0.01) return null;
  const N = 30, pts = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const u = reach * i / N, p = rrBez(B, u);
    if (o.slack) {
      const w = Math.sin(u * Math.PI * 2.6 - uiTime * 22 + B[0] * 0.1) * 7 * o.slack * Math.sin(u * Math.PI);
      const q = rrBez(B, Math.min(1, u + 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      p[0] += -dy / l * w; p[1] += dx / l * w;
    }
    if (o.taut) { const j = Math.sin(u * Math.PI) * Math.sin(uiTime * 80 + u * 11 + B[0]) * o.taut; p[0] += j; p[1] -= j; }
    pts.push(p);
    if (i) acc.push(acc[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
  }
  const tot = acc[N]; if (tot < 3) return null;
  const pulse = o.pulse || [];
  const wAt = i => {
    const f = i / N;
    let w = lerp(3.3, 1.6, f) * (o.thin || 1);
    for (const pu of pulse) w += 2.8 * Math.exp(-((f - pu) * (f - pu)) / 0.0035) * (o.thin || 1);
    return w;
  };
  const nrm = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  let entry = pts[N];
  if (o.hide) { for (let i = 0; i <= N; i++) if (Math.hypot(pts[i][0] - o.hide[0], pts[i][1] - o.hide[1]) < o.hide[2]) { entry = pts[i]; break; } }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = o.a == null ? 1 : o.a;
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 5;
  ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = pts[i][0] + 4, y = pts[i][1] + 6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  if (o.hide) { ctx.beginPath(); ctx.rect(o.hide[0] - 4000, o.hide[1] - 4000, 8000, 8000); ctx.arc(o.hide[0], o.hide[1], o.hide[2], 0, TAU); ctx.clip('evenodd'); }
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) { const [nx, ny] = nrm(i), w = wAt(i); Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]); }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (const q of Lp) ctx.lineTo(q[0], q[1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_DEEP; ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 0.7; ctx.stroke();
  // two strands twisting down it
  const spin = o.spin || 16;
  for (let k = 0; k < 2; k++) for (let i = 1; i <= N; i++) {
    const ph = acc[i] * 0.34 - uiTime * spin + k * Math.PI;
    if (Math.cos(ph) <= 0) continue;
    const [nx, ny] = nrm(i), [mx, my] = nrm(i - 1), w = wAt(i);
    const o0 = Math.sin(ph - (acc[i] - acc[i - 1]) * 0.34) * w * 0.5, o1 = Math.sin(ph) * w * 0.5;
    ctx.strokeStyle = k ? ONI_MID : ONI_LIT; ctx.lineWidth = w * 0.55;
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0] + mx * o0, pts[i - 1][1] + my * o0); ctx.lineTo(pts[i][0] + nx * o1, pts[i][1] + ny * o1); ctx.stroke();
  }
  // the gulps: a bright drop in each swelling, green off the body, gold at the hull
  if (pulse.length) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(SU_COL, 0.28); ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i <= N; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
    for (const pu of pulse) {
      if (pu <= 0 || pu >= 1) continue;
      const fi = pu * N, i0 = Math.floor(fi), i1 = Math.min(N, i0 + 1), m = fi - i0;
      const x = lerp(pts[i0][0], pts[i1][0], m), y = lerp(pts[i0][1], pts[i1][1], m);
      const col = pu > 0.45 ? HACK_COL : SU_COL;
      drawGlow(x, y, 9, col, 0.55 * (o.gulpA == null ? 1 : o.gulpA));
      ctx.fillStyle = rgba('#fefce8', 0.85 * (o.gulpA == null ? 1 : o.gulpA));
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  if (o.gold) {   // strained: gold down its length
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(SU_COL, o.gold * (0.7 + Math.sin(uiTime * 40 + B[0]) * 0.2)); ctx.lineWidth = 1.4;
    ctx.beginPath(); for (let i = 0; i <= N; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  // the fang: bone, hooked, a gold point
  const tip = pts[N], b0 = pts[N - 2], ang = Math.atan2(tip[1] - b0[1], tip[0] - b0[0]);
  ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  const fl = 11, fw = 3.4;
  ctx.beginPath(); ctx.moveTo(-fl, -fw); ctx.quadraticCurveTo(-fl * 0.35, -fw * 1.1, 0, 0); ctx.quadraticCurveTo(-fl * 0.5, fw * 0.4, -fl, fw); ctx.closePath();
  ctx.fillStyle = ONI_BONE; ctx.fill();
  ctx.strokeStyle = ONI_DARK; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = SU_COL; ctx.beginPath(); ctx.moveTo(-3.2, -1.3); ctx.lineTo(0, 0); ctx.lineTo(-3.2, 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = ONI_DARK; ctx.strokeStyle = rgba(SU_COL, 0.85); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.ellipse(-fl, 0, 1.6, fw + 0.8, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (o.hot) { ctx.globalCompositeOperation = 'lighter'; drawGlow(tip[0], tip[1], 12, SU_COL, 0.5 * o.hot); }
  ctx.restore();
  return entry;
}

/* the body on the end of a lock, emptying. k: 0 full → 1 dry. It darkens from
   the inside, its ring of twelve cells goes out toward the wound, and its code
   is pulled off it into the lock. */
function suDrainBody(b, k, ex, ey) {
  const e = b.e, r = e.r, id = e.id || 0;
  const ea = Math.atan2(ey - b.y, ex - b.x);
  ctx.save();
  // hollowed: dark from the middle out
  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 1.25);
  g.addColorStop(0, 'rgba(5,6,10,' + 0.94 * k + ')'); g.addColorStop(0.84, 'rgba(5,6,10,' + 0.8 * k + ')'); g.addColorStop(1, 'rgba(5,6,10,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, r * 1.25, 0, TAU); ctx.fill();
  // its husk: a grey outline, cracked, coming up as it empties
  ctx.strokeStyle = rgba('#64748b', 0.85 * k); ctx.lineWidth = 1.6; ctx.setLineDash([r * 0.5, 3, r * 0.2, 4]);
  ctx.lineDashOffset = id * 7;
  ctx.beginPath(); ctx.arc(b.x, b.y, r + 1.5, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // twelve cells; the lit ones hold toward the wound and go out from the far side
  const n = 12, R = r + 15, lit = (1 - k) * n, sg = TAU / n;
  ctx.lineCap = 'butt';
  for (let j = 0; j < n; j++) {
    const off = j - (n - 1) / 2, rank = Math.abs(off);                 // 0 nearest the wound
    const a0 = ea + off * sg - sg * 0.38;
    const f = clamp(lit / 2 - (rank - 0.5), 0, 1);                      // far cells go first
    ctx.strokeStyle = 'rgba(100,116,139,0.28)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, R, a0, a0 + sg * 0.76); ctx.stroke();
    if (f > 0) {
      ctx.strokeStyle = f < 1 ? rgba(HACK_COL, 0.4 + Math.sin(uiTime * 30 + j) * 0.3) : HACK_COL;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, a0, a0 + sg * 0.76); ctx.stroke();
    }
  }
  // its code, pulled off it and into the wound
  ctx.globalCompositeOperation = 'lighter';
  ctx.font = '700 8px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let j = 0; j < 5; j++) {
    const u = (uiTime * 1.7 + j / 5 + id * 0.13) % 1, s0 = rrHash(id * 9 + j + Math.floor(uiTime * 1.7 + j / 5 + id * 0.13));
    const a = ea + Math.PI + (s0 - 0.5) * 3.4, sx = b.x + Math.cos(a) * r * 0.8, sy = b.y + Math.sin(a) * r * 0.8;
    const m = rrEaseIn(u);
    ctx.fillStyle = rgba(u > 0.7 ? SU_COL : HACK_COL, (1 - k * 0.7) * Math.sin(u * Math.PI) * 0.95);
    ctx.fillText(s0 > 0.5 ? '1' : '0', lerp(sx, ex, m), lerp(sy, ey, m));
  }
  drawGlow(b.x, b.y, r * 1.5 * (1 - k) + 3, HACK_COL, 0.35 * (1 - k));
  // the wound: gold, throbbing with each gulp
  const th = 0.5 + 0.5 * Math.sin((b._ph || 0) * TAU);
  drawGlow(ex, ey, 9 + th * 6, SU_COL, 0.55 + th * 0.3);
  ctx.restore();
}

/* ART HOOK: the drain. One lock to each soldier; 'reach' they whip out and
   sink in, 'drain' they drink, 'back' they come home slack. */
function drawSuDrain(dr) {
  const ord = suDrainOrder(dr), n = dr.bodies.length;
  const oa = oni.t >= 0 ? oni.ang : P.ang;
  const nape = [P.x - Math.cos(oa) * 10, P.y - Math.sin(oa) * 10];
  let arrive = 0, given = 0, due = 0;
  for (let bi = 0; bi < n; bi++) {
    const b = dr.bodies[bi], i = ord[bi], e = b.e;
    if (dr.ph === 'drain' && b.gone && !b._gt) b._gt = uiTime;               // killed off it: this lock lets go now
    const tx = b.x + Math.cos(Math.atan2(b.y - P.y, b.x - P.x)) * e.r * 0.25, ty = b.y + Math.sin(Math.atan2(b.y - P.y, b.x - P.x)) * e.r * 0.25;
    const B = suDrainCurve(i, n, tx, ty);
    given += b.healed; due += b.heal;
    if (b._gt) {
      const u = (uiTime - b._gt) / 0.24; if (u >= 1) continue;
      suDrainLock(B, 1 - rrEaseIn(u), { slack: 1, a: 1 - u * 0.5, thin: 0.85 });
      continue;
    }
    if (dr.ph === 'reach') {
      const u = clamp(dr.t / DRAIN_REACH, 0, 1);
      suDrainLock(B, rrEaseOut(u), { slack: (1 - u) * 1.3, spin: 30, hot: 1 });
    } else if (dr.ph === 'drain') {
      const k = clamp(dr.t / DRAIN_LEN, 0, 1);
      b._ph = dr.t * DRAIN_GULP + i * 0.37;
      const pulse = [];
      for (let j = 0; j < 3; j++) { const pu = 1 - ((b._ph + j / 3) % 1); pulse.push(pu); if (pu < 0.06) arrive += 1 - pu / 0.06; }
      const hide = [b.x, b.y, e.r * 0.92];
      const entry = suDrainLock(B, 1, { pulse, hide, taut: 0.6, spin: 12, gulpA: 1 - k * 0.35 });
      if (entry) suDrainBody(b, k, entry[0], entry[1]);
      if (FXO.parts && Math.random() < 0.12 && entry)
        spawnPart(entry[0], entry[1], rnd(40, -40), rnd(40, -40), rnd(1.8, 0.8), Math.random() < 0.3 ? SU_COL : HACK_COL, rnd(0.35, 0.15), 0.9);
    } else {
      const u = clamp(dr.t / DRAIN_BACK, 0, 1);
      suDrainLock(B, 1 - rrEaseIn(u), { slack: 0.8 + u * 0.4, a: 1 - u * 0.4, thin: 0.9 });
    }
  }
  // at the nape: it swallows, and fills
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (dr.ph === 'drain') {
    const full = due > 0 ? given / due : 0;
    drawGlow(nape[0], nape[1], 12 + full * 14 + Math.min(1.5, arrive) * 6, SU_COL, 0.3 + Math.min(1, arrive) * 0.4);
    drawGlow(P.x, P.y, 30 + full * 16, COL.hp, 0.12 + full * 0.18);
  } else if (dr.ph === 'reach') drawGlow(nape[0], nape[1], 16, SU_COL, 0.5 * (1 - dr.t / DRAIN_REACH));
  ctx.restore();
}

// the cast: brackets snap onto every soldier the mane is going for
function suDrainCastMark(f, t) {
  const a = 1 - t, q = rrEaseOut(clamp(t / 0.5, 0, 1));
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'square';
  for (const s of f.list) {
    const R = lerp(s.r * 2.6, s.r + 7, q), L = Math.max(5, s.r * 0.45);
    ctx.strokeStyle = rgba(t < 0.25 ? '#fefce8' : SU_COL, a); ctx.lineWidth = 1.6;
    for (let c = 0; c < 4; c++) {
      const sx = c % 2 ? 1 : -1, sy = c < 2 ? -1 : 1, x = s.x + sx * R, y = s.y + sy * R;
      ctx.beginPath(); ctx.moveTo(x - sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * L); ctx.stroke();
    }
  }
  const nx = P.x - Math.cos(f.ang) * 10, ny = P.y - Math.sin(f.ang) * 10;
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(nx, ny, 26 * (1 - q) + 6, 0, TAU); ctx.stroke();
}
// dry: the husk crumples in on itself toward the lock, and a last streak runs home
function suDrainHuskMark(f, t) {
  const a = 1 - t, c = rrEaseIn(clamp(t / 0.7, 0, 1)), R = f.r * (1 - c);
  const ux = Math.cos(f.ang), uy = Math.sin(f.ang);
  const cx = f.x + ux * f.r * 0.5 * c, cy = f.y + uy * f.r * 0.5 * c;
  if (R > 0.5) {
    ctx.beginPath();
    for (let j = 0; j < 9; j++) {
      const th = j / 9 * TAU + t * 3, rr = R * (0.55 + rrHash(f.seed + j) * 0.45 * (1 - c * 0.5) + (j % 2 ? 0 : 0.2) * c);
      const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(5,6,10,' + 0.85 * a + ')'; ctx.fill();
    ctx.strokeStyle = rgba('#94a3b8', a); ctx.lineWidth = 1.5; ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  if (t < 0.2) drawGlow(f.x, f.y, f.r * 2, HACK_COL, 0.6 * (1 - t / 0.2));
  const L = f.r * (1.2 + t * 4), g = ctx.createLinearGradient(cx, cy, cx + ux * L, cy + uy * L);
  g.addColorStop(0, rgba(SU_COL, a)); g.addColorStop(1, rgba(SU_COL, 0));
  ctx.strokeStyle = g; ctx.lineWidth = 2.4 * a + 0.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + ux * L, cy + uy * L); ctx.stroke();
}
// paid: it all comes in on the hull — rings closing on it, green then gold
function suDrainPaidMark(f, t) {
  ctx.globalCompositeOperation = 'lighter';
  for (const [d, col, w] of [[0, COL.hp, 3.5], [0.14, SU_COL, 2.5], [0.28, '#fefce8', 1.5]]) {
    const u = clamp((t - d) / 0.55, 0, 1); if (u <= 0 || u >= 1) continue;
    const q = rrEaseIn(u);
    ctx.strokeStyle = rgba(col, Math.sin(u * Math.PI) * 0.9); ctx.lineWidth = w;
    ctx.beginPath(); ctx.arc(P.x, P.y, lerp(96, 14, q), 0, TAU); ctx.stroke();
  }
  const a = clamp(1 - t * 1.4, 0, 1);
  drawGlow(P.x, P.y, 40 + (1 - a) * 20, COL.hp, 0.5 * a);
  if (t > 0.45) drawGlow(P.x, P.y, 26, SU_COL, 0.6 * clamp(1 - (t - 0.45) / 0.45, 0, 1));
}

/* ART HOOK moments. */
function suDrainCast(dr) {
  const oa = oni.t >= 0 ? oni.ang : P.ang;
  suFxAdd('drcast', { ang: oa, list: dr.bodies.map(b => ({ x: b.x, y: b.y, r: b.e.r })) });
  if (FXO.parts) for (let k = 0; k < 14; k++) {
    const a = oa + Math.PI + rnd(1.4, -1.4), sp = rnd(240, 80);
    spawnPart(P.x - Math.cos(oa) * 10, P.y - Math.sin(oa) * 10, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2.2, 1), k % 3 ? ONI_LIT : SU_COL, rnd(0.35, 0.15), 0.9);
  }
  shake(0.3);
  Audio_.tone(260, 0.22, 'sawtooth', 0.07, 520);
}
function suDrainBite(dr, b) {
  const a = Math.atan2(b.y - P.y, b.x - P.x), x = b.x - Math.cos(a) * b.e.r * 0.9, y = b.y - Math.sin(a) * b.e.r * 0.9;
  suFxAdd('impale', { x, y, r: Math.max(8, b.e.r * 0.5), ang: a });
  if (FXO.parts) for (let k = 0; k < 8; k++) {
    const aa = a + rnd(0.7, -0.7), sp = rnd(260, 90);
    spawnPart(x, y, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(2.4, 1), k % 3 ? HACK_COL : SU_COL, rnd(0.35, 0.15), 0.9);
  }
  if (b === dr.bodies[0]) { shake(0.25); Audio_.tone(150, 0.12, 'square', 0.06, 80); }
}
function suDrainTake(dr, b) {
  const a = Math.atan2(P.y - b.y, P.x - b.x);
  suFxAdd('husk', { x: b.x, y: b.y, r: b.e.r, ang: a, seed: (b.e.id || 1) * 3 });
  if (FXO.parts) for (let k = 0; k < 14; k++) {       // the last of it, sucked home
    const aa = a + rnd(0.9, -0.9), sp = rnd(320, 80);
    spawnPart(b.x + rnd(b.e.r, -b.e.r) * 0.6, b.y + rnd(b.e.r, -b.e.r) * 0.6, Math.cos(aa) * sp, Math.sin(aa) * sp,
              rnd(2.4, 1), k % 4 ? '#64748b' : HACK_COL, rnd(0.45, 0.2), 0.9);
  }
}
function suDrainPaid(dr) {
  const hp = Math.round(dr.hp), xp = Math.round(dr.xp);
  if (dr.noHeal) floatText(P.x, P.y - 62, 'NOTHING HEALS', '#64748b', 13);
  else if (hp > 0) floatText(P.x, P.y - 62, '+' + hp + ' HP', COL.hp, 16);
  if (xp > 0) floatText(P.x, P.y - 46, '+' + xp + ' XP', COL.xp, 14);
  if (dr.cr > 0) floatText(P.x, P.y - 30, '+' + dr.cr + ' \u25C8', '#fde68a', 14);
  suFxAdd('paid', {});
  if (FXO.parts) for (let k = 0; k < 24; k++) {
    const a = rnd(TAU), d = rnd(90, 50);
    spawnPart(P.x + Math.cos(a) * d, P.y + Math.sin(a) * d, -Math.cos(a) * d * 3, -Math.sin(a) * d * 3, rnd(2.4, 1),
              k % 3 ? COL.hp : SU_COL, rnd(0.3, 0.2), 0.86);
  }
  shake(0.5);
  Audio_.heal();
}

/* ===========================================================================
   SUPERUSER · C → Z — COMBO #2 — FLING — art
   Replaces the placeholder block "COMBO #2 — FLING, art hooks".

   The drain's locks do not let go. Marked at Z, each soldier's ring turns
   gold; dry, its husk — the dark shell of it, gold seams where it cracked —
   is yanked in off the floor to hang behind the hull on the lock that drank
   it, and each is wound back and snapped off at what is still fighting. It
   bursts where it lands into grey shards and dust.
=========================================================================== */

// a husk's outline, in its own frame: the soldier's shape, dented and cracked
function suHuskPath(p, R) {
  const n = Math.max(3, p.sides || 6), id = p.id || 1;
  ctx.beginPath();
  for (let j = 0; j < n * 2; j++) {
    const a = j / (n * 2) * TAU, corner = j % 2 === 0;
    const r = R * (corner ? 0.86 + rrHash(id * 7 + j) * 0.14 : 0.62 + rrHash(id * 5 + j) * 0.22);
    j ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

/* ART HOOK: the cue. Offered, the [Z] key over the hull and a gold hook ticking
   on every soldier still on a lock; taken, the key locks to FLING and the
   soldiers are ringed in gold — kept. */
function drawSuFlingCue(dr) {
  const pu = 0.5 + 0.5 * Math.sin(uiTime * 10), took = !!dr.fling;
  ctx.save();
  ctx.lineCap = 'round';
  for (const b of dr.bodies) {
    if (b.gone) continue;
    const r = b.e.r, a = Math.atan2(b.y - P.y, b.x - P.x);
    if (took) {
      ctx.setLineDash([5, 4]); ctx.lineDashOffset = -uiTime * 30;
      ctx.strokeStyle = rgba(SU_COL, 0.75); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, r + 22, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // a hook on its far side: it is coming back this way
    const d = r + 22 + (took ? 0 : pu * 4), ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, s = 5;
    ctx.strokeStyle = rgba(SU_COL, took ? 1 : 0.4 + 0.5 * pu); ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(b.x + ca * (d + s) + nx * s, b.y + sa * (d + s) + ny * s);
    ctx.lineTo(b.x + ca * d, b.y + sa * d);
    ctx.lineTo(b.x + ca * (d + s) - nx * s, b.y + sa * (d + s) - ny * s); ctx.stroke();
  }
  const kw = took ? 40 : 24, kh = 18, kx = P.x - kw / 2, ky = P.y - 70;
  ctx.fillStyle = 'rgba(6,10,6,0.85)'; roundRect(kx, ky, kw, kh, 3); ctx.fill();
  ctx.fillStyle = rgba(SU_COL, took ? 0.22 : 0.1 + 0.12 * pu); roundRect(kx, ky, kw, kh, 3); ctx.fill();
  ctx.strokeStyle = SU_COL; ctx.lineWidth = 1.4; roundRect(kx, ky, kw, kh, 3); ctx.stroke();
  if (!took) {
    const gw = pu * 5;
    ctx.strokeStyle = rgba(SU_COL, 0.5 * (1 - pu)); ctx.lineWidth = 1.2;
    roundRect(kx - gw, ky - gw, kw + gw * 2, kh + gw * 2, 3 + gw); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = "800 11px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = SU_COL; ctx.fillText(took ? 'FLING' : 'Z', P.x, ky + kh / 2 + 0.5);
  if (!took) {
    ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
    ctx.fillStyle = rgba(SU_COL, 0.8); ctx.fillText('KEEP', P.x, ky + kh + 3);
  }
  ctx.restore();
}

/* ART HOOK: the locks, carried straight on from the drain. Reeled, they haul
   taut; hung, they sag; wound and snapped, they strain gold; let go, they
   come home slack. */
function drawSuFling(f) {
  for (const p of f.list) {
    let reach = 1;
    if (p.held) {
      const a = Math.atan2(p.y - P.y, p.x - P.x);
      p._lx = p.x + Math.cos(a) * p.er * 0.25; p._ly = p.y + Math.sin(a) * p.er * 0.25;
    } else {
      if (p._relAt === undefined) p._relAt = uiTime;
      const u = (uiTime - p._relAt) / COMBO_FOLLOW;
      if (u >= 1) continue;
      reach = 1 - rrEaseIn(u);
    }
    if (p._lx === undefined) continue;
    const reel = f.ph === 'reel', th = p.th, snap = th && th.ph === 'snap';
    suDrainLock(suDrainCurve(p.lock, f.n, p._lx, p._ly), reach, {
      slack: p.held ? (reel ? 0.15 : th ? (snap ? 0 : 0.1) : 0.45) : 1.1,
      taut: p.held ? (reel ? 1.2 : th ? (snap ? 2 : 1) : 0) : 0,
      spin: reel ? 34 : th ? 28 : 12,
      gold: p.held ? (reel ? 0.6 : th ? (snap ? 1 : 0.7) : 0.25) : 0,
      hide: p.held ? [p.x, p.y, p.er * 0.85] : null, a: p.held ? 1 : 0.8, thin: p.boss ? 1.3 : 1 });
  }
  const oa = oni.t >= 0 ? oni.ang : P.ang;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x - Math.cos(oa) * 10, P.y - Math.sin(oa) * 10, 16, SU_COL, f.ph === 'back' ? 0.2 : 0.45);
  ctx.restore();
}

/* ART HOOK: a husk. The dark shell of what it was, dented, gold where it split.
   Reeled, it drags a smear off the floor; hung, it sways on the fang; wound,
   its seams heat; flying, it tumbles in a tail of grey dust. */
function drawSuHusk(p) {
  const R = p.er, id = p.id || 1, th = p.th;
  const heat = !p.held ? clamp(1 - p.t / 0.5, 0.35, 1) : th ? (th.ph === 'snap' ? 1 : 0.4 + 0.6 * clamp(th.t / THROW_WIND, 0, 1)) : 0.3;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const f = p.fling, reel = p.held && f && f.ph === 'reel';
  // its shadow on the floor
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + R * 0.9 + 4, R * 0.8, R * 0.3, 0, 0, TAU); ctx.fill();
  if (reel) {   // dragged off where it stood
    const k = rrEase(clamp(f.t / FLING_REEL, 0, 1)), dx = p.x - p.sx, dy = p.y - p.sy, L = Math.hypot(dx, dy) || 1;
    const back = Math.min(L, 90), g = ctx.createLinearGradient(p.x, p.y, p.x - dx / L * back, p.y - dy / L * back);
    g.addColorStop(0, rgba('#94a3b8', 0.4 * (1 - k * 0.5))); g.addColorStop(1, rgba('#94a3b8', 0));
    ctx.strokeStyle = g; ctx.lineWidth = R * 1.1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - dx / L * back, p.y - dy / L * back); ctx.stroke();
  }
  if (!p.held) {
    const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp, TL = 60 + R * 2;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(p.x, p.y, p.x - ux * TL, p.y - uy * TL);
    g.addColorStop(0, rgba('#94a3b8', 0.4)); g.addColorStop(1, rgba('#94a3b8', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(p.x - uy * R * 0.8, p.y + ux * R * 0.8); ctx.lineTo(p.x - ux * TL, p.y - uy * TL); ctx.lineTo(p.x + uy * R * 0.8, p.y - ux * R * 0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(SU_COL, 0.5 * heat); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - ux * TL * 0.7, p.y - uy * TL * 0.7); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  const sway = p.held && !th ? Math.sin(uiTime * 6 + p.i * 1.7) * 0.18 : 0;
  ctx.translate(p.x, p.y); ctx.rotate(p.rot + sway);
  suHuskPath(p, R);
  const hg = ctx.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R);
  hg.addColorStop(0, '#1e293b'); hg.addColorStop(1, '#05060a');
  ctx.fillStyle = hg; ctx.fill();
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.strokeStyle = 'rgba(100,116,139,0.45)'; ctx.lineWidth = 1;   // its facets, what is left of them
  const n = Math.max(3, p.sides || 6);
  for (let j = 0; j < n; j++) {
    const a = j / n * TAU, r = R * (0.86 + rrHash(id * 7 + j * 2) * 0.14) * 0.9;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
  }
  // the seams it split along, gold, hotter as it is swung
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 0; j < 3; j++) {
    const a0 = rrHash(id + j * 3) * TAU;
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let s = 1; s <= 3; s++) {
      const a = a0 + (rrHash(id * 3 + j * 7 + s) - 0.5) * 0.7, d = R * 0.85 * s / 3;
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.strokeStyle = rgba(SU_COL, 0.35 + 0.6 * heat); ctx.lineWidth = 1 + heat * 0.8; ctx.stroke();
  }
  if (heat > 0.5) drawGlow(0, 0, R * 1.3, SU_COL, (heat - 0.5) * 0.5);
  ctx.restore();
  // the fang in it: a gold wound on the side toward the hull
  if (p.held) {
    const a = Math.atan2(P.y - p.y, P.x - p.x);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(p.x + Math.cos(a) * R * 0.8, p.y + Math.sin(a) * R * 0.8, 9 + heat * 5, SU_COL, 0.5 + heat * 0.3);
    ctx.restore();
  }
  if (FXO.parts && Math.random() < (p.held ? (th ? 0.5 : reel ? 0.6 : 0.12) : 0.55)) {
    const a = rnd(TAU);
    spawnPart(p.x + Math.cos(a) * R * 0.7, p.y + Math.sin(a) * R * 0.7, rnd(40, -40) - (p.held ? 0 : p.vx * 0.15), (p.held ? rnd(120, 40) : 0) - (p.held ? 0 : p.vy * 0.15),
              rnd(2.2, 0.8), Math.random() < 0.2 ? SU_COL : '#64748b', rnd(0.45, 0.2), 0.94);
  }
}

// Z taken: a gold ring snaps shut on each soldier, and the key flashes
function suFlingArmMark(f, t) {
  const a = 1 - t, q = rrEaseOut(t);
  ctx.globalCompositeOperation = 'lighter';
  for (const s of f.list) {
    ctx.strokeStyle = rgba(t < 0.25 ? '#fefce8' : SU_COL, a); ctx.lineWidth = 2.4 * a + 0.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, lerp(s.r * 3, s.r + 22, q), 0, TAU); ctx.stroke();
  }
  drawGlow(P.x, P.y - 61, 26, SU_COL, 0.6 * a);
}
// yanked: dust thrown up where it stood
function suFlingReelFloor(f, t) {
  const a = 1 - t, q = rrEaseOut(t);
  ctx.translate(f.x, f.y); ctx.scale(1, 0.5);
  ctx.strokeStyle = rgba('#94a3b8', a * 0.6); ctx.lineWidth = 2.5 * a + 0.4;
  ctx.beginPath(); ctx.arc(0, 0, f.r * (1 + q * 1.6), 0, TAU); ctx.stroke();
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r * 1.3);
  cg.addColorStop(0, 'rgba(0,0,0,' + 0.5 * a + ')'); cg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, f.r * 1.3, 0, TAU); ctx.fill();
}
// landed: the floor scorched under where it burst
function suHuskSplatFloor(f, t) {
  suCracks(f.x, f.y, f.r * 0.8, f.seed, 1 - t, clamp(1 - t * 3, 0, 1) * 0.6);
  const u = clamp(t / 0.5, 0, 1); if (u >= 1) return;
  ctx.globalCompositeOperation = 'lighter';
  const q = rrEaseOut(u), a = Math.pow(1 - u, 1.5);
  ctx.strokeStyle = rgba('#cbd5e1', a * 0.7); ctx.lineWidth = 4 * a + 0.5;
  ctx.beginPath(); ctx.arc(f.x, f.y, 8 + (f.splash - 8) * q, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(SU_COL, a * 0.5); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(f.x, f.y, 8 + (f.splash - 8) * q * 0.7, 0, TAU); ctx.stroke();
}
// landed: it bursts — shards of the shell thrown out the way it was going
function suHuskSplatMark(f, t) {
  const a = 1 - t;
  if (!f.sh) {
    f.sh = [];
    for (let i = 0; i < 9; i++) {
      const ang = f.ang + (rrHash(f.seed + i) - 0.5) * 2.6, sp = f.r * (2 + rrHash(f.seed + i * 3) * 3);
      f.sh.push([ang, sp, (rrHash(f.seed + i * 5) - 0.5) * 16, f.r * (0.25 + rrHash(f.seed + i * 7) * 0.3)]);
    }
  }
  const q = rrEaseOut(t);
  for (const [ang, sp, spin, sz] of f.sh) {
    const x = f.x + Math.cos(ang) * sp * q, y = f.y + Math.sin(ang) * sp * q;
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin * t + ang);
    ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.6, sz * 0.55); ctx.lineTo(-sz * 0.4, -sz * 0.6); ctx.closePath();
    ctx.fillStyle = '#0f172a'; ctx.fill(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  if (t < 0.2) drawGlow(f.x, f.y, f.r * 2.4, '#fefce8', 0.6 * (1 - t / 0.2));
  drawGlow(f.x, f.y, f.r * 1.6, SU_COL, 0.45 * a);
}

/* ART HOOK moments. */
function suFlingArmFx(dr) {
  suFxAdd('farm', { list: dr.bodies.filter(b => !b.gone).map(b => ({ x: b.x, y: b.y, r: b.e.r })) });
  floatText(P.x, P.y - 86, 'KEEP', SU_COL, 12);
  shake(0.2);
  Audio_.tone(520, 0.1, 'square', 0.06, 780);
}
function suFlingReel(f) {
  for (const p of f.list) {
    suFxAdd('freel', { x: p.sx, y: p.sy, r: p.er });
    if (FXO.parts) {
      const a = Math.atan2(P.y - p.sy, P.x - p.sx);
      for (let k = 0; k < 8; k++) {
        const aa = a + Math.PI + rnd(1.2, -1.2), sp = rnd(160, 50);
        spawnPart(p.sx, p.sy, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(2.4, 1), k % 4 ? '#64748b' : SU_COL, rnd(0.4, 0.2), 0.9);
      }
    }
  }
  shake(0.4);
  Audio_.tone(200, 0.2, 'sawtooth', 0.07, 90);
}
function suHuskThrowFx(p) {
  const a = Math.atan2(p.vy, p.vx);
  suFxAdd('throw', { x: p.x, y: p.y, r: p.er * 0.6, ang: a });
  if (FXO.parts) for (let i = 0; i < 10; i++) {
    const aa = a + Math.PI + rnd(0.8, -0.8), s = rnd(240, 80);
    spawnPart(p.x, p.y, Math.cos(aa) * s, Math.sin(aa) * s, rnd(2.4, 1), i % 3 ? '#94a3b8' : SU_COL, rnd(0.35, 0.15), 0.9);
  }
  shake(0.2);
  Audio_.tone(380, 0.08, 'sawtooth', 0.06, 900);
}
function suHuskHitFx(p, e) {
  const a = Math.atan2(p.vy, p.vx);
  suFxAdd('hsplat', { x: p.x, y: p.y, r: p.er, ang: a, splash: p.splash, seed: (p.id || 1) * 11 });
  if (FXO.parts) for (let i = 0; i < 20; i++) {
    const aa = a + rnd(1.3, -1.3), s = rnd(360, 100);
    spawnPart(p.x, p.y, Math.cos(aa) * s, Math.sin(aa) * s, rnd(3, 1.2), i % 4 ? '#64748b' : i % 8 ? SU_COL : '#fefce8', rnd(0.5, 0.25), 0.9);
  }
  suImpact('piece', e.x, e.y, e.r);
  shake(p.boss ? 0.9 : 0.45);
  Audio_.boom();
}

/* ===========================================================================
   SUPERUSER · V — ROOT — art
   Replaces the placeholder block "V — ROOT, art hooks".

   ROOT is a contortion of the oni more than an addition to it: in three
   snaps the mask is dragged out point for point into a long split skull, the
   horns are carried on past their tips and spurred, the mane stiffens into a
   collar of quills (oniManePath reads suAscMorph), and the eyes move forward.
   What grows out of it besides: A second, greater pair of
   horns breaks out of the roots of the first and sweeps out and back into a
   crown; a crest of spines runs down the back; the seal gets an outer ring
   that reads uid=0. The mask cracks — gold in the seams — splits into a jaw
   of two bone blades off the prongs, and opens a third eye on the brow. Two
   great locks come off the shoulders and lie coiled along the flanks, each
   ending in a drill: these are the jabs, left and right in turn.
=========================================================================== */
const suEaseBack = t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
/* The turn is not a grow but a contortion: three snaps, each a joint giving —
   the whole form lurches a third of the way on with an overshoot, and strains
   (trembling) until the next. k: 0 the oni as it was, 1 ROOT. */
const SU_ASC_SNAP = [0.06, 0.32, 0.58], SU_ASC_SNAP_D = 0.13;
let suAscGone = -9;
function suAscK(w) {
  let k = 0, pulse = 0;
  for (let i = 0; i < 3; i++) {
    const u = clamp((w - SU_ASC_SNAP[i]) / SU_ASC_SNAP_D, 0, 1);
    k += suEaseBack(u) / 3;
    pulse = Math.max(pulse, Math.sin(u * Math.PI));
  }
  const strain = w < 0.78 && pulse < 0.2 ? (1 - w) * (0.6 + rrHash(Math.floor(uiTime * 34)) * 0.8) : 0;
  return { k, pulse, strain };
}
// the contortion as the mane sees it: ROOT's k, easing back out once it ends
function suAscMorph() {
  if (P.suAsc) return typeof ASC_GROW !== 'undefined' ? suAscK(clamp((uiTime - P.suAsc.at) / ASC_GROW, 0, 1)).k : 1;
  return 1 - rrEaseOut(clamp((uiTime - suAscGone) / 0.35, 0, 1));
}
function suAscPhase(w) {
  const { k, pulse, strain } = suAscK(w);
  return {
    k, pulse, strain,
    seal:  rrEaseOut(clamp(w / 0.5, 0, 1)),
    mask:  k,
    horn:  k,
    spine: clamp((k - 0.3) / 0.7, 0, 1.1),
    arms:  clamp((k - 0.34) / 0.66, 0, 1.1),
    jaw:   clamp((k - 0.2) / 0.8, 0, 1.1),
    eye:   rrEaseOut(clamp((w - 0.72) / 0.22, 0, 1)),
    hot:   1 - w
  };
}
const SU_ASC_SHOULDER = [-4, 11];

// banded bone along a bezier, k of its length; wide at the root, gold at the tip
function suAscBone(B, k, w0, s, tipAt = 0.72) {
  if (k <= 0.01) return;
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push(rrBez(B, (i / 20) * k));
  suAscBonePts(pts, w0, s, tipAt);
}
function suAscBonePts(P0, w0, s, tipAt = 0.72) {
  const N = P0.length - 1; if (N < 2) return;
  const acc = [0];
  for (let i = 1; i <= N; i++) acc.push(acc[i - 1] + Math.hypot(P0[i][0] - P0[i - 1][0], P0[i][1] - P0[i - 1][1]));
  const tot = acc[N] || 1, L = [], R = [], C = [];
  for (let i = 0; i <= N; i++) {
    const p = P0[i], q = P0[Math.min(N, i + 1)], o = P0[Math.max(0, i - 1)];
    let tx = q[0] - o[0], ty = q[1] - o[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const u = acc[i] / tot, ww = lerp(w0, 0.35, Math.pow(u, 0.75));
    L.push([p[0] - ty * ww, p[1] + tx * ww]); R.push([p[0] + ty * ww, p[1] - tx * ww]); C.push([p[0], p[1], u, -ty, tx, ww]);
  }
  const k = 1;
  const shape = (from = 0) => {
    ctx.beginPath(); ctx.moveTo(L[from][0], L[from][1]);
    for (let i = from + 1; i <= N; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = N; i >= from; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
  };
  ctx.save(); ctx.translate(3, 4); ctx.globalAlpha = 0.35; shape(); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  shape(); ctx.fillStyle = ONI_DARK; ctx.fill();
  ctx.strokeStyle = ONI_LIT; ctx.lineWidth = 1.1; ctx.stroke();
  for (let j = 1; j <= 8; j++) {
    const i = Math.round(j / 9 * N); if (C[i][2] > k - 0.02) continue;
    const [x, y, , nx, ny, ww] = C[i];
    ctx.strokeStyle = ONI_DEEP; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - nx * ww, y - ny * ww); ctx.lineTo(x + nx * ww, y + ny * ww); ctx.stroke();
    ctx.strokeStyle = rgba(j % 3 ? ONI_PALE : SU_COL, j % 3 ? 0.4 : 0.7); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(x - nx * ww + 1, y - ny * ww); ctx.lineTo(x + nx * ww + 1, y + ny * ww); ctx.stroke();
  }
  const rim = s > 0 ? L : R;
  ctx.strokeStyle = rgba(ONI_BONE, 0.75); ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(rim[1][0], rim[1][1]);
  for (let i = 2; i <= N; i++) ctx.lineTo(rim[i][0], rim[i][1]); ctx.stroke();
  const tf = Math.round(N * tipAt);
  if (k > tipAt) { shape(tf); ctx.fillStyle = SU_COL; ctx.fill(); }
  const p = P0[N];
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(p[0], p[1], 10, SU_COL, 0.35 + Math.sin(uiTime * 5 + s) * 0.1); ctx.restore();
}

/* a great lock: a braided ribbon along B to reach of it, ending in a drill.
   Two strands twist down it; the bit's flutes turn with spin. Returns [tip, ang]. */
function suAscLock(B, reach, o) {
  if (reach <= 0.02) return null;
  const N = 24, pts = [], acc = [0];
  for (let i = 0; i <= N; i++) {
    const u = reach * i / N, p = rrBez(B, u);
    if (o.slack) {
      const q = rrBez(B, Math.min(1, u + 0.01)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      const wv = Math.sin(u * 7 - uiTime * 16 + (o.ph || 0)) * o.slack * Math.sin(u * Math.PI);
      p[0] += -dy / l * wv; p[1] += dx / l * wv;
    }
    if (o.trem) { const j = Math.sin(u * Math.PI) * Math.sin(uiTime * 90 + u * 9) * o.trem; p[0] += j; p[1] -= j; }
    pts.push(p);
    if (i) acc.push(acc[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
  }
  if (acc[N] < 3) return null;
  const w0 = o.w0 || 5, w1 = o.w1 || 2.6;
  const nrm = i => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  };
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.a != null) ctx.globalAlpha = o.a;
  if (o.shadow !== false) {
    ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = w0 * 1.4;
    ctx.beginPath(); for (let i = 0; i <= N; i++) { const x = pts[i][0] + 4, y = pts[i][1] + 6; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
  }
  if (o.hide) { ctx.beginPath(); ctx.rect(o.hide[0] - 4000, o.hide[1] - 4000, 8000, 8000); ctx.arc(o.hide[0], o.hide[1], o.hide[2], 0, TAU); ctx.clip('evenodd'); }
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) { const [nx, ny] = nrm(i), w = lerp(w0, w1, i / N); Lp.push([pts[i][0] + nx * w, pts[i][1] + ny * w]); Rp.push([pts[i][0] - nx * w, pts[i][1] - ny * w]); }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (const q of Lp) ctx.lineTo(q[0], q[1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  ctx.fillStyle = ONI_DEEP; ctx.fill();
  ctx.strokeStyle = rgba(ONI_MID, 0.9); ctx.lineWidth = 0.8; ctx.stroke();
  const spin = o.spin || 10;
  for (let k = 0; k < 2; k++) for (let i = 1; i <= N; i++) {
    const ph = acc[i] * 0.3 - uiTime * spin + k * Math.PI;
    if (Math.cos(ph) <= 0) continue;
    const [nx, ny] = nrm(i), [mx, my] = nrm(i - 1), w = lerp(w0, w1, i / N);
    const o0 = Math.sin(ph - (acc[i] - acc[i - 1]) * 0.3) * w * 0.5, o1 = Math.sin(ph) * w * 0.5;
    ctx.strokeStyle = k ? ONI_MID : ONI_LIT; ctx.lineWidth = w * 0.55;
    ctx.beginPath(); ctx.moveTo(pts[i - 1][0] + mx * o0, pts[i - 1][1] + my * o0); ctx.lineTo(pts[i][0] + nx * o1, pts[i][1] + ny * o1); ctx.stroke();
  }
  if (o.gold) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(SU_COL, o.gold); ctx.lineWidth = 1.2;
    ctx.beginPath(); for (let i = 0; i <= N; i++) i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  // the bit: a fluted cone, bone and gold, turning
  const tip = pts[N], b0 = pts[N - 2], ang = Math.atan2(tip[1] - b0[1], tip[0] - b0[0]);
  const bl = o.bit || 15, bw = w1 + 2.4;
  ctx.save(); ctx.translate(tip[0], tip[1]); ctx.rotate(ang);
  ctx.beginPath(); ctx.moveTo(0, -bw); ctx.lineTo(bl, 0); ctx.lineTo(0, bw); ctx.closePath();
  ctx.fillStyle = ONI_BONE; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = ONI_DARK; ctx.lineWidth = 1.3;
  const fs = (uiTime * (o.bitSpin || 14)) % 1;
  for (let j = -1; j < 5; j++) { const x = (j + fs) * bl / 4; ctx.beginPath(); ctx.moveTo(x, -bw); ctx.lineTo(x + bl * 0.22, bw); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = SU_COL; ctx.beginPath(); ctx.moveTo(bl * 0.62, -bw * 0.38); ctx.lineTo(bl, 0); ctx.lineTo(bl * 0.62, bw * 0.38); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(SU_COL, 0.9); ctx.lineWidth = 1; ctx.fillStyle = ONI_DARK;
  ctx.beginPath(); ctx.ellipse(0, 0, 1.6, bw + 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
  if (o.hot) { ctx.globalCompositeOperation = 'lighter'; drawGlow(tip[0] + Math.cos(ang) * bl, tip[1] + Math.sin(ang) * bl, 12, SU_COL, 0.45 * o.hot); }
  ctx.restore();
  return [tip[0] + Math.cos(ang) * bl, tip[1] + Math.sin(ang) * bl, ang];
}

// is a jab off this side of the mane now? (then its lock is out, not coiled)
function suAscHandOut(s) {
  const a = P.suAsc; if (!a) return false;
  for (const j of a.jabs) if (j.hand === s && (j.ph !== 'back' || j.len > 6)) return true;
  return false;
}

/* The mask: the hull's own outline (its eight corners and their midpoints),
   dragged out point for point into ROOT's — a long split skull, cheek spikes
   where the prongs were, cheekbones flared out of the shoulders, a crest
   behind. Every target point lies outside the hull, so the old shape is never
   seen under the new one. */
const SU_MASK_A = [[18, 0], [11, 3], [4, 6], [7, 9.5], [10, 13], [3, 12], [-4, 11], [-6.5, 5.5], [-9, 0]];
const SU_MASK_B = [[32, 0], [22, 3.6], [12, 5], [17, 10], [25, 15.5], [8, 17], [-3, 19.5], [-13, 11], [-25, 0]];
function suAscMaskPts(k, strain) {
  const half = SU_MASK_A.map((a, i) => [lerp(a[0], SU_MASK_B[i][0], k), lerp(a[1], SU_MASK_B[i][1], k)]);
  const out = [];
  for (let i = 0; i < half.length; i++) out.push(half[i]);
  for (let i = half.length - 2; i >= 1; i--) out.push([half[i][0], -half[i][1]]);
  if (strain) for (let i = 0; i < out.length; i++) {
    const f = Math.floor(uiTime * 34);
    out[i] = [out[i][0] + (rrHash(i * 7.3 + f) - 0.5) * strain * 2.2, out[i][1] + (rrHash(i * 3.1 + f) - 0.5) * strain * 2.2];
  }
  return out;
}
function suAscMaskPath(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }

/* A horn: the oni's own, point for point, then carried on past its tip — out,
   back and hooking in — thickening at the root, with spurs breaking out along
   its outer edge. At k 0 it lies exactly on the old horn, so it takes it over
   rather than sitting beside it. */
function suAscHorn(s, k) {
  const A = [1, s * 10, -3, s * 22, -12, s * 29, -21, s * 43];
  const E = [-21, s * 43, -27, s * 57, -44, s * 67, -60, s * 60];
  const pts = [];
  for (let i = 0; i <= 14; i++) pts.push(rrBez(A, i / 14));
  const ext = clamp(k, 0, 1.12);
  if (ext > 0.02) for (let i = 1; i <= 12; i++) pts.push(rrBez(E, (i / 12) * ext));
  const spur = clamp((k - 0.3) / 0.7, 0, 1.1);
  if (spur > 0.02) for (const [u, L] of [[0.3, 9], [0.52, 12], [0.7, 8]]) {
    const i = Math.round(u * (pts.length - 1)), p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)];
    const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
    let nx = -ty / tl, ny = tx / tl;
    if (ny * s < 0) { nx = -nx; ny = -ny; }                              // outward
    const dx = nx * 0.7 + 0.5, dy = ny * 0.7, dl = Math.hypot(dx, dy), l = L * spur;
    const bx = -ny * 3, by = nx * 3;
    ctx.beginPath(); ctx.moveTo(p[0] + bx, p[1] + by); ctx.lineTo(p[0] + dx / dl * l, p[1] + dy / dl * l); ctx.lineTo(p[0] - bx, p[1] - by); ctx.closePath();
    ctx.fillStyle = ONI_DARK; ctx.fill(); ctx.strokeStyle = ONI_LIT; ctx.lineWidth = 0.9; ctx.stroke();
    if (spur > 0.7) { ctx.fillStyle = SU_COL; ctx.beginPath(); ctx.arc(p[0] + dx / dl * l, p[1] + dy / dl * l, 1.1, 0, TAU); ctx.fill(); }
  }
  suAscBonePts(pts, lerp(5.4, 8.2, clamp(k, 0, 1)), s, lerp(0.74, 0.84, clamp(k, 0, 1)));
}

/* ART HOOK: the second form, under the hull, over the oni's under pass. */
function drawSuAscUnder(w) {
  const ph = suAscPhase(w), x = P.x, y = P.y;
  if (ph.seal > 0.01) {
    const R = 104 * lerp(2.2, 1, ph.seal), rot = -uiTime * 0.12;
    ctx.save(); ctx.translate(x, y);
    ctx.globalAlpha = ph.seal * (0.6 + Math.sin(uiTime * 2.1) * 0.08);
    ctx.strokeStyle = rgba(SU_COL, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
    ctx.setLineDash([2, 5]); ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.rotate(rot);
    ctx.font = '700 8px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = 'uid=0(root) gid=0(root) groups=0(root) \u00b7 ', step = 0.056, cnt = Math.floor(TAU / step);
    for (let i = 0; i < cnt; i++) {
      ctx.save(); ctx.rotate(i * step); ctx.translate(R - 8, 0); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = rgba(SU_COL, 0.55); ctx.fillText(txt[i % txt.length], 0, 0); ctx.restore();
    }
    for (let q = 0; q < 8; q++) {
      const a = q * TAU / 8;
      ctx.strokeStyle = SU_COL; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R + 2), Math.sin(a) * (R + 2)); ctx.lineTo(Math.cos(a) * (R + 11), Math.sin(a) * (R + 11)); ctx.stroke();
    }
    ctx.restore();
  }
  // while it turns the room goes dark round it, so the turn is what you see
  const dim = clamp(1 - Math.abs(w - 0.45) / 0.55, 0, 1) * (w < 1 ? 1 : 0);
  if (dim > 0.01) {
    const dg = ctx.createRadialGradient(x, y, 30, x, y, 420);
    dg.addColorStop(0, 'rgba(2,4,2,' + 0.2 * dim + ')'); dg.addColorStop(0.35, 'rgba(2,4,2,' + 0.62 * dim + ')'); dg.addColorStop(1, 'rgba(2,4,2,' + 0.35 * dim + ')');
    ctx.fillStyle = dg; ctx.fillRect(x - 900, y - 900, 1800, 1800);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, 60 + ph.pulse * 30, SU_COL, 0.12 + ph.pulse * 0.16);
  drawGlow(x, y, 36, ONI_LIT, 0.2 + ph.strain * 0.2);
  ctx.restore();

  const sc = 1 + ph.pulse * 0.07;
  ctx.save(); ctx.translate(x, y); ctx.rotate(P.ang); ctx.scale(sc, sc);
  ctx.save(); ctx.translate(4, 6); ctx.globalAlpha = 0.4 * clamp(ph.mask * 2, 0, 1);
  suAscMaskPath(suAscMaskPts(ph.mask, 0)); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  for (let i = 0; i < 5; i++) {
    const k = clamp(ph.spine * 1.3 - i * 0.08, 0, 1); if (k <= 0) continue;
    const bx = -18 - i * 5, L = (16 + (i === 1 || i === 2 ? 12 : 5) - i * 1.5) * k, sw = i % 2 ? -1 : 1;
    suAscBone([bx, 0, bx - L * 0.3, sw * 2, bx - L * 0.7, sw * 3, bx - L, sw * 1.5], 1, 2.8, sw, 0.8);
  }
  for (const s of [-1, 1]) {
    if (suAscHandOut(s) || ph.arms <= 0.01) continue;
    const [sx, sy] = SU_ASC_SHOULDER, k = ph.arms, br = Math.sin(uiTime * 2.4 + s) * 1.5;
    const B = [sx, s * sy, -20, s * (34 + br), 18 * k, s * (42 + br) * k, 36 * k, s * (20 + br * 0.5) * k];
    suAscLock(B, clamp(k, 0, 1), { w0: 5.4, w1: 2.6, spin: 6, slack: 0.8, ph: s, bitSpin: 3, a: 1 });
  }
  for (const s of [-1, 1]) suAscHorn(s, ph.horn);
  ctx.restore();
  suAscSnaps(w);
}

// a snap: the moment a joint gives — a crack of light round it, bone chips, a jolt
function suAscSnaps(w) {
  const a = P.suAsc; if (!a) return;
  a._snap = a._snap || 0;
  while (a._snap < 3 && w >= SU_ASC_SNAP[a._snap]) {
    const i = a._snap++;
    suFxAdd('asnap', { x: P.x, y: P.y, ang: P.ang, i });
    shake(0.3 + i * 0.15);
    if (FXO.parts) for (let n = 0; n < 12 + i * 6; n++) {
      const an = rnd(TAU), sp = rnd(260, 90);
      spawnPart(P.x + Math.cos(an) * 14, P.y + Math.sin(an) * 14, Math.cos(an) * sp, Math.sin(an) * sp, rnd(2.4, 1), n % 3 ? ONI_BONE : SU_COL, rnd(0.4, 0.2), 0.88);
    }
    Audio_.tone(90 + i * 40, 0.12, 'square', 0.07, 50);
  }
}
function suAscSnapMark(f, t) {
  const a = 1 - t, q = rrEaseOut(t), R = 24 + f.i * 6;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#fefce8', a * 0.55); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(f.x, f.y, R + q * 50, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 1.2;
  for (let n = 0; n < 7; n++) {
    const an = f.ang + n / 7 * TAU + f.i * 0.4;
    let px = f.x + Math.cos(an) * R, py = f.y + Math.sin(an) * R;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let j = 1; j <= 3; j++) {
      const aa = an + (rrHash(f.i * 31 + n * 7 + j) - 0.5) * 0.9, d = (8 + 10 * q) * j / 3 * 1.6;
      px += Math.cos(aa) * d * 0.6; py += Math.sin(aa) * d * 0.6; ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  if (t < 0.2) drawGlow(f.x, f.y, 40, '#fefce8', 0.3 * (1 - t / 0.2));
}

function suMix(a, b, t) {
  t = clamp(t, 0, 1);
  const p = parseInt(a.slice(1), 16), q = parseInt(b.slice(1), 16);
  const c = sh => Math.round(lerp((p >> sh) & 255, (q >> sh) & 255, t));
  return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
}
/* ART HOOK: the second form, over the hull and the oni's mask. The old mask is
   painted out by the new one as it is dragged into shape — and the lacquer
   goes to bone as it stretches, so the face turns pale with dark sockets. */
function drawSuAscOver(w) {
  const ph = suAscPhase(w), k = ph.mask, sc = 1 + ph.pulse * 0.07;
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang); ctx.scale(sc, sc);
  for (const s of [-1, 1]) {
    const j = ph.jaw; if (j <= 0.01) break;
    suAscBone([21, s * 13, 33, s * 18, 43, s * 11, 45, s * 3], clamp(j, 0, 1), 3.2, s, 0.62);
  }
  const pts = suAscMaskPts(k, ph.strain);
  suAscMaskPath(pts);
  const g = ctx.createLinearGradient(lerp(18, 32, k), 0, lerp(-9, -25, k), 0);
  const bk = clamp((k - 0.15) / 0.85, 0, 1);
  g.addColorStop(0, suMix('#1f4a0c', '#f7fee7', bk)); g.addColorStop(0.55, suMix('#0c1f08', '#c9dcaa', bk)); g.addColorStop(1, suMix('#050d05', '#5f7a45', bk));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = suMix('#84cc16', '#14240c', bk); ctx.lineWidth = 1.7; ctx.lineJoin = 'miter'; ctx.stroke();
  if (bk > 0.3) { ctx.strokeStyle = rgba(ONI_LIT, (bk - 0.3) * 0.8); ctx.lineWidth = 0.7; ctx.stroke(); }
  ctx.save(); suAscMaskPath(pts); ctx.clip();
  // the sockets, sunk into the bone round where the eyes are going
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(lerp(5.6, 13, k), s * lerp(4.3, 7, k)); ctx.rotate(s * lerp(0.55, 0.85, k));
    ctx.fillStyle = 'rgba(4,10,4,' + bk + ')';
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 3.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(4,10,4,' + bk * 0.9 + ')';
  ctx.beginPath(); ctx.ellipse(1.5, 0, 3.6, 6.6, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = bk > 0.5 ? 'rgba(20,36,12,0.7)' : rgba(ONI_PALE, 0.4); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(lerp(-6, -22, k), 0); ctx.lineTo(lerp(16, 22, k), 0); ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.strokeStyle = bk > 0.5 ? 'rgba(20,36,12,0.75)' : rgba(ONI_MID, 0.9); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lerp(10, 20, k), s * lerp(2, 3, k)); ctx.lineTo(lerp(0, 2, k), s * lerp(8, 12, k)); ctx.lineTo(lerp(-6, -12, k), s * lerp(6, 9, k)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lerp(8, 23, k), s * lerp(11, 14, k)); ctx.lineTo(lerp(-3, -4, k), s * lerp(10, 16, k)); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const cr = [[[13, -6.5], [8, -10], [2, -12], [-5, -13], [-11, -10]], [[13, 6.5], [7, 11], [0, 12], [-8, 9]],
              [[2, 0], [-6, -3], [-15, -2]], [[2, 0], [-5, 4], [-13, 3], [-19, 5]], [[23, 12], [17, 8], [12, 5]], [[23, -12], [16, -7]]];
  const crack = c => {
    ctx.beginPath();
    for (let i = 0; i < c.length; i++) {
      const u = clamp(k * c.length * 1.2 - i, 0, 1), p = c[i], q = c[Math.max(0, i - 1)];
      const px = lerp(q[0], p[0], u), py = lerp(q[1], p[1], u);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  };
  ctx.globalCompositeOperation = 'source-over';
  for (const c of cr) { crack(c); ctx.strokeStyle = 'rgba(40,24,2,' + 0.85 * bk + ')'; ctx.lineWidth = 2.2; ctx.stroke(); }
  ctx.globalCompositeOperation = 'lighter';
  for (const c of cr) { crack(c); ctx.strokeStyle = rgba(SU_COL, Math.min(1, 0.85 + ph.pulse * 0.15)); ctx.lineWidth = 0.9 + ph.pulse * 0.8; ctx.stroke(); }
  ctx.restore();
  const mw = clamp((k - 0.25) / 0.75, 0, 1.1);
  if (mw > 0.01) {
    const tipX = lerp(18, 32, k) + 0.5, back = lerp(tipX, 13, mw), open = 2.6 * mw;
    ctx.beginPath(); ctx.moveTo(back, 0); ctx.lineTo(tipX, -open); ctx.lineTo(tipX, open); ctx.closePath();
    ctx.fillStyle = '#020502'; ctx.fill();
    ctx.strokeStyle = ONI_BONE; ctx.lineWidth = 0.8;
    for (let i = 1; i <= 4; i++) { const tx = lerp(back, tipX, i / 5), oy = open * i / 5; ctx.beginPath(); ctx.moveTo(tx, -oy); ctx.lineTo(tx + 1.2, -oy + 1); ctx.moveTo(tx, oy); ctx.lineTo(tx + 1.2, oy - 1); ctx.stroke(); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const br = 0.5 + Math.sin(uiTime * 3.3) * 0.2;
    drawGlow(lerp(back, tipX, 0.5), 0, 8 + br * 5, ONI_LIT, 0.45 * mw);
    ctx.restore();
  }
  ctx.strokeStyle = SU_COL; ctx.lineWidth = 1.8; ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(lerp(-3, -7, k), s * lerp(10, 14, k)); ctx.lineTo(lerp(4.5, 8, k), s * lerp(6.6, 11, k)); ctx.lineTo(lerp(9, 19, k), s * lerp(1.8, 5.5, k));
  }
  ctx.stroke();
  const pulse = 0.85 + Math.sin(uiTime * 4.2) * 0.15;
  for (const s of [-1, 1]) {
    const ex = lerp(5.6, 13.5, k), ey = s * lerp(4.3, 6.8, k), rot = s * lerp(0.55, 0.85, k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(ex, ey, (12 + ph.pulse * 8) * pulse, SU_COL, 0.75);
    ctx.restore();
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(rot);
    ctx.fillStyle = '#fefce8';
    ctx.beginPath(); ctx.ellipse(0, 0, lerp(3.6, 6, k), lerp(1.35, 1.1, k), 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#07140a'; ctx.fillRect(-0.5, -0.9, 1, 1.8);
    ctx.restore();
  }
  if (ph.eye > 0.01) {
    const o = ph.eye, pu = 0.85 + Math.sin(uiTime * 5.3) * 0.15;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(1.5, 0, 12 * pu, SU_COL, 0.8 * o);
    ctx.restore();
    ctx.fillStyle = '#07140a';
    ctx.beginPath(); ctx.ellipse(1.5, 0, 2.6, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = SU_COL; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fefce8';
    ctx.beginPath(); ctx.ellipse(1.5, 0, 1.1 * o, 3.8 * o, 0, 0, TAU); ctx.fill();
    const fl = Math.sin(clamp((w - 0.72) / 0.28, 0, 1) * Math.PI);
    if (fl > 0.01) {
      const L = 20 + fl * 110, gr = ctx.createLinearGradient(0, -L, 0, L);
      gr.addColorStop(0, rgba(SU_COL, 0)); gr.addColorStop(0.5, rgba('#fefce8', 0.9 * fl)); gr.addColorStop(1, rgba(SU_COL, 0));
      ctx.fillStyle = gr; ctx.fillRect(0.6, -L, 1.8, L * 2);
    }
  }
  ctx.restore();
}

/* ART HOOK: screen space, V pressed. A cut: the negative, then black bars
   slam in top and bottom with the prompt going root in them, and a gold #
   over everything, landing. */
function drawSuAscScreen() {
  const a = P.suAsc;
  if (!a || (typeof state !== 'undefined' && state !== 'play')) return;
  const t = uiTime - a.at, T = 1.4;
  if (t > T || t < 0) return;
  ctx.save();
  if (t < 0.05) {
    ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fefce8'; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  const inK = rrEaseOut(clamp(t / 0.12, 0, 1)), outK = rrEaseIn(clamp((t - 1.05) / 0.3, 0, 1));
  const bh = Math.round(H * 0.1 * inK * (1 - outK));
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
  vg.addColorStop(0, rgba(SU_COL, 0)); vg.addColorStop(1, rgba(SU_COL, 0.3 * (1 - t / T)));
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (bh > 0) {
    ctx.fillStyle = '#020302'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
    ctx.fillStyle = SU_COL; ctx.fillRect(0, bh - 1, W, 1); ctx.fillRect(0, H - bh, W, 1);
    ctx.font = "700 13px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
    const l1 = 'hacker@hull:~$ sudo -i', typed = Math.floor(clamp((t - 0.08) / 0.35, 0, 1) * l1.length);
    ctx.textAlign = 'left'; ctx.fillStyle = '#84cc16';
    ctx.fillText(l1.slice(0, typed) + (typed < l1.length && Math.floor(t * 16) % 2 ? '_' : ''), 24, bh / 2);
    if (t > 0.5) {
      ctx.textAlign = 'right'; ctx.fillStyle = SU_COL;
      ctx.fillText('root@hull:~# uid=0(root)', W - 24, H - bh / 2);
    }
  }
  // the #: huge and faint, slamming down to size
  const hk = clamp((t - 0.42) / 0.16, 0, 1);
  if (hk > 0) {
    const sc = lerp(3.2, 1, rrEaseIn(hk)), al = hk < 1 ? hk : 1 - clamp((t - 0.7) / 0.6, 0, 1);
    ctx.translate(W / 2, H * 0.42); ctx.scale(sc, sc);
    ctx.font = "800 64px 'JetBrains Mono', ui-monospace, monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba('#84cc16', 0.5 * al); ctx.fillText('#', -3, 0);
    ctx.fillStyle = rgba(SU_COL, 0.9 * al); ctx.fillText('#', 2, 0);
  }
  ctx.restore();
}

// where a jab leaves the hull: the shoulder of its side
function suJabRoot(hand) {
  const ca = Math.cos(P.ang), sa = Math.sin(P.ang), [sx, sy] = SU_ASC_SHOULDER;
  return [P.x + ca * sx - sa * hand * sy, P.y + sa * sx + ca * hand * sy];
}
function suJabCurve(j, tx, ty) {
  const [x0, y0] = suJabRoot(j.hand), ca = Math.cos(P.ang), sa = Math.sin(P.ang), nx = -sa * j.hand, ny = ca * j.hand;
  const dx = tx - x0, dy = ty - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const lead = Math.min(L * 0.4, 80), wide = 14 + Math.min(12, L * 0.05);
  return [x0, y0, x0 + nx * wide + ca * 6, y0 + ny * wide + sa * 6, tx - ux * lead + nx * 8, ty - uy * lead + ny * 8, tx, ty];
}

/* ART HOOK: the world under ROOT — its jabs, and the bodies they have thrown. */
function drawSuAscWorld(a) {
  if (a) for (const j of a.jabs) {
    if (j.len < 3 && !j.carry) continue;
    const e = j.carry;
    let tx, ty, hide = null;
    if (e) {
      const ey = e.y - SU_LIFT_H * (e.suLift || 0), [rx, ry] = suJabRoot(j.hand);
      const ux = e.x - rx, uy = ey - ry, l = Math.hypot(ux, uy) || 1;
      tx = e.x - ux / l * 6; ty = ey - uy / l * 6;   // the bit pokes out the far side
      hide = [e.x, ey, e.r * 0.9];
    } else { tx = P.x + Math.cos(j.ang) * Math.max(0, j.len - 14); ty = P.y + Math.sin(j.ang) * Math.max(0, j.len - 14); }
    const B = suJabCurve(j, tx, ty), out = j.ph === 'out', back = j.ph === 'back';
    const fade = back ? 1 - clamp((j.t / JAB_BACK - 0.5) / 0.5, 0, 1) : 1;
    const tip = suAscLock(B, 1, { w0: 5.2, w1: 2.4, spin: out ? 34 : 16, bitSpin: out || e ? 40 : 10,
                                  slack: back ? 3 : 0, ph: j.seed, trem: e ? 1.4 : 0, gold: e ? 0.8 : out ? 0.4 : 0,
                                  hide, hot: out ? 1 : e ? 0.6 : 0, a: fade, shadow: !out });
    if (out && tip) {   // the lunge: streaks along it, the way it is going
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const [ex, ey, an] = tip, ca = Math.cos(an), sa = Math.sin(an);
      for (let k = -1; k <= 1; k++) {
        const L = 26 + rrHash(j.seed + k) * 30, o = k * 6;
        const g = ctx.createLinearGradient(ex, ey, ex - ca * L, ey - sa * L);
        g.addColorStop(0, rgba('#fefce8', 0.6)); g.addColorStop(1, rgba(SU_COL, 0));
        ctx.strokeStyle = g; ctx.lineWidth = k ? 1 : 1.8;
        ctx.beginPath(); ctx.moveTo(ex - sa * o - ca * 4, ey + ca * o - sa * 4); ctx.lineTo(ex - sa * o - ca * L, ey + ca * o - sa * L); ctx.stroke();
      }
      ctx.restore();
    }
    if (e) {   // the wound it is carried by
      const ey = e.y - SU_LIFT_H * (e.suLift || 0), [rx, ry] = suJabRoot(j.hand), an = Math.atan2(ey - ry, e.x - rx);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      drawGlow(e.x - Math.cos(an) * e.r * 0.85, ey - Math.sin(an) * e.r * 0.85, 11, SU_COL, 0.75);
      drawGlow(e.x + Math.cos(an) * e.r * 0.85, ey + Math.sin(an) * e.r * 0.85, 8, SU_COL, 0.5);
      ctx.restore();
    }
  }
  // thrown bodies: a smear behind, tumbling
  for (const e of enemies) {
    if (!e.suFly || e.dead) continue;
    const f = e.suFly, sp = Math.hypot(f.vx, f.vy) || 1, ux = f.vx / sp, uy = f.vy / sp;
    const y = e.y - SU_LIFT_H * (e.suLift || 0), L = (50 + e.r * 2.2) * clamp(sp / 600, 0.4, 1.2), r = e.r;
    const k = clamp(1 - f.t / (typeof FLUNG_T !== 'undefined' ? FLUNG_T : 0.9), 0, 1);
    ctx.save(); ctx.lineCap = 'round';
    const g = ctx.createLinearGradient(e.x, y, e.x - ux * L, y - uy * L);
    g.addColorStop(0, rgba(e.col || '#94a3b8', 0.45)); g.addColorStop(0.4, rgba('#94a3b8', 0.25)); g.addColorStop(1, rgba('#94a3b8', 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(e.x - uy * r, y + ux * r); ctx.lineTo(e.x - ux * L - uy * 2, y - uy * L + ux * 2);
    ctx.lineTo(e.x - ux * L + uy * 2, y - uy * L - ux * 2); ctx.lineTo(e.x + uy * r, y - ux * r); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (const sd of [-1, 1]) {
      ctx.strokeStyle = rgba(SU_COL, 0.55 * k); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(e.x + uy * sd * r * 0.9, y - ux * sd * r * 0.9); ctx.lineTo(e.x - ux * L * 0.7 + uy * sd * 2, y - uy * L * 0.7 - ux * sd * 2); ctx.stroke();
    }
    const rot = f.t * 22 * (e.id % 2 ? 1 : -1);   // tumbling: two arcs spinning round it
    ctx.strokeStyle = rgba('#e2e8f0', 0.6 * k); ctx.lineWidth = 1.6;
    for (let q = 0; q < 2; q++) { ctx.beginPath(); ctx.arc(e.x, y, r + 5, rot + q * Math.PI, rot + q * Math.PI + 1.1); ctx.stroke(); }
    ctx.restore();
    if (FXO.parts && Math.random() < 0.5)
      spawnPart(e.x + rnd(r, -r) * 0.6, y + rnd(r, -r) * 0.6, -ux * rnd(80, 20), -uy * rnd(80, 20), rnd(2, 0.8), Math.random() < 0.25 ? SU_COL : '#64748b', rnd(0.35, 0.15), 0.9);
  }
}

// V pressed, on the floor: eight rays out of the hull, and a ring of the root's digits running out
function suAscFloor(f, t) {
  const a = 1 - t, q = rrEaseOut(t);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const an = f.ang + i * TAU / 8 + Math.PI / 8, r0 = 20 + q * 60, r1 = 40 + q * 260;
    const g = ctx.createLinearGradient(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0, f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1);
    g.addColorStop(0, rgba('#fefce8', a)); g.addColorStop(1, rgba(SU_COL, 0));
    ctx.strokeStyle = g; ctx.lineWidth = 2 * a + 0.4;
    ctx.beginPath(); ctx.moveTo(f.x + Math.cos(an) * r0, f.y + Math.sin(an) * r0); ctx.lineTo(f.x + Math.cos(an) * r1, f.y + Math.sin(an) * r1); ctx.stroke();
  }
  const R = 30 + q * 190, n = 36;
  ctx.font = '700 10px ' + CON_MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const an = i / n * TAU;
    ctx.fillStyle = rgba(i % 5 ? SU_COL : '#fefce8', a * 0.8);
    ctx.fillText(rrHash(i + f.seed) > 0.5 ? '0' : '#', f.x + Math.cos(an) * R, f.y + Math.sin(an) * R);
  }
  ctx.strokeStyle = rgba(SU_COL, a * 0.6); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) { const an = i / 8 * TAU + Math.PI / 8, rr = R * 1.12; i ? ctx.lineTo(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr) : ctx.moveTo(f.x + Math.cos(an) * rr, f.y + Math.sin(an) * rr); }
  ctx.stroke();
}
// ROOT ends: the second form sheds — slivers of the crown and the jaw thrown off and falling away
function suAscEndMark(f, t) {
  const a = 1 - t;
  if (!f.sh) {
    f.sh = [];
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang);
    const at = [[-20, 50], [-30, 62], [-8, 40], [22, 10], [-20, 20], [-24, 0], [8, 30]];
    for (const [lx, ly] of at) for (const s of [-1, 1]) {
      const x = f.x + ca * lx - sa * s * ly, y = f.y + sa * lx + ca * s * ly, an = Math.atan2(y - f.y, x - f.x);
      f.sh.push({ x, y, an, sp: 60 + rrHash(lx * 3 + s) * 90, rot: rrHash(ly + s * 7) * TAU, spin: (rrHash(lx + ly) - 0.5) * 12, L: 5 + rrHash(lx * ly) * 7 });
    }
  }
  const q = rrEaseOut(t);
  for (const p of f.sh) {
    const x = p.x + Math.cos(p.an) * p.sp * q, y = p.y + Math.sin(p.an) * p.sp * q + 30 * t * t;
    ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.spin * t); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.moveTo(p.L, 0); ctx.lineTo(-p.L * 0.6, p.L * 0.3); ctx.lineTo(-p.L * 0.5, -p.L * 0.3); ctx.closePath();
    ctx.fillStyle = ONI_DARK; ctx.fill(); ctx.strokeStyle = t < 0.3 ? SU_COL : ONI_LIT; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(SU_COL, a * 0.7); ctx.lineWidth = 2 * a + 0.4;
  ctx.beginPath(); ctx.arc(f.x, f.y, lerp(110, 16, q), 0, TAU); ctx.stroke();
}
// a jab bites: a bright nick across the body, square to the jab
function suJabBiteMark(f, t) {
  const a = 1 - t, L = f.r * (1.4 + t * 0.8), nx = -Math.sin(f.ang), ny = Math.cos(f.ang);
  const cx = f.x + Math.cos(f.ang) * f.r * 0.2, cy = f.y + Math.sin(f.ang) * f.r * 0.2;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#fefce8', a); ctx.lineWidth = 2.4 * a + 0.4;
  ctx.beginPath(); ctx.moveTo(cx - nx * L, cy - ny * L); ctx.lineTo(cx + nx * L, cy + ny * L); ctx.stroke();
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - nx * L * 0.6 + Math.cos(f.ang) * 4, cy - ny * L * 0.6 + Math.sin(f.ang) * 4); ctx.lineTo(cx + nx * L * 0.6 + Math.cos(f.ang) * 4, cy + ny * L * 0.6 + Math.sin(f.ang) * 4); ctx.stroke();
}
// a thrown body into another: a starburst at the contact and a ring off the struck one
function suFlungHitMark(f, t) {
  const a = 1 - t, q = rrEaseOut(t);
  ctx.globalCompositeOperation = 'lighter';
  if (t < 0.25) drawGlow(f.x, f.y, f.r * 3, '#fefce8', 0.7 * (1 - t / 0.25));
  ctx.fillStyle = rgba('#fefce8', a);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const an = f.ang + (i - 4.5) * 0.3 + (rrHash(f.seed + i) - 0.5) * 0.2, L = f.r * (1.4 + rrHash(f.seed + i * 3) * 2.2) * (0.6 + q * 0.6), w = 0.08;
    ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(an - w) * L, f.y + Math.sin(an - w) * L);
    ctx.lineTo(f.x + Math.cos(an) * L * 1.15, f.y + Math.sin(an) * L * 1.15); ctx.lineTo(f.x + Math.cos(an + w) * L, f.y + Math.sin(an + w) * L); ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 3 * a + 0.4;
  ctx.beginPath(); ctx.arc(f.ox, f.oy, f.or * (1.1 + q * 1.6), 0, TAU); ctx.stroke();
}
// a thrown body into a wall: the wall dents where it struck and cracks back from it
function suFlungWallMark(f, t) {
  const a = 1 - t, vert = Math.abs(Math.cos(f.ang)) > Math.abs(Math.sin(f.ang));
  const nx = vert ? -Math.sign(Math.cos(f.ang)) : 0, ny = vert ? 0 : -Math.sign(Math.sin(f.ang));   // out of the wall
  const tx = -ny, ty = nx, wx = f.x - nx * f.r, wy = f.y - ny * f.r, L = f.r * 1.6;
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.strokeStyle = rgba('#e2e8f0', a); ctx.lineWidth = 3 * a + 0.5;
  ctx.beginPath(); ctx.moveTo(wx - tx * L, wy - ty * L); ctx.lineTo(wx + tx * L, wy + ty * L); ctx.stroke();
  ctx.strokeStyle = rgba(SU_COL, a * 0.8); ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const o = (i / 5 - 0.5) * L * 1.6, d = f.r * (0.6 + rrHash(f.seed + i) * 0.9) * rrEaseOut(clamp(t * 4, 0, 1));
    ctx.beginPath(); ctx.moveTo(wx + tx * o, wy + ty * o); ctx.lineTo(wx + tx * (o * 1.3) - nx * d, wy + ty * (o * 1.3) - ny * d); ctx.stroke();
  }
  const q = rrEaseOut(t);   // dust off it
  for (let i = 0; i < 5; i++) {
    const o = (rrHash(f.seed * 3 + i) - 0.5) * L * 2, d = f.r * (0.5 + q * 2.4 * rrHash(f.seed + i * 5));
    drawGlow(wx + tx * o + nx * d, wy + ty * o + ny * d, 6 + q * 10, '#94a3b8', 0.35 * a);
  }
}

/* ART HOOK moments. */
function suAscFx() {
  drawFlashT = Math.max(drawFlashT, 0.04);
  suFxAdd('asc', { x: P.x, y: P.y, ang: P.ang, seed: (uiTime * 10) | 0 });
  ringFx(P.x, P.y, 20, 320, SU_COL, 0.7, 6);
  if (FXO.parts) for (let i = 0; i < 40; i++) {
    const a = rnd(TAU), sp = rnd(420, 120);
    spawnPart(P.x, P.y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(3, 1.2), i % 3 ? SU_COL : i % 2 ? ONI_LIT : '#fefce8', rnd(0.7, 0.3), 0.9);
  }
  floatText(P.x, P.y - 70, 'uid=0(root)', SU_COL, 15);
  suImpact('impale', P.x, P.y, 30);
  shake(1.6);
  Audio_.boom(); Audio_.boss(); Audio_.levelup();
}
function suAscEndFx() {
  suAscGone = uiTime;
  suFxAdd('ascend', { x: P.x, y: P.y, ang: P.ang });
  floatText(P.x, P.y - 56, 'exit', '#84cc16', 13);
  shake(0.4);
  Audio_.tone(300, 0.3, 'sine', 0.07, 120);
}
function suJabFx(j) {
  const [x, y] = suJabRoot(j.hand);
  if (FXO.parts) for (let i = 0; i < 2; i++) {
    const a = j.ang + rnd(0.5, -0.5), sp = rnd(160, 60);
    spawnPart(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(1.6, 0.8), i ? ONI_LIT : SU_COL, rnd(0.2, 0.1), 0.88);
  }
  Audio_.tone(700 + rnd(300), 0.03, 'square', 0.025, 1300);
}
function suJabHitFx(e, j) {
  suFxAdd('jbite', { x: e.x, y: e.y, r: e.r, ang: j.ang });
  if (FXO.parts) for (let i = 0; i < 6; i++) {
    const a = j.ang + (i % 2 ? 1 : -1) * (Math.PI / 2 + rnd(0.6, -0.6)), sp = rnd(240, 80);
    spawnPart(e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 0.8), i % 3 ? ONI_LIT : SU_COL, rnd(0.3, 0.12), 0.9);
  }
  suImpact('bite', e.x, e.y, e.r);
}
function suJabImpaleFx(e, j) {
  suFxAdd('impale', { x: e.x, y: e.y, r: e.r, ang: j.ang });
  burst(e.x, e.y, 12, SU_COL, 280, 2.4, 0.4, 1.0, j.ang);
  suImpact('take', e.x, e.y, e.r);
  shake(0.3);
  Audio_.tone(150, 0.12, 'square', 0.06, 80);
}
function suJabThrowFx(e, j) {
  const a = Math.atan2(e.suFly.vy, e.suFly.vx);
  suFxAdd('throw', { x: e.x, y: e.y - SU_LIFT_H * (e.suLift || 0), r: e.r, ang: a });
  if (FXO.parts) for (let i = 0; i < 8; i++) {
    const aa = a + Math.PI + rnd(0.8, -0.8), sp = rnd(240, 80);
    spawnPart(e.x, e.y, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(2.2, 1), i % 3 ? '#94a3b8' : SU_COL, rnd(0.3, 0.15), 0.9);
  }
  shake(0.2);
  Audio_.tone(380, 0.08, 'sawtooth', 0.06, 900);
}
function suFlungHitFx(e, o, a) {
  const cx = (e.x * o.r + o.x * e.r) / (e.r + o.r), cy = (e.y * o.r + o.y * e.r) / (e.r + o.r);
  suFxAdd('fhit', { x: cx, y: cy, r: Math.max(e.r, o.r), ang: a, ox: o.x, oy: o.y, or: o.r, seed: (e.id || 1) * 5 + (o.id || 1) });
  if (FXO.parts) for (let i = 0; i < 18; i++) {
    const aa = a + rnd(1.2, -1.2), sp = rnd(360, 100);
    spawnPart(cx, cy, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(2.8, 1), i % 3 ? (e.col || '#94a3b8') : i % 2 ? SU_COL : '#fefce8', rnd(0.45, 0.2), 0.9);
  }
  suImpact('piece', cx, cy, o.r);
  shake(0.6);
  Audio_.boom();
}
function suFlungWallFx(e, a) {
  suFxAdd('fwall', { x: e.x, y: e.y, r: e.r, ang: a, seed: (e.id || 1) * 13 + ((uiTime * 7) | 0) });
  if (FXO.parts) for (let i = 0; i < 10; i++) {
    const aa = a + Math.PI + rnd(1.1, -1.1), sp = rnd(240, 60);
    spawnPart(e.x, e.y, Math.cos(aa) * sp, Math.sin(aa) * sp, rnd(2.6, 1), i % 4 ? '#94a3b8' : SU_COL, rnd(0.4, 0.2), 0.9);
  }
  shake(0.35);
  Audio_.tone(120, 0.1, 'square', 0.06, 60);
}
