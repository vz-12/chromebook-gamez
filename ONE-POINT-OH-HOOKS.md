# ONE POINT OH: the route's art hooks, and the kit they draw with

Every visual piece of ONE POINT OH's route, and its two sounds, is drawn by
one of these hooks. **They are blank for now, and stay blank until the art is
drawn.** Each placeholder draws the least that lets the route be played and
read (hairlines and plain words), and is meant to be replaced whole. The look
they are for is "The fight's look" in `ONE-POINT-OH-PLAN.md`. Add `?hooks=1`
to the address to tag each piece with its hook's name.

What the art is drawn **with** is the art kit, `OPO_KIT`: three dimensions
faked on the 2D canvas, for debris that tumbles, bounces and flies at the
screen, and for the screen itself breaking, folding in on itself and peeling
back. It draws nothing on its own. The bench (`?opo=bench`) plays every part
of it. Both are below the hooks in this file.

All the hooks are in one block of `index.html`, from
`ONE POINT OH — art hooks` down to `end of ONE POINT OH art hooks`, as entries
of the `OPO_ART` object. Replace the block whole, or any one entry. The
block's own header (WHAT THEY ARE HANDED) is the same list as below. The kit
is the block right after it, `ONE POINT OH — the art kit`.

- **Drawing only.** A hook changes nothing of the run. It rolls only
  `rnd`/`rndi`/`pick`, never `simRand`, and so does the kit (or its own
  seeded `OPO_KIT.rng(seed)`). `npm run test:opo` plays the fight twice, once
  with blank hooks and once with hooks that run the kit hard, and fails if the
  run comes out any different.
- **Sandboxed.** `OA(name, ...)` calls it inside `g.save()` / `g.restore()`.
- **Fails alone.** A hook that throws loses only its own piece, and is named
  once in the console. `npm run test:opo` calls every hook on the way through
  the route and fails if one throws or is never called.
- **Its own caches.** A top-level `let`, or a cache that starts empty, goes in
  `SNAP_LOCAL` / `SNAP_LOCAL_OBJS` (RUN SNAPSHOTS in `index.html`). State a
  hook keeps from frame to frame is easiest in an `OPO_KIT.scene` (below),
  which the snapshots never carry.
- **Two canvases.** `g` is the 2D context to draw on: the game's own, except
  the four marked **[frame]**, which draw on the first build's canvas inside
  the copy (`onepointoh/lock.js` calls them through `OPO_HOST.art`).
- **The first build, live.** `tex` is the copy's own canvas, still running in
  its frame (`OpoLock.tex()`), or `null` when there is no copy (a determinism
  starter, a test). Draw from it with `g.drawImage(tex, ...)`: it is the real
  thing playing, not a picture of it. It is there from the lock to the end of
  the fight. `OPO_KIT.first()` is the same canvas, or a stand-in in its
  colours when there is none, so a hook always has something to put on a pane.
- **The old palette.** `OPO_FIRST` is the first build's colours and type,
  read off `3af8b6d`.

`(w, h)` is the screen in CSS pixels. "World" hooks are drawn under the
camera, in the room's coordinates.

## Where every hook is

Line numbers are `index.html`'s as of this commit; the names are what to
search for. "Render" is where in `render()` the caller runs, so you know what
a hook is drawn over and under.

| Hook | Defined | Called from | Render order | When |
| --- | --- | --- | --- | --- |
| `front` | 42181 | `drawOpoFloor` 41864 | 47909, under the bodies | the fight, every frame |
| `sweep` | 42192 | `drawOpoFloor` 41866 | 47909 | each revert on the floor |
| `restore` | 42223 | `drawOpoFloor` 41868 | 47909 | each restore standing in the room |
| `door` | 42135 | `drawOpoWorld` 41873 | 47965, over the bodies | the old door, while it stands |
| `pane` | 42209 | `drawOpoWorld` 41877 | 47965 | each pane in the air or landed |
| `paint` | 42217 | `drawOpoWorld` 41879 | 47965 | while he paints a restore out |
| `him` | 42170 | `drawOpoWorld` 41880 | 47965 | the fight, every frame |
| `card` | 42236 | `drawOpoWorld` 41884 | 47965 | each card HOLLOW is peeling off |
| `worldFx` | 42265 | `drawOpoFx` 41899 | 47966, right after `him` | every frame of the route |
| `worldFlat` | 42266 | `drawOpoFlat` 41909 | 48034, after bloom, grade, split | every frame of the route |
| `revert` | 42144 | `drawOpoScreen` 41917 | 48092, over the HUD | the lock's way in |
| `shatter` | 42166 | `drawOpoScreen` 41922 | 48092 | stage `open` |
| `record` | 42243 | `drawOpoScreen` 41925 | 48092 | stages `fight`, `cascade` |
| `restoreFx` | 42232 | `drawOpoScreen` 41928 | 48092 | each date passed, while it plays |
| `cascade` | 42252 | `drawOpoScreen` 41929 | 48092 | stage `cascade` |
| `out` | 42255 | `drawOpoScreen` 41930 | 48092 | stage `out` |
| `voice` | 42131 | `drawOpoScreen` 41932, `drawOpoLost` 41947 | 48092, 48147 | while he has a line |
| `screenFx` | 42267 | `drawOpoScreen` 41934 | 48092, the last thing drawn | every frame of the route |
| `lockUnder` | 42150 | `drawOpoLock` 41941 | 47857 (state `opolock`) | under the copy's frame |
| `lost` | 42258 | `drawOpoLost` 41946 | 48147 | a fight lost or left |
| `saySound` | 42263 | `opoSay` 41097 | (sound) | each line, as it starts |
| `crack` **[frame]** | 42153 | `onepointoh/lock.js` 201, `drawArena` wrapper | the first build's arena | every locked run |
| `crackSound` **[frame]** | 42161 | `onepointoh/lock.js` 148, `update` wrapper | (sound) | now and then, in a locked run |
| `lockVoice` **[frame]** | 42162 | `onepointoh/lock.js` 212, `render` wrapper | over the first build | while he has a line |
| `lockFx` **[frame]** | 42268 | `onepointoh/lock.js` 213, `render` wrapper | over everything in the frame | every frame of the lock |

"The route" is the door, the revert and the fight (`opo || opoDoor ||
opoRevert`). In the lock, today's canvas is under the frame and the frame's
own hooks draw.

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
| `lockFx` | `(g, w, h, s)` **[frame]** | The art's own layer in the lock, every frame, over everything the first build drew: the glass, light through the crack, debris off it. `s` is `{ crack: { p, w, runs, broke }, run: { t, held, broke, line }, state, t, kit }`; `state` is the first build's own (`menu play pause levelup shop dead`). `kit` is today's `OPO_KIT` (it draws on any context). |

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

## Every frame of the route: the art's own layers

The hooks above are each tied to one thing in the run. These three are not:
they are called every frame the route is on, whatever is happening, for the
art's own debris and effects, the ones that outlive the thing that set them
off (a pane's chunks still tumbling after the pane is gone, cracks in the
glass). Each is handed the same `s`:

```
s = { stage, ph, st, t, tex, kit, S }
  stage  'door' | 'revert' | 'open' | 'fight' | 'cascade' | 'out'
  ph     the phase, 0..4 (-1 before the fight)      st  seconds into the stage
  t      uiTime                                     tex the first build, live (or null)
  kit    OPO_KIT                                    S   the hook's space (below)
```

| Hook | Handed | Where it draws |
| --- | --- | --- |
| `worldFx` | `(g, s)` | World, lit: in the room with today's renderer, right after `him`, before bloom and the grade, so it glows and is graded like everything else of today's. `s.S` is `OPO_KIT.world()`: its floor is the room's floor, z is height. |
| `worldFlat` | `(g, s)` | World again, after bloom, the grade and the chromatic split: the first build's renderer, flat and unlit, laid over today's. The same transform and `s.S` as `worldFx`. |
| `screenFx` | `(g, w, h, s)` | The screen, last of all, over the HUD and his voice: the glass of your screen and whatever hits it. `s.S` is `OPO_KIT.screen(w, h)`: its floor is the screen itself, z > 0 is out of it toward you. |

`lockFx` (above) is the same idea inside the lock.

## The events

The route tells the art what just happened, through `OPO_KIT`'s event feed.
Nothing in the run reads it. `OPO_KIT.feed('myHook')` returns the events that
reader has not seen yet, oldest first, each `{ kind, t, seq, ...data }`; give
each hook its own name and they can all listen. Events are kept 4 seconds.
Positions are in the room's coordinates (convert for a screen hook with
`OPO_KIT.world().toScreen(OPO_KIT.V(e.x, e.y, 0))`).

| Event | Data | When |
| --- | --- | --- |
| `door` | `{ x, y }` | the old door taken |
| `revert` | `{ i, entry }` | a piece of the record goes (the lock's way in) |
| `lock` | | the lock engages |
| `open` | | the shatter begins: face to face |
| `phase` | `{ i, n }` | a phase opens |
| `hit` | `{ x, y, crit }` | a round lands on him |
| `pane` | `{ x, y, tx, ty }` | a pane thrown, from him toward where it lands |
| `paneBreak` | `{ x, y, r, ang }` | a pane broken in the air |
| `paneLand` | `{ x, y, r }` | a pane landed: floor lost |
| `sweep` | `{ vert, dir, lane, lanes }` | a revert sets off |
| `restore` | `{ i, entry, x, y }` | a date passed |
| `settle` | `{ x, y, i }` | a restore kept |
| `paintOut` | `{ x, y, i }` | a restore painted out |
| `peel` | `{ id, x, y }` | HOLLOW takes a card |
| `baseShip` | | nothing left on the ship |
| `today` | | the last hit: the cascade begins |
| `out` | | he is left holding an empty frame |
| `lost` | | a fight lost or left |

## The record

The record (`opoRecord()`) is the list `record`, `revert`, `restore` and
`restoreFx` are handed. Each entry is `{ d, key, n, q, say }`: the date, the
art's key for it, what it brought, the record's name for it as he quotes it,
and the rest of his line. The fixed dates are `OPO_RECORD_BASE`; every day the
`CHANGELOG` has after 6 Oct joins it (`key: 'since'`), then `TODAY`.

## The art kit (`OPO_KIT`)

`index.html`, from `ONE POINT OH — the art kit` (line 42272) to
`end of ONE POINT OH art kit` (43217). Every hook is handed it (`s.kit`), and
it is a global. It is drawing only, keeps all its state inside itself, and
every drawing function takes the context to draw on, so it works on either
canvas.

### The diorama: how three dimensions are faked

The picture is a box seen from above. Its floor is the plane `z = 0`, the eye
is at height `f` over its centre, and the glass of your screen is between
them, at `z = glass` (half of `f` by default). A point `(x, y, z)` is drawn at
`(x, y)` pulled away from the centre by `k = f / (f - z)`:

- on the floor, `k = 1`: it is where it always was;
- raised, it grows and spreads from the centre;
- at the glass it is about twice its size;
- below the floor (`z < 0`) it shrinks toward the centre, falling away.

There are two spaces:

- `OPO_KIT.screen(w, h)`: the floor **is the screen** (CSS px). `z > 0` comes
  out of the screen toward you, `z < 0` goes back into it. For debris thrown
  at you, the screen breaking, folding and peeling.
- `OPO_KIT.world()`: the floor is **the room's floor** (world px), the eye over
  where the camera looks, so `z` is height. For things in the room: panes
  dropped from high up, rubble, his frame turning.

A space `S` has `S.project(p)` → `{ x, y, k, d }` (where it is drawn, its
scale, its distance from the eye), `S.toScreen(p)` → CSS px on the screen (for
glass hits from a world hook), `S.faces(n, c)` (whether the eye sees a face
with normal `n` at `c`), and `S.f`, `S.glass`, `S.cx`, `S.cy`, `S.eye`. Both
take `{ f, glass }` to change the lens; `screen` also takes `{ cx, cy }`.

### Recipes

Each of these is also a demo on the bench, in `onepointoh/bench.js`.

**Keeping state.** A hook is called fresh every frame. `scene(key, make, gen)`
returns the same object every frame (made by `make()` the first time), until
`gen` changes, and lets it go once it has not been asked for in
`OPO_KIT.keep` (1.5) seconds:

```js
const fx = K.scene('shatter', () => buildShatter(), s.T);   // a new one whenever the set piece restarts
K.restartOn('shatter', s.t);                                // or: rebuilt when s.t runs backwards
```

**Debris at the glass** (`screenFx`): chunks thrown up off the screen, which
strike the glass and crack it.

```js
screenFx(g, w, h, s) {
  const K = s.kit;
  const fx = K.scene('debris', () => K.sim({ gravity: K.V(0, 1800, -900) }));
  fx.space = s.S;                                     // the screen's space, fresh each frame
  for (const e of K.feed('screenFx')) if (e.kind === 'paneBreak') {
    const at = K.world().toScreen(K.V(e.x, e.y, 0)), img = K.first();
    for (let i = 0; i < 6; i++) {
      const u0 = rnd(0, img.width - 64), v0 = rnd(0, img.height - 40);   // which piece of the picture it carries
      fx.add(K.body({
        shape: K.rect(-16, -10, 32, 20), thick: 5,     // a slab: it has sides
        x: at.x, y: at.y, z: 20,
        vx: rnd(-300, 300), vy: rnd(-400, -100), vz: rnd(900, 1500),  // up, out of the screen, at you
        wx: rnd(-6, 6), wy: rnd(-6, 6), wz: rnd(-3, 3),
        img, uv: K.rect(u0, v0, 64, 40).map(p => ({ u: p.x, v: p.y })),   // one per shape point
        glass: 'crack', life: 3 }));                 // crack | stick | bounce | pass | none
    }
  }
  fx.step();                                          // dt from the frame clock
  fx.draw(g);                                         // farthest first, lit
  K.glass.draw(g, w, h);                              // the cracks it made
}
```

**The screen shatters**: capture what is on the screen, break it radially
from a point, and throw the pieces.

```js
const cap = K.capture('shatter');                     // the frame so far: { img, sx }
const shards = K.radial(K.rect(0, 0, w, h, cap.sx), at, { spokes: 14, rings: 6, seed: 3 });
const fx = K.sim({ space: s.S, gravity: K.V(0, 950, -380) });  // down the screen, and away into it
for (const b of K.bodiesOf(shards, { img: cap.img, from: at, backCol: '#05060a', glass: 'crack', life: 5 })) fx.add(b);
K.glass.hit(at.x, at.y, 1.6);
// then every frame: draw what is underneath (s.tex: the first build, live), fx.step(), fx.draw(g)
```

**Fold in on itself**: the screen as one sheet, posed fresh each frame.

```js
const sh = K.scene('fold', () => { const cap = K.capture('fold');
  return K.sheet({ x: 0, y: 0, w, h, img: cap.img, uvScale: cap.sx, back: K.first() }); });
const e = x => K.ease.inOut(K.c01(x));
sh.pose()                                                              // flat, as made
  .fold(w / 3, 0, w / 3, h, Math.PI * e(t), { move: { x: 0, y: h / 2 } })         // the left third over
  .fold(0, h / 2, w, h / 2, Math.PI * e(t - 1), { move: { x: w / 2, y: 0 } })     // the top half down
  .crumple(e(t - 2), { seed: 5 });                                     // in on itself, to a wad
sh.draw(g, s.S);
// let it go: for (const b of sh.bodies({ life: 3 })) fx.add(b)
```

**Peel back**: `sh.pose().curl(x0, y0, x1, y1, 46, { side: -1, roll: true })`
rolls up everything past the line like a carpet, the roll moving as the line
does; without `roll` it lies flat back over the rest past half a turn, a
page turning.

**Panes into the room** (`worldFx`): bodies dropped from high over the floor.

```js
const fx = K.scene('panes', () => K.sim({ gravity: K.V(0, 0, -1600) }).floor(0));
fx.space = s.S;                                       // the eye follows the camera: update it every frame
for (const e of K.feed('worldFx')) if (e.kind === 'pane') {
  const img = s.tex || K.first(), iw = img.width, ih = img.height;
  fx.add(K.body({ shape: K.rect(-60, -34, 120, 68), thick: 3, x: e.tx, y: e.ty, z: 600,
                  img, uv: [{ u: 0, v: 0 }, { u: iw, v: 0 }, { u: iw, v: ih }, { u: 0, v: ih }],
                  wx: rnd(-3, 3), wy: rnd(-3, 3), backCol: '#1d3557', life: 6 }));
}
fx.step();
fx.draw(g);
```

Bodies on a floor cast soft shadows, sharper as they come down, and go to
sleep once they rest. For the first build's look, give a body `flat: true`
(never shaded, no specular) and draw it in `worldFlat`.

### Reference

**Maths.** `V(x, y, z)`, `add`, `sub`, `mul(v, s)`, `dot`, `cross`, `len`,
`norm`. Quaternions: `Q()` (no turn), `qAxis(axis, ang)`, `qMul`, `qRot(q, v)`,
`qNorm`, `qSpin(q, w, dt)` (turned at angular velocity `w` for `dt`),
`qBasis(ex, ey, ez)`, `turnAbout(v, p, d, ang)` (a point turned about the line
through `p` along `d`). `rng(seed)` is its own seeded stream (`r()`,
`r.range(a, b)`, `r.int(n)`), for a pattern that has to come out the same
twice; `hash(i)` 0..1; `ease.in out inOut cubicOut backOut elastic`;
`c01(t)` clamps to 0..1.

**Spaces.** `screen(w, h, o)`, `world(o)`, `space(o)` (your own). See above.

**Light.** One light, up and to the left of the viewer: `light` is
`{ dir, amb, dif, spec, shine }` and can be changed; `shade(n)` 0..1 is how
lit a face turned to `n` is. `path(g, pts)` traces a polygon.

**Textures.**
- `tri(g, img, u0, v0, u1, v1, u2, v2, x0, y0, x1, y1, x2, y2, grow)`: img's
  triangle (u, v in its own pixels) drawn exactly onto the screen triangle.
  `grow` (0.6 px) hides the seams between neighbours.
- `polyTex(g, S, img, pts, { sub, grow })`: a textured polygon in 3D, `pts`
  `[{ x, y, z, u, v }]`, subdivided where perspective needs it (`sub` forces
  it).
- `backUv(u, v, front, back)`: where a front pixel lands on a back picture
  (scaled to the back's size, mirrored left to right so it reads the right
  way round once turned over sideways). Bodies and sheets do this for you.
- `capture(key, src, w)`: the frame as drawn so far (or any canvas), copied:
  `{ img, sx }`, `sx` its pixels per CSS px. Call it from a hook to break
  what is on the screen. `captured(key)` is the last copy.
- `first()`: the first build, live, or its stand-in (640×360).

**Bodies.** `body(o)`: a rigid flat convex shape.

| Field | Default | What |
| --- | --- | --- |
| `shape` | 20 px square | `[{ x, y }]` about its own centre, in its own plane |
| `x y z`, `vx vy vz`, `wx wy wz` | 0 | where, how fast, how fast it turns (rad/s, the room's axes) |
| `q` | `Q()` | how it is turned |
| `thick` | 0 | over 0 it is a slab, with sides (`edgeCol`) |
| `img`, `uv` | | its face: `uv` is each shape point's pixel in `img` |
| `back` | | its back: a picture (same uv, see `backUv`) or a colour string |
| `col`, `backCol`, `edgeCol` | | colours where there is no picture |
| `stroke`, `lw` | | an outline |
| `bounce`, `friction` | 0.35, 0.5 | against planes |
| `drag`, `spinDrag` | 0.12, 0.25 | per second |
| `life`, `fade` | ∞, 0.4 | seconds before it fades, and how long the fade takes |
| `a` | 1 | its alpha |
| `flat` | false | the first build's look: never shaded |
| `shadow` | true | casts one on a floor |
| `glass` | `'crack'` | what it does at the glass: `crack` falls back, `stick` clings and slides down, `bounce` comes off, `pass` goes through to you and is gone, `none` ignores it |
| `onGlass(ev)` | | its own answer to striking the glass (`ev`: `{ body, x, y, power }`), instead of `glass.hit` |
| `data` | | yours |

It also carries `p v q w` (live), `age`, `struck`, `sleeping`, `dead`.
`corners(b, side)` are its corners in space.

**Sims.** `sim({ space, gravity, glass, onGlass, bounds })`:
- `gravity` is a vector (px/s²): `(0, 0, -1600)` in a room; `(0, 1800, 0)`
  down a screen; add `z < 0` to fall back into it.
- `add(body or options)`, `plane(n, d, { bounce, friction })` (keeps
  `dot(n, p) >= d`: the floor, the screen's edges), `floor(z)`, `clear()`.
- `step(dt)` (from the frame clock when left out), `draw(g, { light, alpha,
  shadows, shadowCol })`, `busy()` (anything still moving), `bodies`.
- `glass: false` turns the glass off; `onGlass(ev)` answers every strike;
  `bounds: { x0, y0, x1, y1, pad }` lets go of what leaves it.
- `drawBodies(g, S, list, o)` draws any list of bodies.

**Fracture.** Polygons are `[{ x, y, u?, v? }]`, convex; every cut keeps u, v.
- `rect(x, y, w, h, uvScale)`: a rectangle, with u, v when `uvScale` is given.
- `clip(poly, a, b, c)` (where `a·x + b·y <= c`), `split(poly, x0, y0, x1, y1)`
  → `[left, right]`, `clipTo(poly, convex)`, `area`, `centroid`.
- `voronoi(poly, n, seed, { sites, near, spread })`: rubble. `near` crowds the
  cells round a point.
- `radial(poly, at, { spokes, rings, seed, jag, grow, turn })`: glass, small
  near the point and large far out.
- A shard is `{ pts, c, area }`. `bodiesOf(shards, o)` makes them bodies in
  place with their piece of `o.img`; `o.kick(shard, i)` returns each one's
  `{ vx, vy, vz, wx, wy, wz }` (by default they burst from `o.from` toward the
  eye, scaled by `o.power`); everything else in `o` goes to `body()`.

**Sheets.** `sheet({ x, y, w, h, img, uvScale | uv: { u0, v0, su, sv }, back, z, polys })`:
a flat picture lying on the floor of a space. Every frame:
- `pose()`: flat again, as made. Do this first.
- `split(x0, y0, x1, y1)`, `slice(x0, y0, x1, y1, n, step)`: cut it.
- `fold(x0, y0, x1, y1, ang, { move, side, z })`: fold one side of the line up
  toward the eye and over by `ang` (π lays it flat on the other side). Which
  side: `move`, a point on it, or `side` 1, the line's left looking along it
  as the screen shows it. Folding again folds the stack as it lies.
- `curl(x0, y0, x1, y1, r, { side, roll, n, gap })`: peel the part past the
  line up round a cylinder of radius `r` standing on the line; `roll: true`
  winds all of it up.
- `crumple(k, { seed, folds, cx, cy })`: 0 flat to 1 a wad.
- `move(q, off, pivot)`, `middle()`.
- `draw(g, S, { img, back, col, backCol, flat, edge, lw, alpha, sub })`:
  two-sided, farthest first.
- `bodies(o)`: every piece as it lies now, as a body, to hand to a sim.

**The glass.** `glass` is the screen's own glass, in screen space:
`glass.hit(x, y, power, { life, seed })` (power 0..2) cracks it;
`glass.draw(g, w, h, { frame, col })` draws the cracks (`frame`: a capture,
refracted through the pieces); `glass.clear()`. To draw it your own way, each
of `glass.hits` is `{ x, y, power, t, life }` and `glass.geo(hit)` is
`{ spokes, rings, wedges }` as polylines.

**Scenes.** `scene(key, make, gen)`, `restartOn(key, t)`, `dropScene(key)`,
`keep` (seconds).

**Events.** `feed(who)`, and `emit(kind, data)` for your own.

**Debug.** `OPO_KIT.debug = true` draws wireframes: green fronts, red backs,
yellow sides, blue normals.

**Cost.** A textured triangle is a clip and a draw: a few hundred a frame is
fine on a Chromebook, a few thousand is not. A thin body is one or two
triangles, a sheet one polygon per piece, and subdivision only where a piece
is steep or close. `FXO.parts` off is the cue to throw fewer bodies.

## The bench (`?opo=bench`)

`index.html?opo=bench` opens the art bench instead of the menu: every part of
the kit, played on its own, to try things on before they go in a hook. It is
`onepointoh/bench.js`, loaded only when asked for, and only on this machine's
own server (`npm run dev`, or a `file:` page) or for a dev account (the
`opo-lift` perk), so the address cannot show anyone him early. It never
touches the save.

| Demo | Shows |
| --- | --- |
| 1. DEBRIS AT THE GLASS | chunks thrown at you: they grow, tumble, strike the glass and crack it, then fall back or cling and slide (`sim`, thick `body`, `glass`) |
| 2. THE SCREEN SHATTERS | today's screen captured, broken radially, the pieces thrown, the first build underneath (`capture`, `radial`, `bodiesOf`) |
| 3. FOLD IN ON ITSELF | the screen folded in thirds, folded down, crumpled, let go; its back is the first build (`sheet.fold`, `crumple`, `bodies`) |
| 4. THE OLD RENDER PEELS BACK | the screen rolling up from a corner, the first build underneath (`sheet.curl` with `roll`) |
| 5. PANES FALL INTO THE ROOM | live panes dropped from high over the floor: they tumble, land and settle, shadows sharpening (`body`, floor, shadows) |
| 6. RUBBLE | a panel broken into Voronoi chunks with thickness, popping up off the floor and coming down in a heap (`voronoi`, `bodiesOf`, floor) |
| 7. THE GLASS | strikes crack the glass in spokes and rings that refract what is behind them, and fade (`glass.hit`, `glass.draw`) |
| 8. A PANE TURNS | one textured slab turning steeply, near and far, without swimming (`polyTex` subdivision; W shows its triangles) |

Keys: ← → demo, SPACE again, P pause, `.` one frame, ↑ ↓ speed, W wireframes,
L lit or flat (the old renderer), T the first build live (its frame mounted
behind) or the stand-in, G clear the glass, click to strike, ESC back to the
menu.

## Seeing them

- `npm run test:opo` plays the whole route and calls every hook; it also
  checks the kit (projection, quaternions, exact texture maps, fracture
  covering the picture, folds, curls and rolls, bodies coming to rest, the
  glass, backs, scenes, events), that the kit changes nothing of the run, and
  that the bench opens and plays every demo.
- `?opo=bench` (above) plays every part of the kit.
- In a browser, a dev's own save can jump to any beat from the console:
  `opoJump('coax' | 'door' | 'revert' | 'lock' | 'crack' | 'fight' | 0..4 | 'cascade' | 'out' | 'lift')`.
