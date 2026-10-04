/* ===========================================================================
   The Durable Objects matchmaking will live in (PVP-PLAN.md, Phase 5): one
   Matchmaker per queue, holding its players' WebSockets and pairing tickets,
   and one Match per match, the signalling and the referee. SQLite-backed, so
   they run on the Free plan.

   Declared now so their bindings and migration exist from the first deploy.
   Nothing reaches them yet; they answer that it is too soon.
   ========================================================================= */
const tooSoon = () => new Response(JSON.stringify({ error: 'matchmaking arrives in a later update' }),
  { status: 501, headers: { 'content-type': 'application/json' } });

export class Matchmaker {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch() { return tooSoon(); }
}

export class Match {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch() { return tooSoon(); }
}
