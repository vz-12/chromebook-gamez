/* ===========================================================================
   VOIDRUNNER — the Worker.

   The game is static: index.html, check.html, hl-art.js. Cloudflare serves
   those straight from the repo root (minus what .assetsignore lists)
   without running any of this. wrangler.jsonc sends only /api/* here, so a
   page load never costs a Worker request.

     /api/leaderboard   the boards, seasons, awards, vigil and dev logins
     /api/room          the co-op signalling dead-drop
     /api/turn          short-lived credentials for Cloudflare's TURN relay (co-op)
     /api/account       accounts: sign up, sign in, the cloud save (account.js;
                        what a session is lives in auth.js, shared with PvP)
     /api/boards        every player's row on every board: ranks, pages, search
                        (boards.js; the page is /leaderboard/)
     /api/account/look  a profile's banner, picture and decals: what the account
                        owns and what it has picked (looks.js)
     /api/vault         code kept out of this public repo, handed only to the
                        accounts allowed it (vault.js)

   Two cron triggers (wrangler.jsonc): once a day, closing a finished season
   whether or not anybody is playing (season-close.js) and sweeping out
   expired sign-ins (auth.js); and every 15 minutes,
   merging in the old Netlify leaderboard store (sync.js) and then folding
   the boards into their rows (boards.js).
   ========================================================================= */
import leaderboard from './leaderboard.js';
import room from './room.js';
import turn from './turn.js';
import account from './account.js';
import looks from './looks.js';
import vault from './vault.js';
import boards, { foldBoards } from './boards.js';
import { pruneAuth } from './auth.js';
import seasonClose from './season-close.js';
import { syncFromNetlify } from './sync.js';

// must match the schedule in wrangler.jsonc exactly
const SEASON_CLOSE_CRON = '5 0 * * *';

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const ROUTES = { '/api/leaderboard': leaderboard, '/api/room': room, '/api/turn': turn,
                 '/api/account': account, '/api/account/save': account, '/api/account/look': looks,
                 '/api/boards': boards, '/api/vault': vault };

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    const route = Object.prototype.hasOwnProperty.call(ROUTES, path) ? ROUTES[path] : null;
    if (!route) {
      // anything outside /api/* that reaches here is a file; let assets have it
      if (!path.startsWith('/api/')) return env.ASSETS.fetch(req);
      return json({ error: 'not found' }, 404);
    }
    /* Said plainly rather than left to fail inside a handler, where most
       reads are caught and would quietly look like an empty board. */
    if (!env.DB) return json({ error: 'no database: bind a D1 database as DB' }, 503);
    try {
      return await route(req, env);
    } catch (e) {
      console.error(path, e && e.stack || e);
      return json({ error: 'server error: ' + String((e && e.message) || e).slice(0, 120) }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    if (event.cron === SEASON_CLOSE_CRON) {
      ctx.waitUntil(seasonClose(env));
      ctx.waitUntil(pruneAuth(env).catch(e => console.error('pruneAuth', e && e.stack || e)));
    } else {
      ctx.waitUntil(syncFromNetlify(env).catch(e => console.error('sync', e && e.stack || e))
        .then(() => foldBoards(env)).catch(e => console.error('foldBoards', e && e.stack || e)));
    }
  }
};
