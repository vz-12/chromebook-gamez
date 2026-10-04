/* ===========================================================================
   VOIDRUNNER PVP — the Worker (PVP-PLAN.md)

   Its own deploy at voidrunner-pvp.play101.workers.dev, on the game's D1
   database: a PvP bug can never take the game down, and both read the same
   accounts.

     /api/account     the game's own accounts code (../../src/account.js), on
                      this address's own cookie; no sign-ups here (SIGNUP)
     /api/pvp/me      who you are, what you have unlocked, your league
     /api/room        a match's signalling, by private code: the game's own
                      co-op rooms (../../src/room.js), on PvP's own store
     /api/turn        the relay's credentials, asked of the game's Worker
     /api/pvp/queue   \  matchmaking and the referee: Durable Objects,
     /api/pvp/match   /  Phase 5 (objects.js); not yet
     everything else  pvp/site

   A player arrives signed in from the game by a hand-off code, and goes back
   the same way (src/account.js, hand-offs).
   ========================================================================= */
import account from '../../src/account.js';
import room from '../../src/room.js';
import me from './me.js';
import turn from './turn.js';

export { Matchmaker, Match } from './objects.js';

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const ROUTES = { '/api/account': account, '/api/pvp/me': me, '/api/room': room, '/api/turn': turn };
const LATER = new Set(['/api/pvp/queue', '/api/pvp/match']);

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!env.DB) return json({ error: 'no database: bind a D1 database as DB' }, 503);
    if (LATER.has(path)) return json({ error: 'matchmaking arrives in a later update' }, 501);
    const route = Object.prototype.hasOwnProperty.call(ROUTES, path) ? ROUTES[path] : null;
    if (!route) return json({ error: 'not found' }, 404);
    try {
      return await route(req, env);
    } catch (e) {
      console.error(path, e && e.stack || e);
      return json({ error: 'server error: ' + String((e && e.message) || e).slice(0, 120) }, 500);
    }
  }
};
