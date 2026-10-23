/* ===========================================================================
   THE BLUE BEETLE — the board's V (beetle-art/README.md)
   FUSION CORE on the stock numbers (FUSION_*, STAR_*), shortened to fit a
   loop: a fusion of a few seconds instead of FUSION_T. In the fight, the
   suns are thrown at STAR_RATE from alternate legs, seek, take bodies in up
   to STAR_HOLD, fuse and go up. Up close, the change in and out on a loop
   with a scrubber.
=========================================================================== */
const KH_BOARD = { pre: 0.8, life: 9, post: 1, change: 3.4 };

function khStar(P, clock, thrown) {
  thrown.hand = -thrown.hand; thrown.at = clock;
  const a = P.ang, nose = 12 + 10;
  return { x: P.x + Math.cos(a) * nose, y: P.y + Math.sin(a) * nose, ang: a, vx: Math.cos(a) * STAR_SPD, vy: Math.sin(a) * STAR_SPD,
           r: STAR_R, t: 0, held: [], fuse: -1, dead: false, seed: clock * 7.3 };
}
function khBlow(st, s) {
  if (s.dead) return;
  s.dead = true;
  const R = STAR_BLAST_R + STAR_BLAST_GROW * s.held.length;
  st.booms.push({ x: s.x, y: s.y, R, at: st.clock });
  if (st.booms.length > 24) st.booms.shift();
  for (const e of s.held) { e.inStar = null; e.burn = 1; }
  for (const e of st.targets) if (Math.hypot(e.x - s.x, e.y - s.y) < R + e.r) e.burn = 1;
  s.held.length = 0;
}
function khStarsStep(st, dt) {
  const vw = st.w / st.zoom / 2, vh = st.h / st.zoom / 2;
  for (let i = st.stars.length - 1; i >= 0; i--) {
    const s = st.stars[i];
    if (s.dead) { st.stars.splice(i, 1); continue; }
    s.t += dt;
    if (s.held.length < STAR_HOLD) {
      let best = null, bd = STAR_SEEK;
      for (const e of st.targets) {
        if (e.inStar) continue;
        const d = Math.hypot(e.x - s.x, e.y - s.y), off = Math.abs(moWrap(Math.atan2(e.y - s.y, e.x - s.x) - s.ang));
        if (d < bd && off < 0.9) { bd = d; best = e; }
      }
      if (best) s.ang += clamp(moWrap(Math.atan2(best.y - s.y, best.x - s.x) - s.ang), -STAR_TURN * dt, STAR_TURN * dt);
    }
    const spd = STAR_SPD * (1 - 0.1 * s.held.length);
    s.vx = Math.cos(s.ang) * spd; s.vy = Math.sin(s.ang) * spd;
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.r = Math.max(STAR_R, s.held.reduce((m, e) => Math.max(m, e.r), 0) + 6) + 3 * s.held.length;
    if (Math.abs(s.x - st.cx) > vw || Math.abs(s.y - st.cy) > vh) { khBlow(st, s); continue; }
    for (const e of st.targets) {
      if (e.inStar || Math.hypot(e.x - s.x, e.y - s.y) > s.r + e.r) continue;
      e.inStar = s; e.starA = Math.random() * TAU;
      s.held.push(e);
      if (s.fuse < 0) s.fuse = STAR_FUSE;
      if (s.held.length >= STAR_HOLD) { khBlow(st, s); break; }
    }
    if (s.dead) continue;
    for (const e of s.held) { const a = e.starA + s.t * 5; e.x = s.x + Math.cos(a) * s.r * 0.35; e.y = s.y + Math.sin(a) * s.r * 0.35; }
    if (s.fuse >= 0 && (s.fuse -= dt) <= 0) { khBlow(st, s); continue; }
    if (s.t >= STAR_LIFE) khBlow(st, s);
  }
}
// the fusion this stage is running, at time T into its loop (null before and after)
function khFusionAt(T, life) {
  const t = T - KH_BOARD.pre;
  return t >= 0 && t < life ? { t, life, seed: 3.3 } : null;
}
function khFightStep(st, dt) {
  const P = st.puppets[0];
  st.clock += dt; st.T += dt;
  const total = KH_BOARD.pre + KH_BOARD.life + KH_BOARD.post;
  if (st.T >= total) { st.T = 0; st.stars.length = 0; }
  const was = st.f;
  st.f = khFusionAt(st.T, KH_BOARD.life);
  if (was && !st.f) st.outAt = st.clock;
  // stars only from a whole Khepri, at STAR_RATE
  const whole = st.f && st.f.t >= FUSION_IN && st.f.life - st.f.t > FUSION_OUT;
  st.throwCd -= dt;
  if (whole && st.throwCd <= 0) { st.throwCd = 1 / STAR_RATE; st.stars.push(khStar(P, st.clock, st.thrown)); }
  for (const e of st.targets) {
    e.a += e.spin * dt; e.burn = Math.max(0, e.burn - dt * 2);
    if (!e.inStar) { e.o += e.orbit * dt; e.x = Math.cos(e.o) * e.R; e.y = Math.sin(e.o) * e.R * 0.62; }
    // the aura burns what comes within FUSION_AURA_R
    if (whole && Math.hypot(e.x - P.x, e.y - P.y) < FUSION_AURA_R + e.r) e.burn = Math.max(e.burn, 0.6);
  }
  khStarsStep(st, dt);
  Object.assign(P, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 0 });
  boardPuppetStep(P, dt, st.targets);
}
function khFightDraw(st) {
  const P = st.puppets[0];
  boardFloor(st); boardView(st);
  btlKhepriAura(P, st.f, st.clock);
  boardDrawTargets(st);
  if (st.f) btlKhepriHull(P.B, P, st.f, st.clock, st.thrown);
  else { btlDrawUnder(P.B, P); btlDrawHull(P.B, P); }
  btlKhepriStars(st.stars, st.booms, st.clock);
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  btlKhepriScreen(st.f, st.clock, st.outAt, st.w, st.h);
}

// up close: the change in, a moment whole (the legs flicking as if throwing), the change out
function khChangeStep(st, dt) {
  const P = st.puppets[0];
  st.clock += dt;
  if (st.auto) { st.T += dt; if (st.T >= KH_BOARD.change + 0.8) st.T = 0; }
  const was = st.f;
  st.f = st.T >= 0.4 && st.T < 0.4 + KH_BOARD.change ? { t: st.T - 0.4, life: KH_BOARD.change, seed: 1.1 } : null;
  if (was && !st.f) st.outAt = st.clock;
  const whole = st.f && st.f.t >= FUSION_IN && st.f.life - st.f.t > FUSION_OUT;
  st.throwCd -= dt;
  if (whole && st.throwCd <= 0) { st.throwCd = 1 / STAR_RATE; st.thrown.hand = -st.thrown.hand; st.thrown.at = st.clock; }
  Object.assign(P, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 0 });
  boardPuppetStep(P, dt, []);
  if (st.auto && st.scrubEl) st.scrubEl.value = st.T.toFixed(2);
  if (st.beatEl) st.beatEl.textContent = !st.f ? 'OVERDRIVE' : st.f.t < FUSION_IN ? 'V: the change in'
    : st.f.life - st.f.t < FUSION_OUT ? 'it burns out' : 'KHEPRI';
}
function khChangeDraw(st) {
  const P = st.puppets[0];
  boardFloor(st); boardView(st);
  btlKhepriAura(P, st.f, st.clock);
  if (st.f) btlKhepriHull(P.B, P, st.f, st.clock, st.thrown);
  else { btlDrawUnder(P.B, P); btlDrawHull(P.B, P); }
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  btlKhepriScreen(st.f, st.clock, st.outAt, st.w, st.h);
}

function boardBuildKhepri() {
  const $ = id => document.getElementById(id);
  const fP = boardPuppet({ path: t => [Math.cos(t * 0.45) * 40 - 30, Math.sin(t * 0.7) * 24], fire: false });
  boardStage($('k-v'), {
    T: 0, clock: 0, f: null, outAt: -9, throwCd: 0, thrown: { at: -9, hand: 1 }, stars: [], booms: [], puppets: [fP],
    targets: Array.from({ length: 6 }, (_, i) => ({ o: i * TAU / 6, R: 210 + (i % 2) * 40, orbit: 0.18 * (i % 2 ? -1 : 1), x: 0, y: 0, a: 0,
                                                   spin: 0.5 + i * 0.2, r: 11 + (i % 3) * 2, n: 3 + (i % 3), col: ['#f43f5e', '#a3e635', '#f97316'][i % 3], burn: 0 })),
    step: khFightStep, draw: khFightDraw, fit: s => { s.zoom = clamp(Math.min(s.w / 640, s.h / 400), 0.3, 2.4); }
  });
  const cP = boardPuppet({ x: 0, y: 0, ang: -0.3, lock: { ang: -0.3 }, fire: false });
  const cs = boardStage($('k-v-change'), {
    T: 0, clock: 0, f: null, outAt: -9, throwCd: 0, thrown: { at: -9, hand: 1 }, auto: true, puppets: [cP], floor: 'plain',
    step: khChangeStep, draw: khChangeDraw, fit: s => { s.zoom = clamp(Math.min(s.w / 105, s.h / 62), 1.2, 7); s.cx = 0; s.cy = 1; }
  });
  cs.scrubEl = $('k-v-scrub'); cs.beatEl = $('k-v-beat');
  cs.scrubEl.max = (KH_BOARD.change + 0.8).toFixed(2);
  const play = $('k-v-play');
  const show = () => { play.textContent = cs.auto ? 'Pause loop' : 'Play loop'; play.setAttribute('aria-pressed', cs.auto ? 'false' : 'true'); };
  cs.scrubEl.addEventListener('input', () => { cs.auto = false; cs.T = +cs.scrubEl.value; khChangeStep(cs, 1e-4); show(); });
  play.addEventListener('click', () => { cs.auto = !cs.auto; show(); });
  show();
}
boardBuildKhepri();
