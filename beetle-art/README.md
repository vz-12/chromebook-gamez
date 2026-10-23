# The blue beetle: art and concept board

EMBER's signature skin ([BEETLE-PLAN.md](../BEETLE-PLAN.md)). This folder holds the art and the board that shows
it off. Nothing here is in the game yet, and `.assetsignore` keeps the folder off the public site.

| File | What it is |
|---|---|
| `beetle.js` | The art (`BTL`, `btl*`). It is written to be lifted into `index.html` as it stands. It reads the pilot only through a small state object (`me`) and keeps what it remembers in its own bag. It leans on `ctx`, `TAU`, `clamp`, `lerp`, `rgba`, `drawGlow` and MOTION. |
| `overdrive.js` | OVERDRIVE (`BTL_OD`, `btlOd*`): THE SWARM in place of the spark, the room burning blue, the wings of fire, the braided lance and the cold grade. |
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
