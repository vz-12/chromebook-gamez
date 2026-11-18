/* =============== THE PLANETARIUM — the dome, the reading screen (art, 18 Nov) ===============
   In place of the placeholder drawPlanetarium. The dome's ceiling is a great zodiac
   wheel tilted overhead, its centre above the screen, so you look up into it: the
   rim with its degrees, the twelve constellations in their band, the glyphs inside
   them and the wanderers on the ecliptic. It turns, about once in four minutes.
   Under it stand the three plates, which are the same rects zPlates gives the
   clicks: nothing here moves a thing the logic hits.
     opening    1.4 s, any key ends it: the room goes dark, the ring draws itself out
                from the front, the twelve light one after another, and the three
                that rose come loose and drift down into the plates. Each plate's
                words write in under a scan of light.
     idle       the wheel turns and the stars breathe. The plate under the cursor
                lifts, and its constellation joins up, line by line, in gold.
     retrograde the wheel slows, stops and runs backward, and the plates flip over
                on their long axis, one after another, to their violet side: the
                glyph grows its tail, the extra pip lights violet, the shadow is
                written underneath. A sign at III cannot turn: it shivers and stays.
     turning    the three go back up into the wheel, it spins a third of a turn,
                and three new ones come down.
     taking     the chosen constellation draws itself whole, folds into its glyph,
                and its pips light one by one. The other two sink and their skies
                go back up into the wheel. (On the way out, the dome opens like an
                iris and the glyph flies to its medallion in the tray: zDrawDark and
                signTray, from what this leaves in ZAD.)
   Narrow screens and touch get the stacked plates zPlates already lays out, with
   the sky beside the words instead of over them.
   It reads P.zRead, the plates and buttons from zPlates/planetButtons, SIGNS, Z_EL,
   zm/zsh/zTri, zRetroOk, zTurnCost, credits, mouse, keys, uiTime, W, H, DPR, and
   changes nothing of the logic's. Art state in ZAD. Needs the sky block (za*).
=========================================================================================== */
const ZAD_OPEN = 1.4;
let ZAD = { open: false, rd: null, t0: -9, last: 0, seen: -9, wa: 0, w: 0.026, extra: 0, spinFrom: 0, spinTo: 0, spinT: -9,
            retro: false, retroT: -9, turns: 0, turnT: -9, done: false, doneT: -9, took: -1,
            flip: [0, 0, 0], hov: [0, 0, 0], lp: [0, 0, 0], arr: [-9, -9, -9], held: [0, 0, 0], prev: null, offers: null,
            sky: null, skyKey: '', lay: new Map(), closeT: -9, fly: null, flyFrom: null, shoot: { t: -9, x: 0, y: 0, a: 0 } };

/* ---------------------------------- the beats ---------------------------------- */
function zadBegin(r) {
  const D = ZAD, now = uiTime;
  D.open = true; D.rd = r; D.t0 = now; D.seen = now;
  D.retro = !!(r && r.retro); D.retroT = -9; D.turns = r ? r.turns : 0; D.turnT = -9;
  D.done = !!(r && r.done); D.doneT = D.done ? now - 9 : -9;
  D.took = D.done && r.took ? r.offers.findIndex(o => o.id === r.took.id) : -1;
  D.flip = [0, 1, 2].map(i => (r && r.retro && r.offers[i] && zRetroOk(r.offers[i]) ? 1 : 0));
  D.hov = [0, 0, 0]; D.lp = [0, 0, 0];
  D.arr = [0, 1, 2].map(i => now + 0.86 + i * 0.07);
  D.held = [0, 1, 2].map(i => (r && r.offers[i] ? zm(r.offers[i].id) : 0));
  D.prev = null; D.lay.clear();
  D.offers = r ? r.offers.map(o => ({ id: o.id, mag: o.mag })) : null;
  D.fly = null;
}
function zadAnyKey() {
  for (const k in keys) if (keys[k]) return true;
  return !!mouse.down;
}
function zadTrack(r, now, dt) {
  const D = ZAD;
  // any key ends the opening (the key itself still does what it does)
  if (now - D.t0 < ZAD_OPEN - 0.05 && now - D.t0 > 0.05 && zadAnyKey()) {
    const cut = now - (D.t0 + ZAD_OPEN);
    D.t0 += cut; for (let i = 0; i < 3; i++) D.arr[i] = Math.min(D.arr[i], now - 0.8);
  }
  if (!r) return;
  if (r.retro !== D.retro) { D.retro = r.retro; D.retroT = now; }
  if (r.turns !== D.turns) {
    D.turns = r.turns; D.turnT = now;
    D.prev = D.offers; D.spinFrom = D.extra; D.spinTo = D.extra + TAU / 3; D.spinT = now;
    D.arr = [0, 1, 2].map(i => now + 0.62 + i * 0.09);
    D.lp = [0, 0, 0]; D.lay.clear();
  }
  if (r.done && !D.done) {
    D.done = true; D.doneT = now;
    D.took = r.took ? r.offers.findIndex(o => o.id === r.took.id) : -1;
  }
  D.offers = r.offers.map(o => ({ id: o.id, mag: o.mag }));
  // what was held of each before it was taken (the take has raised it by the time this is drawn)
  if (!r.done) D.held = r.offers.map(o => zm(o.id));
  // the plates flip one after another; once the reading is taken they stay as they were read
  for (let i = 0; i < 3 && !r.done; i++) {
    const o = r.offers[i];
    const want = r.retro && !r.done && o && zRetroOk(o) ? 1 : 0;
    if (now < D.retroT + i * 0.075) continue;
    D.flip[i] = want > D.flip[i] ? Math.min(want, D.flip[i] + dt / 0.42) : Math.max(want, D.flip[i] - dt / 0.42);
  }
  // the wheel: westward, about once in four minutes; retrograde, it slows, stops and runs back
  const wt = r.retro && !r.done ? -0.05 : TAU / 240;
  D.w += (wt - D.w) * Math.min(1, dt * 1.5);
  D.wa += D.w * dt;
  D.extra = lerp(D.spinFrom, D.spinTo, zaE(zaQ(now, D.spinT, D.spinT + 1.1)));
}

/* ---------------------------------- the geometry ---------------------------------- */
function zadGeo(B) {
  const wide = W >= 640, top = B.plates.length ? B.plates[0].y : H * 0.32;
  const Rx = wide ? Math.max(W * 0.6, 540) : W * 0.95;
  const Ry = Rx * (wide ? 0.33 : 0.42);
  const rim = Math.max(wide ? 112 : 84, top - (wide ? 40 : 26));
  return { wide, cx: W / 2, cy: rim - Ry, Rx, Ry, rim, top };
}
// a point on the wheel at angle th (PI/2 is the front, nearest you), f of the way out
function zadAt(G, th, f) { return { x: G.cx + Math.cos(th) * G.Rx * f, y: G.cy + Math.sin(th) * G.Ry * f, d: (Math.sin(th) + 1) / 2 }; }
// where a sign stands on the wheel now: Aries first, the rest eastward (to the left), all turning west
function zadSlot(id) { return Math.PI / 2 + ZA_ORDER.indexOf(id) * TAU / 12 - ZAD.wa - ZAD.extra; }

/* ---------------------------------- the ground ---------------------------------- */
// the far sky behind the dome: cached per screen size, the Milky Way across it
function zadSkyBuf() {
  const D = ZAD, key = W + 'x' + H + 'x' + DPR;
  if (D.sky && D.skyKey === key) return D.sky;
  const b = makeBuf(W * DPR, H * DPR), g = b.getContext('2d');
  g.scale(DPR, DPR);
  // the band of the galaxy, a soft diagonal haze with dust in it
  g.save();
  g.translate(W * 0.5, H * 0.55); g.rotate(-0.42);
  const band = g.createLinearGradient(0, -H * 0.3, 0, H * 0.3);
  band.addColorStop(0, 'rgba(60,40,110,0)'); band.addColorStop(0.45, 'rgba(70,60,140,0.10)');
  band.addColorStop(0.5, 'rgba(120,110,190,0.13)'); band.addColorStop(0.56, 'rgba(70,60,140,0.09)'); band.addColorStop(1, 'rgba(40,30,90,0)');
  g.fillStyle = band; g.fillRect(-W, -H * 0.3, W * 2, H * 0.6);
  for (let i = 0; i < 900; i++) {
    const x = (zaH(i * 1.37) - 0.5) * W * 2, y = (zaH(i * 2.11 + 4) + zaH(i * 0.71 + 9) - 1) * H * 0.22;
    g.fillStyle = `rgba(${200 + zaH(i) * 55 | 0},${200 + zaH(i + 3) * 40 | 0},255,${0.08 + zaH(i * 3.3) * 0.22})`;
    g.fillRect(x, y, 0.8, 0.8);
  }
  // dark lanes of dust down its middle
  for (let i = 0; i < 26; i++) {
    const x = (zaH(i * 9.1) - 0.5) * W * 1.8, y = (zaH(i * 4.7) - 0.5) * H * 0.07;
    const dg = g.createRadialGradient(x, y, 0, x, y, 40 + zaH(i) * 70);
    dg.addColorStop(0, 'rgba(2,3,9,0.16)'); dg.addColorStop(1, 'rgba(2,3,9,0)');
    g.fillStyle = dg; g.fillRect(x - 120, y - 120, 240, 240);
  }
  g.restore();
  // the field
  for (let i = 0; i < 340; i++) {
    const x = zaH(i * 3.71 + 1) * W, y = zaH(i * 5.13 + 2) * H, m = zaH(i * 7.7 + 3);
    const r = 0.35 + m * m * 1.25, c = zaH(i * 1.9);
    g.fillStyle = c < 0.15 ? 'rgba(255,200,150,' : c < 0.35 ? 'rgba(180,200,255,' : 'rgba(235,240,255,';
    g.fillStyle += (0.25 + m * 0.6) + ')';
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  D.sky = b; D.skyKey = key;
  return b;
}
function zadGround(G, T, now) {
  const a = zaE(zaQ(T, 0, 0.32));
  ctx.fillStyle = `rgba(2,3,9,${0.955 * a})`;
  ctx.fillRect(0, 0, W, H);
  const sa = zaQ(T, 0.05, 0.6);
  if (sa <= 0) return;
  // a deep wash of colour, violet under the wheel and night blue toward the floor
  let g = ctx.createRadialGradient(W / 2, G.rim * 0.6, 20, W / 2, G.rim * 0.6, Math.max(W, H) * 0.8);
  g.addColorStop(0, `rgba(49,30,92,${0.42 * sa})`); g.addColorStop(0.5, `rgba(18,22,58,${0.32 * sa})`); g.addColorStop(1, 'rgba(2,3,9,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(W / 2, H * 1.05, 10, W / 2, H * 1.05, H * 0.75);
  g.addColorStop(0, `rgba(8,30,52,${0.4 * sa})`); g.addColorStop(1, 'rgba(2,3,9,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.85 * sa;
  ctx.drawImage(zadSkyBuf(), 0, 0, W, H);
  ctx.globalAlpha = 1;
  // stars that breathe
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const x = zaH(i * 8.31 + 5) * W, y = zaH(i * 6.07 + 8) * H, tw = 0.5 + 0.5 * Math.sin(now * (0.8 + zaH(i) * 1.6) + i * 2.4);
    drawGlow(x, y, 3 + zaH(i * 2) * 5, zaH(i * 4) < 0.3 ? '#fde68a' : '#c7d2fe', (0.12 + 0.3 * tw) * sa);
  }
  // now and then a meteor, high across the dome
  const S = ZAD.shoot;
  if (now - S.t > 7 + zaH(Math.floor(now / 7)) * 4) { S.t = now; S.x = W * (0.15 + zaH(now) * 0.7); S.y = 30 + zaH(now * 1.3) * G.rim * 0.6; S.a = 2.6 + zaH(now * 2.1) * 0.5; }
  const st = now - S.t;
  if (st < 0.6) {
    const k = st / 0.6, L = 120 * Math.sin(Math.PI * k), hx = S.x + Math.cos(S.a) * 420 * k, hy = S.y + Math.sin(S.a) * 420 * k * 0.4;
    const lg = ctx.createLinearGradient(hx, hy, hx - Math.cos(S.a) * L, hy - Math.sin(S.a) * L * 0.4);
    lg.addColorStop(0, `rgba(255,255,255,${0.8 * sa})`); lg.addColorStop(1, 'rgba(160,180,255,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(S.a) * L, hy - Math.sin(S.a) * L * 0.4); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------------------------- the wheel ---------------------------------- */
function zadEllipse(G, f, a0, a1) { ctx.ellipse(G.cx, G.cy, G.Rx * f, G.Ry * f, 0, a0, a1); }
function zadWheel(G, r, T, now, B) {
  const draw = zaE(zaQ(T, 0.08, 0.62)), span = Math.PI * draw;   // the ring, drawn out from the front both ways
  if (draw <= 0) return;
  const lit = zaQ(T, 0.05, 0.4), front0 = Math.PI / 2 - span, front1 = Math.PI / 2 + span;
  ctx.save();
  // the dome's inside: a lens of deep violet, brighter toward the rim
  ctx.save();
  ctx.translate(G.cx, G.cy); ctx.scale(1, G.Ry / G.Rx);
  const ig = ctx.createRadialGradient(0, 0, G.Rx * 0.2, 0, 0, G.Rx);
  ig.addColorStop(0, 'rgba(10,8,30,0)'); ig.addColorStop(0.7, `rgba(40,28,88,${0.22 * lit})`); ig.addColorStop(0.97, `rgba(90,70,170,${0.3 * lit})`);
  ig.addColorStop(1, 'rgba(90,70,170,0)');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(0, 0, G.Rx, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.lineCap = 'round';
  const rot = ZAD.wa + ZAD.extra;
  // spokes from the hidden pole, fanning down to the band
  ctx.strokeStyle = `rgba(148,163,220,${0.07 * lit})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 72; k++) {
    const th = Math.PI / 2 + k * TAU / 72 - rot;
    if (Math.sin(th) < 0.05 || Math.abs(th - Math.PI / 2 - Math.round((th - Math.PI / 2) / TAU) * TAU) > span) continue;
    const a = zadAt(G, th, 0.25), b = zadAt(G, th, 0.66);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  // the rings: the rim (gold), its hairline, the band's inner edge, the glyphs' ring, the ecliptic (dotted)
  const ring = (f, col, al, lw, dash) => {
    ctx.strokeStyle = rgba(col, al); ctx.lineWidth = lw;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); zadEllipse(G, f, front0, front1); ctx.stroke();
    if (dash) ctx.setLineDash([]);
  };
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ring(1.0, ZA_GOLD, 0.16, 7);
  ctx.restore();
  ring(1.0, ZA_GOLD, 0.75, 1.6);
  ring(1.022, '#fde68a', 0.25, 0.8);
  ring(0.965, '#c7d2fe', 0.3, 0.8);
  ring(0.8, '#a5b4fc', 0.4, 1);
  ring(0.69, '#a5b4fc', 0.22, 0.8);
  ring(0.62, '#e9d5ff', 0.28, 1, [2, 6]);
  // the degrees: every five, longer at ten, and the cusps of the signs through the band
  ctx.strokeStyle = `rgba(253,230,138,${0.55 * lit})`; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k < 72; k++) {
    const th = Math.PI / 2 + k * TAU / 72 - rot;
    if (Math.sin(th) < 0.0) continue;
    const off = Math.abs(((th - Math.PI / 2) % TAU + TAU + Math.PI) % TAU - Math.PI);
    if (off > span) continue;
    const L = k % 6 === 0 ? 0.035 : k % 2 === 0 ? 0.022 : 0.013;
    const a = zadAt(G, th, 1), b = zadAt(G, th, 1 - L);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.strokeStyle = `rgba(165,180,252,${0.45 * lit})`;
  ctx.beginPath();
  for (let k = 0; k < 12; k++) {
    const th = Math.PI / 2 + (k + 0.5) * TAU / 12 - rot;
    if (Math.sin(th) < 0.0) continue;
    const off = Math.abs(((th - Math.PI / 2) % TAU + TAU + Math.PI) % TAU - Math.PI);
    if (off > span) continue;
    const a = zadAt(G, th, 0.965), b = zadAt(G, th, 0.69);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  // the wanderers, on the ecliptic at their own paces
  ctx.globalCompositeOperation = 'lighter';
  const wand = [['#fca5a5', 0.11, 2.2], ['#fef9c3', 0.07, 2.6], ['#fde68a', 0.035, 3.0], ['#fcd34d', 0.02, 2.4], ['#e2e8f0', 0.16, 1.6]];
  wand.forEach(([c, sp, rr], k) => {
    const th = Math.PI / 2 + k * 1.37 + now * sp - rot * 0.5;
    if (Math.sin(th) < 0.15) return;
    const p = zadAt(G, th, 0.62);
    drawGlow(p.x, p.y, rr * 4, c, 0.5 * lit * p.d);
    ctx.fillStyle = rgba('#ffffff', 0.85 * lit * p.d);
    ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.55, 0, TAU); ctx.fill();
    if (k === 3) { ctx.strokeStyle = rgba(c, 0.6 * lit * p.d); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, rr * 2.2, rr * 0.7, -0.3, 0, TAU); ctx.stroke(); }
  });
  ctx.globalCompositeOperation = 'source-over';
  // the twelve: in the band, lighting one after another out from the front
  const offered = r ? r.offers.map(o => o.id) : [];
  const leaving = zadLeaving(r, now);
  for (const id of ZA_ORDER) {
    const th = zadSlot(id), sn = Math.sin(th);
    if (sn < 0.02) continue;
    const off = Math.abs(((th - Math.PI / 2) % TAU + TAU + Math.PI) % TAU - Math.PI);
    const on = zaQ(T, 0.3 + off * 0.32, 0.5 + off * 0.32);
    if (on <= 0) continue;
    const p = zadAt(G, th, 0.885), s = 0.55 + 0.45 * p.d;
    const held = zm(id), shade = zsh(id), isOff = offered.includes(id);
    const flash = 1 - zaQ(T, 0.5 + off * 0.32, 0.9 + off * 0.32);
    // an offered sign has come down into its plate: its place on the wheel is left dim
    const away = isOff ? leaving(id) : 0;
    const a = on * (0.45 + 0.55 * p.d) * (1 - 0.6 * away);
    const sz = G.Ry * 0.3 * s * (G.wide ? 1 : 0.9);
    ctx.save();
    if (held || isOff) {
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(p.x, p.y, sz * 0.9, held ? ZA_GOLD : '#c7d2fe', (held ? 0.22 : 0.12) * a);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(p.x, p.y, sz * 1.1, '#e0e7ff', 0.5 * flash * on); ctx.globalCompositeOperation = 'source-over'; }
    zaConst(id, p.x, p.y, sz, { a, lineA: held ? 0.75 : 0.38, lineCol: held ? ZA_GOLD : '#a5b4fc', seed: ZA_ORDER.indexOf(id) * 3, spark: 0.6 });
    // its glyph, inside the band, and what you hold of it under that
    const gq = zadAt(G, th, 0.745);
    zaGlyph(id, gq.x, gq.y, 5.5 * s + 1.5, held ? ZA_GOLD_HI : ZA_ELCOL[zaEl(id)], { a: a * (held ? 1 : 0.7), lw: 0.2, glow: held ? 0.6 : 0 });
    if (held) zaPips(gq.x, gq.y + 9 * s + 3, 2 * s + 0.6, held, held, 0, a, 6 * s + 1.6);
    if (shade) zaEclipse(p.x + sz * 0.42, p.y - sz * 0.3, 5 * s + 2, a);
    ctx.restore();
  }
  ctx.restore();
}
// how far an offered sign has gone from its place on the wheel (0 still there, 1 down in its plate)
function zadLeaving(r, now) {
  const D = ZAD;
  return id => {
    if (!r) return 0;
    const i = r.offers.findIndex(o => o.id === id);
    if (i < 0) return 0;
    let k = zaQ(now, D.arr[i] - 0.5, D.arr[i]);
    if (r.done && D.took !== i) k *= 1 - zaQ(now, D.doneT + 0.2, D.doneT + 0.8);
    return k;
  };
}

/* --------------------------------- the descents ---------------------------------
   A constellation going down from its place on the wheel into its plate (k 0..1),
   or back up (k 1..0). Drawn over everything, so it reads as one thing travelling. */
function zadDescent(G, id, plate, box, k, a) {
  if (k <= 0 || k >= 1 || a <= 0.01) return;
  const th = zadSlot(id), w = zadAt(G, th, 0.885), s0 = G.Ry * 0.3 * (0.55 + 0.45 * w.d);
  const x0 = w.x, y0 = Math.max(-30, w.y), x1 = box.x, y1 = box.y, s1 = box.s;
  const e = zaE(k), mx = lerp(x0, x1, 0.5) + (x1 - x0) * 0.15, my = Math.min(y0, y1) - 30;
  const x = (1 - e) * (1 - e) * x0 + 2 * (1 - e) * e * mx + e * e * x1;
  const y = (1 - e) * (1 - e) * y0 + 2 * (1 - e) * e * my + e * e * y1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let j = 1; j <= 5; j++) {   // a trail of light behind it
    const e2 = zaE(Math.max(0, k - j * 0.035));
    const tx = (1 - e2) * (1 - e2) * x0 + 2 * (1 - e2) * e2 * mx + e2 * e2 * x1, ty = (1 - e2) * (1 - e2) * y0 + 2 * (1 - e2) * e2 * my + e2 * e2 * y1;
    drawGlow(tx, ty, lerp(s0, s1, e2) * 0.35, '#c7d2fe', 0.12 * a * (1 - j / 6));
  }
  drawGlow(x, y, lerp(s0, s1, e) * 0.6, '#e0e7ff', 0.25 * a * Math.sin(Math.PI * k));
  ctx.globalCompositeOperation = 'source-over';
  zaConst(id, x, y, lerp(s0, s1, e), { a, lineA: 0.65, lineCol: '#e0e7ff', spark: 0.8 });
  ctx.restore();
}

/* ---------------------------------- the plates ---------------------------------- */
// the words on a plate, laid out at a scale: what fits, and what is left out when it can't
function zadBlocks(o, side, maxW, f, compact, held) {
  const s = zSign(o.id), mag = Math.min(3, o.mag + (side ? 1 : 0));
  const out = [];
  const add = (font, col, text, lh, gap, kind, extra) => {
    ctx.font = font;
    const lines = text ? wrapLines(text, maxW) : [''];
    out.push(Object.assign({ font, col, lines, lh, gap, kind }, extra || {}));
  };
  for (let m = held + 1; m <= mag; m++) {
    const [nm, body] = zHalves(zLine(s, m));
    const top = m === mag;
    add(`800 ${(11.5 * f).toFixed(1)}px ${ZA_FB}`, '#f1f5f9', nm, 13.5 * f, 2 * f, 'head', { rn: Z_RN[m], retro: side && m === mag && o.mag < mag });
    if (top || !compact) add(`400 ${(11 * f).toFixed(1)}px ${ZA_FB}`, '#a8b5c9', body, 13.4 * f, 8 * f, 'body');
  }
  if (side) {
    const [nm, body] = zHalves(s.shadow);
    add(`800 ${(11 * f).toFixed(1)}px ${ZA_FB}`, ZA_SHADE_HI, 'SHADOW  ·  ' + nm, 13.5 * f, 2 * f, 'shade');
    add(`400 ${(11 * f).toFixed(1)}px ${ZA_FB}`, '#c4b5fd', body + ', until the sky turns.', 13.4 * f, 6 * f, 'body');
  }
  let h = 0;
  for (const b of out) h += b.lines.length * b.lh + b.gap;
  return { out, h, mag, held };
}
function zadLayout(o, side, pw, ph, wide, held) {
  const key = o.id + o.mag + (side ? 'r' : 'f') + pw + 'x' + ph + (wide ? 'w' : 'n') + held;
  const D = ZAD;
  if (D.lay.has(key)) return D.lay.get(key);
  const s = zSign(o.id);
  let L = null;
  if (wide) {
    const maxW = pw - 30;
    ctx.font = `italic 400 10.5px ${ZA_FB}`;
    const flav = wrapLines(s.flavour, maxW).slice(0, 3);
    const tries = [[1, 150, 0, 1], [1, 128, 0, 1], [1, 108, 0, 1], [1, 88, 0, 1], [1, 68, 0, 1], [0.92, 68, 0, 1], [0.88, 60, 0, 1],
                   [1, 108, 1, 1], [1, 88, 1, 1], [1, 68, 1, 1], [0.92, 60, 1, 1], [0.85, 56, 1, 1], [0.8, 52, 1, 0], [0.75, 52, 1, 0]];
    for (const [f, cbMax, compact, fl] of tries) {
      const cb = Math.min(cbMax, clamp(ph * 0.44, 52, 150));
      const head = 8 + cb + 96;
      const bl = zadBlocks(o, side, maxW, f, compact, held);
      const foot = fl ? 14 + flav.length * 12.5 : 10;
      L = { cb, f, bl, flav: fl ? flav : [], head, fits: head + bl.h + foot <= ph };
      if (L.fits) break;
    }
  } else {
    const sq = clamp(ph - 22, 60, 120), maxW = pw - sq - 40;
    const tries = [[0.95, 0], [0.88, 0], [0.82, 1], [0.76, 1]];
    for (const [f, compact] of tries) {
      const bl = zadBlocks(o, side, maxW, f, compact, held);
      L = { sq, f, bl, flav: [], fits: 58 + bl.h <= ph - 6 };
      if (L.fits) break;
    }
  }
  D.lay.set(key, L);
  return L;
}
function zadFrame(X, Y, PW, PH, edge, side, A, hot, el) {
  // the plate: dark glass, a glow of its element (or the shadow's violet) under its sky
  const g = ctx.createLinearGradient(0, Y, 0, Y + PH);
  if (side) { g.addColorStop(0, rgba('#1f0d38', 0.97 * A)); g.addColorStop(1, rgba('#0a0413', 0.97 * A)); }
  else { g.addColorStop(0, rgba('#0f1830', 0.97 * A)); g.addColorStop(1, rgba('#060912', 0.97 * A)); }
  ctx.fillStyle = g;
  roundRect(X, Y, PW, PH, 14); ctx.fill();
  ctx.save();
  roundRect(X, Y, PW, PH, 14); ctx.clip();
  const rg = ctx.createRadialGradient(X + PW / 2, Y + PH * 0.14, 4, X + PW / 2, Y + PH * 0.14, PW * 0.75);
  rg.addColorStop(0, rgba(side ? ZA_SHADE : ZA_ELCOL[el], 0.2 * A)); rg.addColorStop(1, rgba(side ? ZA_SHADE : ZA_ELCOL[el], 0));
  ctx.fillStyle = rg; ctx.fillRect(X, Y, PW, PH);
  // fine engraved lines down the glass
  ctx.strokeStyle = rgba('#ffffff', 0.025 * A); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = X + 6; x < X + PW; x += 7) { ctx.moveTo(x, Y); ctx.lineTo(x - 30, Y + PH); }
  ctx.stroke();
  ctx.restore();
  // the edges: outer, and an inner hairline
  if (hot > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(edge, 0.22 * hot * A); ctx.lineWidth = 6;
    roundRect(X, Y, PW, PH, 14); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = rgba(edge, (0.5 + 0.5 * hot) * A); ctx.lineWidth = 1.3 + hot;
  roundRect(X, Y, PW, PH, 14); ctx.stroke();
  ctx.strokeStyle = rgba(edge, 0.16 * A); ctx.lineWidth = 0.8;
  roundRect(X + 4.5, Y + 4.5, PW - 9, PH - 9, 10); ctx.stroke();
  // brass corners, and a diamond at the head and the foot
  ctx.strokeStyle = rgba(side ? ZA_SHADE_HI : ZA_GOLD_HI, 0.5 * A); ctx.lineWidth = 1.2;
  const c = 11, i = 9;
  ctx.beginPath();
  ctx.moveTo(X + i, Y + i + c); ctx.lineTo(X + i, Y + i); ctx.lineTo(X + i + c, Y + i);
  ctx.moveTo(X + PW - i - c, Y + i); ctx.lineTo(X + PW - i, Y + i); ctx.lineTo(X + PW - i, Y + i + c);
  ctx.moveTo(X + i, Y + PH - i - c); ctx.lineTo(X + i, Y + PH - i); ctx.lineTo(X + i + c, Y + PH - i);
  ctx.moveTo(X + PW - i - c, Y + PH - i); ctx.lineTo(X + PW - i, Y + PH - i); ctx.lineTo(X + PW - i, Y + PH - i - c);
  ctx.stroke();
  for (const yy of [Y, Y + PH]) {
    zaStar4(X + PW / 2, yy, 4.5, 0, 0.5);
    ctx.fillStyle = rgba(side ? '#2e1065' : '#0b1222', A); ctx.fill();
    ctx.strokeStyle = rgba(side ? ZA_SHADE_HI : ZA_GOLD_HI, 0.7 * A); ctx.lineWidth = 1; ctx.stroke();
  }
}
// the star chart under a plate's sky: a graticule and a ring of degrees
function zadChart(x, y, R, col, A, rot) {
  ctx.save();
  ctx.strokeStyle = rgba(col, 0.13 * A); ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, R * 0.62, 0, TAU); ctx.stroke();
  ctx.setLineDash([2, 4]);
  ctx.beginPath(); ctx.moveTo(x - R, y); ctx.lineTo(x + R, y); ctx.moveTo(x, y - R); ctx.lineTo(x, y + R); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.38, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(col, 0.22 * A);
  ctx.beginPath();
  for (let k = 0; k < 48; k++) {
    const a = rot + k * TAU / 48, L = k % 4 ? 3 : 6;
    ctx.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.lineTo(x + Math.cos(a) * (R + L), y + Math.sin(a) * (R + L));
  }
  ctx.stroke();
  ctx.restore();
}
// a key, drawn as a key cap
function zadCap(t, x, y, A, col) {
  ctx.font = `700 9.5px ${ZA_FM}`;
  const w = Math.max(15, ctx.measureText(t).width + 9), h = 15;
  ctx.fillStyle = rgba('#0b1222', 0.9 * A);
  roundRect(x, y - h / 2, w, h, 4); ctx.fill();
  ctx.strokeStyle = rgba(col || '#64748b', 0.75 * A); ctx.lineWidth = 1;
  roundRect(x, y - h / 2, w, h, 4); ctx.stroke();
  ctx.fillStyle = rgba(col || '#cbd5e1', A);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t, x + w / 2, y + 0.5);
  return w;
}

/* One plate: in front, a sign; flipped, its retrograde. Everything a plate shows
   moves with it: the lift under the cursor, the flip, the sinking, the taking. */
function zadPlate(G, p, o, r, i, now) {
  const D = ZAD, s = zSign(o.id), el = s.el, wide = G.wide;
  const v = D.flip[i], side = v > 0.5, sx = Math.max(0.03, Math.abs(Math.cos(v * Math.PI)));
  const ap = zaQ(now, D.arr[i], D.arr[i] + 0.5);
  if (ap <= 0) return;
  const took = r.done && D.took === i, other = r.done && !took, kd = now - D.doneT;
  const hot = r.done ? (took ? 1 : 0) : D.hov[i];
  let A = zaE(ap), lift = -5 * D.hov[i] + (1 - zaO(ap)) * 26;
  if (other) { A *= 1 - 0.66 * zaE(kd / 0.5); lift += 16 * zaE(kd / 0.6); }
  if (took) lift -= 7 * zaE(kd / 0.35);
  // a sign at III can't turn: it shivers when the switch goes
  const shiver = r.retro && !zRetroOk(o) && !r.done ? Math.sin((now - D.retroT) * 60) * 2.2 * (1 - zaQ(now, D.retroT, D.retroT + 0.35)) : 0;
  const X = p.x + shiver, Y = p.y + lift, PW = p.w, PH = p.h, cx = X + PW / 2;
  const edge = side ? ZA_SHADE : took ? ZA_GOLD : ZA_ELCOL[el];
  ctx.save();
  ctx.translate(cx, Y + PH / 2); ctx.scale(sx, 1); ctx.translate(-cx, -(Y + PH / 2));
  zadFrame(X, Y, PW, PH, edge, side, A, hot, el);
  ctx.save();
  roundRect(X + 2, Y + 2, PW - 4, PH - 4, 12); ctx.clip();
  const L = zadLayout(o, side, PW, PH, wide, D.held[i] | 0);
  const reveal = zaQ(now, D.arr[i] + 0.18, D.arr[i] + 0.72);
  if (wide) zadFaceWide(X, Y, PW, PH, o, r, i, side, A, now, L, reveal, took, kd);
  else zadFaceNarrow(X, Y, PW, PH, o, r, i, side, A, now, L, reveal, took, kd);
  ctx.restore();
  // mid-flip, a sheet of light crosses the glass
  if (v > 0.04 && v < 0.96) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = 1 - sx;
    const lg = ctx.createLinearGradient(X, 0, X + PW, 0);
    lg.addColorStop(0, rgba(ZA_SHADE_HI, 0)); lg.addColorStop(0.5, rgba('#f5f3ff', 0.35 * k * A)); lg.addColorStop(1, rgba(ZA_SHADE_HI, 0));
    ctx.fillStyle = lg; roundRect(X, Y, PW, PH, 14); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  return { x: cx, y: Y + (wide ? 8 + L.cb / 2 : PH / 2), s: wide ? Math.min(L.cb * 0.9, PW * 0.72) : L.sq * 0.8 };
}

function zadFaceWide(X, Y, PW, PH, o, r, i, side, A, now, L, reveal, took, kd) {
  const D = ZAD, s = zSign(o.id), el = s.el, ec = ZA_ELCOL[el], held = D.held[i] | 0;
  const cx = X + PW / 2, cb = L.cb, ccy = Y + 8 + cb / 2, csz = Math.min(cb * 0.9, PW * 0.72);
  const mag = L.bl.mag, inkGold = side ? ZA_SHADE_HI : ZA_GOLD;
  // the sky: a star chart, the glyph faint behind it, the constellation
  zadChart(cx, ccy, cb * 0.44, side ? ZA_SHADE_HI : '#c7d2fe', A, now * 0.05 * (side ? -1 : 1));
  zaGlyph(o.id, cx, ccy, cb * 0.36, side ? ZA_SHADE : ec, { a: 0.07 * A, lw: 0.12 });
  const nl = ZA.sky[o.id].l.length;
  const arrived = zaQ(now, D.arr[i] - 0.02, D.arr[i] + 0.12) * (r.done && !took ? 1 - zaQ(kd, 0.12, 0.3) : 1);
  if (took) {
    // taken: drawn whole in gold, folded into its glyph, and the glyph left burning
    const lk = zaQ(kd, 0, 0.32) * nl, fold = zaE(zaQ(kd, 0.36, 0.86)), gA = zaQ(kd, 0.62, 0.95);
    zaConst(o.id, cx, ccy, csz, { a: A, line: lk, lineA: 0.9, lineCol: inkGold, fold, glyphS: cb * 0.3, spark: 1.2 });
    if (gA > 0) {
      const ring = zaQ(kd, 0.62, 1.3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(inkGold, 0.7 * (1 - ring) * A); ctx.lineWidth = 2.5 * (1 - ring) + 0.5;
      ctx.beginPath(); ctx.arc(cx, ccy, cb * (0.22 + ring * 0.5), 0, TAU); ctx.stroke();
      ctx.restore();
      zaGlyph(o.id, cx, ccy, cb * 0.3, side ? ZA_SHADE_HI : ZA_GOLD_HI, { a: gA * A, lw: 0.13, glow: 1.2, core: 1, retro: side ? gA : 0 });
    }
  } else if (arrived > 0) {
    zaConst(o.id, cx, ccy, csz, { a: A * arrived, lineA: side ? 0.32 : 0.22, lineCol: side ? ZA_SHADE_HI : '#cbd5e1', seed: i * 7 });
    if (D.lp[i] > 0) zaConst(o.id, cx, ccy, csz, { a: A, line: D.lp[i], lineA: 0.85, lineCol: inkGold, tw: 0, spark: 0 });
  }
  // its star, named small under the sky
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 8.5px ${ZA_FM}`;
  ctx.fillStyle = rgba(side ? '#c4b5fd' : '#7c8db0', 0.8 * A * reveal);
  ctx.fillText(ZA.sky[o.id].star, cx, Y + 8 + cb + 2);
  // the key, and the element
  if (!r.done) zadCap(String(i + 1), X + 14, Y + 20, A, side ? ZA_SHADE_HI : '#94a3b8');
  ctx.font = `700 9px ${ZA_FB}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = rgba(ec, 0.9 * A);
  ctx.fillText(Z_EL[el].n, X + PW - 16, Y + 24);
  zaElem(el, X + PW - 26 - ctx.measureText(Z_EL[el].n).width, Y + 20.5, 4.6, ec, 0.9 * A, 1.2);
  // the words write in under a scan of light
  let y = Y + 8 + cb + 22;
  const textTop = y - 18, textBot = Y + PH - 6, rv = reveal >= 1 ? 1 : reveal;
  ctx.save();
  if (rv < 1) { ctx.beginPath(); ctx.rect(X, textTop, PW, (textBot - textTop) * rv); ctx.clip(); }
  // the name, its glyph beside it
  const nmPx = fitFont(s.n, PW - 72, '800', 21, ZA_FD, 14);
  const nmW = ctx.measureText(s.n).width, gS = nmPx * 0.36, gx = cx - nmW / 2 - gS - 7;
  ctx.textAlign = 'left';
  ctx.fillStyle = rgba('#f8fafc', A);
  ctx.fillText(s.n, gx + gS + 7, y);
  zaGlyph(o.id, gx, y - nmPx * 0.36, gS, side ? ZA_SHADE_HI : ZA_GOLD_HI, { a: A, lw: 0.2, glow: 0.5, retro: side ? 1 : 0 });
  y += 15;
  ctx.textAlign = 'center';
  ctx.font = `600 9.5px ${ZA_FB}`;
  ctx.fillStyle = rgba('#8090ab', A);
  zaSpaced(s.t.toUpperCase() + '  ·  ' + ZA_RULER[o.id], cx, y, 1.2);
  y += 11;
  // the rule, with a star at its middle
  ctx.strokeStyle = rgba(inkGold, 0.3 * A); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X + 22, y); ctx.lineTo(cx - 8, y); ctx.moveTo(cx + 8, y); ctx.lineTo(X + PW - 22, y); ctx.stroke();
  zaStar4(cx, y, 3.4, 0, 0.4); ctx.fillStyle = rgba(inkGold, 0.8 * A); ctx.fill();
  y += 12;
  // the pips: what you hold, what this brings, the retrograde one; then the magnitude's name
  const shown = took ? Math.min(mag, held + Math.floor(zaQ(kd, 0.95, 1.6) * (mag - held + 0.999))) : mag;
  const pipFrom = side ? mag : 0;
  zaPips(cx, y, 4.6, took ? Math.min(held, shown) : held, took ? Math.max(shown, held) : mag, pipFrom, A, 15);
  if (took && kd > 0.95 && kd < 1.9) {
    const k = clamp(shown - held, 0, 3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let m = held + 1; m <= held + k; m++) {
      const t = zaQ(kd, 0.95 + (m - held - 1) * 0.2, 1.35 + (m - held - 1) * 0.2);
      if (t > 0 && t < 1) zaGlint(cx + (m - 2) * 15, y, 26 * (1 - t), '#fffbeb', 0.9 * (1 - t), t * 1.2);
    }
    ctx.restore();
  }
  y += 18;
  ctx.font = `800 11px ${ZA_FD}`;
  ctx.fillStyle = rgba(inkGold, A);
  zaSpaced(Z_RN[mag] + '  ·  ' + Z_MAG[mag] + (held ? '   (FROM ' + Z_RN[held] + ')' : ''), cx, y, 1.6);
  y += 15;
  // what it does: every magnitude this takes you through
  ctx.textAlign = 'left';
  const lx = X + 15;
  for (const b of L.bl.out) {
    ctx.font = b.font;
    for (let k = 0; k < b.lines.length; k++) {
      if (y > Y + PH - 10) break;
      if (b.kind === 'head' && k === 0) {
        ctx.fillStyle = rgba(b.retro ? ZA_SHADE_HI : ZA_GOLD, A);
        ctx.fillText(b.rn, lx, y);
        const rw = ctx.measureText(b.rn + '  ').width;
        ctx.fillStyle = rgba(b.col, A);
        ctx.fillText(b.lines[0], lx + rw, y);
      } else if (b.kind === 'shade' && k === 0) {
        zaEclipse(lx + 4, y - 4, 3.6, A);
        ctx.fillStyle = rgba(b.col, A);
        ctx.fillText(b.lines[0], lx + 13, y);
      } else {
        ctx.fillStyle = rgba(b.col, A);
        ctx.fillText(b.lines[k], lx, y);
      }
      y += b.lh;
    }
    y += b.gap;
  }
  if (r.retro && !r.done && !zRetroOk(o)) {
    ctx.font = `italic 400 10.5px ${ZA_FB}`;
    ctx.fillStyle = rgba('#7c8aa3', A);
    for (const ln of wrapLines('It can go no higher: it is read as it is, with no shadow.', PW - 30)) { ctx.fillText(ln, lx, y); y += 12.5; }
  }
  // the flavour, at the foot
  if (L.flav.length) {
    ctx.font = `italic 400 10.5px ${ZA_FB}`;
    ctx.fillStyle = rgba(side ? '#7e6a9e' : '#5d6b85', A);
    ctx.textAlign = 'center';
    let fy = Math.max(y + 8, Y + PH - 14 - (L.flav.length - 1) * 12.5);
    for (const ln of L.flav) { ctx.fillText(ln, cx, fy); fy += 12.5; }
  }
  ctx.restore();
  if (rv > 0 && rv < 1) {     // the scan's edge
    const sy = textTop + (textBot - textTop) * rv;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(X, 0, X + PW, 0);
    lg.addColorStop(0, rgba(inkGold, 0)); lg.addColorStop(0.5, rgba(ZA_GOLD_PALE, 0.8 * A)); lg.addColorStop(1, rgba(inkGold, 0));
    ctx.fillStyle = lg; ctx.fillRect(X + 6, sy - 1, PW - 12, 2);
    ctx.restore();
  }
}

function zadFaceNarrow(X, Y, PW, PH, o, r, i, side, A, now, L, reveal, took, kd) {
  const D = ZAD, s = zSign(o.id), el = s.el, ec = ZA_ELCOL[el], held = D.held[i] | 0, mag = L.bl.mag;
  const sq = L.sq, scx = X + 10 + sq / 2, scy = Y + PH / 2, inkGold = side ? ZA_SHADE_HI : ZA_GOLD;
  zadChart(scx, scy, sq * 0.42, side ? ZA_SHADE_HI : '#c7d2fe', A, now * 0.05);
  const nl = ZA.sky[o.id].l.length;
  if (took) {
    const fold = zaE(zaQ(kd, 0.36, 0.86)), gA = zaQ(kd, 0.62, 0.95);
    zaConst(o.id, scx, scy, sq * 0.8, { a: A, line: zaQ(kd, 0, 0.32) * nl, lineA: 0.9, lineCol: inkGold, fold, glyphS: sq * 0.28 });
    if (gA > 0) zaGlyph(o.id, scx, scy, sq * 0.28, side ? ZA_SHADE_HI : ZA_GOLD_HI, { a: gA * A, lw: 0.13, glow: 1.2, core: 1, retro: side ? gA : 0 });
  } else {
    zaConst(o.id, scx, scy, sq * 0.8, { a: A * zaQ(now, D.arr[i] - 0.02, D.arr[i] + 0.12), lineA: 0.3, lineCol: side ? ZA_SHADE_HI : '#cbd5e1' });
    if (D.lp[i] > 0) zaConst(o.id, scx, scy, sq * 0.8, { a: A, line: D.lp[i], lineA: 0.85, lineCol: inkGold, tw: 0, spark: 0 });
  }
  const lx = X + sq + 24, rx = X + PW - 12;
  ctx.save();
  if (reveal < 1) { ctx.beginPath(); ctx.rect(lx - 4, Y, (rx - lx + 8) * reveal, PH); ctx.clip(); }
  let y = Y + 22;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const nmPx = fitFont(s.n, rx - lx - 70, '800', 18, ZA_FD, 12);
  zaGlyph(o.id, lx + nmPx * 0.34, y - nmPx * 0.36, nmPx * 0.34, side ? ZA_SHADE_HI : ZA_GOLD_HI, { a: A, glow: 0.4, retro: side ? 1 : 0 });
  ctx.fillStyle = rgba('#f8fafc', A);
  ctx.fillText(s.n, lx + nmPx * 0.68 + 7, y);
  if (!r.done) zadCap(String(i + 1), rx - 16, Y + 15, A, side ? ZA_SHADE_HI : '#94a3b8');
  y += 14;
  ctx.font = `600 9.5px ${ZA_FB}`;
  ctx.fillStyle = rgba(ec, 0.9 * A);
  ctx.fillText(Z_EL[el].n + '  ·  ' + s.t.toUpperCase(), lx, y);
  y += 14;
  zaPips(lx + 15, y - 3, 4, held, mag, side ? mag : 0, A, 12);
  ctx.font = `800 10.5px ${ZA_FD}`;
  ctx.fillStyle = rgba(inkGold, A);
  ctx.fillText(Z_RN[mag] + ' · ' + Z_MAG[mag], lx + 40, y);
  y += 15;
  for (const b of L.bl.out) {
    ctx.font = b.font;
    for (let k = 0; k < b.lines.length; k++) {
      if (y > Y + PH - 6) break;
      ctx.fillStyle = rgba(b.kind === 'head' && k === 0 ? (b.retro ? ZA_SHADE_HI : ZA_GOLD_HI) : b.col, A);
      ctx.fillText((b.kind === 'head' && k === 0 ? b.rn + '  ' : '') + b.lines[k], lx, y);
      y += b.lh;
    }
    y += b.gap * 0.6;
  }
  ctx.restore();
}

/* ---------------------------------- the controls ---------------------------------- */
function zadButton(b, label, key, col, on, icon, A, dim) {
  if (!b) return;
  const hot = !dim && inRect(mouse.x, mouse.y, b), c = dim ? '#475569' : col;
  ctx.save();
  if (on || hot) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(b.x + b.w / 2, b.y + b.h / 2, b.w * 0.55, c, (on ? 0.22 + 0.08 * Math.sin(uiTime * 4) : 0.14) * A);
    ctx.globalCompositeOperation = 'source-over';
  }
  const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  g.addColorStop(0, rgba(on ? '#2e1065' : '#111a2e', 0.95 * A)); g.addColorStop(1, rgba(on ? '#1a0733' : '#070b16', 0.95 * A));
  ctx.fillStyle = g;
  roundRect(b.x, b.y, b.w, b.h, b.h / 2); ctx.fill();
  ctx.strokeStyle = rgba(c, (on || hot ? 1 : 0.5) * A); ctx.lineWidth = on || hot ? 1.8 : 1.2;
  roundRect(b.x, b.y, b.w, b.h, b.h / 2); ctx.stroke();
  // its mark
  const ix = b.x + 19, iy = b.y + b.h / 2, ir = 6.5;
  ctx.strokeStyle = rgba(c, A); ctx.fillStyle = rgba(c, A); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  if (icon === 'retro') {
    ctx.beginPath(); ctx.arc(ix, iy, ir, -0.4, Math.PI * 1.35, false); ctx.stroke();
    const e = -0.4; ctx.beginPath(); ctx.moveTo(ix + Math.cos(e) * ir + 3, iy + Math.sin(e) * ir - 2);
    ctx.lineTo(ix + Math.cos(e) * ir, iy + Math.sin(e) * ir); ctx.lineTo(ix + Math.cos(e) * ir - 1, iy + Math.sin(e) * ir - 4); ctx.stroke();
  } else if (icon === 'turn') {
    const t = uiTime * (hot ? 2 : 0.4);
    for (const s of [0, Math.PI]) {
      ctx.beginPath(); ctx.arc(ix, iy, ir, t + s + 0.3, t + s + 2.6); ctx.stroke();
      const e = t + s + 2.6, ex = ix + Math.cos(e) * ir, ey = iy + Math.sin(e) * ir;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - Math.cos(e + 0.9) * 3.4, ey - Math.sin(e + 0.9) * 3.4); ctx.stroke();
    }
  } else if (icon === 'leave') {
    ctx.beginPath(); ctx.moveTo(ix - ir, iy); ctx.quadraticCurveTo(ix, iy + ir * 0.95, ix + ir, iy); ctx.stroke();
    for (const k of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.moveTo(ix + k * ir, iy + ir * 0.48); ctx.lineTo(ix + k * ir * 1.3, iy + ir * 0.95); ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.moveTo(ix - 3, iy - 5); ctx.lineTo(ix + 3, iy); ctx.lineTo(ix - 3, iy + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix + 2, iy - 5); ctx.lineTo(ix + 8, iy); ctx.lineTo(ix + 2, iy + 5); ctx.stroke();
  }
  // its words, and its key at the far end
  const kw = key ? 26 : 0;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  fitFont(label, b.w - 46 - kw, '700', 11.5, ZA_FD, 8);
  ctx.fillStyle = rgba(dim ? '#64748b' : '#f1f5f9', A);
  ctx.fillText(label, b.x + 30 + (b.w - 30 - kw - 8) / 2, b.y + b.h / 2 + 0.5);
  if (key && !isTouch) {
    ctx.font = `700 9px ${ZA_FM}`;
    const w = Math.max(15, ctx.measureText(key).width + 8);
    zadCap(key, b.x + b.w - w - 10, b.y + b.h / 2, A, c);
  }
  ctx.restore();
}
// the line of keys at the foot: 1 2 3 take · R retrograde · T turn the dome (30) · ESC leave it dark
function zadKeys(y, A, cost) {
  const parts = [['k', '1'], ['g', 2], ['k', '2'], ['g', 2], ['k', '3'], ['t', ' take'], ['d'], ['k', 'R'], ['t', ' retrograde'], ['d'],
                 ['k', 'T'], ['t', ' turn the dome (' + cost + ')'], ['d'], ['k', 'ESC'], ['t', ' leave it dark']];
  ctx.font = `500 10.5px ${ZA_FB}`;
  const wOf = q => {
    if (q[0] === 'k') { ctx.font = `700 9.5px ${ZA_FM}`; const w = Math.max(15, ctx.measureText(q[1]).width + 9); ctx.font = `500 10.5px ${ZA_FB}`; return w; }
    if (q[0] === 'g') return q[1];
    if (q[0] === 'd') return 20;
    return ctx.measureText(q[1]).width;
  };
  let tw = 0;
  for (const q of parts) tw += wOf(q);
  let x = W / 2 - tw / 2;
  for (const q of parts) {
    const w = wOf(q);
    if (q[0] === 'k') zadCap(q[1], x, y, A, '#64748b');
    else if (q[0] === 't') { ctx.font = `500 10.5px ${ZA_FB}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba('#64748b', A); ctx.fillText(q[1], x, y + 0.5); }
    else if (q[0] === 'd') { zaStar4(x + 10, y, 2.4, 0, 0.4); ctx.fillStyle = rgba('#475569', A); ctx.fill(); }
    x += w;
  }
}
// your sky so far, top left: the signs you hold as medallions, and the shadow you carry
function zadYourSky(A) {
  const held = ZA_ORDER.filter(id => zm(id) > 0);
  if (!held.length) return;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 9px ${ZA_FB}`;
  const r = W >= 640 ? 11 : 8, y0 = W >= 640 ? H - 92 : 34;
  ctx.fillStyle = rgba('#64748b', A);
  zaSpaced('YOUR SKY', 20 + ctx.measureText('YOUR SKY').width / 2 + 7, y0 - r - 9, 1.6);
  held.forEach((id, k) => zaMedal(20 + r + k * (r * 2 + 8), y0, r, id, zm(id), { a: A, shadow: zsh(id) ? 1 : 0 }));
  let x = 20;
  ctx.font = `700 9px ${ZA_FB}`;
  for (const el of Object.keys(Z_EL)) if (zTri(el)) {
    zaElem(el, x + 5, y0 + r + 18, 4.6, Z_EL[el].col, A, 1.2);
    ctx.fillStyle = rgba(Z_EL[el].col, A);
    ctx.fillText(Z_EL[el].tri, x + 13, y0 + r + 21.5);
    x += ctx.measureText(Z_EL[el].tri).width + 26;
  }
}

/* ---------------------------------- the screen ---------------------------------- */
function drawPlanetarium() {
  const r = P.zRead, D = ZAD, now = uiTime, dt = clamp(now - D.last, 0, 0.05);
  D.last = now;
  if (!D.open || r !== D.rd || now - D.seen > 0.35) zadBegin(r);
  D.seen = now;
  zadTrack(r, now, dt);
  const T = now - D.t0, B = planetButtons(), G = zadGeo(B), A = zaQ(T, 0.9, 1.3);
  zadGround(G, T, now);
  zadWheel(G, r, T, now, B);
  // the title, up in the dome
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `700 11px ${ZA_FD}`;
  ctx.fillStyle = rgba('#a5b4fc', 0.75 * zaQ(T, 0.3, 0.8));
  zaSpaced('THE PLANETARIUM', W / 2, 24, 5);
  const hasRead = r && r.offers.length;
  if (!hasRead) {
    ctx.font = `600 13px ${ZA_FB}`;
    ctx.fillStyle = rgba('#94a3b8', zaQ(T, 0.6, 1));
    ctx.fillText(r ? 'the sky has nothing left to tell you' : 'the stars are reading for your wingman', W / 2, H / 2);
  } else {
    ctx.font = `500 11px ${ZA_FB}`;
    ctx.fillStyle = rgba(r.done ? ZA_GOLD_HI : r.retro ? ZA_SHADE_HI : '#7c8aa3', zaQ(T, 0.6, 1));
    zaSpaced(r.done ? 'the reading is taken' : r.retro ? 'read backwards, they ask for something back' : 'three signs have risen: take one',
             W / 2, Math.max(G.rim + 16, B.plates[0].y - 12), 1.1);
    // hover, and the lines joining up
    for (let i = 0; i < B.plates.length; i++) {
      const on = !r.done && T > ZAD_OPEN * 0.8 && inRect(mouse.x, mouse.y, B.plates[i]);
      D.hov[i] += ((on ? 1 : 0) - D.hov[i]) * Math.min(1, dt * 10);
      const nl = ZA.sky[r.offers[i].id].l.length;
      D.lp[i] = clamp(D.lp[i] + (on ? 16 : -40) * dt, 0, nl);
    }
    const boxes = [];
    for (const p of B.plates) boxes[p.i] = zadPlate(G, p, r.offers[p.i], r, p.i, now);
    // the descents over everything: down into the plates, and (taken, or the dome turned) back up
    const fl = W >= 640 ? 'wide' : 'narrow';
    for (const p of B.plates) {
      const o = r.offers[p.i], bx = boxes[p.i];
      if (!bx) continue;
      zadDescent(G, o.id, p, bx, zaQ(now, D.arr[p.i] - 0.5, D.arr[p.i]), 1);
      if (r.done && D.took !== p.i) zadDescent(G, o.id, p, bx, 1 - zaQ(now, D.doneT + 0.2, D.doneT + 0.85), 0.8);
      if (r.done && D.took === p.i) D.flyFrom = { x: bx.x, y: bx.y, id: o.id, retro: !!(r.took && r.took.retro), fl };
    }
    if (D.prev && now - D.turnT < 0.3) {      // the old plates let go of their skies
      const k = (now - D.turnT) / 0.3;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of B.plates) {
        ctx.strokeStyle = rgba('#7dd3fc', 0.7 * (1 - k)); ctx.lineWidth = 1.5 + 4 * k;
        roundRect(p.x - 6 * k, p.y - 6 * k, p.w + 12 * k, p.h + 12 * k, 14); ctx.stroke();
      }
      ctx.restore();
    }
    if (D.prev && now - D.turnT < 0.55) {
      D.prev.forEach((o, i) => {
        const p = B.plates[i];
        if (!p || !o) return;
        const bx = { x: p.x + p.w / 2, y: p.y + (G.wide ? 8 + clamp(p.h * 0.44, 52, 150) / 2 : p.h / 2), s: G.wide ? 100 : 60 };
        zadDescent(G, o.id, p, bx, 1 - zaQ(now, D.turnT, D.turnT + 0.5), 0.9);
      });
    }
  }
  // the controls
  const bA = zaQ(T, 1.0, 1.35);
  if (B.retro) zadButton(B.retro, 'RETROGRADE', 'R', ZA_SHADE, r.retro, 'retro', bA);
  if (B.turn) { const c = zTurnCost(), ok = credits >= c; zadButton(B.turn, 'TURN THE DOME  ' + c, 'T', '#7dd3fc', false, 'turn', bA, !ok); }
  zadButton(B.leave, r && r.done ? 'CONTINUE' : 'WALK AWAY', r && r.done ? '' : 'ESC', r && r.done ? COL.hp : '#94a3b8', false, r && r.done ? 'go' : 'leave', bA);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (r && r.msg) {
    ctx.font = `700 12px ${ZA_FB}`;
    ctx.fillStyle = rgba('#fca5a5', 0.75 + 0.25 * Math.sin(now * 8));
    ctx.fillText(r.msg, W / 2, B.leave.y + B.leave.h + 16);
  }
  // the foot: the keys, and the dome's last word
  if (!isTouch && hasRead && !r.done && H > 420) zadKeys(H - 38, 0.9 * bA, zTurnCost());
  ctx.font = `italic 400 10.5px ${ZA_FB}`;
  ctx.fillStyle = rgba('#475569', bA);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('the stars give freely; read them backwards and they ask for something back.', W / 2, H - 16);
  // credits, top right; your sky so far, top left
  ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  ctx.font = `600 12px ${ZA_FM}`;
  const ct = Math.round(credits) + ' CR', cw = ctx.measureText(ct).width;
  ctx.fillStyle = rgba(ZA_GOLD, zaQ(T, 0.4, 0.9));
  ctx.fillText(ct, W - 18, 24);
  ctx.strokeStyle = rgba(ZA_GOLD, 0.8 * zaQ(T, 0.4, 0.9)); ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(W - 18 - cw - 10, 20, 5.5, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(W - 18 - cw - 10, 20, 2.6, 0, TAU); ctx.stroke();
  zadYourSky(zaQ(T, 0.5, 1));
}
/* ============================= end of the dome (zad) ============================= */
