# ACHIEVEMENTS: the art hooks

Every visual piece of the achievements, and their one sound, is drawn by one of
these hooks, and **every one is drawn** (13 Oct), after osu!lazer's medals (THE
LOOK, at the head of the hooks in `index.html`, says how). `ACH_PLAIN` is
`false`: the layout no longer draws its plain version under them. Add
`?hooks=1` to the address to tag each piece with its hook's name (`ach.badge`,
`ach.card`...).

## The look

- **A medal a goal** (`badge`): lazer's medal-splash disc, deep teal tinted by
  its act, its triangles drifting up through it. Earned: a white rim, the inner
  sunburst turning, a glow in the goal's own colour (its boss's, its pilot's,
  or its act's) and a flat white emblem of its own, one per `a.id`. Next: a
  ghost of its emblem, its act's rim, the progress round the rim for a counted
  goal, and an approach circle closing on it. Further on: a lock. The large one
  beside the list pops in (OutElastic) as the keys come to it, with the outer
  spin, the strip of light and the particles, all kept to its stage.
- **The line** (`spine`): a rail lit as far as the next goal, a slider ball
  running down it; follow points past it.
- **The panel, its rows and acts** (`back`, `row`, `act`): lazer's overlay
  slate at the blue hue, rounded; triangles in the header, the whole line's
  progress under it as a level bar; one pill a goal under each act's words.
  The next row is ringed in its act's colour and glows.
- **The door** (`door`): a lazer button, leaning (SHEAR 0.2), triangles in it,
  the line's progress along its foot, an approach circle on its NEW dot.
- **The card** (`card`): the medal splash in small: a white flash, the medal's
  elastic pop, a ring bursting off it, its particles, the strip of light out
  between its words, its life running down along its foot.
- **The report** (`goal`): a lazer pill with its act's triangles.
- **The sound** (`sound`): a whoosh up into a chime, each act a step higher.

The art keeps one object of its own, `AA_ST` (the large medal's pop), in
`SNAP_LOCAL_OBJS`; everything else is a hash and `uiTime`.

All the hooks are in one block of `index.html`, from
`ACHIEVEMENTS — art hooks` down to `end of ACHIEVEMENTS art hooks`, as
entries of the `ACH_ART` object. Replace the block whole, or any one entry.
The block's own header (WHAT THEY ARE HANDED) is the same list as below.

- **Drawing only.** A hook changes nothing, and never rolls `simRand`
  (`rnd`/`rndi`/`pick` are fine). `npm run test:ach` checks the run's stream
  is where it was after the panel, the cards and the report have drawn.
- **Sandboxed.** `AA(name, ...)` calls it inside `ctx.save()` / `ctx.restore()`.
- **Fails alone.** A hook that throws loses only its own piece, and is named
  once in the console. `npm run test:ach` calls every hook at four screen
  sizes and fails if one throws or is never called.
- **Its own caches.** A top-level `let`, or a const that starts empty, goes in
  `SNAP_LOCAL` / `SNAP_LOCAL_OBJS` (RUN SNAPSHOTS in `index.html`).
- **The text is the layout's.** Names, the how, the dates, the counts and
  ACT I · THE ROTATION are drawn by the layout, over the hooks. A hook draws
  shapes, emblems, light and motion.
- **`ACH_PLAIN`.** While `true`, under each hook the layout draws: a plain
  panel, plain rows, a plain badge (★ done, ☆ next, ? later), a plain meter,
  door and card, and a plain chime on an earn. It is `false` now the art
  draws those itself.

## The line

What the goals are, and their order, is `ACHIEVEMENTS` (just above the
hooks), grouped by `ACH_ACTS`:

| Act | Goals (id) |
| --- | --- |
| I · THE ROTATION | `flight` `warden` `forgeheart` `broodmother` `archivist` `nullcore` |
| II · THE RECORD | `unwritten` `amalgam` |
| III · CRACKS IN THE PLANE | `clears` `curator` `theother` `infection` `root` |
| IV · THE FOUNDER | `founder` `tribunal` `outsider` |
| V · THE STATUES | `overdrive` `hacker` `superuser` `vagrant` `ronin` |
| VI · ONE POINT OH | `opodoor` `opodone` `origin` (once VOIDRUNNER's rite is built) |

A badge that is one emblem per goal switches on `a.id`; one per act on
`a.act` (or `achAct(a)`, which also has the act's `col`).

## Where every hook is

The names are what to search for in `index.html`.

| Hook | Called from | When |
| --- | --- | --- |
| `back` | `drawAch` | the panel is open (menu, **A**) |
| `act` | `drawAch` | each act's header in the list |
| `row` | `drawAch` | each goal's row in the list |
| `badge` | `achBadge`, from `drawAch` (rows, and large beside the list) and `achDrawCard` | each goal drawn anywhere |
| `spine` | `drawAch` | once a frame, down the list behind the badges |
| `meter` | `achMeter`, from `drawAch` (the next goal's row, and beside the list) | the next goal is a counted one |
| `door` | `drawMenuAch`, from `renderMenu` | the menu, every frame |
| `card` | `achDrawCard`, from `render` after `drawLiveLine` | a goal done in a run, for `ACH_CARD` (4.6 s) |
| `goal` | `achDrawGoal`, from `drawDead` | the run report, above the tip |
| `sound` | `achAnnounce` | a goal done in a run, as its card is queued |

## What they are handed

`a` is the goal's `ACHIEVEMENTS` entry (`a.id`, `a.n`, `a.how`, `a.act`).
`s`, for a goal, is its standing:

| Field | |
| --- | --- |
| `done` | it is done |
| `next` | it is the next goal (the first in the line not done) |
| `locked` | neither: further along the line (its name is not shown) |
| `fresh` | done and not yet seen in the panel (the layout writes NEW) |
| `day` | the day it was first seen done, `YYYY-MM-DD`, or `''` |
| `prog` | `[have, need, label]` for a counted goal, or `null` |
| `sel`, `hot` | the keys are on it; the pointer is over it |
| `big` | the large badge beside the list (`badge` only) |

A rect is `{ x, y, w, h }`, in screen space.

| Hook | Handed | What it is |
| --- | --- | --- |
| `back` | `(x, y, w, h, t)` | The panel, behind everything on it. `t` is `{ done, total }`. |
| `act` | `(r, act, s)` | An act's header band over its goals. `act` is the `ACH_ACTS` entry (`id`, `n`, `col`); `s` is `{ i, open, done, total }`: `i` its number from 0, `open` whether it has been reached (its name is shown). |
| `row` | `(r, a, s)` | A goal's row, under its badge and its words. |
| `badge` | `(x, y, size, a, s)` | A goal's emblem in a square of `size`: 42 in a row and on the card, 80 to 200 beside the list (`s.big`). |
| `spine` | `(x, y0, y1, yk)` | The line itself, down the list behind the badges' centres: from the first goal (`y0`) to the last (`y1`), done as far as the next one (`yk`). Scrolls with the list, and is clipped to it. |
| `meter` | `(r, have, need, col)` | A counted goal's progress (MALWARE carried, the BOSS RUSH's best, clears). `col` is its act's colour. Thin (3 px) in a row, 8 px beside the list. |
| `door` | `(r, s)` | The menu's door, 176 × 34 under SOUNDTRACK. `s` is `{ done, total, fresh, hot, next }`; `fresh` is how many are NEW (the layout draws a dot), `next` the next goal or `null`. |
| `card` | `(r, a, k)` | The card a goal done in a run comes up on, top right under the HUD, 320 × 58. `k` is 0..1 through its life; it slides in over the first 0.3 s, and the layout fades the whole card in and out (`globalAlpha`). |
| `goal` | `(r, a)` | NEXT GOAL on the run report, a line `wide` across, under its words. |
| `sound` | `(audio, a)` | A goal done, as its card is queued. `audio` is `Audio_` (`tone`, `noise`). Sound only. While `ACH_PLAIN`, a plain chime plays as well. |
