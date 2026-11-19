# THE PLANETARIUM, reworked: the plan

Written on `ccr-39239baa-x5kggs`. This file is `.md`, so `.assetsignore`
keeps it off the public site. All names and numbers below are drafts for you
to tune. The art follows the same route as LAST VOW and KHEPRI: placeholder
art behind named hooks first, then the real art drawn in its own folder,
lifted in, and shown on a review board.

## Status (18 Nov)

The logic is built: steps 1 to 6 of the build order. All twelve signs at
all three magnitudes, the twelve shadows, the four trines and the reading
work on every hull and in co-op.

The art is drawn (step 7) and lifted into `index.html` (19 Nov), after your
sign-off on the review board: https://claude.ai/artifact/Rfq4KQU3NgY1zVgMzj5Mpa
- the dome: the zodiac wheel overhead, the plates both sides, every beat
- the tray: the signs held in four element triangles, lit as trines
- the field: every sign at I, II and III, the crowns, every shadow's tell
- the events: every III, the gore, the shell, the sky turning

Shipped in 2.1 (19 Nov), logic and art together, with its CHANGELOG entry.
Music and sound (step 8) are still to come. See **What's built** at the end.

## Your brief

- **18 Nov:** The planetariums are horribly underpowered. Time for a full
  rework. Make them worth it, with new art plans.
- **18 Nov, on the first draft:** Keep replacing the shops. Make the
  upgrades better: better, more powerful effects.
- **18 Nov:** Build the logic for them, but don't draw art yet. And make the
  curses more unique and worse.

## Why it's underpowered today

A planetarium takes a shop's place. A shop sells four cards and two
services, so a reading has to be worth more than a whole shop. Today it's
worth less:

1. **The bet is bad.** There are 6 blessings and 6 curses at even odds, and
   you can't see which until you've taken it. Three of the curses end most
   runs: Taurus (no dash, 45% speed), Cancer (2.2× damage taken while
   moving) and Virgo (1 health for every shot that misses, with no cap).
   The smart play is to walk away, which leaves the room empty.
2. **The blessings are about one card's worth.** Leo's corona is roughly a
   strong Static Field. Scorpio's venom stops at 12 stacks. Aquarius leaves a
   trail that tickles. Only Gemini is in the right weight class.
3. **A reading is one-and-done.** Each sign adds +1 to a counter that
   nothing else ever raises, so nothing grows over a run.
4. **Half the roster gets little.** THE VAGRANT's blade never carries venom
   or solar fire, and it never fires an arrow. For that hull, Scorpio and
   Sagittarius do nothing and Leo does half of what it says. In co-op, only
   the host's pilot ever gets a reading. The guest just watches.
5. **The art doesn't sell it.** It's a dark overlay with two buttons. The
   "constellation" is seven seeded random points (`constellation(seed, 7)`),
   not the sign's stars. The `planetarium` music cue in MUSIC-PLAN has never
   been made.
6. **A bug.** The challenge BAD READING (`ch_stars`) says "a cursed reading,
   taken at the door", but it hands over Scorpio, which is a blessing.

## The shape

1. **The planetarium still replaces shops.** The unlock rule and the 50%
   coin flip in `openReward` stay exactly as they are.
2. **Every sign is now powerful.** A reading at I is worth a whole shop and
   more: one sign does what four or five legendary cards would. At III it
   should win the run if you live.
3. **Every sign is a blessing.** The six old curses become six new
   blessings. Curses survive only as the price of retrograde (point 6).
4. **You choose, face up.** Three signs rise. Each says exactly what it does,
   and you take one.
5. **Signs grow.** Each sign has three magnitudes: **I RISING, II EXALTED,
   III ASCENDANT**. A sign you hold comes back in later readings to grow.
6. **Retrograde, if you want more.** Take a sign retrograde and it arrives
   one magnitude higher. In exchange you carry its **shadow** (a curse)
   until the next boss falls ("until the sky turns").
7. **Signs of one element add up.** Hold all three signs of an element and
   you get its **Grand Trine**.
8. **Every hull, and both pilots.** Each sign has a version for the lance
   and the blade. In co-op, each pilot reads for their own ship.

## The reading

- **Three signs rise.** If you hold a sign below III, one of the three is
  always a sign you hold, offered at its next magnitude. The other two are
  signs you don't hold yet. A sign at III is never offered again.
- **Take one.** Click its plate, or press `1` `2` `3`.
- **Retrograde.** One switch (`R`) turns all three plates to their
  retrograde side. Each then shows the sign one magnitude higher, with its
  shadow written underneath. A sign you don't hold arrives at II, and one you
  hold at I goes straight to III. A sign already offered at III can go no
  higher: it is read as it is, with no shadow. The shadow lasts until the sky
  turns, which is the next reward room (in practice, the next boss). You can
  only carry one shadow at a time.
- **Turn the dome** (`T`). Pay credits to see three other signs. It costs the
  same as the shop's reroll (30, then 25 more each time), and the dome has no
  keeper to anger. Credits you couldn't spend because the shop was replaced
  have a use here.
- **Walk away** (`Esc`). You leave the dome dark and take nothing.

## The twelve signs

The ids stay the same (`aries` … `capricorn`), so the codex in every save
stays valid. "Your damage" means `P.dmg`. Every number that says "your
damage" grows with the build. Where a sign was a blessing before, its
**Today** row shows what it's replacing.

### ARIES, The Ram · fire · Mars
| | |
|---|---|
| Today | The dash gores for 25 + 3.2 × your damage. +1 dash charge, dash cooldown −55%. |
| I | **THE BATTERING RAM.** You can't be hit while dashing, and the dash goes 50% farther. Everything it passes through takes 40 + 5 × your damage, is thrown aside, and is stunned for 1 s. +2 dash charges, and dash cooldown −60%. |
| II | **BLOODED.** A gore kill gives the dash charge straight back, so you can chain through a room without stopping. Every body gored adds 25% to the next gore in the same dash, with no cap. |
| III | **MARS ASCENDANT.** Every dash ends in a blast: 100 + 8 × your damage, out to 170. A gored body is thrown like a missile, and whatever it hits takes the gore too. |
| Shadow | **HEADLONG.** You can't stop. Let go of the keys and you keep charging the way you last went, and a body you run into hurts twice as much. |

The same on every hull. THE VAGRANT's lunge already cuts, and the gore lands
on top of it.

### TAURUS, The Bull · earth · Venus
| | |
|---|---|
| Today | A curse: no dash, 45% speed. |
| I | **THE HOARD.** Credits are strength. Every 100 credits you carry gives +10% damage (no cap) and +1 armour (up to 15). Kills drop twice the credits, and shops charge you 40% less. |
| II | **THE GOLDEN CALF.** Every wave you clear pays 10% interest on what you carry (up to 300). Every shop stocks a fifth card, always a legendary, in place of one of its two services (the counter holds six). For THE VAGRANT it's a piece of gear, rolled a tier up. |
| III | **THE GOLDEN BULL.** A blow that would kill you costs credits instead: 150, scaled like shop prices. It heals you to full and throws a gold shockwave (100 + 10 × your damage, out to 300). This works as often as you can pay. |
| Shadow | **EARTHBOUND.** No dash, half speed, and every six seconds the ground holds you completely still for one. (Today's curse, made worse.) |

This is the answer to losing shops. Credits you couldn't spend become
damage, and the shops that are left get cheaper and better.

### GEMINI, The Twins · air · Mercury
| | |
|---|---|
| Today | A mirrored double fires your base volley (no extra barrels, no Backdraft, no Overcharge). |
| I | **THE TWIN.** A mirrored double stands across the room's centre, and it's a whole second pilot. It fires everything you fire at full damage (every barrel, Backdraft, Overcharge, the lance, the blade's swing), aimed at whatever is nearest it. It can't be hurt. |
| II | **WHAT SURROUNDS YOU.** What surrounds you surrounds it too: Static Field, the corona, the deep and the current. It dashes when you dash, and Shockwave, Cryo Nova, THE WAVE and MARS ASCENDANT's blast go off where it is too. (Drones and sentries stay yours alone.) |
| III | **THE CONSTELLATION.** Two more doubles join, mirrored across each axis, so there are four of you. All four are joined by a ring of lightning that deals 6 × your damage a second to anything touching it. As you move, the ring sweeps the room. |
| Shadow | **THE OTHER ONE.** A hostile double stands across the room's centre from you, and while you fire it fires back at you twice a second, each round 8% of your max health. It holds its fire within 140 px of you, so standing at the centre isn't a death sentence. |

### CANCER, The Crab · water · the Moon
| | |
|---|---|
| Today | A curse: no shields, and 2.2× damage taken while moving. |
| I | **THE SHELL.** +3 shields, regrowing one every 4 s. While you hold a shield you deal 25% more damage. A shield that breaks bursts for 30 + 4 × your damage, out to 180. |
| II | **HIGH TIDE.** A blocked hit is thrown back at whatever fired it, five times as hard. Each wave starts with 2 shields over your maximum. |
| III | **THE CARAPACE.** Once a wave, a blow that would drop you below 25% health shuts the shell instead. You can't be hit for 3 s and you're healed to full, then the shell bursts across the room for 20% of your max health + 10 × your damage. |
| Shadow | **THE MOLT.** No shields and no armour, and while you're moving you take two and a half times the damage. (Today's curse was 2.2× with your shields and armour still on.) |

### LEO, The Lion · fire · the Sun
| | |
|---|---|
| Today | Everything within 170 burns for 6 + 0.45 × your damage, four times a second. Half your rounds light the ground. |
| I | **THE CORONA.** Everything within 220 burns for 1.2 × your damage, four times a second (about 5 × your damage a second), and is set on fire. Every round you fire lights the ground where it lands. |
| II | **MIDDAY.** The corona grows to 300, and bodies inside it take 35% more from everything. Enemy rounds that cross into it slow to half speed and burn away after half a second. |
| III | **SUPERNOVA.** Every 20 kills inside the corona, it goes nova: everything in the room takes 15 × your damage and burns, every enemy round is erased, and the corona is twice its size for 8 s. |
| Shadow | **SUNLESS.** The light goes out: you can only see 240 px around you. |

On the blade, every swing that lands lights the ground. On the lance it
works as today, at the new numbers.

### VIRGO, The Maiden · earth · Mercury
| | |
|---|---|
| Today | A curse: every shot that hits nothing costs 1 health. |
| I | **THE HARVEST.** Your rounds seek (twice as hard as Seeker Rounds). Anything you hit below 20% health is reaped: it dies at once and drops twice its data. A boss is reaped at 5%. |
| II | **THE SHEAF.** Reaping rises to 30% (8% for a boss). Every reap looses a seed: a seeking round at full damage, aimed at the nearest body. |
| III | **PERFECT.** Every hit is a critical, and critical hits do 50% more. |
| Shadow | **EXACTING.** Every shot that hits nothing costs 1 health, with no limit. On the lance, a pulse that touches nothing; on the blade, a swing that finds nothing. (Today's curse, at full strength, on every hull.) |

The lance reaps along the whole beam. On the blade, swings reach 25%
farther instead of seeking. Executioner's Mark (12%, never a boss) still
stacks with this.

### LIBRA, The Scales · air · Venus
| | |
|---|---|
| Today | A curse: 5.5% of the damage you deal comes back to you. |
| I | **THE SCALES.** Every hit you take is repaid five times over, split across everything within 300 of you. 5% of the damage you deal comes back to you as health (up to 4% of your max health a second). |
| II | **EQUILIBRIUM.** At full health you deal 50% more damage. Below half health you take 50% less. |
| III | **JUDGEMENT.** Every 10 s the scales fall on the heaviest thing in the room: a pillar of light for 40 × your damage, and never less than 8% of a boss's max health. |
| Shadow | **THE SCALES.** 8% of the damage you deal comes back to you as harm, straight through shields and armour, up to 15% of your max health a second. (Today's curse was 5.5%.) |

### SCORPIO, The Scorpion · water · Pluto
| | |
|---|---|
| Today | Hits stack venom, up to 12 stacks, each ticking for 1.5 + 0.09 × your damage every half second. |
| I | **VENOM.** Every hit stings. Up to 25 stacks, each ticking for 2 + 0.2 × your damage every half second. A poisoned body that dies sprays its stacks on everything within 150. |
| II | **NEUROTOXIN.** Poisoned bodies take 30% more from everything and attack 40% slower. |
| III | **THE STING.** Every 8th hit on a body sets off its venom: 10 s of ticks land at once, doubled. |
| Shadow | **THE STING TURNS.** Every hit you take adds a stack of venom to you that never wears off, each costing half a health a second. While you carry any, you can't heal at all. |

At 25 stacks with damage 40, one body is losing 500 a second. On the blade,
each swing that lands stings three times. On the lance, each pulse is a
sting (as today).

### SAGITTARIUS, The Archer · fire · Jupiter
| | |
|---|---|
| Today | Rounds never stop at a body. They fly 2.2× as long and 25% faster, and gain up to +110% over 700 px. |
| I | **THE ARROW.** Every round is an arrow: it never stops at a body, flies three times as far and 40% faster, and gains up to +200% over 700 px. Every volley looses two extra arrows in a fan. |
| II | **JUPITER.** Arrows glance off walls twice, each time gaining 50% more. |
| III | **RAIN OF ARROWS.** Every 3 s, 24 arrows fall from the sky around where you're aiming, each at full force. |
| Shadow | **THE ARROW RETURNS.** One round in three that you fire turns at the end of its flight and comes back for you, at 5% of your max health. |

On the lance:
- +250 reach, and the far half of the beam hits +100% (+150% at II).
- At III, the rain falls where the beam ends.
- The shadow: while the beam is out, an arrow flies at you from the room's
  edge every second.

On the blade:
- Every swing that lands looses 3 arrows at the farthest bodies within 900,
  at the swing's full damage.
- The shadow: the same arrow from the edge, every second you swing.

### CAPRICORN, The Goat · earth · Saturn
| | |
|---|---|
| Today | A curse: damage ×0.45, then +20% for every wave you survive. |
| I | **THE CLIMB.** Every wave you clear adds +8% damage (compounding) and +5 max health. It starts as though you'd climbed half the waves you've already cleared, so taking it late pays at once. |
| II | **SATURN.** A boss counts as five waves, and every step of the climb also adds half as much fire rate. |
| III | **THE SUMMIT.** A wave cleared without being hit counts three times, and the climb adds speed too (2% a step). |
| Shadow | **THE LONG CLIMB.** Your damage falls to a third, and climbs back 15% with every wave you clear. |

Taken at wave 15, it's ×1.7 damage straight away. Twenty waves later it's
×4.7 more. This is the scaling pick. A cap is an open question below.

### AQUARIUS, The Water Bearer · air · Uranus
| | |
|---|---|
| Today | A trail of charged water that shocks pursuers for 3 + 0.22 × your damage. +12% speed. |
| I | **THE CURRENT.** You leave charged water wherever you go. Anything in it takes 3 × your damage a second, is 40% slower, and arcs lightning to every other body in the water. You're 20% faster. |
| II | **THE WAVE.** Your dash pours the urn: a wide wave rolls out ahead of you, washing away every enemy round in it and throwing bodies back. |
| III | **THE FLOOD.** Every 10 s the room floods: a wave rolls out from you across the whole room. It erases every enemy round, shocks everything for 12 × your damage, and leaves the floor charged for 4 s. |
| Shadow | **THE RISING TIDE.** Through every wave the water creeps in from the walls, to over a third of the room. Standing in it drains 3% of your max health a second and slows you by 30%. It drains when the wave ends. |

### PISCES, The Fish · water · Neptune
| | |
|---|---|
| Today | A curse: your rounds drag, drift and sink. |
| I | **THE DEEP.** A sphere of deep water goes with you (radius 170). Enemy rounds inside it crawl at 25% speed. Bodies inside it are 40% slower and take 25% more from you. |
| II | **THE DREAM.** An enemy round that spends a second in the sphere changes sides: it turns and flies at the nearest body as yours, at your damage. |
| III | **THE TIDE.** Every 12 s the tide turns: every enemy round in the room turns around and becomes yours, and you can't be hit for 1 s. |
| Shadow | **DEEP WATER.** Your rounds drag, drift and sink (today's curse), and so do you: 30% slower, and your dash goes half as far. On the lance: 90 less reach. |

Today's curse turned outward, onto their shots.

### The shadows, as a whole

Each shadow is its own kind of trouble, and each is worse than any curse
the planetarium had before. Each lasts one sector, and buys a full
magnitude of a sign that's worth a shop on its own:

| Kind | Shadows |
|---|---|
| Takes your movement | HEADLONG, EARTHBOUND, DEEP WATER, THE RISING TIDE |
| Takes your sight | SUNLESS |
| Turns your fire on you | THE OTHER ONE, THE ARROW RETURNS, THE SCALES, EXACTING |
| Takes your defences | THE MOLT, THE STING TURNS |
| Takes your damage | THE LONG CLIMB |

### New words for the six former curses

The six old blessings keep their flavour lines. Virgo's ("She is counting.
She has always been counting.") still fits. The other five get new ones,
and THE KEEPER's notes on all six (`sign_taurus` and the rest) are
rewritten to match:

| Sign | Flavour (draft) |
|---|---|
| Taurus | Venus counts what you kept, and lends you its weight. |
| Cancer | The Moon pulls the tide in around you, and the tide brings a shell. |
| Libra | Every wound you take is written down. The ledger always settles, and never at par. |
| Pisces | Neptune has flooded the room. Only their shots seem to notice. |
| Capricorn | Saturn pays nothing up front. Every step after this one, it pays. |

## Grand Trines

Hold all three signs of one element, at any magnitude, and you get its
trine as well. A shadow is never affected by a trine.

| Element | Signs | Trine |
|---|---|---|
| Fire | Aries, Leo, Sagittarius | **WILDFIRE.** Every kill explodes in fire (50 + 4 × your damage, out to 120), and anything burning takes double damage from you. |
| Earth | Taurus, Virgo, Capricorn | **BEDROCK.** +10 armour and +50% max health, and nothing in the room can slow you, knock you back or root you. |
| Air | Gemini, Libra, Aquarius | **TAILWIND.** 30% faster, 30% more fire rate, and +2 dash charges. |
| Water | Cancer, Scorpio, Pisces | **UNDERTOW.** Half of every hit you take flows back to you over 3 s, and every kill heals 1% of your max health. |

## What it's worth

- **The trade.** A planetarium still costs you a shop: two or three cards
  and the services. One reading has to beat that.
- **The budget.**
  - I: worth a whole shop and more, one sign doing what four or five
    legendary cards would.
  - II: the strongest single thing in your build.
  - III: wins the run if you live. Each III should feel like an
    OVERDRIVE move: a thing the room reacts to.
- **The odds.** You choose from three, all face up and all blessings, with a
  held sign always among them. A planetarium goes from the room you walk out
  of to the room you hope for.
- **Over a run.** Half of five bosses a loop is about two or three readings
  a loop. By the end of the second loop that's about one sign at III and
  two more at I or II, or a Grand Trine with luck and rerolls.

### Ones to watch when it's built

| Sign | The worry |
|---|---|
| Gemini III | Four of you is four times the rounds. Chromebooks need a ceiling on rounds in the air, and the ring may need less damage. |
| Leo II, Aquarius III, Pisces III, Leo III | Each one burns, erases or turns enemy rounds. They leave alone every round from a secret boss (the finales, THE BOOKKEEPER, THE SHOPKEEPER, the ALL HALLOWS bosses) and every round during a rite or a finale, or those fights stop being fights (`zTouchable`). Ordinary bosses' rounds are fair game: open question 5. |
| Capricorn | It compounds. |
| Taurus III | A long run with a big hoard is hard to kill. That's the point, but watch it. |
| Virgo III | Every hit is a critical, so crit damage cards scale it hard. |

## The rest of the game

| Area | Change |
|---|---|
| Co-op | When a planetarium replaces the shop, each pilot reads for their own ship: their own three, their own retrograde, and their own turning paid from the shared credits, as the shop is. New UI acts: `read` (index), `retro` and `domeTurn` join `LS_UI_GUEST`. `planetOut` stays the host's. The host sees `<peer> IS READING` while the guest hasn't read. |
| Lockstep and determinism | The three signs are rolled with `simRand` when the planetarium opens, once per pilot. Every choice goes through `ui()`. |
| Codex (`z`) | The same twelve ids. Each entry shows all three magnitudes and the shadow, and the subtitle shows the element instead of BLESSING / CURSE. Codex completion (THE KEEPER) still needs all twelve signs seen. |
| BAD READING (`ch_stars`) | Fixed to match its own text. Scorpio is taken retrograde at the door (it starts at II), and its shadow, THE STING TURNS, never lifts. |
| Freeplay, GIVE A READING | Raises the next sign by one magnitude, cycling through the twelve. |
| Saves | No migration. The unlock (`planetarium`, `skipStreak`) is unchanged. |
| PvP | No change. It has no reward rooms. |
| Outside pilots | Get the bullet version unless their module says otherwise. |
| Tests | `npm run test:zodiac` (new) and `npm run test:lockstep`; see **What's built**. |

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
Under the effect: `SHADOW · HEADLONG — you cannot stop ..., until the sky
turns`.

**The beats:**
1. **Opening** (1.4 s; any key skips to the end). The room darkens. The
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
you've ascended. The III column is where the art budget goes: these are
meant to look like OVERDRIVE moves.

| Sign | I | II | III |
|---|---|---|---|
| Aries | the dash is a red-orange comet with two curling horn arcs in its wake; a gore is a crescent burst, and stunned bodies wear a spinning star | the refunded charge flashes on the dash pip; each extra gore in a dash adds a ring to the wake | the dash's end craters in a horn-shaped blast; thrown bodies streak fire |
| Taurus | gold coins orbit the hull, one per 100 carried (a second ring past ten) | interest rises off the hull as gold numbers at the wave's end; the shop's legendary card has a gold frame | a paid-off death: the coins blow outward in a gold shockwave, `−150 CR` in gold, and the hull flashes gold |
| Gemini | the lavender twin, now firing your whole volley, with Castor and Pollux as two stars over the pair | your auras and drones bloom around the twin too | four of you, joined by a ring of lightning braided gold and lavender, crackling where it cuts |
| Cancer | three shell plates round the hull; a break throws shards and a burst | a blocked hit flies back as a bright arc; the extra wave shields are pale moon arcs | the carapace snaps shut over the hull, glows for 3 s, then bursts across the room |
| Leo | today's corona, larger and hotter; burning bodies glow | a wider corona with mane-like flame rays; enemy rounds blacken and flake away inside it | the supernova: a flare that whites the room out from the hull, then the corona doubled |
| Virgo | rounds bend toward their targets on silver trails; a reap is a scythe-stroke of light and a burst of data | each reap throws a seed of light at the next body | every round is crit-white with a glint |
| Libra | two small pans hang either side of the hull; a repaid hit is a fan of pink-gold arcs to everything near | the pans tip to show which half you're in | a pillar of white light falls on the heaviest body, with the scales drawn above it |
| Scorpio | today's venom pips, more of them; the death spray is a green splash | poisoned bodies twitch and slow | a scorpion's tail whips over the target and its venom goes off in one green burst |
| Sagittarius | today's arrows, in fans | sparks where an arrow glances off a wall | arrows falling out of the dark around your aim |
| Capricorn | a small summit glyph by the HUD fills step by step; `THE CLIMB +8%` at each wave's end | a boss lights five steps at once | a hitless wave lights three steps in gold |
| Aquarius | charged water wherever you've been, with arcs between the bodies standing in it | the dash's wave: a curling crescent of water | the flood: one wave across the whole room, sweeping rounds off the floor and leaving it crackling |
| Pisces | a sphere of deep water with moving light ripples; slowed rounds leave bubble trails | two fish circle the sphere in opposite directions (the sign itself); a round that changes sides takes your colour | the tide turning: a ripple runs out across the room and every enemy round changes to your colour |

### Shadows and the sky turning

- **A shared look.** A dark disc with a violet corona sits faintly on the
  hull. That's the eclipse.
- **Each shadow's own tell:**
  - HEADLONG: the engine trail stays lit when you let go, and skid sparks
  - EARTHBOUND: the dash pip is cracked, and roots grip the hull while it's held
  - THE OTHER ONE: your double in violet, aiming at you, with a muzzle tell
    before each round
  - THE MOLT: the shell plates are missing, and the hull looks soft
  - SUNLESS: the dark itself, with a ragged rim of light at 240 px
  - EXACTING: a missed shot flashes a violet `−`
  - THE SCALES: harm numbers in pink
  - THE STING TURNS: green pips orbiting your own hull, one per stack, and
    heal numbers struck through
  - THE ARROW RETURNS: a returning round turns violet at the turn, so it can
    be read in a crowd
  - THE LONG CLIMB: a summit glyph that fills back up wave by wave
  - THE RISING TIDE: the water at the walls, with a foam line at its edge
  - DEEP WATER: as today, and bubbles off the hull
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
- **One sound for each III event:** the comet's crater, the golden bull's
  coins, the four-fold ring's hum, the carapace, the supernova, the
  judgement, the sting, the rain, the flood and the tide.

### How the art gets made

1. **Placeholder hooks first,** in the game, with named functions the real
   art replaces:
   - `domeDraw`, `domePlate`, `signTray`
   - `signHullArt` (per sign, on the hull) and `signFx` (events: gore,
     crater, coins, ring, carapace, nova, judgement, sting, rain, flood,
     tide)
   - `shadowHullArt` and `skyTurnsFx`
   - shared helpers: `constellationDraw` and `signGlyph`
2. **The real art** is drawn in `planetarium-art/`, written to be lifted
   into `index.html` as it stands, with a `lift.mjs` that checks before it
   writes, as `ronin-v-art/` and `beetle-art/` do.
3. **A review board** (an artifact page): the dome playing all its beats,
   all twelve plates on both sides, the tray, and each sign's three
   magnitudes on a puppet hull. You sign off there before anything is
   lifted.

## Build order

Steps 1 to 6 are built (18 Nov).

1. **The reading,** with placeholder art: three face-up plates, take, turn,
   leave. Co-op per pilot. The trigger (half the shops) stays as it is.
2. **The twelve at I.** The six old blessings rebuilt at the new strength,
   the six new ones built, and the versions for the lance and the blade.
   This step alone makes the planetarium worth its shop.
3. **Magnitudes II and III,** and the crown.
4. **Retrograde and shadows,** and the sky turning.
5. **Grand Trines.**
6. **The rest:** codex, keeper notes, freeplay, BAD READING, and the tests.
7. **Art:** the board first, then `planetarium-art/` and the lift. Drawn
   (18 Nov) and lifted (19 Nov).
8. **Music and sound.**

## What's built

Everything is in `index.html`, in the block headed **THE PLANETARIUM**
(where the old planetarium was):
- `SIGNS`, the reading (`zRoll`, `openPlanetarium`, `zTake`, `zTurn`,
  `zRetro`, `leavePlanetarium`)
- holding a sign (`zRaise`, `zApply`, `zTrineCheck`)
- shadows (`zShadowOn`, `zShadowOff`, `skyTurns`)
- the per-frame tick (`zTick`)
- the multipliers (`zDmgMul`, `zHurtMul`, `zSpdMul`)
- the placeholder drawing (`drawPlanetarium`, `signTray`, `zDrawWorld`,
  `zDrawDark`)

The rest of the game calls into it from one line each, marked
`THE PLANETARIUM` or by the sign's name:
- `damageEnemy`, `hurtPlayer`, `reviveOrDie`, `killBody`
- the wave line, the dash, the gun, `twinFire`, the lance, the blade
- `updateBullets`, `updateEBullets`, the current hazard
- the shop, `openReward`
- the keys, clicks and UI acts, `lsDrawHint`, the codex, freeplay, and
  BAD READING

Checked:
- **`npm run test:zodiac`** (new, `scripts/zodiac.mjs`), 88 checks, all
  pass:
  - the reading's keys
  - every sign at the magnitude that adds each thing
  - every shadow on its own
  - all four trines
  - every sign at III, and each shadow, played and drawn on the gun, the
    lance, the blade and THE HACKER
  - two plays of the same run matching
- **`npm run test:lockstep`**: every scenario stays in step, snapshots
  included, and both pilots read their own sign. Two changes to the test:
  - its host bot uses the new keys, and waits for the guest to read before
    it leaves the dome
  - `lifecycle` doesn't open the planetarium, for the same reason it gets
    no planted loot: it needs its pilots to go down. Its seed moved from
    206 to 242, because its checks hang on one lucky seed (on main, 207,
    208, 209 and 211 fail too).
- **`npm test`** (determinism): every scenario plays the same drawn and
  undrawn, and the same again from a snapshot. It has a new scenario,
  `zodiac`: every sign held at II, a shadow carried, and the planetariums
  open, with the bot reading the way a player does (retrograde one time in
  three). It has to read at least one sign or it fails.
- Also run, and all pass: `test:khepri` (the twin's lance), `test:tales`,
  `test:ach`, `test:outside` and `test:imago`.

## Open questions

1. **Three face-up signs** (my call), **or one hidden sign** as today? With
   one hidden sign, it would always be a blessing, and every effect above
   still works.
2. **The shadows** are now each their own mechanic and harsher (your call,
   18 Nov). Is one sector the right length, or should the worst of them
   (SUNLESS, THE OTHER ONE, EARTHBOUND) last two?
3. **Gemini III:** four of you, or stop at the ring between two?
4. **Capricorn:** cap the climb (say at ×8), or let it run?
5. **Enemy rounds:** should the effects that burn, erase or turn enemy
   rounds also leave alone ordinary bosses' patterns, not just the
   finales'?
6. **Grand Trines:** keep them, or cut them to keep the system small?
7. **Achievements:** for a first ASCENDANT, a Grand Trine, and all twelve
   read?
8. **Names:** THE DOME on screen, or keep PLANETARIUM everywhere? The
   magnitude names (RISING / EXALTED / ASCENDANT) and every sign's new name
   are yours to change.
