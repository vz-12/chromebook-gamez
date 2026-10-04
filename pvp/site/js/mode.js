/* ===========================================================================
   VOIDRUNNER PvP — PvP mode (PVP-PLAN.md, Phase 3)

   Runs on PvP's play page before the game's engine (scripts/pvp-build.mjs).
   Setting window.VR_PVP is what boots the engine sealed: see "PvP mode" at
   the top of the engine. This file holds what the lobby handed in and the
   whole table of hooks the engine calls, each with what it does when nothing
   else has filled it in: the game's own behaviour. The other files fill in
   what they own:

     duel.js     turn, as, owner, hit, kill    the fight between two pilots
     cards.js    cards, hello, peerHello       the card pool each player draws from
     maps.js     maps                          the arena, clean or infested
     rounds.js   down, levelUp, hud, draw,     the match: rounds, picks, the HUD
                 idle, hash
     practice.js, match.js                     the kinds of play (`modes`)
     preview.js                                the art hooks with sample data
                                               (/play/?preview=belt or =result)

   The engine's names (resetGame, P, state, Save, CHARS, applyChar…) are its
   own globals. They are read only from inside the hooks, which the engine
   calls after its whole script has run.
   ========================================================================= */
(() => {
  'use strict';

  /* What the lobby chose for this tab: { mode, pilot, me, role?, code?,
     queue?, match? }, where `me` is /api/pvp/me as the lobby read it (the
     account, its unlocks, its loadouts) and `match` the one the queue found
     (pvp/src/objects.js, Matchmaker: its id, this side, its rules, both
     sides). Arriving here any other way goes to the lobby first; the
     engine still boots sealed meanwhile, so it fetches nothing on the way. */
  let hand = null;
  const preview = (/[?&]preview=(belt|result)(?:&|$)/.exec(location.search) || [])[1];
  if (preview) {
    // the art previews (preview.js): no lobby, no account, nothing fetched
    const all = { pilots: ['runner', 'ember', 'hacker', 'melee'], awake: [], ups: [] };
    hand = { mode: 'preview', preview, pilot: 'runner',
             me: { account: { name: 'preview', display: 'YOU' }, unlocks: null, loadouts: { casual: all, ranked: all } } };
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
    return (L && L[(m && m.loadout) || 'casual']) || { pilots: ['runner'], awake: [], ups: [] };
  };

  const M = window.VR_PVP = {
    hand: ok ? hand : null,
    modes,
    loadout,

    // charOpen: the loadout decides which pilots there are
    pilotOpen: id => loadout().pilots.includes(id),

    /* The engine has booted sealed, with a blank profile in memory. It is made
       the account's here: its name, which pilots are awake, and the cleared
       challenges, which put its reward upgrades in the card pool. */
    start() {
      if (!ok || !mode()) return;
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

    // back to the lobby, once
    leave() {
      if (M.leaving) return;
      M.leaving = true;
      location.href = '/';
    }
  };
})();
