/* The SQL behind `npm run challenge` (scripts/challenge.mjs), kept apart so
   the test (scripts/pvp.mjs) runs exactly what the tool would send. What a
   challenge is, and how it is tripped, is at the top of
   pvp/src/challenge.js. */
import { CHALLENGE_SCHEMA, CHALLENGE_ADDED } from '../../pvp/src/challenge.js';
import { VAULT_ID } from '../../src/vault.js';
import { PILOTS } from '../../pvp/src/rules.js';

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const day = col => `CASE WHEN ${col} IS NULL THEN '-' ELSE datetime(${col} / 1000, 'unixepoch') END`;

// a hidden pilot's vault id: never one of the game's own pilots (pvp/src/hidden.js, isHidden)
export function checkPilot(id) {
  if (!VAULT_ID.test(id || '') || Object.prototype.hasOwnProperty.call(PILOTS, id))
    throw new Error(`"${id || ''}" is not a hidden pilot's vault id`);
  return id;
}
export function checkWords(id) {
  if (!VAULT_ID.test(id || '')) throw new Error(`"${id || ''}" is not a vault id`);
  return id;
}
/* A date, as ISO with its zone ('2026-11-14T18:00Z', '2026-11-14T13:00-05:00'),
   so nobody's own clock decides when it is; or 'none'. Returns ms, or null. */
export function checkDate(s) {
  if (s === 'none') return null;
  const t = Date.parse(s || '');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?(\.\d+)?([zZ]|[+-]\d\d:?\d\d)$/.test(s || '') || !Number.isFinite(t))
    throw new Error(`"${s || ''}" is not a date: ISO with its zone, like 2026-11-14T18:00Z, or none`);
  return t;
}

// armed now; armed again, only its words change: a challenge already sent stays sent, to whom it was
export const armSql = (pilot, words, at = Date.now()) =>
  `${CHALLENGE_SCHEMA}\nINSERT INTO pvp_challenges (pilot, words, armed) VALUES (${q(checkPilot(pilot))}, ${q(checkWords(words))}, ${at}) ` +
  `ON CONFLICT (pilot) DO UPDATE SET words = excluded.words;`;
/* a reel (pvp/src/watch.js): a recording in the vault shown at the premiere in place of its match's own, and its
   length (seconds), which is what the showing runs for: what it decided is told at its end (revealAt reads
   ended - started, so ended is moved to match), or none */
export function reelSql(pilot, reel, secs) {
  if (reel == null) return `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET reel = NULL WHERE pilot = ${q(checkPilot(pilot))};`;
  if (!(Number.isFinite(secs) && secs > 0 && secs < 3 * 3600)) throw new Error(`"${secs}" is not a reel's length in seconds`);
  return `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET reel = ${q(checkWords(reel))}, ended = started + ${Math.round(secs * 1000)} WHERE pilot = ${q(checkPilot(pilot))} AND started IS NOT NULL;`;
}
// held for a showing (pvp/src/challenge.js, premiere): its fight kept off air and untold until then, then shown from its recording
export const premiereSql = (pilot, at) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET premiere = ${at == null ? 'NULL' : Math.round(at)} WHERE pilot = ${q(checkPilot(pilot))};`;
export const dateSql = (pilot, due) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET due = ${due == null ? 'NULL' : Math.round(due)} WHERE pilot = ${q(checkPilot(pilot))};`;
/* Its announcement, for when its match is on air (the game's /api/live): a
   vault entry of its own, JSON { t, x, as, named }, or 'none'. */
export const announceSql = (pilot, words) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET announce = ${words == null ? 'NULL' : q(checkWords(words))} WHERE pilot = ${q(checkPilot(pilot))};`;
// THE ENDING's movie, if it is lost (or, won true, if it is won): its module's vault entry and its voice's (or none: no movie)
export const filmSql = (pilot, film, voice, won = false) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET ${won ? 'won_film' : 'film'} = ${film == null ? 'NULL' : q(checkWords(film))}, ` +
  `${won ? 'won_voice' : 'film_voice'} = ${film == null || voice == null ? 'NULL' : q(checkWords(voice))} WHERE pilot = ${q(checkPilot(pilot))};`;
/* THE PARTS, if it is won: the vault entry of their words, JSON { t, x,
   done }, or none (nothing left the winner); and a use taken back by hand,
   so the winner chooses again. */
export const partsSql = (pilot, words) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET parts = ${words == null ? 'NULL' : q(checkWords(words))} WHERE pilot = ${q(checkPilot(pilot))};`;
// THE PARTS' place: the vault entry of the module the game plays for the winner (src/parts.js), or none
export const sceneSql = (pilot, scene) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET parts_scene =${scene == null ? 'NULL' : q(checkWords(scene))} WHERE pilot = ${q(checkPilot(pilot))};`;
export const unuseSql = pilot =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET parts_used = NULL, parts_use = NULL, parts_on = NULL WHERE pilot = ${q(checkPilot(pilot))};`;
/* Its fight, decided by hand (FROM ABOVE: the hunt ends with it): 'lost' or
   'won', as it went for the account it was sent to, where the referee's
   verdict did not say (a walk-out decides nothing by itself); or 'none',
   to take a decision back, the referee's own included. */
export function checkOutcome(s) {
  if (s !== 'lost' && s !== 'won' && s !== 'none') throw new Error(`"${s || ''}" is not an outcome: lost, won or none`);
  return s;
}
export const decideSql = (pilot, outcome, at = Date.now()) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET ` +
  (checkOutcome(outcome) === 'none' ? 'decided = NULL, outcome = NULL' : `decided = ${Math.round(at)}, outcome = ${q(outcome)}`) +
  ` WHERE pilot = ${q(checkPilot(pilot))};`;
// the hunt held, by hand, or let go again (FROM ABOVE): the challenge itself is untouched
export const calmSql = (pilot, on, at = Date.now()) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET calm = ${on ? Math.round(at) : 'NULL'} WHERE pilot = ${q(checkPilot(pilot))};`;
/* THE DOOR, if it is lost: the address every game sends its players to
   (an origin, https; or a local wrangler dev's, for trying it), or none;
   and the world mended by hand, or not (none). */
export function checkDoor(s) {
  if (s === 'none') return null;
  let u = null;
  try { u = new URL(s); } catch (e) {}
  const local = u && u.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  if (!u || u.origin !== s || (u.protocol !== 'https:' && !local)) throw new Error(`"${s || ''}" is not an address: https://name.example, nothing after it, or none`);
  return s;
}
export const doorSql = (pilot, door) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET door = ${door == null ? 'NULL' : q(checkDoor(door))} WHERE pilot = ${q(checkPilot(pilot))};`;
export const mendSql = (pilot, on, at = Date.now()) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET mended = ${on ? Math.round(at) : 'NULL'} WHERE pilot = ${q(checkPilot(pilot))};`;
/* The columns the table has, and the ones a table made before them still
   needs (PvP's Worker adds them on its own first use; the tool may get
   there first). */
export const columnsSql = () => `${CHALLENGE_SCHEMA}\nPRAGMA table_info(pvp_challenges);`;
export const addedSql = have => CHALLENGE_ADDED.filter(([c]) => !have.includes(c))
  .map(([c, type]) => `ALTER TABLE pvp_challenges ADD COLUMN ${c} ${type};`).join('\n');
// gone whole, sent or not (a test, or a mistake): its words stay in the vault
export const cancelSql = pilot => `${CHALLENGE_SCHEMA}\nDELETE FROM pvp_challenges WHERE pilot = ${q(checkPilot(pilot))};`;
// which of these ids the vault holds, to arm nothing it does not
export const inVaultSql = ids => `SELECT id FROM vault_heads WHERE id IN (${ids.map(i => q(checkWords(i))).join(', ')});`;
export const challengesSql = () =>
  `${CHALLENGE_SCHEMA}\nSELECT c.pilot, c.words, ${day('c.armed')} AS armed, ${day('c.due')} AS due, ${day('c.tripped')} AS tripped, ` +
  `COALESCE(r.name, '-') AS reached_by, COALESCE(c.season, '-') AS season, COALESCE(t.name, '-') AS target, ${day('c.seen')} AS seen, ` +
  `COALESCE(c.announce, '-') AS announce, COALESCE(c.match, '-') AS match, ${day('c.started')} AS started, ${day('c.ended')} AS ended, ` +
  `${day('c.decided')} AS decided, COALESCE(c.outcome, '-') AS outcome, ${day('c.calm')} AS calm, ` +
  `COALESCE(c.film, '-') AS film, COALESCE(c.film_voice, '-') AS film_voice, ` +
  `COALESCE(c.won_film, '-') AS won_film, COALESCE(c.won_voice, '-') AS won_voice, ` +
  `COALESCE(c.parts, '-') AS parts, ${day('c.parts_used')} AS parts_used, COALESCE(c.parts_use, '-') AS parts_use, COALESCE(c.parts_on, '-') AS parts_on, COALESCE(c.parts_scene, '-') AS parts_scene, ` +
  `COALESCE(c.door, '-') AS door, ${day('c.mended')} AS mended ` +
  `FROM pvp_challenges c LEFT JOIN accounts r ON r.id = c.reached_by LEFT JOIN accounts t ON t.id = c.target ORDER BY c.armed;`;
