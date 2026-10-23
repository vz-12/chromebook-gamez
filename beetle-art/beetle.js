/* ===========================================================================
   EMBER · THE BLUE BEETLE — the art (BEETLE-PLAN.md)
   Step 1, the concept: the base look, drawn on MOTION. It is written to be
   lifted into index.html as it stands, so it reads the pilot only through a
   small state object (`me`, below) and keeps everything it remembers in its
   own bag (`B`). It leans on ctx, TAU, clamp, lerp, rgba, drawGlow and MOTION.

     THE HEAD     EMBER's hull is the beetle's head and thorax: black chitin
                  with a structural sheen that slides between electric blue
                  and violet as the hull turns against the light, compound
                  eyes, clubbed antennae on chains, and two sickle mandibles
                  with fangs on the inside edge.
     THE BITE     the mandibles follow the gun (< = < =): they part as the
                  lance charges, fling wide as it fires, hold open with a
                  tremor while it burns, and snap shut when it goes out.
     THE SHELL    the elytra. Shut, they meet in a seam down the back. In a
                  dash they spring open and the flight wings blur out from
                  under them.
     THE BODY     seven armoured plates on a MOTION chain off the hull's rear
                  socket: it follows the route flown when going forward, and
                  slides back behind the head when backing off. Spiracles lit
                  cyan and magenta, side spines that rise with speed, and the
                  thruster at the tail.
     THE FIRE     the lance as a blue-violet flamethrower. Its puffs live in
                  the beam's own frame (how far along, how far across), so the
                  fire is always exactly on the hitbox, however fast the hull
                  turns: white-hot at the jaws, where it hits hardest, cooling
                  through blue to violet smoke at the tip, where it hits least.
     THE DASH     tiny blue flames left along the line, gone inside 1.5 s.

     me = { x, y, ang,             where the hull is and which way it faces
            vx, vy,                its velocity (px/s)
            charge,                0..1 while the lance winds up
            beam,                  0 when out; else the flare (0.5 → 1 → 0.5)
            segs, half,            the beam's segments [{x1,y1,x2,y2}] and half width
            range,                 how long the lance is, for the falloff
            dash }                 > 0 while dashing

     btlNew(x, y, ang)     the bag
     btlTick(B, me, dt)    steps everything
     btlDrawUnder(B, me)   the dash flames and the body, under the hull
     btlDrawHull(B, me)    the head, the shell, the wings, the jaws
     btlDrawFire(B, me)    the lance and the wind-up, over everything
=========================================================================== */

const BTL = {
  ink: '#050414', chitin: '#0c0a24', chitin2: '#191343', plate: '#231a5c',
  blue: '#1d4ed8', cyan: '#22d3ee', ice: '#cffafe', white: '#f0fdff',
  violet: '#6d28d9', orchid: '#a855f7', magenta: '#e879f9', pink: '#f0abfc',
  // the fire, white-hot to smoke
  fire: ['#f0fdff', '#a5f3fc', '#38bdf8', '#3b5bfd', '#6d3cf0', '#8b2fd6', '#2e1065'],
  light: -2.3,              // the screen angle the light comes from, for the sheen
  segs: 7, segGap: 8.2,     // the body: plates, and the length of each link
  mouth: 20,                // the muzzle, as the stock lance has it
  jawHinge: [11.2, 3.0]
};

/* ------------------------------- the colours ------------------------------ */
const btlHex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function btlMix(a, b, t) {
  const A = btlHex(a), C = btlHex(b), k = clamp(t, 0, 1);
  return '#' + A.map((v, i) => Math.round(v + (C[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// a point on the fire's ramp, 0 white-hot → 1 smoke
function btlFire(u) {
  const R = BTL.fire, f = clamp(u, 0, 1) * (R.length - 1), i = Math.min(R.length - 2, Math.floor(f));
  return btlMix(R[i], R[i + 1], f - i);
}
/* The sheen: how the shell catches the light at this heading. 0 is the blue
   face, 1 the violet; the hull turning slides between them. */
const btlSheen = ang => 0.5 + 0.5 * Math.cos(ang - BTL.light - 0.6);
// how many device pixels one hull unit is right now: the detail asks for it
function btlPx() { const m = ctx.getTransform(); return Math.hypot(m.a, m.b); }

/* soft round sprites for the fire, one per step of the ramp: the game's own
   glow sprite falls off too fast for smoke */
const _btlPuff = [];
function btlPuff(i) {
  if (_btlPuff[i]) return _btlPuff[i];
  const S = 64, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d'), col = btlFire(i / 15), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.35, rgba(col, 0.55));
  gr.addColorStop(0.7, rgba(col, 0.16)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return (_btlPuff[i] = c);
}

/* ================================== THE BAG =============================== */
function btlNew(x, y, ang) {
  const B = {
    t: 0, x, y, ang, speed: 0, turn: 0, lastAng: ang, beamWas: 0, beamAge: 0,
    // the body: a chain off the rear socket that may swing 30° off straight back
    body: moRope(BTL.segs + 1, BTL.segGap, { x, y, ang, lx: -14.2, lay: Math.PI, bend: 0.3, rootBend: 0.52,
                                              drag: 6, follow: 0.35 }),
    // the antennae: short, clubbed, on stiff little chains
    ant: [-1, 1].map(s => moRope(4, 2.3, { x, y, ang, lx: 9.4, ly: s * 4.4, lay: s * 0.78, bend: 0.3, rootBend: 0.42,
                                           drag: 7, follow: 0.5 })),
    jaw: moSpring(0.1, 7, 0.42),         // 0 shut … 1 flung wide
    shell: moSpring(0, 5.5, 0.55),       // the elytra: 0 shut, 1 open (a dash)
    wing: moSpring(0, 8, 0.75),          // the flight wings unfolding under them
    fins: moSpring(0, 3, 0.6),           // the body's side spines, raised by speed
    lean: moSpring(0, 2.5, 0.7),         // a bank into turns
    puffs: [], flameEm: moEmitter(0), trailEm: moEmitter(0), thrustEm: moEmitter(26),
    parts: moPool()                      // its own sparks, apart from anything else on screen
  };
  return B;
}

/* ================================== THE TICK ============================== */
function btlTick(B, me, dt) {
  if (!(dt > 0)) return;
  B.t += dt;
  B.x = me.x; B.y = me.y; B.ang = me.ang;
  B.speed = Math.hypot(me.vx || 0, me.vy || 0);
  B.turn = moDecay(B.turn, moWrap(me.ang - B.lastAng) / dt, 0.08, dt);
  B.lastAng = me.ang;

  // the bodies ride the hull
  moFrame(B.body, me.x, me.y, me.ang); moStep(B.body, dt);
  for (const a of B.ant) { moFrame(a, me.x, me.y, me.ang); moStep(a, dt); }

  // the bite follows the gun
  const beam = me.beam > 0;
  if (beam && !B.beamWas) { B.beamAge = 0; B.jaw.kick(9); }       // the fling
  B.beamAge += dt;
  B.jaw.to = beam ? 1 - 0.12 * Math.abs(Math.sin(B.t * 31)) * clamp(B.beamAge * 4, 0, 1)
           : me.charge > 0.01 ? 0.16 + 0.42 * me.charge * me.charge + 0.04 * Math.sin(B.t * 40) * me.charge
           : 0.08 + 0.03 * Math.sin(B.t * 2.1);
  if (!beam && B.beamWas) B.jaw.kick(-6);                          // the snap
  B.beamWas = beam;
  B.jaw.step(dt);

  const dashing = (me.dash || 0) > 0;
  const odOpen = me.od ? me.od.open : 0;
  B.shell.to = Math.max(dashing ? 1 : 0, odOpen * 1.5); B.shell.step(dt);   // OVERDRIVE flings it wide and holds it
  B.wing.to = dashing && odOpen < 0.2 ? 1 : 0; B.wing.step(dt);             // its wings of fire take over from these
  B.fins.to = clamp(B.speed / 420, 0, 1); B.fins.step(dt);
  B.lean.to = clamp(B.turn * 0.06, -0.5, 0.5); B.lean.step(dt);

  btlFlameTick(B, me, dt);
  btlTrailTick(B, me, dt);
  moPartsStep(dt, B.parts);
}

/* ============================== THE HEAD (paths) ==========================
   All in hull space: x forward along the nose, y to starboard. EMBER's own
   outline runs from 22 at the nose to -12 at the tail, ±13.5 at the vanes;
   the beetle fills about the same box, with the shell as its biggest shape:
     mandibles  11 → 22     head  3 → 13     pronotum  -4 → 5
     elytra    -16 → -2.5, together one dome split down the middle      */
function btlPathElytron(s) {
  ctx.beginPath();
  ctx.moveTo(-2.6, 0.45 * s);
  ctx.quadraticCurveTo(-2.0, 5.4 * s, -3.0, 9.0 * s);              // the shoulder
  ctx.bezierCurveTo(-4.2, 11.7 * s, -9.0, 12.3 * s, -12.6, 8.7 * s);
  ctx.bezierCurveTo(-15.4, 5.7 * s, -16.6, 2.0 * s, -16.0, 0.45 * s);
  ctx.closePath();                                                  // back up the seam
}
function btlPathPronotum() {
  ctx.beginPath();
  ctx.moveTo(5.0, -6.0);
  ctx.quadraticCurveTo(3.4, 0, 5.0, 6.0);                           // hollowed round the head
  ctx.bezierCurveTo(5.6, 8.6, 2.6, 9.8, 0.2, 9.6);
  ctx.quadraticCurveTo(-2.4, 9.4, -3.3, 8.5);
  ctx.quadraticCurveTo(-4.1, 0, -3.3, -8.5);
  ctx.quadraticCurveTo(-2.4, -9.4, 0.2, -9.6);
  ctx.bezierCurveTo(2.6, -9.8, 5.6, -8.6, 5.0, -6.0);
  ctx.closePath();
}
function btlPathHead() {
  ctx.beginPath();
  ctx.moveTo(3.6, -4.8);
  ctx.bezierCurveTo(6.4, -5.9, 9.8, -5.6, 11.6, -3.7);
  ctx.quadraticCurveTo(12.9, -1.9, 12.7, 0);
  ctx.quadraticCurveTo(12.9, 1.9, 11.6, 3.7);
  ctx.bezierCurveTo(9.8, 5.6, 6.4, 5.9, 3.6, 4.8);
  ctx.quadraticCurveTo(2.8, 0, 3.6, -4.8);
  ctx.closePath();
}
/* One mandible, in its own frame: the hinge at the origin, x forward, s 1
   starboard and -1 port. A sickle: the outer edge sweeping forward, the tip
   hooking in past the middle, a clean inside edge (the fangs are their own
   shapes, set along it). */
function btlPathMandible(s) {
  ctx.beginPath();
  ctx.moveTo(0, -1.1 * s);
  ctx.bezierCurveTo(1.0, 1.6 * s, 4.6, 2.4 * s, 7.6, 1.6 * s);
  ctx.quadraticCurveTo(10.4, 0.8 * s, 11.5, -1.7 * s);              // the hook
  ctx.quadraticCurveTo(9.9, -0.5 * s, 8.6, -0.3 * s);
  ctx.quadraticCurveTo(4.6, 0.2 * s, 1.4, -0.4 * s);
  ctx.quadraticCurveTo(0.6, -0.7 * s, 0, -1.1 * s);
  ctx.closePath();
}
// the fangs down the inside edge [x, length], and the spikes on the outside [x, length]
const BTL_FANGS = [[4.4, 1.3], [6.3, 1.8], [8.2, 1.5]];
const BTL_SPIKES = [[3.2, 1.3], [6.0, 1.1]];
// shut, the tips cross past the middle; flung, they stand 45° out
const btlJawAng = (B, s) => s * lerp(-0.17, 0.8, clamp(B.jaw.v, -0.15, 1.25));

/* Chitin, lit: a shadow-to-colour ramp across the light, then the gloss, a
   soft specular spot on the side the light comes from. Clipped to whatever
   path is current. (cx, cy) and r are the dome's middle and size. */
function btlShade(cx, cy, r, lx, ly, k, gloss = 1) {
  const mid = btlMix(BTL.blue, BTL.violet, k), hot = btlMix(BTL.cyan, BTL.magenta, k);
  const g = ctx.createLinearGradient(cx - lx * r, cy - ly * r, cx + lx * r, cy + ly * r);
  g.addColorStop(0, BTL.ink); g.addColorStop(0.45, BTL.chitin);
  g.addColorStop(0.8, btlMix(BTL.chitin2, mid, 0.55)); g.addColorStop(1, mid);
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const sx = cx + lx * r * 0.42, sy = cy + ly * r * 0.42, sp = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.75);
  sp.addColorStop(0, rgba(btlMix(hot, BTL.white, 0.35), 0.55 * gloss)); sp.addColorStop(0.35, rgba(hot, 0.28 * gloss));
  sp.addColorStop(1, rgba(mid, 0));
  ctx.fillStyle = sp; ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  // the far rim catches the other colour, as thin films do
  const rg = ctx.createLinearGradient(cx + lx * r, cy + ly * r, cx - lx * r, cy - ly * r);
  rg.addColorStop(0.82, rgba(btlMix(BTL.magenta, BTL.cyan, k), 0)); rg.addColorStop(1, rgba(btlMix(BTL.magenta, BTL.cyan, k), 0.32 * gloss));
  ctx.fillStyle = rg; ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.restore();
}

/* ================================= THE HULL =============================== */
function btlDrawHull(B, me) {
  const px = btlPx(), k = btlSheen(me.ang + B.lean.v * 0.6);
  // the light, in hull space
  const la = BTL.light - me.ang, lx = Math.cos(la), ly = Math.sin(la);
  const rim = btlMix(BTL.cyan, BTL.pink, k), seam = me.odGlow || 0;    // OVERDRIVE lights the seams
  ctx.save();
  ctx.translate(me.x, me.y);
  ctx.rotate(me.ang);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // the halo: the silhouette stroked wide and faint, thrown outward
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 4; i >= 1; i--) {
    ctx.lineWidth = 1.4 + i * 2.4;
    ctx.strokeStyle = rgba(i > 2 ? BTL.violet : BTL.cyan, 0.035 + 0.018 * (4 - i));
    btlPathElytron(1); ctx.stroke(); btlPathElytron(-1); ctx.stroke();
    btlPathPronotum(); ctx.stroke(); btlPathHead(); ctx.stroke();
  }
  ctx.restore();

  // the flight wings, under the shell
  const w = B.wing.v;
  if (w > 0.03) btlDrawWings(B, w, px);

  // the elytra: each turns out on its shoulder hinge
  const open = clamp(B.shell.v, -0.1, 1.2);
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-2.8, 1.0 * s);
    ctx.rotate(s * open * 0.6);
    ctx.translate(2.8, -1.0 * s);
    btlPathElytron(s);
    btlShade(-8.6, 5.6 * s, 8.4, lx, ly, k);
    if (open > 0.05) { btlPathElytron(s); ctx.fillStyle = rgba(BTL.ink, 0.3 * clamp(open, 0, 1)); ctx.fill(); }
    if (px > 2.4) btlElytronDetail(s, px, k);
    btlPathElytron(s);
    ctx.lineWidth = 0.7; ctx.strokeStyle = rgba(rim, 0.85); ctx.stroke();
    if (seam > 0.01) btlSeam(seam);
    ctx.restore();
  }

  // the pronotum
  btlPathPronotum();
  btlShade(0.6, 0, 8.4, lx, ly, k);
  if (px > 2.4) {
    ctx.save(); btlPathPronotum(); ctx.clip();
    ctx.strokeStyle = rgba(BTL.ink, 0.5); ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(4.2, 0); ctx.lineTo(-3.6, 0); ctx.stroke();      // the midline
    ctx.strokeStyle = rgba(BTL.ink, 0.45); ctx.lineWidth = 0.5;                  // the raised margin
    ctx.beginPath(); ctx.moveTo(4.6, 6.6); ctx.bezierCurveTo(4.9, 8.4, 2.4, 9.1, 0.2, 8.9); ctx.quadraticCurveTo(-2.1, 8.7, -2.8, 8.0);
    ctx.moveTo(4.6, -6.6); ctx.bezierCurveTo(4.9, -8.4, 2.4, -9.1, 0.2, -8.9); ctx.quadraticCurveTo(-2.1, -8.7, -2.8, -8.0); ctx.stroke();
    ctx.restore();
  }
  btlPathPronotum();
  ctx.lineWidth = 0.7; ctx.strokeStyle = rgba(rim, 0.9); ctx.stroke();
  if (seam > 0.01) btlSeam(seam * 0.8);

  // the mandibles, under the head's front edge
  for (const s of [-1, 1]) btlDrawMandible(B, s, px, k);

  // the head
  btlPathHead();
  btlShade(8, 0, 6, lx, ly, k, 0.85);
  btlPathHead();
  ctx.lineWidth = 0.65; ctx.strokeStyle = rgba(rim, 0.9); ctx.stroke();
  // the clypeus: a small plate over the mouth
  ctx.beginPath();
  ctx.moveTo(12.1, -2.2); ctx.quadraticCurveTo(14.0, 0, 12.1, 2.2); ctx.quadraticCurveTo(11.4, 0, 12.1, -2.2);
  ctx.fillStyle = BTL.chitin2; ctx.fill(); ctx.strokeStyle = rgba(rim, 0.55); ctx.lineWidth = 0.4; ctx.stroke();

  // the eyes: compound, lit from inside
  for (const s of [-1, 1]) btlDrawEye(s, px, k);

  // the throat, lit by what is coming
  const glow = Math.max(me.charge || 0, me.beam > 0 ? 1 : 0);
  if (glow > 0.02) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(15, 0, 4 + glow * 7, glow > 0.85 ? BTL.white : BTL.cyan, 0.22 + glow * 0.45);
    ctx.restore();
  }
  ctx.restore();

  // the antennae, in the world: they are chains
  btlDrawAntennae(B, px, rim);
}

/* light running in the seams of whatever path is current: OVERDRIVE */
function btlSeam(g) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 2.2; ctx.strokeStyle = rgba(BTL.cyan, 0.35 * g); ctx.stroke();
  ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(BTL.white, 0.8 * g); ctx.stroke();
  ctx.restore();
}

function btlElytronDetail(s, px, k) {
  ctx.save();
  btlPathElytron(s); ctx.clip();
  // striae: grooves down the length, following the dome, and the pits along them
  ctx.strokeStyle = rgba(BTL.ink, 0.5); ctx.lineWidth = 0.28;
  for (let i = 1; i <= 4; i++) {
    const y0 = (0.6 + i * 2.15) * s;
    ctx.beginPath(); ctx.moveTo(-3.0, y0 * 0.95); ctx.bezierCurveTo(-7, y0 * 1.12, -11, y0 * 1.02, -15.4, y0 * 0.18); ctx.stroke();
  }
  if (px > 4) {
    ctx.fillStyle = rgba(BTL.ink, 0.55);
    for (let i = 1; i <= 4; i++) for (let j = 0; j < 8; j++) {
      const u = j / 7, y0 = (0.6 + i * 2.15) * s, x = lerp(-3.8, -14.2, u);
      const y = y0 * lerp(1.0, 0.35, u * u) + 0.55 * s;
      ctx.beginPath(); ctx.arc(x, y, 0.16, 0, TAU); ctx.fill();
    }
  }
  // the seam's raised lip, and a gloss line along the outer edge
  ctx.strokeStyle = rgba(BTL.ice, 0.22); ctx.lineWidth = 0.35;
  ctx.beginPath(); ctx.moveTo(-2.8, 0.9 * s); ctx.lineTo(-15.6, 0.9 * s); ctx.stroke();
  ctx.strokeStyle = rgba(BTL.ice, 0.16 + 0.1 * k); ctx.lineWidth = 0.45;
  ctx.beginPath(); ctx.moveTo(-3.6, 9.4 * s); ctx.bezierCurveTo(-5.2, 11.2 * s, -9.0, 11.6 * s, -12.0, 8.6 * s); ctx.stroke();
  ctx.restore();
}

function btlDrawMandible(B, s, px, k) {
  const [hx, hy] = BTL.jawHinge;
  const open = clamp(B.jaw.v, 0, 1), lit = 0.45 + 0.55 * open;
  ctx.save();
  ctx.translate(hx, hy * s);
  ctx.rotate(btlJawAng(B, s));
  const rimc = rgba(btlMix(BTL.cyan, BTL.pink, k), 0.9);
  // the fangs first, so the jaw's edge sits over their roots
  for (const [x, l] of BTL_FANGS) {
    ctx.beginPath();
    ctx.moveTo(x - 0.45, -0.05 * s); ctx.quadraticCurveTo(x - 0.1, -l * 0.6 * s, x + 0.15, -l * s);
    ctx.quadraticCurveTo(x + 0.2, -l * 0.4 * s, x + 0.55, 0.05 * s); ctx.closePath();
    const fg = ctx.createLinearGradient(x, 0, x, -l * s);
    fg.addColorStop(0, BTL.violet); fg.addColorStop(1, btlMix(BTL.magenta, BTL.pink, open));
    ctx.fillStyle = fg; ctx.fill();
  }
  // the spikes on the outer edge, swept back
  for (const [x, l] of BTL_SPIKES) {
    const y = 1.6 + 0.6 * Math.sin(x * 0.4);
    ctx.beginPath();
    ctx.moveTo(x - 0.6, (y - 0.25) * s); ctx.quadraticCurveTo(x - 0.4, (y + l * 0.6) * s, x - 1.1, (y + l) * s);
    ctx.quadraticCurveTo(x + 0.1, (y + l * 0.3) * s, x + 0.5, (y - 0.2) * s); ctx.closePath();
    ctx.fillStyle = BTL.plate; ctx.fill(); ctx.strokeStyle = rimc; ctx.lineWidth = 0.3; ctx.stroke();
  }
  // the jaw
  btlPathMandible(s);
  const g = ctx.createLinearGradient(0, 2.4 * s, 3, -1.4 * s);
  g.addColorStop(0, BTL.ink); g.addColorStop(0.5, btlMix(BTL.plate, BTL.violet, 0.3 + k * 0.4));
  g.addColorStop(0.85, btlMix(BTL.blue, BTL.orchid, k)); g.addColorStop(1, BTL.chitin);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 0.6; ctx.strokeStyle = rimc; ctx.stroke();
  // gloss down the outer curve
  if (px > 2.4) {
    ctx.strokeStyle = rgba(BTL.ice, 0.4); ctx.lineWidth = 0.32;
    ctx.beginPath(); ctx.moveTo(1.6, 1.0 * s); ctx.bezierCurveTo(4.0, 1.9 * s, 7.4, 1.6 * s, 9.9, 0.2 * s); ctx.stroke();
  }
  // the fangs glow with the bite
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, l] of BTL_FANGS) drawGlow(x + 0.15, -l * 0.8 * s, px > 3 ? 1.5 : 2, BTL.magenta, 0.5 * lit);
  ctx.restore();
}

function btlDrawEye(s, px, k) {
  ctx.save();
  ctx.translate(6.8, 4.9 * s);
  ctx.rotate(0.3 * s);
  ctx.beginPath(); ctx.ellipse(0, 0, 2.0, 1.3, 0, 0, TAU);
  ctx.fillStyle = BTL.ink; ctx.fill();
  ctx.save(); ctx.clip();
  const eg = ctx.createRadialGradient(-0.4, -0.3 * s, 0.1, 0, 0, 2.2);
  eg.addColorStop(0, BTL.ice); eg.addColorStop(0.35, BTL.cyan); eg.addColorStop(1, rgba(BTL.blue, 0.4));
  ctx.fillStyle = eg; ctx.fillRect(-3, -2, 6, 4);
  if (px > 3.5) {                                     // the facets
    ctx.strokeStyle = rgba(BTL.ink, 0.5); ctx.lineWidth = 0.11;
    for (let r = -3; r <= 3; r++) for (let c = -4; c <= 4; c++) {
      const x = c * 0.56 + (r & 1) * 0.28, y = r * 0.49;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; i ? ctx.lineTo(x + Math.cos(a) * 0.31, y + Math.sin(a) * 0.31) : ctx.moveTo(x + Math.cos(a) * 0.31, y + Math.sin(a) * 0.31); }
      ctx.closePath(); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalCompositeOperation = 'lighter';
  drawGlow(0, 0, 4, BTL.cyan, 0.32);
  ctx.restore();
}

function btlDrawAntennae(B, px, rim) {
  for (const a of B.ant) {
    const p = a.p, n = p.length;
    ctx.beginPath(); moSmooth(p);
    ctx.strokeStyle = BTL.chitin2; ctx.lineWidth = 1.0; ctx.stroke();
    ctx.strokeStyle = rgba(rim, 0.75); ctx.lineWidth = 0.4; ctx.stroke();
    // the club: three leaves fanned at the tip
    const e = p[n - 1], f = p[n - 2], ang = Math.atan2(e.y - f.y, e.x - f.x);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(ang);
    for (const d of [-0.5, 0, 0.5]) {
      ctx.save(); ctx.rotate(d);
      ctx.beginPath(); ctx.ellipse(1.1, 0, 1.2, 0.45, 0, 0, TAU);
      ctx.fillStyle = BTL.plate; ctx.fill(); ctx.strokeStyle = rgba(rim, 0.8); ctx.lineWidth = 0.28; ctx.stroke();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter'; drawGlow(1.0, 0, 2.2, BTL.cyan, 0.28);
    ctx.restore();
  }
}

/* The flight wings: two long membranes from under the shell, beating faster
   than the eye. Drawn as the stroke they sweep: three faint copies across
   the beat, veins on the leading one. */
function btlDrawWings(B, w, px) {
  const beat = Math.sin(B.t * 62);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const s of [-1, 1]) for (let c = 0; c < 3; c++) {
    const sweep = (c - 1) * 0.3 + beat * 0.14;
    ctx.save();
    ctx.translate(-3.0, 3.0 * s);
    ctx.rotate(s * (lerp(2.5, 1.2, w) + sweep));
    const L = 26 * w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(L * 0.3, -3.8 * s, L * 0.85, -3.2 * s, L, 0.4 * s);
    ctx.bezierCurveTo(L * 0.8, 3.6 * s, L * 0.3, 3.2 * s, 0, 1.2 * s);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, rgba(BTL.cyan, 0.3 * w)); g.addColorStop(0.6, rgba(BTL.orchid, 0.13 * w)); g.addColorStop(1, rgba(BTL.magenta, 0.05 * w));
    ctx.fillStyle = g; ctx.fill();
    if (c === 1 && px > 2) {
      ctx.strokeStyle = rgba(BTL.ice, 0.26 * w); ctx.lineWidth = 0.28;
      ctx.beginPath();
      ctx.moveTo(0, 0.2 * s); ctx.quadraticCurveTo(L * 0.5, -2.8 * s, L * 0.97, 0.2 * s);
      ctx.moveTo(L * 0.25, -0.7 * s); ctx.lineTo(L * 0.55, 1.9 * s);
      ctx.moveTo(L * 0.5, -1.7 * s); ctx.lineTo(L * 0.78, 1.5 * s);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* ================================= THE BODY =============================== */
function btlDrawUnder(B, me) {
  const px = btlPx();
  // the dash flames lie on the floor
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  moPartsDraw('btlTrail', btlDrawTrailFlame, B.parts);
  moPartsDraw('btlThrust', btlDrawMote, B.parts);
  moPartsDraw('btlEmber', btlDrawEmber, B.parts);
  ctx.restore();
  btlDrawBody(B, me, px);
  if (me.od) btlOdWings(B, me, me.od);         // OVERDRIVE: over the body, under the hull
}

function btlDrawBody(B, me, px) {
  const p = B.body.p, n = p.length, k = btlSheen(me.ang);
  const rim = btlMix(BTL.cyan, BTL.pink, k);
  // the tail end first: its thruster, then the plates tail to head, so each overlaps the one behind
  const od = me.od ? me.od.life : 0;
  btlDrawThruster(B, p[n - 1], p[n - 2], px, od);
  for (let i = n - 1; i >= 1; i--) {
    const q = p[i], f = p[i - 1], ang = Math.atan2(f.y - q.y, f.x - q.x);
    const R = 7.0 - (i - 1) * 0.58;
    btlDrawPlate(B, q.x, q.y, ang, R, i, px, k, rim, od);
  }
}

function btlDrawPlate(B, x, y, ang, R, i, px, k, rim, od = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);
  const la = BTL.light - ang, lx = Math.cos(la), ly = Math.sin(la), L = 5.4;
  // the side spines first, under the plate: raised by speed, a little out of step
  const fin = clamp(B.fins.v, 0, 1.2), wob = Math.sin(B.t * 5 - i * 0.9) * 0.08;
  for (const s of [-1, 1]) {
    ctx.save();
    ctx.translate(-1.2, R * 0.82 * s);
    ctx.rotate(s * (2.25 - fin * 0.55 + wob));
    ctx.beginPath();
    ctx.moveTo(0, -0.9 * s); ctx.quadraticCurveTo(R * 0.55, -0.6 * s, R * 0.95, 0.9 * s);
    ctx.quadraticCurveTo(R * 0.45, 0.6 * s, 0, 0.9 * s); ctx.closePath();
    ctx.fillStyle = btlMix(BTL.plate, BTL.violet, 0.5); ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.55); ctx.lineWidth = 0.35; ctx.stroke();
    ctx.restore();
  }
  // the plate: a tergite, rounded, its front tucked under the plate ahead
  ctx.beginPath();
  ctx.moveTo(L * 0.7, -R * 0.86);
  ctx.quadraticCurveTo(L * 1.05, 0, L * 0.7, R * 0.86);
  ctx.bezierCurveTo(L * 0.2, R * 1.08, -L * 0.6, R * 1.02, -L * 0.85, R * 0.62);
  ctx.quadraticCurveTo(-L * 1.12, 0, -L * 0.85, -R * 0.62);
  ctx.bezierCurveTo(-L * 0.6, -R * 1.02, L * 0.2, -R * 1.08, L * 0.7, -R * 0.86);
  ctx.closePath();
  btlShade(0, 0, R * 1.1, lx, ly, k, 0.8);
  ctx.lineWidth = 0.6; ctx.strokeStyle = rgba(rim, 0.8); ctx.stroke();
  if (px > 2.4) {
    ctx.save(); ctx.clip();
    ctx.strokeStyle = rgba(BTL.ink, 0.65); ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(L * 0.5, -R); ctx.quadraticCurveTo(L * 0.1, 0, L * 0.5, R); ctx.stroke();   // the overlap's shadow line
    ctx.strokeStyle = rgba(BTL.ice, 0.22); ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(L * 0.6, 0); ctx.lineTo(-L * 0.9, 0); ctx.stroke();                         // the keel
    ctx.restore();
  }
  if (od > 0.01) btlOdCrest(B, i, R, od);           // OVERDRIVE: a crest of flame off its back
  // the spiracles: a lit pair on every plate, cyan and magenta turn about
  ctx.globalCompositeOperation = 'lighter';
  const col = i % 2 ? BTL.cyan : BTL.magenta, pulse = 0.7 + 0.3 * Math.sin(B.t * 3.2 - i * 0.7);
  for (const s of [-1, 1]) {
    drawGlow(-0.6, R * 0.55 * s, 2.6, col, 0.5 * pulse);
    ctx.fillStyle = rgba(BTL.white, 0.85 * pulse);
    ctx.beginPath(); ctx.arc(-0.6, R * 0.55 * s, px > 3 ? 0.45 : 0.6, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

/* the tail: a tapered cap with the thruster in it, a blue jet that
   lengthens with speed */
function btlDrawThruster(B, e, f, px, od = 0) {
  const ang = Math.atan2(e.y - f.y, e.x - f.x), sp = clamp(B.speed / 300, 0, 1.6) + od * 1.2;
  ctx.save();
  ctx.translate(e.x, e.y); ctx.rotate(ang);
  // the jet
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.85 + 0.15 * Math.sin(B.t * 47) + 0.1 * Math.sin(B.t * 19);
  const len = (7 + sp * 9) * fl;
  for (const [w, a, col] of [[4.6, 0.25, BTL.violet], [3.2, 0.5, '#3b5bfd'], [1.8, 0.85, BTL.cyan], [0.8, 1, BTL.white]]) {
    ctx.beginPath();
    ctx.moveTo(1, -w / 2);
    ctx.quadraticCurveTo(len * 0.55, -w * 0.45, len * (0.55 + w * 0.1), 0);
    ctx.quadraticCurveTo(len * 0.55, w * 0.45, 1, w / 2);
    ctx.closePath();
    ctx.fillStyle = rgba(col, a); ctx.fill();
  }
  drawGlow(2, 0, 7 + sp * 4, BTL.cyan, 0.35);
  ctx.restore();
  // the cap
  ctx.beginPath();
  ctx.moveTo(-4, -3.4); ctx.quadraticCurveTo(1.5, -3.2, 2.2, -1.2); ctx.lineTo(2.2, 1.2);
  ctx.quadraticCurveTo(1.5, 3.2, -4, 3.4); ctx.closePath();
  ctx.fillStyle = BTL.chitin2; ctx.fill();
  ctx.strokeStyle = rgba(BTL.cyan, 0.75); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.restore();
}

/* ================================= THE FIRE ===============================
   A puff is { s, off, age, life, seed }: s px along the beam from the jaws,
   off its place across it (-1..1 of the half width). Drawn on whatever the
   beam's segments are this frame. */
function btlFlameTick(B, me, dt) {
  const on = me.beam > 0, range = Math.max(60, me.range || 260);
  const life = 0.46, k = 3.0, v0 = range * k / (1 - Math.exp(-k * life)) * 0.97;
  B.flameEm.rate = on ? 330 : 0;
  moEmit(B.flameEm, dt, 0, 0, 0, (x, y, a, age) => {
    B.puffs.push({ s: 0, v: v0 * (0.9 + Math.random() * 0.2), off: (Math.random() * 2 - 1) * 0.85,
                   age: 0, life: life * (0.85 + Math.random() * 0.3), seed: Math.random() * 100, pre: age });
  });
  for (let i = B.puffs.length - 1; i >= 0; i--) {
    const q = B.puffs[i], h = dt + (q.pre || 0);
    q.pre = 0;
    q.s += q.v * (1 - Math.exp(-k * h)) / k;
    q.v *= Math.exp(-k * h);
    // it billows: drifting across on the flow, more the further it has gone
    const u = q.s / range, f = moFlow(q.s * 0.9, q.seed * 37, B.t * 1.4, 34);
    q.off = clamp(q.off + f[1] * h * (0.6 + u * 2.4), -1, 1);
    q.age += h;
    if (q.age >= q.life || q.s > range * 1.02) B.puffs.splice(i, 1);
  }
  if (!on && B.puffs.length > 600) B.puffs.length = 0;
}

/* the width the fire fills at u along the beam: a jet at the jaws, the full
   hitbox by a third of the way out */
// the jet's tongues: [length of the range, width of the hitbox, colour, phase]
const BTL_TONGUES = [[0.3, 0.8, '#a5f3fc', 0], [0.36, 0.7, '#38bdf8', 1.7], [0.42, 0.9, '#3b5bfd', 3.1], [0.26, 0.6, '#6d3cf0', 4.6]];
const btlFlameW = u => 0.28 + 0.72 * (1 - Math.pow(1 - clamp(u / 0.34, 0, 1), 2));

function btlDrawFire(B, me) {
  btlDrawWindup(B, me);
  if (!(me.beam > 0) || !me.segs || !me.segs.length) return;
  const braid = me.odLance || 0;                // OVERDRIVE: the braided lance, the puffs inside it
  if (braid > 0.001) btlOdBraid(B, me, braid);
  const range = Math.max(60, me.range || 260), half = me.half || 11;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let run = 0, last = null;
  for (const sg of me.segs) {
    // a ricochet carries on from where the last one ended, so the cooling does too
    if (!(last && Math.abs(sg.x1 - last.x2) < 0.5 && Math.abs(sg.y1 - last.y2) < 0.5)) run = 0;
    const dx = sg.x2 - sg.x1, dy = sg.y2 - sg.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const nx = -uy, ny = ux, s0 = run;
    // the puffs that fall on this segment
    for (const q of B.puffs) {
      const s = q.s - s0;
      if (s < 0 || s > L) continue;
      const u = q.s / range, age = q.age / q.life;
      const w = half * btlFlameW(u), off = q.off * w * 0.8;
      const x = sg.x1 + ux * s + nx * off, y = sg.y1 + uy * s + ny * off;
      const r = lerp(3.2, half * 1.75, Math.sqrt(clamp(u, 0, 1))) * (0.8 + 0.4 * ((q.seed * 7.3) % 1)) * (0.75 + age * 0.5);
      const a = (1 - u * 0.62) * Math.min(1, age * 8) * (1 - age * age) * me.beam;
      ctx.globalAlpha = clamp(a * 0.42 * (1 - braid * 0.5), 0, 1);
      const spr = btlPuff(Math.round(clamp(u * 0.85 + age * 0.3, 0, 1) * 15));
      ctx.drawImage(spr, x - r, y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    /* the jet: tongues braided out of the jaws, each flickering on its own
       eddy, white-hot at the root; the puffs take over a third of the way out */
    if (s0 === 0 && braid < 0.5) {
      const fl = 0.86 + 0.14 * Math.sin(B.t * 37);
      for (const [len, wid, col, ph] of BTL_TONGUES) {
        const jl = Math.min(L, range * len * (0.9 + 0.1 * Math.sin(B.t * 23 + ph))), pts = [];
        for (let i = 0; i <= 8; i++) {
          const s = jl * i / 8, wob = moFlow(s * 1.1 + ph * 40, ph * 13, B.t * 2.6, 18)[1] * (i / 8) * half * 0.45;
          pts.push({ x: sg.x1 + ux * s + nx * wob, y: sg.y1 + uy * s + ny * wob });
        }
        moRibbon(pts, 1.2 + half * 0.25 * wid * me.beam, half * wid * me.beam * fl, { cap: 'round', ease: u => Math.sqrt(u) });
        const g = ctx.createLinearGradient(sg.x1, sg.y1, sg.x1 + ux * jl, sg.y1 + uy * jl);
        g.addColorStop(0, rgba(col, 0.36)); g.addColorStop(0.5, rgba(col, 0.14)); g.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = g; ctx.fill();
      }
      const r0 = range * 0.06;
      moRibbon([{ x: sg.x1, y: sg.y1 }, { x: sg.x1 + ux * r0 * 0.5, y: sg.y1 + uy * r0 * 0.5 }, { x: sg.x1 + ux * r0, y: sg.y1 + uy * r0 }],
               2.2 * me.beam + 0.5, 0.2, { cap: 'round' });
      ctx.fillStyle = rgba(BTL.white, 0.8); ctx.fill();
      // the flash at the jaws
      drawGlow(sg.x1, sg.y1, 10 + 6 * me.beam, BTL.cyan, 0.5);
      if (B.beamAge < 0.16) drawGlow(sg.x1, sg.y1, 30 * (1 - B.beamAge / 0.16) + 8, BTL.white, 0.5 * (1 - B.beamAge / 0.16));
    }
    run += L; last = sg;
  }
  ctx.restore();
}

/* The wind-up: motes drawn in on spirals, faster and brighter as it fills,
   and the jaws parting over the gathering light. */
function btlDrawWindup(B, me) {
  const c = me.charge || 0;
  if (c < 0.02 || me.beam > 0) return;
  const mx = me.x + Math.cos(me.ang) * BTL.mouth, my = me.y + Math.sin(me.ang) * BTL.mouth;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const ph = (B.t * (1.2 + c * 1.6) + i / 14) % 1;
    const rr = lerp(34, 2, Math.pow(ph, 1.4)), a = me.ang + Math.PI + (i * 2.39996) + ph * 2.6 * (i % 2 ? 1 : -1);
    const x = mx + Math.cos(a) * rr * 0.9, y = my + Math.sin(a) * rr * 0.9;
    const al = c * Math.sin(ph * Math.PI) * 0.8;
    drawGlow(x, y, 2.4 + c * 2, i % 3 ? BTL.cyan : BTL.orchid, al * 0.6);
    ctx.fillStyle = rgba(BTL.white, al); ctx.beginPath(); ctx.arc(x, y, 0.6, 0, TAU); ctx.fill();
  }
  drawGlow(mx, my, 6 + c * 16, c > 0.85 ? BTL.white : BTL.cyan, 0.15 + c * 0.45);
  ctx.restore();
}

/* ================================ THE TRAILS ============================== */
function btlTrailTick(B, me, dt) {
  // the dash: tiny flames along the line, let out evenly however fast it goes
  B.trailEm.rate = (me.dash || 0) > 0 ? 240 : 0;
  moEmit(B.trailEm, dt, me.x, me.y, me.ang, (x, y, a, age) => {
    const j = (Math.random() - 0.5) * 9;
    moPart({ x: x - Math.sin(a) * j, y: y + Math.cos(a) * j, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14,
             drag: 3, flow: 16, fs: 26, life: 0.55 + Math.random() * 0.75, r: 1.4 + Math.random() * 1.8,
             grow: -0.8, rot: a + Math.PI, layer: 'btlTrail', age }, B.parts);
  });
  // the thruster's motes, thicker with speed
  const p = B.body.p, e = p[p.length - 1], f = p[p.length - 2], ta = Math.atan2(e.y - f.y, e.x - f.x);
  B.thrustEm.rate = 18 + clamp(B.speed / 300, 0, 1.6) * 40;
  moEmit(B.thrustEm, dt, e.x + Math.cos(ta) * 4, e.y + Math.sin(ta) * 4, ta, (x, y, a, age) => {
    const s = 30 + Math.random() * 40;
    moPart({ x, y, vx: Math.cos(a) * s + (Math.random() - 0.5) * 20, vy: Math.sin(a) * s + (Math.random() - 0.5) * 20,
             drag: 4, flow: 10, fs: 20, life: 0.3 + Math.random() * 0.35, r: 0.8 + Math.random() * 0.8,
             layer: 'btlThrust', age }, B.parts);
  });
}
function btlDrawTrailFlame(q, k) {
  // a small tongue of blue fire, flickering, shrinking as it goes out
  const fl = 0.8 + 0.2 * Math.sin(q.age * 38 + q.seed), r = q.r * (0.5 + 0.5 * k) * fl;
  if (r < 0.15) return;
  const col = btlFire(1 - k * 0.85);
  ctx.save();
  ctx.translate(q.x, q.y); ctx.rotate(q.rot + Math.sin(q.age * 9 + q.seed) * 0.3);
  drawGlow(0, 0, r * 3.2, col, 0.4 * k);
  ctx.beginPath();
  ctx.moveTo(r * 2.4, 0);
  ctx.quadraticCurveTo(r * 0.4, -r * 1.05, -r * 0.9, 0);
  ctx.quadraticCurveTo(r * 0.4, r * 1.05, r * 2.4, 0);
  ctx.fillStyle = rgba(col, 0.75 * k); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.4, 0, 0, TAU);
  ctx.fillStyle = rgba(BTL.white, 0.7 * k); ctx.fill();
  ctx.restore();
}
function btlDrawMote(q, k) {
  drawGlow(q.x, q.y, q.r * 3.5, k > 0.5 ? BTL.cyan : BTL.violet, 0.35 * k);
}
