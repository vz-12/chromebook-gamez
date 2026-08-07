/* ===========================================================================
   VOIDRUNNER — global leaderboard
   GET  /api/leaderboard   -> { top: [...] }
   POST /api/leaderboard   -> { ok, rank, best, top }

   Storage is a single Netlify Blob holding the whole board. Concurrent
   submissions use compare-and-swap on the blob's ETag, so two players
   finishing at the same moment can't clobber each other's entry.

   There are no accounts, so a submission is only ever a *claim*. The checks
   below raise the effort bar (shape, ceilings, plausibility, one row per
   name) but they cannot make a client-submitted score trustworthy.
   ========================================================================= */
import { getStore } from '@netlify/blobs';

export const config = { path: '/api/leaderboard' };

const KEY = 'top';
const STORE = 'voidrunner-leaderboard';
const MAX_ENTRIES = 100;
const MAX_NAME = 16;
const RETRIES = 6;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

// Drop control characters and collapse whitespace. Names are drawn straight
// onto a canvas, so this is about layout sanity rather than HTML escaping.
function cleanName(v) {
  const raw = String(v == null ? '' : v);
  let out = '';
  for (const ch of raw) {
    if (ch >= ' ' && ch.codePointAt(0) !== 127) out += ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

const int = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};

// A run's score is bounded by how far it actually got. Deliberately generous:
// this rejects absurd claims, not merely very good runs.
const plausible = e =>
  e.time >= 15 &&
  e.score <= 6000 * e.wave + 400 * e.kills + 60000;

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    const cur = await store.get(KEY, { type: 'json' }).catch(() => null);
    return json({ top: (cur && cur.entries) || [] });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  const entry = {
    name:   cleanName(body.name) || 'ANON',
    score:  int(body.score, 1e9),
    wave:   int(body.wave, 500),
    sector: cleanName(body.sector).slice(0, 20) || '-',
    loop:   int(body.loop, 100) || 0,
    level:  int(body.level, 500),
    kills:  int(body.kills, 5e5),
    time:   int(body.time, 86400),
    at:     Date.now()
  };

  for (const f of ['score', 'wave', 'level', 'kills', 'time']) {
    if (entry[f] === null) return json({ error: 'bad field: ' + f }, 400);
  }
  if (entry.score <= 0) return json({ error: 'empty run' }, 400);
  if (!plausible(entry)) return json({ error: 'implausible run' }, 422);

  // --- optimistic concurrency: read, merge, conditional write, retry ---
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const res = await store
      .getWithMetadata(KEY, { type: 'json', consistency: 'strong' })
      .catch(() => null);

    const entries = (res && res.data && res.data.entries) || [];
    const etag = res && res.etag;

    // one row per name: keep whichever run scored higher
    const prev = entries.find(e => e.name === entry.name);
    const kept = prev && prev.score >= entry.score ? prev : entry;
    const merged = entries.filter(e => e.name !== entry.name);
    merged.push(kept);
    merged.sort((a, b) => b.score - a.score);
    const top = merged.slice(0, MAX_ENTRIES);

    const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const wrote = await store
      .setJSON(KEY, { entries: top, updated: Date.now() }, opts)
      .catch(() => ({ modified: false }));

    if (wrote && wrote.modified) {
      const rank = top.findIndex(e => e.name === entry.name);
      return json({ ok: true, rank: rank >= 0 ? rank + 1 : null,
                    best: kept.score, top });
    }
    // someone else wrote first — re-read and merge again
  }

  return json({ error: 'too much contention, try again' }, 503);
};
