/* SUPERUSER · Z — harness. The drill's logic is copied from index.html as-is;
   everything here only stands in for the game around it. */
const SU_MAX = 100, SU_GAIN = 12.5, SU_GAIN_BOSS = 40, SU_LEN = 14, SU_KEYS = ['z', 'x', 'c', 'v'];
const DRILL_DMG = 100, SLAM_MUL = 2.5, DRILL_RANGE = 360, DRILL_W = 16, DRILL_WIND = 0.24, DRILL_OUT = 0.28, DRILL_LIFT = 0.6,
      DRILL_HANG = 0.2, DRILL_SLAM = 0.12, DRILL_BACK = 0.32, DRILL_CD = 4.0, PIN_T = 2.5, PIN_BOSS = 1.5, SU_LIFT_H = 90;
const rootRite = false;
var drawFlashT = 0, hitStop = 0;
const rrToScreen = (x, y) => toScreen(x, y);
Object.assign(P, { charId: 'hacker', awake: true, suT: 99, suAt: -9, suRoot: 0, suCd: [0, 0, 0, 0], suDrill: null, dmg: 1 });
const Audio_ = { tone() {}, boom() {}, boss() {}, levelup() {} };
const suOn = () => P.suT > 0 && !rootRite;
const suPinned = e => !!(e.suHold || e.suPin > 0);
const suPower = () => 1;
const suCanPin = e => !!e && !e.dead && !e.hacked;
const isThreat = e => !e.dead && !e.hacked;
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
function damageEnemy(e, dmg) {
  e.hp -= dmg; e.flash = 1;
  floatText(e.x + rnd(8, -8), e.y - e.r - 4, String(Math.round(dmg)), '#f8fafc', 12);
  if (e.hp <= 0) { e.hacked = true; e.hp = e.maxHp; e.suHold = false; e.suLift = 0; e.suPin = 0; e.hackT = 0; }
}
function mk(x, y, heavy) {
  return { id: nextId++, x, y, r: heavy ? 20 : 12, hp: heavy ? 900 : 60, maxHp: heavy ? 900 : 60,
           col: heavy ? '#f97316' : '#fb7185', sides: heavy ? 6 : 3, type: heavy ? 'brute' : 'grunt',
           flash: 0, suLift: 0, suPin: 0, vx: 0, vy: 0, bx: x, by: y, ph: Math.random() * 9 };
}

/* ---- from index.html, unchanged ---- */
function suDrillStart() {
  if (P.suDrill) return;
  P.suDrill = { ph: 'wind', t: 0, ang: P.ang, len: 0, back0: 0, hit: new Set(), target: null };
  P.suCd[0] = DRILL_CD;
}
function suDrillTick(d, dt) {
  d.t += dt;
  const z = d.target;
  if (z && (z.dead || z.hacked || !enemies.includes(z))) suLetGo(d);
  if (d.ph === 'wind') {   // NEW: the mane gathers before it lunges; nothing is hit yet
    d.ang = P.ang;
    if (d.t >= DRILL_WIND) { d.ph = 'out'; d.t = 0; }
    return;
  }
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
  if (d.ph === 'back') {
    d.len = d.back0 * (1 - clamp(d.t / DRILL_BACK, 0, 1));
    if (d.t >= DRILL_BACK) P.suDrill = null;
  }
}
function suBack(d) { d.ph = 'back'; d.t = 0; d.back0 = d.len; d.target = null; }
function suLetGo(d) { const e = d.target; if (e) { e.suHold = false; e.suLift = 0; } suBack(d); }
function suPinTick(e, dt) {
  e.vx = e.vy = 0;
  if (e.suHold && !(P.suDrill && P.suDrill.target === e)) { e.suHold = false; e.suLift = 0; }
  if (e.suPin > 0) e.suPin = Math.max(0, e.suPin - dt);
}
function drawEnemies() {
  let lifted = null;
  for (const e of enemies) if (e.suLift > 0 && !e.dead) { (lifted || (lifted = [])).push([e, e.y]); e.y -= SU_LIFT_H * e.suLift; }
  try { for (const e of enemies) drawBody(e); }
  finally { if (lifted) for (const [e, y] of lifted) e.y = y; }
}

/* ---- the scenes ---- */
let scene = 'mane', sT = 0, cycle = 0, slow = false, zoom = 1.4, mouse = { x: 0, y: -1 };
const LAYOUTS = [-Math.PI / 2, -Math.PI / 2 + 0.75, -Math.PI / 2 - 0.95, -Math.PI / 2 + 0.2];
function setupMane() {
  const a = LAYOUTS[cycle % LAYOUTS.length], ca = Math.cos(a), sa = Math.sin(a);
  P.x = -ca * 120; P.y = -sa * 120 + 20; P.ang = a;
  const at = (d, o, h) => mk(P.x + ca * d - sa * o, P.y + sa * d + ca * o, h);
  enemies = [at(95, -6, false), at(170, 8, false), at(270, 0, true), at(200, 70, false), at(150, -80, false)];
  P.suDrill = null; P.suCd = [0, 0, 0, 0];
}
function setupAim() {
  P.x = 0; P.y = 40;
  enemies = [];
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.42, d = 150 + (i % 3) * 60;
    enemies.push(mk(Math.cos(a) * d, 40 + Math.sin(a) * d, i % 3 === 2));
  }
}
function restart() {
  sT = 0; parts.length = 0; floats.length = 0; rings.length = 0; suFx.length = 0; P.suDrill = null; P.suCd = [0, 0, 0, 0];
  if (scene === 'mane') setupMane(); else if (scene === 'aim') setupAim(); else enemies = [];
}
function setScene(s) { scene = s; cycle = 0; restart(); }

function tickWorld(dt) {
  if (hitStop > 0) { hitStop -= dt; camT = Math.max(0, camT - dt * 1.6); return; }   // as updateGame does
  for (const e of enemies) {
    e.flash = Math.max(0, e.flash - dt * 4);
    if (suPinned(e)) { suPinTick(e, dt); continue; }
    if (e.hacked) { e.hackT += dt; continue; }
    e.x = e.bx + Math.sin(uiTime * 0.9 + e.ph) * 4; e.y = e.by + Math.cos(uiTime * 0.7 + e.ph) * 3;
  }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y += f.vy * dt; if (f.life <= 0) floats.splice(i, 1); }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt; if (rings[i].life <= 0) rings.splice(i, 1); }
  for (const i of [0, 1, 2, 3]) if (P.suCd[i] > 0) P.suCd[i] = Math.max(0, P.suCd[i] - dt);
  if (P.suDrill) suDrillTick(P.suDrill, dt);
  camT = Math.max(0, camT - dt * 1.6);
  drawFlashT = Math.max(0, drawFlashT - dt);
}

function drawWorld() {
  const tr = camT * camT * 10;
  const fa = scene === 'mane' ? LAYOUTS[cycle % LAYOUTS.length] : -Math.PI / 2;
  const off = 196 / zoom;
  cam.x = P.x + Math.cos(fa) * off; cam.y = P.y + Math.sin(fa) * off - 42 / zoom; cam.z = zoom;
  ctx.save();
  ctx.translate(W / 2 + rnd(tr, -tr), H / 2 + rnd(tr, -tr)); ctx.scale(zoom, zoom); ctx.translate(-cam.x, -cam.y);
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

function sceneMane(dt) {
  const L = 6;
  if (sT > L) { cycle++; restart(); }
  once(sT > 0.9 && !P.suDrill && P.suCd[0] === 0, suDrillStart);
  P.ang = LAYOUTS[cycle % LAYOUTS.length] + Math.sin(uiTime * 1.2) * 0.03;
  tickWorld(dt); drawWorld();
  const d = P.suDrill, st = d ? d.ph : '';
  return st === 'wind' ? 'Z — the locks twist together' : st === 'out' ? 'Z — the mane gathers and lunges' : st === 'lift' ? 'impaled, and lifted'
       : st === 'hang' ? 'held at the top' : st === 'slam' ? 'THE SLAM' : st === 'back' ? 'the hair comes home'
       : enemies.some(e => e.suPin > 0) ? 'pinned — the locks staked over it' : 'SUPERUSER, waiting';
}
function once(cond, f) { if (cond) f(); }

function sceneAim(dt) {
  const w = { x: (mouse.x - W / 2) / zoom + cam.x, y: (mouse.y - H / 2) / zoom + cam.y };
  P.ang = Math.atan2(w.y - P.y, w.x - P.x);
  enemies = enemies.filter(e => !(e.hacked && e.hackT > 1.4));
  if (!enemies.length) setupAim();
  tickWorld(dt); drawWorld();
  return 'aim with the mouse · Z to cast · ' + (P.suCd[0] > 0 ? P.suCd[0].toFixed(1) + 's' : 'ready');
}

// the HUD's states, on a loop, at 3×
const HUD_LEN = 14;
function sceneHud(dt) {
  if (sT > HUD_LEN) restart();
  let lab;
  if (sT < 4) { P.suT = 0; P.suRoot = Math.min(SU_MAX, Math.floor(sT / 0.5) * SU_GAIN); lab = 'filling — a cell a body'; }
  else if (sT < 6.5) { P.suT = 0; P.suRoot = SU_MAX; lab = 'ROOT ready — [F]'; }
  else {
    if (P.suT === 0) { P.suT = SU_LEN; P.suRoot = 0; }
    P.suT = Math.max(0.01, P.suT - dt);
    if (sT > 7.5 && sT - dt <= 7.5) P.suCd[0] = DRILL_CD;
    for (const i of [0, 1, 2, 3]) if (P.suCd[i] > 0) P.suCd[i] = Math.max(0, P.suCd[i] - dt);
    lab = sT < 7.5 ? 'SUPERUSER — Z live' : P.suCd[0] > 0 ? 'Z cooling down' : 'Z back — it flashes';
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
  uiTime += dt; sT += dt;
  if (hitStop <= 0) tickParts(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const label = scene === 'mane' ? sceneMane(dt) : scene === 'aim' ? sceneAim(dt) : sceneHud(dt);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (scene !== 'hud') { P.suRoot = 0; P.suT = SU_LEN - (uiTime % (SU_LEN - 1)); drawSuHud(16, 52, 120); }
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = ctx.createPattern(scanTile, 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = "800 11px Barlow, system-ui"; ctx.letterSpacing = '3px';
  ctx.fillStyle = SU_COL; ctx.fillText('SUPERUSER · Z', 16, 20);
  const lw0 = ctx.measureText('SUPERUSER · Z').width; ctx.letterSpacing = '0px';
  ctx.font = "400 11px 'JetBrains Mono', monospace"; ctx.fillStyle = 'rgba(148,163,184,0.8)';
  ctx.fillText(label + (slow ? '   · ×0.2' : ''), 16 + lw0 + 14, 20);
  ctx.textAlign = 'right'; ctx.font = "600 10px Barlow, system-ui"; ctx.letterSpacing = '2px';
  const keys = [['1', 'THE MANE', 'mane'], ['2', 'AIM IT', 'aim'], ['3', 'HUD', 'hud']];
  let kx = W - 20;
  for (let i = keys.length - 1; i >= 0; i--) {
    const [k, n, id] = keys[i], s = k + ' ' + n;
    ctx.fillStyle = scene === id ? '#e2e8f0' : 'rgba(100,116,139,0.7)';
    ctx.fillText(s, kx, H - 10); kx -= ctx.measureText(s).width + 22;
  }
  ctx.fillStyle = 'rgba(100,116,139,0.55)';
  ctx.fillText('S SLOW · G ×' + zoom + ' · SPACE REPLAY', kx, H - 10);
  ctx.restore();
  requestAnimationFrame(frame);
}
let last = 0;
window.suStart = () => {
  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); restart(); }
    if (k === '1') setScene('mane');
    if (k === '2') setScene('aim');
    if (k === '3') setScene('hud');
    if (k === 's') slow = !slow;
    if (k === 'g') zoom = zoom === 1.4 ? 1 : zoom === 1 ? 2.4 : 1.4;
    if (k === 'z' && scene !== 'hud' && P.suCd[0] <= 0) suDrillStart();
  });
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  addEventListener('mousedown', () => { if (scene === 'aim' && P.suCd[0] <= 0) suDrillStart(); });
  resize(); tiles();
  const q = new URLSearchParams(location.search).get('s');
  setScene(q === '2' ? 'aim' : q === '3' ? 'hud' : 'mane');
  requestAnimationFrame(ts => { last = ts; frame(ts); });
};
