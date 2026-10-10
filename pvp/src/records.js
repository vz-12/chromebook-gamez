/* ===========================================================================
   PvP's tables in the game's D1 (PVP-PLAN.md, Phase 5), made on first use
   like the rest (src/auth.js, src/boards.js).

     pvp_matches   one row per match the referee decided (referee.js): who
                   played whom, flying what, the winner, the score, the
                   verdict and the season. Profiles and the ladder read it.
                   A rated bot match (bots.js) has a row too, its `b` the
                   bot's name after 'bot:', which is nobody's account.
     pvp_flags     an account, a match, and why it was no contest. One proves
                   nothing; the same account against many opponents does.
     pvp_ratings   per account, queue and season: the Glicko-2 rating
                   (glicko.js), its deviation and volatility, the games, wins
                   and losses, and the league it puts them in (NULL while
                   still being placed). Written only by the queue's
                   Matchmaker (objects.js), one match at a time.
   ========================================================================= */
import { seasonOf } from '../../src/season.js';
import { START, rateMatch, glicko2 } from './glicko.js';
import { leagueOf, PLACEMENTS } from './rules.js';
import { carried } from './seasons.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pvp_matches (
     id       TEXT    PRIMARY KEY,
     queue    TEXT    NOT NULL,             -- friend, casual, ranked
     league   TEXT,                         -- the league it was played in (ranked)
     rated    INTEGER NOT NULL DEFAULT 0,
     a        TEXT    NOT NULL,             -- the host's account
     b        TEXT    NOT NULL,             -- the guest's (or 'bot:' and a bot's name: bots.js)
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

/* An account's rating row in a queue and season. Before its first rated
   match there: last season's, carried softly (seasons.js), or null for a
   newcomer. */
export async function ratingOf(db, acct, queue, season = seasonOf()) {
  await ensurePvp(db);
  const row = await db.prepare('SELECT rating, rd, vol, games, wins, losses, league FROM pvp_ratings WHERE account = ?1 AND queue = ?2 AND season = ?3')
    .bind(acct, queue, season).first();
  return row || carried(db, acct, queue, season);
}

/* The account at the top of a queue's ladder this season: the highest
   rating among the placed (PLACEMENTS played), the earliest there on a tie.
   Null while nobody is placed. A hidden pilot is paired with it (objects.js). */
export async function topOf(db, queue, season = seasonOf()) {
  await ensurePvp(db);
  const row = await db.prepare('SELECT account FROM pvp_ratings WHERE queue = ?1 AND season = ?2 AND games >= ?3 ORDER BY rating DESC, updated ASC LIMIT 1')
    .bind(queue, season, PLACEMENTS).first();
  return row ? row.account : null;
}

/* A recorded match's ratings, once: both players rated from their ratings
   before it (glicko.js), in the match's season, and the match marked applied
   in the same batch, so a retry changes nothing. Only a rated match that was
   played or forfeited moves a rating; no contest leaves both where they were.
   The caller (the queue's Matchmaker) makes sure two never run at once.
   Returns each side's rating before and after, for the result screen. */
export async function applyRating(db, id) {
  await ensurePvp(db);
  const m = await db.prepare('SELECT * FROM pvp_matches WHERE id = ?1').bind(id).first();
  if (!m) return { ok: false, error: 'no such match' };
  if (m.applied || !m.rated || (m.verdict !== 'played' && m.verdict !== 'forfeit') || (m.winner !== 0 && m.winner !== 1))
    return { ok: true, moved: false };
  const [ra, rb] = await Promise.all([ratingOf(db, m.a, m.queue, m.season), ratingOf(db, m.b, m.queue, m.season)]);
  const [na, nb] = rateMatch(ra || START, rb || START, m.winner === 0);
  const now = Date.now();
  const told = [];
  const put = (acct, old, n, won) => {
    const games = (old ? old.games : 0) + 1;
    const lg = leagueOf({ rating: n.rating, games });
    told.push({ before: Math.round(old ? old.rating : START.rating), after: Math.round(n.rating), games,
                league: lg.provisional ? null : lg.id, left: lg.left });
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
  return { ok: true, moved: true, ratings: told };
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

/* A rated bot match (bots.js; the Matchmaker's `bot` op, objects.js): its
   row, and the player's rating against the bot's, which is nobody's row, in
   one batch. A win never lifts the rating past BOTS.ceiling (a rating already
   above it stays where it was). Written once: a match already kept is left
   as it is. `x` is the bot as its match was started: { id, acct, name, pilot,
   mine (the player's pilot), league, rating, rd, at, queue }; `how`: { won,
   score ([player, bot]) or null, v ('played' | 'forfeit'), reason }.
   Returns the player's rating before and after, for the result screen. */
export async function recordBot(db, x, how, now, ceiling) {
  await ensurePvp(db);
  const id = 'bot' + x.id;
  if (await db.prepare('SELECT 1 FROM pvp_matches WHERE id = ?1').bind(id).first()) return null;
  const season = seasonOf(x.at);
  const old = await ratingOf(db, x.acct, x.queue, season);
  const was = old || START;
  const n = glicko2(was, [{ rating: x.rating, rd: x.rd, s: how.won ? 1 : 0 }]);
  if (how.won) n.rating = Math.min(n.rating, Math.max(was.rating, ceiling));
  const games = (old ? old.games : 0) + 1;
  const lg = leagueOf({ rating: n.rating, games });
  const score = how.score || null;
  await db.batch([
    db.prepare(
      `INSERT INTO pvp_matches
         (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season, applied)
       VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 3, ?11, ?12, ?13, ?14, ?15, 1)`).bind(
      id, x.queue, x.league || null, x.acct, 'bot:' + x.name, x.mine, x.pilot, how.won ? 0 : 1,
      score ? score[0] : null, score ? score[1] : null, how.v, how.reason || null, x.at, now, season),
    db.prepare(
      `INSERT INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT (account, queue, season) DO UPDATE SET rating = excluded.rating, rd = excluded.rd, vol = excluded.vol,
         games = excluded.games, wins = excluded.wins, losses = excluded.losses, league = excluded.league, updated = excluded.updated`)
      .bind(x.acct, x.queue, season, n.rating, n.rd, n.vol, games,
            (old ? old.wins : 0) + (how.won ? 1 : 0), (old ? old.losses : 0) + (how.won ? 0 : 1), lg.provisional ? null : lg.id, now)
  ]);
  return { before: Math.round(was.rating), after: Math.round(n.rating), games, league: lg.provisional ? null : lg.id, left: lg.left };
}
