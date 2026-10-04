/* ===========================================================================
   PvP's seasons (PVP-PLAN.md, Phase 5 step 4). A PvP season is the game's
   own (src/season.js: the 6th to the 6th, UTC), and ratings are kept per
   season (pvp_ratings), so a new season begins by itself. Two things happen
   at the turn:

     the podium   the finished season's top three in ranked, placed players
                  only, in the ladder's own order (src/profiles.js), filed
                  once into pvp_podiums. The game's Worker hands them out
                  with its awards, with whatever each place is worth, and
                  shows them on profiles (src/pvp-podiums.js).
     soft reset   a player's first rating of the new season is not the
                  newcomer's 1500: it is last season's pulled halfway back
                  towards it, a little less certain, with the placement
                  matches to play again (carried, which ratingOf in
                  records.js falls back on).

   closeSeasons runs on the PvP Worker's daily cron (index.js, scheduled) and
   files every finished season that has ratings and no podium yet, so a
   missed day, or a season that ended before this shipped, is caught up by
   the next run. Filing is INSERT OR IGNORE on (season, queue, rank): running
   twice, or beside another run, changes nothing.
   ========================================================================= */
import { seasonOf, seasonStart } from '../../src/season.js';
import { START } from './glicko.js';
import { ensurePvp } from './records.js';

export const SOFT = {
  pull: 0.5,      // how much of last season's distance from 1500 is kept
  rd: 200         // the deviation a carried rating starts at, at least (a newcomer's is 350)
};

const PODIUM_SCHEMA = `CREATE TABLE IF NOT EXISTS pvp_podiums (
  season   TEXT    NOT NULL,
  queue    TEXT    NOT NULL,
  rank     INTEGER NOT NULL,              -- 1, 2, 3
  account  TEXT    NOT NULL,
  rating   REAL    NOT NULL,
  league   TEXT,
  filed    INTEGER NOT NULL,
  PRIMARY KEY (season, queue, rank))`;
const ready = new WeakSet();
export async function ensurePodiums(db) {
  if (ready.has(db)) return;
  await ensurePvp(db);
  await db.batch([db.prepare(PODIUM_SCHEMA),
                  db.prepare('CREATE INDEX IF NOT EXISTS pvp_podiums_account ON pvp_podiums (account)')]);
  ready.add(db);
}

// the season before this one
export const seasonBefore = id => seasonOf(seasonStart(id) - 1);

/* A player's starting point in `season` from the one before, or null when
   they had no rating then. Played as a rating row with no games yet, so
   the league waits on placements again and the first match rates from it. */
export async function carried(db, acct, queue, season) {
  const prev = await db.prepare(
    'SELECT rating, rd, vol FROM pvp_ratings WHERE account = ?1 AND queue = ?2 AND season = ?3')
    .bind(acct, queue, seasonBefore(season)).first();
  if (!prev) return null;
  return {
    rating: START.rating + (prev.rating - START.rating) * SOFT.pull,
    rd: Math.min(START.rd, Math.max(prev.rd, SOFT.rd)),
    vol: prev.vol,
    games: 0, wins: 0, losses: 0, league: null, carried: true
  };
}

/* File every finished ranked season's podium that has not been filed.
   Returns the seasons it filed, for the cron's log and the tests. */
export async function closeSeasons(db, now = Date.now()) {
  await ensurePodiums(db);
  const current = seasonOf(now);
  const due = ((await db.prepare(
    `SELECT DISTINCT season FROM pvp_ratings
      WHERE queue = 'ranked' AND season < ?1 AND league IS NOT NULL
        AND season NOT IN (SELECT season FROM pvp_podiums WHERE queue = 'ranked')
      ORDER BY season`).bind(current).all()).results || []).map(r => r.season);
  const filed = [];
  for (const season of due) {
    const top = (await db.prepare(
      `SELECT account, rating, league FROM pvp_ratings
        WHERE queue = 'ranked' AND season = ?1 AND league IS NOT NULL
        ORDER BY rating DESC, updated ASC LIMIT 3`).bind(season).all()).results || [];
    if (!top.length) continue;
    await db.batch(top.map((r, i) => db.prepare(
      `INSERT OR IGNORE INTO pvp_podiums (season, queue, rank, account, rating, league, filed)
       VALUES (?1, 'ranked', ?2, ?3, ?4, ?5, ?6)`).bind(season, i + 1, r.account, r.rating, r.league, now)));
    filed.push(season);
  }
  return filed;
}
