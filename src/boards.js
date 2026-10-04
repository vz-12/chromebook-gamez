/* ===========================================================================
   VOIDRUNNER — every score, ranked and searchable
   GET  /api/boards?board=all | season[&id=2026-10] | day[&id=2026-10-03][&from=0&n=50]
                                       -> a page of a board, with ranks
   GET  /api/boards?q=<name>[&boards=k1,k2,..]
                                       -> players whose callsign or account name starts
                                          with it, and where they stand on each board
   POST /api/boards { op: 'me', pid, boards }
                                       -> the same, for this player (signed in, or this device)
   GET  /api/boards?list=1             -> the seasons there are
   GET  /api/boards?board=pvp[&id=2026-10][&from=0&n=50]
                                       -> the ranked PvP ladder (profiles.js)
   GET  /api/boards?user=<account name> -> a player's profile (profiles.js)

   The boards in leaderboard.js are one document each, holding the top 100,
   which is all a board in the game ever shows. That is why a run outside the
   top 100 was never kept anywhere, and why nobody could look up where they
   stood. This keeps one row per player per board, for everyone: every
   submission writes its row here as well (scorePut), and every 15 minutes
   the documents themselves are folded in (foldBoards), which carries over
   everything filed before this existed and whatever the Netlify sync merges.

   WHO A ROW BELONGS TO. A signed-in player, or a profile linked to an
   account, has one row per board under the account, whatever callsign it
   flew under. Anybody else has one per callsign, the way the boards have
   always worked. A guest who later signs in has their guest rows folded into
   the account's (absorb).

   The rules are the boards' own: season and all-time keep the better run, a
   day keeps the first one flown. Ranks are competition ranks (1, 2, 2, 4).
   Profile ids never leave the Worker, and neither do account ids: a row or
   a player that is an account's carries its account name (`user`), which is
   what its profile is found by.
   ========================================================================= */
import { ensureAuth, sessionOf, originOk } from './auth.js';
import { ladder, ladderStandings, profile, isUser } from './profiles.js';
import { STORE, ARCHIVE, seasonOf, isSeason } from './season.js';
import { getStore } from './store.js';

const PAGE = 50, PAGE_MAX = 100;
const FOLD_EVERY = 15 * 60 * 1000;
const isPid = v => typeof v === 'string' && /^[0-9a-f]{16,64}$/.test(v);
const isDay = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
const isBoard = k => k === 'all' || /^season:\d{4}-\d{2}$/.test(k) || /^day:\d{4}-\d{2}-\d{2}$/.test(k);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS scores (
     board   TEXT    NOT NULL,      -- 'all' | 'season:2026-10' | 'day:2026-10-03'
     who     TEXT    NOT NULL,      -- 'a:<account id>' | 'n:<callsign>'
     account TEXT,
     pid     TEXT,
     name    TEXT    NOT NULL,      -- the callsign the run was flown under
     name_l  TEXT    NOT NULL,      -- the same, lower case, for search
     score   INTEGER NOT NULL,
     wave    INTEGER, sector TEXT, loop INTEGER, level INTEGER, kills INTEGER, time INTEGER,
     at      INTEGER NOT NULL,
     PRIMARY KEY (board, who))`,
  `CREATE INDEX IF NOT EXISTS scores_rank ON scores (board, score DESC)`,
  `CREATE INDEX IF NOT EXISTS scores_name ON scores (name_l)`,
  `CREATE INDEX IF NOT EXISTS scores_pid ON scores (pid)`,
  `CREATE INDEX IF NOT EXISTS scores_account ON scores (account)`,
  `CREATE TABLE IF NOT EXISTS scores_meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)`
];
let ready = null;
async function ensureScores(db) {
  await ensureAuth(db);              // the rows join accounts and account_pids
  if (!ready) ready = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { ready = null; throw e; });
  return ready;
}

/* The one rule for a row meeting a newer run for the same board and player:
   a day keeps the earliest, everything else the higher score. */
const COLS = 'board, who, account, pid, name, name_l, score, wave, sector, loop, level, kills, time, at';
const KEEP = `ON CONFLICT (board, who) DO UPDATE SET
     account = excluded.account, pid = excluded.pid, name = excluded.name, name_l = excluded.name_l,
     score = excluded.score, wave = excluded.wave, sector = excluded.sector, loop = excluded.loop,
     level = excluded.level, kills = excluded.kills, time = excluded.time, at = excluded.at
   WHERE CASE WHEN scores.board LIKE 'day:%' THEN excluded.at < scores.at
              ELSE excluded.score > scores.score END`;

function upsert(db, board, who, account, e) {
  const name = String(e.name || 'ANON');
  return db.prepare(`INSERT INTO scores (${COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14) ${KEEP}`)
    .bind(board, who, account || null, isPid(e.pid) ? e.pid : null, name, name.toLowerCase(),
          Math.floor(Number(e.score) || 0), e.wave ?? null, e.sector ?? null, e.loop ?? null,
          e.level ?? null, e.kills ?? null, e.time ?? null, Number(e.at) || Date.now());
}

/* Guest rows from profiles linked to an account become the account's: the
   better (or, for a day, the earlier) run stands, and the guest row goes.
   One account's, or every account's when folding. */
function absorbStmts(db, account) {
  const only = account ? ' AND ap.account = ?1' : '';
  const sub = account ? ' WHERE account = ?1' : '';
  const ins = db.prepare(
    `INSERT INTO scores (${COLS})
       SELECT s.board, 'a:' || ap.account, ap.account, s.pid, s.name, s.name_l, s.score, s.wave,
              s.sector, s.loop, s.level, s.kills, s.time, s.at
         FROM scores s JOIN account_pids ap ON ap.pid = s.pid
        WHERE s.who LIKE 'n:%'${only}
        ORDER BY s.at
     ${KEEP}`);
  const del = db.prepare(`DELETE FROM scores WHERE who LIKE 'n:%' AND pid IN (SELECT pid FROM account_pids${sub})`);
  return account ? [ins.bind(account), del.bind(account)] : [ins, del];
}

/* Who a submission belongs to: the session's account, else the account this
   profile is linked to, else the callsign. */
async function whoFor(db, req, env, e) {
  const s = await sessionOf(req, env, { peek: true }).catch(() => null);
  if (s) return { who: 'a:' + s.account.id, account: s.account.id };
  if (isPid(e.pid)) {
    const row = await db.prepare('SELECT account FROM account_pids WHERE pid = ?1').bind(e.pid).first();
    if (row) return { who: 'a:' + row.account, account: row.account };
  }
  return { who: 'n:' + String(e.name || 'ANON'), account: null };
}

/* Called by leaderboard.js for every run it files, beside its own document. */
export async function scorePut(env, req, board, entry) {
  if (!isBoard(board)) return;
  const db = env.DB;
  await ensureScores(db);
  const { who, account } = await whoFor(db, req, env, entry);
  const list = [upsert(db, board, who, account, entry)];
  if (account) list.push(...absorbStmts(db, account));
  await db.batch(list);
}

/* The documents, folded in: only those written since the last fold. A pid
   linked to an account is filed under the account directly, so an account
   holder's guest row is never made only to be absorbed. */
export async function foldBoards(env) {
  const db = env && env.DB;
  if (!db) return;
  await ensureScores(db);
  const now = Date.now();
  const last = await db.prepare("SELECT v FROM scores_meta WHERE k = 'folded'").first();
  let docs;
  try {
    docs = (await db.prepare(
      `SELECT key, value FROM blobs WHERE store = ?1 AND updated > ?2
          AND (key = 'top' OR key LIKE 'season:%' OR key LIKE 'day:%')`)
      .bind(STORE, last ? last.v : 0).all()).results || [];
  } catch (e) { docs = []; }      // no boards yet: nothing to fold

  const rows = [];
  for (const d of docs) {
    const board = d.key === 'top' ? 'all' : d.key;
    if (!isBoard(board)) continue;
    let entries = [];
    try { entries = (JSON.parse(d.value) || {}).entries || []; } catch (e) {}
    for (const e of entries) if (e && e.name && Number(e.score) > 0) rows.push({ board, e });
  }
  // which of these profiles are linked to an account, a hundred at a time
  const linked = new Map();
  const pids = [...new Set(rows.map(r => r.e.pid).filter(isPid))];
  for (let i = 0; i < pids.length; i += 90) {
    const part = pids.slice(i, i + 90);
    const res = await db.prepare(`SELECT pid, account FROM account_pids WHERE pid IN (${part.map((_, j) => '?' + (j + 1)).join(',')})`)
      .bind(...part).all();
    for (const r of res.results || []) linked.set(r.pid, r.account);
  }
  const stmts = rows.map(({ board, e }) => {
    const acct = isPid(e.pid) ? linked.get(e.pid) : null;
    return acct ? upsert(db, board, 'a:' + acct, acct, e) : upsert(db, board, 'n:' + e.name, null, e);
  });
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  await db.batch([...absorbStmts(db, null),
    db.prepare("INSERT INTO scores_meta (k, v) VALUES ('folded', ?1) ON CONFLICT (k) DO UPDATE SET v = excluded.v").bind(now)]);
  return { docs: docs.length, rows: rows.length };
}

async function foldIfDue(env) {
  const last = await env.DB.prepare("SELECT v FROM scores_meta WHERE k = 'folded'").first();
  if (!last || Date.now() - last.v > FOLD_EVERY) await foldBoards(env);
}

/* ------------------------------- reading -------------------------------- */
const pub = r => ({ name: r.name, account: r.acct || null, user: r.uname || null, score: r.score, wave: r.wave,
                    sector: r.sector, loop: r.loop, level: r.level, kills: r.kills, time: r.time, at: r.at });

function boardKey(kind, id) {
  if (kind === 'all') return 'all';
  if (kind === 'season') return 'season:' + (isSeason(id) ? id : seasonOf());
  if (kind === 'day') return 'day:' + (isDay(id) ? id : utcDay());
  if (kind === 'pvp') return 'pvp:' + (isSeason(id) ? id : seasonOf());
  return null;
}

const json = (body, status = 200, cache) =>
  new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', 'cache-control': cache || 'no-store' }
  });

const count = async (db, board) =>
  (await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ?1').bind(board).first()).n;

async function page(db, board, from, n) {
  const rows = (await db.prepare(
    `SELECT s.name, s.score, s.wave, s.sector, s.loop, s.level, s.kills, s.time, s.at, a.display AS acct, a.name AS uname
       FROM scores s LEFT JOIN accounts a ON a.id = s.account
      WHERE s.board = ?1 ORDER BY s.score DESC, s.at ASC LIMIT ?2 OFFSET ?3`).bind(board, n, from).all()).results || [];
  let rank = 0;
  if (rows.length) {
    rank = 1 + (await db.prepare('SELECT COUNT(*) AS n FROM scores WHERE board = ?1 AND score > ?2')
      .bind(board, rows[0].score).first()).n;
  }
  const out = rows.map((r, i) => {
    if (i > 0 && r.score !== rows[i - 1].score) rank = from + i + 1;
    return Object.assign({ rank }, pub(r));
  });
  return { total: await count(db, board), from, rows: out };
}

/* Where each of these players stands on each of these boards, and an
   account on the PvP ladder too. An account with no runs is still a player
   (it has a profile, and may be on the ladder). */
async function standings(db, whos, boards) {
  if (!whos.length) return [];
  const ph = (list, at) => list.map((_, i) => '?' + (at + i)).join(',');
  const res = (await db.prepare(
    `SELECT s.board, s.who, s.name, s.score, s.wave, s.sector, s.loop, s.level, s.kills, s.time, s.at,
            a.display AS acct, a.name AS uname,
            (SELECT COUNT(*) FROM scores t WHERE t.board = s.board AND t.score > s.score) + 1 AS rank
       FROM scores s LEFT JOIN accounts a ON a.id = s.account
      WHERE s.board IN (${ph(boards, 1)}) AND s.who IN (${ph(whos, boards.length + 1)})`)
    .bind(...boards, ...whos).all()).results || [];
  const totals = {};
  for (const b of boards) totals[b] = await count(db, b);
  const byWho = new Map();
  for (const w of whos) byWho.set(w, null);
  for (const r of res) {
    let p = byWho.get(r.who);
    if (!p) { p = { name: r.name, account: r.acct || null, user: r.uname || null, boards: {}, best: 0 }; byWho.set(r.who, p); }
    p.boards[r.board] = Object.assign({ rank: r.rank, of: totals[r.board] }, pub(r));
    // the name shown is the one on the player's best run among these boards
    if (r.score > p.best) { p.best = r.score; p.name = r.name; }
  }
  const accts = whos.filter(w => w.startsWith('a:')).map(w => w.slice(2));
  for (const id of accts) {
    if (byWho.get('a:' + id)) continue;
    const a = await db.prepare('SELECT name, display FROM accounts WHERE id = ?1').bind(id).first();
    if (a) byWho.set('a:' + id, { name: a.display, account: a.display, user: a.name, boards: {}, best: 0 });
  }
  const pvp = await ladderStandings(db, accts);
  return [...byWho.entries()].filter(([, p]) => p).map(([who, { best, ...p }]) =>
    (who.startsWith('a:') ? Object.assign(p, { pvp: pvp.get(who.slice(2)) || null }) : p));
}

function boardsParam(v) {
  const want = String(v || '').split(',').map(s => s.trim()).filter(isBoard).slice(0, 4);
  if (want.length) return [...new Set(want)];
  return ['season:' + seasonOf(), 'all', 'day:' + utcDay()];
}

async function search(db, q, boards) {
  const lo = q, hi = q + '￿';
  const res = (await db.prepare(
    `SELECT who FROM (
       SELECT who, MAX(score) AS best FROM scores WHERE name_l >= ?1 AND name_l < ?2 GROUP BY who
       UNION
       SELECT 'a:' || a.id AS who, 0 AS best FROM accounts a WHERE a.name >= ?1 AND a.name < ?2)
      GROUP BY who ORDER BY MAX(best) DESC LIMIT 20`).bind(lo, hi).all()).results || [];
  return standings(db, res.map(r => r.who), boards);
}

export default async (req, env) => {
  const db = env.DB;
  await ensureScores(db);
  const meta = { season: seasonOf(), day: utcDay() };

  if (req.method === 'POST') {
    if (!originOk(req)) return json({ error: 'bad origin' }, 403);
    if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return json({ error: 'bad request' }, 415);
    let b;
    try { b = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }
    if (!b || b.op !== 'me') return json({ error: 'no such op' }, 400);
    const boards = boardsParam(Array.isArray(b.boards) ? b.boards.join(',') : b.boards);
    const s = await sessionOf(req, env, { peek: true }).catch(() => null);
    const whos = new Set();
    if (s) whos.add('a:' + s.account.id);
    else if (isPid(b.pid)) {
      const link = await db.prepare('SELECT account FROM account_pids WHERE pid = ?1').bind(b.pid).first();
      if (link) whos.add('a:' + link.account);
      for (const r of (await db.prepare('SELECT DISTINCT who FROM scores WHERE pid = ?1').bind(b.pid).all()).results || [])
        whos.add(r.who);
    }
    const players = await standings(db, [...whos].slice(0, 10), boards);
    return json(Object.assign({ signedIn: !!s, boards, players }, meta));
  }
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);

  await foldIfDue(env);
  const q = new URL(req.url).searchParams;

  if (q.get('list') !== null) {
    const doc = await getStore(env, STORE).get(ARCHIVE, { type: 'json' }).catch(() => null);
    const seasons = [...new Set([meta.season, ...Object.keys((doc && doc.list) || {})])].filter(isSeason).sort().reverse();
    return json(Object.assign({ seasons }, meta), 200, 'public, max-age=60');
  }

  if (q.get('user') !== null) {
    const user = String(q.get('user')).trim().toLowerCase();
    if (!isUser(user)) return json({ error: 'no such pilot' }, 404);
    const boards = ['season:' + meta.season, 'all', 'day:' + meta.day];
    const p = await profile(db, env, user, boards, standings);
    if (!p) return json({ error: 'no such pilot' }, 404);
    return json(Object.assign(p, { boards }, meta), 200, 'public, max-age=20');
  }

  if (q.get('q') !== null) {
    const term = String(q.get('q')).trim().toLowerCase().slice(0, 16);
    if (!term) return json({ error: 'empty search' }, 400);
    const boards = boardsParam(q.get('boards'));
    return json(Object.assign({ q: term, boards, players: await search(db, term, boards) }, meta));
  }

  const board = boardKey(q.get('board') || 'season', q.get('id'));
  if (!board) return json({ error: 'no such board' }, 400);
  const from = Math.min(Math.max(0, Math.floor(Number(q.get('from')) || 0)), 1e6);
  const n = Math.min(Math.max(1, Math.floor(Number(q.get('n')) || PAGE)), PAGE_MAX);
  if (board.startsWith('pvp:'))
    return json(Object.assign({ board }, await ladder(db, board.slice(4), from, n), meta), 200, 'public, max-age=10');
  return json(Object.assign({ board }, await page(db, board, from, n), meta), 200, 'public, max-age=10');
};
