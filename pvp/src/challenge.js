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

   ON AIR (live spectating): the match the queue makes between the pilot and
   the account it was sent to is noted here, when it starts and when the
   referee decides it (objects.js), and while it is on, the game's public
   GET /api/live says so (src/live.js, liveNow below) with the announcement:
   words of their own in the vault, named by `npm run challenge -- announce
   <pilot> <words>`, JSON { "t": "title", "x": "text", "as": "the pilot's
   name, shown", "named": false to keep the other player's name off it }.
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
     seen        INTEGER,                  -- when they were first shown it
     match       TEXT,                     -- the match the queue made between the two, the latest
     started     INTEGER,                  -- when it was made
     ended       INTEGER,                  -- when the referee decided it
     announce    TEXT                      -- the vault entry its announcement is kept in
   )`;
// columns added after the table first shipped, as records.js does
const ADDED = [['match', 'TEXT'], ['started', 'INTEGER'], ['ended', 'INTEGER'], ['announce', 'TEXT']];
export const CHALLENGE_ADDED = ADDED;
// for scripts/lib/challenge-sql.mjs to put ahead of its own SQL: one line, comments out
export const CHALLENGE_SCHEMA = SCHEMA.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';';

const ready = new WeakSet();
export async function ensureChallenges(db) {
  if (ready.has(db)) return;
  await db.prepare(SCHEMA).run();
  const cols = ((await db.prepare('PRAGMA table_info(pvp_challenges)').all()).results || []).map(r => r.name);
  for (const [col, type] of ADDED)
    if (!cols.includes(col))
      await db.prepare(`ALTER TABLE pvp_challenges ADD COLUMN ${col} ${type}`).run()
        .catch(e => { if (!/duplicate column/i.test(String(e && e.message))) throw e; });
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

/* ------------------------------- on air --------------------------------- */

// how long a challenge match counts as on with no word from the referee: its longest, and a little
export const LIVE = { MAX: 50 * 60 * 1000, SOON: 30 * 60 * 1000, AFTER: 6 * 60 * 60 * 1000, ASK: 60, IDLE: 900 };

/* The queue has just made a match between a hidden pilot and somebody
   (objects.js, Matchmaker): if it is the one this pilot's challenge went
   to, that match is the challenge's, on from now. A match made again (the
   last never got going) takes its place. */
export async function challengeBegun(db, pilot, target, match, now = Date.now()) {
  await ensureChallenges(db);
  await db.prepare('UPDATE pvp_challenges SET match = ?3, started = ?4, ended = NULL WHERE pilot = ?1 AND target = ?2')
    .bind(pilot, target, match, now).run();
}
// and the referee has decided it (objects.js, Match): off air
export async function challengeEnded(db, match, now = Date.now()) {
  await ensureChallenges(db);
  await db.prepare('UPDATE pvp_challenges SET ended = ?2 WHERE match = ?1 AND ended IS NULL').bind(match, now).run();
}

/* For the game's public GET /api/live (src/live.js), which never makes
   PvP's tables: what is on now, and how long before it is worth asking
   again.
     { live: { match, since, t, x, names: [the pilot's, the other's] } | null, every }
   `every` (seconds) is short while a challenge is on or due: one has been
   sent and not yet fought out (or was, within the last few hours: a match
   that never got going is made again), and its date, if it has one, is
   near. Otherwise it is long, so a game left open costs a request every
   quarter of an hour, not every minute. Words that cannot be read are no
   words: the match is still on, under a plain title. */
export async function liveNow(db, now = Date.now()) {
  let rows = [];
  try {
    rows = (await db.prepare(
      `SELECT c.pilot, c.match, c.started, c.ended, c.due, c.target, c.announce, a.display AS them
         FROM pvp_challenges c LEFT JOIN accounts a ON a.id = c.target WHERE c.target IS NOT NULL`).all()).results || [];
  } catch (e) {
    return { live: null, every: LIVE.IDLE };              // no table yet (or no columns): nothing has ever been on
  }
  let on = null, every = LIVE.IDLE;
  for (const r of rows) {
    if (r.match && r.started && !r.ended && now - r.started < LIVE.MAX) {
      if (!on || r.started > on.started) on = r;
      continue;
    }
    if (r.ended && now - r.ended > LIVE.AFTER) continue;   // fought out
    if (!r.due) { every = LIVE.ASK; continue; }
    const wait = (r.due - LIVE.SOON - now) / 1000;
    if (now < r.due + LIVE.AFTER) every = Math.min(every, Math.max(LIVE.ASK, Math.ceil(wait)));
  }
  if (!on) return { live: null, every };
  let w = null;
  try {
    const got = on.announce ? await vaultText(db, on.announce) : null;
    w = got ? JSON.parse(got.text) : null;
  } catch (e) {
    console.error('live ' + on.pilot + ': its announcement: ' + (e && e.message));
  }
  w = w && typeof w === 'object' ? w : {};
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return {
    live: { match: on.match, since: on.started, t: str(w.t, WORDS.t), x: str(w.x, WORDS.x),
            names: [str(w.as, 24) || '???', w.named === false ? '' : str(on.them, 24)] },
    every: LIVE.ASK
  };
}
