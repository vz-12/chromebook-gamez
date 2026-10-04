/* ===========================================================================
   VOIDRUNNER PvP — PvP mode (PVP-PLAN.md, Phase 3)

   Runs on PvP's play page before the game's engine (scripts/pvp-build.mjs).
   Setting window.VR_PVP is what boots the engine sealed: see "PvP mode" at
   the top of the engine. This file holds what the lobby handed in and the
   hook table the engine calls. Each kind of play (practice.js, later the
   match) registers itself in `modes` and fills in the hooks it needs.

   The engine's names (resetGame, P, state, Save, CHARS, applyChar…) are its
   own globals. They are read only from inside the hooks, which the engine
   calls after its whole script has run.
   ========================================================================= */
(() => {
  'use strict';

  /* What the lobby chose for this tab: { mode, pilot, me }, where `me` is
     /api/pvp/me as the lobby read it (the account, its unlocks, its
     loadouts). Arriving here any other way goes to the lobby first; the
     engine still boots sealed meanwhile, so it fetches nothing on the way. */
  let hand = null;
  try { hand = JSON.parse(sessionStorage.getItem('vr_pvp_play') || 'null'); } catch (e) {}
  const ok = !!(hand && hand.me && hand.me.loadouts && typeof hand.mode === 'string');
  if (!ok) location.replace('/');

  const modes = {};
  const mode = () => (ok && Object.prototype.hasOwnProperty.call(modes, hand.mode) ? modes[hand.mode] : null);
  // the loadout this mode flies under: casual's (everything owned) unless the mode says
  const loadout = () => {
    const m = mode(), L = ok ? hand.me.loadouts : null;
    return (L && L[(m && m.loadout) || 'casual']) || { pilots: ['runner'], awake: [], ups: [] };
  };

  window.VR_PVP = {
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

    // back to the lobby, once
    leave() {
      if (window.VR_PVP.leaving) return;
      window.VR_PVP.leaving = true;
      location.href = '/';
    }
  };
})();
