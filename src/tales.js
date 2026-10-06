/* ===========================================================================
   VOIDRUNNER — the sealed chapters of FORGOTTEN TALES.

   The codex's pages are the game's own (index.html, FORGOTTEN TALES), all but
   one kind: a sealed page, which belongs to a chapter of the story that is
   not open yet. Its text must not be readable before then, and the game, this
   Worker and the site are all public, so it is kept in the vault (vault.js),
   where nothing in the repo can show it, and only this route hands it out,
   to everyone, once its chapter has opened.

     GET /api/tales  -> { chapters: { <id>: { at, pages: { <entry>: { t, x } } } } }
         only the chapters that are open (at: when they opened, ms); an
         entry is the codex's key for it ('n:founder'), t a page title and
         x its text. Nothing about a chapter still sealed, not even that it
         exists.

   A CHAPTER is a row in tale_chapters: its id (what the game's TALE_SEALED
   names), the vault entry its pages are kept in, and when it opened (null
   while sealed). The vault entry's text is JSON, { "pages": { ... } }, in
   the shape above; it is put like any other entry (`npm run vault -- put`),
   and given to nobody, so /api/vault never hands it out either.

   OPENING ONE: openChapter(db, id) is what the story's event will call (the
   chapter opens when it happens in the real world, for everyone at once).
   Until that exists, and to test, `npm run chapter -- open <id> <vault-id>`
   (scripts/chapter.mjs) does the same by hand.
   ========================================================================= */
import { vaultText, VAULT_ID } from './vault.js';

const SCHEMA = `CREATE TABLE IF NOT EXISTS tale_chapters (
     id      TEXT    PRIMARY KEY,          -- the chapter, as the game's TALE_SEALED names it
     vault   TEXT    NOT NULL,             -- the vault entry its pages are kept in
     opened  INTEGER                       -- when it opened for everyone (ms); null while sealed
   )`;
// for scripts/lib/tales-sql.mjs to put ahead of its own SQL: one line, comments out
export const TALES_SCHEMA = SCHEMA.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';';
export const CHAPTER_ID = VAULT_ID;

let ready = null;
export function ensureTales(db) {
  if (!ready) ready = db.prepare(SCHEMA).run().catch(e => { ready = null; throw e; });
  return ready;
}

// a chapter, open for everyone from now; its pages come from `vault` (or the row it already has)
export async function openChapter(db, id, vault, at = Date.now()) {
  if (!CHAPTER_ID.test(id || '')) throw new Error('bad chapter id');
  if (vault != null && !VAULT_ID.test(vault)) throw new Error('bad vault id');
  await ensureTales(db);
  const row = await db.prepare('SELECT vault, opened FROM tale_chapters WHERE id = ?1').bind(id).first();
  const v = vault || (row && row.vault);
  if (!v) throw new Error('chapter ' + id + ': no vault entry named');
  await db.prepare(`INSERT INTO tale_chapters (id, vault, opened) VALUES (?1, ?2, ?3)
                    ON CONFLICT(id) DO UPDATE SET vault = ?2, opened = COALESCE(tale_chapters.opened, ?3)`)
    .bind(id, v, at).run();
}

// a chapter's pages, read out of its vault entry: kept per revision, like the vault's own cache
const cache = new Map();                 // vault id -> { hash, pages }
const PAGE_KEY = /^[a-z]:[a-z0-9_-]{1,32}$/;
async function chapterPages(db, vault) {
  const got = await vaultText(db, vault);
  if (!got) return null;
  const hit = cache.get(vault);
  if (hit && hit.hash === got.hash) return hit.pages;
  const d = JSON.parse(got.text);
  const pages = {};
  for (const [k, v] of Object.entries((d && d.pages) || {})) {
    if (!PAGE_KEY.test(k) || !v || typeof v.x !== 'string') continue;
    pages[k] = { t: String(v.t || '').slice(0, 60), x: v.x.slice(0, 8000) };
  }
  cache.set(vault, { hash: got.hash, pages });
  return pages;
}

export async function openChapters(db) {
  await ensureTales(db);
  const res = await db.prepare('SELECT id, vault, opened FROM tale_chapters WHERE opened IS NOT NULL ORDER BY opened').all();
  const out = {};
  for (const r of (res && res.results) || []) {
    try {
      const pages = await chapterPages(db, r.vault);
      if (pages) out[r.id] = { at: r.opened, pages };
    } catch (e) {
      // a chapter that cannot be read is left out, never half sent
      console.error('tales: chapter ' + r.id + ': ' + (e && e.message));
    }
  }
  return out;
}

export default async (req, env) => {
  if (req.method !== 'GET')
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { 'content-type': 'application/json' } });
  const chapters = await openChapters(env.DB);
  return new Response(JSON.stringify({ chapters }), {
    headers: { 'content-type': 'application/json',
               // a chapter opens for everyone at once; a minute late is no harm, and spares the database
               'cache-control': 'public, max-age=60' } });
};
