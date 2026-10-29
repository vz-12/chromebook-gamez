# Ash route: concept art

Concept art for the route where the challenger loses: the first boss and the
basic enemies, shown in the arena from the game camera (¾ top-down). Nothing
here is in the game yet. `netlify.toml` returns 404 for this folder, so none of
it is readable on the site.

| Sheet | Source | Render |
| --- | --- | --- |
| THE CINDERED WARDEN, the first boss | `warden.html` | `warden.png` (3840×2160), `warden-1080p.png` |
| The ash crawlers: THE DRAGGED, THE SLOUGH, THE KINDLE | `crawlers.html` | `crawlers.png` (3840×2160), `crawlers-1080p.png` |

Names, sizes and behaviour notes on the sheets are placeholders.

## Rendering

Each sheet is one self-contained page that draws itself on a canvas. Open it in
a browser to see it, or render it to a PNG:

```
node ash-route-art/render.mjs ash-route-art/crawlers.html crawlers.png
node ash-route-art/render.mjs ash-route-art/warden.html warden.png
```

`render.mjs` needs Playwright with Chromium. The drawing is seeded, so the same
source always gives the same image.

## How it's drawn

Both sheets share one drawing kit at the top of the file:

- **Shapes:** `smoothPath` for organic outlines, and `taper` for anything with a
  spine and widths: limbs, fingers, branches, drips.
- **Shading:** `part()` fills a shape, then adds a texture, a hard shadow, light
  from the sky along the top edge, light from the lava along the bottom edge,
  and an ink outline.
- **Textures:** `crust` (char plates lifting off meat, with `bare` wounds where
  the meat shows), `fibres` (muscle), `ashTex` (sagging ash folds), `droop`
  (ash drips).

`crawlers.html` repeats the kit from `warden.html` so each file stands on its
own. Change one and the other doesn't follow.

The palettes are the `const`s near the top: `CH`, `MT`, `BONE`, `IRON`, `EMB`,
`HOT` in both files, plus `AS` and `AS2` for ash in `crawlers.html`.

## The designs

**THE CINDERED WARDEN.** The keep's gaoler stayed at his post while it burned,
and the fire cooked him rather than killing him.

- **Body:** his skin is a black crust lifting off raw meat. His ribcage is
  burnt open, with a coal for a heart, and the burnt grove has rooted in his
  back.
- **Iron:** his cage helm, pauldrons, greaves and manacles are fused into him,
  and a ring of melted keys hangs at his hip.
- **Hands:** one holds fire in the palm; the other drags a cleaver hammered from
  the keep's iron door.

**The crawlers.** The keep's prisoners, burnt to ash from the waist down. They
drag themselves along on their hands, leaving a smear of ash behind them.

- **THE DRAGGED:** the basic one. Hauls itself straight at you and grabs.
- **THE SLOUGH:** heavy. One arm has melted into a club that it swings, leaving
  pools of ash that slow you.
- **THE KINDLE:** fast and fragile. A coal shows through a hole in its back, and
  it bursts into embers when it reaches you.
