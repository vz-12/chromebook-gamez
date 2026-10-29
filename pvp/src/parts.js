/* ===========================================================================
   POST /api/pvp/parts — THE PARTS used, once and for good (challenge.js)

     { use: 'hull', on: <pilot> }  -> { parts }   as /api/pvp/me carries them

   Only by the account a hidden pilot's challenge was sent to, once it is
   won, and only on one of that account's own pilots: the game's own (never
   a hidden one), the base pilots and whatever its save has unlocked. Used
   already, or none held: refused, and nothing changes.
   ========================================================================= */
import { sessionOf, originOk } from '../../src/auth.js';
import { CASUAL, loadout } from './rules.js';
import { limited, tooMany } from './limits.js';
import { partsFor, useParts, PARTS_USES } from './challenge.js';

const MAX_BODY = 1024;
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function parts(req, env) {
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
  if (!originOk(req)) return reply({ error: 'bad origin' }, 403);
  if (!/^application\/json/.test(req.headers.get('content-type') || '')) return reply({ error: 'json only' }, 415);
  const text = await req.text();
  if (text.length > MAX_BODY) return reply({ error: 'too big' }, 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return reply({ error: 'bad json' }, 400); }
  if (!b || typeof b !== 'object') return reply({ error: 'bad json' }, 400);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return reply({ error: 'signed out' }, 401);
  const wait = limited('parts', s.account.id);
  if (wait) return tooMany(wait);
  if (!PARTS_USES.includes(b.use)) return reply({ error: 'unknown use' }, 400);
  const held = await partsFor(env.DB, s.account.id);
  if (!held) return reply({ error: 'no parts' }, 404);
  if (held.used) return reply({ error: 'used already', parts: held }, 409);
  // one of its own pilots, as casual counts them: the base pilots and what its save has unlocked
  const row = await env.DB.prepare('SELECT unlocks FROM saves WHERE account = ?1').bind(s.account.id).first();
  let unlocks = null;
  try { unlocks = row ? JSON.parse(row.unlocks) : null; } catch (e) {}
  if (typeof b.on !== 'string' || !loadout(CASUAL, unlocks).pilots.includes(b.on)) return reply({ error: 'not your pilot' }, 400);
  if (!(await useParts(env.DB, s.account.id, b.use, b.on))) return reply({ error: 'used already', parts: await partsFor(env.DB, s.account.id) }, 409);
  return reply({ parts: await partsFor(env.DB, s.account.id) });
}
