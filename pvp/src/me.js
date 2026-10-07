/* ===========================================================================
   GET /api/pvp/me -> who you are, what you have unlocked, your league, and
   what that lets you bring to ranked and to casual.

   The unlocks are the summary the game writes beside the account's save
   (src/account.js, saves.unlocks), so they are as current as the game's last
   push; the game pushes before it opens PvP. The league comes from the
   ranked rating this season (records.js, pvp_ratings): the lowest, still to
   be placed, until the first few ranked matches are played (rules.js). A
   challenge sent to this account (challenge.js) comes too, and the field is
   missing for everybody else.
   ========================================================================= */
import { sessionOf, sessionCookie, publicAccount } from '../../src/auth.js';
import { PILOTS, CASUAL, loadout, leagueOf } from './rules.js';
import { ratingOf } from './records.js';
import { entryFor } from './gates.js';
import { hiddenOf } from './hidden.js';
import { challengeFor } from './challenge.js';

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
  // whether each queue's gates let this player in, and if not why (gates.js)
  const queues = {};
  for (const q of ['ranked', 'casual']) {
    const e = await entryFor(env.DB, s.account, q);
    queues[q] = { open: e.open, why: e.why };
  }
  // the hidden pilots it may fly, only for whoever may (hidden.js): the field is missing for everybody else
  const hidden = await hiddenOf(env.DB, s.account);
  // a challenge sent to this account, shown now (challenge.js): one that cannot be read waits for the next visit
  const challenge = await challengeFor(env.DB, s.account.id, { seen: true })
    .catch(e => { console.error('pvp challenge', e && e.message); return null; });
  // a session just extended takes its cookie again, as /api/account does
  return reply(Object.assign({
    account: publicAccount(s.account),
    unlocks, saved: row ? row.updated : null,
    league: { id: league.id, n: league.n, bestOf: league.bestOf, pilots: league.pilots, awake: league.awake,
              provisional: league.provisional, left: league.left,
              rating: r ? Math.round(r.rating) : null, games: r ? r.games : 0, wins: r ? r.wins : 0, losses: r ? r.losses : 0 },
    pilots: PILOTS,
    loadouts: { ranked: loadout(league, unlocks), casual: loadout(CASUAL, unlocks) },
    queues
  }, hidden.length ? { hidden: hidden.map(h => ({ id: h.id, n: h.n || h.id, h: h.h })) } : {},
     challenge ? { challenge } : {}), 200, s.renew ? sessionCookie(req, s.token) : undefined);
}
