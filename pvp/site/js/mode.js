/* ===========================================================================
   VOIDRUNNER PvP — PvP mode (PVP-PLAN.md, Phase 3)

   Runs on PvP's play page before the game's engine (scripts/pvp-build.mjs).
   Setting window.VR_PVP is what boots the engine sealed: see "PvP mode" at
   the top of the engine. This file holds what the lobby handed in and the
   whole table of hooks the engine calls, each with what it does when nothing
   else has filled it in: the game's own behaviour. The other files fill in
   what they own:

     duel.js     turn, as, owner, hit, kill,   the fight between two pilots
                 near, heat
     cards.js    cards, hello, peerHello       the card pool each player draws from
     maps.js     maps                          the arena, clean or infested
     rounds.js   down, levelUp, hud, draw,     the match: rounds, picks, the HUD
                 idle, hash
     practice.js, match.js, bot.js             the kinds of play (`modes`)
     onair.js    played                        a match on air: its fight, to the relay
     watch.js    steps, played, cam            a match watched (/play/?watch=<match>)
     replay.js   zoom, bare, frameSize         a replay, for the trailer (/play/?replay=<file>)
     preview.js                                the art hooks with sample data
                                               (/play/?preview=belt or =result)

   The engine's names (resetGame, P, state, Save, CHARS, applyChar…) are its
   own globals. They are read only from inside the hooks, which the engine
   calls after its whole script has run.
   ========================================================================= */
(() => {
  'use strict';

  /* What the lobby chose for this tab: { mode, pilot, me, role?, code?,
     queue?, match?, bot?, search? }, where `me` is /api/pvp/me as the lobby
     read it (the account, its unlocks, its loadouts), `match` the one the
     queue found (pvp/src/objects.js, Matchmaker: its id, this side, its
     rules, both sides), and `bot` and `search` the bot it found instead
     while it had nobody, and the ticket still waiting (bot.js). Arriving here any other way goes to the lobby first; the
     engine still boots sealed meanwhile, so it fetches nothing on the way. */
  let hand = null;
  const preview = (/[?&]preview=(belt|result)(?:&|$)/.exec(location.search) || [])[1];
  const watching = (/[?&]watch=([0-9a-f]{32})(?:&|$)/.exec(location.search) || [])[1];
  const replaying = (/[?&]replay=([\w.-]{1,80})(?:&|$)/.exec(location.search) || [])[1];
  if (preview) {
    // the art previews (preview.js): no lobby, no account, nothing fetched
    const all = { pilots: ['runner', 'ember', 'hacker', 'melee'], awake: [], ups: [] };
    hand = { mode: 'preview', preview, pilot: 'runner',
             me: { account: { name: 'preview', display: 'YOU' }, unlocks: null, loadouts: { casual: all, ranked: all } } };
  } else if (watching || replaying) {
    /* A match watched (watch.js), or a replay of one (replay.js: its file,
       chosen on the page, on the build it was recorded on): no lobby and no
       account either. What it flies, and who, comes from the match's own
       broadcast. */
    const all = { pilots: ['runner', 'ember', 'hacker', 'melee'], awake: [], ups: [] };
    hand = { mode: 'watch', watch: watching || null, replay: replaying || null, pilot: 'runner',
             me: { account: { name: 'viewer', display: 'VIEWER' }, unlocks: null, loadouts: { casual: all, ranked: all } } };
  } else {
    try { hand = JSON.parse(sessionStorage.getItem('vr_pvp_play') || 'null'); } catch (e) {}
  }
  const ok = !!(hand && hand.me && hand.me.loadouts && typeof hand.mode === 'string');
  if (!ok) location.replace('/');

  const modes = {};
  const mode = () => (ok && Object.prototype.hasOwnProperty.call(modes, hand.mode) ? modes[hand.mode] : null);
  /* The loadout this mode flies under: casual's (everything owned) unless the
     mode says. A queued match flies exactly what the server put in it for
     this side: its pilot, awake or not, and its reward upgrades. */
  const loadout = () => {
    const q = ok && hand.match && Array.isArray(hand.match.sides) ? hand.match.sides[hand.match.side] : null;
    if (q) return { pilots: [q.pilot], awake: q.awake ? [q.pilot] : [], ups: Array.isArray(q.ups) ? q.ups : [] };
    const m = mode(), L = ok ? hand.me.loadouts : null;
    const lo = (L && L[(m && m.loadout) || 'casual']) || { pilots: ['runner'], awake: [], ups: [] };
    // and the hidden pilots this account holds, which the lobby brought along (outside, below)
    return Object.assign({}, lo, { pilots: lo.pilots.concat(outside().map(o => o.id)) });
  };
  /* Hidden pilots (OUTSIDE PILOTS in the engine; pvp/src/hidden.js): the
     lobby fetched this account's own from the vault and handed their code in
     ({ id, n, h, text }), since this page boots sealed and fetches nothing on
     its own; they are run before a pilot is picked (start). An opponent's is
     fetched when its hello names it (outsideFetch), once this side is in the
     match, which is what lets the Worker hand it over. */
  const outside = () => (ok && Array.isArray(hand.outside) ? hand.outside.filter(o => o && typeof o.id === 'string' && typeof o.text === 'string') : []);

  const M = window.VR_PVP = {
    hand: ok ? hand : null,
    modes,
    loadout,

    // charOpen: the loadout decides which pilots there are
    pilotOpen: id => loadout().pilots.includes(id),

    // a match's length, said: one round against a hidden pilot in ranked (pvp/src/rules.js, HIDDEN)
    said: n => (n === 1 ? 'one round' : 'best of ' + n),

    /* The engine has booted sealed, with a blank profile in memory. It is made
       the account's here: its name, which pilots are awake, and the cleared
       challenges, which put its reward upgrades in the card pool. */
    start() {
      if (!ok || !mode()) return;
      for (const o of outside()) if (!OUTSIDE.by.has(o.id)) { try { Outside.run(o.id, o.text); } catch (e) { console.error('pvp: pilot ' + o.id, e); } }
      const p = Save.profile, L = loadout(), me = hand.me;
      p.name = me.account.display;
      p.awakened = {};
      for (const id of L.awake) p.awakened[id] = true;
      p.chal = ((me.unlocks && me.unlocks.chal) || []).slice();
      p.gfxSeen = GFX_VER;              // the game's what's-new note about effects is not PvP's to show
      Codex.load();
      const i = CHARS.findIndex(c => c.id === hand.pilot && L.pilots.includes(c.id));
      applyChar(i >= 0 ? i : 0);
      mode().start();
    },

    // updateWaves: what spawns is the mode's to say
    waves(dt) { const m = mode(); if (m && m.waves) m.waves(dt); },

    // once a frame: the mode's own screens, and its way out
    frame() { const m = mode(); if (m && m.frame) m.frame(); },

    /* ---- the rest of the table, as the game would have it ---- */
    turn: (k, fn) => fn(),             // whose turn it is (duel.js)
    as() {},                           // the world, acting for a pilot (duel.js)
    owner: () => null,                 // whose an effect made now is (duel.js)
    hit() {},                          // a stand-in struck (duel.js)
    near: c => c,                      // how close a stand-in counts for EMBER's vent (duel.js)
    heat: () => 0,                     // what a lance's hit on a stand-in pays EMBER's vent, as bodies (duel.js)
    kill() {},                         // a stand-in "killed" (duel.js)
    down: () => false,                 // a pilot out of health: false lets the game decide (rounds.js)
    levelUp: () => true,               // whether a level may be paid now (rounds.js)
    cards: () => null,                 // the card pool, or null for the game's (cards.js)
    hud: () => false,                  // drew the match in the run's score's place (rounds.js)
    draw() {},                         // PvP's own screens on the canvas (rounds.js)
    idle() {},                         // a step on PvP's own screens (rounds.js)
    hash() {},                         // the match, into lockstep's fingerprint (rounds.js)
    hello: () => ({}),                 // what this player's handshake carries (cards.js)
    peerHello() {},                    // and the other's (cards.js)
    steps: () => false,                // the frame's steps, played by PvP itself: false leaves them to lockstep (watch.js)
    played() {},                       // a step of the shared game just played, with both records (onair.js, watch.js)
    cam: () => null,                   // the pilot the camera follows, or null for the game's own choice (watch.js)
    zoom: z => z,                      // the camera's zoom, as the game would have it, or a replay's own (replay.js)
    bare: () => false,                 // a replay captured with the HUD off (replay.js)
    frameSize: () => null,             // a replay's fixed frame, { w, h, dpr }, or null for the window's (replay.js)

    // the other side's hidden pilot: its code, from the Worker, once this side is in the match (referee.js)
    async outsideFetch(id) {
      const R = M.ref;
      if (R && R.joining) await R.joining.catch(() => {});
      const mid = R && R.id;
      const r = await fetch('/api/pvp/pilot?id=' + encodeURIComponent(id) + (mid ? '&match=' + mid : ''), { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) throw new Error('no such pilot to fetch');
      const text = await r.text();
      const want = r.headers.get('x-vault-hash'), got = await Outside.hash(text);
      if (want && got && want !== got) throw new Error('not the text the Worker sent');
      return text;
    },

    // back to the lobby, once
    leave() {
      if (M.leaving) return;
      M.leaving = true;
      location.href = '/';
    }
  };
})();
