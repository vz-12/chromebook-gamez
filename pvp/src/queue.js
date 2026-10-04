/* ===========================================================================
   POST /api/pvp/queue — matchmaking (PVP-PLAN.md, Phase 5 step 2).

     { op: 'join', queue, pilot }   -> { state: 'waiting', waited }
     { op: 'poll', queue }          -> the same, { state: 'matched', match },
                                       or { state: 'none' } once the ticket has gone
     { op: 'leave', queue }         -> { state: 'left' } (or the match, if one was found)

   A player polls every couple of seconds while queued; a ticket nobody polls
   is dropped (objects.js, MM.STALE). Signed in only, and the ticket is made
   here from the server's own records, never the browser's word: the pilot
   must be one the account may fly in that queue (its league's rules in
   ranked, everything it owns in casual), and whether it flies awake and
   which reward upgrades come with it are read from the account's save.
   ========================================================================= */
import { sessionOf, originOk } from '../../src/auth.js';
import { QUEUES, CASUAL, PILOTS, loadout, leagueOf, bracketOf } from './rules.js';
import { ratingOf } from './records.js';
import { START } from './glicko.js';

const MAX_BODY = 4 * 1024;
const MAX_UPS = 64;
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function queue(req, env) {
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
  if (!originOk(req)) return reply({ error: 'bad origin' }, 403);
  if (!/^application\/json/.test(req.headers.get('content-type') || '')) return reply({ error: 'json only' }, 415);
  const text = await req.text();
  if (text.length > MAX_BODY) return reply({ error: 'too big' }, 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return reply({ error: 'bad json' }, 400); }
  if (!b || typeof b !== 'object') return reply({ error: 'bad json' }, 400);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return reply({ error: 'signed out' }, 401);
  if (!env.MATCHMAKER || !env.MATCH) return reply({ error: 'no matchmaking: bind the Matchmaker and Match objects' }, 503);
  if (!Object.prototype.hasOwnProperty.call(QUEUES, b.queue)) return reply({ error: 'unknown queue' }, 400);
  if (!['join', 'poll', 'leave'].includes(b.op)) return reply({ error: 'unknown op' }, 400);

  const body = { queue: b.queue, acct: s.account.id };
  if (b.op === 'join') {
    const pilot = typeof b.pilot === 'string' && Object.prototype.hasOwnProperty.call(PILOTS, b.pilot) ? b.pilot : null;
    if (!pilot) return reply({ error: 'bad pilot' }, 400);
    const row = await env.DB.prepare('SELECT unlocks FROM saves WHERE account = ?1').bind(s.account.id).first();
    let unlocks = null;
    try { unlocks = row ? JSON.parse(row.unlocks) : null; } catch (e) {}
    // the ranked rating places the player in both queues; casual only uses it to find someone close
    const rating = await ratingOf(env.DB, s.account.id, 'ranked');
    const league = leagueOf(rating);
    const ranked = QUEUES[b.queue].leagues;
    const rule = ranked ? league : CASUAL;
    const lo = loadout(rule, unlocks);
    if (!lo.pilots.includes(pilot))
      return reply({ error: ranked ? PILOTS[pilot] + ' is not flown in ' + league.n : 'you have not unlocked ' + PILOTS[pilot] }, 400);
    body.ticket = {
      name: s.account.display, pilot, awake: lo.awake.includes(pilot),
      ups: lo.ups.filter(u => typeof u === 'string' && /^[\w-]{1,40}$/.test(u)).slice(0, MAX_UPS),
      rating: rating ? rating.rating : START.rating, league: league.id,
      bracket: ranked ? bracketOf(rule) : 'casual',
      region: (req.cf && typeof req.cf.continent === 'string' && req.cf.continent) || 'XX'
    };
  }
  const mm = env.MATCHMAKER;
  const res = await mm.get(mm.idFromName(b.queue)).fetch('https://do/' + b.op, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return reply(await res.json(), res.status);
}
