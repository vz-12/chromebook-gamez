/* ===========================================================================
   VOIDRUNNER — the Worker.

   The game is static: index.html, check.html, hl-art.js. Cloudflare serves
   those straight from the repo root (minus what .assetsignore lists)
   without running any of this. wrangler.jsonc sends only /api/* here, so a
   page load never costs a Worker request.

     /api/leaderboard   the boards, seasons, awards, vigil and dev logins
     /api/room          the LAN co-op signalling dead-drop

   And once a day, the cron trigger closes a finished season whether or not
   anybody is playing (season-close.js).
   ========================================================================= */
import leaderboard from './leaderboard.js';
import room from './room.js';
import seasonClose from './season-close.js';

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const ROUTES = { '/api/leaderboard': leaderboard, '/api/room': room };

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
    ctx.waitUntil(seasonClose(env));
  }
};
