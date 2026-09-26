/* Showcase harness: the handful of game globals imperial-skin.js reads, and a
   tiny arena that flies, fires and breaks things so the skin is seen working. */
(function () {
  const W = window;
  W.TAU = Math.PI * 2;
  W.rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
  W.rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const cache = new Map();
  W.glowSprite = color => {
    let s = cache.get(color); if (s) return s;
    const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0, rgba(color, 1)); grd.addColorStop(0.18, rgba(color, 0.75));
    grd.addColorStop(0.45, rgba(color, 0.22)); grd.addColorStop(1, rgba(color, 0));
    g.fillStyle = grd; g.fillRect(0, 0, S, S); cache.set(color, c); return c;
  };
  W.drawGlow = (x, y, r, color, a = 1) => {
    ctx.globalAlpha = a; ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
  };
  W.poly = (x, y, r, sides, ang) => {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = ang + i * TAU / sides, X = x + Math.cos(a) * r, Y = y + Math.sin(a) * r;
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath();
  };
  W.FXO = { parts: true, mat: true, bglow: true };
  W.uiTime = 0; W.P = null; W.ctx = null; W.parts = [];
  W.spawnPart = (x, y, vx, vy, r, color, life, drag = 0.94) => {
    if (W.parts.length > 700) return;
    W.parts.push({ x, y, vx, vy, r, color, life, max: life, drag });
  };

  const HULL = { 1: '#b8c2d6', 2: '#a855f7', 3: '#eab308' };
  const SHOT = { 1: '#dde3ee', 2: '#d8b4fe', 3: '#fde047' };
  const ECOL = ['#f43f5e', '#22d3ee', '#a3e635', '#f97316', '#e879f9', '#38bdf8'];

  function hullPath() {
    ctx.beginPath();
    ctx.moveTo(18, 0); ctx.lineTo(9, 3.4); ctx.lineTo(5.5, 8.5); ctx.lineTo(-5, 13);
    ctx.lineTo(-8.5, 9.5); ctx.lineTo(-6, 4.2); ctx.lineTo(-10.5, 3.2); ctx.lineTo(-6.5, 0);
    ctx.lineTo(-10.5, -3.2); ctx.lineTo(-6, -4.2); ctx.lineTo(-8.5, -9.5); ctx.lineTo(-5, -13);
    ctx.lineTo(5.5, -8.5); ctx.lineTo(9, -3.4); ctx.closePath();
  }
  function drawHull(col) {
    ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (let i = 5; i >= 1; i--) {
      ctx.lineWidth = 2.4 + i * 3.4; ctx.strokeStyle = rgba(col, 0.055 * (1 - i / 6.5) + 0.012);
      hullPath(); ctx.stroke();
    }
    ctx.restore();
    ctx.lineJoin = 'round'; ctx.lineWidth = 2.4; ctx.strokeStyle = col; ctx.fillStyle = rgba(col, 0.18);
    hullPath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(2, 0, 2.6, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function mkEnemy(S, x, y) {
    return { x, y, r: rnd(15, 10), sides: 3 + ((Math.random() * 4) | 0), ang: rnd(TAU), spin: rnd(1, -1),
             col: ECOL[(Math.random() * ECOL.length) | 0], hp: 6, flash: 0, vx: rnd(30, -30), vy: rnd(30, -30), fade: 0 };
  }

  function mount(canvas, opt) {
    const g = canvas.getContext('2d');
    const S = { tier: opt.tier, mode: opt.mode, scale: opt.scale || 1, t: 0, fireT: 0,
                P: { x: 0, y: 0, vx: 0, vy: 0, ang: 0, r: 12 }, parts: [], st: {}, en: [], bu: [] };
    const skin = { fx: 'imperial', tier: opt.tier };
    let cw = 0, ch = 0, dpr = 1, alive = true, last = performance.now();
    function size() {
      dpr = Math.min(2, W.devicePixelRatio || 1);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (w !== cw || h !== ch) { cw = w; ch = h; canvas.width = w * dpr; canvas.height = h * dpr; }
    }
    function burst(x, y, col, n, sp) {
      for (let i = 0; i < n; i++) {
        const a = rnd(TAU), v = rnd(sp, sp * 0.25);
        spawnPart(x, y, Math.cos(a) * v, Math.sin(a) * v, rnd(2.6, 1.2), col, rnd(0.8, 0.35), 0.9);
      }
    }
    function step(dt) {
      const ww = cw / S.scale, wh = ch / S.scale, p = S.P, px = p.x, py = p.y;
      S.t += dt;
      const t = S.t;
      if (S.mode === 'plate') {
        p.x = ww * 0.34 + Math.sin(t * 0.8) * 4; p.y = wh * 0.64 + Math.sin(t * 1.3) * 3;
        if (!S.en.length) S.en.push(mkEnemy(S, ww * 0.84, wh * 0.56));
        const e = S.en[0]; e.x = ww * 0.84; e.y = wh * 0.56 + Math.sin(t * 0.9) * 6; e.vx = e.vy = 0; e.r = 13;
      } else {
        p.x = ww / 2 + Math.sin(t * 0.55) * ww * 0.3; p.y = wh / 2 + Math.sin(t * 1.1) * wh * 0.22;
        while (S.en.length < 4) {
          const a = rnd(TAU);
          S.en.push(mkEnemy(S, ww / 2 + Math.cos(a) * ww * 0.45, wh / 2 + Math.sin(a) * wh * 0.42));
        }
      }
      if (dt > 0) { p.vx = (p.x - px) / dt; p.vy = (p.y - py) / dt; }
      let tgt = null, bd = 1e9;
      for (const e of S.en) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; tgt = e; } }
      if (tgt) {
        const want = Math.atan2(tgt.y - p.y, tgt.x - p.x);
        let d = want - p.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
        p.ang += d * Math.min(1, dt * 7);
      }
      S.fireT -= dt;
      if (S.fireT <= 0 && tgt) {
        S.fireT = S.mode === 'plate' ? 0.42 : 0.14;
        const sp = S.mode === 'plate' ? 240 : 460;
        S.bu.push({ x: p.x + Math.cos(p.ang) * 18, y: p.y + Math.sin(p.ang) * 18,
                    vx: Math.cos(p.ang) * sp, vy: Math.sin(p.ang) * sp, r: 4.2, crit: Math.random() < 0.12 });
      }
      for (const b of S.bu) { b.x += b.vx * dt; b.y += b.vy * dt; }
      for (const e of S.en) {
        e.ang += e.spin * dt; e.flash = Math.max(0, e.flash - dt * 6); e.fade = Math.min(1, e.fade + dt * 2);
        if (S.mode !== 'plate') {
          const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
          e.vx += (dx / d) * 20 * dt * (d > 110 ? 1 : -2); e.vy += (dy / d) * 20 * dt * (d > 110 ? 1 : -2);
          e.vx *= 0.99; e.vy *= 0.99; e.x += e.vx * dt; e.y += e.vy * dt;
        }
        for (const b of S.bu) {
          if (b.dead || e.fade < 0.6) continue;
          if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) {
            b.dead = true; e.hp--; e.flash = 1;
            burst(b.x, b.y, b.crit ? '#fbbf24' : SHOT[S.tier], 6, 110);
          }
        }
        if (e.hp <= 0) { e.dead = true; burst(e.x, e.y, e.col, 26, 190); }
      }
      S.en = S.en.filter(e => !e.dead);
      S.bu = S.bu.filter(b => !b.dead && b.x > -40 && b.y > -40 && b.x < ww + 40 && b.y < wh + 40);
      for (const q of S.parts) {
        q.x += q.vx * dt; q.y += q.vy * dt;
        const k = Math.pow(q.drag, dt * 60); q.vx *= k; q.vy *= k; q.life -= dt;
      }
      S.parts = S.parts.filter(q => q.life > 0);
    }
    function draw() {
      const ww = cw / S.scale, wh = ch / S.scale;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = '#05070d'; g.fillRect(0, 0, cw, ch);
      g.setTransform(dpr * S.scale, 0, 0, dpr * S.scale, 0, 0);
      g.strokeStyle = 'rgba(148,163,184,0.05)'; g.lineWidth = 1 / S.scale;
      g.beginPath();
      const gs = 32;
      for (let x = 0; x < ww; x += gs) { g.moveTo(x, 0); g.lineTo(x, wh); }
      for (let y = 0; y < wh; y += gs) { g.moveTo(0, y); g.lineTo(ww, y); }
      g.stroke();
      for (const e of S.en) {
        g.save(); g.globalAlpha = e.fade;
        poly(e.x, e.y, e.r, e.sides, e.ang);
        g.fillStyle = rgba(e.col, 0.14); g.fill();
        g.lineWidth = 2; g.lineJoin = 'round'; g.strokeStyle = e.flash > 0.5 ? '#ffffff' : e.col; g.stroke();
        g.restore();
        if (S.tier >= 2) impEnemy(e, e.fade, S.tier);
      }
      impUnder(skin, S.st);
      drawHull(HULL[S.tier]);
      impPlayer(skin, S.st);
      for (const b of S.bu) impBullet(b, b.crit ? '#fbbf24' : SHOT[S.tier], S.tier);
      for (const q of S.parts) {
        const t = q.life / q.max, rad = q.r * 3.4 * (0.4 + t * 0.9);
        if (rad < 1.6) continue;
        impPart(q, t, rad, S.tier);
      }
      g.globalAlpha = 1;
    }
    function frame(now) {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000) * (W.ImperialDemo.speed || 1);
      last = now;
      size();
      if (cw && ch) {
        W.ctx = g; W.P = S.P; W.parts = S.parts; W.uiTime = S.t;
        step(dt);
        W.parts = S.parts; W.uiTime = S.t;
        draw();
        S.parts = W.parts;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return { stop() { alive = false; }, set scale(v) { S.scale = v; } };
  }
  W.ImperialDemo = { mount, speed: 1 };
})();
