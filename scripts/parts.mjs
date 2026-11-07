#!/usr/bin/env node
/* ===========================================================================
   THE PARTS, IN THE GAME — the test: `npm run test:parts` (index.html, THE
   PARTS; src/parts.js and pvp/src/challenge.js are test:pvp's)
   The game, booted in Node with /api/parts answered here:
     secrecy     nothing asks for the place unless the account reply says one
                 waits for the account signed in
     menu        it does: at the menu the game fetches it, runs it, and it
                 takes the screen, told the frame, the pointer and the size
     played      the pointer, the keys and one finger are its own while it
                 is on: Escape ends it, and it waits for the next load
     used        use() notes it (POST /api/parts { use }), then end(): never
                 again; a use that fails says so, and the next press asks
                 again
     after       the movie for the win over (THE ENDING, after('won')): it
                 starts at once, over a run too, which stands still under it
     co-op       a run in step with another machine waits for its end
     failing     a place that will not load, or one that throws: quietly
     dev         ?parts=dev on localhost plays it at once, every load, and
                 only pretends the use
   ========================================================================= */
import fs from 'node:fs';
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

// a stand-in place: what it is handed and pressed is kept; it uses them when told to, and ends once that is done
const SCENE = `VR.scene({
  draw(t, s) {
    const g = globalThis;
    (g.__drawn = g.__drawn || []).push(+t.toFixed(3)); g.__s = s;
    if (g.__throw) throw new Error('drawn wrong');
    if (g.__useAt != null && t >= g.__useAt && !s.used) s.use('light');
    if (s.used === 'done' && g.__endOnDone) s.end();
  },
  press(e) { (globalThis.__pressed = globalThis.__pressed || []).push(e.type + (e.key ? ':' + e.key : '') + (e.x != null ? '@' + Math.round(e.x) + ',' + Math.round(e.y) + (e.touch ? 't' : '') : '')); }
});`;

function boot(opts = {}) {
  return loadGame(IDX, Object.assign({
    before: win => {
      win.__asked = []; win.__posted = [];
      win.__scene = SCENE; win.__sceneStatus = 200; win.__postStatus = 200;
      win.__live = { live: null, every: 900, above: false };
      const was = win.fetch;
      win.fetch = (u, o) => {
        const url = String(u);
        if (url === '/api/live') return Promise.resolve(new Response(JSON.stringify(win.__live), { status: 200 }));
        if (url === '/api/film') return Promise.resolve(new Response('VR.film({ length: 1, shots: [], lines: [], draw() {} });', { status: 200 }));
        if (url === '/api/parts') {
          if (o && o.method === 'POST') {
            win.__posted.push({ body: o.body, type: o.headers && o.headers['content-type'] });
            if (win.__postStatus === 0) return Promise.reject(new Error('offline'));
            return Promise.resolve(new Response(JSON.stringify({ used: { use: 'light', at: 1 } }), { status: win.__postStatus }));
          }
          win.__asked.push(url);
          return Promise.resolve(new Response(win.__scene, { status: win.__sceneStatus }));
        }
        return was(u, o);
      };
    }
  }, opts));
}
const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'PARTS'; state = 'menu'; tutSet('off');`;
const SIGNED = ` Account.me = { name: 'msr', display: 'MSR' }; Account.status = '';`;
// the frame's own calls, as the game's frame makes them: the tick, then its frames while it has the screen
async function tick(g) { g.run('Parts.tick()'); await flush(); g.run('Parts.tick()'); }
const play = (g, s) => { for (let i = 0; i < Math.round(s * 60) && g.run('Parts.on'); i++) g.run('Parts.frame(1 / 60)'); };

section('secrecy: nothing asks for it unless the account reply says one waits');
{
  const g = boot();
  g.run(SETUP);
  await tick(g);
  ok(g.win.__asked.length === 0 && !g.run('Parts.on'), 'signed out: nothing asked for');
  g.run(SIGNED + ' Account.parts = false;');
  await tick(g);
  ok(g.win.__asked.length === 0 && !g.run('Parts.on'), 'signed in, nothing waiting: nothing');
  g.run('Account.parts = true; Account.me = null;');
  await tick(g);
  ok(g.win.__asked.length === 0, 'a stale flag with nobody signed in: nothing');
}

section('menu: it waits, so at the menu it is fetched and takes the screen');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true; state = "play";');
  await tick(g);
  ok(g.win.__asked.length === 0, 'mid-run: not yet (only straight after the movie does it cut into a run)');
  g.run('state = "menu"; AcctUI.on = true;');
  await tick(g);
  ok(g.win.__asked.length === 0, 'the account panel open: not yet');
  g.run('AcctUI.on = false;');
  await tick(g);
  ok(g.win.__asked.join() === '/api/parts' && g.run('Parts.on') === true, 'at rest at the menu: fetched once, and on', [g.win.__asked, g.run('Parts.state')]);
  play(g, 0.5);
  const s = g.run('JSON.stringify({ W: __s.W, H: __s.H, has: [typeof __s.use, typeof __s.end, typeof __s.ctx], p: Object.keys(__s.pointer).sort() })');
  ok(/"W":1280,"H":720/.test(s) && /"function","function","object"/.test(s) && /"down","seen","touch","x","y"/.test(s), 'told the screen, the pointer, use() and end()', s);
  ok(g.run('__drawn.length') >= 29 && g.run('__drawn[__drawn.length - 1]') > 0.45, 'and drawn frame by frame, on its own clock', g.run('__drawn.length'));
  ok(g.run('Parts.used') === null && g.run('__s.used') === null, 'nothing used yet');
}

section('played: the pointer, the keys and a finger are its own');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true;');
  await tick(g);
  play(g, 0.1);
  g.run("Parts.press('down', 100, 200); Parts.press('move', 120, 210); Parts.press('up', 130, 220); Parts.key({ key: 'Enter' }); Parts.key({ key: ' ', repeat: true });");
  g.run("Parts.touch('down', [{ identifier: 4, clientX: 300, clientY: 310 }]); Parts.touch('down', [{ identifier: 5, clientX: 9, clientY: 9 }]); Parts.touch('move', [{ identifier: 5, clientX: 1, clientY: 1 }, { identifier: 4, clientX: 320, clientY: 330 }]); Parts.touch('up', [{ identifier: 4, clientX: 320, clientY: 330 }]);");
  const pr = g.run('JSON.stringify(__pressed)');
  ok(pr === JSON.stringify(['down@100,200', 'move@120,210', 'up@130,220', 'key:Enter', 'down@300,310t', 'move@320,330t', 'up@320,330t']),
     'presses, moves and lets go, a key (not its repeats), and one finger only', pr);
  ok(g.run('Parts.pointer.x') === 320 && g.run('Parts.pointer.down') === false && g.run('Parts.pointer.touch') === true, 'the pointer kept for it');
  const src = fs.readFileSync(IDX, 'utf8');
  ok(/if \(Parts\.on\) \{ e\.preventDefault\(\); Parts\.key\(e\); return; \}/.test(src) && /if \(Parts\.on\) \{ Parts\.press\('move'/.test(src) &&
     /if \(Parts\.on\) \{ Audio_\.init\(\); Audio_\.resume\(\); if \(e\.button === 0\) Parts\.press\('down'/.test(src) &&
     /if \(Parts\.on && e && e\.button === 0\) Parts\.press\('up'/.test(src) && /if \(Parts\.on\) \{ Parts\.touch\('down'/.test(src) &&
     /if \(Parts\.on\) \{ Parts\.touch\('move'/.test(src) && /if \(Parts\.on\) \{ Parts\.touch\('up'/.test(src),
     'and the game\'s own handlers hand them over, and keep them from the game under it');
  ok(/if \(Parts\.on\) \{ last = now; Parts\.frame\(dt\); requestAnimationFrame\(frame\); return; \}/.test(src), 'the frame is its own while it is on');
  g.run("Parts.key({ key: 'Escape' })");
  ok(!g.run('Parts.on') && g.run('Parts.state') === 'left' && g.win.__posted.length === 0, 'Escape: it ends, nothing used');
  await tick(g);
  ok(!g.run('Parts.on') && g.win.__asked.length === 1, 'and it waits for the next load');
  ok(g.run('Account.parts') === true, 'the account still has them to take there');
}

section('used: noted once, then it is over for good');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true; globalThis.__useAt = 0.3; globalThis.__endOnDone = true;');
  await tick(g);
  play(g, 0.4);
  await flush();
  ok(g.win.__posted.length === 1 && JSON.parse(g.win.__posted[0].body).use === 'light' && g.win.__posted[0].type === 'application/json',
     'use(): POST /api/parts with the word, as JSON', g.win.__posted);
  play(g, 0.1);
  ok(!g.run('Parts.on') && g.run('Parts.state') === 'done' && g.run('Account.parts') === false, 'done: it ended, and the account has nothing waiting now');
  g.run('Parts.state = "none"; Account.parts = true;');   // (even told again, this page asks nothing more once it is used: a stale reply)
  g.run('Parts.state = "done";');
  await tick(g);
  ok(g.win.__asked.length === 1, 'never fetched again this load');
  // a use that fails: said so, and the next press asks again
  const f = boot();
  f.run(SETUP + SIGNED + ' Account.parts = true; globalThis.__useAt = 0.2; globalThis.__endOnDone = true;');
  f.win.__postStatus = 0;
  await tick(f);
  play(f, 0.3);
  await flush();
  f.run(`globalThis.__said = []; const was = ctx.fillText; ctx.fillText = function (t) { __said.push(String(t)); return was.apply(this, arguments); }`);
  play(f, 0.1);
  ok(f.run('Parts.used') === 'failed' && f.run('Parts.on') && /CAN'T REACH THE SERVER/.test(f.run('JSON.stringify(__said)')), 'no answer: failed, still up, and it says so',
     [f.run('Parts.used'), f.run('JSON.stringify(__said)').slice(0, 200)]);
  f.win.__postStatus = 200;
  f.run("Parts.press('down', 5, 5)");
  await flush();
  ok(f.win.__posted.length === 2 && f.run('Parts.used') === 'done' && f.run('typeof __pressed') === 'undefined', 'the next press asks again, and is not the place\'s own', f.run('Parts.used'));
  play(f, 0.1);
  ok(!f.run('Parts.on') && f.run('Parts.state') === 'done', 'and then it is over');
  // a 404: nothing more to note (used elsewhere, or no longer this account's)
  const n = boot();
  n.run(SETUP + SIGNED + ' Account.parts = true; globalThis.__useAt = 0.1; globalThis.__endOnDone = true;');
  n.win.__postStatus = 404;
  await tick(n);
  play(n, 0.2); await flush(); play(n, 0.1);
  ok(n.run('Parts.state') === 'done' && n.run('Account.parts') === false, 'a 404 to the use: nothing more to note, done');
  n.run("void Parts.use('light')");
  await flush();
  ok(n.win.__posted.length === 1, 'and nothing asked once it is over');
}

section('after: the movie for the win over, straight there, over a run too');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true; resetGame(); state = "play";');
  for (let i = 0; i < 30; i++) g.run('update(1 / 60)');
  const at = g.run('JSON.stringify([P.x, P.y, wave, enemies.length])');
  g.run("Ending.way = 'won'; Ending.state = 'seen'; Ending.after('won');");
  await tick(g);
  ok(g.run('Parts.on') && g.run('state') === 'play', 'it cuts into the run, as the movie did');
  play(g, 0.5);
  g.run("Parts.key({ key: 'Escape' })");
  ok(!g.run('Parts.on') && g.run('state') === 'play' && g.run('JSON.stringify([P.x, P.y, wave, enemies.length])') === at, 'nothing of the run moved under it, and it goes on after', at);
  const o = boot();
  o.run(SETUP + SIGNED + ' Account.parts = false;');
  o.run("Ending.after('won');");
  await tick(o);
  ok(!o.run('Parts.on') && o.win.__asked.length === 0, 'an account nothing waits for: the movie is all there is');
  const l = boot();
  l.run(SETUP + SIGNED + ' Account.parts = true; state = "play";');
  l.run("Ending.after('lost');");
  await tick(l);
  ok(!l.run('Parts.on') && l.win.__asked.length === 0, 'and a lost one never goes there');
  const m = boot();
  m.run(SETUP + SIGNED + " Account.parts = true; Ending.state = 'ready';");
  await tick(m);
  ok(m.win.__asked.length === 0, 'a movie about to play: it goes first');
}

section('co-op: a run in step with another machine waits for its end');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true; LS.on = true; MP.on = true;');
  await tick(g);
  ok(!g.run('Parts.on') && g.win.__asked.length === 0, 'waiting');
  g.run('LS.on = false; MP.on = false;');
  await tick(g);
  ok(g.run('Parts.on'), 'the run over: it plays');
}

section('failing: quietly, and the game goes on');
{
  const g = boot();
  g.run(SETUP + SIGNED + ' Account.parts = true; globalThis.__err = 0; console.error = () => { __err++; };');
  g.win.__sceneStatus = 404;
  await tick(g);
  ok(g.run('Parts.state') === 'failed' && !g.run('Parts.on') && g.run('__err') === 0, 'a 404: nothing, and nothing said');
  const t = boot();
  t.run(SETUP + SIGNED + ' Account.parts = true; console.error = () => {}; globalThis.__throw = true;');
  await tick(t);
  play(t, 0.2);
  ok(!t.run('Parts.on') && t.run('state') === 'menu' && t.run('Parts.state') === 'left', 'one that throws: ended there');
  const b = boot();
  b.run(SETUP + SIGNED + ' Account.parts = true; console.error = () => {};');
  b.win.__scene = 'VR.film({ length: 2, draw() {} })';
  await tick(b);
  ok(b.run('Parts.state') === 'failed' && !b.run('Parts.on'), 'and one that is not a place at all');
  const p = boot();
  p.run(SETUP + SIGNED + ' Account.parts = true; console.error = () => {}; globalThis.__pthrow = true;');
  p.win.__scene = 'VR.scene({ draw() {}, press() { throw new Error("pressed wrong"); } })';
  await tick(p);
  p.run("Parts.press('down', 1, 1)");
  ok(!p.run('Parts.on'), 'a press that throws: ended there too');
}

section('dev: ?parts=dev on localhost plays it at once, every load, and only pretends the use');
{
  const g = boot({ search: '?parts=dev' });
  g.run(SETUP + ' state = "play"; globalThis.__useAt = 0.1; globalThis.__endOnDone = true; console.info = () => {};');
  await tick(g);
  ok(g.win.__asked.join() === '/api/parts' && g.run('Parts.on'), 'fetched and on, signed out and mid-run', g.win.__asked);
  play(g, 0.3);
  await flush();
  ok(!g.run('Parts.on') && g.win.__posted.length === 0, 'used: ended, and nothing sent');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\n${passes} passed, 0 failed`);
process.exit(fails ? 1 : 0);
