# KHEPRI, the blue beetle: art and concept board

EMBER's signature skin ([BEETLE-PLAN.md](../BEETLE-PLAN.md)). This folder holds the art, the adapter that wires it
into the game, and the board that shows it off. The art is the source: `lift.mjs` copies it into `index.html` as the
KHEPRI block, so change it here and lift again, never in `index.html`. `.assetsignore` keeps the folder off the
public site.

| File | What it is |
|---|---|
| `beetle.js` | The art (`BTL`, `btl*`). It is written to be lifted into `index.html` as it stands. It reads the pilot only through a small state object (`me`) and keeps what it remembers in its own bag. It leans on `ctx`, `TAU`, `clamp`, `lerp`, `rgba`, `drawGlow` and MOTION. |
| `overdrive.js` | OVERDRIVE (`BTL_OD`, `btlOd*`): THE SWARM in place of the spark, the room burning blue, the wings of fire, the braided lance and the cold grade. |
| `kit.js` | OVERDRIVE's moves (`BTL_KIT`, `btl*`): Z's spray and scars, X's mark and column, C's take-off, cut, aim lanes and foot, COMBO 1's wall and giant column. Each takes the stock state (`P.odScorch`, `odScars`, `odPyros`, `P.odStrike`, `odRing`) and draws in the stock layer. |
| `khepri.js` | V, FUSION CORE as KHEPRI (`BTL_KH`, `btlKhepri*`): the change, the scarab holding its blue sun, the aura, the thrown suns rolled by small scarabs, the blasts and the screen. |
| `kills.js` | The kills (`BTL_ASH`, `btlKill*`, `btlBossAsh`): a body burns out in blue cinders and leaves a scorch; a boss crumbles to ash from the side the blow came from, drawn from its own poly so the canvas is never read. |
| `ui.js` | The screen (`BTL_UI`, `BTL_FX`, `btlHud*`, `btlStrikeUiArt`, `btlBrandUiArt`): the heat meters as runs of body plates with shell-shaped keys, BRAND's view with mandible brackets, COMBO 1's key, and the map that moves the kit's burst colours onto the beetle's ramp. |
| `board-ui.js` | The board's screen: both meters looping through their states, BRAND and COMBO 1, and the bursts, stock against KHEPRI. |
| `adapter.js` | The wiring (`BTL_G`, `btlWorn`, `btlTake`, `btlFrame`, `btlKillTap` and what the guards hand over to). It decides when the skin is on, builds `me` from `P`, keeps one bag per pilot, and turns the skin off for the session if the art ever throws, so the stock art draws instead. |
| `lift.mjs` | The lift: `node beetle-art/lift.mjs` checks, `--write` puts the block into `index.html`. |
| `board-kills.js` | The board's kills: bodies dying in the lance and a boss going to ash, on a loop. |
| `board-khepri.js` | The board's V: the fight, with suns seeking, taking bodies in and blowing on the stock numbers, and the change up close with a scrubber. |
| `board-kit.js` | The board's move stages: Z and X on the stock logic in miniature, and BRAND as one scrubbable timeline in the real arena. |
| `board.js` | The board's stages: a puppet that flies the beetle on EMBER's fire cycle, and the canvases it is drawn on. |
| `board.html` | The board page, with markers where the code goes. |
| `build.mjs` | Builds the board as one self-contained page. It slices the game's own glow helpers and MOTION out of `index.html`, so the board draws with exactly the code a run would. |

## Building the board

```
node beetle-art/build.mjs <out.html>
```

The output is an artifact page fragment, with no `<!doctype>` of its own. To open it locally, wrap it in one.

## Lifting it into the game

```
node beetle-art/lift.mjs           # check: lifts it in memory, writes nothing
node beetle-art/lift.mjs --write   # lifts it into index.html
```

The six art files (beetle, kills, overdrive, kit, khepri, ui) and the adapter go in as one block straight after MOTION, between the KHEPRI markers. Lifting
again replaces the block. Then a guard, `if (btlTake(fn)) return;`, goes at the top of each stock draw function in
the tables below, plus a tap in `killBody` and a call in `frame()`. Each place is found by an exact line, so if the
game around it has moved, the lift says which place and writes nothing. It then checks that the page's scripts still
parse and that every `btl*` call is defined. `npm run test:khepri` plays a run with the skin on and off and checks
that every guard handed over to the art, the art never threw, and the two runs stayed identical.

The skin is on only when all of these hold: the pilot is EMBER, it is this machine's own pilot (a co-op partner sees
the stock look), and the profile holds and equips `ember-gift`. That profile is either a dev account (`ALL_SKINS`)
or one of EMBER's own (`SKIN_GRANTS`).

## How the art meets the game

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

And V:

| Stock | Beetle |
|---|---|
| `drawOdFusionAura()` | `btlKhepriAura(me, P.odFusion, uiTime)` |
| `drawOdFusionHull()` | `btlKhepriHull(B, me, P.odFusion, uiTime, odFusionThrow)` |
| `drawOdStars()` | `btlKhepriStars(odStars, odStarBooms, uiTime)` |
| `drawOdFusionScreen()` | `btlKhepriScreen(P.odFusion, uiTime, odFusionOutAt, W, H)` |

And the kills:

| Stock | Beetle |
|---|---|
| the burst in `killBody(e)` | `btlKillTap(e)`, which calls `btlKill` or `btlBossAsh`. The finales that draw their own deaths are left alone: ROOT, THE FOUNDER, ONE POINT OH, its rite, AMALGAM's parts and THE UNWRITTEN's halves. |
| `drawOdScars()` | `btlDrawFloorMarks`: Z's scars and the kills' scorches |
| `drawOdStars()` | `btlDrawOverBodies`: V's suns, then the ash and cinders |

And the screen:

| Stock | Beetle |
|---|---|
| `drawOdHud(pad, ly, bw)` | `btlDrawOdHud`, which reads the game into `btlHudKit` |
| the HUD's vent meter, outside OVERDRIVE | `btlDrawVentHud`, which reads it into `btlHudVent` |
| `drawOdStrikeUi()` | `btlDrawStrikeUi`, which reads it into `btlStrikeUiArt` |
| `drawOdBrandUi()` | `btlDrawBrandUi`, which reads it into `btlBrandUiArt` |
| the kit's 31 effect functions (`odIgnite`, `odScorchFx` … `odStarHitFx`) | `if (btlFx(fn, arguments)) return;`: the function runs once as it is, then the sparks, rings and ground waves it pushed are recoloured through `BTL_FX` |
| VENT READY, and Z's and C's damage numbers | their colour goes through `btlFxText` |

Sparks, rings and waves are each machine's own (SNAP_LOCAL), and the effect rolls the same dice either way, so
recolouring them touches nothing the simulation or the other player reads.
