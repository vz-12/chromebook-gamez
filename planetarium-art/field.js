/* ================ THE PLANETARIUM — the signs on the field (art, 18 Nov) ================
   In place of the placeholders zDrawWorld (in the room, from drawPlayer, under the
   shields and the hull) and zDrawDark (on the screen, under the HUD).
   What the signs look like on you, and around you:
     ARIES        the dash is a red-orange comet with two horns curling in its wake;
                  a body it gored and stunned wears a turning star.
     TAURUS       gold coins circle the hull, one for every hundred carried, a second
                  ring past ten.
     GEMINI       Castor (white) over the double, Pollux (gold) over you. At III the
                  other two doubles, whole, and the ring of lightning that joins the
                  four: braided gold and lavender, crackling where it cuts a body.
     CANCER       shell plates round the hull, one for every shield; the shields over
                  the maximum (HIGH TIDE) are pale moon arcs. THE CARAPACE snaps shut
                  over the hull and glows until it bursts.
     LEO          (the stock corona) and at II a mane of long flame rays round it, and
                  round each double that carries it. While the nova lasts, a white-hot
                  heart.
     LIBRA        two pans hang either side of a beam over the hull; at II the beam
                  tips to the half of your health you're in. A hit repaid flashes them.
     PISCES       the deep: a sphere of dark water with light running through it and
                  ripples going out; enemy rounds in it trail bubbles. At II, the two
                  fish circle it, one each way.
     AQUARIUS     (the stock charged water), and while THE FLOOD has the floor, it
                  crackles.
     every III    its crown: the constellation, small and faint, circling the hull.
   And the shadows: the eclipse, a dark disc with a violet corona circling the hull,
   and each one's own tell (HEADLONG's streak and skid sparks, EARTHBOUND's roots,
   THE OTHER ONE in violet with its sight on you and a glow at the muzzle before it
   fires, THE MOLT's soft hull, EXACTING's count, THE SCALES' violet beam, THE STING
   TURNS' venom circling you, THE ARROW RETURNS' arrowhead, THE LONG CLIMB's summit
   filling back up, THE RISING TIDE at the walls with foam on its edge, DEEP WATER's
   bubbles) and SUNLESS on the screen: the dark, with a ragged, ember-lit rim.
   What changes between frames it notices itself (a shield broken, the dash ending,
   the shell opening, the nova, the flood, the tide, a shadow taken or lifted) and
   hands to the events' block (zaFx). When the dome closes, zDrawDark opens the room
   back up through an iris and sends the glyph taken to the tray (ZAD.fly).
   It reads P (and P.zx's clocks), enemies, ebullets, credits, WORLD, arena, camZoom,
   cam, zm/zsh/zTri, zTwins, zCentres, zLeoR, Z_DEEP_R, zOther, zTideM, twinActive,
   state and uiTime, and changes nothing of the logic's. Art state in ZAW (one bag a
   pilot, in a WeakMap). Needs the sky block and the events' block (zaf*).
========================================================================================= */
let ZAW = { pk: new WeakMap(), bolt: 0 };
// what this pilot looked like last frame, to see what has changed
function zawSeen() {
  let S = ZAW.pk.get(P);
  if (!S) {
    const x = P.zx || {};
    S = { shield: P.shield | 0, hp: P.hp, shadow: P.zShadow || '', dashT: P.dashT || 0, caraT: x.caraT || 0, novaT: x.novaT || 0,
          floodT: x.floodT || 0, tideT: x.tideT || 0, libT: -9, roots: [] };
    ZAW.pk.set(P, S);
  }
  return S;
}
function zawDiffs(S) {
  const x = P.zx || {}, now = uiTime;
  if (zm('cancer') && (P.shield | 0) < S.shield) zaFx('shell', P.x, P.y, S.shield - (P.shield | 0));
  if (zm('libra') && P.hp < S.hp - 0.5) S.libT = now;
  if (S.shadow && !P.zShadow) zaFx('skyturns', P.x, P.y, S.shadow);
  if (!S.shadow && P.zShadow) zaFx('eclipse', P.x, P.y, P.zShadow);
  if (S.dashT > 0 && !(P.dashT > 0) && zm('aries') >= 3) zaFx('crater', P.x, P.y, P.ang);
  if (S.caraT > 0 && !(x.caraT > 0)) zaFx('carapace', P.x, P.y);
  if ((x.novaT || 0) > S.novaT + 1) zaFx('nova', P.x, P.y);
  if ((x.floodT || 0) > S.floodT + 1) zaFx('flood', P.x, P.y);
  if (zm('pisces') >= 3 && S.tideT > 6 && (x.tideT || 0) < 1) zaFx('tide', P.x, P.y);
  S.shield = P.shield | 0; S.hp = P.hp; S.shadow = P.zShadow || ''; S.dashT = P.dashT || 0;
  S.caraT = x.caraT || 0; S.novaT = x.novaT || 0; S.floodT = x.floodT || 0; S.tideT = x.tideT || 0;
}

function zDrawWorld() {
  if (!P.zs) return;
  const S = zawSeen();
  zawDiffs(S);
  ctx.save();
  if (zsh('aquarius')) zawTide();
  if (zm('pisces')) { const pm = zm('pisces'); zCentres().forEach((c, k) => zawDeep(c.x, c.y, pm, k)); }
  if (zm('leo') >= 2) {
    zawMane(P.x, P.y, zLeoR(), 1);
    if (zm('gemini') >= 2) for (const t of zTwins()) { zawCoronaAt(t.x, t.y, zLeoR()); zawMane(t.x, t.y, zLeoR(), 0.7); }
  }
  if (P.zx && P.zx.novaT > 0) zawNovaHeart();
  if (P.zx && P.zx.floodT > 0) zawCrackle();
  if (zm('gemini') >= 3 && twinActive()) zawRing();
  if (twinActive()) zawTwins();
  if (zsh('gemini')) zawOther();
  if (zm('aries')) zawRam();
  if (zm('taurus')) zawCoins();
  if (zm('cancer') && !P.molt) zawShell();
  if (zm('libra')) zawPans(S);
  zawCrowns();
  if (P.zShadow) zawShadow(S);
  if (P.zx && P.zx.caraT > 0) zawCarapace(P.zx.caraT);
  zafDraw();
  ctx.restore();
}

/* ---------------------------------- the deep ---------------------------------- */
function zawDeep(x, y, mag, k) {
  const R = Z_DEEP_R, t = uiTime;
  ctx.save();
  let g = ctx.createRadialGradient(x, y, R * 0.1, x, y, R);
  g.addColorStop(0, 'rgba(8,47,73,0.04)'); g.addColorStop(0.75, 'rgba(7,89,133,0.13)'); g.addColorStop(1, 'rgba(14,116,144,0.26)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  // light running through it: caustic threads, slowly wandering
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 7; i++) {
    const a0 = i * 0.9 + t * 0.21 * (i % 2 ? 1 : -1), rr = R * (0.3 + 0.09 * i);
    ctx.strokeStyle = `rgba(125,211,252,${0.07 + 0.05 * Math.sin(t * 1.3 + i)})`;
    ctx.beginPath();
    for (let j = 0; j <= 18; j++) {
      const a = a0 + j * 0.16, w = Math.sin(j * 0.9 + t * 2 + i) * 9;
      const px = x + Math.cos(a) * (rr + w), py = y + Math.sin(a) * (rr + w);
      j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // ripples going out
  for (let i = 0; i < 3; i++) {
    const q = (t * 0.32 + i / 3) % 1;
    ctx.strokeStyle = `rgba(186,230,253,${0.22 * (1 - q)})`; ctx.lineWidth = 1.4 * (1 - q) + 0.4;
    ctx.beginPath(); ctx.arc(x, y, R * (0.2 + 0.8 * q), 0, TAU); ctx.stroke();
  }
  // the surface's edge
  ctx.strokeStyle = 'rgba(56,189,248,0.16)'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  ctx.strokeStyle = `rgba(125,211,252,${0.5 + 0.12 * Math.sin(t * 2)})`; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  // motes drifting in it
  for (let i = 0; i < 9; i++) {
    const a = zaH(i + k * 13) * TAU + t * (0.2 + zaH(i * 3) * 0.3), rr = R * (0.2 + zaH(i * 7) * 0.7);
    drawGlow(x + Math.cos(a) * rr, y + Math.sin(a) * rr + Math.sin(t + i) * 6, 5, '#7dd3fc', 0.25);
  }
  // the fish (II): two, circling one each way, each the colour of the other's wake
  if (mag >= 2) for (const s of [1, -1]) {
    const a = t * 0.9 * s + (s < 0 ? Math.PI : 0), fr = R * 0.8;
    zawFish(x + Math.cos(a) * fr, y + Math.sin(a) * fr, a + s * Math.PI / 2, s > 0 ? '#7dd3fc' : '#c7d2fe', t * 7 + (s < 0 ? 2 : 0));
  }
  ctx.restore();
  // enemy rounds caught in it trail bubbles
  if (rnd() < 0.5) for (const b of ebullets) {
    if ((b.x - x) ** 2 + (b.y - y) ** 2 > R * R || rnd() > 0.12) continue;
    spawnPart(b.x + rnd(4, -4), b.y + rnd(4, -4), rnd(10, -10), rnd(-12, -36), rnd(2.2, 1), '#bae6fd', rnd(0.6, 0.3), 0.96);
  }
}
// one of the fish: a body, its tail fanning, a fin, a glint of an eye
function zawFish(x, y, a, col, sw) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  drawGlow(0, 0, 24, col, 0.3);
  const tail = Math.sin(sw) * 0.45;
  ctx.strokeStyle = rgba(col, 0.9); ctx.fillStyle = rgba(col, 0.22); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(12, 0); ctx.quadraticCurveTo(4, -6.5, -6, -2); ctx.lineTo(-11, 0); ctx.lineTo(-6, 2); ctx.quadraticCurveTo(4, 6.5, 12, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.translate(-10, 0); ctx.rotate(tail);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -6); ctx.quadraticCurveTo(-5, 0, -8, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(1, -4.5); ctx.lineTo(-3, -9); ctx.lineTo(-4, -3.5); ctx.stroke();
  ctx.fillStyle = '#f0f9ff';
  ctx.beginPath(); ctx.arc(7, -1.4, 1.1, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------------------------------- the sun ---------------------------------- */
// MIDDAY's mane: long tongues of flame licking out past the corona's edge, each its own pace, soft at the tips
function zawMane(x, y, R, k) {
  const t = uiTime;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 36; i++) {
    const a = i * TAU / 36 + t * 0.1 + Math.sin(t * 0.7 + i) * 0.03;
    const wob = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 7) * 0.33) + i * 2.3);
    const L = R * (0.14 + 0.26 * wob * (i % 3 ? 0.8 : 1.3)), r0 = R * 0.97;
    const path = () => {
      ctx.beginPath();
      for (let j = 0; j <= 8; j++) {
        const u = j / 8, bend = Math.sin(u * 3 + t * 3.2 + i) * 0.035 * u;
        const px = x + Math.cos(a + bend) * (r0 + L * u), py = y + Math.sin(a + bend) * (r0 + L * u);
        j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
    };
    path(); ctx.strokeStyle = `rgba(234,88,12,${0.1 * k})`; ctx.lineWidth = R * 0.07; ctx.stroke();
    path(); ctx.strokeStyle = `rgba(251,146,60,${0.18 * k})`; ctx.lineWidth = R * 0.03; ctx.stroke();
    path(); ctx.strokeStyle = `rgba(254,240,138,${0.3 * k * wob})`; ctx.lineWidth = Math.max(1, R * 0.008); ctx.stroke();
  }
  drawGlow(x, y, R * 1.25, '#fb923c', 0.1 * k);
  ctx.restore();
}
// the corona round a double that carries it (the stock code draws yours)
function zawCoronaAt(x, y, R) {
  const t = uiTime;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, R * 0.95, '#fbbf24', 0.16);
  ctx.strokeStyle = `rgba(253,224,71,${0.4 + Math.sin(t * 3) * 0.1})`; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
  for (let i = 0; i < 14; i++) {
    const a = t * 0.35 + i * TAU / 14, wob = 0.5 + 0.5 * Math.sin(t * (2.4 + (i % 5) * 0.5) + i * 1.7);
    const r0 = R * 0.84, r1 = R * (1 + 0.15 * wob), sp = 0.08 + 0.04 * wob;
    ctx.fillStyle = i % 3 ? `rgba(251,146,60,${0.2 + 0.15 * wob})` : `rgba(253,224,71,${0.2 + 0.15 * wob})`;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a - sp) * r0, y + Math.sin(a - sp) * r0);
    ctx.quadraticCurveTo(x + Math.cos(a) * r1 * 1.06, y + Math.sin(a) * r1 * 1.06, x + Math.cos(a + sp) * r0, y + Math.sin(a + sp) * r0);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// while the nova lasts: a white-hot heart in the corona, and its edge doubled
function zawNovaHeart() {
  const t = uiTime, k = clamp(P.zx.novaT / 8, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x, P.y, 90 + 20 * Math.sin(t * 9), '#fffbeb', 0.35 * (0.4 + 0.6 * k));
  ctx.strokeStyle = `rgba(255,251,235,${0.35 * k})`; ctx.lineWidth = 3;
  ctx.setLineDash([18, 12]); ctx.lineDashOffset = -t * 60;
  ctx.beginPath(); ctx.arc(P.x, P.y, zLeoR() * 0.985, 0, TAU); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ---------------------------------- the twins ---------------------------------- */
// the doubles past the first, whole; Castor over the double and Pollux over you
function zawTwins() {
  const tw = zTwins(), t = uiTime;
  if (!tw.length) return;
  for (let k = 1; k < tw.length; k++) {
    const d = tw[k], ang = k === 1 ? -P.twinAng : Math.PI - P.twinAng;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(d.x, d.y, 44, '#c4b5fd', 0.38);
    ctx.restore();
    ctx.save();
    ctx.translate(d.x, d.y); ctx.rotate(ang);
    ctx.lineWidth = 2.2;
    drawShipHull('#c4b5fd', 'rgba(196,181,253,0.18)');
    ctx.restore();
  }
  if (!zm('gemini')) return;
  const star = (x, y, col, ph) => {
    const yy = y - 32 + Math.sin(t * 1.6 + ph) * 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(x, yy, 16, col, 0.5);
    zaStar4(x, yy, 6.5, t * 0.6 + ph, 0.22); ctx.fillStyle = rgba(col, 0.95); ctx.fill();
    zaStar4(x, yy, 2.6, 0, 0.5); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.restore();
  };
  star(tw[0].x, tw[0].y, '#e0e7ff', 0);      // Castor, white
  star(P.x, P.y, '#ffc07a', 1.7);            // Pollux, orange
}
// a bolt from (x0, y0) to (x1, y1): jagged, re-struck every few hundredths, seeded so it flickers rather than swims
function zawBolt(x0, y0, x1, y1, seed, amp, col, lw, a) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(L / 34)), nx = -(y1 - y0) / (L || 1), ny = (x1 - x0) / (L || 1);
  const q = Math.floor(uiTime * 22);
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x0, y0);
  for (let i = 1; i < n; i++) {
    const u = i / n, j = (zaH(seed * 31 + i * 7.3 + q * 1.91) - 0.5) * 2 * amp * Math.sin(Math.PI * u);
    ctx.lineTo(lerp(x0, x1, u) + nx * j, lerp(y0, y1, u) + ny * j);
  }
  ctx.lineTo(x1, y1); ctx.stroke();
}
// THE CONSTELLATION's ring: four of you, joined by lightning braided gold and lavender
function zawRing() {
  const x0 = P.x, y0 = P.y, x1 = WORLD.w - P.x, y1 = WORLD.h - P.y, t = uiTime;
  const E = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  E.forEach((s, i) => {
    ctx.strokeStyle = 'rgba(196,181,253,0.1)'; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    zawBolt(s[0], s[1], s[2], s[3], i * 3 + 1, 10, '#c4b5fd', 2.2, 0.75);
    zawBolt(s[0], s[1], s[2], s[3], i * 3 + 2, 8, '#fde68a', 1.6, 0.8);
    zawBolt(s[0], s[1], s[2], s[3], i * 3 + 3, 3, '#ffffff', 0.9, 0.6);
    // a pulse running round the ring
    const u = (t * 0.6 + i * 0.25) % 1;
    drawGlow(lerp(s[0], s[2], u), lerp(s[1], s[3], u), 26, '#e9d5ff', 0.4);
  });
  // where it cuts a body: crackle
  for (const e of enemies) {
    if (e.dead || e.phased) continue;
    for (const s of E) {
      const dx = s[2] - s[0], dy = s[3] - s[1], L2 = dx * dx + dy * dy || 1;
      const u = clamp(((e.x - s[0]) * dx + (e.y - s[1]) * dy) / L2, 0, 1), px = s[0] + dx * u, py = s[1] + dy * u;
      if ((e.x - px) ** 2 + (e.y - py) ** 2 > (e.r + 8) ** 2) continue;
      drawGlow(px, py, 22 + e.r, '#fde68a', 0.5);
      for (let j = 0; j < 3; j++) {
        const a = zaH(j + Math.floor(t * 20) + e.x) * TAU, L = 10 + zaH(j * 3 + e.y) * (e.r + 10);
        zawBolt(px, py, px + Math.cos(a) * L, py + Math.sin(a) * L, j + 9, 4, '#ffffff', 1, 0.8);
      }
      break;
    }
  }
  ctx.restore();
}
// THE OTHER ONE: your double in violet across the room, its sight on you, a glow at the muzzle before it fires
function zawOther() {
  const o = zOther(), a = Math.atan2(P.y - o.y, P.x - o.x), t = uiTime;
  const ht = P.zx ? P.zx.hostT || 0 : 0, tell = ht > 0 && ht < 0.22 ? 1 - ht / 0.22 : 0;
  const mx = o.x + Math.cos(a) * 20, my = o.y + Math.sin(a) * 20;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(o.x, o.y, 54, ZA_SHADE, 0.42 + 0.1 * Math.sin(t * 5));
  // its sight: a thin line to you
  const L = Math.min(len(P.x - o.x, P.y - o.y), 900);
  const g = ctx.createLinearGradient(mx, my, mx + Math.cos(a) * L, my + Math.sin(a) * L);
  g.addColorStop(0, rgba('#f0abfc', 0.35 + 0.4 * tell)); g.addColorStop(1, 'rgba(240,171,252,0)');
  ctx.strokeStyle = g; ctx.lineWidth = 1 + tell * 1.5;
  ctx.setLineDash([10, 8]); ctx.lineDashOffset = -t * 50;
  ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a) * L, my + Math.sin(a) * L); ctx.stroke();
  ctx.setLineDash([]);
  if (tell > 0) { drawGlow(mx, my, 10 + 22 * tell, '#f0abfc', 0.5 + 0.4 * tell); drawGlow(mx, my, 6, '#ffffff', 0.6 * tell); }
  ctx.restore();
  ctx.save();
  ctx.translate(o.x, o.y); ctx.rotate(a);
  ctx.lineWidth = 2.4;
  drawShipHull(ZA_SHADE_HI, 'rgba(20,5,32,0.92)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(244,114,182,0.95)';
  ctx.beginPath(); ctx.arc(7, -2.6, 1.4, 0, TAU); ctx.arc(7, 2.6, 1.4, 0, TAU); ctx.fill();
  ctx.restore();
}

/* ---------------------------------- the ram ---------------------------------- */
// the dash as a comet with the ram's horns curling in its wake; the stunned wear a turning star
function zawRam() {
  const t = uiTime;
  if (P.dashT > 0) {
    const sp = len(P.vx, P.vy), a = sp > 40 ? Math.atan2(P.vy, P.vx) : P.ang, bx = -Math.cos(a), by = -Math.sin(a), nx = -by, ny = bx;
    const L = 90 + Math.min(120, sp * 0.12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // the tail
    const g = ctx.createLinearGradient(P.x, P.y, P.x + bx * L, P.y + by * L);
    g.addColorStop(0, 'rgba(254,215,170,0.8)'); g.addColorStop(0.3, 'rgba(251,113,133,0.45)'); g.addColorStop(1, 'rgba(225,29,72,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(P.x + nx * 14, P.y + ny * 14); ctx.quadraticCurveTo(P.x + bx * L * 0.5 + nx * 8, P.y + by * L * 0.5 + ny * 8, P.x + bx * L, P.y + by * L);
    ctx.quadraticCurveTo(P.x + bx * L * 0.5 - nx * 8, P.y + by * L * 0.5 - ny * 8, P.x - nx * 14, P.y - ny * 14);
    ctx.closePath(); ctx.fill();
    // the horns: two spirals curling back off the shoulders
    for (const s of [1, -1]) {
      ctx.strokeStyle = 'rgba(251,146,60,0.75)'; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 22; i++) {
        const u = i / 22, an = u * Math.PI * 1.6, rr = 26 * (1 - u * 0.62);
        const cx = P.x + bx * (14 + u * 26) + nx * s * 16, cy = P.y + by * (14 + u * 26) + ny * s * 16;
        const px = cx + (Math.cos(an) * bx + Math.sin(an) * nx * s) * rr * 0.6, py = cy + (Math.cos(an) * by + Math.sin(an) * ny * s) * rr * 0.6;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    drawGlow(P.x, P.y, 46, '#fb7185', 0.55);
    drawGlow(P.x + Math.cos(a) * 12, P.y + Math.sin(a) * 12, 20, '#fff7ed', 0.6);
    ctx.restore();
    if (rnd() < 0.7) spawnPart(P.x + bx * 10 + rnd(8, -8), P.y + by * 10 + rnd(8, -8), bx * 140 + rnd(60, -60), by * 140 + rnd(60, -60), rnd(3, 1.4), rnd() < 0.5 ? '#fb7185' : '#fdba74', rnd(0.5, 0.2), 0.9);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const e of enemies) {
    if (e.dead || !(e.stagger > 0) || e.ramCd === undefined) continue;
    const x = e.x, y = e.y - e.r - 12;
    drawGlow(x, y, 12, '#fdba74', 0.45);
    zaStar4(x, y, 6, t * 7, 0.3); ctx.fillStyle = 'rgba(254,215,170,0.95)'; ctx.fill();
  }
  ctx.restore();
}

/* ---------------------------------- the hoard ---------------------------------- */
function zawCoin(x, y, r, spin, a) {
  const sx = Math.max(0.12, Math.abs(Math.cos(spin)));
  ctx.save();
  ctx.translate(x, y); ctx.scale(sx, 1);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, rgba('#fef3c7', a)); g.addColorStop(0.5, rgba('#f59e0b', a)); g.addColorStop(1, rgba('#92400e', a));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba('#fde68a', a); ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.stroke();
  ctx.restore();
}
// THE HOARD: a coin circling the hull for every hundred carried; past ten, a second ring the other way
function zawCoins() {
  const n = Math.min(20, Math.floor(Math.max(0, credits) / 100)), t = uiTime;
  if (!n) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x, P.y, 50, '#fbbf24', 0.12 + n * 0.006);
  ctx.restore();
  for (let i = 0; i < n; i++) {
    const ring = i < 10 ? 0 : 1, cnt = ring ? n - 10 : Math.min(10, n), j = ring ? i - 10 : i;
    const a = j * TAU / cnt + (ring ? -t * 0.6 : t * 0.9), R = ring ? 48 : 34;
    const x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R * 0.92;
    zawCoin(x, y, 4.2, t * 3 + i * 0.9, 0.95);
    if (zaH(i + Math.floor(t * 2)) < 0.06) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; zaGlint(x - 1.5, y - 1.5, 9, '#fffbeb', 0.8); ctx.restore(); }
  }
}

/* ---------------------------------- the shell ---------------------------------- */
// THE SHELL: one plate for every shield, round the hull; the ones over the maximum are pale moon arcs
function zawShell() {
  const n = Math.min(10, P.shield | 0), base = Math.min(n, P.shieldMax | 0), t = uiTime, R = P.r + 17;
  if (!n) return;
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = 0; i < base; i++) {
    const a = t * 0.5 + i * TAU / base, span = Math.min(0.9, TAU / base * 0.72);
    const a0 = a - span / 2, a1 = a + span / 2, r0 = R - 4, r1 = R + 4;
    ctx.beginPath();
    ctx.arc(P.x, P.y, r1, a0 + 0.06, a1 - 0.06);
    ctx.lineTo(P.x + Math.cos(a1) * R, P.y + Math.sin(a1) * R);
    ctx.arc(P.x, P.y, r0, a1 - 0.06, a0 + 0.06, true);
    ctx.lineTo(P.x + Math.cos(a0) * R, P.y + Math.sin(a0) * R);
    ctx.closePath();
    ctx.fillStyle = 'rgba(12,74,110,0.78)'; ctx.fill();
    ctx.strokeStyle = 'rgba(125,211,252,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    // a ridge down its middle, and its sheen
    ctx.strokeStyle = 'rgba(224,242,254,0.55)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(P.x, P.y, R, a0 + 0.12, a1 - 0.12); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = base; i < n; i++) {
    const a = -t * 0.8 + (i - base) * TAU / Math.max(1, n - base);
    ctx.strokeStyle = `rgba(224,242,254,${0.55 + 0.2 * Math.sin(t * 3 + i)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.x, P.y, R + 10, a - 0.35, a + 0.35); ctx.stroke();
    ctx.strokeStyle = 'rgba(186,230,253,0.25)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(P.x, P.y, R + 10, a - 0.3, a + 0.3); ctx.stroke();
  }
  ctx.restore();
}
// THE CARAPACE: the shell snapped shut over the hull, glowing until it opens (the burst is zaFx's)
function zawCarapace(left) {
  const t = uiTime, age = 3 - left, snap = zaO(age / 0.16), R = P.r + 14 + (1 - snap) * 30;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(P.x, P.y, R * 2.4, '#38bdf8', 0.35 + 0.15 * Math.sin(t * 6));
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 8; i++) {
    const a0 = i * TAU / 8 + 0.05, a1 = (i + 1) * TAU / 8 - 0.05;
    ctx.beginPath();
    ctx.arc(P.x, P.y, R, a0, a1); ctx.arc(P.x, P.y, R * 0.52, a1, a0, true); ctx.closePath();
    ctx.fillStyle = 'rgba(8,47,73,0.85)'; ctx.fill();
    ctx.strokeStyle = `rgba(125,211,252,${0.7 + 0.3 * Math.sin(t * 8 + i)})`; ctx.lineWidth = 1.4; ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(224,242,254,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
  // the seam it will open along, brightening as it does
  const warn = zaQ(age, 2.4, 3);
  ctx.strokeStyle = rgba('#ffffff', 0.3 + 0.7 * warn); ctx.lineWidth = 1 + 2 * warn;
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    ctx.beginPath(); ctx.moveTo(P.x + Math.cos(a) * R * 0.5, P.y + Math.sin(a) * R * 0.5); ctx.lineTo(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); ctx.stroke();
  }
  ctx.restore();
}

/* ---------------------------------- the scales ---------------------------------- */
function zawScales(x, y, tilt, col, col2, a, flash) {
  const L = 24, dx = Math.cos(tilt) * L, dy = Math.sin(tilt) * L;
  ctx.save();
  ctx.lineCap = 'round';
  if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(x, y + 10, 50, col, 0.6 * flash); ctx.globalCompositeOperation = 'source-over'; }
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  ctx.fillStyle = rgba(col, a);
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x - 3, y + 2); ctx.lineTo(x + 3, y + 2); ctx.closePath(); ctx.fill();
  for (const s of [-1, 1]) {
    const px = x + dx * s, py = y + dy * s, by = py + 13;
    ctx.strokeStyle = rgba(col2, 0.7 * a); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 6, by); ctx.moveTo(px, py); ctx.lineTo(px + 6, by); ctx.stroke();
    ctx.strokeStyle = rgba(col2, a); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(px, by - 1, 7, 0.15, Math.PI - 0.15); ctx.stroke();
  }
  ctx.restore();
}
// THE SCALES (the sign): a beam over the hull, two pans; at II it tips to the half of your health you're in
function zawPans(S) {
  const m = zm('libra'), hp = clamp(P.hp / P.maxHp, 0, 1), t = uiTime;
  const tilt = m >= 2 ? (hp >= 0.5 ? -0.32 : 0.32) * (0.6 + 0.4 * Math.abs(hp - 0.5) * 2) : Math.sin(t * 1.3) * 0.08;
  const fl = 1 - zaQ(t, S.libT, S.libT + 0.5);
  zawScales(P.x, P.y - 40, tilt, '#fde68a', '#f9a8d4', 0.9, fl);
}

/* ---------------------------------- the crowns ---------------------------------- */
// every ASCENDANT sign: its constellation, small and faint, circling the hull
function zawCrowns() {
  const asc = ZA_ORDER.filter(id => zm(id) >= 3), t = uiTime;
  if (!asc.length) return;
  ctx.save();
  asc.forEach((id, k) => {
    const R = 58 + k * 13, a = t * 0.32 * (k % 2 ? -1 : 1) + k * 2.1;
    ctx.strokeStyle = 'rgba(253,230,138,0.07)'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 7]);
    ctx.beginPath(); ctx.arc(P.x, P.y, R, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    zaConst(id, P.x + Math.cos(a) * R, P.y + Math.sin(a) * R, 26, { a: 0.55, lineA: 0.55, lineCol: ZA_GOLD, spark: 0.5, seed: k });
  });
  ctx.restore();
}

/* ---------------------------------- the shadows ---------------------------------- */
function zawShadow(S) {
  const sh = P.zShadow, x = P.zx || {}, t = uiTime;
  // the eclipse, circling the hull
  const ea = t * 0.8;
  zaEclipse(P.x + Math.cos(ea) * 30, P.y + Math.sin(ea) * 30, 5.5, 0.85);
  ctx.save();
  if (sh === 'aries') {                       // HEADLONG: the engine never lets go, and it skids
    const ax = x.lastX === undefined ? Math.cos(P.ang) : x.lastX, ay = x.lastY === undefined ? Math.sin(P.ang) : x.lastY;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(P.x, P.y, P.x - ax * 60, P.y - ay * 60);
    g.addColorStop(0, 'rgba(240,171,252,0.6)'); g.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 6 + Math.sin(t * 30) * 1.5;
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(P.x - ax * 60, P.y - ay * 60); ctx.stroke();
    if (rnd() < 0.35) { const s = rnd() < 0.5 ? 1 : -1; spawnPart(P.x - ay * 12 * s, P.y + ax * 12 * s, -ax * 90 + rnd(50, -50), -ay * 90 + rnd(50, -50), rnd(2, 1), '#fde68a', rnd(0.35, 0.15), 0.88); }
  } else if (sh === 'taurus') {               // EARTHBOUND: the ground holds you; roots grip the hull while it does
    const hold = x.holdT > 0 ? clamp(x.holdT, 0, 1) : 0, grow = hold > 0 ? zaO((1 - hold) / 0.2) : 0;
    ctx.strokeStyle = 'rgba(41,37,36,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 6, 0, TAU); ctx.stroke();
    if (hold > 0) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const a0 = i * TAU / 9 + zaH(i) * 0.4, L = (34 + zaH(i * 3) * 30) * grow;
        ctx.strokeStyle = i % 2 ? 'rgba(120,113,108,0.9)' : 'rgba(87,83,78,0.9)'; ctx.lineWidth = 3 - i % 2;
        ctx.beginPath(); ctx.moveTo(P.x + Math.cos(a0) * L, P.y + Math.sin(a0) * L);
        for (let j = 1; j <= 5; j++) {
          const u = 1 - j / 5, a = a0 + Math.sin(j * 1.7 + i) * 0.25;
          ctx.lineTo(P.x + Math.cos(a) * (P.r * 0.4 + L * u), P.y + Math.sin(a) * (P.r * 0.4 + L * u));
        }
        ctx.stroke();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawGlow(P.x + Math.cos(a0) * L, P.y + Math.sin(a0) * L, 6, ZA_SHADE, 0.6 * grow);
        ctx.restore();
      }
    }
  } else if (sh === 'cancer') {               // THE MOLT: no shell, and the hull looks soft
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * TAU, rr = P.r + 7 + Math.sin(a * 5 + t * 4) * 2.2 + Math.sin(a * 3 - t * 2.6) * 1.6;
      i ? ctx.lineTo(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr) : ctx.moveTo(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(249,168,212,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(249,168,212,0.45)'; ctx.lineWidth = 1.4; ctx.stroke();
  } else if (sh === 'virgo') {                // EXACTING: she is counting
    ctx.strokeStyle = 'rgba(216,180,254,0.55)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * TAU / 12 - t * 0.5;
      ctx.moveTo(P.x + Math.cos(a) * (P.r + 9), P.y + Math.sin(a) * (P.r + 9));
      ctx.lineTo(P.x + Math.cos(a) * (P.r + (i % 3 ? 13 : 17)), P.y + Math.sin(a) * (P.r + (i % 3 ? 13 : 17)));
    }
    ctx.stroke();
  } else if (sh === 'libra') {                // THE SCALES (the shadow): the beam in violet, what is owed in its pan
    const owe = P.scalesDebt > 0 ? clamp(P.scalesDebt / (P.maxHp * 0.15), 0, 1) : 0;
    zawScales(P.x, P.y - 40, 0.2 + owe * 0.35, ZA_SHADE_HI, '#f0abfc', 0.85, 0);
  } else if (sh === 'scorpio') {              // THE STING TURNS: the venom you carry, circling you
    const n = Math.min(24, x.selfPsn | 0);
    ctx.globalCompositeOperation = 'lighter';
    if (n) drawGlow(P.x, P.y, 40, '#a3e635', 0.12 + n * 0.012);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + t * 1.4, rr = P.r + 12 + (i % 2) * 4;
      drawGlow(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 5, '#a3e635', 0.7);
      ctx.fillStyle = '#ecfccb';
      ctx.beginPath(); ctx.arc(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr, 1.4, 0, TAU); ctx.fill();
    }
  } else if (sh === 'sagittarius') {          // THE ARROW RETURNS: an arrowhead circling, pointed at you
    const a = -t * 1.1, rr = P.r + 24, hx = P.x + Math.cos(a) * rr, hy = P.y + Math.sin(a) * rr;
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(hx, hy, 10, ZA_SHADE, 0.6);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(a + Math.PI);
    ctx.fillStyle = 'rgba(233,213,255,0.9)';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -4); ctx.lineTo(-1.5, 0); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (sh === 'capricorn') {            // THE LONG CLIMB: a summit over the hull, filling back up wave by wave
    const f = clamp(((x.capSh || 0.34) - 0.34) / 0.66, 0, 1), sx = P.x, sy = P.y - 34;
    ctx.beginPath(); ctx.moveTo(sx - 13, sy + 7); ctx.lineTo(sx - 3, sy - 7); ctx.lineTo(sx + 1, sy - 2); ctx.lineTo(sx + 5, sy - 9); ctx.lineTo(sx + 14, sy + 7); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(168,85,247,0.55)'; ctx.fillRect(sx - 15, sy + 7 - 16 * f, 30, 16 * f);
    ctx.restore();
    ctx.strokeStyle = 'rgba(216,180,254,0.85)'; ctx.lineWidth = 1.3; ctx.stroke();
  } else if (sh === 'pisces') {               // DEEP WATER: bubbles off the hull
    if (rnd() < 0.3) spawnPart(P.x + rnd(10, -10), P.y + rnd(10, -10), rnd(12, -12), rnd(-20, -50), rnd(2.4, 1), '#bae6fd', rnd(0.8, 0.4), 0.96);
    ctx.strokeStyle = 'rgba(56,189,248,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 8 + Math.sin(t * 2) * 2, 0, TAU); ctx.stroke();
  } else if (sh === 'aquarius') {
    if (zTideIn(P.x, P.y) && rnd() < 0.4) spawnPart(P.x + rnd(12, -12), P.y + rnd(12, -12), 0, rnd(-10, -30), rnd(2, 1), '#7dd3fc', rnd(0.6, 0.3), 0.95);
  }
  ctx.restore();
}
// THE RISING TIDE: the water in from the walls, its edge wavering, a line of foam along it
function zawTide() {
  const m = zTideM();
  if (m <= 1) return;
  const t = uiTime, ax = arena.x0, ay = arena.y0, aw = arena.x1 - arena.x0, ah = arena.y1 - arena.y0;
  const ix0 = ax + m, iy0 = ay + m, ix1 = ax + aw - m, iy1 = ay + ah - m;
  const pts = [], wav = s => Math.sin(s * 0.022 + t * 1.8) * 7 + Math.sin(s * 0.009 - t * 1.1) * 6;
  const edge = (x0, y0, x1, y1, nx, ny, s0) => {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.ceil(L / 24));
    for (let i = 0; i < n; i++) { const u = i / n, w = wav(s0 + u * L); pts.push([lerp(x0, x1, u) + nx * w, lerp(y0, y1, u) + ny * w]); }
    return s0 + L;
  };
  let s = edge(ix0, iy0, ix1, iy0, 0, 1, 0);
  s = edge(ix1, iy0, ix1, iy1, -1, 0, s);
  s = edge(ix1, iy1, ix0, iy1, 0, -1, s);
  edge(ix0, iy1, ix0, iy0, 1, 0, s);
  const ring = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  ctx.save();
  ctx.beginPath(); ctx.rect(ax, ay, aw, ah);
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  ctx.fillStyle = 'rgba(3,105,161,0.24)'; ctx.fill('evenodd');
  // ripple lines out in the water, and the foam on its edge
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  ring(); ctx.strokeStyle = 'rgba(56,189,248,0.16)'; ctx.lineWidth = 12; ctx.stroke();
  ring(); ctx.strokeStyle = `rgba(224,242,254,${0.55 + 0.15 * Math.sin(t * 3)})`; ctx.lineWidth = 2.2; ctx.stroke();
  ctx.setLineDash([6, 16]); ctx.lineDashOffset = -t * 30;
  ctx.save(); ctx.translate(0, 0);
  ctx.strokeStyle = 'rgba(186,230,253,0.35)'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.rect(ix0 - 22, iy0 - 22, ix1 - ix0 + 44, iy1 - iy0 + 44); ctx.stroke();
  ctx.restore();
  ctx.setLineDash([]);
  ctx.restore();
}
// THE FLOOD's floor, crackling while it is charged
function zawCrackle() {
  const t = uiTime, q = Math.floor(t * 14), k = clamp(P.zx.floodT / 4, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    const a = zaH(q * 3.1 + i) * TAU, r = 60 + zaH(q * 1.7 + i * 5) * 520, x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r * 0.8;
    const b = a + (zaH(i + q) - 0.5) * 2, L = 30 + zaH(i * 9 + q) * 50;
    zawBolt(x, y, x + Math.cos(b) * L, y + Math.sin(b) * L, i + q, 7, '#67e8f9', 1.3, 0.6 * k);
    drawGlow(x, y, 14, '#67e8f9', 0.25 * k);
  }
  ctx.restore();
}

/* ---------------------------------- on the screen ---------------------------------- */
function zDrawDark() {
  // the dome closing: noticed here, the first frame after it shut
  if (ZAD.open && state !== 'planet') {
    ZAD.open = false; ZAD.closeT = uiTime;
    const f = ZAD.flyFrom;
    if (f && ZAD.done) ZAD.fly = { id: f.id, x: f.x, y: f.y, t: uiTime + 0.18, retro: f.retro };
    ZAD.flyFrom = null;
  }
  zawSunless();
  zafScreen();
  zawIris();
}
// SUNLESS: the dark, with the light left round the hull and a ragged, ember-lit rim
function zawSunless() {
  if (!zsh('leo') || state === 'menu' || state === 'dead') return;
  const z = camZoom, t = uiTime;
  const sx = (P.x - cam.x) * z + W / 2 + cam.sx, sy = (P.y - cam.y) * z + H / 2 + cam.sy, r = 240 * z;
  const pts = [];
  for (let i = 0; i < 96; i++) {
    const a = i / 96 * TAU, rr = r * (1 + 0.05 * Math.sin(a * 7 + t * 1.3) + 0.035 * Math.sin(a * 13 - t * 2.1) + 0.025 * Math.sin(a * 23 + t * 3.7));
    pts.push([sx + Math.cos(a) * rr, sy + Math.sin(a) * rr]);
  }
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H);
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  ctx.fillStyle = 'rgba(2,2,6,0.985)'; ctx.fill('evenodd');
  const g = ctx.createRadialGradient(sx, sy, r * 0.62, sx, sy, r * 1.08);
  g.addColorStop(0, 'rgba(2,2,6,0)'); g.addColorStop(1, 'rgba(2,2,6,0.92)');
  ctx.fillStyle = g;
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(251,146,60,0.16)'; ctx.lineWidth = 2.5; ctx.stroke();
  for (let i = 0; i < 96; i += 6) {
    const fl = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.3);
    drawGlow(pts[i][0], pts[i][1], 6 + fl * 5, '#fb923c', 0.18 * fl);
  }
  ctx.restore();
}
// leaving the dome: it opens like an iris onto the room, its blades edged in gold
function zawIris() {
  const age = uiTime - ZAD.closeT;
  if (age < 0 || age > 0.65) return;
  const k = zaE(age / 0.65), cx = W / 2, cy = H / 2, D = Math.hypot(W, H) / 2 + 40, R = D * k, rot = k * 1.2;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(cx + R, cy); ctx.arc(cx, cy, R, 0, TAU, true);
  ctx.fillStyle = `rgba(2,3,9,${0.96 * (1 - k * 0.4)})`; ctx.fill('evenodd');
  // the blades: tangent to the opening, ten of them
  ctx.strokeStyle = rgba(ZA_GOLD, 0.55 * (1 - k)); ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = i * TAU / 10 + rot, px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R, tx = -Math.sin(a), ty = Math.cos(a);
    ctx.moveTo(px, py); ctx.lineTo(px + tx * D * 0.7 + Math.cos(a) * D * 0.2, py + ty * D * 0.7 + Math.sin(a) * D * 0.2);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(ZA_GOLD_HI, 0.8 * (1 - k)); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  ctx.restore();
}
/* ============================ end of the field (zaw) ============================ */
