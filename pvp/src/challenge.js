/* ===========================================================================
   A hidden pilot's challenge (hidden.js), sent to the top of ranked.

   ARMED BY HAND, never by the game: `npm run challenge -- arm <pilot>
   <words>` (scripts/challenge.mjs) names the hidden pilot that issues it and
   the vault entry its words are kept in. The words are JSON, { "t": "title",
   "x": "text" }, put in the vault and given to nobody, as a sealed chapter's
   pages are (src/tales.js): the repo is public, and the words are not. A
   challenge left unarmed does nothing at all.

   TRIPPED BY THE LADDER: once anybody has held the highest league (VOID) in
   ranked for a day (HOLD), unbroken, while it is armed: a visit to VOID is
   not enough. It goes to the account highest in ranked that season among
   those who have held it that long, and from then on it is theirs:
     - their /api/pvp/me carries it, the words and the date once one is set,
       and nobody else's does; the first time they are shown it is noted. Words
       that name a voice ({ "v", "c" }) are said aloud: /api/pvp/me?voice
       hands its mp3 to them alone
     - the game's GET /api/account says only that there is one, for the
       menu's PVP door (src/account.js)
     - the hidden pilot's ranked ticket waits for them, and not for whoever
       is #1 by then, this season or the next (objects.js)
   The pilot's own holders never trip it and are never sent it: the accounts
   that fly it do not challenge themselves.

   It is checked after a rated match that leaves somebody in VOID (the
   queue's Matchmaker, objects.js), and every hour on PvP's cron (index.js),
   which catches a day running out with no match played, and one armed after
   somebody has already held VOID that long.

   The date is the dev's to set (`npm run challenge -- date`), before or
   after it is sent.

   ON AIR (live spectating): the match the queue makes between the pilot and
   the account it was sent to is noted here, when it starts and when the
   referee decides it (objects.js), and while it is on, the game's public
   GET /api/live says so (src/live.js, liveNow below) with the announcement:
   words of their own in the vault, named by `npm run challenge -- announce
   <pilot> <words>`, JSON { "t": "title", "x": "text", "as": "the pilot's
   name, shown", "named": false to keep the other player's name off it }.

   FROM ABOVE: from the moment a challenge is sent until its fight is fought
   out, the game's runs are hunted (index.html, FROM ABOVE), and /api/live
   says so (`above`). Fought out is a match played to its end, whoever won
   it: the referee's verdict notes when (`decided`) and which way
   (`outcome`: 'lost' or 'won', the challenged account's side of it). A
   match one side walked out of decides nothing by itself, and the queue
   makes it again; the dev may decide it by hand, or take a decision back
   (`npm run challenge -- decide`), and may hold the hunt at any time
   (`npm run challenge -- calm`).

   THE PARTS: a challenge won by the account it was sent to leaves that
   account, and nobody else, something of the pilot's to keep (`npm run
   challenge -- parts <pilot> <words>` names the vault entry of what they are
   called and what they say: { "t", "x", "done": what is said once they are
   used, "{pilot}" in it the pilot they went to }). Their lobby carries them
   (/api/pvp/me, partsFor below) from the moment it is decided, and they are
   used once, for good (POST /api/pvp/parts, parts.js): on one of the
   account's own pilots' hulls. A decision taken back takes them out of
   sight with it, used or not; decided won again, they are back as they
   were. `npm run challenge -- unuse` takes a use back by hand.
   ========================================================================= */
import { seasonOf } from '../../src/season.js';
import { vaultText, vaultBytes, VAULT_ID, PERK } from '../../src/vault.js';
import { LEAGUES } from './rules.js';
import { ensurePvp } from './records.js';

// the league whose holders trip a challenge: the highest, VOID
export const TOP_LEAGUE = LEAGUES[LEAGUES.length - 1].id;
// how long somebody must have held it, unbroken (pvp_ratings.top_since, records.js), before one goes out
export const HOLD = 24 * 60 * 60 * 1000;
const WORDS = { t: 60, x: 4000 };        // what the lobby is handed of them, at most

const SCHEMA = `CREATE TABLE IF NOT EXISTS pvp_challenges (
     pilot       TEXT    PRIMARY KEY,      -- the hidden pilot that issues it: its vault id
     words       TEXT    NOT NULL,         -- the vault entry its words are kept in
     armed       INTEGER NOT NULL,         -- when it was armed (ms)
     due         INTEGER,                  -- the date it names (ms), once set
     tripped     INTEGER,                  -- when somebody had first held VOID a day while it was armed
     reached_by  TEXT,                     -- who that was
     season      TEXT,                     -- the season it tripped in
     target      TEXT,                     -- the account it went to: the highest of those who had held VOID a day
     seen        INTEGER,                  -- when they were first shown it
     match       TEXT,                     -- the match the queue made between the two, the latest
     started     INTEGER,                  -- when it was made
     ended       INTEGER,                  -- when the referee decided it
     announce    TEXT,                     -- the vault entry its announcement is kept in
     decided     INTEGER,                  -- when its fight was fought out (played to its end), or decided by hand
     outcome     TEXT,                     -- which way: 'lost' or 'won', as it went for the account it was sent to
     calm        INTEGER,                  -- when the hunt was held, by hand (FROM ABOVE); NULL while it is not
     film        TEXT,                     -- the vault entry of the movie every game plays if it is lost (THE ENDING)
     film_voice  TEXT,                     -- and of its voice, an mp3
     parts       TEXT,                     -- the vault entry of THE PARTS' words, left the account it was sent to if it is won
     parts_used  INTEGER,                  -- when they were used, once and for good
     parts_use   TEXT,                     -- on what: 'hull'
     parts_on    TEXT                      -- and which of their pilots
   )`;
// columns added after the table first shipped, as records.js does
const ADDED = [['match', 'TEXT'], ['started', 'INTEGER'], ['ended', 'INTEGER'], ['announce', 'TEXT'],
               ['decided', 'INTEGER'], ['outcome', 'TEXT'], ['calm', 'INTEGER'], ['film', 'TEXT'], ['film_voice', 'TEXT'],
               ['parts', 'TEXT'], ['parts_used', 'INTEGER'], ['parts_use', 'TEXT'], ['parts_on', 'TEXT']];
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

/* Every armed challenge not yet sent, sent now if anybody has held VOID in
   ranked this season for a day. The UPDATE only lands on one still unsent, so this
   running in the Matchmaker and on the cron at once sends it once. Returns
   what it sent, [{ pilot, target }], for the cron's log and the tests. */
export async function tripChallenges(db, now = Date.now()) {
  await ensureChallenges(db);
  const armed = ((await db.prepare('SELECT pilot FROM pvp_challenges WHERE tripped IS NULL').all()).results || []);
  if (!armed.length) return [];
  await ensurePvp(db);
  const season = seasonOf(now), sent = [];
  for (const { pilot } of armed) {
    // who has held VOID a day: the first of them tripped it, and the highest of them is sent it
    const held = `FROM pvp_ratings r WHERE r.queue = 'ranked' AND r.season = ?1 AND r.league = ?2
                    AND r.top_since IS NOT NULL AND r.top_since <= ?4 AND ${notHolder(3)}`;
    const first = await db.prepare(`SELECT r.account ${held} ORDER BY r.top_since ASC LIMIT 1`)
      .bind(season, TOP_LEAGUE, PERK(pilot), now - HOLD).first();
    if (!first) continue;
    // in the ladder's own order (seasons.js, placed)
    const top = await db.prepare(`SELECT r.account ${held} ORDER BY r.rating DESC, r.updated ASC LIMIT 1`)
      .bind(season, TOP_LEAGUE, PERK(pilot), now - HOLD).first();
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
  const row = await sentTo(db, acct);
  const w = row && await wordsOf(db, row);
  if (!w) return null;
  if (seen && !row.seen)
    await db.prepare('UPDATE pvp_challenges SET seen = ?2 WHERE pilot = ?1 AND seen IS NULL').bind(row.pilot, Date.now()).run();
  return Object.assign({ t: String(w.t || '').slice(0, WORDS.t), x: w.x.slice(0, WORDS.x), due: row.due || null },
                       voiced(w) ? { v: true, c: cuesOf(w.c) } : {});
}

/* Its voice, when its words name one ({ "v": a vault entry, "c": when each
   paragraph begins, in seconds }), for the account it was sent to and nobody
   else (me.js, ?voice): an mp3's bytes, or null. */
export async function challengeVoice(db, acct) {
  await ensureChallenges(db);
  const row = await sentTo(db, acct);
  const w = row && await wordsOf(db, row);
  return w && voiced(w) ? vaultBytes(db, w.v) : null;
}

const sentTo = (db, acct) => db.prepare('SELECT pilot, words, due, seen FROM pvp_challenges WHERE target = ?1 ORDER BY tripped LIMIT 1')
  .bind(acct).first();
const voiced = w => typeof w.v === 'string' && VAULT_ID.test(w.v);
const cuesOf = c => (Array.isArray(c) ? c.filter(n => Number.isFinite(n) && n >= 0 && n < 600).slice(0, 24) : []);
// its words, read out of the vault, or null while they cannot be
async function wordsOf(db, row) {
  let w = null;
  try {
    const got = await vaultText(db, row.words);
    w = got ? JSON.parse(got.text) : null;
  } catch (e) {
    console.error('challenge ' + row.pilot + ': its words: ' + (e && e.message));
  }
  return w && typeof w.x === 'string' ? w : null;
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
/* And the referee has decided it (objects.js, Match): off air. `winner` is
   the account that won a match played to its end, and null for any other
   verdict (a walk-out, a void, nobody there). A match played out decides
   the challenge, once, whichever way it went (an UPDATE reads the row as it
   was: one already decided keeps its decision). */
export async function challengeEnded(db, match, now = Date.now(), winner = null) {
  await ensureChallenges(db);
  await db.prepare(
    `UPDATE pvp_challenges SET ended = ?2,
            decided = CASE WHEN ?3 IS NULL OR decided IS NOT NULL THEN decided ELSE ?2 END,
            outcome = CASE WHEN ?3 IS NULL OR decided IS NOT NULL THEN outcome WHEN ?3 = target THEN 'won' ELSE 'lost' END
      WHERE match = ?1 AND ended IS NULL`).bind(match, now, winner).run();
}

/* For the game's public GET /api/live (src/live.js), which never makes
   PvP's tables: what is on now, and how long before it is worth asking
   again.
     { live: { match, since, t, x, names: [the pilot's, the other's] } | null, every, above }
   `above` is whether the game's runs are hunted now (FROM ABOVE): a
   challenge has been sent, its fight has not been fought out, and the hunt
   is not held.
   `every` (seconds) is short while a challenge is on or due: one has been
   sent and not yet fought out (or was, within the last few hours: a match
   that never got going is made again), and its date, if it has one, is
   near. Otherwise it is long, so a game left open costs a request every
   quarter of an hour, not every minute. Words that cannot be read are no
   words: the match is still on, under a plain title. */
export async function liveNow(db, now = Date.now()) {
  let rows = [];
  const sent = cols => db.prepare(
    `SELECT c.pilot, c.match, c.started, c.ended, c.due, c.target, c.announce${cols}, a.display AS them
       FROM pvp_challenges c LEFT JOIN accounts a ON a.id = c.target WHERE c.target IS NOT NULL`).all();
  try {
    rows = (await sent(', c.decided, c.calm, c.outcome, c.film')).results || [];
  } catch (e) {
    /* A table from before those two columns (PvP's Worker adds them on its
       first use; the game's never does): nothing in it was ever decided or
       held, so its rows read true without them. */
    try { rows = (await sent('')).results || []; }
    catch (e2) { return { live: null, every: LIVE.IDLE, above: false }; }   // no table yet (or no columns): nothing has ever been on
  }
  const above = rows.some(r => !r.decided && !r.calm);
  /* THE ENDING: a challenge lost, with a movie named for it (filmOf below):
     every game plays it once, told so by `burn`, the moment it was decided.
     Missing until then, so nothing says there is one. */
  const lost = rows.filter(r => r.outcome === 'lost' && r.decided && r.film).sort((a, b) => a.decided - b.decided)[0];
  const burn = lost ? { burn: lost.decided } : {};
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
  if (!on) return Object.assign({ live: null, every, above }, burn);
  let w = null;
  try {
    const got = on.announce ? await vaultText(db, on.announce) : null;
    w = got ? JSON.parse(got.text) : null;
  } catch (e) {
    console.error('live ' + on.pilot + ': its announcement: ' + (e && e.message));
  }
  w = w && typeof w === 'object' ? w : {};
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return Object.assign({
    live: { match: on.match, since: on.started, t: str(w.t, WORDS.t), x: str(w.x, WORDS.x),
            names: [str(w.as, 24) || '???', w.named === false ? '' : str(on.them, 24)] },
    every: LIVE.ASK, above
  }, burn);
}

/* THE ENDING's movie (index.html, ENDING; src/film.js): the vault entries
   `npm run challenge -- film` named for a challenge, once that challenge is
   lost by the account it was sent to, and only from then. */
export async function filmOf(db) {
  await ensureChallenges(db);
  const row = await db.prepare(
    `SELECT film, film_voice, decided FROM pvp_challenges WHERE outcome = 'lost' AND decided IS NOT NULL AND film IS NOT NULL
      ORDER BY decided LIMIT 1`).first();
  return row ? { film: row.film, voice: row.film_voice || null, at: row.decided } : null;
}

/* -------------------------------- the parts ------------------------------ */

// what the parts may be used on: one of the account's own pilots' hulls (more, once there is more)
export const PARTS_USES = ['hull'];
const PARTS_WORDS = { t: 60, x: 4000, done: 600 };
const wonBy = (db, acct) => db.prepare(
  `SELECT pilot, parts, decided, parts_used, parts_use, parts_on FROM pvp_challenges
    WHERE target = ?1 AND outcome = 'won' AND decided IS NOT NULL AND parts IS NOT NULL ORDER BY decided LIMIT 1`).bind(acct).first();

/* THE PARTS left this account (/api/pvp/me): { t, x, done, used } where used
   is null until they are, then { use, on, at }; or null for every account
   but the one that won, and for that one while their words cannot be read. */
export async function partsFor(db, acct) {
  await ensureChallenges(db);
  const row = await wonBy(db, acct);
  if (!row) return null;
  let w = null;
  try {
    const got = await vaultText(db, row.parts);
    w = got ? JSON.parse(got.text) : null;
  } catch (e) {
    console.error('parts ' + row.pilot + ': their words: ' + (e && e.message));
  }
  if (!w || typeof w.x !== 'string') return null;
  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  return { t: str(w.t, PARTS_WORDS.t), x: w.x.slice(0, PARTS_WORDS.x), done: str(w.done, PARTS_WORDS.done),
           used: row.parts_used ? { use: row.parts_use, on: row.parts_on, at: row.parts_used } : null };
}

/* Used, once and for good (parts.js): true if this was the time, false if
   they were used already or this account holds none. The UPDATE lands only
   on parts unused, so two tabs at once use them once. */
export async function useParts(db, acct, use, on, now = Date.now()) {
  await ensureChallenges(db);
  if (!PARTS_USES.includes(use)) return false;
  const r = await db.prepare(
    `UPDATE pvp_challenges SET parts_used = ?2, parts_use = ?3, parts_on = ?4
      WHERE target = ?1 AND outcome = 'won' AND decided IS NOT NULL AND parts IS NOT NULL AND parts_used IS NULL`)
    .bind(acct, now, use, on).run();
  return !!(r && r.meta && r.meta.changes);
}
