# VOIDRUNNER PvP — the plan

Branch: `pvp`. Nothing here reaches `main` (and so voidrunner.online) until a
phase is finished and you say ship. This file is `.md`, so `.assetsignore`
keeps it off the public site.

## What we are building

- **PvP on its own Worker**, `voidrunner-pvp`, at `pvp.voidrunner.online`.
  It's a separate deploy from the main game, so a PvP bug can't take the
  game down, and the PvP code stays in smaller files.
- **The same D1 database** (`voidrunner`), so the PvP ladder sits beside the
  existing boards and seasons, and both Workers read the same accounts.
- **Your progress carries over.** The pilots you've unlocked, which ones are
  awake (evo), and the reward upgrades you've earned in the main game decide
  what you can bring into PvP.
- **Built on co-op's lockstep.** Both machines run the same match from the
  same seed and swap inputs only. TWO PILOTS already gives each player a
  whole pilot.
- **Queues stay general.** Ranked and casual are two entries in one queue
  table. Ads, entry rules and rewards are hooks on a queue, so later queues
  (events, tournaments, sponsored) are config, not new code.
- **A button in each game** to go to the other.

## Why accounts come first

1. **A save belongs to the address it was made on.** `pvp.voidrunner.online`
   can't read `voidrunner.online`'s localStorage. The only way to get unlocks
   across is for a server to hold them, and only a login can say whose they
   are.
2. **Today's identity is a `pid`.** It's a random id made inside one
   browser. It's a claim ticket, not a login: anyone can make a thousand.
   A ranked ladder needs an identity that costs something to make and
   can't be copied out of a leaderboard.
3. **It's worth having anyway.** Accounts mean cloud saves across devices,
   so step 1 can ship to the main game alone, before any PvP exists.

## How it fits together

```
 voidrunner.online  (Worker: voidrunner)        pvp.voidrunner.online  (Worker: voidrunner-pvp)
 ─────────────────────────────────────────      ────────────────────────────────────────────
 index.html — the game                          the PvP page + its chunks
 /api/leaderboard  /api/room  /api/turn         /api/pvp/queue   WebSocket → Matchmaker DO
 /api/account      sign up, sign in, save       /api/pvp/match   WebSocket → Match DO (referee)
                                                /api/pvp/ladder  ratings for the boards
                 │                                                │
                 └──────────── D1 "voidrunner" ───────────────────┘
                   accounts · sessions · account_pids · saves      (Phase 1, main Worker writes)
                   pvp_ratings · pvp_matches · pvp_flags           (Phase 5, PvP Worker writes)
```

- **One sign-in for both.** The session cookie `vr_s` is set for
  `voidrunner.online` with `Domain=voidrunner.online`, so the browser sends it
  to `pvp.` too. Both Workers check it against the same `sessions` table.
- **Shared code.** `src/auth.js` holds the schema, the session check and the
  cookie rules. The PvP Worker imports it (`pvp/src/*` → `../../src/auth.js`),
  so there's one copy of what a session means.
- **Deploying the second Worker (dashboard, once):** Workers & Pages →
  Create → Import a repository → `vz-12/chromebook-gamez`. Set it up like
  this:
  - Root directory `/`.
  - Deploy command `npx wrangler deploy -c pvp/wrangler.jsonc`.
  - Build watch paths `pvp/*`, `src/auth.js`.
  - The main Worker gets watch paths that exclude `pvp/*`, so a PvP change
    doesn't redeploy the game.

## Phases

Each step is pushed to `pvp`, then I stop and report. A phase goes to `main`
when you say so.

### Phase 1 — Accounts (main Worker + the game)

**Step 1: accounts, sessions, cloud save. Built on `pvp`, not on `main`
yet.**

- **Tested:**
  - `npm run test:account`: 104 checks against the real Worker and a real
    SQLite database. Mutants (no origin check, no revision check, no lock)
    are caught.
  - `npm test --quick` and `npm run test:lockstep` still pass. Account code
    is kept out of the run, as `SNAP_LOCAL_OBJS`.
  - In the browser on `wrangler dev`, two separate origins acted as two
    devices:
    - sign-up, the code, a wrong password, and sign-in with a union merge
      both ways
    - a stale write merged and retried
    - a password change signing the other device out
    - recovery
    - sign-out to a fresh guest
    - deletion
    - the panel at phone width

- **Sign-in method: a username and password.** No email, no Google.
  - It works on a school Chromebook. A managed Google account often blocks
    third-party sign-in for under-18s.
  - It collects nothing personal, which matters on a site with ads that
    children play.
  - Forgotten passwords use a **recovery code**, shown once at sign-up.
  - Google and Discord sign-in can be added later as extra ways into the same
    account (an `identities` table), without changing anything here.
- **Server, `src/auth.js` + `src/account.js`, on `/api/account`:**
  - Sign up, sign in and sign out.
  - Sign out every other device.
  - Change password, recover with the code, and delete the account.
- **Cloud save, on `/api/account/save`:**
  - The whole profile is stored per account, plus a small `unlocks` summary:
    pilots open, pilots awake, challenges cleared and reward upgrades held.
    The PvP Worker reads that summary.
  - A write names the revision it was based on. If another device got there
    first, the game merges the two with `Save.merge`, the same rule its two
    local stores already use, and tries again.
- **What the game does with it:**
  - An **ACCOUNT** chip in the menu's left column opens a sign-in panel. It's
    a real HTML form over the canvas, so password managers and phone
    keyboards work.
  - **Signing in** merges this device's save into the account (the union:
    nothing earned on either side is lost).
  - **While signed in**, the save is pushed after changes, at most every 30
    seconds and once more when the tab is hidden.
  - **Signing out** pushes first, then leaves a fresh guest save, so the next
    person on a shared computer doesn't inherit it.
  - Device-only settings (graphics, measured costs, volume, sensitivity,
    the pilot last picked) and the profile id never travel.
- **Off in BETA.** The beta build unlocks everything and must never write
  that into a real account.

**Step 2: awards and dev perks by account.**
- `?awards` signed in: podiums, grants, vigil and WELCOME BACK are read
  across every pid linked to the account, so a podium won on one device lands
  on all of them.
- `DEV_ACCOUNTS` / `DEV_PIDS` become rows with `perks` on real accounts. The
  dev login turns into signing in to that account. The scrypt lines in
  `leaderboard.js` then go.
- Leaderboard rows from a signed-in player carry the account, which ranked
  will need.

**Step 3: hardening.**
- **Turnstile on sign-up.** It's off until you create a site key, the same
  way TURN and ads wait for theirs.
- A list of signed-in devices.
- An updated privacy page. (Step 1 already updates the basic wording.)
- The expired-session sweep on the daily cron (built in step 1).

### Phase 2 — The PvP Worker, standing up

1. **The `pvp/` skeleton:**
   - `pvp/wrangler.jsonc`: name `voidrunner-pvp`, the same D1
     `database_id`, `nodejs_compat`, and custom domain
     `pvp.voidrunner.online`.
   - Durable Object bindings, as SQLite classes so they run on Free.
   - `pvp/src/index.js` with `/api/pvp/me`, which answers who you are and
     what you've unlocked from the session cookie.
   - A placeholder page, plus `npm run dev:pvp`.
2. **The doors between the two:**
   - A PVP chip in the main menu goes to `pvp.voidrunner.online`. The PvP
     page has BACK TO VOIDRUNNER.
   - Signed-out players are asked to sign in first. The PvP page reuses the
     same panel, so there's no second login.

### Phase 3 — One engine, two sites, smaller files

The match has to run the *same* simulation on both machines, and lockstep
refuses two different builds (`buildId`). So the PvP page needs the game's
own code, not a copy that drifts.

- **The split:** the game's inline script is cut, once, at its own block
  banners into ordered classic scripts (`/g/01-core.js`, `/g/02-chars.js`,
  …). They're still global scope, so nothing changes in behaviour.
  `index.html` becomes the page plus a list of chunks. The PvP page loads
  the same chunks plus its own `pvp/*.js`.
- **What has to change with it:**
  - `SNAP_SRC` / `snapScan` read `document.currentScript.text`, which is
    empty for an external script. They need the chunk texts, either fetched
    or from a build manifest.
  - `buildId` becomes a hash of the chunks.
  - `scripts/lib/game-vm.mjs` loads the chunks in order.
- **The proof:** `npm test` and `npm run test:lockstep` pass unchanged before
  and after the split.
- **Decision for you:** the chunks become the source we edit (what "smaller
  files" asks for), or `index.html` stays the source and a build step makes
  the chunks. I recommend the first, since a build step adds a way to ship the
  wrong thing.

### Phase 4 — PvP inside the simulation

- **A `PVP` ruleset beside `Chal`/`Rush`/`Daily`:** an arena, rounds (best of
  N), a round timer, pilots' shots hurting the other pilot, and light hazards
  instead of waves.
  - Shots already carry `by`, and TWO PILOTS already runs each pilot's
    input, weapons, kit and hits as itself.
- **Loadout from the account's `unlocks`:**
  - The pilot comes from `chars`.
  - The awakened form is available if the pilot is in `awake`.
  - The card pool includes the reward upgrades in `ups`.
  - Between rounds each player drafts from their own cards. `ui('pick')` is
    already per pilot.
- **The queue sets the rule.** `loadout: 'own'` (your unlocks) or `'all'`
  (everything open, for a level ranked field). See Phase 6.
- **Tests:** new PvP scenarios in `determinism.mjs` and `lockstep.mjs`.

### Phase 5 — Matchmaking, the referee, results

- **The Matchmaker Durable Object, one per queue:**
  - Players hold a WebSocket. Tickets are paired by rating, and the window
    widens the longer someone waits.
  - Region comes from `request.cf`.
- **The Match Durable Object, one per match:**
  - It's the signalling for WebRTC over the socket, replacing the `/api/room`
    polling. TURN credentials come the same way (the same secrets on this
    Worker).
  - **The referee.** Both sides send their `lsHash` fingerprint every second
    and their result at the end.
    - The fingerprints agree: the result stands.
    - They differ: the match is void and both are flagged (`pvp_flags`).
    - Someone leaves: they forfeit after a grace period.
  - Lockstep makes this strong. A modified simulation splits from the
    honest one, and the referee sees it.
- **Inputs stay peer-to-peer over TURN**, as in co-op. A WebSocket relay
  through the Durable Object is the fallback if needed, at the cost of the
  Free plan's request allowance.
- **D1:**
  - `pvp_matches`: who, the queue, the seed, the result and the
    fingerprints.
  - `pvp_ratings`: Glicko-2 per account per queue per season. Seasons reuse
    `season.js`'s calendar.
- **Leaderboard support:**
  - `/api/pvp/ladder`.
  - The main game's leaderboard gets a PVP tab that reads it. It's the same
    database, so a season close can pay PvP podiums through the existing
    awards.

### Phase 6 — Ranked, casual, and the gateways

One table, so a new kind of play is a new entry:

```js
const QUEUES = {
  casual: { rated: false, loadout: 'own', entry: ['signedIn'],
            after: ['adBreak'], rewards: [] },
  ranked: { rated: true, rating: 'glicko2', loadout: 'all', season: true,
            entry: ['signedIn', 'accountAge:24h', 'runs:10'],
            after: [], rewards: ['seasonPodium'] },
};
```

- **`entry`:** gates checked by the Worker before a ticket is accepted. Kinds:
  - Signed in.
  - Account age.
  - Runs played.
  - Later: a ticket, a pass, or an event code.
- **`after`:** what happens between matches.
  - `adBreak` reuses the main game's ad rules (`ADS.every`, never mid-play).
  - Ranked carries none.
- **`rewards`:** season podiums, paid as perks/skins through the awards list
  the game already understands.
- **The ad and money gateways hang off these hooks.** A new one is a new
  hook id, not a change to matchmaking.

## The shared data (D1)

Tables are made on first use (`CREATE TABLE IF NOT EXISTS`), like
`store.js`, so there's no migration step to forget.

| Table | Holds | Written by |
| --- | --- | --- |
| `accounts` | id, login name, display name, password hash, recovery-code hash, first pid, perks, created/updated | main |
| `sessions` | SHA-256 of the session token, account, created/seen/expires | main (PvP reads) |
| `account_pids` | every profile id linked to an account | main |
| `saves` | per account: revision, the profile, the `unlocks` summary | main (PvP reads) |
| `auth_gate` | rate-limit counters for sign-in, sign-up and recovery | main |
| `pvp_ratings` | account, queue, season, rating, deviation, volatility, W/L | PvP |
| `pvp_matches` | id, queue, seed, players, result, fingerprints, at | PvP |
| `pvp_flags` | account, match, reason | PvP |

## Security, briefly

- **Passwords:** scrypt (N=2^14, r=8, p=1, 16-byte salt), the same as the
  dev login today.
  - Stored as `scrypt$14$8$1$salt$hash`, so the cost can be raised later
    (rehashed at the next sign-in).
  - About 45 ms of CPU each. The Free plan tolerates that now and then, and
    Paid lifts it.
- **Sessions:**
  - The token is 32 random bytes. Only its SHA-256 is stored.
  - The cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, and lasts 90
    days, renewed at most once a day while in use.
  - Changing or recovering the password ends every other session.
- **Cross-site requests:** every write must be JSON and come from an allowed
  Origin. The SameSite cookie is a second wall.
- **Rate limits:**
  - Failed sign-ins count per address and name, and per address.
  - Sign-ups count per address per hour.
  - Both are set generously, because a classroom shares one address.
- **Names:**
  - 3–16 characters of `a-z 0-9 _ -`, unique regardless of case.
  - Dev account names and a few words like `admin` are reserved.
- **Trust:** the `unlocks` summary is the client's word, the same as a score
  is. Ranked can choose `loadout: 'all'` so it doesn't matter. Lockstep and the
  referee keep the match itself honest.

## Open questions

1. **Sign-in methods** past username and password: Google, Discord, or
   neither for now?
2. **Ranked loadout:** your own unlocks, or everything open?
3. **The PvP address:** is `pvp.voidrunner.online` OK?
4. **Phase 3:** do the chunks become the source we edit (recommended), or
   stay a build output?
5. **Leaderboard:** a separate PVP tab (planned), or should ranked results
   also count toward the main season board?
