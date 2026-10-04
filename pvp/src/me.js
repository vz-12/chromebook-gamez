/* ===========================================================================
   GET /api/pvp/me -> who you are, what you have unlocked, your league, and
   what that lets you bring to ranked and to casual.

   The unlocks are the summary the game writes beside the account's save
   (src/account.js, saves.unlocks), so they are as current as the game's last
   push; the game pushes before it opens PvP. The league comes from the
   ranked rating this season (records.js, pvp_ratings): the lowest, still to
   be placed, until the first few ranked matches are played (rules.js).
   ========================================================================= */
import { sessionOf, sessionCookie, publicAccount } from '../../src/auth.js';
import { PILOTS, CASUAL, loadout, leagueOf } from './rules.js';
import { ratingOf } from './records.js';

function reply(body, status = 200, cookie) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (cookie) headers['set-cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}

export default async function me(req, env) {
  if (req.method !== 'GET') return reply({ error: 'method not allowed' }, 405);
  const s = await sessionOf(req, env);
  if (!s) return reply({ error: 'signed out' }, 401);
  const row = await env.DB.prepare('SELECT unlocks, updated FROM saves WHERE account = ?1')
    .bind(s.account.id).first();
  let unlocks = null;
  try { unlocks = row ? JSON.parse(row.unlocks) : null; } catch (e) {}
  const r = await ratingOf(env.DB, s.account.id, 'ranked');
  const league = leagueOf(r);
  // a session just extended takes its cookie again, as /api/account does
  return reply({
    account: publicAccount(s.account),
    unlocks, saved: row ? row.updated : null,
    league: { id: league.id, n: league.n, bestOf: league.bestOf, pilots: league.pilots, awake: league.awake,
              provisional: league.provisional, left: league.left,
              rating: r ? Math.round(r.rating) : null, games: r ? r.games : 0, wins: r ? r.wins : 0, losses: r ? r.losses : 0 },
    pilots: PILOTS,
    loadouts: { ranked: loadout(league, unlocks), casual: loadout(CASUAL, unlocks) }
  }, 200, s.renew ? sessionCookie(req, s.token) : undefined);
}
