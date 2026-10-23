/* ===========================================================================
   THE BLUE BEETLE — the board's kills (beetle-art/README.md)
   Bodies burned down by the flamethrower and put out as cinders, and a boss
   worn down until it goes to ash, both drawn with the game's body shape (a
   poly of radius, sides and angle) the way drawEnemiesBody draws one.
=========================================================================== */
// a body as the game's generic renderer draws it: glow, filled poly, rim, inner poly
function kbBody(e, a = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(e.x, e.y, e.r * (e.boss ? 3.4 : 2.3), e.col, (0.34 + e.flash * 0.3) * a);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  btlPolyPath(e.x, e.y, e.r, e.sides, e.ang);
  ctx.fillStyle = rgba(e.col, 0.18 + e.flash * 0.3); ctx.fill();
  ctx.strokeStyle = e.flash > 0.05 ? btlMix(e.col, '#cffafe', e.flash) : e.col; ctx.lineWidth = e.boss ? 3 : 2; ctx.stroke();
  if (e.boss) {
    btlPolyPath(e.x, e.y, e.r * 0.6, e.sides, -e.ang); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = rgba('#fde047', 0.8); ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.2, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// is e inside the beam this frame
const kbInBeam = (P, e) => P.beam > 0 && P.segs.some(s => {
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy, u = clamp(((e.x - s.x1) * dx + (e.y - s.y1) * dy) / L2, 0, 1);
  return Math.hypot(s.x1 + dx * u - e.x, s.y1 + dy * u - e.y) < P.half + e.r;
});

function kbKillsStep(st, dt) {
  const P = st.puppets[0];
  for (const e of st.bodies) {
    e.ang += e.spin * dt; e.flash = Math.max(0, e.flash - dt * 4);
    if (e.dead) { e.down -= dt; if (e.down <= 0) { e.dead = false; e.hp = 1.1; e.o += 1.7; e.fade = 0; } continue; }
    e.fade = Math.min(1, e.fade + dt * 2);
    e.o += e.orbit * dt; e.x = Math.cos(e.o) * e.R + 40; e.y = Math.sin(e.o) * e.R * 0.6;
    if (kbInBeam(P, e)) {
      e.hp -= dt; e.flash = 1;
      if (e.hp <= 0) { e.dead = true; e.down = 1.1; btlKill(P.B, e, P.ang); }
    }
  }
  boardPuppetStep(P, dt, st.bodies.filter(e => !e.dead));
}
function kbKillsDraw(st) {
  const P = st.puppets[0];
  boardFloor(st); boardView(st);
  btlKillsFloor(P.B);
  for (const e of st.bodies) if (!e.dead) kbBody(e, e.fade);
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P); btlDrawFire(P.B, P);
  btlKillsDraw(P.B);
}

function kbBossStep(st, dt) {
  const P = st.puppets[0], e = st.boss;
  e.ang += e.spin * dt; e.flash = Math.max(0, e.flash - dt * 4);
  if (e.dead) {
    e.down -= dt;
    if (e.down <= 0) { e.dead = false; e.hp = e.max; e.fade = 0; }
  } else {
    e.fade = Math.min(1, e.fade + dt * 1.5);
    if (e.fade >= 1 && kbInBeam(P, e)) {
      e.hp -= dt; e.flash = 0.6;
      if (e.hp <= 0) { e.dead = true; e.down = 3.6; btlBossAsh(P.B, e, Math.atan2(e.y - P.y, e.x - P.x)); }
    }
  }
  boardPuppetStep(P, dt, e.dead || e.fade < 1 ? [] : [e]);
}
function kbBossDraw(st) {
  const P = st.puppets[0], e = st.boss;
  boardFloor(st); boardView(st);
  btlKillsFloor(P.B);
  if (!e.dead) {
    kbBody(e, e.fade);
    // its health, as a thin bar under it
    ctx.fillStyle = 'rgba(15,12,40,0.8)'; ctx.fillRect(e.x - 40, e.y + e.r + 14, 80, 4);
    ctx.fillStyle = e.col; ctx.fillRect(e.x - 40, e.y + e.r + 14, 80 * clamp(e.hp / e.max, 0, 1), 4);
  }
  btlDrawUnder(P.B, P); btlDrawHull(P.B, P); btlDrawFire(P.B, P);
  btlKillsDraw(P.B);
}

function boardBuildKills() {
  const $ = id => document.getElementById(id);
  const kP = boardPuppet({ path: t => [Math.cos(t * 0.5) * 50 - 150, Math.sin(t * 0.8) * 40], fire: true });
  boardStage($('kb-kills'), {
    puppets: [kP], step: kbKillsStep, draw: kbKillsDraw, fit: s => { s.zoom = clamp(Math.min(s.w / 560, s.h / 320), 0.4, 2.6); },
    bodies: Array.from({ length: 6 }, (_, i) => ({ o: i * TAU / 6, R: 120, orbit: 0.25, x: 0, y: 0, ang: 0, spin: 0.6 + i * 0.2,
                                                  r: 10 + (i % 3) * 3, sides: 3 + (i % 4), col: ['#f43f5e', '#a3e635', '#f97316', '#e879f9'][i % 4],
                                                  hp: 1.1, flash: 0, fade: 1, dead: false, down: 0 }))
  });
  const bP = boardPuppet({ path: t => [-170 + Math.sin(t * 0.6) * 20, Math.sin(t * 0.9) * 50], fire: true });
  boardStage($('kb-boss'), {
    puppets: [bP], step: kbBossStep, draw: kbBossDraw, fit: s => { s.zoom = clamp(Math.min(s.w / 520, s.h / 300), 0.4, 2.6); s.cx = -20; },
    boss: { x: 80, y: 0, r: 46, sides: 7, ang: 0, spin: 0.35, col: '#f43f5e', boss: true, hp: 3.2, max: 3.2, flash: 0, fade: 1, dead: false, down: 0 }
  });
}
boardBuildKills();
