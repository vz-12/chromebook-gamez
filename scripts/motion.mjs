#!/usr/bin/env node
/* ===========================================================================
   MOTION — its test: `npm run test:motion` (BEETLE-PLAN.md)

   MOTION is sliced out of index.html on its own, with only TAU, clamp, lerp
   and a ctx that records, because it promises to lean on nothing else.

     SPRINGS     exact for any dt: the same at 30, 60 and 144 fps and on a
                 ragged frame clock; stable where THE KIT's hlSpring is not;
                 critical damping never overshoots; angles go the short way
     SMOOTHING   moDecay the same at any frame rate
     BODIES      a chain whipped round at ~1000 px/s, or dragged through a
                 dash, holds its exact length and its bend limit and lands in
                 the same place at any frame rate; a soft body keeps its shape;
                 compliance stretches; moPlace moves it whole
     PATHS       read back on the true curve at any frame rate, evenly spaced,
                 straight behind before anything has been flown
     EMITTERS    evenly spaced at 30 fps behind a 1200 px/s source
     PARTICLES   exact under drag and push; pre-aging is the same as stepping
     FLOW        no divergence, and smooth
     CURVES      through every point; a ribbon tapers and closes
   THE KIT's spring and rope are run through the same cases alongside, as
   the comparison, and printed rather than tested.
=========================================================================== */
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

const cut = (from, to) => {
  const a = html.indexOf(from), b = html.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('motion test: cannot find ' + JSON.stringify(from));
  return html.slice(html.lastIndexOf('/*', a), b + to.length);
};
const MOTION = cut('   MOTION — smooth physics for the art', '/* ===================== end of MOTION ===================== */');
// THE KIT's rig spring and its verlet rope, for the comparison
const fn = name => {
  const a = html.indexOf('\nfunction ' + name + '(');
  if (a < 0) throw new Error('motion test: no ' + name);
  return html.slice(a + 1, html.indexOf('\n}\n', a) + 2);
};
const KIT = ['hlSpring', 'hlVBody', 'hlVPoint', 'hlVLink', 'hlRope', 'hlVStep', 'hlVPin'].map(fn).join('\n');

// a ctx that only records what it is asked to draw
const calls = [];
const ctx = new Proxy({}, { get: (_, k) => (...a) => { calls.push([k, ...a]); } });
const sandbox = { TAU: Math.PI * 2, clamp: (v, a, b) => v < a ? a : v > b ? b : v,
                  lerp: (a, b, t) => a + (b - a) * t, ctx, Math, console };
vm.createContext(sandbox);
// a const in a script is not a property of its global: hand each one out
const consts = [...MOTION.matchAll(/^const (\w+)/gm)].map(m => m[1]);
vm.runInContext(MOTION + '\n' + KIT + '\n;' + consts.map(n => `globalThis.${n} = ${n};`).join(' '), sandbox);
const M = sandbox;

let fails = 0, passes = 0;
const ok = (good, what, detail = '') => {
  if (good) passes++; else fails++;
  console.log((good ? '  ✓ ' : '  ✗ ') + what + (detail ? '  · ' + detail : ''));
};
const head = t => console.log('\n' + t);
const note = t => console.log('    ' + t);
const fmt = (v, d = 3) => Number.isFinite(v) ? (Math.abs(v) >= 1e5 ? v.toExponential(2) : v.toFixed(d)) : String(v);

/* frame clocks: steady ones, and a ragged one that drops frames the way a
   busy Chromebook does (mostly 60, sometimes 30, now and then a 100 ms stall) */
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
function clock(kind, T) {
  const out = [];
  let t = 0;
  while (t < T - 1e-12) {
    let dt = kind === 'ragged' ? (rand() < 0.08 ? 0.1 : rand() < 0.3 ? 1 / 30 : 1 / 60 + rand() * 0.004) : 1 / kind;
    dt = Math.min(dt, T - t);
    out.push(dt); t += dt;
  }
  return out;
}
const CLOCKS = [30, 60, 144, 'ragged'];

/* --------------------------------- springs -------------------------------- */
head('SPRINGS');
{
  const exact = M.moSpring(0, 3, 0.4); exact.to = 1; exact.step(1);
  let worst = 0;
  for (const c of CLOCKS) {
    const s = M.moSpring(0, 3, 0.4); s.to = 1;
    for (const dt of clock(c, 1)) s.step(dt);
    worst = Math.max(worst, Math.abs(s.v - exact.v), Math.abs(s.vel - exact.vel));
  }
  ok(worst < 1e-9, 'a wobbly spring (3 Hz, ζ 0.4) lands in the same place at 30, 60, 144 fps and ragged', 'worst ' + worst.toExponential(1));

  for (const z of [0, 1, 2.5]) {
    const a = M.moSpring(0, 5, z), b = M.moSpring(0, 5, z);
    a.to = b.to = 1; a.vel = b.vel = 4;
    a.step(0.7);
    for (const dt of clock('ragged', 0.7)) b.step(dt);
    ok(Math.abs(a.v - b.v) < 1e-9, `ζ ${z} is exact too (${z < 1 ? 'undamped' : z === 1 ? 'critical' : 'overdamped'})`);
  }

  const st = M.moSpring(0, 80, 0.05); st.to = 1;
  let wild = 0;
  for (let i = 0; i < 30; i++) { st.step(0.1); wild = Math.max(wild, Math.abs(st.v - 1)); }
  ok(Number.isFinite(st.v) && wild <= 1 + 1e-9, 'a stiff spring (80 Hz) at 10 fps stays put', 'largest swing ' + fmt(wild));
  const w = Math.PI * 2 * 80, kit = M.hlSpring(0, w * w, 2 * 0.05 * w);
  kit.to = 1;
  for (let i = 0; i < 90; i++) kit.step(1 / 30);
  note(`THE KIT's hlSpring at the same tuning, at 30 fps for 3 s: off by ${fmt(Math.abs(kit.v - 1))}`);

  const cr = M.moSpring(0, 6, 1); cr.to = 1;
  let peak = 0;
  for (const dt of clock('ragged', 2)) peak = Math.max(peak, cr.step(dt));
  ok(peak <= 1 + 1e-12, 'critical damping never overshoots', 'peak ' + fmt(peak, 9));

  const an = M.moSpringAng(3.0, 4, 1); an.to = -3.0;
  let low = 9;
  for (const dt of clock(60, 2)) low = Math.min(low, an.step(dt));
  const end = Math.atan2(Math.sin(an.v), Math.cos(an.v));
  ok(low > 2.9 && Math.abs(end + 3.0) < 1e-3, 'an angle spring from 3.0 to -3.0 goes the short way, over π', 'never below ' + fmt(low));
}

/* -------------------------------- smoothing ------------------------------- */
head('SMOOTHING');
{
  const run = c => { let v = 0; for (const dt of clock(c, 1)) v = M.moDecay(v, 10, 0.2, dt); return v; };
  const vals = CLOCKS.map(run), spread = Math.max(...vals) - Math.min(...vals);
  ok(spread < 1e-9 && Math.abs(vals[0] - (10 - 10 * Math.pow(0.5, 5))) < 1e-9,
     'moDecay closes half the gap a half-life, at any frame rate', 'spread ' + spread.toExponential(1));
}

/* --------------------------------- bodies --------------------------------- */
head('BODIES');
{
  /* Two swings. The whip: the root round a circle of 80 px twice a second,
     ~1000 px/s with the hull turning all the way round. The dash: cruising at
     276 px/s, a dash at 1200 for 0.17 s, then cruising again, weaving. */
  const swing = t => [Math.cos(t * Math.PI * 4) * 80, Math.sin(t * Math.PI * 4) * 80, t * Math.PI * 4 + Math.PI / 2];
  const dash = t => {
    const x = t < 0.5 ? 276 * t : t < 0.67 ? 138 + 1200 * (t - 0.5) : 342 + 276 * (t - 0.67);
    return [x, Math.sin(t * 5) * 40, Math.atan2(200 * Math.cos(t * 5), t < 0.5 || t > 0.67 ? 276 : 1200)];
  };
  const lens = (b, n, seg) => {
    let s = 0;
    for (let i = 0; i < n - 1; i++) s = Math.max(s, Math.abs(Math.hypot(b.p[i + 1].x - b.p[i].x, b.p[i + 1].y - b.p[i].y) / seg - 1));
    return s;
  };
  const bends = (b, n) => {
    let m = 0;
    for (let i = 0; i < n - 2; i++) {
      const p = b.p[i], q = b.p[i + 1], r = b.p[i + 2];
      const a1 = Math.atan2(q.y - p.y, q.x - p.x), a2 = Math.atan2(r.y - q.y, r.x - q.x);
      m = Math.max(m, Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1))));
    }
    return m;
  };
  const ropeRun = (c, path, o = {}) => {
    const [x0, y0, a0] = path(0);
    const b = M.moRope(10, 6, Object.assign({ x: x0, y: y0, ang: a0 }, o));
    let t = 0, stretch = 0, bendMax = 0;
    for (const dt of clock(c, 2)) {
      t += dt;
      const [x, y, a] = path(t);
      M.moFrame(b, x, y, a); M.moStep(b, dt);
      stretch = Math.max(stretch, lens(b, 10, 6)); bendMax = Math.max(bendMax, bends(b, 10));
    }
    return { tip: b.p[9], stretch, bendMax };
  };
  const spreadOf = runs => {
    let s = 0;
    for (const a of runs) for (const b of runs) s = Math.max(s, Math.hypot(a.tip.x - b.tip.x, a.tip.y - b.tip.y));
    return s;
  };
  for (const [name, path] of [['whipped round at ~1000 px/s', swing], ['through a 1200 px/s dash', dash]]) {
    const runs = CLOCKS.map(c => ropeRun(c, path, { bend: 0.45 }));
    const st = Math.max(...runs.map(r => r.stretch)), bd = Math.max(...runs.map(r => r.bendMax));
    ok(st < 1e-9, 'a chain ' + name + ' holds its exact length', 'worst ' + st.toExponential(1));
    ok(bd <= 0.45 + 1e-9, '…and its bend limit of 0.45 rad at every joint', 'worst ' + fmt(bd) + ' rad');
  }
  const kitWhip = CLOCKS.map(c => {
    const b = M.hlRope(80, 0, 10, 6, { ang: 0, gy: 0 });
    let t = 0, stretch = 0;
    for (const dt of clock(c, 2)) { t += dt; const [x, y] = swing(t); M.hlVPin(b, 0, x, y); M.hlVStep(b, dt); stretch = Math.max(stretch, lens(b, 10, 6)); }
    return stretch;
  });
  note(`THE KIT's verlet rope on the whip stretches up to ${(Math.max(...kitWhip) * 100).toFixed(0)}%`);

  /* A tail on a hull flying a figure of eight, dashing through the middle:
     the tip's whole track at each frame rate against the same run at
     1000 fps. (A free whip is chaotic, so its end state is no measure; a
     tail with drag on it is not.) */
  const fly = t => {
    const u = t * 1.6, dx = Math.cos(u) * 288, dy = Math.cos(u * 2) * 224, n = Math.hypot(dx, dy);
    const boost = t > 1.4 && t < 1.57 ? (t - 1.4) * 900 : t >= 1.57 ? 153 : 0;
    return [Math.sin(u) * 180 + dx / n * boost, Math.sin(u * 2) * 70 + dy / n * boost, Math.atan2(dy, dx)];
  };
  const track = (c, mk, step) => {
    seed = 11;
    const b = mk(), out = [];
    let t = 0;
    for (const dt of clock(c, 3)) { t += dt; step(b, t, dt); const q = b.p[b.p.length - 1]; out.push([t, q.x, q.y]); }
    return out;
  };
  const at = (tr, t) => {
    let i = tr.findIndex(e => e[0] >= t - 1e-9);
    if (i <= 0) return tr[Math.max(0, i)];
    const a = tr[i - 1], b = tr[i], f = (t - a[0]) / (b[0] - a[0]);
    return [t, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  };
  const rms = (tr, ref) => {
    let s = 0;
    for (const [t, x, y] of tr) { const r = at(ref, t); s += (x - r[1]) ** 2 + (y - r[2]) ** 2; }
    return Math.sqrt(s / tr.length);
  };
  const moMk = () => { const [x, y, a] = fly(0); return M.moRope(10, 6, { x, y, ang: a, bend: 0.45, drag: 4 }); };
  const moGo = (b, t, dt) => { const [x, y, a] = fly(t); M.moFrame(b, x, y, a); M.moStep(b, dt); };
  const ref = track(1000, moMk, moGo), errs = CLOCKS.map(c => rms(track(c, moMk, moGo), ref));
  ok(Math.max(...errs) < 2.5, 'a tail flown through turns and a dash follows the same track at 30, 60, 144 fps and ragged',
     'rms ' + errs.map(e => fmt(e, 2)).join(' / ') + ' px from the 1000 fps run');
  const kitMk = () => { const [x, y] = fly(0); return M.hlRope(x, y, 10, 6, { ang: Math.PI, gy: 0 }); };
  const kitGo = (b, t, dt) => { const [x, y] = fly(t); M.hlVPin(b, 0, x, y); M.hlVStep(b, dt); };
  const kref = track(1000, kitMk, kitGo);
  note(`THE KIT's verlet rope on the same flight: rms ${CLOCKS.map(c => fmt(rms(track(c, kitMk, kitGo), kref), 1)).join(' / ')} px`);

  // a soft body: a rigid triangle hung off the frame by one corner
  const shape = (path, o) => {
    let worst = 0;
    for (const c of CLOCKS) {
      const [x0, y0, a0] = path(0), b = M.moBody(Object.assign({ x: x0, y: y0, ang: a0 }, o));
      M.moPoint(b, x0, y0); M.moPoint(b, x0 - 10, y0); M.moPoint(b, x0 - 5, y0 + 8);
      M.moPin(b, 0);
      M.moLink(b, 0, 1); M.moLink(b, 1, 2); M.moLink(b, 2, 0);
      const L = [[0, 1, 10], [1, 2, Math.hypot(5, 8)], [2, 0, Math.hypot(5, 8)]];
      let t = 0;
      for (const dt of clock(c, 2)) {
        t += dt;
        const [x, y, a] = path(t);
        M.moFrame(b, x, y, a); M.moStep(b, dt);
        for (const [i, j, r] of L)
          worst = Math.max(worst, Math.abs(Math.hypot(b.p[i].x - b.p[j].x, b.p[i].y - b.p[j].y) / r - 1));
      }
    }
    return worst;
  };
  const flown = shape(fly, {}), whipped = shape(swing, {});
  ok(flown < 0.01, 'a soft body of rigid links keeps its shape through the flight (within 1%)', 'worst ' + (flown * 100).toFixed(2) + '%');
  ok(whipped < 0.01, '…and through the whip', 'worst ' + (whipped * 100).toFixed(2) + '%');

  const stretchy = M.moRope(6, 6, { x: 0, y: 0, ang: 0, lay: Math.PI / 2, gy: 900, comp: 1e-3, drag: 4 });
  for (const dt of clock(60, 3)) M.moStep(stretchy, dt);
  const sag = stretchy.p[5].y - 30;
  ok(sag > 1 && sag < 60, 'a rope with compliance hangs, stretched, under gravity', 'stretched ' + fmt(sag, 1) + ' px past 30');

  const b = M.moRope(5, 8, { x: 0, y: 0, ang: 0 });
  M.moPlace(b, 500, 300, Math.PI / 2);
  const tail = b.p[4];
  ok(Math.abs(tail.x - 500) < 1e-9 && Math.abs(tail.y - 268) < 1e-9 && tail.vx === 0,
     'moPlace carries the body whole and leaves it at rest', `tail at ${fmt(tail.x, 1)}, ${fmt(tail.y, 1)}`);

  const lone = M.moBody({ gy: 900 });
  M.moPoint(lone, 0, 0);
  for (const dt of clock(60, 0.5)) M.moStep(lone, dt);
  const fall = M.moBody({ gy: 900 });
  M.moPoint(fall, 0, 0);
  for (const dt of clock('ragged', 0.5)) M.moStep(fall, dt);
  ok(Math.abs(lone.p[0].y - fall.p[0].y) / lone.p[0].y < 0.01, 'a falling point falls the same at 60 fps and ragged (within 1%)',
     fmt(lone.p[0].y, 1) + ' / ' + fmt(fall.p[0].y, 1) + ' px');
}

/* ---------------------------------- paths --------------------------------- */
head('PATHS');
{
  const R = 120, V = 900;
  const at = t => [Math.cos(V * t / R) * R, Math.sin(V * t / R) * R];
  const flown = c => {
    const p = M.moPath({ gap: 2, keep: 400 });
    M.moPathReset(p, R, 0, Math.PI / 2);
    let t = 0;
    for (const dt of clock(c, 1)) { t += dt; const [x, y] = at(t); M.moPathMove(p, x, y); }
    return { p, t };
  };
  let worstR = 0, worstTrue = 0, worstAng = 0;
  const reads = [];
  for (const c of CLOCKS) {
    const { p, t } = flown(c), pts = [];
    for (let d = 0; d <= 240; d += 20) {
      const q = M.moPathAt(p, d);
      const [tx, ty] = at(t - d / V);
      worstR = Math.max(worstR, Math.abs(Math.hypot(q.x, q.y) - R));
      worstTrue = Math.max(worstTrue, Math.hypot(q.x - tx, q.y - ty));
      const want = Math.atan2(ty, tx) + Math.PI / 2;
      worstAng = Math.max(worstAng, Math.abs(Math.atan2(Math.sin(q.ang - want), Math.cos(q.ang - want))));
      pts.push(q);
    }
    reads.push(pts);
  }
  ok(worstR < 0.25, 'segments read back on the circle flown (900 px/s, r 120), even at 30 fps', 'worst ' + fmt(worstR) + ' px off it');
  ok(worstTrue < 1.0, '…at the right distance along it', 'worst ' + fmt(worstTrue) + ' px from where the head really was');
  ok(worstAng < 0.03, '…facing the way it was flown', 'worst ' + fmt(worstAng, 4) + ' rad');
  const chord = R * (1 - Math.cos(V / 30 / R / 2));
  note(`straight chords between 30 fps frames would sag ${fmt(chord, 2)} px off it`);
  let spread = 0;
  for (let i = 0; i < reads[0].length; i++)
    for (const r of reads) spread = Math.max(spread, Math.hypot(r[i].x - reads[0][i].x, r[i].y - reads[0][i].y));
  ok(spread < 1.0, 'the same at 30, 60, 144 fps and ragged', 'spread ' + fmt(spread) + ' px');

  const { p } = flown('ragged');
  let gapErr = 0;
  for (let i = 1; i < p.ss.length; i++) gapErr = Math.max(gapErr, Math.abs(p.ss[i] - p.ss[i - 1] - 2));
  ok(gapErr < 1e-9 && p.ss.length < 400 / 2 + 80, 'samples are evenly spaced, and only `keep` of it is kept', p.ss.length + ' samples');

  const fresh = M.moPath();
  M.moPathReset(fresh, 50, 50, 0);
  const q = M.moPathAt(fresh, 30), far = M.moPathAt(fresh, 2000);
  ok(Math.abs(q.x - 20) < 1e-9 && Math.abs(q.y - 50) < 1e-9 && Math.abs(far.x + 1950) < 1e-6,
     'before anything is flown it lies straight behind, and runs on straight past what is kept');
}

/* -------------------------------- emitters -------------------------------- */
head('EMITTERS');
{
  const em = M.moEmitter(300), xs = [];
  let x = 0;
  M.moEmit(em, 0, 0, 0, 0, () => {});                 // where it starts
  for (const dt of clock(30, 1)) {
    x += 1200 * dt;
    M.moEmit(em, dt, x, 0, 0, px => xs.push(px));
  }
  xs.sort((a, b) => a - b);
  let lo = 1e9, hi = 0;
  for (let i = 1; i < xs.length; i++) { const g = xs[i] - xs[i - 1]; lo = Math.min(lo, g); hi = Math.max(hi, g); }
  ok(Math.abs(xs.length - 300) <= 1 && hi - lo < 1e-6, 'behind a 1200 px/s source at 30 fps, 300 a second land 4 px apart',
     `${xs.length} let out, gaps ${fmt(lo, 4)}–${fmt(hi, 4)} px (once a frame: 40 px clumps)`);
  let ages = true;
  const em2 = M.moEmitter(120);
  M.moEmit(em2, 1 / 60, 0, 0, 0, () => {});
  M.moEmit(em2, 1 / 20, 10, 0, 0, (px, py, a, age, u) => { ages = ages && age >= 0 && age <= 1 / 20 + 1e-12 && Math.abs(px - 10 * u) < 1e-9; });
  ok(ages, 'each is handed how long ago in the frame it left, and where the source was then');
}

/* -------------------------------- particles ------------------------------- */
head('PARTICLES');
{
  const travel = c => {
    M.moPartsClear();
    const q = M.moPart({ x: 0, y: 0, vx: 400, vy: -300, ay: 500, drag: 3, life: 5 });
    for (const dt of clock(c, 1)) M.moPartsStep(dt);
    return q;
  };
  const exactX = 400 * (1 - Math.exp(-3)) / 3;
  const ty = 500 / 3, exactY = ty * 1 + (-300 - ty) * (1 - Math.exp(-3)) / 3;
  let worst = 0;
  for (const c of CLOCKS) { const q = travel(c); worst = Math.max(worst, Math.abs(q.x - exactX), Math.abs(q.y - exactY)); }
  ok(worst < 1e-9, 'a spark under drag and gravity lands exactly where the closed form says, at any frame rate', 'worst ' + worst.toExponential(1));

  M.moPartsClear();
  const c1 = M.moPart({ vx: 200, drag: 2, ay: 100, life: 3, age: 0.3 }), c2 = M.moPart({ vx: 200, drag: 2, ay: 100, life: 3 });
  M.moPartStep(c2, 0.3);
  ok(Math.abs(c1.x - c2.x) < 1e-12 && Math.abs(c1.y - c2.y) < 1e-12 && c1.life === c2.life,
     'pre-aging one is the same as stepping it');

  M.moPartsClear();
  M.MO.partMax = 5;
  let made = 0;
  for (let i = 0; i < 9; i++) if (M.moPart({ life: 1 })) made++;
  M.MO.partMax = 3000;
  ok(made === 5, 'the pool refuses past its cap');
  M.moPartsClear();
  const order = [1, 2, 3, 4].map(i => M.moPart({ life: i * 0.1, n: i }));
  M.moPartsStep(0.15);
  ok(M.moParts.map(q => q.n).join() === '2,3,4' && order.length === 4, 'the dead go, and the rest keep their draw order');
}

/* ---------------------------------- flow ---------------------------------- */
head('FLOW');
{
  let div = 0, mag = 0, jump = 0;
  const h = 0.01;
  for (let i = 0; i < 400; i++) {
    const x = rand() * 2000 - 1000, y = rand() * 2000 - 1000, t = rand() * 50;
    const v = M.moFlow(x, y, t).slice();
    mag = Math.max(mag, Math.hypot(v[0], v[1]));
    const ex = M.moFlow(x + h, y, t)[0] - M.moFlow(x - h, y, t)[0];
    const ey = M.moFlow(x, y + h, t)[1] - M.moFlow(x, y - h, t)[1];
    div = Math.max(div, Math.abs((ex + ey) / (2 * h)));
    const n = M.moFlow(x + 0.5, y, t);
    jump = Math.max(jump, Math.hypot(n[0] - v[0], n[1] - v[1]));
  }
  ok(div < 1e-6, 'the flow has no divergence (nothing bunches up or thins out)', 'worst ' + div.toExponential(1) + ' per px');
  ok(mag > 0.3 && mag < 6 && jump < 0.2, 'it is about unit strength and smooth across half a pixel', 'largest ' + fmt(mag, 2) + ', step ' + fmt(jump, 3));
}

/* --------------------------------- curves --------------------------------- */
head('CURVES');
{
  const pts = [{ x: 0, y: 0 }, { x: 30, y: 10 }, { x: 60, y: -10 }, { x: 90, y: 0 }];
  const s = M.moSample(pts, 8);
  const hits = pts.every(p => s.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 1e-9));
  ok(hits && s.length === 3 * 8 + 1, 'moSample passes through every point');
  calls.length = 0;
  M.moSmooth(pts);
  const beziers = calls.filter(c => c[0] === 'bezierCurveTo');
  const lastB = beziers[beziers.length - 1];
  ok(beziers.length === 3 && lastB[5] === 90 && lastB[6] === 0, 'moSmooth draws one Bézier a span, ending on the last point');
  calls.length = 0;
  const C = M.moRibbon(pts, 12, 2, { cap: 'round' });
  const arcs = calls.filter(c => c[0] === 'arc').length, closed = calls[calls.length - 1][0] === 'closePath';
  ok(Math.abs(C[0].w - 6) < 1e-9 && Math.abs(C[C.length - 1].w - 1) < 1e-9 && arcs === 2 && closed,
     'moRibbon tapers 12 → 2, rounds both ends and closes');
}

/* ------------------------------- what it uses ----------------------------- */
head('ISOLATION');
{
  const body = MOTION.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok(!/\bsimRnd\b|\bsimRand\b|\brnd\(/.test(body), 'no sim randomness, and not even rnd: Math.random only');
  ok(!/\bP\.\w|\bstate\b|\bSave\b|\buiTime\b/.test(body), 'it reads nothing of the game (P, state, Save, uiTime)');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
