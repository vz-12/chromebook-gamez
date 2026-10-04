# VOIDRUNNER PvP — the plan

Branch: `pvp`. Nothing here reaches `main` (and so voidrunner.online) until a
phase is finished and you say ship. This file is `.md`, so `.assetsignore`
keeps it off the public site.

## What we are building

- **PvP on its own Worker**, `voidrunner-pvp`, at the Worker's own address,
  `voidrunner-pvp.play101.workers.dev`.
  - Nobody types the address: a button in the main game takes you there.
  - It's a separate deploy, so a PvP bug can't take the game down.
- **The same D1 database** (`voidrunner`), so the PvP ladder sits beside the
  existing boards and both Workers read the same accounts.
- **Your progress carries over.** The pilots you've unlocked, which ones are
  awake (evo), and the reward upgrades you've earned decide what you can
  bring, within your league's rules.
- **Built on co-op's lockstep.** Both machines run the same match from the
  same seed and swap inputs only. TWO PILOTS already gives each player a
  whole pilot.
- **Leagues for ranked.** Low leagues allow only the base pilots; high
  leagues allow everything. Unlocked upgrades count in every league.
- **Queues stay general.** Ranked and casual are two entries in one queue
  table, and leagues are a table too. Ads, entry rules and rewards are hooks,
  so later queues (events, tournaments, sponsored) are config, not new code.
- **Standalone by nature.** PvP's code lives in its own small files, read
  by topic, in `pvp/site/js/`. It runs the game's engine as it is, from a copy
  made at deploy (Phase 3); `index.html` is not split, and PvP adds no
  section to it, only one-line hooks that do nothing in the game.
- **A standalone leaderboard page** where anyone can search for any player's
  placement and scores, with a PVP tab.

## Decided (your answers, 3 Oct)

1. **Sign-in:** a username and password is enough for now.
2. **Leagues:** in higher leagues everything goes. In low leagues only the
   base pilots, but unlocked upgrades stay.
3. **Address:** the Worker's own URL, with a redirect button on the main page.
4. **Files:** PvP is standalone: no new section in the main file. (4 Oct,
   revised:) `index.html` is not split. PvP's own files are sectioned by
   topic, so they are easy to read, and hold only what PvP needs. If
   rebuilding the engine is harder than using it, PvP uses the game's engine
   as it is, as long as nothing PvP doesn't use is loaded or run (no lag, no
   latency). See Phase 3.
5. **Leaderboard:** a PVP tab. Also a standalone leaderboard page where you
   can search everyone's placement and scores (Phase 1, step 2).

## Why accounts come first

1. **A save belongs to the address it was made on.** The PvP site can't read
   `voidrunner.online`'s storage. The only way to get unlocks across is for
   the server to hold them, and only a login can say whose they are.
2. **Today's identity is a `pid`.** It's a random id made inside one
   browser: a claim ticket, not a login. Anyone can make a thousand. A ranked
   ladder needs an identity that costs something to make.
3. **It's worth having anyway.** Accounts mean cloud saves across devices,
   and a leaderboard that knows who's who.

## How it fits together

```
 voidrunner.online  (Worker: voidrunner)        voidrunner-pvp.play101.workers.dev  (Worker: voidrunner-pvp)
 ─────────────────────────────────────────      ──────────────────────────────────────────────────────────
 index.html — the game                          the PvP page + its own files
 /leaderboard/ — boards and search              /api/account     the same accounts code, its own cookie
 /api/leaderboard  /api/room  /api/turn         /api/pvp/queue   WebSocket → Matchmaker DO
 /api/account      sign up, sign in, save       /api/pvp/match   WebSocket → Match DO (referee)
 /api/boards       every score, ranks, search   /api/pvp/ladder  ratings
                 │                                                │
                 └──────────── D1 "voidrunner" ───────────────────┘
                   accounts · sessions · account_pids · saves · scores   (Phase 1)
                   pvp_ratings · pvp_matches · pvp_flags                 (Phase 5)
```

- **Two sites, one account, no second login.**
  - A `workers.dev` address is a different site to the browser, so
    voidrunner.online's sign-in cookie can't reach it.
  - So the PVP button asks the main Worker for a **one-time hand-off code**.
    The code is single use, lasts 60 seconds, and only its hash is stored.
  - The button opens the PvP page with the code after the `#`, which never
    reaches a server log. The PvP page trades it for its own session.
  - BACK TO VOIDRUNNER works the same way in reverse.
  - Both Workers check sessions against the same `sessions` table.
- **Shared code.** `src/auth.js` (what a session is) and `src/account.js`
  (sign in, sign up, the save) are imported by the PvP Worker as they are
  (`pvp/src/*` → `../../src/*.js`). There's one copy of the rules.
- **Deploying the second Worker (dashboard, once):** Workers & Pages →
  Create → Import a repository → `vz-12/chromebook-gamez`. Set it up like
  this:
  - Name `voidrunner-pvp`. Root directory `/`.
  - Deploy command `npx wrangler deploy -c pvp/wrangler.jsonc`.
  - Build watch paths `pvp/*`, `src/auth.js`, `src/account.js`. (PvP's code
    imports only those two from `src/`.)
  - The main Worker gets watch paths that exclude `pvp/*`, so a PvP change
    doesn't redeploy the game.

## Phases

Each step is pushed to `pvp`, then I stop and report. A phase goes to `main`
when you say so.

### Phase 1 — Accounts (main Worker + the game)

**Step 1: accounts, sessions, cloud save. Done, 3675f8f.**

- **Sign-in:** a username and password, with a **recovery code** shown once
  at sign-up for a forgotten password. No email.
- **Server, `src/auth.js` + `src/account.js`, on `/api/account`:**
  - Sign up, sign in, sign out, and sign out every other device.
  - Change password, recover with the code, and delete the account.
- **Cloud save, on `/api/account/save`:**
  - The whole profile is stored, plus a small `unlocks` summary: pilots
    open, pilots awake, challenges cleared and reward upgrades held. The PvP
    Worker reads the summary.
  - A write names the revision it was based on. If another device wrote
    first, the game merges the two with `Save.merge` and tries again.
- **In the game:**
  - An ACCOUNT chip in the menu opens a real HTML form over the canvas.
  - Signing in merges both ways. While signed in, the save is pushed at most
    every 30 s.
  - Signing out leaves a fresh guest save.
  - Device-only settings and the profile id never travel.
  - Off in BETA.
- **Tested:**
  - `npm run test:account`.
  - The determinism and lockstep suites.
  - Two browser origins acting as two devices, on every path.

**Step 2: every score in the database, and the leaderboard page. Built on
`pvp`.**

- **Tested:**
  - `npm run test:boards`: 42 checks against the real Worker on SQLite.
    Mutants (no keep-the-better rule, no guest fold-in) are caught.
  - The determinism and lockstep suites still pass.
  - In the browser on `wrangler dev`, with 123 seeded pilots and an account:
    - paging past 100, ties, the podium colours
    - search, and a placement jumping to its page with the row lit
    - YOUR PLACEMENT signed in
    - an empty past day, the PVP tab, phone width
    - the menu's link

- **The `scores` table:** one row per player per board.
  - Boards: each season, all-time, and each day.
  - Today a board is one document holding its top 100, so a run outside the
    top 100 is never kept. From now on every player's best is kept, so
    anyone's placement can be looked up.
  - **Who a row belongs to:** a signed-in account, or a profile linked to
    one, gets one row per board under the account, whatever callsign it
    used. A guest gets one row per callsign, as the boards work today.
  - When a guest later signs in, their guest rows fold into the account's.
  - **The rules stay the same:** season and all-time keep the better run;
    a day keeps its first run.
- **How rows get there:**
  - Every submission writes the row, beside the existing top-100 document,
    which the in-game board keeps using unchanged.
  - The existing boards (and the old Netlify ones, while the sync runs) are
    folded in every 15 minutes. Only documents changed since the last fold
    are read.
- **`/api/boards`:**
  - A page of any board, with ranks.
  - Search by callsign or account name, giving each match's placement on
    every board. Placement is "#N of M", ties sharing a rank.
  - "Me" (signed in, or this device's profile), for a YOUR PLACEMENT card.
  - Profile ids never leave the Worker, as now.
- **`voidrunner.online/leaderboard/`:** its own small files (`index.html`,
  `boards.js`, `boards.css`), not part of the game's file.
  - Tabs: SEASON (with past seasons), ALL-TIME, DAILY (with past days), and
    PVP, which fills in with Phase 5.
  - A search box, the board table with paging, and your own placement up
    top.
  - Signed-in players carry a mark beside their name. It works on phones.
- **In the game:** a FULL LEADERBOARD link where the game shows its board.

**Step 3: awards and dev perks by account. Done.**

- **Signed in, awards are the whole account's.** `?awards` reads podiums,
  hand-outs (`SKIN_GRANTS`, `PERK_GRANTS`, `DEV_PIDS`, old dev-login grants)
  and WELCOME BACK across every pid linked to the account. A podium won on
  one device lands on all of them.
  - Only the profile asking can make a new WELCOME BACK claim or take up an
    old pid. The rest of the account's profiles bring theirs along read-only.
  - Signed out, or with a dead cookie, it's one profile, exactly as before.
  - A pid already linked to another account stays with that account.
- **The vigil pays a quest once per account.** The account's save carries
  the story to every device, and each device would otherwise report it
  again under its own pid. An account's `lit` and `done` are all its
  profiles together.
- **Account perks.** `accounts.perks` is a JSON list: `'dev'` (every skin and
  perk, read live), `'skin:<id>'`, or a perk id. Every device signed in to
  the account collects them. `DEV_PIDS` speak the same language. To give
  perks, run this in the D1 console:
  `UPDATE accounts SET perks = '["dev"]' WHERE name = '…'`.
- **The dev login is signing in.** The DEV ACCOUNT window and `devAuth` are
  gone (old pages get a 410 pointing at ACCOUNT). Typing `notz` at the
  callsign prompt just takes the name.
  - **Claiming:** signing up as `notz` with the old dev password makes the
    account, born with `['dev']`. A wrong password counts as a failed
    sign-in and answers "name taken". The password isn't judged for
    strength again, since it was already the login's.
  - **The scrypt line goes after the claim.** Once `notz` exists on the live
    site, its `DEV_ACCOUNTS` line can be deleted, and the hash leaves the
    repo. Until then it is the only proof of who may take the name.
- **Fixed on the way:** `/api/leaderboard` and `/api/boards` now only *peek*
  at a session (`sessionOf(…, { peek: true })`). Before, filing a run could
  extend the session row without the cookie being sent again. The browser's
  cookie would then run out on its old lifetime while the database thought
  it fresh.
- **Tested:**
  - `npm run test:awards`: 83 checks. Mutants that drop the union, the
    account perks, the comeback union, the vigil rule, the peek, or the
    claim's password or lockout are all caught.
  - The account, boards, determinism and lockstep suites still pass.
  - Browser, on a local Worker with two origins as two devices: a podium
    seeded on one device reaches the other only with the cookie. The
    account's `dev` perk unlocks every pilot and evo on the next sync.
    Typing notz takes the name.

**Shipped to `main` on 4 Oct (50a8d49).** `notz` was claimed on the live site
at 02:43 UTC, born with `["dev"]`.

**Step 4: hardening. Done.**

- **The last dev-login hash is gone.** `DEV_ACCOUNTS`, its claim path in
  sign-up and the scrypt check in `leaderboard.js` are deleted. `notz` is an
  ordinary account with perks. Old grant rows still pay what they banked.
- **Turnstile on sign-up, off until it has keys.** Both `TURNSTILE_SITE_KEY`
  and `TURNSTILE_SECRET` must be set as Worker secrets (README).
  - The answer must say the action was `signup`, so a token earned elsewhere
    can't be spent here. Cloudflare's testing keys name no action and are
    let through, so `wrangler dev` can use them.
  - A check that can't be made refuses. A taken name is answered before any
    token is spent, and sign-in is never asked.
  - The game loads Cloudflare's script only when the sign-up form opens. A
    failed try resets the widget for a fresh token.
  - The widget's hostnames must include `voidrunner.play101.workers.dev`,
    the address school networks reach when they block `.online`. PvP's
    address doesn't need adding: PvP takes no sign-ups (`SIGNUP: "off"`).
- **Signed-in devices.** ACCOUNT → DEVICES lists each session as "Chrome on
  ChromeOS" or similar, read from the User-Agent once at sign-in. Only those
  words are kept.
  - Any other device can be signed out from the list. This device signs out
    with SIGN OUT, which saves first.
  - A session is named by the first 16 hex characters of its id, which is
    the token's hash, so it can't sign anybody in.
  - The new `sessions.device` column is added to existing databases on
    first use (`ADDED` in `auth.js`).
- **Tested:**
  - `npm run test:account`: 148 checks. Mutants that skip Turnstile, drop the
    action check, sign out another account's device, skip the column, or
    lose the "this device" mark are caught.
  - The awards, boards, determinism and lockstep suites still pass.
  - Browser, on `wrangler dev` with the testing keys:
    - The widget renders dark and passes.
    - A refused try gets a fresh token, and sign-up then works.
    - The device list names both sessions, and one tab signs the other out.
    - Step 3's local database gained the column without errors.

Phase 1 is complete. Next is Phase 2, standing up the PvP Worker.

### Phase 2 — The PvP Worker, standing up. Done.

**What was built:**
- **`pvp/`:**
  - `wrangler.jsonc`: `voidrunner-pvp`, on workers.dev only, with the
    game's D1. `SIGNUP: "off"`, so accounts are only ever made in the game,
    and PvP can't be used to skip Turnstile.
  - `src/index.js` routes `/api/account` (the shared `src/account.js`),
    `/api/pvp/me`, and 501s for `/api/pvp/queue` and `/api/pvp/match`.
  - `src/me.js` returns who you are, the account's `unlocks`, your league
    (bronze, to be placed, until ratings exist), and your ranked and casual
    loadouts.
  - `src/rules.js` holds the LEAGUES table, CASUAL and `loadout()`.
    `PILOTS` mirrors the game's CHARS until Phase 3.
  - `src/objects.js` has Matchmaker and Match, SQLite Durable Objects that
    are declared but answer 501.
  - `site/` is the page: sign-in (no sign-up), who you are, league, pilots,
    and BACK TO VOIDRUNNER.
- **Hand-offs** (`src/account.js`, ops `handoff` and `handoff-take`, table
  `handoffs`):
  - A code is 32 random bytes, kept as its SHA-256, single use (spent by
    the `DELETE … RETURNING` that reads it), alive 60 s, and good only at
    the origin it was asked for.
  - Destinations are `SITES` in `auth.js`: the game, its school address,
    and PvP; never the asker, never www. A local `wrangler dev` may hand
    off between localhost addresses, and only from one.
  - If the target is already signed in as the same account, nothing
    changes. If it's signed in as somebody else, the code is refused
    (409): swapping accounts under a save is the game's job, by signing
    out first.
- **The doors:**
  - The game's menu has a pink PVP button under ACCOUNT. It pushes the save
    first, so PvP reads current unlocks, then hands off to PvP with
    `&from=<this address>`. Signed out, it opens the account panel with a
    note.
  - PvP's BACK TO VOIDRUNNER hands off to that `from`: the school address
    for a school player, `.online` otherwise. The game takes `#h=` at
    `Account.boot`.
- **Local dev:**
  - `npm run dev:pvp` serves PvP at 127.0.0.1:8788, on the same local D1 as
    `npm run dev`.
  - Both scripts now pass `--local-upstream`. Without it, wrangler
    reported the game's request URL as `voidrunner.online`, and every local
    hand-off was refused.
- **Tested:**
  - `npm run test:pvp`: 62 checks across both Workers on one database.
    Mutants that let any address take a code, let PvP make accounts,
    allow the asking address, reuse codes, allow localhost from the real
    site, swap accounts silently, or allow paths are all caught.
  - The other suites still pass.
  - Browser, both Workers locally:
    - PVP while signed out opens the sign-in prompt.
    - PVP signed in lands on PvP signed in, with the code gone from the
      address bar.
    - BACK, with the game signed out, signs the game back in.

**Before it ships:** the PvP Worker has to exist. See README, PvP. Until it
does, the PVP button would lead nowhere.

**The original outline:**

1. **The `pvp/` skeleton:**
   - `pvp/wrangler.jsonc`: name `voidrunner-pvp`, the same D1
     `database_id`, `nodejs_compat`, and `workers_dev: true` with no
     custom domain.
   - Durable Object bindings, as SQLite classes so they run on Free.
   - `pvp/src/index.js`:
     - `/api/account`, the shared module.
     - `/api/pvp/me`: who you are, what you've unlocked, your league.
   - A placeholder page in `pvp/site/`, plus `npm run dev:pvp`.
2. **The doors:**
   - A PVP button in the main menu, using the hand-off above. The PvP page
     has BACK TO VOIDRUNNER.
   - Signed-out players are asked to sign in first, with the same panel.

### Phase 3 — PvP runs the game's engine, sealed

**Why not rebuild it (4 Oct).** PvP needs the pilots, every kit and
awakening, the upgrades, THE HACKER's army and two-player lockstep. The
engine already has all of that: TWO PILOTS runs two complete pilots in one
seeded simulation, and LOCKSTEP CO-OP keeps two machines on it. Those systems
are tens of thousands of lines, with their art, and a rebuild would take
weeks and then drift from the game. So PvP uses the engine as it is, and
makes sure nothing it doesn't use is fetched or run.

- **How the engine reaches PvP.**
  - At deploy, `scripts/pvp-build.mjs` writes `pvp/site/play/index.html` from
    the game's `index.html`.
  - The engine script is copied byte for byte, so the snapshot scan and
    `buildId`, which read the script's own text, work unchanged. PvP's own
    scripts go in front of it.
  - The game's head extras are dropped: the AdSense tag and the www
    redirect.
  - The copy is generated and never committed or edited.
  - It is served by the PvP Worker itself, so it works wherever PvP does,
    schools included.
- **PvP mode.** PvP's scripts set `window.VR_PVP` before the engine runs. The
  engine reads it once (`PVP`, at the top) and boots sealed (`pvpSeal`, at
  the foot):
  - No cloud-save library, no local save reads or writes. The profile is
    made in memory from the account's unlocks.
  - No leaderboard, daily, account sync, awards or vigil requests.
  - No ads, and ALL HALLOWS is never live.
  - No menu, name prompt or graphics prompt: PvP's own screens instead.
- **Named hooks, one line each in the engine, doing nothing in the game:**
  - `PVP.start()` at the foot: PvP takes over from boot.
  - `PVP.pilotOpen(id)` in `charOpen`: the account and league decide which
    pilots there are.
  - `PVP.waves(dt)` in `updateWaves`: PvP decides what spawns.
  - `PVP.frame()` once a frame: PvP's own screens and transitions.
  - Later steps add one per rule: pilot-versus-pilot damage, rounds.
- **PvP's files**, sectioned by topic in `pvp/site/js/`:
  - `mode.js`: VR_PVP, what the lobby handed in, and the hook table.
  - `practice.js`: practice in an empty arena.
  - Later: `rules.js` (pilots hurting pilots, rounds), `net.js` (the match
    connection), `draft.js` (cards between rounds).

**Steps** (each pushed to `pvp`, then stop and report):

1. **The engine on PvP's site, sealed. Done.**
   - The lobby's PRACTICE opens `/play/` with your account's pilots, awake
     forms and reward upgrades, in an empty arena.
   - Engine hooks:
     - `PVP`, set once from `window.VR_PVP`.
     - `pvpSeal()`: BETA's seal, plus no local reads (the game's own
       blank profile), board, daily, awards, vigil or account, and ads
       marked failed.
     - `PVP.pilotOpen` in `charOpen`, `PVP.waves` in `updateWaves`, a
       `hlLive` guard, `PVP.frame()` per frame, and `PVP.start()` at the
       foot.
   - PvP's files:
     - `js/mode.js`: what the lobby handed in through `sessionStorage`
       `vr_pvp_play`, the account made into the profile, and the hooks.
     - `js/practice.js`: nothing spawns; leaving or dying goes back to the
       lobby.
   - **Tested:**
     - `npm run test:pvp` adds `scripts/pvp-engine.mjs` (28 checks):
       - the page is built byte for byte;
       - PvP mode boots in Node with every request and script load
         recorded, and makes none;
       - the game itself does make them, so the recorder works.
       - Mutants that unseal the board or daily, give waves back, leave the
         event live, skip `PVP.start`, or use the game's pilot rules are
         all caught.
     - The game's determinism and lockstep suites are unchanged.
     - Browser, real page:
       - Requests are only the fonts, `mode.js` and `practice.js`.
       - The engine is 839 KB compressed, ready in about 1.3 s locally.
       - Flying and firing costs about 0.1 ms to step and 1.1 ms to draw
         each frame at 1280×720 (budget 16.7 ms).
   - **Found and fixed:** the seal first gave the engine `{}` as the
     profile, which crashes the death screen once anything can kill you. It
     now gets the game's own `Save.blank()`.
   - **Before it ships:** the PvP Worker needs the build command
     `node scripts/pvp-build.mjs` and `index.html` in its watch paths
     (README, PvP). Until then `/play/` is missing.
2. **Two pilots, one match.**
   - Two browsers in lockstep on TWO PILOTS, joined by a private code.
   - The Match Durable Object carries the signalling, moving that part of
     Phase 5 forward.
3. **The PvP rules.**
   - Pilots' shots hurt the other pilot (shots already carry `by`).
   - Rounds, best of N, with a round timer.
   - An arena with light hazards instead of waves. THE HACKER's army needs
     bodies to take, so the hazards include a few it can turn.
4. **Loadout and draft.**
   - Your account's unlocks, filtered by the league (Phase 6). The awakened
     form only where the league allows it.
   - Reward upgrades in the pool in every league.
   - Each player drafts their own cards between rounds (`ui('pick')` is
     already per pilot).

**Tests:**
- `npm run test:pvp` grows a PvP-mode engine suite in Node.
- The determinism and lockstep suites gain PvP scenarios.
- The game's own suites must pass unchanged: every hook does nothing when
  `PVP` is null.

### Phase 4 — folded into Phase 3 (steps 3 and 4)

### Phase 5 — Matchmaking, the referee, results

- **The Matchmaker Durable Object, one per queue:**
  - Players hold a WebSocket. Tickets are paired within a league first,
    then by rating, and the window widens the longer someone waits.
  - Region comes from `request.cf`.
- **The Match Durable Object, one per match:**
  - It's the signalling for WebRTC over the socket, replacing the
    `/api/room` polling. TURN credentials come the same way.
  - **The referee.** Both sides send their `lsHash` fingerprint every second
    and their result at the end.
    - The fingerprints agree: the result stands.
    - They differ: the match is void and both are flagged (`pvp_flags`).
    - Someone leaves: they forfeit after a grace period.
  - Lockstep makes this strong. A modified simulation splits from the honest
    one, and the referee sees it.
- **Inputs stay peer-to-peer over TURN**, as in co-op. A relay through the
  Durable Object is the fallback.
- **D1:**
  - `pvp_matches`.
  - `pvp_ratings`: Glicko-2 per account per queue per season, plus the
    league. Seasons reuse `season.js`'s calendar.
- **On the boards:** `/api/pvp/ladder` feeds the leaderboard page's PVP tab
  and its search. A season close pays PvP podiums through the existing
  awards.

### Phase 6 — Leagues, ranked, casual, and the gateways

Two tables, so a new kind of play or a new league is an entry, not code:

```js
// base pilots: VOIDRUNNER and EMBER, the two with nothing to unlock
const LEAGUES = [
  { id: 'bronze',   from: 0,    pilots: 'base', awake: false },
  { id: 'silver',   from: 1200, pilots: 'base', awake: false },
  { id: 'gold',     from: 1500, pilots: 'base', awake: false },
  { id: 'platinum', from: 1800, pilots: 'own',  awake: true  },   // everything goes from here
  { id: 'void',     from: 2100, pilots: 'own',  awake: true  },
];                     // upgrades: your own unlocked ones in every league

const QUEUES = {
  casual: { rated: false, leagues: false, pilots: 'own', awake: true,
            entry: ['signedIn'], after: ['adBreak'], rewards: [] },
  ranked: { rated: true, rating: 'glicko2', leagues: true, season: true,
            entry: ['signedIn', 'accountAge:24h', 'runs:10'],
            after: [], rewards: ['seasonPodium', 'leagueBadge'] },
};
```

- **The league's rules decide the loadout in ranked.** Casual uses your own
  unlocks.
- **New players** start in the lowest league after a few placement matches.
- **`entry`:** gates the Worker checks before a ticket is accepted: signed
  in, account age, runs played. Later: a ticket, a pass, or an event code.
- **`after`:** what happens between matches. `adBreak` reuses the main
  game's ad rules (`ADS.every`, never mid-play). Ranked carries none.
- **`rewards`:** season podiums and league badges, paid as perks or skins
  through the awards list the game already understands.
- **The ad and money gateways hang off these hooks.** A new one is a new hook
  id, not a change to matchmaking.

## The shared data (D1)

Tables are made on first use (`CREATE TABLE IF NOT EXISTS`), like
`store.js`, so there's no migration step to forget.

| Table | Holds | Written by |
| --- | --- | --- |
| `accounts` | id, login name, display name, password hash, recovery-code hash, first pid, perks, created/updated | main (PvP too, via the shared module) |
| `sessions` | SHA-256 of the session token, account, created/seen/expires | both |
| `account_pids` | every profile id linked to an account | main |
| `saves` | per account: revision, the profile, the `unlocks` summary | main (PvP reads) |
| `auth_gate` | rate-limit counters for sign-in, sign-up and recovery | both |
| `scores` | per board and player: callsign, account, pid (never shown), score and the run's stats, when | main |
| `pvp_ratings` | account, queue, season, rating, deviation, volatility, league, W/L | PvP |
| `pvp_matches` | id, queue, league, seed, players, result, fingerprints, at | PvP |
| `pvp_flags` | account, match, reason | PvP |

## Security, briefly

- **Passwords:** scrypt (N=2^14, r=8, p=1, 16-byte salt), stored with its
  cost so it can be raised later. About 45 ms of CPU each.
- **Sessions:** a 32-byte token, of which only the SHA-256 is stored.
  - The cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, and lasts 90
    days, renewed at most once a day while in use.
  - Changing or recovering the password ends every other session.
- **Hand-off codes** are single use, last 60 seconds, are stored hashed, and
  travel after the `#` only.
- **Cross-site requests:** every write must be JSON and come from an allowed
  Origin. The SameSite cookie is a second wall.
- **Rate limits** are set generously, because a classroom shares one
  address:
  - Failed sign-ins count per address and name, and per address.
  - Sign-ups count per address per hour.
- **Names:** 3–16 characters of `a-z 0-9 _ -`, unique regardless of case.
  Dev account names and words like `admin` are reserved.
- **Trust:** the `unlocks` summary and scores are the client's word. Leagues
  and the referee keep ranked matches honest, since a modified simulation
  splits from the honest one.

## Still open (none block Phase 2)

1. **"Base pilots" in low leagues:** I've read it as VOIDRUNNER and EMBER,
   and not awakened. Should EMBER's evo be allowed down there?
2. **League cutoffs:** the numbers above are placeholders until there are
   real matches to tune them on.
3. **The in-game board:** should it switch over to the new `scores` table
   (so it agrees with the page exactly), or keep its top-100 document?
4. **Mario (`DEV_PIDS`):** his perks stay keyed by his pid, since he has no
   account yet. If he makes one on that pid, every device he signs in on gets
   them. Once he has one, it can carry `['dev']` itself and his line can go.
