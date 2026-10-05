# RONIN's V — the plan

Branch: `ronin-v`. Nothing here reaches `main` (and so voidrunner.online)
until you say ship. This file is `.md`, so `.assetsignore` keeps it off the
public site. All art is placeholder, behind named hooks, as with Z, X and C.

## Status (4 Oct)

All five steps are built on `ronin-v`, with placeholder art, and every test
suite passes. Nothing is shipped. The numbers below are drafts for you to
tune, and the questions at the end are still open.

## Your brief (4 Oct)

- **Who he is.** RONIN is an undead samurai who left his master to chase a
  goal of his own. Someone important to him died along the way, and he now
  guards that person's grave.
- **What V is.** His last resort: he gives everything he has to protect the
  grave. It becomes available when his health is low, and lets him unleash
  his full power.
- **How it plays.** It builds on his existing moves and makes him far
  stronger: he abandons all restraint.
- **Synergies.** In this form, all the moves combine into new ones.
- **The grave marker.** It's the reason he can be far stronger than the
  other evolutions. It doesn't buff him. If enemies break it, the form ends
  early and RONIN is weaker for a full minute.
- **The final technique.** SKY CLEAR, the secret full sequence of CLEAR SKY
  (X): a full sequence of attacks. Where CLEAR SKY and its family are water
  and wind (peace), these are violent destruction.
- **Who he is to play.** The strongest character, and the hardest to play.

## The shape

**LAST VOW** (working name: the name is yours).

1. **Press V** while RONIN is on and your health is **30% or less**. It can
   be used once per RONIN. The V key stays dark until you're low enough.
2. **The cut-in (1.6 s).** He drives the grave marker into the floor where
   he stands. The room is held while it plays, as RONIN's intro holds it,
   and none of it is spent from any clock.
3. **The vow (20 s).** Restraint is gone (below), and every move has new
   versions. RONIN's own minute is held while the vow lasts.
4. **The end.** When the vow runs out, he spends what's left on **SKY CLEAR**.
   Pressing V again after the vow's first 3 s spends it early. Then the
   grave sinks and RONIN ends: he has given everything.
5. **If the grave breaks first:** the vow ends at once, with no SKY CLEAR.
   RONIN ends, and for **60 s** he deals half damage and takes 25% more.

### The grave

- **It is a thing in the room**, with health: 1.5× his max health.
- **The room goes for it.** A body goes for the grave instead of him when
  the grave is nearer (the grave counts as a quarter nearer than it is).
  Bosses keep fighting him, but their rounds can still hit the grave.
- **What hurts it:**
  - a body touching it (each body at most once every 0.8 s);
  - any enemy round that crosses it;
  - a shell that lands on it.
- **It gives nothing.** No buff for standing near it. Guarding it is the
  skill: the vow is only as long as the grave stands.
- During SKY CLEAR it can't be hit.

### Undead

From the press to the end of SKY CLEAR he can't drop below 1 health. The
dead don't die twice: the grave is the only way the vow is lost. (My call,
from the lore. Say if you'd rather he could still die.)

### No restraint (for the whole vow)

| | During the vow |
|---|---|
| Damage | everything he deals ×1.5 |
| Cooldowns | a quarter as long |
| Chains | up to 5 moves instead of 3 |
| Parry counters and swings | every hit wounds |

## The vow's moves (all names mine, rename freely)

In the vow every move is a new one, and what it becomes depends on the move
before it in the chain, the way CLEAR SKY's variations already work. As
always, nothing tells you the next key; only a landed move's name shows. A
key the vow has no version for falls back to the ordinary move.

**Z, LUNAR CLEAVE becomes:**
- **SUNDER** (Z): three strokes instead of two, longer, and the floor stays
  torn for 6 s. Anything crossing the tear is cut, not just wounded.
- **SHATTER** (Z after Z): the new cross and the last one both blow apart.
- **FAULT LINE** (Z after X): the path you just ran tears open again, cutting
  everything on it, and the cross lands as well.
- **AFTERSHOCK** (Z after C): a huge cross centred on you, with a blast at
  its heart.

**X, CLEAR SKY becomes:**
- **THUNDERCLAP** (X): farther, twice as wide, splits the instant you land,
  hits twice as hard, and wounds.
- **CHAIN LIGHTNING** (X after X): both paths split together, and the cut
  leaps from body to body.
- **THE SKY FALLS** (X after X X): the triangle closes, and everything inside
  it is crushed.
- **METEOR** (X after Z): to the cross, which craters.
- **ECLIPSE** (X after Z X): a ring round the cross, wider and harder than
  FULL MOON.
- **STARFALL** (X after X Z): every wounded body in the room is struck.
- **TECTONIC** (X after Z Z): cross to cross, and the ground between them
  splits.
- **RUPTURE** (X after C): every wounded body near where you land bursts.

**C, STILL WATER becomes:**
- **WRATH** (C): executes at 30% instead of 15%. The stance keeps catching
  blows while it lasts, up to 3.
- **QUAKE** (C after Z): the catch also sets off your last cross: everything
  on it takes half the counter.
- **EYE OF THE STORM** (C after X): the counter also hits everything within
  320 px of you.
- **NO MERCY** (C after C): executes at 50%.

## SKY CLEAR, the final technique

The secret full sequence of CLEAR SKY. It takes about 4 s, and he can't be
touched while it plays.
1. **THE SKY BREAKS:** he rises, and the sky tears open.
2. **STORM:** eight dashes, each to the next body, and every path splits the
   instant he lands. Each split is 3 swings, wounds, and leaps to the
   bodies beside it.
3. **THE FALL:** he comes down at the grave, and the whole web of paths
   splits again at once, ×2.
4. **CLEAR:** one cut through the whole room, 6 swings to everything. Bodies
   left at 30% or less die; bosses take the cut but aren't executed (C stays
   the move that executes bosses).

**Its price (your nerf, 4 Oct):** if SKY CLEAR cuts something but kills
nothing, from the first dash to the last cut, he's left at 1 health as it
ends. A kill, or an empty room, costs nothing.

## PvP

V is refused in a duel ("NOT IN A DUEL"). A duel has no bodies to go for the
grave, the undead rule would let a pilot dodge losing a round, and the
cut-in would freeze the other player. It needs its own rules before it goes
in; that's your call.

## Steps

Each step is a commit on `ronin-v`, tested before the next one starts.

1. **The vow's frame.**
   - What it covers: V lighting at low health, the cut-in, the grave and
     everything that can hit it, breaking it and the weak minute, undead,
     RONIN held and then ended.
   - Also: the V key's look on the HUD, placeholder art hooks, and admin
     buttons in the local dev panel (VOW, SPEND VOW, GRAVE 10%, BREAK GRAVE).
2. **No restraint:** damage, cooldowns, chains of 5, wounding hits.
3. **The vow's moves:** the 16 versions above.
4. **SKY CLEAR.**
5. **Tests:**
   - the determinism and lockstep suites press V, so the whole vow is
     checked for staying in step. The determinism run fails if THE VAGRANT
     never takes the vow, never plays SKY CLEAR, or never breaks a grave;
   - in-game runs through the test harness;
   - PvP refuses V.

## Draft numbers (all in one block in the code, all tunable)

| | |
|---|---|
| V lights at | 30% health or less |
| Cut-in | 1.6 s, the room held |
| Vow | 20 s; V again after 3 s spends it early |
| Grave | 1.5× max health; a body hits it at most every 0.8 s |
| Broken | 60 s: half damage dealt, 25% more taken |
| No restraint | ×1.5 damage, cooldowns ×0.25, chains of 5 |
| SKY CLEAR | 8 dashes at 3 swings, the web at ×2, the last cut at 6 swings, executes at 30% |

## Questions for you (defaults are in, so nothing waits on these)

1. **Names:** the vow's name (LAST VOW is a stand-in) and the 16 moves.
2. **Health:** is 30% the right line for V to light?
3. **Undead** during the vow: keep it?
4. **RONIN ends after the vow**, whether SKY CLEAR lands or the grave breaks:
   keep it?
5. **V again** to spend SKY CLEAR early: keep it?
6. **Bosses:** in the vow, WRATH and NO MERCY execute bosses at 30% and 50%
   too. Too much?
7. **PvP:** leave V out of duels for now?
8. **Weaker for a minute:** is half damage dealt and 25% more taken right?
