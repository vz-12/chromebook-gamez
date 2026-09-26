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

// Fold an entry into the board: one row per name, keeping the better run.
function mergeBoard(entries, entry) {
  const prev = entries.find(e => e.name === entry.name);
  const kept = prev && prev.score >= entry.score ? prev : entry;
  const merged = entries.filter(e => e.name !== entry.name);
  merged.push(kept);
  merged.sort((a, b) => b.score - a.score);
  return { top: merged.slice(0, MAX_ENTRIES), kept };
}

/* Exercises the exact conditional-write path the leaderboard depends on,
   against a throwaway key. Verifies a fresh ETag is accepted and a stale one
   is refused — the two things a fake store cannot prove. */
async function selfTest(store) {
  const K = 'selftest';
  const s = {};
  try {
    // Unconditional write first, so "can we write at all?" is measured
    // independently of whether conditional writes work.
    const first = await store.setJSON(K, { n: 1, at: Date.now() });
    s.canWrite = !!(first && first.modified);

    const mid = await store.getWithMetadata(K, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    s.reReadEtag = mid && mid.etag ? String(mid.etag).slice(0, 32) : null;

    // THE critical one: does a freshly-read ETag satisfy onlyIfMatch?
    const second = await store.setJSON(K, { n: 2, at: Date.now() },
      { onlyIfMatch: mid && mid.etag });
    s.casAccepted = !!(second && second.modified);

    // And is a wrong ETag actually refused, or is the option ignored?
    const stale = await store.setJSON(K, { n: 3, at: Date.now() },
      { onlyIfMatch: '"not-a-real-etag"' });
    s.staleRefused = !(stale && stale.modified);
  } catch (e) {
    s.error = String((e && e.message) || e).slice(0, 200);
  }
  s.verdict = s.error ? 'blobs threw'
    : s.casAccepted ? (s.staleRefused ? 'compare-and-swap healthy'
                                      : 'writes work, but onlyIfMatch is ignored')
    : 'BROKEN: conditional writes always fail — only the first submission can ever land';
  return s;
}

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  if (req.method === 'GET') {
    const cur = await store.get(KEY, { type: 'json' }).catch(() => null);
    return json({ top: (cur && cur.entries) || [] });
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  if (body && body.selftest) return json({ selftest: await selfTest(store) });

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
    const { top, kept } = mergeBoard(entries, entry);

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

  /* Every conditional write failed. That is either genuine contention or an
     ETag mismatch we cannot see from here — and if it is the latter, retrying
     forever would mean the board could never be updated again after its first
     entry. Fall back to an unconditional write: risking a rare lost update is
     strictly better than permanently refusing every score. */
  try {
    const res = await store.getWithMetadata(KEY, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const entries = (res && res.data && res.data.entries) || [];
    const { top, kept } = mergeBoard(entries, entry);
    await store.setJSON(KEY, { entries: top, updated: Date.now() });
    const rank = top.findIndex(e => e.name === entry.name);
    return json({ ok: true, rank: rank >= 0 ? rank + 1 : null,
                  best: kept.score, top, degraded: true });
  } catch (e) {
    return json({ error: 'write failed: ' + String((e && e.message) || e).slice(0, 120) }, 503);
  }
};
