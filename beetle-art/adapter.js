/* ===========================================================================
   KHEPRI — the adapter: the game's side of it (beetle-art/README.md)
   The art above never reads the game. This does: it decides whether the skin
   is on, keeps each pilot's bag, reads the pilot into the `me` the art is
   handed, and is what the stock draw functions hand over to, one guard at the
   top of each: `if (btlTake(...)) return;`.

   The skin is on while all of these hold:
     - the equipped award is KHEPRI (SECRET_SKINS 'ember-gift'), which only a
       profile it was granted to can equip: the dev accounts, and EMBER's own
     - the pilot being drawn is this machine's (pilotSkin is null), so a
       co-op partner is drawn the way it always was
     - the hull is EMBER: on any other pilot the skin does nothing at all
     - nothing in the art has thrown. If anything does, the skin turns itself
       off for the rest of the session and the stock art draws instead.
   Cosmetic only: its randomness is Math.random, never simRnd, and it writes
   nothing the simulation reads.
=========================================================================== */
const BTL_G = { off: false, bags: [], t: 0, me: null, segs: [] };

function btlWorn() {
  if (BTL_G.off || pilotSkin || !P || P.charId !== 'ember') return false;
  let s = null;
  try { s = equippedSpecial(); } catch (e) { return false; }
  return !!s && s.fx === 'ember-gift';
}
// the beetle draws this: true when it is worn and its art ran
function btlTake(fn) {
  if (!btlWorn()) return false;
  try { fn(); return true; }
  catch (err) {
    BTL_G.off = true;
    console.error('KHEPRI: off for this session; the stock art draws instead.', err);
    return false;
  }
}
// this pilot's bag, made afresh when the hull has jumped (a new run, a respawn)
function btlBag() {
  const k = PILOT.on | 0;
  let B = BTL_G.bags[k];
  if (!B || Math.hypot(P.x - B.x, P.y - B.y) > 400) B = BTL_G.bags[k] = btlNew(P.x, P.y, P.ang || 0);
  return B;
}
// the pilot, as the art reads it
function btlMe() {
  const me = BTL_G.me || (BTL_G.me = {}), lance = P.laserT > 0;
  me.x = P.x; me.y = P.y; me.ang = P.ang || 0; me.vx = P.vx || 0; me.vy = P.vy || 0;
  me.charge = lance ? 0 : clamp(P.charge || 0, 0, 1);
  // Z sprays with no lance out: the jaws stand open for it all the same
  me.beam = lance ? (P.laserEnv || 0) : P.odScorch ? 1 : 0;
  BTL_G.segs.length = 0;
  if (lance) {
    for (const s of P.laserSegs) BTL_G.segs.push(s);
    for (const s of P.twinSegs || []) BTL_G.segs.push(s);       // GEMINI's lance burns the same way
  }
  me.segs = BTL_G.segs;
  me.half = lanceHalf() * (P.laserEnv || 0);
  me.range = laserRange() * (P.laserHeavy ? 1.5 : 1);
  me.dash = P.dashT > 0 ? 1 : 0;
  const q = odPhase();
  me.od = q;
  me.odLit = od ? btlOdLit(od.t) : 0;
  me.odGlow = q ? Math.max(me.odLit * 0.8, q.life) : 0;
  me.odLance = q ? q.lance : 0;
  return me;
}

// once a frame, from frame(), next to the wardrobe's: this machine's pilot only
function btlFrame() {
  if (PILOTS.length > 1 && PILOT.on !== pilotMine()) { pilotDo(pilotMine(), btlFrame); return; }
  const dt = clamp(uiTime - BTL_G.t, 0, 0.1);
  BTL_G.t = uiTime;
  btlTake(() => btlTick(btlBag(), btlMe(), state === 'play' || state === 'dead' ? dt : 0));
}

/* A kill: the beetle's own way (true), or left to the stock burst (false).
   The finales, which draw their own deaths, are left to them. */
function btlKillTap(e) {
  if (state !== 'play') return false;
  if (e.type === 'boss' && (e.boss === 'root' || e.founder || e.opo || e.oprRite || e.amalPart ||
      (unwritten && (e === unwritten.a || e === unwritten.b)))) return false;
  return btlTake(() => {
    const B = btlBag(), ang = Math.atan2(e.y - P.y, e.x - P.x);
    if (e.type === 'boss') btlBossAsh(B, e, ang); else btlKill(B, e, ang);
  });
}

/* ---- what the guards hand over to ---- */
function btlDrawPilot() {
  const B = btlBag(), me = btlMe(), phasing = P.ghost > 0 && P.dashT > 0;
  ctx.save();
  if (phasing) ctx.globalAlpha = 0.4;                // Ghost Step: barely there, as the stock hull is
  btlDrawUnder(B, me); btlDrawHull(B, me);
  ctx.restore();
  if (P.hurtFlash > 0) {                              // a hit still reads: the hull flushes red
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    drawGlow(P.x, P.y, 30, '#ef4444', clamp(P.hurtFlash * 3, 0, 0.7));
    ctx.restore();
  }
}
function btlDrawLance() { btlDrawFire(btlBag(), btlMe()); }
function btlDrawFloorMarks() { const B = btlBag(); btlKillsFloor(B); btlScars(odScars, uiTime, B.parts); }
function btlDrawOverBodies() { btlKillsDraw(btlBag()); btlKhepriStars(odStars, odStarBooms, uiTime); }
function btlOdDrawGrade() {
  const q = odPhase();
  if (!q) return;
  const sx = (P.x - cam.x) * camZoom + W / 2, sy = (P.y - cam.y) * camZoom + H / 2;
  btlOdGrade(q, od.t, odFlash, W, H, () => btlOdSwarm(od.t, sx, sy, P.ang || 0, camZoom, W, H));
}
function btlDrawStrikeMarks() {
  const st = P.odStrike;
  if (!st) return;
  const shape = s => Object.assign({}, s, { ang: Math.atan2(s.y2 - s.y1, s.x2 - s.x1), len: Math.hypot(s.x2 - s.x1, s.y2 - s.y1) });
  btlStrikeMarks(st, st.ph === 'aim' ? odStrikeX(mouse.wx, mouse.wy).map(shape) : st.strokes, camZoom, uiTime, odStrikeR());
}
