/* ===========================================================================
   POST /api/pvp/match — a match's referee (PVP-PLAN.md, Phase 5 step 1).

     { op: 'open', kind: 'friend', pilot }        -> { id, side: 0 }
     { op: 'join', id, pilot }                    -> { id, side: 1, peer }
     { op: 'report', id, report }                 -> { verdict | null }
     { op: 'code', id, code? }                    -> { code | null }
         a queued match's room: the host leaves its code, the guest asks

   Signed in only; the account is the session's, handed to the Match object
   (objects.js) beside the body, so a player can only ever speak for
   themselves. A friend's match is opened by its host, who passes its id to
   the guest in the game's hello; a queued one is made by its Matchmaker
   (objects.js), with both sides in it, and its room code passes through it.
   ========================================================================= */
import { sessionOf, originOk, newId } from '../../src/auth.js';
import { PILOTS } from './rules.js';
import { limited, tooMany } from './limits.js';
import { isHidden, mayFly } from './hidden.js';

const MAX_BODY = 16 * 1024;
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const isId = v => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);

export default async function match(req, env) {
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
  const wait = limited('match', s.account.id) || (b.op === 'open' ? limited('open', s.account.id) : 0);
  if (wait) return tooMany(wait);
  if (!env.MATCH) return reply({ error: 'no referee: bind the Match object as MATCH' }, 503);

  const who = { acct: s.account.id, name: s.account.display };
  // one of the game's pilots, or a hidden one this account holds (hidden.js)
  const pilot = typeof b.pilot === 'string' && (Object.prototype.hasOwnProperty.call(PILOTS, b.pilot) ||
    (isHidden(b.pilot) && await mayFly(env.DB, s.account, b.pilot))) ? b.pilot : null;
  let id, body;
  if (b.op === 'open') {
    if (b.kind !== 'friend') return reply({ error: 'only a friend\'s match is opened by a player' }, 400);
    if (!pilot) return reply({ error: 'bad pilot' }, 400);
    id = newId();
    body = Object.assign({ id, queue: 'friend', rated: false, pilot, hidden: isHidden(pilot) }, who);
  } else if (b.op === 'join') {
    if (!isId(b.id)) return reply({ error: 'bad id' }, 400);
    if (!pilot) return reply({ error: 'bad pilot' }, 400);
    id = b.id;
    body = Object.assign({ pilot, hidden: isHidden(pilot) }, who);
  } else if (b.op === 'report') {
    if (!isId(b.id)) return reply({ error: 'bad id' }, 400);
    id = b.id;
    body = Object.assign({ report: b.report }, who);
  } else if (b.op === 'code') {
    if (!isId(b.id)) return reply({ error: 'bad id' }, 400);
    id = b.id;
    body = Object.assign(b.code !== undefined ? { code: b.code } : {}, who);
  } else {
    return reply({ error: 'unknown op' }, 400);
  }
  const stub = env.MATCH.get(env.MATCH.idFromName(id));
  const res = await stub.fetch('https://match/' + b.op, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return reply(await res.json(), res.status);
}
