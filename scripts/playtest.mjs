#!/usr/bin/env node
/* ===========================================================================
   THE PLAYTEST — `npm run playtest`

   Not a test: a measuring tape for the ordinary run. It plays whole runs on
   the real engine in Node (scripts/lib/game-vm.mjs), flown by a bot with no
   help at all: the pilot's own hull and damage, a fresh save, cards picked
   and shops bought the way a player would. Then it says how long things took
   and where it hurt:

     · every wave: how long it ran, how long was spent with nothing on screen,
       how long the last few enemies took to find, damage taken, kills
     · every boss: how long it lived, and what it did to the hull
     · every interruption: level-ups, shops, gear, and how often they came
     · the end: the wave, the sector, what landed the last blow

   The bot reads the game's state directly (it sees every bullet). Each step
   it tries sixteen headings and standing still against where every shot,
   body, shell, hazard and wound-up lunge will be over the next fraction of a
   second, and takes the one hit least. It is held back on purpose: it only
   sees what is near, reads 0.3 to 0.65 s ahead, and at lower skill it looks
   away now and then, the way a person glances at the build. --skill (0 to 1)
   sets how far ahead and how rarely. It still plays slower than strong
   players (about 63 s a wave in loop 1 against the leaderboard's 50), so
   read its times as a little long.

     node scripts/playtest.mjs [--pilots runner,ember] [--seeds 3] [--skill 0.75] [--seed0 9001]
                               [--cap 900] [--picks smart|random] [--naive] [--json out.json] [--quiet]

   --cap is the most seconds of play a run may last before it is called.
   --naive flies the codex-blind player: it shoots whatever is nearest, so a
   MENDER is not put down first and a SENTINEL is shot in the face. Without
   it the bot plays as someone who has read the codex would.
   --json keeps every run's record (each wave, each hit, each screen) for a
   closer look than the summary gives.
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : dflt; };
const flag = name => process.argv.includes('--' + name);

const PILOTS = arg('pilots', 'runner,ember').split(',');
const SEEDS = +arg('seeds', 3);
const SKILLS = arg('skill', '0.75').split(',').map(Number);
const CAP = +arg('cap', 900);
const PICKS = arg('picks', 'smart');
const JSON_OUT = arg('json', '');
const QUIET = flag('quiet');
const SEED0 = +arg('seed0', 9001);
const NAIVE = flag('naive');         // the codex-blind player: shoots the nearest, menders included, and never walks them down

const g = loadGame(IDX, { w: 1366, h: 768 });

const HARNESS = `(() => {
  pageDead = true;
  Save.profile.gfxSeen = GFX_VER;
  const SAVE0 = JSON.stringify(Save.profile);
  const restore = () => { const o = JSON.parse(SAVE0); for (const k of Object.keys(Save.profile)) delete Save.profile[k]; Object.assign(Save.profile, o); Codex.load(); };
  const STEP = 1 / 60;
  const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  // what a player would reach for first, by weapon (unknown ids fall to the back, in the order dealt)
  const PRI = {
    bullet: ['multi', 'dmg', 'rate', 'para', 'pierce', 'home', 'crit', 'critm', 'hp', 'drone', 'chain', 'vol', 'frag',
             'shld', 'armor', 'regen', 'heavy', 'vel', 'ric', 'vamp', 'dashn', 'dashcd', 'spd', 'mag', 'xp', 'stat', 'back'],
    laser:  ['dmg', 'rate', 'pierce', 'heavy', 'crit', 'critm', 'hp', 'chain', 'vol', 'frag', 'drone', 'shld', 'armor',
             'regen', 'vel', 'pblank', 'ric', 'vamp', 'dashn', 'dashcd', 'spd', 'mag', 'xp', 'stat'],
  };
  const rank = id => { const L = PRI[P.weapon] || PRI.bullet; const i = L.indexOf(id); return i < 0 ? 99 : i; };

  let T = null;      // the run's telemetry
  let B = null;      // the bot's own memory
  let rng = 1;       // the bot's own stream: never the game's, so its lapses do not move the run
  const brand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };

  const alive = () => enemies.filter(e => !e.dead && !e.hacked && !e.ally && e.hp > 0);

  /* ---------------------------------- the bot ---------------------------------- */
  /* The bot moves by looking ahead: for each of sixteen headings and standing
     still, where would the hull be over the next fraction of a second, and
     what would be there with it (every shot near enough, every body, every
     shell about to land, the floor's hazards, a lunge being wound up)? It takes
     the heading that is hit least, leaning toward where it wants to be. Skill
     is how far ahead it reads, and how rarely it looks away. */
  const DIRS = [[0, 0]];
  for (let i = 0; i < 16; i++) DIRS.push([Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
  function bot(rec) {
    const sk = B.skill;
    const foes = alive();
    /* how far it stands off: a gun from well outside, EMBER's lance inside its
       own reach (250 px, more with Railshot), the blade at arm's length */
    const lance = P.weapon === 'laser' ? laserRange() : 0;
    const keep = lance ? Math.min(170, lance * 0.55) : P.weapon === 'blade' ? 40 : 250;
    const bossPad = lance ? 30 : 140;
    // lapses: a skill of 1 never looks away; 0.5 looks away about a quarter of the time, a few tenths at a go
    if (B.lapseT > 0) B.lapseT -= STEP;
    else if (brand() < (1 - sk) * 0.012) B.lapseT = 0.25 + brand() * 0.5;
    const looking = B.lapseT <= 0;
    const spd = Math.max(120, P.speed || 260);
    const H = 0.3 + 0.35 * sk;
    const TS = [0.06, 0.13, 0.21, 0.3, 0.42, 0.55, 0.65].filter(t => t <= H + 1e-6);
    const reach = (spd + 520) * H + 90, reach2 = reach * reach;
    const bs = [], es = [], ms = [], hz = [], lunges = [];
    if (looking) {
      for (const b of ebullets) if (d2(P.x, P.y, b.x, b.y) < reach2) bs.push(b);
      for (const m of mortars) if (!m.mine && !m.ally && m.t < H + 0.5 && d2(P.x, P.y, m.x, m.y) < (m.r + spd * (H + 0.5) + 40) ** 2) ms.push(m);
      for (const h of hazards) {
        if (h.friendly || h.ally) continue;
        if (h.kind === 'laser') { if (h.t < 1.6) hz.push(h); continue; }
        if (h.kind === 'vent' && h.state === 0 && h.cd > H + 0.3) continue;
        if (h.kind === 'fire' || h.kind === 'acid' || h.kind === 'vent' || h.kind === 'delete') if (d2(P.x, P.y, h.x, h.y) < (h.r + spd * H + 60) ** 2) hz.push(h);
      }
    }
    for (const e of foes) {
      if (d2(P.x, P.y, e.x, e.y) < 900 * 900) es.push(e);
      // a lunge being wound up (a LANCER's, THE WARDEN's charge): its line, from when it goes
      if (!looking) continue;
      const lw = e.type === 'dasher' && e.state === 1 ? [e.atkT, 330] : e.type === 'boss' && e.atk === -2 ? [e.atkT, 560] : null;
      if (lw && d2(P.x, P.y, e.x, e.y) < 950 * 950) {
        const a = Math.atan2(P.y - e.y, P.x - e.x);
        lunges.push({ x: e.x, y: e.y, ux: Math.cos(a), uy: Math.sin(a), at: Math.max(0, lw[0] - 0.05), L: lw[1], r: e.r });
      }
    }
    // where it wants to be when nothing presses: the gate, the pickups, the enemies it cannot see
    let goal = null;
    let ne = null, nd = 1e18;
    for (const e of foes) { const d = d2(P.x, P.y, e.x, e.y); if (d < nd) { nd = d; ne = e; } }
    if (awaitingPortal && portals.length) goal = portals.find(q => q.kind === 'normal') || portals[0];
    else {
      let best = null, bd = 1e18;
      for (const o of gems.concat(drops)) { const d = d2(P.x, P.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
      if (best && bd < 600 * 600 && nd > 240 * 240) goal = best;
      else if (ne && (nd > (lance ? lance * 0.8 + ne.r : keep + 260) ** 2 || P.weapon === 'blade')) goal = ne;   // hunt what is out of reach
      else if (!foes.length) goal = best || { x: WORLD.w / 2, y: WORLD.h / 2 };
      if (B.healFirst && foes.length && foes.every(e => e.type === 'healer') && ne) goal = ne;   // only menders left: walk them down
    }
    let gx = 0, gy = 0;
    if (goal) { const dx = goal.x - P.x, dy = goal.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || 1; gx = dx / d; gy = dy / d; }
    /* a SENTINEL's shield turns slowly: circle in close, faster than it can follow
       ("flanking means getting in close"), and the side is open */
    const sent = B.flank && ne && ne.type === 'sentinel' && nd < 520 * 520 && !(awaitingPortal && portals.length) ? ne : null;
    if (sent) {
      const dx = sent.x - P.x, dy = sent.y - P.y, d = Math.sqrt(dx * dx + dy * dy) || 1, dir = B.orbit;
      const rad = clamp((d - 190) / 120, -1, 1);
      gx = -dy / d * dir + dx / d * rad; gy = dx / d * dir + dy / d * rad;
      const gl = Math.sqrt(gx * gx + gy * gy) || 1; gx /= gl; gy /= gl;
      goal = sent;
      if (B.k % 600 === 0) B.orbit = -B.orbit;
    }
    let bestC = 1e18, best = DIRS[0], bestHard = 0, bestFirst = 9;
    const x0 = arena.x0 + P.r, x1 = arena.x1 - P.r, y0 = arena.y0 + P.r, y1 = arena.y1 - P.r;
    for (const c of DIRS) {
      let hard = 0, first = 9;
      for (const t of TS) {
        const px = Math.min(x1, Math.max(x0, P.x + c[0] * spd * t)), py = Math.min(y1, Math.max(y0, P.y + c[1] * spd * t));
        const wt = 1.25 - t;
        for (const b of bs) {
          const bx = b.x + (b.vx || 0) * t, by = b.y + (b.vy || 0) * t, need = P.r + (b.r || 5) + 5;
          const dd = (px - bx) * (px - bx) + (py - by) * (py - by);
          if (dd < need * need) { hard += wt * (1.5 - Math.sqrt(dd) / need); if (t < first) first = t; }
        }
        for (const e of es) {
          const tt = Math.min(t, 0.25), ex = e.x + (e.vx || 0) * tt, ey = e.y + (e.vy || 0) * tt, need = P.r + e.r + 8;
          const dd = (px - ex) * (px - ex) + (py - ey) * (py - ey);
          if (dd < need * need) { hard += wt * (e.type === 'boss' ? 2 : 1); if (t < first) first = t; }
        }
        for (const L of lunges) {
          if (t < L.at) continue;
          const rx = px - L.x, ry = py - L.y, along = rx * L.ux + ry * L.uy, perp = Math.abs(rx * -L.uy + ry * L.ux);
          if (along > -L.r && along < L.L + L.r && perp < L.r + P.r + 14) { hard += 1.6; if (t < first) first = t; }
        }
        for (const h of hz) {
          if (h.kind === 'laser') {
            const dxl = Math.cos(h.ang), dyl = Math.sin(h.ang);
            if (Math.abs((px - h.x) * -dyl + (py - h.y) * dxl) < LASER_HALF + P.r + 8) hard += 0.6 * wt;
          } else if (d2(px, py, h.x, h.y) < (h.r + P.r + 6) ** 2) hard += (h.kind === 'vent' ? 0.8 : 0.35) * wt;
        }
      }
      // shells land where the hull will be when they land
      for (const m of ms) {
        const t = Math.min(m.t, H + 0.5);
        const px = Math.min(x1, Math.max(x0, P.x + c[0] * spd * t)), py = Math.min(y1, Math.max(y0, P.y + c[1] * spd * t));
        if (d2(px, py, m.x, m.y) < (m.r + P.r + 8) ** 2) { hard += 2.5; if (m.t < first) first = m.t; }
      }
      // and the soft wants, read where the heading ends
      const ex = Math.min(x1, Math.max(x0, P.x + c[0] * spd * H)), ey = Math.min(y1, Math.max(y0, P.y + c[1] * spd * H));
      let soft = 0;
      for (const e of es) {
        const R = (sent && e.type === 'sentinel' ? 110 : keep) + e.r + (e.type === 'boss' ? bossPad : 0), dd = d2(ex, ey, e.x, e.y);
        if (dd < R * R) { const f = 1 - Math.sqrt(dd) / R; soft += f * f * (e.type === 'boss' ? 2.2 : 0.7) * (1 + (e.dmg || 8) / 25); }
      }
      const wm = 170;
      for (const m of [ex - arena.x0, arena.x1 - ex, ey - arena.y0, arena.y1 - ey]) if (m < wm) soft += (1 - m / wm) * (1 - m / wm) * 1.6;
      soft -= (c[0] * gx + c[1] * gy) * (goal ? (sent ? 1.6 : 0.9) : 0);
      soft -= (c[0] * B.lx + c[1] * B.ly) * 0.12;            // keep a heading rather than jitter
      if (!goal && c[0] === 0 && c[1] === 0) soft += 0.25;   // and never quite park
      const cost = hard * 6 + soft;
      if (cost < bestC) { bestC = cost; best = c; bestHard = hard; bestFirst = first; }
    }
    rec.mx = best[0]; rec.my = best[1];
    B.lx = best[0]; B.ly = best[1];
    B.hard = bestHard; B.first = bestFirst;
    /* aim: the nearest, led a little; a less steady hand is a little off. A
       MENDER is "the priority kill" (its own comment says so), and a player
       who has read the codex shoots it first when it is in reach (--naive
       flies as the codex-blind player does). */
    let tgt = null, td = 1e18;
    for (const e of foes) {
      let d = d2(P.x, P.y, e.x, e.y);
      if (B.healFirst && e.type === 'healer' && d < 700 * 700) d *= 0.15;
      if (B.flank && e.type === 'sentinel') {
        const off = Math.abs(((Math.atan2(P.y - e.y, P.x - e.x) - e.ang + Math.PI) % TAU + TAU) % TAU - Math.PI);
        if (off < 1.15) d *= 6;          // its face is to the hull: anything else first
      }
      if (d < td) { td = d; tgt = e; }
    }
    if (tgt) td = d2(P.x, P.y, tgt.x, tgt.y);
    if (tgt) {
      const t = Math.sqrt(td) / Math.max(300, P.bspeed || 600);
      const err = (1 - sk) * 40;
      rec.ax = tgt.x + (tgt.vx || 0) * t + (brand() - 0.5) * err;
      rec.ay = tgt.y + (tgt.vy || 0) * t + (brand() - 0.5) * err;
    } else { rec.ax = P.x + 200; rec.ay = P.y; }
    rec.trig = true; rec.lmb = true; rec.auto = false;
    // the dash: when even the best heading is hit, and soon (its frames are what get through)
    rec.dash = looking && sk > 0.4 && B.hard > 0.3 && B.first < 0.1 + 0.08 * sk && B.k - B.dashK > 12;
    if (rec.dash) B.dashK = B.k;
    rec.touch = false; rec.taim = null; rec.local = false; rec.held = '';
    rec.press = [];
    if (P.weapon === 'blade' && B.k % 20 === 0) rec.press.push('f');
  }

  /* ------------------------------ the bookkeeping ------------------------------ */
  function hookOnce() {
    if (globalThis.__ptHooked) return;
    globalThis.__ptHooked = true;
    const hurt0 = hurtPlayer;
    hurtPlayer = function (dmg, opts) {
      const before = P.hp;
      const r = hurt0.apply(this, arguments);
      if (T && P.hp < before) {
        const took = before - Math.max(0, P.hp);
        const src = opts && opts.src;
        // no source named: the caller says what it was (a shell, a blast, the floor's hazards)
        let who = src ? (src.type === 'boss' ? 'boss:' + (src.boss || '?') : (src.type || src.kind || '?')) : (opts && opts.pure ? 'floor' : '');
        if (!who) {
          const st = new Error().stack.split('\\n').map(s => (/at (\\w+)/.exec(s) || [])[1]).filter(Boolean);
          const f = st.find(n => n !== 'hurtPlayer' && n !== 'Error' && n !== 'apply');
          who = f === 'updateMortars' ? 'shell (artillery)' : f === 'explode' ? 'blast' : f === 'updateHazards' ? 'hazard:' + (stage.hazard || '?') : 'unnamed:' + (f || '?');
          if (P.hp <= 0 && T) T.unnamedKill = who;
        }
        T.hurt.push([+elapsed.toFixed(2), wave, Math.round(took), who, opts && opts.shot ? 1 : 0]);
        if (T.cur) { T.cur.dmg += took / P.maxHp; T.cur.hits++; }
      }
      return r;
    };
  }

  function newWaveRec() {
    return { wave, boss: bossAlive ? (stage.boss || '?') : '', sector: stage.name, t0: elapsed, t1: null,
             budget: spawnBudget, kills: 0, dmg: 0, hits: 0, empty: 0, offscreen: 0, tail: 0, few: 0, minHp: 1,
             hp0: P.hp / P.maxHp, lvl0: P.level, maxAlive: 0, sumAlive: 0, n: 0, done: false };
  }

  function play(o) {
    hookOnce();
    restore();
    for (const k of Object.keys(keys)) keys[k] = false;
    mouse.down = false; autoFire = false;
    const ci = CHARS.findIndex(c => c.id === o.char);
    applyChar(ci);
    runSeedNext = o.seed; runViewNext = { w: 1366, h: 768 };
    resetGame(); state = 'play';
    rng = (o.seed * 2654435761) >>> 0 || 1;
    B = { skill: o.skill, k: 0, lapseT: 0, dashK: -99, healFirst: !o.naive, flank: !o.naive, orbit: 1, lx: 0, ly: 0, hard: 0, first: 9 };
    T = { pilot: o.char, seed: o.seed, skill: o.skill, waves: [], hurt: [], menus: [], states: {}, cur: null,
          levelups: 0, shops: 0, gears: 0, cards: [], bought: [], killsByType: {}, lifeByType: {},
          end: null, spawnAt: new Map(), bossLife: [] };
    inputSource = bot;
    let lastWave = 0, steps = 0;
    const capSteps = o.cap * 60;
    while (steps < capSteps * 3) {
      steps++;
      // the screens, answered as a player would
      if (state === 'levelup') {
        T.levelups++;
        let i = 0;
        if (o.picks === 'random') i = Math.floor(brand() * offers.length);
        else { let br = 1e9; offers.forEach((u, k) => { const r = rank(u.id) + (P.up[u.id] || 0) * 0.6; if (r < br) { br = r; i = k; } }); }
        T.cards.push(offers[i].id);
        ui('pick', i);
        T.menus.push(['levelup', +elapsed.toFixed(1), wave]);
        continue;
      }
      if (state === 'shop') {
        T.shops++;
        T.menus.push(['shop', +elapsed.toFixed(1), wave]);
        // repair first if it is low, then what helps most that can be afforded
        const want = it => {
          if (it.sold) return 99;
          if (it.kind === 'svc') {
            const n = it.svc.name;
            if (n === 'Repair Bay') return P.hp < P.maxHp * 0.7 ? 0 : 99;
            if (n === 'Hull Plating') return 2;
            if (n === 'Coolant Flush') return 3;
            if (n === 'Barrier Node') return 4;
            if (n === 'Data Injection') return 6;
            if (n === 'Phase Cell') return 8;
            return 7;
          }
          return it.up ? 1 + rank(it.up.id) * 0.1 : 9;
        };
        for (let guard = 0; guard < 8; guard++) {
          let bi = -1, bw = 50;
          shopItems.forEach((it, k) => { const w = want(it); if (w < bw && credits >= it.cost) { bw = w; bi = k; } });
          if (bi < 0) break;
          T.bought.push(shopItems[bi].name || (shopItems[bi].up && shopItems[bi].up.id));
          ui('buy', bi);
          if (state !== 'shop') break;
        }
        if (state === 'shop') ui('shopOut');
        continue;
      }
      if (state === 'gear') { T.gears++; T.menus.push(['gear', +elapsed.toFixed(1), wave]); ui('gearTake'); continue; }
      if (state === 'planet') { T.menus.push(['planet', +elapsed.toFixed(1), wave]); const r = P.zRead; if (r && !r.done && r.offers.length) ui('read', 0); else ui('planetOut'); continue; }
      if (state === 'library') { T.menus.push(['library', +elapsed.toFixed(1), wave]); ui('libOut'); continue; }
      if (state === 'talk') { ui('talkNext'); if (state === 'talk') ui('talkNo'); continue; }
      if (state === 'devtalk') { ui('devNext'); if (state === 'devtalk') ui('devNo'); continue; }
      if (choice) { ui('stay'); }
      if (state === 'pause') { state = 'play'; }
      if (state === 'dead') break;
      if (state !== 'play') {
        T.states[state] = (T.states[state] || 0) + 1;
        if (T.states[state] > 600) { state = 'play'; }   // a screen the bot does not know: let it go after ten seconds
        update(STEP);
        continue;
      }
      // a wave begins: close the last one, open this
      if (wave !== lastWave) {
        if (T.cur) { T.cur.t1 = T.cur.t1 ?? elapsed; T.waves.push(T.cur); }
        T.cur = newWaveRec();
        lastWave = wave;
      }
      const e0 = new Set(enemies.filter(e => !e.dead).map(e => e.id));
      update(STEP);
      B.k++;
      if (state === 'dead') break;
      // what spawned, and what died
      for (const e of enemies) if (!T.spawnAt.has(e.id)) T.spawnAt.set(e.id, [elapsed, e.type, e.boss || '']);
      for (const id of e0) {
        const e = enemies.find(z => z.id === id);
        if (!e || e.dead || e.hp <= 0) {
          const s = T.spawnAt.get(id);
          if (s) {
            const life = elapsed - s[0], k = s[1] === 'boss' ? 'boss:' + s[2] : s[1];
            T.killsByType[k] = (T.killsByType[k] || 0) + 1;
            (T.lifeByType[k] = T.lifeByType[k] || []).push(+life.toFixed(2));
            if (s[1] === 'boss') T.bossLife.push({ boss: s[2], wave, life: +life.toFixed(1), hp: +(P.hp / P.maxHp).toFixed(2), lvl: P.level });
            if (T.cur) T.cur.kills++;
            T.spawnAt.delete(id);
          }
        }
      }
      const W = T.cur;
      if (W && W.t1 == null) {
        const foes = alive();
        const n = foes.length;
        W.n++; W.sumAlive += n; W.maxAlive = Math.max(W.maxAlive, n);
        W.minHp = Math.min(W.minHp, P.hp / P.maxHp);
        const inWave = betweenWaves <= 0 && !awaitingPortal;
        if (inWave) {
          if (n === 0) W.empty += STEP;
          const hw = 1366 / 2 + 20, hh = 768 / 2 + 20;
          const on = foes.some(e => Math.abs(e.x - P.x) < hw && Math.abs(e.y - P.y) < hh);
          if (!on) W.offscreen += STEP;
          if (spawnBudget <= 0) W.tail += STEP;
          // a wave that will not end: what is still standing, once, at a minute of tail
          if (spawnBudget <= 0 && !W.stuck && W.tail >= 60) { const c = {}; for (const e of foes) { const k = (e.elite ? 'elite ' : '') + e.type; c[k] = (c[k] || 0) + 1; } W.stuck = c; }
          if (spawnBudget <= 0 && n > 0 && n <= 3) W.few += STEP;
        }
        // cleared: the game has gone to its breather
        if (!inWave || (spawnBudget <= 0 && n === 0 && !bossAlive)) {
          if (betweenWaves > 0 || awaitingPortal) { W.t1 = elapsed; W.lvl1 = P.level; W.done = true; }
        }
      }
      if (elapsed > o.cap) break;
    }
    if (T.cur) { T.cur.t1 = T.cur.t1 ?? elapsed; T.waves.push(T.cur); }
    T.end = { dead: state === 'dead', wave, sector: stage.name, loop: loopNum, t: +elapsed.toFixed(1), level: P.level,
              score: Math.round(score), by: P.hitBy || '', shownBy: P.hitBy || '', unnamedBy: P.hitBy ? '' : (T.unnamedKill || ''), hp: +(P.hp / P.maxHp).toFixed(2), credits: Math.round(credits),
              up: Object.assign({}, P.up), revive: P.revive || 0 };
    inputSource = inputSample;
    const out = T; T = null;
    out.spawnAt = undefined;
    return JSON.stringify(out);
  }
  // the same bot flying a page in real time (the browser): the screens are the caller's to answer
  function live(o) {
    rng = 12345;
    B = { skill: o.skill, k: 0, lapseT: 0, dashK: -99, healFirst: !o.naive, flank: !o.naive, orbit: 1, lx: 0, ly: 0, hard: 0, first: 9 };
    const fly = rec => { bot(rec); B.k++; };
    inputSource = fly;
  }
  globalThis.__pt = { play, live };
})();`;
g.run(HARNESS, 'playtest-harness');

const runs = [];
const t0 = Date.now();
for (const pilot of PILOTS) for (const skill of SKILLS) for (let s = 0; s < SEEDS; s++) {
  const seed = SEED0 + s * 17 + PILOTS.indexOf(pilot) * 1000;
  const o = { char: pilot, seed, skill, cap: CAP, picks: PICKS, naive: NAIVE };
  const w0 = Date.now();
  const r = JSON.parse(g.run('__pt.play(' + JSON.stringify(o) + ')'));
  runs.push(r);
  if (!QUIET) {
    const e = r.end;
    console.log(`${pilot.padEnd(7)} skill ${skill} seed ${seed}: ${e.dead ? 'died' : 'capped'} wave ${e.wave} (${e.sector}, loop ${e.loop}) ` +
                `at ${fmt(e.t)}  lvl ${e.level}  by ${e.by || '-'}   [${((Date.now() - w0) / 1000).toFixed(0)}s real]`);
  }
}
function fmt(s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(runs));

/* --------------------------------- the summary --------------------------------- */
const med = a => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const f1 = x => Number.isFinite(x) ? x.toFixed(1) : '-';

console.log('\n=== runs ===');
console.log('median length ' + fmt(med(runs.map(r => r.end.t))) + ', median wave ' + med(runs.map(r => r.end.wave)) +
            ', died ' + runs.filter(r => r.end.dead).length + '/' + runs.length + ' (wall time ' + ((Date.now() - t0) / 1000).toFixed(0) + 's)');

console.log('\n=== waves (median across runs; seconds; a wave a run ended in is left out) ===');
console.log('wave  sector         len   empty  offscr  tail   few<=3  dmg%   kills  avgAlive  n');
const byW = new Map();
for (const r of runs) for (const w of r.waves) if (w.done) { if (!byW.has(w.wave)) byW.set(w.wave, []); byW.get(w.wave).push(w); }
for (const [wv, L] of [...byW].sort((a, b) => a[0] - b[0])) {
  if (wv === 0) continue;
  const len = L.map(w => w.t1 - w.t0);
  console.log(String(wv).padEnd(5) + ' ' + (L[0].boss ? ('BOSS ' + L[0].boss) : L[0].sector).padEnd(14) +
    f1(med(len)).padStart(5) + f1(med(L.map(w => w.empty))).padStart(7) + f1(med(L.map(w => w.offscreen))).padStart(8) +
    f1(med(L.map(w => w.tail))).padStart(6) + f1(med(L.map(w => w.few))).padStart(8) +
    f1(med(L.map(w => 100 * w.dmg))).padStart(7) + String(Math.round(med(L.map(w => w.kills)))).padStart(7) +
    f1(med(L.map(w => w.sumAlive / Math.max(1, w.n)))).padStart(10) + String(L.length).padStart(4));
}

console.log('\n=== deaths ===');
const by = {};
for (const r of runs.filter(r => r.end.dead)) { const k = r.end.by || ('(report names nothing) ' + (r.end.unnamedBy || '?')); by[k] = (by[k] || 0) + 1; }
console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ×' + v).join(', ') || 'none');
console.log('death waves: ' + runs.filter(r => r.end.dead).map(r => r.end.wave).sort((a, b) => a - b).join(' '));

console.log('\n=== damage taken by source (all runs) ===');
const src = {};
for (const r of runs) for (const h of r.hurt) src[h[3]] = (src[h[3]] || 0) + h[2];
const tot = Object.values(src).reduce((a, b) => a + b, 0) || 1;
console.log(Object.entries(src).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + ' ' + (100 * v / tot).toFixed(0) + '%').join(', '));

console.log('\n=== bosses ===');
const bl = {};
for (const r of runs) for (const b of r.bossLife) (bl[b.boss] = bl[b.boss] || []).push(b);
for (const [k, L] of Object.entries(bl)) console.log(k.padEnd(14) + ' killed ' + L.length + '×, lived ' + f1(med(L.map(b => b.life))) + 's median (' + f1(Math.min(...L.map(b => b.life))) + '–' + f1(Math.max(...L.map(b => b.life))) + '), hull after ' + (100 * med(L.map(b => b.hp))).toFixed(0) + '%');

console.log('\n=== interruptions ===');
for (const r of runs) {
  const mins = r.end.t / 60;
  r.rate = { levelups: r.levelups / mins, shops: r.shops / mins };
}
console.log('level-ups per minute ' + f1(med(runs.map(r => r.rate.levelups))) + ', shops per minute ' + f1(med(runs.map(r => r.rate.shops))) +
            ', level-ups in the first 2 min ' + med(runs.map(r => r.menus.filter(m => m[0] === 'levelup' && m[1] < 120).length)));
