#!/usr/bin/env node
/* ===========================================================================
   FIRST FLIGHT — the test: `npm run test:tutorial`

   The assisted first run (index.html, "FIRST FLIGHT"), played through the
   game's own keys and functions, with a cookie jar that behaves like a
   browser's:

     a new browser   PLAY asks; ESC asks again later; NO THANKS is kept and
                     never asked again
     the help        FLY ASSISTED: hits land at 60%, THE WARDEN at 65%
                     health, a slower clock and slower shots, nobody else's
                     shots slowed; one save, then the run can end; dying
                     keeps the help for the next run, with a fresh save
     its end         THE WARDEN down: the help ends, the browser keeps
                     "done", and PLAY plays ordinary runs
     veterans        a save past wave 5 is never asked, and the browser is
                     marked; a save stuck at the wall is asked
     opting out      [O] on the pause screen, and only there
     only here       the rush, the daily, freeplay, the hub and a run built
                     straight through resetGame are never assisted
     CONTINUE        a continued run is still assisted, its save still spent
     storage         the cookie's attributes; file:// keeps the word in local
                     storage; with neither, the page remembers
     the lessons     each waits for what it asks; THE WARDEN's calls; the
                     first hand of cards; all of it drawn without a throw
     the tour        FLY ASSISTED opens on the HUD, part by part, with the
                     run held: next, back, ESC, SKIP and a click; every part
                     on screen and drawn; once, and never for NO THANKS
     ALL HALLOWS     the knock waits while a new browser's first flight has
                     the menu, and knocks once a run is filed; a veteran, or a
                     browser that said no, is knocked at once

   The determinism suite (npm test) flies an assisted run too ('assist'), and
   holds the help to the run's rules (seeded, snapshot-safe).
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGame } from './lib/game-vm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = process.argv.find(a => a.endsWith('.html')) || path.join(here, '..', 'index.html');

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
function take(list) { for (const [c, w, x] of JSON.parse(list)) ok(c, w, x); }

/* A browser's cookie jar, as document.cookie: reading gives name=value pairs,
   writing sets one (Max-Age <= 0 deletes it). keeps: false is file://, where
   the writes go nowhere. Every write is kept for the test to read back. */
function jar(win, keeps = true) {
  const m = new Map(), writes = [];
  Object.defineProperty(win.document, 'cookie', {
    configurable: true,
    get: () => [...m].map(([k, v]) => k + '=' + v).join('; '),
    set: s => {
      writes.push(String(s));
      if (!keeps) return;
      const [kv, ...attrs] = String(s).split(';');
      const i = kv.indexOf('='), k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim();
      const age = attrs.map(a => a.trim().split('=')).find(([a]) => a.toLowerCase() === 'max-age');
      if (age && +age[1] <= 0) m.delete(k); else m.set(k, v);
    }
  });
  win.__jar = { m, writes };
}
// a new copy of the game in a new browser
function fresh({ keeps = true, https = false, noStore = false } = {}) {
  const g = loadGame(IDX, { w: 1280, h: 720, before: win => {
    jar(win, keeps);
    if (https) win.location.protocol = 'https:';
    if (noStore) { const set = win.localStorage.setItem; win.localStorage.setItem = (k, v) => { if (k === 'voidrunner_tut') throw new Error('full'); set(k, v); }; }
  } });
  g.run(SETUP);
  return g;
}

const SETUP = `pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.logSeen = LOG_VER;
  Save.profile.name = 'FLIGHT'; state = 'menu';`;
// inside the game: checks, a clock, and the two answers
const KIT = `
  var C = [];
  var chk = (c, w, x) => C.push([!!c, w, x === undefined ? null : x]);
  var STEP = 1 / 60;
  var near = (a, b) => Math.abs(a - b) < 1e-6;
  // the game and the lessons, a second at a time (frame() runs both; the test has no rAF)
  var tick = (sec, f) => { for (let i = 0; i < Math.round(sec * 60); i++) { update(STEP); tutTick(STEP); if (f) f(); } };
  // FLY ASSISTED (the card's, the first time), and past the tour if it opens
  var assisted = () => { state = 'menu'; handleKey('enter'); if (tutCardUp()) handleKey('enter'); if (state === 'tour') handleKey('escape'); };
  // nothing can hurt the pilot, and the wave is held where it is: something still owed, nothing sent
  var calm = () => { P.iframe = 1e9; P.maxHp = P.hp = 1e6; betweenWaves = 0; spawnBudget = 5; spawnT = 1e9;
                     for (const e of enemies) e.dead = true; ebullets.length = 0; };
`;

/* ============================== a new browser ============================== */
section('a new browser');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    chk(tutGet() === '' && tutWant() === 'ask', 'nothing kept on a new browser: PLAY will ask');
    handleKey('enter');
    chk(state === 'menu' && tutCardUp(), 'PLAY asks first: the card is up, the run has not started', state);
    render();
    handleKey('escape');
    chk(state === 'menu' && !tutCardUp() && tutGet() === '', '[ESC] puts it down, and nothing is kept');
    mouse.x = 640; mouse.y = 360; handleClick();
    chk(state === 'menu' && tutCardUp(), 'a click on the menu asks again');
    mouse.x = 4; mouse.y = 4; handleClick();
    chk(state === 'menu' && !tutCardUp(), 'and a click off the card puts it down');
    handleKey('enter'); handleKey('n');
    chk(state === 'play' && assist === null, 'NO THANKS: an ordinary run', state);
    chk(tutGet() === 'off', 'and the browser keeps the answer', tutGet());
    quitToMenu(); handleKey('enter');
    chk(state === 'play' && assist === null && !tutCardUp(), 'asked once: from then on PLAY plays');
    return JSON.stringify(C);
  })()`));
  const w = g.win.__jar.writes.at(-1);
  ok(/^vr_tut=off; /.test(w) && /Max-Age=34560000/.test(w) && /Path=\//.test(w) && /SameSite=Lax/.test(w),
     'the cookie: vr_tut, 400 days, the whole site, first-party', w);
  ok(!/Secure/.test(w), 'not Secure over http (it would not be kept)', w);
}

/* ================================ the help ================================= */
section('the help');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    assisted();
    chk(state === 'play' && assist && !assist.saved, 'FLY ASSISTED: the run is assisted', assist);
    chk(tutGet() === 'on', 'and the browser keeps it', tutGet());

    calm(); P.iframe = 0; P.maxHp = P.hp = 1000; P.armor = 0; P.shield = 0; P.shell = 0;
    hurtPlayer(100);
    chk(near(P.hp, 940), 'a hit lands at 60%', P.hp);

    wave = 5;
    const a = spawnEnemy('boss', P.x + 500, P.y);
    const keep = assist; assist = null;
    const b = spawnEnemy('boss', P.x - 500, P.y);
    assist = keep;
    chk(a.boss === 'warden', 'the first boss is THE WARDEN', a.boss);
    chk(near(a.maxHp / b.maxHp, ASSIST.bossHp), 'it comes in at 65% of its health', [a.maxHp, b.maxHp]);
    a.atk = 0; a.atkT = 1;
    updateBoss(a, 0.1, 1, 0, 500);
    chk(near(a.atkT, 1 - 0.1 * ASSIST.bossPace), 'its clock runs at 75%: longer between attacks', a.atkT);
    const s1 = eshoot(a, 0, 200, 1), gr = spawnEnemy('grunt', P.x, P.y + 500), s2 = eshoot(gr, 0, 200, 1);
    chk(near(Math.hypot(s1.vx, s1.vy), 200 * ASSIST.bossShot), 'its shots fly at 85%', Math.hypot(s1.vx, s1.vy));
    chk(near(Math.hypot(s2.vx, s2.vy), 200), 'and nothing else\\'s are slowed', Math.hypot(s2.vx, s2.vy));
    a.dead = b.dead = gr.dead = true; ebullets.length = 0;

    P.revive = 0; P.deadman = 0; P.iframe = 0; P.hp = 5;
    hurtPlayer(99999);
    chk(state === 'play' && assist.saved && near(P.hp, P.maxHp * ASSIST.saveHp), 'the blow that would end the run: saved, at 60%', [state, P.hp]);
    chk(Tut.lastT > 0 && /one save/.test(Tut.last), 'and told it was the only one', Tut.last);
    P.iframe = 0; hurtPlayer(99999);
    chk(state === 'dead', 'the next one ends the run', state);
    chk(tutGet() === 'on', 'a run lost before THE WARDEN keeps the help for the next', tutGet());
    uiArm = 0; handleKey('enter');
    chk(state === 'play' && assist && !assist.saved && !tutCardUp(), 'again: assisted, with a fresh save, and nothing asked', [state, assist]);
    return JSON.stringify(C);
  })()`));

  section('its end');
  take(g.run(`(() => { ${KIT}
    calm(); wave = 5; bossAlive = true;
    const w = spawnEnemy('boss', P.x + 400, P.y);
    killEnemy(w);
    chk(w.dead && assist === null, 'THE WARDEN down: the help ends', [w.dead, assist]);
    chk(tutGet() === 'done', 'and the browser keeps "done"', tutGet());
    chk(Tut.lastT > 0 && /real game/.test(Tut.last), 'said, for when play is back', Tut.last);
    P.iframe = 0; P.maxHp = P.hp = 1000; state = 'play'; hurtPlayer(100);
    chk(near(P.hp, 900), 'and hits land whole again', P.hp);
    quitToMenu(); handleKey('enter');
    chk(state === 'play' && assist === null && !tutCardUp(), 'PLAY plays ordinary runs from now on');
    return JSON.stringify(C);
  })()`));
}

/* ================================ veterans ================================= */
section('veterans');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    Save.profile.bestWave = 12; Save.profile.runs = 40;
    handleKey('enter');
    chk(state === 'play' && assist === null && !tutCardUp(), 'a save past wave 5 is never asked', state);
    chk(tutGet() === 'done', 'and the browser is marked, so a signed-out guest save is not asked either', tutGet());
    return JSON.stringify(C);
  })()`));
  const h = fresh();
  take(h.run(`(() => { ${KIT}
    Save.profile.bestWave = 5; Save.profile.runs = 7;
    handleKey('enter');
    chk(state === 'menu' && tutCardUp(), 'a save stuck at THE WARDEN is asked: it is who this is for');
    return JSON.stringify(C);
  })()`));
}

/* =============================== opting out ================================ */
section('opting out');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    assisted(); calm();
    handleKey('o');
    chk(assist && tutGet() === 'on', '[O] in play does nothing');
    handleKey('p');
    chk(state === 'pause', 'paused');
    render();
    handleKey('o');
    chk(state === 'pause' && assist === null && tutGet() === 'off', '[O] on the pause screen: off, and kept off', [state, assist, tutGet()]);
    handleKey('p'); quitToMenu(); handleKey('enter');
    chk(state === 'play' && assist === null && !tutCardUp(), 'and never asked again');
    return JSON.stringify(C);
  })()`));
  const h = fresh();
  take(h.run(`(() => { ${KIT}
    assisted(); calm(); state = 'pause';
    const r = pauseAssistRect(); mouse.x = r.x + r.w / 2; mouse.y = r.y + r.h / 2; handleClick();
    chk(state === 'pause' && assist === null && tutGet() === 'off', 'the pause screen\\'s button does the same (touch has no [O])', [state, assist]);
    return JSON.stringify(C);
  })()`));
}

/* ================================ only here ================================ */
section('only here');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    tutSet('on');
    const runs = { 'the rush': () => startRush(), 'the daily': () => startDaily(),
                   'freeplay': () => startFreeplay(), 'the hub': () => enterHub(),
                   'a run built straight through resetGame': () => { resetGame(); state = 'play'; } };
    for (const [n, f] of Object.entries(runs)) {
      quitToMenu(); chalQuit(); if (inHub) exitHub(); state = 'menu';
      try { f(); } catch (e) { chk(false, n + ' threw', String(e)); continue; }
      chk(assist === null, n + ' is never assisted', assist);
    }
    return JSON.stringify(C);
  })()`));
}

/* ================================ CONTINUE ================================= */
section('CONTINUE');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    assisted(); calm(); tick(1);
    assist.saved = true;
    chk(runSave(), 'an assisted run is kept like any other');
    state = 'menu'; assist = null; runSaveLoad();
    chk(runCardUp(), 'the menu offers it back');
    handleKey('enter');
    chk(state === 'pause' && assist && assist.saved, 'continued: still assisted, its one save still spent', [state, assist]);
    return JSON.stringify(C);
  })()`));
}

/* ================================= storage ================================= */
section('storage');
{
  const g = fresh({ https: true });
  g.run(`tutSet('on')`);
  ok(/; Secure$/.test(g.win.__jar.writes.at(-1)), 'over https it is Secure', g.win.__jar.writes.at(-1));
  ok(g.run(`localStorage.getItem('voidrunner_tut')`) === null, 'and with the cookie kept, local storage holds nothing');

  const f = fresh({ keeps: false });
  take(f.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('n');
    chk(localStorage.getItem('voidrunner_tut') === 'off' && tutGet() === 'off', 'file:// keeps no cookie: local storage keeps the word', localStorage.getItem('voidrunner_tut'));
    quitToMenu(); handleKey('enter');
    chk(state === 'play' && !tutCardUp(), 'and it is not asked again');
    return JSON.stringify(C);
  })()`));

  const n = fresh({ keeps: false, noStore: true });
  take(n.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('enter'); handleKey('escape');
    chk(state === 'play' && assist && tutGet() === 'on', 'with nowhere to keep it, the page remembers', tutGet());
    P.iframe = 0; P.revive = 0; P.hp = 1; hurtPlayer(1e6); P.iframe = 0; hurtPlayer(1e6);
    uiArm = 0; handleKey('enter');
    chk(state === 'play' && assist && !tutCardUp(), 'so the report\\'s PLAY never puts up a card', state);
    return JSON.stringify(C);
  })()`));
}

/* =============================== the lessons =============================== */
section('the lessons');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    assisted(); calm();
    const line = () => { const L = tutLine(); return L ? L.t : ''; };
    tick(0.5);
    chk(line() === '', 'a breath before the first');
    tick(1.2);
    chk(line() === 'WASD flies the ship.', 'then: WASD', line());
    tick(4);
    chk(line() === 'WASD flies the ship.', 'it waits while you do not fly', line());
    P.x += 400; tick(0.2); tick(1.2);
    chk(/mouse aims/.test(line()), 'flown: the mouse and the trigger', line());
    P.kills = 5; tick(3.4);
    chk(/experience/.test(line()), 'five down: experience', line());
    P.level = 2; tick(3.4);
    chk(/SPACE dashes/.test(line()), 'a level: the dash', line());
    keys[' '] = true; tick(0.1); keys[' '] = false; tick(3.3);
    chk(line() === '', 'dashed: quiet until wave 4', line());
    wave = 4; tick(1);
    chk(/first boss: THE WARDEN/.test(line()), 'wave 4: the boss is next', line());
    tick(5);
    chk(/one blow/.test(line()), 'and how this run is different', line());

    // a lesson not taken gives up
    assisted(); calm(); tick(1.4 + 12 + 0.8 + 0.4);
    chk(/mouse aims/.test(line()), 'a lesson not taken gives up after its time', line());

    // the first hand of cards
    state = 'levelup'; tutTick(STEP);
    chk(Tut.lvlUp === 1, 'the first hand of cards gets a word');
    state = 'play'; tutTick(STEP);
    chk(Tut.lvlUp === 2, 'once');

    // THE WARDEN
    wave = 5; bossAlive = true;
    const w = spawnEnemy('boss', P.x + 600, P.y);
    tick(0.1);
    chk(/THE WARDEN\\. Keep moving/.test(line()), 'it is met', line());
    Tut.tellT = 0; w.atk = -2; w.atkT = 5; tutTells(0);
    const L = tutLine();
    chk(L && /winding up a charge/.test(L.t) && L.hot, 'the charge is called, loudly', L);
    Tut.tellT = 0; w.atk = 0; w.atkT = 5; tutTells(0);
    chk(/ring of shots/.test(line()), 'the ring', line());
    Tut.tellT = 0; w.atk = 1; tutTells(0);
    chk(/aimed fan/.test(line()), 'the fan', line());
    w.atk = 6; tutTells(0);
    chk(/aimed fan/.test(line()), 'a call is not cut off while it is being read', line());
    Tut.tellT = 0; w.atk = 0; tutTells(0);
    chk(!/ring of shots/.test(line()), 'the ring is not said again so soon', line());
    w.hp = w.maxHp * 0.5; tick(0.05);
    chk(/Phase 2/.test(line()), 'phase 2 is called', line());
    Tut.tellT = 0; w.atk = -2; w.atkT = 5; tutTells(0);
    chk(!/charge/.test(line()), 'the charge, not twice in five seconds', line());

    // drawn: the card, the lessons, the pause screen, the cards' word
    let threw = null;
    const draw = () => { try { render(); } catch (e) { threw = threw || String(e.stack || e); } };
    draw();
    Tut.lvlUp = 1; state = 'levelup'; offers = UPGRADES.slice(0, 3); draw(); state = 'play'; offers = [];
    state = 'pause'; draw(); state = 'play';
    tutSay('A word.', '#fbbf24', 3); draw();
    quitToMenu(); tutSet(''); localStorage.removeItem('voidrunner_tut'); Tut.mem = ''; handleKey('enter'); draw();
    chk(tutCardUp(), 'the card, drawn');
    chk(!threw, 'nothing drawn threw', threw);
    return JSON.stringify(C);
  })()`));
}

/* ================================ the tour ================================ */
section('the tour');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('enter');
    chk(state === 'tour' && Tut.tour && Tut.tour.i === 0, 'FLY ASSISTED opens the run on the tour', state);
    if (!Tut.tour) return JSON.stringify(C);
    chk(assist && !assist.saved && wave === 0, 'the run is built and assisted, and has not begun', [wave, assist]);
    const t0 = simTick, r0 = simRngState, e0 = elapsed;
    for (let i = 0; i < 120; i++) update(STEP);
    chk(simTick === t0 && simRngState === r0 && elapsed === e0 && wave === 0 && state === 'tour',
        'held: two seconds of the tour move nothing', [simTick, elapsed, wave, state]);
    chk(!runSave(), 'and nothing is kept for CONTINUE while it is up');
    render();
    const parts = [...new Set(TUT_TOUR.flatMap(s => s.at))];
    const off = parts.filter(k => { const r = tourRect(k); return !r || !(r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H); });
    chk(!off.length, 'every part it points at is somewhere on screen', off.map(k => [k, tourRect(k)]));
    chk(near(tourRect('hp').w, HUD_AT.hp.w) && tourRect('score').x > W / 2, 'and where the HUD drew it', [HUD_AT.hp, HUD_AT.score]);

    handleKey('enter');
    chk(Tut.tour.i === 1, '[ENTER]: the next part', Tut.tour.i);
    handleKey('arrowleft');
    chk(Tut.tour.i === 0, '[←]: back', Tut.tour.i);
    handleKey('arrowleft');
    chk(state === 'tour' && Tut.tour.i === 0, 'and nothing before the first');
    mouse.x = 4; mouse.y = H - 4; handleClick();
    chk(Tut.tour.i === 1, 'a click: the next part', Tut.tour.i);

    let threw = null, n = 0;
    const seen = [];
    while (state === 'tour' && n++ < 40) {
      seen.push(Tut.tour.i);
      try { render(); } catch (e) { threw = threw || String(e.stack || e); }
      handleKey('enter');
    }
    chk(!threw, 'every part drawn without a throw', threw);
    chk(seen.join() === tourShown().slice(1).join() && tourShown().length === TUT_TOUR.length,
        'every part once, in order (here, with a keyboard, all ' + TUT_TOUR.length + ')', seen);
    chk(state === 'play' && !Tut.tour, 'past the last: the run begins', state);
    tick(1);
    chk(simTick > t0 && wave === 1, 'and moves', [simTick, wave]);
    return JSON.stringify(C);
  })()`));

  const h = fresh();
  take(h.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('enter'); handleKey('enter');
    handleKey('escape');
    chk(state === 'play' && !Tut.tour && assist, '[ESC] ends it, and the assisted run begins', state);
    P.iframe = 0; P.revive = 0; P.hp = 1; hurtPlayer(1e9); P.iframe = 0; hurtPlayer(1e9);
    uiArm = 0; handleKey('enter');
    chk(state === 'play' && assist, 'the next assisted run starts at once: the tour is shown once', state);
    return JSON.stringify(C);
  })()`));

  const k = fresh();
  take(k.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('enter'); render();
    const b = Tut.tourBtns.skip; mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2; handleClick();
    chk(state === 'play' && !Tut.tour, 'SKIP, clicked (or tapped), ends it', state);
    return JSON.stringify(C);
  })()`));

  const m = fresh();
  take(m.run(`(() => { ${KIT}
    handleKey('enter'); handleKey('n');
    chk(state === 'play' && !Tut.tour, 'NO THANKS: no tour', state);
    return JSON.stringify(C);
  })()`));
}

/* =============================== ALL HALLOWS =============================== */
section('ALL HALLOWS');
{
  const g = fresh();
  take(g.run(`(() => { ${KIT}
    HL.force = true;
    chk(hlLive() && !hlSeen('prologue'), 'the event is on, and this profile has not heard the knock');
    for (let i = 0; i < 30; i++) update(STEP);
    chk(!hlProOn() && tutHoldsMenu(), 'a new browser: the knock waits', [hlProOn(), tutHoldsMenu()]);
    handleKey('enter');
    chk(tutCardUp(), 'so PLAY is answered, with FIRST FLIGHT\\'s card');
    handleKey('enter'); handleKey('escape');
    chk(state === 'play' && assist, 'into the first flight', state);
    P.iframe = 0; P.revive = 0; P.hp = 1; hurtPlayer(1e9); P.iframe = 0; hurtPlayer(1e9);
    chk(state === 'dead' && Save.profile.runs === 1, 'the run ends, and is filed', [state, Save.profile.runs]);
    uiArm = 0; handleKey('m');
    for (let i = 0; i < 5; i++) update(STEP);
    chk(state === 'menu' && !tutHoldsMenu() && hlProOn(), 'back at the menu with a run behind it: the knock', [state, hlProOn()]);
    chk(tutGet() === 'on', 'and the help is still on for the next run');
    handleKey('escape');
    chk(!hlProOn() && hlSeen('prologue'), '[ESC] skips it, as it always has');
    return JSON.stringify(C);
  })()`));

  const v = fresh();
  take(v.run(`(() => { ${KIT}
    HL.force = true; Save.profile.runs = 12; Save.profile.bestWave = 14;
    update(STEP);
    chk(hlProOn(), 'a veteran is knocked at once, as before');
    return JSON.stringify(C);
  })()`));

  const d = fresh();
  take(d.run(`(() => { ${KIT}
    HL.force = true; tutSet('off');
    update(STEP);
    chk(hlProOn(), 'and so is a browser that said no to the help');
    return JSON.stringify(C);
  })()`));
}

console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
