# RONIN's V, LAST VOW — the art, ready to lift

The art for RONIN's V, drawn over the placeholders that `ronin-v` has had since 4 Oct. It's
written here as plain JS blocks, cut to go straight into `index.html`. Nothing in this folder is in
the game yet, and `.assetsignore` keeps the folder off the public site.

To see it play before lifting, use the review page: https://claude.ai/artifact/FUqU64cQuhLwYKNaVXru25
(the cut-in, the model, and a room playing all 16 vow moves and SKY CLEAR).

## Lifting it

```
node ronin-v-art/lift.mjs                  # check only: lifts it in memory, writes nothing
node ronin-v-art/lift.mjs --out lifted.html   # writes the lifted page somewhere else to try
node ronin-v-art/lift.mjs --write           # lifts it into index.html
```

`lift.mjs` finds every place it touches by a function's name and an exact line. If anything has
moved or changed since it was written (against `ronin-v` at b4b00ba), it stops and writes nothing.
It also refuses a page that's already lifted. Before it says yes, it checks:

- the lifted page compiles;
- every function the art calls exists in it;
- each of the art's functions is in it exactly once, and none of them was already in `index.html`
  except the ones it replaces.

After `--write`, run the suites as usual (`npm test`, `npm run test:lockstep`). Once it's lifted,
this folder has nothing the game needs, so it can be deleted.

## One thing to decide first: the cut-in's 4.75 s

The cut-in runs 4.75 s, so the lift moves `VOW_T_CUT` from 1.6 to 4.75. The room is held at
`RN_SLOW` (4%) for the whole cut-in, as before, so each vow now freezes the room about 3 s longer.
With the lift, `npm test` passes. `npm run test:lockstep` stays in step everywhere, but one
coverage check fails: in "internet", the guest's pilot never chooses its own card or gear. The guest
there is RONIN, and the bot takes the vow every time it can, so the run doesn't reach the guest's
level-up in its 3 minutes. The art isn't the cause: lifted with `VOW_T_CUT` left at 1.6, "internet"
plays exactly as it does today (the same menus, the same kills).

In co-op, the other pilot waits through the whole 4.75 s too. Ways out:

- keep 4.75 s and change the "internet" scenario so its guest still gets a choice (fewer vows, or a
  longer run);
- in co-op, let the cut-in play over the running room instead of holding it;
- make the cut-in shorter.

## The files

| File | What it is | In `index.html` |
|---|---|---|
| `hull.js` | RONIN's own art taking the vow's look: `drawRoninUnder` and `drawRoninHull` (index.html's own, with the vow's lines added, each marked `// V`), and `vraKatana` redrawn whole (`VRK`, `vrk*`) | replaces those three where they stand |
| `model.js` | the vow on the hull (the red breath, the thread to the grave, the tears, the undead flash) and the grave post (`VKW`, `vkw*`) | replaces the placeholders `drawRoninVowWorld`, `drawRoninGrave` |
| `cut-in.js` | the cut-in, 4.75 s from the press to the cut (`VKV`, `vkv*`) | replaces the placeholder `drawRoninVowScreen` |
| `vow-z.js` | the vow's Z: SUNDER, SHATTER, FAULT LINE, AFTERSHOCK (`VKZ`, `vkz*`); the dead, the bone arms and his true form, which the other files use too | replaces the placeholders `rkvTears`, `roninVowNameFx`, `roninVowBlastFx` |
| `vow-x.js` | the vow's X: THUNDERCLAP, CHAIN LIGHTNING, THE SKY FALLS, METEOR, ECLIPSE, STARFALL, TECTONIC, RUPTURE (`VKX`, `vkx*`) | replaces the placeholder `rkvArcs` |
| `vow-c.js` | the vow's C: WRATH, QUAKE, EYE OF THE STORM, NO MERCY (`VKC`, `vkc*`) | new |
| `sky-clear.js` | SKY CLEAR (`VKS`, `vks*`) | replaces the 7 SKY CLEAR placeholders |

`hull.js` goes where `drawRoninUnder` was. The other six go together, in the order above, just
before `end of RONIN'S KIT art hooks`, after the placeholders that are still standing. Order
matters for one thing only: `vow-z.js` has to come before `vow-x.js`, `vow-c.js` and
`sky-clear.js`, because they add their kanji to its `VKZ_KANJI` as they load.

Each file's header says what it draws and what it reads. The art changes nothing the game's logic
reads, so the lift is art only, apart from `VOW_T_CUT`. The one thing it sets is `x.e.roninHide`,
the drawing switch STILL WATER's own art already sets for the body an execution has.

## Every edit, in words (what `lift.mjs` does)

**Taken out** (each with the comment directly above it):
- `drawRoninUnder`, `drawRoninHull`, `vraKatana`;
- the placeholders `drawRoninGrave`, `drawRoninVowWorld`, `drawRoninVowScreen`, `rkvTears`,
  `rkvArcs`, `roninVowNameFx`, `roninVowBlastFx`, `drawRoninSkyClear`, `drawRoninSkyClearScreen`,
  `roninSkyClearFx`, `roninSkyClearLandFx`, `roninSkyClearHitFx`, `roninSkyClearCutFx` and
  `roninSkyClearPriceFx`.

**Put in:** the seven files, as above.

**Hook lines**, each marked `// V`. "First" means a new first line in the function.

| Function | Line |
|---|---|
| `drawRoninScores` | first: `vkzFloorFx();` · in its `for (const c of roninCleaves)` loop, first: `if (c.vow) { vkzFloor(c); continue; }` |
| `drawRoninCleaves` | in its `for (const c of roninCleaves)` loop, first: `if (c.vow) { vkzCleave(c); continue; }` |
| `roninCleaveFx` | first: `if (c.vow) return vkzCleaveFx(c);` |
| `roninStrokeFx` | first: `if (c.vow) return vkzStrokeFx(c, s);` |
| `roninCleaveHitFx` | first: `if (c.vow) return vkzHitFx(e, c, s);` |
| `drawRoninVowScreen` (the cut-in's) | first: `vkzScreen();` |
| `drawRoninDashTrail` | first: `vkxTrail(); if (vkxIsVow(P.roninDash)) return;` |
| `drawRoninSky` | first: `vkxSky();` · `if (d) {` becomes `if (d && !vkxIsVow(d)) {` · `if (sp.merged) continue;` becomes `if (sp.merged \|\| vkxIsVow(sp)) continue;` |
| `roninSkyFx` | first: `if (vkxIsVow(d)) return vkxSkyFx(d);` |
| `roninSkyLandFx` | first: `if (vkxIsVow(d)) return vkxLandFx(d);` |
| `roninSplitFx` | first: `if (vkxIsVow(sp)) return vkxSplitFx(sp);` |
| `roninSplitHitFx` | first: `if (vkxIsVow(sp)) return vkxHitFx(e, sp, star);` |
| `drawRoninStillUnder` | first: `if (P.roninStill && P.roninStill.vow) return vkcStance(P.roninStill);` |
| `drawRoninExecWorld` | first: `if (vkcWorld()) return;` |
| `drawRoninExecScreen` | first: `if (vkcScreen()) return;` |
| `roninStillFx` | first: `if (s.vow) return vkcStillFx(s);` |
| `roninStillEndFx` | first: `if (s.vow) return vkcStillEndFx(s);` |
| `roninStillCatchFx` | first: `if (x.vow) return vkcCatchFx(x);` |
| `roninExecKillFx` | first: `if (x.vow) return vkcKillFx(x);` |
| `roninExecEndFx` | first: `if (x.vow) return vkcEndFx(x);` |
| `rkcStep`, `rkcDrawWaves` | `if (!w.still) continue;` becomes `if (!w.still \|\| vkcWave(w)) continue;` |
| `roninVowFx` (placeholder, stays) | first: `vkvBegin();` |

**Also:**
- `VOW_T_CUT` goes from 1.6 to 4.75, because the cut-in is 4.75 s. The room is held through it as
  before, so it costs nothing from any clock.
- Lockstep's run snapshots must leave the art's state on each machine, as they already do RONIN's
  other art layers. `VKZ`, `VKX`, `VKC` and `VKS` join `RKA`, `RKC`, `RKV` in `SNAP_LOCAL`, and C's
  vow tables `VKC_PLAN`, `VKC_DRAW`, `VKC_KILL` join `RKC_PLAN`, `RKC_DRAW`, `RKC_KILL` in
  `SNAP_TABLES`. Without this, every snapshot tries to carry canvases and closures, and `npm test`
  fails on "cannot travel".
- The placeholders' header gets a few lines saying what has its art now.
- `RKV.scAt`, `RKV.scCutAt` and `RKV_BLOOD` are dropped; only the placeholder SKY CLEAR used them.

## Still placeholders after the lift

The HUD hooks: `drawRoninVowKey`, `drawRoninVowHud`, `drawRoninBrokenHud`. And the fx hooks:
`roninVowFx` (apart from its new `vkvBegin()`), `roninVowCutFx`, `roninGraveHitFx`,
`roninGraveBreakFx`, `roninVowEndFx`, `roninUndeadFx`. The grave's breaking and sealed looks aren't
drawn yet either: `drawRoninGrave` cracks as it's hurt and sinks at the end of SKY CLEAR, and
that's all.
