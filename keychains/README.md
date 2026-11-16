# Keychains

The two starting pilots, VOIDRUNNER and EMBER, as printable 3D keychains in the main game's look:
a dark hull, the neon rim, the lit lines and the white-hot parts, standing on a translucent plate
that stands in for the glow the hull throws in the arena. (This is the arena look, not the Ashen art
direction.)

The outlines are read straight out of `hullPath()` in `index.html`, and the furniture is
`hullDetail()`'s, line for line, so a keychain is always the hull the game draws.

| | Size (mm) | Parts |
|---|---|---|
| VOIDRUNNER | 35.7 × 54.6 × 4.1 | glow plate, hull, rim and lines, canopy and flames |
| EMBER | 36.5 × 65.5 × 4.7 | glow plate, hull, rim and lines, vane seams, canopy, flame and emitter |

## The files (`out/`)

| File | What it's for |
|---|---|
| `<pilot>-keychain.3mf` | Multi-colour printers. One object; its parts are named and coloured. |
| `<pilot>-keychain.stl` | One colour. Every part merged. |
| `stl/<pilot>-<part>.stl` | One file per part, all in the same place, for slicers that want them separately. |
| `<pilot>-keychain.glb` | Looking at it in any 3D viewer, lit as in the game. |
| `keychains.json` | Sizes, the hole's position, and each part's filament and heights. |

The folder is in `.assetsignore`, so none of it is on the public site. To offer the files there,
take that line out.

## Printing

- Face up, flat back on the bed, no supports. Every height is a multiple of 0.2 mm.

  | Part | Filament | Height |
  |---|---|---|
  | glow plate | translucent, in the pilot's colour | 0 to 1.6 mm |
  | hull | black | 1.6 to 3.0 mm (grooves down to 2.4) |
  | rim and lines | the pilot's colour (cyan or coral red) | 1.6 to 3.8 mm (lines to 3.4) |
  | vane seams (EMBER) | orange | 2.4 to 3.4 mm |
  | canopy, flame, emitter | white | 1.6 to 4.1 mm (EMBER's emitter to 4.7) |

- One nozzle, swapping by height: pause at 1.6 mm and 3.0 mm. Translucent, then black, then the
  neon colour. The flames come out black and the canopy in the neon colour.
- One colour: the merged `.stl`. The rim, lines, canopy and flames stand proud, so the ship still reads.
- The hole is 4.2 mm across, for a jump ring.

## Rebuilding

```
python3 keychains/build.py            # writes keychains/out/
python3 keychains/build.py --check    # builds both and checks every part is a closed solid; writes nothing
```

Only numpy. The scale, layer heights, glow width, flame length, EMBER's charge and the ring are
constants at the top of `build.py`. It stops if `hullPath()` no longer reads as the outline it
expects.
