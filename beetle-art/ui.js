/* ===========================================================================
   EMBER · THE BLUE BEETLE — the screen: HUD, prompts and bursts (BEETLE-PLAN.md)
   What was still the stock orange once the hull, the kills and the kit were
   redrawn: the heat meters, BRAND's aiming view, COMBO 1's key and the bursts
   the kit's effects throw. Every number and every rule is the stock HUD's
   own; only how it looks changes. The adapter reads the game into the plain
   state each of these is handed, so they never read P themselves.

     THE HEAT     the bar is a run of body plates, cold at the empty end and
                  white-hot at the full one, with the fire's head glowing
                  where the heat has got to. The keys are little shells: a
                  sheen across them and the seam's two ends notched in.
     BRAND        the frame's edges go cold; the brackets are mandibles,
                  hooked and toothed; the fuse is a segmented body burning in
                  from both ends.
     COMBO 1      its key is a shell with a pair of antennae, and its
                  countdown runs round the edge in cyan.
     BURSTS       every colour the kit's effects throw, moved along the stock
                  fire ramp onto the beetle's: white-hot stays white, yellow
                  goes ice, orange goes blue, deep orange goes violet, and the
                  smoke cools to a violet grey. Words and numbers go to the
                  lighter end, so they still read.

     btlHudKit(pad, ly, barW, s, t)    screen: OVERDRIVE's heat, clock and Z X C V (drawOdHud)
       s = { heat 0…1, heatN, secs, clock 0…1, keys: [{ k, cost, has, live, burn 0…1 | -1, lit }] }
     btlHudVent(pad, ly, barW, s, t)   screen: the vent, outside OVERDRIVE (the HUD's vent meter)
       s = { heat, fill, venting, ready, lit, burnAt, secs, rate, rateUp, rateHold }
     btlStrikeUiArt(s, W, H, t)        screen: BRAND's aiming view (drawOdStrikeUi)
       s = { aim, inA, left 0…1, hot, secs }
     btlBrandUiArt(s, W, H, t)         screen: COMBO 1's key (drawOdBrandUi)
       s = { key, label, cost, left 0…1 | -1, hot, queued }
     BTL_FX, BTL_FX_TEXT               stock colour → the beetle's, for bursts and for words
=========================================================================== */

const BTL_UI = {
  ink: 'rgba(5,4,20,0.88)', track: 'rgba(99,102,241,0.16)', slate: '#475569', mute: 'rgba(148,163,184,0.9)',
  // the plates' ramp, empty to full: indigo, blue, cyan, ice
  heat: ['#312e81', '#2563eb', '#22d3ee', '#cffafe'],
  dead: ['#334155', '#64748b'],
  sheen: 'rgba(165,243,252,0.11)'
};
// the kit's bursts: the stock fire ramp, step for step onto the beetle's (BTL.fire)
const BTL_FX = {
  '#fff7ed': '#f0fdff', '#fde68a': '#cffafe', '#fde047': '#a5f3fc', '#fbbf24': '#22d3ee',
  '#fdba74': '#38bdf8', '#fb923c': '#3b5bfd', '#f97316': '#6d3cf0', '#ea580c': '#8b2fd6',
  '#c2410c': '#5b21b6', '#9a3412': '#2e1065', '#7c2d12': '#2e1065', '#44403c': '#272040'
};
// and its words and numbers, kept to the light end of it so they read on the floor
const BTL_FX_TEXT = { '#fde047': '#cffafe', '#fdba74': '#7dd3fc', '#fb923c': '#67e8f9', '#f97316': '#a5b4fc' };

const btlUiFont = (w, px, mono) => w + ' ' + px + (mono ? "px 'JetBrains Mono', ui-monospace, monospace" : "px Barlow, 'Segoe UI', system-ui, sans-serif");
// a point on a short ramp of colours
function btlRamp(R, u) {
  const f = clamp(u, 0, 1) * (R.length - 1), i = Math.min(R.length - 2, Math.floor(f));
  return btlMix(R[i], R[i + 1], f - i);
}

/* A bar as a run of body plates: k of it filled, each plate coloured by where
   it sits along the bar (col(u)), the last one only partly. The fire's head
   glows where the fill has got to. */
function btlPlates(x, y, w, h, k, col, head) {
  const n = Math.max(4, Math.round(w / 9.5)), gap = 1, pw = (w - gap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const px = x + i * (pw + gap), f = clamp(k * n - i, 0, 1);
    ctx.fillStyle = BTL_UI.track; roundRect(px, y, pw, h, 1.5); ctx.fill();
    if (f <= 0) continue;
    ctx.fillStyle = col(n > 1 ? i / (n - 1) : 1);
    roundRect(px, y, Math.max(1.5, pw * f), h, 1.5); ctx.fill();
  }
  if (head && k > 0.01) {
    const hx = x + w * k;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(hx, y + h / 2, 7 + head * 3, '#22d3ee', 0.55 * head);
    ctx.restore();
  }
}

/* A key as a little shell: dark, a sheen across it from the light's side,
   its edge, and the seam's two ends notched in top and bottom. */
function btlShell(x, y, w, h, r, edge, lw) {
  ctx.fillStyle = BTL_UI.ink; roundRect(x, y, w, h, r); ctx.fill();
  const g = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
  g.addColorStop(0, BTL_UI.sheen); g.addColorStop(1, 'rgba(165,243,252,0)');
  ctx.fillStyle = g; roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = lw; roundRect(x, y, w, h, r); ctx.stroke();
  const nh = Math.max(2, h * 0.14);
  ctx.fillStyle = edge;
  ctx.fillRect(x + w / 2 - 0.5, y, 1, nh); ctx.fillRect(x + w / 2 - 0.5, y + h - nh, 1, nh);
}

/* ================================ THE HEAT =============================== */
function btlHudKit(pad, ly, barW, s, t) {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = btlUiFont(700, 10);
  ctx.fillStyle = '#a5f3fc';
  ctx.fillText('OVERDRIVE  ' + s.secs.toFixed(1) + 's', pad, ly);

  btlPlates(pad, ly + 8, barW, 5, s.heat, u => btlRamp(BTL_UI.heat, 0.2 + 0.8 * u), 0.6 + 0.4 * Math.sin(t * 5));
  for (const key of s.keys) {
    if (!key.has) continue;
    ctx.fillStyle = key.live ? 'rgba(240,253,255,0.9)' : 'rgba(148,163,184,0.5)';
    ctx.fillRect(Math.round(pad + barW * key.cost / 100), ly + 6, 1, 9);
  }
  ctx.font = btlUiFont(700, 9, true);
  ctx.fillStyle = 'rgba(56,189,248,0.8)';
  ctx.fillText(String(s.heatN), pad + barW + 7, ly + 13);
  // the run's clock: a thread of violet, burning down
  ctx.fillStyle = 'rgba(168,85,247,0.6)';
  ctx.fillRect(pad, ly + 16, barW * s.clock, 1);

  const kw = (barW - 9) / 4, kh = 16, ky = ly + 21;
  ctx.textAlign = 'center';
  s.keys.forEach((key, i) => {
    const x = pad + i * (kw + 3), busy = key.burn >= 0;
    const edge = busy || key.lit ? '#cffafe' : key.live ? '#22d3ee' : key.has ? '#312e81' : '#1e293b';
    btlShell(x, ky, kw, kh, 3, edge, 1.2);
    if (busy) {                                  // Z, spraying: what is left of it, burning down
      ctx.save(); roundRect(x, ky, kw, kh, 3); ctx.clip();
      const g = ctx.createLinearGradient(x, 0, x + kw, 0);
      g.addColorStop(0, 'rgba(34,211,238,0.5)'); g.addColorStop(1, 'rgba(109,40,217,0.45)');
      ctx.fillStyle = g; ctx.fillRect(x, ky, kw * key.burn, kh);
      ctx.fillStyle = 'rgba(240,253,255,' + (0.5 + 0.4 * Math.sin(t * 30)) + ')';
      ctx.fillRect(x + kw * key.burn - 1, ky, 1.5, kh);
      ctx.restore();
    }
    if (key.lit) {                               // V, while KHEPRI holds its sun: a sun in the key
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(x + kw / 2, ky + kh / 2, kh * (0.8 + 0.1 * Math.sin(t * 6)), '#22d3ee', 0.55);
      ctx.restore();
    }
    ctx.font = btlUiFont(700, 9, true); ctx.textBaseline = 'middle';
    ctx.fillStyle = busy || key.lit ? '#f0fdff' : key.live ? '#a5f3fc' : key.has ? '#4338ca' : '#334155';
    ctx.fillText(key.k, x + kw / 2, ky + kh / 2 + 0.5);
    if (key.has) {
      ctx.font = btlUiFont(700, 7, true); ctx.textBaseline = 'top';
      ctx.fillStyle = key.live ? 'rgba(165,243,252,0.75)' : '#312e81';
      ctx.fillText(String(key.cost), x + kw / 2, ky + kh + 3);
    }
  });
  ctx.restore();
}

function btlHudVent(pad, ly, barW, s, t) {
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = btlUiFont(700, 10);
  ctx.fillStyle = s.venting ? '#cffafe' : s.ready ? '#22d3ee' : s.lit ? '#3b82f6' : BTL_UI.slate;
  ctx.fillText(s.venting ? 'OVERDRIVE  ' + s.secs.toFixed(1) + 's' : '[F] VENT', pad, ly);

  /* Below the burn the heat is only a number, and the plates stay slate; once
     it is lit they take the ramp, hotter towards the full end. */
  const col = s.venting ? () => '#cffafe'
            : s.heat < s.burnAt ? u => btlRamp(BTL_UI.dead, u)
            : u => btlRamp(BTL_UI.heat, 0.25 + 0.75 * u);
  ctx.save();
  if (s.ready && !s.venting) ctx.globalAlpha = 0.65 + Math.sin(t * 6) * 0.35;
  btlPlates(pad, ly + 8, barW, 5, s.fill, col, s.lit || s.venting ? (s.ready ? 1 : 0.6) : 0);
  ctx.restore();
  if (!s.venting) {                              // where the burn lights
    ctx.fillStyle = s.lit ? 'rgba(165,243,252,0.9)' : 'rgba(148,163,184,0.5)';
    ctx.fillRect(Math.round(pad + barW * s.burnAt), ly + 6, 1, 9);
  }
  if (s.rate) {
    ctx.font = btlUiFont(700, 9);
    ctx.fillStyle = s.rateUp ? 'rgba(56,189,248,0.8)' : s.rateHold ? 'rgba(148,163,184,0.5)' : 'rgba(100,116,139,0.7)';
    ctx.fillText(s.rate, pad + barW + 7, ly + 12);
  }
  ctx.restore();
}

/* ================================== BRAND ================================ */
function btlStrikeUiArt(s, W, H, t) {
  const { aim, inA, left, hot } = s;
  ctx.save();
  // the edges of the frame go cold, so the view reads as the beetle's own
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(14,8,52,' + 0.5 * inA + ')');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // the brackets: a mandible at each corner, hooked at both tips and toothed along the arm
  const m = 14 + (1 - inA) * 30, L = 34;
  ctx.globalAlpha = (aim ? 0.85 : 0.45) * inA;
  ctx.strokeStyle = hot && Math.sin(t * 20) > 0 ? '#f0fdff' : '#22d3ee';
  ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x + sx * 6, y + sy * (L - 5)); ctx.lineTo(x, y + sy * L);
    ctx.lineTo(x, y + sy * 9); ctx.quadraticCurveTo(x, y, x + sx * 9, y);
    ctx.lineTo(x + sx * L, y); ctx.lineTo(x + sx * (L - 5), y + sy * 6);
    ctx.moveTo(x + sx * L * 0.55, y); ctx.lineTo(x + sx * (L * 0.55 - 3), y + sy * 4);
    ctx.moveTo(x, y + sy * L * 0.55); ctx.lineTo(x + sx * 4, y + sy * (L * 0.55 - 3));
  }
  ctx.stroke();
  if (aim) {
    ctx.globalAlpha = inA;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = btlUiFont(700, 11, true);
    ctx.fillStyle = 'rgba(125,211,252,0.8)';
    ctx.fillText('B R A N D', W / 2, 34);
    ctx.font = btlUiFont(700, 18);
    ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#cffafe';
    ctx.fillText('MARK THE SPOT', W / 2, 56);
    ctx.shadowBlur = 0;
    // the fuse: a segmented body, burning in from both ends
    const fw = 220, fx = W / 2 - fw / 2, fy = 68, rem = fw * left;
    ctx.fillStyle = 'rgba(148,163,184,0.2)'; ctx.fillRect(fx, fy, fw, 2);
    const fg = ctx.createLinearGradient(fx, 0, fx + fw, 0);
    fg.addColorStop(0, '#6d28d9'); fg.addColorStop(0.5, '#22d3ee'); fg.addColorStop(1, '#6d28d9');
    ctx.fillStyle = fg; ctx.fillRect(W / 2 - rem / 2, fy - 1, rem, 4);
    ctx.fillStyle = 'rgba(5,4,20,0.85)';
    for (let x = fx + 7; x < fx + fw; x += 7) ctx.fillRect(Math.round(x), fy - 1, 1, 4);
    ctx.globalCompositeOperation = 'lighter';
    if (rem > 1) for (const sx of [-1, 1]) drawGlow(W / 2 + sx * rem / 2, fy + 1, 9 + Math.sin(t * 40 + sx) * 2, '#cffafe', 0.9 * inA);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = inA;
    ctx.font = btlUiFont(700, 10, true);
    ctx.fillStyle = hot ? '#67e8f9' : BTL_UI.mute;
    ctx.fillText(s.secs.toFixed(1) + 's   ·   CLICK OR C', W / 2, 90);
  }
  ctx.restore();
}

/* ================================= COMBO 1 =============================== */
function btlBrandUiArt(s, W, H, t) {
  const S = 38, cx = W / 2 - 70, cy = H - 84;
  ctx.save();
  // its antennae, feeling the air
  ctx.strokeStyle = 'rgba(56,189,248,0.6)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const sway = Math.sin(t * 3 + sx) * 2;
    ctx.beginPath();
    ctx.moveTo(cx + sx * 6, cy - S / 2);
    ctx.quadraticCurveTo(cx + sx * 9, cy - S / 2 - 8, cx + sx * 17 + sway, cy - S / 2 - 11);
    ctx.stroke();
  }
  btlShell(cx - S / 2, cy - S / 2, S, S, 6, 'rgba(49,46,129,0.95)', 1.5);
  // the countdown, round its edge
  if (s.left >= 0) {
    const per = S * 4, run = per * clamp(s.left, 0, 1);
    ctx.strokeStyle = s.hot && Math.sin(t * 22) > 0 ? '#f0fdff' : '#22d3ee'; ctx.lineWidth = 2.5;
    ctx.setLineDash([run, per]); ctx.lineDashOffset = 0;
    roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
    ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = btlUiFont(700, 18, true);
  ctx.fillStyle = '#cffafe'; ctx.fillText(s.key, cx, cy + 1);
  // what it does
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = btlUiFont(700, 17);
  ctx.fillStyle = '#a5f3fc'; ctx.fillText(s.label, cx + S / 2 + 12, cy + 1);
  ctx.font = btlUiFont(700, 10, true);
  ctx.fillStyle = 'rgba(125,211,252,0.8)'; ctx.fillText(s.cost + ' HEAT', cx + S / 2 + 12, cy + 15);
  if (s.queued) { ctx.fillStyle = BTL_UI.mute; ctx.fillText('Z IN', cx + S / 2 + 12, cy - 16); }
  ctx.restore();
}
