/* ===========================================================================
   GET /api/turn -> the relay's credentials, from the game's Worker.

   A match connects the way co-op does: over Cloudflare's TURN relay, which
   works on any network. The TURN key is a secret of the game's Worker
   (src/turn.js), so PvP asks it, through a service binding (GAME, in
   pvp/wrangler.jsonc), rather than holding a second copy. The player's
   address goes along, so the game's per-address cap counts them as itself.
   Without the binding (a local `wrangler dev` on its own) the answer is 503,
   and the engine connects directly, as co-op does with no relay.
   ========================================================================= */
const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

export default async function turn(req, env) {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);
  if (!env.GAME) return json({ error: 'no relay here' }, 503);
  const headers = new Headers();
  const ip = req.headers.get('cf-connecting-ip');
  if (ip) headers.set('cf-connecting-ip', ip);
  try {
    return await env.GAME.fetch(new Request('https://voidrunner.online/api/turn', { headers }));
  } catch (e) {
    return json({ error: 'relay unreachable' }, 502);
  }
}
