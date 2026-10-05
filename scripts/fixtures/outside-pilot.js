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
  init(p) { p.ox = { charge: 0, pulses: 0, mode: 0, keys: 0 }; },

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
  },

  // Z turns the ring up, X fires the pulse now; the rest is the game's
  key(k) {
    P.ox.keys++;
    if (k === 'z') { P.ox.mode = (P.ox.mode + 1) % 3; return true; }
    if (k === 'x') { P.ox.charge = 99; return true; }
    return false;
  },

  hull() {
    ctx.moveTo(16, 0); ctx.lineTo(-10, 10); ctx.lineTo(-4, 0); ctx.lineTo(-10, -10); ctx.closePath();
  },
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
  hud() { ctx.fillStyle = '#facc15'; ctx.font = '12px monospace'; ctx.fillText('TEST ' + P.ox.pulses + ' · MODE ' + P.ox.mode, 20, H - 20); }
});
