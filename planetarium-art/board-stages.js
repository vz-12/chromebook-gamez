/* ===================== THE PLANETARIUM — the review board's other stages =====================
   The plates, the signs on the field, the events, the shadows, the tray, the atlas and
   the dome at phone width. What the game draws around the art (enemies, rounds, the stock
   corona and twin, the shields) is stood in for here, plainly, so the art has its context;
   only the art itself is the art. */

/* ------------------------------------ cells ------------------------------------ */
// a cell of a stage, looking at the room: (cx, cy) in the world at its centre, zoom z
function zbCell(x, y, w, h, cx, cy, z, fn) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = '#05060a'; ctx.fillRect(x, y, w, h);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(z, z); ctx.translate(-cx, -cy);
  ctx.strokeStyle = 'rgba(30,58,95,0.4)'; ctx.lineWidth = 1 / z;
  ctx.beginPath();
  const hw = w / z / 2 + 60, hh = h / z / 2 + 60;
  for (let gx = Math.floor((cx - hw) / 60) * 60; gx < cx + hw; gx += 60) { ctx.moveTo(gx, cy - hh); ctx.lineTo(gx, cy + hh); }
  for (let gy = Math.floor((cy - hh) / 60) * 60; gy < cy + hh; gy += 60) { ctx.moveTo(cx - hw, gy); ctx.lineTo(cx + hw, gy); }
  ctx.stroke();
  fn();
  ctx.restore();
  ctx.strokeStyle = 'rgba(51,65,85,0.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
// the same cell, for what is drawn on the screen (SUNLESS): the cell is the screen
function zbCellScreen(x, y, w, h, cx, cy, z, fn) {
  const sW = W, sH = H;
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.translate(x, y);
  W = w; H = h; cam.x = cx; cam.y = cy; cam.sx = 0; cam.sy = 0; camZoom = z;
  try { fn(); } finally { W = sW; H = sH; camZoom = 1; ctx.restore(); }
}
function zbEnemy(e) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(e.x, e.y, e.r * 2.4, '#f43f5e', 0.25);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = e.psn ? '#a3e635' : '#fb7185'; ctx.fillStyle = 'rgba(60,10,20,0.85)'; ctx.lineWidth = 2;
  poly(e.x, e.y, e.r, 5, e.spin || 0); ctx.fill(); ctx.stroke();
  if (e.psn) for (let i = 0; i < Math.min(8, e.psn); i++) {
    ctx.fillStyle = '#a3e635';
    ctx.beginPath(); ctx.arc(e.x - 12 + i * 3.4, e.y + e.r + 6, 1.3, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function zbRounds(list, col) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of list) { drawGlow(b.x, b.y, 12, b.col || col, 0.6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, TAU); ctx.fill(); }
  ctx.restore();
}
// the stock corona and twin and shields, as drawPlayer draws them, so the art is seen in its place
function zbStock(p) {
  if (p.sun) {
    const R = zLeoR();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(p.x, p.y, R * 0.95, '#fbbf24', 0.2);
    ctx.strokeStyle = 'rgba(253,224,71,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const a = uiTime * 0.35 + i * TAU / 18, wob = Math.sin(uiTime * (2.4 + (i % 5) * 0.5) + i * 1.7);
      const r0 = R * 0.82, r1 = R * (1 + 0.16 * (0.5 + wob * 0.5)), sp = 0.07 + 0.05 * (0.5 + wob * 0.5);
      ctx.fillStyle = i % 3 ? `rgba(251,146,60,${0.22 + 0.1 * wob})` : `rgba(253,224,71,${0.22 + 0.1 * wob})`;
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a - sp) * r0, p.y + Math.sin(a - sp) * r0);
      ctx.quadraticCurveTo(p.x + Math.cos(a) * r1 * 1.06, p.y + Math.sin(a) * r1 * 1.06, p.x + Math.cos(a + sp) * r0, p.y + Math.sin(a + sp) * r0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  if (p.twin > 0) {
    const t = twinPos();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(t.x, t.y, 44, '#c4b5fd', 0.4); ctx.restore();
    ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(p.twinAng); ctx.lineWidth = 2.2; ctx.globalAlpha = 0.72;
    drawShipHull('#c4b5fd', 'rgba(196,181,253,0.18)'); ctx.restore();
  }
}
function zbShields(p) {
  for (let i = 0; i < Math.min(6, p.shield); i++) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = COL.shield; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 9 + i * 5, uiTime * 1.4 + i, uiTime * 1.4 + i + 4.6); ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------ a puppet room ------------------------------------
   One pilot, a few bodies round it, rounds coming in: stepped by the cell's script. */
function zbRoom(o) {
  const hx = WORLD.w / 2 + (o.off ? o.off[0] : 0), hy = WORLD.h / 2 + (o.off ? o.off[1] : 0), er = o.er || 150;
  const p = zbPilot(Object.assign({ x: hx, y: hy }, o.p || {}));
  const en = [];
  for (let i = 0; i < (o.n === undefined ? 4 : o.n); i++) en.push({ a0: i * TAU / 4 + 0.4, rr: er * (1 + (i % 2) * 0.18), r: 13, hp: 100, maxHp: 100, x: 0, y: 0, spin: 0 });
  return { p, en, eb: [], hx, hy, t: 0, clocks: {}, dashA: 0, dashOff: { x: 0, y: 0 }, last: { x: hx, y: hy } };
}
function zbRoomStep(R, dt, opt = {}) {
  const p = R.p, t = R.t += dt;
  // the pilot: a slow loop round home, shoved by a dash
  R.dashOff.x *= Math.pow(0.08, dt); R.dashOff.y *= Math.pow(0.08, dt);
  if (p.dashT > 0) { p.dashT -= dt; R.dashOff.x += Math.cos(R.dashA) * 900 * dt; R.dashOff.y += Math.sin(R.dashA) * 900 * dt; if (p.dashT <= 0) p.dashT = 0; }
  const nx = R.hx + Math.cos(t * 0.7) * 34 + R.dashOff.x, ny = R.hy + Math.sin(t * 0.9) * 22 + R.dashOff.y;
  p.vx = (nx - p.x) / Math.max(dt, 1e-3); p.vy = (ny - p.y) / Math.max(dt, 1e-3);
  p.x = nx; p.y = ny;
  const near = R.en.reduce((b, e) => (!b || len(e.x - p.x, e.y - p.y) < len(b.x - p.x, b.y - p.y) ? e : b), null);
  p.ang = near ? Math.atan2(near.y - p.y, near.x - p.x) : p.ang;
  p.twinAng = Math.atan2(p.y - (WORLD.h - p.y), p.x - (WORLD.w - p.x));
  for (const e of R.en) {
    const a = e.a0 + t * 0.25;
    e.x = R.hx + Math.cos(a) * e.rr; e.y = R.hy + Math.sin(a) * e.rr * 0.7; e.spin = t;
    if (e.stagger > 0) e.stagger -= dt;
  }
  // rounds coming in from the right, toward the pilot
  if (opt.rounds) {
    R.clocks.eb = (R.clocks.eb || 0) - dt;
    if (R.clocks.eb <= 0) { R.clocks.eb = 0.45; const y = p.y + rnd(160, -160); R.eb.push({ x: p.x + 360, y, vx: -170, vy: (p.y - y) * 0.4 }); }
    for (let i = R.eb.length - 1; i >= 0; i--) {
      const b = R.eb[i], slow = opt.deep && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < Z_DEEP_R ** 2 ? 0.25 : 1;
      b.x += b.vx * dt * slow; b.y += b.vy * dt * slow;
      if (b.x < p.x - 380 || len(b.x - p.x, b.y - p.y) < 10) R.eb.splice(i, 1);
    }
  }
}
// true once every `every` seconds, on this room's clock
function zbEvery(R, k, every, off = 0) {
  const n = Math.floor((R.t + off) / every);
  if (R.clocks[k] === undefined) R.clocks[k] = -1;
  if (n !== R.clocks[k]) { R.clocks[k] = n; return true; }
  return false;
}
// draw a room through the art: the stock under it, zDrawWorld, the hull
function zbRoomDraw(R, opt = {}) {
  P = R.p; enemies = R.en; ebullets = R.eb;
  for (const e of R.en) zbEnemy(e);
  zbRounds(R.eb, '#fb7185');
  if (opt.under) opt.under();
  zbStock(P);
  zDrawWorld();
  zbShields(P);
  zbHull(P);
  zbParts(opt.dt || 1 / 60);
}

/* --------------------------------- each sign, on the field ---------------------------------
   What each cell does to its pilot so the sign has something to show: dashes, hits taken,
   shields broken and grown back, the clocks the logic would run. */
const ZB_SIGN = {
  aries(R, m, dt) {
    const p = R.p;
    if (zbEvery(R, 'dash', 2.2)) { p.dashT = 0.26; R.dashA = Math.atan2(WORLD.h / 2 - p.y, WORLD.w / 2 - p.x) + rnd(0.6, -0.6); R.gored = []; }
    if (p.dashT > 0) for (const e of R.en) {
      if (R.gored.includes(e) || len(e.x - p.x, e.y - p.y) > 60) continue;
      R.gored.push(e); e.stagger = 1.2; e.ramCd = 0.4;
      P = p; zaFx('gore', e.x, e.y, R.dashA);
    }
  },
  taurus(R, m, dt) {
    credits = m >= 2 ? 1500 : 900;
    if (m >= 3 && zbEvery(R, 'bull', 3.2, 1)) { P = R.p; zaFx('bull', R.p.x, R.p.y, 150); }
  },
  gemini(R, m) { R.p.twin = m; },
  cancer(R, m, dt) {
    const p = R.p;
    p.shieldMax = 3;
    if (R.clocks.sh === undefined) p.shield = m >= 2 ? 5 : 3;
    if (zbEvery(R, 'sh', 1.6)) { p.shield = Math.max(0, p.shield - 1); if (p.shield === 0) p.shield = m >= 2 ? 5 : 3; }
    if (m >= 3) {
      p.zx.caraT = Math.max(0, (p.zx.caraT || 0) - dt);
      if (zbEvery(R, 'cara', 5, 2)) p.zx.caraT = 3;
    }
  },
  leo(R, m, dt) {
    const p = R.p; p.sun = m;
    if (m >= 3) { p.zx.novaT = Math.max(0, (p.zx.novaT || 0) - dt * 2.2); if (zbEvery(R, 'nova', 4.2, 1)) p.zx.novaT = 8; }
  },
  virgo(R, m) {
    if (zbEvery(R, 'reap', m >= 2 ? 1.1 : 1.7)) { const e = R.en[Math.floor(R.t) % R.en.length]; P = R.p; zaFx('reap', e.x, e.y, e.r); }
  },
  libra(R, m) {
    const p = R.p;
    p.hp = p.maxHp * (0.5 + 0.5 * Math.cos(R.t * 0.6));
    if (zbEvery(R, 'hurt', 1.9)) p.hp -= 6;
    if (m >= 3 && zbEvery(R, 'judge', 3, 1)) { const e = R.en[1]; P = p; zaFx('judge', e.x, e.y, e.r); }
  },
  scorpio(R, m) {
    for (const e of R.en) e.psn = Math.min(8, 1 + Math.floor(R.t * 2) % 8);
    if (m >= 3 && zbEvery(R, 'sting', 2.1)) { const e = R.en[Math.floor(R.t) % R.en.length]; P = R.p; zaFx('sting', e.x, e.y, e.r); }
  },
  sagittarius(R, m) {
    if (m >= 3 && zbEvery(R, 'rain', 3, 1)) { P = R.p; zaFx('rain', WORLD.w / 2 + 40, WORLD.h / 2 + 20); }
  },
  capricorn() {},
  aquarius(R, m, dt) {
    const p = R.p;
    if (m >= 2 && zbEvery(R, 'dash', 2.4)) { p.dashT = 0.2; R.dashA = rnd(TAU); P = p; zaFx('wave', p.x, p.y, Math.cos(R.dashA), Math.sin(R.dashA)); }
    if (m >= 3) { p.zx.floodT = Math.max(0, (p.zx.floodT || 0) - dt); if (zbEvery(R, 'flood', 4.4, 2)) p.zx.floodT = 4; }
  },
  pisces(R, m, dt) {
    if (m >= 3) { const x = R.p.zx; x.tideT = (x.tideT || 0) + dt * 3; if (x.tideT >= 12) x.tideT = 0; }
  }
};
// the stock bits the art goes with: the charged water, the arrows in a fan (board stand-ins)
function zbSignUnder(id, R) {
  if (id === 'aquarius') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) { const u = i / 9, a = (R.t - u * 1.2) * 0.7, b = (R.t - u * 1.2) * 0.9;
      drawGlow(R.hx + Math.cos(a) * 34, R.hy + Math.sin(b) * 22, 40 * (1 - u * 0.6), '#67e8f9', 0.12); }
    ctx.restore();
  }
  if (id === 'sagittarius') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const p = R.p;
    for (let k = -1; k <= 1; k++) for (let j = 0; j < 3; j++) {
      const d = ((R.t * 420 + j * 140) % 420) + 20, a = p.ang + k * 0.16, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      ctx.strokeStyle = 'rgba(253,230,138,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * 16, y - Math.sin(a) * 16); ctx.stroke();
      drawGlow(x, y, 6, '#fcd34d', 0.6);
    }
    ctx.restore();
  }
}

// how each sign's cells look at the room: close on the hull, or out wide for what reaches across it
const ZB_VIEW = { aries: { z: 0.75 }, taurus: { z: 1.2 }, gemini: { z: 0.5, off: [-150, -80], er: 110 }, cancer: { z: 1.05 },
                  leo: { z: 0.34 }, virgo: { z: 0.8 }, libra: { z: 1.0 }, scorpio: { z: 0.8 }, sagittarius: { z: 0.55 },
                  capricorn: { z: 1.0 }, aquarius: { z: 0.6 }, pisces: { z: 0.6 } };
ZB_STAGE('field', 1180, 2680, () => {
  const cells = [];
  ZA_ORDER.forEach((id, row) => {
    const v = ZB_VIEW[id];
    for (let m = 1; m <= 3; m++) {
      const R = zbRoom({ p: { zs: { [id]: m } }, off: v.off, er: v.er || 80 / v.z });
      R.parts = [];
      cells.push({ id, m, row, R });
    }
  });
  return { cells };
});
ZB.draw.field = (st, dt) => {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  const cw = 330, ch = 210, x0 = 190, y0 = 44;
  zbLabel('I  RISING', x0 + cw / 2, 28, ZA_GOLD, 12, 'center');
  zbLabel('II  EXALTED', x0 + cw * 1.5 + 10, 28, ZA_GOLD, 12, 'center');
  zbLabel('III  ASCENDANT', x0 + cw * 2.5 + 20, 28, ZA_GOLD, 12, 'center');
  for (const c of st.cells) {
    const x = x0 + (c.m - 1) * (cw + 10), y = y0 + c.row * (ch + 10);
    if (c.m === 1) {
      const s = zSign(c.id);
      zaGlyph(c.id, 30, y + 34, 13, ZA_GOLD_HI, { glow: 0.6 });
      zbLabel(s.n, 52, y + 39, '#f1f5f9', 15);
      zbLabel(s.t.toUpperCase(), 52, y + 56, '#64748b', 10);
      zaConst(c.id, 95, y + 128, 100, { lineA: 0.45 });
    }
    const vb = st.cv.getBoundingClientRect(), sy = vb.top + (y / H) * vb.height;
    if (!ZB.all && !ZB.held && (sy > (window.innerHeight || 900) + 40 || sy + ch < -40)) continue;   // off screen: not stepped
    parts = c.R.parts;
    zbRoomStep(c.R, dt, { rounds: c.id === 'pisces' || c.id === 'leo', deep: c.id === 'pisces' });
    credits = 420;
    P = c.R.p;
    ZB_SIGN[c.id](c.R, c.m, dt);
    P = c.R.p;
    const v = ZB_VIEW[c.id];
    zbCell(x, y, cw, ch, v.off ? WORLD.w / 2 : c.R.hx, v.off ? WORLD.h / 2 : c.R.hy, v.z, () => zbRoomDraw(c.R, { dt, under: () => zbSignUnder(c.id, c.R) }));
    const ln = zHalves(zLine(zSign(c.id), c.m))[0];
    zbLabel(Z_RN[c.m] + '  ' + ln, x + 10, y + ch - 10, '#cbd5e1', 10);
  }
};

/* ---------------------------------- the events ---------------------------------- */
const ZB_FX = [
  ['gore', 'ARIES · the gore'], ['crater', 'MARS ASCENDANT'], ['bull', 'THE GOLDEN BULL'], ['shell', 'THE SHELL · a shield breaks'],
  ['carapace', 'THE CARAPACE · it opens'], ['nova', 'SUPERNOVA'], ['judge', 'JUDGEMENT'], ['sting', 'THE STING'],
  ['reap', 'THE HARVEST · reaped'], ['rain', 'RAIN OF ARROWS'], ['flood', 'THE FLOOD'], ['tide', 'THE TIDE'],
  ['wave', 'THE WAVE'], ['eclipse', 'a shadow taken'], ['skyturns', 'THE SKY TURNS'], ['shut', 'THE CARAPACE · shut']
];
const ZB_FXZ = { nova: 0.3, flood: 0.3, carapace: 0.3, tide: 0.3, rain: 0.45, judge: 0.6, bull: 0.5, crater: 0.6, wave: 0.42, shell: 0.95, gore: 1.0, sting: 1.0, reap: 1.0,
                 eclipse: 1.2, skyturns: 0.9, shut: 1.3 };
ZB_STAGE('fx', 1360, 1040, () => ({ cells: ZB_FX.map(([k, n], i) => {
  const R = zbRoom({ n: 3, er: Math.min(260, 80 / ZB_FXZ[k]), p: { zs: k === 'shut' ? { cancer: 3 } : {} } });
  R.parts = []; R.k = k; R.n = n; R.i = i; return R; }) }));
ZB.draw.fx = (st, dt) => {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  const cw = 330, ch = 250;
  for (const R of st.cells) {
    const x = 10 + (R.i % 4) * (cw + 10), y = 10 + Math.floor(R.i / 4) * (ch + 10);
    parts = R.parts;
    zbRoomStep(R, dt);
    const p = R.p; P = p; enemies = R.en;
    const cyc = R.k === 'nova' || R.k === 'flood' || R.k === 'carapace' ? 2.6 : 2.2;
    if (zbEvery(R, 'go', cyc)) {
      const e = R.en[0];
      if (R.k === 'gore' || R.k === 'reap' || R.k === 'sting' || R.k === 'judge') zaFx(R.k, e.x, e.y, R.k === 'gore' ? 0.5 : e.r);
      else if (R.k === 'rain') zaFx('rain', WORLD.w / 2 + 40, WORLD.h / 2 + 20);
      else if (R.k === 'wave') zaFx('wave', p.x, p.y, 1, 0.2);
      else if (R.k === 'shut') p.zx.caraT = 3;
      else zaFx(R.k, p.x, p.y, p.ang, 150);
    }
    if (R.k === 'eclipse' && R.t > 0.1) p.zShadow = 'virgo';
    if (R.k === 'shut') p.zx.caraT = Math.max(0.0001, (p.zx.caraT || 3) - dt * 0.8);
    if (R.k === 'crater') { p.zs = { aries: 3 }; }
    zbCell(x, y, cw, ch, R.hx, R.hy, ZB_FXZ[R.k], () => zbRoomDraw(R, { dt }));
    zbLabel(R.n, x + 10, y + ch - 10, '#e2e8f0', 11);
  }
};

/* ---------------------------------- the shadows ---------------------------------- */
ZB_STAGE('shadows', 1360, 800, () => ({ cells: ZA_ORDER.map((id, i) => {
  const R = zbRoom({ n: 3, er: id === 'gemini' ? 120 : 130, off: id === 'gemini' ? [-130, -70] : null, p: { zs: { [id]: 2 }, zShadow: id } }); R.parts = []; R.id = id; R.i = i;
  const x = R.p.zx;
  if (id === 'cancer') R.p.molt = 1;
  if (id === 'libra') R.p.scales = 1;
  if (id === 'aquarius') R.arena = { x0: WORLD.w / 2 - 310, y0: WORLD.h / 2 - 230, x1: WORLD.w / 2 + 310, y1: WORLD.h / 2 + 230 };
  return R;
}) }));
ZB.draw.shadows = (st, dt) => {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  const cw = 330, ch = 250;
  for (const R of st.cells) {
    const x = 10 + (R.i % 4) * (cw + 10), y = 10 + Math.floor(R.i / 4) * (ch + 10), p = R.p, zx = p.zx, id = R.id;
    parts = R.parts;
    zbRoomStep(R, dt, { rounds: id === 'gemini' || id === 'sagittarius' });
    P = p;
    if (id === 'taurus') { zx.holdCd = (zx.holdCd || 0) + dt; if (zx.holdCd >= 3) { zx.holdCd = 0; zx.holdT = 1; } if (zx.holdT > 0) zx.holdT -= dt; }
    if (id === 'gemini') { zx.hostT = (zx.hostT || 0) - dt; if (zx.hostT <= 0) zx.hostT = 0.5; R.p.twin = 0; }
    if (id === 'aries') { zx.lastX = Math.cos(R.t * 0.4); zx.lastY = Math.sin(R.t * 0.4); }
    if (id === 'libra') p.scalesDebt = p.maxHp * 0.15 * (0.5 + 0.5 * Math.sin(R.t * 1.2));
    if (id === 'scorpio') zx.selfPsn = 1 + Math.floor(R.t * 1.5) % 14;
    if (id === 'capricorn') zx.capSh = 0.34 + 0.66 * ((R.t * 0.12) % 1);
    if (id === 'aquarius') p.waveClock = (R.t * 6) % 50;
    const sA = { x0: arena.x0, y0: arena.y0, x1: arena.x1, y1: arena.y1 };
    if (R.arena) Object.assign(arena, R.arena);
    try {
      zbCell(x, y, cw, ch, WORLD.w / 2, WORLD.h / 2, id === 'gemini' || id === 'aquarius' ? 0.55 : 0.8, () => {
        zbRoomDraw(R, { dt });
        if (R.arena) { ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 3; ctx.strokeRect(arena.x0, arena.y0, arena.x1 - arena.x0, arena.y1 - arena.y0); }
      });
      if (id === 'leo') zbCellScreen(x, y, cw, ch, WORLD.w / 2, WORLD.h / 2, 0.8, () => { state = 'play'; zawSunless(); });
    } finally { Object.assign(arena, sA); }
    const s = zSign(id);
    zbLabel(zHalves(s.shadow)[0], x + 10, y + ch - 12, ZA_SHADE_HI, 12);
    zbLabel(s.n, x + cw - 10, y + 20, '#64748b', 10, 'right');
  }
};

/* ---------------------------------- the tray ---------------------------------- */
const ZB_TRAYS = [
  ['a few held', { zs: { aries: 1, leo: 2, virgo: 1, pisces: 1 } }],
  ['FIRE complete, Capricorn ascendant', { zs: { aries: 2, leo: 1, sagittarius: 3, capricorn: 3, gemini: 1 } }],
  ['a shadow carried', { zs: { taurus: 2, scorpio: 1, libra: 1, aquarius: 2 }, zShadow: 'taurus' }],
  ['the whole sky', { zs: { aries: 3, taurus: 2, gemini: 3, cancer: 1, leo: 3, virgo: 2, libra: 2, scorpio: 3, sagittarius: 1, capricorn: 2, aquarius: 1, pisces: 3 }, zShadow: 'scorpio', zShadowFixed: true }]
];
ZB_STAGE('tray', 1180, 230, () => ({ pilots: ZB_TRAYS.map(([n, o]) => { const p = zbPilot(o); zbTri(p); return { n, p }; }) }));
ZB.draw.tray = (st, dt) => {
  ctx.fillStyle = '#05060a'; ctx.fillRect(0, 0, W, H);
  st.pilots.forEach((q, i) => {
    const x = 16 + i * 292, y = 14;
    ctx.fillStyle = 'rgba(15,23,42,0.6)'; roundRect(x - 6, y - 4, 280, 200, 10); ctx.fill();
    zbLabel(q.n, x + 4, y + 12, '#64748b', 10);
    P = q.p;
    // the first panel lands a sign from the dome now and then
    ZAT = q.zat || (q.zat = { at: {}, flashAt: {} });
    if (i === 0 && Math.floor(st.t / 3.2) !== st.flyN) { st.flyN = Math.floor(st.t / 3.2); st.fly = { id: 'leo', x: x + 220, y: y + 175, t: st.t + 0.3, retro: false }; }
    ZAD.fly = i === 0 ? st.fly : null;
    signTray(x + 4, 250, y + 26);
  });
};

/* ---------------------------------- the atlas ---------------------------------- */
ZB_STAGE('atlas', 1480, 640, () => ({}));
ZB.draw.atlas = st => {
  ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, W, H);
  ZA_ORDER.forEach((id, i) => {
    const s = zSign(id), el = s.el, x = 10 + (i % 6) * 245, y = 10 + Math.floor(i / 6) * 310, cx = x + 117, cy = y + 120;
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
    g.addColorStop(0, 'rgba(30,27,75,0.55)'); g.addColorStop(1, 'rgba(4,5,11,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, 235, 300);
    zadChart(cx, cy, 98, '#c7d2fe', 0.8, st.t * 0.03);
    zaConst(id, cx, cy, 190, { lineA: 0.55, seed: i });
    const sk = ZA.sky[id];
    // its named star, ringed
    const at = zaStarAt(id, sk.si, cx, cy, 190);
    ctx.strokeStyle = 'rgba(253,230,138,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(at.x, at.y, 9, 0, TAU); ctx.stroke();
    zaGlyph(id, cx - 70, y + 248, 11, ZA_GOLD_HI, { glow: 0.6 });
    zbLabel(s.n, cx - 52, y + 254, '#f1f5f9', 16);
    zbLabel(s.t.toUpperCase() + '  ·  ' + ZA_RULER[id], cx - 52, y + 272, '#64748b', 9.5);
    zaElem(el, cx - 70, y + 286, 4.6, ZA_ELCOL[el], 0.9, 1.2);
    zbLabel(sk.star, cx - 52, y + 290, ZA_ELCOL[el], 9.5);
  });
};

/* ---------------------------------- the plates ----------------------------------
   All twelve, each in front (taken straight, I) and turned (retrograde, II with its
   shadow), at the size the game lays them out on a laptop. */
ZB_STAGE('plates', 1700, 1430, () => ({ p: zbPilot() }));
ZB.draw.plates = st => {
  ctx.fillStyle = '#04050b'; ctx.fillRect(0, 0, W, H);
  P = st.p; P.zs = {};
  const pw = 260, ph = 320, sW = W, sH = H;
  const D = ZAD;
  W = 1280; H = 720;
  try {
    ZA_ORDER.forEach((id, i) => {
      for (const side of [0, 1]) {
        const col = i % 6, row = Math.floor(i / 6) * 2 + side;
        const x = 14 + col * (pw + 18), y = 26 + row * (ph + 30);
        if (col === 0) zbLabel(side ? 'RETROGRADE' : 'IN FRONT', x, y - 9, side ? ZA_SHADE_HI : ZA_GOLD, 11);
        const r = { offers: [{ id, mag: 1 }], retro: !!side, done: false, turns: 0 };
        D.flip[0] = side; D.arr[0] = -99; D.held[0] = 0; D.hov[0] = 0; D.lp[0] = 0; D.done = false;
        zadPlate({ wide: true }, { x, y, w: pw, h: ph, i: 0 }, r.offers[0], r, 0, uiTime);
      }
    });
  } finally { W = sW; H = sH; }
};

/* ---------------------------------- the dome, on a phone ---------------------------------- */
ZB_STAGE('dome-phone', 390, 844, () => {
  const st = { P: zbPilot(), auto: true, k: 0, loop: 1, act: zbDomeAct, click: zbDomeClick, key: zbDomeKey };
  zbDomeOpen(st);
  return st;
});
ZB.draw['dome-phone'] = (st, dt) => ZB.draw.dome(st, dt);
