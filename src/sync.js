/* ===========================================================================
   NETLIFY SYNC — keeps D1 in step with the old Netlify leaderboard store.

   Players who still open the Netlify address keep writing scores there, and
   everything from before the move lives there: the boards, the season
   archive that podium awards are paid from, dev-account grants, the vigil.
   Every 15 minutes the cron pulls that store through its export endpoint and
   MERGES it into D1, so nothing set on either side is lost:

     top, season:*      one row per name, the better score stands
     day:*              one row per name, the EARLIER run stands (a daily is
                        ranked on the first run of the day)
     seasons            a season already filed here is kept; one only filed
                        on Netlify is added
     grants             per profile, the union of skins and perks
     vigil:*            per profile, the union of quests done, and the
                        candle counts recomputed from the pay table, so a
                        quest is never paid twice
     anything new       copied across if D1 has nothing under that name

   meta (this side keeps its own calendar), gate (lockouts) and selftest are
   never copied, and a MISFILED row (a run under somebody else's callsign)
   is dropped from both sides.

   Every run also adds to the WELCOME BACK list (see leaderboard.js): each
   callsign that was on an old board and the old profile ids that posted it,
   which is how a returning player is recognised, and given their old id
   back, on a new address where none of their old save exists. Every write is a compare-and-swap, the same as a player's,
   and nothing is written unless the merge changed something, so a sync with
   nothing new costs reads only.

   Where to pull from lives in D1, never in the repo: the export answers only
   to a key, and what it hands over carries every player's profile id. Row
   voidrunner-sync/config holds { url, key }; without it this does nothing.
   The outcome of each run goes in voidrunner-sync/state. The export stops
   answering on 2026-10-15, after which a run records the failure and moves
   on. Delete this file, its cron and its call in index.js after that.
   ========================================================================= */
import { getStore } from './store.js';
import { STORE, RETRIES, backoff, META } from './season.js';
import { VIGIL, COMEBACK_KEY, comebackName } from './leaderboard.js';

const SYNC = 'voidrunner-sync';
const MAX_ENTRIES = 100;
const TIMEOUT_MS = 15000;
const NEVER = new Set([META, 'gate', 'selftest']);

/* Rows on the old boards filed under the wrong player: one player's run,
   posted from their own profile under another player's callsign. They are
   dropped from every merge, here and in D1, and kept out of the WELCOME
   BACK list, so each of these callsigns points only at its own player's
   profile. Matched on callsign (any case) and pid together. */
const MISFILED = [
  // NOT Z's 4,942,749, posted once as "mario" from NOT Z's profile
  { name: 'mario', pid: 'f55ca5526c1f29cb7f368838657b3ed7' },
  // Mario's 3,649,291, posted once as "not z" from Mario's profile
  { name: 'not z', pid: 'ecd8c7a3671b4582f6b62ee1106510c8' },
];
const misfiled = e => !!e && typeof e.name === 'string' &&
  MISFILED.some(m => m.pid === e.pid && m.name === comebackName(e.name));

const byScore = (a, b) => b.score - a.score;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* Fold Netlify's rows into ours, one row per name, `wins(ours, theirs)`
   deciding which of two rows for the same name stands. */
function mergeRows(ours, theirs, wins) {
  const byName = new Map();
  for (const e of ours || [])
    if (e && typeof e.name === 'string' && !misfiled(e)) byName.set(e.name, e);
  for (const e of theirs || []) {
    if (!e || typeof e.name !== 'string' || typeof e.score !== 'number') continue;
    if (misfiled(e)) continue;
    const mine = byName.get(e.name);
    if (!mine || !wins(mine, e)) byName.set(e.name, e);
  }
  return [...byName.values()].sort(byScore).slice(0, MAX_ENTRIES);
}
const better = (mine, e) => mine.score >= e.score;
const earlier = (mine, e) => (mine.at || 0) <= (e.at || 0);

function mergeDoc(key, ours, theirs) {
  if (key === 'top' || key.startsWith('season:'))
    return { entries: mergeRows(ours && ours.entries, theirs.entries, better),
             updated: Date.now() };
  if (key.startsWith('day:'))
    return { entries: mergeRows(ours && ours.entries, theirs.entries, earlier),
             updated: Date.now() };
  if (key === 'seasons') {
    const list = Object.assign({}, (ours && ours.list) || {});
    for (const [id, rec] of Object.entries((theirs && theirs.list) || {}))
      if (!own(list, id)) list[id] = rec;
    return { list };
  }
  if (key === 'grants') {
    const byPid = Object.assign({}, (ours && ours.byPid) || {});
    for (const [pid, g] of Object.entries((theirs && theirs.byPid) || {})) {
      const mine = own(byPid, pid) ? byPid[pid] : null;
      if (!mine) { byPid[pid] = g; continue; }
      byPid[pid] = Object.assign({}, mine, {
        skins: [...new Set([...(mine.skins || []), ...(g.skins || [])])],
        perks: [...new Set([...(mine.perks || []), ...(g.perks || [])])]
      });
    }
    return { byPid };
  }
  if (key.startsWith('vigil:')) {
    const id = key.slice(6);
    const ev = own(VIGIL, id) ? VIGIL[id] : null;
    if (!ev) return ours || theirs;
    const doc = { total: 0, byPid: {}, byIp: (ours && ours.byIp) || {} };
    const pids = new Set([...Object.keys((ours && ours.byPid) || {}),
                          ...Object.keys((theirs && theirs.byPid) || {})]);
    for (const pid of pids) {
      const a = (ours && ours.byPid && ours.byPid[pid]) || {};
      const b = (theirs && theirs.byPid && theirs.byPid[pid]) || {};
      const q = [...new Set([...(a.q || []), ...(b.q || [])])].filter(x => own(ev.pay, x));
      const n = q.reduce((s, x) => s + ev.pay[x], 0);
      doc.byPid[pid] = { q, n, at: Math.max(a.at || 0, b.at || 0) };
      doc.total += n;
    }
    return doc;
  }
  return ours || theirs;                       // unknown: copy only if absent
}

/* Merge one document under compare-and-swap. Returns whether it changed. */
async function syncDoc(store, key, theirs) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const ours = res ? res.data : null;
    const next = mergeDoc(key, ours, theirs);
    const same = d => d && JSON.stringify(Object.assign({}, d, { updated: 0 }));
    if (ours && same(ours) === same(next)) return false;
    const wrote = await store.setJSON(key, next,
      res ? { onlyIfMatch: res.etag } : { onlyIfNew: true });
    if (wrote.modified) return true;
    await backoff(i);                          // a player wrote first; go again
  }
  throw new Error('could not merge ' + key + ' (busy)');
}

const PID_RE = /^[0-9a-f]{16,64}$/;

/* Every callsign on every old board, and which old pids posted it — keyed
   'n:<name>' so a callsign like __proto__ is only a name. */
function knownPlayers(docs) {
  const owners = new Map();
  for (const [key, doc] of docs) {
    if (!doc || typeof doc !== 'object') continue;
    if (key !== 'top' && !key.startsWith('season:') && !key.startsWith('day:')) continue;
    for (const e of doc.entries || []) {
      if (misfiled(e)) continue;
      const n = e && comebackName(e.name);
      if (!n || n === 'anon') continue;
      if (!owners.has(n)) owners.set(n, new Set());
      if (typeof e.pid === 'string' && PID_RE.test(e.pid)) owners.get(n).add(e.pid);
    }
  }
  return owners;
}

/* Union into the stored list, under compare-and-swap. It only ever grows: a
   callsign the old site knew stays known, with every pid that posted it,
   after the old site is gone. The one thing taken out is a MISFILED pair. */
async function recordKnown(store, known) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(COMEBACK_KEY, { type: 'json', consistency: 'strong' });
    const had = (res && res.data) || {};
    const owners = {};
    for (const [k, l] of Object.entries(had.owners || {}))
      if (k.startsWith('n:') && Array.isArray(l)) owners[k] = new Set(l);
    for (const n of had.names || []) if (!owners['n:' + n]) owners['n:' + n] = new Set();
    for (const [n, ps] of known) {
      const k = 'n:' + n;
      owners[k] = new Set([...(owners[k] || []), ...ps]);
    }
    // and out of what an earlier run already filed
    for (const m of MISFILED) if (owners['n:' + m.name]) owners['n:' + m.name].delete(m.pid);
    const next = { names: Object.keys(owners).map(k => k.slice(2)).sort(), owners: {} };
    for (const k of Object.keys(owners).sort()) next.owners[k] = [...owners[k]].sort();
    const was = { names: had.names || [], owners: had.owners || {} };
    if (JSON.stringify(was) === JSON.stringify(next)) return false;
    const wrote = await store.setJSON(COMEBACK_KEY, next,
      res ? { onlyIfMatch: res.etag } : { onlyIfNew: true });
    if (wrote.modified) return true;
    await backoff(i);
  }
  throw new Error('could not record returning players (busy)');
}

export async function syncFromNetlify(env) {
  const sync = getStore(env, SYNC);
  const cfg = await sync.get('config', { type: 'json' });
  if (!cfg) return null;
  const state = { at: Date.now(), from: cfg.url };
  try {
    if (typeof cfg.url !== 'string' || typeof cfg.key !== 'string')
      throw new Error('config row is malformed');
    const r = await fetch(cfg.url, {
      headers: { 'x-export-key': cfg.key, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!r.ok) throw new Error('export answered HTTP ' + r.status);
    const body = await r.json();
    if (!body || !Array.isArray(body.docs)) throw new Error('export had no docs array');

    const store = getStore(env, STORE);
    state.seen = 0; state.changed = [];
    const docs = [];
    for (const d of body.docs) {
      if (!d || typeof d.key !== 'string' || typeof d.value !== 'string') continue;
      if (NEVER.has(d.key) || d.key === COMEBACK_KEY) continue;
      state.seen++;
      const value = JSON.parse(d.value);
      docs.push([d.key, value]);
      if (await syncDoc(store, d.key, value)) state.changed.push(d.key);
    }
    const known = knownPlayers(docs);
    if (await recordKnown(store, known)) state.changed.push(COMEBACK_KEY);
    state.returning = known.size;
    state.ok = true;
    console.log('netlify sync: ' + state.seen + ' docs, changed: ' + (state.changed.join(', ') || 'none'));
  } catch (e) {
    state.ok = false;
    state.error = String((e && e.message) || e).slice(0, 300);
    console.error('netlify sync failed: ' + state.error);
  }
  await sync.setJSON('state', state).catch(() => {});
  return state;
}
