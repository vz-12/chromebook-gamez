/* ===========================================================================
   THE BLUE BEETLE — the concept board's stages (beetle-art/README.md)
   A puppet flies the beetle the way a run would: EMBER's fire cycle (the
   lance winds up, then burns for a second), a dash now and then, and the hull
   facing what it shoots at. Each stage is a canvas with its own puppet and
   bag, stepped and drawn every frame while it is on screen.
=========================================================================== */
const BOARD = { stages: [], paused: false, slow: false, hitbox: false, last: 0,
                reduce: matchMedia('(prefers-reduced-motion: reduce)').matches };
const LANCE = { charge: 0.8, burn: 1.0, half: 11, range: 260 };

/* --------------------------------- the puppet ----------------------------- */
function boardPuppet(o = {}) {
  const P = {
    t: o.t0 || 0, x: o.x || 0, y: o.y || 0, vx: 0, vy: 0, ang: o.ang || 0,
    charge: 0, beam: 0, phase: 'charge', ph: 0, dash: 0, dashCd: o.dashEvery || 3.4,
    path: o.path || null, follow: moSpring2(o.x || 0, o.y || 0, 1.3, 0.85),
    fire: o.fire !== false, dashEvery: o.dashEvery || 0, aimAt: o.aimAt || null,
    lock: o.lock, range: o.range || LANCE.range, segs: [], half: LANCE.half
  };
  P.B = btlNew(P.x, P.y, P.ang);
  return P;
}
function boardPuppetStep(P, dt, targets) {
  P.t += dt;
  // where it is going: along its path, on a spring, so a dash can fling it off and it comes back
  if (P.path) {
    const [tx, ty] = P.path(P.t);
    P.follow.step(dt, tx, ty);
    const nx = P.follow.x.v, ny = P.follow.y.v;
    P.vx = (nx - P.x) / dt; P.vy = (ny - P.y) / dt;
    P.x = nx; P.y = ny;
  }
  // the dash: a shove along the way it faces
  if (P.dashEvery) {
    P.dashCd -= dt;
    if (P.dashCd <= 0) {
      P.dashCd = P.dashEvery; P.dash = 0.17;
      P.follow.kick(Math.cos(P.ang) * 820, Math.sin(P.ang) * 820);
    }
  }
  if (P.dash > 0) P.dash -= dt;
  if (P.lock !== undefined && P.lock.dash) P.dash = 1;
  // the aim: the nearest target in reach, or the way it is going
  let want = P.ang;
  if (P.lock !== undefined && P.lock.ang !== undefined) want = P.lock.ang;
  else {
    let best = null, bd = P.range + 40;
    for (const e of targets || []) { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd) { bd = d; best = e; } }
    if (best) want = Math.atan2(best.y - P.y, best.x - P.x);
    else if (Math.hypot(P.vx, P.vy) > 20) want = Math.atan2(P.vy, P.vx);
  }
  P.ang = moDecayAng(P.ang, want, 0.07, dt);
  // the gun: wind up, then burn for a second, then wind up again
  if (P.lock && P.lock.charge !== undefined) { P.charge = P.lock.charge(P.t); P.beam = 0; }
  else if (P.lock && P.lock.beam) { P.charge = 0; P.beam = P.lock.beam(P.t); }
  else if (P.fire) {
    P.ph += dt;
    if (P.phase === 'charge') {
      P.charge = clamp(P.ph / LANCE.charge, 0, 1); P.beam = 0;
      if (P.ph >= LANCE.charge) { P.phase = 'burn'; P.ph = 0; }
    } else {
      P.charge = 0;
      P.beam = 0.5 + 0.5 * Math.sin(Math.PI * clamp(P.ph / LANCE.burn, 0, 1));
      if (P.ph >= LANCE.burn) { P.phase = 'charge'; P.ph = 0; P.beam = 0; }
    }
  } else { P.charge = 0; P.beam = 0; }
  // the beam: from the jaws along the aim
  P.segs.length = 0;
  if (P.beam > 0) {
    const ca = Math.cos(P.ang), sa = Math.sin(P.ang), x1 = P.x + ca * BTL.mouth, y1 = P.y + sa * BTL.mouth;
    P.segs.push({ x1, y1, x2: x1 + ca * P.range, y2: y1 + sa * P.range });
  }
  P.half = LANCE.half * P.beam;
  btlTick(P.B, P, dt);
}

/* ---------------------------------- a stage ------------------------------- */
function boardStage(el, o) {
  const cv = document.createElement('canvas');
  el.appendChild(cv);
  const st = Object.assign({ el, cv, g: cv.getContext('2d'), zoom: 2, cx: 0, cy: 0, w: 0, h: 0, dpr: 1,
                             visible: true, puppets: [], targets: [], floor: 'arena', draw: null, step: null }, o);
  const fit = () => {
    const r = el.getBoundingClientRect();
    st.dpr = Math.min(2, devicePixelRatio || 1);
    st.w = Math.max(1, r.width); st.h = Math.max(1, r.height);
    cv.width = Math.round(st.w * st.dpr); cv.height = Math.round(st.h * st.dpr);
    cv.style.width = st.w + 'px'; cv.style.height = st.h + 'px';
    if (st.fit) st.fit(st);
    if (st.still) boardDraw(st);
  };
  new ResizeObserver(fit).observe(el);
  new IntersectionObserver(es => { st.visible = es[0].isIntersecting; }).observe(el);
  fit();
  BOARD.stages.push(st);
  return st;
}
// world → this canvas: the stage's zoom about its centre, in device pixels
function boardView(st, zoom = st.zoom, cx = st.cx, cy = st.cy) {
  const s = st.dpr * zoom;
  ctx.setTransform(s, 0, 0, s, st.dpr * st.w / 2 - cx * s, st.dpr * st.h / 2 - cy * s);
}
function boardFloor(st) {
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  const g = ctx.createRadialGradient(st.w / 2, st.h / 2, 0, st.w / 2, st.h / 2, Math.max(st.w, st.h) * 0.75);
  g.addColorStop(0, '#0b0a1f'); g.addColorStop(1, '#030209');
  ctx.fillStyle = g; ctx.fillRect(0, 0, st.w, st.h);
  if (st.floor !== 'arena') return;
  // floor plating, the way the game lays a sector: a grid of plates in world units
  boardView(st);
  const span = Math.max(st.w, st.h) / st.zoom, step = 40;
  ctx.strokeStyle = 'rgba(99,102,241,0.07)'; ctx.lineWidth = 1 / st.zoom;
  ctx.beginPath();
  for (let x = Math.floor((st.cx - span) / step) * step; x < st.cx + span; x += step) { ctx.moveTo(x, st.cy - span); ctx.lineTo(x, st.cy + span); }
  for (let y = Math.floor((st.cy - span) / step) * step; y < st.cy + span; y += step) { ctx.moveTo(st.cx - span, y); ctx.lineTo(st.cx + span, y); }
  ctx.stroke();
}
function boardTargets(st, dt, P) {
  for (const e of st.targets) {
    e.a += e.spin * dt;
    if (e.orbit) { e.o += e.orbit * dt; e.x = Math.cos(e.o) * e.R; e.y = Math.sin(e.o) * e.R * 0.62; }
    // caught in the fire: close enough to a segment, within its width
    e.burn = Math.max(0, e.burn - dt * 2.5);
    if (P && P.beam > 0) for (const s of P.segs) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), u = ((e.x - s.x1) * dx + (e.y - s.y1) * dy) / (L * L);
      if (u < 0 || u > 1) continue;
      const d = Math.abs((e.x - s.x1) * dy - (e.y - s.y1) * dx) / L;
      if (d < P.half + e.r) e.burn = 1;
    }
  }
}
function boardDrawTargets(st) {
  for (const e of st.targets) {
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.a);
    ctx.beginPath();
    for (let i = 0; i < e.n; i++) { const a = i * TAU / e.n; i ? ctx.lineTo(Math.cos(a) * e.r, Math.sin(a) * e.r) : ctx.moveTo(Math.cos(a) * e.r, Math.sin(a) * e.r); }
    ctx.closePath();
    ctx.fillStyle = rgba(e.col, 0.16 + e.burn * 0.3); ctx.fill();
    ctx.strokeStyle = e.burn > 0.05 ? btlMix(e.col, '#cffafe', e.burn) : e.col; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
}
function boardHitbox(P) {
  ctx.save();
  ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.arc(P.x, P.y, 12, 0, TAU); ctx.stroke();
  if (P.beam > 0) for (const s of P.segs) {
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy), nx = -dy / L * P.half, ny = dx / L * P.half;
    ctx.strokeStyle = 'rgba(253,224,71,0.85)';
    ctx.beginPath();
    ctx.moveTo(s.x1 + nx, s.y1 + ny); ctx.lineTo(s.x2 + nx, s.y2 + ny);
    ctx.moveTo(s.x1 - nx, s.y1 - ny); ctx.lineTo(s.x2 - nx, s.y2 - ny);
    ctx.stroke();
  }
  ctx.restore();
}
function boardDraw(st) {
  ctx = st.g;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (st.draw) { st.draw(st); return; }
  boardFloor(st);
  boardView(st);
  boardDrawTargets(st);
  for (const P of st.puppets) {
    btlDrawUnder(P.B, P);
    btlDrawHull(P.B, P);
    btlDrawFire(P.B, P);
    if (BOARD.hitbox && st.hitbox !== false) boardHitbox(P);
  }
}
function boardFrame(now) {
  requestAnimationFrame(boardFrame);
  let dt = BOARD.last ? Math.min(0.1, (now - BOARD.last) / 1000) : 0;
  BOARD.last = now;
  if (BOARD.paused) dt = 0;
  if (BOARD.slow) dt *= 0.25;
  for (const st of BOARD.stages) {
    if (st.still) continue;
    if (dt > 0 && (st.visible || st.shares)) {
      if (st.step) st.step(st, dt);
      else for (const P of st.puppets) { boardTargets(st, dt, P); boardPuppetStep(P, dt, st.targets); }
    }
    if (st.visible) boardDraw(st);
  }
}

/* --------------------------------- the stages ----------------------------- */
function boardBuild() {
  const $ = id => document.getElementById(id);
  // IN FLIGHT: a figure of eight among three bodies, firing and dashing
  const eight = t => { const u = t * 1.2; return [Math.sin(u) * 150, Math.sin(u * 2) * 62]; };
  const hero = boardStage($('hero'), {
    zoom: 2.4, shares: true,
    fit: st => { st.zoom = clamp(Math.min(st.w / 480, st.h / 260), 1.1, 3.2); },
    targets: [0, 1, 2].map(i => ({ o: i * TAU / 3, R: 205, orbit: 0.22, x: 0, y: 0, a: 0, spin: 0.6 + i * 0.3,
                                   r: 11 + i * 2, n: 3 + i, col: ['#f43f5e', '#a3e635', '#f97316'][i], burn: 0 }))
  });
  const pilot = boardPuppet({ path: eight, dashEvery: 3.4 });
  hero.puppets.push(pilot);
  // AT GAME SIZE: the same flight, drawn at 1×, following the hull
  boardStage($('actual'), { zoom: 1, step: () => {}, targets: hero.targets,
                            draw: st => {
                              st.cx = pilot.x * 0.6; st.cy = pilot.y * 0.6;
                              boardFloor(st); boardView(st); boardDrawTargets(st);
                              btlDrawUnder(pilot.B, pilot); btlDrawHull(pilot.B, pilot); btlDrawFire(pilot.B, pilot);
                            } });

  // THE HEAD in four states, held still and close
  const still = (lock, o = {}) => {
    const P = boardPuppet(Object.assign({ x: 0, y: 0, ang: -0.35, fire: !!o.fire, lock }, o));
    return P;
  };
  const head = (id, P, follow) => boardStage($(id), {
    floor: 'plain', cx: 4, cy: -1, puppets: [P],
    fit: st => { st.zoom = clamp(st.w / 64, 2.6, 7); },
    step: (st, dt) => { boardPuppetStep(P, dt, []); if (follow) { st.cx = P.x - 4; st.cy = P.y; } }
  });
  head('h-idle', still({ ang: -0.35 }, { fire: false }));
  head('h-charge', still({ ang: -0.35, charge: t => (t % 1.3) / 1.3 }));
  head('h-fire', still({ ang: -0.35, beam: t => 0.5 + 0.5 * Math.sin(Math.PI * ((t % 1.15) / 1.15)) }));
  const dasher = boardPuppet({ path: t => [Math.cos(t * 0.9) * 26, Math.sin(t * 0.9) * 26], fire: false, lock: { dash: true } });
  head('h-dash', dasher, true);

  // THE BITE: eight frames of one cycle, sampled from the real spring
  boardStage($('bite'), { still: true, draw: boardDrawBite });

  // THE BODY: laid in a long S behind a slow flight
  const snake = boardPuppet({ path: t => [t * 120, Math.sin(t * 1.9) * 34], fire: false });
  boardStage($('body'), { zoom: 3.2, floor: 'plain', puppets: [snake],
                          fit: st => { st.zoom = clamp(st.w / 150, 2.2, 4.4); },
                          step: (st, dt) => { boardPuppetStep(snake, dt, []); st.cx = snake.x - 46; st.cy = snake.y * 0.3; } });

  // THE FIRE: one beam held open, straight, with its hitbox and falloff marked
  const gunner = boardPuppet({ x: 0, y: 0, ang: 0, lock: { ang: 0, beam: () => 1 }, range: 260 });
  boardStage($('fire'), { floor: 'plain', puppets: [gunner], hitbox: false,
                          fit: st => { st.zoom = clamp(st.w / 330, 1, 3); st.cx = 140; st.cy = 0; },
                          draw: boardDrawFirePlate });
}

/* the bite strip: the spring run once through a whole cycle offline, and
   eight moments of it drawn side by side */
const BITE_AT = [['charge 0', 0.02], ['charge 0.5', 0.42], ['charge 0.9', 0.74], ['fires', 0.82],
                 ['the fling', 0.9], ['burning', 1.3], ['goes out', 1.83], ['shut', 1.95]];
function boardDrawBite(st) {
  const P = boardPuppet({ x: 0, y: 0, ang: 0, fire: true }), frames = [];
  let t = 0, next = 0;
  while (next < BITE_AT.length && t < 3) {
    boardPuppetStep(P, 1 / 240, []);
    t += 1 / 240;
    if (t >= BITE_AT[next][1]) frames.push({ jaw: P.B.jaw.v, charge: P.charge, beam: P.beam, label: BITE_AT[next++][0] });
  }
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.fillStyle = '#060515'; ctx.fillRect(0, 0, st.w, st.h);
  const n = frames.length, cols = st.w >= 1000 ? 8 : 4, rows = Math.ceil(n / cols), cw = st.w / cols, ch = st.h / rows;
  // facing up, the beetle runs from the jaws (y -23) to the shell (y 16): fit that above the label
  const z = clamp(Math.min(cw / 30, (ch - 30) / 42), 1.4, 7);
  frames.forEach((f, i) => {
    const cx = (i % cols) * cw + cw / 2, top = Math.floor(i / cols) * ch, cy = top + (ch - 26) / 2 + 3.5 * z;
    const B = btlNew(0, 0, -Math.PI / 2);
    B.jaw.v = f.jaw; B.t = 0.4 + i * 0.13;
    const me = { x: 0, y: 0, ang: -Math.PI / 2, vx: 0, vy: 0, charge: f.charge, beam: f.beam, segs: [], half: 0, range: 0 };
    ctx.setTransform(st.dpr * z, 0, 0, st.dpr * z, st.dpr * cx, st.dpr * cy);
    ctx.save(); ctx.beginPath(); ctx.rect(-cw / z / 2, (top - cy) / z, cw / z, (ch - 24) / z); ctx.clip();
    btlDrawHull(B, me);
    ctx.restore();
    ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    ctx.fillStyle = '#8f8ac2'; ctx.font = "600 11px 'JetBrains Mono', ui-monospace, monospace"; ctx.textAlign = 'center';
    ctx.fillText(f.label, cx, Math.floor(i / cols) * ch + ch - 10);
    if (i) { ctx.strokeStyle = '#1b1838'; ctx.beginPath(); ctx.moveTo((i % cols) * cw, Math.floor(i / cols) * ch + 10); ctx.lineTo((i % cols) * cw, Math.floor(i / cols) * ch + ch - 10); ctx.stroke(); }
  });
}

/* the fire plate: the beam, its hitbox, and how hard it hits along its length */
function boardDrawFirePlate(st) {
  const P = st.puppets[0];
  boardFloor(st);
  boardView(st);
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P); btlDrawFire(P.B, P);
  const s = P.segs[0];
  if (!s) return;
  ctx.save();
  ctx.setLineDash([4, 4]); ctx.lineWidth = 1 / st.zoom * 1.2; ctx.strokeStyle = 'rgba(253,224,71,0.7)';
  ctx.strokeRect(s.x1, -P.half, s.x2 - s.x1, P.half * 2);
  ctx.setLineDash([]);
  ctx.fillStyle = '#e6e4ff'; ctx.font = `600 ${11 / st.zoom}px 'JetBrains Mono', ui-monospace, monospace`;
  ctx.textAlign = 'left'; ctx.fillText('×2.5 at the jaws', s.x1, -P.half - 6 / st.zoom);
  ctx.textAlign = 'right'; ctx.fillText('×0.5 at the tip', s.x2, -P.half - 6 / st.zoom);
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(253,224,71,0.85)'; ctx.fillText('the hitbox', (s.x1 + s.x2) / 2, P.half + 14 / st.zoom);
  ctx.restore();
}

/* --------------------------------- OVERDRIVE ------------------------------
   The ignite on a loop: odPhase's beat with a short vent (six seconds of
   burn, then the stock cool), the room laid the way odIgnite lays it, and a
   scrubber to hold any moment of the cut-in. */
const OD_BOARD = { burn: 6, loop: 11.6 };
const OD_FULL = { dim: 0, cool: 0, life: 1, open: 1, lance: 1 };
function boardOdPhase(T) {
  const cool0 = OD_T_LAND + OD_BOARD.burn;
  const dim = clamp((T - OD_T_DIM) / (OD_T_DIM_END - OD_T_DIM), 0, 1);
  const lit = clamp((T - OD_T_LAND) / 0.7, 0, 1), cool = clamp((T - cool0) / 1.2, 0, 1);
  return { dim, cool, life: lit * (1 - cool),
           open: osEase(clamp((T - OD_T_WINGS) / 0.85, 0, 1)) * (1 - osEase(cool)),
           lance: osEase(clamp((T - OD_T_WINGS - 0.25) / 0.6, 0, 1)) * (1 - osEase(cool)) };
}
const boardOdBeat = T => T < OD_T_DIM ? 'the vent fires' : T < OD_T_SPARK ? 'the room dims'
  : T < OD_T_LAND ? 'the swarm comes in' : T < OD_T_WINGS ? 'the last one lands: the room takes'
  : T < OD_T_LAND + OD_BOARD.burn ? 'OVERDRIVE' : 'it cools';
// the wall line catches first, then the floor between, kept off the hull (odIgnite's layout)
function boardOdPools(st) {
  const pools = [], vw = st.w / st.zoom, vh = st.h / st.zoom, m = Math.min(vw, vh) * 0.07;
  let n = 0;
  const h = () => btlHash(77, n++);
  const add = (x, y, r) => pools.push({ x: st.cx - vw / 2 + x, y: st.cy - vh / 2 + y, r, seed: h() * 100, born: st.T, k: 0.7 + h() * 0.6 });
  const nx = Math.max(4, Math.round(vw / 150));
  for (let i = 0; i < nx; i++) {
    add(lerp(m, vw - m, (i + 0.5) / nx) + (h() - 0.5) * 40, m + h() * 12, 28 + h() * 14);
    add(lerp(m, vw - m, (i + 0.5) / nx) + (h() - 0.5) * 40, vh - m - h() * 12, 28 + h() * 14);
  }
  for (let i = 0; i < 5; i++) {
    const a = h() * TAU, d = Math.min(vw, vh) * (0.3 + h() * 0.15);
    add(vw / 2 + Math.cos(a) * d, vh / 2 + Math.sin(a) * d * 0.72, 32 + h() * 18);
  }
  return pools;
}
// the room takes at the landing, and is not there before it
function boardOdSync(st) {
  if (st.T >= OD_T_LAND && !st.pools.length) { st.pools = boardOdPools(st); st.flash = 1; }
  if (st.T < OD_T_LAND && st.pools.length) st.pools = [];
}
function boardOdStep(st, dt) {
  const P = st.puppets[0];
  if (st.auto) { st.T += dt; if (st.T >= OD_BOARD.loop) st.T = 0; }
  boardOdSync(st);
  st.flash = Math.max(0, st.flash - dt * 2.6);
  const q = boardOdPhase(st.T), lit = btlOdLit(st.T);
  if (!(q.lance > 0.05)) { P.phase = 'charge'; P.ph = 0; }
  P.fire = q.lance > 0.05;
  Object.assign(P, { od: q, odLit: lit, odGlow: Math.max(lit * 0.8, q.life), odLance: q.lance });
  boardTargets(st, dt, P);
  boardPuppetStep(P, dt, st.targets);
  if (st.auto && st.scrubEl) st.scrubEl.value = st.T.toFixed(2);
  if (st.beatEl) st.beatEl.textContent = boardOdBeat(st.T);
}
function boardOdDraw(st) {
  const P = st.puppets[0], q = boardOdPhase(st.T);
  boardFloor(st);
  boardView(st);
  btlOdFloor(st.pools, st.T, q.life, P.B.parts);
  boardDrawTargets(st);
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P); btlDrawFire(P.B, P);
  // over the frame: the dim, the swarm above it, the cold grade and the flash
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  const sx = (P.x - st.cx) * st.zoom + st.w / 2, sy = (P.y - st.cy) * st.zoom + st.h / 2;
  btlOdGrade(q, st.T, st.flash, st.w, st.h, () => btlOdSwarm(st.T, sx, sy, P.ang, st.zoom, st.w, st.h));
}
function boardBuildOd() {
  const $ = id => document.getElementById(id);
  const P = boardPuppet({ path: t => [Math.cos(t * 0.7) * 30, Math.sin(t * 1.1) * 16], fire: false });
  const ig = boardStage($('od-ignite'), {
    T: 0, pools: [], flash: 0, auto: true, puppets: [P], step: boardOdStep, draw: boardOdDraw,
    fit: s => { s.zoom = clamp(Math.min(s.w / 420, s.h / 236), 1, 3); s.pools = []; },
    targets: [0, 1, 2].map(i => ({ o: i * TAU / 3 + 0.5, R: 160, orbit: 0.16, x: 0, y: 0, a: 0, spin: 0.5 + i * 0.3,
                                   r: 11 + i * 2, n: 3 + i, col: ['#f43f5e', '#a3e635', '#f97316'][i], burn: 0 }))
  });
  ig.scrubEl = $('od-scrub'); ig.beatEl = $('od-beat');
  const play = $('od-play');
  const show = () => { play.textContent = ig.auto ? 'Pause loop' : 'Play loop'; play.setAttribute('aria-pressed', ig.auto ? 'false' : 'true'); };
  ig.scrubEl.max = OD_BOARD.loop;
  ig.scrubEl.addEventListener('input', () => {
    ig.auto = false; ig.T = +ig.scrubEl.value; boardOdSync(ig); show();
    if (BOARD.paused) boardOdStep(ig, 1e-4);
  });
  play.addEventListener('click', () => { ig.auto = !ig.auto; show(); });
  show();

  // THE FORM: held at full burn, close
  const form = boardPuppet({ x: 0, y: 0, ang: -0.25, lock: { ang: -0.25 }, fire: true });
  Object.assign(form, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 1 });
  boardStage($('od-form'), { floor: 'plain', cx: -10, cy: 4, puppets: [form],
                             fit: s => { s.zoom = clamp(s.w / 125, 2, 5); } });
  // THE LANCE: braided, held open, with its hitbox
  const gun = boardPuppet({ x: 0, y: 0, ang: 0, lock: { ang: 0, beam: () => 1 }, range: 260 });
  Object.assign(gun, { od: OD_FULL, odLit: 1, odGlow: 1, odLance: 1 });
  boardStage($('od-lance'), { floor: 'plain', puppets: [gun], hitbox: false, draw: boardDrawFirePlate,
                              fit: s => { s.zoom = clamp(s.w / 330, 1, 3); s.cx = 140; s.cy = 0; } });
}

function boardControls() {
  const bind = (id, key, on, off) => {
    const b = document.getElementById(id);
    const show = () => { b.setAttribute('aria-pressed', BOARD[key] ? 'true' : 'false'); b.textContent = BOARD[key] ? on : off; };
    b.addEventListener('click', () => { BOARD[key] = !BOARD[key]; show(); });
    show();
  };
  bind('b-pause', 'paused', 'Play', 'Pause');
  bind('b-slow', 'slow', 'Full speed', 'Slow-mo');
  bind('b-hit', 'hitbox', 'Hide hitbox', 'Show hitbox');
}

BOARD.slow = BOARD.reduce;
boardBuild();
boardBuildOd();
// the still plates carry text: draw them again once the fonts are in
if (document.fonts) document.fonts.ready.then(() => { for (const st of BOARD.stages) if (st.still) boardDraw(st); });
boardControls();
requestAnimationFrame(boardFrame);
