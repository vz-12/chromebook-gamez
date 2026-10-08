#!/usr/bin/env node
/* ===========================================================================
   ON AIR, IN THE GAME — the test: `npm run test:live` (live spectating,
   step 3; index.html, ON AIR)

   The game, booted in Node with the Worker's public GET /api/live answered
   by the test, playing every part of a challenge going on air:

     asking      once at the start, then as often as the answer says, never
                 more often than every half minute, and not at all on PvP's
                 own page
     the menu    the card over it, with the announcement and both names;
                 once per broadcast per browser; NOT NOW and Escape put it
                 away; WATCH LIVE opens PvP's watch page in a tab of its own
     the strip   across the foot of the menu while it is on, drawn; a click
                 on it watches, and never starts a run
     a run       one line low on the screen when it goes on, and no pause;
                 the card waits for the menu
     off air     card, strip and line all gone
   ========================================================================= */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';
import { PVP_SCRIPTS } from './pvp-build.mjs';

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

/* Enough DOM for the card: an element finds what its innerHTML would have
   held, one stand-in per selector, and keeps the handlers it is given, so
   the test can press its buttons and keys. */
function dom(win) {
  const make = win.document.createElement;
  const node = () => ({ textContent: '', hidden: false, on: {}, addEventListener(t, f) { (this.on[t] = this.on[t] || []).push(f); },
                        focus() { win.__focus = this; }, classList: { toggle() {}, add() {}, remove() {} } });
  win.document.createElement = tag => {
    const el = make(tag);
    const kids = {};
    el.on = {};
    el.addEventListener = (t, f) => { (el.on[t] = el.on[t] || []).push(f); };
    el.querySelector = sel => kids[sel] || (kids[sel] = node());
    return el;
  };
}
const press = (target, type, e = {}) => {
  let stopped = false;
  const ev = Object.assign({ stopPropagation() { stopped = true; }, preventDefault() {} }, e);
  for (const f of (target.on[type] || [])) f(ev);
  return stopped;
};

const M1 = 'a1'.repeat(16), M2 = 'b2'.repeat(16);
const ON = (match, names = ['SERAPHIM', 'TOPDOG'], extra = {}) =>
  ({ live: Object.assign({ match, since: Date.now(), t: 'ON AIR', x: 'Come and see.', names }, extra), every: 60 });

function boot(store, opts = {}) {
  return loadGame(IDX, Object.assign({
    before: win => {
      dom(win);
      for (const [k, v] of store || []) win.localStorage.setItem(k, v);
      win.__asked = 0;
      win.__live = { live: null, every: 900 };
      const was = win.fetch;
      win.fetch = (u, o) => {
        if (String(u) !== '/api/live') return was(u, o);
        win.__asked++;
        return Promise.resolve(new Response(JSON.stringify(win.__live), { status: 200 }));
      };
      win.open = (u, t, f) => { win.__opened = [u, t, f]; return null; };
    }
  }, opts));
}
const card = g => g.win.document.body.children.find(c => c.id === 'live') || null;
const shown = g => { const c = card(g); return !!c && !c.hidden; };
const store = g => { const s = []; for (let i = 0; i < g.win.localStorage.length; i++) { const k = g.win.localStorage.key(i); s.push([k, g.win.localStorage.getItem(k)]); } return s; };
// the game's frame, as far as this is concerned: the tick, then the drawing
const frame = g => g.run('Live.tick(); render();');
async function answer(g, body) {
  g.win.__live = body;
  g.run('Live.next = 0');
  frame(g);
  await flush();
  frame(g);
}

// a browser that has answered FIRST FLIGHT already, so a click on the menu is a run
const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'LIVE'; state = 'menu'; tutSet('off');`;

section('asking');
const g = boot();
g.run(SETUP);
{
  ok(g.run('Live.off()') === false && g.win.__asked === 0, 'the game is on air\'s audience, and has asked nothing yet');
  frame(g);
  await flush();
  ok(g.win.__asked === 1, 'it asks at the start', g.win.__asked);
  const wait = g.run('Live.next - performance.now()') / 1000;
  ok(wait > 890 && wait <= 900 && g.run('Live.on') === null, 'nothing on: the next ask in fifteen minutes, as the answer says', wait);
  for (let i = 0; i < 20; i++) frame(g);
  await flush();
  ok(g.win.__asked === 1, 'and not before');
  g.win.__live = { live: null, every: 2 };
  g.run('Live.next = 0'); frame(g); await flush();
  ok(Math.round((g.run('Live.next - performance.now()')) / 1000) === 30, 'never sooner than half a minute, whatever the answer');
  g.win.fetch = () => Promise.reject(new Error('offline'));
  g.run('Live.next = 0'); frame(g); await flush();
  const w2 = g.run('Live.next - performance.now()') / 1000;
  ok(w2 > 290 && w2 <= 300, 'no answer at all: five minutes', w2);
  g.win.fetch = (u, o) => { g.win.__asked++; return Promise.resolve(new Response(JSON.stringify(g.win.__live), { status: 200 })); };
}

section('the menu: the card');
{
  await answer(g, ON(M1));
  ok(g.run('Live.on && Live.on.match') === M1 && Math.round(g.run('Live.next - performance.now()') / 1000) === 60, 'on air: asked again every minute');
  ok(shown(g), 'a card over the whole menu');
  const c = card(g);
  ok(c.querySelector('h2').textContent === 'ON AIR' && c.querySelector('.vs').textContent === 'SERAPHIM  VS  TOPDOG' && c.querySelector('.x').textContent === 'Come and see.',
     'with the announcement and both names', [c.querySelector('h2').textContent, c.querySelector('.vs').textContent]);
  ok(store(g).some(([k, v]) => k === 'voidrunner_live_seen' && v.split(',').includes(M1)), 'noted in this browser');
  ok(press(c, 'keydown', { key: 'p' }) && g.run('state') === 'menu', 'keys pressed over it are its own, never the game\'s');
  press(c, 'keydown', { key: 'Escape' });
  ok(!shown(g) && g.run('Live.on') !== null, 'Escape puts it away (NOT NOW); the broadcast is still on');
  for (let i = 0; i < 5; i++) frame(g);
  ok(!shown(g), 'and it stays away');
}

section('the menu: the strip');
{
  const r = g.run('liveStripRect()');
  ok(r.y > g.run('H') - 40 && r.w === g.run('W'), 'across the foot of the menu', r);
  ok(g.run(`(() => { const calls = []; const was = ctx.fillText; ctx.fillText = function (t) { calls.push(String(t)); return was.apply(this, arguments); };
             try { renderMenu(); } finally { ctx.fillText = was; } return calls.some(t => /LIVE NOW/.test(t) && /SERAPHIM  VS  TOPDOG/.test(t)); })()`),
     'drawn with the menu, naming both');
  g.run(`mouse.x = W / 2; mouse.y = liveStripRect().y + 10; handleClick();`);
  ok(JSON.stringify(g.win.__opened) === JSON.stringify([g.run('PVP_ORIGIN') + '/play/?watch=' + M1, '_blank', 'noopener']),
     'a click on it opens the fight in a tab of its own', g.win.__opened);
  ok(g.run('state') === 'menu', 'and never starts a run');
  g.win.__opened = null;
  g.run(`mouse.x = W / 2; mouse.y = H / 2;`);
}

section('once per broadcast, per browser');
{
  const g2 = boot(store(g));
  g2.run(SETUP);
  await answer(g2, ON(M1));
  ok(g2.run('Live.on && Live.on.match') === M1 && !shown(g2), 'the same broadcast, the same browser, later: no card again, only the strip');
  await answer(g2, ON(M2, ['SERAPHIM', '']));
  ok(shown(g2) && card(g2).querySelector('.vs').textContent === 'SERAPHIM  VS  THE #1', 'another broadcast: the card again (and a name kept off it is THE #1)');
  press(card(g2).querySelector('.go'), 'click');
  ok(JSON.stringify(g2.win.__opened) === JSON.stringify([g2.run('PVP_ORIGIN') + '/play/?watch=' + M2, '_blank', 'noopener']) && !shown(g2),
     'WATCH LIVE opens it in a tab of its own, and the card goes', g2.win.__opened);
}

section('in a run');
{
  const g3 = boot();
  g3.run(SETUP + ' resetGame(); state = "play";');
  await answer(g3, ON(M1));
  ok(g3.run('state') === 'play' && !shown(g3) && g3.run('!!Live.line'), 'going on air mid-run: one line, and no pause', g3.run('state'));
  let threw = null;
  try { for (let i = 0; i < 60; i++) g3.run('update(1 / 60); Live.tick(); render();'); } catch (e) { threw = e; }
  ok(!threw && g3.run('state') === 'play', 'drawn over a second of the run, which goes on', String(threw));
  g3.run('Live.line.t = uiTime - 7; render();');
  ok(!g3.run('Live.line'), 'and gone after a few seconds');
  g3.run('state = "menu"'); frame(g3);
  ok(shown(g3), 'the card waits for the menu');
}

section('off air');
{
  // a card still up when the fight ends comes down with it
  const g4 = boot();
  g4.run(SETUP);
  await answer(g4, ON(M2));
  ok(shown(g4), 'a card up');
  await answer(g4, { live: null, every: 900 });
  ok(!shown(g4) && g4.run('Live.on') === null, 'the fight over: the card comes down by itself');
  await answer(g, { live: null, every: 900 });
  ok(g.run('Live.on') === null && !shown(g), 'nothing on: no card');
  ok(g.run(`(() => { const calls = []; const was = ctx.fillText; ctx.fillText = function (t) { calls.push(String(t)); return was.apply(this, arguments); };
             try { renderMenu(); } finally { ctx.fillText = was; } return !calls.some(t => /LIVE NOW/.test(t)); })()`), 'and no strip');
  g.run(`mouse.x = W / 2; mouse.y = liveStripRect().y + 10; handleClick();`);
  ok(g.run('state') === 'play' && !g.win.__opened, 'the foot of the menu is the menu again: a click there starts a run');
}

section('not on PvP\'s page');
{
  const scripts = PVP_SCRIPTS.map(s => ({ name: s, code: readFileSync(path.join(here, '..', 'pvp', 'site', s), 'utf8') }));
  const p = boot(null, { scripts });
  p.run('Live.tick()');
  await flush();
  ok(p.run('Live.off()') === true && p.win.__asked === 0, 'PvP\'s page has a card of its own (pvp.js): the game\'s asks nothing there');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
