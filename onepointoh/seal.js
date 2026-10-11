/* ===========================================================================
   ONE POINT OH — THE SEAL (ONE-POINT-OH-PLAN.md, "How the copy runs")

   Runs in the copy's frame (onepointoh/first.html), before the first build's
   own script, and changes nothing in it. The first build was written for a
   site that no longer exists, and as committed it would do harm here. Three
   seals, all of them in this frame's own window, so the game around it is
   never touched:

     1. THE SAVE. It saves under today's key (voidrunner_save_v1), and its
        merge keeps nine fields, so a sync would strip a modern save. Its two
        keys are given keys of the lock's own (OPO_KEYS), and it may write
        nothing else: a key outside the lock's is never read or written.
     2. THE BOARD. It posts every run to /api/leaderboard, today's Worker.
        The post never leaves the frame. /api/leaderboard is answered here
        from the lock's own runs (voidrunner_opo_board_v1), so its GLOBAL TOP
        5 is the only world it has: yours. Every other request is refused.
     3. FIREPROOF. It loads its database from esm.sh. The page's
        Content-Security-Policy refuses that (scripts/opo-build.mjs), so it
        keeps to the browser, as it always did offline.

   It also hands the first build its callsign, once, from the game around it
   (OPO_HOST.name), so the lock opens on the menu rather than on a name.

   OPO_SEAL is for the tests (npm run test:opo): what was refused, by kind.
   ========================================================================= */
(function () {
  'use strict';
  // the first build's keys, and the lock's own for them
  var OPO_KEYS = { voidrunner_save_v1: 'voidrunner_opo_save_v1', voidrunner_best: 'voidrunner_opo_best_v1' };
  var BOARD_KEY = 'voidrunner_opo_board_v1';
  var OURS = /^voidrunner_opo_/;
  var refused = { keys: [], fetch: [], other: [] };
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };

  /* 1. THE SAVE. Storage.prototype in this window only: the game around the
     frame has a window of its own and never sees these. */
  var S = window.Storage && Storage.prototype;
  if (S) {
    var get = S.getItem, set = S.setItem, del = S.removeItem;
    var map = function (k) { k = String(k); return own(OPO_KEYS, k) ? OPO_KEYS[k] : k; };
    S.getItem = function (k) {
      var m = map(k);
      if (!OURS.test(m)) { refused.keys.push('read ' + k); return null; }
      return get.call(this, m);
    };
    S.setItem = function (k, v) {
      var m = map(k);
      if (!OURS.test(m)) { refused.keys.push('write ' + k); return; }
      return set.call(this, m, v);
    };
    S.removeItem = function (k) {
      var m = map(k);
      if (!OURS.test(m)) { refused.keys.push('remove ' + k); return; }
      return del.call(this, m);
    };
    S.clear = function () { refused.keys.push('clear'); };
    S.key = function () { return null; };
  }
  var store = (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var read = function (k, d) { try { var t = store && store.getItem(k); return t ? JSON.parse(t) : d; } catch (e) { return d; } };
  var write = function (k, v) { try { if (store) store.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // the callsign, from the game around the frame, into a save that has none
  try {
    var host = window.parent !== window && window.parent.OPO_HOST;
    var name = host && typeof host.name === 'function' ? String(host.name() || '').slice(0, 14) : '';
    var mine = read('voidrunner_opo_save_v1', null);
    if (name && !(mine && mine.name)) write('voidrunner_opo_save_v1', Object.assign(mine || {}, { name: name }));
  } catch (e) {}

  /* 2. THE BOARD. The first build's two calls, answered from the lock's own
     runs: GET the top, and POST a run. Its rank is the run's place among
     them. Anything else is refused, never fetched. */
  var KEEP = 20;
  var clean = function (r) {
    var n = function (v) { v = Number(v); return isFinite(v) && v >= 0 ? Math.floor(v) : 0; };
    return { name: String(r.name || '').slice(0, 14), score: n(r.score), wave: n(r.wave),
             sector: String(r.sector || '').slice(0, 24), loop: n(r.loop), level: n(r.level),
             kills: n(r.kills), time: n(r.time), at: Date.now() };
  };
  var answer = function (status, body) {
    var text = JSON.stringify(body);
    if (typeof Response === 'function') return new Response(text, { status: status, headers: { 'content-type': 'application/json' } });
    return { ok: status >= 200 && status < 300, status: status, json: function () { return Promise.resolve(JSON.parse(text)); } };
  };
  var board = function (opt) {
    var runs = read(BOARD_KEY, []);
    if (!Array.isArray(runs)) runs = [];
    if (opt && String(opt.method || 'GET').toUpperCase() === 'POST') {
      var run;
      try { run = clean(JSON.parse(String(opt.body || '{}'))); } catch (e) { return answer(400, { error: 'bad run' }); }
      runs.push(run);
      runs.sort(function (a, b) { return b.score - a.score; });
      runs = runs.slice(0, KEEP);
      write(BOARD_KEY, runs);
      var rank = runs.indexOf(run) + 1;
      return answer(200, { ok: true, top: runs.slice(0, 5), rank: rank > 0 ? rank : null });
    }
    return answer(200, { top: runs.slice(0, 5) });
  };
  var at = function (u) { try { return new URL(String(u && u.url || u), location.href); } catch (e) { return null; } };
  window.fetch = function (u, opt) {
    var url = at(u);
    if (url && url.origin === location.origin && url.pathname === '/api/leaderboard') return Promise.resolve(board(opt));
    refused.fetch.push(String(u && u.url || u));
    return Promise.reject(new TypeError('sealed: the first build reaches nothing outside its frame'));
  };
  // nothing else it never used gets to reach out either
  try { if (navigator.sendBeacon) navigator.sendBeacon = function (u) { refused.other.push('beacon ' + u); return false; }; } catch (e) {}
  var shut = function (what) { return function () { refused.other.push(what); throw new TypeError('sealed: ' + what); }; };
  try { window.XMLHttpRequest = shut('XMLHttpRequest'); } catch (e) {}
  try { window.WebSocket = shut('WebSocket'); } catch (e) {}
  try { window.EventSource = shut('EventSource'); } catch (e) {}

  window.OPO_SEAL = { keys: OPO_KEYS, board: BOARD_KEY, refused: refused };
})();
