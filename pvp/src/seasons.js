/* ===========================================================================
   PvP's seasons (PVP-PLAN.md, Phase 5 step 4 and Phase 6 step 2). A PvP
   season is the game's own (src/season.js: the 6th to the 6th, UTC), and
   ratings are kept per season (pvp_ratings), so a new season begins by
   itself. At the turn:

     rewards      each queue's `rewards` (rules.js, QUEUES) names what it
                  pays for a finished season, and each is filed once:
       seasonPodium   the top three, placed players only, in the ladder's
                      own order (src/profiles.js), into pvp_podiums
       leagueBadge    every placed player, the league they finished in,
                      into pvp_badges
                  The game's Worker hands them out with its awards, with
                  whatever each is worth, and shows them on profiles
                  (src/pvp-rewards.js).
     soft reset   a player's first rating of the new season is not the
                  newcomer's 1500: it is last season's pulled halfway back
                  towards it, a little less certain, with the placement
                  matches to play again (carried, which ratingOf in
                  records.js falls back on).

   closeSeasons runs on the PvP Worker's daily cron (index.js, scheduled) and
   files every reward of every finished season not yet filed, so a missed
   day, a season that ended before this shipped, or a reward added since, is
   caught up by the next run. Filing is INSERT OR IGNORE on each table's key:
   running twice, or beside another run, changes nothing.
   ========================================================================= */
import { seasonOf, seasonStart } from '../../src/season.js';
import { START } from './glicko.js';
import { ensurePvp } from './records.js';
import { QUEUES } from './rules.js';

export const SOFT = {
  pull: 0.5,      // how much of last season's distance from 1500 is kept
  rd: 200         // the deviation a carried rating starts at, at least (a newcomer's is 350)
};

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS pvp_podiums (
     season   TEXT    NOT NULL,
     queue    TEXT    NOT NULL,
     rank     INTEGER NOT NULL,              -- 1, 2, 3
     account  TEXT    NOT NULL,
     rating   REAL    NOT NULL,
     league   TEXT,
     filed    INTEGER NOT NULL,
     PRIMARY KEY (season, queue, rank))`,
  'CREATE INDEX IF NOT EXISTS pvp_podiums_account ON pvp_podiums (account)',
  `CREATE TABLE IF NOT EXISTS pvp_badges (
     season   TEXT    NOT NULL,
     queue    TEXT    NOT NULL,
     account  TEXT    NOT NULL,
     league   TEXT    NOT NULL,              -- the league they finished the season in
     rating   REAL    NOT NULL,
     filed    INTEGER NOT NULL,
     PRIMARY KEY (season, queue, account))`,
  'CREATE INDEX IF NOT EXISTS pvp_badges_account ON pvp_badges (account)'
];
const ready = new WeakSet();
export async function ensureRewards(db) {
  if (ready.has(db)) return;
  await ensurePvp(db);
  await db.batch(SCHEMA.map(q => db.prepare(q)));
  ready.add(db);
}

// the placed players of a queue's season, best first: the ladder's own order
const placed = (db, season, queue, limit) => db.prepare(
  `SELECT account, rating, league FROM pvp_ratings
    WHERE queue = ?2 AND season = ?1 AND league IS NOT NULL
    ORDER BY rating DESC, updated ASC` + (limit ? ' LIMIT ' + limit : '')).bind(season, queue).all()
  .then(r => r.results || []);

/* What a queue can pay for a finished season: the table it is filed in, and
   how. A new kind of reward is one more entry here, named in a queue's
   `rewards`. Each `file` returns how many rows it filed. */
export const REWARDS = {
  seasonPodium: {
    table: 'pvp_podiums',
    async file(db, season, queue, now) {
      const top = await placed(db, season, queue, 3);
      if (top.length) await db.batch(top.map((r, i) => db.prepare(
        `INSERT OR IGNORE INTO pvp_podiums (season, queue, rank, account, rating, league, filed)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`).bind(season, queue, i + 1, r.account, r.rating, r.league, now)));
      return top.length;
    }
  },
  leagueBadge: {
    table: 'pvp_badges',
    async file(db, season, queue, now) {
      const all = await placed(db, season, queue, 0);
      // in batches, so a big season stays within a batch's limits
      for (let i = 0; i < all.length; i += 50)
        await db.batch(all.slice(i, i + 50).map(r => db.prepare(
          `INSERT OR IGNORE INTO pvp_badges (season, queue, account, league, rating, filed)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`).bind(season, queue, r.account, r.league, r.rating, now)));
      return all.length;
    }
  }
};

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

/* File every reward of every finished season that is due and not filed:
   per queue, per reward it names, per season with placed players and no
   rows of that reward yet. Returns the seasons it filed anything for,
   oldest first, for the cron's log and the tests. */
export async function closeSeasons(db, now = Date.now()) {
  await ensureRewards(db);
  const current = seasonOf(now);
  const filed = new Set();
  for (const q of Object.values(QUEUES)) {
    for (const name of q.rewards || []) {
      const r = Object.prototype.hasOwnProperty.call(REWARDS, name) ? REWARDS[name] : null;
      if (!r) continue;
      const due = ((await db.prepare(
        `SELECT DISTINCT season FROM pvp_ratings
          WHERE queue = ?1 AND season < ?2 AND league IS NOT NULL
            AND season NOT IN (SELECT season FROM ${r.table} WHERE queue = ?1)
          ORDER BY season`).bind(q.id, current).all()).results || []).map(x => x.season);
      for (const season of due) if (await r.file(db, season, q.id, now)) filed.add(season);
    }
  }
  return [...filed].sort();
}
