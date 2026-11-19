/* =============== THE PLANETARIUM — the codex's atlas (art, 19 Nov 2026) ===============
   The ZODIAC section of the codex in its own look. While it is open, every piece of
   the codex that FORGOTTEN TALES draws (TA's hooks) is drawn from ZCX_ART instead,
   wherever it has one, and TALES_ART everywhere else: the paper book becomes a star
   atlas. The night sky behind it all, a great wheel turning faintly through it, the
   rail and the cards in navy glass with gold rules, and a book of star charts.
     the wheel   on a screen with room for it, the twelve signs stand round a wheel
                 in their order, Aries at the left, and the four Grand Trines sit
                 in its middle. Each trine is a triangle drawn across the wheel
                 through its three signs, faint until it has been completed.
     a card      the sign's constellation, from its real stars (the sky block), its
                 name and its three pages as stars. Not yet read, its stars alone,
                 unlit and unjoined.
     the book    star-chart pages, the plate a chart with the constellation on it,
                 and the three voices in their own light inks.
   It also writes page I's record of a sign from SIGNS itself (zcxRecord), under
   the Bookkeeper's paragraph, so the codex never states a number the game has
   moved on from. Layout: codexGeom asks zcxWheelGeom whether the wheel fits,
   codexCellRect places a cell on it (zcxCellAt), and drawCodex draws the wheel
   under the cards (zcxWheel). Reads only; holds no state of its own. Needs the
   sky block (za*) and the dome's far sky (zadSkyBuf).
======================================================================================= */
const ZCX = { gold: '#fbbf24', hi: '#fde68a', pale: '#ede4cf', dim: '#8f99bd', mute: '#5d688f', faint: '#2f3960',
              n1: '#080d20', n2: '#0e1631', n3: '#17214a', page: '#0a1130', red: '#fca5a5',
              voice: ['#fbbf24', '#93c5fd', '#d8b4fe', '#fca5a5'] };
// the three voices, inked for a dark page: the record in parchment, the maker in pale blue, the tale in lilac
const ZCX_FACE = [
  { fam: TALE_FACE[0].fam, wt: '400', ink: '#ede4cf' },
  { fam: TALE_FACE[1].fam, wt: '400', ink: '#a9cdf7' },
  { fam: TALE_FACE[2].fam, wt: 'italic 400', ink: '#e6d6ff' },
  { fam: TALE_FACE[3].fam, wt: '400', ink: '#fecaca' }
];
function zcxOn() { return state === 'codex' && !!CODEX_TABS[codexTab] && CODEX_TABS[codexTab].id === 'z'; }
const zcxCap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// page I of a sign or a trine: his paragraph, then what the game says it does, today
function zcxRecord(en, lead) {
  const out = [];
  if (lead) out.push(lead);
  if (en.kind === 'sign') {
    const s = en.sign, el = Z_EL[s.el];
    out.push('The dome reads it so: ‘' + s.flavour + '’');
    s.mags.forEach((t, k) => {
      const [n, d] = zHalves(t);
      out.push('`' + Z_RN[k + 1] + ' ' + Z_MAG[k + 1] + '` ' + n + '. ' + zcxCap(d) + '.');
    });
    const [sn, sd] = zHalves(s.shadow);
    out.push('`RETROGRADE` It arrives a magnitude higher, and its shadow, ' + sn + ', comes with it: ' + sd + ', until the sky turns.');
    const others = el.signs.filter(x => x !== s.id).map(x => zSign(x).n);
    out.push('`' + el.n + '` With ' + others.join(' and ') + ', its Grand Trine: ' + el.tri + '.');
  } else {
    const el = Z_EL[en.ref];
    out.push('`' + el.tri + '` ' + el.d);
  }
  return out.join('\n\n');
}

/* ---------------------------------- the wheel ---------------------------------- */
function zcxWheelGeom(g) {
  if (g.narrow || g.tight || g.gw < 520 || g.viewH < 330) return null;
  const cs = Math.round(clamp(Math.min(g.gw / 7.6, g.viewH / 4.6), 74, 118));
  const cx = g.gx + g.gw / 2, cy = g.gy + g.viewH / 2, rx = g.gw / 2 - cs / 2 - 4, ry = g.viewH / 2 - cs / 2 - 4;
  // the twelve spaced evenly along the ring itself, not by angle: a wide ring bunches by angle at its ends
  const N = 240, at = k => { const a = Math.PI + k / N * TAU; return [cx + Math.cos(a) * rx, cy - Math.sin(a) * ry]; };
  const run = [0];
  for (let k = 1; k <= N; k++) { const [x0, y0] = at(k - 1), [x1, y1] = at(k); run.push(run[k - 1] + Math.hypot(x1 - x0, y1 - y0)); }
  const sp = [];
  for (let i = 0, k = 0; i < 12; i++) {
    const want = run[N] * i / 12;
    while (k < N && run[k + 1] < want) k++;
    const f = (want - run[k]) / Math.max(1e-6, run[k + 1] - run[k]), [x0, y0] = at(k), [x1, y1] = at(k + 1);
    sp.push({ x: lerp(x0, x1, f), y: lerp(y0, y1, f) });
  }
  return { cs, ts: Math.round(cs * 0.82), cx, cy, rx, ry, sp };
}
// where entry i stands: the twelve round the wheel from Aries at the left, the four trines in its middle
function zcxCentre(Wh, i) {
  if (i < 12) return { x: Wh.sp[i].x, y: Wh.sp[i].y, s: Wh.cs };
  const j = i - 12;
  return { x: Wh.cx + (j % 2 ? 1 : -1) * Wh.ts * 0.56, y: Wh.cy + (j < 2 ? -1 : 1) * Wh.ts * 0.56, s: Wh.ts };
}
function zcxCellAt(Wh, i) {
  const c = zcxCentre(Wh, i);
  return { x: c.x - c.s / 2 + 4, y: c.y - c.s / 2 + 4, w: c.s - 8, h: c.s - 8 };
}
// under the cards: the ring they stand on, its degrees, and the four trines drawn across it
function zcxWheel(Wh) {
  const t = uiTime;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(253,230,138,0.16)';
  ctx.beginPath(); ctx.ellipse(Wh.cx, Wh.cy, Wh.rx, Wh.ry, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(253,230,138,0.08)';
  ctx.setLineDash([2, 7]);
  ctx.beginPath(); ctx.ellipse(Wh.cx, Wh.cy, Wh.rx * 0.64, Wh.ry * 0.64, 0, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(253,230,138,0.12)';
  ctx.beginPath();
  for (let k = 0; k < 72; k++) {
    const a = k * TAU / 72 + t * 0.004, L = k % 6 ? 0.025 : 0.05;
    ctx.moveTo(Wh.cx + Math.cos(a) * Wh.rx * (1 + L), Wh.cy - Math.sin(a) * Wh.ry * (1 + L));
    ctx.lineTo(Wh.cx + Math.cos(a) * Wh.rx * (1 + L * 2.2), Wh.cy - Math.sin(a) * Wh.ry * (1 + L * 2.2));
  }
  ctx.stroke();
  // the trines: a triangle each, through its three signs
  for (const el of Object.keys(Z_EL)) {
    const pts = Z_EL[el].signs.map(id => zcxCentre(Wh, ZA_ORDER.indexOf(id)));
    const done = Tales.has('z:tri-' + el, 0), col = ZA_ELCOL[el];
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); ctx.lineTo(pts[2].x, pts[2].y); ctx.closePath();
    if (done) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(col, 0.16 + 0.05 * Math.sin(t * 1.4 + el.length)); ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba(col, 0.6); ctx.lineWidth = 1.3; ctx.stroke();
    } else {
      ctx.setLineDash([3, 6]); ctx.strokeStyle = rgba(col, 0.16); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // the middle's own heading
  ctx.font = '700 9px ' + ZA_FD; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(253,230,138,0.55)';
  zaSpaced('THE GRAND TRINES', Wh.cx, Wh.cy - Wh.ts * 1.06 - 6, 2.2);
  ctx.restore();
}

/* ---------------------------------- small pieces ---------------------------------- */
function zcxRule(x0, x1, y, a) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, rgba(ZCX.gold, a)); g.addColorStop(1, rgba(ZCX.gold, 0));
  ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), y - 0.5, Math.abs(x1 - x0), 1);
}
function zcxCorners(x, y, w, h, k, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y + k); ctx.lineTo(x, y); ctx.lineTo(x + k, y);
  ctx.moveTo(x + w - k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + k);
  ctx.moveTo(x, y + h - k); ctx.lineTo(x, y + h); ctx.lineTo(x + k, y + h);
  ctx.moveTo(x + w - k, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - k);
  ctx.stroke();
}
function zcxStarPip(x, y, s, st) {
  ctx.save();
  if (st === 'new') { ctx.globalCompositeOperation = 'lighter'; drawGlow(x, y, s * 3.4, ZCX.gold, 0.55); ctx.globalCompositeOperation = 'source-over'; }
  zaStar4(x, y, s, 0, 0.38);
  if (st === 'open' || st === 'new') { ctx.fillStyle = st === 'new' ? ZCX.hi : ZCX.gold; ctx.fill(); }
  else if (st === 'sealed') { ctx.fillStyle = '#b91c1c'; ctx.fill(); }
  else if (st === 'none') { ctx.fillStyle = ZCX.faint; ctx.beginPath(); ctx.arc(x, y, 1.2, 0, TAU); ctx.fill(); }
  else { ctx.strokeStyle = st === 'held' ? ZCX.mute : ZCX.dim; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
}

/* ---------------------------------- the hooks ---------------------------------- */
const ZCX_ART = {
  'frame.back'(worn) {
    taWorn = !!worn;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0e27'); g.addColorStop(0.55, '#05071a'); g.addColorStop(1, '#020309');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.85; ctx.drawImage(zadSkyBuf(), 0, 0, W, H); ctx.globalAlpha = 1;
    const n = ctx.createRadialGradient(W * 0.68, H * 0.42, 10, W * 0.68, H * 0.42, Math.max(W, H) * 0.6);
    n.addColorStop(0, 'rgba(76,52,140,0.22)'); n.addColorStop(1, 'rgba(76,52,140,0)');
    ctx.fillStyle = n; ctx.fillRect(0, 0, W, H);
    // a great wheel behind it all, turning about once an hour
    const cx = W * 0.6, cy = H * 0.56, R = Math.max(W, H) * 0.47, rot = uiTime * 0.0017;
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(253,230,138,0.05)';
    for (const f of [1, 0.9, 0.62]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, TAU); ctx.stroke(); }
    ctx.beginPath();
    for (let k = 0; k < 72; k++) {
      const a = rot + k * TAU / 72, L = k % 6 ? 0.97 : 0.94;
      ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * R * L, cy + Math.sin(a) * R * L);
    }
    for (let k = 0; k < 12; k++) {
      const a = rot + k * TAU / 12;
      ctx.moveTo(cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62); ctx.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
    }
    ctx.stroke();
    ZA_ORDER.forEach((id, k) => {
      const a = rot + (k + 0.5) * TAU / 12;
      zaGlyph(id, cx + Math.cos(a) * R * 0.76, cy + Math.sin(a) * R * 0.76, R * 0.03, ZCX.hi, { a: 0.08, lw: 0.14 });
    });
  },
  'frame.title'(x, y, worn) {
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = '700 26px ' + ZA_FD;
    const tw = ctx.measureText('CODEX').width + 9 * 4;
    ctx.fillStyle = ZCX.pale;
    zaSpaced('CODEX', x, y + 1, 9);
    for (const d of [-1, 1]) {
      const sx = x + d * (tw / 2 + 18);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(sx, y, 12, ZCX.gold, 0.5); ctx.restore();
      zaStar4(sx, y, 5.5, 0, 0.3); ctx.fillStyle = ZCX.gold; ctx.fill();
      zcxRule(sx + d * 9, sx + d * 120, y, 0.7);
    }
    ctx.font = '700 9px ' + ZA_FD; ctx.fillStyle = rgba(ZCX.gold, 0.8);
    zaSpaced('THE ATLAS', x + tw / 2 + 92, y - 12, 2.5);
    if (worn) {
      ctx.strokeStyle = ZCX.red; ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x - tw / 2 - 8, y + 5); ctx.quadraticCurveTo(x, y + 1, x + tw / 2 + 8, y - 4); ctx.stroke();
      ctx.translate(x + tw / 2 + 20, y + 13); ctx.rotate(-0.07);
      ctx.font = INK_FONT; ctx.fillStyle = ZCX.red; ctx.textAlign = 'left';
      ctx.fillText('annotated', 0, 0);
    }
  },
  'rail.back'(x, y, w, h) {
    roundRect(x, y, w, h, 12);
    ctx.fillStyle = 'rgba(8,13,32,0.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(253,230,138,0.16)'; ctx.lineWidth = 1; ctx.stroke();
    zcxCorners(x + 5, y + 5, w - 10, h - 10, 9, 'rgba(253,230,138,0.35)');
  },
  'rail.item'(r, tab, s) {
    const t = s.tally, my = r.y + r.h / 2, big = !s.narrow && r.h >= 32;
    roundRect(r.x, r.y, r.w, r.h, 7);
    ctx.fillStyle = s.on ? 'rgba(251,191,36,0.13)' : s.hot ? 'rgba(148,163,220,0.12)' : s.open ? 'rgba(14,22,48,0.9)' : 'rgba(8,12,28,0.7)';
    ctx.fill();
    if (s.open) { ctx.strokeStyle = s.on ? ZCX.gold : s.hot ? 'rgba(253,230,138,0.45)' : 'rgba(253,230,138,0.16)'; ctx.lineWidth = s.on ? 1.5 : 1; }
    else { ctx.strokeStyle = ZCX.faint; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); }
    ctx.stroke(); ctx.setLineDash([]);
    if (s.on) {
      ctx.fillStyle = ZCX.gold;
      ctx.beginPath(); ctx.moveTo(r.x + r.w + 1, my - 5); ctx.lineTo(r.x + r.w + 7, my); ctx.lineTo(r.x + r.w + 1, my + 5); ctx.closePath(); ctx.fill();
    }
    const sz = Math.min(r.h * 0.62, 18), sx = r.x + 6 + sz / 2;
    TA('rail.seal', sx, my, sz, tab, s.open);
    const tx = r.x + 12 + sz, room = r.x + r.w - tx - (t && t.unread ? 18 : 6);
    const label = s.open ? tab.label : '? ? ? ?';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.letterSpacing = '1px';
    fitFont(label, room, '700', big ? 12 : 10, ZA_FD, 7);
    ctx.fillStyle = s.on || (s.open && s.hot) ? ZCX.pale : s.open ? ZCX.dim : ZCX.mute;
    ctx.fillText(label, tx, my - (big && t ? 5 : 0));
    ctx.letterSpacing = '0px';
    if (big && t) {
      ctx.font = '500 9px ' + ZA_FM;
      let txt = t.met + '/' + t.total + (tab.tales ? '  ·  ' + t.pages + '/' + t.of + ' pp' : '');
      if (ctx.measureText(txt).width > room) txt = t.met + '/' + t.total;
      ctx.fillStyle = s.on ? ZCX.gold : ZCX.mute;
      ctx.fillText(txt, tx, my + 8);
    }
    if (t && t.total) {
      const lx = tx, lw = r.x + r.w - 8 - lx, ly = r.y + r.h - 3;
      ctx.fillStyle = 'rgba(253,230,138,0.12)'; ctx.fillRect(lx, ly, lw, 1);
      ctx.fillStyle = s.on ? ZCX.gold : 'rgba(251,191,36,0.5)'; ctx.fillRect(lx, ly - 0.5, lw * t.met / t.total, 2);
    }
    if (t && t.unread) {
      zcxStarPip(r.x + r.w - 9, r.y + 9, 4.5, 'new');
      if (!s.narrow) { ctx.font = '700 9px ' + ZA_FM; ctx.fillStyle = ZCX.gold; ctx.textAlign = 'right'; ctx.fillText(String(t.unread), r.x + r.w - 16, r.y + 9); }
    }
  },
  'rail.seal'(x, y, s, tab, open) {
    if (tab.id !== 'z') { TALES_ART['rail.seal'](x, y, s, tab, open); return; }
    if (open) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(x, y, s * 1.2, ZCX.gold, 0.4); ctx.restore(); }
    ctx.strokeStyle = open ? rgba(ZCX.gold, 0.6) : ZCX.faint; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, s * 0.46, 0, TAU); ctx.stroke();
    zaStar4(x, y, s * 0.42, 0, 0.3); ctx.fillStyle = open ? ZCX.gold : ZCX.faint; ctx.fill();
  },
  'grid.head'(x, y, w, text) {
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    zaStar4(x + 5, y, 4.5, 0, 0.35); ctx.fillStyle = ZCX.gold; ctx.fill();
    ctx.letterSpacing = '2px';
    fitFont(text, w - 40, '700', 11, ZA_FD, 8);
    ctx.fillStyle = ZCX.hi;
    ctx.fillText(text, x + 16, y + 0.5);
    const tw = ctx.measureText(text).width;
    ctx.letterSpacing = '0px';
    zcxRule(x + 26 + tw, x + w, y, 0.4);
  },
  'card.back'(r, col, s) {
    roundRect(r.x, r.y, r.w, r.h, 10);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, rgba(ZCX.n3, s.seen ? 0.92 : 0.6)); g.addColorStop(1, rgba(ZCX.n1, s.seen ? 0.95 : 0.6));
    ctx.fillStyle = g; ctx.fill();
    if (s.seen) {
      ctx.save(); ctx.clip();
      const rg = ctx.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.38, 2, r.x + r.w / 2, r.y + r.h * 0.38, r.w * 0.7);
      rg.addColorStop(0, rgba(col, 0.16)); rg.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = rg; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }
    roundRect(r.x, r.y, r.w, r.h, 10);
    if (s.sel || s.hot) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(ZCX.gold, 0.25); ctx.lineWidth = 5; ctx.stroke();
      ctx.restore();
      roundRect(r.x, r.y, r.w, r.h, 10);
      ctx.strokeStyle = s.sel ? ZCX.gold : ZCX.hi; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (s.seen) { ctx.strokeStyle = rgba(col, 0.5); ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.strokeStyle = ZCX.faint; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]); }
  },
  'card.pips'(cx, y, w, states) {
    const n = states.length, gap = Math.min(14, w / (n + 1));
    states.forEach((st, k) => zcxStarPip(cx + (k - (n - 1) / 2) * gap, y, 4, st));
  },
  'card.unread'(x, y) { zcxStarPip(x, y, 4.5, 'new'); },
  'card.tick'(x, y) {
    ctx.strokeStyle = ZCX.red; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 3, y + 7); ctx.lineTo(x + 9, y); ctx.stroke();
  },
  'portrait.sign'(x, y, size, en, seen) {
    const id = en.ref, S = size * 3.1;
    if (seen) {
      zaGlyph(id, x, y, size * 1.05, ZCX.hi, { a: 0.1, lw: 0.12 });
      zaConst(id, x, y, S, { lineA: 0.6, lineCol: ZCX.hi, spark: 0.8, seed: id.length });
    } else {
      zaConst(id, x, y, S, { a: 0.4, line: 0, mono: '#64748b', tw: 0, spark: 0 });
    }
  },
  'portrait.trine'(x, y, size, en, seen) {
    const el = en.ref, col = ZA_ELCOL[el], up = el === 'fire' || el === 'air', R = size * 1.35;
    const pts = [0, 1, 2].map(k => { const a = (up ? -Math.PI / 2 : Math.PI / 2) + k * TAU / 3; return [x + Math.cos(a) * R, y + Math.sin(a) * R]; });
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.closePath();
    if (seen) {
      ctx.fillStyle = rgba(col, 0.08); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      ctx.strokeStyle = rgba(col, 0.9); ctx.lineWidth = 1.3; ctx.stroke();
    } else { ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(col, 0.3); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]); }
    Z_EL[el].signs.forEach((id, k) => {
      const [px, py] = pts[k], r = size * 0.42;
      ctx.fillStyle = ZCX.n1; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(col, seen ? 0.85 : 0.3); ctx.lineWidth = 1; ctx.stroke();
      zaGlyph(id, px, py, r * 0.55, seen ? ZCX.hi : '#475569', { lw: 0.2, glow: seen ? 0.4 : 0 });
    });
    zaElem(el, x, y + (up ? R * 0.12 : -R * 0.12), size * 0.32, seen ? col : '#475569', 1, 1.2);
  },
  'book.back'() { ctx.fillStyle = 'rgba(2,3,10,0.88)'; ctx.fillRect(0, 0, W, H); },
  'book.cover'(x, y, w, h, col) {
    const bx = x - 12, by = y - 10, bw = w + 24, bh = h + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx + 6, by + 8, bw, bh);
    roundRect(bx, by, bw, bh, 8);
    ctx.fillStyle = ZCX.n1; ctx.fill();
    ctx.strokeStyle = 'rgba(253,230,138,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
    for (const [cx, cy] of [[bx + 9, by + 9], [bx + bw - 9, by + 9], [bx + 9, by + bh - 9], [bx + bw - 9, by + bh - 9]]) {
      zaStar4(cx, cy, 4, 0, 0.3); ctx.fillStyle = ZCX.gold; ctx.fill();
    }
    ctx.fillStyle = '#03050d'; ctx.fillRect(x + w / 2 - 7, by, 14, bh);
    ctx.fillStyle = 'rgba(253,230,138,0.4)'; ctx.fillRect(x + w / 2 - 7, by, 1, bh); ctx.fillRect(x + w / 2 + 6, by, 1, bh);
    const rx = x + w / 2 + 26, ry = y + h - 12, re = Math.min(by + bh + 14, H - (H < 520 ? 12 : 17) - 9);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(rx - 4, ry); ctx.lineTo(rx + 4, ry); ctx.lineTo(rx + 4, re); ctx.lineTo(rx, re - 5); ctx.lineTo(rx - 4, re); ctx.closePath(); ctx.fill();
  },
  'book.page'(r, side) {
    const left = side === 'left';
    for (let i = 3; i >= 1; i--) { ctx.fillStyle = 'rgba(6,10,28,' + (0.5 + i * 0.1) + ')'; ctx.fillRect(r.x + (left ? -i * 2 : i * 2), r.y + i, r.w, r.h - i * 2); }
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#0d1638'); g.addColorStop(1, '#080e26');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    // the chart's graticule: hours across, degrees down, ruled faint in gold
    ctx.strokeStyle = 'rgba(253,230,138,0.045)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 1; k < 8; k++) { const xx = r.x + r.w * k / 8; ctx.moveTo(xx, r.y); ctx.quadraticCurveTo(xx + (k - 4) * 6, r.y + r.h / 2, xx, r.y + r.h); }
    for (let k = 1; k < 10; k++) { const yy = r.y + r.h * k / 10; ctx.moveTo(r.x, yy); ctx.lineTo(r.x + r.w, yy); }
    ctx.stroke();
    // a sprinkle of faint stars, the same every time this page is opened
    for (let i = 0; i < 46; i++) {
      const sx = r.x + zaH(i * 3.1 + (left ? 1 : 7)) * r.w, sy = r.y + zaH(i * 1.7 + (left ? 3 : 9)) * r.h;
      ctx.fillStyle = 'rgba(226,232,255,' + (0.08 + zaH(i * 5.3) * 0.22) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 0.5 + zaH(i * 2.9) * 0.9, 0, TAU); ctx.fill();
    }
    // the gutter, shaded toward the spine
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(0,0,0,' + (0.16 - i * 0.035) + ')'; ctx.fillRect(left ? r.x + r.w - (i + 1) * 7 : r.x + i * 7, r.y, 7, r.h); }
    ctx.restore();
    const m = 14;
    ctx.strokeStyle = 'rgba(253,230,138,0.12)'; ctx.lineWidth = 1;
    ctx.strokeRect(r.x + m + 0.5, r.y + m + 0.5, r.w - m * 2 - 1, r.h - m * 2 - 1);
    zcxCorners(r.x + m - 4.5, r.y + m - 4.5, r.w - m * 2 + 9, r.h - m * 2 + 9, 8, 'rgba(253,230,138,0.4)');
  },
  'book.plate'(r, col) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, R = r.w * 0.47;
    ctx.strokeStyle = 'rgba(253,230,138,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(r.x - 6.5, r.y - 6.5, r.w + 13, r.h + 13);
    ctx.fillStyle = '#050920'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, R * 1.2);
    rg.addColorStop(0, rgba(col, 0.14)); rg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = rg; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = 'rgba(253,230,138,0.16)';
    for (const f of [1, 0.66, 0.33]) { ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, TAU); ctx.stroke(); }
    ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.36, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(253,230,138,0.3)';
    ctx.beginPath();
    for (let k = 0; k < 72; k++) {
      const a = k * TAU / 72 + uiTime * 0.01, L = k % 6 ? 4 : 8;
      ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(cx + Math.cos(a) * (R - L), cy + Math.sin(a) * (R - L));
    }
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    zcxCorners(r.x + 6, r.y + 6, r.w - 12, r.h - 12, 12, ZCX.gold);
  },
  'book.pip'(r, roman, st, cur, hot) {
    const open = st === 'open' || st === 'new';
    roundRect(r.x, r.y, r.w, r.h, 6);
    if (cur && open) { ctx.fillStyle = ZCX.gold; ctx.fill(); }
    else if (st === 'sealed') { ctx.fillStyle = cur ? '#8f1d24' : 'rgba(143,29,36,0.2)'; ctx.fill(); }
    else if (hot) { ctx.fillStyle = 'rgba(253,230,138,0.1)'; ctx.fill(); }
    ctx.strokeStyle = cur ? ZCX.gold : open ? 'rgba(253,230,138,0.6)' : st === 'sealed' ? '#b91c1c' : ZCX.mute;
    ctx.lineWidth = cur ? 2 : 1;
    if (st === 'torn' || st === 'held') ctx.setLineDash([3, 2]);
    roundRect(r.x, r.y, r.w, r.h, 6); ctx.stroke(); ctx.setLineDash([]);
    if (st === 'new') zcxStarPip(r.x + r.w - 2, r.y + 2, 4, 'new');
    ctx.font = '700 ' + Math.round(r.h * 0.4) + 'px Georgia, serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = cur && open ? ZCX.n1 : open ? ZCX.hi : st === 'sealed' ? ZCX.red : ZCX.mute;
    ctx.fillText(roman, r.x + r.w / 2, r.y + r.h / 2 + 1);
    if (cur) { zaStar4(r.x + r.w / 2, r.y + r.h + 6, 3, 0, 0.4); ctx.fillStyle = ZCX.gold; ctx.fill(); }
  },
  'ink.note'(x, y, w, note) {
    ctx.translate(x, y); ctx.rotate(-0.025);
    ctx.font = INK_FONT; ctx.fillStyle = ZCX.red; ctx.globalAlpha = 0.95;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const last = wrapText('— ' + note, 0, 0, w, 15);
    ctx.strokeStyle = ZCX.red; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(-4, -12); ctx.quadraticCurveTo(-9, -12, -9, -6);
    ctx.lineTo(-9, last - 2); ctx.quadraticCurveTo(-9, last + 4, -3, last + 4); ctx.stroke();
  },
  'page.head'(cx, y, w, text, voice) {
    const col = ZCX.voice[voice] || ZCX.voice[0];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2px';
    fitFont(text, w - 50, '700', 10.5, ZA_FD, 7);
    ctx.fillStyle = col;
    ctx.fillText(text, cx, y);
    const tw = ctx.measureText(text).width;
    ctx.letterSpacing = '0px';
    for (const d of [-1, 1]) {
      const sx = cx + d * (tw / 2 + 12);
      zaStar4(sx, y, 3.2, 0, 0.35); ctx.fillStyle = col; ctx.fill();
      zcxRule(sx + d * 7, sx + d * Math.max(10, w / 2 - tw / 2 - 20), y, 0.35);
    }
  },
  'page.number'(cx, y, roman) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 11px Georgia, serif'; ctx.fillStyle = rgba(ZCX.gold, 0.8);
    ctx.fillText(roman, cx, y);
    const tw = ctx.measureText(roman).width;
    for (const d of [-1, 1]) { zaStar4(cx + d * (tw / 2 + 9), y, 2.4, 0, 0.4); ctx.fillStyle = rgba(ZCX.gold, 0.6); ctx.fill(); }
  },
  'page.more'(x, y, w, frac) {
    const g = ctx.createLinearGradient(0, y - 26, 0, y);
    g.addColorStop(0, 'rgba(8,14,38,0)'); g.addColorStop(1, 'rgba(8,14,38,0.95)');
    ctx.fillStyle = g; ctx.fillRect(x - 4, y - 26, w + 8, 26);
    if (frac < 0.98) {
      ctx.strokeStyle = rgba(ZCX.gold, 0.7); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x + w / 2 - 6, y - 8); ctx.lineTo(x + w / 2, y - 3); ctx.lineTo(x + w / 2 + 6, y - 8); ctx.stroke();
    }
  },
  'page.blank'(r) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 400 14px Georgia, serif'; ctx.fillStyle = ZCX.dim;
    ctx.fillText('Not yet written.', r.x + r.w / 2, r.y + r.h * 0.4);
  },
  'page.torn'(r, roman, how, prog) {
    const cx = r.x + r.w / 2, top = r.y + r.h * 0.12;
    // a corner of sky not yet charted: its stars faint, the lines between them only guessed at
    ctx.save();
    ctx.strokeStyle = 'rgba(143,153,189,0.25)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    const P_ = [];
    for (let i = 0; i < 6; i++) P_.push([cx + (zaH(i * 4.1 + roman.length) - 0.5) * r.w * 0.6, top + zaH(i * 2.3 + 1) * r.h * 0.3]);
    ctx.beginPath(); P_.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
    ctx.setLineDash([]);
    for (const [px, py] of P_) { ctx.fillStyle = 'rgba(203,213,255,0.35)'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); }
    ctx.restore();
    let y = top + r.h * 0.42;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 11px ' + ZA_FD; ctx.fillStyle = rgba(ZCX.gold, 0.75);
    zaSpaced('NOT YET CHARTED', cx, y, 3);
    y += 30;
    ctx.font = 'italic 400 14px Georgia, serif'; ctx.fillStyle = ZCX.pale;
    const lines = wrapLines('To chart it: ' + how + '.', r.w - 40);
    for (const ln of lines) { ctx.fillText(ln, cx, y); y += 20; }
    if (prog) { ctx.font = '600 11px ' + ZA_FM; ctx.fillStyle = ZCX.gold; ctx.fillText(prog, cx, y + 8); }
  },
  'page.sealed'(r) {
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.4;
    ctx.fillStyle = '#8f1d24'; ctx.beginPath(); ctx.arc(cx, cy, 26, 0, TAU); ctx.fill();
    ctx.strokeStyle = ZCX.red; ctx.lineWidth = 1.5; ctx.stroke();
    zaStar4(cx, cy, 11, 0, 0.3); ctx.fillStyle = ZCX.red; ctx.fill();
    ctx.font = '700 11px ' + ZA_FD; ctx.textAlign = 'center'; ctx.fillStyle = ZCX.red;
    zaSpaced('SEALED', cx, cy + 46, 3);
  },
  'page.held'(r, roman, why) {
    const cx = r.x + r.w / 2;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 11px ' + ZA_FD; ctx.fillStyle = ZCX.dim;
    zaSpaced('HELD', cx, r.y + r.h * 0.38, 3);
    ctx.font = 'italic 400 13px Georgia, serif'; ctx.fillStyle = ZCX.pale;
    ctx.fillText(why || '', cx, r.y + r.h * 0.38 + 26);
  },
  'book.turn'(r, dir, enabled, hot) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rr = Math.min(r.w, r.h) / 2;
    if (enabled && hot) { ctx.fillStyle = 'rgba(253,230,138,0.12)'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = enabled ? (hot ? ZCX.hi : rgba(ZCX.gold, 0.7)) : ZCX.faint; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, rr - 1, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - dir * 3, cy - 6); ctx.lineTo(cx + dir * 4, cy); ctx.lineTo(cx - dir * 3, cy + 6); ctx.stroke();
  },
  'book.close'(r, hot) {
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2, rr = Math.min(r.w, r.h) / 2;
    if (hot) { ctx.fillStyle = 'rgba(253,230,138,0.12)'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = hot ? ZCX.hi : rgba(ZCX.gold, 0.7); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, rr - 1, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 5, cy - 5); ctx.lineTo(cx + 5, cy + 5); ctx.moveTo(cx + 5, cy - 5); ctx.lineTo(cx - 5, cy + 5); ctx.stroke();
  }
};
/* =========================== end of the codex's atlas (zcx) =========================== */
