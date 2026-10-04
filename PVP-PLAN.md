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
- **Standalone by nature.** PvP's code lives in its own small files, and the
  main game's code is split into small files too (Phase 3). Nothing PvP adds
  a section to `index.html`.
- **A standalone leaderboard page** where anyone can search for any player's
  placement and scores, with a PVP tab.

## Decided (your answers, 3 Oct)

1. **Sign-in:** a username and password is enough for now.
2. **Leagues:** in higher leagues everything goes. In low leagues only the
   base pilots, but unlocked upgrades stay.
3. **Address:** the Worker's own URL, with a redirect button on the main page.
4. **Files:** the split files become the source we edit. PvP is standalone:
   no new section in the main file.
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
  - Build watch paths `pvp/*`, `src/auth.js`, `src/account.js`.
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
  - When PvP serves `account.js` on workers.dev, its hostname has to be
    added to the widget.
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

### Phase 2 — The PvP Worker, standing up

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

### Phase 3 — One engine, small files, two sites

The match has to run the *same* simulation on both machines, and lockstep
refuses two different builds (`buildId`). So the PvP page loads the game's
own code, not a copy that drifts.

- **The split. These files become the source we edit.**
  - The game's inline script is cut, once, at its own block banners, into
    ordered classic scripts: `game/01-core.js`, `game/02-chars.js`, …,
    `game/NN-accounts.js`.
  - They stay in global scope, so nothing changes in behaviour.
  - `index.html` becomes the page and a list of files.
- **What has to change with it:**
  - `SNAP_SRC` / `snapScan` read `document.currentScript.text`, which is
    empty for an external script. They'll read the files' text instead.
  - `buildId` becomes a hash of every file the page loaded.
  - `scripts/lib/game-vm.mjs` loads the files in order.
  - Every tool that patches `index.html` gets pointed at the files.
- **The proof:** `npm test` and `npm run test:lockstep` give the same results
  before and after the split.
- **PvP stays out of the game's files.** The PvP page loads the game's files
  from voidrunner.online, then its own `pvp/site/*.js`.
  - PvP plugs in through a small, named set of hooks that the engine calls
    and that do nothing in the main game: rules, damage between pilots, and
    round start and end.

### Phase 4 — PvP inside the simulation (in `pvp/site/`, not in the game's files)

- **The PvP rules:** an arena, rounds (best of N), a round timer, pilots'
  shots hurting the other pilot, and light hazards instead of waves.
  - Shots already carry `by`, and TWO PILOTS already runs each pilot's
    input, weapons, kit and hits as itself.
- **Loadout:** your account's `unlocks`, filtered by the league (Phase 6).
  - The pilot comes from `chars`.
  - The awakened form is allowed if the pilot is in `awake` and the league
    allows it.
  - The card pool includes your reward upgrades (`ups`) in every league.
  - Between rounds each player drafts from their own cards. `ui('pick')` is
    already per pilot.
- **Tests:** PvP scenarios in the determinism and lockstep suites.

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
