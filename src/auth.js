/* ===========================================================================
   ACCOUNTS — what an account and a session are.

   Shared by both Workers: the game's (src/account.js signs people in and
   keeps their save) and PvP's, which only ever asks "who is this?" and reads
   what they have unlocked. Both are bound to the same D1 database, so a
   session started on voidrunner.online is the same row PvP checks.

   A session is a random token in a cookie. Only its SHA-256 is stored, so
   somebody reading the database still cannot sign in as anyone. The cookie
   is HttpOnly, so the game's own script never sees it either. On
   voidrunner.online it is set for the whole domain (www included); anywhere
   else (workers.dev, localhost) it stays on the address that set it. PvP
   lives on its own workers.dev address, which no cookie from here can
   reach, so it keeps sessions of its own in the same table.

   Tables are made on first use, the way store.js makes its own: a fresh
   database, or a local one under `wrangler dev`, just works.
   ========================================================================= */
import { createHash, randomBytes } from 'node:crypto';

export const SITE = 'voidrunner.online';
export const COOKIE = 'vr_s';
const DAY = 24 * 60 * 60 * 1000;
export const SESSION_MS = 90 * DAY;      // since last seen; renewed at most once a day
export const MAX_SESSIONS = 20;          // devices one account may be signed in on

/* Where a write may come from: the game and the www address it forwards
   from. The page's own origin is always allowed as well, which covers PvP's
   Worker (it talks only to itself), workers.dev and a local `wrangler dev`. */
const ORIGINS = ['https://voidrunner.online', 'https://www.voidrunner.online'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS accounts (
     id       TEXT    PRIMARY KEY,
     name     TEXT    NOT NULL UNIQUE,     -- the login, lower case
     display  TEXT    NOT NULL,            -- the same name as it was typed
     pass     TEXT    NOT NULL,            -- scrypt$<logN>$<r>$<p>$<salt>$<hash>
     recovery TEXT    NOT NULL,            -- sha-256 of the recovery code
     pid      TEXT,                        -- the profile it was made on
     perks    TEXT    NOT NULL DEFAULT '[]',
     created  INTEGER NOT NULL,
     updated  INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id       TEXT    PRIMARY KEY,         -- sha-256 of the token
     account  TEXT    NOT NULL,
     created  INTEGER NOT NULL,
     seen     INTEGER NOT NULL,
     expires  INTEGER NOT NULL,
     device   TEXT)                        -- "Chrome on ChromeOS", for the device list`,
  `CREATE INDEX IF NOT EXISTS sessions_account ON sessions (account)`,
  /* Every profile id an account has been signed in from. A pid is what the
     boards, podiums and grants are addressed to, so this is how they find
     their way to an account. */
  `CREATE TABLE IF NOT EXISTS account_pids (
     pid      TEXT    PRIMARY KEY,
     account  TEXT    NOT NULL,
     linked   INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS account_pids_account ON account_pids (account)`,
  /* The save, whole, and beside it the few facts PvP reads: which pilots are
     open, which are awake, which challenges are cleared and which reward
     upgrades that leaves. */
  `CREATE TABLE IF NOT EXISTS saves (
     account  TEXT    PRIMARY KEY,
     rev      INTEGER NOT NULL,
     data     TEXT    NOT NULL,
     unlocks  TEXT    NOT NULL,
     updated  INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS auth_gate (
     k        TEXT    PRIMARY KEY,
     n        INTEGER NOT NULL,
     until    INTEGER NOT NULL)`
];

/* Columns added after their table first shipped. CREATE TABLE IF NOT EXISTS
   leaves a table that is already there as it was, so each is added here if
   it is missing. Two isolates may race to add one; the loser's "duplicate
   column" is the answer it wanted. */
const ADDED = [['sessions', 'device', 'TEXT']];

/* Once per isolate: after the first success every later call is a resolved
   promise. */
let ready = null;
export function ensureAuth(db) {
  if (!ready) ready = (async () => {
    await db.batch(SCHEMA.map(s => db.prepare(s)));
    for (const [table, col, type] of ADDED) {
      const cols = ((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map(r => r.name);
      if (!cols.includes(col))
        await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).run()
          .catch(e => { if (!/duplicate column/i.test(String(e && e.message))) throw e; });
    }
  })().catch(e => { ready = null; throw e; });
  return ready;
}

export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');
export const newId = () => randomBytes(16).toString('hex');

/* Rate limits are keyed on this and nothing else decides who anybody is by
   it. Cloudflare sets the first header and a client cannot forge it. */
export const clientIp = req =>
  ((req.headers.get('cf-connecting-ip') || '') ||
   (req.headers.get('x-forwarded-for') || '').split(',')[0] || '').trim().slice(0, 45)
  || 'unknown';

export function cookieOf(req, name = COOKIE) {
  const raw = req.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

/* The cookie that carries a session, or (maxAge 0) the one that ends it. */
export function sessionCookie(req, token, maxAgeMs = SESSION_MS) {
  const u = new URL(req.url);
  const parts = [COOKIE + '=' + (token || ''), 'Path=/api', 'HttpOnly', 'SameSite=Lax',
                 'Max-Age=' + Math.max(0, Math.floor(maxAgeMs / 1000))];
  if (u.protocol === 'https:') parts.push('Secure');
  if (u.hostname === SITE || u.hostname.endsWith('.' + SITE)) parts.push('Domain=' + SITE);
  return parts.join('; ');
}

/* A write must come from one of our pages. A request with no Origin at all
   is not a browser page, and has no cookie it did not put there itself. The
   SameSite cookie is the second wall; requiring JSON (account.js) the third,
   since a plain HTML form cannot send it. */
export function originOk(req) {
  const o = req.headers.get('origin');
  if (!o) return true;
  return o === new URL(req.url).origin || ORIGINS.includes(o);
}

const parseList = t => { try { const v = JSON.parse(t); return Array.isArray(v) ? v : []; } catch (e) { return []; } };

/* Who this request is, or null. `renew` says the session was just extended,
   so the caller should send the cookie again with a fresh lifetime.

   `peek` asks without extending. Only /api/account sends the cookie again,
   so any other route that extended the row would leave the browser's cookie
   to run out on its old lifetime while the database thought it fresh. */
export async function sessionOf(req, env, { peek = false } = {}) {
  const token = cookieOf(req);
  if (!token || token.length > 100) return null;
  await ensureAuth(env.DB);
  const sid = sha256(token);
  const row = await env.DB.prepare(
    `SELECT s.seen, s.expires, a.id, a.name, a.display, a.created, a.pid, a.perks
       FROM sessions s JOIN accounts a ON a.id = s.account WHERE s.id = ?1`).bind(sid).first();
  if (!row) return null;
  const now = Date.now();
  if (row.expires <= now) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(sid).run();
    return null;
  }
  let renew = false;
  if (!peek && now - row.seen > DAY) {
    await env.DB.prepare('UPDATE sessions SET seen = ?1, expires = ?2 WHERE id = ?3')
      .bind(now, now + SESSION_MS, sid).run();
    renew = true;
  }
  return { sid, token, renew,
           account: { id: row.id, name: row.name, display: row.display, created: row.created,
                      pid: row.pid || null, perks: parseList(row.perks) } };
}

/* Every profile id the account has played on, oldest first. Podiums, grants
   and the vigil are addressed to pids, so this is how they reach the account. */
export async function accountPids(db, accountId) {
  const res = await db.prepare('SELECT pid FROM account_pids WHERE account = ?1 ORDER BY linked LIMIT 200')
    .bind(accountId).all();
  return ((res && res.results) || []).map(r => r.pid);
}

/* What an account looks like to the account's own player. The id never
   leaves the Worker. */
export const publicAccount = a => a && { name: a.name, display: a.display, created: a.created };

/* The daily sweep (index.js, on the season-close cron): expired sessions and
   spent rate-limit counters are nobody's business. */
export async function pruneAuth(env) {
  if (!env || !env.DB) return;
  await ensureAuth(env.DB);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires <= ?1').bind(now),
    env.DB.prepare('DELETE FROM auth_gate WHERE until <= ?1').bind(now)
  ]);
}
