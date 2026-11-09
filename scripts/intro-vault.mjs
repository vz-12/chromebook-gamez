#!/usr/bin/env node
/* ===========================================================================
   AN INTRO FROM THE VAULT — the test: `npm run test:intro` (index.html, INTRO)
   The game, booted in Node with a stand-in module:
     look        nothing remembered: THE LOOK is fetched, as ever
     waits       an id remembered here: the tab waits for that module, and
                 THE LOOK is not fetched
     takes       the module's VR.intro(def): its frames drawn on its clock,
                 told the shot and how far through it; its face asked for;
                 over at its length; remembered for the next tab
     first       never seen here: it takes the screen, from the top, while
                 THE LOOK is silent (no key yet), and is the next tab's once
                 THE LOOK's song is heard
     forgets     an account reply that does not hold it, a sign-out: gone,
                 and a tab still waiting plays THE LOOK; offline: this tab
                 only
     refuses     a def with no picture, and a face that is not a plain name
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
const KEY = 'voidrunner_intro_from';

const MOD = `VR.intro({
  length: 3,
  shots: [{ id: 'a', at: 0, d: 2 }, { id: 'b', at: 2, d: 1 }],
  draw(t, s) { (globalThis.__f = globalThis.__f || []).push([+t.toFixed(2), s.shot.id, +s.k.toFixed(2), s.W, s.H]); },
  song: 'AAAA', gain: 1.5, fonts: ['Cinzel:wght@600']
});`;

function boot({ from = null, search = '?intro=1' } = {}) {
  return loadGame(IDX, { search, before: win => {
    win.__appended = [];
    win.document.head.appendChild = el => { win.__appended.push(el); return el; };
    if (from) win.localStorage.setItem(KEY, from);
  } });
}
const looks = g => g.win.__appended.filter(e => /^intro-art\.js/.test(String(e.src || ''))).length;
const faces = g => g.win.__appended.filter(e => /fonts\.googleapis\.com/.test(String(e.href || ''))).map(e => e.href);
const play = (g, s) => { for (let i = 0; i < Math.round(s * 60) && g.run('Intro.on'); i++) g.run('Intro.frame(1 / 60)'); };

section('look: nothing remembered, THE LOOK as ever');
{
  const g = boot();
  ok(g.run('Intro.on') && g.run('Intro.from') === '' && looks(g) === 1, 'on, and THE LOOK fetched', [g.run('Intro.from'), looks(g)]);
}

section('waits: an id remembered here, and the tab waits for that module');
{
  const g = boot({ from: 'n9' });
  ok(g.run('Intro.on') && g.run('Intro.from') === 'n9' && g.run('Intro.art') === 'loading' && looks(g) === 0, 'waiting on black, THE LOOK not fetched', [g.run('Intro.from'), looks(g)]);
  play(g, 1);
  ok(g.run('Intro.on') && g.run('Intro.t') === 0, 'its clock holds while it waits');
  const bad = boot({ from: 'Not An Id!' });
  ok(bad.run('Intro.from') === '' && looks(bad) === 1, 'something else in the key: THE LOOK');
}

section('takes: its frames on its clock, its face, over at its length, remembered');
{
  const g = boot({ from: 'n9' });
  g.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  ok(g.run('!!Intro.film') && g.run('Intro.art') === 'ready' && g.run('Intro.film.gain') === 1.5, 'taken', g.run('Intro.art'));
  ok(JSON.stringify(faces(g)) === JSON.stringify(['https://fonts.googleapis.com/css2?family=Cinzel:wght@600&display=swap']), 'its face asked for', faces(g));
  play(g, 2.5);
  const f = g.run('JSON.stringify(__f)');
  const fr = JSON.parse(f);
  ok(fr.length >= 140 && fr[0][1] === 'a' && fr[fr.length - 1][1] === 'b' && fr.every(x => x[3] === 1280 && x[4] === 720), 'drawn frame by frame, told the shot and the size', fr.slice(-2));
  ok(fr.some(x => x[1] === 'a' && x[2] > 0.4 && x[2] < 0.6) && fr.some(x => x[1] === 'b' && x[2] > 0.2), 'and how far through it');
  play(g, 1);
  ok(!g.run('Intro.on') && g.run('Intro.film') === null, 'over at its length, its picture let go');
  ok(g.win.localStorage.getItem(KEY) === 'n9', 'remembered for the next tab');
  ok(looks(g) === 0, 'THE LOOK never fetched');
}

section('first: never seen here, it takes the screen while THE LOOK is silent');
{
  const g = boot();
  g.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  ok(g.run('!!Intro.film') && g.run('Intro.from') === 'n9', 'THE LOOK still at 0: taken');
  g.run('Intro.art = "ready"; IntroArt = { draw() {} };');   // (THE LOOK's file in: still its own)
  ok(g.run('!!Intro.film'), 'and THE LOOK coming in after does not take it back');
  const late = boot();
  late.run('Intro.art = "ready"; IntroArt = { draw() {} }; Intro.t = 5;');   // THE LOOK begun, in silence (no key yet)
  late.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  ok(late.run('!!Intro.film') && late.run('Intro.t') === 0 && late.run('Intro.from') === 'n9', 'THE LOOK begun in silence: taken, from the top', late.run('Intro.t'));
  const heard = boot();
  heard.run('Intro.art = "ready"; IntroArt = { draw() {} }; Intro.t = 5; Intro.src = {};');   // THE LOOK's song heard
  heard.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  ok(!heard.run('Intro.film') && heard.run('Intro.t') === 5 && heard.win.localStorage.getItem(KEY) === 'n9', 'THE LOOK heard: left alone, the next tab\'s');
  const none = boot({ search: '' });   // a tab that has had its intro
  none.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  ok(!none.run('Intro.on') && !none.run('Intro.film') && none.win.localStorage.getItem(KEY) === 'n9', 'no intro this tab: only remembered');
}

section('forgets: not held, signed out; offline is this tab only');
{
  const g = boot({ from: 'n9' });
  g.run(`Intro.heard([{ id: 'n4', h: 'x' }, { id: 'n9', h: 'y' }])`);
  ok(g.run('Intro.from') === 'n9' && g.win.localStorage.getItem(KEY) === 'n9', 'held: still waited for');
  g.run(`Intro.heard([{ id: 'n4', h: 'x' }])`);
  ok(g.run('Intro.from') === '' && g.win.localStorage.getItem(KEY) === null && looks(g) === 1, 'not held: forgotten, and THE LOOK plays after all', looks(g));
  const n = boot({ from: 'n9' });
  n.run('Intro.heard(undefined)');
  ok(n.win.localStorage.getItem(KEY) === null && looks(n) === 1, 'signed out (no vault in the reply): forgotten');
  const o = boot({ from: 'n9' });
  o.run('Intro.heard(null, true)');
  ok(o.win.localStorage.getItem(KEY) === 'n9' && o.run('Intro.from') === '' && looks(o) === 1, 'offline: THE LOOK this tab, still remembered');
  const s = boot({ from: 'n9' });
  s.run(`Outside.run('n9', ${JSON.stringify(MOD)})`);
  s.run('Account.lost()');
  ok(s.win.localStorage.getItem(KEY) === null && s.run('!!Intro.film'), 'a sign-out forgets it, and what is playing plays on');
}

section('refuses: no picture, and a face that is not a plain name');
{
  const g = boot({ from: 'n9' });
  let threw = false;
  try { g.run(`Outside.run('n9', 'VR.intro({ length: 3 })')`); } catch (e) { threw = /no intro/.test(String(e && e.message)); }
  ok(threw && !g.run('Intro.film'), 'a def with no draw: thrown (Outside.load logs it), nothing taken');
  const f = boot({ from: 'n9' });
  f.run(`Outside.run('n9', ${JSON.stringify(MOD.replace("['Cinzel:wght@600']", `['x" onload=1', 'Cinzel:wght@600;700', 'a/b']`))})`);
  ok(JSON.stringify(faces(f)) === JSON.stringify(['https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap']), 'only plain names and axes asked for', faces(f));
  const src = (await import('node:fs')).readFileSync(IDX, 'utf8');
  ok(/intro: def => Intro\.take\(id, def\)/.test(src) && /Intro\.heard\(Account\.me \? r\.d\.vault : null\)/.test(src) && /Intro\.forget\(\);/.test(src),
     'the vault, the account reply and a sign-out are wired to it');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\n${passes} passed, 0 failed`);
process.exit(fails ? 1 : 0);
