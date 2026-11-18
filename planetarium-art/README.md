# THE PLANETARIUM — the art, ready to lift

The art for the planetarium rework ([PLANETARIUM-PLAN.md](../PLANETARIUM-PLAN.md), The art plan), drawn over the
placeholders the logic has had since `ef4fde0`. It is written here as plain JS blocks, cut to go straight into
`index.html`. Nothing in this folder is in the game yet, and `.assetsignore` keeps the folder off the public site.

To see it play before lifting, use the review board: https://claude.ai/artifact/Rfq4KQU3NgY1zVgMzj5Mpa
(the dome playing every beat, and readable by hand; the dome at phone width; the tray; all twelve plates in front
and retrograde; every event; each sign at I, II and III on a puppet hull; the twelve shadows; the atlas).

## Lifting it

```
node planetarium-art/lift.mjs                  # check only: lifts it in memory, writes nothing
node planetarium-art/lift.mjs --out lifted.html   # writes the lifted page somewhere else to try
node planetarium-art/lift.mjs --write           # lifts it into index.html
```

`lift.mjs` finds every place it touches by a function's name and an exact line. If anything has moved or changed,
it stops and writes nothing. It also refuses a page that's already lifted. Before it says yes, it checks:

- the lifted page compiles;
- every function the art calls exists in it;
- each of the art's functions and top-level names is in it exactly once, and none of them was already in
  `index.html` except the placeholders it replaces;
- every top-level `let` the art has is in `SNAP_LOCAL`, so run snapshots leave it on each machine.

Checked on the lifted page (18 Nov): `npm run test:zodiac` (88 passed, including every sign at III and every
shadow played and drawn on all four hulls), `npm test` (all deterministic, drawn and undrawn, every scenario,
`zodiac` among them) and `npm run test:lockstep` (all in step, every scenario).

## The files

| File | What it is | In `index.html` |
|---|---|---|
| `sky.js` | the shared pieces (`ZA`, `za*`): the twelve constellations from their real stars, the twelve glyphs as paths, the element triangles, the pips, a sign's medallion, the eclipse | new |
| `dome.js` | the reading screen (`ZAD`, `zad*`): the zodiac wheel overhead, the plates both sides, and every beat (opening, idle, retrograde, turning, taking) | replaces `drawPlanetarium`, `zDrawPlate`, `zButton` |
| `tray.js` | the HUD (`ZAT`): the signs held in four element triangles that light as trines, the shadow, and the glyph flying in from the dome | replaces `signTray` |
| `field.js` | the field (`ZAW`, `zaw*`): each sign on the hull and in the room, the crowns, the shadows' tells, SUNLESS, and the dome opening back onto the room | replaces `zDrawWorld`, `zDrawDark` |
| `fx.js` | the events (`ZAF`, `zaFx`, `zaf*`): the gore, MARS's crater, the golden bull, the shell breaking and the carapace opening, the supernova, judgement, the sting, the harvest, the rain, the flood, the tide, the wave, a shadow taken and the sky turning | new |
| `board-env.js`, `board.js`, `board-stages.js`, `build.mjs` | the review board: `node planetarium-art/build.mjs out.js --page out.html` builds it, slicing the game's own helpers and the planetarium's tables out of `index.html` | never lifted |

They go in together, in that order, straight after `planetButtons`. `zPlates` and `planetButtons` stay: the clicks
hit those rects, and the dome draws in them, so the art moves nothing the logic hits.

The art changes nothing the game's logic reads. It keeps its own state (`ZAD`, `ZAT`, `ZAW`, `ZAF`), clocks
everything off `uiTime`, and rolls only the unseeded `rnd`.

## Every edit, in words (what `lift.mjs` does)

**Taken out** (each with the comment directly above it): `drawPlanetarium`, `zDrawPlate`, `zButton`, `signTray`,
`zDrawWorld`, `zDrawDark`.

**Put in:** the five art files, as above.

**Hook lines.** Most of what the art shows it notices itself, by what changed since the last frame (a shield
broken, the dash ending, the shell opening, the nova, the flood, the tide, a shadow taken or lifted). Seven events
only the logic knows the place of, so each gets one line, marked `THE PLANETARIUM: art`. Each is a `zaFx` call,
which only adds to the art's own list:

| Function | After the line | Adds |
|---|---|---|
| `zTick` | `burst(e.x, e.y, 12, '#fb7185', 300, 3.4, 0.4);` (the gore) | `zaFx('gore', e.x, e.y, a);` |
| `zJudge` | `if (!best) return;` | `zaFx('judge', best.x, best.y, best.r);` |
| `zRain` | `const tx = clamp(at.x, …), ty = clamp(at.y, …);` | `zaFx('rain', tx, ty);` |
| `zSting` | `e.zSting = 0;` | `zaFx('sting', e.x, e.y, e.r);` |
| `zOnHit` | `floatText(e.x, e.y - e.r - 8, 'REAPED', '#e2e8f0', 15);` | `zaFx('reap', e.x, e.y, e.r);` |
| `zWaveOut` | first line | `zaFx('wave', x, y, dx, dy);` |
| `zGoldenBull` | `credits -= cost;` | `zaFx('bull', P.x, P.y, cost);` |

**Also:**
- `'ZAD', 'ZAT', 'ZAW', 'ZAF'` join `SNAP_LOCAL`, next to RONIN's art layers. `ZAD` holds a canvas (the far sky),
  `ZAW` a WeakMap of pilots, and `ZAF` the events with the pilot each belongs to. Without this, run snapshots would
  try to carry them.
- The logic's header and the placeholder screen's header say the art is in, and the three call sites lose
  "(placeholder)".

## What the art does, briefly

- **The skies are real.** Each constellation is projected from its stars' right ascension and declination
  (Yale Bright Star Catalogue), east to the left as you'd see it overhead, with star sizes by magnitude and colours
  by spectral class: Antares red, Aldebaran orange, Regulus and Spica blue-white. The Pleiades and the Beehive are
  drawn as clusters.
- **The glyphs are paths.** ♈ to ♓ are never typed. The same paths are sampled, so a taken constellation can fold
  its stars into its glyph.
- **The dome** is a tilted zodiac wheel overhead: the rim's degrees, the band with the twelve skies, the glyphs, and
  the wanderers on the ecliptic. It turns west, about once in four minutes. Signs you hold are lit gold on it, and
  the shadow you carry is eclipsed. Retrograde slows the wheel, stops it and runs it backward, and the plates flip
  one after another.
- **The plates** fit their words: the sky shrinks, then the type, then the lower magnitudes fold to their names,
  before anything is cut. The narrow layout puts the sky beside the words.
- **The tray** is four little triangles, one per element, pointing the way its alchemical sign does. Each corner is
  one of its signs, so a trine shows itself filling up.

## Still to do

- Music and sound (build order step 8): the `planetarium` cue and the stings.
- The codex's star atlas (`z` tab): the board's atlas stage is its look, not yet wired into the codex.
- Capricorn has no field art beyond its crown: its climb is read in the HUD's floating text, as the plan has it.
