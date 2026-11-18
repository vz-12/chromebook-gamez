/* The SQL behind `npm run felled` (scripts/felled.mjs), kept apart so the
   test (scripts/felled-test.mjs) runs exactly what the tool would send. What
   a felling is, and who writes one, is at the top of src/felled.js. */
import { FELLED_SCHEMA } from '../../src/felled.js';
import { VAULT_ID } from '../../src/vault.js';

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const BOSS = /^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/;

// every felling, unread first, then the latest first
export const listSql = () => `${FELLED_SCHEMA}
SELECT f.mod, f.boss, f.name, f.who, f.times, f.seen, f.info, f.last,
       datetime(f.first / 1000, 'unixepoch') AS firstAt, datetime(f.last / 1000, 'unixepoch') AS lastAt,
       (f.first = (SELECT MIN(g.first) FROM felled g WHERE g.mod = f.mod AND g.boss = f.boss)) AS firstEver
  FROM felled f ORDER BY f.seen, f.last DESC;`;

// everything read, up to a moment (the latest one list showed), as an admin's menu marks it
export const seenSql = upTo => `${FELLED_SCHEMA}\nUPDATE felled SET seen = 1 WHERE seen = 0 AND last <= ${Math.floor(Number(upTo) || 0)};`;

// a tyrant's record wiped (a boss made anew): every account's fellings of it, or of every boss of the entry
export function forgetSql(mod, boss) {
  if (!VAULT_ID.test(mod || '')) throw new Error(`"${mod || ''}" is not a vault id`);
  if (boss !== undefined && !BOSS.test(boss)) throw new Error(`"${boss}" is not a boss's key`);
  return `${FELLED_SCHEMA}\nDELETE FROM felled WHERE mod = ${q(mod)}${boss !== undefined ? ' AND boss = ' + q(boss) : ''};`;
}
