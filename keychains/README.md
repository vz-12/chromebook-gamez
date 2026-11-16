# Keychains and minis

The two starting pilots, VOIDRUNNER and EMBER, as printable 3D models in the main game's look (not
the Ashen art direction), sculpted the way a real craft would be built:

- **Body:** a fuselage with an oval section from nose to tail, and wings thick at the root and thin
  at the tip, their edges rounded over.
- **VOIDRUNNER:** two engine pods.
- **EMBER:** a railgun trench down the lance between its two rails.
- **Canopy:** a glass blister.
- **Exhaust:** the flames as plumes.

What makes them the arena's ships comes from the game itself. The outlines are read straight out of
`hullPath()` in `index.html`, offset by half the 2.4 stroke so they are the size the arena draws
them. The furniture is `hullDetail()`'s, line for line:

- **Rim:** the game's neon stroke becomes trim round every edge.
- **Lit lines:** raised strips.
- **Dark lines:** engraved panel lines.
- **EMBER's vane seams:** orange.

EMBER is shown without the emitter at the tip of the lance.

Each ship is made two ways:

- **Keychain:** hangs nose-up from a tab past the nose, through a 4.2 mm hole.
- **Mini:** smaller and a little deeper in relief, with a socket under its belly. It flies on a
  stand whose base is a disc of arena floor.

| | Size (mm) |
|---|---|
| VOIDRUNNER keychain | 33.9 × 47.1 × 5.9 |
| EMBER keychain | 35.2 × 59.8 × 6.3 |
| VOIDRUNNER mini | 19.8 × 23.0 × 4.7 |
| EMBER mini | 20.5 × 30.5 × 5.0 |
| mini stand | 26 across, 18.7 tall (the ship sits at 17.4) |

## The files (`out/`)

| File | What it's for |
|---|---|
| `<pilot>-keychain.3mf`, `<pilot>-mini.3mf` | Multi-colour printers. The ship is one object whose parts are named and coloured; a mini's file has its stand on the plate beside it. |
| `<pilot>-keychain.stl`, `<pilot>-mini.stl` | One colour. Every part of the ship merged. |
| `stl/<pilot>-<keychain or mini>-<part>.stl` | One file per part, all in the same place, for slicers that want them separately. |
| `mini-stand.stl` | The stand on its own. |
| `<pilot>-keychain.glb`, `<pilot>-mini.glb` | Looking at them in any 3D viewer, lit as in the game; the mini on its stand. |
| `keychains.json` | Sizes, the hole and socket, and each part's filament. |

The folder is in `.assetsignore`, so none of it is on the public site. To offer the files there,
take that line out.

## Printing

| Part | Filament | What it is |
|---|---|---|
| hull | black | the body, with the panel lines engraved |
| neon | the pilot's colour (cyan or coral red) | the trim round every edge, inlaid, and the lit strips, standing proud |
| hot (EMBER) | orange | the vane seams, inlaid |
| light | white | the canopy blister and the exhaust plumes |

- Ships print face up, flat underside on the bed, no supports: the sculpting is all on top.
- The colours are inlays 0.6 mm deep (0.45 mm on a mini) that follow the surface, so a multi-colour
  printer only changes filament in the top few layers.
- One colour: the merged `.stl`. The sculpt, the panel lines and the raised strips carry the detail.
- The stand prints standing up. Its peg is 3.0 mm across and the socket 3.3 mm, so the ship sits on
  and lifts off.
- No line or groove on a mini is thinner than 0.8 mm, so they print on a 0.4 mm nozzle.

## Rebuilding

```
python3 keychains/build.py            # writes keychains/out/
python3 keychains/build.py --check    # builds everything and checks every part is a closed solid; writes nothing
```

Only numpy. The sculpt of each ship is its `form` in `PILOTS`: wing thickness at root and tip,
fuselage stations, engine pods, canopy and plume heights. Each variant's scale, relief, inlay and
engraving depths, and tab or socket are in `VARIANTS`, and the stand in `STAND`. It stops if
`hullPath()` no longer reads as the outline it expects.
