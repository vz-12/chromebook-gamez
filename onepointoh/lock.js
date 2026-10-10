/* ===========================================================================
   ONE POINT OH — THE HOOKS INTO THE FIRST BUILD (ONE-POINT-OH-PLAN.md, 3 and 4)

   Runs in the copy's frame (onepointoh/first.html) after the first build's
   own script, which is that build's byte for byte (scripts/opo-build.mjs).
   Nothing in it is edited: its functions are global declarations, so the few
   this needs are wrapped here, by name, and its run state (P, bullets, score,
   state) is read and written the way any second script on the page can.

     resetGame    a locked run starts: the crack widens a little by itself
     update       the room's answer while the crack is under fire: the score
                  stops counting, his voice, more bodies; and the break
     updateBullets  rounds that reach the crack are taken into it
     gameOver     what was done to the crack is kept, every attempt counts
     drawArena    the crack itself, in the wall it is in (art: OPO_ART.crack)
     render       his voice, over everything (art: OPO_ART.lockVoice)

   THE CRACK. Every locked run has a crack in the edge of the room: the top
   wall, at OPO_CRACK.at of its width. The first build's world is a box with
   a stroked wall, and nothing has ever been outside it. Rejecting the loop is
   turning your back on the room and firing into the wall:
     · `w` is how wide it is: a fifth more each locked run, by itself, so
       nobody is stuck for long (unmistakable by the fifth).
     · `p` is what has been done to it: seconds of fire on it, out of
       OPO_CRACK.secs. Kept on the lock's own save (voidrunner_opo_crack_v1),
       so dying first loses nothing.
     · At 1 it gives: the game around the frame is told (OPO_HOST.broke),
       with the cards this run took, and takes it from there.

   Everything drawn here is a hook in the game around the frame (OPO_ART in
   index.html, "ONE POINT OH — art hooks"), drawn on this frame's canvas. With
   no game around it (the page opened on its own), it plays and draws nothing
   of its own.
   ========================================================================= */
(function () {
  'use strict';
  var host = (function () { try { return window.parent !== window && window.parent.OPO_HOST ? window.parent.OPO_HOST : null; } catch (e) { return null; } })();
  var CRACK_KEY = 'voidrunner_opo_crack_v1';
  var OPO_CRACK = {
    at: 0.62,          // where it is along the top wall
    half0: 22,         // its half-width at nothing, and at its widest (world px)
    half1: 150,
    grow: 0.2,         // how much wider it is each locked run, by itself
    secs: 20,          // seconds of fire on it to break it
    hold: 0.3,         // a round in this long ago still counts as fire on it
    bodies: 2,         // the room's answer: this many more bodies,
    bodiesEvery: 1.2,  //   this often, while it is under fire
    lineEvery: 3.4,    // and a line from him, this often
    lineLife: 2.8,
    soundEvery: [7, 13]   // now and then a sound from the game it was (seconds, at random)
  };
  // his lines, from the game around the frame (OPO_SAY.crack); these if it is not there
  var LINES = (function () { try { var l = host && host.lines('crack'); if (l && l.length) return l.slice(); } catch (e) {} return ['Leave that.', 'It is fine as it is.', 'Come away from there.']; })();

  var num = function (v, lo, hi) { v = Number(v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo; };
  function load() {
    var c = null;
    try { c = JSON.parse(localStorage.getItem(CRACK_KEY) || 'null'); } catch (e) {}
    c = c && typeof c === 'object' ? c : {};
    return { p: num(c.p, 0, 1), w: num(c.w, 0, 1), runs: Math.floor(num(c.runs, 0, 1e6)), broke: !!c.broke };
  }
  function keep() { try { localStorage.setItem(CRACK_KEY, JSON.stringify(C)); } catch (e) {} }
  var C = load();
  var R = fresh();
  function fresh() {
    return { t: 0, lastHit: -9, hits: [], holdScore: null, spawnT: 0, line: null, lineI: 0, lineT: 0,
             keepT: 0, soundT: OPO_CRACK.soundEvery[0], broke: false, after: 0 };
  }
  // where it is, in the first build's world
  function span() {
    var half = OPO_CRACK.half0 + (OPO_CRACK.half1 - OPO_CRACK.half0) * Math.max(C.w, C.p * 0.6);
    var cx = WORLD.w * OPO_CRACK.at;
    return { x0: cx - half, x1: cx + half, cx: cx, y: 0, half: half };
  }
  var held = function () { return R.t - R.lastHit < OPO_CRACK.hold; };
  var art = function (name) {
    if (!host) return;
    var a = Array.prototype.slice.call(arguments);
    try { host.art.apply(null, a); } catch (e) {}
  };

  /* --- a locked run starts --- */
  var _resetGame = resetGame;
  resetGame = function () {
    _resetGame.apply(this, arguments);
    C.runs++;
    C.w = Math.min(1, C.w + OPO_CRACK.grow);
    keep();
    R = fresh();
  };

  /* --- rounds that reach the crack go into it --- */
  var _updateBullets = updateBullets;
  updateBullets = function (dt) {
    if (state === 'play' && !R.broke) {
      var s = span();
      for (var i = bullets.length - 1; i >= 0; i--) {
        var b = bullets[i];
        var ny = b.y + b.vy * dt, nx = b.x + b.vx * dt;
        if (b.vy < 0 && ny <= b.r + 2 && nx >= s.x0 && nx <= s.x1) {
          bullets.splice(i, 1);
          R.lastHit = R.t;
          R.hits.push({ x: nx, t: R.t });
        }
      }
      while (R.hits.length && R.t - R.hits[0].t > 0.6) R.hits.shift();
      if (R.hits.length > 40) R.hits.splice(0, R.hits.length - 40);
    }
    return _updateBullets.apply(this, arguments);
  };

  /* --- the room answers, and the crack gives --- */
  var _update = update;
  update = function (dt) {
    if (R.broke) { afterBreak(dt); return _update.apply(this, arguments); }
    if (state !== 'play') return _update.apply(this, arguments);
    R.t += dt;
    var on = held();
    if (on) {
      if (R.holdScore === null) R.holdScore = score;
      C.p = Math.min(1, C.p + dt / OPO_CRACK.secs);
      // more of the first build's bodies, come for you
      R.spawnT -= dt;
      if (R.spawnT <= 0) {
        R.spawnT = OPO_CRACK.bodiesEvery;
        for (var k = 0; k < OPO_CRACK.bodies; k++) { try { spawnRing(pickEnemyType()); } catch (e) {} }
      }
      // the first time he forbids anything
      R.lineT -= dt;
      if (R.lineT <= 0) {
        R.lineT = OPO_CRACK.lineEvery;
        R.line = { text: LINES[R.lineI % LINES.length], i: R.lineI, t: 0 };
        R.lineI++;
      }
      R.keepT -= dt;
      if (R.keepT <= 0) { R.keepT = 2; keep(); }
    } else {
      R.holdScore = null;
      R.spawnT = Math.min(R.spawnT, 0.4);
    }
    if (R.line) { R.line.t += dt; if (R.line.t > OPO_CRACK.lineLife) R.line = null; }
    // now and then a sound from the game it was, through the wall
    R.soundT -= dt;
    if (R.soundT <= 0) {
      var se = OPO_CRACK.soundEvery;
      R.soundT = se[0] + Math.random() * (se[1] - se[0]);
      art('crackSound', Audio_, C.w, C.p);
    }
    var out = _update.apply(this, arguments);
    // the score stops counting while you fire at it
    if (on && R.holdScore !== null) score = R.holdScore;
    if (C.p >= 1 && !R.broke && state === 'play') breakOut();
    return out;
  };

  /* It gives. The game around the frame takes it from here (OPO_HOST.broke):
     the cards this run took go with you, by the same ids. This frame goes on
     playing the first build, untouched and untouchable, because it is drawn
     into the shatter's panes and onto his screen. */
  function breakOut() {
    R.broke = true;
    C.broke = true;
    keep();
    var up = {};
    for (var id in P.up) if (Object.prototype.hasOwnProperty.call(P.up, id)) up[id] = P.up[id] | 0;
    var info = { up: up, level: P.level | 0, score: score | 0, wave: wave | 0,
                 sector: stage && stage.name || '', hp: P.maxHp > 0 ? P.hp / P.maxHp : 1, runs: C.runs };
    if (host) { try { host.broke(info); } catch (e) {} }
  }
  // the ship left behind keeps flying, on its own: nothing can end it now
  function afterBreak(dt) {
    R.after += dt;
    if (state === 'play') {
      P.iframe = Math.max(P.iframe, 0.5);
      if (P.hp < P.maxHp * 0.5) P.hp = P.maxHp;
      autoFire = true;
      for (var k in keys) keys[k] = false;
      mouse.x = W / 2 + Math.cos(R.after * 0.7) * W * 0.3;
      mouse.y = H / 2 + Math.sin(R.after * 0.9) * H * 0.3;
    } else if (state === 'levelup' && offers.length) chooseOffer(0);
    else if (state === 'shop') closeShop();
    else if (state === 'pause') state = 'play';
  }

  /* --- every attempt counts --- */
  var _gameOver = gameOver;
  gameOver = function () {
    var out = _gameOver.apply(this, arguments);
    R.holdScore = null; R.line = null;
    keep();
    return out;
  };

  /* --- the crack, in the wall --- */
  var _drawArena = drawArena;
  drawArena = function () {
    var out = _drawArena.apply(this, arguments);
    if (state === 'play' || state === 'pause' || state === 'levelup' || state === 'shop' || state === 'dead') {
      var s = span();
      art('crack', ctx, { x0: s.x0, x1: s.x1, cx: s.cx, y: s.y, half: s.half, w: C.w, p: C.p, held: held() && !R.broke,
                          hits: R.hits.map(function (h) { return { x: h.x, age: R.t - h.t }; }),
                          broke: R.broke, runs: C.runs, t: uiTime, world: { w: WORLD.w, h: WORLD.h } });
    }
    return out;
  };

  /* --- his voice, over everything, in the first build's type --- */
  var _render = render;
  render = function () {
    var out = _render.apply(this, arguments);
    if (R.line) art('lockVoice', ctx, W, H, { text: R.line.text, age: R.line.t, life: OPO_CRACK.lineLife, i: R.line.i });
    return out;
  };

  /* A dev account can lift the lock by hand ([\]), for real trouble. The
     game around the frame decides whether this is one. */
  addEventListener('keydown', function (e) {
    if (e.key === '\\' && host) { try { host.devLift(); } catch (err) {} }
  });

  // what the game around the frame, and the tests, may read
  window.OPO_COPY = {
    canvas: cv,
    crack: function () { return { p: C.p, w: C.w, runs: C.runs, broke: C.broke }; },
    run: function () { return { t: R.t, held: held(), broke: R.broke, line: R.line ? R.line.text : null }; },
    state: function () { return state; },
    tune: OPO_CRACK,
    span: span
  };
  if (host) { try { host.ready(window.OPO_COPY); } catch (e) {} }
})();
