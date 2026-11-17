#!/usr/bin/env node
/* ===========================================================================
   ON AIR, IN THE GAME — the test: `npm run test:live` (live spectating,
   step 3; index.html, ON AIR)

   The game, booted in Node with the Worker's public GET /api/live answered
   by the test, playing every part of a challenge going on air:

     asking      once at the start, then as often as the answer says, never
                 more often than every half minute, and not at all on PvP's
                 own page
     THE SIGN    in the sky over the logo, never a card over anything: on
                 air, to come (how long), and after (the record); the first
                 time in a browser it comes down and says more; a click on
                 it, or U, watches; one to come opens nothing
     watching    a theater over the game: the fight's words, then PvP's
                 watch page inside it, then what is said after it and the
                 way on; its keys are its own, Escape leaves; the game
                 stands still under it; a record plays for its length
     a run       never stopped: one line low on the screen when it goes on
     off air     sign and line gone
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
  const node = () => ({ textContent: '', hidden: false, on: {}, style: {}, addEventListener(t, f) { (this.on[t] = this.on[t] || []).push(f); },
                        focus() { win.__focus = this; }, classList: { toggle() {}, add() {}, remove() {} }, insertBefore(c) { return c; } });
  win.document.createElement = tag => {
    const el = make(tag);
    const kids = {};
    el.on = {};
    el.addEventListener = (t, f) => { (el.on[t] = el.on[t] || []).push(f); };
    el.querySelector = sel => kids[sel] || (kids[sel] = node());
    el.style.setProperty = () => {};
    el.remove = () => { el.removed = true; };
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
const ON = (match, names = ['THE PILOT', 'TOPDOG'], extra = {}) =>
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

const showEl = g => g.win.document.body.children.find(c => c.id === 'show') || null;
const theater = g => g.run('Show.on') === true;
const drawn = (g, re) => g.run(`(() => { const calls = []; const was = ctx.fillText; ctx.fillText = function (t) { calls.push(String(t)); return was.apply(this, arguments); };
             try { renderMenu(); } finally { ctx.fillText = was; } return calls.filter(t => ${re}.test(t)); })()`);
// THE SIGN, come down: its first frame starts its clock, and this far on it has landed
const landed = g => { drawn(g, '/./'); g.run('Live.sign.t0 = uiTime - 3'); };
const clickSign = g => g.run(`(() => { const r = signRect(); mouse.x = r.x + r.w / 2; mouse.y = r.y + 30; handleClick(); })()`);

section('a fight on air: THE SIGN, never a card over anything');
{
  await answer(g, ON(M1));
  ok(g.run('Live.on && Live.on.match') === M1 && Math.round(g.run('Live.next - performance.now()') / 1000) === 60, 'on air: asked again every minute');
  ok(!card(g) && !theater(g) && g.run('state') === 'menu', 'nothing opens by itself: no card, no theater, the menu as it was');
  ok(drawn(g, '/LIVE NOW/').length === 0, 'its first moment: coming down out of the top, nothing said yet');
  g.run('Live.sign.t0 = uiTime - 3');
  const t = drawn(g, '/LIVE NOW/');
  ok(t.some(x => /THE PILOT VS TOPDOG/.test(x) && /WATCH/.test(x)), 'the sign in the sky over the logo: LIVE, both names, WATCH', t);
  ok(g.run('Live.sign && Live.sign.kind') === 'live' && g.run('Live.sign.fresh') === true, 'the first time in this browser: it comes down, and says more');
  ok(store(g).some(([k, v]) => k === 'voidrunner_sign_seen' && v.split(',').includes('live:' + M1)), 'noted in this browser');
  g.run('Live.sign.t0 = uiTime - 2');
  ok(drawn(g, '/Come and see/').length === 0, 'its words wait until it has come down');
  g.run('Live.sign.t0 = uiTime - 4');
  ok(drawn(g, '/Come and see/').length === 1, 'then they are said under it');
  g.run('Live.sign.t0 = uiTime - 30');
  ok(drawn(g, '/Come and see/').length === 0, 'for a while');
}

section('watching: a theater over the game, and back');
{
  clickSign(g);
  ok(theater(g) && g.run('Show.phase') === 'words' && g.run('state') === 'menu' && !g.win.__opened, 'a click on the sign: the theater, over the game, nothing opened elsewhere');
  const el = showEl(g), $ = q => el.querySelector(q);
  ok(!el.hidden && $('.card h2').textContent === 'ON AIR' && $('.vs').textContent === 'THE PILOT  VS  TOPDOG' && $('.x').textContent === 'Come and see.' && $('.tag b').textContent === 'LIVE',
     'its words first, with both names', [$('.card h2').textContent, $('.vs').textContent]);
  ok(press(el, 'keydown', { key: 'p' }) && g.run('state') === 'menu', 'keys pressed in it are its own, never the game\'s');
  press($('.go'), 'click');
  ok(g.run('Show.phase') === 'fight' && g.run('Show.f && Show.f.src') === g.run('PVP_ORIGIN') + '/play/?watch=' + M1, 'WATCH: the fight, PvP\'s watch page inside it', g.run('Show.f && Show.f.src'));
  ok(!$('.cover').hidden, 'its own close over the watch page\'s, which would leave for PvP\'s lobby');
  g.run('Show.frame()');
  ok(g.run('Show.phase') === 'fight', 'on, while the fight is');
  press(el, 'keydown', { key: 'Escape' });
  ok(!theater(g) && el.hidden && !g.run('Show.f') && g.run('state') === 'menu', 'Escape: back to the game, the fight gone from the page');
  g.run('handleKey("u")');
  ok(theater(g) && g.run('Show.phase') === 'words', 'U at the menu watches too');
  press($('.go'), 'click');
  await answer(g, { live: null, every: 900 });
  g.run('Show.frame()');
  ok(g.run('Show.phase') === 'after' && $('.kick').textContent === 'IT IS OVER', 'the fight over: what is said after it, and the way on', $('.kick').textContent);
  ok(/Sign in/.test($('.way').textContent), 'signed out, with no way up here: told to sign in', $('.way').textContent);
  press($('.go'), 'click');
  ok(!theater(g), 'and back to the game');
  // the game stands still under it: the frame is the theater's while it is up
  g.run('Live.on = { match: "' + M1 + '", since: Date.now(), t: "", x: "", names: ["A", "B"], len: 0, after: "" }; Show.open(Object.assign({ live: true }, Live.on))');
  const was = g.run('uiTime');
  g.run('pageDead = false; frame(performance.now() + 16); frame(performance.now() + 32); pageDead = true');
  ok(g.run('uiTime') === was, 'the game stood still under it');
  g.run('Show.close(); Live.on = null');
}

section('in a run: never stopped');
{
  const g3 = boot();
  g3.run(SETUP + ' resetGame(); state = "play";');
  await answer(g3, ON(M1));
  ok(g3.run('state') === 'play' && !theater(g3) && !card(g3) && g3.run('!!Live.line'), 'going on air mid-run: one line, and the run goes on', g3.run('state'));
  let threw = null;
  try { for (let i = 0; i < 60; i++) g3.run('Live.tick(); update(1 / 60); render();'); } catch (e) { threw = e; }
  ok(!threw && g3.run('state') === 'play', 'drawn over a second of the run, which goes on', String(threw));
  g3.run('Live.line.t = uiTime - 7; render();');
  ok(!g3.run('Live.line'), 'and gone after a few seconds');
  ok(g3.run('Show.open({ live: true, match: "' + M1 + '", names: ["A", "B"] })') === false && !theater(g3), 'and the theater never opens over a run');
  g3.run('state = "menu"'); landed(g3);
  ok(drawn(g3, '/LIVE NOW/').length === 1 && !theater(g3), 'at the menu: the sign, and nothing more');
  // the same in co-op
  const g5 = boot();
  g5.run(SETUP + ' resetGame(); state = "play"; LS.on = true;');
  await answer(g5, ON(M1));
  ok(g5.run('state') === 'play' && g5.run('!!Live.line') && !theater(g5), 'in co-op: one line, no pause');
}

section('to come, and after: THE SIGN, and the record from its start');
{
  const g6 = boot();
  g6.run(SETUP);
  const at = Date.now() + 2 * 864e5 + 5 * 3600e3;
  await answer(g6, { live: null, every: 900, soon: { at, t: 'HOW IT BEGAN', names: ['THE PILOT', 'TOPDOG'] } });
  landed(g6);
  const t = drawn(g6, '/SHOWN HERE/');
  ok(t.length === 1 && /HOW IT BEGAN/.test(t[0]) && /THE PILOT VS TOPDOG/.test(t[0]) && /IN 2 DAYS 5 H|IN 2 DAYS 4 H/.test(t[0]), 'to come: who, and how long until it is shown here', t);
  clickSign(g6);
  ok(!theater(g6) && g6.run('state') === 'menu', 'a click on it: nothing yet, and no run started either');
  ok(g6.run('signUntil(Date.now() + 20 * 60e3)') === 'IN 20 MIN' && g6.run('signUntil(Date.now() + 30e3)') === 'IN A MOMENT', 'the wait, said plainly');
  // shown before: the record, from its start
  const wasAt = Date.now() - 3600e3;
  await answer(g6, { live: null, every: 900, shown: M2, was: { at: wasAt, t: 'HOW IT BEGAN', x: 'Before.', after: 'After.', names: ['THE PILOT', 'TOPDOG'], len: 40 } });
  landed(g6);
  const w = drawn(g6, '/HOW IT BEGAN/');
  ok(w.length === 1 && /WATCH/.test(w[0]) && !/LIVE/.test(w[0]), 'after: its title, who, WATCH', w);
  g6.run('handleKey("u")');
  const el = showEl(g6), $ = q => el.querySelector(q);
  ok(theater(g6) && g6.run('Show.o.live') === false && $('.kick').textContent === 'A FIGHT FROM THE RECORD' && $('.tag b').textContent === 'THE RECORD', 'the record: its words first', $('.kick').textContent);
  g6.run('Show.t0 -= 10e3; Show.frame()');
  ok(g6.run('Show.phase') === 'fight' && g6.run('Show.f.src').endsWith('?watch=' + M2), 'after a few seconds, the fight by itself');
  g6.run('Show.frame()');
  ok(g6.run('Show.phase') === 'fight', 'played from its start, for its length');
  g6.run('Show.t0 -= (40 + SHOW_TAIL) * 1000; Show.frame()');
  ok(g6.run('Show.phase') === 'after' && $('.x').textContent === 'After.' && $('.card h2').hidden, 'then what is said after it', $('.x').textContent);
  g6.run('Show.close()');
  // with the way up here: told where it leads
  g6.run('UP_ROOMS.push({ name: "X" })');
  g6.run('handleKey("u"); Show.fight(); Show.after()');
  ok(/THE VOID/.test($('.way').textContent), 'with the way up here: told where it leads', $('.way').textContent);
  g6.run('Show.close(); UP_ROOMS.length = 0');
  // once per browser: the same, later, is one quiet line
  const g7 = boot(store(g6));
  g7.run(SETUP);
  await answer(g7, { live: null, every: 900, shown: M2, was: { at: wasAt, t: 'HOW IT BEGAN', x: 'Before.', names: ['THE PILOT', 'TOPDOG'], len: 40 } });
  drawn(g7, '/./');
  g7.run('Live.sign.t0 = uiTime - 1');
  const first = drawn(g7, '/HOW IT BEGAN/');
  g7.run('Live.sign.t0 = uiTime - 4');
  ok(g7.run('Live.sign.fresh') === false && first.length === 1 && drawn(g7, '/Before/').length === 0, 'the same browser, later: no coming down, one quiet line in a moment, and no more said', first);
}

section('off air');
{
  await answer(g, { live: null, every: 900 });
  ok(g.run('Live.on') === null && g.run('Live.what()') === null && drawn(g, '/LIVE NOW|WATCH/').length === 0, 'nothing on, nothing shown: no sign');
  clickSign(g);
  ok(g.run('state') === 'play' && !theater(g), 'the sky over the logo is the menu again: a click there starts a run');
  ok(!g.win.document.body.children.some(c => c.id === 'live'), 'and there never was a card over the menu');
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
