/* ================= THE PLANETARIUM — the signs' events (art, 18 Nov) =================
   The moments the room should react to. Every III is meant to read like an OVERDRIVE
   move. Each is one zaFx(kind, ...) call: from a hook line in the logic where only the
   logic knows where (marked THE PLANETARIUM: art), or from zawDiffs when the field's
   art sees it happen. Each plays out from uiTime and is drawn in the room by zafDraw
   (from zDrawWorld, as the pilot it belongs to) or on the screen by zafScreen.
     gore       a crescent burst where the ram passed through a body, sparks thrown on
     crater     MARS ASCENDANT: the dash ends in a blast shaped like the ram's horns,
                the floor cracked and scorched under it
     bull       THE GOLDEN BULL: the coins blow outward in a gold shockwave, the bull's
                glyph over the hull
     shell      a shield of THE SHELL breaking: shards and a ring
     carapace   THE CARAPACE opening: its plates thrown out across the room on a ring
     nova       SUPERNOVA: a flare that whites out from the hull, long rays wheeling
                out across the room
     judge      JUDGEMENT: a pillar of white light falls on the heaviest thing in the
                room, the scales drawn over it
     sting      THE STING: a scorpion's tail whips over the body and strikes, and its
                venom goes off in one green burst
     reap       THE HARVEST: a scythe-stroke of light through the reaped, its data
                thrown up in bits
     rain       RAIN OF ARROWS: out of a patch of night opened over your aim, the arrows
                fall onto the ring they will fly in from
     flood      THE FLOOD: one wave right across the room, a curling crest of foam
     tide       THE TIDE: ripples running out across the room
     wave       THE WAVE: the dash pours a curling crescent of water ahead
     skyturns   the shadow lifting: its eclipse slides off the hull, and the light
                comes back to the screen
     eclipse    a shadow taken: the dark slides onto the hull
   Art state in ZAF. It reads uiTime and P, and changes nothing of the logic's. Needs
   the sky block.
===================================================================================== */
let ZAF = { list: [] };
const ZAF_DUR = { gore: 0.45, crater: 1.3, bull: 1.5, shell: 0.6, carapace: 1.1, nova: 1.5, judge: 1.2, sting: 0.85, reap: 0.65,
                  rain: 0.95, flood: 1.3, tide: 1.3, wave: 0.6, skyturns: 1.5, eclipse: 0.9 };
function zaFx(k, x, y, a, b) {
  if (ZAF.list.length > 80) ZAF.list.shift();
  ZAF.list.push({ k, x, y, a, b, t: uiTime, own: P, s: Math.random() * 1000 });
}
function zafDraw() {
  const now = uiTime, L = ZAF.list;
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i], age = now - f.t, dur = ZAF_DUR[f.k] || 1;
    if (age > dur || age < -1) { L.splice(i, 1); continue; }
    if (f.own !== P) continue;
    const q = age / dur;
    ctx.save();
    const fn = ZAF_DRAW[f.k];
    if (fn) fn(f, age, q);
    ctx.restore();
  }
}
function zafScreen() {
  const now = uiTime;
  for (const f of ZAF.list) {
    if (f.own !== P) continue;
    const age = now - f.t;
    if (f.k === 'skyturns' && age < 0.9) {      // the light comes back
      const k = age / 0.9;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, `rgba(233,213,255,${0.22 * (1 - k)})`); g.addColorStop(1, `rgba(168,85,247,${0.1 * (1 - k)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
}
// a crescent: the bright side of a disc with a disc taken out of it
function zafCrescent(x, y, R, a, th, span, col, al) {
  if (al <= 0.01 || R <= 1) return;
  ctx.fillStyle = rgba(col, al);
  ctx.beginPath();
  ctx.arc(x, y, R, a - span, a + span);
  ctx.arc(x - Math.cos(a) * th, y - Math.sin(a) * th, R, a + span * 0.92, a - span * 0.92, true);
  ctx.closePath(); ctx.fill();
}
// a ram's horn: from its root at (x, y) out toward dir, curling round on itself (turning s) to its tip,
// thick at the root and thin at the tip, its ridges across it
function zafHorn(x, y, dir, s, R, w, col, al) {
  if (al <= 0.01 || R <= 1) return;
  const cx = x + Math.cos(dir) * R, cy = y + Math.sin(dir) * R, N = 28;
  const pt = u => { const th = dir + Math.PI + s * u * Math.PI * 1.55, r = R * (1 - 0.68 * u); return [cx + Math.cos(th) * r, cy + Math.sin(th) * r]; };
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(col, al);
  for (let i = 0; i < N; i++) {
    const [x0, y0] = pt(i / N), [x1, y1] = pt((i + 1) / N);
    ctx.lineWidth = Math.max(0.6, w * (1 - 0.8 * i / N));
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
}
function zafRing(x, y, r, col, al, lw) {
  if (al <= 0.01) return;
  ctx.strokeStyle = rgba(col, al); ctx.lineWidth = lw;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, TAU); ctx.stroke();
}
const ZAF_DRAW = {
  gore(f, age, q) {
    const a = f.a === undefined ? 0 : f.a, e = zaO(q);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(f.x, f.y, 30 + 30 * e, '#fb7185', 0.5 * (1 - q));
    zafCrescent(f.x, f.y, 14 + 30 * e, a, 10 * (1 - q) + 3, 1.15, '#fdba74', 0.85 * (1 - q));
    zafCrescent(f.x, f.y, 8 + 22 * e, a, 6, 1.0, '#fff7ed', 0.6 * (1 - q));
    ctx.strokeStyle = rgba('#fecdd3', 0.8 * (1 - q)); ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const b = a + (zaH(f.s + i) - 0.5) * 1.8, r0 = 10 + 30 * e, r1 = r0 + 14 + zaH(f.s * 2 + i) * 18;
      ctx.moveTo(f.x + Math.cos(b) * r0, f.y + Math.sin(b) * r0); ctx.lineTo(f.x + Math.cos(b) * r1, f.y + Math.sin(b) * r1);
    }
    ctx.stroke();
  },
  crater(f, age, q) {
    const a = f.a || 0, e = zaO(age / 0.35), fade = 1 - zaQ(age, 0.3, 1.3);
    // the scorch, under all of it, and the cracks out of it
    ctx.fillStyle = `rgba(28,10,6,${0.55 * fade})`;
    ctx.beginPath(); ctx.arc(f.x, f.y, 70 * e, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(251,146,60,${0.7 * fade})`; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      let b = i * TAU / 10 + zaH(f.s + i) * 0.5, r = 18, x = f.x + Math.cos(b) * r, y = f.y + Math.sin(b) * r;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { b += (zaH(f.s + i * 7 + j) - 0.5) * 0.7; r += (25 + zaH(i + j * 3) * 25) * e; ctx.lineTo(f.x + Math.cos(b) * r, f.y + Math.sin(b) * r); }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    // the blast and its two great horns, curling out either side of the way you were going
    drawGlow(f.x, f.y, 120 + 80 * e, '#fb7185', 0.65 * (1 - zaQ(age, 0.05, 0.6)));
    drawGlow(f.x, f.y, 60, '#fff7ed', 0.8 * (1 - zaQ(age, 0, 0.25)));
    const hornA = 1 - zaQ(age, 0.25, 0.9);
    for (const s of [1, -1]) {
      zafHorn(f.x, f.y, a + s * 1.25, s, 64 * e, 22 * hornA + 1, '#fb923c', 0.45 * hornA);
      zafHorn(f.x, f.y, a + s * 1.25, s, 64 * e, 9 * hornA + 0.5, '#fdba74', 0.7 * hornA);
      zafHorn(f.x, f.y, a + s * 1.25, s, 64 * e, 2.5 * hornA + 0.3, '#fff7ed', 0.9 * hornA);
    }
    zafRing(f.x, f.y, 170 * zaO(age / 0.4), '#fdba74', 0.8 * (1 - zaQ(age, 0.1, 0.5)), 5);
    if (age < 0.05) for (let i = 0; i < 18; i++) {
      const b = rnd(TAU), sp = rnd(520, 160);
      spawnPart(f.x, f.y, Math.cos(b) * sp, Math.sin(b) * sp, rnd(4, 2), i % 2 ? '#fb7185' : '#fdba74', rnd(0.7, 0.35), 0.9);
    }
  },
  bull(f, age, q) {
    const e = zaO(age / 0.6);
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(f.x, f.y, 80 + 60 * e, ZA_GOLD, 0.7 * (1 - zaQ(age, 0, 0.6)));
    zafRing(f.x, f.y, 300 * zaO(age / 0.45), ZA_GOLD_HI, 0.85 * (1 - zaQ(age, 0.1, 0.55)), 6);
    zafRing(f.x, f.y, 260 * zaO(age / 0.5), '#fff7ed', 0.5 * (1 - zaQ(age, 0.1, 0.5)), 2);
    // the bull's glyph, rising off the hull
    zaGlyph('taurus', f.x, f.y - 50 - 30 * e, 22, ZA_GOLD_HI, { a: 1 - zaQ(age, 0.6, 1.4), glow: 1.4, core: 1, lw: 0.16 });
    ctx.globalCompositeOperation = 'source-over';
    // the coins, blown out
    for (let i = 0; i < 26; i++) {
      const b = i * TAU / 26 + zaH(f.s + i) * 0.2, d = (90 + zaH(f.s * 3 + i) * 210) * zaO(age / 0.9);
      zawCoin(f.x + Math.cos(b) * d, f.y + Math.sin(b) * d, 5, age * 14 + i, 1 - zaQ(age, 0.8, 1.5));
    }
  },
  shell(f, age, q) {
    ctx.globalCompositeOperation = 'lighter';
    zafRing(f.x, f.y, 30 + 150 * zaO(q), '#7dd3fc', 0.7 * (1 - q), 3);
    for (let i = 0; i < 7; i++) {
      const b = zaH(f.s + i) * TAU, d = 20 + 90 * zaO(q), x = f.x + Math.cos(b) * d, y = f.y + Math.sin(b) * d;
      ctx.save(); ctx.translate(x, y); ctx.rotate(b + age * 9);
      ctx.fillStyle = rgba('#7dd3fc', 0.75 * (1 - q)); ctx.strokeStyle = rgba('#e0f2fe', 0.9 * (1 - q)); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-6, -3); ctx.lineTo(6, -2); ctx.lineTo(3, 4); ctx.lineTo(-5, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  carapace(f, age, q) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(f.x, f.y, 140, '#e0f2fe', 0.8 * (1 - zaQ(age, 0, 0.3)));
    const R = 1100 * zaO(age / 0.9);
    zafRing(f.x, f.y, R, '#38bdf8', 0.6 * (1 - q), 26 * (1 - q) + 2);
    zafRing(f.x, f.y, R, '#e0f2fe', 0.8 * (1 - q), 2.5);
    for (let i = 0; i < 16; i++) {
      const b = i * TAU / 16 + zaH(f.s + i) * 0.2, d = 30 + 760 * zaO(age / 0.95), x = f.x + Math.cos(b) * d, y = f.y + Math.sin(b) * d;
      ctx.save(); ctx.translate(x, y); ctx.rotate(b + age * 6 * (i % 2 ? 1 : -1));
      const s = 14 * (1 - q * 0.5);
      ctx.fillStyle = rgba('#0c4a6e', 0.85 * (1 - q)); ctx.strokeStyle = rgba('#7dd3fc', 1 - q); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, s, -0.5, 0.5); ctx.arc(0, 0, s * 0.5, 0.5, -0.5, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  },
  nova(f, age, q) {
    ctx.globalCompositeOperation = 'lighter';
    const flare = 1 - zaQ(age, 0.05, 0.7);
    drawGlow(f.x, f.y, 260 + 600 * zaO(age / 0.4), '#fffbeb', 0.9 * flare);
    drawGlow(f.x, f.y, 120, '#ffffff', flare);
    // the rays, wheeling out across the room
    const rays = 28, rot = age * 0.4 + zaH(f.s) * TAU, L = 1300 * zaO(age / 0.5);
    for (let i = 0; i < rays; i++) {
      const a = rot + i * TAU / rays, w = (i % 2 ? 0.018 : 0.034) * (1 - q * 0.6), ll = L * (i % 3 ? 0.75 : 1);
      const g = ctx.createLinearGradient(f.x, f.y, f.x + Math.cos(a) * ll, f.y + Math.sin(a) * ll);
      g.addColorStop(0, rgba('#fffbeb', 0.7 * (1 - q))); g.addColorStop(0.4, rgba('#fde047', 0.35 * (1 - q))); g.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x + Math.cos(a - w) * ll, f.y + Math.sin(a - w) * ll); ctx.lineTo(f.x + Math.cos(a + w) * ll, f.y + Math.sin(a + w) * ll);
      ctx.closePath(); ctx.fill();
    }
    zafRing(f.x, f.y, 900 * zaO(age / 0.9), '#fde047', 0.7 * (1 - q), 10 * (1 - q) + 1);
    zaGlyph('leo', f.x, f.y - 70, 26, '#fffbeb', { a: (1 - zaQ(age, 0.5, 1.4)) * zaQ(age, 0.05, 0.25), glow: 1.6, core: 1 });
  },
  judge(f, age, q) {
    const r = f.a || 20, fall = zaO(age / 0.12), fade = 1 - zaQ(age, 0.25, 1.1), top = f.y - 900;
    ctx.globalCompositeOperation = 'lighter';
    const w = Math.max(54, r * 3) * (1 + 0.5 * (1 - fade));
    const g = ctx.createLinearGradient(0, top, 0, f.y);
    g.addColorStop(0, 'rgba(254,249,195,0)'); g.addColorStop(0.7, rgba('#fef9c3', 0.45 * fade)); g.addColorStop(1, rgba('#ffffff', 0.85 * fade));
    ctx.fillStyle = g;
    ctx.fillRect(f.x - w / 2, lerp(top, f.y - 20, 0) , w, (f.y - top) * fall);
    ctx.fillStyle = rgba('#ffffff', 0.8 * fade);
    ctx.fillRect(f.x - w * 0.12, top, w * 0.24, (f.y - top) * fall);
    drawGlow(f.x, f.y, r * 4 + 40, '#fef9c3', 0.9 * fade);
    zafRing(f.x, f.y, r * (1.2 + 3 * zaO(age / 0.5)), '#fef9c3', 0.8 * fade, 4);
    ctx.globalCompositeOperation = 'source-over';
    // the scales over it, level: the ledger settled
    const sa = zaQ(age, 0.06, 0.25) * (1 - zaQ(age, 0.7, 1.2));
    ctx.save(); ctx.translate(f.x, f.y - r - 78); ctx.scale(1.9, 1.9);
    ctx.lineWidth = 3;
    zawScales(0, 0, 0, '#b45309', '#b45309', sa * 0.8, 0);
    zawScales(0, 0, 0, '#fde68a', '#fbbf24', sa, 0);
    ctx.restore();
    if (age < 0.04) for (let i = 0; i < 12; i++) spawnPart(f.x + rnd(w / 2, -w / 2), f.y, rnd(20, -20), rnd(-80, -220), rnd(3, 1.4), '#fef9c3', rnd(0.9, 0.4), 0.95);
  },
  sting(f, age, q) {
    // the tail: rooted behind the body, arcing up over it, the barb raised, then driven down into it
    const r = f.a || 18, strike = zaE(zaQ(age, 0.1, 0.2)), back = zaE(zaQ(age, 0.26, 0.55)), A = 1 - zaQ(age, 0.42, 0.75);
    if (A > 0.01) {
      const bx = f.x + r + 34, by = f.y + r + 26;                    // its root
      const up = { x: f.x + r * 0.4, y: f.y - r - 62 }, hit = { x: f.x + 3, y: f.y - r * 0.35 };
      const tx = lerp(lerp(up.x, hit.x, strike), up.x + 10, back), ty = lerp(lerp(up.y, hit.y, strike), up.y - 6, back);
      const cx = f.x + r + 42, cy = f.y - r - 58;                    // the arch
      const at = u => [(1 - u) * (1 - u) * bx + 2 * (1 - u) * u * cx + u * u * tx, (1 - u) * (1 - u) * by + 2 * (1 - u) * u * cy + u * u * ty];
      const segs = 10;
      for (let i = 0; i < segs; i++) {
        const [x0, y0] = at(i / segs), [x1, y1] = at((i + 1) / segs), sz = 8.5 * (1 - i / segs * 0.5), a = Math.atan2(y1 - y0, x1 - x0);
        ctx.fillStyle = rgba('#365314', 0.92 * A); ctx.strokeStyle = rgba('#a3e635', 0.95 * A); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.hypot(x1 - x0, y1 - y0) * 0.62, sz * 0.62, a, 0, TAU); ctx.fill(); ctx.stroke();
      }
      // the barb: a hooked point along the last of the curve
      const [px, py] = at(0.94), a = Math.atan2(ty - py, tx - px);
      ctx.fillStyle = rgba('#ecfccb', A);
      ctx.beginPath(); ctx.moveTo(tx + Math.cos(a) * 9, ty + Math.sin(a) * 9);
      ctx.quadraticCurveTo(tx + Math.cos(a + 1.6) * 6, ty + Math.sin(a + 1.6) * 6, tx - Math.cos(a) * 4, ty - Math.sin(a) * 4);
      ctx.lineTo(tx + Math.cos(a - 1.4) * 4, ty + Math.sin(a - 1.4) * 4); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(tx, ty, 10 + 14 * strike, '#d9f99d', 0.6 * A);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (age > 0.19) {
      const k = zaQ(age, 0.19, 0.85), e = zaO(k);
      ctx.globalCompositeOperation = 'lighter';
      drawGlow(f.x, f.y, r * 2 + 90 * e, '#a3e635', 0.85 * (1 - k));
      zafRing(f.x, f.y, r + 70 * e, '#d9f99d', 0.9 * (1 - k), 4 * (1 - k) + 1);
      for (let i = 0; i < 10; i++) {
        const b = zaH(f.s + i) * TAU, d = r + 60 * e * (0.5 + zaH(i * 3 + f.s)), dy = 30 * k * k;
        drawGlow(f.x + Math.cos(b) * d, f.y + Math.sin(b) * d + dy, 6, '#a3e635', 0.8 * (1 - k));
      }
    }
  },
  reap(f, age, q) {
    const r = f.a || 18, sw = zaO(age / 0.22), A = 1 - zaQ(age, 0.2, 0.6), a0 = -2.4 + zaH(f.s) * 0.6;
    ctx.globalCompositeOperation = 'lighter';
    // the stroke: a long crescent swept through the body
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba('#e2e8f0', 0.35 * A); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(f.x + r * 0.6, f.y + r * 0.6, r * 2.3, a0, a0 + 1.9 * sw); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.95 * A); ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(f.x + r * 0.6, f.y + r * 0.6, r * 2.3, a0 + 1.9 * sw * 0.3, a0 + 1.9 * sw); ctx.stroke();
    drawGlow(f.x, f.y, r * 2.5, '#e2e8f0', 0.5 * A);
    // the data, thrown up in bits
    ctx.fillStyle = rgba('#a5f3fc', A);
    for (let i = 0; i < 14; i++) {
      const b = zaH(f.s + i * 2) * TAU, d = r + 50 * zaO(age / 0.6) * (0.4 + zaH(i)), s = 2 + zaH(i * 5) * 2.5;
      ctx.fillRect(f.x + Math.cos(b) * d, f.y + Math.sin(b) * d - 20 * age, s, s);
    }
  },
  rain(f, age, q) {
    // a patch of night opened over the aim, and out of it the arrows, onto the ring they fly in from
    const open = zaQ(age, 0, 0.15) * (1 - zaQ(age, 0.55, 0.95));
    ctx.fillStyle = `rgba(2,3,12,${0.4 * open})`;
    ctx.beginPath(); ctx.ellipse(f.x, f.y, 300, 230, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) drawGlow(f.x + (zaH(f.s + i) - 0.5) * 520, f.y + (zaH(f.s * 2 + i) - 0.5) * 380, 3, '#fde68a', 0.6 * open);
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * TAU, sx = f.x + Math.cos(a) * 260, sy = f.y + Math.sin(a) * 260;
      const t0 = zaH(f.s + k) * 0.22, fall = zaQ(age, t0, t0 + 0.2);
      if (fall <= 0) continue;
      const hx = sx - 70 * (1 - fall), hy = sy - 420 * (1 - zaIn(fall));
      if (fall < 1) {
        const g = ctx.createLinearGradient(hx, hy, hx - 30, hy - 160);
        g.addColorStop(0, 'rgba(254,243,199,0.95)'); g.addColorStop(1, 'rgba(252,211,77,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 30, hy - 160); ctx.stroke();
        drawGlow(hx, hy, 8, '#fcd34d', 0.8);
      } else {
        const k2 = zaQ(age, t0 + 0.2, t0 + 0.6);
        zafRing(sx, sy, 6 + 20 * k2, '#fcd34d', 0.8 * (1 - k2), 2);
      }
    }
  },
  flood(f, age, q) {
    const R = 1700 * zaE(age / 1.25), A = 1 - zaQ(age, 0.85, 1.3);
    ctx.globalCompositeOperation = 'lighter';
    // the body of the wave behind its crest, then the crest, then the foam ahead of it
    zafRing(f.x, f.y, Math.max(1, R - 40), '#0891b2', 0.35 * A, 80);
    zafRing(f.x, f.y, R, '#67e8f9', 0.55 * A, 16);
    zafRing(f.x, f.y, R + 6, '#ecfeff', 0.9 * A, 3);
    ctx.strokeStyle = rgba('#ecfeff', 0.6 * A); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 64; i++) {
      const a = i * TAU / 64, rr = R + 10 + zaH(f.s + i + Math.floor(age * 20)) * 14;
      ctx.moveTo(f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr); ctx.lineTo(f.x + Math.cos(a + 0.02) * (rr + 6), f.y + Math.sin(a + 0.02) * (rr + 6));
    }
    ctx.stroke();
    drawGlow(f.x, f.y, 140, '#67e8f9', 0.6 * (1 - zaQ(age, 0, 0.4)));
    zaGlyph('aquarius', f.x, f.y - 60, 22, '#ecfeff', { a: zaQ(age, 0, 0.1) * (1 - zaQ(age, 0.5, 1.1)), glow: 1.4, core: 1 });
  },
  tide(f, age, q) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const k = zaQ(age, i * 0.12, i * 0.12 + 1.0);
      if (k <= 0 || k >= 1) continue;
      zafRing(f.x, f.y, 30 + 1300 * zaO(k), i ? '#38bdf8' : '#e0f2fe', 0.7 * (1 - k), 3 - i * 0.5);
    }
    drawGlow(f.x, f.y, 90, '#38bdf8', 0.6 * (1 - zaQ(age, 0, 0.5)));
    zaGlyph('pisces', f.x, f.y - 56, 20, '#e0f2fe', { a: zaQ(age, 0, 0.1) * (1 - zaQ(age, 0.5, 1.2)), glow: 1.3, core: 1 });
  },
  wave(f, age, q) {
    const a = Math.atan2(f.b || 0, f.a || 1), R = 40 + 300 * zaO(q), A = 1 - zaQ(q, 0.5, 1);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [w, col, al, off] of [[30, '#0891b2', 0.35, -14], [12, '#67e8f9', 0.6, 0], [3, '#ecfeff', 0.95, 6]]) {
      ctx.strokeStyle = rgba(col, al * A); ctx.lineWidth = w * (1 - q * 0.4);
      ctx.beginPath(); ctx.arc(f.x, f.y, R + off, a - 0.7, a + 0.7); ctx.stroke();
    }
    // spray off the crest's ends
    for (const s of [-1, 1]) {
      const b = a + s * 0.7;
      drawGlow(f.x + Math.cos(b) * R, f.y + Math.sin(b) * R, 16, '#ecfeff', 0.6 * A);
    }
  },
  skyturns(f, age, q) {
    // the eclipse slides off the hull, up and away, and the violet goes out of the corona
    const k = zaE(age / 1.1), ox = 26 + 80 * k, oy = -26 - 60 * k;
    zaEclipse(P.x + ox, P.y + oy, 9 * (1 - k * 0.5), 1 - k, 1 - k);
    ctx.globalCompositeOperation = 'lighter';
    zafRing(P.x, P.y, 20 + 300 * zaO(age / 0.8), '#e9d5ff', 0.7 * (1 - zaQ(age, 0, 0.8)), 3);
    drawGlow(P.x, P.y, 80, '#fef3c7', 0.5 * (1 - zaQ(age, 0.1, 0.9)));
  },
  eclipse(f, age, q) {
    const k = zaE(age / 0.8), ox = lerp(110, 30, k), oy = lerp(-90, 0, k);
    zaEclipse(P.x + ox, P.y + oy, lerp(14, 5.5, k), 1 - zaQ(age, 0.7, 0.9) * 0.15, k);
    ctx.globalCompositeOperation = 'lighter';
    zafRing(P.x, P.y, 140 * (1 - zaO(age / 0.6)) + 10, ZA_SHADE, 0.7 * (1 - q), 3);
  }
};
/* ============================ end of the events (zaf) ============================ */
