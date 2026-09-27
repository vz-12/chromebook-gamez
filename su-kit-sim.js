/* SUPERUSER · X — harness. The drill's and the rootkit's logic are copied from
   index.html as-is; everything here only stands in for the game around them. */
const SU_MAX = 100, SU_GAIN = 12.5, SU_GAIN_BOSS = 40, SU_LEN = 14, SU_KEYS = ['z', 'x', 'c', 'v'];
const DRILL_DMG = 100, SLAM_MUL = 2.5, DRILL_RANGE = 360, DRILL_W = 16, DRILL_WIND = 0.24, DRILL_OUT = 0.28, DRILL_LIFT = 0.6,
      DRILL_HANG = 0.2, DRILL_SLAM = 0.12, DRILL_BACK = 0.32, DRILL_CD = 4.0, PIN_T = 2.5, PIN_BOSS = 1.5, SU_LIFT_H = 90;
const KIT_R = 150, KIT_LEN = 20, KIT_DPS = 25, KIT_TICK = 0.25, KIT_HACK = 10, KIT_CD = 15, KIT_PLUNGE = 0.4, KIT_PULL = 0.3;
const SU_CD_MAX = [DRILL_CD, KIT_CD, 0, 0];
const suZones = [];
const COMBO_HP = 0.5, COMBO_FOUR = 0.3, COMBO_RIP = 0.65, COMBO_HOLD = 0.35, COMBO_GAP = 0.12,
      PIECE_DMG = 250, PIECE_SPLASH = 70, PIECE_SPD = 1100, PIECE_LIFE = 1.4, PIECE_OUT = 1.35;
const suPieces = [];
const BOSSES = { warden: { sides: 8 } };
function killEnemy(e) { e.dead = true; }
const rootRite = false;
var drawFlashT = 0, hitStop = 0;
const rrToScreen = (x, y) => toScreen(x, y);
Object.assign(P, { charId: 'hacker', awake: true, suT: 99, suAt: -9, suRoot: 0, suCd: [0, 0, 0, 0], suDrill: null, suPlunge: null, suCombo: null, dmg: 1 });
const Audio_ = { tone() {}, boom() {}, boss() {}, levelup() {} };
const suOn = () => P.suT > 0 && !rootRite;
const suPinned = e => !!(e.suHold || e.suPin > 0);
const suPower = () => 1;
const suCanPin = e => !!e && !e.dead && !e.hacked;
const isThreat = e => !e.dead && !e.hacked;
const arena = { x0: -3000, y0: -3000, x1: 3000, y1: 3000 };
const mouse = { x: 0, y: -1, wx: 0, wy: -200 };
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((cx - x1) * dx + (cy - y1) * dy) / l2, 0, 1);
  return Math.hypot(x1 + dx * t - cx, y1 + dy * t - cy) <= r;
}
let enemies = [], floats = [], rings = [], nextId = 1, camT = 0;
function burst(x, y, n, color, spd = 200, size = 3, life = 0.5, spread = TAU, dir = 0) {
  for (let i = 0; i < n; i++) {
    const a = dir + (spread >= TAU ? rnd(TAU) : rnd(-spread / 2, spread / 2)), s = spd * rnd(1.2, 0.25);
    spawnPart(x, y, Math.cos(a) * s, Math.sin(a) * s, size * rnd(1.4, 0.5), color, life * rnd(1.3, 0.6));
  }
}
function floatText(x, y, text, color, size = 14, vy = -46) { floats.push({ x, y, text, color, size, vy, life: 0.72, max: 0.72 }); }
function ringFx(x, y, r0, r1, color, life = 0.35, lw = 3) { rings.push({ x, y, r0, r1, color, life, max: life, lw }); }
function shake(t) { camT = Math.min(1, camT + t); }
// the game's hackTake, as far as it shows
function hackTake(e) {
  e.hacked = true; e.hp = e.maxHp * 0.6; e.suHold = false; e.suLift = 0; e.suPin = 0; e.hackT = 0;
  ringFx(e.x, e.y, e.r * 0.5, e.r * 3.4, HACK_COL, 0.5, 3);
  burst(e.x, e.y, 18, HACK_COL, 240, 3, 0.5);
  floatText(e.x, e.y - e.r - 10, 'HACKED', HACK_COL, 13);
  return true;
}
function damageEnemy(e, dmg, crit, sx, sy, opts = {}) {
  e.hp -= dmg; e.flash = Math.max(e.flash, opts.silent ? 0.35 : 1);
  if (!opts.silent || Math.random() < 0.34) floatText(e.x + rnd(8, -8), e.y - e.r - 4, String(Math.round(dmg)), '#f8fafc', opts.silent ? 10 : 12);
  if (e.hp <= 0) hackTake(e);
}
function mk(x, y, heavy, mv) {
  return Object.assign({ id: nextId++, x, y, r: heavy ? 20 : 12, hp: heavy ? 900 : 400, maxHp: heavy ? 900 : 400,
           col: heavy ? '#f97316' : '#fb7185', sides: heavy ? 6 : 3, type: heavy ? 'brute' : 'grunt',
           flash: 0, suLift: 0, suPin: 0, suExpo: 0, vx: 0, vy: 0, bx: x, by: y, ph: Math.random() * 9, ax: 4, ay: 3, sp: 0.9 }, mv || {});
}

/* ---- from index.html, unchanged ---- */
function suDrillStart() {
  if (P.suDrill || P.suPlunge) return;
  P.suDrill = { ph: 'wind', t: 0, ang: P.ang, len: 0, back0: 0, hit: new Set(), target: null };
  P.suCd[0] = DRILL_CD;
}
function suDrillTick(d, dt) {
  d.t += dt;
  const z = d.target;
  if (z && (z.dead || z.hacked || !enemies.includes(z))) suLetGo(d);
  if (d.ph === 'combo') return;
  if (d.ph === 'wind') { d.ang = P.ang; if (d.t >= DRILL_WIND) { d.ph = 'out'; d.t = 0; } return; }
  if (d.ph === 'out') {
    d.len = Math.min(DRILL_RANGE, DRILL_RANGE * d.t / DRILL_OUT);
    const ca = Math.cos(d.ang), sa = Math.sin(d.ang);
    const x1 = P.x + ca * d.len, y1 = P.y + sa * d.len;
    const cand = [];
    for (const e of enemies) {
      if (!isThreat(e) || d.hit.has(e.id)) continue;
      if (!segCircle(P.x, P.y, x1, y1, e.x, e.y, e.r + DRILL_W)) continue;
      cand.push([(e.x - P.x) * ca + (e.y - P.y) * sa, e]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (const [along, e] of cand) {
      d.hit.add(e.id);
      damageEnemy(e, DRILL_DMG * suPower(), false, P.x, P.y);
      suBite(e);
      if (e.dead || e.hacked) continue;
      if (suCanPin(e)) { suImpale(d, e, along); return; }
      d.len = Math.max(0, along); suBack(d); return;
    }
    if (d.len >= DRILL_RANGE) suBack(d);
    return;
  }
  if (d.ph === 'lift' || d.ph === 'hang' || d.ph === 'slam') {
    const e = d.target;
    e.vx = e.vy = 0;
    d.len = len(e.x - P.x, e.y - P.y);
    d.ang = Math.atan2(e.y - P.y, e.x - P.x);
    if (d.ph === 'lift') { e.suLift = rrEaseOut(clamp(d.t / DRILL_LIFT, 0, 1)); if (d.t >= DRILL_LIFT) { d.ph = 'hang'; d.t = 0; } }
    else if (d.ph === 'hang') { e.suLift = 1; if (d.t >= DRILL_HANG) { d.ph = 'slam'; d.t = 0; } }
    else { e.suLift = 1 - rrEaseIn(clamp(d.t / DRILL_SLAM, 0, 1)); if (d.t >= DRILL_SLAM) suSlam(d, e); }
    return;
  }
  if (d.ph === 'back') { d.len = d.back0 * (1 - clamp(d.t / DRILL_BACK, 0, 1)); if (d.t >= DRILL_BACK) P.suDrill = null; }
}
function suBack(d) { d.ph = 'back'; d.t = 0; d.back0 = d.len; d.target = null; }
function suLetGo(d) { const e = d.target; if (e) { e.suHold = false; e.suLift = 0; } suBack(d); }
function suPinTick(e, dt) {
  e.vx = e.vy = 0;
  if (e.suHold && !(P.suDrill && P.suDrill.target === e)) { e.suHold = false; e.suLift = 0; }
  if (e.suPin > 0) e.suPin = Math.max(0, e.suPin - dt);
}
function suKitStart() {
  if (P.suPlunge) return;
  if (P.suDrill) { floatText(P.x, P.y - 42, 'THE MANE IS OUT', '#94a3b8', 12); return; }
  const dx = mouse.wx - P.x, dy = mouse.wy - P.y, d = len(dx, dy) || 1;
  const r = Math.min(d, DRILL_RANGE);
  P.suPlunge = { ph: 'dive', t: 0, ang: Math.atan2(dy, dx),
                 x: clamp(P.x + dx / d * r, arena.x0 + 30, arena.x1 - 30),
                 y: clamp(P.y + dy / d * r, arena.y0 + 30, arena.y1 - 30) };
  P.suCd[1] = KIT_CD;
}
function suPlungeTick(p, dt) {
  p.t += dt;
  if (p.ph === 'dive' && p.t >= KIT_PLUNGE) { suKitOpen(p); p.ph = 'pull'; p.t = 0; }
  else if (p.ph === 'pull' && p.t >= KIT_PULL) P.suPlunge = null;
}
function suKitTick(dt) {
  for (let i = suZones.length - 1; i >= 0; i--) {
    const z = suZones[i];
    z.t += dt; z.tick -= dt;
    if (z.t >= z.life) { suZones.splice(i, 1); continue; }
    const bite = z.tick <= 0;
    if (bite) z.tick += KIT_TICK;
    for (const e of enemies) {
      if (!isThreat(e) || e.phased || len(e.x - z.x, e.y - z.y) > z.r) continue;
      e.suKitIn = true;
      if (bite) damageEnemy(e, KIT_DPS * KIT_TICK * suPower(), false, z.x, z.y, { silent: true, noChain: true });
    }
  }
  for (const e of enemies) {
    if (!e.suKitIn) continue;
    e.suKitIn = false;
    if (!isThreat(e) || e.type === 'boss' || e.suKitNo) continue;
    e.suExpo = (e.suExpo || 0) + dt;
    if (e.suExpo >= KIT_HACK) suKitTake(e);
  }
}
/* ---- COMBO #1, from index.html, unchanged ---- */
function suComboReady() {
  const d = P.suDrill, e = d && d.target;
  if (!e || !(d.ph === 'lift' || d.ph === 'hang' || d.ph === 'slam')) return null;
  if (e.type !== 'boss' || !suCanPin(e)) return null;
  const bd = e.boss && BOSSES[e.boss];
  if (bd && bd.endgame) return null;
  return e.hp <= e.maxHp * COMBO_HP ? e : null;
}
function suComboStart(e) {
  const d = P.suDrill;
  d.ph = 'combo'; d.t = 0;
  e.suHold = true; e.suLift = 1; e.vx = e.vy = 0;
  P.suCombo = { e, ph: 'pierce', t: 0, n: 0, thrown: 0, hx: 0, hy: 0, ang: Math.atan2(e.y - P.y, e.x - P.x) };
  P.suCd[1] = KIT_CD;
  suComboPierce(P.suCombo, 2);
}
function suComboTick(c, dt) {
  c.t += dt;
  const d = P.suDrill;
  if (c.ph === 'pierce') {
    const e = c.e;
    if (e.dead || e.hacked || !enemies.includes(e)) { P.suCombo = null; if (d && d.ph === 'combo') suLetGo(d); return; }
    e.vx = e.vy = 0; e.suLift = 1;
    if (c.n < 4 && c.t >= COMBO_FOUR) suComboPierce(c, 4);
    if (c.t >= COMBO_RIP) suComboRip(c);
    return;
  }
  if (d && d.ph === 'combo') { d.ang = Math.atan2(c.hy - P.y, c.hx - P.x); d.len = len(c.hx - P.x, c.hy - P.y); }
  if (c.t >= COMBO_HOLD + c.thrown * COMBO_GAP) {
    const p = suPieces.find(q => q.held && q.combo === c && q.i === c.thrown);
    if (p) suComboThrow(p);
    if (++c.thrown >= 4) { P.suCombo = null; if (d && d.ph === 'combo') suBack(d); }
  }
}
function suComboRip(c) {
  const e = c.e;
  c.hx = e.x; c.hy = e.y - SU_LIFT_H * (e.suLift || 1);
  c.ph = 'hold'; c.t = 0;
  const d = P.suDrill;
  if (d) d.target = null;
  e.suHold = false; e.suLift = 0;
  const out = Math.max(10, e.r) * PIECE_OUT;
  for (let i = 0; i < 4; i++) {
    const a = c.ang + i * Math.PI / 2;
    suPieces.push({ held: true, combo: c, i, a, out, x: c.hx + Math.cos(a) * out, y: c.hy + Math.sin(a) * out,
                    vx: 0, vy: 0, target: null, t: 0, life: PIECE_LIFE, r: Math.max(10, e.r * 0.45), col: e.col, er: e.r,
                    sides: (BOSSES[e.boss] || {}).sides || 8, spin: rnd(14, 6) * (i % 2 ? 1 : -1), rot: a });
  }
  suComboRipFx(c, c.hx, c.hy);
  e.suRipped = true; e.hp = 0; killEnemy(e);
}
function suComboThrow(p) {
  const taken = new Set(suPieces.filter(q => !q.held && q.target).map(q => q.target));
  let best = null, bd = Infinity, any = null, ad = Infinity;
  for (const o of enemies) {
    if (!isThreat(o)) continue;
    const dd = len(o.x - p.x, o.y - p.y);
    if (dd < ad) { ad = dd; any = o; }
    if (!taken.has(o) && dd < bd) { bd = dd; best = o; }
  }
  p.target = best || any; p.held = false; p.t = 0;
  const tx = p.target ? p.target.x : p.x + Math.cos(p.a) * 100, ty = p.target ? p.target.y : p.y + Math.sin(p.a) * 100;
  const dx = tx - p.x, dy = ty - p.y, dd = len(dx, dy) || 1;
  p.vx = dx / dd * PIECE_SPD; p.vy = dy / dd * PIECE_SPD;
  suComboThrowFx(p);
}
function suPieceTick(dt) {
  for (let i = suPieces.length - 1; i >= 0; i--) {
    const p = suPieces[i];
    if (p.held) {
      const c = p.combo;
      p.x = c.hx + Math.cos(p.a) * p.out; p.y = c.hy + Math.sin(p.a) * p.out;
      p.rot += p.spin * dt * 0.15;
      if (P.suCombo !== c) suComboThrow(p);
      continue;
    }
    p.t += dt; p.rot += p.spin * dt;
    if (p.target && !isThreat(p.target)) {
      let best = null, bd = 900;
      for (const o of enemies) if (isThreat(o)) { const dd = len(o.x - p.x, o.y - p.y); if (dd < bd) { bd = dd; best = o; } }
      p.target = best;
    }
    if (p.target) {
      const dx = p.target.x - p.x, dy = p.target.y - p.y, dd = len(dx, dy) || 1, k = Math.min(1, dt * 12);
      p.vx = lerp(p.vx, dx / dd * PIECE_SPD, k); p.vy = lerp(p.vy, dy / dd * PIECE_SPD, k);
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    let hit = null;
    for (const o of enemies) if (isThreat(o) && len(o.x - p.x, o.y - p.y) < o.r + p.r) { hit = o; break; }
    if (hit) { suPieceHit(p, hit); suPieces.splice(i, 1); continue; }
    if (p.t >= p.life) suPieces.splice(i, 1);
  }
}
function suPieceHit(p, e) {
  const dmg = PIECE_DMG * suPower();
  damageEnemy(e, dmg, false, p.x, p.y);
  for (const o of enemies)
    if (o !== e && isThreat(o) && len(o.x - p.x, o.y - p.y) < PIECE_SPLASH + o.r) damageEnemy(o, dmg * 0.5, false, p.x, p.y, { silent: true, noChain: true });
  suPieceHitFx(p, e);
}

function drawEnemies() {
  let lifted = null;
  for (const e of enemies) if (e.suLift > 0 && !e.dead) { (lifted || (lifted = [])).push([e, e.y]); e.y -= SU_LIFT_H * e.suLift; }
  try { for (const e of enemies) if (!e.dead) drawBody(e); }
  finally { if (lifted) for (const [e, y] of lifted) e.y = y; }
}

/* ---- the scenes ---- */
let scene = 'kit', sT = 0, slow = false, fast = false, zoom = 1.4;
const SPOT = { x: 0, y: -70 };
function setupKit() {
  P.x = 0; P.y = 170; P.ang = -Math.PI / 2;
  enemies = [
    mk(-55, -100, false, { ax: 10, ay: 8, sp: 0.6 }),
    mk(70, -40, false, { ax: 8, ay: 10, sp: 0.7 }),
    mk(20, -150, true, { ax: 6, ay: 4, sp: 0.5 }),
    mk(0, -125, false, { ax: 230, ay: 14, sp: 0.42 }),          // walks through it and out again
    mk(150, -20, false, { ax: 70, ay: 50, sp: 0.55 }),          // on the edge, in and out
    mk(-230, 20, false, { ax: 6, ay: 6, sp: 0.8 })              // never in it
  ];
}
function setupAim() {
  P.x = 0; P.y = 60;
  enemies = [];
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.38, d = 170 + (i % 3) * 60;
    enemies.push(mk(Math.cos(a) * d, 60 + Math.sin(a) * d, i % 3 === 2, { ax: 30 + (i % 2) * 40, ay: 20, sp: 0.4 + (i % 3) * 0.15 }));
  }
}
function setupCombo() {
  P.x = 0; P.y = 170; P.ang = -Math.PI / 2;
  const b = mk(0, -40, true, { ax: 3, ay: 3, sp: 0.5 });
  Object.assign(b, { type: 'boss', boss: 'warden', r: 46, sides: 8, col: '#ef4444', maxHp: 4000, hp: 1900 });
  enemies = [b,
    mk(-200, -150, false, { ax: 20, ay: 10, sp: 0.6 }), mk(210, -120, false, { ax: 16, ay: 12, sp: 0.5 }),
    mk(-150, 90, false, { ax: 14, ay: 10, sp: 0.7 }), mk(180, 110, true, { ax: 10, ay: 8, sp: 0.5 })];
}
function restart() {
  sT = 0; parts.length = 0; floats.length = 0; rings.length = 0; suFx.length = 0; suZones.length = 0;
  P.suDrill = null; P.suPlunge = null; P.suCd = [0, 0, 0, 0];
  suPieces.length = 0; P.suCombo = null;
  if (scene === 'kit') setupKit(); else if (scene === 'aim') setupAim(); else if (scene === 'combo') setupCombo(); else enemies = [];
}
function setScene(s) { scene = s; restart(); }

function tickWorld(dt) {
  if (hitStop > 0) { hitStop -= dt; camT = Math.max(0, camT - dt * 1.6); return; }
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt * 4);
    if (suPinned(e)) { suPinTick(e, dt); continue; }
    if (e.hacked) { e.hackT += dt; continue; }
    e.x = e.bx + Math.sin(uiTime * e.sp + e.ph) * e.ax; e.y = e.by + Math.cos(uiTime * e.sp * 0.8 + e.ph) * e.ay;
  }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y += f.vy * dt; if (f.life <= 0) floats.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
  for (const i of [0, 1, 2, 3]) if (P.suCd[i] > 0) P.suCd[i] = Math.max(0, P.suCd[i] - dt);
  if (P.suDrill) suDrillTick(P.suDrill, dt);
  if (P.suPlunge) suPlungeTick(P.suPlunge, dt);
  if (P.suCombo) suComboTick(P.suCombo, dt);
  suPieceTick(dt);
  suKitTick(dt);
  camT = Math.max(0, camT - dt * 1.6);
  drawFlashT = Math.max(0, drawFlashT - dt);
}

function drawWorld() {
  const tr = camT * camT * 10;
  cam.z = zoom * (scene === 'kit' || scene === 'combo' ? 0.82 : 0.8);
  if (scene === 'kit') { cam.x = 0; cam.y = 10; }
  else if (scene === 'combo') { cam.x = 0; cam.y = -10; }
  else { cam.x = P.x; cam.y = P.y - 150; }
  ctx.save();
  ctx.translate(W / 2 + rnd(tr, -tr), H / 2 + rnd(tr, -tr)); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  drawRoom();
  drawSuUnderBodies();
  drawEnemies();
  drawSuOverBodies();
  drawSuperuser(1);
  drawHull(HACK_COL);
  drawSuperuserHull(1);
  drawParts();
  for (const r of rings) {
    const k = 1 - r.life / r.max;
    ctx.strokeStyle = rgba(r.color, 1 - k); ctx.lineWidth = r.lw * (1 - k) + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, lerp(r.r0, r.r1, easeOut(k)), 0, TAU); ctx.stroke();
  }
  ctx.textAlign = 'center';
  for (const f of floats) {
    ctx.globalAlpha = clamp(f.life / f.max * 1.6, 0, 1);
    ctx.font = "800 " + f.size + "px Barlow, system-ui"; ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawSuImpact();
  if (drawFlashT > 0) { ctx.fillStyle = 'rgba(254,252,232,' + drawFlashT * 2.2 + ')'; ctx.fillRect(0, 0, W, H); }
}

const KIT_SCENE = 16;
function sceneKit(dt) {
  if (sT > KIT_SCENE) restart();
  if (sT > 0.9 && !P.suPlunge && P.suCd[1] === 0 && !suZones.length) { mouse.wx = SPOT.x; mouse.wy = SPOT.y; suKitStart(); }
  P.ang = -Math.PI / 2 + Math.sin(uiTime * 1.2) * 0.03;
  tickWorld(dt); drawWorld();
  const p = P.suPlunge;
  if (p) {
    if (p.ph === 'pull') return 'X — locked in; the mane pulls out';
    const u = p.t / KIT_PLUNGE;
    return u < KIT_GATHER ? 'X — the mane winds in' : u < KIT_REACH ? 'X — up and over, and down' : 'X — screwed into the plating';
  }
  const z = suZones[0];
  if (!z) return 'SUPERUSER, waiting';
  const took = enemies.filter(e => e.hacked).length;
  return 'ROOTKIT — ' + (z.life - z.t).toFixed(1) + 's left' + (took ? ' · ' + took + ' taken' : ' · ten seconds in it takes a body');
}

const COMBO_SCENE = 5.5;
function sceneCombo(dt) {
  if (sT > COMBO_SCENE) restart();
  const d = P.suDrill;
  if (sT > 0.6 && sT < 1 && !d && P.suCd[0] === 0) suDrillStart();
  if (d && d.ph === 'lift' && d.t > DRILL_LIFT * 0.55 && !P.suCombo) { const ce = suComboReady(); if (ce && P.suCd[1] <= 0) suComboStart(ce); }
  P.ang = -Math.PI / 2 + Math.sin(uiTime * 1.2) * 0.03;
  tickWorld(dt); drawWorld();
  const c = P.suCombo, st = d ? d.ph : '';
  if (c) return c.ph === 'pierce' ? (c.n < 4 ? 'COMBO #1 — a second drill through it' : 'two more grow out — it cracks along the X') : 'RIPPED — a quarter on each drill, thrown one by one';
  if (suPieces.length) return 'each quarter lodges in the nearest';
  return st === 'wind' || st === 'out' ? 'Z at a boss under half' : st === 'lift' || st === 'hang' ? 'lifted — [X]' : 'SUPERUSER, waiting';
}

function sceneAim(dt) {
  const w = { x: (mouse.x - W / 2) / cam.z + cam.x, y: (mouse.y - H / 2) / cam.z + cam.y };
  mouse.wx = w.x; mouse.wy = w.y;
  P.ang = Math.atan2(w.y - P.y, w.x - P.x);
  if (!enemies.some(isThreat)) setupAim();
  tickWorld(dt); drawWorld();
  const cd = i => P.suCd[i] > 0 ? P.suCd[i].toFixed(1) + 's' : 'ready';
  return 'aim with the mouse · Z / click drill ' + cd(0) + ' · X / right-click rootkit ' + cd(1);
}

// the HUD's states, on a loop, at 3×
const HUD_LEN = 26;
function sceneHud(dt) {
  if (sT > HUD_LEN) restart();
  let lab;
  if (sT < 4) { P.suT = 0; P.suRoot = Math.min(SU_MAX, Math.floor(sT / 0.5) * SU_GAIN); lab = 'filling — a cell a body'; }
  else if (sT < 6.5) { P.suT = 0; P.suRoot = SU_MAX; lab = 'ROOT ready — [F]'; }
  else {
    if (P.suT === 0) { P.suT = SU_LEN; P.suRoot = 0; }
    P.suT = Math.max(0.01, P.suT - dt);
    if (sT > 7.5 && sT - dt <= 7.5) P.suCd[0] = DRILL_CD;
    if (sT > 8.5 && sT - dt <= 8.5) P.suCd[1] = KIT_CD;
    for (const i of [0, 1, 2, 3]) if (P.suCd[i] > 0) P.suCd[i] = Math.max(0, P.suCd[i] - dt);
    lab = sT < 7.5 ? 'SUPERUSER — Z and X live' : sT < 8.5 ? 'Z cooling — 4s sweep' : P.suCd[1] > 0 ? 'X cooling — its own 15s sweep' : 'both back';
  }
  cam.x = 0; cam.y = 0;
  ctx.save(); ctx.translate(W / 2, H / 2); drawRoom(); ctx.restore();
  const S = 3;
  ctx.save(); ctx.translate(W / 2 - 40 * S, H / 2 - 24 * S); ctx.scale(S, S);
  drawSuHud(0, 10, 90);
  ctx.restore();
  return lab;
}

function frame(ts) {
  let dt = Math.min(0.034, (ts - last) / 1000 || 0); last = ts;
  if (slow) dt *= 0.2;
  const steps = fast && !slow ? 3 : 1;
  let label = '';
  for (let s = 0; s < steps; s++) {
    uiTime += dt; sT += dt;
    if (hitStop <= 0) tickParts(dt);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    label = scene === 'kit' ? sceneKit(dt) : scene === 'aim' ? sceneAim(dt) : scene === 'combo' ? sceneCombo(dt) : sceneHud(dt);
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (scene !== 'hud') { P.suRoot = 0; P.suT = SU_LEN - (uiTime % (SU_LEN - 1)); drawSuHud(16, 52, 120); }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(scanTile, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = "800 11px Barlow, system-ui"; ctx.letterSpacing = '3px';
  const ttl = scene === 'combo' ? 'SUPERUSER · Z → X' : 'SUPERUSER · X';
  ctx.fillStyle = SU_COL; ctx.fillText(ttl, 16, 20);
  const lw0 = ctx.measureText(ttl).width; ctx.letterSpacing = '0px';
  ctx.font = "400 11px 'JetBrains Mono', monospace"; ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText(label + (slow ? '   · ×0.2' : fast ? '   · ×3' : ''), 16 + lw0 + 14, 20);
  ctx.textAlign = 'right'; ctx.font = "600 10px Barlow, system-ui"; ctx.letterSpacing = '2px';
  const keys = [['1', 'ROOTKIT', 'kit'], ['2', 'AIM IT', 'aim'], ['3', 'HUD', 'hud'], ['4', 'COMBO #1', 'combo']];
  let kx = W - 20;
  for (let i = keys.length - 1; i >= 0; i--) {
    const [k, n, id] = keys[i], s = k + ' ' + n;
    ctx.fillStyle = scene === id ? '#e2e8f0' : 'rgba(100,116,139,0.7)';
    ctx.fillText(s, kx, H - 10); kx -= ctx.measureText(s).width + 22;
  }
  ctx.fillStyle = 'rgba(100,116,139,0.55)';
  ctx.fillText('S SLOW · F ×3 · G ×' + zoom + ' · SPACE REPLAY', kx, H - 10);
  ctx.restore();
  requestAnimationFrame(frame);
}
let last = 0;
window.suStart = () => {
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); restart(); }
    if (k === '1') setScene('kit');
    if (k === '2') setScene('aim');
    if (k === '3') setScene('hud');
    if (k === '4') setScene('combo');
    if (k === 's') slow = !slow;
    if (k === 'f') fast = !fast;
    if (k === 'g') zoom = zoom === 1.4 ? 1 : zoom === 1 ? 2.4 : 1.4;
    if (k === 'z' && scene === 'aim' && P.suCd[0] <= 0) suDrillStart();
    if (k === 'x' && scene === 'aim' && P.suCd[1] <= 0) { const ce = suComboReady(); if (ce) suComboStart(ce); else suKitStart(); }
  });
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousedown', e => {
    if (scene !== 'aim') return;
    if (e.button === 2) { if (P.suCd[1] <= 0) { const ce = suComboReady(); if (ce) suComboStart(ce); else suKitStart(); } }
    else if (P.suCd[0] <= 0) suDrillStart();
  });
  resize(); tiles();
  const q = new URLSearchParams(location.search).get('s');
  setScene(q === '2' ? 'aim' : q === '3' ? 'hud' : q === '4' ? 'combo' : 'kit');
  requestAnimationFrame(ts => { last = ts; frame(ts); });
};
