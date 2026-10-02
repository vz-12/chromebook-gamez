/* ===========================================================================
   VOIDRUNNER — TURN credentials for co-op
   GET /api/turn   -> { iceServers: [...], ttl }   or 503 when TURN is not set up

   Co-op is relayed through Cloudflare Realtime TURN, so two machines connect
   from any network: a school controller that drops mDNS, two different
   houses, a phone hotspot. The relay needs a TURN key, and the key is a
   long-term secret that must never reach a browser. So the Worker holds it
   and hands each player short-lived credentials made from it, once per
   connection attempt.

   Two Worker secrets (Workers & Pages → chromebook-gamez → Settings →
   Variables and Secrets, both of type Secret so a deploy never clears them):
     TURN_KEY_ID          the TURN key's id      (Realtime → TURN Server)
     TURN_KEY_API_TOKEN   that key's API token
   Without them this answers 503 and the game falls back to a direct
   connection, which is what co-op did before.

   Relayed traffic is billed: $0.05/GB out of Cloudflare after the first
   1,000 GB a month (shared with the SFU). Co-op is a few KB/s per player, so
   the allowance is large; what would spend it is somebody minting credentials
   for their own use. So a caller gets TURN_PER_HOUR sets an hour, counted per
   address in the database the rooms already use.
   ========================================================================= */
import { getStore } from './store.js';

const STORE = 'voidrunner-turn';
const TTL_S = 12 * 60 * 60;          // longer than any run: an expired credential drops the link
const TURN_PER_HOUR = 30;            // a co-op session asks once per host/join attempt
const KEEP_MS = 3 * 60 * 60 * 1000;  // counters older than this are swept
const API = 'https://rtc.live.cloudflare.com/v1/turn/keys/';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

/* Port 53 is on Cloudflare's list of alternates, and browsers refuse it: the
   candidate only times out. Trickle ICE would survive that, but there is no
   reason to hand it over. */
const usable = url => typeof url === 'string' && !/:53(\?|$)/.test(url);

function cleanServers(list) {
  const out = [];
  for (const s of Array.isArray(list) ? list : []) {
    if (!s) continue;
    const urls = (Array.isArray(s.urls) ? s.urls : [s.urls]).filter(usable);
    if (!urls.length) continue;
    const o = { urls };
    if (typeof s.username === 'string') o.username = s.username;
    if (typeof s.credential === 'string') o.credential = s.credential;
    out.push(o);
  }
  return out;
}

export default async (req, env) => {
  if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);
  const id = env.TURN_KEY_ID, token = env.TURN_KEY_API_TOKEN;
  if (!id || !token) return json({ error: 'TURN is not set up' }, 503);

  /* The cap. Read, then write: two requests in the same instant can both get
     through, which costs one set of credentials and nothing else. */
  const store = getStore(env, STORE);
  const ip = req.headers.get('cf-connecting-ip') || 'unknown';
  const hour = Math.floor(Date.now() / 3600000);
  const key = 'ip/' + ip + '/' + hour;
  const seen = await store.get(key, { type: 'json' }).catch(() => null);
  const n = (seen && seen.n) || 0;
  if (n >= TURN_PER_HOUR) return json({ error: 'too many requests, try again later' }, 429);
  await store.setJSON(key, { n: n + 1 }).catch(() => null);
  if (Math.random() < 0.05) await store.prune(KEEP_MS).catch(() => {});

  let res;
  try {
    res = await fetch(API + encodeURIComponent(id) + '/credentials/generate-ice-servers', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_S })
    });
  } catch (e) {
    return json({ error: 'TURN service unreachable' }, 502);
  }
  if (!res.ok) {
    console.error('turn: generate-ice-servers answered', res.status);
    return json({ error: 'TURN service said ' + res.status }, 502);
  }
  let body = null;
  try { body = await res.json(); } catch (e) {}
  const iceServers = cleanServers(body && body.iceServers);
  if (!iceServers.some(s => s.username && s.credential))
    return json({ error: 'TURN service sent no credentials' }, 502);
  return json({ ok: true, iceServers, ttl: TTL_S });
};
