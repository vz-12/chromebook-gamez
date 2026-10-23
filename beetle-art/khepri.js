/* ===========================================================================
   EMBER · THE BLUE BEETLE — V, FUSION CORE: KHEPRI (BEETLE-PLAN.md, step 5)
   The stock V makes EMBER a star: IFRIT, cupping a sun. The beetle becomes
   Khepri, the scarab that rolls the sun across the sky. Same logic, same
   timings (FUSION_*, STAR_*), the stock state (P.odFusion, odStars,
   odStarBooms, odFusionThrow), drawn in the stock layers.

     THE CHANGE   blue fire spirals in, the beetle's outline swells into the
                  scarab's, broader and rounder with a toothed head-shield and
                  forelegs reaching forward, and the sun lights between them.
                  Going out, the fire is thrown off and it shrinks back.
     KHEPRI       lit from the front by the sun it holds: a broad domed shell
                  split by its seam, a wide pronotum, the head-shield's rake of
                  six teeth, toothed forelegs cradling the sun, the middle and
                  hind legs braced at its sides, plasma wings half spread, and
                  the body behind melted to a lashing tail of blue fire.
     THE SUN      held at the front: a white core, a turning photosphere,
                  corona rays. Each throw flicks one foreleg, then the other,
                  and the sun dims and swells back.
     THE AURA     a blue sun's surface at exactly FUSION_AURA_R: convection
                  turning inside it, prominences looping off the rim.
     THE STARS    little blue suns, each rolled along by a small scarab on its
                  back. They swell round what they take in, heat white as the
                  fuse runs, pinch, and go up in a fireball and a shock ring;
                  the scarab with them.
     THE SCREEN   a blue edge while it burns, a cold flash as it is whole, a
                  dark indigo as it goes out.

     btlKhepriForm(f)                      0 the beetle … 1 Khepri (odFusionForm's shape)
     btlKhepriAura(me, f, t)               world, under the hull (drawOdFusionAura)
     btlKhepriHull(B, me, f, t, thrown)    world: the hull (drawOdFusionHull);
                                           thrown is odFusionThrow { at, hand }
     btlKhepriStars(stars, booms, t)       world, additive (drawOdStars)
     btlKhepriScreen(f, t, outAt, W, H)    screen (drawOdFusionScreen)
=========================================================================== */

const BTL_KH = {
  sun: [16.5, 0], sunR: 6.2,
  white: '#f0fdff', ice: '#cffafe', cyan: '#22d3ee', sky: '#38bdf8', blue: '#2563eb', deep: '#312e81',
  violet: '#6d28d9', orchid: '#a855f7', ink: '#050414', chitin: '#0c0a24'
};
const btlSub = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const btlBackOut = u => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
// 0 the beetle … 1 Khepri: the change in over FUSION_IN, back out over FUSION_OUT
function btlKhepriForm(f) {
  if (!f) return 1;
  const tin = f.t, tout = f.life - f.t;
  if (tout < FUSION_OUT) return osEase(btlSub(tout, 0.08, FUSION_OUT - 0.05));
  return btlSub(tin, 0.12, FUSION_IN);
}
// lit, past the change in and short of the change back (odFusionK's shape)
const btlKhepriK = f => f ? clamp((f.t - 0.7) / 0.5, 0, 1) * clamp((f.life - f.t - 0.45) / 0.45, 0, 1) : 1;

/* ================================= THE AURA =============================== */
function btlKhepriAura(me, f, t) {
  if (!f) return;
  const R = FUSION_AURA_R, k = btlKhepriK(f);
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(me.x, me.y, R * 0.2, me.x, me.y, R);
  g.addColorStop(0, rgba(BTL_KH.sky, 0.14 * k)); g.addColorStop(0.7, rgba(BTL_KH.blue, 0.08 * k)); g.addColorStop(1, rgba(BTL_KH.violet, 0.14 * k));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(me.x, me.y, R, 0, TAU); ctx.fill();
  // convection: broken rings turning opposite ways
  ctx.lineCap = 'round';
  for (let j = 0; j < 3; j++) {
    const rr = R * (0.45 + j * 0.17), dir = j % 2 ? -1 : 1;
    ctx.setLineDash([rr * 0.18, rr * 0.3]); ctx.lineDashOffset = dir * t * (30 + j * 12);
    ctx.globalAlpha = (0.18 + 0.06 * Math.sin(t * 3 + j)) * k; ctx.strokeStyle = j === 1 ? BTL_KH.ice : BTL_KH.sky;
    ctx.lineWidth = 3 - j * 0.6;
    ctx.beginPath(); ctx.arc(me.x, me.y, rr, 0, TAU); ctx.stroke();
  }
  ctx.setLineDash([]);
  // prominences: loops rising off the rim and falling back
  for (let i = 0; i < 7; i++) {
    const ph = (t * 0.35 + i / 7 + (f.seed || 0)) % 1, life = Math.sin(ph * Math.PI);
    const a = i * TAU / 7 + t * 0.15 + Math.sin(i * 3.1) * 0.4, span = 0.18 + 0.08 * Math.sin(i * 1.7), h = R * (0.1 + 0.22 * life);
    const x1 = me.x + Math.cos(a - span) * R, y1 = me.y + Math.sin(a - span) * R;
    const x2 = me.x + Math.cos(a + span) * R, y2 = me.y + Math.sin(a + span) * R;
    const cx = me.x + Math.cos(a) * (R + h * 2), cy = me.y + Math.sin(a) * (R + h * 2);
    ctx.globalAlpha = 0.5 * life * k; ctx.strokeStyle = BTL_KH.blue; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
    ctx.globalAlpha = 0.7 * life * k; ctx.strokeStyle = BTL_KH.ice; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
  }
  // the rim: exactly what burns
  ctx.globalAlpha = (0.55 + 0.15 * Math.sin(t * 5)) * k; ctx.strokeStyle = BTL_KH.ice; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.arc(me.x, me.y, R, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.25 * k; ctx.strokeStyle = BTL_KH.sky; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(me.x, me.y, R, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* ================================ THE SCARAB ==============================
   In the hull's frame: x forward, y to starboard. */
function btlKhPathShell(s) {
  ctx.beginPath();
  ctx.moveTo(-1.8, 0.4 * s);
  ctx.quadraticCurveTo(-1.3, 6.6 * s, -3.0, 10.6 * s);
  ctx.bezierCurveTo(-5.6, 13.3 * s, -12.6, 13.1 * s, -15.6, 8.0 * s);
  ctx.quadraticCurveTo(-17.7, 3.6 * s, -16.9, 0.4 * s);
  ctx.closePath();
}
function btlKhPathPronotum() {
  ctx.beginPath();
  ctx.moveTo(7.4, -6.2);
  ctx.quadraticCurveTo(5.6, 0, 7.4, 6.2);
  ctx.bezierCurveTo(7.8, 10.4, 2.2, 11.6, -1.6, 10.8);
  ctx.quadraticCurveTo(-3.4, 10.2, -2.6, 8);
  ctx.quadraticCurveTo(-3.5, 0, -2.6, -8);
  ctx.quadraticCurveTo(-3.4, -10.2, -1.6, -10.8);
  ctx.bezierCurveTo(2.2, -11.6, 7.8, -10.4, 7.4, -6.2);
  ctx.closePath();
}
// the head-shield: a half round with a rake of six teeth on its front edge
function btlKhPathHead() {
  ctx.beginPath();
  ctx.moveTo(6.6, -5.4);
  const cx = 7.4, R0 = 5.6, n = 13;
  for (let i = 0; i <= n; i++) {
    const a = -1.2 + 2.4 * i / n, r = i % 2 ? R0 + 1.5 : R0;
    ctx.lineTo(cx + Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.lineTo(6.6, 5.4);
  ctx.quadraticCurveTo(5.4, 0, 6.6, -5.4);
  ctx.closePath();
}
/* one leg, as a jointed stroke from hip to knee to foot, thick at the hip,
   with spurs: teeth along the outside of a foreleg's tibia */
function btlKhLeg(hx, hy, kx, ky, fx, fy, w, teeth, rim) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = BTL_KH.chitin; ctx.lineWidth = w * 1.5;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = rim; ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  // the joint and the foot catch the light
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  drawGlow(kx, ky, w * 1.6, BTL_KH.sky, 0.4); drawGlow(fx, fy, w * 1.3, BTL_KH.cyan, 0.35);
  ctx.restore();
  if (!teeth) return;
  const dx = fx - kx, dy = fy - ky, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const out = Math.sign(ky) || 1;
  ctx.fillStyle = BTL_KH.chitin;
  for (let i = 1; i <= teeth; i++) {
    const u = 0.25 + 0.7 * i / teeth, x = kx + dx * u, y = ky + dy * u, side = nx * out > 0 || ny * out > 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - ux * 0.6, y - uy * 0.6);
    ctx.lineTo(x + nx * side * 1.5 + ux * 0.3, y + ny * side * 1.5 + uy * 0.3);
    ctx.lineTo(x + ux * 0.6, y + uy * 0.6);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 0.3; ctx.stroke();
  }
}
// the sun it holds, in the hull's frame at (x, y)
function btlKhSun(x, y, r, t, k, heat = 0) {
  if (k <= 0.01 || r <= 0.2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(x, y, r * 5, BTL_KH.blue, 0.35 * k);
  drawGlow(x, y, r * 2.6, BTL_KH.sky, 0.45 * k);
  // the corona: rays turning slowly round it
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 + t * 0.6, fl = 0.75 + 0.25 * Math.sin(t * 7 + i * 1.9);
    ctx.globalAlpha = 0.32 * k; ctx.fillStyle = i % 2 ? BTL_KH.sky : BTL_KH.ice;
    btlLeaf(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, a, r * (0.9 + 0.7 * fl), r * 0.16, Math.sin(t * 3 + i) * r * 0.2); ctx.fill();
  }
  // the photosphere, and its grain turning
  const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  g.addColorStop(0, rgba(BTL_KH.white, k)); g.addColorStop(0.45, rgba(btlMix(BTL_KH.ice, BTL_KH.white, heat), k));
  g.addColorStop(0.8, rgba(btlMix(BTL_KH.sky, BTL_KH.white, heat), 0.9 * k)); g.addColorStop(1, rgba(BTL_KH.blue, 0.5 * k));
  ctx.globalAlpha = 1; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba(BTL_KH.blue, 0.25 * k);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + t * 1.3, d = r * (0.35 + 0.4 * ((i * 0.37) % 1));
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.12, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function btlKhepriHull(B, me, f, t, thrown) {
  const form = btlKhepriForm(f), going = f ? f.life - f.t < FUSION_OUT : false;
  const m = going ? form : btlBackOut(form);           // the shape overshoots a touch on the way in
  const writhe = Math.sin(Math.PI * clamp(form, 0, 1));
  const detail = btlSub(form, 0.72, 1), shell = 1 - btlSub(form, 0, 0.45);
  const flick = thrown ? clamp(1 - (t - thrown.at) / 0.22, 0, 1) * detail : 0, hand = thrown ? thrown.hand : 1;
  // the beetle, going: drawn as it was, fading and drawn in
  if (shell > 0.01) {
    ctx.save();
    ctx.globalAlpha = shell;
    ctx.translate(me.x, me.y); ctx.scale(1 - 0.15 * (1 - shell), 1 - 0.15 * (1 - shell)); ctx.translate(-me.x, -me.y);
    btlDrawUnder(B, me); btlDrawHull(B, me);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(me.x, me.y);
  // fire dragged in round it (in) or thrown off it (out) while it changes
  if (writhe > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const q = ((i / 12) + t * (going ? 0.9 : -0.9) + 10) % 1, r = going ? 14 + q * 56 : 70 - q * 56;
      const an = i * TAU / 12 + t * (going ? 4 : -5) + q * 2;
      ctx.globalAlpha = 0.5 * writhe * Math.sin(q * Math.PI);
      ctx.fillStyle = i % 3 ? BTL_KH.sky : BTL_KH.ice;
      btlLeaf(Math.cos(an) * r, Math.sin(an) * r, an + (going ? 1.9 : -1.9), 9 + 7 * writhe, 2.4, 3); ctx.fill();
    }
    drawGlow(0, 0, 44 + 20 * writhe, BTL_KH.blue, 0.4 * writhe);
    ctx.restore();
  }
  ctx.restore();
  if (form <= 0.01) return;

  // the tail: the body behind it, melted to blue fire along the chain
  const p = B.body.p;
  if (p.length > 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = form;
    const pts = p.map((q, i) => {
      const w = Math.sin(t * 8 - i * 0.9) * 4.5 * (i / p.length);   // it lashes, harder toward the tip
      const a = i ? Math.atan2(q.y - p[i - 1].y, q.x - p[i - 1].x) : me.ang + Math.PI;
      return { x: q.x - Math.sin(a) * w, y: q.y + Math.cos(a) * w };
    });
    for (const [w0, col, a] of [[13, BTL_KH.violet, 0.3], [9, BTL_KH.blue, 0.45], [5, BTL_KH.sky, 0.6], [2, BTL_KH.white, 0.8]]) {
      moRibbon(pts, w0 * (0.9 + 0.1 * Math.sin(t * 13)), 0.4, { cap: 'round', ease: u => Math.pow(u, 0.7) });
      ctx.fillStyle = rgba(col, a); ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(me.x, me.y);
  ctx.rotate(me.ang);
  ctx.scale(m, m);
  ctx.globalAlpha = clamp(form * 1.4, 0, 1);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const k = btlSheen(me.ang), rim = btlMix(BTL.cyan, BTL.pink, k * 0.5);
  const lx = 1, ly = 0;                                 // lit from the front, by the sun
  const [sx, sy] = BTL_KH.sun, sr = BTL_KH.sunR * (1 + 0.05 * Math.sin(t * 6)) * (1 - 0.3 * flick);

  // the plasma wings, half spread under the shell
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    const beat = Math.sin(t * 6 + s) * 0.08;
    ctx.save();
    ctx.translate(-4, 4 * s); ctx.rotate(s * (2.25 + beat));
    const L = 24 * detail;
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * 0.3, -4 * s, L * 0.85, -3.4 * s, L, 0.4 * s);
    ctx.bezierCurveTo(L * 0.8, 3.8 * s, L * 0.3, 3.4 * s, 0, 1.2 * s); ctx.closePath();
    const wg = ctx.createLinearGradient(0, 0, L, 0);
    wg.addColorStop(0, rgba(BTL_KH.sky, 0.35)); wg.addColorStop(0.6, rgba(BTL_KH.orchid, 0.16)); wg.addColorStop(1, rgba(BTL_KH.violet, 0.04));
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = rgba(BTL_KH.ice, 0.4); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(0, 0.2 * s); ctx.quadraticCurveTo(L * 0.5, -3 * s, L * 0.97, 0.2 * s); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // the middle and hind legs, braced at its sides
  for (const s of [-1, 1]) {
    btlKhLeg(-0.5, 9.6 * s, -1.5, 14.6 * s, -5.5, 17 * s, 1.1, 2, rgba(rim, 0.95));
    btlKhLeg(-6.5, 10.8 * s, -10.5, 15 * s, -16.5, 15.6 * s, 1.1, 2, rgba(rim, 0.95));
  }
  // the shell: one dome, split down the seam, lit from the sun ahead
  for (const s of [-1, 1]) {
    btlKhPathShell(s);
    btlShade(-9, 6.4 * s, 9.5, lx, ly * s, k, 1.1);
    if (detail > 0.05) {
      ctx.save(); btlKhPathShell(s); ctx.clip();
      ctx.globalAlpha = detail * 0.5; ctx.strokeStyle = BTL_KH.ink; ctx.lineWidth = 0.3;
      for (let i = 1; i <= 5; i++) {
        const y0 = (0.4 + i * 2.1) * s;
        ctx.beginPath(); ctx.moveTo(-2.2, y0 * 0.96); ctx.bezierCurveTo(-7, y0 * 1.12, -12, y0 * 1.02, -16.6, y0 * 0.2); ctx.stroke();
      }
      ctx.restore();
    }
    btlKhPathShell(s);
    ctx.globalAlpha = clamp(form * 1.4, 0, 1); ctx.lineWidth = 0.7; ctx.strokeStyle = rgba(rim, 0.85); ctx.stroke();
    btlSeam(0.5 + 0.4 * detail);
  }
  // the pronotum
  btlKhPathPronotum();
  btlShade(2.4, 0, 9, lx, ly, k, 1.2);
  btlKhPathPronotum();
  ctx.lineWidth = 0.7; ctx.strokeStyle = rgba(rim, 0.9); ctx.stroke();
  btlSeam(0.45 + 0.35 * detail);
  // the forelegs, reaching round the sun; the throwing one flicks forward
  for (const s of [-1, 1]) {
    const fl = s === hand ? flick : 0;
    btlKhLeg(5.8, 7.2 * s, 10.4, 10.6 * s, sx + 1.2 + fl * 4, (sr + 1.6 - fl * 2) * s, 1.5, 3, rgba(rim, 0.9));
  }
  // the head-shield, its rake catching the sunlight
  btlKhPathHead();
  btlShade(9, 0, 6.5, lx, ly, k, 1.3);
  btlKhPathHead();
  ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(BTL_KH.ice, 0.85); ctx.stroke();
  // the eyes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) {
    drawGlow(7.6, 4.9 * s, 2.8, BTL_KH.cyan, 0.6 * detail);
    ctx.fillStyle = rgba(BTL_KH.white, 0.9 * detail);
    ctx.beginPath(); ctx.ellipse(7.6, 4.9 * s, 0.9, 0.6, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  // the sun, between its forelegs
  btlKhSun(sx, sy, sr * detail + 0.5 * form, t, form);
  ctx.restore();
}

/* ================================ THE STARS =============================== */
function btlKhRoller(x, y, ang, s, t) {
  // a small scarab on the star's back, rolling it: dark shell, lit rim, legs pushing
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = BTL_KH.chitin; ctx.lineWidth = 0.6; ctx.lineCap = 'round';
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
    const ph = Math.sin(t * 18 + i * 2.1 + sd) * 0.5;
    ctx.beginPath(); ctx.moveTo(-0.5 + i * 1.2, sd * 1.4); ctx.lineTo(0.2 + i * 1.2 + ph, sd * 2.8); ctx.stroke();
  }
  ctx.fillStyle = BTL_KH.chitin;
  ctx.beginPath(); ctx.ellipse(0, 0, 2.4, 1.8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(BTL_KH.ice, 0.8); ctx.lineWidth = 0.35; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.2, 0); ctx.lineTo(1.4, 0); ctx.stroke();
  ctx.restore();
}
function btlKhepriStars(stars, booms, t) {
  ctx.save();
  for (const s of stars || []) {
    if (s.dead) continue;
    const held = s.held ? s.held.length : 0, heat = s.fuse >= 0 ? 1 - clamp(s.fuse / STAR_FUSE, 0, 1) : 0;
    const pinch = s.fuse >= 0 && s.fuse < 0.06 ? 0.7 : 1, r = s.r * pinch;
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    // the trail
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 1; j <= 6; j++) drawGlow(s.x - ux * j * r * 0.6, s.y - uy * j * r * 0.6, r * (1.3 - j * 0.15), j < 3 ? BTL_KH.sky : BTL_KH.violet, 0.28 * (1 - j / 7));
    // the sun: a photosphere thinner when it is holding something, so what is inside shows
    btlKhSun(s.x, s.y, r, t + s.seed, held ? 0.75 : 1, heat);
    if (held) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6; ctx.strokeStyle = btlMix(BTL_KH.ice, BTL_KH.white, heat); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(s.x, s.y, r + 2 + Math.sin(t * 20) * heat * 2, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // the scarab on its back, rolling it along
    btlKhRoller(s.x - ux * (r + 1.5), s.y - uy * (r + 1.5), Math.atan2(uy, ux), 1.4 * Math.max(1, r / STAR_R), t + s.seed);
  }
  // the blasts: a fireball and a shock ring, shell flinders thrown out
  ctx.globalCompositeOperation = 'lighter';
  for (const b of booms || []) {
    const age = t - b.at;
    if (age < 0 || age > 0.7) continue;
    const u = age / 0.7, e = btlEaseOut(u);
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.R * (0.35 + 0.45 * e));
    g.addColorStop(0, rgba(BTL_KH.white, 0.9 * (1 - u))); g.addColorStop(0.4, rgba(BTL_KH.sky, 0.6 * (1 - u)));
    g.addColorStop(1, rgba(BTL_KH.violet, 0));
    ctx.globalAlpha = 1; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.R * (0.35 + 0.45 * e), 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.8 * (1 - u); ctx.strokeStyle = BTL_KH.ice; ctx.lineWidth = 3 * (1 - u) + 0.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.R * e, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.9 * (1 - u); ctx.strokeStyle = BTL_KH.chitin; ctx.lineWidth = 1.6;
    for (let i = 0; i < 7; i++) {
      const a = i * TAU / 7 + b.x * 0.01, d = b.R * (0.2 + 0.6 * e);
      ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, 2.2, a, a + 2); ctx.stroke();
    }
  }
  ctx.restore();
}

/* ================================ THE SCREEN ============================== */
function btlKhepriScreen(f, t, outAt, W, H) {
  const a = f ? Math.max(0, 1 - Math.abs(f.t - FUSION_IN) / 0.35) * 0.7 : 0, o = 1 - (t - outAt) / 0.6;
  if (a <= 0 && o <= 0 && !f) return;
  ctx.save();
  if (f) {
    const k = btlKhepriK(f), vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(56,189,248,' + (0.08 + 0.02 * Math.sin(t * 2)) * k + ')');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  if (a > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(240,253,255,' + 0.45 * a * a + ')'); g.addColorStop(1, 'rgba(56,189,248,' + 0.2 * a * a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (o > 0) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(4,3,20,' + 0.25 * o * o + ')'; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
