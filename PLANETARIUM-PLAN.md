# THE PLANETARIUM, reworked: the plan

Written on `ccr-39239baa-x5kggs`. This file is `.md`, so `.assetsignore`
keeps it off the public site. All names and numbers below are drafts for you
to tune. The art follows the same route as LAST VOW and KHEPRI: placeholder
art behind named hooks first, then the real art drawn in its own folder,
lifted in, and shown on a review board.

## Status (18 Nov)

This is a plan only. Nothing is built.

## Your brief (18 Nov)

- The planetariums are horribly underpowered. Time for a full rework.
- Make them worth it.
- New art plans.

## Why it's underpowered today

The reading itself isn't the main problem. Gemini roughly doubles your fire,
and Leo's corona is a strong aura. The room around the reading is a trap.

1. **The unlock is a permanent tax.** You unlock it by leaving two shops in a
   row without spending. After that, a coin flip in `openReward` replaces
   **half of all shops, in every run, forever**, and there's no way to turn
   it off. A shop sells four cards and two services. A planetarium sells one
   coin flip.
2. **The coin flip is a bad bet.** There are 6 blessings and 6 curses at even
   odds, and you can't see which until you've taken it. Three of the curses
   end most runs: Taurus (no dash, 45% speed), Cancer (2.2× damage taken
   while moving) and Virgo (1 health for every shot that misses, with no cap).
   The smart play is to walk away, which turns half your reward rooms into
   empty rooms.
3. **A reading is one-and-done.** Each sign adds +1 to a counter that nothing
   else ever raises. Seeing the same sign again is a 1-in-12 roll that is
   then a coin flip, so nothing grows over a run.
4. **Half the roster gets little.** THE VAGRANT's blade never carries venom or
   solar fire, and it never fires an arrow. For that hull, Scorpio and
   Sagittarius do nothing and Leo does half of what it says. In co-op, only
   the host's pilot ever gets a reading (`lsDrawHint`: "IS CHOOSING"). The
   guest just watches.
5. **It ignores your build.** No sign works with another sign or with the
   cards.
6. **The art doesn't sell it.** It's a dark overlay with two buttons. The
   "constellation" is seven seeded random points (`constellation(seed, 7)`),
   not the sign's stars. There's no room, no ceremony, and the `planetarium`
   music cue in MUSIC-PLAN has never been made.
7. **A bug.** The challenge BAD READING (`ch_stars`) says "a cursed reading,
   taken at the door", but it hands over Scorpio, which is a blessing.

## The shape

1. **The shop is never taken away.** After a boss the shop opens as it always
   did. **Leave it without spending a credit, and the dome opens next.**
   That's the old unlock rule, and now it's the ongoing rule too. Your
   credits stay with you for the next shop.
2. **You choose, face up.** Three signs rise. Each says exactly what it does,
   and you take one.
3. **Every sign is a blessing.** All twelve. The six old curses become six
   new blessings.
4. **Signs grow.** Each sign has three magnitudes: **I RISING, II EXALTED,
   III ASCENDANT**. A sign you hold comes back in later readings to grow.
   III changes how you play.
5. **Risk is opt-in, and it pays.** Take a sign **retrograde** and it arrives
   one magnitude higher. In exchange you carry its **shadow** (a curse)
   until the next boss falls ("until the sky turns").
6. **Signs of one element add up.** Hold all three signs of an element and
   you get its **Grand Trine**.
7. **Every hull, and both pilots.** Each sign has a version for the lance and
   the blade. In co-op, each pilot reads for their own ship.

## How a dome opens

| When | What happens |
|---|---|
| Not unlocked yet | As today. Leave two shops in a row untouched (no buy, no reroll) and **THE PLANETARIUMS OPEN**. The dome then opens right away, so finding the secret pays at once. |
| Unlocked, shop left untouched | The dome opens after the shop. When you leave the dome, the run goes on (`afterReward`) as it does after a shop. |
| Unlocked, anything spent (a buy or a reroll) | No dome this time. |
| A sheet that shuts the shop (`chalNoShop`) | It shuts the dome too (today's rule). |
| The shopkeeper takes the till | You rerolled, so that counts as spending: no dome. |

So once it's unlocked, every boss is a real choice: **the shop's stock, or
one sign plus your credits kept.**

**The sky window.** Tonight's three signs are rolled when the shop opens and
shown in a small round window in the shop. You can see what the dome is
offering before you choose. The leave button says what will happen:
`LEAVE  ✦  THE DOME OPENS`. Buy anything and the window clouds over. My call:
an informed choice is what makes the dome worth picking. Keeping it a
surprise is an open question below.

Leaving a shop where you couldn't afford anything also counts, so early in a
run you'll see the dome often. My call: let it. The early run is where a
build is weakest.

## The reading

- **Three signs rise.** If you hold a sign below III, one of the three is
  always a sign you hold, offered at its next magnitude. The other two are
  signs you don't hold yet. A sign at III is never offered again.
- **Take one.** Click its plate, or press `1` `2` `3`.
- **Retrograde.** One switch (`R`) turns all three plates to their
  retrograde side. Each then shows the sign one magnitude higher, with its
  shadow written underneath. A sign you don't hold arrives at II. A sign you
  hold at II goes to III. The shadow lasts until the next boss falls, and the
  HUD shows how many waves are left. You can only carry one shadow at a time,
  because there's only one dome per boss.
- **Turn the dome** (`T`). Pay credits to see three other signs. It costs the
  same as the shop's reroll (30, then 25 more each time), and the dome has no
  keeper to anger. The credits you kept by skipping the shop finally have a
  use here.
- **Walk away** (`Esc`). You leave the dome dark and take nothing.

## The twelve signs

The ids stay the same (`aries` … `capricorn`), so the codex in every save
stays valid. "Your damage" means `P.dmg`.

### ARIES, The Ram · fire · Mars
| | |
|---|---|
| I | **THE CHARGE.** Your dash gores everything it touches for 30 + 3.5 × your damage and throws it aside. +1 dash charge, and dash cooldown −50%. (Today's, a little stronger.) |
| II | A kill by goring gives the dash charge straight back. Every gore takes 0.3 s off the cooldown. |
| III | **MARS ASCENDANT.** A gored body is thrown like a missile, and whatever it hits takes the gore too. You can't be hit for the whole dash. |
| Shadow | **BARE.** You take 30% more damage (`P.frailty`). |

Every hull works the same way. THE VAGRANT's lunge already cuts, and the
gore lands on top of it.

### TAURUS, The Bull · earth · Venus
| | |
|---|---|
| I | **THE HOARD.** Every 100 credits you carry gives +5% damage and 2% less damage taken, up to 1,000 credits (+50%, −20%). |
| II | Kills drop 30% more credits, and every wave you clear pays 5% interest on what you carry (100 at most). |
| III | **THE GOLDEN BULL.** A blow that would kill you is paid in credits instead: 200, scaled like shop prices. You're left at 30% health and can't be hit for 1 s. This works as often as you can pay. |
| Shadow | **EARTHBOUND.** No dash, and you're 35% slower. (Today's curse, kept to one sector.) |

Taurus and the dome feed each other on purpose. The dome only opens for a
pilot who didn't spend, and Taurus turns money you didn't spend into power.
That's the "astrologer's run".

### GEMINI, The Twins · air · Mercury
| | |
|---|---|
| I | **THE TWIN.** A mirrored double stands across the room's centre and fires whenever you do, at whatever is nearest to it. (Today's, unchanged.) |
| II | It fires everything you fire (Twin Link's barrels, Backdraft, Overcharge's slug). It also dashes when you dash, so Shockwave, Cryo Nova and a gore go off where it lands too. |
| III | **THE CORD.** A line of light joins you and the twin through the centre of the room. Anything that crosses it takes 10 + 0.5 × your damage every 0.2 s. |
| Shadow | **EXPOSED.** The twin can be hit by rounds and by bodies, and whatever hits it hurts you. |

EMBER's twin holds its own lance (today's). THE VAGRANT's twin swings a
mirrored copy of every swing. Retrograde Gemini arrives at II, so there's
always a twin to be hit.

### CANCER, The Crab · water · the Moon
| | |
|---|---|
| I | **THE SHELL.** +1 shield, shields regrow in 5 s instead of 9, and a shield that breaks throws out 10 rounds at 70% damage. |
| II | **HIGH TIDE.** +1 more shield, and every wave starts with your shields full plus one extra for that wave. |
| III | **THE CARAPACE.** When your last shield breaks, the shell shuts: you can't be hit for 1.5 s, then it bursts out to 220 for 40% of your max health + 4 × your damage. At most once every 12 s. |
| Shadow | **THE MOLT.** No shields, and you take 60% more damage while moving fast. (Today's curse was 2.2×. It's softened and kept to one sector.) |

### LEO, The Lion · fire · the Sun
| | |
|---|---|
| I | **THE CORONA.** Everything within 170 burns for 6 + 0.45 × your damage, four times a second, and your rounds set the ground alight. (Today's.) |
| II | The corona grows to 230, and anything inside it takes 20% more from everything you do. A kill inside it flares into a small blast. |
| III | **THE SUN KING.** Kills inside the corona feed it. At 25 it goes nova: everything on screen takes 60 + 6 × your damage and burns, and the corona is twice its size for 6 s. |
| Shadow | **THE SPOTLIGHT.** Every body comes straight for you, 25% faster. |

On the blade, half the swings that land light the ground. On the lance it
works as today.

### VIRGO, The Maiden · earth · Mercury
| | |
|---|---|
| I | **THE COUNT.** Each hit in a row adds +4% damage, up to +60% at 15 in a row. A shot that hits nothing starts the count again. |
| II | A miss only halves the count, and at 15 your crit chance is +25%. |
| III | **PERFECT.** At 15 in a row, every hit is a critical. |
| Shadow | **EXACTING.** Every shot that hits nothing costs 0.5 health, up to 3 a second. (Today's curse was 1 per miss with no cap.) |

On the lance, the count goes up once per pulse, and a pulse that touches
nothing counts as the miss. On the blade, each swing is one shot.

### LIBRA, The Scales · air · Venus
| | |
|---|---|
| I | **THE SCALES, TURNED.** 2% of all the damage you deal comes back to you as health, up to 2% of your max health a second. |
| II | What the scales pay while you're already full is kept as shields: one for every 40, up to 2. |
| III | **EQUILIBRIUM.** At full health you deal 35% more damage. Below half health, the scales pay three times as much. |
| Shadow | **THE SCALES.** 5% of the damage you deal comes back as harm, up to 8% of your max health every half second. (Today's curse.) |

Today's curse turned into its mirror image.

### SCORPIO, The Scorpion · water · Pluto
| | |
|---|---|
| I | **VENOM.** Every hit stings: up to 12 stacks, each ticking for 1.5 + 0.09 × your damage every half second. (Today's.) |
| II | Up to 18 stacks. A poisoned body that dies passes its stacks to the two nearest bodies. |
| III | **THE STING.** A body that reaches full stacks is stung: it loses 20% of its max health at once (3% for a boss), and the stacks start again. |
| Shadow | **NO ANTIDOTE.** You can't heal at all: no regeneration, lifesteal or pickups. |

On the blade, each swing that lands stings twice. On the lance, it adds a
stack per pulse (today's).

### SAGITTARIUS, The Archer · fire · Jupiter
| | |
|---|---|
| I | **THE ARROW.** Rounds never stop at a body. They fly 2.2× as long and 25% faster, and gain up to +110% damage over 700 px. (Today's.) |
| II | Arrows glance off a wall once without losing force, and gain up to +180%. |
| III | **THE FAR STAR.** An arrow that has flown 900 px becomes a star: where it hits, it bursts for its full damage. |
| Shadow | **NO QUARTER.** Rounds that have flown less than 220 px do half damage. |

On the lance: +130 reach per magnitude (today's I), and the far third of
the beam hits +40% / +70% / +100%. At III the tip bursts on every pulse.
The shadow halves the near third.
On the blade: every swing that lands looses an arrow at the farthest body
within 900, for 60% of the swing. The shadow makes swings do 25% less.

### CAPRICORN, The Goat · earth · Saturn
| | |
|---|---|
| I | **THE CLIMB.** Every wave you clear from now on adds +4% damage (compounding) and +2 max health. |
| II | +6% a wave, and a boss counts as three waves. |
| III | **THE SUMMIT.** A wave cleared without being hit counts three times. |
| Shadow | **THE SUMMIT IS FAR.** 40% less damage. |

This is the scaling pick, and it compounds: 30 waves at 6% is ×5.7.
Today's curse grew 20% a wave, so this is gentler, but a cap is an open
question below.

### AQUARIUS, The Water Bearer · air · Uranus
| | |
|---|---|
| I | **THE CURRENT.** You leave charged water behind you that shocks whatever follows (about twice today's damage), and you're 12% faster. |
| II | Bodies in the water are 30% slower, and each one arcs to the nearest other body in the water. |
| III | **THE FLOOD.** Every 12 s you pour out the urn: a wave rolls out across the room. It washes away every enemy round it touches and shocks every body for 40 + 3 × your damage. |
| Shadow | **ADRIFT.** Your hull slides, keeping most of its speed after you let go. |

### PISCES, The Fish · water · Neptune
| | |
|---|---|
| I | **THE DEEP.** A sphere of deep water goes with you (radius 110). Enemy rounds inside it slow to 45% speed. |
| II | The sphere grows to 160, and bodies inside it are 25% slower. |
| III | **THE TIDE TURNS.** Every 15 s the tide turns: every enemy round inside the sphere turns around and becomes yours, at your damage. |
| Shadow | **DEEP WATER.** Your rounds drag, drift and sink. (Today's curse.) On the lance: 90 less reach. On the blade: swings are 20% slower. |

Today's curse turned outward, onto their shots.

### New words for the six former curses

The six old blessings keep their flavour lines. Virgo's ("She is counting.
She has always been counting.") still fits. The other five former curses
get new ones, and THE KEEPER's notes on them (`sign_taurus` and the rest)
are rewritten to match:

| Sign | Flavour (draft) |
|---|---|
| Taurus | Venus counts what you kept, and lends you its weight. |
| Cancer | The Moon pulls the tide in around you, and the tide brings a shell. |
| Libra | Every wound you deal is written down, and tonight the ledger pays you. |
| Pisces | Neptune has flooded the room. Only their shots seem to notice. |
| Capricorn | Saturn pays nothing up front. Every step after this one, it pays. |

## Grand Trines

Hold all three signs of one element, at any magnitude, and you get its
trine as well. A shadow is never affected by a trine.

| Element | Signs | Trine |
|---|---|---|
| Fire | Aries, Leo, Sagittarius | **WILDFIRE.** Everything you kill bursts into flame, and fire you light lasts twice as long. |
| Earth | Taurus, Virgo, Capricorn | **BEDROCK.** +6 armour, and nothing in the room can slow you or knock you back. |
| Air | Gemini, Libra, Aquarius | **TAILWIND.** 20% faster, +1 dash charge, and your rounds fly 30% faster. |
| Water | Cancer, Scorpio, Pisces | **UNDERTOW.** A third of every hit you take flows back to you over 4 s. |

## What it's worth

- **The trade.** A shop visit usually buys two or three cards. A dome gives
  one sign or one magnitude, and you keep the credits for the next shop
  (which has only four cards and rerolls that cost more each time, so
  saved credits are worth a bit less later).
- **The budget.** At I, a sign is about two legendary cards in its niche.
  At II it's about four. III should change how you play, not just add
  numbers.
- **Over a run.** A player who skips every shop gets five domes per loop.
  By the end of the first loop that's one sign at III and two at I, or a
  Grand Trine with luck and rerolls. That should be about as strong as a
  run that shopped every time, in a different shape. Most runs will mix the
  two, which is the point.
- **The ones to watch:** Gemini (the twin already doubles your fire, and II
  adds the rest of your build), Capricorn (compounding), and Taurus III in a
  long run.

## The rest of the game

| Area | Change |
|---|---|
| Co-op | Each pilot reads for their own ship: their own three, their own retrograde, and their own turning paid from the shared credits, as the shop is. The dome reads only for pilots who left the shop untouched (tracked per pilot, not with the one global `shopTouched`). A pilot it doesn't read for sees `THE STARS READ FOR <peer>`. The host leaves when both are done. New UI acts: `read` (index, retro) and `domeTurn` join `LS_UI_GUEST`. `domeOut` stays the host's. |
| Lockstep and determinism | Tonight's signs are rolled with `simRand` when the shop opens, once per pilot. Every choice goes through `ui()`. |
| Codex (`z`) | The same twelve ids. Each entry shows all three magnitudes and the shadow, and the subtitle shows the element instead of BLESSING / CURSE. Codex completion (THE KEEPER) still needs all twelve signs seen. |
| BAD READING (`ch_stars`) | Fixed to match its own text. Scorpio is taken retrograde at the door (it starts at II), and its shadow, NO ANTIDOTE, never lifts. |
| Freeplay, GIVE A READING | Raises the next sign by one magnitude, cycling through the twelve. |
| Saves | No migration. `planetarium` and `skipStreak` mean what they did. `skipStreak` now only matters before the unlock. |
| PvP | No change. It has no reward rooms. |
| Outside pilots | Get the bullet version unless their module says otherwise. |
| Tests | `scripts/determinism.mjs`, `lockstep.mjs` (its forced `openPlanetarium()` at step 1500 opens the new dome, and the guest must take a reading of its own there too), `onepointoh.mjs` and `testconsole.js`. |

Where the code changes, by name: `openReward` (the coin flip goes),
`closeShop` / `noteShopExit` (decide the dome), `SIGNS` (twelve signs, each
with an element, a star, three magnitudes and a shadow), `acceptSign`,
`drawPlanetarium`, `planetButtons`, the `planet` key and click handlers,
`UI_ACTS`, the zodiac fields on `P`, the zodiac block in the update, the
codex `z` tab, the keeper notes, freeplay, `ch_stars` and `lsDrawHint`.

## The art plan

### Direction

- **The game's own language.** Thin neon strokes and additive glows on a
  dark ground, the way the rest of VOIDRUNNER is drawn. It's an
  observatory inside the void, not brass and wood.
- **Two colours carry the meaning.** Gold is a blessing (`#fbbf24`, as
  today). Violet is a shadow (`#a855f7`, as today).
- **Each element has an accent:** fire amber `#fb923c`, earth jade `#34d399`,
  air silver `#cbd5e1`, water sea blue `#38bdf8`. The accent only marks
  which element a sign belongs to. Each sign's effects keep their own
  colours (venom stays lime, the twin stays lavender).
- **Real skies.** Each constellation is drawn from its real stars: positions
  from the Yale Bright Star Catalogue (public domain), projected and
  normalised per constellation, and baked into a small table. They use the
  usual stick figures, star sizes by brightness, and star colours by the
  real star (Antares red, Aldebaran orange, Regulus and Spica blue-white).
  The seeded squiggle goes.
- **Drawn glyphs.** The twelve glyphs (♈ to ♓) are drawn as canvas paths,
  never typed as text. ChromeOS turns those characters into emoji, and some
  fonts don't have them at all.

| Sign | Its star | What the figure looks like |
|---|---|---|
| Aries | Hamal (orange) | a short bent line of four stars: the horn |
| Taurus | Aldebaran (orange-red) | the V of the Hyades and two long horns, with the Pleiades as a tiny cluster on the shoulder |
| Gemini | Castor (white), Pollux (orange) | two stick figures side by side, joined at the heads |
| Cancer | Acubens, and the Beehive | a faint upside-down Y around a soft cluster. It's the faintest, so the Beehive glows to keep it from looking empty. |
| Leo | Regulus (blue-white) | the Sickle (a backward question mark) and the triangle of the hindquarters |
| Virgo | Spica (blue-white) | a long, sprawling Y |
| Libra | Zubenelgenubi, Zubeneschamali | the beam and the two pans |
| Scorpio | Antares (red) | the long hooked tail ending in the sting (Shaula). The easiest to recognise. |
| Sagittarius | Kaus Australis | the Teapot |
| Capricorn | Deneb Algedi | a wide, shallow boat |
| Aquarius | Sadalsuud | the water jar and the stream pouring from it |
| Pisces | Alrescha (the knot) | two long cords joined at the knot, with the Circlet at one end |

### The dome (the reading screen)

**Layout.** The dome's ceiling is a huge zodiac wheel arcing across the top
of the screen. Its centre sits above the screen, so you're looking up into
it. The twelve constellations sit around its rim, and it turns slowly (about
one turn every four minutes). Under it stand three tall plates. On narrow
screens and touch, the plates stack the way the level-up cards do.

**A plate, top to bottom:**
- the constellation, drawn whole
- the glyph and the NAME, and under them the title (*The Ram*) and the
  element badge
- three magnitude pips, lit to show where the sign will be once taken
- the magnitude's name and what it does, in full. For a sign you hold, it
  says what changes.
- the flavour line, small, at the bottom

**The retrograde side.** The plate flips on its vertical axis to violet. The
glyph gets a retrograde tail. The extra magnitude pip is lit in violet.
Under the effect: `SHADOW · BARE — you take 30% more damage, until the sky
turns`.

**The beats:**
1. **Opening** (1.4 s; any key skips to the end). The shop darkens. The
   wheel's ring draws itself, and the twelve constellations light one after
   another around it. Three come loose and drift down into the plates, and
   the plates' text writes in.
2. **Idle.** The wheel turns and the stars twinkle. The plate under the
   cursor lifts, and its constellation joins up line by line.
3. **Retrograde switch.** The wheel slows, stops and turns backward. All
   three plates flip.
4. **Turning the dome.** The wheel spins a third of a turn, and three new
   signs come down.
5. **Taking.** The chosen constellation folds into its glyph and flies to
   the HUD tray, and its pip lights with a chime. The other two sink back
   into the wheel, the dome closes like an iris, and you're back in the
   room with today's gold ring burst on the hull.
6. **Footer.** It now reads `1 2 3 take · R retrograde · T turn the dome
   (30) · ESC leave it dark`, under a new last line in place of "never both,
   never neither". Draft: *the stars give freely; read them backwards and
   they ask for something back.*

### The sky window (in the shop)

A round window, about 64 px, in a top corner of the shop:

| State | What it shows |
|---|---|
| Not unlocked, no untouched shop yet | A dark porthole you'd barely notice. |
| Not unlocked, one untouched shop | One star shows through. That's the hint at the secret. |
| Unlocked | Tonight's three glyphs over a dark sky. Hover or tap for their names and magnitudes. |
| Something bought | Cloud rolls across the window and the glyphs dim. The leave button loses its star. |

### The tray (HUD)

- **Each sign you hold** is a small medallion: its glyph inside a ring of
  three pips.
- **A shadow** is a violet eclipse over its medallion, with the waves left
  counting down.
- **A completed trine** joins its three medallions with a thin triangle in
  the element's colour.
- **The pause screen** lists every sign with its full text.
- **Placement** is decided on the board, near the level bar.

### On the field

Every ASCENDANT sign also gets a **crown**: its constellation, small and
faint, circling the hull. A co-op partner can see from across the room what
you've ascended.

| Sign | I | II | III |
|---|---|---|---|
| Aries | the dash leaves a red-orange wake of two curling horn arcs; a gore is a crescent burst | the refunded charge flashes on the dash pip | thrown bodies trail fire, and an impact is a horn-shaped crack |
| Taurus | gold coins orbit the hull, one per 100 carried (up to ten) | interest rises off the hull as gold numbers at the wave's end | a paid-off death: the coins blow outward, `−200 CR` in gold, and the hull flashes gold |
| Gemini | today's lavender twin, with Castor and Pollux as two stars over the pair | the twin's own effects, in lavender | the cord, a braided gold-and-lavender line through the centre, crackling where it cuts |
| Cancer | shell plates round the hull, one per shield; a break throws shards | the high-tide shield is a pale moon arc | the carapace snaps shut over the hull, then bursts |
| Leo | today's corona (kept) | a wider corona with mane-like flame rays | the nova: a flare that whites the room out from the hull, then the corona doubled |
| Virgo | a ring of fifteen silver grain marks fills round the hull as the count climbs | a miss drains half the ring | at fifteen, rounds turn white-silver with a crit glint |
| Libra | two small pans hang either side of the hull, and the health they pay rises as gold motes | overflow shields are drawn as a level beam | the pans tip to show which mode you're in |
| Scorpio | today's venom pips (kept) | passed stacks jump as a green arc from the dead to the next | a scorpion's tail whips over the target and it bursts green |
| Sagittarius | today's arrows (kept) | sparks where an arrow glances off a wall | a star-tipped arrow, and a star-shaped burst |
| Capricorn | a small summit glyph by the HUD fills step by step; `THE CLIMB +4%` at each wave's end | a boss lights three steps | a hitless wave lights three steps in gold |
| Aquarius | today's charged water, brighter | arcs between bodies standing in it | the flood: a curling crescent of water with foam, sweeping rounds off the floor |
| Pisces | a sphere of deep water with moving light ripples; slowed rounds leave bubble trails | two fish circle the sphere in opposite directions (the sign itself) | the tide turning: a ripple runs out and every round in the sphere changes to your colour |

### Shadows and the sky turning

- **A shared look.** A dark disc with a violet corona sits faintly on the
  hull. That's the eclipse.
- **Each shadow's own tell:**
  - EXPOSED: the twin gets a violet hit ring
  - THE SPOTLIGHT: a cone of light falls on you from above
  - EARTHBOUND: the dash pip is cracked
  - THE SCALES: harm numbers in pink
  - EXACTING: a misplaced shot flashes a violet `−`
  - NO ANTIDOTE: heal numbers struck through
  - ADRIFT: skid marks
  - THE MOLT: the shell plates are missing
  - DEEP WATER: as today
- **When the next boss falls:** the disc slides off the hull, the light
  comes back, and the banner reads **THE SKY TURNS**.

### The codex

The `z` tab becomes a star atlas: the twelve constellations around a wheel,
with the signs you've seen lit and the rest dark. An entry shows its
constellation large, all three magnitudes, the shadow, the element, and
THE KEEPER's note.

### Sound and music

- **The `planetarium` cue** in MUSIC-PLAN (celestial pads and a slow
  arpeggio, 72 BPM, B♭ lydian, taking its room from *3-06 void*) has never
  been made. The rework is the time to make it.
- **Stings:**
  - the magnitudes: one bell for I, a fifth for II, and a B♭ lydian triad
    for III
  - retrograde: the same chime, reversed
  - the sky turning: a low gong, then a rising shimmer
- **One sound for each III event:** the nova, the flood, the carapace, the
  golden bull's coins, the cord's hum, and the tide turning.

### How the art gets made

1. **Placeholder hooks first,** in the game, with named functions the real
   art replaces:
   - `domeDraw`, `domePlate`, `skyWindow`, `signTray`
   - `signHullArt` (per sign, on the hull) and `signFx` (events: gore,
     nova, sting, flood, tide, carapace, golden bull, cord)
   - `shadowHullArt` and `skyTurnsFx`
   - shared helpers: `constellationDraw` and `signGlyph`
2. **The real art** is drawn in `planetarium-art/`, written to be lifted
   into `index.html` as it stands, with a `lift.mjs` that checks before it
   writes, as `ronin-v-art/` and `beetle-art/` do.
3. **A review board** (an artifact page): the dome playing all its beats,
   all twelve plates on both sides, the sky window's four states, the tray,
   and each sign's three magnitudes on a puppet hull. You sign off there
   before anything is lifted.

## Build order

1. **The trigger.** The coin flip goes. The dome opens after an untouched
   shop. Add the sky window and the leave button's text. This step alone
   removes the tax.
2. **The reading,** with placeholder art: three face-up plates, take, turn,
   leave. Co-op per pilot.
3. **The twelve at I.** The six old blessings retuned, the six new ones
   built, and the versions for the lance and the blade.
4. **Magnitudes II and III,** and the crown.
5. **Retrograde and shadows,** and the sky turning.
6. **Grand Trines.**
7. **The rest:** codex, keeper notes, freeplay, BAD READING, and the tests.
8. **Art:** the board first, then `planetarium-art/` and the lift.
9. **Music and sound.**

Steps 1 to 3 already make the dome worth it. Everything after that is depth
and spectacle.

## Open questions

1. **Should spenders ever see a dome?** My call: no, so the rule stays
   readable ("spend nothing, the stars read"). The other way: a 25% chance
   even after spending.
2. **Is a dome after every untouched shop too often?** The other way: one
   untouched shop gives a 50% chance, and two in a row make it certain.
3. **The sky window:** show tonight's three (an informed choice, my call),
   or keep them hidden until the dome (more mystery, less choice)?
4. **Capricorn:** cap the climb (say at ×6), or let it run?
5. **Grand Trines:** keep them, or cut them to keep the system small?
6. **Achievements:** for a first ASCENDANT, a Grand Trine, and all twelve
   read?
7. **Names:** THE DOME on screen, or keep PLANETARIUM everywhere? The
   magnitude names (RISING / EXALTED / ASCENDANT) and every sign's new name
   are yours to change.
