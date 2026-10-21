/* ===========================================================================
   THE PVP PACE — `npm run pace:pvp` (PVP-PLAN.md, "The pace of a fight")

   Not a test: a measuring tape. It plays whole matches on the real engine in
   Node, both pilots flown by the bot's own brain (pvp/site/js/bot.js) at the
   same skill, and says how long the rounds ran, how they ended, how far
   apart the pilots kept and how much of each round went to overtime. It is
   how the round's clock (OVERTIME in pvp/site/js/rounds.js) and the duel's
   numbers (DUEL in duel.js) were tuned, and how to tune them again.

     node scripts/pvp-pace.mjs [--pairs runner:ember,melee:hacker] [--skills 0.65,0.9]
                               [--seeds 3] [--awake] [--clean|--infested] [--cap 900] [--quiet]
                               [--set OVERTIME.at=60,DUEL.burstCap=0.3]

   With no --pairs it plays every pairing of the four pilots, mirrors too.
   The player's own pilot is flown by a mirror of the bot (the brain's code,
   read from bot.js and pointed the other way), so both sides fight alike.
   The numbers in PVP-PLAN.md were measured with --seeds 6, base and --awake.
   ========================================================================= */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
import { PVP_SCRIPTS } from './pvp-build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IDX = join(ROOT, 'index.html');
const SITE = join(ROOT, 'pvp', 'site');
const arg = (name, dflt) => { const i = process.argv.indexOf('--' + name); return i >= 0 ? process.argv[i + 1] : dflt; };
const flag = name => process.argv.includes('--' + name);

const PILOTS = ['runner', 'ember', 'hacker', 'melee'];
const pairs = arg('pairs', '') ? arg('pairs').split(',').map(p => p.split(':'))
  : PILOTS.flatMap(a => PILOTS.map(b => [a, b])).filter(([a, b]) => a <= b);
const skills = arg('skills', '0.65,0.9').split(',').map(Number);
const seeds = +arg('seeds', 2);
const cap = +arg('cap', 900);                 // seconds of play a match may run before it is called
const awake = flag('awake');
const variant = flag('clean') ? false : flag('infested') ? true : null;
const quiet = flag('quiet');
// numbers to try in place of the files' own: OVERTIME.* (rounds.js), DUEL.* (duel.js), ARENA.* (maps.js), ROUNDS.*, BRAIN.*
const sets = arg('set', '') ? arg('set').split(',').map(kv => {
  const m = /^(OVERTIME|DUEL|ARENA|ROUNDS|BRAIN)\.(\w+)=(-?[\d.]+|true|false)$/.exec(kv);
  if (!m) throw new Error('pvp-pace: --set takes NAME.key=number, not ' + kv);
  return `PVP.${m[1] === 'ARENA' ? 'maps.ARENA' : m[1]}.${m[2]} = ${m[3]};`;
}).join(' ') : '';

/* The brain, pointed the other way: the same code that flies the bot's pilot
   (pilot 1) at the player's (pilot 0), flying pilot 0 at pilot 1. Everything
   up to the queue, with its own state (M.botMirror), handed back as think. */
function mirrorBrain() {
  const src = readFileSync(join(SITE, 'js', 'bot.js'), 'utf8');
  const cut = src.indexOf('  /* LS.source while a bot match runs');
  if (cut < 0) throw new Error('pvp-pace: bot.js no longer has its feed where it was expected');
  const body = src.slice(0, cut)
    .replace('if (!M) return;', 'if (!M) return;\n  const __A = 0, __F = 1;')
    .replace('const BRAIN = M.BRAIN = {', 'const BRAIN = {')
    .replace('const B = M.botMatch = {', 'const B = M.botMirror = {')
    .replace(/pilotP\(1\)/g, 'pilotP(__A)').replace(/pilotP\(0\)/g, 'pilotP(__F)')
    .replace(/hackPid === 1/g, 'hackPid === __A')
    .replace(/PILOT\.on === 1/g, 'PILOT.on === __A')
    .replace(/PILOTS\[1\]/g, 'PILOTS[__A]')
    .replace(/pilotMine\(\)/g, '__F');
  return body + '  M.botMirror.think = think;\n})();\n';
}
const MIRROR = mirrorBrain();
const pvpScripts = PVP_SCRIPTS.map(s => ({ name: s, code: readFileSync(join(SITE, s), 'utf8') }));

const ME = {
  account: { name: 'pace', display: 'Pace' },
  unlocks: { chars: PILOTS, awake: ['ember', 'hacker', 'melee'], chal: [], ups: [] },
  league: { id: 'gold', n: 'GOLD', provisional: false },
  loadouts: { casual: { pilots: PILOTS, awake: awake ? ['ember', 'hacker', 'melee'] : [], ups: [] } }
};

/* What the page notes as it plays (LS.after, the end of every shared step):
   each round's length, how it ended and whether it went to overtime, and how
   far apart the pilots kept. */
const WATCH = `
  globalThis.__pace = { rounds: [], gap: [0, 0, 0] };
  let __round = 0, __start = 0, __ot = false;
  LS.after = () => {
    const m = RUN.pvp;
    if (!m || m.phase !== 'fight') return;
    if (m.round !== __round) { __round = m.round; __start = m.clock; __ot = false; }
    const a = pilotP(0), b = pilotP(1), d = Math.hypot(a.x - b.x, a.y - b.y);
    __pace.gap[d < 250 ? 0 : d < 500 ? 1 : 2]++;
    if (PVP.overtime && PVP.overtime(m)) __ot = true;
  };
  const __down = PVP.down;
  PVP.down = () => {
    const m = RUN.pvp, live = m && m.phase === 'fight';
    const r = __down();
    if (live && m.phase === 'end') {
      const w = pilotP(m.winner);
      __pace.rounds.push({ len: m.clock - __start, w: m.winner, left: w ? Math.max(0, w.hp) / w.maxHp : 0, ot: __ot,
                           dealt: m.dealt.slice() });
    }
    return r;
  };`;

function dice(seed) {
  return `(() => { let a = ${seed >>> 0}; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })()`;
}

async function match(a, b, skill, seed) {
  const hand = { mode: 'bot', pilot: a, me: ME,
                 bot: { id: 'pace' + String(seed).padStart(4, '0').slice(-4), name: 'BOT PACE', pilot: b, awake, skill, seed: seed * 7919 + 13 } };
  const g = loadGame(IDX, {
    scripts: pvpScripts.concat([{ name: 'mirror', code: MIRROR }]),
    before: win => {
      // enough DOM for the result's overlay: an element finds what its innerHTML would have held
      const make = win.document.createElement;
      win.document.createElement = tag => {
        const el = make(tag), q = {};
        el.querySelector = sel => q[sel] || (q[sel] = { textContent: '', hidden: false, style: {}, addEventListener() {},
                                                        classList: { toggle() {}, add() {}, remove() {} } });
        return el;
      };
      win.fetch = () => Promise.reject(new Error('offline'));
      win.location.replace = () => {};
      win.sessionStorage.setItem('vr_pvp_play', JSON.stringify(hand));
    }
  });
  await new Promise(r => setTimeout(r, 20));
  if (sets) g.run(sets);
  if (variant !== null) g.run(`{ const __pick = PVP.maps.pick; PVP.maps.pick = () => Object.assign(__pick(), { infested: ${variant} }); }`);
  g.run(`PVP.botMirror.skill = ${skill}; PVP.botMirror.rng = ${dice(seed * 104729 + 1)}; PVP.botMirror.ph = PVP.botMirror.rng() * 10;
         PVP.botMatch.human = rec => PVP.botMirror.think(LS.hi + 1, rec);` + WATCH);
  let i = 0;
  const frames = 60 * cap;
  for (; i < frames; i++) {
    g.run('lsFrame(1 / 60); PVP.frame()');
    if (i % 600 === 0 && g.run('!!(PVP.shown || (RUN.pvp && RUN.pvp.phase === "over"))')) break;
  }
  const out = g.run(`({ pace: __pace, score: RUN.pvp ? RUN.pvp.score : null, clock: RUN.pvp ? RUN.pvp.clock : 0, otAt: PVP.OVERTIME.at,
                       infested: RUN.pvp ? RUN.pvp.infested : null, over: !!(RUN.pvp && RUN.pvp.phase === 'over'),
                       map: RUN.pvp ? PVP.maps.list()[RUN.pvp.map].name : '' })`);
  return Object.assign(out, { a, b, skill, seed, secs: i / 60 });
}

const pct = (xs, p) => { if (!xs.length) return NaN; const s = xs.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = xs => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const f0 = x => (Number.isFinite(x) ? x.toFixed(0) : '—');

const all = [];
const t0 = Date.now();
for (const skill of skills) {
  for (const [a, b] of pairs) {
    for (let s = 1; s <= seeds; s++) {
      const r = await match(a, b, skill, s + Math.round(skill * 1000));
      all.push(r);
      if (!quiet) {
        const lens = r.pace.rounds.map(x => x.len.toFixed(0) + (x.ot ? '*' : '')).join(' ');
        const g = r.pace.gap, gt = g[0] + g[1] + g[2] || 1;
        console.log(`${a.padEnd(6)} v ${b.padEnd(6)} skill ${skill}  ${r.over ? (r.score || []).join('–') : 'CALLED'}  ` +
                    `${f0(r.clock)} s fought (${lens})  ${r.infested ? 'infested' : 'clean'}  ` +
                    `apart <250/<500/more: ${f0(100 * g[0] / gt)}/${f0(100 * g[1] / gt)}/${f0(100 * g[2] / gt)}%`);
      }
    }
  }
}

const rounds = all.flatMap(r => r.pace.rounds);
const lens = rounds.map(x => x.len);
const called = all.filter(r => !r.over).length;
const gaps = all.reduce((s, r) => s.map((v, i) => v + r.pace.gap[i]), [0, 0, 0]);
const gt = gaps[0] + gaps[1] + gaps[2] || 1;
console.log('');
if (sets) console.log('set: ' + sets);
console.log(`${all.length} matches, ${rounds.length} rounds, ${called} called at ${cap} s  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log(`round length: median ${f0(pct(lens, 0.5))} s, mean ${f0(mean(lens))} s, 10% ${f0(pct(lens, 0.1))} s, 90% ${f0(pct(lens, 0.9))} s, ` +
            `longest ${f0(Math.max(0, ...lens))} s, shortest ${f0(lens.length ? Math.min(...lens) : NaN)} s`);
console.log(`rounds under 15 s: ${rounds.filter(x => x.len < 15).length}, over 60 s: ${rounds.filter(x => x.len > 60).length}, ` +
            `over 120 s: ${rounds.filter(x => x.len > 120).length}, into overtime: ${rounds.filter(x => x.ot).length}`);
const ots = all.flatMap(r => r.pace.rounds.filter(x => x.ot).map(x => x.len - r.otAt));
console.log(`overtime, once in it: median ${f0(pct(ots, 0.5))} s, 90% ${f0(pct(ots, 0.9))} s, longest ${f0(Math.max(0, ...ots))} s`);
console.log(`match length (fought): median ${f0(pct(all.filter(r => r.over).map(r => r.clock), 0.5))} s, ` +
            `90% ${f0(pct(all.filter(r => r.over).map(r => r.clock), 0.9))} s`);
console.log(`winner's health left: median ${f0(100 * pct(rounds.map(x => x.left), 0.5))}%`);
console.log(`apart: <250 px ${f0(100 * gaps[0] / gt)}%, 250–500 ${f0(100 * gaps[1] / gt)}%, more ${f0(100 * gaps[2] / gt)}%`);
// by pilot: how long the rounds it fought ran, and how often it won them
for (const p of PILOTS) {
  const rs = all.flatMap(r => r.pace.rounds.map(x => ({ x, side: r.a === p ? 0 : r.b === p ? 1 : -1, mirror: r.a === r.b })))
    .filter(o => o.side >= 0);
  if (!rs.length) continue;
  const won = rs.filter(o => !o.mirror && o.x.w === o.side).length, played = rs.filter(o => !o.mirror).length;
  console.log(`  ${p.padEnd(7)} rounds ${String(rs.length).padStart(3)}  median ${f0(pct(rs.map(o => o.x.len), 0.5)).padStart(3)} s  ` +
              `90% ${f0(pct(rs.map(o => o.x.len), 0.9)).padStart(3)} s  won ${played ? f0(100 * won / played) : '—'}% of ${played} against others`);
}
