#!/usr/bin/env node
/* ===========================================================================
   THE UNWRITTEN — the test: `npm run test:unwritten`

   The fight as it was rewritten on 15 Oct 2026 (index.html, THE UNWRITTEN),
   in the game's own VM:

     the page      lines, not damage: the same page whatever the build, and
                   shorter by a tenth for every death down to its floor
     the wound     a hit fills a gash by three at most; one half open is
                   nothing, and lapses; both open writes one line, and a
                   sequence holds at its last line until it has shown itself
     the rewind    a death puts every pilot back as the fight found them, on
                   a shorter page, with the sequences held for less of it
     co-op         one pilot down is a knock-down, a line written stands it
                   up, and only both down rewinds the fight, for both
     RONIN         reads it as an empty bucket: it executes on the last lines
     closed        a bot that dodges about as well as a person, flying each
                   of the four pilots, closes it; a weak build too, in a few
                   attempts; and every sequence draws

     node scripts/unwritten.mjs [path/to/index.html]

   No packages and no network. Exits 1 on any failure. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.slice(2).find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');
const t0 = Date.now();

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }

const g = loadGame(IDX, { w: 1280, h: 720 });
g.run(`(() => {
  pageDead = true;
  Save.profile.gfxSeen = GFX_VER;
  Save.profile.rushBest = RUSH_PEAK;                 // THE VAGRANT
  Save.profile.codexM = MALWARE.map(m => m.id);      // THE HACKER
  let rs = 1;
  const rr = () => { rs = (rs * 1103515245 + 12345) >>> 0; return rs / 4294967296; };
  globalThis.C = [];
  globalThis.chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  globalThis.flush = () => { const out = JSON.stringify(C); C = []; return out; };
  // a run with a pilot and a build of random cards (THE VAGRANT has none), and the fight begun
  globalThis.begin = (char, cards, seed) => {
    rs = seed * 7919 + 13;
    Save.profile.trueEnd = false; Save.profile.unwrittenDeaths = 0;
    Save.profile.codexM = MALWARE.map(m => m.id);
    applyChar(CHARS.findIndex(c => c.id === char), true);
    runSeedNext = seed; runViewNext = { w: 1366, h: 768 }; resetGame(); state = 'play';
    for (let i = 0; i < cards && P.charId !== 'melee'; i++) {
      const pool = UPGRADES.filter(u => (P.up[u.id] || 0) < u.max && !u.lock && !u.need && !['glass', 'xp', 'luck', 'scav', 'mag'].includes(u.id));
      if (!pool.length) break;
      applyUpgrade(pool[Math.floor(rr() * pool.length)]);
    }
    P.hp = P.maxHp;
    startUnwritten();
  };
  // out of the interstitial, however slowly the room is running (Bullet Time slows it at no health)
  globalThis.rewound = () => { for (let k = 0; k < 600 && unwDeadT > 0; k++) update(1 / 60); return unwDeadT <= 0; };
  globalThis.steps = (sec, each) => { for (let k = 0; k < sec * 60; k++) { if (state === 'levelup') { uiArm = 0; handleKey('1'); } else if (state !== 'play') state = 'play'; update(1 / 60); if (each) each(k); } };

  /* A player, about as good as a person: it reads a tell a third of a
     second late, sees a shot only once it is close, and misses some of
     those outright. It keeps off torn floor, steps off a line that is about
     to cut, sidesteps, keeps its distance (THE VAGRANT goes in), parries
     what is about to land, and aims at whichever half the wound wants. */
  globalThis.bot = rec => {
    const u = unwritten, late = 0.32;
    let mx = 0, my = 0;
    const push = (x, y, w) => { mx += x * w; my += y * w; };
    const offLine = (x1, y1, x2, y2, w, k) => {
      const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
      const t = clamp(((P.x - x1) * dx + (P.y - y1) * dy) / L2, 0, 1);
      const ox = P.x - (x1 + dx * t), oy = P.y - (y1 + dy * t), d = Math.hypot(ox, oy) || 0.01;
      if (d < w) push(ox / d, oy / d, k * (1.2 - d / w));
    };
    let want = null;
    if (u && u.a && u.b) {
      for (const t of unwTears) {
        if (t.warn > 0.75 - late * 0.6) continue;
        const rc = unwCellRect(t.c, t.r);
        if (P.x > rc.x && P.x < rc.x + rc.w && P.y > rc.y && P.y < rc.y + rc.h) {
          const dl = P.x - rc.x, dr = rc.x + rc.w - P.x, du = P.y - rc.y, dd = rc.y + rc.h - P.y, m = Math.min(dl, dr, du, dd);
          if (m === dl) push(-1, 0, 6); else if (m === dr) push(1, 0, 6); else if (m === du) push(0, -1, 6); else push(0, 1, 6);
        } else {
          const cx = clamp(P.x, rc.x, rc.x + rc.w), cy = clamp(P.y, rc.y, rc.y + rc.h);
          const dx = P.x - cx, dy = P.y - cy, d = Math.hypot(dx, dy) || 1;
          if (d < 40) push(dx / d, dy / d, 3 * (1 - d / 40));
        }
      }
      if (u.seam && u.seam.st !== 'rest' && (u.seam.st !== 'tell' || u.seam.t < UNW_SEAM.tell - late)) offLine(u.seam.x1, u.seam.y1, u.seam.x2, u.seam.y2, 70, 5);
      if (u.rush && u.rush.st === 'tell' && u.rush.t < UNW_RUSH.tell - late) for (const p of u.rush.paths) offLine(p.x0, p.y0, p.x1, p.y1, 95, 5);
      const d0 = u.draft;
      if (d0 && d0.kind !== 'bullet' && d0.st !== 'idle') offLine(d0.x, d0.y, d0.x + Math.cos(d0.ang) * 600, d0.y + Math.sin(d0.ang) * 600, 70, 4);
      want = u.open[0] > 0 ? u.b : u.open[1] > 0 ? u.a : u.gash[0] >= u.gash[1] ? u.a : u.b;
      for (const e of [u.a, u.b]) {
        const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1, keep = P.weapon === 'blade' ? e.r + 34 : e.r + 90;
        if (d < keep) push(dx / d, dy / d, 3 * (1 - d / keep) + 0.5);
      }
    }
    for (const b of ebullets) {
      const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy);
      if (d > 110 || (((b.x * 13 + b.y * 7) | 0) % 10 + 10) % 10 < 3) continue;
      const vs = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / vs, uy = b.vy / vs;
      if (dx * ux + dy * uy < 0) continue;
      const perp = dx * -uy + dy * ux, side = perp >= 0 ? 1 : -1;
      if (Math.abs(perp) < 30) push(-uy * side, ux * side, 1.6 * (1 - d / 150));
    }
    const busy = u && (u.rush || (u.seam && u.seam.st !== 'rest'));
    if (want && !busy && (P.weapon === 'blade' || P.weapon === 'laser')) {
      const dx = want.x - P.x, dy = want.y - P.y, d = Math.hypot(dx, dy) || 1;
      if (d > (P.weapon === 'blade' ? want.r + 40 : 230)) push(dx / d, dy / d, P.weapon === 'blade' ? 1.2 : 0.8);
    }
    if (P.x < arena.x0 + 70) push(1, 0, 2); if (P.x > arena.x1 - 70) push(-1, 0, 2);
    if (P.y < arena.y0 + 70) push(0, 1, 2); if (P.y > arena.y1 - 70) push(0, -1, 2);
    push(((arena.x0 + arena.x1) / 2 - P.x) / 900, ((arena.y0 + arena.y1) / 2 - P.y) / 900, 0.4);
    const m = Math.hypot(mx, my);
    rec.mx = m > 0.15 ? mx / m : 0; rec.my = m > 0.15 ? my / m : 0;
    rec.ax = want ? want.x : P.x + 100; rec.ay = want ? want.y : P.y;
    rec.trig = true; rec.lmb = true; rec.auto = false; rec.dash = false;
    rec.touch = false; rec.taim = null; rec.local = false; rec.held = '';
    rec.press = P.weapon === 'blade' && ebullets.some(b => len(b.x - P.x, b.y - P.y) < 46) ? ['parry'] : [];
  };
  // flown until it is closed or the time runs out
  globalThis.fly = (char, cards, seed, mins) => {
    begin(char, cards, seed);
    inputSource = bot;
    const lines = [unwritten.maxHp];
    let t = 0;
    try {
      for (; t < mins * 60 && !RUN.trueEnd && state !== 'dead'; t += 1 / 60) {
        if (state === 'levelup') { uiArm = 0; handleKey('1'); } else if (state !== 'play') state = 'play';
        update(1 / 60);
        if (unwritten && unwDeadT <= 0 && unwritten.maxHp !== lines[lines.length - 1]) lines.push(unwritten.maxHp);
      }
    } finally { inputSource = inputSample; }
    return { won: !!RUN.trueEnd, deaths: RUN.unwrittenDeaths | 0, t: Math.round(t), lines, char: P.charId };
  };
})();`, 'unwritten-kit');

/* ------------------------------------------------------------------------ */
section('the page');
take(g.run(`(() => {
  const want = [15, 14, 12, 11, 9, 8, 6, 5, 5, 5];
  chk(JSON.stringify(want.map((_, d) => unwLinesFor(d))) === JSON.stringify(want), 'fifteen lines, a tenth fewer a death, never fewer than five', want.map((_, d) => unwLinesFor(d)));
  begin('runner', 0, 3); const bare = unwritten.maxHp;
  begin('runner', 60, 3); const full = unwritten.maxHp;
  chk(bare === UNW_LINES && full === UNW_LINES, 'the build does not change the page', [bare, full]);
  chk(unwritten.a.dmg === 0 && unwritten.b.dmg === 0 && unwritten.a.lockPhase === 0, 'its touch is its own and the shell does not pace it');
  chk(UNW_SEQ.length === 5 && UNW_SEQ.every((S, i) => i === 0 || S.until < UNW_SEQ[i - 1].until) && UNW_SEQ[4].until === 0,
      'five sequences on health, each lower than the last');
  return flush(); })()`));

section('the wound');
take(g.run(`(() => {
  begin('runner', 20, 4);
  const u = unwritten;
  steps(2.6);                                   // the entrance
  chk(u.seamT <= 0, 'the entrance ends');
  unwHit(u.a, 1e12);
  chk(u.gash[0] === 3, 'one blow fills a gash by three at most', u.gash[0]);
  u.gash[0] = 0;
  unwOpen(0);
  for (let i = 0; i < 100; i++) unwHit(u.a, 1e6);
  chk(u.written === 0 && u.hp === u.maxHp, 'one half open is nothing, however hard it is hit');
  steps(UNW_OPEN_T + 0.2);
  chk(u.open[0] === 0, 'and an open half closes if the other is not opened in time');
  unwOpen(1);
  chk(u.written === 0, 'so the other opening late writes nothing');
  unwOpen(0);
  chk(u.written === 1 && u.hp === u.maxHp - 1 && u.stunT > 0, 'both open at once writes one line and throws both halves off', [u.written, u.hp]);
  P.hp = P.maxHp * 0.5; u.open = [0, 0]; unwOpen(0); unwOpen(1);
  chk(Math.abs(P.hp - P.maxHp * (0.5 + UNW_MEND)) < 1e-6, 'and mends the pilot a little', P.hp / P.maxHp);
  chk(ebullets.length === 0, 'and the ink in the air is wiped with it');
  // the sequence holds at its last line until it has shown itself
  u.seqT = 0; u.hp = Math.floor(u.maxHp * UNW_SEQ[0].until) + 1;
  u.open = [0, 0]; unwOpen(0); unwOpen(1);
  chk(u.seq === 0 && u.hp === Math.floor(u.maxHp * UNW_SEQ[0].until) + 1, 'a sequence holds its last line until it has run its minimum');
  u.seqT = unwSeqMin(u); u.open = [0, 0]; unwOpen(0); unwOpen(1);
  chk(u.seq === 1 && u.seamT > 0, 'then the line is written and the page turns', [u.seq, u.seamT]);
  chk(u.a.invuln && u.b.invuln, 'and nothing touches it while it turns');
  return flush(); })()`));

section('the rewind');
take(g.run(`(() => {
  begin('runner', 20, 5);
  const up0 = JSON.stringify(P.up), max0 = P.maxHp, lines0 = unwritten.maxHp, min0 = unwSeqMin(unwritten);
  steps(3);
  applyUpgrade(UPGRADES.find(u => u.id === 'dmg'));
  P.x += 300;
  hurtPlayer(1e9, { pure: true });
  chk(unwDeadT > 0 && RUN.unwrittenDeaths === 1 && state === 'play', 'a death is not the end of the run: it rewinds', [unwDeadT, RUN.unwrittenDeaths, state]);
  chk(rewound() && unwritten && unwritten.seq === 0, 'to the start of the fight');
  chk(JSON.stringify(P.up) === up0 && P.maxHp === max0 && P.hp === P.maxHp, 'with the pilot as the fight found it', [JSON.parse(up0), P.up]);
  chk(unwritten.maxHp === unwLinesFor(1) && unwritten.maxHp < lines0, 'on a shorter page', [lines0, unwritten.maxHp]);
  chk(unwSeqMin(unwritten) < min0, 'whose sequences hold for less of it', [min0, unwSeqMin(unwritten)]);
  for (let d = 0; d < 8; d++) { hurtPlayer(1e9, { pure: true }); rewound(); }
  chk(unwritten.maxHp === UNW_FLOOR && unwSeqMin(unwritten) >= UNW_SEQ_MIN_LO, 'down to its floor and no further', unwritten.maxHp);
  return flush(); })()`));

section('co-op');
take(g.run(`(() => {
  Save.profile.trueEnd = false; Save.profile.unwrittenDeaths = 0;
  applyChar(0, true); runSeedNext = 6; runViewNext = { w: 1366, h: 768 }; resetGame(); state = 'play';
  pilotsBegin(0, false);
  startUnwritten();
  chk(unwSnap.length === 2, 'both pilots are kept as the fight found them');
  steps(2.6);
  pilotDo(1, () => hurtPlayer(1e9, { pure: true }));
  chk(pilotP(1).down && unwDeadT <= 0 && !RUN.unwrittenDeaths, 'one pilot down is a knock-down, not a rewind');
  unwritten.open = [0, 0]; unwOpen(0); unwOpen(1);
  chk(!pilotP(1).down && pilotP(1).hp > 0, 'a line written stands it back up');
  pilotDo(1, () => hurtPlayer(1e9, { pure: true }));
  pilotDo(0, () => hurtPlayer(1e9, { pure: true }));
  chk(unwDeadT > 0 && RUN.unwrittenDeaths === 1, 'both down rewinds the fight');
  rewound();
  chk(!pilotP(0).down && !pilotP(1).down && pilotP(0).hp === pilotP(0).maxHp && pilotP(1).hp === pilotP(1).maxHp,
      'for both of them');
  // the tears and the cuts reach the second pilot as well as the first
  const q = pilotP(1), cell = unwCellAt(q.x, q.y);
  unwTears.push({ c: cell.c, r: cell.r, warn: 0, w0: 1, life: 2 });
  const hp1 = q.hp;
  steps(0.1);
  chk(pilotP(1).hp < hp1, 'torn floor hurts the second pilot too', [hp1, pilotP(1).hp]);
  pilotsEnd();
  return flush(); })()`));

section('RONIN');
take(g.run(`(() => {
  begin('melee', 0, 7);
  const f = roninFinaleOf(unwritten.a);
  chk(f && f.key === 'unwritten' && f.bucket.tok === 0, 'its bucket reads as empty');
  chk(!stillExecutes(unwritten.a, 1e12), 'so no counter executes it on a full page');
  unwritten.hp = 2;
  chk(stillExecutes(unwritten.a, 1), 'and any counter does on its last lines');
  return flush(); })()`));

section('closed');
const R = [];
for (const [char, cards, seed, mins] of [['runner', 12, 1, 12], ['runner', 12, 2, 12], ['ember', 12, 1, 12], ['ember', 12, 2, 12],
                                          ['hacker', 12, 1, 12], ['hacker', 12, 2, 12], ['melee', 0, 1, 12], ['melee', 0, 2, 12],
                                          ['ember', 6, 1, 20], ['hacker', 6, 1, 20]]) {
  const r = JSON.parse(g.run(`JSON.stringify(fly('${char}', ${cards}, ${seed * 31 + 7}, ${mins}))`));
  R.push(r);
  ok(r.char === char, char + ' is flown as itself', r);
  ok(r.won, char + ' with ' + (cards ? cards + ' cards' : 'its kit') + ' closes it (seed ' + seed + ')', r);
  ok(r.lines.every((n, i) => i === 0 || n < r.lines[i - 1] || n === 5), char + ': each attempt on a shorter page', r.lines);
  console.log('    ' + char.padEnd(7) + (cards ? ('c' + cards) : 'kit').padEnd(5) + ' s' + seed + '  ' + (r.won ? 'closed' : 'OPEN') + ' in ' + r.t + 's, ' + r.deaths + ' rewind' + (r.deaths === 1 ? '' : 's') + '  lines ' + r.lines.join(' '));
}
ok(R.filter(r => r.deaths === 0).length >= 4, 'a decent player closes it first time more often than not', R.map(r => r.deaths));

take(g.run(`(() => {
  begin('ember', 12, 9);
  P.maxHp = P.hp = 1e9;
  for (const k of Object.keys(FXO)) FXO[k] = 1;
  let err = null;
  for (let i = 0; i < 5 && !err; i++) {
    unwJump(i);
    steps(9, k => { if (k % 9 === 0 && !err) { try { render(); } catch (e) { err = String(e && e.stack || e).split('\\n').slice(0, 2).join(' '); } } });
  }
  chk(!err, 'every sequence draws', err);
  try { CODEX_ART.unwritten(80, UNW_COL); } catch (e) { err = String(e); }
  chk(!err, 'and its codex page', err);
  return flush(); })()`));

console.log((fails ? fails + ' FAILED, ' : '') + passes + ' passed  (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
process.exit(fails ? 1 : 0);
