/* The tests' stand-in for a rooms module (THE WAY UP in index.html): two
   rooms, one foe and one boss of its own, and every hook, each doing just
   enough to be seen. It names nothing, and lives by the rules: every roll
   that changes the run is the game's simRand, its state is plain data on its
   foes and in upWorld, and its drawing reads only the run. Run as the vault
   runs a module: the body of a function handed VR. */
VR.rooms({
  rooms: [
    { name: 'ROOM ONE', tag: 'room i', bg: '#06070a', grid: '#141822', grid2: '#1e2433', wall: '#475569',
      glow: 'rgba(226,232,240,0.12)', accent: '#e2e8f0', music: 'void',
      pool: [['x0f', 60], ['grunt', 30]], boss: 'x0b' },
    { name: 'ROOM TWO', tag: 'room ii', bg: '#0a0706', grid: '#221814', grid2: '#33241e', wall: '#78716c',
      glow: 'rgba(231,229,228,0.12)', accent: '#e7e5e4', music: 'vault',
      pool: [['x0f', 50], ['spitter', 30]], boss: 'x0b' }
  ],
  foes: {
    // a drifter: closes, circles, and now and then a slow round
    x0f: { r: 14, hp: 16, spd: 110, dmg: 9, col: '#cbd5e1', xp: 2, score: 14, sides: 5,
      ai(e, dt, ux, uy, d, sp) {
        const a = d > 260 ? 1 : -0.2;
        steer(e, (ux * a - uy * 0.6) * sp, (uy * a + ux * 0.6) * sp, 3, dt);
        e.cd -= dt;
        if (e.cd <= 0) { e.cd = simRnd(2.4, 1.4); eshoot(e, Math.atan2(uy, ux), 220, e.dmg * 0.8); }
        upWorld.foeSteps = (upWorld.foeSteps | 0) + 1;
      },
      draw(e, a) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = e.flash > 0.5 ? '#fff' : e.col; ctx.lineWidth = 2;
        poly(e.x, e.y, e.r, 5, e.ang || 0); ctx.stroke();
      } }
  },
  bosses: {
    // a ring that fires a fan and drops a mark
    x0b: { name: 'THE STAND-IN', col: '#f1f5f9', r: 40, sides: 7, hpMul: 0.8, spd: 70,
      ai(e, dt, ux, uy, d, ph) {
        steer(e, ux * e.spd * (d > 320 ? 1 : -0.4), uy * e.spd * (d > 320 ? 1 : -0.4), 1.4, dt);
        e.ang += dt * 0.6;
        if (e.atkT <= 0) {
          e.atkT = 1.6 - ph * 0.3;
          const n = 7 + ph * 3, at = Math.atan2(uy, ux);
          for (let i = 0; i < n; i++) eshoot(e, at + (i - (n - 1) / 2) * 0.16, 240, e.dmg * 0.6);
          if (simRand() < 0.5) mortars.push({ x: P.x, y: P.y, r: 70, t: 1.1, max: 1.1, dmg: e.dmg, col: e.col, ally: !!e.hacked, pid: 0 });
        }
      },
      draw(e, a) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = e.flash > 0.5 ? '#fff' : e.col; ctx.lineWidth = 4;
        poly(e.x, e.y, e.r, 7, e.ang); ctx.stroke();
      } }
  },
  enter(def) { upWorld.entered = (upWorld.entered || []).concat(def.name); upWorld.waves = 0; },
  wave(n) { upWorld.waves = (upWorld.waves | 0) + 1; upWorld.lastWave = n; },
  step(dt, wdt) { upWorld.t = (upWorld.t || 0) + wdt; },
  ev(name, e) { upWorld.evs = (upWorld.evs || '') + name[0]; if (name === 'boss') upWorld.felled = (upWorld.felled | 0) + 1; },
  back() { ctx.fillStyle = 'rgba(148,163,184,0.04)'; ctx.fillRect(arena.x0, arena.y0, 200, 200); },
  floor() { ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.strokeRect(arena.x0 + 20, arena.y0 + 20, 100, 100); },
  over() { ctx.fillStyle = 'rgba(148,163,184,0.02)'; ctx.fillRect(arena.x0, arena.y0, 60, 60); },
  screen() { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 0, 40, 40); },
  hud() { ctx.fillStyle = '#e2e8f0'; ctx.fillText(String(upWorld.waves | 0), 20, 20); },
  light(L) { ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(L.x - 40, L.y - 400, 80, 400); },
  lift(k) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.fillRect(0, 0, W, H); }
});
