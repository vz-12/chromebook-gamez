/* A stand-in outside pilot, for the tests alone (scripts/determinism.mjs,
   scripts/outside.mjs). Nothing of any real one: only every hook OUTSIDE
   PILOTS (index.html) offers, used the way its rules ask, so the suites can
   hold a pilot from outside the file to lockstep and the run snapshots the
   way they hold the game's own. Its id is whatever it was loaded as. */
VR.pilot({
  id: VR.id, n: 'test pilot', weapon: 'bullet', col: '#facc15', bullet: '#fef08a',
  tag: 'only ever flown by the tests', d: 'A ring of shots now and then, and a pulse that marks what it hits.',
  hp: 110, speed: 270, dmg: 10, rate: 4.8,

  // the pilot's own state, plain data, on the pilot
  init(p) {
    p.ox = { charge: 0, pulses: 0, mode: 0, keys: 0, held: 0, shots: 0, hits: 0, blinks: 0, blinkCd: 0,
             guard: 2, guardT: 0, blocked: 0, halved: 0, cutT: 0, cuts: 0, ev: {} };
  },

  step(dt) {
    const o = P.ox;
    o.charge += dt;
    // every second and a half or so, by the run's own roll: a ring of shots, and a pulse
    if (o.charge > 1.5 + simRand() * 0.5) {
      o.charge = 0; o.pulses++;
      const n = 6 + simRndi(4) + o.mode;
      for (let i = 0; i < n; i++) fireBullet(P.x, P.y, i / n * TAU + simRand() * 0.2, 0.5);
      // the run's share: what the pulse marked, by id, for a few seconds
      const W = outsideWorld.test || (outsideWorld.test = { marks: [], ticks: 0 });
      for (const e of enemies) {
        if (e.dead || Math.hypot(e.x - P.x, e.y - P.y) > 160) continue;
        damageEnemy(e, P.dmg * 2, false, P.x, P.y);
        if (W.marks.length < 40) W.marks.push({ id: e.id, t: 3 });
      }
    }
    const W = outsideWorld.test;
    if (W) {
      for (const m of W.marks) m.t -= dt;
      W.marks = W.marks.filter(m => m.t > 0);
      W.ticks++;
    }
    // what is held is read from the record, never the keyboard
    if (P.in.held) o.held++;
    if (o.cutT > 0) o.cutT = Math.max(0, o.cutT - dt);
    if (o.blinkCd > 0) o.blinkCd = Math.max(0, o.blinkCd - dt);
    // the guard grows back, one every four seconds
    if (o.guard < 2 && (o.guardT += dt) > 4) { o.guard++; o.guardT = 0; }
  },

  // Z turns the ring up, X fires the pulse now, 1 2 3 set the ring, V is a cut-in; the rest is the game's
  key(k) {
    const o = P.ox;
    o.keys++;
    if (k === 'z') { o.mode = (o.mode + 1) % 3; return true; }
    if (k === 'x') { o.charge = 99; return true; }
    if (k === '1' || k === '2' || k === '3') { o.mode = +k - 1; return true; }
    if (k === 'v') { o.cutT = 0.8; o.cuts++; return true; }
    return false;
  },

  // the weapon: one round at a time on the game's own clock, each tagged with the ring it was fired in
  fire(on, dt, rateMul) {
    if (!on || P.fireT > 0) return;
    P.fireT = 1 / (P.fireRate * rateMul);
    fireBullet(P.x + Math.cos(P.ang) * 20, P.y + Math.sin(P.ang) * 20, P.ang);
    bullets[bullets.length - 1].ox = P.ox.mode;
    P.ox.shots++;
  },
  hit(e, b, dmg) { P.ox.hits++; },

  // a blink instead of the dash, on its own clock
  dash(mx, my) {
    const o = P.ox;
    if (o.blinkCd > 0) return false;
    const l = Math.hypot(mx, my), dx = l ? mx / l : Math.cos(P.ang), dy = l ? my / l : Math.sin(P.ang);
    P.x = clamp(P.x + dx * 140, arena.x0 + P.r, arena.x1 - P.r);
    P.y = clamp(P.y + dy * 140, arena.y0 + P.r, arena.y1 - P.r);
    o.blinkCd = 0.6; o.blinks++;
    return true;
  },
  // two guards take a blow whole each; past them, half of it lands
  hurt(dmg) {
    const o = P.ox;
    if (o.guard > 0) { o.guard--; o.blocked++; P.iframe = Math.max(P.iframe, 0.4); return true; }
    o.halved++;
    return dmg * 0.5;
  },
  slow() { return P.ox.cutT > 0 ? 0.1 : 1; },
  cut() { return P.ox.cutT > 0; },
  ev(name) { P.ox.ev[name] = (P.ox.ev[name] || 0) + 1; },

  hull() {
    ctx.moveTo(16, 0); ctx.lineTo(-10, 10); ctx.lineTo(-4, 0); ctx.lineTo(-10, -10); ctx.closePath();
  },
  back() { ctx.globalAlpha = 0.06; ctx.fillStyle = '#facc15'; ctx.fillRect(arena.x0, arena.y0, arena.x1 - arena.x0, arena.y1 - arena.y0); },
  floor() {
    const W = outsideWorld.test;
    if (!W) return;
    ctx.strokeStyle = '#facc15'; ctx.lineWidth = 2;
    for (const m of W.marks) {
      const e = enemies.find(x => x.id === m.id);
      if (e) { ctx.globalAlpha = Math.min(1, m.t); ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, TAU); ctx.stroke(); }
    }
  },
  // what only the drawing shows may use the unseeded roll
  under() { ctx.globalAlpha = 0.3; ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(P.x, P.y, 24 + rnd(2), 0, TAU); ctx.fill(); },
  over() { ctx.strokeStyle = '#fef08a'; ctx.beginPath(); ctx.arc(P.x, P.y, 18, 0, TAU * Math.min(1, P.ox.charge / 1.5)); ctx.stroke(); },
  fx() { ctx.strokeStyle = '#fef08a'; ctx.beginPath(); ctx.arc(P.x, P.y, 30 * (P.ox.charge % 1), 0, TAU); ctx.stroke(); },
  bullet(b) { ctx.fillStyle = ['#facc15', '#fb923c', '#f472b6'][b.ox] || '#fff'; ctx.fillRect(b.x - 3, b.y - 3, 6, 6); },
  hud() { ctx.fillStyle = '#facc15'; ctx.font = '12px monospace'; ctx.fillText('TEST ' + P.ox.pulses + ' · MODE ' + P.ox.mode, 20, H - 20); },
  screen() { if (P.ox.cutT > 0) { ctx.globalAlpha = P.ox.cutT; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.12); ctx.fillRect(0, H * 0.88, W, H * 0.12); } },
  cursor() { ctx.strokeStyle = '#facc15'; ctx.strokeRect(mouse.x - 6, mouse.y - 6, 12, 12); },
  hangar(on) { ctx.rotate(-Math.PI / 2); ctx.strokeStyle = '#facc15'; ctx.globalAlpha = on ? 1 : 0.32; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, 10); ctx.lineTo(-10, -10); ctx.closePath(); ctx.stroke(); },
  menu(x, y) { ctx.fillStyle = 'rgba(250, 204, 21, 0.05)'; ctx.fillRect(x - 200, y - 40, 400, 80); }
});
