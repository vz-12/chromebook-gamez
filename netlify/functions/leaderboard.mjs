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
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

export const config = { path: '/api/leaderboard' };

/* The season rule lives in one place, shared with the scheduled closer. */
import { STORE, KEY, RETRIES, SEASON_DAY, META, ARCHIVE, seasonKey, isSeason,
         seasonOf, seasonStart, seasonEnd, seasonAfter,
         closeSeason, ensureSeason } from '../lib/season.mjs';
const MAX_ENTRIES = 100;
const MAX_NAME = 16;

/* Days are UTC and the server decides which one it is. A board keyed on each
   client's local date would quietly compare runs flown against two different
   briefs, and "which day is it" has to have exactly one answer for a shared
   leaderboard to mean anything. */
const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const dayKey = d => 'day:' + d;
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);


/* An award belongs to a profile id, never to a name. Names are typed in by
   whoever fancies them; a pid is generated once inside one browser and only
   ever travels to this function, so it is the closest thing to an identity a
   game with no accounts has. It does not make a score honest — nothing here
   can — but it does mean the reward lands on the machine that held the spot
   rather than on anyone who later types the same name. */
const isPid = v => typeof v === 'string' && /^[0-9a-f]{16,64}$/.test(v);

/* ---------------------------- handouts -----------------------------------
   Skins given to a particular profile for a reason no achievement covers —
   a tester, a friend, somebody who was here before the thing worked.

   The list lives in this file because this file is a function, not an
   asset: it never reaches a browser. That is the difference between a gate
   and a decoration. The version of this that shipped a hash in the client
   was not a gate at all — the phrase was never the secret, since any string
   landing on the same 32 bits opened the same door, and one was found in
   671 million tries with no knowledge of the original. Guessing a profile
   id instead means guessing 128 bits at one online attempt per try.

   TO ADD SOMEBODY: they run `copy(Save.profile.pid)` in the console once
   and send you the value — or, if they have ever submitted a score, it is
   recorded beside their name in that board's blob. Paste it below with a
   comment saying who, and redeploy. TO TAKE IT BACK: delete the line. The
   grant is not stored on the player's machine as a permission, only as a
   cached award, so removing it here removes it everywhere on the next sync.

   A pid is a bearer token: whoever holds the string collects what is
   addressed to it. That is fine for a handout and is exactly why podium
   places are addressed the same way and never displayed in the game. */
/* ------------------------------ dev accounts -----------------------------
   A login that hands a profile every skin at once.

   The password is not in this file and never travels to a browser. What is
   here is a scrypt hash of it under a random per-account salt, so somebody
   who reads this source — or an old backup of it — still has no password.
   Comparison is constant-time, and an unknown user is made to cost the same
   as a known one so the endpoint cannot be used to learn which names exist.

   TO ADD AN ACCOUNT: run  node C:/.claude/devpass.mjs  and paste the line it
   prints. It takes the password on stdin and never writes it anywhere.
   TO REVOKE: delete the line here AND the profile's row from the `grants`
   blob — the login is what grants, but the grant outlives the login.
-------------------------------------------------------------------------- */
const ALL_SKINS = ['laurel', 'standard', 'ember-mark', 'void-sovereign',
                   'redaction', 'redaction-open', 'draft'];
/* Everything that is not a skin: the rooms, the routes, the challenges and
   the codex. One id rather than a list of them, because a dev account wants
   the whole game and enumerating it here would be a second copy of a list
   the client already keeps and would drift from. */
const ALL_PERKS = ['unlock-all'];
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 32;

const DEV_ACCOUNTS = {

  notz: { salt: '7ef417684c9605974196d78621c6ee8a',
        hash: '449aa7a763eefec4f9301717b53aa59b7ee04211a3b82e3221cb3d35478aebc1',
        skins: ALL_SKINS, perks: ALL_PERKS },
};

/* A stand-in used when the named account does not exist, so a wrong user and
   a wrong password take the same time and the same shape of answer. Its salt
   is fresh per cold start and its hash is of nothing anybody knows. */
const DUMMY = { salt: randomBytes(16).toString('hex'),
                hash: randomBytes(KEYLEN).toString('hex') };

function passOk(account, password) {
  const a = account || DUMMY;
  if (typeof password !== 'string' || !password || password.length > 200) {
    // still pay the cost, so a blank password is not measurably faster
    try { scryptSync('x', Buffer.from(DUMMY.salt, 'hex'), KEYLEN, SCRYPT); } catch (e) {}
    return false;
  }
  let want, got;
  try {
    want = Buffer.from(a.hash, 'hex');
    got = scryptSync(password, Buffer.from(a.salt, 'hex'), KEYLEN, SCRYPT);
  } catch (e) { return false; }
  if (want.length !== got.length) return false;
  return timingSafeEqual(want, got) && !!account;
}

/* Attempts are counted against the source address rather than the profile id:
   a pid is chosen by the client and rotating it is free, an address is not.
   Netlify sets the first of these; the second is the ordinary proxy header
   and is only ever used to key a rate limit, never to decide who anybody is. */
const clientIp = req =>
  ((req.headers.get('x-nf-client-connection-ip') || '') ||
   (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim().slice(0, 45)
  || 'unknown';

const GRANTS = 'grants';      // { byPid: { '<pid>': { user, skins, at } } }
const GATE = 'gate';          // { byIp: { '<ip>': { fails, until } } }
const LOCK_AFTER = 6, LOCK_MS = 15 * 60 * 1000;

/* Reads, prunes and writes the attempt log in one pass. Pruning on the way
   past is what stops a blob that only ever grows — an expired lock is not a
   record of anything. */
async function gateBump(store, ip, failed) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(GATE, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const now = Date.now();
    const byIp = {};
    const src = (res && res.data && res.data.byIp) || {};
    for (const k of Object.keys(src))
      if (src[k] && src[k].until > now) byIp[k] = src[k];
    const cur = byIp[ip] || { fails: 0, until: 0 };
    if (!failed) delete byIp[ip];
    else {
      cur.fails = (cur.fails || 0) + 1;
      if (cur.fails >= LOCK_AFTER) { cur.until = now + LOCK_MS; cur.fails = 0; }
      else cur.until = now + LOCK_MS;      // the window the count lives in
      byIp[ip] = cur;
    }
    const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(GATE, { byIp }, opts).catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return cur;
  }
  return { fails: 0, until: 0 };
}

/* Locked out? Read-only, so a lookup never costs a write. */
async function gateLocked(store, ip) {
  const doc = await store.get(GATE, { type: 'json' }).catch(() => null);
  const rec = doc && doc.byIp && doc.byIp[ip];
  if (!rec || !rec.until || rec.until <= Date.now()) return 0;
  // only a completed lockout blocks; a partial count just accumulates
  return rec.fails === 0 ? Math.ceil((rec.until - Date.now()) / 1000) : 0;
}

/* Binds an account's skins to the profile that logged in. Additive: logging
   in twice, or into a second account, never takes anything away. */
async function grantTo(store, pid, user, skins, perks) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(GRANTS, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const byPid = Object.assign({}, (res && res.data && res.data.byPid) || {});
    const had = (byPid[pid] && byPid[pid].skins) || [];
    const hadP = (byPid[pid] && byPid[pid].perks) || [];
    byPid[pid] = { user, at: Date.now(),
                   skins: [...new Set([...had, ...skins])],
                   perks: [...new Set([...hadP, ...(perks || [])])] };
    const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(GRANTS, { byPid }, opts)
      .catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return byPid[pid].skins;
  }
  return skins;
}

const SKIN_GRANTS = {
  'ecd8c7a3671b4582f6b62ee1106510c8': ['draft'],   // MARIO — beta tester
};

/* Every board leaves through here. A pid is how a podium and a dev grant
   are addressed, so publishing one next to a name hands anyone the ability
   to write it into their own save and collect that player's rewards — which
   is the whole reason podium places are addressed by pid and never shown.
   It is kept on the stored entry because closing a season needs it, and it
   must not leave this function. */
const publicBoard = entries =>
  (entries || []).map(e => {
    const { pid, ...rest } = e;
    return rest;
  });

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
  out.sort((a, b) => (a.season < b.season ? 1 : -1));
  /* Handouts after the podiums and never sorted among them: they have no
     season to be ordered by. Own-property only, so a pid of `constructor`
     or `__proto__` cannot pull something off the prototype — isPid already
     refuses both, and this does not depend on it having. */
  const given = [];
  if (Object.prototype.hasOwnProperty.call(SKIN_GRANTS, pid))
    given.push(...SKIN_GRANTS[pid]);
  // and whatever a dev login has bound to this profile
  const g = await store.get(GRANTS, { type: 'json' }).catch(() => null);
  const row = g && g.byPid && Object.prototype.hasOwnProperty.call(g.byPid, pid)
    ? g.byPid[pid] : null;
  if (row && Array.isArray(row.skins)) given.push(...row.skins);
  for (const id of [...new Set(given)]) out.push({ skin: id, via: 'GRANTED' });
  if (row && Array.isArray(row.perks))
    for (const id of [...new Set(row.perks)]) out.push({ perk: id, via: 'GRANTED' });
  return out;
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
                              best: kept.score,
                              top: publicBoard(top) }, extra));
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
      return json(Object.assign({ forDay: asked,
                                  top: publicBoard(cur && cur.entries) }, meta));
    }

    // all-time is still kept, but it is no longer what "the leaderboard" means
    const key = q.get('all') !== null ? KEY : seasonKey(season);
    const cur = await store.get(key, { type: 'json' }).catch(() => null);
    return json(Object.assign({ top: publicBoard(cur && cur.entries),
                                allTime: q.get('all') !== null }, meta));
  }
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  if (body && body.selftest) return json({ selftest: await selfTest(store) });

  /* A dev login. Answers 'no' to every kind of wrong — unknown user, wrong
     password, malformed anything — so the reply never says which part was
     wrong, and the attempt is counted against the address either way. */
  if (body && body.devAuth) {
    const ip = clientIp(req);
    const wait = await gateLocked(store, ip);
    if (wait) return json({ error: 'too many attempts', retryIn: wait }, 429);

    const pid = body.pid;
    const user = String((body.devAuth && body.devAuth.user) || '')
      .toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
    const acct = Object.prototype.hasOwnProperty.call(DEV_ACCOUNTS, user)
      ? DEV_ACCOUNTS[user] : null;
    const ok = isPid(pid) && passOk(acct, String((body.devAuth && body.devAuth.pass) || ''));
    if (!ok) {
      await gateBump(store, ip, true);
      return json({ error: 'no' }, 401);
    }
    await gateBump(store, ip, false);          // a good login clears the count
    const skins = await grantTo(store, pid, user, acct.skins || ALL_SKINS,
                                acct.perks || ALL_PERKS);
    return json({ ok: true, user, skins: skins.length,
                  perks: (acct.perks || ALL_PERKS).length });
  }

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
       are playing, and for all-time, which is the record.

       A replay counts once. A client that has been offline can push a best
       it had stranded locally, and that run may have been flown under a
       season which closed months ago — filing it against whichever season
       happens to be open now would put a stale score at the top of a board
       nobody set it on. It goes to all-time, which is where a record
       belongs, and reaches the season board only when it names the season
       still running. A live run names nothing and is dated here. */
    const replay = !!(body && body.backfill);
    const forSeason = body && body.forSeason;
    const seasonToo = !replay || (isSeason(forSeason) && forSeason === season);
    const a = await commit(store, KEY, entry, mergeBoard);
    if (!seasonToo)
      return placed(a.top, entry, a.kept, Object.assign(
        { allTimeOnly: true, degraded: a.degraded || undefined }, meta));
    const s = await commit(store, seasonKey(season), entry, mergeBoard);
    return placed(s.top, entry, s.kept, Object.assign(
      { allTimeBest: a.kept.score, degraded: (s.degraded || a.degraded) || undefined }, meta));
  } catch (e) {
    return json({ error: 'write failed: ' + String((e && e.message) || e).slice(0, 120) }, 503);
  }
};
