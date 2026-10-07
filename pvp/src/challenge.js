/* ===========================================================================
   A hidden pilot's challenge (hidden.js), sent to the top of ranked.

   ARMED BY HAND, never by the game: `npm run challenge -- arm <pilot>
   <words>` (scripts/challenge.mjs) names the hidden pilot that issues it and
   the vault entry its words are kept in. The words are JSON, { "t": "title",
   "x": "text" }, put in the vault and given to nobody, as a sealed chapter's
   pages are (src/tales.js): the repo is public, and the words are not. A
   challenge left unarmed does nothing at all.

   TRIPPED BY THE LADDER: the first time anybody is placed in the highest
   league (VOID) in ranked while it is armed. At that moment it goes to the
   account at the top of ranked that season, and from then on it is theirs:
     - their /api/pvp/me carries it, the words and the date once one is set,
       and nobody else's does; the first time they are shown it is noted
     - the game's GET /api/account says only that there is one, for the
       menu's PVP door (src/account.js)
     - the hidden pilot's ranked ticket waits for them, and not for whoever
       is #1 by then, this season or the next (objects.js)
   The pilot's own holders never trip it and are never sent it: the accounts
   that fly it do not challenge themselves.

   It is checked when a rated match places somebody in VOID (the queue's
   Matchmaker, objects.js), and on PvP's daily cron (index.js), which also
   catches one armed after somebody is already there.

   The date is the dev's to set (`npm run challenge -- date`), before or
   after it is sent.
   ========================================================================= */
import { seasonOf } from '../../src/season.js';
import { vaultText, PERK } from '../../src/vault.js';
import { LEAGUES } from './rules.js';
import { ensurePvp } from './records.js';

// the league whose first player trips a challenge: the highest, VOID
export const TOP_LEAGUE = LEAGUES[LEAGUES.length - 1].id;
const WORDS = { t: 60, x: 4000 };        // what the lobby is handed of them, at most

const SCHEMA = `CREATE TABLE IF NOT EXISTS pvp_challenges (
     pilot       TEXT    PRIMARY KEY,      -- the hidden pilot that issues it: its vault id
     words       TEXT    NOT NULL,         -- the vault entry its words are kept in
     armed       INTEGER NOT NULL,         -- when it was armed (ms)
     due         INTEGER,                  -- the date it names (ms), once set
     tripped     INTEGER,                  -- when somebody was first placed in VOID while it was armed
     reached_by  TEXT,                     -- who that was
     season      TEXT,                     -- the season it tripped in
     target      TEXT,                     -- the account it went to: the top of ranked then
     seen        INTEGER                   -- when they were first shown it
   )`;
// for scripts/lib/challenge-sql.mjs to put ahead of its own SQL: one line, comments out
export const CHALLENGE_SCHEMA = SCHEMA.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';';

const ready = new WeakSet();
export async function ensureChallenges(db) {
  if (ready.has(db)) return;
  await db.prepare(SCHEMA).run();
  ready.add(db);
}

// a rating row (r) whose account does not fly the pilot: its perk is parameter n
const notHolder = n => `NOT EXISTS (SELECT 1 FROM accounts a WHERE a.id = r.account
                          AND EXISTS (SELECT 1 FROM json_each(a.perks) WHERE value = ?${n}))`;

/* Every armed challenge not yet sent, sent now if anybody is placed in VOID
   in ranked this season. The UPDATE only lands on one still unsent, so this
   running in the Matchmaker and on the cron at once sends it once. Returns
   what it sent, [{ pilot, target }], for the cron's log and the tests. */
export async function tripChallenges(db, now = Date.now()) {
  await ensureChallenges(db);
  const armed = ((await db.prepare('SELECT pilot FROM pvp_challenges WHERE tripped IS NULL').all()).results || []);
  if (!armed.length) return [];
  await ensurePvp(db);
  const season = seasonOf(now), sent = [];
  for (const { pilot } of armed) {
    const first = await db.prepare(
      `SELECT r.account FROM pvp_ratings r WHERE r.queue = 'ranked' AND r.season = ?1 AND r.league = ?2 AND ${notHolder(3)}
        ORDER BY r.updated ASC LIMIT 1`).bind(season, TOP_LEAGUE, PERK(pilot)).first();
    if (!first) continue;
    // the top of the ladder, in the ladder's own order (seasons.js, placed)
    const top = await db.prepare(
      `SELECT r.account FROM pvp_ratings r WHERE r.queue = 'ranked' AND r.season = ?1 AND r.league IS NOT NULL AND ${notHolder(2)}
        ORDER BY r.rating DESC, r.updated ASC LIMIT 1`).bind(season, PERK(pilot)).first();
    if (!top) continue;
    const r = await db.prepare(
      `UPDATE pvp_challenges SET tripped = ?2, reached_by = ?3, season = ?4, target = ?5
        WHERE pilot = ?1 AND tripped IS NULL`).bind(pilot, now, first.account, season, top.account).run();
    if (r && r.meta && r.meta.changes) sent.push({ pilot, target: top.account });
  }
  return sent;
}

// the account a hidden pilot's ranked ticket waits for once its challenge is sent, or null
export async function targetOf(db, pilot) {
  await ensureChallenges(db);
  const row = await db.prepare('SELECT target FROM pvp_challenges WHERE pilot = ?1 AND target IS NOT NULL').bind(pilot).first();
  return row ? row.target : null;
}

/* The challenge sent to this account, its words read out of the vault:
   { t, x, due } (due in ms, or null), or null when there is none. `seen`
   notes the first time it was shown (the lobby's /api/pvp/me). Words that
   cannot be read are no challenge, never half a one. */
export async function challengeFor(db, acct, { seen = false } = {}) {
  await ensureChallenges(db);
  const row = await db.prepare('SELECT pilot, words, due, seen FROM pvp_challenges WHERE target = ?1 ORDER BY tripped LIMIT 1')
    .bind(acct).first();
  if (!row) return null;
  let w = null;
  try {
    const got = await vaultText(db, row.words);
    w = got ? JSON.parse(got.text) : null;
  } catch (e) {
    console.error('challenge ' + row.pilot + ': its words: ' + (e && e.message));
  }
  if (!w || typeof w.x !== 'string') return null;
  if (seen && !row.seen)
    await db.prepare('UPDATE pvp_challenges SET seen = ?2 WHERE pilot = ?1 AND seen IS NULL').bind(row.pilot, Date.now()).run();
  return { t: String(w.t || '').slice(0, WORDS.t), x: w.x.slice(0, WORDS.x), due: row.due || null };
}

/* Only whether one waits for this account, for the game's Worker, which
   never makes PvP's tables: none there yet is none waiting. */
export async function challengeWaits(db, acct) {
  try {
    return !!(await db.prepare('SELECT 1 AS y FROM pvp_challenges WHERE target = ?1 LIMIT 1').bind(acct).first());
  } catch (e) {
    return false;
  }
}
