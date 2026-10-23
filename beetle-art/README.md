# The blue beetle: art and concept board

EMBER's signature skin ([BEETLE-PLAN.md](../BEETLE-PLAN.md)). This folder holds the art and the board that shows
it off. Nothing here is in the game yet, and `.assetsignore` keeps the folder off the public site.

| File | What it is |
|---|---|
| `beetle.js` | The art (`BTL`, `btl*`). It is written to be lifted into `index.html` as it stands. It reads the pilot only through a small state object (`me`) and keeps what it remembers in its own bag. It leans on `ctx`, `TAU`, `clamp`, `lerp`, `rgba`, `drawGlow` and MOTION. |
| `overdrive.js` | OVERDRIVE (`BTL_OD`, `btlOd*`): THE SWARM in place of the spark, the room burning blue, the wings of fire, the braided lance and the cold grade. |
| `kit.js` | OVERDRIVE's moves (`BTL_KIT`, `btl*`): Z's spray and scars, X's mark and column, C's take-off, cut, aim lanes and foot, COMBO 1's wall and giant column. Each takes the stock state (`P.odScorch`, `odScars`, `odPyros`, `P.odStrike`, `odRing`) and draws in the stock layer. |
| `board-kit.js` | The board's move stages: Z and X on the stock logic in miniature, and BRAND as one scrubbable timeline in the real arena. |
| `board.js` | The board's stages: a puppet that flies the beetle on EMBER's fire cycle, and the canvases it is drawn on. |
| `board.html` | The board page, with markers where the code goes. |
| `build.mjs` | Builds the board as one self-contained page. It slices the game's own glow helpers and MOTION out of `index.html`, so the board draws with exactly the code a run would. |

## Building the board

```
node beetle-art/build.mjs <out.html>
```

The output is an artifact page fragment, with no `<!doctype>` of its own. To open it locally, wrap it in one.

## How the art meets the game (step 2)

| Call | Layer it belongs to | What it draws |
|---|---|---|
| `btlTick(B, me, dt)` | once a frame | Steps the body chain, antennae, springs, flame puffs and particles |
| `btlDrawUnder(B, me)` | under the hull | The dash flames, thruster motes and body |
| `btlDrawHull(B, me)` | in place of the hull | The head, shell, wings, jaws and antennae |
| `btlDrawFire(B, me)` | in place of `drawLance` | The wind-up and the flamethrower on `P.laserSegs` |

`me` is `{ x, y, ang, vx, vy, charge, beam, segs, half, range, dash }`. In the game these come from
`P.charge`, `P.laserEnv`, `P.laserSegs`, `lanceHalf() * P.laserEnv`, `laserRange()` and the dash timer.

OVERDRIVE adds `me.od` (`odPhase()`), `me.odLit` (`btlOdLit(od.t)`), `me.odGlow` (the larger of
`odLit * 0.8` and `od.life`) and `me.odLance` (`od.lance`). Its stock calls map like this:

| Stock | Beetle |
|---|---|
| `odDrawSpark` (in `odDrawGrade`) | `btlOdSwarm(od.t, sx, sy, P.ang, camZoom, W, H)`, passed as `mid` to `btlOdGrade` |
| `odDrawFireRoom` | `btlOdFloor(odPools, uiTime, q.life, B.parts)` |
| `odDrawWings` | `btlOdWings`, which `btlDrawUnder` already calls when `me.od` is set |
| `odDrawHelix` | `btlOdBraid`, which `btlDrawFire` already calls when `me.odLance` is set |
| `odDrawGrade` | `btlOdGrade(q, od.t, odFlash, W, H, mid)` |
| `odIgnite`'s burst colours | blue and ice, still to hook (the burst is spawned by the game) |

The moves swap in the same way:

| Stock | Beetle |
|---|---|
| `drawOdScorch()` | `btlScorch(B, P.odScorch)` |
| `drawOdScars()` | `btlScars(odScars, uiTime, B.parts)` |
| `drawOdPyroMarks()` / `drawOdPyros()` | `btlPyroMarks(odPyros)` / `btlPyros(odPyros, B.parts)` |
| `drawOdStrikeGround()` + `drawOdStrikeHull()` | `btlStrikeHull(B, me, odStrikeAlt(), odStrikeWings())` |
| `drawOdStrikeMarks()` | `btlStrikeMarks(st, strokes, camZoom, uiTime, odStrikeR())`, where strokes are `odStrikeX(mouse.wx, mouse.wy)` while aiming and `st.strokes` after |
| `drawOdStrike()` | `btlStrikeFoot(P.odStrike, camZoom, uiTime)` |
| the iris in `drawOdStrikeCut()` | `btlStrikeCut(odStrikeBlack(), W, H, uiTime)` |
| `drawOdBrandWall()` / `drawOdBrandNukeMark()` / `drawOdBrandNuke()` | `btlBrandWall(odRing)` / `btlBrandNukeMark(st, uiTime)` / `btlBrandNuke(st, uiTime, B.parts)` |
| `drawOdKitScreen()` | `btlKitScreen(a, b, W, H)`, with the same `a` and `b` |

While Z sprays there is no lance, so the jaws need `me.beam` set to 1 for as long as `P.odScorch` is out.
