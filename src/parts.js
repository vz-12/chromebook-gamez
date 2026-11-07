/* ===========================================================================
   GET /api/parts, POST /api/parts — THE PARTS' place (index.html, THE PARTS)

   A challenge won by the account it was sent to leaves that account its
   parts (../pvp/src/challenge.js), and a place they go: a module kept in the
   vault, named by hand (`npm run challenge -- scene <pilot> <module>`),
   which the game plays for that account and nobody else until they are used
   there.

     GET            the place's module, a vault entry's text, for the account
                    signed in, while one waits for it (sceneFor). Never kept
                    by any cache: it is one account's, and it stops being
                    handed out the moment they are used.
     POST { use }   they are used there, on `use` (a word: PARTS_USE), once
                    and for good -> { used: { use, at } }. Signed in, from
                    one of our own pages (auth.js, originOk), as JSON.
   Anybody else, signed out, or once they are used: the vault's own 404, so
   nothing says there is a place at all.
   ========================================================================= */
import { sceneFor, useParts, PARTS_USE } from '../pvp/src/challenge.js';
import { vaultText, nothing } from './vault.js';
import { sessionOf, originOk } from './auth.js';

const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function parts(req, env) {
  if (!env.DB || (req.method !== 'GET' && req.method !== 'POST')) return nothing();
  if (req.method === 'POST' && !originOk(req)) return nothing();
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return nothing();
  if (req.method === 'GET') {
    const at = await sceneFor(env.DB, s.account.id);
    const t = at ? await vaultText(env.DB, at.scene) : null;
    return t ? new Response(t.text, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' } })
             : nothing();
  }
  // a JSON body, and a small one: a cross-site form can declare neither
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return nothing();
  let b = null;
  try { const text = await req.text(); b = text.length <= 512 ? JSON.parse(text) : null; } catch (e) { b = null; }
  const use = b && typeof b === 'object' && typeof b.use === 'string' ? b.use : '';
  if (!PARTS_USE.test(use)) return reply({ error: 'bad request' }, 400);
  const now = Date.now();
  if (!(await useParts(env.DB, s.account.id, use, now))) return nothing();
  return reply({ used: { use, at: now } });
}
