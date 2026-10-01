/* ===========================================================================
   TEMPORARY — hands this site's leaderboard store to the Cloudflare Worker.

   GET /api/export-for-cloudflare   (header x-export-key: <key>)
     -> { docs: [{ key, value }], at }

   The game is moving to a Cloudflare Worker backed by D1. The Worker pulls
   everything in the leaderboard store through here once — the boards, the
   season archive that podium awards are paid from, dev grants, the vigil —
   and writes it into D1. Co-op rooms are not worth moving.

   Every doc carries profile ids, and a profile id is a bearer token for that
   player's awards, so this answers 404 unless the caller holds the key. Only
   the key's SHA-256 is here: the key is 256 random bits, so the digest in a
   public repo gives nothing away, and the key itself lives only in the D1
   row the Worker reads it from. It stops answering at all after EXPIRES,
   whatever is offered. Delete this file with the rest of the Netlify setup.
   ========================================================================= */
import { getStore } from '@netlify/blobs';
import { createHash, timingSafeEqual } from 'node:crypto';

export const config = { path: '/api/export-for-cloudflare' };

const STORE = 'voidrunner-leaderboard';
const EXPIRES = Date.parse('2026-10-15T00:00:00Z');
const SKIP = new Set(['selftest']);              // check.html's scratch key

const KEY_SHA256 = 'b0a2037299b41adde0fbe86b5ba29df737977115208c85c2618f0baacebea753';

// equal-length digests, so the comparison takes the same time for any input
const digest = s => createHash('sha256').update(String(s)).digest();
const keyOk = got => timingSafeEqual(digest(got), Buffer.from(KEY_SHA256, 'hex'));

const nope = () => new Response('Not Found', { status: 404 });

export default async (req) => {
  if (Date.now() > EXPIRES || req.method !== 'GET') return nope();
  if (!keyOk(req.headers.get('x-export-key') || '')) return nope();

  const store = getStore({ name: STORE, consistency: 'strong' });
  const { blobs } = await store.list();
  const docs = [];
  for (const { key } of blobs) {
    if (SKIP.has(key)) continue;
    const value = await store.get(key, { type: 'text', consistency: 'strong' });
    if (value != null) docs.push({ key, value });
  }
  return new Response(JSON.stringify({ docs, at: Date.now() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
};
