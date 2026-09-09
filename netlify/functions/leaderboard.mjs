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

/* Days are UTC and the server decides which one it is. A board keyed on each
   client's local date would quietly compare runs flown against two different
   briefs, and "which day is it" has to have exactly one answer for a shared
   leaderboard to mean anything. */
const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const dayKey = d => 'day:' + d;
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/* A season runs from the 6th to the 6th, UTC, and is named for the month it
   opens in: '2026-09' opens 6 Sep and closes 6 Oct. The 6th rather than the
   1st is deliberate — a reset on the 1st lands on New Year's Day, and a board
   that turns over during the one week of the year everybody is playing is a
   board that throws away its best month. */
const SEASON_DAY = 6;
const META = 'meta';            // { current: '<season>' }
const ARCHIVE = 'seasons';      // { list: { '<season>': { top3, closedAt } } }
const seasonKey = id => 'season:' + id;
const isSeason = v => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);

function seasonOf(t = Date.now()) {
  const d = new Date(t);
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (d.getUTCDate() < SEASON_DAY) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  return y + '-' + String(m + 1).padStart(2, '0');
}
function seasonStart(id) {
  const [y, m] = id.split('-').map(Number);
  return Date.UTC(y, m - 1, SEASON_DAY);
}
function seasonEnd(id) {
  const [y, m] = id.split('-').map(Number);
  return Date.UTC(y, m, SEASON_DAY);           // the 6th of the following month
}
const seasonAfter = id => seasonOf(seasonEnd(id));

/* An award belongs to a profile id, never to a name. Names are typed in by
   whoever fancies them; a pid is generated once inside one browser and only
   ever travels to this function, so it is the closest thing to an identity a
   game with no accounts has. It does not make a score honest — nothing here
   can — but it does mean the reward lands on the machine that held the spot
   rather than on anyone who later types the same name. */
const isPid = v => typeof v === 'string' && /^[0-9a-f]{16,64}$/.test(v);

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

/* The daily rule. A daily is ranked on the first run of the day, so the first
   row a name files is the row that stands and a better practice run later must
   not displace it. Enforced here rather than trusted to the client, because
   "only submit your first run" is not a thing a client can be relied on for. */
/* Files a finished season's top three. Only writes when that season has no
   record yet, so a second closer adds nothing and destroys nothing — which is
   what makes it safe for every request to attempt the close. */
async function closeSeason(store, id) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(ARCHIVE, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const list = (res && res.data && res.data.list) || {};
    if (list[id]) return;                              // already filed
    const board = await store.get(seasonKey(id), { type: 'json' }).catch(() => null);
    const top3 = ((board && board.entries) || []).slice(0, 3).map((e, i) => ({
      rank: i + 1, name: e.name, score: e.score, wave: e.wave, pid: e.pid || null
    }));
    list[id] = { top3, closedAt: Date.now() };
    const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(ARCHIVE, { list }, opts)
      .catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return;
  }
}

/* The rollover. Lazy by necessity: a function only exists while a request is
   in flight, so there is nobody to notice midnight on the 6th except the next
   caller. It walks forward one season at a time rather than jumping, so a
   month nobody played still gets closed and filed (empty) instead of being
   skipped — the archive stays a continuous record. */
async function ensureSeason(store) {
  const now = seasonOf();
  for (let i = 0; i < 24; i++) {
    const res = await store.getWithMetadata(META, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    if (!res || !res.data || !isSeason(res.data.current)) {
      // first request this store has ever seen: adopt today, close nothing
      await store.setJSON(META, { current: now, since: Date.now() }).catch(() => {});
      return now;
    }
    const cur = res.data.current;
    if (cur === now) return now;
    // a pointer ahead of the clock means somebody else's skew, not our cue
    if (seasonStart(cur) > seasonStart(now)) return now;
    await closeSeason(store, cur);
    await store.setJSON(META, { current: seasonAfter(cur), since: Date.now() },
                        { onlyIfMatch: res.etag }).catch(() => ({ modified: false }));
    // whether that landed or another request got there first, re-read and see
  }
  return now;
}

/* Every podium finish this profile has ever held, newest season first. The
   archive holds one small record a month, so a scan is cheaper than an index
   and cannot fall out of step with what was actually filed. */
async function awardsFor(store, pid) {
  const doc = await store.get(ARCHIVE, { type: 'json' }).catch(() => null);
  const list = (doc && doc.list) || {};
  const out = [];
  for (const id of Object.keys(list)) {
    for (const row of (list[id].top3 || [])) {
      if (row.pid && row.pid === pid) out.push({ season: id, rank: row.rank, name: row.name });
    }
  }
  return out.sort((a, b) => (a.season < b.season ? 1 : -1));
}

function mergeFirst(entries, entry) {
  const prev = entries.find(e => e.name === entry.name);
  const sorted = arr => arr.slice().sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  if (prev) return { top: sorted(entries), kept: prev, already: true };
  return { top: sorted([...entries, entry]), kept: entry, already: false };
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

/* Read, merge, conditional write, retry — over whichever key and whichever
   merge rule the caller is working with. */
async function commit(store, key, entry, merge) {
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    const res = await store
      .getWithMetadata(key, { type: 'json', consistency: 'strong' })
      .catch(() => null);

    const entries = (res && res.data && res.data.entries) || [];
    const etag = res && res.etag;
    const merged = merge(entries, entry);

    const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
    const wrote = await store
      .setJSON(key, { entries: merged.top, updated: Date.now() }, opts)
      .catch(() => ({ modified: false }));

    if (wrote && wrote.modified) return merged;
    // someone else wrote first — re-read and merge again
  }

  /* Every conditional write failed. That is either genuine contention or an
     ETag mismatch we cannot see from here — and if it is the latter, retrying
     forever would mean the board could never be updated again after its first
     entry. Fall back to an unconditional write: risking a rare lost update is
     strictly better than permanently refusing every score. */
  const res = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' })
    .catch(() => null);
  const entries = (res && res.data && res.data.entries) || [];
  const merged = merge(entries, entry);
  await store.setJSON(key, { entries: merged.top, updated: Date.now() });
  merged.degraded = true;
  return merged;
}

const placed = (top, entry, kept, extra) => {
  const rank = top.findIndex(e => e.name === entry.name);
  return json(Object.assign({ ok: true, rank: rank >= 0 ? rank + 1 : null,
                              best: kept.score, top }, extra));
};

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });
  const today = utcDay();
  /* Before anything else reads or writes a board: if the 6th has passed since
     the last request, the old season is closed and filed here, and everything
     below is already talking about the new one. */
  const season = await ensureSeason(store);
  const meta = { day: today, season, seasonEnds: seasonEnd(season) };

  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams;

    /* Which podiums a profile holds. Answered by pid and never by name, so
       the reply cannot be used to enumerate who won what. */
    const pid = q.get('awards');
    if (pid !== null) {
      if (!isPid(pid)) return json({ error: 'bad pid' }, 400);
      return json(Object.assign({ awards: await awardsFor(store, pid) }, meta));
    }

    // the finished seasons, for a hall of past winners
    if (q.get('archive') !== null) {
      const doc = await store.get(ARCHIVE, { type: 'json' }).catch(() => null);
      const list = (doc && doc.list) || {};
      const out = Object.keys(list).sort().reverse().map(id => ({
        season: id, closedAt: list[id].closedAt,
        // pids never leave the function attached to a name
        top3: (list[id].top3 || []).map(r => ({ rank: r.rank, name: r.name,
                                                score: r.score, wave: r.wave }))
      }));
      return json(Object.assign({ seasons: out }, meta));
    }

    const asked = q.get('day');
    if (asked !== null) {
      if (!isDay(asked)) return json({ error: 'bad day' }, 400);
      const cur = await store.get(dayKey(asked), { type: 'json' }).catch(() => null);
      return json(Object.assign({ forDay: asked, top: (cur && cur.entries) || [] }, meta));
    }

    // all-time is still kept, but it is no longer what "the leaderboard" means
    const key = q.get('all') !== null ? KEY : seasonKey(season);
    const cur = await store.get(key, { type: 'json' }).catch(() => null);
    return json(Object.assign({ top: (cur && cur.entries) || [],
                                allTime: q.get('all') !== null }, meta));
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
  // carried so a season close knows which machine to hand the podium to
  if (isPid(body && body.pid)) entry.pid = body.pid;

  for (const f of ['score', 'wave', 'level', 'kills', 'time']) {
    if (entry[f] === null) return json({ error: 'bad field: ' + f }, 400);
  }
  if (entry.score <= 0) return json({ error: 'empty run' }, 400);
  if (!plausible(entry)) return json({ error: 'implausible run' }, 422);

  try {
    /* A daily submission names the day it belongs to, and the server decides
       whether that is still today. A tab left open across midnight, a clock
       set backwards, or a hand-written POST aimed at a finished day are all
       the same thing from here, and all refused: filing a run under the wrong
       brief is worse than losing it. A daily is its own game, so it touches
       neither the season nor the all-time board. */
    const day = body && body.day;
    if (day !== undefined && day !== null && day !== '') {
      if (!isDay(day)) return json({ error: 'bad day' }, 400);
      if (day !== today) return json({ error: 'day is closed' }, 409);
      const r = await commit(store, dayKey(day), entry, mergeFirst);
      return placed(r.top, entry, r.kept, Object.assign(
        { already: !!r.already, degraded: r.degraded || undefined }, meta));
    }
    /* An ordinary run counts twice: for the season, which is the board people
       are playing, and for all-time, which is the record. The season board is
       the one reported back, because it is the one the run is competing on. */
    const s = await commit(store, seasonKey(season), entry, mergeBoard);
    const a = await commit(store, KEY, entry, mergeBoard);
    return placed(s.top, entry, s.kept, Object.assign(
      { allTimeBest: a.kept.score, degraded: (s.degraded || a.degraded) || undefined }, meta));
  } catch (e) {
    return json({ error: 'write failed: ' + String((e && e.message) || e).slice(0, 120) }, 503);
  }
};
