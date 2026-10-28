#!/usr/bin/env node
/* ===========================================================================
   THE ENDING, IN THE GAME — the test: `npm run test:ending` (index.html,
   THE ENDING; src/film.js and pvp/src/challenge.js are test:pvp's)
   The game, booted in Node with /api/live and /api/film answered here:
     secrecy     nothing asks for the movie before /api/live says burn
     once        told burn, the game fetches it, runs it, and it takes the
                 screen: shot by shot, what its voice says shown as it is
                 said, then it ends and is noted, and never again for that
                 moment in this browser (another moment plays again)
     co-op       a run in step with another machine waits for its end
     a run       stopped under it, and the game goes on after it
     failing     a movie that will not load, or one that throws, ends
                 quietly: the game goes on
     dev         ?ending=dev on localhost plays /api/film at once, every load
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const flush = () => new Promise(r => setTimeout(r, 20));

// a stand-in movie: two shots of a second, one line; what it is asked to draw is kept
const FILM = `VR.film({ length: 2,
  shots: [{ id: 'a', at: 0, d: 1, name: 'A' }, { id: 'b', at: 1, d: 1, name: 'B' }],
  lines: [{ at: 0.2, d: 1, text: 'SOMETHING SAID' }],
  draw(t, s) { (globalThis.__drawn = globalThis.__drawn || []).push([s.shot.id, +s.k.toFixed(2)]); if (globalThis.__throw) throw new Error('drawn wrong'); } });`;

function boot(store = [], opts = {}) {
  return loadGame(IDX, Object.assign({
    before: win => {
      for (const [k, v] of store) win.localStorage.setItem(k, v);
      win.__live = { live: null, every: 900, above: false };
      win.__asked = []; win.__film = FILM; win.__filmStatus = 200;
      const was = win.fetch;
      win.fetch = (u, o) => {
        const url = String(u);
        if (url === '/api/live') return Promise.resolve(new Response(JSON.stringify(win.__live), { status: 200 }));
        if (url === '/api/film') {
          win.__asked.push(url);
          return Promise.resolve(new Response(win.__film, { status: win.__filmStatus }));
        }
        return was(u, o);
      };
    }
  }, opts));
}
const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'END'; state = 'menu'; tutSet('off');`;
async function answer(g, body) {
  g.win.__live = body;
  g.run('Live.next = 0; Live.tick()');
  await flush();
  g.run('Ending.tick()');
  await flush();
  g.run('Ending.tick()');
}
// the movie's frames, as the game's frame would run them while it has the screen
const play = (g, s) => { for (let i = 0; i < Math.round(s * 60) && g.run('Ending.on'); i++) g.run('Ending.frame(1 / 60)'); };
const store = g => { const s = []; for (let i = 0; i < g.win.localStorage.length; i++) { const k = g.win.localStorage.key(i); s.push([k, g.win.localStorage.getItem(k)]); } return s; };

section('secrecy: nothing asks for it before the game is told');
const g = boot();
g.run(SETUP);
{
  await answer(g, { live: null, every: 900, above: true });
  ok(g.win.__asked.length === 0 && !g.run('Ending.on') && g.run('Ending.state') === 'none', 'hunted, on air, anything: no movie asked for', g.win.__asked);
}

section('once: told, it fetches it and it takes the screen');
{
  await answer(g, { live: null, every: 900, above: false, burn: 1234 });
  ok(g.win.__asked.join() === '/api/film' && g.run('Ending.on') === true, 'told burn: fetched once, and on', [g.win.__asked, g.run('Ending.state')]);
  g.run(`globalThis.__said = []; const was = ctx.fillText; ctx.fillText = function (t) { __said.push(String(t)); return was.apply(this, arguments); }`);
  play(g, 0.5);
  ok(g.run('JSON.stringify(__said)').includes('SOMETHING SAID'), 'what its voice says, shown as it is said');
  play(g, 0.9);
  const drawn = g.run('JSON.stringify(__drawn)');
  ok(/"a",0/.test(drawn) && /"a",0\.\d/.test(drawn) && /"b",0/.test(drawn), 'shot by shot, each told how far through it is', drawn.slice(0, 200));
  play(g, 2);
  ok(!g.run('Ending.on') && g.run('Ending.state') === 'seen' && g.run('localStorage.getItem(ENDING_SEEN)') === '1234', 'then it ends, and is noted for that moment');
  ok(g.run('state') === 'menu', 'and the game is where it was');
  await answer(g, { live: null, every: 900, above: false, burn: 1234 });
  ok(g.win.__asked.length === 1 && !g.run('Ending.on'), 'told again: nothing more');
  const g2 = boot(store(g));
  g2.run(SETUP);
  await answer(g2, { live: null, every: 900, above: false, burn: 1234 });
  ok(g2.win.__asked.length === 0 && !g2.run('Ending.on'), 'nor on the next load in this browser');
  await answer(g2, { live: null, every: 900, above: false, burn: 5678 });
  ok(g2.win.__asked.length === 1 && g2.run('Ending.on'), 'another moment plays again');
}

section('co-op: a run in step with another machine waits for its end');
{
  const g3 = boot();
  g3.run(SETUP + ' LS.on = true; MP.on = true;');
  await answer(g3, { live: null, every: 900, above: false, burn: 42 });
  ok(g3.run('Ending.state') === 'ready' && !g3.run('Ending.on'), 'ready, and waiting');
  g3.run('LS.on = false; MP.on = false; Ending.tick()');
  ok(g3.run('Ending.on'), 'the run over: it plays');
}

section('a run: stopped under it, and on after it');
{
  const g4 = boot();
  g4.run(SETUP + ' resetGame(); state = "play";');
  for (let i = 0; i < 30; i++) g4.run('update(1 / 60)');
  await answer(g4, { live: null, every: 900, above: false, burn: 77 });
  ok(g4.run('Ending.on') && g4.run('state') === 'play', 'it cuts into the run');
  const at = g4.run('JSON.stringify([P.x, P.y, wave, enemies.length])');
  play(g4, 3);
  ok(!g4.run('Ending.on') && g4.run('state') === 'play' && g4.run('JSON.stringify([P.x, P.y, wave, enemies.length])') === at,
     'nothing of the run moved under it, and it goes on after', at);
}

section('failing: quietly, and the game goes on');
{
  const g5 = boot();
  g5.run(SETUP);
  g5.win.__filmStatus = 404;
  g5.run('console.error = () => {}');
  await answer(g5, { live: null, every: 900, above: false, burn: 9 });
  ok(g5.run('Ending.state') === 'failed' && !g5.run('Ending.on'), 'a movie that will not load: nothing');
  const g6 = boot();
  g6.run(SETUP + ' console.error = () => {}; globalThis.__throw = true;');
  await answer(g6, { live: null, every: 900, above: false, burn: 10 });
  play(g6, 0.2);
  ok(!g6.run('Ending.on') && g6.run('state') === 'menu', 'one that throws: ended there');
  g6.win.__film = 'VR.film({ length: 0 })';
  g6.run('Ending.burn = 0');
  await answer(g6, { live: null, every: 900, above: false, burn: 11 });
  ok(g6.run('Ending.state') === 'failed', 'and one that is not a movie at all');
}

section('dev: ?ending=dev on localhost plays /api/film at once, every load');
{
  const g7 = boot([], { search: '?ending=dev' });
  g7.run(SETUP);
  await flush();
  g7.run('Ending.tick()');
  ok(g7.win.__asked.join() === '/api/film' && g7.run('Ending.on') && g7.run('Ending.burn') === -1, 'fetched and on', g7.win.__asked);
  play(g7, 3);
  ok(!g7.run('Ending.on') && g7.run('localStorage.getItem(ENDING_SEEN)') === null, 'and nothing noted: it plays every time');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\n${passes} passed, 0 failed`);
process.exit(fails ? 1 : 0);
