# chromebook-gamez

VOIDRUNNER — a single-file neon roguelite arena shooter, hosted on
**Cloudflare Workers**.

## How it is put together

| Piece | What it is |
| --- | --- |
| `index.html`, `check.html`, `privacy.html`, `hl-art.js` | The game, the deployment check page, the privacy page, and the ALL HALLOWS art. Served as static files. |
| `leaderboard/` | The standalone leaderboard page at `/leaderboard/`: every board, every pilot, and a search. Its own small files, not part of the game's. |
| `src/` | The Worker: `/api/leaderboard` (boards, seasons, awards, vigil, dev logins), `/api/room` (LAN co-op signalling), `/api/turn` (the co-op relay) and `/api/account` (accounts and cloud saves). Never served to players. |
| D1 database `voidrunner` | Where the leaderboard, co-op rooms and accounts are stored. |
| Cron trigger `5 0 * * *` | Closes a finished season at 00:05 UTC every day. |
| Cron trigger `*/15 * * * *` | Merges in the old Netlify leaderboard store (see below). |
| Custom domain `voidrunner.online` | Where players go. `www` redirects to it. |
| `wrangler.jsonc` | All of the above, as config. |
| `.assetsignore` | Files that must never be uploaded as part of the site. |
| `_headers` | Response headers for the static files. |

### What gets published

There is no build step. Cloudflare uploads the static files straight from the
repo root, skipping everything listed in `.assetsignore`: `node_modules`,
dotfiles, `src/`, `scripts/`, `package*.json`, `wrangler.*`, `CNAME`, and any
`.md` or `.txt` file. The `.txt` rule keeps the ALL HALLOWS drafts private. A
new image or script added beside `index.html` is published automatically.

Cloudflare refuses any single file over **25 MiB**. The game is about 2.4 MB.
The first deploy failed only because it uploaded
`node_modules/workerd` (128 MiB), which `.assetsignore` now keeps out.

## Publishing

Every push to `main` deploys automatically through Cloudflare's GitHub
integration (Workers Builds). Uploading files on GitHub counts as a push. Pull
requests get a preview build first, and its result shows up as a check on the
PR.

Workers & Pages → `voidrunner` → Settings → Build should read:

- Git repository: `vz-12/chromebook-gamez`
- Production branch: `main`
- Build command: empty
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

After a deploy, open `https://voidrunner.online/check.html`. Every line should
be green except "Fireproof", which only warns if a network blocks esm.sh.

### The domain (voidrunner.online)

The game lives at **voidrunner.online**. The domain is attached to the Worker
in `wrangler.jsonc` (`routes`), so every deploy keeps it attached and there
is nothing to set in the dashboard. Deploying creates the DNS records and
the certificate.

- **The domain must be an active zone in the same Cloudflare account.** A
  domain bought through Cloudflare is one already. One bought elsewhere has to
  be added (Cloudflare → Add a domain) and the registrar's nameservers changed
  to the two Cloudflare gives; it is active once Cloudflare sees them.
- **If a deploy fails at the domain step,** the zone usually still has DNS
  records left over from the registrar (a parking page) for `voidrunner.online`
  or `www`. Delete those in the zone's DNS page and deploy again.
- **www.voidrunner.online** is attached as well. The game sends anyone who
  lands there to `voidrunner.online` before loading anything, because a save
  belongs to the address it was made on.
- **The workers.dev address** (`voidrunner.play101.workers.dev`) stays up
  (`workers_dev` in `wrangler.jsonc`), and it is **the address for school
  networks**: filters such as Cisco Umbrella often block `.online` but let
  `workers.dev` through. Everything works there: the game, `/leaderboard/`,
  accounts, co-op. Every link and API call is relative, so nothing sends a
  player back to `.online`; keep it that way, and never redirect this address.
  Saves made there stay there, but signing in to an account carries progress
  between the two addresses.

The `CNAME` file is not used by Cloudflare and is not published.

## Scores from the old Netlify site

Everything saved before the move, and anything players still set on the old
Netlify address, lives in the Netlify site's blob store. Every 15 minutes
`src/sync.js` pulls that store through the Netlify site's key-protected export
endpoint and **merges** it into D1, so nothing set on either side is lost:

- **Season and all-time boards:** one row per name, and the better score stands.
- **Daily boards:** one row per name, and the earlier run stands.
- **Season archive** (which pays podium skins): Netlify's seasons are added
  where D1 has none.
- **Dev-account grants:** per profile, the union of skins and perks.
- **ALL HALLOWS vigil:** per profile, the union of quests done, with the candle
  counts recomputed so no quest is paid twice.

Where to pull from, and the key, are in the D1 row `voidrunner-sync/config`,
never in the repo. The result of the last run is in `voidrunner-sync/state`.
To stop syncing, delete the config row. The export endpoint stops answering on
2026-10-15; after that, delete `src/sync.js`, its call in `src/index.js` and its
cron, and the Netlify site.

## Co-op relay (TURN)

Co-op connects through Cloudflare Realtime TURN, so two players can join from
any networks. The game asks `GET /api/turn` (`src/turn.js`) for short-lived
credentials before each host or join, and holds the link to the relay
(`NET_RELAY_ONLY` in `index.html`).

It needs a TURN key, which only the Worker ever sees:

1. Cloudflare dashboard → **Realtime → TURN Server → Create**. Note the
   **Turn Token ID** and the **API Token**.
2. Workers & Pages → `voidrunner` → **Settings → Variables and Secrets**.
   Add both as type **Secret**, so a deploy never clears them:
   `TURN_KEY_ID` and `TURN_KEY_API_TOKEN`.

Until both are set, `/api/turn` answers 503 and co-op falls back to the old
direct connection (same network only). Each address can get 30 sets of
credentials an hour. Relayed data is billed at $0.05/GB after the first
1,000 GB a month.

## Accounts

Players can make an account in the game (ACCOUNT, in the menu's left column)
with a name and a password. There is no email. The account keeps a copy of
the save, so a player's progress follows them to any device they sign in on,
and to PvP (see `PVP-PLAN.md`).

- **The server** is `src/account.js` (`/api/account`, `/api/account/save`).
  What a session is lives in `src/auth.js`, which PvP's Worker will share.
- **The tables** (`accounts`, `sessions`, `account_pids`, `saves`,
  `auth_gate`) are made in D1 on first use. There is nothing to set up.
- **Passwords** are scrypt hashes. A forgotten password is reset with the
  recovery code the game shows once at sign-up.
- **Sessions** are an HttpOnly cookie, `vr_s`, set for the whole of
  `voidrunner.online`. Expired sessions are swept by the daily cron.
- **The save** is merged with the device's own save through `Save.merge`,
  in both directions, so nothing earned on either side is lost.
- **Not uploaded:** graphics settings, measured costs, volume, aim, the last
  pilot picked, and the profile id stay on each device.
- **Signing out** leaves the device a fresh guest save.
- **Devices:** ACCOUNT → DEVICES lists everywhere the account is signed in
  (browser and system, e.g. "Chrome on ChromeOS") and signs out any one of
  them.
- **Accounts are off in the beta build.**

### Turnstile on sign-up (off until it has keys)

Sign-up can ask Cloudflare Turnstile whether a person is there. Sign-in is
never asked. It stays off until the Worker has both keys:

1. Cloudflare dashboard → **Turnstile → Add widget**, mode **Managed**, with
   all three hostnames: `voidrunner.online`, `www.voidrunner.online` and
   `voidrunner.play101.workers.dev` (the school-network address; leave it
   out and nobody can sign up there). Note the **Site Key** and the
   **Secret Key**.
2. Workers & Pages → `voidrunner` → **Settings → Variables and Secrets**.
   Add both as type **Secret** (a deploy clears plain variables, never
   secrets): `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET`.
3. Add a line about it to `privacy.html`: Turnstile is Cloudflare checking
   the browser at sign-up.

The game is handed the site key by `GET /api/account` and loads Cloudflare's
script only when the sign-up form opens. To try it locally, Cloudflare's
testing keys always pass:
`npm run dev -- --var TURNSTILE_SITE_KEY:1x00000000000000000000AA --var TURNSTILE_SECRET:1x0000000000000000000000000000000AA`.

```sh
npm run test:account                       # about 5 seconds
```

The test runs the real Worker against a real SQLite database (Node's own
`node:sqlite`, through `scripts/lib/d1-sqlite.mjs`). It plays every way into
and out of an account:

- sign-up rules
- wrong answers that all look the same
- the rate limits
- recovery
- changing the password
- the save's compare-and-swap
- writes from another site being refused
- deleting the account
- Turnstile, with Cloudflare's answer stubbed
- the device list, and signing out one device from another

## PvP

PvP is its own Worker, `voidrunner-pvp`, at
`https://voidrunner-pvp.play101.workers.dev`, on the game's D1 database
(`pvp/`, and `PVP-PLAN.md` for the whole plan). The game's menu has a PVP
button under ACCOUNT. It carries the signed-in player across with a one-time
hand-off code. PvP's BACK TO VOIDRUNNER brings them back the same way, to
whichever address they came from. Accounts are made in the game, never on
PvP.

**Setting up the second Worker (dashboard, once, before PvP ships):**

1. Workers & Pages → **Create → Import a repository** →
   `vz-12/chromebook-gamez`.
2. Worker name **`voidrunner-pvp`**. Root directory `/`. Production branch
   `main`.
3. Build: deploy command **`npx wrangler deploy -c pvp/wrangler.jsonc`**.
   Build watch paths: include `pvp/*`, `src/auth.js` and `src/account.js`.
4. On the game's own Worker (`voidrunner`), add `pvp/*` to the build watch
   paths' **exclude** list, so a PvP-only change doesn't redeploy the game.

Its first build fails until `pvp/` is on `main`; that's harmless.

```sh
npm run dev:pvp                            # PvP at http://127.0.0.1:8788, beside npm run dev
npm run test:pvp                           # under a second
```

Open the local game at `http://localhost:8787` and PvP at
`http://127.0.0.1:8788`. The two host names keep two cookie jars, as the
real sites do.

## The leaderboard page

`voidrunner.online/leaderboard/` lists every player on every board. That
covers the season and past seasons, all-time, and the daily and past days,
plus a PVP tab that fills in when PvP opens. The game's menu links to it
from under its GLOBAL TOP 5.

- **What it offers:**
  - A search by callsign or account name gives a placement on each board.
    A placement opens its page with the row lit.
  - YOUR PLACEMENT is shown for whoever is signed in. Otherwise it's for the
    save this browser plays under.
- **Where the rows come from:**
  - The boards in the game are one document each, holding only the top
    100. `src/boards.js` keeps a `scores` row for every player on every
    board.
  - Every run filed through `/api/leaderboard` writes its row too.
  - Every 15 minutes the board documents are folded in, which carried over
    everything from before and whatever the Netlify sync merges.
- **Whose a row is:**
  - A signed-in player, or a profile linked to an account, has one row per
    board under the account. Guests have one per callsign, as the boards
    always have.
  - A guest who signs in brings their rows into the account.
- **`/api/boards`:** a page of a board, a search, or a player's own
  placement. Profile ids and account ids never leave the Worker.
- **The art is `leaderboard/art.js`.** Every picture on the page is a named
  hook in it, drawn on a canvas each frame. The hooks are `backdrop`,
  `crest`, `podium`, `medal`, `card`, `empty` and `league`, plus `theme`,
  the colours the stylesheet reads. The file's header lists what each is
  handed and how big it is.
  - Redraw a hook in place: the page picks it up on the next load, with
    nothing to lift.
  - A hook that throws is reported once in the console and leaves only its
    own canvas blank.
  - Reduced motion freezes the clock.

```sh
npm run test:boards                        # a few seconds
```

## Dev accounts

A dev account is an ordinary account with perks: `accounts.perks` in D1,
for example `["dev"]` for everything. Every device signed in to it collects
them. To give some, run this in the D1 console:

```sql
UPDATE accounts SET perks = '["dev"]' WHERE name = 'somebody';
```

The perk language, the profile handouts (`DEV_PIDS`, `SKIN_GRANTS`,
`PERK_GRANTS`) and the old dev logins (`DEV_ACCOUNTS`, claimed by signing up
with the same name and password) are documented in `src/leaderboard.js`. A
profile that signed in on Netlify keeps its grants through the sync above.

```sh
npm run test:awards                        # about a second
```

## Ads

The game has room for one Google AdSense banner. It sits across the top of the
main menu and appears now and then: only after a finished run, at most once a
page load and once every 15 minutes, never during play, and only where it fits
beside the menu. It is off until it is given an ad unit id:

1. In AdSense, add the site `voidrunner.online` and get it approved. AdSense
   asks for a privacy policy; that is `https://voidrunner.online/privacy`.
2. Create one **display** ad unit. Keep **Auto ads off** for the site, or
   Google places its own ads anywhere, runs included.
3. If many players are under 13, turn on AdSense's child-directed treatment for
   the site.
4. In `index.html`, fill in `ADS.slot`. `ADS.client`, the
   `google-adsense-account` meta tag and `ads.txt` already carry the publisher
   id `pub-3461416270406814`; `.assetsignore` lets `ads.txt` through its rule
   against `.txt` files.

How often it shows is `ADS.every`; the smallest window it shows in is
`ADS.minW` × `ADS.minH`.

## Running it locally

```sh
npm run dev          # http://localhost:8787
```

This serves a snapshot of the repo, filtered by `.assetsignore` exactly as a
deploy would be, so restart it after editing the game. It uses a local copy of
D1, not the real database. To try ALL HALLOWS outside its dates:
`npm run dev -- --var VIGIL_ANYTIME:1`. To fire the daily season close by hand:
`npm run dev -- --test-scheduled`, then open
`http://localhost:8787/__scheduled?cron=5+0+*+*+*`.

## The determinism test

```sh
npm test                                   # about 5 minutes
node scripts/determinism.mjs --quick       # about 2 minutes
node scripts/determinism.mjs --only rush,keeper
node scripts/determinism.mjs --diagnose hacker --fields
node scripts/determinism.mjs --restore amalgam
```

Co-op is moving to lockstep: both machines run the same game and send only
their inputs. That only works if the same seed, inputs and run settings give
the same game, step for step, on any machine. The test plays 14 scenarios
twice: the four pilots, Boss Rush, the finales, the rites and ALL HALLOWS'
area. Run A is never drawn and has every effect off. Run B is drawn to a stub
canvas with every effect on, at another window size, while the keyboard,
mouse, autofire and the save's flags are scrambled every step. The two must
match at every second of game time. It also checks that a different seed
changes the run, and that a planted unseeded roll is caught.

Run C checks the snapshots that lockstep's safety net sends. A second copy
of the game, loaded on its own, takes over a snapshot of run A a third of
the way in and plays the rest like run B. It must match run A from there on.
A snapshot holds every top-level `let` in the game and every container the
run writes into, apart from what is each machine's own (`SNAP_LOCAL`,
`SNAP_LOCAL_OBJS`: the screen, the menus, the link, the save, the drawing's
caches and particles). The game finds those names by reading its own script
(`snapScan`), so a new variable is included without being listed. `npm test`
starts Node with `--expose-internals` so the test can hold that reading to a
real parse.

If run C parts, the snapshot left out something the run needs.
`--restore name` prints the first field that differs. A value that cannot
travel (a closure made during the run, a canvas) fails the scenario and is
named.

It needs only Node, with no browser and no packages: the game's script runs
in a bare context with the canvas, audio, storage and network stubbed out.
`--diagnose` replays one scenario with each of run B's differences on its
own, to name the cause of a split. `--fields` then narrows a save-flag split
to the flag.

The rules it holds the game to:

- **Randomness:** what changes the game rolls `simRand` / `simRnd` /
  `simRndi` / `simPick`, the run's seeded stream. What only paints or sounds
  rolls `rnd` / `rndi` / `pick`.
- **Input:** the game reads a pilot only through its input record, `P.in`.
  Keys that act are queued (`inputPress`) and played on the next step
  (`playKey`).
- **Screen and clocks:** the game never reads the window, the camera or the
  wall clock. It uses `runView` for the window, `simAfter` and `simTick` for
  time, and never `setTimeout`. It never reads what the drawing wrote.
- **The save:** the save's flags are read from `RUN`, frozen when the run
  starts. Progress goes through `runSet`. Each run zeroes its counters in
  `resetGame`.
- **State is data:** the run keeps no closures. A delayed act is a name
  (`simAfter(sec, 'sitDown')`), and a shop item points at its table
  (`SHOP_SVC`). A table filled as the script loads goes in `SNAP_TABLES`.

## The lockstep test

```sh
npm run test:lockstep                      # about a minute
node scripts/lockstep.mjs --only bad --short
```

Co-op is lockstep: both machines run the whole game and send each other
only their inputs. The old mode, where the host streamed pictures of the
room to the guest, was removed on 3 Oct 2026. Two players need the same
build: the hello carries a hash of each side's script, and different builds
refuse to connect and ask both players to reload.

The test runs two copies of the game in one process, a host and a guest,
joined by a fake link with latency, jitter, reordering and packet loss. Each
copy has its own frame rate, window and save. A bot flies each pilot through
its own machine's input. The machines trade only the run's header (seed,
view, the host's `RUN`, both pilots, the input delay) and input records. Both
fingerprint the game every second of game time, and the fingerprints must
match. The four links are a LAN, an ordinary internet link, a bad one where
the guest's machine also freezes for almost two seconds, and two players
whose saves disagree. Both scripts load the game through
`scripts/lib/game-vm.mjs`.

Each player flies a whole pilot of their own: their character, weapon,
build, level and kit (TWO PILOTS in the game). The game was written for one
pilot, `P`, so each pilot's state lives in `PILOT_VARS`: P itself, its kit's
state, its cards, its gear, its sentries and its colours. Each part of a step
runs as the pilot it belongs to (`pilotUse`, `pilotsEach`, `pilotDo`): its
input, movement, weapons and kit, the bullets it fired, and the hits it
takes. The world (waves, enemies, the floor) runs once. Each machine draws
and listens as its own pilot (`pilotMine`). XP is shared, so both pilots
level together, and each picks from its own cards.

Menus are input too. A choice on a screen (a card, gear, the shop, the
planetarium, the library, the talks, the founder's choice, pause) goes
through `ui()`. Alone it acts at once. In lockstep it rides the input record
and lands on the same step on both machines, as the chooser's pilot. Each
player picks their own cards and gear and buys for their own ship; the host
makes the run's other choices. Either player can pause or resume the shared
game, and can open the codex, settings or graphics over the pause on their
own machine. The host's
bot plays every screen through `handleKey`, and the guest's bot presses keys
on the host's screens, which must change nothing. Both pause, resume and
open their own screens over the pause, and the run must cover all of it.
Each scenario's seed is fixed, so a failure replays exactly.

The safety net: every second, both machines hash the game and send the hash
with their inputs. If the hashes for the same step differ, the host sends a
snapshot of its run, in 15 KB pieces over the reliable channel. The guest
takes it over and replays any steps it had already played past that point,
using the inputs they were first played with. A clean run must never need
it. The `parted` scenario knocks each machine out of step once, on purpose,
and both must be back in step within seconds. The `builds` check confirms
two different builds refuse to connect.

`lifecycle` plays a session the way people do. Pilots have ordinary hulls,
so they go down and stand back up, and both die. The host starts the next
run, and each side must record every run that ended on its own save. Then
the guest leaves partway through, and the host must play on alone. In `lan`
the host leaves, and the guest must land in the lobby. Every scenario draws
both machines as it goes, so a drawing error fails it too.

## Limits worth knowing (Workers Free plan)

- **Static files are free and unlimited.** Only `/api/*` calls count toward the
  100,000 Worker requests a day. Co-op rooms poll about every 0.6 s while two
  players are connecting, so co-op is the heaviest user of that allowance.
- **D1:** 5 GB, 5 million rows read and 100,000 rows written a day. Stale co-op
  rooms are swept out automatically.
- **CPU:** 10 ms per request. Ordinary API calls are light: mostly waiting on
  the database, and waiting does not count. The exception is signing in or
  up, whose scrypt password check takes about 45 ms. Cloudflare allows
  occasional overruns, and sign-ins are rare next to everything else (live
  sign-ins answered in about 0.25 s on 4 Oct 2026). If they ever fail with
  *Error 1102*, Workers Paid ($5/month) lifts the limit.
