/* ===========================================================================
   VOIDRUNNER — global leaderboard
   GET  /api/leaderboard   -> { top: [...] }
   POST /api/leaderboard   -> { ok, rank, best, top }

   Storage is a single document in the D1-backed store (store.js) holding the
   whole board. Concurrent submissions use compare-and-swap on the document's
   ETag, so two players finishing at the same moment can't clobber each
   other's entry.

   There are no accounts, so a submission is only ever a *claim*. The checks
   below raise the effort bar (shape, ceilings, plausibility, one row per
   name) but they cannot make a client-submitted score trustworthy.
   ========================================================================= */
import { getStore } from './store.js';
import { scorePut } from './boards.js';
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';

/* The season rule lives in one place, shared with the scheduled closer. */
import { STORE, KEY, RETRIES, backoff, SEASON_DAY, META, ARCHIVE, seasonKey, isSeason,
         seasonOf, seasonStart, seasonEnd, seasonAfter,
         closeSeason, ensureSeason } from './season.js';
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
   ever travels to this Worker, so it is the closest thing to an identity a
   game with no accounts has. It does not make a score honest — nothing here
   can — but it does mean the reward lands on the machine that held the spot
   rather than on anyone who later types the same name. */
const isPid = v => typeof v === 'string' && /^[0-9a-f]{16,64}$/.test(v);

/* ---------------------------- handouts -----------------------------------
   Skins given to a particular profile for a reason no achievement covers —
   a tester, a friend, somebody who was here before the thing worked.

   The list lives in this file because this file is Worker code, not an
   asset: it never reaches a browser. That is the difference between a gate
   and a decoration. The version of this that shipped a hash in the client
   was not a gate at all — the phrase was never the secret, since any string
   landing on the same 32 bits opened the same door, and one was found in
   671 million tries with no knowledge of the original. Guessing a profile
   id instead means guessing 128 bits at one online attempt per try.

   TO ADD SOMEBODY: they run `copy(Save.profile.pid)` in the console once
   and send you the value — or, if they have ever submitted a score, it is
   recorded beside their name in that board's row. Paste it below with a
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
                   'redaction', 'redaction-open', 'draft',
                   // the BOSS RUSH's three, knight to king
                   'rush-knight', 'rush-duke', 'rush-king',
                   // ALL HALLOWS: the vigil's four prizes
                   'hl-carved', 'hl-lantern', 'hl-hallows', 'hl-lostsoul'];
/* Everything that is not a skin: the rooms, the routes, the challenges and
   the codex. One id rather than a list of them, because a dev account wants
   the whole game and enumerating it here would be a second copy of a list
   the client already keeps and would drift from. */
/* unlock-evo: every evolution that has been built, awake. Its own id because
   waking a hull skips its rite, and an account may want the rest without it. */
/* unlock-event: ALL HALLOWS open to the account before its date, to try it
   on a real device. The vigil's count still refuses what is reported outside
   its window, so a test run lights no real candles. */
const ALL_PERKS = ['unlock-all', 'unlock-evo', 'unlock-event'];
const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEYLEN = 32;

const DEV_ACCOUNTS = {

   notz: { salt: '291e5059855b9b6a9119e44d9d23ac37',
        hash: '8ae86433b090a5c06a779dad1a018ef608f0c90042b741bb16b80ba099722ee2',
        skins: ALL_SKINS, perks: ALL_PERKS },
};
// reserved as account names (account.js), so no account can pass itself off as one
export const DEV_LOGINS = Object.keys(DEV_ACCOUNTS);

/* Dev accounts with no login: the profile is the key. Each gets what a
   DEV_ACCOUNTS login binds, read on every sync the way awardsFor reads an
   account, so there is no grants row behind it — delete the line and the
   next sync takes it all back. A pid is a bearer token (see SKIN_GRANTS).

   `callsign` hands the pid out by name (WELCOME BACK): on the new address
   a player has a new pid, and typing any spelling of the callsign that
   reads the same claims this one, so its grants follow its player there.
   Mario's is the pid that posted "Mario", "mario" and "ERROR" on the old
   boards. (The one listed here before, f55ca552, was NOT Z's, from a run
   posted once as "mario"; it keeps everything through its notz login.) */
const DEV_PIDS = {
  'ecd8c7a3671b4582f6b62ee1106510c8': { who: 'mario', callsign: 'mario',
                                        skins: ALL_SKINS, perks: ALL_PERKS },
};

/* A stand-in used when the named account does not exist, so a wrong user and
   a wrong password take the same time and the same shape of answer. Its salt
   is fresh per isolate and its hash is of nothing anybody knows. Made on first
   use, not at load: a Worker may not generate random values in global scope. */
let DUMMY = null;
const dummy = () => DUMMY || (DUMMY = { salt: randomBytes(16).toString('hex'),
                                        hash: randomBytes(KEYLEN).toString('hex') });

function passOk(account, password) {
  const a = account || dummy();
  if (typeof password !== 'string' || !password || password.length > 200) {
    // still pay the cost, so a blank password is not measurably faster
    try { scryptSync('x', Buffer.from(dummy().salt, 'hex'), KEYLEN, SCRYPT); } catch (e) {}
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
   Cloudflare sets the first of these on every request and a client cannot
   forge it; the second is the ordinary proxy header and is only ever used to
   key a rate limit, never to decide who anybody is. */
const clientIp = req =>
  ((req.headers.get('cf-connecting-ip') || '') ||
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

/* =============================== ALL HALLOWS ================================
   THE VIGIL: one number every profile adds to. A quest is paid once per
   profile however often it is reported, and only by the table below, so the
   client never says how much — it says which quest, and this decides. That
   caps any one profile at a finished story's worth. New profiles are counted
   against the address that brings them in, so minting pids to pad the count
   runs out quickly.

   The marks are here, not in the game, so they can be moved mid-event
   without shipping it. The window has a day's grace after the end: a quest
   finished at 23:59 on the last night still lands. None before the start:
   nobody but a dev account can play before then, and its test runs must not
   light real candles.

   VIGIL_ANYTIME in the environment lifts the window, for a local test run:
   `npx wrangler dev --var VIGIL_ANYTIME:1`. (nodejs_compat puts Worker vars
   on process.env, which is what keeps the line below unchanged.)
========================================================================== */
export const VIGIL = {
  'hallows-2026': {
    from: '2026-10-01', to: '2026-11-02',           // UTC days, inclusive
    pay: { q1: 10, q2: 15, q3: 10, q4: 15, q5: 10, q6: 20, q7: 20 },
    marks: [150, 400, 750, 1200]
  }
};
const VIGIL_NEW_PER_IP = 6;         // new profiles one address may add in a day
const vigilKey = id => 'vigil:' + id;
const vigilOpen = (ev, day) =>
  !!(typeof process !== 'undefined' && process.env && process.env.VIGIL_ANYTIME) ||
  (day >= ev.from && day <= ev.to);
function vigilView(ev, doc, pid) {
  const total = (doc && doc.total) || 0;
  const mine = pid && doc && doc.byPid && doc.byPid[pid];
  return { total, marks: ev.marks, reached: ev.marks.filter(m => total >= m),
           lit: mine ? mine.n || 0 : 0, done: mine ? mine.q || [] : [] };
}
async function vigilTurnIn(store, id, ev, quest, pid, ip, today) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(vigilKey(id), { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const doc = (res && res.data) || { total: 0, byPid: {}, byIp: {} };
    doc.byPid = doc.byPid || {}; doc.byIp = doc.byIp || {};
    const me = doc.byPid[pid];
    if (me && (me.q || []).includes(quest)) return { view: vigilView(ev, doc, pid), already: true };
    if (!me) {
      // a new profile, counted against the address for the day
      const a = doc.byIp[ip] && doc.byIp[ip].day === today ? doc.byIp[ip] : { day: today, n: 0 };
      if (a.n >= VIGIL_NEW_PER_IP) return { error: 'too many new profiles' };
      a.n++; doc.byIp[ip] = a;
    }
    // yesterday's address counts are nobody's business today
    for (const k of Object.keys(doc.byIp)) if (doc.byIp[k].day !== today) delete doc.byIp[k];
    const cur = doc.byPid[pid] || { q: [], n: 0 };
    cur.q = [...(cur.q || []), quest];
    cur.n = (cur.n || 0) + ev.pay[quest];
    cur.at = Date.now();
    doc.byPid[pid] = cur;
    doc.total = (doc.total || 0) + ev.pay[quest];
    const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(vigilKey(id), doc, opts).catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return { view: vigilView(ev, doc, pid) };
    await backoff(i);
  }
  return { error: 'busy' };
}

/* =============================== WELCOME BACK ===============================
   The game was down for a few days at the end of September 2026, and moved
   house to come back. Every returning player is owed THE HACKER and ten
   challenge passes; the game holds both as one perk, 'comeback', in the
   same awards list a dev grant arrives in.

   The move is also why this cannot be read off the player's machine: the
   new site is a different address, so no save, pid or cookie from the old
   one comes with them. What does come with them is the callsign they type.
   sync.js keeps every callsign that was on an old board, and which old
   profile id posted it (COMEBACK_KEY).

   Entering one of those callsigns claims the gift, and with it the old pid
   the callsign played under: the reply carries it (`adopt`), and the game
   takes it up as its own, so that player's boards, vigil candles and any
   podium still to come are theirs again. Once, every way round:

     · one claim per old pid: from then on every callsign that pid ever
       posted under is off limits, and typing any of them gets nothing.
     · an old pid never turns into a different old pid. One that turns up
       as itself claims itself, whatever callsign it gives, so it can
       neither take up nor use up anybody else's.
     · one claim per profile: a pid that has claimed keeps its gift and its
       old pid whatever it is renamed to, and never takes up another.
     · a callsign posted by several old pids, or with no pid on record,
       still pays the gift but hands no pid back: there is no saying whose
       it was.
     · a pid given something by hand — DEV_PIDS, SKIN_GRANTS, PERK_GRANTS, a dev login's
       grants — is never handed out by name, since a callsign is on every
       leaderboard for anyone to read. Its callsigns still pay the gift and
       are still taken; the pid stays where it is. The exception is a
       DEV_PIDS entry with a `callsign`, which is handed out like any old
       pid, and answers to every spelling of that callsign (looseNames):
       Mario, MARIO, M A R I O, Mar1o, mario_2.
     · nothing is claimed until sync.js has filed which old pid posted each
       callsign: a claim made before that could neither hand the pid back
       nor close off its other callsigns, and would stand like that for
       good. The game asks again every launch.

   All of it is one document written under compare-and-swap, so two
   profiles racing for the same callsign cannot both win it. A callsign is
   not an identity — anyone can type one — so this is first come, first
   served, and the first to type an old callsign walks off with its pid.
========================================================================== */
export const COMEBACK_KEY = 'comeback';  // { names: [...], owners: {'n:<name>': [old pid...]} }, from sync.js
/* { byName: {'n:<name>': pid}    callsigns taken, and by which profile
     byPid:  {pid: {name, adopt}}  each claimant, and each old pid taken up:
                                   the callsign, and the old pid handed back
     old:    {oldPid: pid} }       old pids already claimed, and by whom
   A byPid entry that is a bare string is a claim from before old pids were
   handed back; it is settled the next time that profile asks. */
const CLAIMS_KEY = 'comeback-claims';
export const comebackName = v => cleanName(v).toLowerCase();
// names are prefixed as keys, so a callsign like __proto__ is only a name
const claimKey = n => 'n:' + n;
const hasOwn = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

/* A callsign with its spelling taken out: lower case, letters only, runs of
   a letter cut to one. Twice, once reading digits and symbols as the
   letters they stand in for (Mar1o, M4RIO) and once dropping them
   (mario123), since either is how a name gets dressed up. */
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', '$': 's' };
function looseNames(v) {
  const low = cleanName(v).toLowerCase();
  const squeeze = t => t.replace(/[^a-z]/g, '').replace(/(.)\1+/g, '$1');
  return [squeeze(low), squeeze([...low].map(ch => LEET[ch] || ch).join(''))];
}
/* The DEV_PIDS entry whose callsign this name is a spelling of, if any. */
function devByCallsign(name) {
  const mine = looseNames(name).filter(Boolean);
  for (const [pid, d] of Object.entries(DEV_PIDS))
    if (d.callsign && mine.includes(looseNames(d.callsign)[0]))
      return { pid, n: comebackName(d.callsign) };
  return null;
}

async function handGiven(store, pid) {
  if (hasOwn(DEV_PIDS, pid) && DEV_PIDS[pid].callsign) return false;   // handed out by name
  if (hasOwn(DEV_PIDS, pid) || hasOwn(SKIN_GRANTS, pid) || hasOwn(PERK_GRANTS, pid)) return true;
  const g = await store.get(GRANTS, { type: 'json' }).catch(() => null);
  return !!(g && hasOwn(g.byPid, pid));
}

/* { has, adopt }: whether this profile has the gift, and the old pid it is
   to take up, if there is one. */
async function comebackClaim(store, pid, name) {
  const none = { has: false, adopt: null };
  const known = await store.get(COMEBACK_KEY, { type: 'json' }).catch(() => null);
  const names = (known && Array.isArray(known.names)) ? known.names : [];
  const ready = !!(known && known.owners && typeof known.owners === 'object');
  const owners = ready ? known.owners : {};
  const ownersOf = n => (hasOwn(owners, claimKey(n)) && Array.isArray(owners[claimKey(n)]))
    ? owners[claimKey(n)] : [];
  const oldPids = new Set();
  for (const l of Object.values(owners)) if (Array.isArray(l)) for (const p of l) oldPids.add(p);

  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(CLAIMS_KEY, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const doc = (res && res.data) || {};
    const byName = Object.assign({}, doc.byName || {});
    const byPid = Object.assign({}, doc.byPid || {});
    const old = Object.assign({}, doc.old || {});
    const mine = hasOwn(byPid, pid) ? byPid[pid] : null;
    if (mine && typeof mine === 'object') return { has: true, adopt: mine.adopt || null };
    if (!ready) return none;                         // old pids not filed yet

    let n, sole = null;
    if (typeof mine === 'string') n = mine;          // an older claim, settled now
    else if (oldPids.has(pid)) {
      // an old pid claims itself, never somebody else's callsign
      if (hasOwn(old, pid)) return none;
      const its = Object.keys(owners).map(k => k.slice(2)).filter(t => ownersOf(t).includes(pid));
      const asked = comebackName(name);
      n = its.includes(asked) ? asked : its[0];
      sole = pid;
    } else {
      const dev = devByCallsign(name);
      n = dev ? dev.n : comebackName(name);
      if (!n || n === 'anon' || !(dev || names.includes(n))) return none;
      if (hasOwn(byName, claimKey(n))) return none;  // taken, or under a taken old pid
      // a callsign found on the old boards after its old pid was claimed
      if (ownersOf(n).some(p => hasOwn(old, p))) return none;
      if (dev) {
        if (hasOwn(old, dev.pid)) return none;
        sole = dev.pid;                              // its own, whoever else posted the name
      }
    }

    if (!sole) {
      const ps = ownersOf(n);
      sole = ps.length === 1 && !hasOwn(old, ps[0]) ? ps[0] : null;
    }
    let adopt = null;
    // an old pid never becomes another one, and a hand-given pid is never handed out
    if (sole && !oldPids.has(pid) && !hasOwn(old, pid) && !(await handGiven(store, sole)))
      adopt = sole;

    // the callsign is taken, and with it every callsign its old pid ever used
    const taken = [n];
    if (sole) {
      old[sole] = pid;
      for (const [k, l] of Object.entries(owners))
        if (Array.isArray(l) && l.includes(sole)) taken.push(k.slice(2));
    }
    for (const t of taken) if (!hasOwn(byName, claimKey(t))) byName[claimKey(t)] = pid;
    const rec = { name: n, adopt };
    byPid[pid] = rec;
    if (adopt) byPid[adopt] = rec;       // the old pid, taken up, has claimed too

    const opts = res ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(CLAIMS_KEY, { byName, byPid, old }, opts)
      .catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return { has: true, adopt };
    await backoff(i);                    // somebody else claimed something; look again
  }
  return none;
}

const SKIN_GRANTS = {
  'ecd8c7a3671b4582f6b62ee1106510c8': ['draft'],   // MARIO — beta tester
  // EMBER: their own skin. Blank and held back (`wip` in index.html) until drawn.
  '06a21d4e756af978bb640b8dff30d92e': ['ember-gift'],
};

/* Perks handed to one profile by hand, the way SKIN_GRANTS hands skins, and
   taken back the same way. evo-<pilot> wakes that one pilot's evolution. */
const PERK_GRANTS = {
  '06a21d4e756af978bb640b8dff30d92e': ['evo-ember'],   // EMBER — the EMBER evolution
};

/* Every board leaves through here. A pid is how a podium and a dev grant
   are addressed, so publishing one next to a name hands anyone the ability
   to write it into their own save and collect that player's rewards — which
   is the whole reason podium places are addressed by pid and never shown.
   It is kept on the stored entry because closing a season needs it, and it
   must not leave this Worker. */
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
  /* Read through the account as well as off the row. The row is what the
     account held at the moment of login, so anything added to the account
     since — a new skin, a new perk — reaches every profile already signed in
     to it on its next sync, without a second login. An account deleted from
     DEV_ACCOUNTS stops adding anything; what its logins banked stays on their
     rows, exactly as before. */
  const acct = row && typeof row.user === 'string'
    && Object.prototype.hasOwnProperty.call(DEV_ACCOUNTS, row.user) ? DEV_ACCOUNTS[row.user] : null;
  if (row && Array.isArray(row.skins)) given.push(...row.skins);
  if (acct) given.push(...(acct.skins || ALL_SKINS));
  // and a dev account addressed by this profile rather than by a login
  const dp = Object.prototype.hasOwnProperty.call(DEV_PIDS, pid) ? DEV_PIDS[pid] : null;
  if (dp) given.push(...(dp.skins || ALL_SKINS));
  for (const id of [...new Set(given)]) out.push({ skin: id, via: 'GRANTED' });
  const perks = [...(hasOwn(PERK_GRANTS, pid) ? PERK_GRANTS[pid] : []),
                 ...(row && Array.isArray(row.perks) ? row.perks : []),
                 ...(acct ? (acct.perks || ALL_PERKS) : []),
                 ...(dp ? (dp.perks || ALL_PERKS) : [])];
  for (const id of [...new Set(perks)]) out.push({ perk: id, via: 'GRANTED' });
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
   is refused — the two things a fake store cannot prove. check.html reads
   the field names, so they must not change. */
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
    // someone else wrote first — wait a moment, re-read and merge again
    await backoff(attempt);
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

/* Every run filed here is also filed in boards.js, where every player's row
   is kept and not only the top 100. Never at the cost of the reply: the
   document above is what the game reads, and it has already landed. */
const fileRow = (env, req, board, entry) =>
  scorePut(env, req, board, entry).catch(e => console.error('scorePut', board, e && e.stack || e));

const placed = (top, entry, kept, extra) => {
  const rank = top.findIndex(e => e.name === entry.name);
  return json(Object.assign({ ok: true, rank: rank >= 0 ? rank + 1 : null,
                              best: kept.score,
                              top: publicBoard(top) }, extra));
};

export default async (req, env) => {
  const store = getStore(env, STORE);
  const today = utcDay();
  /* Before anything else reads or writes a board: if the 6th has passed since
     the last request, the old season is closed and filed here, and everything
     below is already talking about the new one. */
  const season = await ensureSeason(store);
  const meta = { day: today, season, seasonEnds: seasonEnd(season) };

  if (req.method === 'GET') {
    const q = new URL(req.url).searchParams;

    // ALL HALLOWS: the vigil's count, and this profile's share of it
    const vid = q.get('vigil');
    if (vid !== null) {
      const ev = Object.prototype.hasOwnProperty.call(VIGIL, vid) ? VIGIL[vid] : null;
      if (!ev) return json({ error: 'no such vigil' }, 404);
      const vp = q.get('pid');
      const doc = await store.get(vigilKey(vid), { type: 'json' }).catch(() => null);
      return json(Object.assign({ vigil: vid, open: vigilOpen(ev, today) },
                                vigilView(ev, doc, isPid(vp) ? vp : null), meta));
    }

    /* Which podiums a profile holds. Answered by pid and never by name, so
       the reply cannot be used to enumerate who won what. */
    const pid = q.get('awards');
    if (pid !== null) {
      if (!isPid(pid)) return json({ error: 'bad pid' }, 400);
      const awards = await awardsFor(store, pid);
      const back = await comebackClaim(store, pid, q.get('name'));
      if (back.has) awards.push({ perk: 'comeback', via: 'WELCOME BACK' });
      /* the old pid this profile is to become; only ever told to the
         profile that claimed it */
      const out = back.adopt && back.adopt !== pid ? { awards, adopt: back.adopt } : { awards };
      return json(Object.assign(out, meta));
    }

    // the finished seasons, for a hall of past winners
    if (q.get('archive') !== null) {
      const doc = await store.get(ARCHIVE, { type: 'json' }).catch(() => null);
      const list = (doc && doc.list) || {};
      const out = Object.keys(list).sort().reverse().map(id => ({
        season: id, closedAt: list[id].closedAt,
        // pids never leave the Worker attached to a name
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

  /* ALL HALLOWS: a quest reported. Which quest, never how much. */
  if (body && body.vigil !== undefined) {
    const vid = String(body.vigil), quest = String(body.quest || ''), pid = body.pid;
    const ev = Object.prototype.hasOwnProperty.call(VIGIL, vid) ? VIGIL[vid] : null;
    if (!ev) return json({ error: 'no such vigil' }, 404);
    if (!isPid(pid)) return json({ error: 'bad pid' }, 400);
    if (!Object.prototype.hasOwnProperty.call(ev.pay, quest)) return json({ error: 'bad quest' }, 400);
    if (!vigilOpen(ev, today)) return json({ error: 'the vigil is closed' }, 409);
    try {
      const r = await vigilTurnIn(store, vid, ev, quest, pid, clientIp(req), today);
      if (r.error) return json({ error: r.error }, r.error === 'busy' ? 503 : 429);
      return json(Object.assign({ vigil: vid, already: !!r.already }, r.view, meta));
    } catch (e) {
      return json({ error: 'write failed: ' + String((e && e.message) || e).slice(0, 120) }, 503);
    }
  }

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
      await fileRow(env, req, dayKey(day), entry);
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
    await fileRow(env, req, 'all', entry);
    if (!seasonToo)
      return placed(a.top, entry, a.kept, Object.assign(
        { allTimeOnly: true, degraded: a.degraded || undefined }, meta));
    const s = await commit(store, seasonKey(season), entry, mergeBoard);
    await fileRow(env, req, seasonKey(season), entry);
    return placed(s.top, entry, s.kept, Object.assign(
      { allTimeBest: a.kept.score, degraded: (s.degraded || a.degraded) || undefined }, meta));
  } catch (e) {
    return json({ error: 'write failed: ' + String((e && e.message) || e).slice(0, 120) }, 503);
  }
};
