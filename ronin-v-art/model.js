/* ================== V: LAST VOW, in the room (lifted into index.html) ==================
   RONIN while the vow is up. The lore is the cut-in's: undead, sworn on a
   grave, everything given. His gold goes to red (vkwK eases it in on the cut,
   while the frame is still breaking): the floor under him cracks red and his
   brush-ring turns broken and faster; the hem of the cloak is alight and red
   runs through the cloth; the tails redden toward their ends and burn there;
   the shoulder plates crack; the blade is red-hot at rest; the kasa darkens,
   the crack the fight put in it burns, and its rim is the vow's clock (RONIN's
   own minute is held); his eyes are red, and drops of red light fall from the
   right one, the tear the dead can't shed, and lie on the floor a while.
   A red thread runs from his left wrist to the cloth on the grave: slack and
   swaying near it, taut and trembling far off, a bead of light down it to him
   when the grave is hit. A blow that should have killed him flashes him bone
   white and throws the cracks out into the floor.
   Replaces the placeholders' drawRoninVowWorld (glow pass) and drawRoninGrave
   (floor). RONIN's own art takes the vow's look in hull.js (drawRoninUnder and
   drawRoninHull, their lines marked V, and vraKatana redrawn), which calls
   vkwK, vkwFloor, vkwCloak and vkwKasaCrack from here. Art state in RKV
   (hitAt, undeadAt) and VKW (the drops); the logic reads none of it.
--------------------------------------------------------------------------- */
const VKW_JP = "'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'Noto Serif CJK JP', serif";
const VKW_POST = { w: 9, h: 34 };               // the grave post in the room, its face and its height
const VKW_THREAD = 320;                          // the thread's length: slack inside it, taut beyond
const VKW = { drops: [], dropAt: -9 };

// how far in the vow's look is: 0 out of it; in over the first 0.35 s after the cut
function vkwK() {
  const q = vowPhase();
  return q && q.cut ? vraEase(q.age / 0.35) : 0;
}
const vkwBeat = q => 0.5 + 0.5 * Math.sin(uiTime * (q && q.left < 5 ? 14 : 6));
/* under him (additive): a red glow, a broken red ensō turning fast, the floor cracking out */
function vkwFloor(k) {
  const q = vowPhase(), b = vkwBeat(q);
  drawGlow(P.x, P.y, 64, RKV_RED, (0.12 + 0.06 * b) * k);
  vraBrushArc(P.x, P.y, P.r + 28, uiTime * 1.1, TAU - 1.3, 3.2, RKV_RED, (0.4 + 0.15 * b) * k);
  ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) {
    const a0 = i / 7 * TAU + 0.3 + vraH(i + 70) * 0.4, L = 14 + 12 * vraH(i + 90);
    let x = P.x + Math.cos(a0) * (P.r + 6), y = P.y + Math.sin(a0) * (P.r + 6);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 1; j <= 3; j++) {
      const a = a0 + (vraH(i * 5 + j) - 0.5) * 0.7;
      x += Math.cos(a) * L / 3; y += Math.sin(a) * L / 3;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#dc2626', (0.35 + 0.25 * b) * k); ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = rgba('#fecaca', (0.22 + 0.2 * b) * k); ctx.lineWidth = 0.5; ctx.stroke();
  }
}
/* the cloak: its hem alight, and red light through cracks across the cloth */
function vkwCloak(A, B, nA, nB, ea, eb, k) {
  const t = uiTime, fl = 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(A[0].x, A[0].y);
  for (let i = 1; i < nA; i++) ctx.lineTo(A[i].x, A[i].y);
  ctx.quadraticCurveTo((ea.x + eb.x) / 2 - Math.cos(P.ang) * 4, (ea.y + eb.y) / 2 - Math.sin(P.ang) * 4, eb.x, eb.y);
  for (let i = nB - 2; i >= 0; i--) ctx.lineTo(B[i].x, B[i].y);
  ctx.strokeStyle = rgba('#7f1d1d', 0.9 * k); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba('#f97316', 0.55 * k * fl); ctx.lineWidth = 0.7; ctx.stroke();
  for (const [ia, ib, ph] of [[2, 4, 0], [4, 6, 1.7], [6, 7, 3.1]]) {
    const a = A[Math.min(ia, nA - 1)], b = B[Math.min(ib, nB - 1)];
    const mx = (a.x + b.x) / 2 + Math.sin(t * 2 + ph) * 1.5, my = (a.y + b.y) / 2 + Math.cos(t * 2 + ph) * 1.5;
    const q = 0.55 + 0.45 * Math.sin(t * 5 + ph);
    ctx.beginPath();
    ctx.moveTo(lerp(a.x, b.x, 0.12), lerp(a.y, b.y, 0.12));
    ctx.lineTo(lerp(a.x, mx, 0.6) + 1.5, lerp(a.y, my, 0.6) - 1);
    ctx.lineTo(mx, my);
    ctx.lineTo(lerp(mx, b.x, 0.5) - 1, lerp(my, b.y, 0.5) + 1.2);
    ctx.lineTo(lerp(a.x, b.x, 0.88), lerp(a.y, b.y, 0.88));
    ctx.strokeStyle = rgba('#dc2626', 0.5 * q * k); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = rgba('#fecaca', 0.45 * q * k); ctx.lineWidth = 0.4; ctx.stroke();
  }
  ctx.restore();
}
/* the crack across the front-left of the brim, burning (in the kasa's frame, additive) */
function vkwKasaCrack(R, k, low) {
  const t = uiTime, fl = (low ? 0.6 + 0.4 * Math.abs(Math.sin(t * 12)) : 0.85 + 0.15 * Math.sin(t * 7)) * k;
  const pts = [[-0.62, R - 0.4], [-0.85, 12.5], [-0.66, 10], [-0.95, 7.2], [-0.8, 4.4]];   // off the aim, out from the crown
  ctx.beginPath();
  pts.forEach(([a, r], i) => {
    const an = P.ang + a, x = Math.cos(an) * r, y = Math.sin(an) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#dc2626', 0.8 * fl); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = rgba('#fee2e2', 0.7 * fl); ctx.lineWidth = 0.4; ctx.stroke();
}
/* drops of red light off his right eye: one falls every 1.6 s, and lies on the floor a while */
function vkwTears(k) {
  const t = uiTime, D = VKW.drops;
  if (t - VKW.dropAt > 1.6) {
    VKW.dropAt = t;
    const ca = Math.cos(P.ang), sa = Math.sin(P.ang);
    D.push({ x: P.x + ca * 13 - sa * 3.4, y: P.y + sa * 13 + ca * 3.4, at: t });
    if (D.length > 12) D.shift();
  }
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i], age = t - d.at;
    if (age > 3 || age < 0) { D.splice(i, 1); continue; }
    if (age < 0.3) {
      const f = age / 0.3;
      drawGlow(d.x, d.y + 7 * f * f, 3.5 - 1.5 * f, '#ef4444', 0.9 * k);
    } else {
      const a = 1 - (age - 0.3) / 2.7;
      drawGlow(d.x, d.y + 7, 5, '#dc2626', 0.45 * a * k);
      ctx.fillStyle = rgba('#fecaca', 0.5 * a * k);
      ctx.beginPath(); ctx.arc(d.x, d.y + 7, 0.8, 0, TAU); ctx.fill();
    }
  }
}
// where the thread is tied on the grave post: the knot of its cloth, on the windward side
function vkwKnot(g) { return { x: g.x - VKW_POST.w / 2 - 0.4, y: g.y - VKW_POST.h + 8.2 }; }
/* the red thread, his left wrist to the cloth on the grave (additive) */
function vkwThread(g, q, k) {
  const t = uiTime, ca = Math.cos(P.ang), sa = Math.sin(P.ang);
  const ax = P.x + ca * 3 + sa * 10, ay = P.y + sa * 3 - ca * 10;
  const kn = vkwKnot(g), bx = kn.x, by = kn.y;
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  const slack = Math.max(0, VKW_THREAD - d), taut = clamp((d - VKW_THREAD) / 240, 0, 1);
  const sag = Math.min(70, slack * 0.32);
  const sway = Math.sin(t * 1.7) * 7 * (1 - taut) + Math.sin(t * 43) * 1.6 * taut;
  const cx = (ax + bx) / 2 + nx * sway, cy = (ay + by) / 2 + sag + ny * sway;
  const fl = q.left < 5 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 14)) : 1;
  const hit = clamp(1 - (t - RKV.hitAt) / 0.45, 0, 1);
  const at = s => ({ x: (1 - s) * (1 - s) * ax + 2 * (1 - s) * s * cx + s * s * bx, y: (1 - s) * (1 - s) * ay + 2 * (1 - s) * s * cy + s * s * by });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by);
  ctx.strokeStyle = rgba('#dc2626', (0.28 + 0.4 * hit) * fl * k); ctx.lineWidth = 3 - 1.2 * taut; ctx.stroke();
  ctx.strokeStyle = rgba('#fecaca', (0.45 + 0.4 * hit) * fl * k); ctx.lineWidth = 0.9 - 0.3 * taut; ctx.stroke();
  const w = at((t * 0.6) % 1);                    // a slow light running down it, him to the grave
  drawGlow(w.x, w.y, 8, '#ef4444', 0.35 * fl * k);
  if (hit > 0) {                                  // the grave calling: a bead of light coming down it to him
    const b = at(hit);
    drawGlow(b.x, b.y, 24, '#dc2626', 0.6 * hit * k);
    drawGlow(b.x, b.y, 10, '#ffffff', 0.7 * hit * k);
  }
  drawGlow(ax, ay, 6, '#ef4444', 0.5 * k);
  drawGlow(bx, by, 7, '#ef4444', 0.5 * k);
  ctx.restore();
}
/* a blow that should have killed him: bone white through him, a ring, the cracks thrown out into the floor */
function vkwUndead() {
  const age = uiTime - RKV.undeadAt;
  if (age < 0 || age > 0.8) return;
  const a = 1 - age / 0.8;
  drawGlow(P.x, P.y, 26 + 30 * age, '#ffffff', 0.75 * a * a);
  drawGlow(P.x, P.y, 60, '#dc2626', 0.5 * a);
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#f5f5f4', 0.85 * a); ctx.lineWidth = 2.6 * a + 0.4;
  ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 8 + 64 * vraOut(age / 0.45), 0, TAU); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a0 = i / 7 * TAU + P.ang + 0.4, L = (12 + 30 * vraH(i + 30)) * vraOut(age / 0.18);
    let x = P.x + Math.cos(a0) * 9, y = P.y + Math.sin(a0) * 9;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let j = 1; j <= 3; j++) {
      const an = a0 + (vraH(i * 4 + j) - 0.5) * 0.9;
      x += Math.cos(an) * L / 3; y += Math.sin(an) * L / 3;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba('#dc2626', 0.8 * a); ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = rgba('#fee2e2', 0.8 * a); ctx.lineWidth = 0.6; ctx.stroke();
  }
  ctx.restore();
}
// the hook, glow pass: the red breath round him, the thread, the drops, the undead flash
function drawRoninVowWorld() {
  rkvTears();
  rkvArcs();
  const sc = skyClearPhase();
  if (sc) drawRoninSkyClear(sc);
  const q = vowPhase(), g = P.roninGrave;
  if (!q || !q.cut) return;
  const k = vkwK(), b = vkwBeat(q);
  drawGlow(P.x, P.y, P.r * 3.6, RKV_RED, (0.16 + 0.14 * b) * k);
  ctx.save();
  ctx.strokeStyle = rgba(RKV_RED, (0.25 + 0.3 * b) * k); ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(P.x, P.y, P.r + 13 + 3 * b, 0, TAU); ctx.stroke();
  ctx.restore();
  if (g) vkwThread(g, q, k);
  vkwTears(k);
  vkwUndead();
}
/* the hook, floor layer: the post he drove in, as the cut-in drew it. Weathered
   wood cut to a point with two notches, the old red cloth tied round it, 誓
   burning in its face, the floor scorched and cracked red where it went in.
   It stands from the cut (the cut-in's plate has it going in). A first pass:
   its cracking, breaking and sealed looks come on their own board. As SKY
   CLEAR ends (its 'out'), it sinks into the floor (V). */
function drawRoninGrave() {
  const g = P.roninGrave;
  if (!g) return;
  const q = vowPhase(), t = uiTime;
  if (q && !q.cut) return;
  const sc = skyClearPhase(), sink = sc && sc.stage === 'out' ? vraEase(sc.st / SC_OUT) : 0;   // V
  const hurt = 1 - clamp(g.hp / g.maxHp, 0, 1), hit = clamp(1 - (t - RKV.hitAt) / 0.18, 0, 1);
  const x = g.x, y = g.y, w = VKW_POST.w / 2, top = y - VKW_POST.h;
  ctx.save();
  ctx.fillStyle = 'rgba(5,6,10,0.55)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 26, 13, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, 36, '#dc2626', 0.16 + 0.2 * hit);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 9; i++) {
    const a0 = i / 9 * TAU + vraH(i + 40) * 0.5, L = 14 + 16 * vraH(i + 60);
    let px = x + Math.cos(a0) * 4, py = y + 1 + Math.sin(a0) * 2;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let j = 1; j <= 3; j++) {
      const a = a0 + (vraH(i * 3 + j + 80) - 0.5) * 0.8;
      px += Math.cos(a) * L / 3; py += Math.sin(a) * L / 3 * 0.55;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = rgba('#dc2626', 0.45 + 0.3 * hit); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.strokeStyle = rgba('#fecaca', 0.3 + 0.3 * hit); ctx.lineWidth = 0.4; ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 1.5, 8, 3, 0, 0, TAU); ctx.fill();
  ctx.save();
  if (sink > 0) {                                 // V: going down, cut off at the floor
    ctx.beginPath(); ctx.rect(x - 60, top - 60, 120, y + 0.5 - (top - 60)); ctx.clip();
    ctx.translate(0, sink * (y - top + 6));
  }
  ctx.fillStyle = '#100c09';                      // its side, in shadow
  ctx.beginPath(); ctx.moveTo(x + w, top + 1.6); ctx.lineTo(x + w + 2, top + 2.6); ctx.lineTo(x + w + 2, y + 0.6); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  ctx.beginPath();                                // its face
  ctx.moveTo(x, top - 3.2); ctx.lineTo(x + w, top);
  for (const n of [2, 4.6]) { ctx.lineTo(x + w, top + n); ctx.lineTo(x + w - 0.8, top + n + 0.6); ctx.lineTo(x + w, top + n + 1.2); }
  ctx.lineTo(x + w, y); ctx.lineTo(x - w, y);
  for (const n of [4.6, 2]) { ctx.lineTo(x - w, top + n + 1.2); ctx.lineTo(x - w + 0.8, top + n + 0.6); ctx.lineTo(x - w, top + n); }
  ctx.lineTo(x - w, top); ctx.closePath();
  const wg = ctx.createLinearGradient(x - w, 0, x + w, 0);
  wg.addColorStop(0, '#5a4734'); wg.addColorStop(0.45, '#33281d'); wg.addColorStop(1, '#1d1610');
  ctx.fillStyle = wg; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(14,10,7,0.55)'; ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) { const gx = x - w + 2 + i * (2 * w - 4) / 2; ctx.beginPath(); ctx.moveTo(gx, top + 1); ctx.lineTo(gx + 0.4, y); ctx.stroke(); }
  if (hurt > 0.05) {                              // cracks, more the more it has taken, red in them
    const n = Math.ceil(hurt * 5);
    for (let i = 0; i < n; i++) {
      const sx = x + (vraH(i + 140) - 0.5) * w * 1.4, sy = top + 9 + vraH(i + 150) * (y - top - 12);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 2.2, sy + 3); ctx.lineTo(sx + 0.6, sy + 6); ctx.lineTo(sx + 2.6, sy + 9);
      ctx.strokeStyle = 'rgba(5,4,3,0.9)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba('#ef4444', 0.6); ctx.lineWidth = 0.4; ctx.stroke(); ctx.restore();
    }
  }
  if (hit > 0) { ctx.fillStyle = rgba('#ffffff', 0.7 * hit); ctx.fillRect(x - w - 2, top - 4, 2 * w + 4, y - top + 6); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(254,243,199,0.4)'; ctx.lineWidth = 0.6; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, top); ctx.lineTo(x, top - 3.2); ctx.lineTo(x + w, top); ctx.stroke();
  ctx.fillStyle = '#9f1d1d'; ctx.fillRect(x - w - 0.3, top + 7, 2 * w + 2.6, 2.4);   // the cloth, and its ends on the wind
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x - w - 0.3, top + 8.5, 2 * w + 2.6, 0.9);
  const kn = vkwKnot(g);
  ctx.lineCap = 'round';
  for (const [L, ph, wd] of [[10, 0, 1.3], [8, 2.2, 1.0]]) {
    let px = kn.x, py = kn.y;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 1; i <= 6; i++) {
      const s = i / 6, a = Math.PI - 0.25 - 0.3 * s + 0.5 * s * Math.sin(s * 6 - t * 8 + ph);
      px += Math.cos(a) * L / 6; py += Math.sin(a) * L / 6;
      ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = wd; ctx.stroke();
  }
  ctx.save();                                     // 誓, burning in its face
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, top + 15, 9, '#dc2626', 0.5 + 0.15 * Math.sin(t * 6));
  ctx.font = '900 7px ' + VKW_JP; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba('#fca5a5', 0.9); ctx.fillText('誓', x, top + 15);
  ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1 - sink;
  const bw = 40, by = top - 13, hk = clamp(g.hp / g.maxHp, 0, 1);   // its health, over it
  ctx.fillStyle = 'rgba(5,6,10,0.8)'; ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 5);
  ctx.fillStyle = hk < 0.3 ? RKV_RED : rgba(RKV_BONE, 0.9); ctx.fillRect(x - bw / 2, by, bw * hk, 3);
  if (g.sealed) { ctx.strokeStyle = rgba(VRA_GOLD, 0.8); ctx.lineWidth = 1; ctx.strokeRect(x - bw / 2 - 1.5, by - 1.5, bw + 3, 6); }
  ctx.restore();
}
/* =================== end of V: LAST VOW, in the room =================== */
