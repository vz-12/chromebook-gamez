/* ===========================================================================
   VOIDRUNNER — the PvP ladder and players' profiles, for the leaderboard
   page (PVP-PLAN.md, Phase 5 step 3). Read by /api/boards (boards.js):

     GET /api/boards?board=pvp[&id=2026-10][&from=0&n=50]
         the ranked ladder for a season: every placed player by rating, with
         their league, wins and losses, and how many are in each league
     GET /api/boards?user=<account name>
         a player's profile: who they are, where they stand on the game's
         boards and the ladder, the pilots they have unlocked and awakened,
         their season podiums, and their PvP record with the latest matches

   PvP's tables (pvp_ratings, pvp_matches) are made by the PvP Worker
   (pvp/src/records.js) on the same D1; until it has run they are not there,
   and everything PvP here reads as empty. Only what the boards already show
   in public: names, never an account id, a profile id, a device, a match
   id, or anything from a save beyond its unlocks summary. A guest (a
   callsign with no account) has no profile.
   ========================================================================= */
import { STORE, ARCHIVE, seasonOf } from './season.js';
import { getStore } from './store.js';
import { PILOTS, BASE_PILOTS, PLACEMENTS } from '../pvp/src/rules.js';

export const isUser = v => typeof v === 'string' && /^[a-z0-9_-]{3,16}$/.test(v);

const seen = new WeakSet();
// PvP's tables, once the PvP Worker has made them
export async function hasPvp(db) {
  if (seen.has(db)) return true;
  const r = await db.prepare(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('pvp_ratings', 'pvp_matches')").first();
  if (r && r.n === 2) { seen.add(db); return true; }
  return false;
}

const PLACED = "queue = 'ranked' AND season = ?1 AND league IS NOT NULL";

/* A page of the ladder: placed players only (a league is shown once the
   placement matches are played), best rating first, competition ranks. */
export async function ladder(db, season, from, n) {
  const empty = { total: 0, from, rows: [], leagues: {} };
  if (!(await hasPvp(db))) return empty;
  const rows = (await db.prepare(
    `SELECT a.display, a.name AS user, r.league, r.rating, r.wins, r.losses
       FROM pvp_ratings r JOIN accounts a ON a.id = r.account
      WHERE r.queue = 'ranked' AND r.season = ?1 AND r.league IS NOT NULL
      ORDER BY r.rating DESC, r.updated ASC LIMIT ?2 OFFSET ?3`)
    .bind(season, n, from).all()).results || [];
  let rank = 0;
  if (rows.length)
    rank = 1 + (await db.prepare(`SELECT COUNT(*) AS n FROM pvp_ratings WHERE ${PLACED} AND rating > ?2`)
      .bind(season, rows[0].rating).first()).n;
  const out = rows.map((r, i) => {
    if (i > 0 && r.rating !== rows[i - 1].rating) rank = from + i + 1;
    return { rank, name: r.display, user: r.user, league: r.league, rating: Math.round(r.rating), wins: r.wins, losses: r.losses };
  });
  const leagues = {};
  let total = 0;
  for (const l of (await db.prepare(`SELECT league, COUNT(*) AS n FROM pvp_ratings WHERE ${PLACED} GROUP BY league`)
    .bind(season).all()).results || []) { leagues[l.league] = l.n; total += l.n; }
  return { total, from, rows: out, leagues };
}

/* Where these accounts stand on the ladder this season: a rank among the
   placed, or still being placed (and how many matches in). */
export async function ladderStandings(db, accounts, season = seasonOf()) {
  const out = new Map();
  if (!accounts.length || !(await hasPvp(db))) return out;
  const ph = accounts.map((_, i) => '?' + (i + 2)).join(',');
  const rows = (await db.prepare(
    `SELECT r.account, r.league, r.rating, r.games, r.wins, r.losses,
            CASE WHEN r.league IS NULL THEN NULL ELSE
              (SELECT COUNT(*) FROM pvp_ratings t WHERE t.queue = 'ranked' AND t.season = ?1 AND t.league IS NOT NULL
                 AND t.rating > r.rating) + 1 END AS rank
       FROM pvp_ratings r WHERE r.queue = 'ranked' AND r.season = ?1 AND r.account IN (${ph})`)
    .bind(season, ...accounts).all()).results || [];
  let of = null;
  for (const r of rows) {
    if (r.league && of === null)
      of = (await db.prepare(`SELECT COUNT(*) AS n FROM pvp_ratings WHERE ${PLACED}`).bind(season).first()).n;
    out.set(r.account, r.league
      ? { season, league: r.league, rating: Math.round(r.rating), rank: r.rank, of, wins: r.wins, losses: r.losses, games: r.games }
      : { season, league: null, placing: true, games: r.games, left: Math.max(0, PLACEMENTS - r.games), wins: r.wins, losses: r.losses });
  }
  return out;
}

const RECENT = 10;

/* A player's profile, by account name, or null when there is no such
   account. `standings` is boards.js's: the account's placement on each of
   `boards`. */
export async function profile(db, env, user, boards, standings) {
  const a = await db.prepare('SELECT id, name, display, created FROM accounts WHERE name = ?1').bind(user).first();
  if (!a) return null;
  const season = seasonOf();

  // the game: placements, pilots, podiums
  const [placed] = await standings(db, ['a:' + a.id], boards);
  const row = await db.prepare('SELECT unlocks FROM saves WHERE account = ?1').bind(a.id).first();
  let u = null;
  try { u = row ? JSON.parse(row.unlocks) : null; } catch (e) {}
  const list = v => (u && Array.isArray(u[v]) ? u[v] : []);
  const owned = new Set([...BASE_PILOTS, ...list('chars')]), awake = new Set(list('awake'));
  const pilots = Object.entries(PILOTS).map(([id, name]) => ({ id, name, owned: owned.has(id), awake: owned.has(id) && awake.has(id) }));
  // a season's podium is filed with the profile ids that flew it (season.js); the account's are its own
  const pids = new Set(((await db.prepare('SELECT pid FROM account_pids WHERE account = ?1').bind(a.id).all()).results || []).map(r => r.pid));
  const podiums = [];
  if (pids.size) {
    const doc = await getStore(env, STORE).get(ARCHIVE, { type: 'json' }).catch(() => null);
    for (const [id, s] of Object.entries((doc && doc.list) || {}))
      for (const e of (s && s.top3) || [])
        if (e && e.pid && pids.has(e.pid)) podiums.push({ season: id, rank: e.rank, score: e.score });
    podiums.sort((x, y) => (x.season < y.season ? 1 : x.season > y.season ? -1 : x.rank - y.rank));
  }

  // PvP: the ladder this season, every recorded match, the latest ones
  let pvp = { season, ladder: null, wins: 0, losses: 0, played: 0, recent: [] };
  if (await hasPvp(db)) {
    pvp.ladder = (await ladderStandings(db, [a.id], season)).get(a.id) || null;
    const t = await db.prepare(
      `SELECT COUNT(*) AS played,
              SUM(CASE WHEN (a = ?1 AND winner = 0) OR (b = ?1 AND winner = 1) THEN 1 ELSE 0 END) AS wins
         FROM pvp_matches WHERE (a = ?1 OR b = ?1) AND verdict IN ('played', 'forfeit')`).bind(a.id).first();
    pvp.played = (t && t.played) || 0;
    pvp.wins = (t && t.wins) || 0;
    pvp.losses = pvp.played - pvp.wins;
    const rows = (await db.prepare(
      `SELECT m.queue, m.league, m.a, m.a_pilot, m.b_pilot, m.winner, m.score_a, m.score_b, m.best_of, m.verdict, m.reason, m.ended,
              oa.display AS a_name, oa.name AS a_user, ob.display AS b_name, ob.name AS b_user
         FROM pvp_matches m LEFT JOIN accounts oa ON oa.id = m.a LEFT JOIN accounts ob ON ob.id = m.b
        WHERE m.a = ?1 OR m.b = ?1 ORDER BY m.ended DESC LIMIT ${RECENT}`).bind(a.id).all()).results || [];
    pvp.recent = rows.map(m => {
      const me = m.a === a.id ? 0 : 1;
      const them = me ? { name: m.a_name, user: m.a_user, pilot: m.a_pilot } : { name: m.b_name, user: m.b_user, pilot: m.b_pilot };
      const decided = m.verdict === 'played' || m.verdict === 'forfeit';
      return {
        at: m.ended, queue: m.queue, league: m.league, verdict: m.verdict, reason: m.reason, bestOf: m.best_of,
        won: decided ? m.winner === me : null,
        score: m.score_a === null ? null : me ? [m.score_b, m.score_a] : [m.score_a, m.score_b],
        pilot: me ? m.b_pilot : m.a_pilot,
        them: { name: them.name || 'A FORMER PILOT', user: them.user || null, pilot: them.pilot }
      };
    });
  }
  return {
    user: { name: a.name, display: a.display, joined: a.created },
    game: { boards: (placed && placed.boards) || {}, callsign: (placed && placed.name) || null, pilots, podiums },
    pvp
  };
}
