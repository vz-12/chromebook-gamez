/* The SQL behind `npm run challenge` (scripts/challenge.mjs), kept apart so
   the test (scripts/pvp.mjs) runs exactly what the tool would send. What a
   challenge is, and how it is tripped, is at the top of
   pvp/src/challenge.js. */
import { CHALLENGE_SCHEMA } from '../../pvp/src/challenge.js';
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
export const dateSql = (pilot, due) =>
  `${CHALLENGE_SCHEMA}\nUPDATE pvp_challenges SET due = ${due == null ? 'NULL' : Math.round(due)} WHERE pilot = ${q(checkPilot(pilot))};`;
// gone whole, sent or not (a test, or a mistake): its words stay in the vault
export const cancelSql = pilot => `${CHALLENGE_SCHEMA}\nDELETE FROM pvp_challenges WHERE pilot = ${q(checkPilot(pilot))};`;
// which of these ids the vault holds, to arm nothing it does not
export const inVaultSql = ids => `SELECT id FROM vault_heads WHERE id IN (${ids.map(i => q(checkWords(i))).join(', ')});`;
export const challengesSql = () =>
  `${CHALLENGE_SCHEMA}\nSELECT c.pilot, c.words, ${day('c.armed')} AS armed, ${day('c.due')} AS due, ${day('c.tripped')} AS tripped, ` +
  `COALESCE(r.name, '-') AS reached_by, COALESCE(c.season, '-') AS season, COALESCE(t.name, '-') AS target, ${day('c.seen')} AS seen ` +
  `FROM pvp_challenges c LEFT JOIN accounts r ON r.id = c.reached_by LEFT JOIN accounts t ON t.id = c.target ORDER BY c.armed;`;
