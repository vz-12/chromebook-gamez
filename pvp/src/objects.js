/* ===========================================================================
   PvP's Durable Objects (PVP-PLAN.md, Phase 5). SQLite-backed, so they run on
   the Free plan; both answer plain requests from the Worker, never the
   browser directly, so the account a request names is the session's.

     Match        one per match: who is in it and the referee (referee.js).
                  Its whole state is one stored document; an alarm looks at
                  it when nobody has reported for a while, and empties the
                  object once the verdict has been kept long enough.
     Matchmaker   one per queue (rules.js, QUEUES): the tickets waiting, the
                  pairing, and the queue's ratings, which only it writes, one
                  match at a time (records.js, applyRating).

   The platform hands an object a new request while it waits on D1 or on
   another object, so each runs its changes one at a time itself (`one`):
   two reports at once can never each write over the other.
   ========================================================================= */
import { REF, cleanReport, newSide, take, decide, nextLook, recorded } from './referee.js';
import { recordMatch, applyRating } from './records.js';
import { QUEUES, CASUAL, lowerLeague } from './rules.js';
import { newId } from '../../src/auth.js';

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const post = (stub, path, body) =>
  stub.fetch('https://do/' + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

// an object's changes, one after another, whatever each waits on
class Serial {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.chain = Promise.resolve(); }
  one(f) {
    const p = this.chain.then(f);
    this.chain = p.catch(() => {});
    return p;
  }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1);
    let b;
    try { b = await req.json(); } catch (e) { return reply({ error: 'bad json' }, 400); }
    if (!b || typeof b !== 'object') return reply({ error: 'bad json' }, 400);
    return this.one(() => this.handle(op, b, Date.now()));
  }
  alarm() { return this.one(() => this.look(Date.now())); }
}

/* --------------------------------- MATCH --------------------------------- */

/* What a side is told of the match: never the other side's account or
   fingerprints. With a rated verdict, once written, its own rating before
   and after (the result screen's). */
const view = (m, side) => ({
  ok: true, id: m.id, side, queue: m.queue,
  peer: m.sides[1 - side] ? { name: m.sides[1 - side].name, pilot: m.sides[1 - side].pilot } : null,
  verdict: m.verdict ? { v: m.verdict.v, winner: m.verdict.winner ?? null, score: m.verdict.score || null,
                         rating: (m.verdict.ratings && m.verdict.ratings[side]) || null } : null
});
const isCode = v => typeof v === 'string' && /^[A-Z0-9]{4}$/.test(v);

export class Match extends Serial {
  async handle(op, b, now) {
    let m = await this.ctx.storage.get('m');

    if (op === 'open') {
      if (m) return reply({ error: 'that match exists' }, 409);
      m = { v: 1, id: b.id, queue: b.queue, rated: !!b.rated, league: b.league || null, created: now, started: 0,
            sides: [newSide(b.acct, b.name, b.pilot, now)], mismatch: null, verdict: null, code: null };
      return this.save(m, now, view(m, 0));
    }
    /* A queued match, from its Matchmaker: both sides at once, so it starts
       now. Only the Matchmaker asks this (the Worker forwards a player's
       open, join, report and code, nothing else). */
    if (op === 'create') {
      if (m) return reply({ error: 'that match exists' }, 409);
      const [a, c] = b.sides || [];
      if (!a || !c) return reply({ error: 'two sides' }, 400);
      m = { v: 1, id: b.id, queue: b.queue, rated: !!b.rated, league: b.league || null, created: now, started: now,
            sides: [newSide(a.acct, a.name, a.pilot, now), newSide(c.acct, c.name, c.pilot, now)],
            mismatch: null, verdict: null, code: null };
      return this.save(m, now, { ok: true, id: m.id });
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
    /* A queued match's room: the host opens one and leaves its code here,
       and the guest asks for it, so nobody types a code. */
    if (op === 'code') {
      if (side < 0) return reply({ error: 'not your match' }, 403);
      if (b.code !== undefined) {
        if (side !== 0) return reply({ error: 'only the host has a room' }, 403);
        if (!isCode(b.code)) return reply({ error: 'bad code' }, 400);
        m.code = b.code;
        await this.ctx.storage.put('m', m);
      }
      return reply({ ok: true, code: m.code || null, verdict: view(m, side).verdict });
    }
    return reply({ error: 'unknown op' }, 404);
  }

  // nobody has reported for a while: what does that come to
  async look(now) {
    const m = await this.ctx.storage.get('m');
    if (!m) return;
    if (m.verdict && (m.verdict.v === 'expired' || now >= m.verdict.at + REF.KEEP)) {
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.save(m, now);
  }

  /* The match, after whatever just changed: decided if it now is, written
     to D1 once, its ratings asked of its queue's Matchmaker once, stored,
     and looked at again when it next needs to be. A failed write or rating
     is tried again at the next look, fifteen seconds on. */
  async save(m, now, answer, side) {
    const d = decide(m, now);
    if (d) m.verdict = Object.assign({ at: now }, d);
    const v = m.verdict;
    if (v && recorded(v.v) && !v.written) {
      try { await recordMatch(this.env.DB, m, v); v.written = true; }
      catch (e) { console.error('pvp record', m.id, e && e.message); }
    }
    if (v && v.written && m.rated && !v.rated) {
      try {
        const mm = this.env.MATCHMAKER;
        const r = await post(mm.get(mm.idFromName(m.queue)), 'rate', { id: m.id });
        if (r.ok) {
          v.rated = true;
          const d = await r.json().catch(() => null);
          if (d && Array.isArray(d.ratings) && d.ratings.length === 2) v.ratings = d.ratings;
        } else console.error('pvp rating', m.id, r.status);
      } catch (e) { console.error('pvp rating', m.id, e && e.message); }
    }
    await this.ctx.storage.put('m', m);
    const owed = v && recorded(v.v) && (!v.written || (m.rated && !v.rated));
    await this.ctx.storage.setAlarm(v && v.v === 'expired' ? now + 1000 : owed ? now + 15000 : nextLook(m, now));
    return reply(answer || view(m, side));
  }
}

/* ------------------------------ MATCHMAKER ------------------------------- */

export const MM = {
  STALE: 12 * 1000,      // a ticket nobody has polled for this long has gone: dropped
  KEEP: 30 * 1000,       // a match found is held this long for its players to collect
  TICK: 2000,            // the alarm's beat while anybody waits
  REGION: 300,           // a pairing across continents costs this much rating apart
  LEAGUE: 400,           // and one across leagues (ranked), this much
  WINDOW: {              // how far apart a pairing may be: from, more each second waited, at most
    ranked: [100, 8, 1500],
    casual: [200, 15, 3000]
  }
};

const cost = (queue, t, u) => Math.abs(t.rating - u.rating) + (t.region !== u.region ? MM.REGION : 0)
  + (QUEUES[queue].leagues && t.league !== u.league ? MM.LEAGUE : 0);
const windowOf = (queue, waited) => {
  const [from, per, most] = MM.WINDOW[queue];
  return Math.min(most, from + per * waited / 1000);
};
// what a player polling is told: still waiting, or the match found (held for KEEP once first collected)
function status(t, now, tab) {
  if (!t) return { state: 'none' };
  if (tab && t.tab && t.tab !== tab) return { state: 'elsewhere' };    // the account searches from another tab now
  if (!t.match) return { state: 'waiting', waited: now - t.since };
  if (!t.got) t.got = now;
  return { state: 'matched', match: t.match };
}

/* A queue. Its tickets are the Worker's (pvp/src/queue.js): who, flying
   what, the rating and league they are matched on, the region. The oldest
   ticket is paired first, with whoever is nearest within how long it has
   waited (cost, windowOf), never across brackets (rules.js, bracketOf),
   never with itself. A pair is given a Match (above), the older ticket
   hosts, and each player finds it at their next poll. */
export class Matchmaker extends Serial {
  async handle(op, b, now) {
    if (op === 'rate') {
      const r = await applyRating(this.env.DB, b.id);
      return reply(r, r.ok ? 200 : 404);
    }
    if (!Object.prototype.hasOwnProperty.call(QUEUES, b.queue)) return reply({ error: 'unknown queue' }, 400);
    const q = (await this.ctx.storage.get('q')) || { queue: b.queue, tickets: [] };
    this.sweep(q, now);
    let t = q.tickets.find(x => x.acct === b.acct);

    if (op === 'join') {
      // a match found and not yet collected stays found; anything else starts again
      if (!(t && t.match && !t.got)) {
        if (t) q.tickets.splice(q.tickets.indexOf(t), 1);
        t = Object.assign({}, b.ticket, { acct: b.acct, tab: b.tab || null, since: now, seen: now, match: null, at: 0, got: 0 });
        q.tickets.push(t);
      } else t.tab = b.tab || t.tab;
    } else if (op === 'poll') {
      if (t && !(b.tab && t.tab && t.tab !== b.tab)) t.seen = now;
    } else if (op === 'leave') {
      // only the tab holding the ticket gives it up
      if (t && !t.match && !(b.tab && t.tab && t.tab !== b.tab)) { q.tickets.splice(q.tickets.indexOf(t), 1); t = null; }
      await this.store(q, now);
      return reply(t ? status(t, now, b.tab) : { state: 'left' });
    } else {
      return reply({ error: 'unknown op' }, 404);
    }
    await this.pair(q, now);
    const out = status(t, now, b.tab);
    await this.store(q, now);
    return reply(out);
  }

  // the beat: gone tickets dropped, and anyone who can be paired now is
  async look(now) {
    const q = await this.ctx.storage.get('q');
    if (!q) return;
    this.sweep(q, now);
    await this.pair(q, now);
    await this.store(q, now);
  }

  sweep(q, now) {
    q.tickets = q.tickets.filter(t => (t.match ? now - (t.got || t.at) <= MM.KEEP : now - t.seen <= MM.STALE));
  }

  async store(q, now) {
    await this.ctx.storage.put('q', q);
    if (q.tickets.length) await this.ctx.storage.setAlarm(now + MM.TICK);
    else await this.ctx.storage.deleteAlarm();
  }

  async pair(q, now) {
    const queue = q.queue, open = q.tickets.filter(t => !t.match).sort((a, b) => a.since - b.since);
    const taken = new Set(), pairs = [];
    for (const t of open) {
      if (taken.has(t)) continue;
      const room = windowOf(queue, now - t.since);
      let best = null, bestCost = Infinity;
      for (const u of open) {
        if (u === t || taken.has(u) || u.acct === t.acct || u.bracket !== t.bracket) continue;
        const c = cost(queue, t, u);
        if (c <= room && c < bestCost) { best = u; bestCost = c; }
      }
      if (best) { taken.add(t); taken.add(best); pairs.push([t, best]); }
    }
    for (const [t, u] of pairs) {
      const def = QUEUES[queue];
      const rule = def.leagues ? lowerLeague(t.league, u.league) : CASUAL;
      const id = newId();
      const res = await post(this.env.MATCH.get(this.env.MATCH.idFromName(id)), 'create', {
        id, queue, rated: def.rated, league: def.leagues ? rule.id : null,
        sides: [t, u].map(x => ({ acct: x.acct, name: x.name, pilot: x.pilot }))
      }).catch(e => { console.error('pvp match create', e && e.message); return null; });
      if (!res || !res.ok) continue;      // both wait on, and are tried again at the next beat
      // the match as each player is told it: the rules it flies, and both sides, never an account
      const sides = [t, u].map(x => ({ name: x.name, pilot: x.pilot, awake: !!x.awake, ups: x.ups || [] }));
      const league = { id: rule.id, n: rule.n, bestOf: rule.bestOf, pilots: rule.pilots, awake: rule.awake };
      for (const [side, x] of [[0, t], [1, u]]) {
        x.match = { id, side, role: side ? 'guest' : 'host', queue, rated: def.rated, league, bestOf: rule.bestOf, sides };
        x.at = now;
      }
    }
  }
}
