# ONE POINT OH — the plan (VOIDRUNNER's evolution)

A path to VOIDRUNNER's evolution. It is drawn from how THE AMALGAM, ROOT and
THE FOUNDER were built, from your BOSS DRAFTS (9 Sep), which settle who ONE
POINT OH is, from your direction of 10 Oct, which sets his route (a lock into
the first build, and a break out of it), and from the FORGOTTEN TALES lore
bible (5 Oct). Where they disagree, your words win. It is a draft: the lore calls
and the names are yours. Defaults are in, so no
step waits on an answer. Nothing here reaches `main` (and so
voidrunner.online) until you say ship. This file is `.md`, so `.assetsignore`
keeps it off the public site. All art is placeholder, behind named hooks, as
with RONIN and SERAPHIM.

## Where it stands (10 Oct)

VOIDRUNNER is the only one of the four pilots with no evolution.

- `RITES.runner` (`index.html:40857`) names its boss, `onepointoh`, and has
  no `start`. Everything that asks about awakenings goes through `RITES`
  (`riteBuilt`, `index.html:40872`), so today:
  - its statue in the hub is veiled. The Outsider says "I cannot wake what
    nobody has written yet."
  - its pilot tale's page III is held: "its rite, ONE POINT OH, is not built
    yet" (`index.html:32028`).
  - `unlock-evo` skips it.
- **ONE POINT OH does not exist in any form.** There is no `BOSSES` entry, no
  body, no lines, no route and no codex card.

So "VOIDRUNNER's evo" is three things, the same three the other pilots got:
**the boss** (met on the route), **the rite** (that boss fought the other way,
at the hub's statue) and **the awakened form** (the kit it opens).

## What the other three did

| | EMBER | THE HACKER | THE VAGRANT |
| --- | --- | --- | --- |
| Finale | THE AMALGAM | ROOT | THE FOUNDER |
| The pairing (`RITES`) | burnout answering burnout | two cheaters, and the better one wins | the one with nowhere, against the one who built somewhere for everyone |
| Met on the route | after THE UNWRITTEN, the dev asks for harder. You cannot die: the decimal point moves | under THE FRACTURE, past the nodes. Open only while it types | arrive at THE AMALGAM holding ROOT's key. The tribunal is won on nerve, not build |
| The rite's one verb | the lance cuts his beams, and behind the crossing is shadow | the console: `ls`, `hack`, `ps`, `kill`. Only what you took hurts it | only a perfect parry's counter reaches him |
| Five sequences | IT SWEEPS · IT OPENS · IT SPLITS · ALL OF IT AT ONCE · IS THAT ALL | IT WRITES A GUARD · IT RUNS THINGS · IT EDITS YOUR CONSOLE · IT TAKES THEM BACK · rm -rf | HE SHOWS YOU · HE FEINTS · THE FLOOR ANSWERS · HE STOPS HOLDING BACK · THE DUEL |
| Sequence 5, the cutscene played | the clash: a beam contest, the vent on [F] | a typing race it ties line for line, until `sudo su` | a duel at pace, dead even, until the hull wakes |
| Awakening | OVERDRIVE | SUPERUSER | RONIN |
| The card's line | the default, "the cinematic is the win condition playing out" | "the better cheater wins" | "a vagrant does not sit" |

**The rules all three keep.** Read off the code. ONE POINT OH should keep
every one of them.

1. **The pairing.** The boss's flaw is the pilot's own, pointed somewhere
   useful (the `RITES` header, `index.html:40821`; the bible's "The finales").
2. **The route boss comes first, and the rite reuses it.** EMBER's rite is
   `startAmalgam()` under `amalRite`. ROOT's spawns ROOT and calls
   `startRootFrom(e)` (`index.html:7332`). THE FOUNDER's drives him with the
   tribunal's own `halPose` and `HAL_MOVES` (`index.html:16304`, `16070`). The
   rite is "the finale fought the other way", and the changelog promises it:
   "Beat your pilot's own finale again in its rite."
3. **The build does not decide it.**
   - Health is kept in the rite's own units: `RR_HP` and `VR_HP` are 1000,
     and THE AMALGAM's rite pool is sized from its one damage source.
   - The pilot's one verb hurts the boss, and everything else the hull owns is
     refused (`damageEnemy`, `index.html:4898-4900`).
   - EMBER's is the exception: a build is worth about twice the pace there,
     and never decides the duel.
4. **Five sequences on health.**
   - Each `until` is a share of health: 0.8 / 0.6 / 0.4 / 0.2 / 0.
   - Each has a name in capitals, shown as a banner.
   - They escalate by stacking new beats on old ones, not swapping them.
   - A sequence cannot end before it has shown what it is (`VR_SEQ_MIN`).
   - Between sequences there is a breath (`RITE_HAND`, `VR_SEAM`).
5. **Sequence 5 is the cutscene, played.**
   - It is dead even until the hull wakes in the middle of it.
     `grantAwakening` fires on that frame, not at the card (`rrRaceWake`
     `index.html:7992`, `vrDuelWake` `index.html:18208`).
   - Then the pilot overpowers the boss, and it falls.
   - Then comes the AWAKENING card (`rsCardOn`, `index.html:43428`), and the
     menu.
6. **Opened the same way** (`rrOpen` `index.html:7562`, `vrOpen`
   `index.html:17614`):
   - a flag is set for the whole rite;
   - the room is cleared and the arena taken to duel size;
   - the hull starts at range, with the boss upfield, spawned at `RITE_WAVE`
     depth (`rrSpawn`, `index.html:7553`);
   - an entrance of 2.6–2.8 s plays.
   `resetGame` clears every flag (`index.html:37309`).
7. **One table entry is the whole switch.** `RITES[id]` with `boss`, `n`,
   `start`, `seqs` and `jump` lights the statue, the door and the admin
   panel's jumps, and lets `unlock-evo` wake the pilot.
8. **The art is placeholder behind named hooks.** Each hook has a "WHAT THEY
   ARE HANDED" header, and the art is replaced as a drop-in block ("THE
   VAGRANT'S RITE — art hooks", `index.html:18427`; `ronin-v-art/`).
9. **The awakened kit is one passive, one transformation and four actives**
   (the SUPERUSER header, `index.html:9346`):
   - the transformation has a meter, a key, about a minute, and a cut-in;
   - the actives are on Z X C V and answer only while transformed;
   - they combo, and V is the last resort;
   - none of the kit runs in the rite.
10. **The run is data.** Randomness uses `simRand`, input comes through
    `P.in`, there are no closures, and delays are named (`simAfter`). The
    determinism and lockstep suites play it all.

**What each cost** (rough line counts in `index.html`, art included):

| Part | Size |
| --- | --- |
| Each rite's logic | 700–900 lines, plus its art hooks |
| Each route finale | from about 850 (THE AMALGAM) to about 2,700 (THE FOUNDER: the door, the camp and the tribunal) |
| Each awakened kit | about 5,000 lines with its art |

## Who ONE POINT OH is (your drafts, 9 Sep; your direction, 10 Oct)

**A person.** Every finale is a person, not a metaphor, and all of them care
too much. ONE POINT OH is the fandom that wants the game frozen. He loves it
sincerely, and that is the trap: he is not hostile but loyal, and he will
strangle the game to keep it exactly as it was the day he arrived. He is
SOLVED's counterweight.

- **Voice:** aggrieved, fond, unmovable. "This was better." "You changed it.
  Nobody asked you to change it." "Put it back."
- **Counterplay:** "It is RIGHT that the base ship can win. It is WRONG that
  it is better. Proving both at once is the fight."
- **Later:** he fights beside you in THE NEXT THING ("Someone has to stay and
  remember it.").

**His 1.0 is the first commit on `main`.** The community can only pull from
what there is a record of, so the version he wants back is the first upload
after the dev took over. That is `3af8b6d` (7 Aug 2026), which moved to the
repo root unchanged in `7941a2d`. It is 3,799 lines; today's game is 75,309.
- VOIDRUNNER is the only ship.
- Five sectors, THE GRID to THE VOID, with five bosses, fifteen enemy types,
  52 upgrades and the shop. All 52 upgrades still exist today, by the same
  ids.
- The menu, a name entry and a top-five board.
- No doors: a sector ends and the next one simply comes.
- No dash, codex, co-op, accounts or settings.
- After a death, SPACE goes straight back into a run. The menu is only seen
  when the page loads.

**How the lore bible fits.** The bible reads the devs' first game as THE GRID,
THE WARDEN and VOIDRUNNER. Nobody has a record of that one, so it can't be
pulled back; the first upload can. VOIDRUNNER's ghost, "nothing needs adding
to it", is his creed pointed somewhere useful, so the pairing holds.

**The one thing to reconcile.** He quotes the record, so he knows there is an
outside, and the bible lets only the dev and ROOT know. My default was that he
came in from outside too: a player who arrived on the first upload and never
left, as the dev arrived when the game was shutting down.

**Settled 16 Oct:** he is the one who stayed. He played the old game in its
first days, he was the only player who did not leave when it was shut down,
and in the dark he remembered VOIDRUNNER back into its base form. 7 Aug is
the day it came back on, exactly as he had kept it. The whole story is in
`ONE-POINT-OH-RITE-PLAN.md`.

## The route (your direction, 10 Oct)

| Beat | What happens | Built like |
| --- | --- | --- |
| 1. The coaxing | a voice in the portal rooms, telling you how good it was when it was simple | the Founder's tear: visits counted on the profile |
| 2. The old door | a third gate, into the first build | the library's door after a boss |
| 3. The lock | your game is the first build until he falls | new |
| 4. The crack | you turn your back on the loop and break the room's edge | the tribunal: the refusal is something you do, not a button |
| 5. Face to face | the first build shatters, and he is standing in it | THE AMALGAM opening onto the Founder |
| 6. The fight | the version war | new |
| 7. Out | the record restores, and the lock lifts | AFTER ROOT handing the room back |

### 1. The coaxing

- It starts once THE FRACTURE is open, every finale's gate, and only in
  ordinary solo runs. Never in dailies, challenges, the rush, freeplay, ALL
  HALLOWS, co-op, or a run committed at a statue.
- It speaks in the portal room, the moment the game makes you choose. The
  first build had no doors at all.
- One line per portal room, counted on the profile (`opoCoax`, as
  `campVisits` counts the tear's visits), so it picks up where it left off
  across runs.
- The voice is unseen and unnamed. It is set in the first build's type, with
  no glow: the first time the old renderer shows up inside today's.
- Its lines (stand-ins), each one true of the first build:
  1. "There were no doors. The next room just came."
  2. "There was one ship. Everyone flew it."
  3. "Five rooms, then round again. You always knew what was next."
  4. "Nobody needed a book to know what anything was."
  5. "It can be like that again."

### 2. The old door

- In the next portal room, a third gate stands apart from the other two:
  sector 01 as it was, drawn flat in the first build's colours, with nothing
  lit on it. "Just go in. You will see."
- Walking in is the choice. As with the Founder's door, there is no button
  that says yes. It sits away from the two gates and arms slowly, so nobody
  walks into the lock by accident.
- Walk past it and it comes back in about half the portal rooms (the
  library's odds). The voice keeps on: "Still here." "It is not far."

### 3. The lock

- Walking in sets `opoLock` on the profile. It syncs with the account, so it
  follows the player to every device and holds across reloads.
- **The way in is your draft's revert, all at once** (about 8 s). The game
  comes apart newest first, and he quotes each piece as it goes: "'FORGOTTEN
  TALES.'" "'PvP.'" "'RONIN.'" … "'EMBER.'" "'THE FRACTURE.'" It is the
  record (below), read backwards, ending on the first build's menu.
- **The first build's menu**, and nothing else:
  - VOIDRUNNER, SPACE to play, N for a name, and the top five;
  - no ACCOUNT, PVP, CODEX, SETTINGS, CHALLENGES, DAILY or hub;
  - none of today's overlays: ads, INSTALL, the LIVE strip, the tales' line.
- **The loop to reject:** SPACE plays, and after a death SPACE plays again.
  The first build never sends you back to its menu.
- **The real save is never touched while locked.** The first build keeps its
  own save. Seasons and podiums carry on, since the server keeps them.

**How the copy runs** (the code side):
- **The first build's script, byte for byte**, with ONE POINT OH's own
  script around it, as `scripts/pvp-build.mjs` makes PvP's play page from the
  game.
  - The game's Worker has no build step, so a script makes the page once from
    git (`git show 3af8b6d:game/index.html`) and it is committed.
  - A test checks that the copy's script still matches `3af8b6d` byte for
    byte.
- **The game hosts it in a frame of its own** and can draw its canvas as a
  texture. That is what lets the first build appear inside today's: the old
  door, the shatter's panes, the old side of the front.
- **Three seals.** As committed, it would do harm:
  1. It uses today's save key (`voidrunner_save_v1`), and its merge keeps
     about nine fields, so a sync could strip a modern save. The seal gives
     it a key of its own.
  2. It posts runs to `/api/leaderboard`, today's Worker. The seal stops the
     post, and its top five shows the lock's own runs.
  3. It loads Fireproof from esm.sh. The seal turns that off.
- **The hooks.** Its functions are global declarations, so the wrapper can
  hook the few it needs (`drawArena`, the bullet step, `gameOver`) without
  changing a line of it.
- **A way out for real trouble.** If the copy fails to load, the lock lifts
  rather than leaving a blank page. Dev accounts can lift a lock by hand.

### 4. The crack (breaking out)

- In the lock, every run has a crack in the edge of the room. The first
  build's world is a box with a stroked wall (`drawArena`), and nothing has
  ever been outside it. Today's game is pressing in through it: light leaks
  from it, and now and then a sound from the game it was.
- **Rejecting the loop is turning your back on the room and firing into the
  wall.** Rounds that reach the crack widen it.
- **The room answers:**
  - the voice, the first time it forbids anything: "Leave that." "It is fine
    as it is." "Come away from there.";
  - the score stops counting while you fire at it;
  - the first build's bodies come for you, more of them.
- **Hold it** (about 20 s of fire on it) and it gives. Die first and the crack
  keeps what you did: it is on the lock's save, so every attempt counts.
- **It widens a little by itself** each locked run, so nobody is stuck for
  long. By the fifth locked run it is unmistakable.

### 5. Face to face

- The crack gives, and the first build shatters. The menu text, the HUD, the
  board and the grid all break into panes. Each pane goes on playing the
  first build inside it, since it is still running in its frame. They fall
  away into today's room, lit.
- He is standing in the gap, holding the old screen's frame. "Put it back."
- You come through flying VOIDRUNNER, carrying the cards you took in the run
  you broke out of. They are today's upgrades, by the same ids.

### 6. The fight: the version war

- **Two renderers at once.** The arena is split between the first build's
  look and today's. The boundary is the front.
  - **The old side** has the first build's flat colours, no light, no glow
    and the old type. Its rules hold there too: no dash, and the first
    build's numbers.
  - **Today's side** has the light pass with soft shadows, bloom, materials
    and particles, and today's VOIDRUNNER.
  - **His attacks are reverts:** fronts that sweep the floor and take a band
    of it back to 1.0. Your fire pushes it the other way.
- **His bar is the record.** Instead of a health bar, there is a date at the
  top, starting at 7 AUG. Hurting him moves it forward.
  - Each date you pass restores what it brought, on screen, with its own
    flourish.
  - He answers by quoting it and trying to revert it, in your draft's lines:
    "'Bullet glow.' You did not need that."
  - Later dates are read from the `CHANGELOG`, so every future update joins
    the fight.

| The record (git, `main`) | What comes back |
| --- | --- |
| 7 Aug | the first build |
| 8 Aug | THE FRACTURE |
| 9 Aug | EMBER, the malware |
| 12 Aug | the codex |
| 14 Aug | THE AMALGAM, and the graphics switches |
| 16 Aug | co-op |
| 19 Aug | THE HACKER |
| 23 Aug | ROOT, THE FOUNDER |
| 8 Sep | the patch notes, the dailies, the skins |
| 20 Sep | THE VAGRANT, the awakenings, the hub |
| 22 Sep | BOSS RUSH |
| 1 Oct | RONIN |
| 3 Oct | PvP |
| 6 Oct | FORGOTTEN TALES |
| today | everything since, read from the `CHANGELOG` |

| # | Phase (stand-ins from his lines) | The record | What he does |
| --- | --- | --- | --- |
| 1 | PUT IT BACK | 7–14 Aug | He rebuilds the frame around you. The panes fly back, each a live window of the first build, and a pane that lands takes its patch of floor back to 1.0. Break them. |
| 2 | THIS WAS BETTER | 14 Aug–8 Sep | The light comes back on today's side. His reverts sweep it out in bands. He fights flat and unlit, and casts no shadow. |
| 3 | NOBODY ASKED | 8–22 Sep | Each restore lands as its flourish (the bosses, the pilots, the hub's statues), and he tries to paint it out in the old renderer before it settles. |
| 4 | HOLLOW | 22 Sep–6 Oct | Losing the floor, he goes for you. Your cards peel off one at a time and fly into his frame, until there is nothing on your ship. |
| 5 | THE BASE SHIP | 6 Oct–today | You, hollow, against him at his most loyal: your draft's counterplay. The base ship can win. |

- **The last hit is today.** The whole record restores at once: a cascade,
  every era flooding back, the front swept off the screen, and today's menu
  built back around him.

### 7. Out

- He isn't killed, because finales are people. He is left holding an empty
  frame: "It was better."
- The lock lifts on the profile, and on every device with the account. Your
  game is yours again: today's menu, and the real save exactly as it was.
- Flags: `opoMet` (you met him, page I) and `opoDone` (you beat him, page
  II). The voice never comes back, and neither does the old door.

## The fight's look (the most ambitious yet)

The fight is about two versions of the game, so the picture is two versions
of the game.

**Set pieces**, each its own hook:

| # | Set piece | What it is |
| --- | --- | --- |
| 1 | The old door | a flat, unlit thing standing in a lit room: the two renderers meet for the first time |
| 2 | The lock's revert | the game coming apart newest first, each piece quoted as it goes |
| 3 | The crack | today's light leaking through the first build's wall |
| 4 | The shatter | the first build breaking into panes that keep playing |
| 5 | Him | flat, polygonal, unlit and shadowless, built from the first build's own shapes (the WARDEN's eight sides, the grunts' triangles), holding the old screen, which still plays the first build |
| 6 | The front | a living seam between renderers: a scanline wipe, diff marks, the old render peeling back like paper |
| 7 | The restores | one flourish per date, fifteen of them, each in the language of what it brings back |
| 8 | The cascade | the whole record in a few seconds |

**Techniques:**
- **Two worlds in one frame.** The world is drawn twice, once through the old
  path (flat polygons, the first build's colours) and once through today's,
  and the two are composited through the front's mask. Where the front is
  decides the rules, so it is game state. The mask is only drawing.
- **The first build as a live texture.** It runs in its own frame, and the
  game draws its canvas onto the panes, onto the frame in his hands and onto
  the old side of the front. It is the real thing playing, not a screenshot.
- **The ALL HALLOWS kit** (`index.html:45760`):
  - the light pass with soft shadows, which never lights him;
  - cloth and rope;
  - rig springs;
  - the timeline, so the cut-ins scrub;
  - a dialogue voice for him;
  - the particle pool, and baked layers for the old side.
- **No frame budget** (you, 27 Sep). But every particle sits behind
  `FXO.parts`, and with effects off the fight must still read: the front,
  the date and his reverts.
- **The pipeline:**
  - the logic first, with placeholder hooks under a WHAT THEY ARE HANDED
    header;
  - then the art in a harness, reviewed on an artifact page;
  - then lifted in with a checked script, as `ronin-v-art/lift.mjs` was;
  - then a pass in a real browser at Chromebook sizes, with effects on and
    off.

## The rite and the form (after the route)

Superseded 16 Oct by `ONE-POINT-OH-RITE-PLAN.md`: the fight principles, the
rite sequence by sequence, the evolution retexture and the form's frame. The
draft that stood here (he reads the record forwards and adds to himself; the
form ORIGIN) is in this file's history. Your direction changed it: VOIDRUNNER
is regressed like every pilot, so the hull evolves through the rite, not the
game, and he is the one who stayed.

### His voice (your drafts' lines, then stand-ins)

Aggrieved, fond, unmovable. He never changes his mind, even falling.

| When | Line |
| --- | --- |
| The coaxing | "There were no doors. The next room just came." … "It can be like that again." *(stand-ins)* |
| The old door | "Just go in. You will see." *(stand-in)* |
| The lock's revert | each piece quoted as it goes: "'FORGOTTEN TALES.'" … "'THE FRACTURE.'" |
| The crack | "Leave that." "It is fine as it is." "Come away from there." *(stand-ins)* |
| Face to face | Put it back. |
| Each revert in the fight | the record quoted, then its remark: "'Bullet glow.' You did not need that." · "'Skins.' It looked fine." · "'Daily runs.'" |
| THIS WAS BETTER | This was better. |
| NOBODY ASKED | You changed it. Nobody asked you to change it. |
| Out | It was better. *(stand-in)* |
| THE NEXT THING, later | Someone has to stay and remember it. |

## Later: THE NEXT THING

Your drafts end on THE NEXT THING, where the five finales fight beside you,
ONE POINT OH among them. He may also be the one who restores the save the
finale appears to wipe. Nothing here builds it, but two things keep that door
open:
- He is built so he can later stand on your side (`e.hacked`, the machinery
  the finale reuses), with his lines in a table it can add to.
- Your drafts' order was SOLVED, ONE POINT OH, then THE NEXT THING. Building
  ONE POINT OH first, for VOIDRUNNER, swaps only the first two. The finale
  still waits for all five.

## The path

Each phase is its own branch and pull request. Each is tested before the next
starts, and stays off `main` until you say ship. Part one is the route, which
we are doing now. Part two is the rite and the form.

### Part one: the route

**As built (10 Oct).** Phases 1 to 4 are in, with Phase 5's art left as blank
hooks (`OPO_ART`, listed in `ONE-POINT-OH-HOOKS.md`). The route plays end to
end on the placeholders, in Node (`npm run test:opo`, and `npm test`'s
`opo-route` and `onepointoh` scenarios) and in a real Chromium. What was
decided on the way, all of it easy to change:
- **The first build has a dash.** `3af8b6d` dashes on SPACE or SHIFT, with
  i-frames, so "no dash" above is not true of 1.0. The old side's no-dash
  rule is built as written (`opoNoDash`, one line); say if it should follow
  the first build instead.
- **The lock is two counters,** `opoLock` and `opoLift`, not a flag: locked
  while the first is higher and he is not beaten. A merge takes the higher of
  each, so a lock holds while either side has one and a lift travels too, and
  no device's clock decides it.
- **PvP is shut** while the lock holds through a queue gate (`free`, ranked
  and casual). A friend's match by code is not shut yet.
- **The admin panel** is `opoJump(name)`, from the console: there is no panel
  in this repo to add rows to.
- **The art kit** (11 Oct). The hooks stay blank for the art, which will be
  drawn by hand; what is built is the toolkit it draws with (`OPO_KIT`):
  fake 3D on the 2D canvas for debris flying at the screen and striking its
  glass, and the screen breaking, folding in on itself and peeling back. With
  it, three every-frame layers (`worldFx`, `worldFlat`, `screenFx`, and
  `lockFx` in the lock), an event feed of what the route just did, and an art
  bench (`?opo=bench`, local or dev only) that plays every part of the kit.
  `ONE-POINT-OH-HOOKS.md` has the hook map and the kit's reference.
- **The art** (11 Oct). Every hook is drawn ("The art, as drawn" in
  `ONE-POINT-OH-HOOKS.md`). The first build's renderer and today's are kept
  apart: he, his door, panes, paint and voice are flat and unlit (he and his
  panes are drawn after bloom), and where the two meet is a diff, − and +. The
  coaxing pops up beneath your ship a letter at a time, blue into purple, with
  stressed words larger or shaking, after the Devourer of Gods' lines.
- **Him as a CRT set** (11 Oct). He is an old television, flat in 1.0's
  colours, his face on its bulging, bending tube over the first build
  playing, gripped by grunt hands under a crown of them. One number, his
  temper (`oaAnger`), drives the set, his face, his voice and the
  interference he throws into the room and onto your screen, so each phase
  is visibly angrier than the last: fond, annoyed, angry, furious, past it.
  It powers on at the shatter and off at the end.
- **His tale** (pages I and II) and his remarks on each date are stand-ins
  until Phase 0's lore pass. Page III is held for the rite.
- **Returning players** (11 Oct). A veteran with THE FRACTURE open gets
  through it all: the test plays a save from before ONE POINT OH, end to end.
  Three things were fixed for them. A statue's run that died short of wave 25
  used to leave its commitment on every run after (so no coaxing, and a rite
  at wave 25 of an ordinary run): `resetGame` now clears it. The Founder's
  tear and ROOT's key no longer follow anyone into his fight. And the old door
  is only placed where it can be used, or not at all, with its first showing
  still owed.
- **The fight's pacing**: the record moves at most over 150 s, each phase
  shows itself for at least 14 s, and the view pulls out to 0.74 so he stays
  on screen. About three and a half to four minutes, start to finish.

**Phase 0: the brief.** No code.
- Answer the questions below, or keep the defaults.
- Add him to the lore bible: his tale (pages I to III), where he sits in the
  order of events, and the record.

**Phase 1: the copy and the lock.**
- A script that makes the first build's page from git once, with the seal
  and the hooks around its script byte for byte (modelled on
  `scripts/pvp-build.mjs`). The page is committed, since the game's Worker
  has no build step.
- The game hosting it in its own frame, and drawing its canvas.
- `opoLock` on the profile:
  - in `Save`'s defaults, `Save.merge` and `repair` (`index.html:36765`,
    `36882`, `36831`). In a merge, a lock holds while either side has it,
    unless either side has beaten him;
  - synced with the account.
- While locked:
  - the page boots straight into the first build;
  - every one of today's buttons and overlays is gone;
  - the PvP address, co-op and the hub stay shut.
- The way out for real trouble: a copy that fails to load lifts the lock, and
  dev accounts can lift one by hand.
- Tests:
  - boot the copy and prove it never writes today's save key and never
    posts;
  - lock and unlock a profile through the account sync;
  - a failed copy lifts the lock.

**Phase 2: the coaxing and the old door.**
- `opoCoax` on the profile, the voice in the portal room, and the third gate
  (placed apart, slow to arm).
- The lock's revert cinematic, on placeholder hooks.
- Tests: a determinism scenario through the portal rooms with the voice and
  the gate, and `npm run test:tales`.

**Phase 3: the crack.**
- The wrapper's hooks into the first build (`drawArena`, the bullet step,
  `gameOver`).
- The crack's state on the lock's save, its growth each locked run, and the
  room's answer.
- The break: the hand-off from the copy to the fight.
- Tests: a scripted pilot in the copy breaks out; one that dies at the crack
  keeps its progress.

**Phase 4: ONE POINT OH and the fight's logic.**
- A `BOSSES` entry, `onepointoh`, with `secret: true, endgame: true`. The
  endgame flag keeps every pin, star, combo and execution off a finale
  (`suCanPin`, `index.html:9409`).
- The front as game state, the record and its dates, the five phases, the
  restores, HOLLOW, the cascade, and out.
- His lines in an `OPO_SAY` table. Every visual piece is a placeholder hook.
- Finale hygiene:
  - a fifth case in `roninFinaleOf` and `roninFinaleEnd`
    (`index.html:21629`);
  - THE HACKER can't take him (`hackTake`, `index.html:73830`);
  - review every `e.founder` and `e.amalPart` exception (about 25 places).
- An admin panel to jump to each phase.
- Tests:
  - a determinism scenario that fights him to the end;
  - one that quits mid-fight: the lock holds, and nothing leaks into the
    real save;
  - `npm run test:tales` for his pages I and II.

**Phase 5: the look.**
- The art harness and its review page, set piece by set piece (the table
  above).
- A checked lift script.
- A browser pass at Chromebook sizes, with effects on and off.
- Every suite.

### Part two: the rite and the form (after the route)

Planned in full in `ONE-POINT-OH-RITE-PLAN.md` ("The path", its Phases 0
to 6): the lore pass, the rite's logic, the evolution retexture, the form's
frame, the four actives, everything around it, and ship.

## What lights up by itself

`riteBuilt('runner')` turns true the moment `RITES.runner` has a `start`, so
these all change at once.

- **The hub.** The statue rises (`hubSyncState`, `index.html:52995`), and
  the Outsider's count drops to "One is asleep", for the summoner.
- **Runs.** A run committed at the statue is taken at wave 25
  (`riteTakesYou`).
- **The admin panel.** It lists the rite's sequences.
- **`unlock-evo`.** It wakes VOIDRUNNER on every dev account at its next
  sync, skipping its rite (`devUnlockEvo`, `index.html:67143`).
- **The hub's tale.** Its page III (`r:hub`) now asks for four hulls awake.
  Anyone who already opened it keeps it.
- **PvP.** An awake VOIDRUNNER can appear in platinum, VOID, casual and
  friend matches, so the bot and the duel rule (the rite plan's Phase 5)
  have to ship with it.

## Draft numbers (one block in the code, all tunable)

**The route:**

| | |
| --- | --- |
| The coaxing | 5 portal rooms, one line each, counted on the profile |
| The old door | always the first time after the fifth line; then about half the portal rooms |
| The lock's revert | about 8 s, newest first |
| The crack | about 20 s of fire on it to break; what you did is kept; it widens about a fifth by itself each locked run |
| The record | 15 dates, from 7 Aug to today |
| The fight | 5 phases, about 3 minutes in all |
| HOLLOW | one card off every few seconds through phase 4 |

**The rite and the form:** see "Draft numbers" in `ONE-POINT-OH-RITE-PLAN.md`.

## Questions for you (defaults are in, so nothing waits on these)

Your direction set the lock, the menu, VOIDRUNNER alone, no extra buttons,
and the break-out. These are what's left for the route.

1. **The voice.** Is it him, unseen until the shatter (my pick)?
2. **Rejecting the loop.** Firing into the crack in the room's edge (my
   pick)? The other way I'd consider is refusing SPACE on the death screen
   and simply waiting, but that can happen by accident.
3. **What the lock shuts.** The PvP address, co-op and the hub, as well as
   the menu (my pick)?
4. **Nobody stuck.** Should the crack widen by itself each locked run (my
   pick), and should dev accounts be able to lift a lock by hand?
5. **The record.** Dates (my pick), or version numbers? Before 8 Sep there
   are none: the first patch notes are 1.0.
6. **His look.** Built from the first build's own shapes, flat, unlit and
   holding the old screen (my pick)?
7. **THE REDACTION.** Is it still part of this? My default is no: THE
   FRACTURE opens the coaxing, and the coaxing is the way in.
8. **Does he know there is an outside?** He quotes the record. My default is
   yes: a player who came in on the first upload and never left.
   *Answered 16 Oct:* yes, and more. He is the one who stayed through the
   shutdown (`ONE-POINT-OH-RITE-PLAN.md`, "The story").
