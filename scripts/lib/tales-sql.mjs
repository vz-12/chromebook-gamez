/* The SQL behind `npm run chapter` (scripts/chapter.mjs), kept apart so the
   test (scripts/tales.mjs) runs exactly what the tool would send. What a
   chapter is, and why its pages are in the vault, is at the top of
   src/tales.js. */
import { TALES_SCHEMA, CHAPTER_ID } from '../../src/tales.js';
import { VAULT_ID } from '../../src/vault.js';

const q = s => "'" + String(s).replace(/'/g, "''") + "'";
export function checkChapter(id) {
  if (!CHAPTER_ID.test(id || '')) throw new Error(`"${id || ''}" is not a chapter id: 1 to 32 of a-z 0-9 -`);
  return id;
}

// open for everyone, from now: the first opening stands if it is opened twice
export const openSql = (id, vault, at = Date.now()) => {
  checkChapter(id);
  if (!VAULT_ID.test(vault || '')) throw new Error(`"${vault || ''}" is not a vault id`);
  return `${TALES_SCHEMA}\nINSERT INTO tale_chapters (id, vault, opened) VALUES (${q(id)}, ${q(vault)}, ${at}) ` +
         `ON CONFLICT (id) DO UPDATE SET vault = excluded.vault, opened = COALESCE(tale_chapters.opened, excluded.opened);`;
};
// sealed again (a test, or a mistake): the row and its vault entry stay
export const sealSql = id => `${TALES_SCHEMA}\nUPDATE tale_chapters SET opened = NULL WHERE id = ${q(checkChapter(id))};`;
export const chaptersSql = () =>
  `${TALES_SCHEMA}\nSELECT id, vault, CASE WHEN opened IS NULL THEN 'sealed' ELSE datetime(opened / 1000, 'unixepoch') END AS opened FROM tale_chapters ORDER BY id;`;
