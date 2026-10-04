/* ===========================================================================
   PvP's tables in the game's D1 (PVP-PLAN.md, Phase 5), made on first use
   like the rest (src/auth.js, src/boards.js).

     pvp_matches   one row per match the referee decided (referee.js): who
                   played whom, flying what, the winner, the score, the
                   verdict and the season. Profiles and the ladder read it.
     pvp_flags     an account, a match, and why it was no contest. One proves
                   nothing; the same account against many opponents does.
     pvp_ratings   per account, queue and season: the Glicko-2 rating
                   (glicko.js), its deviation and volatility, the games, wins
                   and losses, and the league it puts them in (NULL while
                   still being placed). Written only by the queue's
                   Matchmaker (objects.js), one match at a time.
   ========================================================================= */
import { seasonOf } from '../../src/season.js';
import { START, rateMatch } from './glicko.js';
import { leagueOf } from './rules.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pvp_matches (
     id       TEXT    PRIMARY KEY,
     queue    TEXT    NOT NULL,             -- friend, casual, ranked
     league   TEXT,                         -- the league it was played in (ranked)
     rated    INTEGER NOT NULL DEFAULT 0,
     a        TEXT    NOT NULL,             -- the host's account
     b        TEXT    NOT NULL,             -- the guest's
     a_pilot  TEXT    NOT NULL,
     b_pilot  TEXT    NOT NULL,
     winner   INTEGER,                      -- 0 the host, 1 the guest, NULL none
     score_a  INTEGER,
     score_b  INTEGER,
     best_of  INTEGER,
     verdict  TEXT    NOT NULL,             -- played, forfeit, void
     reason   TEXT,
     started  INTEGER NOT NULL,
     ended    INTEGER NOT NULL,
     season   TEXT    NOT NULL,
     applied  INTEGER NOT NULL DEFAULT 0)`,   // its ratings are written (rated matches)
  'CREATE INDEX IF NOT EXISTS pvp_matches_a ON pvp_matches (a, ended)',
  'CREATE INDEX IF NOT EXISTS pvp_matches_b ON pvp_matches (b, ended)',
  `CREATE TABLE IF NOT EXISTS pvp_flags (
     account  TEXT    NOT NULL,
     match    TEXT    NOT NULL,
     reason   TEXT    NOT NULL,
     at       INTEGER NOT NULL,
     PRIMARY KEY (account, match))`,
  `CREATE TABLE IF NOT EXISTS pvp_ratings (
     account  TEXT    NOT NULL,
     queue    TEXT    NOT NULL,
     season   TEXT    NOT NULL,
     rating   REAL    NOT NULL,
     rd       REAL    NOT NULL,
     vol      REAL    NOT NULL,
     games    INTEGER NOT NULL DEFAULT 0,
     wins     INTEGER NOT NULL DEFAULT 0,
     losses   INTEGER NOT NULL DEFAULT 0,
     league   TEXT,                         -- NULL while still being placed
     updated  INTEGER NOT NULL,
     PRIMARY KEY (account, queue, season))`,
  'CREATE INDEX IF NOT EXISTS pvp_ratings_ladder ON pvp_ratings (queue, season, rating DESC)'
];

/* Columns added after their table first shipped (as src/auth.js does):
   pvp_matches.applied, set once the match's ratings are written. */
const ADDED = [['pvp_matches', 'applied', 'INTEGER NOT NULL DEFAULT 0']];

const ready = new WeakSet();
export async function ensurePvp(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map(q => db.prepare(q)));
  for (const [table, col, type] of ADDED) {
    const cols = ((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map(r => r.name);
    if (!cols.includes(col))
      await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`).run()
        .catch(e => { if (!/duplicate column/i.test(String(e && e.message))) throw e; });
  }
  ready.add(db);
}

// an account's rating row in a queue and season, or null before its first rated match there
export async function ratingOf(db, acct, queue, season = seasonOf()) {
  await ensurePvp(db);
  return db.prepare('SELECT rating, rd, vol, games, wins, losses, league FROM pvp_ratings WHERE account = ?1 AND queue = ?2 AND season = ?3')
    .bind(acct, queue, season).first();
}

/* A recorded match's ratings, once: both players rated from their ratings
   before it (glicko.js), in the match's season, and the match marked applied
   in the same batch, so a retry changes nothing. Only a rated match that was
   played or forfeited moves a rating; no contest leaves both where they were.
   The caller (the queue's Matchmaker) makes sure two never run at once. */
export async function applyRating(db, id) {
  await ensurePvp(db);
  const m = await db.prepare('SELECT * FROM pvp_matches WHERE id = ?1').bind(id).first();
  if (!m) return { ok: false, error: 'no such match' };
  if (m.applied || !m.rated || (m.verdict !== 'played' && m.verdict !== 'forfeit') || (m.winner !== 0 && m.winner !== 1))
    return { ok: true, moved: false };
  const [ra, rb] = await Promise.all([ratingOf(db, m.a, m.queue, m.season), ratingOf(db, m.b, m.queue, m.season)]);
  const [na, nb] = rateMatch(ra || START, rb || START, m.winner === 0);
  const now = Date.now();
  const put = (acct, old, n, won) => {
    const games = (old ? old.games : 0) + 1;
    const lg = leagueOf({ rating: n.rating, games });
    return db.prepare(
      `INSERT INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (account, queue, season) DO UPDATE SET rating = excluded.rating, rd = excluded.rd, vol = excluded.vol,
         games = excluded.games, wins = excluded.wins, losses = excluded.losses, league = excluded.league, updated = excluded.updated`)
      .bind(acct, m.queue, m.season, n.rating, n.rd, n.vol, games,
            (old ? old.wins : 0) + (won ? 1 : 0), (old ? old.losses : 0) + (won ? 0 : 1),
            lg.provisional ? null : lg.id, now);
  };
  await db.batch([put(m.a, ra, na, m.winner === 0), put(m.b, rb, nb, m.winner === 1),
                  db.prepare('UPDATE pvp_matches SET applied = 1 WHERE id = ?1').bind(id)]);
  return { ok: true, moved: true };
}

/* A decided match, and its flags, in one batch. Written once: a second try
   (the object retrying after a failed write) changes nothing. */
export async function recordMatch(db, m, verdict) {
  await ensurePvp(db);
  const [A, B] = m.sides;
  const score = verdict.score || null;
  const stmts = [db.prepare(
    `INSERT OR IGNORE INTO pvp_matches
       (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`).bind(
    m.id, m.queue, m.league || null, m.rated ? 1 : 0, A.acct, B.acct, A.pilot, B.pilot,
    verdict.winner === 0 || verdict.winner === 1 ? verdict.winner : null,
    score ? score[0] : null, score ? score[1] : null, verdict.bestOf || null,
    verdict.v, verdict.reason || null, m.started, verdict.at, seasonOf(m.started))];
  for (const k of verdict.flag || [])
    stmts.push(db.prepare('INSERT OR IGNORE INTO pvp_flags (account, match, reason, at) VALUES (?1, ?2, ?3, ?4)')
      .bind(m.sides[k].acct, m.id, verdict.reason || 'void', verdict.at));
  await db.batch(stmts);
}
