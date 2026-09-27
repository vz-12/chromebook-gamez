/* The numbers the OVERDRIVE kit's art reads, as the game has them.

   Generated from index.html (the line each one is on is given), so rerun the
   generator rather than editing this: the game never reads this file. It is a
   reference for the design harnesses and lives in prepatch only — never copy
   it to C:\game, which publishes every file in it.
*/
const OD_VALUES = {
  // heat
  VENT_MAX: 100,            // index.html:1263
  OD_RUN_LEN: 60,           // index.html:1274
  // Z · SCORCHED EARTH
  SCORCH_COST: 30,          // index.html:16598  heat
  SCORCH_T: 2,              // index.html:16599  the burst, start to finish (user)
  SCORCH_UP: 0.18,          // index.html:16600  the beam swelling to full, inside the burst
  SCORCH_DOWN: 0.3,         // index.html:16601  and closing, at the end of it
  SCORCH_LEN: 2.2,          // index.html:16602  times the lance's reach
  SCORCH_WIDE: 2.5,         // index.html:16603  times the lance's width
  SCORCH_DPS: 450,          // index.html:16604  a second, per body, before upgrades; flat along the beam
  SCORCH_PROC: 0.18,        // index.html:16605  burn and numbers, on the lance's own beat
  // the scores (Z, BRAND, the ring)
  SCAR_LIFE: 6,             // index.html:16606  seconds a score burns once its beam is out
  SCAR_HALF: 0.6,           // index.html:16607  what a score bites, as a share of the beam's half-width
  SCAR_DPS: 60,             // index.html:16608  a second, before upgrades
  SCAR_TICK: 0.25,          // index.html:16609
  SCAR_STEP: 14,            // index.html:16610  px the beam moves before the next stamp is laid
  OD_SCARS_MAX: 12,         // index.html:16512
  // X · PYROTECHNICS
  PYRO_COST: 45,            // index.html:16731  heat
  PYRO_R: 120,              // index.html:16732  the circle's radius
  PYRO_DELAY: 1,            // index.html:16733  from the circle to the column (user)
  PYRO_DMG: 1400,           // index.html:16734  everything in it, once, before upgrades
  PYRO_AFTER: 1.2,          // index.html:16735  the column standing and the floor cooling, after it rises: art only
  // C · BRAND
  STRIKE_COST: 60,          // index.html:16823  heat
  STRIKE_WINGS: 0.35,       // index.html:16824
  STRIKE_RISE: 0.5,         // index.html:16825
  STRIKE_CUT_OUT: 0.2,      // index.html:16834  a cut: fading to black
  STRIKE_CUT_HOLD: 0.08,    // index.html:16835  black, while the view changes under it
  STRIKE_CUT_IN: 0.25,      // index.html:16836  and fading back in on the other side
  STRIKE_AIM_MAX: 6,        // index.html:16826  seconds up there before it cuts at the cursor
  STRIKE_SLOW: 0.2,         // index.html:16827  the room, while the pilot aims
  STRIKE_TELL: 0.3,         // index.html:16828
  STRIKE_ON: 0.15,          // index.html:16829  the foot landing at a stroke's start, before it moves
  STRIKE_SPEED: 1600,       // index.html:16830  px a second, the foot driven along a stroke
  STRIKE_OFF: 0.2,          // index.html:16831  and going out at the stroke's end
  STRIKE_GAP: 0.15,         // index.html:16832  dark, between the two strokes
  STRIKE_LAND: 0.5,         // index.html:16833
  STRIKE_SIZE: 0.75,        // index.html:16837  of the arena, each way (user)
  STRIKE_WIDE: 6,           // index.html:16838  the foot, times Z's width (user)
  STRIKE_PASS: 700,         // index.html:16839  a body on the line, one pass over it, before upgrades
  STRIKE_STAMP: 40,         // index.html:16840  px of trench to a stamp, so it cools from where it started
  // COMBO 1 · BRAND → Z → X
  BRAND_WINDOW: 0.8,        // index.html:17088  after the X, and after the wall, to press the next key
  BRAND_WALL_T: 20,         // index.html:17089  the wall stands this long (user)
  BRAND_NUKE_DMG: 4000,     // index.html:17090  variation 2: everything inside, once, before upgrades (user)
  BRAND_SCORCH: 0.5,        // index.html:17091  a stack of burn this often, to a body pressed against the wall
  // V · FUSION CORE
  FUSION_COST: 100,         // index.html:17267  heat: all of it
  FUSION_T: 20,             // index.html:17268  seconds as a star
  FUSION_IN: 1.1,           // index.html:17272  the change into the IFRIT; the user's art plays it over this
  FUSION_OUT: 0.9,          // index.html:17273  and back out, at the end
  FUSION_AURA_R: 120,       // index.html:17269  what the aura burns, from the hull's centre
  FUSION_AURA_DPS: 90,      // index.html:17270  a second, per body, before upgrades
  FUSION_AURA_TICK: 0.25,   // index.html:17271
  STAR_RATE: 2.2,           // index.html:17274  stars a second, at the hull's starting fire rate
  STAR_SPD: 560,            // index.html:17275
  STAR_R: 18,               // index.html:17276  a star's radius, empty; it swells round what it takes
  STAR_LIFE: 1.4,           // index.html:17277  the longest it flies before it goes up anyway
  STAR_SEEK: 340,           // index.html:17278  it bends toward a body this close ahead of it
  STAR_TURN: 3.2,           // index.html:17279  radians a second it can bend
  STAR_HOLD: 5,             // index.html:17280  bodies it can take in (user)
  STAR_FUSE: 0.45,          // index.html:17281  from the first body taken to the blast
  STAR_CORE: 220,           // index.html:17282  to each body inside it, as it goes up, before upgrades
  STAR_BLAST: 110,          // index.html:17283  to everything in the blast, inside or not, before upgrades
  STAR_BLAST_R: 110,        // index.html:17284  the blast, empty; each body inside adds STAR_BLAST_GROW
  STAR_BLAST_GROW: 16,      // index.html:17285
  STAR_SHOVE: 380,          // index.html:17286  what the blast throws a survivor outward with
  // burn
  BURN_CAP: 10,             // index.html:33528
  BURN_TIME: 3.2,           // index.html:33526
  // the lance (what the widths are multiples of)
  LANCE_HALF: 11,           // index.html:1225  hitbox half-width at full flare, before Heavy Rounds
  // worked out, not set
  Z_HALF_WIDTH: 27.5,       // Z's beam, half its width at full: LANCE_HALF × SCORCH_WIDE (Heavy Rounds widen it)
  BRAND_FOOT_R: 165,        // BRAND's foot of fire, its radius: Z's half-width × STRIKE_WIDE (odStrikeR())
  RING_R: 638,              // COMBO 1's circle and wall, and the giant column's radius: STRIKE_SIZE / 2 of the room's shorter side (the standard 2400×1700 room; 368 in THE OTHER's 1320×980)
  POV_ZOOM: 0.398,          // camZoom from above, in that room on a 1280×720 screen (odStrikeZoom())
  STAR_BLAST_R_FULL: 190,   // a full star's blast: STAR_BLAST_R + STAR_BLAST_GROW × STAR_HOLD
  RING_TRACE_S: 2.85,       // seconds for the foot to run the whole ring, landing to going out
};
