# chromebook-gamez

VOIDRUNNER — a single-file neon roguelite arena shooter, hosted on
**Cloudflare Workers**.

## How it is put together

| Piece | What it is |
| --- | --- |
| `index.html`, `check.html`, `privacy.html`, `hl-art.js` | The game, the deployment check page, the privacy page, and the ALL HALLOWS art. Served as static files. |
| `src/` | The Worker: `/api/leaderboard` (boards, seasons, awards, vigil, dev logins) and `/api/room` (LAN co-op signalling). Never served to players. |
| D1 database `voidrunner` | Where the leaderboard and co-op rooms are stored. |
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
- **The workers.dev address** (`voidrunner.play101.workers.dev`)
  stays up as a fallback (`workers_dev` in `wrangler.jsonc`). Saves made there
  stay there.

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

## Dev accounts

Dev logins (`DEV_ACCOUNTS`), profile handouts (`DEV_PIDS`, `SKIN_GRANTS`) and
how to add or revoke them are documented in `src/leaderboard.js`. A profile
that signed in on Netlify keeps its grants through the sync above.

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

## Limits worth knowing (Workers Free plan)

- **Static files are free and unlimited.** Only `/api/*` calls count toward the
  100,000 Worker requests a day. Co-op rooms poll about every 0.6 s while two
  players are connecting, so co-op is the heaviest user of that allowance.
- **D1:** 5 GB, 5 million rows read and 100,000 rows written a day. Stale co-op
  rooms are swept out automatically.
- **CPU:** 10 ms per request. Ordinary API calls are light: mostly waiting on
  the database, and waiting does not count. The exception is a dev login,
  whose scrypt password check takes about 45 ms. Cloudflare allows occasional
  overruns. If dev logins ever fail with *Error 1102*, Workers Paid
  ($5/month) lifts the limit.
