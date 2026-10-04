/* ===========================================================================
   PvP's Durable Objects (PVP-PLAN.md, Phase 5). SQLite-backed, so they run on
   the Free plan; both answer plain requests from the Worker, never the
   browser directly, so the account a request names is the session's.

     Match        one per match: who is in it and the referee (referee.js).
                  Its whole state is one stored document; an alarm looks at
                  it when nobody has reported for a while, and empties the
                  object once the verdict has been kept long enough.
     Matchmaker   one per queue (step 2); not yet.
   ========================================================================= */
import { REF, cleanReport, newSide, take, decide, nextLook, recorded } from './referee.js';
import { recordMatch } from './records.js';

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// what a side is told of the match: never the other side's account or fingerprints
const view = (m, side) => ({
  ok: true, id: m.id, side, queue: m.queue,
  peer: m.sides[1 - side] ? { name: m.sides[1 - side].name, pilot: m.sides[1 - side].pilot } : null,
  verdict: m.verdict ? { v: m.verdict.v, winner: m.verdict.winner ?? null, score: m.verdict.score || null } : null
});

export class Match {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    let b;
    try { b = await req.json(); } catch (e) { return reply({ error: 'bad json' }, 400); }
    const now = Date.now();
    let m = await this.ctx.storage.get('m');

    if (op === 'open') {
      if (m) return reply({ error: 'that match exists' }, 409);
      m = { v: 1, id: b.id, queue: b.queue, rated: !!b.rated, league: b.league || null, created: now, started: 0,
            sides: [newSide(b.acct, b.name, b.pilot, now)], mismatch: null, verdict: null };
      return this.save(m, now, view(m, 0));
    }
    if (!m || m.verdict && m.verdict.v === 'expired') return reply({ error: 'no such match' }, 404);
    const side = m.sides.findIndex(s => s && s.acct === b.acct);

    if (op === 'join') {
      if (side >= 0) return reply(view(m, side));            // asked twice: the same answer
      if (m.sides[1]) return reply({ error: 'that match is full' }, 409);
      if (m.verdict) return reply({ error: 'that match is over' }, 409);
      m.sides[1] = newSide(b.acct, b.name, b.pilot, now);
      m.started = now;
      m.sides[0].seen = now;          // the host has been in its waiting room: its clock starts now
      return this.save(m, now, view(m, 1));
    }
    if (op === 'report') {
      if (side < 0) return reply({ error: 'not your match' }, 403);
      if (!m.sides[1]) return reply(view(m, side));          // nobody to play yet: nothing to referee
      const rep = cleanReport(b.report);
      if (!rep) return reply({ error: 'bad report' }, 400);
      if (!m.verdict) take(m, side, rep, now);
      return this.save(m, now, null, side);
    }
    return reply({ error: 'unknown op' }, 404);
  }

  // nobody has reported for a while: what does that come to
  async alarm() {
    const now = Date.now();
    const m = await this.ctx.storage.get('m');
    if (!m) return;
    if (m.verdict && (m.verdict.v === 'expired' || now >= m.verdict.at + REF.KEEP)) {
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.save(m, now);
  }

  /* The match, after whatever just changed: decided if it now is, written
     to D1 once, stored, and looked at again when it next needs to be. */
  async save(m, now, answer, side) {
    const d = decide(m, now);
    if (d) m.verdict = Object.assign({ at: now }, d);
    if (m.verdict && recorded(m.verdict.v) && !m.verdict.written) {
      try { await recordMatch(this.env.DB, m, m.verdict); m.verdict.written = true; }
      catch (e) { console.error('pvp record', m.id, e && e.message); }   // tried again at the next look
    }
    await this.ctx.storage.put('m', m);
    const next = m.verdict && recorded(m.verdict.v) && !m.verdict.written ? now + 15000 : nextLook(m, now);
    await this.ctx.storage.setAlarm(m.verdict && m.verdict.v === 'expired' ? now + 1000 : next);
    return reply(answer || view(m, side));
  }
}

const tooSoon = () => reply({ error: 'matchmaking arrives in a later update' }, 501);
export class Matchmaker {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }
  async fetch() { return tooSoon(); }
}
