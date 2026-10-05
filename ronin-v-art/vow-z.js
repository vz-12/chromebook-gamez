/* ===================== V: LAST VOW — the vow's Z (art, 5 Oct) =====================
   SUNDER (Z), SHATTER (Z after Z), FAULT LINE (Z after X) and AFTERSHOCK
   (Z after C) play through Z's own hooks; a vow cleave (c.vow) takes this look
   in place of the gold one. The user's brief (5 Oct): crimson, his rage given
   form or the souls of the dead, stretched faces in the animation, and his
   true form showing through it.
   The look. A vow Z is cut by his rage in his own shape: a crimson phantom of
   him rises at the cross, makes the strokes and comes apart into the dead.
   Each stroke tears the floor open and drags the dead out with it: faces
   stretched along their flight, wailing, bone at the brow and crimson down
   the trail. The tear stays a rift onto them for its six seconds: bone hands
   reach out of it, the dead keep rising from it, and a body standing in it is
   seized (each of the tear's cuts is a hand closing on it). The cross closing
   lets one great face out. A blast throws a ring of the dead; SHATTER's
   floor breaks into shards, and AFTERSHOCK raises his true form, the phantom
   at full height, behind him. A move's name burns on with its kanji on a
   crimson seal.
   Wiring, one line in each of Z's hooks (everything else is in this block):
     drawRoninScores()          at its top: vkzFloorFx();   in its loop: if (c.vow) { vkzFloor(c); continue; }
     drawRoninCleaves()         in its loop: if (c.vow) { vkzCleave(c); continue; }
     roninCleaveFx(c)           first line: if (c.vow) return vkzCleaveFx(c);
     roninStrokeFx(c, s)        first line: if (c.vow) return vkzStrokeFx(c, s);
     roninCleaveHitFx(e, c, s)  first line: if (c.vow) return vkzHitFx(e, c, s);
     drawRoninVowScreen(q)      first line: vkzScreen();
   rkvTears, roninVowNameFx and roninVowBlastFx in the placeholders are
   replaced by the ones at the end of this block. It reads c.vow (n, tear, and
   cut: when the tear last cut each body), the strokes (s.fault: FAULT LINE's
   path), enemies and P, and changes nothing of the logic's. Art state in VKZ.
=================================================================================== */
const VKZ_CRIM = '#be123c', VKZ_HOT = '#fb7185', VKZ_PALE = '#ffe4e6', VKZ_DEEP = '#4c0519';
const VKZ_VOID = '#0a0205', VKZ_BONE = '#f1e4e2';
const VKZ_JP = "'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'Noto Serif CJK JP', serif";
// each move's kanji, for its seal (C's are here too: the name hook is shared)
const VKZ_KANJI = { 'SUNDER': '断', 'SHATTER': '砕', 'FAULT LINE': '断層', 'AFTERSHOCK': '余震',
                    'WRATH': '憤怒', 'QUAKE': '地震', 'EYE OF THE STORM': '台風の目', 'NO MERCY': '無慈悲' };
const VKZ_STROKE = 0.38;      // how long a vow stroke burns after it lands
let VKZ = { souls: [], hits: [], grabs: [], blasts: [], names: [], flashes: [], cut: new Map(),
            stepAt: -1, dt: 0.016, windAt: -9, windX: 0, windY: 0, blastN: 0 };

const vkzMain = c => c.strokes.filter(s => !s.fault);           // the cross's own strokes, not FAULT LINE's path
const vkzWide = (c, s) => (s.fault ? 12 : 9) * (c.vow.n === 'AFTERSHOCK' ? 1.3 : 1);   // half a rift at its widest
// how far a stroke's rift is open: it rips open as the stroke lands, and narrows through its last second
const vkzOpen = (c, s) => vraOut((c.t - s.at) / (s.fault ? 0.3 : 0.16)) * (0.25 + 0.75 * vraEase(clamp((c.end - c.t) / 1, 0, 1)));

/* ------------------------------- the dead -------------------------------- */
/* one of the dead: a face stretched along its flight, wailing. (x, y) is the face, ang the way
   it goes, len its whole length with the trail, w its width, cry how wide the mouth is (0 to 1),
   a its strength. Its light first, then its pale shroud, dark eyes and mouth over what is there. */
function vkzFace(x, y, ang, len, w, cry, a) {
  if (a <= 0.01 || w <= 0.5) return;
  const hw = w / 2, tl = Math.max(0, len - w), wv = Math.sin(uiTime * 13 + x * 0.05) * hw * 0.35;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(-tl * 0.2, 0, hw * 2.4 + tl * 0.25, VKZ_CRIM, 0.4 * a);
  ctx.globalCompositeOperation = 'source-over';
  // the shroud: the skull's dome leading, drawn back into a trail that wavers
  ctx.beginPath();
  ctx.moveTo(hw, 0);
  ctx.bezierCurveTo(hw, -hw * 1.1, -hw * 0.5, -hw * 1.2, -hw * 1.05, -hw * 0.75);
  ctx.bezierCurveTo(-hw - tl * 0.35, -hw * 0.55, -hw - tl * 0.7, wv - hw * 0.15, -hw - tl, wv);
  ctx.bezierCurveTo(-hw - tl * 0.7, wv + hw * 0.15, -hw - tl * 0.35, hw * 0.55, -hw * 1.05, hw * 0.75);
  ctx.bezierCurveTo(-hw * 0.5, hw * 1.2, hw, hw * 1.1, hw, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(hw, 0, -hw - tl, 0);
  g.addColorStop(0, rgba(VKZ_BONE, 0.88 * a)); g.addColorStop(0.25, rgba(VKZ_HOT, 0.6 * a));
  g.addColorStop(0.6, rgba(VKZ_CRIM, 0.35 * a)); g.addColorStop(1, rgba(VKZ_CRIM, 0));
  ctx.fillStyle = g; ctx.fill();
  // the eyes, hollow and dragged back; the mouth, a long wail; the cheeks drawn in
  ctx.fillStyle = rgba(VKZ_VOID, 0.9 * a);
  for (const sd of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(hw * 0.3, sd * hw * 0.4, hw * 0.34, hw * 0.2, -sd * 0.35, 0, TAU); ctx.fill();
  }
  const mw = hw * (0.3 + 0.55 * cry);
  ctx.beginPath(); ctx.ellipse(-hw * 0.45 - mw * 0.5, 0, mw, hw * (0.16 + 0.14 * cry), 0, 0, TAU); ctx.fill();
  if (w > 7) {
    ctx.strokeStyle = rgba(VKZ_VOID, 0.5 * a); ctx.lineWidth = Math.max(0.5, hw * 0.08);
    ctx.beginPath();
    for (const sd of [-1, 1]) { ctx.moveTo(hw * 0.05, sd * hw * 0.62); ctx.quadraticCurveTo(-hw * 0.5, sd * hw * 0.75, -hw * 0.95, sd * hw * 0.35); }
    ctx.stroke();
  }
  // a light deep in each eye
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(VKZ_HOT, 0.9 * a);
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(hw * 0.38, sd * hw * 0.4, Math.max(0.5, hw * 0.08), 0, TAU); ctx.fill(); }
  ctx.restore();
}
// a soul let loose: it flies, curls, stretches with its speed, wails, and is gone in its life
function vkzSoul(x, y, ang, spd, o) {
  o = o || {};
  if (VKZ.souls.length > 90) VKZ.souls.shift();
  VKZ.souls.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, w: o.w || rnd(13, 8), life: o.life || rnd(1, 0.6),
                   t: 0, drag: o.drag === undefined ? 0.2 : o.drag, rise: o.rise || 0, curl: rnd(1.4, -1.4), wob: rnd(TAU), a: o.a || 1 });
}
function vkzSouls() {
  for (const s of VKZ.souls) {
    const q = s.t / s.life, a = vraOut(s.t / 0.08) * (1 - vraEase((q - 0.55) / 0.45)) * s.a;
    const spd = Math.hypot(s.vx, s.vy), ang = spd > 1 ? Math.atan2(s.vy, s.vx) : -Math.PI / 2;
    vkzFace(s.x, s.y, ang, s.w * (1.4 + 1.2 * q) + Math.min(70, spd * 0.12), s.w * (1 - 0.3 * q),
            0.6 + 0.4 * Math.sin(s.t * 9 + s.wob), a);
  }
}

/* ------------------------------ the hands of the dead ------------------------------
   Bone as bone: each one a shape with swollen ends and a waisted shaft, shaded as a round
   thing lit from the upper left, its shadowed side crimson from the rift's light. */
const VKZ_BONE_BASE = '#d8c9ae', VKZ_BONE_LIT = '#fbf3e3', VKZ_BONE_SHADE = '#6b2a2c', VKZ_BONE_DEEP = '#3a2421';
// one bone, (x0, y0) to (x1, y1) in the arm's frame: its ends r0 and r1 across, the shaft rs.
// (lx, ly) points to the light; deep (0 to 1) is how far it is turned away, curled under the
// hand; plain draws it flat, for when it is too small on the screen to shade
function vkzBone(x0, y0, x1, y1, r0, r1, rs, lx, ly, a, deep, plain) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), base = vriMix(VKZ_BONE_BASE, VKZ_BONE_DEEP, deep, a);
  if (L < Math.max(r0, r1) * 0.6) {               // seen end on: a knob
    const r = Math.max(r0, r1);
    ctx.beginPath(); ctx.arc(x1, y1, r, 0, TAU);
    ctx.fillStyle = base; ctx.fill();
    if (!plain) {
      ctx.fillStyle = rgba(VKZ_BONE_LIT, 0.7 * a * (1 - deep));
      ctx.beginPath(); ctx.arc(x1 + lx * r * 0.35, y1 + ly * r * 0.35, r * 0.4, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x1, y1, r, 0, TAU);
    ctx.strokeStyle = rgba(VKZ_VOID, 0.75 * a); ctx.lineWidth = Math.max(0.35, r * 0.3); ctx.stroke();
    return;
  }
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux, au = Math.atan2(uy, ux);
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, c = 2 * rs - (r0 + r1) / 2;   // c: the waist lands at rs
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(x0 + nx * r0, y0 + ny * r0);
    ctx.quadraticCurveTo(mx + nx * c, my + ny * c, x1 + nx * r1, y1 + ny * r1);
    ctx.arc(x1, y1, r1, au + Math.PI / 2, au - Math.PI / 2, true);
    ctx.quadraticCurveTo(mx - nx * c, my - ny * c, x0 - nx * r0, y0 - ny * r0);
    ctx.arc(x0, y0, r0, au - Math.PI / 2, au - 3 * Math.PI / 2, true);
    ctx.closePath();
  };
  shape();
  ctx.fillStyle = base; ctx.fill();
  if (!plain) {
    const s = nx * lx + ny * ly > 0 ? 1 : -1;     // the side the light falls on
    vraLens(x0 - nx * s * r0 * 0.5, y0 - ny * s * r0 * 0.5, x1 - nx * s * r1 * 0.5, y1 - ny * s * r1 * 0.5, rs * 0.6, VKZ_BONE_SHADE, 0.6 * a);
    vraLens(x0 + nx * s * r0 * 0.38, y0 + ny * s * r0 * 0.38, x1 + nx * s * r1 * 0.38, y1 + ny * s * r1 * 0.38, rs * 0.32, VKZ_BONE_LIT, 0.85 * a * (1 - deep));
    ctx.fillStyle = rgba(VKZ_BONE_LIT, 0.45 * a * (1 - deep));          // the swollen ends catch it too
    for (const [px, py, r] of [[x0, y0, r0], [x1, y1, r1]]) {
      ctx.beginPath(); ctx.arc(px + (lx * 0.3 + nx * s * 0.15) * r, py + (ly * 0.3 + ny * s * 0.15) * r, r * 0.38, 0, TAU); ctx.fill();
    }
  }
  shape();
  ctx.strokeStyle = rgba(VKZ_VOID, 0.75 * a); ctx.lineWidth = Math.max(0.35, rs * 0.4); ctx.stroke();
}
// a finger from its knuckle (x, y) along d: segs are its bones [length, r0, r1, shaft]; flex is
// how far each joint closes, conv how far each turns in toward the palm. Seen from above, a
// bone bending down shortens, and past a right angle runs back under the hand; the tip is
// drawn first, so the near bones lie over the ones curled under them.
function vkzFinger(x, y, d, segs, flex, conv, lx, ly, a, plain) {
  const pts = [[x, y]], cum = [];
  let c = 0;
  for (let i = 0; i < segs.length; i++) {
    c += flex[i]; d += conv;
    const pl = segs[i][0] * Math.cos(Math.min(c, Math.PI));
    x += Math.cos(d) * pl; y += Math.sin(d) * pl;
    pts.push([x, y]); cum.push(c);
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const [, r0, r1, rs] = segs[i], [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0), k = L > 0.01 ? Math.min(0.3, r0 * 0.3 / L) : 0;   // the joint's gap
    vkzBone(lerp(x0, x1, k), lerp(y0, y1, k), lerp(x1, x0, k), lerp(y1, y0, k), r0, r1, rs, lx, ly, a,
            clamp((cum[i] - 0.6) / 1.8, 0, 0.8), plain);
  }
}
/* a bone arm of the dead out of the rift at (x, y), reaching toward ang: its forearm L long out
   of the floor, its hand sz from wrist to fingertip, closing with grip (0 open, 1 a fist); a its
   strength. The back of the hand, from above: the radius and ulna, the carpals in their two
   rows, five metacarpals, and the phalanges, shortening and curling under as it closes. */
function vkzArm(x, y, ang, L, grip, sz, a) {
  if (a <= 0.01 || L <= 0.5) return;
  const H = sz, g = grip, lx = -0.55 * Math.cos(ang) - 0.83 * Math.sin(ang), ly = 0.55 * Math.sin(ang) - 0.83 * Math.cos(ang);
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const m = ctx.getTransform(), plain = Math.hypot(m.a, m.b) / (DPR || 1) * H < 16;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(L + H * 0.35, 0, H * 0.8, VKZ_CRIM, 0.4 * a);
  ctx.globalCompositeOperation = 'source-over';
  vraLens(-lx * 2 - 2, -ly * 2, L + H * 0.8 - lx * 2, -ly * 2, H * 0.17, VKZ_VOID, 0.4 * a);   // its shadow on the floor
  // the forearm: the radius on the thumb's side, broad at the wrist; the ulna, broad at the elbow
  vkzBone(0, -0.045 * H, L, -0.06 * H, 0.025 * H, 0.048 * H, 0.02 * H, lx, ly, a, 0, plain);
  vkzBone(0, 0.055 * H, L - 0.015 * H, 0.052 * H, 0.038 * H, 0.028 * H, 0.019 * H, lx, ly, a, 0, plain);
  vraLens(-3, 0, L * 0.4, 0, H * 0.1, VKZ_VOID, 0.45 * a);           // where it comes up out of the dark
  const W = L + 0.02 * H;
  // the thumb, under the rest: short and stout off the wrist's thumb side, folding in across the palm
  vkzFinger(W + 0.09 * H, -0.08 * H, -0.62 + 0.5 * g,
            [[0.21 * H, 0.034 * H, 0.036 * H, 0.025 * H], [0.15 * H, 0.03 * H, 0.026 * H, 0.02 * H], [0.11 * H, 0.025 * H, 0.014 * H, 0.016 * H]],
            [0.1, lerp(0.3, 0.8, g), lerp(0.25, 0.9, g)], 0.15 + 0.15 * g, lx, ly, a, plain);
  // the carpals: two rows of small stones
  for (const [cx, cy, r] of [[0.035, -0.06, 0.03], [0.035, -0.012, 0.028], [0.035, 0.035, 0.026], [0.045, 0.072, 0.019],
                             [0.088, -0.07, 0.024], [0.09, -0.028, 0.023], [0.092, 0.012, 0.028], [0.088, 0.055, 0.026]])
    vkzBone(W + (cx - 0.008) * H, cy * H, W + (cx + 0.008) * H, (cy + 0.004) * H, r * H, r * H * 0.9, r * H * 0.85, lx, ly, a, 0, plain);
  // the four fingers: a metacarpal out to each knuckle (drawing in as it grips), then three phalanges
  const MB = [-0.062, -0.022, 0.02, 0.058], MH = [-0.118, -0.04, 0.042, 0.112], ML = [0.37, 0.38, 0.35, 0.31];
  const PL = [[0.22, 0.13, 0.09], [0.245, 0.15, 0.1], [0.23, 0.14, 0.095], [0.18, 0.105, 0.08]], knuckles = [];
  for (let i = 0; i < 4; i++) {
    const bx = W + 0.12 * H, by = MB[i] * H, hy = lerp(MH[i], MB[i] * 1.2, 0.35 * g) * H;
    const hx = bx + Math.sqrt(Math.max(0.01, ML[i] * ML[i] * H * H - (hy - by) * (hy - by)));
    vkzBone(bx, by, hx, hy, 0.03 * H, 0.036 * H, 0.021 * H, lx, ly, a, 0, plain);
    knuckles.push([hx, hy, Math.atan2(hy - by, hx - bx)]);
  }
  // at rest the fingers hang a little curled, the little one most; each lies a touch its own way
  const REST = [0.9, 1, 1.1, 1.3], LEAN = [0.03, 0, -0.015, -0.05];
  for (let i = 0; i < 4; i++) {
    const [hx, hy, d] = knuckles[i], f = PL[i], off = i - 1.5, k = REST[i];
    vkzFinger(hx, hy, d + off * 0.05 * (1 - g) + LEAN[i],
              [[f[0] * H, 0.028 * H, 0.022 * H, 0.017 * H], [f[1] * H, 0.022 * H, 0.018 * H, 0.014 * H], [f[2] * H, 0.018 * H, 0.009 * H, 0.012 * H]],
              [lerp(0.22 * k, 1.15, g), lerp(0.32 * k, 1.55, g), lerp(0.2 * k, 1.0, g)], -off * 0.07 * g, lx, ly, a, plain);
  }
  ctx.restore();
}

/* his rage in his own shape: a phantom of him standing at (x, y), h tall, rising (0 to 1) and
   coming apart (0 to 1); its blade along ba, swept there by swing (0 to 1) turning dir. truth:
   his true form (AFTERSHOCK), the cloak thrown wide and the eye a flare. As the cut-in has him:
   the kasa, the one burning eye and the crack down from it, red cracks through him. */
function vkzSpecter(x, y, h, rise, gone, ba, swing, dir, truth) {
  const a = rise * (1 - gone);
  if (a <= 0.01) return;
  const t = uiTime, u = h, wide = truth ? 0.5 : 0.34, sw = Math.sin(t * 3.1) * 0.02;
  ctx.save();
  ctx.translate(x, y - u * (0.15 * (1 - rise) + 0.1 * gone));
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(0, -0.5 * u, u * 0.7, VKZ_CRIM, 0.25 * a);
  // the cloak, shoulders down into the floor, its hem in tatters
  ctx.beginPath();
  ctx.moveTo(-0.19 * u, -0.72 * u);
  ctx.quadraticCurveTo(-0.3 * u, -0.45 * u, (-wide + sw) * u, -0.1 * u);
  for (let i = 1; i < 8; i++) {
    const k = i / 8, hy = (i % 2 ? 0.06 : -0.03) * (1 + 0.5 * Math.sin(t * 7 + i * 1.3));
    ctx.lineTo(lerp(-wide + sw, wide + sw, k) * u, (-0.1 + hy) * u);
  }
  ctx.lineTo((wide + sw) * u, -0.1 * u);
  ctx.quadraticCurveTo(0.3 * u, -0.45 * u, 0.19 * u, -0.72 * u);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -0.75 * u, 0, 0);
  g.addColorStop(0, rgba(VKZ_CRIM, 0.6 * a)); g.addColorStop(0.65, rgba(VKZ_DEEP, 0.4 * a)); g.addColorStop(1, rgba(VKZ_DEEP, 0));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(VKZ_HOT, 0.45 * a); ctx.lineWidth = Math.max(0.8, u * 0.01); ctx.stroke();
  // the red cracks through him: what the vow costs, as in the cut-in
  ctx.strokeStyle = rgba(VKZ_PALE, 0.6 * a); ctx.lineWidth = Math.max(0.6, u * 0.007);
  ctx.beginPath();
  ctx.moveTo(-0.05 * u, -0.68 * u); ctx.lineTo(-0.09 * u, -0.55 * u); ctx.lineTo(-0.04 * u, -0.44 * u); ctx.lineTo(-0.12 * u, -0.28 * u);
  ctx.moveTo(0.08 * u, -0.62 * u); ctx.lineTo(0.13 * u, -0.5 * u); ctx.lineTo(0.09 * u, -0.37 * u);
  ctx.stroke();
  // the two tails off the collar, on the wind
  ctx.strokeStyle = rgba(VKZ_HOT, 0.5 * a); ctx.lineWidth = Math.max(0.8, u * 0.018);
  for (const [ph, L] of [[0, 0.42], [1.9, 0.34]]) {
    let px = 0.06 * u, py = -0.73 * u;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 1; i <= 8; i++) {
      const k = i / 8, an = -0.25 + 0.5 * k + 0.35 * Math.sin(k * 5 - t * 8 + ph);
      px += Math.cos(an) * L * u / 8; py += Math.sin(an) * L * u / 8; ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // the kasa: a wide cone, its brim lit
  ctx.beginPath();
  ctx.moveTo(0, -1.0 * u); ctx.quadraticCurveTo(0.2 * u, -0.93 * u, 0.39 * u, -0.84 * u);
  ctx.quadraticCurveTo(0, -0.79 * u, -0.39 * u, -0.84 * u); ctx.quadraticCurveTo(-0.2 * u, -0.93 * u, 0, -1.0 * u);
  ctx.closePath();
  ctx.fillStyle = rgba(VKZ_CRIM, 0.55 * a); ctx.fill();
  ctx.strokeStyle = rgba(VKZ_PALE, 0.65 * a); ctx.lineWidth = Math.max(0.8, u * 0.01);
  ctx.beginPath(); ctx.moveTo(0.39 * u, -0.84 * u); ctx.quadraticCurveTo(0, -0.79 * u, -0.39 * u, -0.84 * u); ctx.stroke();
  // the face in its shadow, dark; one eye burning, and the crack running down from it
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(VKZ_VOID, 0.8 * a);
  ctx.beginPath(); ctx.ellipse(0, -0.765 * u, 0.1 * u, 0.06 * u, 0, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const ex = -0.038 * u, ey = -0.772 * u;
  drawGlow(ex, ey, u * (truth ? 0.18 : 0.1), VKZ_CRIM, 0.9 * a);
  drawGlow(ex, ey, u * 0.035, VKZ_PALE, a);
  ctx.strokeStyle = rgba(VKZ_HOT, 0.85 * a); ctx.lineWidth = Math.max(0.6, u * 0.008);
  ctx.beginPath(); ctx.moveTo(ex, ey + u * 0.012); ctx.lineTo(ex + u * 0.009, ey + u * 0.04); ctx.lineTo(ex - u * 0.004, ey + u * 0.07); ctx.stroke();
  // the arm, and the blade swept along its stroke
  const ang = lerp(ba - dir * 1.4, ba, vraOut(swing)), sx = -0.17 * u, sy = -0.66 * u;
  const hx = sx + Math.cos(ang) * 0.2 * u, hy = sy + Math.sin(ang) * 0.2 * u;
  ctx.strokeStyle = rgba(VKZ_CRIM, 0.6 * a); ctx.lineWidth = Math.max(1.2, u * 0.045);
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  if (swing < 1) vraBrushArc(sx, sy, 0.62 * u, ba - dir * 1.4, dir * 1.4 * vraOut(swing), u * 0.04, VKZ_HOT, 0.55 * a * (1 - swing * 0.5));
  const bx = hx + Math.cos(ang) * 0.85 * u, by = hy + Math.sin(ang) * 0.85 * u;
  vraLens(hx, hy, bx, by, Math.max(1, u * 0.022), VKZ_HOT, 0.9 * a);
  vraLens(hx, hy, bx, by, Math.max(0.4, u * 0.008), VKZ_PALE, a);
  ctx.restore();
}

/* -------------------------------- the rift -------------------------------- */
/* the rift a vow stroke tears, as two jagged edges either side of it (A on the +normal side);
   seeded, so the floor and the light see the same one */
function vkzRift(s, seed, open, wmax) {
  const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1, dx = (s.x2 - s.x1) / L, dy = (s.y2 - s.y1) / L, nx = -dy, ny = dx;
  const n = clamp(Math.round(L / 9), 8, 60), A = [], B = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, env = Math.pow(Math.sin(Math.PI * u), 0.55), w = wmax * env * open;
    const wob = (vraH(seed + 13 + i * 0.73) - 0.5) * 4;           // it wanders off the line a little
    const cx = s.x1 + dx * L * u + nx * wob, cy = s.y1 + dy * L * u + ny * wob;
    const ja = 0.55 + 0.45 * vraH(seed + i * 1.37), jb = 0.55 + 0.45 * vraH(seed + 71 + i * 2.11);
    A.push([cx + nx * w * ja, cy + ny * w * ja]);
    B.push([cx - nx * w * jb, cy - ny * w * jb]);
  }
  return { A, B, n, L, nx, ny };
}
function vkzPoly(pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
}
// cracks run off the rift's edges into the floor, lit crimson in their depths
function vkzCracks(R, seed, open, a) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const [E, sd] of [[R.A, 1], [R.B, -1]]) {
    for (let i = 2; i < E.length - 2; i += 3) {
      const h = vraH(seed + i * 3.1 + sd * 17);
      if (h < 0.35) continue;
      let [x, y] = E[i], an = Math.atan2(R.ny * sd, R.nx * sd) + (h - 0.65) * 1.6;
      const L = (6 + 14 * vraH(seed + i * 5.3 + sd)) * open;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 3; j++) { an += (vraH(seed + i + j * 9.7 + sd * 3) - 0.5) * 1.1; x += Math.cos(an) * L / 3; y += Math.sin(an) * L / 3; ctx.lineTo(x, y); }
      ctx.strokeStyle = rgba(VKZ_VOID, 0.8 * a); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.strokeStyle = rgba(VKZ_CRIM, 0.55 * a); ctx.lineWidth = 0.6; ctx.stroke();
    }
  }
  ctx.restore();
}
// the dead reaching up out of it, each hand on its own round: out, clawing, back down, a wait
function vkzRiftHands(c, s, si, R, open, a) {
  const n = Math.max(1, Math.round(R.L / 60)), life = c.t - s.at;
  for (let i = 0; i < n; i++) {
    const h = vraH(c.id * 13.1 + si * 5.7 + i * 2.3), per = 1.8 + 1.2 * vraH(h * 91 + 3), ph = (life / per + h) % 1;
    const k = ph < 0.18 ? vraOut(ph / 0.18) : ph < 0.55 ? 1 : ph < 0.75 ? 1 - vraEase((ph - 0.55) / 0.2) : 0;
    if (k <= 0.02) continue;
    const sd = i % 2 ? 1 : -1, j = clamp(Math.round((i + 0.3 + 0.4 * h) / n * R.n), 1, R.n - 1), E = sd > 0 ? R.A : R.B;
    const ang = Math.atan2(R.ny * sd, R.nx * sd) + (h - 0.5) * 0.9, grip = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(life * 5 + h * 20));
    vkzArm(E[j][0] - R.nx * sd * 3, E[j][1] - R.ny * sd * 3, ang, 4 + 12 * k, grip, (22 + 8 * h) * (0.6 + 0.4 * k), k * a * open);
  }
}

/* --------------------------- the floor: Z's floor layer --------------------------- */
// a vow cleave's rifts: the floor scorched, cracked and torn open, the dead reaching out
function vkzFloor(c) {
  const fade = vraEase(clamp((c.end - c.t) / 1, 0, 1));
  if (fade <= 0) return;
  c.strokes.forEach((s, si) => {
    if (!s.done) return;
    const open = vkzOpen(c, s), seed = c.id * 31.7 + si * 7.3, wmax = vkzWide(c, s), R = vkzRift(s, seed, open, wmax);
    vraLens(s.x1, s.y1, s.x2, s.y2, wmax * 2.4 * open, VKZ_VOID, 0.32 * fade);         // the floor scorched round it
    vkzCracks(R, seed, open, fade);
    vkzPoly(R.A);                                                                   // the void
    for (let i = R.B.length - 1; i >= 0; i--) ctx.lineTo(R.B[i][0], R.B[i][1]);
    ctx.closePath();
    ctx.fillStyle = rgba(VKZ_VOID, 0.96 * fade); ctx.fill();
    vraLens(s.x1, s.y1, s.x2, s.y2, wmax * 0.42 * open, VKZ_DEEP, 0.9 * fade);          // crimson, far down
    vkzRiftHands(c, s, si, R, open, fade);
  });
}
// what a blast leaves on the floor: a scorch, and cracks thrown out of it, lit from under
// (first, what the vow's X and C leave there: vkxFloor and vkcFloor, in their own blocks)
function vkzFloorFx() {
  vkzStep();
  if (typeof vkxFloor === 'function') vkxFloor();
  if (typeof vkcFloor === 'function') vkcFloor();
  const t = uiTime;
  for (const b of VKZ.blasts) {
    const age = t - b.at, a = 1 - vraEase((age - 0.8) / 0.8);
    if (a <= 0) continue;
    const R = b.r * 0.32 * vraOut(age / 0.12);
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, R * 1.8);
    g.addColorStop(0, rgba(VKZ_VOID, 0.85 * a)); g.addColorStop(0.55, rgba(VKZ_VOID, 0.5 * a)); g.addColorStop(1, rgba(VKZ_VOID, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.8, 0, TAU); ctx.fill();
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      let an = (i + vraH(b.id * 3 + i)) / 9 * TAU, x = b.x + Math.cos(an) * R * 0.5, y = b.y + Math.sin(an) * R * 0.5;
      const L = b.r * (0.4 + 0.45 * vraH(b.id * 7 + i)) * vraOut(age / 0.18);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { an += (vraH(b.id + i * 5 + j * 1.7) - 0.5) * 0.9; x += Math.cos(an) * L / 4; y += Math.sin(an) * L / 4; ctx.lineTo(x, y); }
      ctx.strokeStyle = rgba(VKZ_VOID, 0.85 * a); ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = rgba(VKZ_CRIM, 0.7 * a); ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
  }
}

/* ------------------------ the strokes: Z's additive pass ------------------------ */
// the rift's own light: crimson down in it, its torn edges lit, a heat that cools
function vkzRiftLight(c, s, si, fade) {
  const t = uiTime, open = vkzOpen(c, s), wmax = vkzWide(c, s), age = c.t - s.at;
  const fl = 0.75 + 0.25 * Math.sin(t * 11 + si * 2.3 + c.id) * Math.sin(t * 4.7 + si);
  vraLens(s.x1, s.y1, s.x2, s.y2, wmax * 0.55 * open, VKZ_CRIM, 0.55 * fl * fade);
  vraLens(s.x1, s.y1, s.x2, s.y2, wmax * 0.18 * open, VKZ_HOT, 0.5 * fl * fade);
  const R = vkzRift(s, c.id * 31.7 + si * 7.3, open, wmax);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(VKZ_HOT, 0.35 * fl * fade); ctx.lineWidth = 1;
  vkzPoly(R.A); ctx.stroke();
  vkzPoly(R.B); ctx.stroke();
  const heat = Math.exp(-age * 2.5);
  if (heat > 0.05) drawGlow((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, R.L * 0.38, VKZ_CRIM, 0.3 * heat * fade);
}
// a stroke drawn across: crimson round a white-hot core, black smoke thrown off either side
// (FAULT LINE's path rips open slower, end to end)
function vkzStroke(c, s, si) {
  const age = c.t - s.at;
  if (age < 0 || age > VKZ_STROKE) return;
  const q = age / VKZ_STROKE, a = 1 - q, run = s.fault ? 0.14 : 0.05;
  const head = vraOut(age / run), tail = vraEase((age - run) / (VKZ_STROKE - run));
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, over = s.fault ? 0 : L * 0.1;
  const X1 = s.x1 - ux * over, Y1 = s.y1 - uy * over, X2 = s.x2 + ux * over, Y2 = s.y2 + uy * over;
  const hx = lerp(X1, X2, head), hy = lerp(Y1, Y2, head), tx = lerp(X1, X2, tail), ty = lerp(Y1, Y2, tail);
  const big = (c.vow.n === 'AFTERSHOCK' ? 1.5 : 1.15) * (s.fault ? 0.9 : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  for (const sd of [-1, 1]) {
    const o = (6 + 10 * q) * big * sd;
    vraLens(tx - uy * o, ty + ux * o, hx - uy * o * 0.4, hy + ux * o * 0.4, 6 * big * a, VKZ_VOID, 0.55 * a);
  }
  ctx.restore();
  drawGlow((tx + hx) / 2, (ty + hy) / 2, L * 0.42, VKZ_CRIM, 0.4 * a * big);
  vraLens(tx, ty, hx, hy, 15 * big * (1 - q * 0.5), VKZ_CRIM, 0.45 * a);
  vraLens(tx, ty, hx, hy, 6 * big * (1 - q * 0.4), VKZ_HOT, 0.9 * a);
  vraLens(tx, ty, hx, hy, 2 * big, VKZ_PALE, a);
  if (head < 1) { drawGlow(hx, hy, 26 * big, VKZ_PALE, 0.8); drawGlow(hx, hy, 46 * big, VKZ_CRIM, 0.5); }
}
// the hull's own cut with each stroke of the cross: Z's crescent, black and crimson
function vkzHullSlash(c, s, si) {
  if (s.fault) return;
  const age = c.t - s.at + 0.06;
  if (age < 0 || age > 0.3) return;
  const q = age / 0.3, a = 1 - vraEase(q), prog = vraOut(age / 0.08);
  const dir = si % 2 ? -1 : 1, arc = 2.1, reach = P.r + 28, th = reach * 0.34;
  const a0 = c.ang - dir * arc / 2 + (s.a - c.ang) * 0.35, a1 = a0 + dir * arc * prog, N = 20;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.beginPath();
  for (let i = 0; i <= N; i++) { const an = lerp(a0, a1, i / N); ctx[i ? 'lineTo' : 'moveTo'](Math.cos(an) * reach, Math.sin(an) * reach); }
  for (let i = N; i >= 0; i--) {
    const k = i / N, an = lerp(a0, a1, k), r = reach - th * Math.pow(k, 1.5) * (1 - q * 0.5);
    ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r);
  }
  ctx.closePath();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(VKZ_VOID, 0.85 * a); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, reach - th, 0, 0, reach);
  g.addColorStop(0, 'rgba(190,18,60,0)'); g.addColorStop(1, rgba(VKZ_CRIM, 0.6 * a));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(si % 2 ? VKZ_PALE : VKZ_HOT, 0.95 * a); ctx.lineWidth = si % 2 ? 2.6 : 2;
  ctx.beginPath(); ctx.arc(0, 0, reach, Math.min(a0, a1), Math.max(a0, a1)); ctx.stroke();
  drawGlow(Math.cos(a1) * reach, Math.sin(a1) * reach, 18, VKZ_PALE, 0.7 * a);
  ctx.restore();
}
// the cross closing: one great face let out of it, rising, and a ring
function vkzScream(x, y, age, k) {
  if (age < 0 || age > 0.6) return;
  const q = age / 0.6, a = vraOut(age / 0.05) * (1 - vraEase(q)), w = (14 + 26 * vraOut(q)) * k;
  vkzFace(x, y - (6 + 34 * vraOut(q)) * k, -Math.PI / 2, w * (1.5 + 1.4 * q), w, 1, a);
  ctx.strokeStyle = rgba(VKZ_HOT, 0.7 * (1 - q)); ctx.lineWidth = 2.5 * (1 - q) + 0.5;
  ctx.beginPath(); ctx.arc(x, y, (14 + 80 * vraOut(q)) * k, 0, TAU); ctx.stroke();
}
// a vow cleave, in Z's additive pass: the wind, the rifts' light, his phantom, the strokes, the cross's heart
function vkzCleave(c) {
  const t = uiTime, main = vkzMain(c), last = main[main.length - 1];
  const fade = vraEase(clamp((c.end - c.t) / 1, 0, 1)), k = c.vow.n === 'AFTERSHOCK' ? 1.6 : 1;
  if (c.t < last.at) {                            // the wind: the cross marked in crimson hairlines before it lands
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineWidth = 1;
    c.strokes.forEach((s, si) => {
      if (s.done || c.t >= s.at) return;
      const kk = vraOut(clamp((c.t - si * 0.03) / (LUNAR_WIND * 0.6), 0, 1)), soon = clamp(1 - (s.at - c.t) / 0.12, 0, 1);
      ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 40;
      ctx.strokeStyle = rgba(VKZ_HOT, 0.25 + 0.4 * soon);
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(lerp(s.x1, s.x2, kk), lerp(s.y1, s.y2, kk)); ctx.stroke();
      ctx.setLineDash([]);
      drawGlow(s.x1, s.y1, 8, VKZ_CRIM, 0.5);
    });
    ctx.restore();
  }
  c.strokes.forEach((s, si) => { if (s.done) vkzRiftLight(c, s, si, fade); });
  if (c.vow.n !== 'AFTERSHOCK') {                 // his phantom at the cross (AFTERSHOCK's is his true form, raised by its blast)
    const end = last.at + 0.12;
    if (c.t < end + 0.36) {
      let cur = main[0];
      for (const s of main) if (c.t >= s.at - 0.02) cur = s;
      const i = main.indexOf(cur);
      vkzSpecter(c.x, c.y + 10, 66, vraOut(c.t / 0.08), vraEase((c.t - end) / 0.36), cur.a,
                 clamp((c.t - cur.at + 0.02) / 0.06, 0, 1), i % 2 ? -1 : 1, false);
    }
  }
  c.strokes.forEach((s, si) => { vkzHullSlash(c, s, si); vkzStroke(c, s, si); });
  if (last.done) {
    vkzScream(c.x, c.y, c.t - last.at, k);
    const beat = Math.pow(0.5 + 0.5 * Math.sin(t * 7.5 + c.id), 4);
    drawGlow(c.x, c.y, (16 + 8 * beat) * k, VKZ_CRIM, (0.25 + 0.3 * beat) * fade);
  }
}

/* -------------------------- the dead's own layer --------------------------
   Stepped once a frame by whichever runs first (vkzFloorFx, vkzWorld). */
function vkzStep() {
  const t = uiTime;
  if (VKZ.stepAt === t) return VKZ.dt;
  let dt = t - VKZ.stepAt; VKZ.stepAt = t;
  if (!(dt > 0 && dt < 0.1)) dt = 0.016;
  VKZ.dt = dt;
  for (let i = VKZ.souls.length - 1; i >= 0; i--) {
    const s = VKZ.souls[i];
    s.t += dt;
    if (s.t >= s.life) { VKZ.souls.splice(i, 1); continue; }
    const d = Math.pow(s.drag, dt), cs = Math.cos(s.curl * dt), sn = Math.sin(s.curl * dt);
    const vx = (s.vx * cs - s.vy * sn) * d, vy = (s.vx * sn + s.vy * cs) * d - s.rise * dt;
    s.vx = vx; s.vy = vy; s.x += vx * dt; s.y += vy * dt;
  }
  for (const c of roninCleaves) {
    if (!c.vow || !c.vow.tear) continue;
    if (c.end - c.t > 0.8) for (const s of c.strokes) {     // the dead keep rising out of the rift
      if (!s.done) continue;
      const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (rnd() < dt * L / 160) {
        const u = rnd(0.9, 0.1), side = rnd() < 0.5 ? 1 : -1;
        vkzSoul(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), s.a + side * Math.PI / 2 + rnd(0.5, -0.5), rnd(40, 18),
                { w: rnd(9, 6), life: rnd(1.2, 0.8), rise: 26, drag: 0.4, a: 0.85 });
      }
    }
    for (const id in c.vow.cut) {                  // each of the tear's cuts: a hand out of the rift closes on the body
      const key = c.id + ':' + id, at = c.vow.cut[id];
      if (VKZ.cut.get(key) === at) continue;
      VKZ.cut.set(key, at);
      vkzSeize(c, id);
    }
  }
  if (VKZ.cut.size > 300) {
    const live = new Set(roninCleaves.map(c => c.id + ':'));
    for (const k of VKZ.cut.keys()) if (!live.has(k.slice(0, k.indexOf(':') + 1))) VKZ.cut.delete(k);
  }
  return dt;
}
// a body the tear cut: an arm out of the rift at its nearest point, reaching for it
function vkzSeize(c, id) {
  const e = enemies.find(q => String(q.id) === String(id));
  if (!e || e.dead) return;
  for (const g of VKZ.grabs) if (g.e === e && uiTime - g.at < 0.42) return;   // one hand on it at a time
  let best = null, bd = Infinity;
  for (const s of c.strokes) {
    if (!s.done) continue;
    const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L2 = dx * dx + dy * dy || 1;
    const u = clamp(((e.x - s.x1) * dx + (e.y - s.y1) * dy) / L2, 0.05, 0.95);
    const x = s.x1 + dx * u, y = s.y1 + dy * u, d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) { bd = d; best = { x, y, n: s.a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2 }; }
  }
  if (!best) return;
  if (VKZ.grabs.length > 16) VKZ.grabs.shift();
  VKZ.grabs.push({ x: best.x, y: best.y, n: best.n, e, at: uiTime, sz: 24 + e.r * 0.8 });
}
function vkzGrabs() {
  const t = uiTime;
  for (let i = VKZ.grabs.length - 1; i >= 0; i--) {
    const g = VKZ.grabs[i], e = g.e, age = t - g.at;
    if (age > 0.5) { VKZ.grabs.splice(i, 1); continue; }
    const reach = vraOut(age / 0.1), grip = clamp((age - 0.07) / 0.12, 0, 1), back = vraEase((age - 0.3) / 0.2);
    let dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy);
    if (d < 4) { dx = Math.cos(g.n); dy = Math.sin(g.n); d = 1; }   // right on the rift: up out of it, over the body
    // the wrist stops short, so the palm comes down over the body
    vkzArm(g.x, g.y, Math.atan2(dy, dx), Math.max(4, d - g.sz * 0.35) * reach * (1 - 0.7 * back), grip, g.sz, 1 - back);
    if (grip > 0) drawGlow(e.x, e.y, e.r * 2.2, VKZ_CRIM, 0.55 * grip * (1 - back));
  }
}
// a body cut by a vow stroke: the cut through it, crimson round white
function vkzHits() {
  const t = uiTime;
  for (let i = VKZ.hits.length - 1; i >= 0; i--) {
    const h = VKZ.hits[i], q = (t - h.at) / 0.34;
    if (q >= 1) { VKZ.hits.splice(i, 1); continue; }
    const a = 1 - q, c = Math.cos(h.a), s = Math.sin(h.a), L = (h.r * 2 + 16) * vraOut(q / 0.3);
    drawGlow(h.x, h.y, h.r * 2.4, VKZ_CRIM, 0.55 * a);
    vraLens(h.x - c * L, h.y - s * L, h.x + c * L, h.y + s * L, 4 * a + 0.5, VKZ_HOT, 0.85 * a);
    vraLens(h.x - c * L, h.y - s * L, h.x + c * L, h.y + s * L, 1.2, VKZ_PALE, a);
  }
}
// SHATTER: the floor at the cross breaks into shards, thrown up and out, lit from the rift under them
function vkzShards(b, age) {
  if (age > 0.9) return;
  const a = 1 - vraEase((age - 0.5) / 0.4);
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const h = vraH(b.id * 17.3 + i), an = (i + h * 0.6) / 12 * TAU, d = 10 + b.r * (0.5 + 0.5 * vraH(b.id + i * 3.3)) * vraOut(age / 0.9);
    const lift = Math.sin(Math.min(1, age / 0.9) * Math.PI) * 18 * (0.5 + h);
    const s = (8 + 9 * vraH(b.id * 5 + i)) * (1 - 0.3 * age), rot = an + age * (4 + 6 * h) * (h > 0.5 ? 1 : -1);
    ctx.save();
    ctx.translate(b.x + Math.cos(an) * d, b.y + Math.sin(an) * d - lift); ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.4); ctx.lineTo(s * 0.5, -s * 0.55); ctx.lineTo(s * 0.7, s * 0.25); ctx.lineTo(-s * 0.2, s * 0.6); ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba('#0b0d14', 0.95 * a); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(VKZ_HOT, 0.8 * a); ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}
// a blast: its flash and ring going out (the dead in it are souls, thrown by roninVowBlastFx);
// SHATTER's shards; AFTERSHOCK's true form rising behind him
function vkzBlasts() {
  const t = uiTime;
  for (let i = VKZ.blasts.length - 1; i >= 0; i--) {
    const b = VKZ.blasts[i], age = t - b.at;
    if (age > 1.6) { VKZ.blasts.splice(i, 1); continue; }
    if (age < 0.45) {
      const a = 1 - vraEase(age / 0.45), R = b.r * vraOut(age / 0.3);
      drawGlow(b.x, b.y, b.r * (0.5 + 0.8 * vraOut(age / 0.12)), VKZ_CRIM, 0.7 * a);
      drawGlow(b.x, b.y, b.r * 0.22, VKZ_PALE, 0.9 * Math.exp(-age * 12));
      ctx.strokeStyle = rgba(VKZ_HOT, 0.85 * a); ctx.lineWidth = 6 * a + 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(VKZ_PALE, 0.7 * a); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, R - 3), 0, TAU); ctx.stroke();
    }
    if (b.tag === 'SHATTER') vkzShards(b, age);
    if (b.tag === 'AFTERSHOCK' && age < 1.4)
      vkzSpecter(b.x, b.y + 14, 220, vraOut(age / 0.25), vraEase((age - 0.8) / 0.6), -Math.PI / 2 + 0.55, 1, 1, true);
  }
}
// the dead's own layer, over the bodies: the cuts, the souls, the hands seizing, the blasts
function vkzWorld() {
  vkzStep();
  vkzHits();
  vkzSouls();
  vkzGrabs();
  vkzBlasts();
  if (typeof vksAfter === 'function') vksAfter();   // SKY CLEAR's price, which outlives the vow
}

/* ------------------------------- the screen ------------------------------- */
// a ragged black brush stroke, the plate under a name
function vkzBrush(x0, y, w, h, seed, a) {
  const n = 14;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const u = i / n, e = u < 0.06 || u > 0.94 ? h * 0.25 : 0; ctx.lineTo(x0 + w * u, y - h / 2 + e + (vraH(seed + i) - 0.5) * 4); }
  for (let i = n; i >= 0; i--) { const u = i / n, e = u < 0.06 || u > 0.94 ? h * 0.25 : 0; ctx.lineTo(x0 + w * u + 3, y + h / 2 - e + (vraH(seed + 40 + i) - 0.5) * 4); }
  ctx.closePath();
  ctx.fillStyle = rgba(VKZ_VOID, 0.82 * a); ctx.fill();
}
// a vow move's name: brushed on over where it landed, its kanji on a crimson seal, then burnt off
function vkzNames() {
  const t = uiTime;
  for (let i = VKZ.names.length - 1; i >= 0; i--) {
    const nm = VKZ.names[i], q = (t - nm.at) / 1.6;
    if (q >= 1) { VKZ.names.splice(i, 1); continue; }
    const p = vraToScreen(nm.x, nm.y), y = p.y - 58 * camZoom - 10 * vraOut(q), kj = VKZ_KANJI[nm.n] || '';
    const inK = vraOut(q / 0.1), a = 1 - vraEase((q - 0.7) / 0.3), ls = (0.32 + 0.25 * (1 - inK)) + 'em';
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = '700 15px ' + VRA_DISP; ctx.letterSpacing = ls;
    const tw = ctx.measureText(nm.n).width;
    ctx.letterSpacing = '0em'; ctx.font = '900 13px ' + VKZ_JP;
    const kw = kj ? ctx.measureText(kj).width + 10 : 0, w = tw + kw + 34, x0 = p.x - w / 2;
    ctx.beginPath(); ctx.rect(x0 - 6, y - 22, (w + 12) * inK, 44); ctx.clip();
    vkzBrush(x0, y, w, 26, nm.at * 10, a);
    if (kj) {
      ctx.fillStyle = rgba(VKZ_CRIM, 0.95 * a); ctx.fillRect(x0 + 12, y - 9, kw - 2, 18);
      ctx.fillStyle = rgba(VKZ_BONE, a); ctx.textAlign = 'center';
      ctx.fillText(kj, x0 + 12 + (kw - 2) / 2, y + 1);
    }
    ctx.font = '700 15px ' + VRA_DISP; ctx.letterSpacing = ls; ctx.textAlign = 'left';
    ctx.shadowColor = rgba(VKZ_CRIM, 0.95 * a); ctx.shadowBlur = 14;
    ctx.fillStyle = rgba(VKZ_BONE, a);
    ctx.fillText(nm.n, x0 + 16 + kw, y + 1);
    ctx.shadowBlur = 0; ctx.letterSpacing = '0em';
    ctx.fillStyle = rgba(VKZ_CRIM, 0.9 * a); ctx.fillRect(x0, y + 14, w, 1);
    ctx.restore();
  }
}
// the screen: the room closing in on the cross while it winds; a crimson blink for each
// stroke, and a hairline across the whole screen as the cross closes (and, first, the vow's
// X at speed: vkxScreen, in its own block)
function vkzScreen() {
  if (typeof vkxScreen === 'function') vkxScreen();
  const t = uiTime, wq = (t - VKZ.windAt) / 0.3;
  ctx.save();
  if (wq >= 0 && wq < 1) {
    const a = vraOut(wq / 0.3) * (1 - vraEase(wq)), p = vraToScreen(VKZ.windX, VKZ.windY), R = Math.max(W, H);
    const g = ctx.createRadialGradient(p.x, p.y, 60 * camZoom, p.x, p.y, R * 0.8);
    g.addColorStop(0, 'rgba(10,2,5,0)'); g.addColorStop(1, rgba(VKZ_DEEP, 0.45 * a));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = VKZ.flashes.length - 1; i >= 0; i--) {
    const f = VKZ.flashes[i], age = t - f.at;
    if (age > 0.5) { VKZ.flashes.splice(i, 1); continue; }
    if (age < 0.08) { ctx.fillStyle = rgba(VKZ_CRIM, (f.big ? 0.2 : 0.1) * (1 - age / 0.08)); ctx.fillRect(0, 0, W, H); }
    if (!f.big || f.blast) continue;
    const q = age / 0.5, a = 1 - q, p = vraToScreen(f.x, f.y), hh = 0.8 + 6 * (1 - q) * (1 - q), ext = Math.hypot(W, H) * vraOut(q * 3);
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(f.a);
    ctx.fillStyle = rgba(VKZ_CRIM, 0.55 * a); ctx.fillRect(-ext, -hh * 2, ext * 2, hh * 4);
    ctx.fillStyle = rgba(VKZ_PALE, 0.9 * a); ctx.fillRect(-ext, -hh * 0.5, ext * 2, hh);
    ctx.restore();
  }
  ctx.restore();
  vkzNames();
}

/* ------------------------------- the moments ------------------------------- */
// Z pressed in the vow: the room closes in, and the floor smokes where his phantom will rise
function vkzCleaveFx(c) {
  VKZ.windAt = uiTime; VKZ.windX = c.x; VKZ.windY = c.y;
  vraInk(P.x, P.y, 6, 80, 6, 0.5);
  vraSparks(P.x, P.y, 8, VKZ_HOT, 220, c.ang, 0.6, 0.25, 1.1);
  vraEmbers(c.x, c.y, 8, VKZ_CRIM, 50, 0.7, 1.1);
  vraInk(c.x, c.y, 8, 120, 7, 0.6);
}
// a stroke lands: sparks off it, the dead torn loose along it, the phantom coming apart as the cross closes
function vkzStrokeFx(c, s) {
  const main = vkzMain(c), closing = s === main[main.length - 1];
  const L = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1, n = Math.max(6, Math.round(L / 16));
  for (let k = 0; k < n; k++) {
    const u = (k + rnd()) / n;
    vraSparks(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), 1, rnd() < 0.3 ? VKZ_PALE : VKZ_HOT, 220, s.a + (rnd() < 0.5 ? 1 : -1) * Math.PI / 2, 0.8, 0.3, 1.1);
  }
  vraSparks(s.x2, s.y2, closing ? 14 : 8, VKZ_HOT, 400, s.a, 0.5, 0.35, 1.4);
  const m = Math.max(3, Math.round(L / (s.fault ? 55 : 70)));
  for (let k = 0; k < m; k++) {                   // the dead, flung off either side of the cut
    const u = (k + 0.2 + 0.6 * rnd()) / m, side = k % 2 ? 1 : -1;
    vkzSoul(lerp(s.x1, s.x2, u), lerp(s.y1, s.y2, u), s.a + side * (Math.PI / 2 - 0.5), rnd(150, 90), { w: rnd(12, 8), life: rnd(0.9, 0.6), drag: 0.25 });
  }
  vraInk(s.x2, s.y2, 4, 100, 5, 0.45);
  if (s.fault) vraInk(lerp(s.x1, s.x2, 0.5), lerp(s.y1, s.y2, 0.5), 6, 90, 6, 0.6);
  VKZ.flashes.push({ at: uiTime, big: closing, x: c.x, y: c.y, a: s.a });
  if (closing) {
    vraSparks(c.x, c.y, 24, VKZ_PALE, 440, 0, TAU, 0.4, 1.5);
    vraEmbers(c.x, c.y, 16, VKZ_CRIM, 120, 1, 1.3);
    if (c.vow.n !== 'AFTERSHOCK') for (let k = 0; k < 5; k++)    // his phantom comes apart into the dead
      vkzSoul(c.x + rnd(14, -14), c.y - rnd(60, 20), -Math.PI / 2 + rnd(0.9, -0.9), rnd(120, 70), { w: rnd(12, 8), life: rnd(1, 0.7), drag: 0.3, rise: 20 });
    shake(0.42);
  } else shake(0.22);
}
// a body cut by it: the cut through it, and its soul dragged out of it along the stroke
function vkzHitFx(e, c, s) {
  VKZ.hits.push({ x: e.x, y: e.y, r: e.r, a: s.a, at: uiTime });
  if (VKZ.hits.length > 32) VKZ.hits.shift();
  const w = RKA.wound.get(e);                     // the wound it takes runs along the cut, as Z's does
  if (w) w.ang = s.a; else RKA.wound.set(e, { ang: s.a, at: uiTime - 1 });
  vkzSoul(e.x, e.y, s.a + (rnd() < 0.5 ? 0.35 : -0.35), rnd(260, 180), { w: Math.max(8, e.r * 0.85), life: 0.75, drag: 0.08 });
  vraSparks(e.x, e.y, 10, VKZ_PALE, 340, s.a, 0.35, 0.25, 1.3);
  vraSparks(e.x, e.y, 8, VKZ_CRIM, 220, s.a + Math.PI, 0.9, 0.35, 1.2);
  vraInk(e.x, e.y, 4, 110, 5, 0.45);
}

/* ---------------------- in place of the placeholders' ---------------------- */
// rkvTears: the tears are drawn by vkzFloor and vkzCleave now; this is the dead's own layer
function rkvTears() { vkzWorld(); }
function roninVowNameFx(n, x, y) {
  VKZ.names.push({ n, x, y, at: uiTime });
  if (VKZ.names.length > 4) VKZ.names.shift();
}
// a vow blast throws a ring of the dead out of it (C's two have their own look: vkcBlastFx, in C's block)
function roninVowBlastFx(x, y, r, tag) {
  if (typeof vkcBlastFx === 'function' && vkcBlastFx(x, y, r, tag)) return;
  VKZ.blasts.push({ x, y, r, tag, at: uiTime, id: ++VKZ.blastN });
  if (VKZ.blasts.length > 8) VKZ.blasts.shift();
  const n = tag === 'AFTERSHOCK' ? 18 : 12;
  for (let i = 0; i < n; i++) {
    const an = i / n * TAU + rnd(0.2, -0.2);
    vkzSoul(x + Math.cos(an) * 14, y + Math.sin(an) * 14, an, r * rnd(2.6, 2.1), { w: rnd(13, 9), life: rnd(0.75, 0.6), drag: 0.2 });
  }
  vraSparks(x, y, 26, VKZ_PALE, 520, 0, TAU, 0.4, 1.5);
  vraEmbers(x, y, 18, VKZ_CRIM, 140, 1, 1.4);
  vraInk(x, y, 10, 160, 9, 0.7);
  VKZ.flashes.push({ at: uiTime, big: true, blast: true, x, y, a: 0 });
  shake(tag === 'AFTERSHOCK' ? 0.6 : 0.42);
}
/* ======================= end of V: LAST VOW — the vow's Z ======================= */
