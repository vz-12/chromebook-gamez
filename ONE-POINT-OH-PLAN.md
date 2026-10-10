# ONE POINT OH — the plan (VOIDRUNNER's evolution)

A path to VOIDRUNNER's evolution. It is drawn from how THE AMALGAM, ROOT and
THE FOUNDER were built, and from the FORGOTTEN TALES lore bible (5 Oct). It
is a draft: the lore calls and the names are yours. Defaults are in, so no
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

## Who ONE POINT OH is (your canon; a proposal)

**What is already written:**

- `RITES`: "VOIDRUNNER → ONE POINT OH: the base ship, against the boss that
  insists the base ship was perfect."
- The bible names ONE POINT OH as "the one who swears the first version was
  perfect". Its reading is that the devs' first game was THE GRID, THE WARDEN
  and VOIDRUNNER, and that "ONE POINT OH is that first version". That game
  was "so simple it felt oddly underwhelming: three enemies, one boss, one
  character, not even a menu."
- VOIDRUNNER's page II, already in the game: "every build that added
  something played worse … ~~it's boring~~ it isn't boring. it's finished.
  it might be the only thing in here that is."
- The bible's VOIDRUNNER: "its ghost is the conviction that nothing needs
  adding to it. What it was is still unwritten, and ONE POINT OH is where it
  will be found."
- THE WARDEN, in the bible: the oldest mind in the void, "the only one that
  remembers the game before".
- The rules: finales are people who care too much about the game, and the
  made things say nothing. Only the dev and ROOT say "game", "player" or
  "code".
- The game's own history: 1.0 shipped on 8 Sep. THE REDACTION is for anyone
  who flew on 1.x. The era mark stamps `verFirst` and closes for new profiles
  when 2.0 ships (`eraMark`, `index.html:67193`).

**Three readings:**

| Reading | What it is | Fits | Costs |
| --- | --- | --- | --- |
| A. The first version, woken | the one-room game itself | the bible's reading | a made thing, so it says nothing, and the finales are people |
| **B. The first run** (my pick) | a run from the first game that never ended: the first VOIDRUNNER ever flown, still in the first room, still sure | a person, as THE LOST SOUL is. It flies the first hull, so the even duel is literal, and it is where VOIDRUNNER finds "what it was" | a new line in the order of events |
| C. An outsider who swears by 1.0 | a player from outside, like the dev | the jokes write themselves | a third voice allowed to say "game"; it crowds the dev |

**Reading B, drafted.** Before the sectors there was one room, three kinds of
thing and one at the end, and one hull. The first run of it never ended.
Whoever flew it is long gone outside, and the run went on: the same room, the
same three, THE WARDEN's ring, round and round. It was enough, and it has
never stopped saying so. When ROOT set the void evolving, everything in it
grew, the hull included. The first run is the only thing that refused.
VOIDRUNNER's ghost, "nothing needs adding", is the first run's creed. In the
rite the hull meets it, and outgrows it.

## The shape (draft)

### The route: how anyone meets it

**How you get there** (Question 2).
- Default, **THE WARDEN remembers**: the second time a run reaches THE GRID
  (waves 26–30), THE WARDEN does not come. ONE POINT OH does, in its place.
- It comes every time until the profile has beaten it once, then a quarter
  of the time.
- It is not behind THE FRACTURE, because VOIDRUNNER's boss belongs to the
  first sector. The rite stays behind the hub as every rite is: the hub opens
  only after the tribunal (`outsiderArrivalDue`, `index.html:53017`).

**The fight: THE ROLLBACK**, for any pilot.
- The room rolls back to the first version:
  - THE GRID's first look;
  - the HUD thinned to what the first game had;
  - only the first three enemies (`grunt`, `spitter` and `dasher`: SHARD,
    SPITTER and LANCER);
  - THE WARDEN's one idea, the ring, perfected.
- **Your cards come off, newest first**, one every few seconds, each with its
  name as it goes. Your damage is read through what is left, so the longer it
  takes, the less you have. It is a race against being unbuilt, not a damage
  race.
- When it falls, it gives back exactly what it took. The route goes on.
- Its length is held by the endgame throttle (`endgameThrottle`), with a
  target of its own, as THE AMALGAM and THE UNWRITTEN have.

### The rite: VOIDRUNNER, at the statue

**The other way round.** On the route it takes from you. VOIDRUNNER has
nothing it needs to lose, so the rollback has nothing to take, and to win the
first run has to do the thing it swears should never have been done: it adds.
Each sequence it bolts on more of what came after, and every addition makes
it meaner, bigger and easier to hit: "every build that added something played
worse". At the end it throws all of it off, and it is the first hull against
the first hull.

**The rule** (the rite's one verb, the bare gun).
- Health is `OPO_HP` (1000) in the rite's own units.
- VOIDRUNNER's own rounds are the only thing that reaches it, `OPO_HIT` each,
  whatever the build. Chain, splash, drones, crits and thorns are all
  refused.
- What wins is what won in the first game: hitting, and not being hit.

| # | Name (stand-in) | Runs to | What it does |
| --- | --- | --- | --- |
| 1 | IT IS ENOUGH | 0.80 | The first room, its three, its ring. Honest and slow. It is small and quick, and hard to hit. |
| 2 | IT ADDS A ROOM | 0.60 | It reaches for the sectors: vents, acid, lasers and wells laid over THE GRID, one at a time. It grows. |
| 3 | IT TAKES A CARD | 0.40 | Upgrades on its own rounds (split, pierce, chain, bounce), each named as it takes it. Bigger again. |
| 4 | IT TAKES EVERYTHING | 0.20 | The whole roster, and every boss's one idea at once. It is losing its shape, and becoming the kind of thing THE AMALGAM is. |
| 5 | ONE POINT OH | 0 | It throws everything off. The first hull against the first hull. |

**Sequence 5, the even duel** (the cutscene, played).
- It flies your hull at your numbers.
- Every round you fire, it answers on the same frame with the same round back
  down your line. The two meet and go out. While you keep firing, nothing
  lands either way.
- Stop firing and its rounds land. Each one costs you, as a lost line does in
  ROOT's race (`RACE_HIT`).
- Partway through, the hull wakes. From that frame `grantAwakening('runner')`
  has fired, `P.awake` is 1, and your rounds stop meeting its rounds: they go
  through.
- It cannot keep up. Its health goes with your hits, and on the last one it
  goes out.
- The card follows: AWAKENING · ORIGIN · VOIDRUNNER (both stand-ins), then
  the menu.

### The awakened form (working name ORIGIN)

The kit's frame only. You named RONIN's moves one at a time, and the same
goes here.

- **What comes back** (the bible: an awakening is what the hull was). Under
  reading B, the first hull as it grew once the void woke: the one character
  of the first game, grown past its code.
- **Passive, awake:** `AWAKE_DMG` and `AWAKE_SPD`, EMBER's ×1.35 and ×1.20,
  as a stand-in.
- **The meter: GRAZE** (Question 7). A round that passes close without
  hitting pays into it, and a dash through one pays more. It is the base
  hull's skill turned into fuel: fast, forgiving, never hit. No other pilot
  fills its meter by dodging.
- **The key:** [F]. It is free for VOIDRUNNER today: `ventFire` returns for
  any hull that is not a lance or THE HACKER (`index.html:32699`).
- **The form:** a minute, with a cut-in, held off in the rite like the other
  three.
- **Four actives on Z X C V**, only in the form. A starter sketch, to throw
  away: Z close, X across the room, C on the move, V everything. VOIDRUNNER
  is "effective at any range", so each move owns a range and V owns them all.
- **PvP:** VOIDRUNNER is a base pilot (`BASE_PILOTS`). Ranked from bronze to
  gold never flies it awake. Platinum, VOID, casual and friend matches will,
  as soon as accounts have it. Grazing needs rounds, so against EMBER's lance
  or THE VAGRANT's blade the meter needs a duel rule of its own, as EMBER's
  vent got (`DUEL.heat`).

### Its voice (stand-ins, in the bible's voice)

| When | Line |
| --- | --- |
| The entrance | There was one room. It was enough. |
| IT IS ENOUGH | Three of them, and one at the end. Nobody needed more. |
| IT ADDS A ROOM | One more room. It does not count. |
| IT TAKES A CARD | I will put it back after. |
| IT TAKES EVERYTHING | This is what they did to it. |
| ONE POINT OH | Then the way it was. You and me. |
| The wake | You were in the first one. You were not like this. |
| The fall | It was enough. It was. |

## The path

Each phase is its own branch and pull request. Each is tested before the next
starts, and stays off `main` until you say ship. Phases 1 to 3 are ONE POINT
OH. Phases 4 and 5 are the form. Phase 6 is everything that already knows
about the other three evolutions.

**Phase 0: the brief.** No code.
- Answer the questions below, or keep the defaults.
- Add ONE POINT OH to the lore bible: its tale (pages I to III), VOIDRUNNER's
  page III, and the awakening's three pages.
- This file is then revised to open with "Your brief", as `RONIN-V-PLAN.md`
  does.

**Phase 1: ONE POINT OH, the body.**
- A `BOSSES` entry, `onepointoh`, with `secret: true, endgame: true`. The
  endgame flag already keeps every pin, star, combo and execution off a
  finale: `suCanPin` at `index.html:9409`, which `odStar` and `suComboReady`
  both read.
- Its figure: the first hull, as it was, behind `drawOpo…` hooks with a
  WHAT THEY ARE HANDED header.
- Its moves: the ring and the three. Seeded, with state kept as data.
- Its lines: an `OPO_SAY` table.
- Finale hygiene:
  - add a fifth case to `roninFinaleOf` and `roninFinaleEnd`
    (`index.html:21629`). RONIN's executions cover every finale (you,
    30 Sep).
  - check that THE HACKER cannot take it (`hackTake`, `index.html:73830`).
  - review every `e.founder` and `e.amalPart` exception (about 25 places) for
    one it needs.
- A spawn button in the local admin panel.
- Tests: an `opo` scenario in `scripts/determinism.mjs`, with every pilot
  fighting it. `npm test` and `npm run test:lockstep`.

**Phase 2: the route.**
- The entry (default: THE WARDEN remembers).
- Profile flags `opoMet` and `opoDone`, in:
  - `Save`'s defaults, `Save.merge` and `repair` (`index.html:36765`, `36882`,
    `36831`);
  - the run's flag list (`index.html:153`);
  - the junk-flag lists in `scripts/determinism.mjs:139-140`.
- THE ROLLBACK: the room, the thinned HUD (hooks), cards off newest first,
  every one given back when it falls, and a throttle target of its own.
- On a win: `Codex.seeEnemy`, `tale(…)`, and a challenge goal if finales have
  them (`chalCheckGoal`).
- CONTINUE: the rollback's opening is a scene, so it joins `runSaveable`'s
  refusals (`index.html:63780`).
- Tests: a determinism scenario reaching it through the real entry, and
  `npm run test:tales` for its pages I and II.

**Phase 3: the rite.**
- `RITES.runner` gets `start: opoOpen`, `seqs` and `jump`. This line alone
  lights the statue (see "What lights up by itself").
- `opoOpen`, copied from `rrOpen` and `vrOpen`:
  - the flag `opoRite` for the whole rite, cleared in `resetGame`;
  - duel size, and depth at `RITE_WAVE`;
  - the entrance, `OPO_OPEN`.
- The rule: rite units, `OPO_HIT` for VOIDRUNNER's own rounds, and
  everything else refused at `damageEnemy`'s guards.
- `OPO_SEQ` (`until`, `n`, beats), the seam, `OPO_SEQ_MIN`, and its growing
  size.
- Sequence 5: the even duel, the wake, the fall, `rsCardOn('VOIDRUNNER',
  'ORIGIN', …)`.
- An art hooks block, "ONE POINT OH'S RITE — art hooks", drop-in
  replaceable.
- Admin jumps to each sequence.
- Tests:
  - a `rite-runner` scenario beside `rite-ember`, `rite-hacker` and
    `rite-melee` (`scripts/determinism.mjs:233-235`);
  - run C's snapshot holds through it;
  - the suite fails if the run never reaches the wake.

**Phase 4: the form's frame.**
- The passive.
- The graze meter, with its HUD hook where EMBER's vent and the root meter
  sit (`index.html:10929`).
- [F], with a runner branch in `ventFire`, for a minute, with its cut-in
  hooks. The kit stays off in the rite.
- `tale('awake', 'runner')` and `tale('act', 'runner', i)`.
- Admin buttons: FILL and WAKE.
- Tests:
  - the determinism kit runs press F;
  - `runner` joins the lockstep awakened list (`scripts/lockstep.mjs:64`);
  - VOIDRUNNER's un-awakened play is unchanged. It is the starting hull and
    the most flown, and its determinism scenario is the guard.

**Phase 5: the four actives.**
- Named by you, one at a time, with combos and V.
- The suites' bots press each one.

**Phase 6: everything around it.**
- **Tales.** These depend on reading B: a person is filed in PEOPLE with a
  card in BOSSES, as THE FOUNDER is.
  - `TALE_AWAKE` gets `runner`;
  - ONE POINT OH's entry, with its `TALE_BOSS_II` and `TALE_DEED_B`;
  - `p:runner`'s page III unheld (`index.html:32028`);
  - the pages in `TALE_TEXT`, and the lines in `Tales.sync`;
  - `scripts/tales.mjs`: the count of 68 and the "held" check at line 193.
- **Looks.** A banner and a picture gated `awake:runner` (`src/looks.js`).
  In `leaderboard/art.js`, VOIDRUNNER's `awake: null` gets a colour, and the
  form gets its cover stage. Test: `npm run test:looks`.
- **Dev perks.** `evo-runner` in `DEV_PERK_IDS` (`index.html:66761`), and in
  the server's list if hand grants are wanted.
- **PvP.**
  - `pvp/site/js/bot.js` learns the form (the forms section, from line 234);
  - the graze duel rule in `duel.js`;
  - `scripts/pvp-engine.mjs` checks it;
  - `PVP_ART` shows it wherever forms are shown;
  - test: `npm run test:pvp`.

**Phase 7: the art.** Yours: hooks only, as with FORGOTTEN TALES. A list of
every hook, then lifted in like `ronin-v-art/`.

**Phase 8: ship.**
- A `CHANGELOG` entry at the top (`index.html:64637`), and the version.
- A pass in a real browser at Chromebook sizes.
- Every suite.
- A README section.
- Then `main`.

**Getting the evolution out sooner.** Phase 2 can move to after Phase 5. The
rite would then be the first meeting, which breaks "again", and ONE POINT
OH's page II waits. Phase 1 can't move: the rite is built out of it.

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
  friend matches, so Phase 6's bot and duel rule have to ship with it.

## Draft numbers (one block in the code, all tunable)

| | |
| --- | --- |
| `OPO_HP` | 1000 rite units |
| `OPO_HIT` | 3 a hit. At base fire rate and half the rounds landing, the first four sequences take about two minutes |
| `OPO_SEQ_MIN` | 14 s, as THE FOUNDER's |
| `OPO_OPEN` | 2.6 s entrance |
| Its growth | its body grows about a quarter at each of sequences 2–4, and goes back to small for sequence 5 |
| Even duel | a lost exchange costs 12% of max health (`RACE_HIT`'s figure) |
| Route throttle | target 90 s (THE AMALGAM's is 100, THE UNWRITTEN's 70) |
| THE ROLLBACK | a card off every 6 s, newest first; all given back when it falls |
| Graze | a round within 26 px pays 1, a dash through one pays 4; 100 fills it |
| The form | 60 s, as SUPERUSER and a run's OVERDRIVE |
| Awake passive | ×1.35 damage, ×1.20 speed (EMBER's) |

## Questions for you (defaults are in, so nothing waits on these)

1. **Who it is.** Reading A, B or C? My default is B, the first run.
2. **The route entry.** THE WARDEN remembers, from the second loop (default).
   Or: clear THE VOID taking no cards, or the fifth finale after THE FOUNDER.
3. **The order.** Route before rite (default), or the rite first to get the
   evolution out sooner?
4. **The rite's rule.** Does the build count for nothing (default, as ROOT
   and THE FOUNDER), or for some of the pace, as in EMBER's?
5. **The even duel.** Rounds that meet and go out, on the same frame. It sits
   near THE OTHER's mirror, but as a duel of equals rather than a
   reflection. Keep it?
6. **Names.** The form (ORIGIN is a stand-in; also FIRST LIGHT, MASTER COPY,
   GOLD MASTER), the five sequences, and the card's line ("nothing needed
   adding" is a stand-in).
7. **The meter.** Graze (default), hits landed, or kills at range?
8. **PvP.** Awake VOIDRUNNER in duels from the start (default), or held out
   at first, as LAST VOW is?
9. **The version.** 1.6 (default), or 2.0? A boss that swears 1.0 was
   perfect, arriving in 2.0, is a good joke, but 2.0 closes the era mark for
   every new profile (`eraMark`).
10. **Its voice.** Does it speak (default, as a person), or say nothing, as
    the first game had no words?
