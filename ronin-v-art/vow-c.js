/* ====================== V: LAST VOW — the vow's C (art, 5 Oct) ======================
   WRATH (C), QUAKE (C after Z), EYE OF THE STORM (C after X) and NO MERCY (C after C)
   play through C's own hooks; the vow's stance (s.vow) and its counter (x.vow) take this
   look in place of STILL WATER's. STILL WATER itself is untouched and stays calm: water
   and moonlight, still until a blow breaks it. The user (5 Oct): the vow's C is not calm
   like that; it is chaotic and angry.
   The look. The stance is his rage held on a leash. The floor cracks open under him, lit
   from below in time with his pulse; bone arms claw up out of it round him; the dead
   whirl round him wailing, his outline shakes off him, and his true form looms behind
   him. Three great souls circle him close: the blows it can still catch. Its clock is a
   ring of crimson burning down round him, and it strobes as it runs out. The bodies it
   would finish whatever it caught are marked, their souls already half out of them.
   Each its own:
     WRATH             his true form's blade raised high, shaking
     QUAKE             its blade in the floor, and the floor split open from him to the
                       cross it will set off, his pulse running down the crack
     EYE OF THE STORM  the dead storm round him out to the counter's reach, his eye
                       open over it
     NO MERCY          its blade levelled at the nearest it would finish
   A caught blow is snatched out of the air by a hand of the dead, and he tears through
   the air to whoever threw it, a rift onto the dead open behind him a moment. A counter
   that does not execute is a frenzy of cuts. An execution takes the room to blood and
   black round the two of them, the bars torn at their edges and the move's name stamped
   into the lower one on its seal, and each move kills its own way:
     WRATH             his true form rises over the body, winds up and brings its blade
                       down through it in one cut; the floor tears along it and the halves
                       are thrown apart and dragged under
     QUAKE             the floor under the body breaks into plates and the dead drag it
                       down; his true form stabs the floor, the crack runs to the body and
                       on to the cross, and the ground slams shut on it as the cross goes off
     EYE OF THE STORM  the storm tightens and his eye opens on the body; the dead dive
                       through it from the storm's wall, it is torn apart and flung round
                       the storm, and the storm breaks outward over everything in its reach
     NO MERCY          cut after cut from every side, then his true form, over it, drives
                       its blade down through it into the floor; it bursts, and 無 is
                       burned where it stood
   A boss takes the same execution at its own size and length, in place of its STILL
   WATER one.
   Wiring, one line in each of C's hooks (everything else is in this block):
     drawRoninStillUnder()   first line: if (P.roninStill && P.roninStill.vow) return vkcStance(P.roninStill);
     drawRoninExecWorld()    first line: if (vkcWorld()) return;
     drawRoninExecScreen()   first line: if (vkcScreen()) return;
     roninStillFx(s)         first line: if (s.vow) return vkcStillFx(s);
     roninStillEndFx(s)      first line: if (s.vow) return vkcStillEndFx(s);
     roninStillCatchFx(x)    first line: if (x.vow) return vkcCatchFx(x);
     roninExecKillFx(x)      first line: if (x.vow) return vkcKillFx(x);
     roninExecEndFx(x)       first line: if (x.vow) return vkcEndFx(x);
     rkcStep()               its still waves:  if (!w.still || vkcWave(w)) continue;
     rkcDrawWaves()          its loop:         if (!w.still || vkcWave(w)) continue;
   vkzFloorFx draws its floor (vkcFloor), and roninVowBlastFx hands it C's two blasts
   (vkcBlastFx: EYE OF THE STORM, QUAKE). It reads P.roninStill and P.roninExec with the
   vow's plan on them (n, exec, catches, caught, quake, eye), roninCleaves (QUAKE's
   cross), bladeWaves and enemies, and changes nothing of the logic's but the switch
   STILL WATER's art sets too: x.e.roninHide, for an execution's body. x.hull is left on:
   in the vow the hull stays his own, and his true form does the rest. Art state in VKC.
   It needs the vow's Z block (vkz*), vkxTear and vkxGhost from the vow's X block, and
   C's own helpers (rkcBody, rkcHalfPath, rkcWedgePath, rkcChord).
=================================================================================== */
const VKC_LIFE = { ground: 1.8, rift: 3, plates: 3.2, fissure: 2.6, spiral: 2.4, brand: 4.5, splat: 6 };
let VKC = { x: null, last: null, endAt: -9, plan: {}, once: {}, side: 1, seed: 1, ground: 1, fx: 0, fy: 0, fr: 120,
            ba: 0, gx: 0, gy: 0, edge: 0, err: 0, stepAt: -1, dt: 0.016, beat: null, buf: null,
            scars: [], corpses: [], souls: [], bits: [], marks: [], waves: new WeakSet() };
const vkcQ = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const vkcIn = (t, a, b) => vraOut(vkcQ(t, a, b));
const vkcOnce = k => VKC.once[k] ? false : (VKC.once[k] = true);
const vkcWave = w => VKC.waves.has(w);
// which of the art's counters it is: the wave, a strike, or the vow move's own execution
const vkcKind = x => !x.e ? 'wave' : x.exec ? x.vow.n : 'strike';
// what is left of the stance, of the whole of it (it is taken up again for what is left after each counter)
const vkcLeft = s => clamp((s.T - s.t) / VOW_WATER_MAX, 0, 1);
// his pulse, pounding: a hard beat and a softer one, a little over two a second
function vkcPound(t) {
  const ph = ((t / 0.46) % 1 + 1) % 1, g = c => Math.exp(-Math.pow((ph - c) / 0.045, 2));
  return Math.min(1, g(0) + g(1) + 0.6 * g(0.2));
}

/* ------------------------------ the floor breaking ------------------------------ */
// a crack: a jagged line out from (x, y) along an, L long, in n steps; seeded, so every frame sees the same one
function vkcCrack(x, y, an, L, seed, n) {
  const pts = [[x, y]];
  for (let j = 1; j <= n; j++) {
    an += (vraH(seed + j * 3.7) - 0.5) * 0.9;
    x += Math.cos(an) * L / n; y += Math.sin(an) * L / n;
    pts.push([x, y]);
  }
  return pts;
}
// a crack from (x0, y0) to (x1, y1): the straight line, wandering off it either side
function vkcFault(x0, y0, x1, y1, seed) {
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L, n = clamp(Math.round(L / 14), 4, 40), pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, j = (i && i < n ? vraH(seed + i * 2.3) - 0.5 : 0) * Math.min(18, L * 0.08);
    pts.push([lerp(x0, x1, u) + nx * j, lerp(y0, y1, u) + ny * j]);
  }
  return pts;
}
// a point a share u of the way along pts
function vkcAlong(pts, u) {
  const m = clamp(u, 0, 1) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(m)), f = m - k;
  return [lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)];
}
// the path along pts, to a share of its length (0 to 1)
function vkcPath(pts, upto) {
  const n = pts.length - 1, m = clamp(upto, 0, 1) * n, k = Math.floor(m);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let j = 1; j <= Math.min(k, n); j++) ctx.lineTo(pts[j][0], pts[j][1]);
  if (k < n) { const f = m - k; ctx.lineTo(lerp(pts[k][0], pts[k + 1][0], f), lerp(pts[k][1], pts[k + 1][1], f)); }
}
// a crack as the vow's are drawn: black and wide, crimson down in it, hot while glow is up
function vkcCrackDraw(pts, upto, w, glow, a) {
  if (a <= 0.01 || upto <= 0) return;
  vkcPath(pts, upto);
  ctx.strokeStyle = rgba(VKZ_VOID, 0.85 * a); ctx.lineWidth = w; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(VKZ_CRIM, (0.3 + 0.55 * glow) * a); ctx.lineWidth = w * 0.42; ctx.stroke();
  if (glow > 0.25) { ctx.strokeStyle = rgba(VKZ_HOT, 0.6 * (glow - 0.25) * a); ctx.lineWidth = Math.max(0.5, w * 0.16); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over';
}
// the ground under the stance: scorched, and cracked out from under him, lit from below with his
// pulse (burst: blown open, as a caught blow leaves it)
function vkcGround(x, y, grow, seed, a, glow, burst) {
  if (a <= 0.01) return;
  const R = (56 + 16 * grow) * (burst ? 1.25 : 1);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, rgba(VKZ_VOID, 0.75 * a)); g.addColorStop(0.55, rgba(VKZ_VOID, 0.4 * a)); g.addColorStop(1, rgba(VKZ_VOID, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  for (let i = 0; i < 11; i++) {
    const h = vraH(seed + i * 7.3), an = (i + h * 0.7) / 11 * TAU, L = (24 + 44 * vraH(seed + i * 3.1)) * (burst ? 1.4 : 1);
    const pts = vkcCrack(x + Math.cos(an) * 12, y + Math.sin(an) * 12, an, L, seed + i * 11, 5);
    vkcCrackDraw(pts, grow, 2.8, glow, a);
    if (h > 0.45) vkcCrackDraw(vkcCrack(pts[2][0], pts[2][1], an + (h > 0.72 ? 0.8 : -0.8), L * 0.42, seed + i * 5.9, 3),
                               clamp(grow * 1.7 - 0.7, 0, 1), 1.7, glow * 0.7, a);
  }
}
function vkcSplat(x, y, r) {
  const S = VKC.scars;
  if (S.length > 150) { const i = S.findIndex(q => q.k === 'splat'); S.splice(i < 0 ? 0 : i, 1); }
  S.push({ k: 'splat', x, y, r, sx: rnd(1.4, 0.8), rot: rnd(TAU), at: uiTime, life: VKC_LIFE.splat });
}
function vkcSplatDraw(sc, fade) {
  ctx.fillStyle = rgba('#3f0712', 0.75 * fade);
  ctx.beginPath(); ctx.ellipse(sc.x, sc.y, sc.r * sc.sx, sc.r, sc.rot, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(VKZ_CRIM, 0.25 * fade);
  ctx.beginPath(); ctx.ellipse(sc.x - sc.r * 0.2, sc.y - sc.r * 0.2, sc.r * sc.sx * 0.5, sc.r * 0.45, sc.rot, 0, TAU); ctx.fill();
}
// WRATH's cut, torn into the floor along its line: open onto the dead, and closing
function vkcRiftScar(sc, age, fade) {
  const c = Math.cos(sc.a), s = Math.sin(sc.a), seg = { x1: sc.x - c * sc.L, y1: sc.y - s * sc.L, x2: sc.x + c * sc.L, y2: sc.y + s * sc.L };
  const open = vraOut(age / 0.1) * (0.3 + 0.7 * fade), R = vkzRift(seg, sc.seed, open, sc.w);
  vraLens(seg.x1, seg.y1, seg.x2, seg.y2, sc.w * 2.6 * open, VKZ_VOID, 0.35 * fade);
  vkzCracks(R, sc.seed, open, fade);
  vkzPoly(R.A);
  for (let i = R.B.length - 1; i >= 0; i--) ctx.lineTo(R.B[i][0], R.B[i][1]);
  ctx.closePath();
  ctx.fillStyle = rgba(VKZ_VOID, 0.96 * fade); ctx.fill();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.75 + 0.25 * Math.sin(uiTime * 11 + sc.seed);
  vraLens(seg.x1, seg.y1, seg.x2, seg.y2, sc.w * 0.5 * open, VKZ_CRIM, 0.6 * fl * fade);
  vraLens(seg.x1, seg.y1, seg.x2, seg.y2, sc.w * 0.16 * open, VKZ_HOT, 0.6 * fl * fade * Math.exp(-age * 1.2));
  ctx.restore();
}
// QUAKE's ground: the floor under the body broken into plates round it. It cracks in, heaves as the
// dead drag the body down into the pit, slams shut on the beat, and settles, its seams cooling
function vkcPlates(sc, age, fade) {
  const K = sc.ex.kill, n = sc.cuts.length, S = sc.S, grow = vkcIn(age, 0.04, 0.35 * K);
  if (grow <= 0) return;
  const heave = vkcIn(age, 0.45 * K, K) * (1 - vkcIn(age, K, K + 0.1)), slam = age >= K ? Math.exp(-(age - K) * 7) : 0;
  const heat = age < K ? 0.35 + 0.65 * heave : 0.25 + 0.75 * slam;
  const pit = age < K ? vkcIn(age, 0.3 * K, K) : 1 - vkcIn(age, K + 0.25, K + 1.3);
  const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sc.R * 1.15);
  g.addColorStop(0, rgba(VKZ_VOID, 0.6 * fade * grow)); g.addColorStop(1, rgba(VKZ_VOID, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.R * 1.15, 0, TAU); ctx.fill();
  for (let i = 0; i < n; i++) {                   // the seams, out from under it
    const an = sc.cuts[i], pts = vkcCrack(sc.x + Math.cos(an) * S * 0.4, sc.y + Math.sin(an) * S * 0.4, an, sc.R - S * 0.4, sc.seed + i * 13, 5);
    vkcCrackDraw(pts, grow, 3.4 + 3 * heave + 2 * slam, heat, fade);
  }
  if (heave > 0.02 || slam > 0.02) {              // each plate's rim, lifted and lit while it heaves
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(VKZ_HOT, (0.55 * heave + 0.7 * slam) * fade); ctx.lineWidth = 1.6;
    for (let i = 0; i < n; i++) {
      const a0 = sc.cuts[i], a1 = i + 1 < n ? sc.cuts[i + 1] : sc.cuts[0] + TAU, r = sc.R * (0.8 + 0.22 * vraH(sc.seed + i * 3.3)) + 4 * heave;
      ctx.beginPath(); ctx.arc(sc.x, sc.y, r, a0 + 0.07, a1 - 0.07); ctx.stroke();
    }
    ctx.restore();
  }
  if (pit > 0.01) {                               // the pit it is dragged down into, closing after
    const pr = S * (0.5 + 0.75 * pit) * 1.3;
    const p = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, pr);
    p.addColorStop(0, rgba('#000000', 0.95 * fade)); p.addColorStop(0.65, rgba(VKZ_DEEP, 0.8 * fade)); p.addColorStop(1, rgba(VKZ_VOID, 0));
    ctx.fillStyle = p; ctx.beginPath(); ctx.arc(sc.x, sc.y, pr, 0, TAU); ctx.fill();
  }
}
// NO MERCY's brand: 無 burned into the floor where it stood, white-hot, then crimson, then a scar
function vkcBrand(sc, age, fade) {
  const heat = Math.exp(-age * 1.4), size = sc.r * 1.5 * (1 + 0.25 * Math.exp(-age * 10));
  const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sc.r * 1.5);
  g.addColorStop(0, rgba(VKZ_VOID, 0.7 * fade)); g.addColorStop(1, rgba(VKZ_VOID, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r * 1.5, 0, TAU); ctx.fill();
  ctx.save();
  ctx.translate(sc.x, sc.y); ctx.rotate(sc.rot);
  ctx.font = '900 ' + Math.round(size) + 'px ' + VKZ_JP; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(VKZ_VOID, 0.85 * fade); ctx.fillText('無', 0, 0);
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = rgba(VKZ_CRIM, heat * fade); ctx.shadowBlur = 16 * heat;
  ctx.fillStyle = rgba(VKZ_CRIM, (0.25 + 0.6 * heat) * fade); ctx.fillText('無', 0, 0);
  ctx.shadowBlur = 0;
  if (heat > 0.3) { ctx.fillStyle = rgba(VKZ_PALE, (heat - 0.3) * fade); ctx.fillText('無', 0, 0); }
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.5 * fade); ctx.lineWidth = 1.2;      // the cuts round it
  for (let i = 0; i < 8; i++) {
    const an = sc.seed + i / 8 * TAU, r0 = sc.r * 1.05, r1 = sc.r * (1.3 + 0.3 * vraH(sc.seed + i));
    ctx.beginPath(); ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); ctx.stroke();
  }
  ctx.restore();
}
// what EYE OF THE STORM's storm leaves: its arms scorched into the floor
function vkcSpiralScar(sc, age, fade) {
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, r = lerp(30, sc.r, u), th = sc.a + arm / 3 * TAU - 2.2 * u * sc.sd;
      ctx[i ? 'lineTo' : 'moveTo'](sc.x + Math.cos(th) * r, sc.y + Math.sin(th) * r);
    }
    ctx.strokeStyle = rgba(VKZ_VOID, 0.45 * fade); ctx.lineWidth = 16; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.4 * fade * Math.exp(-age * 1.5)); ctx.lineWidth = 2; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
}

/* --------------------------- the floor: Z's floor layer --------------------------- */
// from vkzFloorFx: the stance's ground while it holds, and what the vow's C leaves on the floor
function vkcFloor() {
  vkcStep();
  const t = uiTime, s = P.roninStill;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const sc of VKC.scars) {
    const age = t - sc.at, fade = 1 - vraEase((age - (sc.life - 0.8)) / 0.8);
    if (age < 0 || fade <= 0) continue;
    if (sc.k === 'ground') vkcGround(sc.x, sc.y, 1, sc.seed, fade, 0.9 * Math.exp(-age * 2.5) + (sc.burst ? 0.5 * Math.exp(-age * 6) : 0), sc.burst);
    else if (sc.k === 'splat') vkcSplatDraw(sc, fade);
    else if (sc.k === 'rift') vkcRiftScar(sc, age, fade);
    else if (sc.k === 'plates') vkcPlates(sc, age, fade);
    else if (sc.k === 'fissure') vkcCrackDraw(sc.pts, vkcQ(age, sc.t0, sc.t1), sc.w, Math.exp(-Math.max(0, age - sc.t1) * 1.6), fade);
    else if (sc.k === 'brand') vkcBrand(sc, age, fade);
    else if (sc.k === 'spiral') vkcSpiralScar(sc, age, fade);
  }
  if (s && s.vow) {
    const pound = vkcPound(t);
    vkcGround(s.x, s.y, vkcIn(s.t, 0, 0.5), VKC.ground, 1, 0.25 + 0.75 * pound, false);
    const c = s.vow.quake ? roninCleaves.find(q => q.id === s.vow.quake) : null;
    if (c) vkcCrackDraw(vkcFault(s.x, s.y, c.x, c.y, VKC.ground + 5), vkcIn(s.t, 0.05, 0.45), 3.2, 0.3 + 0.7 * pound, 1);
  }
  ctx.restore();
}

/* ---------------------------- the art's own clock ---------------------------- */
// stepped once a frame by whichever runs first (vkcFloor, vkcWorld)
function vkcStep() {
  const t = uiTime;
  if (VKC.stepAt === t) return VKC.dt;
  let dt = t - VKC.stepAt; VKC.stepAt = t;
  if (!(dt > 0 && dt < 0.1)) dt = 0.016;
  VKC.dt = dt;
  for (let i = VKC.souls.length - 1; i >= 0; i--) {
    const s = VKC.souls[i];
    s.t += dt;
    if (s.t >= s.life) { VKC.souls.splice(i, 1); continue; }
    const d = Math.pow(s.drag, dt), cs = Math.cos(s.curl * dt), sn = Math.sin(s.curl * dt);
    const vx = (s.vx * cs - s.vy * sn) * d, vy = (s.vx * sn + s.vy * cs) * d - s.rise * dt;
    s.vx = vx; s.vy = vy; s.x += vx * dt; s.y += vy * dt;
  }
  for (let i = VKC.bits.length - 1; i >= 0; i--) {
    const b = VKC.bits[i];
    b.t += dt;
    if (b.t >= b.life) { VKC.bits.splice(i, 1); continue; }
    if (b.down) continue;
    const d = Math.pow(0.45, dt);
    b.vx *= d; b.vy *= d; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += (b.spin || 0) * dt;
    b.vz -= 620 * dt; b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      if (b.k === 'drop') { vkcSplat(b.x, b.y, b.r * rnd(3, 1.8)); VKC.bits.splice(i, 1); continue; }
      b.down = t; b.spin = 0;
    }
  }
  for (const L of [VKC.scars, VKC.marks]) for (let i = L.length - 1; i >= 0; i--) if (t - L[i].at > L[i].life) L.splice(i, 1);
  const s = P.roninStill;
  if (s && s.vow) {                               // the stance's ring throws sparks off its burning end; heat comes off him
    const an = -Math.PI / 2 + vkcLeft(s) * TAU, R = P.r + 32;
    if (rnd() < dt * 40) vraPart({ k: 'spark', x: P.x + Math.cos(an) * R, y: P.y + Math.sin(an) * R,
      vx: -Math.sin(an) * rnd(120, 40) + rnd(30, -30), vy: Math.cos(an) * rnd(120, 40) - rnd(60, 10),
      r: rnd(1.4, 0.6), col: rnd() < 0.3 ? VKZ_PALE : VKZ_HOT, a: 1, life: rnd(0.4, 0.15), drag: 0.1 });
    if (rnd() < dt * 14) vraPart({ k: 'ember', x: P.x + rnd(16, -16), y: P.y + rnd(10, -10), vx: rnd(20, -20), vy: rnd(-10, -70),
      r: rnd(1.6, 0.7), col: VKZ_CRIM, a: 0.9, life: rnd(0.9, 0.5), drag: 0.3, g: -40 });
  }
  for (const sc of VKC.scars) {                   // WRATH's tears: the dead keep rising out of them while they are open
    if (sc.k !== 'rift' || t - sc.at > sc.life - 0.8 || rnd() >= dt * sc.L / 90) continue;
    const u = rnd(0.85, -0.85), side = rnd() < 0.5 ? 1 : -1;
    vkzSoul(sc.x + Math.cos(sc.a) * sc.L * u, sc.y + Math.sin(sc.a) * sc.L * u, sc.a + side * Math.PI / 2 + rnd(0.5, -0.5), rnd(40, 18),
            { w: rnd(9, 6), life: rnd(1.1, 0.7), rise: 26, drag: 0.4, a: 0.85 });
  }
  return dt;
}

/* --------------------------- what is thrown off it --------------------------- */
// the dead let loose by a counter: as vkzSoul, but drawn over the execution's grade
function vkcSoul(x, y, ang, spd, o) {
  o = o || {};
  if (VKC.souls.length > 80) VKC.souls.shift();
  VKC.souls.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, w: o.w || rnd(13, 8), life: o.life || rnd(1, 0.6), t: 0,
                   drag: o.drag === undefined ? 0.2 : o.drag, rise: o.rise || 0, curl: o.curl === undefined ? rnd(1.4, -1.4) : o.curl,
                   wob: rnd(TAU), a: o.a || 1 });
}
function vkcSouls() {
  for (const s of VKC.souls) {
    const q = s.t / s.life, a = vraOut(s.t / 0.06) * (1 - vraEase((q - 0.55) / 0.45)) * s.a;
    const spd = Math.hypot(s.vx, s.vy), ang = spd > 1 ? Math.atan2(s.vy, s.vx) : -Math.PI / 2;
    vkzFace(s.x, s.y, ang, s.w * (1.4 + 1.2 * q) + Math.min(80, spd * 0.12), s.w * (1 - 0.3 * q), 0.6 + 0.4 * Math.sin(s.t * 9 + s.wob), a);
  }
}
function vkcBit(o) { if (VKC.bits.length > 240) VKC.bits.shift(); o.t = 0; o.rot = rnd(TAU); VKC.bits.push(o); }
// blood: drops that fly, fall, and stay where they land
function vkcBlood(x, y, n, spd, ang, spread) {
  for (let i = 0; i < n; i++) {
    const an = ang === undefined ? rnd(TAU) : ang + rnd(spread / 2, -spread / 2), sp = spd * rnd(1.2, 0.3);
    vkcBit({ k: 'drop', x, y, z: rnd(20, 6), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, vz: rnd(220, 40), r: rnd(2.6, 1), life: 3 });
  }
}
// what is thrown up: 'shard' (of the floor) or 'bone' (of what was inside it)
function vkcDebris(k, x, y, n, spd, size) {
  for (let i = 0; i < n; i++) {
    const an = rnd(TAU), sp = spd * rnd(1.2, 0.35);
    vkcBit({ k, x, y, z: rnd(16, 4), vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, vz: rnd(300, 100), s: size * rnd(1.3, 0.6),
             spin: rnd(14, -14), life: rnd(1.8, 1.2) });
  }
}
function vkcBits() {
  const t = uiTime;
  for (const b of VKC.bits) {
    const a = b.down ? 1 - vraEase((t - b.down) / 0.6) : 1;
    if (a <= 0) continue;
    const y = b.y - b.z;
    if (b.k === 'drop') { ctx.fillStyle = rgba(VKZ_CRIM, 0.95); ctx.beginPath(); ctx.arc(b.x, y, b.r, 0, TAU); ctx.fill(); continue; }
    ctx.save();
    ctx.translate(b.x, y); ctx.rotate(b.rot);
    if (b.k === 'shard') {
      ctx.beginPath(); ctx.moveTo(-b.s * 0.6, -b.s * 0.4); ctx.lineTo(b.s * 0.5, -b.s * 0.55); ctx.lineTo(b.s * 0.7, b.s * 0.25); ctx.lineTo(-b.s * 0.2, b.s * 0.6); ctx.closePath();
      ctx.fillStyle = rgba('#0b0d14', 0.95 * a); ctx.fill();
      ctx.strokeStyle = rgba(VKZ_HOT, 0.75 * a); ctx.lineWidth = 1; ctx.stroke();
    } else vkzBone(-b.s, 0, b.s, 0, b.s * 0.32, b.s * 0.28, b.s * 0.16, -0.6, -0.8, a, 0, b.s < 6);   // a bone, knobbed at its ends
    ctx.restore();
  }
}

/* ------------------------------ the body, in pieces ------------------------------ */
// a cut through it: black, crimson round a core as hot as heat
function vkcSeam(x0, y0, x1, y1, w, heat, a) {
  if (a <= 0.01) return;
  ctx.save();
  vraLens(x0, y0, x1, y1, w, VKZ_VOID, 0.9 * a);
  ctx.globalCompositeOperation = 'lighter';
  vraLens(x0, y0, x1, y1, w * 0.75, VKZ_CRIM, (0.45 + 0.55 * heat) * a);
  if (heat > 0.05) vraLens(x0, y0, x1, y1, w * 0.3, VKZ_PALE, heat * a);
  ctx.restore();
}
// the body (the room's own drawing of it), moved, turned and scaled about itself
function vkcBodyAt(e, k, ox, oy, rot, sc) {
  ctx.save();
  ctx.translate(e.x + ox, e.y + oy); ctx.rotate(rot || 0); ctx.scale(sc || 1, sc || 1); ctx.translate(-e.x, -e.y);
  rkcBody(e, k);
  ctx.restore();
}
// pieces: [{ path, dx, dy (where it is thrown), rot, spin, dur, drift, seams }]; o: life, sink (when what
// is left is dragged under), cx, cy (what it turns about)
function vkcCorpse(e, pieces, o) {
  return { e, pieces, at: uiTime, life: o.life || 1.6, sink: o.sink, cx: o.cx === undefined ? e.x : o.cx, cy: o.cy === undefined ? e.y : o.cy };
}
// in two along the line through it at a, the halves thrown apart
function vkcHalves(e, a, o) {
  const c = Math.cos(a), s = Math.sin(a), R = e.r * 6 + 300, ch = rkcChord(e.x, e.y, e.r * 1.02, e.x, e.y, a);
  return vkcCorpse(e, [-1, 1].map(sd => ({ path: rkcHalfPath(e.x, e.y, a, sd, R), dx: (-s + c * 0.15) * o.sep * sd, dy: (c + s * 0.15) * o.sep * sd,
    rot: o.rot * sd, dur: 0.18, drift: 30, seams: ch ? [[ch.x0, ch.y0, ch.x1, ch.y1]] : null })), o);
}
// in wedges between the angles of dirs (sorted), each thrown toward out(mid), d(mid) far
function vkcWedges(e, dirs, out, o) {
  return vkcCorpse(e, dirs.map((a0, i) => {
    const a1 = i + 1 < dirs.length ? dirs[i + 1] : dirs[0] + TAU, mid = (a0 + a1) / 2, th = out(mid), d = o.d(mid);
    return { path: rkcWedgePath(e.x, e.y, a0, a1, e.r * 6 + 300), dx: Math.cos(th) * d, dy: Math.sin(th) * d, rot: rnd(o.rot, -o.rot),
             spin: o.spin ? rnd(o.spin, -o.spin) : 0, dur: o.dur || 0.22, drift: o.drift === undefined ? 30 : o.drift,
             seams: [[e.x, e.y, e.x + Math.cos(a0) * e.r, e.y + Math.sin(a0) * e.r]] };
  }), o);
}
function vkcDrawCorpses() {
  const t = uiTime, C = VKC.corpses;
  for (let i = C.length - 1; i >= 0; i--) if (t - C[i].at > C[i].life) C.splice(i, 1);
  for (const c of C) {
    const age = t - c.at, k = 1 - vraEase((age - (c.life - 0.5)) / 0.5), sink = c.sink === undefined ? 0 : vraEase(vkcQ(age, c.sink, c.sink + 0.7));
    const sc = 1 - 0.8 * sink, a = k * (1 - 0.7 * sink);
    if (sc <= 0.02 || a <= 0.01) continue;
    try {
      for (const pc of c.pieces) {
        const mv = vraOut(age / pc.dur), L = Math.hypot(pc.dx, pc.dy) || 1;
        const dx = pc.dx * mv + pc.dx / L * pc.drift * age, dy = pc.dy * mv + pc.dy / L * pc.drift * age;
        ctx.save();
        ctx.translate(c.cx + dx, c.cy + dy); ctx.rotate(pc.rot * vraOut(age / 0.5) + (pc.spin || 0) * age); ctx.scale(sc, sc); ctx.translate(-c.cx, -c.cy);
        ctx.save(); pc.path(); ctx.clip(); rkcBody(c.e, a, true); ctx.restore();
        if (pc.seams) for (const sm of pc.seams) vkcSeam(sm[0], sm[1], sm[2], sm[3], Math.max(1.6, c.e.r * 0.13), Math.exp(-age * 3), a);
        ctx.restore();
      }
    } catch (err) { c.life = 0; }
  }
}
// the dead's hands up out of the floor round it, closing on it from q0 on; pull drags them back down
function vkcHoldArms(e, n, seed, q0, q, a, pull) {
  const S = e.r, sz = clamp(S * 1.15, 20, 64);
  for (let i = 0; i < n; i++) {
    const h = vraH(seed + i * 4.1), k = vkcIn(q, q0 + i * 0.02, q0 + 0.09 + i * 0.02);
    if (k <= 0) continue;
    const an = seed + i / n * TAU + (h - 0.5) * 0.6, d = S + 22 + 10 * h, bx = e.x + Math.cos(an) * d, by = e.y + Math.sin(an) * d;
    ctx.fillStyle = rgba(VKZ_VOID, 0.9 * a * k);
    ctx.beginPath(); ctx.ellipse(bx, by, 7 + S * 0.1, 5 + S * 0.07, an, 0, TAU); ctx.fill();
    vkzArm(bx, by, an + Math.PI + (h - 0.5) * 0.3, Math.max(3, (d - sz * 0.55) * k - pull), 0.15 + 0.75 * k, sz, a * k);
  }
}
// a cut drawn across, (x0, y0) to (x1, y1): its head and tail along it (0 to 1); crimson round white
function vkcSlash(x0, y0, x1, y1, w, head, tail, a) {
  if (a <= 0.01 || head <= tail) return;
  const hx = lerp(x0, x1, head), hy = lerp(y0, y1, head), tx = lerp(x0, x1, tail), ty = lerp(y0, y1, tail);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vraLens(tx, ty, hx, hy, w * 2.8, VKZ_CRIM, 0.45 * a);
  vraLens(tx, ty, hx, hy, w, VKZ_HOT, 0.9 * a);
  vraLens(tx, ty, hx, hy, w * 0.3, VKZ_PALE, a);
  if (head < 1) drawGlow(hx, hy, w * 6, VKZ_PALE, 0.6 * a);
  ctx.restore();
}
// the hull's own cut: a crescent off it toward ang, black and crimson, sweeping dir
function vkcCrescent(px, py, ang, arc, reach, prog, a, dir) {
  if (a <= 0.01 || prog <= 0) return;
  const a0 = ang - dir * arc / 2, a1 = a0 + dir * arc * prog, th = reach * 0.36, N = 18;
  ctx.save();
  ctx.translate(px, py);
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const an = lerp(a0, a1, i / N); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * reach, Math.sin(an) * reach); }
  for (let i = N; i >= 0; i--) { const k = i / N, an = lerp(a0, a1, k), r = reach - th * Math.pow(k, 1.4); ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); }
  ctx.closePath();
  ctx.fillStyle = rgba(VKZ_VOID, 0.85 * a); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(VKZ_CRIM, 0.5 * a); ctx.fill();
  ctx.strokeStyle = rgba(VKZ_HOT, 0.95 * a); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, reach, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
  drawGlow(Math.cos(a1) * reach, Math.sin(a1) * reach, 16, VKZ_PALE, 0.7 * a);
  ctx.restore();
}

/* ------------------------------ the stance's pieces ------------------------------ */
// the bodies the stance would finish whatever it caught: at its share of their health or under
function vkcDoomed(v) {
  const out = [], reach = typeof WATER_REACH !== 'undefined' ? WATER_REACH : 700;
  for (const e of enemies) {
    if (e.dead || e.hacked || e.phased || e.vrFounder || e.roninHide || !(e.maxHp > 0)) continue;
    if (Math.hypot(e.x - P.x, e.y - P.y) > reach) continue;
    const f = typeof roninFinaleOf === 'function' ? roninFinaleOf(e) : null;
    if ((f ? f.hp / f.maxHp : e.hp / e.maxHp) > v.exec) continue;
    if (!f && typeof stillCanExec === 'function' && !stillCanExec(e)) continue;
    out.push(e);
  }
  return out;
}
// the doomed: a ring turning at their feet, and their souls already half out of them, drawn toward him
function vkcCondemned(list, k, t) {
  for (const e of list) {
    const ang = Math.atan2(P.y - e.y, P.x - e.x), pull = 0.5 + 0.5 * Math.sin(t * 5 + e.x * 0.03), r = Math.max(8, e.r);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.setLineDash([4, 5]); ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.65 * k); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 8, 0, TAU); ctx.stroke();
    ctx.restore();
    vkzFace(e.x + Math.cos(ang) * r * (0.4 + 0.6 * pull), e.y + Math.sin(ang) * r * (0.4 + 0.6 * pull) - r * 0.25, ang,
            r * (1.7 + 0.9 * pull), r * 0.85, 0.85, 0.6 * k);
  }
}
// EYE OF THE STORM's storm: the dead whirled round (X, Y) in three arms out to R, its wall close in;
// tight pulls the wall in and lights it, spin is how far it has turned
function vkcStorm(X, Y, R, k, tight, spin) {
  if (k <= 0.01) return;
  const t = uiTime, r0 = lerp(76, 44, tight), N = 26;
  ctx.save();
  ctx.lineCap = 'round';
  for (let arm = 0; arm < 3; arm++) {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, r = lerp(r0, R, u), th = arm / 3 * TAU + spin - 2.2 * u + 0.12 * Math.sin(t * 3 + u * 9 + arm);
      pts.push([X + Math.cos(th) * r, Y + Math.sin(th) * r, u]);
    }
    for (let i = 1; i <= N; i++) {
      const env = Math.sin(Math.PI * pts[i][2]) * (0.6 + 0.4 * vraH(arm * 31 + i + Math.floor(t * 8)));
      ctx.strokeStyle = rgba(VKZ_VOID, 0.42 * env * k); ctx.lineWidth = 18 * env + 2;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= N; i++) {
      const env = Math.sin(Math.PI * pts[i][2]);
      ctx.strokeStyle = rgba(VKZ_CRIM, (0.3 + 0.45 * tight) * env * k); ctx.lineWidth = 5 * env + 1;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < 15; i++) {                  // the dead riding it, out along the arms
    const arm = i % 3, u = (i * 0.377 + t * (0.28 + 0.4 * tight)) % 1, r = lerp(r0, R, u);
    const th = arm / 3 * TAU + spin - 2.2 * u + (vraH(i * 7) - 0.5) * 0.4, a = vkcQ(u, 0, 0.1) * (1 - vkcQ(u, 0.8, 1)) * k;
    vkzFace(X + Math.cos(th) * r, Y + Math.sin(th) * r, th + 1.1, 24 + 14 * u, 8 + 4 * u, 0.7 + 0.3 * Math.sin(t * 8 + i), 0.75 * a);
  }
  ctx.globalCompositeOperation = 'lighter';       // its wall, round him; its reach, a ring at its edge turning
  ctx.strokeStyle = rgba(VKZ_HOT, (0.25 + 0.4 * tight) * k); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X, Y, r0, 0, TAU); ctx.stroke();
  ctx.setLineDash([10, 14]); ctx.lineDashOffset = -t * 60;
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.35 * k); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(X, Y, R, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}
// his eye, open over the storm: an almond of dark, a crimson iris, the pupil a slit, turned on look
function vkcEye(x, y, w, open, look, a) {
  if (a <= 0.01 || open <= 0.01) return;
  const hh = w * 0.42 * open;
  const lens = () => { ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y - hh * 2, x + w / 2, y); ctx.quadraticCurveTo(x, y + hh * 2, x - w / 2, y); ctx.closePath(); };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, w * 0.9, VKZ_CRIM, 0.45 * a);
  ctx.globalCompositeOperation = 'source-over';
  lens(); ctx.fillStyle = rgba(VKZ_VOID, 0.92 * a); ctx.fill();
  ctx.save();
  lens(); ctx.clip();
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.55 * a); ctx.lineWidth = Math.max(0.6, w * 0.012);      // veins, in from the corners
  for (let i = 0; i < 8; i++) {
    const sd = i % 2 ? 1 : -1, pts = vkcCrack(x + sd * w / 2, y, (sd > 0 ? Math.PI : 0) + (vraH(i * 3.3) - 0.5) * 1.2, w * (0.18 + 0.12 * vraH(i)), i * 7.7, 4);
    vkcPath(pts, 1); ctx.stroke();
  }
  let ix = x, iy = y;
  if (look) { const an = Math.atan2(look.y - y, look.x - x); ix += Math.cos(an) * w * 0.14; iy += Math.sin(an) * hh * 0.35; }
  const ir = w * 0.2, g = ctx.createRadialGradient(ix, iy, 0, ix, iy, ir);
  g.addColorStop(0, rgba(VKZ_PALE, a)); g.addColorStop(0.35, rgba(VKZ_HOT, a)); g.addColorStop(0.8, rgba(VKZ_CRIM, a)); g.addColorStop(1, rgba(VKZ_DEEP, a));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.95 * a);
  ctx.beginPath(); ctx.ellipse(ix, iy, ir * 0.16, ir * 0.85, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(ix - ir * 0.35, iy - ir * 0.35, ir * 0.3, '#ffffff', 0.8 * a);
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';       // the lids' rims, burning
  lens(); ctx.strokeStyle = rgba(VKZ_HOT, 0.85 * a); ctx.lineWidth = Math.max(1, w * 0.025); ctx.stroke();
  ctx.restore();
}
// QUAKE: his pulse running down the crack to the cross, and the cross answering it
function vkcQuakeRun(s, k, t) {
  const c = roninCleaves.find(q => q.id === s.vow.quake);
  if (!c) return;
  const grow = vkcIn(s.t, 0.05, 0.45), pts = vkcFault(s.x, s.y, c.x, c.y, VKC.ground + 5), pound = vkcPound(t);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const u = ((t / 0.46) + i * 0.5) % 1;
    if (u > grow) continue;
    const [px, py] = vkcAlong(pts, u);
    drawGlow(px, py, 16, VKZ_HOT, 0.7 * k * Math.sin(Math.PI * u));
  }
  drawGlow(c.x, c.y, 40 + 20 * pound, VKZ_CRIM, (0.25 + 0.35 * pound) * k * grow);
  ctx.restore();
}
// the dead's arms clawing up out of the floor round him, restless: out, back, grasping
function vkcStanceArms(v, X, Y, k, t) {
  const n = v.quake ? 6 : 4;
  for (let i = 0; i < n; i++) {
    const h = vraH(i * 9.7 + 3), an = i / n * TAU + 0.5 + 0.3 * Math.sin(t * 0.9 + i * 2);
    const out = 0.5 + 0.5 * Math.sin(t * (3.1 + 1.3 * h) + i * 2.3), rb = P.r + 18 + 8 * h;
    const bx = X + Math.cos(an) * rb, by = Y + Math.sin(an) * rb;
    ctx.fillStyle = rgba(VKZ_VOID, 0.85 * k);
    ctx.beginPath(); ctx.ellipse(bx, by, 6, 4, an, 0, TAU); ctx.fill();
    vkzArm(bx, by, an + 0.35 * Math.sin(t * 2.2 + i * 1.7), (4 + 10 * out) * k, 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(t * 8.5 + i * 2.9)), 19 + 4 * h, k);
  }
}
// the dead whirling round him, each its own way round, wailing
function vkcWhirl(X, Y, k, t) {
  for (let i = 0; i < 9; i++) {
    const h = vraH(i * 4.3 + 1), dir = i % 3 === 2 ? -1 : 1, th = i / 9 * TAU + t * (2.4 + 1.8 * h) * dir + 0.5 * Math.sin(t * 1.9 + i);
    const rr = P.r + 30 + 40 * h + 12 * Math.sin(t * (2.6 + h) + i * 1.3);
    vkzFace(X + Math.cos(th) * rr, Y + Math.sin(th) * rr - 6, th + dir * (Math.PI / 2 + 0.25), 26 + 18 * h, 8 + 3 * h,
            0.55 + 0.45 * Math.sin(t * 9 + i * 1.7), 0.7 * k);
  }
}
// the three great souls circling him close: the blows it can still catch
function vkcCharges(v, X, Y, k, t) {
  const n = Math.max(0, v.catches - v.caught);
  for (let j = 0; j < n; j++) {
    const th = -t * 4.6 + j * TAU / 3, r = P.r + 13, x = X + Math.cos(th) * r, y = Y + Math.sin(th) * r * 0.9;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(x, y, 15, VKZ_CRIM, 0.55 * k); ctx.restore();
    vkzFace(x, y, th - Math.PI / 2, 30, 12, 1, k);
  }
}
// its clock: a ring of crimson burning down round him, crackling, sparks off its burning end
function vkcClock(X, Y, left, k, t) {
  if (left <= 0) return;
  const R = P.r + 32, a0 = -Math.PI / 2, a1 = a0 + left * TAU, N = Math.max(4, Math.ceil(left * 64)), fr = Math.floor(t * 30);
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const an = lerp(a0, a1, i / N), j = (vraH(i * 1.9 + fr * 0.37) - 0.5) * 3.2;
    ctx[i ? 'lineTo' : 'moveTo'](X + Math.cos(an) * (R + j), Y + Math.sin(an) * (R + j));
  }
  ctx.strokeStyle = rgba(VKZ_VOID, 0.7 * k); ctx.lineWidth = 4.5; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.85 * k); ctx.lineWidth = 2.2; ctx.stroke();
  ctx.strokeStyle = rgba(VKZ_HOT, 0.5 * k); ctx.lineWidth = 0.8; ctx.stroke();
  const ex = X + Math.cos(a1) * R, ey = Y + Math.sin(a1) * R;
  drawGlow(ex, ey, 18, VKZ_CRIM, 0.8 * k); drawGlow(ex, ey, 6, VKZ_PALE, k);
  ctx.restore();
}
// his outline shaking off him, harder on each beat of his pulse
function vkcShudder(X, Y, k, pound) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) {
    const ox = rnd(3.5, -3.5) * (1 + pound), oy = rnd(3.5, -3.5) * (1 + pound);
    ctx.strokeStyle = rgba(i ? VKZ_HOT : VKZ_CRIM, (0.35 + 0.3 * pound) * k); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(X + ox, Y + oy, P.r + 1.5, 0, TAU); ctx.stroke();
  }
  drawGlow(X, Y, P.r + 26, VKZ_CRIM, (0.18 + 0.25 * pound) * k);
  ctx.restore();
}

/* ------------------------------ the stance: under the hull ------------------------------ */
function vkcStance(s) {
  const v = s.vow, t = uiTime, X = P.x, Y = P.y, pound = vkcPound(t), left = vkcLeft(s);
  const k = vraOut(s.t / 0.18) * (left < 0.25 ? (Math.sin(t * 38) > 0 ? 1 : 0.5) : 1);
  const doomed = vkcDoomed(v);
  let near = null, nd = Infinity;
  for (const e of doomed) { const d = Math.hypot(e.x - X, e.y - Y); if (d < nd) { nd = d; near = e; } }
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (v.eye) vkcStorm(X, Y, v.eye, k, 0, t * 1.6);
  if (v.quake) vkcQuakeRun(s, k, t);
  vkcCondemned(doomed, k, t);
  if (v.eye) vkcEye(X, Y - 70, 60, 0.3 + 0.12 * pound, near, k);
  else {
    // his true form at his back, shaking with it: WRATH's blade high, QUAKE's in the floor, NO MERCY's levelled
    const h = 92, tr = 0.05 * Math.sin(t * 37), j = (vraH(t * 53.1) - 0.5) * 3;
    const ba = v.quake ? Math.PI / 2 - 0.3 + tr
             : v.n === 'NO MERCY' ? (near ? Math.atan2(near.y - (Y - 0.6 * h), near.x - (X - 0.17 * h)) : P.ang) + tr
             : -Math.PI / 2 - 0.5 + tr;
    vkzSpecter(X + j, Y + 6, h, 0.8 * k * (0.85 + 0.15 * pound), 0, ba, 1, 1, false);
  }
  vkcStanceArms(v, X, Y, k, t);
  vkcWhirl(X, Y, k, t);
  vkcCharges(v, X, Y, k, t);
  vkcClock(X, Y, left, k, t);
  vkcShudder(X, Y, k, pound);
  ctx.restore();
}

/* --------------------------------- the counters ---------------------------------
   VKC_PLAN[kind](x) at the catch, VKC_DRAW[kind](x, q, plan) every frame of it (q = x.t),
   VKC_KILL[kind](x, plan) on its beat; kind is vkcKind's. Pieces go to VKC.corpses on the
   beat and are drawn from then on, past the end of the counter. */
const VKC_PLAN = {}, VKC_DRAW = {}, VKC_KILL = {};
function vkcBegin(x) {
  VKC.x = x; VKC.once = {};
  VKC.seed = Math.floor(rnd(997)) + 1; VKC.side = rnd() < 0.5 ? -1 : 1;
  const e = x.e;
  VKC.fx = e ? (e.x + x.to.x) / 2 : x.to.x; VKC.fy = e ? (e.y + x.to.y) / 2 : x.to.y;
  VKC.fr = e ? Math.hypot(e.x - x.to.x, e.y - x.to.y) / 2 + e.r * 1.6 + 70 : 120;
  const f = VKC_PLAN[vkcKind(x)];
  try { VKC.plan = f ? f(x) : {}; } catch (err) { VKC.plan = {}; }
}
// the catch, under every counter: the hand of the dead that snatched the blow, out of the floor at his
// feet; the rift he tore through to whoever threw it, his phantoms strung along it; where he stood
function vkcCatchArt(x) {
  const q = x.t;
  if (q > 0.5) return;
  const fx = x.from.x, fy = x.from.y, ba = VKC.ba;
  const reach = vraOut(q / 0.05), grip = vkcIn(q, 0.03, 0.09), sink = vraEase(vkcQ(q, 0.22, 0.45));
  vkzArm(fx + Math.cos(ba) * 6, fy + Math.sin(ba) * 6, ba, (6 + 12 * reach) * (1 - 0.8 * sink), grip, 30, 1 - sink);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (q < 0.2) { drawGlow(VKC.gx, VKC.gy, 26, VKZ_CRIM, 0.8 * (1 - q / 0.2)); drawGlow(VKC.gx, VKC.gy, 9, VKZ_PALE, 1 - q / 0.2); }
  ctx.restore();
  if (grip >= 1 && vkcOnce('crush')) {             // it crushes what it caught
    vraSparks(VKC.gx, VKC.gy, 14, VKZ_PALE, 280, 0, TAU, 0.22, 1.1);
    vraEmbers(VKC.gx, VKC.gy, 6, VKZ_CRIM, 80, 0.6, 1.1);
  }
  if (!x.e) return;
  const open = vraOut(q / 0.04) * (1 - vraEase(vkcQ(q, 0.12, 0.5)));
  vkxTear(fx, fy, x.to.x, x.to.y, (x.exec ? 11 : 7) * open, VKC.seed, open);
  const L = Math.hypot(x.to.x - fx, x.to.y - fy), n = clamp(Math.floor(L / 40), 2, 12);
  for (let i = 1; i <= n; i++) {
    const u = i / (n + 1);
    vkxGhost({ x: lerp(fx, x.to.x, u), y: lerp(fy, x.to.y, u), a: x.ang }, 0.8 * (1 - vraEase(vkcQ(q, 0.02 + u * 0.1, 0.3 + u * 0.12))));
  }
  vkxGhost({ x: fx, y: fy, a: x.ang }, 1 - vraEase(q / 0.3));
}

/* ---- a counter that does not execute: a frenzy of cuts through it, and the hull's crescent */
VKC_PLAN.strike = x => {
  const cuts = [];
  for (let i = 0; i < 5; i++) cuts.push({ a: x.ang + (i % 2 ? Math.PI / 2 : 0) + rnd(0.7, -0.7), at: i * 0.028 });
  return { cuts };
};
VKC_DRAW.strike = (x, q, p) => {
  const e = x.e;
  vkcCrescent(P.x, P.y, x.ang + Math.PI, 2.4, P.r + 28, vraOut(q / 0.08), 1 - vraEase(vkcQ(q, 0.1, 0.32)), VKC.side);
  const L = e.r * 1.4 + 20;
  for (const ct of p.cuts) {
    const k = q - ct.at;
    if (k < 0) continue;
    const c = Math.cos(ct.a), s = Math.sin(ct.a);
    vkcSlash(e.x - c * L, e.y - s * L, e.x + c * L, e.y + s * L, 3.2, vraOut(k / 0.03), vraEase((k - 0.03) / 0.16), 1);
  }
};
VKC_KILL.strike = x => {
  const e = x.e;
  vraSparks(e.x, e.y, 16, VKZ_PALE, 380, x.ang, 0.7, 0.3, 1.3);
  vraEmbers(e.x, e.y, 10, VKZ_CRIM, 100, 0.8, 1.2);
  vkcBlood(e.x, e.y, 8, 200, x.ang, 1.4);
  for (let i = 0; i < 3; i++) vkcSoul(e.x, e.y, x.ang + rnd(0.8, -0.8), rnd(260, 160), { w: Math.max(8, e.r * 0.7), life: 0.6, drag: 0.15 });
  VKZ.flashes.push({ at: uiTime, big: false });
  shake(0.3);
};

/* ---- nobody in reach: it goes back as a wave of the dead (vkcWaves draws the wave) */
VKC_DRAW.wave = (x, q) => {
  vkcCrescent(P.x, P.y, x.ang, 2.6, P.r + 24, vraOut(q / 0.07), 1 - vraEase(q / x.T), VKC.side);
};
// a vow wave in flight: a crescent of crimson, the dead streaming off its back
function vkcWaves() {
  if (typeof bladeWaves === 'undefined') return;
  const range = typeof COUNTER_RANGE !== 'undefined' ? COUNTER_RANGE : 600;
  for (const w of bladeWaves) {
    if (!VKC.waves.has(w)) continue;
    const a = Math.atan2(w.vy, w.vx), c = Math.cos(a), s = Math.sin(a), f = clamp(1 - w.dist / range, 0, 1), L = Math.min(190, w.dist);
    for (let i = 0; i < 4; i++) {
      const u = (i + 0.5) / 4, off = (i % 2 ? 1 : -1) * (6 + 12 * u), b = 14 + L * u * 0.8;
      vkzFace(w.x - c * b - s * off, w.y - s * b + c * off, a, 30 + 30 * u, 10 - 3 * u, 1, (0.4 + 0.6 * f) * (1 - u * 0.5));
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    vraLens(w.x - c * L, w.y - s * L, w.x - c * 8, w.y - s * 8, 10 * f + 2, VKZ_CRIM, 0.3 * (0.4 + f));
    drawGlow(w.x, w.y, 50, VKZ_CRIM, 0.4 + 0.3 * f);
    ctx.translate(w.x, w.y); ctx.rotate(a);
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath(); ctx.arc(-14, 0, 32, -1.25, 1.25); ctx.arc(-26, 0, 26, 1.1, -1.1, true); ctx.closePath();
    const g = ctx.createLinearGradient(-22, 0, 18, 0);
    g.addColorStop(0, rgba(VKZ_VOID, 0.85)); g.addColorStop(0.55, rgba(VKZ_CRIM, 0.95)); g.addColorStop(1, rgba(VKZ_PALE, 1));
    ctx.fillStyle = g; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(VKZ_HOT, 0.9); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(-14, 0, 32, -1.25, 1.25); ctx.stroke();
    ctx.restore();
  }
}

/* ---- WRATH: his true form rises over it, winds up, and brings its blade down through it in one cut */
VKC_PLAN.WRATH = x => {
  const e = x.e, S = e.r, side = VKC.side, h = clamp(S * 4 + 120, 150, 330);
  const fx = e.x - side * (S * 0.4 + 0.1 * h), fy = e.y + S * 0.3, shx = fx - 0.17 * h, shy = fy - 0.66 * h;
  return { h, fx, fy, shx, shy, ba: Math.atan2(e.y - shy, e.x - shx), up: -Math.PI / 2 - 0.55, len: S * 2.4 + 160, seed: VKC.seed };
};
VKC_DRAW.WRATH = (x, q, p) => {
  const e = x.e, K = x.kill, S = e.r;
  const wind = vkcIn(q, 0.05, 0.6 * K), down = vkcQ(q, 0.86 * K, K);
  const blade = down > 0 ? lerp(p.up, p.ba + 0.28, down * down) : lerp(p.ba - 0.5, p.up, wind) + 0.06 * wind * Math.sin(uiTime * 47);
  if (!x.killed) {
    const j = 2.5 * wind;
    vkcBodyAt(e, 1, rnd(j, -j), rnd(j, -j));
    vkcHoldArms(e, 3, p.seed, 0.04, q, 1, 0);
  }
  vkzSpecter(p.fx, p.fy, p.h, vkcIn(q, 0.04, 0.04 + 0.3 * K), vkcIn(q, K + 0.1, x.T), blade, 1, 1, true);
  if (wind > 0.3 && down <= 0) {                  // the blade gathers itself, high and shaking
    const c = Math.cos(blade), s = Math.sin(blade), bx = p.shx + c * 0.9 * p.h, by = p.shy + s * 0.9 * p.h;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(bx, by, p.h * 0.18 * wind, VKZ_CRIM, 0.7 * wind);
    ctx.restore();
  }
  if (down > 0 && down < 1) {                     // its stroke, brushed in behind the blade
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    vraBrushArc(p.shx, p.shy, 0.75 * p.h, p.up, blade - p.up, p.h * 0.06, VKZ_HOT, 0.8);
    ctx.restore();
  }
  const k2 = q - 0.94 * K;                        // the cut: one line through it, longer than it, burning off
  if (k2 > 0) {
    const a = 1 - vraEase(k2 / 0.4), c = Math.cos(p.ba), s = Math.sin(p.ba), L = p.len;
    vkcSlash(e.x - c * L, e.y - s * L, e.x + c * L, e.y + s * L, (6 + S * 0.12) * (0.4 + 0.6 * a), vraOut(k2 / 0.05), 0, a);
  }
};
VKC_KILL.WRATH = (x, p) => {
  const e = x.e, S = e.r, c = Math.cos(p.ba), s = Math.sin(p.ba);
  VKC.corpses.push(vkcHalves(e, p.ba, { sep: S * 0.9 + 10, rot: 0.32, life: x.boss ? 2.4 : 1.8, sink: x.boss ? 1.2 : 0.6 }));
  VKC.scars.push({ k: 'rift', x: e.x, y: e.y, a: p.ba, L: p.len * 0.55, w: 8 + S * 0.25, at: uiTime, life: VKC_LIFE.rift, seed: p.seed });
  for (let i = 0; i < 12; i++) {
    const u = rnd(1, -1), sd = i % 2 ? 1 : -1;
    vkcSoul(e.x + c * S * u * 1.4, e.y + s * S * u * 1.4, p.ba + sd * Math.PI / 2 + rnd(0.5, -0.5), rnd(260, 140), { w: rnd(14, 9), life: rnd(0.9, 0.6), drag: 0.25 });
  }
  vkcBlood(e.x, e.y, 22, 240);
  vraSparks(e.x, e.y, 26, VKZ_PALE, 520, p.ba, 0.5, 0.3, 1.5);
  vraSparks(e.x, e.y, 18, VKZ_HOT, 380, 0, TAU, 0.35, 1.2);
  VKC.beat = { at: uiTime, x: e.x, y: e.y, a: p.ba, slice: true, crack: false, flash: 0.5, big: x.boss };
  shake(0.6);
};

/* ---- QUAKE: the ground breaks under it and the dead drag it down; his true form stabs the floor,
   the crack runs to it and on to the cross, and the ground slams shut on it */
VKC_PLAN.QUAKE = x => {
  const e = x.e, S = e.r, K = x.kill, n = 7, a0 = rnd(TAU), cuts = [], h = clamp(S * 3 + 100, 120, 260), seed = VKC.seed;
  for (let i = 0; i < n; i++) cuts.push(a0 + (i + rnd(0.3, -0.3)) / n * TAU);
  cuts.sort((a, b) => a - b);
  const fy = x.to.y + 6, down = Math.PI / 2 - 0.25;
  const stab = { x: x.to.x - 0.17 * h + Math.cos(down) * 1.05 * h, y: fy - 0.66 * h + Math.sin(down) * 1.05 * h };
  const at = uiTime, R = S * 1.9 + 46;
  VKC.scars.push({ k: 'plates', x: e.x, y: e.y, R, S, cuts, ex: x, at, life: x.T + VKC_LIFE.plates, seed });
  VKC.scars.push({ k: 'fissure', pts: vkcFault(stab.x, stab.y, e.x, e.y, seed + 3), t0: 0.58 * K, t1: 0.74 * K, w: 3.6, at, life: x.T + VKC_LIFE.fissure });
  const c = roninCleaves.find(q => q.id === x.vow.quake);
  if (c) VKC.scars.push({ k: 'fissure', pts: vkcFault(e.x, e.y, c.x, c.y, seed + 9), t0: 0.74 * K, t1: K, w: 4.2, at, life: x.T + VKC_LIFE.fissure });
  return { cuts, h, stab, down, seed };
};
VKC_DRAW.QUAKE = (x, q, p) => {
  const e = x.e, K = x.kill, S = e.r;
  const pull = vkcIn(q, 0.3 * K, K), j = 2 * pull * Math.sin(uiTime * 57);
  if (!x.killed) {
    vkcBodyAt(e, 1, j, j * 0.5 + pull * S * 0.12, 0, 1 - 0.18 * pull);
    vkcHoldArms(e, 5, p.seed, 0.04, q, 1, pull * S * 0.5);
  }
  // his true form at his back: up, its blade raised, then down into the floor at his feet
  const stab = vkcQ(q, 0.5 * K, 0.58 * K), up = -Math.PI / 2 - 0.35;
  const blade = stab > 0 ? lerp(up, p.down, stab * stab) : lerp(-0.2, up, vkcIn(q, 0.06, 0.45 * K)) + 0.05 * Math.sin(uiTime * 41);
  vkzSpecter(x.to.x, x.to.y + 6, p.h, vkcIn(q, 0.06, 0.06 + 0.25 * K), vkcIn(q, K + 0.15, x.T), blade, 1, 1, true);
  if (stab >= 1 && vkcOnce('stab')) {
    VKC.marks.push({ k: 'ring', x: p.stab.x, y: p.stab.y, r0: 10, r: 120 + S, w: 5, at: uiTime, life: 0.45 });
    vraSparks(p.stab.x, p.stab.y, 20, VKZ_PALE, 380, -Math.PI / 2, 2.2, 0.3, 1.3);
    vkcDebris('shard', p.stab.x, p.stab.y, 6, 160, 6);
    shake(0.35);
  }
};
VKC_KILL.QUAKE = (x, p) => {
  const e = x.e, S = e.r;
  VKC.corpses.push(vkcWedges(e, p.cuts.slice(), mid => mid, { d: () => -S * 0.12, rot: 0.25, life: 1.2, sink: 0, dur: 0.12, drift: 4 }));
  VKC.marks.push({ k: 'column', x: e.x, y: e.y, w: S * 0.9 + 16, h: S * 3 + 180, at: uiTime, life: 0.7 });
  for (let i = 0; i < 12; i++) {
    const an = i / 12 * TAU;
    vkcSoul(e.x + Math.cos(an) * S * 0.6, e.y + Math.sin(an) * S * 0.6, -Math.PI / 2 + Math.cos(an) * 0.9, rnd(240, 140),
            { w: rnd(13, 9), life: rnd(0.9, 0.6), drag: 0.3, rise: 120, curl: 2 });
  }
  vkcDebris('shard', e.x, e.y, 18, 260, clamp(S * 0.45, 6, 16));
  vkcBlood(e.x, e.y, 10, 160);
  VKC.beat = { at: uiTime, x: e.x, y: e.y, a: x.ang, slice: false, crack: true, flash: 0.45, big: x.boss };
  shake(0.65);
};

/* ---- EYE OF THE STORM: the storm tightens round him and his eye opens on it; the dead dive through it
   from the storm's wall, and it is torn apart and flung round the storm */
VKC_PLAN['EYE OF THE STORM'] = x => {
  const e = x.e, S = e.r, K = x.kill, n = x.boss ? 22 : 14, R = x.vow.eye || 320, dives = [];
  for (let i = 0; i < n; i++)
    dives.push({ at: lerp(0.5 * K, K - 0.02, Math.pow(i / (n - 1), 0.7)), th: rnd(TAU), r: rnd(R * 0.95, R * 0.55), w: rnd(14, 9), bend: rnd(1, -1) });
  return { dives, R, w: clamp(S * 1.2 + 80, 90, 200), seed: VKC.seed };
};
VKC_DRAW['EYE OF THE STORM'] = (x, q, p) => {
  const e = x.e, K = x.kill, S = e.r, X = P.x, Y = P.y;
  const tight = vkcIn(q, 0.05, K), after = vkcQ(q, K, x.T);
  vkcStorm(X, Y, p.R * (1 + 0.3 * vraOut(after)), 1 - after, tight * (1 - after), uiTime * 1.6 + 4 * q * q / K);
  if (!x.killed) {                                // it, dragged round, jolted by every one of the dead through it
    let jx = 0, jy = 0;
    for (const d of p.dives) { const k = q - d.at; if (k > 0 && k < 0.12) { const f = 1 - k / 0.12; jx -= Math.cos(d.th) * 6 * f; jy -= Math.sin(d.th) * 6 * f; } }
    vkcBodyAt(e, 1, jx, jy, 0.6 * tight * tight, 1);
    vkcHoldArms(e, 3, p.seed, 0.04, q, 1 - tight * 0.5, 0);
  }
  for (const d of p.dives) {                      // the dead diving in at it from the storm's wall, each on its curve
    const u = (q - (d.at - 0.22)) / 0.22;
    if (u < 0 || u > 1) continue;
    const v = vraEase(u), sx = X + Math.cos(d.th) * d.r, sy = Y + Math.sin(d.th) * d.r;
    const bx = (sx + e.x) / 2 - (e.y - sy) * 0.3 * d.bend, by = (sy + e.y) / 2 + (e.x - sx) * 0.3 * d.bend;
    const px = (1 - v) * (1 - v) * sx + 2 * (1 - v) * v * bx + v * v * e.x, py = (1 - v) * (1 - v) * sy + 2 * (1 - v) * v * by + v * v * e.y;
    const ang = Math.atan2(2 * (1 - v) * (by - sy) + 2 * v * (e.y - by), 2 * (1 - v) * (bx - sx) + 2 * v * (e.x - bx));
    vkzFace(px, py, ang, d.w * (1.5 + 2 * v), d.w, 1, vkcIn(u, 0, 0.2));
    if (u > 0.96 && vkcOnce('d' + d.at)) { vraSparks(e.x, e.y, 6, VKZ_PALE, 260, ang, 0.8, 0.2, 1); vkcBlood(e.x, e.y, 3, 140, ang, 1); }
  }
  // his eye over it all, opening on it; shut on the beat, and gone
  const open = q < K ? lerp(0.35, 1, vkcIn(q, 0.03, 0.4 * K)) : lerp(0.05, 0.6, vkcIn(q, K + 0.06, K + 0.2));
  vkcEye(X, Y - 70 - S * 0.4, p.w, open, x.killed ? null : e, 1 - vkcQ(q, x.T - 0.25, x.T));
};
VKC_KILL['EYE OF THE STORM'] = x => {
  const e = x.e, S = e.r, dirs = [];
  for (let i = 0; i < 8; i++) dirs.push(i / 8 * TAU + rnd(0.25, -0.25));
  dirs.sort((a, b) => a - b);
  VKC.corpses.push(vkcWedges(e, dirs, mid => mid + 0.9, { d: () => S + 40 + rnd(30), rot: 1.6, spin: 3, dur: 0.3, drift: 40, life: x.boss ? 2 : 1.5 }));
  for (let i = 0; i < 14; i++) vkcSoul(e.x, e.y, rnd(TAU), rnd(320, 160), { w: rnd(13, 9), life: rnd(0.8, 0.5), drag: 0.2, curl: 2.4 });
  vkcBlood(e.x, e.y, 18, 260);
  VKC.beat = { at: uiTime, x: e.x, y: e.y, a: x.ang, slice: false, crack: true, flash: 0.45, big: x.boss };
  shake(0.55);
};

/* ---- NO MERCY: cut after cut from every side, then his true form, over it, drives its blade down
   through it into the floor; it bursts, and 無 is burned where it stood */
VKC_PLAN['NO MERCY'] = x => {
  const e = x.e, K = x.kill, n = x.boss ? 12 : 8, cuts = [];
  for (let i = 0; i < n; i++) {
    const phi = rnd(TAU);                          // he is at its side at phi for each, and cuts across it
    cuts.push({ phi, a: phi + Math.PI / 2 + rnd(0.6, -0.6), at: 0.08 + (0.66 * K - 0.08) * Math.pow(i / (n - 1), 0.75) });
  }
  return { cuts, h: clamp(e.r * 3.6 + 110, 150, 320), seed: VKC.seed };
};
VKC_DRAW['NO MERCY'] = (x, q, p) => {
  const e = x.e, K = x.kill, S = e.r;
  if (!x.killed) {
    let jx = 0, jy = 0;
    for (const ct of p.cuts) { const k = q - ct.at; if (k > 0 && k < 0.1) { const f = 1 - k / 0.1; jx -= Math.cos(ct.phi) * 7 * f; jy -= Math.sin(ct.phi) * 7 * f; } }
    vkcBodyAt(e, 1, jx, jy, 0, 1);
    ctx.save();                                   // every cut so far, still burning on it
    ctx.beginPath(); ctx.arc(e.x + jx, e.y + jy, S * 1.05, 0, TAU); ctx.clip();
    for (const ct of p.cuts) {
      const k = q - ct.at;
      if (k < 0.02) continue;
      const ch = rkcChord(e.x + jx, e.y + jy, S * 1.2, e.x + jx, e.y + jy, ct.a);
      if (ch) vkcSeam(ch.x0, ch.y0, ch.x1, ch.y1, Math.max(1.4, S * 0.1), Math.exp(-k * 5), 1);
    }
    ctx.restore();
    vkcHoldArms(e, 5, p.seed, 0.03, q, 1, 0);
  }
  const R = S + 40;                               // cut after cut: him at its side, and through it
  p.cuts.forEach((ct, i) => {
    const k = q - ct.at;
    if (k < -0.03 || k > 0.25) return;
    const c = Math.cos(ct.phi), s = Math.sin(ct.phi);
    vkxGhost({ x: e.x + c * R, y: e.y + s * R, a: ct.phi + Math.PI }, 0.95 * (1 - vkcQ(k, 0.02, 0.2)));
    if (k < 0) return;
    const ca = Math.cos(ct.a), sa = Math.sin(ct.a), L = S * 1.5 + 24;
    vkcSlash(e.x - ca * L, e.y - sa * L, e.x + ca * L, e.y + sa * L, 3.4 + S * 0.05, vraOut(k / 0.035), vraEase((k - 0.035) / 0.16), 1);
    if (vkcOnce('n' + i)) {
      vkcBlood(e.x, e.y, 5, 200, ct.a + (i % 2 ? 1 : -1) * Math.PI / 2, 1.2);
      vraSparks(e.x, e.y, 6, VKZ_PALE, 300, ct.a, 0.5, 0.2, 1.1);
      shake(0.12);
    }
  });
  // then his true form, over it, its blade straight down; down through it into the floor
  const show = vkcIn(q, 0.66 * K, 0.8 * K), thrust = vkcQ(q, 0.9 * K, K);
  if (show > 0) {
    const lift = (1 - thrust * thrust) * 0.3 * p.h;
    vkzSpecter(e.x + 0.17 * p.h, e.y - 0.4 * p.h - lift, p.h, show, vkcIn(q, K + 0.12, x.T), Math.PI / 2 + 0.03 * Math.sin(uiTime * 50), 1, 1, true);
  }
};
VKC_KILL['NO MERCY'] = (x, p) => {
  const e = x.e, S = e.r, dirs = [];
  for (const ct of p.cuts) { const a = ((ct.a % Math.PI) + Math.PI) % Math.PI; dirs.push(a, a + Math.PI); }
  dirs.sort((a, b) => a - b);
  VKC.corpses.push(vkcWedges(e, dirs, mid => mid, { d: () => S * 1.1 + rnd(40, 10), rot: 1.4, spin: 2, dur: 0.2, drift: 44, life: x.boss ? 2.2 : 1.7, sink: 0.7 }));
  VKC.scars.push({ k: 'brand', x: e.x, y: e.y, r: clamp(S * 1.6 + 26, 34, 120), rot: rnd(0.3, -0.3), at: uiTime, life: VKC_LIFE.brand, seed: p.seed });
  vkcDebris('bone', e.x, e.y, 10, 260, clamp(S * 0.3, 4, 12));
  vkcBlood(e.x, e.y, 26, 300);
  for (let i = 0; i < 10; i++) vkcSoul(e.x, e.y, rnd(TAU), rnd(300, 160), { w: rnd(13, 9), life: rnd(0.8, 0.5), drag: 0.2 });
  VKC.beat = { at: uiTime, x: e.x, y: e.y, a: p.cuts[p.cuts.length - 1].a, slice: true, crack: true, flash: 0.55, big: x.boss };
  shake(0.7);
};

/* --------------------------------- the marks --------------------------------- */
// QUAKE's crush: the ground throws up a column of crimson where it went under
function vkcColumn(m, age, q) {
  const a = 1 - vraEase(q), Hc = m.h * vraOut(age / 0.12), w = m.w * (1 - 0.5 * q);
  drawGlow(m.x, m.y, m.w * 2.2, VKZ_CRIM, 0.7 * a);
  vraLens(m.x, m.y + 6, m.x, m.y - Hc, w, VKZ_CRIM, 0.55 * a);
  vraLens(m.x, m.y + 4, m.x, m.y - Hc * 0.9, w * 0.45, VKZ_HOT, 0.8 * a);
  vraLens(m.x, m.y + 2, m.x, m.y - Hc * 0.75, w * 0.14, VKZ_PALE, a);
}
// EYE OF THE STORM's blast: the storm breaking outward, its arms flung out to its reach, a ring at the edge
function vkcGale(m, age, q) {
  const a = 1 - vraEase(q), R = m.r * vraOut(age / 0.3);
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20, r = lerp(R * 0.2, R, u), th = m.a + arm / 3 * TAU - 2.4 * u * m.sd + age * 3 * m.sd;
      ctx[i ? 'lineTo' : 'moveTo'](m.x + Math.cos(th) * r, m.y + Math.sin(th) * r);
    }
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.6 * a); ctx.lineWidth = 10 * a + 2; ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * a); ctx.lineWidth = 3 * a + 0.8; ctx.stroke();
  }
  ctx.strokeStyle = rgba(VKZ_PALE, 0.8 * a); ctx.lineWidth = 3 * a + 0.6;
  ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, TAU); ctx.stroke();
  drawGlow(m.x, m.y, R * 0.7, VKZ_CRIM, 0.4 * a);
}
// QUAKE's cross going off: the ground along its strokes thrown up, pillar after pillar from its heart out
function vkcErupt(m, age, q) {
  const a = 1 - vraEase(q);
  drawGlow(m.x, m.y, m.r * 1.2, VKZ_CRIM, 0.6 * a);
  m.strokes.forEach((s, si) => {
    const n = Math.max(3, Math.round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / 34));
    for (let i = 0; i <= n; i++) {
      const u = i / n, k = age - Math.abs(u - 0.5) * 2 * 0.18;
      if (k < 0) continue;
      const kk = vraOut(k / 0.1) * (1 - vraEase(k / 0.55)), x = lerp(s.x1, s.x2, u), y = lerp(s.y1, s.y2, u), h = (40 + 30 * vraH(m.seed + i + si * 13)) * kk;
      vraLens(x, y + 3, x, y - h, 6 * kk + 1, VKZ_CRIM, 0.6 * kk);
      vraLens(x, y + 2, x, y - h * 0.8, 2 * kk + 0.5, VKZ_PALE, 0.8 * kk);
    }
  });
}
function vkcMarks() {
  const t = uiTime;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const m of VKC.marks) {
    const age = t - m.at, q = age / m.life;
    if (q < 0 || q >= 1) continue;
    if (m.k === 'ring') {
      const a = 1 - vraEase(q), R = m.r0 + (m.r - m.r0) * vraOut(q);
      ctx.strokeStyle = rgba(VKZ_HOT, 0.85 * a); ctx.lineWidth = m.w * a + 0.8;
      ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, TAU); ctx.stroke();
      drawGlow(m.x, m.y, R * 0.6, VKZ_CRIM, 0.35 * a);
    } else if (m.k === 'column') vkcColumn(m, age, q);
    else if (m.k === 'gale') vkcGale(m, age, q);
    else if (m.k === 'erupt') vkcErupt(m, age, q);
  }
  ctx.restore();
}

/* ----------------------- the counter: over everything in the room ----------------------- */
// the room to blood and black, all but the two of them: its colour out, crimson into it, dark at its edges
function vkcGrade(x) {
  let D = 0;
  if (x && x.exec) D = vkcIn(x.t, 0, 0.12) * (1 - 0.2 * vkcIn(x.t, x.T - 0.25, x.T));
  else if (VKC.last && VKC.last.exec) D = 0.8 * (1 - vraEase((uiTime - VKC.endAt) / 0.45));
  if (D <= 0.01) return;
  const x0 = (typeof _vx0 !== 'undefined' ? _vx0 : P.x - 2000) - 80, y0 = (typeof _vy0 !== 'undefined' ? _vy0 : P.y - 2000) - 80;
  const w = (typeof _vx1 !== 'undefined' ? _vx1 : P.x + 2000) + 80 - x0, h = (typeof _vy1 !== 'undefined' ? _vy1 : P.y + 2000) + 80 - y0;
  const cx = VKC.fx, cy = VKC.fy, r0 = VKC.fr;
  ctx.save();
  ctx.globalCompositeOperation = 'saturation';
  let g = ctx.createRadialGradient(cx, cy, r0 * 0.7, cx, cy, r0 * 1.6);
  g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(1, rgba('#808080', 0.92 * D));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  g = ctx.createRadialGradient(cx, cy, r0 * 0.8, cx, cy, r0 * 2.2);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, rgba('#c0132f', 0.85 * D));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  g = ctx.createRadialGradient(cx, cy, r0, cx, cy, Math.max(w, h) * 0.6);
  g.addColorStop(0, 'rgba(10,2,5,0)'); g.addColorStop(0.5, rgba(VKZ_VOID, 0.35 * D)); g.addColorStop(1, rgba(VKZ_VOID, 0.8 * D));
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.restore();
}
// from drawRoninExecWorld: the vow's counter, and what its counters leave; true while one plays
function vkcWorld() {
  vkcStep();
  const x = P.roninExec, vx = x && x.vow ? x : null;
  if (vx && VKC.x !== vx) vkcBegin(vx);
  ctx.save();
  vkcGrade(vx);
  vkcWaves();
  vkcDrawCorpses();
  if (vx) {
    vkcCatchArt(vx);
    const f = VKC_DRAW[vkcKind(vx)];
    if (f) { try { f(vx, vx.t, VKC.plan); } catch (err) { if (!VKC.err) { VKC.err = 1; console.error('LAST VOW C art', vkcKind(vx), err); } } }
  }
  vkcMarks();
  vkcBits();
  vkcSouls();
  ctx.restore();
  return !!vx;
}

/* ------------------------------- the screen ------------------------------- */
// the stance at the frame's edge: it pounds red with his pulse, and cracks in from the corners as it holds
function vkcEdge(s, k) {
  const t = uiTime, pound = vkcPound(t), R = Math.max(W, H), left = s ? vkcLeft(s) : 1;
  const strobe = left < 0.25 ? (Math.sin(t * 38) > 0 ? 1.25 : 0.7) : 1;
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, R * 0.75);
  g.addColorStop(0, 'rgba(76,5,25,0)'); g.addColorStop(1, rgba(VKZ_DEEP, clamp((0.4 + 0.35 * pound) * k * strobe, 0, 1)));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const grow = s ? vkcIn(s.t, 0.1, 1.4) : 1, m = Math.min(W, H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [[0, 0, Math.PI / 4], [W, 0, Math.PI * 3 / 4], [W, H, -Math.PI * 3 / 4], [0, H, -Math.PI / 4]].forEach(([cx, cy, an], i) => {
    for (let j = 0; j < 2; j++) {
      vkcPath(vkcCrack(cx, cy, an + (j ? 0.35 : -0.35), m * 0.16 * (0.7 + 0.3 * j), VKC.ground * 3 + i * 17 + j * 7, 6), grow);
      ctx.strokeStyle = rgba(VKZ_CRIM, (0.25 + 0.35 * pound) * k); ctx.lineWidth = 1.4; ctx.stroke();
    }
  });
  ctx.globalCompositeOperation = 'source-over';
}
// the bars, torn at their inner edges; the move's name stamped into the lower one on its seal,
// and over it LAST VOW, or the boss it is
function vkcBars() {
  const t = uiTime, x = P.roninExec, ex = x && x.vow && x.exec ? x : VKC.last && VKC.last.vow && VKC.last.exec ? VKC.last : null;
  if (!ex) return false;
  const live = ex === x, k = live ? vraOut(x.t / 0.14) : 1 - vraEase((t - VKC.endAt) / 0.35);
  if (k <= 0.005) return false;
  const bh = H * (ex.boss ? 0.12 : 0.09), fr = Math.floor(t * 24);
  ctx.save();
  for (const top of [true, false]) {
    const edge = [];
    for (let i = 0; i <= 28; i++) {
      const tooth = (vraH(VKC.seed + i * 1.7 + (top ? 0 : 50)) - 0.5) * 12 + (vraH(fr + i * 3.1) - 0.5) * 3;
      edge.push([W * i / 28, top ? (bh + tooth) * k : H - (bh + tooth) * k]);
    }
    ctx.beginPath();
    ctx.moveTo(0, top ? 0 : H);
    for (const [ex_, ey] of edge) ctx.lineTo(ex_, ey);
    ctx.lineTo(W, top ? 0 : H); ctx.closePath();
    ctx.fillStyle = VKZ_VOID; ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); edge.forEach(([ex_, ey], i) => i ? ctx.lineTo(ex_, ey) : ctx.moveTo(ex_, ey));
    ctx.strokeStyle = rgba(VKZ_CRIM, (0.55 + 0.3 * Math.sin(t * 23)) * k); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  const nm = ex.vow.n, kj = VKZ_KANJI[nm] || '', q = live ? x.t : ex.T + (t - VKC.endAt), out = live ? 1 : 1 - vraEase((t - VKC.endAt) / 0.25);
  const stamp = vkcQ(q, 0.06, 0.18), fs = Math.round(clamp(bh * 0.36, 14, 34));
  if (stamp > 0 && out > 0) {
    const sc = 1 + 0.5 * (1 - vraOut(stamp)), tr = (1 - 0.6 * stamp) * 1.5;
    ctx.translate(W / 2 + rnd(tr, -tr), H - bh * k / 2 + fs * 0.1 + rnd(tr, -tr)); ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, stamp * 3) * out;
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + fs + 'px ' + VRA_DISP; ctx.letterSpacing = '0.3em';
    const tw = ctx.measureText(nm).width;
    ctx.letterSpacing = '0em'; ctx.font = '900 ' + Math.round(fs * 0.8) + 'px ' + VKZ_JP;
    const kw = kj ? ctx.measureText(kj).width + fs * 0.7 : 0, x0 = -(tw + kw + fs * 0.45) / 2;
    if (kj) {                                     // the seal
      ctx.fillStyle = VKZ_CRIM; ctx.fillRect(x0, -fs * 0.62, kw - fs * 0.15, fs * 1.24);
      ctx.fillStyle = VKZ_BONE; ctx.textAlign = 'center';
      ctx.fillText(kj, x0 + (kw - fs * 0.15) / 2, fs * 0.04);
    }
    ctx.font = '700 ' + fs + 'px ' + VRA_DISP; ctx.letterSpacing = '0.3em'; ctx.textAlign = 'left';
    ctx.shadowColor = VKZ_CRIM; ctx.shadowBlur = 18;
    ctx.fillStyle = VKZ_BONE; ctx.fillText(nm, x0 + kw + fs * 0.3, fs * 0.04);
    ctx.shadowBlur = 0;
    const sub = ex.boss ? (typeof BOSSES !== 'undefined' && BOSSES[ex.kind] ? BOSSES[ex.kind].name : String(ex.kind).toUpperCase()) : 'LAST VOW';
    ctx.font = '700 9px ' + VRA_FONT; ctx.letterSpacing = '0.42em'; ctx.textAlign = 'center';
    ctx.fillStyle = rgba(VKZ_HOT, 0.9 * vkcQ(q, 0.2, 0.4));
    ctx.fillText(sub, 0, -fs * 1.05);
    ctx.letterSpacing = '0em';
  }
  ctx.restore();
  if (stamp > 0 && stamp < 1) {                   // the stamp's flash
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(VKZ_CRIM, 0.25 * (1 - stamp)); ctx.fillRect(0, H - bh * k, W, bh * k);
    ctx.restore();
  }
  return true;
}
// the frame torn along the cut: its halves pushed apart, the tear between them crimson
function vkcSlice(b, q) {
  const src = ctx.canvas;
  if (!src || typeof document === 'undefined') return;
  const w = src.width, h = src.height, dpr = typeof DPR === 'number' ? DPR : 1;
  if (!VKC.buf) VKC.buf = document.createElement('canvas');
  const B = VKC.buf;
  if (B.width !== w || B.height !== h) { B.width = w; B.height = h; }
  const g = B.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
  const p = vraToScreen(b.x, b.y), px = p.x * dpr, py = p.y * dpr, c = Math.cos(b.a), s = Math.sin(b.a);
  const off = (b.big ? 26 : 16) * dpr * Math.pow(1 - q, 2), R = Math.hypot(w, h);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = VKZ_VOID; ctx.fillRect(0, 0, w, h);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px - c * R, py - s * R); ctx.lineTo(px + c * R, py + s * R);
    ctx.lineTo(px + c * R - s * R * sd, py + s * R + c * R * sd); ctx.lineTo(px - c * R - s * R * sd, py - s * R + c * R * sd);
    ctx.closePath(); ctx.clip();
    ctx.drawImage(B, (-s * off + c * off * 0.6) * sd, (c * off + s * off * 0.6) * sd);
    ctx.restore();
  }
  ctx.globalCompositeOperation = 'lighter';
  vraLens(px - c * R, py - s * R, px + c * R, py + s * R, (3 + 8 * (1 - q)) * dpr, VKZ_CRIM, 0.7 * (1 - q));
  vraLens(px - c * R, py - s * R, px + c * R, py + s * R, (1 + 2 * (1 - q)) * dpr, VKZ_PALE, 1 - q);
  ctx.restore();
}
// the frame cracking out from the beat, crimson
function vkcScreenCracks(b, age) {
  const a = 1 - vraEase(age / 0.8);
  if (a <= 0) return;
  const p = vraToScreen(b.x, b.y), R = Math.max(W, H) * 0.7 * vraOut(age / 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 12; i++) {
    vkcPath(vkcCrack(p.x, p.y, i / 12 * TAU + vraH(VKC.seed + i * 4.1) * 0.5, R * (0.45 + 0.55 * vraH(VKC.seed + i * 2.7)), VKC.seed + i * 9, 7), 1);
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.6 * a); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_PALE, 0.7 * a); ctx.lineWidth = 0.9; ctx.stroke();
  }
  ctx.restore();
}
// the beat: the frame torn or cracked, a white blink, a breath of crimson
function vkcBeatDraw() {
  const b = VKC.beat;
  if (!b) return false;
  const age = uiTime - b.at;
  if (age > 0.9 || age < 0) { VKC.beat = null; return false; }
  if (b.slice && age < 0.32) vkcSlice(b, age / 0.32);
  if (b.crack) vkcScreenCracks(b, age);
  if (age < 0.05) { ctx.fillStyle = rgba('#ffffff', b.flash * (1 - age / 0.05)); ctx.fillRect(0, 0, W, H); }
  const rq = age / 0.5;
  if (rq < 1) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(VKZ_CRIM, 0.35 * (1 - rq) * (1 - rq)); ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  return true;
}
// from drawRoninExecScreen: the vow's stance at the frame's edge, its executions' bars and beats;
// true while the vow's C has the screen
function vkcScreen() {
  const st = P.roninStill, x = P.roninExec, stance = st && st.vow ? st : null;
  VKC.edge += ((stance ? 1 : 0) - VKC.edge) * (1 - Math.pow(0.0001, VKC.dt || 0.016));
  ctx.save();
  if (VKC.edge > 0.01) vkcEdge(stance, VKC.edge);
  const bars = vkcBars(), beat = vkcBeatDraw();
  ctx.restore();
  return !!(stance || (x && x.vow) || bars || beat || VKC.edge > 0.01);
}

/* ------------------------------- the moments ------------------------------- */
// C pressed in the vow, or the stance taken up again after a counter: the floor gives under him
function vkcStillFx(s) {
  const again = s.vow.caught > 0;
  VKC.ground = Math.floor(rnd(997)) + 1;
  VKC.marks.push({ k: 'ring', x: s.x, y: s.y, r0: 8, r: again ? 70 : 110, w: 4, at: uiTime, life: 0.4 });
  vraSparks(s.x, s.y, again ? 10 : 18, VKZ_HOT, 300, 0, TAU, 0.3, 1.2);
  vraEmbers(s.x, s.y, again ? 8 : 14, VKZ_CRIM, 90, 0.9, 1.3);
  vraInk(s.x, s.y, 5, 90, 7, 0.55);
  for (let i = 0; i < (again ? 3 : 6); i++) {
    const an = rnd(TAU);
    vkzSoul(s.x + Math.cos(an) * 14, s.y + Math.sin(an) * 14, an, rnd(170, 90), { w: rnd(12, 8), life: rnd(0.8, 0.5), drag: 0.25 });
  }
  VKZ.flashes.push({ at: uiTime, big: false });
  shake(again ? 0.16 : 0.3);
}
// nothing came, and it is let go: the rage vents, and his true form comes apart into the dead
function vkcStillEndFx(s) {
  VKC.scars.push({ k: 'ground', x: s.x, y: s.y, seed: VKC.ground, at: uiTime, life: VKC_LIFE.ground, burst: false });
  for (let i = 0; i < 8; i++) {
    const an = i / 8 * TAU + rnd(0.3, -0.3);
    vkzSoul(s.x + Math.cos(an) * 20, s.y + Math.sin(an) * 20, an, rnd(150, 90), { w: rnd(11, 7), life: rnd(0.8, 0.5), drag: 0.3 });
  }
  if (!s.vow.eye) for (let i = 0; i < 4; i++)
    vkzSoul(s.x + rnd(14, -14), s.y - rnd(80, 30), -Math.PI / 2 + rnd(0.8, -0.8), rnd(90, 50), { w: rnd(12, 8), life: rnd(1, 0.7), drag: 0.3, rise: 20 });
  vraEmbers(s.x, s.y, 10, VKZ_CRIM, 70, 1, 1.2);
  vraInk(s.x, s.y, 6, 70, 7, 0.6);
}
// a blow caught: the hull is already through to whoever threw it (or the counter has gone back as a wave)
function vkcCatchFx(x) {
  const t = uiTime, v = x.vow, fx = x.from.x, fy = x.from.y;
  vkcBegin(x);
  VKC.scars.push({ k: 'ground', x: fx, y: fy, seed: VKC.ground, at: t, life: VKC_LIFE.ground, burst: true });
  const ba = Math.atan2(x.blow.y - fy, x.blow.x - fx) || x.ang;
  VKC.ba = ba; VKC.gx = fx + Math.cos(ba) * (P.r + 10); VKC.gy = fy + Math.sin(ba) * (P.r + 10);
  vraSparks(VKC.gx, VKC.gy, 12, VKZ_PALE, 320, ba, 1.4, 0.22, 1.2);
  VKC.marks.push({ k: 'ring', x: fx, y: fy, r0: 10, r: 90, w: 5, at: t, life: 0.35 });
  if (!x.e) {
    const w = typeof bladeWaves !== 'undefined' ? bladeWaves[bladeWaves.length - 1] : null;
    if (w && w.still) VKC.waves.add(w);
    vkzSoul(fx, fy, x.ang, 420, { w: 14, life: 0.45, drag: 0.1 });
    shake(0.25);
    return;
  }
  for (let i = 0; i < 4; i++) vkzSoul(fx, fy, x.ang + rnd(0.6, -0.6), rnd(200, 120), { w: rnd(12, 8), life: rnd(0.6, 0.4), drag: 0.2 });
  for (let i = 0; i < 6; i++) {                   // the dead dragged down the way he tore through
    const u = rnd();
    vkzSoul(lerp(fx, x.to.x, u), lerp(fy, x.to.y, u), x.ang + Math.PI + rnd(0.6, -0.6), rnd(200, 120), { w: rnd(11, 8), life: rnd(0.7, 0.45), drag: 0.2 });
  }
  vraSparks(x.to.x, x.to.y, 14, VKZ_HOT, 300, x.ang, 1, 0.3, 1.2);
  if (x.exec) {
    x.e.roninHide = true;                         // the body is this art's from here
    // its name goes into the bars, not over where he stood
    for (let i = VKZ.names.length - 1; i >= 0; i--) if (VKZ.names[i].n === v.n && t - VKZ.names[i].at < 0.05) { VKZ.names.splice(i, 1); break; }
    VKZ.flashes.push({ at: t, big: true, x: x.e.x, y: x.e.y, a: x.ang });
    shake(0.4);
  } else shake(0.22);
}
// the beat it lands on: the cut, and for an execution the death
function vkcKillFx(x) {
  if (VKC.x !== x) vkcBegin(x);
  const k = vkcKind(x), f = VKC_KILL[k];
  if (f && x.e) { try { f(x, VKC.plan); } catch (err) { console.error('LAST VOW C art', k, err); } }
  // as STILL WATER's art does: the room's own burst and ring for a body drawn here in pieces go
  if (x.exec && x.e && typeof parts !== 'undefined') {
    const e = x.e;
    for (let i = parts.length - 1, n = 0; i >= 0 && n < 400; i--) {
      const q = parts[i];
      if (q.life !== q.max || Math.abs(q.x - e.x) > 1 || Math.abs(q.y - e.y) > 1) continue;
      n++;
      if (rnd() < 0.8) { parts.splice(i, 1); if (typeof partPool !== 'undefined') partPool.push(q); }
    }
  }
  if (x.exec && x.e && typeof corpses !== 'undefined')
    for (let i = corpses.length - 1; i >= 0; i--) {
      const c = corpses[i];
      if (Math.abs(c.x - x.e.x) < 1 && Math.abs(c.y - x.e.y) < 1) { corpses.splice(i, 1); break; }
    }
}
function vkcEndFx(x) {
  VKC.last = x; VKC.endAt = uiTime; VKC.x = null;
  if (x.exec) vraEmbers(P.x, P.y, 8, VKZ_CRIM, 70, 0.8, 1.2);
}
// C's two blasts, from roninVowBlastFx: EYE OF THE STORM's storm breaking outward, QUAKE's cross going off
function vkcBlastFx(x, y, r, tag) {
  const t = uiTime;
  if (tag === 'EYE OF THE STORM') {
    const a = rnd(TAU);
    VKC.marks.push({ k: 'gale', x, y, r, a, sd: 1, at: t, life: 0.55 });
    VKC.scars.push({ k: 'spiral', x, y, r: r * 0.75, a, sd: 1, at: t, life: VKC_LIFE.spiral });
    for (let i = 0; i < 18; i++) {
      const an = i / 18 * TAU + rnd(0.2, -0.2);
      vkcSoul(x + Math.cos(an) * 30, y + Math.sin(an) * 30, an + 0.9, r * rnd(2.4, 1.7), { w: rnd(13, 9), life: rnd(0.6, 0.45), drag: 0.2, curl: 1.6 });
    }
    vraSparks(x, y, 30, VKZ_PALE, 560, 0, TAU, 0.4, 1.5);
    vraEmbers(x, y, 20, VKZ_CRIM, 160, 1, 1.4);
    VKZ.flashes.push({ at: t, big: true, blast: true, x, y, a: 0 });
    shake(0.55);
    return true;
  }
  if (tag === 'QUAKE') {
    const c = roninCleaves.find(q => Math.abs(q.x - x) < 1 && Math.abs(q.y - y) < 1);
    const strokes = c ? c.strokes.filter(s => !s.fault).map(s => ({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })) : [];
    VKC.marks.push({ k: 'erupt', x, y, r, strokes, seed: rnd(100), at: t, life: 0.8 });
    VKC.marks.push({ k: 'ring', x, y, r0: 10, r: r * 1.4, w: 6, at: t, life: 0.45 });
    for (const s of strokes) for (let i = 0; i < 3; i++) {
      const u = rnd(0.9, 0.1), px = lerp(s.x1, s.x2, u), py = lerp(s.y1, s.y2, u);
      vkcDebris('shard', px, py, 2, 140, 7);
      vkcSoul(px, py, -Math.PI / 2 + rnd(0.7, -0.7), rnd(200, 120), { w: rnd(12, 8), life: rnd(0.8, 0.5), drag: 0.3, rise: 60 });
    }
    vraSparks(x, y, 24, VKZ_PALE, 480, 0, TAU, 0.4, 1.4);
    VKZ.flashes.push({ at: t, big: true, blast: true, x, y, a: 0 });
    shake(0.5);
    return true;
  }
  return false;
}
/* ======================= end of V: LAST VOW — the vow's C ======================= */
