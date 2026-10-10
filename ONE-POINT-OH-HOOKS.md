# ONE POINT OH: the route's art hooks

Every visual piece of ONE POINT OH's route, and its two sounds, is drawn by
one of these hooks. **They are blank for now.** Each placeholder draws the
least that lets the route be played and read (hairlines and plain words), and
is meant to be replaced whole. The look they are for is "The fight's look" in
`ONE-POINT-OH-PLAN.md`. Add `?hooks=1` to the address to tag each piece with
its hook's name.

All the hooks are in one block of `index.html`, from
`ONE POINT OH — art hooks` down to `end of ONE POINT OH art hooks`, as entries
of the `OPO_ART` object. Replace the block whole, or any one entry. The
block's own header (WHAT THEY ARE HANDED) is the same list as below.

- **Drawing only.** A hook changes nothing of the run. It rolls only
  `rnd`/`rndi`/`pick`, never `simRand`.
- **Sandboxed.** `OA(name, ...)` calls it inside `g.save()` / `g.restore()`.
- **Fails alone.** A hook that throws loses only its own piece, and is named
  once in the console. `npm run test:opo` calls every hook on the way through
  the route and fails if one throws or is never called.
- **Its own caches.** A top-level `let`, or a cache that starts empty, goes in
  `SNAP_LOCAL` / `SNAP_LOCAL_OBJS` (RUN SNAPSHOTS in `index.html`).
- **Two canvases.** `g` is the 2D context to draw on: the game's own, except
  the three marked **[frame]**, which draw on the first build's canvas inside
  the copy (`onepointoh/lock.js` calls them through `OPO_HOST.art`).
- **The first build, live.** `tex` is the copy's own canvas, still running in
  its frame (`OpoLock.tex()`), or `null` when there is no copy (a determinism
  starter, a test). Draw from it with `g.drawImage(tex, ...)`: it is the real
  thing playing, not a picture of it. It is there from the lock to the end of
  the fight.
- **The old palette.** `OPO_FIRST` is the first build's colours and type,
  read off `3af8b6d`.

`(w, h)` is the screen in CSS pixels. "World" hooks are drawn under the
camera, in the room's coordinates.

## The way in

| Hook | Handed | What it is |
| --- | --- | --- |
| `voice` | `(g, w, h, line)` | His voice, low on the screen. `line` is `{ text, kind, age, life }`; `kind` is `coax door still revert face phase fight paint out lost`. Unseen and unnamed until the shatter, in the first build's type with no glow: the first time the old renderer shows up inside today's. |
| `saySound` | `(audio, line)` | A dialogue voice for him, as each line starts. `audio` is today's `Audio_`. Sound only. |
| `door` | `(g, d)` | World. The old door: sector 01 as it was, flat, in the first build's colours, nothing lit on it, standing in a lit room. `d` is `{ x, y, r, t, armed, in }`: `armed` 0..1 while it arms, `in` 0..1 while it is taking you. |
| `revert` | `(g, w, h, r)` | The lock's way in, about 8 s: the game coming apart newest first, each piece quoted as it goes, ending on the first build's menu. `r` is `{ t, T, k, i, list, entry }`: `list` is the record read backwards, `entry` the piece going now. |
| `lockUnder` | `(g, w, h, s)` | Today's canvas under the copy's frame, seen while the frame loads. `s` is `{ t, ready, why }`. |

## The lock

| Hook | Handed | What it is |
| --- | --- | --- |
| `crack` | `(g, c)` **[frame]** | World (the first build's). The crack in the top wall, today's light leaking through. `c` is `{ x0, x1, cx, y, half, w, p, held, hits, broke, runs, t, world }`: `w` 0..1 is how wide it has grown by itself, `p` 0..1 what fire has done to it, `held` whether it is under fire now, `hits` `[{ x, age }]` the rounds just taken in. |
| `crackSound` | `(audio, w, p)` **[frame]** | Now and then, a sound from the game it was, through the wall. `audio` is the first build's own `Audio_` (`tone`, `noise`). Sound only. |
| `lockVoice` | `(g, w, h, line)` **[frame]** | His voice in the lock, the first time he forbids anything. `line` is `{ text, age, life, i }`. |

## Face to face, and the fight

| Hook | Handed | What it is |
| --- | --- | --- |
| `shatter` | `(g, w, h, s, tex)` | The crack gives: the menu text, the HUD, the board and the grid break into panes that go on playing the first build, and fall away into today's room, lit. `s` is `{ t, T, k }`. |
| `him` | `(g, h, tex)` | World. Him: flat, polygonal, unlit and shadowless, built from the first build's own shapes, holding the old screen's frame, which still plays the first build (`tex`). `h` is `{ x, y, r, ang, ph, stage, st, flash, painting, hollow, out, t }`; `stage` is `open fight cascade out`, `ph` 0..4 the phase. |
| `front` | `(g, f, tex)` | World, under everything. The floor, and the living seam between the two renderers: the first build's side flat and unlit, today's lit once `f.light`. `f` is `{ box, cols, rows, cells, oldBelow, light, cascade, t, stage }`. `box` is `{ x0, y0, x1, y1, cw, ch }`; `cells` is `cols × rows`, row-major, and a cell under `oldBelow` is the first build's. The front is game state; the mask is only drawing. |
| `sweep` | `(g, s)` | World. A revert: a front sweeping a band of floor back to 1.0. `s` is `{ vert, dir, lane, lanes, tell, pos, box, cols, rows }`: `vert` moves along y, `tell` 0..1 is the warning (1 once moving), `pos` how far it has come. |
| `pane` | `(g, p, tex)` | World. A pane of the old frame flying back to land, a live window of the first build. `p` is `{ x, y, r, ang, t, T, hp, hp0, landed, tx, ty }`. |
| `paint` | `(g, p)` | World. His paint reaching for a restore, in the old renderer. `p` is `{ x0, y0, x1, y1, k }`. |
| `restore` | `(g, r)` | World. A date's restore standing in the room (NOBODY ASKED) until it settles or he paints it out. `r` is `{ x, y, t, paint, settled, gone, entry, settle }`. |
| `restoreFx` | `(g, w, h, f)` | A date passed: its own flourish, in the language of what it brings back. `f` is `{ entry, i, t }`; `entry.key` names it: `first fracture ember codex amalgam coop hacker root patch vagrant rush ronin pvp tales since today`. |
| `card` | `(g, c)` | World. HOLLOW: a card peeling off your ship and flying into his frame. `c` is `{ id, n, col, x0, y0, x1, y1, k }`. |
| `record` | `(g, w, h, rec)` | His bar, which is the record: a date at the top, from 7 AUG. `rec` is `{ list, pos, date, next, k, phase, ph, phases }`; `pos` is a date index, fractional. |
| `cascade` | `(g, w, h, c, tex)` | The last hit is today: every era flooding back at once, the front swept off the screen, today's menu built back around him. `c` is `{ t, T, k, list }`. |
| `out` | `(g, w, h, o)` | He is left holding an empty frame. `o` is `{ t, T, k }`. |
| `lost` | `(g, w, h, l)` | A fight lost or left: the beat before the first build's menu again. `l` is `{ t, T }`. |

## The record

The record (`opoRecord()`) is the list `record`, `revert`, `restore` and
`restoreFx` are handed. Each entry is `{ d, key, n, q, say }`: the date, the
art's key for it, what it brought, the record's name for it as he quotes it,
and the rest of his line. The fixed dates are `OPO_RECORD_BASE`; every day the
`CHANGELOG` has after 6 Oct joins it (`key: 'since'`), then `TODAY`.

## Seeing them

- `npm run test:opo` plays the whole route and calls every hook.
- In a browser, a dev's own save can jump to any beat from the console:
  `opoJump('coax' | 'door' | 'revert' | 'lock' | 'crack' | 'fight' | 0..4 | 'cascade' | 'out' | 'lift')`.
