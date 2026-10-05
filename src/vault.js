/* ===========================================================================
   VOIDRUNNER — the vault: code that is not in this repo.

   The game, this Worker and the site are all public, so anything that must
   stay out of sight (an outside pilot: a pilot whose code and art live
   nowhere in the repo, see OUTSIDE PILOTS in index.html) is kept here
   instead, in the database, and handed only to the accounts allowed it.

     GET /api/vault?id=<id>[&h=<sha-256>]   -> the module's text   (text/javascript)
         only to a signed-in account holding the perk 'vault:<id>'. Anyone
         else, signed in or not, is told there is no such thing (404), the
         same answer a missing id gets, so the route says nothing about
         what is or is not in it.
   and GET /api/account names what the account may load (vaultList), so a
   page knows to ask without one more request for everybody else.

   An entry is an opaque id. Its name, and everything about it, is in the
   text, which only ever leaves here for an account that holds its perk.

   PUTTING SOMETHING IN: only through the database itself, never through
   this route: `npm run vault -- put <id> <file> --remote` (scripts/vault.mjs)
   runs the SQL through wrangler as the Cloudflare account's owner. The perk
   goes on an account the same way (`npm run vault -- give <account> <id>`).

   HOW IT IS KEPT. D1 refuses any SQL statement over 100 KB and any row over
   2 MB, and a module with its art is bigger than both. So the text is cut
   into parts, each a base64 string (wrangler splits a file of SQL on its
   own, and base64 has no quote, semicolon or dash in it to confuse that),
   written under a new revision; the head row that names the revision is
   written last. Until it is, readers go on getting the previous revision
   whole, so a put that dies halfway changes nothing. Old revisions are
   swept at the end of the next put.
   ========================================================================= */
import { sessionOf } from './auth.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS vault_parts (
     id       TEXT    NOT NULL,
     rev      INTEGER NOT NULL,
     part     INTEGER NOT NULL,
     body     TEXT    NOT NULL,            -- base64 of this part's bytes
     PRIMARY KEY (id, rev, part))`,
  `CREATE TABLE IF NOT EXISTS vault_heads (
     id       TEXT    PRIMARY KEY,
     rev      INTEGER NOT NULL,            -- the revision readers get
     parts    INTEGER NOT NULL,
     size     INTEGER NOT NULL,            -- bytes of the whole text
     hash     TEXT    NOT NULL,            -- sha-256 of the whole text, hex
     updated  INTEGER NOT NULL)`
];
// the same tables, for scripts/vault.mjs to put ahead of its own SQL: one line each, comments out
export const VAULT_SCHEMA = SCHEMA.map(s => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';').join('\n');

export const VAULT_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;
export const PERK = id => 'vault:' + id;

let ready = null;
function ensureVault(db) {
  if (!ready) ready = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { ready = null; throw e; });
  return ready;
}

// the ids an account's perks open
export const vaultIds = perks => (Array.isArray(perks) ? perks : [])
  .filter(p => typeof p === 'string' && p.startsWith('vault:')).map(p => p.slice(6)).filter(id => VAULT_ID.test(id));

/* What a signed-in account may load: [{ id, h, size }], only entries that
   exist, or null when there is nothing (the reply then carries no field). */
export async function vaultList(db, account) {
  const ids = vaultIds(account && account.perks);
  if (!ids.length) return null;
  await ensureVault(db);
  const res = await db.prepare(`SELECT id, hash, size FROM vault_heads WHERE id IN (${ids.map((_, i) => '?' + (i + 1)).join(',')}) ORDER BY id`)
    .bind(...ids).all();
  const out = ((res && res.results) || []).map(r => ({ id: r.id, h: r.hash, size: r.size }));
  return out.length ? out : null;
}

/* One entry's text, put back together. Kept for as long as the isolate
   lives, per revision, so a page load costs two small reads, not the parts. */
const cache = new Map();                 // id -> { rev, text }
async function vaultText(db, id) {
  await ensureVault(db);
  const head = await db.prepare('SELECT rev, parts, size, hash FROM vault_heads WHERE id = ?1').bind(id).first();
  if (!head) return null;
  const hit = cache.get(id);
  if (hit && hit.rev === head.rev) return { text: hit.text, hash: head.hash };
  const res = await db.prepare('SELECT part, body FROM vault_parts WHERE id = ?1 AND rev = ?2 ORDER BY part')
    .bind(id, head.rev).all();
  const rows = (res && res.results) || [];
  // every part there, in order: a head is only ever written after its parts
  if (rows.length !== head.parts || rows.some((r, i) => r.part !== i)) throw new Error('vault ' + id + ': parts missing');
  const bytes = Buffer.concat(rows.map(r => Buffer.from(r.body, 'base64')));
  if (bytes.length !== head.size) throw new Error('vault ' + id + ': wrong size');
  const text = bytes.toString('utf8');
  cache.set(id, { rev: head.rev, text });
  return { text, hash: head.hash };
}

const nothing = () => new Response(JSON.stringify({ error: 'not found' }), {
  status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async (req, env) => {
  if (req.method !== 'GET') return nothing();
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!VAULT_ID.test(id)) return nothing();
  const s = await sessionOf(req, env, { peek: true });
  if (!s || !vaultIds(s.account.perks).includes(id)) return nothing();
  const got = await vaultText(env.DB, id);
  if (!got) return nothing();
  /* Asked for by its hash (the account reply names it), the answer never
     changes, so this browser may keep it: only this browser, never a shared
     cache. Asked for any other way, it is not kept at all. */
  const h = new URL(req.url).searchParams.get('h');
  return new Response(got.text, {
    headers: { 'content-type': 'text/javascript; charset=utf-8', 'x-vault-hash': got.hash,
               'cache-control': h === got.hash ? 'private, max-age=31536000, immutable' : 'no-store' } });
};
