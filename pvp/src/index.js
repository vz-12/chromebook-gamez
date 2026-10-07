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
     /api/pvp/match   a match's referee: the Match object (match.js, objects.js)
     /api/pvp/queue   matchmaking: the Matchmaker object, one per queue (queue.js, objects.js)
     /api/pvp/flags   the referee's flags, for dev accounts to review (flags.js)
     /api/pvp/pilot   a hidden pilot's code, to its holders, its opponents and
                      the viewers of a match it flies in (hidden.js)
     /api/pvp/watch   a match on air: the feed in, viewers out, the replay
                      (watch.js; the log is the Broadcast object, broadcast.js)
     /api/vault       the game's vault, as the game has it (../../src/vault.js)
     everything else  pvp/site

   A daily cron (wrangler.jsonc) files each finished season's rewards: the
   ranked podium and league badges (seasons.js). Then it sends any armed
   challenge somebody in VOID has already tripped (challenge.js).

   A player arrives signed in from the game by a hand-off code, and goes back
   the same way (src/account.js, hand-offs).
   ========================================================================= */
import account from '../../src/account.js';
import room from '../../src/room.js';
import me from './me.js';
import turn from './turn.js';
import match from './match.js';
import queue from './queue.js';
import flags from './flags.js';
import pilot from './hidden.js';
import watch from './watch.js';
import vault from '../../src/vault.js';
import { closeSeasons } from './seasons.js';
import { tripChallenges } from './challenge.js';

export { Matchmaker, Match } from './objects.js';
export { Broadcast } from './broadcast.js';

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const ROUTES = { '/api/account': account, '/api/pvp/me': me, '/api/room': room, '/api/turn': turn,
                 '/api/pvp/match': match, '/api/pvp/queue': queue, '/api/pvp/flags': flags,
                 '/api/pvp/pilot': pilot, '/api/pvp/watch': watch, '/api/vault': vault };

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (!env.DB) return json({ error: 'no database: bind a D1 database as DB' }, 503);
    const route = Object.prototype.hasOwnProperty.call(ROUTES, path) ? ROUTES[path] : null;
    if (!route) return json({ error: 'not found' }, 404);
    try {
      return await route(req, env);
    } catch (e) {
      console.error(path, e && e.stack || e);
      return json({ error: 'server error: ' + String((e && e.message) || e).slice(0, 120) }, 500);
    }
  },

  // once a day: any finished season's rewards, filed (seasons.js); then any challenge due, sent (challenge.js)
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    ctx.waitUntil(closeSeasons(env.DB)
      .then(f => console.log(f.length ? 'pvp season rewards filed: ' + f.join(', ') : 'pvp: no season to close'))
      .catch(e => console.error('pvp seasons', e && e.stack || e))
      .then(() => tripChallenges(env.DB))
      .then(s => { if (s.length) console.log('pvp challenges sent: ' + s.length); })
      .catch(e => console.error('pvp challenges', e && e.stack || e)));
  }
};
