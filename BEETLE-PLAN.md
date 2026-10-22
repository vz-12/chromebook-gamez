# EMBER's signature skin: the blue beetle

Working title. A skin made by request for the October season's #1 ("ember"),
whose pilot is EMBER. This is not a dev skin. It is a new tier above all the
others: one pilot, one player, and a full art rework of both the base hull and
OVERDRIVE (new sprites, new animations, new effects).

Branch `beetle` (worktree C:\chromebook-beetle), local until it ships.

## What he asked for

- Neon blue, purple and black. Bright enough to read, with a glow.
- A thruster and wings (from his sketch).
- A mouth like the reference worm's: split jaws with fangs. It opens and
  closes as he fires.
- A segmented body trailing behind, like a wyrm. He called it optional; we
  said yes.
- Blue fire everywhere. The OVERDRIVE moves recoloured to blue fire.
- The lance becomes a blue/purple flamethrower, simpler than his reference.
- A boss killed with it turns to ash and blows away.
- Dashes leave a trail of tiny blue flames that is gone in under 2 s.
- Dressing the roster is optional.

The theme (user, 22 Oct): a blue beetle. A generic beetle, not the film. The
jaws become mandibles, the wings become elytra over flight membranes, and the
body becomes armoured segments.

The reference worm is Calamity's sprite. We take its idea (a split jaw lined
with fangs) and draw our own. Nothing is traced or lifted from it.

## The look

### Base: on EMBER's hull, any time

| Part | What it is |
|---|---|
| Head | The hull. Black chitin with a structural sheen that slides between electric blue and violet as the hull turns, the way a jewel beetle catches light. |
| Mandibles | Two serrated jaws at the nose, fangs lit cyan inside. They part as the lance charges and snap shut as it fires. EMBER's fire rate shortens the charge, so a faster build chatters faster. |
| Elytra | Wing cases over the wing sockets. Closed at rest, lifting a little in hard turns. In a dash they flick open and the membrane wings blur out. |
| Thruster | A blue jet at the exhaust that lengthens with speed. |
| Body | 6 to 8 armoured segments laid along the flight path, each with glowing spiracles (cyan and magenta), ending in a tail flare. Cosmetic only: same hitbox, drawn under bullets, so nothing can hide a telegraph. |
| Lance | A blue-violet flamethrower along the exact hit line. White-cyan and solid at the jaws, breaking into violet curls and smoke toward the tip, so the art shows the real damage falloff (half as hard at the far tip). |
| Dash | Tiny blue flames dropped along the path, gone within about 1.5 s. |
| Kills | Ordinary bodies burn out in blue cinders. |
| Boss kill | The boss is baked to a sprite at the moment of death, then crumbles to grey ash with blue embers from the side the killing blow came from, and blows away. |
| Rounds, sparks, glow | In the skin's palette. |

### OVERDRIVE: the evolution, fully redrawn

| Moment | What it becomes |
|---|---|
| Ignite | The elytra crack open, the flight membranes unfold as sheets of blue fire (replacing the stock wings), and the segments catch one by one from head to tail. |
| Overdrive lance | The helix's two strands become two braided flame jets. |
| Z · SCORCHED EARTH | A bombardier beetle's spray: a solid jet of boiling blue fire. The scars cool cyan to violet to black glass. |
| X · PYROTECHNICS | A swarm of fire beetles that rise and burst blue. |
| C · BRAND | The X from the sky is cut as two crossing mandible strokes. |
| Combo 1 (BRAND→Z→X) | The ring wall is blue flame; the giant column is a pillar of it. |
| V · FUSION CORE | Khepri: the hull becomes a scarab holding a blue sun, and the stars it throws are small blue suns. This replaces IFRIT. |
| HUD | The heat meter in the skin's ramp. |

## The suite

The vigil's prizes already get THE WARDROBE: a wearer object, moments,
particles, cloth and rope, a stage in the menu, and about 35 hooks. We build on
it rather than beside it, and add what this skin needs that the wardrobe does
not have.

1. **The tier.** A signature skin is locked to one pilot. It can only be worn
   while flying EMBER; on any other hull the slot is empty and the stock look
   draws. It lives in SECRET_SKINS like `ember-gift` does now: listed only for
   a profile that holds it, with no locked row for anyone else.
2. **The wardrobe opens up.** HL_WR.fx stops being the vigil's list alone, so
   any skin can be dressed by the wardrobe.
3. **New base layers:**
   - the weapon (EMBER's lance, drawn in place of drawLance)
   - the body (a segment chain the art lays along the trail, built on the KIT's chains)
   - the boss's death (a baked snapshot of the boss handed to the art to break apart)
   - the firing state on the wearer: charge 0..1, last shot, so the jaws can follow the gun
4. **OVERDRIVE layers.** Every OVERDRIVE draw surface gets a hook that returns
   true when it drew and false for the stock art: ignite room, spark, wings,
   plume, ship, helix lance, grade, Z scorch, scars, X pyros and marks, C
   strike (ground, hull, marks, UI, cut), ring wall, nuke mark and nuke, V
   aura, hull, stars and screen, and the HUD. The existing od*Fx moment hooks
   are passed through too.
5. **The stage.** The menu showcase flies EMBER and cycles the kit (fire,
   dash, OVERDRIVE, Z, X, C, V), so the skin can be shown off and the art can
   be drawn against it.
6. **The bench.** A page that draws every hook in isolation, for the boards.

Rules:
- Cosmetic randomness never touches the sim RNG (the determinism suite must pass).
- Hitboxes and timings are unchanged.
- Nothing covers a telegraph.
- Lockstep and PvP peers see it: the art ships in the file, so a peer only needs the equip id.

With every hook empty, the game must look exactly as it does today.

## Steps

Each step gets built, tested, committed on `beetle`, and then I stop and
report. It ships to main only at the end.

1. **Concept board.** The head, mandibles (with the bite cycle), elytra and
   wings, segments, palette and flamethrower, as a still plus an animated
   sheet, for approval before anything is wired in.
2. **The suite.** Tier, wardrobe opening, new layers, OVERDRIVE hooks, stage
   and bench, with stock passthroughs everywhere. Tests: determinism,
   lockstep, plus a check that an empty skin draws byte for byte stock.
3. **Base art.** Head, mandibles, elytra and wings, thruster, segments,
   flamethrower, rounds and sparks, dash flames, kills, boss ash.
4. **OVERDRIVE art.** Ignite, wings, braided lance, Z, X, C and the combos.
5. **V art.** The scarab and its blue sun.
6. **Name, card and grant.** Name it, draw the menu card, drop `wip`, and
   grant it to both "ember" identities: the account's pid (71b1ebbc…) and the
   old pid 06a21d4e that holds the stub now. Then the full test pass
   (determinism, lockstep, PvP) and ship.

## Open, for later

- **The name.** Candidates: BLUE BLOOD (blue fire, and the #1 is nobility),
  COLD BLOODED. The V form: KHEPRI.
- **Roster.** Dress it, or leave it alone? Leaving it alone is the default:
  he said it was optional, and telegraphs come first.
- **evo-ember on the account.** The old pid was handed the EMBER evolution
  (PERK_GRANTS). If the account has not earned OVERDRIVE itself, the
  OVERDRIVE art is unreachable for him unless the account gets the perk too.
