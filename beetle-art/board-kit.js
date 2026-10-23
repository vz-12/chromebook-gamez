/* ===========================================================================
   THE BLUE BEETLE — the board's OVERDRIVE moves (beetle-art/README.md)
   Z and X run the stock logic in miniature: SCORCHED EARTH's envelope, reach
   and stamps; PYROTECHNICS' circle and column. BRAND is laid out as one
   timeline from the stock durations and read at any moment, so it can be
   scrubbed: the wing turn, the climb, the cut up, the aim, the X traced
   stroke by stroke, COMBO 1's ring, wall and column if it is on, the cut
   back down and the landing. The arena is the game's, 2400 by 1700, and the
   X is the game's own (odStrikeX), so the view from above is the real one.
=========================================================================== */
const arena = { x0: 0, y0: 0, x1: 2400, y1: 1700 };
const KIT_LANCE = 260;                         // the board's lance reach, as LANCE.range
const kitLanceHalf = 11;                       // lanceHalf() at the start of a run

/* ------------------------------------ Z ----------------------------------- */
const kitScorchEnv = t => Math.min(clamp(t / SCORCH_UP, 0, 1), clamp((SCORCH_T - t) / SCORCH_DOWN, 0, 1));
function kitScarStamp(sc) {
  const s = sc.scar, last = s.stamps[s.stamps.length - 1];
  if (last && Math.hypot(sc.x1 - last.x1, sc.y1 - last.y1) < SCAR_STEP) {
    if (Math.hypot(sc.x2 - sc.x1, sc.y2 - sc.y1) > Math.hypot(last.x2 - last.x1, last.y2 - last.y1)) { last.x2 = sc.x2; last.y2 = sc.y2; }
    last.k = Math.max(last.k, sc.k);
    return;
  }
  s.stamps.push({ x1: sc.x1, y1: sc.y1, x2: sc.x2, y2: sc.y2, at: s.t, k: sc.k });
}
function kitZStep(st, dt) {
  const P = st.puppets[0];
  st.T += dt;
  if (st.T >= st.loop) { st.T = 0; st.scars.length = 0; st.sc = null; st.cast = false; }
  // it turns to a new heading between casts, and holds it while it burns
  if (!st.sc) P.lock.ang = -0.25 + Math.sin(st.T * 0.4) * 0.25;
  if (!st.cast && st.T >= 0.7) {
    st.cast = true; st.litAt = st.T;
    const scar = { stamps: [], t: 0, life: SCORCH_T + SCAR_LIFE, live: true, half: kitLanceHalf * SCORCH_WIDE * SCAR_HALF, ang: P.ang, seed: 37.7 };
    st.scars.push(scar);
    st.sc = { t: 0, ang: P.ang, k: 0, len: 0, half: 0, x1: P.x, y1: P.y, x2: P.x, y2: P.y, scar };
  }
  const sc = st.sc;
  if (sc) {
    sc.t += dt;
    if (sc.t >= SCORCH_T) { sc.scar.live = false; st.sc = null; st.endAt = st.T; }
    else {
      sc.k = kitScorchEnv(sc.t);
      sc.len = lerp(KIT_LANCE, KIT_LANCE * SCORCH_LEN, clamp(sc.t / SCORCH_UP, 0, 1));
      sc.x1 = P.x; sc.y1 = P.y; sc.x2 = P.x + Math.cos(sc.ang) * sc.len; sc.y2 = P.y + Math.sin(sc.ang) * sc.len;
      sc.half = kitLanceHalf * SCORCH_WIDE * sc.k;
      kitScarStamp(sc);
      for (const e of st.targets) {
        const dx = sc.x2 - sc.x1, dy = sc.y2 - sc.y1, L2 = dx * dx + dy * dy, u = clamp(((e.x - sc.x1) * dx + (e.y - sc.y1) * dy) / L2, 0, 1);
        if (Math.hypot(sc.x1 + dx * u - e.x, sc.y1 + dy * u - e.y) < sc.half + e.r) e.burn = 1;
      }
    }
  }
  for (const s of st.scars) s.t += dt;
  // the jaws stand wide while it sprays; there is no lance to draw
  P.noSegs = true;
  P.lock.beam = st.sc ? () => 1 : undefined;
  boardTargets(st, dt, null);
  boardPuppetStep(P, dt, []);
}
function kitZDraw(st) {
  const P = st.puppets[0];
  boardFloor(st); boardView(st);
  btlScars(st.scars, st.T, P.B.parts);
  boardDrawTargets(st);
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P);
  btlScorch(P.B, st.sc);
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  btlKitScreen(1 - (st.T - st.litAt) / 0.35, 1 - (st.T - st.endAt) / 0.4, st.w, st.h);
}

/* ------------------------------------ X ----------------------------------- */
function kitXStep(st, dt) {
  const P = st.puppets[0];
  st.next -= dt;
  if (st.next <= 0) {
    st.next = 1.7;
    const e = st.targets[st.which++ % st.targets.length];
    // laid where the body will be, as a pilot leads it
    st.pyros.push({ x: e.x + Math.cos(e.o + Math.PI / 2) * 30, y: e.y + Math.sin(e.o + Math.PI / 2) * 18, r: PYRO_R, t: 0, up: false, seed: st.which * 13.1 });
  }
  for (let i = st.pyros.length - 1; i >= 0; i--) {
    const p = st.pyros[i];
    p.t += dt;
    if (!p.up && p.t >= PYRO_DELAY) {
      p.up = true;
      for (const e of st.targets) if (Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r) e.burn = 1;
    }
    if (p.t >= PYRO_DELAY + PYRO_AFTER) st.pyros.splice(i, 1);
  }
  boardTargets(st, dt, P);
  Object.assign(P, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 1 });
  boardPuppetStep(P, dt, st.targets);
}
function kitXDraw(st) {
  const P = st.puppets[0];
  boardFloor(st); boardView(st);
  btlPyroMarks(st.pyros);
  boardDrawTargets(st);
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P); btlDrawFire(P.B, P);
  btlPyros(st.pyros, P.B.parts);
}

/* ------------------------------------ C ----------------------------------- */
const KIT_C = { pre: 0.7, aim: 1.5, post: 1.8, hull: { x: 860, y: 1080 }, mark: { x: 1320, y: 760 } };
const kitStrikeR = () => kitLanceHalf * SCORCH_WIDE * STRIKE_WIDE;
const kitCut = () => STRIKE_CUT_OUT + STRIKE_CUT_HOLD + STRIKE_CUT_IN;
// the whole of BRAND as a list of phases, each with when it starts and how long it is
function kitStrikePlan(combo) {
  const strokes = odStrikeX(KIT_C.mark.x, KIT_C.mark.y).map(s => Object.assign(s, { ang: Math.atan2(s.y2 - s.y1, s.x2 - s.x1), len: Math.hypot(s.x2 - s.x1, s.y2 - s.y1) }));
  const r = Math.min(arena.x1 - arena.x0, arena.y1 - arena.y0) * STRIKE_SIZE / 2;
  const last = strokes[strokes.length - 1];
  const ring = { x: KIT_C.mark.x, y: KIT_C.mark.y, r, a0: Math.atan2(last.y2 - KIT_C.mark.y, last.x2 - KIT_C.mark.x) };
  const ph = [['pre', KIT_C.pre], ['wings', STRIKE_WINGS], ['rise', STRIKE_RISE], ['cutUp', kitCut()], ['aim', KIT_C.aim], ['tell', STRIKE_TELL]];
  strokes.forEach((s, i) => {
    ph.push(['fire', STRIKE_ON + s.len / STRIKE_SPEED + STRIKE_OFF, { i }]);
    if (i + 1 < strokes.length) ph.push(['fire', STRIKE_GAP, { i, gap: true }]);
  });
  if (combo) ph.push(['ring', STRIKE_ON + TAU * r / STRIKE_SPEED + STRIKE_OFF], ['walled', 0.05], ['nuke', PYRO_DELAY + PYRO_AFTER]);
  else ph.push(['xdone', BRAND_WINDOW]);
  ph.push(['cutDown', kitCut()], ['land', STRIKE_LAND], ['post', KIT_C.post]);
  let at = 0;
  const list = ph.map(([name, dur, o]) => { const p = Object.assign({ name, at, dur }, o || {}); at += dur; return p; });
  return { list, total: at, strokes, ring, combo };
}
const kitBlack = (name, t) => (name !== 'cutUp' && name !== 'cutDown') ? 0
  : t < STRIKE_CUT_OUT ? t / STRIKE_CUT_OUT : t < STRIKE_CUT_OUT + STRIKE_CUT_HOLD ? 1
  : 1 - clamp((t - STRIKE_CUT_OUT - STRIKE_CUT_HOLD) / STRIKE_CUT_IN, 0, 1);
// the foot on a path of length len, t into its phase: where along, and how much of it is lit
function kitFoot(t, len) {
  if (t < STRIKE_ON) return { ph: 'on', d: 0, k: t / STRIKE_ON };
  const tr = len / STRIKE_SPEED;
  if (t < STRIKE_ON + tr) return { ph: 'trace', d: (t - STRIKE_ON) * STRIKE_SPEED, k: 1 };
  return { ph: 'off', d: len, k: 1 - clamp((t - STRIKE_ON - tr) / STRIKE_OFF, 0, 1) };
}
// a trench laid along a path up to d, stamped every STRIKE_STAMP: at is when the foot passed
function kitTrench(at, d, pos, seed, t, took) {
  const stamps = [];
  for (let a = 0; a < d; a += STRIKE_STAMP) {
    const b = Math.min(d, a + STRIKE_STAMP), p = pos(a), q = pos(b);
    stamps.push({ x1: p[0], y1: p[1], x2: q[0], y2: q[1], at: STRIKE_ON + a / STRIKE_SPEED, k: 1 });
  }
  return { stamps, t: t - at, life: took + SCAR_LIFE, half: kitStrikeR() * SCAR_HALF, seed, live: true };
}
function kitStrikeAt(plan, T) {
  const L = plan.list, R = kitStrikeR();
  let cur = L[L.length - 1];
  for (const p of L) if (T >= p.at && T < p.at + p.dur) { cur = p; break; }
  const t = T - cur.at, name = cur.name;
  const out = { name, t, alt: 0, wings: 0, pov: false, black: kitBlack(name, t), st: null, scars: [], wall: null, aimAt: null };
  const before = n => L.findIndex(p => p.name === n) >= 0 && T >= L.find(p => p.name === n).at;
  // the hull's own: the climb and the landing
  if (name === 'wings') out.wings = osEase(t / STRIKE_WINGS);
  else if (name === 'rise') { out.wings = 1; out.alt = osEase(t / STRIKE_RISE); }
  else if (name === 'land') { out.wings = out.alt = 1 - osEase(t / STRIKE_LAND); }
  else if (name !== 'pre' && name !== 'post') { out.wings = 1; out.alt = 1; }
  out.pov = name === 'cutUp' ? t >= STRIKE_CUT_OUT : name === 'cutDown' ? t < STRIKE_CUT_OUT
          : ['aim', 'tell', 'fire', 'xdone', 'ring', 'walled', 'nuke'].includes(name);
  if (name !== 'pre' && name !== 'post') out.st = { ph: name === 'post' ? 'land' : name, t, T, mx: KIT_C.mark.x, my: KIT_C.mark.y, strokes: [], beam: null };
  const st = out.st;
  // the aim: the cursor coming to rest on the spot
  if (name === 'aim') {
    const e = osEase(clamp(t / (KIT_C.aim * 0.75), 0, 1));
    out.aimAt = [lerp(KIT_C.mark.x - 420, KIT_C.mark.x, e), lerp(KIT_C.mark.y + 260, KIT_C.mark.y, e)];
  }
  if (st && before('tell')) st.strokes = plan.strokes;
  // the trenches: every stroke the foot has been along so far, then the ring
  plan.list.forEach(p => {
    if (p.name !== 'fire' || p.gap || T < p.at) return;
    const s = plan.strokes[p.i], f = kitFoot(Math.min(T - p.at, p.dur), s.len);
    out.scars.push(kitTrench(p.at, f.d, d => [s.x1 + Math.cos(s.ang) * d, s.y1 + Math.sin(s.ang) * d], 11 + p.i * 7, T, p.dur));
  });
  const ringP = L.find(p => p.name === 'ring');
  if (ringP && T >= ringP.at) {
    const g = plan.ring, f = kitFoot(Math.min(T - ringP.at, ringP.dur), TAU * g.r);
    out.scars.push(kitTrench(ringP.at, f.d, d => [g.x + Math.cos(g.a0 + d / g.r) * g.r, g.y + Math.sin(g.a0 + d / g.r) * g.r], 29, T, ringP.dur));
  }
  // the foot
  if (name === 'fire') {
    const s = plan.strokes[cur.i];
    if (cur.gap) st.beam = { i: cur.i, ph: 'gap', t, x: s.x2, y: s.y2, ang: s.ang, full: R, R: 0, k: 0 };
    else {
      const f = kitFoot(t, s.len);
      st.beam = { i: cur.i, ph: f.ph, t, d: f.d, x: s.x1 + Math.cos(s.ang) * f.d, y: s.y1 + Math.sin(s.ang) * f.d, ang: s.ang, full: R, R: R * f.k, k: f.k };
    }
  } else if (name === 'ring') {
    const g = plan.ring, f = kitFoot(t, TAU * g.r), a = g.a0 + f.d / g.r;
    st.ring = g;
    st.beam = { i: plan.strokes.length, ring: true, ph: f.ph, t, d: f.d, x: g.x + Math.cos(a) * g.r, y: g.y + Math.sin(a) * g.r, ang: a + Math.PI / 2, full: R, R: R * f.k, k: f.k };
  }
  if (st && (name === 'walled' || name === 'nuke')) st.ring = plan.ring;
  if (name === 'nuke') st.nuke = { x: plan.ring.x, y: plan.ring.y, r: plan.ring.r, t, up: t >= PYRO_DELAY, heat: 70, seed: 41 };
  // the wall, from the ring closing until the loop comes round
  const wallP = L.find(p => p.name === 'walled');
  if (wallP && T >= wallP.at) out.wall = { x: plan.ring.x, y: plan.ring.y, r: plan.ring.r, t: T - wallP.at, life: BRAND_WALL_T, seed: 53 };
  return out;
}
const kitBeat = s => ({ pre: 'OVERDRIVE, on the floor', wings: 'C: the wings drive down', rise: 'it climbs', cutUp: 'the shell closes over the view',
  aim: 'from above: mark the spot', tell: 'marked', fire: 'the X, cut stroke by stroke', xdone: 'cut: Z now, or it comes down',
  ring: 'Z: the ring round it', walled: 'the wall', nuke: 'X: the giant column', cutDown: 'the shell closes again', land: 'it lands', post: 'the trench burns on' })[s.name];
function kitCStep(st, dt) {
  const P = st.puppets[0];
  if (st.auto) { st.T += dt; if (st.T >= st.plan.total) st.T = 0; }
  st.now = kitStrikeAt(st.plan, st.T);
  P.x = KIT_C.hull.x; P.y = KIT_C.hull.y;
  Object.assign(P, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 0 });
  boardPuppetStep(P, dt, []);
  // bodies under the foot catch
  const b = st.now.st && st.now.st.beam;
  for (const e of st.targets) {
    e.a += e.spin * dt; e.burn = Math.max(0, e.burn - dt * 0.8);
    if (b && b.R > 1 && Math.hypot(e.x - b.x, e.y - b.y) < b.R + e.r) e.burn = 1;
    if (st.now.name === 'nuke' && st.now.st.nuke.up && Math.hypot(e.x - KIT_C.mark.x, e.y - KIT_C.mark.y) < st.plan.ring.r) e.burn = 1;
  }
  if (st.auto && st.scrubEl) st.scrubEl.value = st.T.toFixed(2);
  if (st.beatEl) st.beatEl.textContent = kitBeat(st.now);
}
function kitCDraw(st) {
  const P = st.puppets[0], n = st.now || kitStrikeAt(st.plan, st.T);
  // the camera: on the hull, or the whole arena from EMBER's own view
  const povZ = Math.min(st.w / (arena.x1 - arena.x0), st.h / (arena.y1 - arena.y0)) * 0.94, closeZ = clamp(st.w / 520, 1, 2.6);
  const z = n.pov ? povZ : closeZ;
  st.zoom = z; st.cx = n.pov ? (arena.x0 + arena.x1) / 2 : P.x; st.cy = n.pov ? (arena.y0 + arena.y1) / 2 : P.y;
  boardFloor(st); boardView(st);
  // the arena's walls, so the view from above reads as a room
  ctx.strokeStyle = 'rgba(99,102,241,0.35)'; ctx.lineWidth = 3 / z; ctx.strokeRect(arena.x0, arena.y0, arena.x1 - arena.x0, arena.y1 - arena.y0);
  btlScars(n.scars, st.T, P.B.parts);
  if (n.name === 'aim') btlStrikeMarks(n.st, odStrikeX(n.aimAt[0], n.aimAt[1]).map(s => Object.assign(s, { ang: Math.atan2(s.y2 - s.y1, s.x2 - s.x1), len: Math.hypot(s.x2 - s.x1, s.y2 - s.y1) })), z, st.T, kitStrikeR());
  else if (n.st && n.st.strokes.length) btlStrikeMarks(n.st, n.st.strokes, z, st.T, kitStrikeR());
  if (n.st) btlBrandNukeMark(n.st, st.T);
  boardDrawTargets(st);
  if (!n.pov) {
    if (n.st && n.name !== 'post') btlStrikeHull(P.B, P, n.alt, n.wings);
    else { btlDrawUnder(P.B, P); btlDrawHull(P.B, P); }
  }
  if (n.st) btlStrikeFoot(n.st, z, st.T);
  btlBrandWall(n.wall);
  if (n.st) btlBrandNuke(n.st, st.T, P.B.parts);
  if (n.aimAt) {                                       // the cursor, from above
    ctx.strokeStyle = 'rgba(207,250,254,0.9)'; ctx.lineWidth = 2 / z;
    ctx.beginPath(); ctx.arc(n.aimAt[0], n.aimAt[1], 14 / z, 0, TAU); ctx.moveTo(n.aimAt[0] - 22 / z, n.aimAt[1]); ctx.lineTo(n.aimAt[0] + 22 / z, n.aimAt[1]);
    ctx.moveTo(n.aimAt[0], n.aimAt[1] - 22 / z); ctx.lineTo(n.aimAt[0], n.aimAt[1] + 22 / z); ctx.stroke();
  }
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  btlStrikeCut(n.black, st.w, st.h, st.T);
}

function boardBuildKit() {
  const $ = id => document.getElementById(id);
  const ring = (R, n) => Array.from({ length: n }, (_, i) => ({ o: i * TAU / n + 0.3, R, orbit: 0.12, x: 0, y: 0, a: 0, spin: 0.5 + i * 0.2,
                                                              r: 11 + (i % 3) * 2, n: 3 + (i % 3), col: ['#f43f5e', '#a3e635', '#f97316'][i % 3], burn: 0 }));
  // Z: casting from a standing hull every few seconds, its scores left on the floor
  const zP = boardPuppet({ x: -230, y: 30, ang: -0.2, lock: { ang: -0.2 }, fire: false });
  Object.assign(zP, { od: OD_FULL, odLit: 1, odGlow: 1 });
  const zt = ring(150, 3);
  const zs = boardStage($('k-z'), { T: 0, loop: 9, scars: [], sc: null, cast: false, litAt: -9, endAt: -9, puppets: [zP], targets: zt,
                                    step: kitZStep, draw: kitZDraw,
                                    // the hull near the left edge and the full reach of the spray in frame
                                    fit: s => { s.zoom = clamp(Math.min(s.w / 820, s.h / 300), 0.3, 2); s.cx = -230 + s.w / s.zoom / 2 - 40; s.cy = 0; } });
  zs.targets.forEach(e => { e.orbit = 0; e.x = 60 + Math.cos(e.o) * 90; e.y = Math.sin(e.o) * 70; });
  // X: a mark laid on each body in turn
  const xP = boardPuppet({ path: t => [Math.cos(t * 0.5) * 60 - 40, Math.sin(t * 0.8) * 30], fire: true });
  boardStage($('k-x'), { pyros: [], next: 0.6, which: 0, puppets: [xP], targets: ring(190, 4),
                         step: kitXStep, draw: kitXDraw, fit: s => { s.zoom = clamp(Math.min(s.w / 640, s.h / 420), 0.3, 2.4); } });
  // C: BRAND, scrubbable, with or without COMBO 1
  const cP = boardPuppet({ x: KIT_C.hull.x, y: KIT_C.hull.y, ang: -0.6, lock: { ang: -0.6 }, fire: false });
  const cs = boardStage($('k-c'), { T: 0, auto: true, combo: true, plan: kitStrikePlan(true), puppets: [cP],
                                    targets: Array.from({ length: 7 }, (_, i) => ({ x: KIT_C.mark.x + Math.cos(i * 0.9) * (180 + i * 50), y: KIT_C.mark.y + Math.sin(i * 0.9) * (120 + i * 30),
                                                                                 a: 0, spin: 0.4, r: 26, n: 3 + (i % 3), col: ['#f43f5e', '#a3e635', '#f97316'][i % 3], burn: 0 })),
                                    step: kitCStep, draw: kitCDraw });
  cs.scrubEl = $('k-c-scrub'); cs.beatEl = $('k-c-beat');
  const play = $('k-c-play'), combo = $('k-c-combo');
  const show = () => {
    play.textContent = cs.auto ? 'Pause loop' : 'Play loop'; play.setAttribute('aria-pressed', cs.auto ? 'false' : 'true');
    combo.textContent = cs.combo ? 'COMBO 1: on' : 'COMBO 1: off'; combo.setAttribute('aria-pressed', cs.combo ? 'true' : 'false');
    cs.scrubEl.max = cs.plan.total.toFixed(2);
  };
  cs.scrubEl.addEventListener('input', () => { cs.auto = false; cs.T = +cs.scrubEl.value; kitCStep(cs, 1e-4); show(); });
  play.addEventListener('click', () => { cs.auto = !cs.auto; show(); });
  combo.addEventListener('click', () => { cs.combo = !cs.combo; cs.plan = kitStrikePlan(cs.combo); cs.T = 0; show(); });
  show();
}
boardBuildKit();
