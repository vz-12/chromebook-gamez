# FORGOTTEN TALES: the codex's art hooks

Every visual piece of the new codex is drawn by one of these hooks. The art
was drawn over them on 6 Oct 2026 (the block's own header, "THE LOOK", says how
it reads). Add `?hooks=1` to the address to tag each piece with its hook's
name: the first piece each hook draws in a frame carries it in a small yellow
tag.

All the hooks are in one block of `index.html`, from
`FORGOTTEN TALES — art hooks` down to `end of FORGOTTEN TALES art hooks`, as
entries of the `TALES_ART` object. Replace the block whole, or any one entry.

- **Drawing only.** Each hook draws in screen space and changes nothing.
- **Sandboxed.** `TA(name, ...)` calls the hook inside `ctx.save()` /
  `ctx.restore()`, so a hook can leave the canvas however it likes.
- **Fails alone.** A hook that throws loses only its own piece, not the codex.
  `npm run test:tales` draws every hook and fails if one throws or is never
  drawn.
- **Its own caches.** A top-level `let` or a cache that starts empty (`new
  Map()`, `[]`) must be listed in `SNAP_LOCAL` / `SNAP_LOCAL_OBJS` (RUN
  SNAPSHOTS in `index.html`), or the run snapshots try to carry it. The art's
  are: `taWorn`, `_taMix`, `_taBack`.
- **Your call on text.** The layout around the hooks (`codex UI` in
  `index.html`) draws the names, the plate's figures and the tale text itself.
  A hook may draw its own text instead, where it is handed it (`page.head`,
  `page.torn`, `line.tale`...).

## The frame

| Hook | Handed | What it is |
| --- | --- | --- |
| `frame.back` | `(worn)` | The codex's backdrop, whole screen and opaque. `worn` is the annotated copy, after the Bookkeeper hands the record back (the stains today are `codexWear()`). |
| `frame.title` | `(x, y, worn)` | CODEX at the top, and his strike-through and "annotated" once worn. |
| `rail.back` | `(x, y, w, h, worn)` | Behind the section rail. |
| `rail.item` | `(r, tab, s)` | One section on the rail. `r` is its rect; `tab` is `{ id, label, tales }`; `s` is `{ on, open, hot, tally, worn, narrow }`. `tally` is `{ met, total, pages, of, unread }`, and is null while the section is locked (show `? ? ? ?`). |
| `rail.seal` | `(x, y, size, tab, open)` | A section's seal, drawn by `rail.item` at the left of its button. One per section id: `e x p s n u m b z g`. |
| `grid.head` | `(x, y, w, text, worn)` | The section's header line over its grid. |

## The cards

| Hook | Handed | What it is |
| --- | --- | --- |
| `card.back` | `(r, col, s)` | A card. `s` is `{ sel, hot, seen, worn, item }`. Item cards (upgrades and the like) are shorter and have no portrait. |
| `card.pips` | `(cx, y, w, states)` | A card's pages, one per page. See *Page states* below. |
| `card.unread` | `(x, y)` | A card with pages not yet read. |
| `card.tick` | `(x, y)` | His tick on an entry he wrote about (annotated copy only). |
| `item.glyph` | `(kind, x, y, size, col, seen)` | An item's emblem on its plate in the book. `kind` is `u m b z g`. |

## The portraits

Enemies, bosses, and the three people who fight as bosses (THE BOOKKEEPER,
THE SHOPKEEPER, THE FOUNDER) already draw their real fight drawing
(`drawCodexIcon` / `CODEX_ART`). These hooks are for everything that has no
drawing of its own yet. All take `(x, y, size, en, seen)`: `en` is the tale
entry (`en.key`, `en.ref`, `en.n`, `en.col`, and `en.stage` for a sector, with
its own colours); `seen` is false for a silhouette.

| Hook | For |
| --- | --- |
| `portrait.pilot` | the four hulls (`en.ref`: `runner ember hacker melee`) |
| `portrait.awake` | SUPERUSER, OVERDRIVE, RONIN (`en.ref` is the pilot's id) |
| `portrait.sector` | the ten sectors (`en.ref`: `grid foundry hive vault void archive mirror leak recursion halt`) |
| `portrait.room` | the rooms between (`library hub stands rootroom patch`) |
| `portrait.person` | THE DEV, THE OUTSIDER, THE LOST SOUL (`dev outsider soul`) |

## The book

| Hook | Handed | What it is |
| --- | --- | --- |
| `book.back` | `(worn)` | Over the grid while a book is open. |
| `book.cover` | `(x, y, w, h, col, worn)` | The book: boards and spine, behind both pages. `col` is the entry's colour. |
| `book.page` | `(r, side, worn)` | One page's paper; `side` is `'left'` or `'right'`. |
| `book.plate` | `(r, col, worn)` | The inset on the left page that the live portrait is drawn into, clipped to `r`. |
| `book.pip` | `(r, roman, state, current, hot)` | A page's pip on the plate page. A click on it turns to that page. |
| `ink.note` | `(x, y, w, note)` | His marginalia at the foot of the plate page, in his ink. Draws the text too. |
| `page.head` | `(cx, y, w, text, voice)` | A page's header, e.g. `PAGE II · THE MAKER'S NOTE`. |
| `page.number` | `(cx, y, roman)` | The Roman number at a page's foot. |
| `page.more` | `(x, y, w, frac)` | A page that runs on past its foot (only at small sizes): there is more below. `frac` is how far down it is scrolled. |
| `page.blank` | `(r, roman)` | A page that is open but has no words yet (FORGOTTEN TALES step 5 fills these). |
| `page.torn` | `(r, roman, how, progress)` | A page not yet earned: torn out, with what opens it (`how`, e.g. "fell fifty of them") and, for a count, `progress` ("31 / 50"). |
| `page.sealed` | `(r, roman)` | A chapter of the story not yet open. It is sealed, never torn, and says nothing of what opens it. |
| `page.held` | `(r, roman, why)` | A page waiting on a deed that is not built yet, e.g. VOIDRUNNER's rite. |
| `book.turn` | `(r, dir, enabled, hot)` | The page-turn arrows; `dir` is -1 or 1. |
| `book.close` | `(r, hot)` | Shut the book. |

## The mid-run line

| Hook | Handed | What it is |
| --- | --- | --- |
| `line.tale` | `(cx, y, text, alpha)` | The one line low on the screen when a page opens in a run: `A FORGOTTEN TALE · THE WARDEN, PAGE II`. Shown for 3.6 s, fading in and out; the run never stops for it. |

## Page states and voices

- **Page states:**
  - `open`: read.
  - `new`: open, and not yet turned to.
  - `torn`: a deed away.
  - `held`: waiting on a deed that is not built yet.
  - `sealed`: a chapter not yet open.
  - `none`: the entry itself has not been met.
- **Voices** (the `voice` handed to `page.head`):
  - `0`: THE RECORD (the Bookkeeper).
  - `1`: THE MAKER'S NOTE (the dev).
  - `2`: THE TALE (the thing itself).
  - `3`: a sealed page, once its chapter opens.
- **Faces.** Each voice's typeface and ink are `TALE_FACE` in the `codex UI`
  block. That is text, not a hook, but change it freely.

## Seeing every hook at once

On a local server, open `/?beta=1&hooks=1`. That build unlocks everything,
every page included, and has the Bookkeeper's annotations. Then open the codex
(X at the menu).
