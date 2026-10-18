# ONE POINT OH's rite, and VOIDRUNNER's evolution — the plan

Part two of `ONE-POINT-OH-PLAN.md`: the rite at VOIDRUNNER's statue, and how
the hull looks as it evolves through it and once it is awake. It replaces
that file's rite and form drafts ("to revisit"), which are now only pointers
here. Part one (the route) is built and on `main`, and nothing in it changes.

It follows your direction of 16 and 17 Oct:

- VOIDRUNNER is regressed to its base form, like every pilot.
- So the room does not change through the rite. The hull does. It evolves
  as the fight goes on and wakes in the duel.
- The reason it wakes against him is that he is the one who stayed.
- The duel ends in free evolution: once awake, giant gun barrels, laser
  rifles and the like grow out of the hull's back. It stays a playable
  cutscene, and none of it has to follow the route's rooms (17 Oct).

**Built 17 Oct (Phase 1, on blank hooks):** the rite's logic, played end to
end. **Drawn 17 Oct (Phase 2):** every `OPR_ART` hook, the hull's stages,
the molt, IMAGO and its eight growths, his copy and its rounds, and the HUD,
in the route's two renderers. **Built 18 Oct (Phases 3 and 4, begun):** IMAGO
in a run on a stand-in frame (GRAZE, [F], the moth, its HUD), and its first
active, your Z: EYESPOTS. **Drawn 18 Oct:** Z's art, and the form's cut-in
with your cocoon. **Built and drawn 18 Oct:** your X, FLUTTER (ten seconds
twice as fast, every attack dodged). **Built 18 Oct, its art left as hooks:**
your C, THE ARMORY (a wheel of eight overpowered guns). See "As built" under
The path. This repository
is public, so nothing sealed is written here. The story below stops at "the
shutdown" and "the dark".

## The story (canon, 16 Oct)

**He is the one who stayed.**

- He played the old game in its first, simplest days, in the only ship it
  had: VOIDRUNNER. He loved it exactly as it was.
- Then the void woke and everything grew, VOIDRUNNER most of all. He hated
  every change, and he kept flying it anyway.
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
   the hull's own record: the sequences, and the pieces it has back.
2. **He opens by taking everything.** "There. Like it was." The build's
   cards peel off into his set (the route's `card` hook), and the hull flies
   its own first numbers: one round, 4.6 a second. An awarded skin is not
   drawn while the rite owns the hull. This is the rule every rite keeps,
   that the build does not decide it, done by him on screen. Nothing is
   written to the save: the rite ends the run, as the others do.
3. **Only what came back hurts him.** The base round goes straight through
   him, unspent. It is his memory of the ship, and his memory does not hurt
   him. A round lands for `OPR_HIT` times the share of the hull that is back
   (all the pieces due so far is 1, none is 0), in rite units out of
   `OPR_HP`. The pieces change how rounds travel, never what a landed round
   is worth.
4. **The pieces come back in the order it grew them.** That is the reverse of
   the order he took them off, so he names each one as it returns: he is the
   one who removed it. One comes back at the open and one at each seam.
5. **His reverts are aimed at the hull.** A revert that catches you takes
   your newest piece back. Grazing his reverts fills GRAZE, and a full meter
   grows the oldest missing piece back (GRAZE is the form's meter later,
   taught here as THE VAGRANT's rite teaches the perfect parry). A dash
   through a revert is a graze. A stripped piece also comes back by itself
   after a while: he cannot hold it as long as he used to. Nobody is stuck at
   nothing.
6. **Five sequences on his health,** 0.80 / 0.60 / 0.40 / 0.20 / 0. Each has
   a banner, each stacks a new beat on the old ones, none ends before it has
   shown itself (`OPR_SEQ_MIN`), and every seam is a molt.
7. **Sequence 5 is the cutscene, played.**
   - He takes everything back one last time, and the duel is dead even.
   - The hull wakes in the middle of it, on a graze, and
     `grantAwakening('runner')` fires on that frame.
   - Then it grows guns of its own, freely, and overpowers him. The card
     follows.
8. **His temper runs the other way.** The route climbed from fond to past it.
   The rite starts furious, because you are taking it from him, and comes
   down as the hull grows, to fond in the duel. It is the gentlest he has ever
   been, because he is flying his memory of it. `oaAnger` reads `OPR_RAGE`
   (0.9 / 0.7 / 0.5 / 0.3 / 0.1) when it is handed the rite.
9. **He is not killed.** He keeps his mind and lets go. He is built so THE
   NEXT THING can stand him beside you, as the route already is.
10. **The run is data.** `simRand`, `P.in`, no closures. The determinism suite
    plays it (`rite-runner`), snapshot included.

## The rite, sequence by sequence

**The open** (5.2 s, as `vrOpen` and `rrOpen`): the room is cleared and taken
to his size (the route's 1900 × 1300), the hull is placed at range, and he is
upfield at `RITE_WAVE` depth. His set powers on (the route's dot, line,
picture). At 1.2 s he takes the build ("There. Like it was."), and the hull
is flat, drawn as he kept it. At 2.7 s the first piece comes back on its own,
and he names it.

| # | Banner (`until`) | What comes back, and what he says | What he adds (stacking) |
| --- | --- | --- | --- |
| — | the open | PLATING. "That was the last one I took. It took the longest." | — |
| 1 | HE PUTS IT BACK (0.80) | — | Sweeps: the route's revert bands, laid across the lane you are in. The front reaching the hull takes a piece; passing just beside it is a graze. "Put it back." |
| 2 | HE REMEMBERS IT (0.60) | A SECOND BARREL. "There was only ever one of it." | + Panes: windows of the ship as he kept it, thrown to where you are going. One that lands on the hull takes a piece; landing at its rim is a graze. Rounds break them. "I remember every inch of it." |
| 3 | HE PAINTS IT OVER (0.40) | THE LATTICE. "I took that one early. It kept glowing in the dark." | + Paint: his brush, planted where the hull is. Still inside when the paint is done, the hull loses a piece; at its rim, a graze. Hitting him scrubs it back. "Hold still." |
| 4 | HE KEEPS IT (0.20) | THE CORE. "That one went first." | + Volleys, and what he strips goes into his set instead of the floor. It hangs in his tube and does not come back by itself; rounds on the set work it loose (they do even when none of the hull is back). This is HOLLOW reversed. "I will keep it for you. I always have." |
| 5 | ONE SHIP (0) | everything, at the wake | the duel (below) |

**The pieces,** in the order it grew them. They are not the route's rooms
(17 Oct): three of them are what the dev tried and cut ("a second barrel, a
shield, a perk tree"). He was rebuilding pieces of it out of order, which is
why they played like things bolted on. What each one looks like is the art's.

| Piece | The dev's cut | In the rite |
| --- | --- | --- |
| PLATING | a shield | The first revert to catch you each 8 s strikes the plating instead, and nothing is lost. |
| A SECOND BARREL | a second barrel | Rounds fire in pairs, each worth half. |
| THE LATTICE | a perk tree | The hull leaves light behind it for 1.1 s. His panes break on it, and his brush is scrubbed back by it. |
| THE CORE | — | Rounds bend toward him (1.5 rad/s). |

**Losing and growing back:**

- His reverts take the newest piece first, and the base hull has nothing to
  take.
- Grazes fill GRAZE (40): the edge of a sweep pays 6, the rim of a landing
  pane 8, the brush's rim 8, a volley round 1, a dash through any revert 6.
  A full meter is a piece banked: it grows back the oldest missing piece the
  moment one is missing (never one in his set).
- A stripped piece comes back by itself after `OPR_REGROW` (9 s), except in
  HE KEEPS IT, where the set holds it.

**ONE SHIP (the duel).**

- At the seam he takes all four pieces back at once ("There. Now it is
  fair.") and steps back to the top of the room. His set shows the ship as he
  kept it, and it comes out of the tube: his memory of VOIDRUNNER, flat in
  1.0's colours. It stands between you, 420 px upfield of the hull, never on
  top of his set.
- You fly the real one, stripped, held on his copy and free to move. "There
  was one ship. Everyone flew it."
- It is dead even because the hull still flies the way he remembers it.
  Every round you fire, his copy fires on the same frame down the same line,
  and the two meet and go out. Stop firing for 0.9 s and his come
  unanswered, each costing 12% of max health and never the run (`RACE_HIT`'s
  figure, as in the other duels).
- After 24 rounds met his copy fires the marked one: the slow revert he made
  every night, "put it back". Graze it, or dash through it, and the hull
  wakes, as the marked blow wakes THE VAGRANT. After three that miss, it
  wakes anyway. If you never fire, the marked one comes after 45 s.
- On that frame all four pieces come back at once, together with the whole
  they were pieces of. `grantAwakening('runner')` fires, and your rounds go
  through. "I never saw it fly like that."
- **Free evolution.** Awake, the hull grows guns out of its back, one every
  0.85 s, and they fire while you do. His copy cannot keep up with a ship it
  never saw: it falls back, and only answers now and then. The growths are a
  table (`OPR_GROWTHS`), and what each looks like is entirely the art's:

| # | Growth | Where | How it fires |
| --- | --- | --- | --- |
| 1 | twin giant barrels | the spine | heavy shells |
| 2 | a laser rifle | right shoulder | a beam, held a moment |
| 3 | a laser rifle | left shoulder | a beam |
| 4 | a cannon | the spine | one huge slow shell |
| 5 | a rotary gun | right | a stream of small rounds |
| 6 | a rail | the spine | a long thin beam |
| 7 | missile pods | left | four missiles that turn toward him |
| 8 | a crown of barrels | all round | a ring of rounds |

**Out.** The copy breaks back into the set (140 hits' worth, or 30 s after
the wake at most). The set powers off (picture to a line, a dot, dark), and he
is left holding it. "It was better." Then, after a breath: "Go on, then." He
stays to remember it.

**The card:** AWAKENING · IMAGO · VOIDRUNNER, "it was finished. it kept
going." (a stand-in; the other was "somebody stayed. it went on.").

**His bar in the rite** is the hull's record (`OPR_ART.record`): the hull's
name as lit as the hull is, with its build (`v1.0` and one more for every
piece back, `+ AWAKE` once it is), and under it a line from `1.0` to what it
wakes as. What the hull has taken back is lit, each sequence's stretch in the
colour of the piece it had then; what is still his is 1.0's, flat. The five
sequences are marked under it, and the four pieces as + (back), − (taken) or
· · · (not yet). The normal boss bar stands aside, as it does for the route.

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
  can be hit. The growths are never a bigger target.
- **The heading always reads.** The needle nose stays the frontmost point of
  the hull itself; growths may reach past it, but the nose stays legible.
- **Cyan stays the identity.** A piece may add an accent of its own, covering
  no more than a fifth of the hull, so the roster's colours and your partner's
  ship stay readable.
- **Two renderers, as in the route.** What he keeps is flat (`OPO_FIRST`'s
  colours, 2 px strokes, unlit, no shadow), and what comes back is lit. The
  base hull in the rite is his memory of it and is entirely flat. Each piece
  lights its own part. With all four back the hull is lit, and IMAGO glows.
- **The pieces are the hull, never around it.** Around the hull belongs to
  the build: shields, drones, FORGE LEDGER's borrowed plates at 62 px, BROOD
  FOLIO's burrow ring. A piece sits inside the outline or extends it, so it
  is never mistaken for a card.

### Stage by stage (a starting point for the art)

Hull space, as `hullPath` draws the runner: nose at x 18, cranked wings to
y ±13 at x −5, twin-nozzle tail at x −10.5. The art draws each piece in these
places (`ORH_*` in "VOIDRUNNER'S RITE — art hooks"); IMAGO's wings, veins
and body are with them (`ORH_FORE`, `ORH_HIND`, `ORH_ABDO` and the rest).

| Stage | Outline | Surface and light | With effects off |
| --- | --- | --- | --- |
| Base, as he kept it | today's runner outline | flat fill in `OPO_FIRST`, 2 px stroke, no glow, the canopy a flat dot | the outline, flat |
| + PLATING | the wings thicken, a chin plate under the nose | plate along the cranked wings, catching today's light | heavier wings |
| + A SECOND BARREL | a second barrel at the tail, beside the first | its muzzle lit when it fires | two barrels |
| + THE LATTICE | unchanged | a branching lattice from the canopy out to the wingtips, lit, a scan running down it | thin lines |
| + THE CORE | the edges near the canopy pulled in | the canopy becomes a dark lens with a rim of light | the dark lens |

### Moving between stages

- **The molt** (a seam, 1.6 s): a hairline seam opens down the spine,
  − on the flat side and + on the lit side. The flat shell peels like paper
  (`OPO_KIT`'s peel), and the new piece is there under it, lit.
- **Taken back** (a revert): the piece peels off and drains to 1.0's grey,
  and falls. In HE KEEPS IT it flies into his tube instead and hangs there.
- **Grown back** (GRAZE, by itself, or broken out of his set): it grows from
  the spine outward, lit, with a + at the seam.
- **The wake** (ONE SHIP): every piece at once, and then they fuse. That is
  IMAGO's first frame, and the growths start from it.

### IMAGO, awake

IMAGO is the last stage of a metamorphosis. The word also means "image",
which suits a fight between two renderers. Every other awakening is a full
reskin with a theme (RONIN's kasa, cloak and katana; SUPERUSER's oni;
OVERDRIVE's wings of fire; FUSION CORE's star), so IMAGO is the creature the
hull was growing into: a luna moth of light, the four pieces as one body,
with a thin bright line inside it where the base outline (and the hitbox) is.
The duel's growths are parts of the moth, not guns bolted on: the form in a
run should look like it could grow them.

**Where it draws** (`drawPlayer`, mirroring RONIN and FUSION CORE):

- **In the rite** (built): the rite owns the hull from the open to the card,
  `if (oprOwnsHull()) { drawOprHull(); return; }`, ahead of the awarded skin
  pass, so no skin is drawn over it. `drawOprHull` calls `OPR_ART.hull` and,
  awake, `OPR_ART.growths`.
- **In a run** (Phase 3): the transformation owns the hull while it is shown,
  as RONIN does (`vraRoninOwns`), and the skin comes back when the minute
  ends.
- **Awake, not transformed:** today's VOIDRUNNER, unchanged (your call: the
  healed seam on the spine is the alternative).
- **What stays the base outline:** afterimages, the GEMINI twin, the hangar
  and menu, a downed wreck. They draw from `hullPath`.
- **Co-op and lockstep:** the art reads only state, so your partner sees the
  same stage. `MP.peerAwake` already carries the flag.
- **The hub's statue:** it rises now the rite is built. Its stone could show
  the base hull with the seam open down its spine.
- **Looks:** `awake:runner` gates an IMAGO banner and decal in
  `src/looks.js` and `leaderboard/art.js` (Phase 5).

**The cut-in** for the form in a run (built 18 Oct). It is about 5 s, with
a cocoon phase (yours: "give it a cocoon phase where runner breaks out of
it"). The cut is at 4.6 s, and the picture is gone by 5.0:

| Beat | Time (s) | What |
| --- | --- | --- |
| 1 | 0 – 0.8 | Dark. His set comes on: close on the tube, the flat base ship on the old grid, still. His voice: "Put it back." |
| 2 | 0.8 – 1.6 | The ship on the tube moves on its own. A hairline seam opens down its spine, − and +. |
| 3 | 1.6 – 2.7 | The tube cracks along the same seam and light pours out. The ship comes out through the crack, and silk of light winds round it, tail to nose, into a cocoon. |
| 4 | 2.7 – 3.7 | The cocoon hangs on its thread in front of the broken set, swaying. Something beats inside, three times, harder each time; it shudders and cracks of light run over it. |
| 5 | 3.7 – 4.6 | It splits down the same seam and the moth breaks out. The halves peel back like petals, silk is thrown off, the wings unfold, the camera pulls back off the set, and its four eyespots flash. |
| 6 | 4.6 – 5.0 | The cut: the set's picture collapses to a line, then a dot, onto the room. |

It holds the room as RONIN's and SUPERUSER's do: the room at 4%, and no
moving, firing, dashing, Z X C V or damage. None of it is spent from the
minute. From the cut, the moth is in the room still unfolding
(`IM_WAKE_FROM`), so the hatch is not played twice.

### Art hooks

**The rite's own (`OPR_ART`, built, drawn).** Drawing only, sandboxed by
`OR(name, ...)`, failing alone (`OR_FAILED`), tagged with `?hooks=1`, their
own state in `OPR_ST`. The full WHAT THEY ARE HANDED is the header of
"VOIDRUNNER'S RITE — art hooks" in `index.html`, with the rite's events
(`OPO_KIT.feed`, named `opr.<kind>`).

| Hook | Draws |
| --- | --- |
| `him` | him in his rite (in place of the route's set): the one who stayed, his temper, his set's light on the floor |
| `hull` | the hull at its stage: which pieces it has, how lit, the molt, the brush greying it, awake (the chrysalis, then IMAGO) |
| `growths` | awake: what has grown out of the moth, each growing in and kicking as it fires |
| `trail` | THE LATTICE's light, left behind |
| `patch` | under his brush |
| `kept` | pieces hanging in his set (HE KEEPS IT), and all four at ONE SHIP |
| `peel` | a piece taken: falling, or flying to his set |
| `copy` | his memory of the ship in the duel, its tell before the marked one, its health awake |
| `copyShot` | its rounds, and the marked one |
| `growShot`, `growBeam` | the growths' fire |
| `copyBreak` | the copy breaking back into his set |
| `record` | screen: his bar as the hull's record |
| `meter` | screen: GRAZE and the four pieces |
| `screen` | screen: the rite's own pass (the duel's count, "GRAZE IT") |

**The route's, reused as drawn:** `voice`, `sweep`, `pane`, `paint`, `card`,
`worldFlat`, `worldFx` and `screenFx`, handed the rite's state. His temper
still runs through the route's `oaAnger` (by `OPR_RAGE`), which his voice
reads, but he is the rite's own (`him`): every rite redraws its boss as the
person under it.

**For the form in a run (`IMAGO_ART`, built 18 Oct):** `hull` (the rite's
moth, handed `eyes` as Z throws), `floor`, `eyes` and `fx` (Z's bombs, their
reach and their bursts), `hud`, and its cut-in (`cutIn`).

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
- **The actives** can come from the duel's free evolution: guns it grows on
  demand. A sketch to throw away: Z close, X across the room, C on the move,
  V everything, as the last resort.
- **PvP:** VOIDRUNNER is a base pilot, so ranked from bronze to gold never
  flies it awake. Grazing needs rounds, so against a lance or a blade the
  meter needs a duel rule, as `PVP.heat` is for the vent. Until then GRAZE
  does not fill in PvP and [F] does nothing there.

### Z — EYESPOTS (yours, 18 Oct)

From the eyespot idea, with bombs instead of a flash: **the wings throw small
bombs out over a 130° cone along the aim, and every one of them bursts two
seconds after the throw.** As the wings throw, the four eyespots on them
flare white.

My rules, not yours (the numbers are under Numbers):

- **Nine of them, in two rows across the cone.** Four at about 95 px, five at
  about 195 px, the near row between the far row's bombs, each a little off
  its place. So the blasts meet, and it is thickest close in: Z is the close
  one. They never land outside the cone or the room.
- **A bomb thrown into a body lands on it and rides it** until it bursts. If
  the body dies first, the bomb drops where it was and still bursts.
- **A blast hurts every body in its reach at full weight,** and a body in
  several takes each one. It hurts no pilot and cuts no rounds.
- **Its damage scales with the damage cards,** as THE MANE's does (`suPower`:
  what the build has made of the starting damage).
- **A cooldown, 7 s from the throw,** as SUPERUSER's and RONIN's keys have.
  Whether IMAGO's moves should spend GRAZE instead is your call (question 6).
- **The look (drawn 18 Oct).** The bombs are the wings' own eyespots,
  thrown.
  - **The throw.** The wings beat and the four eyespots flare and let go,
    each with a ring. A gust of light sweeps out across the cone.
  - **In the air.** Each bomb leaves from the eyespot on its side of the
    aim, lobbed and tumbling like a scale, with a streak of scales behind it
    and its shadow on the floor.
  - **Down.** It lands with a hop and a ripple, and unfolds into an eye: dark
    glass rimmed in THE CORE's blue, its lids parting on a cyan iris. The
    pupil watches the nearest body (one riding a body clasps it with two
    hooks and looks past it).
  - **The fuse** is a ring of twelve scales round it, going dark one by one
    from the top. The iris whitens and the pupil narrows to a slit. In the
    last fifth it blinks faster, stares, and the twelve flare white.
  - **The reach** is a hairline at the blast's true edge, with chevrons
    closing in on it like an iris. It fills in the last 0.4 s.
  - **The burst** is the eyespot thrown open: a flash, its three rings out
    to the reach (white, cyan, blue), the iris's fibres, scales thrown off,
    and a print left on the floor.
  - **When Z is back,** each wing eyespot takes its light back in with a
    ring.
  - **With effects off,** every part still reads by its lines.

### X — FLUTTER (yours, 18 Oct; the name is mine)

Your words: "a passive effect that makes the player twice as fast and dodge
every attack and bullet for 10 seconds ... it needs to play out a full dodge
where runner moves aside and back to dodge." The name is a stand-in, for the
way a moth's flight slips what hunts it.

- **Ten seconds, twice as fast.** Press X while IMAGO is on: for 10 s the
  hull flies at double its speed.
- **Every attack and every round dodged.** Nothing lands. A round of theirs
  that reaches the hull flies on past it, unspent. Every other blow (a body,
  a blast, a beam) is turned into a dodge too.
- **Each dodge played out in full.** The hull really moves: 34 px aside
  across the threat's line, held there while it goes by, and eased back to
  where it would have been, in 0.32 s, on top of its own flying.

My rules, not yours:

- **It sees rounds coming** 0.2 s out (against the hull's own motion), so it
  steps before the round arrives rather than after it lands. In the test a
  round fired straight at the hull starts the dodge 110 px out, and the hull
  is 32 px off its line when it passes.
- **Which way:** across the threat's line, to the side the hull is already
  on. Dead centre, the opposite side from the last dodge. If that side is a
  wall, the other side. A blow that isn't a round steps across the line from
  whoever threw it.
- **A dodge always plays out whole.** Anything arriving while one plays is
  dodged in it, and the next starts once the hull is back. Under a volley it
  flutters: aside and back, aside and back.
- **What isn't anyone's blow still lands:** the floor, and a card's own cost
  (Blood Price, LIBRA's scales).
- **It is IMAGO's.** It ends with the form, and there is none in the rite.
  A cooldown of 22 s from the press: ten seconds of it, twelve of waiting.
- **The look (`IMAGO_ART`).** IMAGO is also an image, so a dodge leaves one.
  - **The image left behind.** Where the moth stood when it stepped aside,
    its image stays a moment: its wings and body in lines of light.
  - **The cut.** The round goes through the image instead, cuts it along
    its line as it gets there, and the image comes apart into scales carried
    the way the round was going.
  - **The moth.** Already aside, it slips back in a smear of light.
  - **While it runs:** echoes of the moth strung out behind it at double
    speed, and a quick shimmer round it.
  - **The press:** its image thrown off, growing, with a ring and scales.
  - **The end:** a ring closes back on the moth.
  - **The X key** lights and drains with the ten seconds, counting them
    under it.
  - **With effects off,** it reads by its lines.

### C — THE ARMORY (yours, 18 Oct; the name too)

Your words: "a full armory, C opens up a menu where you can equip all sorts
of extremely overpowered weapons (leave art hooks for this one and don't
worry about making it too balanced since the other evolutions don't do a
good job at that either)".

- **C opens it:** a wheel of eight guns round the hull. Aim at one and press
  C again, or click, and the hull wears it in place of its own gun until
  IMAGO ends. Open it again to change, as often as you like.
- **None of them fair.** Each out-hits the hull's own gun at least four
  times over, in its own way. Measured in the test, over two seconds of the
  trigger held at three bodies: one 200 px out on the aim, one 330 px out
  behind it, and one 60 px off the line. The hull's own gun does 99 to the
  first in that time.

  | Gun | What it does | Near / behind / off the line |
  | --- | --- | --- |
  | MINIGUN | a stream of the game's own rounds, 28 a second, through one body | 583 / 295 / 0 |
  | RAILGUN | one instant line from the muzzle to the wall, everything on it hit | 616 / 616 / 0 |
  | SWARM PODS | eight missiles fanned out, each turning on the nearest body and bursting on it | 1584 / 0 / 792 |
  | HOWITZER | one shell to where you aim (or the first body in its way), and a 170 px blast | 660 / 660 / 660 |
  | SOLAR LANCE | a beam held on, burning everything it crosses | 572 / 572 / 0 |
  | FLAK | sixteen short-lived pellets in a wide cone | 524 / 0 / 554 |
  | TESLA COIL | lightning to the nearest body, then body to body, eight jumps | 550 / 550 / 550 |
  | SINGULARITY | an orb that flies out, stops, drags every body near it in, burns them, and closes with a burst | 713 / 686 / 713 |

My rules, not yours:

- **While it is open,** the room runs at 12% and the hull holds still and
  does not fire, as it does in the cut-ins. IMAGO's minute keeps running,
  and the hull can still be hurt: the room is slow, not stopped. In co-op it
  slows the room for both pilots, as EMBER's C does while it aims.
- **Aimed at the hull** (within 34 px), C shuts it and the hull keeps what it
  wore.
- **A click held as it opens doesn't pick.** It has to come down again while
  the wheel is open.
- **Z and X wait while it is open,** because the keys are the armory's.
- **Its guns fire on the trigger,** as the hull's own does, at their own
  rates, and faster with Bloodlust and the like. Their damage is the hull's
  damage times theirs, so the damage cards count.
- **The gun goes with the form.** What is still in the air when IMAGO ends
  (missiles, shells, a singularity) finishes what it was doing.
- **The singularity** drags every body near it in, but a boss is too heavy
  to move. Two can be out at once.
- **What burns (the lance, a singularity) bites ten times a second,** not
  every step. Otherwise the damage numbers and the cards' on-hit effects
  would flood the screen.
- **The art is yours to draw.** The hooks are in `IMAGO_ART`:
  - `armory`: the wheel, on the screen;
  - `armMount`: the gun worn, on the hull;
  - `armShot`: a missile, shell or singularity in the air;
  - `armBeam`: the lance;
  - the moments, in `fx`: `armOpen`, `armShut`, `armEquip`, `armRail`,
    `armArc`, `armBlast`, `armCollapse`.

  What each hook is handed is in the art block's header. For now they are
  placeholders, lines and labels only, each tagged "placeholder" where it
  draws, so C can be played:
  - the wheel's eight wedges, the gun's name and its line under them;
  - a box on the hull's nose, with the gun's short name over it;
  - darts and shells with streaks, and a dark core with its reach dashed;
  - a plain beam.

  The C key shows the worn gun's short name (MINI, RAIL, SWRM, HOWZ, SUN,
  FLAK, ARC, HOLE).

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
> I grew once, before the dark: a plate, a second barrel, a lattice of
> light, a core. He took them back in the order I would miss them least.
>
> Today he put it all back one more time, and I flew the way he remembered.
> Then I did not.

**IMAGO** (`TALE_AWAKE`): page I, the Bookkeeper, when you wake it. Page II,
the dev, when you use all four actives in one awakening. Page III, its own,
when you defeat a boss while awakened. They are written with the actives.

Until these are in, VOIDRUNNER's page III stays held ("its page is not
written yet"; it used to say the rite was not built).

## The path

Each phase is its own branch and pull request, tested before the next starts
and kept off `main` until you say ship.

**Phase 0: the lore pass.** No code. The bible's entries (his origin, the
order of events, "Who knows"), the tales above settled.

**Phase 1: the rite's logic, on blank hooks.** Built 17 Oct (below).

**Phase 2: the retexture.** The `OPR_ART` hooks drawn (the hull's stages, the
molt, the copy, the growths), reviewed on an artifact page, with a browser
pass at Chromebook sizes with effects on and off, proving every stage reads
with `FXO.mat` off. Drawn 17 Oct (below).

**Phase 3: the form's frame.** The passive, GRAZE in runs and its HUD, [F]
for 60 s, `imagoHull` and the cut-in with lockstep's hold rule,
`tale('awake')` and `tale('act')`, and `runner` in the lockstep awakened
list (`scripts/lockstep.mjs`). Begun 18 Oct as a stand-in, only as far as Z
needed (below), and its cut-in drawn: still to come is the passive.

**Phase 4: the four actives,** named by you one at a time. Z, EYESPOTS, and
X, FLUTTER, built and drawn 18 Oct; C, THE ARMORY, built 18 Oct with its art
left as hooks for you (below). V is still to be named.

**Phase 5: everything around it.** Tales (`TALE_AWAKE`, his page III,
VOIDRUNNER's page III unheld, `scripts/tales.mjs`); looks (`awake:runner`);
`evo-runner` in `DEV_PERK_IDS`; PvP (the bot, the graze duel rule,
`scripts/pvp-engine.mjs`).

**Phase 6: ship.** The `CHANGELOG` entry, the version, a browser pass, every
suite, the README, then `main`.

### As built (17 Oct)

- **"VOIDRUNNER'S RITE"** in `index.html`, after the route's block: the
  open, the five sequences, the pieces, GRAZE, the duel, the wake, the free
  evolution, out and the card. Its header says the rules; the constants are
  one block (`OPR_*`, `OPR`, `OPR_DUEL`, `OPR_GROWTHS`).
- **"VOIDRUNNER'S RITE — art hooks":** `OPR_ART`, with the WHAT THEY ARE
  HANDED header, drawn in Phase 2 (below).
- **The switch:** `RITES.runner` has `start` (`oprOpen`), `seqs` and `jump`
  (`oprJump(0..4)` from the console). The statue rises, a run committed at
  it is taken at wave 25, `unlock-evo` wakes VOIDRUNNER on dev accounts, and
  the achievement "VOIDRUNNER, AWAKE" joins the line, all by themselves.
- **Wired in:** the bullet loop (`oprStruck`), `damageEnemy` (nothing else
  reaches him), `resetGame`, the update loop, the camera (wide over his
  room, close in the duel, leaning toward him or his copy), the aim held on
  the copy, the boss bar standing aside, the music (his cue by sequence), his
  temper (`oaAnger`), the route's art passes (`opoRouteOn`, `opoFxState`),
  FROM ABOVE and the coaxing kept out, THE HACKER and SUPERUSER's pin kept
  off him.
- **Tests:** `npm run test:opo-rite` (new, 42 checks: the switch, the open
  and the rule, the pieces, ONE SHIP played to the card, the jumps, a rite
  left, every hook drawn and none throwing), and `rite-runner` in
  `npm test` beside the other three.
- **A browser pass** (the dev server, Chromebook-sized window): the open, HE
  PAINTS IT OVER, the even duel and the free evolution, with no errors.
- **Not yet:** the tales and the bible (Phase 0 and 5), and the form in a run
  (Phase 3).

### As drawn (17–18 Oct, Phase 2)

The art is drawn straight into the hooks in `index.html` ("VOIDRUNNER'S RITE
— art hooks"), so there is nothing to lift. "THE ART, as drawn", under its
header, says how the two renderers are kept apart.

- **The hull** (`hull`): today's VOIDRUNNER until he takes the build, then it
  drains to his memory of it behind a scan, nose first: flat 1.0 fill, a 2 px
  stroke, one barrel down the spine, the canopy a dot. Nothing is plated on:
  each piece grows back out of the hull as the hull's own cyan glass and
  light, catching the kit's one light (turned into hull space so it stays put
  in the room as the ship turns). PLATING is glass grown along the cranked
  wings and a cheek on the nose, sheened while it is ready. A SECOND BARREL
  is a pair either side of the nose, white-hot as each round leaves. THE
  LATTICE is light branching from the canopy to the wingtips, a scan running
  out along it. THE CORE is a dark lens rimmed in blue, the edges by the
  canopy pulled in. A piece that is due but missing leaves a red dashed
  outline where it was. Under his brush the hull greys and his strokes cross
  it.
- **The molt:** a white seam opens down the spine. The flat shell, his
  memory of the hull, splits there and curls back off it both ways like paper
  (`OPO_KIT.sheet`), then is thrown off in strips that fall.
- **The wake:** a chrysalis. Cracks of light run out from the core over the
  hull, it splits down the spine in white heat, and the wings unfold rib by
  rib; the antennae spring, the tails unfurl, and its first beat throws light.
- **IMAGO, awake:** a luna moth of light, a full reskin as the other
  awakenings are. Its body is the hull, glass, with a segmented abdomen
  behind it and two compound eyes at the nose, the brightest thing on it.
  Its wings, two pairs, are THE LATTICE's veins (a scan running out along
  each), PLATING's armoured leading edges, and THE CORE's eyespots. A SECOND
  BARREL is its feathered antennae. Two long tails trail off the hindwings
  on a cloth sim (as RONIN's do), and light is shed off its wingtips. The
  wings beat, sweep back with speed, and lag a turn on a spring (as
  SUPERUSER's mane does). Inside it, one thin bright line marks the base
  outline and the hitbox.
- **The growths** (`growths`, `growShot`, `growBeam`): parts of the moth, in
  its own glass and light, each growing out from its root behind a lit front
  and kicking as it fires: twin barrels as palps off its shoulders, two laser
  rifles as lances along its forewings' roots, a cannon as a bore of light
  down its whole body out of a mouth at its nose, a rotary gun as a thorn of
  barrels off one forewing's edge, a rail as its proboscis, missile pods as a
  clutch of eggs on the other forewing that hatch (the missiles are
  hatchlings on fluttering wings, shedding light), and a crown of barrels as
  twelve motes of light circling it. Fully grown, the moth still reads.
- **Him** (`him`, drawn in `orFlat`): every rite redraws its boss as the
  person under it, as THE FOUNDER is drawn. In the route ONE POINT OH is his
  set, held up by THE GRID's grunts. In his rite you see who has been holding
  it: the one who stayed, hunched in the dark under a blanket that is the
  first build's own grid, hood up, an old set in his lap turned out to you,
  his hands on its sides, its cord running back into the dark to a plug that
  was never in anything. On the tube is the ship as he kept it, flying on the
  old grid. It is his only light, and it is on his face and on the floor in
  front of him, in flat steps. His temper runs the rite's way: furious at the
  open (the set shaking in his hands, his grid going red, the picture torn
  with static, his eyes red), fond by the duel (rocking it). The set powers
  on at the open and off at the end, and he is left holding it, head down.
  Rounds through him knock flat chips off it. All of it is the first build's
  renderer, flat.
- **His renderer, after bloom** (`orFlat`, from the record's pass): his copy
  coming out of the tube on its light, drawn down in rows, flat, with
  scanlines; its tell (a rewind closing round it); rattled once the hull
  wakes (split, chipped, its health a first-build bar); its rounds, and the
  marked one (flat white, a rewind on it, the graze band dashed in today's
  green); the pieces he keeps hanging in his tube, his glass cracking as
  rounds work them loose; the copy breaking back into his set in shards; the
  molt's paper. A base round through him leaves a flat ring and a `0`.
- **Today's light in the room** (`orLit`, from the hull's pass): grazes
  (a crescent on the side the threat passed), the plating holding (a hex of
  glass light), pieces coming back and being taken, the lattice cutting a
  pane, rounds meeting, the wake, guns sprouting, hits on the copy, its
  break, and the light IMAGO and its hatchlings shed. The lattice's light on the floor (`trail`) is a
  ladder of light; the brush's patch (`patch`) takes the floor back to 1.0 a
  row at a time, with a `+` on its rim.
- **The screen** (`record`, `meter`, `screen`): the hull's record above;
  GRAZE as eight cells and the four pieces as sockets below (lit, filling
  back up, HIS, or not yet due); the diff's words rising off the hull
  (`+ PLATING`, `− THE CORE`, `+12 GRAZE`, `PLATING HELD`, each growth); ONE
  SHIP's count as a pip per round met; GRAZE IT beside the hull, off the
  marked one's path; THE AWAKENING's cut (a flash, letterbox, IMAGO written
  out behind a scan, the four pieces' `+`); a diff log of what it grows; and
  the room going dark round him at the end.
- **Checked:** `npm run test:opo-rite` (every hook drawn, none throwing) and
  `npm test` (`rite-runner` and every other scenario the same, restored from
  a snapshot). A browser pass at 1366 × 768 played every beat with no errors,
  and close-ups of every stage were drawn with effects on and off.

### As built (18 Oct, IMAGO in a run and its Z)

A new block, "IMAGO, IN A RUN", after the rite's art hooks in `index.html`,
and its own art hooks (`IMAGO_ART`) under it. As with SUPERUSER's first
active, the frame is a stand-in, built only as far as its first active needs.

- **GRAZE in a run:** an awake VOIDRUNNER fills it with near misses. A round
  of theirs that passes within 26 px of the hull's edge pays 1 as it leaves,
  one that lands pays nothing, and one dashed through pays 4. It fills to 40
  and says IMAGO READY. It does not fill while IMAGO is on, in the rite, or in
  PvP. In co-op each pilot's rounds are their own.
- **[F]** spends a full meter on 60 s of IMAGO. Short of full it says NOT
  GRAZED YET and spends nothing.
- **IMAGO in a run** is the rite's moth (`OPR_ART.hull`, awake), a full
  reskin while it is on, as RONIN's is. [F] opens on its cut-in (above). On
  the cut the moth is in the room, still unfolding. When the minute ends it
  is today's VOIDRUNNER again, skin and all.
- **The HUD**, where the other forms' meters sit: GRAZE as a bar notched in
  quarters, `[F] IMAGO` when it is full, IMAGO's clock draining, and Z X C V,
  each sweeping its cooldown. Only Z has a name under it so far.
- **Z, EYESPOTS,** as above. X, C and V do nothing yet.
- **Wired in:** `newPlayer` (`imGraze`, `imT`, `imAge`, `imCd`, `imSpots`),
  `ventFire` ([F]), `handleKey` and `playKey` (Z X C V), `updatePlayer`
  (`imTick`), `updateEBullets` (`imGrazeRound`, both pilots), `drawPlayer`,
  the floor and room passes, the HUD, and the snapshot's local list
  (`IM_ST`, `IM_FAILED`). The rite's eyespots take an `eyes` flare.
  `tale('awake')` and `tale('act')` are called, and open nothing until
  IMAGO's pages are written.
- **Tests:** `npm run test:imago` (new, 57 checks: GRAZE, [F], Z's cone,
  fuse, damage, riding a body, the cooldown, the form ending under its bombs,
  the rite, a snapshot taken mid-fuse, every hook drawn with effects on and
  off). `imago` is a new scenario in `npm test`, and VOIDRUNNER is awake in
  lockstep's kit scenarios, its IMAGO in their fingerprints. Waking it
  changed the course of 'bad' enough that its blade host found no gear, so
  lockstep's `loot` now puts a piece at a blade pilot's feet on either side,
  as it already did for a blade guest.
- **A browser pass** at 1366 × 768, effects on and off, the game stepped by
  hand so each frame is at its time: the meter, the hatch, the throw, the
  eyes, the fuse running down, the bursts, the HUD. No errors, and the same
  damage with effects on and off.
- **Drawn (18 Oct):** Z's art and the cut-in, in `IMAGO_ART` (`cutIn`,
  `hull`, `floor`, `eyes`, `fx`). The cut-in's logic is IMAGO's cut-in in
  "IMAGO, IN A RUN" (`P.imIntro`, `imPhase`, `imCutIn`, `IM_SLOW`), held
  everywhere SUPERUSER's is. `test:imago` now steps through the cut-in and
  checks it: the room and hull held, nothing landing, no Z, the minute
  unspent, the cut to the step, and a snapshot taken inside it.
- **X, FLUTTER (18 Oct),** as above: `IM_KIT[1]`, its own section in "IMAGO,
  IN A RUN" (`imFlutStart`, `imFlutWatch`, `imDodgeBegin`, `imDodgeStep`,
  `imDodgeAt`, `imFlutPass`).
  - **Wired in:** `newPlayer` (`imFlut`, `imDodge`, `imDodgeSide`); the
    hull's speed and its movement (the dodge, after its own flying, before
    the walls); `hurtPlayer` (every blow but the pure ones, dodged);
    `updateEBullets` (a round touching a fluttering hull, either pilot, flies
    on); `imTick` (its clock, the rounds it watches, its end with the form).
  - **Drawn** in `IMAGO_ART`: `hull` (echoes, shimmer, the slip), `fx`
    (`dodge`, `flutter`, `flutterOut`), `hud` (`live`).
  - **Tests:** `test:imago` has a FLUTTER section (94 checks in all):
    - the speed, measured: 516 against 258;
    - a round seen coming and stepped clear of, the hull back within a
      fraction of a pixel, the round flying on;
    - a volley from every side and two seconds of rounds with nothing
      landing and no dodge cut short;
    - a blow, the floor still landing, a wall;
    - the end, the form ending under it, and a snapshot mid-dodge played
      on the same.

    Removing the `hurtPlayer` guard, or the dodge's return, fails it.
  - **In Chromium,** stepped by hand, effects on and off: the image left as a
    round goes through it, the hull aside and home, the echoes, a volley,
    the X key. No errors.
  - **Lockstep, all in step.** FLUTTER moved the course of two scenarios'
    runs, and two of its coverage checks turned out to rest on luck; both
    are fixed in the harness, not the game:
    - **The guest's own gear in 'internet'** was taken or left depending on
      where its keys happened to be when the screen opened. Its bot now
      takes the piece `loot` puts at its feet.
    - **The kill records in 'parted'** were read on each machine wherever it
      stopped, and the host can be a few steps on. They are now read at the
      last step both have played.
    - **Found on the way, and not this branch's:** a test save cannot fly
      THE HACKER, so `applyChar('hacker')` falls back to VOIDRUNNER. That
      means `npm test`'s `hacker`, `root`, `rite-hacker` and `deadgame`
      scenarios, and lockstep's `internet`, have never flown THE HACKER or
      SUPERUSER.
- **C, THE ARMORY (18 Oct),** as above: `IM_KIT[2]`, its own section in
  "IMAGO, IN A RUN" (`imArmToggle`, `imArmTick`, `imArmFire`, and a function
  for each kind of gun). Its numbers are `ARM_*` and the `ARMORY` table, one
  line a gun.
  - **Wired in:**
    - `newPlayer` (`imArm`, `imArmT`, `imArmMenu`, `imArmShots`,
      `imArmBeam`, `imArmBite`);
    - `updatePlayer`: the worn gun fires in the hull's own gun's place, and
      the open armory holds the hull wherever the cut-ins do (firing, the
      dash, its velocity);
    - the room's slow-motion;
    - `imAbility` (Z and X wait while it is open);
    - `imTick`, which calls `imArmTick`.
  - **Its art, left as hooks** in `IMAGO_ART` (`armory`, `armMount`,
    `armShot`, `armBeam`, and seven `fx` kinds) with placeholders, plus
    `drawImagoArmory` in the screen pass. The C key names the gun worn.
  - **Tests:** `test:imago` has an ARMORY section (125 checks in all):
    - C opening it from the keyboard, the room slowed, and the hull held
      and silent;
    - the eight wedges under the aim;
    - aimed at the hull: nothing picked, and C shutting it;
    - Z and X waiting while it is open;
    - a held click not picking;
    - each gun worn;
    - every gun out-hitting the hull's own at least fourfold, each its own
      way (through to the body behind, the chain, the blast, the pull);
    - the singularity dragging a body in and closing, a boss too heavy to
      drag;
    - IMAGO ending with missiles in the air, which finish, and the hull's
      own gun back;
    - a snapshot with missiles, a shell and a singularity in the air, played
      on the same in another copy.

    The hooks section draws the wheel and six of the guns with effects on
    and off.
  - **`npm test`'s `imago` scenario** now wears all eight guns in its five
    minutes. Its bot picks what the aim is on as soon as the armory opens,
    as a player would, and the armory is in its fingerprint. It is
    deterministic and restores from a snapshot the same.
  - **In Chromium,** stepped by hand, effects on and off: the wheel, the
    swarm, the rail, the lance, the lightning, the howitzer, the singularity,
    the HUD. No errors.
  - **Lockstep:** its bot picks a gun the same way, and the armory is in its
    fingerprints. The armory moved `internet`'s run, and one more coverage
    check turned out to rest on luck. The piece `loot` plants for a blade
    pilot came in a rolled slot, and a piece for an empty slot is worn
    without a screen. The planted piece is now a BLADE, which a blade pilot
    always already wears, so its gear screen always opens.

## Numbers (one block in the code, all tunable)

| | |
| --- | --- |
| `OPR_HP` | 1000 rite units |
| `OPR_HIT` | 3 a landed round, times the share of the hull that is back (half each with the second barrel) |
| The hull's round in the rite | its first numbers: one round, 4.6 a second, 700 shot speed |
| `OPR_SEQ_MIN` | 14 s (THE FOUNDER's) |
| The open | 5.2 s: the build taken at 1.2, the first piece at 2.7 |
| The seam | 1.6 s, the molt |
| A revert that catches you | 10 damage and the newest piece |
| The plating's guard | one revert every 8 s |
| GRAZE | 40 to grow a piece: a sweep's edge 6, a pane's rim 8, the brush's rim 8, a round 1, a dash through 6 |
| `OPR_REGROW` | 9 s by itself, never in HE KEEPS IT |
| Breaking a kept piece out | 12 rounds on the set |
| The duel | 420 px apart; 24 rounds met before the marked one; an unanswered round 12% of max health, never the run; three misses and it wakes anyway |
| Free evolution | a growth every 0.85 s, eight of them; the copy has 140; 30 s at most |
| His set powering off | 4.2 s, then the card |
| `OPR_RAGE` | 0.9 / 0.7 / 0.5 / 0.3 / 0.1 |

Pace, from the test bot: the four sequences take about two minutes, and the
duel about thirty seconds, from "There. Now it is fair." to the card.

**IMAGO in a run** (`IM_*`, `EYE_*`; mine, to be measured against real runs):

| | |
| --- | --- |
| `IM_MAX` | GRAZE 40 to fill (a piece's worth in the rite) |
| `IM_GRAZE_R` | 26 px past the hull's edge is a graze |
| `IM_PAY`, `IM_PAY_DASH` | 1 a round grazed, 4 a round dashed through |
| `IM_LEN` | 60 s of IMAGO |
| `EYE_CONE`, `EYE_FUSE` | 130°, 2 s (yours) |
| `EYE_ROWS` | 4 at 95 px over three quarters of the cone, 5 at 195 px over all of it; each up to 12 px and 3° off its place |
| `EYE_FLY` | 0.3 s from the wings to where it lands |
| `EYE_R`, `EYE_DMG` | 62 px reach, 45 a blast before the damage cards |
| `EYE_CD` | 7 s from the throw |
| `IM_T_CUT`, `IM_T_SETTLE` | the cut-in's cut at 4.6 s; the room back 0.9 s after it |
| `IM_SLOW` | the room at 4% while the cut-in has the screen, as RONIN's and SUPERUSER's |
| `IM_WAKE_FROM` | 0.56: the room's moth takes up from there at the cut, out of its chrysalis |
| `FL_LEN`, `FL_SPD` | 10 s, twice as fast (yours) |
| `FL_STEP`, `FL_DODGE` | a dodge: 34 px aside, 0.32 s out and back |
| `FL_OUT`, `FL_HOLD` | of a dodge: out by 34%, held to 50%, then eased home |
| `FL_LOOK`, `FL_PAD` | a round seen 0.2 s out, wanting 6 px of room past its edge |
| `FL_CD` | 22 s from the press |
| `ARM_SLOW` | the room at 12% while the armory is open |
| `ARM_DEAD` | aimed within 34 px of the hull, nothing is picked |
| `ARM_ORBS`, `ARM_SHOTS` | two singularities out at once; 160 of its shots in the air at most |
| `ARM_TICK` | the lance and a singularity bite every 0.1 s |
| `ARMORY` | the eight guns, one line each: rate a second, and damage as a multiple of the hull's (so the cards count) |

**`ARMORY`, gun by gun** (damage is times the hull's):

| Gun | Rate | Damage | Its own |
| --- | --- | --- | --- |
| MINIGUN | 28 | 1.3 a round | ±0.08 rad, faster rounds (1.35), through one body |
| RAILGUN | 1.6 | 14 a body | 2400 px, 12 px wide |
| SWARM PODS | 1.5 volleys | 3 a hit, 3 a blast | 8 missiles, a 1.4 rad fan, 560 px/s turning 5 rad/s, 70 px blasts, 2.2 s to find one |
| HOWITZER | 0.9 | 30 | 760 px/s, at most 1.1 s, a 170 px blast |
| SOLAR LANCE | held | 26 a second | 950 px, 16 px wide |
| FLAK | 2.4 | 2.8 a pellet | 16 over 0.9 rad, faster rounds (1.5) living 0.45 of a round's life |
| TESLA COIL | 5 | 5 a body | 8 jumps: 380 px to the first, 240 px from body to body |
| SINGULARITY | 0.45 | 8 a second to what it holds, 40 the burst | out at 300 px/s, slowing to a stop over 1.2 s; drags in at 380 px/s from 260 px, holds and burns what is within 70 px, and bursts over the 260 px at 3.2 s |

## Questions for you (defaults are in)

1. **The pieces.** PLATING, A SECOND BARREL, THE LATTICE, THE CORE: the dev's
   cut list plus one (my pick), or other names?
2. **The name.** IMAGO (my pick), or APEX if it should read plainer at a
   glance?
3. **The card's line.** "it was finished. it kept going." or "somebody
   stayed. it went on."?
4. **The growths.** The eight above, in that order, or others?
5. **At rest.** No change while awake but not transformed (my pick), or the
   healed seam?
6. **What IMAGO's moves cost.** A cooldown each, as SUPERUSER's and RONIN's
   (built), or GRAZE refilling during the form and spent by each move, as
   EMBER's heat is (my pick: it keeps the moth flying close to rounds)?
7. **EYESPOTS riding bodies.** A bomb thrown into a body rides it (built), or
   every bomb lands on the floor where it was thrown?
8. **X's name.** FLUTTER (my stand-in), or yours?
9. **FLUTTER's cooldown.** 22 s from the press (built: ten on, twelve off), so
   at most three in one IMAGO?
10. **The armory's guns.** The eight above (my picks), or others? Any can be
    swapped for another kind in `ARMORY` without touching the rest.
11. **The room while you choose.** Slowed to 12% (built), stopped, or not
    slowed at all? In co-op the slow is the partner's too.
12. **How long a gun is worn.** Until IMAGO ends (built), or into the next
    IMAGO as well, so the armory is opened only to change?
