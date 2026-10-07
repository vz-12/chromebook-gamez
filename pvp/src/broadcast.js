/* ===========================================================================
   ON AIR — a match's broadcast, kept (live spectating, step 1)

   A match is watched by playing it. Every viewer's own copy of the game runs
   the fight from the fighters' inputs, the way the two fighters' machines
   already do (LOCKSTEP CO-OP in index.html), so what travels is small: the
   run's header once, then both pilots' input for every step (about twenty
   bytes a step for the two), the fingerprints the game takes of itself once
   a second, and now and then a snapshot of the whole fight for whoever
   arrives late or falls behind. The same log, kept, is the fight's replay.

   One Broadcast object per match, named by the match's id, fed by one
   machine: the side flying the hidden pilot, which plays every step with
   both pilots' inputs in hand (watch.js says who may feed it). It keeps
   everything as it arrives and never deletes any of it.

     head    the header: the match as the server made it (no account in it),
             the run's start as the host sent it, both players' handshakes,
             the build. Once.
     in      a batch of steps, { from, n, recs, fps }: recs is base64 of the
             steps' input records, the host's then the guest's for each step,
             as lsWrite writes them; fps the game's fingerprints among them,
             [epoch, step, hash]. Batches arrive in order and nothing is
             skipped: one that does not start where the last ended is refused
             with where to start (`need`); one sent twice is taken once.
     snap    the whole fight at a step, as snapWrite writes it ({ at, epoch,
             json }), kept in pieces (KEEP.PART), every one of them: a replay
             seeks by them
     end     the fight is over: { at, result }
     view    a viewer's poll, open to anyone (view(), below)
     replay  the whole log at once (watch.js says to whom)
     info    whether there is a broadcast, and of which pilot (hidden.js)

   Viewers are answered from memory. The first request after the object
   wakes reads the log back once; after that a hundred viewers a second cost
   no storage reads at all.
   ========================================================================= */
import { Serial } from './objects.js';

export const KEEP = {
  MAX: 48 * 1024 * 1024,      // a broadcast's whole log, at most (a long fight is a few MB)
  PART: 96 * 1024,            // a snapshot is kept in pieces this size
  STEPS: 600,                 // steps in one batch, at most (ten seconds: a stall's worth)
  REC: 96                     // bytes of records a step, at most, for the two pilots
};
export const VIEW = {
  BEHIND: 30 * 60,            // a viewer this many steps behind the latest snapshot is given it
  MOST: 30 * 60,              // steps in one answer, at most: a viewer far behind asks again at once
  SEEN: 15 * 1000,            // a viewer heard from within this long counts as watching
  /* How often viewers ask: every second, until there are so many that the
     account's daily requests (the Workers Free plan's 100,000) are at risk;
     then each is asked to wait longer, so that all of them together stay
     near PER requests a second, up to MOST_MS apart. Every viewer plays a
     few of these behind live, so a longer wait costs delay, never a gap. */
  BASE_MS: 1000, PER: 60, MOST_MS: 5000
};

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const B64 = /^[A-Za-z0-9+/]*={0,2}$/;
const b64bytes = s => Math.floor(s.length * 3 / 4) - (s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0);

// a batch's fingerprints, as the referee takes them (referee.js, cleanReport): or null for a malformed one
function cleanFps(fps, from, n) {
  if (!Array.isArray(fps) || fps.length > Math.ceil(n / 60) + 1) return null;
  const out = [];
  for (const f of fps) {
    if (!Array.isArray(f) || f.length !== 3 || !int(f[0], 0, 0xffff) || !int(f[1], from, from + n) || !int(f[2], 0, 0xffffffff)) return null;
    out.push([f[0], f[1], f[2]]);
  }
  return out;
}

export class Broadcast extends Serial {
  constructor(ctx, env) {
    super(ctx, env);
    this.m = undefined;        // the log's index, once read: null while nothing is on air
    this.head = null;
    this.batches = [];         // every batch, in order
    this.snaps = new Map();    // snapshot number -> its text, read as needed
    this.viewers = new Map();  // viewer -> when last heard from
  }

  // the log, read back once
  async load() {
    if (this.m !== undefined) return;
    const S = this.ctx.storage;
    const m = (await S.get('m')) || null;
    if (m) {
      this.head = await S.get('h');
      for (let i = 0; i < m.n; i += 128) {
        const keys = [];
        for (let j = i; j < Math.min(m.n, i + 128); j++) keys.push('b' + j);
        const got = await S.get(keys);
        for (const k of keys) this.batches.push(got.get(k));
      }
    }
    this.m = m;
  }

  async snapText(k) {
    if (!this.snaps.has(k)) {
      const s = this.m.snaps[k], keys = [];
      for (let p = 0; p < s.parts; p++) keys.push('s' + k + '.' + p);
      const got = await this.ctx.storage.get(keys);
      this.snaps.set(k, keys.map(x => got.get(x)).join(''));
    }
    return this.snaps.get(k);
  }

  // how long viewers should wait between polls now (VIEW)
  pace(now) {
    for (const [v, t] of this.viewers) if (now - t > VIEW.SEEN) this.viewers.delete(v);
    return Math.min(VIEW.MOST_MS, VIEW.BASE_MS * Math.max(1, Math.ceil(this.viewers.size / VIEW.PER)));
  }

  async handle(op, b, now) {
    await this.load();
    const m = this.m, S = this.ctx.storage;

    if (op === 'info') return reply({ ok: true, on: !!m, pilot: m ? m.pilot : null });

    if (op === 'view') {
      if (typeof b.v === 'string' && /^[0-9a-f]{16}$/.test(b.v)) {
        if (this.viewers.size < 5000 || this.viewers.has(b.v)) this.viewers.set(b.v, now);
      }
      const every = this.pace(now);
      if (!m) return reply({ error: 'not on air', every }, 404);
      let from = int(b.from, -1, 1e9) ? b.from : -1;
      const out = { ok: true, last: m.last, end: m.end, every };
      if (from < 0) out.head = this.head;
      /* A snapshot: for a newcomer, one far behind, or one whose game has
         parted from the fight (`snap`): the latest there is. */
      const k = m.snaps.length - 1;
      if (k >= 0 && (from < 0 || b.snap === true || m.snaps[k].at - from > VIEW.BEHIND)) {
        out.snap = { at: m.snaps[k].at, epoch: m.snaps[k].epoch, json: await this.snapText(k) };
        from = m.snaps[k].at;
      }
      out.from = from = Math.max(0, from);
      out.batches = this.since(from, VIEW.MOST);
      return reply(out);
    }

    if (op === 'replay') {
      if (!m) return reply({ error: 'not on air' }, 404);
      const snaps = [];
      for (let k = 0; k < m.snaps.length; k++) snaps.push({ at: m.snaps[k].at, epoch: m.snaps[k].epoch, json: await this.snapText(k) });
      return reply({ v: 1, match: m.match, pilot: m.pilot, build: m.build, at: m.at, head: this.head,
                     batches: this.batches, snaps, end: m.end, last: m.last });
    }

    // the rest is the feed: from the Worker, for the one account that may feed it (watch.js)
    if (typeof b.acct !== 'string') return reply({ error: 'who' }, 400);
    if (op === 'head') {
      if (!b.head || typeof b.head !== 'object' || typeof b.build !== 'string' || typeof b.pilot !== 'string')
        return reply({ error: 'bad header' }, 400);
      if (m) {
        if (m.by !== b.acct) return reply({ error: 'not yours' }, 403);
        // sent again: the same header is no change; another, once the fight is under way, is refused
        if (JSON.stringify(this.head) === JSON.stringify(b.head)) return reply({ ok: true, next: m.last + 1 });
        if (m.n || m.snaps.length) return reply({ error: 'already on air' }, 409);
      }
      const size = JSON.stringify(b.head).length;
      this.m = { v: 1, match: String(b.match || ''), pilot: b.pilot, by: b.acct, at: now, build: b.build.slice(0, 40),
                 last: -1, n: 0, snaps: [], end: null, size };
      this.head = b.head;
      await S.put('h', this.head);
      await S.put('m', this.m);
      return reply({ ok: true, next: 0 });
    }
    if (!m) return reply({ error: 'no header yet' }, 409);
    if (m.by !== b.acct) return reply({ error: 'not yours' }, 403);

    if (op === 'in') {
      if (!int(b.from, 0, 1e9) || !int(b.n, 1, KEEP.STEPS) || typeof b.recs !== 'string' || !B64.test(b.recs)
          || b64bytes(b.recs) > b.n * KEEP.REC) return reply({ error: 'bad batch' }, 400);
      const fps = cleanFps(b.fps === undefined ? [] : b.fps, b.from, b.n);
      if (!fps) return reply({ error: 'bad fingerprints' }, 400);
      if (b.from !== m.last + 1) {
        const had = this.at(b.from);
        if (had && had.from === b.from && had.n === b.n) return reply({ ok: true, next: m.last + 1 });   // sent twice
        return reply({ error: 'out of order', need: m.last + 1 }, 409);
      }
      const batch = { from: b.from, n: b.n, recs: b.recs, fps };
      const size = b.recs.length + JSON.stringify(fps).length + 24;
      if (m.size + size > KEEP.MAX) return reply({ error: 'the log is full' }, 413);
      await S.put('b' + m.n, batch);
      this.batches.push(batch);
      m.n++; m.last = b.from + b.n - 1; m.size += size;
      await S.put('m', m);
      return reply({ ok: true, next: m.last + 1 });
    }
    if (op === 'snap') {
      if (!int(b.at, 0, m.last + 1) || !int(b.epoch, 0, 0xffff) || typeof b.json !== 'string' || !b.json.length)
        return reply({ error: 'bad snapshot' }, 400);
      if (m.snaps.some(s => s.at === b.at && s.epoch === b.epoch)) return reply({ ok: true });   // sent twice
      if (m.snaps.length && b.at < m.snaps[m.snaps.length - 1].at) return reply({ error: 'out of order' }, 409);
      if (m.size + b.json.length > KEEP.MAX) return reply({ error: 'the log is full' }, 413);
      const k = m.snaps.length, parts = Math.ceil(b.json.length / KEEP.PART);
      for (let p = 0; p < parts; p++) await S.put('s' + k + '.' + p, b.json.slice(p * KEEP.PART, (p + 1) * KEEP.PART));
      m.snaps.push({ at: b.at, epoch: b.epoch, parts, size: b.json.length });
      m.size += b.json.length;
      this.snaps.clear();                    // only the newest is asked for: the rest are read back if a replay wants them
      this.snaps.set(k, b.json);
      await S.put('m', m);
      return reply({ ok: true });
    }
    if (op === 'end') {
      if (!m.end) {
        const r = b.result && typeof b.result === 'object' ? b.result : null;
        m.end = { at: int(b.at, 0, 1e9) ? b.at : m.last + 1, t: now,
                  result: r && (r.winner === 0 || r.winner === 1) && Array.isArray(r.score) && r.score.length === 2
                    && int(r.score[0], 0, 9) && int(r.score[1], 0, 9) ? { winner: r.winner, score: [r.score[0], r.score[1]] } : null };
        await S.put('m', m);
      }
      return reply({ ok: true });
    }
    return reply({ error: 'unknown op' }, 404);
  }

  // where the batch holding step s is, or -1
  find(s) {
    const B = this.batches;
    let lo = 0, hi = B.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1, x = B[mid];
      if (s < x.from) hi = mid - 1; else if (s >= x.from + x.n) lo = mid + 1; else return mid;
    }
    return -1;
  }
  at(s) { const i = this.find(s); return i < 0 ? null : this.batches[i]; }

  // the batches from the one holding step `from`, up to about `most` steps
  since(from, most) {
    const out = [];
    let i = this.find(from), steps = 0;
    if (i < 0) return out;
    for (; i < this.batches.length && steps < most; i++) { out.push(this.batches[i]); steps += this.batches[i].n; }
    return out;
  }
}
