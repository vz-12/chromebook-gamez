#!/usr/bin/env node
/* VOIDRUNNER — the score's engine, without a browser (MUSIC-PLAN.md, step 2).

   The game's script runs in the Node VM (scripts/lib/game-vm.mjs) with a
   fake Web Audio: a clock this test moves by hand, and every node the engine
   makes recorded with when it starts and stops. "Decoding" hands back a
   buffer as long as the fixture's bytes say, and fetch serves the manifests
   below. So what is checked is the engine's own arithmetic and decisions:

     - pieces start exactly on their bar lines (gapless), each its lead of
       silence early, and none is ever cut: it rings out under the next
     - a locked intro plays through, a section loops
     - a sector's calm and fight (locked, as studio/build.py writes them) each
       play their section out: a new mood waits for the last bar, so the music
       never jumps between the two or starts one over
     - a boss: the boss-in sting, the old track cut, the boss track on the
       sting's hit, its phases on bar lines; then the boss-down sting
     - the corrupted OTHER: the same boss with something else in it has a song
       of its own, cut to with no sting
     - THE SOUNDTRACK: a song picked there plays through its own running order
       with no sting, stays on over the menu and lets go when a run begins;
       and a song is kept by passing its sector or putting its boss down
     - ALL HALLOWS: an area plays its own track, two calm sections and two
       fights taking turns; its songs are listed once the chapter is open and
       kept with its boss
     - a cue with no track leaves the room to the synth bed, and a cue with
       one silences it
     - a segment not decoded in time is covered by the last phrase again
     - a tab back from the background picks up from now
     - pause ducks, MUSIC at 0 stops, a track that ends stays ended
     - at most MUSIC_DECODED segments are ever decoded at once
     - recorded effects: a take at random, never the same twice running,
       nudged in pitch; no recording keeps the synth; EFFECTS at 0 is silence
     - the run never notices: the same seed plays the same with the score
       running as without it

     node scripts/music.mjs [path/to/index.html]

   Exits 1 on any failure. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.slice(2).find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');
const t0 = Date.now();

/* ----------------------------- the fixture ----------------------------- */
const BAR = 2;                                   // 120 BPM, 4/4
const PRE = 0.01;                                // each piece's lead of silence
const SEG = {};                                  // file → { s, d, name }: its bars, and the whole file with lead and ring
const seg = (name, bars, ring = 1.5) => { const f = name + '.opus'; SEG[f] = { s: bars * BAR, d: PRE + bars * BAR + ring, name }; return { f, s: bars * BAR }; };
const MANIFEST = {
  v: 1,
  tracks: {
    title: { bpm: 120, pre: PRE, segs: [seg('title/0', 4), seg('title/1', 4)], sections: { a: { segs: [0, 1] } } },
    grid: { bpm: 120, pre: PRE, gain: -2, segs: [seg('grid/intro', 2), seg('grid/a0', 4), seg('grid/a1', 4), seg('grid/b0', 4), seg('grid/b1', 4)],
            sections: { intro: { segs: [0], lock: true, next: 'a' }, a: { segs: [1, 2], lock: true }, b: { segs: [3, 4], lock: true, next: 'a' } },
            moods: { calm: 'a', fight: 'b' }, start: 'intro', order: ['intro', 'a', 'b'], loop: 1, title: 'Entry Vector' },
    warden: { bpm: 160, pre: PRE, segs: [seg('warden/p1a', 4), seg('warden/p1b', 4), seg('warden/p2', 4), seg('warden/p3', 4)],
              sections: { p1: { segs: [0, 1] }, p2: { segs: [2] }, p3: { segs: [3] } }, moods: { p1: 'p1', p2: 'p2', p3: 'p3' } },
    other: { bpm: 160, pre: PRE, segs: [seg('other/p1', 4)], sections: { p1: { segs: [0] } }, moods: { p1: 'p1' } },
    corrupt: { bpm: 176, pre: PRE, segs: [seg('corrupt/intro', 2), seg('corrupt/v1', 4)],
               sections: { intro: { segs: [0], lock: true, next: 'v1' }, v1: { segs: [1] } }, moods: { p1: 'v1' }, start: 'intro' },
    house: { bpm: 120, pre: PRE, segs: [seg('house/a', 2), seg('house/a2', 2), seg('house/b', 2), seg('house/c', 2)],
             sections: { a: { segs: [0], lock: true, next: 'a2' }, a2: { segs: [1], lock: true, next: 'a' },
                         b: { segs: [2], lock: true, next: 'c' }, c: { segs: [3], lock: true, next: 'b' } },
             moods: { calm: ['a', 'a2'], fight: ['b', 'c'] }, title: 'Lights on a Timer' },
    deadgame: { bpm: 155, pre: PRE, segs: [seg('deadgame/p1', 4)], sections: { p1: { segs: [0] } }, moods: { p1: 'p1' }, title: 'One Player Online' },
    codex: { bpm: 120, pre: PRE, segs: [seg('codex/0', 2, 1.5)], sections: { o: { segs: [0], next: 'end' } } }
  },
  stings: { 'boss-in': { f: 'stings/boss-in.opus', hit: 1.5 }, 'boss-down': { f: 'stings/boss-down.opus' } }
};
SEG['stings/boss-in.opus'] = { s: 3, d: 3, name: 'sting:boss-in' };
SEG['stings/boss-down.opus'] = { s: 2, d: 2, name: 'sting:boss-down' };
const SFX = { v: 1, sfx: { shoot: { f: ['shoot-1.opus', 'shoot-2.opus', 'shoot-3.opus'], vol: 0.8, pitch: 0.05 } } };
for (const f of SFX.sfx.shoot.f) SEG['sfx:' + f] = { s: 0.1, d: 0.1, name: 'sfx:' + f };

/* ----------------------------- fake Web Audio ----------------------------- */
class Param {
  constructor(v) { this.value = v; this.ev = []; this.target = v; }
  setValueAtTime(v, t) { this.ev.push(['set', v, t]); this.value = v; return this; }
  linearRampToValueAtTime(v, t) { this.ev.push(['lin', v, t]); return this; }
  exponentialRampToValueAtTime(v, t) { this.ev.push(['exp', v, t]); return this; }
  setTargetAtTime(v, t, k) { this.ev.push(['target', v, t, k]); this.target = v; return this; }
  cancelScheduledValues(t) { this.ev.push(['cancel', t]); return this; }
}
const A = { src: [], osc: 0, decodes: 0, slow: new Set(), held: [], fetched: {}, ctx: null };
class FakeNode { constructor(kind) { this.kind = kind; this.to = []; } connect(n) { this.to.push(n); return n; } disconnect() { this.to = []; } }
class FakeAudioContext {
  constructor() { this.currentTime = 0; this.sampleRate = 48000; this.state = 'running'; this.destination = new FakeNode('dest'); A.ctx = this; }
  createGain() { const n = new FakeNode('gain'); n.gain = new Param(1); return n; }
  createBiquadFilter() { const n = new FakeNode('filter'); n.frequency = new Param(350); n.Q = new Param(1); n.type = 'lowpass'; return n; }
  createOscillator() { const n = new FakeNode('osc'); n.frequency = new Param(440); n.type = 'sine'; n.start = () => { A.osc++; }; n.stop = () => {}; return n; }
  createBufferSource() {
    const c = this, n = new FakeNode('src');
    n.playbackRate = new Param(1); n.t1 = null;
    n.start = (t = c.currentTime) => { n.t0 = t; n.at = c.currentTime; A.src.push(n); };
    n.stop = t => { n.t1 = t; };
    return n;
  }
  createBuffer(ch, len, sr) { return { duration: len / sr, numberOfChannels: ch, getChannelData: () => new Float32Array(len) }; }
  decodeAudioData(b) {
    const o = JSON.parse(new TextDecoder().decode(new Uint8Array(b)));
    A.decodes++;
    const buf = { duration: o.d, name: o.name, numberOfChannels: 2 };
    if (A.slow.has(o.name)) return new Promise(r => A.held.push(() => r(buf)));
    return Promise.resolve(buf);
  }
  resume() { return Promise.resolve(); }
}
const respond = (body, ok = true) => Promise.resolve({
  ok, status: ok ? 200 : 404,
  json: () => Promise.resolve(JSON.parse(body)),
  arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body).buffer)
});
let SERVE = true;                                // false: the site has no music/ at all
function fakeFetch(url) {
  url = String(url);
  A.fetched[url] = (A.fetched[url] || 0) + 1;
  if (!SERVE) return respond('', false);
  if (url === '/music/manifest.json') return respond(JSON.stringify(MANIFEST));
  if (url === '/sfx/manifest.json') return respond(JSON.stringify(SFX));
  const m = url.match(/^\/music\/(.+)$/), s = url.match(/^\/sfx\/(.+)$/);
  const k = m ? m[1] : s ? 'sfx:' + s[1] : null;
  if (k && SEG[k]) return respond(JSON.stringify(SEG[k]));
  return respond('', false);
}

/* --------------------------------- driving --------------------------------- */
function load(audio) {
  return loadGame(IDX, { before(win) {
    if (audio) win.AudioContext = FakeAudioContext;
    win.fetch = fakeFetch;
  } });
}
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };
let g = null;
const run = code => g.run(code);
// the clock forward, a frame at a time, with whatever has ended told so
async function tick(secs, dt = 0.05) {
  for (let t = 0; t < secs - 1e-9; t += dt) {
    A.ctx.currentTime = +(A.ctx.currentTime + dt).toFixed(9);
    for (const s of A.src) {
      if (s.ended) continue;
      const end = Math.min(s.t1 != null ? s.t1 : Infinity, s.buffer && s.buffer.duration ? s.t0 + s.buffer.duration / (s.playbackRate.value || 1) : Infinity);
      if (end <= A.ctx.currentTime) { s.ended = true; if (s.onended) s.onended(); }
    }
    run(`Music.tick(${dt})`);
    await flush();
  }
}
const now = () => A.ctx.currentTime;
const played = (from = 0) => A.src.filter(s => s.buffer && s.buffer.name && s.t0 >= from - 1e-9);
const named = (list, pre) => list.filter(s => s.buffer.name.startsWith(pre));
const SEC = n => SEG[n + '.opus'].s;

let fails = 0;
const results = [];
function check(name, ok, detail) {
  results.push([name, ok, detail]);
  if (!ok) fails++;
}
// each starts exactly where the one before it reaches its bar line
function gapless(list) {
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i], want = a.t0 + SEC(a.buffer.name);
    if (Math.abs(b.t0 - want) > 1e-6) return `${b.buffer.name} at ${b.t0.toFixed(4)}, wanted ${want.toFixed(4)} (after ${a.buffer.name})`;
  }
  return null;
}

/* --------------------------------- the checks --------------------------------- */
g = load(true);
run(`pageDead = true; Save.profile.gfxSeen = GFX_VER; Audio_.setVol(1); Audio_.setMix('music', 1); Audio_.setMix('sfx', 1); Audio_.init();`);
await flush();

// 1. the title, from the menu: gapless, looping
run(`state = 'menu'; inHub = false;`);
await tick(30);
{
  const t = named(played(), 'title/');
  const order = t.map(s => s.buffer.name).join(' ');
  const cut = t.filter(s => s.t1 != null).length;
  const rang = t.filter(s => s.ended).every(s => now() >= s.t0 + s.buffer.duration - 1e-6);
  check('title: gapless loop from the menu, no piece cut', t.length >= 4 && !gapless(t) && order.startsWith('title/0 title/1 title/0 title/1') && cut === 0 && rang,
        `${t.length} pieces: ${order.slice(0, 60)}${gapless(t) ? ' · ' + gapless(t) : ''} · cut ${cut} · ${run('Music.cur.src.length')} still sounding`);
}

// 2. a stage: crossfade in, the locked intro, calm; then fight, and calm again, each only once the section playing has played out
// every piece of a section is followed by its next: no section is left part-way
const wholes = list => { for (let i = 0; i + 1 < list.length; i++) { const a = list[i].buffer.name, b = list[i + 1].buffer.name; if (/[ab]0$/.test(a) && b !== a.slice(0, -1) + '1') return a + ' then ' + b; } return null; };
const T2 = now();
run(`state = 'play'; stage = STAGES[0]; enemies.length = 0; betweenWaves = 0; awaitingPortal = false;`);
await tick(14);
{
  const gr = named(played(T2), 'grid/');
  const fadeOut = A.src.filter(s => s.buffer && s.buffer.name.startsWith('title/') && s.t1 != null && s.t1 <= T2 + 1.6 && s.t1 >= T2);
  check('stage: title fades, grid starts with its locked intro, then calm', gr[0] && gr[0].buffer.name === 'grid/intro'
        && gr[1] && gr[1].buffer.name === 'grid/a0' && !gapless(gr) && fadeOut.length > 0,
        gr.map(s => s.buffer.name).join(' ') + ` · title stopped: ${fadeOut.length}`);
}
const T3 = now();
run(`for (let i = 0; i < 10; i++) enemies.push({ type: 'grunt', dead: false });`);
await tick(14);
{
  const gr = named(played(T3 - 6), 'grid/');
  const firstB = gr.find(s => s.buffer.name.startsWith('grid/b'));
  const prev = gr[gr.indexOf(firstB) - 1];
  check('fight: section a plays out to its last bar, then b', firstB && firstB.buffer.name === 'grid/b0' && !gapless(gr)
        && prev.buffer.name === 'grid/a1' && !wholes(named(played(T2), 'grid/')),
        firstB ? `b0 at +${(firstB.t0 - T3).toFixed(2)} s, after ${prev.buffer.name}${wholes(named(played(T2), 'grid/')) ? ' · left part-way: ' + wholes(named(played(T2), 'grid/')) : ''}` : 'no b');
}
const T4 = now();
run(`enemies.length = 0;`);
await tick(16);
{
  const gr = named(played(T4), 'grid/');
  const firstA = gr.find(s => s.buffer.name.startsWith('grid/a'));
  const all = named(played(T2), 'grid/'), before = firstA && all[all.indexOf(firstA) - 1];
  check('calm again: held 4 s, and b plays out to its last bar, then a', firstA && firstA.buffer.name === 'grid/a0' && firstA.t0 - T4 >= 4
        && before.buffer.name === 'grid/b1' && !wholes(all) && !gapless(named(played(T4 - 8), 'grid/')),
        firstA ? `a0 at +${(firstA.t0 - T4).toFixed(2)} s, after ${before.buffer.name}` : 'no a');
}

// 3. a boss: the sting, the cut, the track on the hit, its phases; then down
const T5 = now();
run(`enemies.push({ type: 'boss', boss: 'warden', phase: 0, dead: false });`);
await tick(10);
let boss;
{
  const st = named(played(T5), 'sting:boss-in')[0];
  const w = named(played(T5), 'warden/');
  // stopped 0.35 s (and the 0.05 s the fade's stop allows) after the sting, the fade itself starting with it
  const cut = st ? A.src.filter(s => s.buffer && s.buffer.name.startsWith('grid/') && s.t1 != null && Math.abs(s.t1 - (st.t0 + 0.4)) < 1e-6) : [];
  check('boss: sting, grid cut in 0.35 s, warden on the hit', st && w[0] && Math.abs(w[0].t0 + PRE - (st.t0 + 1.5)) < 1e-6
        && w[0].buffer.name === 'warden/p1a' && cut.length > 0,
        st ? `sting at +${(st.t0 - T5).toFixed(2)}, warden's bar line at +${w[0] ? (w[0].t0 + PRE - T5).toFixed(2) : '-'}, grid stopped: ${cut.length}` : 'no sting');
}
const T6 = now();
run(`enemies.find(e => e.boss === 'warden').phase = 1;`);
await tick(10);
run(`enemies.find(e => e.boss === 'warden').phase = 2;`);
await tick(10);
{
  const w = named(played(T5), 'warden/');
  const p2 = w.find(s => s.buffer.name === 'warden/p2'), p3 = w.find(s => s.buffer.name === 'warden/p3');
  check('boss phases: p2 then p3, each on a bar line', p2 && p3 && p2.t0 >= T6 && p3.t0 > p2.t0 && !gapless(w),
        w.map(s => s.buffer.name.slice(7)).join(' '));
}
const T7 = now();
run(`enemies.find(e => e.boss === 'warden').dead = true;`);
await tick(6);
{
  const st = named(played(T7), 'sting:boss-down')[0];
  const gr = named(played(T7), 'grid/');
  check('boss down: its sting, then the stage again', st && gr[0] && gr[0].t0 >= st.t0, st ? `grid back at +${gr[0] ? (gr[0].t0 - T7).toFixed(2) : '-'}` : 'no sting');
}

// 3b. the corrupted OTHER: the same boss on the floor, and its own song cut to when the virus has it
{
  const T = now();
  run(`enemies.length = 0; enemies.push({ type: 'boss', boss: 'theother', phase: 2, dead: false });`);
  await tick(6);
  const o = named(played(T), 'other/');
  const Tv = now();
  run(`enemies.find(e => e.boss === 'theother').virus = true;`);
  await tick(5);
  const c = named(played(Tv), 'corrupt/');
  const cut = A.src.filter(s => s.buffer && s.buffer.name.startsWith('other/') && s.t1 != null && s.t1 >= Tv && s.t1 <= Tv + 0.62);
  const stings = named(played(Tv), 'sting:').length;
  check('the corrupted OTHER: its own song, cut to, with no sting', o.length > 0 && c[0] && c[0].buffer.name === 'corrupt/intro'
        && c[1] && c[1].buffer.name === 'corrupt/v1' && cut.length > 0 && stings === 0 && run('Music.cur.id') === 'corrupt',
        `other: ${o.length} pieces, then ${c.map(s => s.buffer.name).join(' ')} · other stopped: ${cut.length} · stings: ${stings}`);
  run(`enemies.find(e => e.boss === 'theother').dead = true;`);
  await tick(6);
}

// 3c. THE SOUNDTRACK: a song picked plays through, by its own running order; the menu keeps it; a run lets it go
{
  run(`enemies.length = 0; state = 'menu'; inHub = false;`);
  await tick(3);
  const T = now();
  run(`state = 'ost'; Ost.cue = 'grid';`);
  await tick(50);
  const gr = named(played(T), 'grid/'), order = gr.map(s => s.buffer.name.slice(5)).join(' ');
  const Tb = now();
  run(`Ost.cue = 'warden';`);
  await tick(5);
  const w = named(played(Tb), 'warden/'), stings = named(played(T), 'sting:').length;
  run(`state = 'menu';`);
  await tick(2);
  const held = run('Music.cur && Music.cur.id');
  run(`state = 'play'; stage = STAGES[0]; enemies.length = 0; betweenWaves = 0; awaitingPortal = false;`);
  await tick(4);
  check('the soundtrack: a song plays through its own order, with no sting; the menu keeps it, a run lets it go',
        order.startsWith('intro a0 a1 b0 b1 a0 a1') && !gapless(gr) && w.length > 0 && stings === 0 && held === 'warden'
        && run('Ost.cue') === null && run('Music.cur && Music.cur.id') === 'grid',
        `${order} · then warden: ${w.length} pieces, stings ${stings} · over the menu: ${held} · in the run: ${run('Music.cur && Music.cur.id')}`);
  // what keeps a song: the record, not the hearing of it
  const open = cue => run(`ostOpen(OST_TRACKS.find(t => t[0] === '${cue}'))`);
  run(`Save.profile.bestWave = 6; Save.profile.amalgamDone = false; Save.profile.otherKills = 0; Tales.n = {}; Tales.p = {};`);
  const a = ['grid', 'warden', 'foundry', 'forgeheart', 'amalgam', 'mirror', 'corrupt', 'leak'].map(open).join();
  run(`Tales.n['k:forgeheart'] = 1; Save.profile.otherKills = 1; Tales.p['b:theother'] = 4; Tales.n['c:s:leak'] = 1;`);   // and THE LEAK's defences down: no boss waits there
  const b = ['foundry', 'forgeheart', 'mirror', 'other', 'corrupt', 'archive', 'leak', 'halt', 'breakin', 'root'].map(open).join();
  run(`Tales.n['c:s:recursion'] = 1; Tales.n['c:s:halt'] = 1;`);
  const whole = open('breakin');                                    // the three as one piece: kept when all three are
  run(`Save.profile.rootDone = true;`);
  const under = open('root');                                       // and what is under them, by the profile's own record of it
  run(`Save.profile.rootDone = false;`);
  check('the soundtrack: a song is kept by passing its sector or putting its boss down',
        a === 'true,true,false,false,false,false,false,false' && b === 'true,true,true,true,true,false,true,false,false,false' && whole === true && under === true, `past wave 5: ${a} · and then: ${b} · the three as one: ${whole} · ROOT: ${under}`);
}

// 3d. ALL HALLOWS: an area has its own track; its two calm sections take turns, and so do its two fights;
//     its songs are listed once the chapter has opened, and kept with its boss
{
  const T = now();
  run(`state = 'play'; hlArea = { id: 'house' }; enemies.length = 0; betweenWaves = 0; awaitingPortal = false;`);
  await tick(22);
  const calm = named(played(T), 'house/').map(s => s.buffer.name.slice(6)).join(' ');
  const Tf = now();
  run(`for (let i = 0; i < 10; i++) enemies.push({ type: 'sheet', dead: false });`);
  await tick(22);
  const fight = named(played(Tf + 4), 'house/').map(s => s.buffer.name.slice(6)).join(' ');
  run(`enemies.length = 0; hlArea = null;`);
  await tick(8);
  check('all hallows: an area plays its own track, and its two calm sections and its two fights take turns',
        calm.startsWith('a a2 a a2') && /b c b c/.test(fight) && !gapless(named(played(T), 'house/')) && run('Music.cur && Music.cur.id') === 'grid',
        `calm: ${calm} · fight: ${fight} · afterwards: ${run('Music.cur && Music.cur.id')}`);
  const row = cue => run(`(t => ostListed(t) + '/' + ostOpen(t))(OST_TRACKS.find(t => t[0] === '${cue}'))`);
  run(`HL.force = false; HL.day = null; Tales.n = {}; Tales.p = {}; Save.profile.hl = {};`);
  const shut = ['house', 'deadgame', 'grid'].map(row).join(' ');
  run(`HL.force = true;`);
  const open = ['house', 'deadgame'].map(row).join(' ');
  run(`HL.force = false; Tales.n['k:deadgame'] = 1;`);
  const kept = ['house', 'deadgame'].map(row).join(' ');
  run(`Tales.n = {}; Save.profile.hl = { [HL_EVENT.id]: { q: { q4: 2 } } };`);
  const quest = ['house', 'deadgame'].map(row).join(' ');
  run(`Save.profile.hl = {};`);
  check('all hallows: its songs are listed once the chapter is open, and kept (and listed for good) with its boss',
        shut.startsWith('false/false false/false true/') && open === 'true/false true/false' && kept === 'true/true true/true' && quest === 'true/true true/true',
        `shut: ${shut} · open: ${open} · boss down: ${kept} · by the quest: ${quest}`);
}

// 4. the synth bed is the fallback, and only that
{
  const o0 = A.osc;
  run(`for (let i = 0; i < 40; i++) Audio_.update(0.6);`);
  const withTrack = A.osc - o0;
  run(`stage = STAGES[1];`);                               // THE FOUNDRY: no track in the fixture
  await tick(2);
  const o1 = A.osc;
  run(`Audio_.nextStep = 0; for (let i = 0; i < 40; i++) Audio_.update(0.6);`);
  const without = A.osc - o1;
  check('synth bed: silent under a track, plays where there is none', withTrack === 0 && without > 0 && !run('Music.cur'),
        `oscillators with a track ${withTrack}, without ${without}`);
  run(`stage = STAGES[0];`);
  await tick(3);
}

// 5. a segment late from the decoder: the last phrase again, no gap
{
  run(`Music.dec.clear(); Music.busy.clear();`);
  A.slow.add('grid/a1');
  const T8 = now();
  await tick(24);
  const gr = named(played(T8 - 6), 'grid/');
  const reps = gr.filter((s, i) => i && s.buffer.name === gr[i - 1].buffer.name && s.buffer.name === 'grid/a0').length;
  A.slow.delete('grid/a1');
  for (const r of A.held.splice(0)) r();
  await tick(12);
  const after = named(played(T8), 'grid/');
  check('late decode: a0 again in a1\'s place, then a1 once it is here', reps >= 1 && after.some(s => s.buffer.name === 'grid/a1') && !gapless(after.filter(s => s.t0 > T8)),
        `a0 repeated ${reps}× · ${after.map(s => s.buffer.name.slice(5)).join(' ')}`);
}

// 6. a tab back from the background: the bus goes quiet while hidden, and the queue picks up from now
{
  g.win.document.hidden = true;
  await tick(0.2);
  const quiet = run('Music.bus.gain.target');
  const n0 = A.src.length;
  A.ctx.currentTime += 40;                                  // forty seconds with no frames
  g.win.document.hidden = false;
  await tick(0.2);
  const fresh = A.src.slice(n0).filter(s => s.buffer && s.buffer.name);
  const past = fresh.filter(s => s.t0 < s.at - 1e-6);
  check('background tab: quiet while hidden, then from now (no backlog)', quiet === 0 && fresh.length <= 2 && past.length === 0,
        `bus ${quiet} while hidden · ${fresh.length} started on return, ${past.length} in the past`);
}

// 7. pause ducks the run, the same track holding
{
  const id = run('Music.cur.id');
  run(`state = 'pause';`);
  await tick(0.5);
  const lvl = run('Music.bus.gain.target'), lpf = run('Music.lp.frequency.target'), held = run('Music.cur.id');
  run(`state = 'play';`);
  await tick(0.5);
  check('pause: ducked and dulled, the track held', Math.abs(lvl - run('MUSIC_LEVEL') * 0.55) < 1e-9 && lpf === 900 && held === id && run('Music.lp.frequency.target') === 20000,
        `level ${lvl}, low-pass ${lpf}, ${held}`);
}

// 8. MUSIC at 0: no track, no bed, nothing fetched
{
  const f0 = Object.values(A.fetched).reduce((a, b) => a + b, 0);
  run(`Audio_.setMix('music', 0);`);
  await tick(3);
  const o0 = A.osc;
  run(`Audio_.nextStep = 0; for (let i = 0; i < 40; i++) Audio_.update(0.6);`);
  const f1 = Object.values(A.fetched).reduce((a, b) => a + b, 0);
  check('MUSIC at 0: the track stops, the bed stays quiet', !run('Music.cur') && A.osc === o0 && f1 - f0 <= 1,
        `cur ${run('Music.cur && Music.cur.id')}, oscillators ${A.osc - o0}, fetches ${f1 - f0}`);
  run(`Audio_.setMix('music', 1);`);
  await tick(2);
}

// 9. a track that ends rings out and stays ended
{
  const T9 = now();
  run(`codexFrom = 'menu'; state = 'codex';`);
  await tick(12);
  const c = named(played(T9), 'codex/');
  check('an ending track: plays once, rings out, does not restart', c.length === 1 && c[0].t1 == null,
        `${c.length} plays, stopped: ${c[0] && c[0].t1}`);
  run(`state = 'play';`);
  await tick(2);
}

// 10. memory: a long stretch of mood changes never holds more than MUSIC_DECODED decoded
{
  let most = 0;
  for (let k = 0; k < 12; k++) {
    run(k % 2 ? `enemies.length = 0;` : `for (let i = 0; i < 10; i++) enemies.push({ type: 'grunt', dead: false });`);
    for (let j = 0; j < 20; j++) { await tick(0.5); most = Math.max(most, run('Music.dec.size')); }
  }
  const cap = run('MUSIC_DECODED');
  check('memory: decoded segments stay at or under the cap', most <= cap && run('Music.size') <= run('MUSIC_BYTES'),
        `at most ${most} decoded (cap ${cap}), ${run('Music.size')} bytes kept`);
}

// 11. recorded effects
{
  run(`enemies.length = 0;`);
  const n0 = A.src.length, o0 = A.osc;
  for (let i = 0; i < 30; i++) { A.ctx.currentTime += 0.06; run('Audio_.shoot()'); }
  const shots = A.src.slice(n0).filter(s => s.buffer && s.buffer.name && s.buffer.name.startsWith('sfx:shoot'));
  const twice = shots.filter((s, i) => i && s.buffer.name === shots[i - 1].buffer.name).length;
  const rates = shots.map(s => s.playbackRate.value);
  const inPitch = rates.every(r => r >= 0.95 - 1e-9 && r <= 1.05 + 1e-9);
  const vol = shots[0] && shots[0].to[0].gain.value;
  const shotOsc = A.osc - o0;                               // a recorded shot makes no synth
  const n1 = A.src.length, o1 = A.osc;
  A.ctx.currentTime += 0.1; run('Audio_.hit()'); A.ctx.currentTime += 0.1; run('Audio_.crit()');
  const synth = A.src.slice(n1).filter(s => !s.buffer || !s.buffer.name).length + (A.osc - o1);
  run(`Audio_.setMix('sfx', 0);`);
  const n2 = A.src.length, o2 = A.osc;
  A.ctx.currentTime += 0.1; run('Audio_.shoot(); Audio_.hit(); Audio_.dash(); Audio_.hurt()');
  const silent = A.src.length === n2 && A.osc === o2;
  run(`Audio_.setMix('sfx', 1);`);
  check('effects: a take at random, never the same twice, nudged in pitch', shots.length === 30 && twice === 0 && inPitch && Math.abs(vol - 0.8) < 1e-9 && shotOsc === 0,
        `${shots.length} shots, repeats ${twice}, rates ${Math.min(...rates).toFixed(3)}..${Math.max(...rates).toFixed(3)}, vol ${vol}`);
  check('effects: no recording keeps the synth; EFFECTS at 0 is silence', synth > 0 && silent, `synth nodes ${synth}, silent ${silent}`);
}

// 12. a site with no music/ at all: nothing breaks, the bed plays
{
  SERVE = false;
  const g2 = load(true);
  g2.run(`pageDead = true; Save.profile.gfxSeen = GFX_VER; Audio_.init(); state = 'play';`);
  await flush();
  for (let i = 0; i < 40; i++) { A.ctx.currentTime += 0.05; g2.run('Music.tick(0.05)'); await flush(); }
  const o0 = A.osc;
  g2.run(`for (let i = 0; i < 40; i++) Audio_.update(0.6);`);
  check('no music/ on the site: no track, the bed as before', g2.run('Music.man') === false && !g2.run('Music.cur') && A.osc > o0 && g2.run('Sfx.man') === false,
        `manifest ${g2.run('Music.man')}, oscillators ${A.osc - o0}`);
  SERVE = true;
}

// 13. the run never notices: the same seed, with and without the score running
{
  const RUNCODE = steps => `(() => {
    pageDead = true; Save.profile.gfxSeen = GFX_VER;
    applyChar(0); runSeedNext = 4242; runViewNext = { w: 1280, h: 720 }; resetGame(); state = 'play';
    P.maxHp = P.hp = 60000;
    inputSource = rec => { rec.mx = Math.sign(Math.sin(simTick / 50)); rec.my = Math.sign(Math.cos(simTick / 70)); rec.ax = P.x + 100; rec.ay = P.y; rec.trig = true; rec.lmb = true; rec.press = []; };
    return 0;
  })()`;
  const step = 'if (state === "levelup") { uiArm = 0; handleKey("1"); } else if (state !== "play" && state !== "dead") state = "play"; update(1 / 60);';
  const print = 'JSON.stringify([simRngState, simTick, wave, Math.round(P.x * 1e6), Math.round(P.y * 1e6), P.hp, P.level, enemies.length, score])';
  const a = load(false);
  a.run(RUNCODE());
  for (let i = 0; i < 1800; i++) a.run(step);
  const b = load(true);
  b.run(`Audio_.init();`);
  b.run(RUNCODE());
  const nb = A.src.length;
  for (let i = 0; i < 1800; i++) {
    b.run(step);
    A.ctx.currentTime += 1 / 60;
    b.run('Music.tick(1 / 60)');
    if (i % 6 === 0) await flush();
  }
  const pa = a.run(print), pb = b.run(print);
  const heard = A.src.slice(nb).filter(s => s.buffer && s.buffer.name).length;
  check('the run never notices: same seed, same game, score or no score', pa === pb && heard > 0,
        pa === pb ? `30 s, ${heard} segments and effects played alongside` : `parted: ${pa} vs ${pb}`);
}

/* --------------------------------- report --------------------------------- */
for (const [name, ok, detail] of results) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? '   · ' + detail : ''}`);
console.log(`\n${results.length - fails} passed, ${fails} failed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
