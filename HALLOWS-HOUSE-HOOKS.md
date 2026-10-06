# ALL HALLOWS · ACT II: THE HOUSE — the art hooks

Chapter II of Book I (opens 14 Oct 2026, by `HL_EVENT.chapters`). The logic
plays end to end under placeholder hooks in `index.html` (shapes and labels,
just enough to play it), and **the art is drawn over them in `hl-art.js`**, in
the section `ALL HALLOWS · ACT II: THE HOUSE — the look` at the foot of the
file. This file is the contract both keep, the way `HALLOWS-GUIDE.txt` (on
`beta`) is for Act I.

## The look (hl-art.js)

An empty lobby in an old house. Dark boards and worn rugs; along the walls, five
rooms somebody left with the menu still open (a set on a stand showing
WAITING FOR PLAYERS, SEARCHING FOR MATCH with its clock still counting, READY
CHECK, PRESS START, 0 ONLINE; a couch facing it, the pads where they were
dropped, a floor lamp). The screens never go off; the lamps are on THE QUIET's
timer, come back up on a death, and die for good in DEAD GAME's dark. Violet is
the house and what it lifts, cold (`#a5f3fc`) the soul's, grey DEAD GAME's, red
only what is about to hit you.

- **SHEET**: a verlet cloth skirt under a dome, the hem trailing as it moves.
  The head takes the shape of what is under it (a brute's shoulders, a dasher's
  prow, a spitter's nozzle turned at you, a bomber's lit fuse…), and the hem
  leaks the colour of it. Torn, it rips in two and leaves a crumpled sheet on
  the floor with its two eye holes. A marked one is cold-edged with light in its
  eyes, and thins out in its last four seconds before it slips out; what it said
  rises as a chat line.
- **LURKER**: a ragged heap of the dark on long arms. Past the light only its
  eyes, drawn over the fog (`drawHlHouseQuiet`) so they are seen at all; lit, it
  smokes and burns.
- **POLTERGEIST**: a howling violet wisp with a tail of where it has been, hands
  that reach up under what it lifts, threads to it, and a red line and reticle to
  you while it winds up. The wreckage: a chair, a side table, a dead set, a stack
  of games, a box of cables, the photo of the four of them; the dead as flat grey
  husks.
- **DEAD GAME**: a comment that will not go away: a speech bubble with a face,
  his name and `· 6y`, `▲ 0 ▼ REPLY`, and a thread of replies hanging off it on a
  rope. A ghost of a post when he is out of the room (scanned, dashed). His
  wind-ups are on his face: `DEAD GAME IS TYPING…` before A THREAD, cheeks puffed
  before RATIO. His barks are comments. LAST SEEN: grey dashed hulls under the
  names of the ones who left. He bursts into his own letters, and a small grey
  bubble is left on the floor, still typing.
- **The screen**: the errand as lobby chat chips (`ez` `wait` `···`), the room's
  meter as an ONLINE player count, a bulb on his bar where the lights go out,
  and STILL HERE greys the world with a ring of ten.

One floor in memory at a time: entering either area drops the other's baked
floor, and the menu's preload bakes the house's once it is open and the patch
is done. `npm run test:hallows` flies the house on the placeholders and again
with `hl-art.js` loaded (every hook called, none throwing).

## What is built

- **THE HOUSE**: five waves (11–15 of a run) of its own three bodies, DEAD GAME
  on the fifth once the errand is done; otherwise "THE HOUSE LETS YOU GO".
- **THE QUIET**: the light round the hull closes while nothing dies, and every
  death throws it back out. About four seconds without one and it is dark past
  the hull; it keeps closing after that.
- **SHEET**, **LURKER**, **POLTERGEIST**, and DEAD GAME's **LAST SEEN** decoys.
- **LAST MESSAGE** (quest 3): three marked sheets in waves 2–4, kept across
  attempts, read in order: *ez · wait · brb*. Pays 10 candles and **SHEET**.
- **STILL HERE** (quest 4): DEAD GAME. Pays 15 candles and **STILL HERE**, and
  the soul's second ascension in the vigil (state 3: whole).
- **The medals** SHEET and STILL HERE work in every run the event's medals do.
- **The word after** for DEAD GAME: one line after a death in his fight.
- **The menu's line** when the floor opens: *"It has gone up a floor. It is
  asking for you."* (through the prologue's own hatch art: no new hook).

The script and rules are `HALLOWEEN-PLAN.txt` §7 and `EVENT-DRAFTS.txt` (both on
`beta`). Where this build had to decide something the plan left open, it is under
*Decided in the build* at the foot.

## Where the hooks are

All of them are in `index.html`, at the **foot of the art hooks block**, in the
section `ACT II: THE HOUSE — art hooks`, *inside* the existing markers:

```
/* ===…
   ALL HALLOWS · ACT I — art hooks
…
   ACT II: THE HOUSE — art hooks
…
/* ===================== end of ALL HALLOWS · ACT I art hooks ===================== */
```

They sit inside the Act I markers on purpose: the lift
(`lift-hl-art.mjs --art`) treats everything between those markers as a hook, so an
`hl-art.js` that declares these names is accepted with no change to the tool.
Put the house's art in `hl-art.js` beside the patch's; its functions replace the
placeholders by name, as Act I's do.

**THE HOUSE never calls Act I's hooks.** Those are the patch's, and the art drawn
on them draws the patch whatever room it is asked about (`hlLights`,
`drawHlAreaFloor`, `drawHlGlow`, `drawHlBody`, `drawHlEBullet`, `drawHlAreaHud`…).
The seams pick one set or the other (`hlDrawBody`, `hlDrawEBullet`,
`hlDrawBossBar`, `hlHouseScreen`, and the branches in `hlDrawFloor`,
`hlDrawWorldOver`, `hlDrawWorldGlow`, `hlDrawWorldTele`). `npm run test:hallows`
fails if an Act I drawing hook is ever called while the house is on.

Still shared with Act I, and fine as they are: `hlArtTick(dt, 'house')` (called
first, then `hlHouseArtTick`), `hlAreaEndFx`, `hlQuestDoneFx`, `hlBarkFx`,
`hlSayPortrait`, `hlSoulChangeFx`, `hlAscendFx` (n = 2), `drawVigilWorld` (the way
up to the house is open now), `drawHlStandUi` and `hlArtMedalGlyph` (SHEET and
STILL HERE are no longer `later`), `drawHlMedalHud`, and `drawHlHatch` (the
chapter beat plays through it: see *The menu*).

## The rules (as Act I's)

- **Draw, do not decide.** Read any state listed here; write none of it. Your own
  fields on an object take an `art` prefix (`e.artSheet`), never `hl`.
- **Time** from `uiTime` or the fields handed in. Anything that advances (cloth,
  ropes, springs, ambient particles) advances in `hlHouseArtTick(dt)`.
- **World hooks** draw in world coordinates with the camera applied; **screen
  hooks** in CSS pixels (`W` × `H`). Leave `ctx` as you found it.
- **FX hooks** (`…Fx`) are called once, at the moment, from the logic.
- **The dark is not yours to make.** THE QUIET's dark is the fog
  (`hlDrawQuiet`), drawn by the logic over the finished world and under the HUD,
  the same way the challenges' fog is. Light makes the house beautiful
  (`hlHouseLights`); it must never be the only thing that makes it dark.

## The order things are drawn in, in THE HOUSE

```
WORLD (camera applied)
  floor, grid, arena walls
  drawHlHouseFloor(A)            the house's floor dressing
  drawHlHouseWreck(w)            each piece lying about (not lifted)
  … corpses, then enemies: drawHlHouseBody(e, ea) for its bodies and DEAD GAME
  the hull
  hlHouseLights() → light pass   THE LIGHT PASS, if it returns true
  drawHlHouseWreck(w)            each piece a poltergeist has up (w.by)
  — additive —
  enemy rounds: drawHlHouseEBullet(b)
  … particles
  drawHlHouseGlow()
  drawHlHouseBossDeath(d)        DEAD GAME coming apart
  — plain paint —
  drawHlHouseTele(e)             the telegraphs
— post (bloom, grade), vignette —
SCREEN
  THE FOG (the logic's; not a hook)
  drawHlHouseQuiet(x, y, r, k)   over the fog, round the light
  drawHlHouseBark(b)             DEAD GAME's lines: world space again, over the dark
  HUD …
  drawHlDeadGameBar(e, x, y, w)  over his health bar
  drawHlHouseHud(A, area)
  drawHlOnlineHud(v, line, k, area)   in his fight
  drawHlMedalHud(...)            (Act I's)
  drawHlGhostHud(g)              STILL HERE, in any run
```

## The hooks

### The room

| Hook | Handed | What it is |
| --- | --- | --- |
| `hlHouseArtTick` | `(dt)` | Once a frame in the house, after `hlArtTick(dt, 'house')`. Step cloth and ropes here. |
| `hlHouseEnterFx` | `(A)` | Arriving in the house (in place of `hlAreaEnterFx`). |
| `hlHouseLights` | `()` | The light pass. Return true to run it (`hlLightBegin`, `hlLight`, `hlOcc*`, as `HALLOWS-GUIDE.txt` §6). Read `hlQuietR()` for the light round the hull. Placeholder: false. |
| `drawHlHouseFloor` | `(A)` | The floor and anything fixed on it. `A.stage` has the placeholder colours. Bake it (`hlBake`) if it is heavy. |
| `drawHlHouseGlow` | `()` | Anything else that glows (additive). |
| `drawHlHouseQuiet` | `(x, y, r, k)` | Screen space, over the fog: the edge of the light. `x, y` is its centre (the hull), `r` its radius in screen px, `k` 0..1 how dark the room is. |
| `hlQuietFlareFx` | `(x, y)` | A death at x, y threw the light back out. |
| `hlQuietDarkFx` | `()` | The light has just closed past the hull. |

**THE QUIET** — `hlArea.quiet` `{ t, r, dark, wave }`: seconds since the last
death (negative in a wave's grace), the light's radius in world px, whether it is
dark past the hull. `hlQuietR()` is that radius (0 outside the house), `hlQuietK()`
0..1 how dark. `hlArea.blackout` is DEAD GAME's last phase (`QUIET_BLACK`: smaller
and faster). `hlArea.last` is the last few of a wave with nothing more coming: the
dark stops at the hull and the HUD should point at what is left. The fog clears
inside `0.6 r` and is nearly opaque by `1.45 r`.

**What is lying about** — `hlArea.wreck`: `[{ id, x, y, r, col, sides, kind,
junk, type, t, by, lift }]`. `kind` is `'junk'` (furniture, there from the start;
`junk` 0–5 says which piece) or `'body'` (left by a death: `type`, `col`,
`sides` are the body's; it goes after `WRECK_LIFE`). `by` is the id of the
poltergeist that has it up (0 if none), `lift` 0..1 how far up it is.

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlHouseWreck` | `(w)` | One piece. Drawn under the bodies while on the floor, over them while lifted. |
| `hlWreckLandFx` | `(w)` | A thrown piece came down here, and lies about again. |

### The bodies

One hook for all of them: **`drawHlHouseBody(e, ea)`**, in place of the generic
polygon (the generic glow, elite ring and hacked collar are drawn under it).
Branch on `e.type` (`'sheet'`, `'lurker'`, `'poltergeist'`, `'lastseen'`) and
`e.boss === 'deadgame'`. `ea` is the alpha the game wants. Every body has `x, y,
r, ang, col, sides, flash, hp, maxHp, elite, hacked, t, vx, vy, state`.

**SHEET** — a sheet over something else, drifting at you.
- `e.hlUnder` what is under it: an ordinary roster type (`'brute'`, `'spitter'`…,
  see `SHEET_UNDER`). The sheet is sized to it (`e.r`). Hint at the shape.
- `e.hlMarked` the errand's: edged in the soul's cold light (`#a5f3fc`),
  nothing under it, runs from you, slips out after `MARK_ESCAPE` (18 s; `e.t`).
- `hlSheetTearFx(e, inner)` its death: the cloth **tears** (`hlVTear`,
  `hlDrawCloth` in the kit). `inner` is the body now out (`inner.hlUnsheeted`),
  or null for a marked one. Keep the cloth on `e.artSheet` and step it in
  `hlHouseArtTick`.
- `hlMarkSproutFx(e)` a marked one comes up · `hlMarkTornFx(e, n, line)` one
  torn, `n` of 3, and the line under it (`'ez'`, `'wait'`, `'brb'`) ·
  `hlMarkLostFx(e)` one slipped out.

**LURKER** — lives in the dark.
- `e.state` 0 waiting past the light · 1 eyes open (`LURK_WIND` 0.45 s): the tell
  · 2 the strike (`e.hlStrikeAng`, locked) · 3 running back into the dark.
- `e.hlDark` past the light: **it is not seen**. Draw nothing of it but, in states
  1 and 2, its eyes. `e.hlLit` it is in the light: it runs, and takes double.
  Outside THE HOUSE (the Bookkeeper can summon one) both are false: draw it plainly.
- `hlLurkWindFx(e)`, `hlLurkStrikeFx(e)`, `hlLurkBurnFx(e)` (just caught in the
  light: the light burns it).

**POLTERGEIST** — never attacks with anything of its own.
- `e.state` 0 drifting, looking · 1 has something up (`e.hlHold` is the wreck's
  id: `hlWreckById(e.hlHold)`), `POLT_LIFT` 0.8 s: the tell.
- `hlPoltLiftFx(e, w)`, `hlPoltThrowFx(e, w, b)` (`b` is the round it became).

**LAST SEEN** (`'lastseen'`) — DEAD GAME's decoys: the grey shapes of the ones
who left. Harmless and worth nothing; they soak fire. Gone after
`DG_DECOY_LIFE` (14 s; `e.t`). `hlDgDecoyFx(m)` one left · `hlDecoyPopFx(m,
shot)` one gone (shot: true if spent on).

### DEAD GAME (`e.type 'boss'`, `e.boss 'deadgame'`)

A ghost shaped like a comment: a speech bubble with a face, trailing a thread of
replies (the kit's rope).
- `e.hlSolid` he is in the room (the meter is at or over `DG_LINE`); else a
  ghost. `e.hlSolidK` 0..1 eases between the two over `DG_FADE_T`: fade him on it.
- `e.hlWind` `{ kind: 'thread'|'ratio', t }` his wind-up (`DG_WIND` 0.45 s);
  `e.hlThread` `{ n, t }` while a thread of replies is going out.
- `hlArea.online` the room, 0..1 · `hlArea.cull` THEY LEFT: `{ x, y, t, r, warn }`
  — gathering round him while `t < warn` (`DG_CULL_WARN` 1.2 s), then a grey wave
  going out to `DG_CULL_R` (560 px); what of his it reaches is taken back
  (`hlCullable(o)` says what it can take) · `hlArea.blackout` the last phase.
- Hooks: `hlDgSolidFx(e, solid)` (into the room or out of it), `hlDgWindFx(e,
  kind)`, `hlDgCullFx(e)` (THEY LEFT is called), `hlDgTakeFx(o)` (one taken back),
  `hlDgDarkFx(e)` (the house goes dark), `hlHouseBossDeathFx(e)` and
  `drawHlHouseBossDeath(d)` (`d = { boss, x, y, r, t }`, drawn until the room
  hands you back to the vigil).
- **Barks**: `drawHlHouseBark(b)` `{ e, x, y, r, boss, text, t, life }` —
  world space, drawn **over the dark**: he is heard whether or not he can be
  seen. The draft styles his as comment bubbles.
- **His bar**: `drawHlDeadGameBar(e, x, y, w)` over his health bar (14 tall): the
  placeholder notches `DG_DARK_AT` and greys the bar while he is a ghost.
- **The meter**: `drawHlOnlineHud(v, line, k, area)`, screen: `v` the room,
  `line` `DG_LINE`, `k` his `hlSolidK`. Placeholder: a bar at y 102.

### The rounds

`drawHlHouseEBullet(b)` for every round with `b.hlKind` `'wreck'` (a thrown
thing: `b.hlWreck` is what it was, `{ r, col, sides, kind, junk, type }`) or
`'reply'` (DEAD GAME's; `b.hlRatio` for the ring). Additive layer.

### The telegraphs

`drawHlHouseTele(e)`, world, plain paint, after the glow. `e` is DEAD GAME or
null. One loud thing at a time (Act I's rule, `HALLOWEEN-PLAN.txt` §6.8):
1. what hurts you now — rounds, a lurker mid-strike;
2. what is about to — a lurker's eyes open (`state 1`), a poltergeist with
   something up (`state 1`), his wind-up (`e.hlWind`), THEY LEFT gathering;
3. what you can do now — he is solid (`e.hlSolid`); an add the grey is about to
   reach (kill it first);
4. the rest.

The placeholder draws: a red dashed line along a winding lurker's heading; a
dashed line from a lifted piece to the hull; a ring filling round him in a
wind-up; THEY LEFT's ring, and a grey ring on each add within 300 px of it.

### The screen

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlHouseHud` | `(A, area)` | In place of `drawHlAreaHud`. `hlChipGoal()` is the goal line (`'LAST MESSAGE   2 / 3'`, `'KILL  DEAD GAME'`). The lines found so far are `HL_LAST_CHAT.slice(0, hlProgress('q3'))`. Point at marked sheets that are off the screen **or out in the dark**, and, while `area.last`, at whatever is left. `area.end` `{ why: 'errand'|'win', t }` for the last `HL_END_T`. |

### The medals (any run)

| Hook | Handed | What it is |
| --- | --- | --- |
| `hlSheetDashFx` | `()` | SHEET: a dash just began; `P.hlSheetT` is how long it is out of reach and through bodies. |
| `hlGhostFx` | `(stage)` | STILL HERE: `'start'` (the killing blow left a ghost), `'up'` (ten felled: back up), `'gone'` (the run is over). |
| `drawHlGhostHud` | `(g)` | Screen, while a ghost: `g { t, T, kills, need }`. `P.hlGhost` is the same object. |

## The menu

The chapter's line plays through the prologue's seam: `HL.pro` is a timeline
named `'chapter'` with the same tracks (`stall`, `open` — held at 1, the hatch is
already open — and `rise`) and three knock cues at the prologue's own times
(1.0, 1.7, 2.4 s: `hlKnockFx(0..2)`), so `drawHlHatch(r, T)` plays it as it
plays the knock. He rises at 2.8–3.6 s and speaks at 4.0 s. It is due on the first menu
after the chapter opens, once the patch is done (`hlChapterBeatDue`), unless the
soul already said where it was going in the vigil with the floor open. `[ESC]`
skips it.

## The numbers the art reads

```
QUIET { max 540, hold 1.2, dark 4, hull 95, min 55, minT 9, grace 2.5 }
QUIET_BLACK { max 360, hold 0.4, dark 1.6, hull 70, min 40, minT 4 }
MARK_ESCAPE 18   HL_LAST_CHAT ['ez', 'wait', 'brb']
LURK_LIT 0.8 (of the light's radius)   LURK_WIND 0.45   LURK_STRIKE_T 0.5   LURK_REACH 300
POLT_LIFT 0.8   POLT_FLY 1.5   WRECK_LIFE 30
DG_LINE 0.4   DG_FADE_T 0.35   DG_WIND 0.45   DG_CULL_WARN 1.2   DG_CULL_R 560
DG_DECOY_LIFE 14   DG_DARK_AT 0.34   GHOST_T 8   GHOST_KILLS 10
DEAD GAME r 52, col '#cbd5e1'   THE HOUSE accent '#c4b5fd'
```

The rest, and what each is, are under "the numbers" at the top of the ACT II
logic block. The logic owns them: art reads them and never redeclares them.

## Seeing it

There is no admin panel in this repo (it is `C:\.claude\admin.js`). In the
console on a local server:

```js
HL.force = true                                   // FORCE ON (this tab)
hlAreaStart('house')                              // THE HOUSE, from wave 1
hlMarkSprout()                                    // a marked sheet, in front of you
hlP().q.q3 = 2; hlAreaStart('house'); hlArea.n = 4; betweenWaves = 0.5   // DEAD GAME NOW
hlArea.online = 1                                 // the room full: he is solid
hlArea.boss.hlCullT = 0                           // THEY LEFT
hlArea.boss.hp = hlArea.boss.maxHp * 0.3          // the dark at the end
hlComplete('q3'); hlComplete('q4')                // DONE q3 / q4 (pays, reports, grants)
delete hlP().seen['ch:1']                         // the menu's knock for the house, again
```

`npm run test:hallows` plays all of it, draws every Act II hook, and fails if
one throws, is never called, or if an Act I hook is asked to draw the house.

## Decided in the build (open to change)

- **Tuning** is first drafts, measured only with bots: DEAD GAME's meter
  (`DG_KILL` 0.22, `DG_DRAIN` 0.05, `DG_LINE` 0.4), his ghost heal (0.6%/s, none in
  the dark), THEY LEFT's reach (560 px from him, so adds away from him can be kept
  alive, as the draft wants), his health (`hpMul` 1.1), his wave (5 at once, one
  every 1.3 s, never let run dry), the house's waves (`waveMul` 0.75, since a sheet
  is two bodies). A bot at double damage takes him in about 150 s.
- **The last few** of a wave are pointed out and the dark stops at the hull
  (`hlArea.last`): without it the last stragglers were hunted blind.
- **A sheet cannot be hacked** (it is cloth). For THE HACKER, what was under it
  gets up on your side as kin instead.
- **His own moves** (the draft names only his gimmick): A THREAD of replies and
  RATIO, a ring, only while solid.
- **LAST SEEN** marks are left while he is a ghost, where he drifts.
- **New lines** not in the draft: the yard's wait line (*"The yard is not open
  yet. Everything up there is already buried. It will keep."*), and DEAD GAME's
  word-after lines (`HL_SAY.hintDG`).
- **Not written, on purpose**: pages II and III of the house's three bodies and
  DEAD GAME in the codex, like THE LOST SOUL's: the page source is public, so they
  go in when the chapter is live (`test:tales` lists them as waiting).
- **Not done here**: Chapter III, the epilogue and their medals; the November
  farewell; the abandoned-run logger (plan §16.4).
