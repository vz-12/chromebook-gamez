# ONE POINT OH — the plan (VOIDRUNNER's evolution)

A path to VOIDRUNNER's evolution. It is drawn from how THE AMALGAM, ROOT and
THE FOUNDER were built, from your BOSS DRAFTS (9 Sep), which settle who ONE
POINT OH is and how it fights, and from the FORGOTTEN TALES lore bible
(5 Oct). Where they disagree, your drafts win. It is a draft: the lore calls
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

## Who ONE POINT OH is (your drafts, 9 Sep)

**Your drafts settle it.** Every finale is a person, not a metaphor, and all
of them care too much. ONE POINT OH is the fandom that wants the thing
frozen. It loves the game sincerely, and that is the trap: it is not hostile
but loyal, and it will strangle the game to keep it exactly as it was the day
it arrived. It is SOLVED's counterweight.

- **Voice:** aggrieved, fond, unmovable. "This was better." "You changed it.
  Nobody asked you to change it." "Put it back."
- **Mechanic:** it reverts you, reading your own changelog aloud.
- **Counterplay:** beat it with the ship it insists was perfect. "It is RIGHT
  that the base ship can win. It is WRONG that it is better. Proving both at
  once is the fight." That is VOIDRUNNER's rite, written before rites
  existed.
- **Route in:** hold THE REDACTION, the 1.x commemorative.
- **Later:** it fights beside you in THE NEXT THING ("Someone has to stay and
  remember it.").

**What the lore bible adds (6 Oct), and how it fits.**
- The bible reads the devs' first game as THE GRID, THE WARDEN and
  VOIDRUNNER, and ONE POINT OH as "that first version". Under your drafts,
  that first version is what it is loyal to, not what it is. It arrived on
  the first day and wants the void kept as it was that day.
- VOIDRUNNER's ghost, "nothing needs adding to it", is ONE POINT OH's creed
  pointed somewhere useful. VOIDRUNNER needs nothing added; it doesn't
  forbid it. The pairing holds.
- VOIDRUNNER's page II, already in the game, is the line ONE POINT OH would
  agree with: "it's finished. it might be the only thing in here that is."
  The rite proves that wrong.
- The game's own history: 1.0 shipped on 8 Sep. THE REDACTION is for anyone
  who flew on 1.x. The era mark stamps `verFirst` and closes for new profiles
  when 2.0 ships (`eraMark`, `index.html:67193`).

**The one thing to reconcile.** It quotes the changelog, so it knows there
is an outside. The bible lets only the dev and ROOT know. My default is that
ONE POINT OH came in from outside too: a player who arrived on the first
version and never left, as the dev arrived when the game was shutting down.
That makes three who know. It also gives it the hull it arrived in, the
first VOIDRUNNER, to fly in the rite's last sequence. My earlier readings
(the first version woken, or the first run) are dropped: your drafts make it
a person who loves the game, not the game.

## The shape (draft)

### The route: how anyone meets it (your draft)

**How you get there: hold THE REDACTION** (`devHeld('redaction')`,
`index.html:67031`). The boss of nostalgia is only for people who were
there.
- Until 2.0 ships, every profile that plays is stamped 1.x and collects THE
  REDACTION (`eraMark`). So the gate keeps nobody out until 2.0, and from
  then on keeps it to the people who were there (Question 12).
- **Where it stands in a run:** your draft doesn't say. My default is THE
  GRID's boss wave on the second loop (waves 26–30), where THE WARDEN, the
  oldest mind in the void, gives way to it. It comes every time until the
  profile beats it, then a quarter of the time.
- The Bookkeeper's full record skips endgame bosses (`Codex.trulyFull`,
  `index.html:31855`), so a profile that never meets it loses nothing there.
- The rite stays open to everyone past the tribunal, as every rite is. The
  hub opens on `tribunalDone` (`outsiderArrivalDue`, `index.html:53017`). A
  pilot's evolution can't be kept to people who were there.

**The fight: it reverts you, using your own changelog.** For any pilot.
- **Each phase strips one shipped feature, newest first, and quotes its
  entry.** The line lands before the revert, or it reads as a bug. Your
  draft's examples:
  - "'Bullet glow.' You did not need that." The effect goes.
  - "'Skins.' It looked fine." The hull snaps to default.
  - "'Daily runs.'" The arena reverts to THE GRID.
- **The script is the `CHANGELOG` itself** (`index.html:64637`), read newest
  first at run time, so every future update is quoted too. A short list
  covers what came before the notes began (bullet glow, skins, daily runs).
  It skips entries that have nothing of yours to take. From today's list:
  - "'FIRST FLIGHT.'" (1.5.2): the assist and its hints go.
  - "'FORGOTTEN TALES.'" (1.5): no page opens in the fight.
  - "'Evolutions.'" (1.4): an awakened pilot's form goes out.
  - "'THE REDACTION.'" (1.1): the skin you needed to be here comes off.
- **Fixes and safety limits are quoted and kept** (the 2,000-shot cap, the
  sound limits): "That one can stay." Reverting those would bring back the
  crashes they fixed.
- **Upgrade stacks roll back a version at a time.** My reading is that each
  phase, every stack loses a level (Question 4). The last phase takes
  whatever is left, so you always end with nothing on your ship: HOLLOW (the
  challenge, `noLvl`, `index.html:73030`), imposed rather than chosen.
- **Beat it like that.** When it falls, everything comes back.
- **Everything comes back on any exit too** (your draft's risk): a quit
  mid-fight, a death, a closed tab.
  - The cosmetic reverts are this machine's overrides. They are never written
    to settings or the save.
  - The game reverts (stacks, the form, the room) are run state, so co-op
    and the suites see the same fight.
- Its length is held by the endgame throttle, with a target of its own, as
  THE AMALGAM and THE UNWRITTEN have.

### The rite: VOIDRUNNER, at the statue

**The point is your draft's counterplay.** VOIDRUNNER is the ship it
insists was perfect. The rite has to prove both halves: the base ship can
win, and it is not better.

**The other way round.** On the route it reads your changelog newest first
and takes from you.
- VOIDRUNNER arrives with nothing on it to take, so it reads the changelog
  the other way, oldest first. It adds each entry to itself to keep up, and
  it hates every one.
- Each addition makes it meaner, bigger and easier to hit: "every build that
  added something played worse".
- It reads every entry but one. It will not read 1.4, "Evolutions", aloud.
- At the end it throws all of it off: "Put it back." It is the ship it
  arrived in against VOIDRUNNER, dead even, until the hull wakes. VOIDRUNNER
  wakes by living the entry it would not read.

**The rule** (the rite's one verb, the bare gun).
- Health is `OPO_HP` (1000) in the rite's own units.
- VOIDRUNNER's own rounds are the only thing that reaches it, `OPO_HIT` each,
  whatever the build. Chain, splash, drones, crits and thorns are all
  refused.
- What wins is what won in the first game: hitting, and not being hit.

| # | Name (stand-in, from its own lines) | Runs to | What it does |
| --- | --- | --- | --- |
| 1 | THIS WAS BETTER | 0.80 | The first room, its three enemies, THE WARDEN's ring. Honest and slow. It is small and quick, and hard to hit. |
| 2 | NOBODY ASKED | 0.60 | It reads 1.1 and 1.2 aloud: THE REDACTION's censor-bar rounds, then a lance of its own. It grows. |
| 3 | YOU CHANGED IT | 0.40 | 1.3: the rush (each stage boss's one idea in turn), and THE VAGRANT's parry turning your rounds back. Bigger again. |
| 4 | IT SKIPS ONE | 0.20 | Everything after 1.4, at once. The later notes bring little to fight with, so it takes the whole roster. The room hears it pass over 1.4. It is losing its shape, and becoming the kind of thing THE AMALGAM is. |
| 5 | PUT IT BACK | 0 | It throws everything off. The ship it arrived in, against VOIDRUNNER. |

**Sequence 5, the even duel** (the cutscene, played).
- It flies the ship it arrived in, the first VOIDRUNNER, at your numbers.
  Sequences 1 to 4 have proved it right: the base ship, with nothing that
  counts but its gun, can win. Here every exchange ties.
- Every round you fire, it answers on the same frame with the same round back
  down your line. The two meet and go out. While you keep firing, nothing
  lands either way.
- Stop firing and its rounds land. Each one costs you, as a lost line does in
  ROOT's race (`RACE_HIT`).
- Partway through, the hull wakes: the entry it would not read. From that
  frame `grantAwakening('runner')` has fired, `P.awake` is 1, and your rounds
  stop meeting its rounds: they go through. This is where it is wrong: the
  base ship is not better.
- It cannot keep up. Its health goes with your hits, and on the last one it
  goes out.
- The card follows: AWAKENING · ORIGIN · VOIDRUNNER, "it can win. it is not
  better." (all stand-ins). Then the menu.

### The awakened form (working name ORIGIN)

The kit's frame only. You named RONIN's moves one at a time, and the same
goes here.

- **What comes back** (the bible: an awakening is what the hull was).
  VOIDRUNNER was the first game's one hull, and it grew once the void woke.
  That growth comes back: the thing ONE POINT OH forbids.
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

### Its voice (your drafts' lines, then stand-ins)

Aggrieved, fond, unmovable. It never changes its mind, even falling.

| When | Line |
| --- | --- |
| Each revert, on the route | the entry, quoted, then its remark: "'Bullet glow.' You did not need that." · "'Skins.' It looked fine." · "'Daily runs.'" |
| A fix it keeps | That one can stay. *(stand-in)* |
| THIS WAS BETTER | This was better. |
| NOBODY ASKED | You changed it. Nobody asked you to change it. |
| YOU CHANGED IT | 'BOSS RUSH.' Fine. Fine. *(stand-in)* |
| IT SKIPS ONE | We do not need that one. *(stand-in)* |
| PUT IT BACK | Put it back. |
| The wake | That one. I did not read that one. *(stand-in)* |
| The fall | It was better. *(stand-in)* |
| THE NEXT THING, later | Someone has to stay and remember it. |

## Later: THE NEXT THING

Your drafts end on THE NEXT THING, where the five finales fight beside you
and ONE POINT OH is one of them. It may also be the one who restores the save
the finale appears to wipe. Nothing in this plan builds it, but two things
keep that door open:
- Phase 1 builds ONE POINT OH so it can later stand on your side
  (`e.hacked`, the machinery the finale reuses), with its lines in a table
  the finale can add to.
- Your drafts' order was SOLVED, ONE POINT OH, then THE NEXT THING. Building
  ONE POINT OH first, for VOIDRUNNER, swaps only the first two. The finale
  still waits for all five.

## The path

Each phase is its own branch and pull request. Each is tested before the next
starts, and stays off `main` until you say ship. Phases 1 to 3 are ONE POINT
OH. Phases 4 and 5 are the form. Phase 6 is everything that already knows
about the other three evolutions.

**Phase 0: the brief.** No code.
- Answer the questions below, or keep the defaults.
- Add ONE POINT OH to the lore bible, from your drafts: its tale (pages I
  to III), where it sits in the order of events, VOIDRUNNER's page III, and
  the awakening's three pages.
- This file is then revised to open with "Your brief", as `RONIN-V-PLAN.md`
  does.

**Phase 1: ONE POINT OH, the body.**
- A `BOSSES` entry, `onepointoh`, with `secret: true, endgame: true`. The
  endgame flag already keeps every pin, star, combo and execution off a
  finale: `suCanPin` at `index.html:9409`, which `odStar` and `suComboReady`
  both read.
- Its figure: a person, and the ship it arrived in (the first VOIDRUNNER),
  behind `drawOpo…` hooks with a WHAT THEY ARE HANDED header.
- Its moves: the ring and the three. Seeded, with state kept as data.
- Its lines: an `OPO_SAY` table.
- Built so it can later fight on your side (THE NEXT THING, `e.hacked`).
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
- The entry: holding THE REDACTION (`devHeld`), on THE GRID's boss wave of
  the second loop (default).
- Profile flags `opoMet` and `opoDone`, in:
  - `Save`'s defaults, `Save.merge` and `repair` (`index.html:36765`, `36882`,
    `36831`);
  - the run's flag list (`index.html:153`);
  - the junk-flag lists in `scripts/determinism.mjs:139-140`.
- `OPO_REVERTS`: the `CHANGELOG`, read newest first at run time, plus the
  before-the-notes list.
  - Each entry names its quote, its remark and its revert, as data and never
    a closure: `'fx:bglow'`, `'skin'`, `'stage:grid'`, `'awake'`, `'ups'`.
  - Fixes and safety limits are quoted and kept.
- The fight:
  - each quote lands before its revert;
  - every stack drops a level each phase, and the last phase leaves you
    HOLLOW;
  - it has a throttle target of its own.
- It reuses what your draft named: FXO (`index.html:236`), `skinRefresh`
  (`index.html:66193`), the stage re-skin, and the upgrade stacks.
- Everything is restored when it falls and on every exit: `resetGame`, a
  death, a quit, the page closing. Cosmetic overrides never touch settings
  or the save.
- On a win: `Codex.seeEnemy`, `tale(…)`, and a challenge goal if finales have
  them (`chalCheckGoal`).
- CONTINUE: the rollback's opening is a scene, so it joins `runSaveable`'s
  refusals (`index.html:63780`).
- Tests:
  - a determinism scenario reaching it through the real entry;
  - one that quits mid-fight and checks that every setting, skin, stack and
    form is back;
  - `npm run test:tales` for its pages I and II.

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
- **Tales.** ONE POINT OH is a person, so it is filed in PEOPLE with a card
  in BOSSES, as THE FOUNDER is. Its page II (defeat it on the route) opens
  only for those who were there (Question 8).
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
| The revert | 6 phases on its health. Each quotes one entry (newest first, the quote 1.2 s before its revert) and takes a level off every stack. The last takes what is left. All of it comes back when it falls, or on any exit |
| Graze | a round within 26 px pays 1, a dash through one pays 4; 100 fills it |
| The form | 60 s, as SUPERUSER and a run's OVERDRIVE |
| Awake passive | ×1.35 damage, ×1.20 speed (EMBER's) |

## Questions for you (defaults are in, so nothing waits on these)

Your drafts answered who it is, its voice, its mechanic, its counterplay and
its way in. These are what's left.

1. **Does it know there is an outside?** It quotes the changelog. My default
   is yes: a player who arrived on the first version and stayed, the third
   who knows, after the dev and ROOT.
2. **Where it stands in a run.** THE GRID's boss wave on the second loop, for
   holders of THE REDACTION (default)?
3. **The order.** Route before rite (default), or the rite first to get the
   evolution out sooner?
4. **"Upgrade stacks roll back a version at a time."** Every stack loses a
   level each phase (my reading, the default). Or did you mean each stack
   goes back to what existed in each version?
5. **The rite's rule.** Does the build count for nothing (default, as ROOT
   and THE FOUNDER), or for some of the pace, as in EMBER's?
6. **The rite reads the changelog forwards** and will not read "Evolutions".
   Keep it?
7. **The even duel.** Rounds that meet and go out, on the same frame. It sits
   near THE OTHER's mirror, but as a duel of equals rather than a
   reflection. Keep it?
8. **Its page II.** Only for those who were there (default), or also opened
   by passing VOIDRUNNER's rite?
9. **Names.** The form (ORIGIN is a stand-in; also FIRST LIGHT, MASTER COPY,
   GOLD MASTER), the five sequences, and the card's line ("it can win. it is
   not better." is a stand-in).
10. **The meter.** Graze (default), hits landed, or kills at range?
11. **PvP.** Awake VOIDRUNNER in duels from the start (default), or held out
    at first, as LAST VOW is?
12. **The version.** Your REDACTION gate only means "someone who was there"
    once 2.0 ships; until then every new profile still collects it.
    - Ship ONE POINT OH as 2.0 and the gate means it from day one: a boss
      that swears 1.0 was perfect, arriving in 2.0.
    - Ship it as 1.6 (default) and the gate starts meaning it whenever 2.0
      comes.
    - Either way, 2.0 closes the era mark for every new profile.
