# ALL HALLOWS · ACT III: THE YARD — the art hooks

Chapter III of Book I (opens 23 Oct 2026, by `HL_EVENT.chapters`), and the
epilogue that opens with it. The logic
plays end to end under placeholder hooks in `index.html` (shapes and labels,
just enough to play it). **No art is drawn over them yet**: the yard's art goes
in `hl-art.js`, in a new section `ALL HALLOWS · ACT III: THE YARD — the look`
beside the house's, and its functions replace the placeholders by name, as Act
I's and Act II's do. This file is the contract both keep, the way
`HALLOWS-HOUSE-HOOKS.md` is for the house and `HALLOWS-GUIDE.txt` (on `beta`) is
for Act I.

## The look (to draw)

From `HALLOWEEN-PLAN.txt` §8 and §12 and `EVENT-DRAFTS.txt` (both on `beta`):
a graveyard of runs, at night. Each headstone is one run that was quit, with
its wave, its hull and the last thing typed in it. He buries them himself and
never comes back to any of them. The soul's cold (`#a5f3fc`) is the soul's and
its errand's, his rose (`#fb7185`) is his, red only what is about to hit you.
The plan's budget calls for: graves rising (A), a risen crumbling into its
epitaph and a bell cracking (B, bespoke deaths), THE RAGE QUIT's gates filling
(S, a hero moment), and his entrance and death (S).

- **The stones** (`drawHlYardGrave`): each with its line, `WAVE 12 · 'lag'`
  and its hull. The soul's is covered until WHERE HE PUT ME is done, and then
  reads `HERE LIES A RUN / WAVE 19 · HULL 4% / "brb"`. A fresh grave
  (`g.fresh`) is one a gravedigger dug in the fight: a mound, no stone.
- **RISEN**: a ghost hull flying a quit run's gun (`e.hlGun`: a stream, a
  short lance, a swing). It climbs out (`e.hlClimb`), and felled it crumbles
  into its stone's line (`hlRisenDownFx(e, line)`).
- **GRAVEDIGGER**: digs where you have been; open pits (`drawHlYardPit`). The
  marked one is cold-edged and fills the soul's stone in (`e.hlFill`).
- **BELLRINGER**: a bell that does not move; it swings before it tolls, and
  cracks when it is put down (`hlBellDownFx`).
- **THE RAGE QUIT**: a figure with a controller cord for a tail (the kit's
  rope: step it in `hlYardArtTick`) and a cracked screen for a face. His barks
  are a chat line in capitals. When he gets out the room jolts back
  (`hlArea.jolt`). THE CONTROLLER (`b.hlKind 'pad'`) is on the end of his cord
  while it is out (`b.hlPadOf` is his id).
- **The gates** (`drawHlYardGate`): four, one in the middle of each wall. In
  his last quarter every one fills with a risen, and the soul stands in one
  from his second quarter (`drawHlYardSoul`).

`npm run test:hallows` flies the yard on the placeholders and again with
`hl-art.js` loaded (every hook called, none throwing, and the patch's and the
house's hooks never asked to draw the yard).

## What is built

- **THE YARD**: five waves (16–20 of a run: it ends where the soul ended) of
  its own three bodies, THE RAGE QUIT on the fifth once the errand is done;
  otherwise "THE YARD LETS YOU GO".
- **RISING**: twenty stones and the soul's. A death on a stone's plot raises
  it, and so does a bell's toll: the earth heaves (`GRAVE_RISE_T`), it opens,
  and a risen climbs out with that stone's line. A risen the wave sends climbs
  out of the nearest shut grave. Never more than `RISEN_MAX` up or on their way;
  a grave about to open holds its wave open.
- **RISEN**, **GRAVEDIGGER**, **BELLRINGER**.
- **WHERE HE PUT ME** (quest 5): a marked gravedigger in waves 2–4 goes to the
  soul's stone and fills it in (20 s). Fell it first. Kept across attempts.
  Three, and the stone is read. Pays 10 candles and **SHALLOW GRAVE**.
- **GG** (quest 6): THE RAGE QUIT. Pays 20 candles and **LAG**, and the soul's
  third ascension in the vigil (state 4: the lantern warm, the top landing).
- **The medals** SHALLOW GRAVE and LAG work in every run the event's medals do.
- **The word after** for THE RAGE QUIT: one line after a death in his fight.
- **The menu's line** when the floor opens: *"It is near the top. It knows who
  it is waiting for."* (through the prologue's own hatch art: no new hook).
- **PAST NINETEEN** (quest 7, the epilogue): given at the top landing. Any
  ordinary run (not a daily, a challenge, the rush, freeplay, the hub or an
  area) carries the soul along, a small light at your shoulder, with no say in
  the run. When wave 20 starts its hull is whole for a beat, it says *"Oh.
  That's what it looks like."*, and it rises out of the arena; the quest is done
  there, and the run goes on. Back in the vigil he says it went up, the soul is
  gone (state 5), and the wall reads `A RUN · WAVE 20 · FINISHED`. Pays 20
  candles and **THE LANTERN** (it left it behind): it rides at your shoulder,
  shoots what you shoot, weakly, and once a wave takes a hit for you.

## Where the hooks are

All of them are in `index.html`, at the **foot of the art hooks block**, after
Act II's, in the section `ACT III: THE YARD — art hooks`, *inside* the existing
markers (`ALL HALLOWS · ACT I — art hooks` … `end of ALL HALLOWS · ACT I art
hooks`), so the lift (`lift-hl-art.mjs --art`) takes an `hl-art.js` that
declares them with no change to the tool.

**THE YARD never calls Act I's hooks or Act II's.** Those draw the patch and
the house whatever room they are asked about. The seams pick the yard's
(`hlDrawBody`, `hlDrawEBullet`, `hlDrawBossBar`, and the branches in
`hlDrawFloor`, `hlDrawWorldOver`, `hlDrawWorldGlow`, `hlDrawWorldTele`,
`hlDrawScreen`, `hlAreaStart`, `hlBossDown`).

Still shared with Act I, and fine as they are: `hlArtTick(dt, 'yard')` (called
first, then `hlYardArtTick`), `hlAreaEndFx`, `hlQuestDoneFx`, `hlBarkFx` (also
for the soul's lines at its gate: `b.boss === 'soul'`), `hlSayPortrait`,
`hlSoulChangeFx`, `hlAscendFx` (n = 3), `drawVigilWorld` (the way up to the
yard is open now; the soul at stage 4 on landing 3), `drawHlStandUi` and
`hlArtMedalGlyph` (SHALLOW GRAVE and LAG are no longer `later`: the glyphs are
there already), `drawHlMedalHud`, and `drawHlHatch` (the chapter beat).

## The rules (as Act I's and Act II's)

- **Draw, do not decide.** Read any state listed here; write none of it. Your
  own fields on an object take an `art` prefix (`e.artCord`), never `hl`.
- **Time** from `uiTime` or the fields handed in. Anything that advances (his
  cord, dirt, the bell's swing) advances in `hlYardArtTick(dt)`.
- **World hooks** draw in world coordinates with the camera applied; **screen
  hooks** in CSS pixels (`W` × `H`). Leave `ctx` as you found it.
- **FX hooks** (`…Fx`) are called once, at the moment, from the logic.
- The yard has no dark of its own (it is not THE QUIET): light it however you
  like with `hlYardLights`.

## The order things are drawn in, in THE YARD

```
WORLD (camera applied)
  floor, grid, arena walls
  drawHlYardFloor(A)              the yard's floor dressing
  drawHlYardGrave(g)              each grave (hlArea.graves)
  drawHlYardPit(p)                each open pit (hlArea.pits)
  drawHlYardGate(g)               each of the four gates
  … corpses, then enemies: drawHlYardBody(e, ea) for its bodies and THE RAGE QUIT
  the hull
  hlYardLights() → light pass     THE LIGHT PASS, if it returns true
  drawHlYardSoul(x, y, g)         the soul in its gate, once it holds one
  — additive —
  enemy rounds: drawHlYardEBullet(b)
  … particles
  drawHlYardGlow()
  drawHlYardBossDeath(d)          THE RAGE QUIT coming apart
  drawHlYardBark(b)               his lines and the soul's
  — plain paint —
  drawHlYardTele(e)               the telegraphs
— post (bloom, grade), vignette —
SCREEN
  HUD …
  drawHlRageQuitBar(e, x, y, w)   over his health bar
  drawHlYardHud(A, area)
  drawHlMedalHud(...)             (Act I's)
```

## The hooks

### The room

| Hook | Handed | What it is |
| --- | --- | --- |
| `hlYardArtTick` | `(dt)` | Once a frame in the yard, after `hlArtTick(dt, 'yard')`. Step his cord and anything else that moves here. |
| `hlYardEnterFx` | `(A)` | Arriving in the yard (in place of `hlAreaEnterFx`). Drop the patch's and the house's baked floors here (`hlUnbake`): one floor in memory at a time. |
| `hlYardLights` | `()` | The light pass. Return true to run it (`hlLightBegin`, `hlLight`, `hlOcc*`). Placeholder: false. |
| `drawHlYardFloor` | `(A)` | The floor and anything fixed on it. `A.stage` has the placeholder colours. Bake it (`hlBake`) if it is heavy; the stones move only by state, so their bodies can be baked too. |
| `drawHlYardGlow` | `()` | Anything else that glows (additive). |

**The stones** — `hlArea.graves`: `[{ id, x, y, st, t, wave, hull, said, soul,
fresh, kin, risen, q }]`. `st`:
- `'rest'` shut, with its line (`wave`, `hull`, `said`);
- `'rise'` the earth heaving, `t` of `GRAVE_RISE_T` (1.1 s): **the tell**;
- `'open'` emptied, `risen` is the id of what climbed out; it settles after
  `GRAVE_OPEN_T` once that one is down (a `fresh` one is filled in and goes);
- `'buried'` a body a gravedigger put in, getting up after `BURY_T` (5 s).

`soul` is the soul's own (it never rises; `hlQDone('q5')` says whether it is
read yet, `hlSoulStone()` finds it). `kin` is one raised by a bell of yours: it
climbs out on your side. Its plot is `GRAVE_PLOT` (46 px) round it.

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlYardGrave` | `(g)` | One grave, in any state. |
| `hlGraveRiseFx` | `(g)` | A grave starts to rise. |
| `hlRisenUpFx` | `(e, g)` | A risen climbs out of `g`. |
| `hlStoneUncoverFx` | `(g)` | WHERE HE PUT ME is done: the soul's stone can be read. |

**The pits** — `hlArea.pits`: `[{ id, x, y, r, t, life, by }]` (`by` the
gravedigger that dug it). You are slower in one (`PIT_SLOW`), and your fire
that falls in is gone; a round fired from inside one climbs out.

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlYardPit` | `(p)` | One open pit. It closes at `p.t >= p.life`. |
| `hlPitDigFx` | `(e, p)` | A pit is open. |
| `hlPitCloseFx` | `(p)` | It closed (or the oldest made room, past `PIT_MAX`). |
| `hlPitSwallowFx` | `(b, p)` | One of your rounds fell in. |

**The gates** — `hlArea.gates`: `[{ i, side, x, y, by }]`, one in the middle of
each wall (`side` `'n' 'e' 's' 'w'`, `GATE_IN` in from it). `by` is whoever is
standing in it: `null`, `'you'`, `'soul'`, or a risen's id. A gate is shut while
someone stands in it (within `GATE_R`, 70 px). `hlArea.soulGate` is the soul's
(-1 until his second quarter).

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlYardGate` | `(g)` | One gate. `hlArea.boss.hlBolt.gate === g.i` is the one he is making for. |
| `drawHlYardSoul` | `(x, y, g)` | The soul, standing in the gate it holds. Its look is `hlSoulShown()`'s (stage 3: whole, the lantern not warm yet). |
| `hlRqSoulFx` | `(gate)` | The soul goes to stand in it. |

### The bodies

One hook for all of them: **`drawHlYardBody(e, ea)`**, in place of the generic
polygon (the generic glow, elite ring and hacked collar are drawn under it).
Branch on `e.type` (`'risen'`, `'gravedigger'`, `'bellringer'`) and
`e.boss === 'ragequit'`. `ea` is the alpha the game wants. Every body has `x, y,
r, ang, col, sides, flash, hp, maxHp, elite, hacked, t, vx, vy, state`.

**RISEN** — a quit run, climbing out with its gun.
- `e.hlGun` `'stream'`, `'lance'` or `'swing'`. `e.hlLine` `{ wave, said }`, its
  stone's line.
- `e.hlClimb` > 0: climbing out (`RISEN_CLIMB` 0.5 s); nothing touches it.
- `e.state` 0 closing to its gun's reach · 1 the wind-up (`RISEN_WIND`) · 2 it
  goes off down `e.hlAim` (locked).
- `e.hlGate` set: his last quarter; it has stopped fighting and is walking
  into gate `e.hlGate`, or standing in it (phased).
- `hlRisenWindFx(e)`, `hlRisenFireFx(e)`, `hlRisenDownFx(e, line)` its death:
  **its line** (the placeholder floats `WAVE 12 · 'lag'`).

**GRAVEDIGGER** — digs where you have been.
- `e.state` 0 following · 1 walking to `e.hlDigAt` (where you were
  `DIG_TRAIL` s ago) · 2 digging (`DIG_T`): **the tell**.
- A death near it (`DIG_BURY_R`) is buried: `hlBuryFx(e, g, digger)`.
- `e.hlMarked` the errand's: cold-edged, it never touches you, walks to the
  soul's stone (`e.state` 1) and fills it in (`e.state` 3, `e.hlFill` 0..1 over
  `DIG_FILL_T`).
- `hlDigFx(e)` (starts digging, or filling), `hlDigDownFx(e)`,
  `hlDigSproutFx(e)` (the marked one comes), `hlDigStoppedFx(e, n)` (felled, `n`
  of 3), `hlDigLostFx(e)` (it filled the stone in).

**BELLRINGER** — a bell that does not move.
- `e.state` 1 swinging, the last `BELL_WIND` (1 s) before a toll; `e.hlTollT`
  the time to the next; `e.hlTolls` how many so far.
- `hlBellWindFx(e)`, `hlBellTollFx(e, graves)` (the graves it raised),
  `hlBellDownFx(e)` (**it cracks**).

### THE RAGE QUIT (`e.type 'boss'`, `e.boss 'ragequit'`)

He quits before he loses. Four gates; each time his health crosses a quarter
(`RQ_MARKS` 0.75, 0.5, 0.25) he says so and runs for the nearest open one.
- `e.hlQ` the quarter he is in (0–3); `e.hlQHp` his health when it began (where
  a gate would put him back to); `e.hlTilt` 0..1, how low he is (faster and
  wilder).
- `e.hlBolt` `{ gate, t, run, hp0, need, last }`: going for gate `gate`. He
  stands there saying so for `RQ_BOLT_WIND` (0.5 s), then runs (`run`): **his
  back is to you**, and he takes `RQ_BACK_MUL` (1.5×). `last`: his last quarter.
- `hlRqBoltFx(e, gate)`, then one of:
  - `hlRqEscapeFx(e, gate)` — **THAT ONE DIDN'T COUNT.** He is through it
    (`e.hlAway` `{ gate, t }` for `RQ_AWAY`, 1.4 s: do not draw him), his health
    is back to `e.hlQHp`, every round in the air is gone, and `hlArea.jolt` `{ t }`
    is the room jolting back (0.9 s). `hlRqBackFx(e, gate)` as he comes in.
  - `hlRqStopFx(e, why)` — the quarter stands. `why` `'burnt'` (`RQ_BOLT_STOP`
    of him taken while he ran), `'held'` (his gate held when he got there) or
    `'shut'` (his last quarter: every door has someone in it).
- His last quarter: `hlArea.march`. `hlRqMarchFx(e, risen)`: the risen walk
  into the gates (the **hero moment**: every run he left standing in a door).
  Then `e.hlCornered`: he cannot leave, and he can lose.
- His moves (`e.hlWind` `{ kind, t, T, ang }`, then `e.hlMove`): `'pad'` THE
  CONTROLLER (thrown; it bounces the yard), `'mash'` (a spray), `'charge'` (down
  `ang`, locked as it is called). `hlRqWindFx(e, kind)`, `hlRqMoveFx(e, kind)`.
- `hlYardBossDeathFx(e)` and `drawHlYardBossDeath(d)` (`d = { boss, x, y, r, t
  }`, drawn until the room hands you back to the vigil).
- **Barks**: `drawHlYardBark(b)` `{ e, x, y, r, boss, text, t, life }`, world
  space. His (`b.boss 'ragequit'`) are a chat line in capitals, the draft says.
  When the soul takes its gate the three of them say their lines in turn
  (`HL_BARK.ragequit.gate`): the soul's are `b.boss 'soul'`, at its gate.
- **His bar**: `drawHlRageQuitBar(e, x, y, w)` over his health bar (14 tall):
  the placeholder notches the quarters and shades back to `e.hlQHp`.

### The rounds

`drawHlYardEBullet(b)` for every round with `b.hlKind` `'risen'` (a stream's),
`'pad'` (THE CONTROLLER: `b.ricP` bounces left, `b.hlPadOf` his id) or `'mash'`.
Additive layer.

### The telegraphs

`drawHlYardTele(e)`, world, plain paint, after the glow. `e` is THE RAGE QUIT or
null. One loud thing at a time (Act I's rule, `HALLOWEEN-PLAN.txt` §6.8):
1. what hurts you now — rounds, a lance or a swing going off, his charge;
2. what is about to — a grave rising (`'rise'`, `'buried'`), a risen's wind-up
   (`state 1`), a bell swinging (`state 1`), his wind-up (`e.hlWind`);
3. what you can do now — he is running (the gate he is making for: stand in
   it, or burn it down);
4. the rest.

The placeholder draws: a ring filling on a grave about to open; a risen's line
or arc while it winds up; a ring filling on a swinging bell; a ring filling
round him in a wind-up and a dashed line down a charge; a dashed line from him
to the gate he is making for.

### The screen

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlYardHud` | `(A, area)` | In place of `drawHlAreaHud`. `hlChipGoal()` is the goal line (`'WHERE HE PUT ME   2 / 3'`, `'KILL  THE RAGE QUIT'`). Point at the marked gravedigger, and at the gate he is making for, when they are off the screen. `area.end` `{ why: 'errand'|'win', t }` for the last `HL_END_T`. |

### The medals (any run)

| Hook | Handed | What it is |
| --- | --- | --- |
| `hlGraveAllyFx` | `(e)` | SHALLOW GRAVE: one in ten felled climbed back out on your side (`e.hlGraveT`, 8 s). |
| `hlLagFx` | `(b)` | LAG: a round stutters and hangs (`b.frozen`, 1 s). |
| `drawHlLantern` | `(x, y, spent)` | THE LANTERN at your shoulder (`hlLanternPos()`), world space, additive, in any run it is worn. `spent`: it has taken this wave's hit. Its rounds are ordinary player rounds with `b.hlLantern`. |
| `hlLanternFx` | `(kind)` | `'shot'` (one of its rounds) or `'take'` (it took the hit). |

### The epilogue (any ordinary run, and the vigil)

`hlRide` `{ t, beat, say, gone }` is the soul along for this run, on this
machine only (never the run's: in co-op each pilot's soul is its own). `beat`
`{ t, said }` once wave 20 has started: whole for `RIDE_BEAT_T` (1.2 s), then
it says its line (`say`) and the quest is done; it has gone up by `RIDE_GO_T`
(6 s).

| Hook | Handed | What it is |
| --- | --- | --- |
| `drawHlRider` | `(R)` | The soul at your shoulder, world space, additive, in any run it rides. Whole and rising once `R.beat` is set. Its look is stage 4's. |
| `hlRideFx` | `(stage)` | `'aboard'` (it is along), `'whole'` (wave 20: the **hero moment**), `'gone'` (it has gone up). |
| `drawHlWall` | `(x, y, done)` | The vigil's wall (`VIG_SPOTS.wall`), after `drawVigilWorld`. `done`: it reads `HL_SAY.wall`. |

What it says at twenty is drawn by the kit's subtitle (`hlSayDraw`, with
`hlSayPortrait`) over the run, as the vigil's lines are. In the vigil, the soul
at stage 5 is `drawVigilWorld`'s, as it always was.

## The menu

The chapter's line plays through the prologue's seam, exactly as chapter II's
does (`HL.pro` named `'chapter'`, knocks at 1.0, 1.7 and 2.4 s, he rises at
2.8–3.6 s and speaks at 4.0 s). It is due on the first menu after 23 Oct once
the house is done (`hlChapterBeatDue` returns 2), unless the soul already said
where it was going in the vigil with the floor open. `[ESC]` skips it.

## The numbers the art reads

```
GRAVE_N 20 (+ the soul's)   GRAVE_PLOT 46   GRAVE_RISE_T 1.1   GRAVE_OPEN_T 14   RISEN_MAX 7
RISEN_CLIMB 0.5   RISEN_WIND 0.55   RISEN_LANCE { len 210, w 12 }   RISEN_SWING { r 84, arc 1.2 }
DIG_TRAIL 1.6   DIG_T 0.9   PIT_R 44   PIT_LIFE 14   PIT_MAX 8   DIG_BURY_R 220   BURY_T 5   DIG_FILL_T 20
BELL_T 6   BELL_WIND 1   BELL_RAISE 3
RQ_MARKS [0.75, 0.5, 0.25]   RQ_BOLT_WIND 0.5   RQ_BACK_MUL 1.5   RQ_BOLT_STOP 0.1   RQ_AWAY 1.4
GATE_R 70   GATE_IN 46   RQ_WIND { pad 0.55, mash 0.4, charge 0.6 }   RQ_PAD { bounces 5 }   RQ_CHARGE { spd 760, t 0.55 }
GRAVE_EVERY 10   GRAVE_ALLY_T 8   LAG_EVERY 6   LAG_REACH 150   LAG_T 1
THE RAGE QUIT r 44, col '#fb7185'   THE YARD accent '#d6d3d1'
HL_EPITAPHS [[12,'lag'], [7,'this is rigged'], [22,'afk'], [3,'boring'], [31,'gtg']]   HL_SOUL_STONE { 19, 4%, 'brb' }
```

The rest, and what each is, are under "the numbers" at the top of the ACT III
logic block. The logic owns them: art reads them and never redeclares them.

## Seeing it

In the console on a local server (`npm run dev -- --var VIGIL_ANYTIME:1`):

```js
HL.force = true                                   // FORCE ON (this tab)
hlAreaStart('yard')                               // THE YARD, from wave 1
hlDigSprout()                                     // the errand's gravedigger, near the soul's stone
hlP().q.q5 = 2; hlAreaStart('yard'); hlArea.n = 4; betweenWaves = 0.5   // THE RAGE QUIT NOW
hlArea.boss.hp = hlArea.boss.maxHp * 0.74         // a quarter down: he runs
hlArea.boss.hlQ = 2; hlArea.boss.hp = hlArea.boss.maxHp * 0.24   // his last quarter: the gates fill
hlComplete('q5'); hlComplete('q6')                // DONE q5 / q6 (pays, reports, grants)
delete hlP().seen['ch:2']                         // the menu's knock for the yard, again
```

`npm run test:hallows` plays all of it, draws every Act III hook, and fails if
one throws, is never called, or if an Act I or Act II hook is asked to draw the
yard.

## Decided in the build (open to change)

- **Tuning** is first drafts, measured only with bots: a bot at 1.5× damage
  that never dodges a telegraph takes THE RAGE QUIT in about 220 s (three
  escapes, a burn-down, a held gate, then the gates fill); at 3× in about
  50 s; at 1× it never stops a bolt. The yard's waves hurt that bot about six
  times as hard as the house's do the same bot (most of it the risen's lance,
  whose tell it ignores), after the risen were eased once; watch it in play.
- **Burn the quarter down** (the draft: "burn the quarter down before he gets
  there") is a tenth of his health taken while he runs (`RQ_BOLT_STOP`), not a
  whole quarter, which nothing could do in the seconds he runs for.
- **He commits** to the gate he runs for once he is running: while he stands
  there saying so he will pick another if his is taken, then not. So standing
  in a gate does something: you have to get there after he picks it.
- **He cannot be finished** before his last quarter (`e.floor`): he leaves
  first. In his last quarter his target gate always has a risen climbing out in
  the doorway, so he never finds it empty; the others are walked into by the
  nearest risen, or climbed into where there is none.
- **The soul** takes the gate of his first bolt, whether he got out through it
  or was stopped short of it.
- **"Bringing the graves he raised"**: when he gets out, every grave that rose
  in that quarter whose risen is down rises again.
- **A risen's own death raises nothing** (no chains), and a body near a
  gravedigger is buried rather than raising the plot it is on.
- **A gravedigger walks round you**, not through you, on its way to dig.
- **The marked gravedigger** never runs from you; the stone is the clock.
- **Barks**: his "stopped short" line is "Lag." from his own list; the
  word-after lines (`HL_SAY.hintRQ`) are new, not in the draft.
- **The epilogue is told on the way in**: the soul is not there to walk up to,
  so his three lines start a moment after you come down. The draft's "[a beat]"
  is the ordinary wait between lines.
- **The ride** is cosmetic and this machine's: it never touches the run (the
  test flies the same seed with and without it). It boards only before wave
  20, so a run has to see twenty with it. THE LANTERN's rounds are foreign to
  your build (nothing that counts your shots counts its), and the hit it takes
  is the first past your iframes each wave; the floor and your build's own
  costs (`pure`) are not hits.
- **Not written, on purpose**: pages II and III of the yard's three bodies and
  THE RAGE QUIT in the codex, like the house's (`test:tales` lists them as
  waiting).
- **Not done here**: the November farewell (the hatch closing, and his line);
  the yard's and his music (`yard` and `ragequit` have no tracks: the music is
  silent there until they do); THE LANTERN's medal glyph (the art's
  `hlArtMedalGlyph` falls back to a lantern shape already).
