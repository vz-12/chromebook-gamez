# chromebook-gamez

VOIDRUNNER — a single-file neon roguelite arena shooter, hosted on
**Cloudflare Workers**.

## How it is put together

| Piece | What it is |
| --- | --- |
| `index.html`, `check.html`, `privacy.html`, `hl-art.js` | The game, the deployment check page, the privacy page, and the ALL HALLOWS art. Served as static files. |
| `icon.svg`, `icon-*.png`, `manifest.webmanifest`, `og.jpg` | The game's icon, what makes it installable as an app, and the picture a pasted link shows. See "Sharing and installing" below. |
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

### Patreon supporters

A pledge of $1 or more to patreon.com/VOIDRUNNER opens the SUPPORTER profile
looks. A signed-in player links their own Patreon (`src/patreon.js`), so
nobody has to send a name, and Patreon's webhook keeps it current. A
supporter can also be flagged by hand: `npm run supporter -- <account>
--remote` (`--take` takes it back).

1. Patreon → **Clients & API Keys** (patreon.com/portal/registration/register-clients)
   → the app → **Edit Client**: the redirect URI
   `https://voidrunner.online/api/patreon/back`, exactly.
2. Add the app's `PATREON_CLIENT_ID` and `PATREON_CLIENT_SECRET` as Worker
   secrets (`npx wrangler secret put <NAME> --name voidrunner`). Until both
   are there, the link says it is off.
3. Once the link is live: Patreon → **Webhooks**, pointed at
   `https://voidrunner.online/api/patreon/hook`, with the member and pledge
   triggers, and its secret as `PATREON_WEBHOOK_SECRET`. Without it a pledge
   made or ended after linking is not heard of.

`npm run test:patreon` runs the whole trip against a Patreon of its own.

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
3. Build: build command **`node scripts/pvp-build.mjs`** (it makes PvP's
   play page from the game's engine; without it `/play/` is missing), and
   deploy command **`npx wrangler deploy -c pvp/wrangler.jsonc`**. Build
   watch paths: include `pvp/*`, `src/*`, `index.html` and
   `scripts/pvp-build.mjs`. PvP uses the shared accounts and rooms code in
   `src/`, and its copy of the game is made from `index.html`.
4. On the game's own Worker (`voidrunner`), add `pvp/*` to the build watch
   paths' **exclude** list, so a PvP-only change doesn't redeploy the game.

Its first build fails until `pvp/` is on `main`; that's harmless.

```sh
npm run dev:pvp                            # PvP at http://127.0.0.1:8788, beside npm run dev
npm run test:pvp                           # a few seconds: plays a whole match
```

Open the local game at `http://localhost:8787` and PvP at
`http://127.0.0.1:8788`. The two host names keep two cookie jars, as the
real sites do. `npm run dev:pvp` makes the play page first; restart it after
editing `index.html`.

**PvP runs the game's engine** (PVP-PLAN.md, Phase 3).
`scripts/pvp-build.mjs` copies the game's script byte for byte into
`pvp/site/play/index.html`, with PvP's own scripts (`pvp/site/js/`) in
front. The page is generated, never edited or committed. PvP's scripts set
`window.VR_PVP`, which boots the engine sealed (`PVP` and `pvpSeal` in
`index.html`):
- no saves, leaderboard, daily, account sync, awards, event, ads or menus;
- a profile made in memory from the account;
- PvP's own hooks for which pilots there are, what spawns, and its screens.

In the game `PVP` is null and every hook does nothing.

**A match with a friend** (PLAY A FRIEND, in the PvP page). One player
hosts and reads out a code, and the other joins with it. It is the game's
own co-op as it is: lockstep, each player flying their own pilot.
- **Rooms:** the PvP Worker serves `/api/room` from `src/room.js`, on a
  store of its own (`ROOM_STORE`), so game and PvP codes never meet.
- **Relay:** `/api/turn` asks the game's Worker through a service binding
  (`GAME`), so the TURN secrets stay where they are.

**How a match plays** (PVP-PLAN.md, Phase 3 step 3; all of it in
`pvp/site/js/`, run inside the shared lockstep simulation):
- **The match** (`rounds.js`): best of three, and best of five for ranked
  from gold up (`bestOf` in `pvp/src/rules.js`). Three upgrades each to
  start, one more each per 30 seconds of fighting, and one more for whoever
  lost the round. Builds carry over; health and the floor reset each round.
- **Damage** (`duel.js`): every weapon and ability hurts the other pilot,
  through an invisible stand-in for each pilot in the game's enemy list.
  A hit is scaled to a pilot (`DUEL.scale`) and capped: 14% of max health a
  hit, 34% in any one second, so no card wins a round in one blow.
  `DUEL.pilots` tunes each pilot's damage (all 1 for now).
- **Cards** (`cards.js`): the game's pool, less instant kills, cards that
  break without waves, and economy cards (`BANNED`), never more than four
  bullets a shot, and each player's own reward upgrades.
- **Maps** (`maps.js`): one of seven sectors, clean or infested. Infested
  sends the sector's enemies, six at a time at most. Even odds; 75% infested
  with one HACKER in the fight, always with two.
- **Art hooks** (`art.js`), each drawn every frame onto the game's canvas;
  the file's header says what each is handed. Redraw them without touching
  anything else:
  - `PVP_ART.belt(g, w, h, t, d)`: the map draw at the start of a match,
    with both pilots and the kind of match.
  - `PVP_ART.result(g, w, h, t, r)`: the end of a match (victory, defeat,
    opponent left, no contest), with the rounds, the damage, the referee's
    verdict and, in ranked, the rating change. The lobby button sits along
    the bottom.
  - To see them without playing, open `/play/?preview=belt` or
    `/play/?preview=result` (`preview.js`: buttons for every outcome,
    ranked and casual). Locally, `npm run dev:pvp` first.

**Seasons** (PVP-PLAN.md, Phase 5 step 4). Ratings are kept per season,
the game's own (the 6th to the 6th).
- The PvP Worker's daily cron (00:20 UTC, `pvp/wrangler.jsonc`) files each
  finished season's rewards (`pvp/src/seasons.js`). With the
  game's two, that is three of the Free plan's five cron triggers.
- Each queue's `rewards` (`pvp/src/rules.js`) names what a finished season
  pays. Ranked pays a podium (the top three) and a league badge (every
  placed player, the league they finished in).
- Both reach the player through the game's awards and show on their
  profile. What each is worth is `PODIUM_REWARDS` and `BADGE_REWARDS` in
  `src/pvp-rewards.js`, empty until the cosmetics (PVP-PLAN.md, Phase 7).
- A new season starts each player from last season's rating, halfway back
  to 1500, with the placement matches to play again.

**Who may queue** (PVP-PLAN.md, Phase 6). Each queue in `pvp/src/rules.js`
names its entry gates (`pvp/src/gates.js`). Ranked needs an account a day
old and 10 runs of the game; casual only a sign-in. Dev accounts skip the
gates. The lobby turns a shut queue's button off and says why.

**The ad suggestion** (PVP-PLAN.md, Phase 6 step 3), off until ads are
approved. In PLAY A FRIEND, while an ad is ready, the lobby offers: "Watch a
short ad and your next friend match starts with 2 more upgrades." To switch
it on, approve PvP's address in AdSense with H5 games ads (the Ad Placement
API), set child-directed treatment, then put the publisher id in
`PVP_ADS.client` in `pvp/site/ads.js` (`test: true` for Google's test ads
first). Friend matches only; queued matches never carry the bonus.

**Hardening.**
- Per-account rate limits on the queue, the referee and opening friend's
  matches (`pvp/src/limits.js`).
- Dev accounts can review the referee's flags at
  `https://voidrunner-pvp.play101.workers.dev/api/pvp/flags`: accounts
  ordered by how many different opponents they were flagged against. Or
  straight from the database:

```sh
npx wrangler d1 execute voidrunner --remote --command "SELECT a.name, COUNT(*) AS flags, COUNT(DISTINCT CASE WHEN m.a = f.account THEN m.b ELSE m.a END) AS opponents FROM pvp_flags f JOIN accounts a ON a.id = f.account LEFT JOIN pvp_matches m ON m.id = f.match GROUP BY f.account ORDER BY opponents DESC, flags DESC LIMIT 20"
```

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

### The vault

Code that must stay out of this public repo, such as an outside pilot (OUTSIDE
PILOTS in `index.html`), is kept in D1 instead and handed by `GET /api/vault`
only to an account holding its `vault:<id>` perk. Everyone else, signed in or
not, gets the same 404 as a missing id. An id is opaque: the name and
everything else are in the text. Keep the files themselves outside the repo
and put them from there:

```sh
npm run vault -- put <id> <file> --remote  # a new revision; the page re-fetches it by its hash
                                           #   (--name NAME: what its holders see it called)
npm run vault -- give <account> <id> --remote
npm run vault -- list --remote             # also: drop, take, who, hash
npm run test:vault                         # a few seconds: the store and the route
npm run test:outside                       # a few seconds: the loader, in the game, end to end
```

Without `--remote` (or `--local` for `npm run dev`'s database) it only prints
what it would do. `src/vault.js` explains how an entry is stored.

An outside pilot's runs count for nothing. The page records none of them, and
the server holds to that too: a run names its pilot, and `/api/leaderboard`
refuses any pilot that isn't one of the game's own (`PILOTS` in
`pvp/src/rules.js`), on every board. An account's unlocks keep only those
pilots. A new pilot goes in `PILOTS` as well as the game, or its runs are
refused; `npm run test:outside` checks the two lists match.

In PvP an outside pilot is a hidden pilot (`pvp/src/hidden.js`). Its holders
can fly it in a friend's match, by code, or in ranked, where it is paired with
the season's #1 and nobody else, for one long round. It never goes in casual,
and its matches are never rated or recorded. Its opponent's machine fetches it
from `GET /api/pvp/pilot`, naming the match, and both machines check they run
the same text before the match starts. It may bring its own duel caps
(`def.duel`, read by `pvp/site/js/duel.js`). To fly a real one through the PvP
engine test in place of the stand-in:

```sh
node scripts/pvp-engine.mjs --outside path/to/module.js
```

A hidden pilot can also send a challenge (`pvp/src/challenge.js`). It does
nothing until you arm it by hand. Once it's armed, the first player placed in
VOID, ranked's highest league, trips it, and it goes at once to that season's
#1. That player's PvP lobby shows the challenge's words, kept in the vault and
given to nobody, and the game's PVP door tells them one is waiting. From then
on, the pilot's ranked ticket waits for that player rather than whoever is #1
by then. The pilot's own holders never trip it and are never sent it.

```sh
npm run vault -- put <words> <file> --remote   # { "t": "title", "x": "text" }, kept outside the repo
npm run challenge -- arm <pilot> <words> --remote
npm run challenge -- date <pilot> 2026-11-14T18:00Z --remote   # or none
npm run challenge -- list --remote             # tripped by whom, sent to whom, seen yet; also: cancel
```

**Live spectating** (the challenge's match, watched in-game; the trailer's
replay). Viewers get the fighters' inputs, not video. Each viewer's own copy
of the game plays the fight, as the two fighters' machines already do in
lockstep.
- **The relay** is a `Broadcast` Durable Object per match
  (`pvp/src/broadcast.js`, migration `v2` in `pvp/wrangler.jsonc`). It keeps
  the header, both pilots' inputs in batches with the game's fingerprints,
  a snapshot of the whole fight now and then, and the end. It never deletes
  any of it: the stored log is the replay.
- **`/api/pvp/watch`** (`pvp/src/watch.js`): only the account flying the
  hidden pilot in that match may feed it. Anyone may watch (`GET
  ?match=<id>&from=<step>`), with no account. Viewers poll, and the relay
  tells each how long to wait: a second, longer once there are more than
  60 viewers.
- **On air:** when the queue makes the challenge's match, `pvp_challenges`
  notes it, and the referee's verdict ends it. Meanwhile the game Worker's
  public `GET /api/live` (`src/live.js`) names the match and gives the
  announcement. It also tells the game how often to ask: every minute while
  a challenge is out and near its date, otherwise every 15 minutes. The
  announcement's words are a vault entry of their own, kept out of the repo:

```sh
npm run vault -- put <entry> <file> --remote     # { "t": "title", "x": "text", "as": "the pilot's name as shown", "named": false hides the other player's name }
npm run challenge -- announce <pilot> <entry> --remote   # or none
```

- **On air, from your machine** (`pvp/site/js/onair.js`): a match where
  this side flies a hidden pilot is sent to the relay as it is played: the
  header once, both pilots' inputs every half second with the game's
  fingerprints, a snapshot every 15 seconds and whenever this machine's game
  is put back in step, and the end. The other side sends nothing. If the
  relay can't be reached, viewers wait; the match plays on regardless.
- **Watching** (`pvp/site/js/watch.js`): `/play/?watch=<match>` on the PvP
  address, with no lobby and no account. It builds the run from the header,
  as a guest does, and plays it about 3 seconds behind live, faster when it
  falls behind. Every second it checks its fingerprint against the
  fighter's; if they differ, or it has fallen far behind, it takes the
  latest snapshot over. A late viewer starts from one. It sees through the
  eyes of the side that is not the hidden pilot (that player's HUD), so the
  broadcast shows nothing the challenger couldn't see. Tab switches the
  camera between the fighters; no key or click reaches the game.
- **In the game** (ON AIR in `index.html`, `npm run test:live`): while one
  is on air, a card covers the menu with the announcement, both names,
  WATCH LIVE and NOT NOW, once per broadcast per browser. After that a LIVE
  strip pulses across the foot of the menu until the fight ends; clicking it
  watches. A run in progress gets one line low on the screen and no pause.
  WATCH opens the fight in a tab of its own. The PvP lobby has a LIVE card
  at the top for everybody, signed in or not (PvP's Worker serves
  `/api/live` too).
- **The pilot's code goes public** once its match is on air. Anyone naming
  the broadcast is handed it (`/api/pvp/pilot?id=<id>&watch=<match>`),
  because every viewer's game has to run it.
- **The replay:** `GET /api/pvp/watch?match=<id>&replay=1` downloads the
  whole log as a file, for dev accounts and the pilot's holders only, with
  the hidden pilot's code in it (the vault's, as it is at the download: take
  it on fight day). The PvP lobby lists what an account may keep on a
  REPLAYS card (`?list=1`, from the `pvp_broadcasts` table), each a
  download.
- **The replay page** (`pvp/site/js/replay.js`), for the trailer:
  `/play/?replay=1` asks for a downloaded log and plays it with no account
  and no Worker, in a fixed 16:9 frame drawn at 1920x1080 (record the tab
  with OBS). Space pauses; `-` and `+` set the speed (¼× to 4×); `←` `→` and the
  bar go to a snapshot, Home to the start; `1` `2` put the camera on a
  fighter, `3` frames both, `4` frees it (drag, wheel); `E` switches whose
  eyes it is seen through (the other fighter's own screen: their HUD, and
  what only they are shown of their pilot); `U` takes the game's HUD off,
  `H` the page's own controls.
- **A replay plays only on the build it was recorded on**, since any change
  to the engine plays the same inputs differently: the log carries its
  build and the page refuses any other, saying so. Tag the commit on fight
  day; to play it, check that commit out, run `npm run dev:pvp`, open
  `/play/?replay=1` and choose the file. The file is only ever chosen on
  the page, never fetched: the hidden pilot's code is in it, so keep it out
  of this folder, which is what a deploy uploads.

## Sharing and installing

Small things that help the game travel:

- **Link previews.** `index.html`'s head has a description and Open Graph
  tags, so a link pasted into Discord, iMessage or a search result shows the
  title, a line about the game and `og.jpg` (1200×630). The image and
  `og:url` are absolute (`https://voidrunner.online/...`) because previews
  are fetched by other sites. Keep `og.jpg` under about 300 KB: some chat
  apps skip bigger ones.
- **The icon.** `icon.svg` is the menu's emblem held still. The PNGs
  (`icon-192.png`, `icon-512.png`, `icon-180.png` for iOS, and
  `icon-maskable-512.png`, which has the emblem inside the safe circle on a
  full-bleed background) are renders of it. Redraw the SVG and render it
  again at those sizes.
- **Installing.** `manifest.webmanifest` makes the game installable. Its
  paths are relative to the address it is served from, so an install from
  the school address stays on the school address. When Chrome offers to
  install, the game keeps the offer and shows INSTALL AS AN APP at the top
  right of the menu (INSTALL, under AFTER THE RUN in `index.html`). On a
  Chromebook that puts it on the shelf in its own window. There is no
  service worker, on purpose: an installed copy loads the current build like
  the tab does, so co-op never meets a stale build.
- **SHARE RUN** on the run report copies a few lines about the run and a
  link to wherever it is being played (a phone gets its share sheet). Nothing
  is sent anywhere by the game.
- **Links** (LINKS in `index.html`), read once as the page opens and taken
  off the address:
  - `?vs=NAME&s=SCORE` is a challenge: the menu shows the score to beat, and
    the run report says when an ordinary run beats it. SHARE RUN's link
    carries the player's own. Kept in the browser (`voidrunner_vs_v1`) until
    a newer one comes.
  - `&d=YYYY-MM-DD` makes it a daily's: on that day only that day's daily
    beats it, so both play the same run.
  - `?join=CODE` goes straight into a co-op room once the player has a name.
    The host's COPY INVITE LINK [I] makes one.
  - Both use the address the sender is on, so a link sent from the school
    address works at school.

## Continuing a run

The run being played is kept in the browser's local storage
(`voidrunner_run_v1` and `voidrunner_run_v1_snap`), so a crash or a closed tab
costs seconds, not the run. CONTINUE, in `index.html`, has the details:

- It is the co-op safety net's snapshot (RUN SNAPSHOTS: `snapWrite` and
  `snapRead`), the one `npm test` restores into a fresh copy of the game in
  every scenario. Continuing builds a run's frame (`resetGame`) and reads the
  snapshot over it, as run C does.
- It is written every 20 seconds of play between steps, when the run pauses,
  and when the tab is hidden or closed. A run that ends (death, quit, a new
  run) clears it.
- The menu offers it back before anything else: CONTINUE, which comes back
  paused, or ABANDON, which files it like a quit.
- A run can be continued three times (`RUN_CONTINUES`), so killing the tab is
  not a way to replay a bad moment.
- A snapshot belongs to the build that wrote it: after a deploy a kept run is
  let go, and the menu says so.
- Not kept: co-op, freeplay, outside pilots, ALL HALLOWS' areas, the hub, a
  scene in progress, PvP and the beta. Nothing is uploaded.

A new top-level variable reaches the snapshot without being listed, as it
does for co-op; anything that is this machine's own goes in `SNAP_LOCAL`.

## First flight (the assisted first run)

THE WARDEN, the boss at the end of the first sector, is where new players got
stuck. So a browser's first flight is offered help: FIRST FLIGHT, in
`index.html`.

- **Asked once, at PLAY.** The first time PLAY is pressed on a browser, a card
  asks: FLY ASSISTED [ENTER] or NO THANKS [N]. [ESC] puts it down and asks
  again next time.
- **It lasts until THE WARDEN falls,** not for exactly one run, so a first run
  lost on wave 3 does not use it up before the boss. Dying keeps it on for the
  next run, with a fresh save.
- **What it does** (`ASSIST`): every hit on the pilot lands at 60%. The boss
  comes in with 65% of its health, attacks at 75% of its pace (so its tells
  last longer) and its shots fly at 85% speed. One save per run: the first
  blow that would end the run leaves the pilot at 60% instead, after the
  pilot's own revives.
- **The tour.** FLY ASSISTED opens the run on a tour of the HUD (`TUT_TOUR`):
  the ship, health, experience and level, the dash, score, wave and sector,
  credits, and, as ghosts of where they will be, the boss's bar, the build
  and the tips. Each part is lit in turn with a line about it. [ENTER] or a
  click goes on, [←] goes back, [ESC] or SKIP ends it. The run is held while
  it is up (state `tour`, which `update()` treats as pause), so it never moves
  the game. `drawHUD` publishes where it drew each part (`HUD_AT`), and the
  tour points there. It is shown once, on the run FLY ASSISTED starts.
- **The hints** are subtitles low on the screen. They teach moving, aiming
  and firing, experience, the cards and the dash, each waiting for the player
  to do it (and giving up after a while), then call out each of THE WARDEN's
  attacks as it starts it.
- **Opting out:** NO THANKS on the card, or TURN OFF THE ASSIST [O] on the
  pause screen. Either is remembered.
- **Only ordinary solo runs.** Never the daily, the rush, a challenge, co-op,
  freeplay, the hub or an outside pilot.
- **Nothing takes the menu first.** ALL HALLOWS' knock holds the menu for
  about twenty seconds, which on a first visit is when PLAY gets pressed. It
  waits while a first flight has the menu (`tutHoldsMenu`: never asked, or
  flying, and no ordinary run on the record yet), and knocks on the next
  visit to the menu once a run is filed. Veterans, and browsers that said
  NO THANKS, are knocked at once, as before.

It is decided by a **cookie, `vr_tut`**, on this browser, not by the save or the
account, and nothing about it is uploaded:

| Value | Means |
| --- | --- |
| (none) | Never asked: PLAY shows the card. |
| `on` | Assisted, until THE WARDEN falls. |
| `off` | Declined, on the card or from the pause screen. |
| `done` | THE WARDEN fell with the help, or this device's save has been past wave 5. |

A save that has been past wave 5 is never asked, and PLAY marks the browser
`done` when it sees one, so a veteran who later signs out (and gets a fresh
guest save) is not asked either. A save that keeps dying at THE WARDEN is asked: it is who this is for.
The cookie lasts 400 days (Chrome's limit) and is written again on every
visit. Where cookies are not kept (`file://`), the same value goes in local
storage (`voidrunner_tut`), and where neither is, it lasts as long as the page.

The run never reads the cookie. PLAY (`startRun`) hands the answer to the run
the way the seed is handed over (`runAssistNext`), and the run keeps its own
`assist`, so a continued run is still assisted and the determinism test holds.
To see the card again, delete the `vr_tut` cookie for the site (and the
`voidrunner_tut` local storage key, if it is there).

```sh
npm run test:tutorial                      # a few seconds
```

## Memory under fire

Very high fire rate used to crash the tab: every shot and hit started its own
Web Audio nodes, thousands a second, faster than Chrome frees them. Now:

- Sound effects wait their turn (`SFX_GAP`), and at most `SFX_VOICES` play at
  once. Music is never held back.
- Lightning arcs and rings are kept to the newest `ARC_MAX` and `RING_MAX`
  (only the drawing reads them, as with particles).
- At most `BULLET_MAX` (2,000) player shots are in the air. Past that the
  oldest go first. This one changes the game, so it is in the run (it holds
  in co-op and the determinism test).

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

ALL HALLOWS' chapter II, THE HOUSE, has its own test. Its art hooks are listed
in `HALLOWS-HOUSE-HOOKS.md`, and its art is in `hl-art.js` (the test draws the
house on the placeholders and on the art):

```sh
npm run test:hallows                       # under a minute: THE HOUSE, DEAD GAME, the medals, the hooks
```

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
the same game, step for step, on any machine. The test plays 18 scenarios
twice: the four pilots, Boss Rush, the finales, the rites, ALL HALLOWS' two
areas and DEAD GAME, an assisted first flight, and an outside pilot. Run A is
never drawn and has every effect off. Run B is drawn to a stub canvas with
every effect on, at another window size, while the keyboard, mouse, autofire
and the save's flags are scrambled every step. The two must match at every
second of game time. It also checks that a different seed changes the run,
and that a planted unseeded roll is caught.

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
- **A live broadcast is the biggest single use of it.** Every viewer polls
  `/api/pvp/watch`, and each poll is one Worker request and one Durable
  Object request (the Free plan allows 100,000 of each a day, for the whole
  account). The relay holds all its viewers together to about 60 requests
  a second (up to 300 viewers, each then asking every 5 s), so a 10-minute
  fight costs about 36,000 of each. If the daily limit runs out, every `/api/*` call on the account
  fails with Error 1027 until midnight UTC, the match's own referee
  included. Workers Paid ($5/month) has no daily limit.
- **D1:** 5 GB, 5 million rows read and 100,000 rows written a day. Stale co-op
  rooms are swept out automatically.
- **CPU:** 10 ms per request. Ordinary API calls are light: mostly waiting on
  the database, and waiting does not count. The exception is signing in or
  up, whose scrypt password check takes about 45 ms. Cloudflare allows
  occasional overruns, and sign-ins are rare next to everything else (live
  sign-ins answered in about 0.25 s on 4 Oct 2026). If they ever fail with
  *Error 1102*, Workers Paid ($5/month) lifts the limit.
