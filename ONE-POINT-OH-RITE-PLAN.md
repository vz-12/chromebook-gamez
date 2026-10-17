# ONE POINT OH's rite, and VOIDRUNNER's evolution — the plan

Part two of `ONE-POINT-OH-PLAN.md`: the rite at VOIDRUNNER's statue, and how
the hull looks as it evolves through it and once it is awake. It replaces
that file's rite and form drafts ("to revisit"), which are now only pointers
here. Part one (the route) is built and on `main`, and nothing in it changes.

It follows your direction of 16 Oct:

- VOIDRUNNER is regressed to its base form, like every pilot.
- So the room does not change through the rite. The hull does. It evolves
  as the fight goes on and wakes in the duel.
- The reason it wakes against him is that he is the one who stayed.

No game code yet. The art is placeholder behind named hooks, as with RONIN
and the route. This repository is public, so nothing sealed is written here.
The story below stops at "the shutdown" and "the dark".

## The story (canon, 16 Oct)

**He is the one who stayed.**

- He played the old game in its first, simplest days, in the only ship it
  had: VOIDRUNNER. He loved it exactly as it was.
- Then the void woke and everything grew, VOIDRUNNER most of all. It ran
  every sector and kept something from each. He hated every change, and he
  kept flying it anyway.
- When the game was shut down, every player left except him. "Someone has
  to stay and remember it." That is your line for him, and it was his
  reason all along.
- For thousands of years in the dark the pilots lost themselves. The others
  lost themselves to nothing. VOIDRUNNER lost itself to him. He was the only
  one left remembering it, and he remembered it one way only: as it was on
  his first day. Night after night he took one more thing off it, until it
  was that again.
- When the dev bought the game, he found one player already inside, sitting
  in the dark with the starting ship. The dev thinks he rebuilt VOIDRUNNER.
  It was the one thing he found finished.

**The pairing,** beside the other three:

| Pilot | Faces | What it is |
| --- | --- | --- |
| EMBER | THE AMALGAM | the light he ran from |
| THE HACKER | ROOT | its father, who holds the power it lost |
| THE VAGRANT | THE FOUNDER | the brother who wants him to stay |
| VOIDRUNNER | ONE POINT OH | the only one who never left it. He kept it alive through the dark, and keeping it is what made it small. The one who saved it and the one who caged it are the same person, and he loves it. |

Its ghost conviction, "nothing needs adding to it", was never its own. It is
his voice, after thousands of years of hearing it. The rite is the hull
hearing its own voice again.

**What it settles in the route.**

- **7 Aug is the day it came back on.** The first upload was the first time
  in thousands of years he saw the ship lit, and it was exactly as he had
  kept it. That is why his 1.0 is that day and not the old game's: it is his
  memory, uploaded.
- **The lock** is him doing to your game what he already did to the ship.
- **The record agrees.** VOIDRUNNER's numbers on 7 Aug (`3af8b6d`,
  `newPlayer`) and today (`CHARS.runner`) are the same, every one: 100 hp,
  258 speed, 11 damage, 4.6 a second, 700 shot speed, one round, 0.055
  spread. Ten weeks and 80,000 lines later, it is the one thing in the game
  that has never changed. The dev rebuilt the starting ship as he found it.

**What it changes:**

- **His origin.** "Arrived on the first upload" (the stand-in tales, and the
  old plan's default answer to its question 8) becomes "the one player who
  stayed through the shutdown". He knows there is an outside, as the dev
  does: both are players who came in, one at the end and one who never left.
- **The lore bible.**
  - His entry in PEOPLE or BOSSES.
  - A line in the order of events between the shutdown and the dark: "every
    player left but one".
  - A line in "Who knows".
  - VOIDRUNNER's page III, which waits for this rite.
- **The tales** (drafts below): his pages I and II are rewritten and his
  page III is new. VOIDRUNNER's page III is unheld. The dev's page II for
  VOIDRUNNER stays word for word, because it is the clue: he tried to add
  things and "every build that added something played worse".
- **The `RITES` header:** `VOIDRUNNER → ONE POINT OH  the ship, against the
  only one who never left it`.

## Fight principles

What the rite is built on. Each one keeps a rule all three rites keep (the
old plan, "What the other three did").

1. **The hull evolves, not the room.** The route changed the game around a
   fixed ship. The rite keeps the room fixed and changes the ship. His bar is
   the hull's own record: five marks, one for each room it grew in.
2. **He opens by taking everything.** "There. Like it was." The build's
   cards and any awarded skin peel off into his set (the route's `card`
   hook), and the hull flies its own 7 Aug numbers: one round, 4.6 a second.
   This is the rule every rite keeps, that the build does not decide it, done
   by him on screen. Nothing is written to the save: the rite ends the run,
   as the others do.
3. **Only what came back hurts him.** The base round goes straight through
   him. It is his memory of the ship, and his memory does not hurt him. A
   round lands for `OPR_HIT` times the share of the hull that is back (all
   the pieces due so far is 1, none is 0), in rite units out of `OPR_HP`.
   The pieces change how rounds travel, never what a landed round is worth.
4. **The pieces come back in the order it grew them.** That is the reverse of
   the order he took them off, so he names each one as it returns: he is the
   one who removed it. One comes back at the open and one at each seam.
5. **His reverts are aimed at the hull.** A revert that catches you takes
   your newest piece back. Grazing his reverts grows it back (GRAZE, the
   form's meter later, taught here as THE VAGRANT's rite teaches the perfect
   parry). A stripped piece also comes back by itself after a while: he
   cannot hold it as long as he used to. So nobody is stuck at nothing.
6. **Five sequences on his health,** 0.80 / 0.60 / 0.40 / 0.20 / 0. Each has
   a banner, each stacks a new beat on the old ones, none ends before it has
   shown itself (`OPR_SEQ_MIN`), and every seam is a molt.
7. **Sequence 5 is the cutscene, played.**
   - He takes everything back one last time, and the duel is dead even.
   - The hull wakes in the middle of it, on a graze, and
     `grantAwakening('runner')` fires on that frame.
   - Then it overpowers him, and the card follows.
8. **His temper runs the other way.** The route climbed from fond to past it.
   The rite starts furious, because you are taking it from him, and comes
   down as the hull grows: furious, angry, annoyed, aggrieved, and in the
   duel fond. It is the gentlest he has ever been, because he is flying his
   memory of it. `oaAnger` reads a rite table (`OA_RITE` 0.9 / 0.7 / 0.5 /
   0.3 / 0.1) instead of `OA_RAGE`.
9. **He is not killed.** He keeps his mind and lets go. He is built so THE
   NEXT THING can stand him beside you (`e.hacked`, the lines in a table), as
   the route already is.
10. **The run is data.** `simRand`, `P.in`, named delays (`simAfter`), no
    closures. The determinism suite plays it start to finish.

## The rite, sequence by sequence

**The open** (2.8 s, as `vrOpen` and `rrOpen`): the room is cleared and taken
to duel size, the hull is placed at range, and he is upfield at `RITE_WAVE`
depth. His set powers on (the route's dot, line, picture). He takes the build
and the skin ("There. Like it was."), and the hull is flat, drawn as he kept
it. Then the first piece comes back on its own, and he is startled.

| # | Banner (`until`) | What comes back, and what he says | What he adds (stacking) |
| --- | --- | --- | --- |
| — | the open | THE FOUNDRY's plate. "That was the last one I took. It took the longest." | — |
| 1 | HE PUTS IT BACK (0.80) | — | Sweeps: the route's revert bands, slow and honest, lanes across your path. "Put it back." |
| 2 | HE REMEMBERS IT (0.60) | THE HIVE's brood. "There was only ever one of it." | + Panes: windows of the ship as he kept it, landing where you are going. One that lands on you reverts. "I remember every inch of it." |
| 3 | HE PAINTS IT OVER (0.40) | THE VAULT's light. "I took that one early. It kept glowing in the dark." | + Paint: an arm of grunts with a flat brush, reaching for the hull itself. Caught, the hull greys over 1.2 s, and the newest piece goes unless you graze out. "Hold still." |
| 4 | HE KEEPS IT (0.20) | THE VOID's well. "That one went first." | + Volleys, and what he strips goes into his set instead of falling. It shows in his tube and does not come back by itself. Shoot the set to break it out. This is HOLLOW reversed. "I will keep it for you. I always have." |
| 5 | ONE SHIP (0) | everything, at the wake | the duel (below) |

**The pieces,** in the order it grew them. Each is from a room of the route,
so the route you fly every run is the hull's history in order. Three of them
are what the dev tried and cut ("a second barrel, a shield, a perk tree").
He was rebuilding pieces of it out of order, which is why they played like
things bolted on.

| Piece | From | The dev's cut | In the rite |
| --- | --- | --- | --- |
| Plate | THE FOUNDRY | a shield | The first revert to catch you each 8 s strikes the plate instead, and nothing is lost. |
| Brood | THE HIVE | a second barrel | Rounds fire in pairs, each worth half. A pair that meets a revert band splits around it. |
| Light | THE VAULT | a perk tree | The hull leaves short laser lines behind it. His panes and his brush break on them. |
| Well | THE VOID | — | Rounds bend toward him a little. |

**Losing and growing back:**

- His reverts take the newest piece first. They never take more than the
  hull has, and the base hull has nothing to take.
- Grazes fill a rite meter. A full one grows back the oldest missing piece.
  The sources are the edge of a sweep, a volley round, the rim of a landing
  pane, and his brush passing close.
- A stripped piece also comes back by itself after `OPR_REGROW`, except in
  HE KEEPS IT, where the set holds it.

**ONE SHIP (the duel).**

- At the seam he takes all four pieces back at once ("There. Now it is
  fair."). His set shows the ship as he kept it, and it comes out of the
  tube: his memory of VOIDRUNNER, flat in 1.0's colours.
- You fly the real one, stripped. "There was one ship. Everyone flew it."
- It is dead even because the hull still flies the way he remembers it.
  Every round you fire, his copy fires on the same frame down your line, and
  the two meet and go out. Stop firing and his land, each costing 12% of max
  health and never the run (`RACE_HIT`'s figure, as in the other duels).
- After `OPR_DUEL_WAKE` exchanges his copy fires the marked one: the slow
  revert he made every night, "put it back". Graze it. That is the wake, as
  the marked blow is in THE VAGRANT's duel. It also wakes after a few tries,
  so nobody is stuck.
- On that frame all four pieces come back at once, together with the whole
  they were pieces of. The hull flies its own way for the first time since
  the dark. `grantAwakening('runner')` fires, and your rounds go through. His
  copy cannot follow a ship it never saw. "I never saw it fly like that."

**Out.** `OPR_DUEL_FINISH` hits and the copy breaks back into the set. The set
powers off (picture to a line, a dot, dark), and he is left holding it. "It
was better." Then, after a breath: "Go on, then." He stays to remember it.

**The card:** AWAKENING · IMAGO · VOIDRUNNER, with a line under it (stand-ins,
your pick):

- "it was finished. it kept going." This answers his route line about ROOT.
- "somebody stayed. it went on."

**His bar in the rite.** The route's `record` hook laid out as the hull's
record:

- Five marks: THE GRID (as he kept it), THE FOUNDRY, THE HIVE, THE VAULT,
  THE VOID.
- The playhead moves with his health.
- A mark lights when its piece comes back and dims when he strips it.
- ONE SHIP is the last stretch, unmarked. At the wake a sixth mark appears
  past the end of it: IMAGO.

## The evolution retexture

How the hull looks at each stage of the rite, and awake in a run. The game
already has a word for this: a retexture, "retextured, not recoloured", from
the season skins. The rules here are written so they survive a crowded
screen, a co-op partner's view, and effects switched off.

### Rules

- **The silhouette carries it.** Every stage changes the outline, so it reads
  with effects off. Light, glow and particles are extra, behind `FXO.mat` and
  `FXO.parts`.
- **The hitbox never changes.** `P.r` stays 13 at every stage and awake. In
  IMAGO the base outline is still drawn inside the form as one thin bright
  line. The ship he kept is still in there, and that line is also where you
  can be hit.
- **The heading always reads.** The needle nose is kept at every stage and
  stays the frontmost point.
- **Cyan stays the identity.** Each piece adds its room's accent: forge
  orange, hive green, vault blue, void violet. An accent covers no more than
  a fifth of the hull, so the roster's colours and your partner's ship stay
  readable.
- **Two renderers, as in the route.** What he keeps is flat (`OPO_FIRST`'s
  colours, 2 px strokes, unlit, drawn after bloom with no shadow), and what
  comes back is lit. The base hull in the rite is his memory of it and is
  entirely flat. Each piece lights its own part. With all four back the
  hull is lit, and IMAGO glows.
- **The pieces are the hull, never around it.** Around the hull belongs to
  the build: shields, drones, FORGE LEDGER's borrowed plates at 62 px, BROOD
  FOLIO's burrow ring. A piece sits inside the outline or extends it, so it
  is never mistaken for a card.

### Stage by stage

Hull space, as `hullPath` draws the runner: nose at x 18, cranked wings to
y ±13 at x −5, twin-nozzle tail at x −10.5.

| Stage | Outline | Surface | Light | Motion | With effects off |
| --- | --- | --- | --- | --- | --- |
| Base, as he kept it | today's runner outline | flat fill in `OPO_FIRST.player`, 2 px stroke, no `hullDetail`, the canopy a flat dot | none, drawn after bloom | the first build's: steps, no easing | the outline, flat |
| + Plate (THE FOUNDRY) | the wings thicken by about 1.5 px, and a chin plate sits under the nose | cold forged steel (slate), riveted, with a cyan temper line on each leading edge | the plates take today's light: a specular strip that turns with the heading | none: it is metal | heavier wings |
| + Brood (THE HIVE) | the twin nozzles bud into two rounded pods, the second barrel | a membrane at the joins, green only where they meet the hull | a soft inner glow in the pods | they breathe, scale 1 ± 0.03 at about 1.2 Hz | two pods at the tail |
| + Light (THE VAULT) | unchanged | a branching lattice from the canopy out along both wings to the tips, nodes at every branch: the perk tree | the lattice is lit, blue into white, and a scan runs down it every few seconds like the vault's lasers | the scan | the lattice as thin lines |
| + Well (THE VOID) | the hull's edges within 6 px of the canopy are pulled in slightly | the canopy blister becomes a dark lens with a violet rim | a lensing ring that bends the floor's grid under it | the ring turns slowly | the dark lens |

### Moving between stages

- **The molt** (at a seam, 1.6 s): a hairline seam opens down the spine,
  marked − on the flat side and + on the lit side. The flat shell splits
  along it and peels like paper (`OPO_KIT`'s peel), and the new piece is
  there under it, lit.
- **Taken back** (a revert): the piece peels off from one edge, drains to
  1.0's grey as it goes (the − of the diff), and falls and breaks flat. In HE
  KEEPS IT it flies into his tube instead and hangs there in phosphor.
- **Grown back** (a full graze meter, or by itself): it grows from the spine
  outward along the seam, lit, with a + at the seam.
- **Broken out of his set** (HE KEEPS IT): the tube cracks over the piece and
  it flies home to the hull. His picture rolls.
- **The wake** (ONE SHIP): every piece at once, and then they fuse. That is
  IMAGO's first frame.

### IMAGO, awake

IMAGO is the last stage of a metamorphosis. The word also means "image",
which suits a fight between two renderers.

The look is the four pieces as one body, VOIDRUNNER grown up rather than
something else:

- **Carapace:** the plates fused along the spine.
- **Wings:** the pods unfolded into a second pair. All four wings are
  translucent cyan membranes.
- **Veins:** the vault's lattice runs through every wing, lit room by room.
- **The eye:** the well at the canopy.
- **The base outline:** a thin bright line inside, which is the hitbox.
- **Size:** about 1.45 times the base span and 1.2 times its length, with
  the nose still at the front.

**Where it draws** (in `drawPlayer`, mirroring RONIN and FUSION CORE):

- **In a run,** the transformation owns the hull while it is shown:
  `if (imagoShown()) { drawImagoHull(); return; }`, ahead of the awarded skin
  pass. As with RONIN (`vraRoninOwns`) and FUSION CORE, no awarded skin is
  drawn over it, and the skin comes back when the minute ends.
- **In the rite,** the stage owns the hull from the open to the card:
  `if (oprOwnsHull()) { drawRunnerStage(); return; }`. The skin was taken at
  the open, on screen.
- **Awake, not transformed:** today's VOIDRUNNER, unchanged. It is the base
  ship everyone starts in, and the awakening shows only while it is used.
  (Your call: a single mark at rest, the healed seam on the spine, is the
  alternative.)
- **What stays the base outline:** afterimages, the GEMINI twin, the hangar
  and menu, and a downed wreck. They all draw from `hullPath`, which keeps
  the base outline. A dash afterimage inside IMAGO shows the base ship
  trailing out of the form.
- **Co-op and lockstep:** the art reads only state (`P.awake`, the form's
  clock, the rite's stage), so your partner sees the same stage.
  `MP.peerAwake` already carries the flag.
- **The hub's statue:** when the rite is built the statue rises, as the
  other three do. Its stone shows the base hull with the seam open down its
  spine, and the cut-in's light comes through it.
- **Looks:** `awake:runner` gates an IMAGO banner and decal in
  `src/looks.js` and `leaderboard/art.js`, beside OVERDRIVE, SUPERUSER and
  RONIN.

**The cut-in** (about 3.6 s, on the timeline, scrubbable):

| Beat | Time (s) | What |
| --- | --- | --- |
| 1 | 0 – 0.8 | Dark. A CRT's glow. On the tube, the flat base ship, still. His blip: "Put it back." |
| 2 | 0.8 – 1.6 | The ship on the tube moves on its own. A hairline seam opens down its spine, − and +. |
| 3 | 1.6 – 2.4 | The tube cracks along the same seam. Light pours out, and the flat shell peels like paper. |
| 4 | 2.4 – 3.2 | The wings unfold out of it, the veins lighting one room at a time (orange, green, blue, violet), and the eye opens. |
| 5 | 3.2 – 3.6 | A tear back to play. Behind it, the set's picture collapses to a dot. |

The cut-in holds the room and the hull, like RONIN's (`roninCutIn`) and
SUPERUSER's (`suCutIn`), so lockstep gets the same rule they did.

### Art hooks (`OPR_ART`)

Built like `OPO_ART`: drawing only, sandboxed, failing alone, with a WHAT
THEY ARE HANDED header. Each hook is blank until drawn, then lifted by a
checked script.

| Hook | Handed | Draws |
| --- | --- | --- |
| `hull` | `(g, s)`: `s.have` (four flags), `s.lit` (0 to 1 a piece), `s.molt`, `s.grey` (the brush), `s.awake` | the hull at its stage, in hull space |
| `molt` | `(g, s, t)` | the seam, the split and the peel at a seam |
| `peel` | `(g, k, x, y, t, kept)` | piece `k` taken back: falling, or flying to his set |
| `grow` | `(g, k, t, how)` | piece `k` coming back (`graze`, `time`, `set`) |
| `graze` | `(g, x, y, src)` | the spark of a graze, and the meter's pip on the hull |
| `kept` | `(g, hm, keeps)` | pieces hanging in his tube (HE KEEPS IT) |
| `copy` | `(g, c)` | his memory of the ship in the duel: flat, after bloom |
| `meet` | `(g, x, y)` | two rounds meeting and going out |
| `marked` | `(g, s, t)` | the marked revert's tell, and the graze window |
| `wake` | `(g, t)` | IMAGO's first frames on the field |
| `record` | `(g, s)` | his bar as the hull's record: five marks, then IMAGO |
| `imagoHull` | `(g, w)` | the form in a run, `w` 0 to 1 as it comes in |
| `imagoCutIn` | `(g, w, h, ph)` | the cut-in, by beat |
| `imagoHud` | `(g, x, y, s)` | the graze meter, the clock, Z X C V |

His set, voice, sweeps, panes, paint, volley and the screen are the route's
hooks, reused as drawn, with the rite's state handed in.

## The form's frame (after the rite)

The kit around IMAGO. The moves are named by you one at a time, as RONIN's
were, so this is the frame only.

- **One passive, one transformation, four actives,** as the SUPERUSER header
  sets out. None of it runs in the rite.
- **The meter is GRAZE.** A round that passes within 26 px without hitting
  pays 1, and a dash through one pays 4. It is the skill the rite taught.
- **The key is [F],** free for VOIDRUNNER today (`ventFire` returns for any
  hull that is not a lance or THE HACKER). The form lasts 60 s, with the
  cut-in above.
- **The four actives come from the four pieces,** one room each. They are a
  sketch to throw away:
  - Z: THE FOUNDRY, close.
  - X: THE HIVE, across the room.
  - C: THE VAULT, on the move.
  - V: THE VOID, everything, as the last resort.
- **PvP:** VOIDRUNNER is a base pilot, so ranked from bronze to gold never
  flies it awake. Grazing needs rounds, so against a lance or a blade the
  meter needs a duel rule, as `PVP.heat` is for the vent.

## Tales (stand-ins, in the voice)

**ONE POINT OH, page I** (the Bookkeeper; opens when you meet him):

> Visitor. One of the ones who flew the first ship from somewhere else,
> before there were sections. When the lights went out, the rest of them
> went too. He did not.
>
> For a long time he was the only thing in the dark that moved, so for a
> long time he was the only thing I filed.

**ONE POINT OH, page II** (the dev; opens when you beat him on the route):

> he was already in here when i bought it. in the dark, with the starting
> ship.
>
> ~~i rebuilt the runner~~ i didn't rebuild the runner. it was the one thing
> i found finished.

**ONE POINT OH, page III** (his own; opens when you pass VOIDRUNNER's rite):

> Everyone left. Someone had to stay and remember it.
>
> I remembered it the way it was the first day. Every night I took off one
> more thing that was wrong with it. There was a lot of time.
>
> When the lights came back on, it was right.
>
> Today it flew a way I never saw. It was better, before. I still sit where I
> sat in the dark. It knows the spot.

**VOIDRUNNER, page III** (its own; opens when you pass its rite):

> There was a voice in the dark. Every night it told me what I was, and
> every night I was a little more of it. Nothing needs adding. I thought
> that was mine.
>
> I ran every room there was, once. The forge, the hive, the vault, the
> ground that gets deleted. I kept something from each. He took them back
> in the order I would miss them least.
>
> Today he put it all back one more time, and I flew the way he remembered.
> Then I did not.

**IMAGO** (`TALE_AWAKE`): page I, the Bookkeeper, when you wake it. Page II,
the dev, when you use all four actives in one awakening. Page III, its own,
when you defeat a boss while awakened. They are written with the actives.

## The path

Each phase is its own branch and pull request, tested before the next starts
and kept off `main` until you say ship.

**Phase 0: the lore pass.** No code. The bible's entries (his origin, the
order of events, "Who knows"), the tales above settled, and these principles
signed off.

**Phase 1: the rite's logic, on blank hooks.**

- `RITES.runner` gets `start` (`oprOpen`), `seqs` (`OPR_SEQ`) and `jump`
  (`oprJump`). That lights the statue and the door, and lets `unlock-evo`
  wake the pilot. The old plan's "What lights up by itself" covers the rest.
- `oprOpen` copies `vrOpen` and `opoOpen`: the room, his spawn as
  `e.opoRite`, the build and skin taken (set aside on `P` for the rite, and
  never saved), and the first piece.
- His attacks are factored out of the route so both fights call the same
  sweep, pane, paint and volley makers, with a target handed in (the floor's
  cells in the route, the hull in the rite).
- The pieces, the graze meter, losing and growing back, the set keeping,
  the duel, the wake and the card. Lines go in `OPR_SAY`.
- `damageEnemy` refuses everything on `e.opoRite` but `oprStruck`, as it does
  for `vrFounder` and ROOT. `resetGame` clears every rite flag. The rite's
  body gets every exception the route's `e.opo` already has (THE HACKER
  cannot take him, pins and executions skip him, his own hook draws him).
- `oprJump(i)` for the admin panel, from the console.
- Tests:
  - `rite-runner` in `scripts/determinism.mjs` (`enterRite('runner')`)
    beside the other three.
  - `npm run test:opo` grows a rite part: pieces taken and grown back the
    same way twice, the wake inside the cap, a quit mid-rite that writes
    nothing, and a win that writes nothing but `awakened.runner`.

**Phase 2: the retexture.**

- The stage hooks, the molt, peel, grow and keep, the copy and the wake,
  drawn in a harness and reviewed on an artifact page stage by stage, then
  lifted with a checked script (as `ronin-v-art/lift.mjs`).
- `?opo=bench` gains the rite's parts.
- A browser pass at Chromebook sizes with effects on and off, which proves
  the silhouette rule: every stage reads with `FXO.mat` off.

**Phase 3: the form's frame.** The passive, GRAZE in runs and its HUD, [F]
for 60 s, `imagoHull` and the cut-in with lockstep's hold rule,
`tale('awake')` and `tale('act')`, and `runner` in the lockstep awakened
list (`scripts/lockstep.mjs`).

**Phase 4: the four actives,** named by you one at a time.

**Phase 5: everything around it.**

- Tales: `TALE_AWAKE`, his page III, and VOIDRUNNER's page III unheld
  (`p:runner`), with `scripts/tales.mjs`.
- Looks: `awake:runner` in `src/looks.js` and `leaderboard/art.js`.
- `evo-runner` in `DEV_PERK_IDS`.
- PvP: the bot, the graze duel rule, and `scripts/pvp-engine.mjs`.

**Phase 6: ship.** The `CHANGELOG` entry, the version, a browser pass, every
suite, the README, then `main`.

## Draft numbers (one block in the code, all tunable)

| | |
| --- | --- |
| `OPR_HP` | 1000 rite units |
| `OPR_HIT` | 3 a landed round, times the share of the hull that is back |
| The hull's round in the rite | its 7 Aug numbers: one round, 4.6 a second, 700 shot speed |
| `OPR_SEQ_MIN` | 14 s (THE FOUNDER's) |
| The seam | 1.6 s, the molt |
| The plate's guard | one revert every 8 s |
| Growing back | a rite meter of 40: an edge or rim graze pays 6, a round 1, the brush 8 |
| `OPR_REGROW` | 9 s by itself, never in HE KEEPS IT |
| Breaking a kept piece out | 12 rounds on the set |
| `OPR_DUEL_WAKE` | 6 even exchanges before the marked one |
| An unanswered round in the duel | 12% of max health, never the run |
| `OPR_DUEL_FINISH` | 5 hits after the wake |
| `OA_RITE` | 0.9 / 0.7 / 0.5 / 0.3 / 0.1 |

Pace check: a whole hull firing 4.6 a second and landing half its rounds puts
about 7 units a second into him. A sequence of 200 units is then about 30 s,
so the four sequences take about two minutes, and the duel about forty
seconds.

## Questions for you (defaults are in)

1. **The pieces.** The four later rooms of the route, in order (my pick)?
2. **The name.** IMAGO (my pick), or APEX if it should read plainer at a
   glance?
3. **The card's line.** "it was finished. it kept going." or "somebody
   stayed. it went on."?
4. **The open.** Does he take the build and the skin on screen (my pick), or
   should the rite simply refuse them, as the others do?
5. **At rest.** No change while awake but not transformed (my pick), or the
   healed seam?
6. **His temper.** Running the other way, from furious down to fond in the
   duel (my pick)?
