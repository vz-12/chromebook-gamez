/* ===========================================================================
   VOIDRUNNER PvP — practice (PVP-PLAN.md, Phase 3 step 1)

   Your pilot alone in the arena, with your account's awake forms and reward
   upgrades and nothing spawning: the first kind of play on PvP's page, and
   the proof that the engine runs there sealed. Escape opens the game's own
   pause screen; leaving it, or dying, goes back to the lobby.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  M.modes.practice = {
    loadout: 'casual',
    start() {
      resetGame();
      state = 'play';
      banner('PRACTICE   ·   ESC TO LEAVE', '#f472b6', 3.2);
    },
    // nothing spawns
    waves() {},
    frame() {
      if (state === 'menu' || state === 'dead') M.leave();
    }
  };
})();
