/* ===========================================================================
   VOIDRUNNER PvP — the cards (PVP-PLAN.md, Phase 3 step 3)

   What a pilot can be dealt in a match. The game's own card pool, less:

     · the cards that win a fight outright: an instant kill is never skill
       (BANNED, the first line)
     · the ones that break with two players and no waves: a card about "every
       third wave" is on forever when there are no waves, one about the hits
       taken "this wave" never resets
     · the ones with nothing to do here: credits, drops, experience
     · and any card that would put a fifth bullet in a shot (MAX_SHOTS)

   plus each player's own reward upgrades, from their own account, never the
   host's: the handshake carries both lists (hello), so both machines deal
   from the same pool, card for card.

   Nothing here is the whole of fairness: the duel's caps (duel.js) are what
   make sure no card, or pile of cards, wins a round in one blow.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const BANNED = new Set([
    'exec', 'u_unwritten',                                     // instant kills: Executioner's Mark, Erasure
    'u_ascetic', 'u_overclock', 'u_famine', 'u_null',          // broken without waves: one-point hull, Night Shift, Grudge, Deadline
    'u_static', 'btime',                                       // Feedback Loop pings between two pilots; Bullet Time slows them both
    'mag', 'xp', 'scav', 'luck', 'siph', 'u_infest', 'u_vermin', 'u_promotion',   // drops, credits, experience
    'u_austerity', 'u_pauper', 'u_tax',                        // the shop
    'u_ironman', 'u_swarmlord', 'u_clock', 'u_marathon', 'u_burn', 'u_amalgam', 'u_mirrorfight'   // bosses and waves
  ]);
  M.BANNED = BANNED;

  // bullets in one shot: count per barrel, times the barrels, plus the ones fired behind
  M.MAX_SHOTS = 4;
  const MORE = { multi: [1, 0, 0], para: [0, 1, 0], back: [0, 0, 1] };   // what each adds: count, parallel, back
  M.shots = p => (p.count || 1) * (1 + (p.parallel || 0)) + (p.back || 0);

  const match = () => (typeof RUN !== 'undefined' && RUN.pvp) || null;
  const clean = v => (Array.isArray(v) ? v.filter(s => typeof s === 'string' && /^[\w-]{1,40}$/.test(s)).slice(0, 512) : []);

  // each player's reward upgrades: this machine's from its account's loadout for the mode, the other's from its hello
  const own = () => clean(M.loadout().ups);
  M.upsOf = k => (k === pilotMine() ? own() : clean(M.peer && M.peer.ups));
  M.hello = () => ({ v: 1, ups: own() });
  M.peerHello = d => { M.peer = { ups: clean(d && d.ups) }; };

  // offerPool: in a match, PvP's pool; elsewhere (practice) the game's
  M.cards = base => {
    if (!match()) return null;
    const mine = M.upsOf(P.pid);
    return base.filter(u => {
      if (BANNED.has(u.id)) return false;
      if ((u.lock || u.need) && !mine.includes(u.id)) return false;
      const m = MORE[u.id];
      if (m && M.shots({ count: P.count + m[0], parallel: P.parallel + m[1], back: P.back + m[2] }) > M.MAX_SHOTS) return false;
      return true;
    });
  };
})();
