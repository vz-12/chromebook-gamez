/* The tests' stand-in for a module of rooms apart (ROOMS APART, in THE WAY UP
   in index.html): two rooms, one foe and one boss of its own, and every hook,
   each doing just enough to be seen. It names nothing, and lives by the rules:
   every roll that changes the run is the game's simRand, its state is plain
   data on its foes and in upWorld, and its drawing reads only the run. The
   test steers it through two globals: __apartTake (a room for the next
   sector's boss wave) and __apartGo (a room to go to from idle). */
VR.apart({
  rooms: [
    { name: 'APART ONE', tag: 'apart i', bg: '#05060a', grid: '#11151f', grid2: '#1b2030', wall: '#64748b',
      glow: 'rgba(203,213,225,0.12)', accent: '#cbd5e1', music: 'void', pool: [['x1f', 1]], boss: 'x1b' },
    { name: 'APART TWO', tag: 'apart ii', bg: '#0a0605', grid: '#1f1411', grid2: '#30201b', wall: '#78716c',
      glow: 'rgba(231,229,228,0.12)', accent: '#e7e5e4', music: 'vault', pool: [['x1f', 1]], boss: 'x1b' }
  ],
  foes: {
    x1f: { r: 12, hp: 10, spd: 120, dmg: 8, col: '#cbd5e1', xp: 1, score: 10, sides: 3,
      ai(e, dt, ux, uy, d, sp) { steer(e, ux * sp, uy * sp, 3, dt); upWorld.foeSteps = (upWorld.foeSteps | 0) + 1; },
      draw(e, a) { ctx.globalAlpha = a; ctx.strokeStyle = e.col; poly(e.x, e.y, e.r, 3, 0); ctx.stroke(); } }
  },
  bosses: {
    // stands, fires a ring now and then, and calls one of its own in
    x1b: { name: 'THE OTHER STAND-IN', col: '#e2e8f0', r: 44, sides: 9, hpMul: 0.6, spd: 40,
      ai(e, dt, ux, uy, d, ph) {
        steer(e, 0, 0, 2, dt);
        upWorld.bossSteps = (upWorld.bossSteps | 0) + 1;
        if (e.atkT <= 0) {
          e.atkT = 1.4;
          for (let i = 0; i < 10; i++) eshoot(e, i * Math.PI / 5 + simRand(), 200, e.dmg * 0.4);
          if (simRand() < 0.4) spawnEnemy('x1f', e.x + 80, e.y, { elite: false });
        }
      },
      draw(e, a) { ctx.globalAlpha = a; ctx.strokeStyle = e.col; ctx.lineWidth = 3; poly(e.x, e.y, e.r, 9, 0); ctx.stroke(); } }
  },
  enter(def) { upWorld.entered = (upWorld.entered || []).concat(def.name); upWorld.at = def.apart; },
  step(dt, wdt) { upWorld.t = (upWorld.t || 0) + wdt; },
  ev(name, e) { upWorld.evs = (upWorld.evs || '') + name[0]; if (name === 'boss') upWorld.felled = (upWorld.felled | 0) + 1; globalThis.__apartEvs = (globalThis.__apartEvs || '') + name[0]; },
  sector(def, roll) {
    globalThis.__apartHeard = (globalThis.__apartHeard || 0) + 1;
    globalThis.__apartRoll = roll;
    const n = globalThis.__apartTake;
    if (typeof n === 'number') { globalThis.__apartTake = undefined; return n; }
    return -1;
  },
  idle(dt) {
    globalThis.__apartIdle = (globalThis.__apartIdle || 0) + 1;
    const n = globalThis.__apartGo;
    if (typeof n === 'number') { globalThis.__apartGo = undefined; globalThis.__apartWent = VR.go(n); }
  },
  back() { ctx.fillStyle = 'rgba(148,163,184,0.04)'; ctx.fillRect(arena.x0, arena.y0, 200, 200); },
  floor() { ctx.strokeStyle = 'rgba(148,163,184,0.2)'; ctx.strokeRect(arena.x0 + 20, arena.y0 + 20, 100, 100); },
  over() { ctx.fillStyle = 'rgba(148,163,184,0.02)'; ctx.fillRect(arena.x0, arena.y0, 60, 60); },
  screen() { ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(0, 0, 40, 40); },
  hud() { ctx.fillStyle = '#e2e8f0'; ctx.fillText(String(upWorld.at), 20, 20); },
  lift(k) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - k) + ')'; ctx.fillRect(0, 0, W, H); }
});
