/* ===========================================================================
   VOIDRUNNER — accounts
   GET  /api/account                 -> { account | null }
   POST /api/account  { op, ... }    -> sign up, sign in, sign out, and the rest
   GET  /api/account/save            -> { rev, save, unlocks }
   PUT  /api/account/save { rev, save, unlocks, pid }  -> { rev } | 409 { rev, save, unlocks }

   A name and a password, and nothing else: no email, no age, nothing a
   school Chromebook's sign-in rules or a child's privacy would object to.
   A forgotten password is answered by the recovery code shown once at sign-up;
   there is nobody to email.

   The save is the game's own profile, whole. The game merges it with the
   copy on the device (Save.merge, the rule its two local stores already
   use), so a write names the revision it was built on and is refused if
   another device has written since. The refusal carries the newer save, so
   the game can merge and try again without a second request.

   What a session is lives in auth.js, because PvP's Worker asks the same
   question of the same database.
   ========================================================================= */
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import { ensureAuth, sessionOf, sessionCookie, originOk, clientIp, sha256, newToken, newId,
         publicAccount, SESSION_MS, MAX_SESSIONS, SITES } from './auth.js';

const MIN_PASS = 8, MAX_PASS = 200;
const MAX_SAVE = 300 * 1024;             // characters of JSON; a save is tens of KB
const LOGIN_RE = /^[A-Za-z0-9_-]{3,16}$/;
const isPid = v => typeof v === 'string' && /^[0-9a-f]{16,64}$/.test(v);

/* Names nobody may take: the handful of words that would read as the game
   talking. */
const RESERVED = new Set(['admin', 'administrator', 'root', 'system', 'support',
  'staff', 'mod', 'moderator', 'official', 'voidrunner', 'anon', 'null', 'undefined']);

/* The passwords every list of leaked passwords starts with. Not a strength
   meter, only the ones that would fall to the first guess. */
const WEAK = new Set(['password', 'password1', 'password123', '12345678', '123456789',
  '1234567890', '87654321', '11111111', '00000000', 'qwertyui', 'qwerty123', 'qwertyuiop',
  'iloveyou', 'abcdefgh', 'abc12345', 'letmein1', 'welcome1', 'football', 'baseball',
  'minecraft', 'fortnite', 'roblox123', 'voidrunner']);

/* ------------------------------ passwords -------------------------------
   scrypt, the same cost as the dev login: about 45 ms of CPU. The cost is
   written into the stored hash, so it can be raised later and an old hash
   still checks (and could be rehashed at the next sign-in). */
const COST = { logN: 14, r: 8, p: 1 };
const KEYLEN = 32;

function hashPass(pass) {
  const salt = randomBytes(16);
  const h = scryptSync(pass, salt, KEYLEN, { N: 1 << COST.logN, r: COST.r, p: COST.p });
  return ['scrypt', COST.logN, COST.r, COST.p, salt.toString('hex'), h.toString('hex')].join('$');
}

/* A stand-in for a name with no account, so a wrong name and a wrong
   password cost the same and answer the same. Made on first use: a Worker
   may not generate random values in global scope. */
let DUMMY = null;
const dummy = () => DUMMY || (DUMMY = hashPass(randomBytes(12).toString('hex')));

function passOk(stored, pass) {
  const real = typeof stored === 'string' && stored.startsWith('scrypt$');
  const [, logN, r, p, salt, hash] = (real ? stored : dummy()).split('$');
  let got;
  try {
    got = scryptSync(String(pass || '').slice(0, MAX_PASS), Buffer.from(salt, 'hex'), KEYLEN,
                     { N: 1 << Number(logN), r: Number(r), p: Number(p) });
  } catch (e) { return false; }
  const want = Buffer.from(hash, 'hex');
  return want.length === got.length && timingSafeEqual(want, got) && real;
}

function passProblem(pass, name) {
  if (typeof pass !== 'string' || pass.length < MIN_PASS) return 'password: at least ' + MIN_PASS + ' characters';
  if (pass.length > MAX_PASS) return 'password: too long';
  const low = pass.toLowerCase();
  if (WEAK.has(low) || low === name || /^(.)\1+$/.test(pass)) return 'password: too easy to guess';
  return null;
}

/* --------------------------- recovery codes -----------------------------
   Sixteen characters from the co-op rooms' alphabet (nothing that reads as
   two things aloud), about 73 bits: far past guessing, so a plain SHA-256 is
   enough to keep it, and typing it with or without the dashes, in any case,
   is the same code. */
const CODE_ALPHA = '2346789CDEFGHJKMNPQRTUVWXYZ';
function newCode() {
  const b = randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += CODE_ALPHA[b[i] % CODE_ALPHA.length];
  return s.match(/.{4}/g).join('-');
}
const codeHash = v => sha256(String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
function codeOk(stored, typed) {
  const a = Buffer.from(String(stored || ''), 'hex'), b = Buffer.from(codeHash(typed), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------ rate limits ------------------------------
   One counter per key, each living in its own window. A failed sign-in counts
   against the address and the name together (8 in 15 minutes), so one
   player's typos never lock out a classroom sharing an address, and against
   the address alone (50), so the classroom cannot be used to try every name.
   New accounts count against the address by the hour. */
const WINDOW = 15 * 60 * 1000;
const LIMITS = { pair: 8, ip: 50, signup: 20 };

async function gateWait(db, keys) {
  const now = Date.now();
  let wait = 0;
  for (const [k, max] of keys) {
    const row = await db.prepare('SELECT n, until FROM auth_gate WHERE k = ?1').bind(k).first();
    if (row && row.until > now && row.n >= max) wait = Math.max(wait, Math.ceil((row.until - now) / 1000));
  }
  return wait;
}

async function gateBump(db, keys, windowMs = WINDOW) {
  const now = Date.now();
  await db.batch(keys.map(k => db.prepare(
    `INSERT INTO auth_gate (k, n, until) VALUES (?1, 1, ?2)
     ON CONFLICT (k) DO UPDATE SET
       n     = CASE WHEN auth_gate.until <= ?3 THEN 1  ELSE auth_gate.n + 1 END,
       until = CASE WHEN auth_gate.until <= ?3 THEN ?2 ELSE auth_gate.until END`)
    .bind(k, now + windowMs, now)));
}

const gateClear = (db, k) => db.prepare('DELETE FROM auth_gate WHERE k = ?1').bind(k).run();

/* ------------------------------- Turnstile -------------------------------
   Sign-up asks Cloudflare Turnstile whether a person is there, once the
   Worker has both halves of a widget's keys: TURNSTILE_SITE_KEY, which the
   page is handed (GET /api/account), and TURNSTILE_SECRET. Both are set as
   Worker secrets, since a deploy clears plain variables; the site key is
   public all the same. Until both are set sign-up works as it always has,
   the way TURN and the ads waited for theirs. Only sign-up: signing in is what a
   classroom does all day, and its failures are already counted.

   The widget is told its action is 'signup', and the answer must say so, so
   a token earned on some other page with the same keys cannot be spent here.
   Cloudflare's testing keys answer with no action at all (and say they are
   testing keys); they pass everybody anyway, so nothing is lost by letting
   them, and a local `wrangler dev` can use them. A check that cannot be made
   refuses: no account is better than a bot's. */
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
// the site key, once both halves are set; null means off
const turnstileKey = env => (env && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY) || null;

async function humanOk(env, token, ip) {
  if (!turnstileKey(env)) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const r = await fetch(SITEVERIFY, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip })
    });
    const d = await r.json();
    const testing = !!(d && d.metadata && d.metadata.result_with_testing_key === true);
    return !!(d && d.success === true && (d.action === 'signup' || testing));
  } catch (e) { return false; }
}

/* ------------------------------- hand-offs --------------------------------
   The game and PvP are two sites (PVP-PLAN.md): a workers.dev address is a
   different site to the browser, so a cookie set on one never reaches the
   other. A signed-in player crossing over asks for a hand-off code: random,
   single use, alive for a minute, kept only as its hash, and good only at
   the address it was asked for. The page carries it after the '#', which
   never reaches a server log, and the other site trades it for a session of
   its own ('handoff-take').

   Arriving signed in there as somebody else (two accounts on one browser),
   the code is left unspent and the answer names both, so the page asks the
   player which to be; `switch: true` while the code lives ends the session
   there and starts the code's. Nothing changes without that choice.

   Where a code may go: one of SITES (auth.js), never the address asking. A
   local `wrangler dev` may hand off between its own localhost addresses, and
   only from one of them. */
const HANDOFF_MS = 60 * 1000;
const localHost = h => h === 'localhost' || h === '127.0.0.1';
function handoffTarget(req, to) {
  let u;
  try { u = new URL(String(to || '')); } catch (e) { return null; }
  if (u.origin !== String(to)) return null;          // an origin, and nothing after it
  const here = new URL(req.url);
  if (u.origin === here.origin) return null;
  if (SITES.includes(u.origin)) return u.origin;
  return localHost(here.hostname) && localHost(u.hostname) ? u.origin : null;
}

/* -------------------------------- replies -------------------------------- */
function reply(body, status = 200, cookie) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (cookie) headers['set-cookie'] = cookie;
  return new Response(JSON.stringify(body), { status, headers });
}
const no = (error, status, extra) => reply(Object.assign({ error }, extra), status);
const locked = wait => no('too many attempts', 429, { retryIn: wait });

/* Reads a JSON body no larger than `max`. Refuses anything that is not
   declared as JSON: a cross-site form cannot declare it. */
async function bodyOf(req, max) {
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return { err: 415 };
  const text = await req.text();
  if (text.length > max) return { err: 413 };
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? { v } : { err: 400 };
  } catch (e) { return { err: 400 }; }
}

/* ------------------------------- sessions -------------------------------- */
/* What the device list calls a session: the browser and the system, read off
   the User-Agent once at sign-in. Only the two words are kept, never the
   header itself. Order matters: Edge and Opera say Chrome too, Chrome says
   Safari, and an iPad asking for the desktop site says Macintosh. */
const BROWSERS = [[/Edg\//, 'Edge'], [/OPR\/|Opera/, 'Opera'], [/SamsungBrowser/, 'Samsung Internet'],
                  [/Firefox\/|FxiOS/, 'Firefox'], [/Chrome\/|CriOS/, 'Chrome'], [/Safari\//, 'Safari']];
const SYSTEMS = [[/CrOS/, 'ChromeOS'], [/Android/, 'Android'], [/iPhone/, 'iPhone'], [/iPad/, 'iPad'],
                 [/Windows/, 'Windows'], [/Macintosh|Mac OS X/, 'Mac'], [/Linux/, 'Linux']];
export function deviceOf(req) {
  const ua = String(req.headers.get('user-agent') || '');
  const pick = (list, none) => (list.find(([re]) => re.test(ua)) || [null, none])[1];
  return pick(BROWSERS, 'A browser') + ' on ' + pick(SYSTEMS, 'some device');
}

async function startSession(db, accountId, req) {
  const token = newToken(), now = Date.now();
  await db.batch([
    db.prepare('INSERT INTO sessions (id, account, created, seen, expires, device) VALUES (?1, ?2, ?3, ?3, ?4, ?5)')
      .bind(sha256(token), accountId, now, now + SESSION_MS, deviceOf(req)),
    // the oldest go once an account is on too many devices, and the expired always
    db.prepare(`DELETE FROM sessions WHERE account = ?1 AND (expires <= ?2 OR id NOT IN
                  (SELECT id FROM sessions WHERE account = ?1 ORDER BY seen DESC LIMIT ?3))`)
      .bind(accountId, now, MAX_SESSIONS)
  ]);
  return token;
}

/* A profile id this account has played on. First come keeps it: a pid
   already linked to another account stays with that account. */
const linkPid = (db, accountId, pid) => !isPid(pid) ? null
  : db.prepare('INSERT INTO account_pids (pid, account, linked) VALUES (?1, ?2, ?3) ON CONFLICT (pid) DO NOTHING')
      .bind(pid, accountId, Date.now()).run();

const accountByName = (db, name) =>
  db.prepare('SELECT id, name, display, created, pass, recovery FROM accounts WHERE name = ?1')
    .bind(name).first();

/* -------------------------------- the ops -------------------------------- */
const OPS = {
  async register(req, env, b) {
    // PvP's Worker shares this file but makes no accounts: they are made in the game
    if (env.SIGNUP === 'off') return no('make your account in VOIDRUNNER', 403);
    const db = env.DB, ip = clientIp(req);
    const display = String(b.name || '').trim();
    if (!LOGIN_RE.test(display)) return no('name: 3 to 16 letters, digits, _ or -', 400);
    const name = display.toLowerCase();
    if (RESERVED.has(name)) return no('name taken', 409);
    const wait = await gateWait(db, [['new:' + ip, LIMITS.signup]]);
    if (wait) return locked(wait);
    const bad = passProblem(b.pass, name);
    if (bad) return no(bad, 400);
    // asked first so a taken name costs no password hash, nor a Turnstile token
    if (await accountByName(db, name)) return no('name taken', 409);
    if (!(await humanOk(env, b.turnstile, ip)))
      return no("couldn't check you're a person: try again", 400, { turnstile: true });

    const id = newId(), code = newCode(), now = Date.now();
    const res = await db.prepare(
      `INSERT INTO accounts (id, name, display, pass, recovery, pid, created, updated)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7) ON CONFLICT (name) DO NOTHING`)
      .bind(id, name, display, hashPass(b.pass), codeHash(code), isPid(b.pid) ? b.pid : null, now).run();
    if (!(res && res.meta && res.meta.changes > 0)) return no('name taken', 409);
    await gateBump(db, ['new:' + ip], 60 * 60 * 1000);
    await linkPid(db, id, b.pid);
    const token = await startSession(db, id, req);
    return reply({ account: publicAccount({ name, display, created: now }), recovery: code },
                 201, sessionCookie(req, token));
  },

  /* Every kind of wrong answers 'no', in the same time: the reply never says
     whether it was the name or the password. */
  async login(req, env, b) {
    const db = env.DB, ip = clientIp(req);
    const name = String(b.name || '').trim().toLowerCase().slice(0, 32);
    const pair = 'f:' + ip + ':' + name, all = 'f:' + ip;
    const wait = await gateWait(db, [[pair, LIMITS.pair], [all, LIMITS.ip]]);
    if (wait) return locked(wait);
    const row = LOGIN_RE.test(name) ? await accountByName(db, name) : null;
    if (!passOk(row && row.pass, b.pass)) {
      await gateBump(db, [pair, all]);
      return no('no', 401);
    }
    await gateClear(db, pair);
    await linkPid(db, row.id, b.pid);
    const token = await startSession(db, row.id, req);
    return reply({ account: publicAccount(row) }, 200, sessionCookie(req, token));
  },

  async recover(req, env, b) {
    const db = env.DB, ip = clientIp(req);
    const name = String(b.name || '').trim().toLowerCase().slice(0, 32);
    const pair = 'f:' + ip + ':' + name, all = 'f:' + ip;
    const wait = await gateWait(db, [[pair, LIMITS.pair], [all, LIMITS.ip]]);
    if (wait) return locked(wait);
    const bad = passProblem(b.next, name);
    if (bad) return no(bad, 400);
    const row = LOGIN_RE.test(name) ? await accountByName(db, name) : null;
    if (!row || !codeOk(row.recovery, b.code)) {
      await gateBump(db, [pair, all]);
      return no('no', 401);
    }
    await gateClear(db, pair);
    // a used code is spent: the reply carries the next one, and every device is signed out
    const code = newCode();
    await db.batch([
      db.prepare('UPDATE accounts SET pass = ?1, recovery = ?2, updated = ?3 WHERE id = ?4')
        .bind(hashPass(b.next), codeHash(code), Date.now(), row.id),
      db.prepare('DELETE FROM sessions WHERE account = ?1').bind(row.id)
    ]);
    await linkPid(db, row.id, b.pid);
    const token = await startSession(db, row.id, req);
    return reply({ account: publicAccount(row), recovery: code }, 200, sessionCookie(req, token));
  },

  async logout(req, env, b, s) {
    if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.sid).run();
    return reply({ ok: true }, 200, sessionCookie(req, '', 0));
  },

  // a code for crossing to another of our sites, signed in (see hand-offs)
  async handoff(req, env, b, s) {
    if (!s) return no('signed out', 401);
    const to = handoffTarget(req, b.to);
    if (!to) return no('bad destination', 400);
    const code = newToken(), now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM handoffs WHERE expires <= ?1').bind(now),
      env.DB.prepare('INSERT INTO handoffs (id, account, target, expires) VALUES (?1, ?2, ?3, ?4)')
        .bind(sha256(code), s.account.id, to, now + HANDOFF_MS)
    ]);
    return reply({ code, to, expires: now + HANDOFF_MS });
  },

  /* A code traded for a session here. Spent whatever the answer, by the one
     statement that reads it. Already signed in here as the same account,
     nothing changes; as somebody else, this site is left as it is: swapping
     accounts under a save is the game's to do, by signing out first. */
  async 'handoff-take'(req, env, b, s) {
    const code = String(b.code || '');
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(code)) return no('no', 401);
    const id = sha256(code), here = new URL(req.url).origin;
    const live = r => r && r.expires > Date.now() && r.target === here;
    if (s) {
      // signed in here already: as them, the code is simply spent; as somebody else, ask first (above)
      const held = await env.DB.prepare('SELECT account, target, expires FROM handoffs WHERE id = ?1').bind(id).first();
      if (!live(held)) return no('no', 401);
      if (held.account === s.account.id) {
        await env.DB.prepare('DELETE FROM handoffs WHERE id = ?1').bind(id).run();
        return reply({ account: publicAccount(s.account), already: true });
      }
      if (b.switch !== true) {
        const them = await env.DB.prepare('SELECT display FROM accounts WHERE id = ?1').bind(held.account).first();
        return no('signed in as somebody else', 409, { here: s.account.display, as: them ? them.display : null });
      }
    }
    const row = await env.DB.prepare('DELETE FROM handoffs WHERE id = ?1 RETURNING account, target, expires').bind(id).first();
    if (!live(row)) return no('no', 401);
    const a = await env.DB.prepare('SELECT id, name, display, created FROM accounts WHERE id = ?1')
      .bind(row.account).first();
    if (!a) return no('no', 401);
    if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?1').bind(s.sid).run();   // the switch: who was here signs out
    const token = await startSession(env.DB, a.id, req);
    return reply({ account: publicAccount(a), switched: !!s }, 200, sessionCookie(req, token));
  },

  /* Every device signed in to the account, most recently seen first. A
     session is named by the start of its id: enough to sign it out with,
     and nothing that signs anybody in (the id is the token's hash). `seen`
     moves at most once a day (auth.js), so it says which day, no closer. */
  async devices(req, env, b, s) {
    if (!s) return no('signed out', 401);
    const res = await env.DB.prepare(
      'SELECT id, device, created, seen FROM sessions WHERE account = ?1 AND expires > ?2 ORDER BY seen DESC')
      .bind(s.account.id, Date.now()).all();
    return reply({ devices: ((res && res.results) || []).map(r => ({
      id: r.id.slice(0, 16), device: r.device || 'A device signed in before this list',
      created: r.created, seen: r.seen, current: r.id === s.sid })) });
  },

  /* One other device, signed out. Not this one: signing out here pushes the
     save first, and only the game can do that (Account.signOut). */
  async 'logout-device'(req, env, b, s) {
    if (!s) return no('signed out', 401);
    const id = String(b.id || '');
    if (!/^[0-9a-f]{16}$/.test(id)) return no('bad device', 400);
    if (s.sid.startsWith(id)) return no('that is this device', 400);
    const res = await env.DB.prepare('DELETE FROM sessions WHERE account = ?1 AND substr(id, 1, 16) = ?2 AND id != ?3')
      .bind(s.account.id, id, s.sid).run();
    if (!(res && res.meta && res.meta.changes > 0)) return no('no such device', 404);
    return reply({ ok: true });
  },

  async 'logout-others'(req, env, b, s) {
    if (!s) return no('signed out', 401);
    await env.DB.prepare('DELETE FROM sessions WHERE account = ?1 AND id != ?2')
      .bind(s.account.id, s.sid).run();
    return reply({ ok: true });
  },

  /* The current password is asked for again, and counts as a sign-in attempt:
     a session left open on a shared machine must not be enough to take the
     account. Every other device is signed out. */
  async password(req, env, b, s) {
    if (!s) return no('signed out', 401);
    const db = env.DB, ip = clientIp(req), pair = 'f:' + ip + ':' + s.account.name;
    const wait = await gateWait(db, [[pair, LIMITS.pair]]);
    if (wait) return locked(wait);
    const bad = passProblem(b.next, s.account.name);
    if (bad) return no(bad, 400);
    const row = await accountByName(db, s.account.name);
    if (!row || !passOk(row.pass, b.pass)) { await gateBump(db, [pair]); return no('no', 401); }
    await db.batch([
      db.prepare('UPDATE accounts SET pass = ?1, updated = ?2 WHERE id = ?3')
        .bind(hashPass(b.next), Date.now(), row.id),
      db.prepare('DELETE FROM sessions WHERE account = ?1 AND id != ?2').bind(row.id, s.sid)
    ]);
    return reply({ ok: true });
  },

  /* Everything the server holds for the account goes. Leaderboard rows are
     a callsign and a profile id, never the account, so they stay as they are. */
  async delete(req, env, b, s) {
    if (!s) return no('signed out', 401);
    const db = env.DB, ip = clientIp(req), pair = 'f:' + ip + ':' + s.account.name;
    const wait = await gateWait(db, [[pair, LIMITS.pair]]);
    if (wait) return locked(wait);
    const row = await accountByName(db, s.account.name);
    if (!row || !passOk(row.pass, b.pass)) { await gateBump(db, [pair]); return no('no', 401); }
    const id = row.id;
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE account = ?1').bind(id),
      db.prepare('DELETE FROM account_pids WHERE account = ?1').bind(id),
      db.prepare('DELETE FROM saves WHERE account = ?1').bind(id),
      db.prepare('DELETE FROM looks WHERE account = ?1').bind(id),
      db.prepare('DELETE FROM look_grants WHERE account = ?1').bind(id),
      db.prepare('DELETE FROM accounts WHERE id = ?1').bind(id)
    ]);
    return reply({ ok: true }, 200, sessionCookie(req, '', 0));
  }
};

/* ------------------------------- the save -------------------------------- */
/* The facts PvP reads. Ids only, each list capped; anything else is dropped. */
const UNLOCK_LISTS = { chars: 32, awake: 32, chal: 256, ups: 512 };
function cleanUnlocks(u) {
  const out = { v: 1 };
  for (const [k, max] of Object.entries(UNLOCK_LISTS)) {
    const src = u && Array.isArray(u[k]) ? u[k] : [];
    out[k] = [...new Set(src.filter(s => typeof s === 'string' && /^[\w-]{1,40}$/.test(s)))].slice(0, max);
  }
  return out;
}

const parse = (t, d) => { try { return JSON.parse(t); } catch (e) { return d; } };

async function saveRoute(req, env, s) {
  const db = env.DB;
  if (!s) return no('signed out', 401);
  const id = s.account.id;
  const current = () => db.prepare('SELECT rev, data, unlocks, updated FROM saves WHERE account = ?1')
    .bind(id).first();

  if (req.method === 'GET') {
    const row = await current();
    return reply(row ? { rev: row.rev, save: parse(row.data, null), unlocks: parse(row.unlocks, null),
                         updated: row.updated }
                     : { rev: 0, save: null, unlocks: null });
  }
  if (req.method !== 'PUT') return no('method not allowed', 405);

  const { v: b, err } = await bodyOf(req, MAX_SAVE + 8192);
  if (err) return no('bad request', err);
  const rev = Number(b.rev);
  if (!Number.isInteger(rev) || rev < 0) return no('bad rev', 400);
  if (!b.save || typeof b.save !== 'object' || Array.isArray(b.save)) return no('bad save', 400);
  const data = JSON.stringify(b.save);
  if (data.length > MAX_SAVE) return no('save too large', 413);
  const unlocks = JSON.stringify(cleanUnlocks(b.unlocks));
  const now = Date.now();

  // compare-and-swap on the revision: 0 means "there was no save yet"
  const res = rev === 0
    ? await db.prepare(`INSERT INTO saves (account, rev, data, unlocks, updated) VALUES (?1, 1, ?2, ?3, ?4)
                        ON CONFLICT (account) DO NOTHING`).bind(id, data, unlocks, now).run()
    : await db.prepare(`UPDATE saves SET rev = rev + 1, data = ?1, unlocks = ?2, updated = ?3
                        WHERE account = ?4 AND rev = ?5`).bind(data, unlocks, now, id, rev).run();
  if (!(res && res.meta && res.meta.changes > 0)) {
    const row = await current();
    return reply({ error: 'stale', rev: row ? row.rev : 0, save: row ? parse(row.data, null) : null,
                   unlocks: row ? parse(row.unlocks, null) : null }, 409);
  }
  await linkPid(db, id, b.pid);
  return reply({ rev: rev + 1, updated: now });
}

/* -------------------------------- routing -------------------------------- */
export default async (req, env) => {
  await ensureAuth(env.DB);
  const write = req.method !== 'GET' && req.method !== 'HEAD';
  if (write && !originOk(req)) return no('bad origin', 403);
  const s = await sessionOf(req, env);
  // a session that was just extended takes its cookie again, with the new lifetime
  const renew = res => {
    if (s && s.renew && !res.headers.has('set-cookie'))
      res.headers.set('set-cookie', sessionCookie(req, s.token));
    return res;
  };

  if (new URL(req.url).pathname === '/api/account/save') return renew(await saveRoute(req, env, s));

  // the Turnstile widget's public key goes with it, for the sign-up form
  if (req.method === 'GET')
    return renew(reply({ account: s ? publicAccount(s.account) : null, turnstile: turnstileKey(env) }));
  if (req.method !== 'POST') return no('method not allowed', 405);
  const { v: b, err } = await bodyOf(req, 4096);
  if (err) return no('bad request', err);
  const op = typeof b.op === 'string' && Object.prototype.hasOwnProperty.call(OPS, b.op) ? OPS[b.op] : null;
  if (!op) return no('no such op', 400);
  return renew(await op(req, env, b, s));
};
