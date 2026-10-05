/* The SQL behind `npm run vault` (scripts/vault.mjs), kept apart so the test
   (scripts/vault-test.mjs) runs exactly what the tool would send. How an
   entry is kept, and why in parts, is at the top of src/vault.js. */
import { createHash } from 'node:crypto';
import { VAULT_SCHEMA, VAULT_ID, PERK } from '../../src/vault.js';

/* Bytes per part: as base64 that is 90,000 characters, which leaves an
   INSERT comfortably under D1's 100 KB statement limit. */
export const PART_BYTES = 67500;

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function checkId(id) {
  if (!VAULT_ID.test(id || '')) throw new Error(`"${id || ''}" is not an id: 1 to 32 of a-z 0-9 -, starting with a letter or digit`);
  return id;
}

/* Putting one entry in: every part under a new revision, everything older
   than the revision readers have now swept away, and only then the head
   moved to the new one. */
export function putSql(id, bytes, rev = Date.now()) {
  checkId(id);
  const out = [VAULT_SCHEMA];
  let n = 0;
  for (let at = 0; at < bytes.length || n === 0; at += PART_BYTES, n++)
    out.push(`INSERT OR REPLACE INTO vault_parts (id, rev, part, body) VALUES (${q(id)}, ${rev}, ${n}, '${bytes.subarray(at, at + PART_BYTES).toString('base64')}');`);
  out.push(`DELETE FROM vault_parts WHERE id = ${q(id)} AND rev <> ${rev} AND rev <> COALESCE((SELECT rev FROM vault_heads WHERE id = ${q(id)}), -1);`);
  out.push(`INSERT INTO vault_heads (id, rev, parts, size, hash, updated) VALUES (${q(id)}, ${rev}, ${n}, ${bytes.length}, ${q(sha256(bytes))}, ${Date.now()}) ` +
           `ON CONFLICT (id) DO UPDATE SET rev = excluded.rev, parts = excluded.parts, size = excluded.size, hash = excluded.hash, updated = excluded.updated;`);
  return { sql: out.join('\n'), rev, parts: n, hash: sha256(bytes) };
}

export const listSql = () => `${VAULT_SCHEMA}\nSELECT id, rev, parts, size, hash, datetime(updated / 1000, 'unixepoch') AS put FROM vault_heads ORDER BY id;`;
export const headSql = id => `${VAULT_SCHEMA}\nSELECT hash, size, parts FROM vault_heads WHERE id = ${q(checkId(id))};`;
export const dropSql = id => `${VAULT_SCHEMA}\nDELETE FROM vault_heads WHERE id = ${q(checkId(id))};\nDELETE FROM vault_parts WHERE id = ${q(id)};`;

/* The perk on an account: added once however often it is given, and taken
   out without touching the account's other perks. */
const acct = name => q(String(name).toLowerCase());
export const giveSql = (name, id) =>
  `UPDATE accounts SET perks = json_insert(perks, '$[#]', ${q(PERK(checkId(id)))}), updated = ${Date.now()} ` +
  `WHERE name = ${acct(name)} AND NOT EXISTS (SELECT 1 FROM json_each(accounts.perks) WHERE value = ${q(PERK(id))});`;
export const takeSql = (name, id) =>
  `UPDATE accounts SET perks = (SELECT COALESCE(json_group_array(value), '[]') FROM json_each(accounts.perks) WHERE value <> ${q(PERK(checkId(id)))}), ` +
  `updated = ${Date.now()} WHERE name = ${acct(name)};`;
export const whoSql = id =>
  `SELECT a.name FROM accounts a WHERE EXISTS (SELECT 1 FROM json_each(a.perks) WHERE value = ${q(PERK(checkId(id)))}) ORDER BY a.name;`;
export const accountSql = name => `SELECT name, perks FROM accounts WHERE name = ${acct(name)};`;
