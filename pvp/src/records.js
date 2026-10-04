/* ===========================================================================
   PvP's tables in the game's D1 (PVP-PLAN.md, Phase 5), made on first use
   like the rest (src/auth.js, src/boards.js).

     pvp_matches   one row per match the referee decided (referee.js): who
                   played whom, flying what, the winner, the score, the
                   verdict and the season. Profiles and the ladder read it.
     pvp_flags     an account, a match, and why it was no contest. One proves
                   nothing; the same account against many opponents does.
   ========================================================================= */
import { seasonOf } from '../../src/season.js';

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
     season   TEXT    NOT NULL)`,
  'CREATE INDEX IF NOT EXISTS pvp_matches_a ON pvp_matches (a, ended)',
  'CREATE INDEX IF NOT EXISTS pvp_matches_b ON pvp_matches (b, ended)',
  `CREATE TABLE IF NOT EXISTS pvp_flags (
     account  TEXT    NOT NULL,
     match    TEXT    NOT NULL,
     reason   TEXT    NOT NULL,
     at       INTEGER NOT NULL,
     PRIMARY KEY (account, match))`
];

const ready = new WeakSet();
export async function ensurePvp(db) {
  if (ready.has(db)) return;
  await db.batch(SCHEMA.map(q => db.prepare(q)));
  ready.add(db);
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
