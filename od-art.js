/* ===================== OVERDRIVE'S KIT — art hooks ========================
   EMBER · Z — SCORCHED EARTH — art
   Drop-in for index.html: replaces the placeholder block from "OVERDRIVE'S
   KIT — art hooks" down to "end of OVERDRIVE'S KIT art hooks", whole.

   The idea: the helix lance, overdriven. The two strands that wind the
   ordinary OVERDRIVE lance are thrown wide to the edge of what burns, and the
   space between them fills in solid — a white-hot column with the helix still
   turning round it, rippling hitbox edges, and bands of charge running out
   along it. Where it lies the plating is ploughed: a dark trench with a lit
   lip, and molten seams in the bottom that cool white → gold → orange → red →
   char. Held still it is one gouge; swept, the stamps run together into one
   furrowed swath, the seams reading as plough lines.

   What the art is handed:

   P.odScorch — Z, SCORCHED EARTH, while the beam is out (null otherwise)
     t, k, ang, x1,y1,x2,y2, len, half, cut, scar   (see the logic above)

   odScars — every score on the floor, oldest first (at most OD_SCARS_MAX)
     stamps [{ x1, y1, x2, y2, at, k }], t, life, half, live, ang, seed

   Called from:
     drawOdScars()          world, floor layer (source-over)
     drawOdScorch()         world, additive layer, straight after drawLance()
     drawOdKitScreen()      screen space
     drawOdHud(pad, ly, bw) the HUD, in place of the vent meter; returns the
                            next free line
     odScorchFx(sc) / odScorchHitFx(e, sc) / odScorchEndFx(sc) / odScarHitFx(e, s)
=========================================================================== */

const OD_HEAT_RAMP = ['#fff7ed', '#fde047', '#f97316', '#b91c1c', '#450a0a'];
let odScorchLitAt = -99;                 // uiTime Z lit, for the screen flash
let odScorchEndAt = -99;

function odHash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function odEaseOut(t) { return 1 - Math.pow(1 - t, 3); }
function odMixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const m = sh => Math.round(lerp((a >> sh) & 255, (b >> sh) & 255, t));
  return '#' + ((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1);
}
// 1 white-hot … 0 char
function odHeatCol(h) {
  const x = (1 - clamp(h, 0, 1)) * (OD_HEAT_RAMP.length - 1);
  const i = Math.min(OD_HEAT_RAMP.length - 2, Math.floor(x));
  return odMixHex(OD_HEAT_RAMP[i], OD_HEAT_RAMP[i + 1], x - i);
}
const odParts = () => typeof FXO === 'undefined' || FXO.parts;

/* ------------------------------- the scores -------------------------------
   Every stamp of a score goes into ONE path per layer, so where stamps
   overlap the swath stays one even surface instead of stacking up alpha. */
function drawOdScars() {
  if (!odScars.length) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of odScars) {
    if (!s.stamps.length) continue;
    const fade = clamp((s.life - s.t) / 1.6, 0, 1);
    if (fade <= 0.005) continue;
    const w = s.half * 2 / SCAR_HALF * 0.78;       // the dent is a little wider than what it bites
    const path = (dx, dy) => {
      ctx.beginPath();
      for (const st of s.stamps) {
        const q = Math.max(0.45, st.k);
        const mx = (st.x1 + st.x2) / 2, my = (st.y1 + st.y2) / 2;
        // a stamp laid while the beam swelled is shorter at its ends, not thinner
        ctx.moveTo(lerp(mx, st.x1, q) + dx, lerp(my, st.y1, q) + dy);
        ctx.lineTo(lerp(mx, st.x2, q) + dx, lerp(my, st.y2, q) + dy);
      }
    };
    const layer = (dx, dy, lw, col, a) => {
      path(dx, dy); ctx.globalAlpha = a * fade; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    };
    ctx.globalCompositeOperation = 'source-over';
    layer(0, 0, w * 2.1, '#0a0503', 0.28);                  // the scorch round it
    layer(0, 0, w * 1.55, '#0a0503', 0.3);
    layer(0, -w * 0.09, w * 1.12, '#a8a29e', 0.16);         // the lip, catching the light
    layer(0, w * 0.07, w * 1.08, '#000000', 0.45);          // the lip's shadow below
    layer(0, 0, w, '#170906', 0.9);                         // the trench
    layer(0, w * 0.06, w * 0.62, '#050202', 0.85);          // its floor, deeper

    // the heat left in it: one soft glow over the whole score (one path, so it
    // never stacks), then a thin seam per stamp — a swath ploughed in lines
    ctx.globalCompositeOperation = 'lighter';
    {
      const newest = s.stamps[s.stamps.length - 1];
      const hN = clamp(1 - (s.t - newest.at) / (s.life * 0.8), 0, 1);
      layer(0, w * 0.03, w * 0.55, odHeatCol(0.35 + hN * 0.3), (0.05 + 0.12 * hN));
    }
    for (let i = 0; i < s.stamps.length; i++) {
      const st = s.stamps[i];
      const age = s.t - st.at;
      const heat = clamp(1 - age / (s.life * 0.8), 0, 1) * (age < 0.25 ? 1 : 0.8);   // only the freshest is white
      const col = odHeatCol(heat * 0.95);
      const flick = 0.85 + 0.15 * Math.sin(uiTime * 9 + i * 1.7 + s.seed);
      const q = Math.max(0.45, st.k);
      const mx = (st.x1 + st.x2) / 2, my = (st.y1 + st.y2) / 2;
      const ax = lerp(mx, st.x1, q), ay = lerp(my, st.y1, q), bx = lerp(mx, st.x2, q), by = lerp(my, st.y2, q);
      ctx.strokeStyle = col;
      ctx.globalAlpha = (0.12 + 0.2 * heat) * fade * flick;
      ctx.lineWidth = 1.5 + 2.5 * heat;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.globalAlpha = (0.18 + 0.4 * heat) * fade * flick;
      ctx.lineWidth = 1 + 1 * heat;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

      // cracks run out of the seam, hottest first to go dark
      if (heat > 0.05) {
        const L = len(bx - ax, by - ay); if (L < 4) continue;
        const ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
        const nC = Math.min(6, 1 + Math.floor(L / 90));
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = odHeatCol(heat * 0.8);
        ctx.globalAlpha = 0.75 * heat * fade;
        ctx.beginPath();
        for (let c = 0; c < nC; c++) {
          const hs = s.seed + i * 13.7 + c * 5.3;
          const d = L * (0.08 + odHash(hs) * 0.84), sd = odHash(hs + 1) < 0.5 ? -1 : 1;
          let px = ax + ux * d, py = ay + uy * d;
          ctx.moveTo(px, py);
          const cl = w * (0.3 + odHash(hs + 2) * 0.35);
          for (let j = 1; j <= 3; j++) {
            const jit = (odHash(hs + j * 3.1) - 0.5) * cl * 0.7;
            px = ax + ux * (d + jit) + nx * sd * cl * j / 3;
            py = ay + uy * (d + jit) + ny * sd * cl * j / 3;
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
      }
      // it smokes while it is still hot
      if (odParts() && heat > 0.15 && Math.random() < 0.02 * heat) {
        const u = Math.random();
        spawnPart(lerp(ax, bx, u), lerp(ay, by, u), rnd(12, -12), rnd(-30, -70), rnd(2, 1),
                  Math.random() < 0.5 ? '#fde047' : '#fb923c', rnd(0.7, 0.35), 0.93);
      }
    }
  }
  ctx.restore();
}

/* -------------------------------- the beam -------------------------------- */
function drawOdScorch() {
  const sc = P.odScorch;
  if (!sc || sc.k <= 0.01) return;
  const hw = Math.max(sc.half, 1), k = sc.k, t = sc.t;
  const dx = sc.x2 - sc.x1, dy = sc.y2 - sc.y1, L = Math.max(1, len(dx, dy));
  const ca = dx / L, sa = dy / L, nx = -sa, ny = ca;
  const flick = 0.92 + 0.08 * Math.sin(uiTime * 47);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (lw, col, a) => {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(sc.x1, sc.y1); ctx.lineTo(sc.x2, sc.y2); ctx.stroke();
  };
  // sheath → body → inner → core; the body is exactly what burns
  line(hw * 3.6, '#7f1d1d', 0.22 * k);
  line(hw * 2.6, '#b91c1c', 0.22 * k);
  line(hw * 2.0, '#f97316', 0.5 * k * flick);
  line(hw * 1.3, '#fdba74', 0.55 * k * flick);
  line(Math.max(3, hw * 0.55), '#fff7ed', 0.95 * k);

  // bands of charge running out along it
  ctx.setLineDash([hw * 0.35, hw * 1.6]); ctx.lineDashOffset = -uiTime * 900;
  ctx.lineCap = 'butt';
  line(hw * 1.7, '#fde047', 0.28 * k);
  ctx.setLineDash([]); ctx.lineCap = 'round';

  // the edges of what burns, rippling
  ctx.lineWidth = 1.6;
  for (const side of [-1, 1]) {
    ctx.globalAlpha = 0.6 * k; ctx.strokeStyle = '#fb923c';
    ctx.beginPath();
    const N = Math.max(12, Math.floor(L / 12));
    for (let i = 0; i <= N; i++) {
      const d = L * i / N;
      const off = side * (hw + Math.sin(d * 0.09 - uiTime * 26 + side) * 2.2 * k);
      const x = sc.x1 + ca * d + nx * off, y = sc.y1 + sa * d + ny * off;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  // the helix, thrown wide: the ordinary lance's strands, winding the column
  const STEPS = clamp(Math.floor(L / 9), 30, 150), TURNS = L / 120, AMP = hw * 0.92;
  const pt = (s, j) => {
    const u = s / STEPS, ph = u * TURNS * TAU - uiTime * 9 + j * Math.PI;
    const taper = Math.min(1, u * L / 40);
    return [sc.x1 + ca * u * L + nx * Math.sin(ph) * AMP * taper,
            sc.y1 + sa * u * L + ny * Math.sin(ph) * AMP * taper, Math.cos(ph)];
  };
  for (const front of [false, true]) {
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      let prev = pt(0, j);
      for (let s = 1; s <= STEPS; s++) {
        const p = pt(s, j);
        if ((p[2] + prev[2] > 0) === front) { ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); }
        prev = p;
      }
      if (front) {
        ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4.2; ctx.stroke();
        ctx.globalAlpha = 0.95 * k; ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = 1.6; ctx.stroke();
      } else {
        ctx.globalAlpha = 0.45 * k; ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 2.6; ctx.stroke();
      }
    }
  }
  ctx.restore();

  // the muzzle, and the swell's shock ring
  drawGlow(sc.x1, sc.y1, hw * 3.2, '#f97316', 0.6 * k);
  drawGlow(sc.x1, sc.y1, hw * 1.4, '#fff7ed', 0.5 * k);
  const sw = clamp(t / 0.35, 0, 1);
  if (sw < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - sw) * 0.8; ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 3 * (1 - sw) + 0.5;
    ctx.beginPath(); ctx.arc(sc.x1, sc.y1, hw * (1 + odEaseOut(sw) * 4), 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // where it lands: molten, a turning star on the plating
  const ex = sc.x2, ey = sc.y2;
  if (sc.cut) {
    drawGlow(ex, ey, hw * 2.4, '#bae6fd', 0.55 * k);
    drawGlow(ex, ey, hw * 1.2, '#f8fafc', 0.5 * k);
  } else {
    drawGlow(ex, ey, hw * (3.4 + Math.sin(uiTime * 22) * 0.3), '#fb923c', 0.7 * k);
    drawGlow(ex, ey, hw * 1.6, '#fde047', 0.6 * k);
  }
  ctx.save();
  ctx.globalAlpha = 0.9 * k; ctx.fillStyle = sc.cut ? '#f8fafc' : '#fff7ed';
  ctx.translate(ex, ey); ctx.rotate(sc.ang + uiTime * 4);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = i * TAU / 16, r = i % 2 ? hw * 0.35 : hw * (i % 4 ? 0.9 : 1.35);
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();

  if (odParts()) {
    // spray off the impact, thrown back and wide
    if (Math.random() < 0.9 * k) {
      const sd = Math.random() < 0.5 ? -1 : 1, v = rnd(260, 90);
      spawnPart(ex + rnd(6, -6), ey + rnd(6, -6), -ca * v * 0.6 + nx * sd * v, -sa * v * 0.6 + ny * sd * v,
                rnd(3, 1.4), sc.cut ? '#bae6fd' : Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.5, 0.2), 0.9);
    }
    // the plating kicked up along its edges as it gouges
    for (let i = 0; i < 2; i++) {
      if (Math.random() > 0.8 * k) continue;
      const d = Math.random() * L, sd = Math.random() < 0.5 ? -1 : 1, v = rnd(160, 60);
      spawnPart(sc.x1 + ca * d + nx * sd * hw, sc.y1 + sa * d + ny * sd * hw,
                nx * sd * v + ca * rnd(40, -40), ny * sd * v + sa * rnd(40, -40),
                rnd(2.2, 1), Math.random() < 0.3 ? '#fff7ed' : '#fb923c', rnd(0.35, 0.15), 0.88);
    }
  }
}

/* the frame goes white-orange for a beat as it lights, and dims as it closes */
function drawOdKitScreen() {
  const a = 1 - (uiTime - odScorchLitAt) / 0.35;
  const b = 1 - (uiTime - odScorchEndAt) / 0.4;
  if (a <= 0 && b <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (a > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(255,237,213,' + 0.14 * a * a + ')');
    g.addColorStop(1, 'rgba(249,115,22,' + 0.28 * a * a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (b > 0) {
    ctx.fillStyle = 'rgba(185,28,28,' + 0.08 * b * b + ')';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/* OVERDRIVE's HUD: the heat there is to spend, a tick at each price, the clock
   as a hairline, and Z X C V with their costs. Z burns down while it is out. */
function drawOdHud(pad, ly, bw) {
  const k = clamp(P.vent / VENT_MAX, 0, 1), barW = Math.min(76, bw - 6);
  ctx.save();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = "700 10px Barlow, 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#fde047';
  ctx.fillText('OVERDRIVE  ' + P.ventT.toFixed(1) + 's', pad, ly);

  ctx.fillStyle = 'rgba(148,163,184,0.18)';
  roundRect(pad, ly + 8, barW, 5, 3); ctx.fill();
  if (k > 0.001) {
    ctx.fillStyle = amalMix('#f97316', '#fde047', k);
    roundRect(pad, ly + 8, Math.max(3, barW * k), 5, 3); ctx.fill();
  }
  for (const a of OD_KIT) {
    if (!a) continue;
    ctx.fillStyle = P.vent >= a.cost ? 'rgba(254,252,232,0.9)' : 'rgba(148,163,184,0.5)';
    ctx.fillRect(Math.round(pad + barW * a.cost / VENT_MAX), ly + 6, 1, 9);
  }
  ctx.font = "700 9px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = 'rgba(251,146,60,0.75)';
  ctx.fillText(String(Math.floor(P.vent)), pad + barW + 7, ly + 13);
  ctx.fillStyle = 'rgba(253,224,71,0.55)';
  ctx.fillRect(pad, ly + 16, barW * clamp(P.ventT / (P.ventLen || OD_RUN_LEN), 0, 1), 1);

  const kw = (barW - 9) / 4, kh = 16, ky = ly + 21;
  ctx.textAlign = 'center';
  for (let i = 0; i < 4; i++) {
    const a = OD_KIT[i], x = pad + i * (kw + 3);
    const busy = i === 0 && P.odScorch, live = !!a && P.vent >= a.cost;
    ctx.fillStyle = 'rgba(12,6,4,0.85)';
    roundRect(x, ky, kw, kh, 3); ctx.fill();
    if (busy) {
      const left = 1 - P.odScorch.t / SCORCH_T;
      ctx.save(); roundRect(x, ky, kw, kh, 3); ctx.clip();
      const g = ctx.createLinearGradient(x, 0, x + kw, 0);
      g.addColorStop(0, 'rgba(249,115,22,0.55)'); g.addColorStop(1, 'rgba(253,224,71,0.45)');
      ctx.fillStyle = g; ctx.fillRect(x, ky, kw * left, kh);
      ctx.fillStyle = 'rgba(255,247,237,' + (0.5 + 0.4 * Math.sin(uiTime * 30)) + ')';
      ctx.fillRect(x + kw * left - 1, ky, 1.5, kh);            // the burning edge
      ctx.restore();
    }
    ctx.strokeStyle = busy ? '#fde047' : live ? '#fb923c' : a ? '#7c2d12' : '#1e293b';
    ctx.lineWidth = 1.2; roundRect(x, ky, kw, kh, 3); ctx.stroke();
    ctx.font = "700 9px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'middle';
    ctx.fillStyle = busy ? '#fff7ed' : live ? '#fde047' : a ? '#9a3412' : '#334155';
    ctx.fillText(SU_KEYS[i].toUpperCase(), x + kw / 2, ky + kh / 2 + 0.5);
    if (a) {
      ctx.font = "700 7px 'JetBrains Mono', ui-monospace, monospace"; ctx.textBaseline = 'top';
      ctx.fillStyle = live ? 'rgba(253,224,71,0.75)' : '#7c2d12';
      ctx.fillText(String(a.cost), x + kw / 2, ky + kh + 3);
    }
  }
  ctx.restore();
  return ly + 54;
}

/* --------------------------------- effects -------------------------------- */
function odScorchFx(sc) {
  odScorchLitAt = uiTime;
  shake(0.6);
  Audio_.tone(90, 0.6, 'sawtooth', 0.1, 45);
  Audio_.tone(520, 0.25, 'square', 0.04, 180);
  const ca = Math.cos(sc.ang), sa = Math.sin(sc.ang);
  const mx = P.x + ca * 20, my = P.y + sa * 20;
  burst(mx, my, 18, '#fdba74', 320, 3, 0.4, 0.9, sc.ang);           // out down the line
  burst(P.x - ca * 14, P.y - sa * 14, 10, '#f97316', 200, 2.6, 0.35, 1.4, sc.ang + Math.PI);   // the kick
  burst(mx, my, 6, '#fff7ed', 140, 3.4, 0.25);
}

function odScorchHitFx(e, sc) {
  burst(e.x, e.y, 5, '#fdba74', 220, 2.6, 0.3, 1.3, sc.ang);
  if (Math.random() < 0.5) burst(e.x, e.y, 2, '#fff7ed', 120, 3, 0.2);
}

function odScorchEndFx(sc) {
  odScorchEndAt = uiTime;
  burst(sc.x2, sc.y2, 10, '#fb923c', 180, 2.8, 0.45);
  Audio_.tone(200, 0.3, 'sine', 0.05, 70);
  if (!odParts()) return;
  // it goes out in smoke, all down its length
  const dx = sc.x2 - sc.x1, dy = sc.y2 - sc.y1;
  for (let i = 0; i < 14; i++) {
    const u = Math.random();
    spawnPart(sc.x1 + dx * u + rnd(8, -8), sc.y1 + dy * u + rnd(8, -8), rnd(20, -20), rnd(-20, -60),
              rnd(5, 2.5), '#44403c', rnd(0.9, 0.5), 0.95, false);
  }
}

function odScarHitFx(e, s) {
  const n = Math.random() < 0.5 ? 2 : 1;
  for (let i = 0; i < n; i++)
    spawnPart(e.x + rnd(e.r, -e.r), e.y + rnd(e.r * 0.5, -e.r * 0.2), rnd(24, -24), rnd(-40, -110),
              rnd(2.4, 1.1), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.6, 0.3), 0.92);
}

/* ------------------------- X — PYROTECHNICS — art --------------------------
   The idea: the ground is primed, then it goes up. For the second the circle
   counts down, the plating inside it heats — cracks run out from the centre
   toward the edge, glowing hotter, the ring's countdown arc burns away and
   four chevrons close in, pulsing faster. At zero the cracks reach the rim,
   the floor flashes and a column of fire stands up out of it: a white-hot
   base, flame tongues climbing, a ring of fire round its foot. Over the 1.2 s
   of aftermath the column lets go of the ground and rises away as licks and
   embers, leaving a ragged burnt crater with the cracks cooling in it.

   What it is handed:

   odPyros — every circle down and every column up, oldest first
     x, y     the circle's centre, where the cursor was when X was pressed
     r        its radius (PYRO_R). Everything within r of the centre, plus
              its own radius, is what the column hits.
     t        seconds since X
                0 … PYRO_DELAY                      the circle, counting down
                PYRO_DELAY … PYRO_DELAY + PYRO_AFTER the column, then the floor
                                                     cooling (no more damage)
     up       false while it is a circle, true from the moment it rises
     hit      how many bodies the column caught (set as it rises)
     seed

   Called from:
     drawOdPyroMarks()   world, floor layer: after drawOdScars (source-over)
     drawOdPyros()       world, additive layer: after drawOdScorch
     odPyroCastFx(p)     X pressed: the circle is laid
     odPyroEruptFx(p)    the column rises (before the damage lands)
     odPyroHitFx(e, p)   once per body the column catches
--------------------------------------------------------------------------- */

// the cracks: same for a given circle from the countdown into the crater
function odPyroCracks(p, reach, dark, col, a) {
  const N = 9;
  for (const pass of dark ? [0, 1] : [1]) {
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const hs = p.seed + i * 17.3;
      const a0 = (i / N) * TAU + (odHash(hs) - 0.5) * 0.6;
      const L = p.r * (0.75 + odHash(hs + 1) * 0.3) * reach;
      if (L < 2) continue;
      ctx.moveTo(p.x, p.y);
      for (let s = 1; s <= 5; s++) {
        const d = L * s / 5, j = (odHash(hs + s * 2.7) - 0.5) * 0.42;
        ctx.lineTo(p.x + Math.cos(a0 + j) * d, p.y + Math.sin(a0 + j) * d);
      }
      if (reach > 0.55) {                                   // a fork off the outer half
        const fs = 3 + Math.floor(odHash(hs + 9) * 2), fd = L * fs / 5;
        const j = (odHash(hs + fs * 2.7) - 0.5) * 0.42;
        const fx = p.x + Math.cos(a0 + j) * fd, fy = p.y + Math.sin(a0 + j) * fd;
        const fa = a0 + (odHash(hs + 11) < 0.5 ? -0.6 : 0.6), fl = p.r * 0.22 * (reach - 0.55) / 0.45;
        ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(fa) * fl, fy + Math.sin(fa) * fl);
      }
    }
    if (pass === 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.7 * a; ctx.strokeStyle = '#050202'; ctx.lineWidth = 4; ctx.stroke();
    } else {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}

// a ragged disc, for the crater
function odPyroBlot(p, rad) {
  ctx.beginPath();
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU, q = rad * (0.9 + odHash(p.seed + (i % N) * 3.3) * 0.18);
    i ? ctx.lineTo(p.x + Math.cos(a) * q, p.y + Math.sin(a) * q) : ctx.moveTo(p.x + Math.cos(a) * q, p.y + Math.sin(a) * q);
  }
  ctx.closePath();
}

function drawOdPyroMarks() {
  if (!odPyros.length) return;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const p of odPyros) {
    if (!p.up) {
      const k = clamp(p.t / PYRO_DELAY, 0, 1), e = odEaseOut(k);
      const pulse = 0.5 + 0.5 * Math.sin(p.t * (10 + 38 * k));
      // the plating heating: a dark bed with warmth coming up through it
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, rgba('#7c2d12', 0.25 + 0.35 * k));
      g.addColorStop(0.7, rgba('#1c0a04', 0.3 + 0.2 * k));
      g.addColorStop(1, rgba('#0a0503', 0.15));
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      odPyroCracks(p, e, true, odHeatCol(0.25 + 0.65 * k), 0.5 + 0.5 * k);

      ctx.globalCompositeOperation = 'lighter';
      // the rim, and the countdown burning away round it from the top
      ctx.globalAlpha = 0.45 + 0.25 * pulse * k; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
      if (k < 1) {
        ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, -Math.PI / 2 + k * TAU, Math.PI * 1.5); ctx.stroke();
        const ha = -Math.PI / 2 + k * TAU;                   // the burning end
        drawGlow(p.x + Math.cos(ha) * p.r, p.y + Math.sin(ha) * p.r, 14, '#fff7ed', 0.8);
      }
      // ticks, turning slowly
      ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU + uiTime * 0.4, r1 = p.r + 5, r2 = p.r + (i % 3 ? 9 : 14);
        ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
        ctx.lineTo(p.x + Math.cos(a) * r2, p.y + Math.sin(a) * r2);
      }
      ctx.stroke();
      // four chevrons closing in on the rim
      const cr = p.r * (1.5 - 0.38 * e), cs = 9;
      ctx.globalAlpha = 0.55 + 0.45 * pulse; ctx.strokeStyle = k > 0.8 ? '#fff7ed' : '#fde047'; ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, cx = p.x + Math.cos(a) * cr, cy = p.y + Math.sin(a) * cr;
        const ux = -Math.cos(a), uy = -Math.sin(a), vx = -uy, vy = ux;
        ctx.moveTo(cx - ux * cs + vx * cs, cy - uy * cs + vy * cs);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx - ux * cs - vx * cs, cy - uy * cs - vy * cs);
      }
      ctx.stroke();
      // the centre mark
      ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x - 7, p.y); ctx.lineTo(p.x + 7, p.y); ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 7);
      ctx.stroke();
      drawGlow(p.x, p.y, p.r * (0.3 + 0.5 * k), '#f97316', 0.15 + 0.35 * k * (0.6 + 0.4 * pulse));
      if (k > 0.88) {                                      // the last beat: the whole floor lights
        const f = (k - 0.88) / 0.12;
        ctx.globalAlpha = 0.25 * f; ctx.fillStyle = '#fb923c';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      if (odParts() && Math.random() < 0.25 + 0.6 * k) {
        const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * p.r;
        spawnPart(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, rnd(10, -10), rnd(-20, -60 - 80 * k),
                  rnd(1.8, 0.8), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.5, 0.25), 0.93);
      }
    } else {
      const u = clamp((p.t - PYRO_DELAY) / PYRO_AFTER, 0, 1);
      const fade = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
      // the crater: ragged, darkest at the middle, ash at the rim
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 1.1);
      g.addColorStop(0, 'rgba(5,2,2,0.9)'); g.addColorStop(0.7, 'rgba(20,8,5,0.75)'); g.addColorStop(1, 'rgba(10,5,3,0.25)');
      ctx.globalAlpha = fade; ctx.fillStyle = g;
      odPyroBlot(p, p.r * 1.02); ctx.fill();
      ctx.globalAlpha = 0.3 * fade; ctx.strokeStyle = '#78716c'; ctx.lineWidth = 3;
      odPyroBlot(p, p.r * 1.04); ctx.stroke();
      const heat = 1 - u;
      odPyroCracks(p, 1, true, odHeatCol(heat * 0.9), (0.4 + 0.6 * heat) * fade);
      ctx.globalCompositeOperation = 'lighter';
      const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 0.6);
      pg.addColorStop(0, rgba(odHeatCol(heat * 0.85), 0.5 * heat * fade)); pg.addColorStop(1, rgba('#7f1d1d', 0));
      ctx.globalAlpha = 1; ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.6, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}

// one flame tongue, pointing up: a teardrop from (x, y) to its tip
function odTongue(x, y, w, h, lean) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.9, y - h * 0.55, x + lean, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y - h * 0.55, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y);
  ctx.fill();
}

function drawOdPyros() {
  for (const p of odPyros) if (p.up) odPyroColumn(p);
}

/* one column, from the moment it rises: p is { x, y, r, t, seed } on PYRO's
   clock, and hMax (optional) caps how tall it stands */
function odPyroColumn(p) {
  {
    const u = clamp((p.t - PYRO_DELAY) / PYRO_AFTER, 0, 1);
    const rise = odEaseOut(clamp(u / 0.12, 0, 1));
    const go = u < 0.4 ? 0 : (u - 0.4) / 0.6;                 // letting go of the ground
    const colK = 1 - go * go;
    const Hc = (p.hMax || p.r * 3.4) * rise;
    const base = p.y - Hc * 0.85 * go * go;                     // the foot lifts away
    const top = p.y - Hc - p.r * 1.4 * go;
    const bw = p.r * 0.85 * (1 - go * 0.5), tw = p.r * 0.3;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // the flash and the shock off the floor
    if (u < 0.1) drawGlow(p.x, p.y, p.r * 2.6, '#fff7ed', (1 - u / 0.1) * 0.9);
    if (u < 0.3) {
      const s = u / 0.3;
      ctx.globalAlpha = (1 - s) * 0.9; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 6 * (1 - s) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + odEaseOut(s) * 1.3), 0, TAU); ctx.stroke();
    }
    drawGlow(p.x, p.y, p.r * 2.1, '#f97316', 0.55 * (1 - u));
    drawGlow(p.x, p.y, p.r * 1.1, '#fde047', 0.5 * (1 - u) * (1 - u));

    // the column: wavering sides, white at the foot, gone to red at the top
    if (colK > 0.01 && Hc > 2) {
      const side = (sd, w0, w1) => {
        const N = 14, pts = [];
        for (let i = 0; i <= N; i++) {
          const v = i / N, y = lerp(base, top, v);
          const w = lerp(w0, w1, Math.pow(v, 0.8)) * (1 + Math.sin(v * 9 - uiTime * 18 + sd * 1.3 + p.seed) * 0.12);
          pts.push([p.x + sd * w, y]);
        }
        return pts;
      };
      const big = clamp((p.r - 120) / 260, 0, 1);
      for (const [w0, w1, a, hot] of [[bw * 1.25, tw * 1.6, 0.35, 0], [bw, tw, 0.6 - 0.15 * big, 0.5], [bw * 0.45, tw * 0.3, 0.6 - 0.25 * big, 1]]) {
        const L = side(-1, w0, w1), R = side(1, w0, w1).reverse();
        const dipK = 0.35 + clamp((p.r - 120) / 260, 0, 0.5);   // wider columns round deeper into the floor
        const dip = base + w0 * dipK;
        const g = ctx.createLinearGradient(0, dip, 0, top);
        g.addColorStop(0, rgba(hot ? '#fde047' : '#f97316', 0));
        g.addColorStop(0.1, rgba(hot ? '#fff7ed' : '#fde047', a * colK));
        g.addColorStop(0.35, rgba(hot ? '#fde047' : '#f97316', a * colK * 0.9));
        g.addColorStop(0.75, rgba('#b91c1c', a * colK * 0.5));
        g.addColorStop(1, rgba('#7f1d1d', 0));
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath();
        [...L, ...R].forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        ctx.quadraticCurveTo(p.x, dip + w0 * dipK, L[0][0], L[0][1]);
        ctx.closePath(); ctx.fill();
      }
      // tongues climbing it
      for (let i = 0; i < 16; i++) {
        const hs = p.seed + i * 7.9;
        const v = (uiTime * (1.4 + odHash(hs) * 0.8) + odHash(hs + 1)) % 1;
        const y = lerp(base, top, v * 0.95);
        const w = lerp(bw, tw, v) * (0.9 - odHash(hs + 2) * 0.4);
        const x = p.x + (odHash(hs + 3) - 0.5) * 2 * w * 0.75 + Math.sin(uiTime * 7 + i) * 4;
        ctx.globalAlpha = colK * (1 - v) * 0.7;
        ctx.fillStyle = odHeatCol(1 - v * 0.9);
        odTongue(x, y, p.r * 0.14 * (1 - v * 0.5), p.r * (0.5 + odHash(hs + 4) * 0.4) * (1 - v * 0.4), Math.sin(uiTime * 9 + i) * 6);
      }
    }
    // the ring of fire round its foot
    const ringK = u < 0.7 ? rise : rise * (1 - (u - 0.7) / 0.3);
    if (ringK > 0.01) {
      for (let i = 0; i < 26; i++) {
        const hs = p.seed + i * 4.1, a = (i / 26) * TAU + odHash(hs) * 0.2;
        const x = p.x + Math.cos(a) * p.r * 0.95, y = p.y + Math.sin(a) * p.r * 0.95;
        const h = p.r * (0.22 + 0.2 * (0.5 + 0.5 * Math.sin(uiTime * (11 + odHash(hs + 1) * 6) + i))) * ringK;
        ctx.globalAlpha = 0.55 * ringK; ctx.fillStyle = i % 3 ? '#f97316' : '#fde047';
        odTongue(x, y, p.r * 0.07, h, Math.sin(uiTime * 8 + i) * 3);
      }
    }
    ctx.restore();
    drawGlow(p.x, lerp(base, top, 0.3), bw * 2.2, '#fb923c', 0.35 * colK);
    if (odParts() && u < 0.85 && Math.random() < 0.9 * (1 - u)) {
      const v = Math.random();
      spawnPart(p.x + rnd(bw, -bw) * (1 - v * 0.6), lerp(base, top, v), rnd(40, -40), rnd(-140, -320),
                rnd(2.6, 1.2), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.7, 0.35), 0.94);
    }
  }
}

function odPyroCastFx(p) {
  Audio_.tone(330, 0.2, 'triangle', 0.06, 180);
  Audio_.tone(110, 0.9, 'sine', 0.04, 220);                   // the ground priming, rising to the rise
  ringFx(p.x, p.y, p.r * 1.5, p.r, '#fb923c', 0.35, 2);
  burst(p.x, p.y, 6, '#fdba74', 90, 2, 0.35);
}

function odPyroEruptFx(p) {
  shakeAt(p.x, p.y, 0.8);
  Audio_.boom();
  Audio_.tone(80, 0.6, 'sawtooth', 0.1, 40);
  ringFx(p.x, p.y, p.r * 0.3, p.r * 1.6, '#fde047', 0.45, 6);
  burst(p.x, p.y, 30, '#fb923c', 420, 4, 0.7);
  burst(p.x, p.y, 24, '#fde047', 560, 3.5, 0.8, 0.9, -Math.PI / 2);   // straight up the column
  burst(p.x, p.y, 10, '#fff7ed', 260, 4.5, 0.3);
  if (FXO.waves) groundWave(p.x, p.y, { col: '#f97316', amp: 30, speed: 700, width: 120, life: 1.0 });
}

function odPyroHitFx(e, p) {
  burst(e.x, e.y, 8, '#fdba74', 260, 3, 0.4);
  burst(e.x, e.y, 6, '#fde047', 300, 2.6, 0.5, 0.8, -Math.PI / 2);   // caught up in it
}

/* ----------------------- C — BRAND (STRIKE in the code) — art ---------------
   The idea: EMBER stands on its fire and goes straight up. The vanes swing
   from trailing to driving down — foreshortened into the hull as they turn,
   the downdraft splashing out across the floor in a ring — then the hull
   climbs toward the eye on a pillar of flame, growing, its shadow shrinking
   away under it. The cut is an iris closing on the hull with a hot rim. From
   above: corner brackets, the prompt, a fuse burning in from both ends; the X
   under the cursor as two foot-wide lanes with chevrons running the way each
   is traced, numbered 1 and 2. Marked, the X draws out from the spot and
   locks. The foot is a column seen end-on: a white core in an orange disc,
   three spiral arms turning, two helix strands orbiting its rim (the lance,
   seen from above), rings pulsing outward, smeared behind it as it drives.
   Landing is the climb in reverse, with a ring off the floor as it touches.

   What it is handed:

   P.odStrike — from C until the hull is back on the floor (null otherwise)
     ph        'wings' | 'rise' | 'cutUp' | 'aim' | 'tell' | 'fire' |
               'cutDown' | 'land'
     t         seconds into this phase; T, seconds since C
     mx, my    the marked spot (from 'tell' on)
     strokes   the X, in the order it is traced (from 'tell' on), each
               { x1, y1, x2, y2, ang, len }: top-left → bottom-right, then
               top-right → bottom-left, cut at the walls
     beam      the foot of fire, during 'fire' (null otherwise):
                 i        which stroke it is on
                 ph       'on' landing | 'trace' driven along | 'off' going
                          out | 'gap' dark before the next stroke
                 t        seconds into that
                 x, y     where it stands on the floor
                 d        how far along the stroke (0 … strokes[i].len)
                 ang      the stroke's heading
                 k        0 … 1: in as it lands, out as it goes
                 full, R  its radius at full, and now (full × k: what hurts)
                 scar     the trench it is carving (an odScars entry: see Z)

   Helpers: odStrikeAlt() 0 on the floor … 1 up; odStrikeWings() 0 … 1 over
   the wing turn, held while up, back as it lands; odStrikeX(x, y) the X that
   would be cut at (x, y); odStrikeR() the foot's full radius. The cursor, in
   the world, is mouse.wx / mouse.wy. The view is zoomed out to the arena
   while up (camZoom), so a line meant to read at a fixed thickness on screen
   wants its width divided by camZoom.

   The hull is not drawn by drawPlayer, nor its vanes by odDrawShip, for as
   long as P.odStrike is set: drawOdStrikeHull has it. And from the black of
   the first cut to the black of the second — while odStrikePov() — neither
   drawOdStrikeGround nor drawOdStrikeHull is called at all: that view is
   EMBER's own, and EMBER is not in it. odStrikeBlack() is how black a cut is.

   Called from:
     drawOdStrikeGround()   world, at the hull's own layer: under it, on the floor
     drawOdStrikeHull()     world, over everything else in it: the hull
     drawOdStrikeMarks()    world, floor layer: the X under the cursor while
                            aiming, the marked X, the path still to trace
     drawOdStrike()         world, additive layer: the foot of fire
     drawOdStrikeUi()       screen space: the aiming view
     drawOdStrikeCut()      screen space, over the HUD, in play only: the cuts
     odStrikeLiftFx(st)     C pressed: the vanes begin to turn
     odStrikeRiseFx(st)     it leaves the floor
     odStrikeAimFx(st)      it is up; the aim begins
     odStrikeMarkFx(st)     the spot is marked
     odStrikeFireFx(st, b)  the foot lands, at the start of each stroke
     odStrikeHitFx(e, b)    the foot, on a body, every SCORCH_PROC
     odStrikeEndFx(st)      the last stroke goes out
     odStrikeLandFx(st)     it is back on the floor
--------------------------------------------------------------------------- */



const odStrikePx = () => 1 / (typeof camZoom === 'number' && camZoom > 0 ? camZoom : 1);
// how far up the screen the hull is drawn, and how much bigger, at altitude a
const odStrikeLift = a => a * a * 120;
const odStrikeGrow = a => 1 + a * 1.1;

// on the floor under the hull: its shadow, and the downdraft splashing out
function drawOdStrikeGround() {
  const st = P.odStrike;
  if (!st) return;
  const a = odStrikeAlt(), w = odStrikeWings();
  ctx.save();
  // the shadow: smaller, softer and further from true as it climbs
  const sr = 22 * (1 - a * 0.55);
  const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, sr * 1.6);
  g.addColorStop(0, 'rgba(0,0,0,' + 0.5 * (1 - a * 0.7) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(P.x, P.y, sr * 1.6, 0, TAU); ctx.fill();
  // scorch where it stood on its fire
  const bw_ = Math.pow(clamp((w - 0.35) / 0.65, 0, 1), 1.5);
  const thrust = bw_ * (1 - a * 0.8);
  if (thrust > 0.01) {
    ctx.globalAlpha = 0.45 * thrust; ctx.fillStyle = '#140805';
    ctx.beginPath(); ctx.arc(P.x, P.y, 26 + 20 * w, 0, TAU); ctx.fill();
  }
  ctx.globalCompositeOperation = 'lighter';
  // the downdraft: fire spread flat across the floor, rings running out of it
  const heat = st.ph === 'wings' ? bw_ * 0.3 : st.ph === 'rise' || st.ph === 'land' ? 0.55 * (1 - a) : 0;
  if (heat > 0.01) {
    const fg = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 34 + 40 * w);
    fg.addColorStop(0, rgba('#fff7ed', 0.55 * heat)); fg.addColorStop(0.35, rgba('#f97316', 0.4 * heat));
    fg.addColorStop(1, rgba('#7f1d1d', 0));
    ctx.globalAlpha = 1; ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(P.x, P.y, 34 + 40 * w, 0, TAU); ctx.fill();
    const air = st.ph === 'rise' || st.ph === 'land';
    ctx.lineWidth = 2;
    if (air) for (let j = 0; j < 3; j++) {
      const u = (uiTime * 2.4 + j / 3) % 1;
      ctx.globalAlpha = heat * (1 - u) * 0.7; ctx.strokeStyle = j ? '#fb923c' : '#fde047';
      ctx.beginPath(); ctx.arc(P.x, P.y, 20 + u * (50 + 50 * w), 0, TAU); ctx.stroke();
    }
    // flame licks pushed flat outward
    if (air) for (let j = 0; j < 12; j++) {
      const an = j / 12 * TAU + odHash(j * 3.1) * 0.4, fl = (22 + 26 * w) * (0.7 + 0.3 * Math.sin(uiTime * 14 + j * 2));
      ctx.globalAlpha = 0.45 * heat; ctx.fillStyle = j % 3 ? '#f97316' : '#fde047';
      ctx.save(); ctx.translate(P.x + Math.cos(an) * 14, P.y + Math.sin(an) * 14); ctx.rotate(an + Math.PI / 2);
      odTongue(0, 0, 5, fl, Math.sin(uiTime * 9 + j) * 3);
      ctx.restore();
    }
  }
  ctx.restore();
  if (odParts() && heat > 0.2 && Math.random() < 0.7 * heat) {
    const an = Math.random() * TAU, v = rnd(260, 120);
    spawnPart(P.x + Math.cos(an) * 16, P.y + Math.sin(an) * 16, Math.cos(an) * v, Math.sin(an) * v,
              rnd(2.2, 1), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.4, 0.2), 0.9);
  }
}

/* EMBER's own vanes (odDrawWings, the same feathers, spars, notch and heat),
   with three things added that the game's version has no way to do:
     turn    each fan swings on its root, from trailing out to the side:
             0 trailing … 1 spread wide
     bright  the heat in them: longer, whiter, hotter at the roots
     down    how far the feathers are bent toward the floor (down the screen,
             whatever way the hull faces): the wings driving it up */
function odStrikeVanes(c, x, y, ang, t, open, turn, bright, down) {
  if (open <= 0.001) return;
  const sg = odSurge(t) * (1 + bright * 0.3);
  const lag = clamp((odPlume.lag || 0) * 1.9, -0.9, 0.9) * (1 - turn);
  const stretch = (odPlume.stretch || 1) * (1 + bright * 0.25);
  const blend = (d, tgt, k) => { let q = tgt - d; while (q > Math.PI) q -= TAU; while (q < -Math.PI) q += TAU; return d + q * k; };
  // which of the hull's sides is on the right of the screen just now
  const rightSd = -Math.sin(ang) >= 0 ? 1 : -1;
  /* A feather's heading, in hull space. On the floor: the fan, opening as it
     turns — the inner feathers near where they were, the outer ones swung far
     out. Driving down: both fans aimed down and out on the screen, mirrored
     about the vertical through the hull, whatever way it faces. */
  const head = (sd, k) => {
    const hull = Math.PI - sd * (0.32 + k * 0.30 + k * turn * 1.2) - lag * (0.35 + k * 0.5);
    if (down <= 0) return hull;
    const side = sd === rightSd ? 1 : -1;
    const scr = Math.PI / 2 - side * (0.35 + k * 0.55);
    // blended as vectors on the screen, so neither side arrives before the other
    const hx = Math.cos(hull + ang), hy = Math.sin(hull + ang);
    const vx = lerp(hx, Math.cos(scr), down), vy = lerp(hy, Math.sin(scr), down);
    return Math.atan2(vy, vx) - ang;
  };
  c.save();
  c.translate(x, y); c.rotate(ang);
  c.save();
  hullPath('ember'); c.clip();
  c.globalCompositeOperation = 'lighter';
  const cond = c.createLinearGradient(-13, 0, 14, 0);
  const heat = open * (0.55 + sg * 0.3) * (1 + bright * 0.6);
  cond.addColorStop(0, 'rgba(255,237,213,' + Math.min(0.9, 0.52 * heat) + ')');
  cond.addColorStop(0.28, 'rgba(249,115,22,' + Math.min(0.8, 0.38 * heat) + ')');
  cond.addColorStop(0.62, 'rgba(153,27,27,' + Math.min(0.5, 0.16 * heat) + ')');
  cond.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = cond; c.fillRect(-16, -16, 34, 32);
  c.restore();
  // the notch, its jet turning down with the fans
  c.save();
  c.globalCompositeOperation = 'lighter';
  const nx = -10.5, jd = blend(Math.PI + lag * 0.55, Math.PI / 2 - ang, down);
  odGlow(c, nx, 0, (13 + sg * 9) * open, '#fb923c', 0.5 * open);
  odGlow(c, nx, 0, (6 + sg * 4) * open, '#fff7ed', Math.min(0.9, 0.45 * open * (1 + bright)));
  c.globalAlpha = 0.9 * open; c.fillStyle = '#fff7ed';
  c.beginPath(); c.ellipse(nx, 0, 2.6 + sg * 1.1, 3.4 + sg * 0.8, 0, 0, TAU); c.fill();
  c.globalAlpha = 0.5 * open; c.fillStyle = '#fdba74';
  odFlameLeaf(c, nx, 0, jd, (16 + sg * 14) * stretch, 4.4, lag * 9); c.fill();
  c.globalAlpha = 0.72 * open; c.fillStyle = '#fff7ed';
  odFlameLeaf(c, nx, 0, jd, (8 + sg * 7) * stretch, 1.9, lag * 4); c.fill();
  c.restore();

  c.globalCompositeOperation = 'lighter';
  for (const sd of [1, -1]) {
    const N = 9, skew = lag * sd;
    const gd = head(sd, 0.6);
    odGlow(c, -4 + Math.cos(gd) * 22, sd * 8 + Math.sin(gd) * 22, (40 + sg * 12) * open, '#9a3412', 0.26 * open * (1 + bright * 0.5));
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1);
      const flick = 0.86 + Math.sin(t * (6 + i * 1.6) + i * 2.3 + sd) * 0.14;
      const span = open * flick;
      const rootX = 6 - k * 13, rootY = sd * (4.5 + k * 4);
      const dir = head(sd, k);
      const len = (26 + 46 * Math.sin(Math.min(1, 0.18 + k * 0.92) * Math.PI)) * span * (0.8 + sg * 0.34) * stretch * (1 - 0.35 * down);
      const bend = (sd * (7 + k * 12) * span + skew * (10 + k * 16) * span) * (1 - down * 0.7) +
                   Math.sin(t * 4.2 + i * 1.3 + sd) * 3 * span;
      const w = (4.2 - k * 1.4) * span * (0.85 + sg * 0.2);
      const near = 1 - k * 0.55;
      c.globalAlpha = 0.26 * span; c.fillStyle = '#7f1d1d';
      odFlameLeaf(c, rootX, rootY, dir, len, w * 1.9, bend); c.fill();
      c.globalAlpha = 0.4 * span * near; c.fillStyle = '#ea580c';
      odFlameLeaf(c, rootX, rootY, dir, len * 0.86, w * 1.05, bend * 0.8); c.fill();
      // only the cores take the heat: whiter, and further out along each feather
      c.globalAlpha = Math.min(0.95, 0.6 * span * flick * near * near * (1 + bright * 0.8));
      c.fillStyle = k < 0.3 + bright * 0.35 ? '#fff7ed' : i % 3 === 0 ? '#fde68a' : '#fdba74';
      odFlameLeaf(c, rootX, rootY, dir, len * (0.5 + bright * 0.15), w * 0.42, bend * 0.5); c.fill();
    }
    // the spars, following the fan: the leading one along its inner feathers, the trailing one its outer
    const spar = (x0, y0, k0, k1, L0, L1, bow) => {
      const d0 = head(sd, k0), d1 = head(sd, k1);
      const mx = x0 + Math.cos(d0) * L0, my = y0 + Math.sin(d0) * L0;
      const ex = x0 + Math.cos(d1) * L1, ey = y0 + Math.sin(d1) * L1;
      c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(mx + sd * bow * (1 - down), my, ex, ey); c.stroke();
    };
    c.lineCap = 'round';
    c.globalAlpha = 0.6 * open; c.strokeStyle = bright > 0.5 ? '#fff7ed' : '#fed7aa'; c.lineWidth = 1.5;
    spar(6, sd * 4.5, 0.25, 0.55, 20 * open, 40 * open, 3);
    c.globalAlpha = 0.3 * open; c.lineWidth = 1;
    spar(-7, sd * 8, 0.6, 0.9, 24 * open, 52 * open, 2);
  }
  c.restore();
}

/* The hull. Wings: the fans swing out on their roots and the heat comes up in
   them until they are white. Rise: they bend down toward the floor and drive
   it up, the hull climbing toward the eye as it goes. */
function drawOdStrikeHull() {
  const st = P.odStrike;
  if (!st || state === 'dead') return;
  const a = odStrikeAlt(), w = odStrikeWings();
  const lift = odStrikeLift(a), grow = odStrikeGrow(a);
  const hx = P.x, hy = P.y - lift;
  const turn = osEase(clamp(w / 0.7, 0, 1));                       // the swing leads…
  const bright = Math.pow(clamp((w - 0.35) / 0.65, 0, 1), 1.5);    // …the heat follows it
  // bent to the floor: a little as the heat peaks, fully while it climbs, easing at the top
  const down = st.ph === 'wings' ? 0 : st.ph === 'rise' ? osEase(clamp(st.t / 0.12, 0, 1)) : st.ph === 'land' ? osEase(clamp((STRIKE_LAND - st.t) / 0.12, 0, 1)) : 1;
  const beat = (st.ph === 'rise' || st.ph === 'land') ? Math.sin(st.t * 26) * 0.12 * Math.sin(Math.PI * a) : 0;
  const shiv = bright * (1 - a) * 0.7;
  const jx = Math.sin(uiTime * 71) * shiv, jy = Math.cos(uiTime * 63) * shiv;

  // the heat the wings throw down on the floor under them, fading as it climbs
  if (bright > 0.01 || a > 0) drawGlow(P.x, P.y, 60 * (1 - a * 0.5), '#f97316', 0.3 * Math.max(bright, 0.6 * (1 - a)) );
  // speed lines streaming past while it climbs or drops
  const moving = st.ph === 'rise' || st.ph === 'land' ? Math.sin(Math.PI * a) : 0;
  if (moving > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1.4;
    for (let j = 0; j < 9; j++) {
      const hs = j * 5.7 + 1, u = (uiTime * 3.2 + odHash(hs)) % 1;
      const x = hx + (odHash(hs + 1) - 0.5) * 110 * grow, y = hy - 60 + u * 200, L = 24 + odHash(hs + 2) * 30;
      ctx.globalAlpha = moving * 0.45 * Math.sin(u * Math.PI);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + L); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(hx + jx, hy + jy); ctx.scale(grow, grow); ctx.translate(-P.x, -P.y);
  const q = typeof odPhase === 'function' ? odPhase() : null, open = q ? Math.max(q.open, 0.6) : 1;
  ctx.save();
  odStrikeVanes(ctx, P.x, P.y, P.ang, uiTime, open * (1 + 0.2 * bright), clamp(turn + beat, 0, 1.2), bright, down);
  ctx.restore();
  drawPlayer();
  ctx.restore();
}

// the X: under the cursor while aiming, then locked and eaten by the foot
function drawOdStrikeMarks() {
  const st = P.odStrike;
  if (!st) return;
  const px = odStrikePx(), R = odStrikeR();
  const aim = st.ph === 'aim', locked = st.ph === 'tell' || st.ph === 'fire';
  if (!aim && !locked) return;
  const strokes = aim ? odStrikeX(mouse.wx, mouse.wy) : st.strokes;
  const cx = aim ? mouse.wx : st.mx, cy = aim ? mouse.wy : st.my;
  const draw = st.ph === 'tell' ? odEaseOut(clamp(st.t / (STRIKE_TELL * 0.7), 0, 1)) : 1;
  const pulse = 0.65 + 0.35 * Math.sin(uiTime * (locked ? 18 : 6));
  ctx.save();
  ctx.lineCap = 'round';
  strokes.forEach((s, i) => {
    const b = st.beam;
    if (locked && b && i < b.i) return;              // cut already: the trench says so
    const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1), Ls = len(s.x2 - s.x1, s.y2 - s.y1);
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
    // from the spot outward while it is being written; then only what is ahead of the foot
    const tc = ((cx - s.x1) * ca + (cy - s.y1) * sa);
    let d0 = lerp(tc, 0, draw), d1 = lerp(tc, Ls, draw);
    if (locked && b && i === b.i) d0 = Math.max(d0, b.d);
    if (d1 - d0 < 1) return;
    const P0 = [s.x1 + ca * d0, s.y1 + sa * d0], P1 = [s.x1 + ca * d1, s.y1 + sa * d1];
    // the lane: the foot's width, faint
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = locked ? 0.22 : 0.14; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = R * 2;
    ctx.beginPath(); ctx.moveTo(P0[0], P0[1]); ctx.lineTo(P1[0], P1[1]); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    // its edges
    ctx.lineWidth = 1.5 * px; ctx.strokeStyle = locked ? '#fb923c' : '#c2410c';
    ctx.globalAlpha = (locked ? 0.75 : 0.5) * pulse;
    ctx.setLineDash(locked ? [] : [10 * px, 8 * px]); ctx.lineDashOffset = -uiTime * 40 * px;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(P0[0] + nx * R * sd, P0[1] + ny * R * sd); ctx.lineTo(P1[0] + nx * R * sd, P1[1] + ny * R * sd); ctx.stroke();
    }
    ctx.setLineDash([]);
    // chevrons running the way it will be traced
    const gap = 130 * px, cs = Math.min(R * 0.45, 26 * px);
    ctx.lineWidth = 2.4 * px; ctx.strokeStyle = locked ? '#fde047' : '#fb923c';
    const off = (uiTime * (locked ? 420 : 160) * px) % gap;
    ctx.beginPath();
    for (let d = d0 + off; d < d1 - cs; d += gap) {
      const x = s.x1 + ca * d, y = s.y1 + sa * d;
      ctx.moveTo(x - ca * cs + nx * cs, y - sa * cs + ny * cs); ctx.lineTo(x, y); ctx.lineTo(x - ca * cs - nx * cs, y - sa * cs - ny * cs);
    }
    ctx.globalAlpha = (locked ? 0.9 : 0.6) * pulse; ctx.stroke();
    // which stroke goes first
    if (!(locked && b && i === b.i) && draw >= 1) {
      ctx.globalAlpha = 0.9; ctx.fillStyle = locked ? '#fde047' : '#fdba74';
      ctx.font = '700 ' + Math.round(15 * px) + 'px ' + "'JetBrains Mono', ui-monospace, monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), s.x1 + ca * 22 * px - nx * (R + 16 * px), s.y1 + sa * 22 * px - ny * (R + 16 * px));
    }
  });
  // the reticle at the spot
  const rr = (aim ? 20 : 26 - 6 * draw) * px;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.95; ctx.strokeStyle = locked ? '#fff7ed' : '#fde047'; ctx.lineWidth = 2 * px;
  ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 4 + (aim ? uiTime * 0.8 : 0));
  ctx.beginPath();
  for (let j = 0; j < 4; j++) { ctx.rotate(Math.PI / 2); ctx.moveTo(rr + 4 * px, 0); ctx.lineTo(rr + 12 * px, 0); }
  ctx.moveTo(-6 * px, 0); ctx.lineTo(6 * px, 0); ctx.moveTo(0, -6 * px); ctx.lineTo(0, 6 * px);
  ctx.stroke(); ctx.restore();
  if (locked) drawGlow(cx, cy, 40 * px, '#fde047', 0.4 * pulse);
  ctx.restore();
}

// the foot: a column of fire seen end-on from above
function drawOdStrike() {
  const st = P.odStrike, b = st && st.beam;
  if (!b || b.R < 1) return;
  const R = b.R, k = b.k, s = st.strokes[b.i];
  const ca = Math.cos(b.ang), sa = Math.sin(b.ang);
  ctx.save();
  ctx.lineCap = 'round';
  // the smear behind it as it drives
  if (b.ph === 'trace' || b.ph === 'off') {
    const tl = Math.min(b.d, R * 2.2);
    const tx = b.x - ca * tl, ty = b.y - sa * tl;
    const g = ctx.createLinearGradient(tx, ty, b.x, b.y);
    g.addColorStop(0, rgba('#b91c1c', 0)); g.addColorStop(1, rgba('#f97316', 0.45 * k));
    ctx.strokeStyle = g; ctx.lineWidth = R * 1.8; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // the disc
  const dg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 1.15);
  dg.addColorStop(0, rgba('#fff7ed', 0.95 * k)); dg.addColorStop(0.22, rgba('#fde047', 0.8 * k));
  dg.addColorStop(0.6, rgba('#f97316', 0.55 * k)); dg.addColorStop(0.88, rgba('#b91c1c', 0.35 * k));
  dg.addColorStop(1, rgba('#7f1d1d', 0));
  ctx.fillStyle = dg; ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.15, 0, TAU); ctx.fill();
  // three spiral arms, turning
  for (let j = 0; j < 3; j++) {
    const base = j * TAU / 3 + uiTime * 5;
    ctx.beginPath();
    for (let m = 0; m <= 16; m++) {
      const u = m / 16, r = R * (0.12 + u * 0.85), th = base + u * 2.4;
      const x = b.x + Math.cos(th) * r, y = b.y + Math.sin(th) * r;
      m ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = '#fde047'; ctx.globalAlpha = 0.5 * k; ctx.lineWidth = R * 0.07; ctx.stroke();
    ctx.strokeStyle = '#fff7ed'; ctx.globalAlpha = 0.6 * k; ctx.lineWidth = R * 0.025; ctx.stroke();
  }
  // rings pulsing out to the rim
  for (let j = 0; j < 3; j++) {
    const u = (uiTime * 3 + j / 3) % 1;
    ctx.globalAlpha = 0.6 * k * (1 - u); ctx.strokeStyle = '#fdba74'; ctx.lineWidth = R * 0.04 * (1 - u) + 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, R * (0.3 + u * 0.75), 0, TAU); ctx.stroke();
  }
  // the rim: exactly what hurts
  ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = Math.max(2, R * 0.03);
  ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.stroke();
  // the helix, end-on: two strands orbiting the rim with their tails
  for (let j = 0; j < 2; j++) {
    const th = uiTime * 9 + j * Math.PI, r = R * 0.9;
    ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = '#fde047'; ctx.lineWidth = R * 0.05;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, th - 1.1, th); ctx.stroke();
    ctx.globalAlpha = 1 * k; ctx.strokeStyle = '#fff7ed'; ctx.lineWidth = R * 0.02;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, th - 0.5, th); ctx.stroke();
    drawGlow(b.x + Math.cos(th) * r, b.y + Math.sin(th) * r, R * 0.2, '#fff7ed', 0.7 * k);
  }
  ctx.restore();
  // landing: the flash of it arriving
  if (b.ph === 'on') drawGlow(b.x, b.y, R * (2.4 - k), '#fff7ed', 0.6 * (1 - k * 0.6));
  drawGlow(b.x, b.y, R * 1.9, '#f97316', 0.4 * k);
  if (odParts()) {
    for (let j = 0; j < 2; j++) {
      if (Math.random() > 0.9 * k) continue;
      const an = rnd(TAU), v = rnd(420, 160);
      spawnPart(b.x + Math.cos(an) * R * 0.9, b.y + Math.sin(an) * R * 0.9, Math.cos(an) * v, Math.sin(an) * v,
                rnd(3.4, 1.6), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.5, 0.2), 0.9);
    }
  }
}

// the aiming view: corner brackets, the prompt, a fuse burning in from both ends
function drawOdStrikeUi() {
  const st = P.odStrike;
  if (!st || !(st.ph === 'aim' || st.ph === 'tell' || st.ph === 'fire' ||
                st.ph === 'xdone' || st.ph === 'ring' || st.ph === 'walled' || st.ph === 'nuke')) return;
  const aim = st.ph === 'aim';
  const inA = aim ? odEaseOut(clamp(st.t / 0.3, 0, 1)) : 1;
  const left = aim ? 1 - clamp(st.t / STRIKE_AIM_MAX, 0, 1) : 0;
  const hot = aim && left < 0.3;
  ctx.save();
  // the edges of the frame warm, so the view reads as EMBER's own
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,14,4,' + 0.45 * inA + ')');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // corner brackets
  const m = 14 + (1 - inA) * 30, L = 34;
  ctx.globalAlpha = (aim ? 0.85 : 0.45) * inA;
  ctx.strokeStyle = hot && Math.sin(uiTime * 20) > 0 ? '#fde047' : '#fb923c'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) {
    ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y);
  }
  ctx.stroke();
  if (aim) {
    ctx.globalAlpha = inA;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = "700 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = 'rgba(253,186,116,0.8)';
    ctx.fillText('B R A N D', W / 2, 34);
    ctx.font = "700 18px Barlow, 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = '#fde047';
    ctx.fillText('MARK THE SPOT', W / 2, 56);
    // the fuse
    const fw = 220, fx = W / 2 - fw / 2, fy = 68, rem = fw * left;
    ctx.fillStyle = 'rgba(148,163,184,0.2)'; ctx.fillRect(fx, fy, fw, 2);
    const fg = ctx.createLinearGradient(fx, 0, fx + fw, 0);
    fg.addColorStop(0, '#f97316'); fg.addColorStop(0.5, '#fde047'); fg.addColorStop(1, '#f97316');
    ctx.fillStyle = fg; ctx.fillRect(W / 2 - rem / 2, fy - 1, rem, 4);
    ctx.globalCompositeOperation = 'lighter';
    if (rem > 1) for (const sx of [-1, 1]) drawGlow(W / 2 + sx * rem / 2, fy + 1, 9 + Math.sin(uiTime * 40 + sx) * 2, '#fff7ed', 0.9 * inA);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = inA;
    ctx.font = "700 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = hot ? '#fde047' : 'rgba(168,162,158,0.9)';
    ctx.fillText((STRIKE_AIM_MAX * left).toFixed(1) + 's   ·   CLICK OR C', W / 2, 90);
  }
  ctx.restore();
}

// the cuts: an iris closing on the frame's centre (the hull, going; the hull, back), rimmed with heat
function drawOdStrikeCut() {
  const a = odStrikeBlack();
  if (a <= 0) return;
  const D = Math.hypot(W, H) / 2, r = D * Math.pow(1 - a, 0.9);
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.rect(0, 0, W, H);
  if (r > 0.5) ctx.arc(W / 2, H / 2, r, 0, TAU, true);
  ctx.fill('evenodd');
  if (r > 0.5) {
    const rim = Math.min(60, r * 0.6);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.max(0, r - rim), W / 2, H / 2, r);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(154,52,18,' + 0.35 * a + ')'); g.addColorStop(1, 'rgba(0,0,0,' + a + ')');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, a * 2) * (1 - a * 0.5); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a * a * 0.6; ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function odStrikeLiftFx(st) {
  Audio_.tone(180, 0.35, 'sawtooth', 0.06, 420);
  burst(P.x, P.y, 14, '#fb923c', 180, 2.6, 0.4);
}

function odStrikeRiseFx(st) {
  Audio_.dash();
  Audio_.tone(120, 0.5, 'sawtooth', 0.07, 520);
  shake(0.45);
  ringFx(P.x, P.y, 10, 110, '#fdba74', 0.45, 4);
  burst(P.x, P.y, 28, '#f97316', 320, 3, 0.45);
  burst(P.x, P.y, 10, '#fff7ed', 180, 3.4, 0.25);
}

function odStrikeAimFx(st) {
  Audio_.tone(660, 0.18, 'sine', 0.05, 990);
}

function odStrikeMarkFx(st) {
  Audio_.tone(880, 0.12, 'square', 0.06, 1320);
  Audio_.tone(220, 0.3, 'sawtooth', 0.05, 110);
  const R = odStrikeR();
  ringFx(st.mx, st.my, R * 0.2, R * 1.4, '#fde047', 0.4, 3 * odStrikePx());
  burst(st.mx, st.my, 16, '#fdba74', 260 * odStrikePx(), 3 * odStrikePx(), 0.4);
}

function odStrikeFireFx(st, b) {
  shakeAt(b.x, b.y, 0.8);
  Audio_.boom();
  Audio_.tone(70, 0.8, 'sawtooth', 0.1, 40);
  ringFx(b.x, b.y, b.full * 0.3, b.full * 1.5, '#fde047', 0.45, 6);
  burst(b.x, b.y, 30, '#fb923c', 520, 4, 0.6);
  burst(b.x, b.y, 12, '#fff7ed', 300, 4.5, 0.3);
}

function odStrikeHitFx(e, b) {
  burst(e.x, e.y, 6, '#fdba74', 260, 2.8, 0.35);
  burst(e.x, e.y, 3, '#fde047', 200, 2.4, 0.4, 1, b.ang);
}

function odStrikeEndFx(st) {
  Audio_.tone(200, 0.35, 'sine', 0.05, 70);
  if (!odParts()) return;
  // smoke off the whole X as the last of it goes out
  for (const s of st.strokes) for (let j = 0; j < 16; j++) {
    const u = Math.random();
    spawnPart(lerp(s.x1, s.x2, u) + rnd(20, -20), lerp(s.y1, s.y2, u) + rnd(20, -20), rnd(20, -20), rnd(-20, -60),
              rnd(9, 4), '#44403c', rnd(1.1, 0.6), 0.95, false);
  }
}

function odStrikeLandFx(st) {
  shake(0.35);
  ringFx(P.x, P.y, 12, 100, '#fb923c', 0.4, 4);
  burst(P.x, P.y, 20, '#fb923c', 240, 2.8, 0.4);
  Audio_.tone(140, 0.2, 'triangle', 0.06, 90);
}

/* ------------------ COMBO 1 — BRAND → Z → X — art ---------------------------
   Z: the foot runs the circle round the X and the trench closes; then fire
   bursts up off it all the way round — a wall, drawn as a standing curtain
   (the trench ring stacked upward, fading as it climbs) with tongues licking
   off its lip, overshooting as it bursts and settling to a breathing height.
   A pale arc on its foot burns away over its 20 s so you can see how long
   it has. It sinks back into the trench when it falls.
   X: the floor inside heats like PYROTECHNICS, only all of it — cracks from
   the centre to the wall, rings closing in, the countdown burning round —
   then PYROTECHNICS' own column goes up, as wide as the ring, and leaves a
   crater. Its brightness follows the heat it was paid with.
   The prompts are key caps with the countdown running round their edge.

   What it is handed:

   P.odStrike, as BRAND's (above), with the combo's phases between 'fire' and
   'cutDown':
     'xdone'   the X is cut; BRAND_WINDOW for Z before the view cuts back
     'ring'    the foot tracing the circle
     'walled'  the circle closed and the wall up; BRAND_WINDOW for X
     'nuke'    the giant column: priming for PYRO_DELAY, up, then PYRO_AFTER
   and:
     ringQ     Z is in (pressed, paid for); it may be waiting on the X
     nukeQ     X is in; it may be waiting on the ring
     nukeHeat  the heat X drained
     ring      { x, y, r, a0 }: the circle, from 'ring' on
     beam      as BRAND's foot; on the ring it has ring: true, its heading
               (ang) runs along the ring, and k and R fall to 0 where it is
               past a wall (the trench breaks there)
     nuke      during 'nuke': { x, y, r, t, up, hit, heat, seed }

   odRing — the wall, from the moment it rises until it falls (null otherwise).
     It outlives EMBER's view: it stands BRAND_WALL_T in the ordinary one.
     { id, x, y, r, t, life, seed }: t seconds since it rose, life = BRAND_WALL_T

   Called from:
     drawOdBrandNukeMark()   world, floor layer: after drawOdStrikeMarks — the
                             column priming, and the floor after it
     drawOdBrandWall()       world, additive layer: after drawOdStrike — the wall
     drawOdBrandNuke()       world, additive layer: after the wall — the column
     drawOdBrandUi()         screen space: after drawOdStrikeUi — what to press
     odBrandQueueFx(st, key) Z (0) or X (1) taken and paid for
     odBrandRingFx(st, b)    the foot lands on the ring
     odBrandWallFx(g)        the circle closes and the wall bursts up
     odBrandWallTouchFx(e,g) a body pressed against the wall, every BRAND_SCORCH
     odBrandWallEndFx(g)     the wall falls
     odBrandNukeFx(st, n)    the column begins to prime
     odBrandNukeEruptFx(n)   it goes up (before the damage lands)
     odBrandNukeHitFx(e, n)  once per body it catches
--------------------------------------------------------------------------- */

const odWallH = (g) => {                          // the wall's height now, burst → breathe → sink
  const up = clamp(g.t / 0.45, 0, 1), end = clamp((g.life - g.t) / 0.9, 0, 1);
  const burst = up < 1 ? odEaseOut(up) * (1 + 0.9 * Math.sin(up * Math.PI)) : 1;
  const breathe = 1 + 0.08 * Math.sin(uiTime * 2.2 + g.seed);
  return Math.min(g.r * 0.35, 78) * burst * breathe * osEase(end);
};

function drawOdBrandWall() {
  const g = odRing;
  if (!g) return;
  const H = odWallH(g), k = clamp(g.t / 0.2, 0, 1) * clamp((g.life - g.t) / 0.9, 0, 1);
  if (k <= 0.01) return;
  const px = odStrikePx();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ring = (cy, lw, col, a) => {
    ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.arc(g.x, cy, g.r, 0, TAU); ctx.stroke();
  };
  // the foot: the trench, burning
  ring(g.y, 30, '#b91c1c', 0.3 * k);
  ring(g.y, 12, '#f97316', 0.6 * k);
  ring(g.y, 4, '#fff7ed', 0.85 * k);
  // the curtain: the ring stacked upward, cooling as it climbs
  const S = 7;
  for (let j = 1; j <= S; j++) {
    const v = j / S;
    ring(g.y - H * v, 14 * (1 - v * 0.5), odHeatCol(0.9 - v * 0.75), 0.22 * k * (1 - v * 0.8));
  }
  // tongues off its lip, all the way round
  const N = clamp(Math.floor(TAU * g.r / 30), 24, 160);
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU + odHash(g.seed + i) * 0.05;
    const x = g.x + Math.cos(a) * g.r, y = g.y + Math.sin(a) * g.r;
    const fl = 0.5 + 0.5 * Math.sin(uiTime * (7 + (i % 5) * 1.3) + i * 1.7 + g.seed);
    const h = H * (0.7 + 0.6 * fl);
    const lean = Math.sin(uiTime * 5 + i * 0.9) * 5;
    ctx.globalAlpha = 0.35 * k; ctx.fillStyle = '#ea580c';
    odTongue(x, y, 9, h, lean);
    ctx.globalAlpha = 0.5 * k * (0.6 + 0.4 * fl); ctx.fillStyle = i % 3 ? '#fdba74' : '#fde047';
    odTongue(x, y, 4, h * 0.6, lean * 0.6);
  }
  // how long it has: a pale arc on the foot, burning away from the top
  const left = clamp(1 - g.t / g.life, 0, 1);
  if (left > 0) {
    ctx.globalAlpha = 0.7 * k; ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 2.5 * px;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r - 22, -Math.PI / 2, -Math.PI / 2 + left * TAU); ctx.stroke();
    const ha = -Math.PI / 2 + left * TAU;
    drawGlow(g.x + Math.cos(ha) * (g.r - 22), g.y + Math.sin(ha) * (g.r - 22), 10 * px, '#fff7ed', 0.8 * k);
  }
  ctx.restore();
  if (odParts() && Math.random() < 0.9 * k) {
    const a = Math.random() * TAU;
    spawnPart(g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r - H * Math.random(), rnd(20, -20), rnd(-60, -160),
              rnd(2.4, 1), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.7, 0.35), 0.93);
  }
}

// the whole ring priming, then the crater
function drawOdBrandNukeMark() {
  const n = P.odStrike && P.odStrike.nuke;
  if (!n) return;
  const px = odStrikePx(), pw = clamp((n.heat || 60) / (typeof VENT_MAX === 'number' ? VENT_MAX : 100), 0.5, 1);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!n.up) {
    const k = clamp(n.t / PYRO_DELAY, 0, 1), e = odEaseOut(k);
    const pulse = 0.5 + 0.5 * Math.sin(n.t * (8 + 34 * k));
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, rgba('#9a3412', 0.3 + 0.4 * k)); g.addColorStop(0.75, rgba('#1c0a04', 0.35 + 0.2 * k)); g.addColorStop(1, rgba('#0a0503', 0.2));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    odPyroCracks(n, e, true, odHeatCol(0.3 + 0.65 * k), 0.55 + 0.45 * k);
    ctx.globalCompositeOperation = 'lighter';
    // rings closing on the centre
    for (let j = 0; j < 3; j++) {
      const u = 1 - ((n.t * 1.6 + j / 3) % 1);
      ctx.globalAlpha = (0.25 + 0.35 * k) * (1 - u * 0.5); ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2 * px;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * u, 0, TAU); ctx.stroke();
    }
    // the countdown, burning round just inside the wall
    if (k < 1) {
      const rr = n.r * 0.92, ha = -Math.PI / 2 + k * TAU;
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 5 * px;
      ctx.beginPath(); ctx.arc(n.x, n.y, rr, ha, Math.PI * 1.5); ctx.stroke();
      drawGlow(n.x + Math.cos(ha) * rr, n.y + Math.sin(ha) * rr, 18 * px, '#fff7ed', 0.9);
    }
    drawGlow(n.x, n.y, n.r * (0.3 + 0.5 * k), '#f97316', (0.2 + 0.4 * k * (0.6 + 0.4 * pulse)) * pw);
    if (k > 0.85) {
      ctx.globalAlpha = 0.3 * (k - 0.85) / 0.15; ctx.fillStyle = '#fb923c';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const u = clamp((n.t - PYRO_DELAY) / PYRO_AFTER, 0, 1), fade = u < 0.55 ? 1 : 1 - (u - 0.55) / 0.45;
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, 'rgba(5,2,2,0.9)'); g.addColorStop(0.75, 'rgba(20,8,5,0.75)'); g.addColorStop(1, 'rgba(10,5,3,0.2)');
    ctx.globalAlpha = fade; ctx.fillStyle = g;
    odPyroBlot(n, n.r * 0.98); ctx.fill();
    odPyroCracks(n, 1, true, odHeatCol((1 - u) * 0.9), (0.4 + 0.6 * (1 - u)) * fade);
    ctx.globalCompositeOperation = 'lighter';
    const pg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 0.6);
    pg.addColorStop(0, rgba(odHeatCol((1 - u) * 0.85), 0.5 * (1 - u) * fade)); pg.addColorStop(1, rgba('#7f1d1d', 0));
    ctx.globalAlpha = 1; ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 0.6, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// PYROTECHNICS' column, as wide as the ring
function drawOdBrandNuke() {
  const n = P.odStrike && P.odStrike.nuke;
  if (!n || !n.up) return;
  const pw = clamp((n.heat || 60) / (typeof VENT_MAX === 'number' ? VENT_MAX : 100), 0.5, 1);
  const u = clamp((n.t - PYRO_DELAY) / PYRO_AFTER, 0, 1);
  if (u < 0.15) drawGlow(n.x, n.y, n.r * 2.4, '#fff7ed', (1 - u / 0.15) * 0.9 * pw);
  ctx.save();
  ctx.globalAlpha = 1;
  odPyroColumn({ x: n.x, y: n.y, r: n.r, t: n.t, seed: n.seed, hMax: n.r * 1.8 });
  ctx.restore();
  drawGlow(n.x, n.y, n.r * 1.4, '#fde047', 0.35 * (1 - u) * pw);
}

// the prompts: a key cap with its countdown running round the edge, and what it does
function drawOdBrandUi() {
  const st = P.odStrike;
  if (!st) return;
  let key = null, label = '', cost = '', left = -1;
  if ((st.ph === 'tell' || st.ph === 'fire' || st.ph === 'xdone') && !st.ringQ) {
    key = 'Z'; label = 'CIRCLE IT'; cost = String(SCORCH_COST);
    if (st.ph === 'xdone') left = 1 - st.t / BRAND_WINDOW;
  } else if (st.ringQ && !st.nukeQ && st.ph !== 'nuke' && st.ph !== 'cutDown' && st.ph !== 'land') {
    key = 'X'; label = 'BURN IT ALL'; cost = 'ALL ' + Math.floor(P.vent);
    if (st.ph === 'walled') left = 1 - st.t / BRAND_WINDOW;
  }
  const queued = st.ringQ && (st.ph === 'tell' || st.ph === 'fire' || st.ph === 'xdone' || st.ph === 'ring') && !st.nukeQ;
  if (!key) return;
  const hot = left >= 0 && left < 0.35;
  const S = 38, cx = W / 2 - 70, cy = H - 84;
  ctx.save();
  // the cap
  ctx.fillStyle = 'rgba(12,6,4,0.9)'; roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(124,45,18,0.9)'; ctx.lineWidth = 1.5; roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.stroke();
  // the countdown, round its edge
  if (left >= 0) {
    const per = S * 4, run = per * clamp(left, 0, 1);
    ctx.strokeStyle = hot && Math.sin(uiTime * 22) > 0 ? '#fff7ed' : '#fde047'; ctx.lineWidth = 2.5;
    ctx.setLineDash([run, per]); ctx.lineDashOffset = 0;
    roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(uiTime * 6);
    ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 2; roundRect(cx - S / 2, cy - S / 2, S, S, 6); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = "700 18px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = '#fde047'; ctx.fillText(key, cx, cy + 1);
  // what it does
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = "700 17px Barlow, 'Segoe UI', system-ui, sans-serif";
  ctx.fillStyle = '#fde047'; ctx.fillText(label, cx + S / 2 + 12, cy + 1);
  ctx.font = "700 10px 'JetBrains Mono', ui-monospace, monospace";
  ctx.fillStyle = 'rgba(253,186,116,0.8)'; ctx.fillText(cost + ' HEAT', cx + S / 2 + 12, cy + 15);
  if (queued && key === 'X') {
    ctx.fillStyle = 'rgba(168,162,158,0.9)'; ctx.fillText('Z IN', cx + S / 2 + 12, cy - 16);
  }
  ctx.restore();
}

function odBrandQueueFx(st, key) {
  Audio_.tone(key ? 990 : 740, 0.12, 'square', 0.06, key ? 1480 : 1100);
  Audio_.tone(key ? 165 : 220, 0.25, 'sawtooth', 0.04, key ? 80 : 110);
  if (st.mx || st.my) ringFx(st.mx, st.my, 10 * odStrikePx(), 90 * odStrikePx(), key ? '#fff7ed' : '#fde047', 0.35, 3 * odStrikePx());
}

function odBrandRingFx(st, b) {
  odStrikeFireFx(st, b);
}

function odBrandWallFx(g) {
  shakeAt(g.x, g.y, 1.0);
  Audio_.boom();
  Audio_.tone(60, 0.9, 'sawtooth', 0.1, 120);
  ringFx(g.x, g.y, g.r * 0.9, g.r * 1.15, '#fde047', 0.5, 8);
  // it bursts up all the way round at once
  const N = clamp(Math.floor(TAU * g.r / 40), 24, 90);
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    burst(g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r, 2, i % 3 ? '#fb923c' : '#fde047', 360, 3, 0.6, 0.6, -Math.PI / 2);
  }
}

function odBrandWallTouchFx(e, g) {
  // sparks where it meets the wall, thrown back inside
  const a = Math.atan2(e.y - g.y, e.x - g.x);
  const cx = g.x + Math.cos(a) * g.r, cy = g.y + Math.sin(a) * g.r;
  burst(cx, cy, 6, '#fdba74', 220, 2.6, 0.35, 1.4, a + Math.PI);
  burst(cx, cy, 3, '#fde047', 260, 2.2, 0.4, 0.6, -Math.PI / 2);
}

function odBrandWallEndFx(g) {
  Audio_.tone(180, 0.4, 'sine', 0.05, 60);
  if (!odParts()) return;
  const N = clamp(Math.floor(TAU * g.r / 50), 16, 60);
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU;
    spawnPart(g.x + Math.cos(a) * g.r, g.y + Math.sin(a) * g.r, rnd(15, -15), rnd(-20, -60),
              rnd(8, 4), '#44403c', rnd(1.1, 0.6), 0.95, false);
  }
}

function odBrandNukeFx(st, n) {
  Audio_.tone(110, 1.0, 'sawtooth', 0.07, 330);
  Audio_.tone(55, 1.0, 'sine', 0.06, 110);
  ringFx(n.x, n.y, n.r * 1.2, n.r, '#fb923c', 0.4, 3 * odStrikePx());
}

function odBrandNukeEruptFx(n) {
  shakeAt(n.x, n.y, 1.6);
  drawFlashT = Math.max(drawFlashT, 0.4);
  Audio_.boom(); Audio_.boss();
  ringFx(n.x, n.y, n.r * 0.3, n.r * 1.6, '#fde047', 0.6, 10);
  burst(n.x, n.y, 60, '#fb923c', 700, 5, 0.9);
  burst(n.x, n.y, 40, '#fde047', 900, 4.5, 1.0, 0.9, -Math.PI / 2);   // up the column
  burst(n.x, n.y, 16, '#fff7ed', 400, 6, 0.35);
  if (FXO.waves) groundWave(n.x, n.y, { col: '#f97316', amp: 44, speed: 900, width: 200, life: 1.2 });
}

function odBrandNukeHitFx(e, n) {
  burst(e.x, e.y, 10, '#fdba74', 300, 3, 0.45);
  burst(e.x, e.y, 8, '#fde047', 360, 2.8, 0.6, 0.8, -Math.PI / 2);
}

/* ------------------- V — FUSION CORE — art -----------------------------------
   The skin: IFRIT. The djinn of smokeless fire, seen from above the way the
   game sees everything — head to the front, two great ram's horns sweeping
   back and curling off it, a crown of flame, broad charred shoulders with
   magma running in the cracks, and arms reaching forward to cup a sun between
   the hands. No legs: from the waist down it is a coiling tail of fire and
   smoke, lashing as it goes. The mane streams back off the shoulders the way
   the OVERDRIVE vanes did. Each throw goes from one hand, then the other.
   The aura: a sun's surface at exactly 120 — a thin rim, convection turning
   inside it, prominences looping up off the edge and back down.
   The stars: little suns with a corona and a trail; swollen round what they
   hold (a photosphere over the bodies), heating white as the fuse runs down,
   pinched in at the last instant, then a fireball and a shock ring.

   What it is handed:

   P.odFusion — while EMBER is a star (null otherwise); odFusionOn() says so
     t, life   seconds since V, and FUSION_T
     seed
   The hull is the star for as long as it lasts: drawPlayer draws the shields,
   drones, twin and pickup ring as ever, then hands the hull itself — no hull,
   no awarded skin — to drawOdFusionHull, untranslated. OVERDRIVE's vanes
   (odDrawShip) are not drawn; drawOdFusionAura is, in their place.

   odStars — every star in flight
     x, y, ang, vx, vy   where it is and where it is going
     r         its radius now: STAR_R empty, swelling round what it holds
     t         seconds since it was thrown (STAR_LIFE at most)
     held      the bodies inside it (at most STAR_HOLD); they run no script,
               and it carries them round its centre — drawEnemies still draws
               them, underneath whatever this draws
     fuse      seconds left before it goes up, once it has taken one; -1 before
     dead      it has gone up (it is dropped next frame)
     blastR, took   set as it goes up: the blast's radius, how many it held
     seed

   Called from:
     drawOdFusionAura()     world, at the hull's layer, under it: the aura,
                            FUSION_AURA_R from the centre is what burns
     drawOdFusionHull()     world, from drawPlayer: the star-hull (translate
                            to P.x, P.y and turn by P.ang yourself)
     drawOdStars()          world, additive layer: after the giant column
     drawOdFusionScreen()   screen space: after COMBO 1's prompts
     odFusionFx(f)          V pressed: EMBER ignites
     odFusionEndFx(f)       it burns out
     odFusionAuraHitFx(e)   the aura, on a body, every FUSION_AURA_TICK
     odStarThrowFx(s)       a star leaves the hull
     odStarEngulfFx(e, s)   a star takes a body in
     odStarBlowFx(s, R)     a star goes up (before the damage lands)
     odStarHitFx(e, s)      once per body the blast catches that lives
--------------------------------------------------------------------------- */
let odFusionLitAt = -99, odFusionOutAt = -99, odFusionThrow = { at: -99, hand: 1 };
const odStarBooms = [];

// a point in the hull's own frame, out in the world
function odIfritAt(lx, ly) {
  const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  return [P.x + lx * ca - ly * sa, P.y + lx * sa + ly * ca];
}
const odFusionK = f => f ? clamp((f.t - 0.7) / 0.5, 0, 1) * clamp((f.life - f.t - 0.45) / 0.45, 0, 1) : 1;

// the aura: a sun's surface, rim at exactly what burns
function drawOdFusionAura() {
  const f = P.odFusion;
  if (!f) return;
  const R = FUSION_AURA_R, k = odFusionK(f);
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(P.x, P.y, R * 0.2, P.x, P.y, R);
  g.addColorStop(0, rgba('#fde047', 0.16 * k)); g.addColorStop(0.7, rgba('#f97316', 0.09 * k)); g.addColorStop(1, rgba('#b91c1c', 0.14 * k));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.fill();
  // convection, turning: three broken rings going opposite ways
  ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const rr = R * (0.45 + j * 0.17), dir = j % 2 ? -1 : 1;
    ctx.setLineDash([rr * 0.18, rr * 0.3]); ctx.lineDashOffset = dir * uiTime * (30 + j * 12);
    ctx.globalAlpha = (0.18 + 0.06 * Math.sin(uiTime * 3 + j)) * k; ctx.strokeStyle = j === 1 ? '#fde047' : '#fb923c';
    ctx.lineWidth = 3 - j * 0.6;
    ctx.beginPath(); ctx.arc(P.x, P.y, rr, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]);
  // prominences: loops rising off the rim and falling back
  for (let i = 0; i < 7; i++) {
    const ph = (uiTime * 0.35 + i / 7 + (f.seed || 0)) % 1, life = Math.sin(ph * Math.PI);
    const a = i * TAU / 7 + uiTime * 0.15 + Math.sin(i * 3.1) * 0.4, span = 0.18 + 0.08 * Math.sin(i * 1.7);
    const h = R * (0.1 + 0.22 * life);
    const x1 = P.x + Math.cos(a - span) * R, y1 = P.y + Math.sin(a - span) * R;
    const x2 = P.x + Math.cos(a + span) * R, y2 = P.y + Math.sin(a + span) * R;
    const cx = P.x + Math.cos(a) * (R + h * 2), cy = P.y + Math.sin(a) * (R + h * 2);
    ctx.globalAlpha = 0.5 * life * k; ctx.strokeStyle = '#f97316'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
    ctx.globalAlpha = 0.7 * life * k; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
  }
  // the rim itself
  ctx.globalAlpha = (0.55 + 0.15 * Math.sin(uiTime * 5)) * k; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.25 * k; ctx.strokeStyle = '#fb923c'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* The change, both ways, as one body contorting in real time. EMBER's hull
   and IFRIT's silhouette are both laid out as the same number of points round
   the outline — nose to nose, shoulders to arms, exhaust notch to tail — and
   the hull's outline is dragged point by point into the djinn's: the prong
   splits into a head and two reaching hands, the hammer shoulders swell into
   arms, the notch pulls out into the lashing tail. It writhes while it
   changes, runs white-hot through the middle of it, and cools to char. The
   hull's rail and vanes burn off first; horns, eyes, mane and the fire of the
   tail grow out of the new shape once it has it. Out is the same, backwards,
   ending on EMBER's own hull in its own red. */
// FUSION_IN and FUSION_OUT (the change in, and back) are the logic's: the stars and the aura wait on them too
const OD_MORPH_N = 36;                                   // points per half
const OD_HULL_HALF = [[22, 0], [13, 2.6], [9, 7], [2, 13.5], [-7, 12], [-5, 4.6], [-12, 3.2], [-9, 0]];
const OD_IFRIT_HALF = [[16, 0], [13, 3.6], [15.5, 5.6], [23, 7.5], [19, 10.5], [9.5, 20], [1, 16], [-6, 10.5], [-10, 5], [-24, 6.5], [-46, 0]];
// a half outline, resampled to n points evenly along its length
function odResample(pts, n) {
  const segs = [], cum = [0];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); cum.push(cum[i - 1] + d); }
  const L = cum[cum.length - 1], out = [];
  for (let j = 0; j < n; j++) {
    const d = L * j / (n - 1);
    let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
    const u = segs[i - 1] ? (d - cum[i - 1]) / segs[i - 1] : 0;
    out.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]);
  }
  return out;
}
const OD_HULL_R = odResample(OD_HULL_HALF, OD_MORPH_N), OD_IFRIT_R = odResample(OD_IFRIT_HALF, OD_MORPH_N);
const odBackOut = u => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
const odSub = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
// 0 EMBER … 1 IFRIT
function odFusionForm(f) {
  if (!f) return 1;
  const tin = f.t, tout = f.life - f.t;
  if (tout < FUSION_OUT) return osEase(odSub(tout, 0.08, FUSION_OUT - 0.05));
  return odSub(tin, 0.12, FUSION_IN);
}

/* IFRIT. All in the hull's frame: x forward, y to the right. */
function drawOdFusionHull() {
  const f = P.odFusion, t = uiTime;
  const hurt = P.hurtFlash > 0;
  const tin = f ? f.t : 9, tout = f ? f.life - f.t : 9;
  const going = tout < FUSION_OUT;
  const form = odFusionForm(f);
  const m = going ? form : odBackOut(form);             // the shape: overshoots a touch on the way in
  const writhe = Math.sin(Math.PI * clamp(form, 0, 1));  // how hard it is contorting, mid-change
  const hot = Math.max(writhe, going ? 0 : 1 - odSub(tin, 0, 0.12) * 0) * (form < 1 ? 1 : 0);
  const heat = clamp(writhe * 1.2, 0, 1);
  const detail = odSub(form, 0.72, 1);                   // IFRIT's features, once it has the shape
  const hullDet = 1 - odSub(form, 0, 0.25);              // EMBER's, burning off
  const thrown = clamp(1 - (t - odFusionThrow.at) / 0.22, 0, 1) * detail;
  const tailK = odSub(form, 0.35, 1);

  ctx.save();
  ctx.translate(P.x, P.y);
  const shiv = writhe * 1.2;
  ctx.translate(Math.sin(t * 73) * shiv, Math.cos(t * 67) * shiv);

  // fire dragged in round it (in) or thrown off it (out) while it changes
  if (writhe > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const q = ((i / 12) + t * (going ? 0.9 : -0.9) + 10) % 1;
      const r = going ? 14 + q * 56 : 70 - q * 56;
      const an = i * TAU / 12 + t * (going ? 4 : -5) + q * 2;
      ctx.globalAlpha = 0.5 * writhe * Math.sin(q * Math.PI);
      ctx.fillStyle = i % 3 ? '#fb923c' : '#fde047';
      odFlameLeaf(ctx, Math.cos(an) * r, Math.sin(an) * r, an + (going ? 1.9 : -1.9), 9 + 7 * writhe, 2.4, 3); ctx.fill();
    }
    drawGlow(0, 0, 44 + 20 * writhe, '#f97316', 0.4 * writhe);
    ctx.restore();
  }

  ctx.rotate(P.ang);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // ---- the outline, dragged from one body to the other
  const N = OD_MORPH_N;
  const half = (sd) => {
    const pts = [];
    for (let j = 0; j < N; j++) {
      const u = j / (N - 1);
      // the front changes first and the tail last, so it runs down the body
      const mj = clamp(m * 1.25 - u * 0.25, 0, 1.15);
      const H = OD_HULL_R[j], I = OD_IFRIT_R[j];
      let x = lerp(H[0], I[0], mj), y = lerp(H[1], I[1], mj);
      // the throwing hand reaches
      if (sd === odFusionThrow.hand && u > 0.12 && u < 0.45) { const w = Math.sin(odSub(u, 0.12, 0.45) * Math.PI); x += thrown * 8 * w; y -= thrown * 3 * w; }
      // the tail lashes
      const tw = odSub(u, 0.62, 1) * mj;
      y = y * sd + Math.sin(u * 7 - t * 7) * (2 + 9 * odSub(u, 0.7, 1)) * tw + Math.sin(t * 2.3) * 4 * tw * u;
      // it writhes while it changes
      const wr = writhe * (1.6 + 1.4 * Math.sin(u * 9 + t * 17 + sd));
      x += Math.cos(u * 13 + t * 21) * wr * 0.6; y += Math.sin(u * 11 - t * 19) * wr * sd * 0.8;
      pts.push([x, y]);
    }
    return pts;
  };
  const R = half(1), L = half(-1).reverse();
  const outline = () => {
    ctx.beginPath();
    R.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    L.forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
  };

  // the tail's fire, behind the body, as the tail pulls out
  if (tailK > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tip = R[N - 1];
    for (let i = 0; i < 7; i++) {
      const j = Math.floor(N * (0.66 + i * 0.045)), p = R[Math.min(N - 1, j)], q = L[Math.max(0, N - 1 - j)];
      const cx = (p[0] + q[0]) / 2, cy = (p[1] + q[1]) / 2, sd = i % 2 ? 1 : -1;
      ctx.globalAlpha = 0.55 * tailK; ctx.fillStyle = i % 3 ? '#fb923c' : '#fde047';
      odFlameLeaf(ctx, cx, cy, Math.PI + sd * 0.8, (8 + 5 * Math.sin(t * 9 + i)) * tailK, 2.4, sd * 3); ctx.fill();
    }
    drawGlow(tip[0], tip[1], 12 * tailK, '#fb923c', 0.5 * tailK);
    ctx.restore();
    for (let j = 0; j < 4; j++) {                                    // smoke off its end
      const u = ((t * 0.9 + j / 4) % 1);
      ctx.globalAlpha = 0.2 * (1 - u) * tailK; ctx.fillStyle = '#1c1917';
      ctx.beginPath(); ctx.arc(tip[0] - u * 12, tip[1] + Math.sin(t * 3 + j) * 3, 3 + u * 7, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // the mane, behind the shoulders as they swell
  if (detail > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sd of [1, -1]) for (let i = 0; i < 6; i++) {
      const q = i / 5, fl = 0.85 + 0.15 * Math.sin(t * (7 + i) + i * 2 + sd);
      const rx = 8 - q * 12, ry = sd * (5 + q * 9), dir = Math.PI - sd * (0.25 + q * 0.35);
      const Ln = (14 + 16 * Math.sin((0.25 + q * 0.75) * Math.PI)) * fl * detail;
      ctx.globalAlpha = 0.3 * detail; ctx.fillStyle = '#ea580c';
      odFlameLeaf(ctx, rx, ry, dir, Ln, 3.2, sd * (4 + q * 5)); ctx.fill();
      ctx.globalAlpha = 0.55 * detail; ctx.fillStyle = q < 0.4 ? '#fff7ed' : '#fdba74';
      odFlameLeaf(ctx, rx, ry, dir, Ln * 0.55, 1.3, sd * (2 + q * 2)); ctx.fill();
    }
    ctx.restore();
  }

  // the glow off its own edge (the hull's), then the body itself
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const edge = odMixHex('#f87171', '#fb923c', form);
  for (let i = 4; i >= 1; i--) {
    ctx.lineWidth = 2.4 + i * 3.4; ctx.strokeStyle = rgba(heat > 0.3 ? '#fde047' : edge, (0.05 * (1 - i / 5.5) + 0.012) * (1 + heat * 2));
    outline(); ctx.stroke();
  }
  ctx.restore();
  // fill: EMBER's tinted glass → white-hot through the change → char
  const white = heat;
  const base0 = odMixHex('#3a1414', '#2a1208', form), base1 = odMixHex('#3a1414', '#0c0504', form);
  const bg = ctx.createLinearGradient(14, 0, -30, 0);
  bg.addColorStop(0, hurt ? '#7f1d1d' : odMixHex(base0, '#fde047', white));
  bg.addColorStop(1, hurt ? '#450a0a' : odMixHex(base1, '#f97316', white));
  outline();
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = hurt ? '#fecaca' : odMixHex(edge, '#fff7ed', white); ctx.lineWidth = lerp(2.4, 1.3, form); ctx.stroke();

  // EMBER's rail and vanes, burning off as the shape goes
  if (hullDet > 0.01 && typeof hullDetail === 'function') {
    ctx.save(); ctx.globalAlpha = hullDet;
    hullDetail('#f87171');
    ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.ellipse(-1.4, 0, 2.5, 1.8, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // cracks in it: running white through the change, magma once it has settled
  ctx.save();
  outline(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const br = 0.55 + 0.45 * Math.sin(t * 3.3);
  ctx.globalAlpha = Math.min(1, (0.45 + 0.4 * br) * detail + heat * 0.9);
  ctx.strokeStyle = heat > 0.4 ? '#fff7ed' : '#fb923c'; ctx.lineWidth = 1.1 + heat;
  ctx.beginPath();
  ctx.moveTo(8, 0); ctx.lineTo(1, -1.5); ctx.lineTo(-4, 0.5); ctx.lineTo(-10, -0.5);
  for (const sd of [1, -1]) { ctx.moveTo(3, sd * 1); ctx.lineTo(1, sd * 6); ctx.lineTo(3, sd * 11); ctx.lineTo(8, sd * 16); ctx.moveTo(-2, sd * 1.5); ctx.lineTo(-5, sd * 6); ctx.moveTo(4, sd * 7); ctx.lineTo(14, sd * 7.5); }
  ctx.stroke();
  const core = ctx.createRadialGradient(-8, 0, 0, -8, 0, 10);
  core.addColorStop(0, rgba('#fde047', 0.7 * form)); core.addColorStop(1, rgba('#f97316', 0));
  ctx.globalAlpha = 1; ctx.fillStyle = core; ctx.fillRect(-20, -12, 18, 24);
  ctx.restore();

  // ---- the head: crown, horns growing along their curl, eyes opening last
  if (detail > 0.01) {
    const HX = 11;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const an = Math.PI + (i - 2) * 0.32, Ln = (7 + 3 * Math.sin(t * 11 + i * 1.9)) * detail;
      ctx.globalAlpha = 0.6 * detail; ctx.fillStyle = i === 2 ? '#fff7ed' : '#fdba74';
      odFlameLeaf(ctx, HX - 2, (i - 2) * 1.2, an, Ln, 1.6, (i - 2) * 1.5); ctx.fill();
    }
    ctx.restore();
    const hornK = odEaseOut(detail);
    for (const sd of [1, -1]) {
      ctx.save();
      ctx.translate(HX + 1, sd * 2.6); ctx.rotate(sd * (1 - hornK) * 0.9); ctx.scale(hornK, hornK); ctx.translate(-(HX + 1), -sd * 2.6);
      ctx.beginPath();
      ctx.moveTo(HX + 1, sd * 2.6);
      ctx.bezierCurveTo(HX + 4, sd * 9, HX - 4, sd * 16, HX - 10, sd * 15);
      ctx.bezierCurveTo(HX - 14, sd * 14, HX - 12, sd * 9, HX - 8, sd * 10.5);
      ctx.bezierCurveTo(HX - 6, sd * 12, HX - 3, sd * 10, HX - 2, sd * 5);
      ctx.closePath();
      ctx.fillStyle = hurt ? '#fecaca' : odMixHex('#fde68a', '#44403c', hornK); ctx.fill();
      ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = 'rgba(12,5,4,0.7)'; ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let r = 0; r < 4; r++) { const u = 0.25 + r * 0.17; ctx.moveTo(HX + 2 - u * 12, sd * (4 + u * 10)); ctx.lineTo(HX - 1 - u * 12, sd * (6 + u * 9)); }
      ctx.stroke();
      ctx.restore();
    }
    const eyeK = odSub(detail, going ? 0.3 : 0.6, 1);
    if (eyeK > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const glint = going ? 0 : Math.max(0, 1 - Math.abs(eyeK - 0.6) / 0.4);
      for (const sd of [1, -1]) {
        drawGlow(HX + 2.6, sd * 1.8, 4.5 + 8 * glint, '#fde047', 0.8 * eyeK);
        ctx.globalAlpha = eyeK; ctx.fillStyle = '#fff7ed';
        ctx.beginPath(); ctx.ellipse(HX + 2.8, sd * 1.8, 1.4, 0.6 * eyeK, sd * 0.4, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // claws on the hands the prong became
    ctx.strokeStyle = '#fed7aa'; ctx.lineWidth = 0.9; ctx.globalAlpha = detail;
    for (const sd of [1, -1]) {
      const hp = (sd === 1 ? R : L.slice().reverse())[Math.round((N - 1) * 0.2)];
      ctx.beginPath();
      for (let c = -1; c <= 1; c++) { ctx.moveTo(hp[0] - 1, hp[1] + c * 1.4); ctx.lineTo(hp[0] + 2.6, hp[1] + c * 1.9 - sd * 0.6); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // the sun between the hands
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const held = (1 - thrown) * detail, sr = 3.2 + 1.2 * Math.sin(t * 9);
    drawGlow(22, 0, 14 * held, '#f97316', 0.6 * held);
    drawGlow(22, 0, 7 * held, '#fde047', 0.8 * held);
    ctx.globalAlpha = held; ctx.fillStyle = '#fff7ed';
    ctx.beginPath(); ctx.arc(22, 0, sr * held, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  if (odParts()) {
    if (writhe > 0.05 && Math.random() < 0.9 * writhe) {           // the change throwing sparks off its edge
      const p = R[Math.floor(Math.random() * N)], sd = Math.random() < 0.5 ? 1 : -1;
      const w = odIfritAt(p[0], p[1] * sd);
      spawnPart(w[0], w[1], rnd(80, -80), rnd(80, -80), rnd(2.4, 1), Math.random() < 0.4 ? '#fff7ed' : '#fde047', rnd(0.35, 0.15), 0.9);
    }
    if (form > 0.6 && Math.random() < 0.4 * form) {
      const p = odIfritAt(-20 - Math.random() * 20, rnd(8, -8));
      spawnPart(p[0], p[1], rnd(20, -20), rnd(-30, -80), rnd(2, 0.8), Math.random() < 0.4 ? '#fde047' : '#fb923c', rnd(0.6, 0.3), 0.93);
    }
  }
  // the moment it is whole, and the moment it lets go
  if (f && !going && form >= 1 && !f._lit) { f._lit = true; ringFx(P.x, P.y, 16, FUSION_AURA_R * 1.4, '#fff7ed', 0.45, 3); burst(P.x, P.y, 24, '#fde047', 340, 3.4, 0.5); }
  if (f && going && form <= 0.02 && !f._out) { f._out = true; ringFx(P.x, P.y, 50, 12, '#fb923c', 0.3, 3); }
}

// the stars, and the fireballs they leave
function drawOdStars() {
  for (const s of odStars) {
    if (s.dead) continue;
    const hot = s.fuse >= 0 ? clamp(1 - s.fuse / STAR_FUSE, 0, 1) : 0;
    const pinch = hot > 0.85 ? 1 - 0.25 * (hot - 0.85) / 0.15 : 1;
    const r = s.r * pinch, fl = 0.9 + 0.1 * Math.sin(uiTime * 30 + s.seed);
    const sp = Math.hypot(s.vx || 0, s.vy || 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    // the trail
    if (sp > 20) {
      const L = Math.min(sp * 0.09, r * 5), ux = s.vx / sp, uy = s.vy / sp;
      const g = ctx.createLinearGradient(s.x - ux * L, s.y - uy * L, s.x, s.y);
      g.addColorStop(0, rgba('#b91c1c', 0)); g.addColorStop(1, rgba('#fb923c', 0.6));
      ctx.strokeStyle = g; ctx.lineWidth = r * 1.3;
      ctx.beginPath(); ctx.moveTo(s.x - ux * L, s.y - uy * L); ctx.lineTo(s.x, s.y); ctx.stroke();
    }
    drawGlow(s.x, s.y, r * 2.6, '#f97316', 0.45 * fl);
    // the photosphere: over whatever it holds, so they show through it
    const held = s.held && s.held.length;
    const pg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    pg.addColorStop(0, rgba('#fff7ed', held ? 0.5 + 0.4 * hot : 0.95));
    pg.addColorStop(held ? 0.35 : 0.5, rgba('#fde047', held ? 0.3 + 0.3 * hot : 0.8));
    pg.addColorStop(1, rgba('#f97316', 0.35 + 0.3 * hot));
    ctx.fillStyle = pg; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.fill();
    // granulation, turning
    ctx.setLineDash([r * 0.3, r * 0.45]); ctx.lineDashOffset = uiTime * 40;
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fde68a'; ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.7, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    // the corona: licks round the limb
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + uiTime * 1.2 + s.seed, L = r * (0.35 + 0.25 * Math.sin(uiTime * 14 + i * 2.1)) * (1 + hot);
      ctx.globalAlpha = 0.5; ctx.fillStyle = i % 3 ? '#fb923c' : '#fde047';
      odFlameLeaf(ctx, s.x + Math.cos(a) * r * 0.9, s.y + Math.sin(a) * r * 0.9, a, L, r * 0.12, 0); ctx.fill();
    }
    // the limb, flashing as the fuse runs out
    ctx.globalAlpha = 0.9; ctx.strokeStyle = hot > 0.5 && Math.sin(uiTime * (30 + 50 * hot)) > 0 ? '#fff7ed' : '#fdba74';
    ctx.lineWidth = 1.5 + 2 * hot;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, TAU); ctx.stroke();
    if (hot > 0) drawGlow(s.x, s.y, r * (1 + hot), '#fff7ed', 0.5 * hot);
    ctx.restore();
  }
  // fireballs: a white flash, the ball swelling and cooling, the shock running out
  for (let i = odStarBooms.length - 1; i >= 0; i--) {
    const b = odStarBooms[i], u = (uiTime - b.at) / 0.5;
    if (u >= 1) { odStarBooms.splice(i, 1); continue; }
    const e = odEaseOut(u);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (u < 0.15) drawGlow(b.x, b.y, b.R * 1.2, '#fff7ed', (1 - u / 0.15) * 0.9);
    const fg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.R * (0.4 + 0.5 * e));
    fg.addColorStop(0, rgba(odHeatCol(1 - u * 0.8), 0.8 * (1 - u)));
    fg.addColorStop(0.6, rgba(odHeatCol(0.7 - u * 0.6), 0.5 * (1 - u)));
    fg.addColorStop(1, rgba('#7f1d1d', 0));
    ctx.fillStyle = fg; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.R * (0.4 + 0.5 * e), 0, TAU); ctx.fill();
    ctx.globalAlpha = (1 - u) * 0.9; ctx.strokeStyle = '#fde047'; ctx.lineWidth = 5 * (1 - u) + 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.R * (0.3 + 0.75 * e), 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

// the frame: the ignition flash, a warm edge while it burns, and smoke as it goes out
function drawOdFusionScreen() {
  const f = P.odFusion;
  const a = f ? Math.max(0, 1 - Math.abs(f.t - FUSION_IN) / 0.35) * 0.7 : 0;
  const o = 1 - (uiTime - odFusionOutAt) / 0.6;
  if (a <= 0 && o <= 0 && !f) return;
  ctx.save();
  if (f) {
    const k = odFusionK(f);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(249,115,22,' + (0.07 + 0.02 * Math.sin(uiTime * 2)) * k + ')');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  if (a > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,247,237,' + 0.45 * a * a + ')'); g.addColorStop(1, 'rgba(253,224,71,' + 0.2 * a * a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (o > 0) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(28,25,23,' + 0.25 * o * o + ')'; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function odFusionFx(f) {
  odFusionLitAt = uiTime;
  shake(1.2);
  Audio_.boom(); Audio_.levelup();
  ringFx(P.x, P.y, 20, FUSION_AURA_R * 2.2, '#fde047', 0.6, 6);
  burst(P.x, P.y, 50, '#fde047', 420, 4, 0.8);
  burst(P.x, P.y, 20, '#fff7ed', 260, 5, 0.4);
}

// the djinn goes back to smoke
function odFusionEndFx(f) {
  odFusionOutAt = uiTime;
  Audio_.tone(260, 0.5, 'sine', 0.06, 90);
  burst(P.x, P.y, 20, '#fb923c', 200, 3, 0.5);
  if (!odParts()) return;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * TAU, v = rnd(90, 30);
    spawnPart(P.x + Math.cos(a) * 10, P.y + Math.sin(a) * 10, Math.cos(a) * v, Math.sin(a) * v - 30,
              rnd(10, 5), '#292524', rnd(1.2, 0.7), 0.95, false);
  }
}

function odFusionAuraHitFx(e) {
  if (Math.random() < 0.4) burst(e.x, e.y, 2, '#fdba74', 120, 2.2, 0.3);
  if (Math.random() < 0.3) spawnPart(e.x + rnd(e.r, -e.r), e.y, rnd(10, -10), rnd(-40, -90), rnd(1.8, 0.8), '#fde047', rnd(0.5, 0.25), 0.93);
}

// from one hand, then the other
function odStarThrowFx(s) {
  odFusionThrow.hand = -odFusionThrow.hand;
  odFusionThrow.at = uiTime;
  Audio_.tone(620, 0.08, 'sine', 0.04, 900);
  const p = odIfritAt(20, odFusionThrow.hand * 6);
  burst(p[0], p[1], 6, '#fde047', 180, 2.4, 0.25, 0.9, s.ang);
}

function odStarEngulfFx(e, s) {
  burst(e.x, e.y, 8, '#fde047', 200, 2.6, 0.3, 1.2, Math.atan2(s.y - e.y, s.x - e.x));
  Audio_.tone(300, 0.1, 'sawtooth', 0.04, 520);
}

function odStarBlowFx(s, R) {
  odStarBooms.push({ x: s.x, y: s.y, R, at: uiTime });
  if (odStarBooms.length > 24) odStarBooms.shift();
  shakeAt(s.x, s.y, 0.35 + 0.1 * s.took);
  Audio_.boom();
  ringFx(s.x, s.y, s.r, R, '#fde047', 0.35, 4);
  burst(s.x, s.y, 20 + 8 * s.took, '#fb923c', 420, 3.6, 0.5);
  burst(s.x, s.y, 8, '#fff7ed', 260, 4.5, 0.25);
}

function odStarHitFx(e, s) {
  burst(e.x, e.y, 5, '#fdba74', 220, 2.6, 0.3);
}

/* ================ end of OVERDRIVE'S KIT art hooks ================ */
