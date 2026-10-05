/* ===========================================================================
   VOIDRUNNER PvP — the art previews (/play/?preview=belt, ?preview=result)

   art.js's hooks on the real engine (its sectors, its pilots' hulls), with
   no lobby and no match, for drawing them: the belt spinning, over and over,
   and the result screen with sample data. A bar along the top switches
   between them and through the outcomes; the referee's verdict (and in
   ranked the rating) arrives a moment after the screen shows, as it does in
   a match. The button along the bottom is where the match's own sits.

   Nothing here runs in a match: mode.js only picks this mode when the
   address asks for a preview, and it boots the engine sealed, asking the
   network for nothing.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const VERDICT_AFTER = 1.5;       // seconds, as a referee might take
  const S = { show: 'result', outcome: 'won', queue: 'ranked' };
  let bar = null;                  // the switches along the top
  let slot = null;                 // where the match's button sits, on the result only

  const pilot = (id, name, awake) => {
    const c = CHARS.find(x => x.id === id) || CHARS[0];
    return { name, pilot: c.id, pilotName: c.n, col: c.col, awake, bonus: 0 };
  };
  // who is fighting and what kind of match (match.js's M.versus), as samples
  const versus = (a, b) => ({
    me: pilot(a, 'YOU', true), them: pilot(b, 'A_RIVAL', false),
    bestOf: S.queue === 'ranked' ? 5 : 3, queue: S.queue,
    league: S.queue === 'ranked' ? { id: 'gold', n: 'GOLD' } : null, rated: S.queue === 'ranked',
    hull: id => hullPath(id)
  });
  // a belt with two pilots drawn at random, so THE HACKER's odds come up as they would
  const IDS = ['runner', 'ember', 'hacker', 'melee'];
  function belt() {
    const a = IDS[Math.floor(Math.random() * IDS.length)], b = IDS[Math.floor(Math.random() * IDS.length)];
    const hackers = (a === 'hacker' ? 1 : 0) + (b === 'hacker' ? 1 : 0), odds = M.maps.odds(hackers);
    return Object.assign({ dur: 4.8 }, M.maps.belt({ map: Math.floor(Math.random() * M.maps.list().length),
                                                    infested: Math.random() < odds, odds, hackers }), versus(a, b));
  }
  function result() {
    const won = S.outcome === 'won' || S.outcome === 'left', bestOf = S.queue === 'ranked' ? 5 : 3;
    const rounds = S.outcome === 'left' ? [true, false]
      : bestOf === 5 ? (won ? [true, false, true, true] : [false, true, false, false])
      : (won ? [true, false, true] : [false, true, false]);
    const b = M.maps.belt({ map: 2, infested: true, odds: 0.75, hackers: 1 });
    return Object.assign(versus('hacker', 'ember'), {
      outcome: S.outcome,
      score: [rounds.filter(x => x).length, rounds.filter(x => !x).length], bestOf,
      time: 41.3 * rounds.length + 6.2,
      rounds: rounds.map((x, i) => ({ won: x, at: 41.3 * (i + 1), left: 0.18 + 0.17 * i })),
      dealt: won ? [1840, 1215] : [1215, 1840],
      map: b.maps[b.pick], infested: true,
      verdict: null, rating: null
    });
  }

  // what is on screen now
  function open() {
    M.shown = null; M.preview = null;
    if (S.show === 'belt') M.preview = { at: Date.now(), belt: belt() };
    else M.shown = { at: Date.now(), r: result() };
    if (slot) slot.style.display = S.show === 'belt' ? 'none' : '';
    if (bar) for (const btn of bar.querySelectorAll('button[data-k]'))
      btn.classList.toggle('on', btn.dataset.k === S.show || btn.dataset.k === S.outcome && S.show === 'result' || btn.dataset.k === S.queue);
  }
  M.previewShow = (what, v) => {
    if (what === 'belt') S.show = 'belt';
    else if (what === 'queue') S.queue = v;          // ranked or casual, on whichever is showing
    else if (what) { S.outcome = what; S.show = 'result'; }
    open();
  };

  const CSS = `
#pvp-preview{position:fixed;left:0;right:0;top:0;z-index:12;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:10px;
  font:700 10px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.12em}
#pvp-preview button{padding:7px 11px;border-radius:999px;cursor:pointer;background:rgba(8,13,22,.85);color:#94a3b8;
  border:1px solid rgba(100,116,139,.5);font:inherit;letter-spacing:inherit}
#pvp-preview button.on{color:#f472b6;border-color:#f472b6}
#pvp-preview-slot{position:fixed;left:50%;bottom:5vh;transform:translateX(-50%);z-index:11;padding:10px 18px;border-radius:7px;
  border:1px dashed rgba(103,232,249,.5);color:rgba(103,232,249,.7);font:700 11px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.14em;
  pointer-events:none}`;

  function build() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    bar = document.createElement('div');
    bar.id = 'pvp-preview';
    const add = (label, k, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.k = k;
      b.addEventListener('click', fn);
      bar.appendChild(b);
    };
    add('BELT', 'belt', () => M.previewShow('belt'));
    for (const [label, k] of [['VICTORY', 'won'], ['DEFEAT', 'lost'], ['OPPONENT LEFT', 'left'], ['NO CONTEST', 'void']])
      add(label, k, () => M.previewShow(k));
    add('RANKED', 'ranked', () => M.previewShow('queue', 'ranked'));
    add('CASUAL', 'casual', () => M.previewShow('queue', 'casual'));
    add('REPLAY', 'replay', open);
    // keys typed here are the preview's, never the game's
    for (const t of ['keydown', 'keyup']) bar.addEventListener(t, e => e.stopPropagation());
    document.body.appendChild(bar);
    slot = document.createElement('div');
    slot.id = 'pvp-preview-slot';
    slot.textContent = 'BACK TO THE LOBBY';
    document.body.appendChild(slot);
  }

  M.modes.preview = {
    start() {
      state = 'pvp';
      S.show = M.hand.preview === 'belt' ? 'belt' : 'result';
      build();
      open();
    },
    frame() {
      const now = Date.now();
      // the belt, again and again
      if (M.preview && (now - M.preview.at) / 1000 > M.preview.belt.dur + 2) M.preview = { at: now, belt: belt() };
      // the referee's word, a moment after the screen shows
      const r = M.shown && M.shown.r;
      if (r && !r.verdict && (now - M.shown.at) / 1000 > VERDICT_AFTER) {
        const won = r.outcome === 'won' || r.outcome === 'left';
        r.verdict = { v: r.outcome === 'void' ? 'void' : r.outcome === 'left' ? 'forfeit' : 'played', won: r.outcome === 'void' ? null : won };
        if (r.rated && r.outcome !== 'void') r.rating = { before: 1534, after: won ? 1551 : 1519, games: 9, league: 'gold', left: 0 };
      }
    }
  };
})();
