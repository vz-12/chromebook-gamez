# Keychains and minis

The two starting pilots, VOIDRUNNER and EMBER, as printable 3D models in the main game's look:
a dark hull, the neon rim, the lit lines and the white parts, standing on a translucent plate that
stands in for the glow the hull throws in the arena. (This is the arena look, not the Ashen art
direction.) Each ship is made two ways:

- **Keychain:** the arena's hull exactly, miters and all, hanging nose-up from a 4.2 mm hole.
- **Mini:** smaller, with every edge rounded (the outline, the rim, the ends of every line, the
  flame's tip, the glow plate), and no hole. It has a socket in the back and flies flat on a stand
  whose base is a disc of arena floor, so it is seen from above the way the game shows it.

The outlines are read straight out of `hullPath()` in `index.html`, and the furniture is
`hullDetail()`'s, line for line, so they are always the hulls the game draws. EMBER is shown with
its vane seams lit but without the emitter at the tip of the lance.

| | Size (mm) |
|---|---|
| VOIDRUNNER keychain | 35.7 × 54.6 × 4.1 |
| EMBER keychain | 36.5 × 65.5 × 4.1 |
| VOIDRUNNER mini | 21.5 × 24.2 × 3.6 |
| EMBER mini | 22.3 × 31.6 × 3.6 |
| mini stand | 26 across, 24 tall (the ship sits at 22.4) |

## The files (`out/`)

| File | What it's for |
|---|---|
| `<pilot>-keychain.3mf`, `<pilot>-mini.3mf` | Multi-colour printers. The ship is one object whose parts are named and coloured; a mini's file has its stand on the plate beside it. |
| `<pilot>-keychain.stl`, `<pilot>-mini.stl` | One colour. Every part of the ship merged. |
| `stl/<pilot>-<keychain or mini>-<part>.stl` | One file per part, all in the same place, for slicers that want them separately. |
| `mini-stand.stl` | The stand on its own. |
| `<pilot>-keychain.glb`, `<pilot>-mini.glb` | Looking at them in any 3D viewer, lit as in the game; the mini on its stand. |
| `keychains.json` | Sizes, the hole and socket, and each part's filament and heights. |

The folder is in `.assetsignore`, so none of it is on the public site. To offer the files there,
take that line out.

## Printing

- Ships print face up, flat back on the bed, no supports. Every height is a multiple of 0.2 mm.

  | Part | Filament | Keychain | Mini |
  |---|---|---|---|
  | glow plate | translucent, in the pilot's colour | 0 to 1.6 mm | 0 to 1.2 mm |
  | hull | black | 1.6 to 3.0 mm | 1.2 to 2.8 mm |
  | rim and lines | the pilot's colour (cyan or coral red) | 1.6 to 3.8 mm | 1.2 to 3.6 mm |
  | vane seams (EMBER) | orange | 2.4 to 3.4 mm | 2.2 to 3.2 mm |
  | canopy and flame | white | 1.6 to 4.1 mm | 1.2 to 3.6 mm |

- One nozzle, swapping by height: pause at 1.6 mm and 3.0 mm on a keychain, 1.2 mm and 2.8 mm on a
  mini. Translucent, then black, then the neon colour. The flames come out black and the canopy in
  the neon colour.
- One colour: the merged `.stl`. The rim, lines, canopy and flames stand proud, so the ship still reads.
- The stand prints standing up. Its peg is 3.0 mm across and the socket 3.3 mm, so the ship pushes on
  and lifts off.
- No line or groove on a mini is thinner than 0.8 mm, so they print on a 0.4 mm nozzle.

## Rebuilding

```
python3 keychains/build.py            # writes keychains/out/
python3 keychains/build.py --check    # builds everything and checks every part is a closed solid; writes nothing
```

Only numpy. Each variant's scale, heights, glow width, rounding and hole or socket are in
`VARIANTS` at the top of `build.py`, and the stand in `STAND`. It stops if `hullPath()` no longer
reads as the outline it expects.
