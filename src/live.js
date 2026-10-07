/* ===========================================================================
   GET /api/live — what is on air (live spectating, step 1): a hidden pilot's
   challenge being fought, for the game's menu to put in front of everybody.
   Open to anyone, signed in or not.

     -> { live: { match, since, t, x, names: [the pilot's, the other's] } | null,
          every }

   `every` is how many seconds the game should wait before asking again: a
   minute while one is on or near, a quarter of an hour otherwise, so a game
   left open costs a request every fifteen minutes on an ordinary day. What
   is on, and the words, are PvP's (../pvp/src/challenge.js, liveNow): the
   queue notes the match when it makes it, the referee when it decides it,
   and the announcement is kept in the vault until then.

   The answer is kept for LIVE_KEEP in this Worker's memory and for as long
   in the browser's cache: it changes twice a fight, and every open game
   asks for it.

   Note: this Worker's build does not watch pvp/*. A change to liveNow alone
   reaches the game on its next deploy.
   ========================================================================= */
import { liveNow } from '../pvp/src/challenge.js';

const LIVE_KEEP = 30 * 1000;
let kept = null;                   // { at, body }

export default async function live(req, env) {
  if (req.method !== 'GET') return new Response(JSON.stringify({ error: 'method not allowed' }), {
    status: 405, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  const now = Date.now();
  if (!kept || now - kept.at > LIVE_KEEP) kept = { at: now, body: JSON.stringify(await liveNow(env.DB, now)) };
  return new Response(kept.body, { headers: { 'content-type': 'application/json',
    'cache-control': 'public, max-age=' + Math.round(LIVE_KEEP / 1000) } });
}
// the tests' reset
export const forgetLive = () => { kept = null; };
