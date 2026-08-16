/* ===========================================================================
   VOIDRUNNER — WebRTC signalling rooms
   POST /api/room                  { offer }        -> { code }
   GET  /api/room?code=XXXX&as=..                   -> the other side's blob
   POST /api/room?code=XXXX        { answer } | { ice: [...] }  -> { ok }

   This is a dead-drop, not a database. A room holds an SDP offer, an answer
   and a handful of ICE candidates — a couple of KB, relevant for about ten
   seconds, and worthless afterwards. Once the peers are connected nothing
   here is read again.

   Each side writes ONLY its own key (host / guest). That means the two
   never contend, so unlike the leaderboard there is no compare-and-swap and
   no retry loop: a writer can never clobber the other side's data because it
   cannot address it.
   ========================================================================= */
import { getStore } from '@netlify/blobs';

export const config = { path: '/api/room' };

const STORE = 'voidrunner-rooms';
const TTL_MS = 15 * 60 * 1000;      // a room is stale long before this
const MAX_ICE = 40;                 // plenty for a LAN; a cap all the same
const MAX_SDP = 20000;              // an SDP blob is ~2-4KB
const CODE_LEN = 4;
const TRIES = 8;

/* No 0/O, 1/I/L, 5/S, 8/B: the whole point is that someone reads this aloud
   across a room and the other person types it without asking twice. */
const ALPHABET = '23467913CDEFGHJKMNPQRTUVWXYZ'.replace(/[019]/g, '');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

const newCode = () => {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++)
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
};

// Codes are typed by humans, so accept whatever case they used and reject
// anything that could not have come from newCode().
const cleanCode = v => {
  const s = String(v == null ? '' : v).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== CODE_LEN) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
};

const sdpOk = v => typeof v === 'string' && v.length > 0 && v.length <= MAX_SDP;

const cleanIce = v => {
  if (!Array.isArray(v)) return null;
  const out = [];
  for (const c of v.slice(0, MAX_ICE)) {
    if (typeof c === 'string' && c.length <= 2000) out.push(c);
    else if (c && typeof c === 'object') {
      const s = JSON.stringify(c);
      if (s.length <= 2000) out.push(JSON.parse(s));
    }
  }
  return out;
};

const fresh = d => d && typeof d.at === 'number' && Date.now() - d.at < TTL_MS;
const keyFor = (code, side) => 'room/' + code + '/' + side;

export default async (req) => {
  const store = getStore({ name: STORE, consistency: 'strong' });
  const url = new URL(req.url);
  const code = cleanCode(url.searchParams.get('code'));

  /* ---- read whichever side you are not ---- */
  if (req.method === 'GET') {
    if (!code) return json({ error: 'bad code' }, 400);
    const as = url.searchParams.get('as') === 'guest' ? 'guest' : 'host';
    const want = as === 'host' ? 'guest' : 'host';   // you read the other side
    const [mine, theirs] = await Promise.all([
      store.get(keyFor(code, as), { type: 'json' }).catch(() => null),
      store.get(keyFor(code, want), { type: 'json' }).catch(() => null)
    ]);
    // a host asking about a room that never existed is a typo, not an error
    if (as === 'guest' && !fresh(theirs)) return json({ error: 'no such room' }, 404);
    return json({
      ok: true,
      exists: !!fresh(mine) || !!fresh(theirs),
      peer: fresh(theirs) ? theirs : null
    });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch (e) { return json({ error: 'bad json' }, 400); }

  /* ---- open a room: allocate a code nobody is using ---- */
  if (!code) {
    if (!sdpOk(body.offer)) return json({ error: 'bad offer' }, 400);
    for (let i = 0; i < TRIES; i++) {
      const c = newCode();
      const existing = await store.get(keyFor(c, 'host'), { type: 'json' }).catch(() => null);
      if (fresh(existing)) continue;              // in use; a stale one is fair game
      const wrote = await store
        .setJSON(keyFor(c, 'host'),
                 { offer: body.offer, ice: cleanIce(body.ice) || [], at: Date.now() })
        .catch(() => null);
      if (!wrote) return json({ error: 'store unavailable' }, 503);
      // clear any answer left over from a previous room that used this code
      await store.delete(keyFor(c, 'guest')).catch(() => {});
      return json({ ok: true, code: c });
    }
    return json({ error: 'no free code, try again' }, 503);
  }

  /* ---- update your own side of an existing room ---- */
  const as = body.as === 'guest' ? 'guest' : 'host';
  const key = keyFor(code, as);

  // the guest may only answer a room that a host actually opened
  if (as === 'guest') {
    const host = await store.get(keyFor(code, 'host'), { type: 'json' }).catch(() => null);
    if (!fresh(host)) return json({ error: 'no such room' }, 404);
  }

  const cur = await store.get(key, { type: 'json' }).catch(() => null);
  const next = { at: Date.now(),
                 offer:  (cur && cur.offer)  || null,
                 answer: (cur && cur.answer) || null,
                 ice:    (cur && cur.ice)    || [] };

  if (body.answer !== undefined) {
    if (!sdpOk(body.answer)) return json({ error: 'bad answer' }, 400);
    next.answer = body.answer;
  }
  if (body.offer !== undefined) {
    if (!sdpOk(body.offer)) return json({ error: 'bad offer' }, 400);
    next.offer = body.offer;
  }
  if (body.ice !== undefined) {
    const ice = cleanIce(body.ice);
    if (!ice) return json({ error: 'bad ice' }, 400);
    // candidates trickle in, so append rather than replace
    next.ice = next.ice.concat(ice).slice(-MAX_ICE);
  }

  const wrote = await store.setJSON(key, next).catch(() => null);
  if (!wrote) return json({ error: 'store unavailable' }, 503);
  return json({ ok: true });
};
