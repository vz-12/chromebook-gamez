/* ===========================================================================
   VOIDRUNNER PvP — the maps (PVP-PLAN.md, Phase 3 step 3)

   A match is fought on one of the game's own sectors, drawn at random when it
   starts, in one of two variations:

     clean      just the two of you
     infested   the sector's own enemies keep arriving, a few at a time, and
                go for whoever is nearer. THE HACKER takes them for its army.

   Even odds, tipped to 75% infested when one pilot is THE HACKER (it needs
   bodies) and to certain when both are. The draw is the run's own seeded
   roll, so both machines draw the same. The arena is sized for two, in the
   middle of the sector, with no terrain hazards: the fight is the pilots'.

   The draw is shown as a belt (art.js, PVP_ART.belt), with this list.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const ARENA = { w: 1600, h: 1050 };
  const WILD_MAX = 6;                    // the room's own, alive at once, on an infested map

  const maps = M.maps = {
    ARENA,
    // the sectors a duel can be on: the five of the rotation, and the first two of the fracture
    list: () => STAGES.concat(ALT_STAGES.slice(0, 2)),
    odds: hackers => (hackers >= 2 ? 1 : hackers === 1 ? 0.75 : 0.5),

    // the draw, at the match's first step, on both machines alike
    pick() {
      const L = maps.list();
      const index = simRndi(L.length);
      let hackers = 0;
      for (let k = 0; k < 2; k++) { const p = pilotP(k); if (p && p.charId === 'hacker') hackers++; }
      const odds = maps.odds(hackers);
      return { index, odds, hackers, infested: simRand() < odds };
    },

    // the sector's look, its arena cut to size, and nothing on the floor
    apply(m) {
      enterStage(maps.list()[m.map]);
      hazards.length = 0;
      arenaShrinkTo(WORLD.w / 2, WORLD.h / 2, ARENA.w, ARENA.h);
      arena.x0 = arena.tx0; arena.y0 = arena.ty0; arena.x1 = arena.tx1; arena.y1 = arena.ty1;
    },

    // what the belt shows (art.js)
    belt(m) {
      return {
        maps: maps.list().map(s => ({ name: s.name, tag: s.tag, accent: s.accent, bg: s.bg, grid: s.grid, wall: s.wall })),
        pick: m.map, infested: m.infested, odds: m.odds, hackers: m.hackers
      };
    },

    // an infested room keeps sending, away from both pilots
    spawn(m, dt) {
      if (!m.infested) return;
      m.spawnT -= dt;
      if (m.spawnT > 0) return;
      m.spawnT = simRnd(4.2, 2.6);
      if (threatCount() - 2 >= WILD_MAX) return;           // the two stand-ins count as threats
      const a = pilotP(0), b = pilotP(1);
      for (let tries = 0; tries < 20; tries++) {
        const x = simRnd(arena.x1 - 70, arena.x0 + 70), y = simRnd(arena.y1 - 70, arena.y0 + 70);
        if (len(x - a.x, y - a.y) < 380 || len(x - b.x, y - b.y) < 380) continue;
        const e = spawnEnemy(pickEnemyType(), x, y, { elite: false });
        ringFx(x, y, 4, 46, e.col, 0.4, 2);
        return;
      }
    }
  };
})();
