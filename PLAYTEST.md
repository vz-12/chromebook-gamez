# VOIDRUNNER playtest (build 2.1, 20 Nov 2026)

What made the game worse to play, most serious first, with the number behind
each and what might fix it. This file is `.md`, so `.assetsignore` keeps it
off the public site.
The same findings with charts: https://claude.ai/artifact/3HvVp22qiFkKqGvwPsU8xg

Where the numbers come from:

- **212 runs on the real engine** (`npm run playtest`, `scripts/playtest.mjs`):
  a fresh save, the pilot's own hull and damage, no help. VOIDRUNNER at
  normal skill (8 runs) and casual skill (8), EMBER at normal skill (8), and
  a "naive" VOIDRUNNER that shoots whatever is nearest and never circles a
  sentinel (8), each capped at 45 minutes of play; and 180 shorter runs for
  THE WARDEN alone. About 39 hours of play.
- **62 real players**: the public all-time and season leaderboards, one best
  run per name.
- **One first visit in Chromium** at 1366×768, from the intro to the first
  shop, with the bot flying the real page.

The bot sees every shot and reacts within a frame, but it plays slower than
strong players (about 61 s a wave in loop 1, against about 50 s on the
leaderboard), so its wave lengths run a little long. It does not flank an
AEGIS, and it picks cards from a fixed list. THE HACKER, THE VAGRANT, the
fracture, co-op and the event areas were not played: a new player has none
of them.

## 1. Some waves never end

A wave ends only when every enemy is dead, and nothing ever times it out. In
THE HIVE the last enemies are often MENDERs, and a group of them heals faster
than a normal build can hurt them. The run then sits on one wave until the
player quits.

- Of 21 VOIDRUNNER runs that reached THE HIVE, **6 had a wave there still
  going 10 minutes after its last spawn**. 4 never finished: the run hit the
  45-minute cap still on wave 12 or 13, after 27–36 minutes on that wave.
- Shooting menders first, as the codex advises, did not prevent it: the bot
  that does stalled in 2 of 8 runs, the one that shoots the nearest thing in
  4 of 8.
- Still standing each time: 5 to 19 menders, with splitters, brutes and
  spitters among them, packed into a corner.
- EMBER's lance cuts through a whole pack at once, and none of its runs
  stalled there for 10 minutes; one still spent 7½ minutes on a HIVE wave
  against nine menders.

Why: each MENDER heals up to 4 damaged allies within 270 px for **13% of their
max health every 1.15 s**, other menders included, and keeps 380 px from the
player, so they collect in corners. A focused mender is healed by every other
mender in range: with 5 of them about 45% of its health a second. At wave 12
(about 290 HP each) that is roughly 130 HP/s, more than the 96 single-target
DPS the stuck build had. An elite brute in the pack was being healed for
about 700 HP/s.

The same thing, milder:

- **THE VAULT**: 15–25 SENTINELs bunch up with their shields toward you. The
  bot that does not circle them saw 7 of 23 VAULT waves run past 3 minutes;
  circling them in close (the codex's advice) brought that to 0 of 21.
- **Loop 2**: a lone AEGIS or BASTION held a wave for 5–14 minutes against a
  bullet build that could not get behind it.

What might help:

- Menders do not heal other menders, or heal each other at a fraction.
- Cap the healing one enemy can receive per second (say 15% of its health),
  however many menders are near.
- An overtime for every wave: after about 45 s with nothing left to spawn,
  the stragglers stop healing, take more damage and come to the player, as
  PvP's OVERTIME closes a round.

## 2. The first boss stops a quarter of players

The first four waves teach almost nothing about dodging, then THE WARDEN
arrives with a 16–24-shot ring, aimed spreads, a spiral and a 900 px/s charge.

- On the leaderboard, **16 of 62 players' best runs end on wave 5**, the boss
  wave, and 22 of 62 (35%) end on wave 5 or earlier.
- Waves 1–4 take about 108 s and cost a median **12%** of the hull; 6 of 24
  runs took no damage at all. THE WARDEN's wave costs a median **36%**.
- In 180 shorter runs aimed at it, no run died before wave 5 and 14 died at
  THE WARDEN. A casual VOIDRUNNER lost a median **86%** of the hull in that
  one wave (EMBER 65%), against 7% across the four before it. Even the bot at
  its best lost 31%.
- 44% of THE WARDEN's damage is its bullet patterns, 40% its charge and body,
  16% its escorts.
- The bot sees every shot, so it dies here far less than people do: 1 run in
  13, where on the leaderboard 1 player in 4 has never got past it.
- It is the first time the game shows a pattern to read. Before it, spitters
  fire small volleys and lancers lunge one at a time.
- FIRST FLIGHT softens it and calls out each attack ("It is winding up a
  charge. Dash sideways, now."), but only on the first run. A save that has
  been past wave 5 never sees the callouts again.

What might help:

- Show a small version of each WARDEN attack in waves 3–4: an elite spitter
  that fires a ring, a lancer pack with the same wind-up tell as the charge.
- Keep the attack callouts for the first few WARDEN fights of every save.
- Hold back the charge until phase 2 on a player's first few attempts.

## 3. Loop 2 starts with a wall

Enemy health grows about 20× across the first 25 waves, then multiplies by
`1 + 150 × loop` when the loop turns over (`loopHpMul`). Wave 25 to wave 26
is a **7.6× jump in enemy health in one wave**, at the point where the build
has stopped growing.

| Waves | Median length |
| --- | --- |
| THE VOID (21–24) | 50–68 s |
| 26 | 158 s |
| 27 | 139 s |
| 28–29 | about 220 s |
| 30, THE WARDEN again | 384 s |

- 15 of the 18 runs that reached loop 2 had a wave last longer than 3
  minutes.
- The second WARDEN took VOIDRUNNER 1–6½ minutes and EMBER 6–6½; in one EMBER
  run it was still standing after 9½.
- Boss health rises 25× from wave 25 to wave 30.
- Then it falls back. The next loop's step is smaller than the growth within
  a loop, so wave 51 has a tenth of wave 50's enemy health, and nothing is as
  hard as wave 50 again until wave 66.

What might help: ramp the loop multiplier in over the loop's first sector
(×3, ×6, ×12… reaching the full step by wave 30), or make the loop step equal
the growth across a loop, so wave 26 carries on from wave 25 and wave 51 does
not fall back.

## 4. Waves get longer while bosses get shorter

By the middle of the first loop an ordinary wave is a long fight and the boss
is a short one. From THE HIVE on, the boss is the easiest part of its sector.

| Sector | Ordinary wave | Boss | Boss lived | Hull after |
| --- | --- | --- | --- | --- |
| THE GRID | 20–30 s | THE WARDEN | 70 s | 82% |
| THE FOUNDRY | 43–62 s | FORGEHEART | 62 s | 97% |
| THE HIVE | 56–64 s | BROODMOTHER | 35 s | 100% |
| THE VAULT | 66–92 s | ARCHIVIST | 35 s | 100% |
| THE VOID | 50–68 s | NULLCORE | 51 s | 100% |

Medians over the VOIDRUNNER and EMBER runs (24). "Boss lived" is spawn to death; "hull
after" is the pilot's health when it fell.

Waves grow in two ways at once: each enemy's health, and how many come (24
at wave 4, 114 at wave 19). A boss only gets the first.

What might help: scale a boss's health or phases with the wave budget too,
so it stays the longest fight of its sector; trim THE VAULT's budget, whose
waves are the longest of the loop without being the hardest.

## 5. Most of a wave is spent finding the last few

- Over 422 ordinary waves (9.1 hours), **68%** of the time came after the
  wave's last enemy had spawned, **20%** with three or fewer left, and **14%**
  with no enemy on screen at all.
- The ones left over keep their distance on purpose: spitters hold 300–390 px
  off, menders 380–500 px, artillery 470–640 px, so the last few are usually
  at or past the edge of the screen.
- The HUD has no count of what is left, and only a boss gets an arrow at the
  screen's edge.

What might help: "N LEFT" under the wave number once nothing is left to
spawn; edge arrows for the last three or four, like the boss's; after a few
seconds of tail, the kiting types stop keeping their distance.

## 6. Two minutes and five screens before the first enemy

A first visit in Chromium:

1. **The intro, 114 s.** It plays on every new tab, not once per player:
   whether it has played is kept in sessionStorage (`voidrunner_intro_v1`).
   Skipping is Escape held for a second, and "HOLD ESC TO SKIP" only appears,
   small, after some other key has been pressed. On a school Chromebook a new
   tab is the normal way in.
2. **A name**, then **the menu**: ten buttons down the side for someone who
   has played nothing.
3. **FIRST FLIGHT's question**, then a **10-step HUD tour**.
4. **The effects panel**, titled "NEW EFFECTS ADDED". A new save has never
   seen any (`gfxSeen` is unset), so it opens at the start of the very first
   run and tells a new player that effects are new.
5. Wave 1, where a first-flight hint, "A FORGOTTEN TALE · THE GRID, PAGE I"
   and the HUD share the bottom of the screen while one enemy walks in.

What might help: play the intro once per browser (localStorage), with "HOLD
ESC TO SKIP" visible from the first frame; treat a new save as having seen
the current effects; show the side menu's modes once a first run is on the
record.

## 7. The opening and the long middle are quiet

- **Wave 1** lasts 20 s and has no enemy on screen for 47% of it: they arrive
  one every 1.45 s from just outside the view and walk in at 96 px/s. Wave 2
  is still 29% empty.
- **Cards thin out**: one every 33 s in the first five minutes, every 42 s to
  minute 15, every 77 s to minute 30 and every 175 s after. Through loop 2 a
  run goes about 3 minutes at a time with no decision to make.

What might help: open waves 1–2 with a small group already in view and halve
their trickle; in loop 2, deal a card on wave clears as well as on levels.

## 8. Some deaths are never explained

- Artillery shells did **17%** of all damage taken, second only to
  spitters. Blasts (bombers, volatile chains) and the floor (vents, lasers,
  acid) add a few percent more.
- All three call `hurtPlayer` with no source, so `P.hitBy` is blank and the run
  report leaves out its "DOWNED BY" line. Of the 10 deaths in the long runs,
  3 were to a shell, and none of those reports named a killer.
- A few enemy shots also arrive with no source (about 1% of damage).

What might help: pass `{ src }` from `updateMortars` (the artillery that
fired), `explode` (what blew up) and `updateHazards` (a name for the vent,
laser or acid).

## Running it again

```sh
npm run playtest -- --pilots runner,ember --seeds 8 --skill 0.5,0.75 --cap 2700
node scripts/playtest.mjs --naive --seeds 8 --json runs.json
```
