/* ===========================================================================
   Per-account request limits on PvP's busy routes (PVP-PLAN.md, Phase 5
   step 4): the queue (/api/pvp/queue), the referee (/api/pvp/match), and
   opening a friend's match.

   Counted in this Worker instance's memory: free, no storage, approximate.
   Each Cloudflare location and instance counts on its own, and a restart
   forgets. That is enough for what it is for: a stuck or hostile client
   hammering the queue or the referee is turned away before it costs a
   Durable Object request or a database read. Honest clients ask every 1.5 s
   at most (pvp.js polls the queue every 2 s, match.js asks for a room code
   every 1.5 s while connecting, referee.js reports every 5 s), well inside
   these, even with the same account in two tabs.
   ========================================================================= */
export const LIMITS = {
  queue: { n: 90, ms: 60 * 1000 },        // join, poll, leave
  match: { n: 120, ms: 60 * 1000 },       // open, join, report, code
  open: { n: 30, ms: 10 * 60 * 1000 }     // friend's matches opened (each is a new object)
};
const MAX_KEYS = 5000;
const seen = new Map();

/* One more request of this kind from this account: 0 while within the
   limit, else the seconds until it resets. */
export function limited(kind, acct, now = Date.now()) {
  const L = LIMITS[kind];
  const k = kind + ':' + acct;
  let w = seen.get(k);
  if (!w || now >= w.until) { w = { n: 0, until: now + L.ms }; seen.set(k, w); }
  w.n++;
  if (seen.size > MAX_KEYS) {
    for (const [key, v] of seen) if (now >= v.until) seen.delete(key);
    if (seen.size > MAX_KEYS) seen.clear();
  }
  return w.n > L.n ? Math.max(1, Math.ceil((w.until - now) / 1000)) : 0;
}

export const tooMany = wait => new Response(JSON.stringify({ error: 'too many requests: try again shortly', wait }), {
  status: 429, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'retry-after': String(wait) } });

// the tests' reset
export const forget = () => seen.clear();
