/* ===========================================================================
   GET /api/film — THE ENDING's movie (index.html, ENDING)

   Once a challenge has been lost by the account it was sent to, and only
   from then (../pvp/src/challenge.js, filmOf): its module, a vault entry's
   text, which every game runs and plays once; with ?voice, its voice, an
   mp3. Before then, and for anything else, the vault's own 404: nothing
   says there will be one. The entries are named by hand, with
   `npm run challenge -- film <pilot> <module> [voice]`.
   ========================================================================= */
import { filmOf } from '../pvp/src/challenge.js';
import { vaultText, vaultBytes, nothing } from './vault.js';

export default async function film(req, env) {
  if (req.method !== 'GET' || !env.DB) return nothing();
  const f = await filmOf(env.DB).catch(e => { console.error('film', e && e.message); return null; });
  if (!f) return nothing();
  if (new URL(req.url).searchParams.has('voice')) {
    const v = f.voice ? await vaultBytes(env.DB, f.voice) : null;
    return v ? new Response(v.bytes, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=3600' } })
             : nothing();
  }
  const t = await vaultText(env.DB, f.film);
  return t ? new Response(t.text, { headers: { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'public, max-age=600' } })
           : nothing();
}
