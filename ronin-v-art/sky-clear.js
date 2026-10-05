/* ===================== V: LAST VOW — SKY CLEAR (art, 5 Oct) =====================
   The vow's last technique, the secret full sequence of CLEAR SKY. Where CLEAR SKY
   was water and wind, this tears the sky itself down: the vow's Z, X and C world
   (crimson, the dead, his true form) at its biggest. And when it is over, the sky
   is what the name says: clear, his intro's night, the gold moon in it.
     THE SKY BREAKS  he rises: his true form stands up out of him to full height,
                     blade straight up; a pillar of crimson goes up off him and the
                     dead spiral up it; the top of the frame tears open onto the
                     realm of the dead, the cut-in's blood moon hanging in it, pieces
                     of the sky falling. The seal, 天晴, is stamped into torn bars.
     STORM           his true form strides to the grave and stands over it, blade
                     high. He goes as crimson lightning, his phantoms strung down each
                     path; each one tears open onto the dead as he lands, lightning
                     running it and the dead's arms bursting out, a thunder ring at
                     his feet, and the leaps to the bodies beside are forked bolts.
                     The paths stay lit: a web across the room.
     THE FALL        out of the torn sky onto the grave, a comet down a column of
                     light; the whole web tears open again at once, the frame cracks.
     CLEAR           the held breath: the frame goes black but for the two of them;
                     the web cools; his true form draws its blade back, shaking, and a
                     hairline crosses the whole frame at his height.
     the cut         the true form sweeps its blade across: one cut through the room.
                     The frame splits along it, the torn sky breaks away, and behind it
                     is the clear night: the gold moon and its ensō, petals falling,
                     the seal gone gold. The grave sinks into the floor.
     the price       it cut and killed nothing: NOTHING FELL, in ash, and he gutters.
   Hooks, in place of the placeholders': drawRoninSkyClear(sc) (glow pass, from
   drawRoninVowWorld), drawRoninSkyClearScreen(sc) (from drawRoninVowScreen),
   roninSkyClearFx, roninSkyClearLandFx, roninSkyClearHitFx, roninSkyClearCutFx and
   roninSkyClearPriceFx. Outside this block: drawRoninGrave sinks the post through
   'out' (its V lines, in the model's art), and the price's seal is drawn after the
   vow has ended by vksAfter, the last line of the Z block's vkzWorld (drawRoninVowWorld
   goes on drawing it once the vow is over; drawRoninVowScreen doesn't).
   His true form and THE FALL's column are drawn from the screen pass through the
   room's transform (vksWorld), so they stand in front of the torn sky.
   It reads skyClearPhase() (t, st, stage, i, x0, y0, x1, y1, segs), P, P.roninGrave,
   arena, camZoom, vraToScreen and the SC_* timings, and changes nothing of the
   logic's. Art state in VKS. It needs the vow's Z block (vkz*) and X block (vkxTear,
   vkxBolt, vkxGhost, VKX).
=================================================================================== */
Object.assign(VKZ_KANJI, { 'SKY CLEAR': '天晴', 'NOTHING FELL': '空' });
let VKS = { at: {}, lands: [], hits: [], fx: 0, fy: 0, cutAt: -9, cutX: 0, cutY: 0, priceAt: -9, seed: 1, buf: null };
const vksQ = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const VKS_FORM = 300;                              // his true form's height, in the room

// a brush stroke round (x, y), filled as one shape so it doesn't bead as vraBrushArc does when it is
// large. enso: thick where it starts, thinning and drying out toward its end, as an ensō is brushed
function vksArc(x, y, r, a0, sweep, lw, col, a, enso) {
  if (a <= 0.01 || Math.abs(sweep) < 0.01 || lw <= 0.1) return;
  const N = Math.max(12, Math.ceil(Math.abs(sweep) / 0.04)), out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, an = a0 + sweep * u;
    const w = lw * (enso ? clamp(u * 10, 0, 1) * (1.15 - 0.85 * u) : Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.04, 0, 1)), 0.6))
                 * (0.88 + 0.12 * Math.sin(u * 13 + a0 * 5));
    const rr = r + Math.sin(u * 4 + a0 * 3) * lw * 0.25;
    out.push([x + Math.cos(an) * (rr + w / 2), y + Math.sin(an) * (rr + w / 2)]);
    inn.push([x + Math.cos(an) * (rr - w / 2), y + Math.sin(an) * (rr - w / 2)]);
  }
  ctx.beginPath();
  out.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  for (let i = inn.length - 1; i >= 0; i--) ctx.lineTo(inn[i][0], inn[i][1]);
  ctx.closePath();
  ctx.fillStyle = rgba(col, a); ctx.fill();
}

/* --------------------------------- in the room --------------------------------- */
// where his true form stands: over him as he rises, then striding to the grave and over it
function vksFormAt(sc) {
  const g = P.roninGrave, home = g ? { x: g.x, y: g.y + 30 } : { x: VKS.fx, y: VKS.fy };
  if (sc.stage === 'rise') return { x: VKS.fx, y: VKS.fy };
  const k = VKS.at.storm === undefined ? 1 : vraEase((uiTime - VKS.at.storm) / 0.3);
  return { x: lerp(VKS.fx, home.x, k), y: lerp(VKS.fy, home.y, k) };
}
// the room's transform, from the screen pass: what is drawn through it stands in the room but over
// the screen's layers (his true form, in front of the torn sky)
function vksWorld(fn) {
  const o = vraToScreen(0, 0);
  ctx.save();
  ctx.translate(o.x, o.y); ctx.scale(camZoom, camZoom);
  fn();
  ctx.restore();
}
// his true form: up out of him; over the grave, blade high; drawn back, shaking, through the held
// breath; swept across on the cut, and gone. Drawn from the screen pass, in front of the torn sky
function vksTrueForm(sc) {
  const t = uiTime, st = sc.stage, H = VKS_FORM, p = vksFormAt(sc), tr = 0.04 * Math.sin(t * 37);
  let rise = 1, gone = 0, ba = -Math.PI / 2 - 0.25 + tr;
  if (st === 'rise') { rise = vraOut(sc.st / SC_RISE); ba = -Math.PI / 2 + tr * 0.5; }
  else if (st === 'storm' || st === 'fall') {      // watching over the grave while he storms: dimmer, so he reads through it
    gone = st === 'fall' ? 0.5 * (1 - vraEase(sc.st / SC_FALL_T)) : 0.5 * vraEase((uiTime - (VKS.at.storm || 0)) / 0.3);
  }
  else if (st === 'clear') { const k = vraEase(sc.st / SC_HOLD); ba = lerp(-Math.PI / 2 - 0.25, -Math.PI + 0.2, k) + tr * (1 + 2 * k); }
  else if (st === 'out') { ba = lerp(-Math.PI + 0.2, 0.3, vraOut(sc.st / 0.12)); gone = vraEase((sc.st - 0.12) / (SC_OUT - 0.12)); }
  const lift = st === 'out' ? 0 : 0.1 * H * gone;  // only the last 'gone' lifts it away; the dimming doesn't
  vkzSpecter(p.x, p.y + lift, H, rise, gone, ba, 1, 1, true);
  if (st === 'out' && sc.st < 0.25) {              // its stroke, brushed across behind the blade
    const sx = p.x - 0.17 * H, sy = p.y - 0.66 * H - 0.1 * H * gone;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    vksArc(sx, sy, 0.8 * H, -Math.PI + 0.2, (Math.PI + 0.1) * vraOut(sc.st / 0.12), H * 0.07, VKZ_CRIM, 0.6 * (1 - sc.st / 0.25));
    vksArc(sx, sy, 0.8 * H, -Math.PI + 0.2, (Math.PI + 0.1) * vraOut(sc.st / 0.12), H * 0.025, VKZ_PALE, 0.8 * (1 - sc.st / 0.25));
    ctx.restore();
  }
}
// THE SKY BREAKS: a pillar of crimson up off him, a ring out round his feet
function vksRise(sc) {
  const q = vraOut(sc.st / SC_RISE), x = VKS.fx, y = VKS.fy, fl = 0.85 + 0.15 * Math.sin(uiTime * 31);
  vraLens(x, y + 10, x, y - 900 * q, 44 * q + 4, VKZ_CRIM, 0.4 * fl);
  vraLens(x, y + 6, x, y - 860 * q, 16 * q + 2, VKZ_HOT, 0.6 * fl);
  vraLens(x, y, x, y - 820 * q, 5 * q + 1, VKZ_PALE, 0.9);
  drawGlow(x, y, 60 + 70 * q, VKZ_CRIM, 0.6);
  ctx.strokeStyle = rgba(VKZ_HOT, 0.75 * (1 - q)); ctx.lineWidth = 3 * (1 - q) + 0.6;
  ctx.beginPath(); ctx.arc(x, y, 20 + 170 * q, 0, TAU); ctx.stroke();
}
// a path tearing open onto the dead: lightning running it, arms bursting out of its lips (big: wider, for the web's second split)
function vksTearAt(s, es, seed, big, i) {
  if (es < 0) return;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ov = 12;
  const X1 = s.x1 - ux * ov, Y1 = s.y1 - uy * ov, X2 = s.x2 + ux * ov, Y2 = s.y2 + uy * ov;
  const head = vraOut(es / 0.06), tail = vraEase((es - 0.24) / 0.4);
  if (tail >= 1) return;
  const open = vraOut(es / 0.08) * (1 - 0.4 * tail), w = clamp(L / 22, 5, 10) * big * open;
  vkxTear(lerp(X1, X2, tail), lerp(Y1, Y2, tail), lerp(X1, X2, head), lerp(Y1, Y2, head), w, seed, 1);
  if (es < 0.32) vkxBolt(s.x1, s.y1, s.x2, s.y2, seed + Math.floor(uiTime * 30), 1.6 * big, 1 - es / 0.32, true);
  if (head < 1) drawGlow(lerp(X1, X2, head), lerp(Y1, Y2, head), 26 * big, VKZ_PALE, 0.8);
  const k = es < 0.12 ? vraOut(es / 0.12) : 1 - vraEase((es - 0.3) / 0.35);
  if (k > 0.02) for (let u0 = 40; u0 < L; u0 += big > 1 ? 70 : 90) {
    const j = Math.floor(u0 / 40) + i * 7, sd = j % 2 ? 1 : -1, h = vraH(seed + j * 3.7);
    vkzArm(s.x1 + ux * u0 - uy * sd * w * 0.6, s.y1 + uy * u0 + ux * sd * w * 0.6, Math.atan2(ux * sd, -uy * sd) + (h - 0.5) * 0.8,
           6 + 16 * k, 0.35 + 0.4 * Math.sin(es * 10 + j), 24 + 6 * h, k);
  }
}
// STORM's web: every path so far torn open as he landed, then lit, a light running each; torn open again
// all at once when he falls; cooling through the held breath; gone with the cut
function vksWeb(sc) {
  const t = uiTime, st = sc.stage, webE = VKS.at.clear === undefined ? -1 : t - VKS.at.clear;
  const cool = st === 'clear' ? vraEase(sc.st / SC_HOLD) : 0, left = st === 'out' ? 1 - vraEase(sc.st / 0.2) : 1;
  sc.segs.forEach((s, i) => {
    const land = VKS.lands[i], e = land ? t - land.at : 9, seed = land ? land.seed : i * 17 + 3;
    if (e < 0.7) vksTearAt(s, e, seed, 1, i);
    if (webE >= 0 && webE < 0.75) vksTearAt(s, webE - i * 0.012, seed + 5, 1.5, i);
    if (left <= 0.01) return;
    const a = (e > 0.35 ? 1 : vraOut(e / 0.35)) * (1 - 0.7 * cool) * left;
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.55 * a); ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_PALE, 0.45 * a * (1 - cool)); ctx.lineWidth = 0.8; ctx.stroke();
    const u = (t * 0.9 + i * 0.37) % 1;
    drawGlow(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), 10, VKZ_HOT, 0.45 * a * (1 - cool));
    if (land && e < 0.45) {                       // the thunder at his feet as he lands
      const q = e / 0.45, ra = 1 - vraEase(q);
      ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * ra); ctx.lineWidth = 4 * ra + 0.8;
      ctx.beginPath(); ctx.arc(s.x2, s.y2, 16 + 130 * vraOut(q), 0, TAU); ctx.stroke();
    }
  });
}
// in flight: crimson lightning from where the dash (or the fall) began to where he is, his phantoms
// strung down it
function vksFlight(sc) {
  const t = uiTime, fall = sc.stage === 'fall';
  const x0 = sc.x0, y0 = sc.y0, hx = P.x, hy = P.y, L = Math.hypot(hx - x0, hy - y0), ang = Math.atan2(hy - y0, hx - x0);
  if (L > 2) {
    vkxBolt(x0, y0, hx, hy, Math.floor(t * 40) + sc.i * 13, fall ? 2.4 : 1.6, 0.9, true);
    const n = Math.floor(L / 22);
    for (let j = 1; j <= n; j++) {
      const u = j / (n + 1);
      vkxGhost({ x: lerp(x0, hx, u), y: lerp(y0, hy, u), a: ang }, 0.2 + 0.65 * u);
    }
  }
  drawGlow(hx, hy, fall ? 80 : 42, VKZ_CRIM, 0.6);
  drawGlow(hx, hy, fall ? 24 : 12, VKZ_PALE, 0.85);
}
// THE FALL: a column of light comes down out of the torn sky onto the grave as he gets there, a ring
// closing on where it will land. Drawn from the screen pass, in front of the torn sky and his true form
function vksFall(sc) {
  const k = clamp(sc.st / SC_FALL_T, 0, 1), gx = sc.x1, gy = sc.y1, top = gy - 1400, head = lerp(top, gy, Math.pow(k, 1.6));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  vraLens(gx, top, gx, head, 34 * (0.3 + 0.7 * k), VKZ_CRIM, 0.35 + 0.25 * k);
  vraLens(gx, top, gx, head, 10 * (0.3 + 0.7 * k), VKZ_HOT, 0.6);
  vraLens(gx, top, gx, head, 3 + 2 * k, VKZ_PALE, 0.9);
  drawGlow(gx, head, 40 + 50 * k, VKZ_CRIM, 0.7);
  drawGlow(gx, head, 14 + 12 * k, VKZ_PALE, 0.9);
  ctx.strokeStyle = rgba(VKZ_HOT, 0.6 * k); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(gx, gy, 20 + 120 * (1 - k), 0, TAU); ctx.stroke();
  ctx.restore();
}
// what it struck: the leaps to the bodies beside a path, forked bolts; the last cut, through each body
function vksHits() {
  const t = uiTime;
  for (let i = VKS.hits.length - 1; i >= 0; i--) {
    const h = VKS.hits[i], age = t - h.at;
    if (age > 0.6) { VKS.hits.splice(i, 1); continue; }
    if (h.leap) {
      const a = 1 - vraEase(age / 0.4), grow = vraOut(age / 0.05);
      if (a > 0) vkxBolt(h.sx, h.sy, lerp(h.sx, h.x, grow), lerp(h.sy, h.y, grow), h.seed + Math.floor(t * 30), 1.4, a, true);
    }
    if (h.cut) {
      const a = 1 - vraEase(age / 0.5);
      vraLens(h.x - 44, h.y, h.x + 44, h.y, 3 * a + 0.5, VKZ_PALE, a);
      drawGlow(h.x, h.y, 28, VKZ_CRIM, 0.7 * a);
    }
  }
}
// the last cut, through the whole room at his height: out from him to both walls, burning off
function vksCut() {
  const age = uiTime - VKS.cutAt;
  if (age < 0 || age > SC_OUT) return;
  const a = 1 - vraEase(age / SC_OUT), y = VKS.cutY, head = vraOut(age / 0.08);
  const wx0 = typeof arena !== 'undefined' ? arena.x0 : VKS.cutX - 2000, wx1 = typeof arena !== 'undefined' ? arena.x1 : VKS.cutX + 2000;
  const x0 = lerp(VKS.cutX, wx0, head), x1 = lerp(VKS.cutX, wx1, head);
  vraLens(x0, y, x1, y, 24 * a + 2, VKZ_CRIM, 0.5 * a);
  vraLens(x0, y, x1, y, 8 * a + 1, VKZ_HOT, 0.85 * a);
  vraLens(x0, y, x1, y, 2.2 * a + 0.5, VKZ_PALE, a);
  drawGlow(VKS.cutX, y, 170, VKZ_PALE, 0.6 * Math.exp(-age * 8));
}
// the hook, glow pass (from drawRoninVowWorld while SKY CLEAR plays)
function drawRoninSkyClear(sc) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  vksWeb(sc);
  vksHits();
  if (sc.stage === 'rise') vksRise(sc);
  if (sc.stage === 'storm' || sc.stage === 'fall') vksFlight(sc);
  vksCut();
  ctx.restore();
}

/* --------------------------------- the screen --------------------------------- */
// the room under it: blood, and dark round the edges; black but for him through the held breath
function vksGrade(sc) {
  const st = sc.stage, p = vraToScreen(P.x, P.y), R = Math.max(W, H);
  let dark = 0.35, blood = 0.3;
  if (st === 'rise') { const q = vraOut(sc.st / SC_RISE); dark *= q; blood *= q; }
  else if (st === 'clear') dark = lerp(0.35, 0.9, vraEase(sc.st / (SC_HOLD * 0.7)));
  else if (st === 'out') { const k = 1 - vraEase(sc.st / SC_OUT); dark *= k; blood = 0.2 * k; }
  ctx.fillStyle = rgba(VKZ_DEEP, blood); ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(p.x, p.y, 70 * camZoom, p.x, p.y, R * 0.75);
  g.addColorStop(0, rgba(VKZ_VOID, 0)); g.addColorStop(0.3, rgba(VKZ_VOID, dark * 0.75)); g.addColorStop(1, rgba(VKZ_VOID, dark));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// the torn sky's outline: a ragged hole down from the top of the frame, open (0 to 1) wide and deep
function vksHole(open) {
  const cx = W / 2, hw = W * (0.14 + 0.36 * open), dp = H * (0.07 + 0.3 * open), N = 26, pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, env = Math.pow(Math.sin(Math.PI * u), 0.7), j = 0.65 + 0.55 * vraH(VKS.seed + i * 1.9);
    pts.push([cx - hw + 2 * hw * u + (vraH(VKS.seed + i * 3.7) - 0.5) * hw * 0.07, -4 + dp * env * j]);
  }
  return { pts, cx, hw, dp };
}
function vksHolePath(Hl) {
  ctx.beginPath(); ctx.moveTo(Hl.pts[0][0], -10);
  for (const [x, y] of Hl.pts) ctx.lineTo(x, y);
  ctx.lineTo(Hl.pts[Hl.pts.length - 1][0], -10); ctx.closePath();
}
// a moon at (x, y): the blood moon of the cut-in, or (gold) his intro's, its ensō brushed round it
function vksMoon(x, y, r, a, gold) {
  if (a <= 0.01) return;
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, r * 2.7, gold ? VRA_GOLD : '#dc2626', (gold ? 0.22 : 0.5) * a);
  ctx.globalCompositeOperation = 'source-over';
  const mg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  if (gold) { mg.addColorStop(0, rgba('#fffbeb', a)); mg.addColorStop(0.6, rgba('#fcefc6', a)); mg.addColorStop(1, rgba('#e6cb86', a)); }
  else { mg.addColorStop(0, rgba('#fecaca', a)); mg.addColorStop(0.5, rgba('#ef4444', a)); mg.addColorStop(1, rgba('#7f1d1d', a)); }
  ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = gold ? rgba('#b08c4a', 0.24 * a) : rgba('#3c080a', 0.22 * a);   // its seas, as the cut-in's
  for (const [sx, sy, rx, ry, an] of [[-0.3, -0.2, 0.28, 0.2, 0.4], [0.18, -0.32, 0.2, 0.13, -0.3], [0.28, 0.12, 0.24, 0.17, 0.8], [-0.1, 0.3, 0.16, 0.11, 0.2]]) {
    ctx.beginPath(); ctx.ellipse(x + sx * r, y + sy * r, rx * r, ry * r, an, 0, TAU); ctx.fill();
  }
  const rim = ctx.createRadialGradient(x, y, r * 0.7, x, y, r);
  rim.addColorStop(0, 'rgba(60,20,10,0)'); rim.addColorStop(1, rgba('#3c140a', 0.25 * a));
  ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  const lg = ctx.createLinearGradient(0, y, 0, y + r);       // mist over its lower half
  lg.addColorStop(0, gold ? 'rgba(8,11,23,0)' : 'rgba(20,2,6,0)'); lg.addColorStop(1, gold ? rgba('#080b17', 0.5 * a) : rgba('#140206', 0.6 * a));
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r + 0.5, 0, TAU); ctx.fill();
}
// the sky torn open onto the realm of the dead: the blood moon, the dead drifting, lightning in it.
// open: how far it is torn; clear: how far it has gone to his intro's night (after the cut)
function vksTornSky(sc, open, clear, a) {
  if (open <= 0.01 || a <= 0.01) return;
  const t = uiTime, Hl = vksHole(open), dead = a * (1 - clear);
  ctx.save();
  vksHolePath(Hl); ctx.clip();
  if (dead > 0.01) {
    const g = ctx.createLinearGradient(0, 0, 0, Hl.dp);
    g.addColorStop(0, rgba('#0d0106', dead)); g.addColorStop(0.7, rgba('#3b0614', dead)); g.addColorStop(1, rgba('#7f1d1d', dead));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hl.dp + 6);
  }
  if (clear > 0.01) {                             // his intro's night: deep blue, a few stars
    const n = ctx.createLinearGradient(0, 0, 0, Hl.dp);
    n.addColorStop(0, rgba('#0b1226', a * clear)); n.addColorStop(1, rgba('#171c33', a * clear));
    ctx.fillStyle = n; ctx.fillRect(0, 0, W, Hl.dp + 6);
    ctx.fillStyle = rgba('#e2e8f0', 0.7 * a * clear);
    for (let i = 0; i < 40; i++) ctx.fillRect(Hl.cx - Hl.hw + vraH(i + 401) * Hl.hw * 2, vraH(i + 455) * Hl.dp * 0.9, 1.5, 1.5);
  }
  const mx = W * 0.72, my = H * 0.2 + H * 0.03 * (1 - open), mr = Math.max(16, Math.min(W, H) * 0.085);
  vksMoon(mx, my, mr, dead, false);
  vksMoon(mx, my, mr, a * clear, true);
  if (clear > 0.01) {
    vksArc(mx, my, mr * 1.2, -2.3, (TAU - 0.55) * vraOut(clear), Math.max(2.5, mr * 0.12), VRA_GOLD, 0.75 * a * clear, true);
  }
  if (dead > 0.01) {
    for (let i = 0; i < 7; i++) {                 // the dead drifting in it
      const h = vraH(VKS.seed + i * 4.3), x = Hl.cx - Hl.hw + ((h * 2 * Hl.hw + t * (20 + 30 * vraH(i + 9))) % (2 * Hl.hw));
      vkzFace(x, Hl.dp * (0.25 + 0.5 * vraH(i + 21)), Math.PI + 0.3 * Math.sin(t + i), 34 + 16 * h, 11 + 4 * h, 0.7 + 0.3 * Math.sin(t * 6 + i), 0.65 * dead);
    }
    ctx.globalCompositeOperation = 'lighter';     // lightning in it, harder through the storm
    const fr = Math.floor(t * 10), hard = sc.stage === 'storm' || sc.stage === 'fall' ? 1 : 0.45;
    for (let i = 0; i < 2; i++) {
      if (vraH(fr * 7.3 + i) > 0.6 * hard + 0.2) continue;
      const x0 = Hl.cx + (vraH(fr + i * 3.1) - 0.5) * Hl.hw * 1.6, x1 = x0 + (vraH(fr + i * 5.7) - 0.5) * Hl.hw * 0.8;
      vkxBolt(x0, 0, x1, Hl.dp * (0.5 + 0.4 * vraH(fr + i)), fr * 31 + i, 1.6, 0.8 * dead * hard, true);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // its edge: burning while it is the dead's; gold, and soft, once it is clear
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  ctx.beginPath(); Hl.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.5 * dead); ctx.lineWidth = 7; ctx.stroke();
  ctx.strokeStyle = rgba(VKZ_HOT, 0.6 * dead); ctx.lineWidth = 2.4; ctx.stroke();
  ctx.strokeStyle = rgba(VKZ_PALE, 0.55 * dead); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = rgba(VRA_GOLD, 0.45 * a * clear); ctx.lineWidth = 1.5; ctx.stroke();
  for (let i = 2; i < Hl.pts.length - 2; i += 3) {  // cracks running on down from its edge into the frame
    let [x, y] = Hl.pts[i], an = Math.PI / 2 + (vraH(VKS.seed + i * 2.3) - 0.5) * 1.4;
    const L = H * (0.05 + 0.1 * vraH(VKS.seed + i * 5.1)) * open;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) { an += (vraH(VKS.seed + i + j * 9.1) - 0.5) * 1.1; x += Math.cos(an) * L / 4; y += Math.sin(an) * L / 4; ctx.lineTo(x, y); }
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.6 * dead); ctx.lineWidth = 1.6; ctx.stroke();
  }
  ctx.restore();
}
// pieces of the sky falling away as it tears (the rise), dark with burning edges
function vksShards(sc) {
  const age = VKS.at.rise === undefined ? -1 : uiTime - VKS.at.rise;
  if (age < 0 || age > 1.6) return;
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const t0 = 0.05 + 0.4 * vraH(VKS.seed + i * 2.9), e = age - t0;
    if (e < 0 || e > 1.1) continue;
    const Hl = vksHole(vraOut(t0 / SC_RISE)), p = Hl.pts[Math.floor(vraH(VKS.seed + i * 4.7) * (Hl.pts.length - 1))];
    const x = p[0] + (vraH(i + 77) - 0.5) * 60 * e, y = p[1] + 120 * e + 700 * e * e, s = 6 + 10 * vraH(i + 41), a = 1 - vraEase(e / 1.1);
    ctx.save();
    ctx.translate(x, y); ctx.rotate(e * (vraH(i + 13) - 0.5) * 8);
    ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(s * 0.7, -s * 0.6); ctx.lineTo(s * 0.5, s * 0.5); ctx.lineTo(-s * 0.4, s * 0.6); ctx.closePath();
    ctx.fillStyle = rgba('#0b0d14', 0.95 * a); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * a); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// through the storm: crimson speed lines the way he is going, clear of him
function vksSpeed(sc) {
  const t = uiTime, p = vraToScreen(P.x, P.y), R = Math.max(W, H), a = Math.atan2(sc.y1 - sc.y0, sc.x1 - sc.x0) || 0;
  const c = Math.cos(a), s = Math.sin(a), f = Math.floor(t * 30), keep = Math.min(W, H) * 0.25;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 24; i++) {
    const off = (vraH(i * 3.7 + f) - 0.5) * R * 1.3, along = (vraH(i * 9.1 + f * 1.7) - 0.5) * R * 1.2;
    const x = W / 2 + c * along - s * off, y = H / 2 + s * along + c * off;
    if (Math.hypot(x - p.x, y - p.y) < keep) continue;
    const L = 40 + 100 * vraH(i * 1.3 + f * 0.7);
    vraLens(x - c * L, y - s * L, x + c * L, y + s * L, 1, VKZ_HOT, 0.3);
  }
  ctx.restore();
}
// cracks out across the frame from (x, y), on screen
function vksCracks(x, y, age, seed) {
  const a = 1 - vraEase(age / 0.9);
  if (a <= 0) return;
  const R = Math.max(W, H) * 0.75 * vraOut(age / 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 12; i++) {
    let an = i / 12 * TAU + vraH(seed + i * 4.1) * 0.5, px = x, py = y;
    const L = R * (0.45 + 0.55 * vraH(seed + i * 2.7));
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let j = 0; j < 7; j++) { an += (vraH(seed + i * 9 + j * 3.7) - 0.5) * 0.9; px += Math.cos(an) * L / 7; py += Math.sin(an) * L / 7; ctx.lineTo(px, py); }
    ctx.strokeStyle = rgba(VKZ_CRIM, 0.6 * a); ctx.lineWidth = 2.4; ctx.stroke();
    ctx.strokeStyle = rgba(VKZ_PALE, 0.7 * a); ctx.lineWidth = 0.9; ctx.stroke();
  }
  ctx.restore();
}
// each landing a blink of crimson; the fall a white one and the frame cracking from the grave
function vksFlashes(sc) {
  const t = uiTime, last = VKS.lands[VKS.lands.length - 1];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (last && t - last.at < 0.1) { ctx.fillStyle = rgba(VKZ_CRIM, 0.16 * (1 - (t - last.at) / 0.1)); ctx.fillRect(0, 0, W, H); }
  const fe = VKS.at.clear === undefined ? -1 : t - VKS.at.clear;
  if (fe >= 0 && fe < 0.3) { ctx.fillStyle = rgba(VKZ_PALE, 0.4 * (1 - fe / 0.3)); ctx.fillRect(0, 0, W, H); }
  ctx.restore();
  if (fe >= 0 && fe < 0.9) { const g = P.roninGrave || P, p = vraToScreen(g.x, g.y); vksCracks(p.x, p.y, fe, VKS.seed + 11); }
}
// the held breath: a hairline across the whole frame at his height, drawn out from him
function vksHairline(sc) {
  const p = vraToScreen(P.x, P.y), k = vraOut(sc.st / (SC_HOLD * 0.7)), L = Math.max(p.x, W - p.x) * k;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vraLens(p.x - L, p.y, p.x + L, p.y, 5, VKZ_CRIM, 0.35 * k);
  vraLens(p.x - L, p.y, p.x + L, p.y, 1, VKZ_PALE, 0.95 * k);
  drawGlow(p.x, p.y, 40, VKZ_PALE, 0.3 * k * (0.7 + 0.3 * Math.sin(uiTime * 40)));
  ctx.restore();
}
// the frame split along the cut: its halves pushed apart, up and down, the tear between them burning
function vksSlice(q) {
  const src = ctx.canvas;
  if (!src || typeof document === 'undefined') return;
  const w = src.width, h = src.height, dpr = typeof DPR === 'number' ? DPR : 1;
  if (!VKS.buf) VKS.buf = document.createElement('canvas');
  const B = VKS.buf;
  if (B.width !== w || B.height !== h) { B.width = w; B.height = h; }
  const g = B.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
  const py = vraToScreen(VKS.cutX, VKS.cutY).y * dpr, off = 30 * dpr * Math.pow(1 - q, 2);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = VKZ_VOID; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, py); ctx.clip(); ctx.drawImage(B, 0, -off); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(0, py, w, h - py); ctx.clip(); ctx.drawImage(B, 0, off); ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  vraLens(0, py, w, py, (4 + 10 * (1 - q)) * dpr, VKZ_CRIM, 0.7 * (1 - q));
  vraLens(0, py, w, py, (1 + 3 * (1 - q)) * dpr, VKZ_PALE, 1 - q);
  ctx.restore();
}
// after the cut: petals coming down over the frame, his intro's
function vksPetals(age, a) {
  if (a <= 0.01) return;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const h1 = vraH(i + 600), h2 = vraH(i + 640), h3 = vraH(i + 680);
    const x = W * h1 + Math.sin(age * (1.2 + h2) + i) * 24 - age * 30, y = -20 + age * (90 + 80 * h2) + h3 * H * 0.5;
    const spin = age * (2 + 3 * h3) + i, flip = Math.cos(spin * 1.3), s = 4 + 4 * h3;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(spin * 0.6 + h1 * TAU); ctx.scale(s * (0.25 + 0.75 * Math.abs(flip)), s);
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-0.2, -0.78, 0.86, -0.36); ctx.lineTo(0.6, 0); ctx.lineTo(0.86, 0.36); ctx.quadraticCurveTo(-0.2, 0.78, -1, 0);
    ctx.fillStyle = rgba(flip > 0 ? '#fbcfe8' : '#f9a8d4', 0.85 * a); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
// the bars, torn at their inner edges; SKY CLEAR's seal stamped into the lower one, gone gold once the sky is clear
function vksBars(sc) {
  const t = uiTime, st = sc.stage, rise = VKS.at.rise === undefined ? 9 : t - VKS.at.rise;
  const out = st === 'out' ? 1 - vraEase((sc.st - SC_OUT * 0.55) / (SC_OUT * 0.45)) : 1, k = vraOut(rise / 0.18) * out;
  if (k <= 0.005) return;
  const gold = st === 'out' ? vraOut(sc.st / 0.2) : 0, bh = H * 0.1, fr = Math.floor(t * 24);
  ctx.save();
  for (const top of [true, false]) {
    const edge = [];
    for (let i = 0; i <= 28; i++) {
      const tooth = (vraH(VKS.seed + i * 1.7 + (top ? 0 : 50)) - 0.5) * 12 + (vraH(fr + i * 3.1) - 0.5) * 3 * (1 - gold);
      edge.push([W * i / 28, top ? (bh + tooth) * k : H - (bh + tooth) * k]);
    }
    ctx.beginPath(); ctx.moveTo(0, top ? 0 : H);
    for (const [x, y] of edge) ctx.lineTo(x, y);
    ctx.lineTo(W, top ? 0 : H); ctx.closePath();
    ctx.fillStyle = rgba(VKZ_VOID, k); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); edge.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.strokeStyle = vriMix(VKZ_CRIM, VRA_GOLD, gold, (0.55 + 0.3 * Math.sin(t * 23) * (1 - gold)) * k); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  const stamp = vksQ(rise, 0.12, 0.26), fs = Math.round(clamp(Math.min(bh * 0.4, W * 0.055), 13, 36)), nm = 'SKY CLEAR', kj = VKZ_KANJI[nm];
  if (stamp > 0) {
    const sc2 = 1 + 0.5 * (1 - vraOut(stamp)), tr = (1 - 0.6 * stamp) * 1.5 * (1 - gold);
    ctx.translate(W / 2 + rnd(tr, -tr), H - bh * k / 2 + fs * 0.1 + rnd(tr, -tr)); ctx.scale(sc2, sc2);
    ctx.globalAlpha = Math.min(1, stamp * 3) * out;
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + fs + 'px ' + VRA_DISP; ctx.letterSpacing = '0.32em';
    const tw = ctx.measureText(nm).width;
    ctx.letterSpacing = '0em'; ctx.font = '900 ' + Math.round(fs * 0.8) + 'px ' + VKZ_JP;
    const kw = ctx.measureText(kj).width + fs * 0.7, x0 = -(tw + kw + fs * 0.45) / 2;
    ctx.fillStyle = vriMix(VKZ_CRIM, '#b45309', gold); ctx.fillRect(x0, -fs * 0.62, kw - fs * 0.15, fs * 1.24);
    ctx.fillStyle = vriMix(VKZ_BONE, VRA_IVORY, gold); ctx.textAlign = 'center';
    ctx.fillText(kj, x0 + (kw - fs * 0.15) / 2, fs * 0.04);
    ctx.font = '700 ' + fs + 'px ' + VRA_DISP; ctx.letterSpacing = '0.32em'; ctx.textAlign = 'left';
    ctx.shadowColor = vriMix(VKZ_CRIM, VRA_GOLD, gold); ctx.shadowBlur = 20;
    ctx.fillStyle = vriMix(VKZ_BONE, VRA_IVORY, gold); ctx.fillText(nm, x0 + kw + fs * 0.3, fs * 0.04);
    ctx.shadowBlur = 0;
    ctx.font = '700 9px ' + VRA_FONT; ctx.letterSpacing = '0.42em'; ctx.textAlign = 'center';
    ctx.fillStyle = vriMix(VKZ_HOT, VRA_GOLD, gold, 0.9 * vksQ(rise, 0.3, 0.5));
    ctx.fillText('LAST VOW', 0, -fs * 1.05);
    ctx.letterSpacing = '0em';
  }
  ctx.restore();
}
// the hook, screen (from drawRoninVowScreen while SKY CLEAR plays)
function drawRoninSkyClearScreen(sc) {
  const st = sc.stage, cutE = uiTime - VKS.cutAt;
  const open = st === 'rise' ? vraOut(sc.st / SC_RISE) : st === 'out' ? 1 + 0.5 * vraOut(sc.st / 0.3) : 1;
  const clear = st === 'out' ? vraOut(sc.st / 0.25) : 0, fade = st === 'out' ? 1 - vraEase((sc.st - SC_OUT * 0.5) / (SC_OUT * 0.5)) : 1;
  const hush = st === 'clear' ? 1 - 0.7 * vraEase(sc.st / (SC_HOLD * 0.7)) : 1;   // the held breath takes the torn sky down too
  ctx.save();
  vksGrade(sc);
  vksTornSky(sc, open, clear, fade * hush);
  vksWorld(() => { vksTrueForm(sc); if (st === 'fall') vksFall(sc); });
  vksShards(sc);
  if (st === 'storm') vksSpeed(sc);
  vksFlashes(sc);
  if (st === 'clear') vksHairline(sc);
  ctx.restore();
  if (cutE >= 0 && cutE < 0.35) vksSlice(cutE / 0.35);   // the cut splits the frame as it stands
  ctx.save();
  if (cutE >= 0 && cutE < 0.08) { ctx.fillStyle = rgba('#ffffff', 0.7 * (1 - cutE / 0.08)); ctx.fillRect(0, 0, W, H); }
  if (st === 'out') vksPetals(sc.st, fade);
  vksBars(sc);
  ctx.restore();
}

/* --------------------------------- the moments --------------------------------- */
// a stage begins: THE SKY BREAKS sets it all going; the web's second split comes as CLEAR begins
function roninSkyClearFx(sc, stage) {
  const t = uiTime;
  if (stage === 'rise') {
    VKS.at = {}; VKS.lands = []; VKS.hits = []; VKS.cutAt = -9; VKS.priceAt = -9;
    VKS.seed = Math.floor(rnd(997)) + 1; VKS.fx = P.x; VKS.fy = P.y;
    for (let i = 0; i < 16; i++) {                 // the dead go up the pillar, curling round it
      const an = i / 16 * TAU;
      vkzSoul(P.x + Math.cos(an) * 26, P.y + Math.sin(an) * 14, -Math.PI / 2 + Math.cos(an) * 0.6, rnd(260, 160), { w: rnd(13, 9), life: rnd(1.1, 0.7), drag: 0.35, rise: 140 });
    }
    vraSparks(P.x, P.y, 30, VKZ_PALE, 480, -Math.PI / 2, 2.4, 0.4, 1.4);
    vraEmbers(P.x, P.y, 20, VKZ_CRIM, 140, 1.1, 1.4);
    VKZ.flashes.push({ at: t, big: true, blast: true, x: P.x, y: P.y, a: 0 });
    shake(0.5);
  }
  VKS.at[stage] = t;
  if (stage === 'clear') {                         // down at the grave: the whole web split again, at once
    for (const s of sc.segs) {
      const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1), a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      for (let k = 0; k < Math.max(2, Math.round(L / 60)); k++) {
        const u = rnd();
        vraSparks(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), 1, rnd() < 0.4 ? VKZ_PALE : VKZ_HOT, 300, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, 0.8, 0.3, 1.2);
      }
      if (rnd() < 0.6) vkzSoul((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, rnd(200, 120), { w: rnd(13, 9), life: rnd(0.9, 0.6), drag: 0.25 });
      if (typeof VKX !== 'undefined') VKX.scars.push({ kind: 'rift', s: { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }, w: 40, at: t, seed: VKS.seed + VKX.scars.length });
    }
    const g = P.roninGrave || P;
    for (let i = 0; i < 14; i++) vkzSoul(g.x, g.y, rnd(TAU), rnd(300, 180), { w: rnd(14, 9), life: rnd(0.9, 0.6), drag: 0.2 });
    vraSparks(g.x, g.y, 30, VKZ_PALE, 560, 0, TAU, 0.4, 1.5);
    VKZ.flashes.push({ at: t, big: true, blast: true, x: g.x, y: g.y, a: 0 });
  }
}
// a storm dash lands: sparks off its path and the dead let out of it; the floor keeps a closing rift
function roninSkyClearLandFx(sc, s, n) {
  const t = uiTime, L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1, a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  VKS.lands.push({ s, at: t, n, seed: VKS.seed * 7 + VKS.lands.length * 13 });
  for (let k = 0; k < Math.max(3, Math.round(L / 20)); k++) {
    const u = (k + rnd()) / Math.max(3, Math.round(L / 20));
    vraSparks(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), 1, rnd() < 0.35 ? VKZ_PALE : VKZ_HOT, 260, a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, 0.7, 0.3, 1.1);
  }
  for (let k = 0; k < 2; k++) vkzSoul(lerp(s.x1, s.x2, rnd()), lerp(s.y1, s.y2, rnd()), a + (k ? 1 : -1) * Math.PI / 2, rnd(160, 90), { w: rnd(12, 8), life: rnd(0.8, 0.5), drag: 0.25 });
  vraSparks(s.x2, s.y2, 12, VKZ_HOT, 300, a, 1.2, 0.25, 1.2);
  if (typeof VKX !== 'undefined') {
    VKX.scars.push({ kind: 'rift', s: { x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }, w: 30, at: t, seed: VKS.seed + VKX.scars.length });
    if (VKX.scars.length > 60) VKX.scars.splice(0, VKX.scars.length - 60);
  }
  VKZ.flashes.push({ at: t, big: false, x: s.x2, y: s.y2, a });
  shake(0.18 + Math.min(0.2, n * 0.04));
}
// a body cut by it: off its path, the leap to it is a bolt; on the last cut, the line through it
function roninSkyClearHitFx(e, sc) {
  const t = uiTime, st = sc.stage, cut = st === 'clear' && sc.st >= SC_HOLD;
  const h = { x: e.x, y: e.y, at: t, seed: Math.floor(rnd(997)), leap: false, cut };
  if (st === 'storm') {                            // where on the path it is nearest; far off it, it was leapt to
    const dx = sc.x1 - sc.x0, dy = sc.y1 - sc.y0, L2 = dx * dx + dy * dy || 1, u = clamp(((e.x - sc.x0) * dx + (e.y - sc.y0) * dy) / L2, 0, 1);
    h.sx = sc.x0 + dx * u; h.sy = sc.y0 + dy * u;
    h.leap = Math.hypot(e.x - h.sx, e.y - h.sy) > e.r + SC_W * 0.8;
  }
  VKS.hits.push(h);
  if (VKS.hits.length > 40) VKS.hits.shift();
  const a = cut ? (rnd() < 0.5 ? -Math.PI / 2 : Math.PI / 2) : h.leap ? Math.atan2(e.y - h.sy, e.x - h.sx)
          : st === 'fall' ? Math.atan2(e.y - P.y, e.x - P.x) : Math.atan2(sc.y1 - sc.y0, sc.x1 - sc.x0);   // the web's second split throws them out from the grave
  vkzSoul(e.x, e.y, a + rnd(0.4, -0.4), rnd(260, 170), { w: Math.max(8, e.r * 0.85), life: 0.75, drag: 0.1 });
  vraSparks(e.x, e.y, 10, VKZ_PALE, 340, a, 0.5, 0.25, 1.3);
  vraSparks(e.x, e.y, 6, VKZ_CRIM, 220, a + Math.PI, 0.9, 0.35, 1.2);
}
// the last cut: the dead thrown up and down off the line, all the way along it
function roninSkyClearCutFx(sc) {
  const t = uiTime;
  VKS.cutAt = t; VKS.cutX = P.x; VKS.cutY = P.y;
  const x0 = typeof arena !== 'undefined' ? arena.x0 : P.x - 900, x1 = typeof arena !== 'undefined' ? arena.x1 : P.x + 900;
  for (let i = 0; i < 22; i++) {
    const x = lerp(x0, x1, (i + rnd()) / 22);
    vkzSoul(x, P.y, (i % 2 ? -1 : 1) * Math.PI / 2 + rnd(0.5, -0.5), rnd(240, 140), { w: rnd(13, 9), life: rnd(0.9, 0.6), drag: 0.3 });
    vraSparks(x, P.y, 2, VKZ_PALE, 360, (i % 2 ? -1 : 1) * Math.PI / 2, 1.2, 0.3, 1.2);
  }
  vraSparks(P.x, P.y, 40, VKZ_PALE, 700, 0, TAU, 0.45, 1.6);
  VKZ.flashes.push({ at: t, big: true, x: P.x, y: P.y, a: 0 });
}
// it landed and killed nothing: what he had left goes, in ash
function roninSkyClearPriceFx(sc) {
  VKS.priceAt = uiTime; VKS.px = P.x; VKS.py = P.y;
  vraEmbers(P.x, P.y, 26, '#a8a29e', 70, 1.4, 1.3);
  vraInk(P.x, P.y, 10, 90, 8, 0.8);
  for (let i = 0; i < 6; i++) vkzSoul(P.x, P.y, -Math.PI / 2 + rnd(0.9, -0.9), rnd(110, 60), { w: rnd(11, 8), life: rnd(1.2, 0.8), drag: 0.4, rise: 30, a: 0.6 });
}
// after it, from the dead's layer (vkzWorld's last line), which goes on drawing once the vow is over:
// the price's seal, 空 NOTHING FELL, brushed on over him in ash, rising, crumbling away into ash
function vksAfter() {
  const age = uiTime - VKS.priceAt, T = 2.2;
  if (age < 0 || age > T) return;
  const q = age / T, inK = vraOut(age / 0.25), a = 1 - vraEase((q - 0.6) / 0.4), z = typeof camZoom === 'number' && camZoom > 0 ? camZoom : 1;
  const nm = 'NOTHING FELL', kj = VKZ_KANJI[nm];
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(VKS.px, VKS.py - 70 / z - 14 * vraOut(q)); ctx.scale(1 / z, 1 / z);
  ctx.textBaseline = 'middle';
  ctx.font = '700 15px ' + VRA_DISP; ctx.letterSpacing = '0.32em';
  const tw = ctx.measureText(nm).width;
  ctx.letterSpacing = '0em'; ctx.font = '900 13px ' + VKZ_JP;
  const kw = ctx.measureText(kj).width + 10, w = tw + kw + 34, x0 = -w / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 6, -22, (w + 12) * inK, 44); ctx.clip();
  vkzBrush(x0, 0, w, 26, VKS.priceAt * 10, a);
  ctx.fillStyle = rgba('#57534e', 0.95 * a); ctx.fillRect(x0 + 12, -9, kw - 2, 18);
  ctx.fillStyle = rgba('#e7e5e4', a); ctx.textAlign = 'center';
  ctx.fillText(kj, x0 + 12 + (kw - 2) / 2, 1);
  ctx.font = '700 15px ' + VRA_DISP; ctx.letterSpacing = '0.32em'; ctx.textAlign = 'left';
  ctx.fillStyle = rgba('#d6d3d1', a); ctx.fillText(nm, x0 + 16 + kw, 1);
  ctx.letterSpacing = '0em';
  ctx.fillStyle = rgba('#78716c', 0.9 * a); ctx.fillRect(x0, 14, w, 1);
  ctx.restore();
  if (q > 0.45) {                                 // crumbling: ash off its top edge, drifting up and away
    const k = (q - 0.45) / 0.55;
    for (let i = 0; i < 26; i++) {
      const h = vraH(i * 3.1 + 7), e = clamp(k * 1.6 - h * 0.6, 0, 1);
      if (e <= 0 || e >= 1) continue;
      ctx.fillStyle = rgba(i % 3 ? '#a8a29e' : '#57534e', 0.8 * (1 - e));
      ctx.fillRect(x0 + w * vraH(i * 5.7 + 1) + 14 * e * Math.sin(i), -10 - 40 * e - 6 * vraH(i), 2, 2);
    }
  }
  ctx.restore();
}
/* ======================= end of V: LAST VOW — SKY CLEAR ======================= */
