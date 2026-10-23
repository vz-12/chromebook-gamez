/* ===========================================================================
   THE BLUE BEETLE — the board's screen (beetle-art/README.md)
   The heat meters, BRAND's view, COMBO 1's key and the bursts, drawn by the
   same calls a run makes (ui.js) on made-up state, looping through every
   state they have. The bursts are drawn twice, the stock colour above the
   beetle's, so the move along the ramp can be seen.
=========================================================================== */
const ubMono = (px, w = 600) => `${w} ${px}px 'JetBrains Mono', ui-monospace, monospace`;
function ubLabel(text, x, y) {
  ctx.font = ubMono(8); ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

/* THE HEAT: the vent heating from cold to ready, and OVERDRIVE spending it */
function ubHudDraw(st) {
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.fillStyle = '#060515'; ctx.fillRect(0, 0, st.w, st.h);
  const z = clamp(Math.min(st.w / 300, st.h / 104), 1, 3.4);
  ctx.setTransform(st.dpr * z, 0, 0, st.dpr * z, (st.w - 300 * z) / 2 * st.dpr, (st.h - 104 * z) / 2 * st.dpr);
  const t = st.t;
  // outside OVERDRIVE: 7 s of heating, slate below the burn and lit above it, then ready
  const T = t % 10, heat = Math.min(1, T / 7), ready = heat >= 0.999;
  ubLabel('THE VENT', 16, 18);
  btlHudVent(16, 38, 76, { heat, fill: heat, venting: false, ready, lit: heat >= VENT_BURN_AT, burnAt: VENT_BURN_AT, secs: 0,
                          rate: ready ? '' : '+' + (3 + heat * 10).toFixed(1) + '/s', rateUp: true, rateHold: false }, t);
  // in OVERDRIVE: the heat climbs, Z is spent and sprays, it climbs again, and V takes all of it
  const U = t % 12, costs = [SCORCH_COST, PYRO_COST, STRIKE_COST, FUSION_COST];
  const kHeat = U < 4 ? 20 + U * 20 : U < 6.5 ? 70 + (U - 4) * 8 : U < 8 ? 90 + (U - 6.5) * 6.7 : 0;
  const burn = U >= 4 && U < 6.5 ? 1 - (U - 4) / 2.5 : -1, lit = U >= 8;
  ubLabel('IN OVERDRIVE', 170, 18);
  btlHudKit(170, 38, 76, {
    heat: clamp(kHeat / 100, 0, 1), heatN: Math.floor(kHeat), secs: 60 - U * 2.5, clock: (60 - U * 2.5) / 60,
    keys: costs.map((cost, i) => ({ k: 'ZXCV'[i], cost, has: true, live: kHeat >= cost, burn: i === 0 ? burn : -1, lit: i === 3 && lit }))
  }, t);
}

/* BRAND and COMBO 1: aiming against the fuse, then the keys to press, each in turn */
function ubPromptDraw(st) {
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  const g = ctx.createRadialGradient(st.w / 2, st.h / 2, 0, st.w / 2, st.h / 2, Math.max(st.w, st.h) * 0.7);
  g.addColorStop(0, '#0b0a1f'); g.addColorStop(1, '#030209');
  ctx.fillStyle = g; ctx.fillRect(0, 0, st.w, st.h);
  const W = st.w, H = st.h, t = st.t, T = t % 9;
  // the mark, where the cursor is, while it aims
  if (T < 4) {
    const mx = W / 2 + Math.sin(t * 0.9) * W * 0.12, my = H * 0.56 + Math.cos(t * 1.3) * H * 0.06;
    ctx.strokeStyle = 'rgba(244,114,182,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, 9, 0, TAU); ctx.moveTo(mx - 14, my); ctx.lineTo(mx + 14, my); ctx.moveTo(mx, my - 14); ctx.lineTo(mx, my + 14); ctx.stroke();
  }
  if (T < 4) {
    const left = 1 - T / 4;
    btlStrikeUiArt({ aim: true, inA: 1 - Math.pow(1 - clamp(T / 0.3, 0, 1), 3), left, hot: left < 0.3, secs: STRIKE_AIM_MAX * left }, W, H, t);
  } else if (T < 8) {
    btlStrikeUiArt({ aim: false, inA: 1, left: 0, hot: false, secs: 0 }, W, H, t);
    if (T < 5.6) btlBrandUiArt({ key: 'Z', label: 'CIRCLE IT', cost: String(SCORCH_COST), left: T < 4.6 ? -1 : 1 - (T - 4.6), hot: T > 5.25, queued: false }, W, H, t);
    else btlBrandUiArt({ key: 'X', label: 'BURN IT ALL', cost: 'ALL 64', left: T < 6.4 ? -1 : 1 - (T - 6.4) / 1.6, hot: T > 7.45, queued: T < 6.4 }, W, H, t);
  }
}

/* THE BURSTS: each stock colour the kit throws, and where it lands on the beetle's ramp */
const UB_PAIRS = ['#fff7ed', '#fde047', '#fdba74', '#fb923c', '#f97316', '#ea580c', '#44403c'];
function ubBurst(x, y, col, t, seed, R) {
  const k = (t % 1.6) / 1.6, n = 16;
  for (let i = 0; i < n; i++) {
    const h = Math.sin(seed * 91.7 + i * 12.9) * 43758.5, f = h - Math.floor(h);
    const a = i / n * TAU + f, d = R * (0.35 + 0.65 * f) * (1 - Math.pow(1 - k, 3));
    const r = (1.2 + 1.8 * f) * (1 - k * 0.6), al = (1 - k) * (1 - k);
    drawGlow(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 4, col, 0.5 * al);
    ctx.globalAlpha = al; ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function ubBurstsDraw(st) {
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.fillStyle = '#060515'; ctx.fillRect(0, 0, st.w, st.h);
  const n = UB_PAIRS.length, cw = st.w / n, R = Math.min(cw * 0.38, st.h * 0.16), y1 = st.h * 0.3, y2 = st.h * 0.72;
  ctx.globalCompositeOperation = 'lighter';
  UB_PAIRS.forEach((c, i) => {
    const x = cw * (i + 0.5);
    ubBurst(x, y1, c, st.t + i * 0.23, i, R);
    ubBurst(x, y2, BTL_FX[c], st.t + i * 0.23, i, R);
  });
  ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center'; ctx.font = ubMono(9, 500);
  UB_PAIRS.forEach((c, i) => {
    const x = cw * (i + 0.5);
    ctx.fillStyle = 'rgba(148,163,184,0.75)';
    ctx.fillText(c, x, y1 + R + 16); ctx.fillText(BTL_FX[c], x, y2 + R + 16);
    ctx.fillStyle = 'rgba(148,163,184,0.4)'; ctx.fillText('↓', x, (y1 + y2) / 2 + 4);
  });
  ctx.textAlign = 'left'; ctx.font = ubMono(9);
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.fillText('STOCK', 10, 16); ctx.fillText('KHEPRI', 10, st.h / 2 + 14);
}

function boardBuildUi() {
  const $ = id => document.getElementById(id);
  const tick = (st, dt) => { st.t += dt; };
  boardStage($('u-hud'), { t: 0, step: tick, draw: ubHudDraw });
  boardStage($('u-prompt'), { t: 0, step: tick, draw: ubPromptDraw });
  boardStage($('u-bursts'), { t: 0, step: tick, draw: ubBurstsDraw });
}
boardBuildUi();
