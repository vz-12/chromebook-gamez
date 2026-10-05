/* ================ V: LAST VOW, the cut-in (lifted into index.html) ================
   Replaces drawRoninVowScreen in "V: LAST VOW (placeholders)"; roninVowFx
   gains a call to vkvBegin(), and vow-z.js puts vkzScreen() at the top of
   drawRoninVowScreen (lift.mjs does both). Everything else here is new, named vkv / VKV.
   It runs 4.75 s from the press to the cut, so the logic's VOW_T_CUT goes
   from 1.6 to 4.75.

   The lore (RONIN-V-PLAN.md): he is undead; he left his master for a goal of
   his own, someone who mattered died on the way, and he guards their grave.
   V is his last resort: everything he has, given to keeping it.

   A memory first, gold and faded: the tree on the bank in flower, someone
   under it with a red umbrella waving him off, and him walking away without
   looking back. They go to petals, the umbrella falls, and the memory burns
   away to its red. The red is the cloth on the grave post, in the dark. He
   kneels in still water under his intro's moon with his head against it.
   He looks up; the eye opens, and a crack runs down from it, the tear the
   dead can't shed. もう離れない: "I won't leave you again." 誓 burns into the
   post, the moon bleeds, cracks of red open in him, and he lifts it. The
   night holds; he drives it down; and on the cut the frame breaks from where
   it struck, onto the room with the grave standing in it.

   Beats, in seconds from the press (vowPhase().t), all in VKV_T:
     0      the room stills; ink wipes the memory on, a gold edge leading
     0.75   they go to light and petals, from the top down (to 1.3); the
            umbrella, unheld, falls (1.02 to 1.42)
     0.95   the memory burns in to the umbrella (to 1.7), the present under it
     1.95   the camera draws back off the cloth to him (to 2.85): his grief
     3.0    he looks up (to 3.35); the eye (3.05), its crack (3.22); the line
            (3.08); 誓 (3.35); the moon bleeds (3.25 to 3.83)
     3.67   he lifts the post (to 4.27); cracks open in him; the name (3.9)
     4.22   the night slows to a fifth; 4.35 he draws it higher; 4.5 the drive
     4.62   the water breaks
     4.75   the cut (VOW_T_CUT): the plate kept as it stands (vkvCache) and
            broken from the post, 22 pieces falling away over 0.5 s
   Everything is a function of time, nothing is stepped, so it holds under the
   pause and the plate on the cut is the same every time. Units are the
   intro's: 100 between the bars, cameras over layers at depth.
--------------------------------------------------------------------------- */
const VKV_NAME = 'LAST VOW', VKV_NAME_JP = '最後の誓い', VKV_KANJI = '誓';
const VKV_SAY = 'もう離れない', VKV_SAY_EN = "I won't leave you again.";
const VKV_T = {
  in: 0.4,
  fade0: 0.75, fade1: 1.3, drop0: 1.02, drop1: 1.42, burn0: 0.95, burn1: 1.7,
  pull0: 1.95, pull1: 2.85,
  look0: 3.0, look1: 3.35, eye0: 3.05, eye1: 3.37, tear0: 3.22, tear1: 3.6,
  say0: 3.08, sayOff: 4.15, brand0: 3.35, brand1: 3.67, blood0: 3.25, blood1: 3.83,
  lift0: 3.67, lift1: 4.27, name0: 3.9,
  hold: 4.22, wind0: 4.35, drive0: 4.5, hit: 4.62
};
const VKV_S = 0.8, VKV_FX = -18, VKV_GY = 3, VKV_HZ = -2;     // his scale and where he kneels; the far shore
const VKV_POST = { x0: 16, x1: 21, L: 50, w: 5.4, grip: [24, 30] };   // the grave post: at his head while he grieves, out to x1 as he lifts it
const VKV_MOON = { x: -6, y: -36, r: 27, d: 0.15 };           // the intro's moon, behind his raised hands
const VKV_JP = "'Yu Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'Noto Serif CJK JP', serif";
const VKV_CLOUDS = [                                          // ink strokes at depth 0.5
  { y: -30, n: 8, gap: 38, L: 64, w: 2.2, v: 3, a: 0.6, col: '#05060a', s: 11 },
  { y: -52, n: 7, gap: 44, L: 70, w: 1.6, v: 2, a: 0.4, col: '#0a0e1c', s: 23 },
  { y: -13, n: 9, gap: 34, L: 76, w: 1.4, v: 4, a: 0.5, col: '#070912', s: 37 }
];
const VKV_TAILS = [[0, 0, 26, 0, 1.0], [-0.6, 1.4, 21, 1.9, 0.82]];   // the cloak's two tails: x, y, length, phase, width
const VKV_TEAR = [[0.05, 0.35], [0.35, 1.0], [0.1, 1.65], [0.5, 2.4], [0.28, 3.15]];   // the crack down from his eye
// the tree on the bank, from its foot: branches (x0, y0) to (x1, y1) at a width; the trunk first
const VKV_TREE = [
  [0, 0, 3, -18, 3.4], [3, -18, 1.5, -30, 2.2], [3, -18, 16, -27, 1.8], [16, -27, 30, -31, 1.1], [16, -27, 24, -38, 0.9],
  [1.5, -30, -8, -40, 1.2], [1.5, -30, 6, -42, 1.0], [-8, -40, -18, -43, 0.6], [30, -31, 40, -29, 0.6], [3, -18, -10, -26, 1.3],
  [-10, -26, -19, -29, 0.7], [-10, -26, -14, -35, 0.6], [24, -38, 27, -45, 0.5], [6, -42, 12, -48, 0.5]
];
// the memory's ground, where they stand, and their umbrella held and fallen (its rim's middle, its turn)
const VKV_MEM = { gy: 16, them: -30, umb0: { x: -1.5, y: -25, a: -0.22 }, umb1: { x: 10, y: -7.92, a: 0.915 } };
const VKV = { id: 0, key: '', buf: null, room: null, dpr: 1, O: null, shards: null };

const vkvSeg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
// a new vow: the plate on the cut is kept again (from roninVowFx)
function vkvBegin() { VKV.id++; VKV.key = ''; }
// the night's own clock: it nearly stops while he holds, before the drive
const vkvTa = t => t < VKV_T.hold ? t : VKV_T.hold + (t - VKV_T.hold) * 0.2;
// the first f of a polyline [[x, y], ...], as the current path
function vkvPolyPart(pts, f) {
  const L = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); total += d; }
  let left = total * clamp(f, 0, 1);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const d = L[i - 1] || 1, k = Math.min(1, left / d);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
    left -= d;
  }
}
function vkvPetalPath() {
  ctx.beginPath();
  ctx.moveTo(-1, 0); ctx.quadraticCurveTo(-0.2, -0.78, 0.86, -0.36);
  ctx.lineTo(0.6, 0); ctx.lineTo(0.86, 0.36); ctx.quadraticCurveTo(-0.2, 0.78, -1, 0);
}

/* where he is at time t */
function vkvPose(t) {
  const T = VKV_T;
  const look = vriGlide(vkvSeg(t, T.look0, T.look1)), lift = vriGlide(vkvSeg(t, T.lift0, T.lift1));
  const wind = vraOut(vkvSeg(t, T.wind0, T.drive0)), dr = vraIn(vkvSeg(t, T.drive0, T.hit)), hit = t - T.hit;
  const foot = dr > 0 ? lerp(-29, 7, dr) : lerp(0, -26, lift) - 3 * wind;     // the post's foot; 0 is the water
  return {
    t, foot, hit, dr,
    px: lerp(VKV_POST.x0, VKV_POST.x1, lift),
    lean: dr > 0 ? clamp((foot + 26) / 33, 0, 1) : lerp(lerp(1, 0.55, look), 0, lift),
    bow: lerp(0.62, 0, look) + 0.15 * dr,
    breath: (1 - look) * Math.sin(t * 2.6) * 0.5,                              // his shoulders, while he grieves
    eye: vkvSeg(t, T.eye0, T.eye1), tear: vkvSeg(t, T.tear0, T.tear1),
    burn: vkvSeg(t, T.brand0, T.brand1), blood: vriGlide(vkvSeg(t, T.blood0, T.blood1)),
    crack: vraOut(vkvSeg(t, T.lift0, T.lift0 + 0.5)),
    stream: hit > 0 ? Math.exp(-hit * 10) : Math.pow(dr, 0.7),                 // the drive pulls the cloth up
    ta: vkvTa(t)
  };
}
/* the present's camera: close on the cloth, drawn back to him; in on his face
   for the vow; back for the lift; down with the drive; kicked by the blow */
function vkvCam(t) {
  const T = VKV_T;
  const K = [
    [T.burn0, -7, -26.5, 3.7], [T.pull0, -7, -26.5, 3.4], [T.pull1, -4, -15.5, 1.0], [T.look0, -4, -15.5, 1.02],
    [T.look1 + 0.1, -7.5, -29, 1.75], [T.lift0, -7.5, -29.5, 1.82], [T.lift1, 0, -17, 1.08], [T.drive0, 0, -17, 1.13]
  ];
  let x, y, z;
  if (t <= K[0][0]) { x = K[0][1]; y = K[0][2]; z = K[0][3]; }
  else if (t >= K[K.length - 1][0]) { const k = K[K.length - 1]; x = k[1]; y = k[2]; z = k[3]; }
  else {
    let i = 0;
    while (t > K[i + 1][0]) i++;
    const a = K[i], b = K[i + 1], s = vriGlide((t - a[0]) / (b[0] - a[0]));
    x = lerp(a[1], b[1], s); y = lerp(a[2], b[2], s); z = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), s));
  }
  const dr = vraIn(vkvSeg(t, T.drive0, T.hit)), h = t - T.hit;
  y += 3.5 * dr; z += 0.05 * dr;
  if (h > 0) {
    const e = Math.exp(-h * 16);
    x += Math.cos(h * 83) * 0.9 * e; y += Math.sin(h * 97) * 1.4 * e; z += 0.05 * Math.exp(-h * 9);
  }
  return { x, y, z };
}
function vkvFrame(t) {
  const bar = H * VRI_BAR, u = (H - 2 * bar) / 100;
  return { bar, u, cam: vkvCam(t), cx: W / 2, cy: H / 2 };
}
// where the post meets the water as it is driven, on the screen
function vkvImpact(F) { return vriScreen(F, 1, VKV_FX + VKV_POST.x1 * VKV_S, VKV_GY); }
// a screen point, in the layer at depth d
function vkvInLayer(F, d, s) {
  const k = (1 + (F.cam.z - 1) * d) * F.u;
  return { x: (s.x - F.cx) / k + F.cam.x * d, y: (s.y - F.cy) / k + F.cam.y * d };
}

/* --------------------------- the tree, then and now ------------------------ */
function vkvTree(x, y, s, bloom, ink, rim) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineCap = 'round';
  VKV_TREE.forEach(([x0, y0, x1, y1, w], i) => {
    const mx = (x0 + x1) / 2 + (vraH(i + 2100) - 0.5) * 4, my = (y0 + y1) / 2 + (vraH(i + 2130) - 0.5) * 3;
    ctx.strokeStyle = ink; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    ctx.strokeStyle = rim; ctx.lineWidth = Math.max(0.15, w * 0.18);
    ctx.beginPath(); ctx.moveTo(x0 - w * 0.3, y0 - w * 0.2); ctx.quadraticCurveTo(mx - w * 0.3, my - w * 0.2, x1, y1); ctx.stroke();
  });
  if (bloom > 0) {
    for (let i = 1; i < VKV_TREE.length; i++) {
      const b = VKV_TREE[i];
      for (const f of [0.55, 0.85, 1.05]) {
        const bx = lerp(b[0], b[2], f) + (vraH(i * 3 + f * 10) - 0.5) * 5, by = lerp(b[1], b[3], f) + (vraH(i * 5 + f * 7) - 0.5) * 4;
        const r = (3 + 3.5 * vraH(i * 7 + f * 3)) * bloom;
        drawGlow(bx, by, r * 1.8, '#f6d5c8', 0.55);
        drawGlow(bx + r * 0.3, by - r * 0.3, r, '#fff1e6', 0.35);
      }
    }
  }
  ctx.restore();
}
/* a far shore, low along the horizon hz */
function vkvRidge(F, hz, fill, rim) {
  vriAt(F, 0.3, () => {
    ctx.beginPath(); ctx.moveTo(-260, hz + 0.4);
    for (let x = -260; x <= 260; x += 4) {
      const h = 2.2 + 2.4 * Math.sin(x * 0.045 + 1.3) + 1.4 * Math.sin(x * 0.11 + 0.4) + 0.8 * vraH(Math.floor(x / 4) + 77);
      ctx.lineTo(x, hz - Math.max(0.6, h));
    }
    ctx.lineTo(260, hz + 0.4); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 0.25; ctx.stroke();
  });
}

/* -------------------------------- the memory --------------------------------
   Gold and faded, the one colour in it the umbrella's red. The same water in
   daylight, the tree on its bank in flower. Someone stands under it with a
   red umbrella and waves him off; he walks away into the low sun and does not
   look back. They go to light and petals from the top down, the umbrella
   falls toward where he went, and the memory burns in to its red. Its own
   camera (vkvMemCam) ends on the fallen umbrella, at the middle of the frame,
   where the cloth of the present will be. */
function vkvMemCam(t) {
  const p = vriGlide(t / VKV_T.burn1);
  return { x: lerp(-8, -18, p), y: lerp(-2, 6.5, p), z: Math.exp(lerp(Math.log(1.05), Math.log(2.5), p)) };
}
function vkvMemFrame(t) {
  const bar = H * VRI_BAR, u = (H - 2 * bar) / 100;
  return { bar, u, cam: vkvMemCam(t), cx: W / 2, cy: H / 2 };
}
function vkvUmbrellaAt(t) {
  const T = VKV_T, A = VKV_MEM.umb0, B = VKV_MEM.umb1, f = vkvSeg(t, T.drop0, T.drop1);
  let a = lerp(A.a, B.a, vraEase(f)) + (1 - f) * Math.sin(t * 5.2) * 0.04;
  if (t > T.drop1) a += 0.12 * Math.exp(-(t - T.drop1) * 9) * Math.sin((t - T.drop1) * 28);
  return { x: VKV_MEM.them + lerp(A.x, B.x, vraOut(f)), y: VKV_MEM.gy + lerp(A.y, B.y, vraIn(f)), a };
}
function vkvMemSky(F, t) {
  const hz = vriScreen(F, 0.3, 0, 4).y;
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#22180d'); g.addColorStop(0.55, '#5e4529'); g.addColorStop(1, '#c39a5e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  vriAt(F, 0.1, () => {                          // the sun, low over the far shore, where he is walking
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(46, 2, 70, '#f59e0b', 0.22);
    drawGlow(46, 2, 22, '#fde68a', 0.35);
  });
}
function vkvMemLand(F, t) {
  const hz = vriScreen(F, 0.3, 0, 4).y, bank = vriScreen(F, 1, 0, 11.5).y, u = F.u;
  const g = ctx.createLinearGradient(0, hz, 0, Math.max(hz + 1, bank));
  g.addColorStop(0, '#a6814d'); g.addColorStop(1, '#6b5131');
  ctx.fillStyle = g; ctx.fillRect(0, hz, W, Math.max(0, bank - hz));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const span = W * 1.2;
  for (let i = 0; i < 26; i++) {
    const f = vraH(i + 1500), y = lerp(hz + 2, bank - 1, f), L = u * (3 + 10 * vraH(i + 1530)) * (0.6 + f);
    let x = vraH(i + 1560) * span + t * u * 3;
    x = (x % span) - W * 0.1;
    const s = Math.sin(t * 4 + i);
    vraLens(x - L, y, x + L, y, u * 0.12, '#fde68a', 0.18 + 0.2 * s * s);
  }
  ctx.restore();
  vriAt(F, 1, () => {                            // the bank, and the path along it
    ctx.fillStyle = '#3a2a17'; ctx.fillRect(-400, 11.5, 800, 200);
    const pg = ctx.createLinearGradient(0, 13.5, 0, 19);
    pg.addColorStop(0, 'rgba(160,128,84,0)'); pg.addColorStop(0.3, 'rgba(160,128,84,0.85)');
    pg.addColorStop(0.75, 'rgba(140,110,70,0.85)'); pg.addColorStop(1, 'rgba(140,110,70,0)');
    ctx.fillStyle = pg; ctx.fillRect(-400, 13.5, 800, 5.5);
    ctx.strokeStyle = 'rgba(244,220,160,0.25)'; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-400, 11.6); ctx.lineTo(400, 11.6); ctx.stroke();
  });
}
function vkvMemPetals(F, t, d, n, seed, size) {
  vriAt(F, d, () => {
    for (let i = 0; i < n; i++) {
      const h1 = vraH(seed + i), h2 = vraH(seed + i + 50), h3 = vraH(seed + i + 90);
      const x = -130 + ((h2 * 260 + t * (10 + 14 * h1)) % 260);
      const y = -46 + ((h3 * 70 + t * (4 + 5 * h2)) % 70) + Math.sin(t * (1.1 + h1) + i) * 2.5;
      const spin = t * (2 + 3 * h2) + i * 1.7, flip = Math.cos(spin * 1.3), s = size * (0.7 + 0.6 * h3);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(spin * 0.6 + h1 * TAU); ctx.scale(s * (0.25 + 0.75 * Math.abs(flip)), s);
      vkvPetalPath();
      ctx.fillStyle = flip > 0 ? 'rgba(246,214,200,0.85)' : 'rgba(230,184,166,0.85)';
      ctx.fill();
      ctx.restore();
    }
  });
}
/* them: a long robe, a sash, the far hand up to the umbrella, the near hand
   raised, waving him off. f: how far they have gone to light, from the top */
function vkvMemThem(x, y, t, f) {
  if (f >= 1) return;
  const ink = '#24170c', wave = Math.sin(t * 5.2) * 1.1, cut = lerp(-28.5, 0.5, f);
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.rect(-20, cut, 40, 40); ctx.clip();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-0.6, -18.6); ctx.quadraticCurveTo(-0.4, -14.6, 1.2, -12.6); ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-2.4, -19.8); ctx.quadraticCurveTo(0.2, -20.6, 2.4, -19.6);
  ctx.quadraticCurveTo(3.2, -10, 3.9, 0); ctx.lineTo(-4.3, 0);
  ctx.quadraticCurveTo(-3.6, -10, -2.4, -19.8);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3e2814'; ctx.fillRect(-3.3, -12.6, 6.5, 1.7);
  const sx = 1.6, sy = -18.4, hx = 9.2 + wave, hy = -22.8;
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(sx - 0.6, sy - 0.6); ctx.lineTo(hx - 0.4, hy - 0.6);
  ctx.quadraticCurveTo(hx + 0.4, hy + 3, hx - 1.2, hy + 5.6);
  ctx.quadraticCurveTo(sx + 3, sy + 2.4, sx - 0.6, sy + 1.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.fillStyle = '#c9a77a'; ctx.beginPath(); ctx.arc(hx + 0.4, hy - 0.3, 0.75, 0, TAU); ctx.fill();
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0.5, -21.8, 2.2, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(244,220,160,0.35)'; ctx.lineWidth = 0.28;
  ctx.beginPath(); ctx.moveTo(2.4, -19.6); ctx.quadraticCurveTo(3.2, -10, 3.9, 0); ctx.stroke();
  ctx.restore();
  if (f > 0) {                                    // the line they are going to light along
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    vraLens(x - 6, y + cut, x + 7, y + cut, 0.45, '#fde68a', 0.7 * Math.sin(Math.PI * Math.min(1, f * 1.15)));
    ctx.restore();
  }
}
/* what they go to: petals off the line as it comes down, and a warmth leaving */
function vkvMemDissolve(t) {
  const T = VKV_T;
  if (t < T.fade0) return;
  const x0 = VKV_MEM.them, y0 = VKV_MEM.gy, f = vkvSeg(t, T.fade0, T.fade1);
  ctx.save();
  if (f > 0 && f < 1) {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(x0, y0 - 13, 16, '#fde68a', 0.3 * Math.sin(Math.PI * f));
    ctx.globalCompositeOperation = 'source-over';
  }
  for (let i = 0; i < 48; i++) {
    const k0 = vraH(i + 1700), s0 = lerp(T.fade0, T.fade1, k0), age = t - s0, life = 0.7 + 0.5 * vraH(i + 1730);
    if (age <= 0 || age >= life) continue;
    const q = age / life, h = vraH(i + 1760);
    const px = x0 + (vraH(i + 1790) - 0.5) * 7 + age * (8 + 14 * h) + Math.sin(age * 5 + i) * 0.8;
    const py = y0 + lerp(-27, 0, k0) + (vraH(i + 1820) - 0.5) * 2 - age * (3 + 7 * h);
    const s = 0.55 + 0.5 * vraH(i + 1850), spin = age * (3 + 4 * h) + i;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(spin); ctx.scale(s * (0.35 + 0.65 * Math.abs(Math.cos(spin * 1.3))), s);
    vkvPetalPath();
    ctx.fillStyle = rgba('#f6d6c8', 0.9 * (1 - q));
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
/* the umbrella: oiled paper, red, the light through it; k: its red still burning as the rest goes */
function vkvMemUmbrella(x, y, a, k) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a1b0c'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, -0.5); ctx.lineTo(0, 13); ctx.stroke();
  ctx.fillStyle = '#1d1208'; ctx.fillRect(-0.45, 10.6, 0.9, 2.6);
  ctx.fillStyle = '#4c0d0d';
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, 2.2, 10, 0); ctx.quadraticCurveTo(0, 0.6, -10, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(0, -10, 10, 0); ctx.closePath();
  const g = ctx.createLinearGradient(-6, -6, 6, 1);
  g.addColorStop(0, '#e04848'); g.addColorStop(0.5, '#b91c1c'); g.addColorStop(1, '#6f1414');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(60,8,8,0.55)'; ctx.lineWidth = 0.16;
  for (let i = 1; i < 10; i++) { ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-10 + i * 2, 0); ctx.stroke(); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(254,202,202,0.55)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-5, -5, 0, -5); ctx.stroke();
  ctx.fillStyle = '#1d1208'; ctx.beginPath(); ctx.arc(0, -5.1, 0.45, 0, TAU); ctx.fill();
  if (k > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(0, -2.5, 14, '#dc2626', 0.3 * k); }
  ctx.restore();
}
/* him, before: walking away along the bank, his head down, not looking back */
function vkvMemRonin(x, y, t) {
  const ph = t * 6.4, sw = Math.sin(ph), bob = Math.abs(Math.cos(ph)) * 0.45, ink = '#1d140a';
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(240,226,190,0.8)'; ctx.lineWidth = 0.45;          // the tails off his collar, trailing
  for (const [L, p] of [[9, 0], [7, 1.9]]) {
    let px = -1.2, py = -22.4;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (let i = 1; i <= 8; i++) {
      const s = i / 8, a = Math.PI + 0.12 + 0.35 * s * Math.sin(s * 6 - t * 9 + p);
      px += Math.cos(a) * L / 8; py += Math.sin(a) * L / 8;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.strokeStyle = ink; ctx.lineWidth = 1.1;                                // the scabbard, back from his hip
  ctx.beginPath(); ctx.moveTo(-0.5, -13.6); ctx.lineTo(-11.5, -10.6 + sw * 0.3); ctx.stroke();
  const fa = 4.2 * sw, fb = -4.2 * sw, hi = Math.max(fa, fb), lo = Math.min(fa, fb);
  ctx.fillStyle = ink;                                                        // the hakama, opening with each step
  ctx.beginPath();
  ctx.moveTo(-3.3, -14.2); ctx.lineTo(3.1, -14.2);
  ctx.quadraticCurveTo(hi + 1.6, -6, hi + 2.2, 0);
  ctx.lineTo(hi - 1.4, 0); ctx.lineTo((hi + lo) / 2, -4.8 * Math.abs(sw)); ctx.lineTo(lo + 1.4, 0); ctx.lineTo(lo - 2.2, 0);
  ctx.quadraticCurveTo(lo - 1.6, -6, -3.3, -14.2);
  ctx.closePath(); ctx.fill();
  const sway = Math.sin(ph * 0.5 + 1) * 0.8;                                  // the cloak, shoulders to knees
  ctx.beginPath();
  ctx.moveTo(-1.4, -23.4);
  ctx.quadraticCurveTo(1.6, -24, 2.8, -21.6);
  ctx.quadraticCurveTo(4, -16, 3.6, -11.5);
  ctx.quadraticCurveTo(0, -8.4, -2, -7);
  ctx.quadraticCurveTo(-5 + sway, -6.4, -7 + sway, -7.6);
  ctx.quadraticCurveTo(-5.5, -15, -1.4, -23.4);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(253,230,138,0.55)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(2.8, -21.6); ctx.quadraticCurveTo(4, -16, 3.6, -11.5); ctx.quadraticCurveTo(0, -8.4, -2, -7); ctx.quadraticCurveTo(-5 + sway, -6.4, -7 + sway, -7.6); ctx.stroke();
  ctx.strokeStyle = '#3b2a12'; ctx.lineWidth = 0.9;                          // the hilt forward at his waist
  ctx.beginPath(); ctx.moveTo(2.6, -14.4); ctx.lineTo(7.6, -16.2); ctx.stroke();
  ctx.fillStyle = VRA_GOLD; ctx.beginPath(); ctx.ellipse(2.9, -14.5, 0.3, 1.0, -0.35, 0, TAU); ctx.fill();
  ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(1.4, -24.4, 2.1, 0, TAU); ctx.fill();
  ctx.beginPath();                                                            // the kasa, tipped down
  ctx.moveTo(-7.2, -25.4); ctx.quadraticCurveTo(-3, -28.6, 0.8, -30.2); ctx.quadraticCurveTo(4.8, -28.4, 8.6, -26.2); ctx.quadraticCurveTo(0.8, -24.6, -7.2, -25.4);
  ctx.closePath(); ctx.fillStyle = '#2e2010'; ctx.fill();
  ctx.strokeStyle = 'rgba(253,230,138,0.7)'; ctx.lineWidth = 0.28;
  ctx.beginPath(); ctx.moveTo(8.6, -26.2); ctx.quadraticCurveTo(0.8, -24.6, -7.2, -25.4); ctx.stroke();
  ctx.strokeStyle = 'rgba(244,220,160,0.5)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(-7.2, -25.4); ctx.quadraticCurveTo(-3, -28.6, 0.8, -30.2); ctx.quadraticCurveTo(4.8, -28.4, 8.6, -26.2); ctx.stroke();
  ctx.restore();
}
/* the look of a thing remembered: warm, dark at its edges, never quite steady */
function vkvMemTone(t) {
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(28,16,6,0)'); g.addColorStop(1, 'rgba(28,16,6,0.62)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = rgba('#f4dca0', clamp(0.06 + 0.025 * Math.sin(t * 13) * Math.sin(t * 7.3), 0, 1));
  ctx.fillRect(0, 0, W, H);
}
function vkvMemory(t) {
  const F = vkvMemFrame(t), T = VKV_T;
  vkvMemSky(F, t);
  vkvRidge(F, 4, '#6b5236', 'rgba(244,220,160,0.12)');
  vkvMemLand(F, t);
  vkvMemPetals(F, t, 0.8, 26, 211, 0.9);
  vriAt(F, 1, () => {
    vkvTree(-52, 15, 1, 1, '#22160a', 'rgba(244,220,160,0.22)');
    vkvMemThem(VKV_MEM.them, VKV_MEM.gy, t, vkvSeg(t, T.fade0, T.fade1));
    const U = vkvUmbrellaAt(t);
    vkvMemUmbrella(U.x, U.y, U.a, vkvSeg(t, T.burn0, T.burn1));
    vkvMemDissolve(t);
    vkvMemRonin(-14 + 15 * t, VKV_MEM.gy, t);
  });
  vkvMemPetals(F, t, 1.5, 7, 263, 2.0);
  vkvMemTone(t);
}
/* the memory burning in to its red: a ragged hole round the umbrella, the
   present outside it, the paper charred inside its edge, embers off it */
function vkvBurnPath(c, R, p) {
  ctx.beginPath();
  for (let i = 0; i <= 72; i++) {
    const th = i / 72 * TAU;
    const r = R * (1 + 0.16 * Math.sin(3 * th + p * 7) + 0.09 * Math.sin(7 * th - p * 11 + 1) + 0.05 * Math.sin(13 * th + p * 3 + 2));
    const x = c.x + Math.cos(th) * r, y = c.y + Math.sin(th) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function vkvBurn(t, draw) {
  const T = VKV_T, p = vkvSeg(t, T.burn0, T.burn1), F = vkvMemFrame(t), U = vkvUmbrellaAt(t);
  const c = vriScreen(F, 1, U.x + Math.sin(U.a) * 2.5, U.y - Math.cos(U.a) * 2.5);
  const far = Math.max(Math.hypot(c.x, c.y), Math.hypot(W - c.x, c.y), Math.hypot(c.x, H - c.y), Math.hypot(W - c.x, H - c.y)) * 1.25;
  const R = far * Math.pow(1 - p, 1.35);
  if (R < 0.5) return;
  ctx.save();
  vkvBurnPath(c, R, p); ctx.clip();
  draw();
  ctx.strokeStyle = 'rgba(26,12,4,0.85)'; ctx.lineWidth = 12;
  vkvBurnPath(c, R, p); ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vkvBurnPath(c, R, p);
  ctx.strokeStyle = rgba('#f59e0b', 0.75); ctx.lineWidth = 3.5; ctx.stroke();
  ctx.strokeStyle = rgba('#fde68a', 0.9); ctx.lineWidth = 1.2; ctx.stroke();
  for (let i = 0; i < 36; i++) {
    const s0 = lerp(T.burn0, T.burn1, vraH(i + 1900)), age = t - s0, life = 0.35 + 0.3 * vraH(i + 1930);
    if (age <= 0 || age >= life) continue;
    const ps = vkvSeg(s0, T.burn0, T.burn1), th = vraH(i + 1960) * TAU;
    const r0 = far * Math.pow(1 - ps, 1.35) * (1 + 0.16 * Math.sin(3 * th + ps * 7));
    const q = age / life, out = 30 * age * (0.5 + vraH(i + 1990));
    drawGlow(c.x + Math.cos(th) * (r0 + out), c.y + Math.sin(th) * (r0 + out) - 40 * age, 6, '#f59e0b', 0.6 * (1 - q));
  }
  ctx.restore();
}

/* ------------------------------- the present -------------------------------- */
function vkvSky(F, P) {
  const hz = vriScreen(F, 0.3, 0, VKV_HZ).y;
  const g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#0b1226'); g.addColorStop(0.6, '#0a0f20'); g.addColorStop(1, '#171c33');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (P.blood > 0) {
    const r = ctx.createLinearGradient(0, 0, 0, hz);
    r.addColorStop(0, 'rgba(20,4,8,0.9)'); r.addColorStop(0.65, 'rgba(46,8,12,0.9)'); r.addColorStop(1, 'rgba(96,16,20,0.9)');
    ctx.globalAlpha = P.blood; ctx.fillStyle = r; ctx.fillRect(0, 0, W, hz + 1); ctx.globalAlpha = 1;
  }
  vriAt(F, 0.08, () => {                         // stars, going out as the sky turns
    for (let i = 0; i < 40; i++) {
      const x = -140 + vraH(i + 401) * 280, y = -64 + vraH(i + 455) * 56;
      const a = (0.25 + 0.45 * vraH(i + 499)) * (0.6 + 0.4 * Math.sin(P.ta * (1.5 + vraH(i + 520) * 3) + i)) * (1 - 0.8 * P.blood);
      ctx.fillStyle = rgba('#e2e8f0', clamp(a, 0, 1));
      ctx.fillRect(x, y, 0.32, 0.32);
    }
  });
}
function vkvSeas(M, pre, k) {
  for (const [dx, dy, rx, ry, a] of VRI_SEAS) {
    ctx.save();
    ctx.translate(M.x + dx * M.r, M.y + dy * M.r); ctx.rotate(a); ctx.scale(rx * M.r, ry * M.r);
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    sg.addColorStop(0, pre + (0.14 * k) + ')'); sg.addColorStop(0.6, pre + (0.08 * k) + ')'); sg.addColorStop(1, pre + '0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
/* the intro's moon; the vow's blood rises through it from below, a lit edge leading */
function vkvMoon(F, P) {
  const M = VKV_MOON, b = P.blood;
  vriAt(F, M.d, () => {
    ctx.globalCompositeOperation = 'lighter';
    drawGlow(M.x, M.y, M.r * 2.8, VRA_GOLD, 0.13 * (1 - b));
    drawGlow(M.x, M.y, M.r * 1.5, '#fff7d6', 0.12 * (1 - b));
    drawGlow(M.x, M.y, M.r * 3.2, '#dc2626', 0.32 * b);
    drawGlow(M.x, M.y, M.r * 1.6, '#f87171', 0.18 * b);
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(M.x - M.r * 0.3, M.y - M.r * 0.35, M.r * 0.1, M.x, M.y, M.r);
    g.addColorStop(0, '#fffbeb'); g.addColorStop(0.6, '#fcefc6'); g.addColorStop(1, '#e6cb86');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(M.x, M.y, M.r, 0, TAU); ctx.fill();
    vkvSeas(M, 'rgba(176,140,74,', 1);
    if (b > 0) {
      const top = M.y + M.r - b * M.r * 2.5;
      const edge = x => top + (Math.sin(x * 0.32 + P.ta * 5) * 1.3 + Math.sin(x * 0.9 + 2) * 0.6) * (1 - b);
      ctx.save();
      ctx.beginPath(); ctx.arc(M.x, M.y, M.r, 0, TAU); ctx.clip();
      ctx.beginPath(); ctx.moveTo(M.x - M.r - 1, M.y + M.r + 1);
      for (let x = M.x - M.r - 1; x <= M.x + M.r + 1; x += 1.5) ctx.lineTo(x, edge(x));
      ctx.lineTo(M.x + M.r + 1, M.y + M.r + 1); ctx.closePath();
      const rg = ctx.createRadialGradient(M.x - M.r * 0.3, M.y - M.r * 0.35, M.r * 0.1, M.x, M.y, M.r);
      rg.addColorStop(0, '#fecaca'); rg.addColorStop(0.5, '#ef4444'); rg.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = rg; ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#fca5a5', 0.7 * (1 - b)); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(M.x - M.r, edge(M.x - M.r));
      for (let x = M.x - M.r + 1.5; x <= M.x + M.r; x += 1.5) ctx.lineTo(x, edge(x));
      ctx.stroke();
      ctx.restore();
      vkvSeas(M, 'rgba(60,8,10,', b);
    }
    const lg = ctx.createRadialGradient(M.x, M.y, M.r * 0.7, M.x, M.y, M.r);
    lg.addColorStop(0, 'rgba(60,20,10,0)'); lg.addColorStop(1, 'rgba(60,20,10,0.25)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(M.x, M.y, M.r, 0, TAU); ctx.fill();
    const mg = ctx.createLinearGradient(0, M.y, 0, M.y + M.r);
    mg.addColorStop(0, 'rgba(8,11,23,0)'); mg.addColorStop(1, 'rgba(8,11,23,0.5)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(M.x, M.y, M.r + 0.5, 0, TAU); ctx.fill();
  });
}
function vkvClouds(F, P) {
  vriAt(F, 0.5, () => {
    for (const C of VKV_CLOUDS) for (let i = 0; i < C.n; i++) {
      const h1 = vraH(C.s + i), h2 = vraH(C.s + i + 40);
      const x = -150 + i * C.gap + h1 * 18 - P.ta * C.v, y = C.y + (h2 - 0.5) * 5, L = C.L * (0.6 + 0.6 * h1);
      vraLens(x - L / 2, y, x + L / 2, y + (h1 - 0.5) * 1.5, C.w * (0.6 + 0.7 * h2), C.col, C.a * (0.6 + 0.4 * h2));
    }
  });
}
/* still water to the shore: the sky in it, the moon broken on it, faint lines moving */
function vkvWater(F, P) {
  const hz = vriScreen(F, 0.3, 0, VKV_HZ).y, b = P.blood, u = F.u;
  const g = ctx.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, '#11172b'); g.addColorStop(0.25, '#090d1a'); g.addColorStop(1, '#030408');
  ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
  if (b > 0) {
    const r = ctx.createLinearGradient(0, hz, 0, H);
    r.addColorStop(0, 'rgba(70,12,16,1)'); r.addColorStop(0.3, 'rgba(30,6,9,1)'); r.addColorStop(1, 'rgba(8,2,3,1)');
    ctx.globalAlpha = b * 0.85; ctx.fillStyle = r; ctx.fillRect(0, hz, W, H - hz); ctx.globalAlpha = 1;
  }
  const mx = vriScreen(F, VKV_MOON.d, VKV_MOON.x, VKV_MOON.y).x, fl = Math.floor(P.ta * 9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const n = 44;
  for (let i = 0; i < n; i++) {
    const f = Math.pow((i + 0.5) / n, 1.35), y = hz + (H - hz) * f;
    const h1 = vraH(i * 3.1 + fl * 0.37), h2 = vraH(i * 5.7 + fl * 0.61 + 9);
    const hw = u * (1.2 + 13 * f) * (0.35 + 0.65 * h1), x = mx + (h2 - 0.5) * u * (2 + 9 * f);
    const a = (0.55 - 0.3 * f) * (0.5 + 0.5 * h2), th = u * (0.18 + 0.35 * f);
    if (b < 1) vraLens(x - hw, y, x + hw, y, th, VRA_GOLD, a * (1 - b));
    if (b > 0) vraLens(x - hw, y, x + hw, y, th, '#ef4444', a * b);
  }
  ctx.restore();
  const span = W * 1.4;
  for (let i = 0; i < 30; i++) {
    const f = Math.pow(vraH(i + 600), 1.6), y = hz + 2 + (H - hz) * f;
    const L = u * (8 + 46 * f) * (0.5 + vraH(i + 640));
    let x = vraH(i + 680) * span - P.ta * u * (2 + 4 * f);
    x = ((x % span) + span) % span - W * 0.2;
    vraLens(x - L / 2, y, x + L / 2, y, u * (0.08 + 0.12 * f), b > 0.5 ? '#fca5a5' : '#cbd5e1', 0.05 + 0.07 * f);
  }
}
/* the water's lines, through his reflection */
function vkvBreakUp(F, P) {
  const c = vriScreen(F, 1, VKV_FX, VKV_GY), us = F.cam.z * F.u, b = P.blood;
  for (let i = 0; i < 16; i++) {
    const y = c.y + us * (1 + i * 2 + i * i * 0.12);
    if (y > H) break;
    const x0 = c.x - us * (40 + 8 * vraH(i + 700)) + Math.sin(P.ta * 2 + i) * us * 2, x1 = c.x + us * (24 + 8 * vraH(i + 720));
    const th = Math.max(1, us * (0.22 + 0.03 * i));
    if (b < 1) { ctx.fillStyle = rgba('#080b16', 0.6 * (1 - b)); ctx.fillRect(x0, y, x1 - x0, th); }
    if (b > 0) { ctx.fillStyle = rgba('#1a0507', 0.6 * b); ctx.fillRect(x0, y, x1 - x0, th); }
  }
}
/* in his frame: the water moving round where he kneels, and the rings off the blow */
function vkvRings(P) {
  const x = VKV_POST.x1, h = P.hit;
  ctx.lineWidth = 0.4;
  for (let j = 0; j < 2; j++) {
    const ph = (P.ta * 0.35 + j * 0.5) % 1, rx = 14 + 16 * ph;
    ctx.strokeStyle = rgba('#cbd5e1', 0.14 * (1 - ph));
    ctx.beginPath(); ctx.ellipse(-4, 0.3, rx, rx * 0.1, 0, 0, TAU); ctx.stroke();
  }
  if (h > 0) for (let j = 0; j < 3; j++) {
    const hj = h - j * 0.05;
    if (hj <= 0) continue;
    const rx = 5 + 85 * vraOut(hj / 0.9) * (1 - j * 0.15), a = clamp(1 - hj / 0.8, 0, 1) * (0.8 - j * 0.2);
    ctx.strokeStyle = rgba('#fca5a5', a);
    ctx.beginPath(); ctx.ellipse(x, 0.4, rx, rx * 0.12, 0, 0, TAU); ctx.stroke();
  }
}
/* petals on the water, drifting; the blow pushes them out */
function vkvFloaters(F, P) {
  const ip = vkvInLayer(F, 1, vkvImpact(F)), h = P.hit, b = P.blood;
  vriAt(F, 1, () => {
    for (let i = 0; i < 18; i++) {
      const h1 = vraH(i + 300), h2 = vraH(i + 340), h3 = vraH(i + 380), span = 220;
      let x = 110 - ((h1 * span + P.ta * (1.5 + 2 * h2)) % span);
      const y = VKV_GY + 1.5 + Math.pow(h3, 1.3) * 40;
      if (h > 0) {
        const dx = x - ip.x, dd = Math.abs(dx) + Math.abs(y - ip.y) * 3 + 1;
        x += Math.sign(dx) * 16 * (1 - Math.exp(-h * 10)) / (1 + dd / 25);
      }
      const s = 1.0 + 0.9 * h3, ang = h2 * TAU + Math.sin(P.ta + i) * 0.3;
      ctx.save();
      ctx.translate(x, y); ctx.scale(1, 0.38); ctx.rotate(ang); ctx.scale(s, s);
      vkvPetalPath();
      ctx.fillStyle = vriMix('#f9a8d4', '#dc2626', clamp(b * 1.3 - h2 * 0.3, 0, 1), 0.7);
      ctx.fill();
      ctx.restore();
    }
  });
}
/* sakura on the wind, as in his intro; the vow takes them one by one, and the blow throws them */
function vkvPetals(F, P, d, n, seed, size, cx, span) {
  const b = P.blood, h = P.hit, ip = vkvInLayer(F, d, vkvImpact(F));
  vriAt(F, d, () => {
    for (let i = 0; i < n; i++) {
      const h1 = vraH(seed + i), h2 = vraH(seed + i + 50), h3 = vraH(seed + i + 90);
      let x = cx + span / 2 - ((h2 * span + P.ta * (16 + 22 * h1)) % span);
      let y = -62 + h3 * 64 + Math.sin(P.ta * (1.2 + h1) + i) * 4;
      let spin = P.ta * (2 + 3 * h2) + i * 1.7;
      if (h > 0) {
        const dx = x - ip.x, dy = y - ip.y, dd = Math.hypot(dx, dy) || 1;
        const push = 40 * (1 - Math.exp(-h * 12)) / (1 + dd / 30);
        x += dx / dd * push; y += dy / dd * push - 8 * (1 - Math.exp(-h * 9)) / (1 + dd / 40);
        spin += h * 30 / (1 + dd / 30);
      }
      const flip = Math.cos(spin * 1.3), s = size * (0.7 + 0.6 * h3), ember = clamp(b * 1.4 - h1 * 0.4, 0, 1);
      ctx.save();
      ctx.translate(x, y); ctx.rotate(spin * 0.6 + h1 * TAU);
      ctx.scale(s * (0.25 + 0.75 * Math.abs(flip)), s);
      vkvPetalPath();
      ctx.fillStyle = flip > 0 ? vriMix('#fbcfe8', '#ef4444', ember, 0.85) : vriMix('#f9a8d4', '#b91c1c', ember, 0.85);
      ctx.fill();
      ctx.restore();
      if (ember > 0.5) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        drawGlow(x, y, s * 3, '#dc2626', 0.25 * (ember - 0.5) * 2);
        ctx.restore();
      }
    }
  });
}

/* --------------------------------- RONIN ------------------------------------
   Kneeling on one knee, facing +x; his frame has the water at y = 0. He holds
   the post at VKV_POST.grip; the arms reach it (vkvIK); he is bowed over it
   while he grieves, straightens as he looks up, and lifts it. Drawn twice:
   his reflection (refl: flipped, no light of its own), then him. */
function vkvIK(s, h, L1, L2) {
  const dx = h.x - s.x, dy = h.y - s.y, d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.01, L1 + L2 - 0.01);
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  return { s, e: { x: s.x + Math.cos(a + b) * L1, y: s.y + Math.sin(a + b) * L1 }, w: { x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d } };
}
function vkvRig(P) {
  const L = P.lean;
  const hip = { x: -3 + 1.5 * L, y: -18 + 0.6 * L };
  const sh = { x: lerp(-0.5, 7, L), y: lerp(-40, -34, L) + P.breath };
  const nk = { x: sh.x + 2.2, y: sh.y - 3.4 };
  const top = P.foot - VKV_POST.L, px = P.px;
  const near = vkvIK(sh, { x: px, y: top + VKV_POST.grip[0] }, 14, 13);
  const far = vkvIK({ x: sh.x - 1.4, y: sh.y - 0.8 }, { x: px, y: top + VKV_POST.grip[1] }, 14, 13);
  return { hip, sh, nk, top, px, near, far };
}
function vkvFigure(P, k, refl) {
  const R = vkvRig(P);
  ctx.save();
  ctx.beginPath(); ctx.rect(-200, -200, 400, 200.2); ctx.clip();    // nothing of him under the water line
  vkvTails(R, P);
  vkvArm(R.far, P, '#05070c', true);
  vkvHand(R.far.w, P, true);
  vkvScabbard(R);
  vkvHilt(R);
  vkvLeg(R, P);
  vkvCloak(R, P);
  if (!refl) vkvCracks(R, P);
  vkvHead(R, P, refl);
  vkvPost(R, P, k, refl);
  vkvArm(R.near, P, '#0a0d16', false);
  vkvHand(R.near.w, P, false);
  ctx.restore();
}
/* the cloak's two tails, off the back of the collar, ivory with gold ends */
function vkvTails(R, P) {
  const ox = R.nk.x - 3.2, oy = R.nk.y + 2.5, N = 14, ta = P.ta;
  ctx.save();
  ctx.lineJoin = 'round';
  for (const [dx, dy, L, ph, w] of VKV_TAILS) {
    const pts = [];
    let x = ox + dx, y = oy + dy;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const a = Math.PI + 0.22 - 0.25 * s * s + 0.4 * s * Math.sin(s * 6.5 - ta * 9 + ph) + 1.1 * P.stream * s;
      const tw = (0.3 + 0.7 * Math.abs(Math.cos(s * 5 - ta * 7 + ph))) * w * (1 - 0.45 * s);
      pts.push({ x, y, nx: -Math.sin(a) * tw, ny: Math.cos(a) * tw, s });
      x += Math.cos(a) * L / N; y += Math.sin(a) * L / N;
    }
    for (let i = 1; i <= N; i++) {
      const p = pts[i - 1], n = pts[i];
      ctx.fillStyle = ctx.strokeStyle = n.s > 0.76 ? VRA_GOLD : vriMix('#fef3c7', '#d6c7a1', n.s);
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.moveTo(p.x + p.nx, p.y + p.ny); ctx.lineTo(n.x + n.nx, n.y + n.ny);
      ctx.lineTo(n.x - n.nx, n.y - n.ny); ctx.lineTo(p.x - p.nx, p.y - p.ny); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
}
/* an arm in its wide sleeve: the sleeve hangs off it and the wind takes its hem */
function vkvArm(A, P, col, far) {
  const s = A.s, e = A.e, w = A.w;
  const c = { x: lerp(e.x, w.x, 0.6), y: lerp(e.y, w.y, 0.6) };
  const sw = Math.sin(P.ta * 4.2 + (far ? 1.7 : 0)) * 1.1 - 1.2 - 2.5 * P.stream;
  const D = 9.5 - 5 * P.stream, lo = Math.max(e.y, c.y);
  ctx.save();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(s.x - 1.5, s.y - 2);
  ctx.lineTo(e.x, e.y - 2.2);
  ctx.lineTo(c.x, c.y - 2);
  ctx.quadraticCurveTo(c.x + 0.8, c.y + D * 0.55, c.x - 2 + sw, Math.max(c.y + 2, lo) + D);
  ctx.quadraticCurveTo(lerp(c.x, s.x, 0.45) + sw, lo + D + 1.5, s.x - 2.5 + sw * 0.6, s.y + 6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
  ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(w.x, w.y); ctx.stroke();
  if (!far) {
    ctx.strokeStyle = vriMix('#fef3c7', '#f87171', P.blood, 0.28); ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(s.x - 1.5, s.y - 2); ctx.lineTo(e.x, e.y - 2.2); ctx.lineTo(c.x, c.y - 2); ctx.stroke();
    if (P.crack > 0) {                          // the vow, breaking out along the forearm
      ctx.globalCompositeOperation = 'lighter';
      vkvPolyPart([[e.x, e.y - 0.4], [lerp(e.x, w.x, 0.35), lerp(e.y, w.y, 0.35) + 0.5], [lerp(e.x, w.x, 0.7), lerp(e.y, w.y, 0.7) - 0.4], [w.x - 1, w.y]], P.crack);
      ctx.strokeStyle = rgba('#dc2626', 0.6); ctx.lineWidth = 0.9; ctx.stroke();
      ctx.strokeStyle = rgba('#fecaca', 0.75); ctx.lineWidth = 0.22; ctx.stroke();
    }
  }
  ctx.restore();
}
/* a fist round the post, bound in old cloth; the vow shows red through the binding */
function vkvHand(h, P, far) {
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.fillStyle = far ? '#1c1a17' : '#4a453c';
  ctx.beginPath(); ctx.ellipse(far ? -0.4 : 0.2, 0, 3.3, 2.5, 0, 0, TAU); ctx.fill();
  if (!far) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(214,207,189,0.55)'; ctx.lineWidth = 0.32;
    for (let i = 0; i < 4; i++) {
      const y = -1.6 + i * 1.05;
      ctx.beginPath(); ctx.moveTo(-2.9, y + 0.5); ctx.quadraticCurveTo(0, y - 0.4, 3.0, y + 0.3); ctx.stroke();
    }
    ctx.strokeStyle = vriMix('#fef3c7', '#f87171', P.blood, 0.45); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.ellipse(0.2, 0, 3.3, 2.5, 0, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
    if (P.eye > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#ef4444', 0.75 * P.eye); ctx.lineWidth = 0.3;
      for (let i = 0; i < 3; i++) {
        const y = -1.05 + i * 1.05;
        ctx.beginPath(); ctx.moveTo(-2.6, y + 0.45); ctx.quadraticCurveTo(0, y - 0.35, 2.7, y + 0.25); ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function vkvScabbard(R) {
  const x0 = R.hip.x + 1, y0 = R.hip.y - 3.5, x1 = -34, y1 = -27;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#06070c'; ctx.lineWidth = 2.1;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(-16, -25.5, x1, y1); ctx.stroke();
  ctx.strokeStyle = 'rgba(203,213,225,0.16)'; ctx.lineWidth = 0.3;
  ctx.beginPath(); ctx.moveTo(x0, y0 - 0.9); ctx.quadraticCurveTo(-16, -26.4, x1, y1 - 0.9); ctx.stroke();
  ctx.fillStyle = rgba(VRA_GOLD, 0.8);
  ctx.beginPath(); ctx.arc(x1, y1, 1.1, 0, TAU); ctx.fill();
  ctx.restore();
}
function vkvHilt(R) {
  ctx.save();
  ctx.translate(R.hip.x + 4.2, R.hip.y - 4.4); ctx.rotate(-0.34);
  ctx.fillStyle = '#6b4f1d'; ctx.fillRect(0.9, -0.95, 9.6, 1.9);
  ctx.fillStyle = '#0b0d14';
  for (let x = 1.2; x < 10.2; x += 1.5) {
    ctx.beginPath(); ctx.moveTo(x, -0.95); ctx.lineTo(x + 1.5, -0.95); ctx.lineTo(x + 0.75, -0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, 0.95); ctx.lineTo(x + 1.5, 0.95); ctx.lineTo(x + 0.75, 0.1); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = '#b45309'; ctx.fillRect(10.4, -1.1, 0.9, 2.2);
  ctx.fillStyle = VRA_GOLD; ctx.beginPath(); ctx.ellipse(0.4, 0, 0.6, 2.2, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function vkvLeg(R, P) {
  const hx = R.hip.x;
  ctx.save();
  ctx.fillStyle = '#080a12';
  ctx.beginPath();
  ctx.moveTo(hx - 1, -22.5);
  ctx.quadraticCurveTo(5, -23.5, 11, -21);
  ctx.quadraticCurveTo(13.6, -18.5, 13, -13);
  ctx.quadraticCurveTo(13.8, -5.5, 16, 0);
  ctx.lineTo(4.6, 0);
  ctx.quadraticCurveTo(6.4, -6.5, 7.4, -12.6);
  ctx.quadraticCurveTo(2, -12.4, hx - 1, -13.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(10, -14); ctx.quadraticCurveTo(10.6, -6, 12.2, 0);
  ctx.moveTo(8.4, -12); ctx.quadraticCurveTo(8.4, -5, 8, 0);
  ctx.stroke();
  ctx.strokeStyle = vriMix('#fef3c7', '#f87171', P.blood, 0.22); ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(4, -23.2); ctx.quadraticCurveTo(9, -22.8, 11.4, -20.8); ctx.stroke();
  ctx.restore();
}
function vkvCloak(R, P) {
  const ta = P.ta, sh = R.sh, nk = R.nk;
  const w1 = Math.sin(ta * 3.1) * 1.2, w2 = Math.sin(ta * 2.3 + 1) * 1.6;
  const cb = { x: nk.x - 3.4, y: nk.y + 1.6 };
  const fc = { x: R.hip.x + 7.5, y: -9 };
  const bk = { x: -33 + w2, y: -2.2 + w1 * 0.8 };
  const back = { x: lerp(-15, -11, P.lean), y: lerp(-29, -26, P.lean) };
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cb.x, cb.y);
  ctx.quadraticCurveTo(sh.x - 1.5, sh.y - 4.2, sh.x + 1.6, sh.y - 1.2);
  ctx.quadraticCurveTo(sh.x + 4.6, sh.y + 7, fc.x, fc.y);
  ctx.quadraticCurveTo(fc.x - 3, -1.2, -4, -0.3);
  ctx.quadraticCurveTo(-18, 0.6 + w1 * 0.4, bk.x, bk.y);
  ctx.quadraticCurveTo(-28 + w2 * 0.6, -14, back.x, back.y);
  ctx.quadraticCurveTo(cb.x - 7, cb.y - 3, cb.x, cb.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(sh.x, sh.y - 6, -20, 0);
  g.addColorStop(0, '#1b2233'); g.addColorStop(0.35, '#0b0f1a'); g.addColorStop(1, '#04060b');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.5; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const k = i / 3;
    ctx.beginPath();
    ctx.moveTo(lerp(sh.x - 2, back.x + 2, k), lerp(sh.y + 2, back.y + 4, k));
    ctx.quadraticCurveTo(lerp(-2, -20, k) + w2 * 0.3 * k, -12, lerp(-6, -28, k) + w2 * k, -1);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(VRA_GOLD, 0.7); ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(sh.x + 1.6, sh.y - 1.2);
  ctx.quadraticCurveTo(sh.x + 4.6, sh.y + 7, fc.x, fc.y);
  ctx.quadraticCurveTo(fc.x - 3, -1.2, -4, -0.3);
  ctx.quadraticCurveTo(-18, 0.6 + w1 * 0.4, bk.x, bk.y);
  ctx.stroke();
  ctx.strokeStyle = vriMix('#fef3c7', '#f87171', P.blood, 0.4); ctx.lineWidth = 0.4;
  ctx.beginPath(); ctx.moveTo(bk.x, bk.y);
  ctx.quadraticCurveTo(-28 + w2 * 0.6, -14, back.x, back.y);
  ctx.quadraticCurveTo(cb.x - 7, cb.y - 3, cb.x, cb.y);
  ctx.quadraticCurveTo(sh.x - 1.5, sh.y - 4.2, sh.x + 1.6, sh.y - 1.2);
  ctx.stroke();
  ctx.restore();
}
/* what the vow costs him: cracks of red opening through him as he lifts it */
function vkvCracks(R, P) {
  const g = P.crack;
  if (g <= 0) return;
  const sh = R.sh, hp = R.hip, fl = 0.85 + 0.15 * Math.sin(P.t * 19);
  const C = [
    [[sh.x - 0.5, sh.y + 0.5], [sh.x - 3, sh.y + 5], [sh.x - 1.8, sh.y + 9], [sh.x - 5.5, sh.y + 14], [sh.x - 4.5, sh.y + 19]],
    [[sh.x - 4, sh.y - 1], [sh.x - 8.5, sh.y + 3], [sh.x - 10, sh.y + 8.5], [sh.x - 15, sh.y + 12], [sh.x - 17, sh.y + 19]],
    [[hp.x - 4, hp.y + 2], [hp.x - 9, hp.y + 5], [hp.x - 12, hp.y + 11], [hp.x - 19, hp.y + 14]]
  ];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  C.forEach((pts, i) => {
    vkvPolyPart(pts, clamp(g * 1.4 - i * 0.2, 0, 1));
    ctx.strokeStyle = rgba('#dc2626', 0.6 * fl); ctx.lineWidth = 1.0; ctx.stroke();
    ctx.strokeStyle = rgba('#fecaca', 0.8 * fl); ctx.lineWidth = 0.25; ctx.stroke();
  });
  ctx.restore();
}
/* the head turns on the neck: bowed against the post, then up for the vow */
function vkvHead(R, P, refl) {
  ctx.save();
  ctx.translate(R.nk.x, R.nk.y); ctx.rotate(P.bow);
  vkvHair(P);
  vkvFace(P);
  vkvCollar();
  vkvKasa(P);
  if (!refl) vkvEye(P);
  ctx.restore();
}
function vkvHair(P) {
  ctx.fillStyle = '#06070c';
  for (let i = 0; i < 5; i++) {
    const L = 5 + vraH(i + 3) * 5, ph = i * 1.4, N = 7, top = [], bot = [];
    let x = -2.6 - i * 0.2, y = -8.0 + i * 0.85;
    for (let j = 0; j <= N; j++) {
      const s = j / N, a = Math.PI + 0.3 - 0.3 * s + 0.35 * s * Math.sin(s * 5 - P.ta * 11 + ph);
      const w = 0.55 * (1 - s) + 0.04, nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      top.push([x + nx, y + ny]); bot.push([x - nx, y - ny]);
      x += Math.cos(a) * L / N; y += Math.sin(a) * L / N;
    }
    ctx.beginPath();
    top.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    for (let j = bot.length - 1; j >= 0; j--) ctx.lineTo(bot[j][0], bot[j][1]);
    ctx.closePath(); ctx.fill();
  }
}
function vkvFace(P) {
  ctx.beginPath();
  ctx.moveTo(-3.4, -8.2);
  ctx.lineTo(5.0, -8.6);
  ctx.quadraticCurveTo(5.4, -7.2, 5.9, -6.4);
  ctx.quadraticCurveTo(6.3, -5.4, 6.9, -4.2);
  ctx.lineTo(5.6, -3.4);
  ctx.lineTo(-3.6, -1.2);
  ctx.quadraticCurveTo(-4.6, -5, -3.4, -8.2);
  ctx.closePath();
  ctx.fillStyle = '#030408'; ctx.fill();
  ctx.strokeStyle = vriMix('#cbd5e1', '#fca5a5', P.blood, 0.2); ctx.lineWidth = 0.18;
  ctx.beginPath(); ctx.moveTo(5.0, -8.4); ctx.quadraticCurveTo(5.4, -7.2, 5.9, -6.4); ctx.quadraticCurveTo(6.3, -5.4, 6.9, -4.2); ctx.stroke();
}
function vkvCollar() {
  ctx.beginPath();
  ctx.moveTo(6.6, -2.4);
  ctx.quadraticCurveTo(7.4, -3.6, 7.0, -4.6);
  ctx.quadraticCurveTo(1.5, -5.0, -3.8, -3.4);
  ctx.quadraticCurveTo(-5.2, -1.6, -5.6, 1.2);
  ctx.quadraticCurveTo(0.5, -0.9, 6.6, -2.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -5, 0, 1);
  g.addColorStop(0, '#1a2132'); g.addColorStop(1, '#07090f');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = rgba(VRA_GOLD, 0.85); ctx.lineWidth = 0.32; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(7.0, -4.6); ctx.quadraticCurveTo(1.5, -5.0, -3.8, -3.4); ctx.stroke();
}
/* the kasa from the side, low over his eyes; the crack the fight has put in it burns as he breaks */
function vkvKasa(P) {
  const Bx = -14, By = -7.4, Fx = 15.2, Fy = -8.8, Ax = 0.8, Ay = -15.6;
  const top = () => { ctx.moveTo(Bx, By); ctx.quadraticCurveTo(-6, -12.8, Ax, Ay); ctx.quadraticCurveTo(8.5, -12.6, Fx, Fy); };
  const crack = () => { ctx.beginPath(); ctx.moveTo(6.5, -12.3); ctx.lineTo(7.6, -10.8); ctx.lineTo(7.1, -9.6); ctx.lineTo(8.3, -8.3); };
  ctx.save();
  ctx.beginPath(); top(); ctx.quadraticCurveTo(1, -5.6, Bx, By); ctx.closePath();
  const g = ctx.createLinearGradient(-4, -16, 6, -6);
  g.addColorStop(0, '#2c2313'); g.addColorStop(0.55, '#16110a'); g.addColorStop(1, '#07080c');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = rgba(VRA_GOLD, 0.13); ctx.lineWidth = 0.16;
  for (let i = 1; i < 14; i++) {
    const k = i / 14;
    ctx.beginPath(); ctx.moveTo(Ax, Ay); ctx.lineTo(lerp(Bx, Fx, k), lerp(By, Fy, k) + Math.sin(k * Math.PI) * 1.4); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.moveTo(Fx, Fy); ctx.quadraticCurveTo(1, -5.6, Bx, By); ctx.quadraticCurveTo(1, -8.2, Fx, Fy); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 0.28;
  crack(); ctx.stroke();
  if (P.crack > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba('#ef4444', 0.8 * P.crack); ctx.lineWidth = 0.22;
    crack(); ctx.stroke();
  }
  ctx.restore();
  ctx.lineCap = 'round';
  ctx.strokeStyle = vriMix('#fef3c7', '#fca5a5', P.blood, 0.55); ctx.lineWidth = 0.38;
  ctx.beginPath(); top(); ctx.stroke();
  ctx.strokeStyle = rgba(VRA_GOLD, 0.85); ctx.lineWidth = 0.42;
  ctx.beginPath(); ctx.moveTo(Fx, Fy); ctx.quadraticCurveTo(1, -5.6, Bx, By); ctx.stroke();
  ctx.fillStyle = VRA_GOLD; ctx.beginPath(); ctx.arc(Ax, Ay - 0.25, 0.75, 0, TAU); ctx.fill();
  ctx.restore();
}
/* the eye: an ember, then open and burning; the crack that runs down from it,
   and the bead of red light it lets go of */
function vkvEye(P) {
  const e = P.eye;
  if (e <= 0) return;
  const kindle = vraIn(clamp(e / 0.45, 0, 1)), open = vraOut(clamp((e - 0.35) / 0.65, 0, 1));
  const flare = P.hit > 0 ? Math.exp(-P.hit * 8) : 0;
  const hot = kindle * (0.35 + 0.65 * open), fl = 0.92 + 0.08 * Math.sin(P.t * 31) * Math.sin(P.t * 17);
  ctx.save();
  ctx.translate(5.0, -5.7); ctx.rotate(0.1);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(0, 0, 2.2 + 5 * hot + 6 * flare, '#dc2626', (0.5 * hot + 0.4 * flare) * fl);
  drawGlow(0, 0, 0.9 + 1.2 * hot, '#ef4444', 0.85 * hot);
  const hh = 0.05 + 0.32 * open;
  ctx.beginPath();
  ctx.moveTo(-0.85, -0.03); ctx.quadraticCurveTo(-0.05, -hh * 1.5, 0.8, 0.06); ctx.quadraticCurveTo(0.05, hh * 0.9, -0.85, -0.03);
  ctx.closePath();
  ctx.fillStyle = rgba('#ef4444', Math.min(1, 0.4 + hot) * fl); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0.03, -0.01, 0.4 * (0.4 + 0.6 * open), hh * 0.45, 0, 0, TAU);
  ctx.fillStyle = rgba('#fee2e2', hot * fl); ctx.fill();
  if (open > 0.6) vraLens(-4 - 6 * open, 0, 4 + 9 * open, 0, 0.22 + 0.3 * flare, '#ef4444', (open - 0.6) * 1.6 * fl);
  if (P.tear > 0) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    vkvPolyPart(VKV_TEAR, P.tear);
    ctx.strokeStyle = rgba('#dc2626', 0.75 * fl); ctx.lineWidth = 0.42; ctx.stroke();
    ctx.strokeStyle = rgba('#fee2e2', 0.85 * fl); ctx.lineWidth = 0.13; ctx.stroke();
    const fall = P.t - VKV_T.tear1;
    if (fall > 0 && fall < 0.7) {
      const end = VKV_TEAR[VKV_TEAR.length - 1];
      drawGlow(end[0] + 0.1, end[1] + 1 + 3 * fall + 9 * fall * fall, 0.9, '#ef4444', 0.8 * (1 - fall / 0.7));
    }
  }
  ctx.restore();
}

/* ------------------------------- the grave post -----------------------------
   Weathered wood cut at the head the way a grave post is, two notches under
   its point, old red cloth tied round it with its ends on the wind. On the
   vow 誓 burns into its face from the top down. */
function vkvPost(R, P, k, refl) {
  const x = R.px, top = R.top, foot = P.foot, w = VKV_POST.w / 2, sd = 1.3, b = P.blood;
  ctx.save();
  ctx.fillStyle = '#100c09';
  ctx.beginPath(); ctx.moveTo(x + w, top + 2.6); ctx.lineTo(x + w + sd, top + 3.2); ctx.lineTo(x + w + sd, foot + 0.5); ctx.lineTo(x + w, foot); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + w, top + 2.6);
  for (const n of [4.6, 8.2]) { ctx.lineTo(x + w, top + n); ctx.lineTo(x + w - 0.9, top + n + 0.8); ctx.lineTo(x + w, top + n + 1.6); }
  ctx.lineTo(x + w, foot); ctx.lineTo(x - w, foot);
  for (const n of [8.2, 4.6]) { ctx.lineTo(x - w, top + n + 1.6); ctx.lineTo(x - w + 0.9, top + n + 0.8); ctx.lineTo(x - w, top + n); }
  ctx.lineTo(x - w, top + 2.6);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, '#4b3c2d'); g.addColorStop(0.45, '#2c231a'); g.addColorStop(1, '#1a140f');
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(14,10,7,0.55)'; ctx.lineWidth = 0.22;
  for (let i = 0; i < 6; i++) {
    const gx = x - w + 0.5 + i * (2 * w - 1) / 5;
    ctx.beginPath(); ctx.moveTo(gx, top + 2);
    for (let y = top + 2; y <= foot; y += 4) ctx.lineTo(gx + Math.sin(y * 0.4 + i * 2.1) * 0.25, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(8,6,4,0.7)'; ctx.lineWidth = 0.18;   // a split in it, from the weather
  ctx.beginPath(); ctx.moveTo(x + 0.8, top + 26); ctx.lineTo(x + 1.1, top + 31); ctx.lineTo(x + 0.6, top + 35); ctx.lineTo(x + 0.9, top + 40); ctx.stroke();
  if (b > 0) { ctx.fillStyle = rgba('#7f1d1d', 0.35 * b); ctx.fillRect(x - w - 1, top - 1, 2 * w + 2, foot - top + 2); }
  ctx.restore();
  ctx.strokeStyle = vriMix('#fef3c7', '#f87171', b, 0.45); ctx.lineWidth = 0.32; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - w, foot);
  ctx.lineTo(x - w, top + 9.8); ctx.lineTo(x - w + 0.9, top + 9.0); ctx.lineTo(x - w, top + 8.2);
  ctx.lineTo(x - w, top + 6.2); ctx.lineTo(x - w + 0.9, top + 5.4); ctx.lineTo(x - w, top + 4.6);
  ctx.lineTo(x - w, top + 2.6); ctx.lineTo(x, top); ctx.lineTo(x + w, top + 2.6);
  ctx.stroke();
  vkvBand(x, top, w, sd, P);
  if (!refl) vkvBrand(x, top, w, P, k);
  ctx.restore();
}
function vkvBand(x, top, w, sd, P) {
  const y0 = top + 11.2, h = 2.4, b = P.blood;
  ctx.fillStyle = vriMix('#6f1d1b', '#b91c1c', b);
  ctx.fillRect(x - w - 0.25, y0, 2 * w + sd + 0.5, h);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - w - 0.25, y0 + h * 0.62, 2 * w + sd + 0.5, h * 0.38);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.12;   // its weave
  ctx.beginPath();
  for (let i = 1; i < 8; i++) { const yy = y0 + i * h / 8; ctx.moveTo(x - w - 0.25, yy); ctx.lineTo(x + w + sd + 0.25, yy); }
  ctx.stroke();
  const ox = x - w - 0.3, oy = y0 + h * 0.5, N = 10, ta = P.ta;
  for (const [L, ph, wd] of [[13, 0, 1.15], [10, 2.2, 0.95]]) {
    let px = ox, py = oy, prev = null;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const a = lerp(Math.PI - 0.18, 1.5 * Math.PI - 0.15, P.stream) - 0.25 * s * (1 - P.stream) + 0.45 * s * Math.sin(s * 6 - ta * 8 + ph);
      const tw = wd * (1 - 0.5 * s) * (0.45 + 0.55 * Math.abs(Math.cos(s * 4.5 - ta * 6 + ph)));
      const cur = { x: px, y: py, nx: -Math.sin(a) * tw, ny: Math.cos(a) * tw };
      if (prev) {
        ctx.fillStyle = vriMix('#7f1d1d', '#dc2626', b * (0.6 + 0.4 * s));
        ctx.beginPath();
        ctx.moveTo(prev.x + prev.nx, prev.y + prev.ny); ctx.lineTo(cur.x + cur.nx, cur.y + cur.ny);
        ctx.lineTo(cur.x - cur.nx, cur.y - cur.ny); ctx.lineTo(prev.x - prev.nx, prev.y - prev.ny); ctx.closePath(); ctx.fill();
      }
      prev = cur;
      px += Math.cos(a) * L / N; py += Math.sin(a) * L / N;
    }
  }
}
function vkvGlyph(ch, x, y, size, k, col, a) {
  if (a <= 0.003) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(1 / k, 1 / k);
  ctx.font = '900 ' + Math.max(4, Math.round(size * k)) + 'px ' + VKV_JP;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = rgba(col, clamp(a, 0, 1));
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}
function vkvBrand(x, top, w, P, k) {
  const e = P.burn;
  if (e <= 0) return;
  const cy = top + 17, size = 4.4, flare = P.hit > 0 ? Math.exp(-P.hit * 9) : 0;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - w, cy - size * 0.62, 2 * w, size * 1.24 * vraOut(e)); ctx.clip();
  vkvGlyph(VKV_KANJI, x + 0.15, cy + 0.15, size * 1.04, k, '#0b0605', 0.8 * e);
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = rgba('#ef4444', 0.9); ctx.shadowBlur = 6 + 10 * flare;
  vkvGlyph(VKV_KANJI, x, cy, size, k, '#ef4444', (0.75 + 0.25 * Math.sin(P.t * 23) * (1 - e)) * e);
  ctx.shadowBlur = 0;
  vkvGlyph(VKV_KANJI, x, cy, size, k, '#fee2e2', (0.35 * (1 - e) + 0.25 + 0.6 * flare) * e);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, cy, 6 + 6 * flare, '#dc2626', (0.35 + 0.4 * flare) * e);
  ctx.restore();
}

/* --------------------------------- the blow --------------------------------- */
function vkvSplash(P) {
  const h = P.hit;
  if (h <= 0) return;
  const x = VKV_POST.x1, r = vraOut(h / 0.22), fade = clamp(1 - h / 0.6, 0, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, -1, 10 + 30 * vraOut(h / 0.1), '#dc2626', 0.9 * Math.exp(-h * 6));
  drawGlow(x, -1, 5 + 6 * vraOut(h / 0.06), '#fee2e2', 0.9 * Math.exp(-h * 14));
  for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) {
    const hh = (6 + 16 * r) * (1 - j * 0.22);
    vraLens(x + sd * (2.4 + j * 0.6), 0, x + sd * (4 + 12 * r + j * 2.5), -hh, 0.7 - j * 0.15, '#fecaca', 0.55 * fade);
  }
  for (let i = 0; i < 30; i++) {
    const a = -Math.PI / 2 + (vraH(i + 900) - 0.5) * 2.7, v = 60 + 120 * vraH(i + 930), g = 240;
    const px = x + Math.cos(a) * v * h, py = Math.sin(a) * v * h + 0.5 * g * h * h;
    if (py > 0.5) continue;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v + g * h;
    vraLens(px - vx * 0.03, py - vy * 0.03, px, py, 0.32 + 0.3 * vraH(i + 960), i % 3 ? '#fecaca' : '#ffffff', 0.85 * fade);
  }
  ctx.restore();
}
/* the vow on him: a red breath round him, and embers going up off him and the post */
function vkvAura(P) {
  if (P.blood <= 0 && P.eye <= 0) return;
  const R = vkvRig(P), pulse = 0.85 + 0.15 * Math.sin(P.t * 9);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(R.sh.x - 2, R.sh.y + 6, 34, '#7f1d1d', 0.35 * P.blood * pulse);
  for (let i = 0; i < 30; i++) {
    const t0 = VKV_T.eye0 + vraH(i + 1200) * 1.1, life = 0.7 + 0.5 * vraH(i + 1230), age = P.ta - vkvTa(t0);
    if (age <= 0 || age >= life) continue;
    const q = age / life, src = i % 3;
    const x0 = src === 0 ? R.px + (vraH(i + 1260) - 0.5) * 5 : src === 1 ? R.sh.x + (vraH(i + 1290) - 0.5) * 8 : -12 + vraH(i + 1320) * 16;
    const y0 = src === 0 ? R.top + 6 + vraH(i + 1350) * 30 : src === 1 ? R.sh.y + vraH(i + 1380) * 8 : -8 - vraH(i + 1410) * 20;
    const x = x0 - 10 * q - 3 * Math.sin(q * 5 + i), y = y0 - 22 * q;
    drawGlow(x, y, 2.4, '#ef4444', 0.5 * (1 - q));
    ctx.fillStyle = rgba('#fecaca', 0.9 * (1 - q)); ctx.beginPath(); ctx.arc(x, y, 0.32, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function vkvFlash(F, P) {
  const h = P.hit;
  if (h <= 0) return;
  const s = vkvImpact(F), k = Math.exp(-h * 9), reach = W * 0.6 * vraOut(h / 0.08);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#7f1d1d', 0.45 * k); ctx.fillRect(0, 0, W, H);
  drawGlow(s.x, s.y, H * (0.25 + 0.35 * vraOut(h / 0.12)), '#dc2626', 0.6 * k);
  vraLens(s.x - reach, s.y, s.x + reach, s.y, (1.5 + 4 * k) * H / 720, '#fca5a5', 0.8 * k);
  ctx.restore();
}
/* what he says: もう離れない brushed down the right of the frame, ivory going
   to red as the moon does; and the words, quiet, over the lower bar */
function vkvSay(F, P) {
  const t = P.t, T = VKV_T;
  if (t < T.say0) return;
  const fs = Math.round(F.u * 6.4), x = W - Math.max(56, W * 0.085), y0 = F.bar + F.u * 9;
  const chars = Array.from(VKV_SAY);
  ctx.save();
  ctx.font = '700 ' + fs + 'px ' + VKV_JP;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  chars.forEach((ch, i) => {
    const k = vraOut((t - T.say0 - i * 0.07) / 0.2);
    if (k <= 0) return;
    const y = y0 + i * fs * 1.12;
    ctx.save();
    ctx.beginPath(); ctx.rect(x - fs, y - 4, fs * 2, (fs * 1.12 + 4) * k); ctx.clip();
    ctx.shadowColor = vriMix('#fde68a', '#dc2626', P.blood, 0.7); ctx.shadowBlur = 16;
    ctx.fillStyle = vriMix('#fef3c7', '#ef4444', P.blood, 0.92);
    ctx.fillText(ch, x, y);
    ctx.restore();
  });
  const a = vraEase((t - T.say0 - 0.15) / 0.3) * (1 - vraEase((t - T.sayOff) / 0.2));
  if (a > 0.01) {
    ctx.font = 'italic 500 ' + Math.max(13, Math.round(F.u * 3.1)) + 'px ' + VRA_FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '0.05em';
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 8;
    ctx.fillStyle = rgba('#fef3c7', 0.9 * a);
    ctx.fillText(VKV_SAY_EN, W / 2, H - F.bar - F.u * 4);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
}
function vkvPlate(F, t) {
  const P = vkvPose(t);
  vkvSky(F, P);
  vkvMoon(F, P);
  vkvClouds(F, P);
  vkvRidge(F, VKV_HZ, '#05070f', vriMix('#cbd5e1', '#f87171', P.blood, 0.1));
  vriAt(F, 0.3, () => vkvTree(-72, VKV_HZ + 0.3, 0.7, 0, '#05070f', vriMix('#cbd5e1', '#f87171', P.blood, 0.2)));   // the same tree, bare now
  vkvWater(F, P);
  vriAt(F, 1, k => {                              // his reflection, under him
    ctx.translate(VKV_FX, VKV_GY); ctx.scale(VKV_S, -VKV_S * 0.9);
    ctx.globalAlpha = 0.42;
    vkvFigure(P, k * VKV_S, true);
  });
  vkvBreakUp(F, P);
  vriAt(F, 1, () => { ctx.translate(VKV_FX, VKV_GY); ctx.scale(VKV_S, VKV_S); vkvRings(P); });
  vkvFloaters(F, P);
  vkvPetals(F, P, 0.7, 22, 3, 1.1, 10, 300);
  vriAt(F, 1, k => {
    ctx.translate(VKV_FX, VKV_GY); ctx.scale(VKV_S, VKV_S);
    vkvFigure(P, k * VKV_S, false);
    vkvSplash(P);
    vkvAura(P);
  });
  vkvPetals(F, P, 1.6, 6, 61, 2.4, 10, 330);
  vkvFlash(F, P);
  vkvSay(F, P);
}

/* ----------------------------- putting it together -------------------------- */
// the memory, then burning away onto the present; the red it leaves, a moment
function vkvScene(F, t) {
  const T = VKV_T;
  if (t < T.burn0) { vkvMemory(t); return; }
  vkvPlate(F, t);
  if (t < T.burn1) { vkvBurn(t, () => vkvMemory(t)); return; }
  const k = 1 - vkvSeg(t, T.burn1, T.burn1 + 0.4);
  if (k > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(W / 2, H / 2, H * 0.14, '#dc2626', 0.35 * k);
    ctx.restore();
  }
}
/* on: an ink brush wipes it across, a gold edge leading */
function vkvWipe(t, plate) {
  const k = vraOut(t / VKV_T.in);
  if (k >= 1) { plate(); return; }
  const n = 12, ex = y => lerp(-0.4 * W, 1.4 * W, k) - (y - H / 2) * 0.35;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(-10, -2);
  for (let i = 0; i <= n; i++) { const y = lerp(-2, H + 2, i / n); ctx.lineTo(ex(y) + (vraH(i * 7.1) - 0.5) * W * 0.03, y); }
  ctx.lineTo(-10, H + 2); ctx.closePath(); ctx.clip();
  plate();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  vraLens(ex(0), 0, ex(H), H, 7, '#f59e0b', 0.7 * (1 - k));
  vraLens(ex(0), 0, ex(H), H, 2, '#fffbeb', 0.6 * (1 - k));
  ctx.restore();
}
/* the letterbox, its inner edge gold going to red with the moon; the name on the lower bar */
function vkvBars(F, barK, nameK, red) {
  const b = F.bar * barK;
  if (b < 0.5) return;
  ctx.save();
  ctx.fillStyle = VRA_INK;
  ctx.fillRect(0, 0, W, b); ctx.fillRect(0, H - b, W, b);
  ctx.fillStyle = vriMix('#fde68a', '#dc2626', red, 0.3 * barK);
  ctx.fillRect(0, b - 1, W, 1); ctx.fillRect(0, H - b, W, 1);
  if (nameK > 0) {
    const y = H - b / 2, fs = Math.max(14, Math.round(F.bar * 0.26)), js = Math.max(9, Math.round(fs * 0.5));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + fs + 'px ' + VRA_DISP;
    ctx.letterSpacing = (0.42 + 0.3 * (1 - nameK)).toFixed(3) + 'em';
    ctx.shadowColor = rgba('#dc2626', 0.8 * nameK); ctx.shadowBlur = 14;
    ctx.fillStyle = rgba('#ef4444', nameK);
    ctx.fillText(VKV_NAME, W / 2 + fs * 0.21, y - fs * 0.3);
    ctx.shadowBlur = 0;
    ctx.font = '700 ' + js + 'px ' + VKV_JP;
    ctx.letterSpacing = '0.5em';
    ctx.fillStyle = rgba(RKV_BONE, 0.75 * nameK);
    ctx.fillText(VKV_NAME_JP, W / 2 + js * 0.25, y + fs * 0.62);
    ctx.letterSpacing = '0px';
  }
  ctx.restore();
}
/* the cut-in, the press to the cut */
function vkvCutIn(t) {
  const T = VKV_T, F = vkvFrame(t), hush = vraOut(t / 0.3);
  ctx.save();
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, rgba(VRA_INK, 0.5 * hush)); g.addColorStop(1, rgba(VRA_INK, 0.88 * hush));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  vkvWipe(t, () => vkvScene(F, t));
  vkvBars(F, vraOut(t / 0.3), vraOut(vkvSeg(t, T.name0, T.name0 + 0.3)), vriGlide(vkvSeg(t, T.blood0, T.blood1)));
  ctx.restore();
}

/* ------------------------------ the frame breaks -----------------------------
   On the cut the plate is drawn once more as it stands, kept (vkvCache: the
   room under it is kept first and put back), and broken along cracks that run
   out from where the post went in: 11 rays and a ring across them, 22 pieces.
   The pieces nearest the blow go first. Screen pixels throughout. */
function vkvShards(O) {
  const hyp = Math.hypot(W, H), R = hyp * 1.6, n = 11, rays = [], S = [];
  for (let i = 0; i < n; i++) {
    const a = (i + 0.25 + 0.5 * vraH(i * 3.3 + 1)) / n * TAU;
    const at = f => {
      const j = (vraH(i * 7.7 + f * 13.1) - 0.5) * 0.14;
      return { x: O.x + Math.cos(a + j) * R * f, y: O.y + Math.sin(a + j) * R * f };
    };
    const ring = 0.075 + 0.045 * vraH(i * 5.9 + 2);
    rays.push({ inn: [at(0.025), at(ring * 0.55)], ring: at(ring), out: [at(ring + 0.1), at(ring + 0.26), at(1)] });
  }
  for (let i = 0; i < n; i++) {
    const A = rays[i], B = rays[(i + 1) % n], f = 1.04 + 0.06 * vraH(i + 77);
    const m = { x: O.x + ((A.ring.x + B.ring.x) / 2 - O.x) * f, y: O.y + ((A.ring.y + B.ring.y) / 2 - O.y) * f };
    S.push(vkvShard(O, [O, A.inn[0], A.inn[1], A.ring, m, B.ring, B.inn[1], B.inn[0]], true, S.length, hyp));
    S.push(vkvShard(O, [A.ring, A.out[0], A.out[1], A.out[2], B.out[2], B.out[1], B.out[0], B.ring, m], false, S.length, hyp));
  }
  return S;
}
function vkvShard(O, pts, inner, i, hyp) {
  let cx = 0, cy = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    const qx = clamp(p.x, 0, W), qy = clamp(p.y, 0, H);
    cx += qx; cy += qy;
    x0 = Math.min(x0, qx); x1 = Math.max(x1, qx); y0 = Math.min(y0, qy); y1 = Math.max(y1, qy);
  }
  cx /= pts.length; cy /= pts.length;
  const dx = cx - O.x, dy = cy - O.y, d = Math.hypot(dx, dy) || 1, h = vraH(i * 4.3 + 11);
  return { pts, cx, cy, x0, y0, x1, y1, ux: dx / d, uy: dy / d,
           v: H * (inner ? 1.5 + 0.8 * h : 0.55 + 0.6 * h), w: (h - 0.5) * (inner ? 6 : 2.4),
           delay: 0.012 + 0.09 * clamp(d / hyp, 0, 1) };
}
function vkvCache() {
  const key = W + 'x' + H + '#' + VKV.id;
  if (VKV.key === key && VKV.buf) return;
  const w = cv.width, h = cv.height;
  const mk = c => { c = c || document.createElement('canvas'); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; };
  VKV.room = mk(VKV.room); VKV.buf = mk(VKV.buf);
  const rg = VKV.room.getContext('2d'), bg = VKV.buf.getContext('2d');
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'copy'; rg.drawImage(cv, 0, 0); rg.globalCompositeOperation = 'source-over';
  ctx.save();
  vkvPlate(vkvFrame(VOW_T_CUT), VOW_T_CUT);
  ctx.restore();
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalCompositeOperation = 'copy'; bg.drawImage(cv, 0, 0); bg.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'copy'; ctx.drawImage(VKV.room, 0, 0); ctx.restore();
  VKV.key = key; VKV.dpr = w / W;
  VKV.O = vkvImpact(vkvFrame(VOW_T_CUT));
  VKV.shards = vkvShards(VKV.O);
}
function vkvShatter(age) {
  vkvCache();
  const O = VKV.O, S = VKV.shards, dpr = VKV.dpr;
  if (!O || !S) return;
  const hyp = Math.hypot(W, H), crack = vraOut(age / 0.06), edgeA = 1 - vraEase(age / 0.28);
  ctx.save();
  const dim = 1 - vraEase(age / 0.4);
  if (dim > 0) { ctx.fillStyle = rgba(VRA_INK, 0.65 * dim); ctx.fillRect(0, 0, W, H); }
  for (const s of S) {
    const ts = Math.max(0, age - s.delay), a = 1 - vraEase((ts - 0.1) / 0.26);
    if (a <= 0) continue;
    const dx = s.ux * s.v * ts, dy = s.uy * s.v * ts + 1.5 * H * ts * ts, sc = 1 - 0.32 * vraEase(ts / 0.4);
    ctx.save();
    ctx.translate(s.cx + dx, s.cy + dy); ctx.rotate(s.w * ts); ctx.scale(sc, sc); ctx.translate(-s.cx, -s.cy);
    ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    ctx.save();
    ctx.clip();
    const bx = s.x0, by = s.y0, bw = s.x1 - s.x0, bh = s.y1 - s.y0;
    if (bw > 0.5 && bh > 0.5) {
      ctx.globalAlpha = a;
      ctx.drawImage(VKV.buf, bx * dpr, by * dpr, bw * dpr, bh * dpr, bx, by, bw, bh);
      if (ts > 0) { ctx.fillStyle = rgba(VRA_INK, 0.35 * vraEase(ts / 0.3)); ctx.fillRect(bx, by, bw, bh); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (edgeA > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      if (crack < 1) { ctx.save(); ctx.beginPath(); ctx.arc(O.x, O.y, crack * hyp * 1.05, 0, TAU); ctx.clip(); }
      ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
      ctx.strokeStyle = rgba('#dc2626', 0.75 * edgeA * a); ctx.lineWidth = 3.2; ctx.stroke();
      ctx.strokeStyle = rgba('#fff1f2', 0.9 * edgeA * a); ctx.lineWidth = 1; ctx.stroke();
      if (crack < 1) ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }
  const fk = Math.exp(-age * 10);
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(O.x, O.y, H * (0.3 + 0.5 * vraOut(age / 0.15)), '#dc2626', 0.7 * fk);
  drawGlow(O.x, O.y, H * 0.08, '#fee2e2', 0.9 * fk);
  ctx.globalCompositeOperation = 'source-over';
  vkvBars(vkvFrame(VOW_T_CUT), 1 - vraEase(age / 0.3), 1 - vraEase(age / 0.25), 1);
  ctx.restore();
}
/* through the vow: its red edge (the placeholder's, still to be drawn), coming in behind the pieces */
function vkvEdge(q) {
  const k = vraEase(q.age / 0.5);
  if (k <= 0) return;
  const beat = 0.5 + 0.5 * Math.sin(uiTime * (q.left < 5 ? 12 : 4));
  const edge = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  edge.addColorStop(0, 'rgba(127,29,29,0)');
  edge.addColorStop(1, 'rgba(127,29,29,' + ((0.32 + 0.14 * beat) * k).toFixed(3) + ')');
  ctx.fillStyle = edge; ctx.fillRect(0, 0, W, H);
}
// the hook: the cut-in while q.cut is false, then the frame breaking and the vow's edge
function drawRoninVowScreen(q) {
  const sc = skyClearPhase();
  if (sc) { drawRoninSkyClearScreen(sc); return; }
  if (!q.cut) { vkvCutIn(q.t); return; }
  ctx.save();
  vkvEdge(q);
  if (q.age < 0.6) vkvShatter(q.age);
  ctx.restore();
}
/* ===================== end of V: LAST VOW, the cut-in ===================== */
